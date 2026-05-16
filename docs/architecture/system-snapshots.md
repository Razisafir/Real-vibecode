# System Snapshots — Architecture

## Overview

System Snapshots are the foundational data model for the Execution Replay Engine. A snapshot captures the complete state of all six subsystem layers at a single point in time, providing an immutable, timestamped, and diffable record that enables deterministic replay, state reconstruction, differential analysis, and debugging.

The snapshot model is defined in `ISystemSnapshot` and its six layer interfaces: `IGraphSnapshotLayer`, `IContextSnapshotLayer`, `IAgentSnapshotLayer`, `IProcessSnapshotLayer`, `IIntentSnapshotLayer`, and `IBrainSnapshotLayer`.

## Core Properties

Every snapshot possesses three fundamental properties:

1. **Timestamped** — Each snapshot records the exact moment it was captured (`timestamp: number`, milliseconds since epoch)
2. **Immutable** — Once created, no field of a snapshot may be modified. All properties are `readonly`. The implementation applies `Object.freeze()` deeply on the captured data.
3. **Diffable** — Any two snapshots can be compared to produce an `ISnapshotDiff`, which enumerates all changes across all layers, classified by severity and traced to causal events.

## Snapshot Model Design

### ISystemSnapshot

The top-level snapshot interface:

```typescript
interface ISystemSnapshot {
    readonly id: string;                           // Unique snapshot ID (UUID)
    readonly timestamp: number;                    // When captured (ms since epoch)
    readonly label: string;                        // Human-readable label
    readonly layers: readonly SnapshotLayer[];     // Which layers are included
    readonly graphLayer: IGraphSnapshotLayer | undefined;
    readonly contextLayer: IContextSnapshotLayer | undefined;
    readonly agentLayer: IAgentSnapshotLayer | undefined;
    readonly processLayer: IProcessSnapshotLayer | undefined;
    readonly intentLayer: IIntentSnapshotLayer | undefined;
    readonly brainLayer: IBrainSnapshotLayer | undefined;
    readonly runtimePhase: AIRuntimePhase;         // System phase at capture time
    readonly stabilityState: SystemStabilityState; // Stability at capture time
    readonly complete: boolean;                    // All 6 layers captured?
    readonly replaySeed: IReplaySeed;              // Seed for deterministic replay
    readonly captureDurationMs: number;            // How long capture took
}
```

### Design Decisions

| Decision | Rationale |
|----------|-----------|
| Layer fields are optional (`| undefined`) | Supports partial snapshots for efficiency — capture only the layers you need |
| `complete` flag | Clearly indicates whether all 6 layers are present; partial snapshots have `complete: false` |
| `replaySeed` embedded | The seed is tied to the snapshot; replaying from this snapshot always uses this seed |
| `captureDurationMs` | Performance monitoring — if capture is slow, the interval may need adjustment |
| `runtimePhase` and `stabilityState` | Capture the system's macro-state alongside the micro-state of each layer |

## The Six Snapshot Layers

### Layer 1: Graph (`SnapshotLayer.Graph`)

Captures the state of the Execution Graph — nodes, edges, scopes.

| Field | Type | Purpose |
|-------|------|---------|
| `nodeCount` | `number` | Total number of execution nodes |
| `edgeCount` | `number` | Total number of edges (dependencies) |
| `scopeCount` | `number` | Number of active scopes |
| `nodesByType` | `Readonly<Record<string, number>>` | Distribution of nodes by `ExecutionNodeType` |
| `recentNodeIds` | `readonly string[]` | Last 100 node IDs (for reconstruction targeting) |
| `pendingNodeIds` | `readonly string[]` | Nodes currently in pending state |
| `rollbackCapableNodeIds` | `readonly string[]` | Nodes that can be rolled back |

**Data source**: `IExecutionGraphService` (read-only)

**Capture algorithm**:
1. Query `getAllNodes()` from the graph service
2. Count nodes by type, aggregate into `nodesByType`
3. Extract the last 100 node IDs by creation time
4. Filter nodes with pending state → `pendingNodeIds`
5. Filter nodes with rollback capability → `rollbackCapableNodeIds`
6. Count edges and scopes from the graph structure
7. Freeze all data into an immutable layer object

**Typical capture time**: < 5ms for graphs with < 10,000 nodes

### Layer 2: Context (`SnapshotLayer.Context`)

Captures the state of the AI Context Engine — domains, freshness, symbols, dependencies.

