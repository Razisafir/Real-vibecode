/*---------------------------------------------------------------------------------------------
 *  Global Execution Brain — Phase 9 System Coordination Layer
 *  Real Vibecode — AI-Native IDE
 *
 *  IGlobalExecutionBrainService — The coordination layer that binds all systems
 *  together into one unified intelligence loop.
 *
 *  This is NOT:
 *    - Another subsystem that executes actions
 *    - A replacement for existing services
 *    - A duplication of logic from Agent/Process/Graph/Context services
 *
 *  This IS:
 *    - The coordination layer that unifies system state
 *    - The routing layer for execution decisions
 *    - The conflict resolver between competing systems
 *    - The maintainer of global execution consistency
 *
 *  Connected Systems:
 *    - AgentOrchestratorService
 *    - AIProcessOrchestratorService
 *    - AIExecutionService
 *    - ExecutionGraphService
 *    - AIContextService
 *    - UnifiedStateService
 *    - ObservabilityService
 *
 *  Core Concepts (Tasks 1-9):
 *    1. GlobalExecutionBrainService — coordinate, arbitrate, synchronize
 *    2. Intent — all system actions traceable to an Intent
 *    3. Cross-System Event Bus — unified event propagation
 *    4. Global Decision Engine — arbitration, priority, conflict resolution
 *    5. System Synchronization — consistent state, no drift
 *    6. Execution Loop — Intent→Context→Plan→Execute→Graph→Sync→Observe
 *    7. Conflict Resolution — deterministic priority, escalation, rollback
 *    8. Global Health Monitor — lag, backlog, saturation, overload detection
 *    9. Coherence Validation — graph/context/process/agent alignment
 *
 *  Hard Rules:
 *    1. The Brain must NOT execute actions directly
 *    2. The Brain must NOT replace existing services
 *    3. The Brain must NOT duplicate logic
 *    4. The Brain must coordinate, arbitrate, and synchronize everything
 *    5. All system actions must be traceable back to an Intent
 *    6. No system may operate independently of the Brain's coordination
 *--------------------------------------------------------------------------------------------*/

import { Event } from '../../../../base/common/event.js';
import { IDisposable } from '../../../../base/common/lifecycle.js';
import { URI } from '../../../../base/common/uri.js';
import { CancellationToken } from '../../../../base/common/cancellation.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { AIMutationSource } from './aiExecutionService.js';
import { IExecutionNode, ExecutionNodeType, IExecutionScope } from './executionGraphService.js';
import { AIRuntimePhase, IActiveExecutionState } from './aiUnifiedStateService.js';

export const IGlobalExecutionBrainService = createDecorator<IGlobalExecutionBrainService>('globalExecutionBrainService');

// ═══════════════════════════════════════════════════════════════════════════════
// TASK 2 — GLOBAL INTENT MODEL
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * The source of an intent — who or what initiated it.
 */
export const enum IntentSource {
	/** A human user initiated this intent (typing, clicking, command) */
	User = 'user',
	/** An AI agent initiated this intent (plan execution, autonomous action) */
	Agent = 'agent',
	/** The system itself initiated this intent (auto-save, health recovery, sync) */
	System = 'system',
}

/**
 * Priority levels for intents. Higher priority intents are resolved first.
 * When conflicts occur, priority determines the winner.
 */
export const enum IntentPriority {
	/** Critical — system stability or data safety is at stake */
	Critical = 0,
	/** High — user-visible operation that should not be delayed */
	High = 1,
	/** Normal — standard operational intent */
	Normal = 2,
	/** Low — background or deferred operation */
	Low = 3,
	/** Idle — only execute when nothing else is pending */
	Idle = 4,
}

/**
 * The scope of an intent — how far its effects reach.
 */
export const enum IntentScope {
	/** Affects a single file */
	File = 'file',
	/** Affects a workspace-level operation (multi-file) */
	Workspace = 'workspace',
	/** Affects a process execution */
	Process = 'process',
	/** Affects an agent's execution plan */
	Agent = 'agent',
	/** Affects the entire system (global coordination) */
	System = 'system',
}

/**
 * The current resolution state of an intent.
 */
export const enum IntentResolution {
	/** Intent has been created but not yet evaluated */
	Pending = 'pending',
	/** Intent has been evaluated and is queued for execution */
	Queued = 'queued',
	/** Intent is currently being acted upon */
	Executing = 'executing',
	/** Intent has been satisfied — action completed successfully */
	Satisfied = 'satisfied',
	/** Intent was blocked by a conflict or policy */
	Blocked = 'blocked',
	/** Intent was superseded by a higher-priority intent */
	Superseded = 'superseded',
	/** Intent was cancelled before completion */
	Cancelled = 'cancelled',
	/** Intent failed — could not be satisfied */
	Failed = 'failed',
	/** Intent was deferred for later resolution */
	Deferred = 'deferred',
}

/**
 * The type of action an intent represents.
 */
export const enum IntentActionType {
	/** Edit file contents */
	FileEdit = 'file-edit',
	/** Execute a terminal command / process */
	ProcessExecution = 'process-execution',
	/** Agent plan execution */
	AgentPlan = 'agent-plan',
	/** Query context engine */
	ContextQuery = 'context-query',
	/** Query execution graph */
	GraphQuery = 'graph-query',
	/** System recovery / stabilization */
	SystemRecovery = 'system-recovery',
	/** Conflict resolution */
	ConflictResolution = 'conflict-resolution',
	/** State synchronization */
	StateSync = 'state-sync',
	/** Health check / monitoring */
	HealthCheck = 'health-check',
	/** Coherence validation */
	CoherenceValidation = 'coherence-validation',
	/** Custom / extensibility */
	Custom = 'custom',
}

