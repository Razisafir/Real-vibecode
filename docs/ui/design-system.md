# Design System Architecture

> Phase 12 — Real Vibecode AI-Native IDE
> Strict Visual Governance System

This is NOT cosmetic styling. This is a strict visual governance system that transforms the UI from "engineering dashboard" to "production-grade AI IDE".

---

## Table of Contents

1. [Design Principles](#design-principles)
2. [Spacing System](#spacing-system)
3. [Typography Scale](#typography-scale)
4. [Color System](#color-system)
5. [Elevation System](#elevation-system)
6. [Layout Grid Rules](#layout-grid-rules)
7. [Z-Index Hierarchy](#z-index-hierarchy)
8. [Information Hierarchy](#information-hierarchy)
9. [Theme Architecture](#theme-architecture)
10. [Task Breakdown](#task-breakdown)

---

## Design Principles

Eight governing principles define every visual decision in the system:

| # | Principle | Rule |
|---|-----------|------|
| 1 | No arbitrary spacing | 4px base unit only — all spacing must be a multiple of `SPACING_BASE` |
| 2 | No raw hex colors | Semantic tokens only — never reference hex values directly in UI code |
| 3 | Single font family hierarchy | Strict size scale — no random font-size values |
| 4 | Elevation system | No random shadows — only 4 defined elevation levels |
| 5 | Layout grid rules | No floating panels unless explicitly permitted |
| 6 | Motion system | No random transitions — only defined durations and easings |
| 7 | Information hierarchy | Everything maps to one of 4 visual priority levels |
| 8 | Apple-level restraint | "Apple-level restraint, not hacker theme" |

These principles are enforced at runtime by the `IDesignSystemService` consistency enforcer (Task 4).

---

## Spacing System

### Base Unit

```
SPACING_BASE = 4  // 4px
```

ALL spacing — margins, padding, gaps, offsets — must be a multiple of 4px. No exceptions.

### Spacing Scale

The `Spacing` enum defines every legal spacing value:

| Token | Value | Pixels | Usage |
|-------|-------|--------|-------|
| `Spacing.None` | 0 | 0px | No spacing |
| `Spacing.Xs` | 4 | 4px | Micro spacing: inline gaps, icon padding |
| `Spacing.Sm` | 8 | 8px | Small spacing: compact element gaps |
| `Spacing.MdSm` | 12 | 12px | Medium-small: input padding, list items |
| `Spacing.Md` | 16 | 16px | Medium: panel padding, section gaps |
| `Spacing.MdLg` | 20 | 20px | Medium-large: card padding |
| `Spacing.Lg` | 24 | 24px | Large: panel sections, group gaps |
| `Spacing.Xl` | 32 | 32px | Extra large: panel margins, major sections |
| `Spacing.Xxl` | 48 | 48px | Huge: page margins, hero spacing |
| `Spacing.Xxxl` | 64 | 64px | Massive: layout margins |

### Spacing Validation

```typescript
// Service method: IDesignSystemService.isValidSpacing(px)
isValidSpacing(8);   // true  — 8 % 4 === 0
isValidSpacing(7);   // false — 7 % 4 !== 0
isValidSpacing(13);  // false — 13 % 4 !== 0 (even though 12 is valid)
isValidSpacing(0);   // true  — 0 is Spacing.None
```

### Spacing Composition Rules

1. **Internal padding** uses `MdSm` (12px) or `Md` (16px)
2. **Between sections** uses `Lg` (24px) or `Xl` (32px)
3. **Between elements in a group** uses `Sm` (8px) or `MdSm` (12px)
4. **Icon-to-text gaps** use `Xs` (4px) or `Sm` (8px)
5. **Never** use odd numbers, 1px, 2px, 3px, 5px, 6px, 7px, 9px, etc.

---

## Typography Scale

### Font Families

The system uses exactly two font families:

- **`fontFamily`** — The UI font (system default: `-apple-system, BlinkMacSystemFont, Segoe UI, sans-serif`)
- **`fontFamilyMono`** — The monospace font (default: `Cascadia Code, Fira Code, Consolas, monospace`)

No additional font families. No per-component font overrides.

### Typography Sizes

The `TypographySize` enum defines every legal font size:

| Token | Value | Pixels | Usage |
|-------|-------|--------|-------|
| `TypographySize.Caption` | 10 | 10px | Captions, badges, metadata |
| `TypographySize.Overline` | 11 | 11px | Overlines, labels, tags |
| `TypographySize.BodySm` | 12 | 12px | Body small, secondary text, tab labels |
| `TypographySize.Body` | 13 | 13px | Body default, menu items, status bar |
| `TypographySize.BodyLg` | 14 | 14px | Body large, editor suggestions |
| `TypographySize.Subtitle` | 16 | 16px | Subtitle, panel headers |
| `TypographySize.TitleSm` | 18 | 18px | Title small, dialog titles |
| `TypographySize.Title` | 20 | 20px | Title default, section headings |
| `TypographySize.Heading` | 24 | 24px | Heading, major section titles |
| `TypographySize.DisplaySm` | 28 | 28px | Display small |
| `TypographySize.Display` | 32 | 32px | Display default |

### Font Weights

| Token | Value | Usage |
|-------|-------|-------|
| `FontWeight.Regular` | 400 | Body text |
| `FontWeight.Medium` | 500 | Emphasis, labels |
| `FontWeight.SemiBold` | 600 | Subtitles, panel headers |
| `FontWeight.Bold` | 700 | Titles, headings |

### Line Heights

| Token | Value | Usage |
|-------|-------|-------|
| `LineHeight.Tight` | 1.2 | Headings, titles |
| `LineHeight.Normal` | 1.4 | Body text |
| `LineHeight.Relaxed` | 1.6 | Long-form content |

### Typography Pairings

Size + Weight + LineHeight must follow these pairings:

| Size | Weight | Line Height | Context |
|------|--------|-------------|---------|
| `Caption` | `Regular` | `Normal` | Metadata labels |
| `Overline` | `Medium` | `Normal` | Section labels, tags |
| `BodySm` | `Regular` | `Normal` | Secondary text |
| `Body` | `Regular` | `Normal` | Default body text |
| `BodyLg` | `Regular` | `Normal` | Emphasized body |
| `Subtitle` | `SemiBold` | `Tight` | Panel headers |
| `TitleSm` | `SemiBold` | `Tight` | Dialog titles |
| `Title` | `Bold` | `Tight` | Section headings |
| `Heading` | `Bold` | `Tight` | Major section titles |
| `DisplaySm` | `Bold` | `Tight` | Feature titles |
| `Display` | `Bold` | `Tight` | Hero text |

---

## Color System

### Core Rule: NO Raw Hex

**Every color in the UI layer must use a semantic token from the `ColorToken` enum.**

```typescript
// FORBIDDEN — raw hex in UI code
element.style.color = '#E4E6F0';
element.style.backgroundColor = '#1A1D2B';

// REQUIRED — semantic tokens
element.style.color = designSystem.resolveColor(ColorToken.TextPrimary);
element.style.backgroundColor = designSystem.resolveColor(ColorToken.SurfacePrimary);
```

### Token Categories

#### Background Tokens (5)

| Token | Semantic Meaning |
|-------|-----------------|
| `BackgroundPrimary` | Main application background |
| `BackgroundSecondary` | Secondary background layer |
| `BackgroundTertiary` | Tertiary background (panels) |
| `BackgroundElevated` | Elevated surfaces |
| `BackgroundOverlay` | Modal/overlay backdrop |

#### Surface Tokens (6)

| Token | Semantic Meaning |
|-------|-----------------|
| `SurfacePrimary` | Cards, panels |
| `SurfaceSecondary` | Hover states |
| `SurfaceTertiary` | Active states |
| `SurfaceHover` | Hover highlight |
| `SurfaceActive` | Active/pressed state |
| `SurfaceSelected` | Selected items |

#### Text Tokens (6)

| Token | Semantic Meaning |
|-------|-----------------|
| `TextPrimary` | Primary text content |
| `TextSecondary` | Secondary text |
| `TextTertiary` | Tertiary / subtle text |
| `TextDisabled` | Disabled text |
| `TextInverted` | On accent backgrounds |
| `TextAccent` | Accent-colored text |

#### Border Tokens (4)

| Token | Semantic Meaning |
|-------|-----------------|
| `BorderDefault` | Default borders |
| `BorderSubtle` | Very subtle borders |
| `BorderStrong` | Emphasized borders |
| `BorderAccent` | Accent-colored borders |

#### Accent Tokens (5)

| Token | Semantic Meaning |
|-------|-----------------|
| `AccentPrimary` | Primary accent (Indigo) |
| `AccentSecondary` | Secondary accent (Cyan) |
| `AccentMuted` | Muted accent |
| `AccentSubtle` | Subtle accent background |
| `AccentStrong` | Strong accent |

#### Status Tokens (8)

| Token | Semantic Meaning |
|-------|-----------------|
| `StatusSuccess` | Success state |
| `StatusWarning` | Warning state |
| `StatusError` | Error state |
| `StatusInfo` | Informational state |
| `StatusSuccessSubtle` | Success subtle background |
| `StatusWarningSubtle` | Warning subtle background |
| `StatusErrorSubtle` | Error subtle background |
| `StatusInfoSubtle` | Info subtle background |

#### AI-Specific Tokens (12)

| Token | Semantic Meaning |
|-------|-----------------|
| `AiKernelActive` | AI kernel is active |
| `AiKernelIdle` | AI kernel is idle |
| `AiKernelError` | AI kernel error |
| `AiAgentExecuting` | Agent is executing |
| `AiAgentPlanning` | Agent is planning |
| `AiAgentSuspended` | Agent is suspended |
| `AiProcessRunning` | Process is running |
| `AiProcessFailed` | Process has failed |
| `AiIntentPending` | Intent is pending |
| `AiIntentSatisfied` | Intent is satisfied |
| `AiIntentBlocked` | Intent is blocked |
| `AiMutationAnnotation` | Code mutation annotation |

### Token Resolution

Tokens are resolved via `IDesignSystemService.resolveColor()`:

```typescript
const bgColor = designSystem.resolveColor(ColorToken.SurfacePrimary);
// Dark theme: '#1A1D2B'
// Light theme: '#FFFFFF'

const bgColorAlpha = designSystem.resolveColorAlpha(ColorToken.AccentSubtle, 0.5);
// Returns the token's color with specified alpha
```

### Total Token Count

| Category | Count |
|----------|-------|
| Background | 5 |
| Surface | 6 |
| Text | 6 |
| Border | 4 |
| Accent | 5 |
| Status | 8 |
| AI-Specific | 12 |
| **Total** | **46** |

---

## Elevation System

### Four Levels Only

No random `box-shadow` values. All elevation must use `Elevation` enum tokens:

| Level | Token | Shadow Definition | Usage |
|-------|-------|-------------------|-------|
| 0 | `Elevation.Level0` | `none` | Flat surfaces, inline elements |
| 1 | `Elevation.Level1` | `0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.08)` | Raised cards, dropdowns |
| 2 | `Elevation.Level2` | `0 4px 6px rgba(0,0,0,0.15), 0 2px 4px rgba(0,0,0,0.10)` | Panels, popovers |
| 3 | `Elevation.Level3` | `0 10px 25px rgba(0,0,0,0.20), 0 6px 10px rgba(0,0,0,0.12)` | Modals, overlays |

### Elevation Rules

1. **Base surfaces** (panels, sidebars) use `Level0`
2. **Hovered/dropdown elements** use `Level1`
3. **Popovers/floating panels** use `Level2`
4. **Modals/dialogs** use `Level3`
5. **Never** use custom `box-shadow` values — always resolve through `getElevationShadow()`
6. **Never** combine multiple elevation shadows on a single element

### Elevation + Z-Index Correlation

Elevation levels correlate with but are not the same as z-index:

- `Level0` → elements at `ZIndex.Base`
- `Level1` → elements at `ZIndex.Dropdown` or `ZIndex.Sticky`
- `Level2` → elements at `ZIndex.Sticky` or `ZIndex.ModalBackdrop`
- `Level3` → elements at `ZIndex.Modal` or above

---

## Layout Grid Rules

### Layout Grid Constants

| Constant | Value | Description |
|----------|-------|-------------|
| `NavigationWidth` | 48px | Navigation sidebar width (fixed) |
| `SecondarySidebarMinWidth` | 200px | Secondary sidebar minimum width |
| `SecondarySidebarDefaultWidth` | 280px | Secondary sidebar default width |
| `BottomPanelMinHeight` | 150px | Bottom panel minimum height |
| `BottomPanelDefaultHeight` | 220px | Bottom panel default height |
| `EditorMinWidth` | 400px | Editor minimum width |
| `StatusBarHeight` | 24px | Status bar height (fixed) |
| `TitleBarHeight` | 36px | Title bar height (fixed) |
| `TabBarHeight` | 36px | Tab bar height (fixed) |

### Fixed vs Resizable Zones

| Zone | Width/Height | Resizable |
|------|-------------|-----------|
| Title Bar | 36px | No |
| Navigation Sidebar | 48px | No |
| Primary Sidebar | 280px (default) | Yes (min: 200, max: 600) |
| Editor | Remaining space | Yes (min: 400) |
| Secondary Sidebar | 280px (default) | Yes (min: 200, max: 600) |
| Bottom Panel | 220px (default) | Yes (min: 150, max: 500) |
| Status Bar | 24px | No |

---

## Z-Index Hierarchy

### Nine Strict Layers

No random z-index values. All z-index must come from the `ZIndex` enum:

| Layer | Value | Usage |
|-------|-------|-------|
| `ZIndex.Base` | 0 | Editor, panels, base content |
| `ZIndex.SidebarOverlay` | 100 | Sidebar overlay panels |
| `ZIndex.Dropdown` | 200 | Dropdowns, popovers, context menus |
| `ZIndex.Sticky` | 300 | Sticky headers, pinned elements |
| `ZIndex.ModalBackdrop` | 400 | Modal backdrop overlay |
| `ZIndex.Modal` | 500 | Modal content, dialog windows |
| `ZIndex.Notification` | 600 | Notifications, toasts, alerts |
| `ZIndex.Tooltip` | 700 | Tooltips, hover cards |
| `ZIndex.DebugOverlay` | 800 | Debug overlays (highest priority) |

### Z-Index Rules

1. Each layer is separated by 100 to allow sub-layering within a layer
2. Elements within the same layer use DOM order, not z-index stacking
3. Never use z-index values between the defined levels
4. Never use z-index values above 800
5. Tooltips always render above modals
6. Debug overlay is always on top (for dev tools only)

---

## Information Hierarchy

### Four Visual Priority Levels

Every UI element must map to an `InfoLevel`:

| Level | Token | Opacity | Usage |
|-------|-------|---------|-------|
| 1 | `InfoLevel.Primary` | 100% | User action surfaces: editor, input, active focus |
| 2 | `InfoLevel.Secondary` | 85% | AI feedback: agent status, mutations, intent progress |
| 3 | `InfoLevel.Tertiary` | 60% | Diagnostics: terminal output, build status, warnings |
| 4 | `InfoLevel.Quaternary` | 40% | Metadata: timestamps, IDs, internal state |

### Level-to-Visual Mapping

| Level | Text Color | Font Size | Font Weight | Elevation |
|-------|-----------|-----------|-------------|-----------|
| Primary | `TextPrimary` | `Body`+ | `Medium`+ | `Level0`+ |
| Secondary | `TextSecondary` | `BodySm`+ | `Regular`+ | `Level0` |
| Tertiary | `TextTertiary` | `BodySm` | `Regular` | `Level0` |
| Quaternary | `TextDisabled` | `Caption` | `Regular` | `Level0` |

---

## Theme Architecture

### Theme Interface

```typescript
interface IDesignTheme {
    readonly name: string;
    readonly isDark: boolean;
    readonly colors: Readonly<Record<ColorToken, string>>;
    readonly typography: IDesignTypography;
    readonly motion: IDesignMotion;
}
```

### Dark Theme Philosophy

> "Apple-level restraint, not hacker theme"

Rules for the professional dark theme:
1. **No pure black** (`#000000`) — use near-black with slight blue tint (`#0F1117`)
2. **Reduced contrast noise** — soft borders, not harsh lines
3. **Neutral background gradient layering** — backgrounds progress from `#0F1117` → `#1E2130`
4. **Accent color discipline** — accent is not everywhere
5. **Softer borders** — never pure white, use `#2A2F45`

### Dark Theme Key Values

| Token | Hex |
|-------|-----|
| Background Primary | `#0F1117` |
| Background Secondary | `#151720` |
| Background Tertiary | `#1A1D2B` |
| Text Primary | `#E4E6F0` (not `#FFFFFF`) |
| Border Default | `#2A2F45` (not `#FFFFFF`) |
| Accent Primary | `#6366F1` (Indigo) |

### Light Theme Key Values

| Token | Hex |
|-------|-----|
| Background Primary | `#FFFFFF` |
| Background Secondary | `#F8FAFC` |
| Text Primary | `#0F172A` |
| Border Default | `#E2E8F0` |
| Accent Primary | `#6366F1` (Indigo) |

---

## Task Breakdown

### 10 Tasks for Phase 12

| # | Task | Description | Dependencies |
|---|------|-------------|-------------|
| 1 | **Design System Core** | Spacing, typography, color, elevation, grid, animation enums and constants | None |
| 2 | **Visual Language Specification** | Strict rules for spacing, type, color — violation detection types | Task 1 |
| 3 | **Component Design Tokens** | Button, panel, input, sidebar, status indicator token interfaces | Tasks 1, 2 |
| 4 | **UI Consistency Enforcer** | Runtime validation, dev-mode warnings, violation detection | Tasks 1–3 |
| 5 | **Layout Architecture Rules** | IDE layout zones, z-index hierarchy, floating panel permissions | Task 1 |
| 6 | **Information Hierarchy System** | 4 visual priority levels with style mappings | Tasks 1, 2 |
| 7 | **Dark Theme Rebuild** | Professional dark mode with restrained color palette | Tasks 1, 2, 6 |
| 8 | **Motion Design System** | Timing, easing, panel entrance/exit specifications | Task 1 |
| 9 | **Component Refactor Audit** | Classify existing components (Replace/Partial/Compliant) | Tasks 1–8 |
| 10 | **UI Polish Layer** | Spacing normalization, icon consistency, alignment fixes | Tasks 1–9 |

### Task Execution Order

```
Task 1 (Core) ──────────────────────────────────────────────┐
  ├─→ Task 2 (Visual Language) ────→ Task 3 (Component Tokens)
  ├─→ Task 5 (Layout Architecture)
  ├─→ Task 6 (Info Hierarchy) ──→ Task 7 (Dark Theme)
  └─→ Task 8 (Motion System)
                                                              │
Task 4 (Consistency Enforcer) ←──── Tasks 1–3 ──────────────┤
                                                              │
Task 9 (Component Audit) ←──── Tasks 1–8 ───────────────────┤
                                                              │
Task 10 (UI Polish) ←──── Tasks 1–9 ────────────────────────┘
```

---

## Reference

- **Source**: `src/vs/workbench/services/aiExecution/common/designSystem.ts`
- **Service**: `IDesignSystemService` (DI decorator: `'designSystemService'`)
- **Enums**: `Spacing`, `TypographySize`, `FontWeight`, `LineHeight`, `Elevation`, `LayoutGrid`, `ZIndex`, `ColorToken`, `ButtonVariant`, `ButtonSize`, `PanelVariant`, `StatusLevel`, `LayoutZone`, `InfoLevel`, `MotionDuration`, `MotionEasing`, `ComponentCompliance`, `DesignViolationType`, `ViolationSeverity`, `IconSize`
- **Themes**: `PROFESSIONAL_DARK_THEME`, `PROFESSIONAL_LIGHT_THEME`
