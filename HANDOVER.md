# VibeCode — Project Handover Document

## 1. Project Overview

**VibeCode** is an AI-native code editor built as a fork of VS Code (version 1.121.1). It rebrands the VS Code editor with custom theming, AI execution capabilities, and an independent extension marketplace (Open VSX).

- **Editor Repo**: https://github.com/Razisafir/Real-vibecode
- **Website Repo**: https://github.com/Razisafir/Vibecode-Website2
- **Website URL**: https://razisafir.github.io/Vibecode-Website2/
- **Current Version**: 1.121.1 (tracks VS Code upstream)

---

## 2. Architecture

### How VibeCode Works

VibeCode does NOT contain the full VS Code source in the repository. Instead, it uses a **download-and-patch** approach:

1. **`scripts/prepare-vscode.sh`** downloads the official VS Code source from `microsoft/vscode` at the matching version tag (e.g., `1.121.1`)
2. It applies VibeCode branding patches to the downloaded source (overriding `product.json`, copying icons, themes, etc.)
3. **`scripts/build-desktop.sh`** compiles the patched source and packages it with `electron-builder`

### Key Files

| File | Purpose |
|------|---------|
| `product.json` | **Central branding file** — controls the app name, Windows registry IDs, URLs, extension gallery, etc. Must stay in sync with `electron-builder.yml` |
| `electron-builder.yml` | **Packaging config** — controls how electron-builder creates installers (NSIS for Windows, DMG for macOS, AppImage/DEB/RPM for Linux) |
| `package.json` | Project metadata and npm scripts for building |
| `scripts/prepare-vscode.sh` | Downloads VS Code source and applies branding patches |
| `scripts/build-desktop.sh` | Full build pipeline (prepare → compile → package) |
| `.github/workflows/release.yml` | CI/CD pipeline for building all platforms and creating GitHub Releases |
| `build/win32/installer.nsh` | NSIS custom installer hooks (protocol handlers, file associations, context menus, PATH) |
| `build/darwin/entitlements.mac.plist` | macOS entitlements for hardened runtime |
| `build/linux/postinst.sh` / `postrm.sh` | Linux package post-install/remove scripts |
| `resources/win32/code.ico` | Windows app icon (multi-size .ico) |
| `resources/darwin/code.icns` | macOS app icon |
| `resources/linux/` | Linux icons (.png) and .desktop files |
| `extensions/vibecode-theme-2026/` | Custom VibeCode themes (Dark 2026, Light 2026) |

---

## 3. Build System

### Prerequisites

- **Node.js** 18+ (20 recommended)
- **Yarn** (preferred) or npm
- **Python 3.x** (for node-gyp native modules)
- **Git**

### Local Build (Current Platform)

```bash
# One-command build:
yarn build:desktop

# Or step by step:
bash scripts/prepare-vscode.sh          # Download & patch VS Code source
bash scripts/build-desktop.sh            # Compile & package

# Platform-specific:
yarn build:desktop:win                   # Windows only
yarn build:desktop:mac                   # macOS only
yarn build:desktop:linux                 # Linux only
```

### CI/CD Build (GitHub Actions)

The `.github/workflows/release.yml` workflow handles building all three platforms:

**Trigger options:**
- Push a tag like `v1.121.1` → triggers full build + GitHub Release
- Manual trigger via `workflow_dispatch` → choose platform and version

**Workflow steps (per platform):**
1. Checkout repo
2. Setup Node.js 20 + Python 3.x
3. Install yarn
4. Cache VS Code source and node_modules
5. Run `scripts/prepare-vscode.sh` to download & patch VS Code source
6. Install project dependencies
7. Compile VS Code source (`yarn compile`)
8. Copy compiled `out/` to project root
9. Verify `product.json` has VibeCode branding
10. Install Electron app deps (`electron-builder install-app-deps`)
11. Build installer (`electron-builder --win/--mac/--linux`)
12. Upload artifacts
13. On tag push: create GitHub Release with all artifacts

**To trigger a release:**
```bash
git tag v1.121.1
git push origin v1.121.1
```

---

## 4. Windows Installer Details

### What Gets Installed

The NSIS installer (via `electron-builder`) creates:

