/*---------------------------------------------------------------------------------------------
 *  Terminal + Process Orchestration System — Phase 8
 *  Real Vibecode — AI-Native IDE
 *
 *  AIProcessOrchestratorService — Concrete implementation.
 *  Policy-controlled execution environment integrated into the AI runtime.
 *--------------------------------------------------------------------------------------------*/

import { Disposable, IDisposable, toDisposable } from '../../../../base/common/lifecycle.js';
import { Emitter, Event } from '../../../../base/common/event.js';
import { URI } from '../../../../base/common/uri.js';
import { generateUuid } from '../../../../base/common/uuid.js';
import { IAIProcessOrchestratorService, ProcessLifecycleState, ExecutionMode, StreamChannel, IProcessOutputChunk, OutputClassification, IParsedError, IProcessResultSummary, CommandRiskLevel, PolicyDecision, IExecutionPolicy, IPolicyEvaluationResult, ProcessApprovalLevel, IProcessApprovalRequest, ProcessApprovalResult, IProcessSession, IRestartPolicy, IProcessHeartbeat, IProcessCheckpoint, IProcessGroup, ProcessObservationType, IProcessObservation, IProcessQuota, IProcessResourceUsage, IExecutionCommand, ISafetyCheckResult, IUnsafePatternDetection, IUnsafePattern, ProcessRestartCondition } from '../common/aiProcessOrchestratorService.js';
import { IAIExecutionService, AIMutationSource } from '../common/aiExecutionService.js';
import { IExecutionGraphService, ExecutionNodeType, ExecutionEdgeType } from '../common/executionGraphService.js';
import { IObservabilityService, TraceCategory, TraceLevel } from '../common/observabilityService.js';
import { IAgentOrchestratorService } from '../common/agentOrchestratorService.js';
import { ILogService } from '../../../../platform/log/common/log.js';

// ─── Default Policies ─────────────────────────────────────────────────────────

const DEFAULT_RESTART_POLICY: IRestartPolicy = {
        restartOnFailure: false,
        maxRestarts: 3,
        restartDelayMs: 2000,
        exponentialBackoff: true,
        restartOn: [ProcessRestartCondition.Crash],
};

const DEFAULT_QUOTA: IProcessQuota = {
        maxConcurrent: 10,
        maxCpuTimeSec: 0,
        maxMemoryMb: 0,
        maxOutputBufferKb: 1024,
        maxPerAgent: 5,
        maxPerGroup: 10,
};

// ─── Unsafe Pattern Definitions ───────────────────────────────────────────────

const UNSAFE_PATTERNS: IUnsafePattern[] = [
        { name: 'recursive-delete', pattern: /\brm\s+(-[a-zA-Z]*f[a-zA-Z]*\s+|.*--recursive.*\s+)\/(?!home\/)/i, riskLevel: CommandRiskLevel.Critical, description: 'Recursive force deletion of system directories' },
        { name: 'sudo', pattern: /\bsudo\b/i, riskLevel: CommandRiskLevel.HighRisk, description: 'Elevated privilege execution' },
        { name: 'chmod-system', pattern: /\bchmod\s+(-[a-zA-Z]*\s+)?[0-7]{3,4}\s+\/(etc|usr|bin|sbin|boot|root)/i, riskLevel: CommandRiskLevel.Critical, description: 'Changing permissions on system directories' },
        { name: 'mass-overwrite', pattern: /\bdd\s+if=/i, riskLevel: CommandRiskLevel.Critical, description: 'Direct disk overwrite command' },
        { name: 'format-disk', pattern: /\b(mkfs|format)\s+/i, riskLevel: CommandRiskLevel.Critical, description: 'Disk formatting command' },
        { name: 'network-script', pattern: /\b(curl|wget)\s+.*\|\s*(ba)?sh/i, riskLevel: CommandRiskLevel.HighRisk, description: 'Piping remote content to shell' },
        { name: 'kill-all', pattern: /\bkill\s+(-9\s+)?-(1|9)\b/, riskLevel: CommandRiskLevel.HighRisk, description: 'Kill all processes signal' },
        { name: 'overwrite-grub', pattern: /\bgrub-install/i, riskLevel: CommandRiskLevel.Critical, description: 'Overwriting bootloader' },
        { name: 'fork-bomb', pattern: /:()\s*{\s*:\s*\|\s*:&\s*}/, riskLevel: CommandRiskLevel.Critical, description: 'Fork bomb pattern' },
        { name: 'env-destruction', pattern: /\bunset\s+PATH/i, riskLevel: CommandRiskLevel.HighRisk, description: 'Destroying PATH environment' },
];

// ─── Command Risk Heuristics ──────────────────────────────────────────────────

const SAFE_COMMANDS = ['ls', 'cat', 'head', 'tail', 'wc', 'echo', 'pwd', 'which', 'node --version', 'npm --version', 'git status', 'git log', 'git diff', 'git branch', 'dir', 'type', 'whoami', 'hostname'];
const LOW_RISK_COMMANDS = ['npm install', 'npm run', 'yarn', 'pnpm', 'npx', 'tsc', 'eslint', 'prettier', 'jest', 'mocha', 'vitest', 'cargo build', 'cargo test', 'go build', 'go test', 'pip install', 'dotnet build', 'dotnet test'];
const MEDIUM_RISK_COMMANDS = ['npm publish', 'docker', 'kubectl', 'terraform', 'git push', 'git reset', 'git rebase', 'mv', 'cp', 'mkdir', 'touch'];
const HIGH_RISK_COMMANDS = ['rm', 'sudo', 'chmod', 'chown', 'apt', 'yum', 'brew', 'snap', 'systemctl', 'service'];

// ─── Error Parsing Patterns ───────────────────────────────────────────────────

