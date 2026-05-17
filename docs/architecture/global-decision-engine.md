# Global Decision Engine — Architecture

## Overview

The Global Decision Engine provides deterministic arbitration for all system conflicts. It ensures that when multiple intents compete, when agent plans conflict with running processes, or when context disagrees with execution state, the system resolves conflicts consistently and predictably.

## Decision Types

| Type | Description |
|------|-------------|
| Allow | Intent may proceed |
| Block | Intent is blocked (policy, safety) |
| Defer | Intent should wait |
| Escalate | Intent requires human review |
| Merge | Compatible intents should merge |
| Reorder | Execution order should change |
| PauseSystem | System must pause |
| ResumeSystem | System may resume |
| RecoverSystem | System recovery needed |
| Cancel | Intent should be cancelled |

## Arbitration Rules

Rules are evaluated in priority order (higher = evaluated first). The first matching rule produces a decision.

### Default Rules (in priority order)

| Priority | Rule | Handles |
|----------|------|---------|
| 2000 | Safety Violation Block | SafetyViolation, PolicyViolation |
| 1000 | Critical Priority First | AgentCompetition, ResourceContention, FileConflict |
| 900 | Agent vs Process | AgentVsProcess, ProcessVsMutation |
| 800 | Context vs Graph | ContextVsGraph, GraphInconsistency |
| 700 | State Drift Resolution | StateDrift |

### Rule Evaluation Flow

```
Conflict Detected
     │
     ▼
Sort rules by rulePriority (descending)
     │
     ▼
For each rule:
  ├── Does rule handle this conflict type?
  │     ├── NO → skip to next rule
  │     └── YES → evaluate(conflict, intents)
  │               │
  │               └── Returns IGlobalDecision
  │
  └── No matching rule found → Escalate
```

## Conflict Types

| Type | Severity | Resolution |
|------|----------|-----------|
| AgentVsProcess | Medium | Delay agent until process completes |
| ProcessVsMutation | Medium | Queue or delay mutation |
| ContextVsGraph | Medium-High | Escalate or pause |
| AgentCompetition | High | Queue agents or escalate |
| FileConflict | Medium | Queue or cancel lower priority |
| GraphInconsistency | Critical | Pause system |
| StateDrift | Medium | Defer until reconciled |
| ResourceContention | High | Defer or queue |
| PolicyViolation | Critical | Block |
| SafetyViolation | Critical | Block |

## Conflict Detection Flow

When an intent is evaluated, the Brain checks for conflicts:

1. **Agent vs Process** — Is an agent trying to edit files while a build is running?
2. **File Conflicts** — Are multiple intents targeting the same files?
3. **Agent Competition** — Are multiple agents competing for the same resources?
4. **Resource Contention** — Is the system under load?
5. **Safety Violations** — Does the intent involve unsafe commands?

## Conflict Resolution Strategies

| Strategy | When Used |
|----------|-----------|
| DelayOne | Agent vs process: delay agent |
| QueueBoth | Two intents: execute sequentially |
| Merge | Compatible intents: combine |
| CancelLower | Priority conflict: cancel lower priority |
| Escalate | No auto-resolution: human needed |
| Rollback | Irreversible conflict: undo changes |
| PauseSystem | Critical conflict: pause everything |
| Sandbox | Unsafe operation: restrict |

## Decision Traceability

Every decision is recorded with:
- Which intents it affects
- The conflict that triggered it
- The arbitration rule that was applied
- Who made the decision (automatic/escalated/user)
- Whether it can be overridden

Decisions are queryable via `getRecentDecisions()` for auditing and debugging.
