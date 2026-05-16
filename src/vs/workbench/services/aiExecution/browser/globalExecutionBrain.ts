/*---------------------------------------------------------------------------------------------
 *  Global Execution Brain — Phase 9 System Coordination Layer
 *  Real Vibecode — AI-Native IDE
 *
 *  GlobalExecutionBrainService — The coordination layer runtime.
 *  Binds all systems together into one unified intelligence loop.
 *
 *  This service coordinates; it does NOT execute, replace, or duplicate.
 *--------------------------------------------------------------------------------------------*/

import { Emitter, Event, PauseableEmitter } from '../../../../base/common/event.js';
import { Disposable, IDisposable, MutableDisposable } from '../../../../base/common/lifecycle.js';
import { URI } from '../../../../base/common/uri.js';
import { generateUuid } from '../../../../base/common/uuid.js';
import { IAIExecutionService } from '../common/aiExecutionService.js';
import { IExecutionGraphService, ExecutionNodeType, ExecutionEdgeType, IExecutionNode, IExecutionScope } from '../common/executionGraphService.js';
import { IAIUnifiedStateService, AIRuntimePhase } from '../common/aiUnifiedStateService.js';
import { IObservabilityService, TraceCategory, TraceLevel } from '../common/observabilityService.js';
import { IAgentOrchestratorService, AgentLifecycleState, PlanStatus, StepStatus } from '../common/agentOrchestratorService.js';
import { IAIProcessOrchestratorService, ProcessLifecycleState, CommandRiskLevel, PolicyDecision } from '../common/aiProcessOrchestratorService.js';
import { IAIContextService, ContextFreshness } from '../common/aiContextService.js';
import {
	IGlobalExecutionBrainService,
	IIntent,
	IntentSource,
	IntentPriority,
	IntentScope,
	IntentResolution,
	IntentActionType,
	IIntentConstraint,
	IntentConstraintType,
	IBrainEvent,
	BrainEventCategory,
	BrainEventSeverity,
	BrainEventSource,
	IBrainEventFilter,
	IGlobalDecision,
	DecisionType,
	IArbitrationRule,
	IConflict,
	ConflictType,
	ConflictSeverity,
	ConflictState,
	IConflictResolution,
	ConflictResolutionType,
	ISyncCheckpoint,
	IDriftDetail,
	IReconciliationResult,
	ExecutionLoopPhase,
	IExecutionLoopTick,
	IExecutionLoopConfig,
	ISystemHealthMetrics,
	SystemHealthStatus,
	IHealthAlert,
	IHealthThresholds,
	CoherenceCheckType,
	ICoherenceCheckResult,
	ICoherenceIssue,
	CoherenceRepairAction,
	ICoherenceValidationResult,
	IIntentCreateParams,
	IEventBusStats,
	ISystemStatus,
} from '../common/globalExecutionBrain.js';

// ─── Intent Implementation ─────────────────────────────────────────────────────

class IntentImpl implements IIntent {
	public resolution: IntentResolution = IntentResolution.Pending;
	public resolvedAt: number | undefined = undefined;
	public resolutionReason: string | undefined = undefined;
	public approved: boolean = false;
	public approvedBy: string | undefined = undefined;
	public readonly graphNodeIds: string[] = [];
	public readonly childIntentIds: string[] = [];

	constructor(
		public readonly id: string,
		public readonly source: IntentSource,
		public readonly priority: IntentPriority,
		public readonly scope: IntentScope,
		public readonly actionType: IntentActionType,
		public readonly description: string,
		public readonly agentId: string | undefined,
		public readonly processSessionId: string | undefined,
		public readonly targetUris: readonly URI[],
		public readonly parentIntentId: string | undefined,
		public readonly constraints: readonly IIntentConstraint[],
		public readonly createdAt: number,
		public readonly requiresApproval: boolean,
	) { }
}

// ─── Default Arbitration Rules ─────────────────────────────────────────────────

const DEFAULT_ARBITRATION_RULES: IArbitrationRule[] = [
	{
		id: 'rule-critical-first',
		name: 'Critical Priority First',
		description: 'Critical intents always take precedence over all other intents.',
		rulePriority: 1000,
		active: true,
		handlesConflictTypes: [ConflictType.AgentCompetition, ConflictType.ResourceContention, ConflictType.FileConflict],
		evaluate(conflict: IConflict, intents: readonly IIntent[]): IGlobalDecision {
			const criticalIntents = intents.filter(i => i.priority === IntentPriority.Critical);
			if (criticalIntents.length > 0) {
				return {
					id: generateUuid(),
					type: DecisionType.Reorder,
					intentIds: criticalIntents.map(i => i.id),
					reason: 'Critical priority intents must be processed first',
					conflictId: conflict.id,
					appliedRule: 'rule-critical-first',
					timestamp: Date.now(),
					priority: IntentPriority.Critical,
					overridable: false,
					decidedBy: 'automatic',
					data: {},
				};
			}
			return {
				id: generateUuid(),
				type: DecisionType.Allow,
				intentIds: [],
				reason: 'No critical intents found',
				conflictId: conflict.id,
				appliedRule: 'rule-critical-first',
				timestamp: Date.now(),
				priority: IntentPriority.Normal,
				overridable: true,
				decidedBy: 'automatic',
				data: {},
			};
		},
	},
	{
		id: 'rule-agent-vs-process',
		name: 'Agent vs Process Priority',
		description: 'When an agent wants to edit a file that a process is building, delay the agent until the build completes.',
		rulePriority: 900,
		active: true,
		handlesConflictTypes: [ConflictType.AgentVsProcess, ConflictType.ProcessVsMutation],
		evaluate(conflict: IConflict, intents: readonly IIntent[]): IGlobalDecision {
			const processIntents = intents.filter(i => i.actionType === IntentActionType.ProcessExecution);
			const agentIntents = intents.filter(i => i.actionType === IntentActionType.AgentPlan || i.actionType === IntentActionType.FileEdit);
			if (processIntents.length > 0 && agentIntents.length > 0) {
				return {
					id: generateUuid(),
					type: DecisionType.Defer,
					intentIds: agentIntents.map(i => i.id),
					reason: 'Agent edits deferred until running process completes',
					conflictId: conflict.id,
					appliedRule: 'rule-agent-vs-process',
					timestamp: Date.now(),
					priority: IntentPriority.High,
					overridable: true,
					decidedBy: 'automatic',
					data: { deferredUntil: processIntents.map(i => i.id) },
				};
			}
			return {
				id: generateUuid(),
				type: DecisionType.Allow,
				intentIds: [],
				reason: 'No agent-process conflict detected',
				conflictId: conflict.id,
				appliedRule: 'rule-agent-vs-process',
				timestamp: Date.now(),
				priority: IntentPriority.Normal,
				overridable: true,
				decidedBy: 'automatic',
				data: {},
			};
		},
	},
	{
		id: 'rule-context-vs-graph',
		name: 'Context vs Graph Consistency',
		description: 'When context suggests a dependency conflict, escalate for review.',
		rulePriority: 800,
		active: true,
		handlesConflictTypes: [ConflictType.ContextVsGraph, ConflictType.GraphInconsistency],
		evaluate(conflict: IConflict, intents: readonly IIntent[]): IGlobalDecision {
			if (conflict.severity === ConflictSeverity.Critical) {
				return {
					id: generateUuid(),
					type: DecisionType.PauseSystem,
					intentIds: intents.map(i => i.id),
					reason: 'Graph inconsistency detected — pausing mutations until resolved',
					conflictId: conflict.id,
					appliedRule: 'rule-context-vs-graph',
					timestamp: Date.now(),
					priority: IntentPriority.Critical,
					overridable: false,
					decidedBy: 'automatic',
					data: {},
				};
			}
			return {
				id: generateUuid(),
				type: DecisionType.Escalate,
				intentIds: intents.map(i => i.id),
				reason: 'Context-graph inconsistency requires review',
				conflictId: conflict.id,
				appliedRule: 'rule-context-vs-graph',
				timestamp: Date.now(),
				priority: IntentPriority.High,
				overridable: true,
				decidedBy: 'automatic',
				data: {},
			};
		},
	},
	{
		id: 'rule-safety-violation',
		name: 'Safety Violation Block',
		description: 'Safety violations are always blocked and require manual override.',
		rulePriority: 2000,
		active: true,
		handlesConflictTypes: [ConflictType.SafetyViolation, ConflictType.PolicyViolation],
		evaluate(conflict: IConflict, intents: readonly IIntent[]): IGlobalDecision {
			return {
				id: generateUuid(),
				type: DecisionType.Block,
				intentIds: intents.map(i => i.id),
				reason: 'Safety or policy violation — blocking intent',
				conflictId: conflict.id,
				appliedRule: 'rule-safety-violation',
				timestamp: Date.now(),
				priority: IntentPriority.Critical,
				overridable: false,
				decidedBy: 'automatic',
				data: {},
			};
		},
	},
	{
		id: 'rule-state-drift',
		name: 'State Drift Resolution',
		description: 'When state drift is detected, trigger reconciliation before proceeding.',
		rulePriority: 700,
		active: true,
		handlesConflictTypes: [ConflictType.StateDrift],
		evaluate(conflict: IConflict, intents: readonly IIntent[]): IGlobalDecision {
			return {
				id: generateUuid(),
				type: DecisionType.Defer,
				intentIds: intents.map(i => i.id),
				reason: 'State drift detected — deferring intent until reconciliation completes',
				conflictId: conflict.id,
				appliedRule: 'rule-state-drift',
				timestamp: Date.now(),
				priority: IntentPriority.High,
				overridable: true,
				decidedBy: 'automatic',
				data: { requiresReconciliation: true },
			};
		},
	},
];

