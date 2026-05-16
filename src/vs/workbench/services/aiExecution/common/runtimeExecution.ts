/*---------------------------------------------------------------------------------------------
 *  Runtime Execution -- Phase 21
 *  Real Vibecode -- AI-Native IDE
 *
 *  Real Execution Runtime, Live Agent Orchestration & Self-Healing Operating Loop.
 *  Defines ALL interfaces, enums, models, event contracts, runtime graphs,
 *  health structures, scheduler contracts, governance types, and recovery models
 *  for services #100 through #109.
 *
 *  Services:
 *    #100  IRuntimeKernelService            -- Core runtime heartbeat and orchestration kernel
 *    #101  IExecutionSchedulerService        -- Real execution scheduler
 *    #102  IAgentOrchestrationRuntimeService -- Live multi-agent coordination runtime
 *    #103  IRuntimePersistenceService        -- Persistent runtime continuity
 *    #104  IRuntimeHealthSupervisorService   -- Live runtime health orchestration
 *    #105  IRuntimeRecoveryOrchestratorService -- Autonomous recovery engine
 *    #106  IResourceGovernanceService        -- Runtime resource governance
 *    #107  IDistributedExecutionBridgeService -- Future-ready distributed runtime abstraction
 *    #108  IRuntimeGovernanceService         -- Operational runtime governance
 *    #109  IAutonomousEvolutionRuntimeService -- Safe runtime adaptation engine
 *
 *  Hard Rules:
 *    1.  No service may claim capabilities it does not implement
 *    2.  IDistributedExecutionBridgeService is an abstraction layer ONLY -- no fake cloud claims
 *    3.  IAutonomousEvolutionRuntimeService is strictly bounded runtime optimization -- NO AGI claims
 *    4.  All events follow VS Code Event<T> pattern
 *    5.  All services use createDecorator for DI registration
 *    6.  No em dashes anywhere -- use double hyphens instead
 *    7.  No placeholder or TODO methods -- every method has a real signature and purpose
 *--------------------------------------------------------------------------------------------*/

import { Event } from '../../../../base/common/event.js';
import { IDisposable } from '../../../../base/common/lifecycle.js';
import { CancellationToken } from '../../../../base/common/cancellation.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';

// ═══════════════════════════════════════════════════════════════════════════════
// ENUMS -- Runtime Lifecycle & Core Domain
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Stages of the runtime lifecycle, from initial boot through active
 * operation to coordinated shutdown.
 */
export const enum RuntimeLifecycleStage {
	/** Runtime is uninitialized -- no services started */
	Uninitialized = 'uninitialized',
	/** Bootstrapping core infrastructure and DI containers */
	Bootstrapping = 'bootstrapping',
	/** Initializing service dependencies and registering providers */
	Initializing = 'initializing',
	/** All services online, runtime entering steady-state */
	Ready = 'ready',
	/** Runtime is actively processing ticks and handling work */
	Active = 'active',
	/** Runtime is pausing -- draining in-flight work before suspend */
	Pausing = 'pausing',
	/** Runtime is paused -- no ticks processed, state preserved */
	Paused = 'paused',
	/** Runtime is resuming from a paused state */
	Resuming = 'resuming',
	/** Runtime is draining work for a graceful shutdown */
	Draining = 'draining',
	/** Runtime is shutting down -- final cleanup in progress */
	ShuttingDown = 'shutting-down',
	/** Runtime has terminated -- no further operations possible */
	Terminated = 'terminated',
	/** Runtime crashed and requires recovery intervention */
	Crashed = 'crashed',
}

/**
 * Priority levels for the execution scheduler. Higher-priority tasks
 * are dispatched first when contention exists.
 */
export const enum SchedulerPriority {
	/** Immediate -- system stability or data safety at stake */
	Immediate = 0,
	/** Critical -- must run before any other non-immediate work */
	Critical = 1,
	/** High -- user-visible or latency-sensitive operation */
	High = 2,
	/** Normal -- standard operational task */
	Normal = 3,
	/** Low -- background or batch work */
	Low = 4,
	/** Idle -- only when nothing else is pending */
	Idle = 5,
}

/**
 * Capabilities an agent can declare during registration with the
 * orchestration runtime. Used for capability-based routing.
 */
export const enum AgentCapability {
	/** Can edit files and apply mutations */
	FileEdit = 'file-edit',
	/** Can execute terminal commands and processes */
	ProcessExecution = 'process-execution',
	/** Can query and reason over workspace context */
	ContextQuery = 'context-query',
	/** Can plan multi-step execution sequences */
	Planning = 'planning',
	/** Can review and validate other agent outputs */
	Review = 'review',
	/** Can perform testing and validation */
	Testing = 'testing',
	/** Can debug and diagnose issues */
	Debugging = 'debugging',
	/** Can refactor code with semantic understanding */
	Refactoring = 'refactoring',
	/** Can search across the workspace */
	Search = 'search',
	/** Can coordinate other agents */
	Coordination = 'coordination',
}

/**
 * Health severity levels used by the runtime health supervisor.
 * Determines the response posture of the system.
 */
export const enum HealthLevel {
	/** All services operating within normal parameters */
	Optimal = 'optimal',
	/** Minor degradation -- some services slower than expected */
	Degraded = 'degraded',
	/** Significant issues -- some operations impaired */
	Unhealthy = 'unhealthy',
	/** Critical -- system stability at risk, recovery needed */
	Critical = 'critical',
	/** System is non-responsive, emergency procedures active */
	Emergency = 'emergency',
}

/**
 * Strategies the recovery orchestrator can employ when recovering
 * from a failure condition.
 */
export const enum RecoveryStrategy {
	/** Restart the failed subsystem from a known-good state */
	SubsystemRestart = 'subsystem-restart',
	/** Roll back to the last persisted checkpoint */
	CheckpointRollback = 'checkpoint-rollback',
	/** Enter degraded mode, shedding non-essential features */
	DegradedMode = 'degraded-mode',
	/** Quarantine the failing component and isolate its effects */
	QuarantineIsolate = 'quarantine-isolate',
	/** Escalate to a higher-level recovery orchestrator */
	Escalate = 'escalate',
	/** Replay the last known-good operations to restore state */
	ReplayRestore = 'replay-restore',
	/** Shed load to reduce pressure on failing components */
	LoadShed = 'load-shed',
	/** Gradually restore subsystems in dependency order */
	GradualRestore = 'gradual-restore',
}

/**
 * Types of resource budgets tracked by the resource governance service.
 */
export const enum ResourceBudgetType {
	/** CPU time allocation in milliseconds per tick */
	CpuTime = 'cpu-time',
	/** Memory allocation in bytes */
	Memory = 'memory',
	/** Concurrent execution slots */
	ConcurrencySlots = 'concurrency-slots',
	/** I/O operations per second */
	IoOperations = 'io-operations',
	/** Network bandwidth in bytes per second */
	NetworkBandwidth = 'network-bandwidth',
	/** Queue depth -- maximum pending operations */
	QueueDepth = 'queue-depth',
	/** Event throughput -- events processed per second */
	EventThroughput = 'event-throughput',
}

/**
 * Governance policy categories enforced by the runtime governance service.
 */
export const enum GovernancePolicy {
	/** Prevent execution of untrusted or unsigned code */
	UnsafeExecutionPrevention = 'unsafe-execution-prevention',
	/** Enforce resource limits and quotas */
	ResourceLimits = 'resource-limits',
	/** Restrict escalation chains to prevent runaway recovery */
	EscalationRestriction = 'escalation-restriction',
	/** Validate execution boundaries and scopes */
	ExecutionBoundary = 'execution-boundary',
	/** Enforce audit logging for all governance decisions */
	AuditLogging = 'audit-logging',
	/** Validate permissions before allowing operations */
	PermissionValidation = 'permission-validation',
	/** Enforce trust levels for execution contexts */
	TrustEnforcement = 'trust-enforcement',
	/** Rate limit certain operations to prevent abuse */
	RateLimiting = 'rate-limiting',
}

/**
 * Boundaries that constrain the autonomous evolution runtime service.
 * These ensure adaptation remains safe and bounded.
 */
export const enum EvolutionBoundary {
	/** Maximum percentage a parameter can change in one adaptation cycle */
	MaxChangePercent = 'max-change-percent',
	/** Minimum time between adaptation cycles in milliseconds */
	MinAdaptationIntervalMs = 'min-adaptation-interval-ms',
	/** Maximum number of adaptation cycles per session */
	MaxAdaptationsPerSession = 'max-adaptations-per-session',
	/** Parameters that are never allowed to change */
	ImmutableParameters = 'immutable-parameters',
	/** Maximum rollback depth for regression recovery */
	MaxRollbackDepth = 'max-rollback-depth',
	/** Whether human approval is required for changes above threshold */
	ApprovalThreshold = 'approval-threshold',
	/** Maximum consecutive regressions before freezing evolution */
	RegressionFreezeLimit = 'regression-freeze-limit',
}

/**
 * Status of a distributed execution node in the bridge abstraction.
 */
export const enum ExecutionNodeStatus {
	/** Node is online and accepting work */
	Online = 'online',
	/** Node is starting up and not yet ready */
	Starting = 'starting',
	/** Node is temporarily unavailable */
	Unavailable = 'unavailable',
	/** Node is draining work before shutdown */
	Draining = 'draining',
	/** Node is offline */
	Offline = 'offline',
	/** Node status is unknown -- missed heartbeats */
	Unknown = 'unknown',
}

/**
 * Synchronization boundary types for distributed execution.
 */
export const enum SyncBoundaryType {
	/** Strong consistency -- all nodes must agree before proceeding */
	Strong = 'strong',
	/** Eventual consistency -- nodes converge over time */
	Eventual = 'eventual',
	/** Causal consistency -- preserves causal ordering */
	Causal = 'causal',
	/** Read-your-writes consistency */
	ReadYourWrites = 'read-your-writes',
}

/**
 * Origin of a runtime tick, indicating what triggered the tick.
 */
