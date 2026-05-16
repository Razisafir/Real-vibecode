/*---------------------------------------------------------------------------------------------
 *  System Stabilization & Production Coherence Layer — Phase 10
 *  Real Vibecode — AI-Native IDE
 *
 *  ISystemStabilizationService — Transforms the system from "architecturally complete"
 *  to "runtime stable under real-world continuous usage".
 *
 *  This is NOT:
 *    - A new subsystem
 *    - New capabilities
 *
 *  This IS:
 *    - Stability enforcement
 *    - Performance containment
 *    - Failure resistance
 *    - Deterministic behavior
 *    - Load control
 *    - System predictability
 *
 *  Tasks:
 *    1. Global Load Controller — CPU pressure, event saturation, throttling
 *    2. Backpressure System — queue/pause/resume across all subsystems
 *    3. Execution Throttling Policy — dynamic thresholds, safety ceilings
 *    4. Failure Cascade Prevention — isolation, containment, quarantine
 *    5. System Stability State Machine — Stable/Degraded/Throttled/Critical/Recovery
 *    6. Deterministic Execution Guarantee — idempotency, no double execution
 *    7. Global Execution Ordering — strict priority ordering
 *    8. Memory Pressure Control — pruning, eviction, trimming, rotation, caps
 *    9. Self-Diagnostic Loop — continuous check + auto-recover/degrade/restart
 *    10. Production Readiness Mode — toggle, reduced verbosity, strict throttling
 *--------------------------------------------------------------------------------------------*/

import { Event } from '../../../../base/common/event.js';
import { IDisposable } from '../../../../base/common/lifecycle.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';

export const ISystemStabilizationService = createDecorator<ISystemStabilizationService>('systemStabilizationService');

// ═══════════════════════════════════════════════════════════════════════════════
// TASK 5 — SYSTEM STABILITY STATE MACHINE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Global system stability states.
 * Each state defines allowed subsystem behavior, execution limits,
 * agent permissions, and process restrictions.
 */
export const enum SystemStabilityState {
	/** System is operating normally — all subsystems active, no throttling */
	Stable = 'stable',
	/** System is under stress — some metrics elevated, light throttling applied */
	Degraded = 'degraded',
	/** System is actively throttling — non-essential operations deferred */
	Throttled = 'throttled',
	/** System is in critical condition — only safety operations allowed */
	Critical = 'critical',
	/** System is recovering — gradual resume of operations */
	Recovery = 'recovery',
}

/**
 * Behavior allowed in each stability state for each subsystem.
 */
export interface IStabilityStateBehavior {
	/** Whether agents can create new plans */
	readonly agentPlanCreation: boolean;
	/** Whether agents can execute plans */
	readonly agentPlanExecution: boolean;
	/** Whether processes can be launched */
	readonly processLaunch: boolean;
	/** Whether file mutations are allowed */
	readonly fileMutation: boolean;
	/** Whether context updates are processed */
	readonly contextUpdates: boolean;
	/** Whether graph mutations are allowed */
	readonly graphMutations: boolean;
	/** Maximum concurrent agents (0 = no limit from stability) */
	readonly maxConcurrentAgents: number;
	/** Maximum concurrent processes (0 = no limit from stability) */
	readonly maxConcurrentProcesses: number;
	/** Maximum event bus throughput (events/sec, 0 = no limit) */
	readonly maxEventBusThroughput: number;
	/** Whether verbose observability is allowed */
	readonly verboseObservability: boolean;
	/** Whether non-critical intents are deferred */
	readonly deferNonCritical: boolean;
	/** Whether the system automatically recovers */
	readonly autoRecovery: boolean;
}

/**
 * Predefined behaviors for each stability state.
 */
