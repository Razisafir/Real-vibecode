# Execution Replay Engine — Architecture

## Overview

The Execution Replay Engine is a **read-only deterministic mirror** of the entire Real Vibecode system. It allows any execution to be replayed, simulated, reconstructed, and debugged without side effects on the live runtime. It is the system's time machine — every intent chain, every mutation, every decision can be inspected at any point in history.

The engine is exposed through the `IExecutionReplayService`, registered as service #17 in the AI Execution subsystem. It depends on 9 other services, all accessed in **strict read-only mode**.

## Core Design Principles

1. **Zero Mutation Guarantee** — The replay engine MUST NOT execute real mutations, MUST NOT interfere with runtime systems, and MUST ONLY observe, reconstruct, and simulate
2. **Deterministic Replay** — Same snapshot + same intent → same output in STRICT mode
3. **Full Causal Tracing** — The timeline MUST reconstruct the full intent chain, and the causal chain MUST NOT break during reconstruction
4. **Immutable Snapshots** — All snapshots are timestamped, immutable, and diffable
5. **Simulation Without Execution** — Agents and processes MUST NOT execute real actions during replay

## Service Dependency Graph

```
                              ┌───────────────────────────────────┐
                              │    IExecutionReplayService        │
                              │    (Service #17 — Phase 11)       │
                              │                                   │
                              │  10 Tasks:                        │
                              │   1. Replay Engine                │
                              │   2. Snapshot Model               │
                              │   3. Timeline Engine              │
                              │   4. Deterministic Replay         │
                              │   5. Simulated Agent Engine       │
                              │   6. Process Simulation           │
                              │   7. State Reconstruction         │
                              │   8. Differential Analysis        │
                              │   9. Debug Protocol               │
                              │  10. Replay UI Layer              │
                              └───────────┬───────────────────────┘
                                          │
                   ┌──────────┬───────────┼──────────┬──────────────┐
                   │          │           │          │              │
          ┌────────▼──┐ ┌─────▼────┐ ┌───▼────┐ ┌──▼────────┐ ┌──▼──────────┐
          │Execution  │ │AIExec    │ │Agent   │ │Process    │ │Context      │
          │Graph      │ │Service   │ │Orch.   │ │Orch.      │ │Engine       │
          │(graph     │ │(mutations│ │(agents,│ │(sessions, │ │(domains,    │
          │ nodes,    │ │ policies)│ │ plans) │ │ outputs)  │ │ freshness)  │
          │ edges)    │ │          │ │        │ │           │ │             │
          └───────────┘ └──────────┘ └────────┘ └───────────┘ └─────────────┘
                   │          │           │          │              │
          ┌────────▼──────────▼───────────▼──────────▼──────────────▼──────────┐
          │                                                                      │
          │  ┌─────────────────┐  ┌──────────────────┐  ┌───────────────────┐  │
          │  │Global Execution │  │Unified State     │  │Observability      │  │
          │  │Brain            │  │Service           │  │Service            │  │
          │  │(intents,        │  │(state            │  │(trace logs)       │  │
          │  │ decisions,      │  │ transitions)     │  │                   │  │
          │  │ events)         │  │                  │  │                   │  │
          │  └─────────────────┘  └──────────────────┘  └───────────────────┘  │
          │                                                                      │
          │  ┌────────────────────────────────────────────────────────────────┐ │
          │  │ SystemStabilizationService (stability state, diagnostics)      │ │
          │  └────────────────────────────────────────────────────────────────┘ │
          └─────────────────────────────────────────────────────────────────────┘
```

## Data Flow from Injected Services

### 1. ExecutionGraphService
- **Direction**: READ-ONLY (graph → replay)
- **Data consumed**: Node count, edge count, scope count, node type distribution, pending node IDs, rollback-capable node IDs
- **Used by**: Graph snapshot layer (`IGraphSnapshotLayer`), timeline events (`TimelineEventSource.ExecutionGraph`), graph mutations in causal traces
- **Key constraint**: Replay engine never calls `addNode()`, `removeNode()`, or any mutation API on the graph service

### 2. AIExecutionService
- **Direction**: READ-ONLY (execution → replay)
- **Data consumed**: Mutation records, policy decisions, mutation sources
- **Used by**: Timeline events (`TimelineEventSource.ExecutionService`), mutation category events, policy re-application in simulation
- **Key constraint**: Replay engine never triggers real mutations or invokes policy enforcement

