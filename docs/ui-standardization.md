# UI Component Standards

Pixel-accurate specs for Phase 23 components. Every value is the actual defined spec.

## Component Specs

### Button
| Property | Value |
|----------|-------|
| Height | 28px |
| Radius | 4px (`--radius-sm`) |
| Font size | 13px (`--font-size-md`) |
| Font weight | 500 (`--font-weight-medium`) |
| Padding horizontal | 12px (`--spacing-lg`) |
| Padding vertical | 2px |
| States | Default, Hover, Active (3 total) |

### Panel
| Property | Value |
|----------|-------|
| Padding | 12px (`--spacing-lg`) |
| Radius | 6px (`--radius-md`) |
| Border | 1px solid `var(--color-border)` |
| Background | `var(--color-bg-surface)` |

### Dialog
| Property | Value |
|----------|-------|
| Width | 480px |
| Padding | 24px (`--spacing-3xl`) |
| Radius | 8px (`--radius-lg`) |
| Elevation | 3 (`--elevation-3`) |
| Background | `var(--color-bg-elevated)` |

### Input
| Property | Value |
|----------|-------|
| Height | 28px |
| Radius | 4px (`--radius-sm`) |
| Font size | 13px (`--font-size-md`) |
| Padding horizontal | 8px (`--spacing-md`) |
| Border | 1px solid `var(--color-border)` |
| Border focus | 1px solid `var(--color-border-focus)` |

### Tab
| Property | Value |
|----------|-------|
| Height | 32px |
| Font size | 13px (`--font-size-md`) |
| Padding horizontal | 12px (`--spacing-lg`) |
| Active indicator | 1px bottom border, `var(--color-accent)` |

### Sidebar
| Property | Value |
|----------|-------|
| Width | 240px |
| Background | `var(--color-bg-secondary)` |
| Border | 1px right, `var(--color-border)` |

### AI Panel
| Property | Value |
|----------|-------|
| Width | 320px |
| Padding | 12px (`--spacing-lg`) |
| Background | `var(--color-bg-surface)` |

### Execution Card
| Property | Value |
|----------|-------|
| Min-height | 64px |
| Radius | 6px (`--radius-md`) |
| Padding | 12px (`--spacing-lg`) |
| Border | 1px solid `var(--color-border)` |

### Timeline Item
| Property | Value |
|----------|-------|
| Min-height | 40px |
| Radius | 4px (`--radius-sm`) |
| Padding vertical | 8px (`--spacing-md`) |
| Padding horizontal | 12px (`--spacing-lg`) |

### Notification
| Property | Value |
|----------|-------|
| Min-height | 40px |
| Radius | 6px (`--radius-md`) |
| Elevation | 2 (`--elevation-2`) |
| Padding | 12px (`--spacing-lg`) |

## Known Inconsistencies

These are real deviations from the specs above that exist in the current codebase.

1. **Button height in Activity Bar**: uses 30px instead of 28px
2. **Input height in search**: uses 26px instead of 28px
3. **Dialog width on small screens**: falls back to 420px, not documented
4. **Sidebar width**: can be user-resized, 240px is default only
5. **AI Panel width**: overrides to 300px on viewports under 1024px
6. **Tab height in terminal**: uses 34px instead of 32px
7. **Panel radius in status bar**: uses 2px instead of 6px (intentional)
8. **Notification elevation**: some use elevation-1 instead of elevation-2
9. **Execution Card padding**: uses 16px on wide viewports instead of 12px
10. **Font size in sidebar labels**: uses 12px instead of 13px

## Status

These specs are defined in the service layer. They are not yet enforced at build time or runtime. Components that deviate from these specs do so without any warning or error.
