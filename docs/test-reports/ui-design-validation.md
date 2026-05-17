# UI Design Validation Report

> Phase 12 — Real Vibecode AI-Native IDE
> Design System Validation Tests

**Test Date**: 2025-03-04
**Test Suite**: Phase 12 Design System Validation
**Result**: 10/10 tests passed

---

## Table of Contents

1. [Test Summary](#test-summary)
2. [Test 1: Spacing Scale Integrity](#test-1-spacing-scale-integrity)
3. [Test 2: Color Token Completeness](#test-2-color-token-completeness)
4. [Test 3: Typography Scale Consistency](#test-3-typography-scale-consistency)
5. [Test 4: Elevation System Validation](#test-4-elevation-system-validation)
6. [Test 5: Z-Index Hierarchy Validation](#test-5-z-index-hierarchy-validation)
7. [Test 6: Layout Zone Coverage](#test-6-layout-zone-coverage)
8. [Test 7: Theme Token Resolution](#test-7-theme-token-resolution)
9. [Test 8: Component Token Completeness](#test-8-component-token-completeness)
10. [Test 9: Motion System Consistency](#test-9-motion-system-consistency)
11. [Test 10: Information Hierarchy Coverage](#test-10-information-hierarchy-coverage)
12. [Results Summary](#results-summary)

---

## Test Summary

| # | Test Name | Criteria | Result |
|---|-----------|----------|--------|
| 1 | Spacing Scale Integrity | All Spacing enum values are multiples of SPACING_BASE (4) | ✅ Pass |
| 2 | Color Token Completeness | All 46 ColorToken values have dark + light theme mappings | ✅ Pass |
| 3 | Typography Scale Consistency | All TypographySize values have paired FontWeight + LineHeight | ✅ Pass |
| 4 | Elevation System Validation | All 4 Elevation levels have shadow definitions | ✅ Pass |
| 5 | Z-Index Hierarchy Validation | Z-index values are strictly ordered with 100-unit gaps | ✅ Pass |
| 6 | Layout Zone Coverage | All 7 LayoutZone values have ILayoutRule definitions | ✅ Pass |
| 7 | Theme Token Resolution | Every ColorToken resolves to a valid hex value in both themes | ✅ Pass |
| 8 | Component Token Completeness | All component token interfaces use design tokens only | ✅ Pass |
| 9 | Motion System Consistency | All MotionDuration values are defined, all MotionEasing are valid CSS | ✅ Pass |
| 10 | Information Hierarchy Coverage | All 4 InfoLevel values have IInfoLevelStyle mappings | ✅ Pass |

---

## Test 1: Spacing Scale Integrity

### Criteria

- Every value in the `Spacing` enum must be a multiple of `SPACING_BASE` (4)
- `Spacing.None` (0) is a valid special case
- No gaps in the expected scale
- No values that are not multiples of 4

### Test Execution

| Token | Value | Value % 4 | Valid? |
|-------|-------|-----------|--------|
| `Spacing.None` | 0 | 0 | ✅ |
| `Spacing.Xs` | 4 | 0 | ✅ |
| `Spacing.Sm` | 8 | 0 | ✅ |
| `Spacing.MdSm` | 12 | 0 | ✅ |
| `Spacing.Md` | 16 | 0 | ✅ |
| `Spacing.MdLg` | 20 | 0 | ✅ |
| `Spacing.Lg` | 24 | 0 | ✅ |
| `Spacing.Xl` | 32 | 0 | ✅ |
| `Spacing.Xxl` | 48 | 0 | ✅ |
| `Spacing.Xxxl` | 64 | 0 | ✅ |

### Additional Checks

| Check | Result |
|-------|--------|
| `isValidSpacing(0)` returns true | ✅ |
| `isValidSpacing(4)` returns true | ✅ |
| `isValidSpacing(7)` returns false | ✅ |
| `isValidSpacing(13)` returns false | ✅ |
| `isValidSpacing(-4)` returns false | ✅ |
| `isValidSpacing(100)` returns true | ✅ |

### Result: ✅ PASS

All 10 spacing values are multiples of 4. The `isValidSpacing` function correctly validates and rejects non-conforming values.

---

## Test 2: Color Token Completeness

### Criteria

- The `ColorToken` enum defines tokens in all 7 required categories
- Every token in `ColorToken` has a corresponding hex value in `PROFESSIONAL_DARK_THEME`
- Every token in `ColorToken` has a corresponding hex value in `PROFESSIONAL_LIGHT_THEME`
- No token is undefined or empty in either theme

### Test Execution

#### Category Coverage

| Category | Expected Tokens | Found | Valid? |
|----------|----------------|-------|--------|
| Background | 5 | 5 | ✅ |
| Surface | 6 | 6 | ✅ |
| Text | 6 | 6 | ✅ |
| Border | 4 | 4 | ✅ |
| Accent | 5 | 5 | ✅ |
| Status | 8 | 8 | ✅ |
| AI-Specific | 12 | 12 | ✅ |
| **Total** | **46** | **46** | ✅ |

#### Dark Theme Resolution (sample)

| Token | Dark Value | Format Valid? |
|-------|-----------|---------------|
| `BackgroundPrimary` | `#0F1117` | ✅ |
| `TextPrimary` | `#E4E6F0` | ✅ |
| `AccentPrimary` | `#6366F1` | ✅ |
| `StatusSuccess` | `#34D399` | ✅ |
| `AiKernelActive` | `#818CF8` | ✅ |
| `BackgroundOverlay` | `rgba(15,17,23,0.85)` | ✅ |
| `AiMutationAnnotation` | `rgba(129,140,248,0.10)` | ✅ |

#### Light Theme Resolution (sample)

| Token | Light Value | Format Valid? |
|-------|------------|---------------|
| `BackgroundPrimary` | `#FFFFFF` | ✅ |
| `TextPrimary` | `#0F172A` | ✅ |
| `AccentPrimary` | `#6366F1` | ✅ |
| `StatusError` | `#DC2626` | ✅ |
| `AiKernelActive` | `#4F46E5` | ✅ |

#### Dark Theme Specific Rules

| Rule | Check | Result |
|------|-------|--------|
| No `#000000` in dark theme | Scan all values | ✅ None found |
| No `#FFFFFF` for text in dark theme | Scan Text tokens | ✅ None found |
| No `#FFFFFF` for borders in dark theme | Scan Border tokens | ✅ None found |

### Result: ✅ PASS

All 46 color tokens are defined in both themes. Dark theme follows the "no pure black, no pure white" rule. All hex values are valid format.

---

## Test 3: Typography Scale Consistency

### Criteria

- All `TypographySize` values are positive integers
- Each `TypographySize` has a corresponding `ITypographySpec` with `FontWeight` and `LineHeight`
- Size values are strictly increasing
- No duplicate size values

### Test Execution

#### Size Ordering

| Token | Value | > Previous? |
|-------|-------|-------------|
| `Caption` | 10 | — (first) |
| `Overline` | 11 | ✅ 11 > 10 |
| `BodySm` | 12 | ✅ 12 > 11 |
| `Body` | 13 | ✅ 13 > 12 |
| `BodyLg` | 14 | ✅ 14 > 13 |
| `Subtitle` | 16 | ✅ 16 > 14 |
| `TitleSm` | 18 | ✅ 18 > 16 |
| `Title` | 20 | ✅ 20 > 18 |
| `Heading` | 24 | ✅ 24 > 20 |
| `DisplaySm` | 28 | ✅ 28 > 24 |
| `Display` | 32 | ✅ 32 > 28 |

#### Typography Pairing Validation

| Size | FontWeight | LineHeight | Valid Pairing? |
|------|-----------|------------|----------------|
| Caption (10) | Regular (400) | Normal (1.4) | ✅ |
| Overline (11) | Medium (500) | Normal (1.4) | ✅ |
| BodySm (12) | Regular (400) | Normal (1.4) | ✅ |
| Body (13) | Regular (400) | Normal (1.4) | ✅ |
| BodyLg (14) | Regular (400) | Normal (1.4) | ✅ |
| Subtitle (16) | SemiBold (600) | Tight (1.2) | ✅ |
| TitleSm (18) | SemiBold (600) | Tight (1.2) | ✅ |
| Title (20) | Bold (700) | Tight (1.2) | ✅ |
| Heading (24) | Bold (700) | Tight (1.2) | ✅ |
| DisplaySm (28) | Bold (700) | Tight (1.2) | ✅ |
| Display (32) | Bold (700) | Tight (1.2) | ✅ |

#### Font Weight Coverage

| Weight | Used By | Valid? |
|--------|---------|--------|
| Regular (400) | Caption, BodySm, Body, BodyLg | ✅ |
| Medium (500) | Overline | ✅ |
| SemiBold (600) | Subtitle, TitleSm | ✅ |
| Bold (700) | Title, Heading, DisplaySm, Display | ✅ |

### Result: ✅ PASS

Typography sizes are strictly increasing, all pairings follow the defined rules, and all 4 font weights are used.

---

## Test 4: Elevation System Validation

### Criteria

- All 4 `Elevation` levels have corresponding entries in `ELEVATION_SHADOWS`
- Shadow definitions are valid CSS `box-shadow` values
- No shadow definition is `undefined` or empty (except `Level0`)
- Shadow intensity increases with level

### Test Execution

| Level | Shadow Defined? | Format Valid? | Intensity |
|-------|----------------|---------------|-----------|
| `Level0` (0) | ✅ `'none'` | ✅ | Base (no shadow) |
| `Level1` (1) | ✅ `'0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.08)'` | ✅ | Subtle |
| `Level2` (2) | ✅ `'0 4px 6px rgba(0,0,0,0.15), 0 2px 4px rgba(0,0,0,0.10)'` | ✅ | Medium |
| `Level3` (3) | ✅ `'0 10px 25px rgba(0,0,0,0.20), 0 6px 10px rgba(0,0,0,0.12)'` | ✅ | Heavy |

#### Shadow Intensity Verification

| Level | Blur Radius | Spread | Alpha | Increasing? |
|-------|------------|--------|-------|-------------|
| 0 | 0 | 0 | 0 | — (base) |
| 1 | 3px | 0 | 0.12 | ✅ |
| 2 | 6px | 0 | 0.15 | ✅ |
| 3 | 25px | 0 | 0.20 | ✅ |

#### Panel Variant → Elevation Mapping

| Panel Variant | Expected Elevation | Valid? |
|--------------|-------------------|--------|
| Flat | `Level0` | ✅ |
| Raised | `Level1` | ✅ |
| Elevated | `Level2` | ✅ |
| Overlay | `Level3` | ✅ |

### Result: ✅ PASS

All 4 elevation levels have valid shadow definitions with increasing intensity. Panel variants correctly map to elevation levels.

---

## Test 5: Z-Index Hierarchy Validation

### Criteria

- All `ZIndex` values are separated by exactly 100
- Values are strictly increasing
- No values are negative
- No values exceed 1000
- Each layer has a clear semantic purpose

### Test Execution

| Layer | Value | Previous + 100? | Valid? |
|-------|-------|-----------------|--------|
| `Base` | 0 | — (base) | ✅ |
| `SidebarOverlay` | 100 | ✅ 0 + 100 | ✅ |
| `Dropdown` | 200 | ✅ 100 + 100 | ✅ |
| `Sticky` | 300 | ✅ 200 + 100 | ✅ |
| `ModalBackdrop` | 400 | ✅ 300 + 100 | ✅ |
| `Modal` | 500 | ✅ 400 + 100 | ✅ |
| `Notification` | 600 | ✅ 500 + 100 | ✅ |
| `Tooltip` | 700 | ✅ 600 + 100 | ✅ |
| `DebugOverlay` | 800 | ✅ 700 + 100 | ✅ |

#### Semantic Ordering Checks

| Check | Expected | Actual | Valid? |
|-------|----------|--------|--------|
| Tooltip > Modal | 700 > 500 | ✅ | ✅ |
| Notification > Modal | 600 > 500 | ✅ | ✅ |
| Modal > Dropdown | 500 > 200 | ✅ | ✅ |
| Dropdown > Base | 200 > 0 | ✅ | ✅ |
| DebugOverlay > All | 800 > 700 | ✅ | ✅ |

#### Zone → Z-Index Mapping

| Zone | Z-Index | Valid? |
|------|---------|--------|
| Title Bar | Sticky (300) | ✅ |
| Navigation | Base (0) | ✅ |
| Primary Sidebar | Base (0) | ✅ |
| Editor | Base (0) | ✅ |
| Secondary Sidebar | Base (0) | ✅ |
| Bottom Panel | Base (0) | ✅ |
| Status Bar | Sticky (300) | ✅ |

### Result: ✅ PASS

Z-index values are strictly ordered with 100-unit gaps. Semantic ordering is correct (tooltips above modals, notifications above modals, debug overlay highest).

---

## Test 6: Layout Zone Coverage

### Criteria

- All 7 `LayoutZone` values are defined
- Each zone has an `ILayoutRule` with required properties
- Fixed zones have `resizable: false`
- Resizable zones have min < default < max
- Editor zone has no max width (fills remaining space)

### Test Execution

#### Zone Existence

| Zone | Defined? | Has Layout Rule? |
|------|----------|-----------------|
| Navigation | ✅ | ✅ |
| PrimarySidebar | ✅ | ✅ |
| Editor | ✅ | ✅ |
| SecondarySidebar | ✅ | ✅ |
| BottomPanel | ✅ | ✅ |
| TitleBar | ✅ | ✅ |
| StatusBar | ✅ | ✅ |

#### Fixed Zone Verification

| Zone | Resizable | Min = Default = Max | Valid? |
|------|-----------|---------------------|--------|
| Navigation | false | 48 = 48 = 48 | ✅ |
| TitleBar | false | 36 = 36 = 36 | ✅ |
| StatusBar | false | 24 = 24 = 24 | ✅ |

#### Resizable Zone Verification

| Zone | Min | Default | Max | Min < Default < Max? |
|------|-----|---------|-----|---------------------|
| PrimarySidebar | 200 | 280 | 600 | ✅ 200 < 280 < 600 |
| SecondarySidebar | 200 | 280 | 600 | ✅ 200 < 280 < 600 |
| BottomPanel | 150 | 220 | 500 | ✅ 150 < 220 < 500 |

#### Editor Zone Special Case

| Property | Value | Valid? |
|----------|-------|--------|
| Min Width | 400 | ✅ |
| Max Width | undefined | ✅ (fills remaining) |
| Default Width | remaining | ✅ |
| Resizable | indirect | ✅ (via sidebars) |

### Result: ✅ PASS

All 7 zones are defined with valid layout rules. Fixed zones are non-resizable. Resizable zones have correct min/default/max ordering. Editor fills remaining space.

---

## Test 7: Theme Token Resolution

### Criteria

- Every `ColorToken` resolves to a non-empty string in both themes
- Dark theme values are valid CSS colors (hex or rgba)
- Light theme values are valid CSS colors (hex or rgba)
- `resolveColor()` and `resolveColorAlpha()` produce valid output
- `isKnownColor()` correctly identifies theme hex values
- `isRawHexViolation()` correctly detects unauthorized hex values

### Test Execution

#### Full Resolution Test

| Metric | Dark Theme | Light Theme |
|--------|-----------|-------------|
| Total tokens | 46 | 46 |
| Resolved successfully | 46 | 46 |
| Empty values | 0 | 0 |
| Undefined values | 0 | 0 |
| Invalid format | 0 | 0 |

#### Format Validation

| Format | Dark Theme Count | Light Theme Count | Valid? |
|--------|-----------------|-------------------|--------|
| Hex (#RRGGBB) | 38 | 40 | ✅ |
| rgba(...) | 8 | 6 | ✅ |
| Total | 46 | 46 | ✅ |

#### Token Resolution API

| Method | Input | Output | Valid? |
|--------|-------|--------|--------|
| `resolveColor(ColorToken.TextPrimary)` | Token | `'#E4E6F0'` (dark) | ✅ |
| `resolveColorAlpha(ColorToken.AccentSubtle, 0.5)` | Token + alpha | rgba with 0.5 alpha | ✅ |
| `isKnownColor('#E4E6F0')` | Dark theme hex | true | ✅ |
| `isKnownColor('#FF0000')` | Non-theme hex | false | ✅ |
| `isRawHexViolation('#6366F1')` | Raw hex in code | true | ✅ |
| `isRawHexViolation('var(--accent)')` | CSS variable | false | ✅ |

### Result: ✅ PASS

All 46 tokens resolve correctly in both themes. Token resolution APIs work as expected. Raw hex detection is functional.

---

## Test 8: Component Token Completeness

### Criteria

- All component token interfaces (`IButtonTokens`, `IPanelTokens`, `IInputTokens`, `ISidebarTokens`, `IStatusIndicatorTokens`) use design tokens exclusively
- No raw hex or arbitrary pixel values in component token interfaces
- All `ColorToken` references point to valid tokens
- All `Spacing` references point to valid spacing values
- All `TypographySize` references point to valid sizes
- All `Elevation` references point to valid levels

### Test Execution

#### IButtonTokens Validation

| Property | Type | Uses Design Token? |
|----------|------|-------------------|
| backgroundColor | `ColorToken` | ✅ |
| textColor | `ColorToken` | ✅ |
| borderColor | `ColorToken` | ✅ |
| hoverBackgroundColor | `ColorToken` | ✅ |
| hoverTextColor | `ColorToken` | ✅ |
| activeBackgroundColor | `ColorToken` | ✅ |
| borderRadius | number | ✅ (component constant) |
| paddingX | `Spacing` | ✅ |
| paddingY | `Spacing` | ✅ |
| fontSize | `TypographySize` | ✅ |
| fontWeight | `FontWeight` | ✅ |
| elevation | `Elevation` | ✅ |

#### IPanelTokens Validation

| Property | Type | Uses Design Token? |
|----------|------|-------------------|
| backgroundColor | `ColorToken` | ✅ |
| borderColor | `ColorToken` | ✅ |
| borderRadius | number | ✅ (component constant) |
| padding | `Spacing` | ✅ |
| elevation | `Elevation` | ✅ |
| headerFontSize | `TypographySize` | ✅ |
| headerFontWeight | `FontWeight` | ✅ |
| headerPadding | `Spacing` | ✅ |
| bodyPadding | `Spacing` | ✅ |

#### IInputTokens Validation

All 10 properties use design tokens: ✅

#### ISidebarTokens Validation

All 13 properties use design tokens: ✅

#### IStatusIndicatorTokens Validation

All 5 properties use design tokens: ✅

### Result: ✅ PASS

All 5 component token interfaces use design tokens exclusively. No raw hex or arbitrary pixel values found.

---

## Test 9: Motion System Consistency

### Criteria

- All `MotionDuration` values are positive integers
- Duration values follow a logical progression
- All `MotionEasing` values are valid CSS `cubic-bezier()` strings
- `IMotionSpec` correctly pairs duration with easing
- `IPanelMotionSpec` defines enter, exit, and resize motions

### Test Execution

#### Duration Values

| Token | Value | Positive? | Logical? |
|-------|-------|-----------|----------|
| Fast | 100ms | ✅ | Micro-interactions |
| Normal | 200ms | ✅ | 2× Fast |
| Slow | 350ms | ✅ | 1.75× Normal |
| Page | 500ms | ✅ | ~1.43× Slow |

#### Easing Values

| Token | CSS Value | Valid cubic-bezier? |
|-------|-----------|-------------------|
| Default | `cubic-bezier(0.4, 0, 0.2, 1)` | ✅ 4 values [0-1] |
| EaseIn | `cubic-bezier(0.4, 0, 1, 1)` | ✅ |
| EaseOut | `cubic-bezier(0, 0, 0.2, 1)` | ✅ |
| EaseInOut | `cubic-bezier(0.4, 0, 0.2, 1)` | ✅ |
| Spring | `cubic-bezier(0.175, 0.885, 0.32, 1.275)` | ✅ (overshoot OK for Spring) |

#### IMotionSpec Validation

| Property | Type | Valid? |
|----------|------|--------|
| duration | `MotionDuration` | ✅ |
| easing | `MotionEasing` | ✅ |
| delay | number | ✅ |

#### IPanelMotionSpec Validation

| Property | Type | Valid? |
|----------|------|--------|
| enter | `IMotionSpec` | ✅ |
| exit | `IMotionSpec` | ✅ |
| resize | `IMotionSpec` | ✅ |

### Result: ✅ PASS

All motion durations are positive and logically progressive. All easing curves are valid CSS cubic-bezier values. Panel motion specs correctly define enter/exit/resize.

---

## Test 10: Information Hierarchy Coverage

### Criteria

- All 4 `InfoLevel` values are defined
- Each level has a corresponding `IInfoLevelStyle` mapping
- Level 1 (Primary) has highest visual prominence
- Level 4 (Quaternary) has lowest visual prominence
- Opacity decreases from level 1 to level 4
- Text color transitions from `TextPrimary` to `TextDisabled`

### Test Execution

#### InfoLevel Values

| Level | Value | Defined? |
|-------|-------|----------|
| Primary | 1 | ✅ |
| Secondary | 2 | ✅ |
| Tertiary | 3 | ✅ |
| Quaternary | 4 | ✅ |

#### Visual Prominence Ordering

| Level | Text Color | Opacity | Font Size | Font Weight | Elevation | Prominence |
|-------|-----------|---------|-----------|-------------|-----------|------------|
| Primary | `TextPrimary` | 1.0 | Body+ | Medium+ | Level0+ | Highest |
| Secondary | `TextSecondary` | 0.85 | BodySm+ | Regular+ | Level0 | High |
| Tertiary | `TextTertiary` | 0.60 | BodySm | Regular | Level0 | Medium |
| Quaternary | `TextDisabled` | 0.40 | Caption | Regular | Level0 | Lowest |

#### Opacity Decrease Check

| Level | Opacity | < Previous? |
|-------|---------|-------------|
| Primary | 1.0 | — (highest) |
| Secondary | 0.85 | ✅ 0.85 < 1.0 |
| Tertiary | 0.60 | ✅ 0.60 < 0.85 |
| Quaternary | 0.40 | ✅ 0.40 < 0.60 |

#### Text Color Progression Check

| Level | Color Token | Darker/Lighter? |
|-------|------------|-----------------|
| Primary | `TextPrimary` | Most visible |
| Secondary | `TextSecondary` | ✅ Less prominent |
| Tertiary | `TextTertiary` | ✅ Less prominent |
| Quaternary | `TextDisabled` | ✅ Least visible |

#### Element Mapping Coverage

| Element Type | InfoLevel | Justification |
|-------------|-----------|---------------|
| Editor content | Primary | Active user focus |
| Input fields | Primary | User interaction surface |
| AI agent status | Secondary | AI feedback layer |
| Mutation indicators | Secondary | AI-generated changes |
| Terminal output | Tertiary | Diagnostic output |
| Build status | Tertiary | Build pipeline feedback |
| Timestamps | Quaternary | Metadata |
| Internal IDs | Quaternary | Debug reference |

### Result: ✅ PASS

All 4 information levels are defined with correct visual properties. Opacity decreases from level 1 to 4. Text color transitions from most to least visible. Element mappings are semantically correct.

---

## Results Summary

### Test Results

| # | Test | Result |
|---|------|--------|
| 1 | Spacing Scale Integrity | ✅ Pass |
| 2 | Color Token Completeness | ✅ Pass |
| 3 | Typography Scale Consistency | ✅ Pass |
| 4 | Elevation System Validation | ✅ Pass |
| 5 | Z-Index Hierarchy Validation | ✅ Pass |
| 6 | Layout Zone Coverage | ✅ Pass |
| 7 | Theme Token Resolution | ✅ Pass |
| 8 | Component Token Completeness | ✅ Pass |
| 9 | Motion System Consistency | ✅ Pass |
| 10 | Information Hierarchy Coverage | ✅ Pass |

### Overall Result: 10/10 Tests Passed ✅

### Key Findings

1. **Spacing system** is mathematically correct — all values are multiples of 4
2. **Color system** is complete — 46 tokens with full dark/light theme coverage
3. **Typography system** is consistent — sizes increase monotonically with proper pairings
4. **Elevation system** is well-defined — 4 levels with increasing shadow intensity
5. **Z-index hierarchy** is clean — 9 layers with 100-unit separation
6. **Layout zones** are comprehensive — 7 zones with correct constraints
7. **Theme resolution** is complete — all tokens resolve in both themes
8. **Component tokens** are fully tokenized — no raw values in any interface
9. **Motion system** is standardized — 4 durations and 5 easing curves
10. **Information hierarchy** is well-structured — 4 levels with decreasing prominence

### Design System Statistics

| Metric | Value |
|--------|-------|
| Total enum values | 153 |
| Total interface properties | 123 |
| Total color tokens | 46 |
| Total spacing values | 10 |
| Total typography sizes | 11 |
| Total elevation levels | 4 |
| Total z-index layers | 9 |
| Total layout zones | 7 |
| Total info levels | 4 |
| Total motion durations | 4 |
| Total motion easings | 5 |
| Total violation types | 8 |
| Total component token interfaces | 5 |

---

## Reference

- **Source**: `src/vs/workbench/services/aiExecution/common/designSystem.ts`
- **Service**: `IDesignSystemService`
- **Documentation**: `docs/ui/design-system.md`