### 3. AgentOrchestratorService
- **Direction**: READ-ONLY (agent → replay)
- **Data consumed**: Agent states, execution plans, capability usage, pending approvals
- **Used by**: Agent snapshot layer (`IAgentSnapshotLayer`), agent simulation (`simulateAgentDecision()`), agent lifecycle timeline events
- **Key constraint**: Simulated agents never create real plans or execute real actions

### 4. AIProcessOrchestratorService
- **Direction**: READ-ONLY (process → replay)
- **Data consumed**: Process sessions, output chunks, lifecycle states, supervision data
- **Used by**: Process snapshot layer (`IProcessSnapshotLayer`), process simulation (`simulateProcessExecution()`), process lifecycle timeline events
- **Key constraint**: Simulated processes never spawn real child processes or write to the filesystem

### 5. AIContextService
- **Direction**: READ-ONLY (context → replay)
- **Data consumed**: Context entries, domain distribution, freshness data, symbol counts, dependency edges, hotspots
- **Used by**: Context snapshot layer (`IContextSnapshotLayer`), context update timeline events
- **Key constraint**: Replay engine never adds or removes context entries

### 6. GlobalExecutionBrainService
- **Direction**: READ-ONLY (brain → replay)
- **Data consumed**: Intents, decisions, conflicts, sync checkpoints, execution loop phase, health metrics, brain events
- **Used by**: Intent snapshot layer (`IIntentSnapshotLayer`), brain snapshot layer (`IBrainSnapshotLayer`), intent timeline events, decision/conflict events
- **Key constraint**: Replay engine never creates intents, resolves conflicts, or emits brain events

### 7. UnifiedStateService
- **Direction**: READ-ONLY (state → replay)
- **Data consumed**: State transitions, runtime phases
- **Used by**: Runtime phase tracking in snapshots, state transition timeline events, reconstruction base state
- **Key constraint**: Replay engine never triggers state transitions

### 8. ObservabilityService
- **Direction**: READ-ONLY (observability → replay)
- **Data consumed**: Trace logs, event records
- **Used by**: Timeline event sourcing, causal chain construction, integrity verification
- **Key constraint**: Replay engine never writes to the observability log (prevents recursive observation)

### 9. SystemStabilizationService
- **Direction**: READ-ONLY (stabilization → replay)
- **Data consumed**: Stability state, load metrics, backpressure levels, memory pressure
- **Used by**: Stability state in snapshots (`SystemStabilityState`), backpressure levels in brain layer, health/stability timeline events
- **Key constraint**: Replay engine never modifies stability state or applies backpressure

## Task Breakdown

### Task 1: Execution Replay Engine Core

The foundational replay capability that allows replaying any intent chain or graph timeline.

| Method | Purpose |
|--------|---------|
| `replayIntentChain(intentId, mode)` | Replay the full event chain produced by an intent and all its children |
| `replayGraphTimeline(from, to, mode)` | Replay the execution graph timeline for a time range |
| `simulateIntentExecution(intent, mode)` | Simulate what would happen if an intent were executed — without executing it |

**Key behaviors**:
- All replay operations return `IDeterministicReplayResult` which includes the replay mode, seed used, any divergences, and duration
- Replay is non-blocking — it reads historical data without pausing the live system
- The `simulateIntentExecution` method is the "what-if" engine — it shows what would happen without committing

### Task 2: System Snapshot Model

Point-in-time immutable snapshots of the entire system across 6 layers.

| Method | Purpose |
|--------|---------|
| `captureSnapshot(label, layers?)` | Capture a system snapshot (all or specific layers) |
| `getSnapshot(snapshotId)` | Retrieve a previously captured snapshot |
| `getAllSnapshots()` | Get all snapshots sorted by timestamp |
| `getSnapshotsInRange(from, to)` | Get snapshots within a time range |
| `getNearestSnapshot(timestamp)` | Find the closest snapshot to a given time |
| `startAutoCapture(intervalMs)` | Begin periodic snapshot capture |
| `stopAutoCapture()` | End periodic snapshot capture |
| `onDidCaptureSnapshot` | Event fired when a snapshot is captured |

**Key behaviors**:
- Snapshots are immutable — once created, no field can be modified
- Partial snapshots (specific layers only) are supported for efficiency
- Each snapshot carries a `replaySeed` for deterministic replay from that point
- Auto-capture runs on a configurable interval and is useful for reconstruction

