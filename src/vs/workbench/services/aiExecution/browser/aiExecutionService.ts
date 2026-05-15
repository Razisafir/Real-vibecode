/*---------------------------------------------------------------------------------------------
 *  AI Execution Kernel — Phase 2 Authoritative File Mutation Control
 *  Real-vibecode VS Code Fork
 *
 *  AIExecutionService — Concrete implementation of IAIExecutionService.
 *  Phase 2: Authoritative gateway with mutation source tagging, recursion safety,
 *  structured execution records, and integration with IBulkEditService pipeline.
 *--------------------------------------------------------------------------------------------*/

import { URI } from '../../../../base/common/uri.js';
import { Disposable, IDisposable, toDisposable } from '../../../../base/common/lifecycle.js';
import { Emitter } from '../../../../base/common/event.js';
import { generateUuid } from '../../../../base/common/uuid.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { IEditorService } from '../../editor/common/editorService.js';
import { ITextFileService } from '../../textfile/common/textfiles.js';
import { IBulkEditService, IBulkEditOptions, IBulkEditResult, ResourceEdit, ResourceTextEdit } from '../../../../editor/browser/services/bulkEditService.js';
import { WorkspaceEdit } from '../../../../editor/common/languages.js';
import { IProgress, IProgressStep, Progress } from '../../../../platform/progress/common/progress.js';
import { CancellationToken } from '../../../../base/common/cancellation.js';
import { UndoRedoGroup, UndoRedoSource } from '../../../../platform/undoRedo/common/undoRedo.js';
import {
	IAIExecutionService, IAIFileEdit, IAITerminalExecution, IAIWorkspaceChange, IAIAction,
	IAIExecutionRecord, IAIMutationContext, IAIControlledBulkEditOptions,
	AIMutationSource, AIMutationBypassToken, AIMutationPolicyResult, IAIMutationPolicy
} from '../common/aiExecutionService.js';

// ─── Default Mutation Policy ───────────────────────────────────────────────────

class DefaultMutationPolicy implements IAIMutationPolicy {
	evaluate(ctx: IAIMutationContext, _edits: IAIFileEdit[]): AIMutationPolicyResult {
		// Phase 2 policy: AI-sourced mutations from trusted contexts are allowed.
		// Untrusted mutations are allowed but logged as untrusted.
		// Future phases will add path-based rules and approval UI.
		if (ctx.bypassToken) {
			return AIMutationPolicyResult.Allow; // Internal bypass — always allowed
		}
		if (ctx.source === AIMutationSource.AIAgent || ctx.source === AIMutationSource.AIInternal) {
			return ctx.trusted ? AIMutationPolicyResult.Allow : AIMutationPolicyResult.RequireApproval;
		}
		return AIMutationPolicyResult.Allow; // User/workspace edits always allowed
	}
}

// ─── AIExecutionService ────────────────────────────────────────────────────────

export class AIExecutionService extends Disposable implements IAIExecutionService {

	declare readonly _serviceBrand: undefined;

	// ─── Private State ─────────────────────────────────────────────────────────

	/** Execution history — structured records for graph-compatible audit trail */
	private readonly _history: IAIExecutionRecord[] = [];

	/** Registered actions — map from action ID to the action implementation */
	private readonly _actions = new Map<string, IAIAction<unknown, unknown>>();

	/** Event emitter for execution history changes */
	private readonly _onDidRecordExecution = this._register(new Emitter<IAIExecutionRecord>());
	readonly onDidRecordExecution = this._onDidRecordExecution.event;

	/** Active bypass tokens — only valid during internal mutation application */
	private readonly _activeBypassTokens = new Set<number>();

	/** The currently active mutation context (for recursion safety) */
	private _activeMutationContext: IAIMutationContext | undefined;
	get activeMutationContext(): IAIMutationContext | undefined { return this._activeMutationContext; }

	/** Mutation policy evaluator */
	private readonly _policy = new DefaultMutationPolicy();

	/** Active execution stack depth — for detecting nested mutations */
	private _executionStackDepth = 0;

	// ─── Constructor (DI-injected dependencies) ────────────────────────────────

	constructor(
		@ILogService private readonly logService: ILogService,
		@IEditorService private readonly editorService: IEditorService,
		@ITextFileService private readonly textFileService: ITextFileService,
		@IBulkEditService private readonly bulkEditService: IBulkEditService,
	) {
		super();
		this.logService.trace('[AIExecutionService] Phase 2 authoritative kernel initialized');
	}