export const enum TickOrigin {
	/** Regular cadence-based tick from the scheduler */
	Cadence = 'cadence',
	/** Tick forced by an external caller */
	Forced = 'forced',
	/** Tick triggered by a recovery procedure */
	Recovery = 'recovery',
	/** Tick triggered to process an urgent work item */
	Urgent = 'urgent',
	/** Tick for a shutdown drain cycle */
	Drain = 'drain',
}

/**
 * State of an agent within the orchestration runtime.
 */
export const enum AgentRuntimeState {
	/** Agent is registered but idle */
	Idle = 'idle',
	/** Agent is actively executing a task */
	Executing = 'executing',
	/** Agent is waiting for a dependency or signal */
	Waiting = 'waiting',
	/** Agent is suspended -- paused by the runtime */
	Suspended = 'suspended',
	/** Agent has failed and is awaiting recovery */
	Failed = 'failed',
	/** Agent has been deregistered */
	Deregistered = 'deregistered',
}

/**
 * Thermal state model for runtime health -- indicates how "hot" the system is.
 */
export const enum ThermalState {
	/** System is cool -- plenty of headroom */
	Cool = 'cool',
	/** System is warm -- operating normally under load */
	Warm = 'warm',
	/** System is hot -- approaching limits, throttle recommended */
	Hot = 'hot',
	/** System is overheating -- mandatory throttling active */
	Overheated = 'overheated',
	/** System is in thermal shutdown -- only critical work allowed */
	ThermalShutdown = 'thermal-shutdown',
}

/**
 * Pressure level for queue and resource backpressure.
 */
export const enum PressureLevel {
	/** No pressure -- queues are healthy */
	None = 'none',
	/** Low pressure -- queues are filling but manageable */
	Low = 'low',
	/** Medium pressure -- some throttling may be needed */
	Medium = 'medium',
	/** High pressure -- active throttling required */
	High = 'high',
	/** Critical pressure -- emergency measures needed */
	Critical = 'critical',
}

// ═══════════════════════════════════════════════════════════════════════════════
// MODEL TYPES -- Core Data Structures
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * A single tick of the runtime kernel. Records what the kernel did
 * during one heartbeat cycle.
 */
export interface RuntimeTick {
	/** Monotonically increasing tick sequence number */
	readonly tickId: number;
	/** Timestamp when the tick started */
	readonly startedAt: number;
	/** Timestamp when the tick completed */
	readonly completedAt: number | undefined;
	/** What triggered this tick */
	readonly origin: TickOrigin;
	/** The lifecycle stage at tick start */
	readonly startStage: RuntimeLifecycleStage;
	/** The lifecycle stage at tick end */
	readonly endStage: RuntimeLifecycleStage | undefined;
	/** Number of scheduled tasks dispatched this tick */
	readonly tasksDispatched: number;
	/** Number of tasks completed this tick */
	readonly tasksCompleted: number;
	/** Number of active agents during this tick */
	readonly activeAgentCount: number;
	/** Health level at tick end */
	readonly healthLevel: HealthLevel | undefined;
	/** Whether a deadlock was detected during this tick */
	readonly deadlockDetected: boolean;
	/** Duration of the tick in milliseconds */
	readonly durationMs: number | undefined;
	/** Any errors encountered during the tick */
	readonly errors: readonly RuntimeTickError[];
}

/**
 * An error recorded during a runtime tick.
 */
export interface RuntimeTickError {
	/** Unique error instance ID */
	readonly errorId: string;
	/** The service that produced the error */
	readonly sourceService: string;
	/** Human-readable error message */
	readonly message: string;
	/** Whether the error is recoverable */
	readonly recoverable: boolean;
	/** Timestamp */
	readonly timestamp: number;
}

/**
 * A task managed by the execution scheduler. Represents a unit of
 * work with priority, deadlines, and execution constraints.
 */
export interface ScheduledTask {
	/** Unique task identifier */
	readonly taskId: string;
	/** Task priority for scheduling */
	priority: SchedulerPriority;
	/** The service or agent that owns this task */
	readonly ownerId: string;
	/** Human-readable description of the task */
	readonly description: string;
	/** Timestamp when the task was enqueued */
	readonly enqueuedAt: number;
	/** Timestamp when the task started execution */
	readonly startedAt: number | undefined;
	/** Timestamp when the task completed */
	readonly completedAt: number | undefined;
	/** Maximum allowed duration in milliseconds */
	readonly deadlineMs: number;
	/** Number of times this task has been retried */
	retryCount: number;
	/** Maximum allowed retries */
	readonly maxRetries: number;
	/** Time in ms this task has waited in the queue (aging metric) */
	readonly queueAgeMs: number;
	/** Weighted fairness score for arbitration */
	readonly fairnessWeight: number;
	/** Execution window constraint -- only run between these times */
	readonly executionWindow: IExecutionWindow | undefined;
	/** Required capabilities to execute this task */
	readonly requiredCapabilities: readonly AgentCapability[];
	/** Whether the task is currently executing */
	readonly isExecuting: boolean;
	/** Cancellation token for aborting the task */
	readonly cancellationToken: CancellationToken;
}

/**
 * An execution window constraining when a task may run.
 */
export interface IExecutionWindow {
	/** Earliest time the task may start (epoch ms) */
	readonly notBefore: number;
	/** Latest time the task must start (epoch ms) */
	readonly notAfter: number;
	/** Whether the window is strict or advisory */
	readonly strict: boolean;
}

/**
 * A descriptor for an agent registered with the orchestration runtime.
 * Contains all metadata needed for capability routing and isolation.
 */
export interface AgentDescriptor {
	/** Unique agent identifier */
	readonly agentId: string;
	/** Human-readable agent name */
	readonly name: string;
	/** Version of the agent implementation */
	readonly version: string;
	/** Declared capabilities for routing */
	readonly capabilities: readonly AgentCapability[];
	/** Current runtime state */
	state: AgentRuntimeState;
	/** Maximum concurrent tasks this agent can handle */
	readonly maxConcurrency: number;
	/** Current number of active tasks */
	activeTaskCount: number;
	/** Reliability score (0.0 -- 1.0) based on historical success */
	readonly reliabilityScore: number;
	/** Average execution latency in milliseconds */
	readonly avgLatencyMs: number;
	/** Isolation group -- agents in the same group share failure domains */
	readonly isolationGroup: string;
	/** Timestamp when the agent was registered */
	readonly registeredAt: number;
	/** Timestamp of last heartbeat from this agent */
	lastHeartbeatAt: number;
	/** Tags for additional routing metadata */
	readonly tags: Readonly<Record<string, string>>;
}

/**
 * A snapshot of the entire runtime state, used for persistence and recovery.
 */
export interface RuntimeSnapshot {
	/** Unique snapshot identifier */
	readonly snapshotId: string;
	/** Timestamp when the snapshot was taken */
	readonly takenAt: number;
	/** Runtime lifecycle stage at snapshot time */
	readonly lifecycleStage: RuntimeLifecycleStage;
	/** Tick ID at snapshot time */
	readonly tickId: number;
	/** All scheduled tasks at snapshot time */
	readonly scheduledTasks: readonly ScheduledTask[];
	/** All registered agents at snapshot time */
	readonly registeredAgents: readonly AgentDescriptor[];
	/** Health level at snapshot time */
	readonly healthLevel: HealthLevel;
	/** Resource budgets at snapshot time */
	readonly resourceBudgets: ReadonlyMap<ResourceBudgetType, IResourceBudget>;
	/** Active recovery plans at snapshot time */
	readonly activeRecoveryPlans: readonly IRecoveryPlan[];
	/** Governance violations at snapshot time */
	readonly governanceViolations: readonly IGovernanceViolation[];
	/** Whether the snapshot is crash-safe (written atomically) */
	readonly isCrashSafe: boolean;
	/** Checksum for corruption validation */
	readonly checksum: string;
	/** Size of the serialized snapshot in bytes */
	readonly sizeBytes: number;
}

/**
 * A health report produced by the runtime health supervisor,
 * covering all monitored services.
 */
export interface HealthReport {
	/** Unique report identifier */
	readonly reportId: string;
	/** Timestamp when the report was generated */
	readonly generatedAt: number;
	/** Overall health level */
	readonly overallLevel: HealthLevel;
	/** Overall health score (0.0 -- 1.0) */
	readonly overallScore: number;
	/** Per-service health scores */
	readonly serviceHealth: ReadonlyMap<string, IServiceHealthEntry>;
	/** Total number of services monitored */
	readonly totalServicesMonitored: number;
	/** Number of services in optimal health */
	readonly optimalCount: number;
	/** Number of services in degraded health */
	readonly degradedCount: number;
	/** Number of services in unhealthy or worse state */
	readonly unhealthyCount: number;
	/** Current thermal state of the system */
	readonly thermalState: ThermalState;
	/** Current queue pressure level */
	readonly queuePressure: PressureLevel;
	/** Detected anomalies */
	readonly anomalies: readonly IHealthAnomaly[];
	/** Instability forecasts */
	readonly forecasts: readonly IInstabilityForecast[];
	/** Whether cascading failure prevention is active */
	readonly cascadingPreventionActive: boolean;
	/** Duration of the health check in milliseconds */
	readonly checkDurationMs: number;
}

/**
 * Health entry for a single monitored service.
 */
export interface IServiceHealthEntry {
	/** Service identifier */
	readonly serviceId: string;
	/** Health level */
	readonly level: HealthLevel;
	/** Health score (0.0 -- 1.0) */
	readonly score: number;
	/** Last response time in milliseconds */
	readonly lastResponseMs: number;
	/** Error rate over the observation window */
	readonly errorRate: number;
	/** Whether the service heartbeat is current */
	readonly heartbeatCurrent: boolean;
	/** Last heartbeat timestamp */
	readonly lastHeartbeatAt: number;
	/** Saturation level (0.0 -- 1.0) */
	readonly saturation: number;
}

/**
 * An anomaly detected by the health supervisor.
 */
export interface IHealthAnomaly {
	/** Unique anomaly identifier */
	readonly anomalyId: string;
	/** The service where the anomaly was detected */
	readonly serviceId: string;
	/** Metric that is anomalous */
	readonly metric: string;
	/** Expected value range */
	readonly expectedRange: readonly [number, number];
	/** Actual observed value */
	readonly actualValue: number;
	/** Deviation score (0.0 -- 1.0) */
	readonly deviationScore: number;
	/** Timestamp when the anomaly was detected */
	readonly detectedAt: number;
	/** Suggested corrective action */
	readonly suggestedAction: string;
}