| Field | Type | Purpose |
|-------|------|---------|
| `totalEntries` | `number` | Total context entries across all domains |
| `entriesByDomain` | `Readonly<Record<string, number>>` | Entry count per domain |
| `freshnessDistribution` | `Readonly<Record<string, number>>` | Entries grouped by freshness bucket |
| `symbolCount` | `number` | Number of tracked symbols |
| `dependencyEdgeCount` | `number` | Number of dependency edges |
| `hotspotCount` | `number` | Number of context hotspots |

**Data source**: `IAIContextService` (read-only)

**Capture algorithm**:
1. Query all context entries from the context service
2. Group by domain → `entriesByDomain`
3. Classify freshness (fresh/recent/stale/expired) → `freshnessDistribution`
4. Count symbols, dependency edges, and hotspots from the context graph
5. Freeze into immutable layer

**Typical capture time**: < 3ms for < 5,000 context entries

### Layer 3: Agent (`SnapshotLayer.Agent`)

Captures the state of the Agent Orchestrator — active agents, plans, approvals, capabilities.

| Field | Type | Purpose |
|-------|------|---------|
| `activeAgentCount` | `number` | Number of currently active agents |
| `agentsByState` | `Readonly<Record<string, number>>` | Agents grouped by lifecycle phase |
| `activePlanCount` | `number` | Number of active execution plans |
| `pendingApprovalCount` | `number` | Number of plans awaiting human approval |
| `activeAgentIds` | `readonly string[]` | IDs of all active agents |
| `capabilityUsage` | `Readonly<Record<string, number>>` | Usage count per capability type |

**Data source**: `IAgentOrchestratorService` (read-only)

**Capture algorithm**:
1. Query all agent states from the orchestrator
2. Filter to active agents → `activeAgentIds`
3. Group by lifecycle phase → `agentsByState`
4. Count active plans and pending approvals
5. Aggregate capability usage from agent records
6. Freeze into immutable layer

**Typical capture time**: < 2ms for < 100 active agents

### Layer 4: Process (`SnapshotLayer.Process`)

Captures the state of the Process Orchestrator — sessions, outputs, supervision.

| Field | Type | Purpose |
|-------|------|---------|
| `activeSessionCount` | `number` | Number of active process sessions |
| `sessionsByMode` | `Readonly<Record<string, number>>` | Sessions grouped by execution mode |
| `sessionsByState` | `Readonly<Record<string, number>>` | Sessions grouped by lifecycle state |
| `activeSessionIds` | `readonly string[]` | IDs of all active sessions |
| `totalOutputChunks` | `number` | Total output chunks captured |
| `supervisedCount` | `number` | Number of supervised processes |

**Data source**: `IAIProcessOrchestratorService` (read-only)

**Capture algorithm**:
1. Query all process sessions from the orchestrator
2. Filter to active sessions → `activeSessionIds`
3. Group by execution mode and lifecycle state
4. Sum total output chunks across all sessions
5. Count supervised processes
6. Freeze into immutable layer

**Typical capture time**: < 2ms for < 50 active processes

### Layer 5: Intent (`SnapshotLayer.Intent`)

Captures the state of the Intent system — active intents, resolutions, sources, action types, chains.

| Field | Type | Purpose |
|-------|------|---------|
| `activeIntentCount` | `number` | Number of currently active intents |
| `intentsByResolution` | `Readonly<Record<string, number>>` | Intents grouped by resolution state |
| `intentsBySource` | `Readonly<Record<string, number>>` | Intents grouped by source |
| `intentsByActionType` | `Readonly<Record<string, number>>` | Intents grouped by action type |
| `activeIntentIds` | `readonly string[]` | IDs of all active intents |
| `maxChainDepth` | `number` | Maximum intent chain depth |

**Data source**: `IGlobalExecutionBrainService` (read-only)

**Capture algorithm**:
1. Query all intents from the brain service
2. Filter to active intents → `activeIntentIds`
3. Group by `IntentResolution`, `IntentSource`, `IntentActionType`
4. Calculate maximum chain depth by traversing parent intent links
5. Freeze into immutable layer

**Typical capture time**: < 3ms for < 500 active intents

### Layer 6: Brain (`SnapshotLayer.Brain`)

Captures the state of the Global Execution Brain — loop phase, health, decisions, conflicts, sync, backpressure.

