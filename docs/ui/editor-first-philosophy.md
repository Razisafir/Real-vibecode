# Editor-First Philosophy

> Phase 13 — Real Product UX Transformation Layer
> The core UX belief that the editor is the hero surface and everything else supports it.

---

## Core Philosophy: The Editor Is the Center of Gravity

Real Vibecode holds a single, unwavering design conviction: **the code editor is the protagonist of the interface**. Every panel, notification, AI suggestion, diagnostic indicator, and status widget exists in service of the editor. The editor is where thinking happens, where intent becomes reality, where the user spends the vast majority of their cognitive bandwidth. No other surface may compete with it for visual dominance or attention priority.

This is not merely a layout preference — it is an architectural principle that permeates every rendering decision, every animation curve, every z-index assignment, and every panel lifecycle event. When a conflict arises between the editor's visual territory and any other surface, the editor wins. Not aggressively, not loudly, but with the quiet authority of something that knows its place and refuses to be displaced.

The philosophy can be distilled into three inviolable axioms:

1. **The editor never yields space.** Panels may appear around the editor, but the editor's pixel territory is never permanently reduced to accommodate another surface.
2. **The editor never competes for attention.** When the editor is active, every other surface dims, quiets, or retreats. The user's focus is treated as sacred.
3. **The editor is always recoverable.** No matter how many panels are open, how many AI processes are running, or how many notifications are queued, a single action restores the editor to full dominance.

---

## Editor Dominance Rules

The system enforces editor dominance through a set of quantifiable rules that are continuously monitored and enforced at runtime.

### Editor Occupancy Ratio Tracking

The **Editor Occupancy Ratio (EOR)** measures the percentage of the primary viewport occupied by the active editor surface, excluding chrome, title bars, and status bars.

| State | EOR Range | Visual Indicator |
|---|---|---|
| Dominant | ≥ 70% | No indicator needed — this is the default |
| Compromised | 50%–69% | Subtle border glow on editor |
| Threatened | 35%–49% | Warning state — panels flagged for auto-collapse |
| Critical | < 35% | Emergency — "yield all to editor" triggered |

The system continuously recalculates EOR on every panel open, close, resize, and layout change. When the ratio drops below the Compromised threshold, the Panel Auto-Collapse system begins evaluating which non-essential surfaces can be collapsed to restore dominance.

### Maximum Reading Space

The editor must present the maximum possible reading area at all times. This means:

- **No permanent overlays.** AI suggestions, diagnostics, and inline annotations must be dismissible and must not persistently obscure code.
- **Minimal chrome.** Title bars, tab bars, and breadcrumb trails are reduced to their minimum viable height. Every pixel saved is a pixel given to code.
- **Gutter efficiency.** The line number gutter, fold indicators, and breakpoint markers share horizontal space without expanding beyond their functional minimum.
- **No decorative elements.** The editor surface contains only functional elements — no logos, no status badges, no ambient decorations.

### Minimal Chrome Principle

Chrome is defined as any UI element that is not the editor content itself. The system categorizes chrome into three tiers:

- **Essential Chrome** (tab bar, breadcrumb, minimap): Always visible but minimized in height and visual weight.
- **Contextual Chrome** (inline suggestions, hover cards, peek definitions): Visible only when directly relevant to the cursor position or selection.
- **Decorative Chrome** (status badges, branding, ambient indicators): Removed entirely or hidden behind an explicit reveal action.

---

## Distraction Suppression System

The Distraction Suppression System (DSS) is the enforcement layer that ensures non-editor surfaces do not erode the user's focus. It operates on a continuous monitoring loop:

```
┌─────────────────────────────────────────────┐
│         DISTRACTION SUPPRESSION LOOP         │
│                                              │
│  1. Scan all visible surfaces                │
│  2. Classify each as Essential/Contextual/   │
│     Decorative                               │
│  3. Check attention state (focused/reading/  │
│     idle/transitioning)                      │
│  4. Apply suppression rules:                 │
│     - If user is typing → suppress all       │
│       Decorative + non-urgent Contextual     │
│     - If user is reading → suppress all      │
│       Decorative + dim Contextual            │
│     - If user is idle → allow contextual     │
│       surfaces to gently appear              │
│  5. Re-evaluate every 500ms                  │
└─────────────────────────────────────────────┘
```

### Suppression Actions

| Action | Effect | Trigger |
|---|---|---|
| `dim-surface` | Reduce opacity to 0.4 | User typing + surface is non-essential |
| `collapse-surface` | Slide panel to collapsed state | Surface unused for > 5 minutes |
| `suppress-animation` | Disable non-essential animations | Cognitive load exceeds Moderate |
| `mute-notification` | Queue notification silently | User is in active editing flow |
| `defer-highlight` | Delay highlight appearance | Multiple highlights competing |

---

## Focus Mode and Zen Mode Behaviors

### Focus Mode

Focus Mode activates when the user explicitly requests a distraction-reduced environment or when the system detects sustained deep editing (continuous typing for > 2 minutes with no panel interactions).

**Focus Mode Rules:**
- All Tier 3 and Tier 4 panels collapse automatically
- AI suggestions switch to inline-only (no side panel)
- Notifications queue silently
- Status bar reduces to minimal indicators
- Editor EOR target: ≥ 85%

**Exit Triggers:**
- User explicitly toggles Focus Mode off
- User opens a non-editor panel (manual override)
- User is idle for > 10 minutes (gentle re-emergence of panels)

### Zen Mode

