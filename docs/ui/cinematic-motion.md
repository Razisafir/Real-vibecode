# Cinematic Motion System

> **Phase 15 — Production Surface Rebuild**
> Service: `ICinematicMotionService`

## Overview

Motion in the IDE is not decoration — it is communication. Every transition, every panel slide, every fade tells the user where things came from, where they are going, and how the interface is responding to their intent. The `ICinematicMotionService` governs weighted transitions, layered movement choreography, and contextual panel animation. It ensures that motion is coordinated, purposeful, and disciplined.

The target feeling is **"alive but disciplined."** The interface should feel responsive and intelligent — panels slide open smoothly, tabs transition with purpose, AI suggestions appear with grace. But motion must never be gimmicky, excessive, or uncoordinated. Every animation serves a perceptual purpose: communicating spatial relationships, preserving object permanence, or confirming user actions.

---

## Choreography Types

When multiple elements animate simultaneously, their timing relationships are governed by choreography types. Choreography determines the rhythm and sequence of motion — how individual animations relate to each other within a composite transition.

### Sequential

Elements animate one after another, in a defined order. Each element waits for the previous one to complete (or reach a threshold) before starting.

```
Time →   0ms          150ms         300ms         450ms
         ┌──────┐
Panel A: │ slide │───────────────────────────────────────
         └──────┘
                      ┌──────┐
Panel B:              │ slide │───────────────────────────
                      └──────┘
                                   ┌──────┐
Panel C:                           │ slide │───────────────
                                   └──────┘
```

**Use when:** The order of appearance matters (e.g., sidebar sections revealing top-to-bottom), or when simultaneous motion would be visually chaotic.

**Default offset:** 100ms between each element.

### Staggered

Elements animate with overlapping timing — each starts before the previous one finishes, creating a wave-like effect.

```
Time →   0ms     50ms    100ms   150ms   200ms   250ms   300ms
         ┌──────────────┐
Panel A: │    slide     │
         └──────────────┘
              ┌──────────────┐
Panel B:      │    slide     │
              └──────────────┘
                   ┌──────────────┐
Panel C:           │    slide     │
                   └──────────────┘
```

**Use when:** Related elements should appear as a group but with visual rhythm (e.g., list items, sidebar icons, tab group transitions). Staggered motion creates a sense of "cascade" that feels natural and organic.

**Default stagger:** 50ms between each element. Maximum 8 staggered elements — beyond that, switch to Parallel.

### Parallel

Elements animate simultaneously with the same timing. No sequencing, no staggering — everything moves together.

```
Time →   0ms                    250ms
         ┌─────────────────────┐
Panel A: │       slide         │
         └─────────────────────┘
         ┌─────────────────────┐
Panel B: │       slide         │
         └─────────────────────┘
         ┌─────────────────────┐
Panel C: │       slide         │
         └─────────────────────┘
```

**Use when:** Elements are independent (e.g., unrelated panels, content and chrome), or when sequencing would feel unnecessarily slow.

**Rule:** Parallel animations must not create competing focal points. If three elements slide in from different directions simultaneously, the user's eye has nowhere to land. Prefer Parallel only when elements share a common direction or when one element is clearly the focal point.

### Orchestrated

Elements animate with carefully planned timing relationships — some sequential, some staggered, some parallel — coordinated by the motion service to create a coherent visual narrative.

```
Time →   0ms         100ms        200ms        300ms        400ms
         ┌──────────────────────────┐
Chrome:  │  fade in + slide         │
         └──────────────────────────┘
              ┌──────────────────────────────────┐
Content:      │  staggered items (3× 80ms apart) │
              └──────────────────────────────────┘
                                   ┌──────────────┐
Focus:                             │  gentle pulse │
                                   └──────────────┘
```

**Use when:** Complex layout changes involve multiple regions with different roles (e.g., opening a panel that triggers sidebar reflow, editor resize, and content load). Orchestrated is the most sophisticated choreography and is reserved for structural changes.

