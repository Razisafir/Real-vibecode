# Phase 2 — Execution Log: Full Implementation

**Date:** 2026-05-16
**Status:** COMPLETED

---

## TASK 1 — Full File Mutation Trace

### Complete Mutation Lifecycle Table

| Stage | File | Function | Responsibility |
|-------|------|----------|----------------|
| Keystroke | `src/vs/editor/browser/controller/editContext/textArea/textAreaEditContextInput.ts:281` | `_onType.fire()` | Native input event |
| View routing | `src/vs/editor/browser/controller/editContext/textArea/textAreaEditContext.ts:309` | `_viewController.type()` | Routes to ViewController |
| Command dispatch | `src/vs/editor/browser/widget/codeEditor/codeEditorWidget.ts:1952` | `_commandService.executeCommand(Handler.Type)` | Command service routing |
| Internal type | `src/vs/editor/browser/widget/codeEditor/codeEditorWidget.ts:1187` | `_type(source, text)` | Fires will/did type events |
| ViewModel | `src/vs/editor/common/viewModel/viewModelImpl.ts:1212` | `_cursor.type()` | Delegates to Cursor |
| Cursor | `src/vs/editor/common/cursor/cursor.ts:556` | `type()` | Creates EditOperationResult |
| Type ops | `src/vs/editor/common/cursor/cursorTypeOperations.ts:165` | `typeWithInterceptors()` | Auto-close, indent, etc. |
| Edit result | `src/vs/editor/common/cursor/cursorTypeEditOperations.ts:500` | `SimpleCharacterTypeOperation.getEdits()` | ReplaceCommand creation |
| Execute | `src/vs/editor/common/cursor/cursor.ts:350` | `_executeEditOperation()` | Stack element + command execution |
| Command | `src/vs/editor/common/cursor/cursor.ts:783` | `CommandExecutor.executeCommands()` | Get edit ops from commands |
| **PUSH EDITS** | **`src/vs/editor/common/cursor/cursor.ts:810`** | **`model.pushEditOperations()`** | **Key chokepoint — undo-safe** |
| Edit stack | `src/vs/editor/common/model/editStack.ts:428` | `pushEditOperation()` | Undo registration + applyEdits |
| Apply | `src/vs/editor/common/model/textModel.ts:1490` | `applyEdits()` | Validate + _doApplyEdits |
| Buffer | `src/vs/editor/common/model/textModel.ts:1503` | `_doApplyEdits()` | Calls buffer.applyEdits |
| Piece tree | `src/vs/editor/common/model/pieceTreeTextBuffer/pieceTreeTextBuffer.ts:243` | `applyEdits()` | delete() + insert() on tree |

### Undo/Redo Ownership

| Component | File | Responsibility |
|-----------|------|----------------|
| `IUndoRedoService` | `src/vs/platform/undoRedo/common/undoRedo.ts` | Per-resource undo/redo stacks |
| `UndoRedoService` | `src/vs/platform/undoRedo/common/undoRedoService.ts` | Push/get/undo/redo elements |
| `EditStack` | `src/vs/editor/common/model/editStack.ts:384` | Per-model edit stack manager |
| `SingleModelEditStackElement` | `src/vs/editor/common/model/editStack.ts:149` | Single-file undo unit |
| `MultiModelEditStackElement` | `src/vs/editor/common/model/editStack.ts:243` | Multi-file undo unit |
| `pushStackElement()` | `src/vs/editor/common/model/editStack.ts:394` | Close undo group |
| `popStackElement()` | `src/vs/editor/common/model/editStack.ts:401` | Reopen undo group |

### Save Ownership

| Component | File | Responsibility |
|-----------|------|----------------|
| `TextFileEditorModel.save()` | `textFileEditorModel.ts:736` | Entry point for save |
| `TextFileEditorModel.doSave()` | `textFileEditorModel.ts:764` | Orchestrates save flow |
| `runSaveParticipants()` | `textFileEditorModel.ts:880` | Pre-save hooks |
| `textFileService.write()` | `textFileService.ts:266` | Encode + write to file service |
| `fileService.writeFile()` | `fileService.ts:381` | Actual disk write |

---

## TASK 2 — Authoritative Routing Design

### Mutation Source Tagging

Implemented `AIMutationSource` enum with 9 source types. Every mutation through the kernel carries an `IAIMutationContext` with:
- `source: AIMutationSource` — origin tag
- `executionId: string` — unique trace ID
- `parentExecutionId: string | undefined` — graph linkage
- `trusted: boolean` — trust level
- `bypassToken?: AIMutationBypassToken` — recursion safety

### Recursion Prevention

Three-layer defense:
1. **Bypass tokens**: Created before internal apply, checked by interception hooks, revoked after completion
2. **Active context tracking**: `_activeMutationContext` allows hooks to detect AI-initiated mutations
3. **Stack depth guard**: `_executionStackDepth` throws if > 10 (catches pathological cases)

### Trusted vs Untrusted Flow

- Trusted sources (User*, AIAgent, AIInternal, WorkspaceEdit, SaveParticipant, UndoRedo): Auto-allowed
- Untrusted sources (Extension, Unknown): RequireApproval (Phase 2 auto-approves with logging)

