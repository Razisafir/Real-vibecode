# Workflow Momentum Engine

## Phase 16 — Unified Interaction Intelligence & Human Workflow Engine

### Overview

The Workflow Momentum Engine (`IWorkflowMomentumService`) is the foundational subsystem responsible for quantifying, tracking, and preserving a developer's flow state during coding sessions. It models the invisible but critical property of *momentum* — the sense of progressive, uninterrupted accomplishment that distinguishes productive deep work from fragmented, low-output activity. The core principle is simple and profound: **the system learns when NOT to interrupt.**

Momentum is not binary. It exists on a continuum, and the engine's job is to understand where a developer sits on that continuum at any given moment, to predict trajectory, and to ensure that every other subsystem in the IDE respects the fragility of high-momentum states.

---

### Momentum Levels

The engine classifies momentum into five distinct levels, each carrying semantic meaning that drives interaction policy across the entire IDE:

| Level | Score Range | Description |
|-------|-------------|-------------|
| **Stalled** | 0.00 – 0.15 | No meaningful progress. User may be stuck, idle, or away. The system may safely offer suggestions, help, or gentle nudges. |
| **Building** | 0.16 – 0.40 | Early signs of focus. Edit velocity is increasing but not yet sustained. The system should minimize distractions but may still surface relevant context. |
| **Active** | 0.41 – 0.65 | Sustained productive work. A clear task is in progress with consistent edits. The system should avoid unnecessary interruptions and only surface critical information. |
| **Strong** | 0.66 – 0.85 | Deep work in progress. High edit velocity, low context-switch count, sustained consecutive minutes. The system suppresses all non-essential interactions. |
| **Peak** | 0.86 – 1.00 | Flow state. Maximum velocity, zero context switches, full immersion. The system becomes nearly invisible — only critical interruptions are permitted. |

---

### Momentum Events

The engine processes a stream of discrete events that influence momentum. Each event has a directional effect (positive or negative) and a magnitude:

| Event | Direction | Effect |
|-------|-----------|--------|
| **UninterruptedEdit** | Positive | Each consecutive second of sustained editing increases momentum incrementally. The longer the streak, the stronger the compounding effect. |
| **TaskCompletion** | Positive | Completing a defined task (running tests successfully, closing a PR review, finishing a refactor) provides a significant momentum boost. |
| **Breakthrough** | Positive | A sudden insight or problem resolution — detected by rapid edits after a period of searching or pausing — provides the largest positive momentum event. |
| **ContextSwitch** | Negative | Switching files, tabs, or mental context applies a penalty. The severity scales with the momentum level — a context switch at Peak momentum is far more costly than at Stalled. |
| **Interrupted** | Negative | An external interruption (notification, IDE prompt, AI suggestion that breaks flow) applies a moderate-to-severe penalty depending on the current momentum level. |
| **IdlePeriod** | Negative | Inactivity begins a natural decay. Short pauses (< 30s) are tolerated; longer pauses accelerate decay. |
| **Revert** | Negative | Undoing recent work (detected by undo chains or deletions of recently added code) signals potential loss of direction and applies a momentum penalty. |
| **Fragmentation** | Negative | Rapid switching between many files without sustained edits in any one file indicates fragmented attention and reduces momentum. |
| **Collapse** | Negative | A catastrophic interruption (build failure after long session, forced context switch by meeting reminder) can drop momentum multiple levels instantly. |

---

### Momentum State Metrics

The engine maintains a real-time state object with the following properties:

```typescript
interface MomentumState {
  /** Current momentum score, 0.0 (stalled) to 1.0 (peak) */
  score: number;

  /** Minutes of consecutive focused work without interruption */
  consecutiveMinutes: number;

  /** Edits per minute over the rolling window (last 5 minutes) */
  editVelocity: number;

  /** Number of context switches in the current session */
  contextSwitchCount: number;

  /** Whether the user is currently in a deep work state (score > 0.65) */
  isDeepWork: boolean;

  /** Whether attention appears fragmented (many switches, low velocity) */
  isFragmented: boolean;

  /** Whether a productive streak is currently being preserved */
  streakPreserved: boolean;

  /** Current momentum level classification */
  level: MomentumLevel;

  /** Current lifecycle phase */
  lifecycle: MomentumLifecycle;
}
```