**Implementation:** The `ICinematicMotionService` manages an orchestration timeline, assigning each element a start delay, duration, and easing function that produces a harmonious composite.

### Silent

No visible animation. Elements appear or disappear instantly. Silent choreography is not the absence of motion design — it is a deliberate choice to suppress animation.

**Use when:**
- The user is typing in the editor (motion during typing is the cardinal sin)
- The user is actively scrolling
- The change is minor (a label update, a count increment)
- Performance is constrained (low-end device, many simultaneous changes)
- The user has disabled animations in accessibility settings

**Rule:** Silent is the fallback for all motion contexts when the system detects that animation would be distracting or harmful. It is always safe; animation is a privilege, not a right.

---

## Motion Weights

Every animation is assigned a weight that determines its duration, amplitude, and perceptual impact. Weight is not just about speed — it encodes the importance and structural significance of the transition.

| Weight | Duration Range | Amplitude | Easing | Perceptual Feel |
|---|---|---|---|---|
| **Light** | 100–200ms | Small (≤8px movement, ≤5% opacity change) | ease-out | Flicker, glance — barely registers consciously |
| **Medium** | 200–350ms | Moderate (8–24px, 5–20% opacity) | ease-in-out | Smooth, intentional — clearly visible but not attention-demanding |
| **Heavy** | 350–500ms | Large (24–80px, 20–60% opacity) | cubic-bezier(0.4, 0.0, 0.2, 1) | Weighted, structural — the user notices and registers the change |
| **Structural** | 500–800ms | Full (80px+, layout reflow) | cubic-bezier(0.4, 0.0, 0.2, 1) | Major — panel opens, layout reconfigures, viewport changes |

### Weight Assignment Rules

1. **Weight must match significance.** A tab switch is Light. A panel opening is Medium. A sidebar toggle is Heavy. A layout breakpoint change is Structural. Never use Structural weight for a tooltip appearing, and never use Light weight for a panel sliding in.

2. **Weight compounds with interruption.** If a Heavy animation is interrupted (e.g., user closes a panel that is still opening), the reversal uses Heavy weight as well — never lighter. The reversal should feel like the same physical event running backward.

3. **Weight is direction-aware.** Opening (expanding, appearing) and closing (collapsing, disappearing) can use different weights. Opening is typically one weight heavier than closing (the appearance of new content is more significant than the removal of old content).

4. **Weight is capped during user input.** When the user is typing, clicking rapidly, or scrolling, all motion weights are capped at Light. This is the motion silence rule — see below.

---

## Motion Contexts

A motion context is a named situation that determines which choreography type, motion weight, and specific timing values to use. The `ICinematicMotionService` resolves a motion context to a concrete animation specification.

| Context | Weight | Choreography | Duration | Easing | Notes |
|---|---|---|---|---|---|
| **PanelOpen** | Heavy | Orchestrated | 400ms | cubic-bezier(0.4, 0.0, 0.2, 1) | Panel slides + content staggers |
| **PanelClose** | Medium | Orchestrated | 300ms | cubic-bezier(0.4, 0.0, 0.2, 1) | Faster than open — removal should be swift |
| **TabSwitch** | Light | Parallel | 150ms | ease-out | Content cross-fades, tab indicator slides |
| **TabClose** | Light | Sequential | 200ms | ease-in | Content fades, adjacent tab slides in |
| **AISuggestionAppear** | Medium | Staggered | 300ms | ease-out | Suggestion cards stagger 50ms apart |
| **AISuggestionDismiss** | Light | Parallel | 150ms | ease-in | All suggestions fade simultaneously |
| **ExecutionEvent** | Light | Sequential | 200ms | ease-out | New event fades in at bottom |
| **SidebarSectionToggle** | Medium | Sequential | 250ms | ease-in-out | Header toggles, content expands below |
| **CommandPaletteOpen** | Medium | Orchestrated | 250ms | ease-out | Overlay fades, search input focuses |
| **CommandPaletteClose** | Light | Parallel | 150ms | ease-in | Overlay fades, focus returns |
| **EditorFocusGain** | Heavy | Orchestrated | 500ms | ease-in-out | Surrounding softens, editor amplifies |
| **EditorFocusLost** | Medium | Orchestrated | 350ms | ease-out | Surrounding restores |
| **BreakpointChange** | Light | Silent | 0ms | — | Instant — breakpoint state must feel immediate |
| **DiagnosticAppear** | Light | Sequential | 200ms | ease-out | Squiggle renders, tooltip available on hover |
| **LayoutReflow** | Structural | Orchestrated | 600ms | cubic-bezier(0.4, 0.0, 0.2, 1) | Full layout reconfiguration |
| **ThemeChange** | Structural | Silent | 0ms | — | Instant theme switch — no transition animation |
| **ToastNotification** | Medium | Staggered | 350ms | ease-out | Toast slides in, auto-dismisses after 4s |

