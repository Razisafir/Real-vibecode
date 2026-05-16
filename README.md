# Real Vibecode

**AI-Native IDE** — Built on a forked architecture with an integrated AI Execution Kernel.

## What is Real Vibecode?

Real Vibecode is an AI-native IDE that transforms the code editor into an execution-aware environment. It combines a proven code editor foundation with an authoritative AI mutation control layer and a causal execution graph engine.

## Architecture

### Phase 1: AI Execution Kernel
Core service layer providing AI-driven workspace mutations through dependency injection:
- `IAIExecutionService` — Authoritative gateway for all controlled file mutations
- `IAIMutationContext` — Source tagging and execution tracing
- `AIMutationBypassToken` — Recursion-safe internal mutation routing
- `IAIExecutionRecord` — Structured audit trail for all operations

### Phase 2: Authoritative File Mutation Control
Full mutation lifecycle interception and policy enforcement:
- `IBulkEditService` integration for workspace edits
- `ITextFileSaveParticipant` hook for save operations
- 3-layer recursion safety (bypass tokens, active context tracking, stack depth guard)
- Content checksum tracking (FNV-1a based)

### Phase 3: Execution Graph Engine
Persistent causal DAG tracking all meaningful workspace operations:
- `IExecutionGraphService` — Decoupled causal DAG service
- Node types: file-edit, workspace-edit, save, formatter, refactor, ai-action, system-action
- Edge types: caused-by, triggered, parent, rollback-of, derived-from
- JSONL persistence with async-safe writes
- Cycle prevention via BFS validation
- Memory pruning for bounded resource usage
- Rollback metadata foundations (InverseEdit, SnapshotRestore, EditorUndo)

### Phase 4: Product Identity & Branding Migration
Standalone IDE identity transformation:
- Product naming: **Real Vibecode** (`real-vibecode`)
- Application ID: `com.realvibecode.ide`
- URL protocol: `real-vibecode://`
- Custom brand icon integrated across all platforms (Windows .ico, macOS .icns, Linux .png)
- All VS Code branding references replaced in UI-facing surfaces
- Extension system compatibility preserved (runtime APIs unchanged)

## Build

Real Vibecode builds on the upstream VS Code build system. Product identity is controlled via `product.json` and `build/gulpfile.branding.ts`.

```bash
# Clone with submodules
git clone https://github.com/Razisafir/Real-vibecode.git

# Build (requires upstream VS Code source merge)
./scripts/code.sh
```

## Data Directories

| Platform | Path |
|----------|------|
| Linux/macOS | `~/.real-vibecode/` |
| Windows | `%APPDATA%\Real Vibecode\` |
| Server | `~/.real-vibecode-server/` |

## License

MIT
