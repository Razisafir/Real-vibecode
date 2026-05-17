# Contextual Minimalism

## Overview

Contextual Minimalism is the design philosophy that makes the Real Vibecode IDE feel calm even when it's capable of extraordinary complexity. The system doesn't just hide features — it actively reduces visual noise, motion, and chrome as the user's concentration deepens. The deeper the focus, the quieter the interface becomes.

This is the opposite of the typical IDE experience, where every panel, notification, and animation fights for attention regardless of what the user is trying to accomplish. In our IDE, the interface has the self-awareness to step back and let the work take center stage.

---

## Four Minimalism Levels

The system operates on four distinct minimalism levels, each progressively reducing visual complexity. The level is determined automatically based on triggers, but can also be manually selected by the user.

| Level | Chrome Reduction | Motion | Notifications | AI Suggestions |
|---|---|---|---|---|
| **Full** | 0% | Normal | All enabled | Active |
| **Reduced** | 30% | Reduced | Batched (non-critical) | Subtle only |
| **Minimal** | 60% | Minimal | Critical only | Suppressed |
| **Silent** | 90% | None | None (all deferred) | Hidden |

### Full

The default state. All UI chrome, animations, notifications, and AI suggestions are active. This is appropriate when the user is in a Learning or Idle context, or when they are exploring the product's capabilities. The interface is rich and informative.

**Typical context**: Learning, Idle, early-stage onboarding

### Reduced

The first level of quieting. Non-essential chrome elements (badges, decorative borders, status indicators for suppressed panels) are hidden. Motion is reduced by 50% — animations are shorter and subtler. Non-critical notifications are batched and delivered every 5 minutes instead of immediately. AI suggestions are presented more subtly — no animations, no pulsing badges.

**Typical context**: Coding, Navigating

### Minimal

Deep focus mode. Only essential chrome remains — panel headers, active tab indicators, and critical status bars. All motion is reduced to essential transitions only (no decorative animation). Notifications are limited to critical-only (build errors, test failures). AI suggestions are completely suppressed unless explicitly invoked by the user.

**Typical context**: Deep Coding, Reviewing

### Silent

The ultimate concentration mode. The interface is stripped to bare essentials: the editor, the active file tab, and a minimal status bar. All other chrome is removed. There are zero animations. Zero notifications. Zero AI suggestions. The only visual elements are the code and the cursor. This mode implements `IDisposable` — when exited, all suppressed elements are restored automatically.

**Typical context**: Flow state (Deep/Peak), user-requested focus mode

---

## Six Triggers

Minimalism levels are activated by six distinct triggers, each representing a different reason why the user might benefit from a quieter interface.

### 1. FocusMode

**Trigger**: User explicitly activates Focus Mode via command palette, keyboard shortcut, or menu.

**Result**: Immediately enters Minimal level. Can be escalated to Silent with a second activation.

**Override**: User can set their preferred minimalism level for Focus Mode in settings.

### 2. FlowState

**Trigger**: The Flow State Preservation system detects that the user is in Moderate, Deep, or Peak flow (see `flow-state-preservation.md`).

**Result**: 
- Moderate flow → Reduced minimalism
- Deep flow → Minimal minimalism
- Peak flow → Silent minimalism

**Override**: None — flow-triggered minimalism cannot be overridden while flow is active. The user must break flow (pause, switch context) to restore the interface.

### 3. Inactivity

**Trigger**: No user input for 10+ minutes (configurable).

**Result**: Enters Reduced minimalism. The assumption is that the user is reading code or thinking, and unnecessary visual elements are distracting.

**Override**: Any user input immediately restores the previous minimalism level.

### 4. CognitiveOverload

**Trigger**: The Feature Fatigue Detection system reports an Elevated or Critical fatigue state (see `feature-fatigue.md`).

**Result**:
- Elevated fatigue → Minimal minimalism
- Critical fatigue → Silent minimalism

