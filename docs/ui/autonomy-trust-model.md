# Trust & Autonomy Evolution

## Overview

The Trust & Autonomy Evolution model is the foundational safety system that ensures the AI in the Real Vibecode IDE earns its autonomy rather than claiming it. In most AI-assisted development tools, AI either acts with full autonomy (dangerous for novices) or requires constant approval (frustrating for experts). Our model creates a graduated path where the AI starts with minimal permissions and progressively gains autonomy as the user demonstrates trust through their interaction patterns.

The core principle is simple: **trust is earned, not given**. The AI begins in a fully consensual mode where it can only suggest actions. As the user accepts suggestions, approves AI operations, and builds a positive interaction history, the trust score rises, and the AI gains broader permissions. If the user begins overriding AI actions or rejecting suggestions, the trust score falls, and the AI's autonomy is de-escalated.

---

## Five Autonomy Levels

The system defines five distinct autonomy levels, each granting the AI progressively broader permissions. The user's current trust score determines which autonomy level is active.

| Level | Trust Threshold | AI Behavior | User Experience |
|---|---|---|---|
| **FullConsent** | 0.0+ (default) | AI can only suggest; every action requires explicit user approval | "AI is my assistant — it asks before doing anything" |
| **ConditionalConsent** | ≥ 0.3 | AI can auto-format and auto-lint; semantic changes require approval | "AI handles formatting; I approve the real changes" |
| **Supervised** | ≥ 0.5 | AI can auto-fix known patterns; novel changes require approval | "AI fixes the obvious stuff; I review the tricky parts" |
| **Trusted** | ≥ 0.7 | AI can auto-refactor and auto-optimize; structural changes require approval | "AI has earned my trust for most operations" |
| **FullAutonomy** | ≥ 0.9 | AI can auto-execute trusted operations without confirmation | "AI and I are a team — it handles routine work independently" |

### Autonomy Level Details

**FullConsent (trust: 0.0–0.29)**
- AI suggestions appear as cards that the user must explicitly accept or dismiss
- No AI action is applied to the codebase without user confirmation
- AI explains every suggestion with a brief justification
- This is the default state for all new users

**ConditionalConsent (trust: 0.3–0.49)**
- Auto-format on save is enabled (formatting is non-semantic and reversible)
- Auto-lint fixes are applied (standard lint rule corrections)
- All other AI suggestions still require approval
- The AI provides shorter justifications (user has demonstrated basic understanding)

**Supervised (trust: 0.5–0.69)**
- Auto-fix for known error patterns (missing semicolons, import corrections, type assertions)
- AI can propose multi-step fixes with a single approval for the entire sequence
- Novel refactoring suggestions still require explicit approval
- AI begins proactively suggesting workflow optimizations

**Trusted (trust: 0.7–0.89)**
- Auto-refactor: AI can restructure code according to established patterns
- Auto-optimize: AI can apply performance improvements to hot paths
- Structural changes (renaming across files, API signature changes) still require approval
- AI provides minimal justification — the user trusts the AI's judgment

**FullAutonomy (trust: 0.9+)**
- Auto-execute: AI can apply changes for trusted operation types without any confirmation
- Trusted operations include: formatting, linting, known fix patterns, established refactoring patterns
- Novel or complex operations still require approval (safety net)
- AI operates as a near-peer collaborator

---

## Trust Score Calculation

The trust score is a floating-point value between 0.0 and 1.0, calculated from the user's interaction history with AI features. It uses a weighted formula that balances acceptance behavior, approval patterns, and override penalties.

### Formula

```
trustScore = (acceptanceRate × 0.4) + (approvalRate × 0.4) + (0.2) - overridePenalty
```

Where:
- **acceptanceRate** (0.0–1.0): The ratio of AI suggestions accepted to total AI suggestions presented
- **approvalRate** (0.0–1.0): The ratio of AI operations approved (after being proposed) to total AI operations proposed
- **base value** (0.2): A baseline trust that ensures the system starts with a non-zero score
- **overridePenalty** (0.0–0.5): A penalty applied when the user explicitly undoes an AI action within 60 seconds

### Calculation Details

