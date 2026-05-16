# UI Execution Layer Architecture

## Phase 5 — Real Vibecode AI-Native IDE

## Overview

The UI Execution Layer bridges the AI kernel's backend services and the workbench's user interface. It provides three primary UI integration points:

1. **Execution Timeline Panel** — Shows execution graph nodes grouped by scope
2. **AI Action Indicator** — Status bar / title bar indicator for kernel activity
3. **Mutation Preview** — Before/after diff for AI edits

## Execution Timeline Panel

### Data Model

```
IExecutionTimelineModel
├── groups: IExecutionTimelineGroup[]
│   ├── scopeId: string
│   ├── label: string
│   ├── active: boolean
│   ├── source: AIMutationSource
│   └── entries: IExecutionTimelineEntry[]
│       ├── nodeId: string
│       ├── label: string
│       ├── type: ExecutionNodeType
│       ├── source: AIMutationSource
│       ├── pending: boolean
│       ├── success: boolean
│       ├── rolledBack: boolean
│       ├── fileUri: URI
│       ├── timestamp: number
│       ├── editCount: number
│       └── error?: string
└── totalCount: number
```

### Update Strategy

The timeline is event-driven — it rebuilds whenever:
- A graph node is created (`onDidCreateNode`)
- A graph node is completed (`onDidCompleteNode`)
- A graph edge is created (`onDidCreateEdge`)

This ensures real-time updates without polling.

### Scope Grouping

Entries are grouped by execution scope. Scope grouping enables:
- Visual separation of related operations
- Batch status indication (entire scope pending/succeeded/failed)
- Collapsible sections for large workspace edits

Root nodes without a scope are placed in an "Individual Operations" group.

### Entry Rendering

Each entry shows:
- Icon by type (file-edit, AI action, save, etc.)
- Label (file path + line range or operation description)
- Source badge (AI, User, System)
- Status indicator (pending spinner, success check, failure X, rolled-back arrow)
- Timestamp (relative: "2s ago", "5m ago")

## AI Action Indicator

### State Model

```
IAIActionIndicatorState
├── active: boolean
├── source: AIMutationSource | undefined
├── label: string          ("AI Kernel: Ready", "AI Kernel: AI Agent")
├── tooltip: string        (detailed status + pending count)
├── phase: AIRuntimePhase
├── pendingCount: number
└── showProgress: boolean
```

### Indicator States

| Phase | Label | Animation |
|-------|-------|-----------|
| Uninitialized | "AI Kernel: Initializing" | None |
| Hydrating | "AI Kernel: Loading State" | Progress |
| GraphPending | "AI Kernel: Preparing" | Progress |
| Ready | "AI Kernel: Ready" | None |
| Executing (AI) | "AI Kernel: AI Agent" | Spinning |
| Executing (User) | "AI Kernel: User Action" | None |
| ShuttingDown | "AI Kernel: Shutting Down" | None |
| Disposed | "AI Kernel: Offline" | None |

### Update Triggers

The indicator updates whenever `UnifiedStateService.onDidChangeState` fires. This is a synchronous event, so the indicator always reflects the current state with zero lag.

## Mutation Preview

### Data Model

```
IMutationPreview
├── nodeId: string
├── fileUri: URI
├── beforeContent: string | undefined
├── afterContent: string | undefined
├── affectedRanges: IMutationRange[]
└── available: boolean
```

### Availability

Mutation previews are available for completed, successful nodes with `editCount > 0`. Currently, `beforeContent` and `afterContent` are stubs (future: integrate with text model snapshot cache).

### Navigation

- `navigateToEntry(entry)` — Opens the affected file in the editor
- `navigateToDiff(preview)` — Opens a diff editor (future: side-by-side before/after)

## UI + Backend Interaction Map

```
┌─────────────────────────────────────────────────────────────┐
│                     UI Layer                                 │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────────┐ │
│  │  Timeline     │  │  Indicator   │  │  Mutation Preview  │ │
│  │  Panel        │  │  (Status)    │  │  (Diff View)       │ │
│  └──────┬───────┘  └──────┬───────┘  └────────┬──────────┘ │
│         │                 │                    │             │
└─────────┼─────────────────┼────────────────────┼─────────────┘
          │                 │                    │
          ▼                 ▼                    ▼
┌─────────────────────────────────────────────────────────────┐
│              AIExecutionUIService                             │
│                                                              │
│  - timelineModel      - indicatorState      - getPreview()   │
│  - onDidChangeTimeline  onDidChangeIndicator  onDidGenPreview│
│  - refreshTimeline()   - navigateToEntry()  - navigateToDiff│
│                                                              │
└────────────┬───────────────────┬────────────────────────────┘
             │                   │
             ▼                   ▼
┌─────────────────────────────────────────────────────────────┐
│           Backend Services                                    │
│                                                              │
│  ExecutionGraphService ─── AIUnifiedStateService             │
│  (onDidCreateNode)        (onDidChangeState)                 │
│  (onDidCompleteNode)                                       │
│  (onDidCreateEdge)                                         │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Performance Considerations

1. **Timeline refresh rate**: The timeline rebuilds on every graph event. For rapid-fire operations (e.g., bulk refactoring across 100 files), this could cause excessive DOM updates. Mitigation: debounce rebuilds to 50ms intervals.

2. **Indicator updates**: State transitions are infrequent (only when execution starts/stops), so indicator updates are cheap.

3. **Trace buffer**: The observability ring buffer is 10,000 entries. In dev mode, trace events fire for every operation. In production mode, only errors and warnings are recorded.

4. **Persistence flush**: Increased from 30s to 15s in Phase 5 for better crash recovery. The WAL ensures no data is lost between flushes.
