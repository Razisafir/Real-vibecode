# Distributed Execution Bridge Service (#107)

## HONEST DISCLAIMER

**This service is an abstraction layer ONLY for future distributed execution.** It does NOT currently distribute work across multiple machines, clusters, or networked nodes. All execution remains local and single-process. The interfaces, contracts, and models defined here are designed to make a future transition to true distributed execution possible without rewriting the runtime core, but no network transport, remote serialization, or actual multi-node coordination exists today. Treat every "remote" reference in this document as "simulated locally for interface validation."

## Remote Execution Abstraction

The DistributedExecutionBridgeService defines the interface boundary between the local runtime scheduler and any future remote execution substrate. The core abstraction is the `IRemoteExecutionTarget` interface, which represents a single execution endpoint capable of receiving work units, processing them, and returning results.

```typescript
interface IRemoteExecutionTarget {
  nodeId: string;
  capabilities: ExecutionCapabilities;
  submitWork(workUnit: DistributedWorkUnit): Promise<WorkSubmissionReceipt>;
  queryStatus(workId: string): Promise<WorkStatus>;
  cancelWork(workId: string): Promise<CancellationResult>;
  healthCheck(): Promise<NodeHealthReport>;
}
```

The design deliberately avoids prescribing the transport mechanism. The target could be an in-process worker thread, a local subprocess, a networked gRPC endpoint, or a cloud function. The bridge service sits between the scheduler and the target, translating local scheduling decisions into the appropriate submission protocol. This indirection means the scheduler never needs to know whether a work unit executes locally or remotely.

The abstraction also defines `IExecutionResultTransport`, which governs how results flow back from a remote target to the originating scheduler. Results may arrive synchronously, via polling, or via a push-based callback depending on the transport implementation. The current implementation uses an in-memory Promise-based transport that resolves immediately, but the interface supports any of these patterns.

## Execution Node Contracts

Every execution node -- whether local or remote -- must satisfy the execution node contract. This contract defines the minimum behavioral guarantees that the bridge service relies on for correct scheduling and failover.

**Required contract elements:**

1. **Work Acceptance**: A node MUST accept or reject a work unit within a configurable timeout (default: 5 seconds). Silent non-response is treated as rejection.
2. **Progress Reporting**: A node SHOULD emit progress events at intervals no greater than 30 seconds for long-running work. Absence of progress events triggers the liveness check.
3. **Result Delivery**: A node MUST deliver a result (success or failure) for every accepted work unit. The result must include execution metadata: wall time, CPU time (if available), memory high-water mark, and any warnings.
4. **Cancellation Compliance**: A node MUST honor cancellation requests within 10 seconds. After 10 seconds, the work unit is considered orphaned and the bridge treats it as a failed execution.
5. **Health Reporting**: A node MUST respond to health check requests within 3 seconds. Three consecutive health check failures mark the node as unavailable.

**Optional contract elements:**

- **Capability Advertisement**: Nodes MAY advertise specific execution capabilities (e.g., GPU access, specific tool availability, memory capacity). The scheduler uses capability advertisements to route work to compatible nodes.
- **Work Stealing**: Nodes MAY support work stealing, where an overloaded node can transfer queued work to a less loaded peer. This is not required for initial distributed deployment.

## Distributed Queue Model

The distributed queue model defines how work units flow from the scheduler to execution nodes. The model uses a pull-based assignment strategy: nodes request work from the bridge rather than having work pushed onto them. This approach prevents queue buildup on slow nodes and naturally balances load based on each node's processing capacity.

**Queue architecture:**

```
Scheduler -> Bridge Work Pool -> Node Request Queue -> Node Execution
                                    ^                         |
                                    |--- Result Callback -----|
```

The Bridge Work Pool holds all pending work units that have been scheduled but not yet assigned to a node. Each node maintains a local request queue that tracks in-flight work. When a node's in-flight count drops below its concurrency limit, it pulls the next work unit from the pool.

**Queue semantics:**

- **FIFO within priority**: Work units are dequeued in FIFO order within each priority level. Higher priority levels are always drained before lower priority levels.
- **Affinity hints**: Work units may carry an affinity hint requesting assignment to a specific node (e.g., for stateful operations). The bridge respects affinity hints when possible but does not guarantee them.
- **Expiration**: Work units that remain in the pool longer than their TTL (default: 60 seconds) are expired and marked as timed out. This prevents stale work from accumulating.

