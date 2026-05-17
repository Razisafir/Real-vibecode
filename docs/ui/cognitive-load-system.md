# Cognitive Load Reduction System

> Phase 13 — Real Product UX Transformation Layer
> How the system tracks and reduces visible noise dynamically.

---

## Overview

Cognitive load in a developer tool is the invisible tax that competing UI surfaces levy on the user's attention. Every visible panel, notification, animation, highlight, and attention-demanding element adds a fractional cost. Individually, these costs are negligible. Collectively, they create a chaotic, exhausting environment where the user feels overwhelmed without being able to point to a single cause.

The Cognitive Load Reduction System (CLRS) is Real Vibecode's automated response to this problem. It continuously measures the total cognitive cost of the current UI state and takes automatic action to reduce it when thresholds are exceeded. The system does not wait for the user to manually close panels or dismiss notifications — it proactively simplifies the environment, always in service of the editor-first philosophy.

---

## Cognitive Load Metrics

The system computes a **Composite Cognitive Load Index (CCLI)** from five measurable dimensions:

### 1. Visible Panels Count

Each visible panel contributes a weighted load value based on its tier and size:

| Panel Tier | Load per Panel | Example Surfaces |
|---|---|---|
| Tier 1 (Editor) | 0.0 | Editor — zero cost, this is the goal |
| Tier 2 (Active Task) | 0.15 | Terminal running a command, Debug session |
| Tier 3 (AI Assistance) | 0.20 | AI suggestion panel, inline ghost text |
| Tier 4 (Diagnostics) | 0.25 | Problems panel, error list, test results |

The per-panel cost is multiplied by the panel's **occupancy ratio** — a panel that takes up 40% of the viewport costs proportionally more than one that takes up 10%.

### 2. Notification Pressure

Active notifications contribute load based on their urgency and animation state:

| Notification Type | Load | Visual Behavior |
|---|---|---|
| Critical toast (animated) | 0.30 | Slides in, pulsing border |
| Normal toast (animated) | 0.15 | Slides in, static |
| Queued notification | 0.05 | Icon badge only |
| Suppressed notification | 0.00 | Invisible |

### 3. Animation Density

Running animations create motion-based cognitive cost:

| Animation Type | Load per Instance | Cap |
|---|---|---|
| Panel slide transition | 0.10 | 2 simultaneous |
| Inline decoration animation | 0.05 | 5 simultaneous |
| Progress indicator | 0.08 | 3 simultaneous |
| Microinteraction (hover/press) | 0.02 | No cap |
| Skeleton shimmer | 0.12 | 1 simultaneous |

When the sum of concurrent animation loads exceeds 0.4, lower-priority animations are deferred.

### 4. Highlight Saturation

Inline highlights (search results, diagnostics, AI annotations, selection matches) compete for visual attention:

| Highlight Type | Load per Instance | Batch Cap |
|---|---|---|
| Error underline | 0.04 | 20 visible |
| Warning underline | 0.02 | 30 visible |
| Search match | 0.03 | 50 visible |
| AI suggestion region | 0.06 | 3 visible |
| Selection occurrence | 0.02 | 100 visible |

When the batch cap is reached, excess highlights are hidden until the count drops below 60% of the cap.

### 5. Attention Zone Competition

The viewport is divided into attention zones. When multiple zones demand attention simultaneously, the competition itself creates additional load:

| Zones Competing | Additional Load |
|---|---|
| 2 zones | +0.05 |
| 3 zones | +0.15 |
| 4+ zones | +0.30 |

An "attention zone" is any region that contains animated content, a notification, or an active panel header.

---

## Load Thresholds

The CCLI is a floating-point value between 0.0 and 1.0. The system defines four threshold zones:

```
CCLI  0.0                 0.4        0.6        0.75       0.9       1.0
      ├───────────────────┼──────────┼──────────┼─────────┼─────────┤
      │    COMFORTABLE    │ MODERATE │   HIGH   │ CRITICAL│  OVER   │
      │                   │          │          │         │         │
      │  No action needed │ Soft     │ Aggressive│ Emergency│ Force  │
      │                   │ reduce   │ reduce   │ mode     │ quiet  │
      └───────────────────┴──────────┴──────────┴─────────┴─────────┘
```

### Threshold Responses

