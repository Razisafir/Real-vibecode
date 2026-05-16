# Editor Dominance Execution

> **Phase 15 — Production Surface Rebuild**
> Service: `IEditorDominanceService`

## Overview

The editor is the sovereign surface of the IDE. It is where the user thinks, creates, and spends the vast majority of their time. The `IEditorDominanceService` ensures the editor always owns the largest visual weight, that surrounding UI yields visually, and that inactive panels soften automatically. Every other surface in the workbench exists to serve the editor — never to compete with it.

The core principle is deceptively simple but profoundly impactful: the user must subconsciously feel **"This is my workspace"**, NOT **"This is the AI's workspace"** or **"This is a dashboard showing me things."** When the editor dominates, the user feels ownership. When the editor is visually contested, the user feels like a passenger in someone else's interface.

---

## Visual Weight Levels

The editor's visual dominance is quantified through weight levels that control how much of the viewport's perceptual "mass" the editor occupies. This is not just about pixel area — it includes background contrast, border treatment, surrounding softness, and ambient visual energy.

| Weight Level | Editor Viewport % | Surrounding Treatment | Use Case | Trigger |
|---|---|---|---|---|
| **Standard** | 65% | Normal — full UI visibility | Default editing, browsing files, casual work | Default state |
| **Dominant** | 75% | Soft — sidebars dim slightly | Active coding, focused implementation | File open + recent typing |
| **Supreme** | 90% | Quiet — sidebars fade to minimal | Deep focus, complex refactoring, debug stepping | Typing sustained 30s+ or explicit focus mode |
| **Sacred** | 97% | Invisible — all chrome recedes | Zen mode, distraction-free writing, flow state | User-triggered zen mode or auto-detected flow |

### Weight Calculation

The service continuously evaluates the editor's visual weight based on contextual signals:

```
weight = baseWeight
  + typingRecency * 0.15       // Recent keystrokes push toward Dominant
  + typingDuration * 0.10      // Sustained typing pushes toward Supreme
  + scrollActivity * 0.05      // Active scrolling adds moderate weight
  + debugActive * 0.10         // Debugging adds weight (editor is primary)
  - aiPanelOpen * 0.05         // AI panel presence slightly reduces weight
  - sidebarFocus * 0.08        // User clicking sidebar reduces weight
  - terminalFocus * 0.08       // User clicking terminal reduces weight
```

Weight transitions are gradual and animated using the Cinematic Motion System at `Heavy` weight with `Silent` choreography — the shift should be imperceptible in the moment but obvious in retrospect.

---

## Surrounding Softness

When the editor increases its visual weight, surrounding surfaces must yield. This yielding is not achieved by shrinking panels (though that happens at Supreme+) but by *softening* their visual presence — reducing contrast, dimming non-essential elements, and quieting visual energy.

| Softness Level | Sidebar Behavior | Bottom Panel | Activity Bar | Status Bar | Description |
|---|---|---|---|---|---|
| **Normal** | Full brightness, all icons visible, labels shown | Full brightness, all tabs visible | Full color, tooltips active | Full brightness, all indicators | All UI at full fidelity |
| **Soft** | Labels fade, icons dim 15%, section headers quiet | Tab text dims 10%, active tab only full | Icons dim 10%, active icon only full | Non-critical indicators dim | Subtle recession of supporting UI |
| **Quiet** | Icons dim 30%, labels hidden, sections collapsed | Only active tab visible, output dims 20% | Icons dim 25%, only active icon full | Only mode + language shown | Significant recession, editor visually expands |
| **Invisible** | Sidebars auto-hide, hover to reveal briefly | Panel auto-hides, terminal overlay only | Activity bar auto-hides | Minimal: mode + cursor position | Nearly full-screen editor |

### Softness Transition Rules

1. **Softness is progressive, not binary.** Transitions from Normal → Soft → Quiet → Invisible happen over 400–800ms with eased motion. Never jump between softness levels.
2. **Softness is reversible instantly.** If the user clicks a sidebar element while at Quiet, the sidebar reveals at full fidelity. The editor yields back to Standard/Dominant within 200ms.
3. **Softness never hides critical information.** At Quiet, the active file's path is still visible (in the title bar). At Invisible, the mode (Normal/Vim/Emacs) and cursor position remain. Error indicators are never dimmed below 50% — a squiggle in the gutter stays visible even in Sacred weight.
4. **Softness respects user overrides.** If a user has pinned a sidebar panel, it does not auto-quiet. If a user has locked the bottom panel visible, it does not auto-hide. User intent always overrides ambient intelligence.

