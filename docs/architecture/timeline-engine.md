# Timeline Engine — Architecture

## Overview

The Event Timeline Engine provides a **unified, normalized, causally-linked** timeline of all events across the Real Vibecode system's eight source subsystems. Every mutation, lifecycle transition, decision, conflict, state change, health event, and context update is normalized into a single `IExecutionTimelineEvent` format, enabling cross-subsystem querying, causal tracing, replay, and debugging.

The timeline is the backbone of the replay engine — it provides the ordered sequence of events that connects snapshots, drives reconstruction, and powers the debug protocol.

## Design Principles

1. **Universal Normalization** — Every event from every subsystem is transformed into `IExecutionTimelineEvent`, regardless of the source's native event format
2. **Causal Linking** — Every event carries a `causedByEventId` that links it to the event that triggered it, forming a directed acyclic graph (DAG) of causality
3. **Monotonic Timestamps** — All events use a single monotonic timestamp space (milliseconds since epoch), ensuring global ordering
4. **Cross-Subsystem Association** — Events carry optional `intentId`, `agentId`, `processSessionId`, and `graphNodeId` fields that link them across subsystems
5. **Side-Effect Tracking** — The `hasSideEffects` flag distinguishes informational events from events that changed system state

## TimelineEventSource Enum

The 8 source subsystems that produce timeline events:

| Value | Source | Description |
|-------|--------|-------------|
| `ExecutionGraph` | `IExecutionGraphService` | Graph structure changes — node creation, edge addition, scope changes |
| `ExecutionService` | `IAIExecutionService` | Mutation records and policy decisions |
| `AgentOrchestrator` | `IAgentOrchestratorService` | Agent lifecycle events — creation, plan execution, approval requests |
| `ProcessOrchestrator` | `IAIProcessOrchestratorService` | Process lifecycle events — session start, output, completion, failure |
| `ContextEngine` | `IAIContextService` | Context updates — entry addition, freshness changes, symbol tracking |
| `GlobalBrain` | `IGlobalExecutionBrainService` | Brain events — intent creation, decision making, conflict detection, health changes |
| `UnifiedState` | `IUnifiedStateService` | State transitions — phase changes, stability state changes |
| `Stabilization` | `ISystemStabilizationService` | Health and stability events — load changes, backpressure, memory pressure |

## TimelineEventCategory Enum

The 10 categories of timeline events:

| Value | Description | Side Effects |
|-------|-------------|--------------|
| `Mutation` | A mutation was applied or attempted | Yes |
| `AgentLifecycle` | Agent creation, activation, deactivation, error | Depends on event |
| `ProcessLifecycle` | Process start, output, completion, failure, restart | Depends on event |
| `ContextUpdate` | Context entry added, updated, evicted | Yes (for additions/updates) |
| `GraphChange` | Node/edge/scope creation, modification, removal | Yes |
| `Decision` | A decision was made by the brain or an agent | No |
| `Conflict` | A conflict was detected or resolved | No |
| `StateTransition` | A state transition occurred (phase, stability) | Yes |
| `HealthStability` | Health or stability metric change | No |
| `IntentLifecycle` | Intent creation, resolution, cancellation, chaining | Yes |

## Event Normalization Process

### Overview

Each subsystem produces events in its own native format. The timeline engine normalizes all of them into `IExecutionTimelineEvent`. The normalization pipeline has 4 stages:

```
Source Event → Extraction → Enrichment → Causal Linking → Storage
```

### Stage 1: Extraction

Extract the essential fields from the source event:

| Target Field | Source Mapping |
|-------------|----------------|
| `id` | Generate UUID if source doesn't provide one |
| `timestamp` | Source timestamp, or `Date.now()` if not available |
| `source` | Determined by which listener captured the event |
| `category` | Mapped from the source event type |
| `description` | Source event description or auto-generated |

### Stage 2: Enrichment

Add cross-subsystem associations by querying related services:

| Target Field | Enrichment Logic |
|-------------|-----------------|
| `intentId` | If the event is part of an intent execution, link to the intent ID |
| `agentId` | If an agent is involved, link to the agent ID |
| `processSessionId` | If a process session is involved, link to the session ID |
| `graphNodeId` | If a graph node is involved, link to the node ID |
| `nearestSnapshotId` | Find the closest captured snapshot to this event's timestamp |

### Stage 3: Causal Linking

Establish the `causedByEventId` field:

| Causal Link Pattern | Example |
|--------------------|---------|
| Intent → AgentDecision | An intent's creation caused an agent to make a decision |
| AgentDecision → ProcessExecution | An agent's decision caused a process to start |
| ProcessExecution → GraphMutation | A process's output caused a graph node to be created |
| GraphMutation → FileMutation | A graph node's execution caused a file to be modified |
| Conflict → Decision | A conflict's detection caused the brain to make a decision |
| StateTransition → HealthStability | A state transition caused a health metric change |

**Causal linking algorithm**:
1. If the source event explicitly references a parent event, use that
2. If the event is associated with an intent, find the most recent previous event for that intent
3. If the event is associated with an agent, find the most recent previous event for that agent
4. If the event is a mutation, find the most recent non-mutation event at the same graph node
5. Otherwise, `causedByEventId` is `undefined` (root event)

### Stage 4: Storage

The normalized event is appended to the timeline store:

```typescript
interface TimelineStore {
    events: IExecutionTimelineEvent[];          // Sorted by timestamp
    byIntent: Map<string, Set<string>>;         // intentId → event IDs
    byAgent: Map<string, Set<string>>;          // agentId → event IDs
    byProcess: Map<string, Set<string>>;        // processSessionId → event IDs
    byNode: Map<string, Set<string>>;           // graphNodeId → event IDs
    causalGraph: Map<string, string | undefined>; // eventId → causedByEventId
}
```

### Normalization Per Source

#### ExecutionGraph → IExecutionTimelineEvent

| Source Event | Category | Causal Link |
|-------------|----------|-------------|
| Node created | `GraphChange` | Caused by the intent/agent that triggered it |
| Edge added | `GraphChange` | Caused by the node creation event |
| Scope changed | `GraphChange` | Caused by the triggering mutation |
| Node rolled back | `GraphChange` | Caused by the rollback trigger event |

#### ExecutionService → IExecutionTimelineEvent

| Source Event | Category | Causal Link |
|-------------|----------|-------------|
| Mutation applied | `Mutation` | Caused by the intent/agent that ordered it |
| Mutation rejected | `Mutation` | Caused by the policy that rejected it |
| Policy evaluated | `Decision` | Caused by the triggering mutation attempt |

#### AgentOrchestrator → IExecutionTimelineEvent

| Source Event | Category | Causal Link |
|-------------|----------|-------------|
| Agent created | `AgentLifecycle` | Caused by the intent that required the agent |
| Plan created | `AgentLifecycle` | Caused by the agent's decision |
| Plan step executed | `AgentLifecycle` | Caused by the plan creation |
| Approval requested | `AgentLifecycle` | Caused by the plan step requiring approval |
| Agent error | `AgentLifecycle` | Caused by the failing step |

#### ProcessOrchestrator → IExecutionTimelineEvent

| Source Event | Category | Causal Link |
|-------------|----------|-------------|
| Session started | `ProcessLifecycle` | Caused by the agent's plan step |
| Output chunk | `ProcessLifecycle` | Caused by the session start |
| Session completed | `ProcessLifecycle` | Caused by the process finishing |
| Session failed | `ProcessLifecycle` | Caused by the error event |
| Session restarted | `ProcessLifecycle` | Caused by the failure event |

#### ContextEngine → IExecutionTimelineEvent

| Source Event | Category | Causal Link |
|-------------|----------|-------------|
| Entry added | `ContextUpdate` | Caused by the mutation that introduced the data |
| Entry updated | `ContextUpdate` | Caused by the source change |
| Entry evicted | `ContextUpdate` | Caused by the memory pressure event |
| Symbol tracked | `ContextUpdate` | Caused by the graph node referencing it |

#### GlobalBrain → IExecutionTimelineEvent

| Source Event | Category | Causal Link |
|-------------|----------|-------------|
| Intent created | `IntentLifecycle` | Root event (no cause) or caused by parent intent |
| Intent resolved | `IntentLifecycle` | Caused by the completing event |
| Decision made | `Decision` | Caused by the triggering conflict or intent |
| Conflict detected | `Conflict` | Caused by the conflicting events |
| Conflict resolved | `Conflict` | Caused by the resolution decision |
| Checkpoint created | `StateTransition` | Caused by the sync event |
| Health alert | `HealthStability` | Caused by the metric crossing a threshold |

#### UnifiedState → IExecutionTimelineEvent

| Source Event | Category | Causal Link |
|-------------|----------|-------------|
| Phase change | `StateTransition` | Caused by the event that triggered the transition |
| Stability change | `StateTransition` | Caused by the load/health change |

#### Stabilization → IExecutionTimelineEvent

