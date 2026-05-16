# Flow State Preservation

## Overview

Flow State Preservation is the system's commitment to never break a developer's momentum. Flow — that deeply focused state where time disappears and productivity peaks — is the most valuable cognitive state a developer can achieve. Research consistently shows that flow state can take 15–25 minutes to enter but only seconds to destroy. A single untimely notification, an uninvited AI suggestion, or an unexpected modal dialog can shatter flow and cost 30+ minutes of recovery time.

The Real Vibecode IDE treats flow state as sacred. It detects when a user is in flow, classifies the intensity, and implements a comprehensive interruption management system that ensures only genuinely critical events can break through. Everything else is deferred, batched, and delivered only when the user naturally exits flow.

---

## Five Flow Intensities

The system recognizes five levels of flow intensity, from no flow at all to peak deep work. Each intensity level determines the strictness of interruption filtering and the degree of interface minimization.

| Intensity | Description | Indicators | Interruption Policy |
|---|---|---|---|
| **None** | No flow detected; normal operation | Low edit rate, frequent context switches, browsing | All interruptions allowed; normal notification delivery |
| **Light** | Casual work; mild engagement | Steady edit rate, 5+ minutes of sustained activity | Important and critical interruptions allowed; low-priority deferred |
| **Moderate** | Engaged work; clear task focus | High edit rate, minimal context switches, 10+ minutes sustained | Only important and critical; normal notifications deferred |
| **Deep** | Deep focus; "in the zone" | Very high edit rhythm, near-zero context switches, 20+ minutes sustained | Only critical interruptions; all others queued |
| **Peak** | Peak performance; total absorption | Maximum edit rhythm, zero context switches, 30+ minutes sustained | ONLY system-critical events (e.g., data loss prevention); everything else deferred |

### Flow Intensity Detection

Flow intensity is computed from three primary metrics:

1. **Edit Rhythm**: The consistency and speed of keyboard input. A steady, fast rhythm indicates flow.
2. **Focus Intensity**: The ratio of time spent in the editor vs. other panels. High focus = high flow.
3. **Context Switch Count**: The number of panel/context switches per minute. Low switches = high flow.

```typescript
function calculateFlowIntensity(metrics: FlowMetrics): FlowIntensity {
  const { editRhythm, focusIntensity, contextSwitchRate, sustainedMinutes } = metrics;

  // Edit rhythm score (0-1): how consistent and fast the user is typing
  const rhythmScore = normalizeEditRhythm(editRhythm);

  // Focus score (0-1): how concentrated the user is on the editor
  const focusScore = focusIntensity;

  // Switch penalty (0-1): how much the user is context-switching
  const switchPenalty = Math.min(contextSwitchRate / 5, 1.0);

  // Composite flow score
  const flowScore = (rhythmScore * 0.35) + (focusScore * 0.35) + ((1 - switchPenalty) * 0.15) + (sustainedMinutes / 60 * 0.15);

  if (flowScore >= 0.85 && sustainedMinutes >= 30) return FlowIntensity.Peak;
  if (flowScore >= 0.65 && sustainedMinutes >= 20) return FlowIntensity.Deep;
  if (flowScore >= 0.45 && sustainedMinutes >= 10) return FlowIntensity.Moderate;
  if (flowScore >= 0.25 && sustainedMinutes >= 5) return FlowIntensity.Light;
  return FlowIntensity.None;
}
```

---

## Flow Detection Metrics

### Edit Rhythm

Edit rhythm measures the cadence of the user's typing. Flow is characterized by a *consistent* rhythm — not necessarily fast, but steady and uninterrupted.

**Measurement**: Rolling 5-minute window of keystroke timestamps. Calculate the coefficient of variation (standard deviation / mean) of inter-keystroke intervals.

- **Low variation** (< 0.3) = consistent rhythm = flow indicator
- **High variation** (> 0.7) = sporadic rhythm = not in flow

### Focus Intensity

Focus intensity measures how concentrated the user's attention is on the primary editing surface.

**Measurement**: Ratio of time spent with the editor as the active surface vs. total time in the measurement window.

- **High ratio** (> 0.85) = strong focus = flow indicator
- **Low ratio** (< 0.5) = distributed attention = not in flow

### Context Switch Count

Context switch count measures how often the user moves between different panels, files, or tools. Frequent switching is the antithesis of flow.

**Measurement**: Number of distinct panel/file/context transitions per minute in the rolling window.

- **0–0.5 switches/min** = deep focus = flow indicator
- **2+ switches/min** = scattered attention = not in flow

---

