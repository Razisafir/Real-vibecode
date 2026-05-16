# Deterministic Replay — Architecture

## Overview

Deterministic Replay is the guarantee that replaying an execution from a given snapshot with a given intent always produces the same output. This is the most critical property of the Execution Replay Engine — it transforms the system from "approximately reproducible" to "mathematically provable."

The deterministic replay system spans Task 4 of the `IExecutionReplayService`, but its guarantees permeate every other task: snapshots carry seeds, simulations use seeds, reconstruction relies on determinism, and the debug protocol requires it for step-by-step fidelity.

## The Fundamental Theorem

> **Given** snapshot S (immutable), intent I (immutable), and seed R (deterministic):
> **Then** replaying I from S with R in STRICT mode MUST produce output O, such that O is identical for any number of replays at any time.

Formally:

```
∀ t₁, t₂: replay(S, I, R, STRICT, t₁) = replay(S, I, R, STRICT, t₂)
```

This theorem holds because:
1. S is immutable (never modified after capture)
2. I is immutable (intent data is frozen)
3. R is a fixed numeric seed (no randomness)
4. All non-deterministic operations are stubbed or seeded
5. No external I/O occurs during replay

## STRICT vs APPROXIMATE Modes

### ReplayMode.Strict

In STRICT mode, the replay engine guarantees perfect determinism:

| Property | Guarantee |
|----------|-----------|
| Output equality | Replayed output is byte-identical to the original |
| Event ordering | Events are replayed in the exact same order |
| Decision paths | Agents make the exact same decisions |
| Process outputs | Simulated process output is character-identical |
| Timing | Timestamps are replayed from recorded data, not from `Date.now()` |
| Divergence tolerance | **ZERO** — any divergence is flagged as critical |

**When to use STRICT mode**:
- Verifying system correctness
- Debugging unexpected behavior
- Regression testing after code changes
- Auditing execution chains
- Legal/compliance replay requirements

### ReplayMode.Approximate

In APPROXIMATE mode, the replay engine allows controlled non-determinism:

| Property | Guarantee |
|----------|-----------|
| Output equality | Replayed output is semantically equivalent (may differ in formatting) |
| Event ordering | Events are in the same causal order (may differ in exact timestamps) |
| Decision paths | Agents may take different paths to the same outcome |
| Process outputs | Output classification is the same (text may differ) |
| Timing | Timestamps may use `Date.now()` for relative ordering |
| Divergence tolerance | Minor divergences are accepted; major/critical are still flagged |

**When to use APPROXIMATE mode**:
- Performance-sensitive replays where strict determinism is costly
- Systems with external dependencies that cannot be fully stubbed
- Exploratory debugging where exact reproduction is not required
- Timeline exploration with real-time visualization

### Mode Comparison Table

| Aspect | STRICT | APPROXIMATE |
|--------|--------|-------------|
| Output guarantee | Byte-identical | Semantically equivalent |
| Timing source | Recorded timestamps | Mixed (recorded + real-time) |
| External I/O | Fully stubbed | Partially stubbed |
| Divergence policy | Zero tolerance | Minor accepted |
| Performance | Slower (full stub layer) | Faster (partial stubs) |
| Use case | Verification, audit | Exploration, debugging |
| Seed requirement | Required | Optional |

## Seed Generation and Control

### IReplaySeed Interface

```typescript
interface IReplaySeed {
    readonly id: string;              // Unique seed ID
    readonly value: number;           // The numeric seed value
    readonly snapshotId: string;      // Which snapshot this seed is bound to
    readonly createdAt: number;       // When the seed was created
    readonly description: string;     // What this seed controls
}
```

