# AgentOrchestrationRuntimeService (#102)

The AgentOrchestrationRuntimeService manages the lifecycle, routing, communication, and coordination of all agents within the AI Execution Kernel. It serves as the central authority for agent registration, capability matching, execution delegation, and failure containment. The service ensures that agents operate within their declared boundaries, that tasks are routed to the most capable agent, and that agent failures are isolated before they cascade.

## Agent Registration Protocol

Every agent must register with the orchestration service before it can receive work or communicate with other agents. Registration is a two-phase process: descriptor submission and capability validation.

During **descriptor submission**, the agent provides a `AgentDescriptor` object containing:

- **agentId**: A globally unique identifier for the agent. This ID is immutable once registered and must follow the `agent.{domain}.{name}` naming convention (e.g., `agent.code.refactor`, `agent.testing.unit`).
- **version**: A semantic version string for the agent implementation.
- **capabilities**: An array of `CapabilityDescriptor` objects, each declaring a capability name, input schema, output schema, and estimated execution cost. Capabilities are the primary mechanism for routing tasks to agents.
- **isolationLevel**: One of `Shared`, `Isolated`, or `Sandboxed`. This determines the execution boundary and failure containment strategy for the agent (detailed below).
- **priorityHint**: A suggested priority for work dispatched to this agent. The scheduler may override this based on system state.
- **maxConcurrentTasks**: The maximum number of tasks the agent can execute simultaneously. The orchestrator will not dispatch more than this limit.
- **heartbeatIntervalMs**: The interval at which the agent will emit heartbeats. Must be between 100ms and 10000ms.

During **capability validation**, the orchestrator verifies that the declared capabilities do not conflict with existing agents. Two agents may declare the same capability only if they have different `capabilityVersion` fields or if the `allowOverlap` flag is set on both descriptors. If a conflict is detected, registration fails with a `CapabilityConflictError` identifying the conflicting agent and capability.

Once registration succeeds, the agent is assigned an execution slot, added to the capability routing table, and subscribed to the inter-agent message bus. The agent transitions to the `Registered` state and must call `agent.ready()` to signal that it is prepared to receive work. Only after `ready()` is called does the agent transition to `Active` and become eligible for task routing.

## Capability Routing Algorithm

The capability routing algorithm matches incoming tasks to the most appropriate agent based on declared capabilities. The algorithm operates in three stages: exact match, fuzzy match, and fallback.

**Exact match**: The algorithm first searches for agents that declare a capability whose name exactly matches the task's required capability. If multiple agents declare the same capability, the algorithm selects the one with the lowest current load (fewest active tasks divided by maxConcurrentTasks). If loads are equal, the agent with the higher `capabilityVersion` is preferred.

**Fuzzy match**: If no exact match is found, the algorithm performs a fuzzy match based on capability name similarity and schema compatibility. Name similarity is computed using a normalized Levenshtein distance; a similarity score above 0.7 is required for consideration. Schema compatibility checks that the agent's input schema is a superset of the task's input requirements and that the agent's output schema is a subset of the task's output expectations. Among fuzzy-matched agents, the one with the highest combined similarity and compatibility score is selected.

**Fallback**: If no fuzzy match meets the threshold, the algorithm looks for a "universal" agent that declares the `agent.any` capability. Universal agents are general-purpose and can handle arbitrary tasks, though typically with lower quality or higher latency. If no universal agent exists, the task is failed with a `NoCapableAgentError`.

The routing decision is cached for `routingCacheTtlMs` (default: 30000ms) to avoid repeated matching computation for identical capability requests. Cache entries are invalidated when an agent deregisters or changes state.

## Execution Delegation Model

When a task is routed to an agent, the orchestrator delegates execution using a strict ownership model. The delegating entity (which may be another agent, a system service, or the kernel itself) retains ownership of the task's overall execution context but transfers execution responsibility to the target agent for the delegated subtask.

The delegation protocol works as follows:

1. The delegator creates a `TaskDelegation` object containing the task descriptor, the target agent ID, a timeout, and a cancellation token.
2. The orchestrator validates that the target agent is Active and has available capacity (active tasks < maxConcurrentTasks).
3. If validation passes, the orchestrator creates an `ExecutionContext` that links the delegation to the agent's execution slot. This context includes a parent reference back to the delegator's context.
4. The task is dispatched to the agent through its execution slot.
5. The agent processes the task and reports completion or failure through the context.