	// ─── Recursion Safety ──────────────────────────────────────────────────────

	createBypassToken(executionId: string): AIMutationBypassToken {
		const token = new AIMutationBypassToken(executionId);
		this._activeBypassTokens.add(token.id);
		this.logService.trace(`[AIExecutionService] Bypass token created: ${token.id} for execution: ${executionId}`);
		return token;
	}

	isBypassTokenValid(token: AIMutationBypassToken): boolean {
		return this._activeBypassTokens.has(token.id);
	}

	revokeBypassToken(token: AIMutationBypassToken): void {
		this._activeBypassTokens.delete(token.id);
		this.logService.trace(`[AIExecutionService] Bypass token revoked: ${token.id}`);
	}

	// ─── Mutation Context ──────────────────────────────────────────────────────

	createAIContext(description?: string, parentExecutionId?: string): IAIMutationContext {
		return {
			source: AIMutationSource.AIAgent,
			executionId: generateUuid(),
			parentExecutionId,
			trusted: true,
			description,
		};
	}

	// ─── Authoritative File Mutation ───────────────────────────────────────────

	async requestFileEdit(edit: IAIFileEdit, context?: IAIMutationContext): Promise<void> {
		const entryId = generateUuid();
		const mutationCtx = context ?? this.createAIContext(`requestFileEdit: ${edit.resource.toString()}`);
		const isBypass = mutationCtx.bypassToken && this.isBypassTokenValid(mutationCtx.bypassToken);

		this.logService.trace(`[AIExecutionService] requestFileEdit: ${edit.resource.toString()} L${edit.rangeStartLineNumber}-${edit.rangeEndLineNumber} source=${mutationCtx.source} bypass=${!!isBypass}`);

		// Policy validation — skip for bypassed mutations (internal applies)
		if (!isBypass) {
			const policyResult = this._policy.evaluate(mutationCtx, [edit]);
			if (policyResult === AIMutationPolicyResult.Deny) {
				const record = this._createRecord(entryId, mutationCtx, edit.resource, 1, 'fileEdit', `Edit denied by policy: ${edit.resource.fsPath}`, false, undefined, 'Mutation denied by policy');
				this._recordEntry(record);
				throw new Error(`AIExecutionService: Mutation denied by policy for ${edit.resource.toString()}`);
			}
			if (policyResult === AIMutationPolicyResult.RequireApproval) {
				// Phase 2: Auto-approve with logging. Future: show approval UI.
				this.logService.info(`[AIExecutionService] Mutation requires approval (auto-approved in Phase 2): ${edit.resource.toString()}`);
			}
		}

		// Create bypass token for the internal apply — prevents recursive interception
		const bypassToken = this.createBypassToken(entryId);

		try {
			// Resolve the text file model for the target resource
			const model = await this.textFileService.files.resolve(edit.resource);

			if (!model || !model.textEditorModel) {
				throw new Error(`Cannot resolve text model for ${edit.resource.toString()}`);
			}

			// Compute before checksum
			const beforeChecksum = this._computeChecksum(model.textEditorModel.getValue());

			// Track execution depth for recursion detection
			const prevContext = this._activeMutationContext;
			this._activeMutationContext = mutationCtx;
			this._executionStackDepth++;

			if (this._executionStackDepth > 10) {
				throw new Error(`AIExecutionService: Recursion depth exceeded (${this._executionStackDepth}). Possible infinite mutation loop.`);
			}

			try {
				// Apply using pushEditOperations — PRESERVES UNDO STACK
				// This is the correct VS Code pattern (not applyEdits which bypasses undo)
				model.textEditorModel.pushEditOperations(
					null,
					[{
						range: {
							startLineNumber: edit.rangeStartLineNumber,
							startColumn: edit.rangeStartColumn,
							endLineNumber: edit.rangeEndLineNumber,
							endColumn: edit.rangeEndColumn,
						},
						text: edit.newText,
					}],
					() => null // No cursor state computer — AI edits don't control cursor
				);
			} finally {
				this._executionStackDepth--;
				this._activeMutationContext = prevContext;
			}

			// Compute after checksum
			const afterChecksum = this._computeChecksum(model.textEditorModel.getValue());

			// Record successful execution
			const record = this._createRecord(entryId, mutationCtx, edit.resource, 1, 'fileEdit',
				`Edit ${edit.resource.fsPath} L${edit.rangeStartLineNumber}:${edit.rangeStartColumn}-L${edit.rangeEndLineNumber}:${edit.rangeEndColumn}`,
				true, beforeChecksum, undefined, afterChecksum);
			this._recordEntry(record);

			this.logService.info(`[AIExecutionService] File edit applied (undo-safe): ${edit.resource.toString()}`);
		} catch (err) {
			// Record failed execution
			const record = this._createRecord(entryId, mutationCtx, edit.resource, 1, 'fileEdit',
				`Edit ${edit.resource.fsPath} L${edit.rangeStartLineNumber}:${edit.rangeStartColumn}-L${edit.rangeEndLineNumber}:${edit.rangeEndColumn}`,
				false, undefined, String(err));
			this._recordEntry(record);

			this.logService.error(`[AIExecutionService] File edit failed: ${String(err)}`);
			throw err;
		} finally {
			this.revokeBypassToken(bypassToken);
		}
	}

