# Security Boundaries

## Overview

The Security Boundary Service (#91) enforces 5 default security boundaries that prevent unauthorized escalation across system layers.

## Default Boundaries

1. **Execution-UX Boundary**: Execution may signal UX but cannot elevate privileges
2. **UX-Human Boundary**: UX may observe human state but cannot directly control it
3. **Human-Execution Boundary**: Human intent may influence execution with restricted permission
4. **Signal Bus Isolation**: Signal bus routes but never escalates privileges
5. **Recovery Kernel Boundary**: Recovery may elevate privileges only under locked permission

## Escalation Types

- Horizontal: Same layer, different domain
- Vertical: Crossing layer boundaries
- Privilege: Elevating permission level
- Resource: Accessing restricted resources

## Permission Levels

| Level | Description | Use Case |
|-------|-------------|----------|
| Unrestricted | Full access | Development only |
| Standard | Normal operations | Staging/Production |
| Restricted | Limited capabilities | Production default |
| Locked | Minimal capabilities | Enterprise/Offline |
| Quarantined | Suspected compromise | Emergency only |

## Validation

Security audit must find: zero unrestricted paths, zero unsafe escalation paths.
