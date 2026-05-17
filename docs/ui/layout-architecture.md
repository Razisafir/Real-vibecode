# Layout Architecture

> Phase 12 — Real Vibecode AI-Native IDE
> IDE Layout Model, Z-Index Hierarchy, and Floating Panel Rules

The layout architecture defines the rigid structural skeleton of the IDE. Every panel, sidebar, editor, and overlay must conform to these zone definitions, sizing constraints, and stacking rules.

---

## Table of Contents

1. [IDE Layout Model](#ide-layout-model)
2. [Layout Zones](#layout-zones)
3. [Zone Dimensions](#zone-dimensions)
4. [Z-Index Hierarchy](#z-index-hierarchy)
5. [Floating Panel Permissions](#floating-panel-permissions)
6. [Layout Validation Rules](#layout-validation-rules)
7. [Responsive Behavior](#responsive-behavior)
8. [Layout Anti-Patterns](#layout-anti-patterns)

---

## IDE Layout Model

### Horizontal Layout (left to right)

```
┌─────────────────────────────────────────────────────────────────────────┐
│ Title Bar (36px)                                              [— □ ✕] │
├────┬──────────┬─────────────────────────┬──────────┬───────────────────┤
│    │          │                         │          │                   │
│ N  │ Primary  │                         │Secondary │                   │
│ a  │ Sidebar  │       Editor            │ Sidebar  │                   │
│ v  │ (Files,  │    (dominant space)     │ (AI,     │                   │
│    │ Search,  │                         │  Graph,  │                   │
│ 48 │ Debug)   │                         │  Context)│                   │
│ px │          │                         │          │                   │
│    │          │                         │          │                   │
│    │          │                         │          │                   │
├────┴──────────┴─────────────────────────┴──────────┤                   │
│                                                     │                   │
│              Bottom Panel (Terminal, Output,         │                   │
│              Problems, Execution Log)                │                   │
│                                                     │                   │
├─────────────────────────────────────────────────────┴───────────────────┤
│ Status Bar (24px)                                                       │
└─────────────────────────────────────────────────────────────────────────┘
```

### Layout Principle

The **Editor** is the dominant zone. All other zones serve the editor. Sidebars and panels may resize but must never encroach below their minimums or push the editor below its minimum width.

---

## Layout Zones

### Zone Definitions

The `LayoutZone` enum defines 7 rigid zones:

| Zone | Enum Value | Position | Resizable | Primary Purpose |
|------|-----------|----------|-----------|-----------------|
| Title Bar | `Navigation` | Top | No | Window controls, menu bar |
| Navigation | `Navigation` | Left-most | No | Activity bar, icon navigation |
| Primary Sidebar | `PrimarySidebar` | Left-secondary | Yes | File explorer, search, debug |
| Editor | `Editor` | Center | Yes (auto) | Code editing surface |
| Secondary Sidebar | `SecondarySidebar` | Right | Yes | AI panels, graph, context |
| Bottom Panel | `BottomPanel` | Bottom | Yes | Terminal, output, problems |
| Status Bar | `StatusBar` | Bottom-most | No | Status indicators |

### Zone Layout Rules (ILayoutRule)

Each zone is governed by an `ILayoutRule`:

```typescript
interface ILayoutRule {
    readonly zone: LayoutZone;
    readonly minWidth: number;
    readonly maxWidth: number | undefined;
    readonly defaultWidth: number;
    readonly resizable: boolean;
    readonly allowedPanelTypes: readonly string[];
    readonly allowsFloating: boolean;
    readonly allowsOverlap: boolean;
    readonly zIndex: ZIndex;
}
```

---

## Zone Dimensions

### Title Bar

| Property | Value |
|----------|-------|
| Height | 36px (fixed) |
| Resizable | No |
| Z-Index | `ZIndex.Sticky` (300) |
| Allowed Panels | Menu bar, window controls, breadcrumbs |
| Floating | No |
| Overlap | No |

### Navigation Sidebar (Activity Bar)

| Property | Value |
|----------|-------|
| Width | 48px (fixed) |
| Min Width | 48px |
| Max Width | 48px |
| Resizable | No |
| Z-Index | `ZIndex.Base` (0) |
| Allowed Panels | Activity icons, badge indicators |
| Floating | No |
| Overlap | No |

### Primary Sidebar

| Property | Value |
|----------|-------|
| Default Width | 280px |
| Min Width | 200px |
| Max Width | 600px |
| Resizable | Yes |
| Z-Index | `ZIndex.Base` (0) |
| Allowed Panels | File explorer, search, source control, debug, extensions |
| Floating | No |
| Overlap | No |

### Editor

| Property | Value |
|----------|-------|
| Min Width | 400px |
| Max Width | undefined (fills remaining space) |
| Default Width | Remaining space after sidebars |
| Resizable | Yes (indirectly, via sidebar resize) |
| Z-Index | `ZIndex.Base` (0) |
| Allowed Panels | Editor tabs, editor groups, diff viewer, welcome |
| Floating | No |
| Overlap | No |

### Secondary Sidebar

| Property | Value |
|----------|-------|
| Default Width | 280px |
| Min Width | 200px |
| Max Width | 600px |
| Resizable | Yes |
| Z-Index | `ZIndex.Base` (0) |
| Allowed Panels | AI assistant, execution graph, context panel, graph view |
| Floating | Yes (restricted) |
| Overlap | No |

### Bottom Panel

| Property | Value |
|----------|-------|
| Default Height | 220px |
| Min Height | 150px |
| Max Height | 500px |
| Resizable | Yes |
| Z-Index | `ZIndex.Base` (0) |
| Allowed Panels | Terminal, output, problems, debug console, execution log |
| Floating | No |
| Overlap | No |

### Status Bar

| Property | Value |
|----------|-------|
| Height | 24px (fixed) |
| Resizable | No |
| Z-Index | `ZIndex.Sticky` (300) |
| Allowed Panels | Status indicators, language mode, encoding, AI status |
| Floating | No |
| Overlap | No |

### Dimension Summary Table

| Zone | Min | Default | Max | Unit | Resizable |
|------|-----|---------|-----|------|-----------|
| Title Bar | 36 | 36 | 36 | height | No |
| Navigation | 48 | 48 | 48 | width | No |
| Primary Sidebar | 200 | 280 | 600 | width | Yes |
| Editor | 400 | remaining | — | width | Indirect |
| Secondary Sidebar | 200 | 280 | 600 | width | Yes |
| Bottom Panel | 150 | 220 | 500 | height | Yes |
| Status Bar | 24 | 24 | 24 | height | No |

---

## Z-Index Hierarchy

### 8 Strict Layers

The z-index system uses 8 layers, separated by 100 units each:

```
  ┌─────────────────────────────────────────────────────────────┐
  │ Layer 8: DebugOverlay (800)                                 │
  │   Development overlays, performance monitors                 │
  ├─────────────────────────────────────────────────────────────┤
  │ Layer 7: Tooltip (700)                                      │
  │   Tooltips, hover cards, popover content                    │
  ├─────────────────────────────────────────────────────────────┤
  │ Layer 6: Notification (600)                                 │
  │   Toast notifications, alerts, snackbar messages            │
  ├─────────────────────────────────────────────────────────────┤
  │ Layer 5: Modal (500)                                        │
  │   Modal content, dialog windows, command palette             │
  ├─────────────────────────────────────────────────────────────┤
  │ Layer 4: ModalBackdrop (400)                                │
  │   Modal backdrop overlay, dimming layer                     │
  ├─────────────────────────────────────────────────────────────┤
  │ Layer 3: Sticky (300)                                       │
  │   Title bar, status bar, sticky headers                     │
  ├─────────────────────────────────────────────────────────────┤
  │ Layer 2: Dropdown (200)                                     │
  │   Dropdowns, context menus, select popovers                 │
  ├─────────────────────────────────────────────────────────────┤
  │ Layer 1: SidebarOverlay (100)                               │
  │   Sidebar overlay panels, collapsible content               │
  ├─────────────────────────────────────────────────────────────┤
  │ Layer 0: Base (0)                                           │
  │   Editor, panels, sidebars, base content                    │
  └─────────────────────────────────────────────────────────────┘
```

### Z-Index Values

| Layer | Value | CSS z-index | Usage |
|-------|-------|-------------|-------|
| `ZIndex.Base` | 0 | `z-index: 0` | Editor, panels, sidebars |
| `ZIndex.SidebarOverlay` | 100 | `z-index: 100` | Sidebar overlay panels |
| `ZIndex.Dropdown` | 200 | `z-index: 200` | Dropdowns, context menus |
| `ZIndex.Sticky` | 300 | `z-index: 300` | Title bar, status bar |
| `ZIndex.ModalBackdrop` | 400 | `z-index: 400` | Modal backdrop |
| `ZIndex.Modal` | 500 | `z-index: 500` | Modal content |
| `ZIndex.Notification` | 600 | `z-index: 600` | Notifications, toasts |
| `ZIndex.Tooltip` | 700 | `z-index: 700` | Tooltips |
| `ZIndex.DebugOverlay` | 800 | `z-index: 800` | Debug overlays |

### Z-Index Rules

1. **No values between layers** — z-index 150, 250, 350 are all forbidden
2. **No values above 800** — z-index 999, 9999, 10000 are forbidden
3. **DOM order within a layer** — elements in the same layer stack by DOM order
4. **Tooltips above modals** — Tooltips (700) always render above modals (500)
5. **Notifications above modals** — Notifications (600) appear above modal content (500)
6. **Debug overlay is highest** — Only dev tools use layer 800
7. **Sub-layering within 100** — If two elements need distinct z-index within the same conceptual layer, they may use values within the 100-unit range (e.g., 201 and 202 within Dropdown)

### Zone-to-ZIndex Mapping

| Zone | Z-Index | Notes |
|------|---------|-------|
| Title Bar | `Sticky` (300) | Always visible above content |
| Navigation | `Base` (0) | Base layer with sidebar |
| Primary Sidebar | `Base` (0) | Base layer |
| Editor | `Base` (0) | Base layer |
| Secondary Sidebar | `Base` (0) | Base layer, overlay panels at `SidebarOverlay` (100) |
| Bottom Panel | `Base` (0) | Base layer |
| Status Bar | `Sticky` (300) | Always visible above content |

---

## Floating Panel Permissions

### Floating Panel Rules

Floating panels are heavily restricted. Most zones do not allow floating panels at all.

### IFloatingPanelPermission Interface

```typescript
interface IFloatingPanelPermission {
    readonly panelType: string;
    readonly allowed: boolean;
    readonly allowedZones: readonly LayoutZone[];
    readonly maxInstances: number;
}
```

### Panel Floating Permissions

| Panel Type | Allowed | Allowed Zones | Max Instances |
|-----------|---------|---------------|---------------|
| AI Assistant | Yes | SecondarySidebar, Editor | 1 |
| Execution Graph | Yes | SecondarySidebar, Editor | 1 |
| Context Panel | Yes | SecondarySidebar | 1 |
| Terminal | No | — | 0 |
| Output | No | — | 0 |
| Problems | No | — | 0 |
| Debug Console | No | — | 0 |
| File Explorer | No | — | 0 |
| Search | No | — | 0 |
| Source Control | No | — | 0 |

### Floating Panel Constraints

1. **Only AI-related panels** may float — terminals, explorers, and output panels must stay docked
2. **Max 1 instance** of any floating panel type
3. **Floating panels must snap to zone edges** — no free-positioning
4. **Floating panels use `SidebarOverlay` z-index** (100)
5. **Floating panels must not overlap the editor cursor area**

### Secondary Sidebar Overlay Behavior

When the secondary sidebar is collapsed and an AI panel opens:

1. The panel may appear as an overlay at `ZIndex.SidebarOverlay` (100)
2. The overlay slides in from the right with `MotionDuration.Normal` (200ms)
3. The overlay width matches the sidebar default width (280px)
4. Clicking outside the overlay collapses it
5. Only one overlay may be visible at a time

---

## Layout Validation Rules

### Rule 1: Editor Minimum Width

The editor zone must never be smaller than 400px. If resizing a sidebar would push the editor below 400px, the resize is rejected.

```typescript
// Validation
const editorWidth = viewportWidth - navWidth - primarySidebarWidth - secondarySidebarWidth;
if (editorWidth < LayoutGrid.EditorMinWidth) {
    // REJECT resize
}
```

### Rule 2: No Overlapping Zones

Base-layer zones must not overlap each other. Only overlay panels may overlap.

```
FORBIDDEN:
┌────┬──────┬──────────┐
│    │      │          │
│ Nav│ Pri  │ Editor   │
│    │ Side │          │
│    │ bar  │    ┌─────┤
│    │      │    │Over-││  ← Base zone overlap
│    │      │    │lap! ││
│    │      │    └─────┤
└────┴──────┴──────────┘
```

### Rule 3: Fixed Zones Must Not Resize

Title bar (36px), navigation (48px), and status bar (24px) have fixed dimensions. These must never change regardless of viewport size or user preference.

### Rule 4: All Zones Must Be Contiguous

There must be no gaps between zones. The layout is a tiling of non-overlapping rectangles.

### Rule 5: Bottom Panel Shares Width

The bottom panel spans the full width (navigation + primary sidebar + editor + secondary sidebar). It does not sit beside any sidebar.

### Rule 6: Minimum Viewport

The minimum supported viewport is 800×600. Below this:
- Primary sidebar collapses to overlay
- Secondary sidebar is hidden
- Bottom panel collapses to tab bar only

---

## Responsive Behavior

### Viewport Breakpoints

| Breakpoint | Viewport Width | Layout Behavior |
|-----------|---------------|-----------------|
| Full | ≥1200px | All zones visible, default sizes |
| Compact | 800–1199px | Secondary sidebar auto-collapses |
| Minimal | <800px | Primary sidebar becomes overlay, secondary hidden |

### Sidebar Auto-Collapse Rules

| Condition | Action |
|-----------|--------|
| Viewport < 1200px | Secondary sidebar collapses |
| Viewport < 800px | Primary sidebar becomes overlay, secondary hidden |
| Editor width < 400px | Sidebar that caused the encroachment collapses |
| User opens panel in collapsed sidebar | Sidebar opens as overlay |

### Panel Visibility Priority

When space is limited, panels hide in this order:

1. Secondary sidebar (first to hide)
2. Bottom panel (reduces to tab bar)
3. Primary sidebar (becomes overlay)
4. Navigation bar (never hides)

---

## Layout Anti-Patterns

### Anti-Pattern 1: Z-Index Escalation

```css
/* FORBIDDEN */
.my-panel { z-index: 10000; }  /* Just making sure it's on top */

/* CORRECT */
.my-panel { z-index: ${designSystem.getZIndex(ZIndex.Modal)}; }
```

### Anti-Pattern 2: Absolute Positioning for Layout

```css
/* FORBIDDEN — using absolute positioning for docked panels */
.sidebar {
    position: absolute;
    left: 48px;
    top: 36px;
}

/* CORRECT — use CSS grid or flexbox for the main layout */
.ide-layout {
    display: grid;
    grid-template-columns: 48px 280px 1fr 280px;
    grid-template-rows: 36px 1fr 220px 24px;
}
```

### Anti-Pattern 3: Floating Everything

```typescript
// FORBIDDEN — making everything float
floatingPanels.push(fileExplorer);    // Not allowed to float
floatingPanels.push(terminal);        // Not allowed to float
floatingPanels.push(outputPanel);     // Not allowed to float

// CORRECT — only AI panels may float
if (designSystem.isFloatingPanelAllowed('ai-assistant', LayoutZone.Editor)) {
    floatingPanels.push(aiAssistant);
}
```

### Anti-Pattern 4: Ignoring Minimums

```typescript
// FORBIDDEN — allowing sidebar to shrink below minimum
sidebar.setWidth(120);  // Below 200px minimum

// CORRECT — enforce minimum
const newWidth = Math.max(LayoutGrid.SecondarySidebarMinWidth, desiredWidth);
sidebar.setWidth(newWidth);
```

### Anti-Pattern 5: Overlapping Base Zones

```typescript
// FORBIDDEN — rendering a panel on top of the editor at base level
editor.style.zIndex = '0';
myPanel.style.zIndex = '1';  // Overlapping base zone

// CORRECT — use proper z-index layer or overlay mechanism
myPanel.style.zIndex = `${designSystem.getZIndex(ZIndex.SidebarOverlay)}`;
```

---

## Layout Validation via Service

### Service Methods

| Method | Purpose |
|--------|---------|
| `getLayoutRule(zone)` | Get dimensions and rules for a zone |
| `getLayoutRules()` | Get all layout rules |
| `isFloatingPanelAllowed(type, zone)` | Check floating permission |
| `getZIndex(layer)` | Get z-index value for a layer |
| `validateLayout()` | Full layout validation check |

### Validation Check Result

```typescript
interface IConsistencyCheckResult {
    readonly violations: readonly IDesignViolation[];
    readonly errorCount: number;
    readonly warningCount: number;
    readonly infoCount: number;
    readonly passed: boolean;
    readonly checkedAt: number;
    readonly durationMs: number;
}
```

A layout validation returns the same result format as consistency checks, allowing unified violation reporting.

---

## Reference

- **Source**: `src/vs/workbench/services/aiExecution/common/designSystem.ts`
- **Enums**: `LayoutZone`, `ZIndex`, `LayoutGrid`
- **Interfaces**: `ILayoutRule`, `IFloatingPanelPermission`, `IConsistencyCheckResult`
- **Service**: `IDesignSystemService`
