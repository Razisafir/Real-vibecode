# Global Event Normalization — Architecture

## Overview

The Global Event Normalization Service (`IGlobalEventNormalizationService`, #64) solves a problem that silently plagues every large multi-layer system: event chaos. Across 16 phases and 59 services, the Real-vibecode system accumulated dozens of event types, naming conventions, payload schemas, and semantic meanings. The Execution layer emits `ExecutionStarted`, `PlanCompleted`, and `FileMutated` events. The UX layer emits `UIUpdated`, `UserAction`, and `DisplayStateChanged` events. The Human Workflow layer emits `ApprovalRequested`, `DecisionMade`, and `GateOpened` events. Many of these events carry duplicate or overlapping semantic meaning — an `ExecutionCompleted` event from the Execution layer and a `PlanFinished` event from the UX layer often mean the exact same thing.

The Event Normalization Service transforms this chaotic event landscape into a single, canonical event model. Every raw event from any layer is normalized into a canonical system event with a consistent schema, deduplicated semantics, and proper causal linking. Downstream consumers no longer need to understand the idiosyncrasies of each layer's event vocabulary — they subscribe to canonical events and receive a clean, deduplicated, semantically consistent stream.

This service is the foundation that makes the Cross-Layer Signal Bus, the Layer Synchronization Service, and the System Coherence Engine possible. Without normalized events, cross-layer communication is a babble of incompatible dialects; with normalized events, it becomes a single coherent language.

## Normalization Pipeline

The normalization pipeline processes every raw event through a sequence of stages that progressively refine it into a canonical system event:

```
Raw Event (from any layer)
      │
      ▼
┌──────────────────┐
│  1. Schema        │    Normalize event structure to
│     Normalization │    canonical ISchemaCompliantEvent
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  2. Semantic      │    Map layer-specific event types
│     Mapping       │    to canonical SystemEventType
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  3. Deduplication │    Remove semantically duplicate
│     & Merging     │    events; merge overlapping ones
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  4. Causal        │    Establish causal links between
│     Linking       │    events (causationId, correlationId)
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  5. Suppression   │    Suppress events based on rules
│     & Filtering   │    (noise, rate-limiting, irrelevance)
└────────┬─────────┘
         │
         ▼
Canonical System Event
(ICanonicalSystemEvent)
```

### Stage 1: Schema Normalization

Every raw event, regardless of its source layer, is transformed to conform to a single canonical schema:

```typescript
interface ICanonicalSystemEvent {
  readonly eventId: string;              // Globally unique, deterministic ID
  readonly eventType: SystemEventType;   // Canonical event type
  readonly timestamp: number;            // High-resolution timestamp
  readonly sourceLayer: Layer;           // Originating layer
  readonly sourceServiceId: string;      // Specific originating service
  readonly payload: ICanonicalPayload;   // Normalized, typed payload
  readonly metadata: IEventMetadata;     // Correlation, causation, tracing
  readonly dedupKey: string;             // Key for duplicate detection
  readonly semanticGroup: string;        // Grouping key for related events
}
```

Schema normalization handles:
- **Timestamp normalization**: All timestamps converted to monotonic high-resolution clock
- **ID generation**: Deterministic event IDs based on source, type, and timestamp
- **Payload standardization**: Layer-specific payloads mapped to canonical payload types
- **Metadata extraction**: Correlation and causation IDs extracted from layer-specific formats

### Stage 2: Semantic Mapping

Different layers use different names for the same conceptual event. The semantic mapping stage translates these into canonical `SystemEventType` values:

| Layer-Specific Event | Canonical SystemEventType | Notes |
|---------------------|--------------------------|-------|
| `ExecutionStarted` | `system.execution.started` | Plan execution began |
| `PlanRunning` (UX) | `system.execution.started` | Same event, different source |
| `PlanCompleted` (Exec) | `system.execution.completed` | Plan execution finished |
| `PlanFinished` (UX) | `system.execution.completed` | Same event, different source |
| `FileMutated` (Exec) | `system.file.mutated` | File was modified |
| `FileChanged` (UX) | `system.file.mutated` | Same event, different source |
| `ApprovalRequested` (Human) | `system.human.approval_requested` | Human approval needed |
| `NeedsApproval` (UX) | `system.human.approval_requested` | Same event, different source |
| `DecisionMade` (Human) | `system.human.decision_made` | Human made a decision |
| `ThrottleApplied` (Stability) | `system.stability.throttled` | Throttle activated |
| `LoadReduced` (UX) | `system.stability.throttled` | Same event, different source |

### Stage 3: Deduplication and Merging

When multiple layers emit semantically identical events for the same occurrence, the deduplication stage merges them into a single canonical event:

#### Deduplication Rules

| Rule | Description | Example |
|------|-------------|---------|
| **Same-occurrence merge** | Multiple events describing the same real occurrence are merged | `ExecutionStarted` + `PlanRunning` → single `system.execution.started` with multiple source attestations |
| **Temporal window merge** | Events of the same type within a time window are merged | 50 `file.mutated` events within 100ms → single batched mutation event |
| **Semantic subsumption** | A more specific event subsumes a less specific one | `system.execution.completed` subsumes `system.execution.progress.100_percent` |
| **Source priority** | When merging, prefer the more authoritative source | Execution layer's event preferred over UX layer's for execution state |

#### Merge Strategy

```
Event A (from Execution)          Event B (from UX)
  type: system.execution.started    type: system.execution.started
  timestamp: 1000.234               timestamp: 1000.456
  payload: { planId: "p1" }         payload: { planId: "p1" }
  source: execution                 source: ux
         │                                │
         └──────────┬─────────────────────┘
                    │
                    ▼
          Merged Canonical Event
  type: system.execution.started
  timestamp: 1000.234  (earliest timestamp)
  payload: { planId: "p1" }  (execution layer's payload preferred)
  sources: [execution, ux]  (all sources recorded)
  dedupKey: "exec-started-p1"  (deterministic key)
  mergeCount: 2  (number of raw events merged)
```

### Stage 4: Causal Linking

Events in the system are causally connected — a human approval causes an execution to start, which causes a file to be mutated, which causes the UX to update. The causal linking stage establishes these relationships:

| Link Type | Meaning | Example |
|-----------|---------|---------|
| `causationId` | This event was directly caused by the referenced event | `system.execution.started` caused by `system.human.decision_made` |
| `correlationId` | This event is part of the same operation as the referenced event | All events in a plan execution share a correlation ID |
| `parentEventId` | This event is a child of a composite event | Individual file mutations are children of a batch mutation event |
| `relatedEventIds` | Events that are related but not causally connected | A stability throttle that coincides with an execution start |

### Stage 5: Suppression and Filtering

Not every event needs to reach every consumer. The suppression stage reduces event noise:

| Suppression Type | When Applied | Example |
|-----------------|-------------|---------|
| **Rate limiting** | More than N events of same type per second | `system.file.mutated` limited to 10/s per source |
| **Noise filtering** | Events below a significance threshold | Sub-1% progress updates suppressed |
| **Relevance filtering** | Events irrelevant to the current system intent | Debug trace events during production mode |
| **Burst suppression** | Events arriving in rapid succession for the same entity | 100 state changes in 50ms → single final-state event |
| **Echo suppression** | Events that are just echoes of already-normalized events | UX re-emitting an event that originated from Execution |

## Event Volume Management

The normalization service is designed to handle the high event volumes that a 69-service system generates:

| Metric | Target | Mechanism |
|--------|--------|-----------|
| Raw event throughput | Up to 10,000 events/second | In-memory ring buffer for ingress |
| Normalized event throughput | Up to 2,000 events/second | Deduplication and merging reduce volume |
| Deduplication rate | 30–60% reduction typical | Same-occurrence merge + temporal window merge |
| Suppression rate | 10–20% additional reduction | Rate limiting + noise filtering |
| End-to-end latency | < 5ms for normalization | Pipeline is fully in-memory, no I/O |
| Memory budget | Max 50MB for event buffers | Ring buffer with automatic eviction |

## Canonical Event Categories

All canonical system events are organized into a consistent category hierarchy:

```
system
├── execution
│   ├── started
│   ├── completed
│   ├── failed
│   ├── cancelled
│   └── progress
├── file
│   ├── mutated
│   ├── created
│   ├── deleted
│   └── reverted
├── human
│   ├── approval_requested
│   ├── decision_made
│   ├── escalation_raised
│   └── clarification_needed
├── stability
│   ├── throttled
│   ├── recovered
│   ├── degraded
│   └── critical
├── replay
│   ├── snapshot_created
│   ├── time_travel_initiated
│   └── historical_query
└── system
    ├── intent_changed
    ├── coherence_changed
    ├── sync_status_changed
    └── feedback_loop_triggered
```

## Service Registration

| # | Service | Dependencies | Phase |
|---|---------|-------------|-------|
| 64 | IGlobalEventNormalizationService | CrossLayerSignalBus, CausalLinking, SystemCoherenceEngine | 17 |

## Interface Contract

```typescript
interface IGlobalEventNormalizationService {
  readonly eventsProcessed: number;
  readonly eventsDeduplicated: number;
  readonly eventsSuppressed: number;

  normalize(rawEvent: IRawLayerEvent): ICanonicalSystemEvent;
  normalizeBatch(rawEvents: ReadonlyArray<IRawLayerEvent>): ReadonlyArray<ICanonicalSystemEvent>;
  registerSemanticMapping(mapping: ISemanticMapping): void;
  registerSuppressionRule(rule: ISuppressionRule): void;
  getCanonicalEvent(eventId: string): ICanonicalSystemEvent | undefined;
  getEventsByCorrelation(correlationId: string): ReadonlyArray<ICanonicalSystemEvent>;
  subscribe(filter: ICanonicalEventFilter, handler: ICanonicalEventHandler): IDisposable;
}
```

## Files

| File | Purpose |
|------|---------|
| `common/globalEventNormalization.ts` | All interfaces, types, enums (SystemEventType, ICanonicalSystemEvent, ISemanticMapping) |
| `browser/globalEventNormalizationService.ts` | Full runtime implementation with 5-stage pipeline |
| `browser/phase17EventNormalizationValidation.ts` | Validation tests for normalization, deduplication, and suppression |
