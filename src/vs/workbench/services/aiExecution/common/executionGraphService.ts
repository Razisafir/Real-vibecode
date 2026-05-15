/*---------------------------------------------------------------------------------------------
 *  AI Execution Kernel — Phase 3 Execution Graph Engine
 *  Real Vibecode — AI-Native IDE
 *
 *  IExecutionGraphService — Causal execution DAG service.
 *  Decoupled from AIExecutionService — the graph is an independent subsystem
 *  that any service can feed nodes into and query from.
 *--------------------------------------------------------------------------------------------*/

import { URI } from '../../../../base/common/uri.js';
import { Event } from '../../../../base/common/event.js';
import { IDisposable } from '../../../../base/common/lifecycle.js';
import { CancellationToken } from '../../../../base/common/cancellation.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { AIMutationSource } from './aiExecutionService.js';

export const IExecutionGraphService = createDecorator<IExecutionGraphService>('executionGraphService');

// ─── Node Types ────────────────────────────────────────────────────────────────

/**
 * Every meaningful operation in the workspace becomes a graph node of one of these types.
 * The type determines what metadata the node carries and how rollback will work.
 */
export const enum ExecutionNodeType {
        /** A single file edit operation */
        FileEdit = 'file-edit',
        /** A multi-file workspace edit (refactor, rename, etc.) */
        WorkspaceEdit = 'workspace-edit',
        /** A file save operation */
        Save = 'save',
        /** A formatter action (format on save, format document, etc.) */
        Formatter = 'formatter',
        /** A refactor action (rename, extract, inline, etc.) */
        Refactor = 'refactor',
        /** An AI-initiated action through the execution kernel */
        AiAction = 'ai-action',
        /** A system action (auto-save, file watcher change, etc.) */
        SystemAction = 'system-action',
        /** A terminal execution (future — stub for now) */
        TerminalExecution = 'terminal-execution',
        /** A code action (quick fix, refactor suggestion) */
        CodeAction = 'code-action',
        /** A snippet insertion */
        Snippet = 'snippet',
}

// ─── Edge Types ────────────────────────────────────────────────────────────────

/**
 * Edges define causal relationships between nodes in the execution DAG.
 * An edge from A → B means "A caused/triggered/is-parent-of B".
 */
export const enum ExecutionEdgeType {
        /** B was caused by A (direct causation) */
        CausedBy = 'caused-by',
        /** A triggered B (event-based causation) */
        Triggered = 'triggered',
        /** A is the parent aggregate of B (e.g., workspace-edit → file-edit) */
        Parent = 'parent',
        /** B is a rollback of A */
        RollbackOf = 'rollback-of',
        /** B was derived from A (e.g., formatter derived from save) */
        DerivedFrom = 'derived-from',
}

// ─── Rollback Strategy ─────────────────────────────────────────────────────────

/**
 * Strategy for how a node can be rolled back in the future.
 * Not implemented yet — these are metadata fields for deterministic rollback later.
 */
export const enum RollbackStrategy {
        /** This node cannot be rolled back */
        Irreversible = 'irreversible',
        /** Rollback by applying inverse edit operations */
        InverseEdit = 'inverse-edit',
        /** Rollback by restoring a full content snapshot */
        SnapshotRestore = 'snapshot-restore',
        /** Rollback by running a custom undo function */
        CustomUndo = 'custom-undo',
        /** Rollback by delegating to the editor's undo/redo system */
        EditorUndo = 'editor-undo',
}

// ─── Graph Node ────────────────────────────────────────────────────────────────

/**
 * A node in the execution DAG.
 * Every meaningful workspace operation becomes one of these.
 * Nodes are IMMUTABLE after creation (except for completion status fields).
 */
export interface IExecutionNode {
        // ─── Identity ──────────────────────────────────────────────
        /** Unique node ID (UUID) */
        readonly id: string;
        /** Node type */
        readonly type: ExecutionNodeType;
        /** Human-readable label */
        readonly label: string;

        // ─── Temporal ──────────────────────────────────────────────
        /** Timestamp when the node was created (before execution) */
        readonly createdAt: number;
        /** Timestamp when the node completed (after execution), undefined if pending */
        completedAt: number | undefined;

        // ─── Source ────────────────────────────────────────────────
        /** The mutation source that created this node */
        readonly mutationSource: AIMutationSource;
        /** Whether this came from a trusted source */
        readonly trusted: boolean;
        /** Optional description of what triggered this node */
        readonly description?: string;

        // ─── Target ────────────────────────────────────────────────
        /** Primary file URI affected by this operation */
        readonly fileUri: URI | undefined;
        /** Additional file URIs affected (for multi-file operations) */
        readonly additionalFileUris: readonly URI[];

        // ─── Execution Status ──────────────────────────────────────
        /** Whether the operation succeeded */
        success: boolean;
        /** Error message if the operation failed */
        error: string | undefined;
        /** Whether this node is still pending (not yet completed) */
        pending: boolean;

