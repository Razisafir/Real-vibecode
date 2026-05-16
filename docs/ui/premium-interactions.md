# Premium Microinteractions

> Phase 13 — Real Product UX Transformation Layer
> How the product feels expensive through motion.

---

## Interaction Philosophy: "Physical, Weighted, Never Abrupt"

Real Vibecode's motion language is inspired by the physical world. Every element in the interface has perceived mass, every transition follows physically plausible easing, and every state change happens through movement — never by instant appearance or disappearance.

The philosophy rests on three pillars:

1. **Physical plausibility.** Elements move as if they have weight and exist in a space with gentle friction. A panel sliding in decelerates as it reaches its rest position, just as a real sliding door would. A button press compresses slightly before springing back, like a physical switch.

2. **Weighted transitions.** Not all elements are equal. Heavy surfaces (panels, editors) move slowly and deliberately. Light surfaces (tooltips, badges) respond quickly and lightly. The perceived weight of an element determines its motion characteristics — duration, easing curve, and distance.

3. **Never abrupt.** No element ever appears or disappears instantly. Every state change has a transition, even if it's only 80ms. This eliminates the "flash" that makes interfaces feel cheap and unpolished. Even a simple visibility change goes through a 100ms opacity transition.

---

## Motion Types

The system defines ten canonical motion types, each with its own timing, easing, and behavioral rules:

### 1. Hover

**Trigger:** Mouse enters an interactive element
**Duration:** 120ms enter, 180ms exit (slower exit feels more natural)
**Easing:** Standard
**Behavior:** Subtle scale increase (1.0 → 1.02), background color shift, shadow elevation

```
  ┌─────────┐        ┌─────────┐
  │ Button  │──120ms─▶│ Button  │
  │         │        │ +shadow │
  │ scale:1 │        │ scale:  │
  │         │        │ 1.02    │
  └─────────┘        └─────────┘
                     (hover state)
```

### 2. Press

**Trigger:** Mouse down on an interactive element
**Duration:** 60ms
**Easing:** Accelerate
**Behavior:** Scale decrease (1.0 → 0.97), slight color darkening, shadow compression

### 3. Release

**Trigger:** Mouse up after press
**Duration:** 200ms
**Easing:** Weighted (overshoot: 0.15)
**Behavior:** Scale springs back from 0.97 → 1.005 → 1.0, subtle bounce, shadow expands

### 4. PanelSlide

**Trigger:** Panel opens or closes
**Duration:** 300ms open, 250ms close
**Easing:** Decelerate (open), Accelerate (close)
**Behavior:** Panel slides in from edge, editor content smoothly resizes, depth shadow increases on panel

### 5. PanelResize

**Trigger:** User or system resizes a panel
**Duration:** 200ms (system-initiated), immediate (user drag with momentum smoothing)
**Easing:** Standard
**Behavior:** Content reflows smoothly, no layout jump, adjacent panels shift proportionally

### 6. Appear

**Trigger:** New element enters the view (notification, badge, decoration)
**Duration:** 250ms
**Easing:** Decelerate
**Behavior:** Scale from 0.85 → 1.0, opacity from 0 → 1.0, subtle upward drift (8px → 0px)

### 7. Disappear

**Trigger:** Element leaves the view
**Duration:** 200ms
**Easing:** Accelerate
**Behavior:** Scale from 1.0 → 0.92, opacity from 1.0 → 0, subtle downward drift (0px → 4px)

### 8. Scroll

**Trigger:** User scrolls in any surface
**Duration:** N/A (continuous)
**Easing:** Momentum-based with friction coefficient 0.95
**Behavior:** Smooth deceleration, no jank, sub-pixel rendering, frame-locked to display refresh rate

### 9. FocusChange

**Trigger:** Keyboard focus moves between elements
**Duration:** 150ms
**Easing:** Standard
**Behavior:** Focus ring animates between elements (position, size, opacity), never instant jump

### 10. StateTransition

**Trigger:** Element changes visual state (selected, active, error, disabled)
**Duration:** 200ms
**Easing:** Standard
**Behavior:** Color, opacity, and decoration cross-fade; never instant switch

---

## Premium Easing Curves

The system defines six easing curves, each designed for a specific motion context:

### Curve Definitions

| Curve | CSS Cubic Bezier | Use Case | Character |
|---|---|---|---|
| **Standard** | `cubic-bezier(0.25, 0.1, 0.25, 1.0)` | General transitions, state changes | Smooth, neutral, unremarkable |
| **Decelerate** | `cubic-bezier(0.0, 0.0, 0.2, 1.0)` | Elements entering view | Starts fast, ends slow — "arriving" |
| **Accelerate** | `cubic-bezier(0.4, 0.0, 1.0, 1.0)` | Elements leaving view | Starts slow, ends fast — "departing" |
| **Sharp** | `cubic-bezier(0.4, 0.0, 0.6, 1.0)` | Quick confirmations, toggles | Brief, decisive, no lingering |
| **Weighted** | `cubic-bezier(0.34, 1.56, 0.64, 1.0)` | Panel slides, large surface movements | Heavy, deliberate, slight overshoot |
| **Magnetic** | `cubic-bezier(0.2, 0.0, 0.0, 1.0)` | Cursor proximity responses | Snaps toward cursor, feels attracted |