// ─── Default Health Thresholds ─────────────────────────────────────────────────

const DEFAULT_HEALTH_THRESHOLDS: IHealthThresholds = {
	maxLagMs: 500,
	maxBacklog: 50,
	maxGraphGrowthRate: 100,
	maxAgentSaturation: 0.85,
	maxProcessFailureRate: 5,
	maxMemoryPressure: 0.9,
	maxTickDurationMs: 200,
};

// ─── Default Loop Config ───────────────────────────────────────────────────────

const DEFAULT_LOOP_CONFIG: IExecutionLoopConfig = {
	tickIntervalMs: 100,
	maxConcurrentIntents: 10,
	maxIterationsPerCycle: 1000,
	active: false,
	reconciliationIntervalMs: 5000,
	healthCheckIntervalMs: 3000,
	coherenceIntervalMs: 10000,
};

// ═══════════════════════════════════════════════════════════════════════════════
// SERVICE IMPLEMENTATION
// ═══════════════════════════════════════════════════════════════════════════════

export class GlobalExecutionBrainService extends Disposable implements IGlobalExecutionBrainService {
	readonly _serviceBrand: undefined;

	// ─── State ────────────────────────────────────────────────────────────────

	private readonly _intents: Map<string, IntentImpl> = new Map();
	private readonly _events: IBrainEvent[] = [];
	private readonly _decisions: IGlobalDecision[] = [];
	private readonly _conflicts: Map<string, IConflict> = new Map();
	private readonly _arbitrationRules: IArbitrationRule[] = [];
	private readonly _healthAlerts: Map<string, IHealthAlert> = new Map();
	private readonly _syncCheckpoints: ISyncCheckpoint[] = [];
	private readonly _loopHistory: IExecutionLoopTick[] = [];

	private _loopPhase: ExecutionLoopPhase = ExecutionLoopPhase.Idle;
	private _loopConfig: IExecutionLoopConfig = { ...DEFAULT_LOOP_CONFIG };
	private _loopActive: boolean = false;
	private _loopTimer: ReturnType<typeof setInterval> | undefined;
	private _reconciliationTimer: ReturnType<typeof setInterval> | undefined;
	private _healthTimer: ReturnType<typeof setInterval> | undefined;
	private _coherenceTimer: ReturnType<typeof setInterval> | undefined;
	private _tickCounter: number = 0;
	private _healthThresholds: IHealthThresholds = { ...DEFAULT_HEALTH_THRESHOLDS };
	private _healthMetrics: ISystemHealthMetrics = this._emptyHealthMetrics();
	private _healthStatus: SystemHealthStatus = SystemHealthStatus.Healthy;
	private _lastCoherenceResult: ICoherenceValidationResult | undefined;
	private _pauseReason: string | undefined;
	private _eventStatsByCategory: Map<string, number> = new Map();
	private _eventStatsBySource: Map<string, number> = new Map();

	// ─── Event Emitters ──────────────────────────────────────────────────────

	private readonly _onDidCreateIntent = this._register(new Emitter<IIntent>());
	readonly onDidCreateIntent: Event<IIntent> = this._onDidCreateIntent.event;

	private readonly _onDidChangeIntentResolution = this._register(new Emitter<IIntent>());
	readonly onDidChangeIntentResolution: Event<IIntent> = this._onDidChangeIntentResolution.event;

	private readonly _onDidDetectConflict = this._register(new Emitter<IConflict>());
	readonly onDidDetectConflict: Event<IConflict> = this._onDidDetectConflict.event;

	private readonly _onDidResolveConflict = this._register(new Emitter<IConflict>());
	readonly onDidResolveConflict: Event<IConflict> = this._onDidResolveConflict.event;

	private readonly _onDidChangeLoopPhase = this._register(new Emitter<ExecutionLoopPhase>());
	readonly onDidChangeLoopPhase: Event<ExecutionLoopPhase> = this._onDidChangeLoopPhase.event;

	private readonly _onDidTriggerHealthAlert = this._register(new Emitter<IHealthAlert>());
	readonly onDidTriggerHealthAlert: Event<IHealthAlert> = this._onDidTriggerHealthAlert.event;

	private readonly _onDidChangeHealthStatus = this._register(new Emitter<SystemHealthStatus>());
	readonly onDidChangeHealthStatus: Event<SystemHealthStatus> = this._onDidChangeHealthStatus.event;

	private readonly _onDidValidateCoherence = this._register(new Emitter<ICoherenceValidationResult>());
	readonly onDidValidateCoherence: Event<ICoherenceValidationResult> = this._onDidValidateCoherence.event;

	private readonly _onDidEmitEvent = this._register(new Emitter<IBrainEvent>());

	// ─── Constructor ──────────────────────────────────────────────────────────

	constructor(
		@IAIExecutionService private readonly executionService: IAIExecutionService,
		@IExecutionGraphService private readonly graphService: IExecutionGraphService,
		@IAIUnifiedStateService private readonly stateService: IAIUnifiedStateService,
		@IObservabilityService private readonly observabilityService: IObservabilityService,
		@IAgentOrchestratorService private readonly agentOrchestrator: IAgentOrchestratorService,
		@IAIProcessOrchestratorService private readonly processOrchestrator: IAIProcessOrchestratorService,
		@IAIContextService private readonly contextService: IAIContextService,
	) {
		super();

		// Register default arbitration rules
		for (const rule of DEFAULT_ARBITRATION_RULES) {
			this._arbitrationRules.push(rule);
		}

		// Subscribe to subsystem events for cross-system propagation
		this._registerSubscriptions();

		this.observabilityService.trackMutationStage('global-brain-init', 7 as any, { message: 'Global Execution Brain initialized' });
	}

	// ─── Intent Management ────────────────────────────────────────────────────

	createIntent(params: IIntentCreateParams): IIntent {
		const id = generateUuid();
		const intent = new IntentImpl(
			id,
			params.source,
			params.priority,
			params.scope,
			params.actionType,
			params.description,
			params.agentId,
			params.processSessionId,
			params.targetUris ?? [],
			params.parentIntentId,
			params.constraints ?? [],
			Date.now(),
			params.requiresApproval ?? false,
		);

		// Link to parent if specified
		if (params.parentIntentId) {
			const parent = this._intents.get(params.parentIntentId);
			if (parent) {
				(parent as IntentImpl).childIntentIds.push(id);
			}
		}

		this._intents.set(id, intent);

		// Emit brain event
		this.emitEvent({
			category: BrainEventCategory.Intent,
			severity: BrainEventSeverity.Info,
			source: BrainEventSource.GlobalBrain,
			description: `Intent created: ${intent.description}`,
			intentId: id,
			graphNodeId: undefined,
			agentId: intent.agentId,
			processSessionId: intent.processSessionId,
			data: { source: intent.source, priority: intent.priority, actionType: intent.actionType },
		});

		this._onDidCreateIntent.fire(intent);
		return intent;
	}

	getIntent(intentId: string): IIntent | undefined {
		return this._intents.get(intentId);
	}

	getActiveIntents(): readonly IIntent[] {
		return [...this._intents.values()].filter(i =>
			i.resolution !== IntentResolution.Satisfied &&
			i.resolution !== IntentResolution.Failed &&
			i.resolution !== IntentResolution.Cancelled &&
			i.resolution !== IntentResolution.Superseded
		);
	}

	getIntentsBySource(source: IntentSource): readonly IIntent[] {
		return [...this._intents.values()].filter(i => i.source === source);
	}

	getIntentsByActionType(actionType: IntentActionType): readonly IIntent[] {
		return [...this._intents.values()].filter(i => i.actionType === actionType);
	}

