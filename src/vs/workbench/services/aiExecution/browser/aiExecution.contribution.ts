/*---------------------------------------------------------------------------------------------
 *  AI Execution Kernel -- Complete Product Workflow & Execution UX
 *  Real Vibecode -- AI-Native IDE
 *
 *  aiExecution.contribution.ts -- Service registration + real UI wiring.
 *
 *  PHASE 26 REDUCTION: From 25 to 20 services.
 *  Removed 5 phantom/redundant services.
 *
 *  REMOVED IN PHASE 26 (5 services):
 *    - WorkspaceBootstrap: Minimal utility; bootstrapping handled by AIProductContribution
 *    - SymbolDependencyAnalyzer: Not used by any real workflow
 *    - ContextPersistence: Superseded by ProjectMemoryService
 *    - AIExecutionUIService: UI handled by RealUIIntegrationService + webview
 *    - AIContextUIService: UI handled by RealUIIntegrationService + webview
 *
 *  ACTIVE SERVICES (20):
 *    CORE (3): ExecutionGraph, UnifiedState, Observability
 *    EXECUTION (2): AIExecution, AgentOrchestrator
 *    LLM (5): LLMProvider, ModelRegistry, CredentialStore, Streaming, ProviderHealth
 *    MEMORY (3): ProjectMemory, MemoryCompaction, ExecutionTimeline
 *    AUTONOMY (3): AutonomousExecution, ExecutionQueue, ExecutionSandbox
 *    UI + ESTIMATION (2): TokenEstimation, RealUIIntegration
 *    CONTEXT (1): AIContext
 *    CONTRIBUTION (1): AIProductContribution (auto-registered)
 *--------------------------------------------------------------------------------------------*/

import { InstantiationType, registerSingleton } from '../../../../platform/instantiation/common/extensions.js';

// ---- CORE (3) ----

import { IExecutionGraphService } from '../common/executionGraphService.js';
import { ExecutionGraphService } from './executionGraphService.js';
import { IAIUnifiedStateService } from '../common/aiUnifiedStateService.js';
import { AIUnifiedStateService } from './aiUnifiedStateService.js';
import { IObservabilityService } from '../common/observabilityService.js';
import { ObservabilityService } from './observabilityService.js';

// ---- EXECUTION (2) ----

import { IAIExecutionService } from '../common/aiExecutionService.js';
import { AIExecutionService } from './aiExecutionService.js';
import { IAgentOrchestratorService } from '../common/agentOrchestratorService.js';
import { AgentOrchestratorService } from './agentOrchestratorService.js';

// ---- CONTEXT (1) ----

import { IAIContextService } from '../common/aiContextService.js';
import { AIContextService } from './aiContextService.js';

// ---- LLM (5) ----

import { ILLMProviderService, IModelRegistryService, ICredentialStoreService, ILLMStreamingService, IProviderHealthService } from '../common/llmProvider.js';
import { LLMProviderService, ModelRegistryService, CredentialStoreService, LLMStreamingService, ProviderHealthService } from './llmProviderService.js';

// ---- MEMORY (3) ----

import { IProjectMemoryService, IMemoryCompactionService, IExecutionTimelineService } from '../common/projectMemory.js';
import { ProjectMemoryService, MemoryCompactionService, ExecutionTimelineService } from './projectMemoryService.js';

// ---- AUTONOMY (3) ----

import { IAutonomousExecutionService, IExecutionQueueService } from '../common/autonomousExecution.js';
import { AutonomousExecutionService, ExecutionQueueService } from './autonomousExecutionService.js';
import { IExecutionSandboxService } from '../common/executionSandbox.js';
import { ExecutionSandboxService } from './executionSandboxService.js';

// ---- UI + ESTIMATION (2) ----

import { ITokenEstimationService } from '../common/tokenEstimation.js';
import { TokenEstimationService } from './tokenEstimationService.js';
import { IRealUIIntegrationService } from '../common/realUIIntegration.js';
import { RealUIIntegrationService } from './realUIIntegrationService.js';

// ---- Real UI Product Contribution (views, CSS, settings, webview) ----
import './aiProductContribution.js';

// =====================================================================
// SINGLETON REGISTRATIONS
// 20 core services + 1 auto-registered workbench contribution
// =====================================================================

// CORE (3)
registerSingleton(IExecutionGraphService, ExecutionGraphService, InstantiationType.Delayed);
registerSingleton(IAIUnifiedStateService, AIUnifiedStateService, InstantiationType.Delayed);
registerSingleton(IObservabilityService, ObservabilityService, InstantiationType.Delayed);

// EXECUTION (2)
registerSingleton(IAIExecutionService, AIExecutionService, InstantiationType.Delayed);
registerSingleton(IAgentOrchestratorService, AgentOrchestratorService, InstantiationType.Delayed);

// CONTEXT (1)
registerSingleton(IAIContextService, AIContextService, InstantiationType.Delayed);

// LLM (5)
registerSingleton(ILLMProviderService, LLMProviderService, InstantiationType.Delayed);
registerSingleton(IModelRegistryService, ModelRegistryService, InstantiationType.Delayed);
registerSingleton(ICredentialStoreService, CredentialStoreService, InstantiationType.Delayed);
registerSingleton(ILLMStreamingService, LLMStreamingService, InstantiationType.Delayed);
registerSingleton(IProviderHealthService, ProviderHealthService, InstantiationType.Delayed);

// MEMORY (3)
registerSingleton(IProjectMemoryService, ProjectMemoryService, InstantiationType.Delayed);
registerSingleton(IMemoryCompactionService, MemoryCompactionService, InstantiationType.Delayed);
registerSingleton(IExecutionTimelineService, ExecutionTimelineService, InstantiationType.Delayed);

// AUTONOMY (3)
registerSingleton(IAutonomousExecutionService, AutonomousExecutionService, InstantiationType.Delayed);
registerSingleton(IExecutionQueueService, ExecutionQueueService, InstantiationType.Delayed);
registerSingleton(IExecutionSandboxService, ExecutionSandboxService, InstantiationType.Delayed);

// UI + ESTIMATION (2)
registerSingleton(ITokenEstimationService, TokenEstimationService, InstantiationType.Delayed);
registerSingleton(IRealUIIntegrationService, RealUIIntegrationService, InstantiationType.Delayed);
