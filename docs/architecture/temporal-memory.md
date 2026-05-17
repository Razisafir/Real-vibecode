# Temporal Memory System

## Phase 6 — Real Vibecode AI-Native IDE

## Overview

The Temporal Memory system tracks project evolution over time. It understands recently changed files, historical execution clusters, recurring mutation regions, high-activity code zones, and execution lineage trends.

## Execution Clusters

Clusters are groups of related mutations that occur close together in time. When mutations are separated by less than 5 minutes, they are grouped into the same cluster.

### Cluster Formation Algorithm

```
For each mutation in timeline:
  If last cluster exists AND mutation.timestamp - lastCluster.endedAt < 5 min:
    Extend last cluster (add file, increment count, update endedAt)
  Else:
    Create new cluster (startedAt = endedAt = timestamp, files = [uri])
```

### Cluster Properties

```typescript
interface IExecutionCluster {
  id: string;              // UUID
  startedAt: number;       // First mutation timestamp
  endedAt: number;         // Last mutation timestamp
  files: URI[];            // Files involved
  mutationCount: number;   // Total mutations in cluster
  dominantSource: AIMutationSource; // Most common source
  label: string;           // Auto-generated (e.g., "Cluster: app.ts")
}
```

### Cluster Examples

**Single-file cluster:**
A developer edits `app.ts` 8 times in 2 minutes:
```
Cluster { startedAt: T1, endedAt: T1+120s, files: [app.ts], mutationCount: 8, dominantSource: userAction }
```

**Multi-file cluster:**
An AI agent refactors across 3 files in 4 minutes:
```
Cluster { startedAt: T2, endedAt: T2+240s, files: [api.ts, utils.ts, types.ts], mutationCount: 12, dominantSource: aiAgent }
```

## Trending Analysis

The temporal context computes file trends by comparing mutation frequency across time windows:

```
Current hour:  fileA=5 edits, fileB=3 edits, fileC=1 edit
Previous hour: fileA=2 edits, fileB=6 edits, fileC=0 edits

Result:
  Trending UP:   fileA (5 > 2+1), fileC (1 > 0+1)
  Trending DOWN: fileB (3 < 6-1)
```

This allows AI agents to understand which files are currently active focus areas vs. files that were recently active but are cooling down.

## Mutation Timeline

The engine maintains a rolling 24-hour mutation timeline:

```typescript
_mutationTimeline: Array<{ uri: URI; timestamp: number; source: AIMutationSource }>
```

- Entries older than 24 hours are pruned
- Timeline is used for:
  - Hotspot computation (count mutations in 30-min windows)
  - Cluster formation (group by 5-min gaps)
  - Trending analysis (compare hourly windows)
  - Co-modification detection (find concurrent edits)

## Project Evolution Metrics

| Metric | Source | Use |
|--------|--------|-----|
| Project age (days) | WorkspaceContext.scannedAt | Context for AI reasoning |
| All-time hotspots | FileContext.hotspotScore | Understanding code zones |
| Recent clusters | Clusters with endedAt < 24h | Understanding recent activity |
| Trending files | Hourly mutation comparison | Predicting focus areas |
| Declining files | Hourly mutation comparison | Understanding completed work |

## Temporal Context Flow

```
Execution Graph
  │
  │ onDidCompleteNode
  ▼
Mutation Timeline (rolling 24h)
  │
  ├──→ Hotspot Computation (30-min window, min 3 mutations)
  ├──→ Cluster Formation (5-min gap = new cluster)
  ├──→ Trending Analysis (compare hourly windows)
  └──→ Co-modification Detection (5-min proximity)
  │
  ▼
TemporalContext
  ├── recentClusters
  ├── trendingFiles
  ├── decliningFiles
  └── allTimeHotspots
```
