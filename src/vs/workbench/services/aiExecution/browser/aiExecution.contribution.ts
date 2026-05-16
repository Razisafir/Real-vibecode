/*---------------------------------------------------------------------------------------------
 *  AI Execution Kernel -- Real Product Wiring
 *  Real Vibecode -- AI-Native IDE
 *
 *  aiExecution.contribution.ts -- Service registration + real UI wiring.
 *
 *  PHASE 24 REBUILD: Drastic service reduction from 139 to 26 core services.
 *  Removed 113 phantom services that produced no visible UI or runtime effect.
 *  Added real VS Code view container, webview panels, CSS injection, and settings.
 *
 *  SERVICE TIERS:
 *    TIER 1 (Core Runtime) -- Must exist for the system to function:
 *      1-6:   ExecutionGraph, UnifiedState, Observability, Execution, ExecutionUI, Bootstrap
 *      7-10:  SymbolDependency, Context, ContextPersistence, ContextUI
 *      11-12: AgentOrchestrator, ProcessOrchestrator
 *      13-16: GlobalBrain, SystemStabilization, ExecutionReplay, DesignSystem
 *      17-21: RuntimeKernel, ExecutionScheduler, RuntimePersistence, HealthSupervisor, ResourceGovernance
 *
 *    TIER 2 (Real Rendering) -- Produce actual CSS, HTML, or DOM output:
 *      22-24: CSSPipeline, IconRendering, AccessibilityRemediation
 *      25-26: ComponentLibrary, ProductAudit
 *
 *  REMOVED (113 phantom services):
 *    - All Phase 13 UX services (9): AIPresence, EditorExperience, CognitiveLoad,
 *      PremiumMicrointeraction, AITransparency, PanelHierarchy, AttentionOrchestrator,
 *      PerceivedPerformance, UXConsistency
 *    - All Phase 14 adaptive services (10): ProgressiveDisclosure, UserExperienceProfile,
 *      AdaptiveInterface, FeatureFatigue, ContextualMinimalism, FlowState, AutonomyTrust,
 *      OnboardingExperience, ExpertMode, AdaptiveExperienceValidation
 *    - All Phase 15 production surface services (10): WorkbenchShell, SurfaceMaterial,
 *      EditorDominance, AISurfaceExperience, ExecutionTimelineExperience, CinematicMotion,
 *      ExperienceStateSurface, VisualPolish, ProductionUXValidation, SignatureProductFeel
 *    - All Phase 16 human workflow services (10): WorkflowMomentum, InterruptionIntelligence,
 *      SessionContinuity, CognitiveRecovery, WorkRhythm, IntentPersistence, EmotionalFriction,
 *      WorkspaceMemory, HumanWorkflowValidation, SignatureHumanExperienceModel
 *    - All Phase 17 coherence services (10): SystemCoherenceEngine, CrossLayerSignalBus,
 *      SystemIntentAlignment, LayerSynchronization, GlobalEventNormalization, SystemFeedbackLoop,
 *      SystemContextMerger, SystemConflictResolver, GlobalSystemHealthOrchestrator, SystemConsciousnessModel
 *    - All Phase 18 stress services (10): SystemStressSimulation, SystemDegradationModel,
 *      CrossLayerFailureInjection, SystemSelfHealingValidation, RealWorldWorkflowSimulation,
 *      SystemStabilityScoring, EventStormSimulation, MemoryConsistencyAudit,
 *      SystemBoundaryDiscovery, SystemConsolidation
 *    - All Phase 19 consolidation services (10): ServiceConsolidationEngine, DependencyGraphSimplification,
 *      ServiceBoundaryClarification, SystemModuleGrouping, RedundancyElimination,
 *      SimplifiedOrchestration, PublicAPISimplification, ComplexityMetrics,
 *      SafeMigrationStrategy, FinalArchitectureModel
 *    - All Phase 20 production ops services (10): ProductionDeployment, SecurityBoundary,
 *      UpdateLifecycle, TelemetryGovernance, RuntimeMonitoring, RecoveryFailsafe,
 *      ProductionConfiguration, DistributionPackaging, OperationalAnalytics, ProductionReadinessValidator
 *    - Remaining Phase 21-24 phantom services (24): AgentOrchestrationRuntime, RuntimeRecoveryOrchestrator,
 *      DistributedExecutionBridge, RuntimeGovernance, AutonomousEvolutionRuntime,
 *      RealityValidation, ExecutionTruthAudit, MaintainabilityAnalysis, ScalabilityReality,
 *      OperationalTruth, ObservabilityCompleteness, ArchitecturalReduction, ProductionReadinessTruth,
 *      RuntimeRealityBenchmark, SystemConvergenceReport, IconSystem, DesignToken,
 *      ComponentStandards, UIRealityValidation, UXReduction, InteractionPolish,
 *      AccessibilityCompliance, RenderingPerformance, ProductSurfaceRebuild, ProductRealityReport,
 *      SurfaceRebuildRender, InteractionImplementation, PerformanceCleanup, UXCollapse,
 *      ApplicationPolish, AgentUI, ProcessUI, BrainDashboard, SignatureIdentity
 *
 *  NEW: Real UI contribution imported from aiProductContribution.ts
 *    - Activity bar icon + sidebar panel
 *    - AI Workflow webview with complete user flow
 *    - Projects view, Timeline view
 *    - CSS design token injection
 *    - Settings registration
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
import { ILogService } from '../../../../platform/log/common/log.js';

// ---- TIER 1: Core Runtime Services (essential for system to function) ----

// Phase 5: Foundation Layer
import { IExecutionGraphService } from '../common/executionGraphService.js';
import { ExecutionGraphService } from './executionGraphService.js';
import { IAIUnifiedStateService } from '../common/aiUnifiedStateService.js';
import { AIUnifiedStateService } from './aiUnifiedStateService.js';
import { IObservabilityService } from '../common/observabilityService.js';
import { ObservabilityService } from './observabilityService.js';
import { IAIExecutionUIService } from '../common/aiExecutionUI.js';
import { AIExecutionUIService } from './aiExecutionUIService.js';
import { IWorkspaceBootstrapService } from '../common/workspaceBootstrap.js';
import { WorkspaceBootstrapService } from './workspaceBootstrap.js';

// Phase 6: Context Layer
import { ISymbolDependencyAnalyzer } from '../common/symbolDependencyAnalyzer.js';
import { SymbolDependencyAnalyzer } from './symbolDependencyAnalyzer.js';
import { IAIContextService } from '../common/aiContextService.js';
import { AIContextService } from './aiContextService.js';
import { IContextPersistenceService } from '../common/contextPersistence.js';
import { ContextPersistenceService } from './contextPersistence.js';
import { IAIContextUIService } from '../common/aiContextUI.js';
import { AIContextUIService } from './aiContextUIService.js';

// Phase 7-8: Agent + Process Orchestration
import { IAgentOrchestratorService } from '../common/agentOrchestratorService.js';
import { AgentOrchestratorService } from './agentOrchestratorService.js';
import { IAIProcessOrchestratorService } from '../common/aiProcessOrchestratorService.js';
import { AIProcessOrchestratorService } from './aiProcessOrchestratorService.js';

// Phase 9-12: Brain + Stabilization + Replay + Design
import { IGlobalExecutionBrainService } from '../common/globalExecutionBrain.js';
import { GlobalExecutionBrainService } from './globalExecutionBrain.js';
import { ISystemStabilizationService } from '../common/systemStabilization.js';
import { SystemStabilizationService } from './systemStabilizationService.js';
import { IExecutionReplayService } from '../common/replayEngine.js';
import { ReplayEngineService } from './replayEngineService.js';
import { IDesignSystemService } from '../common/designSystem.js';
import { DesignSystemService } from './designSystemService.js';

// Phase 21: Runtime Kernel
import { IRuntimeKernelService, IExecutionSchedulerService, IRuntimePersistenceService, IRuntimeHealthSupervisorService, IResourceGovernanceService } from '../common/runtimeExecution.js';
import { RuntimeKernelService, ExecutionSchedulerService, RuntimePersistenceService, RuntimeHealthSupervisorService, ResourceGovernanceService } from './runtimeExecutionService.js';

// ---- TIER 2: Real Rendering Services (produce actual CSS/HTML/DOM) ----

// Phase 24: Rendered Product
import { ICSSPipelineService, IIconRenderingService, IAccessibilityRemediationService, IComponentLibraryService, IProductAuditService } from '../common/renderedProduct.js';
import { CSSPipelineService, IconRenderingService, AccessibilityRemediationService, ComponentLibraryService, ProductAuditService } from './renderedProductService.js';

// ---- NEW: Real UI Product Contribution (views, CSS, settings, webview) ----
import './aiProductContribution.js';

// =====================================================================
// SINGLETON REGISTRATIONS
// 26 core services + 1 auto-registered workbench contribution
// =====================================================================

// Phase 5: Foundation Layer (6 services)
registerSingleton(IExecutionGraphService, ExecutionGraphService, InstantiationType.Delayed);
registerSingleton(IAIUnifiedStateService, AIUnifiedStateService, InstantiationType.Delayed);
registerSingleton(IObservabilityService, ObservabilityService, InstantiationType.Delayed);
registerSingleton(IAIExecutionService, AIExecutionService, InstantiationType.Delayed);
registerSingleton(IAIExecutionUIService, AIExecutionUIService, InstantiationType.Delayed);
registerSingleton(IWorkspaceBootstrapService, WorkspaceBootstrapService, InstantiationType.Delayed);

// Phase 6: Context Layer (4 services)
registerSingleton(ISymbolDependencyAnalyzer, SymbolDependencyAnalyzer, InstantiationType.Delayed);
registerSingleton(IAIContextService, AIContextService, InstantiationType.Delayed);
registerSingleton(IContextPersistenceService, ContextPersistenceService, InstantiationType.Delayed);
registerSingleton(IAIContextUIService, AIContextUIService, InstantiationType.Delayed);

// Phase 7-8: Agent + Process (2 services)
registerSingleton(IAgentOrchestratorService, AgentOrchestratorService, InstantiationType.Delayed);
registerSingleton(IAIProcessOrchestratorService, AIProcessOrchestratorService, InstantiationType.Delayed);

// Phase 9-12: Brain + Stabilization + Replay + Design (4 services)
registerSingleton(IGlobalExecutionBrainService, GlobalExecutionBrainService, InstantiationType.Delayed);
registerSingleton(ISystemStabilizationService, SystemStabilizationService, InstantiationType.Delayed);
registerSingleton(IExecutionReplayService, ReplayEngineService, InstantiationType.Delayed);
registerSingleton(IDesignSystemService, DesignSystemService, InstantiationType.Delayed);

// Phase 21: Runtime Kernel (5 services)
registerSingleton(IRuntimeKernelService, RuntimeKernelService, InstantiationType.Delayed);
registerSingleton(IExecutionSchedulerService, ExecutionSchedulerService, InstantiationType.Delayed);
registerSingleton(IRuntimePersistenceService, RuntimePersistenceService, InstantiationType.Delayed);
registerSingleton(IRuntimeHealthSupervisorService, RuntimeHealthSupervisorService, InstantiationType.Delayed);
registerSingleton(IResourceGovernanceService, ResourceGovernanceService, InstantiationType.Delayed);

// Phase 24: Real Rendering (5 services)
registerSingleton(ICSSPipelineService, CSSPipelineService, InstantiationType.Delayed);
registerSingleton(IIconRenderingService, IconRenderingService, InstantiationType.Delayed);
registerSingleton(IAccessibilityRemediationService, AccessibilityRemediationService, InstantiationType.Delayed);
registerSingleton(IComponentLibraryService, ComponentLibraryService, InstantiationType.Delayed);
registerSingleton(IProductAuditService, ProductAuditService, InstantiationType.Delayed);

// =====================================================================
// REMOVED SERVICES (113 phantom services commented out)
// These services produced no visible UI or measurable runtime effect.
// Their interface and implementation files still exist in the codebase
// but are no longer registered or instantiated.
//
// Phase 13 (9 removed): AIPresence, EditorExperience, CognitiveLoad,
//   PremiumMicrointeraction, AITransparency, PanelHierarchy,
//   AttentionOrchestrator, PerceivedPerformance, SignatureIdentity, UXConsistency
// Phase 14 (10 removed): ProgressiveDisclosure, UserExperienceProfile,
//   AdaptiveInterface, FeatureFatigue, ContextualMinimalism, FlowState,
//   AutonomyTrust, OnboardingExperience, ExpertMode, AdaptiveExperienceValidation
// Phase 15 (10 removed): WorkbenchShell, SurfaceMaterial, EditorDominance,
//   AISurfaceExperience, ExecutionTimelineExperience, CinematicMotion,
//   ExperienceStateSurface, VisualPolish, ProductionUXValidation, SignatureProductFeel
// Phase 16 (10 removed): WorkflowMomentum, InterruptionIntelligence,
//   SessionContinuity, CognitiveRecovery, WorkRhythm, IntentPersistence,
//   EmotionalFriction, WorkspaceMemory, HumanWorkflowValidation, SignatureHumanExperienceModel
// Phase 17 (10 removed): SystemCoherenceEngine, CrossLayerSignalBus,
//   SystemIntentAlignment, LayerSynchronization, GlobalEventNormalization,
//   SystemFeedbackLoop, SystemContextMerger, SystemConflictResolver,
//   GlobalSystemHealthOrchestrator, SystemConsciousnessModel
// Phase 18 (10 removed): SystemStressSimulation, SystemDegradationModel,
//   CrossLayerFailureInjection, SystemSelfHealingValidation,
//   RealWorldWorkflowSimulation, SystemStabilityScoring, EventStormSimulation,
//   MemoryConsistencyAudit, SystemBoundaryDiscovery, SystemConsolidation
// Phase 19 (10 removed): ServiceConsolidationEngine, DependencyGraphSimplification,
//   ServiceBoundaryClarification, SystemModuleGrouping, RedundancyElimination,
//   SimplifiedOrchestration, PublicAPISimplification, ComplexityMetrics,
//   SafeMigrationStrategy, FinalArchitectureModel
// Phase 20 (10 removed): ProductionDeployment, SecurityBoundary, UpdateLifecycle,
//   TelemetryGovernance, RuntimeMonitoring, RecoveryFailsafe,
//   ProductionConfiguration, DistributionPackaging, OperationalAnalytics,
//   ProductionReadinessValidator
// Phase 21-24 (24 removed): AgentOrchestrationRuntime, RuntimeRecoveryOrchestrator,
//   DistributedExecutionBridge, RuntimeGovernance, AutonomousEvolutionRuntime,
//   RealityValidation, ExecutionTruthAudit, MaintainabilityAnalysis, ScalabilityReality,
//   OperationalTruth, ObservabilityCompleteness, ArchitecturalReduction,
//   ProductionReadinessTruth, RuntimeRealityBenchmark, SystemConvergenceReport,
//   IconSystem, DesignToken, ComponentStandards, UIRealityValidation, UXReduction,
//   InteractionPolish, AccessibilityCompliance, RenderingPerformance,
//   ProductSurfaceRebuild, ProductRealityReport, SurfaceRebuildRender,
//   InteractionImplementation, PerformanceCleanup, UXCollapse, ApplicationPolish,
//   AgentUI, ProcessUI, BrainDashboard
// =====================================================================
