/*---------------------------------------------------------------------------------------------
 *  AI Execution Kernel — Phase 3 Execution Graph Engine
 *  Real-vibecode VS Code Fork
 *
 *  AIExecutionService — Concrete implementation of IAIExecutionService.
 *  Phase 3: Integrates with ExecutionGraphService — every mutation creates
 *  graph nodes, resolves edges, and persists to the causal DAG.
 *--------------------------------------------------------------------------------------------*/

import { URI } from '../../../../base/common/uri.js';
import { Disposable, IDisposable, toDisposable } from '../../../../base/common/lifecycle.js';
import { Emitter } from '../../../../base/common/event.js';
import { generateUuid } from '../../../../base/common/uuid.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { IEditorService } from '../../editor/common/editorService.js';
import { ITextFileService } from '../../textfile/common/textfiles.js';
import { IBulkEditService, IBulkEditOptions, IBulkEditResult, ResourceEdit, ResourceTextEdit } from '../../../../editor/browser/services/bulkEditService.js';
import { IProgress, IProgressStep, Progress } from '../../../../platform/progress/common/progress.js';
import { CancellationToken } from '../../../../base/common/cancellation.js';
import { UndoRedoGroup, UndoRedoSource } from '../../../../platform/undoRedo/common/undoRedo.js';
import {
	IAIExecutionService, IAIFileEdit, IAITerminalExecution, IAIWorkspaceChange, IAIAction,
	IAIExecutionRecord, IAIMutationContext, IAIControlledBulkEditOptions,
	AIMutationSource, AIMutationBypassToken, AIMutationPolicyResult, IAIMutationPolicy
} from '../common/aiExecutionService.js';
import {
	IExecutionGraphService, ExecutionNodeType, ExecutionEdgeType, RollbackStrategy,
	IExecutionNode
} from '../common/executionGraphService.js';

// ─── Default Mutation Policy ───────────────────────────────────────────────────

class DefaultMutationPolicy implements IAIMutationPolicy {
	evaluate(ctx: IAIMutationContext, _edits: IAIFileEdit[]): AIMutationPolicyResult {
		if (ctx.bypassToken) {
			return AIMutationPolicyResult.Allow;
		}
		if (ctx.source === AIMutationSource.AIAgent || ctx.source === AIMutationSource.AIInternal) {
			return ctx.trusted ? AIMutationPolicyResult.Allow : AIMutationPolicyResult.RequireApproval;
		}
		return AIMutationPolicyResult.Allow;
	}
}

// ─── AIExecutionService ────────────────────────────────────────────────────────

export class AIExecutionService extends Disposable implements IAIExecutionService {

	declare readonly _serviceBrand: undefined;

	// ─── Private State ─────────────────────────────────────────────────────────

	/** Execution history — kept for backward compatibility, but primary data is now the graph */
	private readonly _history: IAIExecutionRecord[] = [];

	/** Registered actions */
	private readonly _actions = new Map<string, IAIAction<unknown, unknown>>();

	/** Event emitter for execution history changes */
	private readonly _onDidRecordExecution = this._register(new Emitter<IAIExecutionRecord>());
	readonly onDidRecordExecution = this._onDidRecordExecution.event;

	/** Active bypass tokens */
	private readonly _activeBypassTokens = new Set<number>();

	/** Active mutation context */
	private _activeMutationContext: IAIMutationContext | undefined;
	get activeMutationContext(): IAIMutationContext | undefined { return this._activeMutationContext; }

	/** Mutation policy */
	private readonly _policy = new DefaultMutationPolicy();

	/** Execution stack depth */
	private _executionStackDepth = 0;

	// ─── Constructor (DI-injected dependencies) ────────────────────────────────

	constructor(
		@ILogService private readonly logService: ILogService,
		@IEditorService private readonly editorService: IEditorService,
		@ITextFileService private readonly textFileService: ITextFileService,
		@IBulkEditService private readonly bulkEditService: IBulkEditService,
		@IExecutionGraphService private readonly graphService: IExecutionGraphService,
	) {
		super();
		this.logService.trace('[AIExecutionService] Phase 3 graph-integrated kernel initialized');
	}

