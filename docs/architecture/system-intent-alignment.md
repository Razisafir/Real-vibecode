# System Intent Alignment — Architecture

## Overview

The System Intent Alignment Service (`ISystemIntentAlignmentService`, #62) maintains a single, coherent answer to the question "what is the system trying to do right now?" across all layers of the Real-vibecode AI Execution System. In a unified operating system spanning Execution, UX, Stability, Replay, and Human Workflow layers, each layer naturally develops its own interpretation of the system's current goals. The Execution layer thinks it's running a build; the UX layer thinks it's presenting a diff review; the Human layer is waiting for approval on something already completed. These intent drifts are the root cause of the most confusing user experiences and the most dangerous automated behaviors.

The Intent Alignment Service continuously monitors each layer's stated intent, detects drift between them, and resolves misalignment automatically when it is safe to do so. When automatic resolution is unsafe — for example, when the human's intent conflicts with the execution layer's intent and both are plausible — the service escalates to the System Coherence Engine for human-in-the-loop resolution.

This service is the philosophical backbone of Phase 17. While the Cross-Layer Signal Bus handles the *mechanics* of cross-layer communication and the Layer Synchronization Service handles the *state* alignment, the Intent Alignment Service handles the *meaning* — ensuring that all layers understand and agree on the purpose behind the operations they are performing.

## IntentDomain Enum

Each intent belongs to a domain that identifies which layer or scope it originates from:

| Domain | Meaning | Primary Source Layer |
|--------|---------|---------------------|
| `Execution` | Intent related to code generation, file mutation, process execution | Execution (Phases 1–11) |
| `UX` | Intent related to user presentation, interaction, display state | UX (Phases 13–15) |
| `Human` | Intent related to human approval, review, workflow decisions | Human Workflow (Phase 16) |
| `Stability` | Intent related to system health, throttling, resource management | Stability (Phase 12) |
| `Replay` | Intent related to historical analysis, debugging, time-travel | Replay (Phase 11) |
| `Global` | Cross-cutting intent that spans all layers | System-wide |

### Domain Interaction Rules

Not all intent domains are equal. The Intent Alignment Service enforces a precedence hierarchy when resolving conflicts:

```
    ┌─────────────────────────────────┐
    │         Global Intent            │  ← Highest: system-wide goals
    ├─────────────────────────────────┤
    │        Stability Intent          │  ← Safety overrides everything
    ├─────────────────────────────────┤
    │         Human Intent             │  ← Human decisions beat automation
    ├─────────────────────────────────┤
    │        Execution Intent          │  ← Source of truth for operations
    ├─────────────────────────────────┤
    │          UX Intent               │  ← Presentation follows operations
    ├─────────────────────────────────┤
    │         Replay Intent            │  ← Passive observer only
    └─────────────────────────────────┘
```

This hierarchy means that when a Stability intent (e.g., "throttle all operations") conflicts with an Execution intent (e.g., "run this build"), the Stability intent wins. When a Human intent (e.g., "wait for my approval") conflicts with an Execution intent (e.g., "auto-execute this plan"), the Human intent wins. Replay intent never overrides any other domain — it is purely observational.

## Intent Drift Detection

### Intent Vector Model

Each layer publishes its current intent as an intent vector — a structured representation of what the layer believes the system is doing:

```typescript
interface IIntentVector {
  readonly domain: IntentDomain;
  readonly primaryGoal: string;         // Human-readable primary goal
  readonly goalEmbedding: number[];     // Semantic embedding for similarity calculation
  readonly activeIntents: ReadonlyArray<IActiveIntent>;  // All active intents in this domain
  readonly confidence: number;          // 0.0–1.0 confidence in this intent vector
  readonly timestamp: number;           // When this vector was last updated
}
```

### Drift Calculation

The service calculates drift between intent vectors using two complementary methods:

1. **Semantic Similarity**: The `goalEmbedding` vectors are compared using cosine similarity. This catches conceptual drift — where layers disagree on the meaning of what's happening.
2. **Structural Comparison**: The `activeIntents` arrays are compared for overlap and contradiction. This catches operational drift — where layers agree on the high-level goal but disagree on specific active intents.

| Drift Level | Semantic Similarity | Structural Overlap | Status |
|-------------|--------------------|--------------------|--------|
| Aligned | > 0.9 | > 80% overlap | No action |
| Minor Drift | 0.7–0.9 | 50–80% overlap | Auto-resolve |
| Major Drift | 0.4–0.7 | 20–50% overlap | Escalate for resolution |
| Severe Drift | < 0.4 | < 20% overlap | Emergency alignment |

### Drift Detection Cycle

```
┌──────────────────────────────────────────────────────────────────┐
│                  INTENT ALIGNMENT SERVICE                         │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐           │
│  │  Execution    │  │     UX       │  │    Human     │           │
│  │  Intent       │  │   Intent     │  │   Intent     │           │
│  │  Vector       │  │   Vector     │  │   Vector     │           │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘           │
│         │                 │                  │                    │
│         └────────┬────────┴──────────┬──────┘                   │
│                  │                   │                           │
│                  ▼                   ▼                           │
│  ┌────────────────────┐  ┌────────────────────┐                 │
│  │  Semantic Drift    │  │  Structural Drift  │                 │
│  │  Calculator        │  │  Calculator        │                 │
│  └─────────┬──────────┘  └─────────┬──────────┘                 │
│            │                       │                             │
│            └───────────┬───────────┘                             │
│                        │                                         │
│                        ▼                                         │
│            ┌────────────────────┐                                │
│            │  Alignment Resolver│                                │
│            │                    │                                │
│            │  Safe? → Auto-fix  │                                │
│            │  Unsafe? → Escalate│                                │
│            └────────┬───────────┘                                │
│                     │                                            │
│                     ▼                                            │
│            ┌────────────────────┐                                │
│            │  Aligned Global    │                                │
│            │  Intent Vector     │                                │
│            │  (single source of │                                │
│            │   truth)           │                                │
│            └────────────────────┘                                │
└──────────────────────────────────────────────────────────────────┘
```

## Automatic Misalignment Resolution

The Intent Alignment Service can automatically resolve certain classes of misalignment without human intervention. The key principle is safety: automatic resolution is only applied when the outcome is unambiguous and no human decision is being overridden.

### Safe Auto-Resolution Rules

| Misalignment Type | Resolution | Rationale |
|-------------------|-----------|-----------|
| UX behind Execution | Update UX intent to match Execution | UX should always reflect execution reality |
| Replay stale vs. Execution | Update Replay intent to reflect current | Replay is observational, must track reality |
| Stability override pending | Align all layers to Stability intent | Safety always wins |
| Human intent completed but not cleared | Clear completed human intent | Stale approvals shouldn't block progress |
| Multiple Execution sub-intents conflicting | Merge into parent intent with priority ordering | Internal execution conflicts are deterministic |

### Unsafe Scenarios (Escalation Required)

| Misalignment Type | Why Unsafe | Escalation Path |
|-------------------|-----------|-----------------|
| Human wants to pause, Execution wants to continue | Human agency at risk | Notify human, await response |
| UX promotes action, Stability has throttled | Safety vs. UX conflict | Enforce stability, notify UX team |
| Two layers have equally valid but different goals | No deterministic resolution | Present to human operator |
| Human intent conflicts with previous human intent | Cannot override human decisions automatically | Request clarification from human |

## Global Intent Vector

The service maintains a single Global Intent Vector that represents the system's unified understanding of its current goals. This vector is:

1. **Authoritative**: When any layer needs to know "what should I be doing?", it queries the Global Intent Vector.
2. **Derived**: The Global Intent Vector is not set by any single layer. It is computed from all layer intent vectors according to the precedence hierarchy.
3. **Observable**: Changes to the Global Intent Vector are published through the Cross-Layer Signal Bus so all layers can react.
4. **Auditable**: Every change to the Global Intent Vector is logged with a full derivation trace showing which layer intents contributed and how conflicts were resolved.

## Service Registration

| # | Service | Dependencies | Phase |
|---|---------|-------------|-------|
| 62 | ISystemIntentAlignmentService | CrossLayerSignalBus, SystemCoherenceEngine, GlobalExecutionBrain, GlobalDecisionEngine | 17 |

## Interface Contract

```typescript
interface ISystemIntentAlignmentService {
  readonly globalIntent: IGlobalIntentVector;
  readonly layerIntents: ReadonlyMap<IntentDomain, IIntentVector>;
  readonly currentDrift: IIntentDriftReport;

  getLayerIntent(domain: IntentDomain): IIntentVector;
  updateLayerIntent(domain: IntentDomain, intent: IIntentVector): Promise<IAlignmentResult>;
  forceAlignment(target: IntentDomain, reason: string): Promise<IAlignmentResult>;
  subscribeToIntentChanges(observer: IIntentObserver): IDisposable;
}
```

## Files

| File | Purpose |
|------|---------|
| `common/systemIntentAlignment.ts` | All interfaces, types, enums (IntentDomain, IIntentVector, IGlobalIntentVector) |
| `browser/systemIntentAlignmentService.ts` | Full runtime implementation with drift detection and auto-resolution |
| `browser/phase17IntentAlignmentValidation.ts` | Validation tests for intent drift detection and resolution |
