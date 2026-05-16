# Real Vibecode — System Walkaround & Architecture Overview

> **10 Phases Complete | 20,769 LOC | 17 Singletons | 41 TypeScript Files | 55 Documentation Files**

---

## Executive Summary

Real Vibecode is a complete AI-native IDE architecture built on a VS Code fork. The system transforms a general-purpose code editor into an intelligent, autonomous development environment where AI agents can plan, execute, and verify software engineering tasks under strict safety controls.

The architecture is organized into **5 layers** — Foundation, Core Services, Autonomous Execution, Coordination & Intelligence, and Stabilization & Production — with each layer building on and constraining the layers below it.

---

## Layered Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│  LAYER 5: STABILIZATION & PRODUCTION (Phase 10)                        │
│  Load Control · Backpressure · Throttling · Failure Containment        │
│  Stability FSM · Determinism · Ordering · Memory · Diagnostics         │
├─────────────────────────────────────────────────────────────────────────┤
│  LAYER 4: COORDINATION & INTELLIGENCE (Phase 9)                        │
│  Global Brain · Intent Model · Event Bus · Decision Engine             │
│  Conflict Resolution · Sync · Health · Coherence                       │
├─────────────────────────────────────────────────────────────────────────┤
│  LAYER 3: AUTONOMOUS EXECUTION (Phases 7-8)                            │
│  Agent Orchestration · Process Orchestration                            │
├─────────────────────────────────────────────────────────────────────────┤
│  LAYER 2: CORE SERVICES (Phases 5-6)                                   │
│  Unified State · Observability · Bootstrap · Context Engine             │
├─────────────────────────────────────────────────────────────────────────┤
│  LAYER 1: FOUNDATION (Phases 1-4)                                      │
│  Execution Kernel · Mutation Control · Execution Graph · Branding      │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Phase-by-Phase Breakdown

### Phase 1: AI Execution Kernel (~Foundation)
**Commit:** `41c9360`

The foundational layer that establishes the core execution service, VS Code dependency injection binding, and workspace integration hook points. This phase performed codebase discovery to identify the correct injection points in the VS Code monorepo and established the `aiExecution` service directory structure.

**Key Deliverables:**
- `IAIExecutionService` interface and DI decorator via `createDecorator<IAIExecutionService>()`
- Service registration in `aiExecution.contribution.ts`
- Side-effect import in `workbench.common.main.ts`
- Full codebase mapping of VS Code's extension host, workbench services, and editor pipeline

---

### Phase 2: Authoritative File Mutation Control (~845 LOC)
**Commit:** `1076de6`

Every AI edit in the workspace routes through a controlled pipeline. This is the **authoritative gateway** — no mutation bypasses the policy check, graph node creation, state propagation, and history recording stages. Bypass tokens provide controlled recursion safety for internal operations (e.g., formatters running during an AI edit).

**Mutation Pipeline:**
```
Request → Policy Check → Graph Node Creation → State Propagation → Editor Apply → Graph Node Completion → History Record → UI Notify
```

**Key Interfaces:**
- `IAIExecutionService` — the authoritative gateway
- `IAIMutationContext` — source, reason, intent reference, bypass token
- `IAIFileEdit` — URI, content, range, checksum (FNV-1a)
- `IAIMutationPolicy` — pluggable policy with Allow/Deny/RequireApproval
- `AIMutationBypassToken` — controlled recursion escape hatch

**Key Enums:**
- `AIMutationSource`: UserTyping, UserAction, AIAgent, WorkspaceEdit, SaveParticipant, Extension, UndoRedo, AIInternal, Unknown
- `AIMutationPolicyResult`: Allow, Deny, RequireApproval

---

### Phase 3: Execution Graph Engine (~1,236 LOC)
**Commit:** `61e84d4`

A causal execution DAG that tracks ALL meaningful workspace operations. Decoupled from AIExecutionService — any service can create nodes and edges. The graph provides full traceability, lineage queries, chain traversal, and rollback metadata for every operation.

