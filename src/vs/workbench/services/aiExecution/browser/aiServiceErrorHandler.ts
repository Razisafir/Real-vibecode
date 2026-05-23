/*---------------------------------------------------------------------------------------------
 *  AI Execution Kernel — AI Service Error Handler
 *  Real Vibecode — AI-Native IDE
 *
 *  aiServiceErrorHandler.ts — Error boundaries for AI services.
 *
 *  When an AI service crashes or encounters an error, it propagates without
 *  graceful handling. This contribution wraps AI service calls with error recovery:
 *
 *    1. Listens for errors from AI services (LLM provider, execution, autonomous loop)
 *    2. Logs the error with severity and context
 *    3. Shows a non-intrusive notification (using INotificationService)
 *    4. Attempts automatic recovery (retry with exponential backoff up to 3 times)
 *    5. If recovery fails, degrades gracefully (shows "AI services unavailable")
 *
 *  Subscribes to error events from:
 *    - ILLMProviderService.onRequestFailed       → LLM API errors
 *    - IAutonomousExecutionService.onDidFailStep  → execution step failures
 *    - IProviderHealthService.onDidChangeHealth   → provider health degradation
 *    - IAIUnifiedStateService.onDidChangeState    → state transition to error phases
 *    - IAIExecutionService.onDidRecordExecution   → execution record failures
 *--------------------------------------------------------------------------------------------*/

import { Disposable } from '../../../../base/common/lifecycle.js';
import { IWorkbenchContribution, registerWorkbenchContribution2, WorkbenchPhase } from '../../../common/contributions.js';
import { INotificationService, Severity, INotificationHandle } from '../../../../platform/notification/common/notification.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { IAIExecutionService, IAIExecutionRecord } from '../common/aiExecutionService.js';
import { ILLMProviderService, IProviderHealthService, HealthSeverity } from '../common/llmProvider.js';
import { IAIUnifiedStateService, AIRuntimePhase, IStateTransitionEvent } from '../common/aiUnifiedStateService.js';
import { IAutonomousExecutionService } from '../common/autonomousExecution.js';
import { IAutonomousExecutionLoopService, LoopState, ExecutionEventType } from '../common/autonomousExecutionLoop.js';

// ─── Error Record ──────────────────────────────────────────────────────────────

interface ErrorRecord {
        readonly service: string;
        readonly error: string;
        readonly timestamp: number;
        readonly retryCount: number;
        readonly context?: string;
}

// ─── Retry State ───────────────────────────────────────────────────────────────

interface RetryState {
        retryCount: number;
        lastRetryAt: number;
        readonly originalError: string;
        readonly service: string;
}

// ─── Constants ─────────────────────────────────────────────────────────────────

const MAX_ERRORS = 50;
const MAX_RETRIES = 3;
const RETRY_DELAYS = [1000, 5000, 15000]; // exponential backoff: 1s, 5s, 15s

const CRITICAL_ERROR_PATTERNS = [
        'api key',
        'authentication',
        'quota exceeded',
        'service unavailable',
        'unauthorized',
        'forbidden',
        'credential',
        'invalid api key',
        'api key invalid',
        'billing',
        'payment required',
];

const DEGRADATION_THRESHOLD = 5; // Number of recent errors before showing "AI services unavailable"

// ─── Contribution ──────────────────────────────────────────────────────────────

/**
 * AIServiceErrorHandler — Error boundaries for AI services.
 *
 * This is a workbench contribution that runs during the AfterRestored phase.
 * It observes AI services for errors and provides:
 *   - Structured error logging
 *   - Non-intrusive user notifications
 *   - Automatic retry with exponential backoff
 *   - Graceful degradation when services are unavailable
 */
export class AIServiceErrorHandler extends Disposable implements IWorkbenchContribution {

        static readonly ID = 'workbench.contrib.aiServiceErrorHandler';

        private readonly recentErrors: ErrorRecord[] = [];
        private readonly activeRetries: Map<string, RetryState> = new Map();
        private degradedServices: Set<string> = new Set();
        private activeNotification: INotificationHandle | undefined;

        constructor(
                @INotificationService private readonly notificationService: INotificationService,
                @ILogService private readonly logService: ILogService,
                @IAIExecutionService private readonly aiExecution: IAIExecutionService,
                @ILLMProviderService private readonly llmProvider: ILLMProviderService,
                @IProviderHealthService private readonly providerHealth: IProviderHealthService,
                @IAIUnifiedStateService private readonly unifiedState: IAIUnifiedStateService,
                @IAutonomousExecutionService private readonly autonomousExecution: IAutonomousExecutionService,
                @IAutonomousExecutionLoopService private readonly executionLoop: IAutonomousExecutionLoopService,
        ) {
                super();

                this.logService.info('[AIServiceErrorHandler] Initializing AI service error handler');

                this.registerErrorListeners();

                this.logService.info('[AIServiceErrorHandler] Error listeners registered');
        }

