# Global Execution Brain — Architecture

## Overview

The Global Execution Brain is the **coordination layer** that binds all AI-native subsystems into one unified intelligence loop. It is NOT another subsystem — it is the meta-layer that ensures every system operates in concert.

## Connected Systems

```
                    ┌─────────────────────────┐
                    │   Global Execution Brain │
                    │                         │
                    │  Intent Model           │
                    │  Event Bus              │
                    │  Decision Engine        │
                    │  Conflict Resolver      │
                    │  Sync Layer             │
                    │  Execution Loop         │
                    │  Health Monitor         │
                    │  Coherence Validator    │
                    │  Dashboard              │
                    └──────────┬──────────────┘
                               │
        ┌──────────┬───────────┼───────────┬──────────┐
        │          │           │           │          │
   ┌────▼───┐ ┌───▼────┐ ┌───▼────┐ ┌───▼────┐ ┌──▼─────┐
   │ Agent  │ │Process │ │Context │ │ Graph  │ │Unified │
   │Orch.   │ │Orch.   │ │Engine  │ │Engine  │ │State   │
   └────────┘ └────────┘ └────────┘ └────────┘ └────────┘
        │          │           │           │          │
   ┌────▼──────────▼───────────▼───────────▼──────────▼────┐
   │              AIExecutionService + Observability       │
   └──────────────────────────────────────────────────────┘
```

## Core Design Principles

1. **No Direct Execution** — The Brain never executes actions directly; it delegates to existing services
2. **No Replacement** — The Brain does not replace any existing service
3. **No Duplication** — The Brain does not duplicate logic from subsystems
4. **Coordinate Only** — The Brain coordinates, arbitrates, and synchronizes
5. **Intent Tracing** — All system actions must be traceable back to an Intent

## Service Registration

| # | Service | Dependencies | Phase |
|---|---------|-------------|-------|
| 15 | IGlobalExecutionBrainService | Execution, Graph, State, Observability, Agent, Process, Context | 9 |
| 16 | IBrainDashboardService | Brain, Agent, Process, Graph, Observability, Context, State | 9 |

## Key Interfaces

### IGlobalExecutionBrainService

The central coordination service with 9 major areas:

1. **Intent Management** — Create, resolve, approve, and trace intents
2. **Event Bus** — Unified cross-system event propagation
3. **Decision Engine** — Arbitration rules and conflict resolution
4. **Conflict Detection** — Automatic detection of 9 conflict types
5. **Synchronization** — Checkpointing, reconciliation, drift detection
6. **Execution Loop** — The global heartbeat with configurable phases
7. **Health Monitor** — Metrics tracking with threshold-based alerts
8. **Coherence Validation** — 8 coherence check types with auto-repair
9. **System Status** — Comprehensive status queries

### IBrainDashboardService

5 dashboard view models:

1. **GlobalTimelineViewModel** — Execution timeline with intent/decision/conflict overlays
2. **ActiveIntentsViewModel** — Intents grouped by resolution, source, and action type
3. **SystemHealthViewModel** — Health metrics, alerts, and history
4. **ConflictQueueViewModel** — Active conflicts by severity and type
5. **ExecutionFlowMapViewModel** — Subsystem states and data flows

## Files

| File | Purpose |
|------|---------|
| `common/globalExecutionBrain.ts` | All interfaces, types, enums (Tasks 1-10) |
| `browser/globalExecutionBrain.ts` | Full runtime implementation |
| `browser/brainDashboardService.ts` | Dashboard UI service |
| `browser/phase9Validation.ts` | 10 validation tests |