**Key Capabilities:**
- 10 node types (FileEdit, WorkspaceEdit, Save, Formatter, Refactor, AiAction, SystemAction, TerminalExecution, CodeAction, Snippet)
- 5 edge types (CausedBy, Triggered, Parent, RollbackOf, DerivedFrom)
- Cycle prevention via BFS before edge creation
- Scope management (File, Workspace, Global)
- Query API: lineage, chains, file history, rollback chains
- JSONL persistence with periodic flush
- Memory pruning with configurable thresholds

**Key Interfaces:**
- `IExecutionGraphService` — CRUD, query, persistence, pruning
- `IExecutionNode` — id, type, timestamp, status, metadata, scope
- `IExecutionEdge` — edgeSource, target, type, metadata
- `IExecutionScope` — hierarchical scope management
- `RollbackStrategy`: Irreversible, InverseEdit, SnapshotRestore, CustomUndo, EditorUndo

---

### Phase 4: Product Identity + Branding Migration
**Commit:** `3241b2f`

Transforms the VS Code fork into a standalone AI IDE. Product identity migration covering `product.json`, `package.json`, branding assets, and all user-facing strings.

---

### Phase 5: End-to-End Product Integration & Launch Readiness (~2,208 LOC)
**Commit:** `117f893`

Consolidates four major subsystems into a coherent integration layer:

#### 5a. Unified State Service
- `IAIUnifiedStateService` — 7-phase FSM (Uninitialized → Hydrating → GraphPending → Ready → Executing → ShuttingDown → Disposed)
- Synchronous event propagation, execution stack depth tracking, consistency validation
- Phase-gated: no operation can execute before Ready state

#### 5b. Execution UI Service
- `IAIExecutionUIService` — timeline with scope grouping, status bar indicator, mutation previews
- Navigation to entries and diffs, activity indicators

#### 5c. Observability Service
- `IObservabilityService` — 10K ring buffer trace log, 8-stage mutation pipeline inspector
- Graph traversal debugger (BFS/DFS), AI decision trace log, diagnostics report generation
- `TraceCategory`: Execution, Mutation, Graph, State, Policy, Persistence, Bootstrap, UI, Performance
- `MutationPipelineStage`: Received → PolicyCheck → GraphNodeCreation → EditorApply → GraphNodeCompletion → HistoryRecord → Complete/Failed

#### 5d. Workspace Bootstrap Service
- `IWorkspaceBootstrapService` — 6-step deterministic initialization sequence
- Crash recovery for pending graph nodes
- Phase-gated validation at each step

---

### Phase 6: AI Context Engine (~2,585 LOC)
**Commit:** `9b1a546`

A continuously evolving structured understanding of workspace state across 7 context domains with domain-specific freshness models.

**7 Context Domains:**
1. **Workspace** — project structure, open files, active editor
2. **File** — per-file context with change tracking
3. **Symbol** — functions, classes, interfaces, variables with type info
4. **Dependency** — import/export relationships, co-modification tracking
5. **Execution** — recent execution history, mutation hotspots
6. **Mutation** — hotspot detection, execution clusters
7. **Temporal** — project memory over time, execution patterns

**Key Services:**
- `IAIContextService` — 7-domain context management, query API for AI agents
- `ISymbolDependencyAnalyzer` — incremental symbol analysis, dependency maps
- `IContextPersistenceService` — context persistence across sessions
- `IAIContextUIService` — context visualization

**Freshness Model:** Live → Recent → Stale → Outdated
**Invalidation Strategies:** Never, OnFileChange, OnSave, TimeBased, OnDependencyChange, OnExecutionEvent

---

### Phase 7: Agent Orchestration System (~3,542 LOC)
**Commit:** `ad9983b`

A runtime execution orchestration system for autonomous software workflows. Agents operate through execution plans — never direct mutation.

**Agent Lifecycle (8 States):**
Idle → Planning → Executing → Waiting → Suspended → Completed / Failed / Cancelled

