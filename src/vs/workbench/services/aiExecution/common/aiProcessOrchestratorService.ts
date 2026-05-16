/*---------------------------------------------------------------------------------------------
 *  Terminal + Process Orchestration System — Phase 8
 *  Real Vibecode — AI-Native IDE
 *
 *  IAIProcessOrchestratorService — The Process Orchestrator Runtime.
 *  A policy-controlled execution environment integrated into the AI runtime.
 *
 *  This is NOT:
 *    - Simple terminal wrappers
 *    - Raw shell execution
 *    - Unrestricted subprocess spawning
 *
 *  This IS:
 *    - A policy-controlled execution environment integrated into the AI runtime
 *    - All execution routes through AIProcessOrchestratorService
 *    - Every process becomes graph nodes, observable events, recoverable state
 *    - No fire-and-forget execution
 *    - Long-running processes are supervised
 *    - Command execution is policy-validated
 *    - Unsafe execution supports approval escalation
 *
 *  Hard Rules:
 *    1. Agents MUST NOT directly access raw terminal APIs
 *    2. ALL execution MUST route through AIProcessOrchestratorService
 *    3. Every process MUST become graph nodes
 *    4. Every process MUST produce observable events
 *    5. Every process MUST be recoverable
 *    6. No fire-and-forget execution
 *    7. Long-running processes MUST be supervised
 *    8. Command execution MUST be policy validated
 *    9. Unsafe execution MUST support approval escalation
 *--------------------------------------------------------------------------------------------*/

import { Event } from '../../../../base/common/event.js';
import { IDisposable } from '../../../../base/common/lifecycle.js';
import { URI } from '../../../../base/common/uri.js';
import { CancellationToken } from '../../../../base/common/cancellation.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { AIMutationSource } from './aiExecutionService.js';
import { IExecutionNode } from './executionGraphService.js';

export const IAIProcessOrchestratorService = createDecorator<IAIProcessOrchestratorService>('aiProcessOrchestratorService');

// ─── Process Lifecycle ────────────────────────────────────────────────────────

/**
 * The lifecycle states of a process session.
 */
export const enum ProcessLifecycleState {
	/** Process has been created but not started */
	Created = 'created',
	/** Awaiting policy validation */
	PendingApproval = 'pending-approval',
	/** Process is starting up */
	Starting = 'starting',
	/** Process is running */
	Running = 'running',
	/** Process is paused/suspended */
	Suspended = 'suspended',
	/** Process is being restarted */
	Restarting = 'restarting',
	/** Process exited normally */
	Completed = 'completed',
	/** Process exited with non-zero code */
	Failed = 'failed',
	/** Process was cancelled/killed */
	Cancelled = 'cancelled',
	/** Process crashed and needs recovery */
	Crashed = 'crashed',
	/** Process has been cleaned up */
	Disposed = 'disposed',
}

// ─── Execution Modes ──────────────────────────────────────────────────────────

/**
 * How a process should be executed.
 */
export const enum ExecutionMode {
	/** Run in foreground — block until completion */
	Foreground = 'foreground',
	/** Run in background — return immediately, stream output */
	Background = 'background',
	/** Run with supervision — auto-restart on crash, health monitoring */
	Supervised = 'supervised',
	/** Run once and clean up — short-lived, no persistence */
	Ephemeral = 'ephemeral',
	/** Run in a persistent session — can be reconnected to */
	PersistentSession = 'persistent-session',
}

// ─── Stream Channels ──────────────────────────────────────────────────────────

/**
 * Output stream channels from a process.
 */
export const enum StreamChannel {
	/** Standard output */
	Stdout = 'stdout',
	/** Standard error */
	Stderr = 'stderr',
	/** Standard input (for writing to process) */
	Stdin = 'stdin',
	/** Debug/control channel */
	Control = 'control',
}

/**
 * A chunk of output from a process.
 */
