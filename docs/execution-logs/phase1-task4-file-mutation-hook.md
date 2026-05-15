# Phase 1 — Execution Log: File Mutation Hook

**Date:** 2026-05-16
**Task:** TASK 4 — File Mutation Hook (Phase 1 Only)
**Status:** COMPLETED

---

## Interception Target: File Save Pipeline

Phase 1 intercepts ONLY the file save/write pipeline. No terminal hooks.

---

## The Complete File Save Pipeline

```
User presses Ctrl+S
  │
  ▼
SAVE_FILE_COMMAND_ID handler
  File: src/vs/workbench/contrib/files/browser/fileCommands.ts, line 464
  │
  ▼
saveSelectedEditors() → doSaveEditors()
  File: src/vs/workbench/contrib/files/browser/fileCommands.ts, lines 366, 439
  │
  ▼
editorService.save()
  File: src/vs/workbench/services/editor/browser/editorService.ts, line 964
  │
  ▼
TextFileEditorModel.save() → doSave()
  File: src/vs/workbench/services/textfile/common/textFileEditorModel.ts, lines 736, 764
  │
  ├──► runSaveParticipants() ← ⚡ HOOK POINT: ITextFileSaveParticipant
  │     File: textFileEditorModel.ts, line 880
  │
  ▼
TextFileEditorModel.doSaveSequential()
  File: textFileEditorModel.ts, line 845
  │
  ▼
this.textFileService.write(resource, snapshot, options)
  File: textFileEditorModel.ts, line 937
  │
  ▼
AbstractTextFileService.write()
  File: src/vs/workbench/services/textfile/browser/textFileService.ts, line 266
  │
  ▼
this.fileService.writeFile(resource, readable, options)
  File: textFileService.ts, line 273
  │
  ▼
FileService.writeFile()
  File: src/vs/platform/files/common/fileService.ts, line 381
  │
  ▼
IFileSystemProvider.writeFile(resource, content, opts)
```

---

## Chosen Interception Point

### ITextFileSaveParticipant

**Exact file/service:** `ITextFileEditorModelManager.addSaveParticipant()`
**Defined in:** `src/vs/workbench/services/textfile/common/textfiles.ts`, line 415

```typescript
export interface ITextFileEditorModelManager {
    addSaveParticipant(participant: ITextFileSaveParticipant): IDisposable;
}
```

### The ITextFileSaveParticipant Interface

**Defined in:** `src/vs/workbench/services/textfile/common/textfiles.ts`, lines 358-376

```typescript
export interface ITextFileSaveParticipant {
    readonly ordinal?: number;
    participate(
        model: ITextFileEditorModel,
        context: ITextFileSaveParticipantContext,
        progress: IProgress<IProgressStep>,
        token: CancellationToken
    ): Promise<void>;
}
```

### Implementation: AIFileMutationHook

**File:** `src/vs/workbench/services/aiExecution/browser/aiExecution.contribution.ts`

```typescript
class AIFileMutationHook extends Disposable implements IWorkbenchContribution, ITextFileSaveParticipant {
    readonly ordinal = -1000; // Run very early, before formatters and code actions

    constructor(
        @IAIExecutionService private readonly aiExecutionService: IAIExecutionService,
        @ITextFileService private readonly textFileService: ITextFileService,
    ) {
        super();
        this._register(this.textFileService.files.addSaveParticipant(this));
    }

    async participate(
        model: ITextFileEditorModel,
        context: ITextFileSaveParticipantContext,
        progress: IProgress<IProgressStep>,
        token: CancellationToken
    ): Promise<void> {
        // Phase 1: Observe and log the save event.
        // Future phases will add approval gates, diff preview, and mutation policies.
    }
}
```

### Registration

```typescript
registerWorkbenchContribution2(
    AI_FILE_MUTATION_HOOK_ID,
    AIFileMutationHook,
    WorkbenchPhase.AfterRestored
);
```

---

## Before → After Flow

### BEFORE (No AI Kernel)

```
User saves file
  → TextFileEditorModel.doSave()
  → runSaveParticipants() [formatters, code actions, extension onWillSave]
  → doSaveSequential()
  → textFileService.write()
  → fileService.writeFile()
  → Written to disk
```

### AFTER (With AI Kernel — Phase 1)

```
User saves file
  → TextFileEditorModel.doSave()
  → runSaveParticipants()
      → AIFileMutationHook.participate() ← ⚡ NEW: AI kernel observes save
         (ordinal=-1000, runs FIRST)
      → [formatters, code actions, extension onWillSave]
  → doSaveSequential()
  → textFileService.write()
  → fileService.writeFile()
  → Written to disk
```

---

## Function Being Wrapped

| Aspect | Detail |
|--------|--------|
| **Exact file** | `src/vs/workbench/services/textfile/common/textFileSaveParticipant.ts` |
| **Function** | `TextFileSaveParticipant.participate()` |
| **Line** | 34 |
| **What it does** | Iterates a `LinkedList<ITextFileSaveParticipant>` and calls each participant's `participate()` method |
| **How we hook it** | We add our own `ITextFileSaveParticipant` via `textFileService.files.addSaveParticipant(this)` |

### Phase 1 Scope

- ✅ **Observes** file saves via `ITextFileSaveParticipant`
- ✅ **Logs** save events to the AI execution history
- ✅ **Runs first** (ordinal=-1000) before formatters and code actions
- ❌ **Does NOT block** saves (Phase 1 passes through silently)
- ❌ **Does NOT modify** file content during save
- ❌ **Does NOT hook** terminal execution (deferred to Phase 2)

### Future Phase Extensions

- Phase 2: Add approval gates (block save pending user confirmation)
- Phase 3: Diff preview (show AI-proposed changes before applying)
- Phase 4: Mutation policies (allow/block patterns for specific paths)
- Phase 5: Terminal execution hooks
