# Design Token System

Complete token reference. Every value is the actual defined value.

## Spacing

| Token | Value | CSS Variable |
|-------|-------|-------------|
| xs    | 2px   | `--spacing-xs` |
| sm    | 4px   | `--spacing-sm` |
| md    | 8px   | `--spacing-md` |
| lg    | 12px  | `--spacing-lg` |
| xl    | 16px  | `--spacing-xl` |
| 2xl   | 20px  | `--spacing-2xl` |
| 3xl   | 24px  | `--spacing-3xl` |
| 4xl   | 32px  | `--spacing-4xl` |
| 5xl   | 40px  | `--spacing-5xl` |
| 6xl   | 48px  | `--spacing-6xl` |

## Typography

### Sizes

| Token | Value | CSS Variable |
|-------|-------|-------------|
| xs    | 11px  | `--font-size-xs` |
| sm    | 12px  | `--font-size-sm` |
| md    | 13px  | `--font-size-md` |
| base  | 14px  | `--font-size-base` |
| lg    | 16px  | `--font-size-lg` |
| xl    | 20px  | `--font-size-xl` |

### Weights

| Token    | Value | CSS Variable |
|----------|-------|-------------|
| regular  | 400   | `--font-weight-regular` |
| medium   | 500   | `--font-weight-medium` |
| semibold | 600   | `--font-weight-semibold` |

## Radius

| Token | Value | CSS Variable |
|-------|-------|-------------|
| xs    | 2px   | `--radius-xs` |
| sm    | 4px   | `--radius-sm` |
| md    | 6px   | `--radius-md` |
| lg    | 8px   | `--radius-lg` |

## Elevation

| Level | Value | CSS Variable | Usage |
|-------|-------|-------------|-------|
| 0     | none  | `--elevation-0` | Flat surfaces |
| 1     | subtle | `--elevation-1` | Cards, list items |
| 2     | medium | `--elevation-2` | Notifications, popovers |
| 3     | pronounced | `--elevation-3` | Dialogs, modals |

Elevation is expressed as `box-shadow` values:
- Level 1: `0 1px 3px rgba(0,0,0,0.12)`
- Level 2: `0 4px 12px rgba(0,0,0,0.16)`
- Level 3: `0 8px 24px rgba(0,0,0,0.24)`

## Motion

### Durations

| Token      | Value | CSS Variable |
|------------|-------|-------------|
| instant    | 0ms   | `--duration-instant` |
| fast       | 50ms  | `--duration-fast` |
| normal     | 100ms | `--duration-normal` |
| slow       | 150ms | `--duration-slow` |
| deliberate | 200ms | `--duration-deliberate` |
| exit       | 300ms | `--duration-exit` |

### Easings

| Token   | Value | CSS Variable |
|---------|-------|-------------|
| ease-in | `cubic-bezier(0.4, 0, 1, 1)` | `--ease-in` |
| ease-out | `cubic-bezier(0, 0, 0.2, 1)` | `--ease-out` |
| ease-in-out | `cubic-bezier(0.4, 0, 0.2, 1)` | `--ease-in-out` |

## Opacity

| Token | Value | Usage |
|-------|-------|-------|
| 0     | 0     | Hidden |
| 4     | 0.04  | Hover overlay |
| 8     | 0.08  | Selected background |
| 12    | 0.12  | Divider, border emphasis |
| 16    | 0.16  | Active background |
| 24    | 0.24  | Disabled background |
| 48    | 0.48  | Secondary disabled |
| 72    | 0.72  | Secondary text |
| 100   | 1.0   | Full opacity |

## Colors (Dark-First Palette)

| Token | Hex | CSS Variable | Usage |
|-------|-----|-------------|-------|
| bg-primary | `#1e1e2e` | `--color-bg-primary` | Main background |
| bg-secondary | `#181825` | `--color-bg-secondary` | Sidebar, panels |
| bg-surface | `#252536` | `--color-bg-surface` | Cards, inputs |
| bg-elevated | `#313147` | `--color-bg-elevated` | Popovers, dropdowns |
| text-primary | `#cdd6f4` | `--color-text-primary` | Primary text |
| text-secondary | `#a6adc8` | `--color-text-secondary` | Secondary text |
| text-muted | `#6c7086` | `--color-text-muted` | Disabled, placeholder |
| accent | `#89b4fa` | `--color-accent` | Primary accent |
| accent-hover | `#74c7ec` | `--color-accent-hover` | Accent hover state |
| success | `#a6e3a1` | `--color-success` | Success states |
| warning | `#f9e2af` | `--color-warning` | Warning states |
| error | `#f38ba8` | `--color-error` | Error states |
| border | `#45475a` | `--color-border` | Default borders |
| border-focus | `#89b4fa` | `--color-border-focus` | Focus ring |

## Density Modes

| Mode | Multiplier | Usage |
|------|-----------|-------|
| Compact | 0.8x | Dense information views |
| Balanced | 1.0x | Default |
| Spacious | 1.2x | Touch-friendly, presentations |

Density multipliers scale spacing and sizing tokens. Typography sizes are not scaled.

## Status

These tokens are defined in TypeScript. They are not yet injected into VS Code's CSS output at runtime. See professional-ui-system.md for details on what is and is not wired.
