/*---------------------------------------------------------------------------------------------
 *  Unified Execution Simulation & Replay Engine — Phase 11
 *  Real Vibecode — AI-Native IDE
 *
 *  IExecutionReplayService — A read-only deterministic mirror of the entire system.
 *  Allows replay, simulation, reconstruction, and debugging of any execution
 *  without side effects on the live runtime.
 *
 *  HARD RULES:
 *    1. MUST NOT execute real mutations
 *    2. MUST NOT interfere with runtime systems
 *    3. ONLY observe, reconstruct, simulate
 *    4. Same snapshot + same intent → same output (STRICT mode)
 *    5. Agents/processes MUST NOT execute real actions during replay
 *    6. Timeline MUST reconstruct full intent chain
 *    7. Causal chain MUST NOT break during reconstruction
 *    8. Snapshots MUST be timestamped, immutable, diffable
 *
 *  Connected Systems (READ-ONLY):
 *    - ExecutionGraphService  (graph nodes, edges, scopes)
 *    - AIExecutionService     (mutation records, policy decisions)
 *    - AgentOrchestratorService (agent states, execution plans)
 *    - AIProcessOrchestratorService (process sessions, outputs)
 *    - AIContextService       (context snapshots, domain state)
 *    - GlobalExecutionBrainService (intents, decisions, events)
 *    - UnifiedStateService    (state transitions)
 *    - ObservabilityService   (trace logs)
 *    - SystemStabilizationService (stability state, diagnostics)
 *--------------------------------------------------------------------------------------------*/

import { Event } from '../../../../base/common/event.js';
import { IDisposable } from '../../../../base/common/lifecycle.js';
import { URI } from '../../../../base/common/uri.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import {
	IIntent, IntentSource, IntentPriority, IntentScope, IntentResolution,
	IntentActionType, IGlobalDecision, DecisionType, IBrainEvent,
	BrainEventCategory, BrainEventSource, BrainEventSeverity,
	ConflictType, IConflict, ISyncCheckpoint,
	ExecutionLoopPhase, ISystemHealthMetrics, SystemHealthStatus,
} from './globalExecutionBrain.js';
import {
	SystemStabilityState, ILoadMetrics, BackpressureLevel,
	MemoryPressureLevel,
} from './systemStabilization.js';
import { IExecutionNode, ExecutionNodeType } from './executionGraphService.js';
import { AIMutationSource } from './aiExecutionService.js';
import { AIRuntimePhase } from './aiUnifiedStateService.js';

export const IExecutionReplayService = createDecorator<IExecutionReplayService>('executionReplayService');

// ═══════════════════════════════════════════════════════════════════════════════
// TASK 4 — DETERMINISTIC REPLAY MODE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Replay mode — controls how strictly the replay adheres to determinism.
 */
export const enum ReplayMode {
	/** STRICT: same snapshot + same intent → same output. No approximation. */
	Strict = 'strict',
	/** APPROXIMATE: allows non-deterministic outcomes for timing-sensitive operations. */
	Approximate = 'approximate',
}

/**
 * A deterministic seed for replay. In STRICT mode, the same seed must
 * produce the same outcome for the same input.
 */
export interface IReplaySeed {
	/** Unique seed ID */
	readonly id: string;
	/** The numeric seed value */
	readonly value: number;
	/** The snapshot ID this seed is based on */
	readonly snapshotId: string;
	/** Timestamp when the seed was created */
	readonly createdAt: number;
	/** Description of what this seed controls */
	readonly description: string;
}

/**
 * Result of a deterministic replay check.
 */
export interface IDeterministicReplayResult {
	/** Whether the replay was deterministic */
	readonly deterministic: boolean;
	/** The replay mode used */
	readonly mode: ReplayMode;
	/** The seed used for the replay */
	readonly seed: IReplaySeed;
	/** Any divergence detected (empty if deterministic) */
	readonly divergences: readonly IReplayDivergence[];
	/** Duration of the replay in ms */
	readonly durationMs: number;
}

/**
 * A divergence detected during replay — when the replay result
 * differs from the originally recorded outcome.
 */
export interface IReplayDivergence {
	/** What diverged */
	readonly aspect: string;
	/** Expected value (from the original execution) */
	readonly expected: string;
	/** Actual value (from the replay) */
	readonly actual: string;
	/** The timestamp in the replay where divergence occurred */
	readonly replayTimestamp: number;
	/** The causal chain that led to divergence */
	readonly causalChain: readonly string[];
	/** Severity of the divergence */
	readonly severity: 'minor' | 'major' | 'critical';
}

// ═══════════════════════════════════════════════════════════════════════════════
// TASK 2 — SYSTEM SNAPSHOT MODEL
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Layers in a system snapshot. Each layer captures one subsystem's state.
 */
export const enum SnapshotLayer {
	/** Execution graph state (nodes, edges, scopes) */
	Graph = 'graph',
	/** Context engine state (domains, freshness, symbols) */
	Context = 'context',
	/** Agent state (lifecycle, plans, capabilities) */
	Agent = 'agent',
	/** Process state (sessions, outputs, policies) */
	Process = 'process',
	/** Intent state (active, resolved, chains) */
	Intent = 'intent',
	/** Global brain state (decisions, conflicts, health) */
	Brain = 'brain',
}

