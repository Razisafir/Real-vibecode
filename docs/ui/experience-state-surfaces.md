# Experience State Surfaces

> Phase 15 — Production Surface Rebuild
> Premium Empty, Loading, Error, and Transition States

---

## Overview

The `IExperienceStateSurfaceService` governs every surface that the user encounters when the IDE is not in its primary productive state — when panels are empty, content is loading, connections have failed, permissions are missing, or onboarding is in progress. These states are among the most emotionally impactful moments in the product. A clumsy loading spinner, an aggressive error box, or a hollow empty state can shatter the calm, confident tone that the rest of the product works so hard to establish.

Every experience state surface must feel like a natural, considered part of the product — not an afterthought, not a developer placeholder, not a stock illustration dumped into a blank space. The empty state of a panel is not "nothing." It is an opportunity to communicate tone, reinforce trust, and guide the user forward with intelligence and restraint. The loading state is not a waiting period. It is a moment of calm reassurance that the system is working on the user's behalf. The error state is not a crisis. It is a gentle, respectful conversation about what happened and what comes next.

This service ensures that every non-primary surface in Real Vibecode feels intentional, premium, and emotionally consistent with the product's core identity: calm, intelligent, and deeply capable.

---

## State Types

### 1. Empty State

The empty state appears when a panel, list, or surface has no content to display. This is the most common non-primary state and therefore the one that most strongly communicates the product's emotional identity.

**Design requirements**: The empty state must feel inviting rather than hollow. It should communicate what the surface is for, suggest a first action, and do so with minimal visual weight. Never use a giant question mark, a dramatic illustration of emptiness, or a sarcastic message. The tone is always Calm or Guiding.

**Default content**: A single subtle icon (see illustration types below), one line of descriptive text in Body typography, and an optional inline action link. No buttons, no card containers, no bordered boxes. The empty state lives within its parent surface, breathing the same air.

### 2. Loading State

The loading state appears when content is being fetched, computed, or streamed. It communicates that the system is actively working and the user should expect content shortly.

**Design requirements**: The loading state must feel reassuring rather than anxious. It should never use a dramatic progress bar, a pulsing overlay, or a full-surface spinner. The preferred animation is a subtle shimmer across the content skeleton, which communicates activity without demanding attention. The tone is always Calm or Minimal.

**Default content**: A content skeleton (see below) with subtle-shimmer animation, or a small inline loading indicator at the top of the surface. Never a centered spinner with "Loading..." text. The skeleton should approximate the shape and density of the expected content.

### 3. Skeleton State

The skeleton state is a refined variant of the loading state that shows placeholder shapes matching the expected content layout. Skeletons are used when the content structure is predictable and the user benefits from seeing the spatial arrangement before content arrives.

**Design requirements**: Skeleton shapes must use the same spacing and layout as the actual content. Skeleton colors must use `SurfaceTertiary` (not a random gray) with a subtle-shimmer animation. Skeleton shapes must never exceed the dimensions of the real content they replace. The tone is always Minimal.

**Default content**: Rounded rectangles matching the dimensions and positions of text blocks, avatars, and action areas. Each skeleton element has a 200ms stagger delay for the shimmer animation, creating a gentle wave effect.

### 4. Reconnecting State

The reconnecting state appears when the IDE has lost connection to a service (AI backend, file system watcher, terminal process) and is actively attempting to restore the connection.

**Design requirements**: This state must feel temporary and non-alarming. It should communicate that reconnection is in progress without suggesting that something has gone catastrophically wrong. The tone is always Reassuring. Never use red, never use exclamation marks, never use the word "Error" or "Failure." Use language like "Reconnecting..." or "Restoring connection..."

**Default content**: A small inline indicator with a gentle-pulse animation, positioned at the top or bottom of the affected surface. One line of reassuring text. An estimated retry countdown if available. No modal, no overlay, no full-surface takeover.

### 5. Failure State

The failure state appears when an operation has definitively failed and cannot be retried automatically. This is the most sensitive state because it risks triggering anxiety or frustration.

**Design requirements**: The failure state must feel informative and empowering, not punitive. It should explain what happened in one clear sentence, offer a next action, and never assign blame to the user. The tone is always Reassuring or Guiding. Never use harsh red backgrounds, large warning icons, or urgent language. Use `StatusErrorSubtle` for the accent, never `StatusError` at full saturation.

