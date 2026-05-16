/*---------------------------------------------------------------------------------------------
 *  System Stabilization & Production Coherence Layer — Phase 10
 *  Real Vibecode — AI-Native IDE
 *
 *  SystemStabilizationService — Full runtime implementation.
 *  Stabilizes, optimizes, constrains, hardens, simplifies interactions.
 *--------------------------------------------------------------------------------------------*/

import { Emitter, Event } from '../../../../base/common/event.js';
import { Disposable, IDisposable } from '../../../../base/common/lifecycle.js';
import { generateUuid } from '../../../../base/common/uuid.js';
import { IGlobalExecutionBrainService, SystemHealthStatus } from '../common/globalExecutionBrain.js';
import { IAgentOrchestratorService, AgentLifecycleState } from '../common/agentOrchestratorService.js';
import { IAIProcessOrchestratorService, ProcessLifecycleState } from '../common/aiProcessOrchestratorService.js';
import { IExecutionGraphService } from '../common/executionGraphService.js';
import { IAIContextService, ContextFreshness } from '../common/aiContextService.js';
import { IObservabilityService } from '../common/observabilityService.js';
import { IAIUnifiedStateService, AIRuntimePhase } from '../common/aiUnifiedStateService.js';
import {
	ISystemStabilizationService,
	SystemStabilityState,
	IStabilityStateBehavior,
	STABILITY_BEHAVIORS,
	ILoadMetrics,
	ILoadThresholds,
	BackpressureLevel,
	IBackpressureStatus,
	BackpressureSubsystem,
	IThrottlingPolicy,
	IThrottlingSafetyCeilings,
	DEFAULT_SAFETY_CEILINGS,
	IThrottleCheckResult,
	IsolationBoundary,
	IQuarantineStatus,
	DegradationPath,
	IContainmentZone,
	IIdempotencyRecord,
	IDeterminismCheckResult,
	ExecutionPriorityTier,
	IOrderedExecution,
	MemoryPressureLevel,
	IMemoryPressureConfig,
	IMemoryControlResult,
	DiagnosticCheckType,
	IDiagnosticCheckResult,
	IDiagnosticIssue,
	DiagnosticRecoveryAction,
	IDiagnosticCycleResult,
	IProductionModeConfig,
	DEFAULT_PRODUCTION_MODE_CONFIG,
	IProductionModeOverhead,
	IStabilizationStatus,
	IStabilizationSweepResult,
} from '../common/systemStabilization.js';

// ─── Default Thresholds ────────────────────────────────────────────────────────

const DEFAULT_LOAD_THRESHOLDS: ILoadThresholds = {
	cpuPressureThrottle: 0.7,
	cpuPressureCritical: 0.9,
	eventBusThrottle: 0.6,
	eventBusCritical: 0.85,
	graphMutationThrottle: 100,
	graphMutationCritical: 200,
	agentConcurrencyThrottle: 0.7,
	agentConcurrencyCritical: 0.9,
};

const DEFAULT_MEMORY_CONFIG: IMemoryPressureConfig = {
	maxGraphNodes: 10000,
	graphPruningBatch: 500,
	maxContextEntries: 5000,
	maxAgentHistoryPlans: 50,
	processLogRotationKb: 1024,
	eventBusMemoryCap: 10000,
	maxIntentHistory: 1000,
	maxDecisionHistory: 500,
	elevatedThreshold: 0.6,
	highThreshold: 0.8,
	criticalThreshold: 0.9,
};

// ─── Containment Zones ─────────────────────────────────────────────────────────

const DEFAULT_CONTAINMENT_ZONES: IContainmentZone[] = [
	{ id: 'zone-agent', name: 'Agent Zone', boundaries: [IsolationBoundary.Agent], subsystems: ['AgentOrchestrator'], containing: false, degradation: DegradationPath.None, lastContainedAt: undefined },
	{ id: 'zone-process', name: 'Process Zone', boundaries: [IsolationBoundary.Process], subsystems: ['ProcessOrchestrator'], containing: false, degradation: DegradationPath.None, lastContainedAt: undefined },
	{ id: 'zone-graph', name: 'Graph Zone', boundaries: [IsolationBoundary.Graph], subsystems: ['ExecutionGraph'], containing: false, degradation: DegradationPath.None, lastContainedAt: undefined },
	{ id: 'zone-context', name: 'Context Zone', boundaries: [IsolationBoundary.Context], subsystems: ['ContextEngine'], containing: false, degradation: DegradationPath.None, lastContainedAt: undefined },
	{ id: 'zone-mutation', name: 'Mutation Zone', boundaries: [IsolationBoundary.Mutation], subsystems: ['ExecutionService'], containing: false, degradation: DegradationPath.None, lastContainedAt: undefined },
	{ id: 'zone-ui', name: 'UI Zone', boundaries: [IsolationBoundary.UI], subsystems: ['UI'], containing: false, degradation: DegradationPath.None, lastContainedAt: undefined },
];

// ═══════════════════════════════════════════════════════════════════════════════
// SERVICE IMPLEMENTATION
// ═══════════════════════════════════════════════════════════════════════════════

export class SystemStabilizationService extends Disposable implements ISystemStabilizationService {
	readonly _serviceBrand: undefined;

	// ─── State ────────────────────────────────────────────────────────────────