**Override**: Recovers automatically as fatigue state improves.

### 5. Fatigue

**Trigger**: Time-based fatigue — the user has been in an active session for more than 4 hours without a significant break.

**Result**: Enters Reduced minimalism. Long-session fatigue is subtle but measurable, and reducing visual noise helps maintain productivity.

**Override**: User can disable time-based fatigue triggers in settings.

### 6. UserRequest

**Trigger**: User explicitly requests a minimalism level via command palette or settings.

**Result**: Enters the requested level immediately and maintains it until the user explicitly changes or disables it.

**Override**: User-requested minimalism overrides all other triggers until manually disabled.

---

## Surface Visibility Rules

Each surface in the IDE has visibility rules that define its behavior at each minimalism level. These rules ensure that critical information is never suppressed while decorative elements are removed aggressively.

| Surface | Full | Reduced | Minimal | Silent |
|---|---|---|---|---|
| Editor | Visible | Visible | Visible | Visible |
| Active tab | Visible | Visible | Visible | Visible (minimal) |
| Explorer | Visible | Visible | Auto-hide | Hidden |
| AI Panel | Visible | Subtle | Hidden | Hidden |
| Terminal | Visible | Visible | Auto-hide | Hidden |
| Problems | Visible | Batched | Critical only | Hidden |
| Notifications | All | Batched | Critical | None |
| Status bar | Full | Essential | Minimal | Line/col only |
| Sidebar icons | Visible | Muted | Hidden | Hidden |
| Breadcrumbs | Visible | Visible | Hidden | Hidden |
| Minimap | Visible | Hidden | Hidden | Hidden |
| Activity bar | Visible | Icons only | Hidden | Hidden |
| Scrollbar | Full | Thin | Thin | Thin |

---

## Motion Reduction During Concentration

Motion is a significant source of cognitive distraction. The system progressively reduces animation as minimalism deepens:

| Minimalism Level | Animation Budget | Allowed Animations |
|---|---|---|
| Full | 100% | All: panel transitions, hover effects, badge animations, scroll effects, typing indicators |
| Reduced | 50% | Essential only: panel open/close, tab switch, editor scrolling |
| Minimal | 15% | Structural only: context transitions, critical error highlights |
| Silent | 0% | None — all visual changes are instant with no animation |

### Motion Reduction Implementation

```typescript
function shouldAnimate(animationType: AnimationType, minimalismLevel: MinimalismLevel): boolean {
  const budget = ANIMATION_BUDGET[minimalismLevel];
  const cost = ANIMATION_COST[animationType];
  return cost <= budget;
}

const ANIMATION_COST = {
  hoverEffect: 10,
  badgePulse: 20,
  panelSlide: 30,
  tabSwitch: 15,
  scrollEffect: 10,
  notification: 25,
  contextTransition: 40,
  criticalHighlight: 15
};
```

---

## Chrome Reduction Percentages

Chrome reduction is applied systematically across all surfaces. The percentage indicates how much non-essential visual decoration is removed.

| Element | Full (0%) | Reduced (30%) | Minimal (60%) | Silent (90%) |
|---|---|---|---|---|
| Panel borders | Full | Subtle | None | None |
| Background colors | Full | Muted | Flat | Flat |
| Icons in headers | Full | Reduced | None | None |
| Status indicators | All | Essential | Critical | None |
| Tooltips | Full | Reduced | Essential | None |
| Context menus | Full | Full | Full | Full |
| Keyboard hints | Full | Reduced | Hidden | Hidden |

---

## Silent Mode as IDisposable

Silent mode is implemented as an `IDisposable` resource, ensuring that all suppressed elements are automatically restored when the mode is exited — regardless of how the exit occurs (user action, context change, or error).

