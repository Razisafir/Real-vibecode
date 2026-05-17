# Emotional Friction Detection

## Overview

The `IEmotionalFrictionService` detects interaction friction — the observable resistance a user encounters while working within the IDE. This service is strictly about **interaction friction**, not emotions. It monitors patterns of user behavior that indicate the IDE itself is creating obstacles, and proposes concrete actions to reduce that friction.

---

## CRITICAL ETHICAL BOUNDARIES

This service operates under strict ethical constraints that are non-negotiable:

- **NEVER pretend to read emotions** — the service infers ONLY interaction friction from observable behavioral patterns (clicks, keypresses, timing, navigation sequences). There is no emotion detection. There is no sentiment analysis. There is no "mood reading."
- **NO creepy anthropomorphic behavior** — the system does not speak as if it has feelings, consciousness, or understanding of the user's emotional state.
- **NO fake empathy** — messages like "I can see you're frustrated" or "I understand how you feel" are strictly prohibited.
- **NO emotionally manipulative responses** — the system never uses concern-trolling, guilt-tripping, or emotional leverage to influence behavior.
- **No productivity-guilt** — the system never implies the user should be working faster, harder, or more efficiently. Friction reduction serves the user's comfort, not productivity metrics.

This is about **reducing friction**, not reading minds. The distinction is fundamental and inviolable.

---

## Friction Signals

The service recognizes 8 distinct friction signals, each derived from purely observable interaction patterns:

### 1. RepeatedUndo
The user performs the same undo operation multiple times in rapid succession. This typically indicates that an automated action produced an undesirable result, or that the IDE's auto-correction overstepped the user's intent.

- **Observable pattern**: 3+ undo operations within 5 seconds targeting the same change
- **Friction meaning**: The IDE did something the user didn't want; the user is fighting the tool
- **Severity baseline**: 0.3 (mild) to 0.9 (severe — more than 5 rapid undos)

### 2. RapidToggling
The user rapidly switches a setting, panel, or view on and off. This indicates uncertainty about the desired state or confusion about what the toggle controls.

- **Observable pattern**: 3+ toggle operations on the same control within 10 seconds
- **Friction meaning**: The UI element is confusing or the user can't find the state they want
- **Severity baseline**: 0.2 (mild) to 0.7 (moderate)

### 3. AggressiveClosing
The user rapidly closes multiple panels, tabs, or notifications in quick succession. This indicates the workspace has become cluttered or the user is being presented with unwanted surfaces.

- **Observable pattern**: 4+ close actions within 8 seconds
- **Friction meaning**: Too many UI elements are demanding attention; the workspace feels invasive
- **Severity baseline**: 0.4 (moderate) to 0.8 (high)

### 4. CommandRetry
The user executes the same command multiple times, possibly with slight variations, suggesting the command didn't produce the expected result the first time.

- **Observable pattern**: 2+ invocations of the same command within 15 seconds without intermediate actions
- **Friction meaning**: The command behavior is unclear or the result doesn't match expectation
- **Severity baseline**: 0.3 (mild) to 0.7 (moderate)

### 5. HesitationPause
The user initiates an action but pauses mid-interaction (e.g., starts typing a command, stops, deletes, starts again). This is detected through typing cadence analysis, not content inspection.

- **Observable pattern**: Typing starts, pauses for 3+ seconds, backspaces, restarts — pattern repeats
- **Friction meaning**: The user is uncertain about how to proceed; discoverability may be poor
- **Severity baseline**: 0.2 (mild) to 0.5 (moderate)

### 6. RapidContextSwitch
The user bounces between multiple files, panels, or tools without completing actions in any of them. This indicates the workflow requires too much context-switching or the needed information is fragmented across surfaces.

- **Observable pattern**: 5+ surface switches within 20 seconds without task completion events
- **Friction meaning**: The workflow is fragmented; the IDE isn't surfacing needed context cohesively
- **Severity baseline**: 0.3 (mild) to 0.8 (high)

### 7. InterruptionFrustration
The user immediately dismisses or closes an auto-triggered notification, suggestion, or panel. This indicates the system interrupted at an inappropriate time.

- **Observable pattern**: Auto-triggered surface dismissed within 1 second of appearance
- **Friction meaning**: The interruption was poorly timed; the system violated the user's focus
- **Severity baseline**: 0.4 (moderate) to 0.9 (severe — repeated pattern)

### 8. AbandonReopenLoop
The user closes a file or panel and then reopens it within a short time. This suggests the workspace layout doesn't match the user's actual needs, or closing was accidental due to UI proximity issues.

- **Observable pattern**: Close followed by reopen of the same resource within 30 seconds
- **Friction meaning**: Layout friction; the user is fighting the workspace organization
- **Severity baseline**: 0.2 (mild) to 0.6 (moderate)

---

## Friction Detection Model

```typescript
interface FrictionDetection {
  signal: FrictionSignal;
  severity: number;       // 0.0 to 1.0 — how significant the friction is
  suggestedAction: FrictionReductionAction;
  context: string;        // What was happening when friction was detected
  timestamp: number;
}
```

The `severity` field ranges from 0 (no friction) to 1 (extreme friction). Severity is computed from signal frequency, recency, and clustering. A single RepeatedUndo event might score 0.3; repeated instances within a session escalate the score.

The `suggestedAction` is a concrete, mechanical recommendation — not a behavioral suggestion. It addresses what the IDE should change, not what the user should do.

---

## Friction Reduction Actions

When friction is detected, the service proposes one of 5 reduction actions:

### simplify-flow
Streamline the current interaction path. Remove unnecessary intermediate steps. If the user is toggling rapidly, simplify the toggle's behavior or combine related settings. If the user is retrying commands, clarify the command's feedback.

### reduce-steps
The current task requires too many discrete actions. Consolidate operations, provide batch actions, or eliminate mandatory intermediate states. Applied when CommandRetry or RapidToggling signals are dominant.

### auto-correct
The IDE made an automated change the user didn't want. Reduce the aggressiveness of auto-correction, make it reversible with a single action, or defer it to a less disruptive time. Applied primarily for RepeatedUndo signals.

### suppress-noise
Too many UI elements are demanding attention. Reduce notification frequency, collapse auto-opened panels, suppress non-essential suggestions. Applied for AggressiveClosing and InterruptionFrustration signals.

### restore-context
The user lost their place or their workspace state was disrupted. Restore the previous layout, reopen closed resources, resurface the last-active context. Applied for AbandonReopenLoop and RapidContextSwitch signals.

---

## Anti-Patterns (Strictly Prohibited)

The following behaviors are **categorically forbidden** in any friction-related feature:

1. **Fake empathy messages** — Never display messages like "I can see you're having trouble" or "Let me help you with that." The system should silently reduce friction, not comment on it.
2. **Emotion-reading claims** — Never use language that implies the system understands the user's feelings. No "frustration detected," no "you seem stressed."
3. **Anthropomorphic responses** — Never personify the system. No "I noticed," no "I feel like," no "Let me take care of this for you."
4. **Manipulative concern** — Never use apparent concern as a mechanism to steer behavior. No "Are you sure?" prompts triggered by friction signals.

The correct response to friction is always **silent, mechanical improvement** — adjust the UI, reduce the steps, restore the context. The user should never know the system detected friction; they should only experience a smoother workflow.
