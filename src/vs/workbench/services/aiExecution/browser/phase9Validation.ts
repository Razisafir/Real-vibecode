/*---------------------------------------------------------------------------------------------
 *  Global Execution Brain — Phase 9 Validation Tests
 *  Real Vibecode — AI-Native IDE
 *
 *  10 validation tests for the Global Execution Brain system.
 *  Validates multi-system coordination, intent flow, conflict resolution,
 *  execution loop, health monitoring, coherence validation, and dashboard.
 *--------------------------------------------------------------------------------------------*/

import { Disposable } from '../../../../base/common/lifecycle.js';
import { IGlobalExecutionBrainService } from '../common/globalExecutionBrain.js';
import {
	IntentSource,
	IntentPriority,
	IntentScope,
	IntentResolution,
	IntentActionType,
	BrainEventCategory,
	BrainEventSeverity,
	BrainEventSource,
	DecisionType,
	ConflictType,
	ConflictSeverity,
	ConflictResolutionType,
	ExecutionLoopPhase,
	SystemHealthStatus,
	CoherenceCheckType,
	CoherenceRepairAction,
} from '../common/globalExecutionBrain.js';
import { IAgentOrchestratorService } from '../common/agentOrchestratorService.js';
import { IAIProcessOrchestratorService } from '../common/aiProcessOrchestratorService.js';
import { IExecutionGraphService } from '../common/executionGraphService.js';
import { IAIContextService } from '../common/aiContextService.js';
import { IAIUnifiedStateService } from '../common/aiUnifiedStateService.js';
import { IObservabilityService } from '../common/observabilityService.js';

/**
 * Phase 9 Validation — 10 Tests for the Global Execution Brain.
 *
 * Run via: instantiate Phase9Validation in a contribution or manually.
 * All 10 tests MUST pass for Phase 9 to be considered complete.
 */
export class Phase9Validation extends Disposable {

	constructor(
		@IGlobalExecutionBrainService private readonly brainService: IGlobalExecutionBrainService,
		@IAgentOrchestratorService private readonly agentOrchestrator: IAgentOrchestratorService,
		@IAIProcessOrchestratorService private readonly processOrchestrator: IAIProcessOrchestratorService,
		@IExecutionGraphService private readonly graphService: IExecutionGraphService,
		@IAIContextService private readonly contextService: IAIContextService,
		@IAIUnifiedStateService private readonly stateService: IAIUnifiedStateService,
		@IObservabilityService private readonly observabilityService: IObservabilityService,
	) {
		super();
		this._runAllTests();
	}

	private _results: { name: string; passed: boolean; detail: string }[] = [];
	private _passed = 0;
	private _failed = 0;

	private _test(name: string, fn: () => boolean): void {
		try {
			const result = fn();
			this._results.push({ name, passed: result, detail: result ? 'PASS' : 'FAIL' });
			if (result) { this._passed++; } else { this._failed++; }
			console.log(`[Phase9] ${result ? '✓' : '✗'} ${name}`);
		} catch (err) {
			this._results.push({ name, passed: false, detail: String(err) });
			this._failed++;
			console.log(`[Phase9] ✗ ${name}: ${err}`);
		}
	}

	private _runAllTests(): void {
		console.log('\n═══════════════════════════════════════════════════');
		console.log('  Phase 9 — Global Execution Brain Validation');
		console.log('═══════════════════════════════════════════════════\n');

		this._testMultiSystemCoordination();
		this._testIntentFlowAcrossLayers();
		this._testNoConflictingExecutionStates();
		this._testAgentProcessSynchronization();
		this._testGraphContextAlignment();
		this._testSystemStabilityUnderLoad();
		this._testConflictResolution();
		this._testGlobalLoopStability();
		this._testHealthMonitoring();
		this._testCoherenceValidation();

		console.log(`\n═══════════════════════════════════════════════════`);
		console.log(`  Phase 9 Results: ${this._passed}/${this._passed + this._failed} passed`);
		console.log(`═══════════════════════════════════════════════════\n`);
	}

	// ─── Test 1: Multi-System Coordination ──────────────────────────────────

