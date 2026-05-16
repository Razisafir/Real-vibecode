# Phase 11 — Execution Replay Engine (Execution Log)

## Phase Overview

Phase 11 introduces the Execution Replay Engine — a read-only deterministic mirror of the entire Real Vibecode system. This is the system's time machine: every intent chain, every mutation, every decision can be replayed, simulated, reconstructed, and debugged at any point in history, without any side effects on the live runtime.

## Implementation Date

2026-05-23

## Tasks Completed

### Task 1: Execution Replay Engine Core

The foundational replay capability that allows replaying any intent chain or graph timeline.

- Implemented `replayIntentChain(intentId, mode)` — replays the full event chain produced by an intent and all its children, returning `IDeterministicReplayResult`
- Implemented `replayGraphTimeline(fromTimestamp, toTimestamp, mode)` — replays the execution graph timeline for a given time range
- Implemented `simulateIntentExecution(intent, mode)` — simulates what would happen if an intent were executed without actually executing it
- All replay operations are non-blocking — they read historical data without pausing the live system
- Replay results include mode, seed, divergences, and duration metrics
- ~180 lines of interface/type definitions, ~320 lines of implementation

### Task 2: System Snapshot Model

Point-in-time immutable snapshots of the entire system across 6 layers.

- Defined `SnapshotLayer` enum with 6 values: Graph, Context, Agent, Process, Intent, Brain
- Implemented `ISystemSnapshot` with 6 layer fields, runtime phase, stability state, completeness flag, replay seed, and capture duration
- Implemented 6 layer interfaces:
  - `IGraphSnapshotLayer` — 7 fields (nodeCount, edgeCount, scopeCount, nodesByType, recentNodeIds, pendingNodeIds, rollbackCapableNodeIds)
  - `IContextSnapshotLayer` — 6 fields (totalEntries, entriesByDomain, freshnessDistribution, symbolCount, dependencyEdgeCount, hotspotCount)
  - `IAgentSnapshotLayer` — 6 fields (activeAgentCount, agentsByState, activePlanCount, pendingApprovalCount, activeAgentIds, capabilityUsage)
  - `IProcessSnapshotLayer` — 6 fields (activeSessionCount, sessionsByMode, sessionsByState, activeSessionIds, totalOutputChunks, supervisedCount)
  - `IIntentSnapshotLayer` — 6 fields (activeIntentCount, intentsByResolution, intentsBySource, intentsByActionType, activeIntentIds, maxChainDepth)
  - `IBrainSnapshotLayer` — 8 fields (loopPhase, healthStatus, activeDecisionCount, activeConflictCount, currentCheckpointId, backpressureLevel, eventBusThroughput, tickNumber)
- Implemented `captureSnapshot()` with deep freezing (Object.freeze)
- Implemented snapshot query APIs: `getSnapshot()`, `getAllSnapshots()`, `getSnapshotsInRange()`, `getNearestSnapshot()`
- Implemented auto-capture: `startAutoCapture()`, `stopAutoCapture()`
- Implemented `onDidCaptureSnapshot` event
- ~140 lines of interface/type definitions, ~260 lines of implementation

### Task 3: Event Timeline Engine

A unified timeline that normalizes events from all 8 source subsystems.

- Defined `TimelineEventSource` enum with 8 values: ExecutionGraph, ExecutionService, AgentOrchestrator, ProcessOrchestrator, ContextEngine, GlobalBrain, UnifiedState, Stabilization
- Defined `TimelineEventCategory` enum with 10 values: Mutation, AgentLifecycle, ProcessLifecycle, ContextUpdate, GraphChange, Decision, Conflict, StateTransition, HealthStability, IntentLifecycle
- Implemented `IExecutionTimelineEvent` with 13 fields including causal link (`causedByEventId`), cross-subsystem associations (intentId, agentId, processSessionId, graphNodeId), side-effect flag, and nearest snapshot reference
- Implemented `ITimelineSegment` with aggregated stats (eventCount, intentCount, agentCount, processCount, snapshotIds)
- Implemented `ITimelineFilter` with 9 filter dimensions (sources, categories, intentId, agentId, processSessionId, fromTimestamp, toTimestamp, hasSideEffects, limit)
- Implemented event normalization pipeline: Extraction → Enrichment → Causal Linking → Storage
- Implemented causal linking algorithm with 7 priority-ordered rules
- Implemented `getTimelineEvents()`, `getTimelineSegment()`, `getIntentTimeline()`, `getCausalChainEvents()`
- Implemented `onDidRecordTimelineEvent` event
- ~120 lines of interface/type definitions, ~240 lines of implementation

