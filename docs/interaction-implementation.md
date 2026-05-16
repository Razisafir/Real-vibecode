# Interaction Implementation

## Overview

Phase 24 implements CSS rules and HTML templates for interactive states: hover, focus, keyboard, loading, empty, error, and transitions.

## Hover

- Background shift: `var(--ai-surface-hover)` applied on `:hover`
- Transition: 50ms (`var(--ai-duration-fast)`)
- Scope: buttons, list items, tree items, menu items

## Focus

- Outline: 2px solid `#5b7fb5`
- Offset: 1px
- Pseudo-class: `:focus-visible` (not `:focus`)
- Scope: all interactive elements

## Keyboard

- **Tab order**: defined in component templates via `tabindex`
- **Enter/Space**: activation behavior specified in component specs
- **Escape**: dismiss behavior for overlays, popups, command palette
- Note: keyboard event handlers are specified but not yet bound to VS Code DOM elements

## Loading States

| State | Implementation | Duration |
|---|---|---|
| Skeleton | pulsing gradient animation | 1.5s cycle |
| Spinner | CSS rotation animation | 0.8s rotation |
| Progress | 2px height bar, width transition | variable |

```css
.ai-skeleton {
  background: linear-gradient(90deg, var(--ai-surface-base) 25%, var(--ai-surface-hover) 50%, var(--ai-surface-base) 75%);
  background-size: 200% 100%;
  animation: skeleton-pulse 1.5s ease-in-out infinite;
}

.ai-spinner {
  animation: spin 0.8s linear infinite;
}
```

## Empty States

Template: icon + title + description + action button

```html
<div class="ai-empty-state" role="status">
  <svg class="ai-empty-state__icon">...</svg>
  <h3 class="ai-empty-state__title">No results</h3>
  <p class="ai-empty-state__desc">Try adjusting your search</p>
  <button class="ai-btn">Clear filters</button>
</div>
```

## Error States

Template: error icon + title + description + retry button

```html
<div class="ai-error-state" role="alert">
  <svg class="ai-error-state__icon">...</svg>
  <h3 class="ai-error-state__title">Failed to load</h3>
  <p class="ai-error-state__desc">Check your connection</p>
  <button class="ai-btn">Retry</button>
</div>
```

## Transitions

| Type | Duration | Property |
|---|---|---|
| Slide | 200ms | `transform: translateY` |
| Fade | 150ms | `opacity` |

## Reduced Motion

All animations and transitions respect `@media (prefers-reduced-motion: reduce)`:

```css
@media (prefers-reduced-motion: reduce) {
  .ai-skeleton,
  .ai-spinner {
    animation: none;
  }
  .ai-slide,
  .ai-fade {
    transition: none;
  }
}
```

## Before / After

- **Before**: interaction specs were TypeScript definitions with no CSS output.
- **After**: interactions have real CSS rules and HTML templates that produce visible state changes.

## Limitation

CSS rules are generated but not applied to VS Code DOM elements. Interaction states (hover, focus, active) work in isolated render contexts but are not wired to actual VS Code panel interactions.
