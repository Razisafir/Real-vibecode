# Interruption Intelligence System

## Phase 16 — Unified Interaction Intelligence & Human Workflow Engine

### Overview

The Interruption Intelligence System (`IInterruptionIntelligenceService`) is the decision-making layer that governs when, how, and whether the IDE should surface any form of interruption to the developer. Every notification, suggestion, warning, or prompt passes through this system before reaching the user. It works in tight coordination with the Workflow Momentum Engine — understanding the developer's current state to make intelligent decisions about interruption timing.

The system is built on a fundamental ethical commitment: **typing velocity reduces interruption tolerance, deep focus suppresses almost everything, and recovery time is always tracked.** Interruptions are never free — they carry a measurable cognitive cost, and the system must account for that cost before acting.

---

### Interruption Classifications

Every potential interruption is classified into one of five categories based on urgency and relevance:

| Classification | Description | Examples |
|----------------|-------------|---------|
| **Critical** | Immediate action required. System health or data integrity is at risk. | Build failure in active file, save conflict, memory critically low, unsaved data loss risk |
| **Important** | Time-sensitive information that affects the current task. High relevance to active work. | Test failure for code being edited, type error in active file, dependency vulnerability in current project |
| **Contextual** | Relevant information tied to the current context but not time-sensitive. Can wait for a natural pause. | Code review comment on active PR, suggestion for code being edited, documentation update for current API |
| **Optional** | Useful but not necessary. Could enhance the workflow but absence is not harmful. | Performance tip, style suggestion, newer library version available, keyboard shortcut hint |
| **Deferrable** | Information that has no time sensitivity and no direct relevance to current work. | Weekly digest, team activity summary, IDE update available, non-critical telemetry insight |

Classification determines *whether* an interruption is permitted at a given momentum level. Critical interruptions are always permitted; Deferrable interruptions are only permitted at Stalled momentum.

---

### Timing Strategies

When an interruption is permitted, the system selects one of five timing strategies:

| Strategy | When Used | Behavior |
|----------|-----------|----------|
| **Now** | Critical interruptions only | Delivered immediately regardless of momentum state. Even at Peak momentum, a Critical interruption breaks through. Used only for data-loss risks and system-health emergencies. |
| **NextPause** | Important interruptions at Active+ momentum | The system waits for the next natural typing pause (> 2 seconds of inactivity) before delivering. This avoids mid-keystroke disruption while ensuring timely delivery. |
| **RecoveryWindow** | Contextual and Important interruptions at Strong+ momentum | Delivered during a naturally occurring recovery window — a moment when the user is between subtasks, has paused briefly, or has completed a logical unit of work (e.g., closing a brace, saving a file). |
| **Batched** | Optional interruptions at any momentum level | The interruption is queued and delivered as part of a batch during a low-momentum moment. Batched interruptions are grouped by topic and delivered as a digest rather than individual pop-ups. |
| **Deferred** | Deferrable interruptions, or any interruption at Peak momentum (except Critical) | The interruption is stored and delivered only when momentum drops to Stalled or Building, or at session start the next day. The user never sees it during productive work. |

---

### Interruption Cost Calculation

Every interruption has a computed cost that factors into the delivery decision:

```
interruptionCost = baseCost × momentumMultiplier × velocityMultiplier × focusMultiplier
```

**Base Cost** (by classification):
- Critical: 0.1 (low cost — must deliver)
- Important: 0.4
- Contextual: 0.7
- Optional: 0.85
- Deferrable: 1.0 (high cost — rarely worth it)

**Momentum Multiplier**: `1 + (momentumScore × 2)`
- At Stalled (0.0): multiplier = 1.0 (no additional cost)
- At Active (0.5): multiplier = 2.0
- At Peak (0.9): multiplier = 2.8

**Velocity Multiplier**: `1 + (editVelocity / maxVelocity)`
- Typing at maximum speed doubles the cost of interruption
- Slow or no typing adds no additional cost

**Focus Multiplier**: `isDeepWork ? 2.5 : 1.0`
- Deep work states (consecutive minutes > 15, low context switches) multiply cost by 2.5x

**Delivery Decision**: An interruption is delivered only if `interruptionCost < deliveryThreshold`, where the threshold is calibrated per timing strategy:
- Now: threshold = ∞ (always deliver)
- NextPause: threshold = 1.5
- RecoveryWindow: threshold = 1.0
- Batched: threshold = 0.6
- Deferred: threshold = 0.3

---

### Typing Velocity Effect on Tolerance

The system continuously monitors typing velocity (characters per second, averaged over 10-second windows). This directly affects interruption tolerance:

- **High velocity** (> 4 chars/sec): The user is actively composing code. Interruption tolerance is at its lowest. Only Critical interruptions are permitted; everything else is deferred.
- **Moderate velocity** (1–4 chars/sec): The user is working steadily. Important interruptions can use NextPause strategy; others are RecoveryWindow or Batched.
- **Low velocity** (< 1 chars/sec): The user is reading, thinking, or browsing. Interruption tolerance is higher — Contextual interruptions may be delivered at NextPause.
- **Zero velocity** (idle): The user has paused. This is a natural delivery window for queued interruptions of all classifications.

The ethical principle here is clear: **the faster someone is typing, the more they are in flow, and the more the system should protect that flow.** A developer furiously typing is the worst possible moment for a notification.

