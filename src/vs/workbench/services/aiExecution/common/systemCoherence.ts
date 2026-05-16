/*---------------------------------------------------------------------------------------------
 *  System Unification Bridge Layer — Phase 17
 *  Real Vibecode — AI-Native IDE
 *
 *  Unifies Execution, Replay, UX, Human Workflow, and Stability layers
 *  into ONE coordinated intelligence loop.
 *
 *  PRINCIPLES:
 *    1.  No service communicates directly across layers — all via signal bus
 *    2.  UX + Execution + Human layers must always align
 *    3.  No "layer isolation bugs" — coherence is enforced structurally
 *    4.  System intent is global — no layer drifts independently
 *    5.  Conflicts are resolved with priority: Safety > Correctness > UX > Performance
 *    6.  Context must be merged losslessly across all layers
 *    7.  Feedback loops must be closed, never circular
 *    8.  Health is computed globally, not per-layer
 *    9.  Consciousness is observability only — never real awareness
 *   10.  Every cross-layer signal must be normalized and auditable
 *
 *  Tasks:
 *    1.  Global System Coherence Engine
 *    2.  Cross-Layer Signal Bus
 *    3.  System Intent Alignment Engine
 *    4.  Layer Synchronization Engine
 *    5.  Global Event Normalizer
 *    6.  System Feedback Loop Engine
 *    7.  Contextual System Memory Merger
 *    8.  System Conflict Resolution Engine
 *    9.  Global System Health Orchestrator
 *   10.  Unified System Consciousness Layer (Metadata Only)
 *--------------------------------------------------------------------------------------------*/

import { Event } from '../../../../base/common/event.js';
import { IDisposable } from '../../../../base/common/lifecycle.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';

// ═══════════════════════════════════════════════════════════════════════════════
// SHARED TYPES — Cross-Layer Primitives
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Architectural layer — the five system layers.
 */
export const enum SystemLayer {
	/** Execution Layer — Graph, Agents, Processes, Brain */
	Execution = 'execution',
	/** Replay Layer — Simulation, Debugging, Determinism */
	Replay = 'replay',
	/** UX Layer — Design system, UI, motion, production surfaces */
	UX = 'ux',
	/** Human Layer — Workflow, attention, fatigue, momentum */
	Human = 'human',
	/** Stability Layer — Load, backpressure, memory, health */
	Stability = 'stability',
}

/**
 * Signal priority — how important a cross-layer signal is.
 */
export const enum SignalPriority {
	/** Emergency — system safety at risk */
	Critical = 'critical',
	/** Important — affects correctness */
	High = 'high',
	/** Normal — informational state change */
	Normal = 'normal',
	/** Low — background optimization */
	Low = 'low',
	/** Trace — debug/observability only */
	Trace = 'trace',
}

/**
 * Signal direction — which way a signal flows across layers.
 */
export const enum SignalDirection {
	/** From execution to other layers */
	ExecutionOutbound = 'execution-outbound',
	/** To execution from other layers */
	ExecutionInbound = 'execution-inbound',
	/** From UX to other layers */
	UXOutbound = 'ux-outbound',
	/** To UX from other layers */
	UXInbound = 'ux-inbound',
	/** From human layer to other layers */
	HumanOutbound = 'human-outbound',
	/** To human layer from other layers */
	HumanInbound = 'human-inbound',
	/** From stability to other layers */
	StabilityOutbound = 'stability-outbound',
	/** From replay to other layers */
	ReplayOutbound = 'replay-outbound',
	/** Broadcast to all layers */
	Broadcast = 'broadcast',
}

/**
 * Coherence status — how aligned the system is.
 */
export const enum CoherenceStatus {
	/** All layers aligned, no drift */
	Coherent = 'coherent',
	/** Minor drift detected, auto-correcting */
	MinorDrift = 'minor-drift',
	/** Significant drift, active reconciliation needed */
	MajorDrift = 'major-drift',
	/** Layers are in conflict, resolution required */
	Incoherent = 'incoherent',
	/** System is recovering from incoherence */
	Recovering = 'recovering',
}

/**
 * Conflict resolution priority.
 */
export const enum ConflictPriority {
	/** Safety first — never compromise system integrity */
	Safety = 'safety',
	/** Correctness — data and logic must be correct */
	Correctness = 'correctness',
	/** UX — user experience matters after safety and correctness */
	UX = 'ux',
	/** Performance — optimize only when safe, correct, and usable */
	Performance = 'performance',
}

/**
 * Health severity — how serious a health issue is.
 */
export const enum HealthSeverity {
	/** System is healthy */
	Healthy = 'healthy',
	/** Minor issue, not affecting operation */
	Degraded = 'degraded',
	/** Significant issue, affecting some operations */
	Unhealthy = 'unhealthy',
	/** Critical issue, system stability at risk */
	Critical = 'critical',
}

/**
 * Sync status — whether layers are in sync.
 */
export const enum SyncStatus {
	/** Layers are synchronized */
	Synchronized = 'synchronized',
	/** Minor drift, auto-correcting */
	Drifting = 'drifting',
	/** Out of sync, needs reconciliation */
	Desynchronized = 'desynchronized',
	/** Reconciliation in progress */
	Reconciling = 'reconciling',
}

/**
 * Intent domain — which layer's intent.
 */
