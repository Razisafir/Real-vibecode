# Observability Gaps

**Phase 22 -- Reality Validation, Execution Truth & Production Convergence**
**Date: 2025-03-04**
**Classification: BRUTALLY HONEST -- Not for external distribution**

---

## Current State: Observability Coverage ~33%

The system's observability coverage is approximately 33% of execution paths. This means that for roughly two-thirds of the things the system does, there is no way to know what happened, why it happened, or whether it happened correctly.

This is not a minor gap. In a production system, unobservable execution paths are unmanageable execution paths. You cannot debug what you cannot see. You cannot optimize what you cannot measure. You cannot trust what you cannot verify.

---

## Which Services Are Observable

### Core Execution Services (18 services) -- Observability: GOOD

The core execution services have real observability:

1. **ExecutionGraphService** -- Emits events for node creation, dependency resolution, execution start/complete, and graph modification. Trace context is propagated through execution. This is genuinely well-instrumented.

2. **ExecutionPlanService** -- Emits events for plan creation, validation, and lifecycle transitions. Plan execution is traceable from creation to completion.

3. **RuntimeKernelService** -- Emits tick events with timing information. Kernel state transitions are observable. This is adequate.

4. **ObservabilityService** -- Inherently observable (it IS the observability). Emits metrics about its own collection rates, buffer sizes, and sampling decisions.

5. **AgentCapabilityService** -- Emits events for capability registration, lookup, and invocation. Capability resolution is traceable.

6. **ContextEngineService** -- Emits events for context assembly start/complete. Context sources are logged. Assembly timing is measured.

7. **StateManagerService** -- Emits events for state changes. State transitions are observable. This is one of the best-instrumented services.

8. **EventBusService** -- Emits events for event publication (meta-observability). Subscriber errors are caught and logged. Dispatch timing is measured.

9. **ConfigurationManagerService** -- Emits events for configuration changes. Configuration reads are logged at debug level.

10. **PersistenceService** -- Emits events for persist and restore operations. Serialization timing is measured.

11. **ReplayEngineService** -- Emits events for recording start/stop, replay start/complete. Replay fidelity metrics are available.

12. **ProcessSupervisorService** -- Emits events for process lifecycle transitions. Process state changes are observable.

13. **DependencyAnalysisService** -- Emits events for dependency graph modifications. Cycle detection results are logged.

14. **MutationRoutingService** -- Emits events for file mutation requests and completions. Mutation timing is measured.

15. **ApprovalService** -- Emits events for approval request, response, and timeout. Approval flow is fully traceable.

16. **LoadControlService** -- Emits events for backpressure activation and deactivation. Queue depth is reported.

17. **RecoveryCoordinatorService** -- Emits events for failure detection and recovery execution. Recovery outcomes are logged.

18. **HealthCheckService** -- Emits events for health check execution and results. Health transitions are observable.

### What Makes These Observable

- They emit structured events to the EventBusService
- They propagate trace context across async boundaries
- They measure timing for key operations
- They log state transitions
- They report metrics to the ObservabilityService
- They can be queried for current state

---

## Which Services Are Unobservable

### UX Services (30 services) -- Observability: NEAR ZERO

Most UX services emit no events, report no metrics, and provide no query capability:

- **ExperienceStateSurfacesService:** No events. No metrics. Cannot query what surfaces are active.
- **AdaptiveInterfaceService:** No events. No metrics. Cannot query what adaptations have been applied.
- **SurfaceMaterialsService:** No events. No metrics. Cannot query what materials are in use.
- **ContextualMinimalismService:** No events. No metrics. Cannot query what has been minimized.
- **PremiumInteractionsService:** No events. No metrics. Cannot query what interactions are "premium."
- **FeatureFatigueService:** No events. No metrics. Cannot query fatigue state.
- **PanelHierarchyService:** No events. No metrics. Cannot query panel layout.
- **SignatureProductFeelService:** No events. No metrics. Cannot query "feel" state.
- **CinematicMotionService:** No events. No metrics. Cannot query animation state.
- **EmotionalFrictionService:** Emits events for friction score changes, but the score is trivial (error rate). Observable but not meaningful.