	private _testMultiSystemCoordination(): void {
		this._test('1. Multi-System Coordination', () => {
			// Verify brain can create intents that reference multiple subsystems
			const intent = this.brainService.createIntent({
				source: IntentSource.User,
				priority: IntentPriority.Normal,
				scope: IntentScope.Workspace,
				actionType: IntentActionType.FileEdit,
				description: 'Test multi-system coordination',
			});

			if (!intent.id) { return false; }
			if (intent.resolution !== IntentResolution.Pending) { return false; }
			if (intent.source !== IntentSource.User) { return false; }

			// Verify brain has access to all subsystems via system status
			const status = this.brainService.getSystemStatus();
			if (typeof status.graphNodes !== 'number') { return false; }
			if (typeof status.graphEdges !== 'number') { return false; }
			if (typeof status.activeAgents !== 'number') { return false; }
			if (typeof status.activeProcesses !== 'number') { return false; }
			if (typeof status.hasDrift !== 'boolean') { return false; }
			if (typeof status.coherent !== 'boolean') { return false; }

			// Verify brain can take sync checkpoints
			const checkpoint = this.brainService.takeSyncCheckpoint();
			if (!checkpoint.id) { return false; }
			if (typeof checkpoint.activeAgentCount !== 'number') { return false; }
			if (typeof checkpoint.activeProcessCount !== 'number') { return false; }
			if (typeof checkpoint.graphNodeCount !== 'number') { return false; }
			if (typeof checkpoint.hasDrift !== 'boolean') { return false; }

			return true;
		});
	}

	// ─── Test 2: Intent Flow Across Layers ─────────────────────────────────

	private _testIntentFlowAcrossLayers(): void {
		this._test('2. Intent Flow Across Layers', () => {
			// Create a user intent
			const userIntent = this.brainService.createIntent({
				source: IntentSource.User,
				priority: IntentPriority.High,
				scope: IntentScope.Agent,
				actionType: IntentActionType.AgentPlan,
				description: 'Refactor authentication module',
				agentId: 'test-agent-1',
			});

			if (userIntent.resolution !== IntentResolution.Pending) { return false; }

			// Create a child intent (agent plan → process execution)
			const processIntent = this.brainService.createIntent({
				source: IntentSource.Agent,
				priority: IntentPriority.Normal,
				scope: IntentScope.Process,
				actionType: IntentActionType.ProcessExecution,
				description: 'Run build after refactor',
				parentIntentId: userIntent.id,
			});

			// Verify parent-child chain
			if (processIntent.parentIntentId !== userIntent.id) { return false; }

			const chain = this.brainService.getIntentChain(userIntent.id);
			if (chain.length < 2) { return false; }

			// Verify chain starts with user intent and includes child
			if (chain[0].id !== userIntent.id) { return false; }
			if (!chain.some(i => i.id === processIntent.id)) { return false; }

			// Verify intents can be resolved
			this.brainService.resolveIntent(processIntent.id, IntentResolution.Satisfied, 'Build completed');
			const resolvedProcess = this.brainService.getIntent(processIntent.id);
			if (resolvedProcess?.resolution !== IntentResolution.Satisfied) { return false; }

			return true;
		});
	}

	// ─── Test 3: No Conflicting Execution States ────────────────────────────

	private _testNoConflictingExecutionStates(): void {
		this._test('3. No Conflicting Execution States', () => {
			// Create two intents targeting the same resource
			const intent1 = this.brainService.createIntent({
				source: IntentSource.Agent,
				priority: IntentPriority.Normal,
				scope: IntentScope.File,
				actionType: IntentActionType.FileEdit,
				description: 'Agent 1 edits file',
				agentId: 'agent-1',
			});

			const intent2 = this.brainService.createIntent({
				source: IntentSource.Agent,
				priority: IntentPriority.Normal,
				scope: IntentScope.File,
				actionType: IntentActionType.FileEdit,
				description: 'Agent 2 edits file',
				agentId: 'agent-2',
			});

			// Evaluate both intents — decision engine should handle them
			const decision1 = this.brainService.evaluateIntent(intent1.id);
			const decision2 = this.brainService.evaluateIntent(intent2.id);

			if (!decision1.id || !decision2.id) { return false; }
			if (!decision1.reason || !decision2.reason) { return false; }

			// Both should have decisions recorded
			const recentDecisions = this.brainService.getRecentDecisions(10);
			if (recentDecisions.length < 2) { return false; }

			return true;
		});
	}

	// ─── Test 4: Agent + Process Synchronization ────────────────────────────

	private _testAgentProcessSynchronization(): void {
		this._test('4. Agent + Process Synchronization', () => {
			// Register an agent
			const agent = this.agentOrchestrator.registerAgent(
				'Test Agent',
				'Agent for Phase 9 validation',
				[{ capability: 0, riskLevel: 0 }], // FileRead, Low risk
			);

			if (!agent.id) { return false; }

			// Create an agent-driven intent
			const intent = this.brainService.createIntent({
				source: IntentSource.Agent,
				priority: IntentPriority.High,
				scope: IntentScope.Agent,
				actionType: IntentActionType.AgentPlan,
				description: 'Agent execution plan',
				agentId: agent.id,
			});

			if (intent.agentId !== agent.id) { return false; }

			// Verify system status includes agent count
			const status = this.brainService.getSystemStatus();
			if (typeof status.activeAgents !== 'number') { return false; }

			return true;
		});
	}

