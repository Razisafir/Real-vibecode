# Branding Migration — Phase 4

## Migration Overview

This document records the complete branding migration from VS Code identity to Real Vibecode. Every replaced identity string, every modified file, and every asset replacement is documented here.

## Identity Audit Results

### Source Code Files (Fork-specific)

| File | Change | Before | After |
|------|--------|--------|-------|
| `common/aiExecutionService.ts` | Header | "Real-vibecode VS Code Fork" | "Real Vibecode — AI-Native IDE" |
| `common/aiExecutionService.ts` | Comment | "Compatible with VS Code's IIdentifiedSingleEditOperation" | "Compatible with the editor's IIdentifiedSingleEditOperation" |
| `common/executionGraphService.ts` | Header | "Real-vibecode VS Code Fork" | "Real Vibecode — AI-Native IDE" |
| `common/executionGraphService.ts` | Enum | `VSCodeUndo = 'vscode-undo'` | `EditorUndo = 'editor-undo'` |
| `browser/aiExecutionService.ts` | Header | "Real-vibecode VS Code Fork" | "Real Vibecode — AI-Native IDE" |
| `browser/aiExecutionService.ts` | Usage | `RollbackStrategy.VSCodeUndo` | `RollbackStrategy.EditorUndo` |
| `browser/executionGraphService.ts` | Header | "Real-vibecode VS Code Fork" | "Real Vibecode — AI-Native IDE" |
| `browser/aiExecution.contribution.ts` | Header | "Real-vibecode VS Code Fork" | "Real Vibecode — AI-Native IDE" |
| `browser/aiExecution.contribution.ts` | Comment | "VSCodeUndo — save can be undone via VS Code undo" | "EditorUndo — save can be undone via editor undo" |
| `workbench.common.main.ts` | Copyright | "Copyright (c) Microsoft Corporation" | "Copyright (c) Real Vibecode Project" + upstream attribution |

### product.json — Complete Field Mapping

| Key | Before (Code - OSS) | After (Real Vibecode) |
|-----|---------------------|----------------------|
| nameShort | "Code - OSS" | "Real Vibecode" |
| nameLong | "Code - OSS" | "Real Vibecode" |
| applicationName | "code-oss" | "real-vibecode" |
| dataFolderName | ".vscode-oss" | ".real-vibecode" |
| sharedDataFolderName | ".vscode-oss-shared" | ".real-vibecode-shared" |
| serverApplicationName | "code-server-oss" | "real-vibecode-server" |
| serverDataFolderName | ".vscode-server-oss" | ".real-vibecode-server" |
| tunnelApplicationName | "code-tunnel-oss" | "real-vibecode-tunnel" |
| win32MutexName | "vscodeoss" | "realvibecode" |
| win32DirName | "Microsoft Code OSS" | "Real Vibecode" |
| win32RegValueName | "CodeOSS" | "RealVibecode" |
| win32AppUserModelId | "Microsoft.CodeOSS" | "RealVibecode.IDE" |
| win32ShellNameShort | "C&ode - OSS" | "Real &Vibecode" |
| win32TunnelServiceMutex | "vscodeoss-tunnelservice" | "realvibecode-tunnelservice" |
| win32TunnelMutex | "vscodeoss-tunnel" | "realvibecode-tunnel" |
| darwinBundleIdentifier | "com.visualstudio.code.oss" | "com.realvibecode.ide" |
| linuxIconName | "code-oss" | "real-vibecode" |
| urlProtocol | "code-oss" | "real-vibecode" |
| licenseUrl | github.com/microsoft/vscode | github.com/Razisafir/Real-vibecode |
| reportIssueUrl | github.com/microsoft/vscode | github.com/Razisafir/Real-vibecode |
| onboardingKeymaps[0].label | "VS Code" | "Real Vibecode" |

### package.json — Field Mapping

| Key | Before | After |
|-----|--------|-------|
| name | "code-oss-dev" | "real-vibecode-dev" |
| author.name | "Microsoft Corporation" | "Real Vibecode Project" |
| repository.url | github.com/microsoft/vscode.git | github.com/Razisafir/Real-vibecode.git |
| bugs.url | github.com/microsoft/vscode/issues | github.com/Razisafir/Real-vibecode/issues |

### Shell Wrappers

