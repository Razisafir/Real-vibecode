# End-to-End Runtime Architecture

## Phase 5 — Real Vibecode AI-Native IDE

## System Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        REAL VIBECODE IDE                                │
│                                                                         │
│  ┌──────────┐    ┌──────────────────┐    ┌──────────────────────────┐  │
│  │  User     │───▶│  Editor /        │───▶│  AIExecutionService      │  │
│  │  Action   │    │  Command /       │    │  (Authoritative Gateway) │  │
│  │          │    │  File Action     │    │                          │  │
│  └──────────┘    └──────────────────┘    └────────────┬─────────────┘  │
│                                                       │                │
│                           ┌───────────────────────────┘                │
│                           │                                            │
│                           ▼                                            │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                    MUTATION PIPELINE                              │  │
│  │                                                                  │  │
│  │  Request ──▶ Policy ──▶ Graph Node ──▶ State ──▶ Editor Apply ──┤  │
│  │    │          Check      Creation       Update                    │  │
│  │    │           │            │             │                       │  │
│  │    ▼           ▼            ▼             ▼                       │  │
│  │  Observability (trace + pipeline inspector)                      │  │
│  └──────────────────────────┬───────────────────────────────────────┘  │
│                             │                                          │
│                             ▼                                          │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │              GRAPH COMPLETION + UI UPDATE                         │  │
│  │                                                                  │  │
│  │  Complete Node ──▶ End Scope ──▶ Record History ──▶ UI Refresh  │  │
│  │       │               │               │                │         │  │
│  │       ▼               ▼               ▼                ▼         │  │
│  │  Persistence      State Reset     Legacy Compat    Timeline +    │  │
│  │  (JSONL+WAL)      (Ready phase)                    Indicator    │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

## Runtime Loop: Step-by-Step

### 1. User Action
A user action (typing, paste, refactor, save, command) initiates the flow. The action is detected by the editor layer and routed to the appropriate handler.

### 2. Editor / Command / File Action
The workbench routes the action to either the standard VS Code pipeline or the AI Execution Kernel. AI-sourced mutations are routed through `IAIExecutionService`, while user-initiated actions are observed by the save participant and bulk edit interceptor.

### 3. AIExecutionService (Authoritative Gateway)
All controlled mutations enter through the AIExecutionService, which acts as the single authoritative gateway. The service:
- Validates mutations against the mutation policy
- Creates execution graph nodes for tracking
- Manages bypass tokens for recursion safety
- Delegates to the unified state service for execution context

### 4. ExecutionGraphService (Node Creation)
Each mutation creates a pending node in the execution graph DAG. The node captures:
- Type (file-edit, workspace-edit, save, formatter, AI action, etc.)
- Source (AI agent, user, system, extension)
- File URI and content checksums
- Rollback strategy metadata

### 5. Policy Validation
The DefaultMutationPolicy evaluates whether the mutation should proceed:
- Bypass tokens → Always allow (internal AI operations)
- Trusted AI sources → Allow
- Untrusted AI sources → Require approval
- User/System sources → Allow

### 6. Mutation Execution (VS Code Core)
The actual edit is applied using either:
- `pushEditOperations()` for single file edits (preserves undo stack)
- `IBulkEditService.apply()` for workspace edits (multi-file batching)

### 7. Graph Completion Update
After the edit succeeds or fails, the graph node is completed with:
- Success/failure status
- After-checksum for content verification
- Error message if applicable

### 8. UI Update (Editor + Sidebar + History)
The UI layer reacts to graph events:
- Timeline panel shows new entries grouped by scope
- AI action indicator updates to reflect current state
- Mutation preview becomes available for completed nodes

## Service Dependency Graph

```
IObservabilityService (leaf — no deps)
         │
         ▼
IExecutionGraphService (deps: LogService, EnvironmentService, FileService)
         │
         ▼
IAIUnifiedStateService (deps: LogService, ExecutionGraphService)
         │
         ▼
IAIExecutionService (deps: LogService, EditorService, TextFileService,
                     BulkEditService, ExecutionGraphService,
                     UnifiedStateService, ObservabilityService)
         │
         ▼
IAIExecutionUIService (deps: LogService, ExecutionGraphService,
                       UnifiedStateService, EditorService, TextFileService)
         │
         ▼
IWorkspaceBootstrapService (deps: LogService, UnifiedStateService,
                            ExecutionGraphService, ExecutionService)
```

## Key Invariants

1. **No mutation without a graph node**: Every mutation that passes through AIExecutionService creates a graph node before the edit is applied.

2. **No graph node without state tracking**: Every graph node creation is tracked by the unified state service.

3. **No state change without observability**: Every state transition and graph event generates a trace entry.

4. **No orphaned services**: All services are connected via events and the unified state service ensures no subsystem operates independently.

5. **Deterministic initialization**: The bootstrap sequence ensures services initialize in a fixed order with no race conditions.
