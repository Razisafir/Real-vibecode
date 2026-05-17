# ExecutionSchedulerService (#101)

The ExecutionSchedulerService governs how work is queued, prioritized, and dispatched for execution across the AI Execution Kernel. It provides a priority-aware scheduling layer that sits between work producers (agents, user actions, system events) and work executors (services, handlers, workers). The scheduler ensures that high-priority work is processed promptly, lower-priority work eventually completes, and no single work source can monopolize execution capacity.

## Priority Queue Architecture

The scheduler maintains six priority levels, each backed by its own internal queue. Work items are enqueued with an explicit priority and are dequeued in priority order: Critical before High, High before Normal, and so on.

**Critical (Priority 0)**: Reserved for work that must execute immediately to prevent data loss, system instability, or user-visible failure. Examples include crash recovery, deadlock resolution, and critical state transitions. The Critical queue is unbounded in principle but is rate-limited to 10 items per second to prevent priority inflation. Any service that overuses the Critical priority receives a `PriorityAbuseWarning` and may have its Critical submissions demoted to High.

**High (Priority 1)**: Work that is time-sensitive but not immediately critical. User-initiated actions, real-time collaboration events, and health-critical operations are classified as High. The High queue has a soft limit of 100 items; beyond this, new High items are accepted but an `ExecutionBackpressure` event is emitted.

**Normal (Priority 2)**: The default priority for most system work. Background processing, scheduled tasks, and standard agent operations run at Normal priority. The Normal queue has a soft limit of 500 items.

**Low (Priority 3)**: Work that should eventually complete but has no time sensitivity. Analytics collection, telemetry aggregation, and non-essential logging are typical Low-priority items. The Low queue has a soft limit of 1000 items.

**Background (Priority 4)**: Work that runs only when no other work is pending. Index updates, cache warming, and speculative prefetching are Background work. The Background queue has a soft limit of 2000 items.

**Deferred (Priority 5)**: Work that is explicitly deferred until a future condition is met. Deferred items carry a `deferredUntil` timestamp and are invisible to the scheduler until that timestamp is reached. Once the deferral condition is met, the item is promoted to its original priority (or a reassigned priority). The Deferred queue is not size-limited because items are not actively consuming scheduling slots.

## Concurrency Limits Per Priority Tier

Each priority tier has an associated concurrency limit that controls how many items from that tier may execute simultaneously. These limits are independent: the scheduler can run Critical, High, and Normal work concurrently without any of those tiers consuming slots from the others.

| Priority | Default Concurrency | Rationale |
|----------|-------------------|-----------|
| Critical | 4 | Sufficient for parallel recovery without starving other tiers |
| High | 8 | Supports multiple concurrent user-facing operations |
| Normal | 16 | Broad parallelism for standard work |
| Low | 8 | Moderate parallelism, leaves headroom for higher tiers |
| Background | 4 | Intentionally limited to avoid interfering with foreground work |
| Deferred | N/A | Deferred items are promoted to their target tier before execution |

Total system concurrency is bounded by the sum of all tier limits (40 at defaults), but the ResourceGovernanceService may reduce effective concurrency based on available CPU and memory budgets. The scheduler respects these runtime adjustments and will shrink or expand tier concurrency within configured bounds.

## Execution Windows

An execution window is a time-bounded slot during which a work item must complete. When a work item is dequeued for execution, the scheduler assigns it an execution window whose duration is determined by the item's priority and the current system load.

- Critical items receive a window of 100ms, reflecting their urgency and typically small scope.
- High items receive a window of 500ms.
- Normal items receive a window of 2000ms.
- Low items receive a window of 5000ms.
- Background items receive a window of 10000ms.

If a work item exceeds its execution window, the scheduler emits an `ExecutionWindowExceeded` event and may preempt the item. Preempted items are re-enqueued at their original priority (with a preemption count incremented) unless they have been preempted more than `maxPreemptions` (default: 3) times, in which case they are failed with a `MaxPreemptionsExceededError`.

Execution windows are dynamically adjusted based on system saturation. When the scheduler detects that more than 80% of concurrency slots are occupied, it reduces all window durations by 25% to increase throughput. When saturation drops below 50%, windows are restored to their full values.

## Starvation Prevention Algorithm

