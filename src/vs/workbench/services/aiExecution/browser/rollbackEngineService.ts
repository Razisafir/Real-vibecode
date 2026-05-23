/*---------------------------------------------------------------------------------------------
 *  Rollback Engine Service — Concrete Implementation
 *  Real Vibecode — AI-Native IDE
 *
 *  RollbackEngineService — Executes the actual rollback operations for execution graph nodes.
 *
 *  Implements all 5 rollback strategies:
 *    - InverseEdit: Reads stored inverse operations and applies them
 *    - SnapshotRestore: Reads stored snapshots and writes content back
 *    - EditorUndo: Delegates to VS Code's undo command
 *    - CustomUndo: Dispatches to registered custom undo handlers
 *    - Irreversible: No-op, returns failure
 *
 *  Storage:
 *    - Snapshots are stored in IStorageService under key pattern:
 *      `aiExecution.snapshots.${nodeId}`
 *    - Inverse operations are stored under key pattern:
 *      `aiExecution.inverseOps.${nodeId}`
 *--------------------------------------------------------------------------------------------*/

import { Disposable, IDisposable, toDisposable } from '../../../../base/common/lifecycle.js';
import { Emitter, Event } from '../../../../base/common/event.js';
import { URI } from '../../../../base/common/uri.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { IStorageService, StorageScope, StorageTarget } from '../../../../platform/storage/common/storage.js';
import { IEditorService } from '../../editor/common/editorService.js';
import { ITextFileService } from '../../textfile/common/textfiles.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { IExecutionGraphService, RollbackStrategy, IExecutionNode } from '../common/executionGraphService.js';
import {
	IRollbackEngineService,
	IRollbackResult,
	ICustomUndoHandler,
	IContentSnapshot,
	IInverseEditOperation,
} from '../common/rollbackEngine.js';

// ─── Storage Key Helpers ───────────────────────────────────────────────────────

function snapshotKey(nodeId: string): string {
	return `aiExecution.snapshots.${nodeId}`;
}

function inverseOpsKey(nodeId: string): string {
	return `aiExecution.inverseOps.${nodeId}`;
}

// ─── Checksum Helper ───────────────────────────────────────────────────────────

function computeSimpleChecksum(content: string): string {
	// FNV-1a inspired hash — fast, decent distribution for integrity checks
	let hash = 2166136261;
	for (let i = 0; i < content.length; i++) {
		hash ^= content.charCodeAt(i);
		hash = (hash * 16777619) >>> 0;
	}
	return hash.toString(16).padStart(8, '0');
}

// ─── Service Implementation ────────────────────────────────────────────────────

export class RollbackEngineService extends Disposable implements IRollbackEngineService {
	declare readonly _serviceBrand: undefined;

	// ─── Custom Undo Handler Registry ──────────────────────────────────────────

	private readonly _customUndoHandlers: Map<string, ICustomUndoHandler> = new Map();

	// ─── In-Memory Snapshot Cache ──────────────────────────────────────────────
	// Kept in memory for fast access; also persisted to storage for durability.

	private readonly _snapshots: Map<string, IContentSnapshot> = new Map();

	// ─── Events ────────────────────────────────────────────────────────────────

	private readonly _onDidRollback = this._register(new Emitter<IRollbackResult>());
	readonly onDidRollback: Event<IRollbackResult> = this._onDidRollback.event;

	// ─── Constructor (DI-injected dependencies) ────────────────────────────────

	constructor(
		@IExecutionGraphService private readonly graphService: IExecutionGraphService,
		@ITextFileService private readonly textFileService: ITextFileService,
		@IEditorService private readonly editorService: IEditorService,
		@IStorageService private readonly storageService: IStorageService,
		@ICommandService private readonly commandService: ICommandService,
		@ILogService private readonly logService: ILogService,
	) {
		super();
		this.logService.trace('[RollbackEngineService] Initialized');
	}

	// ─── Public API ────────────────────────────────────────────────────────────