export const STABILITY_BEHAVIORS: Readonly<Record<SystemStabilityState, IStabilityStateBehavior>> = {
	[SystemStabilityState.Stable]: {
		agentPlanCreation: true,
		agentPlanExecution: true,
		processLaunch: true,
		fileMutation: true,
		contextUpdates: true,
		graphMutations: true,
		maxConcurrentAgents: 0,
		maxConcurrentProcesses: 0,
		maxEventBusThroughput: 0,
		verboseObservability: true,
		deferNonCritical: false,
		autoRecovery: true,
	},
	[SystemStabilityState.Degraded]: {
		agentPlanCreation: true,
		agentPlanExecution: true,
		processLaunch: true,
		fileMutation: true,
		contextUpdates: true,
		graphMutations: true,
		maxConcurrentAgents: 3,
		maxConcurrentProcesses: 5,
		maxEventBusThroughput: 500,
		verboseObservability: true,
		deferNonCritical: true,
		autoRecovery: true,
	},
	[SystemStabilityState.Throttled]: {
		agentPlanCreation: false,
		agentPlanExecution: true,
		processLaunch: true,
		fileMutation: true,
		contextUpdates: true,
		graphMutations: true,
		maxConcurrentAgents: 2,
		maxConcurrentProcesses: 3,
		maxEventBusThroughput: 200,
		verboseObservability: false,
		deferNonCritical: true,
		autoRecovery: true,
	},
	[SystemStabilityState.Critical]: {
		agentPlanCreation: false,
		agentPlanExecution: false,
		processLaunch: false,
		fileMutation: false,
		contextUpdates: false,
		graphMutations: false,
		maxConcurrentAgents: 0,
		maxConcurrentProcesses: 0,
		maxEventBusThroughput: 50,
		verboseObservability: false,
		deferNonCritical: true,
		autoRecovery: true,
	},
	[SystemStabilityState.Recovery]: {
		agentPlanCreation: false,
		agentPlanExecution: true,
		processLaunch: true,
		fileMutation: true,
		contextUpdates: true,
		graphMutations: true,
		maxConcurrentAgents: 1,
		maxConcurrentProcesses: 2,
		maxEventBusThroughput: 100,
		verboseObservability: false,
		deferNonCritical: true,
		autoRecovery: true,
	},
};

// ═══════════════════════════════════════════════════════════════════════════════
// TASK 1 — GLOBAL LOAD CONTROLLER
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Load metrics tracked by the Global Load Controller.
 */
export interface ILoadMetrics {
	/** Timestamp of measurement */
	readonly measuredAt: number;
	/** Estimated CPU pressure (0–1, logical estimate based on event processing rate) */
	readonly cpuPressure: number;
	/** Event bus saturation (0–1, fraction of max throughput) */
	readonly eventBusSaturation: number;
	/** Graph mutation rate (mutations per second) */
	readonly graphMutationRate: number;
	/** Agent concurrency (fraction of max, 0–1) */
	readonly agentConcurrency: number;
	/** Process concurrency (fraction of max, 0–1) */
	readonly processConcurrency: number;
	/** Overall load score (0–1, weighted composite) */
	readonly overallLoad: number;
	/** Whether the system is currently overloaded */
	readonly overloaded: boolean;
}

/**
 * Configuration for load control thresholds.
 */
