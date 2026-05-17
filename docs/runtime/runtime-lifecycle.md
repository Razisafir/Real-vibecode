# Runtime Lifecycle -- Phase 21 Services

## Overview

This document describes the complete lifecycle of the AI Execution Kernel runtime, spanning all Phase 21 services (#100-109). The runtime lifecycle governs how the system starts, operates, recovers from failures, and shuts down. Every service participates in the lifecycle, and cross-service dependencies determine the order and timing of lifecycle transitions.

## Boot Sequence

The boot sequence defines the order in which services are initialized when the AI Execution Kernel starts. The sequence is designed to satisfy dependency constraints: a service is only initialized after all services it depends on have successfully initialized.

**Boot order (strict):**

| Stage | Services | Reason |
|-------|----------|--------|
| 0 | Configuration Store | All services need configuration before they can initialize |
| 1 | Event Bus | All services need the event bus for inter-service communication |
| 2 | Governance Service (#108) | Must be active before any execution is permitted |
| 3 | Persistence Service (#100) | Must be active before state can be restored |
| 4 | State Restoration (#100) | Restores persisted state before services begin operating |
| 5 | Recovery Service (#101) | Must be active before other services can register recovery handlers |
| 6 | Circuit Breaker (#102) | Must be active before services begin making internal calls |
| 7 | Health Monitor (#103) | Must be active before services report health |
| 8 | Load Shedder (#104) | Must be active before the system accepts load |
| 9 | Scheduler (#105) | Must be active before work can be scheduled |
| 10 | Resource Manager (#106) | Must be active before the scheduler allocates resources |
| 11 | Distributed Bridge (#107) | Must be active before the scheduler routes work |
| 12 | Evolution Service (#109) | Must be active last, as it observes all other services |

**Boot failure handling:**

If any service fails to initialize, the boot sequence halts at that stage. Services that initialized successfully are kept running. The system enters a "partial boot" state where the operational services function normally but services depending on the failed service are unavailable. The health monitor (#103) reports the partial boot state and identifies the failed service.

If the governance service (#108) or the recovery service (#101) fails to initialize, the system does NOT enter partial boot. Instead, it enters safe mode, where no execution is permitted and only diagnostic operations are available. These two services are considered critical for safe operation and the system will not operate without them.

## Runtime Initialization Stages

Within each service, initialization proceeds through a series of stages. The lifecycle manager tracks each service's stage and reports aggregate initialization progress.

**Initialization stages per service:**

1. **Constructed**: The service instance has been created and injected with its dependencies, but no initialization logic has run.
2. **Configured**: The service has read its configuration from the configuration store and validated all required parameters. Configuration errors are detected at this stage.
3. **Initialized**: The service has completed its internal initialization (allocating buffers, building indices, establishing connections). The service is not yet accepting operational requests.
4. **Ready**: The service has completed its readiness checks and is accepting operational requests. This is the normal operating state.
5. **Failed**: The service encountered an unrecoverable error during initialization. It will not transition to Ready without external intervention.

**Stage transition rules:**

- Forward transitions (Constructed -> Configured -> Initialized -> Ready) are always valid.
- A service can transition from any stage to Failed if an error occurs.
- Backward transitions (e.g., Ready -> Initialized) are NOT valid. A service that has been Ready and encounters an error transitions to Degraded, not back to Initialized.
- The transition from Failed to Ready requires going through the full initialization sequence again (service restart).

## Normal Operation Loop

During normal operation, the runtime cycles through a fixed tick loop that drives scheduling, monitoring, and adaptation.

**Tick cycle (default: 100ms interval):**

```
Tick Start
  |
  +-- Health Check (every 10th tick, ~1s)
  |     +-- Check all service health indicators
  |     +-- Update aggregate health score
  |     +-- Emit health snapshot event
  |
  +-- Scheduler Tick (every tick)
  |     +-- Dequeue pending work from priority queues
  |     +-- Allocate resources via Resource Manager
  |     +-- Dispatch work to execution targets
  |     +-- Collect completed work results
  |
  +-- Monitoring Tick (every 5th tick, ~500ms)
  |     +-- Update performance counters
  |     +-- Check circuit breaker states
  |     +-- Evaluate load shedding thresholds
  |     +-- Update throughput and latency histograms
  |
  +-- Recovery Check (every 20th tick, ~2s)
  |     +-- Scan for failed operations
  |     +-- Evaluate recovery eligibility
  |     +-- Initiate recovery for eligible operations
  |
  +-- Evolution Tick (every 600th tick, ~60s)
  |     +-- Collect metric snapshot
  |     +-- Generate optimization recommendations
  |     +-- Apply approved recommendations
  |     +-- Validate recent adjustments
  |
  +-- Governance Audit Flush (every 100th tick, ~10s)
  |     +-- Flush in-memory audit entries to persistent storage
  |     +-- Verify audit log integrity hash chain
  |
Tick End
```

**Scheduling model:**

The scheduler operates a priority-based round-robin model within each tick. Work units are dequeued from the highest-priority non-empty queue first. Within a priority level, work units are processed in FIFO order. The scheduler allocates a time quantum per priority level to prevent lower-priority queues from being completely starved (see starvation prevention below).

**Starvation prevention:**

Every 50 ticks (approximately 5 seconds), the scheduler checks the age of the oldest work unit in each priority queue. If any work unit has waited longer than its maximum wait time (varies by priority level), the scheduler temporarily promotes that work unit to a higher priority for immediate execution. This guarantees that even the lowest-priority work will eventually execute.

Maximum wait times by priority:

| Priority | Max Wait Time |
|----------|---------------|
| Critical | 0 (immediate) |
| High | 5 seconds |
| Medium | 30 seconds |
| Low | 120 seconds |
| Background | 600 seconds |

## Pause/Resume Protocol

The runtime supports a pause/resume mechanism that temporarily suspends all operational processing without shutting down services.

**Pause:**

When a pause command is issued:

1. The scheduler stops dequeuing new work units. In-flight work units continue to completion.
2. The evolution service freezes all parameter adjustments.
3. The health monitor continues operating (paused state requires monitoring).
4. The governance service continues operating (governance rules must still be enforced).
5. All other tick-driven activities (monitoring, recovery checks, audit flushes) are suspended.
6. The system transitions to the "Paused" lifecycle state.

**Resume:**

When a resume command is issued:

1. The scheduler resumes dequeuing work units from priority queues.
2. The evolution service unfreezes parameter adjustments (using gradual restart mode).
3. All tick-driven activities resume at their normal intervals.
4. The system transitions back to the "Running" lifecycle state.

**Pause use cases:**

- Debugging: Pause the system to inspect internal state without ongoing mutations.
- Maintenance: Pause to apply configuration changes that require a quiescent state.
- Emergency: Pause to stop the system from making a bad situation worse while investigating an incident.

## Degraded Operation Modes

The runtime can operate in several degraded modes when full operation is not possible. Degraded modes reduce functionality to maintain stability.

**Degraded mode levels:**

| Level | Name | Functionality | Trigger |
|-------|------|---------------|---------|
| 0 | Full | All services operational | Default |
| 1 | Light | Evolution disabled, reduced monitoring | Memory > 75% OR CPU > 70% |
| 2 | Moderate | Evolution disabled, reduced scheduling, aggressive shedding | Memory > 85% OR CPU > 80% OR error rate > 1% |
| 3 | Heavy | Critical work only, all tuning frozen, minimal monitoring | Memory > 92% OR CPU > 90% OR error rate > 5% |
| 4 | Minimal | System health checks only, no user work accepted | Any 2+ services in Failed state |

**Degradation transitions:**

The system automatically transitions between degraded modes based on real-time resource and health metrics. Transitions are evaluated every monitoring tick (~500ms). Escalation (moving to a higher degradation level) is immediate. Recovery (moving to a lower degradation level) is gradual -- the system must sustain improved metrics for at least 30 seconds before recovering.

**Degraded mode behaviors by service:**

- **Scheduler**: In Moderate mode, reduces concurrent operation limit by 50%. In Heavy mode, only Critical and High priority work is scheduled. In Minimal mode, no work is scheduled.
- **Evolution Service**: Disabled in all degraded modes above Level 0.
- **Distributed Bridge**: In Heavy mode, stops accepting work from the bridge and routes all work locally.
- **Load Shedder**: In Moderate mode, activates aggressive shedding. In Heavy mode, sheds all non-critical work immediately.
- **Circuit Breaker**: Thresholds are automatically tightened in degraded modes to prevent cascading failures.

## Recovery Lifecycle

The recovery lifecycle describes how the system detects, plans, executes, and verifies recovery from failures.

**Recovery stages:**

1. **Detection**: A failure is detected by the health monitor, circuit breaker, or an explicit error signal from a service. Detection includes classifying the failure type (transient, persistent, cascading) and severity.

2. **Planning**: The recovery service determines the appropriate recovery strategy based on the failure classification. Strategies range from simple retry (for transient failures) to full service restart (for persistent failures). The planner considers the current system state, available resources, and the impact of the recovery action on other services.

3. **Execution**: The chosen recovery strategy is executed. Recovery actions include:
   - Retry the failed operation (with exponential backoff)
   - Reset the failed service (reinitialize without restart)
   - Restart the failed service (full reinitialization)
   - Failover to a backup service instance
   - Escalate to a higher-level recovery mode (e.g., kernel restart)

4. **Verification**: After executing the recovery action, the system verifies that the failure has been resolved. Verification includes:
   - Health check of the recovered service (must pass 3 consecutive checks)
   - Functional test of the recovered capability (a test operation is submitted)
   - Cross-service dependency check (verify that dependent services are not affected)
   - Metric validation (verify that relevant metrics have returned to normal ranges)

**Recovery hierarchy:**

The recovery service maintains a hierarchy of recovery actions, ordered by increasing severity and cost:

```
Retry -> Reset -> Restart -> Failover -> Kernel Restart -> Safe Mode -> Emergency Recovery
```

The system starts at the lowest level and escalates only if the current level fails to resolve the issue. Each escalation level has a maximum attempt count (default: 3 retries before escalating). This prevents the system from indefinitely retrying an ineffective recovery action.

## Shutdown Protocol

The shutdown protocol defines how the runtime stops in a controlled manner. There are three shutdown modes, ordered by increasing urgency.

**Coordinated shutdown:**

Triggered by a graceful shutdown signal. The system:

1. Stops accepting new work submissions.
2. Waits for all in-flight work to complete (up to a configurable timeout, default: 30 seconds).
3. Emits a `shutdownStarted` event to all services.
4. Each service performs its cleanup (flushing buffers, persisting state, closing connections).
5. Each service reports "shutdown complete" to the lifecycle manager.
6. The lifecycle manager confirms all services are shut down and terminates the process.

**Graceful shutdown:**

Triggered by a timeout on coordinated shutdown or a SIGTERM signal. The system:

1. Stops accepting new work immediately.
2. Cancels all in-flight work with a "shutdown in progress" reason.
3. Persists critical state (current parameter values, recovery state, audit log tail).
4. Emits a `shutdownComplete` event.
5. Terminates the process after a maximum of 10 seconds.

**Forced shutdown:**

Triggered by a SIGKILL signal or critical system error. The system:

1. Does NOT attempt any cleanup or state persistence.
2. Relies on the persistence service's periodic checkpoints for state recovery on next boot.
3. The next boot will detect the unclean shutdown and trigger recovery verification.

**Shutdown order:**

Services are shut down in the reverse of their boot order. The evolution service shuts down first (it only observes), followed by the distributed bridge, resource manager, and so on down to the event bus and configuration store. The governance service and persistence service are the last to shut down, ensuring that audit entries and state are captured for as long as possible.

## State Transitions Between Lifecycle Stages

The runtime lifecycle is modeled as a finite state machine with the following states and transitions:

**States:**

- `Bootstrapping`: Initial boot sequence in progress
- `Initializing`: Service initialization in progress
- `Running`: Normal operation
- `Paused`: Operation suspended, services remain active
- `Degraded`: Operating with reduced functionality
- `Recovering`: Recovery action in progress
- `ShuttingDown`: Shutdown in progress
- `Stopped`: System has stopped

**Valid transitions:**

```
Bootstrapping -> Initializing -> Running
Running -> Paused
Running -> Degraded
Running -> Recovering
Running -> ShuttingDown
Paused -> Running
Degraded -> Running
Degraded -> Recovering
Recovering -> Running
Recovering -> Degraded
Recovering -> ShuttingDown
ShuttingDown -> Stopped
Degraded -> ShuttingDown
```

**Invalid transitions:**

- `Stopped` cannot transition to any state (requires a full process restart).
- `Bootstrapping` cannot transition to `Running` directly (must go through `Initializing`).
- `Paused` cannot transition to `Degraded` directly (must resume to `Running` first).
- `ShuttingDown` cannot transition back to `Running`.

## Cross-Service Lifecycle Dependencies

Services have lifecycle dependencies that constrain the order of state transitions. The dependency graph ensures that a service does not attempt to use a dependency that is not yet ready.

**Dependency map:**

```
Governance (#108) <- [Scheduler (#105), Resource Manager (#106), Recovery (#101)]
Persistence (#100) <- [Recovery (#101), Governance (#108), Evolution (#109)]
Recovery (#101) <- [Circuit Breaker (#102), Health Monitor (#103), Scheduler (#105)]
Health Monitor (#103) <- [Load Shedder (#104), Evolution (#109)]
Scheduler (#105) <- [Distributed Bridge (#107), Evolution (#109)]
Circuit Breaker (#102) <- [Load Shedder (#104)]
Resource Manager (#106) <- [Distributed Bridge (#107)]
```

**Dependency enforcement:**

When a service transitions to a non-Ready state (Degraded, Failed, ShuttingDown), all services that depend on it are notified via a `dependencyStateChanged` event. Dependent services evaluate the impact and may choose to degrade their own operation or enter recovery mode. This cascading notification prevents services from making calls to unavailable dependencies.

**Circular dependency prevention:**

The lifecycle manager validates the dependency graph at boot time and rejects any circular dependencies. If a circular dependency is detected, the system logs an error and enters safe mode. This is a development-time error that should never occur in production.

## Runtime Lifecycle Diagram

The following textual diagram illustrates the complete runtime lifecycle:

```
                              +----------------+
                              |  Bootstrapping |
                              +-------+--------+
                                      |
                              +-------v--------+
                              |  Initializing  |
                              +-------+--------+
                                      |
                        +-------------v-------------+
                        |                           |
                 +------v------+           +--------v--------+
                 |   Running   |<----------+    Recovering    |
                 +------+------+           +--------+---------+
                  |  |   |                          |
      +-----------+  |   +----------+               |
      |              |              |               |
+-----v-----+ +-----v----+ +------v------+         |
|   Paused  | | Degraded | | ShuttingDown|<--------+
+-----------+ +-----+----+ +------+------+
                     |              |
              +------v------+ +----v-----+
              |   Running   | |  Stopped  |
              +-------------+ +----------+

Transitions during operation:
  Running <--pause--> Paused
  Running <---degrade---> Degraded (bidirectional based on metrics)
  Running/Degraded --failure--> Recovering
  Recovering --success--> Running
  Recovering --failure--> Degraded
  Any state --shutdown signal--> ShuttingDown
  ShuttingDown --complete--> Stopped
```

The diagram shows that the system has a primary operating loop (Running <-> Degraded) with escape hatches to Paused (for manual intervention) and Recovering (for automated failure handling). The ShuttingDown state is a sink that eventually leads to Stopped, from which the only recovery is a full process restart.
