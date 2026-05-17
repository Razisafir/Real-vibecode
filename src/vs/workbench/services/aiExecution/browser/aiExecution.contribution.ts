/*---------------------------------------------------------------------------------------------
 *  AI Execution Kernel -- Phase 30: Integration, DI Fix & Deterministic Execution
 *  Real Vibecode -- AI-Native IDE
 *
 *  aiExecution.contribution.ts -- Service registration + real UI wiring.
 *
 *  PHASE 30: ALL services that are injected via DI MUST be registered here.
 *  No fictional absorption. No dead side-effect imports. Every registered
 *  singleton has its constructor dependencies also registered.
 *
 *  ACTIVE SINGLETONS (15):
 *    EXECUTION (3):  AutonomousExecutionLoop, TerminalExecutionBridge, TerminalSessionManager
 *    EDITING (1):    TransactionalEdit
 *    LLM (4):        LLMProvider, ModelRegistry, CredentialStore, ProviderHealth
 *    MEMORY (1):     ProjectMemory
 *    SAFETY (4):     CostGovernor, ExecutionLock, CommandSafety, ExecutionSanity
 *    REPAIR (1):     RepairIntelligence
 *    INTELLIGENCE (1): StreamingOutput
 *
 *  RE-REGISTERED (absorption was fictional; these are still injected):
 *    GitWorkflow (injected by AutonomousExecutionLoop, not absorbed)
 *    RepositoryIntelligence (injected by AutonomousExecutionLoop, not absorbed)
 *    CodeEditing (injected by AutonomousExecutionLoop during transition to TransactionalEdit)
 *
 *  REMOVED: IObservabilityService (was injected but never used in any method body)
 *  REMOVED: All dead side-effect imports that served no DI purpose
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

// ---- LLM (4) ----
import { ILLMProviderService, IModelRegistryService, ICredentialStoreService, IProviderHealthService } from '../common/llmProvider.js';
import { LLMProviderService, ModelRegistryService, CredentialStoreService, ProviderHealthService } from './llmProviderService.js';

// ---- MEMORY (1) ----
import { IProjectMemoryService } from '../common/projectMemory.js';
import { ProjectMemoryService } from './projectMemoryService.js';

// ---- SAFETY (4) ----
import { ICostGovernorService } from '../common/costGovernor.js';
import { CostGovernorService } from './costGovernorService.js';
import { IExecutionLockService } from '../common/executionLock.js';
import { ExecutionLockService } from './executionLockService.js';
import { ICommandSafetyService } from '../common/commandSafety.js';
import { CommandSafetyService } from './commandSafetyService.js';
import { IExecutionSanityService } from '../common/executionSanity.js';
import { ExecutionSanityService } from './executionSanityService.js';

// ---- REPAIR (1) ----
import { IRepairIntelligenceService } from '../common/repairIntelligence.js';
import { RepairIntelligenceService } from './repairIntelligenceService.js';

// ---- INTELLIGENCE (1) ----
import { IStreamingOutputService } from '../common/streamingOutput.js';
import { StreamingOutputService } from './streamingOutputService.js';

// ---- RE-REGISTERED (still injected, absorption was fictional) ----
import { IGitWorkflowService } from '../common/gitWorkflow.js';
import { GitWorkflowService } from './gitWorkflowService.js';
import { IRepositoryIntelligenceService } from '../common/repositoryIntelligence.js';
import { RepositoryIntelligenceService } from './repositoryIntelligenceService.js';
import { ICodeEditingService } from '../common/codeEditing.js';
import { CodeEditingService } from './codeEditingService.js';

// ---- Real UI Product Contribution ----
import './aiProductContribution.js';

// =====================================================================
// SINGLETON REGISTRATIONS
// 15 core singletons + 3 re-registered + 1 auto-registered workbench contribution
// Every registered singleton's constructor dependencies are also registered.
// =====================================================================

// EXECUTION (3)
registerSingleton(IAutonomousExecutionLoopService, AutonomousExecutionLoopService, InstantiationType.Delayed);
registerSingleton(ITerminalExecutionBridgeService, TerminalExecutionBridgeService, InstantiationType.Delayed);
registerSingleton(ITerminalSessionManagerService, TerminalSessionManagerService, InstantiationType.Delayed);

// EDITING (1)
registerSingleton(ITransactionalEditService, TransactionalEditService, InstantiationType.Delayed);

// LLM (4)
registerSingleton(ILLMProviderService, LLMProviderService, InstantiationType.Delayed);
registerSingleton(IModelRegistryService, ModelRegistryService, InstantiationType.Delayed);
registerSingleton(ICredentialStoreService, CredentialStoreService, InstantiationType.Delayed);
registerSingleton(IProviderHealthService, ProviderHealthService, InstantiationType.Delayed);

// MEMORY (1)
registerSingleton(IProjectMemoryService, ProjectMemoryService, InstantiationType.Delayed);

// SAFETY (4)
registerSingleton(ICostGovernorService, CostGovernorService, InstantiationType.Delayed);
registerSingleton(IExecutionLockService, ExecutionLockService, InstantiationType.Delayed);
registerSingleton(ICommandSafetyService, CommandSafetyService, InstantiationType.Delayed);
registerSingleton(IExecutionSanityService, ExecutionSanityService, InstantiationType.Delayed);

// REPAIR (1)
registerSingleton(IRepairIntelligenceService, RepairIntelligenceService, InstantiationType.Delayed);

// INTELLIGENCE (1)
registerSingleton(IStreamingOutputService, StreamingOutputService, InstantiationType.Delayed);

// RE-REGISTERED (absorption was fictional; these are still injected by consumers)
registerSingleton(IGitWorkflowService, GitWorkflowService, InstantiationType.Delayed);
registerSingleton(IRepositoryIntelligenceService, RepositoryIntelligenceService, InstantiationType.Delayed);
registerSingleton(ICodeEditingService, CodeEditingService, InstantiationType.Delayed);