- **Installation directory**: `%LOCALAPPDATA%\Programs\VibeCode\` (per-user) or `C:\Program Files\VibeCode\` (per-machine)
- **Start Menu shortcut**: "VibeCode"
- **Desktop shortcut**: "VibeCode"
- **Context menu entries** (via `installer.nsh`):
  - "Open with VibeCode" for files (right-click any file)
  - "Open with VibeCode" for directories (right-click any folder)
- **Protocol handler**: `vibecode://` URL scheme registered system-wide
- **File association**: `.vibecode` files open in VibeCode
- **PATH**: The `bin\` directory is added to user PATH (so `vibecode` CLI works from terminal)

### Windows-Specific Configuration

| Config | Value |
|--------|-------|
| `win32DirName` | `VibeCode` |
| `win32AppUserModelId` | `VibeCode.IDE` |
| `win32x64AppId` | `{A3D8C7E1-4B5F-6A9D-8E2C-7F3B1A6D9C04}` |
| `executableName` | `VibeCode` |
| `urlProtocol` | `vibecode` |

### SmartScreen Warning

Windows SmartScreen will show "Windows protected your PC" because the installer is **not code-signed**. This is expected and cannot be fixed without purchasing a code signing certificate (~$200-500/year).

To resolve, users click "More info" → "Run anyway".

**To fix this permanently**, purchase an EV code signing certificate and configure:
- Set `signAndEditExecutable: true` in `electron-builder.yml`
- Add `CSC_LINK` and `CSC_KEY_PASSWORD` secrets in GitHub repo settings

---

## 5. macOS Installer Details

### What Gets Installed

- **DMG file** containing the VibeCode.app bundle
- Universal binary (x64 + ARM64) for Intel and Apple Silicon Macs
- Drag-to-Applications install

### macOS-Specific Configuration

| Config | Value |
|--------|-------|
| `darwinBundleIdentifier` | `com.vibecode.ide` |
| Hardened Runtime | Enabled |
| Entitlements | JIT, unsigned memory, library validation disabled (required for V8/extensions) |

### Gatekeeper Warning

macOS Gatekeeper will block the app on first launch because it's not notarized. Users must:
1. Right-click → "Open"
2. Or go to System Settings → Privacy & Security → "Open Anyway"

**To fix this permanently**, you need:
1. Apple Developer account ($99/year)
2. Configure `APPLE_ID`, `APPLE_ID_PASSWORD`, `APPLE_TEAM_ID` secrets in GitHub
3. Set `signAndEditExecutable: true` in electron-builder.yml

---

## 6. Extension Marketplace

VibeCode uses **Open VSX** instead of Microsoft's proprietary marketplace:

```json
"extensionsGallery": {
    "serviceUrl": "https://open-vsx.org/vscode/gallery",
    "itemUrl": "https://open-vsx.org/vscode/item",
    "resourceUrlTemplate": "https://open-vsx.org/vscode/unpkg/{publisher}/{name}/{version}/{path}"
}
```

Most popular VS Code extensions are available on Open VSX. Users can browse and install from the Extensions panel inside VibeCode.

**To switch to Microsoft's marketplace** (not recommended — violates their Terms of Use), replace the `extensionsGallery` in `product.json` with:
```json
"extensionsGallery": {
    "serviceUrl": "https://marketplace.visualstudio.com/_apis/public/gallery",
    "itemUrl": "https://marketplace.visualstudio.com/items",
    "cacheUrl": "https://vscode.blob.core.windows.net/gallery/index",
    "controlUrl": ""
}
```

---

## 7. Website

### Structure

The website is a **Next.js 16** app with static export (`output: 'export'`), deployed to GitHub Pages.

- **Repo**: `Razisafir/Vibecode-Website2`
- **URL**: https://razisafir.github.io/Vibecode-Website2/
- **Deploy workflow**: `.github/workflows/deploy.yml` (auto-deploys on push to `main`)

### Key Pages

| Route | File | Purpose |
|-------|------|---------|
| `/` | `src/app/page.tsx` | Homepage with hero, features, AI engine section |
| `/downloads` | `src/app/downloads/page.tsx` | **Download page** with direct links to GitHub Releases |
| `/docs` | `src/app/docs/` | Documentation |
| `/pricing` | `src/app/pricing/` | Pricing page |
| `/features` | `src/app/features/` | Feature details |
| `/contact` | `src/app/contact/` | Contact form |
| `/blog` | `src/app/blog/` | Blog |
| `/changelog` | `src/app/changelog/` | Changelog |
| `/security` | `src/app/security/` | Security policy |
| `/privacy` | `src/app/privacy/` | Privacy policy |
| `/terms` | `src/app/terms/` | Terms of service |

### Download Links

The downloads page uses GitHub Releases' `latest/download/` URL pattern:

```
https://github.com/Razisafir/Real-vibecode/releases/latest/download/VibeCode-Setup-1.121.1-x64.exe
```

**When updating the version**, update the `VERSION` constant in `src/app/downloads/page.tsx`.

### Deployment

The website auto-deploys via GitHub Actions:
1. Push to `main` branch
2. Workflow removes API routes (incompatible with static export)
3. Builds `next build` with static export
4. Deploys to GitHub Pages

**Base path**: `/Vibecode-Website2` (configured in `next.config.ts`)

---

## 8. Updating to a New VS Code Version

When a new VS Code version is released:

1. Update `version` in `product.json` and `package.json`
2. Update the `VSCODE_VERSION` default in `.github/workflows/release.yml`
3. Update the `VERSION` constant in `Vibecode-Website2/src/app/downloads/page.tsx`
4. Test the build locally:
   ```bash
   bash scripts/prepare-vscode.sh --version NEW_VERSION --clean
   bash scripts/build-desktop.sh --clean
   ```
5. Tag and release:
   ```bash
   git tag vNEW_VERSION
   git push origin vNEW_VERSION
   ```

---

## 9. Critical Configuration Checklist

When making changes, ensure these stay in sync:

- [ ] `product.json` → `applicationName`, `win32DirName`, `win32AppUserModelId`, etc.
- [ ] `electron-builder.yml` → `appId`, `productName`, `executableName`, `nsis.shortcutName`, etc.
- [ ] `build/win32/installer.nsh` → executable name references (`$INSTDIR\VibeCode.exe`)
- [ ] `resources/linux/*.desktop` → `Exec`, `Icon`, `Name` fields
- [ ] `package.json` → `name`, `author`
- [ ] Website `downloads/page.tsx` → `VERSION`, filenames
- [ ] Website `page.tsx` → branding text

---

## 10. Known Limitations

| Issue | Status | Fix |
|-------|--------|-----|
| Windows SmartScreen warning | Expected | Purchase code signing certificate |
| macOS Gatekeeper warning | Expected | Purchase Apple Developer account + notarize |
| No auto-update on Windows | Partial | electron-updater works with GitHub Releases, but unsigned updates trigger warnings |
| Custom icon on macOS .icns | Needs regeneration on CI | The `prepare-vscode.sh` copies PNGs; the .icns must be regenerated on a macOS host |
| Telemetry | Disabled | `defaultTelemetryEndpoint` is set to empty string |

---

## 11. Security Notes

- **No Microsoft telemetry** — the telemetry endpoint is disabled in `prepare-vscode.sh`
- **No data collection** — VibeCode does not phone home
- **Extension marketplace** — Open VSX is used instead of Microsoft's proprietary marketplace
- **Code signing** — Not yet configured. Add `CSC_LINK` and `CSC_KEY_PASSWORD` secrets when ready

---

## 12. Repository Structure

```
Real-vibecode/
├── .github/workflows/
│   └── release.yml              # CI/CD for all platforms
├── build/
│   ├── darwin/
│   │   ├── entitlements.mac.plist
│   │   └── build-universal.sh
│   ├── linux/
│   │   ├── postinst.sh
│   │   └── postrm.sh
│   └── win32/
│       ├── installer.nsh        # NSIS hooks (protocol, file assoc, context menu)
│       └── code.iss
├── extensions/
│   └── vibecode-theme-2026/     # Custom themes
│       ├── package.json
│       └── themes/
│           ├── dark-2026.json
│           └── light-2026.json
├── resources/
│   ├── vibecode-icon.png        # Source icon (1024x1024)
│   ├── darwin/
│   │   ├── code.icns            # macOS icon
│   │   └── icon_*.png           # macOS icon PNGs
│   ├── linux/
│   │   ├── code*.png            # Linux icons
│   │   ├── code.desktop         # Desktop entry
│   │   ├── code-url-handler.desktop
│   │   └── code.appdata.xml
│   └── win32/
│       └── code.ico             # Windows icon (multi-size)
├── scripts/
│   ├── prepare-vscode.sh        # Download & patch VS Code source
│   └── build-desktop.sh         # Full build pipeline
├── src/                          # VibeCode-specific source (AI services, etc.)
├── electron-builder.yml         # Packaging configuration
├── package.json                 # Project metadata
├── product.json                 # Central branding configuration
└── HANDOVER.md                  # This document
```

---

## 13. Quick Start for New Team Members

```bash
# 1. Clone the repo
git clone https://github.com/Razisafir/Real-vibecode.git
cd Real-vibecode

# 2. Install Node.js 20+ and yarn
npm install -g yarn

# 3. Download and patch VS Code source
bash scripts/prepare-vscode.sh

# 4. Build for your platform
bash scripts/build-desktop.sh

# 5. Find the installer in dist/
ls dist/

# 6. Test the installer
# Windows: Run the .exe from dist/
# macOS: Open the .dmg from dist/
# Linux: chmod +x dist/*.AppImage && ./dist/*.AppImage
```

---

*Last updated: May 2026 — Version 1.121.1*