**Key Capabilities:**
- **Execution Plans**: Goal → Plan → Steps → Actions → AIExecutionService
- **Capability System**: 9 capabilities (FileRead, FileEdit, WorkspaceEdit, TerminalExecution, etc.) with risk levels (Low/Medium/High/Critical)
- **Approval Gates**: 4 levels (Automatic, AskOnce, AskPerStep, ManualReview)
- **Watchdog + Loop Detection**: prevents infinite agent loops
- **Execution Quotas**: max file modifications, max steps, max duration, max retries, protected files/directories
- **Interrupt/Recovery**: checkpoint-based recovery with step rollback
- **Agent UI**: activity panel, plan visualization, approval queue, suspended tasks

**Key Services:**
- `IAgentOrchestratorService` — lifecycle management, plan execution, capability validation
- `IAgentUIService` — read-only UI projections

---

### Phase 8: Terminal + Process Orchestration (~2,744 LOC)
**Commit:** `ffcff9e`

A policy-controlled execution environment for terminal processes, builds, tests, dev servers, and AI-driven command workflows.

**5 Execution Modes:**
Foreground, Background, Supervised, Ephemeral, PersistentSession

**Key Capabilities:**
- **Policy Engine**: risk scoring, policy evaluation (Allow/Deny/RequireApproval/Sandbox/Escalate)
- **Terminal Intelligence**: output classification (Info/Warning/Error/BuildOutput/TestResult/StackTrace/PackageManager/DevServer/Progress/Success)
- **Process Supervision**: heartbeat tracking, unresponsive detection
- **Recovery + Checkpointing**: restart policies (NonZeroExit/Crash/OomKill/Unresponsive/Any)
- **Process Groups**: logical grouping with shared lifecycle
- **Safety + Isolation**: watchdog, zombie cleanup, quotas, unsafe pattern detection

**Key Services:**
- `IAIProcessOrchestratorService` — session management, policy enforcement, supervision
- `IAIProcessUIService` — terminal visualization, output panels

---

### Phase 9: Global Execution Brain (~3,619 LOC)
**Commit:** `64c81f8`

The coordination layer that binds all systems into one unified intelligence loop. Does NOT execute actions — coordinates, arbitrates, and synchronizes.

**9 Core Subsystems:**
1. **Brain Service** — singleton coordinator, lifecycle management
2. **Intent Model** — 9 action types, 5 priorities, 5 scopes, 9 resolution states
3. **Cross-System Event Bus** — 10 categories, 8 sources, filtered subscriptions, 10K ring buffer
4. **Decision Engine** — 11 decision types, 5 arbitration rules, custom rule registration
5. **System Synchronization** — checkpoints, 3-axis drift detection, reconciliation
6. **Execution Loop** — 8-phase heartbeat (Idle → ContextAnalysis → AgentPlanning → ProcessExecution → GraphUpdate → StateSync → Observability → Paused)
7. **Conflict Resolution** — 10 conflict types, 4 severity levels, 8 strategies
8. **Health Monitor** — 12 metrics, 5 statuses (Healthy/Stressed/Overloaded/Failure/Recovery)
9. **Coherence Validation** — 8 check types, 7 repair actions

**Key Services:**
- `IGlobalExecutionBrainService` — the coordinator
- `IBrainDashboardService` — read-only dashboard views

---

### Phase 10: System Stabilization & Production Coherence (~2,467 LOC)
**Commit:** `55cd6e8`

Transforms the system from "architecturally complete" to "runtime stable under real-world continuous usage." **Core rule: NO new subsystems — ONLY stabilize, optimize, constrain, harden, and simplify.**