---

## TASK 3 — Real Edit Interception

### Chosen Interception Point: `IBulkEditService.apply()`

**Justification by mutation authority:**
- `IBulkEditService.apply()` is the single entry point for ALL programmatic workspace edits
- Refactors, renames, code actions, and AI edits all flow through it
- Wrapping at this level gives us authority over the highest-level edit pipeline

**Justification by stability:**
- `IBulkEditService` is a stable service interface with a single `apply()` method
- The interface has been stable across VS Code versions
- Delegating to the real implementation preserves all semantics

**Justification by compatibility:**
- We delegate to the real `BulkEditService` — no replacement, no forking
- All batching, preview, cancellation, undo grouping, and progress are preserved
- Extensions and existing features continue to work unchanged

### Why NOT other points:

| Point | Rejected Because |
|-------|-----------------|
| `TextModel._doApplyEdits()` | Too low-level, catches undo/redo internals, breaks Monaco |
| `PieceTreeTextBuffer.applyEdits()` | Deepest level, impossible to distinguish sources |
| `Cursor._executeEditOperation()` | Only keystroke edits, misses programmatic |
| `CodeEditorWidget.executeEdits()` | Only editor-visible, misses model-only edits |
| `TextModel.applyEdits()` | No undo support — bypasses undo stack |

---

## TASK 4 — Controlled Bulk Edit Pipeline

### Integration Architecture

```
WorkspaceEdit
  │
  ▼
AIExecutionService.applyWorkspaceEdit(edits, options)
  │
  ├── 1. Create IAIMutationContext with source tag
  ├── 2. Validate against DefaultMutationPolicy
  ├── 3. Create AIMutationBypassToken
  ├── 4. Record start in execution history
  │
  ▼
IBulkEditService.apply(edits, bulkOptions)
  │
  ├── Preview handler (if applicable)
  ├── UndoRedoGroup resolution
  ├── BulkEdit.perform()
  │     ├── _performTextEdits() → BulkTextEdits.apply()
  │     │     ├── ModelEditTask.apply() → model.pushEditOperations()
  │     │     └── EditorEditTask.apply() → editor.executeEdits()
  │     ├── _performFileEdits() → BulkFileEdits.apply()
  │     └── _performCellEdits() → BulkCellEdits.apply()
  │
  ▼
AIExecutionService records result + revokes bypass token
```

### Preserved Semantics

| Feature | How Preserved |
|---------|--------------|
| Multi-file edits | BulkEditService.perform() groups by type, applies in order |
| Preview behavior | IBulkEditOptions.showPreview passed through |
| Cancellation tokens | IBulkEditOptions.token passed through |
| Progress reporting | IBulkEditOptions.progress passed through |
| Undo grouping | IBulkEditOptions.undoRedoGroupId/source passed through |
| Auto-save | IBulkEditOptions.respectAutoSaveConfig passed through |

---

## TASK 5 — Execution History Upgrade

### Structured Record Fields

| Field | Type | Purpose |
|-------|------|---------|
| `id` | `string` | UUID — unique record identifier |
| `timestamp` | `number` | Date.now() — when the operation occurred |
| `mutationSource` | `AIMutationSource` | Origin tag (user, AI, extension, etc.) |
| `fileUri` | `URI` | Primary affected file |
| `editCount` | `number` | Number of individual edits |
| `beforeChecksum` | `string \| undefined` | FNV-1a hash of content before edit |
| `afterChecksum` | `string \| undefined` | FNV-1a hash of content after edit |
| `trusted` | `boolean` | Whether the source is trusted |
| `rolledBack` | `boolean` | Whether this execution was rolled back (mutable) |
| `parentExecutionId` | `string \| undefined` | Parent record ID for graph linkage |

### Graph Compatibility

- `parentExecutionId` links child mutations to their parent
- `rolledBack` field enables future graph traversal to skip rolled-back nodes
- `beforeChecksum`/`afterChecksum` enable future diff reconstruction
- `mutationSource` enables filtering by source in graph queries

---

## TASK 6 — Recursion Safety System

### Three-Layer Defense

1. **Bypass Tokens** (primary):
   - Created via `createBypassToken(executionId)` before each internal apply
   - Validated via `isBypassTokenValid(token)` by interception hooks
   - Revoked via `revokeBypassToken(token)` after apply completes
   - Stored in `_activeBypassTokens` Set (O(1) lookup)

2. **Active Context Tracking** (secondary):
   - `_activeMutationContext` set before apply, restored after
   - Accessible via `activeMutationContext` getter
   - Interception hooks check for presence of bypass token in context

3. **Stack Depth Guard** (tertiary):
   - `_executionStackDepth` incremented on each mutation
   - Throws if depth exceeds 10
   - Catches pathological cases where token system fails

### Recursion Safety Proof

See `/docs/architecture/recursion-safety.md` for the 5-case proof covering:
- Case 1: AI requests file edit → bypass token prevents loop ✓
- Case 2: AI applies workspace edit → bypass token prevents loop ✓
- Case 3: User types → no AI context, no loop possible ✓
- Case 4: Refactor workspace edit → no AI context, no loop possible ✓
- Case 5: Save participant modifies → no AI context, no loop possible ✓