**Default content**: A small icon (subtle-icon type), one line of explanation text, and a single action link (e.g., "Try again", "View details", "Open settings"). No stacked buttons, no multi-paragraph explanations, no stack traces visible by default.

### 6. Offline State

The offline state appears when the IDE detects that network connectivity is unavailable. Unlike the reconnecting state, this state acknowledges that the user is intentionally or unavoidably disconnected.

**Design requirements**: The offline state must feel informative and calm, not restrictive. It should communicate which features are affected and which continue to work. The tone is Calm or Reassuring. Never use the word "Disconnected" in isolation — pair it with reassurance like "Local editing continues" or "Your work is saved locally."

**Default content**: A status bar or header indicator with a subtle icon, a one-line message, and optionally a list of affected features. Features that continue to work should be mentioned positively. The indicator uses gentle-pulse animation to show the state is being monitored.

### 7. Onboarding State

The onboarding state appears within a surface that is introducing the user to a new feature or workflow. It is the most content-rich of the experience states, but must still respect density constraints.

**Design requirements**: The onboarding state must feel Guiding and Reassuring. It should explain what the surface does, why it matters, and how to start. It must introduce no more than one concept per surface. Illustrations or icons should be subtle-icon type. The tone is always Guiding.

**Default content**: A subtle icon, a title in Subtitle typography, one to two lines of explanation in Body typography, and a single primary action. No feature lists, no multiple call-to-action buttons, no dismissible tips that reappear.

### 8. Permission State

The permission state appears when a feature requires a permission that has not been granted (e.g., file system access, terminal execution, remote connection).

**Design requirements**: The permission state must feel transparent and respectful, not demanding. It should explain why the permission is needed and what the user gains by granting it. The tone is Calm or Guiding. Never use urgency, never imply the user is doing something wrong by not granting permission.

**Default content**: A subtle icon, one line explaining the permission, one line explaining the benefit, and a single action to grant. No pressure language, no "required" labels, no countdown timers.

---

## Tone Options

Every experience state selects a tone that governs its messaging, visual weight, and animation intensity:

| Tone | Description | When to Use |
|------|-------------|-------------|
| **Calm** | Neutral, understated, present but not demanding. Minimal animation, soft colors, quiet typography. | Loading, Empty, Offline — states that are expected and non-urgent. |
| **Reassuring** | Warm, supportive, explicit about positive outcomes. Slightly more visual presence than Calm, but still restrained. | Reconnecting, Failure, Permission — states that risk anxiety and need to counteract it. |
| **Guiding** | Helpful, directional, action-oriented. Clearer visual hierarchy, more prominent action elements. | Onboarding, Empty (with obvious next step) — states where the user needs direction. |
| **Minimal** | Almost invisible. The lightest possible visual treatment. No illustrations, no animation, just the faintest signal. | Skeleton, Loading (when content is expected within 500ms) — states where the user barely notices the transition. |

Tone selection is automatic based on state type but can be overridden by the surface owner. The service validates that tone overrides are appropriate and flags aggressive tone escalations (e.g., using Guiding tone for a Loading state).

---

## Illustration Types

| Type | Description | When to Use |
|------|-------------|-------------|
| **subtle-icon** | A small, single-color icon rendered at Standard (16px) or Medium (20px) size, using the surface's tertiary text color. No background, no container, no decoration. | Empty, Onboarding, Permission — states that benefit from a visual anchor. |
| **abstract** | A minimal geometric pattern or shape that evokes the surface's purpose without depicting specific objects. Always monochromatic, always using the surface's subtle accent color. | Empty (creative surfaces), Onboarding (first-time discovery) — used sparingly and only when approved by the design system. |
| **none** | No illustration at all. The state communicates entirely through typography and spacing. | Loading, Skeleton, Reconnecting, Offline, Failure — states where illustration would add noise without value. |

---

## Animation Types

| Type | Description | Duration | When to Use |
|------|-------------|----------|-------------|
| **gentle-pulse** | A slow, barely perceptible opacity oscillation between 0.5 and 0.7 on the state's icon or indicator. Cycle: 2 seconds. | Continuous | Reconnecting, Offline — states that indicate monitoring or ongoing background activity. |
| **subtle-shimmer** | A horizontal gradient sweep across skeleton elements, moving from transparent to `SurfaceTertiary` to transparent. Speed: 1.5s per sweep. | Continuous | Skeleton, Loading — states where content is expected shortly and the user benefits from a sense of motion. |
| **none** | No animation. The state is completely still, communicating through typography and layout alone. | N/A | Empty, Failure, Onboarding, Permission — states where animation would distract or feel patronizing. |

