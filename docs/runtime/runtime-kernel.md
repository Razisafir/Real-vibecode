# RuntimeKernelService (#100)

The RuntimeKernelService is the foundational orchestrator of the AI Execution Kernel. It owns the central tick loop, manages the lifecycle of all runtime services, monitors service health through heartbeat signals, and coordinates the orderly startup and shutdown of the entire system. Every other runtime service depends on the kernel for its execution context and lifecycle management.

## Runtime Tick Loop Architecture

The tick loop is the heartbeat of the runtime. It operates on a configurable cadence, defaulting to 50ms per tick, and drives all periodic work across the system. Each tick proceeds through four distinct phases: poll, dispatch, execute, and settle.

During the **poll phase**, the kernel queries all registered services for pending work. Each service exposes a `poll()` method that returns a work descriptor or null. The kernel aggregates these descriptors into a unified work set for the current tick. The poll phase has a hard timeout of 5ms to prevent a single slow service from stalling the entire loop.

The **dispatch phase** routes work descriptors to their target executors. The kernel maintains a dispatch table mapping service IDs to their execution slots. Dispatch respects priority ordering: Critical work is always dispatched first, followed by High, Normal, Low, Background, and Deferred. Dispatch is non-blocking; if a target executor is saturated, the work descriptor is queued for the next tick rather than blocking.

The **execute phase** allows services to process their dispatched work. The kernel does not directly execute service logic; instead, it yields execution slots to services that have dispatched work. Each slot has a time budget of 10ms. Services that exceed their budget receive a preemption signal and must checkpoint their state for resumption on the next tick.

The **settle phase** collects completion signals, updates internal state, and emits telemetry. The kernel records tick duration, work completed, and any errors encountered. If the settle phase reveals that the tick exceeded its cadence window, the kernel emits a drift warning to the health supervisor.

The cadence is configurable through the `runtime.kernel.tickCadenceMs` setting, with a minimum allowed value of 10ms and a maximum of 1000ms. Values outside this range are clamped at startup with a warning logged. The tick loop runs on a dedicated thread to isolate it from service execution noise.

## Lifecycle Stages

The kernel manages seven lifecycle stages, each with strict transition rules that prevent invalid state combinations.

**Uninitialized**: The initial state after construction. No services are loaded, no tick loop is running, and no configuration has been applied. The only valid transition from Uninitialized is to Bootstrapping, triggered by calling `initialize()`. Any attempt to use the kernel in this state throws `RuntimeNotReadyError`.

**Bootstrapping**: The kernel loads its configuration, resolves service descriptors, and constructs the dependency graph. This stage has a configurable timeout (default: 30 seconds). If bootstrapping exceeds this timeout, the kernel transitions to Terminated with a `BootstrapTimeoutError`. Services are not yet instantiated during bootstrapping; only their descriptors are resolved.

**Initializing**: Services are instantiated and their `initialize()` methods are called in topological order based on the dependency graph. Each service has an individual initialization timeout (default: 10 seconds). If any service fails to initialize, the kernel attempts a partial initialization: failed services are marked as degraded, and services that depend on them are also marked degraded. The kernel transitions to Running only if all critical services initialize successfully. If a critical service fails, the kernel transitions to ShuttingDown.

**Running**: The normal operating state. The tick loop is active, services are processing work, and heartbeats are being monitored. From Running, the kernel can transition to Paused (via `pause()`), ShuttingDown (via `shutdown()`), or directly to Terminated if an unrecoverable error occurs in the kernel itself.

**Paused**: The tick loop is suspended, but services remain initialized and in-memory. Heartbeat monitoring continues at a reduced cadence (every 500ms instead of every tick). This state is intended for debugging and maintenance operations. From Paused, the kernel can transition back to Running (via `resume()`) or to ShuttingDown. A paused kernel that remains paused for more than the configured `maxPauseDurationMs` (default: 5 minutes) automatically transitions to ShuttingDown to prevent indefinite suspension.

**ShuttingDown**: The coordinated shutdown protocol is active (detailed below). This state is terminal-once entered, the kernel will not return to Running. The shutdown protocol has a configurable graceful timeout (default: 15 seconds). After this timeout, any services that have not completed shutdown are forcefully terminated.

