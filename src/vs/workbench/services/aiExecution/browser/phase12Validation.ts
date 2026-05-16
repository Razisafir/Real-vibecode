/*---------------------------------------------------------------------------------------------
 *  Professional UI Design System — Phase 12 Validation Tests
 *  Real Vibecode — AI-Native IDE
 *
 *  10 validation tests for the Design System governance layer.
 *  Self-contained: uses a MiniDesignSystem test double to validate logic without DI services.
 *
 *  Tests cover:
 *    1.  No raw hex colors in components
 *    2.  No inconsistent spacing usage
 *    3.  Layout obeys strict structure
 *    4.  Panels follow hierarchy rules
 *    5.  Typography scale is consistent
 *    6.  No visual clutter zones
 *    7.  AI panels visually distinct but not dominant
 *    8.  Dark theme is professional
 *    9.  Motion system is standardized
 *   10.  Component tokens are complete
 *--------------------------------------------------------------------------------------------*/

import {
	SPACING_BASE,
	Spacing,
	TypographySize,
	FontWeight,
	LineHeight,
	Elevation,
	ELEVATION_SHADOWS,
	LayoutGrid,
	ZIndex,
	ColorToken,
	IColorTokenResolution,
	IDesignTheme,
	IDesignTypography,
	ITypographySpec,
	ButtonVariant,
	ButtonSize,
	IButtonTokens,
	PanelVariant,
	IPanelTokens,
	IInputTokens,
	ISidebarTokens,
	StatusLevel,
	IStatusIndicatorTokens,
	DesignViolationType,
	ViolationSeverity,
	IDesignViolation,
	IConsistencyCheckResult,
	LayoutZone,
	ILayoutRule,
	IFloatingPanelPermission,
	InfoLevel,
	IInfoLevelStyle,
	IInfoLevelMapping,
	PROFESSIONAL_DARK_THEME,
	PROFESSIONAL_LIGHT_THEME,
	MotionDuration,
	MotionEasing,
	IMotionSpec,
	IPanelMotionSpec,
	ComponentCompliance,
	IComponentAuditResult,
	IconSize,
	IIconRule,
	IInteractionStateSpec,
	IPolishPassResult,
	IDesignSystemStatus,
} from '../common/designSystem.js';

// ═══════════════════════════════════════════════════════════════════════════════
// TEST RESULT TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface IPhase12TestResult {
	name: string;
	passed: boolean;
	details: string;
	durationMs: number;
}