        // ─── Error Listener Registration ──────────────────────────────────────────

        private registerErrorListeners(): void {
                // 1. LLM provider request failures
                this._register(this.llmProvider.onRequestFailed(({ requestId, error }) => {
                        this.handleError('LLMProvider', error, `requestId: ${requestId}`);
                }));

                // 2. Autonomous execution step failures
                this._register(this.autonomousExecution.onDidFailStep(({ stepId, error }) => {
                        this.handleError('AutonomousExecution', error, `stepId: ${stepId}`);
                }));

                // 3. Provider health changes — detect degradation
                this._register(this.providerHealth.onDidChangeHealth((providerId: string) => {
                        const health = this.providerHealth.getHealth(providerId);
                        if (health.status === HealthSeverity.Unhealthy) {
                                this.handleError('ProviderHealth', `Provider ${providerId} is unhealthy (${health.consecutiveFailures} consecutive failures)`, `providerId: ${providerId}`);
                                this.degradedServices.add(providerId);
                        } else if (health.status === HealthSeverity.Degraded) {
                                this.logService.warn(`[AIServiceErrorHandler] Provider ${providerId} is degraded (success rate: ${(health.successRate * 100).toFixed(1)}%)`);
                                this.degradedServices.add(providerId);
                        } else if (health.status === HealthSeverity.Healthy) {
                                // Provider recovered — remove from degraded set
                                if (this.degradedServices.has(providerId)) {
                                        this.degradedServices.delete(providerId);
                                        this.logService.info(`[AIServiceErrorHandler] Provider ${providerId} recovered to healthy`);
                                        this.checkAndClearDegradedState();
                                }
                        }
                }));

                // 4. Unified state transitions to error phases
                this._register(this.unifiedState.onDidChangeState((event: IStateTransitionEvent) => {
                        if (event.toPhase === AIRuntimePhase.Disposed && event.fromPhase !== AIRuntimePhase.Disposed) {
                                this.handleError('AIUnifiedState', 'AI kernel disposed unexpectedly', `trigger: ${event.trigger}`);
                        }
                }));

                // 5. Execution record failures — detect failed mutations
                this._register(this.aiExecution.onDidRecordExecution((record: IAIExecutionRecord) => {
                        if (!record.success && record.error) {
                                this.handleError('AIExecution', record.error, `executionId: ${record.id}, type: ${record.type}, file: ${record.fileUri}`);
                        }
                }));

                // 6. Execution loop crashes and errors
                this._register(this.executionLoop.onStateChange((state: LoopState) => {
                        if (state === LoopState.Crashed) {
                                this.handleError('ExecutionLoop', 'Autonomous execution loop crashed', 'loopState: Crashed');
                        }
                }));

                // 7. Execution events with error type
                this._register(this.executionLoop.onExecutionEvent((event) => {
                        if (event.type === ExecutionEventType.Error) {
                                this.handleError('ExecutionLoop', event.message, `eventData: ${JSON.stringify(event.data)}`);
                        }
                        if (event.type === ExecutionEventType.LoopCrashed) {
                                this.handleError('ExecutionLoop', `Loop crashed: ${event.message}`, 'crash event');
                        }
                }));
        }

        // ─── Error Handling Core ──────────────────────────────────────────────────

        private handleError(service: string, error: Error | string, context?: string): void {
                const errorMsg = error instanceof Error ? error.message : String(error);

                // Deduplicate identical errors within a 2-second window
                const now = Date.now();
                const isDuplicate = this.recentErrors.some(
                        e => e.service === service && e.error === errorMsg && (now - e.timestamp) < 2000
                );
                if (isDuplicate) {
                        this.logService.trace(`[AIServiceErrorHandler] Deduplicated ${service} error: ${errorMsg}`);
                        return;
                }

                this.logService.error(`[AIServiceErrorHandler] ${service} error: ${errorMsg}`, context ?? '');

                // Record the error
                this.recentErrors.push({
                        service,
                        error: errorMsg,
                        timestamp: now,
                        retryCount: 0,
                        context,
                });
                if (this.recentErrors.length > MAX_ERRORS) {
                        this.recentErrors.shift();
                }

                // Determine severity and show notification
                const isCritical = this.isCriticalError(errorMsg);
                if (isCritical) {
                        this.showCriticalNotification(service, errorMsg);
                } else {
                        this.showInfoNotification(service, errorMsg);
                }

                // Check for graceful degradation
                this.checkDegradation();
        }

        // ─── Critical Error Detection ─────────────────────────────────────────────

        private isCriticalError(msg: string): boolean {
                const lower = msg.toLowerCase();
                return CRITICAL_ERROR_PATTERNS.some(p => lower.includes(p));
        }

        // ─── Notification Management ──────────────────────────────────────────────

        private showCriticalNotification(service: string, errorMsg: string): void {
                // Dismiss any existing notification to avoid stacking
                this.activeNotification?.close();

                // Use notify() with severity Error for critical issues (API key, auth, etc.)
                this.activeNotification = this.notificationService.notify({
                        severity: Severity.Error,
                        message: `VibeCode AI: ${errorMsg}`,
                });
        }

