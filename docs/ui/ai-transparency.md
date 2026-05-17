# AI Transparency UX

> Phase 13 — Real Product UX Transformation Layer
> Making the AI understandable, not mysterious.

---

## Core Belief: The AI Is a Collaborator, Not an Oracle

Real Vibecode's AI features must never feel like magic. Magic is impressive but disempowering — it works in ways the user cannot understand, predict, or override. Instead, the AI should feel like a knowledgeable collaborator whose reasoning is always accessible, whose confidence is always visible, and whose actions are always explainable.

The principle is simple: **if the AI does something, the user should be able to understand why.** Not through a chain-of-thought dump, not through a wall of debug output, but through a concise, contextual, confidence-weighted explanation that respects the user's time and intelligence.

---

## AI Explanation Model

The system provides two categories of explanation:

### Action Explanations

When the AI takes an autonomous action (modifying code, creating a file, running a test), the system provides a concise explanation of what was done and why.

**Structure:**
```
Action: [What the AI did]
Reason: [Why it did it, in one sentence]
Context: [What triggered this action — optional, one sentence]
```

**Example:**
```
Action: Added null check on line 42
Reason: The return value of getUser() can be null when the session expires
Context: Triggered by: test failure in auth.test.ts
```

### Suggestion Explanations

When the AI offers a suggestion (completion, refactor, fix), the system provides a brief rationale for why the suggestion is offered.

**Structure:**
```
Suggestion: [What is being suggested]
Rationale: [Why this is a good idea, one sentence]
Alternative: [What would happen without this — optional]
```

**Example:**
```
Suggestion: Extract repeated validation logic into a helper
Rationale: Three functions contain identical validation code (lines 15, 47, 83)
Alternative: Without this, any validation change requires 3 edits instead of 1
```

---

## Verbosity Levels

Users have different preferences for how much explanation the AI provides. The system supports three verbosity levels:

### Minimal

- Show only the action label ("Added null check")
- No rationale, no context
- Confidence shown as a single dot (● = high, ○ = low)
- Best for: Experienced users who trust the AI and want speed

### Standard (Default)

- Show action label + one-line reason
- Context shown on hover
- Confidence shown as a badge (✓ High, ~ Medium)
- Best for: Most users — informative but not verbose

### Detailed

- Show action label + reason + context
- Full confidence breakdown
- "Why did this happen?" link available
- Best for: Users learning the AI, debugging unexpected behavior

### Verbosity Transition

The verbosity level can be changed:
- Globally in settings
- Per-session via command palette
- Temporarily by clicking "Tell me more" on any AI action (escalates to Detailed for that specific action)

---

## "Why Did This Happen?" Resolution

The flagship transparency feature. Any AI action or suggestion can be interrogated with a "Why did this happen?" interaction (click the confidence indicator, or use keyboard shortcut).

### Resolution Flow

```
┌────────────────────────────────────────────────────────┐
│           "WHY DID THIS HAPPEN?" RESOLUTION             │
│                                                         │
│  Step 1: Causal Chain                                   │
│  ─────────────────────                                  │
│  Show the sequence of events that led to this action:   │
│                                                         │
│  1. Test failed: auth.test.ts → login_returns_null      │
│  2. AI analyzed: identified missing null check          │
│  3. AI proposed: add null guard on line 42              │
│  4. Confidence: 0.87 (high)                             │
│                                                         │
│  Step 2: User Context                                   │
│  ─────────────────────                                  │
│  What the AI knew about your situation:                 │
│                                                         │
│  • You recently edited auth.ts (2 min ago)              │
│  • This file has 3 similar null-check patterns          │
│  • The test suite was last run 5 min ago                │
│                                                         │
│  Step 3: Confidence Assessment                          │
│  ─────────────────────                                  │
│  Why the AI is 87% confident:                           │
│                                                         │
│  • Pattern match: 94% (similar code in file)            │
│  • Test evidence: 82% (test directly exposes the bug)   │
│  • Project convention: 85% (consistent with codebase)   │
│  • Overall: 0.87                                        │
│                                                         │
└────────────────────────────────────────────────────────┘
```

### Resolution Rules

1. **Causal chain is always available.** Every AI action records its triggering events. This is not optional — it is an architectural requirement.
2. **User context is shown with privacy awareness.** The system explains what the AI considered without exposing the full context window or internal representations.
3. **Confidence assessment breaks down the score.** The single confidence number is decomposed into contributing factors so the user can understand what drives it.
4. **No chain-of-thought exposure.** The raw reasoning chain of the AI model is never shown. It is summarized into the three-step format above.
5. **Concise by default, expandable.** The initial view shows only the causal chain. User context and confidence assessment are collapsed and expand on click.

---

## Confidence Display Styles

The AI's confidence in its actions and suggestions is always communicated, but the visual weight of the display varies:

| Style | Visual | When Used | Example |
|---|---|---|---|
| **Hidden** | No visible indicator | Very high confidence (> 0.95) + Minimal verbosity | AI auto-fixed a typo |
| **Dot** | Small dot (● high, ○ low) | High confidence (> 0.8) + Minimal verbosity | AI completed a common pattern |
| **Badge** | Text badge ("✓ High", "~ Med") | Standard verbosity | AI suggested a refactor |
| **OpacityCoded** | Suggestion opacity matches confidence | Inline ghost text | 0.9 confidence → full opacity; 0.5 → 50% opacity |