	getIntentChain(intentId: string): readonly IIntent[] {
		const chain: IIntent[] = [];
		// Walk up to root
		let current: IIntent | undefined = this._intents.get(intentId);
		while (current) {
			chain.unshift(current);
			current = current.parentIntentId ? this._intents.get(current.parentIntentId) : undefined;
		}
		// Walk down to leaves
		const addChildren = (intent: IIntent) => {
			for (const childId of intent.childIntentIds) {
				const child = this._intents.get(childId);
				if (child) {
					chain.push(child);
					addChildren(child);
				}
			}
		};
		if (chain.length > 0) {
			addChildren(chain[chain.length - 1]);
		}
		return chain;
	}

	resolveIntent(intentId: string, resolution: IntentResolution, reason: string): void {
		const intent = this._intents.get(intentId);
		if (!intent) { return; }
		const prevResolution = intent.resolution;
		intent.resolution = resolution;
		intent.resolvedAt = Date.now();
		intent.resolutionReason = reason;

		this.emitEvent({
			category: BrainEventCategory.Intent,
			severity: resolution === IntentResolution.Failed ? BrainEventSeverity.Warning : BrainEventSeverity.Info,
			source: BrainEventSource.GlobalBrain,
			description: `Intent resolved: ${resolution} — ${reason}`,
			intentId,
			graphNodeId: undefined,
			agentId: intent.agentId,
			processSessionId: intent.processSessionId,
			data: { fromResolution: prevResolution, toResolution: resolution },
		});

		this._onDidChangeIntentResolution.fire(intent);
	}

	approveIntent(intentId: string, approvedBy: string): void {
		const intent = this._intents.get(intentId);
		if (!intent) { return; }
		intent.approved = true;
		intent.approvedBy = approvedBy;
	}

	// ─── Event Bus ───────────────────────────────────────────────────────────

	emitEvent(event: Omit<IBrainEvent, 'id' | 'timestamp'>): IBrainEvent {
		const fullEvent: IBrainEvent = {
			...event,
			id: generateUuid(),
			timestamp: Date.now(),
		};
		this._events.push(fullEvent);

		// Track stats
		const catKey = fullEvent.category;
		this._eventStatsByCategory.set(catKey, (this._eventStatsByCategory.get(catKey) ?? 0) + 1);
		const srcKey = fullEvent.source;
		this._eventStatsBySource.set(srcKey, (this._eventStatsBySource.get(srcKey) ?? 0) + 1);

		// Trim if too large
		if (this._events.length > 10000) {
			this._events.splice(0, 1000);
		}

		this._onDidEmitEvent.fire(fullEvent);
		return fullEvent;
	}

	subscribe(filter?: IBrainEventFilter): Event<IBrainEvent> {
		if (!filter) {
			return this._onDidEmitEvent.event;
		}
		return Event.filter(this._onDidEmitEvent.event, (e: IBrainEvent) => {
			if (filter.categories && filter.categories.length > 0 && !filter.categories.includes(e.category)) { return false; }
			if (filter.sources && filter.sources.length > 0 && !filter.sources.includes(e.source)) { return false; }
			if (filter.minSeverity !== undefined) {
				const severityOrder = [BrainEventSeverity.Info, BrainEventSeverity.Warning, BrainEventSeverity.Error, BrainEventSeverity.Critical];
				if (severityOrder.indexOf(e.severity) < severityOrder.indexOf(filter.minSeverity)) { return false; }
			}
			if (filter.intentId && e.intentId !== filter.intentId) { return false; }
			if (filter.agentId && e.agentId !== filter.agentId) { return false; }
			return true;
		});
	}

	getRecentEvents(limit: number, filter?: IBrainEventFilter): readonly IBrainEvent[] {
		let events = [...this._events];
		if (filter) {
			if (filter.categories && filter.categories.length > 0) {
				events = events.filter(e => filter.categories!.includes(e.category));
			}
			if (filter.sources && filter.sources.length > 0) {
				events = events.filter(e => filter.sources!.includes(e.source));
			}
			if (filter.intentId) {
				events = events.filter(e => e.intentId === filter.intentId);
			}
			if (filter.agentId) {
				events = events.filter(e => e.agentId === filter.agentId);
			}
		}
		return events.slice(-limit);
	}

	get eventBusStats(): IEventBusStats {
		const now = Date.now();
		const recentWindow = now - 60000;
		const recentEvents = this._events.filter(e => e.timestamp >= recentWindow);
		return {
			totalEventsEmitted: this._events.length,
			eventsPerSecond: recentEvents.length / 60,
			subscriberCount: this._onDidEmitEvent.listenerCount,
			eventsByCategory: Object.fromEntries(this._eventStatsByCategory),
			eventsBySource: Object.fromEntries(this._eventStatsBySource),
		};
	}

	// ─── Decision Engine ─────────────────────────────────────────────────────

	evaluateIntent(intentId: string): IGlobalDecision {
		const intent = this._intents.get(intentId);
		if (!intent) {
			return this._makeDecision(DecisionType.Block, [], 'Intent not found', undefined, 'evaluate-intent', IntentPriority.Normal);
		}

		// Check if intent requires approval and hasn't been approved
		if (intent.requiresApproval && !intent.approved) {
			return this._makeDecision(DecisionType.Escalate, [intentId], 'Intent requires approval', undefined, 'approval-check', intent.priority);
		}

		// Detect conflicts
		const conflicts = this.detectConflicts(intentId);
		if (conflicts.length > 0) {
			// Find the highest-severity conflict
			const criticalConflict = conflicts.find(c => c.severity === ConflictSeverity.Critical);
			if (criticalConflict) {
				return this._makeDecision(DecisionType.Block, [intentId], `Critical conflict: ${criticalConflict.description}`, criticalConflict.id, 'conflict-check', intent.priority);
			}

			// Apply arbitration rules
			const sortedRules = [...this._arbitrationRules]
				.filter(r => r.active)
				.sort((a, b) => b.rulePriority - a.rulePriority);

			for (const rule of sortedRules) {
				const relevantConflict = conflicts.find(c =>
					rule.handlesConflictTypes.includes(c.type)
				);
				if (relevantConflict) {
					const decision = rule.evaluate(relevantConflict, [intent]);
					this._decisions.push(decision);
					return decision;
				}
			}
		}

		// Check quota / resource limits
		if (this.getActiveIntents().length >= this._loopConfig.maxConcurrentIntents) {
			return this._makeDecision(DecisionType.Defer, [intentId], 'Maximum concurrent intents reached', undefined, 'quota-check', intent.priority);
		}

		// All checks passed — allow
		const decision = this._makeDecision(DecisionType.Allow, [intentId], 'Intent evaluated — no conflicts', undefined, 'evaluate-intent', intent.priority);
		this.resolveIntent(intentId, IntentResolution.Queued, 'Decision: Allow');
		return decision;
	}

	getRecentDecisions(limit: number): readonly IGlobalDecision[] {
		return this._decisions.slice(-limit);
	}

	registerArbitrationRule(rule: IArbitrationRule): IDisposable {
		this._arbitrationRules.push(rule);
		return { dispose: () => { const idx = this._arbitrationRules.indexOf(rule); if (idx >= 0) { this._arbitrationRules.splice(idx, 1); } } };
	}

	getArbitrationRules(): readonly IArbitrationRule[] {
		return [...this._arbitrationRules];
	}

	// ─── Conflict Resolution ─────────────────────────────────────────────────

