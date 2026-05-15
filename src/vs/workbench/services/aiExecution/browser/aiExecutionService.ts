/*---------------------------------------------------------------------------------------------
 *  AI Execution Kernel — Phase 1 Foundation Layer
 *  Real-vibecode VS Code Fork
 *
 *  AIExecutionService — Concrete implementation of IAIExecutionService.
 *  Injected into the VS Code workbench DI container as a Delayed singleton.
 *--------------------------------------------------------------------------------------------*/

import { URI } from '../../../../base/common/uri.js';
import { Disposable, IDisposable, toDisposable } from '../../../../base/common/lifecycle.js';
import { Emitter } from '../../../../base/common/event.js';
import { generateUuid } from '../../../../base/common/uuid.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { IEditorService } from '../../editor/common/editorService.js';
import { ITextFileService } from '../../textfile/common/textfiles.js';
import { IAIExecutionService, IAIFileEdit, IAITerminalExecution, IAIWorkspaceChange, IAIAction, IAIExecutionHistoryEntry } from '../common/aiExecutionService.js';

export class AIExecutionService extends Disposable implements IAIExecutionService {

	declare readonly _serviceBrand: undefined;

	// ─── Private State ─────────────────────────────────────────────────────────

	/** Execution history — append-only log of all AI-driven mutations */
	private readonly _history: IAIExecutionHistoryEntry[] = [];

	/** Registered actions — map from action ID to the action implementation */
	private readonly _actions = new Map<string, IAIAction<unknown, unknown>>();

	/** Event emitter for execution history changes */
	private readonly _onDidRecordExecution = this._register(new Emitter<IAIExecutionHistoryEntry>());
	readonly onDidRecordExecution = this._onDidRecordExecution.event;

	// ─── Constructor (DI-injected dependencies) ────────────────────────────────

	constructor(
		@ILogService private readonly logService: ILogService,
		@IEditorService private readonly editorService: IEditorService,
		@ITextFileService private readonly textFileService: ITextFileService,
	) {
		super();
		this.logService.trace('[AIExecutionService] Phase 1 kernel initialized');
	}

	// ─── File Mutation ─────────────────────────────────────────────────────────

	async requestFileEdit(edit: IAIFileEdit): Promise<void> {
		const entryId = generateUuid();
		this.logService.trace(`[AIExecutionService] requestFileEdit: ${edit.resource.toString()} L${edit.rangeStartLineNumber}-${edit.rangeEndLineNumber}`);

		try {
			// Resolve the text file model for the target resource
			const model = await this.textFileService.files.resolve(edit.resource);

			if (!model || !model.textEditorModel) {
				throw new Error(`Cannot resolve text model for ${edit.resource.toString()}`);
			}

			// Apply the edit to the editor model
			model.textEditorModel.applyEdits([{
				range: {
					startLineNumber: edit.rangeStartLineNumber,
					startColumn: edit.rangeStartColumn,
					endLineNumber: edit.rangeEndLineNumber,
					endColumn: edit.rangeEndColumn,
				},
				text: edit.newText,
			}]);

			// Record successful execution
			this._recordEntry({
				id: entryId,
				type: 'fileEdit',
				resource: edit.resource,
				description: `Edit ${edit.resource.fsPath} L${edit.rangeStartLineNumber}:${edit.rangeStartColumn}-L${edit.rangeEndLineNumber}:${edit.rangeEndColumn}`,
				timestamp: Date.now(),
				success: true,
			});

			this.logService.info(`[AIExecutionService] File edit applied: ${edit.resource.toString()}`);
		} catch (err) {
			// Record failed execution
			this._recordEntry({
				id: entryId,
				type: 'fileEdit',
				resource: edit.resource,
				description: `Edit ${edit.resource.fsPath} L${edit.rangeStartLineNumber}:${edit.rangeStartColumn}-L${edit.rangeEndLineNumber}:${edit.rangeEndColumn}`,
				timestamp: Date.now(),
				success: false,
				error: String(err),
			});

			this.logService.error(`[AIExecutionService] File edit failed: ${String(err)}`);
			throw err;
		}
	}

	// ─── Terminal Execution (Phase 1 Stub) ─────────────────────────────────────

	async requestTerminalExecution(execution: IAITerminalExecution): Promise<void> {
		const entryId = generateUuid();
		this.logService.trace(`[AIExecutionService] requestTerminalExecution (PHASE 1 STUB): ${execution.command}`);

		// Phase 1: Record the request but do NOT execute terminal commands.
		// Terminal integration will be implemented in Phase 2.
		this._recordEntry({
			id: entryId,
			type: 'terminalExecution',
			description: `Terminal request (stub): ${execution.command}`,
			timestamp: Date.now(),
			success: true,
		});

		this.logService.info(`[AIExecutionService] Terminal execution recorded (stub): ${execution.command}`);
	}

	// ─── Workspace Mutation ────────────────────────────────────────────────────

	async applyWorkspaceChange(change: IAIWorkspaceChange): Promise<void> {
		const entryId = generateUuid();
		this.logService.trace(`[AIExecutionService] applyWorkspaceChange: ${change.id} (${change.edits.length} edits)`);

		// Track which edits succeeded for rollback support
		const appliedEdits: IAIFileEdit[] = [];

		try {
			// Apply each edit sequentially to maintain order guarantees
			for (const edit of change.edits) {
				await this.requestFileEdit(edit);
				appliedEdits.push(edit);
			}

			// Record successful workspace change
			this._recordEntry({
				id: entryId,
				type: 'workspaceChange',
				description: `Workspace change "${change.description}" (${change.edits.length} edits)`,
				timestamp: Date.now(),
				success: true,
			});

			this.logService.info(`[AIExecutionService] Workspace change applied: ${change.id}`);
		} catch (err) {
			// Record failed workspace change
			this._recordEntry({
				id: entryId,
				type: 'workspaceChange',
				description: `Workspace change "${change.description}" — FAILED after ${appliedEdits.length}/${change.edits.length} edits`,
				timestamp: Date.now(),
				success: false,
				error: String(err),
			});

			this.logService.error(`[AIExecutionService] Workspace change failed: ${change.id} — ${String(err)}`);
			throw err;
		}
	}

	// ─── Action Registry ───────────────────────────────────────────────────────

	registerAction<TArgs = unknown, TResult = unknown>(action: IAIAction<TArgs, TResult>): IDisposable {
		if (this._actions.has(action.id)) {
			this.logService.warn(`[AIExecutionService] Action "${action.id}" is being re-registered — previous registration will be replaced`);
		}

		this._actions.set(action.id, action as IAIAction<unknown, unknown>);
		this.logService.trace(`[AIExecutionService] Action registered: ${action.id}`);

		return toDisposable(() => {
			this._actions.delete(action.id);
			this.logService.trace(`[AIExecutionService] Action unregistered: ${action.id}`);
		});
	}

	// ─── Execution History ─────────────────────────────────────────────────────

	getExecutionHistory(): IAIExecutionHistoryEntry[] {
		// Return a defensive copy to prevent external mutation
		return [...this._history];
	}

	// ─── Private Helpers ───────────────────────────────────────────────────────

	private _recordEntry(entry: IAIExecutionHistoryEntry): void {
		this._history.push(entry);
		this._onDidRecordExecution.fire(entry);
	}

	// ─── Lifecycle ─────────────────────────────────────────────────────────────

	override dispose(): void {
		this._actions.clear();
		this._history.length = 0;
		super.dispose();
		this.logService.trace('[AIExecutionService] Disposed');
	}
}