```typescript
function calculateTrustScore(history: AIInteractionHistory): number {
  const acceptanceRate = history.acceptedSuggestions / history.totalSuggestions;
  const approvalRate = history.approvedOperations / history.totalOperations;
  const overridePenalty = Math.min(history.recentOverrides * 0.1, 0.5);

  const rawScore = (acceptanceRate * 0.4) + (approvalRate * 0.4) + 0.2 - overridePenalty;
  
  // Apply recency weighting: recent interactions count more
  const recencyWeighted = applyRecencyDecay(rawScore, history.interactionTimestamps, 0.95);
  
  // Clamp to [0.0, 1.0]
  return Math.max(0.0, Math.min(1.0, recencyWeighted));
}
```

### Trust Score Dynamics

- **Minimum sample size**: Trust score calculations require at least 10 interactions. Before 10 interactions, the score remains at the base value (0.2).
- **Recency decay**: Interactions older than 30 days are weighted at 50%. This ensures the trust score reflects current behavior, not historical patterns.
- **Override penalty severity**: Each override within 60 seconds of an AI action adds 0.1 to the penalty (max 0.5). Three rapid overrides = 0.3 penalty, which can significantly reduce the trust score.
- **Trust score floor**: The trust score never drops below 0.0, ensuring the system always starts from FullConsent rather than a negative state.

---

## Action Permission Mapping

Each AI action type is mapped to the minimum autonomy level required for the AI to perform it without explicit user confirmation.

| AI Action | Minimum Autonomy | Description |
|---|---|---|
| Suggest code completion | FullConsent | AI provides inline suggestions that the user must accept |
| Suggest refactoring | FullConsent | AI proposes refactoring options for user review |
| Auto-format on save | ConditionalConsent | Formatting is non-semantic and reversible |
| Auto-lint fixes | ConditionalConsent | Standard lint rule corrections |
| Auto-fix known patterns | Supervised | Fixing common errors (missing imports, type assertions) |
| Auto-refactor | Trusted | Restructuring code according to established patterns |
| Auto-optimize | Trusted | Applying performance improvements |
| Auto-execute trusted ops | FullAutonomy | Applying changes without any confirmation |

### Permission Check

```typescript
function canPerformAction(action: AIAction, currentAutonomy: AutonomyLevel): boolean {
  const requiredLevel = ACTION_PERMISSIONS[action.type];
  return currentAutonomy >= requiredLevel;
}

// If the action is not permitted at the current autonomy level,
// it is presented as a suggestion requiring explicit approval.
function executeAIAction(action: AIAction, autonomy: AutonomyLevel): ActionResult {
  if (canPerformAction(action, autonomy)) {
    return performAction(action);  // Auto-execute
  } else {
    return presentForApproval(action);  // Show suggestion card
  }
}
```

---

## De-escalation on Trust Loss

When the trust score drops below the threshold for the current autonomy level, the system de-escalates to the appropriate lower level. De-escalation is immediate and transparent:

### De-escalation Rules

| Current Level | Trust Score Drops Below | De-escalates To | Recovery Requirement |
|---|---|---|---|
| FullAutonomy | 0.9 | Trusted | Score must exceed 0.92 for 24 hours to re-promote |
| Trusted | 0.7 | Supervised | Score must exceed 0.72 for 12 hours to re-promote |
| Supervised | 0.5 | ConditionalConsent | Score must exceed 0.52 for 6 hours to re-promote |
| ConditionalConsent | 0.3 | FullConsent | Score must exceed 0.32 for 3 hours to re-promote |

The recovery thresholds are deliberately set *above* the de-escalation thresholds (hysteresis) to prevent oscillation between autonomy levels. Once de-escalated, the user must demonstrate sustained trustworthiness before being promoted back.

### De-escalation Notification

When de-escalation occurs, the user is informed with a clear, non-judgmental message:

```
┌─────────────────────────────────────────────────────────┐
│  🔒 Autonomy Level Changed                             │
│                                                         │
│  Based on your recent interactions, AI autonomy has     │
│  been adjusted from "Trusted" to "Supervised."          │
│                                                         │
│  AI will now ask for approval before making structural  │
│  changes. This helps ensure AI actions match your       │
│  preferences.                                           │
│                                                         │
│  [Learn More] [Adjust Settings]                         │
└─────────────────────────────────────────────────────────┘
```

---

## Trust Recommendations

The system proactively provides recommendations to help users build trust and advance to higher autonomy levels:

| Current Level | Recommendation | Action |
|---|---|---|
| FullConsent | "Accept AI suggestions to build trust" | Highlight the accept button on suggestion cards |
| ConditionalConsent | "Review auto-format changes to increase trust" | Show format diff after auto-format |
| Supervised | "Approve multi-step fixes to advance" | Present batched fix suggestions |
| Trusted | "Allow auto-refactor on trusted patterns" | Highlight patterns that qualify for auto-refactor |

