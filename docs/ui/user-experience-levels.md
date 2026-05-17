# User Experience Levels

## Overview

The Real Vibecode IDE does not treat all users identically. A first-time developer opening the editor for the first time has fundamentally different needs than a power user who has executed 2,000+ operations with the AI system. User Experience Levels provide the foundational profiling mechanism that drives every adaptive behavior in the system — from progressive disclosure to feature gating, from layout adaptation to autonomy permissions.

Experience levels are not manually selected. They are *computed* from observable behavior, ensuring that the system's assessment always matches the user's actual capability, not their self-perception. A user who claims to be advanced but dismisses every AI suggestion will remain at Intermediate until their trust score justifies promotion.

---

## The Four Experience Levels

### Beginner

The Beginner level is the default state for all new users. The interface is maximally simplified: only Core features are Recommended, Standard features are Available, and everything else is Hidden or Suggested. The AI operates in FullConsent mode — it suggests but never acts autonomously. The layout emphasizes the editor and explorer, with all secondary surfaces suppressed.

**Characteristics**:
- Sees only essential UI surfaces (editor, explorer, terminal)
- AI provides suggestions only; no auto-apply
- All Advanced/Power/Internal features are Hidden
- Onboarding flow is active and guides discovery
- Keyboard shortcuts are minimal and discoverable
- Error messages are simplified and action-oriented

### Intermediate

The Intermediate level represents a user who has become comfortable with the basics and is ready for guided exploration of deeper capabilities. Standard features become Recommended, Advanced features surface as Suggested hints, and the AI gains ConditionalConsent — it can auto-format but still asks before making semantic changes.

**Characteristics**:
- Standard features are Recommended (AI panel, integrated terminal, search)
- Advanced features appear as suggestions ("Try the execution graph")
- AI operates in ConditionalConsent mode
- Context-specific panels begin surfacing
- Workflow style detection is active

### Advanced

The Advanced level represents a skilled user who understands the AI-assisted workflow deeply. They have used at least 10 distinct features beyond the basics, have a trust score of 0.5+, and have accumulated 500+ interactions. The AI operates in Supervised mode — it can auto-fix known patterns but defers novel operations for approval.

**Characteristics**:
- Advanced features are Available; some are Recommended based on context
- Power features begin appearing as suggestions
- AI operates in Supervised mode with auto-fix capabilities
- Expert mode becomes accessible
- Workflow complexity tolerance is higher; more panels can be visible simultaneously

### Power User

The Power User level represents the deepest tier of engagement. These users have 2,000+ interactions, a trust score of 0.7+, and have used 25+ features. They see the full depth of the system: Power features are Available, Internal features are accessible in Expert mode, and the AI operates in Trusted mode with broad autonomous permissions.

**Characteristics**:
- Power features are Available; Internal features accessible in Expert mode
- AI operates in Trusted mode (auto-refactor, auto-execute for trusted operations)
- Full orchestration depth is unlocked
- Layout is fully customizable with maximum surface density
- All keyboard shortcuts and power commands are active

---

## Progression Criteria

Experience level progression is governed by three quantitative thresholds. The system evaluates these continuously and promotes users automatically when all criteria for the next level are met.

| Current Level | Interactions Required | Trust Score Required | Features Used | Result |
|---|---|---|---|---|
| Beginner → Intermediate | 100 | ≥ 0.3 | — (not required) | Automatic promotion |
| Intermediate → Advanced | 500 | ≥ 0.5 | ≥ 10 distinct features | Automatic promotion |
| Advanced → Power User | 2,000 | ≥ 0.7 | ≥ 25 distinct features | Automatic promotion |

**Important constraints**:
- Promotion requires ALL criteria to be met simultaneously. A user with 2,000 interactions but a trust score of 0.4 remains at Intermediate.
- Feature usage counts only *distinct* features. Using "AI explain" 500 times counts as 1 feature, not 500.
- Demotion is possible but requires sustained negative signals (trust score drops below threshold for 30+ consecutive sessions).

### Progression Calculation

```typescript
function computeExperienceLevel(user: UserProfile): ExperienceLevel {
  const { totalInteractions, trustScore, featuresUsed } = user;

  if (totalInteractions >= 2000 && trustScore >= 0.7 && featuresUsed >= 25) {
    return ExperienceLevel.PowerUser;
  }
  if (totalInteractions >= 500 && trustScore >= 0.5 && featuresUsed >= 10) {
    return ExperienceLevel.Advanced;
  }
  if (totalInteractions >= 100 && trustScore >= 0.3) {
    return ExperienceLevel.Intermediate;
  }
  return ExperienceLevel.Beginner;
}
```

---

## Workflow Styles

Beyond experience level, the system detects and adapts to the user's preferred workflow style. Workflow style influences *how* features are presented, not *which* features are visible.

| Style | Description | UI Adaptation |
|---|---|---|
| **KeyboardFirst** | User relies heavily on keyboard shortcuts, command palette, and minimal mouse interaction | Panels auto-hide; keyboard hints are prominent; command palette is the primary discovery surface |
| **VisualFirst** | User navigates primarily through UI panels, sidebars, and mouse-driven interactions | Panels remain visible; visual affordances are emphasized; drag-and-drop is prominent |
| **Hybrid** | User switches fluidly between keyboard and visual navigation | Balanced layout; both keyboard and visual discovery paths are equally weighted |
| **AICollaborative** | User delegates heavily to AI, using natural language as a primary interaction mode | AI panel is elevated; chat input is always accessible; AI suggestions are more prominent |

