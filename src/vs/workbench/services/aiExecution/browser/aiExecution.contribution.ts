/*---------------------------------------------------------------------------------------------
 *  AI Execution Kernel -- Phase 29: Terminal Reality, Safety Hardening & True Execution Reliability
 *  Real Vibecode -- AI-Native IDE
 *
 *  aiExecution.contribution.ts -- Service registration + real UI wiring.
 *
 *  PHASE 29 REDUCTION: From 9 to 7 registered singletons.
 *
 *  MERGED IN PHASE 29 (8 services removed as separate singletons):
 *    - Observability: Absorbed by AutonomousExecutionLoopService
 *    - GitWorkflow: Absorbed by AutonomousExecutionLoopService
 *    - CodeEditing: Absorbed by TransactionalEditService
 *    - RepositoryIntelligence: Absorbed by ProjectMemoryService
 *    - RealUIIntegration: Absorbed by ProjectMemoryService
 *    - ExecutionLock: Absorbed by TransactionalEditService
 *    - StreamingOutput: Absorbed by TerminalSessionManagerService
 *    - CommandSafety: Absorbed by TerminalExecutionBridgeService
 *
 *  NEW IN PHASE 29 (4 services as singletons):
 *    - TerminalSessionManagerService: Session lifecycle tracking
 *    - TransactionalEditService: Atomic edit batches with rollback
 *    - RepairIntelligenceService: Iterative repair improvement with learning
 *    - ExecutionSanityService: Detect and prevent hallucinated success
 *    - CostGovernorService: Hard cost enforcement for LLM API usage
 *
 *  ACTIVE SINGLETONS (7):
 *    EXECUTION (3): AutonomousExecutionLoop, TerminalExecutionBridge, TerminalSessionManager
 *    EDITING (1):   TransactionalEdit
 *    LLM (1):       LLMProvider
 *    MEMORY (1):    ProjectMemory
 *    SAFETY (1):    CostGovernor
 *
 *  SIDE-EFFECT IMPORTS (non-singleton services loaded for module effects):
 *    - All Phase 29 browser services that are absorbed by singletons
 *    - Legacy services from prior phases (kept for module loading compatibility)
 *    - aiProductContribution.ts (auto-registers as workbench contribution)
 *--------------------------------------------------------------------------------------------*/

import { InstantiationType, registerSingleton } from '../../../../platform/instantiation/common/extensions.js';

// ---- EXECUTION (3) ----
import { IAutonomousExecutionLoopService } from '../common/autonomousExecutionLoop.js';
import { AutonomousExecutionLoopService } from './autonomousExecutionLoopService.js';
import { ITerminalExecutionBridgeService } from '../common/terminalExecutionBridge.js';
import { TerminalExecutionBridgeService } from './terminalExecutionBridgeService.js';
import { ITerminalSessionManagerService } from '../common/terminalSessionManager.js';
import { TerminalSessionManagerService } from './terminalSessionManagerService.js';

// ---- EDITING (1) ----
import { ITransactionalEditService } from '../common/transactionalEdit.js';
import { TransactionalEditService } from './transactionalEditService.js';

// ---- LLM (1) ----
import { ILLMProviderService } from '../common/llmProvider.js';
import { LLMProviderService } from './llmProviderService.js';

// ---- MEMORY (1) ----
import { IProjectMemoryService } from '../common/projectMemory.js';
import { ProjectMemoryService } from './projectMemoryService.js';

// ---- SAFETY (1) ----
import { ICostGovernorService } from '../common/costGovernor.js';
import { CostGovernorService } from './costGovernorService.js';

// ---- Phase 29 services absorbed by singletons (side-effect imports) ----
import './streamingOutputService.js';
import './executionLockService.js';
import './repairIntelligenceService.js';
import './executionSanityService.js';
import './commandSafetyService.js';

// ---- Absorbed Phase 28 services (side-effect imports for module loading) ----
import './repositoryIntelligenceService.js';
import './codeEditingService.js';
import './gitWorkflowService.js';
import './observabilityService.js';
import './realUIIntegrationService.js';

// ---- Legacy services (side-effect imports for module loading compatibility) ----
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
// 7 core singletons + 1 auto-registered workbench contribution
// =====================================================================

// EXECUTION (3)
registerSingleton(IAutonomousExecutionLoopService, AutonomousExecutionLoopService, InstantiationType.Delayed);
registerSingleton(ITerminalExecutionBridgeService, TerminalExecutionBridgeService, InstantiationType.Delayed);
registerSingleton(ITerminalSessionManagerService, TerminalSessionManagerService, InstantiationType.Delayed);

// EDITING (1)
registerSingleton(ITransactionalEditService, TransactionalEditService, InstantiationType.Delayed);

// LLM (1)
registerSingleton(ILLMProviderService, LLMProviderService, InstantiationType.Delayed);

// MEMORY (1)
registerSingleton(IProjectMemoryService, ProjectMemoryService, InstantiationType.Delayed);

// SAFETY (1)
registerSingleton(ICostGovernorService, CostGovernorService, InstantiationType.Delayed);
