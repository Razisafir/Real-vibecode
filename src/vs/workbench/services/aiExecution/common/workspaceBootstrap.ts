/*---------------------------------------------------------------------------------------------
 *  AI Execution Kernel — Phase 5 Workspace Bootstrap Sequence
 *  Real Vibecode — AI-Native IDE
 *
 *  IWorkspaceBootstrapService — Deterministic initialization orchestration.
 *  Ensures all AI kernel subsystems initialize in the correct order
 *  with no race conditions and full startup lifecycle tracking.
 *
 *  Initialization Order:
 *    1. App Start → Workbench Init
 *    2. AIUnifiedStateService Init (phase: Uninitialized → Hydrating)
 *    3. ExecutionGraphService Init (load persisted graph)
 *    4. AIExecutionService Init (wire up dependencies)
 *    5. AIExecutionUIService Init (wire up UI observables)
 *    6. Context Hydration (restore active scopes, pending nodes)
 *    7. UI Shell Ready (panels registered, indicators visible)
 *    8. State → Ready (user interaction enabled)
 *--------------------------------------------------------------------------------------------*/

import { Event } from '../../../../base/common/event.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { AIRuntimePhase } from './aiUnifiedStateService.js';

export const IWorkspaceBootstrapService = createDecorator<IWorkspaceBootstrapService>('workspaceBootstrapService');

// ─── Bootstrap Step ────────────────────────────────────────────────────────────

/**
 * A single step in the bootstrap sequence.
 * Each step has a name, a target phase, and success/failure tracking.
 */
export interface IBootstrapStep {
	/** Unique step identifier */
	readonly id: string;
	/** Human-readable step name */
	readonly label: string;
	/** The phase the system should be in when this step runs */
	readonly expectedPhase: AIRuntimePhase;
	/** The phase the system transitions to when this step completes */
	readonly targetPhase: AIRuntimePhase;
	/** Whether this step has completed */
	readonly completed: boolean;
	/** Whether this step succeeded */
	readonly success: boolean;
	/** Error message if the step failed */
	readonly error: string | undefined;
	/** Timestamp when the step started */
	readonly startedAt: number | undefined;
	/** Timestamp when the step completed */
	readonly completedAt: number | undefined;
	/** Duration in ms */
	readonly duration: number | undefined;
}

// ─── Bootstrap Result ──────────────────────────────────────────────────────────

/**
 * Result of the entire bootstrap sequence.
 */
export interface IBootstrapResult {
	/** Whether the entire sequence succeeded */
	readonly success: boolean;
	/** Total time in ms */
	readonly totalDuration: number;
	/** Individual step results */
	readonly steps: IBootstrapStep[];
	/** The final phase after bootstrap */
	readonly finalPhase: AIRuntimePhase;
	/** Any warnings encountered */
	readonly warnings: string[];
	/** Any errors encountered */
	readonly errors: string[];
}

// ─── Service Interface ─────────────────────────────────────────────────────────

/**
 * IWorkspaceBootstrapService — Orchestrates deterministic startup.
 *
 * Guarantees:
 *   1. Steps execute in strict order — no parallelism in bootstrap
 *   2. Each step validates the current phase before running
 *   3. A step failure stops the entire sequence
 *   4. Graph service is ready BEFORE any mutations can begin
 *   5. UI is not shown until the kernel is in Ready phase
 *
 * Phase 5 implements:
 *   - Sequential step execution
 *   - Phase-gated step validation
 *   - Progress events for splash screen / loading indicator
 *   - Failure recovery (retry or graceful degradation)
 */
export interface IWorkspaceBootstrapService {
	readonly _serviceBrand: undefined;

	/**
	 * Run the full bootstrap sequence.
	 * Must be called exactly once during application startup.
	 *
	 * @returns The bootstrap result
	 */
	runBootstrap(): Promise<IBootstrapResult>;

	/**
	 * Whether the bootstrap has completed (successfully or not).
	 */
	readonly bootstrapped: boolean;

	/**
	 * The bootstrap result, if available.
	 */
	readonly result: IBootstrapResult | undefined;

	/**
	 * Event that fires when a bootstrap step completes.
	 * Can be used for progress indicators.
	 */
	readonly onDidCompleteStep: Event<IBootstrapStep>;

	/**
	 * Event that fires when the entire bootstrap is done.
	 */
	readonly onDidBootstrap: Event<IBootstrapResult>;

	/**
	 * Get all bootstrap steps (including pending ones).
	 */
	readonly steps: IBootstrapStep[];
}
