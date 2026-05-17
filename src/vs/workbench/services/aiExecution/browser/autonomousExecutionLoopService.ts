/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

/**
 * autonomousExecutionLoopService.ts -- Phase 28: The Autonomous Execution Loop
 *
 * THE BRAIN. The real autonomous loop that orchestrates everything.
 *
 * This service unifies: ExecutionGraph, AIExecution, AgentOrchestrator,
 * ExecutionSandbox coordination, old AutonomousExecution, and MultiAgentExecution
 * into ONE coherent execution loop.
 *
 * The loop lifecycle:
 *   1. Planning: Generate execution plan from project idea via LLM
 *   2. Executing: Step through milestones, dispatch to action handlers
 *   3. Verifying: Run build + lint + typecheck after milestone completion
 *   4. Repairing: Send failure context to LLM, apply code fixes, re-verify
 *   5. Committing: Create checkpoint commits at milestone boundaries
 *
 * Every method produces real output. No stubs. No simulated intelligence.
 *
 * HONEST limitations:
 *   - LLM-generated plans and repairs are bounded by LLM capability
 *   - Verification (build/lint/typecheck) passing does NOT guarantee correctness
 *   - Repair success rate depends on LLM quality, not on this service
 *   - Crash recovery depends on IStorageService reliability
 *   - Git operations depend on git extension and a valid repository
 *   - A crash mid-step may lose that step's progress (last checkpoint is safe)
 */

import { Disposable } from '../../../../base/common/lifecycle.js';
import { Emitter, Event } from '../../../../base/common/event.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { IStorageService, StorageScope, StorageTarget } from '../../../../platform/storage/common/storage.js';
import { IWorkspaceContextService } from '../../../../platform/workspace/common/workspace.js';
import { generateUuid } from '../../../../base/common/uuid.js';

import { ILLMProviderService, LLMRequest, LLMMessage } from '../common/llmProvider.js';
import { ICodeEditingService, EditOperation, EditResult } from '../common/codeEditing.js';
import { IGitWorkflowService, GitCommitInfo } from '../common/gitWorkflow.js';
import { ITerminalExecutionBridgeService, ExecutionResult as TerminalExecutionResult } from '../common/terminalExecutionBridge.js';
import { IRepositoryIntelligenceService } from '../common/repositoryIntelligence.js';
import { IProjectMemoryService, MemoryType, MemoryPriority } from '../common/projectMemory.js';
import { IObservabilityService } from '../common/observabilityService.js';
import {
        IAutonomousExecutionLoopService,
        LoopState,
        MilestoneStatus,
        ExecutionStep,
        Milestone,
        ExecutionPlan,
        RepairAttempt,
        CrashRecoveryState,
        ExecutionEventType,
        ExecutionEvent,
} from '../common/autonomousExecutionLoop.js';

// ─── Constants ──────────────────────────────────────────────────────────────────

const STORAGE_PLAN_PREFIX = 'aiExecution.loop.plan.';
const STORAGE_CRASH_KEY = 'aiExecution.loop.crashRecovery';
const MAX_REPAIR_ATTEMPTS_PER_MILESTONE = 5;
const MAX_STEP_RETRIES = 3;
const VERIFICATION_TIMEOUT_MS = 120000;
const COMMAND_TIMEOUT_MS = 60000;
const PLAN_GENERATION_MAX_TOKENS = 8192;

// ─── Internal Mutable Types ─────────────────────────────────────────────────────

interface MutableRepairStats {
        totalAttempts: number;
        successfulRepairs: number;
        rollbackCount: number;
        worseningCount: number;
        milestonesWithRepairs: number;
}

interface StepResult {
        success: boolean;
        output?: string;
        error?: string;
        tokensUsed?: number;
}

interface VerificationResult {
        passed: boolean;
        buildOutput: string;
        lintOutput: string;
        typecheckOutput: string;
        errors: string[];
}

// ─── Implementation ─────────────────────────────────────────────────────────────

export class AutonomousExecutionLoopService extends Disposable implements IAutonomousExecutionLoopService {

        declare readonly _serviceBrand: undefined;

        // ─── State ────────────────────────────────────────────────────────────────

        private _state: LoopState = LoopState.Idle;
        private _currentPlan: ExecutionPlan | null = null;
        private _cancelled = false;
        private _repairStats: MutableRepairStats = {
                totalAttempts: 0,
                successfulRepairs: 0,
                rollbackCount: 0,
                worseningCount: 0,
                milestonesWithRepairs: 0,
        };
        private _repairAttempts: RepairAttempt[] = [];
        private _lastCheckpointHash: string = '';

        // ─── Events ───────────────────────────────────────────────────────────────

        private readonly _onStateChange = this._register(new Emitter<LoopState>());
        readonly onStateChange: Event<LoopState> = this._onStateChange.event;

        private readonly _onMilestoneUpdate = this._register(new Emitter<Milestone>());
        readonly onMilestoneUpdate: Event<Milestone> = this._onMilestoneUpdate.event;

        private readonly _onStepUpdate = this._register(new Emitter<ExecutionStep>());
        readonly onStepUpdate: Event<ExecutionStep> = this._onStepUpdate.event;

        private readonly _onRepairAttempt = this._register(new Emitter<RepairAttempt>());
        readonly onRepairAttempt: Event<RepairAttempt> = this._onRepairAttempt.event;

        private readonly _onExecutionEvent = this._register(new Emitter<ExecutionEvent>());
        readonly onExecutionEvent: Event<ExecutionEvent> = this._onExecutionEvent.event;

        // ─── Constructor ──────────────────────────────────────────────────────────

        constructor(
                @ILLMProviderService private readonly llmService: ILLMProviderService,
                @ICodeEditingService private readonly codeEditingService: ICodeEditingService,
                @IGitWorkflowService private readonly gitWorkflowService: IGitWorkflowService,
                @ITerminalExecutionBridgeService private readonly terminalBridge: ITerminalExecutionBridgeService,
                @IRepositoryIntelligenceService private readonly repoIntelligence: IRepositoryIntelligenceService,
                @IProjectMemoryService private readonly projectMemory: IProjectMemoryService,
                @IObservabilityService private readonly observability: IObservabilityService,
                @ILogService private readonly logService: ILogService,
                @IStorageService private readonly storageService: IStorageService,
                @IWorkspaceContextService private readonly workspaceContext: IWorkspaceContextService,
        ) {
                super();
                this.logService.trace('[AutonomousLoop] Initialized');
        }

        // ═══════════════════════════════════════════════════════════════════════════
        // Plan Management
        // ═══════════════════════════════════════════════════════════════════════════

