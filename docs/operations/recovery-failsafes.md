# Recovery & Failsafes

## Overview

The Recovery Failsafe Service (#95) ensures the system NEVER fully bricks. It provides 6 recovery modes of increasing severity.

## Recovery Modes

| Mode | Severity | Data Preserved | Recovery Time | Use Case |
|------|----------|----------------|---------------|----------|
| Auto-Heal | Low | Yes | ~200ms | Minor service hiccup |
| Partial Restart | Medium | Yes | ~500ms | Subsystem failure |
| Kernel Restart | Medium | Yes | ~2s | AI kernel corruption |
| Safe Mode | High | Partial | ~1s | Critical failure |
| Rollback | High | Yes | ~3s | Bad state detected |
| Emergency Recovery | Critical | Best effort | ~5s | Total system failure |

## Guarantees

1. System can ALWAYS recover to at least safe mode
2. Data preservation is guaranteed for all modes except safe mode
3. Checkpoints allow rollback to known-good states
4. Recovery is automatic — no manual intervention required
5. Recovery never makes the situation worse
