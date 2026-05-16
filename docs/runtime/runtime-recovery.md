# RuntimeRecoveryOrchestratorService (#105)

The RuntimeRecoveryOrchestratorService is the system's automated healing engine. When services degrade, fail, or behave unpredictably, the recovery orchestrator generates and executes structured recovery plans. It operates across four escalation levels, coordinates safe restarts, manages rollback decisions, and prevents recovery actions from making the system worse. The service is the last line of defense before human intervention is required.

## Recovery Plan Generation

When the recovery orchestrator receives a trigger (from the health supervisor, the kernel, or an explicit API call), it generates a recovery plan. A recovery plan is a sequence of ordered recovery actions, each with preconditions, expected outcomes, and rollback instructions.

Plan generation follows a strategy-based approach. The orchestrator maintains a library of recovery strategies, each targeting a specific failure pattern. When a trigger arrives, the orchestrator matches the trigger against its strategy library and selects the best-matching strategy. The selection criteria include:

- **Failure pattern match**: The trigger's failure classification (e.g., unresponsive, high error rate, resource exhaustion) must match the strategy's target pattern.
- **Service criticality**: The affected service's criticality level determines which strategies are permissible. Critical services cannot be restarted without coordination, while non-critical services can be restarted independently.
- **Escalation level**: The current escalation level constrains the available strategies. Soft strategies are available at all levels; aggressive strategies are only available at higher escalation levels.
- **Historical effectiveness**: Each strategy tracks its success rate over the last `strategyHistorySize` (default: 50) invocations. Strategies with a success rate below `minStrategySuccessRate` (default: 0.3) are deprioritized.

A generated recovery plan includes the following elements:

- **Plan ID**: A unique identifier for tracking the plan through its lifecycle.
- **Trigger description**: The original trigger that prompted plan generation, including the affected service, failure classification, and health score at the time of trigger.
- **Actions**: An ordered list of recovery actions, each specifying the target service, the action type (restart, reset, isolate, rollback, shed-load), parameters, and a timeout.
- **Preconditions**: Conditions that must be true before the plan can execute. For example, a restart action may require that no other recovery plan is currently operating on the same service.
- **Expected outcomes**: The expected state of the system after each action. These are used to validate the action's success.
- **Rollback plan**: A reverse sequence of actions to execute if the primary plan fails, restoring the system to its pre-recovery state.

Plans are persisted to the RuntimePersistenceService before execution begins. This ensures that if the recovery orchestrator itself crashes during a plan, the plan can be resumed after restart.

## Recovery Escalation Hierarchy

The orchestrator operates across four escalation levels, each granting progressively more aggressive recovery actions. Escalation is automatic: if a recovery plan at a given level fails to resolve the issue within `escalationTimeoutMs`, the orchestrator escalates to the next level.

**Soft Escalation**: The least invasive level. Permissible actions include:
- Increasing monitoring frequency for the affected service.
- Adjusting resource quotas (within 10% of current allocation).
- Shedding Background and Deferred work from the service's queue.
- Emitting advisory events to other services.

Soft escalation has a timeout of `softEscalationTimeoutMs` (default: 30000ms). If the affected service's health score does not improve above the degradation threshold within this time, the orchestrator escalates to Moderate.

**Moderate Escalation**: Moderate intervention actions. Permissible actions include everything from Soft, plus:
- Reducing the service's concurrency limits by up to 50%.
- Re-routing work away from the affected service through capability routing.
- Resetting the service's internal state (calling `reset()` instead of full restart).
- Activating fallback behaviors for the service's dependents.

Moderate escalation has a timeout of `moderateEscalationTimeoutMs` (default: 60000ms). If the service does not recover within this time, the orchestrator escalates to Aggressive.