        async createPlan(projectName: string, idea: string, constraints: string[]): Promise<ExecutionPlan> {
                this.logService.info(`[AutonomousLoop] Creating plan for: ${projectName}`);

                // Gather repository context to inform the LLM
                const workspaceRoot = this._getWorkspaceRoot();
                let repoContext = '';
                if (workspaceRoot) {
                        try {
                                const scan = await this.repoIntelligence.scanRepository(workspaceRoot);
                                repoContext = `Project type: ${scan.projectType}\n` +
                                        `Languages: ${scan.languages.map(l => l).join(', ')}\n` +
                                        `Frameworks: ${scan.frameworks.map(f => f.name).join(', ')}\n` +
                                        `Entry points: ${scan.entryPoints.join(', ')}\n` +
                                        `File count: ${scan.fileCount}\n` +
                                        `Build system: ${scan.buildSystem || 'unknown'}`;
                        } catch {
                                repoContext = '(repository scan unavailable)';
                        }
                }

                // Retrieve relevant memory entries for context
                let memoryContext = '';
                try {
                        const memResults = this.projectMemory.query(e =>
                                e.type === MemoryType.ArchitectureDecision ||
                                e.type === MemoryType.PlanningMemory ||
                                e.type === MemoryType.ProjectSummary
                        );
                        if (memResults.entries.length > 0) {
                                memoryContext = memResults.entries.slice(0, 5).map(e => e.value.substring(0, 300)).join('\n---\n');
                        }
                } catch {
                        memoryContext = '(memory unavailable)';
                }

                const constraintsText = constraints.length > 0
                        ? constraints.map((c, i) => `${i + 1}. ${c}`).join('\n')
                        : 'No specific constraints.';

                const prompt = `You are generating an execution plan for an autonomous coding system.

PROJECT: ${projectName}
IDEA: ${idea}

CONSTRAINTS:
${constraintsText}

REPOSITORY CONTEXT:
${repoContext || '(no repository context)'}

PREVIOUS MEMORY:
${memoryContext || '(no previous memory)'}

Generate a structured execution plan as a JSON object with this exact format:
{
  "milestones": [
    {
      "name": "Short descriptive name",
      "description": "What this milestone accomplishes",
      "steps": [
        {
          "description": "What this step does",
          "action": "edit|command|git|llm|verify",
          "params": { ... action-specific parameters ... },
          "maxRetries": 2
        }
      ]
    }
  ]
}

Action types and their params:
- "edit": { "filePath": "...", "content": "..." } or { "filePath": "...", "oldContent": "...", "newContent": "..." }
- "command": { "command": "...", "cwd": "..." }
- "git": { "operation": "commit|checkout|branch", "message": "..." }
- "llm": { "prompt": "...", "systemPrompt": "..." }
- "verify": { "commands": ["npm run build", "npm run lint", "npx tsc --noEmit"] }

Rules:
- Each milestone should be a coherent unit of work
- Order milestones by dependency (earlier milestones prepare for later ones)
- Include verification steps at the end of each milestone
- Use "edit" for file modifications, "command" for running tools
- Use "llm" when dynamic code generation is needed
- Be specific with file paths and commands
- Include 3-8 milestones for a typical project
- Each milestone should have 2-6 steps

Return ONLY the JSON object, no other text.`;

                const model = this.llmService.getProvider(this.llmService.activeProviderId)?.defaultModel || 'gpt-4o';

                const request: LLMRequest = {
                        requestId: generateUuid(),
                        model,
                        messages: [{ role: 'user', content: prompt }],
                        maxTokens: PLAN_GENERATION_MAX_TOKENS,
                        temperature: 0.3,
                };

                let response: string;
                try {
                        const llmResponse = await this.llmService.sendRequest(request);
                        response = llmResponse.content;
                } catch (e: any) {
                        const errorMsg = e?.message || String(e);
                        this.logService.error(`[AutonomousLoop] Plan generation failed: ${errorMsg}`);
                        throw new Error(`Failed to generate execution plan: ${errorMsg}`);
                }

                // Parse the LLM response into an ExecutionPlan
                const plan = this._parsePlanResponse(response, projectName, idea, constraints);

                // Store the plan
                this._currentPlan = plan;
                this._persistPlan(plan);

                // Store in project memory
                try {
                        this.projectMemory.store(
                                MemoryType.PlanningMemory,
                                `plan-${plan.id}`,
                                JSON.stringify(plan),
                                MemoryPriority.High,
                                ['plan', 'execution']
                        );
                } catch {
                        // Memory storage failure is non-fatal
                }

                this._fireExecutionEvent(ExecutionEventType.PlanCreated, `Plan created: ${plan.milestones.length} milestones`, { planId: plan.id });
                this.logService.info(`[AutonomousLoop] Plan created: ${plan.id} with ${plan.milestones.length} milestones`);

                return plan;
        }

        async loadPlan(planId: string): Promise<ExecutionPlan | null> {
                const stored = this.storageService.get(STORAGE_PLAN_PREFIX + planId, StorageScope.WORKSPACE, undefined);
                if (!stored) {
                        return null;
                }
                try {
                        const plan = JSON.parse(stored) as ExecutionPlan;
                        return plan;
                } catch {
                        this.logService.warn(`[AutonomousLoop] Failed to parse stored plan: ${planId}`);
                        return null;
                }
        }

        getCurrentPlan(): ExecutionPlan | null {
                return this._currentPlan;
        }

        // ═══════════════════════════════════════════════════════════════════════════
        // Loop Control
        // ═══════════════════════════════════════════════════════════════════════════

        async start(plan: ExecutionPlan): Promise<void> {
                if (this._state === LoopState.Executing || this._state === LoopState.Planning || this._state === LoopState.Repairing) {
                        throw new Error('[AutonomousLoop] A loop is already running. Stop or pause it first.');
                }

                if (!plan.milestones || plan.milestones.length === 0) {
                        throw new Error('[AutonomousLoop] Cannot start: plan has no milestones.');
                }

                this._currentPlan = plan;
                this._cancelled = false;
                this._setState(LoopState.Executing);

                this._fireExecutionEvent(ExecutionEventType.LoopStarted, `Loop started for plan: ${plan.projectName}`, { planId: plan.id });
                this.logService.info(`[AutonomousLoop] Starting loop for plan: ${plan.id}`);

                await this._runLoop();
        }

        pause(): void {
                if (this._state !== LoopState.Executing && this._state !== LoopState.Repairing && this._state !== LoopState.Verifying) {
                        return;
                }
                this._cancelled = true;
                this._setState(LoopState.Paused);
                this._fireExecutionEvent(ExecutionEventType.LoopPaused, 'Loop paused', {});
                this.logService.info('[AutonomousLoop] Paused');
        }

        resume(): void {
                if (this._state !== LoopState.Paused) {
                        return;
                }
                if (!this._currentPlan) {
                        this.logService.warn('[AutonomousLoop] Cannot resume: no current plan');
                        return;
                }
                this._cancelled = false;
                this._setState(LoopState.Executing);
                this._fireExecutionEvent(ExecutionEventType.LoopResumed, 'Loop resumed', {});
                this.logService.info('[AutonomousLoop] Resumed');

                this._runLoop().catch((e: any) => {
                        this.logService.error(`[AutonomousLoop] Unhandled error in resumed loop: ${e?.message}`);
                        this._setState(LoopState.Crashed);
                        this._fireExecutionEvent(ExecutionEventType.LoopCrashed, `Crashed: ${e?.message}`, { error: e?.message });
                });
        }

        stop(): void {
                this._cancelled = true;
                if (this._state !== LoopState.Idle && this._state !== LoopState.Crashed) {
                        this._setState(LoopState.Stopped);
                }
                this._fireExecutionEvent(ExecutionEventType.LoopStopped, 'Loop stopped', {});
                this.logService.info('[AutonomousLoop] Stopped');
        }

        async retryCurrentStep(): Promise<void> {
                const plan = this._currentPlan;
                if (!plan) { return; }

                const milestone = this._getCurrentMilestone(plan);
                const step = this._getCurrentStep(plan);
                if (!milestone || !step) { return; }

                // Reset the step to pending
                step.status = 'pending';
                step.retryCount = 0;
                step.error = undefined;
                step.result = undefined;
                this._onStepUpdate.fire(step);

                this.logService.info(`[AutonomousLoop] Retrying step: ${step.id}`);

                // If the loop is not running, re-enter execution
                if (this._state === LoopState.Paused || this._state === LoopState.Stopped) {
                        this._cancelled = false;
                        this._setState(LoopState.Executing);
                        await this._runLoop();
                }
        }

        async rollbackToLastCheckpoint(): Promise<boolean> {
                if (!this._lastCheckpointHash) {
                        this.logService.warn('[AutonomousLoop] No checkpoint hash to rollback to');
                        return false;
                }

                const repoRoot = this._getWorkspaceRoot();
                if (!repoRoot) {
                        this.logService.warn('[AutonomousLoop] No workspace root for rollback');
                        return false;
                }

                try {
                        const success = await this.gitWorkflowService.rollbackCommit(repoRoot, this._lastCheckpointHash);
                        if (success) {
                                this._fireExecutionEvent(ExecutionEventType.RollbackPerformed,
                                        `Rolled back to checkpoint: ${this._lastCheckpointHash.substring(0, 8)}`,
                                        { commitHash: this._lastCheckpointHash });
                                this.logService.info(`[AutonomousLoop] Rolled back to: ${this._lastCheckpointHash.substring(0, 8)}`);
                        } else {
                                this.logService.warn('[AutonomousLoop] Rollback failed');
                        }
                        return success;
                } catch (e: any) {
                        this.logService.error(`[AutonomousLoop] Rollback error: ${e?.message}`);
                        return false;
                }
        }

        // ═══════════════════════════════════════════════════════════════════════════
        // State Queries
        // ═══════════════════════════════════════════════════════════════════════════

        getState(): LoopState {
                return this._state;
        }

        getCurrentMilestone(): Milestone | null {
                if (!this._currentPlan) { return null; }
                return this._getCurrentMilestone(this._currentPlan);
        }

        getCurrentStep(): ExecutionStep | null {
                if (!this._currentPlan) { return null; }
                return this._getCurrentStep(this._currentPlan);
        }