	// ─── Recursion Safety ──────────────────────────────────────────────────────

	createBypassToken(executionId: string): AIMutationBypassToken {
		const token = new AIMutationBypassToken(executionId);
		this._activeBypassTokens.add(token.id);
		return token;
	}

	isBypassTokenValid(token: AIMutationBypassToken): boolean {
		return this._activeBypassTokens.has(token.id);
	}

	revokeBypassToken(token: AIMutationBypassToken): void {
		this._activeBypassTokens.delete(token.id);
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

	// ─── Authoritative File Mutation (Graph-Integrated) ────────────────────────

	async requestFileEdit(edit: IAIFileEdit, context?: IAIMutationContext): Promise<void> {
		const entryId = generateUuid();
		const mutationCtx = context ?? this.createAIContext(`requestFileEdit: ${edit.resource.toString()}`);
		const isBypass = mutationCtx.bypassToken && this.isBypassTokenValid(mutationCtx.bypassToken);

		this.logService.trace(`[AIExecutionService] requestFileEdit: ${edit.resource.toString()} source=${mutationCtx.source} bypass=${!!isBypass}`);

		// Policy validation
		if (!isBypass) {
			const policyResult = this._policy.evaluate(mutationCtx, [edit]);
			if (policyResult === AIMutationPolicyResult.Deny) {
				// Create a denied node in the graph
				const node = this.graphService.createNode({
					type: ExecutionNodeType.FileEdit,
					label: `Denied: ${edit.resource.fsPath}`,
					mutationSource: mutationCtx.source,
					trusted: mutationCtx.trusted,
					description: 'Mutation denied by policy',
					fileUri: edit.resource,
					editCount: 1,
					reversible: false,
					rollbackStrategy: RollbackStrategy.Irreversible,
					scopeId: mutationCtx.parentExecutionId,
				});
				this.graphService.completeNode(node.id, { success: false, error: 'Mutation denied by policy' });
				throw new Error(`AIExecutionService: Mutation denied by policy for ${edit.resource.toString()}`);
			}
		}

		// ── PIPELINE: Create graph node → resolve edges → apply → complete node ──

		let beforeChecksum: string | undefined;
		try {
			const model = await this.textFileService.files.resolve(edit.resource);
			if (!model || !model.textEditorModel) {
				throw new Error(`Cannot resolve text model for ${edit.resource.toString()}`);
			}
			beforeChecksum = this._computeChecksum(model.textEditorModel.getValue());
		} catch (err) {
			// Can't resolve model — still create node but without checksum
		}

		// STEP 1: Create graph node (pending state)
		const graphNode = this.graphService.createNode({
			type: ExecutionNodeType.FileEdit,
			label: `Edit ${edit.resource.fsPath} L${edit.rangeStartLineNumber}-${edit.rangeEndLineNumber}`,
			mutationSource: mutationCtx.source,
			trusted: mutationCtx.trusted,
			description: mutationCtx.description,
			fileUri: edit.resource,
			beforeChecksum,
			editCount: 1,
			reversible: true,
			rollbackStrategy: RollbackStrategy.InverseEdit,
			scopeId: mutationCtx.parentExecutionId,
		});

		// STEP 2: Create causal edge from parent if available
		if (mutationCtx.parentExecutionId) {
			this.graphService.createEdge(mutationCtx.parentExecutionId, graphNode.id, ExecutionEdgeType.CausedBy);
		}

		// STEP 3: Apply the mutation with bypass token
		const bypassToken = this.createBypassToken(graphNode.id);

		try {
			const model = await this.textFileService.files.resolve(edit.resource);
			if (!model || !model.textEditorModel) {
				throw new Error(`Cannot resolve text model for ${edit.resource.toString()}`);
			}

			const prevContext = this._activeMutationContext;
			this._activeMutationContext = mutationCtx;
			this._executionStackDepth++;

			if (this._executionStackDepth > 10) {
				throw new Error(`AIExecutionService: Recursion depth exceeded. Possible infinite mutation loop.`);
			}

			let afterChecksum: string | undefined;
			try {
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
					() => null
				);
				afterChecksum = this._computeChecksum(model.textEditorModel.getValue());
			} finally {
				this._executionStackDepth--;
				this._activeMutationContext = prevContext;
			}

			// STEP 4: Complete the graph node with success
			this.graphService.completeNode(graphNode.id, {
				success: true,
				afterChecksum,
			});

			// Also record in legacy history for backward compatibility
			const record = this._createRecord(entryId, mutationCtx, edit.resource, 1, 'fileEdit',
				`Edit ${edit.resource.fsPath} L${edit.rangeStartLineNumber}-${edit.rangeEndLineNumber}`,
				true, beforeChecksum, undefined, afterChecksum);
			this._recordEntry(record);

		} catch (err) {
			// STEP 4 (failure): Complete the graph node with error
			this.graphService.completeNode(graphNode.id, {
				success: false,
				error: String(err),
			});

			const record = this._createRecord(entryId, mutationCtx, edit.resource, 1, 'fileEdit',
				`Edit ${edit.resource.fsPath} FAILED`, false, beforeChecksum, String(err));
			this._recordEntry(record);

			this.logService.error(`[AIExecutionService] File edit failed: ${String(err)}`);
			throw err;
		} finally {
			this.revokeBypassToken(bypassToken);
		}
	}