| Field | Type | Purpose |
|-------|------|---------|
| `loopPhase` | `ExecutionLoopPhase` | Current execution loop phase |
| `healthStatus` | `SystemHealthStatus` | Current health status |
| `activeDecisionCount` | `number` | Number of active decisions |
| `activeConflictCount` | `number` | Number of active conflicts |
| `currentCheckpointId` | `string \| undefined` | Current sync checkpoint |
| `backpressureLevel` | `BackpressureLevel` | Current backpressure level |
| `eventBusThroughput` | `number` | Events per second on the bus |
| `tickNumber` | `number` | Current tick number |

**Data source**: `IGlobalExecutionBrainService` and `ISystemStabilizationService` (read-only)

**Capture algorithm**:
1. Query brain status (loop phase, health, decisions, conflicts, checkpoint)
2. Query stabilization status (backpressure, throughput)
3. Combine into a single brain layer
4. Freeze into immutable layer

**Typical capture time**: < 1ms (scalar values, no iteration needed)

## Immutability Guarantees

### Compile-Time Immutability

All interface properties are declared `readonly`. The TypeScript compiler prevents assignment to these properties:

```typescript
const snapshot = replayService.captureSnapshot('test');
snapshot.timestamp = Date.now(); // TypeScript error: Cannot assign to 'timestamp' because it is a read-only property
```

### Runtime Immutability

The implementation goes beyond TypeScript's `readonly` keyword (which is erased at compile time) and applies deep freezing:

1. **Top-level freeze**: `Object.freeze(snapshot)` prevents modification of the snapshot itself
2. **Layer freeze**: Each layer object is frozen individually
3. **Deep freeze**: All nested objects (records, arrays) are recursively frozen
4. **Array freezing**: `Object.freeze(array)` prevents push/pop/splice on arrays

### Immutability Invariants

| Invariant | Enforcement |
|-----------|-------------|
| Snapshot ID never changes | `Object.freeze()` on top-level |
| Timestamp never changes | `Object.freeze()` on top-level |
| Layer data never changes | `Object.freeze()` on each layer |
| Record values never change | Deep `Object.freeze()` on all nested objects |
| Array contents never change | `Object.freeze()` on all arrays |
| New layers cannot be added | `Object.freeze()` prevents property addition |

### Immutability Verification

The `validateNoRuntimeInterference()` method includes an immutability check that verifies:
- No snapshot in the store has been modified since capture
- All layer data remains identical to when it was frozen
- No new properties have been added to any snapshot

## Diffing Algorithm

### Overview

The `diffSnapshots()` method compares two snapshots and produces an `ISnapshotDiff` that enumerates all changes, classified by layer, severity, and expectedness.

### Algorithm Steps

```
diffSnapshots(A, B):
    changes = []
    
    for each layer L in [Graph, Context, Agent, Process, Intent, Brain]:
        if A.L exists and B.L exists:
            changes += diffLayer(A.L, B.L, L)
        else if A.L is undefined and B.L exists:
            changes += [addition of entire layer L]
        else if A.L exists and B.L is undefined:
            changes += [removal of entire layer L]
    
    causalChains = buildCausalChains(changes, timeline)
    expected = checkExpected(changes, intents)
    
    return ISnapshotDiff {
        changes,
        changesByLayer: groupBy(changes, 'layer'),
        changesBySeverity: groupBy(changes, 'severity'),
        causalChains,
        changesExpected: expected.allExpected,
        unexpectedChanges: expected.unexpected
    }
```

### Layer Diffing

Each layer has a dedicated diffing function that compares the relevant fields:

**Graph Layer Diffing**:
| Aspect | Comparison | Severity |
|--------|-----------|----------|
| `nodeCount` | A.nodeCount vs B.nodeCount | `major` if delta > 10% |
| `edgeCount` | A.edgeCount vs B.edgeCount | `major` if delta > 10% |
| `scopeCount` | A.scopeCount vs B.scopeCount | `minor` |
| `pendingNodeIds` | Set difference | `critical` if new pending nodes |
| `rollbackCapableNodeIds` | Set difference | `major` if rollback capability lost |

**Context Layer Diffing**:
| Aspect | Comparison | Severity |
|--------|-----------|----------|
| `totalEntries` | A.totalEntries vs B.totalEntries | `minor` |
| `entriesByDomain` | Per-domain comparison | `major` if domain disappeared |
| `freshnessDistribution` | Shift toward stale | `major` if > 50% shift |
| `hotspotCount` | A.hotspotCount vs B.hotspotCount | `minor` |

