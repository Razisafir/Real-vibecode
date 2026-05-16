# Phase 1 — Execution Log: Codebase Discovery

**Date:** 2026-05-16
**Task:** TASK 1 — Codebase Discovery
**Status:** COMPLETED

---

## Service Registry System

| File Path | Purpose | Importance for AI Kernel |
|-----------|---------|--------------------------|
| `src/vs/platform/instantiation/common/extensions.ts` | Defines `registerSingleton()` — pushes `[ServiceIdentifier, SyncDescriptor]` into a global `_registry` array. Also defines `getSingletonServiceDescriptors()` and `InstantiationType` (Eager=0 vs Delayed=1). | **CRITICAL** — This is how we register `IAIExecutionService` in the DI container. |
| `src/vs/platform/instantiation/common/instantiation.ts` | Defines `createDecorator<T>()` — the ONLY valid way to create a `ServiceIdentifier<T>`. Also defines `IInstantiationService`, `ServiceIdentifier<T>`, and `ServicesAccessor`. | **CRITICAL** — We use `createDecorator` to create the `IAIExecutionService` service identifier. |
| `src/vs/platform/instantiation/common/instantiationService.ts` | `InstantiationService` — The runtime DI container. Resolves dependencies, handles eager vs lazy instantiation, builds dependency graphs, detects cycles. | **MEDIUM** — Understanding how the container resolves our service. |
| `src/vs/platform/instantiation/common/serviceCollection.ts` | `ServiceCollection` — A `Map<ServiceIdentifier, instance_or_SyncDescriptor>`. Used by bootstrap to manually register infrastructure services before DI starts. | **MEDIUM** — Infrastructure services (IFileService, etc.) are registered here first. |
| `src/vs/platform/instantiation/common/descriptors.ts` | `SyncDescriptor<T>` — Wraps a constructor + static args + delayed-instantiation flag. | **LOW** — Used internally by registerSingleton. |

---

## Dependency Injection System

### How DI Works in VS Code

1. **`createDecorator<T>('serviceName')`** creates a `ServiceIdentifier<T>` that acts as both a decorator and a lookup key.
2. **`registerSingleton(ID, Ctor, InstantiationType)`** wraps the constructor in a `SyncDescriptor` and pushes it to the global `_registry`.
3. At **workbench startup**, `Workbench.initServices()` calls `getSingletonServiceDescriptors()` to pull ALL registered singletons from `_registry`, then feeds them into a `ServiceCollection` → `InstantiationService`.
4. When a consumer declares `@IAIExecutionService` in its constructor, the DI container resolves it lazily (if Delayed) or eagerly (if Eager).

### Registration Pattern

```typescript
// Step 1: Define interface + decorator (in common/)
export const IAIExecutionService = createDecorator<IAIExecutionService>('aiExecutionService');
export interface IAIExecutionService { readonly _serviceBrand: undefined; /* methods */ }

// Step 2: Implement the service (in browser/)
export class AIExecutionService implements IAIExecutionService {
    declare readonly _serviceBrand: undefined;
    constructor(@ILogService logService: ILogService) { }
}

// Step 3: Register (in contribution file)
registerSingleton(IAIExecutionService, AIExecutionService, InstantiationType.Delayed);
```

---

## Workbench Bootstrap Chain

| Step | File | Role |
|------|------|------|
| 1 | `src/vs/workbench/workbench.desktop.main.ts` | Desktop entry point. Imports `workbench.common.main.ts` (triggers all `registerSingleton` side-effects), then desktop-only services. |
| 2 | `src/vs/workbench/workbench.common.main.ts` | **Shared service/contribution manifest**. ~140 side-effect imports + ~15 direct `registerSingleton()` calls. |
| 3 | `src/vs/workbench/electron-browser/desktop.main.ts` | `DesktopMain.initServices()` creates `ServiceCollection`, manually registers infrastructure services (IFileService, ILogService, etc.). |
| 4 | `src/vs/workbench/browser/workbench.ts` | `Workbench.startup()` → `initServices()`: calls `getSingletonServiceDescriptors()`, merges into `ServiceCollection`, creates `InstantiationService`. |

### Critical Flow in Workbench.initServices()

```
1. serviceCollection.set(IWorkbenchLayoutService, this)         // manual
2. const contributedServices = getSingletonServiceDescriptors() // ALL registerSingleton() calls
3. for ([id, descriptor] of contributedServices) serviceCollection.set(id, descriptor)
4. new InstantiationService(serviceCollection, true)            // DI container ready
5. lifecycleService.phase = LifecyclePhase.Ready               // triggers contributions
```

---

## File System Service

| File Path | Purpose | Importance for AI Kernel |
|-----------|---------|--------------------------|
| `src/vs/platform/files/common/files.ts` | `IFileService` interface + `createDecorator`. `writeFile()`, `createFile()`, `resolve()` methods. | **HIGH** — Low-level file I/O. Our service wraps this via ITextFileService. |
| `src/vs/platform/files/common/fileService.ts` | `FileService` implementation. `writeFile()` at line 381. | **MEDIUM** — Understanding the write pipeline for the file mutation hook. |

**Note:** `IFileService` is manually set in `DesktopMain.initServices()` and `BrowserMain.initServices()` — NOT via `registerSingleton` because it must exist before the DI container.

---

## Terminal Service

| File Path | Purpose | Importance for AI Kernel |
|-----------|---------|--------------------------|
| `src/vs/workbench/contrib/terminal/browser/terminal.ts` | `ITerminalService` interface + `createDecorator`. Line 39. | **HIGH** — Will be injected into AIExecutionService in Phase 2 for `requestTerminalExecution()`. |
| `src/vs/workbench/contrib/terminal/browser/terminal.contribution.ts` | Terminal service registrations (lines 53-61). | **MEDIUM** — Shows the pattern for registering terminal-related services. |

---

## Editor Service

| File Path | Purpose | Importance for AI Kernel |
|-----------|---------|--------------------------|
| `src/vs/workbench/services/editor/common/editorService.ts` | `IEditorService` interface + `createDecorator`. | **HIGH** — Injected into AIExecutionService for resolving editors and applying edits. |
| `src/vs/workbench/services/editor/browser/editorService.ts` | `EditorService` implementation. Registered as Eager singleton. | **MEDIUM** — `registerSingleton(IEditorService, new SyncDescriptor(EditorService, [undefined], false))` |
