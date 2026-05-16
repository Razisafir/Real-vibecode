# Execution Graph Architecture

**Phase:** 3 — Execution Graph Engine
**Date:** 2026-05-16

---

## DAG Structure

The execution graph is a **Directed Acyclic Graph** (DAG) where:
- **Nodes** represent meaningful workspace operations
- **Edges** represent causal relationships between operations
- **Scopes** group related nodes under a common parent

```
                    ┌─────────────┐
                    │  AI Action  │  (root node)
                    │  ai-action  │
                    └──────┬──────┘
                           │ Parent
                    ┌──────▼──────┐
                    │  Workspace  │  (aggregate node)
                    │    Edit     │
                    └──────┬──────┘
                      ┌────┼────┐
                Parent│    │    │Parent
                      │    │    │
               ┌──────▼┐  │  ┌─▼────────┐
               │ File  │  │  │  File     │
               │ Edit A│  │  │  Edit B   │
               └───────┘  │  └──────────┘
                          │
                   ┌──────▼──────┐
                   │  Formatter  │  (derived from workspace edit)
                   │  formatter  │
                   └──────┬──────┘
                          │ Triggered
                   ┌──────▼──────┐
                   │    Save     │
                   │    save     │
                   └─────────────┘
```

## Node Types

| Type | ID | Description | Reversible | Rollback Strategy |
|------|----|-------------|-----------|-------------------|
| `file-edit` | `FileEdit` | Single file edit operation | Yes | `InverseEdit` |
| `workspace-edit` | `WorkspaceEdit` | Multi-file workspace edit | Yes | `VSCodeUndo` |
| `save` | `Save` | File save operation | Yes | `VSCodeUndo` |
| `formatter` | `Formatter` | Format on save / format document | Yes | `InverseEdit` |
| `refactor` | `Refactor` | Refactoring action (rename, extract) | Yes | `VSCodeUndo` |
| `ai-action` | `AiAction` | AI-initiated action | Yes | `InverseEdit` |
| `system-action` | `SystemAction` | System-triggered action | Varies | Varies |
| `terminal-execution` | `TerminalExecution` | Terminal command (stub) | No | `Irreversible` |
| `code-action` | `CodeAction` | Quick fix / code action | Yes | `VSCodeUndo` |
| `snippet` | `Snippet` | Snippet insertion | Yes | `InverseEdit` |

## Edge Types

| Type | Direction | Meaning |
|------|-----------|---------|
| `caused-by` | child → parent | Direct causation: the child was caused by the parent |
| `triggered` | trigger → effect | Event-based: the parent triggered the child |
| `parent` | parent → child | Aggregation: the parent contains the child |
| `rollback-of` | rollback → original | Reversal: the source rolled back the target |
| `derived-from` | derivative → source | Derivation: the child was derived from the parent |

## Graph Guarantees

| Guarantee | Implementation |
|-----------|---------------|
| **Node identity** | UUID per node. IDs are stable, never change, never reused. |
| **Edge identity** | UUID per edge. Deduplication by (sourceId, targetId, type). |
| **Temporal ordering** | `createdAt` timestamp. Within same ms, insertion order preserved. |
| **Cycle prevention** | BFS from source to target before edge insertion. If target is already ancestor of source, edge rejected. |
| **Parent resolution** | Active scope → auto-Parent edge. No scope → root node. Diamond patterns allowed (DAG, not tree). |

## Scope System

```
beginScope("Rename Symbol", workspaceEditNodeId, AIMutationSource.AIAgent)
  │
  │ ── All createNode() calls within this scope automatically get:
  │    Parent edge → workspaceEditNodeId
  │
  ├── createNode(FileEdit, /foo.ts) → auto Parent edge
  ├── createNode(FileEdit, /bar.ts) → auto Parent edge
  └── createNode(Formatter, /foo.ts) → auto Parent edge
  │
endScope(scopeId)
  │
  │ ── New nodes no longer linked to this scope
```

## Execution Pipeline (Phase 3)

```
Mutation Request
    │
    ▼
1. Create Graph Node (pending)
    │  - Assigns UUID
    │  - Sets createdAt
    │  - Links to active scope via Parent edge
    │
    ▼
2. Resolve Causal Edges
    │  - parentExecutionId → CausedBy edge
    │  - Active scope → Parent edge (auto)
    │
    ▼
3. Persist to Disk (batched, async)
    │  - Node added to dirty set
    │  - Flushed on timer (30s) or on demand
    │
    ▼
4. Apply Mutation (bypass token active)
    │  - pushEditOperations() or IBulkEditService
    │
    ▼
5. Complete Graph Node
    │  - Set success/error
    │  - Set afterChecksum
    │  - Set completedAt
    │  - Clear pending flag
    │
    ▼
6. Revoke Bypass Token
```
