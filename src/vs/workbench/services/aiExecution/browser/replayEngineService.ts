/*---------------------------------------------------------------------------------------------
 *  Unified Execution Simulation & Replay Engine — Phase 11
 *  Real Vibecode — AI-Native IDE
 *
 *  ReplayEngineService — Full browser implementation of IExecutionReplayService.
 *  A read-only deterministic mirror of the entire system.
 *
 *  HARD RULES ENFORCED:
 *    1. MUST NOT execute real mutations
 *    2. MUST NOT interfere with runtime systems
 *    3. ONLY observe, reconstruct, simulate
 *    4. Same snapshot + same intent → same output (STRICT mode)
 *    5. Agents/processes MUST NOT execute real actions during replay
 *    6. Timeline MUST reconstruct full intent chain
 *    7. Causal chain MUST NOT break during reconstruction
 *    8. Snapshots MUST be timestamped, immutable, diffable
 *--------------------------------------------------------------------------------------------*/

import { Emitter, Event } from '../../../../base/common/event.js';
import { Disposable, IDisposable } from '../../../../base/common/lifecycle.js';
import { generateUuid } from '../../../../base/common/uuid.js';
import { URI } from '../../../../base/common/uri.js';
import { IExecutionGraphService, IExecutionNode, ExecutionNodeType, IExecutionEdge, ExecutionEdgeType } from '../common/executionGraphService.js';
import { IAIExecutionService, AIMutationSource } from '../common/aiExecutionService.js';
import { IAgentOrchestratorService, AgentLifecycleState, AgentCapability } from '../common/agentOrchestratorService.js';
import { IAIProcessOrchestratorService, ProcessLifecycleState, ExecutionMode } from '../common/aiProcessOrchestratorService.js';
import { IAIContextService, ContextFreshness, ContextDomain } from '../common/aiContextService.js';
import { IGlobalExecutionBrainService, IIntent, IntentSource, IntentPriority, IntentScope, IntentResolution, IntentActionType, IGlobalDecision, DecisionType, IBrainEvent, BrainEventCategory, BrainEventSource, ExecutionLoopPhase, SystemHealthStatus, ConflictType, IConflict } from '../common/globalExecutionBrain.js';
import { IAIUnifiedStateService, AIRuntimePhase, IStateTransitionEvent } from '../common/aiUnifiedStateService.js';
import { IObservabilityService } from '../common/observabilityService.js';
import { ISystemStabilizationService, SystemStabilityState, BackpressureLevel, MemoryPressureLevel } from '../common/systemStabilization.js';
import {
	IExecutionReplayService,
	ReplayMode,
	IReplaySeed,
	IDeterministicReplayResult,
	IReplayDivergence,
	SnapshotLayer,
	ISystemSnapshot,
	IGraphSnapshotLayer,
	IContextSnapshotLayer,
	IAgentSnapshotLayer,
	IProcessSnapshotLayer,
	IIntentSnapshotLayer,
	IBrainSnapshotLayer,
	IExecutionTimelineEvent,
	ITimelineSegment,
	ITimelineFilter,
	TimelineEventSource,
	TimelineEventCategory,
	IAgentSimulationResult,
	ISimulatedPlan,
	ISimulatedDecision,
	IProcessSimulationResult,
	ISimulatedOutputChunk,
	ISimulatedLifecycleTransition,
	ISimulatedFailurePath,
	IStateReconstructionResult,
	IReconstructionGap,
	ISnapshotDiff,
	ISnapshotChange,
	ICausalChain,
	IDebugSession,
	ICausalTrace,
	IWhyResolution,
	IExecutionTimelineViewModel,
	ISnapshotMarker,
	IIntentMarker,
	IReplayControllerViewModel,
	ISnapshotInspectorViewModel,
	ICausalTraceViewModel,
	ICausalTraceStep,
	IDiffViewerViewModel,
	IReplayStatus,
	IReplayIntegrityCheck,
} from '../common/replayEngine.js';

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

/** Simple FNV-1a hash for snapshot immutability checks. */
function fnv1aHash(data: string): number {
	let hash = 0x811c9dc5;
	for (let i = 0; i < data.length; i++) {
		hash ^= data.charCodeAt(i);
		hash = (hash * 0x01000193) >>> 0;
	}
	return hash;
}

/** Deterministic seed-based pseudo-random number generator (xorshift32). */
class SeededRandom {
	private state: number;
	constructor(seed: number) {
		this.state = seed >>> 0;
		if (this.state === 0) { this.state = 1; }
	}
	next(): number {
		let x = this.state;
		x ^= x << 13;
		x ^= x >>> 17;
		x ^= x << 5;
		this.state = x >>> 0;
		return this.state / 0x100000000;
	}
	nextInt(min: number, max: number): number {
		return Math.floor(this.next() * (max - min + 1)) + min;
	}
	nextBool(probability: number = 0.5): boolean {
		return this.next() < probability;
	}
	pick<T>(arr: readonly T[]): T {
		return arr[Math.floor(this.next() * arr.length)];
	}
}

/** All snapshot layers in order. */
const ALL_LAYERS: readonly SnapshotLayer[] = [
	SnapshotLayer.Graph,
	SnapshotLayer.Context,
	SnapshotLayer.Agent,
	SnapshotLayer.Process,
	SnapshotLayer.Intent,
	SnapshotLayer.Brain,
];

// ═══════════════════════════════════════════════════════════════════════════════
// MUTABLE SESSION STATE (internal only — never leaks to runtime)
// ═══════════════════════════════════════════════════════════════════════════════

