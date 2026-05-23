/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

/**
 * vibecodeDesignTokens.ts -- VibeCode Brand Design Token System
 *
 * Canonical source of truth for all VibeCode brand colors, spacing, and
 * semantic tokens. These are emitted as CSS custom properties at runtime
 * via the RealUIIntegrationService and override VS Code's native palette
 * inside VibeCode-owned surfaces.
 *
 * Token naming convention:
 *   --vibecode-{category}-{variant}
 *
 * Categories: primary, secondary, bg, surface, text, muted, border, accent,
 *             status, spacing, radius, shadow, motion, opacity, z
 */

// =====================================================================================
// BRAND PRIMITIVES
// The raw color palette that defines the VibeCode identity.
// =====================================================================================

export const VibeCodeBrandColors = {
	/** Primary brand purple */
	primary: '#8B5CF6',
	/** Primary hover / lighter variant */
	primaryHover: '#A78BFA',
	/** Primary muted / translucent for backgrounds */
	primaryMuted: 'rgba(139, 92, 246, 0.15)',
	/** Primary subtle for very faint backgrounds */
	primarySubtle: 'rgba(139, 92, 246, 0.08)',

	/** Secondary brand cyan */
	secondary: '#06B6D4',
	/** Secondary hover / lighter variant */
	secondaryHover: '#22D3EE',
	/** Secondary muted / translucent for backgrounds */
	secondaryMuted: 'rgba(6, 182, 212, 0.15)',
	/** Secondary subtle for very faint backgrounds */
	secondarySubtle: 'rgba(6, 182, 212, 0.08)',

	/** Dark background start (gradient) */
	backgroundDark: '#1E1B4B',
	/** Dark background end (gradient) */
	backgroundDarker: '#09090B',
	/** Solid background fallback */
	backgroundSolid: '#0F0E1A',

	/** Surface overlay */
	surface: 'rgba(255, 255, 255, 0.04)',
	/** Surface raised / elevated */
	surfaceRaised: 'rgba(255, 255, 255, 0.07)',
	/** Surface overlay (modals, popovers) */
	surfaceOverlay: 'rgba(255, 255, 255, 0.10)',
	/** Surface sunken (inputs, wells) */
	surfaceSunken: 'rgba(0, 0, 0, 0.20)',

	/** Primary text */
	textPrimary: '#FAFAFA',
	/** Secondary text */
	textSecondary: '#A1A1AA',
	/** Disabled / tertiary text */
	textDisabled: '#52525B',
	/** Inverse text (on accent bg) */
	textInverse: '#FFFFFF',

	/** Muted text (alias for secondary, used by product.json themes) */
	muted: '#A1A1AA',

	/** Default border */
	borderDefault: 'rgba(255, 255, 255, 0.08)',
	/** Hover border */
	borderHover: 'rgba(255, 255, 255, 0.15)',
	/** Focus border */
	borderFocus: '#8B5CF6',

	/** Success status */
	statusSuccess: '#34D399',
	/** Warning status */
	statusWarning: '#FBBF24',
	/** Error status */
	statusError: '#F87171',
	/** Info status */
	statusInfo: '#60A5FA',
} as const;

// =====================================================================================
// LIGHT THEME OVERRIDES
// Colors for Light 2026 theme.
// =====================================================================================

export const VibeCodeLightOverrides = {
	primary: '#7C3AED',
	primaryHover: '#6D28D9',
	primaryMuted: 'rgba(124, 58, 237, 0.12)',
	primarySubtle: 'rgba(124, 58, 237, 0.06)',

	secondary: '#0891B2',
	secondaryHover: '#0E7490',
	secondaryMuted: 'rgba(8, 145, 178, 0.12)',
	secondarySubtle: 'rgba(8, 145, 178, 0.06)',

	backgroundDark: '#FFFFFF',
	backgroundDarker: '#F4F4F5',
	backgroundSolid: '#FFFFFF',

	surface: 'rgba(0, 0, 0, 0.03)',
	surfaceRaised: 'rgba(0, 0, 0, 0.05)',
	surfaceOverlay: 'rgba(0, 0, 0, 0.08)',
	surfaceSunken: 'rgba(0, 0, 0, 0.02)',

	textPrimary: '#09090B',
	textSecondary: '#71717A',
	textDisabled: '#A1A1AA',
	textInverse: '#FFFFFF',

	muted: '#71717A',

	borderDefault: 'rgba(0, 0, 0, 0.10)',
	borderHover: 'rgba(0, 0, 0, 0.18)',
	borderFocus: '#7C3AED',

	statusSuccess: '#059669',
	statusWarning: '#D97706',
	statusError: '#DC2626',
	statusInfo: '#2563EB',
} as const;

