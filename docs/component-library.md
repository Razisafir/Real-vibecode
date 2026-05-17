# Component Library

## Overview

Phase 24 generates 10 UI components with real HTML templates, CSS rules, and design token references. Each component is a template generator that produces markup and styles on demand.

## Component List

| Component | Purpose | Key Tokens Used |
|---|---|---|
| Button | Primary/action buttons | `--ai-spacing-*`, `--ai-radius-*`, `--ai-duration-*` |
| IconButton | Icon-only action buttons | `--ai-spacing-*`, `--ai-radius-*` |
| Panel | Container with header/body | `--ai-surface-*`, `--ai-spacing-*` |
| Surface | Background container | `--ai-surface-*`, `--ai-radius-*` |
| StatusBadge | Status indicator dot + label | `--ai-opacity-*`, `--ai-radius-*` |
| InlineNotice | Inline info/warning/error | `--ai-surface-*`, `--ai-spacing-*` |
| EmptyState | Empty content placeholder | `--ai-spacing-*`, `--ai-font-*` |
| LoadingState | Loading indicator | `--ai-duration-*`, `--ai-opacity-*` |
| CommandInput | Text input with icon | `--ai-surface-*`, `--ai-spacing-*` |
| TimelineCard | Timeline event entry | `--ai-spacing-*`, `--ai-radius-*` |

## Structure

Each component consists of:

1. **HTML template function**: returns an HTML string with proper semantic elements
2. **CSS rules**: scoped styles referencing `var(--ai-*)` tokens
3. **Token references**: all visual properties use design tokens, no hardcoded values

Example (Button):

```js
Button.render({ label: 'Submit', variant: 'primary' })
// Returns: <button class="ai-btn ai-btn--primary" aria-label="Submit">Submit</button>
```

```css
.ai-btn {
  padding: var(--ai-spacing-sm) var(--ai-spacing-md);
  border-radius: var(--ai-radius-md);
  transition: background var(--ai-duration-fast);
}
```

## Accessibility

- All components include `aria-label` on interactive elements
- Keyboard support: Tab navigation, Enter/Space activation, Escape dismissal
- Focus-visible styles via `:focus-visible` pseudo-class
- StatusBadge uses `role="status"` with `aria-live="polite"`

## Before / After

- **Before**: component specs existed as TypeScript interfaces with no markup or styles.
- **After**: components have real HTML templates and CSS rules that use design tokens.

## Limitation

Components are template generators. They produce HTML strings and CSS rules but are not yet instantiated in the VS Code DOM. No component is wired to an actual VS Code panel, view, or extension host surface. Rendering a component produces output that could be injected, but the injection points do not exist yet.
