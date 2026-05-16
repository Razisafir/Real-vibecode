/*---------------------------------------------------------------------------------------------
 *  AI Execution Kernel — Phase 19 Architectural Consolidation & Production Hardening
 *  Real Vibecode — AI-Native IDE
 *
 *  aiExecution.contribution.ts — Service registration + integration hooks.
 *  Phase 19: Adds Architectural Consolidation services (10 new singletons).
 *
 *  Full Registration Order:
 *    1. IExecutionGraphService (no AI kernel deps)
 *    2. IAIUnifiedStateService (deps: ExecutionGraphService)
 *    3. IObservabilityService (deps: ExecutionGraphService, UnifiedStateService)
 *    4. IAIExecutionService (deps: Graph, UnifiedState, Observability)
 *    5. IAIExecutionUIService
 *    6. IWorkspaceBootstrapService
 *    7. ISymbolDependencyAnalyzer (deps: TextFileService)
 *    8. IAIContextService (deps: EditorService, WorkspaceContext, TextFile, Graph)
 *    9. IContextPersistenceService (deps: ContextService, FileService)
 *    10. IAIContextUIService (deps: ContextService)
 *    11. IAgentOrchestratorService (deps: Execution, Graph, Context, Observability, State)
 *    12. IAgentUIService (deps: Orchestrator, Graph, Observability, Context)
 *    13. IAIProcessOrchestratorService (deps: Execution, Graph, Observability, AgentOrchestrator)
 *    14. IAIProcessUIService (deps: ProcessOrchestrator)
 *    15. IGlobalExecutionBrainService (deps: Execution, Graph, State, Observability, Agent, Process, Context)
 *    16. IBrainDashboardService (deps: Brain, Agent, Process, Graph, Observability, Context, State)
 *    17. ISystemStabilizationService (deps: Brain, Agent, Process, Graph, Context, Observability, State)
 *    18. IExecutionReplayService (deps: Brain, Agent, Process, Graph, Context, Observability, State, Stabilization, Execution)
 *    19. IDesignSystemService (no AI kernel deps — pure design governance)
 *    20. IAIPresenceService (no AI kernel deps — presence governance)
 *    21. IEditorExperienceService (no AI kernel deps — editor-first experience)
 *    22. ICognitiveLoadService (no AI kernel deps — cognitive load tracking)
 *    23. IPremiumMicrointeractionService (no AI kernel deps — motion system)
 *    24. IAITransparencyService (no AI kernel deps — AI explanation layer)
 *    25. IPanelHierarchyService (no AI kernel deps — visual hierarchy)
 *    26. IAttentionOrchestratorService (no AI kernel deps — attention management)
 *    27. IPerceivedPerformanceService (no AI kernel deps — perceived performance)
 *    28. ISignatureIdentityService (no AI kernel deps — product identity)
 *    29. IUXConsistencyService (deps: CognitiveLoad, AIPresence, PanelHierarchy)
 *    30. IProgressiveDisclosureService (no AI kernel deps)
 *    31. IUserExperienceProfileService (no AI kernel deps)
 *    32. IAdaptiveInterfaceService (no AI kernel deps)
 *    33. IFeatureFatigueService (no AI kernel deps)
 *    34. IContextualMinimalismService (no AI kernel deps)
 *    35. IFlowStateService (no AI kernel deps)
 *    36. IAutonomyTrustService (no AI kernel deps)
 *    37. IOnboardingExperienceService (no AI kernel deps)
 *    38. IExpertModeService (no AI kernel deps)
 *    39. IAdaptiveExperienceValidationService (deps: Disclosure, Profile, Fatigue, Flow, Trust, Expert, Minimalism)
 *    40. IWorkbenchShellService (no AI kernel deps — premium window framing)
 *    41. ISurfaceMaterialService (no AI kernel deps — layered materials)
 *    42. IEditorDominanceService (no AI kernel deps — editor visual hero)
 *    43. IAISurfaceExperienceService (no AI kernel deps — AI integrated surfaces)
 *    44. IExecutionTimelineExperienceService (no AI kernel deps — cinematic timeline)
 *    45. ICinematicMotionService (no AI kernel deps — choreographed motion)
 *    46. IExperienceStateSurfaceService (no AI kernel deps — premium state surfaces)
 *    47. IVisualPolishService (no AI kernel deps — typography & iconography)
 *    48. IProductionUXValidationService (no AI kernel deps — production quality)
 *    49. ISignatureProductFeelService (no AI kernel deps — emotional identity)
 *    50. IWorkflowMomentumService (no AI kernel deps — momentum tracking)
 *    51. IInterruptionIntelligenceService (no AI kernel deps — interruption management)
 *    52. ISessionContinuityService (no AI kernel deps — session persistence)
 *    53. ICognitiveRecoveryService (no AI kernel deps — fatigue recovery)
 *    54. IWorkRhythmService (no AI kernel deps — rhythm learning)
 *    55. IIntentPersistenceService (no AI kernel deps — intent tracking)
 *    56. IEmotionalFrictionService (no AI kernel deps — friction inference)
 *    57. IWorkspaceMemoryService (no AI kernel deps — workspace memory)
 *    58. IHumanWorkflowValidationService (no AI kernel deps — workflow validation)
 *    59. ISignatureHumanExperienceModelService (no AI kernel deps — human experience)
 *    60. ISystemCoherenceEngineService (no AI kernel deps — system coherence)
 *    61. ICrossLayerSignalBusService (no AI kernel deps — signal routing)
 *    62. ISystemIntentAlignmentService (no AI kernel deps — intent alignment)
 *    63. ILayerSynchronizationService (no AI kernel deps — layer sync)
 *    64. IGlobalEventNormalizationService (no AI kernel deps — event normalization)
 *    65. ISystemFeedbackLoopService (no AI kernel deps — feedback loop)
 *    66. ISystemContextMergerService (no AI kernel deps — context merging)
 *    67. ISystemConflictResolverService (no AI kernel deps — conflict resolution)
 *    68. IGlobalSystemHealthOrchestratorService (no AI kernel deps — health orchestration)
 *    69. ISystemConsciousnessModelService (no AI kernel deps — consciousness model)
 *    70. ISystemStressSimulationService (no AI kernel deps — stress simulation)
 *    71. ISystemDegradationModelService (no AI kernel deps — degradation model)
 *    72. ICrossLayerFailureInjectionService (no AI kernel deps — failure injection)
 *    73. ISystemSelfHealingValidationService (no AI kernel deps — self-healing validation)
 *    74. IRealWorldWorkflowSimulationService (no AI kernel deps — workflow simulation)
 *    75. ISystemStabilityScoringService (no AI kernel deps — stability scoring)
 *    76. IEventStormSimulationService (no AI kernel deps — event storm simulation)
 *    77. IMemoryConsistencyAuditService (no AI kernel deps — memory audit)
 *    78. ISystemBoundaryDiscoveryService (no AI kernel deps — boundary discovery)
 *    79. ISystemConsolidationService (no AI kernel deps — consolidation)
 *    80. IServiceConsolidationEngineService (no AI kernel deps -- service consolidation)
 *    81. IDependencyGraphSimplificationService (no AI kernel deps -- dependency simplification)
 *    82. IServiceBoundaryClarificationService (no AI kernel deps -- boundary clarification)
 *    83. ISystemModuleGroupingService (no AI kernel deps -- module grouping)
 *    84. IRedundancyEliminationService (no AI kernel deps -- redundancy elimination)
 *    85. ISimplifiedOrchestrationService (no AI kernel deps -- orchestration simplification)
 *    86. IPublicAPISimplificationService (no AI kernel deps -- API simplification)
 *    87. IComplexityMetricsService (no AI kernel deps -- complexity metrics)
 *    88. ISafeMigrationStrategyService (no AI kernel deps -- migration strategy)
 *    89. IFinalArchitectureModelService (no AI kernel deps -- final architecture model)
 *--------------------------------------------------------------------------------------------*/