### Task 3: Event Timeline Engine

A unified timeline that normalizes events from all 8 source subsystems.

| Method | Purpose |
|--------|---------|
| `getTimelineEvents(filter?)` | Query timeline events with optional filter |
| `getTimelineSegment(from, to)` | Get a time-bounded segment with aggregated stats |
| `getIntentTimeline(intentId)` | Get all events for a specific intent |
| `getCausalChainEvents(eventId)` | Get all events causally linked to a given event |
| `onDidRecordTimelineEvent` | Event fired when a new timeline event is recorded |

**Key behaviors**:
- Every event is normalized to `IExecutionTimelineEvent` regardless of source
- Events carry `causedByEventId` for causal linking
- The `ITimelineFilter` supports filtering by source, category, intent, agent, process, time range, side effects, and result limit

### Task 4: Deterministic Replay Mode

Two modes controlling how strictly replay adheres to determinism.

| Method | Purpose |
|--------|---------|
| `createReplaySeed(snapshotId, description)` | Create a deterministic seed for replay |
| `verifyDeterminism(intentId, seed)` | Replay an intent and compare to verify determinism |
| `replayMode` (getter) | Get the current replay mode |
| `setReplayMode(mode)` | Set the replay mode (STRICT or APPROXIMATE) |
| `getReplayDivergences()` | Get all divergences detected during replays |

**Key behaviors**:
- `ReplayMode.Strict`: Same snapshot + same intent → same output. No approximation. Zero divergences expected.
- `ReplayMode.Approximate`: Allows non-deterministic outcomes for timing-sensitive operations. Minor divergences tolerated.
- `IReplaySeed` provides the PRNG seed value that controls all random choices in the replay
- `IReplayDivergence` records what diverged, expected vs actual values, causal chain, and severity

### Task 5: Simulated Agent Engine

Agent decision simulation without any real execution.

| Method | Purpose |
|--------|---------|
| `simulateAgentDecision(agentId, intent, seed)` | Simulate what an agent would decide for an intent |
| `reEvaluatePlan(agentId, planId, seed)` | Re-evaluate a previously executed plan |
| `reApplyPolicy(agentId, decisionId)` | Re-apply policy to a past agent decision |

**Key behaviors**:
- Returns `IAgentSimulationResult` with simulated plan, decisions, approval/policy checks, success probability, and impact estimate
- `ISimulatedPlan` describes what the agent would plan (steps, affected files, risk level, rollback possibility)
- `ISimulatedDecision` captures decision points, choices, reasoning, confidence, and alternatives
- The `wouldViolatePolicy` flag enables pre-flight policy checking

### Task 6: Process Simulation Layer

Process execution/lifecycle simulation without spawning real processes.

| Method | Purpose |
|--------|---------|
| `simulateProcessExecution(command, seed)` | Simulate a process execution |
| `simulateProcessLifecycle(sessionId, seed)` | Simulate lifecycle transitions |
| `simulateProcessFailures(command, seed)` | Simulate possible failure paths |
| `simulateProcessRestart(sessionId, seed)` | Simulate restart behavior |

**Key behaviors**:
- Returns `IProcessSimulationResult` with simulated exit code, output chunks, lifecycle transitions, and failure paths
- `ISimulatedOutputChunk` captures stdout/stderr/control output with classification
- `ISimulatedFailurePath` describes possible failure scenarios with probability and restart policy handling
- `ISimulatedLifecycleTransition` models the full state machine of a process

### Task 7: State Reconstruction Engine

Reconstruct the full system state at any arbitrary point in time.

| Method | Purpose |
|--------|---------|
| `reconstructAtTime(timestamp)` | Reconstruct full system state at time T |
| `reconstructSubsystem(timestamp, layer)` | Reconstruct a specific layer at time T |
| `fullRewind(timestamp)` | Reconstruct from the beginning to time T |
| `partialRewind(timestamp, layer)` | Rewind only a specific subsystem |

**Key behaviors**:
- `IStateReconstructionResult` includes the base snapshot, replayed events, reconstructed snapshot, exactness flag, and any gaps
- If a snapshot exists at the target timestamp, reconstruction is exact
- If not, the nearest earlier snapshot is used as a base and events are replayed forward
- `IReconstructionGap` records missing data that could not be reconstructed, with an `approximable` flag

### Task 8: Differential Analysis Engine

Snapshot comparison with causal chain explanation.