export interface IProcessOutputChunk {
	/** Process session ID */
	readonly sessionId: string;
	/** Which channel this output came from */
	readonly channel: StreamChannel;
	/** The output text */
	readonly text: string;
	/** Timestamp when this chunk was received */
	readonly timestamp: number;
	/** Line number (incremental) */
	readonly lineNumber: number;
	/** Whether this output was classified */
	readonly classification?: OutputClassification;
}

// ─── Output Classification ────────────────────────────────────────────────────

/**
 * Classification of process output for terminal intelligence.
 */
export const enum OutputClassification {
	/** Normal informational output */
	Info = 'info',
	/** Warning-level output */
	Warning = 'warning',
	/** Error output */
	Error = 'error',
	/** Build output (compilation messages) */
	BuildOutput = 'build-output',
	/** Test result output */
	TestResult = 'test-result',
	/** Stack trace */
	StackTrace = 'stack-trace',
	/** Package manager output (npm, yarn, etc.) */
	PackageManager = 'package-manager',
	/** Dev server output */
	DevServer = 'dev-server',
	/** Progress indicator */
	Progress = 'progress',
	/** Success/completion message */
	Success = 'success',
	/** Unknown/unclassified output */
	Unknown = 'unknown',
}

/**
 * A parsed error from process output.
 */
export interface IParsedError {
	/** File path mentioned in the error (if any) */
	readonly filePath: string | undefined;
	/** Line number mentioned in the error (if any) */
	readonly line: number | undefined;
	/** Column number (if any) */
	readonly column: number | undefined;
	/** Error code (e.g., TS2307, EACCES) */
	readonly errorCode: string | undefined;
	/** Error message */
	readonly message: string;
	/** Severity */
	readonly severity: 'error' | 'warning' | 'info';
	/** Source tool (e.g., 'tsc', 'eslint', 'npm') */
	readonly tool: string | undefined;
}

/**
 * Summary of a process execution result.
 */
export interface IProcessResultSummary {
	/** Whether the process succeeded */
	readonly success: boolean;
	/** Exit code */
	readonly exitCode: number | undefined;
	/** Total execution time in ms */
	readonly durationMs: number;
	/** Number of errors found in output */
	readonly errorCount: number;
	/** Number of warnings found in output */
	readonly warningCount: number;
	/** Parsed errors from output */
	readonly parsedErrors: readonly IParsedError[];
	/** Human-readable summary */
	readonly summary: string;
}

// ─── Execution Policy ─────────────────────────────────────────────────────────

/**
 * Risk level of a command.
 */
export const enum CommandRiskLevel {
	/** Safe — read-only, no side effects */
	Safe = 'safe',
	/** Low risk — limited, reversible side effects */
	LowRisk = 'low-risk',
	/** Medium risk — significant side effects, potentially irreversible */
	MediumRisk = 'medium-risk',
	/** High risk — destructive or system-altering */
	HighRisk = 'high-risk',
	/** Critical — could cause data loss or security breach */
	Critical = 'critical',
}

/**
 * Policy decision for a command execution request.
 */
export const enum PolicyDecision {
	/** Allow execution */
	Allow = 'allow',
	/** Deny execution */
	Deny = 'deny',
	/** Require approval before execution */
	RequireApproval = 'require-approval',
	/** Execute in sandbox/restricted mode */
	Sandbox = 'sandbox',
	/** Escalate to higher authority */
	Escalate = 'escalate',
}

/**
 * An execution policy that governs command execution.
 */