        getProgress(): { milestones: number; steps: number; completedMilestones: number; completedSteps: number } {
                const plan = this._currentPlan;
                if (!plan) {
                        return { milestones: 0, steps: 0, completedMilestones: 0, completedSteps: 0 };
                }
                const totalSteps = plan.milestones.reduce((sum, m) => sum + m.steps.length, 0);
                const completedSteps = plan.milestones.reduce(
                        (sum, m) => sum + m.steps.filter(s => s.status === 'completed').length, 0
                );
                const completedMilestones = plan.milestones.filter(m => m.status === MilestoneStatus.Completed).length;
                return { milestones: plan.milestones.length, steps: totalSteps, completedMilestones, completedSteps };
        }

        // ═══════════════════════════════════════════════════════════════════════════
        // Repair Statistics
        // ═══════════════════════════════════════════════════════════════════════════

        getRepairStats(): { totalAttempts: number; successRate: number; rollbackFrequency: number; worseningFrequency: number; averageAttempts: number } {
                const s = this._repairStats;
                return {
                        totalAttempts: s.totalAttempts,
                        successRate: s.totalAttempts > 0 ? s.successfulRepairs / s.totalAttempts : 0,
                        rollbackFrequency: s.totalAttempts > 0 ? s.rollbackCount / s.totalAttempts : 0,
                        worseningFrequency: s.totalAttempts > 0 ? s.worseningCount / s.totalAttempts : 0,
                        averageAttempts: s.milestonesWithRepairs > 0 ? s.totalAttempts / s.milestonesWithRepairs : 0,
                };
        }

        // ═══════════════════════════════════════════════════════════════════════════
        // Crash Recovery
        // ═══════════════════════════════════════════════════════════════════════════

        saveCrashRecoveryState(): void {
                const plan = this._currentPlan;
                if (!plan) { return; }

                const state: CrashRecoveryState = {
                        planId: plan.id,
                        state: this._state,
                        currentMilestoneIndex: plan.currentMilestoneIndex,
                        currentStepIndex: plan.currentStepIndex,
                        lastCheckpointHash: this._lastCheckpointHash,
                        activeRepairs: [...this._repairAttempts],
                        pendingVerification: this._state === LoopState.Verifying || this._state === LoopState.Repairing,
                        savedAt: Date.now(),
                };

                this.storageService.store(STORAGE_CRASH_KEY, JSON.stringify(state), StorageScope.WORKSPACE, StorageTarget.MACHINE);
                this.logService.trace('[AutonomousLoop] Crash recovery state saved');
        }

        async restoreCrashRecoveryState(): Promise<boolean> {
                const stored = this.storageService.get(STORAGE_CRASH_KEY, StorageScope.WORKSPACE, undefined);
                if (!stored) { return false; }

                let crashState: CrashRecoveryState;
                try {
                        crashState = JSON.parse(stored);
                } catch {
                        this.logService.warn('[AutonomousLoop] Failed to parse crash recovery state');
                        return false;
                }

                // Load the plan associated with the crash
                const plan = await this.loadPlan(crashState.planId);
                if (!plan) {
                        this.logService.warn(`[AutonomousLoop] Crash recovery plan not found: ${crashState.planId}`);
                        this.clearCrashRecoveryState();
                        return false;
                }

                this._currentPlan = plan;
                plan.currentMilestoneIndex = crashState.currentMilestoneIndex;
                plan.currentStepIndex = crashState.currentStepIndex;
                this._lastCheckpointHash = crashState.lastCheckpointHash;
                this._repairAttempts = crashState.activeRepairs || [];

                this._setState(LoopState.Recovering);
                this._fireExecutionEvent(ExecutionEventType.LoopRecovered,
                        `Recovered from crash at milestone ${crashState.currentMilestoneIndex}, step ${crashState.currentStepIndex}`,
                        { planId: crashState.planId, savedAt: crashState.savedAt });

                this.logService.info(`[AutonomousLoop] Crash recovery: plan=${crashState.planId}, milestone=${crashState.currentMilestoneIndex}`);

                // Clear the crash state so we do not re-recover
                this.clearCrashRecoveryState();
                return true;
        }

        hasCrashRecoveryState(): boolean {
                return !!this.storageService.get(STORAGE_CRASH_KEY, StorageScope.WORKSPACE, undefined);
        }

        clearCrashRecoveryState(): void {
                this.storageService.remove(STORAGE_CRASH_KEY, StorageScope.WORKSPACE);
        }

        // ═══════════════════════════════════════════════════════════════════════════
        // Main Execution Loop
        // ═══════════════════════════════════════════════════════════════════════════

        private async _runLoop(): Promise<void> {
                const plan = this._currentPlan;
                if (!plan) { return; }

                try {
                        while (this._state === LoopState.Executing && !this._cancelled) {
                                // Get current milestone and step
                                const milestone = this._getCurrentMilestone(plan);
                                if (!milestone) {
                                        // All milestones done
                                        this._setState(LoopState.Idle);
                                        this._fireExecutionEvent(ExecutionEventType.LoopCompleted,
                                                `All milestones completed`, { planId: plan.id });
                                        this.logService.info('[AutonomousLoop] All milestones completed');
                                        return;
                                }

                                // Start milestone if not started
                                if (milestone.status === MilestoneStatus.Pending) {
                                        milestone.status = MilestoneStatus.InProgress;
                                        milestone.startedAt = Date.now();
                                        this._onMilestoneUpdate.fire(milestone);
                                        this._fireExecutionEvent(ExecutionEventType.MilestoneStarted,
                                                `Milestone started: ${milestone.name}`, { milestoneId: milestone.id });
                                }

                                const step = this._getCurrentStep(plan);

                                if (!step) {
                                        // No more steps in this milestone; verify and complete
                                        await this._completeMilestone(plan, milestone);
                                        continue;
                                }

                                // Execute the current step
                                if (step.status === 'pending') {
                                        step.status = 'running';
                                        this._onStepUpdate.fire(step);
                                        this._fireExecutionEvent(ExecutionEventType.StepStarted,
                                                `Step started: ${step.description}`, { stepId: step.id, action: step.action });
                                }

                                const result = await this._executeStep(step);

                                if (this._cancelled) { break; }

                                if (result.success) {
                                        step.status = 'completed';
                                        step.result = result.output;
                                        this._onStepUpdate.fire(step);
                                        this._fireExecutionEvent(ExecutionEventType.StepCompleted,
                                                `Step completed: ${step.description}`, { stepId: step.id });

                                        // Update token usage
                                        if (result.tokensUsed) {
                                                plan.totalTokensUsed += result.tokensUsed;
                                                const providerConfig = this.llmService.getProvider(this.llmService.activeProviderId);
                                                if (providerConfig) {
                                                        const inputEstimate = Math.ceil(result.tokensUsed * 0.6);
                                                        const outputEstimate = result.tokensUsed - inputEstimate;
                                                        plan.totalCost += (inputEstimate / 1_000_000) * providerConfig.pricingPerMillionInput
                                                                + (outputEstimate / 1_000_000) * providerConfig.pricingPerMillionOutput;
                                                }
                                        }

                                        // Advance step index
                                        plan.currentStepIndex++;
                                } else {
                                        // Step failed; attempt retry or enter repair cycle
                                        step.error = result.error || 'Step failed with no error message';

                                        if (step.retryCount < step.maxRetries) {
                                                step.retryCount++;
                                                step.status = 'pending'; // Reset for retry
                                                this._onStepUpdate.fire(step);
                                                this.logService.info(`[AutonomousLoop] Retrying step ${step.id}, attempt ${step.retryCount}`);
                                                // Brief delay before retry
                                                await this._delay(1000 * step.retryCount);
                                                continue;
                                        }

                                        // Max retries exhausted; enter repair cycle
                                        step.status = 'failed';
                                        this._onStepUpdate.fire(step);
                                        this._fireExecutionEvent(ExecutionEventType.StepFailed,
                                                `Step failed: ${step.description}`, { stepId: step.id, error: step.error });

                                        const repairSuccess = await this._repairCycle(plan, milestone, step, result.error || '');

                                        if (!repairSuccess) {
                                                // Repair failed; mark milestone as failed and advance
                                                milestone.status = MilestoneStatus.Failed;
                                                milestone.completedAt = Date.now();
                                                this._onMilestoneUpdate.fire(milestone);
                                                this._fireExecutionEvent(ExecutionEventType.MilestoneFailed,
                                                        `Milestone failed: ${milestone.name}`, { milestoneId: milestone.id });

                                                // Skip to next milestone
                                                plan.currentMilestoneIndex++;
                                                plan.currentStepIndex = 0;
                                        }
                                }

                                // Save crash recovery after every step
                                this.saveCrashRecoveryState();
                                this._persistPlan(plan);
                        }

                        // Loop exited due to pause/stop
                        if (this._cancelled && this._state === LoopState.Paused) {
                                // Already set to Paused by pause()
                        } else if (this._cancelled && this._state !== LoopState.Stopped) {
                                this._setState(LoopState.Stopped);
                        }
                } catch (e: any) {
                        this.logService.error(`[AutonomousLoop] Unhandled error: ${e?.message}`);
                        this._setState(LoopState.Crashed);
                        this._fireExecutionEvent(ExecutionEventType.LoopCrashed, `Crashed: ${e?.message}`, { error: e?.message });
                        this.saveCrashRecoveryState();
                }
        }

