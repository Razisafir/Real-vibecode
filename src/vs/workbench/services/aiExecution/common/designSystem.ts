/*---------------------------------------------------------------------------------------------
 *  Professional UI Design System — Phase 12
 *  Real Vibecode — AI-Native IDE
 *
 *  IDesignSystemService — Strict visual governance system that transforms the UI
 *  from "engineering dashboard" to "production-grade AI IDE".
 *
 *  This is NOT cosmetic styling. This is a strict visual governance system.
 *
 *  PRINCIPLES:
 *    1. No arbitrary spacing — 4px base unit only
 *    2. No raw hex colors in UI — semantic tokens only
 *    3. Single font family hierarchy — strict size scale
 *    4. Elevation system — no random shadows
 *    5. Layout grid rules — no floating panels unless allowed
 *    6. Motion system — no random transitions
 *    7. Information hierarchy — everything maps to a level
 *    8. "Apple-level restraint, not hacker theme"
 *
 *  Tasks:
 *    1. Design System Core (spacing, typography, color, elevation, grid, animation)
 *    2. Visual Language Specification (strict rules for spacing, type, color)
 *    3. Component Design Tokens (button, panel, input, sidebar, status)
 *    4. UI Consistency Enforcer (runtime validation, dev-mode warnings)
 *    5. Layout Architecture Rules (IDE layout model, z-index hierarchy)
 *    6. Information Hierarchy System (4 visual priority levels)
 *    7. Dark Theme Rebuild (professional dark mode)
 *    8. Motion Design System (timing, easing, transitions)
 *    9. Component Refactor Audit (classify existing components)
 *   10. UI Polish Layer (spacing normalization, icon consistency, alignment)
 *--------------------------------------------------------------------------------------------*/

import { Event } from '../../../../base/common/event.js';
import { IDisposable } from '../../../../base/common/lifecycle.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';

export const IDesignSystemService = createDecorator<IDesignSystemService>('designSystemService');

// ═══════════════════════════════════════════════════════════════════════════════
// TASK 1 — DESIGN SYSTEM CORE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Base spacing unit — ALL spacing must be a multiple of this.
 * No arbitrary pixel values allowed.
 */
export const SPACING_BASE = 4; // 4px base unit

/**
 * Spacing scale — derived from the 4px base unit.
 * Only these values are allowed for any margin, padding, or gap.
 */
export const enum Spacing {
	/** 0px — no spacing */
	None = 0,
	/** 4px — micro spacing (inline gaps, icon padding) */
	Xs = 4,
	/** 8px — small spacing (compact element gaps) */
	Sm = 8,
	/** 12px — medium-small (input padding, list items) */
	MdSm = 12,
	/** 16px — medium (panel padding, section gaps) */
	Md = 16,
	/** 20px — medium-large (card padding) */
	MdLg = 20,
	/** 24px — large (panel sections, group gaps) */
	Lg = 24,
	/** 32px — extra large (panel margins, major sections) */
	Xl = 32,
	/** 48px — huge (page margins, hero spacing) */
	Xxl = 48,
	/** 64px — massive (layout margins) */
	Xxxl = 64,
}

/**
 * Typography scale — strict size hierarchy.
 * No random px usage. Font sizes must come from this scale.
 */
export const enum TypographySize {
	/** 10px — captions, badges, metadata */
	Caption = 10,
	/** 11px — overlines, labels, tags */
	Overline = 11,
	/** 12px — body small, secondary text, tab labels */
	BodySm = 12,
	/** 13px — body default, menu items, status bar */
	Body = 13,
	/** 14px — body large, editor suggestions */
	BodyLg = 14,
	/** 16px — subtitle, panel headers */
	Subtitle = 16,
	/** 18px — title small, dialog titles */
	TitleSm = 18,
	/** 20px — title default, section headings */
	Title = 20,
	/** 24px — heading, major section titles */
	Heading = 24,
	/** 28px — display small */
	DisplaySm = 28,
	/** 32px — display default */
	Display = 32,
}

/**
 * Font weight scale.
 */
export const enum FontWeight {
	/** 400 — body text */
	Regular = 400,
	/** 500 — emphasis, labels */
	Medium = 500,
	/** 600 — subtitles, panel headers */
	SemiBold = 600,
	/** 700 — titles, headings */
	Bold = 700,
}

/**
 * Line height scale — paired with typography sizes.
 */
export const enum LineHeight {
	/** 1.2 — tight (headings, titles) */
	Tight = 1.2,
	/** 1.4 — normal (body text) */
	Normal = 1.4,
	/** 1.6 — relaxed (long-form content) */
	Relaxed = 1.6,
}

/**
 * Elevation levels — shadow system.
 * No random box-shadows. Must use elevation tokens.
 */