**Terminated**: The final state. All services are destroyed, the tick loop is stopped, and all resources are released. The kernel cannot be restarted from this state; a new kernel instance must be created. Attempting any operation on a terminated kernel throws `RuntimeTerminatedError`.

State transitions are tracked in an immutable log. Every transition records the source state, target state, timestamp, triggering event, and an optional reason string. This log is queryable through the kernel's `getStateHistory()` method and is emitted as events on the runtime event bus for external consumers.

## Service Heartbeat Monitoring

Every service registered with the kernel must emit a heartbeat signal at regular intervals. The heartbeat protocol is designed to detect unresponsive services without generating excessive overhead.

Services register their heartbeat by calling `this.heartbeat()` from within their tick processing. The kernel tracks the last heartbeat timestamp for each service. A service is considered "late" if it has not emitted a heartbeat within `heartbeatTimeoutMs` (default: 3 times the tick cadence, so 150ms at the default 50ms cadence). A service is considered "missed" if it has not emitted a heartbeat within `heartbeatMissThresholdMs` (default: 5 times the tick cadence, so 250ms).

When a service is late, the kernel emits a `ServiceHeartbeatLate` event. When a service has missed a beat, the kernel emits a `ServiceHeartbeatMissed` event and increments the service's missed-beat counter. If a service accumulates `maxMissedBeats` (default: 3) consecutive missed beats, the kernel triggers an automatic health check through the RuntimeHealthSupervisorService.

The heartbeat monitor runs as part of the settle phase of each tick, so it operates at the same cadence as the kernel itself. This ensures that heartbeat checks are deterministic and tied to the kernel's own execution rhythm.

Services can explicitly configure their heartbeat expectations through the `heartbeatConfig` property on their service descriptor. For example, a background service that processes work infrequently may set a longer `expectedIntervalMs` to avoid false late signals. The kernel respects these per-service overrides.

## Deadlock Detection Algorithm

The kernel employs a DFS-based cycle detection algorithm on the service dependency graph to identify potential deadlocks at runtime. This is critical because services may acquire resources in overlapping orders, and circular wait conditions can emerge that are not visible at initialization time.

The algorithm operates on a directed graph where vertices represent services and edges represent "waiting-for" relationships. An edge from service A to service B exists when A is blocked waiting for a resource held by B. This graph is dynamically maintained: edges are added when a service begins waiting for a resource and removed when the wait completes.

Every N ticks (configurable, default: 100, so every 5 seconds at the default cadence), the deadlock detector runs a full scan. It performs a depth-first search from each vertex, maintaining a recursion stack. If the DFS encounters a vertex that is already in the recursion stack, a cycle has been found. The cycle is extracted from the recursion stack and reported as a potential deadlock.

When a deadlock is detected, the kernel takes the following actions:
1. Emits a `PotentialDeadlockDetected` event containing the cycle path and all services involved.
2. Logs a critical warning with the full cycle path.
3. Notifies the RuntimeRecoveryOrchestratorService, which may initiate a recovery action such as killing the lowest-priority service in the cycle or forcing a resource release.
4. If the same cycle is detected on three consecutive scans (15 seconds), the kernel automatically forces a resolution by terminating the youngest service in the cycle.

The algorithm has a time complexity of O(V + E) per scan, where V is the number of services and E is the number of waiting relationships. In practice, the graph is sparse (most services wait for at most 2-3 others), so scans complete in sub-millisecond time even with 100+ services.

## Kernel State Graph

The kernel maintains an internal state graph that tracks not just its own lifecycle state, but the aggregate state of all registered services. This graph is used to derive the overall runtime health and to make scheduling decisions.

Each service node in the graph has a state value drawn from: `Healthy`, `Degraded`, `Stressed`, `Failing`, `Dead`. The kernel computes an aggregate health score by taking the minimum state value across all critical services and the median across non-critical services. This dual-scoring ensures that a single critical service failure is not masked by healthy non-critical services.

State transitions in the graph are emitted as events. The event payload includes the service ID, the previous state, the new state, the triggering condition, and a timestamp. External systems can subscribe to these events to build dashboards, trigger alerts, or implement custom recovery logic.