### Curve Selection Logic

```
Is the element ENTERING view?
  → Decelerate (fast start, gentle arrival)
Is the element LEAVING view?
  → Accelerate (gentle start, decisive exit)
Is the element LARGE (panel, editor)?
  → Weighted (heavy, overshooting)
Is the element SMALL (button, badge)?
  → Standard (neutral, smooth)
Is the motion NEAR the cursor?
  → Magnetic (attracted feel)
Is the motion a QUICK toggle?
  → Sharp (brief, decisive)
```

---

## Perceived Weight System

Every UI element has a **Perceived Weight** value between 0.0 and 1.0 that determines its motion characteristics:

### Weight Mapping

| Weight Range | Element Type | Duration Scale | Easing Preference |
|---|---|---|---|
| 0.0 – 0.2 | Tooltips, badges, dots, inline decorations | 0.6× standard | Sharp |
| 0.2 – 0.4 | Buttons, links, toggles, input fields | 0.8× standard | Standard |
| 0.4 – 0.6 | Cards, list items, sidebar sections | 1.0× standard | Standard |
| 0.6 – 0.8 | Panels, sidebars, terminal | 1.3× standard | Decelerate |
| 0.8 – 1.0 | Editor, main content area, full-screen overlays | 1.5× standard | Weighted |

### Weight Calculation

```
perceivedWeight = baseWeight
               + sizeWeight × (elementPixels / viewportPixels)
               + depthWeight × (zIndex / maxZIndex)
               + interactionWeight × (clickFrequency × 0.1)
```

Where:
- `baseWeight`: Assigned by element type (tooltip = 0.1, panel = 0.7)
- `sizeWeight`: Larger elements feel heavier (0.0–0.15)
- `depthWeight`: Higher z-index elements feel more prominent (0.0–0.1)
- `interactionWeight`: Frequently used elements gain presence (0.0–0.05)

### Weight Impact on Motion

A higher perceived weight means:
- **Longer duration** — heavy things move slowly
- **More overshoot** — heavy things have momentum
- **More shadow depth** — heavy things cast shadows
- **Later start** — heavy things take a moment to begin moving (10–30ms delay)

---

## Depth Effects During Motion

Motion in Real Vibecode is not purely 2D. Elements gain and lose depth as they move, creating a subtle parallax-like experience:

| Motion | Depth Change | Shadow Behavior |
|---|---|---|
| Panel slide in | Z increases from -4px to 0px | Shadow grows from 0 to 12px blur |
| Panel slide out | Z decreases from 0px to -4px | Shadow shrinks from 12px to 0 |
| Button hover | Z increases from 0px to 2px | Shadow grows slightly |
| Button press | Z decreases from 0px to -1px | Shadow compresses |
| Notification appear | Z starts at 8px, settles to 0px | Shadow starts large, settles |
| Tooltip appear | Z starts at 4px, settles to 0px | Subtle shadow, quick settle |

The depth effect is implemented using CSS `transform: translateZ()` within a `perspective` container, with `box-shadow` changes animated in parallel.

---

## Magnetic Alignment

Elements near the cursor exhibit subtle magnetic behavior — they lean slightly toward the cursor position, creating a feeling of responsiveness and spatial awareness:

**Rules:**
- Only interactive elements respond (buttons, tabs, panel headers)
- Maximum displacement: 2px toward cursor
- Response distance: 40px from element center
- Easing: Magnetic curve
- Duration: 150ms

```
  Cursor at distance → element neutral
  
      ○                ┌──────┐
                       │ Btn  │
                       └──────┘
  
  Cursor approaches → element leans
  
           ○          ┌──────┐
          ╱           │ Btn ↗│  (2px toward cursor)
         ╱            └──────┘
  
  Cursor on element → full hover state
  
                     ┌──────┐
                     ○ Btn  │  (hover scale + shadow)
                     └──────┘
```

---

## Cursor Proximity Response

Beyond magnetic alignment, the entire interface responds to cursor proximity at a system level:

| Distance | Response |
|---|---|
| 0–20px | Full hover state (scale, shadow, color) |
| 20–50px | Pre-hover: subtle opacity increase (0.85 → 1.0), shadow hint |
| 50–100px | Awareness: inactive elements near cursor gain 5% opacity boost |
| 100px+ | No response — elements at rest |

