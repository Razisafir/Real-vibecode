# Runtime Governance Service (#108)

## Overview

The RuntimeGovernanceService is the policy enforcement layer for the AI Execution Kernel. It acts as the immutable guardrail system that prevents unsafe execution, enforces operational boundaries, and maintains a complete audit trail of all governance decisions. Governance rules are evaluated before any execution is permitted, and violations are handled through a defined escalation and remediation protocol.

The service is designed with a default-deny philosophy: any operation not explicitly permitted by an active policy is blocked. This ensures that new features or edge cases cannot bypass governance simply because no rule exists to block them.

## Unsafe Execution Prevention

The governance service maintains a blocked operations list that defines operations considered fundamentally unsafe for the runtime environment. These operations are unconditionally blocked regardless of context, trust level, or policy overrides.

**Permanently blocked operations:**

| Operation | Reason | Bypass Allowed |
|-----------|--------|----------------|
| Direct filesystem write to system paths | System integrity risk | No |
| Arbitrary code evaluation (eval) | Code injection risk | No |
| Network access to internal metadata endpoints | Information disclosure | No |
| Process spawning beyond approved list | Resource hijacking risk | No |
| Memory allocation beyond configured limits | Denial of service risk | No |
| Direct kernel memory manipulation | Stability risk | No |
| Privilege escalation chains | Security risk | No |
| Uncontrolled recursive execution | Stack overflow risk | No |

**Blocked operation evaluation:**

Every execution request passes through the `isOperationBlocked(operation: ExecutionOperation)` method before being dispatched. This method performs a multi-stage check:

1. **Exact match**: The operation identifier is checked against the blocked list directly.
2. **Category match**: The operation's category (e.g., "filesystem", "network", "process") is checked against category-level blocks.
3. **Pattern match**: The operation's identifier is tested against regex patterns that define blocked operation families (e.g., `fs\.write.*\/etc\/`).
4. **Context match**: The operation's execution context is evaluated for conditions that make an otherwise-safe operation unsafe (e.g., writing to a writable path from within a sandboxed execution context).

If any stage returns a block, the operation is rejected with a `GovernanceBlockReason` that explains which stage triggered the block and why. The rejection is logged to the governance audit trail.

## Runtime Policy Enforcement Engine

The policy enforcement engine evaluates configurable rules against every execution request. Unlike the blocked operations list (which is static and unconditional), policies are dynamic, context-aware, and can be modified at runtime by authorized operators.

**Policy rule structure:**

```typescript
interface GovernancePolicy {
  id: string;
  name: string;
  description: string;
  priority: number;           // Higher priority rules are evaluated first
  condition: PolicyCondition;  // When this rule applies
  action: PolicyAction;        // What to do when the condition matches
  scope: PolicyScope;          // Which operations this rule covers
  enabled: boolean;            // Whether the rule is active
  immutable: boolean;          // Whether the rule can be modified at runtime
}
```

**Evaluation order:**

Policies are evaluated in strict priority order. The first policy whose condition matches the execution request determines the outcome. If no policy matches, the default-deny rule fires and blocks the operation. This ensures there are no governance gaps.

**Policy conditions support:**

- Operation type matching (exact, prefix, regex)
- Execution context matching (source, trust level, priority)
- Rate limiting (operations per second, per minute, per hour)
- Resource constraints (memory usage, CPU time, concurrent operations)
- Temporal constraints (time-of-day, day-of-week restrictions)
- Dependency constraints (operation A must complete before operation B)

**Policy actions:**

| Action | Effect |
|--------|--------|
| Allow | Permit the operation unconditionally |
| AllowWithLogging | Permit the operation but log detailed telemetry |
| Throttle | Permit the operation but impose a rate limit |
| Restrict | Permit the operation with reduced scope/permissions |
| Block | Deny the operation entirely |
| BlockAndAlert | Deny the operation and emit an alert event |
| Escalate | Deny the operation and trigger human review |

## Escalation Restrictions

Escalation is the process by which an operation requests elevated privileges beyond its current trust level. The governance service places strict restrictions on escalation to prevent privilege escalation attacks and unintended permission expansion.

**Escalation rules:**

1. **No auto-escalation**: Operations cannot automatically escalate their own trust level. Escalation must be explicitly requested and approved by the governance engine.
2. **Single-level escalation**: An operation can escalate at most one trust level per request. Multi-level escalation requires sequential requests with intermediate validation.
3. **Escalation cooldown**: After a denied escalation request, the same operation must wait a cooldown period (default: 60 seconds) before requesting again. This prevents escalation brute-forcing.
4. **Escalation scope restriction**: Escalated privileges apply only to the specific operation that requested them. Privileges do not carry over to child or subsequent operations.
5. **Escalation audit**: Every escalation request, whether approved or denied, is recorded in the governance audit log with full context including the requesting operation, current trust level, requested trust level, and the governance rule that determined the outcome.

**Escalation trust levels:**

