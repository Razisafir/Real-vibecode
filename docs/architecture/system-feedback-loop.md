# System Feedback Loop — Architecture

## Overview

The System Feedback Loop Service (`ISystemFeedbackLoopService`, #65) implements a closed, adaptive control system that enables the Real-vibecode AI Execution System to continuously adjust its behavior based on feedback from every layer. This is the mechanism that transforms the system from a collection of independently operating layers into a truly unified, self-regulating operating system.

The feedback loops operate in a specific direction: Execution produces behaviors that the UX layer adapts to; UX changes drive human behavioral adjustments; human actions feed back into workflow adaptation; and stability observations drive throttling changes. Each loop is closed — meaning the output of one stage feeds back as input to a previous stage — creating a continuous cycle of observation, adjustment, and verification.

The critical challenge of any closed-loop system is preventing oscillation and runaway feedback. If the Execution layer speeds up in response to UX feedback, and the UX layer simplifies in response to faster execution, and the human approves faster because the UX is simpler, and the Execution speeds up further — the system can enter a positive feedback spiral that ends in instability. The Feedback Loop Service includes explicit oscillation detection, damping mechanisms, and circuit breakers to prevent this.

## FeedbackDirection Enum

The `FeedbackDirection` enum captures the directional flow of each feedback loop. Every feedback signal must declare its direction, enabling the service to apply direction-specific rules, rate limiting, and oscillation detection:

| Direction | Flow | What It Carries | Example |
|-----------|------|-----------------|---------|
| `ExecutionToUX` | Execution → UX | Execution behavior observations that drive UX adaptation | Execution is producing frequent small mutations → UX should batch display updates |
| `UXToHuman` | UX → Human Workflow | UX behavioral patterns that inform human workflow adjustments | UX shows users consistently approving certain intent types → suggest auto-approval |
| `HumanToWorkflow` | Human → Workflow Engine | Human decision patterns that drive workflow optimization | Humans always modify auto-generated plans in the same way → adjust plan generation strategy |
| `StabilityToThrottle` | Stability → Throttling Engine | System health observations that drive throttle adjustments | Memory usage rising → reduce concurrent execution count |
| `ClosedLoop` | Full cycle | Signals that have completed an entire feedback circuit | Execution → UX → Human → Workflow → Execution (one full revolution) |

### Feedback Loop Topology

```
┌─────────────────────────────────────────────────────────────────────┐
│                                                                     │
│    ┌──────────────┐    ExecutionToUX    ┌──────────────┐           │
│    │  Execution   │────────────────────►│     UX       │           │
│    │   Layer      │                     │    Layer      │           │
│    └──────┬───────┘                     └──────┬───────┘           │
│           ▲                                    │                    │
│           │                                    │ UXToHuman          │
│           │                                    ▼                    │
│    ┌──────┴───────┐                     ┌──────────────┐           │
│    │  Workflow    │◄────────────────────│    Human     │           │
│    │   Engine     │   HumanToWorkflow   │  Workflow    │           │
│    └──────┬───────┘                     └──────────────┘           │
│           │                                                        │
│           │  Workflow drives new Execution                          │
│           │  (closes the loop)                                      │
│           │                                                        │
│           │         ┌──────────────┐                                │
│           └────────►│  Stability   │────────────────┐               │
│                     │    Layer     │                │               │
│                     └──────────────┘   StabilityToThrottle          │
│                           ▲                          │               │
│                           │                          ▼               │
│                     Throttle feedback          ┌──────────────┐     │
│                     (moderates all layers)     │  Throttling  │     │
│                                              │    Engine     │     │
│                                              └──────┬───────┘     │
│                                                     │              │
│                                                     │ applies      │
│                                                     │ throttles    │
│                                                     │ to all       │
│                                                     │ layers       │
│                                                     ▼              │
│                                              ┌──────────────┐     │
│                                              │  All Layers   │     │
│                                              └──────────────┘     │
└─────────────────────────────────────────────────────────────────────┘
```

## Adaptive Feedback Mechanisms

### Execution → UX Adaptation

The Execution layer continuously informs the UX layer about its behavioral patterns, enabling the UX to adapt its presentation strategy:

| Execution Behavior | UX Adaptation | Trigger Threshold |
|-------------------|---------------|-------------------|
| High mutation rate (>10 mutations/s) | Batch display updates, show aggregate progress | 10 mutations/s sustained for 3s |
| Long-running execution (>30s) | Show detailed progress with time estimates | Execution running > 30s |
| Frequent small errors | Group error notifications, show summary | > 3 errors in 10s |
| Rapid state changes | Reduce UI animation, show final states only | > 5 state changes/s |
| Execution stalled | Show diagnostic information, suggest interventions | No progress for 15s |

### UX → Human Behavioral Adjustment

The UX layer observes how humans interact with the system and feeds those patterns back to the Human Workflow layer:

| UX Observation | Human Workflow Adjustment | Trigger Threshold |
|---------------|--------------------------|-------------------|
| User always approves certain intent types | Suggest auto-approval for that class | 10+ consecutive approvals of same class |
| User frequently pauses at specific points | Add explanatory context at those points | 5+ pauses at same workflow step |
| User modifies generated plans predictably | Adjust plan generation to match preference | 5+ similar modifications |
| User ignores certain notifications | Reduce notification priority or suppress | 10+ consecutive dismissals |
| User consistently overrides auto-decisions | Increase human review scope | 5+ overrides in a session |

### Human → Workflow Adaptation

Human decision patterns feed back into the workflow engine to optimize future workflow execution:

| Human Pattern | Workflow Adaptation | Confidence Required |
|--------------|--------------------|--------------------|
| Consistent approval of low-risk mutations | Auto-approve low-risk, flag only high-risk | 95% approval rate over 50 decisions |
| Consistent manual review before approval | Add mandatory review step | 100% review rate over 20 decisions |
| Preference for specific execution strategies | Default to preferred strategy | 80% selection of same strategy over 10 choices |
| Rejection of specific operation types | Add pre-screening filter | 90% rejection rate over 10 decisions |
| Time-of-day decision patterns | Adjust workflow timing to match availability | Correlation > 0.8 over 30 days |

### Stability → Throttling Changes

System health observations drive adaptive throttling that protects the system without unnecessarily constraining it:

| Health Observation | Throttle Adjustment | Response Time |
|-------------------|--------------------|----|
| Memory usage trending upward | Pre-emptively reduce concurrent operations | Within 5s of trend detection |
| CPU utilization sustained > 80% | Reduce execution parallelism | Within 2s |
| Event bus queue growing | Reduce signal emission rate | Within 1s |
| Agent failure rate increasing | Slow agent dispatch, increase validation | Within 10s |
| System recovering from throttle | Gradually increase limits (not immediate) | Ramp over 30s |

## Oscillation Prevention

The most dangerous failure mode of a closed-loop system is oscillation — when feedback causes the system to repeatedly overshoot in alternating directions. The Feedback Loop Service implements multiple layers of protection:

### 1. Rate Limiting on Feedback Signals

Each feedback direction has a maximum signal rate:

| Direction | Max Signals/Second | Burst Allowance |
|-----------|-------------------|-----------------|
| ExecutionToUX | 5 | 10 in any 1s window |
| UXToHuman | 2 | 5 in any 5s window |
| HumanToWorkflow | 1 | 3 in any 10s window |
| StabilityToThrottle | 3 | 8 in any 2s window |
| ClosedLoop | 0.5 | 2 in any 10s window |

### 2. Damping Coefficient

Every feedback signal is multiplied by a damping coefficient that reduces the magnitude of each successive adjustment in the same direction:

```
adjustment_n = raw_adjustment * damping^n

where:
  damping = 0.7  (default)
  n = number of same-direction adjustments in current cycle
```

This ensures that even if a positive feedback loop is triggered, the adjustments diminish geometrically rather than growing exponentially.

### 3. Oscillation Detection

The service monitors for oscillation patterns by tracking the direction of adjustments over time:

| Pattern | Detection | Response |
|---------|-----------|----------|
| Alternating direction (A→B→A→B) | 3+ direction reversals within 30s | Freeze feedback in this direction for 60s |
| Growing amplitude | Each adjustment larger than previous | Apply emergency damping (0.3 coefficient) |
| Frequency increase | Adjustment rate accelerating | Apply rate limiting at 50% of current rate |
| Closed-loop resonance | Full cycle completes in < 5s | Break the loop by freezing one direction |

### 4. Circuit Breakers

When oscillation detection identifies a critical pattern, the circuit breaker activates:

```
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│    CLOSED    │───►│     OPEN     │───►│  HALF-OPEN   │
│  (normal)    │    │  (tripped)   │    │  (testing)   │
│              │    │              │    │              │
│ Feedback     │    │ All feedback │    │ Single test  │
│ flowing      │    │ blocked      │    │ signal sent  │
│ normally     │    │              │    │              │
└──────────────┘    └──────────────┘    └──────┬───────┘
       ▲                                       │
       │         test signal succeeds          │
       └───────────────────────────────────────┘
                   test signal fails → back to OPEN
```

| Circuit Breaker State | Behavior | Duration |
|----------------------|----------|----------|
| Closed | Normal feedback flow | Indefinite |
| Open | All feedback in this direction blocked | 30 seconds minimum |
| Half-Open | Single test signal allowed | One signal, then evaluate |

## Feedback Signal Structure

```typescript
interface IFeedbackSignal {
  readonly signalId: string;
  readonly direction: FeedbackDirection;
  readonly sourceLayer: Layer;
  readonly targetLayer: Layer;
  readonly observation: IFeedbackObservation;   // What was observed
  readonly recommendation: IFeedbackRecommendation; // Suggested adjustment
  readonly confidence: number;                   // 0.0–1.0
  readonly dampingFactor: number;                // Current damping coefficient
  readonly circuitBreakerState: CircuitBreakerState;
  readonly loopIteration: number;                // Which iteration of the closed loop
}
```

## Closed-Loop Tracking

The service tracks each full revolution of the feedback loop, assigning a `ClosedLoop` iteration count. This enables detection of:

- **First-order effects**: Direct consequences of an adjustment (expected and benign)
- **Second-order effects**: Consequences of the consequences (may indicate emerging behavior)
- **Higher-order effects**: Third-order and beyond (likely indicate instability)

Any signal that reaches loop iteration 4 or higher is automatically frozen and flagged for human review.

## Service Registration

| # | Service | Dependencies | Phase |
|---|---------|-------------|-------|
| 65 | ISystemFeedbackLoopService | CrossLayerSignalBus, SystemCoherenceEngine, SystemIntentAlignment, LayerSynchronization, SystemStabilization | 17 |

## Interface Contract

```typescript
interface ISystemFeedbackLoopService {
  readonly activeLoops: ReadonlyArray<IFeedbackLoopState>;
  readonly circuitBreakers: ReadonlyMap<FeedbackDirection, CircuitBreakerState>;
  readonly oscillationAlerts: ReadonlyArray<IOscillationAlert>;

  emitFeedback(signal: IFeedbackSignal): Promise<IFeedbackResult>;
  getLoopState(direction: FeedbackDirection): IFeedbackLoopState;
  tripCircuitBreaker(direction: FeedbackDirection, reason: string): void;
  resetCircuitBreaker(direction: FeedbackDirection): Promise<ICircuitBreakerTestResult>;
  subscribeToFeedback(observer: IFeedbackObserver): IDisposable;
  subscribeToOscillationAlerts(observer: IOscillationObserver): IDisposable;
}
```

## Files

| File | Purpose |
|------|---------|
| `common/systemFeedbackLoop.ts` | All interfaces, types, enums (FeedbackDirection, CircuitBreakerState, IFeedbackSignal) |
| `browser/systemFeedbackLoopService.ts` | Full runtime implementation with adaptive feedback and oscillation prevention |
| `browser/phase17FeedbackLoopValidation.ts` | Validation tests for feedback loops, damping, and circuit breakers |
