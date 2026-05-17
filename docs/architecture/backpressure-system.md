# Backpressure System — Architecture

## Overview

The Backpressure System prevents subsystem overload by queueing, delaying, or rejecting operations when the system is under stress. It provides graduated pressure levels across 6 subsystems.

## Subsystems with Backpressure

| Subsystem | ID | Description |
|-----------|-----|-------------|
| Event Bus | event-bus | Unified cross-system event bus |
| Execution Graph | execution-graph | Graph node/edge mutations |
| Execution Service | execution-service | File mutation pipeline |
| Agent Orchestrator | agent-orchestrator | Agent plan creation/execution |
| Process Orchestrator | process-orchestrator | Process launch/management |
| Context Engine | context-engine | Context domain updates |

## Backpressure Levels

```
None ──► Light ──► Medium ──► Heavy ──► Full
  │         │          │         │         │
  │         │          │         │         └─ All ops blocked (except system recovery)
  │         │          │         └─ Only safety-critical ops pass
  │         │          └─ Queue most ops, only critical passes
  │         └─ Queue non-essential ops
  └─ Operate normally
```

## Level Details

| Level | Accepting | Queued Ops | Effect |
|-------|-----------|------------|--------|
| None | ✓ | 0 | Normal operation |
| Light | ✓ | Few | Non-essential deferred |
| Medium | ✗ | Many | Only critical passes |
| Heavy | ✗ | Most | Safety-critical only |
| Full | ✗ | All | System recovery only |

## Backpressure Flow Model

```
Operation Request
       │
       ▼
Check Backpressure Level
       │
       ├── None/Light → Allow (with possible delay)
       │
       ├── Medium → Queue if critical, Reject if not
       │
       ├── Heavy → Queue if safety, Reject otherwise
       │
       └── Full → Queue only system-recovery, Reject all else
       │
       ▼
When Released:
  - Process queued operations in priority order
  - Gradual resume (not all at once)
```

## Automatic Backpressure

The stability state machine automatically applies backpressure:

| Stability State | Auto-Backpressure |
|----------------|-------------------|
| Stable | Release all |
| Degraded | None (monitor only) |
| Throttled | Medium on EventBus + AgentOrchestrator |
| Critical | Heavy on all subsystems |
| Recovery | Gradual release |
