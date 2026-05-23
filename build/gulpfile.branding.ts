/*---------------------------------------------------------------------------------------------
 *  Branding override for Real Vibecode build pipeline.
 *  This file provides the product-specific metadata injected into Electron binaries
 *  via rcedit (Windows) and plist manipulation (macOS).
 *
 *  USAGE: Import and merge these overrides into the main gulpfile.vscode.ts
 *  during the packaging step.
 *--------------------------------------------------------------------------------------------*/

import * as product from '../../product.json';

/**
 * Windows EXE metadata — applied via rcedit during Windows packaging.
 * These values appear in the executable's Properties > Details tab,
 * Windows Explorer, and the taskbar.
 */
export const win32ExeMetadata = {
        CompanyName: 'Real Vibecode Project',
        FileDescription: product.nameLong,
        FileVersion: product.version || '1.121.1',
        InternalName: product.applicationName,
        LegalCopyright: 'Copyright (C) 2026 Real Vibecode Project. All rights reserved',
        OriginalFilename: `${product.applicationName}.exe`,
        ProductName: product.nameLong,
        ProductVersion: product.version || '1.121.1',
};

/**
 * macOS Info.plist overrides — applied during macOS app bundle creation.
 */
export const darwinInfoPlistOverrides = {
        CFBundleName: product.nameLong,
        CFBundleDisplayName: product.nameLong,
        CFBundleIdentifier: product.darwinBundleIdentifier,
        CFBundleShortVersionString: product.version || '1.121.1',
        NSHumanReadableCopyright: 'Copyright (C) 2026 Real Vibecode Project. All rights reserved.',
};

/**
 * Artifact naming convention for CI/CD output.
 * All build artifacts should follow this naming pattern.
 */
export const artifactNaming = {
        windows: `RealVibecode-${product.version || '1.121.1'}`,
        macOS: `RealVibecode-${product.version || '1.121.1'}`,
        linux: `real-vibecode_${product.version || '1.121.1'}`,
};

/**
 * Telemetry product identifier.
 * This is the key used for telemetry event attribution.
 * MUST NOT collide with VS Code's telemetry keys.
 */
export const telemetryProductId = 'real-vibecode';
