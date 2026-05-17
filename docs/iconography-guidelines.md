# Iconography Guidelines

Technical reference for the Phase 23 icon system.

## Format

SVG only. No emoji. No icon fonts. No bitmap fallbacks.

## Stroke Width

All icons use **1.5px** stroke width. No exceptions.

## Sizes

| Size  | Pixel | Usage       |
|-------|-------|-------------|
| inline | 12px | Inline with text |
| default | 16px | Standard UI elements |
| prominent | 20px | Key actions |
| feature | 24px | Hero/feature areas |

Icons scale via `width`/`height` attributes on the `<svg>` element. The `viewBox` is always `0 0 16 16` regardless of rendered size.

## Categories

| Category   | Count | Examples |
|-----------|-------|---------|
| Action    | 16    | play, stop, save, delete, copy, paste, undo, redo, search, filter, sort, refresh, add, remove, edit, share |
| Navigation | 16   | arrow-up, arrow-down, arrow-left, arrow-right, chevron-up, chevron-down, chevron-left, chevron-right, home, back, forward, up, down, menu, close, expand |
| Status    | 9     | check, x, info, warning, error, loading, pending, complete, sync |
| File      | 8     | file, folder, folder-open, file-code, file-text, file-image, file-data, new-file |
| AI        | 8     | sparkles, brain, wand, chat, code-suggest, inline-edit, diff-apply, context |
| Execution | 7     | terminal, run, debug, step-over, step-into, step-out, breakpoint |
| Settings  | 6     | gear, slider, toggle, palette, keyboard, extensions |
| Alert     | 8     | bell, notification, badge, dot, flag, shield, lock, unlock |

Total: **86 icons**

## States

| State    | Visual treatment |
|----------|-----------------|
| Default  | Full opacity (1.0) |
| Hover    | Opacity 0.8 |
| Active   | Scale 0.95 |
| Disabled | Opacity 0.4 |
| Focus    | 1px outline, offset 2px, color `var(--focus-border)` |

States are applied via CSS. The icon SVG itself has no state logic.

## Accessibility

Every icon must have an `aria-label` on the parent element or the `<svg>` element itself. The label describes the action, not the visual. Example: `aria-label="Delete file"`, not `aria-label="Trash can icon"`.

Icons that are purely decorative use `aria-hidden="true"`.

## Banned

All emoji in UI contexts are banned. This includes but is not limited to:
- Status indicators (use Status icons instead)
- File type indicators (use File icons instead)
- Button labels (use Action icons + text instead)
- Navigation markers (use Navigation icons instead)

## Emoji-to-Icon Migration

| Emoji | Icon ID |
|-------|---------|
| ▶️ | `action-play` |
| ⏹️ | `action-stop` |
| ✅ | `status-complete` |
| ❌ | `status-error` |
| ⚠️ | `status-warning` |
| ℹ️ | `status-info` |
| 📁 | `file-folder` |
| 📄 | `file-text` |
| ⚙️ | `settings-gear` |
| 🔔 | `alert-bell` |
| 🧠 | `ai-brain` |
| ✨ | `ai-sparkles` |
| 🖥️ | `execution-terminal` |
| 🔒 | `alert-lock` |
| 🔓 | `alert-unlock` |
| 🏠 | `navigation-home` |