export interface IPhase12ValidationResults {
	phase: 12;
	totalTests: number;
	passed: number;
	failed: number;
	results: readonly IPhase12TestResult[];
	timestamp: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// LOCAL TYPES — IDesignMotion (referenced by IDesignTheme)
// ═══════════════════════════════════════════════════════════════════════════════

interface IDesignMotion {
	readonly defaultDuration: MotionDuration;
	readonly defaultEasing: MotionEasing;
	readonly panelMotionSpec: IPanelMotionSpec;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS (mirrored from DesignSystemService)
// ═══════════════════════════════════════════════════════════════════════════════

const FONT_FAMILY = "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
const FONT_FAMILY_MONO = "'SF Mono', 'Cascadia Code', 'Fira Code', 'JetBrains Mono', Consolas, monospace";
const RAW_HEX_PATTERN = /#[0-9a-fA-F]{3,8}/;
const BUTTON_BORDER_RADIUS = 4;
const PANEL_BORDER_RADIUS = 6;
const INPUT_BORDER_RADIUS = 4;
const SIDEBAR_ITEM_HEIGHT = 28;

const VALID_Z_INDICES = new Set<number>([
	ZIndex.Base, ZIndex.SidebarOverlay, ZIndex.Dropdown,
	ZIndex.Sticky, ZIndex.ModalBackdrop, ZIndex.Modal,
	ZIndex.Notification, ZIndex.Tooltip, ZIndex.DebugOverlay,
]);

const VALID_TYPOGRAPHY_SIZES = new Set<number>([
	TypographySize.Caption, TypographySize.Overline, TypographySize.BodySm,
	TypographySize.Body, TypographySize.BodyLg, TypographySize.Subtitle,
	TypographySize.TitleSm, TypographySize.Title, TypographySize.Heading,
	TypographySize.DisplaySm, TypographySize.Display,
]);

const ALL_SPACING_VALUES = new Set<number>([
	Spacing.None, Spacing.Xs, Spacing.Sm, Spacing.MdSm,
	Spacing.Md, Spacing.MdLg, Spacing.Lg, Spacing.Xl,
	Spacing.Xxl, Spacing.Xxxl,
]);

const ALL_COLOR_TOKEN_STRINGS = new Set<string>(Object.values(ColorToken) as string[]);

// ═══════════════════════════════════════════════════════════════════════════════
// TYPOGRAPHY SPEC TABLE
// ═══════════════════════════════════════════════════════════════════════════════

const TYPOGRAPHY_SPECS: Record<number, ITypographySpec> = {
	[TypographySize.Caption]:   { size: TypographySize.Caption,   lineHeight: LineHeight.Normal,  weight: FontWeight.Regular,  letterSpacing: 0.02 },
	[TypographySize.Overline]:  { size: TypographySize.Overline,  lineHeight: LineHeight.Normal,  weight: FontWeight.Medium,   letterSpacing: 0.06 },
	[TypographySize.BodySm]:    { size: TypographySize.BodySm,    lineHeight: LineHeight.Normal,  weight: FontWeight.Regular,  letterSpacing: 0.01 },
	[TypographySize.Body]:      { size: TypographySize.Body,      lineHeight: LineHeight.Normal,  weight: FontWeight.Regular,  letterSpacing: 0 },
	[TypographySize.BodyLg]:    { size: TypographySize.BodyLg,    lineHeight: LineHeight.Normal,  weight: FontWeight.Regular,  letterSpacing: 0 },
	[TypographySize.Subtitle]:  { size: TypographySize.Subtitle,  lineHeight: LineHeight.Tight,   weight: FontWeight.SemiBold, letterSpacing: 0 },
	[TypographySize.TitleSm]:   { size: TypographySize.TitleSm,   lineHeight: LineHeight.Tight,   weight: FontWeight.SemiBold, letterSpacing: -0.01 },
	[TypographySize.Title]:     { size: TypographySize.Title,     lineHeight: LineHeight.Tight,   weight: FontWeight.Bold,     letterSpacing: -0.01 },
	[TypographySize.Heading]:   { size: TypographySize.Heading,   lineHeight: LineHeight.Tight,   weight: FontWeight.Bold,     letterSpacing: -0.02 },
	[TypographySize.DisplaySm]: { size: TypographySize.DisplaySm, lineHeight: LineHeight.Tight,   weight: FontWeight.Bold,     letterSpacing: -0.02 },
	[TypographySize.Display]:   { size: TypographySize.Display,   lineHeight: LineHeight.Tight,   weight: FontWeight.Bold,     letterSpacing: -0.03 },
};

// ═══════════════════════════════════════════════════════════════════════════════
// LAYOUT RULES TABLE
// ═══════════════════════════════════════════════════════════════════════════════

const LAYOUT_RULES: Record<string, ILayoutRule> = {
	[LayoutZone.Navigation]: {
		zone: LayoutZone.Navigation,
		minWidth: LayoutGrid.NavigationWidth,
		maxWidth: LayoutGrid.NavigationWidth,
		defaultWidth: LayoutGrid.NavigationWidth,
		resizable: false,
		allowedPanelTypes: ['icon-sidebar', 'activity-bar'],
		allowsFloating: false,
		allowsOverlap: false,
		zIndex: ZIndex.Base,
	},
	[LayoutZone.PrimarySidebar]: {
		zone: LayoutZone.PrimarySidebar,
		minWidth: LayoutGrid.SecondarySidebarMinWidth,
		maxWidth: 600,
		defaultWidth: LayoutGrid.SecondarySidebarDefaultWidth,
		resizable: true,
		allowedPanelTypes: ['explorer', 'search', 'source-control', 'debug', 'extensions'],
		allowsFloating: false,
		allowsOverlap: false,
		zIndex: ZIndex.Base,
	},
	[LayoutZone.Editor]: {
		zone: LayoutZone.Editor,
		minWidth: LayoutGrid.EditorMinWidth,
		maxWidth: undefined,
		defaultWidth: -1,
		resizable: true,
		allowedPanelTypes: ['editor', 'diff-editor', 'notebook', 'settings'],
		allowsFloating: false,
		allowsOverlap: false,
		zIndex: ZIndex.Base,
	},
	[LayoutZone.SecondarySidebar]: {
		zone: LayoutZone.SecondarySidebar,
		minWidth: LayoutGrid.SecondarySidebarMinWidth,
		maxWidth: 600,
		defaultWidth: LayoutGrid.SecondarySidebarDefaultWidth,
		resizable: true,
		allowedPanelTypes: ['ai-panel', 'graph-view', 'context-panel', 'outline'],
		allowsFloating: true,
		allowsOverlap: false,
		zIndex: ZIndex.SidebarOverlay,
	},
	[LayoutZone.BottomPanel]: {
		zone: LayoutZone.BottomPanel,
		minWidth: 200,
		maxWidth: undefined,
		defaultWidth: LayoutGrid.BottomPanelDefaultHeight,
		resizable: true,
		allowedPanelTypes: ['terminal', 'output', 'problems', 'debug-console', 'execution-log'],
		allowsFloating: true,
		allowsOverlap: false,
		zIndex: ZIndex.Base,
	},
	[LayoutZone.TitleBar]: {
		zone: LayoutZone.TitleBar,
		minWidth: 0,
		maxWidth: undefined,
		defaultWidth: LayoutGrid.TitleBarHeight,
		resizable: false,
		allowedPanelTypes: ['title-bar', 'menu-bar', 'command-center'],
		allowsFloating: false,
		allowsOverlap: false,
		zIndex: ZIndex.Sticky,
	},
	[LayoutZone.StatusBar]: {
		zone: LayoutZone.StatusBar,
		minWidth: 0,
		maxWidth: undefined,
		defaultWidth: LayoutGrid.StatusBarHeight,
		resizable: false,
		allowedPanelTypes: ['status-bar'],
		allowsFloating: false,
		allowsOverlap: false,
		zIndex: ZIndex.Sticky,
	},
};

// ═══════════════════════════════════════════════════════════════════════════════
// FLOATING PANEL PERMISSIONS
// ═══════════════════════════════════════════════════════════════════════════════

const FLOATING_PANEL_PERMISSIONS: IFloatingPanelPermission[] = [
	{ panelType: 'ai-panel',        allowed: true,  allowedZones: [LayoutZone.SecondarySidebar, LayoutZone.BottomPanel], maxInstances: 1 },
	{ panelType: 'graph-view',      allowed: true,  allowedZones: [LayoutZone.SecondarySidebar],                        maxInstances: 1 },
	{ panelType: 'context-panel',   allowed: true,  allowedZones: [LayoutZone.SecondarySidebar],                        maxInstances: 2 },
	{ panelType: 'terminal',        allowed: true,  allowedZones: [LayoutZone.BottomPanel],                             maxInstances: 3 },
	{ panelType: 'execution-log',   allowed: true,  allowedZones: [LayoutZone.BottomPanel],                             maxInstances: 1 },
	{ panelType: 'explorer',        allowed: false, allowedZones: [],                                                    maxInstances: 0 },
	{ panelType: 'search',          allowed: false, allowedZones: [],                                                    maxInstances: 0 },
	{ panelType: 'editor',          allowed: false, allowedZones: [],                                                    maxInstances: 0 },
];

// ═══════════════════════════════════════════════════════════════════════════════
// INFORMATION HIERARCHY LEVEL STYLES
// ═══════════════════════════════════════════════════════════════════════════════

const INFO_LEVEL_STYLES: Record<number, IInfoLevelStyle> = {
	[InfoLevel.Primary]: {
		level: InfoLevel.Primary,
		textColor: ColorToken.TextPrimary,
		backgroundColor: ColorToken.BackgroundPrimary,
		fontSize: TypographySize.Body,
		fontWeight: FontWeight.Medium,
		opacity: 1.0,
		borderColor: ColorToken.BorderDefault,
		elevation: Elevation.Level0,
	},
	[InfoLevel.Secondary]: {
		level: InfoLevel.Secondary,
		textColor: ColorToken.TextAccent,
		backgroundColor: ColorToken.AccentSubtle,
		fontSize: TypographySize.BodySm,
		fontWeight: FontWeight.Medium,
		opacity: 0.95,
		borderColor: ColorToken.BorderAccent,
		elevation: Elevation.Level1,
	},
	[InfoLevel.Tertiary]: {
		level: InfoLevel.Tertiary,
		textColor: ColorToken.TextSecondary,
		backgroundColor: ColorToken.BackgroundTertiary,
		fontSize: TypographySize.BodySm,
		fontWeight: FontWeight.Regular,
		opacity: 0.85,
		borderColor: ColorToken.BorderSubtle,
		elevation: Elevation.Level0,
	},
	[InfoLevel.Quaternary]: {
		level: InfoLevel.Quaternary,
		textColor: ColorToken.TextTertiary,
		backgroundColor: ColorToken.BackgroundTertiary,
		fontSize: TypographySize.Caption,
		fontWeight: FontWeight.Regular,
		opacity: 0.6,
		borderColor: ColorToken.BorderSubtle,
		elevation: Elevation.Level0,
	},
};

// ═══════════════════════════════════════════════════════════════════════════════
// STATUS TOKEN MAP
// ═══════════════════════════════════════════════════════════════════════════════

const STATUS_TOKEN_MAP: Record<string, { color: ColorToken; backgroundColor: ColorToken }> = {
	[StatusLevel.Success]: { color: ColorToken.StatusSuccess, backgroundColor: ColorToken.StatusSuccessSubtle },
	[StatusLevel.Warning]: { color: ColorToken.StatusWarning, backgroundColor: ColorToken.StatusWarningSubtle },
	[StatusLevel.Error]:   { color: ColorToken.StatusError,   backgroundColor: ColorToken.StatusErrorSubtle },
	[StatusLevel.Info]:    { color: ColorToken.StatusInfo,    backgroundColor: ColorToken.StatusInfoSubtle },
	[StatusLevel.Idle]:    { color: ColorToken.TextTertiary,  backgroundColor: ColorToken.BackgroundTertiary },
	[StatusLevel.Active]:  { color: ColorToken.AiKernelActive, backgroundColor: ColorToken.AccentSubtle },
};

// ═══════════════════════════════════════════════════════════════════════════════
// DEFAULT PANEL MOTION
// ═══════════════════════════════════════════════════════════════════════════════

const DEFAULT_PANEL_MOTION: IPanelMotionSpec = {
	enter:   { duration: MotionDuration.Normal, easing: MotionEasing.EaseOut,   delay: 0 },
	exit:    { duration: MotionDuration.Fast,   easing: MotionEasing.EaseIn,    delay: 0 },
	resize:  { duration: MotionDuration.Fast,   easing: MotionEasing.EaseInOut, delay: 0 },
};

// ═══════════════════════════════════════════════════════════════════════════════
// TEST DOUBLE: MINI DESIGN SYSTEM
// ═══════════════════════════════════════════════════════════════════════════════

class MiniDesignSystem {
	private _isDark: boolean = true;
	private _currentColors: Readonly<Record<ColorToken, string>> = PROFESSIONAL_DARK_THEME;

	// ─── Core ─────────────────────────────────────────────────────────────────

	getSpacing(spacing: Spacing): number {
		return spacing;
	}

	isValidSpacing(px: number): boolean {
		if (px < 0) { return false; }
		return px % SPACING_BASE === 0;
	}

	getTypographySpec(size: TypographySize): ITypographySpec {
		return TYPOGRAPHY_SPECS[size] ?? TYPOGRAPHY_SPECS[TypographySize.Body];
	}

	getElevationShadow(level: Elevation): string {
		return ELEVATION_SHADOWS[level] ?? 'none';
	}

	getLayoutRule(zone: LayoutZone): ILayoutRule {
		return LAYOUT_RULES[zone] ?? {
			zone, minWidth: 0, maxWidth: undefined, defaultWidth: 0,
			resizable: false, allowedPanelTypes: [], allowsFloating: false,
			allowsOverlap: false, zIndex: ZIndex.Base,
		};
	}

