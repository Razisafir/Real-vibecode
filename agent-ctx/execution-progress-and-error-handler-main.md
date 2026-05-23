# Task: Execution Progress Indicator & AI Service Error Handler

## Task ID: execution-progress-and-error-handler

## What was done

### 1. Execution Progress Indicator (Task 1)

**File created:** `/home/z/my-project/Real-vibecode/src/vs/workbench/services/aiExecution/browser/executionProgressContribution.ts`

This implements `IWorkbenchContribution` and creates a status bar entry that:

- Shows `$(sync~spin) AI: <stage>...` when autonomous execution is running
- Updates with the current stage name (Planning, Executing, Verifying, etc.)
- Displays milestone/step progress counts (e.g., "AI: Executing (2/5 milestones)")
- Auto-hides when execution completes, stops, or becomes idle
- When clicked, executes the `aiExecution.focus` command to show the AI Workflow view
- Shows "AI: Crashed" for 5 seconds before auto-hiding on crash
- Shows "AI: Paused" when the loop is paused

**Event listeners (matched to actual interfaces):**
- `IAutonomousExecutionLoopService.onStateChange` → primary show/hide trigger (LoopState enum)
- `IAutonomousExecutionService.onDidChangeStage` → granular stage labels (ExecutionStage enum)
- `IAutonomousExecutionLoopService.onMilestoneUpdate` → milestone progress tracking
- `IAutonomousExecutionLoopService.onStepUpdate` → step-level progress
- `IAutonomousExecutionLoopService.onExecutionEvent` → additional context (loop started/paused/resumed/completed/crashed, errors)
- `IAutonomousExecutionService.onDidComplete` → hide on completion

**Registration:** `registerWorkbenchContribution2(ExecutionProgressContribution.ID, ExecutionProgressContribution, WorkbenchPhase.AfterRestored)`

### 2. AI Service Error Handler (Task 2)

**File created:** `/home/z/my-project/Real-vibecode/src/vs/workbench/services/aiExecution/browser/aiServiceErrorHandler.ts`

This implements `IWorkbenchContribution` that:

- Listens for errors from AI services
- Logs errors with severity and context via ILogService
- Shows non-intrusive notifications (Error for critical, Info for non-critical)
- Implements retry with exponential backoff (1s, 5s, 15s, up to 3 retries)
- Deduplicates identical errors within a 2-second window
- Suppresses notification spam after 4 errors in 60 seconds
- Implements graceful degradation: tracks degraded providers and shows warning when ≥5 errors in 5 minutes
- Auto-recovers when providers return to healthy state

**Event listeners (matched to actual interfaces):**
- `ILLMProviderService.onRequestFailed` → LLM API errors ({ requestId, error })
- `IAutonomousExecutionService.onDidFailStep` → execution step failures ({ stepId, error })
- `IProviderHealthService.onDidChangeHealth` → provider health degradation (HealthSeverity enum)
- `IAIUnifiedStateService.onDidChangeState` → state transitions to error phases (AIRuntimePhase.Disposed)
- `IAIExecutionService.onDidRecordExecution` → failed mutation records (record.success === false)
- `IAutonomousExecutionLoopService.onStateChange` → LoopState.Crashed detection
- `IAutonomousExecutionLoopService.onExecutionEvent` → ExecutionEventType.Error and LoopCrashed

**Critical error patterns:** API key, authentication, quota exceeded, service unavailable, unauthorized, forbidden, credential, billing, payment required

**Public API:**
- `scheduleRetry(operationId, operation, service)` → Schedule a retry with backoff
- `getRecentErrors(count?)` → Get recent error records (frozen array)
- `getDegradedServices()` → Get set of degraded provider IDs
- `getActiveRetryCount()` → Get number of active retries

**Registration:** `registerWorkbenchContribution2(AIServiceErrorHandler.ID, AIServiceErrorHandler, WorkbenchPhase.AfterRestored)`

### 3. Contribution Registration

**File modified:** `/home/z/my-project/Real-vibecode/src/vs/workbench/services/aiExecution/browser/aiExecution.contribution.ts`

Added two side-effect imports:
```typescript
import './executionProgressContribution.js';
import './aiServiceErrorHandler.js';
```

## Key interface verification

All event names and types were verified against the actual source files:

- `IAutonomousExecutionService.onDidChangeStage: Event<ExecutionStage>` ✓
- `IAutonomousExecutionService.onDidFailStep: Event<{ stepId: string; error: string }>` ✓
- `IAutonomousExecutionService.onDidComplete: Event<ExecutionSummary>` ✓
- `IAutonomousExecutionLoopService.onStateChange: Event<LoopState>` ✓
- `IAutonomousExecutionLoopService.onMilestoneUpdate: Event<Milestone>` ✓
- `IAutonomousExecutionLoopService.onStepUpdate: Event<ExecutionStep>` ✓
- `IAutonomousExecutionLoopService.onExecutionEvent: Event<ExecutionEvent>` ✓
- `ILLMProviderService.onRequestFailed: Event<{ requestId: string; error: string }>` ✓
- `IProviderHealthService.onDidChangeHealth: Event<string>` ✓
- `IAIExecutionService.onDidRecordExecution: Event<IAIExecutionRecord>` ✓
- `IAIUnifiedStateService.onDidChangeState: Event<IStateTransitionEvent>` ✓

## Unused imports cleaned up

- Removed `IDisposable` from executionProgressContribution (not used)
- Removed `IStatusbarEntry` from executionProgressContribution (not used as type annotation)
- Removed `IAIExecutionService` and `ICommandService` from executionProgressContribution (not needed)
- Removed `ProviderHealth` and `ExecutionStage` from aiServiceErrorHandler (not used)
- Removed `NotificationPriority` and `INotificationSource` from aiServiceErrorHandler (simplified notification API)
