# Workspace Intelligence System

## Phase 6 — Real Vibecode AI-Native IDE

## Overview

The Workspace Intelligence system provides live tracking of open editors, active files, recently edited files, workspace folders, file hierarchy, language types, and execution hotspots. It is the foundation of the Context Engine's real-time awareness.

## Integration Points

```
┌─────────────────────────────────────────────────────────────┐
│                    AIContextService                           │
│                                                              │
│  ┌────────────────┐  ┌────────────────┐  ┌──────────────┐ │
│  │ EditorService   │  │ Workspace      │  │ TextFile     │ │
│  │ (open editors) │  │ ContextService │  │ Service      │ │
│  │                │  │ (root folders) │  │ (dirty/open) │ │
│  └───────┬────────┘  └───────┬────────┘  └──────┬───────┘ │
│          │                   │                   │          │
│          ▼                   ▼                   ▼          │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              Live Workspace Tracker                  │   │
│  │                                                     │   │
│  │  - Sync open editors on init                        │   │
│  │  - Track file open/close/dirty events               │   │
│  │  - Debounce file modification events (300ms)        │   │
│  │  - Update FileContext entries incrementally          │   │
│  └────────────────────────┬────────────────────────────┘   │
│                           │                                  │
│                           ▼                                  │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              Execution Graph Integration              │   │
│  │                                                     │   │
│  │  onDidCompleteNode → Update FileContext.editCount    │   │
│  │                   → Update mutationTimeline          │   │
│  │                   → Update hotspots                  │   │
│  │                   → Update clusters                  │   │
│  │                   → Update co-modification           │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## Live Tracking Features

### Open Editor Tracking
- On service init, sync with `editorService.editors` to get currently open files
- Subscribe to `textFileService.files.onDidResolve` for file open events
- Subscribe to `textFileService.files.onDidChangeDirty` for dirty state tracking
- Maintain `_openFiles` and `_dirtyFiles` sets for fast lookup

### File Modification Debouncing
File modifications arrive rapidly (every keystroke). The engine debounces these:
1. `notifyFileModified(uri)` adds the URI to `_pendingFileChanges`
2. A 300ms debounce timer is set/reset
3. When the timer fires, all pending changes are processed at once
4. This prevents thrashing the context engine on rapid edits

### Hotspot Formation
Hotspots form when a file receives ≥3 mutations within a 30-minute rolling window:

```
File A receives 5 edits in 30 min → hotspotScore = min(1, 5/20) * recency
File B receives 1 edit in 30 min  → not a hotspot (below threshold)
File C receives 15 edits in 30 min → hotspotScore ≈ 0.75 * recency
```

Active hotspots (mutations in last 5 minutes) are flagged for UI highlighting.

### Co-Modification Detection
When two files are modified within 5 minutes of each other, they are recorded as co-modified. This data is used by:
- `getRelevantFiles()` — returns co-modified files as high-relevance results
- `getDependencyChain()` — supplements static dependency analysis
- AI agent planning — understands which files change together

## Execution Hotspot View

The hotspot tracking system maintains a rolling window:

| Metric | Value |
|--------|-------|
| Window size | 30 minutes |
| Min mutations for hotspot | 3 |
| Score formula | `min(1, count / 20) * recency(max(0, 1 - age/window))` |
| Active threshold | Mutations in last 5 minutes |
| Max tracked hotspots | Unbounded (pruned by window) |