```typescript
class SilentMode implements IDisposable {
  private suppressedElements: SuppressedElement[] = [];
  private deferredNotifications: Notification[] = [];
  private originalMinimalismLevel: MinimalismLevel;

  constructor(private readonly minimalismService: IContextualMinimalismService) {
    this.originalMinimalismLevel = minimalismService.getCurrentLevel();
    this.enterSilentMode();
  }

  private enterSilentMode(): void {
    // Suppress all non-essential surfaces
    for (const surface of this.getAllSurfaces()) {
      if (!surface.isCritical) {
        surface.suppress();
        this.suppressedElements.push(surface);
      }
    }
    // Pause all animations
    this.minimalismService.setAnimationBudget(0);
    // Defer all notifications
    this.minimalismService.deferNotifications(true);
  }

  dispose(): void {
    // Restore all suppressed surfaces
    for (const element of this.suppressedElements) {
      element.restore();
    }
    // Release deferred notifications
    this.minimalismService.releaseDeferredNotifications();
    // Restore animation budget
    this.minimalismService.setAnimationBudget(100);
    // Restore previous minimalism level
    this.minimalismService.setLevel(this.originalMinimalismLevel);
  }
}
```

This pattern ensures that Silent mode never "leaks" — even if an error occurs during flow state, the dispose handler will restore the interface to its previous state.

---

## Auto-Hide Low-Value Surfaces

In Reduced and Minimal modes, the system automatically hides surfaces that have been determined to be low-value for the current context. A surface is classified as low-value when:

- It has not been interacted with in the last 15 minutes
- It is not Dominant or Elevated in the current activity context layout profile
- Its content has not changed in the last 10 minutes

Auto-hide uses a gentle animation: the surface collapses to its icon representation in the sidebar, with a subtle "breathing" indicator that signals it's still available. The user can restore it with a single click or keyboard shortcut.

---

## Before / After Comparison

### Before: Busy Interface

```
┌───────────────────────────────────────────────────────────┐
│ [●] [●] [●]  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐       │
│ File Edit View┌─┤ Expl ││ AI   ││ Term ││ Debug│       │
│  🔔 3 alerts │ │      ││ 🔔 2 ││      ││      │       │
│  💡 5 tips   │ │      ││      ││      ││      │       │
│  ⚡ 2 AI     │ │      ││      ││      ││      │       │
│  ──────────  │ │      ││      ││      ││      │       │
│  [Problems 3]│ │      ││      ││      ││      │       │
│  [Output   ] │ │      ││      ││      ││      │       │
│  [Debug    ] │ │      ││      ││      ││      │       │
│  💡 Try graph│ │      ││      ││      ││      │       │
│  🔔 Build OK │ │      ││      ││      ││      │       │
│              │ │      ││      ││      ││      │       │
│  😰 "So much visual noise, I can't focus"                │
└───────────────────────────────────────────────────────────┘
```

### After: Quiet, Focused Environment (Silent Mode)

```
┌───────────────────────────────────────────────────────────┐
│ main.ts ─────────────────────────────────── Ln 42, Col 15│
│                                                           │
│  function processExecutionPlan(plan: ExecutionPlan) {      │
│    const steps = plan.getSteps();                         │
│    for (const step of steps) {                            │
│      if (step.isReady()) {                                │
│        await step.execute();                              │
│      }                                                    │
│    }                                                      │
│  }                                                        │
│                                                           │
│                                                           │
│                                                           │
│                                                           │
│  😊 "Just me and the code. Perfect."                      │
└───────────────────────────────────────────────────────────┘
```

---

## Implementation Reference

- **Service**: `ContextualMinimalismService` (singleton #34)
- **Registration**: `registerSingleton(IContextualMinimalismService, ContextualMinimalismService, InstantiationType.Eager)`
- **Interface**: `IContextualMinimalismService` in `vs/workbench/services/adaptiveWorkflow/common/adaptiveWorkflow.ts`
- **Key Methods**: `getCurrentLevel()`, `enterSilentMode()`, `shouldAnimate()`, `getSurfaceVisibility()`, `deferNotifications()`, `releaseDeferredNotifications()`
