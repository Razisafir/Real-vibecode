/*---------------------------------------------------------------------------------------------
 *  Terminal + Process Orchestration System — Phase 8
 *  Real Vibecode — AI-Native IDE
 *
 *  IAIProcessUIService — UI integration for the Process Orchestration System.
 *  Provides read-only view models for process UI panels.
 *--------------------------------------------------------------------------------------------*/

import { Event } from '../../../../base/common/event.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { ProcessLifecycleState, IProcessSession, IProcessOutputChunk, OutputClassification, IParsedError, IProcessApprovalRequest, ProcessApprovalResult, IProcessGroup } from './aiProcessOrchestratorService.js';

export const IAIProcessUIService = createDecorator<IAIProcessUIService>('aiProcessUIService');

// ─── UI View Models ──────────────────────────────────────────────────────────

/**
 * View model for the Process Activity Panel.
 */
export interface IProcessActivityViewModel {
	readonly sessionId: string;
	readonly command: string;
	readonly lifecycleState: ProcessLifecycleState;
	readonly mode: string;
	readonly agentId: string | undefined;
	readonly groupId: string | undefined;
	readonly startedAt: number | undefined;
	readonly durationMs: number;
	readonly supervised: boolean;
	readonly pid: number | undefined;
	readonly exitCode: number | undefined;
	readonly errorCount: number;
	readonly warningCount: number;
}

/**
 * View model for the Live Execution Console.
 */
export interface IProcessConsoleViewModel {
	readonly sessionId: string;
	readonly command: string;
	readonly lifecycleState: ProcessLifecycleState;
	readonly outputLineCount: number;
	readonly recentOutput: readonly IProcessOutputChunk[];
	readonly parsedErrors: readonly IParsedError[];
}

/**
 * View model for the Process Tree View.
 */
export interface IProcessTreeViewModel {
	readonly groups: readonly IProcessGroupNode[];
	readonly ungroupedSessions: readonly IProcessSessionNode[];
	readonly totalActive: number;
	readonly totalSupervised: number;
}

/**
 * A group node in the process tree.
 */
export interface IProcessGroupNode {
	readonly groupId: string;
	readonly label: string;
	readonly sessions: readonly IProcessSessionNode[];
	readonly activeCount: number;
}

/**
 * A session node in the process tree.
 */
export interface IProcessSessionNode {
	readonly sessionId: string;
	readonly command: string;
	readonly lifecycleState: ProcessLifecycleState;
	readonly pid: number | undefined;
	readonly supervised: boolean;
}

/**
 * View model for the Failure Diagnostics View.
 */
export interface IFailureDiagnosticsViewModel {
	readonly failedSessions: readonly IFailureEntry[];
	readonly totalFailures: number;
	readonly recentErrors: readonly IParsedError[];
}

/**
 * A failure entry in the diagnostics view.
 */
export interface IFailureEntry {
	readonly sessionId: string;
	readonly command: string;
	readonly exitCode: number | undefined;
	readonly failedAt: number;
	readonly errorSummary: string;
	readonly parsedErrors: readonly IParsedError[];
	readonly canRetry: boolean;
}

/**
 * View model for the Execution Session History.
 */
export interface ISessionHistoryViewModel {
	readonly entries: readonly ISessionHistoryEntry[];
	readonly totalCount: number;
	readonly successCount: number;
	readonly failureCount: number;
}

/**
 * An entry in the session history.
 */
export interface ISessionHistoryEntry {
	readonly sessionId: string;
	readonly command: string;
	readonly exitCode: number | undefined;
	readonly startedAt: number | undefined;
	readonly completedAt: number | undefined;
	readonly durationMs: number;
	readonly success: boolean;
	readonly mode: string;
	readonly agentId: string | undefined;
}

/**
 * View model for the Process Approval Queue.
 */
export interface IProcessApprovalQueueViewModel {
	readonly pendingRequests: readonly IProcessApprovalRequestViewModel[];
	readonly pendingCount: number;
}

/**
 * View model for a process approval request.
 */
export interface IProcessApprovalRequestViewModel {
	readonly requestId: string;
	readonly command: string;
	readonly riskLevel: string;
	readonly description: string;
	readonly agentId: string | undefined;
	readonly waitingMs: number;
}

// ─── Service Interface ────────────────────────────────────────────────────────

export interface IAIProcessUIService {
	readonly _serviceBrand: undefined;

	/** Get view models for all active processes */
	getProcessActivityViewModels(): readonly IProcessActivityViewModel[];

	/** Get view model for a specific process console */
	getProcessConsoleViewModel(sessionId: string): IProcessConsoleViewModel | undefined;

	/** Get the process tree view model */
	getProcessTreeViewModel(): IProcessTreeViewModel;

	/** Get the failure diagnostics view model */
	getFailureDiagnosticsViewModel(): IFailureDiagnosticsViewModel;

	/** Get the session history view model */
	getSessionHistoryViewModel(): ISessionHistoryViewModel;

	/** Get the process approval queue */
	getProcessApprovalQueue(): IProcessApprovalQueueViewModel;

	/** Approve a process request */
	approveProcessRequest(requestId: string): void;

	/** Deny a process request */
	denyProcessRequest(requestId: string, reason?: string): void;

	/** Event: process activity should refresh */
	readonly onDidUpdateProcessActivity: Event<void>;

	/** Event: process console should refresh */
	readonly onDidUpdateProcessConsole: Event<string>;

	/** Event: approval queue should refresh */
	readonly onDidUpdateApprovalQueue: Event<void>;
}
