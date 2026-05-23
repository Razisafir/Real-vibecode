/*---------------------------------------------------------------------------------------------
 *  Rollback Engine — Actual Undo/Restore Operations
 *  Real Vibecode — AI-Native IDE
 *
 *  IRollbackEngineService — Executes the actual rollback operations for execution graph nodes.
 *  Each strategy is handled differently:
 *    - InverseEdit: Computes inverse diff and applies it to restore original content
 *    - SnapshotRestore: Retrieves stored snapshot and writes it back to the file
 *    - EditorUndo: Delegates to VS Code's IUndoRedoService
 *    - CustomUndo: Dispatches to registered custom undo handlers
 *    - Irreversible: No-op, logs warning
 *--------------------------------------------------------------------------------------------*/

import { IDisposable } from '../../../../base/common/lifecycle.js';
import { URI } from '../../../../base/common/uri.js';
import { Event } from '../../../../base/common/event.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { RollbackStrategy, IExecutionNode } from './executionGraphService.js';

// ─── Result Types ──────────────────────────────────────────────────────────────

/** Result of a rollback operation */
export interface IRollbackResult {
	/** Whether the rollback succeeded */
	readonly success: boolean;
	/** The node that was rolled back */
	readonly nodeId: string;
	/** The strategy used for rollback */
	readonly strategy: RollbackStrategy;
	/** List of file URIs that were restored */
	readonly filesRestored: readonly string[];
	/** Error message if the rollback failed */
	readonly error?: string;
}

// ─── Custom Undo Handler ───────────────────────────────────────────────────────

/** A custom undo handler registration */
export interface ICustomUndoHandler {
	/** The node type this handler handles */
	readonly nodeType: string;
	/** The handler function — receives the node, returns true on success */
	readonly handler: (node: IExecutionNode) => Promise<boolean>;
}

// ─── Content Snapshot ──────────────────────────────────────────────────────────

/** Snapshot stored before an operation for SnapshotRestore strategy */
export interface IContentSnapshot {
	/** The execution graph node this snapshot belongs to */
	readonly nodeId: string;
	/** The file URI that was snapshotted */
	readonly fileUri: string;
	/** The full file content at the time of the snapshot */
	readonly content: string;
	/** Simple checksum for integrity verification */
	readonly checksum: string;
	/** Timestamp when the snapshot was taken */
	readonly timestamp: number;
}

// ─── Inverse Operation ─────────────────────────────────────────────────────────

/** A single inverse edit operation stored for InverseEdit strategy */
export interface IInverseEditOperation {
	/** URI of the file to apply the inverse edit to */
	readonly uri: string;
	/** Range in the file to replace (line/column based) */
	readonly range: {
		readonly startLine: number;
		readonly startCol: number;
		readonly endLine: number;
		readonly endCol: number;
	};
	/** The original text to restore (inverse of the new text that was applied) */
	readonly newText: string;
}

// ─── Service Interface ─────────────────────────────────────────────────────────

export const IRollbackEngineService = createDecorator<IRollbackEngineService>('rollbackEngineService');

/**
 * IRollbackEngineService — Executes the actual rollback operations for execution graph nodes.
 *
 * The Rollback Engine bridges the gap between the execution graph's rollback metadata
 * and the actual file/content restoration. When AgentOrchestratorService.rollbackPlan()
 * needs to undo operations, it delegates to this service which dispatches to the
 * appropriate strategy handler.
 *
 * Strategies:
 *   - InverseEdit: Reads stored inverse operations and applies them to restore
 *     original text at specific ranges.
 *   - SnapshotRestore: Reads a previously stored full-file snapshot and writes
 *     it back, restoring the file to its pre-operation state.
 *   - EditorUndo: Delegates to VS Code's built-in undo/redo system.
 *   - CustomUndo: Dispatches to application-registered handlers for specialized
 *     undo logic (e.g., terminal command rollback, external tool integration).
 *   - Irreversible: Cannot be undone — logs a warning and returns failure.
 */
export interface IRollbackEngineService {
	readonly _serviceBrand: undefined;

	/**
	 * Execute rollback for a single execution graph node.
	 * Dispatches to the appropriate strategy handler based on node.rollbackStrategy.
	 *
	 * @param nodeId The ID of the execution graph node to roll back
	 * @returns The result of the rollback operation
	 */
	rollbackNode(nodeId: string): Promise<IRollbackResult>;

	/**
	 * Execute rollback for multiple nodes in reverse order.
	 * Used by AgentOrchestratorService.rollbackPlan() to roll back an entire plan.
	 * Nodes are processed in reverse order to maintain causal consistency.
	 *
	 * @param nodeIds The IDs of the execution graph nodes to roll back
	 * @returns The results of each rollback operation, in execution order
	 */
	rollbackNodes(nodeIds: string[]): Promise<IRollbackResult[]>;

	/**
	 * Take a content snapshot before an operation.
	 * Call this BEFORE executing operations tagged with SnapshotRestore strategy.
	 * The snapshot stores the full file content so it can be restored on rollback.
	 *
	 * @param nodeId The execution graph node this snapshot is for
	 * @param fileUri The URI of the file to snapshot
	 */
	takeSnapshot(nodeId: string, fileUri: URI): Promise<void>;

	/**
	 * Register a custom undo handler for a specific node type.
	 * When a node with CustomUndo strategy is rolled back, the handler
	 * registered for its type will be invoked.
	 *
	 * @param nodeType The type label to match against execution nodes
	 * @param handler The function to call when rolling back matching nodes
	 * @returns A disposable that unregisters the handler when disposed
	 */
	registerCustomUndoHandler(nodeType: string, handler: (node: IExecutionNode) => Promise<boolean>): IDisposable;

	/**
	 * Get a stored snapshot for a node, if one exists.
	 *
	 * @param nodeId The execution graph node ID
	 * @returns The stored snapshot, or undefined if none exists
	 */
	getSnapshot(nodeId: string): IContentSnapshot | undefined;

	/**
	 * Event fired when a rollback operation completes.
	 * Listeners can use this to update UI, log metrics, or trigger follow-up actions.
	 */
	readonly onDidRollback: Event<IRollbackResult>;
}
