# Feature Fatigue Detection

## Overview

Feature Fatigue Detection is the system's immune response against one of the most insidious problems in complex software: the gradual exhaustion users experience when bombarded with features they don't want, don't understand, or don't need right now. Unlike a one-time onboarding overwhelm, feature fatigue accumulates over time — each dismissed suggestion, each ignored panel, each unwanted notification adds to a growing sense that the tool is working *against* the user rather than *for* them.

The Real Vibecode IDE detects fatigue signals in real time, classifies the user's fatigue state, and takes corrective action to reduce exposure. The goal is not to remove features permanently but to respect the user's current cognitive capacity and only surface what they can productively engage with.

---

## Six Fatigue Signals

The system monitors six distinct fatigue signals, each representing a different behavioral pattern that indicates the user is experiencing feature overload.

### 1. IgnoredPanel

**What it detects**: A panel has been visible for an extended period without any interaction (clicks, hovers, or keyboard focus). The user is aware of the panel but is choosing not to engage with it.

**Measurement**: Panel visible for > 5 minutes with zero interactions.

**Example**: The AI suggestions panel has been open for 10 minutes but the user hasn't clicked any suggestion or even hovered over the panel.

**Signal strength**: Moderate — the panel may simply not be relevant to the current task.

### 2. RepetitiveDismissal

**What it detects**: The user has dismissed the same feature or notification type multiple times in a short period. This is the clearest signal that a feature is unwanted.

**Measurement**: 3+ dismissals of the same feature within a 10-minute window.

**Example**: The user has closed the "Try AI auto-fix" suggestion 4 times in the last 8 minutes.

**Signal strength**: High — the user is actively rejecting this feature.

### 3. UnusedCapability

**What it detects**: A feature that has been Available or Recommended for the user's entire session but has received zero engagement. The feature is visible but never used.

**Measurement**: Feature available for full session (> 30 minutes) with zero usage events.

**Example**: The execution graph has been available for 45 minutes but the user has never opened it.

**Signal strength**: Low-Moderate — the feature may not be needed for the current task but could be needed later.

### 4. PromptRejection

**What it detects**: The user has rejected an AI prompt or suggestion — either by dismissing the suggestion card, clicking "Don't show again," or explicitly choosing a different action.

**Measurement**: AI suggestion rejection rate > 70% over the last 20 suggestions.

**Example**: The AI has suggested 15 code completions in the last hour and the user has accepted only 2.

**Signal strength**: High — the user is actively rejecting AI assistance, suggesting either fatigue or misalignment.

### 5. AttentionAbandonment

**What it detects**: The user starts engaging with a feature (opens a panel, starts reading) but quickly abandons it without completing the expected interaction.

**Measurement**: Panel opened and closed within < 5 seconds, 3+ times.

**Example**: The user opens the execution plan panel, glances at it for 2 seconds, and closes it. This happens repeatedly.

**Signal strength**: Moderate — the feature might be confusing or overwhelming in its current presentation.

### 6. RapidClosures

**What it detects**: The user is closing multiple panels, notifications, or suggestions in rapid succession — a "clearing the desk" behavior that indicates overwhelm.

**Measurement**: 5+ close/dismiss actions within a 60-second window.

**Example**: The user closes the AI panel, dismisses 3 notifications, and closes the problems panel all within 45 seconds.

**Signal strength**: Very High — the user is actively trying to reduce visual noise.

---

## Fatigue States

Based on the accumulated fatigue signals, the system classifies the user into one of four fatigue states. Each state triggers increasingly aggressive mitigation actions.

| State | Fatigue Score Range | Description | System Response |
|---|---|---|---|
| **Healthy** | 0.0 – 0.3 | User is engaging productively with surfaced features | Normal feature exposure; all surfacing rules active |
| **Moderate** | 0.3 – 0.6 | Some fatigue signals detected; user is showing mild disengagement | Reduce suggestion frequency by 25%; suppress RepetitiveDismissal features |
| **Elevated** | 0.6 – 0.8 | Multiple fatigue signals; user is actively avoiding features | Suppress all Suggested features; enter Reduced minimalism mode; cooldown active features |
| **Critical** | 0.8 – 1.0 | Severe fatigue; user is overwhelmed and disengaging | Enter Silent minimalism mode; suppress all non-essential surfaces; defer all notifications |

### State Transition Rules

- **Healthy → Moderate**: Requires 2+ distinct fatigue signals within 15 minutes
- **Moderate → Elevated**: Requires RepetitiveDismissal + one other signal, OR RapidClosures detected
- **Elevated → Critical**: Requires RapidClosures OR PromptRejection rate > 90%
- **Any → Healthy (recovery)**: No fatigue signals for 15 minutes; fatigue score decays at 0.05/minute

---

## Cooldown Mechanism

The cooldown mechanism is the primary tool for preventing repetitive feature fatigue. When a user dismisses a feature multiple times, the system enters that feature into a cooldown period during which it will not be surfaced again.

### Rules

- **3+ dismissals within 30 minutes** → Feature enters 30-minute cooldown
- **5+ dismissals within 2 hours** → Feature enters 2-hour cooldown
- **"Don't show again" action** → Feature enters 24-hour cooldown
- **Cooldown extension**: If the user dismisses a feature immediately after cooldown expires, the next cooldown is doubled (exponential backoff: 30min → 1hr → 2hr → 4hr → 8hr)