The UX services are a black box. You cannot observe what they do because, in most cases, they do not do anything observable. They compute values that are consumed by the UI layer, but the computation and consumption are invisible to the observability pipeline.

### Workflow Services (8 services) -- Observability: MINIMAL

- **WorkRhythmLearningService:** Emits events when "patterns" are detected. But the patterns are trivial, so the events are noise.
- **WorkflowMomentumService:** Emits events for momentum changes. Momentum is a counter, so the events are counter increments.
- **SessionContinuityService:** Emits events for session save/restore. This is the most observable workflow service.
- **InterruptionIntelligenceService:** Emits events for interruption detection. Detection is a timer, so the events are timer ticks.
- **IntentPersistenceService:** Emits events for intent persistence. What intent? The service persists strings.

### Coherence Services (6 services) -- Observability: SELF-REFERENTIAL

- The coherence services emit events about coherence validation results. But the results are always "coherent" because the invariants are self-defined. The events are observable but meaningless.

### Consciousness Services (4 services) -- Observability: MISLEADING

- The consciousness services emit events for state transitions. The states ("dormant," "aware," "engaged") are observable. But the states have no semantic meaning. Observing them tells you nothing useful about the system.

### Distributed Execution Services (3 services) -- Observability: FABRICATED

- The distributed execution services emit events claiming that execution was distributed. But no distribution occurs. The observability is fabricated -- it reports on actions that did not happen.

---

## Hidden State Mutations

### The Problem

Some services modify shared state without emitting events. This means the state changes are invisible to the observability pipeline and cannot be traced, debugged, or audited.

### Known Offenders

1. **CoherenceEngineService** -- Modifies system coherence state without emitting state change events. The coherence status changes, but no one is notified.

2. **GlobalDecisionEngineService** -- Makes "decisions" that affect routing, but the decision logic does not emit events. The routing changes, but the reason is invisible.

3. **AutonomousEvolutionService** -- "Evolves" configuration, but the evolution does not emit events. The configuration changes, but the cause is invisible.

4. **SystemIntentAlignmentService** -- Adjusts system behavior based on "intent alignment," but the alignment calculations do not emit events. The behavior changes, but the reason is invisible.

5. **AdaptiveInterfaceService** -- "Adapts" the interface, but the adaptation logic does not emit events. The interface changes, but the adaptation is invisible.

6. **TemporalMemoryService** -- Stores temporal data without emitting storage events. The data exists, but its provenance is invisible.

7. **LayerSynchronizationService** -- Synchronizes layers without emitting synchronization events. The layers are synchronized, but the synchronization is invisible.

### Why This Matters

Hidden state mutations create three problems:

1. **Debugging is impossible.** When the system behaves unexpectedly, you cannot trace the cause because the cause did not emit an event.

2. **Auditing is impossible.** You cannot reconstruct what the system did because some actions left no trace.

3. **Testing is incomplete.** You cannot verify that a service behaves correctly because you cannot observe its side effects.

---

## Missing Telemetry

### Services That Emit No Metrics

At least 70+ services emit no metrics whatsoever. They have no performance counters, no operation counts, no error counts, no latency measurements. They are invisible to the metrics pipeline.

### What This Means

- You cannot measure the performance of 70+ services
- You cannot detect degradation in 70+ services
- You cannot set alerts for 70+ services
- You cannot compare the performance of 70+ services across versions
- You cannot capacity-plan for 70+ services

### The Metric Desert

The observability dashboard shows metrics for the 18 core services. For the other 91 services, the dashboard shows nothing -- not zero, not "no data," but nothing. The services simply do not appear in the metrics system.

This creates a false sense of coverage. The dashboard looks comprehensive because it shows 18 services of detailed metrics. But it covers only 16.5% of the registered services. The remaining 83.5% is a metric desert.

---

## Critical Paths That Cannot Be Traced End-to-End

### Path 1: User Action to AI Response

**What should happen:**

