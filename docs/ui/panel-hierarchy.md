# Panel Hierarchy Rebuild

> Phase 13 — Real Product UX Transformation Layer
> Strict visual priority system for all UI surfaces.

---

## The Problem: Equal-Priority Chaos

In most developer tools, every panel is created equal. The file explorer has the same visual weight as the debug panel. The AI suggestion panel glows as brightly as the editor. Notifications from the linter compete for attention with notifications from Git. The result is a flat, chaotic landscape where nothing is clearly more important than anything else.

Real Vibecode solves this with a strict, enforced visual hierarchy. Panels are assigned to tiers, and each tier has defined visual properties that make its relationship to the editor immediately clear. There is no ambiguity about what matters most.

---

## 4-Tier Hierarchy

### Tier 1: Editor (The Hero)

The editor is the primary surface. It receives maximum visual weight, maximum space, and maximum attention priority. It never dims, never yields, and never competes.

**Visual Properties:**
- Opacity: 1.0 (always)
- Font weight: Normal to Bold (content-dependent)
- Color saturation: 100%
- Animation priority: Highest
- Spatial priority: Always occupies the largest contiguous area

**Surfaces in Tier 1:**
- Active code editor
- Active diff editor (when reviewing changes)
- Active notebook editor

### Tier 2: Active Task

The surface currently engaged in an active, user-initiated task. Only **one** Tier 2 surface dominates at any given time. If a new Tier 2 surface activates, the previous one visually yields.

**Visual Properties:**
- Opacity: 0.95 (active) / 0.6 (inactive)
- Font weight: Normal (active) / Light (inactive)
- Color saturation: 85% (active) / 50% (inactive)
- Animation priority: High (active) / Low (inactive)
- Spatial priority: Secondary to editor

**Surfaces in Tier 2:**
- Terminal with running command
- Debug session panel
- Search results panel (during active search)
- Test runner panel (during test execution)
- Refactor preview panel

### Tier 3: AI Assistance

Surfaces that provide AI-generated content, suggestions, and explanations. These are support surfaces — they appear when needed and defer when not.

**Visual Properties:**
- Opacity: 0.85 (active) / 0.45 (inactive)
- Font weight: Normal (active) / Light (inactive)
- Color saturation: 70% (active) / 35% (inactive)
- Animation priority: Medium
- Spatial priority: Tertiary — never displaces Tier 2

**Surfaces in Tier 3:**
- AI suggestion panel
- AI explanation panel ("Why did this happen?")
- AI chat/conversation panel
- Inline ghost text suggestions (within editor, but visually subdued)

### Tier 4: Diagnostics

Informational surfaces that report system state, errors, warnings, and metrics. These are the quietest tier — always available but never demanding.

**Visual Properties:**
- Opacity: 0.7 (active) / 0.35 (inactive)
- Font weight: Normal (active) / Light (inactive)
- Color saturation: 50% (active) / 25% (inactive)
- Animation priority: Low
- Spatial priority: Lowest — collapsible at any time

**Surfaces in Tier 4:**
- Problems panel
- Output panel
- Git status panel
- Extension host logs
- Performance metrics panel

---

## Rule: Only One Tier 2 Surface Dominates at Once

This is the most important constraint in the panel hierarchy. When a Tier 2 surface activates (e.g., the user starts a debug session), any existing active Tier 2 surface (e.g., the terminal) must visually yield.

### Yielding Behavior

```
┌──────────────────────────────────────────────────────────┐
│                  TIER 2 YIELDING PROTOCOL                 │
│                                                           │
│  1. New Tier 2 surface activates                         │
│  2. Current active Tier 2 surface receives yield signal   │
│  3. Yielding surface transitions:                         │
│     • Opacity: 0.95 → 0.6 (300ms, Decelerate)            │
│     • Color saturation: 85% → 50% (300ms, Decelerate)    │
│     • Header font: Bold → Normal (300ms)                  │
│     • Border: Prominent → Subtle (300ms)                  │
│  4. If the yielding surface is a collapsible panel,       │
│     it auto-collapses after 10 seconds of inactivity      │
│  5. New Tier 2 surface transitions:                       │
│     • Opacity: 0.6 → 0.95 (300ms, Decelerate)            │
│     • Color saturation: 50% → 85% (300ms, Decelerate)    │
│     • Header font: Normal → Bold (300ms)                  │
│     • Border: Subtle → Prominent (300ms)                  │
└──────────────────────────────────────────────────────────┘
```

