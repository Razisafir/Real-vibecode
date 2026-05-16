# Attention Orchestration

> Phase 13 — Real Product UX Transformation Layer
> How the UI respects user attention and learns from interaction patterns.

---

## Core Principle: "The UI Should Feel Respectful"

Real Vibecode treats user attention as a finite, precious resource. Every notification, panel, highlight, and animation is an interruption — a request for the user's focus. The system must treat each such request with the gravity it deserves, asking not "can we show this?" but "should we show this, right now, for this user?"

A respectful UI exhibits these qualities:

1. **It doesn't interrupt twice for the same thing.** If the user dismissed a notification, the system remembers and doesn't repeat it.
2. **It knows when the user is busy.** Typing, debugging, or reading code are protected states. Interruptions during these states must be truly critical.
3. **It learns from behavior.** Dismissal patterns, interaction frequencies, and ignore rates inform future presentation decisions.
4. **It speaks softly.** When information must be presented, it uses the minimum viable visual weight — a dot instead of a badge, a dim line instead of a bright highlight.
5. **It never assumes urgency.** Unless a signal is genuinely critical (build failure, crash, data loss), it defaults to non-interrupting presentation.

---

## User Interaction Tracking

The system tracks five types of user interaction with UI surfaces:

### Interaction Types

| Interaction | Definition | Tracked For |
|---|---|---|
| **Click** | User clicks on a surface or its elements | Panels, notifications, inline decorations |
| **Hover** | User hovers over a surface for > 300ms | Panels, inline decorations, status items |
| **Focus** | User activates a surface (keyboard focus, tab switch) | Panels, editor, terminal |
| **Dismiss** | User explicitly closes or dismisses a surface | Notifications, panels, suggestions |
| **Ignore** | User does not interact with a surface that was presented for > 5 seconds | Notifications, suggestions, highlights |

### Tracking Data Structure

Each tracked interaction records:

```typescript
interface AttentionEvent {
  surfaceId: string;          // Unique identifier for the UI surface
  interactionType: 'click' | 'hover' | 'focus' | 'dismiss' | 'ignore';
  timestamp: number;          // Unix timestamp
  context: string;            // What the user was doing (editing, idle, reading)
  surfaceTier: 1 | 2 | 3 | 4;
  notificationPriority?: 'critical' | 'important' | 'normal' | 'low';
}
```

The system maintains a rolling window of the last 500 attention events per session, with older events gradually decaying in weight.

---

## Dismissal Tracking and Auto-Suppression

The most powerful signal the system has is **dismissal**. When a user dismisses something, they are explicitly saying "this is not worth my attention right now." The system respects this signal and escalates it over time.

### Auto-Suppression Rules

| Dismissal Count | Auto-Suppression Action | Duration |
|---|---|---|
| 1 dismissal | Reduce visual weight (badge → dot, panel → collapsed) | 10 minutes |
| 2 dismissals | Suppress the surface type entirely | 20 minutes |
| 3 dismissals | Auto-suppress: the surface will not appear at all | 30 minutes |
| 5+ dismissals | Permanently downgrade the surface's attention priority | Rest of session |

### Dismissal Decay

Dismissals decay over time. A dismissal from 30 minutes ago counts as 0.5 dismissals. A dismissal from 60 minutes ago counts as 0.25. This prevents a single bad morning from permanently muting useful surfaces for the rest of the day.

### Reset Conditions

A dismissal count resets to zero if:
- The user explicitly clicks on the surface (indicating renewed interest)
- The user changes their interruption policy for that surface type
- A new session starts (dismissals do not persist across sessions)

---

## Attention Priority Levels

Every surface and notification in the system is assigned an Attention Priority Level that determines how aggressively it may compete for the user's focus:

| Level | Value | Presentation Rule | Examples |
|---|---|---|---|
| **Critical** | 4 | Always shown, can interrupt any state | Build failure, crash, data loss risk |
| **Important** | 3 | Shown unless user is actively typing | Test failure, AI action complete, merge conflict |
| **Normal** | 2 | Shown only when user is idle or transitioning | Code suggestion available, git status change, lint fix |
| **Low** | 1 | Shown only as a passive indicator | Tip of the day, update available, analytics summary |
| **Suppressed** | 0 | Not shown at all (auto-suppressed) | Repeatedly dismissed notifications, redundant panels |

### Priority Assignment

Priority is assigned based on:
- **Source classification:** Build system outputs are Important by default; AI suggestions are Normal.
- **User behavior:** Repeated dismissals lower priority (see Auto-Suppression Rules).
- **Context:** A test failure is Critical if the user just ran tests, but Normal if tests were run in the background.
- **Confidence:** High-confidence AI suggestions are Important; low-confidence are Normal.

---

## Interruption Policies

The system defines four interruption policies that control when and how surfaces may interrupt the user:

### Policy Definitions

| Policy | Allowed Interruptions | Use Case |
|---|---|---|
| **Never** | None — all surfaces must be passive indicators only | Deep focus coding, Zen Mode |
| **CriticalOnly** | Only Critical-priority surfaces may interrupt | Focus Mode, active debugging |
| **IdleOnly** | Surfaces may appear only when the user is idle (> 5s no interaction) | Default for Normal-priority items |
| **Contextual** | Surfaces may appear based on the user's current activity context | Default mode, AI suggestions, task completions |

### Policy Assignment by Mode