const ERROR_PATTERNS: Array<{ pattern: RegExp; tool: string; severity: 'error' | 'warning' }> = [
        // TypeScript errors
        { pattern: /^(.+)\((\d+),(\d+)\):\s+error\s+TS(\d+):\s+(.+)$/, tool: 'tsc', severity: 'error' },
        { pattern: /^(.+)\((\d+),(\d+)\):\s+warning\s+TS(\d+):\s+(.+)$/, tool: 'tsc', severity: 'warning' },
        // ESLint errors
        { pattern: /^\s*(.+):(\d+):(\d+):\s+error\s+(.+)\s+\[.+\]$/, tool: 'eslint', severity: 'error' },
        { pattern: /^\s*(.+):(\d+):(\d+):\s+warning\s+(.+)\s+\[.+\]$/, tool: 'eslint', severity: 'warning' },
        // Generic error patterns
        { pattern: /^Error:\s+(.+)$/, tool: 'generic', severity: 'error' },
        { pattern: /^ERROR\s+(.+)$/, tool: 'generic', severity: 'error' },
        { pattern: /^FATAL:\s+(.+)$/, tool: 'generic', severity: 'error' },
        // Python errors
        { pattern: /^(\S+Error):\s+(.+)$/, tool: 'python', severity: 'error' },
        { pattern: /^\s+File "(.+)", line (\d+).*/  , tool: 'python', severity: 'error' },
        // npm/yarn errors
        { pattern: /^npm ERR!\s+(.+)$/, tool: 'npm', severity: 'error' },
        { pattern: /^error\s+(.+)$/, tool: 'generic', severity: 'error' },
        // Build errors
        { pattern: /^(.+):(\d+):\s+error:\s+(.+)$/, tool: 'compiler', severity: 'error' },
        { pattern: /^(.+):(\d+):\s+warning:\s+(.+)$/, tool: 'compiler', severity: 'warning' },
        // Stack traces
        { pattern: /^\s+at\s+(.+)$/, tool: 'runtime', severity: 'error' },
];

// ─── Mutable Session Implementation ───────────────────────────────────────────

class ProcessSessionImpl implements IProcessSession {
        public lifecycleState: ProcessLifecycleState = ProcessLifecycleState.Created;
        public graphNodeId: string | undefined;
        public scopeId: string | undefined;
        public pid: number | undefined;
        public exitCode: number | undefined;
        public startedAt: number | undefined;
        public completedAt: number | undefined;
        public checkpoint: IProcessCheckpoint | undefined;
        public resultSummary: IProcessResultSummary | undefined;
        public heartbeat: IProcessHeartbeat | undefined;
        public readonly outputBuffer: IProcessOutputChunk[] = [];

        constructor(
                public readonly id: string,
                public readonly command: string,
                public readonly args: readonly string[],
                public readonly cwd: URI | undefined,
                public readonly env: ReadonlyMap<string, string>,
                public readonly mode: ExecutionMode,
                public readonly appliedPolicy: IPolicyEvaluationResult | undefined,
                public readonly groupId: string | undefined,
                public readonly restartPolicy: IRestartPolicy,
                public readonly agentId: string | undefined,
                public readonly createdAt: number,
                public readonly supervised: boolean,
        ) { }
}

// ─── Service Implementation ───────────────────────────────────────────────────

export class AIProcessOrchestratorService extends Disposable implements IAIProcessOrchestratorService {
        readonly _serviceBrand: undefined;

        // ─── State ────────────────────────────────────────────────────────────────

        private readonly _sessions: Map<string, ProcessSessionImpl> = new Map();
        private readonly _groups: Map<string, IProcessGroup> = new Map();
        private readonly _policies: IExecutionPolicy[] = [];
        private readonly _observations: Map<string, IProcessObservation[]> = new Map();
        private readonly _approvalRequests: Map<string, IProcessApprovalRequest> = new Map();
        private readonly _askOnceApproved: Set<string> = new Set(); // command patterns approved
        private _quota: IProcessQuota = { ...DEFAULT_QUOTA };
        private _outputLineCounter: Map<string, number> = new Map();
        private _supervisionTimers: Map<string, ReturnType<typeof setInterval>> = new Map();

        // ─── Events ───────────────────────────────────────────────────────────────

        private readonly _onDidReceiveOutput = this._register(new Emitter<IProcessOutputChunk>());
        readonly onDidReceiveOutput = this._onDidReceiveOutput.event;

        private readonly _onDidRequestProcessApproval = this._register(new Emitter<IProcessApprovalRequest>());
        readonly onDidRequestProcessApproval = this._onDidRequestProcessApproval.event;

        private readonly _onDidResolveProcessApproval = this._register(new Emitter<IProcessApprovalRequest>());
        readonly onDidResolveProcessApproval = this._onDidResolveProcessApproval.event;

        private readonly _onDidProduceProcessObservation = this._register(new Emitter<IProcessObservation>());
        readonly onDidProduceProcessObservation = this._onDidProduceProcessObservation.event;

        private readonly _onDidChangeProcessLifecycle = this._register(new Emitter<{ sessionId: string; fromState: ProcessLifecycleState; toState: ProcessLifecycleState; reason: string }>());
        readonly onDidChangeProcessLifecycle = this._onDidChangeProcessLifecycle.event;

        // ─── Constructor ──────────────────────────────────────────────────────────

        constructor(
                @IAIExecutionService private readonly aiExecutionService: IAIExecutionService,
                @IExecutionGraphService private readonly graphService: IExecutionGraphService,
                @IObservabilityService private readonly observabilityService: IObservabilityService,
                @IAgentOrchestratorService private readonly agentOrchestratorService: IAgentOrchestratorService,
                @ILogService private readonly logService: ILogService,
        ) {
                super();
                this._registerDefaultPolicies();
                this.logService.info('[AIProcessOrchestratorService] Initialized');
        }

