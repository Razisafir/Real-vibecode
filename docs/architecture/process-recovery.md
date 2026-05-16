# Process Recovery

## Phase 8 — Terminal + Process Orchestration System

## Overview

Process Recovery ensures that interrupted, crashed, or failed processes can be recovered, resumed, or replayed through a checkpoint-based system. No execution state is lost — every process carries recovery metadata.

## Checkpoint System

### Checkpoint Structure

```typescript
interface IProcessCheckpoint {
  takenAt: number;                     // When checkpoint was taken
  stateAtCheckpoint: ProcessLifecycleState;
  command: string;                     // For re-execution
  args: readonly string[];
  cwd: URI | undefined;
  outputLineCount: number;             // How much output was produced
  restartsConsumed: number;            // Restart attempts used
  resumable: boolean;                  // Whether recovery is possible
  reason: 'suspend' | 'crash' | 'timeout' | 'approval-wait' | 'interrupt';
}
```

### Checkpoint Creation Triggers

| Trigger | Reason | Resumable |
|---------|--------|-----------|
| User suspend | `suspend` | Yes |
| Process crash | `crash` | If restart policy allows |
| Execution timeout | `timeout` | Yes |
| Approval wait | `approval-wait` | Yes |
| User cancel | `interrupt` | Yes (if not ephemeral) |

## Recovery Scenarios

### Scenario 1: Interrupted npm install

```
Process: npm install
State: Running → Suspended (user initiated)
Checkpoint: { command: "npm install", outputLineCount: 50, resumable: true }

Recovery:
  → resumeProcess(sessionId)
  → Re-executes "npm install" from scratch
  → npm cache handles partial recovery
```

### Scenario 2: Failed build chain

```
ProcessGroup: "CI Pipeline"
  ├── npm install → Completed ✓
  ├── npm run build → FAILED (exit code 1)
  └── npm test → Skipped (dependency failed)

Recovery:
  → Fix the build error
  → resumeProcess(buildSessionId)
  → Build re-executes with same parameters
```

### Scenario 3: Crashed dev server

```
Process: npm run dev (supervised)
State: Running → Crashed (heartbeat timeout)
Checkpoint: { command: "npm run dev", restartsConsumed: 1 }

Recovery (automatic):
  → Supervision detects crash
  → Restart policy: restartOnFailure=true, maxRestarts=3
  → Wait with exponential backoff
  → Re-execute "npm run dev"
  → Transition: Crashed → Restarting → Starting → Running
```

### Scenario 4: Paused autonomous workflow

```
Agent Plan: "Deploy feature"
  Step 1: Run tests → Completed ✓
  Step 2: Build → Suspended (user paused)
  Step 3: Deploy → Pending

Recovery:
  → resumeProcess(buildSessionId)
  → Build continues
  → Agent plan step resumes
  → If build succeeds, Step 3 proceeds
```

## Suspend/Resume Flow

```
Suspend Request
  ↓
Create checkpoint (command, args, cwd, output count)
  ↓
Stop supervision timer
  ↓
Transition → Suspended
  ↓
(Optionally) kill process PID
  ↓
Wait for resume...
  ↓
Resume Request
  ↓
Verify checkpoint exists and is resumable
  ↓
Re-execute command from checkpoint
  ↓
Transition → Starting → Running
  ↓
Restart supervision timer
```

## Partial Replay

For processes with large output buffers, recovery does NOT replay previous output. Instead:
- Previous output is preserved in the session's output buffer
- New execution starts fresh (the command re-runs)
- The output buffer accumulates both old and new output

This design is intentional: terminal commands are generally idempotent or cache-aware (npm, pip, cargo all handle partial runs).

## Graph Integration During Recovery

When a process is recovered:
1. A new graph node is created for the re-execution
2. The original node and recovery node are linked with a `DerivedFrom` edge
3. Execution lineage is preserved

```
Original Node: "Process: npm build"
  ↓ DerivedFrom
Recovery Node: "Process: npm build (restart #1)"
  ↓ DerivedFrom
Recovery Node: "Process: npm build (restart #2)"
```

## Orphaned Process Recovery

After IDE restart, sessions with `Running` state are detected:
1. Safety check identifies orphaned sessions
2. Orphaned sessions are marked as `Crashed`
3. Checkpoints are created for manual recovery
4. User can choose to resume or cancel

```typescript
const safety = processService.runSafetyChecks();
// safety.orphanedSessions = ['session-123', 'session-456']

await processService.cleanupOrphans();
// Cleans up all orphaned sessions
```