### Task 4: Deterministic Replay Mode

Two modes controlling how strictly replay adheres to determinism.

- Defined `ReplayMode` enum: Strict, Approximate
- Implemented `IReplaySeed` with id, value, snapshotId, createdAt, description
- Implemented `IDeterministicReplayResult` with deterministic flag, mode, seed, divergences, duration
- Implemented `IReplayDivergence` with aspect, expected, actual, replayTimestamp, causalChain, severity
- Implemented xorshift32 PRNG for seed generation and deterministic random choices
- Implemented `createReplaySeed()`, `verifyDeterminism()`, `setReplayMode()`, `getReplayDivergences()`
- Implemented divergence detection algorithm with severity classification (minor/major/critical)
- ~70 lines of interface/type definitions, ~180 lines of implementation

### Task 5: Simulated Agent Engine

Agent decision simulation without any real execution.

- Implemented `IAgentSimulationResult` with 11 fields including simulatedPlan, simulatedDecisions, wouldRequestApproval, wouldViolatePolicy, wouldSucceed, estimatedDurationMs, estimatedMutationCount, estimatedImpact, deterministic, seed
- Implemented `ISimulatedPlan` with 6 fields (stepCount, stepDescriptions, affectedFiles, requiredCapabilities, riskLevel, rollbackPossible)
- Implemented `ISimulatedDecision` with 5 fields (decisionPoint, choice, reasoning, confidence, alternatives)
- Implemented `simulateAgentDecision()`, `reEvaluatePlan()`, `reApplyPolicy()`
- All simulation runs in a sandboxed context with seeded PRNG
- ~60 lines of interface/type definitions, ~160 lines of implementation

### Task 6: Process Simulation Layer

Process execution/lifecycle simulation without spawning real processes.

- Implemented `IProcessSimulationResult` with 11 fields including simulatedExitCode, simulatedOutput, simulatedLifecycle, wouldSucceed, simulatedDurationMs, possibleFailurePaths, wouldTriggerRestart, deterministic, seed
- Implemented `ISimulatedOutputChunk` with text, channel (stdout/stderr/control), simulatedTimestamp, classification
- Implemented `ISimulatedLifecycleTransition` with from, to, simulatedTimestamp, reason
- Implemented `ISimulatedFailurePath` with description, exitCode, output, handledByRestartPolicy, probability
- Implemented `simulateProcessExecution()`, `simulateProcessLifecycle()`, `simulateProcessFailures()`, `simulateProcessRestart()`
- ~80 lines of interface/type definitions, ~200 lines of implementation

### Task 7: State Reconstruction Engine

Reconstruct the full system state at any arbitrary point in time.

- Implemented `IStateReconstructionResult` with 8 fields: targetTimestamp, baseSnapshotId, replayedEvents, reconstructedSnapshot, exact, eventsReplayed, reconstructionDurationMs, complete
- Implemented `IReconstructionGap` with layer, description, fromTimestamp, toTimestamp, approximable
- Implemented `reconstructAtTime()` — full system reconstruction at time T
- Implemented `reconstructSubsystem()` — single-layer reconstruction at time T
- Implemented `fullRewind()` — reconstruct from the beginning to time T
- Implemented `partialRewind()` — rewind only a specific subsystem
- Reconstruction uses the nearest prior snapshot as a base and replays events forward
- ~40 lines of interface/type definitions, ~140 lines of implementation

### Task 8: Differential Analysis Engine

Snapshot comparison with causal chain explanation.

- Implemented `ISnapshotDiff` with 11 fields: snapshotAId, snapshotBId, timestampA, timestampB, changes, changeCount, changesByLayer, changesBySeverity, causalChains, changesExpected, unexpectedChanges
- Implemented `ISnapshotChange` with 10 fields: layer, aspect, valueA, valueB, isAddition, isRemoval, causingIntentId, causingEventId, severity, expected
- Implemented `ICausalChain` with 7 fields: id, rootCause, chain, intentIds, subsystems, effect, complete
- Implemented `diffSnapshots()`, `diffWithCurrent()`, `explainChange()`, `traceMutationSource()`
- Layer-specific diffing algorithms with severity thresholds
- Expectedness classification based on intent traceability
- ~80 lines of interface/type definitions, ~200 lines of implementation

### Task 9: Execution Debug Protocol

Step-by-step debugging with causal tracing and "why" resolution.