/**
 * A point-in-time snapshot of the entire system.
 * Snapshots are:
 *   - Timestamped (when they were taken)
 *   - Immutable (never modified after creation)
 *   - Diffable (can compare two snapshots)
 */
export interface ISystemSnapshot {
	/** Unique snapshot ID */
	readonly id: string;
	/** Timestamp when the snapshot was taken */
	readonly timestamp: number;
	/** Human-readable label for this snapshot */
	readonly label: string;
	/** Which layers are included in this snapshot */
	readonly layers: readonly SnapshotLayer[];
	/** Graph layer data */
	readonly graphLayer: IGraphSnapshotLayer | undefined;
	/** Context layer data */
	readonly contextLayer: IContextSnapshotLayer | undefined;
	/** Agent layer data */
	readonly agentLayer: IAgentSnapshotLayer | undefined;
	/** Process layer data */
	readonly processLayer: IProcessSnapshotLayer | undefined;
	/** Intent layer data */
	readonly intentLayer: IIntentSnapshotLayer | undefined;
	/** Brain layer data */
	readonly brainLayer: IBrainSnapshotLayer | undefined;
	/** Runtime phase at snapshot time */
	readonly runtimePhase: AIRuntimePhase;
	/** Stability state at snapshot time */
	readonly stabilityState: SystemStabilityState;
	/** Whether this snapshot is complete (all layers captured) */
	readonly complete: boolean;
	/** Seed for deterministic replay from this snapshot */
	readonly replaySeed: IReplaySeed;
	/** Duration to capture this snapshot in ms */
	readonly captureDurationMs: number;
}

/**
 * Graph layer snapshot — execution graph state at a point in time.
 */
export interface IGraphSnapshotLayer {
	/** Total number of nodes */
	readonly nodeCount: number;
	/** Total number of edges */
	readonly edgeCount: number;
	/** Active scopes */
	readonly scopeCount: number;
	/** Node type distribution */
	readonly nodesByType: Readonly<Record<string, number>>;
	/** Recent node IDs (last 100) */
	readonly recentNodeIds: readonly string[];
	/** Pending node IDs */
	readonly pendingNodeIds: readonly string[];
	/** Rollback-capable node IDs */
	readonly rollbackCapableNodeIds: readonly string[];
}

/**
 * Context layer snapshot — context engine state at a point in time.
 */
export interface IContextSnapshotLayer {
	/** Number of context entries across all domains */
	readonly totalEntries: number;
	/** Entries by domain */
	readonly entriesByDomain: Readonly<Record<string, number>>;
	/** Freshness distribution */
	readonly freshnessDistribution: Readonly<Record<string, number>>;
	/** Number of tracked symbols */
	readonly symbolCount: number;
	/** Number of dependency edges */
	readonly dependencyEdgeCount: number;
	/** Hotspot count */
	readonly hotspotCount: number;
}

/**
 * Agent layer snapshot — agent orchestration state at a point in time.
 */
export interface IAgentSnapshotLayer {
	/** Number of active agents */
	readonly activeAgentCount: number;
	/** Agent states by lifecycle phase */
	readonly agentsByState: Readonly<Record<string, number>>;
	/** Number of active execution plans */
	readonly activePlanCount: number;
	/** Number of pending approvals */
	readonly pendingApprovalCount: number;
	/** Active agent IDs */
	readonly activeAgentIds: readonly string[];
	/** Capability usage count */
	readonly capabilityUsage: Readonly<Record<string, number>>;
}

/**
 * Process layer snapshot — process orchestration state at a point in time.
 */
export interface IProcessSnapshotLayer {
	/** Number of active process sessions */
	readonly activeSessionCount: number;
	/** Sessions by execution mode */
	readonly sessionsByMode: Readonly<Record<string, number>>;
	/** Sessions by lifecycle state */
	readonly sessionsByState: Readonly<Record<string, number>>;
	/** Active session IDs */
	readonly activeSessionIds: readonly string[];
	/** Total output chunks captured */
	readonly totalOutputChunks: number;
	/** Number of supervised processes */
	readonly supervisedCount: number;
}

/**
 * Intent layer snapshot — intent state at a point in time.
 */
export interface IIntentSnapshotLayer {
	/** Number of active intents */
	readonly activeIntentCount: number;
	/** Intents by resolution state */
	readonly intentsByResolution: Readonly<Record<string, number>>;
	/** Intents by source */
	readonly intentsBySource: Readonly<Record<string, number>>;
	/** Intents by action type */
	readonly intentsByActionType: Readonly<Record<string, number>>;
	/** Active intent IDs */
	readonly activeIntentIds: readonly string[];
	/** Intent chain depth (max chain length) */
	readonly maxChainDepth: number;
}

/**
 * Brain layer snapshot — global brain state at a point in time.
 */
