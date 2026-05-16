# Agent Runtime Architecture

## Phase 7 — Agent Orchestration System (Autonomous Execution Layer)

## Overview

The Agent Runtime Architecture provides a structured execution orchestration system for autonomous software workflows within the AI-native IDE. Agents plan and execute multi-step operations through a controlled pipeline that ensures all workspace mutations route through the Authoritative File Mutation Control Layer.

### Core Principle

**Agents NEVER directly mutate workspace state.** All mutations route through `IAIExecutionService`.

## Core Runtime Concepts

### Agent

An autonomous execution unit with declared capabilities. Agents are registered with the orchestration system and operate through execution plans.

```typescript
interface IAgent {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly lifecycleState: AgentLifecycleState;
  readonly capabilities: readonly IAgentCapabilityDeclaration[];
  readonly constraints: readonly IAgentConstraint[];
  readonly activePlanId: string | undefined;
  readonly completedPlanIds: readonly string[];
}
```

### Task

A unit of work assigned to an agent. Tasks are expressed as execution plans with structured steps.

### Plan

A structured multi-step execution strategy. Plans define goals, break them into ordered steps with dependencies, and coordinate execution through the AI Execution Kernel.

```
Goal
  ↓
Plan
  ↓
Steps (with dependencies, retry policies, rollback strategies)
  ↓
Actions (file-read, file-edit, workspace-edit, etc.)
  ↓
AIExecutionService (authoritative mutation gateway)
```

### Step

A single action within a plan. Steps are the atomic units of agent execution, each requiring a declared capability and routing through the mutation pipeline.

### ExecutionScope

The boundary within which an agent operates. Maps directly to the ExecutionGraphService's scope system for lineage tracking.

### Capability

A declared permission an agent requires. Capabilities are validated against the policy system before execution begins.

### Constraint

A restriction on agent behavior (e.g., max file modifications, protected files, max duration).

### Observation

A structured event produced by agent execution. Observations are consumed by the observability system and UI layer.

### Result

The outcome of a completed step or plan, including modified files, created graph nodes, and output data.

## Agent Lifecycle

```
                  ┌──────────┐
                  │   Idle   │ ← Initial state
                  └────┬─────┘
                       │ Plan created
                  ┌────▼─────┐
                  │ Planning │
                  └────┬─────┘
                       │ Plan approved
                  ┌────▼─────┐
                  │ Executing│ ← Active execution
                  └────┬─────┘
                  ┌────┴─────┐
            ┌─────┤          ├──────┐
            ▼     ▼          ▼      ▼
      ┌──────────┐ ┌────────┐ ┌─────────┐
      │ Waiting  │ │Suspended│ │Completed│
      └────┬─────┘ └────┬───┘ └─────────┘
           │             │ Resume
           │ Approval    │
           ▼             ▼
      ┌──────────┐ ┌──────────┐
      │ Executing│ │ Executing│
      └──────────┘ └──────────┘
           │
     ┌─────┴──────┐
     ▼            ▼
┌──────────┐ ┌────────┐
│  Failed  │ │Cancelled│
└──────────┘ └────────┘
```

### Lifecycle States

| State | Description | Transitions To |
|-------|-------------|----------------|
| Idle | Agent registered, no work assigned | Planning |
| Planning | Agent is constructing/has an execution plan | Executing |
| Executing | Agent is actively executing plan steps | Waiting, Suspended, Completed, Failed, Cancelled |
| Waiting | Agent awaiting approval or external input | Executing, Cancelled |
| Suspended | Agent execution paused (checkpointable) | Executing |
| Completed | Agent finished plan successfully | Idle |
| Failed | Agent execution failed | Idle |
| Cancelled | Agent execution was cancelled | Idle |

## Service Architecture

### IAgentOrchestratorService

The central service for agent orchestration. Manages agent registration, plan creation, execution, approval, and safety.

**Dependencies:**
- `IAIExecutionService` — Mutation gateway
- `IExecutionGraphService` — Graph lineage
- `IAIContextService` — Workspace intelligence
- `IObservabilityService` — Tracing/observability
- `IAIUnifiedStateService` — Unified state management

### DI Registration

```typescript
// Phase 7.11: AgentOrchestratorService
registerSingleton(IAgentOrchestratorService, AgentOrchestratorService, InstantiationType.Delayed);

// Phase 7.12: AgentUIService
registerSingleton(IAgentUIService, AgentUIService, InstantiationType.Delayed);
```

## Hard Architectural Rules

1. **Agents MUST NOT directly mutate workspace state** — All mutations route through `IAIExecutionService`
2. **Agents MUST operate through execution plans** — No ad-hoc mutations
3. **Agents MUST be observable + interruptible** — Every action produces observations and graph nodes
4. **Agent actions MUST become graph nodes** — Full lineage tracking
5. **Multi-agent support must be future-compatible** — Agent IDs, isolation, quota per agent
6. **Agent runtime must survive partial failure** — Checkpoints, rollback strategies, recovery

## File Structure

```
src/vs/workbench/services/aiExecution/
├── common/
│   ├── agentOrchestratorService.ts    # Core interfaces, types, lifecycle
│   └── agentUI.ts                     # UI view model interfaces
├── browser/
│   ├── agentOrchestratorService.ts    # Runtime implementation
│   ├── agentUIService.ts              # UI service implementation
│   └── phase7Validation.ts            # 10-test validation suite
```