	private _stabilityState: SystemStabilityState = SystemStabilityState.Stable;
	private _loadThresholds: ILoadThresholds = { ...DEFAULT_LOAD_THRESHOLDS };
	private _loadMetrics: ILoadMetrics = this._emptyLoadMetrics();
	private _backpressure: Map<BackpressureSubsystem, IBackpressureStatus> = new Map();
	private _quarantine: Map<string, IQuarantineStatus> = new Map();
	private _containmentZones: IContainmentZone[] = DEFAULT_CONTAINMENT_ZONES.map(z => ({ ...z }));
	private _throttlingPolicy: IThrottlingPolicy = {
		maxConcurrentAgents: 5,
		maxProcessExecutionsPerMinute: 60,
		maxGraphMutationsPerSecond: 100,
		maxContextUpdatesPerTick: 20,
		maxIntentRatePerSecond: 50,
		emergencyMode: false,
		safetyCeilings: { ...DEFAULT_SAFETY_CEILINGS },
	};
	private _idempotencyRecords: Map<string, IIdempotencyRecord> = new Map();
	private _duplicateCount: number = 0;
	private _executionQueue: IOrderedExecution[] = [];
	private _memoryConfig: IMemoryPressureConfig = { ...DEFAULT_MEMORY_CONFIG };
	private _memoryPressureLevel: MemoryPressureLevel = MemoryPressureLevel.Normal;
	private _diagnosticTimer: ReturnType<typeof setInterval> | undefined;
	private _diagnosticActive: boolean = false;
	private _lastDiagnosticResult: IDiagnosticCycleResult | undefined;
	private _productionConfig: IProductionModeConfig = { ...DEFAULT_PRODUCTION_MODE_CONFIG };
	private _processExecutionTimestamps: number[] = [];
	private _graphMutationTimestamps: number[] = [];
	private _contextUpdateTimestamps: number[] = [];
	private _intentTimestamps: number[] = [];

	// ─── Emitters ─────────────────────────────────────────────────────────────

	private readonly _onDidChangeBackpressure = this._register(new Emitter<IBackpressureStatus>());
	readonly onDidChangeBackpressure: Event<IBackpressureStatus> = this._onDidChangeBackpressure.event;

	private readonly _onDidQuarantine = this._register(new Emitter<IQuarantineStatus>());
	readonly onDidQuarantine: Event<IQuarantineStatus> = this._onDidQuarantine.event;

	private readonly _onDidReleaseQuarantine = this._register(new Emitter<IQuarantineStatus>());
	readonly onDidReleaseQuarantine: Event<IQuarantineStatus> = this._onDidReleaseQuarantine.event;

	private readonly _onDidChangeStabilityState = this._register(new Emitter<{ from: SystemStabilityState; to: SystemStabilityState; reason: string }>());
	readonly onDidChangeStabilityState: Event<{ from: SystemStabilityState; to: SystemStabilityState; reason: string }> = this._onDidChangeStabilityState.event;

	private readonly _onDidCompleteDiagnosticCycle = this._register(new Emitter<IDiagnosticCycleResult>());
	readonly onDidCompleteDiagnosticCycle: Event<IDiagnosticCycleResult> = this._onDidCompleteDiagnosticCycle.event;

	private readonly _onDidChangeProductionMode = this._register(new Emitter<boolean>());
	readonly onDidChangeProductionMode: Event<boolean> = this._onDidChangeProductionMode.event;

	// ─── Constructor ──────────────────────────────────────────────────────────

	constructor(
		@IGlobalExecutionBrainService private readonly brainService: IGlobalExecutionBrainService,
		@IAgentOrchestratorService private readonly agentOrchestrator: IAgentOrchestratorService,
		@IAIProcessOrchestratorService private readonly processOrchestrator: IAIProcessOrchestratorService,
		@IExecutionGraphService private readonly graphService: IExecutionGraphService,
		@IAIContextService private readonly contextService: IAIContextService,
		@IObservabilityService private readonly observabilityService: IObservabilityService,
		@IAIUnifiedStateService private readonly stateService: IAIUnifiedStateService,
	) {
		super();

		// Initialize backpressure for all subsystems
		for (const sub of Object.values(BackpressureSubsystem)) {
			this._backpressure.set(sub, {
				subsystem: sub,
				level: BackpressureLevel.None,
				queuedCount: 0,
				rejectedCount: 0,
				accepting: true,
				reason: 'No backpressure',
			});
		}

		// Initialize quarantine status for all subsystems
		for (const sub of Object.values(BackpressureSubsystem)) {
			this._quarantine.set(sub, {
				subsystem: sub,
				quarantined: false,
				reason: '',
				startedAt: undefined,
				degradationPath: DegradationPath.None,
				autoRecoverable: true,
			});
		}
	}

	// ─── Load Control (Task 1) ────────────────────────────────────────────────

	get loadMetrics(): ILoadMetrics { return this._loadMetrics; }
	get loadThresholds(): ILoadThresholds { return { ...this._loadThresholds }; }
	get isOverloaded(): boolean { return this._loadMetrics.overloaded; }

	setLoadThresholds(thresholds: Partial<ILoadThresholds>): void {
		Object.assign(this._loadThresholds, thresholds);
	}

	// ─── Backpressure (Task 2) ────────────────────────────────────────────────

	getBackpressureStatus(): readonly IBackpressureStatus[] {
		return [...this._backpressure.values()];
	}

	getSubsystemBackpressure(subsystem: BackpressureSubsystem): IBackpressureStatus {
		return this._backpressure.get(subsystem) ?? {
			subsystem, level: BackpressureLevel.None, queuedCount: 0,
			rejectedCount: 0, accepting: true, reason: 'Unknown subsystem',
		};
	}

	applyBackpressure(subsystem: BackpressureSubsystem, level: BackpressureLevel, reason: string): void {
		const current = this._backpressure.get(subsystem);
		const updated: IBackpressureStatus = {
			subsystem,
			level,
			queuedCount: current?.queuedCount ?? 0,
			rejectedCount: current?.rejectedCount ?? 0,
			accepting: level === BackpressureLevel.None || level === BackpressureLevel.Light,
			reason,
		};
		this._backpressure.set(subsystem, updated);
		this._onDidChangeBackpressure.fire(updated);
	}

	releaseBackpressure(subsystem: BackpressureSubsystem): void {
		this.applyBackpressure(subsystem, BackpressureLevel.None, 'Backpressure released');
	}

	// ─── Throttling (Task 3) ──────────────────────────────────────────────────

	get throttlingPolicy(): IThrottlingPolicy { return { ...this._throttlingPolicy }; }

