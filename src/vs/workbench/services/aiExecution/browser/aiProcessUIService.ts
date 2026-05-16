/*---------------------------------------------------------------------------------------------
 *  Terminal + Process Orchestration System — Phase 8
 *  Real Vibecode — AI-Native IDE
 *
 *  AIProcessUIService — Concrete UI service implementation.
 *--------------------------------------------------------------------------------------------*/

import { Disposable } from '../../../../base/common/lifecycle.js';
import { Emitter, Event } from '../../../../base/common/event.js';
import { IAIProcessUIService, IProcessActivityViewModel, IProcessConsoleViewModel, IProcessTreeViewModel, IProcessGroupNode, IProcessSessionNode, IFailureDiagnosticsViewModel, IFailureEntry, ISessionHistoryViewModel, ISessionHistoryEntry, IProcessApprovalQueueViewModel, IProcessApprovalRequestViewModel } from '../common/aiProcessUI.js';
import { IAIProcessOrchestratorService, ProcessLifecycleState, ProcessApprovalResult } from '../common/aiProcessOrchestratorService.js';
import { ILogService } from '../../../../platform/log/common/log.js';

export class AIProcessUIService extends Disposable implements IAIProcessUIService {
	readonly _serviceBrand: undefined;

	private readonly _onDidUpdateProcessActivity = this._register(new Emitter<void>());
	readonly onDidUpdateProcessActivity = this._onDidUpdateProcessActivity.event;

	private readonly _onDidUpdateProcessConsole = this._register(new Emitter<string>());
	readonly onDidUpdateProcessConsole = this._onDidUpdateProcessConsole.event;

	private readonly _onDidUpdateApprovalQueue = this._register(new Emitter<void>());
	readonly onDidUpdateApprovalQueue = this._onDidUpdateApprovalQueue.event;

	constructor(
		@IAIProcessOrchestratorService private readonly processService: IAIProcessOrchestratorService,
		@ILogService private readonly logService: ILogService,
	) {
		super();

		this._register(this.processService.onDidChangeProcessLifecycle(() => {
			this._onDidUpdateProcessActivity.fire();
		}));
		this._register(this.processService.onDidReceiveOutput(e => {
			this._onDidUpdateProcessConsole.fire(e.sessionId);
		}));
		this._register(this.processService.onDidRequestProcessApproval(() => {
			this._onDidUpdateApprovalQueue.fire();
		}));
		this._register(this.processService.onDidResolveProcessApproval(() => {
			this._onDidUpdateApprovalQueue.fire();
		}));

		this.logService.info('[AIProcessUIService] Initialized');
	}

	getProcessActivityViewModels(): readonly IProcessActivityViewModel[] {
		return this.processService.getAllSessions().map(session => {
			const summary = session.resultSummary ?? this.processService.generateResultSummary(session.id);
			return Object.freeze({
				sessionId: session.id,
				command: session.command,
				lifecycleState: session.lifecycleState,
				mode: session.mode,
				agentId: session.agentId,
				groupId: session.groupId,
				startedAt: session.startedAt,
				durationMs: session.startedAt ? (session.completedAt ?? Date.now()) - session.startedAt : 0,
				supervised: session.supervised,
				pid: session.pid,
				exitCode: session.exitCode,
				errorCount: summary.errorCount,
				warningCount: summary.warningCount,
			});
		});
	}

	getProcessConsoleViewModel(sessionId: string): IProcessConsoleViewModel | undefined {
		const session = this.processService.getSession(sessionId);
		if (!session) { return undefined; }

		const output = this.processService.getOutputBuffer(sessionId);
		const allOutput = output.map(c => c.text).join('\n');
		const parsedErrors = this.processService.parseErrors(allOutput);
		const recentOutput = output.slice(-100);

		return Object.freeze({
			sessionId,
			command: session.command,
			lifecycleState: session.lifecycleState,
			outputLineCount: output.length,
			recentOutput: Object.freeze(recentOutput),
			parsedErrors: Object.freeze(parsedErrors),
		});
	}

