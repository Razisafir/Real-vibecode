# Product Integration Architecture

## Phase 5 — Real Vibecode AI-Native IDE

## Overview

Product integration ensures that all independently-built subsystems from Phases 1-4 now function as a single, cohesive product. No subsystem operates in isolation. The integration layer bridges:

- **AIExecutionService** (Phase 1-2): Authoritative mutation gateway
- **ExecutionGraphService** (Phase 3): Causal DAG tracking
- **Product Identity** (Phase 4): Standalone IDE branding
- **Unified State** (Phase 5): Cross-service state management
- **UI Execution Layer** (Phase 5): User-facing timeline and indicators
- **Bootstrap Sequence** (Phase 5): Deterministic initialization
- **Observability** (Phase 5): Debug and diagnostics

## Integration Matrix

| Subsystem | Depends On | Events Emitted | Events Consumed |
|-----------|-----------|---------------|-----------------|
| AIExecutionService | GraphService, UnifiedState, Observability | onDidRecordExecution | onDidCreateNode, onDidCompleteNode |
| ExecutionGraphService | LogService, EnvironmentService, FileService | onDidCreateNode, onDidCompleteNode, onDidCreateEdge | (none — leaf producer) |
| UnifiedStateService | GraphService | onDidChangeState | onDidCreateNode, onDidCompleteNode, onDidCreateEdge |
| AIExecutionUIService | GraphService, UnifiedState, EditorService | onDidChangeTimeline, onDidChangeIndicator, onDidGeneratePreview | onDidCreateNode, onDidCompleteNode, onDidChangeState |
| WorkspaceBootstrapService | UnifiedState, GraphService, ExecutionService | onDidCompleteStep, onDidBootstrap | (none — one-shot) |
| ObservabilityService | GraphService, UnifiedState | onDidAddTrace, onDidRecordDecision | onDidChangeState, onDidCreateNode, onDidCompleteNode |

## Cross-Service State Propagation

### Rule 1: Execution Start
When `AIExecutionService.beginExecution()` is called:
1. UnifiedState transitions to `Executing` phase
2. Observability logs a trace entry (category: Execution)
3. UI indicator updates to show active AI operation
4. Bypass token is tracked in unified state

### Rule 2: Graph Node Creation
When `ExecutionGraphService.createNode()` is called:
1. Node is inserted into the DAG with pending status
2. `onDidCreateNode` fires → UI adds timeline entry
3. Observability logs a trace entry (category: Graph)
4. Persistence is marked dirty

### Rule 3: Graph Node Completion
When `ExecutionGraphService.completeNode()` is called:
1. Node's pending flag is cleared, success/error set
2. `onDidCompleteNode` fires → UI updates timeline entry
3. If execution stack is empty, UnifiedState transitions to `Ready`
4. Persistence flush is scheduled

### Rule 4: State Transition
When `UnifiedStateService.transitionTo()` is called:
1. Phase transition is validated against legal transitions
2. `onDidChangeState` fires → all subscribers receive new state
3. Observability logs a trace entry (category: State)
4. UI indicator updates to reflect new phase

## Async Consistency Guarantees

1. **Linearizable writes**: All state modifications happen on the main thread. Events fire synchronously before the modifying function returns.

2. **No stale reads**: Since events fire synchronously, any subscriber that reads state in response to an event sees the latest state.

3. **Atomic transitions**: Phase transitions are atomic — no subscriber can observe an intermediate state where the old phase is set but the new phase isn't.

4. **Causal ordering**: Graph node creation always precedes completion. UI updates always follow graph events. State transitions always follow the operations that triggered them.

## Error Handling Integration

When a mutation fails:
1. Graph node is completed with `success: false` and error message
2. UnifiedState returns to `Ready` phase (if not nested)
3. Observability logs an error trace
4. UI timeline shows the failed entry
5. History record captures the failure for audit

When the kernel encounters an inconsistency:
1. `validateConsistency()` returns a list of issues
2. Bootstrap sequence checks consistency after graph hydration
3. Pending nodes from previous sessions are marked as failed (crash recovery)
4. Observability records the inconsistency as a warning trace
