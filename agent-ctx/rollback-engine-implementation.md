# Rollback Engine Service Implementation

## Task ID: rollback-engine

## Summary

Created a full Rollback Engine Service that implements actual undo/restore functionality for all 5 rollback strategies defined in the execution graph service. Previously, the rollback system was metadata-only — the strategies were defined but the actual undo operations didn't execute. Now, when `rollbackPlan()` is called, each step's execution graph node is rolled back using the appropriate strategy with real file content restoration.

## Files Created

### 1. `src/vs/workbench/services/aiExecution/common/rollbackEngine.ts` (158 lines)
**Interface file** defining the Rollback Engine service contract.

Key types:
- `IRollbackResult` — Result of a rollback operation (success, strategy, filesRestored, error)
- `ICustomUndoHandler` — Registration for custom undo handlers by node type
- `IContentSnapshot` — Snapshot stored before an operation (nodeId, fileUri, content, checksum, timestamp)
- `IInverseEditOperation` — A single inverse edit (uri, range, newText)

Key interface `IRollbackEngineService`:
- `rollbackNode(nodeId)` — Execute rollback for a single node
- `rollbackNodes(nodeIds)` — Execute rollback for multiple nodes in reverse order
- `takeSnapshot(nodeId, fileUri)` — Take a content snapshot before operation
- `registerCustomUndoHandler(nodeType, handler)` — Register custom undo handler
- `getSnapshot(nodeId)` — Retrieve a stored snapshot
- `onDidRollback` — Event fired when rollback completes

### 2. `src/vs/workbench/services/aiExecution/browser/rollbackEngineService.ts` (534 lines)
**Implementation file** with all 5 strategy handlers.

Constructor injection:
- `IExecutionGraphService` — To get nodes and mark them rolled back
- `ITextFileService` — To resolve text models and apply edits
- `IEditorService` — To open files for EditorUndo strategy
- `IStorageService` — To persist snapshots and inverse operations
- `ICommandService` — To execute `editor.action.undo` command
- `ILogService` — For logging

Strategy implementations:
- **InverseEdit** (`_executeInverseEdit`): Reads stored inverse operations from `aiExecution.inverseOps.${nodeId}`, parses them as `IInverseEditOperation[]`, applies each using `pushEditOperations` on the text model
- **SnapshotRestore** (`_executeSnapshotRestore`): Reads snapshot from memory cache or storage key `aiExecution.snapshots.${nodeId}`, writes content back using `pushEditOperations` on the full model range
- **EditorUndo** (`_executeEditorUndo`): Opens the file in the editor, executes `editor.action.undo` via `ICommandService`
- **CustomUndo** (`_executeCustomUndo`): Looks up registered handler by `node.type`, calls it
- **Irreversible**: Logs warning, returns failure result

## Files Modified

### 3. `src/vs/workbench/services/aiExecution/browser/aiExecution.contribution.ts`
- Added import for `IRollbackEngineService` from `../common/rollbackEngine.js`
- Added import for `RollbackEngineService` from `./rollbackEngineService.js`
- Added registration: `registerSingleton(IRollbackEngineService, RollbackEngineService, InstantiationType.Eager)`

### 4. `src/vs/workbench/services/aiExecution/browser/agentOrchestratorService.ts`
- Added import for `IRollbackEngineService` from `../common/rollbackEngine.js`
- Added constructor injection: `@IRollbackEngineService private readonly rollbackEngine: IRollbackEngineService`
- Replaced `rollbackPlan()` inner loop body:
  - **Before**: Only called `notifyFileModified()` (metadata-only, no actual content restore)
  - **After**: Delegates to `this.rollbackEngine.rollbackNode(step.graphNodeId)` which dispatches to the appropriate strategy handler for actual content restoration

### 5. `src/vs/workbench/services/aiExecution/browser/aiExecutionService.ts`
- Added imports for `IRollbackEngineService` and `IStorageService`
- Added constructor injection: `@IRollbackEngineService private readonly rollbackEngine` and `@IStorageService private readonly storageService`
- Added **STEP 5b**: Before applying edits, if node uses `SnapshotRestore` strategy, calls `this.rollbackEngine.takeSnapshot(graphNode.id, graphNode.fileUri)`
- Added **original text capture**: Before `pushEditOperations`, captures the original text via `getValueInRange()` for inverse operations
- Added **STEP 6b**: After applying edits, if node uses `InverseEdit` strategy, computes and stores inverse operations in `aiExecution.inverseOps.${nodeId}` via `IStorageService.store()`

## Architecture

The rollback engine follows VS Code's DI pattern with `createDecorator` and `@param` decorators. It uses:

1. **Dual storage**: In-memory cache (`Map<string, IContentSnapshot>`) for fast access + `IStorageService` for durability across sessions
2. **Strategy pattern**: Each rollback strategy is a private method that returns `IRollbackResult`
3. **Event-driven**: `onDidRollback` event fires after every rollback operation for observability
4. **Handler registry**: Custom undo handlers are registered per node type with `IDisposable` cleanup
5. **Causal consistency**: `rollbackNodes()` processes in reverse order

## Key Design Decisions

1. **Eager instantiation**: The service is registered with `InstantiationType.Eager` so it's available immediately for rollback operations
2. **Storage key patterns**: `aiExecution.snapshots.${nodeId}` and `aiExecution.inverseOps.${nodeId}` — consistent with existing AI execution storage patterns
3. **Checksum algorithm**: FNV-1a inspired hash (same algorithm as existing `_computeChecksum` in `aiExecutionService.ts`) for integrity verification
4. **Inverse edit capture**: Done at edit time in `aiExecutionService.ts` (not at rollback time) because the original text must be captured before it's overwritten
5. **Non-throwing**: All strategy handlers catch errors and return `IRollbackResult` with `success: false` instead of throwing, enabling partial rollback success
