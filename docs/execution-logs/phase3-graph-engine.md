# Phase 3 — Execution Log

**Date:** 2026-05-16
**Status:** COMPLETED

---

## TASK 1 — Graph Architecture Design

### ExecutionGraphService (Decoupled from AIExecutionService)

- Defined as `IExecutionGraphService` with `createDecorator<IExecutionGraphService>('executionGraphService')`
- Independent service — any part of VS Code can create nodes and edges
- 10 node types, 5 edge types, scope system for grouping

### Node Types
`FileEdit`, `WorkspaceEdit`, `Save`, `Formatter`, `Refactor`, `AiAction`, `SystemAction`, `TerminalExecution`, `CodeAction`, `Snippet`

### Edge Types
`CausedBy`, `Triggered`, `Parent`, `RollbackOf`, `DerivedFrom`

### Graph Guarantees
- Node identity: UUID, stable, never reused
- Edge identity: UUID, deduplication by (source, target, type)
- Temporal ordering: createdAt timestamp
- Cycle prevention: BFS validation before edge insertion
- Parent resolution: Active scope → auto Parent edge

---

## TASK 2 — Storage Engine Design

### Decision: Hybrid Memory/Persisted Model (JSONL)

**Justification by VS Code architecture compatibility:**
- VS Code uses `IFileService` for all file I/O — our persistence uses it too
- VS Code's global storage home (`environmentService.globalStorageHome`) is the standard location for extension/service data
- JSONL (JSON Lines) is append-only, human-readable, and doesn't require a database

**Justification by performance:**
- In-memory Map for O(1) node/edge lookups — no disk reads for queries
- Dirty tracking: only changed nodes/edges are written to disk
- Batched writes: 30-second flush interval prevents per-mutation disk I/O
- Index structures (file index, scope index, adjacency lists) for fast queries

**Justification by replay safety:**
- JSONL is line-delimited — each line is an independent JSON object
- Corruption in one line doesn't affect others
- Replay = read lines, parse, rebuild graph — simple and reliable

**Justification by corruption resistance:**
- Append-only: never overwrite existing data
- Each flush appends new lines to the JSONL files
- If a write fails mid-line, the partial line is discarded on next load
- No database lock contention or corruption scenarios

### Storage Layout
```
{globalStorageHome}/ai-execution-graph/
├── nodes.jsonl     # One JSON object per line
├── edges.jsonl     # One JSON object per line
└── scopes.jsonl    # One JSON object per line
```

---

## TASK 3 — Execution Node Pipeline

### Before (Phase 2)
```
mutation → execution history record (flat array)
```

### After (Phase 3)
```
mutation
  → graph node creation (pending state)
  → edge resolution (Parent, CausedBy)
  → persistence (dirty set, async batch)
  → mutation apply (with bypass token)
  → completion update (success/error, afterChecksum)
```

### Implementation

Every `requestFileEdit()` and `applyWorkspaceEdit()` now:
1. Calls `graphService.createNode()` BEFORE applying the edit
2. Creates CausedBy edge if `parentExecutionId` is set
3. Applies the edit (with bypass token for recursion safety)
4. Calls `graphService.completeNode()` with success/error result
5. Also records in legacy `_history` for backward compatibility

### Preserved Semantics
- **Batching**: `applyWorkspaceEdit()` uses `beginScope()`/`endScope()` to group child nodes
- **Cancellation**: CancellationToken still passed through to IBulkEditService
- **Undo safety**: `pushEditOperations()` still used (unchanged from Phase 2)

---

## TASK 4 — Causal Linking Engine

### Implementation

**Execution context propagation:**
- `_activeMutationContext` on AIExecutionService carries the current context
- All interception hooks (save, bulk edit) can read `activeMutationContext`
- Context includes `parentExecutionId` for explicit linking

**Active execution scope tracking:**
- `graphService.beginScope()` sets `_activeScopeId`
- All `createNode()` calls within an active scope auto-create Parent edge
- `graphService.endScope()` clears the active scope

**Parent node inheritance:**
- Nodes created within a scope inherit the scope's owner as parent
- `parentExecutionId` in `IAIMutationContext` creates CausedBy edge

**Async-safe execution lineage:**
- Context saved as `prevContext` before mutation, restored after
- Stack depth counter prevents infinite nesting
- Bypass tokens prevent recursive interception

---

## TASK 5 — Rollback Foundations

### Fields on IExecutionNode

| Field | Type | Purpose |
|-------|------|---------|
| `reversible` | `boolean` | Whether rollback is possible |
| `rollbackStrategy` | `RollbackStrategy` | How to rollback (InverseEdit, VSCodeUndo, etc.) |
| `snapshotReference` | `string \| undefined` | Ref to pre-operation content snapshot |
| `inverseOperationReference` | `string \| undefined` | Ref to computed inverse operations |
| `rolledBack` | `boolean` | Whether this node has been rolled back |
| `rolledBackBy` | `string \| undefined` | ID of the node that rolled this back |

