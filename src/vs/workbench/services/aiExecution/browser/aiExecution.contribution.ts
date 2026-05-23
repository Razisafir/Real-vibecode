/*---------------------------------------------------------------------------------------------
 *  AI Execution Kernel -- Phase 33: Real Smoke Tests, Dead Import Cleanup & Execution Loop Reality Check
 *  Real Vibecode -- AI-Native IDE
 *
 *  aiExecution.contribution.ts -- Service registration + real UI wiring.
 *
 *  PHASE 32: ALL services that are injected via DI MUST be registered here.
 *  No fictional absorption. No dead side-effect imports. Every registered
 *  singleton has its constructor dependencies also registered.
 *
 *  REGISTERED SINGLETONS (29):
 *    EXECUTION (6):  AutonomousExecutionLoop, TerminalExecutionBridge, TerminalSessionManager,
 *                     AutonomousExecution, ExecutionSandbox, ExecutionGraph
 *    EDITING (2):    TransactionalEdit, CodeEditing
 *    LLM (5):        LLMProvider, ModelRegistry, CredentialStore, ProviderHealth, DynamicModelDiscovery
 *    MEMORY (2):     ProjectMemory, LongHorizonMemory
 *    SAFETY (4):     CostGovernor, ExecutionLock, CommandSafety, ExecutionSanity
 *    REPAIR (2):     RepairIntelligence, AutonomousRepair
 *    INTELLIGENCE (3): StreamingOutput, ExecutionVerification, AIContext
 *    ORCHESTRATION (3): MultiAgentExecution, ContextWindowOptimization, AgentOrchestrator
 *    UI (1):         RealUIIntegration
 *    STATE (1):      AIUnifiedState
 *
 *  RE-REGISTERED (3 - still injected by consumers, absorption was fictional):
 *    GitWorkflow, RepositoryIntelligence, AIExecution
 *
 *  KNOWN GAPS:
 *    - IObservabilityService: Removed from AIProductContribution (was injected but never used)
 *    - ITokenEstimationService: Removed from AIProductContribution (was injected but never used)
 *
 *  PHASE 32 FIXES:
 *    - session.id scoping bug in TerminalExecutionBridgeService FIXED
 *    - markComplete() now called in error path before unregisterStream()
 *    - BudgetExceededError thrown consistently from both sendRequestToProvider and sendRequestWithFallback
 *    - Dead code removed from AIProductContribution (IInstantiationService, CheckpointType, ExecutionEventType)
 *--------------------------------------------------------------------------------------------*/

import { InstantiationType, registerSingleton } from '../../../../platform/instantiation/common/extensions.js';

// ---- EXECUTION (5) ----
import { IAutonomousExecutionLoopService } from '../common/autonomousExecutionLoop.js';
import { AutonomousExecutionLoopService } from './autonomousExecutionLoopService.js';
import { ITerminalExecutionBridgeService } from '../common/terminalExecutionBridge.js';
import { TerminalExecutionBridgeService } from './terminalExecutionBridgeService.js';
import { ITerminalSessionManagerService } from '../common/terminalSessionManager.js';
import { TerminalSessionManagerService } from './terminalSessionManagerService.js';
import { IAutonomousExecutionService } from '../common/autonomousExecution.js';
import { AutonomousExecutionService } from './autonomousExecutionService.js';
import { IExecutionSandboxService } from '../common/executionSandbox.js';
import { ExecutionSandboxService } from './executionSandboxService.js';

// ---- EDITING (2) ----
import { ITransactionalEditService } from '../common/transactionalEdit.js';
import { TransactionalEditService } from './transactionalEditService.js';
import { ICodeEditingService } from '../common/codeEditing.js';
import { CodeEditingService } from './codeEditingService.js';

// ---- LLM (5) ----
import { ILLMProviderService, IModelRegistryService, ICredentialStoreService, IProviderHealthService, IDynamicModelDiscoveryService } from '../common/llmProvider.js';
import { LLMProviderService, ModelRegistryService, CredentialStoreService, ProviderHealthService } from './llmProviderService.js';
import { DynamicModelDiscoveryService } from './dynamicModelDiscoveryService.js';

// ---- MEMORY (2) ----
import { IProjectMemoryService } from '../common/projectMemory.js';
import { ProjectMemoryService } from './projectMemoryService.js';
import { ILongHorizonMemoryService } from '../common/longHorizonMemory.js';
import { LongHorizonMemoryService } from './longHorizonMemoryService.js';

// ---- SAFETY (4) ----
import { ICostGovernorService } from '../common/costGovernor.js';
import { CostGovernorService } from './costGovernorService.js';
import { IExecutionLockService } from '../common/executionLock.js';
import { ExecutionLockService } from './executionLockService.js';
import { ICommandSafetyService } from '../common/commandSafety.js';
import { CommandSafetyService } from './commandSafetyService.js';
import { IExecutionSanityService } from '../common/executionSanity.js';
import { ExecutionSanityService } from './executionSanityService.js';

