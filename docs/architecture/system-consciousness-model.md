# System Consciousness Model — Architecture

## Overview

The System Consciousness Model (`ISystemConsciousnessModelService`, #69) provides a unified, structural observability layer for the entire 69-service system. Despite its name, this service has **nothing to do with consciousness, sentience, or awareness in any cognitive or philosophical sense**. The name is deliberately metaphorical — it describes the service's function of producing a single, coherent "picture" of what the system is doing at any given moment, analogous to how a dashboard provides "visibility" into system state without implying the dashboard can see.

This service exists because, across 69 services spanning 17 phases, it became impossible for any single developer, operator, or automated system to maintain a mental model of what the system is doing, what it depends on, and what it is paying attention to. The Consciousness Model solves this by continuously maintaining four structural artifacts: a system goal state map, a cross-layer awareness map, a dependency awareness graph, and a system attention map. These are purely metadata structures — they describe the system's structure and activity, they never influence it.

**Critical architectural constraint: The System Consciousness Model is for observability ONLY. It NEVER makes decisions, NEVER triggers actions, NEVER influences system behavior, and NEVER feeds back into any control loop.** Any attempt to use its output as input to another service's decision-making is an architectural violation that must be detected and prevented.

## What This Service Is NOT

Before describing what the service does, it is essential to be explicit about what it does not do:

| Prohibition | Rationale |
|-------------|-----------|
| No sentience | The service does not "think," "understand," or "perceive." It computes metadata from structured inputs. |
| No decision-making | The service never chooses actions, routes, or priorities. It only describes what other services have chosen. |
| No control feedback | The service's output is never used as input to any control system, recovery action, or operational decision. |
| No predictive inference beyond structure | The service tracks what IS active, not what SHOULD BE active. It does not predict optimal configurations. |
| No emotional or cognitive modeling | The service models system structure, not system "feelings" or "intentions." |
| No anthropomorphic behavior | The service does not use first-person language, does not "monitor" in a human sense, and does not produce narrative descriptions of system activity. |

### Enforcement Mechanism

The no-decision-making constraint is enforced through three mechanisms:

1. **Type-level enforcement**: The service's output types are all `Readonly` — they cannot be fed into any service that expects a mutable command type. There is no `IConsciousnessCommand` or `IConsciousnessDecision` type.
2. **Dependency enforcement**: No other service lists `ISystemConsciousnessModelService` as a dependency in the DI container. The service is a pure consumer of health reports and state snapshots, not a producer of actionable intelligence.
3. **Code review gate**: Any PR that imports from `systemConsciousnessModel.ts` in a service implementation file (as opposed to a diagnostic or logging file) is automatically flagged for review.

## Structural Artifacts

The service maintains four structural artifacts that together provide a complete picture of the system's operational topology:

### 1. System Goal State Map

The goal state map tracks what each part of the system is currently trying to accomplish. This is not a planning tool — it is a pure observation of the goals that other services have already set for themselves.

```typescript
interface ISystemGoalStateMap {
  readonly snapshotTime: number;
  readonly goals: ReadonlyMap<string, ISystemGoal>;  // serviceId → goal
  readonly goalConflicts: ReadonlyArray<IGoalConflict>;  // mutually exclusive goals
  readonly goalCoverage: number;  // 0-1: what fraction of services have active goals
}

interface ISystemGoal {
  readonly serviceId: string;
  readonly goalDescription: string;    // Functional, never narrative
  readonly goalPriority: number;       // As reported by the owning service
  readonly goalProgress: number;       // 0-1 as reported by the owning service
  readonly goalDependencies: ReadonlyArray<string>;  // Other goals this depends on
  readonly goalState: 'Active' | 'Blocked' | 'Completed' | 'Abandoned';
}
```

The goal state map is useful for answering questions like: "What is the system currently working on?" "Are there any conflicting goals between services?" "Which services are blocked and why?"

### 2. Cross-Layer Awareness Map

The awareness map tracks which layers are currently aware of which other layers' states. This is not about what layers SHOULD be aware of — it is about what they ARE aware of, based on their actual signal consumption and context subscriptions.

```typescript
interface ICrossLayerAwarenessMap {
  readonly snapshotTime: number;
  readonly awareness: ReadonlyMap<Layer, ReadonlySet<Layer>>;  // layer → set of layers it's aware of
  readonly awarenessGaps: ReadonlyArray<IAwarenessGap>;        // layers that should know but don't
  readonly awarenessLatency: ReadonlyMap<string, number>;       // "layerA→layerB" → ms delay
  readonly lastSignalTimestamps: ReadonlyMap<string, number>;   // "layerA→layerB" → last signal time
}

interface IAwarenessGap {
  readonly sourceLayer: Layer;
  readonly targetLayer: Layer;
  readonly expectedAwareness: boolean;    // Based on signal bus routing rules
  readonly actualAwareness: boolean;      // Based on recent signal consumption
  readonly gapDurationMs: number;         // How long the gap has existed
}
```

The awareness map is useful for answering questions like: "Is the UX layer currently aware of the stability layer's throttle state?" "Which layers are operating with stale information about other layers?" "Are there any signal routing failures between layers?"

### 3. Dependency Awareness Graph

The dependency awareness graph models the structural dependencies between services — which services depend on which other services for their operation. Unlike the DI dependency graph (which captures code-level dependencies), this captures runtime dependency relationships: service A depends on service B because it needs B's output to function correctly.

```typescript
interface IDependencyAwarenessGraph {
  readonly snapshotTime: number;
  readonly nodes: ReadonlyMap<string, IDependencyNode>;   // serviceId → node
  readonly edges: ReadonlyArray<IDependencyEdge>;         // dependency relationships
  readonly criticalPaths: ReadonlyArray<ReadonlyArray<string>>;  // highest-impact dependency chains
  readonly orphanServices: ReadonlyArray<string>;         // services with no dependencies (watch list)
}

interface IDependencyNode {
  readonly serviceId: string;
  readonly serviceNumber: number;        // 1-69
  readonly layer: Layer;
  readonly health: number;               // From Health Orchestrator
  readonly activeDependents: number;     // How many services depend on this one
  readonly dependencyDepth: number;       // Longest dependency chain this service is part of
}

interface IDependencyEdge {
  readonly fromService: string;
  readonly toService: string;
  readonly dependencyType: 'Hard' | 'Soft' | 'Optional';
  readonly healthImpact: number;          // How much the dependent's health is affected if this dependency fails (0-1)
}
```

The dependency graph is useful for answering questions like: "Which service has the most dependents?" "What is the blast radius of a failure in service #60?" "Which dependency chains represent the highest risk?"

### 4. System Attention Map

The attention map tracks which services are currently active (processing, computing, responding) versus idle (waiting, quiescent, dormant). This provides a real-time view of where the system is expending computational effort.

```typescript
interface ISystemAttentionMap {
  readonly snapshotTime: number;
  readonly activeServices: ReadonlySet<string>;       // Services currently doing work
  readonly idleServices: ReadonlySet<string>;         // Services waiting for input
  readonly dormantServices: ReadonlySet<string>;      // Services in minimal-power state
  readonly attentionDistribution: ReadonlyMap<Layer, number>;  // layer → fraction of active services
  readonly hotspotServices: ReadonlyArray<string>;    // Services with sustained high activity (>80% for >30s)
  readonly coldSpotServices: ReadonlyArray<string>;   // Services with zero activity for >60s (unexpected)
}
```

The attention map is useful for answering questions like: "Is the system currently compute-bound or IO-bound?" "Which layer is consuming the most attention?" "Are there services that should be active but aren't?" "Are there services that have been running hot for too long?"

## Attention Map Visualization (Structural Only)

```
┌─────────────────────────────────────────────────────────────────────┐
│                  SYSTEM ATTENTION MAP (Snapshot)                     │
│                                                                     │
│  Execution Layer (Services 1-11)                                    │
│  ████████░░  8/11 active  (Graph: ████ Agents: ██ Replay: █░)      │
│                                                                     │
│  Stability Layer (Service 12 family)                                │
│  ██░░░░░░░░  2/10 active  (Throttle: ██ Stabilization: ░░)         │
│                                                                     │
│  UX Layer (Services 13-15)                                          │
│  ██████░░░░  6/10 active  (Render: ███ Adaptive: ██ Surfaces: █)   │
│                                                                     │
│  Human Workflow Layer (Services 50-59)                              │
│  ████░░░░░░  4/10 active  (Momentum: ██ Recovery: █ Memory: █)     │
│                                                                     │
│  Unification Layer (Services 60-69)                                 │
│  ████████░░  8/10 active  (Coherence: ██ Signal: ██ Health: ██)    │
│                                                                     │
│  System Attention: 28/51 active (54.9%)                             │
│  Hotspot: [execution-graph, signal-bus]                             │
│  Coldspot: [work-rhythm]                                            │
│                                                                     │
│  NOTE: This is structural metadata for observability.               │
│  It does NOT drive any decisions or control actions.                │
└─────────────────────────────────────────────────────────────────────┘
```

## Data Flow and Freshness

| Artifact | Update Trigger | Update Frequency | Data Source |
|----------|---------------|-----------------|-------------|
| Goal State Map | On-demand + periodic | Every 10s (periodic), on any goal change (event) | Service health reports, intent state publications |
| Awareness Map | On-demand + periodic | Every 5s (periodic), on any signal bus event | Signal bus routing logs, subscription registry |
| Dependency Graph | On-demand + periodic | Every 60s (periodic), on service registration change | DI container metadata, runtime dependency probes |
| Attention Map | On-demand + frequent | Every 2s (periodic), on any service state change | Service heartbeats, CPU/memory telemetry |

All artifacts are immutable snapshots. When a snapshot is requested, the current state is captured and returned. Subsequent changes do not modify the returned snapshot.

## Integration with Other Phase 17 Services

The Consciousness Model is the final service (#69) in the system, and it occupies a unique position: it is the only service that consumes from ALL other services without producing anything that any other service consumes. This makes it a pure leaf node in the dependency graph — a structural property that reinforces its observability-only constraint.

| Integration Point | Direction | Purpose |
|------------------|-----------|---------|
| Health Orchestrator (#68) | Read | Consumes health scores for dependency graph node health |
| Context Merger (#66) | Read | Consumes merged context for awareness map computation |
| Signal Bus (#61) | Read | Consumes signal routing logs for awareness latency |
| Coherence Engine (#60) | Read | Consumes coherence status for goal conflict detection |
| All 69 services | Read | Consumes heartbeat and state for attention map |

### Read-Only Guarantee

The service uses a dedicated read-only interface for each integration point. It never calls methods that mutate state, emit signals, or trigger actions. If a source service does not provide a read-only query interface, the Consciousness Model subscribes to that service's event stream passively instead of calling its API directly.

## Service Registration

| # | Service | Dependencies | Phase |
|---|---------|-------------|-------|
| 69 | ISystemConsciousnessModelService | GlobalSystemHealthOrchestrator, SystemContextMerger, CrossLayerSignalBus, SystemCoherenceEngine | 17 |

## Interface Contract

```typescript
interface ISystemConsciousnessModelService {
  // All methods return immutable snapshots — no side effects possible

  getGoalStateMap(): ISystemGoalStateMap;
  getAwarenessMap(): ICrossLayerAwarenessMap;
  getDependencyGraph(): IDependencyAwarenessGraph;
  getAttentionMap(): ISystemAttentionMap;
  getFullSnapshot(): IConsciousnessSnapshot;

  // Historical queries — for observability dashboards and debugging
  getGoalStateHistory(durationMs: number): ReadonlyArray<ITimestampedGoalStateMap>;
  getAttentionHistory(durationMs: number): ReadonlyArray<ITimestampedAttentionMap>;
}
```

## Files

| File | Purpose |
|------|---------|
| `common/systemConsciousnessModel.ts` | All interfaces, types, and structural artifact definitions. Includes explicit NO_SENTIENCE and NO_DECISION_MAKING comments. |
| `browser/systemConsciousnessModelService.ts` | Full runtime implementation. Read-only consumers only. No mutation methods. No control feedback. |
| `browser/phase17ConsciousnessValidation.ts` | Validation tests for structural artifact accuracy and no-decision-making enforcement |