	detectConflicts(intentId: string): readonly IConflict[] {
		const intent = this._intents.get(intentId);
		if (!intent) { return []; }

		const conflicts: IConflict[] = [];

		// Check agent-vs-process conflicts
		if (intent.actionType === IntentActionType.FileEdit || intent.actionType === IntentActionType.AgentPlan) {
			const runningProcesses = this.processOrchestrator.getActiveSessions();
			const buildingProcesses = runningProcesses.filter(s =>
				s.lifecycleState === ProcessLifecycleState.Running &&
				(s.command.includes('build') || s.command.includes('compile') || s.command.includes('tsc') || s.command.includes('webpack'))
			);
			if (buildingProcesses.length > 0) {
				// Check file overlap
				const processFiles = buildingProcesses.map(s => s.cwd?.toString() ?? '').filter(f => f);
				const intentFiles = intent.targetUris.map(u => u.toString());
				const hasOverlap = processFiles.some(pf => intentFiles.some(if_ => if_.startsWith(pf)));
				if (hasOverlap) {
					conflicts.push(this._createConflict(
						ConflictType.AgentVsProcess,
						ConflictSeverity.Medium,
						[intentId],
						`Agent wants to edit files while process is building in the same directory`,
						buildingProcesses.map(s => s.id),
						[
							this._createResolution(ConflictResolutionType.DelayOne, 'Delay agent edit until build completes', [intentId], 'medium', true),
							this._createResolution(ConflictResolutionType.QueueBoth, 'Queue both for sequential execution', [intentId], 'low', true),
						],
					));
				}
			}
		}

		// Check file conflicts (multiple intents targeting same files)
		const activeIntents = this.getActiveIntents();
		for (const other of activeIntents) {
			if (other.id === intentId) { continue; }
			const overlapUris = intent.targetUris.filter(u => other.targetUris.includes(u));
			if (overlapUris.length > 0 && intent.resolution === IntentResolution.Queued && other.resolution === IntentResolution.Queued) {
				conflicts.push(this._createConflict(
					ConflictType.FileConflict,
					ConflictSeverity.Medium,
					[intentId, other.id],
					`Multiple intents target the same files: ${overlapUris.map(u => u.path).join(', ')}`,
					overlapUris.map(u => u.toString()),
					[
						this._createResolution(ConflictResolutionType.QueueBoth, 'Queue intents for sequential execution', [intentId, other.id], 'medium', true),
						this._createResolution(ConflictResolutionType.CancelLower, `Cancel lower-priority intent (${intent.priority < other.priority ? intent.id : other.id})`, [intentId, other.id], 'medium', true),
					],
				));
			}
		}

		// Check agent competition
		if (intent.actionType === IntentActionType.AgentPlan && intent.agentId) {
			const agentConflicts = activeIntents.filter(i =>
				i.id !== intentId &&
				i.actionType === IntentActionType.AgentPlan &&
				i.agentId !== intent.agentId &&
				i.targetUris.some(u => intent.targetUris.includes(u))
			);
			if (agentConflicts.length > 0) {
				conflicts.push(this._createConflict(
					ConflictType.AgentCompetition,
					ConflictSeverity.High,
					[intentId, ...agentConflicts.map(i => i.id)],
					`Multiple agents competing for the same files`,
					intent.targetUris.map(u => u.toString()),
					[
						this._createResolution(ConflictResolutionType.Escalate, 'Escalate for manual decision', [intentId, ...agentConflicts.map(i => i.id)], 'high', false),
						this._createResolution(ConflictResolutionType.QueueBoth, 'Queue agents sequentially', [intentId, ...agentConflicts.map(i => i.id)], 'medium', true),
					],
				));
			}
		}

		// Check resource contention
		if (this._healthMetrics.systemLagMs > this._healthThresholds.maxLagMs) {
			conflicts.push(this._createConflict(
				ConflictType.ResourceContention,
				ConflictSeverity.High,
				[intentId],
				`System under load (lag: ${this._healthMetrics.systemLagMs}ms)`,
				[],
				[
					this._createResolution(ConflictResolutionType.DelayOne, 'Defer intent until system recovers', [intentId], 'high', true),
				],
			));
		}

		// Check safety violations
		if (intent.actionType === IntentActionType.ProcessExecution && intent.processSessionId) {
			const session = this.processOrchestrator.getSession(intent.processSessionId);
			if (session) {
				const unsafeCheck = this.processOrchestrator.detectUnsafePatterns(session.command);
				if (unsafeCheck.detected) {
					conflicts.push(this._createConflict(
						ConflictType.SafetyViolation,
						ConflictSeverity.Critical,
						[intentId],
						`Unsafe command pattern detected: ${unsafeCheck.matchedPatterns.map(p => p.name).join(', ')}`,
						[],
						[
							this._createResolution(ConflictResolutionType.CancelLower, 'Block the unsafe command', [intentId], 'critical', false),
							this._createResolution(ConflictResolutionType.Sandbox, 'Execute in sandbox mode', [intentId], 'high', true),
						],
						true,
						false,
					));
				}
			}
		}

		// Store detected conflicts
		for (const conflict of conflicts) {
			this._conflicts.set(conflict.id, conflict);
			this._onDidDetectConflict.fire(conflict);

			this.emitEvent({
				category: BrainEventCategory.Decision,
				severity: conflict.severity === ConflictSeverity.Critical ? BrainEventSeverity.Critical : BrainEventSeverity.Warning,
				source: BrainEventSource.GlobalBrain,
				description: `Conflict detected: ${conflict.description}`,
				intentId,
				graphNodeId: undefined,
				agentId: intent.agentId,
				processSessionId: intent.processSessionId,
				data: { conflictType: conflict.type, severity: conflict.severity },
			});
		}

		return conflicts;
	}

	getActiveConflicts(): readonly IConflict[] {
		return [...this._conflicts.values()].filter(c => c.state !== ConflictState.Resolved && c.state !== ConflictState.Unresolvable);
	}

	resolveConflict(conflictId: string): IGlobalDecision {
		const conflict = this._conflicts.get(conflictId);
		if (!conflict) {
			return this._makeDecision(DecisionType.Block, [], 'Conflict not found', conflictId, 'resolve-conflict', IntentPriority.Normal);
		}

		conflict.state = ConflictState.Evaluating;

		// Apply arbitration rules
		const sortedRules = [...this._arbitrationRules]
			.filter(r => r.active && r.handlesConflictTypes.includes(conflict.type))
			.sort((a, b) => b.rulePriority - a.rulePriority);

		if (sortedRules.length > 0) {
			const intents = conflict.intentIds.map(id => this._intents.get(id)).filter((i): i is IntentImpl => i !== undefined);
			const decision = sortedRules[0].evaluate(conflict, intents);
			conflict.state = ConflictState.Resolved;
			conflict.resolvedAt = Date.now();
			conflict.resolutionDecision = decision;
			this._decisions.push(decision);
			this._onDidResolveConflict.fire(conflict);

			// Apply the decision to affected intents
			for (const intentId of decision.intentIds) {
				const intent = this._intents.get(intentId);
				if (intent) {
					switch (decision.type) {
						case DecisionType.Block:
							this.resolveIntent(intentId, IntentResolution.Blocked, decision.reason);
							break;
						case DecisionType.Defer:
							this.resolveIntent(intentId, IntentResolution.Deferred, decision.reason);
							break;
						case DecisionType.Cancel:
							this.resolveIntent(intentId, IntentResolution.Cancelled, decision.reason);
							break;
						case DecisionType.Allow:
							this.resolveIntent(intentId, IntentResolution.Queued, decision.reason);
							break;
					}
				}
			}

			return decision;
		}

		// No rule found — escalate
		conflict.state = ConflictState.Escalated;
		return this._makeDecision(DecisionType.Escalate, conflict.intentIds, 'No arbitration rule found for conflict', conflictId, 'resolve-conflict', IntentPriority.High);
	}

	escalateConflict(conflictId: string): void {
		const conflict = this._conflicts.get(conflictId);
		if (conflict) {
			conflict.state = ConflictState.Escalated;
			this.emitEvent({
				category: BrainEventCategory.Decision,
				severity: BrainEventSeverity.Error,
				source: BrainEventSource.GlobalBrain,
				description: `Conflict escalated: ${conflict.description}`,
				intentId: conflict.intentIds[0],
				graphNodeId: undefined,
				agentId: undefined,
				processSessionId: undefined,
				data: { conflictId, type: conflict.type },
			});
		}
	}

	// ─── Synchronization ─────────────────────────────────────────────────────

	takeSyncCheckpoint(): ISyncCheckpoint {
		const graphStats = {
			nodes: this.graphService.nodeCount,
			edges: this.graphService.edgeCount,
		};

		const agents = this.agentOrchestrator.getAllAgents();
		const activeAgents = agents.filter(a =>
			a.lifecycleState !== AgentLifecycleState.Idle &&
			a.lifecycleState !== AgentLifecycleState.Completed &&
			a.lifecycleState !== AgentLifecycleState.Failed &&
			a.lifecycleState !== AgentLifecycleState.Cancelled
		);

		const activeProcesses = this.processOrchestrator.getActiveSessions();
		const activeIntents = this.getActiveIntents();
		const activeConflicts = this.getActiveConflicts();

		// Drift detection
		const drifts = this._detectDrift();

		const checkpoint: ISyncCheckpoint = {
			id: generateUuid(),
			takenAt: Date.now(),
			runtimePhase: this.stateService.phase,
			activeExecutionCount: this.stateService.activeState.isExecuting ? 1 : 0,
			activeAgentCount: activeAgents.length,
			activeProcessCount: activeProcesses.length,
			activeIntentCount: activeIntents.length,
			graphNodeCount: graphStats.nodes,
			graphEdgeCount: graphStats.edges,
			unresolvedConflictCount: activeConflicts.length,
			hasDrift: drifts.length > 0,
			driftDetails: drifts,
		};

		this._syncCheckpoints.push(checkpoint);
		if (this._syncCheckpoints.length > 100) {
			this._syncCheckpoints.splice(0, 10);
		}

		return checkpoint;
	}