/**
 * An Intent — the fundamental unit of traceable action in the system.
 * All system actions MUST be traceable back to an Intent.
 *
 * Lifecycle: Created → Pending → Queued → Executing → Satisfied/Failed/Blocked/Superseded/Cancelled
 *
 * Example trace:
 *   User request →
 *   Agent plan →
 *   Process execution →
 *   File mutation →
 *   Graph update
 */
export interface IIntent {
	/** Unique intent ID */
	readonly id: string;
	/** Who or what initiated this intent */
	readonly source: IntentSource;
	/** Priority level */
	readonly priority: IntentPriority;
	/** Scope of the intent's effects */
	readonly scope: IntentScope;
	/** Current resolution state */
	resolution: IntentResolution;
	/** The type of action this intent represents */
	readonly actionType: IntentActionType;
	/** Human-readable description of the intent */
	readonly description: string;
	/** The originating agent ID (if source = Agent) */
	readonly agentId: string | undefined;
	/** The originating process session ID (if actionType = ProcessExecution) */
	readonly processSessionId: string | undefined;
	/** Target file URIs affected by this intent */
	readonly targetUris: readonly URI[];
	/** Execution graph node IDs produced by this intent */
	readonly graphNodeIds: readonly string[];
	/** Parent intent ID (for intent chains: user request → agent plan → process) */
	readonly parentIntentId: string | undefined;
	/** Child intent IDs (downstream effects of this intent) */
	readonly childIntentIds: readonly string[];
	/** Constraints on this intent (timeouts, file restrictions, etc.) */
	readonly constraints: readonly IIntentConstraint[];
	/** Timestamp when the intent was created */
	readonly createdAt: number;
	/** Timestamp when the intent was resolved (if resolved) */
	resolvedAt: number | undefined;
	/** Reason for the current resolution state */
	resolutionReason: string | undefined;
	/** Whether this intent requires approval before execution */
	readonly requiresApproval: boolean;
	/** Whether this intent has been approved */
	approved: boolean;
	/** Approved by (user name, agent ID, or system) */
	approvedBy: string | undefined;
}

/**
 * A constraint on an intent.
 */
export interface IIntentConstraint {
	/** Constraint type */
	readonly type: IntentConstraintType;
	/** Constraint value */
	readonly value: string | number | boolean;
	/** Description of why this constraint exists */
	readonly description: string;
}

/**
 * Types of constraints that can be placed on intents.
 */
export const enum IntentConstraintType {
	/** Maximum execution time in milliseconds */
	MaxDurationMs = 'max-duration-ms',
	/** Files that cannot be modified by this intent */
	ProtectedFiles = 'protected-files',
	/** Maximum number of child intents this can produce */
	MaxChildren = 'max-children',
	/** Whether this intent can be superseded */
	AllowSupersede = 'allow-supersede',
	/** Whether this intent can be deferred */
	AllowDefer = 'allow-defer',
	/** Required approval level */
	ApprovalLevel = 'approval-level',
	/** Maximum retry count */
	MaxRetries = 'max-retries',
}

// ═══════════════════════════════════════════════════════════════════════════════
// TASK 3 — CROSS-SYSTEM EVENT BUS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Categories of events in the unified event bus.
 * Every event from every subsystem falls into one of these categories.
 */
export const enum BrainEventCategory {
	/** Execution events (file edits, workspace changes) */
	Execution = 'execution',
	/** Process events (terminal execution, process lifecycle) */
	Process = 'process',
	/** Agent events (lifecycle, plan, step) */
	Agent = 'agent',
	/** Context events (domain updates, invalidation) */
	Context = 'context',
	/** Graph events (node/edge creation, scope changes) */
	Graph = 'graph',
	/** Intent events (creation, resolution, conflict) */
	Intent = 'intent',
	/** Decision events (arbitration, conflict resolution) */
	Decision = 'decision',
	/** Health events (overload, failure, recovery) */
	Health = 'health',
	/** Synchronization events (drift, convergence, reconciliation) */
	Sync = 'sync',
	/** Coherence events (validation, repair, stabilization) */
	Coherence = 'coherence',
}

/**
 * Severity level for brain events.
 */
export const enum BrainEventSeverity {
	/** Informational — no action needed */
	Info = 'info',
	/** Warning — potential issue detected */
	Warning = 'warning',
	/** Error — action required */
	Error = 'error',
	/** Critical — system stability at risk */
	Critical = 'critical',
}

/**
 * A normalized event in the unified event bus.
 * All subsystem events are normalized to this format for cross-system propagation.
 */
export interface IBrainEvent {
	/** Unique event ID */
	readonly id: string;
	/** Event category */
	readonly category: BrainEventCategory;
	/** Event severity */
	readonly severity: BrainEventSeverity;
	/** The subsystem that produced this event */
	readonly source: BrainEventSource;
	/** Human-readable event description */
	readonly description: string;
	/** Timestamp */
	readonly timestamp: number;
	/** The intent ID this event is associated with (if any) */
	readonly intentId: string | undefined;
	/** The execution graph node ID this event is associated with (if any) */
	readonly graphNodeId: string | undefined;
	/** The agent ID this event is associated with (if any) */
	readonly agentId: string | undefined;
	/** The process session ID this event is associated with (if any) */
	readonly processSessionId: string | undefined;
	/** Additional data specific to the event type */
	readonly data: Record<string, unknown>;
}

/**
 * Which subsystem produced an event.
 */