export interface IExecutionPolicy {
	/** Unique policy ID */
	readonly id: string;
	/** Human-readable name */
	readonly name: string;
	/** Description of what this policy enforces */
	readonly description: string;
	/** Command patterns this policy applies to */
	readonly commandPatterns: readonly string[];
	/** Default decision for matching commands */
	readonly defaultDecision: PolicyDecision;
	/** Risk level threshold — commands above this level require escalation */
	readonly riskThreshold: CommandRiskLevel;
	/** Maximum execution time in ms (0 = no limit) */
	readonly timeoutMs: number;
	/** Whether filesystem access is restricted */
	readonly filesystemRestricted: boolean;
	/** Allowed directories (if filesystemRestricted) */
	readonly allowedDirectories: readonly string[];
	/** Whether network access is restricted */
	readonly networkRestricted: boolean;
	/** Maximum memory usage in MB (0 = no limit) */
	readonly maxMemoryMb: number;
	/** Whether this policy is active */
	readonly active: boolean;
}

/**
 * Result of evaluating a command against execution policies.
 */
export interface IPolicyEvaluationResult {
	/** The final policy decision */
	readonly decision: PolicyDecision;
	/** Risk level assessed for the command */
	readonly riskLevel: CommandRiskLevel;
	/** Which policy was applied */
	readonly appliedPolicyId: string | undefined;
	/** Reasons for the decision */
	readonly reasons: readonly string[];
	/** Whether approval is required and at what level */
	readonly requiredApprovalLevel: ProcessApprovalLevel | undefined;
	/** Suggested sandbox restrictions (if decision = Sandbox) */
	readonly sandboxRestrictions: readonly string[];
	/** Blocked patterns detected in the command */
	readonly blockedPatterns: readonly string[];
}

// ─── Approval System ──────────────────────────────────────────────────────────

/**
 * Approval levels for process execution.
 */
export const enum ProcessApprovalLevel {
	/** No approval needed */
	Automatic = 'automatic',
	/** Ask once for this command pattern */
	AskOnce = 'ask-once',
	/** Ask every time this command pattern appears */
	AskEveryTime = 'ask-every-time',
	/** Manual review required */
	ManualReview = 'manual-review',
}

/**
 * A process approval request.
 */
export interface IProcessApprovalRequest {
	/** Unique request ID */
	readonly id: string;
	/** The command requesting approval */
	readonly command: string;
	/** Risk level */
	readonly riskLevel: CommandRiskLevel;
	/** Required approval level */
	readonly requiredLevel: ProcessApprovalLevel;
	/** Policy evaluation result */
	readonly policyResult: IPolicyEvaluationResult;
	/** Human-readable description of what will happen */
	readonly description: string;
	/** Requesting agent ID (if agent-initiated) */
	readonly agentId: string | undefined;
	/** Timestamp */
	readonly requestedAt: number;
	/** Result (initially Pending) */
	result: ProcessApprovalResult;
	/** Resolved by */
	readonly resolvedBy?: string;
	/** Resolution timestamp */
	readonly resolvedAt?: number;
}

/**
 * Result of a process approval request.
 */
export const enum ProcessApprovalResult {
	Pending = 'pending',
	Approved = 'approved',
	Denied = 'denied',
	Expired = 'expired',
}

// ─── Process Session ──────────────────────────────────────────────────────────

/**
 * A process session — the primary unit of process execution tracking.
 */