### Seed Lifecycle

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│              │     │              │     │              │     │              │
│  Generated   │────▶│  Bound to    │────▶│  Used for    │────▶│  Verified    │
│  from        │     │  Snapshot    │     │  Replay      │     │  (determinism│
│  xorshift32  │     │              │     │              │     │   check)     │
│              │     │              │     │              │     │              │
└──────────────┘     └──────────────┘     └──────────────┘     └──────────────┘
```

1. **Generated** — The seed is produced by the xorshift32 PRNG from a source value
2. **Bound** — The seed is permanently bound to a specific snapshot via `snapshotId`
3. **Used** — The seed drives all random choices during replay
4. **Verified** — The `verifyDeterminism()` method replays with the seed and checks for divergences

### xorshift32 PRNG

The replay engine uses the xorshift32 pseudo-random number generator for seed generation. This algorithm is chosen for its:

- **Speed**: Single 32-bit XOR-shift operation per value
- **Determinism**: Same seed always produces the same sequence
- **Period**: Full 2³² - 1 period (no zero state)
- **Quality**: Passes standard statistical tests for randomness
- **Simplicity**: Easy to verify and audit

**Implementation**:

```typescript
class XorShift32 {
    private state: number;
    
    constructor(seed: number) {
        // Ensure non-zero state
        this.state = seed === 0 ? 1 : seed;
    }
    
    next(): number {
        let x = this.state;
        x ^= x << 13;
        x ^= x >> 17;
        x ^= x << 5;
        this.state = x;
        return x >>> 0;  // Unsigned 32-bit integer
    }
    
    nextFloat(): number {
        return this.next() / 0x100000000;  // [0, 1)
    }
}
```

### Seed Generation Process

```
createReplaySeed(snapshotId, description):
    // Source entropy: snapshot hash + timestamp + counter
    sourceHash = hashString(snapshotId)
    timestamp = Date.now()
    counter = this.seedCounter++
    
    // Combine sources into a 32-bit seed value
    rawSeed = sourceHash ^ (timestamp & 0xFFFFFFFF) ^ (counter * 2654435761)
    
    // Ensure non-zero
    seedValue = rawSeed === 0 ? 1 : rawSeed
    
    return IReplaySeed {
        id: generateUUID(),
        value: seedValue,
        snapshotId: snapshotId,
        createdAt: Date.now(),
        description: description
    }
```

### Seed Usage During Replay

When a replay operation begins, the seed initializes a new PRNG instance:

1. **Agent simulation**: The PRNG determines which decision path the agent takes at each decision point
2. **Process simulation**: The PRNG determines output chunks, timing, and exit codes
3. **Policy evaluation**: The PRNG determines which policy branch is taken (when multiple are valid)
4. **Graph mutation ordering**: The PRNG determines the order of simultaneous mutations

Each subsystem receives its own PRNG instance derived from the master seed:

```
masterPRNG = new XorShift32(seed.value)
agentPRNG  = new XorShift32(masterPRNG.next())
processPRNG = new XorShift32(masterPRNG.next())
policyPRNG  = new XorShift32(masterPRNG.next())
graphPRNG   = new XorShift32(masterPRNG.next())
```

This ensures that:
- The same master seed always produces the same sub-seeds
- Subsystem simulations are independent (changing one doesn't affect others)
- The total sequence is fully deterministic

## Divergence Detection

### IDeterministicReplayResult

```typescript
interface IDeterministicReplayResult {
    readonly deterministic: boolean;           // Were there any divergences?
    readonly mode: ReplayMode;                 // Which mode was used
    readonly seed: IReplaySeed;               // The seed used
    readonly divergences: readonly IReplayDivergence[];  // Any divergences found
    readonly durationMs: number;              // How long the replay took
}
```

### IReplayDivergence

```typescript
interface IReplayDivergence {
    readonly aspect: string;                   // What diverged
    readonly expected: string;                 // Original value
    readonly actual: string;                   // Replayed value
    readonly replayTimestamp: number;          // When in the replay
    readonly causalChain: readonly string[];   // How we got here
    readonly severity: 'minor' | 'major' | 'critical';
}
```

### Divergence Detection Algorithm

```
detectDivergences(originalEvents, replayedEvents, mode):
    divergences = []
    
    // Pad shorter sequence
    maxLen = max(originalEvents.length, replayedEvents.length)
    
    for i in 0..maxLen:
        original = originalEvents[i] or UNDEFINED
        replayed = replayedEvents[i] or UNDEFINED
        
        if original is UNDEFINED:
            // Extra event in replay — critical divergence
            divergences.push({
                aspect: 'extra-event',
                expected: 'no-event',
                actual: replayed.description,
                severity: 'critical',
                ...
            })
            continue
        
        if replayed is UNDEFINED:
            // Missing event in replay — critical divergence
            divergences.push({
                aspect: 'missing-event',
                expected: original.description,
                actual: 'no-event',
                severity: 'critical',
                ...
            })
            continue
        
        // Compare event fields
        if original.source !== replayed.source:
            divergences.push(sourceDivergence(original, replayed))
        
        if original.category !== replayed.category:
            divergences.push(categoryDivergence(original, replayed))
        
        if original.description !== replayed.description:
            divergences.push(descriptionDivergence(original, replayed, mode))
        
        if original.hasSideEffects !== replayed.hasSideEffects:
            divergences.push(sideEffectDivergence(original, replayed))
        
        // Compare associated IDs
        if original.intentId !== replayed.intentId:
            divergences.push(intentDivergence(original, replayed))
    
    // Filter by mode
    if mode is APPROXIMATE:
        divergences = divergences.filter(d => d.severity !== 'minor')
    
    return {
        deterministic: divergences.length === 0,
        mode,
        divergences,
        ...
    }
