# Telemetry Governance

## Overview

The Telemetry Governance Service (#93) enforces strict telemetry ethics. The system collects ONLY system-level analytics. Never user surveillance.

## Core Rules

1. **No creepy tracking** — No keystroke logging, no mouse tracking, no content capture
2. **No workflow spying** — No monitoring of user work patterns, timing, or behavior
3. **No excessive logging** — Minimal retention periods, purposeful collection
4. **Privacy-safe metrics** — All data anonymized, no user-identifiable information
5. **Consent enforcement** — Collection only at or above consent level

## Telemetry Categories

| Category | Consent Required | Anonymized | Retention |
|----------|-----------------|------------|-----------|
| System Health | Standard | No | 30 days |
| Performance | Standard | No | 14 days |
| Error/Crash | Crash-Only | Yes | 90 days |
| Feature Reliability | Standard | Yes | 30 days |
| Deployment | Standard | No | 90 days |

## Consent Levels

- None: No telemetry
- Crash-Only: Error and crash data only
- Standard: System health + performance + errors
- Full: Complete system analytics (no user data)
