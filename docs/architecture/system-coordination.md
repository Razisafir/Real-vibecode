# System Coordination — Architecture

## Overview

System coordination encompasses three critical subsystems: the Cross-System Event Bus, System Synchronization Layer, and Execution Loop Orchestration. Together, they ensure all subsystems share a consistent view of the world, events propagate correctly, and the global execution heartbeat runs smoothly.

## Cross-System Event Bus

### Event Categories

| Category | Source Subsystems |
|----------|------------------|
| Execution | AIExecutionService |
| Process | AIProcessOrchestratorService |
| Agent | AgentOrchestratorService |
| Context | AIContextService |
| Graph | ExecutionGraphService |
| Intent | GlobalExecutionBrain |
| Decision | GlobalDecisionEngine |
| Health | HealthMonitor |
| Sync | SynchronizationLayer |
| Coherence | CoherenceValidator |

### Event Sources

| Source | Description |
|--------|-------------|
| ExecutionService | File mutations, workspace edits |
| AgentOrchestrator | Agent lifecycle, plan status |
| ProcessOrchestrator | Process lifecycle, output |
| ExecutionGraph | Node/edge creation |
| ContextEngine | Domain updates |
| UnifiedState | Phase transitions |
| Observability | Debug events |
| GlobalBrain | Brain-level events |

### Event Flow

```
Subsystem Event
     │
     ▼
Brain.emitEvent() ←── Normalized to IBrainEvent
     │
     ├── Category: Execution/Process/Agent/Context/Graph/Intent/Decision/Health/Sync/Coherence
     ├── Severity: Info/Warning/Error/Critical
     ├── Source: Which subsystem produced it
     └── Links: intentId, graphNodeId, agentId, processSessionId
     │
     ▼
Event Bus (in-memory ring buffer, max 10,000 events)
     │
     ├── Subscribers with filters (category, source, severity, intentId, agentId)
     └── Dashboard consumption
```

### Subscription Filters

Subscribers can filter events by:
- **Categories** — Only receive specific event categories
- **Sources** — Only receive events from specific subsystems
- **MinSeverity** — Only receive events at or above a severity level
- **IntentId** — Only receive events related to a specific intent
- **AgentId** — Only receive events related to a specific agent

## System Synchronization Layer

### Synchronization Checkpoint

A `ISyncCheckpoint` captures the state of all subsystems at a point in time:

| Field | Source |
|-------|--------|
| runtimePhase | UnifiedStateService |
| activeExecutionCount | UnifiedStateService |
| activeAgentCount | AgentOrchestratorService |
| activeProcessCount | ProcessOrchestratorService |
| activeIntentCount | GlobalExecutionBrain |
| graphNodeCount | ExecutionGraphService |
| graphEdgeCount | ExecutionGraphService |
| unresolvedConflictCount | ConflictResolver |
| hasDrift | Drift detection |
| driftDetails | Specific drifts found |

### Drift Detection

Drift is detected when subsystems report inconsistent state:

| Drift | Detection Method | Severity |
|-------|-----------------|----------|
| Phase vs Execution | State phase doesn't match execution flag | minor |
| Context vs Graph Activity | Context is stale while graph is active | minor |
| Agent vs Process | Executing agents without process sessions | major |

### Reconciliation

Reconciliation is a periodic cycle that:
1. Takes a sync checkpoint
2. Detects drift between subsystems
3. Auto-corrects minor drifts (resync, refresh)
4. Reports major/critical drifts for manual resolution
5. Returns convergence status

## Execution Loop Orchestration

### Global Loop Phases

```
┌─────────────────────────────────────────────────────────┐
│                    EXECUTION LOOP                        │
│                                                         │
│   Idle ──→ ContextAnalysis ──→ AgentPlanning            │
│    ▲                                    │               │
│    │                                    ▼               │
│   Observability ←── StateSync ←── GraphUpdate           │
│    │                    ▲                                │
│    │                    │                                │
│    └──── ProcessExecution ─────────────────┘             │
│                                                         │
│   Paused ◄── (conflict, recovery, manual)               │
└─────────────────────────────────────────────────────────┘
```

### Loop Configuration

| Parameter | Default | Description |
|-----------|---------|-------------|
| tickIntervalMs | 100 | Main loop tick interval |
| maxConcurrentIntents | 10 | Maximum concurrent intents |
| maxIterationsPerCycle | 1000 | Max iterations before yield |
| reconciliationIntervalMs | 5000 | Sync reconciliation interval |
| healthCheckIntervalMs | 3000 | Health check interval |
| coherenceIntervalMs | 10000 | Coherence validation interval |

### Loop Tick Lifecycle

Each tick of the loop:
1. Check for paused state
2. Find highest-priority queued intent
3. Transition to appropriate phase based on intent action type
4. Evaluate intent through decision engine
5. Transition through GraphUpdate → StateSync → Observability phases
6. Record tick in history
7. Return to Idle
