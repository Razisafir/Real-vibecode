# Premium Surface Material System

> **Phase 15 — Production Surface Rebuild**
> Service: `ISurfaceMaterialService`

## Overview

Surfaces are the visual fabric of the IDE. Every region — the editor background, sidebar panels, modal overlays, status bars — is a surface with material properties that communicate hierarchy, depth, and purpose. The `ISurfaceMaterialService` governs layered surface materials, subtle translucency, intelligent blur usage, premium border rendering, adaptive contrast balancing, and contextual elevation.

The goal is not decoration — it is *perceptual engineering*. A well-designed surface system lets the user's visual system instantly parse what is base content, what is supplementary, what is transient, and what demands attention. The materials must feel solid, calm, and expensive — like the interior of a precision instrument, not a brochure.

---

## Elevation Hierarchy

Every surface in the shell exists at a specific elevation level. Elevation is not just a Z-index — it is a combination of background brightness, border treatment, shadow presence, and translucency that together communicate how "close" a surface is to the user.

| Elevation Level | Z-Range | Background | Border | Shadow | Blur | Translucency | Use Cases |
|---|---|---|---|---|---|---|---|
| **Base** | 0–49 | Darkest / most saturated | Subtle 1px | None | None | Off | Editor background, sidebar background, status bar |
| **Raised** | 50–89 | +3–5% luminance from Base | 1px, low opacity | Micro (0 1px 2px) | None | Off | Panel headers, active tab, focused sidebar section |
| **Overlay** | 90–149 | +5–8% luminance from Base | 1px, medium opacity | Small (0 2px 8px) | Optional 4px | Optional 5% | Command palette, search overlay, dropdown menus |
| **Sticky** | 150–189 | +3–5% + blur | 1px, medium opacity | None | 8–12px | 8–12% | Sticky headers, pinned toolbars, floating breadcrumbs |
| **Modal** | 190–220 | +8–12% + blur | 1px, higher opacity | Medium (0 4px 16px) | 16–24px | 12–18% | Settings modal, confirmation dialog, onboarding overlay |

### Elevation Rules

1. **Elevation is earned, not assumed.** A surface is elevated only when it genuinely needs to appear closer to the user. A sidebar section header that is always visible stays at Base; a dropdown menu that appears on demand jumps to Overlay.
2. **Shadow scales with elevation distance.** Base surfaces cast no shadow. Overlay surfaces cast a subtle shadow. Modal surfaces cast a clear shadow. The shadow should feel like a natural consequence of a surface floating above another — not a decoration.
3. **Blur and translucency are reserved for Overlay and above.** Base and Raised surfaces are always opaque. Translucency is a signal that something is floating above primary content — it must not be used gratuitously.
4. **Background luminance increases with elevation but never exceeds comfort.** The brightest surface in the system (Modal at +12%) is still significantly darker than white. The IDE is a dark-surface environment; brightness is a tool, not a default.

---

## Material Properties

Each surface material is defined by the following property set. The service resolves these properties based on the current theme, elevation level, and context.

```typescript
interface SurfaceMaterial {
  // Background
  backgroundOpacity: number;       // 0.0–1.0, typically 0.85–1.0 for Base
  backgroundBlend: 'normal' | 'overlay';  // Blend mode for layered surfaces

  // Blur
  blurAmount: number;              // 0–30px, backdrop-filter blur radius
  blurQuality: 'auto' | 'high';   // Performance-quality tradeoff

  // Border
  borderColor: string;            // Resolved from theme tokens
  borderOpacity: number;          // 0.0–0.3 — borders are always subtle
  borderWidth: number;            // 0–1px — never thicker than 1px
  borderRadius: number;           // 0–8px — only for Overlay and above

  // Shadow
  shadowSpread: number;           // 0–4px — shadow spread radius
  shadowOpacity: number;          // 0.0–0.3 — shadows are always soft
  shadowBlur: number;             // 2–16px — shadow Gaussian radius
  shadowOffsetY: number;          // 1–4px — always downward

  // Gradient
  gradientFrom: string | null;    // Starting color for subtle gradient
  gradientTo: string | null;      // Ending color — null means flat fill
  gradientAngle: number;          // 180–220° — only subtle vertical-ish gradients
  gradientOpacity: number;        // 0.0–0.15 — gradients are whispers, not statements

  // Translucency
  translucencyEnabled: boolean;   // Only true for Overlay+
  translucencyAmount: number;     // 0.0–0.2 — see-through percentage

  // Contrast
  contrastLevel: 'subdued' | 'normal' | 'elevated';
  contrastAdaptive: boolean;      // Adjusts based on surrounding content
}
```

