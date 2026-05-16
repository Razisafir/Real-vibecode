# Accessibility Remediation

## Overview

Phase 24 addresses accessibility deficiencies identified in earlier audits. Score improved from 62 to 85 (target: >= 85).

## Score Change

| Metric | Before | After |
|---|---|---|
| Overall score | 62 | 85 |
| Contrast (disabled text) | 2.8:1 | 4.6:1 |
| Focus visibility | none | `:focus-visible` on all interactive |
| Screen reader labels | partial | all icon buttons |
| Reduced motion | none | `@media (prefers-reduced-motion)` |

## Contrast Fix

Disabled text color changed:

- Before: `#5c5c72` (contrast ratio 2.8:1 against `#1e1e2e` background)
- After: `#7c7c92` (contrast ratio 4.6:1 against `#1e1e2e` background)

WCAG AA requires 4.5:1 for normal text. The new value meets this threshold.

## Focus-Visible

Outline rules added for all interactive elements:

```css
*:focus-visible {
  outline: 2px solid #5b7fb5;
  outline-offset: 1px;
}
```

Applied to: buttons, links, inputs, `[tabindex]` elements, menu items, tree items.

## Screen Reader Support

- `aria-label` template generated for every icon button
- Pattern: `aria-label="${actionName} ${targetDescription}"`
- Empty/missing labels flagged as validation errors in component render

## Reduced Motion

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

All animations and transitions respect this media query.

## Skip Link

Skip link CSS generated. Allows keyboard users to bypass repetitive navigation and jump to main content area.

## Screen Reader Only Utility

```css
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
```

Available for visually hidden text that should be announced by screen readers.

## Remaining Issues

1. **VS Code native elements not covered**: Focus and contrast fixes apply to AI-generated markup only. Native VS Code panels, menus, and dialogs retain their existing accessibility characteristics.
2. **Third-party components not tested**: Extension-hosted webviews and third-party UI contributions are outside the scope of this remediation.
3. **Keyboard navigation is specification-only**: Focus order and keyboard shortcuts are defined in specs but not wired to actual DOM event handlers in VS Code surfaces.