**Agent Layer Diffing**:
| Aspect | Comparison | Severity |
|--------|-----------|----------|
| `activeAgentCount` | A.activeAgentCount vs B.activeAgentCount | `minor` |
| `agentsByState` | State distribution shift | `major` if agents in error state |
| `pendingApprovalCount` | A.pendingApprovalCount vs B.pendingApprovalCount | `minor` |
| `capabilityUsage` | Per-capability comparison | `minor` |

**Process Layer Diffing**:
| Aspect | Comparison | Severity |
|--------|-----------|----------|
| `activeSessionCount` | A.activeSessionCount vs B.activeSessionCount | `minor` |
| `sessionsByState` | State distribution shift | `critical` if sessions in failed state |
| `supervisedCount` | A.supervisedCount vs B.supervisedCount | `minor` |

**Intent Layer Diffing**:
| Aspect | Comparison | Severity |
|--------|-----------|----------|
| `activeIntentCount` | A.activeIntentCount vs B.activeIntentCount | `minor` |
| `intentsByResolution` | Resolution distribution shift | `major` if intents stuck in pending |
| `maxChainDepth` | A.maxChainDepth vs B.maxChainDepth | `minor` if increasing, `major` if depth > threshold |

**Brain Layer Diffing**:
| Aspect | Comparison | Severity |
|--------|-----------|----------|
| `loopPhase` | Phase change | `major` if phase regressed |
| `healthStatus` | Health change | `critical` if health degraded |
| `activeConflictCount` | Conflict count change | `major` if increased |
| `backpressureLevel` | Level change | `critical` if increased to Heavy/Full |
| `eventBusThroughput` | Throughput change | `minor` |

### Change Attribution

Each `ISnapshotChange` can be traced to a causing intent and/or event:
- If `causingIntentId` is set, the change was directly caused by an intent's execution
- If `causingEventId` is set, the change was directly caused by a specific timeline event
- If neither is set, the change was emergent (e.g., context staleness, health degradation)

### Expectedness Classification

A change is **expected** if:
- It can be traced to a known intent that was active between the two snapshots
- The change aligns with the intent's action type (e.g., a `CodeEdit` intent producing graph mutations is expected)

A change is **unexpected** if:
- No intent accounts for the change
- The change contradicts the intent's action type
- The change occurred in a layer that should not have been affected

## Auto-Capture Mechanism

### Overview

The auto-capture system periodically captures full system snapshots without manual intervention, creating a dense history that enables fine-grained reconstruction.

### Configuration

| Parameter | Default | Range | Purpose |
|-----------|---------|-------|---------|
| `intervalMs` | 30000 (30s) | 5000–300000 | Time between auto-captures |

### Auto-Capture Flow

```
startAutoCapture(intervalMs):
    timer = setInterval(() => {
        snapshot = captureSnapshot(
            `auto-${Date.now()}`,
            [all 6 layers]
        )
        emit onDidCaptureSnapshot(snapshot)
    }, intervalMs)

stopAutoCapture():
    clearInterval(timer)
```

### Smart Capture Triggers

In addition to periodic capture, snapshots are automatically captured at:
1. **Intent creation** — When a new intent enters the system
2. **Intent resolution** — When an intent is resolved (success, failure, cancelled)
3. **Stability state transitions** — When the system enters or exits a stability state
4. **Conflict detection** — When a new conflict is identified
5. **Critical health events** — When health status changes to `Critical`

These trigger-based captures use the label prefix `trigger-` and include only the layers relevant to the trigger event.

### Snapshot Pruning

To prevent unbounded memory growth, old snapshots are pruned based on:

| Rule | Threshold |
|------|-----------|
| Auto-capture snapshots older than 1 hour | Pruned if > 100 snapshots exist |
| Trigger snapshots older than 30 minutes | Pruned if > 200 snapshots exist |
| Manual snapshots | Never auto-pruned |
| Snapshots referenced by debug sessions | Never pruned while session is active |

## Snapshot Lifecycle

### State Diagram

```
   ┌───────────────┐
   │               │
   │   CREATED     │ ← captureSnapshot() or auto-capture
   │               │
   └───────┬───────┘
           │
           ▼
   ┌───────────────┐
   │               │
   │   FROZEN      │ ← Object.freeze() applied
   │               │
   └───────┬───────┘
           │
           ▼
   ┌───────────────┐
   │               │
   │   STORED      │ ← Added to snapshot store, available for queries
   │               │
   └───────┬───────┘
           │
           ├──────────────────────┐
           │                      │
           ▼                      ▼
   ┌───────────────┐      ┌───────────────┐
   │               │      │               │
   │  REFERENCED   │      │   PRUNABLE    │ ← Not referenced by any active session
   │  (by debug    │      │               │
   │   session or  │      └───────┬───────┘
   │   replay)     │              │
   │               │              ▼
   └───────────────┘      ┌───────────────┐
                          │               │
                          │   PRUNED      │ ← Removed from store, memory freed
                          │               │
                          └───────────────┘
```