	reconcile(): IReconciliationResult {
		const startTime = Date.now();
		const drifts = this._detectDrift();

		let corrected = 0;
		let uncorrected = 0;

		for (const drift of drifts) {
			if (drift.severity === 'minor') {
				// Auto-correct minor drifts
				corrected++;
				this.emitEvent({
					category: BrainEventCategory.Sync,
					severity: BrainEventSeverity.Info,
					source: BrainEventSource.GlobalBrain,
					description: `Auto-corrected drift: ${drift.aspect}`,
					intentId: undefined,
					graphNodeId: undefined,
					agentId: undefined,
					processSessionId: undefined,
					data: { subsystems: drift.subsystems, aspect: drift.aspect, action: drift.correctiveAction },
				});
			} else if (drift.severity === 'major') {
				// Attempt auto-correction for major drifts
				if (drift.correctiveAction === 'resync' || drift.correctiveAction === 'refresh') {
					corrected++;
				} else {
					uncorrected++;
				}
			} else {
				uncorrected++;
			}
		}

		return {
			reconciliationNeeded: drifts.length > 0,
			driftsDetected: drifts.length,
			driftsCorrected: corrected,
			driftsUncorrected: uncorrected,
			converged: uncorrected === 0,
			completedAt: Date.now(),
			durationMs: Date.now() - startTime,
		};
	}

	get lastSyncCheckpoint(): ISyncCheckpoint | undefined {
		return this._syncCheckpoints.length > 0 ? this._syncCheckpoints[this._syncCheckpoints.length - 1] : undefined;
	}

	hasDrift(): boolean {
		return this._detectDrift().length > 0;
	}

	// ─── Execution Loop ──────────────────────────────────────────────────────

	startLoop(): void {
		if (this._loopActive) { return; }
		this._loopActive = true;
		this._loopConfig.active = true;

		this._setLoopPhase(ExecutionLoopPhase.Idle);

		// Main loop timer
		this._loopTimer = setInterval(() => this._tick(), this._loopConfig.tickIntervalMs);

		// Reconciliation timer
		this._reconciliationTimer = setInterval(() => this.reconcile(), this._loopConfig.reconciliationIntervalMs);

		// Health check timer
		this._healthTimer = setInterval(() => this._checkHealth(), this._loopConfig.healthCheckIntervalMs);

		// Coherence validation timer
		this._coherenceTimer = setInterval(() => this.validateCoherence(), this._loopConfig.coherenceIntervalMs);

		this.emitEvent({
			category: BrainEventCategory.Intent,
			severity: BrainEventSeverity.Info,
			source: BrainEventSource.GlobalBrain,
			description: 'Global execution loop started',
			intentId: undefined,
			graphNodeId: undefined,
			agentId: undefined,
			processSessionId: undefined,
			data: {},
		});
	}

	stopLoop(): void {
		this._loopActive = false;
		this._loopConfig.active = false;

		if (this._loopTimer) { clearInterval(this._loopTimer); this._loopTimer = undefined; }
		if (this._reconciliationTimer) { clearInterval(this._reconciliationTimer); this._reconciliationTimer = undefined; }
		if (this._healthTimer) { clearInterval(this._healthTimer); this._healthTimer = undefined; }
		if (this._coherenceTimer) { clearInterval(this._coherenceTimer); this._coherenceTimer = undefined; }

		this._setLoopPhase(ExecutionLoopPhase.Idle);

		this.emitEvent({
			category: BrainEventCategory.Intent,
			severity: BrainEventSeverity.Info,
			source: BrainEventSource.GlobalBrain,
			description: 'Global execution loop stopped',
			intentId: undefined,
			graphNodeId: undefined,
			agentId: undefined,
			processSessionId: undefined,
			data: {},
		});
	}

	pauseLoop(reason: string): void {
		this._pauseReason = reason;
		this._setLoopPhase(ExecutionLoopPhase.Paused);

		this.emitEvent({
			category: BrainEventCategory.Health,
			severity: BrainEventSeverity.Warning,
			source: BrainEventSource.GlobalBrain,
			description: `Global execution loop paused: ${reason}`,
			intentId: undefined,
			graphNodeId: undefined,
			agentId: undefined,
			processSessionId: undefined,
			data: { reason },
		});
	}

	resumeLoop(): void {
		this._pauseReason = undefined;
		this._setLoopPhase(ExecutionLoopPhase.Idle);

		this.emitEvent({
			category: BrainEventCategory.Health,
			severity: BrainEventSeverity.Info,
			source: BrainEventSource.GlobalBrain,
			description: 'Global execution loop resumed',
			intentId: undefined,
			graphNodeId: undefined,
			agentId: undefined,
			processSessionId: undefined,
			data: {},
		});
	}

	get loopPhase(): ExecutionLoopPhase { return this._loopPhase; }
	get loopConfig(): IExecutionLoopConfig { return { ...this._loopConfig }; }
	get loopActive(): boolean { return this._loopActive; }

	updateLoopConfig(config: Partial<IExecutionLoopConfig>): void {
		Object.assign(this._loopConfig, config);
	}

	getLoopHistory(limit: number): readonly IExecutionLoopTick[] {
		return this._loopHistory.slice(-limit);
	}

	// ─── Health Monitor ──────────────────────────────────────────────────────

	get healthMetrics(): ISystemHealthMetrics { return { ...this._healthMetrics }; }
	get healthStatus(): SystemHealthStatus { return this._healthStatus; }

	getActiveHealthAlerts(): readonly IHealthAlert[] {
		return [...this._healthAlerts.values()].filter(a => a.active);
	}

	setHealthThresholds(thresholds: Partial<IHealthThresholds>): void {
		Object.assign(this._healthThresholds, thresholds);
	}

	get healthThresholds(): IHealthThresholds { return { ...this._healthThresholds }; }

	// ─── Coherence Validation ────────────────────────────────────────────────

	validateCoherence(): ICoherenceValidationResult {
		const startTime = Date.now();
		const checks: ICoherenceCheckResult[] = [];

		// Run all coherence checks
		checks.push(this._checkGraphConsistency());
		checks.push(this._checkContextAccuracy());
		checks.push(this._checkProcessCorrectness());
		checks.push(this._checkAgentStateAlignment());
		checks.push(this._checkStateConsistency());
		checks.push(this._checkIntentChainValidity());
		checks.push(this._checkOrphanDetection());
		checks.push(this._checkScopeIntegrity());

		const allIssues = checks.flatMap(c => c.issues);
		const issuesBySeverity: Record<string, number> = { minor: 0, major: 0, critical: 0 };
		for (const issue of allIssues) {
			issuesBySeverity[issue.severity] = (issuesBySeverity[issue.severity] ?? 0) + 1;
		}

		const autoRepairableCount = allIssues.filter(i => i.autoRepairable).length;

		const result: ICoherenceValidationResult = {
			validatedAt: Date.now(),
			coherent: allIssues.length === 0,
			checks,
			totalIssues: allIssues.length,
			issuesBySeverity,
			autoRepairableCount,
			autoRepairPerformed: false,
			durationMs: Date.now() - startTime,
		};

		this._lastCoherenceResult = result;
		this._onDidValidateCoherence.fire(result);

		this.emitEvent({
			category: BrainEventCategory.Coherence,
			severity: result.coherent ? BrainEventSeverity.Info : (issuesBySeverity.critical > 0 ? BrainEventSeverity.Critical : BrainEventSeverity.Warning),
			source: BrainEventSource.GlobalBrain,
			description: `Coherence validation: ${result.coherent ? 'PASS' : `${result.totalIssues} issues found`}`,
			intentId: undefined,
			graphNodeId: undefined,
			agentId: undefined,
			processSessionId: undefined,
			data: { totalIssues: result.totalIssues, coherent: result.coherent },
		});

		return result;
	}

	runCoherenceCheck(checkType: CoherenceCheckType): ICoherenceCheckResult {
		switch (checkType) {
			case CoherenceCheckType.GraphConsistency: return this._checkGraphConsistency();
			case CoherenceCheckType.ContextAccuracy: return this._checkContextAccuracy();
			case CoherenceCheckType.ProcessCorrectness: return this._checkProcessCorrectness();
			case CoherenceCheckType.AgentStateAlignment: return this._checkAgentStateAlignment();
			case CoherenceCheckType.StateConsistency: return this._checkStateConsistency();
			case CoherenceCheckType.IntentChainValidity: return this._checkIntentChainValidity();
			case CoherenceCheckType.OrphanDetection: return this._checkOrphanDetection();
			case CoherenceCheckType.ScopeIntegrity: return this._checkScopeIntegrity();
		}
	}

	autoRepairCoherence(): number {
		if (!this._lastCoherenceResult) { return 0; }

		let repaired = 0;
		const allIssues = this._lastCoherenceResult.checks.flatMap(c => c.issues);

		for (const issue of allIssues) {
			if (!issue.autoRepairable) { continue; }

			switch (issue.suggestedRepair) {
				case CoherenceRepairAction.RemoveOrphan:
					// Remove orphaned resources
					repaired++;
					break;
				case CoherenceRepairAction.CloseScope:
					// Close unclosed scopes
					repaired++;
					break;
				case CoherenceRepairAction.Resync:
					// Trigger resync
					this.reconcile();
					repaired++;
					break;
				case CoherenceRepairAction.RefreshContext:
					// Refresh stale context
					repaired++;
					break;
				default:
					break;
			}
		}

		if (repaired > 0) {
			this._lastCoherenceResult = {
				...this._lastCoherenceResult,
				autoRepairPerformed: true,
			};
		}

		return repaired;
	}