export interface IBrainSnapshotLayer {
	/** Current execution loop phase */
	readonly loopPhase: ExecutionLoopPhase;
	/** Current health status */
	readonly healthStatus: SystemHealthStatus;
	/** Number of active decisions */
	readonly activeDecisionCount: number;
	/** Number of active conflicts */
	readonly activeConflictCount: number;
	/** Current sync checkpoint ID */
	readonly currentCheckpointId: string | undefined;
	/** Backpressure level */
	readonly backpressureLevel: BackpressureLevel;
	/** Event bus throughput (events/sec) */
	readonly eventBusThroughput: number;
	/** Tick number */
	readonly tickNumber: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// TASK 3 — EVENT TIMELINE ENGINE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Source system for a timeline event.
 */
export const enum TimelineEventSource {
	ExecutionGraph = 'execution-graph',
	ExecutionService = 'execution-service',
	AgentOrchestrator = 'agent-orchestrator',
	ProcessOrchestrator = 'process-orchestrator',
	ContextEngine = 'context-engine',
	GlobalBrain = 'global-brain',
	UnifiedState = 'unified-state',
	Stabilization = 'stabilization',
}

/**
 * Category of a timeline event.
 */
export const enum TimelineEventCategory {
	/** A mutation was applied or attempted */
	Mutation = 'mutation',
	/** An agent lifecycle event */
	AgentLifecycle = 'agent-lifecycle',
	/** A process lifecycle event */
	ProcessLifecycle = 'process-lifecycle',
	/** A context update event */
	ContextUpdate = 'context-update',
	/** A graph structure change */
	GraphChange = 'graph-change',
	/** A decision was made */
	Decision = 'decision',
	/** A conflict was detected or resolved */
	Conflict = 'conflict',
	/** A state transition occurred */
	StateTransition = 'state-transition',
	/** A health or stability event */
	HealthStability = 'health-stability',
	/** An intent lifecycle event */
	IntentLifecycle = 'intent-lifecycle',
}

/**
 * A unified timeline event — normalized from all subsystems.
 * Every event in the system is normalized into this format for
 * timeline construction, replay, and debugging.
 */
export interface IExecutionTimelineEvent {
	/** Unique event ID */
	readonly id: string;
	/** Timestamp (monotonic, ms since epoch) */
	readonly timestamp: number;
	/** Source system that produced this event */
	readonly source: TimelineEventSource;
	/** Event category */
	readonly category: TimelineEventCategory;
	/** Human-readable description */
	readonly description: string;
	/** Causality link — the event ID that caused this event (if any) */
	readonly causedByEventId: string | undefined;
	/** The intent ID this event is associated with */
	readonly intentId: string | undefined;
	/** The agent ID this event is associated with */
	readonly agentId: string | undefined;
	/** The process session ID this event is associated with */
	readonly processSessionId: string | undefined;
	/** The graph node ID this event is associated with */
	readonly graphNodeId: string | undefined;
	/** Additional data specific to the event */
	readonly data: Record<string, unknown>;
	/** Whether this event had side effects (mutations, state changes) */
	readonly hasSideEffects: boolean;
	/** The snapshot ID closest to this event's timestamp (if captured) */
	readonly nearestSnapshotId: string | undefined;
}

/**
 * A segment of the execution timeline between two points in time.
 */
export interface ITimelineSegment {
	/** Start timestamp */
	readonly fromTimestamp: number;
	/** End timestamp */
	readonly toTimestamp: number;
	/** Events in this segment, sorted by timestamp */
	readonly events: readonly IExecutionTimelineEvent[];
	/** Number of events in this segment */
	readonly eventCount: number;
	/** Number of unique intents in this segment */
	readonly intentCount: number;
	/** Number of unique agents active in this segment */
	readonly agentCount: number;
	/** Number of unique processes active in this segment */
	readonly processCount: number;
	/** Snapshot IDs within this segment */
	readonly snapshotIds: readonly string[];
}

/**
 * Filter for querying timeline events.
 */
export interface ITimelineFilter {
	/** Filter by source system */
	readonly sources?: readonly TimelineEventSource[];
	/** Filter by category */
	readonly categories?: readonly TimelineEventCategory[];
	/** Filter by intent ID */
	readonly intentId?: string;
	/** Filter by agent ID */
	readonly agentId?: string;
	/** Filter by process session ID */
	readonly processSessionId?: string;
	/** Filter by time range (from) */
	readonly fromTimestamp?: number;
	/** Filter by time range (to) */
	readonly toTimestamp?: number;
	/** Filter by whether event had side effects */
	readonly hasSideEffects?: boolean;
	/** Maximum number of events to return */
	readonly limit?: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// TASK 5 — SIMULATED AGENT ENGINE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Result of an agent simulation — what the agent would have decided
 * without actually executing anything.
 */
export interface IAgentSimulationResult {
	/** The agent ID being simulated */
	readonly agentId: string;
	/** The execution plan the agent would create */
	readonly simulatedPlan: ISimulatedPlan | undefined;
	/** The decisions the agent would make */
	readonly simulatedDecisions: readonly ISimulatedDecision[];
	/** Whether the agent would request approval */
	readonly wouldRequestApproval: boolean;
	/** Whether the agent would encounter a policy violation */
	readonly wouldViolatePolicy: boolean;
	/** Whether the agent would complete successfully */
	readonly wouldSucceed: boolean;
	/** Estimated execution time in ms */
	readonly estimatedDurationMs: number;
	/** Estimated number of file mutations */
	readonly estimatedMutationCount: number;
	/** Estimated resource impact */
	readonly estimatedImpact: 'low' | 'medium' | 'high';
	/** Whether this simulation is deterministic */
	readonly deterministic: boolean;
	/** The seed used for the simulation */
	readonly seed: IReplaySeed;
}

/**
 * A simulated execution plan — what an agent would plan
 * without actually creating or executing a real plan.
 */
export interface ISimulatedPlan {
	/** Number of steps the plan would contain */
	readonly stepCount: number;
	/** Step descriptions (what each step would do) */
	readonly stepDescriptions: readonly string[];
	/** Files that would be affected */
	readonly affectedFiles: readonly URI[];
	/** Capabilities that would be needed */
	readonly requiredCapabilities: readonly string[];
	/** Risk level of the simulated plan */
	readonly riskLevel: 'low' | 'medium' | 'high' | 'critical';
	/** Whether rollback would be possible */
	readonly rollbackPossible: boolean;
}

/**
 * A simulated decision — what an agent would decide at a decision point.
 */
export interface ISimulatedDecision {
	/** The decision point description */
	readonly decisionPoint: string;
	/** The choice the agent would make */
	readonly choice: string;
	/** The reasoning behind the choice */
	readonly reasoning: string;
	/** Confidence level (0–1) */
	readonly confidence: number;
	/** Alternative choices considered */
	readonly alternatives: readonly string[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// TASK 6 — PROCESS SIMULATION LAYER
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Result of a process simulation — what a process would have done
 * without actually spawning it.
 */
export interface IProcessSimulationResult {
	/** The simulated process session ID */
	readonly sessionId: string;
	/** The command that would be executed */
	readonly command: string;
	/** Simulated exit code */
	readonly simulatedExitCode: number;
	/** Simulated output chunks */
	readonly simulatedOutput: readonly ISimulatedOutputChunk[];
	/** Simulated lifecycle transitions */
	readonly simulatedLifecycle: readonly ISimulatedLifecycleTransition[];
	/** Whether the process would succeed */
	readonly wouldSucceed: boolean;
	/** Simulated execution duration in ms */
	readonly simulatedDurationMs: number;
	/** Failure paths that could occur */
	readonly possibleFailurePaths: readonly ISimulatedFailurePath[];
	/** Whether restart would be triggered */
	readonly wouldTriggerRestart: boolean;
	/** Whether this simulation is deterministic */
	readonly deterministic: boolean;
	/** The seed used */
	readonly seed: IReplaySeed;
}

/**
 * A simulated output chunk — what a process would output
 * without actually running.
 */
export interface ISimulatedOutputChunk {
	/** The output text */
	readonly text: string;
	/** The stream channel */
	readonly channel: 'stdout' | 'stderr' | 'control';
	/** Timestamp within the simulation */
	readonly simulatedTimestamp: number;
	/** Classification */
	readonly classification: string;
}

/**
 * A simulated lifecycle transition.
 */
export interface ISimulatedLifecycleTransition {
	/** From state */
	readonly from: string;
	/** To state */
	readonly to: string;
	/** Timestamp within the simulation */
	readonly simulatedTimestamp: number;
	/** Reason for transition */
	readonly reason: string;
}

/**
 * A possible failure path during process execution.
 */
export interface ISimulatedFailurePath {
	/** Description of the failure */
	readonly description: string;
	/** The exit code that would occur */
	readonly exitCode: number;
	/** The output that would be produced */
	readonly output: string;
	/** Whether the restart policy would handle this */
	readonly handledByRestartPolicy: boolean;
	/** Probability of this failure path (0–1) */
	readonly probability: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// TASK 7 — STATE RECONSTRUCTION ENGINE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Result of a state reconstruction at time T.
 */
export interface IStateReconstructionResult {
	/** The target timestamp */
	readonly targetTimestamp: number;
	/** The closest snapshot before the target time */
	readonly baseSnapshotId: string;
	/** Events that occurred between the snapshot and the target time */
	readonly replayedEvents: readonly IExecutionTimelineEvent[];
	/** The reconstructed snapshot at time T */
	readonly reconstructedSnapshot: ISystemSnapshot;
	/** Whether reconstruction was exact (from a captured snapshot) */
	readonly exact: boolean;
	/** Number of events replayed to reach the target state */
	readonly eventsReplayed: number;
	/** Duration of reconstruction in ms */
	readonly reconstructionDurationMs: number;
	/** Whether the reconstruction is complete (all layers) */
	readonly complete: boolean;
	/** Missing data (layers or events that could not be reconstructed) */
	readonly missingData: readonly IReconstructionGap[];
}

/**
 * A gap in reconstruction — data that could not be reconstructed.
 */
export interface IReconstructionGap {
	/** Which layer has the gap */
	readonly layer: SnapshotLayer;
	/** What is missing */
	readonly description: string;
	/** The time range affected */
	readonly fromTimestamp: number;
	readonly toTimestamp: number;
	/** Whether the gap can be approximated */
	readonly approximable: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════════
// TASK 8 — DIFFERENTIAL ANALYSIS ENGINE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Result of comparing two snapshots.
 */
export interface ISnapshotDiff {
	/** Snapshot A (earlier) */
	readonly snapshotAId: string;
	/** Snapshot B (later) */
	readonly snapshotBId: string;
	/** Timestamp of snapshot A */
	readonly timestampA: number;
	/** Timestamp of snapshot B */
	readonly timestampB: number;
	/** Changes detected between the two snapshots */
	readonly changes: readonly ISnapshotChange[];
	/** Number of changes */
	readonly changeCount: number;
	/** Changes by layer */
	readonly changesByLayer: Readonly<Record<string, number>>;
	/** Changes by severity */
	readonly changesBySeverity: Readonly<Record<string, number>>;
	/** Causal chains that explain the changes */
	readonly causalChains: readonly ICausalChain[];
	/** Whether the changes were expected based on the intents */
	readonly changesExpected: boolean;
	/** Unexpected changes */
	readonly unexpectedChanges: readonly ISnapshotChange[];
}

/**
 * A change between two snapshots.
 */
export interface ISnapshotChange {
	/** Which layer changed */
	readonly layer: SnapshotLayer;
	/** What aspect changed */
	readonly aspect: string;
	/** Value in snapshot A */
	readonly valueA: string;
	/** Value in snapshot B */
	readonly valueB: string;
	/** Whether the change is an addition (A has no value) */
	readonly isAddition: boolean;
	/** Whether the change is a removal (B has no value) */
	readonly isRemoval: boolean;
	/** The intent that caused this change (if traceable) */
	readonly causingIntentId: string | undefined;
	/** The event that caused this change (if traceable) */
	readonly causingEventId: string | undefined;
	/** Severity of the change */
	readonly severity: 'minor' | 'major' | 'critical';
	/** Whether the change was expected */
	readonly expected: boolean;
}

/**
 * A causal chain — explains why a series of changes occurred.
 */
export interface ICausalChain {
	/** The chain ID */
	readonly id: string;
	/** The root cause event */
	readonly rootCause: IExecutionTimelineEvent;
	/** The chain of events from root to effect */
	readonly chain: readonly IExecutionTimelineEvent[];
	/** The intents involved in this chain */
	readonly intentIds: readonly string[];
	/** The subsystems traversed by this chain */
	readonly subsystems: readonly string[];
	/** The final effect of this chain */
	readonly effect: string;
	/** Whether the chain is complete (no gaps) */
	readonly complete: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════════
// TASK 9 — EXECUTION DEBUG PROTOCOL
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * A debug session — a step-by-step replay of execution with inspection.
 */
export interface IDebugSession {
	/** Unique session ID */
	readonly id: string;
	/** The intent being debugged */
	readonly intentId: string | undefined;
	/** The time range being debugged */
	readonly fromTimestamp: number;
	readonly toTimestamp: number;
	/** Current position in the debug timeline */
	readonly currentTimestamp: number;
	/** Current step index */
	readonly currentStep: number;
	/** Total steps in the debug session */
	readonly totalSteps: number;
	/** Whether the session is paused at a step */
	readonly paused: boolean;
	/** The events in the debug timeline */
	readonly events: readonly IExecutionTimelineEvent[];
	/** The causal trace for the current step */
	readonly currentCausalTrace: ICausalTrace | undefined;
	/** Snapshots captured during the debug session */
	readonly snapshotIds: readonly string[];
}

/**
 * A causal trace — the full chain from intent to effect.
 * Connects: intent → agent → process → graph → mutation
 */
export interface ICausalTrace {
	/** The trace ID */
	readonly id: string;
	/** The root intent */
	readonly rootIntent: IIntent | undefined;
	/** Agent decisions in the trace */
	readonly agentDecisions: readonly ISimulatedDecision[];
	/** Process executions in the trace */
	readonly processExecutions: readonly IProcessSimulationResult[];
	/** Graph mutations in the trace */
	readonly graphMutations: readonly IExecutionTimelineEvent[];
	/** File mutations in the trace */
	readonly fileMutations: readonly IExecutionTimelineEvent[];
	/** The complete event chain */
	readonly eventChain: readonly IExecutionTimelineEvent[];
	/** "Why did this happen?" explanation */
	readonly explanation: string;
}

/**
 * Result of a "why did this happen?" query.
 */
export interface IWhyResolution {
	/** The event being explained */
	readonly targetEvent: IExecutionTimelineEvent;
	/** The root cause */
	readonly rootCause: IExecutionTimelineEvent | undefined;
	/** The full causal chain from root to target */
	readonly causalChain: readonly IExecutionTimelineEvent[];
	/** Human-readable explanation */
	readonly explanation: string;
	/** The intent that initiated the chain */
	readonly initiatingIntent: IIntent | undefined;
	/** The agent that executed the action (if any) */
	readonly executingAgentId: string | undefined;
	/** The process that was involved (if any) */
	readonly executingProcessId: string | undefined;
	/** Whether the outcome was expected */
	readonly expectedOutcome: boolean;
	/** Alternative outcomes that were possible */
	readonly alternativeOutcomes: readonly string[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// TASK 10 — REPLAY UI LAYER
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * View model for the Execution Timeline Viewer.
 */
export interface IExecutionTimelineViewModel {
	/** Timeline segments */
	readonly segments: readonly ITimelineSegment[];
	/** Total event count */
	readonly totalEvents: number;
	/** Time range covered */
	readonly fromTimestamp: number;
	readonly toTimestamp: number;
	/** Snapshot markers (timestamps where snapshots exist) */
	readonly snapshotMarkers: readonly ISnapshotMarker[];
	/** Intent markers (timestamps where intents were created/resolved) */
	readonly intentMarkers: readonly IIntentMarker[];
}

/**
 * A snapshot marker on the timeline.
 */
export interface ISnapshotMarker {
	readonly timestamp: number;
	readonly snapshotId: string;
	readonly label: string;
	readonly complete: boolean;
}

/**
 * An intent marker on the timeline.
 */
export interface IIntentMarker {
	readonly timestamp: number;
	readonly intentId: string;
	readonly actionType: IntentActionType;
	readonly resolution: IntentResolution;
	readonly source: IntentSource;
}

/**
 * View model for the Replay Controller.
 */
export interface IReplayControllerViewModel {
	/** Current playback position (timestamp) */
	readonly currentPosition: number;
	/** Whether the replay is playing */
	readonly playing: boolean;
	/** Replay speed (1x, 2x, 4x, 0.5x) */
	readonly speed: number;
	/** Replay mode */
	readonly mode: ReplayMode;
	/** Total duration of the replay timeline in ms */
	readonly totalDuration: number;
	/** Current step */
	readonly currentStep: number;
	/** Total steps */
	readonly totalSteps: number;
	/** Available snapshots */
	readonly snapshotCount: number;
	/** Current debug session (if any) */
	readonly debugSessionId: string | undefined;
}

/**
 * View model for the Snapshot Inspector.
 */
export interface ISnapshotInspectorViewModel {
	/** The snapshot being inspected */
	readonly snapshot: ISystemSnapshot;
	/** Layer summaries */
	readonly layerSummaries: Readonly<Record<SnapshotLayer, string>>;
	/** Whether the snapshot has a diff available with the previous snapshot */
	readonly hasPreviousDiff: boolean;
	/** Whether the snapshot has a diff available with the next snapshot */
	readonly hasNextDiff: boolean;
}

/**
 * View model for the Causal Trace Viewer.
 */
export interface ICausalTraceViewModel {
	/** The trace */
	readonly trace: ICausalTrace;
	/** Step-by-step breakdown */
	readonly steps: readonly ICausalTraceStep[];
}

/**
 * A step in the causal trace visualization.
 */
export interface ICausalTraceStep {
	readonly stepIndex: number;
	readonly event: IExecutionTimelineEvent;
	readonly subsystem: string;
	readonly description: string;
	readonly connectedToNext: boolean;
	readonly connectionType: 'caused' | 'triggered' | 'parent' | 'derived';
}

/**
 * View model for the Diff Viewer (between two snapshots).
 */
export interface IDiffViewerViewModel {
	/** Snapshot A */
	readonly snapshotAId: string;
	/** Snapshot B */
	readonly snapshotBId: string;
	/** The diff */
	readonly diff: ISnapshotDiff;
	/** Layer tabs with change counts */
	readonly layerTabs: readonly { layer: SnapshotLayer; changeCount: number }[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// SERVICE INTERFACE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * IExecutionReplayService — A read-only deterministic mirror of the entire system.
 *
 * This service provides:
 *   1. Execution Replay Engine — replay intent chains step-by-step
 *   2. System Snapshot Model — timestamped, immutable, diffable snapshots
 *   3. Event Timeline Engine — unified timeline from all subsystems
 *   4. Deterministic Replay Mode — STRICT and APPROXIMATE modes
 *   5. Simulated Agent Engine — agent decision simulation without execution
 *   6. Process Simulation Layer — process output/lifecycle simulation
 *   7. State Reconstruction Engine — reconstruct system at any time T
 *   8. Differential Analysis Engine — snapshot comparison with causal chains
 *   9. Execution Debug Protocol — step-by-step debugging with "why" resolution
 *   10. Replay UI Layer — timeline viewer, replay controller, inspectors
 *
 * HARD RULES:
 *   - MUST NOT execute real mutations
 *   - MUST NOT interfere with runtime systems
 *   - ONLY observe, reconstruct, simulate
 */
export interface IExecutionReplayService {
	readonly _serviceBrand: undefined;

	// ─── Replay Engine (Task 1) ───────────────────────────────────────────────

	/**
	 * Replay an intent chain step-by-step.
	 * Returns the full chain of events produced by the intent and all its children.
	 */
	replayIntentChain(intentId: string, mode: ReplayMode): IDeterministicReplayResult;

	/**
	 * Replay the execution graph timeline for a given time range.
	 */
	replayGraphTimeline(fromTimestamp: number, toTimestamp: number, mode: ReplayMode): IDeterministicReplayResult;

	/**
	 * Simulate what would happen if an intent were executed.
	 * Does NOT execute the intent — only simulates the outcome.
	 */
	simulateIntentExecution(intent: IIntent, mode: ReplayMode): IDeterministicReplayResult;

	// ─── Snapshots (Task 2) ───────────────────────────────────────────────────

	/**
	 * Capture a system snapshot at the current moment.
	 * The snapshot is immutable once captured.
	 */
	captureSnapshot(label: string, layers?: readonly SnapshotLayer[]): ISystemSnapshot;

	/**
	 * Get a previously captured snapshot by ID.
	 */
	getSnapshot(snapshotId: string): ISystemSnapshot | undefined;

	/**
	 * Get all captured snapshots, sorted by timestamp.
	 */
	getAllSnapshots(): readonly ISystemSnapshot[];

	/**
	 * Get snapshots within a time range.
	 */
	getSnapshotsInRange(fromTimestamp: number, toTimestamp: number): readonly ISystemSnapshot[];

	/**
	 * Get the snapshot closest to a given timestamp.
	 */
	getNearestSnapshot(timestamp: number): ISystemSnapshot | undefined;

	/**
	 * Auto-capture snapshots at a regular interval.
	 */
	startAutoCapture(intervalMs: number): void;

	/**
	 * Stop auto-capture.
	 */
	stopAutoCapture(): void;

	/**
	 * Event: snapshot captured.
	 */
	readonly onDidCaptureSnapshot: Event<ISystemSnapshot>;

	// ─── Timeline Engine (Task 3) ─────────────────────────────────────────────

	/**
	 * Get timeline events, optionally filtered.
	 */
	getTimelineEvents(filter?: ITimelineFilter): readonly IExecutionTimelineEvent[];

	/**
	 * Get a timeline segment for a time range.
	 */
	getTimelineSegment(fromTimestamp: number, toTimestamp: number): ITimelineSegment;

	/**
	 * Get the full timeline for a specific intent.
	 */
	getIntentTimeline(intentId: string): readonly IExecutionTimelineEvent[];

	/**
	 * Get events that are causally linked to a given event.
	 */
	getCausalChainEvents(eventId: string): readonly IExecutionTimelineEvent[];

	/**
	 * Event: new timeline event recorded.
	 */
	readonly onDidRecordTimelineEvent: Event<IExecutionTimelineEvent>;

	// ─── Deterministic Replay (Task 4) ────────────────────────────────────────

	/**
	 * Create a replay seed for deterministic replay.
	 */
	createReplaySeed(snapshotId: string, description: string): IReplaySeed;

	/**
	 * Verify determinism by replaying an intent and comparing the result.
	 */
	verifyDeterminism(intentId: string, seed: IReplaySeed): IDeterministicReplayResult;

	/**
	 * Get the current replay mode.
	 */
	readonly replayMode: ReplayMode;

	/**
	 * Set the replay mode.
	 */
	setReplayMode(mode: ReplayMode): void;

	/**
	 * Get all divergences detected during replays.
	 */
	getReplayDivergences(): readonly IReplayDivergence[];

	// ─── Simulated Agent Engine (Task 5) ──────────────────────────────────────

	/**
	 * Simulate what an agent would do with a given intent.
	 * The agent does NOT execute — only simulates decisions.
	 */
	simulateAgentDecision(agentId: string, intent: IIntent, seed: IReplaySeed): IAgentSimulationResult;

	/**
	 * Re-evaluate a plan that was already executed.
	 * Simulates the plan without re-executing it.
	 */
	reEvaluatePlan(agentId: string, planId: string, seed: IReplaySeed): IAgentSimulationResult;

	/**
	 * Re-apply policy to a past agent decision.
	 */
	reApplyPolicy(agentId: string, decisionId: string): IAgentSimulationResult;

	// ─── Process Simulation (Task 6) ──────────────────────────────────────────

	/**
	 * Simulate a process execution without spawning a real process.
	 */
	simulateProcessExecution(command: string, seed: IReplaySeed): IProcessSimulationResult;

	/**
	 * Simulate a process lifecycle (all state transitions).
	 */
	simulateProcessLifecycle(sessionId: string, seed: IReplaySeed): IProcessSimulationResult;

	/**
	 * Simulate process failure paths for a given command.
	 */
	simulateProcessFailures(command: string, seed: IReplaySeed): readonly ISimulatedFailurePath[];

	/**
	 * Simulate restart behavior for a process.
	 */
	simulateProcessRestart(sessionId: string, seed: IReplaySeed): IProcessSimulationResult;

	// ─── State Reconstruction (Task 7) ────────────────────────────────────────

	/**
	 * Reconstruct the full system state at time T.
	 * Rebuilds: graph, context, agent states, process states, intents.
	 */
	reconstructAtTime(timestamp: number): IStateReconstructionResult;

	/**
	 * Reconstruct a specific subsystem at time T.
	 */
	reconstructSubsystem(timestamp: number, layer: SnapshotLayer): IStateReconstructionResult;

	/**
	 * Full rewind — reconstruct from the beginning to time T.
	 */
	fullRewind(timestamp: number): IStateReconstructionResult;

	/**
	 * Partial rewind — rewind only a specific subsystem.
	 */
	partialRewind(timestamp: number, layer: SnapshotLayer): IStateReconstructionResult;

	// ─── Differential Analysis (Task 8) ───────────────────────────────────────

	/**
	 * Compare two snapshots and detect changes.
	 */
	diffSnapshots(snapshotAId: string, snapshotBId: string): ISnapshotDiff;

	/**
	 * Compare the current system state with a snapshot.
	 */
	diffWithCurrent(snapshotId: string): ISnapshotDiff;

	/**
	 * Find the causal chain that explains a change between two snapshots.
	 */
	explainChange(snapshotAId: string, snapshotBId: string, changeAspect: string): ICausalChain | undefined;

	/**
	 * Determine which system caused a mutation between two snapshots.
	 */
	traceMutationSource(snapshotAId: string, snapshotBId: string, mutationAspect: string): TimelineEventSource | undefined;

	// ─── Debug Protocol (Task 9) ──────────────────────────────────────────────

	/**
	 * Create a debug session for an intent.
	 */
	createDebugSession(intentId: string): IDebugSession;

	/**
	 * Create a debug session for a time range.
	 */
	createDebugSessionForRange(fromTimestamp: number, toTimestamp: number): IDebugSession;

	/**
	 * Get a debug session by ID.
	 */
	getDebugSession(sessionId: string): IDebugSession | undefined;

	/**
	 * Step forward in a debug session.
	 */
	debugStepForward(sessionId: string): IDebugSession;

	/**
	 * Step backward in a debug session.
	 */
	debugStepBackward(sessionId: string): IDebugSession;

	/**
	 * Get the causal trace for the current step in a debug session.
	 */
	getCausalTrace(sessionId: string): ICausalTrace | undefined;

	/**
	 * Resolve "why did this happen?" for a specific event.
	 */
	resolveWhy(eventId: string): IWhyResolution;

	/**
	 * Close a debug session.
	 */
	closeDebugSession(sessionId: string): void;

	// ─── UI Layer (Task 10) ───────────────────────────────────────────────────

	/**
	 * Get the execution timeline view model.
	 */
	getTimelineViewModel(filter?: ITimelineFilter): IExecutionTimelineViewModel;

	/**
	 * Get the replay controller view model.
	 */
	getReplayControllerViewModel(): IReplayControllerViewModel;

	/**
	 * Get the snapshot inspector view model.
	 */
	getSnapshotInspectorViewModel(snapshotId: string): ISnapshotInspectorViewModel | undefined;

	/**
	 * Get the causal trace view model for an event.
	 */
	getCausalTraceViewModel(eventId: string): ICausalTraceViewModel | undefined;

	/**
	 * Get the diff viewer view model for two snapshots.
	 */
	getDiffViewerViewModel(snapshotAId: string, snapshotBId: string): IDiffViewerViewModel | undefined;

	// ─── System-Wide ──────────────────────────────────────────────────────────

	/**
	 * Whether replay is currently active.
	 */
	readonly replayActive: boolean;

	/**
	 * Whether any mutations have leaked into the real runtime.
	 */
	readonly mutationLeakDetected: boolean;

	/**
	 * Get comprehensive replay status.
	 */
	getReplayStatus(): IReplayStatus;

	/**
	 * Validate that the replay system has not caused any runtime interference.
	 */
	validateNoRuntimeInterference(): IReplayIntegrityCheck;
}

/**
 * Comprehensive replay system status.
 */
export interface IReplayStatus {
	readonly active: boolean;
	readonly replayMode: ReplayMode;
	readonly snapshotCount: number;
	readonly timelineEventCount: number;
	readonly debugSessionCount: number;
	readonly autoCaptureActive: boolean;
	readonly lastSnapshotTimestamp: number | undefined;
	readonly divergencesDetected: number;
	readonly mutationLeakDetected: boolean;
}

/**
 * Integrity check result — verifies no runtime interference.
 */
export interface IReplayIntegrityCheck {
	readonly passed: boolean;
	readonly mutationLeakCount: number;
	readonly sideEffectCount: number;
	readonly runtimeStateUntouched: boolean;
	readonly checkedAt: number;
	readonly details: readonly string[];
}
