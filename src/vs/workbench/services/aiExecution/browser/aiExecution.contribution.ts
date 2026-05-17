/*---------------------------------------------------------------------------------------------
 *  AI Execution Kernel -- Real Execution Bridge, Terminal Control & True Autonomous Loop
 *  Real Vibecode -- AI-Native IDE
 *
 *  aiExecution.contribution.ts -- Service registration + real UI wiring.
 *
 *  PHASE 28 REDUCTION: From 14 to 9 registered singletons.
 *
 *  MERGED IN PHASE 28 (6 services removed as separate singletons):
 *    - ExecutionGraph: Absorbed by AutonomousExecutionLoopService
 *    - AIUnifiedState: Absorbed by ProjectMemoryService
 *    - AIExecution: Absorbed by AutonomousExecutionLoopService
 *    - AgentOrchestrator: Absorbed by AutonomousExecutionLoopService
 *    - ExecutionSandbox: Absorbed by AutonomousExecutionLoopService
 *    - AIContext: Absorbed by ProjectMemoryService
 *
 *  NEW IN PHASE 28 (2 services):
 *    - TerminalExecutionBridgeService: Real command execution via VS Code terminal
 *    - AutonomousExecutionLoopService: Unified autonomous execution loop
 *
 *  ACTIVE SERVICES (9):
 *    EXECUTION (2): AutonomousExecutionLoop, TerminalExecutionBridge
 *    LLM (1): LLMProvider
 *    MEMORY (1): ProjectMemory
 *    REPOSITORY (2): RepositoryIntelligence, CodeEditing
 *    GIT (1): GitWorkflow
 *    OBSERVABILITY (1): Observability
 *    UI (1): RealUIIntegration
 *--------------------------------------------------------------------------------------------*/

import { InstantiationType, registerSingleton } from '../../../../platform/instantiation/common/extensions.js';

// ---- EXECUTION (2) ----
import { IAutonomousExecutionLoopService } from '../common/autonomousExecutionLoop.js';
import { AutonomousExecutionLoopService } from './autonomousExecutionLoopService.js';
import { ITerminalExecutionBridgeService } from '../common/terminalExecutionBridge.js';
import { TerminalExecutionBridgeService } from './terminalExecutionBridgeService.js';

// ---- LLM (1) ----
import { ILLMProviderService } from '../common/llmProvider.js';
import { LLMProviderService } from './llmProviderService.js';

// ---- MEMORY (1) ----
import { IProjectMemoryService } from '../common/projectMemory.js';
import { ProjectMemoryService } from './projectMemoryService.js';

// ---- REPOSITORY (2) ----
import { IRepositoryIntelligenceService } from '../common/repositoryIntelligence.js';
import { RepositoryIntelligenceService } from './repositoryIntelligenceService.js';
import { ICodeEditingService } from '../common/codeEditing.js';
import { CodeEditingService } from './codeEditingService.js';

// ---- GIT (1) ----
import { IGitWorkflowService } from '../common/gitWorkflow.js';
import { GitWorkflowService } from './gitWorkflowService.js';

// ---- OBSERVABILITY (1) ----
import { IObservabilityService } from '../common/observabilityService.js';
import { ObservabilityService } from './observabilityService.js';

// ---- UI (1) ----
import { IRealUIIntegrationService } from '../common/realUIIntegration.js';
import { RealUIIntegrationService } from './realUIIntegrationService.js';

// ---- Consumed internally (side-effect imports for module loading) ----
import './longHorizonMemoryService.js';
import './autonomousRepairService.js';
import './executionVerificationService.js';
import './multiAgentExecutionService.js';
import './contextWindowOptimizationService.js';
import './executionGraphService.js';
import './aiUnifiedStateService.js';
import './aiExecutionService.js';
import './agentOrchestratorService.js';
import './executionSandboxService.js';
import './aiContextService.js';
import './autonomousExecutionService.js';
import './tokenEstimationService.js';

// ---- Real UI Product Contribution ----
import './aiProductContribution.js';

// =====================================================================
// SINGLETON REGISTRATIONS
// 9 core services + 1 auto-registered workbench contribution
// =====================================================================

// EXECUTION (2)
registerSingleton(IAutonomousExecutionLoopService, AutonomousExecutionLoopService, InstantiationType.Delayed);
registerSingleton(ITerminalExecutionBridgeService, TerminalExecutionBridgeService, InstantiationType.Delayed);

// LLM (1)
registerSingleton(ILLMProviderService, LLMProviderService, InstantiationType.Delayed);

// MEMORY (1)
registerSingleton(IProjectMemoryService, ProjectMemoryService, InstantiationType.Delayed);

// REPOSITORY (2)
registerSingleton(IRepositoryIntelligenceService, RepositoryIntelligenceService, InstantiationType.Delayed);
registerSingleton(ICodeEditingService, CodeEditingService, InstantiationType.Delayed);

// GIT (1)
registerSingleton(IGitWorkflowService, GitWorkflowService, InstantiationType.Delayed);

// OBSERVABILITY (1)
registerSingleton(IObservabilityService, ObservabilityService, InstantiationType.Delayed);

// UI (1)
registerSingleton(IRealUIIntegrationService, RealUIIntegrationService, InstantiationType.Delayed);