| Source Event | Category | Causal Link |
|-------------|----------|-------------|
| Load change | `HealthStability` | Caused by the operation that changed load |
| Backpressure change | `HealthStability` | Caused by the load threshold crossing |
| Memory pressure change | `HealthStability` | Caused by the memory allocation |
| Quarantine applied | `HealthStability` | Caused by the failure cascade event |
| Auto-recovery triggered | `HealthStability` | Caused by the stabilization diagnostic |

## Causal Linking Algorithm

### Overview

The causal linking algorithm builds a directed acyclic graph (DAG) where each event points to the event that caused it via `causedByEventId`. This DAG enables:

1. **Causal chain traversal** — Walk from any event back to its root cause
2. **Forward impact analysis** — From a root event, find all downstream effects
3. **"Why" resolution** — Given an event, trace the full chain back to the initiating intent

### Linking Rules

The algorithm uses a priority-ordered set of rules:

1. **Explicit link** — If the source event explicitly names a parent event ID, use it (highest priority)
2. **Intent chain** — If the event is associated with an intent and that intent has a parent intent, link to the most recent event of the parent intent
3. **Agent execution chain** — If the event is from an agent, link to the most recent previous event from the same agent
4. **Process execution chain** — If the event is from a process, link to the most recent previous event from the same process session
5. **Graph execution chain** — If the event is associated with a graph node, link to the most recent event at that node
6. **Temporal proximity** — If none of the above apply, and there is an event within 100ms from the same source, link to it
7. **No link** — The event is a root event (e.g., user-initiated intent creation)

### Cycle Prevention

The algorithm ensures the causal graph remains a DAG (no cycles):
- `causedByEventId` always points to an earlier timestamp
- Before linking, the algorithm checks that the target event's timestamp is strictly less than the current event's timestamp
- If a cycle would be created, the link is dropped and the event becomes a root

### Causal Chain Construction

The `getCausalChainEvents(eventId)` method builds the full chain:

```
getCausalChainEvents(eventId):
    chain = []
    current = getEvent(eventId)
    while current is not undefined:
        chain.unshift(current)
        if current.causedByEventId is undefined:
            break
        current = getEvent(current.causedByEventId)
    return chain
```

This produces a chain ordered from root cause (first) to the target event (last).

## Timeline Filtering

### ITimelineFilter Interface

```typescript
interface ITimelineFilter {
    readonly sources?: readonly TimelineEventSource[];   // Filter by source
    readonly categories?: readonly TimelineEventCategory[];  // Filter by category
    readonly intentId?: string;                          // Filter by intent
    readonly agentId?: string;                           // Filter by agent
    readonly processSessionId?: string;                  // Filter by process session
    readonly fromTimestamp?: number;                     // Time range start
    readonly toTimestamp?: number;                       // Time range end
    readonly hasSideEffects?: boolean;                   // Filter by side effects
    readonly limit?: number;                             // Max results
}
```

### Filter Application Algorithm

```
applyFilter(events, filter):
    result = events
    
    if filter.sources:
        result = result.filter(e => filter.sources.includes(e.source))
    
    if filter.categories:
        result = result.filter(e => filter.categories.includes(e.category))
    
    if filter.intentId:
        result = result.filter(e => e.intentId === filter.intentId)
    
    if filter.agentId:
        result = result.filter(e => e.agentId === filter.agentId)
    
    if filter.processSessionId:
        result = result.filter(e => e.processSessionId === filter.processSessionId)
    
    if filter.fromTimestamp:
        result = result.filter(e => e.timestamp >= filter.fromTimestamp)
    
    if filter.toTimestamp:
        result = result.filter(e => e.timestamp <= filter.toTimestamp)
    
    if filter.hasSideEffects is not undefined:
        result = result.filter(e => e.hasSideEffects === filter.hasSideEffects)
    
    if filter.limit:
        result = result.slice(0, filter.limit)
    
    return result
```

### Common Filter Patterns

| Use Case | Filter |
|----------|--------|
| Debug a specific intent | `{ intentId: "intent-123" }` |
| View only mutations | `{ categories: [TimelineEventCategory.Mutation] }` |
| Find what an agent did | `{ agentId: "agent-456" }` |
| Recent events with side effects | `{ hasSideEffects: true, limit: 100 }` |
| Events from the brain only | `{ sources: [TimelineEventSource.GlobalBrain] }` |
| Time-bounded segment | `{ fromTimestamp: T1, toTimestamp: T2 }` |

## Segment Construction

### ITimelineSegment Interface

```typescript
interface ITimelineSegment {
    readonly fromTimestamp: number;
    readonly toTimestamp: number;
    readonly events: readonly IExecutionTimelineEvent[];
    readonly eventCount: number;
    readonly intentCount: number;
    readonly agentCount: number;
    readonly processCount: number;
    readonly snapshotIds: readonly string[];
}
```