The delegator can monitor the delegated task's progress through the context but cannot directly intervene in the agent's execution. If the delegator needs to cancel the delegation, it signals the cancellation token, and the orchestrator forwards the cancellation to the agent. The agent is expected to respect cancellation within `cancellationGraceMs` (default: 500ms); after this grace period, the orchestrator forcibly terminates the task.

Delegation depth is limited to `maxDelegationDepth` (default: 5) to prevent unbounded delegation chains. If an agent attempts to delegate beyond this depth, the delegation fails with a `MaxDelegationDepthExceededError`.

## Inter-Agent Communication

Agents communicate through a message bus architecture. The message bus is a publish-subscribe system that supports both topic-based and direct messaging.

**Topic-based messaging**: Agents can publish messages to named topics and subscribe to topics of interest. Messages published to a topic are delivered to all subscribers. Topics follow a hierarchical naming convention using dot notation (e.g., `agent.code.fileChanged`, `agent.code.fileChanged.typeScript`). Subscribers can use wildcard patterns: `agent.code.*` matches all code-related topics, and `agent.>` matches all agent topics.

**Direct messaging**: Agents can send messages directly to a specific agent by ID. Direct messages are delivered only to the target agent and are not visible to other subscribers. Direct messaging is used for request-response patterns where a specific agent must be addressed.

The message bus guarantees at-least-once delivery for topic messages and exactly-once delivery for direct messages. Message ordering is preserved within a single topic but not across topics. Messages carry a timestamp, a sender ID, and an optional correlation ID for linking request-response pairs.

The bus implements backpressure to prevent fast producers from overwhelming slow consumers. When a consumer's message queue exceeds `consumerQueueLimit` (default: 1000 messages), the bus applies backpressure by pausing delivery to that consumer and emitting a `ConsumerBackpressure` event. Delivery resumes when the consumer's queue drops below 50% of the limit.

## Agent Isolation Boundaries

The isolation level declared during registration determines how the orchestrator contains agent failures:

**Shared isolation**: The agent runs in the same execution context as the kernel and other shared agents. A failure in a shared agent can potentially affect other shared agents. Shared isolation is appropriate only for well-tested, critical-path agents that require minimal overhead. Examples include the core execution agent and the health supervisor agent.

**Isolated isolation**: The agent runs in its own execution context with separate resource quotas. A failure in an isolated agent does not directly affect other agents, though it may indirectly affect agents that depend on its output. Most agents should use isolated isolation. The orchestrator monitors isolated agents independently and can restart them without affecting others.

**Sandboxed isolation**: The agent runs in a fully sandboxed environment with strict resource limits, no direct access to the message bus (only mediated communication through the orchestrator), and no ability to delegate tasks. Sandboxed isolation is used for untrusted or experimental agents. A sandboxed agent failure is completely contained: it cannot affect any other agent or system service. The orchestrator can terminate a sandboxed agent at any time without coordination.

When an agent fails, the isolation boundary determines the blast radius. For shared agents, the orchestrator triggers a system-wide health check. For isolated agents, the orchestrator marks only that agent as Failed and notifies its dependents. For sandboxed agents, the orchestrator simply terminates the agent and cleans up its resources.

## Runtime Arbitration

When multiple agents compete for the same task or resource, the orchestrator performs runtime arbitration to resolve the conflict. The arbitration protocol evaluates candidates along three dimensions:

1. **Capability match score**: How closely the agent's declared capabilities match the task requirements (from the capability routing algorithm).
2. **Current load**: The ratio of active tasks to maxConcurrentTasks. Lower load is preferred.
3. **Historical performance**: The agent's average task completion time and success rate over the last `performanceWindowSize` (default: 100 tasks).

The arbitration score is computed as a weighted sum: `0.4 * capabilityScore + 0.3 * (1 - loadRatio) + 0.3 * performanceScore`. The agent with the highest arbitration score wins the task.

In the event of a tie, the agent with the lower `agentId` (lexicographic) is chosen as a deterministic tiebreaker. This ensures that arbitration is fully deterministic given the same inputs.

## Execution Ownership Tracking

Every task in the system has a clearly defined owner at all times. The ownership tracking system maintains a map from task ID to the current owner's agent ID. Ownership transfers occur during delegation: when agent A delegates a subtask to agent B, agent A retains ownership of the parent task but agent B becomes the owner of the subtask.