export interface IProcessSession {
	/** Unique session ID */
	readonly id: string;
	/** The command being executed */
	readonly command: string;
	/** Command arguments */
	readonly args: readonly string[];
	/** Working directory */
	readonly cwd: URI | undefined;
	/** Environment variables */
	readonly env: ReadonlyMap<string, string>;
	/** Execution mode */
	readonly mode: ExecutionMode;
	/** Current lifecycle state */
	lifecycleState: ProcessLifecycleState;
	/** Execution policy applied */
	readonly appliedPolicy: IPolicyEvaluationResult | undefined;
	/** Process group ID (for grouping related processes) */
	readonly groupId: string | undefined;
	/** Execution graph node ID */
	graphNodeId: string | undefined;
	/** Execution graph scope ID */
	scopeId: string | undefined;
	/** Restart policy */
	readonly restartPolicy: IRestartPolicy;
	/** PID of the actual process (if running) */
	pid: number | undefined;
	/** Exit code */
	exitCode: number | undefined;
	/** Whether this session was started by an agent */
	readonly agentId: string | undefined;
	/** Timestamp when session was created */
	readonly createdAt: number;
	/** Timestamp when process started */
	startedAt: number | undefined;
	/** Timestamp when process completed */
	completedAt: number | undefined;
	/** Output buffer (ring buffer) */
	readonly outputBuffer: readonly IProcessOutputChunk[];
	/** Checkpoint (for recovery) */
	checkpoint: IProcessCheckpoint | undefined;
	/** Result summary (set on completion) */
	resultSummary: IProcessResultSummary | undefined;
	/** Whether this session is currently being supervised */
	readonly supervised: boolean;
	/** Heartbeat state */
	heartbeat: IProcessHeartbeat | undefined;
}

// ─── Restart Policy ───────────────────────────────────────────────────────────

/**
 * Policy for restarting a process on failure.
 */
export interface IRestartPolicy {
	/** Whether to restart on failure */
	readonly restartOnFailure: boolean;
	/** Maximum restart attempts */
	readonly maxRestarts: number;
	/** Delay between restarts in ms */
	readonly restartDelayMs: number;
	/** Whether to use exponential backoff */
	readonly exponentialBackoff: boolean;
	/** Conditions under which to restart */
	readonly restartOn: readonly ProcessRestartCondition[];
}

/**
 * Conditions for process restart.
 */
export const enum ProcessRestartCondition {
	/** Process exited with non-zero code */
	NonZeroExit = 'non-zero-exit',
	/** Process crashed (signal) */
	Crash = 'crash',
	/** Process exceeded memory limit */
	OomKill = 'oom-kill',
	/** Process became unresponsive (heartbeat timeout) */
	Unresponsive = 'unresponsive',
	/** Any failure */
	Any = 'any',
}

// ─── Process Heartbeat ────────────────────────────────────────────────────────

/**
 * Heartbeat tracking for supervised processes.
 */
export interface IProcessHeartbeat {
	/** Last heartbeat timestamp */
	lastBeatAt: number;
	/** Expected heartbeat interval in ms */
	readonly intervalMs: number;
	/** Number of missed heartbeats */
	missedBeats: number;
	/** Maximum missed beats before declaring unresponsive */
	readonly maxMissedBeats: number;
	/** Whether the process is considered alive */
	alive: boolean;
}

// ─── Process Checkpoint ───────────────────────────────────────────────────────

/**
 * A checkpoint of process execution state for recovery.
 */
export interface IProcessCheckpoint {
	/** When the checkpoint was taken */
	readonly takenAt: number;
	/** Lifecycle state at checkpoint time */
	readonly stateAtCheckpoint: ProcessLifecycleState;
	/** The command and args (for re-execution) */
	readonly command: string;
	readonly args: readonly string[];
	readonly cwd: URI | undefined;
	/** How much output was buffered at checkpoint time */
	readonly outputLineCount: number;
	/** Number of restarts consumed */
	readonly restartsConsumed: number;
	/** Whether this checkpoint is resumable */
	readonly resumable: boolean;
	/** Reason for the checkpoint */
	readonly reason: 'suspend' | 'crash' | 'timeout' | 'approval-wait' | 'interrupt';
}

// ─── Process Group ────────────────────────────────────────────────────────────

/**
 * A group of related process sessions.
 * Used for coordinated execution (e.g., build + test + deploy).
 */
export interface IProcessGroup {
	/** Unique group ID */
	readonly id: string;
	/** Human-readable label */
	readonly label: string;
	/** Session IDs in this group */
	readonly sessionIds: readonly string[];
	/** Whether the group is active */
	active: boolean;
	/** Created timestamp */
	readonly createdAt: number;
}

// ─── Process Observation ──────────────────────────────────────────────────────

