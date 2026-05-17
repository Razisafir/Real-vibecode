# Signature Product Feel

> Phase 15 — Production Surface Rebuild
> The Emotional Identity of the Product

---

## Overview

The `ISignatureProductFeelService` governs the emotional identity of Real Vibecode — the composite, intangible quality that makes the product feel not just functional but *distinctive*. Feel is not a feature. It is not a color palette or a font choice. It is the emergent result of a thousand micro-decisions about how the product responds, moves, speaks, and occupies space. When every one of those decisions is made with the same philosophy, the product develops a signature feel — an identity that users recognize instinctively, even if they cannot articulate it.

This document codifies the philosophical framework behind that feel. It is not a list of pixel values (those live in the design system) or a set of motion curves (those live in the motion system). It is the *why* behind every *what*. Why does the editor dominate? Because focus is sacred. Why does the AI stay invisible? Because deference is respect. Why does motion feel weighted? Because physicality creates trust. Why does typography feel confident? Because precision creates authority.

The goal is singular: **when someone uses this product, they should instantly feel "This is different."** Not because it is flashy or novel or surprising, but because it is disciplined in ways that other products are not. It respects their attention, it honors their focus, it moves with calm purpose, and it never, ever wastes their time with noise.

---

## The 8 Feel Dimensions

The signature feel of Real Vibecode is defined by eight dimensions. Every visual, interaction, and behavioral decision must advance at least one dimension and violate none.

### 1. Intelligent

The product feels intelligent when it anticipates needs without being presumptuous, when it surfaces relevant information without being asked, and when it makes connections that the user didn't expect but immediately recognizes as valuable. Intelligence is not about showing how smart the system is — it is about making the user feel smart.

**How it manifests**: Contextual suggestions that arrive at the right moment. Error messages that include the fix, not just the problem. Keyboard shortcuts that are discoverable at the moment of need. An AI that understands what the user is trying to do, not just what they typed.

### 2. Calm

The product feels calm when it never startles, never rushes, and never creates urgency where none exists. Calm is not slow — it is unhurried. A calm product can be fast (instant response to a keystroke) while still feeling measured (a 250ms panel transition instead of a 100ms snap). Calm is the absence of anxiety in the interface.

**How it manifests**: No flashing elements. No pop-up surprises. No urgent color coding. Smooth transitions between states. Gentle enter and graceful exit animations. Error handling that is informative, not alarming.

### 3. Premium

The product feels premium when every surface, every transition, and every typographic choice communicates care and precision. Premium is not luxury — it is the absence of sloppiness. A premium product has no visual shortcuts, no placeholder states, no "good enough" spacing. Every pixel is intentional.

**How it manifests**: Consistent stroke weights on all icons. Typography that uses the defined scale without exception. Spacing that follows the rhythm system. Surfaces that have material depth (not flat, not skeuomorphic, but layered). No visual noise, no orphaned elements, no unpolished corners.

### 4. Focused

The product feels focused when the user's attention is always drawn to the right thing — the editor, the active task, the current context — and away from distractions. Focus is the product's most precious resource, and the interface must protect it with the same discipline that a library protects silence.

**How it manifests**: The editor occupies the dominant visual position at all times. Inactive surfaces soften. The AI does not insert itself into the user's peripheral vision. Panels push rather than overlay. Status indicators are subtle, not screaming.

### 5. Trustworthy

The product feels trustworthy when it is predictable, transparent, and honest. Trust is built when the product does exactly what the user expects, when it communicates its state clearly, and when it never hides information that the user might need. Trustworthiness is the foundation upon which all other dimensions rest.

**How it manifests**: No hidden states. No surprise behaviors. Clear indication of what the AI is doing and why. Explicit permission requests. Undo capability for every significant action. Consistent behavior across sessions.

### 6. Restrained

The product feels restrained when it uses less than it could — less motion, less color, less decoration, less density. Restraint is the discipline of choosing not to do something that you could do. It is the confidence to leave space empty, to let a single word do the work of a paragraph, to let stillness communicate more than animation.

**How it manifests**: One accent color, not five. One animation per state change, not three. One line of explanation, not three. Stillness as the default state. Motion only in response to interaction. Decorative elements only when they serve a functional purpose.

### 7. Deeply Capable

