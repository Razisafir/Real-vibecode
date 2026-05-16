# Real Vibecode — Customization & Branding Guide

> **Everything you can change to make this product your own**

---

## Quick Reference: The 6 Branding Categories

| Category | Files to Change | Effort |
|----------|----------------|--------|
| **Product Name** | `product.json`, `cli/src/constants.rs` | Low — find & replace |
| **Icon/Logo** | `resources/brand-icon.svg` + regenerate all sizes | Medium — design + batch export |
| **Color Theme** | `product.json` → onboardingThemes + custom theme JSON | Medium — theme design |
| **AI UI Labels** | `browser/aiExecutionUIService.ts`, `brainDashboardService.ts` | Low — string edits |
| **Platform Packaging** | `resources/{darwin,linux,win32}/`, `build/` | Low — config edits |
| **URLs & Links** | `product.json` → licenseUrl, reportIssueUrl | Low — URL updates |

---

## 1. Product Name & Identity

### The Master File: `product.json`

This is the **single most important file** for rebranding. It controls:

```json
{
  "nameShort": "Real Vibecode",          // Title bar, About dialog, macOS menu
  "nameLong": "Real Vibecode",           // Full product name everywhere
  "applicationName": "real-vibecode",    // CLI binary name, data folders
  "dataFolderName": ".real-vibecode",    // User settings folder
  "win32DirName": "Real Vibecode",       // Windows install directory
  "win32RegValueName": "RealVibecode",   // Windows registry key
  "darwinBundleIdentifier": "com.realvibecode.ide",  // macOS bundle ID
  "urlProtocol": "real-vibecode",        // URL scheme (real-vibecode://)
  "win32AppUserModelId": "RealVibecode.IDE"  // Windows taskbar
}
```

### CLI Identity: `cli/src/constants.rs`

```rust
pub const APPLICATION_NAME: &str = "real-vibecode";
pub const PRODUCT_NAME_LONG: &str = "Real Vibecode";
pub const QUALITYLESS_PRODUCT_NAME: &str = "Real Vibecode";
pub const DEFAULT_DATA_PARENT_DIR: &str = ".real-vibecode";
```

### Secondary Files

| File | What to Change |
|------|---------------|
| `package.json` | `name`, `author.name`, `repository.url`, `bugs.url` |
| `build/gulpfile.branding.ts` | `artifactNaming`, `telemetryProductId`, copyright strings |
| `resources/linux/code.desktop` | `Name=`, `Comment=`, `Icon=`, `MimeType=` |
| `resources/linux/code.appdata.xml` | `<name>`, `<summary>`, `<description>` |
| `resources/server/manifest.json` | `name`, `short_name` |

---

## 2. Visual Branding (Icon & Colors)

### The Master Icon: `resources/brand-icon.svg`

The current design is a **purple-to-cyan gradient caret/cursor** on an **indigo-to-black rounded square**:

```svg
<linearGradient id="favCore" x1="0" y1="0" x2="0" y2="1">
  <stop offset="0%" stop-color="#8B5CF6" />   <!-- Purple -->
  <stop offset="100%" stop-color="#06B6D4" />  <!-- Cyan -->
</linearGradient>
<linearGradient id="favBg" x1="0" y1="0" x2="1" y2="1">
  <stop offset="0%" stop-color="#1E1B4B" />   <!-- Indigo -->
  <stop offset="100%" stop-color="#09090B" />  <!-- Near-black -->
</linearGradient>
```

### Icon Files to Regenerate

After changing `brand-icon.svg`, regenerate ALL platform icon sizes:

| Platform | File | Sizes Needed |
|----------|------|-------------|
| Windows | `resources/win32/code.ico` | 16, 24, 32, 48, 64, 128, 256px |
| Windows Tiles | `resources/win32/code_{30,44,70,150}x{30,44,70,150}.png` | As named |
| macOS | `resources/darwin/code.icns` | 16 through 1024 (inc. @2x) |
| Linux | `resources/linux/code.png` | 512x512 |
| Linux RPM | `resources/linux/rpm/code.xpm` | 48x48 XPM |
| PWA | `resources/server/code-{192,512}.png` | 192, 512px |
| Favicon | `resources/server/favicon.ico` | 16, 32, 48px |

### Brand Color Touchpoints

| Color | Hex | Where Used |
|-------|-----|-----------|
| Brand Primary | `#8B5CF6` | AI panel header, activity bar, status bar, inline annotations |
| Brand Secondary | `#06B6D4` | Gradient endpoints in icon |
| BG Dark | `#1E1B4B` | Windows tile, icon background |
| BG Darker | `#09090B` | Icon background gradient end |