/**
 * An instability forecast predicting future degradation.
 */
export interface IInstabilityForecast {
	/** Unique forecast identifier */
	readonly forecastId: string;
	/** The service predicted to become unstable */
	readonly serviceId: string;
	/** Current health level */
	readonly currentLevel: HealthLevel;
	/** Predicted health level */
	readonly predictedLevel: HealthLevel;
	/** Time until predicted degradation in milliseconds */
	readonly timeToDegradationMs: number;
	/** Confidence of the prediction (0.0 -- 1.0) */
	readonly confidence: number;
	/** Contributing factors */
	readonly factors: readonly string[];
	/** Timestamp when the forecast was generated */
	readonly generatedAt: number;
}

/**
 * A recovery plan created by the recovery orchestrator.
 */
export interface IRecoveryPlan {
	/** Unique plan identifier */
	readonly planId: string;
	/** The failure condition that triggered this plan */
	readonly triggerCondition: IRecoveryTrigger;
	/** Strategy to employ */
	readonly strategy: RecoveryStrategy;
	/** Ordered steps in the recovery plan */
	readonly steps: readonly IRecoveryStep[];
	/** Estimated duration in milliseconds */
	readonly estimatedDurationMs: number;
	/** Current step index (progress tracking) */
	currentStepIndex: number;
	/** Whether the plan has been approved (if approval required) */
	readonly approved: boolean;
	/** Who approved the plan */
	readonly approvedBy: string | undefined;
	/** Timestamp when the plan was created */
	readonly createdAt: number;
	/** Timestamp when the plan completed */
	readonly completedAt: number | undefined;
	/** Result of the recovery plan */
	result: RecoveryPlanResult | undefined;
	/** Cooldown period before another recovery attempt (ms) */
	readonly cooldownMs: number;
	/** Maximum escalation depth */
	readonly maxEscalationDepth: number;
	/** Current escalation depth */
	currentEscalationDepth: number;
}

/**
 * The result of executing a recovery plan.
 */
export const enum RecoveryPlanResult {
	/** All steps completed successfully */
	Success = 'success',
	/** Some steps succeeded, partial recovery achieved */
	Partial = 'partial',
	/** Recovery failed, escalation needed */
	Failed = 'failed',
	/** Recovery was cancelled */
	Cancelled = 'cancelled',
	/** Recovery timed out */
	TimedOut = 'timed-out',
}

/**
 * The condition that triggered a recovery plan.
 */
export interface IRecoveryTrigger {
	/** Unique trigger identifier */
	readonly triggerId: string;
	/** The service that triggered the recovery */
	readonly sourceService: string;
	/** Description of the failure condition */
	readonly description: string;
	/** Health level at the time of trigger */
	readonly healthLevel: HealthLevel;
	/** Timestamp when the condition was detected */
	readonly detectedAt: number;
	/** Related anomaly IDs */
	readonly relatedAnomalyIds: readonly string[];
	/** Whether this is a recurring trigger */
	readonly isRecurring: boolean;
}

/**
 * A single step in a recovery plan.
 */
export interface IRecoveryStep {
	/** Unique step identifier */
	readonly stepId: string;
	/** Description of what this step does */
	readonly description: string;
	/** The target service or subsystem */
	readonly targetService: string;
	/** The action to perform */
	readonly action: RecoveryStepAction;
	/** Dependencies -- step IDs that must complete first */
	readonly dependsOn: readonly string[];
	/** Timeout for this step in milliseconds */
	readonly timeoutMs: number;
	/** Whether this step can be skipped on failure */
	readonly skippable: boolean;
	/** Current status */
	status: RecoveryStepStatus;
	/** Timestamp when execution started */
	startedAt: number | undefined;
	/** Timestamp when execution completed */
	completedAt: number | undefined;
	/** Error message if the step failed */
	errorMessage: string | undefined;
}

/**
 * Actions a recovery step can perform.
 */
export const enum RecoveryStepAction {
	/** Restart the target service */
	Restart = 'restart',
	/** Roll back to a checkpoint */
	Rollback = 'rollback',
	/** Enter degraded mode for the target */
	EnterDegradedMode = 'enter-degraded-mode',
	/** Quarantine the target */
	Quarantine = 'quarantine',
	/** Shed load from the target */
	LoadShed = 'load-shed',
	/** Validate the target's state */
	Validate = 'validate',
	/** Wait for a condition to be met */
	WaitForCondition = 'wait-for-condition',
	/** Escalate to a higher-level recovery */
	Escalate = 'escalate',
}

/**
 * Status of a recovery step.
 */
export const enum RecoveryStepStatus {
	/** Step has not started */
	Pending = 'pending',
	/** Step is currently executing */
	Executing = 'executing',
	/** Step completed successfully */
	Completed = 'completed',
	/** Step failed */
	Failed = 'failed',
	/** Step was skipped */
	Skipped = 'skipped',
	/** Step is waiting for dependencies */
	Waiting = 'waiting',
}

/**
 * A resource budget allocation managed by the governance service.
 */
export interface IResourceBudget {
	/** The type of resource */
	readonly type: ResourceBudgetType;
	/** Total budget allocated */
	readonly totalAllocated: number;
	/** Currently consumed amount */
	readonly consumed: number;
	/** Reserved for critical operations */
	readonly reserved: number;
	/** Available for general use */
	readonly available: number;
	/** Burst allowance -- temporary over-allocation allowed */
	readonly burstAllowance: number;
	/** Current burst usage */
	readonly burstUsed: number;
	/** The pressure level for this resource */
	readonly pressureLevel: PressureLevel;
	/** Per-owner allocations */
	readonly ownerAllocations: ReadonlyMap<string, number>;
}

/**
 * A governance violation detected by the runtime governance service.
 */
export interface IGovernanceViolation {
	/** Unique violation identifier */
	readonly violationId: string;
	/** The policy that was violated */
	readonly policy: GovernancePolicy;
	/** The service or agent that committed the violation */
	readonly violatorId: string;
	/** Description of the violation */
	readonly description: string;
	/** Severity of the violation */
	readonly severity: GovernanceViolationSeverity;
	/** Timestamp when the violation was detected */
	readonly detectedAt: number;
	/** Whether the violation was blocked before execution */
	readonly wasBlocked: boolean;
	/** Remediation action taken */
	readonly remediation: string;
	/** Whether this violation requires human review */
	readonly requiresHumanReview: boolean;
}

/**
 * Severity of a governance violation.
 */
export const enum GovernanceViolationSeverity {
	/** Advisory -- policy guidance not followed */
	Advisory = 'advisory',
	/** Warning -- policy was violated but no harm done */
	Warning = 'warning',
	/** Error -- policy violation caused operational impact */
	Error = 'error',
	/** Critical -- policy violation threatens system integrity */
	Critical = 'critical',
}

/**
 * A record of an autonomous evolution adaptation applied to runtime parameters.
 */
export interface EvolutionRecord {
	/** Unique record identifier */
	readonly recordId: string;
	/** The parameter that was adapted */
	readonly parameterName: string;
	/** Previous value */
	readonly previousValue: number;
	/** New value after adaptation */
	readonly newValue: number;
	/** The boundary that constrained this change */
	readonly appliedBoundary: EvolutionBoundary;
	/** Rationale for the adaptation */
	readonly rationale: string;
	/** Whether the adaptation improved performance */
	readonly improvedPerformance: boolean | undefined;
	/** Regression detected after adaptation */
	readonly regressionDetected: boolean;
	/** Whether the change was rolled back */
	readonly rolledBack: boolean;
	/** Timestamp when the adaptation was applied */
	readonly appliedAt: number;
	/** Timestamp when the adaptation was validated */
	readonly validatedAt: number | undefined;
	/** Workload characteristics that motivated this adaptation */
	readonly workloadSignature: string;
	/** Heuristic that drove the adaptation decision */
	readonly appliedHeuristic: string;
}

/**
 * An execution node in the distributed execution bridge abstraction.
 * Represents a potential remote execution target.
 */
export interface IExecutionNode {
	/** Unique node identifier */
	readonly nodeId: string;
	/** Human-readable node name */
	readonly name: string;
	/** Current status of the node */
	status: ExecutionNodeStatus;
	/** Declared capabilities of this node */
	readonly capabilities: readonly AgentCapability[];
	/** Maximum concurrent tasks this node can handle */
	readonly maxConcurrency: number;
	/** Current active task count */
	activeTaskCount: number;
	/** Last heartbeat timestamp from this node */
	lastHeartbeatAt: number;
	/** Average response latency in milliseconds */
	readonly avgLatencyMs: number;
	/** Reliability score (0.0 -- 1.0) */
	readonly reliabilityScore: number;
	/** Synchronization boundary type for this node */
	readonly syncBoundary: SyncBoundaryType;
	/** Eventual consistency lag in milliseconds (if applicable) */
	readonly consistencyLagMs: number;
	/** Tags for routing and placement decisions */
	readonly tags: Readonly<Record<string, string>>;
}

/**
 * A distributed queue model for the execution bridge.
 */