export interface ILoadThresholds {
	/** CPU pressure threshold before throttling (0–1, default: 0.7) */
	readonly cpuPressureThrottle: number;
	/** CPU pressure threshold before critical (0–1, default: 0.9) */
	readonly cpuPressureCritical: number;
	/** Event bus saturation before throttling (0–1, default: 0.6) */
	readonly eventBusThrottle: number;
	/** Event bus saturation before critical (0–1, default: 0.85) */
	readonly eventBusCritical: number;
	/** Graph mutation rate throttle threshold (mutations/sec, default: 100) */
	readonly graphMutationThrottle: number;
	/** Graph mutation rate critical threshold (mutations/sec, default: 200) */
	readonly graphMutationCritical: number;
	/** Agent concurrency throttle (0–1, default: 0.7) */
	readonly agentConcurrencyThrottle: number;
	/** Agent concurrency critical (0–1, default: 0.9) */
	readonly agentConcurrencyCritical: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// TASK 2 — BACKPRESSURE SYSTEM
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Backpressure level for a subsystem.
 */
export const enum BackpressureLevel {
	/** No backpressure — operate normally */
	None = 'none',
	/** Light backpressure — queue non-essential operations */
	Light = 'light',
	/** Medium backpressure — queue most operations, only critical passes */
	Medium = 'medium',
	/** Heavy backpressure — only safety-critical operations pass */
	Heavy = 'heavy',
	/** Full backpressure — all operations blocked except system recovery */
	Full = 'full',
}

/**
 * Backpressure status for a subsystem.
 */
export interface IBackpressureStatus {
	/** Subsystem name */
	readonly subsystem: string;
	/** Current backpressure level */
	readonly level: BackpressureLevel;
	/** Number of queued operations */
	readonly queuedCount: number;
	/** Number of rejected operations */
	readonly rejectedCount: number;
	/** Whether the subsystem is accepting new operations */
	readonly accepting: boolean;
	/** Reason for current backpressure level */
	readonly reason: string;
}

/**
 * Subsystems that support backpressure.
 */
export const enum BackpressureSubsystem {
	EventBus = 'event-bus',
	ExecutionGraph = 'execution-graph',
	ExecutionService = 'execution-service',
	AgentOrchestrator = 'agent-orchestrator',
	ProcessOrchestrator = 'process-orchestrator',
	ContextEngine = 'context-engine',
}

// ═══════════════════════════════════════════════════════════════════════════════
// TASK 3 — EXECUTION THROTTLING POLICY
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Throttling policy configuration.
 * All limits are dynamic and adapt to current system load.
 */
export interface IThrottlingPolicy {
	/** Maximum concurrent agents (dynamic, 0 = auto) */
	maxConcurrentAgents: number;
	/** Maximum process executions per minute (0 = auto) */
	maxProcessExecutionsPerMinute: number;
	/** Maximum graph mutations per second (0 = auto) */
	maxGraphMutationsPerSecond: number;
	/** Maximum context updates per tick (0 = auto) */
	maxContextUpdatesPerTick: number;
	/** Maximum intent processing rate per second (0 = auto) */
	maxIntentRatePerSecond: number;
	/** Whether emergency mode is active (overrides all limits to safety minimums) */
	emergencyMode: boolean;
	/** Safety ceiling — absolute maximum for any dynamic limit */
	readonly safetyCeilings: IThrottlingSafetyCeilings;
}

/**
 * Safety ceilings — absolute maximums that dynamic limits can never exceed.
 */
export interface IThrottlingSafetyCeilings {
	readonly maxConcurrentAgents: number;
	readonly maxProcessExecutionsPerMinute: number;
	readonly maxGraphMutationsPerSecond: number;
	readonly maxContextUpdatesPerTick: number;
	readonly maxIntentRatePerSecond: number;
}

/**
 * Default throttling safety ceilings.
 */
export const DEFAULT_SAFETY_CEILINGS: IThrottlingSafetyCeilings = {
	maxConcurrentAgents: 10,
	maxProcessExecutionsPerMinute: 120,
	maxGraphMutationsPerSecond: 500,
	maxContextUpdatesPerTick: 50,
	maxIntentRatePerSecond: 100,
};

/**
 * Result of a throttle check for an operation.
 */
export interface IThrottleCheckResult {
	/** Whether the operation is allowed */
	readonly allowed: boolean;
	/** Reason if not allowed */
	readonly reason: string | undefined;
	/** Current throttle level */
	readonly throttleLevel: BackpressureLevel;
	/** Suggested retry delay in ms (0 = no delay) */
	readonly retryDelayMs: number;
	/** Which policy limit was hit (if any) */
	readonly limitHit: string | undefined;
}

// ═══════════════════════════════════════════════════════════════════════════════
// TASK 4 — FAILURE CASCADE PREVENTION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Isolation boundary types.
 */
export const enum IsolationBoundary {
	/** Agent isolation — agent failures don't affect other agents */
	Agent = 'agent',
	/** Process isolation — process failures don't affect other processes */
	Process = 'process',
	/** Graph isolation — graph issues don't affect execution */
	Graph = 'graph',
	/** Context isolation — context issues don't affect execution */
	Context = 'context',
	/** Mutation isolation — mutation issues don't affect UI */
	Mutation = 'mutation',
	/** UI isolation — UI never blocked by backend issues */
	UI = 'ui',
}

/**
 * Quarantine status for a subsystem.
 */
export interface IQuarantineStatus {
	/** Subsystem in quarantine */
	readonly subsystem: string;
	/** Whether the subsystem is quarantined */
	readonly quarantined: boolean;
	/** Reason for quarantine */
	readonly reason: string;
	/** Timestamp when quarantine started */
	readonly startedAt: number | undefined;
	/** Degradation path applied */
	readonly degradationPath: DegradationPath;
	/** Whether automatic un-quarantine is possible */
	readonly autoRecoverable: boolean;
}

/**
 * Degradation paths for subsystems under failure.
 */
export const enum DegradationPath {
	/** No degradation — subsystem still operating */
	None = 'none',
	/** Read-only mode — no writes allowed */
	ReadOnly = 'read-only',
	/** Queued mode — operations queued but not executed */
	Queued = 'queued',
	/** Disabled — subsystem temporarily disabled */
	Disabled = 'disabled',
	/** Fallback — using cached/stale data */
	Fallback = 'fallback',
}

/**
 * A failure containment zone.
 */
export interface IContainmentZone {
	/** Zone ID */
	readonly id: string;
	/** Zone name */
	readonly name: string;
	/** Boundaries of this zone */
	readonly boundaries: readonly IsolationBoundary[];
	/** Subsystems within this zone */
	readonly subsystems: readonly string[];
	/** Whether the zone is currently containing a failure */
	containing: boolean;
	/** Current degradation level */
	degradation: DegradationPath;
	/** Timestamp of last containment event */
	lastContainedAt: number | undefined;
}

// ═══════════════════════════════════════════════════════════════════════════════
// TASK 6 — DETERMINISTIC EXECUTION GUARANTEE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Idempotency record for an intent.
 * Prevents double execution of the same intent.
 */
export interface IIdempotencyRecord {
	/** Intent ID */
	readonly intentId: string;
	/** Hash of the intent's parameters (for deduplication) */
	readonly parameterHash: string;
	/** Whether this intent has been executed */
	readonly executed: boolean;
	/** Timestamp of first execution */
	readonly executedAt: number | undefined;
	/** Result of first execution */
	readonly result: 'success' | 'failure' | 'pending';
	/** Number of duplicate attempts detected */
	readonly duplicateAttempts: number;
}

/**
 * Result of a determinism check.
 */
export interface IDeterminismCheckResult {
	/** Whether the intent passes determinism checks */
	readonly allowed: boolean;
	/** Whether this is a duplicate of an already-executed intent */
	readonly isDuplicate: boolean;
	/** Original intent ID (if duplicate) */
	readonly originalIntentId: string | undefined;
	/** Whether race conditions are possible */
	readonly raceConditionRisk: 'none' | 'low' | 'medium' | 'high';
	/** Reason for denial (if not allowed) */
	readonly denialReason: string | undefined;
}

// ═══════════════════════════════════════════════════════════════════════════════
// TASK 7 — GLOBAL EXECUTION ORDERING
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Execution priority tiers — strict ordering of subsystem operations.
 * Operations in higher-priority tiers are always processed before lower tiers.
 */
export const enum ExecutionPriorityTier {
	/** Tier 0: Safety operations (system protection, data integrity) */
	Safety = 0,
	/** Tier 1: System state stability (sync, coherence, state transitions) */
	SystemStability = 1,
	/** Tier 2: Active intents (user/agent requests being processed) */
	ActiveIntents = 2,
	/** Tier 3: Agent execution (plan steps, capability validation) */
	AgentExecution = 3,
	/** Tier 4: Process execution (terminal commands, builds) */
	ProcessExecution = 4,
	/** Tier 5: Graph updates (node/edge creation, scope changes) */
	GraphUpdates = 5,
	/** Tier 6: Context updates (domain refreshes, symbol analysis) */
	ContextUpdates = 6,
	/** Tier 7: Observability logging (traces, diagnostics) */
	Observability = 7,
}

/**
 * An ordered execution operation.
 */
export interface IOrderedExecution {
	/** Unique ID */
	readonly id: string;
	/** Priority tier */
	readonly tier: ExecutionPriorityTier;
	/** Within-tier priority (lower = higher priority) */
	readonly withinTierPriority: number;
	/** Timestamp when the operation was submitted */
	readonly submittedAt: number;
	/** Description */
	readonly description: string;
	/** Whether this operation has been executed */
	executed: boolean;
	/** Whether this operation was skipped due to stabilization */
	skipped: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════════
// TASK 8 — MEMORY PRESSURE CONTROL
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Memory pressure level.
 */
export const enum MemoryPressureLevel {
	/** Memory usage is normal */
	Normal = 'normal',
	/** Memory usage is elevated — start pruning */
	Elevated = 'elevated',
	/** Memory usage is high — aggressive pruning */
	High = 'high',
	/** Memory usage is critical — emergency eviction */
	Critical = 'critical',
}

/**
 * Memory pressure configuration.
 */
export interface IMemoryPressureConfig {
	/** Maximum graph nodes before pruning (default: 10000) */
	readonly maxGraphNodes: number;
	/** Graph pruning batch size (default: 500) */
	readonly graphPruningBatch: number;
	/** Maximum context entries before eviction (default: 5000) */
	readonly maxContextEntries: number;
	/** Agent history trim limit (keep last N plans, default: 50) */
	readonly maxAgentHistoryPlans: number;
	/** Process log rotation size in KB (default: 1024) */
	readonly processLogRotationKb: number;
	/** Event bus memory cap in events (default: 10000) */
	readonly eventBusMemoryCap: number;
	/** Intent history trim limit (keep last N, default: 1000) */
	readonly maxIntentHistory: number;
	/** Decision history trim limit (keep last N, default: 500) */
	readonly maxDecisionHistory: number;
	/** Memory pressure threshold for Elevated (0–1, default: 0.6) */
	readonly elevatedThreshold: number;
	/** Memory pressure threshold for High (0–1, default: 0.8) */
	readonly highThreshold: number;
	/** Memory pressure threshold for Critical (0–1, default: 0.9) */
	readonly criticalThreshold: number;
}

/**
 * Result of a memory pressure control cycle.
 */
export interface IMemoryControlResult {
	/** Pressure level detected */
	readonly pressureLevel: MemoryPressureLevel;
	/** Number of graph nodes pruned */
	readonly graphNodesPruned: number;
	/** Number of context entries evicted */
	readonly contextEntriesEvicted: number;
	/** Number of agent history plans trimmed */
	readonly agentHistoryTrimmed: number;
	/** Number of process logs rotated */
	readonly processLogsRotated: number;
	/** Number of events trimmed from bus */
	readonly eventBusTrimmed: number;
	/** Number of intent history records trimmed */
	readonly intentHistoryTrimmed: number;
	/** Number of decision history records trimmed */
	readonly decisionHistoryTrimmed: number;
	/** Estimated memory freed in KB */
	readonly memoryFreedKb: number;
	/** Timestamp */
	readonly completedAt: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// TASK 9 — SELF-DIAGNOSTIC LOOP
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Diagnostic check types.
 */
export const enum DiagnosticCheckType {
	/** Check for execution lag */
	ExecutionLag = 'execution-lag',
	/** Check for stuck intents */
	StuckIntents = 'stuck-intents',
	/** Check for orphan agents */
	OrphanAgents = 'orphan-agents',
	/** Check for zombie processes */
	ZombieProcesses = 'zombie-processes',
	/** Check for graph drift */
	GraphDrift = 'graph-drift',
	/** Check for context staleness */
	ContextStaleness = 'context-staleness',
}

/**
 * Result of a diagnostic check.
 */
export interface IDiagnosticCheckResult {
	/** Check type */
	readonly type: DiagnosticCheckType;
	/** Whether issues were found */
	readonly hasIssues: boolean;
	/** Issue count */
	readonly issueCount: number;
	/** Details of issues found */
	readonly details: readonly IDiagnosticIssue[];
	/** Auto-recovery action taken */
	readonly recoveryAction: DiagnosticRecoveryAction;
	/** Whether recovery was successful */
	readonly recoverySuccessful: boolean;
	/** Timestamp */
	readonly checkedAt: number;
}

/**
 * A diagnostic issue found during self-check.
 */
export interface IDiagnosticIssue {
	/** Issue ID */
	readonly id: string;
	/** Check type */
	readonly checkType: DiagnosticCheckType;
	/** Severity */
	readonly severity: 'info' | 'warning' | 'error' | 'critical';
	/** Description */
	readonly description: string;
	/** Related resource IDs */
	readonly relatedIds: readonly string[];
}

/**
 * Recovery actions the diagnostic loop can take.
 */
export const enum DiagnosticRecoveryAction {
	/** No action needed */
	None = 'none',
	/** Auto-recovered the issue */
	AutoRecovered = 'auto-recovered',
	/** Degraded the subsystem */
	Degraded = 'degraded',
	/** Restarted the subsystem safely */
	Restarted = 'restarted',
	/** Quarantined the failing component */
	Quarantined = 'quarantined',
	/** Escalated for manual intervention */
	Escalated = 'escalated',
}

/**
 * Result of a full diagnostic cycle.
 */
export interface IDiagnosticCycleResult {
	/** Timestamp */
	readonly completedAt: number;
	/** Duration in ms */
	readonly durationMs: number;
	/** Individual check results */
	readonly checks: readonly IDiagnosticCheckResult[];
	/** Total issues found */
	readonly totalIssues: number;
	/** Issues resolved by auto-recovery */
	readonly autoRecovered: number;
	/** Issues that required degradation */
	readonly degraded: number;
	/** Issues that could not be auto-recovered */
	readonly unresolvable: number;
	/** Whether the system is in a healthy state after the cycle */
	readonly systemHealthy: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════════
// TASK 10 — PRODUCTION READINESS MODE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Production mode configuration.
 */
export interface IProductionModeConfig {
	/** Whether production mode is enabled */
	enabled: boolean;
	/** Disable verbose observability when enabled */
	readonly disableVerboseObservability: boolean;
	/** Reduce graph verbosity (fewer metadata fields per node) */
	readonly reduceGraphVerbosity: boolean;
	/** Limit debug events per second (0 = no limit) */
	readonly debugEventLimitPerSecond: number;
	/** Enforce strict throttling (ignore dynamic adjustments) */
	readonly strictThrottling: boolean;
	/** Enable full stability constraints (all safety mechanisms active) */
	readonly fullStabilityConstraints: boolean;
	/** Maximum event bus buffer in production mode */
	readonly eventBusBufferCap: number;
	/** Maximum graph nodes in production mode */
	readonly graphNodeCap: number;
	/** Whether coherence validation runs on schedule in production */
	readonly scheduledCoherence: boolean;
	/** Coherence validation interval in production mode (ms) */
	readonly coherenceIntervalMs: number;
}

/**
 * Default production mode configuration.
 */
export const DEFAULT_PRODUCTION_MODE_CONFIG: IProductionModeConfig = {
	enabled: false,
	disableVerboseObservability: true,
	reduceGraphVerbosity: true,
	debugEventLimitPerSecond: 10,
	strictThrottling: true,
	fullStabilityConstraints: true,
	eventBusBufferCap: 5000,
	graphNodeCap: 5000,
	scheduledCoherence: true,
	coherenceIntervalMs: 30000,
};

/**
 * Production mode overhead comparison.
 */
export interface IProductionModeOverhead {
	/** Estimated overhead with production mode OFF */
	readonly devModeOverhead: {
		readonly eventBusEventsPerSec: number;
		readonly graphNodeRate: number;
		readonly observabilityTraceRate: number;
		readonly estimatedMemoryMb: number;
	};
	/** Estimated overhead with production mode ON */
	readonly prodModeOverhead: {
		readonly eventBusEventsPerSec: number;
		readonly graphNodeRate: number;
		readonly observabilityTraceRate: number;
		readonly estimatedMemoryMb: number;
	};
	/** Estimated reduction factor */
	readonly reductionFactor: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SERVICE INTERFACE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * ISystemStabilizationService — Transforms the system from "architecturally
 * complete" to "runtime stable under real-world continuous usage".
 *
 * This service provides:
 *   - Global load control with adaptive throttling
 *   - Backpressure across all subsystems
 *   - Execution throttling with safety ceilings
 *   - Failure cascade prevention with isolation boundaries
 *   - System stability state machine (5 states)
 *   - Deterministic execution guarantees (idempotency, no double execution)
 *   - Global execution ordering (8 priority tiers)
 *   - Memory pressure control with pruning/eviction/rotation
 *   - Self-diagnostic loop with auto-recovery
 *   - Production readiness mode
 */
export interface ISystemStabilizationService {
	readonly _serviceBrand: undefined;

