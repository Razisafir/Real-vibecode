/*---------------------------------------------------------------------------------------------
 *  AI Execution Kernel -- Repository Intelligence, Code Execution & Long-Horizon Autonomy
 *  Real Vibecode -- AI-Native IDE
 *
 *  aiExecution.contribution.ts -- Service registration + real UI wiring.
 *
 *  PHASE 27 REDUCTION: From 19 to 14 registered singletons.
 *
 *  MERGED IN PHASE 27 (5 services removed as separate singletons):
 *    - ModelRegistry: Merged into LLMProviderService
 *    - CredentialStore: Merged into LLMProviderService
 *    - Streaming: Merged into LLMProviderService
 *    - ProviderHealth: Merged into LLMProviderService
 *    - MemoryCompaction: Merged into ProjectMemoryService
 *    - ExecutionTimeline: Merged into ProjectMemoryService
 *    - ExecutionQueue: Merged into AutonomousExecutionService
 *    - TokenEstimation: Merged into AIContextService
 *
 *  NEW IN PHASE 27 (3 services):
 *    - RepositoryIntelligenceService
 *    - CodeEditingService
 *    - GitWorkflowService
 *
 *  CONSUMED INTERNALLY (5 services, not registered as singletons):
 *    - LongHorizonMemoryService: Consumed by ProjectMemoryService
 *    - AutonomousRepairService: Consumed by AutonomousExecutionService
 *    - ExecutionVerificationService: Consumed by AIExecutionService
 *    - MultiAgentExecutionService: Consumed by AgentOrchestratorService
 *    - ContextWindowOptimizationService: Consumed by AIContextService
 *
 *  ACTIVE SERVICES (14):
 *    CORE (3): ExecutionGraph, UnifiedState, Observability
 *    EXECUTION (2): AIExecution, AgentOrchestrator
 *    CONTEXT (1): AIContext
 *    LLM (1): LLMProvider
 *    MEMORY (1): ProjectMemory
 *    AUTONOMY (2): AutonomousExecution, ExecutionSandbox
 *    REPOSITORY (2): RepositoryIntelligence, CodeEditing
 *    GIT (1): GitWorkflow
 *    UI (1): RealUIIntegration
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

// ---- LLM (1) ----
import { ILLMProviderService } from '../common/llmProvider.js';
import { LLMProviderService } from './llmProviderService.js';

// ---- MEMORY (1) ----
import { IProjectMemoryService } from '../common/projectMemory.js';
import { ProjectMemoryService } from './projectMemoryService.js';

// ---- AUTONOMY (2) ----
import { IAutonomousExecutionService } from '../common/autonomousExecution.js';
import { AutonomousExecutionService } from './autonomousExecutionService.js';
import { IExecutionSandboxService } from '../common/executionSandbox.js';
import { ExecutionSandboxService } from './executionSandboxService.js';

// ---- REPOSITORY (2) ----
import { IRepositoryIntelligenceService } from '../common/repositoryIntelligence.js';
import { RepositoryIntelligenceService } from './repositoryIntelligenceService.js';
import { ICodeEditingService } from '../common/codeEditing.js';
import { CodeEditingService } from './codeEditingService.js';

// ---- GIT (1) ----
import { IGitWorkflowService } from '../common/gitWorkflow.js';
import { GitWorkflowService } from './gitWorkflowService.js';

// ---- UI (1) ----
import { IRealUIIntegrationService } from '../common/realUIIntegration.js';
import { RealUIIntegrationService } from './realUIIntegrationService.js';

// ---- Consumed internally (not registered as singletons) ----
import './longHorizonMemoryService.js';
import './autonomousRepairService.js';
import './executionVerificationService.js';
import './multiAgentExecutionService.js';
import './contextWindowOptimizationService.js';

// ---- Real UI Product Contribution ----
import './aiProductContribution.js';

// =====================================================================
// SINGLETON REGISTRATIONS
// 14 core services + 1 auto-registered workbench contribution
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

// LLM (1)
registerSingleton(ILLMProviderService, LLMProviderService, InstantiationType.Delayed);

// MEMORY (1)
registerSingleton(IProjectMemoryService, ProjectMemoryService, InstantiationType.Delayed);

// AUTONOMY (2)
registerSingleton(IAutonomousExecutionService, AutonomousExecutionService, InstantiationType.Delayed);
registerSingleton(IExecutionSandboxService, ExecutionSandboxService, InstantiationType.Delayed);

// REPOSITORY (2)
registerSingleton(IRepositoryIntelligenceService, RepositoryIntelligenceService, InstantiationType.Delayed);
registerSingleton(ICodeEditingService, CodeEditingService, InstantiationType.Delayed);

// GIT (1)
registerSingleton(IGitWorkflowService, GitWorkflowService, InstantiationType.Delayed);

// UI (1)
registerSingleton(IRealUIIntegrationService, RealUIIntegrationService, InstantiationType.Delayed);