- Implemented `IDebugSession` with 10 fields: id, intentId, fromTimestamp, toTimestamp, currentTimestamp, currentStep, totalSteps, paused, events, currentCausalTrace, snapshotIds
- Implemented `ICausalTrace` with 7 fields: id, rootIntent, agentDecisions, processExecutions, graphMutations, fileMutations, eventChain, explanation
- Implemented `IWhyResolution` with 9 fields: targetEvent, rootCause, causalChain, explanation, initiatingIntent, executingAgentId, executingProcessId, expectedOutcome, alternativeOutcomes
- Implemented `createDebugSession()`, `createDebugSessionForRange()`, `getDebugSession()`, `debugStepForward()`, `debugStepBackward()`, `getCausalTrace()`, `resolveWhy()`, `closeDebugSession()`
- Debug sessions are fully isolated from the live runtime
- ~50 lines of interface/type definitions, ~180 lines of implementation

### Task 10: Replay UI Layer

View models for the replay visualization components.

- Implemented `IExecutionTimelineViewModel` with segments, totalEvents, time range, snapshot markers, intent markers
- Implemented `ISnapshotMarker` with timestamp, snapshotId, label, complete
- Implemented `IIntentMarker` with timestamp, intentId, actionType, resolution, source
- Implemented `IReplayControllerViewModel` with currentPosition, playing, speed, mode, totalDuration, currentStep, totalSteps, snapshotCount, debugSessionId
- Implemented `ISnapshotInspectorViewModel` with snapshot, layerSummaries, hasPreviousDiff, hasNextDiff
- Implemented `ICausalTraceViewModel` with trace and steps
- Implemented `ICausalTraceStep` with stepIndex, event, subsystem, description, connectedToNext, connectionType (caused/triggered/parent/derived)
- Implemented `IDiffViewerViewModel` with snapshotAId, snapshotBId, diff, layerTabs
- Implemented `getTimelineViewModel()`, `getReplayControllerViewModel()`, `getSnapshotInspectorViewModel()`, `getCausalTraceViewModel()`, `getDiffViewerViewModel()`
- ~100 lines of interface/type definitions, ~180 lines of implementation

## Files Created/Modified

| File | Lines | Purpose |
|------|-------|---------|
| `common/replayEngine.ts` | ~1225 | All interfaces, types, enums for Tasks 1-10 |
| `browser/executionReplayService.ts` | ~2060 | Full runtime implementation |
| `browser/phase11Validation.ts` | ~340 | 10 validation tests |
| `browser/aiExecution.contribution.ts` | modified | Added Phase 11 service registration |

## Lines of Code Summary

| Component | Lines |
|-----------|-------|
| Interfaces & Types (`replayEngine.ts`) | 1225 |
| Implementation (`executionReplayService.ts`) | 2060 |
| Validation (`phase11Validation.ts`) | 340 |
| Service registration (contribution) | ~20 |
| **Total** | **~3645** |

## Integration Points

### With Phase 3: Execution Graph Service
- Reads graph nodes, edges, and scopes for the `IGraphSnapshotLayer`
- Subscribes to graph change events for timeline normalization
- Graph mutations are tracked as `TimelineEventSource.ExecutionGraph` events

### With Phase 4: AI Execution Service
- Reads mutation records and policy decisions for timeline events
- Mutation events are categorized as `TimelineEventCategory.Mutation`
- Policy replay uses the execution service's policy configuration

### With Phase 7: Agent Orchestrator Service
- Reads agent states, plans, and capabilities for the `IAgentSnapshotLayer`
- Agent lifecycle events feed into `TimelineEventCategory.AgentLifecycle`
- Agent simulation uses the orchestrator's decision model (read-only)

### With Phase 8: Process Orchestrator Service
- Reads process sessions and outputs for the `IProcessSnapshotLayer`
- Process lifecycle events feed into `TimelineEventCategory.ProcessLifecycle`
- Process simulation uses the orchestrator's lifecycle model (read-only)

### With Phase 6: AI Context Service
- Reads context entries, domains, and freshness for the `IContextSnapshotLayer`
- Context update events feed into `TimelineEventCategory.ContextUpdate`

### With Phase 9: Global Execution Brain
- Reads intents, decisions, conflicts, and health for `IIntentSnapshotLayer` and `IBrainSnapshotLayer`
- Intent lifecycle events feed into `TimelineEventCategory.IntentLifecycle`
- Decision events feed into `TimelineEventCategory.Decision`
- Conflict events feed into `TimelineEventCategory.Conflict`
- Intent chain traversal enables causal linking across the full execution path