## Interruption Priority System

Every potential interruption in the system is assigned a priority level. The flow intensity determines which priorities are allowed through.

| Priority | Description | Examples | Allowed At |
|---|---|---|---|
| **Critical** | System health, data safety, or unrecoverable error | Disk full, unsaved data at risk, process crash, security alert | All intensities (always allowed) |
| **Important** | Operationally significant but not time-sensitive | Build failure, test suite failure, AI operation requiring approval | None, Light, Moderate |
| **Normal** | Standard informational events | File saved, AI suggestion available, panel update | None, Light |
| **Low** | Non-essential information | Feature discovery tip, usage statistic, UI state change | None only |

### Priority Assignment Rules

```typescript
function assignInterruptionPriority(interruption: Interruption): Priority {
  // System-critical events are always Critical
  if (interruption.type === 'data-loss-risk' || 
      interruption.type === 'system-error' ||
      interruption.type === 'security-alert') {
    return Priority.Critical;
  }

  // Build and test failures are Important
  if (interruption.type === 'build-failure' || 
      interruption.type === 'test-failure') {
    return Priority.Important;
  }

  // AI suggestions and notifications are Normal
  if (interruption.type === 'ai-suggestion' || 
      interruption.type === 'notification') {
    return Priority.Normal;
  }

  // Everything else is Low
  return Priority.Low;
}
```

---

## Deferred Interruption Queue

When an interruption is blocked by the flow filter, it is placed in a deferred interruption queue. The queue is FIFO-ordered and maintains the original priority and timestamp of each interruption.

### Queue Structure

```typescript
interface DeferredInterruption {
  id: string;
  priority: Priority;
  timestamp: number;
  source: string;
  content: InterruptionContent;
  originalContext: ActivityContext;
  deferCount: number;       // how many times this has been re-deferred
  maxDeferCount: number;    // maximum deferrals before forced delivery (default: 3)
}
```

### Queue Policies

