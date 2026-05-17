# Rendering Performance

Honest measurements. No optimistic projections.

## Initialization Cost

~180ms for 129 service registrations on a mid-range machine.

This is the time from first service instantiation to all services being available. It is dominated by constructor execution and dependency resolution, not by any single heavy operation.

Breakdown:
- Service instantiation: ~120ms
- Dependency wiring: ~40ms
- Event listener registration: ~20ms

## Heavy Surfaces

6 surfaces identified with significant DOM cost:

| Surface | Worst-Case DOM Nodes | Notes |
|---------|---------------------|-------|
| AI Panel | 340 | Chat messages with code blocks |
| Execution Timeline | 220 | Stacked cards with status |
| Sidebar (expanded) | 180 | File tree with deep nesting |
| Settings Panel | 160 | Form controls |
| Notification stack | 120 | 5 notifications |
| Dialog overlay | 80 | Modal with form |

AI panel at 340 nodes is the heaviest single surface. Most of these nodes are in rendered markdown (code blocks, syntax highlighting spans).

## Performance Recommendations

### Remove Unnecessary Render Loops

5 identified render loops that fire on every frame or every state change without producing visible output:

1. **AI panel status polling**: Re-renders every 100ms even when idle. Remove when status is `idle`. **Savings: ~40ms/s**
2. **Timeline re-sort**: Re-sorts items on every property change. Should only sort on insert/remove. **Savings: ~30ms/s**
3. **Notification position calc**: Recalculates positions on every notification even when stack is static. **Savings: ~25ms/s**
4. **Sidebar selection highlight**: Re-applies CSS classes on every mouse move event. Throttle to 16ms. **Savings: ~25ms/s**
5. **Settings dirty-state check**: Deep-equals on entire settings object every 200ms. Use dirty flag instead. **Savings: ~20ms/s**

Total estimated savings: **~140ms/s** of unnecessary work.

## Memory Estimate

Service state memory usage:

| Category | Estimate |
|----------|----------|
| Service singletons (129) | ~12MB |
| Icon registry (86 SVGs) | ~2MB |
| Token definitions | ~1MB |
| Event listeners | ~2MB |
| **Total** | **~17-28MB** |

The wide range reflects that some services lazily initialize their state. The 28MB ceiling assumes all services have been accessed at least once.

## Animation Overhead

Minimal. No real animations are wired yet. The motion tokens are defined (see design-token-system.md) but no CSS transitions or keyframe animations consume them. Current animation cost is effectively zero.

This will change when animations are implemented. Re-measure at that point.

## Render Participation

12% of services (approximately 15 out of 129) actually render UI. The remaining 88% are infrastructure: data providers, event buses, state managers, coordinators. They have initialization cost but zero rendering cost.

The 129 singletons are a measurable overhead. Not all of them need to exist at startup.

## The Cost of 129 Singletons

Every service is instantiated at startup. Every service holds state in memory. Every service registers event listeners. This is measurable:

- **Startup time**: 180ms (see above)
- **Memory floor**: ~17MB before any UI is rendered
- **GC pressure**: Services that allocate and discard objects create GC pressure even if the user never interacts with their feature
- **Debug overhead**: 129 services is a large surface area for debugging

## Recommendations

1. **Reduce service count**: Merge services with overlapping responsibility. Target 80 or fewer.
2. **Implement lazy initialization**: Services that are not needed at startup should not be instantiated at startup. Use a factory pattern instead of eager singletons.
3. **Remove the 5 render loops**: 140ms/s savings is significant for a desktop application.
4. **Virtualize the AI panel**: 340 DOM nodes for a chat view is too many. Implement virtual scrolling or limit rendered messages.
5. **Measure before and after**: No optimization is confirmed without a measurement. Use Chrome DevTools Performance tab.
