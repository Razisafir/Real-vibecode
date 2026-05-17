# Rendered Surface Rebuild

## Overview

Phase 24 rebuilds 7 UI surfaces with real CSS and HTML templates. Each surface now has concrete style rules and markup instead of TypeScript object specifications.

## Surface Definitions

### Sidebar

- Width: 240px
- Background: `var(--ai-surface-base)`
- Border: `1px solid` right edge
- Content area: scrollable, overflow-y auto
- Resizable: not yet (CSS only, no drag handler)

### Activity Bar

- Width: 48px
- Background: `var(--ai-surface-sunken)`
- Active indicator: 2px left accent bar (`var(--ai-accent-color)`)
- Items: 48x48px icon containers, centered

### AI Panel

- Width: 320px
- Message list: scrollable area, flex column
- Input area: fixed bottom, `var(--ai-surface-raised)` background
- Message items: `var(--ai-spacing-sm)` padding

### Timeline

- Item height: 40px
- Connection lines: 1px `var(--ai-border-subtle)`, vertical
- State dots: 8px circles, color-coded by status
- Indentation: 16px per nesting level

### Command Surface

- Background: overlay with `rgba(0, 0, 0, 0.5)`
- Elevation: level 3 (`box-shadow: 0 8px 24px rgba(0,0,0,0.4)`)
- Position: centered, max-width 600px

### Notifications

- Background: `var(--ai-surface-raised)`
- Elevation: level 2 (`box-shadow: 0 4px 12px rgba(0,0,0,0.3)`)
- Position: bottom-right, stacked with 8px gap

### Status Bar

- Height: 22px
- Font: `var(--ai-font-size-xs)` (11px)
- Background: `var(--ai-surface-sunken)`
- Items: inline-flex, horizontal layout

## Before / After

- **Before**: surface specs were TypeScript objects with layout descriptions. No CSS output.
- **After**: surfaces have real CSS rules and HTML template functions.

## Limitation

CSS and HTML are generated but not applied to actual VS Code panels. The surfaces are renderable in isolation (e.g. in a test page or webview) but are not wired into the VS Code workbench layout. VS Code's native panel structure is unchanged.