	// ─── Workspace Edit Pipeline ───────────────────────────────────────────────

	async applyWorkspaceEdit(edits: ResourceEdit[], options?: IAIControlledBulkEditOptions): Promise<IBulkEditResult> {
		const entryId = generateUuid();
		const mutationCtx = options?.aiContext ?? this.createAIContext(`applyWorkspaceEdit: ${edits.length} edits`);
		const isBypass = mutationCtx.bypassToken && this.isBypassTokenValid(mutationCtx.bypassToken);

		this.logService.trace(`[AIExecutionService] applyWorkspaceEdit: ${edits.length} edits source=${mutationCtx.source} bypass=${!!isBypass}`);

		// Count text edits for the record
		const textEdits = edits.filter(e => e instanceof ResourceTextEdit) as ResourceTextEdit[];
		const affectedUris = new Set<string>();
		for (const e of textEdits) {
			affectedUris.add(e.resource.toString());
		}

		// Create bypass token for internal apply
		const bypassToken = this.createBypassToken(entryId);

		try {
			// Delegate to IBulkEditService — preserves all batching, preview, undo, cancellation semantics
			const bulkOptions: IBulkEditOptions = {
				editor: options?.editor,
				progress: options?.progress ?? Progress.None,
				token: options?.token ?? CancellationToken.None,
				showPreview: options?.showPreview,
				label: options?.label ?? 'AI Execution Kernel',
				code: options?.code ?? 'aiExecution.kernel',
				quotableLabel: options?.quotableLabel,
				undoRedoGroupId: options?.undoRedoGroupId,
				undoRedoSource: options?.undoRedoSource,
				confirmBeforeUndo: options?.confirmBeforeUndo,
				respectAutoSaveConfig: options?.respectAutoSaveConfig,
				reason: options?.reason,
			};

			const prevContext = this._activeMutationContext;
			this._activeMutationContext = mutationCtx;
			this._executionStackDepth++;

			if (this._executionStackDepth > 10) {
				throw new Error(`AIExecutionService: Recursion depth exceeded (${this._executionStackDepth}). Possible infinite mutation loop.`);
			}

			let result: IBulkEditResult;
			try {
				result = await this.bulkEditService.apply(edits, bulkOptions);
			} finally {
				this._executionStackDepth--;
				this._activeMutationContext = prevContext;
			}

			// Record successful execution
			const primaryUri = textEdits.length > 0 ? textEdits[0].resource : URI.parse('untitled:bulk-edit');
			const record = this._createRecord(entryId, mutationCtx, primaryUri, textEdits.length, 'bulkEdit',
				`Workspace edit: ${edits.length} edits across ${affectedUris.size} files`,
				true);
			this._recordEntry(record);

			this.logService.info(`[AIExecutionService] Workspace edit applied: ${edits.length} edits`);
			return result;
		} catch (err) {
			const primaryUri = textEdits.length > 0 ? textEdits[0].resource : URI.parse('untitled:bulk-edit');
			const record = this._createRecord(entryId, mutationCtx, primaryUri, textEdits.length, 'bulkEdit',
				`Workspace edit FAILED: ${edits.length} edits`,
				false, undefined, String(err));
			this._recordEntry(record);

			this.logService.error(`[AIExecutionService] Workspace edit failed: ${String(err)}`);
			throw err;
		} finally {
			this.revokeBypassToken(bypassToken);
		}
	}

	// ─── Workspace Mutation (legacy → delegates to applyWorkspaceEdit) ─────────