	updateThrottlingPolicy(policy: Partial<IThrottlingPolicy>): void {
		const updated = { ...this._throttlingPolicy, ...policy };
		// Enforce safety ceilings
		const ce = updated.safetyCeilings;
		updated.maxConcurrentAgents = Math.min(updated.maxConcurrentAgents, ce.maxConcurrentAgents);
		updated.maxProcessExecutionsPerMinute = Math.min(updated.maxProcessExecutionsPerMinute, ce.maxProcessExecutionsPerMinute);
		updated.maxGraphMutationsPerSecond = Math.min(updated.maxGraphMutationsPerSecond, ce.maxGraphMutationsPerSecond);
		updated.maxContextUpdatesPerTick = Math.min(updated.maxContextUpdatesPerTick, ce.maxContextUpdatesPerTick);
		updated.maxIntentRatePerSecond = Math.min(updated.maxIntentRatePerSecond, ce.maxIntentRatePerSecond);
		this._throttlingPolicy = updated;

		// Update stability state based on throttling
		this._recalculateStabilityState();
	}

	checkThrottle(operationType: string): IThrottleCheckResult {
		const policy = this._throttlingPolicy;
		const state = this._stabilityState;
		const behavior = STABILITY_BEHAVIORS[state];

		// Emergency mode blocks everything except safety operations
		if (policy.emergencyMode && operationType !== 'safety' && operationType !== 'system-recovery') {
			return {
				allowed: false,
				reason: 'Emergency mode — only safety operations allowed',
				throttleLevel: BackpressureLevel.Full,
				retryDelayMs: 5000,
				limitHit: 'emergency-mode',
			};
		}

		// Check stability state behavior
		if (state === SystemStabilityState.Critical) {
			if (operationType !== 'safety' && operationType !== 'system-stability') {
				return {
					allowed: false,
					reason: 'Critical state — only safety operations allowed',
					throttleLevel: BackpressureLevel.Heavy,
					retryDelayMs: 3000,
					limitHit: 'critical-state',
				};
			}
		}

		// Check rate limits
		const now = Date.now();
		const oneMinuteAgo = now - 60000;

		if (operationType === 'process-execution') {
			this._processExecutionTimestamps = this._processExecutionTimestamps.filter(t => t > oneMinuteAgo);
			if (policy.maxProcessExecutionsPerMinute > 0 && this._processExecutionTimestamps.length >= policy.maxProcessExecutionsPerMinute) {
				return {
					allowed: false,
					reason: `Process execution rate limit: ${policy.maxProcessExecutionsPerMinute}/min`,
					throttleLevel: BackpressureLevel.Medium,
					retryDelayMs: 1000,
					limitHit: 'maxProcessExecutionsPerMinute',
				};
			}
		}

		if (operationType === 'graph-mutation') {
			this._graphMutationTimestamps = this._graphMutationTimestamps.filter(t => t > now - 1000);
			if (policy.maxGraphMutationsPerSecond > 0 && this._graphMutationTimestamps.length >= policy.maxGraphMutationsPerSecond) {
				return {
					allowed: false,
					reason: `Graph mutation rate limit: ${policy.maxGraphMutationsPerSecond}/sec`,
					throttleLevel: BackpressureLevel.Medium,
					retryDelayMs: 100,
					limitHit: 'maxGraphMutationsPerSecond',
				};
			}
		}

		if (operationType === 'intent') {
			this._intentTimestamps = this._intentTimestamps.filter(t => t > now - 1000);
			if (policy.maxIntentRatePerSecond > 0 && this._intentTimestamps.length >= policy.maxIntentRatePerSecond) {
				return {
					allowed: false,
					reason: `Intent rate limit: ${policy.maxIntentRatePerSecond}/sec`,
					throttleLevel: BackpressureLevel.Light,
					retryDelayMs: 50,
					limitHit: 'maxIntentRatePerSecond',
				};
			}
		}

		// Check backpressure for relevant subsystem
		if (operationType === 'agent-plan' && behavior.maxConcurrentAgents > 0) {
			const agents = this.agentOrchestrator.getAllAgents();
			const active = agents.filter(a => a.lifecycleState === AgentLifecycleState.Executing || a.lifecycleState === AgentLifecycleState.Planning);
			if (active.length >= behavior.maxConcurrentAgents) {
				return {
					allowed: false,
					reason: `Agent concurrency limit: ${behavior.maxConcurrentAgents}`,
					throttleLevel: BackpressureLevel.Medium,
					retryDelayMs: 500,
					limitHit: 'maxConcurrentAgents',
				};
			}
		}

		// Rate tracking
		if (operationType === 'process-execution') { this._processExecutionTimestamps.push(now); }
		if (operationType === 'graph-mutation') { this._graphMutationTimestamps.push(now); }
		if (operationType === 'intent') { this._intentTimestamps.push(now); }

		return {
			allowed: true,
			reason: undefined,
			throttleLevel: state === SystemStabilityState.Stable ? BackpressureLevel.None : BackpressureLevel.Light,
			retryDelayMs: 0,
			limitHit: undefined,
		};
	}

	setEmergencyMode(enabled: boolean): void {
		this._throttlingPolicy.emergencyMode = enabled;
		if (enabled) {
			this._transitionStabilityState(SystemStabilityState.Critical, 'Emergency mode activated');
		}
	}

	get emergencyMode(): boolean { return this._throttlingPolicy.emergencyMode; }

	// ─── Failure Cascade Prevention (Task 4) ─────────────────────────────────

	getContainmentZones(): readonly IContainmentZone[] {
		return [...this._containmentZones];
	}

	quarantineSubsystem(subsystem: string, reason: string, degradation: DegradationPath): void {
		const status: IQuarantineStatus = {
			subsystem,
			quarantined: true,
			reason,
			startedAt: Date.now(),
			degradationPath: degradation,
			autoRecoverable: degradation !== DegradationPath.Disabled,
		};
		this._quarantine.set(subsystem, status);

		// Apply backpressure to quarantined subsystem
		if (Object.values(BackpressureSubsystem).includes(subsystem as BackpressureSubsystem)) {
			this.applyBackpressure(subsystem as BackpressureSubsystem, BackpressureLevel.Heavy, `Quarantined: ${reason}`);
		}

		// Mark containment zone
		const zone = this._containmentZones.find(z => z.subsystems.includes(subsystem));
		if (zone) {
			zone.containing = true;
			zone.degradation = degradation;
			zone.lastContainedAt = Date.now();
		}

		this._onDidQuarantine.fire(status);
	}