export const enum Elevation {
	/** No shadow — flat surface */
	Level0 = 0,
	/** Subtle shadow — raised cards, dropdowns */
	Level1 = 1,
	/** Medium shadow — panels, popovers */
	Level2 = 2,
	/** Heavy shadow — modals, overlays */
	Level3 = 3,
}

/**
 * Elevation shadow definitions.
 */
export const ELEVATION_SHADOWS: Readonly<Record<Elevation, string>> = {
	[Elevation.Level0]: 'none',
	[Elevation.Level1]: '0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.08)',
	[Elevation.Level2]: '0 4px 6px rgba(0,0,0,0.15), 0 2px 4px rgba(0,0,0,0.10)',
	[Elevation.Level3]: '0 10px 25px rgba(0,0,0,0.20), 0 6px 10px rgba(0,0,0,0.12)',
};

/**
 * Layout grid rules.
 */
export const enum LayoutGrid {
	/** Navigation sidebar width */
	NavigationWidth = 48,
	/** Secondary sidebar min width */
	SecondarySidebarMinWidth = 200,
	/** Secondary sidebar default width */
	SecondarySidebarDefaultWidth = 280,
	/** Panel min height */
	BottomPanelMinHeight = 150,
	/** Panel default height */
	BottomPanelDefaultHeight = 220,
	/** Editor min width */
	EditorMinWidth = 400,
	/** Status bar height */
	StatusBarHeight = 24,
	/** Title bar height */
	TitleBarHeight = 36,
	/** Tab bar height */
	TabBarHeight = 36,
}

/**
 * Z-index hierarchy — strict layering.
 * No random z-index values. Must use these levels.
 */
export const enum ZIndex {
	/** Base layer — editor, panels */
	Base = 0,
	/** Sidebar overlays */
	SidebarOverlay = 100,
	/** Dropdowns, popovers */
	Dropdown = 200,
	/** Sticky elements */
	Sticky = 300,
	/** Modal backdrop */
	ModalBackdrop = 400,
	/** Modal content */
	Modal = 500,
	/** Notifications, toasts */
	Notification = 600,
	/** Tooltips */
	Tooltip = 700,
	/** Debug overlay (highest) */
	DebugOverlay = 800,
}

// ═══════════════════════════════════════════════════════════════════════════════
// TASK 2 — VISUAL LANGUAGE SPECIFICATION (Semantic Color Tokens)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Semantic color token names.
 * NO raw hex usage in the UI layer. All colors must use these tokens.
 */
export const enum ColorToken {
	// ─── Background ───────────────────────────────────────────────────────
	BackgroundPrimary = 'background.primary',
	BackgroundSecondary = 'background.secondary',
	BackgroundTertiary = 'background.tertiary',
	BackgroundElevated = 'background.elevated',
	BackgroundOverlay = 'background.overlay',

	// ─── Surface ─────────────────────────────────────────────────────────
	SurfacePrimary = 'surface.primary',
	SurfaceSecondary = 'surface.secondary',
	SurfaceTertiary = 'surface.tertiary',
	SurfaceHover = 'surface.hover',
	SurfaceActive = 'surface.active',
	SurfaceSelected = 'surface.selected',

	// ─── Text ────────────────────────────────────────────────────────────
	TextPrimary = 'text.primary',
	TextSecondary = 'text.secondary',
	TextTertiary = 'text.tertiary',
	TextDisabled = 'text.disabled',
	TextInverted = 'text.inverted',
	TextAccent = 'text.accent',

	// ─── Border ──────────────────────────────────────────────────────────
	BorderDefault = 'border.default',
	BorderSubtle = 'border.subtle',
	BorderStrong = 'border.strong',
	BorderAccent = 'border.accent',

	// ─── Accent ──────────────────────────────────────────────────────────
	AccentPrimary = 'accent.primary',
	AccentSecondary = 'accent.secondary',
	AccentMuted = 'accent.muted',
	AccentSubtle = 'accent.subtle',
	AccentStrong = 'accent.strong',

	// ─── Status ──────────────────────────────────────────────────────────
	StatusSuccess = 'status.success',
	StatusWarning = 'status.warning',
	StatusError = 'status.error',
	StatusInfo = 'status.info',
	StatusSuccessSubtle = 'status.success.subtle',
	StatusWarningSubtle = 'status.warning.subtle',
	StatusErrorSubtle = 'status.error.subtle',
	StatusInfoSubtle = 'status.info.subtle',

	// ─── AI-Specific ────────────────────────────────────────────────────
	AiKernelActive = 'ai.kernel.active',
	AiKernelIdle = 'ai.kernel.idle',
	AiKernelError = 'ai.kernel.error',
	AiAgentExecuting = 'ai.agent.executing',
	AiAgentPlanning = 'ai.agent.planning',
	AiAgentSuspended = 'ai.agent.suspended',
	AiProcessRunning = 'ai.process.running',
	AiProcessFailed = 'ai.process.failed',
	AiIntentPending = 'ai.intent.pending',
	AiIntentSatisfied = 'ai.intent.satisfied',
	AiIntentBlocked = 'ai.intent.blocked',
	AiMutationAnnotation = 'ai.mutation.annotation',
}