| Level | Name | Permissions | Escalation Allowed To |
|-------|------|-------------|----------------------|
| 0 | Untrusted | Read-only, no side effects | Level 1 |
| 1 | Standard | Read-write within sandbox | Level 2 |
| 2 | Trusted | Read-write with approved side effects | Level 3 |
| 3 | Elevated | Extended permissions, resource access | Level 4 |
| 4 | Privileged | Full runtime access (restricted operations) | None |
| 5 | System | Unrestricted (never granted to operations) | N/A |

Level 5 (System) is reserved for the governance service itself and the runtime kernel. No user-facing operation can ever be granted System-level trust.

## Execution Boundary Validation

Execution boundaries define the limits within which an operation can execute. The governance service validates these boundaries before and during execution.

**Boundary types:**

- **Resource boundaries**: Maximum memory, CPU time, wall time, and I/O operations. Exceeding any resource boundary triggers immediate termination of the operation.
- **Scope boundaries**: Filesystem paths, network endpoints, and API surfaces that the operation may access. Access outside the declared scope is blocked.
- **Temporal boundaries**: Maximum execution duration. Operations that exceed their declared duration are terminated and marked as timed-out.
- **Dependency boundaries**: Maximum number of sub-operations an operation may spawn. This prevents runaway fan-out.
- **Data boundaries**: Maximum data volume that an operation may read or write. This prevents data exfiltration and storage exhaustion.

**Boundary validation protocol:**

1. **Pre-execution validation**: Before an operation begins, the governance service validates that all declared boundaries are within the maximum limits allowed for the operation's trust level. Operations with boundaries exceeding their trust level are rejected.
2. **Runtime monitoring**: During execution, the governance service monitors resource consumption against declared boundaries. Boundary utilization is tracked as a percentage and emitted as telemetry events.
3. **Boundary breach handling**: When a boundary is breached, the governance service terminates the operation and records the breach in the audit log. The breach event includes the boundary type, the declared limit, the actual value at breach time, and the operation's execution context.

## Operational Policy Engine

The operational policy engine provides a higher-level interface for managing governance policies. It supports policy CRUD operations, policy versioning, and policy import/export.

**Policy management operations:**

- **Create policy**: Define a new governance policy with condition, action, scope, and priority. New policies are validated against the policy schema and checked for conflicts with existing policies before being activated.
- **Update policy**: Modify an existing policy's condition or action. Immutable policies cannot be updated. Policy updates create a new version; the previous version is archived.
- **Delete policy**: Remove a policy from the active set. Deleted policies are archived rather than permanently removed, ensuring audit trail continuity.
- **Import policies**: Load a set of policies from a configuration source. Imported policies are validated and merged with existing policies according to their priority and scope.
- **Export policies**: Serialize the current active policy set for backup or transfer. Exported policies include metadata about their creation and modification history.

**Policy conflict resolution:**

When two policies have overlapping scopes and conditions, the policy with the higher priority takes precedence. If two policies have the same priority, the more restrictive policy wins (block over allow, throttle over allow, restrict over allow). This conservative conflict resolution ensures that governance gaps cannot be created by policy ambiguity.

**Default policy set:**

The operational policy engine comes pre-configured with a set of default policies that implement the minimum governance requirements:

1. `default-unsafe-block`: Blocks all permanently unsafe operations (priority: 1000, immutable)
2. `default-escalation-restrict`: Restricts escalation to one level at a time (priority: 900, immutable)
3. `default-boundary-enforce`: Enforces resource and scope boundaries for all operations (priority: 800, immutable)
4. `default-audit-required`: Requires audit logging for all trust level 3+ operations (priority: 700, immutable)
5. `default-rate-limit`: Imposes a global rate limit of 1000 operations per second (priority: 600, mutable)
6. `default-resource-cap`: Enforces per-operation resource caps by trust level (priority: 500, mutable)

The first four policies are immutable and cannot be disabled or modified. This ensures that the fundamental governance guarantees cannot be weakened by policy changes.

## Governance Audit Logs

Every governance decision is recorded in an audit log. The audit log is append-only and cannot be modified or deleted by any service other than the governance service itself.

**Audit log entry format:**

```typescript
interface GovernanceAuditEntry {
  timestamp: number;           // Unix epoch milliseconds
  correlationId: string;       // Links to the execution request
  operationId: string;         // The operation being evaluated
  operationType: string;       // Category of the operation
  decision: GovernanceDecision; // Allow, Block, Throttle, Restrict, Escalate
  reason: string;              // Human-readable explanation
  matchedPolicyId: string;     // The policy that determined the outcome
  trustLevel: number;          // Trust level at evaluation time
  context: ExecutionContext;   // Full execution context snapshot
  resourceSnapshot: ResourceSnapshot; // Resource usage at decision time
}
```

**Retention policy:**

- **Active retention**: 7 days. Audit entries are stored in a high-performance ring buffer for real-time querying and dashboard display.
- **Archive retention**: 90 days. Entries older than 7 days are moved to a compressed archive. Archived entries are available for querying but with higher latency.
- **Permanent retention**: Summary statistics (decision counts, violation counts, top blocked operation types) are retained indefinitely.

