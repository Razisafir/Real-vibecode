# Runtime Observability -- Phase 21 Services

## Overview

This document defines the observability model for all Phase 21 runtime services. Observability encompasses the events, metrics, health indicators, and diagnostic capabilities that make the runtime's internal state visible to operators, dashboards, and automated systems. The goal is to provide sufficient insight into runtime behavior to detect problems, diagnose root causes, and validate fixes -- all without modifying the running system.

## Event Taxonomy

Every Phase 21 service emits structured events through the shared event bus. Events are classified into a taxonomy that determines their routing, storage, and alerting behavior.

**Event categories:**

| Category | Purpose | Volume | Storage | Alerting |
|----------|---------|--------|---------|----------|
| Lifecycle | Service state changes | Low | Permanent | On failure |
| Operational | Normal processing events | Medium | 7 days | On anomaly |
| Governance | Policy decisions and violations | Low | 90 days | On violation |
| Recovery | Recovery actions and outcomes | Low | 90 days | On failure |
| Evolution | Parameter adjustments | Low | 30 days | On regression |
| Health | Health check results | Medium | 7 days | On degradation |
| Performance | Throughput and latency metrics | High | 24 hours | On threshold breach |
| Diagnostic | Detailed debugging information | Variable | 1 hour | Never |

**Events by service:**

