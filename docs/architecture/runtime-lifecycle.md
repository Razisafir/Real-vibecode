# Runtime Lifecycle — Real Vibecode AI Execution Kernel

## Boot Sequence

All 59 services use `InstantiationType.Delayed`, meaning they are NOT instantiated at registration time. They are created lazily when first accessed via the DI container.

### Phase 1: Service Registration (Workbench Startup)

During `workbench.common.main.ts` import, the `aiExecution.contribution.ts` side-effect runs, registering all 59 singletons with the VS Code instantiation service. No service instances are created at this point.

**Registration order (corrected):**

```
1.  IExecutionGraphService          ← leaf (no AI kernel deps)
2.  IAIUnifiedStateService           ← deps: #1
3.  IObservabilityService            ← deps: #1, #2
4.  IAIExecutionService              ← deps: #1, #2, #3
5.  IAIExecutionUIService            ← deps: #1, #2
6.  IWorkspaceBootstrapService       ← deps: #1, #2, #4
7.  ISymbolDependencyAnalyzer        ← leaf
8.  IAIContextService                ← deps: #1
9.  IContextPersistenceService       ← deps: #8
10. IAIContextUIService              ← deps: #8
11. IAgentOrchestratorService        ← deps: #4, #1, #8, #3, #2
12. IAgentUIService                  ← deps: #11, #1, #3, #8
13. IAIProcessOrchestratorService    ← deps: #4, #1, #3, #11
14. IAIProcessUIService              ← deps: #13
15. IGlobalExecutionBrainService     ← deps: #4, #1, #2, #3, #11, #13, #8
16. IBrainDashboardService           ← deps: #15, #11, #13, #1, #3, #8, #2
17. ISystemStabilizationService      ← deps: #15, #11, #13, #1, #8, #3, #2
18. IExecutionReplayService          ← deps: #15, #11, #13, #1, #8, #3, #2, #17, #4
19. IDesignSystemService             ← leaf
20-29. Phase 13 UX Services          ← all leaf except #28
28. IUXConsistencyService            ← deps: #22, #20, #25
30-39. Phase 14 Adaptive Services    ← all leaf except #39
39. IAdaptiveExperienceValidationService ← deps: #30, #31, #33, #35, #36, #38, #34
40-49. Phase 15 Production Services  ← all leaf
50-59. Phase 16 Human Services       ← all leaf
```

### Phase 2: Workbench Restoration (AfterRestored)

Three workbench contributions are registered at `WorkbenchPhase.AfterRestored`:

1. **AIFileMutationHook** — Intercepts file saves, creates execution graph nodes, notifies context engine
   - Dependencies: `@IAIExecutionService`, `@ITextFileService`, `@IExecutionGraphService`, `@IAIUnifiedStateService`, `@IObservabilityService`, `@IAIContextService`

2. **AIBulkEditInterceptor** — Intercepts bulk edits for AI execution tracking
   - Dependencies: `@IAIExecutionService`, `@IBulkEditService`, `@IExecutionGraphService`, `@IObservabilityService`

3. **AIBootstrapRunner** — Runs the kernel bootstrap sequence
   - Dependencies: `@IWorkspaceBootstrapService`, `@IAIUnifiedStateService`, `@ILogService`

### Phase 3: Bootstrap Execution

When `AIBootstrapRunner._runBootstrap()` fires:

1. `WorkspaceBootstrapService.runBootstrap()` executes the bootstrap sequence
2. This triggers lazy instantiation of `IAIUnifiedStateService` and `IAIExecutionService`
3. Which in turn triggers instantiation of their dependencies
4. The execution graph initializes, the state machine enters Ready phase
5. The AI kernel is now operational

### Phase 4: First User Action

On first file save or AI action:
- `AIFileMutationHook.participate()` fires
- Execution graph nodes are created
- Context engine is notified
- Observability traces begin

## Lazy Instantiation Chain

When `AIBootstrapRunner` accesses `IWorkspaceBootstrapService` for the first time:

```
IWorkspaceBootstrapService
  → IAIUnifiedStateService
    → IExecutionGraphService (created first)
  → IAIExecutionService
    → IObservabilityService (created)
    → IExecutionGraphService (already exists)
    → IAIUnifiedStateService (already exists)
```

## Service Disposal

All service classes extend `Disposable`. When the workbench shuts down:

1. `AIFileMutationHook.dispose()` removes save participants
2. `AIBulkEditInterceptor.dispose()` removes edit interceptors
3. `AIBootstrapRunner.dispose()` cleans up
4. All 59 singleton services are eligible for GC when their references are released

## Key Lifecycle Events

| Event | Trigger | Services Activated |
|-------|---------|-------------------|
| Workbench startup | Import contribution | None (delayed) |
| AfterRestored | WorkbenchPhase | AIBootstrapRunner, AIFileMutationHook, AIBulkEditInterceptor |
| Bootstrap complete | runBootstrap() | Core execution chain |
| First file save | participate() | AIExecutionService, ExecutionGraphService, AIContextService |
| AI action requested | requestFileEdit() | Full execution pipeline |
| Brain coordination | createIntent() | GlobalExecutionBrainService + all subsystems |