export const enum IntentDomain {
	Execution = 'execution',
	UX = 'ux',
	Human = 'human',
	Stability = 'stability',
	Replay = 'replay',
	Global = 'global',
}

/**
 * Feedback loop direction.
 */
export const enum FeedbackDirection {
	/** Execution -> UX adaptation */
	ExecutionToUX = 'execution-to-ux',
	/** UX -> Human behavior adjustment */
	UXToHuman = 'ux-to-human',
	/** Human -> Workflow adaptation */
	HumanToWorkflow = 'human-to-workflow',
	/** Stability -> Throttling changes */
	StabilityToThrottle = 'stability-to-throttle',
	/** Full loop — all directions active */
	ClosedLoop = 'closed-loop',
}

/**
 * Event normalization result.
 */
export const enum NormalizationResult {
	/** Event was normalized successfully */
	Normalized = 'normalized',
	/** Event was a duplicate, discarded */
	DuplicateDiscarded = 'duplicate-discarded',
	/** Event was merged with existing event */
	Merged = 'merged',
	/** Event was too noisy, suppressed */
	Suppressed = 'suppressed',
	/** Event could not be normalized */
	Failed = 'failed',
}

/**
 * Cross-layer signal — the fundamental unit of inter-layer communication.
 */
export interface ICrossLayerSignal {
	readonly signalId: string;
	readonly sourceLayer: SystemLayer;
	readonly targetLayer: SystemLayer;
	readonly direction: SignalDirection;
	readonly priority: SignalPriority;
	readonly eventType: string;
	readonly payload: unknown;
	readonly timestamp: number;
	readonly correlationId: string | null;
	readonly isNormalized: boolean;
}

/**
 * Signal subscription — a listener for cross-layer signals.
 */
export interface ISignalSubscription {
	readonly subscriptionId: string;
	readonly targetLayer: SystemLayer;
	readonly eventTypes: readonly string[];
	readonly callback: (signal: ICrossLayerSignal) => void;
}

/**
 * Layer state snapshot — a point-in-time view of a layer's state.
 */
export interface ILayerStateSnapshot {
	readonly layer: SystemLayer;
	readonly stateVersion: number;
	readonly activeServiceCount: number;
	readonly pendingSignals: number;
	readonly healthScore: number; // 0.0-1.0
	readonly lastSyncTimestamp: number;
	readonly driftScore: number; // 0.0-1.0
	readonly timestamp: number;
}

/**
 * System intent — what the system is trying to do from a layer's perspective.
 */
export interface ISystemIntent {
	readonly intentId: string;
	readonly domain: IntentDomain;
	readonly description: string;
	readonly priority: SignalPriority;
	readonly originLayer: SystemLayer;
	readonly affectedLayers: readonly SystemLayer[];
	readonly progress: number; // 0.0-1.0
	readonly isAligned: boolean;
	readonly driftFromGlobal: number; // 0.0-1.0
	readonly timestamp: number;
}

/**
 * Global intent — the unified system intent.
 */
export interface IGlobalIntent {
	readonly globalIntentId: string;
	readonly description: string;
	readonly layerIntents: readonly ISystemIntent[];
	readonly alignmentScore: number; // 0.0-1.0
	readonly dominantLayer: SystemLayer;
	readonly conflictCount: number;
	readonly timestamp: number;
}

/**
 * Intent drift — detected misalignment between layers.
 */
export interface IIntentDrift {
	readonly driftId: string;
	readonly layerA: SystemLayer;
	readonly layerB: SystemLayer;
	readonly intentA: ISystemIntent;
	readonly intentB: ISystemIntent;
	readonly driftScore: number; // 0.0-1.0
	readonly autoResolvable: boolean;
	readonly timestamp: number;
}

/**
 * Sync checkpoint — a synchronization point between layers.
 */
export interface ISyncCheckpoint {
	readonly checkpointId: string;
	readonly layers: readonly SystemLayer[];
	readonly stateVersions: ReadonlyMap<SystemLayer, number>;
	readonly syncScore: number; // 0.0-1.0
	readonly driftDetected: boolean;
	readonly timestamp: number;
}

/**
 * Drift correction — an action to bring layers back in sync.
 */
export interface IDriftCorrection {
	readonly correctionId: string;
	readonly targetLayer: SystemLayer;
	readonly correctionType: 'state-override' | 'signal-replay' | 'context-merge' | 'forced-resync';
	readonly description: string;
	readonly appliedAt: number;
	readonly result: SyncStatus;
}

/**
 * Normalized event — a canonical system event after normalization.
 */
export interface INormalizedEvent {
	readonly eventId: string;
	readonly canonicalType: string;
	readonly sourceSignals: readonly string[]; // signalIds that contributed
	readonly payload: unknown;
	readonly deduplicationKey: string;
	readonly normalizationResult: NormalizationResult;
	readonly semanticHash: string;
	readonly timestamp: number;
}

/**
 * Event deduplication rule.
 */
export interface IEventDeduplicationRule {
	readonly ruleId: string;
	readonly eventType: string;
	readonly deduplicationWindowMs: number;
	readonly mergeStrategy: 'keep-newest' | 'keep-oldest' | 'merge-payloads' | 'aggregate';
}

/**
 * Feedback loop state — the current state of a feedback loop.
 */
export interface IFeedbackLoopState {
	readonly direction: FeedbackDirection;
	readonly isActive: boolean;
	readonly adaptationCount: number;
	readonly lastAdaptationAt: number;
	readonly adaptationLatencyMs: number;
	readonly effectiveness: number; // 0.0-1.0
	readonly timestamp: number;
}

