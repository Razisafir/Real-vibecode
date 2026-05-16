# Interception Points — Phase 2

**Date:** 2026-05-16

---

## Mutation Lifecycle Table

| Stage | File | Function | Responsibility |
|-------|------|----------|----------------|
| 1. Keystroke | `src/vs/editor/browser/controller/editContext/textArea/textAreaEditContextInput.ts:281` | `_onType.fire()` | Native textarea input fires typed event |
| 2. View routing | `src/vs/editor/browser/controller/editContext/textArea/textAreaEditContext.ts:309` | `_viewController.type(text)` | Routes text to ViewController |
| 3. Command dispatch | `src/vs/editor/browser/widget/codeEditor/codeEditorWidget.ts:1952` | `this._commandService.executeCommand(Handler.Type)` | Routes through command service |
| 4. Internal type | `src/vs/editor/browser/widget/codeEditor/codeEditorWidget.ts:1187` | `_type(source, text)` | Fires onWillType/onDidType events |
| 5. ViewModel | `src/vs/editor/common/viewModel/viewModelImpl.ts:1212` | `this._cursor.type()` | Delegates to Cursor |
| 6. Cursor type | `src/vs/editor/common/cursor/cursor.ts:556` | `type()` | Creates EditOperationResult |
| 7. Type operations | `src/vs/editor/common/cursor/cursorTypeOperations.ts:165` | `TypeOperations.typeWithInterceptors()` | Tries interceptors (auto-close, etc.) |
| 8. Edit result | `src/vs/editor/common/cursor/cursorTypeEditOperations.ts:500` | `SimpleCharacterTypeOperation.getEdits()` | Creates ReplaceCommand |
| 9. Execute edit | `src/vs/editor/common/cursor/cursor.ts:350` | `_executeEditOperation()` | Pushes stack element + executes command |
| 10. Command executor | `src/vs/editor/common/cursor/cursor.ts:783` | `CommandExecutor.executeCommands()` | Gets edit operations from commands |
| **11. PUSH EDITS** | **`src/vs/editor/common/cursor/cursor.ts:810`** | **`model.pushEditOperations()`** | **Applies edits with undo support — KEY CHOKEPOINT** |
| 12. Edit stack | `src/vs/editor/common/model/editStack.ts:428` | `EditStack.pushEditOperation()` | Registers undo element + calls model.applyEdits |
| 13. Apply edits | `src/vs/editor/common/model/textModel.ts:1490` | `TextModel.applyEdits()` | Validates + calls _doApplyEdits |
| 14. Buffer mutation | `src/vs/editor/common/model/textModel.ts:1503` | `_doApplyEdits()` | Calls buffer.applyEdits |
| 15. Piece tree | `src/vs/editor/common/model/pieceTreeTextBuffer/pieceTreeTextBuffer.ts:243` | `PieceTreeTextBuffer.applyEdits()` | Mutates piece tree (delete + insert) |

## Bulk Edit Lifecycle

| Stage | File | Function | Responsibility |
|-------|------|----------|----------------|
| 1. Entry | `src/vs/workbench/contrib/bulkEdit/browser/bulkEditService.ts:199` | `BulkEditService.apply()` | Lifts edits, preview, undo group |
| 2. Dispatch | `src/vs/workbench/contrib/bulkEdit/browser/bulkEditService.ts:99` | `BulkEdit.perform()` | Groups edits by type |
| 3. Text dispatch | `src/vs/workbench/contrib/bulkEdit/browser/bulkEditService.ts:150` | `_performTextEdits()` | Creates BulkTextEdits |
| 4. Task creation | `src/vs/workbench/contrib/bulkEdit/browser/bulkTextEdits.ts:227` | `_createEditsTasks()` | Resolves models, creates Editor/Model tasks |
| 5. Undo setup | `src/vs/workbench/contrib/bulkEdit/browser/bulkTextEdits.ts:291` | `BulkTextEdits.apply()` | Creates Single/MultiModelEditStackElement |
| 6. Task apply | `src/vs/workbench/contrib/bulkEdit/browser/bulkTextEdits.ts:98` | `ModelEditTask.apply()` | **`model.pushEditOperations()`** |
| 7. Task apply | `src/vs/workbench/contrib/bulkEdit/browser/bulkTextEdits.ts:138` | `EditorEditTask.apply()` | **`editor.executeEdits()`** |

## Chosen Interception Architecture

### Primary Interception Point: `IBulkEditService.apply()`

**Why:**
1. **Mutation authority**: All programmatic workspace edits (refactors, renames, code actions, AI edits) flow through `IBulkEditService.apply()`. This is the single chokepoint for non-keystroke mutations.
2. **Stability**: IBulkEditService is a stable service interface with a single `apply()` method. Wrapping it is simple and low-risk.
3. **Compatibility**: Delegating to the real BulkEditService preserves all batching, preview, cancellation, undo grouping, and progress reporting semantics.

### Implementation Strategy: Delegation, Not Replacement

```
AIExecutionService.applyWorkspaceEdit()
  → Creates mutation context + bypass token
  → Records execution in history
  → Delegates to IBulkEditService.apply() (the real service)
  → Records result in history
  → Revokes bypass token
```

**NOT** intercepting at `TextModel._doApplyEdits()` or `PieceTreeTextBuffer.applyEdits()` because:
- Too low-level — would catch undo/redo internal operations, snippet expansions, etc.
- Would break Monaco undo/redo which uses `_doApplyEdits` directly
- Would require complex recursion guards for every internal VS Code operation

### Secondary Interception Point: `ITextFileSaveParticipant`

**Why:** Catches the save pipeline after edits have been applied but before disk write.
**Phase 2:** Observes and records. Checks for bypass tokens on AI-initiated saves.

### What We Do NOT Intercept (and Why)

| Point | Why Not |
|-------|---------|
| `TextModel._doApplyEdits()` | Too low-level, breaks undo/redo, massive recursion risk |
| `PieceTreeTextBuffer.applyEdits()` | Deepest level, all internal operations flow here, impossible to distinguish user vs system |
| `Cursor._executeEditOperation()` | Only catches keystroke edits, misses programmatic edits |
| `CodeEditorWidget.executeEdits()` | Only catches editor-visible edits, misses model-only edits |
