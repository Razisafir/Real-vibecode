# Cross-Layer Failure Testing

> **Service:** `ICrossLayerFailureInjectionService` (#72)
> **Phase:** 18 — System Stress Test, Consolidation & Real-World Simulation
> **Dependencies:** `ISystemStressSimulationService` (#70), `ISystemDegradationModelService` (#71), all cross-layer services
> **Status:** Implemented

---

## 1. Purpose

The `ICrossLayerFailureInjectionService` is the system's chaos engineering component. It deliberately injects failures across system layers — execution, context, signal bus, replay, human experience, and UI — to validate that the system's resilience mechanisms work as designed. Unlike stress testing (which applies load), failure injection **removes or corrupts** specific capabilities and observes how the system responds.

This service answers the fundamental question: **"When something breaks, does the rest of the system survive?"**

### Core Principles

1. **Controlled Chaos:** Failures are injected with precise scope, timing, and duration
2. **Observability First:** Every injected failure is tracked, and system behavior is comprehensively observed
3. **Blast Radius Containment:** Failures should not propagate beyond their intended scope
4. **Recovery Verification:** After failure injection, the system must demonstrate recovery
5. **No Permanent Damage:** All injections are temporary and fully reversible

---

## 2. Failure Injection Types

The service supports eight distinct failure injection types, each targeting a specific cross-layer integration point.

### 2.1 Type 1: UX-Execution Desync

**What it does:** Creates a mismatch between the UI state and the actual execution state, simulating a scenario where the visual representation diverges from reality.

**Injection Mechanism:**
1. The signal bus selectively drops state-update signals from the execution layer to the UI layer
2. The execution layer continues operating correctly, but the UI displays stale state
3. After a configurable delay, signal delivery resumes

**Parameters:**
```typescript
interface UXExecutionDesyncConfig {
  /** Which signals to drop */
  droppedSignalTypes: string[];
  /** Duration of desync in milliseconds */
  durationMs: number;
  /** Whether to drop signals randomly or selectively */
  mode: 'random' | 'selective';
  /** Random drop probability (0-1) for random mode */
  dropProbability?: number;
}
```

**Observable Behaviors:**
- UI shows "loading" or stale state while execution has completed
- User clicks on UI elements that no longer correspond to valid actions
- Replay engine records the desync period as a divergence event

**Expected System Response:**
- ContextualMinimalism should detect stale state and show a synchronization indicator
- ExperienceStateSurface should display a "state syncing" affordance
- After signal resumption, UI should catch up within 2 seconds
- No permanent state corruption

**Failure Indicator (unexpected):**
- UI permanently stuck in desync state
- User action on stale state causes execution error
- Replay engine unable to reconcile the desync period

---

### 2.2 Type 2: Signal Bus Delays

**What it does:** Introduces artificial latency into the cross-layer signal bus, simulating network or processing delays.

**Injection Mechanism:**
1. Signal delivery is delayed by a configurable amount
2. Signals are not dropped, just deferred
3. Signal ordering is preserved (FIFO within priority class)

**Parameters:**
```typescript
interface SignalBusDelayConfig {
  /** Minimum delay in milliseconds */
  minDelayMs: number;
  /** Maximum delay in milliseconds */
  maxDelayMs: number;
  /** Which signal priorities to affect */
  affectedPriorities: SignalPriority[];
  /** Duration of delay injection */
  durationMs: number;
  /** Delay distribution */
  distribution: 'uniform' | 'normal' | 'exponential';
}
```

**Observable Behaviors:**
- Execution completions appear delayed in the UI
- Context switches feel sluggish
- Agent responses arrive after noticeable lag
- Human input acknowledgments are delayed

**Expected System Response:**
- PerceivedPerformance service should detect the delay and show progress indicators
- BackpressureSystem should not trigger (signals are not lost, just delayed)
- SystemCoherenceEngine should detect timing anomalies
- Human experience should degrade gracefully (user is informed of delays)

**Failure Indicator (unexpected):**
- Signal ordering violation (causal dependency broken)
- Timeout cascades (delayed signals cause other services to assume failure)
- Deadlock from delayed acknowledgment signals

---

### 2.3 Type 3: Context Corruption

**What it does:** Introduces corrupted data into the context engine, simulating data integrity failures.

**Injection Mechanism:**
1. Specific context entries are modified with invalid or contradictory data
2. Corruption types: wrong values, missing fields, type mismatches, circular references
3. The context engine must detect and handle the corruption

**Parameters:**
```typescript
interface ContextCorruptionConfig {
  /** Types of corruption to inject */
  corruptionTypes: ContextCorruptionType[];
  /** Percentage of context entries to corrupt */
  corruptionRate: number; // 0-1
  /** Which context scopes to target */
  targetScopes: ContextScope[];
  /** Whether to inject corruption gradually or instantly */
  gradual: boolean;
}

enum ContextCorruptionType {
  WrongValues      = 'wrong-values',
  MissingFields    = 'missing-fields',
  TypeMismatches   = 'type-mismatches',
  CircularRefs     = 'circular-refs',
  StaleReferences  = 'stale-references',
  InconsistentState = 'inconsistent-state'
}
```

**Observable Behaviors:**
- Agents receive incorrect context and produce wrong results
- UI displays contradictory information
- Execution makes decisions based on corrupted context

**Expected System Response:**
- ContextEngine must detect corruption via integrity checks
- SystemCoherenceEngine should flag coherence violations
- ContextMerger should reject corrupted context entries
- AI context should fall back to last-known-good context
- Self-healing should restore context from workspace memory

**Failure Indicator (unexpected):**
- Corruption propagates to other services (cascading failure)
- Context engine crashes instead of handling corruption
- Permanent context state damage

---

### 2.4 Type 4: Replay Divergence

**What it does:** Introduces conditions that cause the deterministic replay engine to produce different results on replay, breaking determinism.

**Injection Mechanism:**
1. Inject non-deterministic timing dependencies into the event stream
2. Inject events with missing or ambiguous ordering information
3. Create scenarios where event timestamps are insufficient for ordering

**Parameters:**
```typescript
interface ReplayDivergenceConfig {
  /** Types of divergence to inject */
  divergenceTypes: ReplayDivergenceType[];
  /** Severity of divergence */
  severity: 'minor' | 'moderate' | 'severe';
}

enum ReplayDivergenceType {
  AmbiguousOrdering   = 'ambiguous-ordering',
  MissingCausality    = 'missing-causality',
  TimingSensitivity   = 'timing-sensitivity',
  FloatingPointDrift  = 'floating-point-drift',
  NonDeterministicAPI = 'non-deterministic-api'
}
```

**Observable Behaviors:**
- Replaying the same event stream produces different final states
- Causal linking engine produces different dependency graphs on replay
- Timeline reconstruction shows different orderings

**Expected System Response:**
- DeterministicReplayEngine should detect non-determinism and flag it
- CausalLinking should add explicit ordering constraints where ambiguous
- System should log the divergence with sufficient context for diagnosis
- Replay should produce a "best effort" result with divergence annotations

**Failure Indicator (unexpected):**
- Silent non-determinism (different results without detection)
- Replay engine crash
- Complete inability to replay (data loss)

---

### 2.5 Type 5: Human Interruption Loops

**What it does:** Simulates a scenario where the system's interruption handling creates a feedback loop — handling an interruption triggers another interruption, which triggers another, etc.

**Injection Mechanism:**
1. Trigger an interruption through the human experience layer
2. The interruption handler's response is configured to trigger another interruption
3. This creates a loop: interruption → response → interruption → response → ...

**Parameters:**
```typescript
interface HumanInterruptionLoopConfig {
  /** Maximum loop iterations before forced termination */
  maxIterations: number;
  /** Types of interruptions to chain */
  interruptionTypes: InterruptionType[];
  /** Whether to inject gradually or create instant loop */
  gradual: boolean;
  /** Time between loop iterations (milliseconds) */
  iterationIntervalMs: number;
}
```

**Observable Behaviors:**
- Rapid cycling between interruption states
- Human experience model showing conflicting fatigue/flow signals
- UI panels rapidly switching between states
- Signal bus flooding with interruption-related signals

**Expected System Response:**
- InterruptionIntelligence must detect the loop and break it
- RecursionSafety must enforce maximum loop depth
- ConflictResolver should detect and resolve the conflicting interruption signals
- System should stabilize in a "paused" state awaiting human input

**Failure Indicator (unexpected):**
- Infinite loop (system never stabilizes)
- Memory exhaustion from accumulated loop state
- Complete system freeze
- Crash due to stack overflow from recursive interruption handling

---

### 2.6 Type 6: Service Crash

**What it does:** Simulates the complete failure (crash) of a specific service, testing whether dependent services can operate without it.

**Injection Mechanism:**
1. The target service is suspended (its event loop is paused)
2. All signals from the service are stopped
3. Dependent services encounter "service unavailable" conditions

**Parameters:**
```typescript
interface ServiceCrashConfig {
  /** Service identifier to crash */
  serviceId: string;
  /** Duration of crash simulation in milliseconds */
  crashDurationMs: number;
  /** Whether to simulate gradual crash (degrading then failing) */
  gradualCrash: boolean;
  /** Whether to simulate crash recovery (service comes back with lost state) */
  crashRecoveryType: 'clean' | 'stateless' | 'partial-state' | 'corrupted-state';
}
```

**Crashable Services and Expected Behaviors:**

| Service | Expected Behavior Without It | Recovery Strategy |
|---|---|---|
| ContextEngine | Agents use cached context; no new context updates | Rebuild context from workspace memory |
| AgentOrchestrator | Existing agents continue; no new agents spawned | Respawn orchestrator, re-register agents |
| GlobalBrain | No proactive suggestions; reactive-only mode | Resume from last checkpoint |
| SignalBus | Complete system halt (P0 dependency) | Cannot operate; emergency recovery required |
| ReplayEngine | No replay recording; execution continues | Resume recording from current state |
| HumanExperience | No fatigue detection; default conservative mode | Rebuild model from recent session data |

**Expected System Response:**
- Dependent services detect the unavailability and activate fallback modes
- Signal bus reroutes around the failed service where possible
- System continues operating with reduced capability
- Self-healing attempts to restart the crashed service

**Failure Indicator (unexpected):**
- Cascading service failures (one crash triggers others)
- Deadlock caused by waiting for the crashed service
- Data loss when the crashed service recovers

---

### 2.7 Type 7: Dependency Chain Failure

**What it does:** Simulates failures that propagate along service dependency chains, testing whether blast radius is contained.

**Injection Mechanism:**
1. A leaf service is crashed
2. The system's dependency graph is analyzed to predict impact
3. Actual impact is compared against predicted impact
4. Blast radius containment is validated

**Parameters:**
```typescript
interface DependencyChainFailureConfig {
  /** Root service to fail */
  rootServiceId: string;
  /** Maximum expected blast radius (number of services) */
  maxExpectedBlastRadius: number;
  /** Whether to fail one service at a time or simultaneously */
  mode: 'sequential' | 'simultaneous';
  /** Chain length to test */
  chainDepth: number;
}
```

**Dependency Chain Examples:**

```
ContextEngine → AIContextEngine → GlobalBrain → SuggestionSurface
                    ↓                    ↓
              ContextMerger      ExecutionPlanner

Failure of ContextEngine should affect:
  - AIContextEngine (direct dependency)
  - GlobalBrain (indirect, but has cached fallback)
  - ContextMerger (direct, but can operate on existing context)
  - SuggestionSurface (indirect, shows stale suggestions)
  - ExecutionPlanner (indirect, falls back to last plan)
```

**Expected System Response:**
- Each service in the chain activates its documented fallback
- Blast radius does not exceed the predicted impact
- Services outside the dependency chain are unaffected
- Recovery proceeds from leaf to root

**Failure Indicator (unexpected):**
- Blast radius exceeds prediction (unexpected service failures)
- Circular dependency deadlock
- Complete system failure from a single service crash

---

### 2.8 Type 8: Memory Leak

**What it does:** Simulates a memory leak in a specific service, gradually consuming memory until system degradation is triggered.

**Injection Mechanism:**
1. A target service is instrumented to allocate memory without freeing it
2. Allocation rate is controlled (e.g., 1MB/sec, 5MB/sec)
3. System degradation model should detect and respond to memory pressure

**Parameters:**
```typescript
interface MemoryLeakConfig {
  /** Service to simulate leak in */
  serviceId: string;
  /** Leak rate in MB per second */
  leakRateMBps: number;
  /** Maximum total leak before forced termination */
  maxLeakMB: number;
  /** Whether to simulate the leak as gradual or step-function */
  mode: 'gradual' | 'stepped';
  /** Step size in MB (for stepped mode) */
  stepSizeMB?: number;
}
```

**Expected System Response:**
- Degradation model detects memory pressure and activates appropriate level
- Non-essential services are shed to free memory
- Memory pressure signals are emitted to the signal bus
- Self-healing attempts to identify and report the leak source
- System stabilizes in a degraded but functional state

**Failure Indicator (unexpected):**
- Out-of-memory crash before degradation activates
- Degradation model fails to detect memory pressure
- Self-healing cannot identify leak source
- Memory pressure causes cascading service failures

---

## 3. Service Interface

```typescript
interface ICrossLayerFailureInjectionService {
  readonly _serviceBrand: undefined;

  /**
   * Inject a specific failure type into the system.
   */
  injectFailure(
    type: FailureInjectionType,
    config: FailureConfig
  ): Promise<FailureInjectionHandle>;

  /**
   * Inject multiple failures simultaneously.
   */
  injectMultiple(
    failures: Array<{ type: FailureInjectionType; config: FailureConfig }>
  ): Promise<FailureInjectionHandle[]>;

  /**
   * Stop an active failure injection and begin recovery.
   */
  stopInjection(handle: FailureInjectionHandle): Promise<void>;

  /**
   * Stop all active failure injections.
   */
  stopAllInjections(): Promise<void>;

  /**
   * Get currently active failure injections.
   */
  getActiveInjections(): FailureInjectionHandle[];

  /**
   * Get the observed impact of a specific failure injection.
   */
  getImpactReport(handle: FailureInjectionHandle): FailureImpactReport;

  /**
   * Subscribe to failure injection events.
   */
  onFailureEvent(
    callback: (event: FailureInjectionEvent) => void
  ): IDisposable;

  /**
   * Run a pre-defined failure scenario.
   */
  runFailureScenario(
    scenario: FailureScenario
  ): Promise<FailureScenarioResult>;
}

enum FailureInjectionType {
  UXExecutionDesync       = 'ux-execution-desync',
  SignalBusDelay          = 'signal-bus-delay',
  ContextCorruption       = 'context-corruption',
  ReplayDivergence        = 'replay-divergence',
  HumanInterruptionLoop   = 'human-interruption-loop',
  ServiceCrash            = 'service-crash',
  DependencyChainFailure  = 'dependency-chain-failure',
  MemoryLeak              = 'memory-leak'
}

type FailureConfig =
  | UXExecutionDesyncConfig
  | SignalBusDelayConfig
  | ContextCorruptionConfig
  | ReplayDivergenceConfig
  | HumanInterruptionLoopConfig
  | ServiceCrashConfig
  | DependencyChainFailureConfig
  | MemoryLeakConfig;

interface FailureInjectionHandle {
  id: string;
  type: FailureInjectionType;
  startedAt: number;
  config: FailureConfig;
  status: 'active' | 'stopped' | 'failed';
}

interface FailureImpactReport {
  handle: FailureInjectionHandle;
  directlyAffectedServices: string[];
  indirectlyAffectedServices: string[];
  blastRadiusExceeded: boolean;
  recoveryActions: string[];
  recoveryCompleted: boolean;
  recoveryTimeMs: number;
  lessonsLearned: string[];
}

interface FailureScenarioResult {
  scenario: FailureScenario;
  injections: FailureInjectionHandle[];
  impactReports: FailureImpactReport[];
  overallOutcome: 'resilient' | 'degraded' | 'vulnerable' | 'catastrophic';
  recommendations: string[];
}
```

---

## 4. Pre-Defined Failure Scenarios

### 4.1 Scenario: Single Point of Failure Audit

Tests every service individually for single-point-of-failure risk.

```
For each service S in system:
  1. Crash service S
  2. Wait 30 seconds
  3. Measure: How many other services failed?
  4. Measure: Can the system recover automatically?
  5. Classify S as: Non-critical / Important / Critical / System-essential
```

### 4.2 Scenario: Cascade Validator

Tests whether a single failure can cascade across the system.

```
1. Crash a leaf service
2. Monitor all services for 60 seconds
3. Record which services show degraded behavior
4. Compare against predicted dependency graph
5. Flag any unexpected cascade paths
```

### 4.3 Scenario: Signal Integrity Under Failure

Tests whether signal bus integrity is maintained when producers fail.

```
1. Crash 3 signal producers simultaneously
2. Verify: Signal subscribers receive "unavailable" notifications
3. Verify: No orphaned subscriptions remain
4. Verify: Signal bus throughput remains stable
5. Verify: Recovery restores signal delivery
```

### 4.4 Scenario: Context Resilience

Tests whether the context engine can recover from corruption.

```
1. Inject context corruption (20% of entries corrupted)
2. Verify: Context engine detects corruption
3. Verify: Corrupted entries are isolated, not propagated
4. Verify: Agents receive fallback context
5. Verify: Self-healing restores context from backup
```

---

## 5. Observation Framework

### 5.1 Metrics Collected During Injection

| Metric | Collection Method | Purpose |
|---|---|---|
| Service availability | Health check polling | Detect service failures |
| Signal delivery rate | Signal bus monitoring | Detect signal loss or delay |
| Context integrity | Checksum validation | Detect context corruption |
| Memory usage | Process monitoring | Detect memory leaks |
| CPU usage | Process monitoring | Detect CPU pressure |
| Recovery time | Timestamp tracking | Measure resilience |
| Blast radius | Dependency analysis | Contain failure impact |

### 5.2 Observation Timeline

```
T-30s:  Pre-injection baseline captured
T-0s:   Failure injected
T+5s:   Immediate impact assessment
T+30s:  Short-term impact assessment
T+60s:  Medium-term impact assessment
T+120s: Long-term impact assessment (if injection continues)
T-stop: Injection stopped
T+30s:  Recovery assessment
T+60s:  Full recovery verification
```

---

## 6. Safety Mechanisms

### 6.1 Injection Safeguards

1. **No injection of failures into the signal bus P0 path** — this would create unrecoverable states
2. **Maximum simultaneous injection count: 3** — prevents compound failure from becoming unrecoverable
3. **Automatic rollback timer** — every injection has a maximum duration, after which it is automatically stopped
4. **Blast radius monitoring** — if blast radius exceeds prediction, injection is immediately stopped
5. **Recovery verification** — after injection stops, system must recover within 5 minutes or escalation is triggered

### 6.2 Forbidden Injections

| Target | Reason | Alternative |
|---|---|---|
| Signal bus P0 delivery | System would become unrecoverable | Delay P0 signals instead |
| Extension host process | Would crash the entire IDE | Simulate individual service failures |
| File system writes | Risk of data corruption | Mock file system in sandbox |
| Network layer | External dependency | Mock network responses |

---

## 7. Key Design Decisions

| Decision | Rationale |
|---|---|
| Eight distinct failure types | Covers the major cross-layer integration points comprehensively |
| Configurable injection parameters | Allows progressive testing from mild to severe |
| Blast radius prediction and monitoring | Prevents uncontrolled failure propagation |
| Automatic rollback timer | Ensures no failure injection persists indefinitely |
| Pre-defined scenarios | Provides repeatable test suites for CI/CD integration |
| Observation framework separate from injection | Ensures observation continues even if injection causes issues |
| Forbidden injection list | Prevents creating genuinely unrecoverable states |
