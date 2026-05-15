# Phase 1 — Execution Log: Injection Point

**Date:** 2026-05-16
**Task:** TASK 3 — Injection Point
**Status:** COMPLETED

---

## Exact Injection Point

### File Path
```
src/vs/workbench/workbench.common.main.ts
```

### Injection Mechanism

The injection works through a **side-effect import** pattern. The actual `registerSingleton()` call lives in the contribution file, and the manifest file triggers it by importing the contribution file.

### Insertion Location

**Line 149-150** (after the AI kernel comment):

```typescript
import './services/agentHost/common/agentHostPermissionService.js';
import './services/log/common/defaultLogLevels.js';

// AI Execution Kernel — Phase 1 Foundation Layer
import './services/aiExecution/browser/aiExecution.contribution.js';   // ← NEW LINE

import { InstantiationType, registerSingleton } from '../platform/instantiation/common/extensions.js';
```

### Surrounding Code (Real Context)

**BEFORE (original):**
```typescript
import './services/agentHost/common/agentHostPermissionService.js';
import './services/log/common/defaultLogLevels.js';

import { InstantiationType, registerSingleton } from '../platform/instantiation/common/extensions.js';
```

**AFTER (modified):**
```typescript
import './services/agentHost/common/agentHostPermissionService.js';
import './services/log/common/defaultLogLevels.js';

// AI Execution Kernel — Phase 1 Foundation Layer
import './services/aiExecution/browser/aiExecution.contribution.js';

import { InstantiationType, registerSingleton } from '../platform/instantiation/common/extensions.js';
```

### How It Works

1. When `workbench.common.main.ts` is loaded (during workbench startup), the side-effect import triggers `aiExecution.contribution.ts`.
2. Inside `aiExecution.contribution.ts`, `registerSingleton(IAIExecutionService, AIExecutionService, InstantiationType.Delayed)` pushes the service descriptor into the global `_registry`.
3. Later, `Workbench.initServices()` calls `getSingletonServiceDescriptors()`, which returns all entries from `_registry` including our new service.
4. These are merged into the `ServiceCollection` and the `InstantiationService` becomes aware of `IAIExecutionService`.
5. When any consumer declares `@IAIExecutionService` in its constructor, the DI container lazily instantiates `AIExecutionService` with its dependencies (`ILogService`, `IEditorService`, `ITextFileService`).

### The registerSingleton Call (In Contribution File)

```typescript
// src/vs/workbench/services/aiExecution/browser/aiExecution.contribution.ts
registerSingleton(IAIExecutionService, AIExecutionService, InstantiationType.Delayed);
```

This is equivalent to:
```typescript
registerSingleton(IAIExecutionService, AIExecutionService, true);
```

The `true` / `InstantiationType.Delayed` means the service is lazily instantiated — it won't be created until a consumer first requests it.
