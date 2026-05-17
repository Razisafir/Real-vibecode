# System Coherence Engine — Architecture

## Overview

The System Coherence Engine (`ISystemCoherenceEngineService`, #60) is the central guardian of cross-layer consistency in the Phase 17 Unification Bridge Layer. As the system grew through 16 phases — from bare execution (Phases 1–11) through stability (Phase 12), UX (Phases 13–15), and human workflow (Phase 16) — each layer developed its own state models, event semantics, and operational assumptions. The Coherence Engine detects and resolves the inevitable inconsistencies that arise when these independently-evolved layers interact, ensuring that the UX layer, Execution layer, and Human Workflow layer remain aligned at all times.

Without this service, cross-layer drift silently accumulates: the UI shows a plan as "running" while the execution layer has already completed it; a human approval gate fires for a task the system already cancelled; the stability layer throttles operations the UX layer is actively promoting. The Coherence Engine prevents these layer isolation bugs by continuously validating that every layer's view of reality agrees with every other layer's view, and by automatically resolving conflicts when they are detected.

## CoherenceStatus Enum

The `CoherenceStatus` enum represents the system's current level of cross-layer consistency:

| Status | Meaning | Response |
|--------|---------|----------|
| `Coherent` | All layers agree on system state, no drift detected | Normal operation |
| `MinorDrift` | Small inconsistencies detected (e.g., UI label slightly behind execution state) | Auto-corrected within next sync cycle |
| `MajorDrift` | Significant disagreement between layers (e.g., UX shows active execution that stability has throttled) | Forced reconciliation, alerts emitted |
| `Incoherent` | Layers fundamentally disagree (e.g., human workflow awaiting input for cancelled intent) | Emergency alignment, human notification required |
| `Recovering` | Previously incoherent, now actively reconciling toward coherence | Monitoring only, no new mutations |

### Status Transition Diagram

```
                    ┌───────────┐
          ┌────────►│ Coherent  │◄──────────────────┐
          │         └─────┬─────┘                     │
          │               │ minor inconsistency       │
          │               ▼                            │
          │        ┌────────────┐                      │
          │   ┌───►│ MinorDrift │──────────────────────┤
          │   │    └─────┬──────┘  auto-correct        │
          │   │          │ escalation                  │
          │   │          ▼                             │
          │   │    ┌────────────┐                      │
          │   │    │ MajorDrift │──────────────────────┤
          │   │    └─────┬──────┘  forced reconcile    │
          │   │          │ critical escalation         │
          │   │          ▼                             │
          │   │    ┌────────────┐                      │
          │   │    │ Incoherent │                      │
          │   │    └─────┬──────┘                      │
          │   │          │ alignment initiated          │
          │   │          ▼                             │
          │   │    ┌────────────┐   coherence restored  │
          │   └────│ Recovering │───────────────────────┘
          │        └────────────┘
          │
          └── Any status auto-recovers to Coherent when all layer checks pass
```

## Cross-Layer Inconsistency Detection

### Detection Domains

The Coherence Engine monitors five primary consistency domains:

| Domain | What It Checks | Example Violation |
|--------|---------------|-------------------|
| State Consistency | Execution state matches UX displayed state | UX shows "running" but execution completed |
| Intent Alignment | All layers agree on the current system intent | Human workflow awaits approval for a cancelled intent |
| Resource Coherence | Stability throttling agrees with UX/Execution needs | Stability throttled a resource the UX is actively promoting |
| Workflow Consistency | Human workflow gates reflect actual system needs | Approval gate present for an auto-approved intent class |
| Temporal Coherence | Event ordering is consistent across layers | Replay shows events in different order than execution |

### Detection Mechanisms

```
┌──────────────────────────────────────────────────────────────┐
│                   COHERENCE ENGINE                            │
│                                                              │
│  ┌─────────────────┐    ┌─────────────────┐                  │
│  │  Periodic Scan   │    │  Event-Driven   │                  │
│  │  (every 2s)      │    │  Check           │                  │
│  └────────┬────────┘    └────────┬────────┘                  │
│           │                      │                            │
│           ▼                      ▼                            │
│  ┌─────────────────────────────────────────┐                  │
│  │         Inconsistency Detector           │                  │
│  │                                         │                  │
│  │  • State snapshot comparison             │                  │
│  │  • Intent vector divergence calculation  │                  │
│  │  • Resource allocation conflict check    │                  │
│  │  • Workflow gate validity verification   │                  │
│  │  • Temporal ordering validation          │                  │
│  └──────────────────┬──────────────────────┘                  │
│                     │                                        │
│                     ▼                                        │
│  ┌─────────────────────────────────────────┐                  │
│  │         Conflict Resolver                │                  │
│  │                                         │                  │
│  │  Minor → Auto-correct                   │                  │
│  │  Major → Forced reconciliation          │                  │
│  │  Incoherent → Emergency alignment       │                  │
│  └──────────────────┬──────────────────────┘                  │
│                     │                                        │
│                     ▼                                        │
│  ┌─────────────────────────────────────────┐                  │
│  │         Coherence Report                 │                  │
│  │                                         │                  │
│  │  • Current CoherenceStatus              │                  │
│  │  • Affected layers                      │                  │
│  │  • Resolution actions taken             │                  │
│  │  • Remaining drifts (if any)            │                  │
│  └─────────────────────────────────────────┘                  │
└──────────────────────────────────────────────────────────────┘
```

## Conflict Resolution Strategy

The Coherence Engine applies a layered resolution strategy based on the severity and nature of the inconsistency:

### Resolution Priority Order

1. **Safety First**: If any inconsistency could lead to data loss or corruption, immediately pause the affected layer and enforce the execution layer's view as the source of truth.
2. **Human Override Preservation**: If a human workflow decision conflicts with an automated decision, the human decision always wins — even if it appears stale. The system must explicitly confirm with the human before overriding their intent.
3. **Stability Supremacy for Throttling**: When stability throttling conflicts with UX or execution demands, throttling wins. No UX prompt or execution request can bypass a stability throttle without explicit admin override.
4. **Execution as Source of Truth**: For state-level disagreements (is something running or not?), the execution layer is authoritative. UX and human workflow views must reconcile to match.
5. **Temporal Consistency**: For event ordering disagreements, the replay layer's canonical log is authoritative.

### Automatic Resolution Rules

| Conflict Type | Resolution | Notification |
|--------------|------------|-------------|
| UX state behind execution | Push execution state to UX | Trace log only |
| Execution state behind UX | Refresh execution from source | Debug log |
| Human gate for cancelled intent | Remove gate, notify human | Warning alert |
| Stability throttle vs. UX promotion | Enforce throttle, update UX | Warning alert |
| Cross-layer intent divergence | Align to execution intent | Info log |
| Temporal ordering mismatch | Align to replay log | Debug log |

## Global System Intent Consistency

The Coherence Engine maintains a global intent consistency invariant: at any given time, the system should be able to articulate a single coherent "what the system is trying to do" statement that all layers agree on. This is verified by:

1. **Intent Vector Comparison**: Each layer publishes its current intent vector. The engine calculates the cosine similarity between all pairs. Below 0.8 triggers `MinorDrift`; below 0.5 triggers `MajorDrift`; below 0.2 triggers `Incoherent`.
2. **Goal Consistency Check**: Each layer's top-level goals are compared for mutual compatibility. If any layer's goals directly contradict another's, the system is `Incoherent`.
3. **Action-Intent Alignment**: Each layer's recent actions are checked against its stated intent. Actions that contradict stated intent indicate internal layer drift.

## Service Registration

| # | Service | Dependencies | Phase |
|---|---------|-------------|-------|
| 60 | ISystemCoherenceEngineService | CrossLayerSignalBus, SystemIntentAlignment, LayerSynchronization, GlobalEventNormalization, SystemStabilization | 17 |

## Interface Contract

```typescript
interface ISystemCoherenceEngineService {
  readonly currentStatus: CoherenceStatus;
  readonly lastCoherenceCheck: Date;
  readonly activeDrifts: ReadonlyArray<ICrossLayerDrift>;

  checkCoherence(): Promise<ICoherenceReport>;
  resolveDrift(driftId: string, strategy?: ResolutionStrategy): Promise<IResolutionResult>;
  forceReconciliation(layers?: Layer[]): Promise<IReconciliationReport>;
  subscribeToCoherenceChanges(observer: ICoherenceObserver): IDisposable;
}
```

## Files

| File | Purpose |
|------|---------|
| `common/systemCoherenceEngine.ts` | All interfaces, types, enums, CoherenceStatus definition |
| `browser/systemCoherenceEngineService.ts` | Full runtime implementation with periodic scanning and event-driven detection |
| `browser/phase17CoherenceValidation.ts` | Validation tests for coherence detection and resolution |