// =====================================================================================
// SEMANTIC TOKEN MAP
// Maps each CSS custom property name to its value from the brand palette.
// This is the single source used by the CSS generator.
// =====================================================================================

export interface VibeCodeTokenMap {
	readonly [tokenName: string]: string;
}

/**
 * Build the complete set of `--vibecode-*` CSS custom properties for a given
 * color palette (dark or light).
 */
export function buildVibeCodeTokenMap(colors: typeof VibeCodeBrandColors): VibeCodeTokenMap {
	return {
		// Brand
		'--vibecode-primary': colors.primary,
		'--vibecode-primary-hover': colors.primaryHover,
		'--vibecode-primary-muted': colors.primaryMuted,
		'--vibecode-primary-subtle': colors.primarySubtle,

		'--vibecode-secondary': colors.secondary,
		'--vibecode-secondary-hover': colors.secondaryHover,
		'--vibecode-secondary-muted': colors.secondaryMuted,
		'--vibecode-secondary-subtle': colors.secondarySubtle,

		// Background
		'--vibecode-bg-gradient-start': colors.backgroundDark,
		'--vibecode-bg-gradient-end': colors.backgroundDarker,
		'--vibecode-bg-solid': colors.backgroundSolid,

		// Surface
		'--vibecode-surface': colors.surface,
		'--vibecode-surface-raised': colors.surfaceRaised,
		'--vibecode-surface-overlay': colors.surfaceOverlay,
		'--vibecode-surface-sunken': colors.surfaceSunken,

		// Text
		'--vibecode-text': colors.textPrimary,
		'--vibecode-text-secondary': colors.textSecondary,
		'--vibecode-text-disabled': colors.textDisabled,
		'--vibecode-text-inverse': colors.textInverse,

		// Muted
		'--vibecode-muted': colors.muted,

		// Border
		'--vibecode-border': colors.borderDefault,
		'--vibecode-border-hover': colors.borderHover,
		'--vibecode-border-focus': colors.borderFocus,

		// Status
		'--vibecode-status-success': colors.statusSuccess,
		'--vibecode-status-warning': colors.statusWarning,
		'--vibecode-status-error': colors.statusError,
		'--vibecode-status-info': colors.statusInfo,
	};
}

/**
 * Generate CSS text that injects all `--vibecode-*` custom properties plus
 * utility classes. Optionally includes VS Code override selectors that
 * force VibeCode brand colors onto VS Code's native UI elements inside
 * VibeCode-owned surfaces.
 */