export interface IDistributedQueueModel {
	/** Unique queue identifier */
	readonly queueId: string;
	/** Nodes participating in this distributed queue */
	readonly participatingNodes: readonly string[];
	/** Total depth across all nodes */
	readonly totalDepth: number;
	/** Per-node depths */
	readonly nodeDepths: ReadonlyMap<string, number>;
	/** Synchronization boundary for this queue */
	readonly syncBoundary: SyncBoundaryType;
	/** Whether workload redistribution is in progress */
	readonly redistributionInProgress: boolean;
	/** Estimated consistency lag across nodes in milliseconds */
	readonly estimatedConsistencyLagMs: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// GRAPH STRUCTURES -- Runtime State & Dependency Graphs
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * The kernel state graph -- a directed graph representing the runtime
 * kernel's view of all active components and their relationships.
 * Nodes represent services/agents; edges represent dependencies.
 */
export interface IKernelStateGraph {
	/** Graph version, incremented on each mutation */
	version: number;
	/** All nodes in the graph */
	readonly nodes: ReadonlyMap<string, IKernelStateNode>;
	/** All edges in the graph */
	readonly edges: ReadonlyMap<string, IKernelStateEdge>;
	/** Timestamp when the graph was last updated */
	readonly lastUpdatedAt: number;
	/** Whether the graph is currently consistent */
	readonly isConsistent: boolean;
}

/**
 * A node in the kernel state graph.
 */
export interface IKernelStateNode {
	/** Node identifier (typically service ID) */
	readonly nodeId: string;
	/** Display name */
	readonly name: string;
	/** Current health level */
	readonly healthLevel: HealthLevel;
	/** Current lifecycle stage */
	readonly lifecycleStage: RuntimeLifecycleStage;
	/** Whether this node is currently active */
	readonly isActive: boolean;
	/** Timestamp of last state change */
	readonly lastStateChangedAt: number;
	/** Number of incoming dependency edges */
	readonly inDegree: number;
	/** Number of outgoing dependency edges */
	readonly outDegree: number;
}

/**
 * An edge in the kernel state graph.
 */
export interface IKernelStateEdge {
	/** Edge identifier */
	readonly edgeId: string;
	/** Source node ID */
	readonly sourceId: string;
	/** Target node ID */
	readonly targetId: string;
	/** Type of dependency */
	readonly dependencyType: 'requires' | 'provides' | 'notifies' | 'monitors';
	/** Whether this dependency is currently healthy */
	readonly isHealthy: boolean;
	/** Latency of communication along this edge in milliseconds */
	readonly latencyMs: number;
}

/**
 * The agent coordination graph -- represents the live coordination
 * topology between registered agents in the orchestration runtime.
 */
export interface IAgentCoordinationGraph {
	/** Graph version, incremented on each mutation */
	version: number;
	/** Agent nodes indexed by agent ID */
	readonly agentNodes: ReadonlyMap<string, IAgentCoordinationNode>;
	/** Coordination edges between agents */
	readonly coordinationEdges: ReadonlyMap<string, IAgentCoordinationEdge>;
	/** Timestamp when the graph was last updated */
	readonly lastUpdatedAt: number;
	/** Number of active coordination channels */
	readonly activeChannelCount: number;
}

/**
 * A node in the agent coordination graph.
 */
export interface IAgentCoordinationNode {
	/** Agent ID */
	readonly agentId: string;
	/** Current runtime state */
	readonly state: AgentRuntimeState;
	/** Isolation group */
	readonly isolationGroup: string;
	/** Number of tasks currently owned */
	readonly ownedTaskCount: number;
	/** Number of active inter-agent channels */
	readonly activeChannelCount: number;
	/** Failure containment score (0.0 -- 1.0) */
	readonly containmentScore: number;
}

/**
 * An edge in the agent coordination graph.
 */
export interface IAgentCoordinationEdge {
	/** Edge identifier */
	readonly edgeId: string;
	/** Source agent ID */
	readonly sourceAgentId: string;
	/** Target agent ID */
	readonly targetAgentId: string;
	/** Type of coordination channel */
	readonly channelType: 'delegation' | 'communication' | 'ownership-transfer' | 'failure-containment';
	/** Whether the channel is currently active */
	readonly isActive: boolean;
	/** Number of messages on this channel */
	readonly messageCount: number;
	/** Timestamp of last message */
	readonly lastMessageAt: number;
}

/**
 * The recovery dependency graph -- represents the ordering
 * constraints for subsystem recovery. Edges indicate that the source
 * must be recovered before the target.
 */
export interface IRecoveryDependencyGraph {
	/** Graph version */
	version: number;
	/** Subsystem nodes */
	readonly subsystemNodes: ReadonlyMap<string, IRecoverySubsystemNode>;
	/** Recovery ordering edges */
	readonly orderingEdges: ReadonlyMap<string, IRecoveryOrderingEdge>;
	/** The current topological recovery order */
	readonly recoveryOrder: readonly string[];
	/** Timestamp when the graph was last updated */
	readonly lastUpdatedAt: number;
}

/**
 * A node in the recovery dependency graph.
 */
export interface IRecoverySubsystemNode {
	/** Subsystem identifier */
	readonly subsystemId: string;
	/** Whether this subsystem is currently healthy */
	readonly isHealthy: boolean;
	/** Whether this subsystem is currently in recovery */
	readonly isRecovering: boolean;
	/** Current recovery step index */
	readonly currentRecoveryStep: number;
	/** Total recovery steps needed */
	readonly totalRecoverySteps: number;
}

/**
 * An edge in the recovery dependency graph.
 */
export interface IRecoveryOrderingEdge {
	/** Edge identifier */
	readonly edgeId: string;
	/** Subsystem that must recover first */
	readonly mustRecoverFirst: string;
	/** Subsystem that depends on the first */
	readonly dependsOnFirst: string;
	/** Reason for this ordering constraint */
	readonly reason: string;
	/** Whether this ordering is strict or advisory */
	readonly strict: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════════
// EVENT CONTRACTS -- Typed Event Payloads
// ═══════════════════════════════════════════════════════════════════════════════

/** Event payload for when a runtime tick completes */
export interface IRuntimeTickEvent {
	readonly tick: RuntimeTick;
}

/** Event payload for when the scheduler drains its queue */
export interface ISchedulerDrainEvent {
	readonly tasksDrained: number;
	readonly durationMs: number;
	readonly hadStarvation: boolean;
}

/** Event payload for when an agent is registered */
export interface IAgentRegisteredEvent {
	readonly agent: AgentDescriptor;
}

/** Event payload for when an agent is deregistered */
export interface IAgentDeregisteredEvent {
	readonly agentId: string;
	readonly reason: string;
}

/** Event payload for when health degrades */
export interface IHealthDegradedEvent {
	readonly previousLevel: HealthLevel;
	readonly currentLevel: HealthLevel;
	readonly affectedServices: readonly string[];
}

/** Event payload for when recovery is triggered */
export interface IRecoveryTriggeredEvent {
	readonly plan: IRecoveryPlan;
	readonly trigger: IRecoveryTrigger;
}

/** Event payload for when recovery completes */
export interface IRecoveryCompletedEvent {
	readonly planId: string;
	readonly result: RecoveryPlanResult;
	readonly durationMs: number;
}

/** Event payload for when a governance violation is detected */
export interface IGovernanceViolationEvent {
	readonly violation: IGovernanceViolation;
}

/** Event payload for when an evolution adaptation is applied */
export interface IEvolutionAppliedEvent {
	readonly record: EvolutionRecord;
}

/** Event payload for when a resource budget changes */
export interface IResourceBudgetChangedEvent {
	readonly budgetType: ResourceBudgetType;
	readonly previousPressure: PressureLevel;
	readonly currentPressure: PressureLevel;
}

/** Event payload for when the lifecycle stage changes */
export interface ILifecycleStageChangedEvent {
	readonly previousStage: RuntimeLifecycleStage;
	readonly currentStage: RuntimeLifecycleStage;
	readonly reason: string;
}

/** Event payload for when a deadlock is detected */
export interface IDeadlockDetectedEvent {
	readonly involvedServices: readonly string[];
	readonly description: string;
	readonly detectedAt: number;
}

/** Event payload for when thermal state changes */
export interface IThermalStateChangedEvent {
	readonly previousState: ThermalState;
	readonly currentState: ThermalState;
	readonly triggerService: string;
}

/** Event payload for when a distributed node changes status */
export interface IExecutionNodeStatusChangedEvent {
	readonly nodeId: string;
	readonly previousStatus: ExecutionNodeStatus;
	readonly currentStatus: ExecutionNodeStatus;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SERVICE #100 -- IRuntimeKernelService
// Core runtime heartbeat and orchestration kernel
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Configuration for the runtime kernel.
 */
export interface IRuntimeKernelConfig {
	/** Tick interval in milliseconds (default: 100) */
	readonly tickIntervalMs: number;
	/** Maximum consecutive ticks without yielding (default: 50) */
	readonly maxTicksPerCycle: number;
	/** Heartbeat timeout for services in milliseconds (default: 5000) */
	readonly serviceHeartbeatTimeoutMs: number;
	/** Whether the kernel starts in active mode */
	readonly startActive: boolean;
	/** Deadlock detection interval in milliseconds (default: 2000) */
	readonly deadlockDetectionIntervalMs: number;
	/** Maximum time allowed for coordinated shutdown in milliseconds */
	readonly shutdownTimeoutMs: number;
	/** Minimum time between lifecycle stage transitions in milliseconds */
	readonly minStageTransitionMs: number;
}

export const IRuntimeKernelService = createDecorator<IRuntimeKernelService>('runtimeKernelService');

/**
 * IRuntimeKernelService (#100) -- The core runtime heartbeat and orchestration kernel.
 *
 * Manages the runtime tick loop, lifecycle stage transitions, service heartbeat
 * monitoring, coordinated pause/resume, deadlock detection, and the kernel state
 * graph. This is the central orchestrator that keeps the runtime alive and
 * transitions between lifecycle stages safely.
 */
export interface IRuntimeKernelService {
	readonly _serviceBrand: undefined;

	/** Current lifecycle stage */
	readonly lifecycleStage: RuntimeLifecycleStage;

	/** Current tick ID (monotonically increasing) */
	readonly currentTickId: number;

	/** Whether the kernel is currently ticking */
	readonly isTicking: boolean;

	/** The kernel state graph */
	readonly stateGraph: IKernelStateGraph;

	/** Kernel configuration */
	readonly config: IRuntimeKernelConfig;

	/** Event: a runtime tick completed */
	readonly onRuntimeTick: Event<IRuntimeTickEvent>;

	/** Event: lifecycle stage changed */
	readonly onLifecycleStageChanged: Event<ILifecycleStageChangedEvent>;

	/** Event: deadlock detected */
	readonly onDeadlockDetected: Event<IDeadlockDetectedEvent>;

	/** Event: kernel paused */
	readonly onKernelPaused: Event<void>;

	/** Event: kernel resumed */
	readonly onKernelResumed: Event<void>;

	/** Start the runtime kernel tick loop */
	start(): void;

