# Cross-Phase Integration — Real Vibecode AI Execution Kernel

## Integration Map

### Layer 1: Execution Engine Core (Phases 1–8) → Layer 2: Brain (Phase 9)

**Connection: Valid ✅**

`IGlobalExecutionBrainService` depends on all Layer 1 services:
- `IAIExecutionService` — brain triggers execution actions
- `IExecutionGraphService` — brain reads/modifies execution graph
- `IAIUnifiedStateService` — brain checks/manages state
- `IObservabilityService` — brain emits traces
- `IAgentOrchestratorService` — brain delegates to agents
- `IAIProcessOrchestratorService` — brain delegates to processes
- `IAIContextService` — brain uses workspace context

The brain acts as the central coordinator, receiving intent from the user and routing it through the appropriate execution subsystems.

### Layer 2: Brain (Phase 9) → Layer 2: Stabilization (Phase 10)

**Connection: Valid ✅**

`ISystemStabilizationService` depends on:
- `IGlobalExecutionBrainService` — stabilization monitors brain health
- `IAgentOrchestratorService` — stabilization applies backpressure to agents
- `IAIProcessOrchestratorService` — stabilization throttles processes
- `IExecutionGraphService` — stabilization checks graph consistency
- `IAIContextService` — stabilization considers context load
- `IObservabilityService` — stabilization emits diagnostic traces
- `IAIUnifiedStateService` — stabilization reads state

The stabilization layer wraps the brain, protecting it from overload scenarios.

### Layer 2: Brain + Stabilization → Layer 2: Replay (Phase 11)

**Connection: Valid ✅**

`IExecutionReplayService` depends on:
- `IGlobalExecutionBrainService` — replay traces brain decisions
- `IAgentOrchestratorService` — replay traces agent actions
- `IAIProcessOrchestratorService` — replay traces process executions
- `IExecutionGraphService` — replay reconstructs graph timeline
- `IAIContextService` — replay reconstructs context state
- `IObservabilityService` — replay uses trace data
- `IAIUnifiedStateService` — replay captures state snapshots
- `ISystemStabilizationService` — replay checks stability during simulation
- `IAIExecutionService` — replay can re-execute actions

The replay engine is the deepest service in the dependency chain (depth 8), touching every core subsystem.

### Layer 1–2 → Layer 3: Visual Governance (Phases 12–15)

**Connection: Weak ✅ (By Design)**

Phases 12–15 services are intentionally independent of the execution engine. They have NO dependency on any Phase 1–11 service. This is by design — visual governance should work even if the AI execution kernel is not active.

The only Phase 13 service with internal deps is `IUXConsistencyService` (depends on `ICognitiveLoadService`, `IAIPresenceService`, `IPanelHierarchyService` — all Phase 13).

The only Phase 14 service with internal deps is `IAdaptiveExperienceValidationService` (depends on 7 other Phase 14 services).

**Gap Identified:** There is no formal wiring between the execution engine and the visual layer. For example:
- `IFlowStateService` (Phase 14) duplicates some concepts of `IWorkflowMomentumService` (Phase 16)
- `ICognitiveLoadService` (Phase 13) is separate from `ICognitiveRecoveryService` (Phase 16)
- `IAttentionOrchestratorService` (Phase 13) overlaps with `IInterruptionIntelligenceService` (Phase 16)

These are NOT bugs — they represent different abstraction levels. Phase 13–14 focus on visual/interaction concerns, while Phase 16 focuses on workflow/human concerns. Integration would be a future enhancement.

### Layer 3 → Layer 4: Human Workflow Intelligence (Phase 16)

**Connection: Weak ✅ (By Design)**

Phase 16 services have NO dependency on any earlier phase service. They are self-contained workflow intelligence services. This allows the human workflow layer to be added/removed without affecting the core execution engine or visual governance.

**Gap Identified:** No formal bridge between:
- `IWorkflowMomentumService` (Phase 16) and `IFlowStateService` (Phase 14)
- `ICognitiveRecoveryService` (Phase 16) and `ICognitiveLoadService` (Phase 13)
- `IInterruptionIntelligenceService` (Phase 16) and `IAttentionOrchestratorService` (Phase 13)

These overlaps are intentional at the current architecture level — each operates at a different abstraction. Future integration could create adapter services.

## Workbench Contribution Integration

The contribution file registers 3 workbench contributions that serve as integration bridges:

### AIFileMutationHook

Bridges: `IAIExecutionService` ↔ `IExecutionGraphService` ↔ `IAIContextService`

On every file save:
1. Creates an execution graph node (if AI bypass: AI-initiated; otherwise: user-initiated)
2. Links to parent execution if in active mutation context
3. Notifies context engine of file modification
4. Reports progress to VS Code

### AIBulkEditInterceptor

Bridges: `IAIExecutionService` ↔ `IExecutionGraphService`

Intercepts bulk edit operations for AI execution tracking. Currently registered but minimal implementation.

### AIBootstrapRunner

Bridges: `IWorkspaceBootstrapService` ↔ `IAIUnifiedStateService`

Orchestrates the kernel startup sequence, ensuring all core services initialize in correct order.

## Integration Health

| Connection | Status | Notes |
|-----------|--------|-------|
| Execution → Graph | ✅ Strong | Direct dependency |
| Graph → State | ✅ Strong | Direct dependency |
| State → Observability | ✅ Strong | Direct dependency |
| Execution → Context | ✅ Strong | Via FileMutationHook |
| Execution → Agent | ✅ Strong | Direct dependency |
| Agent → Process | ✅ Strong | Direct dependency |
| Brain → All Subsystems | ✅ Strong | Direct dependency on 7 services |
| Stabilization → Brain | ✅ Strong | Direct dependency |
| Replay → All | ✅ Strong | Deepest dependency chain |
| Visual → Execution | ⚠️ Weak | No direct dependency (by design) |
| Human → Execution | ⚠️ Weak | No direct dependency (by design) |
| Human → Visual | ⚠️ Weak | No direct dependency (by design) |