---

## Default Motion Specs

Each motion context resolves to a concrete specification that animation engines consume directly.

```typescript
interface MotionSpec {
  duration: number;          // milliseconds
  delay: number;             // milliseconds before animation starts
  easing: EasingFunction;
  choreography: ChoreographyType;
  choreographyOffset: number; // ms between staggered/sequential elements
  interruptBehavior: 'reverse' | 'complete' | 'cut';
  respectReducedMotion: boolean; // Must be true for all non-essential animations
}
```

### Spec Resolution Examples

**PanelOpen (Heavy, Orchestrated)**
```typescript
{
  duration: 400,
  delay: 0,
  easing: cubicBezier(0.4, 0.0, 0.2, 1),
  choreography: 'orchestrated',
  choreographyOffset: 80,
  interruptBehavior: 'reverse',
  respectReducedMotion: true
}
```

**TabSwitch (Light, Parallel)**
```typescript
{
  duration: 150,
  delay: 0,
  easing: 'ease-out',
  choreography: 'parallel',
  choreographyOffset: 0,
  interruptBehavior: 'cut',
  respectReducedMotion: true
}
```

**ExecutionEvent (Light, Sequential)**
```typescript
{
  duration: 200,
  delay: 0,
  easing: 'ease-out',
  choreography: 'sequential',
  choreographyOffset: 50,
  interruptBehavior: 'complete',
  respectReducedMotion: true
}
```

---

## Motion Silence During Focus

Motion silence is the practice of suppressing all non-essential animation when the user is in a state of deep focus. This is the most important rule in the motion system.

### Silence Triggers

| Trigger | Silence Level | Effect |
|---|---|---|
| **User typing** | Full silence | All non-essential animations paused; essential state changes render instantly |
| **User scrolling** | Partial silence | No new animations triggered; in-progress animations complete at 2× speed |
| **Editor at Supreme weight** | Soft silence | Heavy and Structural animations reduced to Medium; Light animations unchanged |
| **Editor at Sacred weight** | Full silence | All animations suppressed except critical state changes (errors, crashes) |
| **User has `prefers-reduced-motion`** | Full silence | All animations respect the OS-level preference without exception |

### What Is "Essential" vs. "Non-Essential"

| Category | Essential? | Rationale |
|---|---|---|
| Error indicator appearing | Essential | User must see errors immediately |
| Build status change | Essential | User must know if build breaks |
| Panel open/close (user-initiated) | Essential | User triggered it — they expect feedback |
| AI suggestion appearing | Non-essential | Can be deferred until typing pause |
| Timeline event arriving | Non-essential | Can appear after focus state eases |
| Tab label update | Non-essential | Can update silently |
| Diagnostic squiggle | Essential | Must appear with the error |
| Cursor glow | Non-essential | Ambient effect, not information |

### Silence Duration

Motion silence is not permanent — it lifts when the trigger condition ends. After the user stops typing, a 500ms grace period allows the motion system to resume gradually. Animations that were suppressed during silence do not replay; they simply render in their final state.