### Cooldown State

```typescript
interface FeatureCooldown {
  featureId: string;
  dismissCount: number;
  cooldownUntil: number;        // timestamp
  cooldownDuration: number;     // milliseconds
  lastDismissal: number;        // timestamp
  backoffLevel: number;         // 0 = 30min, 1 = 1hr, 2 = 2hr, etc.
}
```

The cooldown is *per-feature*, not global. A user who dismisses the AI auto-fix suggestion 5 times will have that specific feature cooled down, but the AI code completion suggestion remains available.

---

## Fatigue Reduction Actions

When the fatigue state exceeds Healthy, the system applies one or more reduction actions to decrease the feature exposure pressure.

### reduce-exposure

**When applied**: Moderate fatigue state

**What it does**: Reduces the frequency of feature suggestions by 25%. Features that were being surfaced every 5 minutes are now surfaced every 7 minutes. Suggested features that have been dismissed even once are moved to Available (hidden from view but accessible).

**Scope**: Affects only Suggested-visibility features. Available and Recommended features remain unchanged.

### suppress-noise

**When applied**: Elevated fatigue state

**What it does**: Suppresses all Suggested features entirely. They become Hidden until fatigue recovers to Moderate or lower. Non-critical notifications are batched and deferred. Badge counts are hidden. Animation and motion are reduced by 60%.

**Scope**: Affects Suggested features and non-essential notifications.

### cool-down-suggestions

**When applied**: When RepetitiveDismissal signal is detected for any feature

**What it does**: Applies the cooldown mechanism to the specific feature. The feature is not removed from the UI entirely, but it will not be actively promoted or suggested. If the feature is in a panel, the panel remains but the suggestion badge is removed.

**Scope**: Per-feature, based on dismissal count.

### simplify-visuals

**When applied**: Critical fatigue state

**What it does**: Enters Silent minimalism mode. All non-essential chrome is removed. The editor dominates 90% of the screen. Only Core features remain visible. All animations are paused. Notifications are completely suppressed and queued for later delivery. The interface becomes as quiet as possible.

**Scope**: Global — affects all surfaces, animations, and notifications.

---

## Fatigue Score Calculation

The fatigue score is a composite metric calculated from the six fatigue signals, weighted by their severity and recency.

```typescript
function calculateFatigueScore(signals: FatigueSignal[]): number {
  const weights = {
    IgnoredPanel: 0.10,
    RepetitiveDismissal: 0.25,
    UnusedCapability: 0.10,
    PromptRejection: 0.20,
    AttentionAbandonment: 0.15,
    RapidClosures: 0.20
  };

  let score = 0;
  for (const signal of signals) {
    const recency = getRecencyFactor(signal.timestamp); // 1.0 for recent, decaying to 0.0 over 30 minutes
    const weight = weights[signal.type];
    const intensity = getSignalIntensity(signal);       // 0.0 – 1.0 based on count/severity
    score += weight * intensity * recency;
  }

  return Math.min(score, 1.0);
}
```

The score naturally decays over time. If no new fatigue signals are generated, the score decreases by 0.05 per minute, allowing recovery even without explicit user action.

---

## Before / After Comparison

### Before: Constant Feature Bombardment

```
┌───────────────────────────────────────────────────────────┐
│  ┌──────────┐ ┌───────────────────────┐ ┌──────────────┐ │
│  │ Explorer │ │                       │ │  AI Panel    │ │
│  │          │ │       Editor          │ │  🔔 3 new    │ │
│  │          │ │                       │ │  💡 Try this │ │
│  └──────────┘ └───────────────────────┘ │  ⚡ Auto-fix │ │
│  ┌──────────────────────────────────────┴──────────────┐  │
│  │ 🔔 Notification │ 💡 Suggestion │ ⚡ AI Action      │  │
│  │ "Try graph view"│ "AI can help" │ "Auto-refactor?"  │  │
│  └─────────────────────────────────────────────────────┘  │
│  😰 User: "LEAVE ME ALONE! I'm trying to think!"         │
└───────────────────────────────────────────────────────────┘
```

### After: Respectful Feature Exposure

```
┌───────────────────────────────────────────────────────────┐
│  ┌──────────┐ ┌───────────────────────────────────────┐   │
│  │ Explorer │ │                                       │   │
│  │          │ │           Editor (dominant)            │   │
│  │          │ │                                       │   │
│  │          │ │                                       │   │
│  └──────────┘ └───────────────────────────────────────┘   │
│                                                           │
│  [No notifications. No suggestions. Just the code.]       │
│                                                           │
│  😊 User: "Finally, peace and quiet."                     │
└───────────────────────────────────────────────────────────┘

  Fatigue detected → System entered cooldown → Features deferred
  Notifications queued for delivery when user returns to Idle
```

---

## Implementation Reference

- **Service**: `FeatureFatigueService` (singleton #33)
- **Registration**: `registerSingleton(IFeatureFatigueService, FeatureFatigueService, InstantiationType.Eager)`
- **Interface**: `IFeatureFatigueService` in `vs/workbench/services/adaptiveWorkflow/common/adaptiveWorkflow.ts`
- **Key Methods**: `getFatigueState()`, `calculateFatigueScore()`, `recordDismissal()`, `getCooldownStatus()`, `applyReductionAction()`
