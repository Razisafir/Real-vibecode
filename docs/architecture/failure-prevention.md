# Failure Cascade Prevention — Architecture

## Overview

The Failure Cascade Prevention system ensures that when one subsystem fails, the failure does not propagate to other subsystems. It uses isolation boundaries, containment zones, quarantine, and degradation paths.

## Isolation Boundaries

| Boundary | Protects |
|----------|----------|
| Agent | Agent failures don't affect other agents |
| Process | Process failures don't affect other processes |
| Graph | Graph issues don't affect execution |
| Context | Context issues don't affect execution |
| Mutation | Mutation issues don't affect UI |
| UI | UI is never blocked by backend issues |

## Containment Zones

```
┌─────────────┐ ┌─────────────┐ ┌──────────────┐
│  Agent Zone  │ │ Process Zone│ │  Graph Zone  │
│              │ │              │ │              │
│ AgentOrch.   │ │ ProcessOrch. │ │ ExecGraph    │
└──────┬───────┘ └──────┬───────┘ └──────┬───────┘
       │                │                │
       │   ┌────────────┼────────────────┤
       │   │            │                │
       ▼   ▼            ▼                ▼
┌─────────────┐ ┌──────────────┐ ┌──────────────┐
│Mutation Zone│ │ Context Zone │ │   UI Zone    │
│             │ │              │ │              │
│ ExecService │ │ ContextEngine│ │     UI       │
└─────────────┘ └──────────────┘ └──────────────┘
```

## Degradation Paths

When a subsystem is quarantined, it follows a degradation path:

| Path | Description | Example |
|------|-------------|---------|
| None | Subsystem operating normally | — |
| ReadOnly | No writes allowed | Graph inconsistency → read-only graph |
| Queued | Operations queued but not executed | Error spike → queue operations |
| Disabled | Subsystem temporarily disabled | Crash → disable subsystem |
| Fallback | Using cached/stale data | Context staleness → use cached context |

## Failure → Degradation Mapping

| Failure Type | Degradation | Auto-Recoverable |
|-------------|-------------|-----------------|
| crash | Disabled | No |
| unresponsive | Disabled | No |
| error-spike | Queued | Yes |
| inconsistency | ReadOnly | Yes |

## Cascade Prevention Logic

When a subsystem fails:
1. **Quarantine** only the failing subsystem
2. **Do NOT quarantine** adjacent subsystems
3. **Apply light backpressure** to adjacent zones as a precaution
4. **Monitor** for secondary failures
5. **Release** quarantine when the subsystem recovers

Example:
```
Process failure spike →
  1. Quarantine ProcessOrchestrator (Queued)
  2. Apply light backpressure to AgentOrchestrator
  3. Apply light backpressure to ContextEngine
  4. Graph continues operating normally
  5. UI continues operating normally
```
