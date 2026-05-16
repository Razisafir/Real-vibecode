# Mutation Routing Architecture

**Phase:** 2 — Authoritative File Mutation Control
**Date:** 2026-05-16

---

## Routing Flow

```
Mutation Request (any source)
    │
    ▼
┌──────────────────────────────────────┐
│  AIExecutionService                  │
│  ┌──────────────────────────────┐    │
│  │ 1. Create MutationContext    │    │
│  │    - source tag              │    │
│  │    - executionId             │    │
│  │    - parentExecutionId       │    │
│  │    - trusted flag            │    │
│  │    - bypass token (if AI)    │    │
│  └──────────────────────────────┘    │
│               │                      │
│  ┌──────────────────────────────┐    │
│  │ 2. Policy Validation        │    │
│  │    - DefaultMutationPolicy   │    │
│  │    - Allow / Deny / Approval │    │
│  └──────────────────────────────┘    │
│               │ Allow                │
│  ┌──────────────────────────────┐    │
│  │ 3. Create Bypass Token      │    │
│  │    - Prevents recursive     │    │
│  │      interception           │    │
│  └──────────────────────────────┘    │
│               │                      │
│  ┌──────────────────────────────┐    │
│  │ 4. Execution Record         │    │
│  │    - beforeChecksum         │    │
│  │    - source tag             │    │
│  │    - parentExecutionId      │    │
│  └──────────────────────────────┘    │
│               │                      │
│  ┌──────────────────────────────┐    │
│  │ 5. Apply via VS Code API    │    │
│  │    - pushEditOperations()   │    │
│  │    - IBulkEditService       │    │
│  │    - Preserves undo stack   │    │
│  └──────────────────────────────┘    │
│               │                      │
│  ┌──────────────────────────────┐    │
│  │ 6. After Checksum + Record  │    │
│  │    - afterChecksum          │    │
│  │    - success/failure        │    │
│  │    - Revoke bypass token    │    │
│  └──────────────────────────────┘    │
└──────────────────────────────────────┘
    │
    ▼
VS Code Text Model (with undo support)
```

## Mutation Source Tagging

| Source | Tag | Trusted | Description |
|--------|-----|---------|-------------|
| `AIMutationSource.UserTyping` | `userTyping` | Yes | User typed in the editor |
| `AIMutationSource.UserAction` | `userAction` | Yes | User paste, cut, etc. |
| `AIMutationSource.AIAgent` | `aiAgent` | Yes | AI agent through execution kernel |
| `AIMutationSource.WorkspaceEdit` | `workspaceEdit` | Yes | Refactor, rename, etc. |
| `AIMutationSource.SaveParticipant` | `saveParticipant` | Yes | Format on save, etc. |
| `AIMutationSource.Extension` | `extension` | No | Extension API |
| `AIMutationSource.UndoRedo` | `undoRedo` | Yes | Undo/redo operation |
| `AIMutationSource.AIInternal` | `aiInternal` | Yes | AI kernel internal apply |
| `AIMutationSource.Unknown` | `unknown` | No | Unknown source |

## Trusted vs Untrusted Flow

```
TRUSTED (source = AIAgent, AIInternal, User*, WorkspaceEdit, SaveParticipant, UndoRedo)
  → Policy: Auto-allow
  → Execution record: trusted = true
  → No approval gate

UNTRUSTED (source = Extension, Unknown)
  → Policy: RequireApproval (Phase 2 auto-approves with logging)
  → Execution record: trusted = false
  → Future: Show approval UI
```

## Routing Table

| Entry Point | Routes Through | Bypass Token |
|-------------|---------------|-------------|
| `AIExecutionService.requestFileEdit()` | → `TextModel.pushEditOperations()` | Yes |
| `AIExecutionService.applyWorkspaceEdit()` | → `IBulkEditService.apply()` | Yes |
| `AIExecutionService.applyWorkspaceChange()` | → `applyWorkspaceEdit()` → `IBulkEditService.apply()` | Yes |
| User Ctrl+S | → `ITextFileSaveParticipant` (AIFileMutationHook) | Checked |
| External `IBulkEditService.apply()` | → Direct (not yet intercepted at service level) | N/A |