	async rollbackNode(nodeId: string): Promise<IRollbackResult> {
		const node = this.graphService.getNode(nodeId);

		// Validate the node exists and is eligible for rollback
		if (!node) {
			const result: IRollbackResult = {
				success: false,
				nodeId,
				strategy: RollbackStrategy.Irreversible,
				filesRestored: [],
				error: `Node not found: ${nodeId}`,
			};
			this._onDidRollback.fire(result);
			return result;
		}

		if (!node.reversible) {
			const result: IRollbackResult = {
				success: false,
				nodeId,
				strategy: node.rollbackStrategy,
				filesRestored: [],
				error: `Node is not reversible: ${node.label}`,
			};
			this._onDidRollback.fire(result);
			return result;
		}

		if (node.rolledBack) {
			const result: IRollbackResult = {
				success: false,
				nodeId,
				strategy: node.rollbackStrategy,
				filesRestored: [],
				error: `Node already rolled back: ${node.label}`,
			};
			this._onDidRollback.fire(result);
			return result;
		}

		// Dispatch to the appropriate strategy handler
		let result: IRollbackResult;

		switch (node.rollbackStrategy) {
			case RollbackStrategy.InverseEdit:
				result = await this._executeInverseEdit(node);
				break;

			case RollbackStrategy.SnapshotRestore:
				result = await this._executeSnapshotRestore(node);
				break;

			case RollbackStrategy.EditorUndo:
				result = await this._executeEditorUndo(node);
				break;

			case RollbackStrategy.CustomUndo:
				result = await this._executeCustomUndo(node);
				break;

			case RollbackStrategy.Irreversible:
			default:
				this.logService.warn(`[RollbackEngineService] Node "${node.label}" (${nodeId}) is marked as irreversible and cannot be rolled back`);
				result = {
					success: false,
					nodeId,
					strategy: RollbackStrategy.Irreversible,
					filesRestored: [],
					error: 'Node is marked as irreversible — cannot be rolled back',
				};
				break;
		}

		// Mark the node as rolled back in the execution graph
		if (result.success) {
			this.graphService.markRolledBack(nodeId, 'rollback-engine');
			this.logService.info(`[RollbackEngineService] Successfully rolled back node "${node.label}" (${nodeId}) using ${node.rollbackStrategy}`);
		} else {
			this.logService.warn(`[RollbackEngineService] Failed to roll back node "${node.label}" (${nodeId}): ${result.error}`);
		}

		// Fire the rollback event
		this._onDidRollback.fire(result);
		return result;
	}

	async rollbackNodes(nodeIds: string[]): Promise<IRollbackResult[]> {
		const results: IRollbackResult[] = [];

		// Process nodes in reverse order to maintain causal consistency
		const reversedIds = [...nodeIds].reverse();

		for (const nodeId of reversedIds) {
			const result = await this.rollbackNode(nodeId);
			results.push(result);
		}

		return results;
	}

	async takeSnapshot(nodeId: string, fileUri: URI): Promise<void> {
		try {
			// Read the current content of the file
			const model = await this.textFileService.files.resolve(fileUri);
			if (!model || !model.textEditorModel) {
				this.logService.warn(`[RollbackEngineService] Cannot take snapshot: unable to resolve text model for ${fileUri.toString()}`);
				return;
			}

			const content = model.textEditorModel.getValue();
			const checksum = computeSimpleChecksum(content);
			const fileUriStr = fileUri.toString();

			const snapshot: IContentSnapshot = {
				nodeId,
				fileUri: fileUriStr,
				content,
				checksum,
				timestamp: Date.now(),
			};

			// Store in memory cache
			this._snapshots.set(nodeId, snapshot);

			// Persist to storage for durability across sessions
			this.storageService.store(
				snapshotKey(nodeId),
				JSON.stringify(snapshot),
				StorageScope.WORKSPACE,
				StorageTarget.MACHINE,
			);

			this.logService.trace(`[RollbackEngineService] Snapshot taken for node ${nodeId} (${fileUriStr}, ${content.length} chars, checksum: ${checksum})`);
		} catch (err) {
			this.logService.error(`[RollbackEngineService] Failed to take snapshot for node ${nodeId}: ${String(err)}`);
		}
	}

	registerCustomUndoHandler(nodeType: string, handler: (node: IExecutionNode) => Promise<boolean>): IDisposable {
		if (this._customUndoHandlers.has(nodeType)) {
			this.logService.warn(`[RollbackEngineService] Custom undo handler for node type "${nodeType}" is being replaced`);
		}

		const registration: ICustomUndoHandler = { nodeType, handler };
		this._customUndoHandlers.set(nodeType, registration);

		return toDisposable(() => {
			const existing = this._customUndoHandlers.get(nodeType);
			if (existing === registration) {
				this._customUndoHandlers.delete(nodeType);
			}
		});
	}

