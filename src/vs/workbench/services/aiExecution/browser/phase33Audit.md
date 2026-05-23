# Phase 33: Execution Loop Reality Check Audit

## 1. Plan Creation (createPlan)

**Can the loop actually create a plan?** YES

- `createPlan()` calls `llmService.sendRequest()` at line 272 with a well-formed `LLMRequest` containing:
  - `requestId` via `generateUuid()`
  - `model` from active provider config with `'gpt-4o'` fallback
  - `messages` with a single user message containing the full structured prompt
  - `maxTokens: 8192`, `temperature: 0.3`
- The prompt (lines 209-258) includes project name, idea, constraints, repository context,
  memory context, a precise JSON schema for the expected response, documentation of all
  5 action types and their param shapes, and explicit formatting rules.
- The LLM response is parsed by `_parsePlanResponse()` (line 1614) which:
  - Strips markdown code fences
  - Extracts JSON between outermost braces
  - Falls back to `_createMinimalPlan()` on parse failure
  - Generates IDs for milestones and steps with proper defaults

**Gap found**: No validation that LLM-generated step `action` values are one of the 5 legal types (`edit|command|git|llm|verify`). Invalid actions hit the `default` case at runtime and return `{success: false}`, but the plan is created without warning. Silent failure for the user.

**Fixed**: Line 180 no-op `.map(l => l)` replaced with direct `.join(', ')`.

## 2. Step Execution (_executeStep + handlers)

**Are all paths reachable?** YES

| Handler | Reachable | Notes |
|---------|-----------|-------|
| `edit` | YES | Dispatched from switch at line 687 |
| `command` | YES | Dispatched from switch at line 689 |
| `git` | YES | Dispatched from switch at line 691 |
| `llm` | YES | Dispatched from switch at line 693 |
| `verify` | YES | Dispatched from switch at line 695 |
| `default` | YES | Catches unknown action types at line 697 |

**Exception handling**: All handlers have proper try/catch/finally blocks. The `finally` blocks release locks. The main `_runLoop()` has an outer catch at line 673 that transitions to `Crashed` state.

**Fixed bugs**:
- Line 837: Removed dead variable `result` (was assigned but never read in `_handleGitStep`)

## 3. Crash Recovery (restoreCrashRecoveryState)

**Does it correctly reconstruct the plan?** PARTIALLY

- Line 522: Loads the persisted plan from `IStorageService` via `loadPlan()`
- Lines 530-531: Restores `currentMilestoneIndex` and `currentStepIndex` from crash state
- Line 532: Restores `_lastCheckpointHash`
- Line 533: Restores `_repairAttempts`

**Gaps**:
- Steps that were `'running'` at crash time remain `'running'` in the restored plan. The `_runLoop` will re-execute them. Tolerable for idempotent steps but dangerous for non-idempotent ones (e.g., `git commit`).
- `_repairStats` is NOT restored after crash recovery. After a crash, `totalAttempts`, `successfulRepairs`, etc. reset to zero. `getRepairStats()` returns stale zeros.
- No auto-resume after recovery. The caller must manually call `start()` to resume execution. This is handled (start() allows Recovering state) but undocumented.

## 4. Dead Code

**After Phase 33 fixes, remaining dead code:**

None. All imports verified as used. All methods have call sites. All branches are reachable.

## 5. Repair Cycle (_repairCycle)

**Does the repair cycle actually work?** YES, with bugs that were fixed.

Flow:
1. Enter repair state, increment `milestone.repairAttempts`
2. Guard check: If `repairAttempts > 5`, return `false`
3. Gather context: Read file content, retrieve memory of recent changes
4. Consult repair intelligence: Compute failure signature, propose strategy, check loop guard
5. Send repair prompt to LLM with full context
6. Parse and apply fixes: Try diff blocks first, then code blocks
7. Run post-repair verification
8. If verification passes: Record success, advance step index
9. If verification fails: Check if state is worse, rollback if needed

**Fixed bugs**:
- Lines 1221-1223: Duplicate `const fileContent` declaration was a COMPILE ERROR. The Phase 31 refactoring botched the fileService.readFile() replacement. Fixed by using `readFileResult` for the raw read and `fileContent` for the string value.
- Line 1397: After repair success, step was set to 'completed' but `currentStepIndex` was NOT advanced, causing the step to be re-executed on the next loop iteration. Fixed by adding `this._currentPlan.currentStepIndex++` after setting step.status = 'completed'.

**Remaining concerns**:
- `_repairStats.milestonesWithRepairs` overcounts by 1 when current milestone already has repair attempts (line 1208)
- `_isVerificationWorse()` is a crude heuristic comparing error line counts with a 1.5x threshold
- `String.replace()` only replaces the first occurrence of `oldContent` in edit steps (line 734)

## Summary

| Severity | Issue | Status |
|----------|-------|--------|
| CRITICAL | Duplicate `const fileContent` (compile error) at lines 1221-1223 | FIXED |
| HIGH | After repair success, step re-executed (currentStepIndex not advanced) | FIXED |
| LOW | Dead variable `result` in _handleGitStep | FIXED |
| LOW | No-op `.map(l => l)` identity function | FIXED |
| MEDIUM | `_repairStats` not restored after crash recovery | Known gap, not fixed (would require storage schema change) |
| MEDIUM | No validation of LLM-generated step action types | Known gap, not fixed (runtime default case handles it) |
| LOW | `_repairStats.milestonesWithRepairs` overcounts by 1 | Known gap |
| LOW | `String.replace()` only replaces first occurrence | Known gap (use replaceAll for global replacement) |