### Confidence Ranges

| Range | Label | Color | Presentation |
|---|---|---|---|
| 0.9 – 1.0 | Very High | Green | Full emphasis, no caveats |
| 0.7 – 0.9 | High | Blue-green | Standard emphasis |
| 0.5 – 0.7 | Medium | Yellow | Reduced emphasis, "consider reviewing" note |
| 0.3 – 0.5 | Low | Orange | Minimal emphasis, "please review" note |
| 0.0 – 0.3 | Very Low | Red | Ghost text only, explicit "unsure" label |

### Confidence and Verbosity Interaction

| Confidence | Minimal | Standard | Detailed |
|---|---|---|---|
| > 0.9 | Hidden | Dot | Badge |
| 0.7 – 0.9 | Dot | Badge | Badge + breakdown |
| 0.5 – 0.7 | Dot | Badge + note | Badge + full breakdown |
| < 0.5 | Dot + warning | Badge + "review" | Full breakdown + alternatives |

---

## Rules for AI Explanations

### Must Do

1. **Every AI action must have an accessible explanation.** Even if the verbosity is Minimal, the "Why did this happen?" path must exist.
2. **Explanations must be in the user's language (code-level, not model-level).** "Added null check because getUser() can return null" — not "The model predicted a high probability of null dereference based on training data patterns."
3. **Confidence must always be communicated.** The user must never be left wondering how sure the AI is.
4. **Context must be specific.** "Triggered by test failure in auth.test.ts" — not "Triggered by relevant context."

### Must Never Do

1. **No giant debug dumps.** Never show the full prompt, context window, or raw model output.
2. **No chain-of-thought exposure.** The AI's internal reasoning steps are private. The user sees the summarized result, not the thinking process.
3. **No technical jargon without translation.** If the AI says "attention-head correlation," the UI translates to "pattern match."
4. **No hedging language.** Don't say "The AI thinks maybe perhaps this might be..." — say "87% confident: Added null check because getUser() can return null."
5. **No unexplained actions.** If the AI can't explain why it did something (edge case), show: "AI action taken — explanation unavailable. Click to report."

---

## Before/After Analysis

### Before: The AI Is Mysterious

```
┌──────────────────────────────────────────┐
│ 🤖 AI made 3 changes to your code       │
│                                          │
│  ✓ auth.ts (2 changes)                  │
│  ✓ utils.ts (1 change)                  │
│                                          │
│  [Accept All] [Reject All]              │
└──────────────────────────────────────────┘

User questions:
  - What did it change?
  - Why did it change it?
  - Is it right?
  - Can I trust it?
  - What happens if I reject?

User feeling: Uncertain, disempowered, suspicious
```

The AI presents changes as fait accompli with no explanation, no confidence indicators, and no path to understanding. The user must blindly accept or reject.

### After: The AI Is Understandable

```
┌──────────────────────────────────────────┐
│ AI Actions (2)                            │
│                                           │
│ ● auth.ts:42 — Added null check          │
│   Reason: getUser() returns null on       │
│   session expiry                          │
│   Confidence: ✓ High (0.87)              │
│   [Why?] [Accept] [Reject]               │
│                                           │
│ ● utils.ts:15 — Simplified conditional   │
│   Reason: Redundant nested if-statement   │
│   Confidence: ✓ High (0.92)              │
│   [Why?] [Accept] [Reject]               │
│                                           │
│ [Accept All] [Review Each]               │
└──────────────────────────────────────────┘

User questions: ANSWERED — what, why, how confident
User feeling: Informed, empowered, trusting
```

Every action has a reason, a confidence indicator, and a "Why?" path. The user understands what happened and can make an informed decision.

---

## Interaction Flow: "Why Did This Happen?"

```
  User sees AI action indicator
              │
              ▼
  ┌─────────────────────┐
  │ Click "Why?" or     │
  │ press Alt+? on the  │
  │ AI decoration       │
  └──────────┬──────────┘
             │
             ▼
  ┌─────────────────────┐
  │ EXPLANATION PANEL    │
  │ (appears inline or  │
  │  in hover card)     │
  │                     │
  │ ┌─────────────────┐ │
  │ │ Causal Chain    │ │
  │ │ (always shown)  │ │
  │ │                 │ │
  │ │ 1. Test failed  │ │
  │ │ 2. AI analyzed  │ │
  │ │ 3. AI proposed  │ │
  │ │ 4. Confidence   │ │
  │ └─────────────────┘ │
  │                     │
  │ ┌─────────────────┐ │
  │ │ User Context ▶  │ │ (collapsed by default)
  │ │ (click to show) │ │
  │ └─────────────────┘ │
  │                     │
  │ ┌─────────────────┐ │
  │ │ Confidence ▶    │ │ (collapsed by default)
  │ │ Breakdown       │ │
  │ └─────────────────┘ │
  │                     │
  │ [Dismiss] [Report]  │
  └─────────────────────┘
             │
             ▼
  User understands the action
  and can make an informed decision
```

---

## Summary

AI Transparency is not about showing everything — it's about making the right information available at the right time. The user should never feel that the AI is a black box making decisions they cannot understand. Every action has a reason, every suggestion has a rationale, and every confidence score is decomposable. The result is an AI collaborator that the user trusts — not because it never makes mistakes, but because when it does, the user can understand why and correct it.
