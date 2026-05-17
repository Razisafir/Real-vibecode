/*---------------------------------------------------------------------------------------------
 *  AI Execution Kernel -- Real Multi-LLM, Persistent Memory & Autonomous Execution
 *  Real Vibecode -- AI-Native IDE
 *
 *  aiExecution.contribution.ts -- Service registration + real UI wiring.
 *
 *  PHASE 25 REDUCTION: From 39 to 25 services.
 *  Removed 14 phantom/redundant services superseded by real Phase 25 implementations.
 *
 *  REMOVED IN PHASE 25 (14 services):
 *    - GlobalExecutionBrain: Superseded by AutonomousExecutionService (real execution)
 *    - SystemStabilization: No real stabilization logic; phantom service
 *    - ExecutionReplay: Superseded by ExecutionTimelineService (real timeline)
 *    - DesignSystem: Superseded by RealUIIntegrationService (real themes)
 *    - RuntimeKernel: Superseded by AutonomousExecutionService (real lifecycle)
 *    - ExecutionScheduler: Superseded by ExecutionQueueService (real queue)
 *    - RuntimePersistence: Superseded by ProjectMemoryService (real persistence)
 *    - RuntimeHealthSupervisor: Superseded by ProviderHealthService (real health)
 *    - ResourceGovernance: No real resource governance; phantom service
 *    - CSSPipeline: Superseded by RealUIIntegrationService (real CSS injection)
 *    - IconRendering: Superseded by RealUIIntegrationService (real icons)
 *    - AccessibilityRemediation: Superseded by RealUIIntegrationService (real a11y)
 *    - ComponentLibrary: Superseded by RealUIIntegrationService (real components)
 *    - ProductAudit: No real audit output; phantom service
 *
 *  ACTIVE SERVICES (25):
 *    TIER 1 (Core): ExecutionGraph, UnifiedState, Observability, Execution, Bootstrap (5)
 *    TIER 2 (Context): SymbolDependency, Context, ContextPersistence (3)
 *    TIER 3 (Orchestration): AgentOrchestrator, ProcessOrchestrator (2)
 *    TIER 4 (LLM): LLMProvider, ModelRegistry, CredentialStore, Streaming, ProviderHealth (5)
 *    TIER 5 (Memory): ProjectMemory, MemoryCompaction, ExecutionTimeline (3)
 *    TIER 6 (Execution): AutonomousExecution, ExecutionQueue, ExecutionSandbox (3)
 *    TIER 7 (UI): TokenEstimation, RealUIIntegration, ExecutionUI, ContextUI (4)
 *--------------------------------------------------------------------------------------------*/

import { InstantiationType, registerSingleton } from '../../../../platform/instantiation/common/extensions.js';

// ---- TIER 1: Core Runtime (5 services) ----

import { IExecutionGraphService } from '../common/executionGraphService.js';
import { ExecutionGraphService } from './executionGraphService.js';
import { IAIUnifiedStateService } from '../common/aiUnifiedStateService.js';
import { AIUnifiedStateService } from './aiUnifiedStateService.js';
import { IObservabilityService } from '../common/observabilityService.js';
import { ObservabilityService } from './observabilityService.js';
import { IAIExecutionService } from '../common/aiExecutionService.js';
import { AIExecutionService } from './aiExecutionService.js';
import { IWorkspaceBootstrapService } from '../common/workspaceBootstrap.js';
import { WorkspaceBootstrapService } from './workspaceBootstrap.js';

// ---- TIER 2: Context (3 services) ----

import { ISymbolDependencyAnalyzer } from '../common/symbolDependencyAnalyzer.js';
import { SymbolDependencyAnalyzer } from './symbolDependencyAnalyzer.js';
import { IAIContextService } from '../common/aiContextService.js';
import { AIContextService } from './aiContextService.js';
import { IContextPersistenceService } from '../common/contextPersistence.js';
import { ContextPersistenceService } from './contextPersistence.js';

// ---- TIER 3: Orchestration (2 services) ----

import { IAgentOrchestratorService } from '../common/agentOrchestratorService.js';
import { AgentOrchestratorService } from './agentOrchestratorService.js';
import { IAIProcessOrchestratorService } from '../common/aiProcessOrchestratorService.js';
import { AIProcessOrchestratorService } from './aiProcessOrchestratorService.js';

// ---- TIER 4: Multi-LLM Provider System (5 services) ----

import { ILLMProviderService, IModelRegistryService, ICredentialStoreService, ILLMStreamingService, IProviderHealthService } from '../common/llmProvider.js';
import { LLMProviderService, ModelRegistryService, CredentialStoreService, LLMStreamingService, ProviderHealthService } from './llmProviderService.js';