## Node Heartbeat Tracking

The bridge service tracks node availability through a heartbeat protocol. Each node is expected to emit a heartbeat signal at regular intervals (default: every 10 seconds). Heartbeats carry minimal payload: node identifier, current load percentage, and a monotonic sequence number.

**Heartbeat state machine:**

| State | Condition | Transition |
|-------|-----------|------------|
| Healthy | Last heartbeat < 15s ago | Remains Healthy |
| Suspect | Last heartbeat 15-30s ago | Healthy -> Suspect |
| Unavailable | Last heartbeat > 30s OR 3 failed health checks | Suspect -> Unavailable |
| Recovered | Previously Suspect/Unavailable, heartbeat received | -> Healthy |

When a node transitions to Suspect, the bridge stops assigning new work to that node but allows in-flight work to complete. When a node transitions to Unavailable, the bridge immediately triggers workload redistribution for all in-flight work assigned to that node.

The heartbeat tracker maintains a rolling window of the last 100 heartbeat intervals per node. This window is used to compute average heartbeat jitter, which factors into the suspect threshold. Nodes with high jitter (standard deviation > 5 seconds) have their suspect threshold widened to account for their irregular timing.

## Node Failover Simulation

Since true remote nodes do not yet exist, the bridge service simulates failover scenarios locally. The simulation framework allows developers and tests to exercise the failover path without requiring actual network infrastructure.

**Simulation capabilities:**

1. **Node disappearance**: A simulated node stops responding to health checks and work submissions. The bridge must detect the failure within the configured detection window and redistribute work.
2. **Slow node degradation**: A simulated node gradually increases response latency. The bridge should detect the degradation through heartbeat jitter analysis and proactively redirect work.
3. **Partial failure**: A simulated node responds to health checks but fails to deliver results for specific work units. The bridge must detect result delivery failures through timeout tracking.
4. **Partition simulation**: The bridge simulates a network partition where a subset of nodes becomes unreachable. This tests the workload redistribution algorithm under partition conditions.

**Simulation implementation:**

The `LocalNodeSimulator` class implements `IRemoteExecutionTarget` and wraps actual local execution with configurable fault injection. It can introduce artificial delays, drop specific requests, and inject errors based on a simulation scenario script. The simulator is activated only in test and development environments; production builds exclude the simulator entirely.

## Workload Redistribution Algorithm

When a node becomes unavailable, the bridge must redistribute its in-flight and queued work to remaining healthy nodes. The redistribution algorithm operates in three phases:

**Phase 1 -- Immediate reassignment of queued work:**
All work units still in the failed node's request queue (not yet executing) are immediately returned to the Bridge Work Pool. These work units retain their original priority and are treated as new submissions for scheduling purposes. No special ordering is applied; they re-enter the pool at their priority level.

**Phase 2 -- In-flight work timeout and resubmission:**
Work units that were executing on the failed node are not immediately resubmitted. Instead, the bridge waits for a configurable grace period (default: 15 seconds) in case the node recovers. If the node does not recover within the grace period, each in-flight work unit is marked as failed-with-possible-duplication and resubmitted to the pool. The "possible duplication" flag alerts downstream consumers that the original execution might still complete on the recovered node.

**Phase 3 -- Load rebalancing:**
After immediate reassignment and in-flight work resubmission, the bridge evaluates the load distribution across remaining nodes. If any node's load exceeds 80% capacity, the bridge proactively redistributes work from overloaded nodes to underloaded ones. This rebalancing uses a simple greedy algorithm: sort nodes by current load ascending, sort work units by priority descending, and assign the highest priority work to the least loaded node until all work is assigned or all nodes are at capacity.

**Redistribution guarantees:**

- No work unit is lost during redistribution (all units are tracked until delivered or expired).
- At-most-once execution is guaranteed for idempotent work units. At-least-once is possible for non-idempotent units during node recovery, hence the duplication flag.
- Redistribution completes within 30 seconds of node failure detection for pools with fewer than 1000 pending work units.

## Synchronization Boundaries

