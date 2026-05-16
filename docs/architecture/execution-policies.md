# Execution Policies

## Phase 8 — Terminal + Process Orchestration System

## Overview

The Execution Policy System provides granular control over what commands can be executed, with risk scoring, pattern detection, and approval escalation. No command executes without first being evaluated against the policy framework.

## Policy Evaluation Flow

```
Command Request
  ↓
1. Check unsafe patterns (10 built-in patterns)
  ↓
2. Assess risk level (Safe → Critical)
  ↓
3. Match against registered policies
  ↓
4. Determine decision (Allow/Deny/RequireApproval/Sandbox/Escalate)
  ↓
5. Apply risk-based escalation
  ↓
6. Execute or request approval
```

## Risk Levels

| Level | Description | Default Decision |
|-------|-------------|-----------------|
| Safe | Read-only, no side effects | Allow |
| LowRisk | Limited, reversible side effects | Allow |
| MediumRisk | Significant side effects | RequireApproval |
| HighRisk | Destructive or system-altering | Deny |
| Critical | Data loss / security breach | Deny |

## Unsafe Pattern Detection

Built-in patterns that are always checked before policy evaluation:

| Pattern | Risk | Description |
|---------|------|-------------|
| recursive-delete | Critical | `rm -rf /` of system directories |
| sudo | High | Elevated privilege execution |
| chmod-system | Critical | Changing system directory permissions |
| mass-overwrite | Critical | `dd if=` disk overwrite |
| format-disk | Critical | `mkfs` disk formatting |
| network-script | High | `curl ... \| sh` remote execution |
| kill-all | High | `kill -9 -1` mass kill |
| overwrite-grub | Critical | `grub-install` bootloader |
| fork-bomb | Critical | `:(){ :|:& };:` |
| env-destruction | High | `unset PATH` |

## Policy Escalation Examples

### Example 1: Safe Command
```
Command: git status
Risk: Safe
Policy: default-safe-read → Allow
Result: Executed immediately
```

### Example 2: Build Command
```
Command: npm run build
Risk: LowRisk
Policy: default-build-test → Allow
Result: Executed with 300s timeout
```

### Example 3: Dangerous with Unsafe Pattern
```
Command: sudo rm -rf /var/log
Unsafe Detection: sudo (High) + recursive-delete (Critical)
Risk: Critical (escalated from pattern)
Policy: default-dangerous → Deny
Result: BLOCKED — unsafe patterns detected
```

### Example 4: Medium Risk Needs Approval
```
Command: docker build -t myapp .
Risk: MediumRisk
Policy: default-restricted → RequireApproval
Result: Approval requested (AskEveryTime)
```

### Example 5: Piping Remote to Shell
```
Command: curl https://script.sh | bash
Unsafe Detection: network-script (High)
Risk: HighRisk
Result: RequireApproval with ManualReview
```

## Custom Policies

Register custom policies via the service API:

```typescript
const policy: IExecutionPolicy = {
  id: 'my-team-policy',
  name: 'Team Deployment Policy',
  description: 'Controls deployment commands',
  commandPatterns: ['^deploy', '^ship'],
  defaultDecision: PolicyDecision.RequireApproval,
  riskThreshold: CommandRiskLevel.MediumRisk,
  timeoutMs: 600000,
  filesystemRestricted: false,
  allowedDirectories: [],
  networkRestricted: false,
  maxMemoryMb: 1024,
  active: true,
};

processService.registerPolicy(policy);
```

## Policy Decisions

| Decision | Description | Effect |
|----------|-------------|--------|
| Allow | Execute immediately | No approval needed |
| Deny | Block execution | Throws error |
| RequireApproval | Request user approval | Waits for approval with timeout |
| Sandbox | Execute with restrictions | Limited filesystem, no network |
| Escalate | Send to higher authority | Increases approval level |