**10 Stabilization Tasks:**
1. **SystemLoadControllerService** — CPU pressure, event bus saturation, graph mutation rate, agent/process concurrency
2. **Backpressure System** — across 6 subsystems (EventBus, Graph, Execution, Agent, Process, Context); queue-when-overloaded, pause-when-critical, gradual-resume
3. **Execution Throttling Policy** — dynamic max concurrent agents, max process exec/min, max graph mutations/sec, adaptive thresholds, safety ceilings, emergency mode
4. **Failure Cascade Prevention** — isolation boundaries (Agent/Process/Graph/Context/Mutation/UI), containment zones, subsystem quarantine, degradation paths
5. **System Stability State Machine** — Stable → Degraded → Throttled → Critical → Recovery with allowed behavior per state
6. **Deterministic Execution Guarantee** — same input → same outcome, idempotency enforcement, no double execution, race-condition protection
7. **Global Execution Ordering** — Safety(0) > SystemStability(1) > ActiveIntents(2) > AgentExecution(3) > ProcessExecution(4) > GraphUpdates(5) > ContextUpdates(6) > Observability(7)
8. **Memory Pressure Control** — graph pruning thresholds, context eviction, agent history trimming, process log rotation, event bus memory caps
9. **Self-Diagnostic Loop** — checks: execution lag, stuck intents, orphan agents, zombie processes, graph drift, context staleness; auto-recover/degrade/restart
10. **Production Readiness Mode** — toggle that disables verbose observability, reduces graph verbosity, limits debug events, enforces strict throttling

**Key Enums:**
- `SystemStabilityState`: Stable, Degraded, Throttled, Critical, Recovery
- `BackpressureLevel`: None, Light, Medium, Heavy, Full
- `ExecutionPriorityTier`: 8 tiers from Safety to Observability
- `MemoryPressureLevel`: Normal, Elevated, High, Critical
- `DiagnosticCheckType`: ExecutionLag, StuckIntents, OrphanAgents, ZombieProcesses, GraphDrift, ContextStaleness

---

## Service Registry (17 DI Singletons)

| # | Decorator | Interface | Phase | Layer |
|---|-----------|-----------|-------|-------|
| 1 | `observabilityService` | IObservabilityService | P5 | Core |
| 2 | `executionGraphService` | IExecutionGraphService | P3 | Foundation |
| 3 | `aiUnifiedStateService` | IAIUnifiedStateService | P5 | Core |
| 4 | `aiExecutionService` | IAIExecutionService | P1/P2 | Foundation |
| 5 | `aiExecutionUIService` | IAIExecutionUIService | P5 | Core |
| 6 | `workspaceBootstrapService` | IWorkspaceBootstrapService | P5 | Core |
| 7 | `symbolDependencyAnalyzer` | ISymbolDependencyAnalyzer | P6 | Core |
| 8 | `aiContextService` | IAIContextService | P6 | Core |
| 9 | `contextPersistenceService` | IContextPersistenceService | P6 | Core |
| 10 | `aiContextUIService` | IAIContextUIService | P6 | Core |
| 11 | `agentOrchestratorService` | IAgentOrchestratorService | P7 | Orchestration |
| 12 | `agentUIService` | IAgentUIService | P7 | Orchestration |
| 13 | `aiProcessOrchestratorService` | IAIProcessOrchestratorService | P8 | Orchestration |
| 14 | `aiProcessUIService` | IAIProcessUIService | P8 | Orchestration |
| 15 | `globalExecutionBrainService` | IGlobalExecutionBrainService | P9 | Brain |
| 16 | `brainDashboardService` | IBrainDashboardService | P9 | Brain |
| 17 | `systemStabilizationService` | ISystemStabilizationService | P10 | Stabilization |

---

## Architectural Patterns

1. **Authoritative Gateway**: All mutations MUST route through `AIExecutionService`. No bypass except controlled bypass tokens with stack-depth guards.

2. **Causal DAG**: Every operation becomes a graph node with typed edges. Full traceability and rollback metadata for the entire execution history.

3. **Intent-Driven**: All actions traceable back to an `IIntent` with priority, scope, source, and constraint chain. The brain resolves conflicts by intent priority.

4. **Capability-Based Access**: Agents declare capabilities before execution. Policy validates against risk levels. No implicit access to any subsystem.

5. **Phase-Gated FSM**: 7-phase state machine enforces legal transitions. No operation can execute before the system reaches Ready state.