### Lifecycle Stages

1. **CREATED** — The snapshot data is gathered from all requested layers. Each layer reads from its respective service. The `captureDurationMs` timer runs from start to end.

2. **FROZEN** — All data is deep-frozen using `Object.freeze()`. The snapshot becomes truly immutable. The `replaySeed` is generated based on the snapshot ID and current seed state.

3. **STORED** — The snapshot is added to the internal store (a `Map<string, ISystemSnapshot>`). It becomes available for `getSnapshot()`, `getAllSnapshots()`, `getSnapshotsInRange()`, and `getNearestSnapshot()` queries. The `onDidCaptureSnapshot` event is fired.

4. **REFERENCED** — When a debug session, replay operation, or reconstruction uses the snapshot, it is marked as referenced. Referenced snapshots are never pruned.

5. **PRUNABLE** — When no active sessions reference the snapshot and it exceeds the age threshold, it becomes eligible for pruning.

6. **PRUNED** — The snapshot is removed from the store and its memory is freed. Once pruned, it cannot be retrieved by `getSnapshot()`.

### Snapshot Storage Format

Snapshots are stored in memory as frozen JavaScript objects. No serialization is performed for the in-memory store. The storage structure:

```typescript
class SnapshotStore {
    private snapshots: Map<string, ISystemSnapshot>;
    private references: Map<string, Set<string>>;  // snapshotId → set of session IDs
    private index: SortedList<ISystemSnapshot>;     // sorted by timestamp for range queries
}
```

### Snapshot Count Limits

| Mode | Max Snapshots | Max Memory |
|------|--------------|------------|
| Development | 500 | 256 MB |
| Production | 100 | 64 MB |

When the limit is reached, the oldest prunable snapshots are pruned first.

## Snapshot API Reference

### captureSnapshot(label, layers?)

Captures a system snapshot. If `layers` is omitted, all 6 layers are captured.

**Returns**: `ISystemSnapshot` — the captured, frozen snapshot

**Side effects**: Fires `onDidCaptureSnapshot` event

**Error cases**:
- If a layer's data source is unavailable, that layer is set to `undefined` and `complete` is `false`
- If ALL layers fail, the snapshot is still created but all layer fields are `undefined`

### getSnapshot(snapshotId)

Retrieves a previously captured snapshot by ID.

**Returns**: `ISystemSnapshot | undefined` — the snapshot, or `undefined` if not found or pruned

### getAllSnapshots()

Returns all stored snapshots, sorted by timestamp (ascending).

**Returns**: `readonly ISystemSnapshot[]`

### getSnapshotsInRange(fromTimestamp, toTimestamp)

Returns snapshots within the specified time range, inclusive.

**Returns**: `readonly ISystemSnapshot[]`

**Performance**: Uses the timestamp index for O(log n) range lookup

### getNearestSnapshot(timestamp)

Returns the snapshot closest to the given timestamp. Prefers snapshots before the timestamp (for reconstruction as a base).

**Returns**: `ISystemSnapshot | undefined`

**Algorithm**: Binary search on the timestamp index, then check adjacent entries

### startAutoCapture(intervalMs) / stopAutoCapture()

Controls the periodic auto-capture timer.

**Invariant**: Only one auto-capture timer can be active at a time. Calling `startAutoCapture()` while already active resets the interval.

## Relationship to Other Tasks

| Task | How Snapshots Are Used |
|------|----------------------|
| Task 1 (Replay Engine) | Snapshots provide the starting state for replay |
| Task 4 (Deterministic Replay) | The `replaySeed` embedded in each snapshot drives deterministic PRNG |
| Task 7 (State Reconstruction) | Snapshots are the base for reconstruction; events between snapshots are replayed forward |
| Task 8 (Differential Analysis) | `diffSnapshots()` compares two snapshots layer by layer |
| Task 9 (Debug Protocol) | Debug sessions reference snapshots for step-by-step inspection |
| Task 10 (UI Layer) | `ISnapshotInspectorViewModel` displays snapshot data; `ISnapshotMarker` places snapshots on the timeline |
