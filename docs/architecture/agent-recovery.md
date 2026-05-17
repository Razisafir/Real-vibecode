# Agent Recovery System

## Phase 7 — Agent Orchestration System

## Overview

The Agent Recovery System ensures that agent execution can survive partial failure, interruption, and unexpected termination. Agents are cancellable, suspendable, and resumable through a checkpoint-based recovery mechanism.

## Core Guarantees

1. **Agents are cancellable** — Any running plan can be cancelled
2. **Agents are suspendable** — Execution can be paused with state preservation
3. **Agents are resumable** — Suspended plans can continue from checkpoints
4. **Failed steps are isolated** — One step's failure doesn't corrupt other steps
5. **Orphaned executions are recoverable** — Plans interrupted by crashes can be found
6. **Rollback metadata is preserved** — Every step carries undo information

## Checkpoint System

### Step Checkpoint

When a step is interrupted or suspended, a checkpoint captures enough state to resume:

```typescript
interface IStepCheckpoint {
  readonly takenAt: number;                  // When checkpoint was taken
  readonly statusAtCheckpoint: StepStatus;   // Step status at checkpoint time
  readonly partialOutput: Record<string, unknown>;  // Partial results
  readonly filesModifiedSoFar: readonly URI[];       // Files already modified
  readonly nodesCreatedSoFar: readonly string[];     // Graph nodes created
  readonly resumable: boolean;              // Whether resume is possible
  readonly reason: 'interrupt' | 'suspend' | 'timeout' | 'approval-wait';
}
```

### Checkpoint Creation

Checkpoints are automatically created when:
- A plan is suspended (`suspendPlan()`)
- A step is interrupted by cancellation
- A step times out
- A step enters approval-wait state

### Checkpoint Recovery

When a plan is resumed:
1. Steps with resumable checkpoints are reset to `Ready`
2. Steps without checkpoints remain in their current state
3. The execution engine re-evaluates dependency ordering
4. Steps resume from their checkpoint state

```
Suspended Plan:
  Step 1: Completed ✓
  Step 2: Checkpoint (partial output) → Ready on resume
  Step 3: Pending → Stays Pending
  Step 4: Pending → Stays Pending

After Resume:
  Step 1: Completed ✓ (already done)
  Step 2: Ready → Executes with partial output
  Step 3: Ready (dependency: Step 2) → Waits for Step 2
  Step 4: Pending (dependency: Step 3) → Waits for Step 3
```

## Interrupt Scenarios

### User-Initiated Suspend

```typescript
// Suspend a running plan
await orchestrator.suspendPlan(planId);

// All executing steps get checkpoints
// Plan status → Suspended
// Agent lifecycle → Suspended
```

### Resume from Suspension

```typescript
// Resume a suspended plan
const result = await orchestrator.resumePlan(planId);

// Steps restored from checkpoints
// Plan status → Executing
// Agent lifecycle → Executing
```

### Cancellation

```typescript
// Cancel a plan (cannot be resumed)
await orchestrator.cancelPlan(planId, 'User cancelled');

// Active steps get 'interrupt' checkpoints
// All steps → Failed
// Plan status → Cancelled
// Cancellation token is triggered
```

### Timeout

When a step exceeds its `timeoutMs`:
1. A checkpoint is created with reason `'timeout'`
2. The step transitions to `Failed`
3. The plan may continue or fail based on `failFast`

## Failure Recovery Examples

### Example 1: Step Failure with Fail-Fast

```
Plan: "Refactor authentication"
  Step 1: Read auth.ts           → Completed ✓
  Step 2: Edit auth.ts           → FAILED (network error)
  Step 3: Update imports         → Skipped (dependency failed)
  Step 4: Update tests           → Skipped (dependency failed)

Result: Plan Failed
Rollback: Steps 1 can be rolled back if needed
```

### Example 2: Step Failure without Fail-Fast

```
Plan: "Create feature scaffolding" (failFast: false)
  Step 1: Create directory        → Completed ✓
  Step 2: Create types.ts         → Completed ✓
  Step 3: Create service.ts       → FAILED (file conflict)
  Step 4: Create routes.ts        → Skipped (depends on Step 3)
  Step 5: Create index.ts         → Completed ✓ (independent)

Result: Plan Completed (partial)
Rollback: Steps 1, 2, 5 can be rolled back
```

### Example 3: Plan Suspension and Resume

```
Plan: "Rename symbol across project"
  Step 1: Find references         → Completed ✓
  Step 2: Rename definition       → Executing...
  ── SUSPEND ──
  Step 2 checkpoint: { partialOutput: { editsApplied: 3 }, filesModifiedSoFar: ['user.ts'] }
  Step 3: Update imports          → Pending
  Step 4: Update tests            → Pending

  ── RESUME ──
  Step 2: Ready → Executes from checkpoint
  Step 3: Waits for Step 2
  Step 4: Waits for Step 3
```

## Rollback System

### Rollback Strategies

| Strategy | Description | When Used |
|----------|-------------|-----------|
| `inverse-edit` | Apply inverse edit operations | Default for file edits |
| `snapshot-restore` | Restore full file content snapshot | For complex multi-file edits |
| `custom` | Custom undo function | For special operations |
| `none` | Cannot be rolled back | For read-only operations |

### Plan Rollback

```typescript
// Roll back a completed or failed plan
await orchestrator.rollbackPlan(planId);

// Steps are rolled back in reverse order
// Each step's rollback strategy is applied
// Graph nodes are marked as rolled back
```

### Rollback Metadata Continuity

Every step carries its rollback strategy and any metadata needed for the rollback. This metadata is preserved even when:
- The plan is suspended and resumed
- The step fails and is retried
- The plan is cancelled

```
Step Created → Rollback strategy + metadata attached
Step Executing → Graph node created (linked to step)
Step Completed → Result includes modified files + node IDs
Step Rolled Back → Graph node marked as rolled back
```

## Orphaned Execution Recovery

Plans that are interrupted by crashes or unexpected termination:

1. Plans with `Executing` status after restart are detected
2. The system marks them as `Suspended` with recovery checkpoints
3. Users can choose to resume or cancel these plans
4. All graph nodes from partial execution remain for lineage tracking

## Execution Scope Cleanup

When a plan is cancelled or fails:
1. The execution scope in the graph service is ended
2. Any active graph nodes are completed with failure status
3. Cancellation tokens are disposed
4. Agent lifecycle is transitioned to terminal state