export const enum BrainEventSource {
	/** Event from the AIExecutionService */
	ExecutionService = 'execution-service',
	/** Event from the AgentOrchestratorService */
	AgentOrchestrator = 'agent-orchestrator',
	/** Event from the AIProcessOrchestratorService */
	ProcessOrchestrator = 'process-orchestrator',
	/** Event from the ExecutionGraphService */
	ExecutionGraph = 'execution-graph',
	/** Event from the AIContextService */
	ContextEngine = 'context-engine',
	/** Event from the UnifiedStateService */
	UnifiedState = 'unified-state',
	/** Event from the ObservabilityService */
	Observability = 'observability',
	/** Event from the GlobalExecutionBrain itself */
	GlobalBrain = 'global-brain',
}

/**
 * Subscription filter for the event bus.
 * Subscribers can filter events by category, source, severity, or intent.
 */
export interface IBrainEventFilter {
	readonly categories?: readonly BrainEventCategory[];
	readonly sources?: readonly BrainEventSource[];
	readonly minSeverity?: BrainEventSeverity;
	readonly intentId?: string;
	readonly agentId?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// TASK 4 — GLOBAL DECISION ENGINE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Types of decisions the Global Decision Engine makes.
 */
export const enum DecisionType {
	/** Allow an intent to proceed */
	Allow = 'allow',
	/** Block an intent (policy violation, conflict, safety) */
	Block = 'block',
	/** Defer an intent until conditions are met */
	Defer = 'defer',
	/** Escalate an intent for human review */
	Escalate = 'escalate',
	/** Merge two compatible intents */
	Merge = 'merge',
	/** Reorder intent execution sequence */
	Reorder = 'reorder',
	/** Pause the system for stabilization */
	PauseSystem = 'pause-system',
	/** Resume the system after stabilization */
	ResumeSystem = 'resume-system',
	/** Trigger system recovery */
	RecoverSystem = 'recover-system',
	/** Cancel an intent */
	Cancel = 'cancel',
}

/**
 * A decision made by the Global Decision Engine.
 * Every decision is recorded, traceable, and auditable.
 */
export interface IGlobalDecision {
	/** Unique decision ID */
	readonly id: string;
	/** The type of decision */
	readonly type: DecisionType;
	/** The intent(s) this decision affects */
	readonly intentIds: readonly string[];
	/** The reason for this decision */
	readonly reason: string;
	/** The conflict that triggered this decision (if any) */
	readonly conflictId: string | undefined;
	/** The arbitration rule that was applied */
	readonly appliedRule: string;
	/** Timestamp */
	readonly timestamp: number;
	/** Priority of the decision */
	readonly priority: IntentPriority;
	/** Whether this decision can be overridden */
	readonly overridable: boolean;
	/** Who or what made this decision */
	readonly decidedBy: 'automatic' | 'escalated' | 'user';
	/** Additional data */
	readonly data: Record<string, unknown>;
}

/**
 * An arbitration rule in the Global Decision Engine.
 * Rules define deterministic conflict resolution logic.
 */
export interface IArbitrationRule {
	/** Unique rule ID */
	readonly id: string;
	/** Human-readable rule name */
	readonly name: string;
	/** Description of what this rule does */
	readonly description: string;
	/** Priority of this rule (higher = evaluated first) */
	readonly rulePriority: number;
	/** Whether this rule is active */
	active: boolean;
	/** The conflict types this rule handles */
	readonly handlesConflictTypes: readonly ConflictType[];
	/** The decision function (evaluated by the Decision Engine) */
	evaluate(conflict: IConflict, intents: readonly IIntent[]): IGlobalDecision;
}

// ═══════════════════════════════════════════════════════════════════════════════
// TASK 7 — CONFLICT RESOLUTION SYSTEM
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Types of conflicts the system can detect.
 */
export const enum ConflictType {
	/** Agent wants to edit a file that a process is currently building */
	AgentVsProcess = 'agent-vs-process',
	/** A process is running while file mutations are pending */
	ProcessVsMutation = 'process-vs-mutation',
	/** Context engine reports a dependency that conflicts with execution graph */
	ContextVsGraph = 'context-vs-graph',
	/** Multiple agents competing for the same resource */
	AgentCompetition = 'agent-competition',
	/** Two intents target the same file with incompatible changes */
	FileConflict = 'file-conflict',
	/** Graph inconsistency detected (missing edges, orphaned nodes) */
	GraphInconsistency = 'graph-inconsistency',
	/** State drift between subsystems */
	StateDrift = 'state-drift',
	/** Resource contention (memory, CPU, concurrent limits) */
	ResourceContention = 'resource-contention',
	/** Policy violation */
	PolicyViolation = 'policy-violation',
	/** Safety violation */
	SafetyViolation = 'safety-violation',
}

/**
 * Severity of a conflict.
 */
export const enum ConflictSeverity {
	/** Low — can be auto-resolved */
	Low = 'low',
	/** Medium — requires decision engine arbitration */
	Medium = 'medium',
	/** High — requires escalation or human intervention */
	High = 'high',
	/** Critical — system must pause until resolved */
	Critical = 'critical',
}

/**
 * The current state of a conflict.
 */
export const enum ConflictState {
	/** Conflict detected but not yet resolved */
	Detected = 'detected',
	/** Conflict is being evaluated by the decision engine */
	Evaluating = 'evaluating',
	/** Conflict has been resolved */
	Resolved = 'resolved',
	/** Conflict resolution was escalated */
	Escalated = 'escalated',
	/** Conflict could not be resolved */
	Unresolvable = 'unresolvable',
}

/**
 * A conflict between two or more system operations.
 */
export interface IConflict {
	/** Unique conflict ID */
	readonly id: string;
	/** Conflict type */
	readonly type: ConflictType;
	/** Severity */
	readonly severity: ConflictSeverity;
	/** Current state */
	state: ConflictState;
	/** The intents involved in this conflict */
	readonly intentIds: readonly string[];
	/** Human-readable description */
	readonly description: string;
	/** The resources (files, processes, agents) in conflict */
	readonly contestedResources: readonly string[];
	/** Timestamp when conflict was detected */
	readonly detectedAt: number;
	/** Timestamp when conflict was resolved (if resolved) */
	resolvedAt: number | undefined;
	/** The decision that resolved this conflict (if resolved) */
	resolutionDecision: IGlobalDecision | undefined;
	/** Suggested resolutions */
	readonly suggestedResolutions: readonly IConflictResolution[];
	/** Whether this conflict requires system pause */
	readonly requiresPause: boolean;
	/** Whether rollback is recommended */
	readonly recommendsRollback: boolean;
}

/**
 * A suggested resolution for a conflict.
 */
export interface IConflictResolution {
	/** Resolution type */
	readonly type: ConflictResolutionType;
	/** Description of what this resolution does */
	readonly description: string;
	/** Which intent IDs would be affected */
	readonly affectedIntents: readonly string[];
	/** Estimated impact (low/medium/high) */
	readonly impact: 'low' | 'medium' | 'high';
	/** Whether this resolution is automatic or requires approval */
	readonly automatic: boolean;
}

/**
 * Types of conflict resolutions.
 */
export const enum ConflictResolutionType {
	/** Delay one intent until the other completes */
	DelayOne = 'delay-one',
	/** Queue both intents for sequential execution */
	QueueBoth = 'queue-both',
	/** Merge compatible intents */
	Merge = 'merge',
	/** Cancel the lower-priority intent */
	CancelLower = 'cancel-lower',
	/** Escalate to human for decision */
	Escalate = 'escalate',
	/** Roll back the conflicting changes */
	Rollback = 'rollback',
	/** Pause the system until safe to proceed */
	PauseSystem = 'pause-system',
	/** Sandbox the conflicting operation */
	Sandbox = 'sandbox',
}

// ═══════════════════════════════════════════════════════════════════════════════
// TASK 5 — SYSTEM SYNCHRONIZATION LAYER
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * A synchronization checkpoint — a point-in-time snapshot of all subsystem states.
 * Used for reconciliation, convergence checks, and drift detection.
 */
export interface ISyncCheckpoint {
	/** Unique checkpoint ID */
	readonly id: string;
	/** Timestamp when the checkpoint was taken */
	readonly takenAt: number;
	/** Runtime phase at checkpoint time */
	readonly runtimePhase: AIRuntimePhase;
	/** Number of active executions */
	readonly activeExecutionCount: number;
	/** Number of active agents */
	readonly activeAgentCount: number;
	/** Number of active processes */
	readonly activeProcessCount: number;
	/** Number of active intents */
	readonly activeIntentCount: number;
	/** Number of graph nodes */
	readonly graphNodeCount: number;
	/** Number of graph edges */
	readonly graphEdgeCount: number;
	/** Number of unresolved conflicts */
	readonly unresolvedConflictCount: number;
	/** Whether any drift was detected */
	readonly hasDrift: boolean;
	/** Drift details (if any) */
	readonly driftDetails: readonly IDriftDetail[];
}

/**
 * A detected state drift between subsystems.
 */
export interface IDriftDetail {
	/** Which subsystems are out of sync */
	readonly subsystems: readonly string[];
	/** What aspect is drifting */
	readonly aspect: string;
	/** Expected state */
	readonly expected: string;
	/** Actual state */
	readonly actual: string;
	/** Severity of the drift */
	readonly severity: 'minor' | 'major' | 'critical';
	/** Suggested corrective action */
	readonly correctiveAction: string;
}

/**
 * Result of a reconciliation cycle.
 */
export interface IReconciliationResult {
	/** Whether reconciliation was needed */
	readonly reconciliationNeeded: boolean;
	/** Number of drifts detected */
	readonly driftsDetected: number;
	/** Number of drifts corrected */
	readonly driftsCorrected: number;
	/** Number of drifts that could not be auto-corrected */
	readonly driftsUncorrected: number;
	/** Whether the system is now in a converged state */
	readonly converged: boolean;
	/** Timestamp */
	readonly completedAt: number;
	/** Duration of the reconciliation cycle in ms */
	readonly durationMs: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// TASK 6 — EXECUTION LOOP ORCHESTRATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * The phases of the global execution loop.
 * This is the "heartbeat" of the IDE — the continuous loop that
 * coordinates all subsystems.
 *
 * Loop: Intent → ContextAnalysis → AgentPlanning → ProcessExecution →
 *       GraphUpdate → StateSync → Observability → (repeat)
 */
export const enum ExecutionLoopPhase {
	/** Waiting for the next intent */
	Idle = 'idle',
	/** Analyzing context for the current intent */
	ContextAnalysis = 'context-analysis',
	/** Agent constructing an execution plan */
	AgentPlanning = 'agent-planning',
	/** Process executing a command */
	ProcessExecution = 'process-execution',
	/** Updating the execution graph */
	GraphUpdate = 'graph-update',
	/** Synchronizing state across subsystems */
	StateSync = 'state-sync',
	/** Observing and recording system events */
	Observability = 'observability',
	/** System is paused (conflict, recovery, or manual pause) */
	Paused = 'paused',
}

/**
 * A single tick of the global execution loop.
 * Records what happened in each phase of the loop.
 */
export interface IExecutionLoopTick {
	/** Unique tick ID */
	readonly id: number;
	/** Timestamp when this tick started */
	readonly startedAt: number;
	/** Timestamp when this tick completed */
	readonly completedAt: number | undefined;
	/** The phase this tick started in */
	readonly startPhase: ExecutionLoopPhase;
	/** The phase this tick ended in */
	readonly endPhase: ExecutionLoopPhase | undefined;
	/** The intent being processed in this tick (if any) */
	readonly activeIntentId: string | undefined;
	/** Decisions made during this tick */
	readonly decisions: readonly IGlobalDecision[];
	/** Conflicts detected during this tick */
	readonly conflicts: readonly IConflict[];
	/** Whether this tick resulted in a state change */
	readonly stateChanged: boolean;
	/** Duration in ms */
	readonly durationMs: number | undefined;
}

/**
 * Configuration for the global execution loop.
 */
export interface IExecutionLoopConfig {
	/** Loop tick interval in ms (default: 100) */
	readonly tickIntervalMs: number;
	/** Maximum concurrent intents (default: 10) */
	readonly maxConcurrentIntents: number;
	/** Maximum loop iterations before forced yield (default: 1000) */
	readonly maxIterationsPerCycle: number;
	/** Whether the loop is currently active */
	active: boolean;
	/** Reconciliation interval in ms (default: 5000) */
	readonly reconciliationIntervalMs: number;
	/** Health check interval in ms (default: 3000) */
	readonly healthCheckIntervalMs: number;
	/** Coherence validation interval in ms (default: 10000) */
	readonly coherenceIntervalMs: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// TASK 8 — GLOBAL HEALTH MONITOR
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * System health metrics tracked by the Global Health Monitor.
 */
export interface ISystemHealthMetrics {
	/** Timestamp of this measurement */
	readonly measuredAt: number;
	/** System lag — average event processing delay in ms */
	readonly systemLagMs: number;
	/** Execution backlog — number of pending intents */
	readonly executionBacklog: number;
	/** Graph growth rate — nodes per second */
	readonly graphGrowthRate: number;
	/** Agent activity saturation — fraction of max concurrent agents active (0–1) */
	readonly agentSaturation: number;
	/** Process failure rate — failures per minute */
	readonly processFailureRate: number;
	/** Memory pressure — estimated memory usage fraction (0–1) */
	readonly memoryPressure: number;
	/** Event bus throughput — events processed per second */
	readonly eventBusThroughput: number;
	/** Conflict resolution rate — conflicts resolved per minute */
	readonly conflictResolutionRate: number;
	/** Loop tick duration — average tick time in ms */
	readonly avgTickDurationMs: number;
	/** Pending approval count */
	readonly pendingApprovalCount: number;
	/** Active checkpoint count */
	readonly activeCheckpointCount: number;
}

/**
 * Overall system health status.
 */
export const enum SystemHealthStatus {
	/** System is healthy — all metrics within normal range */
	Healthy = 'healthy',
	/** System is under moderate load — some metrics elevated */
	Stressed = 'stressed',
	/** System is overloaded — multiple metrics critical */
	Overloaded = 'overloaded',
	/** System has detected a failure condition */
	Failure = 'failure',
	/** System is in recovery mode */
	Recovery = 'recovery',
}

/**
 * A health alert triggered by the Global Health Monitor.
 */
export interface IHealthAlert {
	/** Unique alert ID */
	readonly id: string;
	/** Alert severity */
	readonly severity: SystemHealthStatus;
	/** The metric that triggered this alert */
	readonly metric: string;
	/** Current value of the metric */
	readonly currentValue: number;
	/** Threshold that was exceeded */
	readonly threshold: number;
	/** Human-readable description */
	readonly description: string;
	/** Suggested corrective action */
	readonly suggestedAction: string;
	/** Timestamp */
	readonly triggeredAt: number;
	/** Whether this alert is still active */
	active: boolean;
	/** Timestamp when the alert was resolved (if resolved) */
	resolvedAt: number | undefined;
}

/**
 * Configuration for health monitoring thresholds.
 */
export interface IHealthThresholds {
	/** Maximum system lag before alert (ms) */
	readonly maxLagMs: number;
	/** Maximum execution backlog before alert */
	readonly maxBacklog: number;
	/** Maximum graph growth rate before alert (nodes/sec) */
	readonly maxGraphGrowthRate: number;
	/** Maximum agent saturation before alert (0–1) */
	readonly maxAgentSaturation: number;
	/** Maximum process failure rate before alert (failures/min) */
	readonly maxProcessFailureRate: number;
	/** Maximum memory pressure before alert (0–1) */
	readonly maxMemoryPressure: number;
	/** Maximum loop tick duration before alert (ms) */
	readonly maxTickDurationMs: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// TASK 9 — COHERENCE VALIDATION ENGINE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Types of coherence checks the validation engine performs.
 */
export const enum CoherenceCheckType {
	/** Verify the execution graph has no inconsistencies */
	GraphConsistency = 'graph-consistency',
	/** Verify the context engine's data matches actual workspace state */
	ContextAccuracy = 'context-accuracy',
	/** Verify process sessions are in valid states */
	ProcessCorrectness = 'process-correctness',
	/** Verify agent states align with their execution plans */
	AgentStateAlignment = 'agent-state-alignment',
	/** Verify the unified state is consistent across all subsystems */
	StateConsistency = 'state-consistency',
	/** Verify intent chains are valid and not orphaned */
	IntentChainValidity = 'intent-chain-validity',
	/** Verify no orphaned graph nodes exist */
	OrphanDetection = 'orphan-detection',
	/** Verify execution scopes are properly closed */
	ScopeIntegrity = 'scope-integrity',
}

/**
 * Result of a coherence check.
 */
export interface ICoherenceCheckResult {
	/** The check that was performed */
	readonly checkType: CoherenceCheckType;
	/** Whether the check passed */
	readonly passed: boolean;
	/** Issues found (empty if passed) */
	readonly issues: readonly ICoherenceIssue[];
	/** Timestamp */
	readonly checkedAt: number;
	/** Duration of the check in ms */
	readonly durationMs: number;
}

/**
 * An issue found during coherence validation.
 */
export interface ICoherenceIssue {
	/** Issue ID */
	readonly id: string;
	/** Which check found this issue */
	readonly checkType: CoherenceCheckType;
	/** Severity */
	readonly severity: 'minor' | 'major' | 'critical';
	/** Human-readable description */
	readonly description: string;
	/** The subsystems involved */
	readonly affectedSubsystems: readonly string[];
	/** Suggested repair action */
	readonly suggestedRepair: CoherenceRepairAction;
	/** Whether auto-repair is possible */
	readonly autoRepairable: boolean;
	/** Related resource IDs (node IDs, intent IDs, etc.) */
	readonly relatedIds: readonly string[];
}

/**
 * Repair actions the coherence engine can suggest or perform.
 */
export const enum CoherenceRepairAction {
	/** No repair needed — informational */
	None = 'none',
	/** Re-synchronize the drift between subsystems */
	Resync = 'resync',
	/** Remove the orphaned resource */
	RemoveOrphan = 'remove-orphan',
	/** Close the unclosed scope */
	CloseScope = 'close-scope',
	/** Roll back to the last known good state */
	Rollback = 'rollback',
	/** Trigger system stabilization */
	Stabilize = 'stabilize',
	/** Escalate for manual intervention */
	Escalate = 'escalate',
	/** Refresh the context domain */
	RefreshContext = 'refresh-context',
}

/**
 * Result of a full coherence validation cycle.
 */
export interface ICoherenceValidationResult {
	/** Timestamp */
	readonly validatedAt: number;
	/** Overall coherence status */
	readonly coherent: boolean;
	/** Individual check results */
	readonly checks: readonly ICoherenceCheckResult[];
	/** Total issues found */
	readonly totalIssues: number;
	/** Issues by severity */
	readonly issuesBySeverity: Readonly<Record<string, number>>;
	/** Auto-repairable issues */
	readonly autoRepairableCount: number;
	/** Whether auto-repair was performed */
	readonly autoRepairPerformed: boolean;
	/** Duration of the validation cycle in ms */
	readonly durationMs: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// TASK 1 + SERVICE INTERFACE — GLOBAL EXECUTION BRAIN
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * IGlobalExecutionBrainService — The coordination layer that binds all systems
 * together into one unified intelligence loop.
 *
 * The Brain:
 *   - Unifies system state across all subsystems
 *   - Routes execution decisions through the Decision Engine
 *   - Resolves conflicts between competing systems
 *   - Maintains global execution consistency
 *   - Provides the global execution loop (heartbeat of the IDE)
 *   - Monitors system health
 *   - Validates coherence across all subsystems
 *
 * The Brain does NOT:
 *   - Execute actions directly (it delegates to existing services)
 *   - Replace existing services
 *   - Duplicate logic from subsystems
 */
export interface IGlobalExecutionBrainService {
	readonly _serviceBrand: undefined;

