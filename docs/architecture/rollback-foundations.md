# Rollback Foundations

**Phase:** 3 — Execution Graph Engine
**Date:** 2026-05-16

---

## Rollback Strategy Types

| Strategy | ID | Description | Use Case |
|----------|----|-------------|----------|
| `Irreversible` | `irreversible` | Node cannot be rolled back | Terminal execution, system actions |
| `InverseEdit` | `inverse-edit` | Rollback by applying inverse edit operations | File edits, formatter actions |
| `SnapshotRestore` | `snapshot-restore` | Rollback by restoring a full content snapshot | Large multi-file changes |
| `CustomUndo` | `custom-undo` | Rollback by running a custom undo function | Complex operations |
| `VSCodeUndo` | `vscode-undo` | Rollback by delegating to VS Code's undo/redo | Workspace edits, refactors |

## Rollback Metadata Fields

Every `IExecutionNode` carries these rollback-related fields:

```typescript
interface IExecutionNode {
    // ─── Rollback Foundations ──────────────────────────────────────────
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
}
```

## Rollback Chain

When a node is rolled back, a `RollbackOf` edge connects the rollback node
to the original node. The `rolledBackBy` field on the original node points
to the rollback node. This creates a rollback chain:

```
Original Edit (node-A)
  ↑ RollbackOf
  │
Rollback Edit (node-B)  ← node-A.rolledBackBy = "node-B"
  ↑ RollbackOf
  │
Re-apply Edit (node-C)  ← node-B.rolledBackBy = "node-C"
```

The `getRollbackChain(nodeId)` query traverses this chain, enabling:
- **Timeline UI**: Show rollback history for any operation
- **AI reasoning**: Understand which operations were tried and reverted
- **Deterministic replay**: Replay operations excluding rolled-back ones

## Rollback Strategy by Node Type

| Node Type | Default Strategy | Rationale |
|-----------|-----------------|-----------|
| `file-edit` | `InverseEdit` | Single-file edits can be reversed by computing the inverse range/text |
| `workspace-edit` | `VSCodeUndo` | Multi-file edits go through VS Code undo which handles atomicity |
| `save` | `VSCodeUndo` | Saves can be undone via VS Code's built-in undo |
| `formatter` | `InverseEdit` | Format operations produce specific text changes that can be inverted |
| `refactor` | `VSCodeUndo` | Refactors register with VS Code's undo/redo system |
| `ai-action` | `InverseEdit` | AI actions typically produce file edits with known inverses |
| `system-action` | Varies | Depends on the specific system action |
| `terminal-execution` | `Irreversible` | Terminal commands cannot be automatically reversed |
| `code-action` | `VSCodeUndo` | Code actions register with VS Code's undo |
| `snippet` | `InverseEdit` | Snippet insertions can be reversed by deleting the inserted text |

## Deterministic Rollback Design (Future)

Phase 4 will implement actual rollback. The design principles:

1. **Deterministic**: Given a node ID, rollback always produces the same result
2. **Atomic**: Rolling back a parent node rolls back all children atomically
3. **Verified**: After rollback, checksum is compared to `beforeChecksum`
4. **Recorded**: Rollback creates a new node with `RollbackOf` edge
5. **Undoable**: Rollback itself can be rolled back (re-applied)

### Rollback Algorithm (Future)

```
rollback(nodeId):
  1. Validate node.reversible === true
  2. Validate node.rolledBack === false
  3. Get rollback strategy
  4. If InverseEdit:
     a. Compute inverse operations from node metadata
     b. Apply inverse operations
     c. Verify afterChecksum === node.beforeChecksum
  5. If VSCodeUndo:
     a. Call IUndoRedoService.undo() for the node's resource
     b. Verify afterChecksum === node.beforeChecksum
  6. If SnapshotRestore:
     a. Retrieve snapshot from snapshotReference
     b. Write snapshot content to file
     c. Verify afterChecksum === node.beforeChecksum
  7. Create rollback node
  8. Mark original node as rolledBack = true, rolledBackBy = rollbackNode.id
  9. Create RollbackOf edge from rollbackNode → originalNode
```

### Snapshot Reference

The `snapshotReference` field points to a stored content snapshot. In Phase 3,
this is a placeholder. Phase 4 will implement:

- Snapshots stored as separate files in global storage
- Referenced by node ID: `snapshots/{nodeId}.txt`
- Lazy creation: snapshots only created for `SnapshotRestore` strategy nodes
- Garbage collection: snapshots pruned when all referencing nodes are old

### Inverse Operation Reference

The `inverseOperationReference` field points to stored inverse operations.
Phase 4 will implement:

- Inverse operations computed from the diff between beforeChecksum and afterChecksum
- Stored as JSON: `inverses/{nodeId}.json`
- Contains: `[{ range, text }]` — the edit operations that reverse the original
- Computed lazily on first rollback request
