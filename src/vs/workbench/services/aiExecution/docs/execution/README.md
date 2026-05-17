# Autonomous Execution System

## Overview

Phase 25 implements the core execution lifecycle: PLAN -> EXECUTE -> VERIFY -> FIX -> RETRY -> COMMIT -> CONTINUE.

## Execution Stages

```
Planning -> Executing -> Verifying -> (success?) -> Committing -> Continuing
                |             |
                v             v
            (failure?)    Fixing -> (retry?) -> Executing
                |             |
                v             v
            Retrying     (max retries?) -> Failed
```

## Approval Modes

| Mode | Description |
|------|-------------|
| EveryMilestone | User approves after every milestone |
| MajorMilestones | User approves only major milestones |
| Autonomous | No approval needed; system runs independently |
| Custom | User defines which checkpoints require approval |

## Services

### IAutonomousExecutionService (#148)
Core execution engine. Runs plans step by step with retry, fix, and approval logic.

### IExecutionQueueService (#149)
Priority queue for execution plans. Processes sequentially to avoid file conflicts.

## Step Types

| Type | Description | Implementation |
|------|-------------|----------------|
| llm-call | Send prompt to LLM provider | ILLMProviderService.sendRequest() |
| file-write | Write content to a file | IExecutionSandboxService.writeFile() |
| file-read | Read file content | IExecutionSandboxService.readFile() |
| command | Execute terminal command | IExecutionSandboxService.executeCommand() |
| verification | Run tests/lint/build | IExecutionSandboxService.runTests/runLint/runBuild() |
| git-operation | Git commit/checkout/etc | IExecutionSandboxService.gitCommit/etc() |

## Honest Limitations

- **LLM execution depends on configured providers**: If no API key is set, execution fails honestly
- **File operations are workspace-scoped**: Cannot write outside workspace
- **Autonomous coding is limited by LLM capability**: The service orchestrates; quality depends on the model
- **Fix stage uses LLM to suggest fixes**: Not guaranteed to produce correct fixes
- **Test passing does not mean correctness**: Verification checks pass/fail, not semantic correctness
- **Crash recovery is eventually consistent**: State is persisted after every step, but the very last step may be lost
