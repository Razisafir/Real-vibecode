# Production Quality Guidelines

> Phase 15 — Production Surface Rebuild
> Runtime Production Quality Enforcement via IProductionUXValidationService

---

## Overview

The `IProductionUXValidationService` is the runtime quality enforcement layer that ensures every visible surface in Real Vibecode meets production-grade standards. It is not a design system — the design system (Phase 12) defines the rules. It is not a feel service — the signature product feel (Phase 15) defines the emotional target. It is the enforcement mechanism that catches violations of both, at runtime, in the actual rendered product.

Production quality is not a one-time audit. It is a continuous, automated process that evaluates the visible state of the interface and identifies violations that would degrade the user experience. Every violation is classified, scored, and reported. Critical violations trigger immediate dev-mode warnings. Non-critical violations accumulate into a coherence score that tracks the overall quality of the product surface.

This service exists because the gap between "designed correctly" and "rendered correctly" is enormous. Design tokens can be defined perfectly, motion curves can be specified precisely, and typography scales can be documented exhaustively — but if a single component uses a raw hex color instead of a semantic token, or if a single panel opens with a pop animation instead of an emerge, the entire product surface degrades. The `IProductionUXValidationService` is the safety net that catches these regressions before they reach the user.

---

## Violation Types

The service detects 10 categories of production quality violations. Each violation type represents a specific way that the product surface can degrade below production standards.

### 1. ClutterDensity

**Description**: A surface contains too many visual elements for its area, creating a cramped, overwhelming impression. Clutter density is measured as the ratio of painted pixels to total surface area, excluding whitespace. When this ratio exceeds the threshold, the surface fails the density check.

**Threshold**: Maximum painted-pixel ratio of 0.45 for standard surfaces, 0.35 for panels, 0.25 for overlay surfaces.

**Common causes**: Too many status indicators in a single row. Excessive inline icons. Dense data tables without adequate row spacing. Toolbars with too many buttons.

**Remediation**: Reduce element count. Increase spacing. Collapse secondary information. Apply progressive disclosure to defer non-essential elements.

### 2. VisualImbalance

**Description**: A surface has asymmetric visual weight that creates a feeling of instability or misalignment. Visual imbalance is measured by comparing the visual weight (combination of element size, color contrast, and position) of the left half versus the right half, and the top half versus the bottom half.

**Threshold**: Maximum visual weight asymmetry of 0.15 (15% difference between halves).

**Common causes**: A large icon on one side with no counterbalancing element. A block of text on the left with whitespace on the right. A status bar that is denser on one end.

**Remediation**: Add counterbalancing elements. Distribute visual weight symmetrically. Use centered layouts for content-heavy surfaces.

### 3. AIOverDominance

**Description**: An AI surface occupies too much visual space relative to the editor or produces too many simultaneous visual signals. AI over-dominance is the most critical violation because it directly undermines the editor-first philosophy.

**Threshold**: AI surfaces must not exceed 25% of the viewport area when active. No more than 2 AI visual signals (indicators, badges, highlights) may be simultaneously visible. AI text must not exceed 3 lines without user expansion.

**Common causes**: An AI panel that opens at full width. Multiple AI status indicators competing for attention. An AI suggestion that includes a full paragraph of explanation.

**Remediation**: Reduce AI panel width. Collapse AI suggestions to a single line. Defer secondary AI signals. Use the deferential visual tone specified in the signature product feel.

### 4. ExcessiveMotion

**Description**: A surface or state change uses too many simultaneous animations, or animations that are too long, too dramatic, or too frequent. Excessive motion creates a feeling of chaos and undermines the calm dimension.

**Threshold**: Maximum 2 simultaneous animations per surface. Maximum total animation duration of 600ms per state change. No looping animations except gentle-pulse (2s cycle) and subtle-shimmer (1.5s cycle).

**Common causes**: A panel that slides, fades, and scales simultaneously. A loading state with a spinning animation, a progress bar, and a pulsing text indicator. A notification that bounces on entry.

**Remediation**: Choose one primary animation per state change. Reduce animation durations. Replace looping animations with static states where possible.