1. User types a request
2. Request is routed to the execution engine
3. Execution engine creates a plan
4. Plan nodes are dispatched to capabilities
5. Capabilities invoke AI services
6. AI responses are collected
7. Responses are applied to the workspace
8. User sees the result

**What can be traced:**

Steps 2-6 are observable through the core execution services. Steps 1 and 8 are outside the observability pipeline (they are UI events). Step 7 may or may not be observable, depending on which service applies the mutation.

**Gap:** The complete path from user keystroke to visible result cannot be traced. The trace breaks at the UI boundary and at the mutation application boundary.

### Path 2: Error Detection to Recovery

**What should happen:**

1. A service fails
2. Failure is detected by health monitoring
3. Failure is reported to the recovery coordinator
4. Recovery coordinator creates a recovery plan
5. Recovery plan is executed
6. System returns to healthy state

**What can be traced:**

Step 1 may or may not be observable (depends on whether the service emits error events). Step 2 is observable if health monitoring detects the failure (but it relies on self-reported health). Steps 3-5 are observable through the recovery coordinator. Step 6 is observable through health monitoring.

**Gap:** The path breaks at step 1-2. If a service does not emit error events, and health monitoring relies on self-reported health, then a failure may not be detected at all. The system may be in a failed state without knowing it.

### Path 3: Configuration Change to Behavioral Change

**What should happen:**

1. User changes a configuration value
2. Configuration service emits a change event
3. Relevant services update their behavior
4. System behavior changes accordingly

**What can be traced:**

Step 2 is observable through the configuration service. Steps 3 and 4 are not observable in most cases. Services that consume configuration changes do not emit events when they reconfigure themselves.

**Gap:** You can observe that a configuration changed, but you cannot observe whether the change had any effect. The system may ignore the configuration change, or the change may have unexpected side effects, and you would not know.

---

## What Needs Fixing

### Priority 1: Add Telemetry to Every Service That Touches Execution

Any service that participates in execution (plan creation, node dispatch, capability invocation, state mutation, error handling, recovery) must emit:

- **Operation start/complete events** with timing
- **Error events** with full context
- **State change events** for any mutable state
- **Dependency interaction events** for cross-service calls

This is approximately 30 services (the core 18 plus a dozen that touch execution but are not in the core).

### Priority 2: Eliminate Hidden State Mutations

Every service that modifies shared state must emit a state change event. No exceptions. If a service cannot afford to emit an event (performance concern), it should not be modifying shared state.

This requires auditing all 109 services for state modifications that bypass the event system.

### Priority 3: Add Trace Propagation Across Service Boundaries

The core execution services propagate trace context. Most other services do not. When execution crosses from a core service to a non-core service, the trace is lost.

Trace propagation must be added to all services that participate in execution paths. This is not optional for production -- without trace propagation, you cannot debug cross-service failures.

### Priority 4: Add Metrics to High-Afferent-Coupling Services

The 5 services with the highest afferent coupling (ExecutionGraphService, ObservabilityService, EventBusService, StateManagerService, ConfigurationManagerService) must have comprehensive metrics:

- Operation counts (per method)
- Latency percentiles (p50, p95, p99)
- Error rates (per error type)
- Resource usage (memory, queue depth)
- Saturation metrics (how close to capacity)

These services are critical infrastructure. They must be observable at the level that critical infrastructure demands.

### Priority 5: Remove Fabricated Observability

Services that emit events claiming actions that did not occur (distributed execution, autonomous evolution, consciousness transitions) must either:

- Be removed (preferred -- see architectural-reduction.md)
- Be rewritten to emit honest events ("simulation executed" rather than "distributed execution completed")
- Be silenced (stop emitting misleading events)

Fabricated observability is worse than no observability. It creates false confidence and wastes investigation time.

---

## Traceability Gaps

### Cannot Trace From User Action to AI Response Through All 109 Services

The fundamental traceability gap is that the system cannot trace a request from origin to destination through all participating services. The trace breaks at multiple points:

1. **UI -> Service boundary:** UI events (keystrokes, clicks) are not correlated with service events (plan creation, capability invocation). You cannot link "user pressed Enter" to "execution plan #47 was created."