6. **Observability-First**: 8-stage mutation pipeline inspector + 10K ring buffer trace log. Every pipeline stage tracked with timestamps and metadata.

7. **Separation of UI**: UI services are read-only view model projections. All mutations go through backend services. Zero direct state mutation from UI layer.

8. **Stability Layer**: Outermost layer can throttle, quarantine, and degrade any subsystem independently. 5-state stability machine with automatic transitions.

---

## File Structure

```
src/vs/workbench/services/aiExecution/
├── common/                          # Pure interfaces & types
│   ├── aiExecutionService.ts        # IAIExecutionService, IAIMutationContext, IAIFileEdit
│   ├── aiUnifiedStateService.ts     # IAIUnifiedStateService, AIRuntimePhase
│   ├── executionGraphService.ts     # IExecutionGraphService, IExecutionNode, IExecutionEdge
│   ├── aiExecutionUI.ts             # IAIExecutionUIService, ITimelineEntry
│   ├── workspaceBootstrap.ts        # IWorkspaceBootstrapService
│   ├── observabilityService.ts      # IObservabilityService, ITraceEntry
│   ├── aiContextService.ts          # IAIContextService, 7 context domains
│   ├── contextPersistence.ts        # IContextPersistenceService
│   ├── symbolDependencyAnalyzer.ts  # ISymbolDependencyAnalyzer
│   ├── agentOrchestratorService.ts  # IAgentOrchestratorService, IAgent, IExecutionPlan
│   ├── agentUI.ts                   # IAgentUIService
│   ├── aiProcessOrchestratorService.ts # IAIProcessOrchestratorService, IProcessSession
│   ├── aiProcessUI.ts              # IAIProcessUIService
│   ├── globalExecutionBrain.ts      # IGlobalExecutionBrainService, IIntent, IBrainEvent
│   └── systemStabilization.ts       # ISystemStabilizationService, SystemStabilityState
│
├── browser/                         # Concrete implementations
│   ├── aiExecutionService.ts        # Mutation pipeline, policy engine, checksum tracking
│   ├── aiUnifiedStateService.ts     # 7-phase FSM, state propagation
│   ├── executionGraphService.ts     # Causal DAG, BFS cycle prevention, JSONL persistence
│   ├── aiExecutionUIService.ts      # Timeline, indicators, previews
│   ├── workspaceBootstrap.ts        # 6-step deterministic init
│   ├── observabilityService.ts      # Ring buffer, pipeline inspector, diagnostics
│   ├── persistenceIntegration.ts    # Save participant hook, BulkEdit interceptor
│   ├── aiContextService.ts          # 7-domain context management
│   ├── aiContextUIService.ts        # Context visualization
│   ├── contextPersistence.ts        # Context persistence
│   ├── symbolDependencyAnalyzer.ts  # Symbol analysis
│   ├── agentOrchestratorService.ts  # Agent lifecycle, plans, capabilities
│   ├── agentUIService.ts            # Agent UI projections
│   ├── aiProcessOrchestratorService.ts # Process supervision, policy engine
│   ├── aiProcessUIService.ts        # Process UI
│   ├── globalExecutionBrain.ts      # Brain coordinator, execution loop, conflict resolution
│   ├── brainDashboardService.ts     # Dashboard views
│   ├── systemStabilizationService.ts # Load control, backpressure, throttling, diagnostics
│   ├── aiExecution.contribution.ts  # DI registration for all 17 singletons
│   ├── phase5Validation.ts          # P5 tests (10/10)
│   ├── phase6Validation.ts          # P6 tests (10/10)
│   ├── phase7Validation.ts          # P7 tests (10/10)
│   ├── phase8Validation.ts          # P8 tests (10/10)
│   ├── phase9Validation.ts          # P9 tests (10/10)
│   └── phase10Validation.ts         # P10 tests (10/10)
```

---

## Documentation Structure