	getSnapshot(nodeId: string): IContentSnapshot | undefined {
		// Check in-memory cache first
		const cached = this._snapshots.get(nodeId);
		if (cached) {
			return cached;
		}

		// Fall back to storage
		const stored = this.storageService.get(snapshotKey(nodeId), StorageScope.WORKSPACE);
		if (stored) {
			try {
				const snapshot: IContentSnapshot = JSON.parse(stored);
				// Cache it for future fast access
				this._snapshots.set(nodeId, snapshot);
				return snapshot;
			} catch {
				this.logService.warn(`[RollbackEngineService] Failed to parse stored snapshot for node ${nodeId}`);
				return undefined;
			}
		}

		return undefined;
	}

	// ─── Strategy Implementations ──────────────────────────────────────────────

	/**
	 * InverseEdit strategy: Apply stored inverse edit operations.
	 * Each inverse operation specifies a range and the original text that
	 * should replace whatever is currently in that range.
	 */
	private async _executeInverseEdit(node: IExecutionNode): Promise<IRollbackResult> {
		const filesRestored: string[] = [];

		try {
			// Read the inverse operations from storage
			const stored = this.storageService.get(inverseOpsKey(node.id), StorageScope.WORKSPACE);
			if (!stored) {
				return {
					success: false,
					nodeId: node.id,
					strategy: RollbackStrategy.InverseEdit,
					filesRestored: [],
					error: 'No inverse operations found in storage for this node',
				};
			}

			const inverseOps: IInverseEditOperation[] = JSON.parse(stored);
			if (!Array.isArray(inverseOps) || inverseOps.length === 0) {
				return {
					success: false,
					nodeId: node.id,
					strategy: RollbackStrategy.InverseEdit,
					filesRestored: [],
					error: 'Inverse operations array is empty or malformed',
				};
			}

			// Apply each inverse edit operation
			for (const op of inverseOps) {
				try {
					const fileUri = URI.parse(op.uri);
					const model = await this.textFileService.files.resolve(fileUri);
					if (!model || !model.textEditorModel) {
						this.logService.warn(`[RollbackEngineService] Cannot resolve text model for inverse edit: ${op.uri}`);
						continue;
					}

					model.textEditorModel.pushEditOperations(
						null,
						[{
							range: {
								startLineNumber: op.range.startLine,
								startColumn: op.range.startCol,
								endLineNumber: op.range.endLine,
								endColumn: op.range.endCol,
							},
							text: op.newText,
						}],
						() => null,
					);

					if (!filesRestored.includes(op.uri)) {
						filesRestored.push(op.uri);
					}
				} catch (editErr) {
					this.logService.error(`[RollbackEngineService] Failed to apply inverse edit for ${op.uri}: ${String(editErr)}`);
				}
			}

			return {
				success: true,
				nodeId: node.id,
				strategy: RollbackStrategy.InverseEdit,
				filesRestored,
			};
		} catch (err) {
			return {
				success: false,
				nodeId: node.id,
				strategy: RollbackStrategy.InverseEdit,
				filesRestored,
				error: `Inverse edit rollback failed: ${String(err)}`,
			};
		}
	}

