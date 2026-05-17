# Professional UI System

Phase 23. What exists. What does not.

## What Phase 23 Delivers

- SVG icon system (86 icons, 8 categories)
- Design token definitions (spacing, typography, radius, elevation, motion, opacity, colors)
- Component standards (10 component types with pixel-accurate specs)

## What Is Real

All values below are actual definitions in the service layer.

**Icons**: 86 SVG icons. Each has a real `<path>` element with concrete `d` attribute values. No placeholders.

**Spacing tokens** (CSS custom property `--spacing-{name}`):
| Token | Value |
|-------|-------|
| xs    | 2px   |
| sm    | 4px   |
| md    | 8px   |
| lg    | 12px  |
| xl    | 16px  |
| 2xl   | 20px  |
| 3xl   | 24px  |
| 4xl   | 32px  |
| 5xl   | 40px  |
| 6xl   | 48px  |

**Typography tokens**: 6 sizes (11px through 20px), 3 weights (400, 500, 600).

**Radius tokens**: 4 values (2px, 4px, 6px, 8px).

**Elevation tokens**: 4 levels (0 through 3).

**Motion tokens**: 6 durations (0ms through 300ms), 3 easing curves.

**Opacity tokens**: 9 values (0 through 1.0).

**Color tokens**: Dark-first palette with specific hex values (see design-token-system.md).

**Component specs**: 10 component types with exact pixel dimensions (see ui-standardization.md).

## What Is NOT Real Yet

These tokens exist as TypeScript definitions in the service layer. They are **not yet wired to VS Code's CSS output pipeline**. The custom properties are defined but not injected into the DOM at runtime. Components reference these tokens by name, but the actual CSS cascade does not consume them yet.

In other words: the vocabulary exists. The plumbing does not.

## Counts

| Category       | Count |
|---------------|-------|
| SVG icons      | 86    |
| Spacing tokens | 10    |
| Typography sizes | 6   |
| Typography weights | 3 |
| Radius tokens  | 4     |
| Elevation tokens | 4   |
| Motion durations | 6   |
| Motion easings | 3     |
| Opacity tokens | 9     |
| Color tokens   | dark-first palette (see design-token-system.md) |
| Component types | 10   |

## Limitation

These are service-level definitions. They describe what the UI should look like. They do not yet control what the UI actually looks like, because they are not injected into VS Code's CSS pipeline at runtime. This is a definition layer, not a rendering layer.