### With Phase 10: System Stabilization Service
- Reads stability state, load metrics, and backpressure for `IBrainSnapshotLayer`
- Health/stability events feed into `TimelineEventCategory.HealthStability`
- `SystemStabilityState` and `BackpressureLevel` are captured in snapshots

### With Unified State Service
- Reads state transitions for timeline normalization
- `AIRuntimePhase` is captured in each snapshot
- State transition events feed into `TimelineEventCategory.StateTransition`

### With Observability Service
- Reads trace logs for causal chain construction
- Observability data enriches timeline events with additional context
- Replay engine does NOT write to the observability log (prevents recursive observation)

## Service Registration

| # | Service | Dependencies | Phase |
|---|---------|-------------|-------|
| 17 | IExecutionReplayService | ExecutionGraph, AIExecution, AgentOrchestrator, ProcessOrchestrator, Context, GlobalBrain, UnifiedState, Observability, Stabilization | 11 |

## Test Results

10/10 tests validate:
1. Snapshot capture and immutability
2. Snapshot range queries and nearest-neighbor lookup
3. Auto-capture mechanism starts and stops correctly
4. Timeline event recording and filtering
5. Causal chain construction and traversal
6. Deterministic replay produces identical results with same seed
7. Agent simulation runs without real execution
8. Process simulation produces stubbed output
9. State reconstruction from snapshots and events
10. Debug session step-by-step replay with "why" resolution

## Implementation Details

### Read-Only Enforcement Architecture

The replay engine enforces its read-only constraint at three levels:

1. **TypeScript type system** — All service access is through read-only interfaces; no mutation methods are called
2. **Runtime guard** — A `MutationGuard` wrapper intercepts any attempt to call mutation APIs on injected services and throws immediately
3. **Integrity verification** — `validateNoRuntimeInterference()` runs after every replay operation, comparing the pre-replay and post-replay states of all 9 dependent services

The `IReplayIntegrityCheck` interface provides the verification result:

```typescript
interface IReplayIntegrityCheck {
    readonly passed: boolean;
    readonly mutationLeakCount: number;
    readonly sideEffectCount: number;
    readonly runtimeStateUntouched: boolean;
    readonly checkedAt: number;
    readonly details: readonly string[];
}
```

### Snapshot Deep Freeze Implementation

The `captureSnapshot()` method applies deep freezing to ensure immutability:

```typescript
private deepFreeze<T>(obj: T): T {
    if (obj === null || typeof obj !== 'object') {
        return obj;
    }
    Object.freeze(obj);
    for (const key of Object.keys(obj)) {
        const value = (obj as any)[key];
        if (typeof value === 'object' && value !== null && !Object.isFrozen(value)) {
            this.deepFreeze(value);
        }
    }
    return obj;
}
```

This is called on every layer object and the top-level snapshot after all data is gathered but before the `onDidCaptureSnapshot` event is fired.

### Event Normalization Pipeline Implementation

The timeline engine implements a 4-stage normalization pipeline:

1. **Extraction Stage** — Each source subsystem's listener captures raw events and converts them to `IExecutionTimelineEvent` format. The `source` and `category` fields are set based on which listener produced the event.

2. **Enrichment Stage** — The event is enriched with cross-subsystem associations:
   - If the source event carries an intent ID, it is looked up in the brain service
   - If the source event carries an agent ID, the agent's current state is queried
   - If the source event carries a process session ID, the session's state is queried
   - The nearest snapshot to the event's timestamp is found and recorded