### Yield Override

The user can manually override yielding by clicking on the inactive Tier 2 surface. This swaps the active/inactive states. The system does not fight the user's explicit choice.

---

## Visual De-emphasis Strategies

When a surface needs to be de-emphasized (because it's in a lower tier or in an inactive state), the system applies one or more of five strategies:

### 1. OpacityReduction

The simplest and most common strategy. Reduce the surface's opacity to make it recede visually.

- Active → Inactive: Opacity drops by 30–50%
- The editor is exempt — it never reduces opacity

### 2. FocusWeightScaling

Reduce the visual "weight" of the surface's content. This is more subtle than opacity reduction:

- Font weight: Bold → Normal → Light
- Line height: Slightly increase to create airiness
- Letter spacing: Slightly increase for less dense appearance
- Icon weight: Filled → Regular → Light

### 3. ColorDesaturation

Reduce color saturation to make the surface feel less vivid and less attention-demanding:

- Full saturation → 60% → 30% → 10% (near grayscale)
- Only the active tier retains full color
- Error/warning colors are partially preserved even when desaturated (accessibility)

### 4. InactiveQuieting

A combination strategy specifically for panels that are not in use:

- Reduce header contrast
- Dim inactive tab labels
- Collapse expandable sections
- Remove decorative borders and dividers
- Disable hover effects on non-interactive elements

### 5. Combined

The most aggressive strategy, applied when cognitive load is high or during Focus Mode. Combines all four strategies simultaneously:

- Opacity: -40%
- Font weight: -1 level
- Saturation: -50%
- InactiveQuieting: all sub-strategies

---

## Tier Opacity Values

The following table defines the exact opacity values for each tier in active and inactive states:

| Tier | Active Opacity | Inactive Opacity | Transition Duration | Easing |
|---|---|---|---|---|
| Tier 1 (Editor) | 1.0 | 1.0 | N/A | N/A — never changes |
| Tier 2 (Active Task) | 0.95 | 0.60 | 300ms | Decelerate |
| Tier 3 (AI Assistance) | 0.85 | 0.45 | 250ms | Decelerate |
| Tier 4 (Diagnostics) | 0.70 | 0.35 | 200ms | Standard |

### Opacity Rules

1. **Opacity changes are always animated.** Never jump from 0.95 to 0.60 instantly.
2. **Opacity respects `prefers-reduced-motion`.** If the user has enabled reduced motion, transitions are shortened to 50ms.
3. **Opacity does not affect interactivity.** An inactive Tier 2 surface at 0.60 opacity is still fully clickable and interactive. The visual de-emphasis communicates priority, not disability.
4. **Opacity does not go below 0.35.** Below this threshold, content becomes hard to read. If a surface needs to be quieter than 0.35 opacity, it should be collapsed instead.

---

## Yielding Behavior and Visual State Tracking

The system maintains a visual state for every surface:

```typescript
type SurfaceVisualState = 
  | 'dominant'     // Active, full emphasis, highest visual weight
  | 'active'       | // Active, standard emphasis for its tier
  | 'idle'         | // Visible but not in use, reduced emphasis
  | 'yielding'     | // Transitioning from active to idle
  | 'elevating'    | // Transitioning from idle to active
  | 'collapsed'    | // Minimized to tab or strip
  | 'hidden';        // Not visible
```

### State Transition Matrix

| From → To | Trigger | Animation |
|---|---|---|
| dominant → active | Higher-tier surface activates | 300ms Decelerate |
| active → idle | No interaction for 30s | 250ms Standard |
| idle → active | User clicks/focuses | 200ms Decelerate |
| active → yielding | New Tier 2 surface activates | 300ms Decelerate |
| yielding → idle | Yield animation completes | Instant (already at target) |
| idle → collapsed | Auto-collapse timer fires | 250ms Accelerate |
| collapsed → active | User reopens | 300ms Decelerate |
| any → hidden | Panel close / suppression | 200ms Accelerate |

---

## "Yield All to Editor" Emergency Mode

When the cognitive load index reaches Critical (0.75+) or the user activates emergency focus, all panels yield to the editor simultaneously:

**Emergency Yield Protocol:**

1. All Tier 3 and Tier 4 surfaces collapse immediately (200ms Accelerate)
2. All Tier 2 surfaces transition to idle (300ms Decelerate)
3. Editor opacity remains 1.0 — unchanged
4. Editor expands to fill vacated space (400ms Weighted)
5. Status bar reduces to minimal indicators
6. Only Critical-priority notifications remain visible

**Exit Protocol:**

1. User explicitly exits emergency mode, OR
2. Cognitive load drops below 0.5 for 30 seconds
3. Panels gradually re-emerge (one at a time, 500ms between each)
4. Editor yields no space — panels reclaim from collapsed state only

---

## Before/After Analysis

### Before: Equal-Priority Panels Competing

```
┌─────────────────────────────────────────────────────────┐
│ [Explorer] │ [Editor] │ [AI Panel] │ [Debug] │ [Git]   │
│  opacity:1 │ opacity:1│  opacity:1 │ opacity:1│ opacity:1│
│  bold hdr  │ bold hdr │  bold hdr  │ bold hdr │ bold hdr │
│  vivid clr │ vivid clr│  vivid clr │ vivid clr│ vivid clr│
│            │          │            │          │          │
│  All panels have identical visual weight.               │
│  No hierarchy. No priority. Just walls of equal noise.  │
└─────────────────────────────────────────────────────────┘
```

Every panel screams for attention with equal force. The editor is just another panel. The debug panel is as prominent as the AI panel. There is no visual guidance about where to look first.

### After: Clear Visual Hierarchy

```
┌─────────────────────────────────────────────────────────┐
│ [Explor] │ [Editor — TIER 1]         │ [Debug — T2 ●]  │
│  T4:0.35 │  opacity:1.0              │  opacity:0.95    │
│  desat   │  full saturation           │  active, bold    │
│  quiet   │  HERO SURFACE             │                  │
│          │                            │                  │
│          │                            ├──────────────────┤
│          │                            │ [AI — T3:0.45]   │
│          │                            │  dim, inactive   │
│          │                            │  awaiting click  │
├──────────┴────────────────────────────┴──────────────────┤
│  Problems — T4:0.35 (quiet) │ Terminal — T2 idle:0.6    │
└──────────────────────────────────────────────────────────┘
```

The editor dominates at full opacity and saturation. The active debug panel is prominent but secondary. The AI panel and diagnostics are visible but clearly subordinate. The hierarchy is instantly readable.

---

## Hierarchy Diagram

```
                    ┌─────────────────────┐
                    │    TIER 1: EDITOR   │
                    │                     │
                    │  Opacity: 1.0/1.0   │
                    │  Saturation: 100%   │
                    │  Font: Full weight   │
                    │  Space: Maximum      │
                    │  Animation: Top pri  │
                    │                     │
                    │  NEVER YIELDS        │
                    │  NEVER DIMS          │
                    │  ALWAYS DOMINANT     │
                    └─────────┬───────────┘
                              │
              ┌───────────────┼───────────────┐
              │               │               │
    ┌─────────▼──────┐  ┌────▼───────────┐  ┌▼────────────────┐
    │  TIER 2:       │  │  TIER 3:      │  │  TIER 4:        │
    │  Active Task   │  │  AI Assist    │  │  Diagnostics    │
    │                │  │               │  │                 │
    │  Op: 0.95/0.60 │  │  Op: 0.85/0.45│  │  Op: 0.70/0.35 │
    │  Sat: 85%/50%  │  │  Sat: 70%/35% │  │  Sat: 50%/25%  │
    │  Font: B/N     │  │  Font: N/L    │  │  Font: N/L      │
    │  ONE ACTIVE    │  │  WHEN NEEDED  │  │  ALWAYS QUIET   │
    │  AT A TIME     │  │  DEFERS TO T2 │  │  COLLAPSE FIRST │
    └────────────────┘  └───────────────┘  └─────────────────┘
              │               │               │
              └───────────────┼───────────────┘
                              │
                              ▼
                    ┌─────────────────────┐
                    │  VISUAL DE-EMPHASIS │
                    │  STRATEGIES:        │
                    │                     │
                    │  • OpacityReduc.    │
                    │  • FocusWeight      │
                    │  • ColorDesat.      │
                    │  • InactiveQuiet    │
                    │  • Combined         │
                    └─────────────────────┘
```

---

## Summary

The Panel Hierarchy Rebuild establishes a strict visual priority system where every surface knows its place. The editor is always the hero, one active task panel at a time holds secondary prominence, AI assistance surfaces appear when needed and defer when not, and diagnostic surfaces are always quiet. The result is an interface where the user never has to guess what's important — the visual hierarchy tells them instantly.