	// ─── Load Control (Task 1) ────────────────────────────────────────────────

	/** Current load metrics */
	readonly loadMetrics: ILoadMetrics;

	/** Get load thresholds */
	readonly loadThresholds: ILoadThresholds;

	/** Set load thresholds */
	setLoadThresholds(thresholds: Partial<ILoadThresholds>): void;

	/** Check if the system is overloaded */
	readonly isOverloaded: boolean;

	// ─── Backpressure (Task 2) ────────────────────────────────────────────────

	/** Get backpressure status for all subsystems */
	getBackpressureStatus(): readonly IBackpressureStatus[];

	/** Get backpressure status for a specific subsystem */
	getSubsystemBackpressure(subsystem: BackpressureSubsystem): IBackpressureStatus;

	/** Apply backpressure to a subsystem */
	applyBackpressure(subsystem: BackpressureSubsystem, level: BackpressureLevel, reason: string): void;

	/** Release backpressure on a subsystem */
	releaseBackpressure(subsystem: BackpressureSubsystem): void;

	/** Event: backpressure level changed */
	readonly onDidChangeBackpressure: Event<IBackpressureStatus>;

	// ─── Throttling (Task 3) ──────────────────────────────────────────────────

	/** Get current throttling policy */
	readonly throttlingPolicy: IThrottlingPolicy;