The scheduler uses an aging-based priority boost mechanism to prevent indefinite starvation of lower-priority work. Every work item carries an `enqueueTick` timestamp recording when it was added to the queue. On each scheduler tick, the item's `ageInTicks` is computed as `currentTick - enqueueTick`.

When `ageInTicks` exceeds the `agingThreshold` for the item's current priority, the item is promoted by one priority level. The aging thresholds are calibrated so that no item waits more than a configurable maximum:

| Priority | Aging Threshold (ticks) | Maximum Wait (at 50ms cadence) |
|----------|------------------------|-------------------------------|
| High | 200 | 10 seconds |
| Normal | 400 | 20 seconds |
| Low | 800 | 40 seconds |
| Background | 1600 | 80 seconds |
| Deferred | N/A | Deferred items age only after their deferral condition is met |

An item can be promoted multiple times. A Background item that waits 80 seconds is promoted to Low, and after another 40 seconds is promoted to Normal. This ensures that even the lowest-priority work eventually receives execution time. However, items are never promoted above High priority to prevent starvation-prevention from interfering with genuinely critical work.

The aging algorithm runs during the scheduler's maintenance phase, which executes every 10 ticks (500ms at default cadence). This amortized schedule keeps the aging computation from dominating scheduler overhead.

## Deferred Execution Model

Deferred execution allows work items to be scheduled for future processing. A deferred item includes a `deferredUntil` timestamp (absolute) and an optional `deferredCondition` predicate. The item becomes eligible for execution only when both the timestamp has passed and the condition (if present) evaluates to true.

The scheduler maintains a time-ordered heap of deferred items. On each maintenance phase, the scheduler scans the heap for items whose `deferredUntil` timestamp has passed. For each such item, it evaluates the `deferredCondition` predicate (if any). Items that pass are promoted to their target priority queue; items that fail the condition are left on the heap and rechecked on the next maintenance pass.

Deferred items that remain on the heap beyond `maxDeferralAgeMs` (default: 1 hour) are expired and removed. A `DeferredItemExpired` event is emitted for each expired item, allowing producers to take corrective action.

## Retry Scheduling with Exponential Backoff and Jitter

When a work item fails, the scheduler can automatically retry it according to a configurable retry policy. The retry policy specifies:

- **Maximum retries**: The total number of retry attempts allowed (default: 3).
- **Base delay**: The initial delay before the first retry (default: 1000ms).
- **Backoff multiplier**: The factor by which the delay increases with each retry (default: 2.0).
- **Maximum delay**: A cap on the delay between retries (default: 30000ms).
- **Jitter range**: A random jitter applied to the delay to prevent thundering-herd effects (default: +/- 20% of the computed delay).

The delay for retry N is computed as: `min(baseDelay * backoffMultiplier^(N-1), maxDelay)`, then jittered by adding a random value in `[-jitterRange, +jitterRange]`. For example, with default settings:

- Retry 1: ~1000ms (800ms to 1200ms with jitter)
- Retry 2: ~2000ms (1600ms to 2400ms with jitter)
- Retry 3: ~4000ms (3200ms to 4800ms with jitter)

Retries are scheduled as deferred items with the computed delay as the `deferredUntil` timestamp. This integrates retry scheduling with the existing deferred execution model and ensures that retries do not consume active scheduling slots while waiting.

Retry-eligible failures are distinguished from permanent failures through the `isRetryable` property on the error. Network timeouts and resource contention errors are typically retryable; validation errors and permission errors are not.

## Queue Aging Mechanics

Beyond priority aging (which promotes individual items), the scheduler monitors overall queue aging statistics. For each priority tier, it tracks:

- **Mean age**: The average time items spend in the queue before execution.
- **P95 age**: The 95th percentile wait time.
- **P99 age**: The 99th percentile wait time.
- **Max age**: The longest wait time of any currently queued item.

These statistics are computed during the maintenance phase and emitted as telemetry. They serve as early warning signals: if the P95 age for Normal priority exceeds 5 seconds, the scheduler emits a `QueueAgingWarning`. If P99 exceeds 10 seconds, it emits a `QueueAgingCritical` event.

Queue aging statistics also feed into the scheduler's self-adjustment logic. When aging exceeds configured thresholds, the scheduler can:

1. Request additional concurrency slots from the ResourceGovernanceService.
2. Temporarily increase the aging rate for the affected tier (promote items faster).
3. Shed load by dropping the oldest Low and Background items (with `ItemShed` events emitted).

## Weighted Fairness Algorithm

The scheduler ensures that no single work source monopolizes execution capacity through a weighted fairness algorithm inspired by deficit round-robin scheduling.

Each work source (identified by a `sourceId`) is assigned a weight between 0.0 and 1.0, with a default of 1.0. The weight determines the proportion of execution slots allocated to that source relative to other active sources. During each scheduling round, the scheduler maintains a deficit counter for each source. Sources with higher deficits are preferred when multiple items have equal priority.

When a source's items are consistently selected over others, the deficit counters of unserved sources accumulate, increasing their scheduling probability in subsequent rounds. This creates a self-correcting feedback loop: sources that have been under-served are gradually boosted, while sources that have been over-served are gradually throttled.

The fairness algorithm operates within priority tiers. It does not allow a Low-priority source to compete with a High-priority source; fairness only applies when comparing items at the same priority level. This preserves the strict priority ordering while ensuring horizontal fairness within each tier.

Weights are configurable through the `runtime.scheduler.sourceWeights` map. System-critical sources (such as the health supervisor and recovery orchestrator) are assigned a higher default weight of 2.0 to ensure they receive scheduling preference during contention.

## Execution Arbitration Protocol

When multiple work items compete for the same scarce resource (a database connection, a file lock, a network socket), the scheduler's execution arbitration protocol resolves the conflict. The protocol has three rules:

1. **Priority precedence**: Higher-priority items always win over lower-priority items.
2. **Age precedence**: Among items of equal priority, the older item (smaller `enqueueTick`) wins.
3. **Source fairness precedence**: Among items of equal priority and age, the source with the lower recent allocation (lower deficit counter balance) wins.

The arbitration result is final for the current scheduling round. Losing items are re-enqueued and compete again in the next round. The protocol is deterministic: given the same queue state, it always produces the same arbitration result.

## Scheduling Telemetry

The scheduler emits the following telemetry events and metrics:

**Events**:
- `WorkItemEnqueued`: Emitted when a work item is added to a queue. Payload: itemId, priority, sourceId, timestamp.
- `WorkItemDequeued`: Emitted when a work item is selected for execution. Payload: itemId, priority, ageInTicks, timestamp.
- `WorkItemCompleted`: Emitted when a work item finishes execution. Payload: itemId, priority, executionDurationMs, timestamp.
- `WorkItemFailed`: Emitted when a work item fails. Payload: itemId, priority, error, retryable, retryCount, timestamp.
- `WorkItemPreempted`: Emitted when a work item exceeds its execution window. Payload: itemId, priority, preemptionCount, timestamp.
- `WorkItemRetried`: Emitted when a failed item is scheduled for retry. Payload: itemId, priority, retryDelay, timestamp.
- `WorkItemShed`: Emitted when a low-priority item is dropped due to queue pressure. Payload: itemId, priority, ageInTicks, timestamp.
- `PriorityAbuseWarning`: Emitted when a source overuses Critical priority. Payload: sourceId, recentCriticalCount, timestamp.
- `ExecutionBackpressure`: Emitted when a queue exceeds its soft limit. Payload: priority, queueDepth, timestamp.
- `QueueAgingWarning` / `QueueAgingCritical`: Emitted when queue aging exceeds thresholds. Payload: priority, p95Age, p99Age, timestamp.

**Metrics (updated every 10 ticks)**:
- `scheduler.queue.depth.{priority}`: Current queue depth per priority tier.
- `scheduler.queue.age.mean.{priority}`: Mean wait time per tier.
- `scheduler.queue.age.p95.{priority}`: P95 wait time per tier.
- `scheduler.execution.active.{priority}`: Currently executing items per tier.
- `scheduler.execution.completed.count`: Total completed items.
- `scheduler.execution.failed.count`: Total failed items (with retryable/non-retryable breakdown).
- `scheduler.retry.pending.count`: Currently pending retries.
- `scheduler.fairness.deficit.{sourceId}`: Current deficit counter per source.