Distributed execution introduces synchronization challenges that do not exist in single-process execution. The bridge service defines synchronization boundaries that determine when state must be consistent across nodes.

**Consistency levels:**

| Level | Guarantee | Overhead | Use Case |
|-------|-----------|----------|----------|
| None | No consistency guarantee | Zero | Independent stateless tasks |
| Eventual | State converges within TTL | Low | Caching, analytics |
| Session | Consistent within a session | Medium | User-scoped operations |
| Strong | Linearizable consistency | High | Critical state mutations |

The bridge allows each work unit to specify its required consistency level. The scheduler uses this information to route work: strongly consistent work is always routed to the primary node (the local process), while eventually consistent work can be routed to any available node.

**Boundary enforcement:**

Synchronization boundaries are enforced at the work unit level, not at the operation level. This means that individual operations within a work unit do not require cross-node coordination; only the start and end states of the work unit must satisfy the declared consistency level. This coarse-grained approach minimizes coordination overhead while still providing meaningful consistency guarantees.

## Eventual Consistency Tracking

For work units declared with eventual consistency, the bridge tracks consistency lag -- the time between when a state mutation is applied on one node and when it becomes visible on all nodes.

**Lag measurement model:**

The bridge maintains a vector clock per consistency domain. Each state mutation increments the clock on the originating node. When a node applies a mutation, it records the originating node's clock value alongside its own. The lag for a mutation is the difference between the local application time and the originating application time.

**Lag thresholds:**

- **Acceptable**: < 1 second (typical for local simulation)
- **Warning**: 1-5 seconds (indicates scheduling or processing delays)
- **Critical**: > 5 seconds (possible node overload or partition)

The bridge emits a `consistencyLagWarning` event when any domain exceeds the warning threshold and a `consistencyLagCritical` event when any domain exceeds the critical threshold. These events are consumed by the runtime observability system for dashboard display and alerting.

**Current implementation:**

In the current single-process implementation, consistency lag is always near-zero (typically < 1 millisecond). The tracking infrastructure exists to validate the measurement model, not to detect actual lag. Real lag measurement will become meaningful when true distributed execution is implemented.

## Current Limitations and Honest Assessment

**What exists today:**

- Complete interface definitions for `IRemoteExecutionTarget`, `IExecutionResultTransport`, and `IDistributedWorkPool`
- Local simulation framework for testing failover and redistribution logic
- Heartbeat tracking with full state machine implementation
- Workload redistribution algorithm implemented and tested against simulated failures
- Consistency tracking infrastructure with vector clock implementation
- Comprehensive test suite covering all simulated failure scenarios

**What does NOT exist today:**

- No actual network transport for remote execution
- No serialization/deserialization layer for cross-process work units
- No authentication or authorization for inter-node communication
- No actual multi-node deployment -- all "nodes" run in the same process
- No partition tolerance beyond simulation -- the bridge assumes reliable local communication
- No distributed transaction support -- work units must be independently retryable

**Risk assessment:**

The primary risk is that the abstraction layer may not perfectly match the requirements of actual distributed execution. Network latency, partial failures, and serialization costs can invalidate assumptions made in the local simulation. The bridge's failover detection windows (15-30 seconds) are appropriate for local simulation but may be too aggressive for networked environments with higher latency variance.

## Future Integration Path

The path from the current abstraction to true distributed execution involves several milestones:

1. **Transport layer implementation** (Phase 22+): Implement a concrete transport using WebSocket or gRPC. This requires serialization of work units and results, which introduces versioning challenges.

2. **Node discovery service**: Implement a discovery protocol for nodes to register with the bridge dynamically. This replaces the current static node configuration.

3. **Authentication and authorization**: Add mutual TLS or token-based authentication for inter-node communication. The governance service (#108) should control authorization decisions.

4. **Serialization framework**: Design a versioned serialization format for work units that supports backward-compatible evolution. This is critical for rolling upgrades.

5. **Network-aware scheduling**: Enhance the scheduler with network topology awareness to minimize latency and bandwidth usage when routing work to remote nodes.

6. **Production hardening**: Extend the simulation framework with chaos engineering capabilities (random node failures, network partitions, clock skew) and run extended stress tests.

Each milestone can be implemented independently without modifying the core bridge interfaces, validating the abstraction-first approach taken in this phase.
