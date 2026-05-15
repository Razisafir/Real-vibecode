# Phase 4 — Branding Migration Execution Log

## Execution Summary

- **Phase**: 4 — Product Identity + Branding Migration
- **Start**: 2026-05-16
- **Status**: COMPLETE
- **Commit**: TBD (pending push)

## Task Execution

### Task 1: Full Identity Audit
- Scanned fork repository (`vs-code-fork/`) for all VS Code identity strings
- Scanned full VS Code source tree (`vscode-source/`) for comprehensive identity mapping
- Identified 5 source files in fork with "VS Code" references
- Identified 25+ fields in `product.json` requiring update
- Identified template placeholder system (`@@NAME@@`, `@@APPNAME@@`, etc.)
- Categorized findings: product-name, executable, app-id, branding, cli-command, installer, icon, metadata, window-title, about-dialog, welcome-screen

### Task 2: Icon Integration
- Saved brand icon SVG to `resources/brand-icon.svg`
- Used CairoSVG + Pillow to render icon at 1024x1024 base resolution
- Generated icon assets:
  - Windows `.ico` (7 sizes: 16-256px)
  - macOS `.icns` (6 sizes: 16-1024px, PNG-based icns format)
  - Linux `.png` (7 sizes: 16-512px)
  - PWA icons (192px, 512px)
  - Favicon `.ico` (multi-size)
  - Windows tiles (150x150, 70x70, 44x44, 30x30)
  - RPM `.xpm` (48x48)
- Updated background color in VisualElementsManifest from `#2D2D30` to `#1E1B4B` (brand indigo)

### Task 3: Product Naming Transformation
- Product name: **Real Vibecode**
- Application name: `real-vibecode`
- Updated all source file headers from "Real-vibecode VS Code Fork" to "Real Vibecode — AI-Native IDE"
- Renamed `RollbackStrategy.VSCodeUndo` → `RollbackStrategy.EditorUndo` (with string value `editor-undo`)
- Updated all code comments referencing "VS Code" to use generic "editor" terminology
- Updated README.md with full project description

### Task 4: Electron App Metadata Update
- Created `product.json` with all Real Vibecode identity fields
- Created `package.json` with updated name, author, repository, bugs
- Created `build/gulpfile.branding.ts` with Win32 EXE metadata, macOS plist overrides, artifact naming, telemetry ID
- Created `src/vs/platform/product/common/product.ts` with hardcoded fallback values
- Generated new Windows GUIDs for App IDs (replacing Microsoft's GUIDs)
- Generated new macOS profile UUIDs

### Task 5: Extension System Compatibility Preservation
- Verified that extension API namespace (`vscode`) is NOT modified
- Only UI-facing and packaging-layer identity is changed
- Runtime API surface remains identical to upstream
- Template placeholders in build scripts remain — they resolve from `product.json` at build time
- Extension host identifiers unchanged

### Task 6: UI Branding Surface Update
- Window title: driven by `productService.nameLong` → "Real Vibecode"
- About dialog: driven by `productService.nameLong` → "Real Vibecode"
- PWA manifest: name and short_name set to "Real Vibecode"
- Desktop entries: Name and Comment fields updated
- Installer messages: "Updating Visual Studio Code" → "Updating Real Vibecode"
- VisualElementsManifest: ShortDisplayName → "Real Vibecode"

### Task 7: Build System Update
- Created `build/gulpfile.branding.ts` for packaging metadata injection
- Created `cli/src/constants.rs` for Rust CLI identity
- Created `cli/Cargo.toml` for CLI binary naming
- Shell wrapper scripts: all `@@APPNAME@@` → `real-vibecode`, `@@NAME@@` → `Real Vibecode`
- Inno Setup: `OutputBaseFilename=RealVibecodeSetup`, publisher URLs updated
- Debian/RPM/Snap packaging: maintainer, URLs, descriptions updated
- Shell completions: target command `real-vibecode`

## Files Created/Modified

### New Files (27)
1. `product.json`
2. `package.json`
3. `resources/brand-icon.svg`
4. `resources/brand-icon-1024.png`
5. `resources/win32/code.ico`
6. `resources/win32/code_150x150.png`
7. `resources/win32/code_70x70.png`
8. `resources/win32/code_44x44.png`
9. `resources/win32/code_30x30.png`
10. `resources/darwin/code.icns`
11. `resources/darwin/icon_16.png` through `icon_512@2x.png` (10 files)
12. `resources/linux/code.png` (and 6 additional sizes)
13. `resources/linux/rpm/code.xpm`
14. `resources/server/code-192.png`
15. `resources/server/code-512.png`
16. `resources/server/favicon.ico`
17. `resources/server/manifest.json`
18. `resources/linux/bin/code.sh`
19. `resources/darwin/bin/code.sh`
20. `resources/win32/bin/code.cmd`
21. `resources/win32/versioned/bin/code.cmd`
22. `resources/win32/bin/code.sh`
23. `resources/completions/bash/code`
24. `resources/completions/zsh/_code`
25. `resources/linux/code.desktop`
26. `resources/linux/code-url-handler.desktop`
27. `resources/linux/code.appdata.xml`
28. `resources/linux/code-workspace.xml`
29. `resources/linux/debian/control.template`
30. `resources/linux/rpm/code.spec.template`
31. `resources/linux/snap/snapcraft.yaml`
32. `resources/win32/VisualElementsManifest.xml`
33. `resources/win32/appx/AppxManifest.xml`
34. `build/win32/code.iss`
35. `build/win32/i18n/messages.en.isl`
36. `build/gulpfile.branding.ts`
37. `cli/src/constants.rs`
38. `cli/Cargo.toml`
39. `src/vs/platform/product/common/product.ts`
40. `docs/architecture/product-identity.md`
41. `docs/architecture/branding-migration.md`
42. `docs/execution-logs/phase4-branding-migration.md`

### Modified Files (6)
1. `src/vs/workbench/services/aiExecution/common/aiExecutionService.ts` — Header + comment
2. `src/vs/workbench/services/aiExecution/common/executionGraphService.ts` — Header + enum rename
3. `src/vs/workbench/services/aiExecution/browser/aiExecutionService.ts` — Header + rollback strategy
4. `src/vs/workbench/services/aiExecution/browser/executionGraphService.ts` — Header
5. `src/vs/workbench/services/aiExecution/browser/aiExecution.contribution.ts` — Header + comment
6. `src/vs/workbench/workbench.common.main.ts` — Copyright header
7. `README.md` — Full rewrite

## Decisions

1. **RollbackStrategy.VSCodeUndo → EditorUndo**: Renamed to be product-neutral while preserving the same semantic meaning (delegating to the editor's undo/redo system). The string value changed from `'vscode-undo'` to `'editor-undo'` for data compatibility.

2. **"VS Code" in comments → "editor"**: All user-facing comments referencing "VS Code" now use generic "editor" terminology, since the code comments are part of the product's source code.

3. **Upstream copyright preserved**: The `workbench.common.main.ts` file retains attribution to Microsoft Corporation as the upstream source, with the Real Vibecode Project copyright added as the primary.

4. **Extension API namespace untouched**: The `vscode` namespace in extension APIs is a runtime contract, not branding. Changing it would break all extensions. It remains as `vscode`.

5. **New GUIDs for Windows**: Generated fresh GUIDs for Windows App IDs rather than reusing Microsoft's, to ensure no collision with VS Code installations.

6. **Built-in extensions removed**: The `product.json` `builtInExtensions` array is empty — the fork doesn't ship Microsoft's proprietary debug extensions. These can be added back individually if needed.
