# System Overview — Real Vibecode AI Execution Kernel

## Architecture Summary

Real Vibecode is a VS Code fork with a deeply integrated AI Execution Kernel spanning **16 phases** and **59 registered singleton services**. The system follows VS Code's dependency injection pattern with `createDecorator<T>()` for service identity and `registerSingleton()` for registration.

## Phase Architecture

### Layer 1: Execution Engine Core (Phases 1–8)

The foundational layer handles code mutation, execution tracking, context awareness, agent orchestration, and process management.

| Phase | Services | Core Responsibility |
|-------|----------|-------------------|
| Phase 1 | AIExecutionService | Kernel entry point — file edits, terminal execution, bypass tokens |
| Phase 2 | — | File mutation control layer (merged into Phase 1) |
| Phase 3 | ExecutionGraphService, AIUnifiedStateService | Causal DAG runtime, unified state propagation |
| Phase 5 | ObservabilityService, WorkspaceBootstrapService | Observability, bootstrap orchestration |
| Phase 6 | AIContextService, ContextPersistenceService, SymbolDependencyAnalyzer, AIContextUIService | Workspace intelligence, dependency analysis, context persistence |
| Phase 7 | AgentOrchestratorService, AgentUIService | Agent lifecycle, plan execution, approval gates |
| Phase 8 | AIProcessOrchestratorService, AIProcessUIService | Terminal process management, policy enforcement, resource quotas |

### Layer 2: Brain + Stabilization (Phases 9–11)

The intelligence layer coordinates all execution subsystems, stabilizes the runtime, and enables deterministic replay.

| Phase | Services | Core Responsibility |
|-------|----------|-------------------|
| Phase 9 | GlobalExecutionBrainService, BrainDashboardService | Intent system, event bus, decision engine, conflict resolution, health monitoring |
| Phase 10 | SystemStabilizationService | Load control, backpressure, throttling, quarantine, determinism verification, memory pressure |
| Phase 11 | ExecutionReplayService | Snapshot capture, timeline replay, simulation, diff/reconstruction, debug tracing |

### Layer 3: Visual Governance (Phases 12–15)

The visual layer enforces design consistency, UX transformation, adaptive workflows, and production-grade surfaces.

| Phase | Services | Core Responsibility |
|-------|----------|-------------------|
| Phase 12 | DesignSystemService | Design tokens, spacing, typography, elevation, color, motion, layout rules, audit |
| Phase 13 | AIPresenceService, EditorExperienceService, CognitiveLoadService, PremiumMicrointeractionService, AITransparencyService, PanelHierarchyService, AttentionOrchestratorService, PerceivedPerformanceService, UXConsistencyService, SignatureIdentityService | AI visual presence, editor focus, cognitive load, motion, transparency, hierarchy, attention, performance, consistency, identity |
| Phase 14 | ProgressiveDisclosureService, UserExperienceProfileService, AdaptiveInterfaceService, FeatureFatigueService, ContextualMinimalismService, FlowStateService, AutonomyTrustService, OnboardingExperienceService, ExpertModeService, AdaptiveExperienceValidationService | Progressive disclosure, user profiling, adaptation, fatigue, minimalism, flow, trust, onboarding, expert mode, validation |
| Phase 15 | WorkbenchShellService, SurfaceMaterialService, EditorDominanceService, AISurfaceExperienceService, ExecutionTimelineExperienceService, CinematicMotionService, ExperienceStateSurfaceService, VisualPolishService, ProductionUXValidationService, SignatureProductFeelService | Shell layout, materials, editor dominance, AI surfaces, timeline, motion, state surfaces, polish, validation, product feel |

### Layer 4: Human Workflow Intelligence (Phase 16)

The human-aware layer adapts the system to how humans actually work — respecting momentum, managing interruptions, maintaining continuity.

| Phase | Services | Core Responsibility |
|-------|----------|-------------------|
| Phase 16 | WorkflowMomentumService, InterruptionIntelligenceService, SessionContinuityService, CognitiveRecoveryService, WorkRhythmService, IntentPersistenceService, EmotionalFrictionService, WorkspaceMemoryService, HumanWorkflowValidationService, SignatureHumanExperienceModelService | Momentum, interruption intelligence, continuity, recovery, rhythm, intent, friction, workspace memory, validation, human experience model |

## Service Count by Phase

| Phase | Service Count | Key Pattern |
|-------|--------------|-------------|
| 1–5 | 6 | Core execution + observability |
| 6 | 4 | Context engine |
| 7 | 2 | Agent orchestration |
| 8 | 2 | Process orchestration |
| 9 | 2 | Global brain |
| 10 | 1 | Stabilization |
| 11 | 1 | Replay engine |
| 12 | 1 | Design system |
| 13 | 10 | UX transformation |
| 14 | 10 | Adaptive workflow |
| 15 | 10 | Production surface |
| 16 | 10 | Human workflow |
| **Total** | **59** | |

## DI Pattern

All services follow the VS Code DI pattern:

```typescript
// common/ — Interface definition
export const IMyService = createDecorator<IMyService>('myService');
export interface IMyService {
  readonly _serviceBrand: undefined;
  // methods...
}

// browser/ — Implementation
export class MyService extends Disposable implements IMyService {
  declare readonly _serviceBrand: undefined;
  constructor(@IDep dep: IDep) { super(); }
}

// contribution.ts — Registration
registerSingleton(IMyService, MyService, InstantiationType.Delayed);
```

## Key Architectural Decisions

1. **Delayed Instantiation**: All 59 services use `InstantiationType.Delayed` — they are not created until first accessed
2. **Layered Dependencies**: No circular dependencies exist; the dependency graph is a valid DAG
3. **Event-Driven Communication**: Services communicate via `Event<T>` (VS Code's Emitter pattern)
4. **Separation of Concerns**: `common/` defines interfaces, `browser/` implements them, `contribution.ts` wires them
5. **External Dependencies**: Only 7 VS Code platform services are used (ILogService, IEditorService, ITextFileService, IBulkEditService, IEnvironmentService, IFileService, IWorkspaceContextService)