	// ─── Intent Management (Task 2) ────────────────────────────────────────────

	/**
	 * Create a new intent. All system actions must be traceable to an Intent.
	 */
	createIntent(params: IIntentCreateParams): IIntent;

	/**
	 * Get an intent by ID.
	 */
	getIntent(intentId: string): IIntent | undefined;

	/**
	 * Get all active (non-terminal) intents.
	 */
	getActiveIntents(): readonly IIntent[];

	/**
	 * Get intents by source.
	 */
	getIntentsBySource(source: IntentSource): readonly IIntent[];

	/**
	 * Get intents by action type.
	 */
	getIntentsByActionType(actionType: IntentActionType): readonly IIntent[];

	/**
	 * Get the intent chain for a given intent (all ancestors and descendants).
	 */
	getIntentChain(intentId: string): readonly IIntent[];

	/**
	 * Resolve an intent (mark it as satisfied, failed, blocked, etc.).
	 */
	resolveIntent(intentId: string, resolution: IntentResolution, reason: string): void;

	/**
	 * Approve an intent that requires approval.
	 */
	approveIntent(intentId: string, approvedBy: string): void;

	/**
	 * Event that fires when an intent is created.
	 */
	readonly onDidCreateIntent: Event<IIntent>;

	/**
	 * Event that fires when an intent's resolution changes.
	 */
	readonly onDidChangeIntentResolution: Event<IIntent>;

