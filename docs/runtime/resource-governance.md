# ResourceGovernanceService (#106)

The ResourceGovernanceService controls how computational resources are allocated, tracked, and enforced across the AI Execution Kernel. It ensures that no single service or agent can consume disproportionate resources, that the system operates within its hardware limits, and that resource contention is resolved fairly. The service implements budget-based resource management with explicit quotas, burst protection, and starvation prevention guarantees.

## Resource Budget Types

The governance service manages seven resource budget types, each representing a different dimension of computational cost:

**CPU**: Measured in CPU-milliseconds per second (CPUms/s). This represents the amount of CPU time a service consumes. A service allocated 500 CPUms/s on a single core can use up to 50% of one core's capacity. CPU budgets are enforced through cooperative yielding: services are expected to check their CPU usage at regular intervals and yield if they are approaching their budget. The governance service monitors actual CPU consumption through the kernel's tick instrumentation and emits `CPUBudgetExceeded` events when a service exceeds its allocation.

**Memory**: Measured in megabytes (MB). This represents the maximum heap allocation a service is permitted. Memory budgets are enforced through allocation tracking: the governance service hooks into the service's memory allocator and rejects allocations that would push the service over its budget. When a service reaches 90% of its memory budget, the governance service emits a `MemoryBudgetWarning` and suggests garbage collection. When a service reaches 100%, the governance service emits a `MemoryBudgetExceeded` event and may forcibly trigger garbage collection or, if the service remains over budget for more than `memoryGracePeriodMs` (default: 5000ms), initiate a service restart.

**QueueDepth**: Measured in number of items. This represents the maximum number of pending items a service's input queue can hold. Queue depth budgets are enforced by the ExecutionSchedulerService, which rejects new items when a service's queue is full. When a queue reaches 80% of its depth budget, the governance service emits a `QueueDepthWarning` and activates backpressure propagation (see Queue Pressure Tracking below).

**ExecutionTime**: Measured in milliseconds per operation. This represents the maximum wall-clock time a single operation may take. Execution time budgets are enforced through the execution window mechanism in the ExecutionSchedulerService. Operations that exceed their execution time budget are preempted and re-enqueued.

**ConcurrentOps**: Measured in number of simultaneous operations. This represents the maximum number of operations a service can have in-flight at any moment. Concurrent operation budgets are enforced by the ExecutionSchedulerService, which will not dispatch more operations to a service than its concurrent ops limit allows.

**Throughput**: Measured in operations per second (ops/s). This represents the rate at which a service is permitted to process operations. Throughput budgets are enforced through rate limiting: the governance service maintains a token bucket for each service, replenished at the service's throughput rate. Each operation consumes one token; when the bucket is empty, operations are queued until tokens become available.

**Latency**: Measured in milliseconds (target P99). This is not a hard budget but a target that the governance service uses to adjust other budgets. If a service's P99 latency exceeds its target, the governance service may reduce the service's ConcurrentOps or Throughput budgets to prevent queuing-induced latency. Latency targets are monitored through the health supervisor's latency metrics.

## CPU Budget Simulation

Since the AI Execution Kernel runs as a single process (the VS Code extension host), true CPU isolation is not available at the OS level. The governance service implements CPU budget simulation through cooperative instrumentation.

Each service is expected to call `governance.trackCpuStart()` before beginning a CPU-intensive operation and `governance.trackCpuEnd()` after completion. The governance service accumulates the tracked CPU time and compares it against the service's CPU budget. If the tracked CPU time exceeds the budget within a `cpuAccountingWindowMs` (default: 1000ms), the service is marked as `CPUOverBudget` and the governance service emits a `CPUBudgetExceeded` event.

