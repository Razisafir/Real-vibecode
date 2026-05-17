# Workbench Shell Architecture

> **Phase 15 — Production Surface Rebuild**
> Service: `IWorkbenchShellService`

## Overview

The Workbench Shell is the structural skeleton of the entire IDE experience. It defines how regions relate to each other spatially, how density is distributed across the viewport, and how the user's attention flows from the periphery toward the editor. The `IWorkbenchShellService` governs premium window framing, balanced density, unified spacing rhythm, visual silence between regions, layered surfaces, subtle depth hierarchy, adaptive shell spacing, and responsive layout intelligence.

The shell is not a container — it is a choreography of surfaces. Every pixel of padding, every gap between panels, every border weight is deliberate. The result should feel like a single, cohesive instrument rather than a collection of docked widgets.

---

## Shell Region Map

The workbench shell is divided into eight canonical regions. Each region has defined spatial relationships, density behavior, and visual silence rules.

```
┌──────────────────────────────────────────────────────────────────────┐
│  TitleBar                                                            │
├────┬─────────────────────────────────────────────┬───────────┬───────┤
│    │                                             │           │       │
│ A  │         EditorContainer                     │ Secondary │  B    │
│ c  │         (Dominant Visual Weight)             │ Sidebar   │  o    │
│ t  │                                             │           │  t    │
│ i  │                                             │           │  t    │
│ v  │                                             │           │  o    │
│ i  │                                             │           │  m    │
│ t  │                                             │           │       │
│ y  │                                             │           │ P    │
│ B  │                                             │           │ a    │
│ a  │                                             │           │ n    │
│ r  │                                             │           │ e    │
│    │                                             │           │ l    │
├────┴─────────────────────────────────────────────┴───────────┴───────┤
│  BottomPanel                                                         │
├──────────────────────────────────────────────────────────────────────┤
│  StatusBar ··················· CommandSurface                         │
└──────────────────────────────────────────────────────────────────────┘
```

### Region Descriptions

| Region | Role | Visual Weight | Z-Index Tier |
|---|---|---|---|
| **TitleBar** | Window controls, breadcrumb trail, global actions | Low — framing only | 100 |
| **ActivityBar** | Primary navigation icons, workspace switcher | Low — peripheral | 90 |
| **PrimarySidebar** | File explorer, search, source control, extensions | Medium — contextual | 80 |
| **EditorContainer** | Code editing surface, tab groups, diff views | **Dominant — primary** | 50 |
| **SecondarySidebar** | AI assistant, auxiliary panels | Medium — supplementary | 80 |
| **BottomPanel** | Terminal, output, problems, debug console | Medium — utility | 70 |
| **StatusBar** | Mode indicators, language, encoding, branch | Low — informational | 110 |
| **CommandSurface** | Command palette, search overlay, quick actions | Overlay — transient | 200 |

---

## Spacing Rhythm

The shell enforces a strict spacing rhythm based on an 8px base unit. All spacing values are derived from this grid to ensure visual coherence across every region boundary, padding zone, and internal layout.

### Rhythm Tokens

| Token | Value | Usage |
|---|---|---|
| **Unit** | 8px | Base grid — all values are multiples or fractions of this |
| **Micro** | 2px | Icon padding, inline badge offsets, tight internal gaps |
| **Small** | 4px | List item padding, compact control spacing, sub-element gaps |
| **Medium** | 8px | Standard padding, section gaps, control-to-label distance |
| **Large** | 12px | Panel internal padding, sidebar section separators |
| **XL** | 16px | Region-to-region breathing room, panel header padding |
| **XXL** | 24px | Major region boundaries, modal content padding, onboarding spacing |

### Rhythm Application Rules

1. **No arbitrary values.** Every spacing decision must trace back to a rhythm token. If a gap feels "off," adjust the design to fit the system — never adjust the system to fit a one-off gap.
2. **Consistent intra-region spacing.** Within any single region, spacing follows the same token set. A sidebar section uses the same `Medium` internal padding as a bottom panel section.
3. **Inter-region spacing uses visual silence.** Gaps between major regions are not "padding" — they are intentional visual silence. See the Visual Silence section below.
4. **Sub-pixel alignment.** All spacing must resolve to whole pixels on standard displays. Fractional values are forbidden at layout boundaries.

---

## Visual Silence

Visual silence is the deliberate use of empty space between major shell regions to create perceptual separation without relying on borders, dividers, or color changes. It is the most important spatial quality of the premium shell.

### Silence Rules by Boundary

| Boundary | Gap | Border | Rationale |
|---|---|---|---|
| EditorContainer ↔ PrimarySidebar | 1px | None | Minimal separation — editor reads as continuous surface |
| EditorContainer ↔ SecondarySidebar | 1px | None | Same as primary — symmetry of silence |
| EditorContainer ↔ BottomPanel | 1px | None | Clean break without visual noise |
| TitleBar ↔ Everything Below | 0px | 1px subtle line | Title bar is a hard boundary — one line is sufficient |
| ActivityBar ↔ PrimarySidebar | 0px | None | Activity bar and sidebar are one visual column |
| BottomPanel ↔ StatusBar | 0px | None | Status bar is a hard floor — no gap needed |
| StatusBar (left ↔ right) | Flexible | None | Content determines spacing within the bar |

### Silence Principles

- **1px gaps are borders made of air.** They separate without dividing. The eye perceives two distinct surfaces but does not register a "line."
- **0px gaps are intentional fusion.** When two regions share a boundary with no gap, they are meant to be read as a single visual mass (e.g., ActivityBar + Sidebar).
- **Never use decorative dividers.** If a separator is needed, use a 1px gap of background color — never a colored line, shadow, or gradient.

---

## Density Options

