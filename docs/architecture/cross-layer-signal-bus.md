# Cross-Layer Signal Bus — Architecture

## Overview

The Cross-Layer Signal Bus (`ICrossLayerSignalBusService`, #61) is the unified signal routing backbone for all cross-layer communication in the Phase 17 Unification Bridge Layer. Prior to Phase 17, the 69 services across 16 phases communicated through a patchwork of direct service-to-service calls, shared event buses, and ad-hoc callback chains. This created fragile, undocumented dependencies between layers and made it impossible to reason about the flow of information through the system.

The Signal Bus enforces a single, critical architectural rule: **no service communicates directly across layers anymore**. Every signal that crosses a layer boundary — from Execution to UX, from Human Workflow to Stability, from Replay to Execution — must be routed through the Signal Bus. This gives the system a single point of observability, throttling, transformation, and auditing for all cross-layer communication.

The Signal Bus is not a replacement for intra-layer communication. Services within the same layer (e.g., two Execution services) still communicate through their established patterns. The Signal Bus only governs the boundary crossings that previously caused the most subtle and destructive bugs in the system.

## SignalPriority Enum

Every signal on the bus carries a priority that determines routing order, queuing behavior under load, and discard policy during backpressure:

| Priority | Meaning | Routing Behavior | Discard Policy |
|----------|---------|-----------------|----------------|
| `Critical` | System-safety signals (e.g., stability throttle, emergency stop) | Immediate delivery, bypasses all queues | Never discarded |
| `High` | Important operational signals (e.g., intent state change, human approval response) | Priority queue, delivered before Normal | Discarded only under extreme backpressure |
| `Normal` | Standard cross-layer signals (e.g., execution state update, UX state request) | Standard queue, FIFO within priority | Discardable under moderate backpressure |
| `Low` | Informational signals (e.g., telemetry, debug traces) | Low-priority queue | First to be discarded under load |
| `Trace` | Diagnostic signals for development only (disabled in production) | Optional queue, may be dropped at any time | Freely discardable |

### Priority Routing Flow

```
Incoming Signal
      │
      ▼
┌──────────────────┐
│ Priority Classifier│
└────────┬─────────┘
         │
    ┌────┼────┬─────┬──────┬──────┐
    │    │    │     │      │      │
    ▼    ▼    ▼     ▼      ▼      ▼
  Crit  High Norm   Low   Trace  ──► (Trace disabled in prod)
    │    │    │     │      │
    ▼    ▼    ▼     ▼      ▼
┌────────────────────────────────────┐
│        Signal Router               │
│                                    │
│  1. Apply transformation rules     │
│  2. Check destination layer health │
│  3. Apply backpressure policy      │
│  4. Route to destination layer     │
└──────────────┬─────────────────────┘
               │
               ▼
         Destination Layer
```

## SignalDirection Enum

The `SignalDirection` enum categorizes the directionality of every cross-layer signal, enabling the bus to apply layer-specific routing rules, transformation, and access control:

| Direction | Meaning | Source → Destination |
|-----------|---------|---------------------|
| `ExecutionOutbound` | Signal originating from the Execution layer going to another layer | Execution → UX/Human/Stability/Replay |
| `ExecutionInbound` | Signal arriving at the Execution layer from another layer | UX/Human/Stability/Replay → Execution |
| `UXOutbound` | Signal originating from the UX layer going to another layer | UX → Execution/Human/Stability/Replay |
| `UXInbound` | Signal arriving at the UX layer from another layer | Execution/Human/Stability/Replay → UX |
| `HumanOutbound` | Signal originating from the Human Workflow layer going to another layer | Human → Execution/UX/Stability/Replay |
| `HumanInbound` | Signal arriving at the Human Workflow layer from another layer | Execution/UX/Stability/Replay → Human |
| `StabilityOutbound` | Signal originating from the Stability layer going to another layer | Stability → Execution/UX/Human/Replay |
| `ReplayOutbound` | Signal originating from the Replay layer going to another layer | Replay → Execution/UX/Human/Stability |
| `Broadcast` | Signal intended for all layers simultaneously | Any → All |

### Direction-Based Access Control

Not every layer is allowed to send every type of signal to every other layer. The Signal Bus enforces a capability matrix:

| Source \ Dest | Execution | UX | Human | Stability | Replay |
|---------------|-----------|-----|-------|-----------|--------|
| Execution | — | ✓ | ✓ | ✓ | ✓ |
| UX | ✓ | — | ✓ | ✓ | ✗ |
| Human | ✓ | ✓ | — | ✓ | ✗ |
| Stability | ✓ | ✓ | ✓ | — | ✓ |
| Replay | ✓ | ✓ | ✓ | ✓ | — |

The blocked paths (UX→Replay, Human→Replay) exist because the replay layer must remain a passive observer — it should never be commanded by the UI or human workflow. Replay signals are always outbound only, carrying historical data to layers that request it.

## Signal Structure

Every signal on the bus conforms to a canonical structure:

```typescript
interface ICrossLayerSignal {
  readonly signalId: string;           // Unique signal identifier (UUID)
  readonly timestamp: number;          // High-resolution timestamp
  readonly direction: SignalDirection;  // Direction of travel
  readonly priority: SignalPriority;    // Routing priority
  readonly sourceLayer: Layer;          // Originating layer
  readonly targetLayer: Layer;          // Destination layer (or 'All' for Broadcast)
  readonly sourceServiceId: string;     // Specific originating service
  readonly payload: ISignalPayload;     // Type-safe payload
  readonly metadata: ISignalMetadata;   // Correlation IDs, tracing, causation
  readonly ttl: number;                 // Time-to-live in milliseconds
}
```

### Signal Metadata and Tracing

Every signal carries metadata that enables distributed tracing across layers:

| Metadata Field | Purpose |
|---------------|---------|
| `correlationId` | Links all signals related to a single cross-layer operation |
| `causationId` | Links this signal to the specific signal that caused it |
| `intentId` | Links this signal to the system intent it serves |
| `traceSpan` | Distributed tracing span for observability |
| `layerHopCount` | Number of layer boundaries this signal has crossed (max: 3) |

The `layerHopCount` is particularly important: a signal that has crossed more than 3 layer boundaries likely indicates a circular dependency or architectural violation. The bus will log a warning at hop 3 and reject the signal at hop 4.

## Signal Routing Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     CROSS-LAYER SIGNAL BUS                       │
│                                                                 │
│  ┌───────────────┐                                              │
│  │  Ingress Gate │                                              │
│  │               │                                              │
│  │ • Validate    │                                              │
│  │ • Classify    │                                              │
│  │ • Rate-limit  │                                              │
│  │ • Transform   │                                              │
│  └───────┬───────┘                                              │
│          │                                                      │
│          ▼                                                      │
│  ┌───────────────────────┐                                      │
│  │   Priority Queues     │                                      │
│  │                       │                                      │
│  │  [Critical] → Direct  │                                      │
│  │  [High]    → Queue 1  │                                      │
│  │  [Normal]  → Queue 2  │                                      │
│  │  [Low]     → Queue 3  │                                      │
│  │  [Trace]   → Queue 4  │                                      │
│  └───────────┬───────────┘                                      │
│              │                                                  │
│              ▼                                                  │
│  ┌───────────────────────┐    ┌──────────────────────┐          │
│  │   Signal Router       │◄───│  Transformation      │          │
│  │                       │    │  Rules Engine         │          │
│  │ • Access control      │    │                      │          │
│  │ • Layer health check  │    │ • Payload adaptation  │          │
│  │ • Backpressure policy │    │ • Schema translation  │          │
│  │ • Broadcast fan-out   │    │ • Enrichment          │          │
│  └───────────┬───────────┘    └──────────────────────┘          │
│              │                                                  │
│              ▼                                                  │
│  ┌───────────────────────┐                                      │
│  │   Egress Gate         │                                      │
│  │                       │                                      │
│  │ • Delivery guarantee  │                                      │
│  │ • Retry policy        │                                      │
│  │ • Dead-letter routing │                                      │
│  │ • Audit logging       │                                      │
│  └───────────────────────┘                                      │
└─────────────────────────────────────────────────────────────────┘
```

## Backpressure and Throttling

The Signal Bus implements backpressure to prevent cross-layer signal flooding:

| Condition | Response |
|-----------|----------|
| Queue size > 1000 signals per priority | Apply rate limiting to ingress |
| Queue size > 5000 signals total | Drop `Trace` and `Low` priority signals |
| Queue size > 10000 signals total | Drop `Normal` priority, retain `High` and `Critical` |
| Target layer reports unhealthy | Buffer signals, apply retry with exponential backoff |
| Signal TTL exceeded | Discard and emit `SignalExpired` audit event |

## Signal Transformation Rules

When signals cross layer boundaries, they often need transformation because layers use different vocabulary and state models. The Signal Bus applies registered transformation rules:

| Source Layer | Target Layer | Transformation |
|-------------|-------------|----------------|
| Execution | UX | Execution state → UI display state mapping |
| Execution | Human | Execution decision → Human approval request format |
| UX | Execution | User action → Execution command format |
| Human | Execution | Approval response → Execution continuation signal |
| Stability | All | Throttle directive → Layer-specific throttling format |
| Replay | Execution | Historical event → Re-execution command format |

Transformation rules are registered at startup and cannot be modified at runtime, ensuring that cross-layer communication semantics remain stable.

## Service Registration

| # | Service | Dependencies | Phase |
|---|---------|-------------|-------|
| 61 | ICrossLayerSignalBusService | SystemStabilization, GlobalEventNormalization, SystemCoherenceEngine | 17 |

## Interface Contract

```typescript
interface ICrossLayerSignalBusService {
  readonly signalQueueDepth: Readonly<Record<SignalPriority, number>>;
  readonly totalSignalsProcessed: number;

  emit(signal: ICrossLayerSignal): Promise<SignalEmitResult>;
  subscribe(filter: ISignalFilter, handler: ISignalHandler): IDisposable;
  registerTransformation(rule: ITransformationRule): void;
  getSignalTrace(correlationId: string): ReadonlyArray<ICrossLayerSignal>;
  getDeadLetterQueue(): ReadonlyArray<ICrossLayerSignal>;
}
```

## Files

| File | Purpose |
|------|---------|
| `common/crossLayerSignalBus.ts` | All interfaces, types, enums (SignalPriority, SignalDirection, ICrossLayerSignal) |
| `browser/crossLayerSignalBusService.ts` | Full runtime implementation with routing, queuing, and transformation |
| `browser/phase17SignalBusValidation.ts` | Validation tests for signal routing, backpressure, and transformation |