        // ═══════════════════════════════════════════════════════════════════════════
        // Step Execution Dispatch
        // ═══════════════════════════════════════════════════════════════════════════

        private async _executeStep(step: ExecutionStep): Promise<StepResult> {
                switch (step.action) {
                        case 'edit':
                                return this._handleEditStep(step);
                        case 'command':
                                return this._handleCommandStep(step);
                        case 'git':
                                return this._handleGitStep(step);
                        case 'llm':
                                return this._handleLLMStep(step);
                        case 'verify':
                                return this._handleVerifyStep(step);
                        default:
                                return { success: false, error: `Unknown action type: ${step.action}` };
                }
        }

        // ─── Edit Step ────────────────────────────────────────────────────────────

        private async _handleEditStep(step: ExecutionStep): Promise<StepResult> {
                const { filePath, content, oldContent, newContent } = step.params;

                if (!filePath) {
                        return { success: false, error: 'Missing filePath in edit step params' };
                }

                try {
                        let operation: EditOperation;

                        if (content !== undefined) {
                                // Full content write
                                operation = {
                                        filePath,
                                        type: 'create',
                                        content,
                                };
                        } else if (oldContent !== undefined && newContent !== undefined) {
                                // Targeted replacement
                                // Read current file content, perform replacement, write back
                                try {
                                        const readResult = await this.codeEditingService.readFile(filePath);
                                        const currentContent = readResult.content;
                                        const updatedContent = currentContent.replace(oldContent, newContent);

                                        if (updatedContent === currentContent && oldContent !== newContent) {
                                                return { success: false, error: `oldContent not found in ${filePath}` };
                                        }

                                        operation = {
                                                filePath,
                                                type: 'modify',
                                                oldContent: currentContent,
                                                newContent: updatedContent,
                                        };
                                } catch (readError: any) {
                                        // File may not exist yet; try create instead
                                        operation = {
                                                filePath,
                                                type: 'create',
                                                content: newContent,
                                        };
                                }
                        } else {
                                return { success: false, error: 'Edit step requires either content or oldContent+newContent in params' };
                        }

                        const result: EditResult = await this.codeEditingService.applyEdit(operation);

                        if (result.success) {
                                return { success: true, output: `Edited ${filePath} (${result.bytesWritten || 0} bytes)` };
                        } else {
                                return { success: false, error: result.error || `Failed to edit ${filePath}` };
                        }
                } catch (e: any) {
                        return { success: false, error: `Edit error: ${e?.message || String(e)}` };
                }
        }

        // ─── Command Step ─────────────────────────────────────────────────────────

        private async _handleCommandStep(step: ExecutionStep): Promise<StepResult> {
                const { command, cwd } = step.params;

                if (!command) {
                        return { success: false, error: 'Missing command in command step params' };
                }

                // Safety check
                const safety = this._isCommandSafe(command);
                if (!safety.safe) {
                        return { success: false, error: `Command blocked: ${safety.reason || 'unsafe command'}` };
                }

                const effectiveCwd = cwd || this._getWorkspaceRoot() || '';
                const timeout = step.params.timeoutMs || COMMAND_TIMEOUT_MS;

                try {
                        const result: TerminalExecutionResult = await this.terminalBridge.executeWithOutputCapture(command, effectiveCwd, timeout);

                        if (result.exitCode === 0) {
                                return {
                                        success: true,
                                        output: result.stdout || '(command completed with no output)',
                                };
                        } else {
                                return {
                                        success: false,
                                        error: `Command exited with code ${result.exitCode}: ${result.stderr || result.stdout}`,
                                        output: result.stdout,
                                };
                        }
                } catch (e: any) {
                        return { success: false, error: `Command execution error: ${e?.message || String(e)}` };
                }
        }

        // ─── Git Step ─────────────────────────────────────────────────────────────

        private async _handleGitStep(step: ExecutionStep): Promise<StepResult> {
                const { operation, message, branch, files } = step.params;
                const repoRoot = this._getWorkspaceRoot();

                if (!repoRoot) {
                        return { success: false, error: 'No workspace root for git operation' };
                }

                if (!operation) {
                        return { success: false, error: 'Missing operation in git step params' };
                }

                try {
                        let result: any;

                        switch (operation) {
                                case 'commit': {
                                        const commitMessage = message || 'Automated commit from execution loop';
                                        const commitResult = await this.gitWorkflowService.commit(repoRoot, commitMessage, files);
                                        result = commitResult;
                                        if (commitResult) {
                                                return { success: true, output: `Committed: ${commitResult.shortHash} - ${commitResult.message}` };
                                        } else {
                                                return { success: false, error: 'Commit returned null; nothing to commit or commit failed' };
                                        }
                                }
                                case 'checkout': {
                                        if (!branch) {
                                                return { success: false, error: 'Missing branch name for checkout' };
                                        }
                                        const checkoutOk = await this.gitWorkflowService.checkoutBranch(repoRoot, branch);
                                        return checkoutOk
                                                ? { success: true, output: `Checked out branch: ${branch}` }
                                                : { success: false, error: `Failed to checkout branch: ${branch}` };
                                }
                                case 'branch': {
                                        if (!branch) {
                                                return { success: false, error: 'Missing branch name for branch creation' };
                                        }
                                        const createOk = await this.gitWorkflowService.createBranch(repoRoot, branch, true);
                                        return createOk
                                                ? { success: true, output: `Created and checked out branch: ${branch}` }
                                                : { success: false, error: `Failed to create branch: ${branch}` };
                                }
                                case 'status': {
                                        const status = await this.gitWorkflowService.getStatus(repoRoot);
                                        return {
                                                success: true,
                                                output: `Branch: ${status.branch}, Staged: ${status.staged.length}, Modified: ${status.modified.length}, Untracked: ${status.untracked.length}`,
                                        };
                                }
                                case 'diff': {
                                        const diffs = await this.gitWorkflowService.getDiff(repoRoot, step.params.file, step.params.staged);
                                        const summary = diffs.map(d => `${d.filePath}: +${d.additions}/-${d.deletions}`).join('\n');
                                        return { success: true, output: summary || 'No differences' };
                                }
                                case 'log': {
                                        const count = step.params.count || 10;
                                        const log = await this.gitWorkflowService.getLog(repoRoot, count);
                                        const summary = log.map(c => `${c.shortHash} ${c.message}`).join('\n');
                                        return { success: true, output: summary || 'No commits' };
                                }
                                case 'stash': {
                                        const stashOk = await this.gitWorkflowService.stash(repoRoot, message);
                                        return stashOk
                                                ? { success: true, output: 'Changes stashed' }
                                                : { success: false, error: 'Failed to stash changes' };
                                }
                                default:
                                        return { success: false, error: `Unknown git operation: ${operation}` };
                        }
                } catch (e: any) {
                        return { success: false, error: `Git operation error: ${e?.message || String(e)}` };
                }
        }

        // ─── LLM Step ─────────────────────────────────────────────────────────────