### 5. InconsistentSpacing

**Description**: A surface uses spacing values that do not conform to the design system's spacing scale (4px base unit) or that are inconsistent within the same visual group. Inconsistent spacing is one of the most common and most damaging violations because it is immediately perceivable even if the user cannot identify the specific problem.

**Threshold**: All spacing values must be multiples of 4px. Elements in the same visual group (e.g., items in a list, buttons in a toolbar) must use identical spacing between them.

**Common causes**: A list with 8px gap between some items and 12px between others. A button with 8px left padding and 12px right padding. A panel with 20px section gaps instead of the 24px standard.

**Remediation**: Normalize all spacing to the design system scale. Use the spacing composition rules defined in the design system. Apply the 1.2× breath multiplier consistently.

### 6. HarshContrast

**Description**: A surface uses color combinations with excessive contrast that create harsh visual edges. This includes high-contrast borders, bright text on dark backgrounds without softening, and full-saturation status colors at large areas.

**Threshold**: Border colors must not exceed 40% contrast ratio against their parent surface. Status colors must use the subtle variant for backgrounds and borders. Text on dark backgrounds must use `TextPrimary` (#E4E6F0, not #FFFFFF).

**Common causes**: A pure white (#FFFFFF) border on a dark background. A full-red (#FF0000) error background. A high-contrast status badge with bright text on a saturated background.

**Remediation**: Use `BorderSubtle` or `BorderDefault` tokens instead of raw white. Use `StatusErrorSubtle` instead of `StatusError`. Use `TextPrimary` instead of `#FFFFFF`.

### 7. CompetingAccents

**Description**: A surface uses more than one accent color simultaneously, creating visual confusion about which element is most important. The product's accent system is built on a single primary accent (Indigo) with a secondary accent (Cyan) for specific, limited use. When both appear prominently on the same surface, the user cannot determine visual priority.

**Threshold**: Only one accent color may be prominent per surface. The secondary accent may appear only for specific, documented use cases (AI-related elements, secondary actions). No surface may use more than 2 accent colors.

**Common causes**: An AI panel with both Indigo and Cyan highlights. A toolbar with Indigo buttons and Cyan badges. A status bar with mixed accent-colored indicators.

**Remediation**: Choose one primary accent per surface. Use the secondary accent only for its designated purpose. Use monochrome (grayscale) for all non-accented emphasis.

### 8. VisualFragmentation

**Description**: A surface is divided into too many visually distinct sections, creating a fragmented, disjointed impression. Visual fragmentation prevents the user from perceiving the surface as a coherent whole and forces them to scan multiple disconnected regions.

**Threshold**: Maximum 4 visually distinct sections per surface. Sections must be separated by consistent spacing and optional subtle dividers — not by contrasting background colors or thick borders.

**Common causes**: A panel with 6+ sections each using a different background shade. A settings surface with multiple bordered "cards" in a list. A sidebar with dense group separators.

**Remediation**: Consolidate related sections. Remove unnecessary visual separators. Use spacing alone to separate sections. Group related elements into a single section with internal hierarchy.

### 9. UnreadableHierarchy

**Description**: A surface's visual hierarchy is unclear — the user cannot immediately determine which elements are most important, which are secondary, and which are tertiary. This is often caused by insufficient differentiation between hierarchy levels (e.g., all text at the same size and weight).

**Threshold**: Each surface must have at most 4 hierarchy levels (matching the `InfoLevel` system). Each level must differ from the next by at least one of: font size (+2px), font weight (+100), or opacity (-20%). Title elements must be visually distinct from body elements.

**Common causes**: A panel where the title, subtitle, and body text all use Body (13px) Regular. A list where the label and value have identical visual weight. A status indicator that is as prominent as the content it annotates.

**Remediation**: Apply the typography pairing rules from the design system. Use different weights for different hierarchy levels. Ensure titles are at least 2px larger than body text. Use `InfoLevel` opacity values for secondary and tertiary content.

### 10. PanelOverload

**Description**: Too many panels are simultaneously visible, creating a cluttered workspace that diminishes the editor's dominance. Panel overload is a layout-level violation that affects the entire viewport, not a single surface.

**Threshold**: Maximum 3 simultaneously visible panels (excluding the editor). Combined panel width must not exceed 40% of the viewport. No two panels of the same tier may be open simultaneously on the same side.

**Common causes**: Both the primary and secondary sidebars open plus a bottom panel. Two secondary panels stacked. A debug panel and an AI panel both open on the right side.

**Remediation**: Auto-collapse the lowest-priority panel when a new panel opens. Enforce the panel choreography rules (push mode, split layering, 40% max occupancy). Use tab-based consolidation for related panels.

---

## Coherence Scoring

The service computes a coherence score that quantifies the overall production quality of the visible interface. The score is composed of four sub-scores, each measuring a different aspect of quality:

### clutterScore (0.0 – 1.0)

Measures the overall density and noise level of the visible interface. A score of 1.0 means the interface is perfectly clean — no clutter, no unnecessary elements, no visual noise. A score of 0.0 means the interface is maximally cluttered.

**Calculation**: Average of all surface density ratios, inverted and normalized. Each `ClutterDensity` violation reduces the score by 0.1. Each `VisualFragmentation` violation reduces the score by 0.15. Each `PanelOverload` violation reduces the score by 0.2.

### balanceScore (0.0 – 1.0)

Measures the visual balance and symmetry of the interface. A score of 1.0 means the interface is perfectly balanced. A score of 0.0 means the interface is maximally imbalanced.

**Calculation**: Average of all surface visual weight asymmetries, inverted and normalized. Each `VisualImbalance` violation reduces the score by 0.15. Each `CompetingAccents` violation reduces the score by 0.1.

### hierarchyScore (0.0 – 1.0)

Measures the clarity and readability of the visual hierarchy. A score of 1.0 means the hierarchy is perfectly clear — every element's importance is immediately apparent. A score of 0.0 means the hierarchy is completely unreadable.

**Calculation**: Average of all surface hierarchy differentiation scores. Each `UnreadableHierarchy` violation reduces the score by 0.2. Each `InconsistentSpacing` violation reduces the score by 0.1. Each `HarshContrast` violation reduces the score by 0.1.

### restraintScore (0.0 – 1.0)

Measures the overall restraint of the interface — whether it uses the minimum necessary visual weight, motion, and color. A score of 1.0 means the interface is perfectly restrained. A score of 0.0 means the interface is maximally unrestrained.

**Calculation**: Average of motion count, accent usage, and animation duration scores. Each `ExcessiveMotion` violation reduces the score by 0.15. Each `AIOverDominance` violation reduces the score by 0.2. Each `CompetingAccents` violation reduces the score by 0.1.

### overallCoherenceScore (0.0 – 1.0)

The weighted average of all four sub-scores:

```
overallCoherenceScore = (
  clutterScore × 0.25 +
  balanceScore × 0.25 +
  hierarchyScore × 0.25 +
  restraintScore × 0.25
)
```

---

## Critical Violation Handling

Certain violations are classified as **critical** and require immediate attention:

| Violation | Critical Condition |
|-----------|--------------------|
| `AIOverDominance` | AI surface exceeds 40% of viewport |
| `PanelOverload` | Combined panel width exceeds 60% of viewport |
| `ExcessiveMotion` | More than 4 simultaneous animations |
| `HarshContrast` | Pure #FFFFFF border on dark background |
| `UnreadableHierarchy` | Title and body use identical size and weight |

When a critical violation is detected:

1. The service logs a console warning with the violation details and the surface that triggered it.
2. In development mode, a non-blocking overlay appears on the violating surface indicating the violation type.
3. The violation is reported to the `Phase15ValidationService` for inclusion in the validation report.
4. The `overallCoherenceScore` is immediately reduced by 0.3 regardless of other scores.

---

## Dev Mode Warnings

In development mode (`window.__RVB_DEV__ === true`), the service provides additional visual feedback:

1. **Surface outlines**: Surfaces with violations are outlined with a dashed border in the violation's severity color (amber for warning, red for critical).
2. **Violation tooltips**: Hovering over a violating surface shows a tooltip with the violation type, description, and remediation steps.
3. **Score badge**: A small badge in the bottom-right corner of the viewport shows the current `overallCoherenceScore`, color-coded by quality level (green ≥ 0.9, amber ≥ 0.7, red < 0.7).
4. **Violation log**: The console maintains a running log of all violations detected during the session, grouped by type and sorted by frequency.

---

## Quality Thresholds

| Level | Score | Description |
|-------|-------|-------------|
| **Excellent** | ≥ 0.95 | Production-ready. No violations. Feels premium and intentional. |
| **Good** | ≥ 0.85 | Near-production. Minor violations that do not significantly impact feel. |
| **Acceptable** | ≥ 0.70 | Functional but not premium. Multiple minor violations. Needs polish. |
| **Below Standard** | ≥ 0.50 | Degraded experience. Major violations present. Requires immediate attention. |
| **Unacceptable** | < 0.50 | Significantly degraded. The product does not meet production quality standards. |

The target for Phase 15 is **≥ 0.90** (Excellent or near-Excellent across all visible surfaces).

---

## Failure Conditions

The following conditions represent categorical failures of the production quality system. If any of these conditions are true, the product has failed the production quality bar regardless of the coherence score:

1. **UI feels like a dashboard**: The interface presents data in a dense, grid-heavy format that prioritizes information density over focus and clarity. The product should feel like a creative tool, not a monitoring dashboard.

2. **AI dominates visually**: The AI's visual presence competes with or exceeds the editor's visual weight. The editor must always be the dominant visual element.

3. **Motion feels gimmicky**: Animations are used for decoration rather than communication. Motion should serve a functional purpose — to indicate state changes, guide attention, or create spatial context.

4. **Typography lacks discipline**: Font sizes, weights, or line heights outside the defined scale are present. Typography must follow the visual polish system without exception.

5. **Spacing inconsistent**: Elements within the same visual group use different spacing values. Spacing must be consistent and conform to the design system's 4px base unit.

6. **Hierarchy chaotic**: The visual hierarchy is unclear, with too many elements competing for attention at the same level. Hierarchy must be readable at a glance.

7. **Surfaces flat or noisy**: Surfaces either lack material depth (flat, no layering) or are overwhelmed with visual noise (too many borders, backgrounds, indicators). Surfaces must have appropriate material depth.

8. **Too many panels compete**: More than 3 panels are simultaneously visible, or panels occupy more than 40% of the viewport. The editor must remain dominant.

9. **Visuals feel developer-built**: The interface lacks the polish, consistency, and intentionality of a professionally designed product. Every surface should feel like it was designed, not assembled.

10. **UX lacks emotional restraint**: The interface uses urgency, drama, or attention-grabbing techniques that are inappropriate for a calm, professional creative tool. Emotional restraint is non-negotiable.

---

## Service Interface

```typescript
interface IProductionUXValidationService {
  // Run a full validation of all visible surfaces
  validateAll(): ProductionValidationResult;

  // Validate a specific surface
  validateSurface(surface: HTMLElement): SurfaceValidationResult;

  // Compute the coherence score for the current interface state
  computeCoherenceScore(): CoherenceScore;

  // Get the current list of active violations
  getActiveViolations(): ProductionViolation[];

  // Check whether a specific failure condition is triggered
  checkFailureCondition(condition: FailureCondition): boolean;
}
```

---

## Reference

- **Source**: `src/vs/workbench/services/productionSurface/common/productionSurface.ts`
- **Implementation**: `src/vs/workbench/services/productionSurface/browser/productionSurfaceService.ts`
- **Validation**: `src/vs/workbench/services/productionSurface/browser/phase15Validation.ts`
- **Service**: `IProductionUXValidationService` (DI singleton #48)
- **Enums**: `ProductionViolationType`, `ViolationSeverity`, `FailureCondition`, `QualityLevel`
- **Types**: `ProductionValidationResult`, `SurfaceValidationResult`, `CoherenceScore`, `ProductionViolation`