/**
 * Feedback adaptation — an adaptation triggered by the feedback loop.
 */
export interface IFeedbackAdaptation {
	readonly adaptationId: string;
	readonly sourceDirection: FeedbackDirection;
	readonly triggerEvent: string;
	readonly adaptationDescription: string;
	readonly affectedServices: readonly string[];
	readonly effectiveness: number; // 0.0-1.0
	readonly appliedAt: number;
	readonly revertedAt: number | null;
}

/**
 * Merged context — context merged from multiple layers.
 */
export interface IMergedContext {
	readonly contextId: string;
	readonly sourceLayers: readonly SystemLayer[];
	readonly graphState: unknown | null;
	readonly agentMemory: unknown | null;
	readonly uxState: unknown | null;
	readonly humanWorkflowState: unknown | null;
	readonly mergeConflicts: readonly IContextConflict[];
	readonly isLossless: boolean;
	readonly completenessScore: number; // 0.0-1.0
	readonly timestamp: number;
}

/**
 * Context conflict — a conflict found during context merging.
 */
export interface IContextConflict {
	readonly conflictId: string;
	readonly layerA: SystemLayer;
	readonly layerB: SystemLayer;
	readonly property: string;
	readonly valueA: unknown;
	readonly valueB: unknown;
	readonly resolution: 'take-a' | 'take-b' | 'merge' | 'defer';
	readonly resolvedAt: number | null;
}

/**
 * System conflict — a conflict between layers or services.
 */
export interface ISystemConflict {
	readonly conflictId: string;
	readonly conflictType: 'ux-vs-execution' | 'human-vs-automation' | 'replay-vs-live' | 'memory-inconsistency' | 'intent-misalignment' | 'state-divergence';
	readonly layerA: SystemLayer;
	readonly layerB: SystemLayer;
	readonly description: string;
	readonly severity: HealthSeverity;
	readonly resolutionStrategy: ConflictPriority;
	readonly isAutoResolvable: boolean;
	readonly timestamp: number;
}

/**
 * Conflict resolution — the result of resolving a conflict.
 */
export interface IConflictResolution {
	readonly resolutionId: string;
	readonly conflictId: string;
	readonly strategy: ConflictPriority;
	readonly winningLayer: SystemLayer;
	readonly resolution: string;
	readonly sideEffects: readonly string[];
	readonly appliedAt: number;
}

/**
 * Layer health — health status for a specific layer.
 */
export interface ILayerHealth {
	readonly layer: SystemLayer;
	readonly healthScore: number; // 0.0-1.0
	readonly severity: HealthSeverity;
	readonly activeAlerts: number;
	readonly serviceHealthMap: ReadonlyMap<string, number>; // serviceId -> health 0.0-1.0
	readonly lastCheckedAt: number;
}

/**
 * Global system health — aggregated health across all layers.
 */
export interface IGlobalSystemHealth {
	readonly overallScore: number; // 0.0-1.0
	readonly layerHealth: ReadonlyMap<SystemLayer, ILayerHealth>;
	readonly totalServices: number;
	readonly healthyServices: number;
	readonly degradedServices: number;
	readonly criticalServices: number;
	readonly activeCoordinatedRecovery: boolean;
	readonly systemStability: number; // 0.0-1.0
	readonly timestamp: number;
}

/**
 * Coordinated recovery action — a recovery triggered by the health orchestrator.
 */
export interface ICoordinatedRecoveryAction {
	readonly actionId: string;
	readonly targetServices: readonly string[];
	readonly actionType: 'restart' | 'degraded-mode' | 'circuit-breaker' | 'load-shed' | 'context-reset';
	readonly triggerLayer: SystemLayer;
	readonly description: string;
	readonly initiatedAt: number;
	readonly completedAt: number | null;
	readonly result: 'success' | 'partial' | 'failed';
}

/**
 * Consciousness map — structural observability (NOT real consciousness).
 */
export interface IConsciousnessMap {
	readonly mapVersion: number;
	readonly goalState: ISystemGoalState;
	readonly crossLayerAwareness: ReadonlyMap<SystemLayer, ILayerAwareness>;
	readonly dependencyAwarenessGraph: IDependencyAwarenessNode[];
	readonly attentionMap: ISystemAttentionMap;
	readonly activeServiceCount: number;
	readonly idleServiceCount: number;
	readonly timestamp: number;
}

/**
 * System goal state — what the system is currently trying to achieve.
 */
export interface ISystemGoalState {
	readonly primaryGoal: string;
	readonly secondaryGoals: readonly string[];
	readonly goalProgress: number; // 0.0-1.0
	readonly blockingIssues: readonly string[];
	readonly activeLayerContributions: ReadonlyMap<SystemLayer, string>;
	readonly timestamp: number;
}

/**
 * Layer awareness — how aware the system is of each layer.
 */
export interface ILayerAwareness {
	readonly layer: SystemLayer;
	readonly isResponsive: boolean;
	readonly lastSignalAt: number;
	readonly signalRate: number; // signals per minute
	readonly pendingOperations: number;
	readonly awarenessScore: number; // 0.0-1.0
}

/**
 * Dependency awareness node — a service in the dependency graph.
 */