| File | Template Replacements |
|------|----------------------|
| `resources/linux/bin/code.sh` | `@@APPNAME@@` → `real-vibecode`, `@@PRODNAME@@` → `Real Vibecode` |
| `resources/darwin/bin/code.sh` | `@@APPNAME@@` → `real-vibecode`, `@@NAME@@` → `Real Vibecode` |
| `resources/win32/bin/code.cmd` | `@@NAME@@` → `real-vibecode` |
| `resources/win32/versioned/bin/code.cmd` | `@@NAME@@` → `real-vibecode` |
| `resources/win32/bin/code.sh` | Hardcoded values for WSL support |

### Desktop/Installer Files

| File | Changes |
|------|---------|
| `resources/linux/code.desktop` | Name, Icon, StartupWMClass, MimeType, Keywords updated |
| `resources/linux/code-url-handler.desktop` | Name, Icon, MimeType, Keywords updated |
| `resources/linux/code.appdata.xml` | Name, URL, Summary, Description updated |
| `resources/linux/code-workspace.xml` | MIME type, glob pattern updated |
| `resources/linux/debian/control.template` | Maintainer, Homepage, Description updated |
| `resources/linux/rpm/code.spec.template` | Vendor, Packager, URL, Description updated |
| `resources/linux/snap/snapcraft.yaml` | Description updated |
| `resources/win32/VisualElementsManifest.xml` | ShortDisplayName, BackgroundColor updated |
| `resources/win32/appx/AppxManifest.xml` | Publisher, PublisherDisplayName updated |
| `build/win32/code.iss` | AppPublisher, URLs, OutputBaseFilename updated |
| `build/win32/i18n/messages.en.isl` | "Updating Visual Studio Code" → "Updating Real Vibecode" |
| `resources/server/manifest.json` | name, short_name updated |
| `resources/completions/bash/code` | Completion function renamed |
| `resources/completions/zsh/_code` | compdef target renamed |

### Build System Files

| File | Purpose |
|------|---------|
| `build/gulpfile.branding.ts` | Branding metadata overrides for Electron packaging |
| `cli/src/constants.rs` | Rust CLI identity constants |
| `cli/Cargo.toml` | CLI binary name and workspace identity |
| `src/vs/platform/product/common/product.ts` | Hardcoded product fallback values |

## Asset Replacement List

| Asset | Before | After |
|-------|--------|-------|
| Windows .ico | VS Code default | Real Vibecode brand icon (purple-cyan caret) |
| macOS .icns | VS Code default | Real Vibecode brand icon (all retina sizes) |
| Linux .png | VS Code default | Real Vibecode brand icon (512x512) |
| Linux .xpm | VS Code default | Real Vibecode brand icon (48x48) |
| PWA 192px | VS Code default | Real Vibecode brand icon |
| PWA 512px | VS Code default | Real Vibecode brand icon |
| Favicon | VS Code default | Real Vibecode brand icon |
| Windows tiles | VS Code default | Real Vibecode brand icon |

## Compatibility Safety

### Preserved (NOT modified)
- Extension API namespace (`vscode`)
- Extension host runtime identifiers
- Language server protocol identifiers
- Marketplace integration endpoints
- `vscode` in API-level code (this is the API surface name, not branding)
- Template placeholders (`@@NAME@@`, `@@APPNAME@@`, etc.) in build scripts — these are resolved at build time from `product.json`

### Modified (UI + packaging only)
- Product display names
- Window titles
- About dialog text
- Installer branding
- Executable names
- Icon assets
- Desktop entries
- PWA manifest

## Verification Checklist

- [x] All `product.json` identity fields updated
- [x] All `package.json` identity fields updated
- [x] Shell wrappers use `real-vibecode` binary name
- [x] Desktop entries reference `real-vibecode` icon and binary
- [x] Windows installer uses `RealVibecodeSetup` output name
- [x] macOS bundle identifier is `com.realvibecode.ide`
- [x] PWA manifest shows "Real Vibecode"
- [x] Shell completions target `real-vibecode` command
- [x] CLI constants use Real Vibecode identity
- [x] Source file headers updated to "Real Vibecode — AI-Native IDE"
- [x] `VSCodeUndo` enum renamed to `EditorUndo`
- [x] Icon assets generated for all platforms
- [x] Copyright headers updated with upstream attribution
- [x] Extension system runtime APIs unchanged
