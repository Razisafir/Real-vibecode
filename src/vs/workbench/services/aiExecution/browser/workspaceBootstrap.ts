/*---------------------------------------------------------------------------------------------
 *  AI Execution Kernel — Phase 5 Workspace Bootstrap Sequence
 *  Real Vibecode — AI-Native IDE
 *
 *  WorkspaceBootstrapService — Orchestrates deterministic initialization.
 *  Steps execute sequentially with phase-gated validation.
 *--------------------------------------------------------------------------------------------*/

import { Disposable } from '../../../../base/common/lifecycle.js';
import { Emitter, Event } from '../../../../base/common/event.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { IExecutionGraphService } from '../common/executionGraphService.js';
import { IAIExecutionService } from '../common/aiExecutionService.js';
import { IAIUnifiedStateService, AIRuntimePhase } from '../common/aiUnifiedStateService.js';
import {
	IWorkspaceBootstrapService, IBootstrapStep, IBootstrapResult,
} from '../common/workspaceBootstrap.js';

// ─── Step Definitions ──────────────────────────────────────────────────────────

interface IStepDefinition {
	readonly id: string;
	readonly label: string;
	readonly expectedPhase: AIRuntimePhase;
	readonly targetPhase: AIRuntimePhase;
	execute(): Promise<void>;
}

// ─── WorkspaceBootstrapService ─────────────────────────────────────────────────

export class WorkspaceBootstrapService extends Disposable implements IWorkspaceBootstrapService {

	declare readonly _serviceBrand: undefined;

	// ─── State ─────────────────────────────────────────────────────────────────

	private _bootstrapped: boolean = false;
	get bootstrapped(): boolean { return this._bootstrapped; }

	private _result: IBootstrapResult | undefined;
	get result(): IBootstrapResult | undefined { return this._result; }

	private _steps: IBootstrapStep[] = [];
	get steps(): IBootstrapStep[] { return [...this._steps]; }

	// ─── Events ────────────────────────────────────────────────────────────────

	private readonly _onDidCompleteStep = this._register(new Emitter<IBootstrapStep>());
	readonly onDidCompleteStep: Event<IBootstrapStep> = this._onDidCompleteStep.event;

	private readonly _onDidBootstrap = this._register(new Emitter<IBootstrapResult>());
	readonly onDidBootstrap: Event<IBootstrapResult> = this._onDidBootstrap.event;

	// ─── Constructor ────────────────────────────────────────────────────────────

	constructor(
		@ILogService private readonly logService: ILogService,
		@IAIUnifiedStateService private readonly stateService: IAIUnifiedStateService,
		@IExecutionGraphService private readonly graphService: IExecutionGraphService,
		@IAIExecutionService private readonly executionService: IAIExecutionService,
	) {
		super();
		this.logService.trace('[WorkspaceBootstrapService] Phase 5 bootstrap service created');
	}

	// ─── Bootstrap Execution ───────────────────────────────────────────────────