This creates a subtle "aura" around the cursor where nearby elements gently prepare themselves for interaction, making the interface feel alive and aware.

---

## Scroll Smoothness Normalization

All scrollable surfaces in Real Vibecode conform to a single smooth-scroll specification:

- **Momentum coefficient:** 0.95 (deceleration per frame)
- **Frame rate target:** Matched to display refresh rate (60Hz/120Hz)
- **Sub-pixel rendering:** Enabled for all scroll containers
- **Overscroll behavior:** `contain` — scroll does not chain to parent
- **Scroll snap:** Only where explicitly designed (tab strips, card carousels)

**Anti-patterns forbidden:**
- Instant scroll position changes (no `scrollTop = x`)
- Janky 15fps scroll indicators
- Layout shifts during scroll (lazy-loaded content must reserve space)
- Scroll jank during heavy computation (use `requestIdleCallback` for non-critical work)

---

## Duration Normalization

All motion durations are normalized to a standard set of values. No arbitrary millisecond values are permitted:

| Duration Name | Value | Use Case |
|---|---|---|
| Instant | 80ms | Micro-feedback (toggle state, selection) |
| Quick | 150ms | Hover, focus, small state changes |
| Standard | 250ms | Panel slide, notification, appear/disappear |
| Deliberate | 400ms | Major layout changes, full panel transitions |
| Extended | 600ms | Full-screen transitions, complex choreography |
| Gentle | 800ms | Ambient animations, subtle background motion |

**Rule:** If a developer writes `transition-duration: 173ms`, the system normalizes it to the nearest standard value (150ms). This ensures motion cohesion across the entire interface.

---

## Motion Cohesion Validation

The system validates that all active motions are cohesive — that is, they feel like they belong together, like parts of the same physical system.

### Cohesion Rules

1. **Same easing family.** All simultaneously active transitions must use the same easing family (all decelerating for entrances, all accelerating for exits).
2. **Harmonic durations.** If two motions are active simultaneously, their durations must be within the same harmonic band (both Quick, both Standard, or in a 2:1 ratio).
3. **No contradictory motion.** Two adjacent elements must not move in opposite directions simultaneously (one left, one right) unless choreographed as a split.
4. **No motion piling.** More than 3 simultaneous animations on screen triggers the `reduce-animation` noise reduction action.

### Validation Check

Every 100ms, the system runs a cohesion check:

```
if (simultaneousMotions > 3) → trigger reduce-animation
if (contradictoryDirections > 0) → reverse the lower-priority motion
if (durationDisparity > 2:1) → normalize to same band
if (easingMismatch > 0) → align to dominant easing
```

---

## Reference Products

The motion language is informed by analysis of these reference products:

| Product | What We Borrow |
|---|---|
| **Linear** | Panel slide choreography, notification elegance, general calmness |
| **Apple Pro Apps (FCP, Logic)** | Weighted panel movement, depth during drag, precision feel |
| **Notion** | Smooth inline editing, appear/disappear of blocks, scroll behavior |
| **Raycast** | Quick responsiveness, magnetic feel, keyboard-driven motion |
| **Arc Browser** | Tab choreography, panel split animations, spatial movement |

---

## Before/After Analysis

### Before: Random Transitions

```
  Button hover:   0ms (instant background change)
  Panel open:     500ms linear (too slow, mechanical)
  Notification:   instant appear + instant disappear
  Scroll:         browser default (inconsistent across surfaces)
  Focus change:   instant outline jump
  Tooltip:        0ms appear, 2000ms disappear (lingers)

  FEEL: Cheap, inconsistent, each element operates independently
```

Every element transitions at its own arbitrary speed with its own arbitrary easing. There is no relationship between how a panel moves and how a button responds. The interface feels like a collection of independent components, not a unified product.

### After: Cohesive Physical Motion Language

```
  Button hover:   120ms Standard easing (smooth, weighted)
  Panel open:     300ms Decelerate easing (fast start, gentle arrival)
  Notification:   250ms Appear (decelerate, slight upward drift)
                  200ms Disappear (accelerate, slight downward drift)
  Scroll:         Momentum 0.95, frame-locked, sub-pixel
  Focus change:   150ms Standard easing (position animation)
  Tooltip:        150ms Decelerate appear, 200ms Accelerate disappear

  FEEL: Cohesive, physical, intentional — each motion belongs to
        the same family, the same physics engine
```

---

## Summary

Premium microinteractions are not decoration — they are the texture of quality. When every hover, every panel slide, every notification appearance and disappearance follows a single, coherent physical language, the entire product feels unified and intentional. The user may not consciously notice the motion design, but they will feel it: Real Vibecode feels solid, responsive, and expensive — not because of any single animation, but because of the consistent, disciplined motion language that governs every pixel's movement.