**Aggressive Escalation**: Significant intervention that may cause temporary disruption. Permissible actions include everything from Moderate, plus:
- Restarting the affected service (calling `shutdown()` then `initialize()`).
- Restarting dependent services if their state depends on the failing service.
- Shedding Low-priority work across the system to free resources.
- Imposing strict resource caps on the affected service.

Aggressive escalation has a timeout of `aggressiveEscalationTimeoutMs` (default: 120000ms). If recovery still fails, the orchestrator escalates to Emergency.

**Emergency Escalation**: The most aggressive level, used only when all other approaches have failed. Permissible actions include everything from Aggressive, plus:
- Terminating the affected service (without graceful shutdown).
- Restarting entire subsystems (groups of related services).
- Pausing all non-critical system functions.
- Entering degraded-mode operation for the entire runtime.
- Triggering a full system rollback to the last known good checkpoint.

Emergency escalation has no timeout; it remains in effect until a human operator acknowledges the situation and either resolves it manually or authorizes the system to attempt further automated recovery.

Escalation is tracked per-service. Multiple services can be at different escalation levels simultaneously. The orchestrator maintains a global escalation state that is the maximum of all per-service escalation levels; this global state determines which system-wide actions are permissible.

## Subsystem Restart Orchestration

Restarting a service is not a simple operation in a system with 109+ interdependent services. The orchestrator follows a safe restart protocol that minimizes the impact on dependent services.

The restart protocol proceeds through the following steps:

1. **Pre-restart validation**: The orchestrator verifies that the target service is in a state that permits restart. A service in the middle of a critical operation (e.g., writing to the WAL) cannot be safely restarted. The orchestrator checks the service's `isRestartable()` method; if it returns false, the restart is deferred until the service becomes restartable or the escalation level forces the restart.

2. **Dependency notification**: The orchestrator notifies all services that depend on the target service about the impending restart. Dependent services are expected to enter a `DependencyRestarting` state where they buffer or redirect their requests. The notification is sent `restartLeadTimeMs` (default: 2000ms) before the actual restart begins.

3. **Graceful shutdown**: The orchestrator invokes the target service's `shutdown()` method with a timeout of `restartShutdownTimeoutMs` (default: 5000ms). If the service does not shut down within this time, the orchestrator forcibly terminates it.

4. **State cleanup**: The orchestrator cleans up the terminated service's resources: releasing execution slots, closing communication channels, and clearing queue entries. The resource governance service is notified to reclaim the service's resource quotas.

5. **Reinitialization**: The orchestrator creates a new instance of the service and calls `initialize()`. The initialization timeout is `restartInitTimeoutMs` (default: 10000ms). If initialization fails, the orchestrator retries up to `restartMaxRetries` (default: 2) times before declaring the restart failed.

6. **Dependency restoration**: The orchestrator notifies dependent services that the target service has restarted and is available. Dependent services exit the `DependencyRestarting` state and resume normal operations.

7. **Validation**: The orchestrator monitors the restarted service for `restartValidationPeriodMs` (default: 30000ms). If the service's health score returns to above 0.8 within this period, the restart is declared successful. If not, the orchestrator may attempt another restart or escalate.

## Rollback Triggers

In some situations, recovery is best served by reverting to a previous known-good state rather than attempting to repair the current state. The orchestrator triggers a rollback when it detects any of the following conditions:

- **Recovery plan failure**: A recovery plan has failed at all available escalation levels. Rolling back to a checkpoint taken before the failure began may be the only path to recovery.
- **State corruption**: The RuntimePersistenceService has detected state corruption that cannot be repaired. A rollback to the last validated checkpoint is required.
- **Cascading failure**: A recovery action for one service has caused a failure in a previously healthy service. This indicates that the recovery action made things worse, and a rollback is needed to restore the pre-recovery state.
- **Escalation overshoot**: The system has reached Emergency escalation and the recovery actions are not improving the situation. A rollback to a checkpoint from before the escalation began may be the safest course.

When a rollback is triggered, the orchestrator:

1. Takes a checkpoint of the current (failed) state for post-mortem analysis.
2. Identifies the most recent valid checkpoint from before the failure.
3. Validates the checkpoint (checksum, schema version, consistency).
4. Initiates the checkpoint restoration through the RuntimePersistenceService.
5. Reinitializes all services with the restored state.
6. Monitors the system for `rollbackValidationPeriodMs` (default: 60000ms) to confirm stability.

## Degraded-Mode Operation

When full recovery is not possible, the orchestrator can place the system in degraded-mode operation. In degraded mode, non-essential features are disabled, resource usage is minimized, and the system operates at reduced capacity but remains functional for critical operations.

Degraded mode is triggered when:
- A critical service cannot be recovered after Emergency escalation.
- Multiple services are in Aggressive or Emergency escalation simultaneously.
- The system has been in Emergency escalation for more than `maxEmergencyDurationMs` (default: 300000ms / 5 minutes).

In degraded mode, the following restrictions apply:

- **Feature gating**: All features tagged as `non-critical` in the feature registry are disabled. User requests for disabled features receive a `FeatureUnavailableInDegradedMode` error.
- **Agent restrictions**: Only agents with `criticalAgent: true` in their descriptor remain active. All other agents are paused.
- **Queue restrictions**: Only Critical and High priority work is processed. Normal, Low, Background, and Deferred queues are frozen.
- **Resource restrictions**: Non-critical services have their resource quotas reduced to the minimum viable allocation.
- **Communication restrictions**: The inter-agent message bus is limited to critical-only topics.

Degraded mode persists until a human operator explicitly exits it through the `exitDegradedMode()` command, or until all services that triggered degraded mode have recovered to at least the Degraded health classification.

## Dependency Recovery Ordering

When multiple services need recovery simultaneously, the orchestrator must determine the correct order. Recovery actions must respect service dependencies: a service cannot be recovered before the services it depends on are healthy.

The orchestrator computes a recovery order by performing a topological sort on the subgraph of services that need recovery. The sort uses the same dependency graph maintained by the kernel, but considers only the services that are in a Failed, Failing, or Severely Degraded state.

The topological sort produces a recovery sequence where each service appears after all its dependencies. Within each topological level (services that have no ordering constraint between them), the orchestrator prioritizes:

1. Services with higher criticality (critical before non-critical).
2. Services with more dependents (recovering a widely-depended-on service first benefits more services).
3. Services with lower expected recovery time (quick wins first, to reduce the total number of affected services as fast as possible).

The orchestrator executes recovery actions in the computed order, waiting for each service to reach at least the Degraded health classification before proceeding to services that depend on it. If a service fails to recover within its assigned timeout, the orchestrator re-evaluates the recovery order to account for the new state.

## Recovery Cooldowns

Recovery actions can be disruptive, and applying them too aggressively can make the system worse. The orchestrator implements recovery cooldowns to prevent "recovery thrashing" -- the cycle where a service is repeatedly restarted, briefly recovers, degrades again, and is restarted again.

Each service has a per-action cooldown that prevents the same recovery action from being applied too frequently:

| Action | Cooldown |
|--------|----------|
| Increase monitoring | 5 seconds |
| Adjust quotas | 30 seconds |
| Shed work | 60 seconds |
| Reset state | 120 seconds |
| Restart | 300 seconds (5 minutes) |
| Terminate | 600 seconds (10 minutes) |
| Subsystem restart | 1800 seconds (30 minutes) |
| Full rollback | 3600 seconds (1 hour) |

If the orchestrator wants to apply an action that is on cooldown, it must either escalate to a higher-level action (which may have its own cooldown) or wait for the cooldown to expire. The cooldown timer starts when the action completes, not when it begins.

