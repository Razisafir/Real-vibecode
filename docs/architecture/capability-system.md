# Capability System

## Phase 7 — Agent Orchestration System

## Overview

The Capability System enforces scoped permissions for agent execution. Agents MUST declare all capabilities they need before execution begins. The policy system validates capabilities against approval levels, and undeclared capabilities are rejected at plan creation time.

## Design Principles

1. **Declare before execute** — Capabilities must be declared at agent registration
2. **Validate at plan creation** — Steps requiring undeclared capabilities are rejected
3. **Map to approval levels** — Each capability has a default approval level
4. **Risk-based escalation** — Higher risk capabilities require higher approval
5. **Ask-once efficiency** — Approved capabilities don't need re-approval within a plan

## Capabilities

| Capability | Risk Level | Default Approval | Description |
|-----------|------------|-----------------|-------------|
| `file-read` | Low | Automatic | Read file contents |
| `observe` | Low | Automatic | Observe execution events |
| `context-query` | Low | Automatic | Query context engine |
| `graph-query` | Low | Automatic | Query execution graph |
| `dependency-analysis` | Low | AskOnce | Analyze dependency chains |
| `plan-management` | Medium | AskOnce | Create/modify execution plans |
| `file-edit` | Medium | AskPerStep | Edit single file |
| `workspace-edit` | High | AskPerStep | Edit multiple files |
| `terminal-execution` | Critical | ManualReview | Execute terminal commands (future) |

## Capability Declaration

When registering an agent, capabilities are declared with risk levels and optional constraints:

```typescript
const agent = orchestrator.registerAgent(
  'Refactoring Agent',
  'Performs code refactoring operations',
  [
    { capability: AgentCapability.FileRead, riskLevel: CapabilityRiskLevel.Low },
    { capability: AgentCapability.FileEdit, riskLevel: CapabilityRiskLevel.Medium, justification: 'Needed for rename operations' },
    { capability: AgentCapability.ContextQuery, riskLevel: CapabilityRiskLevel.Low },
  ],
  [
    { type: AgentConstraintType.MaxFileModifications, value: 10, description: 'Limit modifications per plan' },
    { type: AgentConstraintType.ProtectedFiles, value: 'package.json,.env', description: 'Never modify config files' },
  ]
);
```

## Capability Validation Flow

```
Agent Registration
  ↓
  Capabilities declared
  ↓
Plan Creation
  ↓
  Step capabilities checked against declared capabilities
  ↓
  UNDECLARED → Reject plan creation (throw Error)
  ↓
  Declared → Continue
  ↓
  Evaluate approval levels
  ↓
  Map capability → approval level
  ↓
  Escalate if risk level is higher than default
  ↓
Plan Execution
  ↓
  For each step:
    1. Check capability against declaration
    2. Evaluate approval level
    3. Request approval if needed
    4. Execute if approved
```

## Risk-Based Escalation

The policy system automatically escalates approval levels based on declared risk:

```
If agent declares riskLevel = Critical:
  → ApprovalLevel = ManualReview (regardless of default)

If agent declares riskLevel = High:
  → If default = Automatic → escalate to AskPerStep
  → Otherwise → keep current level
```

This prevents agents from obtaining automatic approval for high-risk operations by ensuring the risk level drives the approval requirement upward.

## Capability Enforcement

### At Plan Creation

```typescript
// This will THROW because the agent didn't declare file-edit
const plan = orchestrator.createPlan(agentId, 'Edit plan', '...', [
  {
    id: 's1',
    requiredCapability: AgentCapability.FileEdit, // NOT DECLARED
    // ...
  }
]);
// Error: Step "s1" requires capability "file-edit" not declared by agent
```

### At Step Execution

Even if a plan passes creation validation, step execution checks:
1. The step's capability matches a declared capability
2. The approval level is satisfied
3. Any constraints on the capability are respected

## Constraints

Constraints restrict HOW capabilities can be used, not WHETHER they can be used.

| Constraint | Type | Example |
|-----------|------|---------|
| MaxFileModifications | number | `{ value: 10 }` — Max files modified per plan |
| MaxSteps | number | `{ value: 20 }` — Max steps in a plan |
| MaxDuration | number | `{ value: 300000 }` — Max execution time (ms) |
| MaxRetries | number | `{ value: 5 }` — Max retries across all steps |
| ProtectedFiles | string | `{ value: 'package.json,.env' }` — Never modify these |
| ProtectedDirectories | string | `{ value: 'node_modules,.git' }` — Never modify these |
| MaxPlanDepth | number | `{ value: 2 }` — Max nesting of sub-plans |
| AllowSubPlans | boolean | `{ value: false }` — No sub-plan creation |

## Future: Dynamic Capabilities

The capability system is designed for future extensibility:
- Extensions can register custom capabilities
- Capability providers can be hot-plugged
- Fine-grained file-path-based capabilities (e.g., `file-edit:src/features/**`)
