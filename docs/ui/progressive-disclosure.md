# Progressive Disclosure

## Overview

Progressive Disclosure is the core mechanism by which the Real Vibecode IDE reveals features gradually, ensuring users are never overwhelmed by the full depth of the system. Rather than presenting every capability at once — a common failure mode of powerful developer tools — the IDE carefully meters feature visibility based on experience level, trust score, and current activity context. The result is a product that feels simple on day one and grows with the user, unlocking depth precisely when it becomes relevant and earned.

The philosophy is borrowed from masterful physical product design: a Swiss Army knife doesn't display all blades simultaneously; a camera's manual mode is discovered after mastering auto. Our IDE applies the same principle to every surface, command, and AI capability.

---

## Feature Visibility States

Every feature in the IDE exists in one of five visibility states. These states determine how — or whether — a feature is presented to the user at any given moment.

| State | Description | Example |
|---|---|---|
| **Hidden** | Feature is completely invisible. No UI surface, no menu entry, no keyboard hint. | Execution graph visualization for a brand-new user |
| **Suggested** | Feature appears as a subtle hint — a lightbulb icon, a one-line tooltip, or a "Did you know?" nudge. No persistent surface. | AI auto-fix suggestion badge after a lint error |
| **Available** | Feature is accessible but not promoted. It appears in command palettes, menus, and sidebars without visual emphasis. | Terminal intelligence panel — visible but not highlighted |
| **Recommended** | Feature is actively promoted with visual emphasis — highlighted in the sidebar, bold in menus, or flagged with a badge. | AI planning panel when the user is in AIPlanning context |
| **Expert** | Feature is only visible in Expert Mode or through explicit opt-in. Requires Advanced experience level. | Execution replay timeline, autonomy tuning sliders |

The transition between states is never abrupt. A feature moves from Hidden → Suggested only after contextual triggers indicate the user might benefit, and from Suggested → Available only after the user has engaged with the suggestion or reached a qualifying experience threshold. This graduated approach prevents the "feature wall" that makes traditional IDEs intimidating.

---

## Feature Maturity Levels

Independent of visibility, every feature is classified by maturity — its intended audience and complexity tier. Maturity determines the *ceiling* of visibility a feature can reach for a given user.

| Maturity | Audience | Visibility Ceiling (Beginner) | Visibility Ceiling (Power User) |
|---|---|---|---|
| **Core** | All users | Recommended | Recommended |
| **Standard** | Regular users | Available | Recommended |
| **Advanced** | Experienced users | Suggested | Available |
| **Power** | Power users | Hidden | Available |
| **Internal** | System-level / diagnostic | Hidden | Expert |

A Core feature like "save file" is always Recommended regardless of user level. An Internal feature like "system diagnostics" is always gated behind Expert mode. The maturity-visibility matrix ensures that no feature ever appears above its ceiling for a given experience level, creating a hard boundary that prevents accidental complexity exposure.

---

## Experience-Based Visibility Calculation

The visibility of any feature at runtime is computed by the `ProgressiveDisclosureService` using the following algorithm:

```
function computeVisibility(feature, user, context):
  maturity = feature.maturity
  experience = user.experienceLevel
  trustScore = user.trustScore
  activityContext = context.currentActivity

  // Step 1: Determine maximum allowed visibility from maturity ceiling
  ceiling = MATURITY_CEILING[maturity][experience]

  // Step 2: Adjust for trust score (trust can unlock one level above ceiling)
  if trustScore >= 0.7 and ceiling < Recommended:
    ceiling = min(ceiling + 1, Recommended)

  // Step 3: Context promotion (e.g., AIPlanning promotes AI features)
  if feature.contextAffinity == activityContext:
    ceiling = min(ceiling + 1, Expert)

  // Step 4: Fatigue demotion (if user is in elevated fatigue, suppress)
  if user.fatigueState == Critical:
    ceiling = min(ceiling, Available)

  // Step 5: Usage-based promotion (frequently used features stay visible)
  if feature.usageCount > 20 and ceiling == Suggested:
    ceiling = Available

  return ceiling
```

This multi-factor calculation ensures that visibility is never static — it responds to who the user is, what they're doing, and how they're feeling (fatigue state). The result is a living interface that breathes with the user's journey.

---

## Trust-Score Gating

Certain features — particularly those involving AI autonomy — are gated by trust score thresholds. This is a critical safety mechanism: we never expose autonomous AI actions to users who haven't demonstrated sufficient trust alignment with the system.

| Trust Score Range | Gated Capabilities |
|---|---|
| 0.0 – 0.3 | AI suggestions only (no auto-apply); execution graph hidden |
| 0.3 – 0.5 | AI auto-format and auto-lint; execution graph in Suggested state |
| 0.5 – 0.7 | AI auto-fix for known patterns; replay engine suggested |
| 0.7 – 0.9 | AI auto-refactor; full execution graph; autonomy tuning available |
| 0.9+ | AI auto-execute for trusted operations; all expert capabilities |

