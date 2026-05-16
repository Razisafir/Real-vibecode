# Load Degradation Model

> **Service:** `ISystemDegradationModelService` (#71)
> **Phase:** 18 — System Stress Test, Consolidation & Real-World Simulation
> **Dependencies:** `ISystemStressSimulationService` (#70), `ICrossLayerSignalBus`, `IGlobalExecutionBrain`, all infrastructure services
> **Status:** Implemented

---

## 1. Purpose

The `ISystemDegradationModelService` defines and enforces how the Real-vibecode AI Execution System degrades under resource pressure. Rather than allowing uncontrolled failure cascades, this service implements a **graceful degradation model** that dictates which capabilities are shed first, which are preserved at all costs, and how the system recovers when pressure subsides.

This service transforms the system from one that *fails unpredictably* under load into one that *degrades predictably*, maintaining core functionality while sacrificing non-essential features in a controlled, documented manner.

### Core Principles

1. **Predictable Degradation:** The system's behavior under load must be deterministic and documented
2. **Core Preservation:** Essential services (execution, signal bus, context integrity) are preserved at the expense of non-essential services (visual polish, progressive animations)
3. **Recovery Planning:** Every degradation action has a corresponding recovery plan
4. **Transparency:** The user is informed when the system is operating in a degraded mode
5. **Reversibility:** All degradation actions are reversible when resource pressure decreases

---

## 2. Degradation Levels

### 2.1 DegradationLevel Enum

```typescript
enum DegradationLevel {
  None         = 'none',        // System operating at full capacity
  Minimal      = 'minimal',     // Non-essential visual features reduced
  Moderate     = 'moderate',    // Some features disabled, core intact
  Significant  = 'significant', // Multiple features disabled, core preserved
  Severe       = 'severe',      // Core features limited, emergency mode
  Critical     = 'critical'     // Minimal operation, data integrity only
}
```

### 2.2 Level Transition Rules

```
None → Minimal:    Automatic when any resource exceeds 70% capacity
Minimal → Moderate: Automatic when any resource exceeds 80% capacity
Moderate → Significant: Automatic when any resource exceeds 90% capacity
Significant → Severe:  Automatic when any resource exceeds 95% capacity
Severe → Critical:     Automatic when any resource exceeds 98% capacity
```

**Recovery transitions** use a hysteresis band to prevent oscillation:

```
Critical → Severe:     Resource drops below 93% for 30 seconds
Severe → Significant:  Resource drops below 88% for 30 seconds
Significant → Moderate: Resource drops below 85% for 30 seconds
Moderate → Minimal:    Resource drops below 75% for 30 seconds
Minimal → None:        Resource drops below 65% for 30 seconds
```

---

## 3. Resource Pressure Types

The degradation model responds to seven distinct resource pressure types, each with specific degradation rules.

### 3.1 CPU Pressure

| Degradation Level | Action | Services Affected |
|---|---|---|
| Minimal | Reduce animation frame rate from 60fps to 30fps | CinematicMotion, VisualPolish |
| Moderate | Disable non-essential background analysis | WorkspaceIntelligence, TemporalMemory indexing |
| Significant | Throttle agent spawning rate (max 2/sec) | AgentOrchestrator, ProcessSupervisor |
| Severe | Suspend all proactive AI suggestions | GlobalBrain, ContextEngine proactive analysis |
| Critical | Reduce execution to single-threaded sequential mode | GlobalExecutionBrain, ExecutionGraph |

**Recovery Plan:**
1. Re-enable proactive AI suggestions (Severe → Significant)
2. Increase agent spawning rate incrementally (Significant → Moderate)
3. Resume background analysis at reduced frequency (Moderate → Minimal)
4. Restore full animation frame rate (Minimal → None)

---

### 3.2 Memory Pressure

| Degradation Level | Action | Services Affected |
|---|---|---|
| Minimal | Evict oldest replay snapshots from cache | DeterministicReplayEngine |
| Moderate | Reduce context window size by 30% | ContextEngine, AIContextEngine |
| Significant | Disable session continuity caching | SessionContinuity, WorkspaceMemory |
| Severe | Terminate non-essential agent instances | AgentRuntime (non-critical agents only) |
| Critical | Emergency garbage collection, force-evict all caches | All caching services |

**Recovery Plan:**
1. Re-enable session continuity with fresh cache (Severe → Significant)
2. Restore context window to full size gradually (Significant → Moderate)
3. Re-enable replay snapshot caching (Moderate → Minimal)
4. Full cache restoration (Minimal → None)

---

### 3.3 EventStorm Pressure

| Degradation Level | Action | Services Affected |
|---|---|---|
| Minimal | Batch UI updates (accumulate 50ms of changes before rendering) | ExperienceStateSurface, SurfaceMaterial |
| Moderate | Throttle non-critical signal subscribers | All signal consumers |
| Significant | Activate event normalization with aggressive deduplication | GlobalEventNormalization |
| Severe | Suspend event replay recording | DeterministicReplayEngine |
| Critical | Signal bus emergency mode: only priority-0 signals delivered | CrossLayerSignalBus |

**Signal Priority Classes:**
- **P0 (Always Delivered):** Execution completion, error signals, human input signals
- **P1 (Delivered in Severe+):** Context change signals, agent lifecycle signals
- **P2 (Delivered in Moderate+):** UI state update signals, animation signals
- **P3 (Delivered in Minimal+):** Telemetry signals, debug signals, analytics

**Recovery Plan:**
1. Resume event replay recording (Severe → Significant)
2. Reduce deduplication aggressiveness (Significant → Moderate)
3. Restore all signal subscriber rates (Moderate → Minimal)
4. Disable UI batching, return to immediate updates (Minimal → None)

---

### 3.4 AgentExplosion Pressure

Triggered when the number of active agents exceeds system capacity.

| Degradation Level | Action | Services Affected |
|---|---|---|
| Minimal | Queue new agent spawn requests (max 5 concurrent) | AgentOrchestrator |
| Moderate | Terminate idle agents after 30s (instead of 5min) | AgentRuntime |
| Significant | Limit total active agents to 10 | AgentOrchestrator, ProcessSupervisor |
| Severe | Limit total active agents to 5, kill non-critical | AgentRuntime |
| Critical | Single-agent mode only (executing highest-priority intent) | GlobalExecutionBrain |

**Agent Priority Classification:**
- **Critical:** Agent executing current human intent
- **High:** Agent performing requested background task
- **Medium:** Agent performing proactive analysis
- **Low:** Agent performing optional optimization
- **Disposable:** Agent performing speculative work

**Recovery Plan:**
1. Allow up to 5 concurrent agents (Critical → Severe)
2. Allow up to 10 concurrent agents (Severe → Significant)
3. Restore idle timeout to 5 minutes (Significant → Moderate)
4. Remove spawn queue limit (Moderate → Minimal)
5. Full agent spawning restored (Minimal → None)

---

### 3.5 UIPanelOverload Pressure

Triggered when the number of active UI panels or panel update frequency exceeds rendering capacity.

| Degradation Level | Action | Services Affected |
|---|---|---|
| Minimal | Disable decorative animations and transitions | CinematicMotion, VisualPolish |
| Moderate | Collapse secondary panels to summary view | ProgressiveDisclosure, PanelHierarchy |
| Significant | Hide all panels except primary editor + 1 AI panel | ContextualMinimalism, LayoutArchitecture |
| Severe | Single-panel mode (editor only) | WorkbenchShell |
| Critical | Text-only mode (no syntax highlighting, no decorations) | EditorDominance |

**Recovery Plan:**
1. Re-enable syntax highlighting and basic decorations (Critical → Severe)
2. Show editor + 1 AI panel (Severe → Significant)
3. Expand secondary panels progressively (Significant → Moderate)
4. Re-enable animations at reduced frame rate (Moderate → Minimal)
5. Full visual restoration (Minimal → None)

---

### 3.6 SignalFlood Pressure

Triggered when signal bus throughput exceeds sustainable delivery rate.

| Degradation Level | Action | Services Affected |
|---|---|---|
| Minimal | Activate signal deduplication | GlobalEventNormalization |
| Moderate | Batch non-urgent signals (100ms windows) | CrossLayerSignalBus |
| Significant | Drop P3 signals, batch P2 signals | CrossLayerSignalBus |
| Severe | Drop P2+P3 signals, batch P1 signals | CrossLayerSignalBus |
| Critical | Emergency mode: only P0 signals, no batching needed | CrossLayerSignalBus |

**Recovery Plan:**
1. Restore P1 signal delivery (Critical → Severe)
2. Restore P2 signal delivery (Severe → Significant)
3. Disable signal batching (Significant → Moderate)
4. Disable signal deduplication (Moderate → Minimal)
5. Full signal bus restoration (Minimal → None)

---

### 3.7 ContextExplosion Pressure

Triggered when context size exceeds memory or processing capacity.

| Degradation Level | Action | Services Affected |
|---|---|---|
| Minimal | Summarize old context entries instead of preserving verbatim | ContextEngine, ContextMerger |
| Moderate | Evict context entries older than 30 minutes | ContextEngine |
| Significant | Reduce context window to last 10 minutes | AIContextEngine |
| Severe | Reduce context window to last 2 minutes, critical-only | AIContextEngine, WorkspaceMemory |
| Critical | Context reset: only current intent context preserved | ContextEngine |

**Context Priority Classification:**
- **Essential:** Current execution intent, active error state
- **Important:** Recent 5 minutes of context, active agent state
- **Useful:** Session metadata, workspace structure
- **Expendable:** Historical analysis, old suggestions, debug traces

**Recovery Plan:**
1. Restore 2-minute context window (Critical → Severe)
2. Expand to 10-minute context window (Severe → Significant)
3. Restore 30-minute retention (Significant → Moderate)
4. Switch from summarization back to verbatim storage (Moderate → Minimal)
5. Full context restoration from workspace memory (Minimal → None)

---

## 4. Service Interface

```typescript
interface ISystemDegradationModelService {
  readonly _serviceBrand: undefined;

  /**
   * Get the current overall degradation level of the system.
   */
  getCurrentLevel(): DegradationLevel;

  /**
   * Get the degradation level for a specific resource pressure type.
   */
  getResourceLevel(resource: ResourcePressureType): DegradationLevel;

  /**
   * Get the active degradation actions currently in effect.
   */
  getActiveActions(): DegradationAction[];

  /**
   * Get the degradation rules for a specific resource type.
   */
  getDegradationRules(resource: ResourcePressureType): DegradationRuleSet;

  /**
   * Get the recovery plan from the current degradation state.
   */
  getRecoveryPlan(): RecoveryPlan;

  /**
   * Force a degradation level transition (for testing).
   */
  forceDegradationLevel(
    resource: ResourcePressureType,
    level: DegradationLevel,
    reason: string
  ): Promise<void>;

  /**
   * Attempt to recover one degradation level (for testing or manual intervention).
   */
  attemptRecovery(resource: ResourcePressureType): Promise<boolean>;

  /**
   * Subscribe to degradation level changes.
   */
  onDegradationChanged(
    callback: (event: DegradationChangedEvent) => void
  ): IDisposable;

  /**
   * Get the full degradation state snapshot.
   */
  getStateSnapshot(): DegradationStateSnapshot;
}

enum ResourcePressureType {
  CPU               = 'cpu',
  Memory            = 'memory',
  EventStorm        = 'event-storm',
  AgentExplosion    = 'agent-explosion',
  UIPanelOverload   = 'ui-panel-overload',
  SignalFlood       = 'signal-flood',
  ContextExplosion  = 'context-explosion'
}

interface DegradationAction {
  id: string;
  resource: ResourcePressureType;
  level: DegradationLevel;
  description: string;
  affectedServices: string[];
  activatedAt: number;
  reversible: boolean;
  recoveryStep: string;
}

interface DegradationRuleSet {
  resource: ResourcePressureType;
  thresholds: Map<DegradationLevel, number>;  // resource% → level mapping
  recoveryThresholds: Map<DegradationLevel, number>;  // hysteresis thresholds
  actions: Map<DegradationLevel, DegradationAction[]>;
  recoveryPlans: Map<DegradationLevel, RecoveryStep[]>;
}

interface RecoveryPlan {
  currentLevel: DegradationLevel;
  targetLevel: DegradationLevel;
  steps: RecoveryStep[];
  estimatedDuration: number;  // milliseconds
  prerequisites: string[];
}

interface RecoveryStep {
  order: number;
  description: string;
  action: () => Promise<void>;
  verification: () => Promise<boolean>;
  rollbackOnFailure: boolean;
}

interface DegradationStateSnapshot {
  timestamp: number;
  overallLevel: DegradationLevel;
  resourceLevels: Map<ResourcePressureType, DegradationLevel>;
  activeActions: DegradationAction[];
  resourceUtilization: Map<ResourcePressureType, number>;
  recoveryInProgress: boolean;
  recoveryETA?: number;
}
```

---

## 5. Degradation Decision Engine

### 5.1 Decision Algorithm

The degradation model uses a multi-factor decision engine that considers:

1. **Current Resource Utilization:** Direct measurement of CPU, memory, event rate, etc.
2. **Trend Analysis:** Is utilization increasing, stable, or decreasing?
3. **Projected Impact:** Based on current trend, when will the next threshold be reached?
4. **Service Criticality:** Which services can be sacrificed without breaking core functionality?
5. **Recovery Cost:** How expensive (time, data loss) is recovery from this degradation?

### 5.2 Decision Flow

```
Resource Monitor
       ↓
[Measure Current Utilization]
       ↓
[Compare Against Thresholds]
       ↓
[Apply Hysteresis Check] ←── Prevents oscillation
       ↓
[Determine Target Level]
       ↓
[Check Recovery Cost]
       ↓
[Execute Degradation Actions]
       ↓
[Emit Degradation Signal]
       ↓
[Monitor Recovery Conditions]
       ↓
[Recover When Safe]
```

### 5.3 Conflict Resolution

When multiple resource pressure types demand different degradation levels, the system applies the **highest common degradation level**:

```
CPU:          Minimal
Memory:       Moderate
EventStorm:   None
Overall:      Moderate (highest of all resource levels)
```

This ensures that the system always operates at the degradation level required by its most stressed resource.

---

## 6. Degradation Priority Matrix

This matrix defines which services are shed at each degradation level, ordered by criticality.

| Priority | Service | Shed at Level | Rationale |
|---|---|---|---|
| 0 | CrossLayerSignalBus (P0) | Never | Backbone communication |
| 0 | GlobalExecutionBrain | Never | Core execution capability |
| 0 | ContextEngine (essential) | Never | Core context integrity |
| 1 | IntentSystem | Critical only | Intent processing |
| 1 | AgentOrchestrator | Severe+ | Agent management |
| 2 | HumanExperienceModel | Significant+ | Human-centric features |
| 2 | FlowStatePreservation | Significant+ | Flow protection |
| 3 | WorkspaceMemory | Moderate+ | Workspace continuity |
| 3 | SessionContinuity | Moderate+ | Session management |
| 4 | VisualPolish | Minimal+ | Visual enhancements |
| 4 | CinematicMotion | Minimal+ | Animation system |
| 4 | ProgressiveDisclosure | Minimal+ | Progressive UI |
| 5 | TelemetryServices | Minimal+ | Analytics and monitoring |
| 5 | DebugInstrumentation | Minimal+ | Debug tooling |

---

## 7. Configuration

```json
{
  "systemDegradationModel": {
    "enabled": true,
    "monitoringInterval": 500,
    "hysteresisDuration": 30000,
    "autoRecoveryEnabled": true,
    "degradationThresholds": {
      "cpu": { "minimal": 70, "moderate": 80, "significant": 90, "severe": 95, "critical": 98 },
      "memory": { "minimal": 70, "moderate": 80, "significant": 90, "severe": 95, "critical": 98 },
      "event-storm": { "minimal": 2000, "moderate": 5000, "significant": 10000, "severe": 20000, "critical": 50000 },
      "agent-explosion": { "minimal": 10, "moderate": 20, "significant": 40, "severe": 60, "critical": 80 },
      "ui-panel-overload": { "minimal": 8, "moderate": 16, "significant": 32, "severe": 48, "critical": 64 },
      "signal-flood": { "minimal": 3000, "moderate": 8000, "significant": 15000, "severe": 25000, "critical": 40000 },
      "context-explosion": { "minimal": 50000, "moderate": 100000, "significant": 250000, "severe": 500000, "critical": 1000000 }
    },
    "recoveryThresholds": {
      "cpu": { "minimal": 65, "moderate": 75, "significant": 85, "severe": 93, "critical": 93 },
      "memory": { "minimal": 65, "moderate": 75, "significant": 85, "severe": 93, "critical": 93 }
    }
  }
}
```

---

## 8. Observability

### 8.1 Emitted Signals

| Signal | Payload | When |
|---|---|---|
| `degradation:levelChanged` | `{ resource, fromLevel, toLevel, utilization }` | Degradation level transition |
| `degradation:actionActivated` | `{ actionId, serviceId, level }` | A degradation action is applied |
| `degradation:actionReversed` | `{ actionId, serviceId, level }` | A degradation action is reversed |
| `degradation:recoveryStarted` | `{ fromLevel, targetLevel }` | Recovery process begins |
| `degradation:recoveryCompleted` | `{ fromLevel, toLevel, durationMs }` | Recovery completes |
| `degradation:recoveryFailed` | `{ level, reason }` | Recovery attempt fails |

### 8.2 Degradation Dashboard

- **Overall Level:** Current system-wide degradation classification
- **Resource Map:** Per-resource pressure visualization with threshold indicators
- **Active Actions:** List of currently applied degradation actions
- **Recovery Timeline:** Estimated recovery path with time projections
- **Service Health:** Color-coded per-service status reflecting degradation impact

---

## 9. Testing the Degradation Model

### 9.1 Validation Tests

| Test | Method | Expected Result |
|---|---|---|
| CPU degradation activation | Simulate CPU load to 85% | Moderate degradation activates within 5s |
| Memory degradation activation | Fill memory to 92% | Significant degradation activates within 5s |
| Hysteresis stability | Oscillate CPU across threshold | No degradation oscillation (level changes <1/30s) |
| Recovery correctness | Stress then release | All services restore to full capability |
| Priority ordering | Simulate compound stress | Higher-priority services preserved, lower-priority shed |
| Signal priority enforcement | Flood signal bus | P0 signals delivered at 100% even in Critical mode |
| Context integrity | Stress context to Critical | Essential context (current intent) preserved |

### 9.2 Failure Modes

| Failure Mode | Detection | Mitigation |
|---|---|---|
| Degradation action fails to apply | Action verification timeout | Retry once, escalate to next degradation level |
| Recovery action fails | Verification returns false | Log error, maintain current level, retry after 30s |
| Conflicting degradation demands | Two resources at different levels | Apply highest common level |
| Degradation oscillation | >3 level changes in 60 seconds | Increase hysteresis band by 5% |

---

## 10. Key Design Decisions

| Decision | Rationale |
|---|---|
| Hysteresis-based transitions | Prevents rapid oscillation between degradation levels |
| Highest-common-level conflict resolution | Ensures system is always adequately protected |
| Priority matrix for service shedding | Provides clear, predictable degradation ordering |
| Signal priority classes | Guarantees critical signals are never dropped |
| Per-resource independent tracking | Allows fine-grained diagnosis of pressure sources |
| Automatic recovery with verification | Reduces need for manual intervention while ensuring safety |