**Audit log access:**

- The governance service has write-only access to the active log.
- The observability service has read-only access to both active and archived logs.
- No service has delete access to any audit entry.
- Audit log integrity is verified by a rolling hash chain: each entry includes the hash of the previous entry. Any tampering breaks the chain and triggers a `governanceAuditIntegrityViolation` alert.

## Runtime Permission Validation

The permission validation protocol governs how operations request and receive permission to execute. This is separate from (but related to) the policy enforcement engine -- permission validation is about whether an operation is authorized to perform a specific action, while policy enforcement is about whether the runtime should allow the action given current conditions.

**Permission validation steps:**

1. **Identity verification**: Confirm the operation's identity (service ID, execution context, originating source).
2. **Permission lookup**: Check the permission store for the operation's declared permissions.
3. **Permission intersection**: Compute the intersection of the operation's declared permissions, its trust level permissions, and the current governance policy permissions. The intersection is the effective permission set.
4. **Scope validation**: Verify that the requested action falls within the effective permission set.
5. **Delegation check**: If the operation is acting on behalf of another operation, verify that delegation is permitted and that the delegated permissions are a subset of the delegator's effective permissions.
6. **Grant or deny**: Return the permission decision with the complete chain of reasoning.

**Permission caching:**

Permission decisions are cached for a configurable TTL (default: 30 seconds). Caching reduces the overhead of repeated permission checks for the same operation-action pair. Cache entries are invalidated immediately when a policy change affects the operation's trust level or the governance policies that apply to it.

## Execution Trust Enforcement

Trust levels form the backbone of the governance model. The governance service enforces trust boundaries by mapping trust levels to permission sets and resource limits.

**Trust enforcement protocol:**

When an operation is submitted for execution, the governance service assigns it an initial trust level based on its origin and context. Operations originating from user-facing surfaces start at Level 0 (Untrusted). Operations originating from internal services start at Level 1 (Standard). Operations explicitly granted elevated trust through the escalation process can reach Levels 2-4.

**Trust level degradation:**

Trust levels can be degraded (but never below Level 0) under the following conditions:

- The operation has violated a governance policy in the current execution context (degrade by 1 level).
- The operation has been rate-limited more than 3 times in the last 60 seconds (degrade by 1 level).
- The operation has triggered a resource boundary warning (degrade by 1 level, restored after 5 minutes of compliant behavior).

Trust degradation is temporary. Degraded trust levels are automatically restored after a compliance window (default: 5 minutes with no further violations). This creates a "cooling off" period that discourages aggressive operation patterns.

**Trust level upgrade:**

Trust levels can only be upgraded through the formal escalation process. There is no automatic trust upgrade mechanism. This ensures that elevated trust is always explicitly granted and auditable.

## Default Policies

The governance service ships with a set of default policies that establish the baseline security posture:

1. **Unsafe execution blocked**: All operations on the permanently blocked list are unconditionally denied. No policy can override this block. This is the foundational security guarantee.

2. **Escalation restricted**: Escalation is limited to one trust level per request, with a 60-second cooldown between denied requests. Multi-step escalation requires sequential approval. This prevents rapid privilege escalation.

3. **Boundary enforced**: All execution boundaries (resource, scope, temporal, dependency, data) are validated before and during execution. Boundary breaches result in immediate operation termination. This prevents resource exhaustion and scope violations.

4. **Audit required**: All operations at trust level 3 (Elevated) or above are required to produce audit log entries. Operations that fail to produce audit entries are terminated. This ensures visibility into high-privilege operations.

These four policies are marked as immutable and cannot be disabled, modified, or overridden. They represent the non-negotiable security baseline of the AI Execution Kernel.

## Governance Violation Handling

When an operation violates a governance policy, the governance service follows a defined handling protocol:

**Violation severity levels:**

| Severity | Condition | Response |
|----------|-----------|----------|
| Low | Rate limit exceeded, boundary warning | Log + throttle |
| Medium | Boundary breach, unauthorized scope access | Log + terminate operation |
| High | Escalation bypass attempt, trust level manipulation | Log + terminate + degrade trust |
| Critical | Repeated high-severity violations, audit tampering | Log + terminate + degrade trust + freeze execution |

**Violation response flow:**

1. **Detection**: The governance engine detects the violation during policy evaluation or runtime monitoring.
2. **Classification**: The violation is classified by severity based on the conditions above.
3. **Immediate response**: The corresponding response action is applied (throttle, terminate, degrade, freeze).
4. **Audit recording**: The violation is recorded in the governance audit log with full context.
5. **Notification**: An event is emitted to the observability system for dashboard display and alerting.
6. **Recovery**: For non-critical violations, the operation may be resubmitted after the cooldown period. For critical violations, manual intervention is required to unfreeze execution.

**Violation pattern detection:**

The governance service tracks violation patterns across operations. If the same operation type generates more than 5 violations within 10 minutes, the service emits a `violationPatternDetected` alert and recommends a policy review for that operation type. This proactive detection helps identify systemic governance gaps before they become security incidents.
