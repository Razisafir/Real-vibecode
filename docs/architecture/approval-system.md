# Approval System

## Phase 7 — Agent Orchestration System

## Overview

The Approval System provides a framework for gating agent actions behind user approval. High-risk operations require explicit human consent, while low-risk operations proceed automatically. The system integrates with the Capability System and AIExecutionService policy layer.

## Approval Levels

| Level | Description | When Used |
|-------|-------------|-----------|
| `automatic` | No approval needed — action executes immediately | Read-only operations, context queries |
| `ask-once` | Ask once per plan — first occurrence requires approval | Dependency analysis, plan management |
| `ask-per-step` | Ask for every step that uses this capability | File edits, workspace edits |
| `manual-review` | Human must explicitly approve with justification | Terminal execution, critical operations |

## Approval Flow

```
Step Requires Approval
  ↓
Determine Approval Level
  ↓
┌──────────────────────────────────────────────┐
│  Level = Automatic                           │
│  → Execute immediately                       │
├──────────────────────────────────────────────┤
│  Level = AskOnce                             │
│  → Check: Already approved in this plan?     │
│    YES → Execute immediately                 │
│    NO  → Create approval request             │
│           → Wait for approval                │
│           → Approved? Execute                │
│           → Denied? Fail step                │
├──────────────────────────────────────────────┤
│  Level = AskPerStep                          │
│  → Create approval request for this step     │
│  → Wait for approval                        │
│  → Approved? Execute                        │
│  → Denied? Fail step                        │
├──────────────────────────────────────────────┤
│  Level = ManualReview                        │
│  → Create manual review request             │
│  → Wait for explicit human approval          │
│  → Must include justification               │
│  → Timeout = 2 minutes                      │
│  → Expired? Fail step                       │
└──────────────────────────────────────────────┘
```

## Approval Escalation

The system automatically escalates approval levels based on risk:

```
Agent Declares Risk: Critical
  → Approval Level → ManualReview (regardless of default)

Agent Declares Risk: High
  → If default = Automatic → escalate to AskPerStep
  → If default ≥ AskPerStep → keep current level

Default mapping (from Capability System):
  file-read       → Automatic
  context-query   → Automatic
  graph-query     → Automatic
  observe         → Automatic
  dependency-analysis → AskOnce
  plan-management → AskOnce
  file-edit       → AskPerStep
  workspace-edit  → AskPerStep
  terminal-exec   → ManualReview
```

### Escalation Flow Diagram

```
Capability Default: Automatic
  + Risk Level: Low      → Automatic (no change)
  + Risk Level: Medium   → AskOnce (escalate)
  + Risk Level: High     → AskPerStep (escalate)
  + Risk Level: Critical → ManualReview (escalate)

Capability Default: AskPerStep
  + Risk Level: Low      → AskPerStep (no change)
  + Risk Level: Medium   → AskPerStep (no change)
  + Risk Level: High     → AskPerStep (no change)
  + Risk Level: Critical → ManualReview (escalate)
```

## Approval Request

```typescript
interface IApprovalRequest {
  readonly id: string;              // Unique request ID
  readonly agentId: string;         // Requesting agent
  readonly stepId: string;          // Step needing approval
  readonly capability: AgentCapability;
  readonly level: ApprovalLevel;
  readonly description: string;     // What will happen
  readonly riskLevel: CapabilityRiskLevel;
  readonly affectedFiles: readonly URI[];  // Files that will change
  readonly reversible: boolean;     // Can this be undone?
  readonly requestedAt: number;
  result: ApprovalResult;           // Pending → Approved/Denied/Expired/Escalated
  readonly resolvedBy?: string;     // Who approved/denied
  readonly resolvedAt?: number;
  readonly denialReason?: string;
}
```

## Approval Results

| Result | Description |
|--------|-------------|
| `approved` | Request granted — proceed with execution |
| `denied` | Request rejected — do not execute |
| `pending` | Awaiting response |
| `expired` | Approval timeout — request again |
| `escalated` | Sent to higher approval level |

## Approval Queue UI

The UI layer exposes an `IAgentUIService` with approval queue management:

```typescript
// Get pending approvals
const queue = uiService.getApprovalQueue();

// Approve a request
uiService.approveRequest(requestId);

// Deny a request with reason
uiService.denyRequest(requestId, 'Too many file modifications');
```

## Integration with AIExecutionService Policy

The approval system operates at a higher level than `IAIMutationPolicy`:

1. **Capability-level approval** (Agent System) — "Can this agent use file-edit?"
2. **Mutation policy** (AIExecutionService) — "Is this specific edit allowed?"
3. **Both must pass** for an agent mutation to execute

```
Agent Step Execution Request
  ↓
Approval System: Is capability approved?
  ↓ YES
AIExecutionService: Does mutation policy allow this edit?
  ↓ YES
Execute mutation
```

## Timeouts

| Approval Level | Timeout |
|----------------|---------|
| AskOnce | 120 seconds |
| AskPerStep | 60 seconds |
| ManualReview | 120 seconds |

Expired approvals cause the step to fail, which may cause the plan to fail (depending on fail-fast setting).

## Ask-Once Tracking

When a capability is approved at the `AskOnce` level within a plan, subsequent steps using the same capability do not require re-approval:

```typescript
// Internal tracking
private readonly _askOnceApprovals: Map<string, Set<AgentCapability>> = new Map();

// When AskOnce capability is approved:
agentApprovals.add(approvedCapability);

// When checking AskOnce:
const alreadyApproved = step.approvalLevel === ApprovalLevel.AskOnce
  && agentApprovals.has(step.requiredCapability);
```