| Method | Purpose |
|--------|---------|
| `diffSnapshots(snapshotAId, snapshotBId)` | Compare two snapshots |
| `diffWithCurrent(snapshotId)` | Compare current state with a snapshot |
| `explainChange(snapshotAId, snapshotBId, aspect)` | Find the causal chain for a specific change |
| `traceMutationSource(snapshotAId, snapshotBId, aspect)` | Determine which system caused a mutation |

**Key behaviors**:
- `ISnapshotDiff` includes changes by layer, changes by severity, causal chains, expected/unexpected classification
- `ISnapshotChange` records the layer, aspect, values, addition/removal flags, causing intent/event, severity, and expectedness
- `ICausalChain` traces from root cause event through the full chain to the final effect
- The `changesExpected` flag checks whether all changes are accounted for by known intents

### Task 9: Execution Debug Protocol

Step-by-step debugging with causal tracing and "why" resolution.

| Method | Purpose |
|--------|---------|
| `createDebugSession(intentId)` | Create a debug session for an intent |
| `createDebugSessionForRange(from, to)` | Create a debug session for a time range |
| `getDebugSession(sessionId)` | Get a debug session by ID |
| `debugStepForward(sessionId)` | Step forward one event |
| `debugStepBackward(sessionId)` | Step backward one event |
| `getCausalTrace(sessionId)` | Get the causal trace for the current step |
| `resolveWhy(eventId)` | Resolve "why did this happen?" for an event |
| `closeDebugSession(sessionId)` | Close a debug session |

**Key behaviors**:
- `IDebugSession` tracks current position, step index, pause state, events, and causal trace
- `ICausalTrace` connects: intent → agent decisions → process executions → graph mutations → file mutations
- `IWhyResolution` provides the root cause, full causal chain, human explanation, initiating intent, and alternative outcomes
- Debug sessions are isolated — they never affect the live system

### Task 10: Replay UI Layer

View models for the replay visualization components.

| Method | Purpose |
|--------|---------|
| `getTimelineViewModel(filter?)` | Get the execution timeline view model |
| `getReplayControllerViewModel()` | Get the replay controller view model |
| `getSnapshotInspectorViewModel(snapshotId)` | Get the snapshot inspector view model |
| `getCausalTraceViewModel(eventId)` | Get the causal trace view model |
| `getDiffViewerViewModel(snapshotAId, snapshotBId)` | Get the diff viewer view model |

**Key behaviors**:
- `IExecutionTimelineViewModel` includes segments, snapshot markers, and intent markers
- `IReplayControllerViewModel` tracks playback position, speed, mode, and debug session linkage
- `ISnapshotInspectorViewModel` shows layer summaries and diff availability
- `ICausalTraceViewModel` provides step-by-step visualization with connection types (caused, triggered, parent, derived)
- `IDiffViewerViewModel` shows layer tabs with change counts

## Read-Only Enforcement Rules

The replay engine operates under strict read-only constraints. These rules are enforced at multiple levels:

### Rule 1: No Real Mutations
- The replay engine MUST NOT call any mutation API on any service
- All data flows INTO the replay engine; nothing flows OUT to modify state
- `mutationLeakDetected` flag is continuously monitored
- The `validateNoRuntimeInterference()` integrity check verifies zero mutation leaks

### Rule 2: No Runtime Interference
- Replay operations MUST NOT cause any observable change in the live runtime
- Event listeners on replay events MUST NOT trigger actions in other services
- Timeline event recording is append-only and does not block the event path
- `IReplayIntegrityCheck.runtimeStateUntouched` must always be `true`

### Rule 3: Simulation Isolation
- `simulateAgentDecision()` creates a sandboxed simulation context
- `simulateProcessExecution()` runs in a virtualized process environment
- Neither simulation path can access the filesystem, network, or real process spawner
- Simulated results carry a `deterministic` flag confirming isolation

### Rule 4: No Recursive Observation
- The replay engine's own operations MUST NOT produce timeline events that would be observed by the replay engine
- This prevents infinite loops where replay generates events that trigger further replay
- The `onDidRecordTimelineEvent` event is only for externally-originated events

### Rule 5: Snapshot Immutability
- Once a snapshot is captured, it is frozen — no field may be modified
- Snapshot references are returned as `readonly` interfaces
- Even the implementation uses deep freezing (Object.freeze) on captured snapshot data
- This ensures that reconstruction always produces the same result from the same base snapshot

## Deterministic Replay Guarantees