---

## Contextual Fade System

The contextual fade system is the mechanism by which individual UI elements soften based on their relevance to the current editing context. Rather than treating entire panels as monoliths, the fade system operates at the element level.

### Fade Triggers and Effects

| Trigger | Effect on Unrelated Elements | Duration |
|---|---|---|
| **Cursor in function** | Other functions in outline dim 40% | While cursor remains |
| **Active breakpoint** | Non-breakpoint lines in gutter dim 20% | While debugging |
| **Error on line** | Other diagnostics soften; error stays full contrast | While error present |
| **AI generating** | AI indicators pulse softly; other indicators dim 15% | During generation |
| **Search active** | Non-matching lines in editor dim 30% | While search is open |

### Fade Implementation

Fades use CSS opacity transitions on element containers. The fade targets:
- **Opacity** — 0.3–0.7 for dimmed elements (never below 0.3 — everything must remain legible)
- **Saturation** — Dimmed elements lose 30–50% color saturation
- **Font weight** — Labels may transition from 400 to 300 weight when dimmed

Fades are always smooth (300ms ease-out). Instant dimming creates a jarring "spotlight" effect that is more distracting than helpful.

---

## Distraction Suppression

Distraction suppression is the proactive system that prevents visual interruptions from breaking the user's concentration. It governs which notifications appear, when animations trigger, and how status changes are communicated.

### Suppression Levels

| Level | Notifications | Animations | Status Changes | AI Suggestions |
|---|---|---|---|---|
| **None** | All shown | All active | All visible | Immediate display |
| **Gentle** | Non-critical queued | Reduced amplitude | Deferred 2s | Delayed 1.5s |
| **Moderate** | Errors only | Minimal | Deferred 5s | Delayed 3s |
| **Strict** | Critical only | Disabled | Deferred 10s | Delayed 5s, inline only |

Suppression level correlates with editor weight level:
- Standard → None
- Dominant → Gentle
- Supreme → Moderate
- Sacred → Strict

### Suppression Override

Critical events bypass suppression:
- Build errors
- Test failures
- Git merge conflicts
- Process crashes
- Explicit user requests (command palette, keyboard shortcut)

These events surface immediately regardless of suppression level, using a brief, high-contrast flash (200ms) on the relevant indicator, then settling to normal rendering.

---

## Focus Amplification

Focus amplification enhances the visual presence of the editor content the user is actively working with. It is the counterweight to surrounding softness — as peripheral UI recedes, focal content intensifies.

### Amplification Techniques

1. **Cursor glow** — A very subtle radial gradient behind the cursor line, 2–3% luminance lift, barely perceptible but adds a sense of "this line is alive"
2. **Active block highlight** — The current scope (function, class, block) receives a 1–2% luminance lift across its full height
3. **Minimap spotlight** — The minimap dims regions not near the viewport, creating a soft spotlight on the current position
4. **Bracket pair guides** — Active bracket pair guides render at full opacity; inactive pairs fade to 20%

### Amplification Rules

- Amplification effects are cumulative but capped. The maximum luminance lift from all amplification sources combined is 5%.
- Amplification is theme-aware. In light themes, amplification darkens slightly rather than brightening.
- Amplification is never colorful. No blue highlights, no green glow. Amplification is purely luminance-based.

---

## Edge Quieting

The boundaries of the editor region — the gutters, the minimap, the scrollbar — are treated with special care. These edges are where the editor meets other surfaces, and harsh edges here create the strongest visual tension.

### Edge Quiet Rules

1. **Gutter is part of the editor.** Line numbers and fold indicators share the editor's surface material. The gutter is not a separate panel — it is an extension of the editor surface.
2. **Minimap fades at edges.** The minimap's left and right edges fade to the editor background color over 8px, creating a soft merge rather than a hard cut.
3. **Scrollbar is ambient.** The scrollbar is visible at 15% opacity by default, rising to 40% on hover. It never uses a track — only the thumb exists, floating in the editor's visual space.
4. **No border on editor edges.** The editor has no border. Its edge is defined by the contrast between its surface and the adjacent panel's surface. If both surfaces are similar luminance, a 1px visual silence gap (see workbench-shell.md) provides separation.