/**
 * Types of process observations.
 */
export const enum ProcessObservationType {
	/** Process lifecycle state changed */
	LifecycleChange = 'lifecycle-change',
	/** Output received */
	OutputReceived = 'output-received',
	/** Error detected in output */
	ErrorDetected = 'error-detected',
	/** Heartbeat missed */
	HeartbeatMissed = 'heartbeat-missed',
	/** Process restarted */
	Restarted = 'restarted',
	/** Policy evaluation completed */
	PolicyEvaluated = 'policy-evaluated',
	/** Approval requested */
	ApprovalRequested = 'approval-requested',
	/** Approval resolved */
	ApprovalResolved = 'approval-resolved',
	/** Checkpoint created */
	CheckpointCreated = 'checkpoint-created',
	/** Recovery initiated */
	RecoveryInitiated = 'recovery-initiated',
	/** Resource limit approached */
	ResourceWarning = 'resource-warning',
	/** Process crashed */
	Crashed = 'crashed',
}

/**
 * A process observation event.
 */
export interface IProcessObservation {
	/** Unique observation ID */
	readonly id: string;
	/** Session ID */
	readonly sessionId: string;
	/** Observation type */
	readonly type: ProcessObservationType;
	/** Timestamp */
	readonly timestamp: number;
	/** Human-readable description */
	readonly description: string;
	/** Additional data */
	readonly data: Record<string, unknown>;
}

// ─── Resource Quotas ──────────────────────────────────────────────────────────

/**
 * Resource quotas for process execution.
 */
export interface IProcessQuota {
	/** Maximum concurrent processes */
	readonly maxConcurrent: number;
	/** Maximum total CPU time per process in seconds (0 = no limit) */
	readonly maxCpuTimeSec: number;
	/** Maximum memory per process in MB (0 = no limit) */
	readonly maxMemoryMb: number;
	/** Maximum output buffer size in KB */
	readonly maxOutputBufferKb: number;
	/** Maximum process count per agent */
	readonly maxPerAgent: number;
	/** Maximum total processes in a group */
	readonly maxPerGroup: number;
}

/**
 * Current resource usage.
 */
export interface IProcessResourceUsage {
	/** Current concurrent process count */
	readonly concurrentCount: number;
	/** Total memory used by processes in MB */
	readonly totalMemoryMb: number;
	/** Total processes ever created */
	readonly totalCreated: number;
	/** Current active (running) processes */
	readonly activeCount: number;
	/** Current supervised processes */
	readonly supervisedCount: number;
}

// ─── Process Safety ───────────────────────────────────────────────────────────

/**
 * Detection result for unsafe process patterns.
 */
export interface IUnsafePatternDetection {
	/** Whether an unsafe pattern was detected */
	readonly detected: boolean;
	/** The patterns that matched */
	readonly matchedPatterns: readonly IUnsafePattern[];
	/** Risk level */
	readonly riskLevel: CommandRiskLevel;
	/** Suggested action */
	readonly suggestedAction: PolicyDecision;
}

/**
 * An unsafe command pattern.
 */
export interface IUnsafePattern {
	/** Pattern name */
	readonly name: string;
	/** Regex pattern */
	readonly pattern: string;
	/** Risk level if matched */
	readonly riskLevel: CommandRiskLevel;
	/** Description of why this is unsafe */
	readonly description: string;
}

// ─── Command Request ──────────────────────────────────────────────────────────

/**
 * A request to execute a command.
 */
export interface IExecutionCommand {
	/** The command to execute */
	readonly command: string;
	/** Command arguments */
	readonly args?: readonly string[];
	/** Working directory */
	readonly cwd?: URI;
	/** Environment variables */
	readonly env?: ReadonlyMap<string, string>;
	/** Execution mode */
	readonly mode: ExecutionMode;
	/** Requesting agent ID (if agent-initiated) */
	readonly agentId?: string;
	/** Process group to assign to */
	readonly groupId?: string;
	/** Restart policy override */
	readonly restartPolicy?: IRestartPolicy;
	/** Whether to buffer output */
	readonly bufferOutput?: boolean;
	/** Maximum output lines to buffer */
	readonly maxOutputLines?: number;
}

