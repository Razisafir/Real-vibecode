# Product Identity — Real Vibecode

## Overview

Real Vibecode is a standalone AI-native IDE product built on a forked architecture. This document defines the complete product identity system.

## Identity Registry

| Field | Value |
|-------|-------|
| **Product Name (Short)** | Real Vibecode |
| **Product Name (Long)** | Real Vibecode |
| **Application Name** | real-vibecode |
| **Data Folder Name** | .real-vibecode |
| **Shared Data Folder** | .real-vibecode-shared |
| **Server App Name** | real-vibecode-server |
| **Server Data Folder** | .real-vibecode-server |
| **Tunnel App Name** | real-vibecode-tunnel |
| **URL Protocol** | real-vibecode |
| **macOS Bundle ID** | com.realvibecode.ide |
| **Windows App User Model ID** | RealVibecode.IDE |
| **Windows Mutex** | realvibecode |
| **Linux Icon Name** | real-vibecode |
| **CLI Binary Name** | real-vibecode |

## Platform Identifiers

### Windows
| Field | Value |
|-------|-------|
| Install Directory | Real Vibecode |
| Registry Key | RealVibecode |
| Shell Name | Real &Vibecode |
| Mutex | realvibecode |
| Tunnel Service Mutex | realvibecode-tunnelservice |
| Tunnel Mutex | realvibecode-tunnel |
| x64 App ID | {A1B2C3D4-E5F6-7890-ABCD-EF1234567890} |
| ARM64 App ID | {B2C3D4E5-F6A7-8901-BCDE-F12345678901} |
| Installer Filename | RealVibecodeSetup |

### macOS
| Field | Value |
|-------|-------|
| Bundle Identifier | com.realvibecode.ide |
| Profile UUID | A1B2C3D4-E5F6-7890-ABCD-EF1234567890 |
| Executable Name | Real Vibecode |

### Linux
| Field | Value |
|-------|-------|
| Desktop File Name | real-vibecode.desktop |
| Icon Name | real-vibecode |
| Binary Name | real-vibecode |
| MIME Type | application/x-real-vibecode-workspace |

## Branding Assets

### Icon
- **Source**: `resources/brand-icon.svg`
- **Design**: Rounded square with indigo-to-black gradient background, purple-to-cyan gradient caret/cursor symbol
- **Colors**: Primary `#8B5CF6` (purple), Secondary `#06B6D4` (cyan), Background `#1E1B4B` to `#09090B`

### Icon File Mapping

| Platform | File | Format |
|----------|------|--------|
| Windows | `resources/win32/code.ico` | Multi-size ICO (16-256px) |
| macOS | `resources/darwin/code.icns` | ICNS (16-1024px) |
| Linux | `resources/linux/code.png` | PNG 512x512 |
| Linux RPM | `resources/linux/rpm/code.xpm` | XPM 48x48 |
| PWA 192px | `resources/server/code-192.png` | PNG |
| PWA 512px | `resources/server/code-512.png` | PNG |
| Favicon | `resources/server/favicon.ico` | ICO |
| Windows Tile 150 | `resources/win32/code_150x150.png` | PNG |
| Windows Tile 70 | `resources/win32/code_70x70.png` | PNG |

## Extension System Compatibility

The following runtime identifiers are **PRESERVED** from upstream to maintain extension compatibility:
- Extension API namespace: `vscode` (unchanged — this is the API surface, not branding)
- Extension host protocol identifiers
- Language server protocol identifiers
- Marketplace integration endpoints (if configured)

Only UI-facing and packaging-layer identity is modified. Runtime API surface is untouched.