### The Fundamental Theorem
> Given the same snapshot S and the same intent I, replaying I from S in STRICT mode MUST produce the same output O, regardless of when the replay is performed.

### Proof Structure

1. **Snapshot S is immutable** — By Rule 5, once captured, S never changes
2. **Seed is derived from S** — `IReplaySeed.snapshotId` links the seed to the specific snapshot
3. **Seed value is deterministic** — The xorshift32 PRNG produces the same sequence for the same seed value
4. **All random choices are seeded** — Agent simulation, process simulation, and policy evaluation all use the seeded PRNG
5. **No external I/O during replay** — Simulated agents read from the snapshot, not from the live system
6. **No timing dependencies in STRICT mode** — All timestamps are replayed from recorded data, not from `Date.now()`

### Divergence Detection

When the replay result differs from the originally recorded outcome:

| Severity | Meaning | Example |
|----------|---------|---------|
| `minor` | Cosmetic difference, does not affect outcomes | Slightly different log message wording |
| `major` | Behavioral difference, but outcome is equivalent | Agent takes a different path to the same result |
| `critical` | Outcome differs fundamentally | Agent produces a different file mutation |

In STRICT mode, ANY divergence (even minor) is flagged. In APPROXIMATE mode, only major and critical divergences are flagged.

## Service Registration

| # | Service | Dependencies | Phase |
|---|---------|-------------|-------|
| 17 | IExecutionReplayService | ExecutionGraph, AIExecution, AgentOrchestrator, ProcessOrchestrator, Context, GlobalBrain, UnifiedState, Observability, Stabilization | 11 |

## Files

| File | Purpose |
|------|---------|
| `common/replayEngine.ts` | All interfaces, types, enums for Tasks 1-10 (1225 lines) |
| `browser/executionReplayService.ts` | Full runtime implementation |
| `browser/phase11Validation.ts` | 10 validation tests |

## Interface Summary