Trust-score gating prevents the most dangerous failure mode in AI-assisted development: giving a novice user access to autonomous AI actions they don't understand and can't evaluate. The trust score is earned, never given.

---

## Context-Triggered Feature Surfacing

The activity context system acts as a real-time feature promoter. When a user transitions into a new activity context, features with high affinity for that context are elevated:

- **Coding → Debugging**: The call stack panel elevates from Available to Recommended; the watch panel appears from Suggested to Available
- **Coding → AIPlanning**: The execution plan panel elevates from Available to Recommended; the graph view surfaces from Hidden to Suggested
- **Any → Idle**: Discovery tips surface — "You haven't tried X yet" — for features in Suggested state that match the user's experience level

Context-triggered surfacing is always *additive* — it only promotes features, never demotes them. Demotion happens through fatigue detection and manual dismissal.

---

## Discovery and Usage Tracking

The system maintains a per-feature usage ledger that tracks:

- **Presentation count**: How many times a feature was made visible
- **Engagement count**: How many times the user actually used it
- **Dismissal count**: How many times the user explicitly closed or dismissed it
- **Time-to-engagement**: Average delay between presentation and first use
- **Recency**: When was the feature last used

This data feeds back into the visibility calculation. Features with high engagement rates maintain their visibility state. Features with high dismissal rates trigger fatigue signals and are demoted. Features with zero engagement after 50+ presentations are silently Hidden to reduce noise.

The discovery system also powers the "Feature Discovery" panel, which shows users a curated list of features they haven't tried yet, filtered by their experience level and current context. This is the only place where Hidden features can be proactively discovered — and only by explicit user action.

---

## Before / After Comparison

### Before: Everything Visible

```
┌──────────────────────────────────────────────────────────────┐
│  [File] [Edit] [Selection] [View] [Go] [Run] [Terminal]     │
│  [AI] [Debug] [Graph] [Replay] [Orchestration] [Diagnostics]│
│ ┌────────┐ ┌──────────┐ ┌──────────┐ ┌────────────────────┐ │
│ │ Explorer│ │ AI Panel │ │ Graph    │ │ Terminal           │ │
│ │        │ │          │ │          │ │                    │ │
│ │        │ │          │ │          │ │                    │ │
│ └────────┘ └──────────┘ └──────────┘ └────────────────────┘ │
│ ┌──────────────────┐ ┌─────────────────────────────────────┐ │
│ │ Problems (23)    │ │ Output │ Debug │ Replay │ Diagnostics│ │
│ └──────────────────┘ └─────────────────────────────────────┘ │
│  😰 User: "Where do I even start?!"                          │
└──────────────────────────────────────────────────────────────┘
```

### After: Progressive Disclosure (Beginner User)

```
┌──────────────────────────────────────────────────────────────┐
│  [File] [Edit] [View] [Run]                                  │
│ ┌────────┐ ┌──────────────────────────────────────────────┐  │
│ │ Explorer│ │                                              │  │
│ │        │ │           Editor (dominant)                   │  │
│ │        │ │                                              │  │
│ └────────┘ └──────────────────────────────────────────────┘  │
│ ┌──────────────────────────────────────────────────────────┐  │
│ │ 💡 Terminal · AI hint: "Ask me to explain this code"     │  │
│ └──────────────────────────────────────────────────────────┘  │
│  😊 User: "This feels clean and simple."                     │
└──────────────────────────────────────────────────────────────┘
```

---

## Progressive Disclosure Map

```
                        FEATURE VISIBILITY MAP
                        ═════════════════════

  BEGINNER                    INTERMEDIATE               ADVANCED                POWER USER
  ────────                    ────────────               ────────                ──────────

  Core ─────► Recommended ──► Recommended ──► Recommended ──► Recommended
  Standard ──► Available ───► Available ───► Recommended ──► Recommended
  Advanced ──► Suggested ───► Available ───► Available ───► Recommended
  Power ─────► Hidden ──────► Suggested ───► Available ───► Available
  Internal ──► Hidden ──────► Hidden ──────► Expert ──────► Expert

                     ↕ Trust Score Modifiers
            ┌─────────────────────────────────────────┐
            │  trust >= 0.7  →  +1 visibility level   │
            │  fatigue == Critical → cap at Available │
            │  context match → +1 (max Expert)        │
            │  usage > 20   →  Suggested → Available  │
            └─────────────────────────────────────────┘
```

---

## Implementation Reference

- **Service**: `ProgressiveDisclosureService` (singleton #30)
- **Registration**: `registerSingleton(IProgressiveDisclosureService, ProgressiveDisclosureService, InstantiationType.Eager)`
- **Interface**: `IProgressiveDisclosureService` in `vs/workbench/services/adaptiveWorkflow/common/adaptiveWorkflow.ts`
- **Key Methods**: `computeVisibility()`, `getVisibleFeatures()`, `trackFeatureUsage()`, `dismissFeature()`