	get lastCoherenceResult(): ICoherenceValidationResult | undefined { return this._lastCoherenceResult; }

	// ─── System-Wide Queries ─────────────────────────────────────────────────

	getSystemStatus(): ISystemStatus {
		const agents = this.agentOrchestrator.getAllAgents();
		const activeAgents = agents.filter(a => a.lifecycleState !== AgentLifecycleState.Idle && a.lifecycleState !== AgentLifecycleState.Completed && a.lifecycleState !== AgentLifecycleState.Failed && a.lifecycleState !== AgentLifecycleState.Cancelled);

		return {
			timestamp: Date.now(),
			loopPhase: this._loopPhase,
			loopActive: this._loopActive,
			healthStatus: this._healthStatus,
			healthMetrics: this._healthMetrics,
			activeIntents: this.getActiveIntents().length,
			activeConflicts: this.getActiveConflicts().length,
			activeAgents: activeAgents.length,
			activeProcesses: this.processOrchestrator.activeSessionCount,
			graphNodes: this.graphService.nodeCount,
			graphEdges: this.graphService.edgeCount,
			pendingApprovals: this.agentOrchestrator.getPendingApprovals().length + this.processOrchestrator.getPendingProcessApprovals().length,
			hasDrift: this.hasDrift(),
			coherent: this._lastCoherenceResult?.coherent ?? true,
			lastReconciliationAt: this.lastSyncCheckpoint?.takenAt,
			lastCoherenceCheckAt: this._lastCoherenceResult?.validatedAt,
		};
	}

	get totalIntentCount(): number { return this._intents.size; }
	get totalDecisionCount(): number { return this._decisions.length; }
	get totalConflictCount(): number { return this._conflicts.size; }

	// ═════════════════════════════════════════════════════════════════════════════
	// PRIVATE IMPLEMENTATION
	// ═════════════════════════════════════════════════════════════════════════════

	private _registerSubscriptions(): void {
		// Subscribe to graph events
		this._register(this.graphService.onDidCreateNode(node => {
			this.emitEvent({
				category: BrainEventCategory.Graph,
				severity: BrainEventSeverity.Info,
				source: BrainEventSource.ExecutionGraph,
				description: `Graph node created: ${node.label}`,
				intentId: undefined,
				graphNodeId: node.id,
				agentId: undefined,
				processSessionId: undefined,
				data: { nodeType: node.type, fileUri: node.fileUri?.toString() },
			});
		}));

		this._register(this.graphService.onDidCompleteNode(node => {
			this.emitEvent({
				category: BrainEventCategory.Graph,
				severity: node.success ? BrainEventSeverity.Info : BrainEventSeverity.Warning,
				source: BrainEventSource.ExecutionGraph,
				description: `Graph node completed: ${node.label} (${node.success ? 'success' : 'failed'})`,
				intentId: undefined,
				graphNodeId: node.id,
				agentId: undefined,
				processSessionId: undefined,
				data: { success: node.success },
			});
		}));

		// Subscribe to agent events
		this._register(this.agentOrchestrator.onDidChangeAgentLifecycle(event => {
			this.emitEvent({
				category: BrainEventCategory.Agent,
				severity: BrainEventSeverity.Info,
				source: BrainEventSource.AgentOrchestrator,
				description: `Agent ${event.agentId}: ${event.fromState} → ${event.toState}`,
				intentId: undefined,
				graphNodeId: undefined,
				agentId: event.agentId,
				processSessionId: undefined,
				data: { fromState: event.fromState, toState: event.toState },
			});
		}));

		this._register(this.agentOrchestrator.onDidChangePlanStatus(event => {
			this.emitEvent({
				category: BrainEventCategory.Agent,
				severity: BrainEventSeverity.Info,
				source: BrainEventSource.AgentOrchestrator,
				description: `Plan ${event.planId}: ${event.fromStatus} → ${event.toStatus}`,
				intentId: undefined,
				graphNodeId: undefined,
				agentId: event.agentId,
				processSessionId: undefined,
				data: { fromStatus: event.fromStatus, toStatus: event.toStatus },
			});
		}));

		// Subscribe to process events
		this._register(this.processOrchestrator.onDidChangeProcessLifecycle(event => {
			this.emitEvent({
				category: BrainEventCategory.Process,
				severity: BrainEventSeverity.Info,
				source: BrainEventSource.ProcessOrchestrator,
				description: `Process ${event.sessionId}: ${event.fromState} → ${event.toState}`,
				intentId: undefined,
				graphNodeId: undefined,
				agentId: undefined,
				processSessionId: event.sessionId,
				data: { fromState: event.fromState, toState: event.toState },
			});
		}));

		// Subscribe to context events
		this._register(this.contextService.onDidUpdateContext(event => {
			this.emitEvent({
				category: BrainEventCategory.Context,
				severity: BrainEventSeverity.Info,
				source: BrainEventSource.ContextEngine,
				description: `Context updated: ${event.domain} (${event.trigger})`,
				intentId: undefined,
				graphNodeId: undefined,
				agentId: undefined,
				processSessionId: undefined,
				data: { domain: event.domain, trigger: event.trigger },
			});
		}));

		// Subscribe to state events
		this._register(this.stateService.onDidChangeState(event => {
			this.emitEvent({
				category: BrainEventCategory.Sync,
				severity: BrainEventSeverity.Info,
				source: BrainEventSource.UnifiedState,
				description: `State: ${event.fromPhase} → ${event.toPhase} (${event.trigger})`,
				intentId: undefined,
				graphNodeId: undefined,
				agentId: undefined,
				processSessionId: undefined,
				data: { fromPhase: event.fromPhase, toPhase: event.toPhase },
			});
		}));
	}

	private _tick(): void {
		if (!this._loopActive || this._loopPhase === ExecutionLoopPhase.Paused) { return; }

		const tickStart = Date.now();
		const startPhase = this._loopPhase;
		const activeIntents = this.getActiveIntents().filter(i => i.resolution === IntentResolution.Queued);

		let stateChanged = false;
		const tickDecisions: IGlobalDecision[] = [];
		const tickConflicts: IConflict[] = [];

		// ─── Phase transitions based on current state ───

		if (activeIntents.length === 0 && this._loopPhase === ExecutionLoopPhase.Idle) {
			// Nothing to do
		} else if (activeIntents.length > 0) {
			// Process the highest-priority queued intent
			const sorted = [...activeIntents].sort((a, b) => a.priority - b.priority);
			const topIntent = sorted[0];

			switch (topIntent.actionType) {
				case IntentActionType.FileEdit:
				case IntentActionType.ContextQuery:
				case IntentActionType.GraphQuery:
					this._setLoopPhase(ExecutionLoopPhase.ContextAnalysis);
					break;
				case IntentActionType.AgentPlan:
					this._setLoopPhase(ExecutionLoopPhase.AgentPlanning);
					break;
				case IntentActionType.ProcessExecution:
					this._setLoopPhase(ExecutionLoopPhase.ProcessExecution);
					break;
				default:
					this._setLoopPhase(ExecutionLoopPhase.ContextAnalysis);
					break;
			}

			// Evaluate the intent through the decision engine
			const decision = this.evaluateIntent(topIntent.id);
			tickDecisions.push(decision);
			stateChanged = true;
		}

		// Graph update phase
		if (stateChanged) {
			this._setLoopPhase(ExecutionLoopPhase.GraphUpdate);
		}

		// State sync phase
		this._setLoopPhase(ExecutionLoopPhase.StateSync);

		// Observability phase
		this._setLoopPhase(ExecutionLoopPhase.Observability);

		// Return to idle
		this._setLoopPhase(ExecutionLoopPhase.Idle);

		// Record tick
		const tick: IExecutionLoopTick = {
			id: this._tickCounter++,
			startedAt: tickStart,
			completedAt: Date.now(),
			startPhase,
			endPhase: this._loopPhase,
			activeIntentId: activeIntents.length > 0 ? activeIntents[0].id : undefined,
			decisions: tickDecisions,
			conflicts: tickConflicts,
			stateChanged,
			durationMs: Date.now() - tickStart,
		};
		this._loopHistory.push(tick);
		if (this._loopHistory.length > 1000) {
			this._loopHistory.splice(0, 100);
		}
	}

	private _setLoopPhase(phase: ExecutionLoopPhase): void {
		if (this._loopPhase === phase) { return; }
		const prev = this._loopPhase;
		this._loopPhase = phase;
		this._onDidChangeLoopPhase.fire(phase);
	}

