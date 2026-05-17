# Terminal Intelligence

## Phase 8 — Terminal + Process Orchestration System

## Overview

The Terminal Intelligence Layer provides runtime awareness of process output using structured heuristics. It classifies output, parses errors, and generates result summaries — enabling the AI system to react to build failures, test results, and runtime errors.

**This is NOT a full AI parser.** It uses structured heuristics for deterministic, fast classification.

## Output Classification

12 classification categories with heuristic pattern matching:

| Classification | Detection Pattern | Example |
|---------------|-------------------|---------|
| Error | `error`, `fatal`, `failed`, `exception` | `Error: Cannot find module` |
| Warning | `warning`, `warn`, `deprecated` | `Warning: deprecated API` |
| BuildOutput | `compil`, `build`, `webpack`, `vite` | `Compiling TypeScript files...` |
| TestResult | `pass`, `fail`, `test`, `✓`, `✗` | `✓ 42 tests passed` |
| StackTrace | `at ` (indented) | `    at Object.<anonymous> (app.ts:5:10)` |
| PackageManager | `npm`, `yarn`, `added`, `removed` | `added 150 packages` |
| DevServer | `listening`, `port`, `ready in` | `Server listening on port 3000` |
| Progress | `[=====]`, `[50%]` | `████████░░ 80%` |
| Success | `success`, `done`, `complete` | `Build succeeded in 2.3s` |
| Info | Default for unmatched | `Running on Node.js v20.0.0` |
| Unknown | Empty/whitespace lines | `   ` |

## Error Parsing

Structured error extraction using regex patterns for common tools:

### TypeScript
```
app.ts(10,5): error TS2307: Cannot find module 'lodash'.
→ filePath: app.ts, line: 10, column: 5, errorCode: TS2307, tool: tsc
```

### ESLint
```
  src/app.ts:15:3: error no-unused-vars ... [eslint]
→ filePath: src/app.ts, line: 15, column: 3, tool: eslint
```

### Generic
```
Error: ECONNREFUSED 127.0.0.1:3000
→ message: ECONNREFUSED 127.0.0.1:3000, tool: generic
```

### Python
```
ImportError: No module named 'flask'
→ message: No module named 'flask', tool: python
```

### npm
```
npm ERR! code E404
→ message: code E404, tool: npm
```

## Result Summary

After process completion, a structured summary is generated:

```typescript
interface IProcessResultSummary {
  success: boolean;           // exitCode === 0
  exitCode: number;           // Process exit code
  durationMs: number;         // Total execution time
  errorCount: number;         // Parsed errors from output
  warningCount: number;       // Parsed warnings from output
  parsedErrors: IParsedError[]; // Structured error details
  summary: string;            // Human-readable summary
}
```

### Example Summaries

**Success:**
```
"Command completed successfully in 2340ms"
```

**Failure:**
```
"Command failed with exit code 1 after 5670ms (3 errors, 1 warnings)"
```

## Integration with Agent System

Agents consume terminal intelligence through the orchestrator:

```typescript
// Agent requests execution
const session = await processService.executeCommand({
  command: 'npm run build',
  mode: ExecutionMode.Foreground,
  agentId: 'build-agent',
});

// Agent reads result summary
const summary = processService.generateResultSummary(session.id);

// Agent reacts to errors
if (!summary.success) {
  for (const error of summary.parsedErrors) {
    // Each error has filePath, line, column, errorCode, message, severity, tool
    // Agent can use this to plan fixes
  }
}
```

## Design Decisions

1. **Heuristics over AI**: Deterministic, fast, no model dependency
2. **Best-effort parsing**: Unknown formats return Unknown classification
3. **Tool-specific patterns**: TS, ESLint, npm, Python, compilers
4. **Extensible**: New patterns can be added without modifying core
5. **Bounded**: Output buffer is limited to prevent memory issues