These metrics are computed over rolling windows and updated in real-time as events stream in. The `score` is the composite result of all contributing factors, weighted by recency and magnitude.

---

### Context-Switch Penalty Calculation

Context switches are the primary enemy of momentum. The penalty is not fixed — it scales with the current momentum level:

```
penalty = basePenalty × (1 + currentScore²)
```

Where `basePenalty` is calibrated per switch type:
- **File switch within same task**: 0.02
- **File switch to different task area**: 0.05
- **Panel/tab switch**: 0.03
- **IDE notification click**: 0.04
- **Full workspace context switch**: 0.10

At Peak momentum (score = 0.9), a full workspace context switch applies a penalty of `0.10 × (1 + 0.81) = 0.181`, potentially dropping the user from Peak to Strong or even Active. This reflects the real cognitive cost of losing deep focus.

---

### Momentum Lifecycle

Momentum follows a natural lifecycle with four phases:

1. **Building** — The user begins focused work. Momentum increases gradually as consecutive edit seconds accumulate and velocity rises. This phase is fragile — a single interruption can reset progress. The system applies maximum protection during building.

2. **Peak** — The user reaches sustained high momentum. Edit velocity is high, context switches are minimal. The system enters full suppression mode — all non-critical interactions are deferred.

3. **Declining** — Natural decay or accumulated micro-interruptions begin to reduce momentum. This is not failure — all peak states eventually decline. The system watches for recovery signals and may gently offer task-completion nudges to end the session productively.

4. **Recovering** — After a decline or interruption, the user shows signs of resuming focus. The system reduces suppression and provides gentle context restoration to accelerate the return to building phase.

---

### Natural Decay Model

Momentum decays naturally during idle periods. The decay function is exponential:

```
score(t) = score₀ × e^(-λt)
```

Where `λ` (lambda) is the decay constant, calibrated so that:
- A 30-second pause causes negligible decay (~2%)
- A 2-minute pause causes moderate decay (~15%)
- A 10-minute pause causes significant decay (~55%)
- A 30-minute pause essentially resets momentum (~93%)

This model mirrors the real psychological experience: short pauses are fine (you can pick up where you left off), but longer breaks require rebuilding momentum from a lower base.

---

### Momentum Preservation Rules

The engine enforces a set of preservation rules that other subsystems must respect:

1. **Streak Protection**: When `streakPreserved` is true, the system applies enhanced suppression — even normally allowed interruptions are deferred.
2. **Building-Phase Shielding**: During the Building lifecycle phase, the cost of interruptions is artificially doubled to prevent early disruption of fragile momentum.
3. **Peak Invisibility**: At Peak level, the IDE UI simplifies itself — non-essential panels collapse, status bar minimizes, and the editor dominates the visual field.
4. **Recovery Acceleration**: After an interruption drops momentum, the system proactively restores context (open files, cursor positions, search state) to accelerate the return to Building.
5. **Breakthrough Detection**: When a Breakthrough event is detected, the system actively suppresses all interruptions for the next 60 seconds to protect the insight window.

---

### Anti-Patterns

- **Easily Destroyed Momentum**: Treating momentum as fragile and not building system-level protections. Every subsystem must check momentum before surfacing any interaction.
- **Ignoring Context-Switch Costs**: Allowing free-form context switching without accounting for the cognitive penalty. The system must make context switches deliberate, not accidental.
- **Not Protecting Streaks**: Failing to recognize and preserve productive streaks. A streak at Strong or Peak momentum is precious and should be defended aggressively.
- **Uniform Interruption Policy**: Treating all momentum levels the same. An interruption that is harmless at Stalled is devastating at Peak.

---

### Core Principle

> **The system learns when NOT to interrupt.**

The most important thing an IDE can do for productivity is not to add features, but to protect the developer's existing flow. The Workflow Momentum Engine ensures that every other subsystem in the IDE understands and respects the invisible but invaluable property of momentum.