export interface IDependencyAwarenessNode {
	readonly serviceId: string;
	readonly layer: SystemLayer;
	readonly dependsOn: readonly string[];
	readonly dependedBy: readonly string[];
	readonly isActive: boolean;
	readonly lastActivityAt: number;
}

/**
 * System attention map — what is active vs idle.
 */
export interface ISystemAttentionMap {
	readonly activeServices: readonly string[];
	readonly idleServices: readonly string[];
	readonly focusLayer: SystemLayer;
	readonly attentionDistribution: ReadonlyMap<SystemLayer, number>; // 0.0-1.0 per layer
	readonly timestamp: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// TASK 1 — GLOBAL SYSTEM COHERENCE ENGINE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Coherence report — validates system coherence.
 */
export interface ICoherenceReport {
	readonly status: CoherenceStatus;
	readonly layerAlignmentScore: number; // 0.0-1.0
	readonly inconsistenciesDetected: number;
	readonly conflictsDetected: number;
	readonly autoResolvedConflicts: number;
	readonly driftDetections: readonly IIntentDrift[];
	readonly overallCoherenceScore: number; // 0.0-1.0
	readonly issues: readonly ICoherenceIssue[];
	readonly timestamp: number;
}

/**
 * Coherence issue — a detected coherence problem.
 */
export interface ICoherenceIssue {
	readonly issueType: 'layer-isolation' | 'state-divergence' | 'intent-misalignment' | 'signal-loss' | 'stale-state' | 'orphaned-dependency';
	readonly description: string;
	readonly affectedLayers: readonly SystemLayer[];
	readonly severity: 'critical' | 'warning' | 'info';
	readonly autoResolvable: boolean;
}

/**
 * ISystemCoherenceEngineService — Ensures the system acts as ONE coherent unit.
 *
 * Detects cross-layer inconsistencies, ensures UX + Execution + Human layers
 * align, prevents "layer isolation bugs", maintains global system intent
 * consistency, resolves conflicts between services.
 */
export const ISystemCoherenceEngineService = createDecorator<ISystemCoherenceEngineService>('systemCoherenceEngineService');

export interface ISystemCoherenceEngineService {
	readonly _serviceBrand: undefined;

	/** Current coherence status */
	readonly status: CoherenceStatus;

	/** Current coherence score (0.0-1.0) */
	readonly coherenceScore: number;

	/** Event: coherence status changed */
	readonly onDidChangeCoherence: Event<CoherenceStatus>;

	/** Event: inconsistency detected */
	readonly onDidDetectInconsistency: Event<ICoherenceIssue>;

	/** Detect cross-layer inconsistencies */
	detectInconsistencies(): readonly ICoherenceIssue[];

	/** Check if UX + Execution + Human layers are aligned */
	areCoreLayersAligned(): boolean;

	/** Verify no layer isolation bugs exist */
	verifyNoLayerIsolation(): boolean;

	/** Maintain global system intent consistency */
	maintainIntentConsistency(): IGlobalIntent;

	/** Resolve conflicts between services */
	resolveConflicts(conflicts: readonly ISystemConflict[]): readonly IConflictResolution[];

	/** Get layer state snapshots */
	getLayerSnapshots(): ReadonlyMap<SystemLayer, ILayerStateSnapshot>;

	/** Validate coherence */
	validateCoherence(): ICoherenceReport;
}

// ═══════════════════════════════════════════════════════════════════════════════
// TASK 2 — CROSS-LAYER SIGNAL BUS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Signal bus metrics — performance and usage metrics for the signal bus.
 */
export interface ISignalBusMetrics {
	readonly totalSignalsRouted: number;
	readonly signalsPerSecond: number;
	readonly averageLatencyMs: number;
	readonly droppedSignals: number;
	readonly activeSubscriptions: number;
	readonly queueDepth: number;
	readonly timestamp: number;
}

/**
 * ICrossLayerSignalBusService — Unified signal router for ALL cross-layer communication.
 *
 * Routes: execution events, UI state changes, human workflow signals,
 * system stability signals, replay insights.
 *
 * RULES:
 *   - No service communicates directly across layers anymore
 *   - ALL cross-layer communication goes through this bus
 *   - Signals are normalized, prioritized, and auditable
 */
export const ICrossLayerSignalBusService = createDecorator<ICrossLayerSignalBusService>('crossLayerSignalBusService');

export interface ICrossLayerSignalBusService {
	readonly _serviceBrand: undefined;

	/** Event: signal routed */
	readonly onDidRouteSignal: Event<ICrossLayerSignal>;

	/** Event: signal dropped (queue full or invalid) */
	readonly onDidDropSignal: Event<ICrossLayerSignal>;

	/** Emit a signal to the bus */
	emitSignal(signal: Omit<ICrossLayerSignal, 'signalId' | 'isNormalized'>): ICrossLayerSignal;

	/** Subscribe to signals from specific layers */
	subscribe(targetLayer: SystemLayer, eventTypes: readonly string[], callback: (signal: ICrossLayerSignal) => void): IDisposable;

	/** Subscribe to all signals (observability) */
	subscribeAll(callback: (signal: ICrossLayerSignal) => void): IDisposable;

	/** Get pending signals for a layer */
	getPendingSignals(layer: SystemLayer): readonly ICrossLayerSignal[];

	/** Route a signal immediately (bypasses queue for critical signals) */
	routeImmediate(signal: Omit<ICrossLayerSignal, 'signalId' | 'isNormalized'>): ICrossLayerSignal;