	async applyWorkspaceChange(change: IAIWorkspaceChange, context?: IAIMutationContext): Promise<void> {
		const mutationCtx = context ?? this.createAIContext(change.description, undefined);
		this.logService.trace(`[AIExecutionService] applyWorkspaceChange: ${change.id} (${change.edits.length} edits)`);

		// Convert IAIFileEdit[] to ResourceTextEdit[] for the bulk edit pipeline
		const resourceEdits: ResourceEdit[] = change.edits.map(edit =>
			new ResourceTextEdit(
				edit.resource,
				{
					range: {
						startLineNumber: edit.rangeStartLineNumber,
						startColumn: edit.rangeStartColumn,
						endLineNumber: edit.rangeEndLineNumber,
						endColumn: edit.rangeEndColumn,
					},
					text: edit.newText,
				},
				undefined, // versionId
				undefined  // metadata
			)
		);

		await this.applyWorkspaceEdit(resourceEdits, {
			aiContext: mutationCtx,
			label: change.description,
			code: `aiExecution.workspaceChange.${change.id}`,
		});
	}

	// ─── Terminal Execution (Phase 2 Stub) ─────────────────────────────────────

	async requestTerminalExecution(execution: IAITerminalExecution): Promise<void> {
		const entryId = generateUuid();
		this.logService.trace(`[AIExecutionService] requestTerminalExecution (STUB): ${execution.command}`);

		const record = this._createRecord(entryId,
			{ source: AIMutationSource.AIAgent, executionId: entryId, parentExecutionId: undefined, trusted: true },
			URI.parse('terminal:stub'), 0, 'terminalExecution',
			`Terminal request (stub): ${execution.command}`, true);
		this._recordEntry(record);

		this.logService.info(`[AIExecutionService] Terminal execution recorded (stub): ${execution.command}`);
	}

	// ─── Action Registry ───────────────────────────────────────────────────────

	registerAction<TArgs = unknown, TResult = unknown>(action: IAIAction<TArgs, TResult>): IDisposable {
		if (this._actions.has(action.id)) {
			this.logService.warn(`[AIExecutionService] Action "${action.id}" is being re-registered`);
		}

		this._actions.set(action.id, action as IAIAction<unknown, unknown>);
		this.logService.trace(`[AIExecutionService] Action registered: ${action.id}`);

		return toDisposable(() => {
			this._actions.delete(action.id);
			this.logService.trace(`[AIExecutionService] Action unregistered: ${action.id}`);
		});
	}

	// ─── Execution History ─────────────────────────────────────────────────────

	getExecutionHistory(): IAIExecutionRecord[] {
		return [...this._history];
	}

	// ─── Private Helpers ───────────────────────────────────────────────────────

	private _createRecord(
		id: string,
		ctx: IAIMutationContext,
		fileUri: URI,
		editCount: number,
		type: IAIExecutionRecord['type'],
		description: string,
		success: boolean,
		beforeChecksum?: string,
		error?: string,
		afterChecksum?: string,
	): IAIExecutionRecord {
		return {
			id,
			timestamp: Date.now(),
			mutationSource: ctx.source,
			fileUri,
			editCount,
			beforeChecksum,
			afterChecksum,
			trusted: ctx.trusted,
			rolledBack: false,
			parentExecutionId: ctx.parentExecutionId,
			type,
			description,
			success,
			error,
		};
	}

	private _recordEntry(record: IAIExecutionRecord): void {
		this._history.push(record);
		this._onDidRecordExecution.fire(record);
	}

	/**
	 * Simple checksum computation for file content.
	 * Phase 2 uses a fast hash for recording. Future phases may use
	 * full SHA-256 for integrity verification.
	 */
	private _computeChecksum(content: string): string {
		// FNV-1a hash — fast, good distribution, sufficient for change detection
		let hash = 2166136261; // FNV offset basis
		for (let i = 0; i < content.length; i++) {
			hash ^= content.charCodeAt(i);
			hash = (hash * 16777619) >>> 0; // FNV prime, unsigned
		}
		return hash.toString(16).padStart(8, '0');
	}

	// ─── Lifecycle ─────────────────────────────────────────────────────────────

	override dispose(): void {
		this._actions.clear();
		this._history.length = 0;
		this._activeBypassTokens.clear();
		super.dispose();
		this.logService.trace('[AIExecutionService] Disposed');
	}
}