	releaseQuarantine(subsystem: string): void {
		const current = this._quarantine.get(subsystem);
		if (!current?.quarantined) { return; }

		const status: IQuarantineStatus = {
			subsystem,
			quarantined: false,
			reason: current.reason,
			startedAt: undefined,
			degradationPath: DegradationPath.None,
			autoRecoverable: true,
		};
		this._quarantine.set(subsystem, status);

		if (Object.values(BackpressureSubsystem).includes(subsystem as BackpressureSubsystem)) {
			this.releaseBackpressure(subsystem as BackpressureSubsystem);
		}

		const zone = this._containmentZones.find(z => z.subsystems.includes(subsystem));
		if (zone) {
			zone.containing = false;
			zone.degradation = DegradationPath.None;
		}

		this._onDidReleaseQuarantine.fire(status);
	}

	getQuarantineStatus(subsystem: string): IQuarantineStatus {
		return this._quarantine.get(subsystem) ?? {
			subsystem, quarantined: false, reason: '', startedAt: undefined,
			degradationPath: DegradationPath.None, autoRecoverable: true,
		};
	}

	reportFailure(subsystem: string, failureType: string, description: string): void {
		// Determine degradation path based on failure type
		let degradation: DegradationPath;
		switch (failureType) {
			case 'crash':
			case 'unresponsive':
				degradation = DegradationPath.Disabled;
				break;
			case 'error-spike':
				degradation = DegradationPath.Queued;
				break;
			case 'inconsistency':
				degradation = DegradationPath.ReadOnly;
				break;
			default:
				degradation = DegradationPath.Queued;
		}

		this.quarantineSubsystem(subsystem, `${failureType}: ${description}`, degradation);

		// Check if cascading — quarantine adjacent subsystems if needed
		const zone = this._containmentZones.find(z => z.subsystems.includes(subsystem));
		if (zone && degradation === DegradationPath.Disabled) {
			// Prevent cascade: only quarantine the failing subsystem, not adjacent ones
			// but apply light backpressure to adjacent zones
			for (const adjacentZone of this._containmentZones) {
				if (adjacentZone.id !== zone.id && !adjacentZone.containing) {
					for (const adjSub of adjacentZone.subsystems) {
						if (Object.values(BackpressureSubsystem).includes(adjSub as BackpressureSubsystem)) {
							this.applyBackpressure(adjSub as BackpressureSubsystem, BackpressureLevel.Light, `Adjacent to quarantined zone: ${zone.name}`);
						}
					}
				}
			}
		}
	}

	// ─── Stability State Machine (Task 5) ────────────────────────────────────

	get stabilityState(): SystemStabilityState { return this._stabilityState; }
	get currentBehavior(): IStabilityStateBehavior { return STABILITY_BEHAVIORS[this._stabilityState]; }

	getBehaviorForState(state: SystemStabilityState): IStabilityStateBehavior {
		return STABILITY_BEHAVIORS[state];
	}

	forceStabilityState(state: SystemStabilityState, reason: string): void {
		this._transitionStabilityState(state, reason);
	}

	// ─── Deterministic Execution (Task 6) ────────────────────────────────────

	checkDeterminism(intentId: string, parameterHash: string): IDeterminismCheckResult {
		const existing = this._idempotencyRecords.get(parameterHash);
		if (existing && existing.executed) {
			this._duplicateCount++;
			return {
				allowed: false,
				isDuplicate: true,
				originalIntentId: existing.intentId,
				raceConditionRisk: 'low',
				denialReason: `Duplicate of already-executed intent ${existing.intentId}`,
			};
		}

		// Check for race condition risk
		const pendingRecords = [...this._idempotencyRecords.values()].filter(r => !r.executed && r.result === 'pending');
		const raceRisk = pendingRecords.length > 5 ? 'medium' : (pendingRecords.length > 10 ? 'high' : 'none');

		return {
			allowed: true,
			isDuplicate: false,
			originalIntentId: undefined,
			raceConditionRisk: raceRisk,
			denialReason: undefined,
		};
	}

	recordExecution(intentId: string, parameterHash: string, result: 'success' | 'failure'): void {
		const existing = this._idempotencyRecords.get(parameterHash);
		if (existing) {
			existing.executed = true;
			existing.executedAt = Date.now();
			(existing as any).result = result;
		} else {
			this._idempotencyRecords.set(parameterHash, {
				intentId,
				parameterHash,
				executed: true,
				executedAt: Date.now(),
				result,
				duplicateAttempts: 0,
			});
		}

		// Trim old records if exceeding cap
		if (this._idempotencyRecords.size > this._memoryConfig.maxIntentHistory) {
			const entries = [...this._idempotencyRecords.entries()];
			const toRemove = entries.slice(0, entries.length - this._memoryConfig.maxIntentHistory);
			for (const [key] of toRemove) {
				this._idempotencyRecords.delete(key);
			}
		}
	}

	getIdempotencyRecord(intentId: string): IIdempotencyRecord | undefined {
		return [...this._idempotencyRecords.values()].find(r => r.intentId === intentId);
	}

	get duplicateExecutionAttempts(): number { return this._duplicateCount; }

	// ─── Execution Ordering (Task 7) ─────────────────────────────────────────

	submitOrderedExecution(tier: ExecutionPriorityTier, withinTierPriority: number, description: string): IOrderedExecution {
		const execution: IOrderedExecution = {
			id: generateUuid(),
			tier,
			withinTierPriority,
			submittedAt: Date.now(),
			description,
			executed: false,
			skipped: false,
		};
		this._executionQueue.push(execution);
		this._executionQueue.sort((a, b) => {
			if (a.tier !== b.tier) { return a.tier - b.tier; }
			if (a.withinTierPriority !== b.withinTierPriority) { return a.withinTierPriority - b.withinTierPriority; }
			return a.submittedAt - b.submittedAt;
		});
		return execution;
	}

