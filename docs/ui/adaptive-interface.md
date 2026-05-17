# Adaptive Interface

## Overview

The Adaptive Interface system transforms the IDE from a static, one-size-fits-all layout into a contextually intelligent workspace that reshapes itself based on what the user is actually doing. When a developer is deep in coding, the editor dominates. When they shift to debugging, panels reconfigure to surface the call stack and watches. When they enter AIPlanning mode, the execution graph and plan panels elevate to prominence.

This is not mere window management — it's contextual intelligence. The system observes the user's activity patterns, infers their current task, and proactively adapts the layout to minimize friction and maximize the relevance of every visible surface.

---

## Eight Activity Contexts

The system recognizes eight distinct activity contexts, each representing a fundamentally different mode of work. These contexts drive layout adaptation, feature surfacing, and interruption policies.

| Context | Description | Key Indicators |
|---|---|---|
| **Coding** | Active file editing, writing new code | High keystroke rate, active cursor in editor, file modifications |
| **Debugging** | Investigating bugs, stepping through code | Breakpoint hits, step actions, watch expressions, variable inspection |
| **AIPlanning** | Collaborating with AI on execution plans | AI panel active, plan documents open, graph view usage |
| **Reviewing** | Reading and reviewing code (own or others') | Low edit rate, high scroll rate, diff view active, comments |
| **Executing** | Running code, tests, or deployments | Terminal active, test runner visible, process output streaming |
| **Navigating** | Exploring codebase, searching for files/symbols | File tree navigation, symbol search, go-to-definition actions |
| **Learning** | Onboarding, reading docs, exploring features | Help panel open, onboarding steps active, tutorial mode |
| **Idle** | No active task; between activities | No input for 30+ seconds, no active process, no file changes |

### Context Detection Algorithm

```typescript
function detectActivityContext(recentActions: UserAction[]): ActivityContext {
  const scores = new Map<ActivityContext, number>();

  // Score each context based on recent action patterns
  for (const action of recentActions) {
    for (const context of ActivityContexts) {
      scores.set(context, (scores.get(context) || 0) + contextWeight(action, context));
    }
  }

  // Apply recency weighting (most recent actions count more)
  applyRecencyDecay(scores, recentActions);

  // Return the highest-scoring context, with hysteresis to prevent flapping
  const detected = max(scores);
  if (detected !== currentContext && scores.get(detected) - scores.get(currentContext) > HYSTERESIS_THRESHOLD) {
    return detected;
  }
  return currentContext;
}
```

Hysteresis is critical: we don't want the layout to flicker between contexts because of a single stray action. The detected context must consistently outscore the current context by a margin before a transition occurs.

---

## Context-Specific Layout Profiles

Each activity context maps to a layout profile that defines how surfaces are arranged. The profile specifies four states for each surface:

| Surface State | Description | Visual Treatment |
|---|---|---|
| **Dominant** | Primary work surface — takes maximum space | Full height/width, prominent, no chrome reduction |
| **Elevated** | Important supporting surface — visible and accessible | Standard size, clear labeling, full interactivity |
| **Suppressed** | Secondary surface — visible but de-emphasized | Reduced size, muted colors, compact headers |
| **Compressed** | Minimal presence — collapsed or icon-only | Icon in sidebar, collapsed panel, tooltip on hover |

### Layout Profile Matrix

| Surface | Coding | Debugging | AIPlanning | Reviewing | Executing | Navigating | Learning | Idle |
|---|---|---|---|---|---|---|---|---|
| Editor | Dominant | Elevated | Elevated | Dominant | Suppressed | Suppressed | Elevated | Compressed |
| AI Panel | Suppressed | Suppressed | Dominant | Suppressed | Suppressed | Elevated | Elevated | Elevated |
| Explorer | Elevated | Compressed | Compressed | Elevated | Compressed | Dominant | Elevated | Compressed |
| Terminal | Compressed | Suppressed | Compressed | Compressed | Dominant | Compressed | Compressed | Compressed |
| Debug Panel | Compressed | Dominant | Compressed | Compressed | Suppressed | Compressed | Compressed | Compressed |
| Graph View | Compressed | Compressed | Dominant | Compressed | Compressed | Suppressed | Suppressed | Compressed |
| Problems | Suppressed | Elevated | Suppressed | Elevated | Elevated | Compressed | Suppressed | Compressed |
| Execution Plan | Compressed | Compressed | Elevated | Compressed | Suppressed | Compressed | Compressed | Compressed |
| Replay Timeline | Compressed | Compressed | Compressed | Compressed | Compressed | Compressed | Compressed | Compressed |
| Discovery Hints | Suppressed | Suppressed | Suppressed | Suppressed | Suppressed | Suppressed | Elevated | Elevated |

---

## Editor Dominance Ratios

The editor is the sacred center of the IDE. Every context profile defines an editor dominance ratio — the minimum percentage of the primary work area that the editor must always occupy.

| Context | Editor Dominance | Rationale |
|---|---|---|
| Coding | 85% | Code is the primary artifact; all other surfaces support it |
| Debugging | 50% | Debug panels need significant space alongside code |
| AIPlanning | 40% | AI panel and graph view share the primary surface |
| Reviewing | 80% | Review focuses on reading code; side panels are secondary |
| Executing | 30% | Terminal and output dominate; editor is reference |
| Navigating | 25% | Explorer and search dominate during exploration |
| Learning | 55% | Editor for practice; learning panels for guidance |
| Idle | 70% | Default comfortable state; editor is always the "home" |

These ratios are enforced by the layout engine. Even if a user manually drags a panel to consume more space, the system will gently suggest restoring the context-appropriate ratio on the next context transition.

---

## Adaptation Actions

When a context transition is detected, the system executes a sequence of adaptation actions to reshape the interface. These actions are animated and staggered to prevent jarring layout shifts.

| Action | Description | Animation |
|---|---|---|
| **Elevate** | Move a surface from Suppressed/Compressed to Elevated/Dominant | Slide in from sidebar, 200ms ease-out |
| **Suppress** | Move a surface from Dominant/Elevated to Suppressed | Fade header, reduce size, 300ms ease-in |
| **Compress** | Collapse a surface to icon-only representation | Collapse to sidebar icon, 250ms ease-in-out |
| **Expand** | Grow a surface to its full size from compressed state | Expand from sidebar, 250ms ease-out |
| **Rearrange** | Reorder surfaces to match the context profile | Cross-fade positions, 400ms ease-in-out |

### Stagger Timing

Adaptation actions are never applied simultaneously. The system uses a stagger pattern:

1. **First**: Compress surfaces that are leaving (200ms)
2. **Then**: Rearrange remaining surfaces (300ms, starts after 200ms)
3. **Finally**: Expand/elevate surfaces that are entering (200ms, starts after 500ms)

Total transition time: approximately 700ms — fast enough to feel responsive but slow enough to be visually comprehensible.

---

## Before / After Comparison

### Before: Static Layout

```
┌─────────────────────────────────────────────────────────┐
│  ┌──────────┐ ┌───────────────────────┐ ┌────────────┐ │
│  │ Explorer │ │                       │ │  AI Panel  │ │
│  │          │ │                       │ │            │ │
│  │          │ │       Editor          │ │            │ │
│  │          │ │                       │ │            │ │
│  │          │ │                       │ │            │ │
│  └──────────┘ └───────────────────────┘ └────────────┘ │
│  ┌──────────────────────────────────────────────────┐   │
│  │  Terminal │ Problems │ Debug │ Output             │   │
│  └──────────────────────────────────────────────────┘   │
│                                                         │
│  😰 Same layout whether coding, debugging, or planning  │
└─────────────────────────────────────────────────────────┘
```

### After: Contextually Intelligent Layout (Coding → Debugging)

```
  CODING CONTEXT                    DEBUGGING CONTEXT
  ───────────────                   ─────────────────

  ┌────┬────────────────────┐       ┌────┬────────┬──────┐
  │Expl│                    │       │    │        │Debug │
  │orer│                    │       │Expl│ Editor │Panel │
  │    │   Editor (85%)     │       │orer│ (50%)  │(35%) │
  │    │                    │  ──►  │    │        │      │
  │    │                    │       │    │        │Call  │
  │    │                    │       │    │        │Stack │
  ├────┴────────────────────┤       ├────┴────────┴──────┤
  │ 💡 Hint                │       │ Terminal │ Watches  │
  └─────────────────────────┘       └───────────────────┘
  😊 "Editor is center stage"       😊 "Debug info right where I need it"
```

---

## Adaptive Transition Diagram

```
                    ACTIVITY CONTEXT TRANSITIONS
                    ════════════════════════════

                         ┌──────────┐
                    ┌────│  Coding  │────┐
                    │    └──────────┘    │
                    ▼                   ▼
              ┌──────────┐        ┌──────────┐
         ┌────│ Debugging│        │ AIPlan-  │────┐
         │    └──────────┘        │  ning    │    │
         │         │              └──────────┘    │
         │         ▼                   │          ▼
         │    ┌──────────┐            │    ┌──────────┐
         │    │Reviewing │◄───────────┘    │Executing │
         │    └──────────┘                 └──────────┘
         │         │                          │
         │         ▼                          ▼
         │    ┌──────────┐             ┌──────────┐
         └───►│Navigating│             │ Learning │
              └──────────┘             └──────────┘
                   │                        │
                   └────────┬───────────────┘
                            ▼
                       ┌──────────┐
                       │   Idle   │
                       └──────────┘

  Each transition triggers:
  1. Context detection validation (hysteresis check)
  2. Layout profile computation
  3. Staggered adaptation actions (700ms total)
  4. Feature visibility recalculation
  5. Flow state re-evaluation
```

---

## Implementation Reference

- **Service**: `AdaptiveInterfaceService` (singleton #32)
- **Registration**: `registerSingleton(IAdaptiveInterfaceService, AdaptiveInterfaceService, InstantiationType.Eager)`
- **Interface**: `IAdaptiveInterfaceService` in `vs/workbench/services/adaptiveWorkflow/common/adaptiveWorkflow.ts`
- **Key Methods**: `detectContext()`, `getLayoutProfile()`, `applyAdaptation()`, `getEditorDominanceRatio()`, `onContextChange()`
