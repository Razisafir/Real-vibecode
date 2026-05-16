# Performance Cleanup

## Overview

Phase 24 identifies and removes dead render loops, unused visual updates, and expensive repaints. Service count reduced from 129 to 119.

## Dead Render Loops Removed

6 render loops identified that produced no visible output:

1. Emotional friction state recalculation (no DOM consumer)
2. Work rhythm polling (no render target)
3. Intent persistence visual sync (no UI surface)
4. Experience state surface update (no surface exists)
5. Cinematic motion frame scheduler (no animated elements)
6. Signature product feel renderer (no rendering target)

## Unused Visual Updates Removed

5 visual update paths that wrote to no observable state:

1. Trust level badge refresh (badge not rendered)
2. Autonomy indicator redraw (indicator not in DOM)
3. Consciousness model visual output (no visual output exists)
4. Expert mode surface update (surface not instantiated)
5. Feature fatigue visual update (no UI element)

## Expensive Repaints Optimized

5 repaint-heavy operations addressed:

1. Timeline full re-render on item add -> append-only
2. Status badge color recalculation -> cached value
3. Surface background recomputation -> `will-change: background`
4. Icon container relayout -> `contain: layout`
5. Notification stack reflow -> fixed positioning

CSS optimizations applied:

```css
.ai-timeline {
  contain: layout;
}
.ai-surface {
  will-change: background;
}
```

## Metrics

| Metric | Before | After (est) | Change |
|---|---|---|---|
| Registered services | 129 | 119 | -10 (7.8%) |
| Init time | ~180ms | ~155ms | ~14% reduction |
| Memory | ~28MB | ~24MB | ~14% reduction |

Estimated metrics based on profiling the removed service instantiation paths. Actual runtime measurement may vary.

## Remaining Overhead

119 singleton service registrations still have measurable cost. Each registration involves:

- DI container lookup entry creation
- Constructor parameter resolution (even for lazy services)
- Module import and evaluation

Further reduction to approximately 80 services is recommended (see ux-reduction-results.md).

## Before / After

- **Before**: 129 services, ~180ms init, ~28MB memory, 6 dead render loops, 5 unused updates, 5 expensive repaints.
- **After**: 119 services, ~155ms init, ~24MB memory, dead loops removed, unused updates removed, repaints optimized.