	/** Pause the kernel -- drain in-flight work then suspend */
	pause(): Promise<void>;

	/** Resume the kernel from a paused state */
	resume(): void;

	/** Initiate coordinated shutdown -- drains work then terminates */
	shutdown(): Promise<void>;

	/** Force an immediate tick (bypasses cadence) */
	forceTick(origin: TickOrigin): RuntimeTick;

	/** Register a service heartbeat */
	registerHeartbeat(serviceId: string): void;

	/** Get services with stale heartbeats */
	getStaleServices(): readonly string[];

	/** Detect deadlocks in the current state graph */
	detectDeadlocks(): readonly IDeadlockDetectedEvent[];

	/** Get recent ticks for diagnostics */
	getRecentTicks(count: number): readonly RuntimeTick[];

	/** Get the uptime in milliseconds since the kernel started */
	readonly uptimeMs: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SERVICE #101 -- IExecutionSchedulerService
// Real execution scheduler
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Configuration for the execution scheduler.
 */
export interface IExecutionSchedulerConfig {
	/** Maximum concurrent tasks (default: 10) */
	readonly maxConcurrency: number;
	/** Time slice per task in milliseconds (default: 200) */
	readonly timeSliceMs: number;
	/** Queue aging threshold in milliseconds -- tasks above this get priority boost */
	readonly queueAgingThresholdMs: number;
	/** Starvation prevention interval in milliseconds */
	readonly starvationPreventionIntervalMs: number;
	/** Maximum queue depth before backpressure */
	readonly maxQueueDepth: number;
	/** Default retry delay in milliseconds */
	readonly defaultRetryDelayMs: number;
	/** Weighted fairness base score (0.0 -- 1.0) */
	readonly fairnessBaseScore: number;
	/** Whether scheduling telemetry is enabled */
	readonly telemetryEnabled: boolean;
}

/**
 * Scheduler telemetry snapshot.
 */
export interface ISchedulerTelemetry {
	readonly totalTasksEnqueued: number;
	readonly totalTasksCompleted: number;
	readonly totalTasksFailed: number;
	readonly totalTasksRetried: number;
	readonly averageQueueWaitMs: number;
	readonly averageExecutionMs: number;
	readonly currentQueueDepth: number;
	readonly currentConcurrency: number;
	readonly starvationEvents: number;
	readonly timestamp: number;
}

export const IExecutionSchedulerService = createDecorator<IExecutionSchedulerService>('executionSchedulerService');

/**
 * IExecutionSchedulerService (#101) -- The real execution scheduler.
 *
 * Manages task queue prioritization, concurrency limits, execution windows,
 * starvation prevention, deferred execution, retry scheduling, queue aging,
 * execution arbitration, weighted fairness, and scheduling telemetry.
 */
export interface IExecutionSchedulerService {
	readonly _serviceBrand: undefined;

	/** Current queue depth */
	readonly queueDepth: number;

	/** Current concurrency utilization */
	readonly currentConcurrency: number;

	/** Scheduler configuration */
	readonly config: IExecutionSchedulerConfig;

	/** Scheduler telemetry */
	readonly telemetry: ISchedulerTelemetry;

	/** Event: scheduler drained (queue is empty) */
	readonly onSchedulerDrain: Event<ISchedulerDrainEvent>;

	/** Event: task dispatched for execution */
	readonly onTaskDispatched: Event<ScheduledTask>;

	/** Event: task completed */
	readonly onTaskCompleted: Event<ScheduledTask>;

	/** Event: task failed and will be retried */
	readonly onTaskRetryScheduled: Event<ScheduledTask>;

	/** Event: starvation detected -- low-priority tasks waiting too long */
	readonly onStarvationDetected: Event<ScheduledTask>;

	/** Enqueue a task for scheduling */
	enqueue(task: Omit<ScheduledTask, 'taskId' | 'enqueuedAt' | 'queueAgeMs' | 'isExecuting' | 'retryCount'>): string;

	/** Dequeue a task by ID (removes from queue without executing) */
	dequeue(taskId: string): ScheduledTask | undefined;

	/** Re-prioritize a task in the queue */
	reprioritize(taskId: string, newPriority: SchedulerPriority): boolean;

	/** Get all tasks in the queue (not currently executing) */
	getQueuedTasks(): readonly ScheduledTask[];

	/** Get all currently executing tasks */
	getExecutingTasks(): readonly ScheduledTask>;

	/** Get a task by ID */
	getTask(taskId: string): ScheduledTask | undefined;

	/** Cancel a task */
	cancelTask(taskId: string): boolean;

	/** Defer a task to a specific execution window */
	deferTask(taskId: string, window: IExecutionWindow): boolean;

	/** Perform arbitration when multiple tasks compete for the same resource */
	arbitrate(contendingTaskIds: readonly string[]): string;

	/** Apply weighted fairness adjustment to queue ordering */
	applyFairnessAdjustment(): number;

	/** Check for starved tasks and apply priority boost */
	preventStarvation(): readonly string[];

