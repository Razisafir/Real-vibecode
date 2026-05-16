# Dependency Analysis Architecture

## Phase 6 — Real Vibecode AI-Native IDE

## Overview

The Dependency Analysis system provides incremental symbol intelligence and dependency tracking for the workspace. It uses lightweight regex-based extraction rather than a full compiler, with confidence scoring to indicate reliability.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│              SymbolDependencyAnalyzer                         │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │          ILanguageAnalyzer Plugin System              │   │
│  │                                                     │   │
│  │  ┌───────────────────┐  ┌──────────────────────┐   │   │
│  │  │ TypeScript/JS     │  │ Future: Python,      │   │   │
│  │  │ Built-in Analyzer │  │ Rust, Go, etc.       │   │   │
│  │  │                   │  │ (implement           │   │   │
│  │  │ - Functions       │  │  ILanguageAnalyzer)  │   │   │
│  │  │ - Classes         │  │                      │   │   │
│  │  │ - Interfaces      │  └──────────────────────┘   │   │
│  │  │ - Types           │                              │   │
│  │  │ - Enums           │                              │   │
│  │  │ - Constants       │                              │   │
│  │  │ - import/from     │                              │   │
│  │  │ - require()       │                              │   │
│  │  │ - import()        │                              │   │
│  │  └───────────────────┘                              │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## Symbol Extraction (TypeScript/JavaScript)

### Extracted Symbol Kinds

| Kind | Pattern | Example |
|------|---------|---------|
| Function | `(export)? (async)? function NAME` | `export function handleClick()` |
| Class | `(export)? class NAME` | `export class AppComponent` |
| Interface | `(export)? interface NAME` | `interface IConfig` |
| Type | `(export)? type NAME =` | `type Status = 'active' \| 'inactive'` |
| Enum | `(export)? enum NAME` | `enum Color { Red, Blue }` |
| Constant | `(export)? const NAME =` | `export const API_URL = '...'` |

### Extraction Limitations

- **No AST**: Uses regex matching, so complex patterns may be missed
- **No scope awareness**: Cannot distinguish between top-level and nested declarations
- **No type inference**: Cannot determine variable types
- **Max 200 symbols per file**: Bounds memory usage
- **Method detection disabled at top level**: Too many false positives

## Dependency Extraction

### Supported Import Patterns

| Pattern | Confidence | Source |
|---------|-----------|--------|
| `import { X } from 'path'` | 0.9 | static-analysis |
| `import X from 'path'` | 0.9 | static-analysis |
| `import * as X from 'path'` | 0.9 | static-analysis |
| `require('path')` | 0.8 | static-analysis |
| `import('path')` | 0.7 | static-analysis |

### Path Resolution

- **Relative imports** (`./`, `../`): Resolved against the importing file's directory
- **Package imports** (everything else): Represented as `package:importPath` URI
- **Extension inference**: If no extension, defaults to `.ts`

### Dependency Map Structure

```typescript
interface IDependencyMap {
  edges: IDependencyEdge[];       // All import edges
  hubFiles: URI[];                // Files imported by many (top 20)
  leafFiles: URI[];               // Files importing many (top 20)
  cycles: ReadonlyArray<URI[]>;   // Circular dependencies
}
```

## Incremental Update Strategy

Dependency analysis is NOT re-run on every file save. Instead:

1. **On file save**: Mark the file's dependency context as stale
2. **On query**: If stale, re-analyze the file before returning results
3. **Background**: Periodic re-analysis of stale files (debounced)

This ensures that:
- Editor responsiveness is never impacted
- Dependencies are fresh when queried
- Analysis cost is spread over time

## Language Extensibility

New languages can be supported by implementing `ILanguageAnalyzer`:

```typescript
interface ILanguageAnalyzer {
  extensions: readonly string[];  // e.g., ['.py', '.pyw']
  language: string;               // e.g., 'python'
  analyze(content: string, uri: URI): {
    symbols: ISymbolContext[];
    dependencies: IDependencyEdge[];
  };
}
```

Register via:
```typescript
symbolDependencyAnalyzer.registerLanguageAnalyzer(new PythonAnalyzer());
```

## Dependency Tracking Flow

```
File Save
  │
  ▼
AIContextService.notifyFileModified(uri)
  │
  ▼ (debounced 300ms)
Process Pending Changes
  │
  ▼
SymbolDependencyAnalyzer.analyzeFile({ uri, deep: false })
  │
  ├── Extract symbols → ISymbolContext[]
  └── Extract dependencies → IDependencyEdge[]
  │
  ▼
Update Context Engine
  ├── Update _symbolsByFile map
  ├── Update _dependencyEdges array
  ├── Update _dependencyIndex
  └── Fire ContextDomain.Symbol + ContextDomain.Dependency updates
```
