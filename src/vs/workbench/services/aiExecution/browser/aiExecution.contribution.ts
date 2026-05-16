/*---------------------------------------------------------------------------------------------
 *  AI Execution Kernel — Phase 14 Adaptive Workflow Layer
 *  Real Vibecode — AI-Native IDE
 *
 *  aiExecution.contribution.ts — Service registration + integration hooks.
 *  Phase 14: Adds Adaptive Workflow services (10 new singletons).
 *
 *  Full Registration Order:
 *    1. IObservabilityService (no AI kernel deps)
 *    2. IExecutionGraphService
 *    3. IAIUnifiedStateService (deps: ExecutionGraphService)
 *    4. IAIExecutionService (deps: Graph, UnifiedState, Observability)
 *    5. IAIExecutionUIService (deps: UnifiedState, Graph, Editor)
 *    6. IWorkspaceBootstrapService (deps: UnifiedState, Graph, Execution)
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

// ─── Singleton Registrations ───────────────────────────────────────────────────
//
// ORDER MATTERS: Services are registered in dependency order.
// A service can only depend on services registered BEFORE it.
//

// Phase 5.1: ObservabilityService (leaf dependency — no AI kernel deps)
registerSingleton(IObservabilityService, ObservabilityService, InstantiationType.Delayed);

// Phase 5.2: ExecutionGraphService
registerSingleton(IExecutionGraphService, ExecutionGraphService, InstantiationType.Delayed);

// Phase 5.3: UnifiedStateService (deps: GraphService)
registerSingleton(IAIUnifiedStateService, AIUnifiedStateService, InstantiationType.Delayed);

// Phase 5.4: AIExecutionService (deps: Graph, UnifiedState, Observability)
registerSingleton(IAIExecutionService, AIExecutionService, InstantiationType.Delayed);

// Phase 5.5: AIExecutionUIService (deps: Graph, UnifiedState, Editor)
registerSingleton(IAIExecutionUIService, AIExecutionUIService, InstantiationType.Delayed);

// Phase 5.6: WorkspaceBootstrapService (deps: UnifiedState, Graph, Execution)
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