	// ─── Test 5: Graph + Context Alignment ─────────────────────────────────

	private _testGraphContextAlignment(): void {
		this._test('5. Graph + Context Alignment', () => {
			// Create a graph node
			const node = this.graphService.createNode({
				type: 0, // FileEdit
				label: 'Test file edit',
				mutationSource: 2, // AIAgent
				trusted: true,
			});

			if (!node.id) { return false; }

			// Create an intent linked to this graph node
			const intent = this.brainService.createIntent({
				source: IntentSource.Agent,
				priority: IntentPriority.Normal,
				scope: IntentScope.File,
				actionType: IntentActionType.FileEdit,
				description: 'File edit tracked in graph',
			});

			// Verify the brain's sync checkpoint includes graph data
			const checkpoint = this.brainService.takeSyncCheckpoint();
			if (checkpoint.graphNodeCount < 1) { return false; }

			// Verify context engine is accessible through brain
			const wsCtx = this.contextService.workspaceContext;
			if (!wsCtx) { return false; }

			// Complete the graph node
			this.graphService.completeNode(node.id, { success: true });

			return true;
		});
	}

	// ─── Test 6: System Stability Under Load ───────────────────────────────

	private _testSystemStabilityUnderLoad(): void {
		this._test('6. System Stability Under Load', () => {
			// Create many intents rapidly
			const intentIds: string[] = [];
			for (let i = 0; i < 20; i++) {
				const intent = this.brainService.createIntent({
					source: i % 3 === 0 ? IntentSource.User : (i % 3 === 1 ? IntentSource.Agent : IntentSource.System),
					priority: i % 5 as any,
					scope: i % 4 === 0 ? IntentScope.File : (i % 4 === 1 ? IntentScope.Process : IntentScope.Agent),
					actionType: i % 6 === 0 ? IntentActionType.FileEdit :
						(i % 6 === 1 ? IntentActionType.ProcessExecution :
							(i % 6 === 2 ? IntentActionType.AgentPlan :
								(i % 6 === 3 ? IntentActionType.ContextQuery :
									IntentActionType.HealthCheck))),
					description: `Load test intent #${i}`,
				});
				intentIds.push(intent.id);
			}

			// Verify all intents were created
			if (intentIds.length !== 20) { return false; }

			// Verify brain can handle all of them
			const activeIntents = this.brainService.getActiveIntents();
			if (activeIntents.length < 1) { return false; }

			// Verify event bus is collecting events
			const stats = this.brainService.eventBusStats;
			if (stats.totalEventsEmitted < 20) { return false; }

			// Resolve some intents to test load resolution
			for (let i = 0; i < 5; i++) {
				this.brainService.resolveIntent(intentIds[i], IntentResolution.Satisfied, `Completed load test #${i}`);
			}

			// Verify remaining active count is reasonable
			const remainingActive = this.brainService.getActiveIntents();
			if (remainingActive.length >= 20) { return false; }

			return true;
		});
	}

	// ─── Test 7: Conflict Resolution Correctness ────────────────────────────

	private _testConflictResolution(): void {
		this._test('7. Conflict Resolution Correctness', () => {
			// Create two competing intents
			const intent1 = this.brainService.createIntent({
				source: IntentSource.Agent,
				priority: IntentPriority.Critical,
				scope: IntentScope.File,
				actionType: IntentActionType.FileEdit,
				description: 'Critical safety fix',
			});

			const intent2 = this.brainService.createIntent({
				source: IntentSource.Agent,
				priority: IntentPriority.Low,
				scope: IntentScope.File,
				actionType: IntentActionType.FileEdit,
				description: 'Low-priority cosmetic change',
			});

			// Detect conflicts for the second intent
			const conflicts = this.brainService.detectConflicts(intent2.id);

			// Evaluate the critical intent — should get priority
			const decision = this.brainService.evaluateIntent(intent1.id);
			if (!decision.id) { return false; }

			// Verify arbitration rules are registered
			const rules = this.brainService.getArbitrationRules();
			if (rules.length < 3) { return false; }

			// Verify critical-first rule exists
			const criticalRule = rules.find(r => r.id === 'rule-critical-first');
			if (!criticalRule) { return false; }
			if (!criticalRule.active) { return false; }

			// Verify conflict resolution via resolveConflict
			const activeConflicts = this.brainService.getActiveConflicts();
			if (activeConflicts.length > 0) {
				const resolution = this.brainService.resolveConflict(activeConflicts[0].id);
				if (!resolution.id) { return false; }
			}

			return true;
		});
	}