/**
 * A color token resolution — maps semantic tokens to actual hex values.
 */
export interface IColorTokenResolution {
	readonly token: ColorToken;
	readonly value: string;
	readonly isDark: boolean;
}

/**
 * A complete theme — maps ALL semantic tokens to hex values.
 */
export interface IDesignTheme {
	readonly name: string;
	readonly isDark: boolean;
	readonly colors: Readonly<Record<ColorToken, string>>;
	readonly typography: IDesignTypography;
	readonly motion: IDesignMotion;
}

/**
 * Typography configuration.
 */
export interface IDesignTypography {
	readonly fontFamily: string;
	readonly fontFamilyMono: string;
	readonly sizes: Readonly<Record<TypographySize, ITypographySpec>>;
}

/**
 * Typography specification for a size.
 */
export interface ITypographySpec {
	readonly size: TypographySize;
	readonly lineHeight: LineHeight;
	readonly weight: FontWeight;
	readonly letterSpacing: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// TASK 3 — COMPONENT DESIGN TOKENS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Button variant tokens.
 */
export const enum ButtonVariant {
	Primary = 'primary',
	Secondary = 'secondary',
	Ghost = 'ghost',
	Danger = 'danger',
}

/**
 * Button size tokens.
 */
export const enum ButtonSize {
	Sm = 'sm',
	Md = 'md',
	Lg = 'lg',
}

/**
 * Button design tokens — all values are design tokens, never raw hex/px.
 */
export interface IButtonTokens {
	readonly variant: ButtonVariant;
	readonly size: ButtonSize;
	readonly backgroundColor: ColorToken;
	readonly textColor: ColorToken;
	readonly borderColor: ColorToken;
	readonly hoverBackgroundColor: ColorToken;
	readonly hoverTextColor: ColorToken;
	readonly activeBackgroundColor: ColorToken;
	readonly borderRadius: number;
	readonly paddingX: Spacing;
	readonly paddingY: Spacing;
	readonly fontSize: TypographySize;
	readonly fontWeight: FontWeight;
	readonly elevation: Elevation;
}

/**
 * Panel elevation tokens.
 */
export const enum PanelVariant {
	/** Flat panel — level 0 */
	Flat = 'flat',
	/** Raised panel — level 1 */
	Raised = 'raised',
	/** Elevated panel — level 2 */
	Elevated = 'elevated',
	/** Overlay panel — level 3 */
	Overlay = 'overlay',
}

/**
 * Panel design tokens.
 */
export interface IPanelTokens {
	readonly variant: PanelVariant;
	readonly backgroundColor: ColorToken;
	readonly borderColor: ColorToken;
	readonly borderRadius: number;
	readonly padding: Spacing;
	readonly elevation: Elevation;
	readonly headerFontSize: TypographySize;
	readonly headerFontWeight: FontWeight;
	readonly headerPadding: Spacing;
	readonly bodyPadding: Spacing;
}

/**
 * Input design tokens.
 */
export interface IInputTokens {
	readonly backgroundColor: ColorToken;
	readonly textColor: ColorToken;
	readonly borderColor: ColorToken;
	readonly focusBorderColor: ColorToken;
	readonly placeholderColor: ColorToken;
	readonly borderRadius: number;
	readonly paddingX: Spacing;
	readonly paddingY: Spacing;
	readonly fontSize: TypographySize;
	readonly elevation: Elevation;
}

/**
 * Sidebar design tokens.
 */
export interface ISidebarTokens {
	readonly backgroundColor: ColorToken;
	readonly borderColor: ColorToken;
	readonly width: number;
	readonly itemHeight: number;
	readonly itemPaddingX: Spacing;
	readonly itemPaddingY: Spacing;
	readonly itemFontSize: TypographySize;
	readonly itemHoverColor: ColorToken;
	readonly itemActiveColor: ColorToken;
	readonly itemSelectedColor: ColorToken;
	readonly sectionHeaderFontSize: TypographySize;
	readonly sectionHeaderFontWeight: FontWeight;
}

/**
 * Status indicator tokens.
 */
export const enum StatusLevel {
	Success = 'success',
	Warning = 'warning',
	Error = 'error',
	Info = 'info',
	Idle = 'idle',
	Active = 'active',
}

/**
 * Status indicator design tokens.
 */
export interface IStatusIndicatorTokens {
	readonly level: StatusLevel;
	readonly color: ColorToken;
	readonly backgroundColor: ColorToken;
	readonly fontSize: TypographySize;
	readonly size: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// TASK 4 — UI CONSISTENCY ENFORCER
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Types of design violations the enforcer can detect.
 */
export const enum DesignViolationType {
	/** Raw hex color used instead of semantic token */
	RawHexColor = 'raw-hex-color',
	/** Non-standard spacing (not a multiple of 4px) */
	SpacingViolation = 'spacing-violation',
	/** Non-standard font size */
	InconsistentFont = 'inconsistent-font',
	/** Unauthorized inline style */
	UnauthorizedInlineStyle = 'unauthorized-inline-style',
	/** Non-standard elevation (random box-shadow) */
	InvalidElevation = 'invalid-elevation',
	/** Z-index outside the defined hierarchy */
	InvalidZIndex = 'invalid-z-index',
	/** Color contrast too low */
	InsufficientContrast = 'insufficient-contrast',
	/** Missing focus/hover state */
	MissingInteractionState = 'missing-interaction-state',
}

/**
 * Severity of a design violation.
 */
export const enum ViolationSeverity {
	Error = 'error',
	Warning = 'warning',
	Info = 'info',
}

/**
 * A detected design violation.
 */
export interface IDesignViolation {
	readonly type: DesignViolationType;
	readonly severity: ViolationSeverity;
	readonly description: string;
	readonly location: string;
	readonly suggestion: string;
	readonly detectedAt: number;
}

/**
 * Result of a consistency check.
 */
export interface IConsistencyCheckResult {
	readonly violations: readonly IDesignViolation[];
	readonly errorCount: number;
	readonly warningCount: number;
	readonly infoCount: number;
	readonly passed: boolean;
	readonly checkedAt: number;
	readonly durationMs: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// TASK 5 — LAYOUT ARCHITECTURE RULES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * IDE layout zones — strict position rules.
 */
export const enum LayoutZone {
	/** Left: Navigation sidebar (fixed width) */
	Navigation = 'navigation',
	/** Left-secondary: File explorer / panels */
	PrimarySidebar = 'primary-sidebar',
	/** Center: Editor surface (dominant space) */
	Editor = 'editor',
	/** Right: Context / AI / Graph panels */
	SecondarySidebar = 'secondary-sidebar',
	/** Bottom: Execution / terminal / logs */
	BottomPanel = 'bottom-panel',
	/** Top: Title bar / menu bar */
	TitleBar = 'title-bar',
	/** Status: Status bar */
	StatusBar = 'status-bar',
}

/**
 * Layout rule — defines what's allowed in a zone.
 */
export interface ILayoutRule {
	readonly zone: LayoutZone;
	readonly minWidth: number;
	readonly maxWidth: number | undefined;
	readonly defaultWidth: number;
	readonly resizable: boolean;
	readonly allowedPanelTypes: readonly string[];
	readonly allowsFloating: boolean;
	readonly allowsOverlap: boolean;
	readonly zIndex: ZIndex;
}

/**
 * Floating panel permission.
 */
export interface IFloatingPanelPermission {
	readonly panelType: string;
	readonly allowed: boolean;
	readonly allowedZones: readonly LayoutZone[];
	readonly maxInstances: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// TASK 6 — INFORMATION HIERARCHY SYSTEM
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Visual priority levels — everything must map to a level.
 * Level 1 is most important, Level 4 is least.
 */
export const enum InfoLevel {
	/** Level 1: User action surfaces (editor, input, active focus) */
	Primary = 1,
	/** Level 2: AI feedback / execution (agent status, mutation indicators, intent progress) */
	Secondary = 2,
	/** Level 3: Diagnostics / logs (terminal output, build status, warnings) */
	Tertiary = 3,
	/** Level 4: Metadata / debug (timestamps, IDs, internal state) */
	Quaternary = 4,
}

/**
 * Visual properties for each information level.
 */
export interface IInfoLevelStyle {
	readonly level: InfoLevel;
	readonly textColor: ColorToken;
	readonly backgroundColor: ColorToken;
	readonly fontSize: TypographySize;
	readonly fontWeight: FontWeight;
	readonly opacity: number;
	readonly borderColor: ColorToken;
	readonly elevation: Elevation;
}

/**
 * Mapping of UI elements to information levels.
 */
export interface IInfoLevelMapping {
	readonly element: string;
	readonly level: InfoLevel;
	readonly justification: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// TASK 7 — DARK THEME REBUILD
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Professional dark theme colors.
 * Design philosophy: "Apple-level restraint, not hacker theme"
 *
 * Rules:
 *   - No pure black (#000000) — use near-black with slight color tint
 *   - Reduced contrast noise — soft borders, not harsh lines
 *   - Neutral background gradient layering
 *   - Accent color discipline — not everywhere
 *   - Softer borders — never pure white
 */
export const PROFESSIONAL_DARK_THEME: Readonly<Record<ColorToken, string>> = {
	// ─── Background ───────────────────────────────────────────────────────
	[ColorToken.BackgroundPrimary]: '#0F1117',      // Near-black with blue tint (NOT #000000)
	[ColorToken.BackgroundSecondary]: '#151720',     // Slightly lighter
	[ColorToken.BackgroundTertiary]: '#1A1D2B',     // Panel backgrounds
	[ColorToken.BackgroundElevated]: '#1E2130',      // Elevated surfaces
	[ColorToken.BackgroundOverlay]: 'rgba(15,17,23,0.85)', // Modal overlays

	// ─── Surface ─────────────────────────────────────────────────────────
	[ColorToken.SurfacePrimary]: '#1A1D2B',          // Cards, panels
	[ColorToken.SurfaceSecondary]: '#222638',         // Hover states
	[ColorToken.SurfaceTertiary]: '#282D42',          // Active states
	[ColorToken.SurfaceHover]: '#2A2F45',             // Hover highlight
	[ColorToken.SurfaceActive]: '#313750',             // Active/pressed
	[ColorToken.SurfaceSelected]: '#2D3350',           // Selected items

	// ─── Text ────────────────────────────────────────────────────────────
	[ColorToken.TextPrimary]: '#E4E6F0',              // Primary text — not pure white
	[ColorToken.TextSecondary]: '#9DA2B9',             // Secondary — reduced contrast
	[ColorToken.TextTertiary]: '#6B7194',              // Tertiary — subtle
	[ColorToken.TextDisabled]: '#464C6A',              // Disabled
	[ColorToken.TextInverted]: '#0F1117',              // On accent backgrounds
	[ColorToken.TextAccent]: '#8B9CF7',               // Accent text — softer than raw purple

	// ─── Border ──────────────────────────────────────────────────────────
	[ColorToken.BorderDefault]: '#2A2F45',             // Default — subtle, not harsh
	[ColorToken.BorderSubtle]: '#1E2130',              // Very subtle
	[ColorToken.BorderStrong]: '#3E4463',              // Strong — still not white
	[ColorToken.BorderAccent]: '#6366F1',              // Accent border

	// ─── Accent ──────────────────────────────────────────────────────────
	[ColorToken.AccentPrimary]: '#6366F1',             // Indigo — primary accent
	[ColorToken.AccentSecondary]: '#06B6D4',           // Cyan — secondary accent
	[ColorToken.AccentMuted]: '#4F46E5',               // Muted indigo
	[ColorToken.AccentSubtle]: 'rgba(99,102,241,0.12)', // Subtle accent bg
	[ColorToken.AccentStrong]: '#818CF8',              // Strong accent — lighter indigo

	// ─── Status ──────────────────────────────────────────────────────────
	[ColorToken.StatusSuccess]: '#34D399',             // Green — success
	[ColorToken.StatusWarning]: '#FBBF24',             // Amber — warning
	[ColorToken.StatusError]: '#F87171',               // Red — error
	[ColorToken.StatusInfo]: '#60A5FA',                // Blue — info
	[ColorToken.StatusSuccessSubtle]: 'rgba(52,211,153,0.12)',
	[ColorToken.StatusWarningSubtle]: 'rgba(251,191,36,0.12)',
	[ColorToken.StatusErrorSubtle]: 'rgba(248,113,113,0.12)',
	[ColorToken.StatusInfoSubtle]: 'rgba(96,165,250,0.12)',

	// ─── AI-Specific ────────────────────────────────────────────────────
	[ColorToken.AiKernelActive]: '#818CF8',             // Indigo light — kernel active
	[ColorToken.AiKernelIdle]: '#6B7194',               // Gray — kernel idle
	[ColorToken.AiKernelError]: '#F87171',              // Red — kernel error
	[ColorToken.AiAgentExecuting]: '#818CF8',            // Indigo light — agent executing
	[ColorToken.AiAgentPlanning]: '#A78BFA',             // Purple — agent planning
	[ColorToken.AiAgentSuspended]: '#FBBF24',            // Amber — agent suspended
	[ColorToken.AiProcessRunning]: '#34D399',            // Green — process running
	[ColorToken.AiProcessFailed]: '#F87171',             // Red — process failed
	[ColorToken.AiIntentPending]: '#60A5FA',             // Blue — intent pending
	[ColorToken.AiIntentSatisfied]: '#34D399',           // Green — intent satisfied
	[ColorToken.AiIntentBlocked]: '#F87171',             // Red — intent blocked
	[ColorToken.AiMutationAnnotation]: 'rgba(129,140,248,0.10)', // Subtle indigo bg
};

/**
 * Professional light theme colors.
 */
export const PROFESSIONAL_LIGHT_THEME: Readonly<Record<ColorToken, string>> = {
	[ColorToken.BackgroundPrimary]: '#FFFFFF',
	[ColorToken.BackgroundSecondary]: '#F8FAFC',
	[ColorToken.BackgroundTertiary]: '#F1F5F9',
	[ColorToken.BackgroundElevated]: '#FFFFFF',
	[ColorToken.BackgroundOverlay]: 'rgba(241,245,249,0.85)',
	[ColorToken.SurfacePrimary]: '#FFFFFF',
	[ColorToken.SurfaceSecondary]: '#F8FAFC',
	[ColorToken.SurfaceTertiary]: '#F1F5F9',
	[ColorToken.SurfaceHover]: '#E2E8F0',
	[ColorToken.SurfaceActive]: '#CBD5E1',
	[ColorToken.SurfaceSelected]: '#DBEAFE',
	[ColorToken.TextPrimary]: '#0F172A',
	[ColorToken.TextSecondary]: '#475569',
	[ColorToken.TextTertiary]: '#94A3B8',
	[ColorToken.TextDisabled]: '#CBD5E1',
	[ColorToken.TextInverted]: '#FFFFFF',
	[ColorToken.TextAccent]: '#4F46E5',
	[ColorToken.BorderDefault]: '#E2E8F0',
	[ColorToken.BorderSubtle]: '#F1F5F9',
	[ColorToken.BorderStrong]: '#CBD5E1',
	[ColorToken.BorderAccent]: '#6366F1',
	[ColorToken.AccentPrimary]: '#6366F1',
	[ColorToken.AccentSecondary]: '#0891B2',
	[ColorToken.AccentMuted]: '#4F46E5',
	[ColorToken.AccentSubtle]: 'rgba(99,102,241,0.08)',
	[ColorToken.AccentStrong]: '#4338CA',
	[ColorToken.StatusSuccess]: '#059669',
	[ColorToken.StatusWarning]: '#D97706',
	[ColorToken.StatusError]: '#DC2626',
	[ColorToken.StatusInfo]: '#2563EB',
	[ColorToken.StatusSuccessSubtle]: 'rgba(5,150,105,0.08)',
	[ColorToken.StatusWarningSubtle]: 'rgba(217,119,6,0.08)',
	[ColorToken.StatusErrorSubtle]: 'rgba(220,38,38,0.08)',
	[ColorToken.StatusInfoSubtle]: 'rgba(37,99,235,0.08)',
	[ColorToken.AiKernelActive]: '#4F46E5',
	[ColorToken.AiKernelIdle]: '#94A3B8',
	[ColorToken.AiKernelError]: '#DC2626',
	[ColorToken.AiAgentExecuting]: '#4F46E5',
	[ColorToken.AiAgentPlanning]: '#7C3AED',
	[ColorToken.AiAgentSuspended]: '#D97706',
	[ColorToken.AiProcessRunning]: '#059669',
	[ColorToken.AiProcessFailed]: '#DC2626',
	[ColorToken.AiIntentPending]: '#2563EB',
	[ColorToken.AiIntentSatisfied]: '#059669',
	[ColorToken.AiIntentBlocked]: '#DC2626',
	[ColorToken.AiMutationAnnotation]: 'rgba(79,70,229,0.06)',
};

// ═══════════════════════════════════════════════════════════════════════════════
// TASK 8 — MOTION DESIGN SYSTEM
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Animation duration scale.
 * No random transition durations. Must use these values.
 */
export const enum MotionDuration {
	/** 100ms — micro-interactions (hover, focus, toggle) */
	Fast = 100,
	/** 200ms — standard interactions (expand, slide) */
	Normal = 200,
	/** 350ms — complex transitions (panel open, modal appear) */
	Slow = 350,
	/** 500ms — page-level transitions (view change) */
	Page = 500,
}

/**
 * Easing curves — standardized for consistency.
 */
export const enum MotionEasing {
	/** Default ease — most interactions */
	Default = 'cubic-bezier(0.4, 0, 0.2, 1)',
	/** Ease in — elements leaving */
	EaseIn = 'cubic-bezier(0.4, 0, 1, 1)',
	/** Ease out — elements entering */
	EaseOut = 'cubic-bezier(0, 0, 0.2, 1)',
	/** Ease in-out — panel resizing */
	EaseInOut = 'cubic-bezier(0.4, 0, 0.2, 1)',
	/** Spring — playful, for notifications */
	Spring = 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
}

/**
 * Motion specification for an animation.
 */
export interface IMotionSpec {
	readonly duration: MotionDuration;
	readonly easing: MotionEasing;
	readonly delay: number;
}

/**
 * Standard panel motion behaviors.
 */
export interface IPanelMotionSpec {
	readonly enter: IMotionSpec;
	readonly exit: IMotionSpec;
	readonly resize: IMotionSpec;
}

// ═══════════════════════════════════════════════════════════════════════════════
// TASK 9 — COMPONENT REFACTOR AUDIT
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Component compliance status.
 */
export const enum ComponentCompliance {
	/** ❌ Must be replaced — inconsistent styling */
	Replace = 'replace',
	/** ⚠️ Partially compliant — needs adjustment */
	Partial = 'partial',
	/** ✅ Compliant — follows design system */
	Compliant = 'compliant',
}

/**
 * Audit result for a component.
 */
export interface IComponentAuditResult {
	readonly componentId: string;
	readonly componentName: string;
	readonly source: string;
	readonly compliance: ComponentCompliance;
	readonly violations: readonly IDesignViolation[];
	readonly migrationNotes: string;
	readonly priority: 'critical' | 'high' | 'medium' | 'low';
}

// ═══════════════════════════════════════════════════════════════════════════════
// TASK 10 — UI POLISH LAYER
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Icon size specification.
 */
export const enum IconSize {
	Xs = 12,
	Sm = 14,
	Md = 16,
	Lg = 20,
	Xl = 24,
}

/**
 * Icon consistency rule.
 */
export interface IIconRule {
	readonly context: string;
	readonly size: IconSize;
	readonly color: ColorToken;
}

/**
 * Hover/focus state specification.
 */
export interface IInteractionStateSpec {
	readonly hoverBackgroundColor: ColorToken;
	readonly hoverBorderColor: ColorToken;
	readonly focusBorderColor: ColorToken;
	readonly focusOutlineColor: ColorToken;
	readonly focusOutlineWidth: number;
	readonly focusOutlineOffset: number;
	readonly activeBackgroundColor: ColorToken;
	readonly transitionDuration: MotionDuration;
	readonly transitionEasing: MotionEasing;
}

/**
 * Polish pass result.
 */
export interface IPolishPassResult {
	readonly spacingNormalizations: number;
	readonly iconCorrections: number;
	readonly alignmentCorrections: number;
	readonly noiseReductions: number;
	readonly interactionStateFixes: number;
	readonly totalChanges: number;
	readonly completedAt: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SERVICE INTERFACE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * IDesignSystemService — Strict visual governance system.
 *
 * This service provides:
 *   1. Design System Core — spacing, typography, color, elevation, grid, animation rules
 *   2. Visual Language — semantic tokens, no raw hex, no arbitrary spacing
 *   3. Component Tokens — button, panel, input, sidebar, status indicator tokens
 *   4. Consistency Enforcement — runtime validation, dev-mode warnings
 *   5. Layout Architecture — IDE layout zones, z-index hierarchy, floating rules
 *   6. Information Hierarchy — 4 visual priority levels
 *   7. Theme Management — professional dark/light themes
 *   8. Motion System — timing, easing, panel entrance/exit
 *   9. Component Audit — classify existing components
 *  10. UI Polish — spacing normalization, icon consistency, alignment
 */
export interface IDesignSystemService {
	readonly _serviceBrand: undefined;

	// ─── Design System Core (Task 1) ─────────────────────────────────────────

	/** Current active theme */
	readonly activeTheme: IDesignTheme;

	/** Get spacing value for a spacing token */
	getSpacing(spacing: Spacing): number;

	/** Validate that a pixel value is a valid spacing value */
	isValidSpacing(px: number): boolean;

	/** Get typography spec for a size */
	getTypographySpec(size: TypographySize): ITypographySpec;

	/** Get elevation shadow for a level */
	getElevationShadow(level: Elevation): string;

	/** Get layout grid rule for a zone */
	getLayoutRule(zone: LayoutZone): ILayoutRule;

	// ─── Visual Language (Task 2) ────────────────────────────────────────────

	/** Resolve a color token to its current hex value */
	resolveColor(token: ColorToken): string;

	/** Resolve a color token with alpha */
	resolveColorAlpha(token: ColorToken, alpha: number): string;

	/** Get all color token resolutions for the current theme */
	getAllColorResolutions(): readonly IColorTokenResolution[];

	/** Validate a hex color — returns true if it matches a known token */
	isKnownColor(hex: string): boolean;

	/** Check if a raw hex is used where a token should be */
	isRawHexViolation(value: string): boolean;

	// ─── Component Tokens (Task 3) ──────────────────────────────────────────

	/** Get button design tokens */
	getButtonTokens(variant: ButtonVariant, size: ButtonSize): IButtonTokens;

	/** Get panel design tokens */
	getPanelTokens(variant: PanelVariant): IPanelTokens;

	/** Get input design tokens */
	getInputTokens(): IInputTokens;

	/** Get sidebar design tokens */
	getSidebarTokens(): ISidebarTokens;

	/** Get status indicator tokens */
	getStatusIndicatorTokens(level: StatusLevel): IStatusIndicatorTokens;

	// ─── Consistency Enforcement (Task 4) ───────────────────────────────────

	/** Run a full consistency check across the UI */
	runConsistencyCheck(): IConsistencyCheckResult;

	/** Check a specific element for violations */
	checkElement(elementId: string): IConsistencyCheckResult;

	/** Whether dev-mode warnings are enabled */
	readonly devModeWarnings: boolean;

	/** Toggle dev-mode warnings */
	setDevModeWarnings(enabled: boolean): void;

	/** Get all detected violations */
	getViolations(): readonly IDesignViolation[];

	/** Event: violation detected */
	readonly onDidDetectViolation: Event<IDesignViolation>;

	// ─── Layout Architecture (Task 5) ───────────────────────────────────────

	/** Get all layout rules */
	getLayoutRules(): readonly ILayoutRule[];

	/** Check if a floating panel is allowed in a zone */
	isFloatingPanelAllowed(panelType: string, zone: LayoutZone): boolean;

	/** Get the z-index for a layout layer */
	getZIndex(layer: ZIndex): number;

	/** Validate layout compliance */
	validateLayout(): IConsistencyCheckResult;

	// ─── Information Hierarchy (Task 6) ─────────────────────────────────────

	/** Get the visual style for an information level */
	getInfoLevelStyle(level: InfoLevel): IInfoLevelStyle;

	/** Map a UI element to an information level */
	getInfoLevelMapping(element: string): IInfoLevelMapping | undefined;

	/** Register an element → level mapping */
	registerInfoLevelMapping(element: string, level: InfoLevel, justification: string): void;

	/** Get all registered mappings */
	getAllInfoLevelMappings(): readonly IInfoLevelMapping[];

	// ─── Theme Management (Task 7) ──────────────────────────────────────────

	/** Whether the current theme is dark */
	readonly isDarkTheme: boolean;

	/** Switch to dark theme */
	setDarkTheme(): void;

	/** Switch to light theme */
	setLightTheme(): void;

	/** Get the professional dark theme colors */
	getDarkThemeColors(): Readonly<Record<ColorToken, string>>;

	/** Get the professional light theme colors */
	getLightThemeColors(): Readonly<Record<ColorToken, string>>;

	/** Event: theme changed */
	readonly onDidChangeTheme: Event<IDesignTheme>;

	// ─── Motion System (Task 8) ─────────────────────────────────────────────

	/** Get a motion specification */
	getMotionSpec(duration: MotionDuration, easing?: MotionEasing): IMotionSpec;

	/** Get panel enter/exit motion specs */
	getPanelMotionSpec(): IPanelMotionSpec;

	/** Get standard transition CSS string */
	getTransitionCSS(properties: readonly string[], duration?: MotionDuration, easing?: MotionEasing): string;

	/** Validate a transition duration */
	isValidTransitionDuration(ms: number): boolean;

	// ─── Component Audit (Task 9) ───────────────────────────────────────────

	/** Audit all known components */
	auditComponents(): readonly IComponentAuditResult[];

	/** Audit a specific component */
	auditComponent(componentId: string): IComponentAuditResult;

	/** Get the migration plan for non-compliant components */
	getMigrationPlan(): readonly IComponentAuditResult[];

	// ─── UI Polish (Task 10) ────────────────────────────────────────────────

	/** Get icon rules */
	getIconRules(): readonly IIconRule[];

	/** Get interaction state specification */
	getInteractionStateSpec(): IInteractionStateSpec;

	/** Run a polish pass (normalize spacing, fix icons, reduce noise) */
	runPolishPass(): IPolishPassResult;

	// ─── System-Wide ────────────────────────────────────────────────────────

	/** Get comprehensive design system status */
	getDesignSystemStatus(): IDesignSystemStatus;
}

/**
 * Design system status.
 */
export interface IDesignSystemStatus {
	readonly activeThemeName: string;
	readonly isDark: boolean;
	readonly totalTokens: number;
	readonly totalViolations: number;
	readonly componentComplianceRate: number;
	readonly devModeWarnings: boolean;
	readonly lastAuditAt: number | undefined;
	readonly lastPolishAt: number | undefined;
}