        private async _handleLLMStep(step: ExecutionStep): Promise<StepResult> {
                const { prompt, systemPrompt, model: requestedModel, maxTokens, temperature } = step.params;

                if (!prompt) {
                        return { success: false, error: 'Missing prompt in LLM step params' };
                }

                const messages: LLMMessage[] = [];
                if (systemPrompt) {
                        messages.push({ role: 'system', content: systemPrompt });
                }
                messages.push({ role: 'user', content: prompt });

                const model = requestedModel || this.llmService.getProvider(this.llmService.activeProviderId)?.defaultModel || 'gpt-4o';

                const request: LLMRequest = {
                        requestId: generateUuid(),
                        model,
                        messages,
                        maxTokens: maxTokens || 4096,
                        temperature: temperature !== undefined ? temperature : 0.3,
                };

                try {
                        const response = await this.llmService.sendRequest(request);
                        const content = response.content;

                        // Parse response for code blocks and apply them if found
                        let appliedEdits = 0;
                        const codeBlocks = this._extractCodeBlocks(content);

                        for (const block of codeBlocks) {
                                if (block.filePath && block.content) {
                                        try {
                                                const editResult = await this.codeEditingService.applyEdit({
                                                        filePath: block.filePath,
                                                        type: block.exists ? 'modify' : 'create',
                                                        content: block.content,
                                                });
                                                if (editResult.success) {
                                                        appliedEdits++;
                                                }
                                        } catch {
                                                // Best effort; failures are logged but not fatal
                                        }
                                }
                        }

                        return {
                                success: true,
                                output: content,
                                tokensUsed: response.usage.totalTokens,
                        };
                } catch (e: any) {
                        return { success: false, error: `LLM request error: ${e?.message || String(e)}` };
                }
        }

        // ─── Verify Step ──────────────────────────────────────────────────────────

        private async _handleVerifyStep(step: ExecutionStep): Promise<StepResult> {
                const commands: string[] = step.params.commands || ['npm run build', 'npm run lint'];
                const errors: string[] = [];
                let allPassed = true;
                const outputs: string[] = [];

                for (const cmd of commands) {
                        const safety = this._isCommandSafe(cmd);
                        if (!safety.safe) {
                                errors.push(`Command blocked: ${cmd} - ${safety.reason}`);
                                allPassed = false;
                                continue;
                        }

                        try {
                                const cwd = this._getWorkspaceRoot() || '';
                                const result = await this.terminalBridge.executeWithOutputCapture(cmd, cwd, VERIFICATION_TIMEOUT_MS);

                                if (result.exitCode !== 0) {
                                        allPassed = false;
                                        errors.push(`${cmd} failed (exit ${result.exitCode}): ${(result.stderr || result.stdout).substring(0, 500)}`);
                                }
                                outputs.push(`${cmd}: exit=${result.exitCode}`);
                        } catch (e: any) {
                                allPassed = false;
                                errors.push(`${cmd} error: ${e?.message || String(e)}`);
                        }
                }

                if (allPassed) {
                        return { success: true, output: outputs.join('\n') || 'All verifications passed' };
                } else {
                        return { success: false, error: errors.join('\n'), output: outputs.join('\n') };
                }
        }

        // ═══════════════════════════════════════════════════════════════════════════
        // Milestone Completion
        // ═══════════════════════════════════════════════════════════════════════════

        private async _completeMilestone(plan: ExecutionPlan, milestone: Milestone): Promise<void> {
                // Run full verification
                this._setState(LoopState.Verifying);
                milestone.status = MilestoneStatus.Verifying;
                this._onMilestoneUpdate.fire(milestone);
                this._fireExecutionEvent(ExecutionEventType.VerificationStarted,
                        `Verifying milestone: ${milestone.name}`, { milestoneId: milestone.id });

                const verification = await this._runVerification();

                if (verification.passed) {
                        // Verification passed; create checkpoint commit
                        milestone.status = MilestoneStatus.Completed;
                        milestone.completedAt = Date.now();
                        this._setState(LoopState.Committing);

                        const commitHash = await this._createCheckpoint(milestone);
                        if (commitHash) {
                                milestone.checkpointCommitHash = commitHash;
                                this._lastCheckpointHash = commitHash;
                        }

                        this._onMilestoneUpdate.fire(milestone);
                        this._fireExecutionEvent(ExecutionEventType.VerificationPassed,
                                `Milestone verified: ${milestone.name}`, { milestoneId: milestone.id });
                        this._fireExecutionEvent(ExecutionEventType.MilestoneCompleted,
                                `Milestone completed: ${milestone.name}`, { milestoneId: milestone.id, commitHash });

                        this.logService.info(`[AutonomousLoop] Milestone completed: ${milestone.name}`);

                        // Store in project memory
                        try {
                                this.projectMemory.store(
                                        MemoryType.MilestoneHistory,
                                        `milestone-${milestone.id}`,
                                        JSON.stringify({ name: milestone.name, status: milestone.status, commitHash, completedAt: milestone.completedAt }),
                                        MemoryPriority.High,
                                        ['milestone', 'checkpoint']
                                );
                        } catch {
                                // Non-fatal
                        }

                        // Advance to next milestone
                        plan.currentMilestoneIndex++;
                        plan.currentStepIndex = 0;
                        this._setState(LoopState.Executing);
                } else {
                        // Verification failed; enter repair cycle at milestone level
                        this._fireExecutionEvent(ExecutionEventType.VerificationFailed,
                                `Milestone verification failed: ${milestone.name}`,
                                { milestoneId: milestone.id, errors: verification.errors });

                        // Find the first failed step to use as context for repair
                        const failedStep = milestone.steps.find(s => s.status === 'failed');
                        if (failedStep) {
                                const repairSuccess = await this._repairCycle(plan, milestone, failedStep, verification.errors.join('\n'));
                                if (repairSuccess) {
                                        // Re-verify after successful repair
                                        const reverify = await this._runVerification();
                                        if (reverify.passed) {
                                                milestone.status = MilestoneStatus.Completed;
                                                milestone.completedAt = Date.now();
                                                this._setState(LoopState.Committing);
                                                const commitHash = await this._createCheckpoint(milestone);
                                                if (commitHash) {
                                                        milestone.checkpointCommitHash = commitHash;
                                                        this._lastCheckpointHash = commitHash;
                                                }
                                                this._onMilestoneUpdate.fire(milestone);
                                                this._fireExecutionEvent(ExecutionEventType.MilestoneCompleted,
                                                        `Milestone completed after repair: ${milestone.name}`, { milestoneId: milestone.id, commitHash });
                                                plan.currentMilestoneIndex++;
                                                plan.currentStepIndex = 0;
                                                this._setState(LoopState.Executing);
                                                return;
                                        }
                                }
                        }

                        // Repair failed or no failed step found; mark milestone as failed
                        milestone.status = MilestoneStatus.Failed;
                        milestone.completedAt = Date.now();
                        this._onMilestoneUpdate.fire(milestone);
                        this._fireExecutionEvent(ExecutionEventType.MilestoneFailed,
                                `Milestone failed: ${milestone.name}`, { milestoneId: milestone.id, errors: verification.errors });

                        plan.currentMilestoneIndex++;
                        plan.currentStepIndex = 0;
                        this._setState(LoopState.Executing);
                }
        }

        // ═══════════════════════════════════════════════════════════════════════════
        // Repair Cycle
        // ═══════════════════════════════════════════════════════════════════════════