### Property Defaults by Elevation

| Property | Base | Raised | Overlay | Sticky | Modal |
|---|---|---|---|---|---|
| `backgroundOpacity` | 1.0 | 1.0 | 0.92 | 0.88 | 0.85 |
| `blurAmount` | 0 | 0 | 4 | 10 | 20 |
| `borderOpacity` | 0.06 | 0.08 | 0.12 | 0.10 | 0.15 |
| `borderWidth` | 1 | 1 | 1 | 1 | 1 |
| `shadowSpread` | 0 | 0 | 0 | 0 | 2 |
| `shadowOpacity` | 0 | 0.05 | 0.10 | 0 | 0.20 |
| `gradientOpacity` | 0 | 0.03 | 0.05 | 0.05 | 0.08 |
| `translucencyEnabled` | false | false | false | true | true |
| `translucencyAmount` | 0 | 0 | 0 | 0.08 | 0.15 |
| `contrastLevel` | subdued | normal | elevated | normal | elevated |

---

## Border Rendering Philosophy

Borders in this system are *anti-borders*. Their purpose is not to enclose or frame — it is to create the faintest perceptual edge between surfaces that otherwise share similar luminance. A well-rendered border is one the user's peripheral vision registers but their conscious attention does not.

### Border Rules

1. **Maximum 1px width.** Thicker borders are visual noise. If two surfaces need stronger separation, use a gap (visual silence) or a luminance step instead.
2. **Opacity never exceeds 0.15.** Borders are hints, not walls. At normal viewing distance, a 1px border at 0.10 opacity should be barely visible.
3. **Border color is always derived from the foreground color at low opacity.** Never use a hardcoded border color — derive it from the theme's foreground token at 6–15% opacity.
4. **No border radius on Base surfaces.** Base surfaces fill their region entirely. Border radius is reserved for Overlay and Modal surfaces that float above the grid.
5. **Consistent border treatment within an elevation tier.** All Raised surfaces share the same border style. Mixing border opacities or colors within a tier creates visual incoherence.

---

## Adaptive Contrast Balancing

Surfaces must adapt their contrast based on the surrounding content. A panel header next to bright code needs slightly stronger borders; the same header next to a dark terminal needs softer borders. The `ISurfaceMaterialService` resolves this dynamically.

### Contrast Signals

| Signal | Effect |
|---|---|
| Adjacent surface luminance | Higher adjacent luminance → slightly higher border opacity |
| Content density | Dense content (many colors/icons) → subdued contrast to avoid competition |
| Focus state | Focused surface → elevated contrast, slightly brighter background |
| Theme (dark/light) | Dark themes: borders are lighter foreground; Light themes: borders are darker foreground |

### Contrast Formula

```
effectiveBorderOpacity = baseBorderOpacity
  × (1 + luminanceDelta × 0.3)
  × (1 - contentDensity × 0.15)
  × (isFocused ? 1.3 : 1.0)
```

Where `luminanceDelta` is the normalized brightness difference between the surface and its neighbor, and `contentDensity` is a 0–1 measure of visual complexity in the adjacent region.

---

## Before / After Philosophy

### Before: Standard IDE Surface Treatment