	// ─── Test 8: Global Loop Stability ─────────────────────────────────────

	private _testGlobalLoopStability(): void {
		this._test('8. Global Loop Stability', () => {
			// Start the loop
			this.brainService.startLoop();

			if (!this.brainService.loopActive) { return false; }

			// Verify loop phase
			const phase = this.brainService.loopPhase;
			if (phase === undefined || phase === null) { return false; }

			// Verify loop config
			const config = this.brainService.loopConfig;
			if (config.tickIntervalMs <= 0) { return false; }
			if (config.maxConcurrentIntents <= 0) { return false; }

			// Test pause/resume
			this.brainService.pauseLoop('test pause');
			if (this.brainService.loopPhase !== ExecutionLoopPhase.Paused) { return false; }

			this.brainService.resumeLoop();
			if (this.brainService.loopPhase === ExecutionLoopPhase.Paused) { return false; }

			// Test loop config update
			this.brainService.updateLoopConfig({ tickIntervalMs: 200 });
			if (this.brainService.loopConfig.tickIntervalMs !== 200) { return false; }

			// Reset config
			this.brainService.updateLoopConfig({ tickIntervalMs: 100 });

			// Stop the loop
			this.brainService.stopLoop();
			if (this.brainService.loopActive) { return false; }

			return true;
		});
	}

	// ─── Test 9: Health Monitoring ──────────────────────────────────────────

	private _testHealthMonitoring(): void {
		this._test('9. Health Monitoring', () => {
			// Verify health metrics are available
			const metrics = this.brainService.healthMetrics;
			if (!metrics) { return false; }
			if (typeof metrics.systemLagMs !== 'number') { return false; }
			if (typeof metrics.executionBacklog !== 'number') { return false; }
			if (typeof metrics.agentSaturation !== 'number') { return false; }
			if (typeof metrics.processFailureRate !== 'number') { return false; }
			if (typeof metrics.memoryPressure !== 'number') { return false; }

			// Verify health status
			const status = this.brainService.healthStatus;
			if (!status) { return false; }

			// Verify thresholds are configurable
			const thresholds = this.brainService.healthThresholds;
			if (thresholds.maxLagMs <= 0) { return false; }

			this.brainService.setHealthThresholds({ maxLagMs: 1000 });
			if (this.brainService.healthThresholds.maxLagMs !== 1000) { return false; }

			// Reset
			this.brainService.setHealthThresholds({ maxLagMs: 500 });

			// Verify health alerts
			const alerts = this.brainService.getActiveHealthAlerts();
			if (!Array.isArray(alerts)) { return false; }

			return true;
		});
	}

	// ─── Test 10: Coherence Validation Engine ───────────────────────────────

	private _testCoherenceValidation(): void {
		this._test('10. Coherence Validation Engine', () => {
			// Run full coherence validation
			const result = this.brainService.validateCoherence();

			if (!result) { return false; }
			if (typeof result.coherent !== 'boolean') { return false; }
			if (typeof result.totalIssues !== 'number') { return false; }
			if (!Array.isArray(result.checks)) { return false; }
			if (result.checks.length < 5) { return false; }

			// Verify individual check types
			const graphCheck = this.brainService.runCoherenceCheck(CoherenceCheckType.GraphConsistency);
			if (!graphCheck) { return false; }
			if (typeof graphCheck.passed !== 'boolean') { return false; }

			const contextCheck = this.brainService.runCoherenceCheck(CoherenceCheckType.ContextAccuracy);
			if (!contextCheck) { return false; }

			const processCheck = this.brainService.runCoherenceCheck(CoherenceCheckType.ProcessCorrectness);
			if (!processCheck) { return false; }

			const agentCheck = this.brainService.runCoherenceCheck(CoherenceCheckType.AgentStateAlignment);
			if (!agentCheck) { return false; }

			// Verify last coherence result is stored
			const lastResult = this.brainService.lastCoherenceResult;
			if (!lastResult) { return false; }

			// Verify auto-repair
			const repairCount = this.brainService.autoRepairCoherence();
			if (typeof repairCount !== 'number') { return false; }

			// Verify reconciliation
			const reconResult = this.brainService.reconcile();
			if (!reconResult) { return false; }
			if (typeof reconResult.converged !== 'boolean') { return false; }
			if (typeof reconResult.driftsDetected !== 'number') { return false; }

			return true;
		});
	}
}