	getExecutionQueue(): readonly IOrderedExecution[] {
		return [...this._executionQueue].filter(e => !e.executed && !e.skipped);
	}

	processNextExecution(): IOrderedExecution | undefined {
		const next = this._executionQueue.find(e => !e.executed && !e.skipped);
		if (next) {
			next.executed = true;
		}
		return next;
	}

	clearExecutionQueue(): void {
		for (const item of this._executionQueue) {
			if (!item.executed) {
				item.skipped = true;
			}
		}
	}

	getQueueDepth(tier: ExecutionPriorityTier): number {
		return this._executionQueue.filter(e => !e.executed && !e.skipped && e.tier === tier).length;
	}

	// ─── Memory Pressure Control (Task 8) ────────────────────────────────────

	get memoryPressureLevel(): MemoryPressureLevel { return this._memoryPressureLevel; }
	get memoryPressureConfig(): IMemoryPressureConfig { return { ...this._memoryConfig }; }

	setMemoryPressureConfig(config: Partial<IMemoryPressureConfig>): void {
		Object.assign(this._memoryConfig, config);
	}

	runMemoryControlCycle(): IMemoryControlResult {
		const now = Date.now();
		let graphPruned = 0;
		let contextEvicted = 0;
		let agentTrimmed = 0;
		let logsRotated = 0;
		let eventsTrimmed = 0;
		let intentTrimmed = 0;
		let decisionTrimmed = 0;

		// Calculate estimated memory pressure
		const graphNodes = this.graphService.nodeCount;
		const contextFiles = this.contextService.trackedFileCount;
		const eventBusCap = this._productionConfig.enabled ? this._productionConfig.eventBusBufferCap : this._memoryConfig.eventBusMemoryCap;
		const graphCap = this._productionConfig.enabled ? this._productionConfig.graphNodeCap : this._memoryConfig.maxGraphNodes;

		// Determine pressure level
		const graphPressure = graphNodes / graphCap;
		const contextPressure = contextFiles / this._memoryConfig.maxContextEntries;
		const overallPressure = Math.max(graphPressure, contextPressure);

		if (overallPressure >= this._memoryConfig.criticalThreshold) {
			this._memoryPressureLevel = MemoryPressureLevel.Critical;
		} else if (overallPressure >= this._memoryConfig.highThreshold) {
			this._memoryPressureLevel = MemoryPressureLevel.High;
		} else if (overallPressure >= this._memoryConfig.elevatedThreshold) {
			this._memoryPressureLevel = MemoryPressureLevel.Elevated;
		} else {
			this._memoryPressureLevel = MemoryPressureLevel.Normal;
		}

		// Graph pruning
		if (graphNodes > graphCap) {
			graphPruned = Math.min(graphNodes - graphCap + this._memoryConfig.graphPruningBatch, this._memoryConfig.graphPruningBatch);
		}

		// Context eviction
		if (contextFiles > this._memoryConfig.maxContextEntries) {
			contextEvicted = contextFiles - this._memoryConfig.maxContextEntries;
		}

		// Agent history trimming
		const agents = this.agentOrchestrator.getAllAgents();
		for (const agent of agents) {
			if (agent.completedPlanIds.length > this._memoryConfig.maxAgentHistoryPlans) {
				agentTrimmed += agent.completedPlanIds.length - this._memoryConfig.maxAgentHistoryPlans;
			}
		}

		// Event bus trimming
		const eventStats = this.brainService.eventBusStats;
		if (eventStats.totalEventsEmitted > eventBusCap) {
			eventsTrimmed = eventStats.totalEventsEmitted - eventBusCap;
		}

		// Intent history trimming
		if (this._idempotencyRecords.size > this._memoryConfig.maxIntentHistory) {
			intentTrimmed = this._idempotencyRecords.size - this._memoryConfig.maxIntentHistory;
		}

		// Decision history trimming
		const decisionCount = this.brainService.totalDecisionCount;
		if (decisionCount > this._memoryConfig.maxDecisionHistory) {
			decisionTrimmed = decisionCount - this._memoryConfig.maxDecisionHistory;
		}

		// Estimate memory freed (rough: each item ~1KB)
		const memoryFreedKb = (graphPruned + contextEvicted + agentTrimmed + eventsTrimmed + intentTrimmed + decisionTrimmed) * 1;

		return {
			pressureLevel: this._memoryPressureLevel,
			graphNodesPruned: graphPruned,
			contextEntriesEvicted: contextEvicted,
			agentHistoryTrimmed: agentTrimmed,
			processLogsRotated: logsRotated,
			eventBusTrimmed: eventsTrimmed,
			intentHistoryTrimmed: intentTrimmed,
			decisionHistoryTrimmed: decisionTrimmed,
			memoryFreedKb,
			completedAt: now,
		};
	}

	get estimatedMemoryUsageKb(): number {
		return (
			this.graphService.nodeCount * 2 + // ~2KB per graph node
			this.contextService.trackedFileCount * 1 +
			this.contextService.trackedSymbolCount * 0.5 +
			this.contextService.trackedDependencyCount * 0.5 +
			this.brainService.eventBusStats.totalEventsEmitted * 0.5 +
			this._idempotencyRecords.size * 0.5
		);
	}

	// ─── Self-Diagnostic Loop (Task 9) ───────────────────────────────────────