3. **Causal Linking Stage** — The `causedByEventId` is determined by the priority-ordered rules:
   - Explicit link (source event names a parent)
   - Intent chain (parent intent's most recent event)
   - Agent execution chain (same agent, most recent prior event)
   - Process execution chain (same session, most recent prior event)
   - Graph execution chain (same node, most recent event)
   - Temporal proximity (same source, within 100ms)
   - No link (root event)

4. **Storage Stage** — The event is appended to the timeline store and all indices are updated.

### xorshift32 PRNG Implementation

The deterministic replay uses xorshift32 for all seeded randomness:

```typescript
class XorShift32 {
    private state: number;

    constructor(seed: number) {
        this.state = seed === 0 ? 1 : seed;
    }

    next(): number {
        let x = this.state;
        x ^= x << 13;
        x ^= x >> 17;
        x ^= x << 5;
        this.state = x;
        return x >>> 0;
    }

    nextFloat(): number {
        return this.next() / 0x100000000;
    }

    nextInt(min: number, max: number): number {
        return min + (this.next() % (max - min + 1));
    }

    pick<T>(arr: readonly T[]): T {
        return arr[this.nextInt(0, arr.length - 1)];
    }
}
```

Each replay operation creates sub-PRNGs from the master seed:

```
master = XorShift32(seed.value)
agentPRNG = XorShift32(master.next())
processPRNG = XorShift32(master.next())
policyPRNG = XorShift32(master.next())
graphPRNG = XorShift32(master.next())
```

### Snapshot Pruning Implementation

The snapshot store implements age-based and count-based pruning:

```typescript
private pruneSnapshots(): void {
    const maxSnapshots = this.productionMode ? 100 : 500;
    const maxAge = this.productionMode ? 30 * 60 * 1000 : 60 * 60 * 1000;

    // Remove prunable snapshots (not referenced, older than maxAge)
    const prunable = this.snapshots
        .filter(s => !this.references.has(s.id))
        .filter(s => Date.now() - s.timestamp > maxAge)
        .sort((a, b) => a.timestamp - b.timestamp);

    while (this.snapshots.size > maxSnapshots && prunable.length > 0) {
        const toRemove = prunable.shift()!;
        this.snapshots.delete(toRemove.id);
        this.index.remove(toRemove);
    }
}
```

### Reconstruction Algorithm Implementation

The `reconstructAtTime()` method:

1. Find the nearest snapshot before the target timestamp (binary search)
2. Load the base snapshot
3. Find all events between the base snapshot and the target timestamp
4. Apply each event to the base snapshot's layers:
   - Graph events: add/remove nodes and edges
   - Context events: add/update/remove entries
   - Agent events: update agent states
   - Process events: update session states
   - Intent events: update intent resolution and chain state
   - Brain events: update decisions, conflicts, and health
5. Build the reconstructed `ISystemSnapshot`
6. Check for gaps (layers with insufficient data)
7. Return `IStateReconstructionResult`

### Diffing Algorithm Implementation

The `diffSnapshots()` method:

1. For each layer present in both snapshots, compare all fields
2. For scalar fields: compare directly, produce a change if different
3. For record fields: compare per-key, produce a change for each key difference
4. For array fields: compute set differences
5. Classify each change by severity using layer-specific thresholds
6. Trace each change to a causing intent/event using the timeline
7. Classify changes as expected or unexpected based on intent coverage
8. Build causal chains for groups of related changes
9. Return `ISnapshotDiff`

### Debug Session Implementation

The debug protocol maintains step-by-step state:

```typescript
interface DebugSessionState {
    id: string;
    intentId: string | undefined;
    fromTimestamp: number;
    toTimestamp: number;
    events: IExecutionTimelineEvent[];
    currentStep: number;
    paused: boolean;
    snapshotIds: string[];
}
```

- `debugStepForward()`: increments `currentStep`, loads the next event, builds causal trace
- `debugStepBackward()`: decrements `currentStep`, loads the previous event
- `getCausalTrace()`: walks the causal graph from the current event back to the root
- `resolveWhy()`: produces `IWhyResolution` with full chain and explanation

## Hard Rules Verification

| Rule | How Verified |
|------|-------------|
| MUST NOT execute real mutations | `MutationGuard` wrapper + post-operation integrity check |
| MUST NOT interfere with runtime | `validateNoRuntimeInterference()` called after each replay |
| ONLY observe, reconstruct, simulate | All APIs are read-only or return simulated results |
| Same snapshot + same intent → same output | `verifyDeterminism()` with xorshift32 PRNG |
| Agents/processes MUST NOT execute real actions | Simulation sandbox with no real I/O |
| Timeline MUST reconstruct full intent chain | Causal linking algorithm with 7 priority rules |
| Causal chain MUST NOT break | Cycle detection in causal graph construction |
| Snapshots MUST be timestamped, immutable, diffable | Deep freeze + Object.freeze on capture |

## Phase Completion Checklist

- [x] Task 1: Execution Replay Engine Core
- [x] Task 2: System Snapshot Model
- [x] Task 3: Event Timeline Engine
- [x] Task 4: Deterministic Replay Mode
- [x] Task 5: Simulated Agent Engine
- [x] Task 6: Process Simulation Layer
- [x] Task 7: State Reconstruction Engine
- [x] Task 8: Differential Analysis Engine
- [x] Task 9: Execution Debug Protocol
- [x] Task 10: Replay UI Layer
- [x] All 10 validation tests passing
- [x] No mutation leaks detected
- [x] No runtime interference
- [x] Service registered in contribution
- [x] Documentation complete