| Zone | CCLI Range | System Response |
|---|---|---|
| **Comfortable** | 0.0 – 0.4 | No automatic action. The UI is calm and the user is in control. |
| **Moderate** | 0.4 – 0.6 | Soft reductions: suppress decorative animations, dim inactive panel headers, queue non-urgent notifications. |
| **High** | 0.6 – 0.75 | Aggressive reductions: auto-collapse idle panels, suppress all non-critical notifications, reduce animation density to 0.15 max, consolidate highlights. |
| **Critical** | 0.75 – 0.9 | Emergency mode: collapse all Tier 3+ panels, suppress all notifications, pause non-essential animations, activate "yield all to editor" protocol. |
| **Over** | 0.9 – 1.0 | Force quiet: the UI enters a minimal state equivalent to Focus Mode. Only the editor and essential chrome remain. All other surfaces are hidden. |

---

## Noise Reduction Actions

The system has five categories of noise reduction actions, each targeting a different dimension of cognitive load:

### 1. `collapse-panel`

Collapses a visible panel to its minimal representation (a tab, a one-line strip, or complete removal).

**Priority Order:**
1. Tier 4 panels (Diagnostics) — collapsed first
2. Tier 3 panels (AI Assistance) — collapsed second
3. Tier 2 panels (Active Task) — collapsed only in Critical zone

**Collapse Animation:** Panel slides out with the Weighted easing curve over 300ms, not an instant disappearance. The editor surface smoothly expands to fill the vacated space.

### 2. `suppress-notification`

Queues a visible notification for later delivery or converts it to a badge-only indicator.

**Suppression Rules:**
- Critical notifications are never suppressed
- Important notifications are suppressed only in Critical zone
- Normal and Low notifications are suppressed in High zone and above
- Suppressed notifications accumulate in a "pending" queue and are delivered when CCLI drops below Moderate

### 3. `reduce-animation`

Reduces or eliminates animation effects on non-essential surfaces.

**Reduction Levels:**
- Level 1: Disable shimmer/pulse animations
- Level 2: Reduce transition durations to 100ms
- Level 3: Eliminate all non-essential motion (hover effects, microinteractions)
- Level 4: All motion disabled (Focus Mode equivalent)

### 4. `remove-highlight`

Reduces the number or intensity of inline highlights.

**Strategies:**
- `fade-distant`: Reduce opacity of highlights far from the cursor
- `limit-count`: Cap visible highlights to the batch limit
- `consolidate`: Merge overlapping highlights (e.g., search match inside an error region)
- `defer-low-priority`: Remove informational highlights, keep only error/warning

### 5. `quiet-surface`

Reduces the visual prominence of a surface without collapsing it.

**Techniques:**
- Reduce opacity from 1.0 to 0.5
- Desaturate colors by 40%
- Remove bold/colored headers
- Disable animations on the surface

---

## Automatic Suppression During Execution

When the AI execution engine is running a task (generating code, running tests, performing analysis), the system automatically suppresses surfaces that would create noise during the wait:

```
┌─────────────────────────────────────────────────────────┐
│              EXECUTION SUPPRESSION PIPELINE              │
│                                                          │
│  1. Execution starts                                     │
│  2. Suppress all Tier 4 surfaces immediately             │
│  3. Reduce Tier 3 surfaces to inline-only                │
│  4. Queue all Normal/Low notifications                   │
│  5. Reduce animation density to 0.15                     │
│  6. Show execution progress in minimal status strip      │
│  7. On execution complete:                               │
│     a. Deliver queued notifications (batched, not all)   │
│     b. Re-allow Tier 3 surfaces if user clicks them      │
│     c. Gradually restore animation density over 2s       │
└─────────────────────────────────────────────────────────┘
```

**Key Principle:** During execution, the user needs to see progress, not chaos. The editor remains the dominant surface. The AI shows its work through a minimal progress indicator, not by opening panels or showing debug output.

---

## Redundant Surface Collapse Strategy

When two or more surfaces display overlapping information, the system collapses the redundant one:

| Surface A | Surface B | Redundancy | Action |
|---|---|---|---|
| Problems panel | Error underlines in editor | Both show errors | Collapse Problems panel (underlines suffice) |
| AI suggestion panel | Ghost text in editor | Both show AI suggestion | Collapse panel (ghost text suffices) |
| Terminal panel | Status strip "✓ running" | Both show process state | Collapse Terminal (strip suffices) |
| Git panel | File decorations in explorer | Both show modified status | Collapse Git panel (decorations suffice) |

**Rule:** The surface that is closer to the editor (inline > gutter > sidebar > panel) always wins. The more distant surface is collapsed.

---

## Simultaneous Emphasis Reduction

When multiple elements are simultaneously emphasized (highlighted, bold, colored, animated), the system reduces emphasis to the single most important element and quiets the rest:

**Algorithm:**
1. Collect all currently emphasized elements
2. Rank by priority: Critical errors > Active AI suggestion > Search matches > Warnings > Informational
3. Keep full emphasis on the #1 ranked element
4. Reduce emphasis on all others by one level (bold → colored, colored → underlined, underlined → dot, dot → hidden)
5. Re-evaluate every 500ms

---

## Before/After Analysis

### Before: Dashboard Chaos

```
CCLI: 0.82 — CRITICAL

┌────────────────────────────────────────────────────────┐
│ [Explorer] │ [Editor (35%)] │ [AI Panel] │ [Debug]    │
│            │ ▼3 errors      │ Suggest:   │ Breakpoint │
│  🔴2 files │ ⚠5 warnings   │ refactor   │ Step into  │
│  🟡3 files │ 🔍12 matches   │ complete   │ Watch: x=3 │
│            │ ✨AI suggest   │ Explain    │ Call stack │
├────────────┴────────────────┴────────────┴─────────────┤
│ [Terminal] [Problems(12)] [Output(4)] [Debug Console]  │
│  ⚡ Build failed  │ ⚠ New version  │ 💡 Tip: shortcuts│
└────────────────────────────────────────────────────────┘
```

Four side panels, four bottom panels, 12 search matches, 3 errors, 5 warnings, AI suggestions, and 3 active notifications. The user is drowning.

### After: Calm Focused Surface

```
CCLI: 0.28 — COMFORTABLE

┌────────────────────────────────────────────────────────┐
│                    [Editor (78%)]                       │
│                                                         │
│  const x = someFunc()                                   │
│  // ▼ error on this line (only visible highlight)      │
│  // AI ghost text suggestion (inline, subtle)           │
│                                                         │
├────────────────────────────────────────────────────────┤
│  ⚡ Build error │ ✓ Terminal running                    │
└────────────────────────────────────────────────────────┘
```

One critical error highlighted. AI suggestion inline. Only essential status indicators. The editor commands 78% of the viewport. The user can think.

---

## Flow Diagram: Load Reduction Pipeline

```
  ┌─────────────┐
  │ UI State    │
  │ Snapshot    │
  └──────┬──────┘
         │
         ▼
  ┌─────────────┐     ┌──────────────────────────────────┐
  │ Calculate   │────▶│ CCLI = Σ(panel loads)            │
  │ CCLI        │     │      + Σ(notification loads)     │
  └──────┬──────┘     │      + Σ(animation loads)        │
         │            │      + Σ(highlight loads)         │
         │            │      + zone_competition_load      │
         │            └──────────────────────────────────┘
         │
         ▼
  ┌─────────────┐
  │ Classify    │──── CCLI < 0.4 ──────▶ COMFORTABLE (no action)
  │ Zone        │
  └──────┬──────┘
         │
    ┌────┴────────────────────────────────────┐
    │                                         │
    ▼                                         ▼
 0.4–0.6                                   0.6–0.75
 MODERATE                                   HIGH
    │                                         │
    ▼                                         ▼
 ┌──────────────┐                      ┌──────────────┐
 │ Soft reduce: │                      │ Aggressive:  │
 │ • suppress   │                      │ • collapse   │
 │   decorative │                      │   Tier 4+    │
 │ • dim        │                      │ • suppress   │
 │   inactive   │                      │   non-critic │
 │ • queue      │                      │ • reduce     │
 │   normal     │                      │   anim ≤0.15 │
 │   notifs     │                      │ • consolidate│
 └──────────────┘                      │   highlights │
                                       └──────┬───────┘
                                              │
                                    ┌─────────┴─────────┐
                                    │                   │
                                    ▼                   ▼
                               0.75–0.9              0.9–1.0
                               CRITICAL              OVER
                                   │                   │
                                   ▼                   ▼
                            ┌──────────────┐   ┌──────────────┐
                            │ Emergency:   │   │ Force Quiet: │
                            │ • collapse   │   │ • Focus Mode │
                            │   Tier 3+    │   │   equivalent │
                            │ • suppress   │   │ • Only editor│
                            │   all notifs │   │   + essential │
                            │ • pause anim │   │ • All motion │
                            │ • yield to   │   │   disabled   │
                            │   editor     │   └──────────────┘
                            └──────────────┘
```

---

## Summary

The Cognitive Load Reduction System ensures that Real Vibecode never presents a chaotic interface to the user. By continuously measuring the composite cost of all visible surfaces and taking automated action to reduce it, the system maintains a calm, focused environment where the editor always dominates and the user's attention is never needlessly fragmented. The system is invisible in its operation — the user simply experiences an environment that always feels appropriate, never overwhelming.