The orchestrator also tracks the total recovery action count per service. If a service has received more than `maxRecoveryActionsPerHour` (default: 10) actions within the last hour, the orchestrator marks the service as `RecoveryResistant` and escalates its case to the next escalation level regardless of its current health score. This ensures that chronically unstable services receive more aggressive treatment rather than being subjected to endless soft recovery attempts.

## Isolation Quarantine

When a service's behavior poses a risk to the broader system (e.g., it is consuming excessive resources, producing corrupt data, or interfering with other services), the orchestrator can place it in quarantine.

A quarantined service is isolated from the rest of the system:

- Its communication channels are severed; it cannot send or receive messages on the inter-agent bus.
- Its execution slots are revoked; it cannot process any work.
- Its resource quotas are reduced to a minimal allocation (enough to keep it alive for diagnostic purposes but not enough to cause harm).
- It is excluded from all capability routing decisions.

Quarantine is not a recovery action; it is a containment action. A quarantined service remains in quarantine until:

- A diagnostic analysis determines the root cause and a fix is applied.
- The service's state is rolled back to a known-good checkpoint.
- The service is terminated and replaced with a fresh instance.
- A human operator explicitly releases the service from quarantine.

The orchestrator emits a `ServiceQuarantined` event when a service enters quarantine and a `ServiceReleasedFromQuarantine` event when it exits. The quarantine action is logged with full details for post-mortem analysis.

## Self-Healing Workflows

The orchestrator supports automated self-healing workflows for common failure patterns. A self-healing workflow is a pre-defined sequence of recovery actions that can be executed without human intervention for specific, well-understood failure modes.

Built-in self-healing workflows include:

**Memory Leak Recovery**: When the health supervisor detects that a service's memory usage is steadily increasing (slope-based detection), the orchestrator triggers this workflow:
1. Shed non-essential work from the affected service.
2. Invoke the service's `gc()` method to request garbage collection.
3. Wait 10 seconds and re-check memory usage.
4. If memory is still growing, reset the service's state.
5. If memory continues to grow after reset, restart the service.
6. If memory still grows after restart, quarantine the service and escalate to human.

**Deadlock Resolution**: When the kernel's deadlock detector identifies a cycle:
1. Log the cycle with full service and resource details.
2. Attempt to release the contested resource from the lowest-priority service in the cycle.
3. If release succeeds, monitor for recurrence.
4. If release fails or deadlock recurs, restart the lowest-priority service in the cycle.
5. If the deadlock still recurs after restart, quarantine the offending service.

**Error Storm Recovery**: When a service's error rate spikes above 50%:
1. Identify the most common error type from the service's error log.
2. If the error is input-related (validation errors), apply input filtering.
3. If the error is resource-related (timeouts, OOM), reduce the service's concurrency and increase its resource quota.
4. If the error is dependency-related, check the dependency's health and initiate recovery for the dependency.
5. If the error rate does not improve within 60 seconds, restart the service.

Custom self-healing workflows can be registered through the orchestrator's `registerWorkflow(triggerPattern, workflow)` API. This extensibility enables domain-specific recovery logic without modifying the orchestrator's core.

## Recovery Dependency Graph

The orchestrator maintains a recovery dependency graph that captures the relationships between recovery actions. Unlike the service dependency graph (which captures runtime dependencies), the recovery dependency graph captures the ordering constraints between recovery actions.

For example, restarting service A may depend on first restarting service B (because A depends on B at runtime). But it may also depend on first rolling back service C (because C's corrupted state is what caused A to fail). The recovery dependency graph captures both types of constraints.

The graph is constructed when a recovery plan is generated. Each action in the plan becomes a node, and edges represent ordering constraints. The graph is validated for cycles before execution begins; if a cycle is detected, the plan is rejected and a new plan is generated with different actions.

During execution, the orchestrator traverses the graph in topological order. Actions with no unexecuted predecessors are eligible for parallel execution, subject to the orchestrator's `maxParallelRecoveryActions` (default: 3) limit. This parallelism reduces total recovery time for complex multi-service failures.
