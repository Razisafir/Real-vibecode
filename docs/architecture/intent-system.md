# Intent System — Architecture

## Overview

The Intent Model is the foundational concept of the Global Execution Brain. Every system action MUST be traceable back to an Intent. Intents provide the causal chain that links user requests to agent plans, process executions, file mutations, and graph updates.

## Intent Lifecycle

```
Created → Pending → Queued → Executing → Satisfied/Failed/Blocked/Superseded/Cancelled
                      │                         ↑
                      └─── Deferred ────────────┘
```

### Resolution States

| State | Meaning |
|-------|---------|
| Pending | Created but not evaluated |
| Queued | Evaluated and approved for execution |
| Executing | Currently being acted upon |
| Satisfied | Action completed successfully |
| Blocked | Blocked by conflict or policy |
| Superseded | Replaced by higher-priority intent |
| Cancelled | Cancelled before completion |
| Failed | Could not be satisfied |
| Deferred | Deferred for later resolution |

## Intent Sources

| Source | Description |
|--------|-------------|
| User | Human-initiated (typing, clicking, command) |
| Agent | AI agent-initiated (plan execution, autonomous action) |
| System | System-initiated (auto-save, health recovery, sync) |

## Priority System

| Priority | Value | Use Case |
|----------|-------|----------|
| Critical | 0 | System stability, data safety |
| High | 1 | User-visible operations |
| Normal | 2 | Standard operations |
| Low | 3 | Background/deferred operations |
| Idle | 4 | Only when nothing else pending |

## Intent Scopes

| Scope | Reach |
|-------|-------|
| File | Single file |
| Workspace | Multi-file operation |
| Process | Process execution |
| Agent | Agent's execution plan |
| System | Global coordination |

## Intent Chain Example

```
User: "Refactor authentication"
  │
  ├── Intent (User, High, Agent) — "Refactor auth module"
  │     │
  │     ├── Intent (Agent, Normal, Process) — "Run build"
  │     │     └── Intent (System, Normal, Graph) — "Update graph"
  │     │
  │     ├── Intent (Agent, Normal, File) — "Edit auth.ts"
  │     │     └── Intent (System, Normal, Graph) — "Track mutation"
  │     │
  │     └── Intent (Agent, Normal, File) — "Edit auth.test.ts"
  │           └── Intent (System, Normal, Graph) — "Track mutation"
```

## Intent Constraints

| Constraint | Purpose |
|-----------|---------|
| MaxDurationMs | Execution time limit |
| ProtectedFiles | Files that cannot be modified |
| MaxChildren | Maximum downstream intents |
| AllowSupersede | Whether superseded is allowed |
| AllowDefer | Whether deferral is allowed |
| ApprovalLevel | Required approval level |
| MaxRetries | Maximum retry count |

## Approval Flow

1. Intent created with `requiresApproval: true`
2. Decision engine evaluates → returns `Escalate` decision
3. Intent waits in `Pending` state
4. User/approver calls `approveIntent()`
5. Intent transitions to `Queued` and proceeds