**Persistence Service (#100):**
- `persistence:stateRestored` -- State successfully restored from persistent storage
- `persistence:statePersisted` -- State checkpoint completed
- `persistence:restoreFailed` -- State restoration failed (triggers recovery)
- `persistence:corruptionDetected` -- Persisted state checksum mismatch
- `persistence:compactionCompleted` -- Log compaction finished

**Recovery Service (#101):**
- `recovery:actionStarted` -- A recovery action has been initiated
- `recovery:actionCompleted` -- A recovery action completed successfully
- `recovery:actionFailed` -- A recovery action failed
- `recovery:escalationTriggered` -- Recovery has escalated to the next severity level
- `recovery:systemRecovered` -- Full system recovery verified

**Circuit Breaker (#102):**
- `circuitBreaker:stateChanged` -- Breaker transitioned (Closed -> Open -> HalfOpen)
- `circuitBreaker:tripTriggered` -- Breaker opened due to failure threshold
- `circuitBreaker:halfOpenProbe` -- Breaker testing recovery with a probe request
- `circuitBreaker:fuseBlown` -- Breaker permanently opened (requires manual reset)

**Health Monitor (#103):**
- `health:checkCompleted` -- Individual health check completed
- `health:statusChanged` -- Aggregate health status changed (Healthy -> Degraded, etc.)
- `health:componentUnhealthy` -- A component reported unhealthy status
- `health:heartbeatMissed` -- A service missed its heartbeat

**Load Shedder (#104):**
- `loadShedder:sheddingActivated` -- Load shedding has been activated
- `loadShedder:workShed` -- A work unit has been shed
- `loadShedder:sheddingDeactivated` -- Load shedding has been deactivated
- `loadShedder:pressureLevelChanged` -- System pressure level changed

**Scheduler (#105):**
- `scheduler:workScheduled` -- A work unit has been scheduled
- `scheduler:workCompleted` -- A work unit has completed execution
- `scheduler:workTimedOut` -- A work unit exceeded its time limit
- `scheduler:starvationDetected` -- A work unit has waited beyond its max wait time
- `scheduler:quantumExpired` -- A scheduling quantum has expired

**Resource Manager (#106):**
- `resource:allocated` -- Resources allocated to an operation
- `resource:released` -- Resources released by an operation
- `resource:exhausted` -- A resource pool is exhausted
- `resource:limitAdjusted` -- A resource limit has been adjusted

**Distributed Bridge (#107):**
- `distributed:nodeRegistered` -- A new execution node has been registered
- `distributed:nodeUnavailable` -- A node has become unavailable
- `distributed:workRedistributed` -- Work has been redistributed due to node failure
- `distributed:heartbeatReceived` -- A heartbeat from a remote node
- `distributed:consistencyLagWarning` -- Consistency lag exceeded warning threshold

**Governance Service (#108):**
- `governance:operationBlocked` -- An operation was blocked by policy
- `governance:policyEvaluated` -- A policy was evaluated (allow or deny)
- `governance:escalationDenied` -- An escalation request was denied
- `governance:violationDetected` -- A governance violation was detected
- `governance:auditIntegrityViolation` -- Audit log integrity check failed

**Evolution Service (#109):**
- `evolution:recommendationGenerated` -- A parameter adjustment recommendation was created
- `evolution:adjustmentApplied` -- A parameter adjustment was applied
- `evolution:adjustmentRolledBack` -- A parameter adjustment was rolled back
- `evolution:evolutionFrozen` -- Evolution has been frozen
- `evolution:evolutionUnfrozen` -- Evolution has been unfrozen

## Telemetry Model

Telemetry provides quantitative measurements of runtime behavior. All telemetry data follows a common model that enables aggregation, comparison, and trending.

**Metric types:**

- **Counter**: Monotonically increasing value (e.g., total operations executed, total errors). Reset on service restart.
- **Gauge**: Point-in-time value that can increase or decrease (e.g., current queue depth, memory utilization).
- **Histogram**: Distribution of values over a time window (e.g., operation latency distribution, work unit size distribution).
- **Rate**: Counter normalized to a time period (e.g., operations per second, errors per minute).

**Core telemetry metrics:**

| Metric | Type | Source | Unit | Collection Interval |
|--------|------|--------|------|-------------------|
| `runtime.operations.total` | Counter | Scheduler | Count | Every tick |
| `runtime.operations.successful` | Counter | Scheduler | Count | Every tick |
| `runtime.operations.failed` | Counter | Scheduler | Count | Every tick |
| `runtime.operations.rate` | Rate | Scheduler | Ops/sec | Every second |
| `runtime.latency.p50` | Gauge | Scheduler | Milliseconds | Every second |
| `runtime.latency.p95` | Gauge | Scheduler | Milliseconds | Every second |
| `runtime.latency.p99` | Gauge | Scheduler | Milliseconds | Every second |
| `runtime.queue.depth` | Gauge | Scheduler | Count | Every tick |
| `runtime.queue.waitTime` | Histogram | Scheduler | Milliseconds | Every second |
| `runtime.memory.utilization` | Gauge | Resource Manager | Percentage | Every second |
| `runtime.memory.highWaterMark` | Gauge | Resource Manager | Bytes | Every 5 seconds |
| `runtime.cpu.utilization` | Gauge | Health Monitor | Percentage | Every second |
| `runtime.recovery.attempts` | Counter | Recovery Service | Count | On event |
| `runtime.recovery.successRate` | Rate | Recovery Service | Percentage | Every minute |
| `runtime.circuitBreaker.openCount` | Counter | Circuit Breaker | Count | On event |
| `runtime.shedding.active` | Gauge | Load Shedder | Boolean | Every second |
| `runtime.shedding.shedCount` | Counter | Load Shedder | Count | On event |
| `runtime.governance.blocks` | Counter | Governance | Count | On event |
| `runtime.governance.violations` | Counter | Governance | Count | On event |
| `runtime.evolution.adjustments` | Counter | Evolution | Count | On event |
| `runtime.evolution.rollbacks` | Counter | Evolution | Count | On event |
| `runtime.health.score` | Gauge | Health Monitor | 0-100 | Every second |

**Telemetry aggregation:**

Raw telemetry is aggregated at multiple time granularities:

- **Real-time**: Unaggregated, available for dashboards with < 1 second latency. Retained for 5 minutes.
- **1-minute summaries**: Min, max, mean, p50, p95, p99 for histograms; sum, rate for counters. Retained for 24 hours.
- **1-hour summaries**: Same statistical measures. Retained for 7 days.
- **1-day summaries**: Same statistical measures. Retained for 90 days.

## Health Observability

Health observability provides a real-time view of system health, enabling operators to quickly assess whether the system is functioning normally and to identify components that are experiencing issues.

**Health model:**

Each service reports its health as one of four states:

| State | Meaning | Dashboard Color |
|-------|---------|-----------------|
| Healthy | Operating normally, no issues detected | Green |
| Degraded | Operating with reduced functionality or minor issues | Yellow |
| Unhealthy | Significant issues, recovery may be needed | Red |
| Unknown | Health check has not completed or service is unresponsive | Gray |

**Aggregate health score:**

The health monitor computes an aggregate health score (0-100) based on the weighted average of individual service health scores. Weights reflect the criticality of each service:

| Service | Weight | Rationale |
|---------|--------|-----------|
| Governance (#108) | 20 | Critical for safe operation |
| Recovery (#101) | 15 | Critical for fault tolerance |
| Persistence (#100) | 15 | Critical for state integrity |
| Health Monitor (#103) | 10 | Essential for observability |
| Scheduler (#105) | 10 | Core execution capability |
| Circuit Breaker (#102) | 8 | Prevents cascading failures |
| Resource Manager (#106) | 7 | Resource governance |
| Load Shedder (#104) | 5 | Overload protection |
| Distributed Bridge (#107) | 5 | Future extensibility |
| Evolution (#109) | 5 | Optional optimization |

**Health score interpretation:**

- 90-100: System is fully healthy. All services operating normally.
- 70-89: System is healthy with minor concerns. Some services may be degraded.
- 50-69: System is degraded. Multiple services experiencing issues. Investigation needed.
- 30-49: System is unhealthy. Critical services may be impaired. Immediate attention required.
- 0-29: System is critical. Likely in safe mode or emergency recovery. Emergency response required.

**Health snapshot event:**

Every health check cycle emits a `health:snapshot` event containing the full health state of all services. This event is consumed by dashboards and alerting systems. The snapshot includes:

- Individual service health states and scores
- Aggregate health score
- Active degraded mode level
- Recent health state transitions
- Top 5 health concerns ranked by impact

## Performance Observability

Performance observability focuses on the system's ability to process work efficiently. It answers questions like: How fast is the system? Is it getting faster or slower? Where are the bottlenecks?

**Key performance indicators:**

1. **Throughput**: Operations completed per second. Measured at the scheduler level as the rate of `scheduler:workCompleted` events.
2. **Latency**: Time from work submission to work completion. Reported as p50, p95, and p99 percentiles. The p99 latency is the primary SLO indicator.
3. **Queue depth**: Number of pending work units. High queue depth indicates that the system cannot keep up with incoming work.
4. **Wait time**: Time from work submission to work start (time spent in queue). High wait time indicates scheduling bottlenecks.
5. **Resource utilization**: CPU and memory utilization. Sustained high utilization (> 80%) indicates capacity pressure.

**Performance dashboards:**

The recommended dashboard layout for performance observability:

- **Top panel**: Throughput rate (line chart, 5-minute rolling window) with SLO target line
- **Middle panel**: Latency percentiles (p50, p95, p99 line charts, 5-minute rolling window)
- **Bottom left**: Queue depth by priority level (stacked area chart)
- **Bottom right**: Resource utilization gauges (CPU, memory)

**Performance anomaly detection:**

The observability system applies simple statistical anomaly detection to performance metrics:

- **Spike detection**: A value exceeding 3 standard deviations from the 5-minute rolling mean triggers a `performance:spikeDetected` event.
- **Trend detection**: A sustained directional change over 10+ data points triggers a `performance:trendDetected` event (with direction: improving or degrading).
- **SLO breach**: If p99 latency exceeds the SLO target for 3 consecutive minutes, a `performance:sloBreached` event is emitted.

## Recovery Observability

Recovery observability tracks the system's ability to detect and recover from failures. It answers: How often do failures occur? How quickly are they resolved? Are recovery actions effective?

**Recovery metrics:**

| Metric | Type | Description |
|--------|------|-------------|
| `recovery.attempts.total` | Counter | Total recovery actions attempted |
| `recovery.attempts.successful` | Counter | Recovery actions that resolved the failure |
| `recovery.attempts.failed` | Counter | Recovery actions that did not resolve the failure |
| `recovery.time.toDetect` | Histogram | Time from failure occurrence to detection |
| `recovery.time.toResolve` | Histogram | Time from detection to successful resolution |
| `recovery.escalation.count` | Counter | Number of times recovery escalated to next level |
| `recovery.active.count` | Gauge | Number of recovery actions currently in progress |

**Recovery observability dashboard:**

- **Recovery success rate**: Percentage of recovery attempts that succeed (target: > 95%)
- **Mean time to detect (MTTD)**: Average time to detect a failure (target: < 2 seconds)
- **Mean time to resolve (MTTR)**: Average time to resolve a failure (target: < 10 seconds)
- **Recovery action distribution**: Bar chart showing the frequency of each recovery action type (retry, reset, restart, etc.)
- **Active recoveries**: List of currently in-progress recovery actions with their target, action, and elapsed time

**Recovery event flow:**

A typical recovery sequence generates the following event flow, which can be traced in the event log:

```
health:componentUnhealthy
  -> recovery:actionStarted (action: retry)
  -> recovery:actionFailed
  -> recovery:escalationTriggered
  -> recovery:actionStarted (action: reset)
  -> recovery:actionCompleted
  -> health:checkCompleted (status: Healthy)
  -> recovery:systemRecovered
```

## Governance Observability

Governance observability provides visibility into the policy enforcement decisions made by the governance service. This is critical for security auditing and for understanding why operations were blocked or restricted.

**Governance metrics:**

| Metric | Type | Description |
|--------|------|-------------|
| `governance.evaluations.total` | Counter | Total policy evaluations performed |
| `governance.evaluations.allowed` | Counter | Evaluations resulting in Allow |
| `governance.evaluations.blocked` | Counter | Evaluations resulting in Block |
| `governance.evaluations.throttled` | Counter | Evaluations resulting in Throttle |
| `governance.escalations.requested` | Counter | Escalation requests received |
| `governance.escalations.approved` | Counter | Escalation requests approved |
| `governance.escalations.denied` | Counter | Escalation requests denied |
| `governance.violations.total` | Counter | Governance violations detected |
| `governance.violations.bySeverity` | Counter (by severity) | Violations broken down by severity level |

**Governance observability dashboard:**

- **Block rate**: Percentage of operations blocked by governance (target: < 1% under normal operation; higher rates may indicate misconfigured policies)
- **Escalation approval rate**: Percentage of escalation requests approved (monitoring this helps identify overly restrictive or permissive escalation policies)
- **Violation trend**: Time series of violation counts, segmented by severity (increasing trend indicates a systemic issue)
- **Top blocked operations**: Table showing the most frequently blocked operation types (helps identify operations that may need policy adjustment)
- **Policy evaluation latency**: Time to evaluate governance policies per operation (should be < 1ms for the default policy set)

## Evolution Observability

Evolution observability tracks the autonomous parameter optimization process. It answers: What adjustments has the system made? Are they helping? Have any been rolled back?

**Evolution metrics:**

| Metric | Type | Description |
|--------|------|-------------|
| `evolution.recommendations.generated` | Counter | Total recommendations generated |
| `evolution.recommendations.applied` | Counter | Recommendations applied |
| `evolution.recommendations.rejected` | Counter | Recommendations rejected (low confidence or manual rejection) |
| `evolution.adjustments.applied` | Counter | Parameter adjustments applied |
| `evolution.adjustments.rolledBack` | Counter | Parameter adjustments rolled back due to regression |
| `evolution.parameters.tuned` | Gauge | Number of parameters currently being actively tuned |
| `evolution.parameters.frozen` | Gauge | Number of parameters currently frozen |
| `evolution.freeze.active` | Gauge | Whether evolution is currently frozen (0 or 1) |

**Evolution observability dashboard:**

- **Adjustment timeline**: Time series showing parameter adjustments (x-axis: time, y-axis: parameter value, with color coding for applied vs. rolled back)
- **Rollback rate**: Percentage of adjustments that were rolled back (target: < 10%; higher rates indicate unstable tuning)
- **Confidence distribution**: Histogram of recommendation confidence scores (should cluster at high confidence)
- **Current parameter values**: Table showing all tunable parameters with their current, default, minimum, and maximum values
- **Workload classification**: Current workload pattern (Steady, Bursty, Rising, Falling, Chaotic) with classification confidence

## Observability Best Practices

**1. Always include correlation IDs:**

Every event and metric must include a correlation ID that links it to the originating operation or request. This enables tracing a single operation's journey through multiple services.

**2. Prefer structured events over log lines:**

Structured events (with typed fields) are machine-parseable and can be indexed, filtered, and aggregated. Raw log lines are useful for debugging but should not be the primary observability mechanism.

**3. Emit events at service boundaries:**

Events should be emitted when a request crosses a service boundary (entering or leaving a service). This creates a natural trace boundary without requiring instrumentation of every internal function.

**4. Separate fast-path and slow-path observability:**

High-frequency metrics (per-tick counters, latency measurements) should use a fast-path that minimizes overhead (e.g., atomic counters, lock-free ring buffers). Low-frequency events (governance decisions, recovery actions) can use a slower but more detailed path.

**5. Make observability configurable at runtime:**

The verbosity and detail level of observability should be adjustable without restarting the system. This enables "turning up the dial" during incidents without incurring the overhead during normal operation.

**6. Never block the operational path for observability:**

If the observability system (event bus, metric collector) is slow or unresponsive, it must NOT block the operational path. Observability data should be dropped rather than causing operational delays. This is implemented via bounded buffers with overflow dropping.

## Debugging with Runtime Events

The event taxonomy enables a structured debugging workflow:

**Step 1: Identify the symptom**

Look at the aggregate health score and dashboard. Identify which service is reporting issues (Degraded or Unhealthy state).

**Step 2: Find the triggering event**

Query the event log for events from the affected service in the time window before the health state change. Look for `*:stateChanged` or `*:failed` events.

**Step 3: Trace the event chain**

Use correlation IDs to trace the event chain from the triggering event back to the root cause. Each event includes the correlation ID of the request that caused it, enabling backward tracing.

**Step 4: Examine related events**

Look for related events from other services that occurred near the same time. Cross-service failures often manifest as events in multiple services within a short time window.

**Step 5: Validate the hypothesis**

After identifying a root cause, check the metrics for the affected resource or component. Do the metrics support the hypothesis? For example, if you suspect memory pressure caused a failure, check `runtime.memory.utilization` and `runtime.memory.highWaterMark` for the relevant time window.

**Event query interface:**

The observability system provides a query interface with the following capabilities:

- Filter by event category, source service, and event type
- Filter by time range (with millisecond precision)
- Filter by correlation ID (to trace a specific request)
- Aggregate event counts by any combination of filters
- Export filtered event sets for offline analysis

## Observability Overhead and Sampling

Observability is not free -- collecting, processing, and storing telemetry data consumes CPU, memory, and I/O resources. The system manages this overhead through adaptive sampling and priority-based collection.

**Baseline overhead:**

With all observability features at their default settings, the observability system adds approximately 2-3% CPU overhead and 50MB of memory overhead. This is measured as the difference in resource consumption with observability enabled vs. disabled.

**Overhead by component:**

| Component | CPU Overhead | Memory Overhead | Mitigation |
|-----------|-------------|-----------------|------------|
| Event emission | 0.5% | 10MB | Bounded buffers, async dispatch |
| Metric collection | 1.0% | 20MB | Atomic counters, no locks |
| Health monitoring | 0.3% | 5MB | Sampled health checks |
| Audit logging | 0.5% | 15MB | Batched writes, compression |

**Adaptive sampling:**

When the system enters a degraded mode, the observability system reduces its overhead by adjusting sampling rates:

| Degradation Level | Event Sampling | Metric Sampling | Health Check Interval |
|-------------------|---------------|-----------------|----------------------|
| Normal | 100% | 100% | 1 second |
| Light | 100% | 50% | 2 seconds |
| Moderate | 50% | 25% | 5 seconds |
| Heavy | 20% | 10% | 10 seconds |
| Minimal | 10% (lifecycle only) | 5% (health only) | 30 seconds |

The sampling reduction ensures that observability does not contribute to the resource pressure that triggered the degraded mode. When the system recovers from degraded mode, sampling rates are gradually restored to 100% over a 60-second ramp-up period.

**Explicit sampling configuration:**

Operators can override the adaptive sampling with explicit configuration:

- `observability.eventSamplingRate`: 0.0 to 1.0 (fraction of events to collect)
- `observability.metricSamplingRate`: 0.0 to 1.0 (fraction of metric data points to collect)
- `observability.auditMode`: "full" (all audit entries), "summary" (counts only), "minimal" (violations only)

Setting sampling rates below 10% is discouraged because it reduces the statistical validity of metrics and may cause important events to be missed. The system emits a `observability:lowSamplingWarning` event when any rate is set below 10%.