| User Mode | Default Policy | Override |
|---|---|---|
| Normal editing | Contextual | User can change per-surface |
| Focus Mode | CriticalOnly | Only Critical items visible |
| Zen Mode | Never | No interruptions at all |
| Debugging session | CriticalOnly | Debug events treated as Critical |
| AI task running | IdleOnly | Results shown when execution completes |

### Policy Cascade

When multiple policies could apply, the most restrictive wins:

```
Never > CriticalOnly > IdleOnly > Contextual
```

If the user is in Focus Mode (CriticalOnly) and a surface's category default is Contextual, the CriticalOnly policy applies. The surface will not interrupt.

---

## User Engagement Score

The system computes a **User Engagement Score (UES)** for each surface type, representing how much the user actually values and interacts with that surface:

### Calculation

```
UES = (clicks × 3 + hovers × 1 + focuses × 2) / (presentations × time_weight)
     ─────────────────────────────────────────────────────────────────────────
                    dismissals × 5 + ignores × 2
```

A high UES (> 1.5) means the user actively engages with the surface when it appears. A low UES (< 0.3) means the user generally ignores or dismisses it.

### UES Actions

| UES Range | Action |
|---|---|
| > 1.5 | Surface gets premium presentation — full animation, prominent placement |
| 0.8 – 1.5 | Standard presentation |
| 0.3 – 0.8 | Reduced presentation — smaller, dimmer, shorter display time |
| < 0.3 | Auto-suppression candidate — surface may be hidden by default |

The UES is recalculated every 5 minutes based on the rolling interaction window.

---

## Before/After Analysis

### Before: Repeated Interruptions

```
[User is typing in editor]

  🔔 "A new version of TypeScript is available"     ← Low priority, interrupting
  🔔 "You have 3 unused imports"                     ← Normal, interrupting  
  🔔 "Tip: Use Ctrl+Shift+P for command palette"    ← Low, interrupting
  🔔 "Git: 2 files modified"                         ← Normal, interrupting
  🔔 "AI: I can refactor this function"              ← Normal, interrupting

  User dismisses all 5 notifications...
  30 seconds later:
  🔔 "A new extension update is available"           ← Another low-priority interruption
  🔔 "You have 2 lint warnings"                      ← Same category, already dismissed

  User frustration: HIGH
```

The system treats every notification equally, ignores dismissal signals, and interrupts at any time regardless of user activity.

### After: Respectful, Relevant Only

```
[User is typing in editor — Focus Mode: CriticalOnly]

  (No interruptions — editor is calm)
  (2 dots appear in status bar:  ●  TypeScript update   ●  AI suggestion)

[User pauses typing for 5 seconds — IdleOnly policy activates]

  ●  AI suggestion appears inline as ghost text (not a notification)
  ●  Status bar quietly shows: "3 hints available"

[User dismisses the TypeScript update dot]

  System records dismissal. TypeScript notifications suppressed for 30 minutes.

[User clicks on AI ghost text]

  UES for AI suggestions increases. Future AI suggestions get premium presentation.
```

The system respects the user's focus, presents information passively, learns from dismissals, and rewards engagement.

---

## Attention Flow Diagram

```
                         ┌─────────────────┐
                         │  New Surface or  │
                         │  Notification    │
                         │  Wants to Appear │
                         └────────┬────────┘
                                  │
                                  ▼
                    ┌─────────────────────────┐
                    │  Check Attention Priority│
                    │  Level                   │
                    └─────────┬───────────────┘
                              │
              ┌───────────────┼───────────────┐
              │               │               │
              ▼               ▼               ▼
         Critical        Important        Normal/Low
              │               │               │
              │               │               ▼
              │               │     ┌──────────────────┐
              │               │     │ Check Dismissal   │
              │               │     │ Count             │
              │               │     └────────┬─────────┘
              │               │              │
              │               │     ┌────────┴────────┐
              │               │     │                 │
              │               │     ▼                 ▼
              │               │  ≥3 dismissals    <3 dismissals
              │               │     │                 │
              │               │     ▼                 ▼
              │               │  SUPPRESSED       Check Current
              │               │  (don't show)     Interruption Policy
              │               │                        │
              ▼               ▼              ┌─────────┼──────────┐
        ┌──────────┐   ┌──────────┐          │         │          │
        │ ALWAYS   │   │ Check    │        Never   CriticalOnly  IdleOnly/
        │ SHOW     │   │ Policy   │          │         │       Contextual
        │ (any     │   │          │          ▼         ▼          │
        │  state)  │   └────┬─────┘      BLOCK    Allow if    ┌──┴──────────┐
        └──────────┘        │           (never    user not    │             │
                            │           show)     typing      ▼             ▼
                    ┌───────┼───────┐                        Show when   Show when
                    │       │       │                        user idle   context
                    ▼       ▼       ▼                        for 5s      matches
               CriticalOnly IdleOnly Contextual
                    │       │       │
                    ▼       ▼       ▼
               Allow if   Allow   Allow if
               Critical   idle    contextually
               item       only    relevant
                    │       │       │
                    └───────┼───────┘
                            ▼
                    ┌───────────────┐
                    │  PRESENT with │
                    │  appropriate  │
                    │  visual weight│
                    │  (per UES)    │
                    └───────────────┘
```

---

## Summary

Attention Orchestration ensures that Real Vibecode never feels like a demanding, needy application. By tracking user interactions, learning from dismissals, respecting interruption policies, and adjusting presentation based on engagement scores, the system creates an experience that feels personally tuned. The user's attention is treated as the scarce resource it is, and every request for it must justify itself — not once, but continuously.