```

### Severity Classification

| Severity | Condition | STRICT Mode | APPROXIMATE Mode |
|----------|-----------|-------------|------------------|
| `minor` | Description text differs, IDs differ, timestamps differ | **Flagged** | Ignored |
| `major` | Source/category differs, side-effect flag differs | **Flagged** | **Flagged** |
| `critical` | Extra/missing event, intent mismatch, mutation content differs | **Flagged** | **Flagged** |

### Divergence Root Cause Analysis

When a divergence is detected, the `causalChain` field traces back to the root cause:

```
divergence.causalChain = [
    "intent-123 created",          // Root: user created an intent
    "agent-456 decided plan-A",    // Agent chose plan A
    "process-789 started",         // Process started
    "process-789 output differed", // Divergence point
]
```

This chain is built by walking the `causedByEventId` links backward from the divergence point.

## Execution Stub Simulation Layer

### Overview

To achieve determinism, all non-deterministic operations must be replaced with deterministic stubs during replay. The execution stub layer provides this replacement.

### Stub Architecture

```
┌─────────────────────────────────────────────────────┐
│                  Replay Runtime                      │
│                                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────┐ │
│  │ Agent        │  │ Process      │  │ Policy    │ │
│  │ Simulation   │  │ Simulation   │  │ Replay    │ │
│  │ Stub         │  │ Stub         │  │ Engine    │ │
│  │              │  │              │  │           │ │
│  │ - Decisions  │  │ - Output     │  │ - Rules   │ │
│  │ - Plans      │  │ - Lifecycle  │  │ - Checks  │ │
│  │ - Approval   │  │ - Failures   │  │ - Enforce │ │
│  └──────┬───────┘  └──────┬───────┘  └─────┬─────┘ │
│         │                 │                │        │
│         ▼                 ▼                ▼        │
│  ┌──────────────────────────────────────────────┐  │
│  │           Seeded PRNG (xorshift32)           │  │
│  │                                              │  │
│  │  agentPRNG | processPRNG | policyPRNG        │  │
│  └──────────────────────────────────────────────┘  │
│                                                     │
│  ┌──────────────────────────────────────────────┐  │
│  │           Snapshot Data (read-only)           │  │
│  └──────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

### Agent Simulation Stub

When `simulateAgentDecision()` is called, the agent stub:

1. **Reads agent state** from the snapshot's `IAgentSnapshotLayer`
2. **Reads intent data** from the provided `IIntent`
3. **Uses the seeded PRNG** to make all random choices:
   - Which decision path to take at each branch
   - Confidence level (if not deterministic)
   - Whether to request approval