	/** Update throttling policy */
	updateThrottlingPolicy(policy: Partial<IThrottlingPolicy>): void;

	/** Check if an operation is allowed by throttling */
	checkThrottle(operationType: string): IThrottleCheckResult;

	/** Enable/disable emergency mode */
	setEmergencyMode(enabled: boolean): void;

	/** Whether emergency mode is active */
	readonly emergencyMode: boolean;

	// ─── Failure Cascade Prevention (Task 4) ─────────────────────────────────

	/** Get containment zones */
	getContainmentZones(): readonly IContainmentZone[];

	/** Quarantine a subsystem */
	quarantineSubsystem(subsystem: string, reason: string, degradation: DegradationPath): void;

	/** Release a subsystem from quarantine */
	releaseQuarantine(subsystem: string): void;

	/** Get quarantine status for a subsystem */
	getQuarantineStatus(subsystem: string): IQuarantineStatus;

	/** Report a subsystem failure (triggers containment) */
	reportFailure(subsystem: string, failureType: string, description: string): void;

	/** Event: subsystem quarantined */
	readonly onDidQuarantine: Event<IQuarantineStatus>;

	/** Event: subsystem released from quarantine */
	readonly onDidReleaseQuarantine: Event<IQuarantineStatus>;

	// ─── Stability State Machine (Task 5) ────────────────────────────────────

