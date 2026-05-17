# Global System Health Orchestrator — Architecture

## Overview

The Global System Health Orchestrator (`IGlobalSystemHealthOrchestratorService`, #68) is the single, authoritative source of system-wide health across all 69 services in the Real-vibecode AI Execution System. It aggregates health signals from every layer — Execution (Phases 1–11), Stability (Phase 12), UX (Phases 13–15), Human Workflow (Phase 16), and Unification (Phase 17) — and produces a single, continuously-updated system health score between 0.0 and 1.0 that represents the operational integrity of the entire platform.

Prior to Phase 17, each layer had its own health monitoring. The execution layer tracked graph health, the stability layer tracked throttle states, the UX layer tracked render performance, and the human workflow layer tracked momentum and fatigue. But no single service could answer the question: "Is the system healthy?" The answer depended on which layer you asked, and the layers often disagreed. A system could have perfectly healthy execution but degraded UX, or stable infrastructure but a human workflow layer detecting critical friction. Without a unified health view, operators and automated systems had to synthesize health from multiple independent sources — a process that was slow, inconsistent, and prone to blind spots.

The Health Orchestrator solves this by establishing a single health score that accounts for all 69 services, detects systemic instability early — before it manifests as user-visible failures — and triggers coordinated recovery actions that span multiple layers simultaneously. A recovery action in one layer often requires compensating actions in other layers; the orchestrator ensures these are coordinated rather than conflicting.

## System Health Score

The system health score is a float between 0.0 and 1.0, where:

| Score Range | Status | Meaning |
|-------------|--------|---------|
| 0.9 – 1.0 | `Healthy` | All services operating normally, no active recovery actions |
| 0.7 – 0.89 | `Degraded` | Some services showing stress, proactive recovery initiated |
| 0.5 – 0.69 | `Stressed` | Multiple services under pressure, active recovery in progress |
| 0.3 – 0.49 | `Critical` | System-wide instability, aggressive recovery actions deployed |
| 0.0 – 0.29 | `Emergency` | System in survival mode, minimal functionality preserved |

### Score Composition

The health score is a weighted aggregation of five health dimensions, each drawn from all layers:

| Dimension | Weight | Source Services | What It Measures |
|-----------|--------|----------------|-----------------|
| Execution Health | 0.30 | Services #1–11, #60–65 | Graph integrity, agent availability, process stability, replay fidelity |
| Stability Health | 0.25 | Service #12 family, #60–65 | Throttle states, backpressure levels, circuit breaker status, resource utilization |
| UX Health | 0.20 | Services #13–15 family | Render performance, interaction latency, adaptive surface responsiveness |
| Human Workflow Health | 0.15 | Services #50–59 | Momentum sustainability, friction levels, session continuity, ethical compliance |
| Unification Health | 0.10 | Services #60–69 | Coherence status, signal bus throughput, context merge success rate, conflict resolution rate |

### Score Calculation

```
System Health Score = Σ (dimension_health × dimension_weight)

Where:
  dimension_health = (1.0 - severity_penalty) × service_availability

  severity_penalty = max(active_alert_severity) for all services in dimension
  service_availability = healthy_services / total_services in dimension
```

The score is recalculated every 2 seconds from fresh health reports, and every 500ms during `Critical` or `Emergency` states.

## Per-Service Health Reporting

Every one of the 69 services reports its health to the orchestrator through a standardized health report:

```typescript
interface IServiceHealthReport {
  readonly serviceId: string;
  readonly serviceNumber: number;          // 1-69
  readonly layer: Layer;
  readonly health: number;                 // 0.0-1.0
  readonly status: ServiceHealthStatus;    // 'Healthy' | 'Degraded' | 'Failing' | 'Down'
  readonly lastHeartbeat: number;
  readonly activeAlerts: ReadonlyArray<IHealthAlert>;
  readonly resourceUsage: IResourceUsage;
  readonly dependencies: ReadonlyArray<string>;  // Service IDs this service depends on
}
```

### Health Report Aggregation

```
┌─────────────────────────────────────────────────────────────────────┐
│                    HEALTH ORCHESTRATOR                               │
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │  Service Health Collectors (69 services)                      │  │
│  │                                                               │  │
│  │  Services 1-11 (Execution) ───► Execution Health Aggregate    │  │
│  │  Service 12 family (Stability) ► Stability Health Aggregate   │  │
│  │  Services 13-15 (UX) ────────► UX Health Aggregate           │  │
│  │  Services 50-59 (Human) ─────► Human Workflow Health Agg.    │  │
│  │  Services 60-69 (Unification) ► Unification Health Aggregate  │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │  Dimension Aggregation                                        │  │
│  │                                                               │  │
│  │  Execution:    0.82 × 0.30 = 0.246                           │  │
│  │  Stability:    0.91 × 0.25 = 0.228                           │  │
│  │  UX:           0.78 × 0.20 = 0.156                           │  │
│  │  Human Wkflow: 0.95 × 0.15 = 0.143                           │  │
│  │  Unification:  0.88 × 0.10 = 0.088                           │  │
│  │                               ──────────────────               │  │
│  │  System Health Score:          0.861 (Degraded)               │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │  Instability Detection                                        │  │
│  │                                                               │  │
│  │  • Rate of change in health score                             │  │
│  │  • Cascade risk assessment (failing dependency chains)        │  │
│  │  • Cross-layer stress correlation                             │  │
│  │  • Predictive degradation forecast                            │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │  Recovery Action Dispatch                                     │  │
│  │                                                               │  │
│  │  • Select appropriate CoordinatedRecoveryAction               │  │
│  │  • Dispatch to affected services across layers                │  │
│  │  • Monitor recovery progress                                  │  │
│  │  • Adjust actions based on response                           │  │
│  └───────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

## Systemic Instability Detection

The orchestrator detects systemic instability through four complementary mechanisms:

### 1. Health Score Velocity

The rate of change of the system health score is a leading indicator of instability. A sharp decline — even from a high absolute score — signals an active problem:

| Velocity (per minute) | Assessment | Response |
|----------------------|------------|----------|
| < -0.05 | Normal fluctuation | No action |
| -0.05 to -0.15 | Early instability warning | Increase monitoring frequency, prepare recovery actions |
| -0.15 to -0.30 | Active instability | Initiate proactive recovery actions |
| > -0.30 | Cascading failure in progress | Emergency recovery, load shedding |

### 2. Cascade Risk Assessment

When a service fails, the orchestrator evaluates the cascade risk — the probability that the failure will propagate through dependency chains to other services. High cascade risk triggers preemptive stabilization of downstream services.

### 3. Cross-Layer Stress Correlation

Stress in one layer often predicts stress in another. The orchestrator maintains a correlation matrix:

| Stress Source | Predicted Impact | Lead Time |
|--------------|-----------------|-----------|
| Execution layer under load | UX latency increase in 5-15s | Pre-warm UX buffering |
| Stability throttle activation | Human workflow momentum drop in 10-30s | Prepare recovery support |
| UX render degradation | Human friction signals in 15-45s | Reduce interaction complexity |
| Human fatigue detection | Execution error rate increase in 30-60s | Increase execution validation |

### 4. Predictive Degradation Forecast

Using historical health score patterns, the orchestrator forecasts likely degradation trajectories. If the current trajectory would reach `Critical` within 60 seconds, preemptive recovery actions are initiated even if the current score is `Degraded`.

## CoordinatedRecoveryAction Types

When the orchestrator detects instability, it selects and dispatches one or more coordinated recovery actions. These actions are designed to span multiple layers simultaneously:

### 1. Restart

The most aggressive recovery action. Restarts one or more services from a known-good state.

| Aspect | Detail |
|--------|--------|
| When used | Service is `Down` or `Failing` with no path to self-recovery |
| Scope | Single service, service group, or entire layer |
| Data loss risk | Evaluated per service; restart is deferred if data loss would result |
| Coordination | Dependent services are paused before restart, resumed after health check passes |
| Recovery time | 2-10 seconds per service |
| Approval | Auto-approved for non-critical services; requires human approval for services #60-69 |

### 2. Degraded-Mode

Reduces service functionality to a minimal operating profile, preserving core capabilities while shedding optional features.

| Aspect | Detail |
|--------|--------|
| When used | Service is `Degraded` and declining, or system score is approaching `Critical` |
| Scope | Service-specific degradation profiles (e.g., UX drops animations, execution drops speculative branching) |
| Data loss risk | None — degraded mode preserves all data, just reduces processing |
| Coordination | Dependent services are notified of degraded capabilities, adjust their expectations |
| Recovery time | Instant (degraded mode activates immediately) |
| Approval | Auto-approved for all services |

### 3. Circuit-Breaker

Prevents cascading failures by isolating a failing service behind a circuit breaker that rejects requests until the service recovers.

| Aspect | Detail |
|--------|--------|
| When used | Service is failing intermittently, causing cascade risk to dependents |
| Scope | Single service or service group |
| Data loss risk | None — requests are rejected, not lost (callers receive explicit failure) |
| Coordination | Dependent services switch to fallback behaviors; signal bus reroutes around break |
| Recovery time | Configurable: 5s half-open test, 30s full open, exponential backoff |
| Approval | Auto-approved for all services |

### 4. Load-Shed

Reduces system load by dropping or deferring non-critical work, preserving capacity for critical operations.

| Aspect | Detail |
|--------|--------|
| When used | System is approaching resource limits, multiple services showing stress |
| Scope | Prioritized: Trace signals first, then Low, then Normal, then (only in Emergency) High |
| Data loss risk | Shed work is deferred, not discarded — it is queued for later processing |
| Coordination | UX reduces visual complexity; execution defers speculative operations; human workflow suppresses notifications |
| Recovery time | Immediate effect on load; deferred work processed when capacity returns |
| Approval | Auto-approved for Trace/Low; requires escalation for Normal; human approval for High |

### 5. Context-Reset

The most drastic non-restart action. Resets the merged context across all layers to a known-consistent state, forcing all layers to re-synchronize from a clean baseline.

| Aspect | Detail |
|--------|--------|
| When used | Context Merger reports unresolvable conflicts, or Coherence Engine reports `Incoherent` status with no recovery path |
| Scope | All four context sources are reset to their last-known-coherent checkpoint |
| Data loss risk | Context since the last checkpoint is lost; execution state is preserved |
| Coordination | All layers are paused during reset, then progressively resumed with fresh context |
| Recovery time | 3-15 seconds depending on context size |
| Approval | Always requires human approval — context reset is a significant system event |

### Recovery Action Selection Matrix

| System Status | Recommended Action | Fallback Action |
|---------------|-------------------|-----------------|
| Degraded (0.7-0.89) | Degraded-mode for stressed services | Load-shed Trace/Low signals |
| Stressed (0.5-0.69) | Load-shed + Circuit-breaker | Degraded-mode for affected layers |
| Critical (0.3-0.49) | Restart failing services + Load-shed Normal | Context-Reset (with human approval) |
| Emergency (0.0-0.29) | Emergency Load-shed + Restart | Full Context-Reset + Human escalation |

## Service Registration

| # | Service | Dependencies | Phase |
|---|---------|-------------|-------|
| 68 | IGlobalSystemHealthOrchestratorService | All 68 preceding services (health report consumers), SystemCoherenceEngine, CrossLayerSignalBus, SystemStabilization | 17 |

## Interface Contract

```typescript
interface IGlobalSystemHealthOrchestratorService {
  readonly systemHealthScore: number;              // 0.0-1.0
  readonly systemStatus: SystemHealthStatus;       // 'Healthy' | 'Degraded' | 'Stressed' | 'Critical' | 'Emergency'
  readonly dimensionHealth: ReadonlyMap<HealthDimension, number>;
  readonly activeRecoveryActions: ReadonlyArray<ICoordinatedRecoveryAction>;

  getServiceHealth(serviceId: string): IServiceHealthReport;
  getFullHealthSnapshot(): ISystemHealthSnapshot;
  triggerRecoveryAction(action: CoordinatedRecoveryActionType, target: RecoveryTarget): Promise<IRecoveryResult>;
  subscribeToHealthChanges(observer: IHealthObserver): IDisposable;
  getHealthHistory(duration: number): ReadonlyArray<ITimestampedHealthScore>;
}
```

## Files

| File | Purpose |
|------|---------|
| `common/globalSystemHealth.ts` | All interfaces, types, enums (SystemHealthStatus, CoordinatedRecoveryActionType, health dimensions) |
| `browser/globalSystemHealthService.ts` | Full runtime implementation with score aggregation, instability detection, and recovery dispatch |
| `browser/phase17HealthValidation.ts` | Validation tests for health scoring, instability detection, and recovery coordination |