The state graph is also persisted to the runtime snapshot (see RuntimePersistenceService) so that it can be restored after a crash. This ensures continuity of health tracking across restarts.

## Coordinated Shutdown Protocol

The shutdown protocol is designed to minimize data loss and ensure consistency when the runtime is stopping. It proceeds through four ordered phases.

**Phase 1 -- Drain Queues**: The kernel signals all services to stop accepting new work. Services set their `acceptingWork` flag to false and allow their input queues to drain. The kernel waits up to `drainTimeoutMs` (default: 5 seconds) for all queues to empty. Services report their queue depth through the `getQueueDepth()` method, and the kernel polls this at 100ms intervals.

**Phase 2 -- Wait for In-Flight**: After queues are drained, the kernel waits for all in-flight operations to complete. Each service tracks its in-flight operation count. The kernel polls this count at 100ms intervals and waits up to `inFlightTimeoutMs` (default: 5 seconds) for all counts to reach zero.

**Phase 3 -- Graceful Shutdown**: The kernel calls `shutdown()` on each service in reverse topological order (dependents before dependencies). Each service's `shutdown()` method is expected to release resources, flush buffers, and persist any unsaved state. The kernel waits up to `gracefulShutdownTimeoutMs` (default: 5 seconds) for each service.

**Phase 4 -- Forced Termination**: Any services that have not completed shutdown after the graceful timeout are forcefully terminated. Their resources are released by the kernel, and a `ServiceForceTerminated` event is emitted with the service ID and the reason. This is a last resort and indicates a potential bug in the service's shutdown logic.

The total shutdown budget is the sum of all phase timeouts, but the kernel tracks actual elapsed time and skips phases that complete early. A typical shutdown completes in under 2 seconds.

## Runtime Timing Guarantees

The kernel provides the following timing guarantees to services:

- **Minimum tick interval**: The kernel guarantees that no tick will be processed in less than the configured cadence. If a tick completes early, the kernel sleeps until the next cadence boundary.
- **Maximum drift**: The kernel guarantees that tick start times will not drift more than `maxDriftMs` (default: 10ms) from their ideal schedule. If drift exceeds this threshold, the kernel emits a `TickDriftWarning` and adjusts its sleep schedule to re-synchronize.
- **Tick duration budget**: The total work within a single tick (poll + dispatch + execute + settle) must complete within `tickBudgetMs` (default: 80% of cadence, so 40ms at default). If the budget is exceeded, the kernel emits a `TickBudgetExceeded` event and may preempt long-running services.
- **Heartbeat timeliness**: The heartbeat monitor runs within the settle phase and is guaranteed to execute on every tick. Services can rely on heartbeat checks occurring at least once per cadence period.

## Configuration Options

| Option | Default | Description |
|--------|---------|-------------|
| `runtime.kernel.tickCadenceMs` | 50 | Milliseconds between tick cycles |
| `runtime.kernel.maxDriftMs` | 10 | Maximum allowable tick drift |
| `runtime.kernel.bootstrapTimeoutMs` | 30000 | Timeout for bootstrapping phase |
| `runtime.kernel.serviceInitTimeoutMs` | 10000 | Per-service initialization timeout |
| `runtime.kernel.heartbeatTimeoutMultiplier` | 3 | Heartbeat late threshold as multiple of cadence |
| `runtime.kernel.heartbeatMissMultiplier` | 5 | Heartbeat missed threshold as multiple of cadence |
| `runtime.kernel.maxMissedBeats` | 3 | Consecutive missed beats before health check |
| `runtime.kernel.deadlockScanIntervalTicks` | 100 | Ticks between deadlock detection scans |
| `runtime.kernel.drainTimeoutMs` | 5000 | Queue drain timeout during shutdown |
| `runtime.kernel.inFlightTimeoutMs` | 5000 | In-flight operation wait timeout |
| `runtime.kernel.gracefulShutdownTimeoutMs` | 5000 | Per-service graceful shutdown timeout |
| `runtime.kernel.maxPauseDurationMs` | 300000 | Maximum time the kernel can remain paused |