| Interface | Task | Fields/Methods |
|-----------|------|----------------|
| `IReplaySeed` | 4 | id, value, snapshotId, createdAt, description |
| `IDeterministicReplayResult` | 4 | deterministic, mode, seed, divergences, durationMs |
| `IReplayDivergence` | 4 | aspect, expected, actual, replayTimestamp, causalChain, severity |
| `ISystemSnapshot` | 2 | id, timestamp, label, layers, 6 layer fields, runtimePhase, stabilityState, complete, replaySeed, captureDurationMs |
| `IGraphSnapshotLayer` | 2 | nodeCount, edgeCount, scopeCount, nodesByType, recentNodeIds, pendingNodeIds, rollbackCapableNodeIds |
| `IContextSnapshotLayer` | 2 | totalEntries, entriesByDomain, freshnessDistribution, symbolCount, dependencyEdgeCount, hotspotCount |
| `IAgentSnapshotLayer` | 2 | activeAgentCount, agentsByState, activePlanCount, pendingApprovalCount, activeAgentIds, capabilityUsage |
| `IProcessSnapshotLayer` | 2 | activeSessionCount, sessionsByMode, sessionsByState, activeSessionIds, totalOutputChunks, supervisedCount |
| `IIntentSnapshotLayer` | 2 | activeIntentCount, intentsByResolution, intentsBySource, intentsByActionType, activeIntentIds, maxChainDepth |
| `IBrainSnapshotLayer` | 2 | loopPhase, healthStatus, activeDecisionCount, activeConflictCount, currentCheckpointId, backpressureLevel, eventBusThroughput, tickNumber |
| `IExecutionTimelineEvent` | 3 | id, timestamp, source, category, description, causedByEventId, intentId, agentId, processSessionId, graphNodeId, data, hasSideEffects, nearestSnapshotId |
| `ITimelineSegment` | 3 | fromTimestamp, toTimestamp, events, eventCount, intentCount, agentCount, processCount, snapshotIds |
| `ITimelineFilter` | 3 | sources, categories, intentId, agentId, processSessionId, fromTimestamp, toTimestamp, hasSideEffects, limit |
| `IAgentSimulationResult` | 5 | agentId, simulatedPlan, simulatedDecisions, wouldRequestApproval, wouldViolatePolicy, wouldSucceed, estimatedDurationMs, estimatedMutationCount, estimatedImpact, deterministic, seed |
| `ISimulatedPlan` | 5 | stepCount, stepDescriptions, affectedFiles, requiredCapabilities, riskLevel, rollbackPossible |
| `ISimulatedDecision` | 5 | decisionPoint, choice, reasoning, confidence, alternatives |
| `IProcessSimulationResult` | 6 | sessionId, command, simulatedExitCode, simulatedOutput, simulatedLifecycle, wouldSucceed, simulatedDurationMs, possibleFailurePaths, wouldTriggerRestart, deterministic, seed |
| `ISimulatedOutputChunk` | 6 | text, channel, simulatedTimestamp, classification |
| `ISimulatedLifecycleTransition` | 6 | from, to, simulatedTimestamp, reason |
| `ISimulatedFailurePath` | 6 | description, exitCode, output, handledByRestartPolicy, probability |
| `IStateReconstructionResult` | 7 | targetTimestamp, baseSnapshotId, replayedEvents, reconstructedSnapshot, exact, eventsReplayed, reconstructionDurationMs, complete, missingData |
| `IReconstructionGap` | 7 | layer, description, fromTimestamp, toTimestamp, approximable |
| `ISnapshotDiff` | 8 | snapshotAId, snapshotBId, timestampA, timestampB, changes, changeCount, changesByLayer, changesBySeverity, causalChains, changesExpected, unexpectedChanges |
| `ISnapshotChange` | 8 | layer, aspect, valueA, valueB, isAddition, isRemoval, causingIntentId, causingEventId, severity, expected |
| `ICausalChain` | 8 | id, rootCause, chain, intentIds, subsystems, effect, complete |
| `IDebugSession` | 9 | id, intentId, fromTimestamp, toTimestamp, currentTimestamp, currentStep, totalSteps, paused, events, currentCausalTrace, snapshotIds |
| `ICausalTrace` | 9 | id, rootIntent, agentDecisions, processExecutions, graphMutations, fileMutations, eventChain, explanation |
| `IWhyResolution` | 9 | targetEvent, rootCause, causalChain, explanation, initiatingIntent, executingAgentId, executingProcessId, expectedOutcome, alternativeOutcomes |
| `IExecutionTimelineViewModel` | 10 | segments, totalEvents, fromTimestamp, toTimestamp, snapshotMarkers, intentMarkers |
| `ISnapshotMarker` | 10 | timestamp, snapshotId, label, complete |
| `IIntentMarker` | 10 | timestamp, intentId, actionType, resolution, source |
| `IReplayControllerViewModel` | 10 | currentPosition, playing, speed, mode, totalDuration, currentStep, totalSteps, snapshotCount, debugSessionId |
| `ISnapshotInspectorViewModel` | 10 | snapshot, layerSummaries, hasPreviousDiff, hasNextDiff |
| `ICausalTraceViewModel` | 10 | trace, steps |
| `ICausalTraceStep` | 10 | stepIndex, event, subsystem, description, connectedToNext, connectionType |
| `IDiffViewerViewModel` | 10 | snapshotAId, snapshotBId, diff, layerTabs |
| `IReplayStatus` | sys | active, replayMode, snapshotCount, timelineEventCount, debugSessionCount, autoCaptureActive, lastSnapshotTimestamp, divergencesDetected, mutationLeakDetected |
| `IReplayIntegrityCheck` | sys | passed, mutationLeakCount, sideEffectCount, runtimeStateUntouched, checkedAt, details |

## Enum Summary

| Enum | Values | Task |
|------|--------|------|
| `ReplayMode` | `Strict`, `Approximate` | 4 |
| `SnapshotLayer` | `Graph`, `Context`, `Agent`, `Process`, `Intent`, `Brain` | 2 |
| `TimelineEventSource` | `ExecutionGraph`, `ExecutionService`, `AgentOrchestrator`, `ProcessOrchestrator`, `ContextEngine`, `GlobalBrain`, `UnifiedState`, `Stabilization` | 3 |
| `TimelineEventCategory` | `Mutation`, `AgentLifecycle`, `ProcessLifecycle`, `ContextUpdate`, `GraphChange`, `Decision`, `Conflict`, `StateTransition`, `HealthStability`, `IntentLifecycle` | 3 |

## System-Wide Methods

| Method | Purpose |
|--------|---------|
| `replayActive` | Whether replay is currently active |
| `mutationLeakDetected` | Whether any mutations have leaked into the real runtime |
| `getReplayStatus()` | Comprehensive replay system status |
| `validateNoRuntimeInterference()` | Integrity check verifying zero runtime interference |