	/** Current stability state */
	readonly stabilityState: SystemStabilityState;

	/** Get the behavior rules for the current stability state */
	readonly currentBehavior: IStabilityStateBehavior;

	/** Get the behavior rules for a specific stability state */
	getBehaviorForState(state: SystemStabilityState): IStabilityStateBehavior;

	/** Manually transition to a stability state (usually automatic) */
	forceStabilityState(state: SystemStabilityState, reason: string): void;

	/** Event: stability state changed */
	readonly onDidChangeStabilityState: Event<{ from: SystemStabilityState; to: SystemStabilityState; reason: string }>;

	// ─── Deterministic Execution (Task 6) ────────────────────────────────────

	/** Check if an intent passes determinism checks */
	checkDeterminism(intentId: string, parameterHash: string): IDeterminismCheckResult;

	/** Record that an intent has been executed (for idempotency tracking) */
	recordExecution(intentId: string, parameterHash: string, result: 'success' | 'failure'): void;

	/** Get the idempotency record for an intent */
	getIdempotencyRecord(intentId: string): IIdempotencyRecord | undefined;

	/** Get duplicate execution attempts count */
	readonly duplicateExecutionAttempts: number;

	// ─── Execution Ordering (Task 7) ─────────────────────────────────────────

	/** Submit an operation for ordered execution */
	submitOrderedExecution(tier: ExecutionPriorityTier, withinTierPriority: number, description: string): IOrderedExecution;

