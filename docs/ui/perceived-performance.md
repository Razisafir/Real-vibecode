# Perceived Performance

> Phase 13 — Real Product UX Transformation Layer
> Making the interface feel responsive even when work takes time.

---

## Philosophy: "Users Judge Performance Emotionally, Not Technically"

A 200ms API response that causes a layout shift feels slower than a 500ms response that arrives with a smooth skeleton transition. A 2-second operation with a progress bar feels faster than a 1.5-second operation that freezes the UI. The user's perception of speed is shaped not by actual latency, but by the quality of the visual feedback they receive during the wait.

Real Vibecode optimizes for perceived performance — the subjective experience of responsiveness — rather than purely technical metrics. This means investing in techniques that make the interface feel instant, smooth, and alive, even when the underlying operations take time.

The core principle: **Never let the user see the machine thinking.** The UI should always appear to be one step ahead, preparing for the next interaction, transitioning smoothly between states, and masking latency with purposeful motion.

---

## Optimistic UI Updates

The most powerful perceived-performance technique: apply the expected result before the server confirms it, and revert if the prediction was wrong.

### How It Works

```
┌──────────────────────────────────────────────────────────┐
│              OPTIMISTIC UPDATE FLOW                       │
│                                                           │
│  1. User initiates action (e.g., accept AI suggestion)   │
│  2. UI immediately shows the expected result:             │
│     - Text appears in editor                              │
│     - Button state changes to "accepted"                  │
│     - No loading indicator                                │
│  3. Action is sent to backend                             │
│  4. Two possible outcomes:                                │
│     a. SUCCESS → No additional UI change (already done)  │
│     b. FAILURE → Revert with smooth transition:           │
│        - Text fades out (200ms Accelerate)                │
│        - Button returns to previous state (150ms Standard)│
│        - Error message appears (250ms Appear)             │
└──────────────────────────────────────────────────────────┘
```

### Where Optimistic Updates Apply

| Action | Optimistic Result | Revert If |
|---|---|---|
| Accept AI suggestion | Code appears in editor immediately | AI service rejects (rare) |
| Toggle setting | Setting UI flips immediately | Persistence fails |
| Pin/unpin file | File moves in explorer immediately | File system error |
| Dismiss notification | Notification disappears immediately | Queue error (never re-shows) |
| Switch editor tab | Tab content appears immediately | File load failure (shows error) |

### Where Optimistic Updates Do NOT Apply

- File save (must confirm before showing "saved")
- Git operations (must confirm before showing "committed")
- Code execution (must confirm before showing output)
- Any action that cannot be cleanly reverted

---

## Skeleton States

When content is loading and cannot be optimistically shown, the system displays a skeleton placeholder that mimics the shape of the arriving content.

### Skeleton Types

| Type | Visual | Animation | Use Case |
|---|---|---|---|
| **Text Skeleton** | Horizontal bars at line-height intervals | Shimmer (left to right, 2s loop) | AI explanation text, documentation |
| **Card Skeleton** | Rounded rectangle with header bar and 2–3 content lines | Shimmer | AI suggestion cards, property panels |
| **List Skeleton** | Repeating rows with small icon + 2 bars | Shimmer staggered per row | File lists, search results |
| **Image Skeleton** | Solid rectangle matching image aspect ratio | Pulse (opacity 0.3 → 0.5, 1.5s) | Diagrams, charts, screenshots |
| **Chart Skeleton** | Axes with placeholder bars/lines | Shimmer on data area | Analytics, performance graphs |

### Skeleton Animation Specs

**Shimmer Effect:**
```
@keyframes shimmer {
  0%   { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}

.skeleton {
  background: linear-gradient(
    90deg,
    var(--skeleton-base) 25%,
    var(--skeleton-shine) 50%,
    var(--skeleton-base) 75%
  );
  background-size: 200% 100%;
  animation: shimmer 2s ease-in-out infinite;
}
```

**Pulse Effect:**
```
@keyframes pulse {
  0%, 100% { opacity: 0.3; }
  50%      { opacity: 0.5; }
}

.skeleton-pulse {
  animation: pulse 1.5s ease-in-out infinite;
}
```

### Skeleton-to-Content Transition

When the real content arrives, the skeleton transitions to it smoothly — never an instant replacement:

1. Skeleton fades out (150ms, Accelerate)
2. Content fades in (200ms, Decelerate)
3. Content settles with a subtle upward drift (4px → 0px over 250ms)

Total transition: ~350ms. Feels like the content "arrives" rather than "appears."

---

## Latency Mask Strategies

The system selects a latency masking strategy based on the expected wait time:

### Strategy Selection

```
  Expected Wait Time
       │
       ├─ < 200ms ──────▶ TransitionBuffer
       │                   (No loading indicator. Just ensure the
       │                    transition is smooth. The user won't
       │                    notice 200ms if the UI doesn't flash.)
       │
       ├─ < 500ms ──────▶ StaleWithIndicator
       │                   (Show the previous state with a subtle
       │                    loading indicator — spinning dot or
       │                    opacity pulse on the affected area.)
       │
       ├─ < 1500ms ─────▶ Skeleton
       │                   (Replace the affected area with a
       │                    skeleton placeholder. The skeleton
       │                    communicates "loading" without text.)
       │
       └─ > 1500ms ─────▶ ProgressBar
                           (Show an indeterminate progress bar
                            for the first 3s, then switch to
                            determinate if possible. Include a
                            subtle "Working..." label.)
```

### Transition Buffer

The simplest strategy. When an operation is expected to complete in under 200ms, the system ensures that the visual transition is smooth:

- No loading indicator
- Apply state change with standard transition (150–250ms)
- If the operation takes longer than expected, escalate to StaleWithIndicator

**Rule:** The transition itself should feel like the response. The user clicks a button, the button transitions, and by the time the transition is done, the result is there. The transition IS the loading state.

### Stale With Indicator

For operations expected to take 200–500ms, the system shows the previous state with a subtle indicator:

- A small spinning dot (8px, 0.8 opacity) appears in the corner of the affected area
- The existing content remains visible but gains a 5% opacity reduction
- The indicator animates with a smooth rotation (1s loop)

**Rule:** Never remove content to show a loading state. The user should always see something familiar, not a void.

### Skeleton

For operations expected to take 500–1500ms:

- The affected area transitions to a skeleton (see Skeleton States above)
- The skeleton shape matches the expected content shape
- Shimmer animation provides visual activity

### Progress Bar

For operations expected to take more than 1500ms:

- An indeterminate progress bar appears at the top of the affected area
- After 3 seconds, if progress information is available, switch to determinate
- Include a minimal label ("Working...", "Analyzing...", "Generating...")
- If the operation takes more than 10 seconds, show time estimate

**Progress Bar Specs:**
- Height: 2px (indeterminate), 3px (determinate)
- Color: Accent color at 60% opacity
- Animation: Smooth left-to-right sweep (indeterminate), fill growth (determinate)
- Position: Top edge of the loading surface

---

## Smooth Transitions

### Preventing Layout Shifts

Layout shifts are the enemy of perceived performance. When an element appears or disappears and causes surrounding content to jump, the user perceives it as a glitch, not a smooth experience.

**Rules:**
1. **Reserve space.** Skeleton placeholders must be exactly the size of the content they replace.
2. **Animate size changes.** When a panel grows or shrinks, animate the size change over 200–300ms.
3. **Use transform, not layout.** Prefer `transform: scale()`, `transform: translateX()`, and `opacity` over `width`, `height`, `top`, `left`.
4. **Stagger batch updates.** If multiple elements change simultaneously, stagger their transitions by 30–50ms to create a cascade rather than a flash.

### Transition Buffering

The system implements a **transition buffer** — a 50ms window after a state change during which the UI "collects" all pending changes and then applies them as a single, cohesive transition.

```
  State change triggered at T+0ms
  Other state changes triggered at T+10ms, T+25ms, T+40ms
  Buffer window: 50ms
  At T+50ms: All changes applied simultaneously as one transition
```

This prevents the "staircase" effect where multiple elements change in sequence, creating a rippling layout shift.

---

## Predictive Rendering

The system anticipates what the user is likely to do next and pre-renders the expected result:

### Prediction Triggers

| User Action | Predicted Next Action | Pre-Render |
|---|---|---|
| Click on file in explorer | File will open in editor | Start loading file content |
| Type a function name | Will need auto-complete | Pre-compute suggestions |
| Start debugging | Will need debug panel | Pre-render debug panel |
| Accept AI suggestion | Will need next suggestion | Pre-compute next suggestion |
| Open search | Will type search query | Pre-index visible files |

### Pre-Render Rules

1. Pre-rendering must never block the main thread
2. Pre-rendered content is stored in a cache, not displayed until needed
3. Pre-rendering is aborted if the user does something unexpected (the prediction was wrong)
4. Pre-rendered content that is never used is discarded after 30 seconds

---

## Rules Summary

| Rule | Description | Anti-Pattern |
|---|---|---|
| **No flashing layout shifts** | Elements must transition into place, not pop | Content jumping from one position to another |
| **No instant panel snapping** | Panels must slide in/out with easing | Panel appearing instantly at full size |
| **No blocking feel** | The UI must never freeze, even during heavy work | Cursor changes to wait, UI becomes unresponsive |
| **No empty space** | If content is loading, show a skeleton | Blank white area with no visual feedback |
| **No jarring state changes** | Every visual change has a transition | Instant color change, instant visibility toggle |
| **No unanchored progress** | Progress indicators must be tied to the affected area | Global loading spinner with no context |

---

## Before/After Analysis

### Before: Freezing During Load

```
  User clicks "Run Tests"
  ────────────────────────
  [UI freezes for 1.5 seconds]
  [Cursor changes to ⌛]
  [Entire window becomes unresponsive]
  
  After 1.5s:
  [Test results appear instantly — jarring layout shift]
  [Panel appears at full size — no transition]
  [Results overlap with existing content briefly]
  
  User feeling: "This app is slow and broken"
```

### After: Always Feels Responsive

```
  User clicks "Run Tests"
  ────────────────────────
  [Button transitions to "Running..." state immediately — 60ms]
  [Test panel skeleton appears with shimmer — 200ms]
  [Progress bar appears at top of panel — subtle, 2px]
  [UI remains fully responsive during test execution]
  
  After 1.5s:
  [Skeleton fades out, results fade in — 350ms cross-fade]
  [Content "arrives" with subtle upward drift]
  [No layout shift — skeleton was exact size of results]
  
  User feeling: "That was smooth and fast"
```

---

## Summary

Perceived performance is not about lying to the user — it's about communicating progress and state changes through motion, structure, and anticipation rather than through emptiness, freezing, and jarring transitions. By applying optimistic updates, skeleton states, latency masking strategies, and smooth transitions, Real Vibecode creates an experience where the interface always feels responsive, always feels alive, and never makes the user wait without visual feedback. The result is not a technically faster system, but an emotionally faster one — and that's what matters.