	/** Flush the entire queue (emergency) */
	flushQueue(): readonly string[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// SERVICE #102 -- IAgentOrchestrationRuntimeService
// Live multi-agent coordination runtime
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * A message sent between agents in the orchestration runtime.
 */
export interface IInterAgentMessage {
	readonly messageId: string;
	readonly fromAgentId: string;
	readonly toAgentId: string;
	readonly messageType: 'request' | 'response' | 'notification' | 'delegation' | 'failure-report';
	readonly payload: unknown;
	readonly timestamp: number;
	readonly correlationId: string | undefined;
}

/**
 * Result of delegating execution to an agent.
 */
export interface IDelegationResult {
	readonly success: boolean;
	readonly agentId: string;
	readonly taskId: string;
	readonly result: unknown;
	readonly durationMs: number;
	readonly errorMessage: string | undefined;
}

export const IAgentOrchestrationRuntimeService = createDecorator<IAgentOrchestrationRuntimeService>('agentOrchestrationRuntimeService');

/**
 * IAgentOrchestrationRuntimeService (#102) -- Live multi-agent coordination runtime.
 *
 * Handles agent registration, capability routing, execution delegation,
 * inter-agent communication, agent isolation, runtime arbitration,
 * execution ownership, cooperative execution, failure containment,
 * and the agent coordination graph.
 */
export interface IAgentOrchestrationRuntimeService {
	readonly _serviceBrand: undefined;

	/** All registered agents */
	readonly registeredAgents: ReadonlyMap<string, AgentDescriptor>;

	/** The agent coordination graph */
	readonly coordinationGraph: IAgentCoordinationGraph;

	/** Number of currently active agents */
	readonly activeAgentCount: number;

	/** Event: agent registered */
	readonly onAgentRegistered: Event<IAgentRegisteredEvent>;

	/** Event: agent deregistered */
	readonly onAgentDeregistered: Event<IAgentDeregisteredEvent>;

	/** Event: inter-agent message sent */
	readonly onInterAgentMessage: Event<IInterAgentMessage>;

	/** Event: delegation completed */
	readonly onDelegationCompleted: Event<IDelegationResult>;

	/** Event: agent failure contained */
	readonly onAgentFailureContained: Event<string>;

	/** Register a new agent with the orchestration runtime */
	registerAgent(descriptor: Omit<AgentDescriptor, 'registeredAt' | 'lastHeartbeatAt' | 'activeTaskCount' | 'state'>): AgentDescriptor;

	/** Deregister an agent from the runtime */
	deregisterAgent(agentId: string, reason: string): boolean;

	/** Route a task to the best available agent based on capabilities */
	routeByCapability(requiredCapabilities: readonly AgentCapability[]): string | undefined;

	/** Delegate execution of a task to a specific agent */
	delegateExecution(agentId: string, taskId: string, payload: unknown): Promise<IDelegationResult>;

	/** Send a message from one agent to another */
	sendInterAgentMessage(message: Omit<IInterAgentMessage, 'messageId' | 'timestamp'>): IInterAgentMessage;

	/** Suspend an agent -- pause its execution without deregistration */
	suspendAgent(agentId: string): boolean;

	/** Resume a suspended agent */
	resumeAgent(agentId: string): boolean;

	/** Isolate an agent to its failure containment group */
	isolateAgent(agentId: string, reason: string): boolean;

	/** Transfer execution ownership from one agent to another */
	transferOwnership(taskId: string, fromAgentId: string, toAgentId: string): boolean;

	/** Get agents matching a set of capabilities */
	findAgentsByCapability(capabilities: readonly AgentCapability[]): readonly AgentDescriptor[];

	/** Check if cooperative execution is possible between agents */
	canCooperate(agentA: string, agentB: string): boolean;

	/** Initiate cooperative execution between two agents */
	initiateCooperation(agentA: string, agentB: string, sharedTaskId: string): boolean;

	/** Contain a failure to an isolation group */
	containFailure(isolationGroup: string, failedAgentId: string): readonly string[];

	/** Get an agent descriptor by ID */
	getAgent(agentId: string): AgentDescriptor | undefined;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SERVICE #103 -- IRuntimePersistenceService
// Persistent runtime continuity
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Configuration for runtime persistence.
 */
export interface IRuntimePersistenceConfig {
	/** Snapshot interval in milliseconds (default: 10000) */
	readonly snapshotIntervalMs: number;
	/** Maximum number of retained snapshots */
	readonly maxSnapshots: number;
	/** Whether crash-safe writes are enabled (atomic rename) */
	readonly crashSafeEnabled: boolean;
	/** Compaction threshold -- compact when snapshots exceed this size */
	readonly compactionThresholdBytes: number;
	/** Whether to validate checksums on load */
	readonly validateChecksums: boolean;
	/** Maximum checkpoint age in milliseconds before pruning */
	readonly maxCheckpointAgeMs: number;
}

export const IRuntimePersistenceService = createDecorator<IRuntimePersistenceService>('runtimePersistenceService');

/**
 * IRuntimePersistenceService (#103) -- Persistent runtime continuity.
 *
 * Provides runtime snapshots, crash-safe persistence, execution recovery
 * checkpoints, task resumption, continuity restoration, queue restoration,
 * replayable runtime state, persistence compaction, and corruption validation.
 */
export interface IRuntimePersistenceService {
	readonly _serviceBrand: undefined;

	/** Persistence configuration */
	readonly config: IRuntimePersistenceConfig;

	/** Number of retained snapshots */
	readonly snapshotCount: number;

	/** Event: snapshot created */
	readonly onSnapshotCreated: Event<RuntimeSnapshot>;

	/** Event: snapshot restored */
	readonly onSnapshotRestored: Event<RuntimeSnapshot>;

	/** Event: checkpoint created */
	readonly onCheckpointCreated: Event<RuntimeSnapshot>;

	/** Event: persistence compaction completed */
	readonly onCompactionCompleted: Event<{ prunedCount: number; savedBytes: number }>;

	/** Event: corruption detected */
	readonly onCorruptionDetected: Event<{ snapshotId: string; details: string }>;

	/** Create a runtime snapshot */
	createSnapshot(): RuntimeSnapshot;

	/** Restore from a snapshot */
	restoreSnapshot(snapshotId: string): Promise<RuntimeSnapshot | undefined>;

	/** Create an execution recovery checkpoint */
	createCheckpoint(label: string): RuntimeSnapshot;

	/** Restore from the latest checkpoint */
	restoreLatestCheckpoint(): Promise<RuntimeSnapshot | undefined>;

	/** Resume a task from its last persisted state */
	resumeTask(taskId: string): ScheduledTask | undefined;

	/** Restore full runtime continuity (queues, agents, state) */
	restoreContinuity(): Promise<boolean>;

	/** Restore the execution queue from persistence */
	restoreQueue(): readonly ScheduledTask[];

	/** Get a replayable runtime state for a given tick range */
	getReplayableState(fromTickId: number, toTickId: number): readonly RuntimeTick[];

	/** Compact the persistence store -- prune old snapshots */
	compact(): number;

	/** Validate all snapshots for corruption */
	validateIntegrity(): readonly string[];

	/** Get a snapshot by ID */
	getSnapshot(snapshotId: string): RuntimeSnapshot | undefined;

	/** List all retained snapshots */
	listSnapshots(): readonly RuntimeSnapshot[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// SERVICE #104 -- IRuntimeHealthSupervisorService
// Live runtime health orchestration
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Configuration for runtime health supervision.
 */
export interface IRuntimeHealthConfig {
	/** Health check interval in milliseconds (default: 3000) */
	readonly checkIntervalMs: number;
	/** Threshold for degraded health (0.0 -- 1.0) */
	readonly degradedThreshold: number;
	/** Threshold for unhealthy status (0.0 -- 1.0) */
	readonly unhealthyThreshold: number;
	/** Threshold for critical status (0.0 -- 1.0) */
	readonly criticalThreshold: number;
	/** Anomaly detection sensitivity (0.0 -- 1.0) */
	readonly anomalySensitivity: number;
	/** Instability forecast horizon in milliseconds */
	readonly forecastHorizonMs: number;
	/** Thermal state sampling interval in milliseconds */
	readonly thermalSamplingIntervalMs: number;
	/** Saturation threshold for PressureLevel.High */
	readonly highSaturationThreshold: number;
	/** Whether cascading failure prevention is enabled */
	readonly cascadingPreventionEnabled: boolean;
}

export const IRuntimeHealthSupervisorService = createDecorator<IRuntimeHealthSupervisorService>('runtimeHealthSupervisorService');

/**
 * IRuntimeHealthSupervisorService (#104) -- Live runtime health orchestration.
 *
 * Monitors all 99+ services, detects runtime degradation, forecasts instability,
 * detects execution anomalies, computes health scores, detects saturation,
 * prevents cascading failures, models thermal state, and escalates pressure.
 */
export interface IRuntimeHealthSupervisorService {
	readonly _serviceBrand: undefined;

	/** Current overall health level */
	readonly currentHealthLevel: HealthLevel;

	/** Current overall health score (0.0 -- 1.0) */
	readonly currentHealthScore: number;

	/** Current thermal state */
	readonly thermalState: ThermalState;

	/** Current queue pressure */
	readonly queuePressure: PressureLevel;

	/** Health configuration */
	readonly config: IRuntimeHealthConfig;

	/** Latest health report */
	readonly latestReport: HealthReport | undefined;

	/** Event: health degraded */
	readonly onHealthDegraded: Event<IHealthDegradedEvent>;

	/** Event: health recovered */
	readonly onHealthRecovered: Event<HealthReport>;

	/** Event: anomaly detected */
	readonly onAnomalyDetected: Event<IHealthAnomaly>;

	/** Event: instability forecast issued */
	readonly onInstabilityForecast: Event<IInstabilityForecast>;

	/** Event: thermal state changed */
	readonly onThermalStateChanged: Event<IThermalStateChangedEvent>;

	/** Event: cascading failure prevented */
	readonly onCascadingFailurePrevented: Event<readonly string[]>;

	/** Event: pressure escalated */
	readonly onPressureEscalated: Event<PressureLevel>;

	/** Perform a full health check across all monitored services */
	performHealthCheck(): HealthReport;

	/** Get the health entry for a specific service */
	getServiceHealth(serviceId: string): IServiceHealthEntry | undefined;

	/** Get the current thermal state assessment */
	assessThermalState(): ThermalState;

	/** Detect anomalies in current runtime metrics */
	detectAnomalies(): readonly IHealthAnomaly[];

	/** Generate instability forecasts */
	forecastInstability(): readonly IInstabilityForecast[];

	/** Detect saturation conditions */
	detectSaturation(): ReadonlyMap<string, PressureLevel>;

	/** Check if cascading failure conditions exist */
	isCascadingFailureRisk(): boolean;

	/** Prevent a detected cascading failure from propagating */
	preventCascadingFailure(atRiskServices: readonly string[]): boolean;

	/** Escalate pressure to trigger throttling or recovery */
	escalatePressure(level: PressureLevel): void;

	/** Get historical health reports for trend analysis */
	getHealthHistory(durationMs: number): readonly HealthReport[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// SERVICE #105 -- IRuntimeRecoveryOrchestratorService
// Autonomous recovery engine
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Configuration for runtime recovery orchestration.
 */
export interface IRuntimeRecoveryConfig {
	/** Maximum recovery plan duration in milliseconds */
	readonly maxRecoveryDurationMs: number;
	/** Cooldown between recovery attempts for the same subsystem in milliseconds */
	readonly recoveryCooldownMs: number;
	/** Maximum escalation depth before requiring human intervention */
	readonly maxEscalationDepth: number;
	/** Whether degraded mode is allowed */
	readonly degradedModeAllowed: boolean;
	/** Whether quarantine isolation is enabled */
	readonly quarantineEnabled: boolean;
	/** Maximum number of concurrent recovery plans */
	readonly maxConcurrentRecoveries: number;
	/** Auto-approval threshold -- plans below this severity are auto-approved */
	readonly autoApprovalSeverity: GovernanceViolationSeverity;
}

export const IRuntimeRecoveryOrchestratorService = createDecorator<IRuntimeRecoveryOrchestratorService>('runtimeRecoveryOrchestratorService');

/**
 * IRuntimeRecoveryOrchestratorService (#105) -- Autonomous recovery engine.
 *
 * Creates runtime repair plans, manages recovery escalation, orchestrates
 * subsystem restarts, triggers rollbacks, enables degraded-mode operation,
 * orders dependency recovery, enforces recovery cooldowns, performs isolation
 * quarantine, and drives self-healing workflows.
 */
export interface IRuntimeRecoveryOrchestratorService {
	readonly _serviceBrand: undefined;

	/** Currently active recovery plans */
	readonly activeRecoveryPlans: ReadonlyMap<string, IRecoveryPlan>;

	/** The recovery dependency graph */
	readonly dependencyGraph: IRecoveryDependencyGraph;

	/** Recovery configuration */
	readonly config: IRuntimeRecoveryConfig;

	/** Whether any recovery is currently in progress */
	readonly isRecovering: boolean;

	/** Event: recovery triggered */
	readonly onRecoveryTriggered: Event<IRecoveryTriggeredEvent>;

	/** Event: recovery completed */
	readonly onRecoveryCompleted: Event<IRecoveryCompletedEvent>;

	/** Event: recovery escalation */
	readonly onRecoveryEscalated: Event<{ planId: string; newDepth: number }>;

	/** Event: degraded mode entered */
	readonly onDegradedModeEntered: Event<string>;

	/** Event: subsystem quarantined */
	readonly onSubsystemQuarantined: Event<string>;

	/** Event: self-healing workflow completed */
	readonly onSelfHealingCompleted: Event<{ planId: string; success: boolean }>;

	/** Create a recovery plan for a given trigger condition */
	createRecoveryPlan(trigger: IRecoveryTrigger, strategy: RecoveryStrategy): IRecoveryPlan;

	/** Execute a recovery plan */
	executeRecoveryPlan(planId: string): Promise<RecoveryPlanResult>;

	/** Cancel an active recovery plan */
	cancelRecoveryPlan(planId: string): boolean;

	/** Escalate a recovery plan to the next depth level */
	escalateRecovery(planId: string): IRecoveryPlan;

	/** Restart a specific subsystem */
	restartSubsystem(serviceId: string, reason: string): Promise<boolean>;

	/** Trigger a rollback to a specific checkpoint */
	triggerRollback(checkpointId: string): Promise<boolean>;

	/** Enter degraded mode for a subsystem */
	enterDegradedMode(serviceId: string): boolean;

	/** Exit degraded mode for a subsystem */
	exitDegradedMode(serviceId: string): boolean;

	/** Quarantine a subsystem -- isolate it from the rest of the runtime */
	quarantineSubsystem(serviceId: string, reason: string): boolean;

	/** Release a quarantined subsystem back to normal operation */
	releaseQuarantine(serviceId: string): boolean;

	/** Compute the correct dependency ordering for recovery */
	computeRecoveryOrder(failedSubsystems: readonly string[]): readonly string[];

	/** Check if a subsystem is in cooldown */
	isInCooldown(serviceId: string): boolean;

	/** Get the status of a recovery plan */
	getRecoveryPlanStatus(planId: string): IRecoveryPlan | undefined;

	/** Run a self-healing workflow -- autonomous detection and repair cycle */
	runSelfHealingWorkflow(): Promise<boolean>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SERVICE #106 -- IResourceGovernanceService
// Runtime resource governance
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Configuration for resource governance.
 */
export interface IResourceGovernanceConfig {
	/** Default CPU time budget per tick in milliseconds */
	readonly defaultCpuBudgetMs: number;
	/** Default memory budget in megabytes */
	readonly defaultMemoryBudgetMb: number;
	/** Maximum concurrency slots */
	readonly maxConcurrencySlots: number;
	/** Default I/O operations per second budget */
	readonly defaultIoBudget: number;
	/** Burst protection window in milliseconds */
	readonly burstWindowMs: number;
	/** Maximum burst multiplier over base allocation */
	readonly maxBurstMultiplier: number;
	/** Whether allocation arbitration is enabled */
	readonly arbitrationEnabled: boolean;
	/** Starvation prevention threshold in milliseconds */
	readonly starvationThresholdMs: number;
}

export const IResourceGovernanceService = createDecorator<IResourceGovernanceService>('resourceGovernanceService');

/**
 * IResourceGovernanceService (#106) -- Runtime resource governance.
 *
 * Simulates CPU budgets, balances memory pressure, tracks queue pressure,
 * throttles execution, enforces runtime quotas, ensures resource fairness,
 * provides burst protection, arbitrates allocations, and prevents starvation.
 */
export interface IResourceGovernanceService {
	readonly _serviceBrand: undefined;

	/** Current resource budgets */
	readonly budgets: ReadonlyMap<ResourceBudgetType, IResourceBudget>;

	/** Governance configuration */
	readonly config: IResourceGovernanceConfig;

	/** Event: resource budget changed */
	readonly onResourceBudgetChanged: Event<IResourceBudgetChangedEvent>;

	/** Event: execution throttled */
	readonly onExecutionThrottled: Event<{ budgetType: ResourceBudgetType; ownerId: string; reason: string }>;

	/** Event: burst protection activated */
	readonly onBurstProtectionActivated: Event<ResourceBudgetType>;

	/** Event: starvation detected */
	readonly onResourceStarvation: Event<{ ownerId: string; budgetType: ResourceBudgetType }>;

	/** Get the current budget for a resource type */
	getBudget(type: ResourceBudgetType): IResourceBudget;

	/** Allocate resources to an owner */
	allocate(type: ResourceBudgetType, ownerId: string, amount: number): boolean;

	/** Release resources from an owner */
	release(type: ResourceBudgetType, ownerId: string, amount: number): void;

	/** Reserve resources for critical operations */
	reserve(type: ResourceBudgetType, amount: number): boolean;

	/** Check if an allocation request can be satisfied */
	canAllocate(type: ResourceBudgetType, amount: number): boolean;

	/** Throttle execution for a specific owner */
	throttle(ownerId: string, budgetType: ResourceBudgetType, factor: number): boolean;

	/** Remove throttling for an owner */
	unthrottle(ownerId: string, budgetType: ResourceBudgetType): boolean;

	/** Check burst capacity and apply burst protection if needed */
	checkBurstProtection(type: ResourceBudgetType): boolean;

	/** Arbitrate between competing allocation requests */
	arbitrateAllocation(requests: ReadonlyArray<{ ownerId: string; type: ResourceBudgetType; amount: number }>): ReadonlyMap<string, number>;

	/** Rebalance budgets based on current pressure */
	rebalance(): ReadonlyMap<ResourceBudgetType, IResourceBudget>;

	/** Check if any owner is experiencing resource starvation */
	detectStarvation(): ReadonlyMap<string, readonly ResourceBudgetType[]>;

	/** Get the current pressure level for all resource types */
	getAllPressureLevels(): ReadonlyMap<ResourceBudgetType, PressureLevel>;

	/** Simulate a CPU budget check -- will the task fit within the current tick budget? */
	simulateCpuBudget(requiredMs: number): boolean;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SERVICE #107 -- IDistributedExecutionBridgeService
// Future-ready distributed runtime abstraction
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Configuration for the distributed execution bridge.
 * This is an abstraction layer ONLY. No fake cloud claims.
 */
export interface IDistributedExecutionBridgeConfig {
	/** Heartbeat interval for node health tracking in milliseconds */
	readonly nodeHeartbeatIntervalMs: number;
	/** Maximum allowed consistency lag in milliseconds */
	readonly maxConsistencyLagMs: number;
	/** Failover simulation mode -- whether to simulate node failures for testing */
	readonly failoverSimulationEnabled: boolean;
	/** Default synchronization boundary for new queues */
	readonly defaultSyncBoundary: SyncBoundaryType;
	/** Workload redistribution interval in milliseconds */
	readonly redistributionIntervalMs: number;
	/** Maximum number of nodes in the abstraction */
	readonly maxNodes: number;
}

export const IDistributedExecutionBridgeService = createDecorator<IDistributedExecutionBridgeService>('distributedExecutionBridgeService');

/**
 * IDistributedExecutionBridgeService (#107) -- Future-ready distributed runtime abstraction.
 *
 * Provides remote execution abstraction, execution node contracts, distributed
 * queue models, node heartbeat tracking, node failover simulation, workload
 * redistribution, synchronization boundaries, and eventual consistency tracking.
 *
 * IMPORTANT: This is an abstraction layer ONLY. No fake cloud claims.
 * All distributed concepts are modeled as abstractions that could be
 * backed by local or remote implementations. The service does not claim
 * to connect to any cloud or distributed system.
 */
export interface IDistributedExecutionBridgeService {
	readonly _serviceBrand: undefined;

	/** All known execution nodes */
	readonly nodes: ReadonlyMap<string, IExecutionNode>;

	/** All distributed queues */
	readonly queues: ReadonlyMap<string, IDistributedQueueModel>;

	/** Bridge configuration */
	readonly config: IDistributedExecutionBridgeConfig;

	/** Event: node status changed */
	readonly onNodeStatusChanged: Event<IExecutionNodeStatusChangedEvent>;

	/** Event: node failover triggered */
	readonly onNodeFailover: Event<{ failedNodeId: string; replacementNodeId: string | undefined }>;

	/** Event: workload redistributed */
	readonly onWorkloadRedistributed: Event<{ queueId: string; movedTaskCount: number }>;

	/** Event: consistency lag exceeded threshold */
	readonly onConsistencyLagExceeded: Event<{ queueId: string; lagMs: number }>;

	/** Register an execution node in the abstraction */
	registerNode(node: Omit<IExecutionNode, 'lastHeartbeatAt' | 'activeTaskCount' | 'status'>): IExecutionNode;

	/** Deregister an execution node */
	deregisterNode(nodeId: string): boolean;

	/** Record a heartbeat from an execution node */
	recordNodeHeartbeat(nodeId: string): boolean;

	/** Get execution nodes with stale heartbeats */
	getStaleNodes(): readonly IExecutionNode[];

	/** Simulate a node failover -- migrate tasks from a failed node */
	simulateFailover(failedNodeId: string): readonly string[];

	/** Redistribute workload across nodes in a queue */
	redistributeWorkload(queueId: string): number;

	/** Create a distributed queue model */
	createDistributedQueue(participatingNodeIds: readonly string[], syncBoundary: SyncBoundaryType): IDistributedQueueModel;

	/** Enqueue a task to a distributed queue */
	enqueueDistributed(queueId: string, task: ScheduledTask): string;

	/** Get the synchronization boundary for a queue */
	getSyncBoundary(queueId: string): SyncBoundaryType;

	/** Track eventual consistency lag for a queue */
	trackConsistencyLag(queueId: string): number;

	/** Get the best node for a task based on capabilities and load */
	selectNodeForTask(task: ScheduledTask): IExecutionNode | undefined;

	/** Validate the distributed abstraction integrity */
	validateBridgeIntegrity(): readonly string[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// SERVICE #108 -- IRuntimeGovernanceService
// Operational runtime governance
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * A governance policy rule with enforcement logic.
 */
export interface IGovernancePolicyRule {
	/** Unique rule identifier */
	readonly ruleId: string;
	/** The policy category this rule enforces */
	readonly policy: GovernancePolicy;
	/** Human-readable rule name */
	readonly name: string;
	/** Description of what this rule enforces */
	readonly description: string;
	/** Whether this rule is currently active */
	active: boolean;
	/** Priority of this rule for enforcement ordering */
	readonly enforcementPriority: number;
	/** Severity when this rule is violated */
	readonly defaultSeverity: GovernanceViolationSeverity;
}

/**
 * An entry in the governance audit log.
 */
export interface IGovernanceAuditEntry {
	/** Unique entry identifier */
	readonly entryId: string;
	/** Timestamp of the audited action */
	readonly timestamp: number;
	/** The service or agent that performed the action */
	readonly actorId: string;
	/** The action that was performed or attempted */
	readonly action: string;
	/** The governance policy that was checked */
	readonly policy: GovernancePolicy;
	/** Whether the action was allowed */
	readonly allowed: boolean;
	/** Reason for the decision */
	readonly reason: string;
	/** Any related violation ID */
	readonly violationId: string | undefined;
}

/**
 * Result of an execution boundary validation.
 */
export interface IExecutionBoundaryResult {
	/** Whether the execution is within valid boundaries */
	readonly isValid: boolean;
	/** Boundary violations detected */
	readonly violations: readonly IGovernanceViolation[];
	/** The scope that was validated */
	readonly scopeDescription: string;
	/** Timestamp */
	readonly validatedAt: number;
}

/**
 * Result of a permission validation check.
 */
export interface IPermissionValidationResult {
	/** Whether the permission is granted */
	readonly granted: boolean;
	/** The permission that was checked */
	readonly permission: string;
	/** The principal requesting the permission */
	readonly principalId: string;
	/** Reason for denial (if denied) */
	readonly denialReason: string | undefined;
	/** Conditions attached to the permission grant */
	readonly conditions: readonly string[];
}

export const IRuntimeGovernanceService = createDecorator<IRuntimeGovernanceService>('runtimeGovernanceService');

/**
 * IRuntimeGovernanceService (#108) -- Operational runtime governance.
 *
 * Prevents unsafe execution, enforces runtime policies, restricts escalation
 * chains, validates execution boundaries, operates a policy engine, maintains
 * governance audit logs, validates runtime permissions, and enforces
 * execution trust levels.
 */
export interface IRuntimeGovernanceService {
	readonly _serviceBrand: undefined;

	/** All active governance policy rules */
	readonly policyRules: ReadonlyMap<string, IGovernancePolicyRule>;

	/** Recent governance violations */
	readonly recentViolations: readonly IGovernanceViolation[];

	/** Governance audit log */
	readonly auditLog: readonly IGovernanceAuditEntry[];

	/** Event: governance violation detected */
	readonly onGovernanceViolation: Event<IGovernanceViolationEvent>;

	/** Event: execution blocked by governance */
	readonly onExecutionBlocked: Event<{ actorId: string; action: string; policy: GovernancePolicy }>;

	/** Event: policy rule added or updated */
	readonly onPolicyRuleChanged: Event<IGovernancePolicyRule>;

	/** Register a governance policy rule */
	registerPolicyRule(rule: Omit<IGovernancePolicyRule, 'ruleId'>): IGovernancePolicyRule;

	/** Update an existing policy rule */
	updatePolicyRule(ruleId: string, updates: Partial<Pick<IGovernancePolicyRule, 'active' | 'defaultSeverity'>>): boolean;

	/** Remove a policy rule */
	removePolicyRule(ruleId: string): boolean;

	/** Evaluate whether an action is allowed under current policies */
	evaluateAction(actorId: string, action: string, context: Record<string, unknown>): boolean;

	/** Prevent execution of an unsafe action */
	preventUnsafeExecution(actorId: string, action: string, reason: string): IGovernanceViolation;

	/** Enforce escalation restrictions -- prevent runaway recovery chains */
	enforceEscalationRestriction(planId: string, requestedDepth: number): boolean;

	/** Validate that an execution is within valid boundaries */
	validateExecutionBoundary(executionId: string, scope: Record<string, unknown>): IExecutionBoundaryResult;

	/** Validate runtime permissions for a principal */
	validatePermission(principalId: string, permission: string, context: Record<string, unknown>): IPermissionValidationResult;

	/** Enforce execution trust level */
	enforceTrustLevel(actorId: string, requiredLevel: number): boolean;

	/** Get the audit log for a specific time range */
	getAuditLog(fromTimestamp: number, toTimestamp: number): readonly IGovernanceAuditEntry[];

	/** Get all violations for a specific actor */
	getViolationsForActor(actorId: string): readonly IGovernanceViolation[];

	/** Resolve a governance violation -- mark it as addressed */
	resolveViolation(violationId: string, resolution: string): boolean;

	/** Flush the audit log (emergency cleanup) */
	flushAuditLog(): number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SERVICE #109 -- IAutonomousEvolutionRuntimeService
// Safe runtime adaptation engine
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Configuration for the autonomous evolution runtime.
 * All parameters are bounded to ensure safe adaptation.
 */
export interface IAutonomousEvolutionConfig {
	/** Maximum percentage a parameter can change in one cycle (0.0 -- 1.0) */
	readonly maxChangePercent: number;
	/** Minimum time between adaptation cycles in milliseconds */
	readonly minAdaptationIntervalMs: number;
	/** Maximum adaptations per session before requiring human review */
	readonly maxAdaptationsPerSession: number;
	/** Parameters that are never allowed to change */
	readonly immutableParameters: readonly string[];
	/** Maximum rollback depth */
	readonly maxRollbackDepth: number;
	/** Threshold above which changes require human approval (0.0 -- 1.0) */
	readonly approvalThresholdPercent: number;
	/** Maximum consecutive regressions before freezing evolution */
	readonly regressionFreezeLimit: number;
	/** Whether evolution is enabled */
	evolutionEnabled: boolean;
}

/**
 * A heuristic rule used by the evolution engine to decide
 * parameter adaptations.
 */
export interface IEvolutionHeuristic {
	/** Unique heuristic identifier */
	readonly heuristicId: string;
	/** Human-readable name */
	readonly name: string;
	/** Description of the heuristic logic */
	readonly description: string;
	/** The parameter this heuristic targets */
	readonly targetParameter: string;
	/** Condition under which this heuristic applies */
	readonly appliesWhen: string;
	/** Whether this heuristic is currently active */
	active: boolean;
	/** Effectiveness score based on historical outcomes (0.0 -- 1.0) */
	effectivenessScore: number;
}

/**
 * The current state of the autonomous evolution engine.
 */
export interface IEvolutionState {
	/** Whether evolution is currently enabled */
	readonly enabled: boolean;
	/** Whether evolution is frozen due to regressions */
	readonly frozen: boolean;
	/** Number of adaptations applied this session */
	readonly adaptationsThisSession: number;
	/** Number of consecutive regressions */
	readonly consecutiveRegressions: number;
	/** Total adaptations applied across all sessions */
	readonly totalAdaptations: number;
	/** Total rollbacks performed */
	readonly totalRollbacks: number;
	/** Effectiveness of recent adaptations (0.0 -- 1.0) */
	readonly recentEffectiveness: number;
	/** Last adaptation timestamp */
	readonly lastAdaptationAt: number | undefined;
	/** Active heuristics */
	readonly activeHeuristics: readonly IEvolutionHeuristic[];
}

/**
 * An optimization recommendation produced by the evolution engine
 * that has not yet been applied.
 */
export interface IOptimizationRecommendation {
	/** Unique recommendation identifier */
	readonly recommendationId: string;
	/** The parameter to adapt */
	readonly parameterName: string;
	/** Current value */
	readonly currentValue: number;
	/** Recommended value */
	readonly recommendedValue: number;
	/** Change percentage */
	readonly changePercent: number;
	/** Rationale for the recommendation */
	readonly rationale: string;
	/** Heuristic that generated this recommendation */
	readonly sourceHeuristic: string;
	/** Whether this requires human approval */
	readonly requiresApproval: boolean;
	/** Confidence in the recommendation (0.0 -- 1.0) */
	readonly confidence: number;
	/** Workload signature that motivates this change */
	readonly workloadSignature: string;
	/** Timestamp when the recommendation was generated */
	readonly generatedAt: number;
}

export const IAutonomousEvolutionRuntimeService = createDecorator<IAutonomousEvolutionRuntimeService>('autonomousEvolutionRuntimeService');

/**
 * IAutonomousEvolutionRuntimeService (#109) -- Safe runtime adaptation engine.
 *
 * Provides adaptive tuning, runtime optimization recommendations, safe
 * self-adjustment within strict boundaries, heuristic learning, workload
 * adaptation, runtime parameter evolution, safe adaptation boundaries,
 * rollback-on-regression, and evolution audit history.
 *
 * IMPORTANT: NO AGI CLAIMS. This service performs strictly bounded runtime
 * optimization. It adjusts operational parameters (tick intervals, concurrency
 * limits, queue depths, budget allocations) based on observed workload
 * patterns. It does not learn new behaviors, create new capabilities,
 * or exceed its defined adaptation boundaries.
 */
export interface IAutonomousEvolutionRuntimeService {
	readonly _serviceBrand: undefined;

	/** Current evolution state */
	readonly state: IEvolutionState;

	/** Evolution configuration */
	readonly config: IAutonomousEvolutionConfig;

	/** Evolution audit history -- all adaptations ever applied */
	readonly auditHistory: readonly EvolutionRecord[];

	/** Event: evolution adaptation applied */
	readonly onEvolutionApplied: Event<IEvolutionAppliedEvent>;

	/** Event: evolution regression detected */
	readonly onEvolutionRegression: Event<EvolutionRecord>;

	/** Event: evolution rolled back */
	readonly onEvolutionRolledBack: Event<EvolutionRecord>;

	/** Event: evolution frozen due to regressions */
	readonly onEvolutionFrozen: Event<{ consecutiveRegressions: number }>;

	/** Event: optimization recommendation produced */
	readonly onOptimizationRecommendation: Event<IOptimizationRecommendation>;

	/** Generate optimization recommendations based on current workload */
	generateRecommendations(): readonly IOptimizationRecommendation[];

	/** Apply an optimization recommendation */
	applyRecommendation(recommendationId: string): EvolutionRecord | undefined;

	/** Perform a safe self-adjustment within defined boundaries */
	safeSelfAdjust(parameterName: string, targetValue: number, boundary: EvolutionBoundary): EvolutionRecord | undefined;

	/** Learn from workload patterns -- update heuristic effectiveness scores */
	learnFromWorkload(workloadSignature: string, outcomeScore: number): void;

	/** Adapt runtime parameters to match the current workload */
	adaptToWorkload(): readonly EvolutionRecord[];

	/** Validate that an adaptation is within safe boundaries */
	isWithinBoundary(parameterName: string, proposedValue: number): boolean;

	/** Roll back the most recent adaptation */
	rollbackLatest(): EvolutionRecord | undefined;

	/** Roll back a specific adaptation by record ID */
	rollbackByRecord(recordId: string): EvolutionRecord | undefined;

	/** Roll back all adaptations that caused regression */
	rollbackRegressions(): readonly EvolutionRecord[];

	/** Freeze evolution -- stop all future adaptations */
	freezeEvolution(): void;

	/** Unfreeze evolution -- resume adaptations */
	unfreezeEvolution(): void;

	/** Get the current value of an evolvable parameter */
	getParameterValue(parameterName: string): number | undefined;

	/** Set a parameter value directly (requires governance approval) */
	setParameterValue(parameterName: string, value: number, justification: string): EvolutionRecord | undefined;

	/** Get the evolution audit history for a specific parameter */
	getParameterHistory(parameterName: string): readonly EvolutionRecord[];

	/** Register a new heuristic rule */
	registerHeuristic(heuristic: Omit<IEvolutionHeuristic, 'heuristicId' | 'effectivenessScore'>): IEvolutionHeuristic;

	/** Get all registered heuristics */
	getHeuristics(): readonly IEvolutionHeuristic[];

	/** Check if a parameter is immutable (never allowed to change) */
	isImmutable(parameterName: string): boolean;
}
