# Production Configuration

## Overview

The Production Configuration Service (#96) provides centralized runtime configuration with strict mutability rules.

## Configuration Mutability Levels

| Level | Description | When Changeable |
|------|-------------|-----------------|
| Mutable | Can change anytime | Always |
| Pre-Lock | Before production lock | Before lockConfiguration() |
| Immutable | After initial set | Never after first set |
| Critical | Never changeable | Never |

## Feature Flags

- ai.execution.enabled — Core AI execution
- ai.replay.enabled — Execution replay
- ai.stress-test.enabled — Stress testing (off by default)
- ai.consolidation.enabled — Architectural consolidation
- ai.production-ops.enabled — Production operations
- ai.enterprise-mode — Enterprise features

## Production Lock

Once `lockConfiguration()` is called, all Pre-Lock and above entries become immutable. This prevents runtime configuration drift in production.
