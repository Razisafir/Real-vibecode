/*---------------------------------------------------------------------------------------------
 *  Agent Orchestration System — Phase 7 Agent UI Layer
 *  Real Vibecode — AI-Native IDE
 *
 *  IAgentUIService — UI integration for the Agent Orchestration System.
 *  Provides interfaces for:
 *    - Agent Activity Panel
 *    - Plan Visualization View
 *    - Execution Step Timeline
 *    - Approval Queue UI
 *    - Suspended Tasks View
 *
 *  Integrates with:
 *    - ExecutionGraphService
 *    - ObservabilityService
 *    - AIContextService
 *    - AgentOrchestratorService
 *--------------------------------------------------------------------------------------------*/

import { Event } from '../../../../base/common/event.js';
import { IDisposable } from '../../../../base/common/lifecycle.js';
import { URI } from '../../../../base/common/uri.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { AgentLifecycleState, IAgent, IExecutionPlan, IPlanStep, IApprovalRequest, ApprovalResult, IAgentObservation, PlanStatus, StepStatus, IWatchdogStatus } from './agentOrchestratorService.js';

export const IAgentUIService = createDecorator<IAgentUIService>('agentUIService');

// ─── UI View Models ──────────────────────────────────────────────────────────

/**
 * View model for the Agent Activity Panel.
 * Shows a summary of all registered agents and their current state.
 */
export interface IAgentActivityViewModel {
	/** Agent ID */
	readonly agentId: string;
	/** Agent name */
	readonly name: string;
	/** Agent description */
	readonly description: string;
	/** Current lifecycle state */
	readonly lifecycleState: AgentLifecycleState;
	/** Active plan goal (if any) */
	readonly activePlanGoal: string | undefined;
	/** Number of completed plans */
	readonly completedPlanCount: number;
	/** Number of declared capabilities */
	readonly capabilityCount: number;
	/** Whether the agent has a suspended plan */
	readonly hasSuspendedPlan: boolean;
	/** Watchdog status summary */
	readonly watchdogSummary: string;
	/** Last activity timestamp */
	readonly lastActivityAt: number;
}

/**
 * View model for the Plan Visualization View.
 * Shows a plan's structure, step relationships, and execution progress.
 */
export interface IPlanVisualizationViewModel {
	/** Plan ID */
	readonly planId: string;
	/** Plan goal */
	readonly goal: string;
	/** Plan status */
	readonly status: PlanStatus;
	/** Agent name */
	readonly agentName: string;
	/** Step visualization nodes */
	readonly stepNodes: readonly IStepVisualizationNode[];
	/** Step dependency edges */
	readonly dependencyEdges: readonly IStepDependencyEdge[];
	/** Execution progress (0-1) */
	readonly progress: number;
	/** Total steps */
	readonly totalSteps: number;
	/** Completed steps */
	readonly completedSteps: number;
	/** Failed steps */
	readonly failedSteps: number;
	/** Execution duration so far */
	readonly elapsedMs: number;
	/** Maximum allowed duration */
	readonly maxDurationMs: number;
}

/**
 * A node in the plan visualization graph.
 */
export interface IStepVisualizationNode {
	/** Step ID */
	readonly stepId: string;
	/** Step label */
	readonly label: string;
	/** Step status */
	readonly status: StepStatus;
	/** Required capability */
	readonly capability: string;
	/** Whether approval is required */
	readonly requiresApproval: boolean;
	/** Number of retries */
	readonly retryCount: number;
	/** Error message (if failed) */
	readonly error: string | undefined;
	/** Position X for layout (UI can override) */
	readonly x: number;
	/** Position Y for layout (UI can override) */
	readonly y: number;
}

/**
 * An edge in the plan visualization showing step dependencies.
 */
export interface IStepDependencyEdge {
	/** Source step ID (dependency) */
	readonly fromStepId: string;
	/** Target step ID (dependent) */
	readonly toStepId: string;
}

/**
 * View model for the Execution Step Timeline.
 * Shows the chronological progression of step executions.
 */
export interface IStepTimelineViewModel {
	/** Plan ID */
	readonly planId: string;
	/** Plan goal */
	readonly goal: string;
	/** Timeline entries in chronological order */
	readonly entries: readonly IStepTimelineEntry[];
	/** Total duration */
	readonly totalDurationMs: number;
}

/**
 * A single entry in the execution timeline.
 */
export interface IStepTimelineEntry {
	/** Step ID */
	readonly stepId: string;
	/** Step label */
	readonly label: string;
	/** Status */
	readonly status: StepStatus;
	/** Start time (relative to plan start) */
	readonly startOffsetMs: number;
	/** Duration (if completed) */
	readonly durationMs: number | undefined;
	/** Error (if failed) */
	readonly error: string | undefined;
	/** Observations produced during this step */
	readonly observationCount: number;
	/** Files modified */
	readonly modifiedFileCount: number;
}

