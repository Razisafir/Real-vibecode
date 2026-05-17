# Dependency Graph — Real Vibecode AI Execution Kernel

## Full Dependency Map

All 59 services and their internal dependency chains. External VS Code services (ILogService, IEditorService, etc.) are omitted for clarity.

### Tier 0 — Leaf Services (No Internal AI Kernel Dependencies)

These 41 services have no dependencies on other AI kernel services. They can be instantiated in any order.

| # | Service | Phase | Category |
|---|---------|-------|----------|
| 1 | IExecutionGraphService | 5 | Core |
| 2 | ISymbolDependencyAnalyzer | 6 | Context |
| 3 | IDesignSystemService | 12 | Design |
| 4 | IAIPresenceService | 13 | UX |
| 5 | IEditorExperienceService | 13 | UX |
| 6 | ICognitiveLoadService | 13 | UX |
| 7 | IPremiumMicrointeractionService | 13 | UX |
| 8 | IAITransparencyService | 13 | UX |
| 9 | IPanelHierarchyService | 13 | UX |
| 10 | IAttentionOrchestratorService | 13 | UX |
| 11 | IPerceivedPerformanceService | 13 | UX |
| 12 | ISignatureIdentityService | 13 | UX |
| 13 | IProgressiveDisclosureService | 14 | Adaptive |
| 14 | IUserExperienceProfileService | 14 | Adaptive |
| 15 | IAdaptiveInterfaceService | 14 | Adaptive |
| 16 | IFeatureFatigueService | 14 | Adaptive |
| 17 | IContextualMinimalismService | 14 | Adaptive |
| 18 | IFlowStateService | 14 | Adaptive |
| 19 | IAutonomyTrustService | 14 | Adaptive |
| 20 | IOnboardingExperienceService | 14 | Adaptive |
| 21 | IExpertModeService | 14 | Adaptive |
| 22 | IWorkbenchShellService | 15 | Production |
| 23 | ISurfaceMaterialService | 15 | Production |
| 24 | IEditorDominanceService | 15 | Production |
| 25 | IAISurfaceExperienceService | 15 | Production |
| 26 | IExecutionTimelineExperienceService | 15 | Production |
| 27 | ICinematicMotionService | 15 | Production |
| 28 | IExperienceStateSurfaceService | 15 | Production |
| 29 | IVisualPolishService | 15 | Production |
| 30 | IProductionUXValidationService | 15 | Production |
| 31 | ISignatureProductFeelService | 15 | Production |
| 32 | IWorkflowMomentumService | 16 | Human |
| 33 | IInterruptionIntelligenceService | 16 | Human |
| 34 | ISessionContinuityService | 16 | Human |
| 35 | ICognitiveRecoveryService | 16 | Human |
| 36 | IWorkRhythmService | 16 | Human |
| 37 | IIntentPersistenceService | 16 | Human |
| 38 | IEmotionalFrictionService | 16 | Human |
| 39 | IWorkspaceMemoryService | 16 | Human |
| 40 | IHumanWorkflowValidationService | 16 | Human |
| 41 | ISignatureHumanExperienceModelService | 16 | Human |

### Tier 1 — Single Dependency

| # | Service | Depends On |
|---|---------|-----------|
| 1 | IAIUnifiedStateService | IExecutionGraphService |
| 2 | IAIContextService | IExecutionGraphService |
| 3 | IContextPersistenceService | IAIContextService |
| 4 | IAIContextUIService | IAIContextService |
| 5 | IAIProcessUIService | IAIProcessOrchestratorService |

### Tier 2 — Multiple Dependencies

| # | Service | Depends On |
|---|---------|-----------|
| 1 | IObservabilityService | IExecutionGraphService, IAIUnifiedStateService |
| 2 | IAIExecutionUIService | IExecutionGraphService, IAIUnifiedStateService |
| 3 | IUXConsistencyService | ICognitiveLoadService, IAIPresenceService, IPanelHierarchyService |
| 4 | IAdaptiveExperienceValidationService | IProgressiveDisclosureService, IUserExperienceProfileService, IFeatureFatigueService, IFlowStateService, IAutonomyTrustService, IExpertModeService, IContextualMinimalismService |

### Tier 3 — Core Execution

| # | Service | Depends On |
|---|---------|-----------|
| 1 | IAIExecutionService | IExecutionGraphService, IAIUnifiedStateService, IObservabilityService |

### Tier 4 — Orchestration

| # | Service | Depends On |
|---|---------|-----------|
| 1 | IWorkspaceBootstrapService | IAIUnifiedStateService, IExecutionGraphService, IAIExecutionService |
| 2 | IAgentOrchestratorService | IAIExecutionService, IExecutionGraphService, IAIContextService, IObservabilityService, IAIUnifiedStateService |

### Tier 5 — Process + Agent UI

| # | Service | Depends On |
|---|---------|-----------|
| 1 | IAgentUIService | IAgentOrchestratorService, IExecutionGraphService, IObservabilityService, IAIContextService |
| 2 | IAIProcessOrchestratorService | IAIExecutionService, IExecutionGraphService, IObservabilityService, IAgentOrchestratorService |

### Tier 6 — Brain

| # | Service | Depends On |
|---|---------|-----------|
| 1 | IGlobalExecutionBrainService | IAIExecutionService, IExecutionGraphService, IAIUnifiedStateService, IObservabilityService, IAgentOrchestratorService, IAIProcessOrchestratorService, IAIContextService |

### Tier 7 — Stabilization + Dashboard

| # | Service | Depends On |
|---|---------|-----------|
| 1 | IBrainDashboardService | IGlobalExecutionBrainService, IAgentOrchestratorService, IAIProcessOrchestratorService, IExecutionGraphService, IObservabilityService, IAIContextService, IAIUnifiedStateService |
| 2 | ISystemStabilizationService | IGlobalExecutionBrainService, IAgentOrchestratorService, IAIProcessOrchestratorService, IExecutionGraphService, IAIContextService, IObservabilityService, IAIUnifiedStateService |

### Tier 8 — Replay (Deepest Dependency Chain)

| # | Service | Depends On |
|---|---------|-----------|
| 1 | IExecutionReplayService | IGlobalExecutionBrainService, IAgentOrchestratorService, IAIProcessOrchestratorService, IExecutionGraphService, IAIContextService, IObservabilityService, IAIUnifiedStateService, ISystemStabilizationService, IAIExecutionService |

## Dependency Depth Distribution

| Depth | Service Count | Description |
|-------|--------------|-------------|
| 0 | 41 | Leaf services — no internal deps |
| 1 | 5 | Single internal dep |
| 2 | 4 | Two+ internal deps |
| 3 | 1 | Core execution |
| 4 | 2 | Orchestration |
| 5 | 2 | Process + Agent UI |
| 6 | 1 | Brain |
| 7 | 2 | Stabilization + Dashboard |
| 8 | 1 | Replay (deepest) |

## Circular Dependency Analysis

**Result: NO CIRCULAR DEPENDENCIES DETECTED**

The full dependency graph forms a valid Directed Acyclic Graph (DAG). Kahn's algorithm successfully drains all 59 nodes with zero remainder.

## External Dependencies

| External Service | Used By Count |
|-----------------|---------------|
| ILogService | 31 services |
| IEditorService | 3 services |
| ITextFileService | 4 services |
| IBulkEditService | 1 service |
| IEnvironmentService | 2 services |
| IFileService | 2 services |
| IWorkspaceContextService | 1 service |
