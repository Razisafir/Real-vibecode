# Visual Polish — Iconography + Typography

> Phase 15 — Production Surface Rebuild
> Unified Icon Stroke System, Icon Sizing Discipline, Optical Alignment Correction, Typography Rhythm Refinement

---

## Overview

The `IVisualPolishService` is the production-grade visual refinement layer that governs iconography and typography at the pixel level. While the design system (Phase 12) established the foundational tokens and scales, and the signature product identity (Phase 13) defined the emotional personality, the visual polish service is what makes those abstractions feel precise, confident, and premium in every rendered surface.

Visual polish is not decoration. It is the difference between a product that looks "designed by engineers" and one that looks "designed by designers who code." It is the discipline of ensuring that every icon has the same stroke weight, every icon size is optically balanced, every typographic element has correct line height and letter spacing, and every vertical rhythm is mathematically consistent.

A product with inconsistent icon strokes feels sloppy. A product with misaligned icons feels unfinished. A product with erratic typography rhythm feels amateurish. These are not subjective aesthetic preferences — they are measurable, enforceable quality constraints that the `IVisualPolishService` validates at runtime.

---

## Icon Stroke Weights

Every icon in Real Vibecode uses one of four stroke weights. No other stroke weights are permitted. This constraint ensures that icons from different sources (built-in, extension-provided, AI-generated) always feel visually consistent when they appear on the same surface.

| Weight | Stroke Width | Usage | Examples |
|--------|-------------|-------|----------|
| **Thin** | 1px | Decorative or secondary icons that must recede visually. Never used for interactive icons. | Decorative section dividers, watermark icons, ambient visual texture |
| **Regular** | 1.5px | Default icon weight for all standard UI icons. The workhorse weight. | Navigation icons, toolbar actions, status indicators, panel icons |
| **Medium** | 2px | Icons that need slightly more presence than Regular — typically in larger sizes or on surfaces with competing visual elements. | Sidebar section headers, card icons, empty state icons |
| **Bold** | 2.5px | Icons that must command attention at their size tier. Used sparingly. | Critical status indicators, primary action icons, onboarding highlights |

### Stroke Weight Rules

1. **Default is Regular**: Every icon starts at Regular (1.5px) unless explicitly assigned a different weight.
2. **Weight must match size tier**: Thin is only valid for Small+ tiers. Medium is only valid for Standard+ tiers. Bold is only valid for Medium+ tiers.
3. **Weight must match surface context**: Icons on the same surface, same row, or same visual group must use the same stroke weight. Mixing weights within a group is a violation.
4. **Interactive icons are Regular or Medium**: Thin is never interactive (insufficient hit target perception). Bold is never used for repetitive UI elements (too heavy).
5. **Consistency overrides hierarchy**: If an icon appears in both a header and a list, use the same weight. Do not use Bold in the header and Regular in the list — this creates visual inconsistency.

---

## Icon Size Tiers

Every icon in Real Vibecode renders at one of six size tiers. These tiers are calibrated to work with the typography scale and spacing system, ensuring that icons and text always feel proportionally balanced when they coexist.

| Tier | Size | Usage | Stroke Weight Range | With Typography |
|------|------|-------|--------------------|-----------------|
| **Micro** | 12px | Inline icons within text, badge indicators, compact list markers | Thin, Regular | Caption (11px), Small (12px) |
| **Small** | 14px | Secondary action icons, tab icons, compact toolbar items | Thin, Regular | Small (12px), Body (13px) |
| **Standard** | 16px | Default icon size for most UI contexts — navigation, menus, status bar | Regular, Medium | Body (13px), Large (14px) |
| **Medium** | 20px | Section icons, panel header icons, prominent action buttons | Regular, Medium, Bold | Large (14px), Title (16px) |
| **Large** | 24px | Feature highlights, empty state icons, sidebar section headers | Regular, Medium, Bold | Title (16px), Headline (20px) |
| **XL** | 32px | Hero icons, onboarding illustrations, large empty state anchors | Medium, Bold | Headline (20px), Display (24px) |

### Icon Sizing Discipline