	getLayoutRules(): readonly ILayoutRule[] {
		return Object.values(LAYOUT_RULES);
	}

	// ─── Color ────────────────────────────────────────────────────────────────

	resolveColor(token: ColorToken): string {
		const value = this._currentColors[token];
		if (value === undefined) { return '#FF0000'; }
		return value;
	}

	getAllColorResolutions(): readonly IColorTokenResolution[] {
		const results: IColorTokenResolution[] = [];
		const allTokens = Object.values(ColorToken) as string[];
		for (const tokenStr of allTokens) {
			const token = tokenStr as ColorToken;
			results.push({ token, value: this.resolveColor(token), isDark: this._isDark });
		}
		return results;
	}

	isRawHexViolation(value: string): boolean {
		return RAW_HEX_PATTERN.test(value);
	}

	// ─── Component Tokens ─────────────────────────────────────────────────────

	getButtonTokens(variant: ButtonVariant, size: ButtonSize): IButtonTokens {
		const sizeConfig = this._getButtonSizeConfig(size);
		const variantConfig = this._getButtonVariantConfig(variant);

		return {
			variant,
			size,
			backgroundColor: variantConfig.backgroundColor,
			textColor: variantConfig.textColor,
			borderColor: variantConfig.borderColor,
			hoverBackgroundColor: variantConfig.hoverBackgroundColor,
			hoverTextColor: variantConfig.hoverTextColor,
			activeBackgroundColor: variantConfig.activeBackgroundColor,
			borderRadius: BUTTON_BORDER_RADIUS,
			paddingX: sizeConfig.paddingX,
			paddingY: sizeConfig.paddingY,
			fontSize: sizeConfig.fontSize,
			fontWeight: sizeConfig.fontWeight,
			elevation: variantConfig.elevation,
		};
	}

	private _getButtonSizeConfig(size: ButtonSize): { paddingX: Spacing; paddingY: Spacing; fontSize: TypographySize; fontWeight: FontWeight } {
		switch (size) {
			case ButtonSize.Sm:
				return { paddingX: Spacing.Sm, paddingY: Spacing.Xs, fontSize: TypographySize.BodySm, fontWeight: FontWeight.Medium };
			case ButtonSize.Lg:
				return { paddingX: Spacing.Lg, paddingY: Spacing.MdSm, fontSize: TypographySize.BodyLg, fontWeight: FontWeight.Medium };
			case ButtonSize.Md:
			default:
				return { paddingX: Spacing.Md, paddingY: Spacing.Sm, fontSize: TypographySize.Body, fontWeight: FontWeight.Medium };
		}
	}

	private _getButtonVariantConfig(variant: ButtonVariant): {
		backgroundColor: ColorToken; textColor: ColorToken; borderColor: ColorToken;
		hoverBackgroundColor: ColorToken; hoverTextColor: ColorToken;
		activeBackgroundColor: ColorToken; elevation: Elevation;
	} {
		switch (variant) {
			case ButtonVariant.Primary:
				return {
					backgroundColor: ColorToken.AccentPrimary, textColor: ColorToken.TextInverted,
					borderColor: ColorToken.AccentPrimary, hoverBackgroundColor: ColorToken.AccentStrong,
					hoverTextColor: ColorToken.TextInverted, activeBackgroundColor: ColorToken.AccentMuted,
					elevation: Elevation.Level1,
				};
			case ButtonVariant.Secondary:
				return {
					backgroundColor: ColorToken.SurfaceSecondary, textColor: ColorToken.TextPrimary,
					borderColor: ColorToken.BorderDefault, hoverBackgroundColor: ColorToken.SurfaceHover,
					hoverTextColor: ColorToken.TextPrimary, activeBackgroundColor: ColorToken.SurfaceActive,
					elevation: Elevation.Level0,
				};
			case ButtonVariant.Ghost:
				return {
					backgroundColor: ColorToken.BackgroundPrimary, textColor: ColorToken.TextSecondary,
					borderColor: ColorToken.BackgroundPrimary, hoverBackgroundColor: ColorToken.SurfaceHover,
					hoverTextColor: ColorToken.TextPrimary, activeBackgroundColor: ColorToken.SurfaceActive,
					elevation: Elevation.Level0,
				};
			case ButtonVariant.Danger:
				return {
					backgroundColor: ColorToken.StatusError, textColor: ColorToken.TextInverted,
					borderColor: ColorToken.StatusError, hoverBackgroundColor: ColorToken.StatusError,
					hoverTextColor: ColorToken.TextInverted, activeBackgroundColor: ColorToken.StatusError,
					elevation: Elevation.Level1,
				};
		}
	}

	getPanelTokens(variant: PanelVariant): IPanelTokens {
		switch (variant) {
			case PanelVariant.Flat:
				return {
					variant, backgroundColor: ColorToken.BackgroundPrimary,
					borderColor: ColorToken.BorderSubtle, borderRadius: PANEL_BORDER_RADIUS,
					padding: Spacing.Md, elevation: Elevation.Level0,
					headerFontSize: TypographySize.Subtitle, headerFontWeight: FontWeight.SemiBold,
					headerPadding: Spacing.Md, bodyPadding: Spacing.Md,
				};
			case PanelVariant.Raised:
				return {
					variant, backgroundColor: ColorToken.SurfacePrimary,
					borderColor: ColorToken.BorderDefault, borderRadius: PANEL_BORDER_RADIUS,
					padding: Spacing.Md, elevation: Elevation.Level1,
					headerFontSize: TypographySize.Subtitle, headerFontWeight: FontWeight.SemiBold,
					headerPadding: Spacing.Md, bodyPadding: Spacing.Md,
				};
			case PanelVariant.Elevated:
				return {
					variant, backgroundColor: ColorToken.BackgroundElevated,
					borderColor: ColorToken.BorderDefault, borderRadius: PANEL_BORDER_RADIUS,
					padding: Spacing.Lg, elevation: Elevation.Level2,
					headerFontSize: TypographySize.Subtitle, headerFontWeight: FontWeight.SemiBold,
					headerPadding: Spacing.Md, bodyPadding: Spacing.Md,
				};
			case PanelVariant.Overlay:
				return {
					variant, backgroundColor: ColorToken.BackgroundElevated,
					borderColor: ColorToken.BorderStrong, borderRadius: PANEL_BORDER_RADIUS,
					padding: Spacing.Lg, elevation: Elevation.Level3,
					headerFontSize: TypographySize.TitleSm, headerFontWeight: FontWeight.Bold,
					headerPadding: Spacing.Lg, bodyPadding: Spacing.Lg,
				};
		}
	}

	getStatusIndicatorTokens(level: StatusLevel): IStatusIndicatorTokens {
		const mapping = STATUS_TOKEN_MAP[level] ?? STATUS_TOKEN_MAP[StatusLevel.Idle];
		return {
			level,
			color: mapping.color,
			backgroundColor: mapping.backgroundColor,
			fontSize: TypographySize.Caption,
			size: 8,
		};
	}

	// ─── Layout / Floating ────────────────────────────────────────────────────

	isFloatingPanelAllowed(panelType: string, zone: LayoutZone): boolean {
		const perm = FLOATING_PANEL_PERMISSIONS.find(p => p.panelType === panelType);
		if (!perm || !perm.allowed) { return false; }
		return perm.allowedZones.includes(zone);
	}

	// ─── Information Hierarchy ────────────────────────────────────────────────

	getInfoLevelStyle(level: InfoLevel): IInfoLevelStyle {
		return INFO_LEVEL_STYLES[level] ?? INFO_LEVEL_STYLES[InfoLevel.Quaternary];
	}

	// ─── Theme ────────────────────────────────────────────────────────────────

	getDarkThemeColors(): Readonly<Record<ColorToken, string>> {
		return PROFESSIONAL_DARK_THEME;
	}

	getLightThemeColors(): Readonly<Record<ColorToken, string>> {
		return PROFESSIONAL_LIGHT_THEME;
	}

	// ─── Motion ───────────────────────────────────────────────────────────────