The product feels deeply capable when it can handle anything the user throws at it — complex codebases, multi-step refactors, ambiguous AI queries, large-scale operations — without breaking a sweat. Deep capability is not about showing off features; it is about the quiet confidence that the system has the depth to handle whatever comes next.

**How it manifests**: No visible performance limits. No arbitrary constraints on workspace size. AI that handles vague requests with grace. Error recovery that always has a path forward. Advanced features that exist but don't impose on beginners.

### 8. Respectful

The product feels respectful when it treats the user's time, attention, and autonomy as inviolable. It asks before acting. It explains when asked. It remembers preferences. It learns from dismissals. It never makes the same interruption twice. Respect is the product's relationship to the user — it is how the product behaves when the user is not watching.

**How it manifests**: No auto-opening panels. No unprompted AI suggestions. Clear dismissal paths. Preferences that persist. Error messages that never blame the user. Permission requests that explain the benefit, not just the requirement.

---

## Interaction Philosophy

The interaction philosophy defines how the product responds to user input. Every interaction — a click, a keystroke, a hover, a drag — must adhere to four principles:

### Confident Tone

The product responds with confidence. It does not hesitate, waver, or hedge. When the user clicks a button, the response is immediate and decisive. When the AI provides a suggestion, it is stated clearly, not hedged with qualifiers. Confidence creates trust; hesitation creates doubt.

### Immediate Response

Every user action receives an immediate visual response within 80ms (the `duration-instant` threshold). The response may be a subtle highlight, a ripple, or a state change, but it must occur fast enough to feel directly caused by the user's action. If the actual operation takes longer, the immediate response serves as a acknowledgment while the operation completes.

### Restrained Feedback

Feedback is proportional to the action. A button click produces a subtle highlight, not a dramatic animation. A successful save produces no animation at all (silence is the feedback for expected outcomes). Feedback is only dramatic when the outcome is unexpected or significant.

### Graceful Error Handling

Errors are handled with grace — calmly, informatively, and without blame. When something goes wrong, the product explains what happened in one clear sentence, offers a path forward, and never makes the user feel responsible for a system failure. Error states use the Reassuring tone from the Experience State Surface system.

---

## Transition Philosophy

Transitions are the product in motion. Every transition — a panel opening, a state changing, a surface appearing or disappearing — must adhere to four principles:

### Weighted Motion

All motion uses the weighted easing curve (`cubic-bezier(0.34, 1.56, 0.64, 1.0)`) as the default. This curve gives elements a sense of physical momentum — they arrive at their destination and settle, rather than decelerating to a stop. Weighted motion creates the impression that the interface has physicality, that it obeys intuitive rules of mass and momentum.

### Disciplined Style

Every transition follows the product's defined motion language: emerge for entrances, dissolve for exits, weighted easing for movements, standard easing for color changes. No transition uses a custom curve, a non-standard duration, or a novel choreography. Discipline creates consistency; consistency creates trust.

### Gentle Enter

Elements enter the view gently — emerging from slightly below with a subtle scale increase (0.97 → 1.0) and opacity fade (0 → 1.0) over 250ms. The entrance is noticeable enough to communicate the change but subtle enough not to startle. The user should perceive the entrance, not be interrupted by it.

### Graceful Exit

Elements leave the view gracefully — dissolving downward with a subtle scale decrease (1.0 → 0.97) and opacity fade (1.0 → 0) over 200ms. The exit is faster than the entrance (a well-established UX principle: exits should be 20-30% faster than entrances) because the user's attention has already moved on. The element should be gone before the user wonders why it's still there.

---

## Attention Philosophy

Attention is the product's most precious resource. The attention philosophy defines how the product allocates, protects, and prioritizes the user's visual focus.

### Editor-First Prioritization

The editor is always the primary visual element. It occupies the largest area, has the highest contrast, and receives the most visual weight. Every other surface — panels, sidebars, AI suggestions, status indicators — exists in service of the editor. When in doubt, the editor wins.

### Protective Interruption Policy

The product maintains a strict interruption policy that filters all notifications, suggestions, and AI communications through a priority system. Only Critical-priority interruptions can break through during deep or peak flow states. All other interruptions are deferred and batched for delivery when the user's flow intensity decreases.

### Deferred AI Presence