        private _registerDefaultPolicies(): void {
                // Default safe-read policy
                this._policies.push({
                        id: 'default-safe-read',
                        name: 'Safe Read Commands',
                        description: 'Read-only commands with no side effects are automatically allowed',
                        commandPatterns: SAFE_COMMANDS.map(c => `^${c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`),
                        defaultDecision: PolicyDecision.Allow,
                        riskThreshold: CommandRiskLevel.Safe,
                        timeoutMs: 30000,
                        filesystemRestricted: false,
                        allowedDirectories: [],
                        networkRestricted: false,
                        maxMemoryMb: 0,
                        active: true,
                });

                // Default build/test policy
                this._policies.push({
                        id: 'default-build-test',
                        name: 'Build & Test Commands',
                        description: 'Standard build and test commands are allowed with timeout',
                        commandPatterns: LOW_RISK_COMMANDS.map(c => `^${c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`),
                        defaultDecision: PolicyDecision.Allow,
                        riskThreshold: CommandRiskLevel.LowRisk,
                        timeoutMs: 300000,
                        filesystemRestricted: false,
                        allowedDirectories: [],
                        networkRestricted: false,
                        maxMemoryMb: 512,
                        active: true,
                });

                // Default restricted policy
                this._policies.push({
                        id: 'default-restricted',
                        name: 'Restricted Commands',
                        description: 'Medium-risk commands require approval',
                        commandPatterns: MEDIUM_RISK_COMMANDS.map(c => `^${c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`),
                        defaultDecision: PolicyDecision.RequireApproval,
                        riskThreshold: CommandRiskLevel.MediumRisk,
                        timeoutMs: 120000,
                        filesystemRestricted: true,
                        allowedDirectories: [],
                        networkRestricted: false,
                        maxMemoryMb: 256,
                        active: true,
                });

                // Default dangerous policy
                this._policies.push({
                        id: 'default-dangerous',
                        name: 'Dangerous Commands',
                        description: 'High-risk commands are blocked by default',
                        commandPatterns: HIGH_RISK_COMMANDS.map(c => `^${c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`),
                        defaultDecision: PolicyDecision.Deny,
                        riskThreshold: CommandRiskLevel.HighRisk,
                        timeoutMs: 0,
                        filesystemRestricted: true,
                        allowedDirectories: [],
                        networkRestricted: true,
                        maxMemoryMb: 0,
                        active: true,
                });
        }

        // ─── Execution ───────────────────────────────────────────────────────────

        async executeCommand(command: IExecutionCommand): Promise<IProcessSession> {
                // 1. Check quota
                if (this.isQuotaExceeded()) {
                        throw new Error('Process quota exceeded — cannot execute new commands');
                }

                // 2. Evaluate policy
                const policyResult = this.evaluatePolicy(command.command);

                // 3. Handle policy decision
                if (policyResult.decision === PolicyDecision.Deny) {
                        throw new Error(`Command denied by policy: ${policyResult.reasons.join('; ')}`);
                }

                if (policyResult.decision === PolicyDecision.RequireApproval || policyResult.decision === PolicyDecision.Escalate) {
                        const approved = await this._requestApproval(command, policyResult);
                        if (!approved) {
                                throw new Error('Command execution denied — approval not granted');
                        }
                }

                if (policyResult.decision === PolicyDecision.Sandbox) {
                        this.logService.info(`[AIProcessOrchestratorService] Executing in sandbox mode: ${command.command}`);
                }

                // 4. Create session
                const sessionId = generateUuid();
                const session = new ProcessSessionImpl(
                        sessionId,
                        command.command,
                        command.args ?? [],
                        command.cwd,
                        command.env ?? new Map(),
                        command.mode,
                        policyResult,
                        command.groupId,
                        command.restartPolicy ?? DEFAULT_RESTART_POLICY,
                        command.agentId,
                        Date.now(),
                        command.mode === ExecutionMode.Supervised,
                );

                this._sessions.set(sessionId, session);
                this._observations.set(sessionId, []);
                this._outputLineCounter.set(sessionId, 0);

                // 5. Create graph node
                const graphNode = this.graphService.createNode({
                        type: ExecutionNodeType.TerminalExecution,
                        label: `Process: ${command.command}`,
                        mutationSource: command.agentId ? AIMutationSource.AIAgent : AIMutationSource.UserAction,
                        trusted: policyResult.decision === PolicyDecision.Allow,
                        description: `Executing: ${command.command} ${command.args?.join(' ') ?? ''}`,
                        reversible: false,
                        rollbackStrategy: 0, // Irreversible
                });
                session.graphNodeId = graphNode.id;

                // 6. Transition to starting
                this._transitionLifecycle(session, ProcessLifecycleState.Starting, 'Execution initiated');

                // 7. Execute based on mode
                try {
                        await this._executeSession(session, command);
                } catch (err) {
                        this._transitionLifecycle(session, ProcessLifecycleState.Failed, `Execution error: ${err}`);
                        this.graphService.completeNode(graphNode.id, { success: false, error: String(err) });
                }

                return this._cloneSession(session);
        }

        async cancelProcess(sessionId: string, force: boolean = false): Promise<void> {
                const session = this._sessions.get(sessionId);
                if (!session) { return; }

                // Create checkpoint before cancelling
                session.checkpoint = this._createCheckpoint(session, 'interrupt');

                // Kill process if running
                if (session.pid) {
                        this.logService.info(`[AIProcessOrchestratorService] Cancelling process ${session.pid} (force: ${force})`);
                        // In a real implementation, this would send SIGTERM/SIGKILL
                        session.pid = undefined;
                }

                session.exitCode = force ? 137 : 143; // SIGKILL / SIGTERM exit codes
                this._transitionLifecycle(session, ProcessLifecycleState.Cancelled, force ? 'Force killed' : 'Cancelled');

                if (session.graphNodeId) {
                        this.graphService.completeNode(session.graphNodeId, { success: false, error: 'Cancelled' });
                }

                // Stop supervision
                this._stopSupervision(sessionId);

                this._emitObservation(sessionId, ProcessObservationType.LifecycleChange, 'Process cancelled');
        }