These recommendations are *never* pushy. They appear as subtle hints in the status bar or AI panel, and are immediately suppressed if the user dismisses them (fatigue detection).

---

## Before / After Comparison

### Before: AI Acts Without Permission

```
┌───────────────────────────────────────────────────────────┐
│  function processPlan(plan) {                              │
│    // AI auto-refactored this function                     │
│    // Changed: var → const, callback → async/await         │
│    // Removed: 3 lines, Added: 5 lines                    │
│    // ...                                                  │
│  }                                                         │
│                                                            │
│  😰 User: "Wait, what did the AI just do to my code?!     │
│            I didn't ask for any of this!"                  │
└───────────────────────────────────────────────────────────┘
```

### After: AI Earns Autonomy Through Trust

```
  DAY 1 (FullConsent - Trust: 0.15)
  ┌─────────────────────────────────────────────────────────┐
  │  💡 AI Suggestion: "Add null check before accessing      │
  │     plan.steps"                                         │
  │  [Accept ✓] [Dismiss ✗]                                │
  └─────────────────────────────────────────────────────────┘
  User: "OK, that's helpful." → accepts → trust rises

  WEEK 2 (Supervised - Trust: 0.55)
  ┌─────────────────────────────────────────────────────────┐
  │  ⚡ Auto-fixed: 3 missing import statements             │
  │  💡 AI can refactor this function (approve to proceed)   │
  │  [Review Changes] [Approve] [Dismiss]                   │
  └─────────────────────────────────────────────────────────┘
  User: "The auto-fixes are right, and I'll review the refactor."
  → approves → trust rises

  MONTH 2 (Trusted - Trust: 0.75)
  ┌─────────────────────────────────────────────────────────┐
  │  ✅ Auto-refactored: extractHelper() from processPlan()  │
  │  ✅ Auto-optimized: replaced linear search with Map      │
  │  💡 Structural change proposed: rename API endpoint      │
  │     [Review]                                            │
  └─────────────────────────────────────────────────────────┘
  User: "The AI handles routine work; I only review the big stuff."
```

---

## Trust Evolution Model Diagram

```
                    TRUST & AUTONOMY EVOLUTION
                    ══════════════════════════

  Trust Score:   0.0        0.3        0.5        0.7        0.9       1.0
                 │          │          │          │          │          │
                 ├──────────┼──────────┼──────────┼──────────┼──────────┤
                 │  Full    │Condition-│          │          │  Full   │
                 │  Consent │ alConsent│Supervised│ Trusted  │Autonomy │
                 │          │          │          │          │         │
  AI Actions:    │          │          │          │          │         │
  Suggest ───────┤ ●        │ ●        │ ●        │ ●        │ ●       │
  Auto-format ───┤          │ ●        │ ●        │ ●        │ ●       │
  Auto-lint ─────┤          │ ●        │ ●        │ ●        │ ●       │
  Auto-fix ──────┤          │          │ ●        │ ●        │ ●       │
  Auto-refactor ─┤          │          │          │ ●        │ ●       │
  Auto-execute ──┤          │          │          │          │ ●       │
                 │          │          │          │          │         │
                 ├──────────┼──────────┼──────────┼──────────┼──────────┤

  TRUST DYNAMICS:
  ══════════════

  ▲ Accept suggestion   ─── trust += 0.02
  ▲ Approve operation   ─── trust += 0.03
  ▼ Dismiss suggestion  ─── trust -= 0.01
  ▼ Override AI action  ─── trust -= 0.10 (within 60s)
  ▼ Reject operation    ─── trust -= 0.05

  DE-ESCALATION HYSTERESIS:
  ════════════════════════
  Demote at: 0.9 → 0.7 → 0.5 → 0.3
  Re-promote at: 0.92 → 0.72 → 0.52 → 0.32
  (requires sustained for 3-24 hours)
```

---

## Implementation Reference

- **Service**: `AutonomyTrustService` (singleton #36)
- **Registration**: `registerSingleton(IAutonomyTrustService, AutonomyTrustService, InstantiationType.Eager)`
- **Interface**: `IAutonomyTrustService` in `vs/workbench/services/adaptiveWorkflow/common/adaptiveWorkflow.ts`
- **Key Methods**: `getTrustScore()`, `getAutonomyLevel()`, `canPerformAction()`, `recordAcceptance()`, `recordOverride()`, `getTrustRecommendations()`