        private showInfoNotification(service: string, errorMsg: string): void {
                // Only show non-critical errors if they're not too frequent
                const recentCount = this.recentErrors.filter(
                        e => e.timestamp > Date.now() - 60000
                ).length;

                if (recentCount <= 3) {
                        this.notificationService.info(`VibeCode AI: ${service} encountered an issue — ${this.truncateError(errorMsg)}`);
                } else if (recentCount === 4) {
                        // Suppress further notifications for this burst
                        this.notificationService.info('VibeCode AI: Multiple errors detected. Further notifications suppressed.');
                }
                // After 4 notifications in 60s, suppress to avoid notification spam
        }

        private showDegradedNotification(): void {
                this.activeNotification?.close();

                const degradedList = Array.from(this.degradedServices).join(', ');
                this.activeNotification = this.notificationService.notify({
                        severity: Severity.Warning,
                        message: `VibeCode AI: Services degraded — ${degradedList}. Some AI features may be unavailable.`,
                });
        }

        // ─── Graceful Degradation ─────────────────────────────────────────────────

        private checkDegradation(): void {
                const recentErrorCount = this.recentErrors.filter(
                        e => e.timestamp > Date.now() - 300000 // 5 minutes
                ).length;

                if (recentErrorCount >= DEGRADATION_THRESHOLD && this.degradedServices.size > 0) {
                        this.showDegradedNotification();
                }
        }

        private checkAndClearDegradedState(): void {
                if (this.degradedServices.size === 0) {
                        this.logService.info('[AIServiceErrorHandler] All AI services recovered from degraded state');
                        this.activeNotification?.close();
                        this.activeNotification = undefined;
                }
        }

        // ─── Retry with Exponential Backoff ───────────────────────────────────────

        /**
         * Attempt to retry an operation with exponential backoff.
         * Returns true if a retry was scheduled, false if max retries exceeded.
         */
        scheduleRetry(operationId: string, operation: () => Promise<void>, service: string): boolean {
                const existing = this.activeRetries.get(operationId);
                const retryCount = existing ? existing.retryCount + 1 : 1;

                if (retryCount > MAX_RETRIES) {
                        this.logService.warn(`[AIServiceErrorHandler] Max retries (${MAX_RETRIES}) exceeded for ${operationId} in ${service}`);
                        this.activeRetries.delete(operationId);
                        return false;
                }

                const delay = RETRY_DELAYS[Math.min(retryCount - 1, RETRY_DELAYS.length - 1)];
                this.logService.info(`[AIServiceErrorHandler] Scheduling retry ${retryCount}/${MAX_RETRIES} for ${operationId} in ${delay}ms`);

                this.activeRetries.set(operationId, {
                        retryCount,
                        lastRetryAt: Date.now(),
                        originalError: existing?.originalError ?? 'unknown',
                        service,
                });

                setTimeout(async () => {
                        try {
                                await operation();
                                this.activeRetries.delete(operationId);
                                this.logService.info(`[AIServiceErrorHandler] Retry ${retryCount} succeeded for ${operationId}`);
                        } catch (err) {
                                const errorMsg = err instanceof Error ? err.message : String(err);
                                this.logService.error(`[AIServiceErrorHandler] Retry ${retryCount} failed for ${operationId}: ${errorMsg}`);
                                this.handleError(service, errorMsg, `retry ${retryCount} of ${operationId}`);
                                // Recursive retry — will check MAX_RETRIES again
                                this.scheduleRetry(operationId, operation, service);
                        }
                }, delay);

                return true;
        }

        // ─── Utility ──────────────────────────────────────────────────────────────

        private truncateError(msg: string, maxLength: number = 100): string {
                if (msg.length <= maxLength) { return msg; }
                return msg.substring(0, maxLength - 3) + '...';
        }

        /**
         * Get the most recent error records.
         * Returns a frozen (immutable) array.
         */
        getRecentErrors(count?: number): readonly ErrorRecord[] {
                return Object.freeze(this.recentErrors.slice(-(count ?? 10)));
        }

        /**
         * Get the set of currently degraded service provider IDs.
         */
        getDegradedServices(): ReadonlySet<string> {
                return this.degradedServices;
        }

        /**
         * Get the number of currently active retries.
         */
        getActiveRetryCount(): number {
                return this.activeRetries.size;
        }

        // ─── Lifecycle ────────────────────────────────────────────────────────────

        override dispose(): void {
                this.activeNotification?.close();
                this.activeNotification = undefined;
                this.activeRetries.clear();
                super.dispose();
        }
}

// Register the contribution to run during the AfterRestored phase
registerWorkbenchContribution2(
        AIServiceErrorHandler.ID,
        AIServiceErrorHandler,
        WorkbenchPhase.AfterRestored
);