	/** Get signal bus metrics */
	readonly metrics: ISignalBusMetrics;

	/** Verify no direct cross-layer calls bypass the bus */
	verifyNoDirectCalls(): IDirectCallViolation[];

	/** Validate signal bus health */
	validateSignalBus(): ISignalBusReport;
}

/**
 * Direct call violation — a service bypassing the signal bus.
 */
export interface IDirectCallViolation {
	readonly sourceService: string;
	readonly targetService: string;
	readonly sourceLayer: SystemLayer;
	readonly targetLayer: SystemLayer;
	readonly description: string;
	readonly severity: 'critical' | 'warning' | 'info';
}

/**
 * Signal bus report — validates signal bus health.
 */
export interface ISignalBusReport {
	readonly totalRoutesActive: number;
	readonly signalsRoutedSuccessfully: number;
	readonly signalsDropped: number;
	readonly directCallViolations: number;
	readonly overallHealth: number; // 0.0-1.0
	readonly issues: readonly ISignalBusIssue[];
	readonly timestamp: number;
}

/**
 * Signal bus issue.
 */
export interface ISignalBusIssue {
	readonly issueType: 'signal-loss' | 'queue-overflow' | 'direct-bypass' | 'stale-subscription' | 'priority-inversion';
	readonly description: string;
	readonly severity: 'critical' | 'warning' | 'info';
}

// ═══════════════════════════════════════════════════════════════════════════════
// TASK 3 — SYSTEM INTENT ALIGNMENT ENGINE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Intent alignment report — validates intent alignment.
 */
export interface IIntentAlignmentReport {
	readonly globalIntent: IGlobalIntent | null;
	readonly layerIntents: ReadonlyMap<SystemLayer, ISystemIntent>;
	readonly driftCount: number;
	readonly alignmentScore: number; // 0.0-1.0
	readonly autoResolutionsApplied: number;
	readonly issues: readonly IIntentAlignmentIssue[];
	readonly timestamp: number;
}

/**
 * Intent alignment issue.
 */
export interface IIntentAlignmentIssue {
	readonly issueType: 'intent-drift' | 'conflicting-intent' | 'orphaned-intent' | 'stale-intent' | 'missing-intent';
	readonly layer: SystemLayer;
	readonly description: string;
	readonly severity: 'critical' | 'warning' | 'info';
}

/**
 * ISystemIntentAlignmentService — Maintains global "what the system is trying to do".
 *
 * Detects drift between UI intent, Execution intent, Human workflow intent.
 * Resolves misalignment automatically when safe.
 */
export const ISystemIntentAlignmentService = createDecorator<ISystemIntentAlignmentService>('systemIntentAlignmentService');

export interface ISystemIntentAlignmentService {
	readonly _serviceBrand: undefined;

	/** Current global intent */
	readonly globalIntent: IGlobalIntent | null;

	/** Current alignment score (0.0-1.0) */
	readonly alignmentScore: number;

	/** Event: intent drift detected */
	readonly onDidDetectDrift: Event<IIntentDrift>;

	/** Event: global intent updated */
	readonly onDidChangeGlobalIntent: Event<IGlobalIntent>;

	/** Register a layer's current intent */
	registerLayerIntent(layer: SystemLayer, intent: Omit<ISystemIntent, 'intentId' | 'isAligned' | 'driftFromGlobal' | 'timestamp'>): ISystemIntent;

	/** Detect drift between layers */
	detectDrift(): readonly IIntentDrift[];

	/** Get the global intent — the unified system intent */
	resolveGlobalIntent(): IGlobalIntent;

	/** Auto-resolve misalignment when safe */
	autoResolveDrift(drift: IIntentDrift): boolean;

	/** Get layer intents */
	getLayerIntents(): ReadonlyMap<SystemLayer, ISystemIntent>;

	/** Validate intent alignment */
	validateIntentAlignment(): IIntentAlignmentReport;
}

// ═══════════════════════════════════════════════════════════════════════════════
// TASK 4 — LAYER SYNCHRONIZATION ENGINE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Sync report — validates layer synchronization.
 */
export interface ILayerSyncReport {
	readonly overallSyncStatus: SyncStatus;
	readonly layerSyncScores: ReadonlyMap<SystemLayer, number>;
	readonly driftCorrectionsApplied: number;
	readonly reconciliationActions: number;
	readonly staleStateDetected: boolean;
	readonly issues: readonly ILayerSyncIssue[];
	readonly timestamp: number;
}

/**
 * Layer sync issue.
 */
export interface ILayerSyncIssue {
	readonly issueType: 'ux-execution-desync' | 'human-system-desync' | 'replay-live-desync' | 'stale-ui-state' | 'conflicting-state';
	readonly affectedLayers: readonly SystemLayer[];
	readonly description: string;
	readonly severity: 'critical' | 'warning' | 'info';
}

/**
 * ILayerSynchronizationService — Ensures all layers reflect consistent state.
 *
 * UX state matches execution state, human workflow matches system state,
 * replay state reflects real execution, no stale or conflicting UI.
 *
 * Includes: sync loops, drift correction, state reconciliation.
 */
export const ILayerSynchronizationService = createDecorator<ILayerSynchronizationService>('layerSynchronizationService');

export interface ILayerSynchronizationService {
	readonly _serviceBrand: undefined;