Zen Mode is the most aggressive editor-dominance state. It eliminates all chrome except the absolute minimum required for code editing.

**Zen Mode Rules:**
- No side panels, no bottom panels, no status bar
- No tab bar (editor fills viewport)
- No minimap (unless explicitly enabled)
- Breadcrumbs appear only on hover at top of screen
- Editor EOR: 100% of the viewport
- All notifications are deferred to exit summary

**Exit Triggers:**
- User presses Escape or toggles Zen Mode off
- A Critical-tier notification arrives (build failure, crash)

---

## Panel Auto-Collapse Rules

Panels are not permanent fixtures — they are transient surfaces that appear when needed and retire when no longer serving the editor. The auto-collapse system enforces this lifecycle:

| Panel Type | Auto-Collapse After | Condition |
|---|---|---|
| AI Suggestion Panel | 30 seconds of no interaction | Suggestion not actively being reviewed |
| Terminal Panel | 60 seconds after command completes | Process has exited |
| Debug Panel | 30 seconds after session ends | No active debug session |
| Problems Panel | 45 seconds after last fix | Error count is zero |
| Search Panel | 20 seconds after last navigation | No active search |
| Git Panel | 60 seconds of no interaction | No pending commit |

**Override Rule:** A panel that has been manually interacted with in the last 10 seconds will not be auto-collapsed, regardless of the timer.

---

## Contextual Reveal Behavior

Instead of keeping panels permanently visible, the system uses a contextual reveal model where surfaces emerge only when the current editing context warrants their presence.

**Reveal Triggers:**

```
┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│   User edits a   │────▶│  AI detects      │────▶│  Inline suggest  │
│   function       │     │  completion op   │     │  appears in edtr │
└──────────────────┘     └──────────────────┘     └──────────────────┘
                                                         │
                                                         ▼
┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│  User dismisses  │◀────│  Suggestion      │◀────│  If user hovers  │
│  or accepts      │     │  fades after 8s  │     │  → expand panel  │
└──────────────────┘     └──────────────────┘     └──────────────────┘
```

**Key Principles:**
- **Reveal on intent, not on availability.** Just because information exists does not mean it should be visible.
- **Prefer inline to panel.** If information can be conveyed within the editor surface (ghost text, inline decorations), it should be.
- **Escalate, don't dump.** Start with the minimum viable presentation (inline), escalate to a hover card, then to a side panel — only if the user shows continued interest.

---

## Before/After Analysis

### Before: Many Panels Competing

```
┌─────────────────────────────────────────────────────────┐
│ [Explorer] │ [Editor (43%)] │ [AI Panel] │ [Debug]     │
│            │                │            │              │
│  file.ts   │  const x =    │  Suggest:  │  Breakpoint │
│  utils.ts  │  someFunc()   │  refactor  │  hit at L42 │
│  test.ts   │               │            │              │
│            │                │            │              │
├────────────┴────────────────┴────────────┴──────────────┤
│ [Terminal - npm run dev] [Problems (12)] [Output]       │
└─────────────────────────────────────────────────────────┘
EOR: 43% — THREATENED
```

The editor is squeezed into a narrow column, flanked by competing surfaces. The user's reading area is minimal, and cognitive load is high — four panels demand attention simultaneously, each with equal visual weight.

### After: Editor Dominant, Panels Support

```
┌─────────────────────────────────────────────────────────┐
│                    [Editor (78%)]                         │
│                                                          │
│  const x = someFunc()                                    │
│  // AI suggestion appears inline as ghost text           │
│  // Problems: 2 quiet dots in gutter ──────────────○ ○   │
│                                                          │
├──────────────────────────────────────────────────────────┤
│  Terminal: ✓ running (collapsed to minimal strip)        │
└─────────────────────────────────────────────────────────┘
EOR: 78% — DOMINANT
```

The editor commands the viewport. AI assistance appears inline. Diagnostics are reduced to subtle gutter indicators. The terminal is collapsed to a one-line status strip. Information is available but not competing.

---

## Panel Lifecycle Interaction Diagram

```
                        ┌──────────┐
                        │  HIDDEN  │
                        │ (not in  │
                        │  DOM)    │
                        └────┬─────┘
                             │ contextual trigger
                             ▼
                        ┌──────────┐
                        │ REVEALED │
           ┌───────────│(appearing│───────────┐
           │           │ in view) │           │
           │           └────┬─────┘           │
           │                │ user interact   │ no interaction
           │                ▼                 │ (auto-collapse timer)
           │           ┌──────────┐           │
           │           │  ACTIVE  │           │
           │           │ (focused │           │
           │           │  by user)│           │
           │           └────┬─────┘           │
           │                │ idle timer      │
           │                ▼                 │
           │           ┌──────────┐           │
           │           │  IDLE    │───────────┘
           │           │(awaiting │
           │           │ collapse)│
           │           └────┬─────┘
           │                │ collapse trigger
           │                ▼
           │           ┌──────────┐
           └──────────▶│ COLLAPSED│
     user reopens      │(minimized│
                       │ strip)   │
                       └────┬─────┘
                            │ hide trigger
                            ▼
                       ┌──────────┐
                       │  HIDDEN  │
                       └──────────┘
```

---

## Summary

The Editor-First Philosophy is not a suggestion — it is a runtime constraint. Every surface, animation, notification, and visual element in Real Vibecode must justify its existence relative to the editor. If it does not serve the editing experience, it must defer, diminish, or disappear. The result is an environment where the user's code is always the hero, and every supporting element knows its role.