The shell supports four density modes that scale padding, font sizes, icon sizes, and gap widths proportionally. Density is not just "more or less space" — it is a cognitive load decision.

| Density | Padding Scale | Font Scale | Icon Scale | Gap Scale | Target User |
|---|---|---|---|---|---|
| **Compact** | 0.75× | 0.875× | 0.8× | 0.75× | Power users on small screens, maximum information density |
| **Balanced** | 1.0× | 1.0× | 1.0× | 1.0× | Default — optimal for most developers |
| **Spacious** | 1.25× | 1.0× | 1.1× | 1.25× | Presentations, onboarding, accessibility needs |
| **Adaptive** | Dynamic | Dynamic | Dynamic | Dynamic | Responds to screen size, input method, and user behavior |

### Adaptive Density Logic

The `Adaptive` density mode uses the following signals to adjust density in real time:

- **Viewport width** — narrower viewports automatically compress to Compact
- **Input method** — touch input expands to Spacious; mouse/keyboard stays Balanced
- **User expertise** — detected via interaction frequency, Expert Mode users may auto-compact
- **Content load** — panels with many items compress internal spacing to maintain scanability

---

## Responsive Layout Intelligence

The shell must respond gracefully to viewport changes without jarring reflows. The following breakpoint system governs layout transitions:

| Breakpoint | Viewport Width | Layout Behavior |
|---|---|---|
| **Narrow** | < 768px | Single column: ActivityBar collapses to icons-only, sidebars overlay, BottomPanel is a sheet |
| **Standard** | 768–1279px | Two column: PrimarySidebar or SecondarySidebar (not both), Editor + BottomPanel share vertical space |
| **Wide** | 1280–1919px | Full layout: all regions visible, standard density |
| **Ultra-wide** | ≥ 1920px | Full layout with generous spacing, optional side-by-side editor + AI panel |

### Layout Transitions

Layout transitions between breakpoints are animated using the Cinematic Motion System (see `cinematic-motion.md`). Transitions use `Structural` weight with `Orchestrated` choreography — regions move in a deliberate sequence that preserves spatial memory.

---

## Anti-Patterns

The following patterns violate the shell's design principles and must be avoided:

### Cluttered Dashboard

```
┌──────────────────────────────────────────┐
│ [Stats][Metrics][Activity][Feed][Charts] │  ← WRONG: information overload
│ [Recent] [Pinned] [AI Tips] [Welcome]   │  ← WRONG: competing surfaces
│                                          │
│ Editor (cramped)                         │  ← WRONG: editor is subordinate
└──────────────────────────────────────────┘
```

The shell is not a dashboard. It is a workspace. The editor must always be the dominant surface. Summary widgets, metrics, and activity feeds belong in sidebar panels or the CommandSurface — never in the editor's visual territory.

### Random Spacing

Mixing `7px`, `11px`, `15px`, `23px` gaps arbitrarily creates visual noise. Every gap must resolve to a rhythm token. If the design calls for a `7px` gap, use `8px` (Medium) instead and adjust the internal layout to accommodate the system.

### Harsh Separators

Thick borders, bright dividers, or double-line separators between regions break the principle of visual silence. Regions should separate through surface material differences and air gaps — never through drawn lines. A `2px` solid border between the sidebar and editor is a visual scream in a space that should whisper.

### Inconsistent Density

Using Compact spacing in the sidebar while the editor area uses Spacious spacing creates a dissonant experience. Density is a global property with local overrides — the base density must be consistent, and any overrides must be intentional and documented.

---

## Service Interface

```typescript
interface IWorkbenchShellService {
  readonly _serviceBrand: undefined;

  // Current density mode
  readonly density: ShellDensity;
  setDensity(mode: ShellDensity): void;

  // Active shell regions and their visibility
  readonly regions: ReadonlyMap<ShellRegion, ShellRegionState>;

  // Spacing rhythm resolver — returns the pixel value for a given token at current density
  resolveSpacing(token: SpacingToken): number;

  // Visual silence gap between two adjacent regions
  getSilenceGap(regionA: ShellRegion, regionB: ShellRegion): number;

  // Responsive breakpoint
  readonly currentBreakpoint: LayoutBreakpoint;

  // Event: density changed
  onDidChangeDensity: Event<ShellDensity>;

  // Event: layout breakpoint changed
  onDidChangeBreakpoint: Event<LayoutBreakpoint>;

  // Event: region visibility changed
  onDidChangeRegionState: Event<ShellRegion>;
}

type ShellDensity = 'compact' | 'balanced' | 'spacious' | 'adaptive';
type ShellRegion = 'titlebar' | 'activitybar' | 'primary-sidebar' | 'editor-container' | 'secondary-sidebar' | 'bottom-panel' | 'statusbar' | 'command-surface';
type SpacingToken = 'unit' | 'micro' | 'small' | 'medium' | 'large' | 'xl' | 'xxl';
type LayoutBreakpoint = 'narrow' | 'standard' | 'wide' | 'ultra-wide';

interface ShellRegionState {
  visible: boolean;
  width: number | 'auto';
  height: number | 'auto';
  collapsed: boolean;
  overlayMode: boolean;
}
```

---

## Design Principles Summary

1. **The shell is invisible when it works.** A perfectly designed shell is one the user never notices — they only notice the content they are working with.
2. **Spacing is a design material.** Empty space is not "wasted" — it is the medium through which regions communicate hierarchy and relationship.
3. **Consistency creates trust.** When every gap follows the same rhythm, the user subconsciously trusts the spatial logic of the entire interface.
4. **Density is a cognitive decision.** Compact mode is not "better for experts" — it is a trade-off between information density and visual comfort that the user should control.
5. **Visual silence is premium.** The absence of borders, dividers, and visual clutter is what separates a professional tool from a prototype.