	/** Current overall sync status */
	readonly syncStatus: SyncStatus;

	/** Event: drift detected */
	readonly onDidDetectDrift: Event<IDriftCorrection>;

	/** Event: sync status changed */
	readonly onDidChangeSyncStatus: Event<SyncStatus>;

	/** Create a sync checkpoint */
	createCheckpoint(): ISyncCheckpoint;

	/** Check if UX state matches execution state */
	areUXAndExecutionSynced(): boolean;

	/** Check if human workflow matches system state */
	areHumanAndSystemSynced(): boolean;

	/** Check if replay state reflects real execution */
	areReplayAndLiveSynced(): boolean;

	/** Detect stale UI state */
	detectStaleState(): readonly ILayerStateSnapshot[];

	/** Apply drift correction */
	applyDriftCorrection(layer: SystemLayer, correctionType: IDriftCorrection['correctionType']): IDriftCorrection;

	/** Reconcile conflicting states */
	reconcileStates(layerA: SystemLayer, layerB: SystemLayer): IDriftCorrection;

	/** Force full resync of all layers */
	forceFullResync(): void;

	/** Get last sync checkpoint */
	readonly lastCheckpoint: ISyncCheckpoint | null;

	/** Validate layer synchronization */
	validateLayerSync(): ILayerSyncReport;
}

// ═══════════════════════════════════════════════════════════════════════════════
// TASK 5 — GLOBAL EVENT NORMALIZER
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Event normalization report.
 */
export interface IEventNormalizationReport {
	readonly totalEventsProcessed: number;
	readonly normalizedCount: number;
	readonly duplicatesDiscarded: number;
	readonly mergedCount: number;
	readonly suppressedCount: number;
	readonly failedCount: number;
	readonly deduplicationRules: number;
	readonly eventExplosionRate: number; // events/second
	readonly overallHealth: number; // 0.0-1.0
	readonly issues: readonly IEventNormalizationIssue[];
	readonly timestamp: number;
}

/**
 * Event normalization issue.
 */
export interface IEventNormalizationIssue {
	readonly issueType: 'event-explosion' | 'duplicate-semantic-meaning' | 'normalization-failure' | 'rule-conflict' | 'payload-corruption';
	readonly description: string;
	readonly severity: 'critical' | 'warning' | 'info';
}

/**
 * IGlobalEventNormalizationService — Normalizes all events across the system.
 *
 * Converts raw events to canonical system events, removes duplicate semantic
 * meaning, prevents event explosion across services, deduplicates, merges,
 * and suppresses noisy events.
 */
export const IGlobalEventNormalizationService = createDecorator<IGlobalEventNormalizationService>('globalEventNormalizationService');

export interface IGlobalEventNormalizationService {
	readonly _serviceBrand: undefined;

	/** Event: normalized event produced */
	readonly onDidNormalizeEvent: Event<INormalizedEvent>;

	/** Submit a raw event for normalization */
	submitRawEvent(source: SystemLayer, eventType: string, payload: unknown): INormalizedEvent;

	/** Register a deduplication rule */
	registerDeduplicationRule(rule: IEventDeduplicationRule): void;

	/** Get canonical event type for a raw event type */
	getCanonicalType(rawEventType: string): string;

	/** Check if an event is a duplicate */
	isDuplicate(eventType: string, deduplicationKey: string): boolean;

	/** Get normalized event history */
	getNormalizedEvents(durationMs: number): readonly INormalizedEvent[];

	/** Get event rate (events per second) */
	readonly eventRate: number;

	/** Suppress a noisy event type temporarily */
	suppressEventType(eventType: string, durationMs: number): IDisposable;

	/** Validate event normalization */
	validateEventNormalization(): IEventNormalizationReport;
}

// ═══════════════════════════════════════════════════════════════════════════════
// TASK 6 — SYSTEM FEEDBACK LOOP ENGINE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Feedback loop report — validates the closed-loop feedback system.
 */
export interface IFeedbackLoopReport {
	readonly loopDirections: ReadonlyMap<FeedbackDirection, IFeedbackLoopState>;
	readonly totalAdaptationsApplied: number;
	readonly adaptationSuccessRate: number;
	readonly circularLoopDetected: boolean;
	readonly averageLatencyMs: number;
	readonly closedLoopActive: boolean;
	readonly issues: readonly IFeedbackLoopIssue[];
	readonly timestamp: number;
}

/**
 * Feedback loop issue.
 */
export interface IFeedbackLoopIssue {
	readonly issueType: 'circular-loop' | 'oscillation' | 'stale-feedback' | 'feedback-starvation' | 'adaptation-failure';
	readonly direction: FeedbackDirection;
	readonly description: string;
	readonly severity: 'critical' | 'warning' | 'info';
}

/**
 * ISystemFeedbackLoopService — The closed adaptive system loop.
 *
 * Execution -> UX adaptation
 * UX -> Human behavior adjustment
 * Human -> Workflow adaptation
 * Stability -> Throttling changes
 *
 * This creates a CLOSED adaptive system loop.
 * Must prevent circular feedback loops and oscillation.
 */
export const ISystemFeedbackLoopService = createDecorator<ISystemFeedbackLoopService>('systemFeedbackLoopService');

export interface ISystemFeedbackLoopService {
	readonly _serviceBrand: undefined;

