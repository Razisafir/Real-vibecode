# Recursion Safety Design

**Phase:** 2 — Authoritative File Mutation Control
**Date:** 2026-05-16

---

## The Recursion Problem

When AIExecutionService applies an edit, it goes through VS Code's edit pipeline.
If we intercept ALL edits, the AI kernel's own edits would trigger interception,
which would trigger more edits, creating an infinite loop:

```
AIExecutionService.requestFileEdit()
  → model.pushEditOperations()
  → EditStack.pushEditOperation()
  → model.applyEdits()
  → INTERCEPTION FIRES
  → AIExecutionService.requestFileEdit() ← INFINITE LOOP!
```

## Solution: Bypass Token System

### Architecture

```
┌─────────────────────────────────────────────────┐
│  AIExecutionService                             │
│                                                 │
│  requestFileEdit(edit, context)                 │
│    │                                            │
│    ├── Create bypass token:                     │
│    │   token = createBypassToken(executionId)   │
│    │   → _activeBypassTokens.add(token.id)      │
│    │                                            │
│    ├── Set active mutation context:             │
│    │   _activeMutationContext = { ... bypassToken: token }
│    │                                            │
│    ├── Apply edit:                              │
│    │   model.pushEditOperations(...)            │
│    │                                            │
│    ├── [INTERCEPTION POINT]                     │
│    │   Checks: activeMutationContext?.bypassToken │
│    │   AND isBypassTokenValid(token) == true     │
│    │   → SKIP INTERCEPTION ←                    │
│    │                                            │
│    ├── Record execution in history              │
│    │                                            │
│    └── Revoke bypass token:                     │
│        revokeBypassToken(token)                 │
│        → _activeBypassTokens.delete(token.id)   │
└─────────────────────────────────────────────────┘
```

### Implementation Details

1. **Bypass Token Creation**: Each `requestFileEdit()` and `applyWorkspaceEdit()` call creates a unique `AIMutationBypassToken` with an auto-incrementing ID and the execution ID.

2. **Token Registration**: The token's ID is added to `_activeBypassTokens` Set, making it "valid".

3. **Context Propagation**: The bypass token is stored in `_activeMutationContext`, which is accessible via `activeMutationContext` getter.

4. **Interception Check**: The `AIFileMutationHook.participate()` checks:
   ```typescript
   const activeContext = this.aiExecutionService.activeMutationContext;
   if (activeContext?.bypassToken && this.aiExecutionService.isBypassTokenValid(activeContext.bypassToken)) {
       // Internal mutation — bypass interception
       return;
   }
   ```

5. **Token Revocation**: After the edit completes (success or failure), the bypass token is revoked by removing it from `_activeBypassTokens`.

### Stack Depth Guard

As a secondary safety measure, `_executionStackDepth` tracks nested mutation calls:

```typescript
this._executionStackDepth++;
if (this._executionStackDepth > 10) {
    throw new Error('Recursion depth exceeded. Possible infinite mutation loop.');
}
// ... apply edit ...
this._executionStackDepth--;
```

This catches pathological cases where bypass tokens fail to prevent recursion.

## Recursion Safety Proof

### Case 1: AI requests a file edit

```
AIExecutionService.requestFileEdit(edit, context)
  1. Creates bypassToken for executionId
  2. Sets _activeMutationContext with bypassToken
  3. Calls model.pushEditOperations()
     → Edit is applied to text model
     → Model fires change events
     → Save participant: AIFileMutationHook.participate()
       → Checks activeMutationContext.bypassToken
       → isBypassTokenValid() returns true
       → BYPASSES interception ✓
  4. Records execution in history
  5. Revokes bypassToken
  → No recursion ✓
```

### Case 2: AI applies workspace edit via IBulkEditService

```
AIExecutionService.applyWorkspaceEdit(edits, options)
  1. Creates bypassToken
  2. Sets _activeMutationContext
  3. Calls bulkEditService.apply(edits, bulkOptions)
     → BulkEditService.perform()
     → BulkTextEdits.apply()
     → model.pushEditOperations() or editor.executeEdits()
     → Save participant fires
       → Checks activeMutationContext.bypassToken
       → BYPASSES interception ✓
  4. Records execution
  5. Revokes bypassToken
  → No recursion ✓
```

### Case 3: User types in editor (no AI involvement)

```
User types character
  → CodeEditorWidget._type()
  → Cursor.type()
  → model.pushEditOperations()
  → Model fires change events
  → Save participant: AIFileMutationHook.participate()
    → Checks activeMutationContext → undefined
    → No bypass token present
    → Observes and records (Phase 2: no blocking)
  → No recursion risk ✓
```

### Case 4: Refactor triggers workspace edit (no AI involvement)

```
User invokes "Rename Symbol"
  → Language service returns WorkspaceEdit
  → IBulkEditService.apply() called directly (not through AIExecutionService)
  → BulkEditService processes normally
  → Save participant fires
    → activeMutationContext is undefined
    → Observes and records
  → No recursion risk ✓
```

### Case 5: Save participant modifies file (format on save)

```
User saves file
  → TextFileEditorModel.doSave()
  → runSaveParticipants()
    → FormatOnSaveParticipant (modifies model)
      → model.pushEditOperations()
      → This is a NEW edit, no activeMutationContext from AI
    → AIFileMutationHook
      → activeMutationContext is undefined
      → Observes user-initiated save
  → doSaveSequential() → textFileService.write()
  → No recursion risk ✓
```

## Token Lifecycle Diagram

```
createBypassToken(executionId)
  │
  │ Token ID added to _activeBypassTokens
  │
  ▼
isBypassTokenValid(token) === true
  │
  │ Edit applied through VS Code pipeline
  │ Interception hooks check token validity
  │
  ▼
revokeBypassToken(token)
  │
  │ Token ID removed from _activeBypassTokens
  │ Subsequent isBypassTokenValid() returns false
  │
  ▼
Token is GARBAGE COLLECTED
  (no references held after revocation)
```