### Rollback Strategy Assignment

| Node Type | Strategy | Rationale |
|-----------|----------|-----------|
| `file-edit` | `InverseEdit` | Inverse edits computed from diff |
| `workspace-edit` | `VSCodeUndo` | VS Code undo handles atomicity |
| `save` | `VSCodeUndo` | VS Code undo |
| `formatter` | `InverseEdit` | Inverse of format operations |
| `ai-action` | `InverseEdit` | AI edits have known inverses |
| `terminal-execution` | `Irreversible` | Cannot auto-reverse terminal commands |

### `markRolledBack(nodeId, rolledBackByNodeId)`
- Sets `rolledBack = true` and `rolledBackBy = rolledBackByNodeId`
- Creates `RollbackOf` edge from `rolledBackByNodeId` → `nodeId`
- `getRollbackChain(nodeId)` traverses the chain

---

## TASK 6 — Graph Query API

| Method | Returns | Complexity |
|--------|---------|------------|
| `getNode(id)` | `IExecutionNode \| undefined` | O(1) Map lookup |
| `getOutgoingEdges(nodeId)` | `IExecutionEdge[]` | O(E_out) adjacency lookup |
| `getIncomingEdges(nodeId)` | `IExecutionEdge[]` | O(E_in) adjacency lookup |
| `getChildren(nodeId)` | `IExecutionNode[]` | O(E_out) filtered by Parent |
| `getParents(nodeId)` | `IExecutionNode[]` | O(E_in) filtered by Parent |
| `getExecutionChain(nodeId)` | `IExecutionNode[]` | O(D) where D = DAG depth |
| `getRecentNodes(limit, filter?)` | `IExecutionNode[]` | O(N log N) sort + slice |
| `getNodesByFile(uri)` | `IExecutionNode[]` | O(K) where K = nodes for file |
| `getNodesByScope(scopeId)` | `IExecutionNode[]` | O(K) where K = nodes in scope |
| `getRollbackChain(nodeId)` | `IExecutionNode[]` | O(R) where R = rollback depth |

---

## TASK 7 — Graph Performance Safety

### Node Cache Strategy
- All nodes held in `Map<string, IExecutionNode>` (O(1) lookup)
- File index `Map<string, Set<string>>` for fast file-based queries
- Scope index `Map<string, Set<string>>` for fast scope-based queries
- Adjacency lists `Map<string, Set<string>>` for edge traversal

### Persistence Batching
- Dirty tracking: `_dirtyNodes` and `_dirtyEdges` Sets
- Flush timer: 30-second interval
- Only dirty items written to disk (append to JSONL)
- On dispose: final flush before shutdown

### Lazy Hydration
- On startup, graph loaded from JSONL files into memory
- Pruned nodes remain on disk and can be reloaded if needed
- File index rebuilt during load

### Graph Pruning Strategy
- Max memory nodes: 10,000
- Prune age: 24 hours (completed, non-pending, non-rolled-back nodes)
- Pruning triggers when node count exceeds MAX_MEMORY_NODES
- Prunes until 80% capacity (20% headroom)
- Pruned nodes remain on disk for future lazy hydration

### UI Thread Safety
- All graph mutations are synchronous but lightweight (Map operations)
- Persistence is async: `flush()` returns Promise, called on timer
- Node creation/completion: O(1) Map.set + O(1) Set.add
- Edge creation with cycle check: O(V) BFS, but V is bounded by recent nodes only
- No blocking I/O on the main thread during mutations

---

## TASK 8 — Real Integration Points

### Current Integrations

| Integration Point | What Creates Nodes | Edge Types |
|-------------------|-------------------|------------|
| `AIExecutionService.requestFileEdit()` | `FileEdit` node | `CausedBy` from parent |
| `AIExecutionService.applyWorkspaceEdit()` | `WorkspaceEdit` node + scope | `CausedBy` + `Parent` (auto via scope) |
| `AIExecutionService.requestTerminalExecution()` | `TerminalExecution` node | None |
| `AIFileMutationHook.participate()` | `Save` node | `Triggered` from active context |

### Future High-Value Integration Points

| Point | Node Type | Edge Type | Phase |
|-------|-----------|-----------|-------|
| `FormatOnSaveParticipant` | `Formatter` | `DerivedFrom` → Save node | Phase 4 |
| `CodeActionOnSaveParticipant` | `CodeAction` | `DerivedFrom` → Save node | Phase 4 |
| `IBulkEditService.apply()` (external) | `WorkspaceEdit` | `CausedBy` → trigger source | Phase 4 |
| `IWorkingCopyFileService` (create/delete/rename) | `SystemAction` | `CausedBy` → cause | Phase 4 |
| `ITerminalService` (when implemented) | `TerminalExecution` | `CausedBy` → AI action | Phase 5 |
| `IUndoRedoService` (undo/redo events) | `SystemAction` | `RollbackOf` → original node | Phase 5 |