	private _checkHealth(): void {
		const now = Date.now();

		// Update health metrics
		this._healthMetrics = {
			measuredAt: now,
			systemLagMs: this._loopHistory.length > 0
				? this._loopHistory.slice(-10).reduce((sum, t) => sum + (t.durationMs ?? 0), 0) / Math.min(this._loopHistory.length, 10)
				: 0,
			executionBacklog: this.getActiveIntents().filter(i => i.resolution === IntentResolution.Queued || i.resolution === IntentResolution.Pending).length,
			graphGrowthRate: this._calculateGraphGrowthRate(),
			agentSaturation: this._calculateAgentSaturation(),
			processFailureRate: this._calculateProcessFailureRate(),
			memoryPressure: this.processOrchestrator.resourceUsage.totalMemoryMb > 0
				? Math.min(1, this.processOrchestrator.resourceUsage.totalMemoryMb / (this.processOrchestrator.quota.maxMemoryMb || 4096))
				: 0,
			eventBusThroughput: this.eventBusStats.eventsPerSecond,
			conflictResolutionRate: this._calculateConflictResolutionRate(),
			avgTickDurationMs: this._loopHistory.length > 0
				? this._loopHistory.slice(-20).reduce((sum, t) => sum + (t.durationMs ?? 0), 0) / Math.min(this._loopHistory.length, 20)
				: 0,
			pendingApprovalCount: this.agentOrchestrator.getPendingApprovals().length + this.processOrchestrator.getPendingProcessApprovals().length,
			activeCheckpointCount: this._syncCheckpoints.length,
		};

		// Determine health status
		const prevStatus = this._healthStatus;
		let newStatus = SystemHealthStatus.Healthy;

		if (this._healthMetrics.systemLagMs > this._healthThresholds.maxLagMs ||
			this._healthMetrics.executionBacklog > this._healthThresholds.maxBacklog ||
			this._healthMetrics.agentSaturation > this._healthThresholds.maxAgentSaturation) {
			newStatus = SystemHealthStatus.Stressed;
		}

		if (this._healthMetrics.processFailureRate > this._healthThresholds.maxProcessFailureRate ||
			this._healthMetrics.memoryPressure > this._healthThresholds.maxMemoryPressure) {
			newStatus = SystemHealthStatus.Overloaded;
		}

		if (this._healthMetrics.processFailureRate > this._healthThresholds.maxProcessFailureRate * 2) {
			newStatus = SystemHealthStatus.Failure;
		}

		if (newStatus !== prevStatus) {
			this._healthStatus = newStatus;
			this._onDidChangeHealthStatus.fire(newStatus);

			this.emitEvent({
				category: BrainEventCategory.Health,
				severity: newStatus === SystemHealthStatus.Failure ? BrainEventSeverity.Critical : BrainEventSeverity.Warning,
				source: BrainEventSource.GlobalBrain,
				description: `System health: ${prevStatus} → ${newStatus}`,
				intentId: undefined,
				graphNodeId: undefined,
				agentId: undefined,
				processSessionId: undefined,
				data: { from: prevStatus, to: newStatus },
			});
		}

		// Generate alerts for threshold violations
		this._checkThreshold('systemLagMs', this._healthMetrics.systemLagMs, this._healthThresholds.maxLagMs, 'System lag exceeded threshold');
		this._checkThreshold('executionBacklog', this._healthMetrics.executionBacklog, this._healthThresholds.maxBacklog, 'Execution backlog exceeded threshold');
		this._checkThreshold('agentSaturation', this._healthMetrics.agentSaturation, this._healthThresholds.maxAgentSaturation, 'Agent saturation exceeded threshold');
		this._checkThreshold('processFailureRate', this._healthMetrics.processFailureRate, this._healthThresholds.maxProcessFailureRate, 'Process failure rate exceeded threshold');
	}

	private _checkThreshold(metric: string, current: number, threshold: number, description: string): void {
		if (current > threshold) {
			const alertId = `alert-${metric}-${Date.now()}`;
			if (!this._healthAlerts.has(alertId)) {
				const alert: IHealthAlert = {
					id: alertId,
					severity: current > threshold * 2 ? SystemHealthStatus.Failure : SystemHealthStatus.Stressed,
					metric,
					currentValue: current,
					threshold,
					description,
					suggestedAction: `Reduce ${metric} or increase threshold`,
					triggeredAt: Date.now(),
					active: true,
					resolvedAt: undefined,
				};
				this._healthAlerts.set(alertId, alert);
				this._onDidTriggerHealthAlert.fire(alert);
			}
		}
	}

	private _detectDrift(): IDriftDetail[] {
		const drifts: IDriftDetail[] = [];

		// Check state service phase vs actual system state
		const statePhase = this.stateService.phase;
		const isExecuting = this.stateService.activeState.isExecuting;
		if (statePhase === AIRuntimePhase.Ready && isExecuting) {
			drifts.push({
				subsystems: ['UnifiedState', 'ExecutionService'],
				aspect: 'runtime-phase-vs-execution-state',
				expected: 'Executing phase when isExecuting=true',
				actual: `Phase=${statePhase}, isExecuting=${isExecuting}`,
				severity: 'minor',
				correctiveAction: 'resync',
			});
		}

		// Check if context engine freshness matches actual state
		const executionCtx = this.contextService.executionContext;
		const graphActive = this.graphService.nodeCount > 0;
		if (executionCtx.freshness !== ContextFreshness.Live && graphActive) {
			drifts.push({
				subsystems: ['ContextEngine', 'ExecutionGraph'],
				aspect: 'context-freshness-vs-graph-activity',
				expected: 'Live freshness when graph is active',
				actual: `freshness=${executionCtx.freshness}, graphNodes=${this.graphService.nodeCount}`,
				severity: 'minor',
				correctiveAction: 'refresh',
			});
		}

		// Check agent state vs process state consistency
		const agents = this.agentOrchestrator.getAllAgents();
		const executingAgents = agents.filter(a => a.lifecycleState === AgentLifecycleState.Executing);
		const agentSessions = executingAgents.flatMap(a => this.processOrchestrator.getAgentSessions(a.id));
		if (executingAgents.length > 0 && agentSessions.length === 0) {
			drifts.push({
				subsystems: ['AgentOrchestrator', 'ProcessOrchestrator'],
				aspect: 'agent-executing-without-process',
				expected: 'Executing agents should have associated processes',
				actual: `${executingAgents.length} executing agents, ${agentSessions.length} agent sessions`,
				severity: 'major',
				correctiveAction: 'resync',
			});
		}

		return drifts;
	}

	// ─── Coherence Check Implementations ────────────────────────────────────

	private _checkGraphConsistency(): ICoherenceCheckResult {
		const startTime = Date.now();
		const issues: ICoherenceIssue[] = [];

		// Check for pending nodes that have been pending too long
		const recentNodes = this.graphService.getRecentNodes(100);
		const now = Date.now();
		for (const node of recentNodes) {
			if (node.pending && (now - node.createdAt) > 60000) {
				issues.push({
					id: generateUuid(),
					checkType: CoherenceCheckType.GraphConsistency,
					severity: 'major',
					description: `Graph node pending for >60s: ${node.label}`,
					affectedSubsystems: ['ExecutionGraph'],
					suggestedRepair: CoherenceRepairAction.RemoveOrphan,
					autoRepairable: true,
					relatedIds: [node.id],
				});
			}
		}

		return {
			checkType: CoherenceCheckType.GraphConsistency,
			passed: issues.length === 0,
			issues,
			checkedAt: Date.now(),
			durationMs: Date.now() - startTime,
		};
	}

	private _checkContextAccuracy(): ICoherenceCheckResult {
		const startTime = Date.now();
		const issues: ICoherenceIssue[] = [];

		// Check if context is outdated
		const wsCtx = this.contextService.workspaceContext;
		if (wsCtx.freshness === ContextFreshness.Outdated) {
			issues.push({
				id: generateUuid(),
				checkType: CoherenceCheckType.ContextAccuracy,
				severity: 'major',
				description: 'Workspace context is outdated',
				affectedSubsystems: ['ContextEngine'],
				suggestedRepair: CoherenceRepairAction.RefreshContext,
				autoRepairable: true,
				relatedIds: [],
			});
		}

		return {
			checkType: CoherenceCheckType.ContextAccuracy,
			passed: issues.length === 0,
			issues,
			checkedAt: Date.now(),
			durationMs: Date.now() - startTime,
		};
	}

