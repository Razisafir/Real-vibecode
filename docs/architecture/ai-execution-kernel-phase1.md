# AI Execution Kernel — Architecture Document

**Phase:** 1 — Foundation Layer
**Date:** 2026-05-16
**Status:** Implemented

---

## Overview

The AI Execution Kernel is a service layer injected into VS Code's dependency injection container that provides a controlled, auditable pathway for AI agents to mutate the user's workspace. It sits between AI-driven request sources and VS Code's core services (editor, file system, terminal), enforcing auditability, permission checks (future), and atomicity.

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────┐
│                    AI Agent Layer                        │
│  (Chat participants, extensions, inline suggestions)     │
└──────────────────────┬──────────────────────────────────┘
                       │ Request mutations
                       ▼
┌─────────────────────────────────────────────────────────┐
│              IAIExecutionService                         │
│  ┌─────────────────────────────────────────────────┐    │
│  │  AIExecutionService                              │    │
│  │                                                   │    │
│  │  requestFileEdit()     → ITextFileService        │    │
│  │  requestTerminalExec() → [STUB] ITerminalService │    │
│  │  applyWorkspaceChange()→ ITextFileService        │    │
│  │  registerAction()      → Internal Map            │    │
│  │  getExecutionHistory() → Internal Array          │    │
│  │                                                   │    │
│  │  Dependencies:                                    │    │
│  │    @ILogService                                  │    │
│  │    @IEditorService                               │    │
│  │    @ITextFileService                             │    │
│  └─────────────────────────────────────────────────┘    │
└──────────────────────┬──────────────────────────────────┘
                       │ Observe mutations
                       ▼
┌─────────────────────────────────────────────────────────┐
│           AIFileMutationHook                             │
│  (ITextFileSaveParticipant, ordinal=-1000)               │
│                                                           │
│  Intercepts ALL file saves before disk write              │
│  Phase 1: Observe + log                                  │
│  Phase 2+: Approval gates, diff preview, policies         │
└─────────────────────────────────────────────────────────┘
```

---

## File Structure

```
src/vs/workbench/services/aiExecution/
├── common/
│   └── aiExecutionService.ts       # Interface + types + service identifier
└── browser/
    ├── aiExecutionService.ts       # Implementation class
    └── aiExecution.contribution.ts # DI registration + file mutation hook
```

---

## Dependency Injection Wiring

```
workbench.common.main.ts
  │ import './services/aiExecution/browser/aiExecution.contribution.js'
  ▼
aiExecution.contribution.ts
  │ registerSingleton(IAIExecutionService, AIExecutionService, InstantiationType.Delayed)
  │ registerWorkbenchContribution2(AI_FILE_MUTATION_HOOK_ID, AIFileMutationHook, WorkbenchPhase.AfterRestored)
  ▼
Workbench.initServices()
  │ getSingletonServiceDescriptors() → includes IAIExecutionService
  │ → ServiceCollection.set(IAIExecutionService, SyncDescriptor<AIExecutionService>)
  ▼
InstantiationService
  │ When first consumer requests @IAIExecutionService
  ▼
AIExecutionService instantiated with:
  @ILogService
  @IEditorService
  @ITextFileService
```

---

## Data Flow: File Edit Request

```
AI Agent
  │
  │ aiExecutionService.requestFileEdit({
  │   resource: URI.file('/path/to/file.ts'),
  │   rangeStartLineNumber: 10,
  │   rangeStartColumn: 1,
  │   rangeEndLineNumber: 15,
  │   rangeEndColumn: 1,
  │   newText: 'const x = 42;'
  │ })
  ▼
AIExecutionService.requestFileEdit()
  │
  │ 1. textFileService.files.resolve(resource) → ITextFileEditorModel
  │ 2. model.textEditorModel.applyEdits([{ range, text }])
  │ 3. _recordEntry({ type: 'fileEdit', success: true })
  │ 4. _onDidRecordExecution.fire(entry)
  ▼
Model is now dirty — user sees the change in the editor
  │
  │ (When user saves)
  ▼
AIFileMutationHook.participate()
  │ Phase 1: Observe and log — no blocking
  ▼
Save proceeds to disk normally
```

---

## Execution History Schema

Every mutation is recorded as:

```typescript
interface IAIExecutionHistoryEntry {
    id: string;              // UUID
    type: 'fileEdit' | 'terminalExecution' | 'workspaceChange' | 'action';
    resource?: URI;          // Affected file
    description: string;     // Human-readable description
    timestamp: number;       // Date.now()
    success: boolean;        // Whether the operation succeeded
    error?: string;          // Error message if failed
}
```

---

## Phase Roadmap

| Phase | Feature | Status |
|-------|---------|--------|
| **1** | Core service skeleton, DI injection, file edit support, execution history, save observer | ✅ Implemented |
| **2** | Terminal execution (requestTerminalExecution real implementation), approval gates | 🔲 Planned |
| **3** | Diff preview UI for AI-proposed changes, mutation policies | 🔲 Planned |
| **4** | Graph-based orchestration, action composition, dependency tracking | 🔲 Planned |
| **5** | External AI agent protocol, streaming execution, rollback chains | 🔲 Planned |