// ---- REPAIR (2) ----
import { IRepairIntelligenceService } from '../common/repairIntelligence.js';
import { RepairIntelligenceService } from './repairIntelligenceService.js';
import { IAutonomousRepairService } from '../common/autonomousRepair.js';
import { AutonomousRepairService } from './autonomousRepairService.js';

// ---- INTELLIGENCE (2) ----
import { IStreamingOutputService } from '../common/streamingOutput.js';
import { StreamingOutputService } from './streamingOutputService.js';
import { IExecutionVerificationService } from '../common/executionVerification.js';
import { ExecutionVerificationService } from './executionVerificationService.js';

// ---- ORCHESTRATION (2) ----
import { IMultiAgentExecutionService } from '../common/multiAgentExecution.js';
import { MultiAgentExecutionService } from './multiAgentExecutionService.js';
import { IContextWindowOptimizationService } from '../common/contextWindowOptimization.js';
import { ContextWindowOptimizationService } from './contextWindowOptimizationService.js';

// ---- UI (1) ----
import { IRealUIIntegrationService } from '../common/realUIIntegration.js';
import { RealUIIntegrationService } from './realUIIntegrationService.js';

// ---- STATE (1) ----
import { IAIUnifiedStateService } from '../common/aiUnifiedStateService.js';
import { AIUnifiedStateService } from './aiUnifiedStateService.js';

// ---- RE-REGISTERED (still injected by consumers, absorption was fictional) ----
import { IGitWorkflowService } from '../common/gitWorkflow.js';
import { GitWorkflowService } from './gitWorkflowService.js';
import { IRepositoryIntelligenceService } from '../common/repositoryIntelligence.js';
import { RepositoryIntelligenceService } from './repositoryIntelligenceService.js';
import { IAIExecutionService } from '../common/aiExecutionService.js';
import { AIExecutionService } from './aiExecutionService.js';

// ---- AI CORE (3) — were listed as known gaps, now registered ----
import { IExecutionGraphService } from '../common/executionGraphService.js';
import { ExecutionGraphService } from './executionGraphService.js';
import { IAgentOrchestratorService } from '../common/agentOrchestratorService.js';
import { AgentOrchestratorService } from './agentOrchestratorService.js';
import { IAIContextService } from '../common/aiContextService.js';
import { AIContextService } from './aiContextService.js';

// ---- ROLLBACK (1) — actual undo/restore operations for execution graph nodes ----
import { IRollbackEngineService } from '../common/rollbackEngine.js';
import { RollbackEngineService } from './rollbackEngineService.js';

// ---- VISUALIZATION (4) — render graph/memory/health/cost as HTML for webviews ----
import { IKnowledgeGraphVisualizationService } from './knowledgeGraphVisualizationService.js';
import { KnowledgeGraphVisualizationService } from './knowledgeGraphVisualizationService.js';
import { IMemoryVisualizationService } from './memoryVisualizationService.js';
import { MemoryVisualizationService } from './memoryVisualizationService.js';
import { IProviderHealthDashboardService } from './providerHealthDashboard.js';
import { ProviderHealthDashboardService } from './providerHealthDashboard.js';
import { ICostGovernorDashboardService } from './costGovernorDashboard.js';
import { CostGovernorDashboardService } from './costGovernorDashboard.js';

// ---- BROWSER AUTOMATION (1) — Playwright + fetch fallback for web research ----
import { IPlaywrightBrowserService } from './playwrightBrowserService.js';
import { PlaywrightBrowserService } from './playwrightBrowserService.js';

// ---- VOICE INPUT (1) — Speech-to-text for AI commands via Web Speech API ----
import { IVoiceInputService } from '../common/voiceInput.js';
import { VoiceInputService } from './voiceInputService.js';

// ---- Real UI Product Contribution ----
import './aiProductContribution.js';

// ---- VibeCode Theme Registration ----
// Registers VibeCode Dark 2026 and Light 2026 in the VS Code theme picker
import './vibecodeThemes.contribution.js';

// ---- Execution Progress Indicator (status bar) ----
// Shows animated progress in the status bar when AI is executing autonomously
import './executionProgressContribution.js';

// ---- AI Service Error Handler (error boundaries) ----
// Wraps AI service calls with error recovery, notifications, and graceful degradation
import './aiServiceErrorHandler.js';

// ---- Git AI Contribution ----
// AI-driven git operations: AI Commit, AI Branch, AI PR
// Uses IGitWorkflowService, IRepositoryIntelligenceService, and ILLMProviderService
import './gitAIContribution.js';

// ---- Voice Input Contribution ----
// Registers Ctrl+Shift+V keybinding, status bar indicator, and text insertion
import './voiceInputContribution.js';

// =====================================================================
// SINGLETON REGISTRATIONS
// 28 core singletons + 3 re-registered + 1 auto-registered workbench contribution
//
// Every registered singleton's constructor dependencies are also registered.
// If a service is injected, it must be registered. If a legacy service is
// injected but doesn't exist, the injection must be removed instead.
// =====================================================================