	/**
	 * SnapshotRestore strategy: Restore the full file content from a previously
	 * stored snapshot. This overwrites the current file content entirely.
	 */
	private async _executeSnapshotRestore(node: IExecutionNode): Promise<IRollbackResult> {
		try {
			// Get the snapshot (checks memory cache then storage)
			const snapshot = this.getSnapshot(node.id);
			if (!snapshot) {
				return {
					success: false,
					nodeId: node.id,
					strategy: RollbackStrategy.SnapshotRestore,
					filesRestored: [],
					error: 'No snapshot found for this node',
				};
			}

			const fileUri = URI.parse(snapshot.fileUri);

			// Write the snapshot content back to the file
			const model = await this.textFileService.files.resolve(fileUri);
			if (!model || !model.textEditorModel) {
				return {
					success: false,
					nodeId: node.id,
					strategy: RollbackStrategy.SnapshotRestore,
					filesRestored: [],
					error: `Cannot resolve text model for ${snapshot.fileUri}`,
				};
			}

			// Apply the full content restore as a single edit operation
			const fullRange = model.textEditorModel.getFullModelRange();
			model.textEditorModel.pushEditOperations(
				null,
				[{
					range: fullRange,
					text: snapshot.content,
				}],
				() => null,
			);

			this.logService.info(`[RollbackEngineService] Restored snapshot for ${snapshot.fileUri} (${snapshot.content.length} chars, checksum: ${snapshot.checksum})`);

			return {
				success: true,
				nodeId: node.id,
				strategy: RollbackStrategy.SnapshotRestore,
				filesRestored: [snapshot.fileUri],
			};
		} catch (err) {
			return {
				success: false,
				nodeId: node.id,
				strategy: RollbackStrategy.SnapshotRestore,
				filesRestored: [],
				error: `Snapshot restore failed: ${String(err)}`,
			};
		}
	}

	/**
	 * EditorUndo strategy: Delegate to VS Code's built-in undo command.
	 * This relies on the editor's undo/redo stack which was populated when
	 * the original edit was applied via pushEditOperations.
	 */
	private async _executeEditorUndo(node: IExecutionNode): Promise<IRollbackResult> {
		const filesRestored: string[] = [];

		try {
			// If the node has a primary file URI, open it in the editor first
			if (node.fileUri) {
				try {
					await this.editorService.openEditor({
						resource: node.fileUri,
					});
				} catch (openErr) {
					this.logService.warn(`[RollbackEngineService] Could not open editor for ${node.fileUri.toString()}: ${String(openErr)}`);
				}

				filesRestored.push(node.fileUri.toString());
			}

			// Also open additional affected files
			for (const additionalUri of node.additionalFileUris) {
				if (!filesRestored.includes(additionalUri.toString())) {
					filesRestored.push(additionalUri.toString());
				}
			}

			// Execute the undo command
			await this.commandService.executeCommand('editor.action.undo');

			this.logService.info(`[RollbackEngineService] Executed editor undo for node ${node.id}`);

			return {
				success: true,
				nodeId: node.id,
				strategy: RollbackStrategy.EditorUndo,
				filesRestored,
			};
		} catch (err) {
			return {
				success: false,
				nodeId: node.id,
				strategy: RollbackStrategy.EditorUndo,
				filesRestored,
				error: `Editor undo failed: ${String(err)}`,
			};
		}
	}

	/**
	 * CustomUndo strategy: Dispatch to a registered custom undo handler.
	 * The handler is looked up by the node's type label.
	 */
	private async _executeCustomUndo(node: IExecutionNode): Promise<IRollbackResult> {
		try {
			// Look up handler by node type label
			const handler = this._customUndoHandlers.get(node.type);
			if (!handler) {
				return {
					success: false,
					nodeId: node.id,
					strategy: RollbackStrategy.CustomUndo,
					filesRestored: [],
					error: `No custom undo handler registered for node type: "${node.type}"`,
				};
			}

			const handlerResult = await handler.handler(node);

			const filesRestored: string[] = [];
			if (node.fileUri) {
				filesRestored.push(node.fileUri.toString());
			}
			for (const additionalUri of node.additionalFileUris) {
				if (!filesRestored.includes(additionalUri.toString())) {
					filesRestored.push(additionalUri.toString());
				}
			}

			if (handlerResult) {
				return {
					success: true,
					nodeId: node.id,
					strategy: RollbackStrategy.CustomUndo,
					filesRestored,
				};
			} else {
				return {
					success: false,
					nodeId: node.id,
					strategy: RollbackStrategy.CustomUndo,
					filesRestored: [],
					error: `Custom undo handler for type "${node.type}" returned false`,
				};
			}
		} catch (err) {
			return {
				success: false,
				nodeId: node.id,
				strategy: RollbackStrategy.CustomUndo,
				filesRestored: [],
				error: `Custom undo failed: ${String(err)}`,
			};
		}
	}

	// ─── Lifecycle ─────────────────────────────────────────────────────────────

	override dispose(): void {
		this._customUndoHandlers.clear();
		this._snapshots.clear();
		super.dispose();
	}
}