	getProcessTreeViewModel(): IProcessTreeViewModel {
		const sessions = this.processService.getAllSessions();
		const groupMap = new Map<string, import('../common/aiProcessOrchestratorService.js').IProcessSession[]>();
		const ungrouped: import('../common/aiProcessOrchestratorService.js').IProcessSession[] = [];

		for (const session of sessions) {
			if (session.groupId) {
				if (!groupMap.has(session.groupId)) { groupMap.set(session.groupId, []); }
				groupMap.get(session.groupId)!.push(session);
			} else {
				ungrouped.push(session);
			}
		}

		const groups: IProcessGroupNode[] = [];
		for (const [groupId, groupSessions] of groupMap) {
			const group = this.processService.getProcessGroup(groupId);
			groups.push(Object.freeze({
				groupId,
				label: group?.label ?? 'Unnamed Group',
				sessions: Object.freeze(groupSessions.map(s => Object.freeze({
					sessionId: s.id,
					command: s.command,
					lifecycleState: s.lifecycleState,
					pid: s.pid,
					supervised: s.supervised,
				}))),
				activeCount: groupSessions.filter(s => s.lifecycleState === ProcessLifecycleState.Running).length,
			}));
		}

		return Object.freeze({
			groups: Object.freeze(groups),
			ungroupedSessions: Object.freeze(ungrouped.map(s => Object.freeze({
				sessionId: s.id,
				command: s.command,
				lifecycleState: s.lifecycleState,
				pid: s.pid,
				supervised: s.supervised,
			}))),
			totalActive: sessions.filter(s => s.lifecycleState === ProcessLifecycleState.Running).length,
			totalSupervised: sessions.filter(s => s.supervised).length,
		});
	}

	getFailureDiagnosticsViewModel(): IFailureDiagnosticsViewModel {
		const sessions = this.processService.getAllSessions();
		const failedSessions = sessions.filter(s =>
			s.lifecycleState === ProcessLifecycleState.Failed ||
			s.lifecycleState === ProcessLifecycleState.Crashed
		);

		const allErrors: import('../common/aiProcessOrchestratorService.js').IParsedError[] = [];
		const entries: IFailureEntry[] = failedSessions.map(session => {
			const summary = this.processService.generateResultSummary(session.id);
			allErrors.push(...summary.parsedErrors);

			return Object.freeze({
				sessionId: session.id,
				command: session.command,
				exitCode: session.exitCode,
				failedAt: session.completedAt ?? session.createdAt,
				errorSummary: summary.summary,
				parsedErrors: summary.parsedErrors,
				canRetry: session.restartPolicy.restartOnFailure,
			});
		});

		return Object.freeze({
			failedSessions: Object.freeze(entries),
			totalFailures: failedSessions.length,
			recentErrors: Object.freeze(allErrors.slice(-20)),
		});
	}

	getSessionHistoryViewModel(): ISessionHistoryViewModel {
		const sessions = this.processService.getAllSessions();
		const entries: ISessionHistoryEntry[] = sessions.map(session => {
			const durationMs = session.startedAt
				? (session.completedAt ?? Date.now()) - session.startedAt
				: 0;

			return Object.freeze({
				sessionId: session.id,
				command: session.command,
				exitCode: session.exitCode,
				startedAt: session.startedAt,
				completedAt: session.completedAt,
				durationMs,
				success: session.exitCode === 0,
				mode: session.mode,
				agentId: session.agentId,
			});
		});

		return Object.freeze({
			entries: Object.freeze(entries),
			totalCount: sessions.length,
			successCount: sessions.filter(s => s.exitCode === 0).length,
			failureCount: sessions.filter(s => s.lifecycleState === ProcessLifecycleState.Failed).length,
		});
	}

	getProcessApprovalQueue(): IProcessApprovalQueueViewModel {
		const pending = this.processService.getPendingProcessApprovals();
		const viewModels: IProcessApprovalRequestViewModel[] = pending.map(req => Object.freeze({
			requestId: req.id,
			command: req.command,
			riskLevel: req.riskLevel,
			description: req.description,
			agentId: req.agentId,
			waitingMs: Date.now() - req.requestedAt,
		}));

		return Object.freeze({
			pendingRequests: Object.freeze(viewModels),
			pendingCount: pending.length,
		});
	}

	approveProcessRequest(requestId: string): void {
		this.processService.resolveProcessApproval(requestId, ProcessApprovalResult.Approved, 'user');
	}

	denyProcessRequest(requestId: string, reason?: string): void {
		this.processService.resolveProcessApproval(requestId, ProcessApprovalResult.Denied, 'user');
	}
}