        async suspendProcess(sessionId: string): Promise<void> {
                const session = this._sessions.get(sessionId);
                if (!session || session.lifecycleState !== ProcessLifecycleState.Running) {
                        throw new Error('Cannot suspend — process not running');
                }

                session.checkpoint = this._createCheckpoint(session, 'suspend');
                this._transitionLifecycle(session, ProcessLifecycleState.Suspended, 'User-initiated suspend');
                this._emitObservation(sessionId, ProcessObservationType.CheckpointCreated, 'Checkpoint created for suspend');
        }

        async resumeProcess(sessionId: string): Promise<IProcessSession> {
                const session = this._sessions.get(sessionId);
                if (!session || session.lifecycleState !== ProcessLifecycleState.Suspended) {
                        throw new Error('Cannot resume — process not suspended');
                }

                if (!session.checkpoint?.resumable) {
                        throw new Error('Process checkpoint is not resumable');
                }

                this._emitObservation(sessionId, ProcessObservationType.RecoveryInitiated, 'Resuming from checkpoint');
                this._transitionLifecycle(session, ProcessLifecycleState.Starting, 'Resuming from checkpoint');

                // Re-execute with the same command
                const command: IExecutionCommand = {
                        command: session.checkpoint.command,
                        args: session.checkpoint.args,
                        cwd: session.checkpoint.cwd,
                        mode: session.mode,
                        agentId: session.agentId,
                        groupId: session.groupId,
                };

                session.checkpoint = undefined;
                await this._executeSession(session, command);

                return this._cloneSession(session);
        }

        // ─── Session Management ──────────────────────────────────────────────────

        getSession(sessionId: string): IProcessSession | undefined {
                const session = this._sessions.get(sessionId);
                return session ? this._cloneSession(session) : undefined;
        }

        getActiveSessions(): readonly IProcessSession[] {
                return Object.freeze(
                        [...this._sessions.values()]
                                .filter(s => s.lifecycleState === ProcessLifecycleState.Running || s.lifecycleState === ProcessLifecycleState.Starting)
                                .map(s => this._cloneSession(s))
                );
        }

        getAllSessions(): readonly IProcessSession[] {
                return Object.freeze(
                        [...this._sessions.values()].map(s => this._cloneSession(s))
                );
        }

        getAgentSessions(agentId: string): readonly IProcessSession[] {
                return Object.freeze(
                        [...this._sessions.values()]
                                .filter(s => s.agentId === agentId)
                                .map(s => this._cloneSession(s))
                );
        }

        getGroupSessions(groupId: string): readonly IProcessSession[] {
                return Object.freeze(
                        [...this._sessions.values()]
                                .filter(s => s.groupId === groupId)
                                .map(s => this._cloneSession(s))
                );
        }

        // ─── Process Groups ──────────────────────────────────────────────────────

        createProcessGroup(label: string): IProcessGroup {
                const group: IProcessGroup = {
                        id: generateUuid(),
                        label,
                        sessionIds: [],
                        active: true,
                        createdAt: Date.now(),
                };
                this._groups.set(group.id, group);
                return Object.freeze({ ...group });
        }

        getProcessGroup(groupId: string): IProcessGroup | undefined {
                return this._groups.get(groupId);
        }

        async disposeProcessGroup(groupId: string): Promise<void> {
                const group = this._groups.get(groupId);
                if (!group) { return; }

                for (const sessionId of group.sessionIds) {
                        const session = this._sessions.get(sessionId);
                        if (session && (session.lifecycleState === ProcessLifecycleState.Running || session.lifecycleState === ProcessLifecycleState.Suspended)) {
                                await this.cancelProcess(sessionId);
                        }
                }

                group.active = false;
                this._groups.delete(groupId);
        }

        // ─── Output ──────────────────────────────────────────────────────────────

        getOutputBuffer(sessionId: string): readonly IProcessOutputChunk[] {
                const session = this._sessions.get(sessionId);
                return session ? Object.freeze([...session.outputBuffer]) : [];
        }

        writeToStdin(sessionId: string, data: string): void {
                const session = this._sessions.get(sessionId);
                if (!session || session.lifecycleState !== ProcessLifecycleState.Running) {
                        return;
                }
                // In a real implementation, this would write to the process's stdin
                this.logService.info(`[AIProcessOrchestratorService] Writing to stdin of ${sessionId}: ${data.substring(0, 100)}`);
                this._emitObservation(sessionId, ProcessObservationType.OutputReceived, `stdin: ${data.substring(0, 50)}`);
        }

        // ─── Policy ──────────────────────────────────────────────────────────────

