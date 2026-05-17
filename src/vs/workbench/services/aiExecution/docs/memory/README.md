# Persistent Project Memory System

## Overview

Phase 25 introduces real persistent project memory that survives crashes and restarts. Memory is stored using VS Code's IStorageService, which persists data to disk.

## Memory Types

| Type | Priority | Purpose | TTL |
|------|----------|---------|-----|
| ProjectSummary | Critical | High-level project description | None |
| ArchitectureDecision | Critical | Key architecture choices | None |
| MilestoneHistory | High | Record of completed milestones | 30 days |
| ExecutionHistory | Medium | Details of execution runs | 14 days |
| FileChangeHistory | Medium | Files modified during execution | 14 days |
| UserPreference | High | User choices and settings | None |
| CorrectionMemory | High | User corrections to AI output | None |
| PlanningMemory | High | AI-generated plans | 30 days |
| RepositoryUnderstanding | High | Codebase analysis | 7 days |
| FailureHistory | Medium | Record of failures | 30 days |
| RetryHistory | Low | Retry attempts | 14 days |

## Services

### IProjectMemoryService (#145)
Core memory CRUD with persistence, checkpoints, and crash recovery.

### IMemoryCompactionService (#146)
Rule-based compaction to keep memory within token budgets. Strategies: summarize, merge, archive, delete.

### IExecutionTimelineService (#147)
Append-only log of all execution events with time-range queries.

## Crash Recovery

1. On startup, the service checks for a crash flag in storage
2. If a crash is detected (flag was set to "active" but not "clean"), the last checkpoint is restored
3. Project memory, execution state, and timeline are all recovered
4. The user is notified that recovery occurred

## Checkpoints

Checkpoints are full snapshots of project memory state. They are created:
- Before execution starts (PreExecution)
- After each milestone completes (PostMilestone)
- Before risky operations (PreRiskyOperation)
- On manual save (ManualSave)
- On auto-save interval (AutoSave)
- Before rollback operations (PreRollback)

## Honest Limitations

- **Not infinite memory**: Entries are bounded by storage quotas and token budgets
- **Not AGI understanding**: This is structured key-value storage with access tracking
- **Perfect recall not guaranteed**: Compaction may summarize older entries
- **Crash recovery depends on VS Code storage reliability**: If storage itself is corrupted, recovery may fail
- **Token counting is heuristic**: Real tokenization requires model-specific tokenizers
