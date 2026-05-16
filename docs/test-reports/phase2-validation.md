# Phase 2 — Test Report: Validation Results

**Date:** 2026-05-16
**Method:** Static analysis + architectural reasoning against VS Code source

---

## Test Matrix

| Test Case | Scenario | Expected Behavior | Result | Evidence |
|-----------|----------|-------------------|--------|----------|
| T1 | Normal typing in editor | User keystroke → Cursor → pushEditOperations → model update. AI kernel not involved (no active context). | ✅ PASS | Keystroke path: `codeEditorWidget.ts:1187` → `cursor.ts:556` → `cursor.ts:810`. No AI kernel calls in this path. `AIFileMutationHook` only fires on SAVE, not on every edit. |
| T2 | Undo (Ctrl+Z) | Undo → `IUndoRedoService.undo()` → `TextModel._applyUndo()` → `_doApplyEdits()` with `isUndoing=true`. Does NOT go through `pushEditOperations`. AI kernel not involved. | ✅ PASS | `textModel.ts:1441` → `_applyUndoRedoEdits()` uses `_doApplyEdits()` directly, bypassing `pushEditOperations`. No AI kernel interception. |
| T3 | Redo (Ctrl+Y) | Redo → `IUndoRedoService.redo()` → `TextModel._applyRedo()` → `_doApplyEdits()` with `isRedoing=true`. AI kernel not involved. | ✅ PASS | `textModel.ts:1453` → same direct path as undo. |
| T4 | Multi-file workspace edit | `IBulkEditService.apply()` → `BulkEdit.perform()` → `BulkTextEdits.apply()` → `MultiModelEditStackElement` wraps per-model tasks. AI kernel's `applyWorkspaceEdit()` delegates to `BulkEditService.apply()`. | ✅ PASS | `bulkTextEdits.ts:317-331` creates `MultiModelEditStackElement` for multi-file. Our delegation preserves this flow. |
| T5 | Save (Ctrl+S) | Save → `doSave()` → `runSaveParticipants()` → `AIFileMutationHook.participate()` → observes, no blocking. Then `textFileService.write()`. | ✅ PASS | `AIFileMutationHook` ordinal=-1000 runs first, observes only. Save proceeds normally. |
| T6 | Format on save | Save → `AIFileMutationHook` (ordinal=-1000) → `FormatOnSaveParticipant` (ordinal varies) → model.pushEditOperations() → `AIFileMutationHook` NOT re-triggered (save participants don't nest). | ✅ PASS | Save participants run sequentially in `textFileSaveParticipant.ts:61`. Format modifies model but doesn't trigger another save. |
| T7 | AI requests file edit | `AIExecutionService.requestFileEdit()` → creates bypass token → `model.pushEditOperations()` → edit applied → save participant checks bypass token → skips interception → records history → revokes token. | ✅ PASS | Bypass token created at start, validated in hook, revoked in finally block. No infinite loop. |
| T8 | AI applies workspace edit | `AIExecutionService.applyWorkspaceEdit()` → creates bypass token → delegates to `bulkEditService.apply()` → BulkEditService processes normally → save participant checks bypass token → skips → records history → revokes token. | ✅ PASS | Delegation preserves all BulkEditService semantics. Bypass token prevents recursive interception. |
| T9 | Rename symbol (refactor) | Language service → `IBulkEditService.apply()` directly (not through AI kernel). AI kernel's `AIBulkEditInterceptor` is registered but Phase 2 does not intercept at service level. | ✅ PASS | Direct `IBulkEditService.apply()` calls bypass AI kernel routing. Phase 2 tracks but doesn't gate these. |
| T10 | Edit recursion depth guard | If somehow bypass tokens fail, `_executionStackDepth` > 10 throws error, preventing infinite loop. | ✅ PASS | Depth check in `requestFileEdit()` and `applyWorkspaceEdit()`. Error thrown before stack overflow. |

---

## Semantic Preservation Checks

| Semantic | Preserved? | How |
|----------|-----------|-----|
| Monaco undo/redo | ✅ | `requestFileEdit()` uses `pushEditOperations()` instead of Phase 1's `applyEdits()`. Undo stack is correctly populated. |
| Workspace edit batching | ✅ | `applyWorkspaceEdit()` delegates to `IBulkEditService.apply()` which groups edits by type and applies in sequence. |
| Preview behavior | ✅ | `IBulkEditOptions.showPreview` is passed through to the real BulkEditService. |
| Cancellation tokens | ✅ | `IBulkEditOptions.token` is passed through. |
| Progress reporting | ✅ | `IBulkEditOptions.progress` is passed through. |
| Undo grouping | ✅ | `IBulkEditOptions.undoRedoGroupId` and `undoRedoSource` are passed through. |
| Auto-save config | ✅ | `IBulkEditOptions.respectAutoSaveConfig` is passed through. |
| Edit versioning | ✅ | `BulkTextEdits._validateBeforePrepare()` and `_validateTasks()` still run in the real service. |

---

## Phase 1 → Phase 2 Regression Check

| Aspect | Phase 1 | Phase 2 | Regressed? |
|--------|---------|---------|-----------|
| File edit undo support | ❌ Used `applyEdits()` (no undo) | ✅ Uses `pushEditOperations()` (undo-safe) | IMPROVED |
| Mutation source tracking | ❌ No source tags | ✅ `AIMutationSource` enum with 9 types | IMPROVED |
| Recursion safety | ❌ None | ✅ Bypass tokens + stack depth guard | IMPROVED |
| Workspace edit integration | ❌ Manual loop over edits | ✅ Delegates to `IBulkEditService` | IMPROVED |
| Execution history | ❌ Flat log entries | ✅ Structured records with graph fields | IMPROVED |
| Bulk edit semantics | ❌ Lost batching/preview | ✅ All semantics preserved | IMPROVED |
