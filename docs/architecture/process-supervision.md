# Process Supervision

## Phase 8 — Terminal + Process Orchestration System

## Overview

Process Supervision ensures long-running processes (dev servers, watchers, daemons) remain healthy, can be monitored, and recover from failures. No fire-and-forget execution — every process is tracked and observable.

## Supervision Architecture

```
Supervised Process
  ├── Heartbeat Monitor (10s interval)
  │   ├── Last beat timestamp
  │   ├── Missed beat counter
  │   └── Max missed beats (3)
  ├── Output Streaming
  │   ├── stdout → classified output
  │   ├── stderr → error detection
  │   └── ring buffer (bounded)
  ├── Restart Policy
  │   ├── Max restarts
  │   ├── Exponential backoff
  │   └── Restart conditions
  └── Health Tracking
      ├── Alive flag
      ├── Resource usage
      └── Duration tracking
```

## Heartbeat System

```typescript
interface IProcessHeartbeat {
  lastBeatAt: number;          // Last heartbeat timestamp
  intervalMs: number;          // Expected interval (default 30s)
  missedBeats: number;         // Consecutive missed beats
  maxMissedBeats: number;      // Threshold (default 3)
  alive: boolean;              // Whether process is considered alive
}
```

### Heartbeat Flow

```
Every 10 seconds:
  Check elapsed = now - lastBeatAt
  If elapsed > intervalMs * (missedBeats + 1):
    missedBeats++
    Emit: HeartbeatMissed observation
    If missedBeats >= maxMissedBeats:
      alive = false
      Handle unresponsive process
  Else:
    missedBeats = 0
    alive = true
```

## Restart Policies

```typescript
interface IRestartPolicy {
  restartOnFailure: boolean;       // Whether to restart on failure
  maxRestarts: number;             // Maximum restart attempts
  restartDelayMs: number;          // Base delay between restarts
  exponentialBackoff: boolean;     // Double delay each time
  restartOn: ProcessRestartCondition[];  // When to restart
}
```

### Restart Conditions

| Condition | Description |
|-----------|-------------|
| NonZeroExit | Process exited with non-zero code |
| Crash | Process killed by signal |
| OomKill | Out of memory kill |
| Unresponsive | Heartbeat timeout |
| Any | Restart on any failure |

### Restart Flow

```
Process Crashes
  ↓
Check restart policy conditions
  ↓
Match? Check restart count
  ↓
Count < maxRestarts?
  ↓ YES
  Create checkpoint
  ↓
  Wait delay (with backoff)
  ↓
  Transition → Restarting → Starting
  ↓
  Re-execute with same command
  ↓
NO: Mark as Failed
```

## Output Streaming

All process output is captured in a ring buffer:

```typescript
interface IProcessOutputChunk {
  sessionId: string;
  channel: StreamChannel;    // stdout | stderr | stdin | control
  text: string;
  timestamp: number;
  lineNumber: number;
  classification?: OutputClassification;
}
```

Output is classified in real-time for terminal intelligence:
- Error → Error classification + parsed errors
- Build → BuildOutput classification
- Test → TestResult classification
- Server → DevServer classification

## Process Tree Tracking

Processes are organized into groups for coordinated execution:

```
ProcessGroup: "CI Pipeline"
  ├── Session: "npm install" (Completed)
  ├── Session: "npm run build" (Running)
  ├── Session: "npm test" (Pending - depends on build)
  └── Session: "npm run deploy" (Pending - depends on test)
```

## Crash Recovery

When a supervised process crashes:

1. **Detection**: Heartbeat miss threshold exceeded or exit event
2. **Checkpoint**: State captured (command, args, cwd, output count, restart count)
3. **Decision**: Check restart policy conditions
4. **Recovery**: If restartable, re-execute with backoff
5. **Escalation**: If max restarts exceeded, mark as Crashed/Failed
6. **Observation**: Full event trail preserved for diagnostics