---

## Ambient Hierarchy Adjustments

The editor's dominance is not static — it breathes with the user's activity. The ambient hierarchy system makes micro-adjustments to the visual weight balance based on real-time signals.

### Signal → Adjustment Map

| Signal | Adjustment | Magnitude |
|---|---|---|
| User types in editor | Shift weight +1 tier | Gradual over 30s |
| User switches tabs | Brief weight flash (Supreme for 500ms) | Instant, then decay |
| User opens sidebar panel | Shift weight −1 tier | Immediate |
| AI completes generation | AI result surfaces, editor yields briefly | 2s, then restore |
| Debug hits breakpoint | Editor stays dominant, panel reveals minimal | Targeted reveal |
| User idle 60s+ | Weight decays toward Standard | Gradual over 30s |
| Window focus lost | Weight freezes at current level | No change |
| Window focus regained | Weight resumes from frozen state | No change |

---

## Anti-Patterns

### AI Overdominance

When the AI panel occupies 40%+ of the viewport, uses bright accent colors, or displays animated generation indicators that draw the eye away from the editor. The AI surface must always defer to the editor. If the user's eye is drawn to the AI panel while coding, the layout has failed.

### Competing Panels

When the sidebar, bottom panel, and AI panel all demand equal visual attention. Each surface fights for the user's gaze with bright icons, active states, and notification badges. This creates the "dashboard feel" — the user becomes a spectator watching multiple streams of information rather than a creator working in a focused space.

### Dashboard Feel

The interface resembles a monitoring dashboard: metrics, status cards, activity feeds, and suggestion tiles all visible simultaneously. The editor is present but not dominant — one surface among many. This is the single most damaging anti-pattern for a code editor. The user must never feel like they are monitoring an interface; they must feel like they are working in a workspace.

### Sudden Weight Shifts

The editor weight jumps from Standard to Sacred in one frame. Sidebars vanish instantly. The status bar disappears. This startles the user and breaks trust. Weight transitions must be gradual and animated. Even in user-triggered zen mode, the transition to Sacred weight takes 600ms with a smooth ease.

---

## Service Interface

```typescript
interface IEditorDominanceService {
  readonly _serviceBrand: undefined;

  // Current visual weight level
  readonly currentWeight: EditorWeight;
  readonly weightValue: number;  // 0.0–1.0 continuous

  // Current surrounding softness
  readonly currentSoftness: SurroundingSoftness;

  // Distraction suppression level
  readonly suppressionLevel: SuppressionLevel;

  // Focus amplification state
  readonly amplificationActive: boolean;

  // Force a weight level (user override)
  setWeightOverride(weight: EditorWeight): IDisposable;

  // Observe weight changes
  onDidChangeWeight: Event<EditorWeight>;

  // Observe softness changes
  onDidChangeSoftness: Event<SurroundingSoftness>;

  // Query if an element should be faded in the current context
  shouldFade(element: FadableElement): FadeState;
}

type EditorWeight = 'standard' | 'dominant' | 'supreme' | 'sacred';
type SurroundingSoftness = 'normal' | 'soft' | 'quiet' | 'invisible';
type SuppressionLevel = 'none' | 'gentle' | 'moderate' | 'strict';
type FadeState = 'full' | 'dimmed' | 'minimal' | 'hidden';

interface FadableElement {
  region: string;
  relevance: number;  // 0–1, how relevant to current editing context
  isCritical: boolean;
}
```

---

## Design Principles Summary

1. **The editor is sovereign.** It is the reason the user opened the application. Every other surface exists to support it — never to compete with it.
2. **Yielding is graceful.** When surrounding UI softens, it does so gradually and reversibly. The user never feels trapped or deprived of information.
3. **Focus is amplified, not just preserved.** The editor doesn't just maintain its presence — it actively intensifies the content the user is working with.
4. **Distractions are suppressed, not eliminated.** Critical information always surfaces. Non-critical information is deferred, not deleted.
5. **The workspace belongs to the user.** The visual weight distribution must communicate user ownership, not AI assistance or system monitoring. The editor is the throne; everything else is court.