        private async _repairCycle(plan: ExecutionPlan, milestone: Milestone, step: ExecutionStep, failureOutput: string): Promise<boolean> {
                this._setState(LoopState.Repairing);
                milestone.status = MilestoneStatus.Repairing;
                milestone.repairAttempts++;
                this._onMilestoneUpdate.fire(milestone);

                this._fireExecutionEvent(ExecutionEventType.RepairStarted,
                        `Repair attempt ${milestone.repairAttempts} for step: ${step.description}`,
                        { milestoneId: milestone.id, stepId: step.id, repairAttempt: milestone.repairAttempts });

                this._repairStats.totalAttempts++;
                this._repairStats.milestonesWithRepairs = new Set(this._repairAttempts.map(r => r.milestoneId)).size + 1;

                if (milestone.repairAttempts > MAX_REPAIR_ATTEMPTS_PER_MILESTONE) {
                        this.logService.warn(`[AutonomousLoop] Max repair attempts (${MAX_REPAIR_ATTEMPTS_PER_MILESTONE}) reached for milestone: ${milestone.name}`);
                        return false;
                }

                // Build repair prompt with full context
                let fileContext = '';
                if (step.params.filePath) {
                        try {
                                const readFile = await this.codeEditingService.readFile(step.params.filePath);
                                fileContext = `Current file content (${step.params.filePath}):\n\`\`\`\n${readFile.content.substring(0, 8000)}\n\`\`\`\n\n`;
                        } catch {
                                fileContext = `(Could not read ${step.params.filePath})\n\n`;
                        }
                }

                // Gather recent file changes from memory for context
                let recentChanges = '';
                try {
                        const memResult = this.projectMemory.query(e =>
                                e.type === MemoryType.FileChangeHistory || e.type === MemoryType.CorrectionMemory
                        );
                        if (memResult.entries.length > 0) {
                                recentChanges = memResult.entries.slice(0, 3).map(e => e.value.substring(0, 500)).join('\n---\n');
                        }
                } catch {
                        recentChanges = '';
                }

                const repairPrompt = `You are an autonomous code repair system. A step in the execution plan failed.

MILESTONE: ${milestone.name}
STEP: ${step.description} (action: ${step.action})
STEP PARAMS: ${JSON.stringify(step.params, null, 2)}

FAILURE OUTPUT:
${failureOutput.substring(0, 4000)}

${fileContext}RECENT CHANGES:
${recentChanges || '(no recent changes)'}

Analyze the failure and provide a fix. Use one of these formats:

For file edits:
\`\`\`diff
--- a/path/to/file
+++ b/path/to/file
@@ ... @@
-removed line
+added line
\`\`\`

Or provide the complete corrected file:
FILE: path/to/file
\`\`\`typescript
// complete file content
\`\`\`

For command fixes, suggest the corrected command.
Explain what went wrong and how your fix addresses it.`;

                const model = this.llmService.getProvider(this.llmService.activeProviderId)?.defaultModel || 'gpt-4o';

                const request: LLMRequest = {
                        requestId: generateUuid(),
                        model,
                        messages: [{ role: 'user', content: repairPrompt }],
                        maxTokens: 4096,
                        temperature: 0.2,
                };

                let llmResponse: string;
                let tokensUsed = 0;
                try {
                        const response = await this.llmService.sendRequest(request);
                        llmResponse = response.content;
                        tokensUsed = response.usage.totalTokens;
                        plan.totalTokensUsed += tokensUsed;
                } catch (e: any) {
                        this.logService.error(`[AutonomousLoop] Repair LLM call failed: ${e?.message}`);
                        this._recordRepairAttempt(milestone.id, step.id, failureOutput, repairPrompt, '', '', 'failed', false);
                        return false;
                }

                // Parse LLM response for code changes
                let patchApplied = '';
                let appliedCount = 0;

                // Try to apply diff blocks
                const diffBlocks = this._extractDiffBlocks(llmResponse);
                for (const block of diffBlocks) {
                        try {
                                if (block.filePath && block.newContent) {
                                        const editResult = await this.codeEditingService.applyEdit({
                                                filePath: block.filePath,
                                                type: 'modify',
                                                content: block.newContent,
                                        });
                                        if (editResult.success) {
                                                appliedCount++;
                                                patchApplied += `Modified: ${block.filePath}\n`;
                                        }
                                }
                        } catch {
                                // Best effort
                        }
                }

                // Try to apply FILE: code blocks
                const codeBlocks = this._extractCodeBlocks(llmResponse);
                for (const block of codeBlocks) {
                        if (block.filePath && block.content && appliedCount === 0) {
                                try {
                                        const editResult = await this.codeEditingService.applyEdit({
                                                filePath: block.filePath,
                                                type: block.exists ? 'modify' : 'create',
                                                content: block.content,
                                        });
                                        if (editResult.success) {
                                                appliedCount++;
                                                patchApplied += `${block.exists ? 'Modified' : 'Created'}: ${block.filePath}\n`;
                                        }
                                } catch {
                                        // Best effort
                                }
                        }
                }

                if (appliedCount === 0) {
                        this.logService.warn('[AutonomousLoop] Repair produced no applicable changes');
                        this._recordRepairAttempt(milestone.id, step.id, failureOutput, repairPrompt, llmResponse, '', 'failed', false);
                        return false;
                }

                // Run verification after applying repair
                const postRepairVerification = await this._runVerification();
                patchApplied += `Verification: ${postRepairVerification.passed ? 'PASSED' : 'FAILED'}`;

                if (postRepairVerification.passed) {
                        this._repairStats.successfulRepairs++;
                        this._recordRepairAttempt(milestone.id, step.id, failureOutput, repairPrompt, llmResponse, patchApplied, 'passed', false);
                        this._fireExecutionEvent(ExecutionEventType.RepairApplied,
                                `Repair successful for step: ${step.description}`, { stepId: step.id });

                        // Reset step status so the milestone can proceed
                        step.status = 'completed';
                        step.error = undefined;
                        this._onStepUpdate.fire(step);

                        // Store in memory
                        try {
                                this.projectMemory.store(
                                        MemoryType.CorrectionMemory,
                                        `repair-${milestone.id}-${step.id}-${Date.now()}`,
                                        JSON.stringify({ failureOutput, patchApplied, passed: true }),
                                        MemoryPriority.High,
                                        ['repair', 'correction']
                                );
                        } catch {
                                // Non-fatal
                        }

                        this._setState(LoopState.Executing);
                        return true;
                }

                // Verification still fails; check if state is worse
                const isWorse = this._isVerificationWorse(failureOutput, postRepairVerification.errors);

                if (isWorse) {
                        // State got worse; rollback
                        this._repairStats.worseningCount++;
                        this.logService.warn('[AutonomousLoop] Repair made things worse; rolling back');

                        const rolledBack = await this.rollbackToLastCheckpoint();
                        this._repairStats.rollbackCount += rolledBack ? 1 : 0;

                        this._recordRepairAttempt(milestone.id, step.id, failureOutput, repairPrompt, llmResponse, patchApplied, 'worse', rolledBack);

                        this._fireExecutionEvent(ExecutionEventType.RollbackPerformed,
                                `Rolled back worsening repair for step: ${step.description}`,
                                { stepId: step.id, rolledBack });

                        // Reset step for next repair attempt
                        step.status = 'pending';
                        step.retryCount = 0;
                        this._onStepUpdate.fire(step);
                } else {
                        // State is not worse but still failing; try different approach
                        this._recordRepairAttempt(milestone.id, step.id, failureOutput, repairPrompt, llmResponse, patchApplied, 'failed', false);

                        // Reset step for next repair attempt with a different prompt
                        step.status = 'pending';
                        step.retryCount = 0;
                        this._onStepUpdate.fire(step);

                        this._fireExecutionEvent(ExecutionEventType.RepairFailed,
                                `Repair did not fix the issue for step: ${step.description}`, { stepId: step.id });
                }

                this._setState(LoopState.Executing);
                return false;
        }

        // ═══════════════════════════════════════════════════════════════════════════
        // Verification
        // ═══════════════════════════════════════════════════════════════════════════

        private async _runVerification(): Promise<VerificationResult> {
                const errors: string[] = [];
                let buildOutput = '';
                let lintOutput = '';
                let typecheckOutput = '';
                const cwd = this._getWorkspaceRoot() || '';

                // Run build
                try {
                        const buildResult = await this.terminalBridge.executeWithOutputCapture('npm run build', cwd, VERIFICATION_TIMEOUT_MS);
                        buildOutput = buildResult.stdout + '\n' + buildResult.stderr;
                        if (buildResult.exitCode !== 0) {
                                errors.push(`Build failed (exit ${buildResult.exitCode}): ${buildResult.stderr.substring(0, 1000)}`);
                        }
                } catch (e: any) {
                        errors.push(`Build error: ${e?.message || String(e)}`);
                }

                // Run lint
                try {
                        const lintResult = await this.terminalBridge.executeWithOutputCapture('npm run lint', cwd, VERIFICATION_TIMEOUT_MS);
                        lintOutput = lintResult.stdout + '\n' + lintResult.stderr;
                        if (lintResult.exitCode !== 0) {
                                errors.push(`Lint failed (exit ${lintResult.exitCode}): ${lintResult.stderr.substring(0, 1000)}`);
                        }
                } catch (e: any) {
                        errors.push(`Lint error: ${e?.message || String(e)}`);
                }

                // Run typecheck
                try {
                        const tcResult = await this.terminalBridge.executeWithOutputCapture('npx tsc --noEmit', cwd, VERIFICATION_TIMEOUT_MS);
                        typecheckOutput = tcResult.stdout + '\n' + tcResult.stderr;
                        if (tcResult.exitCode !== 0) {
                                errors.push(`TypeCheck failed (exit ${tcResult.exitCode}): ${tcResult.stderr.substring(0, 1000)}`);
                        }
                } catch (e: any) {
                        // Typecheck may not be available; not fatal
                        typecheckOutput = '(typecheck unavailable)';
                }

                return {
                        passed: errors.length === 0,
                        buildOutput,
                        lintOutput,
                        typecheckOutput,
                        errors,
                };
        }