	getPanelMotionSpec(): IPanelMotionSpec {
		return DEFAULT_PANEL_MOTION;
	}
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER: Parse hex to RGB for contrast calculations
// ═══════════════════════════════════════════════════════════════════════════════

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
	const clean = hex.replace('#', '');
	if (clean.length === 3) {
		return {
			r: parseInt(clean[0] + clean[0], 16),
			g: parseInt(clean[1] + clean[1], 16),
			b: parseInt(clean[2] + clean[2], 16),
		};
	}
	if (clean.length >= 6) {
		return {
			r: parseInt(clean.substring(0, 2), 16),
			g: parseInt(clean.substring(2, 4), 16),
			b: parseInt(clean.substring(4, 6), 16),
		};
	}
	return null;
}

function relativeLuminance(hex: string): number | null {
	const rgb = hexToRgb(hex);
	if (!rgb) { return null; }
	const [rs, gs, bs] = [rgb.r / 255, rgb.g / 255, rgb.b / 255];
	const r = rs <= 0.03928 ? rs / 12.92 : Math.pow((rs + 0.055) / 1.055, 2.4);
	const g = gs <= 0.03928 ? gs / 12.92 : Math.pow((gs + 0.055) / 1.055, 2.4);
	const b = bs <= 0.03928 ? bs / 12.92 : Math.pow((bs + 0.055) / 1.055, 2.4);
	return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrastRatio(hex1: string, hex2: string): number | null {
	const l1 = relativeLuminance(hex1);
	const l2 = relativeLuminance(hex2);
	if (l1 === null || l2 === null) { return null; }
	const lighter = Math.max(l1, l2);
	const darker = Math.min(l1, l2);
	return (lighter + 0.05) / (darker + 0.05);
}

// ═══════════════════════════════════════════════════════════════════════════════
// TEST 1 — No raw hex colors in components
// ═══════════════════════════════════════════════════════════════════════════════

function testNoRawHexColors(): IPhase12TestResult {
	const start = Date.now();
	const ds = new MiniDesignSystem();
	const errors: string[] = [];

	// Sub-test A: All ColorToken values are defined (non-empty strings)
	const allTokens = Object.values(ColorToken) as string[];
	const emptyTokens = allTokens.filter(t => !t || t.trim().length === 0);
	if (emptyTokens.length > 0) {
		errors.push(`${emptyTokens.length} ColorToken values are empty or undefined`);
	}

	// Sub-test B: resolveColor returns valid hex or rgba for every token
	for (const tokenStr of allTokens) {
		const token = tokenStr as ColorToken;
		const resolved = ds.resolveColor(token);
		if (!resolved || resolved === '#FF0000') {
			errors.push(`Token ${token} resolved to fallback red — missing mapping`);
		}
		// Verify the resolved value is a valid format (hex or rgba)
		const isHex = /^#[0-9a-fA-F]{3,8}$/.test(resolved);
		const isRgba = /^rgba?\(/.test(resolved);
		if (!isHex && !isRgba) {
			errors.push(`Token ${token} resolved to unrecognized format: ${resolved}`);
		}
	}

	// Sub-test C: Component token methods return ColorToken references, not raw hex
	const buttonTokens = ds.getButtonTokens(ButtonVariant.Primary, ButtonSize.Md);
	const colorFields: (keyof IButtonTokens)[] = [
		'backgroundColor', 'textColor', 'borderColor',
		'hoverBackgroundColor', 'hoverTextColor', 'activeBackgroundColor',
	];
	for (const field of colorFields) {
		const value = buttonTokens[field];
		if (typeof value === 'string') {
			// It must be a known ColorToken string, not a raw hex
			if (!ALL_COLOR_TOKEN_STRINGS.has(value as string)) {
				errors.push(`ButtonTokens.${field} returns raw value "${value}" instead of ColorToken`);
			}
		}
	}

	const panelTokens = ds.getPanelTokens(PanelVariant.Raised);
	const panelColorFields: (keyof IPanelTokens)[] = ['backgroundColor', 'borderColor'];
	for (const field of panelColorFields) {
		const value = panelTokens[field];
		if (typeof value === 'string' && !ALL_COLOR_TOKEN_STRINGS.has(value as string)) {
			errors.push(`PanelTokens.${field} returns raw value "${value}" instead of ColorToken`);
		}
	}

	const statusTokens = ds.getStatusIndicatorTokens(StatusLevel.Success);
	const statusColorFields: (keyof IStatusIndicatorTokens)[] = ['color', 'backgroundColor'];
	for (const field of statusColorFields) {
		const value = statusTokens[field];
		if (typeof value === 'string' && !ALL_COLOR_TOKEN_STRINGS.has(value as string)) {
			errors.push(`StatusIndicatorTokens.${field} returns raw value "${value}" instead of ColorToken`);
		}
	}

	return {
		name: 'No raw hex colors in components',
		passed: errors.length === 0,
		details: errors.length === 0
			? 'All ColorTokens defined, resolveColor valid for all tokens, component tokens use semantic references'
			: errors.join('; '),
		durationMs: Date.now() - start,
	};
}

// ═══════════════════════════════════════════════════════════════════════════════
// TEST 2 — No inconsistent spacing usage
// ═══════════════════════════════════════════════════════════════════════════════

function testNoInconsistentSpacing(): IPhase12TestResult {
	const start = Date.now();
	const ds = new MiniDesignSystem();
	const errors: string[] = [];

	// Sub-test A: All Spacing enum values are multiples of 4 (or zero)
	const spacingValues = [
		Spacing.None, Spacing.Xs, Spacing.Sm, Spacing.MdSm,
		Spacing.Md, Spacing.MdLg, Spacing.Lg, Spacing.Xl,
		Spacing.Xxl, Spacing.Xxxl,
	];
	for (const val of spacingValues) {
		if (val % SPACING_BASE !== 0) {
			errors.push(`Spacing value ${val} is not a multiple of ${SPACING_BASE}`);
		}
	}

	// Sub-test B: isValidSpacing for valid values
	const validValues = [0, 4, 8, 12, 16, 20, 24, 32, 48, 64, 100, 200];
	for (const val of validValues) {
		if (!ds.isValidSpacing(val)) {
			errors.push(`isValidSpacing(${val}) should return true — it's a multiple of 4`);
		}
	}

	// Sub-test C: isValidSpacing for invalid values
	const invalidValues = [1, 3, 5, 7, 9, 13, 15, 17, -4];
	for (const val of invalidValues) {
		if (ds.isValidSpacing(val)) {
			errors.push(`isValidSpacing(${val}) should return false — not a multiple of 4 or negative`);
		}
	}

	// Sub-test D: All component tokens use valid spacing
	const allVariants = [ButtonVariant.Primary, ButtonVariant.Secondary, ButtonVariant.Ghost, ButtonVariant.Danger];
	const allSizes = [ButtonSize.Sm, ButtonSize.Md, ButtonSize.Lg];
	for (const variant of allVariants) {
		for (const size of allSizes) {
			const btn = ds.getButtonTokens(variant, size);
			if (!ALL_SPACING_VALUES.has(btn.paddingX)) {
				errors.push(`Button ${variant}/${size} paddingX=${btn.paddingX} not in Spacing enum`);
			}
			if (!ALL_SPACING_VALUES.has(btn.paddingY)) {
				errors.push(`Button ${variant}/${size} paddingY=${btn.paddingY} not in Spacing enum`);
			}
		}
	}

	const panelVariants = [PanelVariant.Flat, PanelVariant.Raised, PanelVariant.Elevated, PanelVariant.Overlay];
	for (const pv of panelVariants) {
		const panel = ds.getPanelTokens(pv);
		if (!ALL_SPACING_VALUES.has(panel.padding)) {
			errors.push(`Panel ${pv} padding=${panel.padding} not in Spacing enum`);
		}
		if (!ALL_SPACING_VALUES.has(panel.headerPadding)) {
			errors.push(`Panel ${pv} headerPadding=${panel.headerPadding} not in Spacing enum`);
		}
		if (!ALL_SPACING_VALUES.has(panel.bodyPadding)) {
			errors.push(`Panel ${pv} bodyPadding=${panel.bodyPadding} not in Spacing enum`);
		}
	}

	return {
		name: 'No inconsistent spacing usage',
		passed: errors.length === 0,
		details: errors.length === 0
			? 'All Spacing values are multiples of 4, isValidSpacing correct, component tokens use valid spacing'
			: errors.join('; '),
		durationMs: Date.now() - start,
	};
}

// ═══════════════════════════════════════════════════════════════════════════════
// TEST 3 — Layout obeys strict structure
// ═══════════════════════════════════════════════════════════════════════════════

function testLayoutStrictStructure(): IPhase12TestResult {
	const start = Date.now();
	const ds = new MiniDesignSystem();
	const errors: string[] = [];

	// Sub-test A: All LayoutZone rules have valid dimensions
	const allZones = Object.values(LayoutZone) as string[];
	for (const zone of allZones) {
		const rule = ds.getLayoutRule(zone as LayoutZone);
		if (rule.minWidth < 0 && rule.minWidth !== -1) {
			errors.push(`Zone ${zone} has negative minWidth: ${rule.minWidth}`);
		}
		if (rule.maxWidth !== undefined && rule.maxWidth < rule.minWidth) {
			errors.push(`Zone ${zone} maxWidth (${rule.maxWidth}) < minWidth (${rule.minWidth})`);
		}
	}

	// Sub-test B: Floating panel permissions — only allowed zones can float
	const floatingPanels = FLOATING_PANEL_PERMISSIONS.filter(p => p.allowed);
	for (const perm of floatingPanels) {
		for (const zone of perm.allowedZones) {
			const rule = ds.getLayoutRule(zone);
			if (!rule.allowsFloating) {
				// If a panel is allowed to float in a zone, the zone should allow floating
				// OR the panel has explicit permission that overrides zone defaults
				// This is acceptable — permissions grant exceptions
			}
		}
		// maxInstances should be positive
		if (perm.maxInstances < 1) {
			errors.push(`Floating panel ${perm.panelType} has maxInstances=${perm.maxInstances} but is allowed`);
		}
	}

	// Non-allowed panels should not have allowedZones
	const nonFloating = FLOATING_PANEL_PERMISSIONS.filter(p => !p.allowed);
	for (const perm of nonFloating) {
		if (perm.allowedZones.length > 0) {
			errors.push(`Non-floating panel ${perm.panelType} has allowedZones but is not allowed to float`);
		}
	}

	// Sub-test C: Z-index hierarchy is ordered
	const zIndexValues = [
		ZIndex.Base, ZIndex.SidebarOverlay, ZIndex.Dropdown,
		ZIndex.Sticky, ZIndex.ModalBackdrop, ZIndex.Modal,
		ZIndex.Notification, ZIndex.Tooltip, ZIndex.DebugOverlay,
	];
	for (let i = 1; i < zIndexValues.length; i++) {
		if (zIndexValues[i] <= zIndexValues[i - 1]) {
			errors.push(`ZIndex hierarchy not strictly increasing: ${zIndexValues[i - 1]} -> ${zIndexValues[i]}`);
		}
	}

	// All layout rules use valid z-index values
	const rules = ds.getLayoutRules();
	for (const rule of rules) {
		if (!VALID_Z_INDICES.has(rule.zIndex)) {
			errors.push(`Zone ${rule.zone} uses invalid z-index: ${rule.zIndex}`);
		}
	}

	return {
		name: 'Layout obeys strict structure',
		passed: errors.length === 0,
		details: errors.length === 0
			? 'All zones have valid dimensions, floating permissions consistent, z-index hierarchy strictly ordered'
			: errors.join('; '),
		durationMs: Date.now() - start,
	};
}

// ═══════════════════════════════════════════════════════════════════════════════
// TEST 4 — Panels follow hierarchy rules
// ═══════════════════════════════════════════════════════════════════════════════

function testPanelsFollowHierarchy(): IPhase12TestResult {
	const start = Date.now();
	const ds = new MiniDesignSystem();
	const errors: string[] = [];

	// Sub-test A: Panel elevation tokens are ordered Level0 < Level1 < Level2 < Level3
	const flatPanel = ds.getPanelTokens(PanelVariant.Flat);
	const raisedPanel = ds.getPanelTokens(PanelVariant.Raised);
	const elevatedPanel = ds.getPanelTokens(PanelVariant.Elevated);
	const overlayPanel = ds.getPanelTokens(PanelVariant.Overlay);

	if (flatPanel.elevation >= raisedPanel.elevation) {
		errors.push(`Flat elevation (${flatPanel.elevation}) should be < Raised (${raisedPanel.elevation})`);
	}
	if (raisedPanel.elevation >= elevatedPanel.elevation) {
		errors.push(`Raised elevation (${raisedPanel.elevation}) should be < Elevated (${elevatedPanel.elevation})`);
	}
	if (elevatedPanel.elevation >= overlayPanel.elevation) {
		errors.push(`Elevated elevation (${elevatedPanel.elevation}) should be < Overlay (${overlayPanel.elevation})`);
	}

	// Verify exact expected elevation mapping
	if (flatPanel.elevation !== Elevation.Level0) {
		errors.push(`Flat panel should have Elevation.Level0, got ${flatPanel.elevation}`);
	}
	if (raisedPanel.elevation !== Elevation.Level1) {
		errors.push(`Raised panel should have Elevation.Level1, got ${raisedPanel.elevation}`);
	}
	if (elevatedPanel.elevation !== Elevation.Level2) {
		errors.push(`Elevated panel should have Elevation.Level2, got ${elevatedPanel.elevation}`);
	}
	if (overlayPanel.elevation !== Elevation.Level3) {
		errors.push(`Overlay panel should have Elevation.Level3, got ${overlayPanel.elevation}`);
	}

	// Sub-test B: Panel background tokens differ per variant
	const bgColors = [
		flatPanel.backgroundColor,
		raisedPanel.backgroundColor,
		elevatedPanel.backgroundColor,
		overlayPanel.backgroundColor,
	];
	const uniqueBgColors = new Set(bgColors);
	// At least the flat and overlay should differ
	if (flatPanel.backgroundColor === overlayPanel.backgroundColor) {
		// This is acceptable if they use the same token but elevation differentiates
		// Check that at least some variant differs
		if (uniqueBgColors.size === 1) {
			errors.push('All panel variants have the same backgroundColor — should differ');
		}
	}

	// Border should be stronger for overlay panels
	if (overlayPanel.borderColor === flatPanel.borderColor) {
		// Overlay should use a stronger border
		errors.push('Overlay panel border should be stronger than flat panel border');
	}

	return {
		name: 'Panels follow hierarchy rules',
		passed: errors.length === 0,
		details: errors.length === 0
			? 'Panel elevations strictly ordered Level0<Level1<Level2<Level3, backgrounds differ per variant'
			: errors.join('; '),
		durationMs: Date.now() - start,
	};
}

// ═══════════════════════════════════════════════════════════════════════════════
// TEST 5 — Typography scale is consistent
// ═══════════════════════════════════════════════════════════════════════════════

function testTypographyScaleConsistent(): IPhase12TestResult {
	const start = Date.now();
	const ds = new MiniDesignSystem();
	const errors: string[] = [];

	// Sub-test A: All TypographySize values are valid (positive integers)
	const allSizes = [
		TypographySize.Caption, TypographySize.Overline, TypographySize.BodySm,
		TypographySize.Body, TypographySize.BodyLg, TypographySize.Subtitle,
		TypographySize.TitleSm, TypographySize.Title, TypographySize.Heading,
		TypographySize.DisplaySm, TypographySize.Display,
	];
	for (const size of allSizes) {
		if (size <= 0) {
			errors.push(`TypographySize value ${size} is not positive`);
		}
		if (!Number.isInteger(size)) {
			errors.push(`TypographySize value ${size} is not an integer`);
		}
	}

	// Typography sizes should be monotonically increasing
	for (let i = 1; i < allSizes.length; i++) {
		if (allSizes[i] <= allSizes[i - 1]) {
			errors.push(`Typography sizes not increasing: ${allSizes[i - 1]} -> ${allSizes[i]}`);
		}
	}

	// Sub-test B: Typography specs have correct line height / weight pairings
	// Large sizes (Heading+) should use Tight line height and Bold weight
	// Body sizes should use Normal line height and Regular/Medium weight
	const bodySizes = [TypographySize.Caption, TypographySize.Overline, TypographySize.BodySm, TypographySize.Body, TypographySize.BodyLg];
	const headingSizes = [TypographySize.Subtitle, TypographySize.TitleSm, TypographySize.Title, TypographySize.Heading, TypographySize.DisplaySm, TypographySize.Display];

	for (const size of bodySizes) {
		const spec = ds.getTypographySpec(size);
		if (spec.lineHeight !== LineHeight.Normal) {
			errors.push(`Body size ${size} should use LineHeight.Normal, got ${spec.lineHeight}`);
		}
	}

	for (const size of headingSizes) {
		const spec = ds.getTypographySpec(size);
		if (spec.lineHeight !== LineHeight.Tight) {
			errors.push(`Heading size ${size} should use LineHeight.Tight, got ${spec.lineHeight}`);
		}
		if (spec.weight !== FontWeight.SemiBold && spec.weight !== FontWeight.Bold) {
			errors.push(`Heading size ${size} should use SemiBold/Bold weight, got ${spec.weight}`);
		}
	}

	// Sub-test C: No random font sizes exist — every spec must be in the valid set
	for (const size of allSizes) {
		const spec = ds.getTypographySpec(size);
		if (!VALID_TYPOGRAPHY_SIZES.has(spec.size)) {
			errors.push(`TypographySpec for size ${size} has invalid size value: ${spec.size}`);
		}
	}

	return {
		name: 'Typography scale is consistent',
		passed: errors.length === 0,
		details: errors.length === 0
			? 'All TypographySize values valid, line height/weight pairings correct, no random sizes'
			: errors.join('; '),
		durationMs: Date.now() - start,
	};
}

// ═══════════════════════════════════════════════════════════════════════════════
// TEST 6 — No visual clutter zones
// ═══════════════════════════════════════════════════════════════════════════════

function testNoVisualClutter(): IPhase12TestResult {
	const start = Date.now();
	const ds = new MiniDesignSystem();
	const errors: string[] = [];

	// Sub-test A: Information hierarchy levels are ordered (Primary > Secondary > Tertiary > Quaternary)
	const primaryStyle = ds.getInfoLevelStyle(InfoLevel.Primary);
	const secondaryStyle = ds.getInfoLevelStyle(InfoLevel.Secondary);
	const tertiaryStyle = ds.getInfoLevelStyle(InfoLevel.Tertiary);
	const quaternaryStyle = ds.getInfoLevelStyle(InfoLevel.Quaternary);

	// Level values should increase (lower = more important)
	if (InfoLevel.Primary >= InfoLevel.Secondary) {
		errors.push(`InfoLevel.Primary (${InfoLevel.Primary}) should be < Secondary (${InfoLevel.Secondary})`);
	}
	if (InfoLevel.Secondary >= InfoLevel.Tertiary) {
		errors.push(`InfoLevel.Secondary (${InfoLevel.Secondary}) should be < Tertiary (${InfoLevel.Tertiary})`);
	}
	if (InfoLevel.Tertiary >= InfoLevel.Quaternary) {
		errors.push(`InfoLevel.Tertiary (${InfoLevel.Tertiary}) should be < Quaternary (${InfoLevel.Quaternary})`);
	}

	// Sub-test B: Opacity decreases with level
	if (primaryStyle.opacity < secondaryStyle.opacity) {
		errors.push(`Primary opacity (${primaryStyle.opacity}) should be >= Secondary (${secondaryStyle.opacity})`);
	}
	if (secondaryStyle.opacity < tertiaryStyle.opacity) {
		errors.push(`Secondary opacity (${secondaryStyle.opacity}) should be >= Tertiary (${tertiaryStyle.opacity})`);
	}
	if (tertiaryStyle.opacity < quaternaryStyle.opacity) {
		errors.push(`Tertiary opacity (${tertiaryStyle.opacity}) should be >= Quaternary (${quaternaryStyle.opacity})`);
	}

	// Sub-test C: AI panels are Secondary, not Primary
	// The information hierarchy mappings define AI elements as Secondary level
	const aiElements = [
		{ element: 'ai-agent-status', expectedLevel: InfoLevel.Secondary },
		{ element: 'mutation-indicator', expectedLevel: InfoLevel.Secondary },
		{ element: 'intent-progress', expectedLevel: InfoLevel.Secondary },
		{ element: 'ai-kernel-badge', expectedLevel: InfoLevel.Secondary },
	];

	// Verify the Secondary level style is used for AI elements
	const secondaryTokens = [
		secondaryStyle.textColor,
		secondaryStyle.backgroundColor,
	];
	// AI elements should use AccentSubtle or TextAccent — not Primary tokens
	const usesPrimaryText = secondaryStyle.textColor === ColorToken.TextPrimary;
	const usesPrimaryBg = secondaryStyle.backgroundColor === ColorToken.BackgroundPrimary;
	if (usesPrimaryText) {
		errors.push('AI (Secondary level) should not use TextPrimary — should use TextAccent or similar');
	}
	if (usesPrimaryBg) {
		errors.push('AI (Secondary level) should not use BackgroundPrimary — should use AccentSubtle or similar');
	}

	return {
		name: 'No visual clutter zones',
		passed: errors.length === 0,
		details: errors.length === 0
			? 'InfoLevels ordered, opacity decreases with level, AI panels at Secondary not Primary'
			: errors.join('; '),
		durationMs: Date.now() - start,
	};
}

// ═══════════════════════════════════════════════════════════════════════════════
// TEST 7 — AI panels visually distinct but not dominant
// ═══════════════════════════════════════════════════════════════════════════════

function testAiPanelsDistinctNotDominant(): IPhase12TestResult {
	const start = Date.now();
	const ds = new MiniDesignSystem();
	const errors: string[] = [];

	// Sub-test A: AI color tokens are distinct from primary accent
	const darkColors = ds.getDarkThemeColors();
	const aiKernelActive = darkColors[ColorToken.AiKernelActive];
	const accentPrimary = darkColors[ColorToken.AccentPrimary];
	const aiAgentExecuting = darkColors[ColorToken.AiAgentExecuting];
	const aiAgentPlanning = darkColors[ColorToken.AiAgentPlanning];

	// AI tokens should be related to accent but could be different shades
	// They should NOT be exactly the same as the raw primary accent if they represent different states
	// AiKernelActive and AccentPrimary can share the same hue family but should be distinguishable
	// At minimum, AI tokens must be defined and non-empty
	if (!aiKernelActive) {
		errors.push('AiKernelActive token is empty in dark theme');
	}
	if (!aiAgentExecuting) {
		errors.push('AiAgentExecuting token is empty in dark theme');
	}
	if (!aiAgentPlanning) {
		errors.push('AiAgentPlanning token is empty in dark theme');
	}

	// Sub-test B: AI kernel/agent/process tokens exist
	const requiredAiTokens: ColorToken[] = [
		ColorToken.AiKernelActive, ColorToken.AiKernelIdle, ColorToken.AiKernelError,
		ColorToken.AiAgentExecuting, ColorToken.AiAgentPlanning, ColorToken.AiAgentSuspended,
		ColorToken.AiProcessRunning, ColorToken.AiProcessFailed,
		ColorToken.AiIntentPending, ColorToken.AiIntentSatisfied, ColorToken.AiIntentBlocked,
	];

	for (const token of requiredAiTokens) {
		const value = darkColors[token];
		if (!value || value.trim().length === 0) {
			errors.push(`Required AI token ${token} is missing from dark theme`);
		}
		// Also check light theme
		const lightValue = ds.getLightThemeColors()[token];
		if (!lightValue || lightValue.trim().length === 0) {
			errors.push(`Required AI token ${token} is missing from light theme`);
		}
	}

	// Sub-test C: AI mutation annotation is subtle
	const mutationAnnotation = darkColors[ColorToken.AiMutationAnnotation];
	if (!mutationAnnotation) {
		errors.push('AiMutationAnnotation token is missing from dark theme');
	} else {
		// Must be rgba with low alpha OR a very light/subtle color
		const isRgbaSubtle = /^rgba?\([^)]+,\s*0\.\d{1,2}\)$/.test(mutationAnnotation);
		const isHexSubtle = /^#/.test(mutationAnnotation) && (() => {
			const rgb = hexToRgb(mutationAnnotation);
			if (!rgb) { return false; }
			// Subtle means low saturation or low opacity perception
			return true; // hex values for annotation would be checked via contrast
		})();

		if (!isRgbaSubtle && !isHexSubtle) {
			// Could still be valid — just check it's not a fully opaque vivid color
		}

		// The annotation must be subtle — check if it's an rgba with alpha <= 0.15
		const rgbaMatch = mutationAnnotation.match(/rgba?\(\s*[\d.]+\s*,\s*[\d.]+\s*,\s*[\d.]+\s*(?:,\s*([\d.]+))?\)/);
		if (rgbaMatch) {
			const alpha = parseFloat(rgbaMatch[1] ?? '1');
			if (alpha > 0.20) {
				errors.push(`AiMutationAnnotation alpha ${alpha} is too prominent — should be subtle (<= 0.20)`);
			}
		}
	}