	// ─── Event Bus (Task 3) ───────────────────────────────────────────────────

	/**
	 * Emit an event on the unified event bus.
	 */
	emitEvent(event: Omit<IBrainEvent, 'id' | 'timestamp'>): IBrainEvent;

	/**
	 * Subscribe to events on the unified event bus.
	 * Optionally filter events by category, source, or severity.
	 */
	subscribe(filter?: IBrainEventFilter): Event<IBrainEvent>;

	/**
	 * Get recent events from the event bus.
	 */
	getRecentEvents(limit: number, filter?: IBrainEventFilter): readonly IBrainEvent[];

	/**
	 * Get event bus statistics.
	 */
	readonly eventBusStats: IEventBusStats;

	// ─── Decision Engine (Task 4) ─────────────────────────────────────────────

	/**
	 * Submit an intent to the decision engine for evaluation.
	 * The engine evaluates the intent against current system state,
	 * conflicts, and arbitration rules, and returns a decision.
	 */
	evaluateIntent(intentId: string): IGlobalDecision;

	/**
	 * Get recent decisions.
	 */
	getRecentDecisions(limit: number): readonly IGlobalDecision[];

	/**
	 * Register an arbitration rule.
	 */
	registerArbitrationRule(rule: IArbitrationRule): IDisposable;

