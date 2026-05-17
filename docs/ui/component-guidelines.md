# Component Guidelines

> Phase 12 — Real Vibecode AI-Native IDE
> Component System Design Tokens and Guidelines

All components must use design tokens exclusively. No raw hex colors, no arbitrary pixel values, no undefined elevations. Every visual property of every component traces back to a token in the design system.

---

## Table of Contents

1. [Component Token Philosophy](#component-token-philosophy)
2. [Button System](#button-system)
3. [Panel System](#panel-system)
4. [Input System](#input-system)
5. [Sidebar System](#sidebar-system)
6. [Status Indicators](#status-indicators)
7. [AI-Specific Tokens](#ai-specific-tokens)
8. [Interaction States](#interaction-states)
9. [Icon System](#icon-system)
10. [Component Token Resolution](#component-token-resolution)

---

## Component Token Philosophy

### Core Principle

Every component property that affects visual appearance must reference a design token:

- **Colors** → `ColorToken` enum values
- **Spacing** → `Spacing` enum values
- **Typography** → `TypographySize` + `FontWeight` + `LineHeight` enum values
- **Elevation** → `Elevation` enum values
- **Motion** → `MotionDuration` + `MotionEasing` enum values

### Token Resolution Flow

```
Component Code
    ↓
designSystem.getButtonTokens(variant, size)
    ↓
IButtonTokens (all ColorToken, Spacing, TypographySize references)
    ↓
designSystem.resolveColor(token) → hex value
designSystem.getSpacing(token) → pixel value
    ↓
Applied to DOM element
```

### Why Not Raw Values?

```typescript
// This creates a maintenance nightmare:
button.style.backgroundColor = '#6366F1';  // What theme? What variant?
button.style.padding = '8px 16px';          // What spacing scale?

// This is maintainable and theme-aware:
const tokens = designSystem.getButtonTokens(ButtonVariant.Primary, ButtonSize.Md);
button.style.backgroundColor = designSystem.resolveColor(tokens.backgroundColor);
button.style.padding = `${designSystem.getSpacing(tokens.paddingY)}px ${designSystem.getSpacing(tokens.paddingX)}px`;
```

---

## Button System

### Button Variants (4)

| Variant | Enum | Purpose | Visual Character |
|---------|------|---------|-----------------|
| Primary | `ButtonVariant.Primary` | Primary actions (Run, Execute, Save) | Filled accent background |
| Secondary | `ButtonVariant.Secondary` | Secondary actions (Cancel, Dismiss) | Outlined with border |
| Ghost | `ButtonVariant.Ghost` | Tertiary actions (toolbar buttons) | No background, text only |
| Danger | `ButtonVariant.Danger` | Destructive actions (Delete, Remove) | Filled error color |

### Button Sizes (3)

| Size | Enum | Height | Padding X | Padding Y | Font Size |
|------|------|--------|-----------|-----------|-----------|
| Small | `ButtonSize.Sm` | 28px | `Spacing.Sm` (8px) | `Spacing.Xs` (4px) | `TypographySize.BodySm` (12px) |
| Medium | `ButtonSize.Md` | 32px | `Spacing.Md` (16px) | `Spacing.Sm` (8px) | `TypographySize.Body` (13px) |
| Large | `ButtonSize.Lg` | 40px | `Spacing.Lg` (24px) | `Spacing.MdSm` (12px) | `TypographySize.BodyLg` (14px) |

### Button Token Matrix (IButtonTokens)

#### Primary Button

| Size | Background | Text | Border | Hover BG | Active BG | Elevation |
|------|-----------|------|--------|----------|-----------|-----------|
| Sm | `AccentPrimary` | `TextInverted` | `AccentPrimary` | `AccentStrong` | `AccentMuted` | `Level0` |
| Md | `AccentPrimary` | `TextInverted` | `AccentPrimary` | `AccentStrong` | `AccentMuted` | `Level0` |
| Lg | `AccentPrimary` | `TextInverted` | `AccentPrimary` | `AccentStrong` | `AccentMuted` | `Level1` |

#### Secondary Button

| Size | Background | Text | Border | Hover BG | Active BG | Elevation |
|------|-----------|------|--------|----------|-----------|-----------|
| Sm | `SurfacePrimary` | `TextPrimary` | `BorderDefault` | `SurfaceHover` | `SurfaceActive` | `Level0` |
| Md | `SurfacePrimary` | `TextPrimary` | `BorderDefault` | `SurfaceHover` | `SurfaceActive` | `Level0` |
| Lg | `SurfacePrimary` | `TextPrimary` | `BorderDefault` | `SurfaceHover` | `SurfaceActive` | `Level0` |

#### Ghost Button

| Size | Background | Text | Border | Hover BG | Active BG | Elevation |
|------|-----------|------|--------|----------|-----------|-----------|
| Sm | transparent | `TextSecondary` | transparent | `SurfaceHover` | `SurfaceActive` | `Level0` |
| Md | transparent | `TextSecondary` | transparent | `SurfaceHover` | `SurfaceActive` | `Level0` |
| Lg | transparent | `TextSecondary` | transparent | `SurfaceHover` | `SurfaceActive` | `Level0` |

#### Danger Button

| Size | Background | Text | Border | Hover BG | Active BG | Elevation |
|------|-----------|------|--------|----------|-----------|-----------|
| Sm | `StatusError` | `TextInverted` | `StatusError` | `StatusError` | `StatusError` | `Level0` |
| Md | `StatusError` | `TextInverted` | `StatusError` | `StatusError` | `StatusError` | `Level0` |
| Lg | `StatusError` | `TextInverted` | `StatusError` | `StatusError` | `StatusError` | `Level1` |

### Button Border Radius

| Size | Border Radius |
|------|--------------|
| Sm | 4px |
| Md | 6px |
| Lg | 8px |

### Button Font Weight

All button variants use `FontWeight.Medium` (500).

### Button Interaction States

| State | Duration | Easing |
|-------|----------|--------|
| Hover enter | `MotionDuration.Fast` (100ms) | `MotionEasing.Default` |
| Hover exit | `MotionDuration.Fast` (100ms) | `MotionEasing.Default` |
| Active (press) | Immediate | — |
| Focus outline | `MotionDuration.Fast` (100ms) | `MotionEasing.Default` |

### Button Rules

1. **Only one Primary button** per panel/section
2. **Danger buttons** must have a confirmation step for irreversible actions
3. **Ghost buttons** must have a visible hover state
4. **Disabled buttons** use `TextDisabled` + `BorderSubtle` + no interaction states
5. **Icon buttons** use Ghost variant by default

---

## Panel System

### Panel Variants (4)

| Variant | Enum | Elevation | Shadow | Usage |
|---------|------|-----------|--------|-------|
| Flat | `PanelVariant.Flat` | `Level0` | none | Inline panels, tab content |
| Raised | `PanelVariant.Raised` | `Level1` | subtle | Cards, dropdown content |
| Elevated | `PanelVariant.Elevated` | `Level2` | medium | Popovers, floating panels |
| Overlay | `PanelVariant.Overlay` | `Level3` | heavy | Modals, dialogs |

### Panel Tokens (IPanelTokens)

#### Flat Panel

| Property | Token | Value |
|----------|-------|-------|
| Background | `SurfacePrimary` | Theme-dependent |
| Border | `BorderDefault` | Theme-dependent |
| Border Radius | 0px | Flat panels have no radius |
| Padding | `Spacing.Md` (16px) | Body padding |
| Elevation | `Level0` | No shadow |
| Header Font Size | `TypographySize.Subtitle` | 16px |
| Header Font Weight | `FontWeight.SemiBold` | 600 |
| Header Padding | `Spacing.Md` (16px) | Header vertical padding |
| Body Padding | `Spacing.Md` (16px) | Body padding |

#### Raised Panel

| Property | Token | Value |
|----------|-------|-------|
| Background | `SurfacePrimary` | Theme-dependent |
| Border | `BorderSubtle` | Theme-dependent |
| Border Radius | 6px | Slight rounding |
| Padding | `Spacing.Md` (16px) | Body padding |
| Elevation | `Level1` | Subtle shadow |
| Header Font Size | `TypographySize.Subtitle` | 16px |
| Header Font Weight | `FontWeight.SemiBold` | 600 |
| Header Padding | `Spacing.MdLg` (20px) | More generous header |
| Body Padding | `Spacing.Md` (16px) | Body padding |

#### Elevated Panel

| Property | Token | Value |
|----------|-------|-------|
| Background | `BackgroundElevated` | Theme-dependent |
| Border | `BorderSubtle` | Theme-dependent |
| Border Radius | 8px | Medium rounding |
| Padding | `Spacing.MdLg` (20px) | More padding |
| Elevation | `Level2` | Medium shadow |
| Header Font Size | `TypographySize.Subtitle` | 16px |
| Header Font Weight | `FontWeight.SemiBold` | 600 |
| Header Padding | `Spacing.Lg` (24px) | Generous header |
| Body Padding | `Spacing.MdLg` (20px) | More body padding |

#### Overlay Panel

| Property | Token | Value |
|----------|-------|-------|
| Background | `BackgroundElevated` | Theme-dependent |
| Border | `BorderStrong` | Theme-dependent |
| Border Radius | 12px | Pronounced rounding |
| Padding | `Spacing.Lg` (24px) | Maximum padding |
| Elevation | `Level3` | Heavy shadow |
| Header Font Size | `TypographySize.TitleSm` | 18px |
| Header Font Weight | `FontWeight.SemiBold` | 600 |
| Header Padding | `Spacing.Lg` (24px) | Maximum header |
| Body Padding | `Spacing.Lg` (24px) | Maximum body |

### Panel Motion

| Variant | Enter | Exit |
|---------|-------|------|
| Flat | None | None |
| Raised | None | None |
| Elevated | `Fast` + `EaseOut` | `Fast` + `EaseIn` |
| Overlay | `Slow` + `EaseOut` | `Normal` + `EaseIn` |

---

## Input System

### Input Tokens (IInputTokens)

| Property | Token | Value |
|----------|-------|-------|
| Background | `BackgroundPrimary` | Theme-dependent |
| Text | `TextPrimary` | Theme-dependent |
| Border | `BorderDefault` | Theme-dependent |
| Focus Border | `BorderAccent` | Accent color on focus |
| Placeholder | `TextTertiary` | Subtle placeholder text |
| Border Radius | 4px | Slight rounding |
| Padding X | `Spacing.MdSm` (12px) | Horizontal padding |
| Padding Y | `Spacing.Sm` (8px) | Vertical padding |
| Font Size | `TypographySize.Body` (13px) | Default body size |
| Elevation | `Level0` | No shadow |

### Input States

| State | Border | Background | Shadow |
|-------|--------|-----------|--------|
| Default | `BorderDefault` | `BackgroundPrimary` | None |
| Hover | `BorderStrong` | `BackgroundPrimary` | None |
| Focus | `BorderAccent` | `BackgroundPrimary` | `0 0 0 2px AccentSubtle` |
| Error | `StatusError` | `BackgroundPrimary` | None |
| Disabled | `BorderSubtle` | `BackgroundTertiary` | None |

### Input Variants

| Variant | Border Radius | Font Size | Padding |
|---------|--------------|-----------|---------|
| Default | 4px | `Body` (13px) | `MdSm` x / `Sm` y |
| Compact | 4px | `BodySm` (12px) | `Sm` x / `Xs` y |
| Large | 6px | `BodyLg` (14px) | `Md` x / `MdSm` y |

### Textarea Tokens

Same as default input, except:
- Min height: 80px
- Padding Y: `Spacing.MdSm` (12px)
- Font size: `TypographySize.BodySm` (12px) for code-friendly sizing
- Resizable: vertical only

---

## Sidebar System

### Sidebar Tokens (ISidebarTokens)

| Property | Token | Value |
|----------|-------|-------|
| Background | `BackgroundSecondary` | Theme-dependent |
| Border | `BorderDefault` | Theme-dependent |
| Width | 280px | Default sidebar width |
| Item Height | 28px | Standard list item height |
| Item Padding X | `Spacing.Md` (16px) | Horizontal item padding |
| Item Padding Y | `Spacing.Xs` (4px) | Vertical item padding |
| Item Font Size | `TypographySize.Body` (13px) | Default body size |
| Item Hover | `SurfaceHover` | Hover color |
| Item Active | `SurfaceActive` | Active/pressed color |
| Item Selected | `SurfaceSelected` | Selected item color |
| Section Header Font Size | `TypographySize.Overline` (11px) | Section labels |
| Section Header Font Weight | `FontWeight.Medium` (500) | Section label weight |

### Sidebar Item States

| State | Background | Text | Left Indicator |
|-------|-----------|------|---------------|
| Default | transparent | `TextPrimary` | None |
| Hover | `SurfaceHover` | `TextPrimary` | None |
| Active | `SurfaceActive` | `TextPrimary` | None |
| Selected | `SurfaceSelected` | `TextAccent` | 2px `AccentPrimary` |

### Sidebar Section Headers

- Uppercase `TypographySize.Overline` (11px)
- `FontWeight.Medium` (500)
- `TextTertiary` color
- `Spacing.Sm` (8px) padding above
- `Spacing.Xs` (4px) padding below
- No hover or active states

### Sidebar Tree Indentation

Each tree level indents by `Spacing.Md` (16px):
- Level 0: 0px indent
- Level 1: 16px indent
- Level 2: 32px indent
- Level 3: 48px indent
- Maximum depth: 8 levels (128px indent)

---

## Status Indicators

### Status Levels (6)

| Level | Enum | Dot Color | Background | Usage |
|-------|------|-----------|-----------|-------|
| Success | `StatusLevel.Success` | `StatusSuccess` | `StatusSuccessSubtle` | Completed, passed, ready |
| Warning | `StatusLevel.Warning` | `StatusWarning` | `StatusWarningSubtle` | Attention needed, pending |
| Error | `StatusLevel.Error` | `StatusError` | `StatusErrorSubtle` | Failed, broken, blocked |
| Info | `StatusLevel.Info` | `StatusInfo` | `StatusInfoSubtle` | Informational, neutral |
| Idle | `StatusLevel.Idle` | `TextTertiary` | `SurfaceTertiary` | Inactive, waiting |
| Active | `StatusLevel.Active` | `AccentPrimary` | `AccentSubtle` | Currently processing |

### Status Indicator Tokens (IStatusIndicatorTokens)

| Property | Success | Warning | Error | Info | Idle | Active |
|----------|---------|---------|-------|------|------|--------|
| Color | `StatusSuccess` | `StatusWarning` | `StatusError` | `StatusInfo` | `TextTertiary` | `AccentPrimary` |
| Background | `StatusSuccessSubtle` | `StatusWarningSubtle` | `StatusErrorSubtle` | `StatusInfoSubtle` | `SurfaceTertiary` | `AccentSubtle` |
| Font Size | `Overline` | `Overline` | `Overline` | `Overline` | `Overline` | `Overline` |
| Dot Size | 8px | 8px | 8px | 8px | 8px | 8px |

### Status Indicator Sizes

| Size | Dot Diameter | Font Size | Padding |
|------|-------------|-----------|---------|
| Small | 6px | `Caption` (10px) | `Xs` (4px) |
| Default | 8px | `Overline` (11px) | `Xs` (4px) |
| Large | 10px | `BodySm` (12px) | `Sm` (8px) |

### Status Dot Animation

Active status indicators may pulse:

```css
.status-dot-active {
    animation: pulse 2s infinite;
}

@keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
}
```

Pulse duration: 2s (not from MotionDuration — this is a continuous animation, not a transition).

---

## AI-Specific Tokens

### AI Token Categories

The design system includes 12 AI-specific color tokens organized into 4 semantic groups:

### Kernel Status (3 tokens)

| Token | Color (Dark) | Color (Light) | Usage |
|-------|-------------|---------------|-------|
| `AiKernelActive` | `#818CF8` (Indigo light) | `#4F46E5` (Indigo) | Kernel is running, processing |
| `AiKernelIdle` | `#6B7194` (Gray) | `#94A3B8` (Gray) | Kernel is idle, waiting |
| `AiKernelError` | `#F87171` (Red) | `#DC2626` (Red) | Kernel has errored |

### Agent Status (3 tokens)

| Token | Color (Dark) | Color (Light) | Usage |
|-------|-------------|---------------|-------|
| `AiAgentExecuting` | `#818CF8` (Indigo light) | `#4F46E5` (Indigo) | Agent is executing a task |
| `AiAgentPlanning` | `#A78BFA` (Purple) | `#7C3AED` (Purple) | Agent is in planning phase |
| `AiAgentSuspended` | `#FBBF24` (Amber) | `#D97706` (Amber) | Agent execution is suspended |

### Process Status (2 tokens)

| Token | Color (Dark) | Color (Light) | Usage |
|-------|-------------|---------------|-------|
| `AiProcessRunning` | `#34D399` (Green) | `#059669` (Green) | Process is running |
| `AiProcessFailed` | `#F87171` (Red) | `#DC2626` (Red) | Process has failed |

### Intent Status (3 tokens)

| Token | Color (Dark) | Color (Light) | Usage |
|-------|-------------|---------------|-------|
| `AiIntentPending` | `#60A5FA` (Blue) | `#2563EB` (Blue) | Intent awaiting resolution |
| `AiIntentSatisfied` | `#34D399` (Green) | `#059669` (Green) | Intent successfully resolved |
| `AiIntentBlocked` | `#F87171` (Red) | `#DC2626` (Red) | Intent is blocked |

### Mutation Annotation (1 token)

| Token | Color (Dark) | Color (Light) | Usage |
|-------|-------------|---------------|-------|
| `AiMutationAnnotation` | `rgba(129,140,248,0.10)` | `rgba(79,70,229,0.06)` | Code mutation highlight background |

### AI Status Indicator Mapping

| AI State | Status Level | Color Token | Animation |
|----------|-------------|-------------|-----------|
| Kernel Active | Active | `AiKernelActive` | Pulse |
| Kernel Idle | Idle | `AiKernelIdle` | None |
| Kernel Error | Error | `AiKernelError` | None |
| Agent Executing | Active | `AiAgentExecuting` | Pulse |
| Agent Planning | Info | `AiAgentPlanning` | Slow pulse |
| Agent Suspended | Warning | `AiAgentSuspended` | None |
| Process Running | Success | `AiProcessRunning` | Pulse |
| Process Failed | Error | `AiProcessFailed` | None |
| Intent Pending | Info | `AiIntentPending` | None |
| Intent Satisfied | Success | `AiIntentSatisfied` | None |
| Intent Blocked | Error | `AiIntentBlocked` | None |

### AI Mutation Annotation Rules

1. Mutations in the editor use `AiMutationAnnotation` as a background highlight
2. The annotation is a subtle tinted background — never a border or text color change
3. Multiple overlapping mutations increase opacity (0.10 → 0.18 → 0.25 max)
4. Annotation does not affect the editor's text rendering

---

## Interaction States

### IInteractionStateSpec

All interactive components must define hover, focus, and active states:

| Property | Default Token |
|----------|--------------|
| `hoverBackgroundColor` | `SurfaceHover` |
| `hoverBorderColor` | `BorderDefault` |
| `focusBorderColor` | `BorderAccent` |
| `focusOutlineColor` | `AccentPrimary` |
| `focusOutlineWidth` | 2px |
| `focusOutlineOffset` | 2px |
| `activeBackgroundColor` | `SurfaceActive` |
| `transitionDuration` | `MotionDuration.Fast` |
| `transitionEasing` | `MotionEasing.Default` |

### Focus Ring Rules

1. All interactive elements must have a visible focus indicator
2. Focus ring: 2px outline, 2px offset, `AccentPrimary` color
3. Focus ring appears with `MotionDuration.Fast` (100ms) transition
4. Never remove focus rings (`outline: none` is forbidden without replacement)
5. Focus ring must meet WCAG 2.1 3:1 contrast minimum

### Hover State Rules

1. All clickable elements must have a hover state
2. Hover background must be distinct from default (use `SurfaceHover`)
3. Hover transition: `MotionDuration.Fast` (100ms) + `MotionEasing.Default`
4. Ghost buttons must show hover background (they appear invisible by default)

---

## Icon System

### Icon Sizes (5)

| Size | Enum | Pixels | Usage |
|------|------|--------|-------|
| Extra Small | `IconSize.Xs` | 12px | Inline icons, badges |
| Small | `IconSize.Sm` | 14px | Compact toolbars, tree items |
| Medium | `IconSize.Md` | 16px | Standard buttons, menus |
| Large | `IconSize.Lg` | 20px | Section headers, panels |
| Extra Large | `IconSize.Xl` | 24px | Empty states, feature icons |

### Icon Context Rules (IIconRule)

| Context | Size | Color Token |
|---------|------|-------------|
| Navigation sidebar | `Md` (16px) | `TextSecondary` |
| Toolbar | `Md` (16px) | `TextSecondary` |
| Inline with text | `Sm` (14px) | Inherit text color |
| Button (Sm) | `Sm` (14px) | Inherit text color |
| Button (Md) | `Md` (16px) | Inherit text color |
| Button (Lg) | `Md` (16px) | Inherit text color |
| Status indicator | `Sm` (14px) | Status color token |
| Empty state | `Xl` (24px) | `TextTertiary` |
| Section header | `Lg` (20px) | `TextSecondary` |

### Icon Consistency Rules

1. Icons within a group must be the same size
2. Icon color follows text color unless a specific `ColorToken` is defined
3. Icons use `currentColor` for inheritance — no hardcoded icon colors
4. Icon + text pairs: icon aligned to text baseline with `Spacing.Xs` (4px) gap

---

## Component Token Resolution

### Resolution Process

```typescript
// Step 1: Get component tokens
const tokens = designSystem.getButtonTokens(ButtonVariant.Primary, ButtonSize.Md);

// Step 2: Resolve tokens to values
const bgColor = designSystem.resolveColor(tokens.backgroundColor);
const textColor = designSystem.resolveColor(tokens.textColor);
const paddingX = designSystem.getSpacing(tokens.paddingX);
const paddingY = designSystem.getSpacing(tokens.paddingY);
const fontSize = tokens.fontSize; // TypographySize is a number
const shadow = designSystem.getElevationShadow(tokens.elevation);

// Step 3: Apply to DOM
button.style.backgroundColor = bgColor;
button.style.color = textColor;
button.style.padding = `${paddingY}px ${paddingX}px`;
button.style.fontSize = `${fontSize}px`;
button.style.boxShadow = shadow;
```

### Service Methods for Component Tokens

| Method | Returns |
|--------|---------|
| `getButtonTokens(variant, size)` | `IButtonTokens` |
| `getPanelTokens(variant)` | `IPanelTokens` |
| `getInputTokens()` | `IInputTokens` |
| `getSidebarTokens()` | `ISidebarTokens` |
| `getStatusIndicatorTokens(level)` | `IStatusIndicatorTokens` |

### Component Token Completeness

Every component token interface ensures all visual properties are tokenized:

| Property Type | Source Enum |
|---------------|------------|
| Background color | `ColorToken` |
| Text color | `ColorToken` |
| Border color | `ColorToken` |
| Padding / Margin | `Spacing` |
| Font size | `TypographySize` |
| Font weight | `FontWeight` |
| Elevation | `Elevation` |
| Border radius | Component-specific constant |
| Transition duration | `MotionDuration` |
| Transition easing | `MotionEasing` |

---

## Reference

- **Source**: `src/vs/workbench/services/aiExecution/common/designSystem.ts`
- **Enums**: `ButtonVariant`, `ButtonSize`, `PanelVariant`, `StatusLevel`, `IconSize`
- **Interfaces**: `IButtonTokens`, `IPanelTokens`, `IInputTokens`, `ISidebarTokens`, `IStatusIndicatorTokens`, `IIconRule`, `IInteractionStateSpec`