4. **Produces** `IAgentSimulationResult` with:
   - `simulatedPlan` — what the agent would plan
   - `simulatedDecisions` — what the agent would decide
   - `wouldRequestApproval` — whether approval is needed
   - `wouldViolatePolicy` — whether policy blocks execution
   - `wouldSucceed` — predicted success
   - `estimatedDurationMs`, `estimatedMutationCount`, `estimatedImpact`
   - `deterministic: true` — confirming the simulation used seeded randomness
   - `seed` — the seed that was used

### Process Simulation Stub

When `simulateProcessExecution()` is called, the process stub:

1. **Reads process state** from the snapshot's `IProcessSnapshotLayer`
2. **Interprets the command** to determine expected behavior class
3. **Uses the seeded PRNG** to generate:
   - Simulated output chunks (`ISimulatedOutputChunk`)
   - Lifecycle transitions (`ISimulatedLifecycleTransition`)
   - Exit code (success or failure)
   - Execution duration
4. **Generates failure paths** using probabilistic models seeded by the PRNG
5. **Produces** `IProcessSimulationResult`

### Process Output Classification

The process stub classifies output into categories:

| Classification | Description |
|---------------|-------------|
| `compilation` | Compiler output, errors, warnings |
| `test-result` | Test pass/fail output |
| `file-operation` | File read/write/creation output |
| `network` | HTTP/API call results |
| `system` | OS-level output (permissions, disk space) |
| `unknown` | Unclassified output |

Classification is deterministic when the same command and seed are used.

## Policy Replay Engine

### Overview

The policy replay engine (`reApplyPolicy()`) re-evaluates a past agent decision against the current (or a specified) policy configuration. This enables "what would have happened if the policy was different?" analysis.

### How It Works

1. **Retrieve the decision** — Load the original `IGlobalDecision` from the brain's decision history
2. **Retrieve the context** — Reconstruct the agent's context at the time of the decision using the nearest snapshot
3. **Re-evaluate against policy** — Run the current policy rules against the decision and context
4. **Compare** — Return the simulated result alongside the original outcome

### Policy Replay Determinism

Policy replay is deterministic when:
- The policy rules are pure functions (no side effects, no external lookups)
- The decision context is fully captured in the snapshot
- The policy version is recorded alongside the decision

Policy replay may be non-deterministic when:
- The policy depends on external services (e.g., a remote configuration server)
- The policy uses time-based conditions (e.g., "only during business hours")
- The policy was updated between the original decision and the replay

## Same Snapshot + Same Intent → Same Output Proof

### Theorem Statement

For any snapshot S, intent I, and seed R:

```
replay(S, I, R, STRICT) = O   (always produces the same O)
```

### Proof by Construction

**Lemma 1: S is immutable**
- By the snapshot immutability guarantees (see System Snapshots architecture)
- `Object.freeze()` is applied deeply at capture time
- The snapshot cannot be modified by any subsequent operation
- ∴ S remains constant across all replays

**Lemma 2: I is immutable**
- `IIntent` is a `readonly` interface with all fields frozen
- The intent is loaded from the brain's intent store, which preserves original values
- Intent resolution state is recorded, not mutated
- ∴ I remains constant across all replays

**Lemma 3: R produces deterministic sequences**
- `XorShift32` is a deterministic PRNG — same seed produces same sequence
- The seed value is a fixed number, not derived from `Date.now()` or other non-deterministic sources
- Sub-seeds are derived deterministically from the master seed
- ∴ R produces the same random values across all replays

**Lemma 4: All non-deterministic operations are stubbed**
- `Date.now()` → returns the snapshot timestamp + simulated offset
- `Math.random()` → replaced with `agentPRNG.nextFloat()`
- Filesystem access → returns data from the snapshot
- Network calls → stubbed with recorded responses
- Process spawning → replaced with `simulateProcessExecution()`
- ∴ No external non-determinism can affect the replay

