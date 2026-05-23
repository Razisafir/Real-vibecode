/*---------------------------------------------------------------------------------------------
 *  AI Execution Kernel — Execution Progress Indicator
 *  Real Vibecode — AI-Native IDE
 *
 *  executionProgressContribution.ts — Status bar progress indicator for autonomous execution.
 *
 *  When the AI is running autonomously, the user has no visual feedback that
 *  something is happening. This contribution creates a status bar entry that:
 *
 *    1. Shows an animated "⚡ AI Executing..." when autonomous execution is running
 *    2. Displays the current stage/step name
 *    3. Shows a spinning progress indicator
 *    4. Hides when execution is not active
 *    5. When clicked, focuses the AI Workflow view
 *
 *  Listens to:
 *    - IAutonomousExecutionLoopService.onStateChange  → loop state changes (Running → Paused → Completed)
 *    - IAutonomousExecutionService.onDidChangeStage   → stage changes (Planning → Executing → Verifying...)
 *    - IAutonomousExecutionLoopService.onStepUpdate   → step-level progress
 *    - IAutonomousExecutionLoopService.onMilestoneUpdate → milestone completions
 *--------------------------------------------------------------------------------------------*/

import { Disposable } from '../../../../base/common/lifecycle.js';
import { IWorkbenchContribution, registerWorkbenchContribution2, WorkbenchPhase } from '../../../common/contributions.js';
import { IStatusbarService, StatusbarAlignment, IStatusbarEntryAccessor } from '../../../services/statusbar/common/statusbar.js';
import { IAutonomousExecutionService, ExecutionStage } from '../common/autonomousExecution.js';
import { IAutonomousExecutionLoopService, LoopState, Milestone, ExecutionStep, ExecutionEvent, ExecutionEventType } from '../common/autonomousExecutionLoop.js';
import { ILogService } from '../../../../platform/log/common/log.js';

// ─── Stage Label Mapping ──────────────────────────────────────────────────────

const STAGE_LABELS: Record<string, string> = {
        [ExecutionStage.Planning]: 'Planning',
        [ExecutionStage.Executing]: 'Executing',
        [ExecutionStage.Verifying]: 'Verifying',
        [ExecutionStage.Fixing]: 'Fixing',
        [ExecutionStage.Retrying]: 'Retrying',
        [ExecutionStage.Committing]: 'Committing',
        [ExecutionStage.Continuing]: 'Continuing',
        [ExecutionStage.Paused]: 'Paused',
        [ExecutionStage.Stopped]: 'Stopped',
        [ExecutionStage.Completed]: 'Completed',
        [ExecutionStage.Failed]: 'Failed',
};

const LOOP_STATE_LABELS: Record<string, string> = {
        [LoopState.Idle]: 'Idle',
        [LoopState.Planning]: 'Planning',
        [LoopState.Executing]: 'Executing',
        [LoopState.Verifying]: 'Verifying',
        [LoopState.Repairing]: 'Repairing',
        [LoopState.Committing]: 'Committing',
        [LoopState.Paused]: 'Paused',
        [LoopState.Stopped]: 'Stopped',
        [LoopState.Crashed]: 'Crashed',
        [LoopState.Recovering]: 'Recovering',
};

// ─── Active Loop States ───────────────────────────────────────────────────────

const ACTIVE_LOOP_STATES: Set<string> = new Set([
        LoopState.Planning,
        LoopState.Executing,
        LoopState.Verifying,
        LoopState.Repairing,
        LoopState.Committing,
        LoopState.Recovering,
]);

// ─── Contribution ──────────────────────────────────────────────────────────────

/**
 * ExecutionProgressContribution — Shows AI execution progress in the status bar.
 *
 * This is a workbench contribution that runs during the AfterRestored phase.
 * It observes the autonomous execution loop and the autonomous execution service,
 * and shows/hides a status bar entry accordingly.
 *
 * The status bar entry uses the `$(sync~spin)` codicon for an animated spinner,
 * and displays the current execution stage name. Clicking it focuses the AI
 * Workflow view.
 */
export class ExecutionProgressContribution extends Disposable implements IWorkbenchContribution {

        static readonly ID = 'workbench.contrib.aiExecutionProgress';

        private statusbarAccessor: IStatusbarEntryAccessor | undefined;
        private isExecuting: boolean = false;
        private currentLabel: string = 'AI Executing...';
        private completedMilestones: number = 0;
        private totalMilestones: number = 0;

