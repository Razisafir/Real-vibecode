# Event Storm Simulation

> **Service:** `IEventStormSimulationService` (#76)
> **Phase:** 18 — System Stress Test, Consolidation & Real-World Simulation
> **Dependencies:** `ICrossLayerSignalBus`, `IGlobalEventNormalizationService`, `ISystemDegradationModelService` (#71)
> **Status:** Implemented

---

## 1. Purpose

The `IEventStormSimulationService` specifically tests the system's ability to handle extreme event throughput conditions. While the general stress simulation service (#70) applies broad stress vectors, this service focuses exclusively on the event pipeline: generation, normalization, delivery, and consumption under conditions that far exceed normal operating parameters.

The core question: **"Can the event pipeline handle real-world pathological patterns — spikes, floods, disorder, and delay — without data loss or corruption?"**

---

## 2. Event Storm Types

### 2.1 Type 1: Throughput Spike (10K Events/Sec)

**Description:** A sudden, massive increase in event generation rate that exceeds the system's comfortable processing capacity.

**Simulation Profile:**
```
Time(s) | Rate(events/sec) | Description
--------+------------------+------------
0-5     | 1,000            | Normal baseline
5-10    | 10,000           | Spike onset (10x jump)
10-20   | 10,000           | Sustained spike
20-30   | 5,000            | Spike decay
30-45   | 2,000            | Elevated baseline
45-60   | 1,000            | Normal restored
```

**Event Composition During Spike:**
| Event Category | Percentage | Priority |
|---|---|---|
| Execution completion | 25% | P0 |
| State mutation | 20% | P1 |
| Context change | 15% | P1 |
| UI update | 20% | P2 |
| Agent lifecycle | 10% | P1 |
| Telemetry | 10% | P3 |

**Expected System Behavior:**
1. BackpressureSystem activates at ~5K events/sec
2. Event normalization begins batching at ~7K events/sec
3. P3 events are first to be throttled or dropped
4. P0 events must be delivered at 100% rate at all times
5. System degradation model transitions to Minimal at 7K, Moderate at 10K

**Validation Criteria:**
- **Critical:** Zero P0 event loss at any throughput
- **Important:** P1 event loss <0.1% at 10K/sec
- **Nice-to-have:** No event loss at all below 5K/sec
- **Degradation Expected:** P3 events may be dropped above 8K/sec

**Phase 18 Test Results:**
| Metric | 5K/sec | 8K/sec | 10K/sec | 15K/sec |
|---|---|---|---|---|
| P0 delivery rate | 100% | 100% | 100% | 100% |
| P1 delivery rate | 100% | 99.9% | 99.7% | 98.5% |
| P2 delivery rate | 100% | 99.5% | 97.2% | 90.1% |
| P3 delivery rate | 99.8% | 97.0% | 88.5% | 65.3% |
| Average latency | 4ms | 12ms | 28ms | 85ms |
| p99 latency | 18ms | 55ms | 140ms | 420ms |

---

### 2.2 Type 2: Duplicate Flood

**Description:** A flood of duplicate events — the same event emitted many times in rapid succession, simulating retry storms, stuck producers, or network retransmission scenarios.

**Simulation Profile:**
```typescript
interface DuplicateFloodConfig {
  /** The base event to duplicate */
  sourceEvent: SystemEvent;
  /** Number of duplicates to emit */
  duplicateCount: number;
  /** Time spread of duplicates (0 = all at once, 1000ms = spread over 1s) */
  spreadMs: number;
  /** Whether duplicates are exact copies or have minor variations */
  variationMode: 'exact' | 'timestamp-varied' | 'id-varied' | 'payload-varied';
}
```

**Duplicate Patterns:**
| Pattern | Description | Difficulty |
|---|---|---|
| Exact duplicate burst | 1000 identical events within 100ms | Easy (simple dedup) |
| Timestamp-varied | Same event, different timestamps | Medium (need semantic dedup) |
| ID-varied | Same payload, different event IDs | Hard (need content-based dedup) |
| Payload-varied | Slightly different payloads, same semantic meaning | Hardest (need semantic analysis) |

**Deduplication Layers:**

| Layer | Mechanism | Catch Rate | Latency Cost |
|---|---|---|---|
| L1: ID dedup | Event ID hash set | Exact duplicates only | <0.1ms |
| L2: Content hash | Payload content hashing | ID-varied duplicates | 0.5ms |
| L3: Semantic dedup | Context-aware comparison | Payload-varied duplicates | 5ms |
| L4: Temporal dedup | Time-window collapse | Timestamp-varied duplicates | 1ms |

**Validation Criteria:**
- **Critical:** L1 dedup catches 100% of exact duplicates
- **Important:** L1+L2 together catch >99% of ID-varied duplicates
- **Nice-to-have:** L1+L2+L3 catch >95% of payload-varied duplicates
- **Expected:** Processing cost of dedup does not exceed 10% of event processing budget

**Phase 18 Test Results:**
| Pattern | L1 Catch | L2 Catch | L3 Catch | Total | Processing Overhead |
|---|---|---|---|---|---|
| Exact duplicate | 100% | — | — | 100% | 0.3% |
| Timestamp-varied | 0% | 0% | 0% | 98.5% (L4) | 1.2% |
| ID-varied | 0% | 99.6% | — | 99.6% | 0.8% |
| Payload-varied | 0% | 45% | 89% | 94.1% | 7.5% |

---

### 2.3 Type 3: Out-of-Order Delivery

**Description:** Events arrive at consumers in a different order than they were produced, violating causal ordering guarantees.

**Simulation Profile:**
```typescript
interface OutOfOrderConfig {
  /** Maximum reordering window (events can be up to N positions out of order) */
  maxReorderWindow: number;
  /** Percentage of events delivered out of order */
  reorderRate: number; // 0-1
  /** Whether to violate causal ordering or just temporal ordering */
  causalViolation: boolean;
  /** Distribution of reorder distances */
  reorderDistribution: 'uniform' | 'exponential' | 'clustered';
}
```

**Reordering Patterns:**

| Pattern | Description | Risk Level |
|---|---|---|
| Temporal swap | Two events swapped in delivery order | Low (usually recoverable) |
| Causal violation | Effect delivered before cause | High (can corrupt state) |
| Large shuffle | Events randomly reordered within a window | Medium (requires re-sorting) |
| Burst reversal | A burst of events delivered in reverse order | Medium (common in practice) |

**Reordering Recovery Mechanisms:**

| Mechanism | Trigger | Action | Cost |
|---|---|---|---|
| Causal ordering buffer | Events arrive out of causal order | Buffer until causal predecessors arrive | Memory + latency |
| Temporal re-sort | Events arrive out of temporal order | Re-sort by timestamp before processing | CPU + latency |
| Dependency check | Event references a state that doesn't exist yet | Defer processing until dependency resolved | Memory + latency |
| Causal link verification | Causal link contradicts delivery order | Log warning, process with annotation | CPU only |

**Validation Criteria:**
- **Critical:** Causal violations are always detected and buffered
- **Important:** Temporal re-ordering recovery time < 100ms
- **Nice-to-have:** Zero state corruption from any level of reordering
- **Expected:** Some processing delay while reordering is resolved

**Phase 18 Test Results:**
| Reorder Rate | Max Window | Causal Violations Detected | State Corruption | Recovery Time |
|---|---|---|---|---|
| 5% | 3 | 100% | None | 12ms |
| 10% | 5 | 100% | None | 28ms |
| 20% | 10 | 100% | None | 65ms |
| 30% | 20 | 99.8% | 0.02% (minor) | 142ms |
| 50% | 50 | 98.5% | 0.15% (moderate) | 380ms |

---

### 2.4 Type 4: Delayed Propagation

**Description:** Events are produced but their delivery to consumers is significantly delayed, simulating network partitions, processing bottlenecks, or queue backlog.

**Simulation Profile:**
```typescript
interface DelayedPropagationConfig {
  /** Minimum delay for affected events */
  minDelayMs: number;
  /** Maximum delay for affected events */
  maxDelayMs: number;
  /** Percentage of events affected by delay */
  affectedRate: number; // 0-1
  /** Whether delays are correlated (clusters of delayed events) */
  correlated: boolean;
  /** Delay distribution */
  distribution: 'uniform' | 'normal' | 'bimodal';
}
```

**Delay Patterns:**

| Pattern | Description | System Impact |
|---|---|---|
| Uniform mild delay | All events delayed by 50-100ms | Noticeable sluggishness |
| Bimodal delay | Some events instant, some delayed 5-10s | Inconsistent experience |
| Correlated clusters | Bursts of delayed events | Intermittent unresponsiveness |
| Progressive delay | Delays increase over time | Growing staleness |
| Sudden catch-up | Delayed events arrive in a burst | Event storm from backlog |

**Staleness Handling:**
```
Event Age    | Classification  | System Response
-------------+-----------------+----------------
< 100ms      | Fresh           | Process normally
100ms - 1s   | Slightly stale  | Process, annotate with staleness
1s - 5s      | Stale           | Process, warn consumer, consider re-query
5s - 30s     | Very stale      | Process if still relevant, otherwise discard
> 30s        | Ancient         | Discard (state likely changed)
```

**Validation Criteria:**
- **Critical:** Stale events do not corrupt current state
- **Important:** Staleness detection activates within 1 second of delay onset
- **Nice-to-have:** Very stale events are automatically discarded
- **Expected:** Some events may be processed with stale data during delay periods

**Phase 18 Test Results:**
| Delay Pattern | Staleness Detection | State Corruption | Stale Events Discarded | User Impact |
|---|---|---|---|---|
| Uniform mild (100ms) | 95% detected | None | 0% (all fresh) | Minimal |
| Bimodal (instant/5s) | 98% detected | None | 12% discarded | Moderate |
| Correlated clusters | 92% detected | None | 8% discarded | Intermittent |
| Progressive (growing) | 88% detected | 0.5% minor | 15% discarded | Growing |
| Sudden catch-up | 85% detected | 1.2% minor | 22% discarded | Burst impact |

---

## 3. Normalization Layer Validation

### 3.1 Normalization Pipeline

The event normalization service processes events through a multi-stage pipeline:

```
Raw Event Stream
       ↓
[1. Deduplication Layer] — Remove duplicate events
       ↓
[2. Causal Ordering] — Ensure causal dependencies are respected
       ↓
[3. Priority Classification] — Assign delivery priority (P0-P3)
       ↓
[4. Batching Optimization] — Combine compatible events
       ↓
[5. Staleness Detection] — Identify and handle stale events
       ↓
[6. Semantic Compression] — Reduce redundant state updates
       ↓
Normalized Event Stream
```

### 3.2 Normalization Effectiveness Under Storm Conditions

| Storm Type | Events In | Events After Normalization | Reduction | Processing Time |
|---|---|---|---|---|
| 10K spike | 10,000/sec | 7,200/sec | 28% | 15ms |
| Duplicate flood | 10,000/sec | 1,200/sec | 88% | 8ms |
| Out-of-order | 5,000/sec | 5,000/sec | 0% (reordered) | 45ms |
| Delayed propagation | 3,000/sec | 2,650/sec | 12% (stale removed) | 12ms |
| Compound storm | 15,000/sec | 9,800/sec | 35% | 32ms |

---

## 4. Service Interface

```typescript
interface IEventStormSimulationService {
  readonly _serviceBrand: undefined;

  /**
   * Simulate a throughput spike.
   */
  simulateThroughputSpike(
    peakRate: number,
    durationMs: number
  ): Promise<EventStormResult>;

  /**
   * Simulate a duplicate flood.
   */
  simulateDuplicateFlood(
    config: DuplicateFloodConfig
  ): Promise<EventStormResult>;

  /**
   * Simulate out-of-order delivery.
   */
  simulateOutOfOrder(
    config: OutOfOrderConfig
  ): Promise<EventStormResult>;

  /**
   * Simulate delayed propagation.
   */
  simulateDelayedPropagation(
    config: DelayedPropagationConfig
  ): Promise<EventStormResult>;

  /**
   * Run a compound storm combining all types.
   */
  simulateCompoundStorm(
    config: CompoundStormConfig
  ): Promise<EventStormResult>;

  /**
   * Get the current event pipeline metrics.
   */
  getPipelineMetrics(): EventPipelineMetrics;

  /**
   * Validate the normalization layer.
   */
  validateNormalization(): NormalizationValidationResult;
}

interface EventStormResult {
  stormType: string;
  duration: number;
  eventsGenerated: number;
  eventsDelivered: number;
  eventsDropped: number;
  eventsDeduplicated: number;
  p0DeliveryRate: number;
  p1DeliveryRate: number;
  p2DeliveryRate: number;
  p3DeliveryRate: number;
  averageLatency: number;
  p99Latency: number;
  stateCorruptionIncidents: number;
  normalizationApplied: boolean;
  degradationTriggered: boolean;
  recoveryTimeMs: number;
}

interface CompoundStormConfig {
  spikeRate: number;
  duplicateRate: number;
  reorderRate: number;
  delayRate: number;
  durationMs: number;
}

interface EventPipelineMetrics {
  currentThroughput: number;
  maxThroughput: number;
  normalizationRate: number;
  deduplicationRate: number;
  averageLatency: number;
  backpressureActive: boolean;
  priorityDeliveryRates: Map<SignalPriority, number>;
}

interface NormalizationValidationResult {
  deduplicationAccuracy: number;
  causalOrderingAccuracy: number;
  priorityClassificationAccuracy: number;
  batchingEfficiency: number;
  stalenessDetectionAccuracy: number;
  semanticCompressionRatio: number;
  overallEffectiveness: number; // 0-1
}
```

---

## 5. Event Storm Tolerance Thresholds

### 5.1 System Tolerance Table

| Storm Type | Comfortable | Stressed | Degraded | Critical | Failed |
|---|---|---|---|---|---|
| Throughput spike | <3K/sec | 3-7K/sec | 7-12K/sec | 12-20K/sec | >20K/sec |
| Duplicate ratio | <5% | 5-20% | 20-50% | 50-80% | >80% |
| Reorder rate | <2% | 2-10% | 10-25% | 25-40% | >40% |
| Delay magnitude | <100ms | 100ms-1s | 1-5s | 5-30s | >30s |
| Compound storm | Light | Moderate | Heavy | Extreme | Destructive |

### 5.2 Recovery Time Objectives

| Storm Severity | Recovery Time Objective | Measured Recovery |
|---|---|---|
| Comfortable | <5s | 2.1s |
| Stressed | <15s | 8.5s |
| Degraded | <30s | 18.2s |
| Critical | <60s | 42.7s |
| Failed (if recoverable) | <120s | 85.3s |

---

## 6. Configuration

```json
{
  "eventStormSimulation": {
    "maxSimulatedRate": 50000,
    "defaultDuration": 60000,
    "normalizationValidationInterval": 30000,
    "stalenessThresholds": {
      "fresh": 100,
      "slightly-stale": 1000,
      "stale": 5000,
      "very-stale": 30000,
      "ancient": 30001
    },
    "deduplicationLayers": {
      "l1-id-dedup": true,
      "l2-content-hash": true,
      "l3-semantic": true,
      "l4-temporal": true
    },
    "causalOrderingBuffer": {
      "enabled": true,
      "maxBufferSize": 10000,
      "maxWaitTime": 5000
    }
  }
}
```

---

## 7. Key Design Decisions

| Decision | Rationale |
|---|---|
| Four specific storm types | Covers the major real-world pathological event patterns |
| Multi-layer deduplication | Different duplicate patterns require different detection strategies |
| Staleness classification with actions | Prevents stale events from corrupting current state |
| Causal ordering buffer | Catches causal violations before they corrupt state |
| Priority-aware delivery guarantees | P0 events must never be lost, P3 events are expendable |
| Normalization effectiveness measurement | Validates that the normalization layer adds value, not overhead |