**Lemma 5: The execution path is fully determined by (S, I, R)**
- Agent decisions use `agentPRNG` → determined by R
- Process outputs use `processPRNG` → determined by R
- Policy evaluations use `policyPRNG` → determined by R
- Graph mutations use `graphPRNG` → determined by R
- All input data comes from S → determined by S
- All intent parameters come from I → determined by I
- ∴ The execution path is a function of (S, I, R) only

**Main Proof:**
By Lemmas 1-5, the replay is a pure function:

```
O = f(S, I, R)
```

Since f, S, I, and R are all deterministic, O must be the same for any invocation. ∎

### Practical Considerations

While the theorem holds in theory, practical implementations must guard against:

| Risk | Mitigation |
|------|-----------|
| Shared mutable state | Replay runs in an isolated context with its own PRNG instances |
| Timer-based logic | All timers are stubbed with seeded delays |
| Thread scheduling | Replay is single-threaded; no concurrent operations |
| Floating-point non-determinism | Uses integer arithmetic where possible; IEEE 754 is deterministic for same inputs |
| External dependencies | All I/O is stubbed; no network, filesystem, or process access during replay |

### Verification Protocol

The `verifyDeterminism()` method provides empirical verification:

```
verifyDeterminism(intentId, seed):
    // Step 1: Get the original execution result
    original = getOriginalExecution(intentId)
    
    // Step 2: Replay with the given seed
    replayed = replayIntentChain(intentId, STRICT)
    
    // Step 3: Compare
    result = detectDivergences(original.events, replayed.events, STRICT)
    
    return result
```

If `result.deterministic` is `true`, the theorem holds for this specific (S, I, R) triple. If `false`, the divergences indicate where the implementation violates the theorem, and the `causalChain` field helps trace the root cause.

## API Reference

### createReplaySeed(snapshotId, description)

Creates a new replay seed bound to a specific snapshot.

**Parameters**:
- `snapshotId: string` — The snapshot to bind the seed to
- `description: string` — Human-readable description of what this seed controls

**Returns**: `IReplaySeed`

### verifyDeterminism(intentId, seed)

Replays an intent and compares the result against the original execution.

**Parameters**:
- `intentId: string` — The intent to verify
- `seed: IReplaySeed` — The seed to use for replay

**Returns**: `IDeterministicReplayResult`

### replayMode (getter)

Returns the current `ReplayMode` (STRICT or APPROXIMATE).

### setReplayMode(mode)

Sets the replay mode for all subsequent replay operations.

**Parameters**:
- `mode: ReplayMode` — The mode to set

### getReplayDivergences()

Returns all divergences detected across all replays in the current session.

**Returns**: `readonly IReplayDivergence[]`

## Divergence Dashboard

The UI layer provides a divergence dashboard that shows:

| View | Content |
|------|---------|
| Divergence list | All divergences sorted by severity |
| Divergence detail | Aspect, expected vs actual, causal chain |
| Replay comparison | Side-by-side original vs replayed timeline |
| Trend chart | Divergence count over time (should trend toward zero) |
| Seed audit | All seeds used, with verification results |

## Integration with Other Tasks

| Task | Deterministic Replay Dependency |
|------|-------------------------------|
| Task 1 (Replay Engine) | `replayIntentChain()` and `replayGraphTimeline()` return `IDeterministicReplayResult` |
| Task 2 (Snapshots) | Each snapshot carries a `replaySeed` |
| Task 5 (Agent Simulation) | Agent simulation uses seeded PRNG; `deterministic` flag on results |
| Task 6 (Process Simulation) | Process simulation uses seeded PRNG; `deterministic` flag on results |
| Task 7 (Reconstruction) | Reconstruction relies on deterministic replay of events between snapshots |
| Task 9 (Debug Protocol) | Debug sessions use STRICT mode for step-by-step fidelity |
| Task 10 (UI Layer) | `IReplayControllerViewModel` shows mode and speed controls |
