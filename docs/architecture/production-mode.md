# Production Mode — Architecture

## Overview

Production Mode is a toggle that transforms the system from development-friendly (verbose, debuggable) to production-ready (minimal overhead, strict throttling, full stability constraints).

## Production Mode Configuration

| Setting | Default | Effect |
|---------|---------|--------|
| disableVerboseObservability | true | Turns off dev mode observability |
| reduceGraphVerbosity | true | Fewer metadata fields per graph node |
| debugEventLimitPerSecond | 10 | Max debug events per second |
| strictThrottling | true | Enforces strict throttling limits |
| fullStabilityConstraints | true | All safety mechanisms active |
| eventBusBufferCap | 5000 | Reduced from 10000 |
| graphNodeCap | 5000 | Reduced from 10000 |
| scheduledCoherence | true | Coherence runs on schedule |
| coherenceIntervalMs | 30000 | Coherence check interval |

## Production vs Development Overhead

| Metric | Dev Mode | Prod Mode | Reduction |
|--------|----------|-----------|-----------|
| Event bus events/sec | ~100 | ~20 | 5× |
| Graph node rate | ~50/sec | ~10/sec | 5× |
| Observability trace rate | ~200/sec | ~5/sec | 40× |
| Estimated memory | ~150MB | ~50MB | 3× |

## Production Mode Activation

```typescript
// Enable production mode
stabilizationService.setProductionMode(true);

// Custom configuration
stabilizationService.updateProductionModeConfig({
  debugEventLimitPerSecond: 5,
  graphNodeCap: 3000,
});
```

## What Changes When Production Mode Is Enabled

1. **Observability**: Verbose traces disabled, only critical events logged
2. **Throttling**: Strict limits enforced, no dynamic relaxation
3. **Memory**: Lower caps on graph nodes and event bus
4. **Coherence**: Scheduled validation with 30s interval
5. **Agent limits**: Max concurrent agents reduced to 3
6. **Intent rate**: Max 20 intents per second
7. **Debug events**: Limited to 10 per second

## Production Mode Events

- `onDidChangeProductionMode` fires when toggled
- System automatically adjusts stability state if needed
- Production mode + Critical state = maximum system protection