---

## Velocity Continuity

Velocity continuity ensures that when a user performs the same action repeatedly (e.g., switching tabs rapidly), the motion system maintains a consistent and predictable rhythm rather than producing jarring speed changes.

### Continuity Rules

1. **Rapid repeated actions speed up naturally.** If the user switches tabs three times within 600ms, the animation duration decreases from 150ms → 100ms → 80ms. The motion accelerates to match the user's cadence.

2. **Deceleration is gradual.** After rapid interaction slows, animation durations return to their defaults over 2 seconds, not instantly. A sudden slowdown in animation speed after a burst of activity feels like the interface is lagging.

3. **Direction changes are smooth.** If the user opens a panel and immediately closes it, the close animation starts from the panel's current position — not from the fully-open position. The animation picks up where the previous one left off.

4. **Scroll momentum is preserved.** When a user scrolls the timeline or a sidebar rapidly, the scroll decelerates naturally with a physics-based momentum model. Sudden stops feel broken.

### Velocity Tracking

```typescript
interface VelocityTracker {
  // Record an interaction timestamp
  recordInteraction(context: MotionContext): void;

  // Get the current velocity multiplier for a context
  getVelocityMultiplier(context: MotionContext): number;

  // Reset velocity (e.g., after a period of inactivity)
  reset(): void;
}
```

The velocity multiplier ranges from 0.5 (slower than default — during delicate interactions) to 2.0 (faster than default — during rapid bursts). It decays back to 1.0 over 2 seconds of inactivity.

---

## Interruption Awareness

Animations are frequently interrupted — the user opens a panel and immediately closes it, switches tabs mid-transition, or triggers a layout reflow while a sidebar is still sliding. The motion system must handle these interruptions gracefully.

### Interruption Behaviors

| Behavior | Description | Use When |
|---|---|---|
| **Reverse** | The current animation reverses from its current state. The reversed animation uses the same duration and easing as the forward animation. | Panel open/close, sidebar toggle — physical, reversible actions |
| **Complete** | The current animation runs to completion instantly, then the new animation starts. | Sequential transitions where skipping would lose information |
| **Cut** | The current animation is abandoned instantly, and the new state renders immediately. | Tab switches, focus changes — the user's intent has moved on |

### Interruption Rules

1. **Never leave an element in a mid-animation state.** If an animation is interrupted, the element must end up in either its initial or final state — never somewhere in between.
2. **Reversals feel physical.** A panel that is 60% opened and then reversed should close from the 60% position, not jump to 100% and then close. The reversal should feel like throwing a physical object backward.
3. **Cut interruptions are instant.** No fade, no quick animation. If the user's intent has clearly moved on (tab switch, command palette dismiss), the old state vanishes and the new state appears.
4. **Chained interruptions are handled gracefully.** If a panel is reversing (from an interruption) and is interrupted again (to re-open), the animation reverses again from its current position. The motion system tracks state continuously.

---

## Anti-Patterns

### Gimmicky Motion

Animations that serve no perceptual purpose — bouncing tabs, spinning icons, particle effects on panel open, elastic spring physics on sidebar toggle. These animations are fun the first time and annoying the fiftieth time. Every animation in this system must answer the question: "What does this motion communicate that stillness cannot?" If the answer is "nothing," the animation should not exist.

### Excessive Movement

Too many elements moving simultaneously, or elements moving too far. A panel that slides in 200px when 80px would suffice. Three panels animating independently when one orchestrated motion would be clearer. Excessive movement overloads the user's visual tracking system and creates a sense of chaos rather than responsiveness.

### Motion During Typing

The cardinal sin. Any animation that occurs while the user is actively typing in the editor is a bug. Typing is the most focused activity in the IDE, and motion during typing steals cognitive resources from the user's primary task. The motion silence system exists specifically to prevent this. If a panel must open while the user is typing, it opens silently — no slide, no fade, just instant appearance.