For services that do not explicitly track CPU usage (legacy services, third-party plugins), the governance service estimates CPU consumption using a sampling approach. Every `cpuSamplingIntervalMs` (default: 100ms), the governance service checks which service is currently executing (based on the kernel's tick processing state) and attributes 100ms of CPU time to that service. This sampling approach is less accurate than explicit tracking but provides a reasonable approximation.

When a service exceeds its CPU budget, the governance service applies throttling by reducing the service's execution slot frequency. Instead of receiving execution time on every tick, the over-budget service receives execution time on every Nth tick, where N is computed as `ceil(actualCpuUsage / budgetedCpuUsage)`. This reduces the service's effective CPU allocation to its budgeted level without requiring the service's cooperation.

## Memory Pressure Balancing

Memory is a shared and finite resource. The governance service balances memory pressure across services to ensure that no single service's memory growth causes other services to fail.

The memory pressure model operates in three zones:

**Green Zone** (total system memory usage below 60%): All services receive their full memory budgets. No restrictions apply.

**Yellow Zone** (total system memory usage between 60% and 80%): The governance service activates memory pressure mitigation:
- Services with the highest memory-to-budget ratios are asked to reduce their memory footprint through `reduceMemory()` calls.
- Non-critical services have their memory budgets reduced by up to 20%.
- The governance service emits a `MemoryPressureYellow` event.

**Red Zone** (total system memory usage above 80%): The governance service activates aggressive memory management:
- All services have their memory budgets reduced by up to 40%.
- Services that cannot operate within their reduced budgets are paused.
- Background and deferred work is shed to reduce memory allocation pressure.
- The governance service emits a `MemoryPressureRed` event and notifies the RuntimeRecoveryOrchestratorService.

Zone transitions use hysteresis to prevent oscillation. The transition from Green to Yellow requires the Yellow threshold to be sustained for `memoryPressureEntryMs` (default: 5000ms). The transition from Yellow to Green requires the system to be below 50% memory usage for `memoryPressureExitMs` (default: 10000ms). This ensures that brief spikes do not trigger pressure responses while sustained pressure is addressed promptly.

The governance service also implements cross-service memory rebalancing. When one service releases memory (through garbage collection, cache eviction, or state reset), the governance service can reallocate the freed memory to services that are under pressure. This rebalancing is done proportionally: services that are closest to their memory limits receive the largest share of freed memory.

## Queue Pressure Tracking

Queue pressure occurs when a service's input queue fills faster than it can process items. The governance service tracks queue pressure and activates backpressure propagation to prevent queue overflow from cascading through the system.

Backpressure propagation works as follows: when a service's queue depth exceeds `backpressureThreshold` (default: 80% of its QueueDepth budget), the governance service signals the service's upstream producers to slow down. Upstream producers are identified through the agent coordination graph: any agent or service that sends work to the pressured service is considered an upstream producer.

The backpressure signal includes a `slowdownFactor` between 0.0 (stop sending entirely) and 1.0 (send at normal rate). The slowdown factor is computed as: `1.0 - ((currentQueueDepth - backpressureThreshold) / (maxQueueDepth - backpressureThreshold))`. This linearly reduces the sending rate from 100% at the threshold to 0% at full queue depth.

Upstream producers are expected to respect the backpressure signal by reducing their output rate. If an upstream producer does not respect the signal (its output rate does not decrease within `backpressureComplianceMs` default: 5000ms), the governance service forcibly drops items from that producer at the pressured service's queue entry point.

## Execution Throttling Mechanism

Execution throttling is the primary mechanism for enforcing resource budgets at the operation level. The governance service applies throttling when a service exceeds its CPU, Throughput, or ConcurrentOps budget.

Throttling is implemented through a token bucket algorithm. Each service has a token bucket for each budgeted resource. Tokens are replenished at the budget rate and consumed when the service executes an operation. When the bucket is empty, the service's operations are queued until tokens become available.

The throttling mechanism has three levels of intensity:

**Soft throttling**: When a service exceeds 90% of its budget, soft throttling begins. New operations are accepted but are assigned a lower scheduling priority (priority is reduced by one level). This provides a gentle signal that the service is approaching its limit.

**Firm throttling**: When a service exceeds 100% of its budget, firm throttling begins. New operations are queued in a throttled queue that is only serviced when the token bucket has tokens available. Operations in the throttled queue are processed in FIFO order.

**Hard throttling**: When a service exceeds 150% of its budget, hard throttling begins. All new operations are rejected with a `ResourceBudgetExceededError`. The service must reduce its resource consumption before new operations will be accepted. Hard throttling is automatically released when the service's resource usage drops below 120% of its budget.

Throttling is released gradually, not abruptly. When a service's resource usage drops below its budget, the throttling level is reduced one step at a time: Hard to Firm, Firm to Soft, Soft to None. Each step requires the service to remain below budget for `throttleReleaseDelayMs` (default: 10000ms) before progressing. This prevents oscillation between throttled and unthrottled states.

## Runtime Quotas

Each service is assigned a resource quota that specifies its budget for each resource type. Quotas are defined in the service's registration descriptor and can be adjusted at runtime by the governance service.

Default quotas are assigned based on the service's classification:

| Service Classification | CPU (CPUms/s) | Memory (MB) | QueueDepth | ConcurrentOps | Throughput (ops/s) |
|----------------------|---------------|-------------|------------|---------------|-------------------|
| Critical | 800 | 512 | 200 | 32 | 1000 |
| Standard | 400 | 256 | 100 | 16 | 500 |
| Background | 100 | 64 | 50 | 4 | 100 |
| Agent | 200 | 128 | 80 | 8 | 200 |

The ExecutionTime and Latency budgets are service-specific and must be declared in the service descriptor. If a service does not declare these budgets, defaults of 2000ms execution time and 500ms P99 latency are applied.

Quotas can be overridden through the `runtime.governance.quotaOverrides` configuration map. This allows operators to adjust quotas without modifying service code. Overrides are applied at initialization and can be updated at runtime through the governance service's `updateQuota(serviceId, resourceType, newBudget)` method.

The total of all service quotas for a given resource type must not exceed the system's total available capacity. The governance service validates this constraint at initialization and rejects any quota configuration that would over-commit resources. If runtime quota adjustments would cause over-commitment, the governance service proportionally reduces all quotas to fit within capacity.

## Resource Fairness Algorithm

The fairness algorithm ensures that resources are distributed equitably among services, preventing any single service from monopolizing a shared resource even when its quota would permit it.

The algorithm is based on weighted max-min fairness. Each service has a weight (default: 1.0, adjustable through `runtime.governance.serviceWeights`) that determines its fair share of each resource. The fair share for service i is computed as: `fairShare[i] = (weight[i] / totalWeight) * totalResourceCapacity`.

The algorithm works in rounds:

1. Sort services by their current resource usage as a fraction of their fair share (ascending: services using the smallest fraction are served first).
2. Allocate each service its fair share or its remaining demand, whichever is smaller.
3. Redistribute any leftover capacity (from services whose demand is below their fair share) to the remaining services, again in ascending order of utilization fraction.
4. Repeat until all demand is satisfied or all capacity is allocated.

This algorithm guarantees that no service receives less than its fair share unless the total demand exceeds total capacity, and that leftover capacity is distributed to the services that need it most.

The fairness algorithm is applied during quota reconciliation, which runs every `fairnessReconciliationIntervalMs` (default: 5000ms). Reconciliation adjusts effective quotas (not declared quotas) to bring actual usage closer to fair shares. Adjustments are made incrementally: each reconciliation step moves effective quotas by at most 10% toward the fair share target. This prevents abrupt disruptions while ensuring convergence over time.

## Burst Protection

Burst protection handles situations where a service's demand temporarily spikes above its steady-state budget. Without burst protection, a brief spike could trigger throttling that outlasts the spike itself, causing unnecessary performance degradation.

The governance service implements burst protection through a credit system. Each service accumulates burst credits when it is operating below its budget. Credits are accumulated at a rate proportional to the gap between budget and actual usage: `creditsGained = (budget - actualUsage) * creditAccumulationRate` per accounting window. Credits are capped at `maxBurstCredits` (default: 5 seconds worth of budget).

When a service's demand exceeds its budget, it can spend burst credits to exceed its budget temporarily. Each credit allows one budget unit of overage for one accounting window. Credits are spent at the rate needed to cover the overage: `creditsSpent = actualUsage - budget` per window.

Burst protection has safeguards to prevent abuse:

- **Burst duration limit**: A service cannot spend burst credits for more than `maxBurstDurationMs` (default: 10000ms) continuously. After this limit, the burst ends and firm throttling applies.
- **Burst cooldown**: After a burst ends, the service must accumulate credits for at least `burstCooldownMs` (default: 30000ms) before starting another burst. This prevents services from oscillating between burst and normal modes.
- **Burst priority**: Burst credits can only be spent on operations at High priority or above. Low and Background priority operations do not qualify for burst spending.

The burst credit balance is tracked per resource type. A service may have burst credits available for CPU but not for Memory, or vice versa. Each resource type's burst budget is managed independently.

## Allocation Arbitration

When multiple services compete for a shared resource that cannot be fully allocated to all requesters (e.g., the last 100MB of available memory), the governance service performs allocation arbitration to resolve the conflict.

The arbitration protocol considers the following factors:

1. **Service criticality**: Critical services always receive allocation priority over non-critical services.
2. **Current utilization**: Services that are already operating close to their budget limit receive lower priority than services with headroom.
3. **Request urgency**: Allocation requests include an urgency field (Low, Normal, High, Critical). Higher urgency requests take precedence.
4. **Historical fairness**: Services that have recently received favorable arbitration outcomes receive lower priority, ensuring that arbitration does not consistently favor the same services.

The arbitration score is computed as: `0.3 * criticalityScore + 0.25 * (1 - utilizationRatio) + 0.25 * urgencyScore + 0.2 * fairnessScore`, where each component is normalized to [0, 1]. The service with the highest score receives the allocation.

Arbitration is performed synchronously when an allocation request cannot be immediately satisfied. The arbitration result is final for the current request; losing services must wait for the next reconciliation cycle or for the winning service to release its allocation.

In the event of a tie, the service with the lower recent allocation total (over the last `arbitrationFairnessWindowMs` default: 60000ms) wins. This ensures long-term fairness even when short-term arbitration scores are identical.

## Starvation Prevention Guarantees

The governance service provides the following starvation prevention guarantees:

1. **Minimum resource allocation**: Every registered service is guaranteed at least `minResourceAllocationPercent` (default: 5%) of its declared quota, regardless of system load. This ensures that even under extreme contention, every service can make progress. Services that require less than 5% of their quota during normal operation can voluntarily reduce their minimum allocation.

2. **Maximum wait time for allocation**: A service that requests a resource allocation will not wait more than `maxAllocationWaitMs` (default: 30000ms) before receiving at least its minimum allocation. If this guarantee cannot be met, the governance service triggers a `ResourceStarvationWarning` event and invokes the RuntimeRecoveryOrchestratorService.

3. **Fairness convergence**: The weighted max-min fairness algorithm guarantees that effective quotas converge to fair shares within `fairnessConvergenceTicks` (default: 100 reconciliation cycles, or approximately 500 seconds). This means that persistent unfairness is eventually corrected even if short-term conditions temporarily favor some services over others.

4. **No indefinite postponement**: A service cannot be indefinitely denied access to a resource it needs. The governance service tracks each service's cumulative wait time for each resource type. If the cumulative wait time exceeds `maxCumulativeWaitMs` (default: 300000ms / 5 minutes), the service is granted a "priority allocation" that overrides the current arbitration outcome.

5. **Burst credit accrual guarantee**: Every service, regardless of its current utilization, accrues burst credits at a minimum rate of `minCreditAccrualRate` (default: 10% of the normal rate). This ensures that even busy services eventually accumulate enough credits to handle occasional spikes.

These guarantees are verified during the governance service's self-audit, which runs every `selfAuditIntervalMs` (default: 60000ms). The self-audit checks that all guarantees have been upheld during the previous interval and emits a `GovernanceGuaranteeViolation` event if any guarantee was breached. Violations are treated as system health issues and are reported to the RuntimeHealthSupervisorService.
