# Causal Linking Engine

**Phase:** 3 — Execution Graph Engine
**Date:** 2026-05-16

---

## Automatic Parent-Child Resolution

The causal linking engine automatically determines parent-child relationships
based on the execution context at the time of node creation.

### Resolution Rules

| Condition | Parent | Edge Type | Mechanism |
|-----------|--------|-----------|-----------|
| Node created within an active scope | Scope owner node | `Parent` | Auto via `beginScope()`/`endScope()` |
| `parentExecutionId` provided in context | Referenced node | `CausedBy` | Explicit in `IAIMutationContext` |
| Save triggered by AI mutation | AI mutation's execution node | `Triggered` | `AIFileMutationHook` checks `activeMutationContext` |
| Formatter runs during save | Save node | `DerivedFrom` | Future: Save participant creates Formatter node with edge |
| Rollback performed | Original node | `RollbackOf` | `markRolledBack()` creates edge |

### Execution Context Propagation

```
AIExecutionService.requestFileEdit()
  │
  ├── Creates IAIMutationContext with:
  │   - source: AIMutationSource.AIAgent
  │   - executionId: "uuid-1"
  │   - parentExecutionId: "uuid-0" (from caller)
  │
  ├── Sets _activeMutationContext = mutationCtx
  │   (visible to all interception hooks)
  │
  ├── Creates graph node with mutationCtx
  │
  └── Restores previous _activeMutationContext
```

### Active Execution Scope Tracking

```
AIExecutionService.applyWorkspaceEdit()
  │
  ├── Creates WorkspaceEdit graph node (parent)
  │
  ├── Calls graphService.beginScope(...)
  │   → _activeScopeId = scope.id
  │   → All subsequent createNode() calls auto-link to parent
  │
  ├── Delegates to bulkEditService.apply()
  │   → BulkTextEdits applies individual edits
  │   → (Future: each individual edit creates a child node)
  │
  ├── Calls graphService.endScope(scope.id)
  │   → _activeScopeId = undefined
  │   → New nodes no longer auto-link
  │
  └── Completes WorkspaceEdit node
```

### Lineage Examples

**Example 1: AI refactoring multiple files**

```
ai-action (AI agent request)
  └── CausedBy
      └── workspace-edit (refactor: rename symbol)
            ├── Parent → file-edit (rename in foo.ts)
            ├── Parent → file-edit (rename in bar.ts)
            └── Parent → file-edit (rename in baz.ts)
```

**Example 2: AI edit triggering format-on-save**

```
ai-action (AI agent request)
  └── CausedBy
      └── file-edit (AI edits foo.ts)
            └── Triggered
                └── save (auto-save after edit)
                      └── DerivedFrom
                          └── formatter (format on save)
```

**Example 3: Rollback chain**

```
ai-action (AI fix attempt #1)
  └── file-edit (incorrect edit)
        └── RollbackOf ← ai-action (AI fix attempt #2)
                            └── file-edit (correct edit)
```

### Async-Safe Execution Lineage

The execution context is managed via a stack-based approach:

1. **Before mutation**: Push current `activeMutationContext` onto implicit stack
2. **During mutation**: `activeMutationContext` points to the current mutation's context
3. **After mutation**: Pop the previous `activeMutationContext` from the stack

This ensures that nested mutations (e.g., a workspace edit that triggers file edits)
maintain correct parent-child relationships even in async scenarios.

```typescript
// In requestFileEdit():
const prevContext = this._activeMutationContext;
this._activeMutationContext = mutationCtx;
try {
    // ... apply edit ...
} finally {
    this._activeMutationContext = prevContext; // Restore previous context
}
```

### Parent Node Inheritance

When a child node is created, it inherits:
- `scopeId` from the active scope (if any)
- `trusted` flag from the parent's mutation context
- Causal edges from `parentExecutionId` (if provided)

The scope system ensures that even deeply nested operations maintain
correct lineage back to their root cause.