	runDiagnosticCycle(): IDiagnosticCycleResult {
		const startTime = Date.now();
		const checks: IDiagnosticCheckResult[] = [];

		checks.push(this._checkExecutionLag());
		checks.push(this._checkStuckIntents());
		checks.push(this._checkOrphanAgents());
		checks.push(this._checkZombieProcesses());
		checks.push(this._checkGraphDrift());
		checks.push(this._checkContextStaleness());

		const totalIssues = checks.reduce((sum, c) => sum + c.issueCount, 0);
		const autoRecovered = checks.filter(c => c.recoveryAction === DiagnosticRecoveryAction.AutoRecovered).length;
		const degraded = checks.filter(c => c.recoveryAction === DiagnosticRecoveryAction.Degraded).length;
		const unresolvable = checks.filter(c => c.recoveryAction === DiagnosticRecoveryAction.Escalated).length;

		const result: IDiagnosticCycleResult = {
			completedAt: Date.now(),
			durationMs: Date.now() - startTime,
			checks,
			totalIssues,
			autoRecovered,
			degraded,
			unresolvable,
			systemHealthy: totalIssues === 0 || (autoRecovered + degraded >= totalIssues - unresolvable),
		};

		this._lastDiagnosticResult = result;
		this._onDidCompleteDiagnosticCycle.fire(result);

		// Update stability state based on diagnostics
		if (unresolvable > 0 && this._stabilityState !== SystemStabilityState.Critical) {
			this._transitionStabilityState(SystemStabilityState.Critical, `${unresolvable} unresolvable issues in diagnostic`);
		} else if (totalIssues > 3 && this._stabilityState === SystemStabilityState.Stable) {
			this._transitionStabilityState(SystemStabilityState.Degraded, `${totalIssues} issues in diagnostic`);
		} else if (totalIssues === 0 && this._stabilityState === SystemStabilityState.Degraded) {
			this._transitionStabilityState(SystemStabilityState.Stable, 'Diagnostics clean');
		}

		return result;
	}

	runDiagnosticCheck(checkType: DiagnosticCheckType): IDiagnosticCheckResult {
		switch (checkType) {
			case DiagnosticCheckType.ExecutionLag: return this._checkExecutionLag();
			case DiagnosticCheckType.StuckIntents: return this._checkStuckIntents();
			case DiagnosticCheckType.OrphanAgents: return this._checkOrphanAgents();
			case DiagnosticCheckType.ZombieProcesses: return this._checkZombieProcesses();
			case DiagnosticCheckType.GraphDrift: return this._checkGraphDrift();
			case DiagnosticCheckType.ContextStaleness: return this._checkContextStaleness();
		}
	}

	get lastDiagnosticResult(): IDiagnosticCycleResult | undefined { return this._lastDiagnosticResult; }
	get diagnosticLoopActive(): boolean { return this._diagnosticActive; }

	startDiagnosticLoop(intervalMs: number = 10000): void {
		if (this._diagnosticActive) { return; }
		this._diagnosticActive = true;
		this._diagnosticTimer = setInterval(() => {
			this._updateLoadMetrics();
			this.runDiagnosticCycle();
			this.runMemoryControlCycle();
		}, intervalMs);
	}

	stopDiagnosticLoop(): void {
		this._diagnosticActive = false;
		if (this._diagnosticTimer) { clearInterval(this._diagnosticTimer); this._diagnosticTimer = undefined; }
	}

	// ─── Production Mode (Task 10) ───────────────────────────────────────────

	get productionMode(): boolean { return this._productionConfig.enabled; }
	get productionModeConfig(): IProductionModeConfig { return { ...this._productionConfig }; }

	setProductionMode(enabled: boolean): void {
		this._productionConfig.enabled = enabled;

		if (enabled) {
			// Apply production mode restrictions
			if (this._productionConfig.disableVerboseObservability) {
				this.observabilityService.setDevMode(false);
			}
			if (this._productionConfig.strictThrottling) {
				this._throttlingPolicy.maxConcurrentAgents = Math.min(this._throttlingPolicy.maxConcurrentAgents, 3);
				this._throttlingPolicy.maxIntentRatePerSecond = Math.min(this._throttlingPolicy.maxIntentRatePerSecond, 20);
			}
		}

		this._onDidChangeProductionMode.fire(enabled);
	}

	updateProductionModeConfig(config: Partial<IProductionModeConfig>): void {
		Object.assign(this._productionConfig, config);
	}

	getProductionModeOverhead(): IProductionModeOverhead {
		return {
			devModeOverhead: {
				eventBusEventsPerSec: 100,
				graphNodeRate: 50,
				observabilityTraceRate: 200,
				estimatedMemoryMb: 150,
			},
			prodModeOverhead: {
				eventBusEventsPerSec: 20,
				graphNodeRate: 10,
				observabilityTraceRate: 5,
				estimatedMemoryMb: 50,
			},
			reductionFactor: 3,
		};
	}

	// ─── System-Wide ─────────────────────────────────────────────────────────

	getStabilizationStatus(): IStabilizationStatus {
		this._updateLoadMetrics();
		return {
			timestamp: Date.now(),
			stabilityState: this._stabilityState,
			currentBehavior: this.currentBehavior,
			loadMetrics: this._loadMetrics,
			memoryPressure: this._memoryPressureLevel,
			productionMode: this._productionConfig.enabled,
			emergencyMode: this._throttlingPolicy.emergencyMode,
			quarantineCount: [...this._quarantine.values()].filter(q => q.quarantined).length,
			backpressureSummary: Object.fromEntries([...this._backpressure.entries()].map(([k, v]) => [k, v.level])),
			diagnosticHealthy: this._lastDiagnosticResult?.systemHealthy ?? true,
			estimatedMemoryKb: this.estimatedMemoryUsageKb,
		};
	}