- **Maximum queue size**: 50 interruptions. If the queue exceeds 50, the oldest Low-priority interruptions are discarded.
- **Maximum defer count**: Each interruption can be deferred a maximum of 3 times. On the 4th deferral attempt, the interruption is promoted one priority level (Low → Normal, Normal → Important).
- **Stale interruption removal**: Interruptions older than 2 hours are discarded (they're no longer relevant).

---

## Batch Notification Release on Flow Exit

When the user exits flow state (detected by a sustained drop in flow metrics for 30+ seconds), the deferred interruption queue is released in a controlled batch:

1. **Critical interruptions** are delivered immediately — they should have been delivered during flow but weren't (only happens in Peak flow).
2. **Important interruptions** are delivered as a single summary notification: "3 build/test events occurred while you were focused."
3. **Normal interruptions** are condensed into a digest: "7 AI suggestions are available. View them in the AI panel."
4. **Low interruptions** are discarded — they were not important enough to deliver during flow and are not important enough to deliver after.

This batching prevents the "notification tsunami" that would occur if all deferred interruptions were released simultaneously.

### Release Algorithm

```typescript
function releaseDeferredInterruptions(queue: DeferredInterruption[]): void {
  const critical = queue.filter(i => i.priority === Priority.Critical);
  const important = queue.filter(i => i.priority === Priority.Important);
  const normal = queue.filter(i => i.priority === Priority.Normal);
  const low = queue.filter(i => i.priority === Priority.Low);

  // Deliver critical immediately
  for (const interruption of critical) {
    deliverImmediately(interruption);
  }

  // Batch important into summary
  if (important.length > 0) {
    deliverSummary(`${important.length} important events while you were focused`, important);
  }

  // Condense normal into digest
  if (normal.length > 0) {
    deliverDigest(`${normal.length} suggestions available`, normal);
  }

  // Discard low
  // (no action needed — they're simply not delivered)
}
```

---

## Flow Statistics

The system tracks aggregate flow statistics that help both the user (for self-awareness) and the system (for better adaptation):

| Statistic | Description | Use |
|---|---|---|
| **Total flow sessions** | Number of distinct flow periods (flow intensity ≥ Light) | User insight; experience level progression |
| **Total flow duration** | Cumulative time spent in flow (minutes) | User insight; productivity tracking |
| **Peak flow sessions** | Number of Peak-intensity flow periods | Achievement tracking; expert mode qualification |
| **Average flow duration** | Mean duration of flow sessions | System tuning; notification timing optimization |
| **Flow efficiency** | Ratio of productive edits to total flow time | Quality metric; flow quality assessment |
| **Interruptions blocked** | Count of interruptions deferred during flow | System validation; user trust building |
| **Flow recovery time** | Average time to re-enter flow after an interruption | System tuning; recovery assistance |

These statistics are available to the user in the "Focus Insights" panel (Advanced+ experience level) and feed into the experience level and trust score calculations.

---

## Before / After Comparison

### Before: Interrupted During Deep Work

```
┌───────────────────────────────────────────────────────────┐
│                                                           │
│  function processExecutionPlan(plan: ExecutionPlan) {      │
│    const steps = plan.getSteps();                         │
│    for (const step of steps) {                            │
│      ┌─────────────────────────────────────────────┐      │
│      │  💡 AI Suggestion: "Use Array.map() instead"│      │
│      │  [Accept] [Dismiss]                         │      │
│      └─────────────────────────────────────────────┘      │
│      if (step.isReady()) {                                │
│      ┌─────────────────────────────────────────────┐      │
│      │  🔔 Notification: "Extension updated"       │      │
│      └─────────────────────────────────────────────┘      │
│        await step.execute();                              │
│      ┌─────────────────────────────────────────────┐      │
│      │  ⚡ AI: "I can refactor this function"      │      │
│      └─────────────────────────────────────────────┘      │
│      }                                                    │
│  }                                                        │
│                                                           │
│  😰 "I was IN THE ZONE and now I've lost my train of      │
│      thought completely!"                                 │
└───────────────────────────────────────────────────────────┘
```

### After: Flow Protected, Interruptions Deferred

```
┌───────────────────────────────────────────────────────────┐
│                                                           │
│  function processExecutionPlan(plan: ExecutionPlan) {      │
│    const steps = plan.getSteps();                         │
│    for (const step of steps) {                            │
│      if (step.isReady()) {                                │
│        await step.execute();    ← Uninterrupted coding    │
│      }                                                    │
│    }                                                      │
│    return plan.getResult();                               │
│  }                                                        │
│                                                           │
│  [Flow: Deep | 23 min | 4 interruptions deferred]        │
│                                                           │
│  😊 "I didn't even notice the suggestions. They'll be     │
│      there when I surface."                               │
└───────────────────────────────────────────────────────────┘

  After flow exit:
  ┌─────────────────────────────────────────────────────┐
  │  📋 While you were focused:                         │
  │  • 2 AI suggestions available in AI panel            │
  │  • 1 notification (extension update)                 │
  │  • 1 AI refactoring offer                           │
  │  [View All] [Dismiss]                               │
  └─────────────────────────────────────────────────────┘
```

---

## Flow State Diagram

```
                    FLOW STATE LIFECYCLE
                    ════════════════════

    ┌──────────┐    steady edit    ┌──────────┐
    │          │    rhythm + 5min   │          │
    │   None   │──────────────────►│   Light  │
    │          │◄──────────────────│          │
    └──────────┘    rhythm drops   └──────────┘
         ▲                              │
         │                              │ 10min sustained
         │                              ▼
         │                        ┌──────────┐
         │    rhythm drops        │          │
         │◄───────────────────────│ Moderate │
         │                        │          │
         │                        └──────────┘
         │                              │
         │                              │ 20min sustained
         │                              ▼
         │                        ┌──────────┐
         │    rhythm drops        │          │
         │◄───────────────────────│   Deep   │◄──────┐
         │                        │          │       │
         │                        └──────────┘       │
         │                              │             │
         │                              │ 30min      │ sustain
         │                              │ sustained  │
         │                              ▼             │
         │                        ┌──────────┐       │
         │                        │          │───────┘
         │                        │   Peak   │
         │                        │          │
         │                        └──────────┘
         │                              │
         │    Any sustained drop        │
         └──────────────────────────────┘
                  (30+ seconds)

    INTERRUPTION FILTERING:
    ════════════════════════

    None      → All interruptions allowed
    Light     → Low priority deferred
    Moderate  → Low + Normal deferred
    Deep      → Low + Normal + Important deferred
    Peak      → ONLY Critical allowed
```

---

## Implementation Reference

- **Service**: `FlowStatePreservationService` (singleton #35)
- **Registration**: `registerSingleton(IFlowStatePreservationService, FlowStatePreservationService, InstantiationType.Eager)`
- **Interface**: `IFlowStatePreservationService` in `vs/workbench/services/adaptiveWorkflow/common/adaptiveWorkflow.ts`
- **Key Methods**: `getFlowIntensity()`, `shouldAllowInterruption()`, `deferInterruption()`, `releaseDeferredInterruptions()`, `getFlowStatistics()`