---

## Typography Hierarchy

Experience state typography follows the product's standard typography scale with specific role assignments:

| Role | Size | Weight | Color Token | Usage |
|------|------|--------|-------------|-------|
| State Title | Subtitle (16px) | SemiBold (600) | `TextSecondary` | Primary message ("No results found", "Reconnecting...") |
| State Body | Body (13px) | Regular (400) | `TextTertiary` | Explanation or context ("We'll restore your session shortly") |
| State Action | BodyLg (14px) | Medium (500) | `AccentPrimary` | Action link ("Try again", "Get started") |
| State Meta | BodySm (12px) | Regular (400) | `TextDisabled` | Supplementary information ("Last connected 2 min ago") |

All state text must be centered within the surface's content area. The vertical rhythm is: icon (if present) → 12px gap → Title → 8px gap → Body → 12px gap → Action → 8px gap → Meta. No element should be more than `maxWidth: 320px` wide, centered.

---

## Anti-Patterns

The following patterns are strictly forbidden in experience state surfaces. These represent the most common ways that non-primary states degrade product quality and violate the emotional identity:

1. **Giant warning boxes**: Never use large, bordered, brightly colored containers for any state. Error states do not need a red box. Empty states do not need a dashed border. The state surface is part of its parent — it should not visually secede from it.

2. **Aggressive red overload**: Never use full-saturation red (`StatusError`) for failure or error states. Always use the subtle variant (`StatusErrorSubtle`). Red should appear only in the smallest possible accent — an icon dot, a text underline — never as a background fill or border color.

3. **Toy-like placeholders**: Never use cartoon illustrations, emoji, or playful icons in any state. The product is a professional creative tool. A whimsical illustration of a broken robot or a sad face undermines the seriousness of the user's work and the trustworthiness of the product.

4. **Harsh interruption energy**: Never use blinking, flashing, or rapidly oscillating animations in any state. The gentle-pulse is the most aggressive animation allowed, and it is deliberately slow (2-second cycle). No state should make the user feel urgency, panic, or pressure.

---

## Service Rules

The `IExperienceStateSurfaceService` enforces six rules that govern all experience state surfaces:

1. **Premium typography**: Every state uses the product's typography scale. No state uses a font size, weight, or line height outside the defined scale. Typography is the primary communication vehicle — it must be impeccable.

2. **Calm messaging**: All state text is written in calm, neutral language. No exclamation marks, no all-caps, no urgent words ("URGENT", "CRITICAL", "MUST"). State messages are conversational and respectful.

3. **Minimal noise**: Every state communicates the minimum necessary information. If the state can be understood with one line instead of three, use one line. If the state can function without an icon, omit the icon. Less is always more.

4. **Intelligent guidance**: When a state presents an action, that action must be the single best next step the user can take. Never present multiple equivalent actions. Never present actions that the user cannot complete. Guidance is intelligent when it is specific, contextual, and singular.

5. **Graceful degradation**: When a state cannot display its full content (e.g., the surface is too narrow for the title and body), it degrades gracefully — truncating body text before title, collapsing meta before action, never overflowing or breaking layout.

6. **Zero harsh interruption energy**: No experience state may cause a visual discontinuity that disrupts the user's flow. States transition in using the product's standard emerge animation (250ms, weighted easing). States transition out using the dissolve animation (200ms, standard easing). No state appears or disappears instantaneously.

---

## Service Interface

```typescript
interface IExperienceStateSurfaceService {
  // Render a state surface within a given container
  renderState(container: HTMLElement, config: ExperienceStateConfig): IDisposable;

  // Compute the optimal tone for a given state type and context
  resolveTone(stateType: ExperienceStateType, context: ActivityContext): ExperienceTone;

  // Validate a state configuration against all rules
  validateConfig(config: ExperienceStateConfig): ValidationResult;

  // Get the default design for a given state type
  getDefaultDesign(stateType: ExperienceStateType): ExperienceStateDesign;
}
```

---

## Reference

- **Source**: `src/vs/workbench/services/productionSurface/common/productionSurface.ts`
- **Service**: `IExperienceStateSurfaceService` (DI singleton #46)
- **Enums**: `ExperienceStateType`, `ExperienceTone`, `IllustrationType`, `AnimationType`
- **Types**: `ExperienceStateConfig`, `ExperienceStateDesign`, `ExperienceStateTypography`
