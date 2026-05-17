# Process Orchestration Architecture

## Phase 8 — Terminal + Process Orchestration System

## Overview

The Process Orchestration System provides a policy-controlled execution environment for terminal processes, builds, tests, dev servers, and AI-driven command workflows within the AI-native IDE. All process execution routes through the orchestrator — no raw terminal access is permitted.

### Core Principle

**Agents MUST NOT directly access raw terminal APIs.** All execution routes through `IAIProcessOrchestratorService`.

## Core Concepts

### ProcessSession
The primary unit of process tracking. Every command execution creates a session with lifecycle state, output buffer, checkpoints, and graph linkage.

### ExecutionCommand
A structured request to execute a command with mode, policy, restart, and agent metadata.

### ExecutionPolicy
A named policy that governs command execution with risk thresholds, timeouts, and default decisions.

### ProcessGroup
A grouping mechanism for coordinated execution (e.g., build + test + deploy pipeline).

### RuntimeEnvironment
Environment configuration (cwd, env vars) passed to process sessions.

### ProcessObservation
Structured events produced by process execution for the observability system.

### StreamChannel
Output channels (stdout, stderr, stdin, control) with classification.

### ExecutionCheckpoint
Snapshot of process state for recovery, suspend/resume, and crash recovery.

## Process Lifecycle

```
Created → PendingApproval → Starting → Running → Completed
                                            ↘ Suspended → Starting (resume)
                                            ↘ Crashed → Restarting → Starting
                                            ↘ Failed
                                            ↘ Cancelled
                                     → Disposed
```

| State | Description |
|-------|-------------|
| Created | Session created, not yet started |
| PendingApproval | Awaiting policy approval |
| Starting | Process spawning |
| Running | Process executing |
| Suspended | Paused with checkpoint |
| Restarting | Recovering from crash |
| Completed | Normal exit (code 0) |
| Failed | Non-zero exit |
| Cancelled | Killed by user/system |
| Crashed | Unexpected termination |
| Disposed | Cleaned up |

## Execution Modes

| Mode | Description | Use Case |
|------|-------------|----------|
| Foreground | Block until completion | Quick commands, queries |
| Background | Return immediately, stream output | Long builds |
| Supervised | Auto-restart, health monitoring | Dev servers |
| Ephemeral | Short-lived, auto-cleanup | One-shot scripts |
| PersistentSession | Can reconnect | Interactive terminals |

## Service Architecture

### IAIProcessOrchestratorService

The central service for process orchestration.

**Dependencies:**
- `IAIExecutionService` — Mutation gateway
- `IExecutionGraphService` — Graph lineage
- `IObservabilityService` — Tracing
- `IAgentOrchestratorService` — Agent coordination

### DI Registration

```
Phase 8.13: IAIProcessOrchestratorService → AIProcessOrchestratorService (Delayed)
Phase 8.14: IAIProcessUIService → AIProcessUIService (Delayed)
```

## File Structure

```
src/vs/workbench/services/aiExecution/
├── common/
│   ├── aiProcessOrchestratorService.ts    # Core interfaces, types, enums
│   └── aiProcessUI.ts                     # UI view model interfaces
├── browser/
│   ├── aiProcessOrchestratorService.ts    # Runtime implementation
│   ├── aiProcessUIService.ts              # UI service implementation
│   └── phase8Validation.ts               # 10-test validation suite
```