// EXECUTION (6)
registerSingleton(IAutonomousExecutionLoopService, AutonomousExecutionLoopService, InstantiationType.Delayed);
registerSingleton(ITerminalExecutionBridgeService, TerminalExecutionBridgeService, InstantiationType.Delayed);
registerSingleton(ITerminalSessionManagerService, TerminalSessionManagerService, InstantiationType.Delayed);
registerSingleton(IAutonomousExecutionService, AutonomousExecutionService, InstantiationType.Delayed);
registerSingleton(IExecutionSandboxService, ExecutionSandboxService, InstantiationType.Delayed);
registerSingleton(IExecutionGraphService, ExecutionGraphService, InstantiationType.Delayed);

// EDITING (2)
registerSingleton(ITransactionalEditService, TransactionalEditService, InstantiationType.Delayed);
registerSingleton(ICodeEditingService, CodeEditingService, InstantiationType.Delayed);

// LLM (5)
registerSingleton(ILLMProviderService, LLMProviderService, InstantiationType.Delayed);
registerSingleton(IModelRegistryService, ModelRegistryService, InstantiationType.Delayed);
registerSingleton(ICredentialStoreService, CredentialStoreService, InstantiationType.Delayed);
registerSingleton(IProviderHealthService, ProviderHealthService, InstantiationType.Delayed);
registerSingleton(IDynamicModelDiscoveryService, DynamicModelDiscoveryService, InstantiationType.Eager);

// MEMORY (2)
registerSingleton(IProjectMemoryService, ProjectMemoryService, InstantiationType.Delayed);
registerSingleton(ILongHorizonMemoryService, LongHorizonMemoryService, InstantiationType.Delayed);

// SAFETY (4)
registerSingleton(ICostGovernorService, CostGovernorService, InstantiationType.Delayed);
registerSingleton(IExecutionLockService, ExecutionLockService, InstantiationType.Delayed);
registerSingleton(ICommandSafetyService, CommandSafetyService, InstantiationType.Delayed);
registerSingleton(IExecutionSanityService, ExecutionSanityService, InstantiationType.Delayed);

// REPAIR (2)
registerSingleton(IRepairIntelligenceService, RepairIntelligenceService, InstantiationType.Delayed);
registerSingleton(IAutonomousRepairService, AutonomousRepairService, InstantiationType.Delayed);

// INTELLIGENCE (3)
registerSingleton(IStreamingOutputService, StreamingOutputService, InstantiationType.Delayed);
registerSingleton(IExecutionVerificationService, ExecutionVerificationService, InstantiationType.Delayed);
registerSingleton(IAIContextService, AIContextService, InstantiationType.Delayed);

// ORCHESTRATION (3)
registerSingleton(IMultiAgentExecutionService, MultiAgentExecutionService, InstantiationType.Delayed);
registerSingleton(IContextWindowOptimizationService, ContextWindowOptimizationService, InstantiationType.Delayed);
registerSingleton(IAgentOrchestratorService, AgentOrchestratorService, InstantiationType.Delayed);

// UI (1)
registerSingleton(IRealUIIntegrationService, RealUIIntegrationService, InstantiationType.Delayed);

// STATE (1)
registerSingleton(IAIUnifiedStateService, AIUnifiedStateService, InstantiationType.Delayed);

// RE-REGISTERED (absorption was fictional; these are still injected by consumers)
registerSingleton(IGitWorkflowService, GitWorkflowService, InstantiationType.Delayed);
registerSingleton(IRepositoryIntelligenceService, RepositoryIntelligenceService, InstantiationType.Delayed);
registerSingleton(IAIExecutionService, AIExecutionService, InstantiationType.Delayed);

// ROLLBACK (1) — actual undo/restore operations for execution graph nodes
registerSingleton(IRollbackEngineService, RollbackEngineService, InstantiationType.Eager);

// VISUALIZATION (4) — render graph/memory/health/cost as HTML for sidebar webview panels
registerSingleton(IKnowledgeGraphVisualizationService, KnowledgeGraphVisualizationService, InstantiationType.Delayed);
registerSingleton(IMemoryVisualizationService, MemoryVisualizationService, InstantiationType.Delayed);
registerSingleton(IProviderHealthDashboardService, ProviderHealthDashboardService, InstantiationType.Delayed);
registerSingleton(ICostGovernorDashboardService, CostGovernorDashboardService, InstantiationType.Delayed);

// BROWSER AUTOMATION (1) — Playwright + fetch fallback for web research and URL browsing
registerSingleton(IPlaywrightBrowserService, PlaywrightBrowserService, InstantiationType.Eager);

// VOICE INPUT (1) — Speech-to-text for AI commands via Web Speech API
registerSingleton(IVoiceInputService, VoiceInputService, InstantiationType.Eager);