	// ─── Workspace Edit Pipeline (Graph-Integrated) ────────────────────────────

	async applyWorkspaceEdit(edits: ResourceEdit[], options?: IAIControlledBulkEditOptions): Promise<IBulkEditResult> {
		const entryId = generateUuid();
		const mutationCtx = options?.aiContext ?? this.createAIContext(`applyWorkspaceEdit: ${edits.length} edits`);

		const textEdits = edits.filter(e => e instanceof ResourceTextEdit) as ResourceTextEdit[];
		const affectedUris = new Set<string>();
		for (const e of textEdits) { affectedUris.add(e.resource.toString()); }

		// STEP 1: Create graph node for the workspace edit (parent node)
		const graphNode = this.graphService.createNode({
			type: ExecutionNodeType.WorkspaceEdit,
			label: options?.label ?? `Workspace Edit (${edits.length} edits)`,
			mutationSource: mutationCtx.source,
			trusted: mutationCtx.trusted,
			description: mutationCtx.description,
			fileUri: textEdits.length > 0 ? textEdits[0].resource : undefined,
			additionalFileUris: textEdits.length > 1 ? textEdits.slice(1).map(e => e.resource) : [],
			editCount: textEdits.length,
			reversible: true,
			rollbackStrategy: RollbackStrategy.VSCodeUndo,
		});

		// STEP 2: Begin execution scope — child nodes will auto-link to this parent
		const scope = this.graphService.beginScope(
			`Workspace Edit ${graphNode.id.slice(0, 8)}`,
			graphNode.id,
			mutationCtx.source
		);

		// STEP 3: Create causal edge from parent if available
		if (mutationCtx.parentExecutionId) {
			this.graphService.createEdge(mutationCtx.parentExecutionId, graphNode.id, ExecutionEdgeType.CausedBy);
		}

		const bypassToken = this.createBypassToken(graphNode.id);

		try {
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
				throw new Error(`AIExecutionService: Recursion depth exceeded.`);
			}

			let result: IBulkEditResult;
			try {
				result = await this.bulkEditService.apply(edits, bulkOptions);
			} finally {
				this._executionStackDepth--;
				this._activeMutationContext = prevContext;
			}

			// STEP 4: Complete graph node + end scope
			this.graphService.completeNode(graphNode.id, { success: true });
			this.graphService.endScope(scope.id);

			// Legacy history record
			const primaryUri = textEdits.length > 0 ? textEdits[0].resource : URI.parse('untitled:bulk-edit');
			const record = this._createRecord(entryId, mutationCtx, primaryUri, textEdits.length, 'bulkEdit',
				`Workspace edit: ${edits.length} edits across ${affectedUris.size} files`, true);
			this._recordEntry(record);

			return result;
		} catch (err) {
			this.graphService.completeNode(graphNode.id, { success: false, error: String(err) });
			this.graphService.endScope(scope.id);

			const primaryUri = textEdits.length > 0 ? textEdits[0].resource : URI.parse('untitled:bulk-edit');
			const record = this._createRecord(entryId, mutationCtx, primaryUri, textEdits.length, 'bulkEdit',
				`Workspace edit FAILED`, false, undefined, String(err));
			this._recordEntry(record);

			throw err;
		} finally {
			this.revokeBypassToken(bypassToken);
		}
	}

	// ─── Workspace Mutation ────────────────────────────────────────────────────

	async applyWorkspaceChange(change: IAIWorkspaceChange, context?: IAIMutationContext): Promise<void> {
		const mutationCtx = context ?? this.createAIContext(change.description, undefined);
		const resourceEdits: ResourceEdit[] = change.edits.map(edit =>
			new ResourceTextEdit(edit.resource, {
				range: {
					startLineNumber: edit.rangeStartLineNumber,
					startColumn: edit.rangeStartColumn,
					endLineNumber: edit.rangeEndLineNumber,
					endColumn: edit.rangeEndColumn,
				},
				text: edit.newText,
			}, undefined, undefined)
		);
		await this.applyWorkspaceEdit(resourceEdits, {
			aiContext: mutationCtx,
			label: change.description,
			code: `aiExecution.workspaceChange.${change.id}`,
		});
	}

	// ─── Terminal Execution (Stub) ─────────────────────────────────────────────

	async requestTerminalExecution(execution: IAITerminalExecution): Promise<void> {
		const entryId = generateUuid();

		// Create graph node for terminal execution
		const graphNode = this.graphService.createNode({
			type: ExecutionNodeType.TerminalExecution,
			label: `Terminal: ${execution.command.slice(0, 50)}`,
			mutationSource: AIMutationSource.AIAgent,
			trusted: true,
			description: `Terminal stub: ${execution.command}`,
			editCount: 0,
			reversible: false,
			rollbackStrategy: RollbackStrategy.Irreversible,
		});
		this.graphService.completeNode(graphNode.id, { success: true });

		const record = this._createRecord(entryId,
			{ source: AIMutationSource.AIAgent, executionId: entryId, parentExecutionId: undefined, trusted: true },
			URI.parse('terminal:stub'), 0, 'terminalExecution',
			`Terminal request (stub): ${execution.command}`, true);
		this._recordEntry(record);
	}

	// ─── Action Registry ───────────────────────────────────────────────────────

	registerAction<TArgs = unknown, TResult = unknown>(action: IAIAction<TArgs, TResult>): IDisposable {
		if (this._actions.has(action.id)) {
			this.logService.warn(`[AIExecutionService] Action "${action.id}" re-registered`);
		}
		this._actions.set(action.id, action as IAIAction<unknown, unknown>);
		return toDisposable(() => { this._actions.delete(action.id); });
	}

	// ─── Execution History ─────────────────────────────────────────────────────

	getExecutionHistory(): IAIExecutionRecord[] {
		return [...this._history];
	}

	// ─── Private Helpers ───────────────────────────────────────────────────────

	private _createRecord(
		id: string, ctx: IAIMutationContext, fileUri: URI, editCount: number,
		type: IAIExecutionRecord['type'], description: string, success: boolean,
		beforeChecksum?: string, error?: string, afterChecksum?: string,
	): IAIExecutionRecord {
		return {
			id, timestamp: Date.now(), mutationSource: ctx.source, fileUri, editCount,
			beforeChecksum, afterChecksum, trusted: ctx.trusted, rolledBack: false,
			parentExecutionId: ctx.parentExecutionId, type, description, success, error,
		};
	}

	private _recordEntry(record: IAIExecutionRecord): void {
		this._history.push(record);
		this._onDidRecordExecution.fire(record);
	}

	private _computeChecksum(content: string): string {
		let hash = 2166136261;
		for (let i = 0; i < content.length; i++) {
			hash ^= content.charCodeAt(i);
			hash = (hash * 16777619) >>> 0;
		}
		return hash.toString(16).padStart(8, '0');
	}

	// ─── Lifecycle ─────────────────────────────────────────────────────────────

	override dispose(): void {
		this._actions.clear();
		this._history.length = 0;
		this._activeBypassTokens.clear();
		super.dispose();
	}
}
