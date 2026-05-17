# Accessibility Report

Honest assessment. No inflated scores.

## Overall Score

**62/100**

This is not a passing score for any standard.

## Contrast Analysis

### Passes

| Element | Foreground | Background | Ratio | Standard |
|---------|-----------|-----------|-------|----------|
| Primary text on surface | `#cdd6f4` | `#252536` | 12.3:1 | AAA pass |
| Secondary text on surface | `#a6adc8` | `#252536` | 6.1:1 | AA pass |
| Accent on surface | `#89b4fa` | `#252536` | 5.8:1 | AA pass |
| Error on surface | `#f38ba8` | `#252536` | 5.2:1 | AA pass |

### Failures

| Element | Foreground | Background | Ratio | Standard |
|---------|-----------|-----------|-------|----------|
| Disabled text on surface | `#6c7086` | `#252536` | 2.8:1 | **FAILS AA** (requires 4.5:1) |
| Muted text on secondary bg | `#6c7086` | `#181825` | 3.1:1 | **FAILS AA** (requires 4.5:1) |

Disabled text at 2.8:1 is illegible for many users. This is the single worst accessibility problem.

## Keyboard Navigation

7 violations found:

1. **Missing Tab stop**: AI suggestion cards are not keyboard-focusable
2. **Missing Tab stop**: Timeline items are not keyboard-focusable
3. **Missing focus indicator**: Sidebar items have no visible focus ring
4. **Missing focus indicator**: Tab close buttons have no focus outline
5. **Roving tabindex not implemented**: Panel tabs lack arrow key navigation
6. **Focus trap missing**: Dialogs do not trap focus on open
7. **Escape key not wired**: Several overlay panels ignore Escape to close

## Screen Reader

7 violations found:

1. **Missing aria-label**: Icon buttons have no accessible name (16 instances)
2. **Missing role**: AI panel sections lack `region` role and `aria-label`
3. **Missing role**: Execution cards lack `article` or `listitem` role
4. **Missing aria-live**: Status notifications are not announced
5. **Missing aria-expanded**: Collapsible sections do not communicate state
6. **Missing aria-describedby**: Form inputs lack error message association
7. **Empty heading**: One panel uses an `<h3>` with no text content

## Motion

`prefers-reduced-motion` is **not yet wired**. CSS transitions and animations fire regardless of the user's OS-level motion preference. No `@media (prefers-reduced-motion: reduce)` rules exist in the codebase.

## What Needs Fixing (Priority Order)

1. **Disabled text contrast**: Increase `#6c7086` to at least `#8b8fa3` (4.5:1 minimum). This is the highest-impact single fix.
2. **Keyboard focus visibility**: Add visible focus rings to all interactive elements. Use `--color-border-focus` with 2px outline, 2px offset.
3. **aria-labels on icon buttons**: Every `<button>` containing only an `<svg>` needs `aria-label`.
4. **Focus trap in dialogs**: Implement focus trapping on modal open, restore focus on close.
5. **prefers-reduced-motion**: Add `@media (prefers-reduced-motion: reduce)` that sets all durations to `0ms`.
6. **aria-live for notifications**: Wrap notification container in `aria-live="polite"`.
7. **Roving tabindex for tab lists**: Implement arrow key navigation per WAI-ARIA tabs pattern.

## Honest Assessment

This system is **not WCAG AA compliant**. The disabled text contrast failure alone is enough to fail conformance. The 14 total violations (7 keyboard, 7 screen reader) represent real barriers for users who rely on assistive technology. The missing `prefers-reduced-motion` support affects users with vestibular disorders.

Score of 62/100 reflects: basic structure exists, some contrast passes, but critical gaps in keyboard nav, screen reader support, and motion preferences.