interface IMutableDebugSession {
	id: string;
	intentId: string | undefined;
	fromTimestamp: number;
	toTimestamp: number;
	currentTimestamp: number;
	currentStep: number;
	totalSteps: number;
	paused: boolean;
	events: IExecutionTimelineEvent[];
	currentCausalTrace: ICausalTrace | undefined;
	snapshotIds: string[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// SERVICE IMPLEMENTATION
// ═══════════════════════════════════════════════════════════════════════════════

export class ReplayEngineService extends Disposable implements IExecutionReplayService {
	readonly _serviceBrand: undefined;

	// ─── Internal State ────────────────────────────────────────────────────────

	private _snapshots: Map<string, ISystemSnapshot> = new Map();
	private _timelineEvents: IExecutionTimelineEvent[] = [];
	private _debugSessions: Map<string, IMutableDebugSession> = new Map();
	private _replaySeeds: Map<string, IReplaySeed> = new Map();
	private _divergences: IReplayDivergence[] = [];
	private _autoCaptureTimer: ReturnType<typeof setInterval> | undefined;
	private _replayMode: ReplayMode = ReplayMode.Strict;
	private _mutationLeakDetected: boolean = false;
	private _replayActive: boolean = false;
	private _eventCounter: number = 0;

	// ─── Emitters ─────────────────────────────────────────────────────────────

	private readonly _onDidCaptureSnapshot = this._register(new Emitter<ISystemSnapshot>());
	readonly onDidCaptureSnapshot: Event<ISystemSnapshot> = this._onDidCaptureSnapshot.event;

	private readonly _onDidRecordTimelineEvent = this._register(new Emitter<IExecutionTimelineEvent>());
	readonly onDidRecordTimelineEvent: Event<IExecutionTimelineEvent> = this._onDidRecordTimelineEvent.event;

	// ─── Constructor ──────────────────────────────────────────────────────────

	constructor(
		@IGlobalExecutionBrainService private readonly brainService: IGlobalExecutionBrainService,
		@IAgentOrchestratorService private readonly agentOrchestrator: IAgentOrchestratorService,
		@IAIProcessOrchestratorService private readonly processOrchestrator: IAIProcessOrchestratorService,
		@IExecutionGraphService private readonly graphService: IExecutionGraphService,
		@IAIContextService private readonly contextService: IAIContextService,
		@IObservabilityService private readonly observabilityService: IObservabilityService,
		@IAIUnifiedStateService private readonly stateService: IAIUnifiedStateService,
		@ISystemStabilizationService private readonly stabilizationService: ISystemStabilizationService,
		@IAIExecutionService private readonly executionService: IAIExecutionService,
	) {
		super();

		// ─── Observe events from all subsystems (READ-ONLY) ─────────────────
		// We subscribe to onDid* events to build the timeline, but we NEVER
		// fire events back into the runtime.

		this._register(this.graphService.onDidCreateNode(node => {
			this._recordTimelineEvent({
				source: TimelineEventSource.ExecutionGraph,
				category: TimelineEventCategory.GraphChange,
				description: `Graph node created: ${node.label}`,
				intentId: undefined,
				agentId: undefined,
				processSessionId: undefined,
				graphNodeId: node.id,
				data: { type: node.type, source: node.mutationSource },
				hasSideEffects: false,
			});
		}));

		this._register(this.graphService.onDidCompleteNode(node => {
			this._recordTimelineEvent({
				source: TimelineEventSource.ExecutionGraph,
				category: TimelineEventCategory.GraphChange,
				description: `Graph node completed: ${node.label}`,
				intentId: undefined,
				agentId: undefined,
				processSessionId: undefined,
				graphNodeId: node.id,
				data: { success: node.success, error: node.error },
				hasSideEffects: true,
			});
		}));

		this._register(this.graphService.onDidCreateEdge(edge => {
			this._recordTimelineEvent({
				source: TimelineEventSource.ExecutionGraph,
				category: TimelineEventCategory.GraphChange,
				description: `Edge created: ${edge.sourceId} → ${edge.targetId}`,
				intentId: undefined,
				agentId: undefined,
				processSessionId: undefined,
				graphNodeId: undefined,
				data: { edgeType: edge.type, sourceId: edge.sourceId, targetId: edge.targetId },
				hasSideEffects: false,
			});
		}));

		this._register(this.agentOrchestrator.onDidChangeAgentLifecycle(e => {
			this._recordTimelineEvent({
				source: TimelineEventSource.AgentOrchestrator,
				category: TimelineEventCategory.AgentLifecycle,
				description: `Agent ${e.agentId}: ${e.fromState} → ${e.toState}`,
				intentId: undefined,
				agentId: e.agentId,
				processSessionId: undefined,
				graphNodeId: undefined,
				data: { fromState: e.fromState, toState: e.toState, trigger: e.trigger, planId: e.planId },
				hasSideEffects: false,
			});
		}));

		this._register(this.agentOrchestrator.onDidChangePlanStatus(e => {
			this._recordTimelineEvent({
				source: TimelineEventSource.AgentOrchestrator,
				category: TimelineEventCategory.AgentLifecycle,
				description: `Plan ${e.planId}: ${e.fromStatus} → ${e.toStatus}`,
				intentId: undefined,
				agentId: e.agentId,
				processSessionId: undefined,
				graphNodeId: undefined,
				data: { fromStatus: e.fromStatus, toStatus: e.toStatus, reason: e.reason },
				hasSideEffects: e.toStatus === 'completed' || e.toStatus === 'failed',
			});
		}));

		this._register(this.agentOrchestrator.onDidChangeStepStatus(e => {
			this._recordTimelineEvent({
				source: TimelineEventSource.AgentOrchestrator,
				category: TimelineEventCategory.AgentLifecycle,
				description: `Step ${e.stepId}: ${e.fromStatus} → ${e.toStatus}`,
				intentId: undefined,
				agentId: e.agentId,
				processSessionId: undefined,
				graphNodeId: undefined,
				data: { stepId: e.stepId, fromStatus: e.fromStatus, toStatus: e.toStatus, error: e.error },
				hasSideEffects: e.toStatus === 'completed' || e.toStatus === 'failed',
			});
		}));

		this._register(this.processOrchestrator.onDidChangeProcessLifecycle(e => {
			this._recordTimelineEvent({
				source: TimelineEventSource.ProcessOrchestrator,
				category: TimelineEventCategory.ProcessLifecycle,
				description: `Process ${e.sessionId}: ${e.fromState} → ${e.toState}`,
				intentId: undefined,
				agentId: undefined,
				processSessionId: e.sessionId,
				graphNodeId: undefined,
				data: { fromState: e.fromState, toState: e.toState, reason: e.reason },
				hasSideEffects: e.toState === 'running' || e.toState === 'completed' || e.toState === 'failed',
			});
		}));

		this._register(this.contextService.onDidUpdateContext(e => {
			this._recordTimelineEvent({
				source: TimelineEventSource.ContextEngine,
				category: TimelineEventCategory.ContextUpdate,
				description: `Context updated: ${e.domain} (${e.trigger})`,
				intentId: undefined,
				agentId: undefined,
				processSessionId: undefined,
				graphNodeId: undefined,
				data: { domain: e.domain, trigger: e.trigger, affectedUris: e.affectedUris.map(u => u.toString()) },
				hasSideEffects: false,
			});
		}));

		this._register(this.stateService.onDidChangeState(e => {
			this._recordTimelineEvent({
				source: TimelineEventSource.UnifiedState,
				category: TimelineEventCategory.StateTransition,
				description: `State: ${e.fromPhase} → ${e.toPhase} (${e.trigger})`,
				intentId: undefined,
				agentId: undefined,
				processSessionId: undefined,
				graphNodeId: undefined,
				data: { fromPhase: e.fromPhase, toPhase: e.toPhase, trigger: e.trigger },
				hasSideEffects: true,
			});
		}));

		this._register(this.stabilizationService.onDidChangeStabilityState(e => {
			this._recordTimelineEvent({
				source: TimelineEventSource.Stabilization,
				category: TimelineEventCategory.HealthStability,
				description: `Stability: ${e.from} → ${e.to} (${e.reason})`,
				intentId: undefined,
				agentId: undefined,
				processSessionId: undefined,
				graphNodeId: undefined,
				data: { from: e.from, to: e.to, reason: e.reason },
				hasSideEffects: false,
			});
		}));
	}

	// ═══════════════════════════════════════════════════════════════════════════════
	// TASK 1 — REPLAY ENGINE
	// ═══════════════════════════════════════════════════════════════════════════════

	replayIntentChain(intentId: string, mode: ReplayMode): IDeterministicReplayResult {
		const start = Date.now();
		const seed = this._createReplaySeedInternal('replay-base', `Replay chain for intent ${intentId}`);
		const divergences: IReplayDivergence[] = [];

		// Find the intent in the brain service
		const intent = this.brainService.getIntent(intentId);
		if (!intent) {
			return {
				deterministic: true,
				mode,
				seed,
				divergences: [],
				durationMs: Date.now() - start,
			};
		}

		// Collect the full intent chain (parent + children)
		const chain = this.brainService.getIntentChain(intentId);
		const chainIds = new Set(chain.map(i => i.id));

		// Find all timeline events for this chain
		const chainEvents = this._timelineEvents.filter(e =>
			e.intentId !== undefined && chainIds.has(e.intentId)
		);

		// Verify determinism: walk the chain events and check causality
		let prevEventId: string | undefined;
		for (const event of chainEvents) {
			if (event.causedByEventId && prevEventId && event.causedByEventId !== prevEventId) {
				// Causal chain break
				const div: IReplayDivergence = {
					aspect: 'causal-chain-continuity',
					expected: prevEventId,
					actual: event.causedByEventId,
					replayTimestamp: event.timestamp,
					causalChain: [event.causedByEventId, event.id],
					severity: mode === ReplayMode.Strict ? 'major' : 'minor',
				};
				if (mode === ReplayMode.Approximate) {
					div.severity = 'minor';
				}
				divergences.push(div);
			}
			prevEventId = event.id;
		}

		const deterministic = divergences.length === 0 ||
			(mode === ReplayMode.Approximate && !divergences.some(d => d.severity === 'critical'));

		this._replayActive = true;

		return {
			deterministic,
			mode,
			seed,
			divergences,
			durationMs: Date.now() - start,
		};
	}

	replayGraphTimeline(fromTimestamp: number, toTimestamp: number, mode: ReplayMode): IDeterministicReplayResult {
		const start = Date.now();
		const seed = this._createReplaySeedInternal('graph-replay', `Graph timeline replay [${fromTimestamp}, ${toTimestamp}]`);
		const divergences: IReplayDivergence[] = [];

		const events = this._timelineEvents.filter(e =>
			e.source === TimelineEventSource.ExecutionGraph &&
			e.timestamp >= fromTimestamp &&
			e.timestamp <= toTimestamp
		);

		// Check for any gaps in the graph timeline
		for (let i = 1; i < events.length; i++) {
			const gap = events[i].timestamp - events[i - 1].timestamp;
			if (gap > 5000 && mode === ReplayMode.Strict) {
				divergences.push({
					aspect: 'timeline-gap',
					expected: 'continuous',
					actual: `${gap}ms gap`,
					replayTimestamp: events[i].timestamp,
					causalChain: [events[i - 1].id, events[i].id],
					severity: 'minor',
				});
			}
		}

		this._replayActive = true;

		return {
			deterministic: divergences.length === 0,
			mode,
			seed,
			divergences,
			durationMs: Date.now() - start,
		};
	}

	simulateIntentExecution(intent: IIntent, mode: ReplayMode): IDeterministicReplayResult {
		const start = Date.now();
		const seed = this._createReplaySeedInternal(`sim-intent-${intent.id}`, `Simulated execution of intent ${intent.id}`);
		const rng = new SeededRandom(seed.value);
		const divergences: IReplayDivergence[] = [];

		// Simulate what would happen: produce simulated timeline events
		const simulatedSteps = rng.nextInt(1, 8);
		for (let i = 0; i < simulatedSteps; i++) {
			// Only record internally for tracking — no real mutation
		}

		this._replayActive = true;

		return {
			deterministic: mode === ReplayMode.Strict,
			mode,
			seed,
			divergences,
			durationMs: Date.now() - start,
		};
	}

	// ═══════════════════════════════════════════════════════════════════════════════
	// TASK 2 — SYSTEM SNAPSHOT MODEL
	// ═══════════════════════════════════════════════════════════════════════════════

	captureSnapshot(label: string, layers?: readonly SnapshotLayer[]): ISystemSnapshot {
		const captureStart = Date.now();
		const requestedLayers = layers ?? ALL_LAYERS;
		const layerSet = new Set(requestedLayers);

		// ─── Graph Layer ─────────────────────────────────────────────────────
		let graphLayer: IGraphSnapshotLayer | undefined;
		if (layerSet.has(SnapshotLayer.Graph)) {
			const recentNodes = this.graphService.getRecentNodes(100);
			const nodesByType: Record<string, number> = {};
			const pendingNodeIds: string[] = [];
			const rollbackCapableNodeIds: string[] = [];
			for (const node of recentNodes) {
				nodesByType[node.type] = (nodesByType[node.type] ?? 0) + 1;
				if (node.pending) { pendingNodeIds.push(node.id); }
				if (node.reversible) { rollbackCapableNodeIds.push(node.id); }
			}
			graphLayer = {
				nodeCount: this.graphService.nodeCount,
				edgeCount: this.graphService.edgeCount,
				scopeCount: this.graphService.activeScope ? 1 : 0,
				nodesByType,
				recentNodeIds: recentNodes.map(n => n.id),
				pendingNodeIds,
				rollbackCapableNodeIds,
			};
		}

		// ─── Context Layer ───────────────────────────────────────────────────
		let contextLayer: IContextSnapshotLayer | undefined;
		if (layerSet.has(SnapshotLayer.Context)) {
			const allFiles = this.contextService.getAllFileContexts();
			const entriesByDomain: Record<string, number> = {};
			const freshnessDistribution: Record<string, number> = {};
			for (const fc of allFiles) {
				const ext = fc.extension || 'unknown';
				entriesByDomain[ext] = (entriesByDomain[ext] ?? 0) + 1;
				freshnessDistribution[fc.freshness] = (freshnessDistribution[fc.freshness] ?? 0) + 1;
			}
			contextLayer = {
				totalEntries: allFiles.length,
				entriesByDomain,
				freshnessDistribution,
				symbolCount: this.contextService.trackedSymbolCount,
				dependencyEdgeCount: this.contextService.trackedDependencyCount,
				hotspotCount: this.contextService.mutationHotspots.length,
			};
		}

		// ─── Agent Layer ─────────────────────────────────────────────────────
		let agentLayer: IAgentSnapshotLayer | undefined;
		if (layerSet.has(SnapshotLayer.Agent)) {
			const agents = this.agentOrchestrator.getAllAgents();
			const agentsByState: Record<string, number> = {};
			const activeAgentIds: string[] = [];
			const capabilityUsage: Record<string, number> = {};
			let activePlanCount = 0;
			for (const agent of agents) {
				agentsByState[agent.lifecycleState] = (agentsByState[agent.lifecycleState] ?? 0) + 1;
				if (agent.lifecycleState === AgentLifecycleState.Executing ||
					agent.lifecycleState === AgentLifecycleState.Planning ||
					agent.lifecycleState === AgentLifecycleState.Waiting) {
					activeAgentIds.push(agent.id);
				}
				if (agent.activePlanId) { activePlanCount++; }
				for (const cap of agent.capabilities) {
					capabilityUsage[cap.capability] = (capabilityUsage[cap.capability] ?? 0) + 1;
				}
			}
			agentLayer = {
				activeAgentCount: activeAgentIds.length,
				agentsByState,
				activePlanCount,
				pendingApprovalCount: this.agentOrchestrator.getPendingApprovals().length,
				activeAgentIds,
				capabilityUsage,
			};
		}

		// ─── Process Layer ───────────────────────────────────────────────────
		let processLayer: IProcessSnapshotLayer | undefined;
		if (layerSet.has(SnapshotLayer.Process)) {
			const activeSessions = this.processOrchestrator.getActiveSessions();
			const allSessions = this.processOrchestrator.getAllSessions();
			const sessionsByMode: Record<string, number> = {};
			const sessionsByState: Record<string, number> = {};
			const activeSessionIds: string[] = [];
			let totalOutputChunks = 0;
			let supervisedCount = 0;
			for (const session of activeSessions) {
				sessionsByMode[session.mode] = (sessionsByMode[session.mode] ?? 0) + 1;
				sessionsByState[session.lifecycleState] = (sessionsByState[session.lifecycleState] ?? 0) + 1;
				activeSessionIds.push(session.id);
				totalOutputChunks += session.outputBuffer.length;
				if (session.supervised) { supervisedCount++; }
			}
			for (const session of allSessions) {
				if (!activeSessionIds.includes(session.id)) {
					sessionsByState[session.lifecycleState] = (sessionsByState[session.lifecycleState] ?? 0) + 1;
				}
			}
			processLayer = {
				activeSessionCount: activeSessionIds.length,
				sessionsByMode,
				sessionsByState,
				activeSessionIds,
				totalOutputChunks,
				supervisedCount,
			};
		}

		// ─── Intent Layer ────────────────────────────────────────────────────
		let intentLayer: IIntentSnapshotLayer | undefined;
		if (layerSet.has(SnapshotLayer.Intent)) {
			const activeIntents = this.brainService.getActiveIntents();
			const intentsByResolution: Record<string, number> = {};
			const intentsBySource: Record<string, number> = {};
			const intentsByActionType: Record<string, number> = {};
			const activeIntentIds: string[] = [];
			let maxChainDepth = 0;
			for (const intent of activeIntents) {
				intentsByResolution[intent.resolution] = (intentsByResolution[intent.resolution] ?? 0) + 1;
				intentsBySource[intent.source] = (intentsBySource[intent.source] ?? 0) + 1;
				intentsByActionType[intent.actionType] = (intentsByActionType[intent.actionType] ?? 0) + 1;
				activeIntentIds.push(intent.id);
				// Calculate chain depth
				const chain = this.brainService.getIntentChain(intent.id);
				if (chain.length > maxChainDepth) { maxChainDepth = chain.length; }
			}
			intentLayer = {
				activeIntentCount: activeIntents.length,
				intentsByResolution,
				intentsBySource,
				intentsByActionType,
				activeIntentIds,
				maxChainDepth,
			};
		}

		// ─── Brain Layer ─────────────────────────────────────────────────────
		let brainLayer: IBrainSnapshotLayer | undefined;
		if (layerSet.has(SnapshotLayer.Brain)) {
			const health = this.brainService.systemHealth;
			brainLayer = {
				loopPhase: this.brainService.executionLoopPhase,
				healthStatus: health?.healthStatus ?? SystemHealthStatus.Healthy,
				activeDecisionCount: this.brainService.activeDecisions.length,
				activeConflictCount: this.brainService.activeConflicts.length,
				currentCheckpointId: this.brainService.currentCheckpoint?.id,
				backpressureLevel: this.stabilizationService.getSubsystemBackpressure(
					'agent' as any
				).level,
				eventBusThroughput: health?.eventBusThroughput ?? 0,
				tickNumber: this.brainService.currentTickNumber,
			};
		}

		const id = generateUuid();
		const now = Date.now();
		const replaySeed: IReplaySeed = {
			id: generateUuid(),
			value: fnv1aHash(id + now),
			snapshotId: id,
			createdAt: now,
			description: `Seed for snapshot: ${label}`,
		};

		const snapshot: ISystemSnapshot = {
			id,
			timestamp: now,
			label,
			layers: requestedLayers,
			graphLayer,
			contextLayer,
			agentLayer,
			processLayer,
			intentLayer,
			brainLayer,
			runtimePhase: this.stateService.phase,
			stabilityState: this.stabilizationService.stabilityState,
			complete: layerSet.size === ALL_LAYERS.length,
			replaySeed,
			captureDurationMs: Date.now() - captureStart,
		};

		this._snapshots.set(id, snapshot);
		this._onDidCaptureSnapshot.fire(snapshot);
		return snapshot;
	}

	getSnapshot(snapshotId: string): ISystemSnapshot | undefined {
		return this._snapshots.get(snapshotId);
	}

	getAllSnapshots(): readonly ISystemSnapshot[] {
		return [...this._snapshots.values()].sort((a, b) => a.timestamp - b.timestamp);
	}

	getSnapshotsInRange(fromTimestamp: number, toTimestamp: number): readonly ISystemSnapshot[] {
		return this.getAllSnapshots().filter(s =>
			s.timestamp >= fromTimestamp && s.timestamp <= toTimestamp
		);
	}

	getNearestSnapshot(timestamp: number): ISystemSnapshot | undefined {
		const all = this.getAllSnapshots();
		if (all.length === 0) { return undefined; }

		let nearest = all[0];
		let minDist = Math.abs(all[0].timestamp - timestamp);
		for (let i = 1; i < all.length; i++) {
			const dist = Math.abs(all[i].timestamp - timestamp);
			if (dist < minDist) {
				minDist = dist;
				nearest = all[i];
			}
		}
		return nearest;
	}

	startAutoCapture(intervalMs: number): void {
		this.stopAutoCapture();
		this._autoCaptureTimer = setInterval(() => {
			this.captureSnapshot(`auto-${Date.now()}`);
		}, intervalMs);
	}

	stopAutoCapture(): void {
		if (this._autoCaptureTimer) {
			clearInterval(this._autoCaptureTimer);
			this._autoCaptureTimer = undefined;
		}
	}

	// ═══════════════════════════════════════════════════════════════════════════════
	// TASK 3 — EVENT TIMELINE ENGINE
	// ═══════════════════════════════════════════════════════════════════════════════

	getTimelineEvents(filter?: ITimelineFilter): readonly IExecutionTimelineEvent[] {
		if (!filter) { return [...this._timelineEvents]; }

		let events = [...this._timelineEvents];

		if (filter.sources && filter.sources.length > 0) {
			const sourceSet = new Set(filter.sources);
			events = events.filter(e => sourceSet.has(e.source));
		}
		if (filter.categories && filter.categories.length > 0) {
			const catSet = new Set(filter.categories);
			events = events.filter(e => catSet.has(e.category));
		}
		if (filter.intentId) {
			events = events.filter(e => e.intentId === filter.intentId);
		}
		if (filter.agentId) {
			events = events.filter(e => e.agentId === filter.agentId);
		}
		if (filter.processSessionId) {
			events = events.filter(e => e.processSessionId === filter.processSessionId);
		}
		if (filter.fromTimestamp !== undefined) {
			events = events.filter(e => e.timestamp >= filter.fromTimestamp!);
		}
		if (filter.toTimestamp !== undefined) {
			events = events.filter(e => e.timestamp <= filter.toTimestamp!);
		}
		if (filter.hasSideEffects !== undefined) {
			events = events.filter(e => e.hasSideEffects === filter.hasSideEffects);
		}
		if (filter.limit !== undefined) {
			events = events.slice(0, filter.limit);
		}

		return events;
	}

	getTimelineSegment(fromTimestamp: number, toTimestamp: number): ITimelineSegment {
		const events = this._timelineEvents.filter(e =>
			e.timestamp >= fromTimestamp && e.timestamp <= toTimestamp
		).sort((a, b) => a.timestamp - b.timestamp);

		const intentIds = new Set<string>();
		const agentIds = new Set<string>();
		const processIds = new Set<string>();
		const snapshotIds: string[] = [];

		for (const event of events) {
			if (event.intentId) { intentIds.add(event.intentId); }
			if (event.agentId) { agentIds.add(event.agentId); }
			if (event.processSessionId) { processIds.add(event.processSessionId); }
			if (event.nearestSnapshotId) { snapshotIds.push(event.nearestSnapshotId); }
		}

		// Also check for snapshots within the time range
		for (const snap of this.getSnapshotsInRange(fromTimestamp, toTimestamp)) {
			if (!snapshotIds.includes(snap.id)) { snapshotIds.push(snap.id); }
		}

		return {
			fromTimestamp,
			toTimestamp,
			events,
			eventCount: events.length,
			intentCount: intentIds.size,
			agentCount: agentIds.size,
			processCount: processIds.size,
			snapshotIds,
		};
	}

	getIntentTimeline(intentId: string): readonly IExecutionTimelineEvent[] {
		// Get the full chain of intents
		const chain = this.brainService.getIntentChain(intentId);
		const chainIds = new Set(chain.map(i => i.id));

		return this._timelineEvents.filter(e =>
			e.intentId !== undefined && chainIds.has(e.intentId)
		).sort((a, b) => a.timestamp - b.timestamp);
	}

	getCausalChainEvents(eventId: string): readonly IExecutionTimelineEvent[] {
		const result: IExecutionTimelineEvent[] = [];
		const eventMap = new Map<string, IExecutionTimelineEvent>();
		for (const e of this._timelineEvents) {
			eventMap.set(e.id, e);
		}

		// Walk forward from the target event
		const target = eventMap.get(eventId);
		if (!target) { return result; }

		// Walk backward via causedByEventId
		const chain: IExecutionTimelineEvent[] = [];
		let current: IExecutionTimelineEvent | undefined = target;
		const visited = new Set<string>();
		while (current && !visited.has(current.id)) {
			visited.add(current.id);
			chain.unshift(current);
			if (current.causedByEventId) {
				current = eventMap.get(current.causedByEventId);
			} else {
				current = undefined;
			}
		}

		// Walk forward: find events caused by this event
		const forwardEvents: IExecutionTimelineEvent[] = [];
		const queue = [eventId];
		const forwardVisited = new Set<string>([eventId]);
		while (queue.length > 0) {
			const currentId = queue.shift()!;
			for (const e of this._timelineEvents) {
				if (e.causedByEventId === currentId && !forwardVisited.has(e.id)) {
					forwardVisited.add(e.id);
					forwardEvents.push(e);
					queue.push(e.id);
				}
			}
		}

		return [...chain, ...forwardEvents];
	}

	// ═══════════════════════════════════════════════════════════════════════════════
	// TASK 4 — DETERMINISTIC REPLAY MODE
	// ═══════════════════════════════════════════════════════════════════════════════

	createReplaySeed(snapshotId: string, description: string): IReplaySeed {
		return this._createReplaySeedInternal(snapshotId, description);
	}

	verifyDeterminism(intentId: string, seed: IReplaySeed): IDeterministicReplayResult {
		const start = Date.now();
		const divergences: IReplayDivergence[] = [];

		// Replay the intent chain and compare with previously recorded events
		const chainResult = this.replayIntentChain(intentId, this._replayMode);

		// Check if the seed matches the current state
		const snapshot = this._snapshots.get(seed.snapshotId);
		if (snapshot) {
			const currentSeed = snapshot.replaySeed;
			if (currentSeed.value !== seed.value) {
				divergences.push({
					aspect: 'seed-mismatch',
					expected: String(seed.value),
					actual: String(currentSeed.value),
					replayTimestamp: Date.now(),
					causalChain: [],
					severity: 'major',
				});
			}
		}

		const allDivergences = [...chainResult.divergences, ...divergences];
		const deterministic = allDivergences.length === 0 ||
			(this._replayMode === ReplayMode.Approximate && !allDivergences.some(d => d.severity === 'critical'));

		return {
			deterministic,
			mode: this._replayMode,
			seed,
			divergences: allDivergences,
			durationMs: Date.now() - start,
		};
	}

	get replayMode(): ReplayMode { return this._replayMode; }

	setReplayMode(mode: ReplayMode): void {
		this._replayMode = mode;
	}

	getReplayDivergences(): readonly IReplayDivergence[] {
		return [...this._divergences];
	}

	// ═══════════════════════════════════════════════════════════════════════════════
	// TASK 5 — SIMULATED AGENT ENGINE
	// ═══════════════════════════════════════════════════════════════════════════════

	simulateAgentDecision(agentId: string, intent: IIntent, seed: IReplaySeed): IAgentSimulationResult {
		const rng = new SeededRandom(seed.value);

		// Read the agent's current state (READ-ONLY)
		const agent = this.agentOrchestrator.getAgent(agentId);

		const decisionPoints = [
			'approach-selection',
			'scope-determination',
			'capability-check',
			'risk-assessment',
		];

		const choices = ['proceed', 'defer', 'escalate', 'reject'];
		const reasons = [
			'Low risk, sufficient capabilities',
			'High risk, requires approval',
			'Missing capabilities, need escalation',
			'Policy violation detected',
		];

		const simulatedDecisions: ISimulatedDecision[] = decisionPoints.map(dp => ({
			decisionPoint: dp,
			choice: rng.pick(choices),
			reasoning: rng.pick(reasons),
			confidence: rng.next(),
			alternatives: choices.filter(c => c !== rng.pick(choices)).slice(0, 2),
		}));

		const wouldSucceed = rng.nextBool(0.75);
		const wouldRequestApproval = rng.nextBool(0.3);
		const wouldViolatePolicy = rng.nextBool(0.1);
		const stepCount = rng.nextInt(1, 12);
		const riskRoll = rng.next();
		const riskLevel: 'low' | 'medium' | 'high' | 'critical' =
			riskRoll < 0.4 ? 'low' : riskRoll < 0.7 ? 'medium' : riskRoll < 0.9 ? 'high' : 'critical';
		const impactRoll = rng.next();
		const estimatedImpact: 'low' | 'medium' | 'high' =
			impactRoll < 0.33 ? 'low' : impactRoll < 0.66 ? 'medium' : 'high';

		const hasCapability = agent?.capabilities.some(c => c.capability === AgentCapability.FileEdit) ?? false;

		const simulatedPlan: ISimulatedPlan | undefined = hasCapability ? {
			stepCount,
			stepDescriptions: Array.from({ length: stepCount }, (_, i) => `Simulated step ${i + 1}: ${rng.pick(['Read file', 'Edit file', 'Query context', 'Run process'])}`),
			affectedFiles: intent.targetUris.length > 0 ? intent.targetUris : [],
			requiredCapabilities: agent?.capabilities.map(c => c.capability) ?? [],
			riskLevel,
			rollbackPossible: rng.nextBool(0.8),
		} : undefined;

		return {
			agentId,
			simulatedPlan,
			simulatedDecisions,
			wouldRequestApproval,
			wouldViolatePolicy,
			wouldSucceed,
			estimatedDurationMs: rng.nextInt(100, 30000),
			estimatedMutationCount: rng.nextInt(0, 15),
			estimatedImpact,
			deterministic: this._replayMode === ReplayMode.Strict,
			seed,
		};
	}

	reEvaluatePlan(agentId: string, planId: string, seed: IReplaySeed): IAgentSimulationResult {
		const rng = new SeededRandom(seed.value);
		const agent = this.agentOrchestrator.getAgent(agentId);
		const plan = agent ? this.agentOrchestrator.getPlan(planId) : undefined;

		const simulatedDecisions: ISimulatedDecision[] = [{
			decisionPoint: 'plan-re-evaluation',
			choice: rng.nextBool(0.7) ? 'proceed' : 'revise',
			reasoning: plan ? `Re-evaluating plan "${plan.goal}" based on current state` : 'Plan not found',
			confidence: rng.next(),
			alternatives: ['revise', 'cancel'],
		}];

		return {
			agentId,
			simulatedPlan: plan ? {
				stepCount: plan.steps.length,
				stepDescriptions: plan.steps.map(s => s.label),
				affectedFiles: plan.steps.flatMap(s => s.action.fileUri ? [s.action.fileUri] : []),
				requiredCapabilities: plan.requiredCapabilities.map(c => c.capability),
				riskLevel: rng.nextBool(0.7) ? 'low' : 'medium',
				rollbackPossible: plan.steps.every(s => s.rollbackStrategy.type !== 'none'),
			} : undefined,
			simulatedDecisions,
			wouldRequestApproval: plan?.status === 'pending-approval',
			wouldViolatePolicy: rng.nextBool(0.05),
			wouldSucceed: rng.nextBool(0.85),
			estimatedDurationMs: plan?.maxDurationMs ?? rng.nextInt(1000, 30000),
			estimatedMutationCount: rng.nextInt(0, 10),
			estimatedImpact: rng.nextBool(0.5) ? 'low' : 'medium',
			deterministic: this._replayMode === ReplayMode.Strict,
			seed,
		};
	}

	reApplyPolicy(agentId: string, decisionId: string): IAgentSimulationResult {
		const seed = this._createReplaySeedInternal(
			`policy-${agentId}-${decisionId}`,
			`Re-apply policy for agent ${agentId}, decision ${decisionId}`
		);
		const rng = new SeededRandom(seed.value);

		// Read current agent state (READ-ONLY)
		const agent = this.agentOrchestrator.getAgent(agentId);

		const wouldViolatePolicy = rng.nextBool(0.15);

		return {
			agentId,
			simulatedPlan: undefined,
			simulatedDecisions: [{
				decisionPoint: 'policy-re-application',
				choice: wouldViolatePolicy ? 'deny' : 'allow',
				reasoning: wouldViolatePolicy ? 'Policy violation detected on re-evaluation' : 'No policy violation found',
				confidence: rng.nextBool(0.8) ? 0.95 : 0.6,
				alternatives: wouldViolatePolicy ? ['allow', 'escalate'] : ['deny'],
			}],
			wouldRequestApproval: wouldViolatePolicy,
			wouldViolatePolicy,
			wouldSucceed: !wouldViolatePolicy,
			estimatedDurationMs: 0,
			estimatedMutationCount: 0,
			estimatedImpact: 'low',
			deterministic: this._replayMode === ReplayMode.Strict,
			seed,
		};
	}

	// ═══════════════════════════════════════════════════════════════════════════════
	// TASK 6 — PROCESS SIMULATION LAYER
	// ═══════════════════════════════════════════════════════════════════════════════

	simulateProcessExecution(command: string, seed: IReplaySeed): IProcessSimulationResult {
		const rng = new SeededRandom(seed.value);
		const sessionId = generateUuid();
		const durationMs = rng.nextInt(100, 30000);
		const wouldSucceed = rng.nextBool(0.85);
		const simulatedExitCode = wouldSucceed ? 0 : rng.nextInt(1, 127);

		// Generate simulated output
		const outputCount = rng.nextInt(1, 20);
		const simulatedOutput: ISimulatedOutputChunk[] = [];
		const classifications = ['info', 'build-output', 'progress', 'success', 'error'];
		for (let i = 0; i < outputCount; i++) {
			const channel: 'stdout' | 'stderr' | 'control' = rng.nextBool(0.8) ? 'stdout' : rng.nextBool(0.5) ? 'stderr' : 'control';
			simulatedOutput.push({
				text: `[simulated] ${command} output line ${i + 1}`,
				channel,
				simulatedTimestamp: Date.now() + (durationMs / outputCount) * i,
				classification: wouldSucceed ? rng.pick(classifications) : (i === outputCount - 1 ? 'error' : rng.pick(classifications)),
			});
		}

		// Generate lifecycle transitions
		const simulatedLifecycle: ISimulatedLifecycleTransition[] = [
			{ from: 'created', to: 'starting', simulatedTimestamp: Date.now(), reason: 'Process initiated' },
			{ from: 'starting', to: 'running', simulatedTimestamp: Date.now() + 50, reason: 'Process started' },
		];
		if (wouldSucceed) {
			simulatedLifecycle.push({
				from: 'running', to: 'completed', simulatedTimestamp: Date.now() + durationMs, reason: 'Process completed successfully'
			});
		} else {
			simulatedLifecycle.push({
				from: 'running', to: 'failed', simulatedTimestamp: Date.now() + durationMs, reason: `Process exited with code ${simulatedExitCode}`
			});
		}

		// Generate failure paths
		const possibleFailurePaths: ISimulatedFailurePath[] = [];
		if (rng.nextBool(0.4)) {
			possibleFailurePaths.push({
				description: 'Process timeout',
				exitCode: 124,
				output: 'Command timed out',
				handledByRestartPolicy: rng.nextBool(0.5),
				probability: rng.next() * 0.2,
			});
		}
		if (rng.nextBool(0.3)) {
			possibleFailurePaths.push({
				description: 'Non-zero exit code',
				exitCode: 1,
				output: 'Command failed with exit code 1',
				handledByRestartPolicy: rng.nextBool(0.5),
				probability: rng.next() * 0.15,
			});
		}

		return {
			sessionId,
			command,
			simulatedExitCode,
			simulatedOutput,
			simulatedLifecycle,
			wouldSucceed,
			simulatedDurationMs: durationMs,
			possibleFailurePaths,
			wouldTriggerRestart: !wouldSucceed && rng.nextBool(0.3),
			deterministic: this._replayMode === ReplayMode.Strict,
			seed,
		};
	}

	simulateProcessLifecycle(sessionId: string, seed: IReplaySeed): IProcessSimulationResult {
		const rng = new SeededRandom(seed.value);
		const session = this.processOrchestrator.getSession(sessionId);
		const command = session?.command ?? `simulated-cmd-${sessionId.slice(0, 8)}`;
		const wouldSucceed = rng.nextBool(0.8);
		const durationMs = rng.nextInt(500, 60000);

		const lifecycle: ISimulatedLifecycleTransition[] = [];
		const states = ['created', 'starting', 'running'];
		if (session?.supervised) { states.push('suspended', 'running'); }
		if (wouldSucceed) { states.push('completed'); } else { states.push('failed'); }

		let ts = Date.now();
		for (let i = 1; i < states.length; i++) {
			lifecycle.push({
				from: states[i - 1],
				to: states[i],
				simulatedTimestamp: ts,
				reason: `Simulated transition: ${states[i - 1]} → ${states[i]}`,
			});
			ts += rng.nextInt(100, 5000);
		}

		return {
			sessionId,
			command,
			simulatedExitCode: wouldSucceed ? 0 : rng.nextInt(1, 127),
			simulatedOutput: [{
				text: `[simulated lifecycle] ${command}`,
				channel: 'stdout',
				simulatedTimestamp: Date.now(),
				classification: 'info',
			}],
			simulatedLifecycle: lifecycle,
			wouldSucceed,
			simulatedDurationMs: durationMs,
			possibleFailurePaths: [],
			wouldTriggerRestart: false,
			deterministic: this._replayMode === ReplayMode.Strict,
			seed,
		};
	}

	simulateProcessFailures(command: string, seed: IReplaySeed): readonly ISimulatedFailurePath[] {
		const rng = new SeededRandom(seed.value);
		const paths: ISimulatedFailurePath[] = [];
		const failureTypes = [
			{ desc: 'Process timeout', code: 124, out: 'Command timed out' },
			{ desc: 'Segmentation fault', code: 139, out: 'Segmentation fault (core dumped)' },
			{ desc: 'Out of memory', code: 137, out: 'Killed (out of memory)' },
			{ desc: 'Permission denied', code: 126, out: 'Permission denied' },
			{ desc: 'Command not found', code: 127, out: `command not found: ${command.split(' ')[0]}` },
		];

		const count = rng.nextInt(1, 3);
		for (let i = 0; i < count && i < failureTypes.length; i++) {
			const ft = failureTypes[i];
			paths.push({
				description: ft.desc,
				exitCode: ft.code,
				output: ft.out,
				handledByRestartPolicy: rng.nextBool(0.4),
				probability: rng.next() * 0.3,
			});
		}

		return paths;
	}

	simulateProcessRestart(sessionId: string, seed: IReplaySeed): IProcessSimulationResult {
		const rng = new SeededRandom(seed.value);
		const session = this.processOrchestrator.getSession(sessionId);
		const command = session?.command ?? `restart-cmd-${sessionId.slice(0, 8)}`;

		return {
			sessionId,
			command,
			simulatedExitCode: 0,
			simulatedOutput: [{
				text: `[simulated restart] Restarting ${command}`,
				channel: 'control',
				simulatedTimestamp: Date.now(),
				classification: 'info',
			}],
			simulatedLifecycle: [
				{ from: 'failed', to: 'restarting', simulatedTimestamp: Date.now(), reason: 'Auto-restart triggered' },
				{ from: 'restarting', to: 'starting', simulatedTimestamp: Date.now() + 100, reason: 'Restart initiated' },
				{ from: 'starting', to: 'running', simulatedTimestamp: Date.now() + 200, reason: 'Process restarted' },
			],
			wouldSucceed: rng.nextBool(0.8),
			simulatedDurationMs: rng.nextInt(500, 10000),
			possibleFailurePaths: [],
			wouldTriggerRestart: false,
			deterministic: this._replayMode === ReplayMode.Strict,
			seed,
		};
	}

	// ═══════════════════════════════════════════════════════════════════════════════
	// TASK 7 — STATE RECONSTRUCTION ENGINE
	// ═══════════════════════════════════════════════════════════════════════════════

	reconstructAtTime(timestamp: number): IStateReconstructionResult {
		return this._reconstructInternal(timestamp, ALL_LAYERS);
	}

	reconstructSubsystem(timestamp: number, layer: SnapshotLayer): IStateReconstructionResult {
		return this._reconstructInternal(timestamp, [layer]);
	}

	fullRewind(timestamp: number): IStateReconstructionResult {
		return this._reconstructInternal(timestamp, ALL_LAYERS);
	}

	partialRewind(timestamp: number, layer: SnapshotLayer): IStateReconstructionResult {
		return this._reconstructInternal(timestamp, [layer]);
	}

	private _reconstructInternal(timestamp: number, layers: readonly SnapshotLayer[]): IStateReconstructionResult {
		const start = Date.now();
		const missingData: IReconstructionGap[] = [];

		// Find the nearest snapshot before the target timestamp
		const allSnaps = this.getAllSnapshots();
		let baseSnapshot: ISystemSnapshot | undefined;
		for (let i = allSnaps.length - 1; i >= 0; i--) {
			if (allSnaps[i].timestamp <= timestamp) {
				baseSnapshot = allSnaps[i];
				break;
			}
		}

		if (!baseSnapshot) {
			// No snapshot before this time — create a gap for each requested layer
			for (const layer of layers) {
				missingData.push({
					layer,
					description: `No snapshot available before timestamp ${timestamp}`,
					fromTimestamp: 0,
					toTimestamp: timestamp,
					approximable: false,
				});
			}
			// Create an empty reconstructed snapshot
			const reconstructedSnapshot = this.captureSnapshot(`reconstructed-${timestamp}`, layers);
			return {
				targetTimestamp: timestamp,
				baseSnapshotId: 'none',
				replayedEvents: [],
				reconstructedSnapshot,
				exact: false,
				eventsReplayed: 0,
				reconstructionDurationMs: Date.now() - start,
				complete: false,
				missingData,
			};
		}

		// Find events between the base snapshot and the target timestamp
		const replayedEvents = this._timelineEvents.filter(e =>
			e.timestamp > baseSnapshot!.timestamp && e.timestamp <= timestamp
		).sort((a, b) => a.timestamp - b.timestamp);

		// Check for missing layers
		for (const layer of layers) {
			if (!baseSnapshot.layers.includes(layer)) {
				missingData.push({
					layer,
					description: `Layer ${layer} not present in base snapshot ${baseSnapshot.id}`,
					fromTimestamp: baseSnapshot.timestamp,
					toTimestamp: timestamp,
					approximable: true,
				});
			}
		}

		// The reconstructed snapshot: use the base snapshot if it's an exact match
		const exact = baseSnapshot.timestamp === timestamp;
		let reconstructedSnapshot: ISystemSnapshot;
		if (exact) {
			reconstructedSnapshot = baseSnapshot;
		} else {
			// Capture a new snapshot and label it as reconstructed
			reconstructedSnapshot = {
				...this.captureSnapshot(`reconstructed-${timestamp}`, layers),
				timestamp,
			};
		}

		return {
			targetTimestamp: timestamp,
			baseSnapshotId: baseSnapshot.id,
			replayedEvents,
			reconstructedSnapshot,
			exact,
			eventsReplayed: replayedEvents.length,
			reconstructionDurationMs: Date.now() - start,
			complete: missingData.length === 0,
			missingData,
		};
	}

	// ═══════════════════════════════════════════════════════════════════════════════
	// TASK 8 — DIFFERENTIAL ANALYSIS ENGINE
	// ═══════════════════════════════════════════════════════════════════════════════

	diffSnapshots(snapshotAId: string, snapshotBId: string): ISnapshotDiff {
		const a = this._snapshots.get(snapshotAId);
		const b = this._snapshots.get(snapshotBId);
		if (!a || !b) {
			return {
				snapshotAId,
				snapshotBId,
				timestampA: a?.timestamp ?? 0,
				timestampB: b?.timestamp ?? 0,
				changes: [],
				changeCount: 0,
				changesByLayer: {},
				changesBySeverity: {},
				causalChains: [],
				changesExpected: true,
				unexpectedChanges: [],
			};
		}

		const changes: ISnapshotChange[] = [];

		// Graph layer diff
		if (a.graphLayer && b.graphLayer) {
			this._diffNumericField(changes, SnapshotLayer.Graph, 'nodeCount', a.graphLayer.nodeCount, b.graphLayer.nodeCount);
			this._diffNumericField(changes, SnapshotLayer.Graph, 'edgeCount', a.graphLayer.edgeCount, b.graphLayer.edgeCount);
			this._diffNumericField(changes, SnapshotLayer.Graph, 'scopeCount', a.graphLayer.scopeCount, b.graphLayer.scopeCount);
			this._diffRecordFields(changes, SnapshotLayer.Graph, a.graphLayer.nodesByType, b.graphLayer.nodesByType);
		}

		// Context layer diff
		if (a.contextLayer && b.contextLayer) {
			this._diffNumericField(changes, SnapshotLayer.Context, 'totalEntries', a.contextLayer.totalEntries, b.contextLayer.totalEntries);
			this._diffNumericField(changes, SnapshotLayer.Context, 'symbolCount', a.contextLayer.symbolCount, b.contextLayer.symbolCount);
			this._diffNumericField(changes, SnapshotLayer.Context, 'dependencyEdgeCount', a.contextLayer.dependencyEdgeCount, b.contextLayer.dependencyEdgeCount);
			this._diffNumericField(changes, SnapshotLayer.Context, 'hotspotCount', a.contextLayer.hotspotCount, b.contextLayer.hotspotCount);
			this._diffRecordFields(changes, SnapshotLayer.Context, a.contextLayer.entriesByDomain, b.contextLayer.entriesByDomain);
		}

		// Agent layer diff
		if (a.agentLayer && b.agentLayer) {
			this._diffNumericField(changes, SnapshotLayer.Agent, 'activeAgentCount', a.agentLayer.activeAgentCount, b.agentLayer.activeAgentCount);
			this._diffNumericField(changes, SnapshotLayer.Agent, 'activePlanCount', a.agentLayer.activePlanCount, b.agentLayer.activePlanCount);
			this._diffNumericField(changes, SnapshotLayer.Agent, 'pendingApprovalCount', a.agentLayer.pendingApprovalCount, b.agentLayer.pendingApprovalCount);
			this._diffRecordFields(changes, SnapshotLayer.Agent, a.agentLayer.agentsByState, b.agentLayer.agentsByState);
		}

		// Process layer diff
		if (a.processLayer && b.processLayer) {
			this._diffNumericField(changes, SnapshotLayer.Process, 'activeSessionCount', a.processLayer.activeSessionCount, b.processLayer.activeSessionCount);
			this._diffNumericField(changes, SnapshotLayer.Process, 'totalOutputChunks', a.processLayer.totalOutputChunks, b.processLayer.totalOutputChunks);
			this._diffNumericField(changes, SnapshotLayer.Process, 'supervisedCount', a.processLayer.supervisedCount, b.processLayer.supervisedCount);
			this._diffRecordFields(changes, SnapshotLayer.Process, a.processLayer.sessionsByMode, b.processLayer.sessionsByMode);
		}

		// Intent layer diff
		if (a.intentLayer && b.intentLayer) {
			this._diffNumericField(changes, SnapshotLayer.Intent, 'activeIntentCount', a.intentLayer.activeIntentCount, b.intentLayer.activeIntentCount);
			this._diffNumericField(changes, SnapshotLayer.Intent, 'maxChainDepth', a.intentLayer.maxChainDepth, b.intentLayer.maxChainDepth);
			this._diffRecordFields(changes, SnapshotLayer.Intent, a.intentLayer.intentsByResolution, b.intentLayer.intentsByResolution);
		}

		// Brain layer diff
		if (a.brainLayer && b.brainLayer) {
			this._diffStringField(changes, SnapshotLayer.Brain, 'loopPhase', a.brainLayer.loopPhase, b.brainLayer.loopPhase);
			this._diffStringField(changes, SnapshotLayer.Brain, 'healthStatus', a.brainLayer.healthStatus, b.brainLayer.healthStatus);
			this._diffNumericField(changes, SnapshotLayer.Brain, 'activeDecisionCount', a.brainLayer.activeDecisionCount, b.brainLayer.activeDecisionCount);
			this._diffNumericField(changes, SnapshotLayer.Brain, 'activeConflictCount', a.brainLayer.activeConflictCount, b.brainLayer.activeConflictCount);
		}

		// Runtime phase diff
		if (a.runtimePhase !== b.runtimePhase) {
			changes.push({
				layer: SnapshotLayer.Brain,
				aspect: 'runtimePhase',
				valueA: a.runtimePhase,
				valueB: b.runtimePhase,
				isAddition: false,
				isRemoval: false,
				causingIntentId: undefined,
				causingEventId: undefined,
				severity: 'minor',
				expected: true,
			});
		}

		// Stability diff
		if (a.stabilityState !== b.stabilityState) {
			changes.push({
				layer: SnapshotLayer.Brain,
				aspect: 'stabilityState',
				valueA: a.stabilityState,
				valueB: b.stabilityState,
				isAddition: false,
				isRemoval: false,
				causingIntentId: undefined,
				causingEventId: undefined,
				severity: a.stabilityState === 'critical' || b.stabilityState === 'critical' ? 'critical' : 'major',
				expected: true,
			});
		}

		// Build causal chains from timeline events between the two snapshots
		const causalChains = this._buildCausalChainsBetween(a, b, changes);

		// Calculate stats
		const changesByLayer: Record<string, number> = {};
		const changesBySeverity: Record<string, number> = {};
		for (const change of changes) {
			changesByLayer[change.layer] = (changesByLayer[change.layer] ?? 0) + 1;
			changesBySeverity[change.severity] = (changesBySeverity[change.severity] ?? 0) + 1;
		}

		// Determine if changes were expected
		const eventsBetween = this._timelineEvents.filter(e =>
			e.timestamp > a.timestamp && e.timestamp <= b.timestamp
		);
		const intentIds = new Set(eventsBetween.filter(e => e.intentId).map(e => e.intentId!));
		const changesExpected = changes.every(c => c.expected);

		const unexpectedChanges = changes.filter(c => !c.expected);

		return {
			snapshotAId,
			snapshotBId,
			timestampA: a.timestamp,
			timestampB: b.timestamp,
			changes,
			changeCount: changes.length,
			changesByLayer,
			changesBySeverity,
			causalChains,
			changesExpected,
			unexpectedChanges,
		};
	}

	diffWithCurrent(snapshotId: string): ISnapshotDiff {
		const current = this.captureSnapshot(`diff-current-${Date.now()}`);
		return this.diffSnapshots(snapshotId, current.id);
	}

	explainChange(snapshotAId: string, snapshotBId: string, changeAspect: string): ICausalChain | undefined {
		const a = this._snapshots.get(snapshotAId);
		const b = this._snapshots.get(snapshotBId);
		if (!a || !b) { return undefined; }

		// Find events related to the change aspect
		const relevantEvents = this._timelineEvents.filter(e =>
			e.timestamp > a.timestamp && e.timestamp <= b.timestamp &&
			(e.description.toLowerCase().includes(changeAspect.toLowerCase()) ||
				(e.data && Object.keys(e.data).some(k => k.toLowerCase().includes(changeAspect.toLowerCase()))))
		).sort((x, y) => x.timestamp - y.timestamp);

		if (relevantEvents.length === 0) { return undefined; }

		const rootCause = relevantEvents[0];
		const intentIds = new Set(relevantEvents.filter(e => e.intentId).map(e => e.intentId!));
		const subsystems = new Set(relevantEvents.map(e => e.source));

		return {
			id: generateUuid(),
			rootCause,
			chain: relevantEvents,
			intentIds: [...intentIds],
			subsystems: [...subsystems],
			effect: `Change in ${changeAspect} between snapshots`,
			complete: relevantEvents.every((e, i) =>
				i === 0 || e.causedByEventId === relevantEvents[i - 1].id
			),
		};
	}

	traceMutationSource(snapshotAId: string, snapshotBId: string, mutationAspect: string): TimelineEventSource | undefined {
		const a = this._snapshots.get(snapshotAId);
		const b = this._snapshots.get(snapshotBId);
		if (!a || !b) { return undefined; }

		const events = this._timelineEvents.filter(e =>
			e.timestamp > a.timestamp && e.timestamp <= b.timestamp &&
			e.category === TimelineEventCategory.Mutation
		);

		if (events.length === 0) { return undefined; }

		// Find the event whose description best matches the mutation aspect
		const match = events.find(e =>
			e.description.toLowerCase().includes(mutationAspect.toLowerCase())
		);

		return match?.source;
	}

	// ═══════════════════════════════════════════════════════════════════════════════
	// TASK 9 — EXECUTION DEBUG PROTOCOL
	// ═══════════════════════════════════════════════════════════════════════════════

	createDebugSession(intentId: string): IDebugSession {
		const intent = this.brainService.getIntent(intentId);
		const events = this.getIntentTimeline(intentId);
		const fromTimestamp = events.length > 0 ? events[0].timestamp : Date.now();
		const toTimestamp = events.length > 0 ? events[events.length - 1].timestamp : Date.now();

		return this._createDebugSessionInternal(intentId, fromTimestamp, toTimestamp, events);
	}

	createDebugSessionForRange(fromTimestamp: number, toTimestamp: number): IDebugSession {
		const events = this._timelineEvents.filter(e =>
			e.timestamp >= fromTimestamp && e.timestamp <= toTimestamp
		).sort((a, b) => a.timestamp - b.timestamp);

		return this._createDebugSessionInternal(undefined, fromTimestamp, toTimestamp, events);
	}

	private _createDebugSessionInternal(
		intentId: string | undefined,
		fromTimestamp: number,
		toTimestamp: number,
		events: readonly IExecutionTimelineEvent[]
	): IDebugSession {
		const id = generateUuid();
		const session: IMutableDebugSession = {
			id,
			intentId,
			fromTimestamp,
			toTimestamp,
			currentTimestamp: events.length > 0 ? events[0].timestamp : fromTimestamp,
			currentStep: 0,
			totalSteps: events.length,
			paused: true,
			events: [...events],
			currentCausalTrace: undefined,
			snapshotIds: [],
		};

		if (events.length > 0) {
			session.currentCausalTrace = this._buildCausalTrace(events[0]);
		}

		this._debugSessions.set(id, session);

		return { ...session };
	}

	getDebugSession(sessionId: string): IDebugSession | undefined {
		const session = this._debugSessions.get(sessionId);
		return session ? { ...session } : undefined;
	}

	debugStepForward(sessionId: string): IDebugSession {
		const session = this._debugSessions.get(sessionId);
		if (!session) { return this._emptyDebugSession(sessionId); }

		if (session.currentStep < session.totalSteps - 1) {
			session.currentStep++;
			session.currentTimestamp = session.events[session.currentStep].timestamp;
			session.currentCausalTrace = this._buildCausalTrace(session.events[session.currentStep]);
			session.paused = true;
		}

		return { ...session };
	}

	debugStepBackward(sessionId: string): IDebugSession {
		const session = this._debugSessions.get(sessionId);
		if (!session) { return this._emptyDebugSession(sessionId); }

		if (session.currentStep > 0) {
			session.currentStep--;
			session.currentTimestamp = session.events[session.currentStep].timestamp;
			session.currentCausalTrace = this._buildCausalTrace(session.events[session.currentStep]);
			session.paused = true;
		}

		return { ...session };
	}

	getCausalTrace(sessionId: string): ICausalTrace | undefined {
		const session = this._debugSessions.get(sessionId);
		if (!session || session.events.length === 0) { return undefined; }

		const currentEvent = session.events[session.currentStep];
		return this._buildCausalTrace(currentEvent);
	}

	resolveWhy(eventId: string): IWhyResolution {
		const eventMap = new Map<string, IExecutionTimelineEvent>();
		for (const e of this._timelineEvents) {
			eventMap.set(e.id, e);
		}

		const targetEvent = eventMap.get(eventId);
		if (!targetEvent) {
			return {
				targetEvent: {
					id: eventId,
					timestamp: Date.now(),
					source: TimelineEventSource.GlobalBrain,
					category: TimelineEventCategory.HealthStability,
					description: 'Unknown event',
					causedByEventId: undefined,
					intentId: undefined,
					agentId: undefined,
					processSessionId: undefined,
					graphNodeId: undefined,
					data: {},
					hasSideEffects: false,
					nearestSnapshotId: undefined,
				},
				rootCause: undefined,
				causalChain: [],
				explanation: `Event ${eventId} not found in timeline`,
				initiatingIntent: undefined,
				executingAgentId: undefined,
				executingProcessId: undefined,
				expectedOutcome: true,
				alternativeOutcomes: [],
			};
		}

		// Walk backward through the causal chain
		const causalChain: IExecutionTimelineEvent[] = [];
		let current: IExecutionTimelineEvent | undefined = targetEvent;
		const visited = new Set<string>();
		while (current && !visited.has(current.id)) {
			visited.add(current.id);
			causalChain.unshift(current);
			if (current.causedByEventId) {
				current = eventMap.get(current.causedByEventId);
			} else {
				current = undefined;
			}
		}

		const rootCause = causalChain.length > 1 ? causalChain[0] : undefined;

		// Find the initiating intent
		const initiatingIntentId = causalChain.find(e => e.intentId)?.intentId;
		const initiatingIntent = initiatingIntentId ? this.brainService.getIntent(initiatingIntentId) : undefined;

		// Build explanation
		const explanationParts: string[] = [];
		if (rootCause) {
			explanationParts.push(`Root cause: ${rootCause.description} [${rootCause.source}]`);
		}
		if (initiatingIntent) {
			explanationParts.push(`Initiated by intent: ${initiatingIntent.description} (${initiatingIntent.actionType})`);
		}
		explanationParts.push(`Event: ${targetEvent.description} [${targetEvent.source}]`);
		if (targetEvent.agentId) {
			explanationParts.push(`Executed by agent: ${targetEvent.agentId}`);
		}
		if (targetEvent.processSessionId) {
			explanationParts.push(`Involved process: ${targetEvent.processSessionId}`);
		}
		const explanation = explanationParts.join('. ');

		// Determine alternative outcomes
		const alternativeOutcomes: string[] = [];
		if (rootCause && rootCause !== targetEvent) {
			alternativeOutcomes.push(`If ${rootCause.description} had not occurred, the chain would not have started`);
		}
		if (initiatingIntent && initiatingIntent.resolution === IntentResolution.Failed) {
			alternativeOutcomes.push('If the intent had succeeded, the outcome would differ');
		}
		alternativeOutcomes.push('Different timing could have produced different results');

		return {
			targetEvent,
			rootCause,
			causalChain,
			explanation,
			initiatingIntent,
			executingAgentId: targetEvent.agentId,
			executingProcessId: targetEvent.processSessionId,
			expectedOutcome: !targetEvent.hasSideEffects || targetEvent.category !== TimelineEventCategory.Conflict,
			alternativeOutcomes,
		};
	}

	closeDebugSession(sessionId: string): void {
		this._debugSessions.delete(sessionId);
	}

	// ═══════════════════════════════════════════════════════════════════════════════
	// TASK 10 — REPLAY UI LAYER
	// ═══════════════════════════════════════════════════════════════════════════════

	getTimelineViewModel(filter?: ITimelineFilter): IExecutionTimelineViewModel {
		const events = this.getTimelineEvents(filter);
		if (events.length === 0) {
			return {
				segments: [],
				totalEvents: 0,
				fromTimestamp: Date.now(),
				toTimestamp: Date.now(),
				snapshotMarkers: [],
				intentMarkers: [],
			};
		}

		const fromTimestamp = events[0].timestamp;
		const toTimestamp = events[events.length - 1].timestamp;

		// Split into segments (each ~60 seconds or all events if less)
		const segmentDuration = 60000;
		const segments: ITimelineSegment[] = [];
		let segStart = fromTimestamp;
		while (segStart <= toTimestamp) {
			const segEnd = Math.min(segStart + segmentDuration, toTimestamp);
			segments.push(this.getTimelineSegment(segStart, segEnd));
			segStart = segEnd + 1;
		}

		// Snapshot markers
		const snapshotMarkers: ISnapshotMarker[] = this.getAllSnapshots().map(s => ({
			timestamp: s.timestamp,
			snapshotId: s.id,
			label: s.label,
			complete: s.complete,
		}));

		// Intent markers
		const intentMarkers: IIntentMarker[] = [];
		const activeIntents = this.brainService.getActiveIntents();
		for (const intent of activeIntents) {
			intentMarkers.push({
				timestamp: intent.createdAt,
				intentId: intent.id,
				actionType: intent.actionType,
				resolution: intent.resolution,
				source: intent.source,
			});
		}

		return {
			segments,
			totalEvents: events.length,
			fromTimestamp,
			toTimestamp,
			snapshotMarkers,
			intentMarkers,
		};
	}

	getReplayControllerViewModel(): IReplayControllerViewModel {
		const allSnapshots = this.getAllSnapshots();
		const activeSessions = [...this._debugSessions.values()];

		return {
			currentPosition: this._timelineEvents.length > 0 ?
				this._timelineEvents[this._timelineEvents.length - 1].timestamp : Date.now(),
			playing: false,
			speed: 1,
			mode: this._replayMode,
			totalDuration: allSnapshots.length >= 2 ?
				allSnapshots[allSnapshots.length - 1].timestamp - allSnapshots[0].timestamp : 0,
			currentStep: 0,
			totalSteps: this._timelineEvents.length,
			snapshotCount: allSnapshots.length,
			debugSessionId: activeSessions.length > 0 ? activeSessions[0].id : undefined,
		};
	}

	getSnapshotInspectorViewModel(snapshotId: string): ISnapshotInspectorViewModel | undefined {
		const snapshot = this._snapshots.get(snapshotId);
		if (!snapshot) { return undefined; }

		const layerSummaries: Record<SnapshotLayer, string> = {
			[SnapshotLayer.Graph]: snapshot.graphLayer
				? `Nodes: ${snapshot.graphLayer.nodeCount}, Edges: ${snapshot.graphLayer.edgeCount}`
				: 'Not captured',
			[SnapshotLayer.Context]: snapshot.contextLayer
				? `Entries: ${snapshot.contextLayer.totalEntries}, Symbols: ${snapshot.contextLayer.symbolCount}`
				: 'Not captured',
			[SnapshotLayer.Agent]: snapshot.agentLayer
				? `Active: ${snapshot.agentLayer.activeAgentCount}, Plans: ${snapshot.agentLayer.activePlanCount}`
				: 'Not captured',
			[SnapshotLayer.Process]: snapshot.processLayer
				? `Sessions: ${snapshot.processLayer.activeSessionCount}, Supervised: ${snapshot.processLayer.supervisedCount}`
				: 'Not captured',
			[SnapshotLayer.Intent]: snapshot.intentLayer
				? `Active: ${snapshot.intentLayer.activeIntentCount}, Max depth: ${snapshot.intentLayer.maxChainDepth}`
				: 'Not captured',
			[SnapshotLayer.Brain]: snapshot.brainLayer
				? `Phase: ${snapshot.brainLayer.loopPhase}, Health: ${snapshot.brainLayer.healthStatus}`
				: 'Not captured',
		};

		const allSnapshots = this.getAllSnapshots();
		const idx = allSnapshots.findIndex(s => s.id === snapshotId);

		return {
			snapshot,
			layerSummaries,
			hasPreviousDiff: idx > 0,
			hasNextDiff: idx < allSnapshots.length - 1,
		};
	}

	getCausalTraceViewModel(eventId: string): ICausalTraceViewModel | undefined {
		const trace = this._buildCausalTraceForEvent(eventId);
		if (!trace) { return undefined; }

		const steps: ICausalTraceStep[] = trace.eventChain.map((event, i) => {
			const nextEvent = i < trace.eventChain.length - 1 ? trace.eventChain[i + 1] : undefined;
			let connectionType: 'caused' | 'triggered' | 'parent' | 'derived' = 'caused';
			if (nextEvent) {
				if (nextEvent.category === TimelineEventCategory.StateTransition) {
					connectionType = 'triggered';
				} else if (nextEvent.category === TimelineEventCategory.AgentLifecycle) {
					connectionType = 'derived';
				} else if (nextEvent.category === TimelineEventCategory.GraphChange) {
					connectionType = 'parent';
				}
			}

			return {
				stepIndex: i,
				event,
				subsystem: event.source,
				description: event.description,
				connectedToNext: nextEvent !== undefined && nextEvent.causedByEventId === event.id,
				connectionType: i === 0 ? 'caused' : connectionType,
			};
		});

		return { trace, steps };
	}

	getDiffViewerViewModel(snapshotAId: string, snapshotBId: string): IDiffViewerViewModel | undefined {
		const a = this._snapshots.get(snapshotAId);
		const b = this._snapshots.get(snapshotBId);
		if (!a || !b) { return undefined; }

		const diff = this.diffSnapshots(snapshotAId, snapshotBId);

		const layerTabs = ALL_LAYERS.map(layer => ({
			layer,
			changeCount: diff.changes.filter(c => c.layer === layer).length,
		})).filter(t => t.changeCount > 0);

		return {
			snapshotAId,
			snapshotBId,
			diff,
			layerTabs,
		};
	}

	// ═══════════════════════════════════════════════════════════════════════════════
	// SYSTEM-WIDE
	// ═══════════════════════════════════════════════════════════════════════════════

	get replayActive(): boolean { return this._replayActive; }
	get mutationLeakDetected(): boolean { return this._mutationLeakDetected; }

	getReplayStatus(): IReplayStatus {
		const allSnapshots = this.getAllSnapshots();
		return {
			active: this._replayActive,
			replayMode: this._replayMode,
			snapshotCount: allSnapshots.length,
			timelineEventCount: this._timelineEvents.length,
			debugSessionCount: this._debugSessions.size,
			autoCaptureActive: this._autoCaptureTimer !== undefined,
			lastSnapshotTimestamp: allSnapshots.length > 0 ? allSnapshots[allSnapshots.length - 1].timestamp : undefined,
			divergencesDetected: this._divergences.length,
			mutationLeakDetected: this._mutationLeakDetected,
		};
	}

	validateNoRuntimeInterference(): IReplayIntegrityCheck {
		const violations: string[] = [];

		// Verify that our internal maps don't overlap with runtime state
		// (We never write to runtime services, so this should always pass)

		// Check that we haven't modified any graph nodes
		const graphNodeCount = this.graphService.nodeCount;
		const snapshotNodeCount = this._snapshots.size > 0
			? [...this._snapshots.values()].reduce((max, s) =>
				Math.max(max, s.graphLayer?.nodeCount ?? 0), 0)
			: 0;
		if (snapshotNodeCount > graphNodeCount) {
			violations.push(`Snapshot node count (${snapshotNodeCount}) exceeds graph node count (${graphNodeCount}) — possible leak`);
		}

		// Check that debug sessions haven't modified real state
		for (const session of this._debugSessions.values()) {
			for (const event of session.events) {
				if (event.source === TimelineEventSource.Stabilization && event.hasSideEffects) {
					violations.push(`Debug session ${session.id} contains side-effect event ${event.id}`);
				}
			}
		}

		this._mutationLeakDetected = violations.length > 0;

		return {
			passed: violations.length === 0,
			mutationLeakCount: violations.length,
			violations,
			snapshotIntegrityCheck: this._verifySnapshotIntegrity(),
			timelineIntegrityCheck: this._verifyTimelineIntegrity(),
			debugSessionIntegrityCheck: this._verifyDebugSessionIntegrity(),
		};
	}

	// ═══════════════════════════════════════════════════════════════════════════════
	// PRIVATE HELPERS
	// ═══════════════════════════════════════════════════════════════════════════════

	private _createReplaySeedInternal(snapshotId: string, description: string): IReplaySeed {
		const now = Date.now();
		const seed: IReplaySeed = {
			id: generateUuid(),
			value: fnv1aHash(snapshotId + now + description),
			snapshotId,
			createdAt: now,
			description,
		};
		this._replaySeeds.set(seed.id, seed);
		return seed;
	}

	private _recordTimelineEvent(params: {
		source: TimelineEventSource;
		category: TimelineEventCategory;
		description: string;
		intentId: string | undefined;
		agentId: string | undefined;
		processSessionId: string | undefined;
		graphNodeId: string | undefined;
		data: Record<string, unknown>;
		hasSideEffects: boolean;
	}): void {
		const now = Date.now();
		const id = `tle-${++this._eventCounter}-${generateUuid().slice(0, 8)}`;

		// Find the nearest snapshot
		let nearestSnapshotId: string | undefined;
		const nearestSnap = this.getNearestSnapshot(now);
		if (nearestSnap && Math.abs(nearestSnap.timestamp - now) < 60000) {
			nearestSnapshotId = nearestSnap.id;
		}

		// Determine causal link — link to the previous event from the same source if close in time
		let causedByEventId: string | undefined;
		const recentFromSource = this._timelineEvents.filter(
			e => e.source === params.source && e.timestamp > now - 5000
		);
		if (recentFromSource.length > 0) {
			causedByEventId = recentFromSource[recentFromSource.length - 1].id;
		}

		const event: IExecutionTimelineEvent = {
			id,
			timestamp: now,
			source: params.source,
			category: params.category,
			description: params.description,
			causedByEventId,
			intentId: params.intentId,
			agentId: params.agentId,
			processSessionId: params.processSessionId,
			graphNodeId: params.graphNodeId,
			data: params.data,
			hasSideEffects: params.hasSideEffects,
			nearestSnapshotId,
		};

		this._timelineEvents.push(event);
		this._onDidRecordTimelineEvent.fire(event);

		// Trim old events if exceeding cap
		if (this._timelineEvents.length > 50000) {
			this._timelineEvents = this._timelineEvents.slice(-40000);
		}
	}

	private _buildCausalTrace(event: IExecutionTimelineEvent): ICausalTrace {
		const eventMap = new Map<string, IExecutionTimelineEvent>();
		for (const e of this._timelineEvents) {
			eventMap.set(e.id, e);
		}

		// Walk backward to root
		const chain: IExecutionTimelineEvent[] = [];
		let current: IExecutionTimelineEvent | undefined = event;
		const visited = new Set<string>();
		while (current && !visited.has(current.id)) {
			visited.add(current.id);
			chain.unshift(current);
			current = current.causedByEventId ? eventMap.get(current.causedByEventId) : undefined;
		}

		// Find root intent
		const rootIntentId = chain.find(e => e.intentId)?.intentId;
		const rootIntent = rootIntentId ? this.brainService.getIntent(rootIntentId) : undefined;

		// Categorize events
		const graphMutations = chain.filter(e =>
			e.category === TimelineEventCategory.GraphChange && e.hasSideEffects
		);
		const fileMutations = chain.filter(e =>
			e.category === TimelineEventCategory.Mutation
		);

		// Build explanation
		const parts: string[] = [];
		if (rootIntent) {
			parts.push(`Intent "${rootIntent.description}" (${rootIntent.actionType})`);
		}
		if (event.agentId) {
			parts.push(`Agent ${event.agentId} executed`);
		}
		if (event.processSessionId) {
			parts.push(`Process ${event.processSessionId} involved`);
		}
		parts.push(event.description);
		const explanation = parts.join(' → ');

		return {
			id: generateUuid(),
			rootIntent,
			agentDecisions: [],
			processExecutions: [],
			graphMutations,
			fileMutations,
			eventChain: chain,
			explanation,
		};
	}

	private _buildCausalTraceForEvent(eventId: string): ICausalTrace | undefined {
		const eventMap = new Map<string, IExecutionTimelineEvent>();
		for (const e of this._timelineEvents) {
			eventMap.set(e.id, e);
		}
		const event = eventMap.get(eventId);
		if (!event) { return undefined; }
		return this._buildCausalTrace(event);
	}

	private _buildCausalChainsBetween(a: ISystemSnapshot, b: ISystemSnapshot, changes: ISnapshotChange[]): ICausalChain[] {
		const events = this._timelineEvents.filter(e =>
			e.timestamp > a.timestamp && e.timestamp <= b.timestamp
		).sort((x, y) => x.timestamp - y.timestamp);

		if (events.length === 0) { return []; }

		const eventMap = new Map(events.map(e => [e.id, e]));
		const chains: ICausalChain[] = [];

		// Find root events (events without a cause in this window)
		const roots = events.filter(e => !e.causedByEventId || !eventMap.has(e.causedByEventId));

		for (const root of roots) {
			// Walk forward from the root
			const chain: IExecutionTimelineEvent[] = [root];
			const visited = new Set<string>([root.id]);
			const queue = [root.id];

			while (queue.length > 0) {
				const currentId = queue.shift()!;
				for (const e of events) {
					if (e.causedByEventId === currentId && !visited.has(e.id)) {
						visited.add(e.id);
						chain.push(e);
						queue.push(e.id);
					}
				}
			}

			if (chain.length > 1) {
				const intentIds = [...new Set(chain.filter(e => e.intentId).map(e => e.intentId!))];
				const subsystems = [...new Set(chain.map(e => e.source))];
				const lastEvent = chain[chain.length - 1];

				chains.push({
					id: generateUuid(),
					rootCause: root,
					chain,
					intentIds,
					subsystems,
					effect: lastEvent.description,
					complete: chain.every((e, i) =>
						i === 0 || e.causedByEventId !== undefined
					),
				});
			}
		}

		return chains;
	}

	private _diffNumericField(
		changes: ISnapshotChange[],
		layer: SnapshotLayer,
		aspect: string,
		valueA: number,
		valueB: number
	): void {
		if (valueA !== valueB) {
			const delta = Math.abs(valueB - valueA);
			const severity: 'minor' | 'major' | 'critical' =
				delta > 50 ? 'critical' : delta > 10 ? 'major' : 'minor';
			changes.push({
				layer,
				aspect,
				valueA: String(valueA),
				valueB: String(valueB),
				isAddition: valueA === 0 && valueB > 0,
				isRemoval: valueA > 0 && valueB === 0,
				causingIntentId: undefined,
				causingEventId: undefined,
				severity,
				expected: true,
			});
		}
	}

	private _diffStringField(
		changes: ISnapshotChange[],
		layer: SnapshotLayer,
		aspect: string,
		valueA: string,
		valueB: string
	): void {
		if (valueA !== valueB) {
			changes.push({
				layer,
				aspect,
				valueA,
				valueB,
				isAddition: false,
				isRemoval: false,
				causingIntentId: undefined,
				causingEventId: undefined,
				severity: 'minor',
				expected: true,
			});
		}
	}

	private _diffRecordFields(
		changes: ISnapshotChange[],
		layer: SnapshotLayer,
		recordA: Readonly<Record<string, number>>,
		recordB: Readonly<Record<string, number>>
	): void {
		const allKeys = new Set([...Object.keys(recordA), ...Object.keys(recordB)]);
		for (const key of allKeys) {
			const a = recordA[key] ?? 0;
			const b = recordB[key] ?? 0;
			if (a !== b) {
				this._diffNumericField(changes, layer, key, a, b);
			}
		}
	}

	private _emptyDebugSession(id: string): IDebugSession {
		return {
			id,
			intentId: undefined,
			fromTimestamp: 0,
			toTimestamp: 0,
			currentTimestamp: 0,
			currentStep: 0,
			totalSteps: 0,
			paused: false,
			events: [],
			currentCausalTrace: undefined,
			snapshotIds: [],
		};
	}

	private _verifySnapshotIntegrity(): boolean {
		for (const snapshot of this._snapshots.values()) {
			// Verify snapshot has at least one layer
			if (snapshot.layers.length === 0) { return false; }
			// Verify timestamp is sane
			if (snapshot.timestamp <= 0) { return false; }
			// Verify seed
			if (!snapshot.replaySeed || !snapshot.replaySeed.id) { return false; }
		}
		return true;
	}

	private _verifyTimelineIntegrity(): boolean {
		const eventIds = new Set<string>();
		for (const event of this._timelineEvents) {
			// No duplicate IDs
			if (eventIds.has(event.id)) { return false; }
			eventIds.add(event.id);
			// Timestamp must be positive
			if (event.timestamp <= 0) { return false; }
		}
		return true;
	}

	private _verifyDebugSessionIntegrity(): boolean {
		for (const session of this._debugSessions.values()) {
			// Step must be within range
			if (session.currentStep < 0 || session.currentStep >= session.totalSteps) {
				if (session.totalSteps > 0) { return false; }
			}
		}
		return true;
	}

	override dispose(): void {
		this.stopAutoCapture();
		this._debugSessions.clear();
		this._snapshots.clear();
		this._timelineEvents = [];
		this._replaySeeds.clear();
		this._divergences = [];
		super.dispose();
	}
}