	/**
	 * Get all registered arbitration rules.
	 */
	getArbitrationRules(): readonly IArbitrationRule[];

	// ─── Conflict Resolution (Task 7) ─────────────────────────────────────────

	/**
	 * Detect conflicts for a given intent against the current system state.
	 */
	detectConflicts(intentId: string): readonly IConflict[];

	/**
	 * Get all active (unresolved) conflicts.
	 */
	getActiveConflicts(): readonly IConflict[];

	/**
	 * Resolve a conflict using the decision engine.
	 */
	resolveConflict(conflictId: string): IGlobalDecision;

	/**
	 * Escalate a conflict for manual resolution.
	 */
	escalateConflict(conflictId: string): void;

	/**
	 * Event that fires when a conflict is detected.
	 */
	readonly onDidDetectConflict: Event<IConflict>;

	/**
	 * Event that fires when a conflict is resolved.
	 */
	readonly onDidResolveConflict: Event<IConflict>;

	// ─── Synchronization (Task 5) ─────────────────────────────────────────────

	/**
	 * Take a synchronization checkpoint — a point-in-time snapshot
	 * of all subsystem states.
	 */
	takeSyncCheckpoint(): ISyncCheckpoint;

	/**
	 * Run a reconciliation cycle to detect and correct drift.
	 */
	reconcile(): IReconciliationResult;