        evaluatePolicy(command: string): IPolicyEvaluationResult {
                const reasons: string[] = [];
                let riskLevel = this._assessRisk(command);
                let decision: PolicyDecision = PolicyDecision.Allow;
                let appliedPolicyId: string | undefined;
                const blockedPatterns: string[] = [];
                const sandboxRestrictions: string[] = [];
                let requiredApprovalLevel: ProcessApprovalLevel | undefined;

                // Check unsafe patterns first
                const unsafeDetection = this.detectUnsafePatterns(command);
                if (unsafeDetection.detected) {
                        for (const pattern of unsafeDetection.matchedPatterns) {
                                blockedPatterns.push(pattern.name);
                                reasons.push(`Unsafe pattern detected: ${pattern.description}`);
                        }
                        riskLevel = this._higherRisk(riskLevel, unsafeDetection.riskLevel);
                }

                // Check against registered policies
                for (const policy of this._policies) {
                        if (!policy.active) { continue; }
                        for (const pattern of policy.commandPatterns) {
                                try {
                                        if (new RegExp(pattern, 'i').test(command)) {
                                                appliedPolicyId = policy.id;
                                                if (policy.defaultDecision === PolicyDecision.Deny) {
                                                        decision = PolicyDecision.Deny;
                                                        reasons.push(`Blocked by policy: ${policy.name}`);
                                                } else if (policy.defaultDecision === PolicyDecision.RequireApproval) {
                                                        decision = PolicyDecision.RequireApproval;
                                                        requiredApprovalLevel = riskLevel === CommandRiskLevel.Critical
                                                                ? ProcessApprovalLevel.ManualReview
                                                                : ProcessApprovalLevel.AskEveryTime;
                                                        reasons.push(`Requires approval per policy: ${policy.name}`);
                                                } else if (policy.defaultDecision === PolicyDecision.Sandbox) {
                                                        decision = PolicyDecision.Sandbox;
                                                        sandboxRestrictions.push('filesystem-restricted', 'network-restricted');
                                                        reasons.push(`Sandboxed per policy: ${policy.name}`);
                                                }
                                                break;
                                        }
                                } catch { /* invalid regex, skip */ }
                        }
                        if (decision !== PolicyDecision.Allow) { break; }
                }

                // Risk-based escalation
                if (riskLevel === CommandRiskLevel.Critical && decision === PolicyDecision.Allow) {
                        decision = PolicyDecision.Deny;
                        reasons.push('Critical risk level — denied by default');
                } else if (riskLevel === CommandRiskLevel.HighRisk && decision === PolicyDecision.Allow) {
                        decision = PolicyDecision.RequireApproval;
                        requiredApprovalLevel = ProcessApprovalLevel.ManualReview;
                        reasons.push('High risk level — requires manual review');
                }

                return Object.freeze({
                        decision,
                        riskLevel,
                        appliedPolicyId,
                        reasons: Object.freeze(reasons),
                        requiredApprovalLevel,
                        sandboxRestrictions: Object.freeze(sandboxRestrictions),
                        blockedPatterns: Object.freeze(blockedPatterns),
                });
        }

        registerPolicy(policy: IExecutionPolicy): IDisposable {
                this._policies.push(policy);
                return toDisposable(() => {
                        const idx = this._policies.indexOf(policy);
                        if (idx >= 0) { this._policies.splice(idx, 1); }
                });
        }

        getPolicies(): readonly IExecutionPolicy[] {
                return Object.freeze([...this._policies]);
        }

        detectUnsafePatterns(command: string): IUnsafePatternDetection {
                const matched: IUnsafePattern[] = [];
                let highestRisk: CommandRiskLevel = CommandRiskLevel.Safe;

                for (const pattern of UNSAFE_PATTERNS) {
                        try {
                                if (pattern.pattern.test(command)) {
                                        matched.push(pattern);
                                        highestRisk = this._higherRisk(highestRisk, pattern.riskLevel);
                                }
                        } catch { /* skip invalid patterns */ }
                }

                const detected = matched.length > 0;
                let suggestedAction: PolicyDecision = PolicyDecision.Allow;
                if (detected) {
                        suggestedAction = highestRisk === CommandRiskLevel.Critical
                                ? PolicyDecision.Deny
                                : highestRisk === CommandRiskLevel.HighRisk
                                        ? PolicyDecision.RequireApproval
                                        : PolicyDecision.Sandbox;
                }

                return Object.freeze({
                        detected,
                        matchedPatterns: Object.freeze(matched),
                        riskLevel: highestRisk,
                        suggestedAction,
                });
        }

        // ─── Approval ────────────────────────────────────────────────────────────

        getPendingProcessApprovals(): readonly IProcessApprovalRequest[] {
                return Object.freeze(
                        [...this._approvalRequests.values()]
                                .filter(r => r.result === ProcessApprovalResult.Pending)
                );
        }

        resolveProcessApproval(requestId: string, result: ProcessApprovalResult.Approved | ProcessApprovalResult.Denied, resolvedBy: string): void {
                const request = this._approvalRequests.get(requestId);
                if (!request) { return; }

                request.result = result;
                (request as { resolvedBy?: string }).resolvedBy = resolvedBy;
                (request as { resolvedAt?: number }).resolvedAt = Date.now();

                this._onDidResolveProcessApproval.fire(request);

                if (result === ProcessApprovalResult.Approved && request.requiredLevel === ProcessApprovalLevel.AskOnce) {
                        this._askOnceApproved.add(request.command);
                }

                this._emitObservation(request.command, ProcessObservationType.ApprovalResolved,
                        `Process approval ${result} by ${resolvedBy}`);
        }

        // ─── Observations ────────────────────────────────────────────────────────

        getRecentObservations(sessionId: string, limit: number = 50): readonly IProcessObservation[] {
                const observations = this._observations.get(sessionId) ?? [];
                return Object.freeze(observations.slice(-limit));
        }

        // ─── Terminal Intelligence ───────────────────────────────────────────────