export function generateVibeCodeCSS(
	tokens: VibeCodeTokenMap,
	options?: { includeVSCodeOverrides?: boolean }
): string {
	const declarations = Object.entries(tokens)
		.map(([prop, value]) => `  ${prop}: ${value};`)
		.join('\n');

	const vsCodeOverrides = (options?.includeVSCodeOverrides !== false) ? `
/* === VS Code Theme Override Layer === */
/* These rules override VS Code's native CSS variables inside VibeCode surfaces,
   ensuring the dark-first palette wins even when VS Code switches themes. */

.vibecode-surface,
.monaco-workbench .vibecode-surface {
  --vscode-editor-background: var(--vibecode-bg-solid);
  --vscode-editor-foreground: var(--vibecode-text);
  --vscode-sideBar-background: var(--vibecode-surface);
  --vscode-panel-background: var(--vibecode-surface);
  --vscode-panel-border: var(--vibecode-border);
  --vscode-button-background: var(--vibecode-primary);
  --vscode-button-foreground: var(--vibecode-text-inverse);
  --vscode-button-hoverBackground: var(--vibecode-primary-hover);
  --vscode-focusBorder: var(--vibecode-border-focus);
  --vscode-input-background: var(--vibecode-surface-sunken);
  --vscode-input-foreground: var(--vibecode-text);
  --vscode-input-border: var(--vibecode-border);
  --vscode-input-placeholderForeground: var(--vibecode-text-disabled);
  --vscode-badge-background: var(--vibecode-primary-muted);
  --vscode-badge-foreground: var(--vibecode-primary);
  --vscode-list-hoverBackground: var(--vibecode-surface-raised);
  --vscode-list-activeSelectionBackground: var(--vibecode-primary-muted);
  --vscode-list-activeSelectionForeground: var(--vibecode-primary);
}

/* Force workbench background gradient on body */
body.vibecode-dark-first {
  background: linear-gradient(135deg, var(--vibecode-bg-gradient-start), var(--vibecode-bg-gradient-end)) !important;
}

body.vibecode-dark-first .monaco-workbench {
  background: transparent;
}

body.vibecode-light-first {
  background: var(--vibecode-bg-solid) !important;
}
` : '';

	return `:root {
${declarations}
}
${vsCodeOverrides}
/* === VibeCode Utility Classes === */
.vibecode-bg { background: var(--vibecode-bg-solid); }
.vibecode-bg-gradient { background: linear-gradient(135deg, var(--vibecode-bg-gradient-start), var(--vibecode-bg-gradient-end)); }
.vibecode-surface { background: var(--vibecode-surface); border: 1px solid var(--vibecode-border); }
.vibecode-surface-raised { background: var(--vibecode-surface-raised); border: 1px solid var(--vibecode-border); }
.vibecode-text { color: var(--vibecode-text); }
.vibecode-text-secondary { color: var(--vibecode-text-secondary); }
.vibecode-text-muted { color: var(--vibecode-muted); }
.vibecode-text-primary-brand { color: var(--vibecode-primary); }
.vibecode-text-secondary-brand { color: var(--vibecode-secondary); }
.vibecode-border { border-color: var(--vibecode-border); }
.vibecode-border-focus { border-color: var(--vibecode-border-focus); }

.vibecode-btn-primary {
  background: var(--vibecode-primary); color: var(--vibecode-text-inverse);
  border: none; border-radius: 6px; padding: 6px 16px; cursor: pointer;
  font-weight: 600; transition: background 0.15s ease;
}
.vibecode-btn-primary:hover { background: var(--vibecode-primary-hover); }
.vibecode-btn-primary:focus-visible { outline: 2px solid var(--vibecode-border-focus); outline-offset: 2px; }

.vibecode-btn-secondary {
  background: var(--vibecode-secondary); color: var(--vibecode-text-inverse);
  border: none; border-radius: 6px; padding: 6px 16px; cursor: pointer;
  font-weight: 600; transition: background 0.15s ease;
}
.vibecode-btn-secondary:hover { background: var(--vibecode-secondary-hover); }

.vibecode-btn-ghost {
  background: transparent; color: var(--vibecode-text);
  border: 1px solid var(--vibecode-border); border-radius: 6px;
  padding: 6px 16px; cursor: pointer; transition: all 0.15s ease;
}
.vibecode-btn-ghost:hover { border-color: var(--vibecode-border-hover); background: var(--vibecode-surface-raised); }

.vibecode-badge {
  display: inline-flex; align-items: center; padding: 2px 8px;
  border-radius: 9999px; font-size: 11px; font-weight: 600;
}
.vibecode-badge-primary { background: var(--vibecode-primary-muted); color: var(--vibecode-primary); }
.vibecode-badge-secondary { background: var(--vibecode-secondary-muted); color: var(--vibecode-secondary); }
.vibecode-badge-success { background: rgba(52,211,153,0.15); color: var(--vibecode-status-success); }
.vibecode-badge-warning { background: rgba(251,191,36,0.15); color: var(--vibecode-status-warning); }
.vibecode-badge-error { background: rgba(248,113,113,0.15); color: var(--vibecode-status-error); }
.vibecode-badge-info { background: rgba(96,165,250,0.15); color: var(--vibecode-status-info); }

.vibecode-panel {
  background: var(--vibecode-surface); border: 1px solid var(--vibecode-border);
  border-radius: 8px; padding: 16px;
}

.vibecode-divider {
  height: 1px; background: var(--vibecode-border); margin: 8px 0;
}

.vibecode-progress-bar {
  background: var(--vibecode-border); border-radius: 9999px; height: 4px; overflow: hidden;
}
.vibecode-progress-fill {
  background: linear-gradient(90deg, var(--vibecode-primary), var(--vibecode-secondary));
  height: 100%; border-radius: 9999px; transition: width 0.3s ease;
}

/* Reduced motion */
@media (prefers-reduced-motion: reduce) {
  .vibecode-btn-primary,
  .vibecode-btn-secondary,
  .vibecode-btn-ghost,
  .vibecode-progress-fill {
    transition: none !important;
  }
}`;
}

/**
 * Detect whether a VS Code theme type is dark.
 */
export function isDarkTheme(themeType: string): boolean {
	return themeType === 'dark' || themeType === 'hcDark' || themeType === 'vs-dark';
}