	/**
	 * Get the last synchronization checkpoint.
	 */
	readonly lastSyncCheckpoint: ISyncCheckpoint | undefined;

	/**
	 * Check if any subsystem is in a drifted state.
	 */
	hasDrift(): boolean;

	// ─── Execution Loop (Task 6) ──────────────────────────────────────────────

	/**
	 * Start the global execution loop.
	 * This is the "heartbeat" of the IDE.
	 */
	startLoop(): void;

	/**
	 * Stop the global execution loop.
	 */
	stopLoop(): void;

	/**
	 * Pause the execution loop (for conflicts, recovery, or manual pause).
	 */
	pauseLoop(reason: string): void;

	/**
	 * Resume the execution loop after a pause.
	 */
	resumeLoop(): void;

	/**
	 * Get the current execution loop phase.
	 */
	readonly loopPhase: ExecutionLoopPhase;

	/**
	 * Get the execution loop configuration.
	 */
	readonly loopConfig: IExecutionLoopConfig;

	/**
	 * Update the execution loop configuration.
	 */
	updateLoopConfig(config: Partial<IExecutionLoopConfig>): void;

	/**
	 * Get the execution loop history (recent ticks).
	 */
	getLoopHistory(limit: number): readonly IExecutionLoopTick[];

	/**
	 * Event that fires when the execution loop phase changes.
	 */
	readonly onDidChangeLoopPhase: Event<ExecutionLoopPhase>;

	/**
	 * Whether the execution loop is currently active.
	 */
	readonly loopActive: boolean;

	// ─── Health Monitor (Task 8) ──────────────────────────────────────────────

	/**
	 * Get the current system health metrics.
	 */
	readonly healthMetrics: ISystemHealthMetrics;

	/**
	 * Get the current system health status.
	 */
	readonly healthStatus: SystemHealthStatus;

	/**
	 * Get active health alerts.
	 */
	getActiveHealthAlerts(): readonly IHealthAlert[];

	/**
	 * Set health monitoring thresholds.
	 */
	setHealthThresholds(thresholds: Partial<IHealthThresholds>): void;

	/**
	 * Get current health thresholds.
	 */
	readonly healthThresholds: IHealthThresholds;

	/**
	 * Event that fires when a health alert is triggered.
	 */
	readonly onDidTriggerHealthAlert: Event<IHealthAlert>;

	/**
	 * Event that fires when the system health status changes.
	 */
	readonly onDidChangeHealthStatus: Event<SystemHealthStatus>;

	// ─── Coherence Validation (Task 9) ────────────────────────────────────────

	/**
	 * Run a full coherence validation cycle.
	 * Checks graph consistency, context accuracy, process correctness,
	 * agent-state alignment, and more.
	 */
	validateCoherence(): ICoherenceValidationResult;

	/**
	 * Run a specific coherence check.
	 */
	runCoherenceCheck(checkType: CoherenceCheckType): ICoherenceCheckResult;

	/**
	 * Auto-repair any repairable coherence issues.
	 * Returns the number of issues that were auto-repaired.
	 */
	autoRepairCoherence(): number;

	/**
	 * Get the last coherence validation result.
	 */
	readonly lastCoherenceResult: ICoherenceValidationResult | undefined;

	/**
	 * Event that fires when a coherence check completes.
	 */
	readonly onDidValidateCoherence: Event<ICoherenceValidationResult>;

	// ─── System-Wide Queries ──────────────────────────────────────────────────

	/**
	 * Get a comprehensive system status summary.
	 * Includes all metrics, active intents, conflicts, health status, etc.
	 */
	getSystemStatus(): ISystemStatus;

	/**
	 * Get the total number of intents ever created.
	 */
	readonly totalIntentCount: number;

	/**
	 * Get the total number of decisions ever made.
	 */
	readonly totalDecisionCount: number;

