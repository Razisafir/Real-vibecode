# Visual Language Specification

> Phase 12 — Real Vibecode AI-Native IDE
> Strict Rules for Spacing, Typography, and Color

The visual language specification defines **hard rules** for how spacing, typography, and color are applied throughout the UI. These are not suggestions — they are enforced constraints that the `IDesignSystemService` validates at runtime.

---

## Table of Contents

1. [Governance Model](#governance-model)
2. [Spacing Rules](#spacing-rules)
3. [Typography Rules](#typography-rules)
4. [Color Rules](#color-rules)
5. [Before/After Examples](#beforeafter-examples)
6. [Violation Examples](#violation-examples)
7. [Enforcement](#enforcement)

---

## Governance Model

### What This Document Governs

This specification governs three domains:

1. **Spacing** — All margin, padding, gap, and offset values
2. **Typography** — All font-size, font-weight, line-height, and letter-spacing values
3. **Color** — All color properties (background, text, border, accent, status)

### How It Is Enforced

The `IDesignSystemService` provides runtime enforcement through:

- `isValidSpacing(px)` — validates spacing values
- `isRawHexViolation(value)` — detects raw hex color usage
- `runConsistencyCheck()` — full UI audit
- `onDidDetectViolation` — real-time violation events

In dev mode, violations are surfaced as console warnings and visual indicators.

---

## Spacing Rules

### Rule 1: 4px Base Unit Only

**ALL spacing values must be a multiple of 4px.**

```
SPACING_BASE = 4
```

Valid: 0, 4, 8, 12, 16, 20, 24, 32, 48, 64
Invalid: 1, 2, 3, 5, 6, 7, 9, 10, 11, 13, 14, 15, 17, 18, 19, ...

### Rule 2: Use Spacing Enum Values

All spacing must reference the `Spacing` enum, not raw pixel numbers.

```typescript
// CORRECT
padding: Spacing.Md    // 16px
gap: Spacing.Sm        // 8px
margin: Spacing.Lg     // 24px

// FORBIDDEN
padding: 16
gap: 8
margin: 24
```

### Rule 3: No Inline Pixel Values for Spacing

Even if the value is a multiple of 4, inline pixel literals are forbidden:

```typescript
// FORBIDDEN
element.style.padding = '16px';
element.style.marginTop = '8px';

// CORRECT
element.style.padding = `${designSystem.getSpacing(Spacing.Md)}px`;
element.style.marginTop = `${designSystem.getSpacing(Spacing.Sm)}px`;
```

### Rule 4: Context-Appropriate Spacing

Each spacing value has a defined context. Using `Spacing.Xxl` for icon padding is as wrong as using `Spacing.Xs` for page margins.

| Context | Allowed Values |
|---------|---------------|
| Icon padding | `Xs` (4px) |
| Inline gaps | `Xs` (4px), `Sm` (8px) |
| Input padding | `MdSm` (12px) |
| List item padding | `MdSm` (12px), `Md` (16px) |
| Panel padding | `Md` (16px), `MdLg` (20px) |
| Section gaps | `Lg` (24px), `Xl` (32px) |
| Panel margins | `Xl` (32px) |
| Page margins | `Xxl` (48px), `Xxxl` (64px) |

### Rule 5: No Negative Spacing

Negative margins are not part of the spacing system. Use layout composition instead.

```typescript
// FORBIDDEN
marginTop: -4px

// CORRECT — adjust the layout structure
// Use CSS grid or flexbox to achieve the visual result
```

---

## Typography Rules

### Rule 1: Single Font Family

The UI uses exactly **one** font family for all text (plus one monospace variant for code):

- **UI font**: `-apple-system, BlinkMacSystemFont, Segoe UI, sans-serif`
- **Code font**: `Cascadia Code, Fira Code, Consolas, monospace`

No component may override the font family.

```typescript
// FORBIDDEN
fontFamily: 'Inter, sans-serif'
fontFamily: 'Roboto, sans-serif'
fontFamily: 'Helvetica Neue'

// CORRECT
fontFamily: designSystem.activeTheme.typography.fontFamily
```

### Rule 2: Typography Size Scale Only

All font sizes must come from the `TypographySize` enum.

```typescript
// CORRECT
fontSize: TypographySize.Body     // 13px
fontSize: TypographySize.Subtitle // 16px

// FORBIDDEN
fontSize: 13
fontSize: '13px'
fontSize: '1rem'
```

### Rule 3: Typography Pairings Must Be Followed

Font size, weight, and line height must follow the defined pairings:

| Size | Required Weight | Required Line Height |
|------|----------------|---------------------|
| Caption (10) | Regular (400) | Normal (1.4) |
| Overline (11) | Medium (500) | Normal (1.4) |
| BodySm (12) | Regular (400) | Normal (1.4) |
| Body (13) | Regular (400) | Normal (1.4) |
| BodyLg (14) | Regular (400) | Normal (1.4) |
| Subtitle (16) | SemiBold (600) | Tight (1.2) |
| TitleSm (18) | SemiBold (600) | Tight (1.2) |
| Title (20) | Bold (700) | Tight (1.2) |
| Heading (24) | Bold (700) | Tight (1.2) |
| DisplaySm (28) | Bold (700) | Tight (1.2) |
| Display (32) | Bold (700) | Tight (1.2) |

### Rule 4: No Custom Letter Spacing

Letter spacing is defined per typography spec. Do not add custom letter spacing:

```typescript
// FORBIDDEN
letterSpacing: '0.05em'
letterSpacing: '-0.01em'

// CORRECT — use the spec's letterSpacing
const spec = designSystem.getTypographySpec(TypographySize.Overline);
// spec.letterSpacing is predefined
```

### Rule 5: Text Transform Rules

- `Overline` and `Caption` may use `text-transform: uppercase`
- All other sizes use natural case
- Never use `text-transform: capitalize`

---

## Color Rules

### Rule 1: Semantic Tokens Only — NO Raw Hex

**This is the most critical rule in the entire design system.**

```typescript
// FORBIDDEN — raw hex in UI code
color: '#E4E6F0'
backgroundColor: '#1A1D2B'
borderColor: '#2A2F45'

// CORRECT — semantic tokens
color: designSystem.resolveColor(ColorToken.TextPrimary)
backgroundColor: designSystem.resolveColor(ColorToken.SurfacePrimary)
borderColor: designSystem.resolveColor(ColorToken.BorderDefault)
```

### Rule 2: No Mixed Token Categories

Do not use text tokens for backgrounds or background tokens for text:

```typescript
// FORBIDDEN — using text token for background
backgroundColor: ColorToken.TextPrimary

// FORBIDDEN — using background token for text
color: ColorToken.BackgroundPrimary

// CORRECT — use the right category
backgroundColor: ColorToken.SurfacePrimary
color: ColorToken.TextPrimary
```

### Rule 3: Use Subtle Variants for Backgrounds

When applying status colors as backgrounds, use the subtle variants:

```typescript
// FORBIDDEN — full status color as background
backgroundColor: ColorToken.StatusError  // too harsh for bg

// CORRECT — subtle variant for background
backgroundColor: ColorToken.StatusErrorSubtle  // soft tinted bg

// StatusError (full) is only for icons, dots, text indicators
```

### Rule 4: AI Tokens for AI Elements Only

AI-specific color tokens are reserved for AI-related UI:

```typescript
// FORBIDDEN — using AI token for non-AI element
color: ColorToken.AiKernelActive  // only for AI kernel indicators

// CORRECT — AI tokens for AI contexts
// AiKernelActive — AI kernel status indicator
// AiAgentExecuting — agent execution status
// AiProcessRunning — process running indicator
// AiIntentPending — intent pending state
// AiMutationAnnotation — code mutation highlight
```

### Rule 5: Dark Theme Specifics

In dark mode, additional constraints apply:

1. **No pure black** — `#000000` is never used. The darkest background is `#0F1117`
2. **No pure white text** — `#FFFFFF` is never used for text. Primary text is `#E4E6F0`
3. **No pure white borders** — Borders use `#2A2F45` or `#3E4463`, never `#FFFFFF`
4. **Accent restraint** — Accent colors (`#6366F1`) are not used as backgrounds unless semantically justified

---

## Before/After Examples

### Example 1: Panel Component

**Before (violations):**
```css
.panel {
    padding: 15px;                    /* ❌ Not a multiple of 4 */
    background-color: #1A1D2B;        /* ❌ Raw hex color */
    border: 1px solid #FFFFFF;        /* ❌ Raw hex + pure white in dark mode */
    font-size: 14px;                  /* ❌ Not from TypographySize enum */
    box-shadow: 0 2px 8px #000;       /* ❌ Not from Elevation system */
}
```

**After (compliant):**
```css
.panel {
    padding: ${Spacing.MdLg}px;                              /* ✅ 20px — design token */
    background-color: ${resolveColor(ColorToken.SurfacePrimary)}; /* ✅ Semantic token */
    border: 1px solid ${resolveColor(ColorToken.BorderDefault)};  /* ✅ Semantic token */
    font-size: ${TypographySize.BodyLg}px;                   /* ✅ Typography token */
    box-shadow: ${getElevationShadow(Elevation.Level1)};     /* ✅ Elevation token */
}
```

### Example 2: Button Component

**Before (violations):**
```css
.button {
    padding: 6px 12px;               /* ❌ 6px not a multiple of 4 */
    background: #6366F1;             /* ❌ Raw hex */
    color: white;                    /* ❌ Raw color keyword */
    border-radius: 3px;              /* ❌ Not a standard radius */
    font-size: 13px;                 /* ❌ Raw px value */
    transition: all 0.2s ease;       /* ❌ "all" transition, custom timing */
}
```

**After (compliant):**
```css
.button {
    padding: ${Spacing.MdSm}px ${Spacing.Md}px;              /* ✅ 12px 16px */
    background: ${resolveColor(ColorToken.AccentPrimary)};    /* ✅ Semantic token */
    color: ${resolveColor(ColorToken.TextInverted)};          /* ✅ Semantic token */
    border-radius: 6px;                                       /* ✅ Standard radius */
    font-size: ${TypographySize.Body}px;                      /* ✅ Typography token */
    transition: background-color ${MotionDuration.Fast}ms ${MotionEasing.Default}; /* ✅ */
}
```

### Example 3: Status Indicator

**Before (violations):**
```css
.status-error {
    color: #F87171;                  /* ❌ Raw hex */
    background: rgba(248,113,113,0.12);  /* ❌ Raw rgba */
    font-size: 11px;                 /* ❌ Raw px */
    padding: 2px 6px;               /* ❌ Not multiples of 4 */
}
```

**After (compliant):**
```css
.status-error {
    color: ${resolveColor(ColorToken.StatusError)};           /* ✅ Semantic token */
    background: ${resolveColor(ColorToken.StatusErrorSubtle)}; /* ✅ Semantic token */
    font-size: ${TypographySize.Overline}px;                  /* ✅ Typography token */
    padding: ${Spacing.Xs}px ${Spacing.Sm}px;                 /* ✅ 4px 8px */
}
```

### Example 4: AI Kernel Indicator

**Before (violations):**
```css
.kernel-active {
    color: #818CF8;                  /* ❌ Raw hex */
    background: rgba(129,140,248,0.1);  /* ❌ Raw rgba */
    font-weight: 600;                /* ❌ Raw weight number */
    margin: 5px 10px;               /* ❌ 5px, 10px not multiples of 4 */
}
```

**After (compliant):**
```css
.kernel-active {
    color: ${resolveColor(ColorToken.AiKernelActive)};       /* ✅ Semantic token */
    background: ${resolveColor(ColorToken.AiMutationAnnotation)}; /* ✅ Semantic token */
    font-weight: ${FontWeight.SemiBold};                      /* ✅ Weight token */
    margin: ${Spacing.Xs}px ${Spacing.MdSm}px;                /* ✅ 4px 12px */
}
```

---

## Violation Examples

### Violation Type: RawHexColor

```typescript
// Detected by: DesignViolationType.RawHexColor
// Severity: ViolationSeverity.Error

// Example violation:
element.style.backgroundColor = '#1A1D2B';

// Suggestion:
// Replace raw hex '#1A1D2B' with ColorToken.SurfacePrimary
```

### Violation Type: SpacingViolation

```typescript
// Detected by: DesignViolationType.SpacingViolation
// Severity: ViolationSeverity.Error

// Example violation:
element.style.padding = '7px';  // 7 % 4 !== 0

// Suggestion:
// Replace 7px with Spacing.Sm (8px) or Spacing.Xs (4px)
```

### Violation Type: InconsistentFont

```typescript
// Detected by: DesignViolationType.InconsistentFont
// Severity: ViolationSeverity.Warning

// Example violation:
element.style.fontSize = '15px';  // Not in TypographySize enum

// Suggestion:
// Replace 15px with TypographySize.BodyLg (14px) or TypographySize.Subtitle (16px)
```

### Violation Type: UnauthorizedInlineStyle

```typescript
// Detected by: DesignViolationType.UnauthorizedInlineStyle
// Severity: ViolationSeverity.Warning

// Example violation:
element.setAttribute('style', 'color: red; font-weight: bold;');

// Suggestion:
// Use CSS classes with design tokens instead of inline styles
```

### Violation Type: InvalidElevation

```typescript
// Detected by: DesignViolationType.InvalidElevation
// Severity: ViolationSeverity.Error

// Example violation:
element.style.boxShadow = '0 2px 10px rgba(0,0,0,0.3)';

// Suggestion:
// Use Elevation.Level2: '0 4px 6px rgba(0,0,0,0.15), 0 2px 4px rgba(0,0,0,0.10)'
```

### Violation Type: InvalidZIndex

```typescript
// Detected by: DesignViolationType.InvalidZIndex
// Severity: ViolationSeverity.Error

// Example violation:
element.style.zIndex = '9999';  // Not in ZIndex enum

// Suggestion:
// Use ZIndex.Notification (600) or ZIndex.Tooltip (700)
```

### Violation Type: InsufficientContrast

```typescript
// Detected by: DesignViolationType.InsufficientContrast
// Severity: ViolationSeverity.Warning

// Example violation:
// TextSecondary (#9DA2B9) on BackgroundSecondary (#151720)
// Contrast ratio: 5.2:1 — acceptable but close to boundary

// Suggestion:
// Ensure minimum 4.5:1 contrast ratio for body text
```

### Violation Type: MissingInteractionState

```typescript
// Detected by: DesignViolationType.MissingInteractionState
// Severity: ViolationSeverity.Warning

// Example violation:
// Button has no :hover state defined
// Button has no :focus state defined

// Suggestion:
// Add hover and focus states using IInteractionStateSpec tokens
```

---

## Enforcement

### Runtime Validation

The `IDesignSystemService` provides multiple enforcement mechanisms:

| Method | Purpose |
|--------|---------|
| `isValidSpacing(px)` | Check if a value is a valid spacing |
| `isRawHexViolation(value)` | Check if a raw hex is used where a token should be |
| `isKnownColor(hex)` | Check if a hex matches a known token |
| `runConsistencyCheck()` | Full audit of all rendered UI |
| `checkElement(elementId)` | Audit a specific element |
| `getViolations()` | Retrieve all detected violations |

### Dev-Mode Warnings

When `devModeWarnings` is enabled:

1. Console warnings appear for every detected violation
2. Visual indicators highlight violating elements (red outlines)
3. A violation count badge appears in the status bar
4. Violations are grouped by type and severity

### Severity Levels

| Severity | Meaning | Action |
|----------|---------|--------|
| `Error` | Must fix — breaks design system rules | Block merge |
| `Warning` | Should fix — inconsistent but not breaking | Flag for review |
| `Info` | Consider fixing — minor inconsistency | Log only |

### Error vs Warning Classification

| Violation Type | Severity |
|---------------|----------|
| `RawHexColor` | Error |
| `SpacingViolation` | Error |
| `InconsistentFont` | Warning |
| `UnauthorizedInlineStyle` | Warning |
| `InvalidElevation` | Error |
| `InvalidZIndex` | Error |
| `InsufficientContrast` | Warning |
| `MissingInteractionState` | Warning |

---

## Quick Reference Card

| Domain | Rule | Validation |
|--------|------|------------|
| Spacing | Multiples of 4px only | `value % 4 === 0` |
| Spacing | Use `Spacing` enum | No raw pixel literals |
| Typography | Use `TypographySize` enum | No raw font-size values |
| Typography | Single font family | No `fontFamily` overrides |
| Typography | Follow pairings | Size + Weight + LineHeight |
| Color | Semantic tokens only | No raw hex in UI code |
| Color | Right token category | Text tokens for text, etc. |
| Color | Subtle variants for bg | `StatusXxxSubtle` for backgrounds |
| Color | AI tokens for AI only | No misuse of AI-specific tokens |