import { Disposable } from '../../../../base/common/lifecycle.js';
import { ITextFileSaveParticipant, ITextFileEditorModel, ITextFileSaveParticipantContext } from '../../textfile/common/textfiles.js';
import { IProgress, IProgressStep } from '../../../../platform/progress/common/progress.js';
import { CancellationToken } from '../../../../base/common/cancellation.js';
import { IWorkbenchContribution } from '../../../common/contributions.js';
import { IAIExecutionService, AIMutationSource } from '../common/aiExecutionService.js';
import { AIExecutionService } from './aiExecutionService.js';
import { ITextFileService } from '../../textfile/common/textfiles.js';
import { InstantiationType, registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
import { registerWorkbenchContribution2, WorkbenchPhase } from '../../../common/contributions.js';
import { IBulkEditService } from '../../../../editor/browser/services/bulkEditService.js';
import { IExecutionGraphService } from '../common/executionGraphService.js';
import { ExecutionGraphService } from './executionGraphService.js';
import { ExecutionNodeType, ExecutionEdgeType } from '../common/executionGraphService.js';
import { IAIUnifiedStateService } from '../common/aiUnifiedStateService.js';
import { AIUnifiedStateService } from './aiUnifiedStateService.js';
import { IAIExecutionUIService } from '../common/aiExecutionUI.js';
import { AIExecutionUIService } from './aiExecutionUIService.js';
import { IWorkspaceBootstrapService } from '../common/workspaceBootstrap.js';
import { WorkspaceBootstrapService } from './workspaceBootstrap.js';
import { IObservabilityService } from '../common/observabilityService.js';
import { ObservabilityService } from './observabilityService.js';
import { ILogService } from '../../../../platform/log/common/log.js';

// Phase 6 imports
import { IAIContextService } from '../common/aiContextService.js';
import { AIContextService } from './aiContextService.js';
import { ISymbolDependencyAnalyzer } from '../common/symbolDependencyAnalyzer.js';
import { SymbolDependencyAnalyzer } from './symbolDependencyAnalyzer.js';
import { IContextPersistenceService } from '../common/contextPersistence.js';
import { ContextPersistenceService } from './contextPersistence.js';
import { IAIContextUIService } from '../common/aiContextUI.js';
import { AIContextUIService } from './aiContextUIService.js';

// Phase 7 imports
import { IAgentOrchestratorService } from '../common/agentOrchestratorService.js';
import { AgentOrchestratorService } from './agentOrchestratorService.js';
import { IAgentUIService } from '../common/agentUI.js';
import { AgentUIService } from './agentUIService.js';

// Phase 8 imports
import { IAIProcessOrchestratorService } from '../common/aiProcessOrchestratorService.js';
import { AIProcessOrchestratorService } from './aiProcessOrchestratorService.js';
import { IAIProcessUIService } from '../common/aiProcessUI.js';
import { AIProcessUIService } from './aiProcessUIService.js';

// Phase 9 imports
import { IGlobalExecutionBrainService } from '../common/globalExecutionBrain.js';
import { GlobalExecutionBrainService } from './globalExecutionBrain.js';
import { IBrainDashboardService } from '../common/globalExecutionBrain.js';
import { BrainDashboardService } from './brainDashboardService.js';

// Phase 10 imports
import { ISystemStabilizationService } from '../common/systemStabilization.js';
import { SystemStabilizationService } from './systemStabilizationService.js';

// Phase 11 imports
import { IExecutionReplayService } from '../common/replayEngine.js';
import { ReplayEngineService } from './replayEngineService.js';

// Phase 12 imports
import { IDesignSystemService } from '../common/designSystem.js';
import { DesignSystemService } from './designSystemService.js';

// Phase 13 imports
import { IAIPresenceService, IEditorExperienceService, ICognitiveLoadService, IPremiumMicrointeractionService, IAITransparencyService, IPanelHierarchyService, IAttentionOrchestratorService, IPerceivedPerformanceService, IUXConsistencyService, ISignatureIdentityService } from '../common/uxTransformation.js';
import { AIPresenceService, EditorExperienceService, CognitiveLoadService, PremiumMicrointeractionService, AITransparencyService, PanelHierarchyService, AttentionOrchestratorService, PerceivedPerformanceService, UXConsistencyService, SignatureIdentityService } from './uxTransformationService.js';

// Phase 14 imports
import { IProgressiveDisclosureService, IUserExperienceProfileService, IAdaptiveInterfaceService, IFeatureFatigueService, IContextualMinimalismService, IFlowStateService, IAutonomyTrustService, IOnboardingExperienceService, IExpertModeService, IAdaptiveExperienceValidationService } from '../common/adaptiveWorkflow.js';
import { ProgressiveDisclosureService, UserExperienceProfileService, AdaptiveInterfaceService, FeatureFatigueService, ContextualMinimalismService, FlowStateService, AutonomyTrustService, OnboardingExperienceService, ExpertModeService, AdaptiveExperienceValidationService } from './adaptiveWorkflowService.js';

// Phase 15 imports
import { IWorkbenchShellService, ISurfaceMaterialService, IEditorDominanceService, IAISurfaceExperienceService, IExecutionTimelineExperienceService, ICinematicMotionService, IExperienceStateSurfaceService, IVisualPolishService, IProductionUXValidationService, ISignatureProductFeelService } from '../common/productionSurface.js';
import { WorkbenchShellService, SurfaceMaterialService, EditorDominanceService, AISurfaceExperienceService, ExecutionTimelineExperienceService, CinematicMotionService, ExperienceStateSurfaceService, VisualPolishService, ProductionUXValidationService, SignatureProductFeelService } from './productionSurfaceService.js';

// Phase 16 imports
import { IWorkflowMomentumService, IInterruptionIntelligenceService, ISessionContinuityService, ICognitiveRecoveryService, IWorkRhythmService, IIntentPersistenceService, IEmotionalFrictionService, IWorkspaceMemoryService, IHumanWorkflowValidationService, ISignatureHumanExperienceModelService } from '../common/humanWorkflow.js';
import { WorkflowMomentumService, InterruptionIntelligenceService, SessionContinuityService, CognitiveRecoveryService, WorkRhythmService, IntentPersistenceService, EmotionalFrictionService, WorkspaceMemoryService, HumanWorkflowValidationService, SignatureHumanExperienceModelService } from './humanWorkflowService.js';

// Phase 17 imports
import { ISystemCoherenceEngineService, ICrossLayerSignalBusService, ISystemIntentAlignmentService, ILayerSynchronizationService, IGlobalEventNormalizationService, ISystemFeedbackLoopService, ISystemContextMergerService, ISystemConflictResolverService, IGlobalSystemHealthOrchestratorService, ISystemConsciousnessModelService } from '../common/systemCoherence.js';
import { SystemCoherenceEngineService, CrossLayerSignalBusService, SystemIntentAlignmentService, LayerSynchronizationService, GlobalEventNormalizationService, SystemFeedbackLoopService, SystemContextMergerService, SystemConflictResolverService, GlobalSystemHealthOrchestratorService, SystemConsciousnessModelService } from './systemCoherenceService.js';

// Phase 18 imports
import { ISystemStressSimulationService, ISystemDegradationModelService, ICrossLayerFailureInjectionService, ISystemSelfHealingValidationService, IRealWorldWorkflowSimulationService, ISystemStabilityScoringService, IEventStormSimulationService, IMemoryConsistencyAuditService, ISystemBoundaryDiscoveryService, ISystemConsolidationService } from '../common/systemStress.js';
import { SystemStressSimulationService, SystemDegradationModelService, CrossLayerFailureInjectionService, SystemSelfHealingValidationService, RealWorldWorkflowSimulationService, SystemStabilityScoringService, EventStormSimulationService, MemoryConsistencyAuditService, SystemBoundaryDiscoveryService, SystemConsolidationService } from './systemStressService.js';

// Phase 19 imports
import { IServiceConsolidationEngineService, IDependencyGraphSimplificationService, IServiceBoundaryClarificationService, ISystemModuleGroupingService, IRedundancyEliminationService, ISimplifiedOrchestrationService, IPublicAPISimplificationService, IComplexityMetricsService, ISafeMigrationStrategyService, IFinalArchitectureModelService } from '../common/systemConsolidation.js';
import { ServiceConsolidationEngineService, DependencyGraphSimplificationService, ServiceBoundaryClarificationService, SystemModuleGroupingService, RedundancyEliminationService, SimplifiedOrchestrationService, PublicAPISimplificationService, ComplexityMetricsService, SafeMigrationStrategyService, FinalArchitectureModelService } from './systemConsolidationService.js';

// ─── Singleton Registrations ───────────────────────────────────────────────────
//
// ORDER MATTERS: Services are registered in dependency order.
// A service can only depend on services registered BEFORE it.
//

// Phase 5.1: ExecutionGraphService (no AI kernel deps)
registerSingleton(IExecutionGraphService, ExecutionGraphService, InstantiationType.Delayed);

// Phase 5.2: UnifiedStateService (deps: ExecutionGraphService)
registerSingleton(IAIUnifiedStateService, AIUnifiedStateService, InstantiationType.Delayed);

// Phase 5.3: ObservabilityService (deps: ExecutionGraphService, UnifiedStateService)
registerSingleton(IObservabilityService, ObservabilityService, InstantiationType.Delayed);

// Phase 5.4: AIExecutionService (deps: Graph, UnifiedState, Observability)
registerSingleton(IAIExecutionService, AIExecutionService, InstantiationType.Delayed);

// Phase 5.5: AIExecutionUIService
registerSingleton(IAIExecutionUIService, AIExecutionUIService, InstantiationType.Delayed);

// Phase 5.6: WorkspaceBootstrapService
registerSingleton(IWorkspaceBootstrapService, WorkspaceBootstrapService, InstantiationType.Delayed);

// Phase 6.7: SymbolDependencyAnalyzer (deps: TextFileService)
registerSingleton(ISymbolDependencyAnalyzer, SymbolDependencyAnalyzer, InstantiationType.Delayed);

// Phase 6.8: AIContextService (deps: EditorService, WorkspaceContext, TextFile, Graph)
registerSingleton(IAIContextService, AIContextService, InstantiationType.Delayed);

// Phase 6.9: ContextPersistenceService (deps: ContextService, FileService)
registerSingleton(IContextPersistenceService, ContextPersistenceService, InstantiationType.Delayed);

// Phase 6.10: AIContextUIService (deps: ContextService)
registerSingleton(IAIContextUIService, AIContextUIService, InstantiationType.Delayed);

// Phase 7.11: AgentOrchestratorService (deps: Execution, Graph, Context, Observability, State)
registerSingleton(IAgentOrchestratorService, AgentOrchestratorService, InstantiationType.Delayed);

// Phase 7.12: AgentUIService (deps: Orchestrator, Graph, Observability, Context)
registerSingleton(IAgentUIService, AgentUIService, InstantiationType.Delayed);

// Phase 8.13: AIProcessOrchestratorService (deps: Execution, Graph, Observability, AgentOrchestrator)
registerSingleton(IAIProcessOrchestratorService, AIProcessOrchestratorService, InstantiationType.Delayed);

// Phase 8.14: AIProcessUIService (deps: ProcessOrchestrator)
registerSingleton(IAIProcessUIService, AIProcessUIService, InstantiationType.Delayed);

// Phase 9.15: GlobalExecutionBrainService (deps: Execution, Graph, State, Observability, Agent, Process, Context)
registerSingleton(IGlobalExecutionBrainService, GlobalExecutionBrainService, InstantiationType.Delayed);

// Phase 9.16: BrainDashboardService (deps: Brain, Agent, Process, Graph, Observability, Context, State)
registerSingleton(IBrainDashboardService, BrainDashboardService, InstantiationType.Delayed);

// Phase 10.17: SystemStabilizationService (deps: Brain, Agent, Process, Graph, Context, Observability, State)
registerSingleton(ISystemStabilizationService, SystemStabilizationService, InstantiationType.Delayed);

// Phase 11.18: ReplayEngineService (deps: Brain, Agent, Process, Graph, Context, Observability, State, Stabilization, Execution)
registerSingleton(IExecutionReplayService, ReplayEngineService, InstantiationType.Delayed);

// Phase 12.19: DesignSystemService (no AI kernel deps — pure design governance)
registerSingleton(IDesignSystemService, DesignSystemService, InstantiationType.Delayed);

// Phase 13.20: AIPresenceService (no AI kernel deps — presence governance)
registerSingleton(IAIPresenceService, AIPresenceService, InstantiationType.Delayed);

// Phase 13.21: EditorExperienceService (no AI kernel deps — editor-first experience)
registerSingleton(IEditorExperienceService, EditorExperienceService, InstantiationType.Delayed);

// Phase 13.22: CognitiveLoadService (no AI kernel deps — cognitive load tracking)
registerSingleton(ICognitiveLoadService, CognitiveLoadService, InstantiationType.Delayed);

// Phase 13.23: PremiumMicrointeractionService (no AI kernel deps — motion system)
registerSingleton(IPremiumMicrointeractionService, PremiumMicrointeractionService, InstantiationType.Delayed);

// Phase 13.24: AITransparencyService (no AI kernel deps — AI explanation layer)
registerSingleton(IAITransparencyService, AITransparencyService, InstantiationType.Delayed);

// Phase 13.25: PanelHierarchyService (no AI kernel deps — visual hierarchy)
registerSingleton(IPanelHierarchyService, PanelHierarchyService, InstantiationType.Delayed);

// Phase 13.26: AttentionOrchestratorService (no AI kernel deps — attention management)
registerSingleton(IAttentionOrchestratorService, AttentionOrchestratorService, InstantiationType.Delayed);

// Phase 13.27: PerceivedPerformanceService (no AI kernel deps — perceived performance)
registerSingleton(IPerceivedPerformanceService, PerceivedPerformanceService, InstantiationType.Delayed);

// Phase 13.28: SignatureIdentityService (no AI kernel deps — product identity)
registerSingleton(ISignatureIdentityService, SignatureIdentityService, InstantiationType.Delayed);

// Phase 13.29: UXConsistencyService (deps: CognitiveLoad, AIPresence, PanelHierarchy)
registerSingleton(IUXConsistencyService, UXConsistencyService, InstantiationType.Delayed);

// Phase 14.30: ProgressiveDisclosureService (no AI kernel deps)
registerSingleton(IProgressiveDisclosureService, ProgressiveDisclosureService, InstantiationType.Delayed);

// Phase 14.31: UserExperienceProfileService (no AI kernel deps)
registerSingleton(IUserExperienceProfileService, UserExperienceProfileService, InstantiationType.Delayed);

// Phase 14.32: AdaptiveInterfaceService (no AI kernel deps)
registerSingleton(IAdaptiveInterfaceService, AdaptiveInterfaceService, InstantiationType.Delayed);

// Phase 14.33: FeatureFatigueService (no AI kernel deps)
registerSingleton(IFeatureFatigueService, FeatureFatigueService, InstantiationType.Delayed);

// Phase 14.34: ContextualMinimalismService (no AI kernel deps)
registerSingleton(IContextualMinimalismService, ContextualMinimalismService, InstantiationType.Delayed);

// Phase 14.35: FlowStateService (no AI kernel deps)
registerSingleton(IFlowStateService, FlowStateService, InstantiationType.Delayed);

// Phase 14.36: AutonomyTrustService (no AI kernel deps)
registerSingleton(IAutonomyTrustService, AutonomyTrustService, InstantiationType.Delayed);

// Phase 14.37: OnboardingExperienceService (no AI kernel deps)
registerSingleton(IOnboardingExperienceService, OnboardingExperienceService, InstantiationType.Delayed);

// Phase 14.38: ExpertModeService (no AI kernel deps)
registerSingleton(IExpertModeService, ExpertModeService, InstantiationType.Delayed);

// Phase 14.39: AdaptiveExperienceValidationService (deps: Disclosure, Profile, Fatigue, Flow, Trust, Expert, Minimalism)
registerSingleton(IAdaptiveExperienceValidationService, AdaptiveExperienceValidationService, InstantiationType.Delayed);

// Phase 15.40: WorkbenchShellService (no AI kernel deps — premium window framing)
registerSingleton(IWorkbenchShellService, WorkbenchShellService, InstantiationType.Delayed);

// Phase 15.41: SurfaceMaterialService (no AI kernel deps — layered materials)
registerSingleton(ISurfaceMaterialService, SurfaceMaterialService, InstantiationType.Delayed);

// Phase 15.42: EditorDominanceService (no AI kernel deps — editor visual hero)
registerSingleton(IEditorDominanceService, EditorDominanceService, InstantiationType.Delayed);

// Phase 15.43: AISurfaceExperienceService (no AI kernel deps — AI integrated surfaces)
registerSingleton(IAISurfaceExperienceService, AISurfaceExperienceService, InstantiationType.Delayed);

// Phase 15.44: ExecutionTimelineExperienceService (no AI kernel deps — cinematic timeline)
registerSingleton(IExecutionTimelineExperienceService, ExecutionTimelineExperienceService, InstantiationType.Delayed);

// Phase 15.45: CinematicMotionService (no AI kernel deps — choreographed motion)
registerSingleton(ICinematicMotionService, CinematicMotionService, InstantiationType.Delayed);

// Phase 15.46: ExperienceStateSurfaceService (no AI kernel deps — premium state surfaces)
registerSingleton(IExperienceStateSurfaceService, ExperienceStateSurfaceService, InstantiationType.Delayed);

// Phase 15.47: VisualPolishService (no AI kernel deps — typography & iconography)
registerSingleton(IVisualPolishService, VisualPolishService, InstantiationType.Delayed);

// Phase 15.48: ProductionUXValidationService (no AI kernel deps — production quality)
registerSingleton(IProductionUXValidationService, ProductionUXValidationService, InstantiationType.Delayed);

// Phase 15.49: SignatureProductFeelService (no AI kernel deps — emotional identity)
registerSingleton(ISignatureProductFeelService, SignatureProductFeelService, InstantiationType.Delayed);

// Phase 16.50: WorkflowMomentumService (no AI kernel deps — momentum tracking)
registerSingleton(IWorkflowMomentumService, WorkflowMomentumService, InstantiationType.Delayed);

// Phase 16.51: InterruptionIntelligenceService (no AI kernel deps — interruption management)
registerSingleton(IInterruptionIntelligenceService, InterruptionIntelligenceService, InstantiationType.Delayed);

// Phase 16.52: SessionContinuityService (no AI kernel deps — session persistence)
registerSingleton(ISessionContinuityService, SessionContinuityService, InstantiationType.Delayed);

// Phase 16.53: CognitiveRecoveryService (no AI kernel deps — fatigue recovery)
registerSingleton(ICognitiveRecoveryService, CognitiveRecoveryService, InstantiationType.Delayed);

// Phase 16.54: WorkRhythmService (no AI kernel deps — rhythm learning)
registerSingleton(IWorkRhythmService, WorkRhythmService, InstantiationType.Delayed);

// Phase 16.55: IntentPersistenceService (no AI kernel deps — intent tracking)
registerSingleton(IIntentPersistenceService, IntentPersistenceService, InstantiationType.Delayed);

// Phase 16.56: EmotionalFrictionService (no AI kernel deps — friction inference)
registerSingleton(IEmotionalFrictionService, EmotionalFrictionService, InstantiationType.Delayed);

// Phase 16.57: WorkspaceMemoryService (no AI kernel deps — workspace memory)
registerSingleton(IWorkspaceMemoryService, WorkspaceMemoryService, InstantiationType.Delayed);

// Phase 16.58: HumanWorkflowValidationService (no AI kernel deps — workflow validation)
registerSingleton(IHumanWorkflowValidationService, HumanWorkflowValidationService, InstantiationType.Delayed);

// Phase 16.59: SignatureHumanExperienceModelService (no AI kernel deps — human experience)
registerSingleton(ISignatureHumanExperienceModelService, SignatureHumanExperienceModelService, InstantiationType.Delayed);

// Phase 17.60: SystemCoherenceEngineService (no AI kernel deps — system coherence)
registerSingleton(ISystemCoherenceEngineService, SystemCoherenceEngineService, InstantiationType.Delayed);

// Phase 17.61: CrossLayerSignalBusService (no AI kernel deps — signal routing)
registerSingleton(ICrossLayerSignalBusService, CrossLayerSignalBusService, InstantiationType.Delayed);

// Phase 17.62: SystemIntentAlignmentService (no AI kernel deps — intent alignment)
registerSingleton(ISystemIntentAlignmentService, SystemIntentAlignmentService, InstantiationType.Delayed);

// Phase 17.63: LayerSynchronizationService (no AI kernel deps — layer sync)
registerSingleton(ILayerSynchronizationService, LayerSynchronizationService, InstantiationType.Delayed);

// Phase 17.64: GlobalEventNormalizationService (no AI kernel deps — event normalization)
registerSingleton(IGlobalEventNormalizationService, GlobalEventNormalizationService, InstantiationType.Delayed);

// Phase 17.65: SystemFeedbackLoopService (no AI kernel deps — feedback loop)
registerSingleton(ISystemFeedbackLoopService, SystemFeedbackLoopService, InstantiationType.Delayed);

// Phase 17.66: SystemContextMergerService (no AI kernel deps — context merging)
registerSingleton(ISystemContextMergerService, SystemContextMergerService, InstantiationType.Delayed);

// Phase 17.67: SystemConflictResolverService (no AI kernel deps — conflict resolution)
registerSingleton(ISystemConflictResolverService, SystemConflictResolverService, InstantiationType.Delayed);

// Phase 17.68: GlobalSystemHealthOrchestratorService (no AI kernel deps — health orchestration)
registerSingleton(IGlobalSystemHealthOrchestratorService, GlobalSystemHealthOrchestratorService, InstantiationType.Delayed);

// Phase 17.69: SystemConsciousnessModelService (no AI kernel deps — consciousness model)
registerSingleton(ISystemConsciousnessModelService, SystemConsciousnessModelService, InstantiationType.Delayed);

// Phase 18.70: SystemStressSimulationService (no AI kernel deps — stress simulation)
registerSingleton(ISystemStressSimulationService, SystemStressSimulationService, InstantiationType.Delayed);

// Phase 18.71: SystemDegradationModelService (no AI kernel deps — degradation model)
registerSingleton(ISystemDegradationModelService, SystemDegradationModelService, InstantiationType.Delayed);

// Phase 18.72: CrossLayerFailureInjectionService (no AI kernel deps — failure injection)
registerSingleton(ICrossLayerFailureInjectionService, CrossLayerFailureInjectionService, InstantiationType.Delayed);

// Phase 18.73: SystemSelfHealingValidationService (no AI kernel deps — self-healing validation)
registerSingleton(ISystemSelfHealingValidationService, SystemSelfHealingValidationService, InstantiationType.Delayed);

// Phase 18.74: RealWorldWorkflowSimulationService (no AI kernel deps — workflow simulation)
registerSingleton(IRealWorldWorkflowSimulationService, RealWorldWorkflowSimulationService, InstantiationType.Delayed);

// Phase 18.75: SystemStabilityScoringService (no AI kernel deps — stability scoring)
registerSingleton(ISystemStabilityScoringService, SystemStabilityScoringService, InstantiationType.Delayed);

// Phase 18.76: EventStormSimulationService (no AI kernel deps — event storm simulation)
registerSingleton(IEventStormSimulationService, EventStormSimulationService, InstantiationType.Delayed);

// Phase 18.77: MemoryConsistencyAuditService (no AI kernel deps — memory audit)
registerSingleton(IMemoryConsistencyAuditService, MemoryConsistencyAuditService, InstantiationType.Delayed);

// Phase 18.78: SystemBoundaryDiscoveryService (no AI kernel deps — boundary discovery)
registerSingleton(ISystemBoundaryDiscoveryService, SystemBoundaryDiscoveryService, InstantiationType.Delayed);

// Phase 18.79: SystemConsolidationService (no AI kernel deps — consolidation)
registerSingleton(ISystemConsolidationService, SystemConsolidationService, InstantiationType.Delayed);

// Phase 19.80: ServiceConsolidationEngineService (no AI kernel deps -- service consolidation)
registerSingleton(IServiceConsolidationEngineService, ServiceConsolidationEngineService, InstantiationType.Delayed);

// Phase 19.81: DependencyGraphSimplificationService (no AI kernel deps -- dependency simplification)
registerSingleton(IDependencyGraphSimplificationService, DependencyGraphSimplificationService, InstantiationType.Delayed);

// Phase 19.82: ServiceBoundaryClarificationService (no AI kernel deps -- boundary clarification)
registerSingleton(IServiceBoundaryClarificationService, ServiceBoundaryClarificationService, InstantiationType.Delayed);

// Phase 19.83: SystemModuleGroupingService (no AI kernel deps -- module grouping)
registerSingleton(ISystemModuleGroupingService, SystemModuleGroupingService, InstantiationType.Delayed);

// Phase 19.84: RedundancyEliminationService (no AI kernel deps -- redundancy elimination)
registerSingleton(IRedundancyEliminationService, RedundancyEliminationService, InstantiationType.Delayed);

// Phase 19.85: SimplifiedOrchestrationService (no AI kernel deps -- orchestration simplification)
registerSingleton(ISimplifiedOrchestrationService, SimplifiedOrchestrationService, InstantiationType.Delayed);

// Phase 19.86: PublicAPISimplificationService (no AI kernel deps -- API simplification)
registerSingleton(IPublicAPISimplificationService, PublicAPISimplificationService, InstantiationType.Delayed);

// Phase 19.87: ComplexityMetricsService (no AI kernel deps -- complexity metrics)
registerSingleton(IComplexityMetricsService, ComplexityMetricsService, InstantiationType.Delayed);

// Phase 19.88: SafeMigrationStrategyService (no AI kernel deps -- migration strategy)
registerSingleton(ISafeMigrationStrategyService, SafeMigrationStrategyService, InstantiationType.Delayed);

// Phase 19.89: FinalArchitectureModelService (no AI kernel deps -- final architecture model)
registerSingleton(IFinalArchitectureModelService, FinalArchitectureModelService, InstantiationType.Delayed);

// ─── Bootstrap Runner ──────────────────────────────────────────────────────────

export const AI_BOOTSTRAP_RUNNER_ID = 'workbench.contrib.aiBootstrapRunner';

class AIBootstrapRunner extends Disposable implements IWorkbenchContribution {

        constructor(
                @IWorkspaceBootstrapService private readonly bootstrapService: IWorkspaceBootstrapService,
                @IAIUnifiedStateService private readonly stateService: IAIUnifiedStateService,
                @ILogService private readonly logService: ILogService,
        ) {
                super();
                this._runBootstrap();
        }

        private async _runBootstrap(): Promise<void> {
                try {
                        const result = await this.bootstrapService.runBootstrap();
                        if (result.success) {
                                this.logService.info(`[AIBootstrapRunner] Kernel ready in ${result.totalDuration}ms`);
                        } else {
                                this.logService.error(`[AIBootstrapRunner] Kernel bootstrap FAILED:`, result.errors);
                        }
                } catch (err) {
                        this.logService.error(`[AIBootstrapRunner] Bootstrap exception:`, err);
                }
        }
}

// ─── File Mutation Hook (Phase 6: Context Engine Integrated) ──────────────────

export const AI_FILE_MUTATION_HOOK_ID = 'workbench.contrib.aiFileMutationHook';

class AIFileMutationHook extends Disposable implements IWorkbenchContribution, ITextFileSaveParticipant {

        readonly ordinal = -1000;

        constructor(
                @IAIExecutionService private readonly aiExecutionService: IAIExecutionService,
                @ITextFileService private readonly textFileService: ITextFileService,
                @IExecutionGraphService private readonly graphService: IExecutionGraphService,
                @IAIUnifiedStateService private readonly stateService: IAIUnifiedStateService,
                @IObservabilityService private readonly observabilityService: IObservabilityService,
                @IAIContextService private readonly contextService: IAIContextService,
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
                if (token.isCancellationRequested) {
                        return;
                }

                const resource = model.resource;
                const activeContext = this.aiExecutionService.activeMutationContext;
                const hasBypass = activeContext?.bypassToken && this.aiExecutionService.isBypassTokenValid(activeContext.bypassToken);

                // Create a Save graph node for every save
                const saveNode = this.graphService.createNode({
                        type: ExecutionNodeType.Save,
                        label: `Save ${resource.path}`,
                        mutationSource: hasBypass ? (activeContext?.source ?? AIMutationSource.AIInternal) : AIMutationSource.UserAction,
                        trusted: true,
                        description: hasBypass ? 'AI-initiated save' : 'User-initiated save',
                        fileUri: resource,
                        reversible: true,
                        rollbackStrategy: 2,
                });

                if (activeContext && activeContext.parentExecutionId) {
                        this.graphService.createEdge(activeContext.parentExecutionId, saveNode.id, ExecutionEdgeType.Triggered);
                }

                this.graphService.completeNode(saveNode.id, { success: true });

                // Phase 6: Notify context engine about file modification
                this.contextService.notifyFileModified(resource);

                progress.report({ message: `AI kernel: save tracked in execution graph + context engine` });
        }
}

// ─── Bulk Edit Interceptor (Phase 6: Context-integrated) ─────────────────────

export const AI_BULK_EDIT_INTERCEPTOR_ID = 'workbench.contrib.aiBulkEditInterceptor';

class AIBulkEditInterceptor extends Disposable implements IWorkbenchContribution {

        constructor(
                @IAIExecutionService private readonly aiExecutionService: IAIExecutionService,
                @IBulkEditService private readonly bulkEditService: IBulkEditService,
                @IExecutionGraphService private readonly graphService: IExecutionGraphService,
                @IObservabilityService private readonly observabilityService: IObservabilityService,
        ) {
                super();
        }
}

// ─── Register Contributions ────────────────────────────────────────────────────

registerWorkbenchContribution2(
        AI_FILE_MUTATION_HOOK_ID,
        AIFileMutationHook,
        WorkbenchPhase.AfterRestored
);

registerWorkbenchContribution2(
        AI_BULK_EDIT_INTERCEPTOR_ID,
        AIBulkEditInterceptor,
        WorkbenchPhase.AfterRestored
);

registerWorkbenchContribution2(
        AI_BOOTSTRAP_RUNNER_ID,
        AIBootstrapRunner,
        WorkbenchPhase.AfterRestored
);