// ---- TIER 5: Persistent Project Memory (3 services) ----

import { IProjectMemoryService, IMemoryCompactionService, IExecutionTimelineService } from '../common/projectMemory.js';
import { ProjectMemoryService, MemoryCompactionService, ExecutionTimelineService } from './projectMemoryService.js';

// ---- TIER 6: Autonomous Execution + Sandbox (3 services) ----

import { IAutonomousExecutionService, IExecutionQueueService } from '../common/autonomousExecution.js';
import { AutonomousExecutionService, ExecutionQueueService } from './autonomousExecutionService.js';
import { IExecutionSandboxService } from '../common/executionSandbox.js';
import { ExecutionSandboxService } from './executionSandboxService.js';

// ---- TIER 7: UI + Estimation (4 services) ----

import { ITokenEstimationService } from '../common/tokenEstimation.js';
import { TokenEstimationService } from './tokenEstimationService.js';
import { IRealUIIntegrationService } from '../common/realUIIntegration.js';
import { RealUIIntegrationService } from './realUIIntegrationService.js';
import { IAIExecutionUIService } from '../common/aiExecutionUI.js';
import { AIExecutionUIService } from './aiExecutionUIService.js';
import { IAIContextUIService } from '../common/aiContextUI.js';
import { AIContextUIService } from './aiContextUIService.js';

// ---- Real UI Product Contribution (views, CSS, settings, webview) ----
import './aiProductContribution.js';

// =====================================================================
// SINGLETON REGISTRATIONS
// 25 core services + 1 auto-registered workbench contribution
// =====================================================================

// TIER 1: Core Runtime (5)
registerSingleton(IExecutionGraphService, ExecutionGraphService, InstantiationType.Delayed);
registerSingleton(IAIUnifiedStateService, AIUnifiedStateService, InstantiationType.Delayed);
registerSingleton(IObservabilityService, ObservabilityService, InstantiationType.Delayed);
registerSingleton(IAIExecutionService, AIExecutionService, InstantiationType.Delayed);
registerSingleton(IWorkspaceBootstrapService, WorkspaceBootstrapService, InstantiationType.Delayed);

// TIER 2: Context (3)
registerSingleton(ISymbolDependencyAnalyzer, SymbolDependencyAnalyzer, InstantiationType.Delayed);
registerSingleton(IAIContextService, AIContextService, InstantiationType.Delayed);
registerSingleton(IContextPersistenceService, ContextPersistenceService, InstantiationType.Delayed);

// TIER 3: Orchestration (2)
registerSingleton(IAgentOrchestratorService, AgentOrchestratorService, InstantiationType.Delayed);
registerSingleton(IAIProcessOrchestratorService, AIProcessOrchestratorService, InstantiationType.Delayed);

// TIER 4: Multi-LLM Provider System (5)
registerSingleton(ILLMProviderService, LLMProviderService, InstantiationType.Delayed);
registerSingleton(IModelRegistryService, ModelRegistryService, InstantiationType.Delayed);
registerSingleton(ICredentialStoreService, CredentialStoreService, InstantiationType.Delayed);
registerSingleton(ILLMStreamingService, LLMStreamingService, InstantiationType.Delayed);
registerSingleton(IProviderHealthService, ProviderHealthService, InstantiationType.Delayed);

// TIER 5: Persistent Project Memory (3)
registerSingleton(IProjectMemoryService, ProjectMemoryService, InstantiationType.Delayed);
registerSingleton(IMemoryCompactionService, MemoryCompactionService, InstantiationType.Delayed);
registerSingleton(IExecutionTimelineService, ExecutionTimelineService, InstantiationType.Delayed);

// TIER 6: Autonomous Execution + Sandbox (3)
registerSingleton(IAutonomousExecutionService, AutonomousExecutionService, InstantiationType.Delayed);
registerSingleton(IExecutionQueueService, ExecutionQueueService, InstantiationType.Delayed);
registerSingleton(IExecutionSandboxService, ExecutionSandboxService, InstantiationType.Delayed);

// TIER 7: UI + Estimation (4)
registerSingleton(ITokenEstimationService, TokenEstimationService, InstantiationType.Delayed);
registerSingleton(IRealUIIntegrationService, RealUIIntegrationService, InstantiationType.Delayed);
registerSingleton(IAIExecutionUIService, AIExecutionUIService, InstantiationType.Delayed);
registerSingleton(IAIContextUIService, AIContextUIService, InstantiationType.Delayed);