1. **Never use arbitrary icon sizes**: Every icon must use one of the six defined tiers. No 13px icons, no 18px icons, no 22px icons.
2. **Icon-to-text proportion**: When an icon appears inline with text, the icon size tier must correspond to the typography size as shown in the table above. A Standard (16px) icon next to Body (13px) text is correct. A Large (24px) icon next to Body (13px) text is a violation.
3. **Icon-to-container proportion**: Icons within buttons, tabs, and list items must not exceed 60% of the container's height. A 24px icon in a 28px-tall tab is a violation.
4. **Icon grid alignment**: All icons must align to the 4px grid. Icons at Standard (16px) and Large (24px) naturally align. Icons at Micro (12px) and Medium (20px) require optical alignment correction (see below).

---

## Optical Alignment Correction

Icons and text that are mathematically centered often appear visually off-center due to the uneven distribution of visual weight within their bounding boxes. The `IVisualPolishService` applies optical alignment corrections to ensure that every icon-text pair, icon-container pair, and text-block pair appears perfectly balanced to the human eye.

### Correction Types

| Correction | Description | Magnitude |
|------------|-------------|-----------|
| **Vertical icon offset** | Icons with more visual weight at the top (e.g., arrows, chevrons) are shifted down by 0.5–1px to optically center with adjacent text. | 0.5–1px |
| **Horizontal icon offset** | Icons paired with right-aligned text are shifted left by 0.5px to compensate for the icon's visual padding. | 0.5px |
| **Baseline text offset** | Text that appears to float above its mathematical baseline (common with certain font metrics) is shifted down by 0.25–0.5px. | 0.25–0.5px |
| **Icon-to-icon alignment** | Icons of different sizes in the same row are vertically aligned by their visual center, not their mathematical center. | Variable |

### Correction Application

Optical corrections are applied automatically by the service based on icon metadata (shape type, visual weight distribution) and typography metrics (ascent, descent, cap height). The service exposes a correction API:

```typescript
interface IVisualPolishService {
  // Get the optical alignment correction for an icon-text pair
  getOpticalCorrection(config: OpticalAlignmentConfig): OpticalCorrection;

  // Validate that all icons on a surface use consistent sizing and alignment
  validateSurfaceAlignment(container: HTMLElement): AlignmentValidationResult;
}
```

---

## Typography Scale

The typography scale defines every legal font size in the product. No other sizes are permitted in UI surfaces. This scale was designed to create a clear, stepwise hierarchy where each level is distinguishable from its neighbors without creating jarring size jumps.

| Level | Size | Usage |
|-------|------|-------|
| **Caption** | 11px | Metadata labels, timestamps, micro-copy, badge text |
| **Small** | 12px | Secondary text, tab labels, list item descriptions |
| **Body** | 13px | Primary body text, menu items, status bar, form labels |
| **Large** | 14px | Emphasized body text, editor suggestions, input text |
| **Title** | 16px | Panel headers, section titles, dialog titles |
| **Headline** | 20px | Major section headings, feature titles |
| **Display** | 24px | Hero text, onboarding headlines |
| **Hero** | 32px | Full-screen messages, splash text, marketing moments |

### Typography Scale Rules

1. **No intermediate sizes**: 15px, 17px, 18px, 19px are all violations. The scale is deliberately sparse to prevent "font size drift" where each surface slightly increases its text size.
2. **Context determines level**: The same text content should use the same size regardless of which surface renders it. A panel header is always Title (16px), never Headline (20px) just because the panel is wide.
3. **Maximum two sizes per surface**: A surface should use at most two typography sizes — one for primary content and one for secondary/meta content. Three sizes are acceptable only for complex panels. Four or more is a violation.

---

## Typography Weights

| Weight | Value | Usage |
|--------|-------|-------|
| **Regular** | 400 | Body text, descriptions, metadata, secondary content |
| **Medium** | 500 | Labels, emphasized text, action links, input text |
| **SemiBold** | 600 | Panel headers, section titles, state titles |
| **Bold** | 700 | Major headings, hero text, onboarding headlines |

### Weight Rules

1. **Regular is the default**: Every text element starts at Regular unless it has a specific reason to be heavier.
2. **Weight must justify itself**: Every use of SemiBold or Bold must serve a clear hierarchy purpose. If removing the weight would not make the hierarchy less clear, the weight is unnecessary and should be Regular.
3. **Never use Light (300) or ExtraBold (800)**: These weights are not in the scale. Light feels anemic in a code editor context. ExtraBold feels heavy-handed.
4. **Weight escalation is progressive**: A surface with Bold titles should use SemiBold for subtitles and Regular for body. Jumping from Regular to Bold (skipping SemiBold) creates a hierarchy gap.