	/** Current feedback loop states */
	readonly loopStates: ReadonlyMap<FeedbackDirection, IFeedbackLoopState>;

	/** Event: adaptation applied */
	readonly onDidApplyAdaptation: Event<IFeedbackAdaptation>;

	/** Event: circular loop detected */
	readonly onDidDetectCircularLoop: Event<FeedbackDirection>;

	/** Trigger an adaptation in a feedback direction */
	triggerAdaptation(direction: FeedbackDirection, triggerEvent: string, description: string): IFeedbackAdaptation;

	/** Get recent adaptations */
	getRecentAdaptations(durationMs: number): readonly IFeedbackAdaptation[];

	/** Check if circular feedback loops exist */
	detectCircularLoops(): readonly FeedbackDirection[];

	/** Verify no oscillation in feedback loops */
	hasOscillation(): boolean;

	/** Get feedback loop effectiveness */
	getEffectiveness(direction: FeedbackDirection): number;

	/** Validate feedback loop health */
	validateFeedbackLoop(): IFeedbackLoopReport;
}

// ═══════════════════════════════════════════════════════════════════════════════
// TASK 7 — CONTEXTUAL SYSTEM MEMORY MERGER
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Context merger report.
 */
export interface IContextMergerReport {
	readonly totalMergesPerformed: number;
	readonly losslessMergeRate: number;
	readonly conflictResolutionRate: number;
	readonly averageCompletenessScore: number;
	readonly fragmentationCount: number;
	readonly issues: readonly IContextMergerIssue[];
	readonly timestamp: number;
}

/**
 * Context merger issue.
 */
export interface IContextMergerIssue {
	readonly issueType: 'context-fragmentation' | 'lossy-merge' | 'unresolved-conflict' | 'missing-source' | 'stale-context';
	readonly description: string;
	readonly severity: 'critical' | 'warning' | 'info';
}

/**
 * ISystemContextMergerService — Merges context from all layers without loss.
 *
 * Merges context from: graph state, agent memory, UX state, human workflow
 * state. Prevents context fragmentation. Resolves conflicts across memory
 * sources. Merging MUST be lossless.
 */
export const ISystemContextMergerService = createDecorator<ISystemContextMergerService>('systemContextMergerService');

export interface ISystemContextMergerService {
	readonly _serviceBrand: undefined;

	/** Event: context merged */
	readonly onDidMergeContext: Event<IMergedContext>;

	/** Event: context conflict detected */
	readonly onDidDetectContextConflict: Event<IContextConflict>;

	/** Merge context from all layers */
	mergeAllLayers(): IMergedContext;

	/** Merge context from specific layers */
	mergeLayers(layers: readonly SystemLayer[]): IMergedContext;

	/** Detect context fragmentation */
	detectFragmentation(): readonly SystemLayer[];

	/** Resolve a context conflict */
	resolveConflict(conflict: IContextConflict, resolution: IContextConflict['resolution']): IContextConflict;

	/** Check if a merge was lossless */
	isLossless(mergedContext: IMergedContext): boolean;

	/** Get current merged context */
	readonly currentContext: IMergedContext | null;

	/** Validate context merger */
	validateContextMerger(): IContextMergerReport;
}

// ═══════════════════════════════════════════════════════════════════════════════
// TASK 8 — SYSTEM CONFLICT RESOLUTION ENGINE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Conflict resolution report.
 */
export interface IConflictResolutionReport {
	readonly totalConflictsDetected: number;
	readonly conflictsResolved: number;
	readonly autoResolutionRate: number;
	readonly safetyFirstAdherence: number; // 0.0-1.0
	readonly resolutionLatencyMs: number;
	readonly issues: readonly IConflictResolutionIssue[];
	readonly timestamp: number;
}

/**
 * Conflict resolution issue.
 */
export interface IConflictResolutionIssue {
	readonly issueType: 'unresolved-conflict' | 'wrong-priority' | 'side-effect-damage' | 'resolution-failure' | 'escalation-needed';
	readonly description: string;
	readonly severity: 'critical' | 'warning' | 'info';
}

/**
 * ISystemConflictResolverService — Detects and resolves cross-layer conflicts.
 *
 * Detects: UX vs Execution conflicts, Human vs Automation conflicts,
 * Replay vs Live state mismatches, Memory inconsistencies.
 *
 * Resolution strategies:
 *   Safety > Correctness > UX > Performance
 */
export const ISystemConflictResolverService = createDecorator<ISystemConflictResolverService>('systemConflictResolverService');

export interface ISystemConflictResolverService {
	readonly _serviceBrand: undefined;

	/** Event: conflict detected */
	readonly onDidDetectConflict: Event<ISystemConflict>;

	/** Event: conflict resolved */
	readonly onDidResolveConflict: Event<IConflictResolution>;

	/** Detect all current conflicts */
	detectConflicts(): readonly ISystemConflict[];

	/** Resolve a specific conflict */
	resolveConflict(conflict: ISystemConflict): IConflictResolution;

	/** Auto-resolve all resolvable conflicts */
	autoResolveAll(): readonly IConflictResolution[];

	/** Get active conflicts */
	getActiveConflicts(): readonly ISystemConflict[];

	/** Get conflict history */
	getConflictHistory(durationMs: number): readonly ISystemConflict[];

	/** Check if the resolution priority order is maintained */
	verifyResolutionPriorityOrder(): boolean;