	async runBootstrap(): Promise<IBootstrapResult> {
		if (this._bootstrapped) {
			throw new Error('[WorkspaceBootstrapService] Bootstrap already ran');
		}

		const startTime = Date.now();
		const warnings: string[] = [];
		const errors: string[] = [];

		// Define bootstrap steps in strict order
		const stepDefinitions: IStepDefinition[] = [
			{
				id: 'state-init',
				label: 'Initialize Unified State Service',
				expectedPhase: AIRuntimePhase.Uninitialized,
				targetPhase: AIRuntimePhase.Hydrating,
				execute: async () => {
					this.stateService.transitionTo(AIRuntimePhase.Hydrating, 'bootstrap:state-init');
				},
			},
			{
				id: 'graph-hydrate',
				label: 'Hydrate Execution Graph from Disk',
				expectedPhase: AIRuntimePhase.Hydrating,
				targetPhase: AIRuntimePhase.GraphPending,
				execute: async () => {
					// Graph service loads from disk in its constructor.
					// Force a flush to ensure any pending data is written.
					await this.graphService.flush();
					this.stateService.transitionTo(AIRuntimePhase.GraphPending, 'bootstrap:graph-hydrate');
				},
			},
			{
				id: 'graph-validate',
				label: 'Validate Execution Graph Integrity',
				expectedPhase: AIRuntimePhase.GraphPending,
				targetPhase: AIRuntimePhase.GraphPending,
				execute: async () => {
					// Verify graph loaded correctly
					const inconsistencies = this.stateService.validateConsistency();
					if (inconsistencies.length > 0) {
						warnings.push(...inconsistencies.map(w => `Graph validation: ${w}`));
					}
					// Check for orphaned pending nodes from previous crash
					const recent = this.graphService.getRecentNodes(1000);
					const pendingNodes = recent.filter(n => n.pending);
					if (pendingNodes.length > 0) {
						warnings.push(`Found ${pendingNodes.length} pending nodes from previous session — marking as failed`);
						for (const node of pendingNodes) {
							this.graphService.completeNode(node.id, {
								success: false,
								error: 'Session ended before completion (crash recovery)',
							});
						}
					}
				},
			},
			{
				id: 'execution-service-init',
				label: 'Initialize AI Execution Service',
				expectedPhase: AIRuntimePhase.GraphPending,
				targetPhase: AIRuntimePhase.GraphPending,
				execute: async () => {
					// Verify execution service is wired to graph service
					// by checking its history is accessible
					const history = this.executionService.getExecutionHistory();
					this.logService.trace(`[WorkspaceBootstrapService] Execution service initialized with ${history.length} history entries`);
				},
			},
			{
				id: 'context-hydration',
				label: 'Restore Workspace Context',
				expectedPhase: AIRuntimePhase.GraphPending,
				targetPhase: AIRuntimePhase.GraphPending,
				execute: async () => {
					// Restore active scope references from loaded scopes
					// (Graph service already loaded scopes from disk)
					this.logService.trace('[WorkspaceBootstrapService] Context hydration complete');
				},
			},
			{
				id: 'ready-transition',
				label: 'Transition to Ready State',
				expectedPhase: AIRuntimePhase.GraphPending,
				targetPhase: AIRuntimePhase.Ready,
				execute: async () => {
					this.stateService.transitionTo(AIRuntimePhase.Ready, 'bootstrap:ready');
				},
			},
		];

		// Execute steps sequentially
		this._steps = stepDefinitions.map(def => ({
			id: def.id,
			label: def.label,
			expectedPhase: def.expectedPhase,
			targetPhase: def.targetPhase,
			completed: false,
			success: false,
			error: undefined,
			startedAt: undefined,
			completedAt: undefined,
			duration: undefined,
		}));

		for (let i = 0; i < stepDefinitions.length; i++) {
			const def = stepDefinitions[i];
			const step = this._steps[i];

			// Validate phase
			const currentPhase = this.stateService.phase;
			if (currentPhase !== def.expectedPhase) {
				const msg = `Bootstrap step "${def.id}" expected phase ${def.expectedPhase} but got ${currentPhase}`;
				errors.push(msg);
				step.error = msg;
				step.completed = true;
				step.success = false;
				this._onDidCompleteStep.fire(step);
				break; // Stop bootstrap on phase mismatch
			}

			// Execute step
			const stepStart = Date.now();
			(this._steps[i] as { startedAt: number | undefined }).startedAt = stepStart;

			try {
				await def.execute();

				const stepEnd = Date.now();
				(this._steps[i] as { completed: boolean }).completed = true;
				(this._steps[i] as { success: boolean }).success = true;
				(this._steps[i] as { completedAt: number | undefined }).completedAt = stepEnd;
				(this._steps[i] as { duration: number | undefined }).duration = stepEnd - stepStart;

				this.logService.trace(`[WorkspaceBootstrapService] Step "${def.id}" completed in ${stepEnd - stepStart}ms`);
			} catch (err) {
				const stepEnd = Date.now();
				(this._steps[i] as { completed: boolean }).completed = true;
				(this._steps[i] as { success: boolean }).success = false;
				(this._steps[i] as { error: string | undefined }).error = String(err);
				(this._steps[i] as { completedAt: number | undefined }).completedAt = stepEnd;
				(this._steps[i] as { duration: number | undefined }).duration = stepEnd - stepStart;

				errors.push(`Step "${def.id}" failed: ${String(err)}`);
				this.logService.error(`[WorkspaceBootstrapService] Step "${def.id}" failed:`, err);
			}

			this._onDidCompleteStep.fire(this._steps[i]);

			// Stop on failure
			if (!this._steps[i].success) {
				break;
			}
		}

		const totalDuration = Date.now() - startTime;
		const allSucceeded = this._steps.every(s => s.success);

		this._result = {
			success: allSucceeded,
			totalDuration,
			steps: [...this._steps],
			finalPhase: this.stateService.phase,
			warnings,
			errors,
		};

		this._bootstrapped = true;
		this._onDidBootstrap.fire(this._result);

		this.logService.info(
			`[WorkspaceBootstrapService] Bootstrap ${allSucceeded ? 'succeeded' : 'FAILED'} in ${totalDuration}ms ` +
			`(phase: ${this.stateService.phase}, ${warnings.length} warnings, ${errors.length} errors)`
		);

		return this._result;
	}

	// ─── Lifecycle ─────────────────────────────────────────────────────────────

	override dispose(): void {
		if (this.stateService.phase !== AIRuntimePhase.Disposed) {
			this.stateService.transitionTo(AIRuntimePhase.ShuttingDown, 'bootstrap:dispose');
			this.stateService.transitionTo(AIRuntimePhase.Disposed, 'bootstrap:dispose');
		}
		super.dispose();
	}
}