// ─── Service Interface ────────────────────────────────────────────────────────

/**
 * IAIProcessOrchestratorService — The Process Orchestrator Runtime.
 *
 * A policy-controlled execution environment for terminal processes,
 * builds, tests, dev servers, and AI-driven command workflows.
 *
 * Phase 8 implements:
 *   - Process session lifecycle management
 *   - Controlled terminal execution with 5 modes
 *   - Live process supervision with streaming and health tracking
 *   - Execution graph integration (every process becomes graph nodes)
 *   - Granular execution policy system with risk scoring
 *   - Process recovery + checkpointing
 *   - Terminal intelligence (output classification, error parsing)
 *   - Agent process integration (agents route through orchestrator)
 *   - Process UI integration
 *   - Safety + isolation (watchdog, zombie cleanup, quotas)
 */
export interface IAIProcessOrchestratorService {
	readonly _serviceBrand: undefined;

	// ─── Execution ───────────────────────────────────────────────────────────

	/**
	 * Execute a command through the controlled pipeline.
	 * Routes through: policy validation → approval → graph → observability → execution.
	 *
	 * @param command The command to execute
	 * @returns The process session
	 */
	executeCommand(command: IExecutionCommand): Promise<IProcessSession>;

	/**
	 * Cancel a running process.
	 *
	 * @param sessionId The session to cancel
	 * @param force Whether to force-kill (SIGKILL vs SIGTERM)
	 */
	cancelProcess(sessionId: string, force?: boolean): Promise<void>;

	/**
	 * Suspend a running process (checkpoint + pause).
	 */
	suspendProcess(sessionId: string): Promise<void>;

	/**
	 * Resume a suspended process from its checkpoint.
	 */
	resumeProcess(sessionId: string): Promise<IProcessSession>;

	// ─── Session Management ──────────────────────────────────────────────────

	/**
	 * Get a process session by ID.
	 */
	getSession(sessionId: string): IProcessSession | undefined;

	/**
	 * Get all active (running) sessions.
	 */
	getActiveSessions(): readonly IProcessSession[];

	/**
	 * Get all sessions (including completed).
	 */
	getAllSessions(): readonly IProcessSession[];

	/**
	 * Get sessions for a specific agent.
	 */
	getAgentSessions(agentId: string): readonly IProcessSession[];

	/**
	 * Get sessions in a process group.
	 */
	getGroupSessions(groupId: string): readonly IProcessSession[];

	// ─── Process Groups ──────────────────────────────────────────────────────

	/**
	 * Create a process group for coordinated execution.
	 */
	createProcessGroup(label: string): IProcessGroup;

	/**
	 * Get a process group by ID.
	 */
	getProcessGroup(groupId: string): IProcessGroup | undefined;

	/**
	 * Dispose a process group and all its sessions.
	 */
	disposeProcessGroup(groupId: string): Promise<void>;

	// ─── Output ──────────────────────────────────────────────────────────────

	/**
	 * Get the output buffer for a session.
	 */
	getOutputBuffer(sessionId: string): readonly IProcessOutputChunk[];

	/**
	 * Write to a process's stdin.
	 */
	writeToStdin(sessionId: string, data: string): void;

	/**
	 * Event that fires when output is received from any process.
	 */
	readonly onDidReceiveOutput: Event<IProcessOutputChunk>;

	// ─── Policy ──────────────────────────────────────────────────────────────

	/**
	 * Evaluate a command against execution policies.
	 * Does NOT execute the command — just returns the policy decision.
	 */
	evaluatePolicy(command: string): IPolicyEvaluationResult;