	/**
	 * Get the total number of conflicts ever detected.
	 */
	readonly totalConflictCount: number;
}

// ─── Supporting Types ──────────────────────────────────────────────────────────

/**
 * Parameters for creating an intent.
 */
export interface IIntentCreateParams {
	readonly source: IntentSource;
	readonly priority: IntentPriority;
	readonly scope: IntentScope;
	readonly actionType: IntentActionType;
	readonly description: string;
	readonly agentId?: string;
	readonly processSessionId?: string;
	readonly targetUris?: readonly URI[];
	readonly parentIntentId?: string;
	readonly constraints?: readonly IIntentConstraint[];
	readonly requiresApproval?: boolean;
}

/**
 * Event bus statistics.
 */
export interface IEventBusStats {
	readonly totalEventsEmitted: number;
	readonly eventsPerSecond: number;
	readonly subscriberCount: number;
	readonly eventsByCategory: Readonly<Record<string, number>>;
	readonly eventsBySource: Readonly<Record<string, number>>;
}

/**
 * Comprehensive system status summary.
 */
export interface ISystemStatus {
	readonly timestamp: number;
	readonly loopPhase: ExecutionLoopPhase;
	readonly loopActive: boolean;
	readonly healthStatus: SystemHealthStatus;
	readonly healthMetrics: ISystemHealthMetrics;
	readonly activeIntents: number;
	readonly activeConflicts: number;
	readonly activeAgents: number;
	readonly activeProcesses: number;
	readonly graphNodes: number;
	readonly graphEdges: number;
	readonly pendingApprovals: number;
	readonly hasDrift: boolean;
	readonly coherent: boolean;
	readonly lastReconciliationAt: number | undefined;
	readonly lastCoherenceCheckAt: number | undefined;
}

// ═══════════════════════════════════════════════════════════════════════════════
// TASK 10 — MINIMAL DASHBOARD LAYER (View Models)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * View model for the Global Execution Timeline dashboard panel.
 * Shows the execution loop history with intent, decision, and conflict overlays.
 */
export interface IGlobalTimelineViewModel {
	/** Timeline entries (sorted by timestamp) */
	readonly entries: readonly ITimelineEntry[];
	/** Current loop phase */
	readonly currentPhase: ExecutionLoopPhase;
	/** Whether the loop is active */
	readonly loopActive: boolean;
	/** Timestamp of the view model snapshot */
	readonly snapshotAt: number;
}

/**
 * A single entry in the global execution timeline.
 */
export interface ITimelineEntry {
	readonly timestamp: number;
	readonly type: 'intent' | 'decision' | 'conflict' | 'health' | 'sync' | 'coherence' | 'loop-phase';
	readonly description: string;
	readonly relatedId: string | undefined;
	readonly severity: BrainEventSeverity;
}

/**
 * View model for the Active Intents dashboard panel.
 */
export interface IActiveIntentsViewModel {
	/** Active intents grouped by resolution state */
	readonly byResolution: Readonly<Record<string, readonly IIntent[]>>;
	/** Active intents grouped by source */
	readonly bySource: Readonly<Record<string, readonly IIntent[]>>;
	/** Active intents grouped by action type */
	readonly byActionType: Readonly<Record<string, readonly IIntent[]>>;
	/** Total active intent count */
	readonly totalActive: number;
	/** Pending approval count */
	readonly pendingApprovalCount: number;
	/** Snapshot timestamp */
	readonly snapshotAt: number;
}

/**
 * View model for the System Health Panel.
 */
export interface ISystemHealthViewModel {
	/** Current health status */
	readonly status: SystemHealthStatus;
	/** Current health metrics */
	readonly metrics: ISystemHealthMetrics;
	/** Active alerts */
	readonly activeAlerts: readonly IHealthAlert[];
	/** Health history (recent measurements) */
	readonly history: readonly ISystemHealthMetrics[];
	/** Snapshot timestamp */
	readonly snapshotAt: number;
}

/**
 * View model for the Conflict Queue.
 */
export interface IConflictQueueViewModel {
	/** Active conflicts */
	readonly conflicts: readonly IConflict[];
	/** Conflicts by severity */
	readonly bySeverity: Readonly<Record<string, readonly IConflict[]>>;
	/** Conflicts by type */
	readonly byType: Readonly<Record<string, readonly IConflict[]>>;
	/** Total active conflict count */
	readonly totalActive: number;
	/** Critical conflict count */
	readonly criticalCount: number;
	/** Snapshot timestamp */
	readonly snapshotAt: number;
}

/**
 * View model for the Live Execution Flow Map.
 * Shows the current state of all subsystems and their connections.
 */
export interface IExecutionFlowMapViewModel {
	/** Connected subsystem states */
	readonly subsystemStates: readonly ISubsystemState[];
	/** Active data flows between subsystems */
	readonly activeFlows: readonly ISubsystemFlow[];
	/** Current loop phase */
	readonly currentLoopPhase: ExecutionLoopPhase;
	/** Snapshot timestamp */
	readonly snapshotAt: number;
}

/**
 * State of a connected subsystem.
 */
export interface ISubsystemState {
	/** Subsystem name */
	readonly name: string;
	/** Whether the subsystem is active */
	readonly active: boolean;
	/** Health status of the subsystem */
	readonly health: 'healthy' | 'stressed' | 'overloaded' | 'error';
	/** Number of pending operations */
	readonly pendingOperations: number;
	/** Last activity timestamp */
	readonly lastActivityAt: number;
}

/**
 * A data flow between subsystems.
 */
export interface ISubsystemFlow {
	/** Source subsystem */
	readonly from: string;
	/** Target subsystem */
	readonly to: string;
	/** Flow type */
	readonly type: 'intent' | 'event' | 'state-sync' | 'observation';
	/** Flow rate (items per second) */
	readonly rate: number;
	/** Whether this flow is currently active */
	readonly active: boolean;
}

/**
 * Service interface for the Brain Dashboard UI.
 */
export interface IBrainDashboardService {
	readonly _serviceBrand: undefined;

	/** Get the Global Execution Timeline view model */
	getTimelineViewModel(): IGlobalTimelineViewModel;

	/** Get the Active Intents view model */
	getActiveIntentsViewModel(): IActiveIntentsViewModel;

	/** Get the System Health Panel view model */
	getSystemHealthViewModel(): ISystemHealthViewModel;

	/** Get the Conflict Queue view model */
	getConflictQueueViewModel(): IConflictQueueViewModel;

	/** Get the Live Execution Flow Map view model */
	getExecutionFlowMapViewModel(): IExecutionFlowMapViewModel;

	/** Event that fires when any dashboard view model changes */
	readonly onDidChangeDashboard: Event<string>;
}