2. **Service -> Service boundary:** While core services propagate trace context, non-core services do not. When execution crosses from ExecutionGraphService to, say, AdaptiveInterfaceService, the trace context is lost.

3. **Service -> AI boundary:** AI service calls are observable (the capability invocation is logged), but the AI service's internal processing is not. You cannot trace what the AI did with the request, only that the request was made.

4. **AI -> Service boundary:** AI responses are collected by the capability system, but the response processing (parsing, validation, application) may not emit events. You cannot trace how the AI response became a workspace mutation.

5. **Service -> Workspace boundary:** Workspace mutations are observable if they go through MutationRoutingService, but not all mutations do. You cannot trace all changes back to their origin.

### What End-to-End Tracing Requires

1. **Correlation IDs** from UI event to workspace mutation
2. **Trace context propagation** across all service boundaries
3. **Event emission** at every state transition
4. **AI response tracking** from request to application
5. **Mutation tracking** from origin to workspace change

None of these exist comprehensively today.

---

## The Coverage Map

### Observable Execution Paths (33%)

```
User Input
    |
    v
[NOT OBSERVABLE] UI Event
    |
    v
ExecutionPlanService [OBSERVABLE]
    |
    v
ExecutionGraphService [OBSERVABLE]
    |
    v
RuntimeKernelService [OBSERVABLE]
    |
    v
AgentCapabilityService [OBSERVABLE]
    |
    v
ContextEngineService [OBSERVABLE]
    |
    v
[PARTIALLY OBSERVABLE] AI Service Call
    |
    v
[NOT OBSERVABLE] AI Service Internal
    |
    v
[PARTIALLY OBSERVABLE] AI Response Processing
    |
    v
MutationRoutingService [OBSERVABLE]
    |
    v
StateManagerService [OBSERVABLE]
    |
    v
[NOT OBSERVABLE] Workspace Update
    |
    v
[NOT OBSERVABLE] UI Update
```

Approximately 33% of this path is observable. The remaining 67% is invisible to the observability pipeline.

---

## Recommendation

### Reduce Services, Add Real Telemetry to Remaining Ones

The observability problem is made worse by the number of services. With 109 services, achieving 100% observability coverage requires instrumenting 109 services. With 40 services, it requires instrumenting 40 services. The smaller number is achievable; the larger is not.

**The most effective observability improvement is service reduction.** Remove the services that produce no observable output, and you remove the services that need observability. Then add real telemetry to the services that remain.

### Specific Recommendations

1. **Reduce to 77 services** (per architectural-reduction.md). This eliminates 32 services that need no observability because they produce no value.

2. **Add telemetry to the remaining ~45 non-core services.** Focus on services that participate in execution paths.

3. **Eliminate fabricated observability.** Services that emit misleading events must be fixed or removed.

4. **Add correlation IDs.** Every user action should generate a correlation ID that propagates through all services involved in handling that action.

5. **Add trace context propagation.** Every service call must accept and forward trace context. This is non-negotiable for production.

6. **Add end-to-end trace verification.** An automated test that verifies a request can be traced from origin to destination through all participating services.

### Expected Outcome

After reduction and telemetry investment:

- **Coverage: 80%+** of execution paths observable
- **Traceability: End-to-end** for critical user paths
- **Fabricated events: 0** -- all events reflect real actions
- **Hidden mutations: 0** -- all state changes emit events
- **Metrics: 100%** of remaining services emit real metrics

---

## Conclusion

The observability gap is both a cause and a symptom of the system's over-architecture. Too many services make comprehensive observability impractical. Inadequate observability makes the system unmanageable at scale. The solution is to reduce the number of services and invest in deep observability for those that remain.

The core services are well-observed. The observability infrastructure (ObservabilityService, EventBusService) is genuinely good. The problem is that 70+ services are invisible -- they execute but cannot be seen. In production, invisible services are unreliable services.

**Observability Coverage: 33%**
**Target Coverage (after reduction): 80%+**
**Critical Gap: End-to-end traceability does not exist**
**Priority: Reduce services, then observe the survivors**
