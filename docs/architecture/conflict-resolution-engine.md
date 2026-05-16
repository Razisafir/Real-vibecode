# System Conflict Resolution Engine — Architecture

## Overview

The System Conflict Resolution Engine (`ISystemConflictResolverService`, #67) is the authoritative decision-making service for cross-layer conflicts that cannot be automatically resolved by the Context Merger (#66) or the Coherence Engine (#60). While those services handle routine reconciliation — aligning stale states, fixing minor drifts, and merging complementary context — the Conflict Resolution Engine handles the hard cases: situations where two layers have fundamentally different views of what should happen next, and the resolution requires a deliberate, principled decision about which view prevails.

The engine operates on a strict priority hierarchy: **Safety > Correctness > UX > Performance**. This hierarchy is not configurable, not overridable, and not subject to negotiation. A safety concern always wins over a correctness concern; a correctness concern always wins over a UX preference; a UX preference always wins over a performance optimization. This fixed ordering eliminates entire classes of pathological conflicts where, for example, a performance optimization might silently degrade safety or a UX enhancement might introduce correctness violations.

Without this service, cross-layer conflicts are resolved implicitly through timing races (whichever layer writes last wins), service initialization order (whichever service registers first dominates), or ad-hoc heuristics embedded in individual services. These implicit resolution mechanisms are fragile, unpredictable, and invisible — making it impossible to understand why the system chose one behavior over another. The Conflict Resolution Engine makes every conflict visible, every resolution traceable, and every decision principled.

## Conflict Detection Taxonomy

The engine detects and classifies four primary conflict categories, each requiring different resolution approaches:

### 1. UX vs. Execution Conflicts

These conflicts arise when the user-facing layer and the execution layer disagree about what should be displayed or performed:

| Conflict | Description | Example | Typical Resolution |
|----------|-------------|---------|-------------------|
| State display mismatch | UX shows state X, execution is in state Y | UX displays "running" while execution has completed | Correctness wins: align UX to execution |
| Action availability conflict | UX offers an action that execution cannot perform | "Run" button enabled but execution is throttled | Safety wins: disable action in UX |
| Progress disagreement | UX shows 60% progress, execution reports 30% | Progress bar uses estimated progress vs. actual | Correctness wins: use execution's measurement |
| Feedback latency conflict | UX wants immediate feedback, execution needs delayed response | Click → instant response vs. click → validation → response | UX wins unless safety or correctness is at stake |

### 2. Human vs. Automation Conflicts

These conflicts arise when a human workflow decision conflicts with an automated system decision:

| Conflict | Description | Example | Typical Resolution |
|----------|-------------|---------|-------------------|
| Intent override | Human wants action A, automation chose action B | Human clicks "refactor," automation queued "format" | Human wins: human intent is always authoritative |
| Approval bypass | Automation proceeds past a gate that requires human approval | Agent auto-continues past a human-approval checkpoint | Safety wins: halt and request approval |
| Priority disagreement | Human marks task as high-priority, automation deprioritized it | User prioritizes bug fix, automation queued feature work | Human wins for priority; safety still checked |
| Cancellation conflict | Human cancels an operation that automation has already completed | User clicks "cancel" after operation finished | Correctness wins: inform human of completion |

### 3. Replay vs. Live State Mismatches

These conflicts arise when the deterministic replay layer's recorded state diverges from the current live system state:

| Conflict | Description | Example | Typical Resolution |
|----------|-------------|---------|-------------------|
| Event ordering mismatch | Replay shows events in different order than live execution | Race condition in live execution not captured in replay | Correctness wins: align to replay's canonical order |
| State divergence | Replaying a sequence produces different state than live execution | Non-deterministic timing caused live execution to take a different branch | Correctness wins: flag as non-deterministic bug |
| Temporal anchor conflict | Replay timestamp disagrees with live system clock | Clock drift between recording and replay environments | Correctness wins: use replay's timeline as canonical |
| Snapshot inconsistency | Replay checkpoint state differs from live system at same point | Snapshot captured mid-mutation in live, completed in replay | Correctness wins: reconcile to most complete state |

### 4. Memory Inconsistencies

These conflicts arise when agent memory, graph state, or temporal memory contain contradictory information:

| Conflict | Description | Example | Typical Resolution |
|----------|-------------|---------|-------------------|
| Decision trace gap | Agent memory records a decision with no corresponding graph node | Agent decided to skip a step but graph shows it as pending | Correctness wins: align agent memory to graph state |
| Confidence conflict | Agent A reports high confidence in X, Agent B reports low confidence | Two agents disagree on the safety of a refactoring | Safety wins: use the lower confidence assessment |
| Temporal memory corruption | Temporal memory timestamp is in the future or before system boot | Clock skew or data corruption in temporal store | Correctness wins: reject corrupted entries |
| Capability registry conflict | Agent claims a capability that the capability system does not register | Agent believes it can execute terminal commands but capability was revoked | Safety wins: deny the capability |

## ConflictPriority Enum

Every conflict is assigned a `ConflictPriority` that determines the urgency and escalation path of its resolution:

| Priority | Meaning | Resolution Window | Escalation Path |
|----------|---------|------------------|-----------------|
| `Critical` | Safety-threatening conflict requiring immediate resolution | < 100ms | Automatic resolution, immediate notification |
| `High` | Correctness-threatening conflict requiring prompt resolution | < 1s | Automatic resolution with audit trail |
| `Medium` | UX-impacting conflict requiring timely resolution | < 10s | Automatic resolution with user notification option |
| `Low` | Performance-impacting conflict that can be resolved lazily | < 60s | Batched resolution, no notification |

### Priority Assignment Rules

```
Conflict Detected
      │
      ▼
┌─────────────────────────────┐
│   Priority Classifier        │
│                              │
│  Safety impact?    → Critical│
│  Correctness impact? → High  │
│  UX impact?        → Medium  │
│  Performance only?  → Low    │
│                              │
│  Human override involved?    │
│    → Promote one level       │
│                              │
│  Multiple domains affected?  │
│    → Promote one level       │
└──────────────┬──────────────┘
               │
               ▼
        Assigned ConflictPriority
```

## Resolution Hierarchy: Safety > Correctness > UX > Performance

This fixed hierarchy is the engine's most important architectural invariant. It means that:

### Safety Always Wins (Priority 1)

When any conflict has safety implications, the resolution always chooses the safest option regardless of correctness, UX, or performance considerations. Safety resolutions include:

- Halting execution that could cause data loss
- Enforcing stability throttles even when UX demands responsiveness
- Blocking operations that exceed capability boundaries
- Requiring human approval for actions with irreversible consequences

Safety resolutions are never deferred, never batched, and never overridden. A safety resolution takes effect immediately and synchronously.

### Correctness Beats UX (Priority 2)

When a conflict is between displaying/doing the correct thing and providing a smoother UX experience, correctness wins. The system will show an accurate loading state rather than a misleading progress bar; it will disable an action button rather than let the user click it and fail; it will report an error rather than silently swallowing it.

### UX Beats Performance (Priority 3)

When a conflict is between responsive user experience and optimal performance, UX wins. The system will spend CPU cycles rendering smooth animations rather than batch-updating the display; it will process user input immediately rather than queuing it for efficiency; it will show real-time feedback rather than deferring updates.

### Performance is the Default Loser (Priority 4)

Performance optimizations never override safety, correctness, or UX. A caching strategy that risks stale data loses to a correct-but-slower fresh read. A batching optimization that introduces visible latency loses to immediate-but-less-efficient processing. A computation shortcut that produces approximate results loses to an accurate-but-expensive calculation.

## Auto-Resolution Capability

The Conflict Resolution Engine can automatically resolve conflicts without human intervention when the resolution is unambiguous according to the priority hierarchy:

| Condition | Auto-Resolution Allowed | Rationale |
|-----------|------------------------|-----------|
| Conflict falls clearly within one priority domain | Yes | Hierarchy provides unambiguous resolution |
| Both sides agree on the facts but disagree on the action | Yes | Priority hierarchy resolves the disagreement |
| Human explicitly requested the overridden action | No | Escalate to human with explanation |
| Safety vs. safety conflict (both options have safety risks) | No | Escalate to human — system cannot choose between two safety risks |
| Resolution would change a previous human decision | No | Human decisions are preserved until explicitly reversed |

### Auto-Resolution Flow

```
┌──────────────────────────────────────────────────────────────────┐
│                  CONFLICT RESOLUTION ENGINE                       │
│                                                                  │
│  ┌──────────────────────────┐                                    │
│  │  Conflict Ingestion       │                                    │
│  │                           │                                    │
│  │  • Receive from Merger    │                                    │
│  │  • Receive from Coherence │                                    │
│  │  • Receive from services  │                                    │
│  └───────────┬──────────────┘                                    │
│              │                                                    │
│              ▼                                                    │
│  ┌──────────────────────────┐                                    │
│  │  Priority Classification │                                    │
│  │                           │                                    │
│  │  • Assess safety impact   │                                    │
│  │  • Assess correctness     │                                    │
│  │  • Assess UX impact       │                                    │
│  │  • Assess performance     │                                    │
│  │  • Assign ConflictPriority│                                    │
│  └───────────┬──────────────┘                                    │
│              │                                                    │
│              ▼                                                    │
│  ┌──────────────────────────┐                                    │
│  │  Auto-Resolution Check   │                                    │
│  │                           │                                    │
│  │  Can hierarchy resolve?   │──── No ────► Escalate to Human    │
│  │  Is human override        │             with Full Context      │
│  │    involved?              │──── Yes ──► Block Auto-Resolve     │
│  │  Is it safety vs. safety? │──── Yes ──► Escalate to Human      │
│  │  Would it reverse a       │──── Yes ──► Escalate to Human      │
│  │    human decision?        │                                    │
│  └───────────┬──────────────┘                                    │
│              │ Yes                                                │
│              ▼                                                    │
│  ┌──────────────────────────┐                                    │
│  │  Apply Resolution         │                                    │
│  │                           │                                    │
│  │  • Apply hierarchy rule   │                                    │
│  │  • Record resolution in   │                                    │
│  │    audit trail            │                                    │
│  │  • Notify affected layers │                                    │
│  │  • Emit resolution signal │                                    │
│  └──────────────────────────┘                                    │
└──────────────────────────────────────────────────────────────────┘
```

## Conflict Resolution Record

Every resolution — whether automatic or human-guided — produces a resolution record that preserves full provenance:

```typescript
interface IConflictResolutionRecord {
  readonly conflictId: string;
  readonly resolvedAt: number;
  readonly resolvedBy: ResolutionAuthority;  // 'hierarchy' | 'human' | 'deferred'
  readonly priority: ConflictPriority;
  readonly hierarchyApplied: 'Safety' | 'Correctness' | 'UX' | 'Performance';
  readonly versionA: IConflictVersion;
  readonly versionB: IConflictVersion;
  readonly winningVersion: 'A' | 'B' | 'Merged';
  readonly rationale: string;
  readonly affectedServices: ReadonlyArray<string>;
  readonly rollbackPossible: boolean;
}
```

## Escalation to Human

When auto-resolution is not permitted, the engine escalates the conflict to the human through the Human Workflow layer. The escalation includes:

1. **Full context**: The merged context from all four sources, so the human can see what each layer believes
2. **Priority analysis**: The engine's assessment of which priority domain applies and why
3. **Recommended resolution**: The engine's best guess based on the hierarchy, with confidence score
4. **Impact assessment**: What happens under each possible resolution
5. **Reversibility flag**: Whether the decision can be reversed later

The human's decision is recorded as authoritative and is never overridden by subsequent automatic resolutions unless the human explicitly requests it.

## Service Registration

| # | Service | Dependencies | Phase |
|---|---------|-------------|-------|
| 67 | ISystemConflictResolverService | SystemContextMerger, SystemCoherenceEngine, CrossLayerSignalBus, GlobalDecisionEngine, ApprovalSystem | 17 |

## Interface Contract

```typescript
interface ISystemConflictResolverService {
  readonly pendingConflicts: ReadonlyArray<IContextConflict>;
  readonly resolvedConflictsCount: number;
  readonly autoResolutionRate: number;

  resolveConflict(conflictId: string, strategy?: ResolutionStrategy): Promise<IConflictResolutionRecord>;
  escalateToHuman(conflictId: string): Promise<IEscalationResult>;
  getResolutionHistory(filter?: IResolutionFilter): ReadonlyArray<IConflictResolutionRecord>;
  registerConflictSource(source: IConflictSource): void;
  getConflictStatistics(): IConflictStatistics;
}
```

## Files

| File | Purpose |
|------|---------|
| `common/systemConflictResolver.ts` | All interfaces, types, enums (ConflictPriority, ResolutionAuthority, IConflictResolutionRecord) |
| `browser/systemConflictResolverService.ts` | Full runtime implementation with priority classification, auto-resolution, and escalation |
| `browser/phase17ConflictResolutionValidation.ts` | Validation tests for conflict detection, resolution hierarchy, and escalation |
