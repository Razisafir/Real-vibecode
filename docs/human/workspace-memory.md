# Adaptive Workspace Memory

## Overview

The `IWorkspaceMemoryService` learns and remembers how each individual user configures and navigates their workspace. It observes layout preferences, workflow sequences, and action pairings to create a workspace that feels personally familiar every time the user returns. This is not about surveillance — it is about **spatial familiarity**: the workspace should feel like your workspace, not a generic IDE.

---

## Core Principle

> **The workspace feels personally familiar.**

When a developer returns to their IDE after a break, after a restart, or after switching projects, the workspace should feel like they never left. The sidebar is where they expect it. The panels are the size they prefer. The tools they use most are immediately accessible. There is no "setup phase" every morning — the workspace remembers.

---

## Layout Preferences

The service tracks and restores workspace layout preferences across sessions:

```typescript
interface LayoutPreference {
  context: string;           // The context in which this layout is preferred
                            // e.g., "debugging", "code-review", "writing"
  sidebarWidth: number;      // Preferred sidebar width in pixels
  bottomPanelHeight: number; // Preferred bottom panel height in pixels
  activePanels: string[];    // Which panels are visible
  editorGroupCount: number;  // Number of editor groups in use
  useCount: number;          // How often this layout configuration is used
}
```

### How Layout Memory Works

1. **Observation Phase**: During the first several sessions, the service quietly observes layout changes the user makes — resizing panels, opening/closing sidebars, rearranging editor groups. No data is collected beyond spatial configuration.

2. **Pattern Recognition**: After sufficient observations, the service identifies recurring layout patterns. It recognizes that the user prefers a wider sidebar during debugging, a taller bottom panel during test-driven development, and a minimal layout during focused writing.

3. **Contextual Restoration**: When the user enters a recognized context (e.g., starts a debugging session), the service gently adjusts the layout to match the user's historical preference for that context. This is never a jarring transition — changes are subtle and happen over a short transition period.

4. **Progressive Confidence**: Layout suggestions gain confidence over time. A layout used 2 times is a hint; a layout used 20 times is a strong preference. The service never forces a layout — it only suggests, and the user can always override.

### Layout Context Categories

- **Writing** — Focused coding with minimal chrome, single editor group, hidden sidebar
- **Debugging** — Wide sidebar for variables, bottom panel for call stack, split editor for source + watch
- **Code Review** — Dual editor groups, diff view prominent, outline panel visible
- **Exploration** — Multiple editor groups, file explorer prominent, search panel open
- **Testing** — Bottom panel dominant for test results, side-by-side source and test files

---

## Workflow Sequences

The service tracks ordered sequences of actions that form recognizable workflows:

```typescript
interface WorkflowSequence {
  actions: string[];         // Ordered list of action identifiers
  frequency: number;         // How often this exact sequence occurs
  context: string;           // The context in which this workflow occurs
}
```

### Recognized Workflow Patterns

- **Debug Loop**: Set breakpoint → Run debug → Inspect variable → Step through → Modify code → Restart
- **TDD Cycle**: Write test → Run test (fail) → Write implementation → Run test (pass) → Refactor → Run test (pass)
- **Code Review Flow**: Open diff → Navigate changed files → Add comment → Approve → Next file
- **Refactoring Sequence**: Select symbol → Find references → Rename → Verify compilation → Run tests
- **Exploration Pattern**: Open file → Find definition → Open referenced file → Find usages → Return

When a recognized workflow is detected in progress, the service proactively prepares the next logical step — opening the relevant panel, surfacing the right tool, or pre-positioning the cursor. The preparation is always non-intrusive and easily ignorable.

---

## Action Pairings

Certain actions consistently occur together or in sequence. The service tracks these co-occurrences to anticipate the user's next action:

```typescript
interface ActionPairing {
  actionA: string;              // First action in the pairing
  actionB: string;              // Second action (the predicted follow-up)
  coOccurrenceCount: number;    // How many times A has been followed by B
  sequentialOrder: number;      // 1.0 if always A→B, 0.5 if equally A→B and B→A
  averageGapMs: number;         // Average time between action A and action B
}
```

### Common Action Pairings

| Action A | Action B | Sequential Order | Avg Gap |
|---|---|---|---|
| Save file | Run tests | 0.92 | 2,400ms |
| Open terminal | Run command | 0.95 | 800ms |
| Set breakpoint | Start debug | 0.88 | 3,100ms |
| Find references | Open file | 0.91 | 1,200ms |
| Git commit | Push changes | 0.73 | 8,500ms |
| Close panel | Open different panel | 0.67 | 600ms |

When `actionA` is detected, the service prepares for `actionB` based on the pairing strength and timing. If the user typically runs tests 2.4 seconds after saving, the test runner begins initializing at the 2-second mark so it's ready when needed.

---

## Surface Predictions

The service predicts which UI surfaces the user is likely to need next:

```typescript
interface SurfacePrediction {
  surfaceId: string;         // The predicted surface (panel, view, editor)
  probability: number;       // 0.0 to 1.0 — likelihood of being needed
  context: string;           // The current context driving the prediction
  basedOn: string[];         // The observations that inform this prediction
}
```

### Prediction Behavior

Predictions never result in surfaces being forced open. Instead, they influence:

1. **Pre-loading**: Predicted surfaces are loaded into memory so they appear instantly when summoned
2. **Pre-positioning**: Tab order and panel layout are subtly adjusted so predicted surfaces are easier to reach
3. **Quick-access hints**: Predicted surfaces appear in the command palette with higher relevance scores

The probability threshold for any visible action is **0.75** — below this, the prediction is used only for invisible optimizations (pre-loading, caching). Above 0.75, the service may make the surface slightly more accessible (e.g., moving it to the front of a tab group).

---

## Spatial Familiarity Tracking

Beyond specific layout measurements, the service tracks **spatial familiarity** — a holistic sense of how "at home" the user feels in their workspace. This is measured by:

- **Time-to-first-action**: How quickly the user starts working after opening the IDE
- **Navigation efficiency**: Whether the user goes directly to what they need or searches/browses
- **Layout override rate**: How often the user manually adjusts the auto-restored layout
- **Panel discovery time**: How long it takes the user to find a feature they've used before

When spatial familiarity is high, the service maintains the current configuration. When it drops, the service investigates whether a layout change or contextual shift caused the disorientation and adjusts accordingly.

---

## Productive Configuration Restoration

When the IDE restarts, updates, or the user returns after an extended absence, the service restores the **most productive configuration** — the layout and surface arrangement that was associated with the user's longest focused work sessions in the relevant context.

### Restoration Priority

1. **Exact session state** — If the user closed the IDE mid-workflow, restore exactly where they left off
2. **Context-matched layout** — If starting fresh, apply the layout most associated with the current project type
3. **Recent preference** — If no context match exists, apply the most recently used layout
4. **Default configuration** — Only as a last resort; the system aims to never show a generic workspace

---

## Anti-Patterns (Strictly Prohibited)

1. **Forgotten layouts** — The workspace should never revert to defaults without the user's explicit action. Layout memory is persistent and sacred.
2. **Broken sequences** — Workflow sequences should be maintained across interruptions. If the user was in a TDD cycle, returning to the IDE should restore the test results panel and the split editor view.
3. **Unfamiliar workspace on return** — Returning to the IDE after any absence should feel like coming home, not like walking into someone else's office. Every restored element should match the user's established preferences.
4. **Aggressive layout changes** — The service should never dramatically rearrange the workspace without the user's initiative. All changes should be incremental and contextual.
5. **Surveillance creep** — Only spatial and structural data is tracked. No content inspection, no file content analysis, no keystroke logging beyond what is necessary for spatial memory.