---

## Typography Rhythm Properties

Rhythm is the vertical and horizontal pacing of text. Consistent rhythm creates a feeling of order and intentionality; inconsistent rhythm creates a feeling of chaos. The `IVisualPolishService` enforces rhythm through six properties:

| Property | Description | Calculation |
|----------|-------------|-------------|
| **lineHeight** | The vertical space allocated for each line of text | `Math.ceil(size × lineHeightRatio)` — Tight: 1.2, Normal: 1.4, Relaxed: 1.6 |
| **letterSpacing** | The horizontal spacing between characters | Caption: 0.02em, Small: 0.01em, Body+: 0em (default) |
| **marginBottom** | The space below a text block before the next element | `lineHeight × 0.5` for same-level elements; `lineHeight × 1.0` for hierarchy transitions |
| **marginTop** | The space above a text block after a preceding element | Typically 0 (use marginBottom of preceding element) — non-zero only for titled sections |
| **maxWidth** | The maximum horizontal extent of a text block | Body: 600px, Title: 480px, Headline: 400px, Display: 360px, Hero: 320px |
| **truncationStrategy** | How text behaves when it exceeds its container | `ellipsis` for single-line, `fade` for multi-line (3-line max), `clamp` for code blocks |

### Rhythm Rules

1. **Line height is not arbitrary**: Every text element must use one of the three defined line height ratios. Custom line heights are violations.
2. **Letter spacing is minimal**: Body text and above use zero letter spacing. Only Caption and Small use positive letter spacing, and only at 0.01–0.02em. Never use negative letter spacing.
3. **Vertical rhythm is mathematical**: The space between text elements is always a multiple of the line height, never an arbitrary pixel value. This creates a consistent visual "beat" throughout the interface.
4. **Max width prevents line fatigue**: No text block should exceed its maximum width. Long lines are harder to read and create visual imbalance. Text must wrap or truncate at the maxWidth boundary.
5. **Truncation is graceful**: Ellipsis truncation is used for single-line contexts (file names, titles, labels). Fade truncation is used for multi-line contexts (descriptions, AI messages). Never clip text without indicating truncation.

---

## Typography Should Feel: Confident and Premium

The cumulative effect of the typography system is a feeling of confidence and premium quality. Confident typography is not loud — it is precise. It uses weight with intention, size with purpose, and spacing with discipline. Premium typography is not ornate — it is considered. Every font size has a reason, every weight has a justification, every margin has a calculation.

When someone reads text in Real Vibecode, they should never think about the typography. They should simply find it effortless to scan, easy to parse, and pleasant to read. The typography disappears into the experience, which is the ultimate sign of quality — when the medium is so well-executed that the user only notices the message.

---

## Service Interface

```typescript
interface IVisualPolishService {
  // Resolve the correct icon stroke weight for a given context
  resolveStrokeWeight(context: IconContext): IconStrokeWeight;

  // Resolve the correct icon size tier for a given context
  resolveIconSize(context: IconContext): IconSizeTier;

  // Get the optical alignment correction for an icon-text pair
  getOpticalCorrection(config: OpticalAlignmentConfig): OpticalCorrection;

  // Validate that a surface's iconography is consistent
  validateIcons(container: HTMLElement): IconValidationResult;

  // Validate that a surface's typography follows the rhythm system
  validateTypography(container: HTMLElement): TypographyValidationResult;

  // Apply polish corrections to a rendered surface
  applyPolish(container: HTMLElement): IDisposable;
}
```

---

## Reference

- **Source**: `src/vs/workbench/services/productionSurface/common/productionSurface.ts`
- **Service**: `IVisualPolishService` (DI singleton #47)
- **Enums**: `IconStrokeWeight`, `IconSizeTier`, `TypographyLevel`, `TypographyWeight`, `LineHeightRatio`, `TruncationStrategy`
- **Types**: `IconContext`, `OpticalAlignmentConfig`, `OpticalCorrection`, `TypographyRhythmProperties`, `IconValidationResult`, `TypographyValidationResult`