The ownership map is persisted in the runtime snapshot and is queryable through the orchestrator's `getTaskOwner(taskId)` method. This enables any system component to determine which agent is responsible for a given task at any time, which is critical for error reporting, progress tracking, and cancellation propagation.

When an agent fails or is terminated, all tasks it owns are reassigned. The reassignment process first checks if the agent had any delegations in progress; if so, the delegators are notified that their delegated tasks have failed. Tasks that were directly assigned to the failed agent are re-routed through the capability routing algorithm.

## Cooperative Execution Protocol

Some tasks require multiple agents to collaborate. The cooperative execution protocol enables structured multi-agent collaboration through a shared execution context.

A cooperative task begins when an agent creates a `CooperativeSession` with a list of participant agent IDs and a coordination strategy. The coordination strategy determines how participants interact:

- **Sequential**: Participants execute one after another, with each participant's output feeding the next participant's input.
- **Parallel**: Participants execute simultaneously on the same input, and their outputs are merged using a configurable merge strategy (union, intersection, or custom).
- **Pipeline**: Participants form a pipeline where each stage processes and transforms the data before passing it to the next stage.
- **Consensus**: Participants each produce a result, and a voting mechanism selects the final output. The voting mechanism can be simple majority, weighted by capability score, or custom.

The orchestrator manages the cooperative session lifecycle: it creates the shared context, enforces the coordination strategy, monitors participant health, and collects results. If a participant fails during a cooperative session, the session's `participantFailurePolicy` determines the outcome:

- `FailSession`: The entire session fails.
- `SkipParticipant`: The failed participant's contribution is omitted, and the session continues with remaining participants.
- `ReplaceParticipant`: The orchestrator attempts to route the failed participant's work to an alternative agent.

Cooperative sessions have a maximum duration of `maxSessionDurationMs` (default: 60000ms). Sessions that exceed this limit are forcibly terminated with a `SessionTimeoutError`.

## Failure Containment Strategy

The orchestrator implements a layered failure containment strategy that prevents agent failures from propagating beyond their isolation boundaries.

**Layer 1 -- Agent-level containment**: When an isolated or sandboxed agent fails, the orchestrator immediately severs its communication channels, reclaims its execution slots, and marks it as Failed. No other agent receives notification of the failure unless it was directly waiting on the failed agent's output.

**Layer 2 -- Dependency-level containment**: The orchestrator identifies all agents that depend on the failed agent's output and notifies them with an `AgentDependencyFailed` event. Dependent agents are expected to handle this gracefully by falling back to alternative data sources or entering a degraded mode.

**Layer 3 -- System-level containment**: If the failure count across all agents exceeds `systemFailureThreshold` (default: 3 concurrent failures), the orchestrator triggers a system-wide containment protocol: all non-critical agents are paused, the message bus is throttled to critical-only messages, and the RuntimeRecoveryOrchestratorService is invoked.

The containment strategy is designed to be aggressive at the agent level (contain first, ask questions later) but conservative at the system level (invoke system-wide measures only when multiple concurrent failures suggest a systemic problem).

## Coordination Graph Structure

The orchestrator maintains a coordination graph that captures the runtime relationships between agents. The graph is a directed acyclic graph (DAG) where nodes represent agents and edges represent communication or dependency relationships.

Edges are added dynamically as agents interact: when agent A sends a message to agent B, a directed edge A->B is created (if not already present). When agent A delegates a task to agent B, a dependency edge A->B is created. Edges carry metadata including the type (communication or dependency), the creation timestamp, and a weight proportional to the interaction frequency.

The coordination graph serves several purposes:

- **Failure impact analysis**: When an agent fails, the graph identifies all downstream agents that may be affected.
- **Load balancing**: The graph reveals communication hotspots where a single agent receives disproportionate traffic.
- **Optimization**: The graph enables the orchestrator to suggest co-location of frequently communicating agents to reduce message latency.
- **Visualization**: The graph can be exported for dashboard rendering, providing operators with a real-time view of agent interactions.

The graph is pruned during maintenance to remove edges that have not been active for `edgeInactivityTimeoutMs` (default: 300000ms / 5 minutes). This prevents the graph from growing unboundedly and ensures it reflects current rather than historical interactions.