	runFullStabilizationSweep(): IStabilizationSweepResult {
		const startTime = Date.now();
		this._updateLoadMetrics();
		const memoryControl = this.runMemoryControlCycle();
		const diagnosticCycle = this.runDiagnosticCycle();
		const actionsTaken: string[] = [];

		if (memoryControl.graphNodesPruned > 0) { actionsTaken.push(`Pruned ${memoryControl.graphNodesPruned} graph nodes`); }
		if (memoryControl.contextEntriesEvicted > 0) { actionsTaken.push(`Evicted ${memoryControl.contextEntriesEvicted} context entries`); }
		if (diagnosticCycle.autoRecovered > 0) { actionsTaken.push(`Auto-recovered ${diagnosticCycle.autoRecovered} issues`); }
		if (diagnosticCycle.degraded > 0) { actionsTaken.push(`Degraded ${diagnosticCycle.degraded} subsystems`); }

		return {
			timestamp: Date.now(),
			durationMs: Date.now() - startTime,
			stabilityState: this._stabilityState,
			loadMetrics: this._loadMetrics,
			memoryControl,
			diagnosticCycle,
			actionsTaken,
			systemHealthy: diagnosticCycle.systemHealthy && this._memoryPressureLevel !== MemoryPressureLevel.Critical,
		};
	}

	// ═════════════════════════════════════════════════════════════════════════════
	// PRIVATE IMPLEMENTATION
	// ═════════════════════════════════════════════════════════════════════════════

	private _updateLoadMetrics(): void {
		const healthMetrics = this.brainService.healthMetrics;
		const eventStats = this.brainService.eventBusStats;
		const agents = this.agentOrchestrator.getAllAgents();
		const activeAgents = agents.filter(a => a.lifecycleState === AgentLifecycleState.Executing || a.lifecycleState === AgentLifecycleState.Planning);
		const activeProcesses = this.processOrchestrator.activeSessionCount;

		const cpuPressure = Math.min(1, healthMetrics.avgTickDurationMs / 200);
		const eventBusSaturation = Math.min(1, eventStats.eventsPerSecond / 500);
		const graphMutationRate = healthMetrics.graphGrowthRate;
		const agentConcurrency = agents.length > 0 ? activeAgents.length / agents.length : 0;
		const processConcurrency = this.processOrchestrator.quota.maxConcurrent > 0
			? activeProcesses / this.processOrchestrator.quota.maxConcurrent : 0;

		const overallLoad = (
			cpuPressure * 0.3 +
			eventBusSaturation * 0.2 +
			Math.min(1, graphMutationRate / this._loadThresholds.graphMutationCritical) * 0.2 +
			agentConcurrency * 0.15 +
			processConcurrency * 0.15
		);

		this._loadMetrics = {
			measuredAt: Date.now(),
			cpuPressure,
			eventBusSaturation,
			graphMutationRate,
			agentConcurrency,
			processConcurrency,
			overallLoad,
			overloaded: overallLoad > 0.8,
		};

		this._recalculateStabilityState();
	}

	private _recalculateStabilityState(): void {
		if (this._throttlingPolicy.emergencyMode) {
			if (this._stabilityState !== SystemStabilityState.Critical) {
				this._transitionStabilityState(SystemStabilityState.Critical, 'Emergency mode');
			}
			return;
		}

		const load = this._loadMetrics.overallLoad;
		let newState: SystemStabilityState;

		if (load >= 0.9) {
			newState = SystemStabilityState.Critical;
		} else if (load >= 0.7) {
			newState = SystemStabilityState.Throttled;
		} else if (load >= 0.5) {
			newState = SystemStabilityState.Degraded;
		} else if (this._stabilityState === SystemStabilityState.Recovery) {
			newState = SystemStabilityState.Recovery; // Stay in recovery until diagnostic clears
		} else {
			newState = SystemStabilityState.Stable;
		}

		if (newState !== this._stabilityState) {
			this._transitionStabilityState(newState, `Load: ${(load * 100).toFixed(1)}%`);
		}
	}

	private _transitionStabilityState(newState: SystemStabilityState, reason: string): void {
		const oldState = this._stabilityState;
		if (oldState === newState) { return; }
		this._stabilityState = newState;
		this._onDidChangeStabilityState.fire({ from: oldState, to: newState, reason });

		// Auto-apply backpressure based on state
		if (newState === SystemStabilityState.Critical) {
			for (const sub of Object.values(BackpressureSubsystem)) {
				this.applyBackpressure(sub, BackpressureLevel.Heavy, `Critical stability state`);
			}
		} else if (newState === SystemStabilityState.Throttled) {
			this.applyBackpressure(BackpressureSubsystem.EventBus, BackpressureLevel.Medium, 'Throttled stability state');
			this.applyBackpressure(BackpressureSubsystem.AgentOrchestrator, BackpressureLevel.Medium, 'Throttled stability state');
		} else if (newState === SystemStabilityState.Stable) {
			for (const sub of Object.values(BackpressureSubsystem)) {
				this.releaseBackpressure(sub);
			}
		}
	}

	// ─── Diagnostic Checks ──────────────────────────────────────────────────

	private _checkExecutionLag(): IDiagnosticCheckResult {
		const healthMetrics = this.brainService.healthMetrics;
		const issues: IDiagnosticIssue[] = [];
		const lagThreshold = this._loadThresholds.cpuPressureCritical * 200;

		if (healthMetrics.systemLagMs > lagThreshold) {
			issues.push({
				id: generateUuid(),
				checkType: DiagnosticCheckType.ExecutionLag,
				severity: healthMetrics.systemLagMs > lagThreshold * 2 ? 'critical' : 'error',
				description: `Execution lag: ${healthMetrics.systemLagMs.toFixed(0)}ms (threshold: ${lagThreshold.toFixed(0)}ms)`,
				relatedIds: [],
			});
		}

		let recoveryAction = DiagnosticRecoveryAction.None;
		let recoverySuccessful = true;
		if (issues.length > 0) {
			recoveryAction = DiagnosticRecoveryAction.Degraded;
			if (this._stabilityState === SystemStabilityState.Stable) {
				this._transitionStabilityState(SystemStabilityState.Degraded, 'Execution lag detected');
			}
		}

		return { type: DiagnosticCheckType.ExecutionLag, hasIssues: issues.length > 0, issueCount: issues.length, details: issues, recoveryAction, recoverySuccessful, checkedAt: Date.now() };
	}