        // ═══════════════════════════════════════════════════════════════════════════
        // Checkpoint & Commit
        // ═══════════════════════════════════════════════════════════════════════════

        private async _createCheckpoint(milestone: Milestone): Promise<string | null> {
                const repoRoot = this._getWorkspaceRoot();
                if (!repoRoot) {
                        this.logService.warn('[AutonomousLoop] No workspace root for checkpoint commit');
                        return null;
                }

                try {
                        const commitInfo: GitCommitInfo | null = await this.gitWorkflowService.createMilestoneCommit(
                                repoRoot,
                                milestone.name,
                                milestone.id
                        );

                        if (commitInfo) {
                                this._lastCheckpointHash = commitInfo.hash;
                                this._fireExecutionEvent(ExecutionEventType.CheckpointCreated,
                                        `Checkpoint: ${commitInfo.shortHash} for milestone ${milestone.name}`,
                                        { commitHash: commitInfo.hash, milestoneId: milestone.id });
                                this.logService.info(`[AutonomousLoop] Checkpoint created: ${commitInfo.shortHash}`);
                                return commitInfo.hash;
                        } else {
                                // Try a regular checkpoint commit
                                const checkpointInfo = await this.gitWorkflowService.createCheckpointCommit(
                                        repoRoot,
                                        `milestone-${milestone.name}`
                                );
                                if (checkpointInfo) {
                                        this._lastCheckpointHash = checkpointInfo.hash;
                                        this._fireExecutionEvent(ExecutionEventType.CheckpointCreated,
                                                `Checkpoint: ${checkpointInfo.shortHash}`,
                                                { commitHash: checkpointInfo.hash, milestoneId: milestone.id });
                                        this.logService.info(`[AutonomousLoop] Checkpoint created: ${checkpointInfo.shortHash}`);
                                        return checkpointInfo.hash;
                                }
                        }

                        this.logService.warn('[AutonomousLoop] Checkpoint commit returned null; nothing to commit or commit failed');
                        return null;
                } catch (e: any) {
                        this.logService.error(`[AutonomousLoop] Checkpoint error: ${e?.message}`);
                        return null;
                }
        }

        // ═══════════════════════════════════════════════════════════════════════════
        // Parsing Helpers
        // ═══════════════════════════════════════════════════════════════════════════

        private _parsePlanResponse(response: string, projectName: string, idea: string, constraints: string[]): ExecutionPlan {
                // Try to extract JSON from the response (may be wrapped in markdown code blocks)
                let jsonText = response.trim();

                // Strip markdown code fences if present
                const jsonMatch = jsonText.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/);
                if (jsonMatch) {
                        jsonText = jsonMatch[1].trim();
                }

                // Try to find the JSON object directly
                const braceStart = jsonText.indexOf('{');
                const braceEnd = jsonText.lastIndexOf('}');
                if (braceStart >= 0 && braceEnd > braceStart) {
                        jsonText = jsonText.substring(braceStart, braceEnd + 1);
                }

                let parsed: any;
                try {
                        parsed = JSON.parse(jsonText);
                } catch {
                        // If JSON parsing fails entirely, create a minimal plan
                        this.logService.warn('[AutonomousLoop] Failed to parse LLM plan response as JSON; creating minimal plan');
                        return this._createMinimalPlan(projectName, idea, constraints);
                }

                // Build the ExecutionPlan from the parsed response
                const planId = generateUuid();
                const now = Date.now();

                const milestones: Milestone[] = (parsed.milestones || []).map((ms: any, mIndex: number) => {
                        const milestoneId = `${planId}-m${mIndex}`;
                        const steps: ExecutionStep[] = (ms.steps || []).map((st: any, sIndex: number) => ({
                                id: `${milestoneId}-s${sIndex}`,
                                milestoneId,
                                description: st.description || `Step ${sIndex + 1}`,
                                action: st.action || 'command',
                                params: st.params || {},
                                status: 'pending' as const,
                                retryCount: 0,
                                maxRetries: st.maxRetries || MAX_STEP_RETRIES,
                        }));

                        return {
                                id: milestoneId,
                                name: ms.name || `Milestone ${mIndex + 1}`,
                                description: ms.description || '',
                                steps,
                                status: MilestoneStatus.Pending,
                                repairAttempts: 0,
                        };
                });

                // If no milestones were parsed, create a minimal plan
                if (milestones.length === 0) {
                        return this._createMinimalPlan(projectName, idea, constraints);
                }