	/**
	 * Register a custom execution policy.
	 */
	registerPolicy(policy: IExecutionPolicy): IDisposable;

	/**
	 * Get all registered policies.
	 */
	getPolicies(): readonly IExecutionPolicy[];

	/**
	 * Detect unsafe patterns in a command.
	 */
	detectUnsafePatterns(command: string): IUnsafePatternDetection;

	// ─── Approval ────────────────────────────────────────────────────────────

	/**
	 * Get pending process approval requests.
	 */
	getPendingProcessApprovals(): readonly IProcessApprovalRequest[];

	/**
	 * Resolve a process approval request.
	 */
	resolveProcessApproval(requestId: string, result: ProcessApprovalResult.Approved | ProcessApprovalResult.Denied, resolvedBy: string): void;

	/**
	 * Event that fires when a process approval is requested.
	 */
	readonly onDidRequestProcessApproval: Event<IProcessApprovalRequest>;

	/**
	 * Event that fires when a process approval is resolved.
	 */
	readonly onDidResolveProcessApproval: Event<IProcessApprovalRequest>;

	// ─── Observations ────────────────────────────────────────────────────────

	/**
	 * Event that fires when a process observation is produced.
	 */
	readonly onDidProduceProcessObservation: Event<IProcessObservation>;

	/**
	 * Get recent observations for a session.
	 */
	getRecentObservations(sessionId: string, limit?: number): readonly IProcessObservation[];

	// ─── Lifecycle Events ────────────────────────────────────────────────────

	/**
	 * Event that fires when a process lifecycle state changes.
	 */
	readonly onDidChangeProcessLifecycle: Event<{ sessionId: string; fromState: ProcessLifecycleState; toState: ProcessLifecycleState; reason: string }>;

	// ─── Terminal Intelligence ───────────────────────────────────────────────

	/**
	 * Classify a line of process output.
	 */
	classifyOutput(text: string): OutputClassification;

	/**
	 * Parse errors from process output.
	 */
	parseErrors(output: string): readonly IParsedError[];

	/**
	 * Generate a result summary for a completed session.
	 */
	generateResultSummary(sessionId: string): IProcessResultSummary;

	// ─── Resource Quotas ─────────────────────────────────────────────────────

	/**
	 * Get current resource usage.
	 */
	readonly resourceUsage: IProcessResourceUsage;

	/**
	 * Set resource quotas.
	 */
	setQuota(quota: IProcessQuota): void;

	/**
	 * Get current quotas.
	 */
	readonly quota: IProcessQuota;

	/**
	 * Check if quotas are exceeded.
	 */
	isQuotaExceeded(): boolean;

	// ─── Safety ──────────────────────────────────────────────────────────────

	/**
	 * Run safety checks on all active processes.
	 * Detects orphans, zombies, runaway processes.
	 */
	runSafetyChecks(): ISafetyCheckResult;

	/**
	 * Cleanup orphaned/zombie processes.
	 */
	cleanupOrphans(): Promise<number>;

	/**
	 * Get total session count.
	 */
	readonly sessionCount: number;

	/**
	 * Get active (running) session count.
	 */
	readonly activeSessionCount: number;
}

// ─── Safety Check ─────────────────────────────────────────────────────────────

/**
 * Result of running safety checks.
 */
export interface ISafetyCheckResult {
	/** Orphaned sessions detected */
	readonly orphanedSessions: readonly string[];
	/** Zombie processes detected */
	readonly zombiePids: readonly number[];
	/** Runaway processes detected */
	readonly runawaySessions: readonly string[];
	/** Processes exceeding memory limits */
	readonly overMemorySessions: readonly string[];
	/** Recursive spawn detections */
	readonly recursiveSpawns: readonly string[];
	/** Whether any issues were found */
	readonly hasIssues: boolean;
	/** Total issues count */
	readonly issueCount: number;
}