Workflow style detection uses a weighted analysis of input patterns over the last 100 interactions:

```typescript
function detectWorkflowStyle(inputHistory: InputEvent[]): WorkflowStyle {
  const keyboardRatio = countKeyboardEvents(inputHistory) / inputHistory.length;
  const aiRatio = countAIInteractions(inputHistory) / inputHistory.length;
  const mouseRatio = countMouseEvents(inputHistory) / inputHistory.length;

  if (aiRatio > 0.4) return WorkflowStyle.AICollaborative;
  if (keyboardRatio > 0.7) return WorkflowStyle.KeyboardFirst;
  if (mouseRatio > 0.6) return WorkflowStyle.VisualFirst;
  return WorkflowStyle.Hybrid;
}
```

---

## Automation Trust Level

The Automation Trust Level is a sub-metric within the user profile that specifically tracks how comfortable the user is with AI-driven automation. It differs from the global trust score in that it focuses exclusively on automation acceptance — the ratio of AI-suggested actions that the user approves versus rejects.

- **Low Automation Trust** (< 0.3): User rejects most AI suggestions. System presents AI actions as optional hints with clear explanations.
- **Medium Automation Trust** (0.3 – 0.7): User selectively accepts AI suggestions. System presents AI actions with brief justifications.
- **High Automation Trust** (> 0.7): User consistently approves AI actions. System gains broader automation permissions within the current autonomy level.

This metric directly feeds into the Autonomy Trust Model (see `autonomy-trust-model.md`) and determines which AI actions can proceed without explicit confirmation.

---

## Dismissed Feature Rate

The Dismissed Feature Rate (DFR) measures the percentage of surfaced features that the user explicitly dismisses. A high DFR indicates that the system is surfacing features too aggressively for the user's current tolerance level.

```
DFR = (total_dismissals / total_feature_presentations) × 100
```

| DFR Range | System Response |
|---|---|
| 0% – 15% | Healthy. Feature surfacing rate is appropriate. |
| 15% – 30% | Elevated. Reduce suggestion frequency by 25%. |
| 30% – 50% | High. Suppress all suggestions; only show Available+ features. |
| > 50% | Critical. Enter contextual minimalism mode; suppress all non-essential surfaces. |

The DFR feeds directly into the Feature Fatigue Detection system (see `feature-fatigue.md`), creating a feedback loop that prevents the system from repeatedly surfacing unwanted features.

---

## Workflow Complexity Tolerance

Workflow Complexity Tolerance (WCT) is a derived metric that represents the user's comfort level with complex, multi-panel layouts. It's calculated from:

- **Simultaneous panel usage**: How many panels the user typically has open
- **Panel switch frequency**: How often the user switches between panels
- **Feature depth utilization**: How deeply the user explores feature sub-options

| WCT Level | Max Visible Surfaces | Layout Density |
|---|---|---|
| Low | 2–3 | Minimal chrome, large editor |
| Medium | 4–5 | Balanced layout with sidebar |
| High | 6–8 | Full layout with multiple panels |
| Very High | Unlimited | Dense layout, all panels accessible |

WCT prevents the system from presenting a Power User layout to a user who prefers minimalism, even if their experience level qualifies them for more surfaces.

---

## Before / After Comparison

### Before: Same UI for Everyone

```
┌───────────────────────────────────────────────────────────┐
│                                                           │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐           │
│  │Panel1│ │Panel2│ │Panel3│ │Panel4│ │Panel5│           │
│  └──────┘ └──────┘ └──────┘ └──────┘ └──────┘           │
│                                                           │
│  Every user sees identical layout regardless of skill     │
│                                                           │
│  😰 Beginner: "Too much going on"                         │
│  😐 Advanced: "I need more panels"                        │
│  😤 Power User: "Where are the advanced tools?"            │
│                                                           │
└───────────────────────────────────────────────────────────┘
```

### After: UI Adapts to Skill Level

```
  BEGINNER                          POWER USER
  ────────                          ──────────
  ┌────────────────────┐            ┌──────┬──────┬──────┐
  │ Explorer           │            │Explr │ Debug│ Graph│
  ├────────────────────┤            ├──────┼──────┼──────┤
  │                    │            │      │      │      │
  │   Editor (90%)     │            │      │Editor│      │
  │                    │            │      │(60%) │      │
  │                    │            │      │      │      │
  ├────────────────────┤            ├──────┴──────┴──────┤
  │ 💡 Hint            │            │ Term │ AI │ Replay │
  └────────────────────┘            └──────┴────┴────────┘
  😊 "Clean and simple"             😊 "Everything I need"
```

---

## Implementation Reference

- **Service**: `UserExperienceLevelService` (singleton #31)
- **Registration**: `registerSingleton(IUserExperienceLevelService, UserExperienceLevelService, InstantiationType.Eager)`
- **Interface**: `IUserExperienceLevelService` in `vs/workbench/services/adaptiveWorkflow/common/adaptiveWorkflow.ts`
- **Key Methods**: `getExperienceLevel()`, `getWorkflowStyle()`, `trackInteraction()`, `getDismissedFeatureRate()`, `getWorkflowComplexityTolerance()`