---

### Deep Focus Suppression Rules

When the Momentum Engine reports `isDeepWork = true` (Strong or Peak momentum with > 15 consecutive minutes), the Interruption Intelligence System enters deep focus suppression mode:

1. **Critical**: Delivered immediately but with minimal visual footprint (status bar indicator only, no modal or toast).
2. **Important**: Held until next natural pause, then delivered as a subtle non-modal indicator.
3. **Contextual**: Fully suppressed. Queued for delivery when deep work ends.
4. **Optional**: Fully suppressed. Batched for later delivery.
5. **Deferrable**: Fully suppressed. Deferred to next session start if necessary.

Deep focus suppression also applies UI-level changes:
- Notification toasts are hidden
- Activity bar badges are dimmed
- Status bar indicators replace modal dialogs
- Sound alerts are silenced (except for Critical)

---

### Recovery Windows

The system identifies four types of recovery windows — natural moments when an interruption is least disruptive:

1. **Natural Pause**: The user stops typing for > 2 seconds without switching context. This is the most common and reliable recovery window. It typically occurs between thought units — after writing a function, completing a statement, or pausing to think.

2. **Task Boundary**: The user completes a logical unit of work — detected by events like file save, test run, commit, or closing a file. Task boundaries are ideal for Important and Contextual interruptions because the user's working memory is between tasks.

3. **Idle Moment**: The user has been idle for > 30 seconds. This is a strong signal that the current task has paused, making it a good window for batched delivery of queued interruptions.

4. **Context Shift**: The user switches to a different file, panel, or workspace. While context shifts themselves carry a momentum penalty, they also signal that the user is already transitioning — making them a reasonable window for interruptions related to the new context.

```
Recovery Window Quality:
  Task Boundary    ████████████  (Best — user is between tasks)
  Natural Pause    ██████████    (Good — user is between thoughts)
  Idle Moment      ████████      (Acceptable — user is disengaged)
  Context Shift    ██████        (Risky — user is already transitioning)
```

---

### Batching Strategy

When interruptions are classified as Batched, the system groups them for efficient delivery:

- **Topic Grouping**: Interruptions about the same topic (e.g., multiple test failures, several review comments) are merged into a single notification.
- **Priority Ordering**: Within a batch, items are ordered by classification (Critical first, Deferrable last).
- **Count Indicators**: Instead of showing each item, a batch shows a count: "3 suggestions available" rather than three separate toasts.
- **Delivery Timing**: Batches are delivered at the next Idle Moment or when momentum drops to Building or below.
- **Maximum Batch Size**: A batch never exceeds 5 items. Additional items are deferred to the next batch cycle.

---

### Interruption Timing Diagram

```
Timeline of a coding session with interruption handling:

Momentum:  Building ────── Active ─────────── Strong ──────── Peak ──────── Active ─── Building
           │               │                   │              │              │            │
Event:     │   Optional    │   Contextual      │   Important  │  CRITICAL   │  Batched   │
           │   suggestion  │   review comment  │   test fail  │  save conf. │  digest    │
           │               │                   │              │              │            │
Decision:  │   NextPause   │   RecoveryWindow  │   RecoveryWin│   Now       │  Deferred  │  Batched
           │               │                   │              │              │  (held)    │  (deliver)
Delivery:  │   ✓ (pause)   │   ✓ (task bound.) │   ✓ (pause)  │   ✓ (immed.) │   ✗        │  ✓ (idle)
```

---

### Ethical Rules

The Interruption Intelligence System operates under strict ethical constraints:

1. **Typing velocity reduces interruption tolerance.** A fast-typing developer is a focused developer. Protect them.
2. **Deep focus suppresses almost everything.** Only Critical interruptions break through. Everything else waits.
3. **Recovery time is tracked.** After every interruption, the system monitors how long it takes the user to return to their previous velocity. This data calibrates future interruption cost calculations.
4. **No sneaky interruptions.** An interruption classified as Important cannot be "upgraded" to Critical to bypass suppression rules. Classification is honest and auditable.
5. **User override always available.** The developer can manually set their interruption tolerance level, effectively overriding all algorithmic decisions. The system serves the human, not the other way around.

---

### Anti-Patterns

- **Aggressive Notifications**: Surfacing every possible notification without cost calculation. This is the default behavior of most IDEs and the primary enemy of flow state.
- **No Cost Awareness**: Treating all interruptions as equally important. Without cost calculation, the system cannot make intelligent trade-offs.
- **Interrupting During Flow**: Delivering non-critical interruptions at Peak or Strong momentum. This is the cardinal sin of IDE interaction design — it destroys the most valuable state a developer can achieve.
- **Modal Interruptions for Non-Critical Events**: Using modal dialogs for anything other than Critical interruptions. Modals force a complete context switch and should be reserved for true emergencies.
- **Ignoring Recovery Time**: Not tracking how long it takes users to recover after interruptions. Without this feedback loop, the system cannot improve its interruption timing.

---

### Core Principle

> **Every interruption has a cost. The system must know that cost before it decides to pay it.**

Interruption Intelligence transforms the IDE from a passive notification firehose into a thoughtful gatekeeper that respects the developer's most valuable resource: uninterrupted focus.