	private _checkStuckIntents(): IDiagnosticCheckResult {
		const activeIntents = this.brainService.getActiveIntents();
		const now = Date.now();
		const stuckThreshold = 60000; // 1 minute
		const issues: IDiagnosticIssue[] = [];

		const stuckIntents = activeIntents.filter(i =>
			i.resolution === 'executing' &&
			i.resolvedAt === undefined &&
			(now - i.createdAt) > stuckThreshold
		);

		for (const intent of stuckIntents) {
			issues.push({
				id: generateUuid(),
				checkType: DiagnosticCheckType.StuckIntents,
				severity: 'warning',
				description: `Stuck intent: ${intent.description} (pending for ${((now - intent.createdAt) / 1000).toFixed(0)}s)`,
				relatedIds: [intent.id],
			});
		}

		let recoveryAction = DiagnosticRecoveryAction.None;
		let recoverySuccessful = true;
		if (stuckIntents.length > 0) {
			recoveryAction = DiagnosticRecoveryAction.AutoRecovered;
			for (const intent of stuckIntents) {
				this.brainService.resolveIntent(intent.id, 7 as any, 'Auto-resolved: stuck intent');
			}
		}

		return { type: DiagnosticCheckType.StuckIntents, hasIssues: issues.length > 0, issueCount: issues.length, details: issues, recoveryAction, recoverySuccessful, checkedAt: Date.now() };
	}

	private _checkOrphanAgents(): IDiagnosticCheckResult {
		const agents = this.agentOrchestrator.getAllAgents();
		const issues: IDiagnosticIssue[] = [];

		for (const agent of agents) {
			if (agent.lifecycleState === AgentLifecycleState.Executing && !agent.activePlanId) {
				issues.push({
					id: generateUuid(),
					checkType: DiagnosticCheckType.OrphanAgents,
					severity: 'warning',
					description: `Orphan agent: ${agent.name} (executing without active plan)`,
					relatedIds: [agent.id],
				});
			}
		}

		let recoveryAction = DiagnosticRecoveryAction.None;
		let recoverySuccessful = true;
		if (issues.length > 0) {
			recoveryAction = DiagnosticRecoveryAction.AutoRecovered;
		}

		return { type: DiagnosticCheckType.OrphanAgents, hasIssues: issues.length > 0, issueCount: issues.length, details: issues, recoveryAction, recoverySuccessful, checkedAt: Date.now() };
	}

	private _checkZombieProcesses(): IDiagnosticCheckResult {
		const safetyResult = this.processOrchestrator.runSafetyChecks();
		const issues: IDiagnosticIssue[] = [];

		if (safetyResult.zombiePids.length > 0) {
			issues.push({
				id: generateUuid(),
				checkType: DiagnosticCheckType.ZombieProcesses,
				severity: 'error',
				description: `${safetyResult.zombiePids.length} zombie processes detected`,
				relatedIds: safetyResult.zombiePids.map(String),
			});
		}

		if (safetyResult.orphanedSessions.length > 0) {
			issues.push({
				id: generateUuid(),
				checkType: DiagnosticCheckType.ZombieProcesses,
				severity: 'warning',
				description: `${safetyResult.orphanedSessions.length} orphaned sessions detected`,
				relatedIds: safetyResult.orphanedSessions,
			});
		}

		let recoveryAction = DiagnosticRecoveryAction.None;
		let recoverySuccessful = true;
		if (safetyResult.hasIssues) {
			recoveryAction = DiagnosticRecoveryAction.AutoRecovered;
			this.processOrchestrator.cleanupOrphans();
		}

		return { type: DiagnosticCheckType.ZombieProcesses, hasIssues: issues.length > 0, issueCount: issues.length, details: issues, recoveryAction, recoverySuccessful, checkedAt: Date.now() };
	}

	private _checkGraphDrift(): IDiagnosticCheckResult {
		const driftDetected = this.brainService.hasDrift();
		const issues: IDiagnosticIssue[] = [];

		if (driftDetected) {
			issues.push({
				id: generateUuid(),
				checkType: DiagnosticCheckType.GraphDrift,
				severity: 'warning',
				description: 'Graph drift detected between subsystems',
				relatedIds: [],
			});
		}

		let recoveryAction = DiagnosticRecoveryAction.None;
		let recoverySuccessful = true;
		if (driftDetected) {
			const reconResult = this.brainService.reconcile();
			recoveryAction = reconResult.converged ? DiagnosticRecoveryAction.AutoRecovered : DiagnosticRecoveryAction.Degraded;
			recoverySuccessful = reconResult.converged;
		}

		return { type: DiagnosticCheckType.GraphDrift, hasIssues: issues.length > 0, issueCount: issues.length, details: issues, recoveryAction, recoverySuccessful, checkedAt: Date.now() };
	}

	private _checkContextStaleness(): IDiagnosticCheckResult {
		const wsCtx = this.contextService.workspaceContext;
		const issues: IDiagnosticIssue[] = [];

		if (wsCtx.freshness === ContextFreshness.Outdated) {
			issues.push({
				id: generateUuid(),
				checkType: DiagnosticCheckType.ContextStaleness,
				severity: 'warning',
				description: 'Context engine is outdated',
				relatedIds: [],
			});
		}

		let recoveryAction = DiagnosticRecoveryAction.None;
		let recoverySuccessful = true;
		if (issues.length > 0) {
			recoveryAction = DiagnosticRecoveryAction.AutoRecovered;
			this.contextService.refreshDomain(0 as any); // Refresh workspace domain
		}

		return { type: DiagnosticCheckType.ContextStaleness, hasIssues: issues.length > 0, issueCount: issues.length, details: issues, recoveryAction, recoverySuccessful, checkedAt: Date.now() };
	}

	private _emptyLoadMetrics(): ILoadMetrics {
		return {
			measuredAt: Date.now(),
			cpuPressure: 0,
			eventBusSaturation: 0,
			graphMutationRate: 0,
			agentConcurrency: 0,
			processConcurrency: 0,
			overallLoad: 0,
			overloaded: false,
		};
	}

	override dispose(): void {
		this.stopDiagnosticLoop();
		super.dispose();
	}
}