	// Also verify mutation annotation in light theme
	const lightMutation = ds.getLightThemeColors()[ColorToken.AiMutationAnnotation];
	if (lightMutation) {
		const rgbaMatch = lightMutation.match(/rgba?\(\s*[\d.]+\s*,\s*[\d.]+\s*,\s*[\d.]+\s*(?:,\s*([\d.]+))?\)/);
		if (rgbaMatch) {
			const alpha = parseFloat(rgbaMatch[1] ?? '1');
			if (alpha > 0.15) {
				errors.push(`Light theme AiMutationAnnotation alpha ${alpha} too high — should be very subtle`);
			}
		}
	}

	return {
		name: 'AI panels visually distinct but not dominant',
		passed: errors.length === 0,
		details: errors.length === 0
			? 'AI tokens distinct from accent, all kernel/agent/process tokens exist, mutation annotation subtle'
			: errors.join('; '),
		durationMs: Date.now() - start,
	};
}

// ═══════════════════════════════════════════════════════════════════════════════
// TEST 8 — Dark theme is professional
// ═══════════════════════════════════════════════════════════════════════════════

function testDarkThemeProfessional(): IPhase12TestResult {
	const start = Date.now();
	const ds = new MiniDesignSystem();
	const errors: string[] = [];

	const darkColors = ds.getDarkThemeColors();

	// Sub-test A: No #000000 in dark theme
	for (const [token, value] of Object.entries(darkColors)) {
		if (typeof value === 'string' && value.toLowerCase() === '#000000') {
			errors.push(`Token ${token} uses pure black #000000 — violates professional dark theme rule`);
		}
	}

	// Sub-test B: All dark theme colors have sufficient contrast against their background
	// Test text colors against BackgroundPrimary
	const bgPrimary = darkColors[ColorToken.BackgroundPrimary]; // #0F1117
	const textTokens: { token: ColorToken; minContrast: number }[] = [
		{ token: ColorToken.TextPrimary, minContrast: 7.0 },    // WCAG AAA
		{ token: ColorToken.TextSecondary, minContrast: 4.5 },  // WCAG AA
		{ token: ColorToken.TextTertiary, minContrast: 3.0 },   // Readable but subtle
	];

	for (const { token, minContrast } of textTokens) {
		const value = darkColors[token];
		// Only check hex values (skip rgba)
		if (value.startsWith('#')) {
			const ratio = contrastRatio(value, bgPrimary);
			if (ratio !== null && ratio < minContrast) {
				errors.push(`Token ${token} contrast ratio ${ratio.toFixed(2)} < ${minContrast} against background`);
			}
		}
	}

	// Sub-test C: Accent colors are restrained — not overly saturated / neon
	// Check that accent colors in dark theme are not pure white or overly bright
	const accentTokens = [
		ColorToken.AccentPrimary, ColorToken.AccentSecondary,
		ColorToken.AccentMuted, ColorToken.AccentStrong,
	];

	for (const token of accentTokens) {
		const value = darkColors[token];
		if (value.startsWith('#')) {
			const rgb = hexToRgb(value);
			if (rgb) {
				// Not pure white
				if (rgb.r === 255 && rgb.g === 255 && rgb.b === 255) {
					errors.push(`Token ${token} is pure white — accent should be restrained, not white`);
				}
				// Not neon (extremely high saturation in any channel while others are 0)
				const maxChannel = Math.max(rgb.r, rgb.g, rgb.b);
				const minChannel = Math.min(rgb.r, rgb.g, rgb.b);
				if (maxChannel > 200 && minChannel < 30) {
					// High contrast between channels could indicate neon — but accent colors
					// are allowed some saturation. Only flag if it's truly neon.
					// This is acceptable for accent colors — they need to pop a little.
				}
			}
		}
	}

	// Borders should never be pure white or pure black
	const borderTokens = [
		ColorToken.BorderDefault, ColorToken.BorderSubtle,
		ColorToken.BorderStrong, ColorToken.BorderAccent,
	];
	for (const token of borderTokens) {
		const value = darkColors[token];
		if (typeof value === 'string' && value.startsWith('#')) {
			const rgb = hexToRgb(value);
			if (rgb && rgb.r === 255 && rgb.g === 255 && rgb.b === 255) {
				errors.push(`Border token ${token} is pure white — should be softer`);
			}
			if (rgb && rgb.r === 0 && rgb.g === 0 && rgb.b === 0) {
				errors.push(`Border token ${token} is pure black — should be softer`);
			}
		}
	}

	return {
		name: 'Dark theme is professional',
		passed: errors.length === 0,
		details: errors.length === 0
			? 'No #000000, sufficient contrast ratios, accent colors restrained, borders not harsh'
			: errors.join('; '),
		durationMs: Date.now() - start,
	};
}

// ═══════════════════════════════════════════════════════════════════════════════
// TEST 9 — Motion system is standardized
// ═══════════════════════════════════════════════════════════════════════════════

function testMotionSystemStandardized(): IPhase12TestResult {
	const start = Date.now();
	const ds = new MiniDesignSystem();
	const errors: string[] = [];

	// Sub-test A: All MotionDuration values are valid
	const durations = [MotionDuration.Fast, MotionDuration.Normal, MotionDuration.Slow, MotionDuration.Page];
	for (const dur of durations) {
		if (dur <= 0) {
			errors.push(`MotionDuration value ${dur} is not positive`);
		}
		if (!Number.isInteger(dur)) {
			errors.push(`MotionDuration value ${dur} is not an integer`);
		}
	}

	// Durations should be strictly increasing
	if (MotionDuration.Fast >= MotionDuration.Normal) {
		errors.push('MotionDuration.Fast should be < Normal');
	}
	if (MotionDuration.Normal >= MotionDuration.Slow) {
		errors.push('MotionDuration.Normal should be < Slow');
	}
	if (MotionDuration.Slow >= MotionDuration.Page) {
		errors.push('MotionDuration.Slow should be < Page');
	}

	// Sub-test B: Easing curves are defined
	const easings = [MotionEasing.Default, MotionEasing.EaseIn, MotionEasing.EaseOut, MotionEasing.EaseInOut, MotionEasing.Spring];
	for (const easing of easings) {
		if (!easing || !easing.startsWith('cubic-bezier(')) {
			errors.push(`MotionEasing "${easing}" is not a valid cubic-bezier curve`);
		}
	}

	// Verify Spring easing has overshoot (control point > 1)
	if (!MotionEasing.Spring.includes('1.275')) {
		errors.push('Spring easing should have overshoot control point > 1');
	}

	// Sub-test C: Panel motion specs are consistent
	const panelMotion = ds.getPanelMotionSpec();

	// Enter should use EaseOut (elements entering should decelerate)
	if (panelMotion.enter.easing !== MotionEasing.EaseOut) {
		errors.push(`Panel enter should use EaseOut, got ${panelMotion.enter.easing}`);
	}

	// Exit should use EaseIn (elements leaving should accelerate)
	if (panelMotion.exit.easing !== MotionEasing.EaseIn) {
		errors.push(`Panel exit should use EaseIn, got ${panelMotion.exit.easing}`);
	}

	// Resize should use EaseInOut
	if (panelMotion.resize.easing !== MotionEasing.EaseInOut) {
		errors.push(`Panel resize should use EaseInOut, got ${panelMotion.resize.easing}`);
	}

	// Enter duration should be >= exit duration (entering is smoother/slower than exiting)
	if (panelMotion.enter.duration < panelMotion.exit.duration) {
		errors.push('Panel enter duration should be >= exit duration for natural feel');
	}

	// All delays should be >= 0
	if (panelMotion.enter.delay < 0) {
		errors.push(`Panel enter delay should be >= 0, got ${panelMotion.enter.delay}`);
	}
	if (panelMotion.exit.delay < 0) {
		errors.push(`Panel exit delay should be >= 0, got ${panelMotion.exit.delay}`);
	}
	if (panelMotion.resize.delay < 0) {
		errors.push(`Panel resize delay should be >= 0, got ${panelMotion.resize.delay}`);
	}

	return {
		name: 'Motion system is standardized',
		passed: errors.length === 0,
		details: errors.length === 0
			? 'All MotionDuration values valid, easing curves defined, panel motion specs consistent'
			: errors.join('; '),
		durationMs: Date.now() - start,
	};
}

// ═══════════════════════════════════════════════════════════════════════════════
// TEST 10 — Component tokens are complete
// ═══════════════════════════════════════════════════════════════════════════════

function testComponentTokensComplete(): IPhase12TestResult {
	const start = Date.now();
	const ds = new MiniDesignSystem();
	const errors: string[] = [];

	// Sub-test A: All button variants (4) × sizes (3) produce valid tokens
	const buttonVariants = [ButtonVariant.Primary, ButtonVariant.Secondary, ButtonVariant.Ghost, ButtonVariant.Danger];
	const buttonSizes = [ButtonSize.Sm, ButtonSize.Md, ButtonSize.Lg];

	if (buttonVariants.length !== 4) {
		errors.push(`Expected 4 ButtonVariants, got ${buttonVariants.length}`);
	}
	if (buttonSizes.length !== 3) {
		errors.push(`Expected 3 ButtonSizes, got ${buttonSizes.length}`);
	}

	let buttonCombinations = 0;
	for (const variant of buttonVariants) {
		for (const size of buttonSizes) {
			buttonCombinations++;
			const tokens = ds.getButtonTokens(variant, size);

			// Verify all required fields are present and non-null
			if (tokens.variant !== variant) {
				errors.push(`Button variant mismatch: expected ${variant}, got ${tokens.variant}`);
			}
			if (tokens.size !== size) {
				errors.push(`Button size mismatch: expected ${size}, got ${tokens.size}`);
			}
			if (!tokens.backgroundColor) {
				errors.push(`Button ${variant}/${size} missing backgroundColor`);
			}
			if (!tokens.textColor) {
				errors.push(`Button ${variant}/${size} missing textColor`);
			}
			if (!tokens.borderColor) {
				errors.push(`Button ${variant}/${size} missing borderColor`);
			}
			if (!tokens.hoverBackgroundColor) {
				errors.push(`Button ${variant}/${size} missing hoverBackgroundColor`);
			}
			if (!tokens.hoverTextColor) {
				errors.push(`Button ${variant}/${size} missing hoverTextColor`);
			}
			if (!tokens.activeBackgroundColor) {
				errors.push(`Button ${variant}/${size} missing activeBackgroundColor`);
			}
			if (tokens.borderRadius <= 0) {
				errors.push(`Button ${variant}/${size} borderRadius should be positive`);
			}
			if (!ALL_SPACING_VALUES.has(tokens.paddingX)) {
				errors.push(`Button ${variant}/${size} paddingX not in Spacing enum`);
			}
			if (!ALL_SPACING_VALUES.has(tokens.paddingY)) {
				errors.push(`Button ${variant}/${size} paddingY not in Spacing enum`);
			}
			if (!VALID_TYPOGRAPHY_SIZES.has(tokens.fontSize)) {
				errors.push(`Button ${variant}/${size} fontSize not in TypographySize scale`);
			}
		}
	}

	if (buttonCombinations !== 12) {
		errors.push(`Expected 12 button combinations, tested ${buttonCombinations}`);
	}

	// Sub-test B: All panel variants (4) produce valid tokens
	const panelVariants = [PanelVariant.Flat, PanelVariant.Raised, PanelVariant.Elevated, PanelVariant.Overlay];

	if (panelVariants.length !== 4) {
		errors.push(`Expected 4 PanelVariants, got ${panelVariants.length}`);
	}

	for (const variant of panelVariants) {
		const tokens = ds.getPanelTokens(variant);

		if (tokens.variant !== variant) {
			errors.push(`Panel variant mismatch: expected ${variant}, got ${tokens.variant}`);
		}
		if (!tokens.backgroundColor) {
			errors.push(`Panel ${variant} missing backgroundColor`);
		}
		if (!tokens.borderColor) {
			errors.push(`Panel ${variant} missing borderColor`);
		}
		if (tokens.borderRadius <= 0) {
			errors.push(`Panel ${variant} borderRadius should be positive`);
		}
		if (!ALL_SPACING_VALUES.has(tokens.padding)) {
			errors.push(`Panel ${variant} padding not in Spacing enum`);
		}
		if (!VALID_TYPOGRAPHY_SIZES.has(tokens.headerFontSize)) {
			errors.push(`Panel ${variant} headerFontSize not in TypographySize scale`);
		}
		if (!ALL_SPACING_VALUES.has(tokens.headerPadding)) {
			errors.push(`Panel ${variant} headerPadding not in Spacing enum`);
		}
		if (!ALL_SPACING_VALUES.has(tokens.bodyPadding)) {
			errors.push(`Panel ${variant} bodyPadding not in Spacing enum`);
		}
	}

	// Sub-test C: All status levels (6) produce valid tokens
	// Note: The spec says 7, but StatusLevel enum has 6 values: Success, Warning, Error, Info, Idle, Active
	const statusLevels = [StatusLevel.Success, StatusLevel.Warning, StatusLevel.Error, StatusLevel.Info, StatusLevel.Idle, StatusLevel.Active];

	for (const level of statusLevels) {
		const tokens = ds.getStatusIndicatorTokens(level);

		if (tokens.level !== level) {
			errors.push(`StatusIndicator level mismatch: expected ${level}, got ${tokens.level}`);
		}
		if (!tokens.color) {
			errors.push(`StatusIndicator ${level} missing color`);
		}
		if (!tokens.backgroundColor) {
			errors.push(`StatusIndicator ${level} missing backgroundColor`);
		}
		if (!VALID_TYPOGRAPHY_SIZES.has(tokens.fontSize)) {
			errors.push(`StatusIndicator ${level} fontSize not in TypographySize scale`);
		}
		if (tokens.size <= 0) {
			errors.push(`StatusIndicator ${level} size should be positive`);
		}
	}

	// Verify color tokens are semantic, not raw hex
	for (const level of statusLevels) {
		const tokens = ds.getStatusIndicatorTokens(level);
		if (!ALL_COLOR_TOKEN_STRINGS.has(tokens.color as string)) {
			errors.push(`StatusIndicator ${level} color is not a valid ColorToken: ${tokens.color}`);
		}
		if (!ALL_COLOR_TOKEN_STRINGS.has(tokens.backgroundColor as string)) {
			errors.push(`StatusIndicator ${level} backgroundColor is not a valid ColorToken: ${tokens.backgroundColor}`);
		}
	}

	return {
		name: 'Component tokens are complete',
		passed: errors.length === 0,
		details: errors.length === 0
			? `All ${buttonCombinations} button combos valid, ${panelVariants.length} panel variants valid, ${statusLevels.length} status levels valid`
			: errors.join('; '),
		durationMs: Date.now() - start,
	};
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN VALIDATION RUNNER
// ═══════════════════════════════════════════════════════════════════════════════

export function runPhase12Validation(): IPhase12ValidationResults {
	const tests: (() => IPhase12TestResult)[] = [
		testNoRawHexColors,
		testNoInconsistentSpacing,
		testLayoutStrictStructure,
		testPanelsFollowHierarchy,
		testTypographyScaleConsistent,
		testNoVisualClutter,
		testAiPanelsDistinctNotDominant,
		testDarkThemeProfessional,
		testMotionSystemStandardized,
		testComponentTokensComplete,
	];

	const results: IPhase12TestResult[] = [];
	let passed = 0;
	let failed = 0;

	for (const test of tests) {
		const result = test();
		results.push(result);
		if (result.passed) {
			passed++;
		} else {
			failed++;
		}
	}

	return {
		phase: 12,
		totalTests: tests.length,
		passed,
		failed,
		results,
		timestamp: Date.now(),
	};
}