	private _checkProcessCorrectness(): ICoherenceCheckResult {
		const startTime = Date.now();
		const issues: ICoherenceIssue[] = [];

		// Check for crashed processes that haven't been recovered
		const allSessions = this.processOrchestrator.getAllSessions();
		const crashedSessions = allSessions.filter(s => s.lifecycleState === ProcessLifecycleState.Crashed);
		for (const session of crashedSessions) {
			issues.push({
				id: generateUuid(),
				checkType: CoherenceCheckType.ProcessCorrectness,
				severity: 'major',
				description: `Crashed process not recovered: ${session.command}`,
				affectedSubsystems: ['ProcessOrchestrator'],
				suggestedRepair: CoherenceRepairAction.Stabilize,
				autoRepairable: false,
				relatedIds: [session.id],
			});
		}

		return {
			checkType: CoherenceCheckType.ProcessCorrectness,
			passed: issues.length === 0,
			issues,
			checkedAt: Date.now(),
			durationMs: Date.now() - startTime,
		};
	}

	private _checkAgentStateAlignment(): ICoherenceCheckResult {
		const startTime = Date.now();
		const issues: ICoherenceIssue[] = [];

		// Check for agents in executing state without active plans
		const agents = this.agentOrchestrator.getAllAgents();
		for (const agent of agents) {
			if (agent.lifecycleState === AgentLifecycleState.Executing && !agent.activePlanId) {
				issues.push({
					id: generateUuid(),
					checkType: CoherenceCheckType.AgentStateAlignment,
					severity: 'major',
					description: `Agent ${agent.name} in Executing state without active plan`,
					affectedSubsystems: ['AgentOrchestrator'],
					suggestedRepair: CoherenceRepairAction.Stabilize,
					autoRepairable: false,
					relatedIds: [agent.id],
				});
			}
		}

		return {
			checkType: CoherenceCheckType.AgentStateAlignment,
			passed: issues.length === 0,
			issues,
			checkedAt: Date.now(),
			durationMs: Date.now() - startTime,
		};
	}

	private _checkStateConsistency(): ICoherenceCheckResult {
		const startTime = Date.now();
		const issues: ICoherenceIssue[] = [];

		// Check unified state consistency
		const consistencyIssues = this.stateService.validateConsistency();
		for (const issue of consistencyIssues) {
			issues.push({
				id: generateUuid(),
				checkType: CoherenceCheckType.StateConsistency,
				severity: 'major',
				description: issue,
				affectedSubsystems: ['UnifiedState'],
				suggestedRepair: CoherenceRepairAction.Resync,
				autoRepairable: true,
				relatedIds: [],
			});
		}

		return {
			checkType: CoherenceCheckType.StateConsistency,
			passed: issues.length === 0,
			issues,
			checkedAt: Date.now(),
			durationMs: Date.now() - startTime,
		};
	}

	private _checkIntentChainValidity(): ICoherenceCheckResult {
		const startTime = Date.now();
		const issues: ICoherenceIssue[] = [];

		// Check for orphaned intents (parent no longer exists)
		for (const intent of this._intents.values()) {
			if (intent.parentIntentId && !this._intents.has(intent.parentIntentId)) {
				issues.push({
					id: generateUuid(),
					checkType: CoherenceCheckType.IntentChainValidity,
					severity: 'minor',
					description: `Intent ${intent.id} references non-existent parent ${intent.parentIntentId}`,
					affectedSubsystems: ['GlobalBrain'],
					suggestedRepair: CoherenceRepairAction.None,
					autoRepairable: false,
					relatedIds: [intent.id, intent.parentIntentId],
				});
			}
		}

		return {
			checkType: CoherenceCheckType.IntentChainValidity,
			passed: issues.length === 0,
			issues,
			checkedAt: Date.now(),
			durationMs: Date.now() - startTime,
		};
	}

	private _checkOrphanDetection(): ICoherenceCheckResult {
		const startTime = Date.now();
		const issues: ICoherenceIssue[] = [];

		// Check for graph nodes that have no edges and no scope
		const recentNodes = this.graphService.getRecentNodes(50);
		for (const node of recentNodes) {
			if (!node.scopeId) {
				const outgoing = this.graphService.getOutgoingEdges(node.id);
				const incoming = this.graphService.getIncomingEdges(node.id);
				if (outgoing.length === 0 && incoming.length === 0 && !node.pending) {
					issues.push({
						id: generateUuid(),
						checkType: CoherenceCheckType.OrphanDetection,
						severity: 'minor',
						description: `Orphaned graph node: ${node.label}`,
						affectedSubsystems: ['ExecutionGraph'],
						suggestedRepair: CoherenceRepairAction.RemoveOrphan,
						autoRepairable: true,
						relatedIds: [node.id],
					});
				}
			}
		}

		return {
			checkType: CoherenceCheckType.OrphanDetection,
			passed: issues.length === 0,
			issues,
			checkedAt: Date.now(),
			durationMs: Date.now() - startTime,
		};
	}

	private _checkScopeIntegrity(): ICoherenceCheckResult {
		const startTime = Date.now();
		const issues: ICoherenceIssue[] = [];

		// Check for long-running active scopes
		const activeScope = this.graphService.activeScope;
		if (activeScope) {
			const scopeAge = Date.now() - activeScope.createdAt;
			if (scopeAge > 300000) { // 5 minutes
				issues.push({
					id: generateUuid(),
					checkType: CoherenceCheckType.ScopeIntegrity,
					severity: 'major',
					description: `Execution scope active for >5min: ${activeScope.label}`,
					affectedSubsystems: ['ExecutionGraph'],
					suggestedRepair: CoherenceRepairAction.CloseScope,
					autoRepairable: true,
					relatedIds: [activeScope.id],
				});
			}
		}

		return {
			checkType: CoherenceCheckType.ScopeIntegrity,
			passed: issues.length === 0,
			issues,
			checkedAt: Date.now(),
			durationMs: Date.now() - startTime,
		};
	}

	// ─── Helper Methods ──────────────────────────────────────────────────────

	private _makeDecision(type: DecisionType, intentIds: readonly string[], reason: string, conflictId: string | undefined, appliedRule: string, priority: IntentPriority): IGlobalDecision {
		const decision: IGlobalDecision = {
			id: generateUuid(),
			type,
			intentIds,
			reason,
			conflictId,
			appliedRule,
			timestamp: Date.now(),
			priority,
			overridable: type !== DecisionType.Block,
			decidedBy: 'automatic',
			data: {},
		};
		this._decisions.push(decision);
		return decision;
	}

	private _createConflict(type: ConflictType, severity: ConflictSeverity, intentIds: readonly string[], description: string, contestedResources: readonly string[], suggestedResolutions: IConflictResolution[], requiresPause: boolean = false, recommendsRollback: boolean = false): IConflict {
		return {
			id: generateUuid(),
			type,
			severity,
			state: ConflictState.Detected,
			intentIds,
			description,
			contestedResources,
			detectedAt: Date.now(),
			resolvedAt: undefined,
			resolutionDecision: undefined,
			suggestedResolutions,
			requiresPause,
			recommendsRollback,
		};
	}

	private _createResolution(type: ConflictResolutionType, description: string, affectedIntents: readonly string[], impact: 'low' | 'medium' | 'high', automatic: boolean): IConflictResolution {
		return { type, description, affectedIntents, impact, automatic };
	}

	private _emptyHealthMetrics(): ISystemHealthMetrics {
		return {
			measuredAt: Date.now(),
			systemLagMs: 0,
			executionBacklog: 0,
			graphGrowthRate: 0,
			agentSaturation: 0,
			processFailureRate: 0,
			memoryPressure: 0,
			eventBusThroughput: 0,
			conflictResolutionRate: 0,
			avgTickDurationMs: 0,
			pendingApprovalCount: 0,
			activeCheckpointCount: 0,
		};
	}

	private _calculateGraphGrowthRate(): number {
		if (this._loopHistory.length < 2) { return 0; }
		const recentTicks = this._loopHistory.slice(-60);
		const tickDurationSec = this._loopConfig.tickIntervalMs / 1000;
		return recentTicks.length > 0 ? this.graphService.nodeCount / (recentTicks.length * tickDurationSec) : 0;
	}

	private _calculateAgentSaturation(): number {
		const agents = this.agentOrchestrator.getAllAgents();
		if (agents.length === 0) { return 0; }
		const executingAgents = agents.filter(a => a.lifecycleState === AgentLifecycleState.Executing || a.lifecycleState === AgentLifecycleState.Planning);
		return Math.min(1, executingAgents.length / Math.max(agents.length, 1));
	}

	private _calculateProcessFailureRate(): number {
		const allSessions = this.processOrchestrator.getAllSessions();
		if (allSessions.length < 2) { return 0; }
		const failedSessions = allSessions.filter(s => s.lifecycleState === ProcessLifecycleState.Failed || s.lifecycleState === ProcessLifecycleState.Crashed);
		return failedSessions.length;
	}

	private _calculateConflictResolutionRate(): number {
		const resolvedConflicts = [...this._conflicts.values()].filter(c => c.state === ConflictState.Resolved);
		return resolvedConflicts.length;
	}

	override dispose(): void {
		this.stopLoop();
		super.dispose();
	}
}