        // ─── Content Tracking ──────────────────────────────────────
        /** Content checksum before the operation */
        readonly beforeChecksum: string | undefined;
        /** Content checksum after the operation (set on completion) */
        afterChecksum: string | undefined;
        /** Number of individual edits in this operation */
        readonly editCount: number;

        // ─── Rollback Foundations ──────────────────────────────────
        /** Whether this node can be rolled back */
        readonly reversible: boolean;
        /** Strategy for rolling back this node */
        readonly rollbackStrategy: RollbackStrategy;
        /** Reference to a content snapshot taken before the operation */
        readonly snapshotReference: string | undefined;
        /** Reference to the inverse operation (for InverseEdit strategy) */
        readonly inverseOperationReference: string | undefined;
        /** Whether this node has been rolled back */
        rolledBack: boolean;
        /** ID of the node that rolled back this node, if any */
        rolledBackBy: string | undefined;

        // ─── Scope ─────────────────────────────────────────────────
        /** The execution scope this node belongs to */
        readonly scopeId: string | undefined;
}

// ─── Graph Edge ────────────────────────────────────────────────────────────────

/**
 * A directed edge in the execution DAG.
 * Represents a causal relationship from source node to target node.
 */
export interface IExecutionEdge {
        /** Unique edge ID (UUID) */
        readonly id: string;
        /** Source node ID (the cause/parent) */
        readonly sourceId: string;
        /** Target node ID (the effect/child) */
        readonly targetId: string;
        /** Edge type defining the causal relationship */
        readonly type: ExecutionEdgeType;
        /** Timestamp when this edge was created */
        readonly createdAt: number;
        /** Optional metadata about why this edge exists */
        readonly metadata?: Record<string, string>;
}

// ─── Execution Scope ───────────────────────────────────────────────────────────

/**
 * An execution scope groups related nodes together.
 * When a workspace edit contains multiple file edits, they all share a scope.
 * Scopes enable:
 *   - Parent resolution (scope owner is the parent)
 *   - Batch rollback (rollback entire scope)
 *   - AI planning trees (each plan is a scope)
 */
export interface IExecutionScope {
        /** Unique scope ID */
        readonly id: string;
        /** Human-readable label */
        readonly label: string;
        /** The node that owns this scope (the parent) */
        readonly ownerNodeId: string;
        /** Timestamp when scope was created */
        readonly createdAt: number;
        /** Whether the scope is still active (accepting new nodes) */
        active: boolean;
        /** The mutation source for this scope */
        readonly mutationSource: AIMutationSource;
}

// ─── Graph Guarantees ──────────────────────────────────────────────────────────

/**
 * The execution graph guarantees:
 *
 * 1. NODE IDENTITY: Each node has a UUID. No two nodes share an ID.
 *    Node IDs are stable — once created, they never change.
 *
 * 2. EDGE IDENTITY: Each edge has a UUID. Edges are unique by
 *    (sourceId, targetId, type) — no duplicate edges.
 *
 * 3. TEMPORAL ORDERING: Nodes are ordered by createdAt timestamp.
 *    Within the same millisecond, creation order is preserved via
 *    a monotonic sequence counter appended to the timestamp.
 *
 * 4. CYCLE PREVENTION: The graph is a DAG — no cycles are possible.
 *    Edge insertion validates that the target node is not an ancestor
 *    of the source node. If it were, adding the edge would create a cycle.
 *    Validation is O(V) via BFS from source to target.
 *
 * 5. PARENT RESOLUTION: When a node is created within an active scope,
 *    it automatically gets a Parent edge to the scope's owner node.
 *    If no scope is active, the node is a root node (no parent).
 *    Multiple Parent edges are possible (diamond patterns) but cycles
 *    are prevented by rule 4.
 */

// ─── Query Types ───────────────────────────────────────────────────────────────

/** Result of a graph query — always returns defensive copies */
export interface IExecutionGraphQueryResult {
        readonly nodes: IExecutionNode[];
        readonly edges: IExecutionEdge[];
}

/** Filter for graph queries */
export interface IExecutionNodeFilter {
        readonly type?: ExecutionNodeType;
        readonly mutationSource?: AIMutationSource;
        readonly fileUri?: URI;
        readonly scopeId?: string;
        readonly trusted?: boolean;
        readonly rolledBack?: boolean;
        readonly pending?: boolean;
        readonly createdAfter?: number;
        readonly createdBefore?: number;
}

// ─── Service Interface ─────────────────────────────────────────────────────────

/**
 * IExecutionGraphService — The Execution Graph Engine.
 *
 * A decoupled causal DAG that tracks ALL meaningful workspace operations.
 * Independent of AIExecutionService — any service can create nodes and edges.
 *
 * Phase 3 implements:
 *   - Node creation, completion, and persistence
 *   - Edge creation with cycle prevention
 *   - Execution scope management
 *   - Query API for lineage, chains, and file history
 *   - Async-safe writes with memory cache + periodic persistence
 *   - Rollback metadata (foundations for Phase 4)
 */