        constructor(
                @IStatusbarService private readonly statusbarService: IStatusbarService,
                @IAutonomousExecutionService private readonly autonomousExecution: IAutonomousExecutionService,
                @IAutonomousExecutionLoopService private readonly executionLoop: IAutonomousExecutionLoopService,
                @ILogService private readonly logService: ILogService,
        ) {
                super();

                this.logService.info('[ExecutionProgress] Initializing AI execution progress indicator');

                // 1. Listen to loop state changes — this is the primary show/hide trigger
                this._register(this.executionLoop.onStateChange((state: LoopState) => {
                        this.logService.trace(`[ExecutionProgress] Loop state changed: ${state}`);

                        if (ACTIVE_LOOP_STATES.has(state)) {
                                const label = LOOP_STATE_LABELS[state] ?? 'Working';
                                this.showProgress(`AI: ${label}...`);
                        } else if (state === LoopState.Paused) {
                                this.updateProgress('AI: Paused');
                        } else {
                                // Idle, Stopped, Crashed — hide the progress indicator
                                this.hideProgress();
                        }
                }));

                // 2. Listen to stage changes from IAutonomousExecutionService for granular stage labels
                this._register(this.autonomousExecution.onDidChangeStage((stage: ExecutionStage) => {
                        this.logService.trace(`[ExecutionProgress] Execution stage changed: ${stage}`);

                        if (this.isExecuting) {
                                const label = STAGE_LABELS[stage] ?? 'Working';
                                this.updateProgress(`AI: ${label}...`);
                        } else if (ACTIVE_LOOP_STATES.has(stage) || stage === ExecutionStage.Planning || stage === ExecutionStage.Executing) {
                                // Show progress even if we missed the loop state change
                                const label = STAGE_LABELS[stage] ?? 'Working';
                                this.showProgress(`AI: ${label}...`);
                        }
                }));

                // 3. Listen to milestone updates for progress tracking
                this._register(this.executionLoop.onMilestoneUpdate((milestone: Milestone) => {
                        if (!this.isExecuting) { return; }

                        // Update milestone counters
                        const progress = this.executionLoop.getProgress();
                        this.completedMilestones = progress.completedMilestones;
                        this.totalMilestones = progress.milestones;

                        if (this.totalMilestones > 0) {
                                const loopState = this.executionLoop.getState();
                                const stateLabel = LOOP_STATE_LABELS[loopState] ?? 'Working';
                                this.updateProgress(`AI: ${stateLabel} (${this.completedMilestones}/${this.totalMilestones} milestones)`);
                        }
                }));

                // 4. Listen to step updates for fine-grained progress
                this._register(this.executionLoop.onStepUpdate((step: ExecutionStep) => {
                        if (!this.isExecuting) { return; }

                        const progress = this.executionLoop.getProgress();
                        if (progress.milestones > 0) {
                                const loopState = this.executionLoop.getState();
                                const stateLabel = LOOP_STATE_LABELS[loopState] ?? 'Working';
                                this.updateProgress(`AI: ${stateLabel} (${progress.completedSteps}/${progress.steps} steps)`);
                        }
                }));

                // 5. Listen to execution events for additional context
                this._register(this.executionLoop.onExecutionEvent((event: ExecutionEvent) => {
                        if (!this.isExecuting) { return; }

                        switch (event.type) {
                                case ExecutionEventType.LoopStarted:
                                        this.showProgress('AI: Starting...');
                                        break;
                                case ExecutionEventType.LoopPaused:
                                        this.updateProgress('AI: Paused');
                                        break;
                                case ExecutionEventType.LoopResumed:
                                        this.updateProgress('AI: Resuming...');
                                        break;
                                case ExecutionEventType.LoopCompleted:
                                case ExecutionEventType.LoopStopped:
                                        this.hideProgress();
                                        break;
                                case ExecutionEventType.LoopCrashed:
                                        this.updateProgress('AI: Crashed');
                                        // Auto-hide after a brief display
                                        setTimeout(() => this.hideProgress(), 5000);
                                        break;
                                case ExecutionEventType.MilestoneCompleted:
                                        if (this.totalMilestones > 0) {
                                                const loopState = this.executionLoop.getState();
                                                const stateLabel = LOOP_STATE_LABELS[loopState] ?? 'Working';
                                                this.updateProgress(`AI: ${stateLabel} (${this.completedMilestones}/${this.totalMilestones} milestones)`);
                                        }
                                        break;
                                case ExecutionEventType.Error:
                                        // Briefly show the error in the status bar
                                        this.updateProgress(`AI: Error — ${event.message.substring(0, 50)}`);
                                        break;
                        }
                }));

                // 6. Listen to autonomous execution completion to hide
                this._register(this.autonomousExecution.onDidComplete(() => {
                        this.logService.info('[ExecutionProgress] Execution completed');
                        this.hideProgress();
                }));

                // 7. Check initial state — the loop might already be running when we init
                const initialState = this.executionLoop.getState();
                if (ACTIVE_LOOP_STATES.has(initialState)) {
                        const label = LOOP_STATE_LABELS[initialState] ?? 'Working';
                        this.showProgress(`AI: ${label}...`);
                }

                this.logService.info('[ExecutionProgress] AI execution progress indicator initialized');
        }

        // ─── Status Bar Management ────────────────────────────────────────────────

        private showProgress(text: string): void {
                this.isExecuting = true;
                this.currentLabel = text;

                this.statusbarAccessor?.dispose();
                this.statusbarAccessor = this.statusbarService.addEntry(
                        {
                                name: 'AI Execution Progress',
                                text: `$(sync~spin) ${text}`,
                                ariaLabel: text,
                                command: 'aiExecution.focus',
                                tooltip: 'Click to view AI Workflow',
                        },
                        StatusbarAlignment.LEFT,
                        100, // Priority: near the left side
                );
        }

        private updateProgress(text: string): void {
                if (!this.isExecuting) { return; }
                this.currentLabel = text;

                this.statusbarAccessor?.dispose();
                this.statusbarAccessor = this.statusbarService.addEntry(
                        {
                                name: 'AI Execution Progress',
                                text: `$(sync~spin) ${text}`,
                                ariaLabel: text,
                                command: 'aiExecution.focus',
                                tooltip: 'Click to view AI Workflow',
                        },
                        StatusbarAlignment.LEFT,
                        100,
                );
        }

        private hideProgress(): void {
                if (!this.isExecuting) { return; }
                this.isExecuting = false;
                this.completedMilestones = 0;
                this.totalMilestones = 0;

                this.statusbarAccessor?.dispose();
                this.statusbarAccessor = undefined;
        }

        // ─── Lifecycle ────────────────────────────────────────────────────────────

        override dispose(): void {
                this.statusbarAccessor?.dispose();
                this.statusbarAccessor = undefined;
                super.dispose();
        }
}

// Register the contribution to run during the AfterRestored phase
registerWorkbenchContribution2(
        ExecutionProgressContribution.ID,
        ExecutionProgressContribution,
        WorkbenchPhase.AfterRestored
);
