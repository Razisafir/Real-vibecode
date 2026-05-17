# Load Control System — Architecture

## Overview

The Global Load Controller tracks system pressure across 5 dimensions and provides adaptive throttling to prevent overload.

## Load Metrics

| Metric | Source | Calculation |
|--------|--------|-------------|
| CPU Pressure | Brain health metrics | min(1, avgTickDurationMs / 200) |
| Event Bus Saturation | Brain event bus stats | min(1, eventsPerSecond / 500) |
| Graph Mutation Rate | Brain health metrics | graphGrowthRate |
| Agent Concurrency | AgentOrchestrator | activeAgents / totalAgents |
| Process Concurrency | ProcessOrchestrator | activeProcesses / maxConcurrent |

## Overall Load Score

```
overallLoad = cpuPressure × 0.3 +
              eventBusSaturation × 0.2 +
              graphMutationPressure × 0.2 +
              agentConcurrency × 0.15 +
              processConcurrency × 0.15
```

## Threshold Configuration

| Threshold | Default | Effect |
|-----------|---------|--------|
| cpuPressureThrottle | 0.7 | Degraded state |
| cpuPressureCritical | 0.9 | Critical state |
| eventBusThrottle | 0.6 | Apply backpressure |
| eventBusCritical | 0.85 | Heavy backpressure |
| graphMutationThrottle | 100/sec | Queue mutations |
| graphMutationCritical | 200/sec | Block mutations |
| agentConcurrencyThrottle | 0.7 | Defer agent plans |
| agentConcurrencyCritical | 0.9 | Block agent creation |

## Load-to-State Mapping

| Load | State | Action |
|------|-------|--------|
| 0–0.49 | Stable | No throttling |
| 0.5–0.69 | Degraded | Light throttling, defer non-critical |
| 0.7–0.89 | Throttled | Medium throttling, no new agent plans |
| 0.9+ | Critical | Heavy throttling, only safety ops |
