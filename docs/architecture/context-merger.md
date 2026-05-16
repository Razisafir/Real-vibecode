# System Context Merger — Architecture

## Overview

The System Context Merger (`ISystemContextMergerService`, #66) is the unified context reconciliation service for the Phase 17 Unification Bridge Layer. Across the system's 69 services, context — the operational knowledge that drives decisions, routing, and behavior — is fragmented across four distinct memory domains: graph execution state, agent memory, UX interaction state, and human workflow state. Each domain evolved its own state model, its own persistence strategy, and its own assumptions about what constitutes "current reality." The Context Merger service consolidates these divergent context streams into a single, lossless, coherent context that any service in any layer can query and trust.

Without this service, cross-layer operations suffer from context fragmentation: an agent makes a decision based on stale graph state because it never saw the human approval that changed the plan; the UX renders an obsolete view because it was never told that the stability layer throttled the operation; the execution engine proceeds with a plan that the human already cancelled through the workflow layer. Context fragmentation is the root cause of the most dangerous and subtle bugs in a multi-layer system — bugs where each layer is individually correct but collectively incoherent.

The Context Merger enforces a single, inviolable architectural rule: **merging MUST be lossless**. No context from any source is ever discarded during a merge. When contexts conflict, the merger preserves both versions and applies a resolution strategy that records the conflict, the resolution, and the provenance of each piece of context. This lossless guarantee means that any service can always trace back to the original context from any source, even after the merge has produced a unified view.

## Context Sources

The Context Merger draws from four primary context domains, each with its own schema, granularity, and update cadence:

| Source Domain | Service Layer | Context Type | Update Frequency | Schema |
|---------------|--------------|-------------|-----------------|--------|
| Graph Execution State | Execution (Phases 1–11) | `IGraphContext` | Real-time, on every graph mutation | Node states, edge transitions, execution position, active branches |
| Agent Memory | Execution (Phase 7) | `IAgentMemoryContext` | Per-agent-decision | Decision history, confidence scores, capability registry, task assignments |
| UX Interaction State | UX (Phases 13–15) | `IUXContext` | On every user interaction | Active surfaces, display mode, user focus, adaptive state, notification queue |
| Human Workflow State | Human Workflow (Phase 16) | `IHumanWorkflowContext` | On every workflow event | Momentum score, interruption budget, session state, intent persistence, fatigue level |

### Source Context Schemas

```typescript
interface IGraphContext {
  readonly executionId: string;
  readonly currentNodeId: string;
  readonly nodeStates: ReadonlyMap<string, NodeExecutionState>;
  readonly activeEdges: ReadonlyArray<IEdgeTransition>;
  readonly branchStack: ReadonlyArray<IBranchPoint>;
  readonly executionTimestamp: number;
}

interface IAgentMemoryContext {
  readonly agentId: string;
  readonly decisionHistory: ReadonlyArray<IAgentDecision>;
  readonly confidenceVector: ReadonlyMap<string, number>;
  readonly activeCapabilities: ReadonlyArray<string>;
  readonly taskAssignments: ReadonlyMap<string, string>;
  readonly memoryTimestamp: number;
}

interface IUXContext {
  readonly surfaceId: string;
  readonly displayMode: UXDisplayMode;
  readonly userFocus: IUserFocusState;
  readonly adaptiveState: IAdaptiveSurfaceState;
  readonly notificationQueue: ReadonlyArray<INotificationState>;
  readonly uxTimestamp: number;
}

interface IHumanWorkflowContext {
  readonly momentumScore: number;
  readonly interruptionBudget: number;
  readonly sessionPhase: SessionPhase;
  readonly activeIntent: IIntentState;
  readonly fatigueLevel: number;
  readonly workflowTimestamp: number;
}
```

## Merged Context Structure

The output of a context merge is a `IMergedSystemContext` that contains the unified view plus full provenance tracking:

```typescript
interface IMergedSystemContext {
  readonly mergeId: string;
  readonly mergeTimestamp: number;
  readonly graph: IGraphContext;
  readonly agentMemory: IAgentMemoryContext;
  readonly ux: IUXContext;
  readonly humanWorkflow: IHumanWorkflowContext;
  readonly conflicts: ReadonlyArray<IContextConflict>;
  readonly resolutions: ReadonlyArray<IConflictResolution>;
  readonly metadata: IMergeMetadata;
}

interface IMergeMetadata {
  readonly sourceVersions: ReadonlyMap<ContextSource, number>;
  readonly mergeDurationMs: number;
  readonly lossless: true;        // Always true — enforced by type system
  readonly conflictCount: number;
  readonly resolutionCount: number;
}
```

## Conflict Detection

When the same logical entity is described differently across context sources, a conflict is detected. The Context Merger identifies conflicts through a structured comparison process:

### Conflict Detection Domains

| Conflict Domain | Example | Severity |
|----------------|---------|----------|
| State disagreement | Graph says "executing," UX says "idle" | High |
| Intent divergence | Human workflow intent differs from execution intent | Critical |
| Temporal inconsistency | Agent memory timestamp precedes graph state change it references | Medium |
| Resource conflict | UX promotes a resource that stability has throttled | High |
| Priority disagreement | Human workflow marks task as high-priority, execution has it queued as low | Medium |
| Presence disagreement | Agent memory lists agent as active, graph shows no active node for it | High |

### Conflict Detection Flow

```
┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│  Graph State  │  │ Agent Memory │  │   UX State   │  │ Human Wkflow │
└──────┬───────┘  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘
       │                 │                  │                  │
       ▼                 ▼                  ▼                  ▼
┌──────────────────────────────────────────────────────────────────────┐
│                     CONTEXT MERGER                                    │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐    │
│  │  1. Schema Normalization                                     │    │
│  │     • Map each source to canonical entity model              │    │
│  │     • Align timestamps to common clock                       │    │
│  │     • Resolve entity ID differences across layers            │    │
│  └──────────────────────────┬───────────────────────────────────┘    │
│                             │                                        │
│  ┌──────────────────────────▼───────────────────────────────────┐    │
│  │  2. Entity Matching                                          │    │
│  │     • Identify same logical entity across sources            │    │
│  │     • Build entity overlap map                               │    │
│  │     • Tag unique vs. shared entities                         │    │
│  └──────────────────────────┬───────────────────────────────────┘    │
│                             │                                        │
│  ┌──────────────────────────▼───────────────────────────────────┐    │
│  │  3. Conflict Detection                                       │    │
│  │     • Compare shared entity properties across sources        │    │
│  │     • Flag property value differences as conflicts           │    │
│  │     • Classify severity based on domain and impact           │    │
│  └──────────────────────────┬───────────────────────────────────┘    │
│                             │                                        │
│  ┌──────────────────────────▼───────────────────────────────────┐    │
│  │  4. Conflict Resolution                                      │    │
│  │     • Apply resolution strategy per conflict                 │    │
│  │     • Record both versions (lossless guarantee)              │    │
│  │     • Generate resolution provenance record                  │    │
│  └──────────────────────────┬───────────────────────────────────┘    │
│                             │                                        │
│  ┌──────────────────────────▼───────────────────────────────────┐    │
│  │  5. Merged Context Assembly                                  │    │
│  │     • Build IMergedSystemContext with unified view           │    │
│  │     • Attach all conflicts and resolutions                   │    │
│  │     • Verify lossless invariant (no data dropped)            │    │
│  └──────────────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────────────┘
```

## Context Conflict Resolution Strategies

When a conflict is detected between context sources, the merger applies one of four resolution strategies. The choice of strategy depends on the conflict domain, severity, and the nature of the disagreement:

| Strategy | Meaning | When Used | Lossless Guarantee |
|----------|---------|-----------|-------------------|
| `TakeA` | Accept version from source A, preserve version B in conflict record | Source A is authoritative for this domain (e.g., graph state for execution status) | Both versions stored; resolution metadata records why A was chosen |
| `TakeB` | Accept version from source B, preserve version A in conflict record | Source B is authoritative for this domain (e.g., human workflow for intent priority) | Both versions stored; resolution metadata records why B was chosen |
| `Merge` | Combine both versions into a superset that satisfies both | Versions are complementary, not contradictory (e.g., UX knows about surface state, graph knows about execution state) | No data discarded; merged result is a strict superset |
| `Defer` | Record the conflict without resolution, escalate to Conflict Resolution Engine (#67) | Conflict is too complex or too consequential for automatic resolution | Both versions stored intact; conflict flagged for external resolution |

### Resolution Strategy Selection Rules

| Conflict Domain | Default Strategy | Authoritative Source | Override Condition |
|----------------|-----------------|---------------------|-------------------|
| Execution state disagreement | `TakeA` (Graph) | Graph Execution State | If human explicitly overrode state → `TakeB` (Human) |
| Intent divergence | `TakeB` (Human) | Human Workflow State | Never overridden — human intent is always authoritative |
| Temporal inconsistency | `Merge` | N/A — reconcile timestamps | If timestamps are irreconcilable → `Defer` |
| Resource conflict | `Defer` | Escalate to Conflict Resolver | Stability throttle cannot be overridden by merger |
| Priority disagreement | `TakeB` (Human) | Human Workflow State | Unless safety-critical → `TakeA` (Graph) |
| Presence disagreement | `TakeA` (Graph) | Graph Execution State | If agent was recently reassigned → `Merge` with transition record |

### Lossless Invariant Enforcement

The lossless invariant is enforced at three levels:

1. **Type-level enforcement**: The `IMergedSystemContext.metadata.lossless` field is typed as literal `true`, not `boolean`. The type system prevents constructing a merged context without asserting losslessness.
2. **Runtime verification**: After every merge, the service runs a `verifyLosslessInvariant()` check that compares the total information content of the output against the total information content of all inputs. Any discrepancy triggers an immediate error and merge rollback.
3. **Audit trail**: Every conflict record preserves both the winning and losing versions, along with the resolution strategy applied and the rationale. This means that even a `TakeA` resolution does not lose the `TakeB` version — it is always available in the conflict record.

## Context Merge Triggers

Context merges are triggered by both time-based and event-based mechanisms:

| Trigger Type | Frequency / Condition | Scope |
|-------------|----------------------|-------|
| Periodic full merge | Every 5 seconds | All four sources, full comparison |
| Event-driven partial merge | On any cross-layer signal | Only the sources affected by the signal |
| On-demand merge | When any service requests `getMergedContext()` | All sources, full comparison |
| Pre-decision merge | Before any cross-layer decision is made | Sources relevant to the decision domain |
| Post-recovery merge | After a Coherence Engine reconciliation | All sources, with reconciliation adjustments |

## Performance Characteristics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Full merge latency | < 50ms | Time from merge trigger to IMergedSystemContext output |
| Partial merge latency | < 10ms | Time from event trigger to partial context update |
| Memory overhead | < 2MB | Additional memory for conflict records and provenance |
| Lossless verification | < 5ms | Time for verifyLosslessInvariant() check |
| Maximum conflict records | 10,000 | Before compaction (compaction preserves last 1,000 per domain) |

## Service Registration

| # | Service | Dependencies | Phase |
|---|---------|-------------|-------|
| 66 | ISystemContextMergerService | CrossLayerSignalBus, SystemCoherenceEngine, SystemConflictResolver, TemporalMemory, GlobalEventNormalization | 17 |

## Interface Contract

```typescript
interface ISystemContextMergerService {
  readonly lastMergeTimestamp: number;
  readonly activeConflictCount: number;
  readonly totalMergesPerformed: number;

  getMergedContext(): Promise<IMergedSystemContext>;
  getMergedContextForDomain(domain: ContextDomain): Promise<IPartialMergedContext>;
  getConflicts(filter?: IConflictFilter): ReadonlyArray<IContextConflict>;
  getConflictResolution(conflictId: string): IConflictResolution;
  verifyLosslessInvariant(merged: IMergedSystemContext): ILosslessVerificationResult;
  subscribeToMergeEvents(observer: IMergeEventObserver): IDisposable;
}
```

## Files

| File | Purpose |
|------|---------|
| `common/systemContextMerger.ts` | All interfaces, types, enums, conflict resolution strategy definitions |
| `browser/systemContextMergerService.ts` | Full runtime implementation with schema normalization, entity matching, conflict detection, and lossless verification |
| `browser/phase17ContextMergerValidation.ts` | Validation tests for merge correctness, lossless invariant, and conflict resolution |
