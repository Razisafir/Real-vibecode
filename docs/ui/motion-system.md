# Motion Design System

> Phase 12 — Real Vibecode AI-Native IDE
> Timing, Easing, and Transition Specifications

The motion system governs all animations and transitions in the IDE. No random transition durations, no arbitrary easing curves. Every animation must reference a defined token from this system.

---

## Table of Contents

1. [Motion Philosophy](#motion-philosophy)
2. [Duration Scale](#duration-scale)
3. [Easing Curves](#easing-curves)
4. [Panel Motion](#panel-motion)
5. [Component Motion](#component-motion)
6. [No Random Transitions Rule](#no-random-transitions-rule)
7. [Motion Validation](#motion-validation)
8. [Accessibility and Reduced Motion](#accessibility-and-reduced-motion)

---

## Motion Philosophy

### Why Constrained Motion?

Arbitrary transitions create visual inconsistency — different elements animate at different speeds with different curves, producing a chaotic feel. The motion system ensures:

1. **Predictability** — Users learn the timing of interactions
2. **Consistency** — Same interaction type = same animation
3. **Performance** — No unnecessary or overlapping animations
4. **Accessibility** — Motion can be disabled for users who need it

### Motion Principles

| # | Principle | Description |
|---|-----------|-------------|
| 1 | Purposeful | Every animation communicates a state change |
| 2 | Brief | Animations are fast enough to not impede workflow |
| 3 | Consistent | Same patterns use the same timing |
| 4 | Interruptible | Animations can be cut short by new interactions |
| 5 | Respects preference | Reduced motion is always supported |

---

## Duration Scale

### MotionDuration Enum

| Token | Value | Usage | Examples |
|-------|-------|-------|---------|
| `MotionDuration.Fast` | 100ms | Micro-interactions | Hover, focus, toggle, color change |
| `MotionDuration.Normal` | 200ms | Standard interactions | Expand, collapse, slide, fade |
| `MotionDuration.Slow` | 350ms | Complex transitions | Panel open, modal appear, view switch |
| `MotionDuration.Page` | 500ms | Page-level transitions | View change, major layout shift |

### Duration Decision Matrix

| Interaction Type | Duration | Rationale |
|-----------------|----------|-----------|
| Hover state change | `Fast` (100ms) | Immediate feedback needed |
| Focus ring appearance | `Fast` (100ms) | Visual feedback without delay |
| Color transition | `Fast` (100ms) | Smooth but quick |
| Toggle on/off | `Fast` (100ms) | State change should feel instant |
| Expand/collapse | `Normal` (200ms) | Content needs time to appear |
| Slide in/out | `Normal` (200ms) | Directional motion |
| Fade in/out | `Normal` (200ms) | Smooth appearance |
| Panel open/close | `Slow` (350ms) | Larger area change |
| Modal appear | `Slow` (350ms) | Focal point change |
| Dropdown expand | `Normal` (200ms) | Content reveal |
| Sidebar resize | `Normal` (200ms) | Continuous feel |
| Tab switch | `Fast` (100ms) | Quick context change |
| View switch | `Page` (500ms) | Major layout change |
| Welcome screen | `Page` (500ms) | First impression |

### Duration Math

Durations are not arbitrary. They follow a logical progression:

```
Fast:  100ms  × 2 = Normal (200ms)
Normal: 200ms × 1.75 = Slow (350ms)
Slow:  350ms × ~1.43 = Page (500ms)
```

This creates a natural-feeling acceleration curve where more complex transitions take proportionally longer.

---

## Easing Curves

### MotionEasing Enum

| Token | CSS Value | Character | Usage |
|-------|-----------|-----------|-------|
| `MotionEasing.Default` | `cubic-bezier(0.4, 0, 0.2, 1)` | Balanced ease | Most interactions |
| `MotionEasing.EaseIn` | `cubic-bezier(0.4, 0, 1, 1)` | Accelerating | Elements leaving the view |
| `MotionEasing.EaseOut` | `cubic-bezier(0, 0, 0.2, 1)` | Decelerating | Elements entering the view |
| `MotionEasing.EaseInOut` | `cubic-bezier(0.4, 0, 0.2, 1)` | Smooth both | Panel resizing, symmetric motions |
| `MotionEasing.Spring` | `cubic-bezier(0.175, 0.885, 0.32, 1.275)` | Playful overshoot | Notifications, badges |

### Easing Visual Comparison

```
Default (0.4, 0, 0.2, 1):
  ────────╲
            ╲──────────

EaseIn (0.4, 0, 1, 1):
  ───────────╲
               ╲───────

EaseOut (0, 0, 0.2, 1):
  ──╲
     ╲──────────────────

Spring (0.175, 0.885, 0.32, 1.275):
  ───╲
      ╲──╱──╲──────────
      (overshoots then settles)
```

### Easing Selection Guide

| Scenario | Easing | Why |
|----------|--------|-----|
| Element appearing | `EaseOut` | Deceleration feels natural for arrival |
| Element disappearing | `EaseIn` | Acceleration feels natural for departure |
| Element moving in place | `Default` | Balanced motion for position changes |
| Element resizing | `EaseInOut` | Symmetric expansion/contraction |
| Notification appearing | `Spring` | Delightful overshoot draws attention |
| Hover state change | `Default` | Simple, predictable |

---

## Panel Motion

### Panel Entrance/Exit Behavior

#### IPanelMotionSpec Interface

```typescript
interface IPanelMotionSpec {
    readonly enter: IMotionSpec;
    readonly exit: IMotionSpec;
    readonly resize: IMotionSpec;
}
```

#### IMotionSpec Interface

```typescript
interface IMotionSpec {
    readonly duration: MotionDuration;
    readonly easing: MotionEasing;
    readonly delay: number;
}
```

### Panel Motion Specifications

#### Primary Sidebar

| Action | Duration | Easing | Delay |
|--------|----------|--------|-------|
| Enter (expand) | `Normal` (200ms) | `EaseOut` | 0ms |
| Exit (collapse) | `Normal` (200ms) | `EaseIn` | 0ms |
| Resize | `Normal` (200ms) | `EaseInOut` | 0ms |

#### Secondary Sidebar

| Action | Duration | Easing | Delay |
|--------|----------|--------|-------|
| Enter (expand) | `Normal` (200ms) | `EaseOut` | 0ms |
| Exit (collapse) | `Normal` (200ms) | `EaseIn` | 0ms |
| Resize | `Normal` (200ms) | `EaseInOut` | 0ms |
| Float (overlay mode) | `Slow` (350ms) | `EaseOut` | 0ms |

#### Bottom Panel

| Action | Duration | Easing | Delay |
|--------|----------|--------|-------|
| Enter (expand) | `Normal` (200ms) | `EaseOut` | 0ms |
| Exit (collapse) | `Normal` (200ms) | `EaseIn` | 0ms |
| Resize | `Normal` (200ms) | `EaseInOut` | 0ms |

#### Modal Dialog

| Action | Duration | Easing | Delay |
|--------|----------|--------|-------|
| Backdrop enter | `Slow` (350ms) | `Default` | 0ms |
| Content enter | `Slow` (350ms) | `EaseOut` | 50ms |
| Content exit | `Normal` (200ms) | `EaseIn` | 0ms |
| Backdrop exit | `Normal` (200ms) | `Default` | 0ms |

#### Dropdown/Popover

| Action | Duration | Easing | Delay |
|--------|----------|--------|-------|
| Enter | `Normal` (200ms) | `EaseOut` | 0ms |
| Exit | `Fast` (100ms) | `EaseIn` | 0ms |

#### Notification Toast

| Action | Duration | Easing | Delay |
|--------|----------|--------|-------|
| Enter | `Slow` (350ms) | `Spring` | 0ms |
| Exit | `Normal` (200ms) | `EaseIn` | 0ms |
| Auto-dismiss | — | — | 5000ms delay |

### Panel Motion Direction

| Panel | Enter Direction | Exit Direction |
|-------|----------------|----------------|
| Primary Sidebar | Slide from left | Slide to left |
| Secondary Sidebar | Slide from right | Slide to right |
| Bottom Panel | Slide from bottom | Slide to bottom |
| Modal | Fade + scale up | Fade + scale down |
| Dropdown | Scale from trigger | Scale to trigger |
| Notification | Slide from top-right | Slide to top-right |
| Tooltip | Fade in | Fade out |

---

## Component Motion

### Button Motion

| State Change | Duration | Easing |
|-------------|----------|--------|
| Default → Hover | `Fast` (100ms) | `Default` |
| Hover → Default | `Fast` (100ms) | `Default` |
| Default → Active | 0ms | — |
| Active → Default | 0ms | — |
| Default → Focus | `Fast` (100ms) | `Default` |
| Focus → Default | `Fast` (100ms) | `Default` |
| Default → Disabled | `Fast` (100ms) | `Default` |

### Input Motion

| State Change | Duration | Easing |
|-------------|----------|--------|
| Default → Focus | `Fast` (100ms) | `Default` |
| Focus → Default | `Fast` (100ms) | `Default` |
| Default → Hover | `Fast` (100ms) | `Default` |
| Error state appear | `Fast` (100ms) | `Default` |
| Error state disappear | `Fast` (100ms) | `Default` |

### Tab Motion

| State Change | Duration | Easing |
|-------------|----------|--------|
| Tab switch | `Fast` (100ms) | `Default` |
| Tab indicator move | `Normal` (200ms) | `EaseInOut` |
| Tab close button appear | `Fast` (100ms) | `Default` |

### List Item Motion

| State Change | Duration | Easing |
|-------------|----------|--------|
| Hover | `Fast` (100ms) | `Default` |
| Select | `Fast` (100ms) | `Default` |
| Expand/collapse | `Normal` (200ms) | `EaseInOut` |
| Reorder drag | 0ms (follows cursor) | — |
| Reorder drop | `Normal` (200ms) | `Spring` |

### AI-Specific Motion

| Element | Animation | Duration | Easing |
|---------|-----------|----------|--------|
| Kernel status dot (active) | Pulse | 2000ms continuous | Sinusoidal |
| Agent executing indicator | Spin | 1500ms continuous | Linear |
| Process running bar | Indeterminate progress | 2000ms continuous | Linear |
| Mutation annotation appear | Fade in | `Normal` (200ms) | `EaseOut` |
| Mutation annotation remove | Fade out | `Fast` (100ms) | `EaseIn` |
| Intent status change | Cross-fade | `Fast` (100ms) | `Default` |

---

## No Random Transitions Rule

### The Rule

**Every `transition` property in the codebase must reference tokens from this motion system.**

### Forbidden Patterns

```css
/* FORBIDDEN — arbitrary duration */
transition: all 0.3s ease;

/* FORBIDDEN — arbitrary easing */
transition: transform 200ms ease-in-out;

/* FORBIDDEN — "all" transitions */
transition: all 200ms;

/* FORBIDDEN — no transition on interactive elements that should have one */
.button:hover { background: blue; }  /* Missing transition! */
```

### Required Patterns

```css
/* CORRECT — tokenized duration and easing */
transition: background-color ${MotionDuration.Fast}ms ${MotionEasing.Default};

/* CORRECT — specific property, tokenized values */
transition: opacity ${MotionDuration.Normal}ms ${MotionEasing.EaseOut},
            transform ${MotionDuration.Normal}ms ${MotionEasing.EaseOut};

/* CORRECT — no transition needed for non-interactive elements */
.static-text { color: ${resolveColor(ColorToken.TextPrimary)}; }
```

### Transition Property Specificity

Always specify the exact CSS property being transitioned:

```css
/* AVOID */
transition: all 200ms cubic-bezier(0.4, 0, 0.2, 1);

/* PREFER */
transition: background-color 200ms cubic-bezier(0.4, 0, 0.2, 1),
            border-color 200ms cubic-bezier(0.4, 0, 0.2, 1);
```

The `all` keyword is forbidden because:
1. It transitions properties that shouldn't animate (like `width`, `height`)
2. It creates performance overhead by tracking all properties
3. It can cause unintended visual artifacts

---

## Motion Validation

### Validation Rules

The design system enforcer validates motion in two ways:

#### Static Analysis (build time)

| Rule | Check |
|------|-------|
| Duration in token set | `transition-duration` must be 100, 200, 350, or 500 |
| Easing in token set | `transition-timing-function` must match a defined curve |
| No "all" transitions | `transition-property` must not be `all` |
| Interactive elements have transitions | Buttons, links, inputs must have hover transitions |

#### Runtime Validation

| Method | Purpose |
|--------|---------|
| `runConsistencyCheck()` | Checks all rendered elements for motion violations |
| `checkElement(id)` | Checks a specific element's motion properties |

### Motion Violation Examples

#### Violation: Arbitrary Duration

```
Type: DesignViolationType.UnauthorizedInlineStyle
Severity: Warning
Description: "Transition duration 300ms is not in MotionDuration scale"
Location: ".my-panel { transition: opacity 300ms ease }"
Suggestion: "Use MotionDuration.Slow (350ms) or MotionDuration.Normal (200ms)"
```

#### Violation: "all" Transition

```
Type: DesignViolationType.UnauthorizedInlineStyle
Severity: Warning
Description: "transition: all is forbidden — specify exact properties"
Location: ".my-button { transition: all 200ms ease }"
Suggestion: "transition: background-color 200ms cubic-bezier(0.4,0,0.2,1)"
```

#### Violation: Missing Hover Transition

```
Type: DesignViolationType.MissingInteractionState
Severity: Warning
Description: "Interactive element has hover state but no transition"
Location: ".action-button:hover { background: blue }"
Suggestion: "Add transition: background-color 100ms cubic-bezier(0.4,0,0.2,1)"
```

### Motion Performance Rules

1. **Only animate composited properties** — `transform` and `opacity` are GPU-accelerated
2. **Avoid animating layout properties** — `width`, `height`, `padding`, `margin` cause reflow
3. **Use `will-change` sparingly** — only on elements that will definitely animate
4. **Limit simultaneous animations** — no more than 3 elements animating at once
5. **Defer off-screen animations** — elements outside the viewport don't need animation

### Motion Performance Budget

| Metric | Budget |
|--------|--------|
| Max concurrent animations | 3 |
| Max animation duration | 500ms (`MotionDuration.Page`) |
| Max continuous animation | 2 (kernel pulse + progress bar) |
| Target frame rate | 60fps (16.67ms per frame) |
| Max layout-triggering animations | 0 (use transform/opacity only) |

---

## Accessibility and Reduced Motion

### prefers-reduced-motion Support

The design system respects `prefers-reduced-motion: reduce`:

```css
@media (prefers-reduced-motion: reduce) {
    * {
        animation-duration: 0.01ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.01ms !important;
    }
}
```

### Reduced Motion Behavior

| Normal Behavior | Reduced Motion Behavior |
|----------------|------------------------|
| Slide in (200ms) | Instant appear |
| Fade in (200ms) | Instant appear |
| Pulse animation | Static indicator |
| Spring notification | Instant appear |
| Scale modal | Instant appear |
| Progress bar animation | Static progress bar |

### Implementation

```typescript
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

function getEffectiveMotion(spec: IMotionSpec): IMotionSpec {
    if (prefersReducedMotion.matches) {
        return {
            duration: 0 as MotionDuration,  // Instant
            easing: spec.easing,
            delay: 0
        };
    }
    return spec;
}
```

### Motion and Cognitive Accessibility

1. **No flashing** — animations must not flash more than 3 times per second
2. **No auto-play** — complex animations should not auto-start without user interaction
3. **Parallax forbidden** — no parallax scrolling or depth-based motion effects
4. **Seizure-safe** — no rapid color cycling or high-contrast flashing

---

## Reference

- **Source**: `src/vs/workbench/services/aiExecution/common/designSystem.ts`
- **Enums**: `MotionDuration`, `MotionEasing`
- **Interfaces**: `IMotionSpec`, `IPanelMotionSpec`
- **Service**: `IDesignSystemService`