### Segment Construction Algorithm

The `getTimelineSegment(fromTimestamp, toTimestamp)` method:

1. **Filter events** — Select all events within [fromTimestamp, toTimestamp]
2. **Count intents** — Count unique `intentId` values across the events
3. **Count agents** — Count unique `agentId` values across the events
4. **Count processes** — Count unique `processSessionId` values across the events
5. **Find snapshots** — Identify snapshot IDs whose timestamps fall within the range
6. **Build segment** — Assemble the `ITimelineSegment` with all computed fields

### Segment Properties

| Property | Computation |
|----------|------------|
| `eventCount` | `events.length` |
| `intentCount` | `new Set(events.map(e => e.intentId).filter(Boolean)).size` |
| `agentCount` | `new Set(events.map(e => e.agentId).filter(Boolean)).size` |
| `processCount` | `new Set(events.map(e => e.processSessionId).filter(Boolean)).size` |
| `snapshotIds` | `snapshots.filter(s => s.timestamp >= from && s.timestamp <= to).map(s => s.id)` |

### Timeline Segmentation for UI

The `IExecutionTimelineViewModel` breaks the full timeline into segments for efficient rendering:

```
buildViewModel(filter):
    allEvents = getTimelineEvents(filter)
    segments = splitIntoSegments(allEvents, segmentDuration)
    
    snapshotMarkers = allSnapshots
        .filter(s => s.timestamp >= from && s.timestamp <= to)
        .map(s => { timestamp: s.timestamp, snapshotId: s.id, label: s.label, complete: s.complete })
    
    intentMarkers = extractIntentMarkers(allEvents)
    
    return IExecutionTimelineViewModel {
        segments,
        totalEvents: allEvents.length,
        fromTimestamp: allEvents[0].timestamp,
        toTimestamp: allEvents[allEvents.length - 1].timestamp,
        snapshotMarkers,
        intentMarkers
    }
```

**Segment duration**: Adaptive based on total time range:
- < 1 minute: 1-second segments
- < 1 hour: 1-minute segments
- < 1 day: 1-hour segments
- > 1 day: 1-day segments

## Event Store Management

### Storage Model

Timeline events are stored in a time-ordered array with multiple index structures for efficient querying:

| Index | Key | Purpose |
|-------|-----|---------|
| `byTimestamp` | timestamp | Range queries, segment construction |
| `byIntent` | intentId | Intent-scoped queries |
| `byAgent` | agentId | Agent-scoped queries |
| `byProcess` | processSessionId | Process-scoped queries |
| `byNode` | graphNodeId | Node-scoped queries |
| `causalGraph` | eventId → causedByEventId | Causal chain traversal |

### Memory Management

| Mode | Max Events | Eviction Policy |
|------|-----------|-----------------|
| Development | 50,000 | FIFO (oldest first) |
| Production | 10,000 | FIFO (oldest first) |

When the limit is reached, the oldest events are evicted. Eviction preserves the causal graph by:
- Removing the evicted event from the `causalGraph`
- Updating any events that pointed to the evicted event as their `causedByEventId` to `undefined`
- This may break some causal chains for very old events, which is documented as a known limitation

### Event Recording Flow

```
recordEvent(sourceEvent):
    normalized = normalizeEvent(sourceEvent)
    enriched = enrichEvent(normalized)
    linked = linkCausally(enriched)
    
    events.push(linked)
    updateIndices(linked)
    
    emit onDidRecordTimelineEvent(linked)
```

## Integration Points

### With Snapshot System (Task 2)

- Each event carries `nearestSnapshotId` — the closest captured snapshot
- When auto-capture triggers, the snapshot's timestamp becomes a marker on the timeline
- Reconstruction (Task 7) replays events between a snapshot and the target timestamp

### With Deterministic Replay (Task 4)

- Replay produces `IExecutionTimelineEvent` records that are compared with the original timeline
- Divergences are detected by comparing replayed events against the recorded timeline

### With Debug Protocol (Task 9)

- Debug sessions walk through timeline events step by step
- `debugStepForward()` and `debugStepBackward()` navigate the event array
- The causal trace at each step is built from the causal graph

### With UI Layer (Task 10)

- `IExecutionTimelineViewModel` presents segments, markers, and event details
- `IIntentMarker` shows where intents were created and resolved on the timeline
- `ISnapshotMarker` shows where snapshots were captured on the timeline
- Filter controls map directly to `ITimelineFilter` parameters