	/** Get the current execution queue */
	getExecutionQueue(): readonly IOrderedExecution[];

	/** Process the next operation in the queue */
	processNextExecution(): IOrderedExecution | undefined;

	/** Clear the execution queue */
	clearExecutionQueue(): void;

	/** Get the queue depth for a specific tier */
	getQueueDepth(tier: ExecutionPriorityTier): number;

	// ─── Memory Pressure Control (Task 8) ────────────────────────────────────

	/** Get current memory pressure level */
	readonly memoryPressureLevel: MemoryPressureLevel;

	/** Get memory pressure configuration */
	readonly memoryPressureConfig: IMemoryPressureConfig;

	/** Update memory pressure configuration */
	setMemoryPressureConfig(config: Partial<IMemoryPressureConfig>): void;

	/** Run a memory control cycle (prune, evict, trim, rotate) */
	runMemoryControlCycle(): IMemoryControlResult;

	/** Get estimated memory usage in KB */
	readonly estimatedMemoryUsageKb: number;

	// ─── Self-Diagnostic Loop (Task 9) ───────────────────────────────────────

	/** Run a full diagnostic cycle */
	runDiagnosticCycle(): IDiagnosticCycleResult;

	/** Run a specific diagnostic check */
	runDiagnosticCheck(checkType: DiagnosticCheckType): IDiagnosticCheckResult;

