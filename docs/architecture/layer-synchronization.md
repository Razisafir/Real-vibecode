# Layer Synchronization — Architecture

## Overview

The Layer Synchronization Service (`ILayerSynchronizationService`, #63) ensures that the observable state of every layer in the system remains consistent with every other layer. Where the Intent Alignment Service ensures layers agree on *what they are trying to do*, and the Coherence Engine ensures layers are *logically consistent*, the Layer Synchronization Service ensures that their *actual state data* matches — that the UX layer is showing the same execution state that the Execution layer is actually in, that the Human Workflow layer's gate states reflect the real system state, and that the Replay layer's historical view accurately reflects what truly happened.

Without layer synchronization, the system develops the most frustrating class of bugs: stale UI that shows completed tasks as running, approval gates that appear for already-cancelled operations, and replay views that diverge from what actually occurred. These are not logic errors — each layer is internally consistent — but cross-layer state drift that degrades the user experience and erodes trust in the system.

The Layer Synchronization Service implements a continuous synchronization loop that detects state drift between layers, applies corrections, and reconciles conflicting state snapshots. It guarantees that no layer operates on stale or conflicting data for more than a bounded time window.

## SyncStatus Enum

The `SyncStatus` enum represents the current synchronization state between any pair of layers:

| Status | Meaning | Maximum Duration Before Escalation |
|--------|---------|-------------------------------------|
| `Synchronized` | All layer states agree, no drift detected | — (stable state) |
| `Drifting` | Minor state differences detected, correction in progress | 5 seconds |
| `Desynchronized` | Significant state disagreement, active reconciliation required | 15 seconds |
| `Reconciling` | Previously desynchronized, now applying state corrections | 30 seconds |

### Status Transition Diagram

```
                    ┌───────────────┐
         ┌─────────►│ Synchronized  │◄──────────────────────┐
         │          └───────┬───────┘                        │
         │                  │ state drift detected            │
         │                  ▼                                 │
         │          ┌───────────────┐                         │
         │    ┌────►│   Drifting    │────────────────────────┐│
         │    │     └───────┬───────┘   auto-correct         ││
         │    │             │ drift worsens                  ││
         │    │             ▼                                ││
         │    │     ┌────────────────┐                       ││
         │    │     │Desynchronized  │───────────────────────┐││
         │    │     └───────┬────────┘  forced reconcile    │││
         │    │             │ reconciliation initiated       │││
         │    │             ▼                                │││
         │    │     ┌────────────────┐   sync restored      │││
         │    └─────│  Reconciling   │──────────────────────┘││
         │          └────────────────┘                       ││
         │                                                   ││
         └───────────────────── timeout escalation ──────────┘│
                                                              │
         ┌───────────────────── manual resolution ────────────┘
         │
         └── After reconciliation: return to Synchronized
```

## Synchronization Domains

The service synchronizes state across four primary domains, each with its own consistency requirements and reconciliation strategies:

### 1. Execution ↔ UX State Sync

Ensures that every element displayed in the UI accurately reflects the actual execution state. This is the most visible synchronization domain because users directly perceive any drift here.

| State Element | Sync Direction | Consistency Requirement |
|--------------|---------------|------------------------|
| Plan execution status | Execution → UX | UX must reflect within 200ms |
| Active agent count | Execution → UX | UX must reflect within 500ms |
| File mutation progress | Execution → UX | UX must reflect within 100ms |
| Terminal output | Execution → UX | Streaming, near-real-time |
| User action availability | UX → Execution | Execution must respond within 50ms |
| Error states | Execution → UX | Immediate (Critical priority signal) |

### 2. Human Workflow ↔ System State Sync

Ensures that human approval gates, review queues, and workflow steps reflect the actual state of the system. Stale workflow state causes humans to make decisions based on outdated information, which is the most dangerous form of cross-layer drift.

| State Element | Sync Direction | Consistency Requirement |
|--------------|---------------|------------------------|
| Approval gate status | System → Human | Gate must close within 500ms of resolution |
| Review queue contents | System → Human | Queue must update within 1s of change |
| Workflow step validity | System → Human | Invalid steps must be removed within 2s |
| Human decision propagation | Human → System | Decision must propagate within 100ms |
| Escalation state | System → Human | Immediate (Critical priority signal) |

### 3. Replay ↔ Execution State Sync

Ensures that the replay layer's historical view accurately reflects what actually happened during execution. This is critical for debugging and auditing — any divergence means the replay is lying about the past.

| State Element | Sync Direction | Consistency Requirement |
|--------------|---------------|------------------------|
| Event sequence | Execution → Replay | Causal ordering must be preserved |
| State snapshots | Execution → Replay | Snapshot within 5s of real state |
| Decision audit trail | Execution → Replay | All decisions recorded before next tick |
| Time-travel markers | Replay → Execution | Marker positions must be verifiable |

### 4. Stability ↔ All Layers Sync

Ensures that stability throttling and resource management state is consistently reflected across all layers. When stability throttles an operation, no layer should be able to bypass or ignore that throttle.

| State Element | Sync Direction | Consistency Requirement |
|--------------|---------------|------------------------|
| Throttle level | Stability → All | All layers must reflect within 500ms |
| Resource limits | Stability → All | All layers must enforce within 200ms |
| Recovery state | Stability → All | State changes reflected within 1s |

## Synchronization Loop Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│                    LAYER SYNCHRONIZATION SERVICE                      │
│                                                                      │
│  ┌───────────────────────────────────────────────────────────────┐   │
│  │                    SYNC LOOP (continuous)                      │   │
│  │                                                               │   │
│  │   ┌──────────┐    ┌──────────────┐    ┌────────────────┐     │   │
│  │   │  Snapshot │───►│   Drift      │───►│  Correction    │     │   │
│  │   │  Capture  │    │   Detection  │    │  Application   │     │   │
│  │   └──────────┘    └──────────────┘    └───────┬────────┘     │   │
│  │        ▲                                      │              │   │
│  │        │          ┌──────────────┐            │              │   │
│  │        │          │  Verification│◄───────────┘              │   │
│  │        │          │  (confirm    │                            │   │
│  │        └──────────│  correction) │────────────────────────┐   │   │
│  │                     └──────────────┘                      │   │   │
│  │                                                           │   │   │
│  └───────────────────────────────────────────────────────────┘   │   │
│                                                                  │   │
│  ┌─────────────────────┐    ┌─────────────────────────────┐     │   │
│  │  Drift Correction   │    │  State Reconciliation       │     │   │
│  │  Strategies         │    │  Engine                     │     │   │
│  │                     │    │                             │     │   │
│  │  • Push-based sync  │    │  • Three-way merge          │     │   │
│  │  • Pull-based sync  │    │  • Last-writer-wins         │     │   │
│  │  • Delta sync       │    │  • Source-of-truth override │     │   │
│  │  • Full state sync  │    │  • Human-mediated merge     │     │   │
│  └─────────────────────┘    └─────────────────────────────┘     │   │
└──────────────────────────────────────────────────────────────────────┘
```

### Sync Loop Timing

| Parameter | Default | Description |
|-----------|---------|-------------|
| `snapshotIntervalMs` | 500 | How often state snapshots are captured |
| `driftCheckIntervalMs` | 1000 | How often drift is detected |
| `correctionApplyTimeoutMs` | 2000 | Maximum time to apply a correction |
| `verificationIntervalMs` | 2000 | How often corrections are verified |
| `reconciliationTimeoutMs` | 15000 | Maximum time in Reconciling status |
| `escalationTimeoutMs` | 30000 | Maximum drift before human escalation |

## Drift Correction Strategies

The service applies different correction strategies depending on the nature and severity of the drift:

### Push-Based Synchronization
Used when the source-of-truth layer has changed and downstream layers need to be updated. The correction is pushed from the authoritative layer to the stale layer. Example: Execution completes a plan, UX is updated to show completion.

### Pull-Based Synchronization
Used when a downstream layer detects it may be stale and proactively requests a state refresh from the source-of-truth layer. Example: UX detects it hasn't received an update in 2 seconds and requests a full state refresh.

### Delta Synchronization
Used for high-frequency state changes where full-state sync would be too expensive. Only the differences between the last known state and the current state are transmitted. Example: Streaming file mutation progress updates.

### Full State Synchronization
Used when drift is severe and the integrity of incremental updates cannot be trusted. The entire state of the source-of-truth layer is serialized and applied to the stale layer. Example: After a network interruption or layer restart.

## State Reconciliation

When two layers have conflicting state that cannot be resolved by simple push or pull synchronization, the State Reconciliation Engine applies more sophisticated strategies:

| Strategy | When Used | Mechanism |
|----------|-----------|-----------|
| Three-way merge | Both layers have diverged from a common ancestor | Compare both states against last-known-good, merge non-conflicting changes, flag conflicts |
| Last-writer-wins | Both layers have different values for the same state element | The layer with the most recent timestamp wins |
| Source-of-truth override | One layer is designated authoritative for this state element | The authoritative layer's value always wins |
| Human-mediated merge | Both layers have conflicting but equally valid states | Present conflict to human operator for resolution |

## Service Registration

| # | Service | Dependencies | Phase |
|---|---------|-------------|-------|
| 63 | ILayerSynchronizationService | CrossLayerSignalBus, SystemCoherenceEngine, SystemIntentAlignment, GlobalEventNormalization | 17 |

## Interface Contract

```typescript
interface ILayerSynchronizationService {
  readonly syncStatus: ReadonlyMap<LayerPair, SyncStatus>;
  readonly lastSyncTimestamp: Date;
  readonly activeReconciliations: ReadonlyArray<IReconciliation>;

  getLayerState(layer: Layer): ILayerStateSnapshot;
  syncLayers(source: Layer, target: Layer, strategy?: SyncStrategy): Promise<ISyncResult>;
  forceReconciliation(pair: LayerPair, strategy: ReconciliationStrategy): Promise<IReconciliationResult>;
  subscribeToSyncChanges(observer: ISyncObserver): IDisposable;
}
```

## Files

| File | Purpose |
|------|---------|
| `common/layerSynchronization.ts` | All interfaces, types, enums (SyncStatus, SyncStrategy, ReconciliationStrategy) |
| `browser/layerSynchronizationService.ts` | Full runtime implementation with sync loop and reconciliation engine |
| `browser/phase17SyncValidation.ts` | Validation tests for synchronization, drift correction, and reconciliation |
