/*---------------------------------------------------------------------------------------------
 *  Professional UI Design System — Phase 12
 *  Real Vibecode — AI-Native IDE
 *
 *  DesignSystemService — Concrete browser implementation of IDesignSystemService.
 *  Strict visual governance system that transforms the UI from "engineering dashboard"
 *  to "production-grade AI IDE".
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
 *--------------------------------------------------------------------------------------------*/

import { Disposable } from '../../../../base/common/lifecycle.js';
import { Emitter, Event } from '../../../../base/common/event.js';
import {
	IDesignSystemService,
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
// LOCAL TYPES — IDesignMotion (referenced by IDesignTheme but not exported)
// ═══════════════════════════════════════════════════════════════════════════════

interface IDesignMotion {
	readonly defaultDuration: MotionDuration;
	readonly defaultEasing: MotionEasing;
	readonly panelMotionSpec: IPanelMotionSpec;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

/** Standard font stack for the IDE UI — SF Mono / Inter fallback */
const FONT_FAMILY = "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";

/** Monospace font stack — SF Mono first */
const FONT_FAMILY_MONO = "'SF Mono', 'Cascadia Code', 'Fira Code', 'JetBrains Mono', Consolas, monospace";

/** Raw hex color detection pattern — matches #RGB, #RRGGBB, #RRGGBBAA, etc. */
const RAW_HEX_PATTERN = /#[0-9a-fA-F]{3,8}/;

/** Valid z-index values from the hierarchy */
const VALID_Z_INDICES = new Set<number>([
	ZIndex.Base, ZIndex.SidebarOverlay, ZIndex.Dropdown,
	ZIndex.Sticky, ZIndex.ModalBackdrop, ZIndex.Modal,
	ZIndex.Notification, ZIndex.Tooltip, ZIndex.DebugOverlay,
]);

/** All TypographySize values for validation */
const VALID_TYPOGRAPHY_SIZES = new Set<number>([
	TypographySize.Caption, TypographySize.Overline, TypographySize.BodySm,
	TypographySize.Body, TypographySize.BodyLg, TypographySize.Subtitle,
	TypographySize.TitleSm, TypographySize.Title, TypographySize.Heading,
	TypographySize.DisplaySm, TypographySize.Display,
]);

/** All ColorToken string values for reverse-lookup */
const ALL_COLOR_TOKEN_VALUES = new Set<string>(Object.values(ColorToken));

/** Button border radius (4px = Spacing.Xs) */
const BUTTON_BORDER_RADIUS = 4;

/** Panel border radius */
const PANEL_BORDER_RADIUS = 6;

/** Input border radius */
const INPUT_BORDER_RADIUS = 4;

/** Sidebar item height */
const SIDEBAR_ITEM_HEIGHT = 28;

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
		defaultWidth: -1, // fills remaining space
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
// DEFAULT INFO LEVEL MAPPINGS
// ═══════════════════════════════════════════════════════════════════════════════

const DEFAULT_INFO_LEVEL_MAPPINGS: IInfoLevelMapping[] = [
	{ element: 'editor-surface',           level: InfoLevel.Primary,   justification: 'User action surface — primary interaction area' },
	{ element: 'active-input',             level: InfoLevel.Primary,   justification: 'Active input field — user is typing' },
	{ element: 'command-palette',          level: InfoLevel.Primary,   justification: 'Command palette — user action surface' },
	{ element: 'ai-agent-status',          level: InfoLevel.Secondary, justification: 'AI agent executing — feedback on AI actions' },
	{ element: 'mutation-indicator',       level: InfoLevel.Secondary, justification: 'Code mutation indicator — AI change visualization' },
	{ element: 'intent-progress',          level: InfoLevel.Secondary, justification: 'Intent progress — AI understanding feedback' },
	{ element: 'ai-kernel-badge',          level: InfoLevel.Secondary, justification: 'AI kernel status badge — execution state' },
	{ element: 'terminal-output',          level: InfoLevel.Tertiary,  justification: 'Terminal output — diagnostic log' },
	{ element: 'build-status',             level: InfoLevel.Tertiary,  justification: 'Build status — diagnostic feedback' },
	{ element: 'problems-panel',           level: InfoLevel.Tertiary,  justification: 'Problems panel — diagnostic information' },
	{ element: 'output-panel',             level: InfoLevel.Tertiary,  justification: 'Output panel — diagnostic log' },
	{ element: 'timestamp',                level: InfoLevel.Quaternary, justification: 'Timestamp — metadata, not actionable' },
	{ element: 'execution-id',             level: InfoLevel.Quaternary, justification: 'Execution ID — internal debug identifier' },
	{ element: 'internal-state-label',     level: InfoLevel.Quaternary, justification: 'Internal state — debug metadata' },
	{ element: 'version-badge',            level: InfoLevel.Quaternary, justification: 'Version badge — metadata' },
];

// ═══════════════════════════════════════════════════════════════════════════════
// STATUS LEVEL → COLOR TOKEN MAPPINGS
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
// COMPONENT AUDIT RESULTS (static audit for AI execution UI components)
// ═══════════════════════════════════════════════════════════════════════════════

const STATIC_AUDIT_RESULTS: IComponentAuditResult[] = [
	{
		componentId: 'ai-agent-status-bar',
		componentName: 'AIAgentStatusBar',
		source: 'aiExecutionUI',
		compliance: ComponentCompliance.Partial,
		violations: [{
			type: DesignViolationType.RawHexColor,
			severity: ViolationSeverity.Warning,
			description: 'Uses raw hex #818CF8 instead of ColorToken.AiAgentExecuting',
			location: 'aiExecutionUI.ts:agentStatusBadge',
			suggestion: 'Replace #818CF8 with designSystemService.resolveColor(ColorToken.AiAgentExecuting)',
			detectedAt: Date.now(),
		}],
		migrationNotes: 'Replace inline hex colors with design system token resolution. Add hover/focus states.',
		priority: 'high',
	},
	{
		componentId: 'ai-kernel-indicator',
		componentName: 'AIKernelIndicator',
		source: 'aiExecutionUI',
		compliance: ComponentCompliance.Partial,
		violations: [{
			type: DesignViolationType.MissingInteractionState,
			severity: ViolationSeverity.Warning,
			description: 'Missing hover state on kernel indicator',
			location: 'aiExecutionUI.ts:kernelBadge',
			suggestion: 'Add hover background using SurfaceHover token',
			detectedAt: Date.now(),
		}],
		migrationNotes: 'Add hover/focus interaction states. Use SurfaceHover/SurfaceActive tokens.',
		priority: 'medium',
	},
	{
		componentId: 'mutation-annotation-gutter',
		componentName: 'MutationAnnotationGutter',
		source: 'aiExecutionUI',
		compliance: ComponentCompliance.Partial,
		violations: [{
			type: DesignViolationType.RawHexColor,
			severity: ViolationSeverity.Warning,
			description: 'Uses raw hex rgba(129,140,248,0.10) instead of ColorToken.AiMutationAnnotation',
			location: 'aiExecutionUI.ts:mutationGutter',
			suggestion: 'Replace with designSystemService.resolveColor(ColorToken.AiMutationAnnotation)',
			detectedAt: Date.now(),
		}],
		migrationNotes: 'Replace inline rgba with AiMutationAnnotation token. Normalize padding to 4px grid.',
		priority: 'medium',
	},
	{
		componentId: 'intent-progress-bar',
		componentName: 'IntentProgressBar',
		source: 'aiExecutionUI',
		compliance: ComponentCompliance.Compliant,
		violations: [],
		migrationNotes: 'Already uses semantic tokens. No migration needed.',
		priority: 'low',
	},
	{
		componentId: 'execution-log-panel',
		componentName: 'ExecutionLogPanel',
		source: 'aiExecutionUI',
		compliance: ComponentCompliance.Replace,
		violations: [
			{
				type: DesignViolationType.SpacingViolation,
				severity: ViolationSeverity.Error,
				description: 'Uses 7px padding — not a multiple of 4px (SPACING_BASE)',
				location: 'aiExecutionUI.ts:logPanel',
				suggestion: 'Change padding to 8px (Spacing.Sm)',
				detectedAt: Date.now(),
			},
			{
				type: DesignViolationType.InconsistentFont,
				severity: ViolationSeverity.Error,
				description: 'Uses 13.5px font size — not in typography scale',
				location: 'aiExecutionUI.ts:logEntry',
				suggestion: 'Use TypographySize.Body (13px) or TypographySize.BodyLg (14px)',
				detectedAt: Date.now(),
			},
		],
		migrationNotes: 'Full refactor required: normalize spacing to 4px grid, replace non-standard font sizes, add design tokens.',
		priority: 'critical',
	},
	{
		componentId: 'ai-context-sidebar',
		componentName: 'AIContextSidebar',
		source: 'aiContextUI',
		compliance: ComponentCompliance.Partial,
		violations: [{
			type: DesignViolationType.SpacingViolation,
			severity: ViolationSeverity.Warning,
			description: 'Uses 15px padding — not a multiple of 4px',
			location: 'aiContextUI.ts:contextPanel',
			suggestion: 'Change padding to 16px (Spacing.Md)',
			detectedAt: Date.now(),
		}],
		migrationNotes: 'Normalize padding to 16px. Add hover states using SurfaceHover token.',
		priority: 'high',
	},
	{
		componentId: 'process-status-badge',
		componentName: 'ProcessStatusBadge',
		source: 'aiProcessUI',
		compliance: ComponentCompliance.Partial,
		violations: [{
			type: DesignViolationType.InvalidElevation,
			severity: ViolationSeverity.Info,
			description: 'Uses custom box-shadow not in elevation system',
			location: 'aiProcessUI.ts:statusBadge',
			suggestion: 'Use Elevation.Level1 shadow token via designSystemService.getElevationShadow(Elevation.Level1)',
			detectedAt: Date.now(),
		}],
		migrationNotes: 'Replace custom shadow with elevation token. Use StatusLevel token colors.',
		priority: 'medium',
	},
	{
		componentId: 'brain-dashboard-panel',
		componentName: 'BrainDashboardPanel',
		source: 'brainDashboard',
		compliance: ComponentCompliance.Replace,
		violations: [
			{
				type: DesignViolationType.RawHexColor,
				severity: ViolationSeverity.Error,
				description: 'Uses multiple raw hex colors (#1a1a2e, #16213e, #0f3460) instead of semantic tokens',
				location: 'brainDashboard.ts:dashboardRoot',
				suggestion: 'Use BackgroundPrimary, BackgroundSecondary, BackgroundTertiary tokens',
				detectedAt: Date.now(),
			},
			{
				type: DesignViolationType.InvalidZIndex,
				severity: ViolationSeverity.Warning,
				description: 'Uses z-index: 9999 — not in z-index hierarchy',
				location: 'brainDashboard.ts:overlay',
				suggestion: 'Use ZIndex.Modal (500) or ZIndex.Notification (600)',
				detectedAt: Date.now(),
			},
		],
		migrationNotes: 'Full refactor: replace all raw hex with tokens, fix z-index, normalize spacing.',
		priority: 'critical',
	},
	{
		componentId: 'graph-view-canvas',
		componentName: 'GraphViewCanvas',
		source: 'executionGraph',
		compliance: ComponentCompliance.Compliant,
		violations: [],
		migrationNotes: 'Uses proper token system. No migration needed.',
		priority: 'low',
	},
	{
		componentId: 'agent-timeline',
		componentName: 'AgentTimeline',
		source: 'agentUI',
		compliance: ComponentCompliance.Partial,
		violations: [{
			type: DesignViolationType.MissingInteractionState,
			severity: ViolationSeverity.Warning,
			description: 'Timeline nodes missing focus-visible outline',
			location: 'agentUI.ts:timelineNode',
			suggestion: 'Add focus outline using BorderAccent token with 2px width',
			detectedAt: Date.now(),
		}],
		migrationNotes: 'Add focus-visible styles. Use BorderAccent for focus ring.',
		priority: 'high',
	},
];

// ═══════════════════════════════════════════════════════════════════════════════
// ICON RULES
// ═══════════════════════════════════════════════════════════════════════════════

const ICON_RULES: IIconRule[] = [
	{ context: 'sidebar-navigation',  size: IconSize.Lg, color: ColorToken.TextSecondary },
	{ context: 'sidebar-item',        size: IconSize.Md, color: ColorToken.TextSecondary },
	{ context: 'toolbar-action',      size: IconSize.Md, color: ColorToken.TextSecondary },
	{ context: 'status-indicator',    size: IconSize.Sm, color: ColorToken.TextPrimary },
	{ context: 'ai-badge',            size: IconSize.Sm, color: ColorToken.AiKernelActive },
	{ context: 'inline-icon',         size: IconSize.Sm, color: ColorToken.TextTertiary },
	{ context: 'panel-header',        size: IconSize.Md, color: ColorToken.TextPrimary },
	{ context: 'notification-icon',   size: IconSize.Lg, color: ColorToken.StatusInfo },
	{ context: 'command-palette',     size: IconSize.Md, color: ColorToken.TextSecondary },
	{ context: 'breadcrumb',          size: IconSize.Sm, color: ColorToken.TextTertiary },
	{ context: 'editor-gutter',       size: IconSize.Sm, color: ColorToken.TextTertiary },
	{ context: 'mutation-gutter',     size: IconSize.Sm, color: ColorToken.AiMutationAnnotation },
];

// ═══════════════════════════════════════════════════════════════════════════════
// MOTION SYSTEM — DEFAULT PANEL MOTION
// ═══════════════════════════════════════════════════════════════════════════════

const DEFAULT_PANEL_MOTION: IPanelMotionSpec = {
	enter: { duration: MotionDuration.Normal, easing: MotionEasing.EaseOut, delay: 0 },
	exit:  { duration: MotionDuration.Fast,   easing: MotionEasing.EaseIn,  delay: 0 },
	resize: { duration: MotionDuration.Fast,  easing: MotionEasing.EaseInOut, delay: 0 },
};

// ═══════════════════════════════════════════════════════════════════════════════
// DesignSystemService
// ═══════════════════════════════════════════════════════════════════════════════

export class DesignSystemService extends Disposable implements IDesignSystemService {

	declare readonly _serviceBrand: undefined;

	// ─── Theme State ─────────────────────────────────────────────────────────────

	private _isDark: boolean = true;
	private _currentColors: Readonly<Record<ColorToken, string>> = PROFESSIONAL_DARK_THEME;

	// ─── Typography Config ──────────────────────────────────────────────────────

	private readonly _typography: IDesignTypography = {
		fontFamily: FONT_FAMILY,
		fontFamilyMono: FONT_FAMILY_MONO,
		sizes: TYPOGRAPHY_SPECS,
	};

	// ─── Motion Config ──────────────────────────────────────────────────────────

	private readonly _motion: IDesignMotion = {
		defaultDuration: MotionDuration.Normal,
		defaultEasing: MotionEasing.Default,
		panelMotionSpec: DEFAULT_PANEL_MOTION,
	};

	// ─── Consistency Enforcer State ─────────────────────────────────────────────

	private _devModeWarnings: boolean = false;
	private _violations: IDesignViolation[] = [];
	private readonly _elementRegistry = new Map<string, Record<string, string>>();

	// ─── Information Hierarchy State ─────────────────────────────────────────────

	private readonly _infoLevelMappings = new Map<string, IInfoLevelMapping>();

	// ─── Audit / Polish State ───────────────────────────────────────────────────

	private _lastAuditAt: number | undefined;
	private _lastPolishAt: number | undefined;

	// ─── Events ─────────────────────────────────────────────────────────────────

	private readonly _onDidDetectViolation = this._register(new Emitter<IDesignViolation>());
	readonly onDidDetectViolation: Event<IDesignViolation> = this._onDidDetectViolation.event;

	private readonly _onDidChangeTheme = this._register(new Emitter<IDesignTheme>());
	readonly onDidChangeTheme: Event<IDesignTheme> = this._onDidChangeTheme.event;

	// ─── Constructor ─────────────────────────────────────────────────────────────

	constructor() {
		super();

		// Seed info-level mappings with defaults
		for (const mapping of DEFAULT_INFO_LEVEL_MAPPINGS) {
			this._infoLevelMappings.set(mapping.element, mapping);
		}
	}

	// ═══════════════════════════════════════════════════════════════════════════════
	// TASK 1 — DESIGN SYSTEM CORE
	// ═══════════════════════════════════════════════════════════════════════════════

	get activeTheme(): IDesignTheme {
		return this._buildTheme();
	}

	getSpacing(spacing: Spacing): number {
		return spacing; // Spacing enum values are already pixel values
	}

	isValidSpacing(px: number): boolean {
		if (px < 0) { return false; }
		return px % SPACING_BASE === 0;
	}

	getTypographySpec(size: TypographySize): ITypographySpec {
		const spec = TYPOGRAPHY_SPECS[size];
		if (!spec) {
			// Fallback: return Body spec if unknown size requested
			return TYPOGRAPHY_SPECS[TypographySize.Body];
		}
		return spec;
	}

	getElevationShadow(level: Elevation): string {
		return ELEVATION_SHADOWS[level] ?? 'none';
	}

	getLayoutRule(zone: LayoutZone): ILayoutRule {
		const rule = LAYOUT_RULES[zone];
		if (!rule) {
			// Fallback: return a minimal rule
			return {
				zone,
				minWidth: 0,
				maxWidth: undefined,
				defaultWidth: 0,
				resizable: false,
				allowedPanelTypes: [],
				allowsFloating: false,
				allowsOverlap: false,
				zIndex: ZIndex.Base,
			};
		}
		return rule;
	}

	// ═══════════════════════════════════════════════════════════════════════════════
	// TASK 2 — VISUAL LANGUAGE (Semantic Color Tokens)
	// ═══════════════════════════════════════════════════════════════════════════════

	resolveColor(token: ColorToken): string {
		const value = this._currentColors[token];
		if (value === undefined) {
			// If token not found, return a visible fallback
			return this._isDark ? '#FF0000' : '#FF0000';
		}
		return value;
	}

	resolveColorAlpha(token: ColorToken, alpha: number): string {
		const hex = this.resolveColor(token);

		// If already rgba, modify alpha
		const rgbaMatch = hex.match(/^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*,\s*([\d.]+))?\)$/);
		if (rgbaMatch) {
			return `rgba(${rgbaMatch[1]},${rgbaMatch[2]},${rgbaMatch[3]},${alpha})`;
		}

		// If hex, convert to rgba with alpha
		const hexClean = hex.replace('#', '');
		if (hexClean.length === 3) {
			const r = parseInt(hexClean[0] + hexClean[0], 16);
			const g = parseInt(hexClean[1] + hexClean[1], 16);
			const b = parseInt(hexClean[2] + hexClean[2], 16);
			return `rgba(${r},${g},${b},${alpha})`;
		}
		if (hexClean.length >= 6) {
			const r = parseInt(hexClean.substring(0, 2), 16);
			const g = parseInt(hexClean.substring(2, 4), 16);
			const b = parseInt(hexClean.substring(4, 6), 16);
			return `rgba(${r},${g},${b},${alpha})`;
		}

		// Fallback
		return `rgba(0,0,0,${alpha})`;
	}

	getAllColorResolutions(): readonly IColorTokenResolution[] {
		const results: IColorTokenResolution[] = [];
		const allTokens = Object.values(ColorToken) as string[];
		for (const tokenStr of allTokens) {
			const token = tokenStr as ColorToken;
			results.push({
				token,
				value: this.resolveColor(token),
				isDark: this._isDark,
			});
		}
		return results;
	}

	isKnownColor(hex: string): boolean {
		const normalized = hex.toLowerCase();
		for (const value of Object.values(this._currentColors)) {
			if (value.toLowerCase() === normalized) {
				return true;
			}
		}
		return false;
	}

	isRawHexViolation(value: string): boolean {
		// If the value matches a raw hex pattern, it's a violation
		// because all colors should come from semantic tokens
		return RAW_HEX_PATTERN.test(value);
	}

	// ═══════════════════════════════════════════════════════════════════════════════
	// TASK 3 — COMPONENT DESIGN TOKENS
	// ═══════════════════════════════════════════════════════════════════════════════

	getButtonTokens(variant: ButtonVariant, size: ButtonSize): IButtonTokens {
		// Size-based padding and font
		const sizeConfig = this._getButtonSizeConfig(size);

		// Variant-based colors
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
					backgroundColor: ColorToken.AccentPrimary,
					textColor: ColorToken.TextInverted,
					borderColor: ColorToken.AccentPrimary,
					hoverBackgroundColor: ColorToken.AccentStrong,
					hoverTextColor: ColorToken.TextInverted,
					activeBackgroundColor: ColorToken.AccentMuted,
					elevation: Elevation.Level1,
				};
			case ButtonVariant.Secondary:
				return {
					backgroundColor: ColorToken.SurfacePrimary,
					textColor: ColorToken.TextPrimary,
					borderColor: ColorToken.BorderDefault,
					hoverBackgroundColor: ColorToken.SurfaceHover,
					hoverTextColor: ColorToken.TextPrimary,
					activeBackgroundColor: ColorToken.SurfaceActive,
					elevation: Elevation.Level0,
				};
			case ButtonVariant.Ghost:
				return {
					backgroundColor: ColorToken.BackgroundPrimary, // transparent-like
					textColor: ColorToken.TextSecondary,
					borderColor: ColorToken.BackgroundPrimary, // no visible border
					hoverBackgroundColor: ColorToken.SurfaceHover,
					hoverTextColor: ColorToken.TextPrimary,
					activeBackgroundColor: ColorToken.SurfaceActive,
					elevation: Elevation.Level0,
				};
			case ButtonVariant.Danger:
				return {
					backgroundColor: ColorToken.StatusError,
					textColor: ColorToken.TextInverted,
					borderColor: ColorToken.StatusError,
					hoverBackgroundColor: ColorToken.StatusError,
					hoverTextColor: ColorToken.TextInverted,
					activeBackgroundColor: ColorToken.StatusError,
					elevation: Elevation.Level1,
				};
		}
	}

	getPanelTokens(variant: PanelVariant): IPanelTokens {
		switch (variant) {
			case PanelVariant.Flat:
				return {
					variant: PanelVariant.Flat,
					backgroundColor: ColorToken.SurfacePrimary,
					borderColor: ColorToken.BorderSubtle,
					borderRadius: PANEL_BORDER_RADIUS,
					padding: Spacing.Md,
					elevation: Elevation.Level0,
					headerFontSize: TypographySize.Subtitle,
					headerFontWeight: FontWeight.SemiBold,
					headerPadding: Spacing.Md,
					bodyPadding: Spacing.Md,
				};
			case PanelVariant.Raised:
				return {
					variant: PanelVariant.Raised,
					backgroundColor: ColorToken.SurfacePrimary,
					borderColor: ColorToken.BorderDefault,
					borderRadius: PANEL_BORDER_RADIUS,
					padding: Spacing.Md,
					elevation: Elevation.Level1,
					headerFontSize: TypographySize.Subtitle,
					headerFontWeight: FontWeight.SemiBold,
					headerPadding: Spacing.Md,
					bodyPadding: Spacing.Md,
				};
			case PanelVariant.Elevated:
				return {
					variant: PanelVariant.Elevated,
					backgroundColor: ColorToken.SurfacePrimary,
					borderColor: ColorToken.BorderDefault,
					borderRadius: PANEL_BORDER_RADIUS,
					padding: Spacing.MdLg,
					elevation: Elevation.Level2,
					headerFontSize: TypographySize.Subtitle,
					headerFontWeight: FontWeight.SemiBold,
					headerPadding: Spacing.MdLg,
					bodyPadding: Spacing.Md,
				};
			case PanelVariant.Overlay:
				return {
					variant: PanelVariant.Overlay,
					backgroundColor: ColorToken.BackgroundOverlay,
					borderColor: ColorToken.BorderDefault,
					borderRadius: PANEL_BORDER_RADIUS,
					padding: Spacing.Lg,
					elevation: Elevation.Level3,
					headerFontSize: TypographySize.TitleSm,
					headerFontWeight: FontWeight.SemiBold,
					headerPadding: Spacing.Lg,
					bodyPadding: Spacing.MdLg,
				};
		}
	}

	getInputTokens(): IInputTokens {
		return {
			backgroundColor: ColorToken.SurfacePrimary,
			textColor: ColorToken.TextPrimary,
			borderColor: ColorToken.BorderDefault,
			focusBorderColor: ColorToken.BorderAccent,
			placeholderColor: ColorToken.TextTertiary,
			borderRadius: INPUT_BORDER_RADIUS,
			paddingX: Spacing.Sm,
			paddingY: Spacing.Xs,
			fontSize: TypographySize.Body,
			elevation: Elevation.Level0,
		};
	}

	getSidebarTokens(): ISidebarTokens {
		return {
			backgroundColor: ColorToken.BackgroundSecondary,
			borderColor: ColorToken.BorderDefault,
			width: LayoutGrid.SecondarySidebarDefaultWidth,
			itemHeight: SIDEBAR_ITEM_HEIGHT,
			itemPaddingX: Spacing.Sm,
			itemPaddingY: Spacing.Xs,
			itemFontSize: TypographySize.BodySm,
			itemHoverColor: ColorToken.SurfaceHover,
			itemActiveColor: ColorToken.SurfaceActive,
			itemSelectedColor: ColorToken.SurfaceSelected,
			sectionHeaderFontSize: TypographySize.Overline,
			sectionHeaderFontWeight: FontWeight.SemiBold,
		};
	}

	getStatusIndicatorTokens(level: StatusLevel): IStatusIndicatorTokens {
		const tokenMap = STATUS_TOKEN_MAP[level];
		if (!tokenMap) {
			// Fallback to Info
			return {
				level,
				color: ColorToken.TextTertiary,
				backgroundColor: ColorToken.BackgroundTertiary,
				fontSize: TypographySize.Caption,
				size: 8,
			};
		}
		return {
			level,
			color: tokenMap.color,
			backgroundColor: tokenMap.backgroundColor,
			fontSize: TypographySize.Caption,
			size: level === StatusLevel.Active ? 10 : 8,
		};
	}

	// ═══════════════════════════════════════════════════════════════════════════════
	// TASK 4 — UI CONSISTENCY ENFORCER
	// ═══════════════════════════════════════════════════════════════════════════════

	runConsistencyCheck(): IConsistencyCheckResult {
		const startTime = Date.now();
		const violations: IDesignViolation[] = [];

		// Scan all registered elements
		for (const [elementId, styles] of this._elementRegistry) {
			violations.push(...this._scanStylesForViolations(elementId, styles));
		}

		// Update stored violations
		this._violations = violations;

		const errorCount = violations.filter(v => v.severity === ViolationSeverity.Error).length;
		const warningCount = violations.filter(v => v.severity === ViolationSeverity.Warning).length;
		const infoCount = violations.filter(v => v.severity === ViolationSeverity.Info).length;

		return {
			violations,
			errorCount,
			warningCount,
			infoCount,
			passed: errorCount === 0,
			checkedAt: Date.now(),
			durationMs: Date.now() - startTime,
		};
	}

	checkElement(elementId: string): IConsistencyCheckResult {
		const startTime = Date.now();
		const styles = this._elementRegistry.get(elementId);

		let violations: IDesignViolation[];
		if (styles) {
			violations = this._scanStylesForViolations(elementId, styles);
		} else {
			// Element not registered — report as info
			violations = [{
				type: DesignViolationType.UnauthorizedInlineStyle,
				severity: ViolationSeverity.Info,
				description: `Element "${elementId}" not registered for design checking`,
				location: elementId,
				suggestion: 'Register the element using registerElementForCheck() before checking',
				detectedAt: Date.now(),
			}];
		}

		const errorCount = violations.filter(v => v.severity === ViolationSeverity.Error).length;
		const warningCount = violations.filter(v => v.severity === ViolationSeverity.Warning).length;
		const infoCount = violations.filter(v => v.severity === ViolationSeverity.Info).length;

		return {
			violations,
			errorCount,
			warningCount,
			infoCount,
			passed: errorCount === 0,
			checkedAt: Date.now(),
			durationMs: Date.now() - startTime,
		};
	}

	get devModeWarnings(): boolean {
		return this._devModeWarnings;
	}

	setDevModeWarnings(enabled: boolean): void {
		this._devModeWarnings = enabled;
	}

	getViolations(): readonly IDesignViolation[] {
		return this._violations;
	}

	/**
	 * Register an element for consistency checking.
	 * The styles record should contain CSS property→value pairs.
	 */
	registerElementForCheck(elementId: string, styles: Record<string, string>): void {
		this._elementRegistry.set(elementId, styles);

		// Immediately scan and fire violations if dev mode is on
		if (this._devModeWarnings) {
			const violations = this._scanStylesForViolations(elementId, styles);
			for (const violation of violations) {
				this._onDidDetectViolation.fire(violation);
			}
		}
	}

	/**
	 * Internal: scan a style record for design violations.
	 */
	private _scanStylesForViolations(elementId: string, styles: Record<string, string>): IDesignViolation[] {
		const violations: IDesignViolation[] = [];
		const now = Date.now();

		for (const [property, value] of Object.entries(styles)) {
			// ─── Raw hex detection ────────────────────────────────────────────
			if (RAW_HEX_PATTERN.test(value)) {
				// Check if this hex is a known theme color — if so, it's still a violation
				// because the code should use tokens, not raw hex values
				if (!this.isKnownColor(value)) {
					violations.push({
						type: DesignViolationType.RawHexColor,
						severity: ViolationSeverity.Error,
						description: `Raw hex color "${value}" used for ${property} — not a design token`,
						location: elementId,
						suggestion: `Use designSystemService.resolveColor(ColorToken.xxx) instead of raw hex`,
						detectedAt: now,
					});
				} else {
					violations.push({
						type: DesignViolationType.RawHexColor,
						severity: ViolationSeverity.Warning,
						description: `Known hex color "${value}" used for ${property} — use semantic token instead`,
						location: elementId,
						suggestion: `This hex matches a theme token but should be referenced via ColorToken enum`,
						detectedAt: now,
					});
				}
			}

			// ─── Spacing violation detection ──────────────────────────────────
			if (this._isSpacingProperty(property)) {
				const pxMatch = value.match(/^([\d.]+)px$/);
				if (pxMatch) {
					const px = parseFloat(pxMatch[1]);
					if (!this.isValidSpacing(px)) {
						violations.push({
							type: DesignViolationType.SpacingViolation,
							severity: ViolationSeverity.Error,
							description: `${property}: ${value} is not a multiple of ${SPACING_BASE}px (SPACING_BASE)`,
							location: elementId,
							suggestion: `Use a spacing value that is a multiple of ${SPACING_BASE}px (e.g. ${Math.round(px / SPACING_BASE) * SPACING_BASE}px or ${Math.ceil(px / SPACING_BASE) * SPACING_BASE}px)`,
							detectedAt: now,
						});
					}
				}
			}

			// ─── Font size violation detection ────────────────────────────────
			if (property === 'font-size') {
				const pxMatch = value.match(/^([\d.]+)px$/);
				if (pxMatch) {
					const px = parseFloat(pxMatch[1]);
					if (!VALID_TYPOGRAPHY_SIZES.has(px)) {
						violations.push({
							type: DesignViolationType.InconsistentFont,
							severity: ViolationSeverity.Warning,
							description: `font-size: ${value} is not in the typography scale`,
							location: elementId,
							suggestion: `Use a standard typography size: ${Array.from(VALID_TYPOGRAPHY_SIZES).sort((a, b) => a - b).join(', ')} px`,
							detectedAt: now,
						});
					}
				}
			}

			// ─── Z-index violation detection ─────────────────────────────────
			if (property === 'z-index') {
				const zIndex = parseInt(value, 10);
				if (!isNaN(zIndex) && !VALID_Z_INDICES.has(zIndex)) {
					violations.push({
						type: DesignViolationType.InvalidZIndex,
						severity: ViolationSeverity.Warning,
						description: `z-index: ${value} is not in the z-index hierarchy`,
						location: elementId,
						suggestion: `Use a standard z-index value: ${Array.from(VALID_Z_INDICES).sort((a, b) => a - b).join(', ')}`,
						detectedAt: now,
					});
				}
			}

			// ─── Box-shadow / elevation violation detection ───────────────────
			if (property === 'box-shadow') {
				if (value !== 'none' && !Object.values(ELEVATION_SHADOWS).includes(value)) {
					violations.push({
						type: DesignViolationType.InvalidElevation,
						severity: ViolationSeverity.Warning,
						description: `box-shadow is not from the elevation system`,
						location: elementId,
						suggestion: `Use designSystemService.getElevationShadow(Elevation.Level0-3) for standard shadows`,
						detectedAt: now,
					});
				}
			}
		}

		// Store violations
		this._violations.push(...violations);

		return violations;
	}

	/**
	 * Check if a CSS property is spacing-related.
	 */
	private _isSpacingProperty(property: string): boolean {
		const spacingProps = [
			'margin', 'margin-top', 'margin-right', 'margin-bottom', 'margin-left',
			'padding', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
			'gap', 'row-gap', 'column-gap',
			'top', 'right', 'bottom', 'left',
			'width', 'height', 'min-width', 'min-height',
		];
		return spacingProps.includes(property.toLowerCase());
	}

	// ═══════════════════════════════════════════════════════════════════════════════
	// TASK 5 — LAYOUT ARCHITECTURE
	// ═══════════════════════════════════════════════════════════════════════════════

	getLayoutRules(): readonly ILayoutRule[] {
		return Object.values(LAYOUT_RULES);
	}

	isFloatingPanelAllowed(panelType: string, zone: LayoutZone): boolean {
		const permission = FLOATING_PANEL_PERMISSIONS.find(p => p.panelType === panelType);
		if (!permission) {
			return false; // Unknown panel types are not allowed to float
		}
		if (!permission.allowed) {
			return false;
		}
		return permission.allowedZones.includes(zone);
	}

	getZIndex(layer: ZIndex): number {
		return layer; // ZIndex enum values are already the numeric z-index values
	}

	validateLayout(): IConsistencyCheckResult {
		const startTime = Date.now();
		const violations: IDesignViolation[] = [];
		const now = Date.now();

		// Check for layout violations in registered elements
		for (const [elementId, styles] of this._elementRegistry) {
			// Check z-index compliance
			if (styles['z-index']) {
				const zIndex = parseInt(styles['z-index'], 10);
				if (!isNaN(zIndex) && !VALID_Z_INDICES.has(zIndex)) {
					violations.push({
						type: DesignViolationType.InvalidZIndex,
						severity: ViolationSeverity.Error,
						description: `Element uses z-index ${zIndex} which is not in the hierarchy`,
						location: elementId,
						suggestion: 'Use a z-index from the ZIndex enum',
						detectedAt: now,
					});
				}
			}

			// Check position compliance (no absolute/fixed unless in allowed zones)
			if (styles['position'] === 'fixed' || styles['position'] === 'absolute') {
				violations.push({
					type: DesignViolationType.UnauthorizedInlineStyle,
					severity: ViolationSeverity.Warning,
					description: `Element uses position:${styles['position']} — verify it's in an allowed zone`,
					location: elementId,
					suggestion: 'Only use fixed/absolute positioning in zones that allow floating panels',
					detectedAt: now,
				});
			}
		}

		const errorCount = violations.filter(v => v.severity === ViolationSeverity.Error).length;
		const warningCount = violations.filter(v => v.severity === ViolationSeverity.Warning).length;
		const infoCount = violations.filter(v => v.severity === ViolationSeverity.Info).length;

		return {
			violations,
			errorCount,
			warningCount,
			infoCount,
			passed: errorCount === 0,
			checkedAt: Date.now(),
			durationMs: Date.now() - startTime,
		};
	}

	// ═══════════════════════════════════════════════════════════════════════════════
	// TASK 6 — INFORMATION HIERARCHY
	// ═══════════════════════════════════════════════════════════════════════════════

	getInfoLevelStyle(level: InfoLevel): IInfoLevelStyle {
		const style = INFO_LEVEL_STYLES[level];
		if (!style) {
			// Fallback to Quaternary
			return INFO_LEVEL_STYLES[InfoLevel.Quaternary];
		}
		return style;
	}

	getInfoLevelMapping(element: string): IInfoLevelMapping | undefined {
		return this._infoLevelMappings.get(element);
	}

	registerInfoLevelMapping(element: string, level: InfoLevel, justification: string): void {
		this._infoLevelMappings.set(element, { element, level, justification });
	}

	getAllInfoLevelMappings(): readonly IInfoLevelMapping[] {
		return Array.from(this._infoLevelMappings.values());
	}

	// ═══════════════════════════════════════════════════════════════════════════════
	// TASK 7 — THEME MANAGEMENT
	// ═══════════════════════════════════════════════════════════════════════════════

	get isDarkTheme(): boolean {
		return this._isDark;
	}

	setDarkTheme(): void {
		if (this._isDark) { return; }
		this._isDark = true;
		this._currentColors = PROFESSIONAL_DARK_THEME;
		this._onDidChangeTheme.fire(this._buildTheme());
	}

	setLightTheme(): void {
		if (!this._isDark) { return; }
		this._isDark = false;
		this._currentColors = PROFESSIONAL_LIGHT_THEME;
		this._onDidChangeTheme.fire(this._buildTheme());
	}

	getDarkThemeColors(): Readonly<Record<ColorToken, string>> {
		return PROFESSIONAL_DARK_THEME;
	}

	getLightThemeColors(): Readonly<Record<ColorToken, string>> {
		return PROFESSIONAL_LIGHT_THEME;
	}

	/**
	 * Build the current IDesignTheme object.
	 */
	private _buildTheme(): IDesignTheme {
		return {
			name: this._isDark ? 'Professional Dark' : 'Professional Light',
			isDark: this._isDark,
			colors: this._currentColors,
			typography: this._typography,
			motion: this._motion,
		};
	}

	// ═══════════════════════════════════════════════════════════════════════════════
	// TASK 8 — MOTION DESIGN SYSTEM
	// ═══════════════════════════════════════════════════════════════════════════════

	getMotionSpec(duration: MotionDuration, easing?: MotionEasing): IMotionSpec {
		return {
			duration,
			easing: easing ?? MotionEasing.Default,
			delay: 0,
		};
	}

	getPanelMotionSpec(): IPanelMotionSpec {
		return DEFAULT_PANEL_MOTION;
	}

	getTransitionCSS(properties: readonly string[], duration?: MotionDuration, easing?: MotionEasing): string {
		const dur = duration ?? MotionDuration.Normal;
		const ease = easing ?? MotionEasing.Default;

		return properties
			.map(prop => `${prop} ${dur}ms ${ease}`)
			.join(', ');
	}

	isValidTransitionDuration(ms: number): boolean {
		return ms === MotionDuration.Fast
			|| ms === MotionDuration.Normal
			|| ms === MotionDuration.Slow
			|| ms === MotionDuration.Page;
	}

	// ═══════════════════════════════════════════════════════════════════════════════
	// TASK 9 — COMPONENT REFACTOR AUDIT
	// ═══════════════════════════════════════════════════════════════════════════════

	auditComponents(): readonly IComponentAuditResult[] {
		this._lastAuditAt = Date.now();
		return STATIC_AUDIT_RESULTS;
	}

	auditComponent(componentId: string): IComponentAuditResult {
		this._lastAuditAt = Date.now();
		const result = STATIC_AUDIT_RESULTS.find(r => r.componentId === componentId);
		if (result) {
			return result;
		}
		// Return an unknown component result
		return {
			componentId,
			componentName: componentId,
			source: 'unknown',
			compliance: ComponentCompliance.Replace,
			violations: [{
				type: DesignViolationType.UnauthorizedInlineStyle,
				severity: ViolationSeverity.Error,
				description: `Component "${componentId}" not found in audit registry`,
				location: componentId,
				suggestion: 'Register the component for auditing or verify the component ID',
				detectedAt: Date.now(),
			}],
			migrationNotes: 'Unknown component — full design system review required.',
			priority: 'medium',
		};
	}

	getMigrationPlan(): readonly IComponentAuditResult[] {
		// Return only non-compliant components, sorted by priority
		const priorityOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
		return STATIC_AUDIT_RESULTS
			.filter(r => r.compliance !== ComponentCompliance.Compliant)
			.sort((a, b) => (priorityOrder[a.priority] ?? 99) - (priorityOrder[b.priority] ?? 99));
	}

	// ═══════════════════════════════════════════════════════════════════════════════
	// TASK 10 — UI POLISH LAYER
	// ═══════════════════════════════════════════════════════════════════════════════

	getIconRules(): readonly IIconRule[] {
		return ICON_RULES;
	}

	getInteractionStateSpec(): IInteractionStateSpec {
		return {
			hoverBackgroundColor: ColorToken.SurfaceHover,
			hoverBorderColor: ColorToken.BorderDefault,
			focusBorderColor: ColorToken.BorderAccent,
			focusOutlineColor: ColorToken.AccentPrimary,
			focusOutlineWidth: 2,
			focusOutlineOffset: 2,
			activeBackgroundColor: ColorToken.SurfaceActive,
			transitionDuration: MotionDuration.Fast,
			transitionEasing: MotionEasing.Default,
		};
	}

	runPolishPass(): IPolishPassResult {
		const now = Date.now();

		// Count normalization passes based on registered elements
		let spacingNormalizations = 0;
		let iconCorrections = 0;
		let alignmentCorrections = 0;
		let noiseReductions = 0;
		let interactionStateFixes = 0;

		for (const [elementId, styles] of this._elementRegistry) {
			// Count spacing violations that would be normalized
			for (const [property, value] of Object.entries(styles)) {
				if (this._isSpacingProperty(property)) {
					const pxMatch = value.match(/^([\d.]+)px$/);
					if (pxMatch) {
						const px = parseFloat(pxMatch[1]);
						if (!this.isValidSpacing(px) && px > 0) {
							spacingNormalizations++;
						}
					}
				}

				// Count font-size normalizations
				if (property === 'font-size') {
					const pxMatch = value.match(/^([\d.]+)px$/);
					if (pxMatch) {
						const px = parseFloat(pxMatch[1]);
						if (!VALID_TYPOGRAPHY_SIZES.has(px)) {
							alignmentCorrections++;
						}
					}
				}

				// Count raw hex noise
				if (RAW_HEX_PATTERN.test(value)) {
					noiseReductions++;
				}
			}

			// Count missing interaction states
			const hasHover = 'hover' in styles || ':hover' in styles || styles['cursor'] === 'pointer';
			const hasFocus = 'focus' in styles || ':focus' in styles || 'outline' in styles;
			if (!hasHover || !hasFocus) {
				interactionStateFixes++;
			}

			// Count icon corrections (elements with icon- prefix or icon-related)
			if (elementId.includes('icon') || elementId.includes('Icon')) {
				iconCorrections++;
			}
		}

		// Also account for audited component findings
		const auditResults = this.auditComponents();
		for (const result of auditResults) {
			if (result.compliance !== ComponentCompliance.Compliant) {
				for (const violation of result.violations) {
					if (violation.type === DesignViolationType.SpacingViolation) {
						spacingNormalizations++;
					} else if (violation.type === DesignViolationType.InconsistentFont) {
						alignmentCorrections++;
					} else if (violation.type === DesignViolationType.RawHexColor) {
						noiseReductions++;
					} else if (violation.type === DesignViolationType.MissingInteractionState) {
						interactionStateFixes++;
					}
				}
			}
		}

		this._lastPolishAt = now;

		const totalChanges = spacingNormalizations + iconCorrections + alignmentCorrections + noiseReductions + interactionStateFixes;

		return {
			spacingNormalizations,
			iconCorrections,
			alignmentCorrections,
			noiseReductions,
			interactionStateFixes,
			totalChanges,
			completedAt: now,
		};
	}

	// ═══════════════════════════════════════════════════════════════════════════════
	// SYSTEM-WIDE
	// ═══════════════════════════════════════════════════════════════════════════════

	getDesignSystemStatus(): IDesignSystemStatus {
		const allTokens = Object.values(ColorToken) as string[];
		const auditResults = this.auditComponents();
		const compliantCount = auditResults.filter(r => r.compliance === ComponentCompliance.Compliant).length;

		return {
			activeThemeName: this._isDark ? 'Professional Dark' : 'Professional Light',
			isDark: this._isDark,
			totalTokens: allTokens.length,
			totalViolations: this._violations.length,
			componentComplianceRate: auditResults.length > 0 ? compliantCount / auditResults.length : 1,
			devModeWarnings: this._devModeWarnings,
			lastAuditAt: this._lastAuditAt,
			lastPolishAt: this._lastPolishAt,
		};
	}

	// ═══════════════════════════════════════════════════════════════════════════════
	// LIFECYCLE
	// ═══════════════════════════════════════════════════════════════════════════════

	override dispose(): void {
		this._elementRegistry.clear();
		this._infoLevelMappings.clear();
		this._violations = [];
		super.dispose();
	}
}