	/** Get the last diagnostic cycle result */
	readonly lastDiagnosticResult: IDiagnosticCycleResult | undefined;

	/** Whether the diagnostic loop is running */
	readonly diagnosticLoopActive: boolean;

	/** Start the diagnostic loop */
	startDiagnosticLoop(intervalMs?: number): void;

	/** Stop the diagnostic loop */
	stopDiagnosticLoop(): void;

	/** Event: diagnostic cycle completed */
	readonly onDidCompleteDiagnosticCycle: Event<IDiagnosticCycleResult>;

	// ─── Production Mode (Task 10) ───────────────────────────────────────────

	/** Whether production mode is enabled */
	readonly productionMode: boolean;

	/** Get production mode configuration */
	readonly productionModeConfig: IProductionModeConfig;

	/** Toggle production mode */
	setProductionMode(enabled: boolean): void;

	/** Update production mode configuration */
	updateProductionModeConfig(config: Partial<IProductionModeConfig>): void;

	/** Get overhead comparison between dev and prod modes */
	getProductionModeOverhead(): IProductionModeOverhead;

	/** Event: production mode changed */
	readonly onDidChangeProductionMode: Event<boolean>;

	// ─── System-Wide ─────────────────────────────────────────────────────────

	/** Get a comprehensive stabilization status */
	getStabilizationStatus(): IStabilizationStatus;

	/** Run a full stabilization sweep (load check + memory control + diagnostics + coherence) */
	runFullStabilizationSweep(): IStabilizationSweepResult;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SUPPORTING TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Comprehensive stabilization status.
 */
export interface IStabilizationStatus {
	readonly timestamp: number;
	readonly stabilityState: SystemStabilityState;
	readonly currentBehavior: IStabilityStateBehavior;
	readonly loadMetrics: ILoadMetrics;
	readonly memoryPressure: MemoryPressureLevel;
	readonly productionMode: boolean;
	readonly emergencyMode: boolean;
	readonly quarantineCount: number;
	readonly backpressureSummary: Record<string, BackpressureLevel>;
	readonly diagnosticHealthy: boolean;
	readonly estimatedMemoryKb: number;
}

/**
 * Result of a full stabilization sweep.
 */
export interface IStabilizationSweepResult {
	readonly timestamp: number;
	readonly durationMs: number;
	readonly stabilityState: SystemStabilityState;
	readonly loadMetrics: ILoadMetrics;
	readonly memoryControl: IMemoryControlResult;
	readonly diagnosticCycle: IDiagnosticCycleResult;
	readonly actionsTaken: readonly string[];
	readonly systemHealthy: boolean;
}