/**
 * View model for the Approval Queue.
 * Shows pending approval requests that require user action.
 */
export interface IApprovalQueueViewModel {
	/** Pending approval requests */
	readonly pendingRequests: readonly IApprovalRequestViewModel[];
	/** Total pending count */
	readonly pendingCount: number;
	/** Whether any require manual review */
	readonly hasManualReview: boolean;
}

/**
 * View model for a single approval request.
 */
export interface IApprovalRequestViewModel {
	/** Request ID */
	readonly requestId: string;
	/** Agent name */
	readonly agentName: string;
	/** Step description */
	readonly stepDescription: string;
	/** Capability being requested */
	readonly capability: string;
	/** Risk level */
	readonly riskLevel: string;
	/** Approval level */
	readonly approvalLevel: string;
	/** Affected files */
	readonly affectedFiles: readonly string[];
	/** Whether the action is reversible */
	readonly reversible: boolean;
	/** Time waiting for approval */
	readonly waitingMs: number;
}

/**
 * View model for the Suspended Tasks view.
 * Shows plans that are suspended and can be resumed.
 */
export interface ISuspendedTasksViewModel {
	/** Suspended plan entries */
	readonly entries: readonly ISuspendedTaskEntry[];
	/** Total count */
	readonly count: number;
}

/**
 * A single suspended plan entry.
 */
export interface ISuspendedTaskEntry {
	/** Plan ID */
	readonly planId: string;
	/** Plan goal */
	readonly goal: string;
	/** Agent name */
	readonly agentName: string;
	/** When the plan was suspended */
	readonly suspendedAt: number;
	/** Number of completed steps when suspended */
	readonly completedStepsWhenSuspended: number;
	/** Total steps */
	readonly totalSteps: number;
	/** Whether all steps have resumable checkpoints */
	readonly allStepsResumable: boolean;
}

// ─── Service Interface ────────────────────────────────────────────────────────

/**
 * IAgentUIService — UI integration for the Agent Orchestration System.
 *
 * Phase 7 implements:
 *   - Agent Activity Panel view models
 *   - Plan Visualization View with dependency graphs
 *   - Execution Step Timeline
 *   - Approval Queue UI
 *   - Suspended Tasks View
 *
 * All view models are READ-ONLY — the UI never directly modifies agent state.
 * All mutations route through AgentOrchestratorService.
 */
export interface IAgentUIService {
	readonly _serviceBrand: undefined;

	// ─── Agent Activity Panel ────────────────────────────────────────────────

	/**
	 * Get view models for all registered agents.
	 */
	getAgentActivityViewModels(): readonly IAgentActivityViewModel[];

	/**
	 * Get view model for a specific agent.
	 */
	getAgentActivityViewModel(agentId: string): IAgentActivityViewModel | undefined;

	/**
	 * Event that fires when agent activity view models should be refreshed.
	 */
	readonly onDidUpdateAgentActivity: Event<void>;

	// ─── Plan Visualization ──────────────────────────────────────────────────

	/**
	 * Get the plan visualization view model.
	 * Includes step nodes with positions and dependency edges.
	 */
	getPlanVisualization(planId: string): IPlanVisualizationViewModel | undefined;

	/**
	 * Event that fires when plan visualization should be refreshed.
	 */
	readonly onDidUpdatePlanVisualization: Event<string>;

	// ─── Execution Step Timeline ─────────────────────────────────────────────

	/**
	 * Get the step timeline for a plan.
	 */
	getStepTimeline(planId: string): IStepTimelineViewModel | undefined;

	/**
	 * Event that fires when step timeline should be refreshed.
	 */
	readonly onDidUpdateStepTimeline: Event<string>;

	// ─── Approval Queue ──────────────────────────────────────────────────────

	/**
	 * Get the current approval queue view model.
	 */
	getApprovalQueue(): IApprovalQueueViewModel;

	/**
	 * Approve a pending request.
	 */
	approveRequest(requestId: string): void;

	/**
	 * Deny a pending request.
	 */
	denyRequest(requestId: string, reason?: string): void;

	/**
	 * Event that fires when the approval queue changes.
	 */
	readonly onDidUpdateApprovalQueue: Event<void>;

	// ─── Suspended Tasks ─────────────────────────────────────────────────────

	/**
	 * Get the suspended tasks view model.
	 */
	getSuspendedTasks(): ISuspendedTasksViewModel;

	/**
	 * Resume a suspended plan.
	 */
	resumeSuspendedPlan(planId: string): Promise<void>;

	/**
	 * Event that fires when the suspended tasks view should be refreshed.
	 */
	readonly onDidUpdateSuspendedTasks: Event<void>;
}