The AI does not insert itself into the user's attention unless the user explicitly requests it or the AI has a high-confidence, high-relevance suggestion. The AI's default visual state is invisible. It becomes visible when needed and returns to invisibility when no longer relevant. This is not hiding — it is respect for the user's focus.

---

## Workspace Philosophy

The workspace is the user's territory. The workspace philosophy defines how the product occupies and organizes the user's screen space.

### Sacred Spatial Feel

The editor space is sacred. It is the user's creative territory, and the product treats it with reverence. Panels push rather than overlay. The editor never shrinks below its minimum width. The combined width of all panels never exceeds 40% of the viewport. The editor is always visible, always accessible, always dominant.

### User Ownership

The workspace belongs to the user. The product does not rearrange, resize, or reorganize the workspace without explicit user action. Layout changes are always user-initiated. The product may suggest layout optimizations, but it never applies them automatically.

### Invisible-When-Possible Chrome

Chrome — the decorative and structural elements of the interface that are not content — should be invisible when possible. Scrollbars hide when not in use. Panel headers collapse when the panel is not focused. Status indicators minimize when the system is healthy. The goal is a workspace that feels like it contains only the user's content, with the interface receding into the background.

---

## AI Behavior Philosophy

The AI in Real Vibecode is a collaborator, not an assistant. The AI behavior philosophy defines how the AI presents itself and interacts with the user.

### Invisible Default

The AI's default state is invisible. It does not occupy a permanent panel, it does not show a persistent status, and it does not maintain a visible presence in the workspace. The AI becomes visible when the user invokes it or when it has something genuinely valuable to communicate, and it returns to invisibility when its relevance expires.

### Never-Uninvited Escalation

The AI never escalates its visual presence without the user's invitation. It does not expand from a dot to a panel on its own. It does not transition from a subtle indicator to a full suggestion without a user action. Every increase in the AI's visual footprint is either user-initiated or the result of an explicit, high-confidence, high-relevance trigger.

### Deferential Visual Tone

When the AI is visible, its visual tone is deferential. It uses softer colors, lower contrast, and smaller typography than the editor. It positions itself in the periphery, not the center. It communicates in concise statements, not paragraphs. The AI's visual presence always says "I am here to help, and I will step back when you no longer need me."

---

## Visual Pacing Philosophy

Visual pacing is the rhythm at which the product reveals information and changes state. The visual pacing philosophy ensures that the product never feels overwhelming, underwhelming, or inconsistent in its rate of change.

### Restrained Density

The product presents information at a restrained density — comfortable, not cramped. Every surface has breathing room. Every element has adequate spacing. The 1.2× breath multiplier ensures that the product never feels like it is trying to squeeze too much into too little space.

### Gradual Reveal

The product reveals complexity gradually. New features appear only when the user's experience level and trust score warrant them. Surfaces expand to show more detail only when the user requests it. The product never presents all its capabilities at once — it unfolds over time as the user grows more proficient.

### Maximum Restraint

When in doubt, the product chooses restraint. Fewer animations, not more. Less color, not more. Smaller surfaces, not larger. Shorter messages, not longer. The product's default answer to "should we add this?" is "no, unless it is essential." This is not minimalism for minimalism's sake — it is the discipline of earning every pixel, every motion, every moment of the user's attention.

---

## Service Interface

```typescript
interface ISignatureProductFeelService {
  // Evaluate the signature feel of a surface against the 8 dimensions
  evaluateFeel(surface: HTMLElement): FeelEvaluation;

  // Get the recommended interaction parameters for a given context
  getInteractionParameters(context: InteractionContext): InteractionParameters;

  // Get the recommended transition parameters for a given state change
  getTransitionParameters(change: StateChange): TransitionParameters;

  // Validate that the product feel is coherent across all visible surfaces
  validateFeelCoherence(): FeelCoherenceResult;
}
```

---

## Reference

- **Source**: `src/vs/workbench/services/productionSurface/common/productionSurface.ts`
- **Service**: `ISignatureProductFeelService` (DI singleton #49)
- **Enums**: `FeelDimension`, `InteractionTone`, `TransitionStyle`, `AttentionPriority`, `AiVisualTone`
- **Types**: `FeelEvaluation`, `InteractionParameters`, `TransitionParameters`, `FeelCoherenceResult`, `FeelDimensionScore`
