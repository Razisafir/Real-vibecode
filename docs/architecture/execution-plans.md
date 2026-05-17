# Execution Plans

## Phase 7 — Agent Orchestration System

## Overview

Execution Plans are the primary unit of agent work. They define a goal, break it into ordered steps with dependencies, and coordinate execution through the AI Execution Kernel. Plans are NOT flat task lists — they are structured execution graphs with dependency ordering, retry policies, rollback strategies, and approval gates.

## Plan Structure

```
Goal: "Rename symbol 'UserService' to 'AccountService' across the project"
  ↓
Plan (IExecutionPlan)
  ├── Step 1: Read files containing 'UserService' (capability: file-read)
  │   ├── dependencies: []
  │   ├── retry: { maxRetries: 2, on: [transient-error] }
  │   └── rollback: inverse-edit
  ├── Step 2: Query dependency chain (capability: context-query)
  │   ├── dependencies: [Step 1]
  │   └── rollback: none (read-only)
  ├── Step 3: Edit definition file (capability: file-edit)
  │   ├── dependencies: [Step 2]
  │   ├── approval: ask-per-step
  │   └── rollback: inverse-edit
  └── Step 4: Edit import sites (capability: workspace-edit)
      ├── dependencies: [Step 3]
      ├── approval: ask-per-step
      └── rollback: inverse-edit
```

## Plan Lifecycle

```
Drafting → PendingApproval → Approved → Executing → Completed
                                     ↘ Suspended → Executing
                                     ↘ Failed → (rollback) → RolledBack
                                     ↘ Cancelled
```

### Status Descriptions

| Status | Description |
|--------|-------------|
| Drafting | Plan is being constructed, not yet submitted |
| PendingApproval | Plan requires capability approval before execution |
| Approved | All capabilities approved, ready to execute |
| Executing | Plan steps are being executed in dependency order |
| Suspended | Plan execution paused, checkpoints saved |
| Completed | All steps completed successfully |
| Failed | One or more steps failed (with fail-fast) |
| Cancelled | Plan was cancelled by user or system |
| RolledBack | Plan was rolled back using step rollback strategies |

## Step Structure

Each step in a plan is a self-contained unit of execution:

```typescript
interface IPlanStep {
  readonly id: string;
  readonly label: string;
  readonly description: string;
  readonly requiredCapability: AgentCapability;
  readonly dependencies: readonly string[];     // Step IDs that must complete first
  status: StepStatus;                            // Current execution status
  readonly retryPolicy: IRetryPolicy;            // How to handle failures
  readonly timeoutMs: number;                    // Max execution time
  readonly rollbackStrategy: IRollbackStrategy;  // How to undo this step
  readonly requiresApproval: boolean;            // Whether approval is needed
  readonly approvalLevel: ApprovalLevel;         // What approval level
  readonly action: IStepAction;                  // What to execute
  retryCount: number;                            // Retries consumed
  graphNodeId: string | undefined;               // Linked graph node
  result: IStepResult | undefined;               // Execution result
  checkpoint: IStepCheckpoint | undefined;       // For interrupt/resume
}
```

## Step Status Flow

```
Pending → Ready → AwaitingApproval → Executing → Completed
                                    ↘ Failed → Retrying → Ready
                                    ↘ Skipped (dependency failed)
                                    ↘ RolledBack
```

## Dependency Resolution

Steps execute in dependency order. The execution engine:

1. Identifies all steps whose dependencies are satisfied
2. Executes ready steps (currently sequentially, future: parallelizable)
3. Marks completed steps for downstream dependency resolution
4. Handles failed dependencies based on `failFast` policy

### Fail-Fast vs Continue-On-Failure

- **failFast: true** (default) — If any step fails, the entire plan fails immediately
- **failFast: false** — Steps with failed dependencies are marked as `Skipped`, but independent steps continue execution

## Retry Policy

```typescript
interface IRetryPolicy {
  maxRetries: number;          // Maximum retry attempts
  retryDelayMs: number;        // Base delay between retries
  exponentialBackoff: boolean; // Double delay on each retry
  maxDurationMs: number;       // Total max retry time
  retryOn: StepFailureCondition[];  // When to retry
}
```

### Retry Conditions

| Condition | Description |
|-----------|-------------|
| TransientError | Network/timeout errors |
| UnexpectedResult | Step returned unexpected output |
| Interruption | Step was interrupted |
| PolicyViolation | Policy check failed (retryable) |
| DependencyUnavailable | External dependency missing |
| Any | Always retry |

## Execution Plan Examples

### Example 1: Rename Symbol Across Project

```typescript
const plan = orchestrator.createPlan(
  agentId,
  'Rename UserService to AccountService',
  'Rename the UserService symbol and update all import sites',
  [
    {
      id: 'find-references',
      label: 'Find all references to UserService',
      requiredCapability: AgentCapability.ContextQuery,
      dependencies: [],
      action: { type: StepActionType.ContextQuery, parameters: { symbol: 'UserService' } },
      // ...
    },
    {
      id: 'rename-definition',
      label: 'Rename symbol definition',
      requiredCapability: AgentCapability.FileEdit,
      dependencies: ['find-references'],
      requiresApproval: true,
      approvalLevel: ApprovalLevel.AskPerStep,
      action: { type: StepActionType.RenameSymbol, parameters: { from: 'UserService', to: 'AccountService' } },
      // ...
    },
    {
      id: 'update-imports',
      label: 'Update import statements',
      requiredCapability: AgentCapability.WorkspaceEdit,
      dependencies: ['rename-definition'],
      requiresApproval: true,
      approvalLevel: ApprovalLevel.AskPerStep,
      action: { type: StepActionType.OrganizeImports, parameters: {} },
      // ...
    },
  ]
);
```

### Example 2: Refactor Module

```typescript
const plan = orchestrator.createPlan(
  agentId,
  'Extract UserAPI into separate module',
  'Move UserAPI class from app.ts to user-api.ts',
  [
    { id: 'read-current', label: 'Read current module', ... },
    { id: 'create-module', label: 'Create new module file', ... },
    { id: 'move-class', label: 'Move class to new module', ... },
    { id: 'update-imports', label: 'Update all imports', ... },
  ],
  { failFast: true, maxDurationMs: 120000 }
);
```

### Example 3: Create Feature Scaffolding

```typescript
const plan = orchestrator.createPlan(
  agentId,
  'Create authentication feature scaffolding',
  'Generate the file structure for the auth feature',
  [
    { id: 'create-dir', label: 'Create feature directory', ... },
    { id: 'create-types', label: 'Create types file', ... },
    { id: 'create-service', label: 'Create service file', ... },
    { id: 'create-routes', label: 'Create routes file', ... },
    { id: 'create-index', label: 'Create index barrel', ... },
  ],
  { failFast: false }  // Create as much as possible even if some fail
);
```

## Graph Integration

Every plan execution creates:
1. A root `AiAction` node in the execution graph
2. An execution scope grouping all step nodes
3. `Parent` edges from the root to each step node
4. Step completion updates graph nodes with success/failure

This ensures full lineage tracking: every agent action can be traced through the execution graph back to its plan, agent, and originating step.