        classifyOutput(text: string): OutputClassification {
                const trimmed = text.trim();
                if (!trimmed) { return OutputClassification.Unknown; }

                // Error patterns
                if (/\b(error|fatal|failed|failure|exception|traceback|segfault)\b/i.test(trimmed)) {
                        if (/^\s+at\s+/.test(trimmed) || /^\s+---/.test(trimmed)) {
                                return OutputClassification.StackTrace;
                        }
                        return OutputClassification.Error;
                }

                // Warning patterns
                if (/\b(warning|warn|deprecated|caution)\b/i.test(trimmed)) {
                        return OutputClassification.Warning;
                }

                // Build output
                if (/\b(compil|build|transpil|bundl|webpack|rollup|vite|esbuild)\b/i.test(trimmed)) {
                        return OutputClassification.BuildOutput;
                }

                // Test results
                if (/\b(pass|fail|test|spec|suite|describe|it\(|✓|✗|PASS|FAIL)\b/i.test(trimmed)) {
                        return OutputClassification.TestResult;
                }

                // Package manager
                if (/\b(npm|yarn|pnpm|pip|cargo|go mod|nuget|added|removed|updated)\b/i.test(trimmed)) {
                        return OutputClassification.PackageManager;
                }

                // Dev server
                if (/\b(listening|server|localhost|0\.0\.0\.0|port|started on|ready in)\b/i.test(trimmed)) {
                        return OutputClassification.DevServer;
                }

                // Progress
                if (/^\s*[=.*#-]{5,}\s*$/.test(trimmed) || /\[\s*\d+%\s*\]/.test(trimmed)) {
                        return OutputClassification.Progress;
                }

                // Success
                if (/\b(success|succeeded|done|complete|finished|built in|ready)\b/i.test(trimmed)) {
                        return OutputClassification.Success;
                }

                return OutputClassification.Info;
        }

        parseErrors(output: string): readonly IParsedError[] {
                const errors: IParsedError[] = [];
                const lines = output.split('\n');

                for (const line of lines) {
                        for (const { pattern, tool, severity } of ERROR_PATTERNS) {
                                const match = line.match(pattern);
                                if (match) {
                                        errors.push(Object.freeze({
                                                filePath: match[1] ?? undefined,
                                                line: match[2] ? parseInt(match[2], 10) : undefined,
                                                column: match[3] ? parseInt(match[3], 10) : undefined,
                                                errorCode: match[4] ?? undefined,
                                                message: match[5] ?? match[1] ?? line,
                                                severity,
                                                tool,
                                        }));
                                        break;
                                }
                        }
                }

                return Object.freeze(errors);
        }

        generateResultSummary(sessionId: string): IProcessResultSummary {
                const session = this._sessions.get(sessionId);
                if (!session) {
                        return Object.freeze({
                                success: false,
                                exitCode: undefined,
                                durationMs: 0,
                                errorCount: 0,
                                warningCount: 0,
                                parsedErrors: [],
                                summary: 'Session not found',
                        });
                }

                const allOutput = session.outputBuffer.map(c => c.text).join('\n');
                const parsedErrors = this.parseErrors(allOutput);
                const errorCount = parsedErrors.filter(e => e.severity === 'error').length;
                const warningCount = parsedErrors.filter(e => e.severity === 'warning').length;
                const durationMs = session.startedAt && session.completedAt
                        ? session.completedAt - session.startedAt
                        : session.startedAt ? Date.now() - session.startedAt : 0;

                const success = session.exitCode === 0;
                let summary: string;
                if (success) {
                        summary = `Command completed successfully in ${durationMs}ms`;
                } else {
                        summary = `Command failed with exit code ${session.exitCode ?? 'unknown'} after ${durationMs}ms (${errorCount} errors, ${warningCount} warnings)`;
                }

                return Object.freeze({
                        success,
                        exitCode: session.exitCode,
                        durationMs,
                        errorCount,
                        warningCount,
                        parsedErrors,
                        summary,
                });
        }

        // ─── Resource Quotas ─────────────────────────────────────────────────────

        get resourceUsage(): IProcessResourceUsage {
                const sessions = [...this._sessions.values()];
                return Object.freeze({
                        concurrentCount: sessions.filter(s => s.lifecycleState === ProcessLifecycleState.Running).length,
                        totalMemoryMb: 0, // Would require OS-level monitoring in production
                        totalCreated: sessions.length,
                        activeCount: sessions.filter(s =>
                                s.lifecycleState === ProcessLifecycleState.Running ||
                                s.lifecycleState === ProcessLifecycleState.Starting
                        ).length,
                        supervisedCount: sessions.filter(s => s.supervised && s.lifecycleState === ProcessLifecycleState.Running).length,
                });
        }

        setQuota(quota: IProcessQuota): void {
                this._quota = { ...quota };
        }

        get quota(): IProcessQuota {
                return { ...this._quota };
        }

        isQuotaExceeded(): boolean {
                const usage = this.resourceUsage;
                return usage.concurrentCount >= this._quota.maxConcurrent;
        }

        // ─── Safety ──────────────────────────────────────────────────────────────

        runSafetyChecks(): ISafetyCheckResult {
                const sessions = [...this._sessions.values()];
                const orphaned: string[] = [];
                const zombies: number[] = [];
                const runaway: string[] = [];
                const overMemory: string[] = [];
                const recursiveSpawns: string[] = [];

                for (const session of sessions) {
                        // Orphan: running session with no supervision timer for supervised processes
                        if (session.lifecycleState === ProcessLifecycleState.Running && session.supervised && !this._supervisionTimers.has(session.id)) {
                                orphaned.push(session.id);
                        }

                        // Runaway: process running for more than 30 minutes
                        if (session.lifecycleState === ProcessLifecycleState.Running && session.startedAt && (Date.now() - session.startedAt > 30 * 60 * 1000)) {
                                runaway.push(session.id);
                        }

                        // Zombie: PID exists but process should be completed
                        if (session.pid && (session.lifecycleState === ProcessLifecycleState.Completed || session.lifecycleState === ProcessLifecycleState.Failed || session.lifecycleState === ProcessLifecycleState.Cancelled)) {
                                zombies.push(session.pid);
                        }
                }

                const hasIssues = orphaned.length > 0 || zombies.length > 0 || runaway.length > 0 || overMemory.length > 0 || recursiveSpawns.length > 0;
                const issueCount = orphaned.length + zombies.length + runaway.length + overMemory.length + recursiveSpawns.length;

                return Object.freeze({
                        orphanedSessions: Object.freeze(orphaned),
                        zombiePids: Object.freeze(zombies),
                        runawaySessions: Object.freeze(runaway),
                        overMemorySessions: Object.freeze(overMemory),
                        recursiveSpawns: Object.freeze(recursiveSpawns),
                        hasIssues,
                        issueCount,
                });
        }

        async cleanupOrphans(): Promise<number> {
                const safety = this.runSafetyChecks();
                let cleaned = 0;

                for (const sessionId of safety.orphanedSessions) {
                        await this.cancelProcess(sessionId);
                        cleaned++;
                }

                for (const sessionId of safety.runawaySessions) {
                        await this.cancelProcess(sessionId, true);
                        cleaned++;
                }

                // Clear zombie PIDs
                for (const pid of safety.zombiePids) {
                        for (const [, session] of this._sessions) {
                                if (session.pid === pid) {
                                        session.pid = undefined;
                                        cleaned++;
                                }
                        }
                }

                if (cleaned > 0) {
                        this.logService.info(`[AIProcessOrchestratorService] Cleaned up ${cleaned} orphaned/zombie processes`);
                }

                return cleaned;
        }

        get sessionCount(): number { return this._sessions.size; }
        get activeSessionCount(): number { return this.getActiveSessions().length; }

        // ─── Private: Execution Engine ───────────────────────────────────────────

        private async _executeSession(session: ProcessSessionImpl, command: IExecutionCommand): Promise<void> {
                // Transition to running
                this._transitionLifecycle(session, ProcessLifecycleState.Running, 'Process started');
                session.startedAt = Date.now();

                // Set up heartbeat for supervised processes
                if (session.supervised) {
                        session.heartbeat = {
                                lastBeatAt: Date.now(),
                                intervalMs: 30000,
                                missedBeats: 0,
                                maxMissedBeats: 3,
                                alive: true,
                        };
                        this._startSupervision(session.id);
                }

                // In a real implementation, this would spawn the actual process
                // For now, we simulate execution lifecycle

                // Simulate process execution completion
                // In production, this would be driven by actual process events
                this._emitObservation(session.id, ProcessObservationType.LifecycleChange,
                        `Process executing: ${command.command}`);

                // Record simulated output
                const outputChunk: IProcessOutputChunk = {
                        sessionId: session.id,
                        channel: StreamChannel.Stdout,
                        text: `$ ${command.command} ${command.args?.join(' ') ?? ''}`,
                        timestamp: Date.now(),
                        lineNumber: 0,
                        classification: OutputClassification.Info,
                };
                session.outputBuffer.push(outputChunk);
                this._onDidReceiveOutput.fire(outputChunk);
        }

        private _startSupervision(sessionId: string): void {
                if (this._supervisionTimers.has(sessionId)) { return; }

                const timer = setInterval(() => {
                        const session = this._sessions.get(sessionId);
                        if (!session || session.lifecycleState !== ProcessLifecycleState.Running) {
                                this._stopSupervision(sessionId);
                                return;
                        }

                        if (session.heartbeat) {
                                const now = Date.now();
                                const elapsed = now - session.heartbeat.lastBeatAt;

                                if (elapsed > session.heartbeat.intervalMs * (session.heartbeat.missedBeats + 1)) {
                                        session.heartbeat.missedBeats++;
                                        this._emitObservation(sessionId, ProcessObservationType.HeartbeatMissed,
                                                `Missed heartbeat #${session.heartbeat.missedBeats}`);

                                        if (session.heartbeat.missedBeats >= session.heartbeat.maxMissedBeats) {
                                                session.heartbeat.alive = false;
                                                this._handleUnresponsiveProcess(sessionId);
                                        }
                                }
                        }
                }, 10000); // Check every 10 seconds

                this._supervisionTimers.set(sessionId, timer);
        }

        private _stopSupervision(sessionId: string): void {
                const timer = this._supervisionTimers.get(sessionId);
                if (timer) {
                        clearInterval(timer);
                        this._supervisionTimers.delete(sessionId);
                }
        }

        private _handleUnresponsiveProcess(sessionId: string): void {
                const session = this._sessions.get(sessionId);
                if (!session) { return; }

                this.logService.warn(`[AIProcessOrchestratorService] Process ${sessionId} unresponsive`);

                // Check restart policy
                if (session.restartPolicy.restartOnFailure && session.restartPolicy.restartOn.includes(ProcessRestartCondition.Unresponsive)) {
                        this._restartProcess(sessionId);
                } else {
                        this._transitionLifecycle(session, ProcessLifecycleState.Crashed, 'Process unresponsive');
                        this._emitObservation(sessionId, ProcessObservationType.Crashed, 'Process became unresponsive and crashed');
                }
        }

        private async _restartProcess(sessionId: string): Promise<void> {
                const session = this._sessions.get(sessionId);
                if (!session) { return; }

                const restartCount = session.checkpoint?.restartsConsumed ?? 0;
                if (restartCount >= session.restartPolicy.maxRestarts) {
                        this._transitionLifecycle(session, ProcessLifecycleState.Failed, 'Max restarts exceeded');
                        return;
                }

                this._transitionLifecycle(session, ProcessLifecycleState.Restarting, `Restart attempt ${restartCount + 1}`);
                this._emitObservation(sessionId, ProcessObservationType.Restarted, 'Process restarting');

                // Create checkpoint before restart
                session.checkpoint = this._createCheckpoint(session, 'crash');

                // Wait before restart (with backoff)
                const delay = session.restartPolicy.exponentialBackoff
                        ? session.restartPolicy.restartDelayMs * Math.pow(2, restartCount)
                        : session.restartPolicy.restartDelayMs;

                await new Promise(resolve => setTimeout(resolve, Math.min(delay, 30000)));

                // Reset state and re-execute
                session.pid = undefined;
                session.exitCode = undefined;
                this._transitionLifecycle(session, ProcessLifecycleState.Starting, 'Restarting');

                const command: IExecutionCommand = {
                        command: session.command,
                        args: session.args,
                        cwd: session.cwd,
                        mode: session.mode,
                        agentId: session.agentId,
                        groupId: session.groupId,
                };

                await this._executeSession(session, command);
        }

        // ─── Private: Policy Assessment ──────────────────────────────────────────

        private _assessRisk(command: string): CommandRiskLevel {
                const cmdBase = command.trim().split(/\s+/)[0]?.toLowerCase() ?? '';

                if (SAFE_COMMANDS.some(s => cmdBase === s || command.trimStart().startsWith(s + ' '))) {
                        return CommandRiskLevel.Safe;
                }
                if (LOW_RISK_COMMANDS.some(s => command.trimStart().startsWith(s))) {
                        return CommandRiskLevel.LowRisk;
                }
                if (MEDIUM_RISK_COMMANDS.some(s => command.trimStart().startsWith(s))) {
                        return CommandRiskLevel.MediumRisk;
                }
                if (HIGH_RISK_COMMANDS.some(s => cmdBase === s || command.trimStart().startsWith(s + ' '))) {
                        return CommandRiskLevel.HighRisk;
                }

                // Unknown commands default to medium risk
                return CommandRiskLevel.MediumRisk;
        }

        private _higherRisk(a: CommandRiskLevel, b: CommandRiskLevel): CommandRiskLevel {
                const order = [CommandRiskLevel.Safe, CommandRiskLevel.LowRisk, CommandRiskLevel.MediumRisk, CommandRiskLevel.HighRisk, CommandRiskLevel.Critical];
                return order.indexOf(a) > order.indexOf(b) ? a : b;
        }

        // ─── Private: Approval ───────────────────────────────────────────────────

        private async _requestApproval(command: IExecutionCommand, policyResult: IPolicyEvaluationResult): Promise<boolean> {
                const approvalLevel = policyResult.requiredApprovalLevel ?? ProcessApprovalLevel.AskEveryTime;

                // Check ask-once cache
                if (approvalLevel === ProcessApprovalLevel.AskOnce && this._askOnceApproved.has(command.command)) {
                        return true;
                }

                const requestId = generateUuid();
                const request: IProcessApprovalRequest = {
                        id: requestId,
                        command: command.command,
                        riskLevel: policyResult.riskLevel,
                        requiredLevel: approvalLevel,
                        policyResult,
                        description: `Execute: ${command.command} ${command.args?.join(' ') ?? ''}`,
                        agentId: command.agentId,
                        requestedAt: Date.now(),
                        result: ProcessApprovalResult.Pending,
                };

                this._approvalRequests.set(requestId, request);
                this._onDidRequestProcessApproval.fire(request);

                // Wait for approval with timeout
                return new Promise<boolean>((resolve) => {
                        const timeout = setTimeout(() => {
                                request.result = ProcessApprovalResult.Expired;
                                resolve(false);
                        }, 60000);

                        const handler = this._onDidResolveProcessApproval.event((resolved) => {
                                if (resolved.id === requestId) {
                                        clearTimeout(timeout);
                                        handler.dispose();
                                        resolve(resolved.result === ProcessApprovalResult.Approved);
                                }
                        });
                });
        }

        // ─── Private: Checkpoint ─────────────────────────────────────────────────

        private _createCheckpoint(session: ProcessSessionImpl, reason: IProcessCheckpoint['reason']): IProcessCheckpoint {
                return Object.freeze({
                        takenAt: Date.now(),
                        stateAtCheckpoint: session.lifecycleState,
                        command: session.command,
                        args: Object.freeze([...session.args]),
                        cwd: session.cwd,
                        outputLineCount: session.outputBuffer.length,
                        restartsConsumed: session.checkpoint?.restartsConsumed ?? 0,
                        resumable: session.mode !== ExecutionMode.Ephemeral,
                        reason,
                });
        }

        // ─── Private: State Management ───────────────────────────────────────────

        private _transitionLifecycle(session: ProcessSessionImpl, newState: ProcessLifecycleState, reason: string): void {
                const oldState = session.lifecycleState;
                session.lifecycleState = newState;

                if (newState === ProcessLifecycleState.Completed || newState === ProcessLifecycleState.Failed || newState === ProcessLifecycleState.Cancelled) {
                        session.completedAt = Date.now();
                        this._stopSupervision(session.id);
                }

                this._onDidChangeProcessLifecycle.fire({
                        sessionId: session.id,
                        fromState: oldState,
                        toState: newState,
                        reason,
                });

                this._emitObservation(session.id, ProcessObservationType.LifecycleChange,
                        `${oldState} → ${newState}: ${reason}`);
        }

        private _emitObservation(sessionId: string, type: ProcessObservationType, description: string, data?: Record<string, unknown>): void {
                const observation: IProcessObservation = Object.freeze({
                        id: generateUuid(),
                        sessionId,
                        type,
                        timestamp: Date.now(),
                        description,
                        data: data ?? {},
                });

                const sessionObs = this._observations.get(sessionId);
                if (sessionObs) {
                        sessionObs.push(observation);
                        if (sessionObs.length > 500) {
                                sessionObs.splice(0, sessionObs.length - 250);
                        }
                }

                this._onDidProduceProcessObservation.fire(observation);
        }

        private _cloneSession(session: ProcessSessionImpl): IProcessSession {
                return Object.freeze({
                        id: session.id,
                        command: session.command,
                        args: session.args,
                        cwd: session.cwd,
                        env: session.env,
                        mode: session.mode,
                        lifecycleState: session.lifecycleState,
                        appliedPolicy: session.appliedPolicy,
                        groupId: session.groupId,
                        graphNodeId: session.graphNodeId,
                        scopeId: session.scopeId,
                        restartPolicy: session.restartPolicy,
                        pid: session.pid,
                        exitCode: session.exitCode,
                        agentId: session.agentId,
                        createdAt: session.createdAt,
                        startedAt: session.startedAt,
                        completedAt: session.completedAt,
                        outputBuffer: Object.freeze([...session.outputBuffer]),
                        checkpoint: session.checkpoint,
                        resultSummary: session.resultSummary,
                        supervised: session.supervised,
                        heartbeat: session.heartbeat ? { ...session.heartbeat } : undefined,
                });
        }

        override dispose(): void {
                // Cancel all running processes
                for (const [sessionId, session] of this._sessions) {
                        if (session.lifecycleState === ProcessLifecycleState.Running) {
                                this.cancelProcess(sessionId, true);
                        }
                }

                // Clear supervision timers
                for (const [, timer] of this._supervisionTimers) {
                        clearInterval(timer);
                }
                this._supervisionTimers.clear();

                super.dispose();
                this.logService.info('[AIProcessOrchestratorService] Disposed');
        }
}