### Uncoordinated Transitions

Two adjacent panels that slide in at slightly different speeds with different easing functions. A sidebar that opens in 300ms while the editor resizes in 500ms. A command palette that fades in while the status bar simultaneously slides out. Uncoordinated transitions create visual noise — the user's eye is pulled in multiple directions. Every composite transition must use a defined choreography type.

### Decorative Spring Physics

Spring-based animations on UI elements — bouncy panel opens, elastic tab switches, overshooting sidebar slides. Spring physics feel playful, not professional. They add 200–400ms of oscillation after every transition, which accumulates into noticeable latency over dozens of interactions. This system uses deterministic easing curves, not physics simulations. Predictable motion builds trust; unpredictable motion breaks it.

---

## Service Interface

```typescript
interface ICinematicMotionService {
  readonly _serviceBrand: undefined;

  // Resolve a motion context to a concrete spec
  resolveMotionSpec(context: MotionContext): MotionSpec;

  // Check if motion is currently silenced
  readonly isSilenced: boolean;
  readonly silenceLevel: MotionSilenceLevel;

  // Velocity tracking
  recordInteraction(context: MotionContext): void;
  getVelocityMultiplier(context: MotionContext): number;

  // Reduced motion preference
  readonly prefersReducedMotion: boolean;

  // Performance tier (affects animation complexity)
  readonly performanceTier: 'high' | 'medium' | 'low';

  // Observe silence state changes
  onDidChangeSilence: Event<MotionSilenceLevel>;

  // Observe performance tier changes
  onDidChangePerformanceTier: Event<PerformanceTier>;

  // Create an orchestrated animation group
  createOrchestration(specs: OrchestrationSpec[]): IOrchestrationController;
}

type MotionContext =
  | 'panel-open' | 'panel-close'
  | 'tab-switch' | 'tab-close'
  | 'ai-suggestion-appear' | 'ai-suggestion-dismiss'
  | 'execution-event'
  | 'sidebar-section-toggle'
  | 'command-palette-open' | 'command-palette-close'
  | 'editor-focus-gain' | 'editor-focus-lost'
  | 'breakpoint-change'
  | 'diagnostic-appear'
  | 'layout-reflow'
  | 'theme-change'
  | 'toast-notification';

type ChoreographyType = 'sequential' | 'staggered' | 'parallel' | 'orchestrated' | 'silent';
type MotionWeight = 'light' | 'medium' | 'heavy' | 'structural';
type MotionSilenceLevel = 'none' | 'partial' | 'soft' | 'full';
type PerformanceTier = 'high' | 'medium' | 'low';

interface MotionSpec {
  duration: number;
  delay: number;
  easing: EasingFunction;
  choreography: ChoreographyType;
  choreographyOffset: number;
  interruptBehavior: 'reverse' | 'complete' | 'cut';
  respectReducedMotion: boolean;
}

interface OrchestrationSpec {
  elementId: string;
  spec: MotionSpec;
  startDelay: number;
}

interface IOrchestrationController {
  start(): void;
  pause(): void;
  cancel(): void;
  readonly isRunning: boolean;
  readonly progress: number;  // 0.0–1.0
}
```

---

## Design Principles Summary

1. **Alive but disciplined.** The interface should feel responsive and intelligent, not rigid or mechanical. Motion gives life; discipline gives trust.
2. **Motion communicates.** Every animation answers a question: where did this come from? Where is it going? How does it relate to what was there before? If an animation doesn't communicate, it shouldn't exist.
3. **Silence is a feature.** The ability to suppress motion during focus states is not a limitation — it is the most important quality of a professional motion system.
4. **Coordination over chaos.** Multiple simultaneous animations must be choreographed, not coincidental. The motion system is a director, not a random event generator.
5. **Respect the user's cadence.** The motion system adapts to the user's interaction speed — accelerating during rapid input and decelerating gracefully during pauses. The interface follows the user's rhythm, not its own.