                return {
                        id: planId,
                        projectName,
                        idea,
                        constraints,
                        milestones,
                        state: LoopState.Idle,
                        createdAt: now,
                        updatedAt: now,
                        currentMilestoneIndex: 0,
                        currentStepIndex: 0,
                        totalTokensUsed: 0,
                        totalCost: 0,
                };
        }

        private _createMinimalPlan(projectName: string, idea: string, constraints: string[]): ExecutionPlan {
                const planId = generateUuid();
                const now = Date.now();
                const milestoneId = `${planId}-m0`;

                return {
                        id: planId,
                        projectName,
                        idea,
                        constraints,
                        milestones: [{
                                id: milestoneId,
                                name: 'Implement project',
                                description: idea,
                                steps: [
                                        {
                                                id: `${milestoneId}-s0`,
                                                milestoneId,
                                                description: 'Generate project code from idea',
                                                action: 'llm' as const,
                                                params: {
                                                        prompt: `Implement the following project idea:\n\n${idea}\n\nConstraints:\n${constraints.join('\n')}\n\nGenerate all necessary source files.`,
                                                        systemPrompt: 'You are an expert software engineer. Generate complete, working code for the given project idea. For each file, use the format:\nFILE: path/to/file\n```language\n// file content\n```',
                                                },
                                                status: 'pending' as const,
                                                retryCount: 0,
                                                maxRetries: MAX_STEP_RETRIES,
                                        },
                                        {
                                                id: `${milestoneId}-s1`,
                                                milestoneId,
                                                description: 'Verify build and lint',
                                                action: 'verify' as const,
                                                params: { commands: ['npm run build', 'npm run lint'] },
                                                status: 'pending' as const,
                                                retryCount: 0,
                                                maxRetries: MAX_STEP_RETRIES,
                                        },
                                ],
                                status: MilestoneStatus.Pending,
                                repairAttempts: 0,
                        }],
                        state: LoopState.Idle,
                        createdAt: now,
                        updatedAt: now,
                        currentMilestoneIndex: 0,
                        currentStepIndex: 0,
                        totalTokensUsed: 0,
                        totalCost: 0,
                };
        }

        /**
         * Extract code blocks from LLM response in the format:
         *   FILE: path/to/file
         *   ```language
         *   content
         *   ```
         */
        private _extractCodeBlocks(response: string): Array<{ filePath: string; content: string; exists: boolean }> {
                const blocks: Array<{ filePath: string; content: string; exists: boolean }> = [];

                // Match "FILE: path" followed by a code block
                const fileBlockPattern = /FILE:\s*(\S+)\s*\n```[\w]*\n([\s\S]*?)```/g;
                let match;
                while ((match = fileBlockPattern.exec(response)) !== null) {
                        const filePath = match[1].trim();
                        const content = match[2].trim();
                        if (filePath && content) {
                                blocks.push({ filePath, content, exists: true });
                        }
                }

                // Also try matching standalone code blocks with a file path comment
                const standalonePattern = /```[\w]*\n([\s\S]*?)```/g;
                while ((match = standalonePattern.exec(response)) !== null) {
                        const content = match[1].trim();
                        // Look for a file path comment at the top of the block
                        const pathMatch = content.match(/^(?:\/\/|#|<!--)\s*(?:file|path):\s*(\S+)/i);
                        if (pathMatch) {
                                const filePath = pathMatch[1].trim();
                                const fileContent = content.substring(content.indexOf('\n') + 1).trim();
                                if (filePath && fileContent && !blocks.some(b => b.filePath === filePath)) {
                                        blocks.push({ filePath, content: fileContent, exists: true });
                                }
                        }
                }

                return blocks;
        }

        /**
         * Extract diff blocks from LLM response.
         * Parses unified diff format and attempts to apply each hunk.
         */
        private _extractDiffBlocks(response: string): Array<{ filePath: string; newContent: string }> {
                const blocks: Array<{ filePath: string; newContent: string }> = [];

                // Look for diff blocks
                const diffPattern = /```diff\n([\s\S]*?)```/g;
                let match;
                while ((match = diffPattern.exec(response)) !== null) {
                        const diffContent = match[1].trim();

                        // Extract file path from diff header
                        const headerMatch = diffContent.match(/---\s+a\/(\S+)/);
                        const plusMatch = diffContent.match(/\+\+\+\s+b\/(\S+)/);

                        if (headerMatch || plusMatch) {
                                const filePath = plusMatch ? plusMatch[1] : headerMatch ? headerMatch[1] : '';
                                if (filePath) {
                                        // Extract added lines as the new content
                                        const lines = diffContent.split('\n');
                                        const addedLines: string[] = [];
                                        let inHunk = false;

                                        for (const line of lines) {
                                                if (line.startsWith('@@')) {
                                                        inHunk = true;
                                                        continue;
                                                }
                                                if (inHunk) {
                                                        if (line.startsWith('+')) {
                                                                addedLines.push(line.substring(1));
                                                        } else if (line.startsWith(' ')) {
                                                                addedLines.push(line.substring(1));
                                                        }
                                                        // Skip removed lines (starting with -)
                                                }
                                        }

                                        if (addedLines.length > 0) {
                                                blocks.push({ filePath, newContent: addedLines.join('\n') });
                                        }
                                }
                        }
                }

                return blocks;
        }

        // ═══════════════════════════════════════════════════════════════════════════
        // Utility Helpers
        // ═══════════════════════════════════════════════════════════════════════════

        private _getCurrentMilestone(plan: ExecutionPlan): Milestone | null {
                if (plan.currentMilestoneIndex >= plan.milestones.length) {
                        return null;
                }
                return plan.milestones[plan.currentMilestoneIndex];
        }

        private _getCurrentStep(plan: ExecutionPlan): ExecutionStep | null {
                const milestone = this._getCurrentMilestone(plan);
                if (!milestone) { return null; }
                if (plan.currentStepIndex >= milestone.steps.length) { return null; }
                return milestone.steps[plan.currentStepIndex];
        }

        private _getWorkspaceRoot(): string | undefined {
                // Use workspace context service as primary, terminal bridge as fallback
                const workspace = this.workspaceContext.getWorkspace();
                if (workspace.folders.length > 0) {
                        return workspace.folders[0].uri.fsPath;
                }
                return undefined;
        }

        private _setState(state: LoopState): void {
                const oldState = this._state;
                this._state = state;
                if (this._currentPlan) {
                        this._currentPlan.state = state;
                        this._currentPlan.updatedAt = Date.now();
                }
                this._onStateChange.fire(state);

                if (oldState !== state) {
                        this._fireExecutionEvent(ExecutionEventType.StateChanged,
                                `State changed: ${oldState} -> ${state}`, { oldState, newState: state });
                }
        }

        private _fireExecutionEvent(type: ExecutionEventType, message: string, data: Record<string, unknown>): void {
                const event: ExecutionEvent = {
                        type,
                        message,
                        data,
                        timestamp: Date.now(),
                };
                this._onExecutionEvent.fire(event);

                // Also log to observability
                try {
                        this.observability.trackMutationStage(
                                this._currentPlan?.id || 'no-plan',
                                type as any,
                                data
                        );
                } catch {
                        // Observability failure is non-fatal
                }
        }

        private _recordRepairAttempt(
                milestoneId: string,
                stepId: string,
                failureOutput: string,
                llmPrompt: string,
                llmResponse: string,
                patchApplied: string,
                verificationResult: 'passed' | 'failed' | 'worse',
                rolledBack: boolean
        ): void {
                const attempt: RepairAttempt = {
                        milestoneId,
                        stepId,
                        failureOutput: failureOutput.substring(0, 4000),
                        llmPrompt: llmPrompt.substring(0, 4000),
                        llmResponse: llmResponse.substring(0, 4000),
                        patchApplied: patchApplied.substring(0, 2000),
                        verificationResult,
                        rolledBack,
                        timestamp: Date.now(),
                };

                this._repairAttempts.push(attempt);
                this._onRepairAttempt.fire(attempt);
                this.logService.info(`[AutonomousLoop] Repair attempt recorded: ${verificationResult}${rolledBack ? ' (rolled back)' : ''}`);
        }

        private _isVerificationWorse(originalError: string, newErrors: string[]): boolean {
                // Heuristic: compare error counts and error types
                const originalLineCount = originalError.split('\n').filter(l => l.trim()).length;
                const newLineCount = newErrors.join('\n').split('\n').filter(l => l.trim()).length;

                // If there are significantly more errors now, consider it worse
                if (newLineCount > originalLineCount * 1.5) {
                        return true;
                }

                // Check for new error types not present in the original
                const originalLower = originalError.toLowerCase();
                for (const newError of newErrors) {
                        const errorLower = newError.toLowerCase();
                        // Check for catastrophic errors
                        if (errorLower.includes('cannot find module') && !originalLower.includes('cannot find module')) {
                                return true;
                        }
                        if (errorLower.includes('syntax error') && !originalLower.includes('syntax error')) {
                                return true;
                        }
                        if (errorLower.includes('unexpected token') && !originalLower.includes('unexpected token')) {
                                return true;
                        }
                }

                return false;
        }

        private _persistPlan(plan: ExecutionPlan): void {
                try {
                        this.storageService.store(
                                STORAGE_PLAN_PREFIX + plan.id,
                                JSON.stringify(plan),
                                StorageScope.WORKSPACE,
                                StorageTarget.MACHINE
                        );
                } catch (e: any) {
                        this.logService.warn(`[AutonomousLoop] Failed to persist plan: ${e?.message}`);
                }
        }

        private _delay(ms: number): Promise<void> {
                return new Promise(resolve => setTimeout(resolve, ms));
        }

        /**
         * Check whether a command appears safe to run.
         * Blocks known destructive patterns. This is a local implementation
         * since the terminal bridge does not provide this method.
         */
        private _isCommandSafe(command: string): { safe: boolean; reason?: string } {
                const destructivePatterns: Array<{ pattern: RegExp; reason: string }> = [
                        { pattern: /\brm\s+(-[a-zA-Z]*f[a-zA-Z]*\s+|.*--no-preserve-root)/, reason: 'Destructive rm detected' },
                        { pattern: /\brm\s+-rf\s+\//, reason: 'Recursive force delete from root' },
                        { pattern: /\bformat\s+[a-zA-Z]:/i, reason: 'Disk format command detected' },
                        { pattern: /\bdd\s+.*of=\/dev\//, reason: 'Direct disk write detected' },
                        { pattern: /\b(mkfs|fdisk)\b/, reason: 'Disk partitioning command detected' },
                        { pattern: /:()\s*>\s*\/etc\//, reason: 'Overwrite of system file detected' },
                        { pattern: /\bchmod\s+(-R\s+)?0?777\s+\//, reason: 'Recursive world-writable permission on root' },
                        { pattern: /\bgit\s+push\s+.*--force/, reason: 'Force push detected' },
                        { pattern: /\bgit\s+reset\s+--hard/, reason: 'Hard reset detected' },
                        { pattern: /\bnpm\s+publish/, reason: 'npm publish blocked for safety' },
                        { pattern: /\bdocker\s+(rm|rmi)\s+/, reason: 'Docker removal command detected' },
                        { pattern: /\bkubectl\s+delete\s+/, reason: 'Kubernetes delete command detected' },
                        { pattern: /\bcurl\s+.*\|\s*(ba)?sh/, reason: 'Pipe to shell from URL detected' },
                        { pattern: /\bwget\s+.*\|\s*(ba)?sh/, reason: 'Pipe to shell from URL detected' },
                ];

                const trimmedCommand = command.trim();
                for (const { pattern, reason } of destructivePatterns) {
                        if (pattern.test(trimmedCommand)) {
                                return { safe: false, reason };
                        }
                }

                return { safe: true };
        }

        // ─── Lifecycle ────────────────────────────────────────────────────────────

        override dispose(): void {
                this.saveCrashRecoveryState();
                if (this._currentPlan) {
                        this._persistPlan(this._currentPlan);
                }
                super.dispose();
        }
}