Typical IDEs treat surfaces as flat colored rectangles with hard 1px borders at full opacity. Every panel is a box. Every separator is a line. The result feels like a wireframe with paint — functional but lifeless. Surfaces compete for attention because they all share the same visual weight.

### After: Premium Surface Material System

With the material system, surfaces become a layered instrument. The editor sits at Base — deep, solid, immovable. Sidebar panels sit at Raised — a slight luminance lift that reads as "supporting content." Overlays float above with a whisper of translucency and blur that makes them feel physically closer to the user. The hierarchy is immediate and unconscious: the user's visual system parses the scene without effort.

The shift is from *geometric layout* to *perceptual depth*. The interface feels three-dimensional not because of aggressive 3D effects, but because the materials communicate real spatial relationships.

---

## Anti-Patterns

### Glassmorphism Spam

Applying blur and translucency to every surface — Base panels with 20px blur, 30% translucency, and colored gradients bleeding through from behind. This destroys readability, murders performance, and looks like a design student's first Figma experiment. Translucency is reserved for Overlay and above. Base surfaces are solid. Period.

### Aggressive Shadows

Large, dark shadows on every panel. A Raised panel with a `0 8px 32px rgba(0,0,0,0.4)` shadow creates a dramatic, floating effect that is appropriate for a landing page hero element and completely wrong for a developer tool. Shadows in this system are micro-assertions of depth, not dramatic lighting effects. Maximum shadow opacity is 0.20. Maximum shadow blur is 16px. These are non-negotiable limits.

### Hard Edges

Sharp color transitions between surfaces with no border, no gap, and no luminance difference. Two surfaces at the same elevation with the same background color but different purposes should be differentiated by at least a subtle border or a luminance step. The user should never have to guess where one surface ends and another begins.

### Gradient Overload

Applying prominent gradients to Base surfaces — a sidebar that fades from deep blue to purple, an editor background with a warm-to-cool sweep. Gradients in this system are limited to `gradientOpacity: 0.15` maximum. They should be felt, not seen. If a user can consciously identify the gradient direction, it is too strong.

---

## Service Interface

```typescript
interface ISurfaceMaterialService {
  readonly _serviceBrand: undefined;

  // Resolve the full material for a given elevation and context
  resolveMaterial(elevation: SurfaceElevation, context: SurfaceContext): SurfaceMaterial;

  // Get the current theme's base luminance (used for adaptive contrast)
  readonly baseLuminance: number;

  // Observe material changes (theme switch, density change)
  onDidChangeMaterial: Event<SurfaceElevation>;

  // Performance: check if blur is supported and viable
  readonly blurSupported: boolean;
  readonly blurPerformanceTier: 'high' | 'medium' | 'low';

  // Force-refresh all surfaces (theme change)
  refreshAllSurfaces(): void;
}

type SurfaceElevation = 'base' | 'raised' | 'overlay' | 'sticky' | 'modal';

interface SurfaceContext {
  region: ShellRegion;
  adjacentLuminance: number;
  contentDensity: number;    // 0–1
  isFocused: boolean;
  isHovered: boolean;
}
```

---

## Design Principles Summary

1. **Surfaces feel solid.** Base and Raised surfaces are opaque, stable, and grounded. They are the foundation the user builds trust in.
2. **Surfaces feel calm.** No aggressive shadows, no prominent gradients, no decorative effects. Every visual element serves a perceptual purpose.
3. **Surfaces feel expensive.** The restraint itself communicates quality. A 1px border at 8% opacity says "we considered every pixel" more than a 3px border at full opacity ever could.
4. **Depth is information.** Elevation communicates hierarchy. The user should be able to parse which surfaces are base content, which are supporting, and which are transient — without reading a single label.
5. **Adaptive, not static.** Surfaces respond to their context. A panel border softens when adjacent to calm content and strengthens when adjacent to bright, competing content. The system is alive to its environment.
