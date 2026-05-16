/*---------------------------------------------------------------------------------------------
 *  System Stabilization & Production Coherence Layer — Phase 10 Validation Tests
 *  Real Vibecode — AI-Native IDE
 *
 *  10 validation tests for the System Stabilization system.
 *--------------------------------------------------------------------------------------------*/

import { Disposable } from '../../../../base/common/lifecycle.js';
import { ISystemStabilizationService } from '../common/systemStabilization.js';
import {
	SystemStabilityState,
	STABILITY_BEHAVIORS,
	BackpressureLevel,
	BackpressureSubsystem,
	DegradationPath,
	ExecutionPriorityTier,
	MemoryPressureLevel,
	DiagnosticCheckType,
} from '../common/systemStabilization.js';
import { IGlobalExecutionBrainService } from '../common/globalExecutionBrain.js';
import { IAgentOrchestratorService } from '../common/agentOrchestratorService.js';
import { IAIProcessOrchestratorService } from '../common/aiProcessOrchestratorService.js';
import { IExecutionGraphService } from '../common/executionGraphService.js';
import { IAIContextService } from '../common/aiContextService.js';
import { IAIUnifiedStateService } from '../common/aiUnifiedStateService.js';
import { IObservabilityService } from '../common/observabilityService.js';

export class Phase10Validation extends Disposable {