	/** Validate conflict resolution */
	validateConflictResolution(): IConflictResolutionReport;
}

// ═══════════════════════════════════════════════════════════════════════════════
// TASK 9 — GLOBAL SYSTEM HEALTH ORCHESTRATOR
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Health orchestration report.
 */
export interface IHealthOrchestrationReport {
	readonly globalHealth: IGlobalSystemHealth;
	readonly layerHealthScores: ReadonlyMap<SystemLayer, number>;
	readonly coordinatedRecoveriesInitiated: number;
	readonly systemicInstabilityDetected: boolean;
	readonly earlyWarningTriggers: number;
	readonly overallOrchestrationScore: number; // 0.0-1.0
	readonly issues: readonly IHealthOrchestrationIssue[];
	readonly timestamp: number;
}

/**
 * Health orchestration issue.
 */
export interface IHealthOrchestrationIssue {
	readonly issueType: 'systemic-instability' | 'cascading-failure' | 'unmonitored-service' | 'recovery-failure' | 'health-blind-spot';
	readonly description: string;
	readonly severity: 'critical' | 'warning' | 'info';
}

/**
 * IGlobalSystemHealthOrchestratorService — Aggregates health across ALL 69 services.
 *
 * Produces single system health score, detects systemic instability early,
 * triggers coordinated recovery actions.
 */
export const IGlobalSystemHealthOrchestratorService = createDecorator<IGlobalSystemHealthOrchestratorService>('globalSystemHealthOrchestratorService');

export interface IGlobalSystemHealthOrchestratorService {
	readonly _serviceBrand: undefined;

	/** Current global system health */
	readonly globalHealth: IGlobalSystemHealth;

	/** Event: health score changed */
	readonly onDidChangeHealth: Event<IGlobalSystemHealth>;

	/** Event: coordinated recovery initiated */
	readonly onDidInitiateRecovery: Event<ICoordinatedRecoveryAction>;

	/** Compute global health score */
	computeHealthScore(): IGlobalSystemHealth;

	/** Get health for a specific layer */
	getLayerHealth(layer: SystemLayer): ILayerHealth;

	/** Detect systemic instability early */
	detectSystemicInstability(): boolean;

	/** Trigger coordinated recovery */
	triggerCoordinatedRecovery(actionType: ICoordinatedRecoveryAction['actionType'], targetServices: readonly string[]): ICoordinatedRecoveryAction;

	/** Get active recovery actions */
	getActiveRecoveries(): readonly ICoordinatedRecoveryAction[];

	/** Get health history */
	getHealthHistory(durationMs: number): readonly IGlobalSystemHealth[];

	/** Validate health orchestration */
	validateHealthOrchestration(): IHealthOrchestrationReport;
}

// ═══════════════════════════════════════════════════════════════════════════════
// TASK 10 — UNIFIED SYSTEM CONSCIOUSNESS LAYER (METADATA ONLY)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Consciousness model report — validates the consciousness model.
 */
export interface IConsciousnessModelReport {
	readonly mapVersion: number;
	readonly goalStateTracked: boolean;
	readonly crossLayerAwarenessComplete: boolean;
	readonly dependencyGraphComplete: boolean;
	readonly attentionMapAccurate: boolean;
	readonly observabilityOnly: boolean;
	readonly noRealConsciousnessClaim: boolean;
	readonly issues: readonly IConsciousnessModelIssue[];
	readonly timestamp: number;
}

/**
 * Consciousness model issue.
 */
export interface IConsciousnessModelIssue {
	readonly issueType: 'missing-goal-state' | 'awareness-gap' | 'dependency-orphan' | 'stale-attention-map' | 'consciousness-claim';
	readonly description: string;
	readonly severity: 'critical' | 'warning' | 'info';
}

/**
 * ISystemConsciousnessModelService — Structural observability ONLY.
 *
 * NOT real consciousness — strictly structural:
 *   - System goal state tracking
 *   - Cross-layer awareness map
 *   - Dependency awareness graph
 *   - System "attention map" (what is active vs idle)
 *
 * This is for observability ONLY. It never makes decisions.
 * It never claims to be "aware" in any sentient sense.
 */
export const ISystemConsciousnessModelService = createDecorator<ISystemConsciousnessModelService>('systemConsciousnessModelService');

export interface ISystemConsciousnessModelService {
	readonly _serviceBrand: undefined;

	/** Current consciousness map (observability only) */
	readonly consciousnessMap: IConsciousnessMap;

	/** Event: consciousness map updated */
	readonly onDidChangeConsciousnessMap: Event<IConsciousnessMap>;

	/** Get system goal state */
	getGoalState(): ISystemGoalState;

	/** Get cross-layer awareness */
	getCrossLayerAwareness(): ReadonlyMap<SystemLayer, ILayerAwareness>;

	/** Get dependency awareness graph */
	getDependencyAwarenessGraph(): readonly IDependencyAwarenessNode[];

	/** Get system attention map */
	getAttentionMap(): ISystemAttentionMap;

	/** Check if a service is active */
	isServiceActive(serviceId: string): boolean;

	/** Get the focus layer — which layer currently has most activity */
	readonly focusLayer: SystemLayer;

	/** Verify this is observability-only (never makes decisions) */
	readonly isObservabilityOnly: boolean;

	/** Validate consciousness model */
	validateConsciousnessModel(): IConsciousnessModelReport;
}