To change brand colors in the UI, you'd modify:
- `src/vs/sessions/common/theme.js` — registers color tokens for the agent sessions UI
- The icon SVG gradients
- Windows tile manifest: `resources/win32/VisualElementsManifest.xml` → `BackgroundColor`

---

## 3. AI Kernel UI Labels

### Status Bar Indicator

File: `src/vs/workbench/services/aiExecution/browser/aiExecutionUIService.ts`

```typescript
// In _updateIndicator():
'AI Kernel: Initializing'     // Uninitialized state
'AI Kernel: Loading State'    // Hydrating state  
'AI Kernel: {source}'         // Executing (e.g., "AI Kernel: AI Agent")
'AI Kernel: Ready'            // Ready state
'AI Kernel: Shutting Down'    // Shutting down
'AI Kernel: Offline'          // Disposed
```

### AI Panel Labels

```typescript
// In _rebuildTimeline():
'Individual Operations'       // Ungrouped timeline entries label
`Scope ${scopeId.slice(0,8)}` // Scope group labels (dynamic)
```

### Brain Dashboard Labels

File: `src/vs/workbench/services/aiExecution/browser/brainDashboardService.ts`

The dashboard service provides view models for the brain status panel. Labels here control what's shown in the coordination dashboard.

---

## 4. Platform-Specific Packaging

### macOS

| File | Key Fields |
|------|-----------|
| `product.json` | `darwinBundleIdentifier`, `darwinProfileUUID` |
| `build/gulpfile.branding.ts` | `CFBundleName`, `NSHumanReadableCopyright` |
| `resources/darwin/bin/code.sh` | Binary name "Real Vibecode" |

### Windows

| File | Key Fields |
|------|-----------|
| `product.json` | `win32MutexName`, `win32DirName`, `win32RegValueName`, `win32AppUserModelId` |
| `build/win32/code.iss` | `AppPublisher`, `AppPublisherURL`, `OutputBaseFilename` |
| `build/win32/i18n/messages.en.isl` | `UpdatingRealVibecode` |
| `resources/win32/VisualElementsManifest.xml` | `ShortDisplayName`, `BackgroundColor` |
| `resources/win32/appx/AppxManifest.xml` | `Publisher`, `PublisherDisplayName` |

### Linux

| File | Key Fields |
|------|-----------|
| `resources/linux/code.desktop` | `Name`, `Comment`, `Icon`, `MimeType` |
| `resources/linux/code-url-handler.desktop` | `Name`, `MimeType` |
| `resources/linux/code.appdata.xml` | Full product description |
| `resources/linux/debian/control.template` | `Maintainer`, `Homepage` |

---

## 5. URLs & External Links

All in `product.json`:

```json
{
  "licenseUrl": "https://github.com/Razisafir/Real-vibecode/blob/main/LICENSE.txt",
  "reportIssueUrl": "https://github.com/Razisafir/Real-vibecode/issues/new",
  "webviewContentExternalBaseUrlTemplate": "https://{{uuid}}.real-vibecode-cdn.net/..."
}
```

Also update:
- `package.json` → `repository.url`, `bugs.url`
- `build/gulpfile.branding.ts` → `telemetryProductId`
- `resources/linux/code.appdata.xml` → `<url type="homepage">`

---

## 6. Things We Intentionally Kept

| What | Why We Keep It |
|------|---------------|
| Extension API namespace `vscode` | Breaks ALL marketplace extensions if changed |
| `VSCODE_*` environment variables | Internal Electron IPC; renaming breaks boot + WSL |
| Extension host protocol IDs | Extension compatibility |
| Language server protocol IDs | LSP compatibility |

These are **runtime API surface**, not branding. Users never see them.

---

## Step-by-Step: Complete Rebrand Checklist

1. **Edit `product.json`** — Change all name/identifier fields
2. **Edit `cli/src/constants.rs`** — Change CLI identity
3. **Edit `package.json`** — Change npm package identity
4. **Edit `build/gulpfile.branding.ts`** — Change copyright, artifact naming
5. **Replace `resources/brand-icon.svg`** — New icon design
6. **Regenerate all icon sizes** — ICO, ICNS, PNGs from the SVG
7. **Edit `resources/linux/code.desktop`** — Linux app launcher
8. **Edit `resources/linux/code.appdata.xml`** — App store listing
9. **Edit `resources/win32/VisualElementsManifest.xml`** — Windows tile
10. **Edit `resources/server/manifest.json`** — PWA/web manifest
11. **Update AI UI labels** — If you want to rename "AI Kernel" in the status bar
12. **Build and test** on all target platforms