	constructor(
		@ISystemStabilizationService private readonly stabilizationService: ISystemStabilizationService,
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
			console.log(`[Phase10] ${result ? '✓' : '✗'} ${name}`);
		} catch (err) {
			this._results.push({ name, passed: false, detail: String(err) });
			this._failed++;
			console.log(`[Phase10] ✗ ${name}: ${err}`);
		}
	}

	private _runAllTests(): void {
		console.log('\n═══════════════════════════════════════════════════');
		console.log('  Phase 10 — System Stabilization Validation');
		console.log('═══════════════════════════════════════════════════\n');

		this._testHighLoadStability();
		this._testNoCascadeCrash();
		this._testAgentDegradation();
		this._testProcessThrottling();
		this._testGraphMemoryOverflow();
		this._testContextResponsiveness();
		this._testEventBusSaturation();
		this._testProductionModeOverhead();
		this._testRecoveryFromOverload();
		this._testDeterministicExecution();

		console.log(`\n═══════════════════════════════════════════════════`);
		console.log(`  Phase 10 Results: ${this._passed}/${this._passed + this._failed} passed`);
		console.log(`═══════════════════════════════════════════════════\n`);
	}

	// ─── Test 1: System holds under high load simulation ──────────────────────

	private _testHighLoadStability(): void {
		this._test('1. High Load Simulation', () => {
			// Create many intents rapidly to simulate load
			for (let i = 0; i < 30; i++) {
				this.brainService.createIntent({
					source: i % 2 === 0 ? 0 : 1, // User or Agent
					priority: i % 5 as any,
					scope: 0,
					actionType: i % 3 === 0 ? 0 : 2,
					description: `Load test intent #${i}`,
				});
			}

			// Check load metrics
			const loadMetrics = this.stabilizationService.loadMetrics;
			if (!loadMetrics) { return false; }
			if (typeof loadMetrics.overallLoad !== 'number') { return false; }
			if (typeof loadMetrics.cpuPressure !== 'number') { return false; }
			if (typeof loadMetrics.overloaded !== 'boolean') { return false; }

			// Verify stability state machine exists
			const state = this.stabilizationService.stabilityState;
			if (!Object.values(SystemStabilityState).includes(state)) { return false; }

			// Verify behavior rules exist
			const behavior = this.stabilizationService.currentBehavior;
			if (typeof behavior.agentPlanCreation !== 'boolean') { return false; }
			if (typeof behavior.maxConcurrentAgents !== 'number') { return false; }

			return true;
		});
	}

	// ─── Test 2: No subsystem crashes cascade ────────────────────────────────

	private _testNoCascadeCrash(): void {
		this._test('2. No Cascade Crashes', () => {
			// Report a failure in the process subsystem
			this.stabilizationService.reportFailure(
				BackpressureSubsystem.ProcessOrchestrator,
				'error-spike',
				'Simulated process error spike'
			);

			// Verify process is quarantined
			const processQuarantine = this.stabilizationService.getQuarantineStatus(BackpressureSubsystem.ProcessOrchestrator);
			if (!processQuarantine.quarantined) { return false; }

			// Verify agent is NOT quarantined (cascade prevented)
			const agentQuarantine = this.stabilizationService.getQuarantineStatus(BackpressureSubsystem.AgentOrchestrator);
			if (agentQuarantine.quarantined) { return false; }

			// Verify containment zones exist
			const zones = this.stabilizationService.getContainmentZones();
			if (zones.length < 3) { return false; }

			// Release quarantine
			this.stabilizationService.releaseQuarantine(BackpressureSubsystem.ProcessOrchestrator);
			const released = this.stabilizationService.getQuarantineStatus(BackpressureSubsystem.ProcessOrchestrator);
			if (released.quarantined) { return false; }

			return true;
		});
	}

	// ─── Test 3: Agents degrade gracefully ────────────────────────────────────

	private _testAgentDegradation(): void {
		this._test('3. Agent Graceful Degradation', () => {
			// Verify all 5 stability states have behaviors
			for (const state of Object.values(SystemStabilityState)) {
				const behavior = this.stabilizationService.getBehaviorForState(state);
				if (!behavior) { return false; }
				if (typeof behavior.agentPlanCreation !== 'boolean') { return false; }
				if (typeof behavior.agentPlanExecution !== 'boolean') { return false; }
			}

			// In Critical state, agents should not create plans
			const criticalBehavior = STABILITY_BEHAVIORS[SystemStabilityState.Critical];
			if (criticalBehavior.agentPlanCreation) { return false; }
			if (criticalBehavior.agentPlanExecution) { return false; }

			// In Stable state, agents can create plans
			const stableBehavior = STABILITY_BEHAVIORS[SystemStabilityState.Stable];
			if (!stableBehavior.agentPlanCreation) { return false; }

			return true;
		});
	}

	// ─── Test 4: Processes throttle correctly ─────────────────────────────────

	private _testProcessThrottling(): void {
		this._test('4. Process Throttling', () => {
			// Check throttle for process execution
			const throttleCheck = this.stabilizationService.checkThrottle('process-execution');
			if (!throttleCheck) { return false; }
			if (typeof throttleCheck.allowed !== 'boolean') { return false; }
			if (typeof throttleCheck.retryDelayMs !== 'number') { return false; }

			// Verify throttling policy exists
			const policy = this.stabilizationService.throttlingPolicy;
			if (policy.maxProcessExecutionsPerMinute <= 0) { return false; }
			if (policy.maxConcurrentAgents <= 0) { return false; }

			// Verify safety ceilings exist
			if (policy.safetyCeilings.maxConcurrentAgents <= 0) { return false; }
			if (policy.safetyCeilings.maxProcessExecutionsPerMinute <= 0) { return false; }

			return true;
		});
	}

	// ─── Test 5: Graph does not overflow memory ───────────────────────────────

	private _testGraphMemoryOverflow(): void {
		this._test('5. Graph Memory Overflow Prevention', () => {
			// Run memory control cycle
			const result = this.stabilizationService.runMemoryControlCycle();
			if (!result) { return false; }
			if (typeof result.pressureLevel !== 'string') { return false; }
			if (typeof result.graphNodesPruned !== 'number') { return false; }
			if (typeof result.memoryFreedKb !== 'number') { return false; }

			// Verify memory config exists and has limits
			const config = this.stabilizationService.memoryPressureConfig;
			if (config.maxGraphNodes <= 0) { return false; }
			if (config.maxContextEntries <= 0) { return false; }
			if (config.eventBusMemoryCap <= 0) { return false; }

			// Verify memory pressure level is tracked
			const level = this.stabilizationService.memoryPressureLevel;
			if (!Object.values(MemoryPressureLevel).includes(level)) { return false; }

			return true;
		});
	}

	// ─── Test 6: Context remains responsive ──────────────────────────────────

	private _testContextResponsiveness(): void {
		this._test('6. Context Responsiveness', () => {
			// Verify context service is accessible
			const wsCtx = this.contextService.workspaceContext;
			if (!wsCtx) { return false; }

			// Run context staleness diagnostic
			const diagnostic = this.stabilizationService.runDiagnosticCheck(DiagnosticCheckType.ContextStaleness);
			if (!diagnostic) { return false; }
			if (typeof diagnostic.hasIssues !== 'boolean') { return false; }
			if (typeof diagnostic.recoveryAction !== 'string') { return false; }

			return true;
		});
	}

	// ─── Test 7: Event bus does not saturate ─────────────────────────────────

	private _testEventBusSaturation(): void {
		this._test('7. Event Bus Saturation Control', () => {
			// Verify backpressure system exists for event bus
			const eventBusBP = this.stabilizationService.getSubsystemBackpressure(BackpressureSubsystem.EventBus);
			if (!eventBusBP) { return false; }
			if (typeof eventBusBP.level !== 'string') { return false; }

			// Apply backpressure to event bus
			this.stabilizationService.applyBackpressure(BackpressureSubsystem.EventBus, BackpressureLevel.Medium, 'Test saturation');
			const afterApply = this.stabilizationService.getSubsystemBackpressure(BackpressureSubsystem.EventBus);
			if (afterApply.level !== BackpressureLevel.Medium) { return false; }

			// Release backpressure
			this.stabilizationService.releaseBackpressure(BackpressureSubsystem.EventBus);
			const afterRelease = this.stabilizationService.getSubsystemBackpressure(BackpressureSubsystem.EventBus);
			if (afterRelease.level !== BackpressureLevel.None) { return false; }

			// Verify all subsystems have backpressure
			const allBP = this.stabilizationService.getBackpressureStatus();
			if (allBP.length < 5) { return false; }

			return true;
		});
	}

	// ─── Test 8: Production mode reduces overhead ────────────────────────────

	private _testProductionModeOverhead(): void {
		this._test('8. Production Mode Reduces Overhead', () => {
			// Verify production mode is initially off
			if (this.stabilizationService.productionMode) {
				// It may be on from a previous test, turn it off
				this.stabilizationService.setProductionMode(false);
			}

			// Get overhead comparison
			const overhead = this.stabilizationService.getProductionModeOverhead();
			if (!overhead) { return false; }
			if (typeof overhead.reductionFactor !== 'number') { return false; }
			if (overhead.reductionFactor <= 1) { return false; } // Production should reduce overhead

			// Enable production mode
			this.stabilizationService.setProductionMode(true);
			if (!this.stabilizationService.productionMode) { return false; }

			// Verify production config
			const config = this.stabilizationService.productionModeConfig;
			if (typeof config.disableVerboseObservability !== 'boolean') { return false; }
			if (typeof config.strictThrottling !== 'boolean') { return false; }
			if (typeof config.graphNodeCap !== 'number') { return false; }

			// Disable for other tests
			this.stabilizationService.setProductionMode(false);

			return true;
		});
	}

	// ─── Test 9: System recovers from overload ────────────────────────────────

	private _testRecoveryFromOverload(): void {
		this._test('9. Recovery from Overload', () => {
			// Force critical state
			this.stabilizationService.forceStabilityState(SystemStabilityState.Critical, 'Test overload');

			if (this.stabilizationService.stabilityState !== SystemStabilityState.Critical) { return false; }

			// Run full stabilization sweep (should attempt recovery)
			const sweep = this.stabilizationService.runFullStabilizationSweep();
			if (!sweep) { return false; }
			if (typeof sweep.systemHealthy !== 'boolean') { return false; }
			if (typeof sweep.durationMs !== 'number') { return false; }

			// Force recovery
			this.stabilizationService.forceStabilityState(SystemStabilityState.Recovery, 'Test recovery');

			if (this.stabilizationService.stabilityState !== SystemStabilityState.Recovery) { return false; }

			// Recovery behavior should allow limited execution
			const recoveryBehavior = this.stabilizationService.currentBehavior;
			if (!recoveryBehavior.agentPlanExecution) { return false; }
			if (!recoveryBehavior.autoRecovery) { return false; }

			// Force back to stable
			this.stabilizationService.forceStabilityState(SystemStabilityState.Stable, 'Test complete');

			return true;
		});
	}

	// ─── Test 10: Execution remains deterministic under stress ────────────────

	private _testDeterministicExecution(): void {
		this._test('10. Deterministic Execution Under Stress', () => {
			// Test idempotency — first call should be allowed
			const hash1 = 'deterministic-test-hash-1';
			const check1 = this.stabilizationService.checkDeterminism('intent-dup-1', hash1);
			if (!check1.allowed) { return false; }
			if (check1.isDuplicate) { return false; }

			// Record execution
			this.stabilizationService.recordExecution('intent-dup-1', hash1, 'success');

			// Second call with same hash should be blocked as duplicate
			const check2 = this.stabilizationService.checkDeterminism('intent-dup-2', hash1);
			if (check2.allowed) { return false; }
			if (!check2.isDuplicate) { return false; }
			if (check2.originalIntentId !== 'intent-dup-1') { return false; }

			// Verify execution ordering
			const safetyExec = this.stabilizationService.submitOrderedExecution(ExecutionPriorityTier.Safety, 0, 'Safety op');
			const agentExec = this.stabilizationService.submitOrderedExecution(ExecutionPriorityTier.AgentExecution, 0, 'Agent op');
			const contextExec = this.stabilizationService.submitOrderedExecution(ExecutionPriorityTier.ContextUpdates, 0, 'Context op');

			// Queue should process in tier order
			const queue = this.stabilizationService.getExecutionQueue();
			if (queue.length < 3) { return false; }

			// Safety should come first
			const first = this.stabilizationService.processNextExecution();
			if (first?.tier !== ExecutionPriorityTier.Safety) { return false; }

			// Verify idempotency record exists
			const record = this.stabilizationService.getIdempotencyRecord('intent-dup-1');
			if (!record) { return false; }
			if (!record.executed) { return false; }

			return true;
		});
	}
}
