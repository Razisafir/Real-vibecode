# Boot Sequence — Real Vibecode AI Execution Kernel

## Overview

The AI Execution Kernel boots lazily. Services are registered at workbench startup but not instantiated until first accessed. The bootstrap sequence is triggered by `AIBootstrapRunner` at `WorkbenchPhase.AfterRestored`.

## Detailed Boot Flow

### Step 1: Side-Effect Registration (~0ms)

When `workbench.common.main.ts` imports `aiExecution.contribution.ts`, all 59 `registerSingleton()` calls execute. This registers service factories with the VS Code instantiation service. No service instances are created.

**Timing:** Near-instant (no instantiation, just map insertions)

### Step 2: Workbench Contribution Registration (~0ms)

Three `registerWorkbenchContribution2()` calls register:

1. `AIFileMutationHook` — At `AfterRestored`
2. `AIBulkEditInterceptor` — At `AfterRestored`
3. `AIBootstrapRunner` — At `AfterRestored`

**Timing:** Near-instant (just registration, no instantiation)

### Step 3: AfterRestored Phase — Bootstrap Runner Fires

When the workbench reaches `AfterRestored`, `AIBootstrapRunner.constructor()` fires:

```
AIBootstrapRunner.constructor()
  → @IWorkspaceBootstrapService (LAZY INSTANTIATION BEGINS)
    → WorkspaceBootstrapService.constructor()
      → @IAIUnifiedStateService (creates UnifiedStateService)
        → AIUnifiedStateService.constructor()
          → @IExecutionGraphService (creates ExecutionGraphService)
            → ExecutionGraphService.constructor() ← FIRST SERVICE CREATED
              → @ILogService (VS Code platform — already exists)
              → @IEnvironmentService (VS Code platform — already exists)
              → @IFileService (VS Code platform — already exists)
            ExecutionGraphService ready ✅
          → @ILogService
          AIUnifiedStateService ready ✅
        → @IExecutionGraphService (already exists) ✅
        → @IAIExecutionService (creates AIExecutionService)
          → AIExecutionService.constructor()
            → @ILogService ✅
            → @IEditorService ✅
            → @ITextFileService ✅
            → @IBulkEditService ✅
            → @IExecutionGraphService ✅
            → @IAIUnifiedStateService ✅
            → @IObservabilityService (creates ObservabilityService)
              → @ILogService ✅
              → @IExecutionGraphService ✅
              → @IAIUnifiedStateService ✅
            ObservabilityService ready ✅
          AIExecutionService ready ✅
        → @ILogService ✅
      WorkspaceBootstrapService ready ✅
    → @IAIUnifiedStateService ✅
    → @ILogService ✅
  AIBootstrapRunner ready ✅
```

### Step 4: Bootstrap Execution

`AIBootstrapRunner._runBootstrap()` calls `bootstrapService.runBootstrap()`:

1. Unified state service initializes to `Idle` phase
2. Execution graph creates root scope
3. State transitions to `Ready`
4. Log: `[AIBootstrapRunner] Kernel ready in Xms`

### Step 5: File Mutation Hook Activation

`AIFileMutationHook.constructor()` fires:

```
AIFileMutationHook.constructor()
  → @IAIExecutionService (already exists) ✅
  → @ITextFileService ✅
  → @IExecutionGraphService (already exists) ✅
  → @IAIUnifiedStateService (already exists) ✅
  → @IObservabilityService (already exists) ✅
  → @IAIContextService (creates AIContextService)
    → @ILogService ✅
    → @IEditorService ✅
    → @IWorkspaceContextService ✅
    → @ITextFileService ✅
    → @IExecutionGraphService ✅
  AIContextService ready ✅
  AIFileMutationHook ready ✅
```

### Step 6: Idle Services

The remaining 48 services are NOT instantiated at boot. They will be created on first access:

- **Phase 7–8**: Agent/Process services created when first AI action is orchestrated
- **Phase 9**: Brain created when coordination is needed
- **Phase 10–11**: Stabilization/Replay created when brain activates
- **Phase 12–16**: All UI/Human services created only when their features are accessed

## Boot Timing Estimate

| Phase | Services Created | Estimated Time |
|-------|-----------------|---------------|
| Registration | 0 (factories only) | <1ms |
| Bootstrap Runner | 6 (core chain) | ~50-100ms |
| File Mutation Hook | +1 (context) | ~20ms |
| **Total boot** | **7 of 59** | **~70-120ms** |

The remaining 52 services are created on-demand as features are accessed.

## Failure Scenarios

| Scenario | Impact | Detection |
|----------|--------|-----------|
| IExecutionGraphService fails | Entire kernel fails to boot | BootstrapRunner catches error |
| IAIUnifiedStateService fails | No state management | Kernel enters degraded mode |
| IAIContextService fails | No context intelligence | File saves still tracked, no context |
| Any Phase 12–16 service fails | That feature unavailable | Other features unaffected |

## Boot Order Guarantee

The VS Code DI system guarantees that when a service is instantiated, all its dependencies are already available (either previously instantiated or instantiated on-demand). Since there are no circular dependencies and registration order now matches dependency order, boot is deterministic.