```
docs/
├── architecture/                    # 34 architecture docs
│   ├── ai-execution-kernel-phase1.md
│   ├── recursion-safety.md
│   ├── execution-graph.md
│   ├── causal-linking.md
│   ├── branding-migration.md
│   ├── product-identity.md
│   ├── ui-execution-layer.md
│   ├── end-to-end-runtime.md
│   ├── product-integration.md
│   ├── ai-context-engine.md
│   ├── workspace-intelligence.md
│   ├── dependency-analysis.md
│   ├── temporal-memory.md
│   ├── agent-runtime.md
│   ├── agent-recovery.md
│   ├── approval-system.md
│   ├── capability-system.md
│   ├── execution-plans.md
│   ├── execution-policies.md
│   ├── process-orchestration.md
│   ├── process-recovery.md
│   ├── process-supervision.md
│   ├── terminal-intelligence.md
│   ├── global-execution-brain.md
│   ├── intent-system.md
│   ├── system-coordination.md
│   ├── global-decision-engine.md
│   ├── system-stabilization.md
│   ├── load-control.md
│   ├── backpressure-system.md
│   ├── failure-prevention.md
│   └── production-mode.md
│
├── execution-logs/                  # 10 phase execution logs
│   ├── phase1-task1-codebase-discovery.md
│   ├── phase1-task2-implementation.md
│   ├── phase1-task3-injection-point.md
│   ├── phase1-task4-file-mutation-hook.md
│   ├── phase2-implementation.md
│   ├── phase3-graph-engine.md
│   ├── phase4-branding-migration.md
│   ├── phase5-integration.md
│   ├── phase6-context-engine.md
│   ├── phase7-agent-orchestration.md
│   ├── phase8-process-orchestration.md
│   ├── phase9-global-brain.md
│   └── phase10-stabilization.md
│
├── plans/
│   └── phase1-plan.md
│
└── test-reports/                    # 8 test validation reports
    ├── phase2-validation.md
    ├── phase3-graph-validation.md
    ├── phase4-branding-validation.md
    ├── phase5-system-validation.md
    ├── phase6-context-validation.md
    ├── phase7-agent-validation.md
    ├── phase8-process-validation.md
    ├── phase9-brain-validation.md
    └── phase10-stability-validation.md
```

---

## Data Flow Summary

```
User/AI Action
     │
     ▼
AIExecutionService (Authoritative Gateway)
     │
     ├── Policy Check (Allow/Deny/RequireApproval)
     ├── Graph Node Creation (ExecutionGraphService)
     ├── State Propagation (UnifiedStateService)
     ├── Editor Apply (VS Code APIs)
     ├── Graph Node Completion
     ├── History Record
     └── UI Notify (ExecutionUIService)
     
Meanwhile:
     AgentOrchestrator ──── creates execution plans ────► AIExecutionService
     ProcessOrchestrator ── runs commands with policies ─► AIExecutionService
     GlobalBrain ────────── coordinates all via intents ──► all services
     StabilizationService ─ gates/throttles all ─────────► all services
```

---

## Git History

| Hash | Description |
|------|-------------|
| `55cd6e8` | feat: Phase 10 — System Stabilization & Production Coherence Layer |
| `64c81f8` | feat: Phase 9 — Global Execution Brain (System Coordination Layer) |
| `ffcff9e` | feat: Phase 8 — Terminal + Process Orchestration System |
| `ad9983b` | feat: Phase 7 — Agent Orchestration System (Autonomous Execution Layer) |
| `9b1a546` | feat: Phase 6 — AI Context Engine (Workspace Intelligence Layer) |
| `117f893` | feat: Phase 5 — End-to-End Product Integration & Launch Readiness Layer |
| `3241b2f` | feat: Phase 4 — Product Identity + Branding Migration |
| `61e84d4` | feat: Phase 3 — Execution Graph Engine (Causal Runtime Layer) |
| `1076de6` | feat: Phase 2 — Authoritative File Mutation Control |
| `41c9360` | feat: Phase 1 — AI Execution Kernel foundation layer |
| `fe9055d` | Initial commit |