export interface IExecutionGraphService {
        readonly _serviceBrand: undefined;

        // ─── Node Operations ────────────────────────────────────────────────────

        /**
         * Create a new node in the execution graph.
         * The node starts in "pending" state. Call completeNode() when done.
         * If a scope is active, a Parent edge is automatically created.
         *
         * @param params Node creation parameters
         * @returns The created node
         */
        createNode(params: IExecutionNodeCreateParams): IExecutionNode;

        /**
         * Complete a pending node with the result of the operation.
         * Sets success, afterChecksum, completedAt, and clears pending flag.
         *
         * @param nodeId The node to complete
         * @param result The completion result
         */
        completeNode(nodeId: string, result: IExecutionNodeCompleteParams): void;

        /**
         * Mark a node as rolled back.
         *
         * @param nodeId The node that was rolled back
         * @param rolledBackByNodeId The node that performed the rollback
         */
        markRolledBack(nodeId: string, rolledBackByNodeId: string): void;

        // ─── Edge Operations ────────────────────────────────────────────────────

        /**
         * Create an edge between two nodes.
         * Validates against cycle creation before inserting.
         *
         * @param sourceId Source node (cause/parent)
         * @param targetId Target node (effect/child)
         * @param type Edge type
         * @param metadata Optional metadata
         * @returns The created edge, or undefined if it would create a cycle
         */
        createEdge(sourceId: string, targetId: string, type: ExecutionEdgeType, metadata?: Record<string, string>): IExecutionEdge | undefined;

        // ─── Scope Operations ───────────────────────────────────────────────────

        /**
         * Begin a new execution scope.
         * Nodes created while this scope is active will automatically
         * get a Parent edge to the scope's owner node.
         *
         * @param label Human-readable scope label
         * @param ownerNodeId The node that owns this scope
         * @param mutationSource The source for this scope
         * @returns The created scope
         */
        beginScope(label: string, ownerNodeId: string, mutationSource: AIMutationSource): IExecutionScope;

        /**
         * End an execution scope. New nodes will no longer be
         * automatically linked to this scope's owner.
         *
         * @param scopeId The scope to end
         */
        endScope(scopeId: string): void;

        /**
         * Get the currently active scope, if any.
         */
        readonly activeScope: IExecutionScope | undefined;

        // ─── Query API ──────────────────────────────────────────────────────────

        /** Get a single node by ID */
        getNode(id: string): IExecutionNode | undefined;

        /** Get all edges where the given node is the source (outgoing) */
        getOutgoingEdges(nodeId: string): IExecutionEdge[];

        /** Get all edges where the given node is the target (incoming) */
        getIncomingEdges(nodeId: string): IExecutionEdge[];

        /** Get direct children of a node (via Parent edges) */
        getChildren(nodeId: string): IExecutionNode[];

        /** Get direct parents of a node (via Parent edges) */
        getParents(nodeId: string): IExecutionNode[];

        /** Get the full causal chain from root to the given node */
        getExecutionChain(nodeId: string): IExecutionNode[];

        /** Get the N most recent nodes, optionally filtered */
        getRecentNodes(limit: number, filter?: IExecutionNodeFilter): IExecutionNode[];

        /** Get all nodes that affected a specific file */
        getNodesByFile(uri: URI): IExecutionNode[];

        /** Get all nodes in a scope */
        getNodesByScope(scopeId: string): IExecutionNode[];

        /** Get the rollback chain for a node (all rollbacks applied to it) */
        getRollbackChain(nodeId: string): IExecutionNode[];

        // ─── Events ─────────────────────────────────────────────────────────────

        /** Fired when a new node is created */
        readonly onDidCreateNode: Event<IExecutionNode>;

        /** Fired when a node is completed */
        readonly onDidCompleteNode: Event<IExecutionNode>;

        /** Fired when a new edge is created */
        readonly onDidCreateEdge: Event<IExecutionEdge>;

        // ─── Persistence ────────────────────────────────────────────────────────

        /**
         * Force a flush of the in-memory graph to persistent storage.
         * Normally this happens automatically on a timer.
         */
        flush(): Promise<void>;

        /**
         * Get total node count
         */
        readonly nodeCount: number;

        /**
         * Get total edge count
         */
        readonly edgeCount: number;
}

// ─── Node Creation Parameters ──────────────────────────────────────────────────

export interface IExecutionNodeCreateParams {
        readonly type: ExecutionNodeType;
        readonly label: string;
        readonly mutationSource: AIMutationSource;
        readonly trusted: boolean;
        readonly description?: string;
        readonly fileUri?: URI;
        readonly additionalFileUris?: URI[];
        readonly beforeChecksum?: string;
        readonly editCount?: number;
        readonly reversible?: boolean;
        readonly rollbackStrategy?: RollbackStrategy;
        readonly snapshotReference?: string;
        readonly inverseOperationReference?: string;
        readonly scopeId?: string;
}

export interface IExecutionNodeCompleteParams {
        readonly success: boolean;
        readonly error?: string;
        readonly afterChecksum?: string;
}
