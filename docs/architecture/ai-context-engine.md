# AI Context Engine Architecture

## Phase 6 — Real Vibecode AI-Native IDE

## Overview

The AI Context Engine is a continuously evolving structured understanding of workspace state. It is NOT a chatbot memory, NOT a flat index, and NOT a search cache. It provides live workspace awareness, file relationships, dependency understanding, execution memory, and semantic project context for AI reasoning support.

## Context Domains

The engine maintains 7 distinct context domains, each with its own freshness model and invalidation strategy:

### 1. WorkspaceContext
- Root workspace folders
- Language distribution (extension → file count)
- Total file count and hierarchy depth
- **Invalidation**: On workspace folder changes
- **Freshness**: Recomputed on scan

### 2. FileContext
- Per-file edit count, open count, last edited/opened timestamps
- Co-modified files (files frequently edited together)
- Hotspot score (0–1, mutation frequency weighted by recency)
- Open/dirty state from EditorService
- **Invalidation**: OnFileChange
- **Freshness**: Live (updated on every graph event)

### 3. SymbolContext
- Exported/imported symbols (functions, classes, interfaces, types, enums, constants)
- Cross-file references
- Definition locations (file + line)
- **Invalidation**: OnFileChange
- **Freshness**: Recent (updated on file save)

### 4. DependencyContext
- Import/require edges between files
- Confidence scoring (static analysis vs heuristic vs co-modification)
- Hub files (imported by many) and leaf files (import many)
- Cycle detection
- **Invalidation**: OnDependencyChange
- **Freshness**: Recent (updated on file save)

### 5. ExecutionContext
- Active files (from execution graph)
- Active scopes
- Recent execution lineage per file
- Files currently being mutated
- **Invalidation**: OnExecutionEvent
- **Freshness**: Always Live (derived from ExecutionGraphService in real-time)

### 6. MutationContext
- Mutation hotspots (files with frequent edits in a time window)
- Hotspot score computation: `min(1, mutationCount / 20) * recency`
- Active hotspots (mutations in last 5 minutes)
- **Invalidation**: TimeBased (30-minute rolling window)
- **Freshness**: Live

### 7. TemporalContext
- Execution clusters (groups of related mutations over time)
- Trending files (increasing activity) and declining files
- All-time hotspots
- Project evolution over time
- **Invalidation**: TimeBased
- **Freshness**: Recent

## Freshness Model

| Level | Age | Meaning |
|-------|-----|---------|
| Live | < 1s | Perfectly current — updated in real-time |
| Recent | < 1min | Current enough for most uses |
| Stale | < 1hr | May be slightly stale — refresh recommended |
| Outdated | > 1hr | Needs refresh before use |

## Context Lifecycle

```
Workspace Open
  │
  ▼
Initial Scan (deferred 100ms)
  ├── Sync open editors → FileContext
  ├── Compute language distribution → WorkspaceContext
  └── Fire ContextDomain.Workspace update
  │
  ▼
Editor Activity
  ├── File opened → notifyFileOpened() → FileContext.isOpen=true
  ├── File closed → notifyFileClosed() → FileContext.isOpen=false
  └── File modified → notifyFileModified() (debounced 300ms) → FileContext.lastEditedAt
  │
  ▼
Execution Graph Events
  ├── Node completed → _onGraphNodeCompleted()
  │     ├── Update FileContext.editCount, hotspotScore
  │     ├── Append to mutationTimeline
  │     ├── Update hotspots
  │     ├── Update clusters
  │     └── Update co-modification tracking
  └── (All updates are incremental — never rebuild from scratch)
  │
  ▼
Persistence (every 20s)
  ├── Flush dirty domains to JSONL
  ├── Clear WAL
  └── Mark domains clean
```

## Invalidation Strategy

Each file context entry carries its own invalidation strategy:

- **Never**: Workspace-level context (replaced on scan)
- **OnFileChange**: File context, symbols — invalidated when file content changes
- **OnSave**: Dependencies — invalidated when file is saved (imports may change)
- **TimeBased**: Hotspots, clusters — invalidated by rolling time window
- **OnDependencyChange**: Dependency map — invalidated when imports change
- **OnExecutionEvent**: Execution context — always live, derived from graph

## Consistency Guarantees

1. **No stale reads**: ExecutionContext is always Live (derived from graph in real-time)
2. **Incremental updates**: Only changed entries are modified, never full rebuilds
3. **Bounded memory**: Max 5000 tracked files, 200 symbols/file, 10000 dependency edges
4. **Debounced writes**: File modifications are debounced at 300ms to avoid thrashing
5. **Event-driven**: All updates are triggered by events, not polling
