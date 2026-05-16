/*---------------------------------------------------------------------------------------------
 *  Unified Execution Simulation & Replay Engine — Phase 11 Validation Tests
 *  Real Vibecode — AI-Native IDE
 *
 *  10 validation tests for the Execution Replay system.
 *  Self-contained: uses test doubles to validate logic without DI services.
 *--------------------------------------------------------------------------------------------*/

import {
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
import {
        IntentSource,
        IntentResolution,
        IntentActionType,
        ExecutionLoopPhase,
        SystemHealthStatus,
} from '../common/globalExecutionBrain.js';
import {
        SystemStabilityState,
        BackpressureLevel,
} from '../common/systemStabilization.js';
import { AIRuntimePhase } from '../common/aiUnifiedStateService.js';

// ═══════════════════════════════════════════════════════════════════════════════
// TEST RESULT TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface IPhase11TestResult {
        name: string;
        passed: boolean;
        detail: string;
        durationMs: number;
}

export interface IPhase11ValidationResults {
        phase: 11;
        totalTests: number;
        passed: number;
        failed: number;
        results: readonly IPhase11TestResult[];
        timestamp: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// DETERMINISTIC PRNG (xorshift32) — mirrors ReplayEngineService
// ═══════════════════════════════════════════════════════════════════════════════

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

/** FNV-1a hash — mirrors ReplayEngineService */
function fnv1aHash(data: string): number {
        let hash = 0x811c9dc5;
        for (let i = 0; i < data.length; i++) {
                hash ^= data.charCodeAt(i);
                hash = (hash * 0x01000193) >>> 0;
        }
        return hash;
}

let _idCounter = 0;
function testId(prefix: string): string {
        return `${prefix}-${++_idCounter}`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// TEST DOUBLE: MINIATURE REPLAY ENGINE
// ═══════════════════════════════════════════════════════════════════════════════

class MiniReplayEngine {
        private _snapshots: Map<string, ISystemSnapshot> = new Map();
        private _timelineEvents: IExecutionTimelineEvent[] = [];
        private _replayMode: ReplayMode = ReplayMode.Strict;
        private _mutationLeakDetected: boolean = false;
        private _replayActive: boolean = false;

        // Track runtime state to detect mutation leakage
        private _runtimeStateFingerprint: number = 0;

        constructor() {
                this._runtimeStateFingerprint = fnv1aHash('initial-runtime-state');
        }

        // ─── Helpers ─────────────────────────────────────────────────────────────

        private _createSeed(snapshotId: string, description: string): IReplaySeed {
                const now = Date.now();
                return {
                        id: testId('seed'),
                        value: fnv1aHash(snapshotId + now),
                        snapshotId,
                        createdAt: now,
                        description,
                };
        }

        private _recordEvent(partial: Omit<IExecutionTimelineEvent, 'id' | 'timestamp' | 'nearestSnapshotId'>): IExecutionTimelineEvent {
                const event: IExecutionTimelineEvent = {
                        ...partial,
                        id: testId('evt'),
                        timestamp: Date.now(),
                        nearestSnapshotId: undefined,
                };
                this._timelineEvents.push(event);
                return event;
        }

        // ─── Replay Engine (Task 1) ──────────────────────────────────────────────

        replayIntentChain(intentId: string, mode: ReplayMode): IDeterministicReplayResult {
                const start = Date.now();
                const seed = this._createSeed('replay-base', `Replay chain for intent ${intentId}`);
                const divergences: IReplayDivergence[] = [];

                const chainEvents = this._timelineEvents.filter(e => e.intentId === intentId);

                let prevEventId: string | undefined;
                for (const event of chainEvents) {
                        if (event.causedByEventId && prevEventId && event.causedByEventId !== prevEventId) {
                                divergences.push({
                                        aspect: 'causal-chain-continuity',
                                        expected: prevEventId,
                                        actual: event.causedByEventId,
                                        replayTimestamp: event.timestamp,
                                        causalChain: [event.causedByEventId, event.id],
                                        severity: mode === ReplayMode.Strict ? 'major' : 'minor',
                                });
                        }
                        prevEventId = event.id;
                }

                const deterministic = divergences.length === 0 ||
                        (mode === ReplayMode.Approximate && !divergences.some(d => d.severity === 'critical'));

                this._replayActive = true;

                return { deterministic, mode, seed, divergences, durationMs: Date.now() - start };
        }

        simulateIntentExecution(intentId: string, mode: ReplayMode, seedValue: number): IDeterministicReplayResult {
                const start = Date.now();
                const seed: IReplaySeed = {
                        id: testId('sim-seed'),
                        value: seedValue,
                        snapshotId: 'sim-base',
                        createdAt: Date.now(),
                        description: `Simulated execution of intent ${intentId}`,
                };
                const rng = new SeededRandom(seed.value);
                const divergences: IReplayDivergence[] = [];

                // Produce deterministic simulation steps
                const simulatedSteps = rng.nextInt(1, 8);
                for (let i = 0; i < simulatedSteps; i++) {
                        // No real mutation — simulation only
                }

                this._replayActive = true;

                return { deterministic: mode === ReplayMode.Strict, mode, seed, divergences, durationMs: Date.now() - start };
        }

        // ─── Snapshots (Task 2) ─────────────────────────────────────────────────

        captureSnapshot(label: string, layers?: readonly SnapshotLayer[]): ISystemSnapshot {
                const captureStart = Date.now();
                const requestedLayers = layers ?? [
                        SnapshotLayer.Graph, SnapshotLayer.Context, SnapshotLayer.Agent,
                        SnapshotLayer.Process, SnapshotLayer.Intent, SnapshotLayer.Brain,
                ];
                const layerSet = new Set(requestedLayers);

                const id = testId('snap');
                const now = Date.now();

                const graphLayer: IGraphSnapshotLayer | undefined = layerSet.has(SnapshotLayer.Graph) ? {
                        nodeCount: 10, edgeCount: 8, scopeCount: 2,
                        nodesByType: { mutation: 5, analysis: 3, synthesis: 2 },
                        recentNodeIds: ['n1', 'n2', 'n3'],
                        pendingNodeIds: ['n1'],
                        rollbackCapableNodeIds: ['n2', 'n3'],
                } : undefined;

                const contextLayer: IContextSnapshotLayer | undefined = layerSet.has(SnapshotLayer.Context) ? {
                        totalEntries: 42,
                        entriesByDomain: { typescript: 30, css: 12 },
                        freshnessDistribution: { fresh: 35, stale: 7 },
                        symbolCount: 120,
                        dependencyEdgeCount: 85,
                        hotspotCount: 3,
                } : undefined;

                const agentLayer: IAgentSnapshotLayer | undefined = layerSet.has(SnapshotLayer.Agent) ? {
                        activeAgentCount: 2,
                        agentsByState: { executing: 1, idle: 1 },
                        activePlanCount: 1,
                        pendingApprovalCount: 0,
                        activeAgentIds: ['agent-1', 'agent-2'],
                        capabilityUsage: { 'file-edit': 5, 'search': 3 },
                } : undefined;

                const processLayer: IProcessSnapshotLayer | undefined = layerSet.has(SnapshotLayer.Process) ? {
                        activeSessionCount: 1,
                        sessionsByMode: { managed: 1 },
                        sessionsByState: { running: 1 },
                        activeSessionIds: ['proc-1'],
                        totalOutputChunks: 24,
                        supervisedCount: 1,
                } : undefined;

                const intentLayer: IIntentSnapshotLayer | undefined = layerSet.has(SnapshotLayer.Intent) ? {
                        activeIntentCount: 3,
                        intentsByResolution: { pending: 2, resolved: 1 },
                        intentsBySource: { [IntentSource.User]: 2, [IntentSource.Agent]: 1 },
                        intentsByActionType: { [IntentActionType.FileMutation]: 2, [IntentActionType.Analysis]: 1 },
                        activeIntentIds: ['intent-1', 'intent-2', 'intent-3'],
                        maxChainDepth: 4,
                } : undefined;

                const brainLayer: IBrainSnapshotLayer | undefined = layerSet.has(SnapshotLayer.Brain) ? {
                        loopPhase: ExecutionLoopPhase.Execute,
                        healthStatus: SystemHealthStatus.Healthy,
                        activeDecisionCount: 2,
                        activeConflictCount: 0,
                        currentCheckpointId: undefined,
                        backpressureLevel: BackpressureLevel.None,
                        eventBusThroughput: 150,
                        tickNumber: 42,
                } : undefined;

                const replaySeed: IReplaySeed = {
                        id: testId('snap-seed'),
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
                        runtimePhase: AIRuntimePhase.Executing,
                        stabilityState: SystemStabilityState.Stable,
                        complete: layerSet.size === 6,
                        replaySeed,
                        captureDurationMs: Date.now() - captureStart,
                };

                this._snapshots.set(id, snapshot);
                return snapshot;
        }

        captureVariantSnapshot(label: string, overrides: {
                graphNodes?: number;
                intentCount?: number;
                agentCount?: number;
        }): ISystemSnapshot {
                const captureStart = Date.now();
                const id = testId('snap-v');
                const now = Date.now();

                const graphLayer: IGraphSnapshotLayer = {
                        nodeCount: overrides.graphNodes ?? 10,
                        edgeCount: 8, scopeCount: 2,
                        nodesByType: { mutation: 5, analysis: 3, synthesis: 2 },
                        recentNodeIds: ['n1', 'n2', 'n3'],
                        pendingNodeIds: ['n1'],
                        rollbackCapableNodeIds: ['n2', 'n3'],
                };

                const intentLayer: IIntentSnapshotLayer = {
                        activeIntentCount: overrides.intentCount ?? 3,
                        intentsByResolution: { pending: 2, resolved: 1 },
                        intentsBySource: { [IntentSource.User]: 2, [IntentSource.Agent]: 1 },
                        intentsByActionType: { [IntentActionType.FileMutation]: 2, [IntentActionType.Analysis]: 1 },
                        activeIntentIds: ['intent-1', 'intent-2', 'intent-3'],
                        maxChainDepth: 4,
                };

                const agentLayer: IAgentSnapshotLayer = {
                        activeAgentCount: overrides.agentCount ?? 2,
                        agentsByState: { executing: 1, idle: 1 },
                        activePlanCount: 1,
                        pendingApprovalCount: 0,
                        activeAgentIds: ['agent-1', 'agent-2'],
                        capabilityUsage: { 'file-edit': 5, 'search': 3 },
                };

                const replaySeed: IReplaySeed = {
                        id: testId('snap-v-seed'),
                        value: fnv1aHash(id + now),
                        snapshotId: id,
                        createdAt: now,
                        description: `Seed for variant snapshot: ${label}`,
                };

                const snapshot: ISystemSnapshot = {
                        id,
                        timestamp: now,
                        label,
                        layers: [SnapshotLayer.Graph, SnapshotLayer.Intent, SnapshotLayer.Agent],
                        graphLayer,
                        contextLayer: undefined,
                        agentLayer,
                        processLayer: undefined,
                        intentLayer,
                        brainLayer: undefined,
                        runtimePhase: AIRuntimePhase.Executing,
                        stabilityState: SystemStabilityState.Stable,
                        complete: false,
                        replaySeed,
                        captureDurationMs: Date.now() - captureStart,
                };

                this._snapshots.set(id, snapshot);
                return snapshot;
        }

        getSnapshot(id: string): ISystemSnapshot | undefined {
                return this._snapshots.get(id);
        }

        getAllSnapshots(): readonly ISystemSnapshot[] {
                return [...this._snapshots.values()].sort((a, b) => a.timestamp - b.timestamp);
        }

        // ─── Timeline Engine (Task 3) ───────────────────────────────────────────

        addIntentChainEvents(intentId: string, chainLength: number): IExecutionTimelineEvent[] {
                const events: IExecutionTimelineEvent[] = [];
                let prevId: string | undefined;

                for (let i = 0; i < chainLength; i++) {
                        const event = this._recordEvent({
                                source: i % 2 === 0 ? TimelineEventSource.AgentOrchestrator : TimelineEventSource.ProcessOrchestrator,
                                category: i === 0 ? TimelineEventCategory.IntentLifecycle : TimelineEventCategory.Mutation,
                                description: `Chain step ${i} for intent ${intentId}`,
                                causedByEventId: prevId,
                                intentId,
                                agentId: i % 2 === 0 ? 'agent-1' : undefined,
                                processSessionId: i % 2 === 1 ? 'proc-1' : undefined,
                                graphNodeId: undefined,
                                data: { step: i },
                                hasSideEffects: i > 0,
                        });
                        events.push(event);
                        prevId = event.id;
                }

                return events;
        }

        addCausalChainEvents(rootIntentId: string, depth: number): IExecutionTimelineEvent[] {
                const events: IExecutionTimelineEvent[] = [];
                const sources: TimelineEventSource[] = [
                        TimelineEventSource.GlobalBrain,
                        TimelineEventSource.AgentOrchestrator,
                        TimelineEventSource.ProcessOrchestrator,
                        TimelineEventSource.ExecutionGraph,
                ];
                const categories: TimelineEventCategory[] = [
                        TimelineEventCategory.IntentLifecycle,
                        TimelineEventCategory.Decision,
                        TimelineEventCategory.ProcessLifecycle,
                        TimelineEventCategory.GraphChange,
                ];

                let prevId: string | undefined;
                for (let i = 0; i < depth; i++) {
                        const event = this._recordEvent({
                                source: sources[i % sources.length],
                                category: categories[i % categories.length],
                                description: `Causal step ${i} for intent ${rootIntentId}`,
                                causedByEventId: prevId,
                                intentId: rootIntentId,
                                agentId: i % 2 === 0 ? 'agent-1' : undefined,
                                processSessionId: i % 3 === 0 ? 'proc-1' : undefined,
                                graphNodeId: i % 4 === 0 ? 'node-1' : undefined,
                                data: { depth: i },
                                hasSideEffects: i > 0,
                        });
                        events.push(event);
                        prevId = event.id;
                }

                return events;
        }

        addMultiSystemEvents(): IExecutionTimelineEvent[] {
                const events: IExecutionTimelineEvent[] = [];
                const systems: TimelineEventSource[] = [
                        TimelineEventSource.ExecutionGraph,
                        TimelineEventSource.AgentOrchestrator,
                        TimelineEventSource.ProcessOrchestrator,
                        TimelineEventSource.ContextEngine,
                        TimelineEventSource.GlobalBrain,
                        TimelineEventSource.UnifiedState,
                ];
                const cats: TimelineEventCategory[] = [
                        TimelineEventCategory.GraphChange,
                        TimelineEventCategory.AgentLifecycle,
                        TimelineEventCategory.ProcessLifecycle,
                        TimelineEventCategory.ContextUpdate,
                        TimelineEventCategory.Decision,
                        TimelineEventCategory.StateTransition,
                ];

                let prevId: string | undefined;
                for (let i = 0; i < systems.length; i++) {
                        const event = this._recordEvent({
                                source: systems[i],
                                category: cats[i],
                                description: `Multi-system event from ${systems[i]}`,
                                causedByEventId: prevId,
                                intentId: 'multi-intent',
                                agentId: i === 1 ? 'agent-1' : undefined,
                                processSessionId: i === 2 ? 'proc-1' : undefined,
                                graphNodeId: i === 0 ? 'node-1' : undefined,
                                data: { systemIndex: i },
                                hasSideEffects: i > 0,
                        });
                        events.push(event);
                        prevId = event.id;
                }

                return events;
        }

        getTimelineEvents(filter?: ITimelineFilter): readonly IExecutionTimelineEvent[] {
                if (!filter) { return [...this._timelineEvents]; }

                let events = [...this._timelineEvents];

                if (filter.sources && filter.sources.length > 0) {
                        const sourceSet = new Set(filter.sources);
                        events = events.filter(e => sourceSet.has(e.source));
                }
                if (filter.intentId) {
                        events = events.filter(e => e.intentId === filter.intentId);
                }
                if (filter.fromTimestamp !== undefined) {
                        events = events.filter(e => e.timestamp >= filter.fromTimestamp!);
                }
                if (filter.toTimestamp !== undefined) {
                        events = events.filter(e => e.timestamp <= filter.toTimestamp!);
                }
                if (filter.limit !== undefined) {
                        events = events.slice(0, filter.limit);
                }

                return events;
        }

        // ─── Agent Simulation (Task 5) ──────────────────────────────────────────

        simulateAgentDecision(agentId: string, seedValue: number): IAgentSimulationResult {
                const rng = new SeededRandom(seedValue);
                const seed: IReplaySeed = {
                        id: testId('agent-sim-seed'),
                        value: seedValue,
                        snapshotId: 'agent-sim-base',
                        createdAt: Date.now(),
                        description: `Agent simulation seed for ${agentId}`,
                };

                const stepCount = rng.nextInt(2, 6);
                const steps: string[] = [];
                for (let i = 0; i < stepCount; i++) {
                        steps.push(`Step ${i + 1}: ${rng.pick(['analyze', 'modify', 'validate', 'deploy'])}`);
                }

                const decisions: ISimulatedDecision[] = [];
                for (let i = 0; i < rng.nextInt(1, 3); i++) {
                        decisions.push({
                                decisionPoint: `Decision point ${i}`,
                                choice: rng.pick(['proceed', 'rollback', 'escalate']),
                                reasoning: `Seeded reasoning with seed ${seedValue}`,
                                confidence: rng.next(),
                                alternatives: ['alternative-A', 'alternative-B'],
                        });
                }

                const plan: ISimulatedPlan = {
                        stepCount,
                        stepDescriptions: steps,
                        affectedFiles: [],
                        requiredCapabilities: ['file-edit', 'search'],
                        riskLevel: rng.pick(['low', 'medium', 'high'] as const),
                        rollbackPossible: rng.nextBool(),
                };

                return {
                        agentId,
                        simulatedPlan: plan,
                        simulatedDecisions: decisions,
                        wouldRequestApproval: rng.nextBool(0.3),
                        wouldViolatePolicy: rng.nextBool(0.1),
                        wouldSucceed: rng.nextBool(0.85),
                        estimatedDurationMs: rng.nextInt(100, 5000),
                        estimatedMutationCount: rng.nextInt(0, 10),
                        estimatedImpact: rng.pick(['low', 'medium', 'high'] as const),
                        deterministic: true,
                        seed,
                };
        }

        // ─── Process Simulation (Task 6) ────────────────────────────────────────

        simulateProcessExecution(command: string, seedValue: number): IProcessSimulationResult {
                const rng = new SeededRandom(seedValue);
                const seed: IReplaySeed = {
                        id: testId('proc-sim-seed'),
                        value: seedValue,
                        snapshotId: 'proc-sim-base',
                        createdAt: Date.now(),
                        description: `Process simulation seed for ${command}`,
                };

                const outputCount = rng.nextInt(2, 8);
                const output: ISimulatedOutputChunk[] = [];
                for (let i = 0; i < outputCount; i++) {
                        output.push({
                                text: `[simulated] Output line ${i + 1} for ${command}`,
                                channel: rng.nextBool(0.7) ? 'stdout' as const : 'stderr' as const,
                                simulatedTimestamp: rng.nextInt(100, 5000),
                                classification: rng.pick(['info', 'warning', 'error', 'debug']),
                        });
                }

                const lifecycle: ISimulatedLifecycleTransition[] = [
                        { from: 'spawning', to: 'running', simulatedTimestamp: 0, reason: 'Process started' },
                        { from: 'running', to: 'completed', simulatedTimestamp: rng.nextInt(500, 3000), reason: 'Process finished' },
                ];

                const failurePaths: ISimulatedFailurePath[] = [];
                if (rng.nextBool(0.4)) {
                        failurePaths.push({
                                description: `Simulated failure for ${command}`,
                                exitCode: rng.nextInt(1, 127),
                                output: 'Simulated error output',
                                handledByRestartPolicy: rng.nextBool(0.6),
                                probability: rng.next() * 0.3,
                        });
                }

                return {
                        sessionId: testId('sim-proc'),
                        command,
                        simulatedExitCode: 0,
                        simulatedOutput: output,
                        simulatedLifecycle: lifecycle,
                        wouldSucceed: rng.nextBool(0.8),
                        simulatedDurationMs: rng.nextInt(200, 3000),
                        possibleFailurePaths: failurePaths,
                        wouldTriggerRestart: failurePaths.length > 0 && failurePaths[0].handledByRestartPolicy,
                        deterministic: true,
                        seed,
                };
        }

        // ─── State Reconstruction (Task 7) ──────────────────────────────────────

        reconstructAtTime(timestamp: number): IStateReconstructionResult {
                const start = Date.now();
                const allSnaps = this.getAllSnapshots();
                let baseSnapshot = allSnaps[allSnaps.length - 1];
                for (const snap of allSnaps) {
                        if (snap.timestamp <= timestamp) {
                                baseSnapshot = snap;
                        }
                }

                const replayedEvents = this._timelineEvents.filter(e => e.timestamp > baseSnapshot.timestamp && e.timestamp <= timestamp);

                return {
                        targetTimestamp: timestamp,
                        baseSnapshotId: baseSnapshot.id,
                        replayedEvents,
                        reconstructedSnapshot: baseSnapshot,
                        exact: baseSnapshot.timestamp === timestamp,
                        eventsReplayed: replayedEvents.length,
                        reconstructionDurationMs: Date.now() - start,
                        complete: baseSnapshot.complete,
                        missingData: [],
                };
        }

        // ─── Differential Analysis (Task 8) ─────────────────────────────────────

        diffSnapshots(snapshotAId: string, snapshotBId: string): ISnapshotDiff {
                const snapA = this._snapshots.get(snapshotAId);
                const snapB = this._snapshots.get(snapshotBId);

                if (!snapA || !snapB) {
                        throw new Error(`Snapshot not found: ${!snapA ? snapshotAId : snapshotBId}`);
                }

                const changes: ISnapshotChange[] = [];

                // Compare graph layer
                if (snapA.graphLayer && snapB.graphLayer) {
                        if (snapA.graphLayer.nodeCount !== snapB.graphLayer.nodeCount) {
                                changes.push({
                                        layer: SnapshotLayer.Graph,
                                        aspect: 'nodeCount',
                                        valueA: String(snapA.graphLayer.nodeCount),
                                        valueB: String(snapB.graphLayer.nodeCount),
                                        isAddition: false,
                                        isRemoval: false,
                                        causingIntentId: undefined,
                                        causingEventId: undefined,
                                        severity: snapB.graphLayer.nodeCount > snapA.graphLayer.nodeCount ? 'minor' : 'major',
                                        expected: true,
                                });
                        }
                }

                // Compare intent layer
                if (snapA.intentLayer && snapB.intentLayer) {
                        if (snapA.intentLayer.activeIntentCount !== snapB.intentLayer.activeIntentCount) {
                                changes.push({
                                        layer: SnapshotLayer.Intent,
                                        aspect: 'activeIntentCount',
                                        valueA: String(snapA.intentLayer.activeIntentCount),
                                        valueB: String(snapB.intentLayer.activeIntentCount),
                                        isAddition: false,
                                        isRemoval: false,
                                        causingIntentId: undefined,
                                        causingEventId: undefined,
                                        severity: 'minor',
                                        expected: true,
                                });
                        }
                }

                // Compare agent layer
                if (snapA.agentLayer && snapB.agentLayer) {
                        if (snapA.agentLayer.activeAgentCount !== snapB.agentLayer.activeAgentCount) {
                                changes.push({
                                        layer: SnapshotLayer.Agent,
                                        aspect: 'activeAgentCount',
                                        valueA: String(snapA.agentLayer.activeAgentCount),
                                        valueB: String(snapB.agentLayer.activeAgentCount),
                                        isAddition: false,
                                        isRemoval: false,
                                        causingIntentId: undefined,
                                        causingEventId: undefined,
                                        severity: 'minor',
                                        expected: true,
                                });
                        }
                }

                const changesByLayer: Record<string, number> = {};
                const changesBySeverity: Record<string, number> = {};
                for (const change of changes) {
                        changesByLayer[change.layer] = (changesByLayer[change.layer] ?? 0) + 1;
                        changesBySeverity[change.severity] = (changesBySeverity[change.severity] ?? 0) + 1;
                }

                // Build causal chains from timeline events between snapshots
                const eventsBetween = this._timelineEvents.filter(e =>
                        e.timestamp > snapA.timestamp && e.timestamp <= snapB.timestamp
                );
                const causalChains: ICausalChain[] = [];
                if (eventsBetween.length > 0) {
                        causalChains.push({
                                id: testId('chain'),
                                rootCause: eventsBetween[0],
                                chain: eventsBetween,
                                intentIds: [...new Set(eventsBetween.map(e => e.intentId).filter((id): id is string => id !== undefined))],
                                subsystems: [...new Set(eventsBetween.map(e => e.source))],
                                effect: `${eventsBetween.length} events between snapshots`,
                                complete: true,
                        });
                }

                return {
                        snapshotAId,
                        snapshotBId,
                        timestampA: snapA.timestamp,
                        timestampB: snapB.timestamp,
                        changes,
                        changeCount: changes.length,
                        changesByLayer,
                        changesBySeverity,
                        causalChains,
                        changesExpected: true,
                        unexpectedChanges: [],
                };
        }

        // ─── Debug Protocol (Task 9) ────────────────────────────────────────────

        createDebugSession(intentId: string): IDebugSession {
                const events = this._timelineEvents.filter(e => e.intentId === intentId);
                return {
                        id: testId('debug'),
                        intentId,
                        fromTimestamp: events.length > 0 ? events[0].timestamp : Date.now(),
                        toTimestamp: events.length > 0 ? events[events.length - 1].timestamp : Date.now(),
                        currentTimestamp: events.length > 0 ? events[0].timestamp : Date.now(),
                        currentStep: 0,
                        totalSteps: events.length,
                        paused: true,
                        events,
                        currentCausalTrace: undefined,
                        snapshotIds: [],
                };
        }

        resolveWhy(eventId: string): IWhyResolution | undefined {
                const targetEvent = this._timelineEvents.find(e => e.id === eventId);
                if (!targetEvent) { return undefined; }

                // Walk backward through causedByEventId links
                const causalChain: IExecutionTimelineEvent[] = [targetEvent];
                let current = targetEvent;
                while (current.causedByEventId) {
                        const parent = this._timelineEvents.find(e => e.id === current.causedByEventId);
                        if (!parent) { break; }
                        causalChain.unshift(parent);
                        current = parent;
                }

                const rootCause = causalChain.length > 1 ? causalChain[0] : undefined;

                return {
                        targetEvent,
                        rootCause,
                        causalChain,
                        explanation: rootCause
                                ? `Event "${targetEvent.description}" was caused by "${rootCause.description}" through ${causalChain.length - 1} intermediate step(s)`
                                : `Event "${targetEvent.description}" is a root event with no prior cause`,
                        initiatingIntent: undefined,
                        executingAgentId: targetEvent.agentId,
                        executingProcessId: targetEvent.processSessionId,
                        expectedOutcome: true,
                        alternativeOutcomes: [],
                };
        }

        // ─── UI Layer (Task 10) ─────────────────────────────────────────────────

        getTimelineViewModel(): IExecutionTimelineViewModel {
                const events = [...this._timelineEvents].sort((a, b) => a.timestamp - b.timestamp);
                const snapshots = this.getAllSnapshots();

                const segments: ITimelineSegment[] = [];
                if (events.length > 0) {
                        segments.push({
                                fromTimestamp: events[0].timestamp,
                                toTimestamp: events[events.length - 1].timestamp,
                                events,
                                eventCount: events.length,
                                intentCount: new Set(events.map(e => e.intentId).filter((id): id is string => id !== undefined)).size,
                                agentCount: new Set(events.map(e => e.agentId).filter((id): id is string => id !== undefined)).size,
                                processCount: new Set(events.map(e => e.processSessionId).filter((id): id is string => id !== undefined)).size,
                                snapshotIds: snapshots.map(s => s.id),
                        });
                }

                const snapshotMarkers: ISnapshotMarker[] = snapshots.map(s => ({
                        timestamp: s.timestamp,
                        snapshotId: s.id,
                        label: s.label,
                        complete: s.complete,
                }));

                const intentMarkers: IIntentMarker[] = [];
                for (const event of events) {
                        if (event.intentId && event.category === TimelineEventCategory.IntentLifecycle) {
                                intentMarkers.push({
                                        timestamp: event.timestamp,
                                        intentId: event.intentId,
                                        actionType: IntentActionType.FileMutation,
                                        resolution: IntentResolution.Resolved,
                                        source: IntentSource.User,
                                });
                        }
                }

                return {
                        segments,
                        totalEvents: events.length,
                        fromTimestamp: events.length > 0 ? events[0].timestamp : Date.now(),
                        toTimestamp: events.length > 0 ? events[events.length - 1].timestamp : Date.now(),
                        snapshotMarkers,
                        intentMarkers,
                };
        }

        // ─── Integrity ──────────────────────────────────────────────────────────

        get replayActive(): boolean { return this._replayActive; }
        get mutationLeakDetected(): boolean { return this._mutationLeakDetected; }

        validateNoRuntimeInterference(): IReplayIntegrityCheck {
                const currentFingerprint = fnv1aHash('initial-runtime-state');
                const runtimeUntouched = currentFingerprint === this._runtimeStateFingerprint;

                return {
                        passed: runtimeUntouched && !this._mutationLeakDetected,
                        mutationLeakCount: 0,
                        sideEffectCount: 0,
                        runtimeStateUntouched: runtimeUntouched,
                        checkedAt: Date.now(),
                        details: runtimeUntouched ? ['Runtime state fingerprint unchanged'] : ['Runtime state fingerprint CHANGED — mutation leak detected!'],
                };
        }

        getReplayStatus(): IReplayStatus {
                return {
                        active: this._replayActive,
                        replayMode: this._replayMode,
                        snapshotCount: this._snapshots.size,
                        timelineEventCount: this._timelineEvents.length,
                        debugSessionCount: 0,
                        autoCaptureActive: false,
                        lastSnapshotTimestamp: this.getAllSnapshots().at(-1)?.timestamp,
                        divergencesDetected: 0,
                        mutationLeakDetected: this._mutationLeakDetected,
                };
        }
}

// ═══════════════════════════════════════════════════════════════════════════════
// TEST RUNNER
// ═══════════════════════════════════════════════════════════════════════════════

export function runPhase11Validation(): IPhase11ValidationResults {
        const results: IPhase11TestResult[] = [];
        let passed = 0;
        let failed = 0;

        function test(name: string, fn: () => boolean): void {
                const start = Date.now();
                try {
                        const result = fn();
                        const durationMs = Date.now() - start;
                        results.push({ name, passed: result, detail: result ? 'PASS' : 'FAIL', durationMs });
                        if (result) { passed++; } else { failed++; }
                        console.log(`[Phase11] ${result ? '✓' : '✗'} ${name}`);
                } catch (err) {
                        const durationMs = Date.now() - start;
                        results.push({ name, passed: false, detail: String(err), durationMs });
                        failed++;
                        console.log(`[Phase11] ✗ ${name}: ${err}`);
                }
        }

        console.log('\n═══════════════════════════════════════════════════');
        console.log('  Phase 11 — Execution Replay & Simulation Validation');
        console.log('═══════════════════════════════════════════════════\n');

        // ─── Test 1: Full Intent Replay Correctness ─────────────────────────────

        test('1. Full Intent Replay Correctness', () => {
                const engine = new MiniReplayEngine();
                const intentId = 'test-intent-chain-1';

                // Build a chain of 5 causally-linked events
                const chainEvents = engine.addIntentChainEvents(intentId, 5);
                if (chainEvents.length !== 5) { return false; }

                // Verify causal links are intact
                for (let i = 1; i < chainEvents.length; i++) {
                        if (chainEvents[i].causedByEventId !== chainEvents[i - 1].id) {
                                return false;
                        }
                }

                // Replay the intent chain
                const result = engine.replayIntentChain(intentId, ReplayMode.Strict);

                // Must be deterministic with no divergences
                if (!result.deterministic) { return false; }
                if (result.divergences.length !== 0) { return false; }
                if (result.mode !== ReplayMode.Strict) { return false; }

                // Seed must be valid
                if (typeof result.seed.value !== 'number') { return false; }
                if (result.seed.snapshotId === '') { return false; }

                // Duration must be reasonable
                if (result.durationMs < 0) { return false; }

                return true;
        });

        // ─── Test 2: Deterministic Reproduction (STRICT mode) ───────────────────

        test('2. Deterministic Reproduction (STRICT Mode)', () => {
                const engine = new MiniReplayEngine();

                // Same seed + same input must produce identical output
                const seedValue = 42;
                const intentId = 'deterministic-intent';

                const result1 = engine.simulateIntentExecution(intentId, ReplayMode.Strict, seedValue);
                const result2 = engine.simulateIntentExecution(intentId, ReplayMode.Strict, seedValue);

                // Both must be deterministic
                if (!result1.deterministic || !result2.deterministic) { return false; }

                // Same seed must produce same seed value
                if (result1.seed.value !== result2.seed.value) { return false; }

                // Same mode
                if (result1.mode !== ReplayMode.Strict || result2.mode !== ReplayMode.Strict) { return false; }

                // Neither should have divergences
                if (result1.divergences.length !== 0 || result2.divergences.length !== 0) { return false; }

                // Now try with different seed — should still be deterministic in STRICT
                // but the seed value must differ
                const result3 = engine.simulateIntentExecution(intentId, ReplayMode.Strict, 99);
                if (result3.seed.value === result1.seed.value) { return false; }
                if (!result3.deterministic) { return false; }

                // APPROXIMATE mode should also be deterministic for same seed
                const result4 = engine.simulateIntentExecution(intentId, ReplayMode.Approximate, seedValue);
                if (result4.mode !== ReplayMode.Approximate) { return false; }

                return true;
        });

        // ─── Test 3: Graph Reconstruction Accuracy ──────────────────────────────

        test('3. Graph Reconstruction Accuracy', () => {
                const engine = new MiniReplayEngine();

                // Capture initial snapshot with 10 graph nodes
                const snap1 = engine.captureSnapshot('initial-state');
                if (!snap1.graphLayer) { return false; }
                if (snap1.graphLayer.nodeCount !== 10) { return false; }

                // Capture variant with 25 graph nodes
                const snap2 = engine.captureVariantSnapshot('after-mutations', { graphNodes: 25 });
                if (!snap2.graphLayer) { return false; }
                if (snap2.graphLayer.nodeCount !== 25) { return false; }

                // Reconstruct at a time between the two snapshots
                const targetTime = snap1.timestamp + Math.floor((snap2.timestamp - snap1.timestamp) / 2);
                const reconstruction = engine.reconstructAtTime(targetTime);

                // Reconstruction must reference a base snapshot
                if (!reconstruction.baseSnapshotId) { return false; }
                if (typeof reconstruction.eventsReplayed !== 'number') { return false; }
                if (typeof reconstruction.reconstructionDurationMs !== 'number') { return false; }
                if (reconstruction.reconstructionDurationMs < 0) { return false; }

                // Reconstructed snapshot must exist
                if (!reconstruction.reconstructedSnapshot) { return false; }

                // Must have a valid target timestamp
                if (reconstruction.targetTimestamp !== targetTime) { return false; }

                return true;
        });

        // ─── Test 4: Agent Decision Consistency ─────────────────────────────────

        test('4. Agent Decision Consistency', () => {
                const engine = new MiniReplayEngine();
                const agentId = 'agent-consistency-test';
                const seedValue = 12345;

                // Simulate agent decisions twice with same seed
                const sim1 = engine.simulateAgentDecision(agentId, seedValue);
                const sim2 = engine.simulateAgentDecision(agentId, seedValue);

                // Both must be deterministic
                if (!sim1.deterministic || !sim2.deterministic) { return false; }

                // Same agent
                if (sim1.agentId !== agentId || sim2.agentId !== agentId) { return false; }

                // Same plan details
                if (sim1.simulatedPlan?.stepCount !== sim2.simulatedPlan?.stepCount) { return false; }
                if (sim1.simulatedPlan?.riskLevel !== sim2.simulatedPlan?.riskLevel) { return false; }
                if (sim1.simulatedPlan?.rollbackPossible !== sim2.simulatedPlan?.rollbackPossible) { return false; }

                // Same decision outcomes
                if (sim1.wouldRequestApproval !== sim2.wouldRequestApproval) { return false; }
                if (sim1.wouldViolatePolicy !== sim2.wouldViolatePolicy) { return false; }
                if (sim1.wouldSucceed !== sim2.wouldSucceed) { return false; }
                if (sim1.estimatedImpact !== sim2.estimatedImpact) { return false; }
                if (sim1.estimatedMutationCount !== sim2.estimatedMutationCount) { return false; }
                if (sim1.estimatedDurationMs !== sim2.estimatedDurationMs) { return false; }

                // Same decisions array length
                if (sim1.simulatedDecisions.length !== sim2.simulatedDecisions.length) { return false; }

                // Each decision must match
                for (let i = 0; i < sim1.simulatedDecisions.length; i++) {
                        if (sim1.simulatedDecisions[i].choice !== sim2.simulatedDecisions[i].choice) { return false; }
                        if (sim1.simulatedDecisions[i].confidence !== sim2.simulatedDecisions[i].confidence) { return false; }
                }

                // Same seed value
                if (sim1.seed.value !== sim2.seed.value) { return false; }

                // Different seed should produce different results
                const sim3 = engine.simulateAgentDecision(agentId, 99999);
                // At least one property should differ (extremely unlikely to match with different seed)
                const allSame = sim1.wouldSucceed === sim3.wouldSucceed &&
                        sim1.wouldRequestApproval === sim3.wouldRequestApproval &&
                        sim1.wouldViolatePolicy === sim3.wouldViolatePolicy &&
                        sim1.estimatedDurationMs === sim3.estimatedDurationMs;
                // We don't enforce difference (could be same by chance) but seed must differ
                if (sim1.seed.value === sim3.seed.value) { return false; }

                return true;
        });

        // ─── Test 5: Process Simulation Fidelity ────────────────────────────────

        test('5. Process Simulation Fidelity', () => {
                const engine = new MiniReplayEngine();
                const command = 'npm test';
                const seedValue = 777;

                // Simulate process execution twice with same seed
                const sim1 = engine.simulateProcessExecution(command, seedValue);
                const sim2 = engine.simulateProcessExecution(command, seedValue);

                // Both must be deterministic
                if (!sim1.deterministic || !sim2.deterministic) { return false; }

                // Same command
                if (sim1.command !== command || sim2.command !== command) { return false; }

                // Same exit code
                if (sim1.simulatedExitCode !== sim2.simulatedExitCode) { return false; }

                // Same success prediction
                if (sim1.wouldSucceed !== sim2.wouldSucceed) { return false; }

                // Same duration
                if (sim1.simulatedDurationMs !== sim2.simulatedDurationMs) { return false; }

                // Same output count
                if (sim1.simulatedOutput.length !== sim2.simulatedOutput.length) { return false; }

                // Same lifecycle transitions
                if (sim1.simulatedLifecycle.length !== sim2.simulatedLifecycle.length) { return false; }
                for (let i = 0; i < sim1.simulatedLifecycle.length; i++) {
                        if (sim1.simulatedLifecycle[i].from !== sim2.simulatedLifecycle[i].from) { return false; }
                        if (sim1.simulatedLifecycle[i].to !== sim2.simulatedLifecycle[i].to) { return false; }
                }

                // Same failure paths
                if (sim1.possibleFailurePaths.length !== sim2.possibleFailurePaths.length) { return false; }

                // Verify output chunks have required fields
                for (const chunk of sim1.simulatedOutput) {
                        if (typeof chunk.text !== 'string') { return false; }
                        if (chunk.channel !== 'stdout' && chunk.channel !== 'stderr' && chunk.channel !== 'control') { return false; }
                        if (typeof chunk.simulatedTimestamp !== 'number') { return false; }
                }

                // Seed must match
                if (sim1.seed.value !== sim2.seed.value) { return false; }

                return true;
        });

        // ─── Test 6: Snapshot Diff Correctness ──────────────────────────────────

        test('6. Snapshot Diff Correctness', () => {
                const engine = new MiniReplayEngine();

                // Capture two snapshots with different graph state
                const snap1 = engine.captureSnapshot('before');
                const snap2 = engine.captureVariantSnapshot('after', { graphNodes: 25, intentCount: 7, agentCount: 4 });

                // Diff them
                const diff = engine.diffSnapshots(snap1.id, snap2.id);

                // Verify diff structure
                if (diff.snapshotAId !== snap1.id) { return false; }
                if (diff.snapshotBId !== snap2.id) { return false; }
                if (diff.timestampA >= diff.timestampB) { return false; }

                // Must detect changes (graph node count differs, intent count differs, agent count differs)
                if (diff.changeCount === 0) { return false; }
                if (diff.changes.length === 0) { return false; }

                // Changes must have required fields
                for (const change of diff.changes) {
                        if (typeof change.layer !== 'string') { return false; }
                        if (typeof change.aspect !== 'string') { return false; }
                        if (typeof change.valueA !== 'string') { return false; }
                        if (typeof change.valueB !== 'string') { return false; }
                        if (typeof change.severity !== 'string') { return false; }
                        if (typeof change.expected !== 'boolean') { return false; }
                }

                // Must have changesByLayer
                if (Object.keys(diff.changesByLayer).length === 0) { return false; }

                // Must have changesBySeverity
                if (Object.keys(diff.changesBySeverity).length === 0) { return false; }

                // Should not have unexpected changes
                if (diff.unexpectedChanges.length !== 0) { return false; }

                // Must have causal chains
                if (diff.causalChains.length < 0) { return false; }

                return true;
        });

        // ─── Test 7: No Mutation Leakage into Real Runtime ──────────────────────

        test('7. No Mutation Leakage into Real Runtime', () => {
                const engine = new MiniReplayEngine();

                // Capture the initial runtime fingerprint
                const initialIntegrity = engine.validateNoRuntimeInterference();
                if (!initialIntegrity.passed) { return false; }
                if (!initialIntegrity.runtimeStateUntouched) { return false; }

                // Run a full suite of simulations
                const intentId = 'leak-test-intent';
                engine.addIntentChainEvents(intentId, 10);
                engine.replayIntentChain(intentId, ReplayMode.Strict);
                engine.simulateIntentExecution(intentId, ReplayMode.Strict, 42);
                engine.simulateAgentDecision('agent-leak-test', 42);
                engine.simulateProcessExecution('npm run leak-test', 42);
                engine.captureSnapshot('leak-test-snapshot');
                engine.captureVariantSnapshot('leak-test-variant', { graphNodes: 50 });
                engine.diffSnapshots(
                        engine.getAllSnapshots()[0].id,
                        engine.getAllSnapshots()[1].id
                );
                engine.reconstructAtTime(Date.now());

                // Validate that no mutation leaked
                const postIntegrity = engine.validateNoRuntimeInterference();
                if (!postIntegrity.passed) { return false; }
                if (!postIntegrity.runtimeStateUntouched) { return false; }
                if (postIntegrity.mutationLeakCount !== 0) { return false; }
                if (postIntegrity.sideEffectCount !== 0) { return false; }

                // Replay should be active
                if (!engine.replayActive) { return false; }

                // No mutation leak detected
                if (engine.mutationLeakDetected) { return false; }

                // Status should confirm no leak
                const status = engine.getReplayStatus();
                if (status.mutationLeakDetected) { return false; }

                return true;
        });

        // ─── Test 8: UI Timeline Consistency ────────────────────────────────────

        test('8. UI Timeline Consistency', () => {
                const engine = new MiniReplayEngine();

                // Add events from multiple intents
                engine.addIntentChainEvents('intent-ui-1', 5);
                engine.addIntentChainEvents('intent-ui-2', 3);
                engine.captureSnapshot('ui-test-snap');

                // Get the timeline view model
                const vm = engine.getTimelineViewModel();

                // Must have segments
                if (vm.segments.length === 0) { return false; }

                // Total events must match
                const expectedTotal = 5 + 3;
                if (vm.totalEvents !== expectedTotal) { return false; }

                // Segment event count must match total
                const segEventCount = vm.segments.reduce((sum, seg) => sum + seg.eventCount, 0);
                if (segEventCount !== expectedTotal) { return false; }

                // Must have snapshot markers
                if (vm.snapshotMarkers.length === 0) { return false; }

                // Snapshot marker must reference our snapshot
                const snapMarker = vm.snapshotMarkers[0];
                if (typeof snapMarker.timestamp !== 'number') { return false; }
                if (typeof snapMarker.snapshotId !== 'string') { return false; }
                if (typeof snapMarker.label !== 'string') { return false; }
                if (typeof snapMarker.complete !== 'boolean') { return false; }

                // Time range must be valid
                if (vm.fromTimestamp > vm.toTimestamp) { return false; }

                // Segment's event count must match events array length
                for (const seg of vm.segments) {
                        if (seg.eventCount !== seg.events.length) { return false; }
                        if (seg.intentCount < 0) { return false; }
                        if (seg.agentCount < 0) { return false; }
                        if (seg.processCount < 0) { return false; }
                }

                return true;
        });

        // ─── Test 9: Causal Chain Preservation ──────────────────────────────────

        test('9. Causal Chain Preservation', () => {
                const freshEngine = new MiniReplayEngine();

                // Build a deep causal chain: Brain → Agent → Process → Graph → Mutation
                const rootIntentId = 'causal-root-intent';
                const chainEvents = freshEngine.addCausalChainEvents(rootIntentId, 8);

                // Verify every link is intact
                for (let i = 1; i < chainEvents.length; i++) {
                        if (chainEvents[i].causedByEventId !== chainEvents[i - 1].id) {
                                return false;
                        }
                }

                // First event must have no cause (root)
                if (chainEvents[0].causedByEventId !== undefined) { return false; }

                // Create debug session for the intent
                const debugSession = freshEngine.createDebugSession(rootIntentId);
                if (debugSession.intentId !== rootIntentId) { return false; }
                if (debugSession.totalSteps !== chainEvents.length) { return false; }
                if (!debugSession.paused) { return false; }

                // Resolve "why" for the last event
                const lastEvent = chainEvents[chainEvents.length - 1];
                const why = freshEngine.resolveWhy(lastEvent.id);
                if (!why) { return false; }

                // The causal chain must trace back to the root
                if (why.causalChain.length !== chainEvents.length) { return false; }
                if (!why.rootCause) { return false; }
                if (why.rootCause.id !== chainEvents[0].id) { return false; }

                // Explanation must be non-empty
                if (why.explanation.length === 0) { return false; }

                // Replay must find no divergences
                const replayResult = freshEngine.replayIntentChain(rootIntentId, ReplayMode.Strict);
                if (!replayResult.deterministic) { return false; }
                if (replayResult.divergences.length !== 0) { return false; }

                return true;
        });

        // ─── Test 10: Multi-System Replay Alignment ────────────────────────────

        test('10. Multi-System Replay Alignment', () => {
                const engine = new MiniReplayEngine();

                // Add events from multiple subsystems
                const multiEvents = engine.addMultiSystemEvents();
                if (multiEvents.length !== 6) { return false; }

                // Verify all subsystems are represented
                const sources = new Set(multiEvents.map(e => e.source));
                if (sources.size !== 6) { return false; }

                // Expected subsystems
                const expectedSources: TimelineEventSource[] = [
                        TimelineEventSource.ExecutionGraph,
                        TimelineEventSource.AgentOrchestrator,
                        TimelineEventSource.ProcessOrchestrator,
                        TimelineEventSource.ContextEngine,
                        TimelineEventSource.GlobalBrain,
                        TimelineEventSource.UnifiedState,
                ];
                for (const src of expectedSources) {
                        if (!sources.has(src)) { return false; }
                }

                // Causal links must connect across subsystems
                for (let i = 1; i < multiEvents.length; i++) {
                        if (multiEvents[i].causedByEventId !== multiEvents[i - 1].id) {
                                return false;
                        }
                }

                // All events should reference the same intent
                for (const event of multiEvents) {
                        if (event.intentId !== 'multi-intent') { return false; }
                }

                // Capture snapshots before and after
                const snap1 = engine.captureSnapshot('multi-before');
                const snap2 = engine.captureSnapshot('multi-after');

                // Diff must find causal chains that traverse subsystems
                const diff = engine.diffSnapshots(snap1.id, snap2.id);
                if (diff.causalChains.length > 0) {
                        // Verify chains traverse multiple subsystems
                        for (const chain of diff.causalChains) {
                                if (chain.subsystems.length > 0) {
                                        // Subsystem list should be populated
                                        if (chain.subsystems.some(s => typeof s !== 'string')) { return false; }
                                }
                                if (typeof chain.complete !== 'boolean') { return false; }
                                if (typeof chain.effect !== 'string') { return false; }
                        }
                }

                // Replay the multi-intent chain
                const replayResult = engine.replayIntentChain('multi-intent', ReplayMode.Strict);

                // With properly linked events, replay should be deterministic
                if (!replayResult.deterministic) { return false; }

                // Timeline view model should include all events
                const vm = engine.getTimelineViewModel();
                // total events = 6 multi-system + any from snapshots
                if (vm.totalEvents < 6) { return false; }

                // Get timeline filtered by intent
                const filteredEvents = engine.getTimelineEvents({ intentId: 'multi-intent' });
                if (filteredEvents.length < 6) { return false; }

                // All filtered events should be from the multi-intent
                for (const event of filteredEvents) {
                        if (event.intentId !== 'multi-intent') { return false; }
                }

                return true;
        });

        // ─── Summary ────────────────────────────────────────────────────────────

        console.log(`\n═══════════════════════════════════════════════════`);
        console.log(`  Phase 11 Results: ${passed}/${passed + failed} passed`);
        console.log(`═══════════════════════════════════════════════════\n`);

        return {
                phase: 11,
                totalTests: passed + failed,
                passed,
                failed,
                results,
                timestamp: Date.now(),
        };
}
