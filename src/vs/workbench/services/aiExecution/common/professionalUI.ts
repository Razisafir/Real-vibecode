/*---------------------------------------------------------------------------------------------
 *  Professional UI -- Phase 23
 *  Real Product Convergence & Professional UI Rebuild
 *
 *  This phase creates NO fake abstractions, NO philosophical naming,
 *  NO simulated intelligence. Every service connects to actual rendering,
 *  execution, validation, or interaction paths. Naming is grounded and
 *  professional.
 *
 *  Services #120-#129:
 *    #120  IIconSystemService              -- Professional iconography
 *    #121  IDesignTokenService             -- Centralized design tokens
 *    #122  IComponentStandardsService      -- UI component standardization
 *    #123  IUIRealityValidationService     -- Render path validation
 *    #124  IUXReductionService             -- UX consolidation and reduction
 *    #125  IInteractionPolishService       -- Real interaction polish
 *    #126  IAccessibilityComplianceService -- Accessibility validation
 *    #127  IRenderingPerformanceService    -- Performance-driven simplification
 *    #128  IProductSurfaceRebuildService   -- Real product surface redesign
 *    #129  IProductRealityReportService    -- Final product truth
 *
 *  RULES:
 *    - No em dash characters (use -- instead)
 *    - No philosophical or inflated naming
 *    - No placeholder or TODO methods
 *    - Every type contains REAL values (pixels, milliseconds, hex colors)
 *--------------------------------------------------------------------------------------------*/

import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { Event } from '../../../../base/common/event.js';

// ═══════════════════════════════════════════════════════════════════════════════
// SERVICE #120 -- IIconSystemService
// Professional iconography: SVG-only, unified stroke, consistent sizing
// ═══════════════════════════════════════════════════════════════════════════════

export const IIconSystemService = createDecorator<IIconSystemService>('iconSystemService');

/**
 * Semantic icon categories. Every icon belongs to exactly one category.
 */
export const enum IconCategory {
	Action = 'action',
	Navigation = 'navigation',
	Status = 'status',
	File = 'file',
	AI = 'ai',
	Execution = 'execution',
	Settings = 'settings',
	Alert = 'alert',
}

/**
 * Icon interaction states. Every icon must define overrides for each state.
 */
export const enum IconState {
	Default = 'default',
	Hover = 'hover',
	Active = 'active',
	Disabled = 'disabled',
	Focus = 'focus',
}

/**
 * Override values for a specific icon state.
 * All values are real CSS/HTML attribute values.
 */
export interface IconStateOverride {
	readonly opacity: number;
	readonly strokeColor: string;
	readonly fillColor: string;
	readonly strokeWidth: number;
	readonly transform: string;
}

/**
 * Complete definition of a single icon in the system.
 */
export interface IconDefinition {
	readonly id: string;
	readonly svgPath: string;
	readonly category: IconCategory;
	readonly defaultSize: number;
	readonly accessibilityLabel: string;
	readonly states: Map<IconState, IconStateOverride>;
}

/**
 * Allowed icon sizes. No other sizes permitted.
 */
export const ICON_SIZES = {
	size12: 12,
	size16: 16,
	size20: 20,
	size24: 24,
} as const;

/**
 * Default stroke width for all icons. Override only via IconStateOverride.
 */
export const ICON_DEFAULT_STROKE_WIDTH = 1.5;

/**
 * Result of emoji detection scan.
 */
export interface EmojiDetection {
	readonly source: string;
	readonly location: string;
	readonly emojiChar: string;
	readonly unicodeCodePoint: string;
	readonly suggestedReplacement: string;
	readonly category: IconCategory;
}

/**
 * Migration result for a single emoji replacement.
 */
export interface EmojiMigration {
	readonly emojiChar: string;
	readonly replacementIconId: string;
	readonly svgPath: string;
	readonly migratedAt: number;
	readonly location: string;
}

/**
 * IIconSystemService -- Professional iconography pipeline.
 *
 * SVG-only icons with unified stroke widths (1.5px default), consistent
 * sizing (12/16/20/24px), semantic categories, state overrides per icon,
 * mandatory accessibility labels, and banned emoji detection/migration.
 */
export interface IIconSystemService {
	readonly _serviceBrand: undefined;

	/** Register a new icon definition in the system. */
	registerIcon(definition: IconDefinition): void;

	/** Retrieve an icon definition by its id. Returns null if not found. */
	getIcon(id: string): IconDefinition | null;

	/** Get all icons in a given category. */
	getCategoryIcons(category: IconCategory): readonly IconDefinition[];

	/** Scan a source string for emoji characters that should be replaced with SVG icons. */
	detectEmojiUsage(source: string, location: string): readonly EmojiDetection[];

	/** Migrate a detected emoji to its SVG icon replacement. */
	migrateEmoji(detection: EmojiDetection): EmojiMigration;

	/** Validate that a source string contains no banned emoji characters. Returns true if clean. */
	validateNoEmoji(source: string): boolean;

	/** Event: fires when a new icon is registered. */
	readonly onIconRegistered: Event<IconDefinition>;

	/** Event: fires when emoji usage is detected in a scan. */
	readonly onEmojiDetected: Event<EmojiDetection>;

	/** Event: fires when an emoji has been migrated to an SVG icon. */
	readonly onMigrationComplete: Event<EmojiMigration>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SERVICE #121 -- IDesignTokenService
// Centralized design tokens: spacing, typography, radius, elevation,
// motion, opacity, color, density modes
// ═══════════════════════════════════════════════════════════════════════════════

export const IDesignTokenService = createDecorator<IDesignTokenService>('designTokenService');

/**
 * Density mode controls overall spacing and sizing multiplier.
 */
export const enum DensityMode {
	Compact = 'compact',
	Balanced = 'balanced',
	Spacious = 'spacious',
}

/**
 * Spacing values in pixels. These are the ONLY allowed spacing values.
 */
export const SPACING_TOKENS = {
	none: 0,
	space2: 2,
	space4: 4,
	space6: 6,
	space8: 8,
	space12: 12,
	space16: 16,
	space20: 20,
	space24: 24,
	space32: 32,
	space40: 40,
	space48: 48,
} as const;

/**
 * Type for referencing a spacing token key.
 */
export type SpacingValue = keyof typeof SPACING_TOKENS;

/**
 * Typography tokens -- font family, sizes, weights, line heights.
 */
export interface TypographyTokens {
	readonly fontFamily: string;
	readonly fontFamilyMono: string;
	readonly sizes: Map<string, number>;  // e.g. '11' -> 11, '12' -> 12, etc.
	readonly weights: Map<string, number>; // 'regular' -> 400, 'medium' -> 500, etc.
	readonly lineHeights: Map<string, number>; // 'tight' -> 1.2, 'normal' -> 1.4, etc.
}

/**
 * Allowed font sizes in pixels. No other sizes permitted.
 */
export const FONT_SIZE_TOKENS = {
	size11: 11,
	size12: 12,
	size13: 13,
	size14: 14,
	size16: 16,
	size20: 20,
} as const;

/**
 * Font weight tokens.
 */
export const FONT_WEIGHT_TOKENS = {
	regular: 400,
	medium: 500,
	semibold: 600,
	bold: 700,
} as const;

/**
 * Line height tokens.
 */
export const LINE_HEIGHT_TOKENS = {
	tight: 1.2,
	normal: 1.4,
	relaxed: 1.6,
} as const;

/**
 * Border radius tokens in pixels.
 */
export const RADIUS_TOKENS = {
	radius2: 2,
	radius4: 4,
	radius6: 6,
	radius8: 8,
} as const;

/**
 * Elevation token -- shadow definition for a given level.
 */
export interface ElevationToken {
	readonly level: number;
	readonly shadow: string;
}

/**
 * Elevation levels and their real CSS box-shadow values.
 */
export const ELEVATION_TOKENS: ReadonlyMap<number, ElevationToken> = new Map([
	[0, { level: 0, shadow: 'none' }],
	[1, { level: 1, shadow: '0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.08)' }],
	[2, { level: 2, shadow: '0 4px 6px rgba(0,0,0,0.15), 0 2px 4px rgba(0,0,0,0.10)' }],
	[3, { level: 3, shadow: '0 10px 25px rgba(0,0,0,0.20), 0 6px 10px rgba(0,0,0,0.12)' }],
]);

/**
 * Motion duration tokens in milliseconds.
 */
export const MOTION_DURATION_TOKENS = {
	duration0: 0,
	duration50: 50,
	duration100: 100,
	duration150: 150,
	duration200: 200,
	duration300: 300,
} as const;

/**
 * Motion easing curves.
 */
export const MOTION_EASING_TOKENS = {
	default: 'cubic-bezier(0.4, 0, 0.2, 1)',
	easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
	easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
	easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
	sharp: 'cubic-bezier(0.4, 0, 0.6, 1)',
} as const;

/**
 * Motion tokens -- duration and easing combined.
 */
export interface MotionTokens {
	readonly durations: Map<string, number>;
	readonly easings: Map<string, string>;
}

/**
 * Opacity tokens. No arbitrary opacity values permitted.
 */
export const OPACITY_TOKENS = {
	opaque0: 0,
	opaque4: 0.04,
	opaque8: 0.08,
	opaque12: 0.12,
	opaque16: 0.16,
	opaque24: 0.24,
	opaque48: 0.48,
	opaque72: 0.72,
	opaque100: 1.0,
} as const;

/**
 * Neutral dark-first color palette. Low-saturation, high-professionalism.
 * These are hex color values, not semantic tokens. They are the raw
 * definitions that semantic tokens resolve to.
 */
export interface ColorTokens {
	readonly surface: string;
	readonly surfaceElevated: string;
	readonly surfaceHover: string;
	readonly surfaceActive: string;
	readonly onSurface: string;
	readonly onSurfaceSecondary: string;
	readonly onSurfaceTertiary: string;
	readonly onSurfaceDisabled: string;
	readonly border: string;
	readonly borderSubtle: string;
	readonly borderStrong: string;
	readonly muted: string;
	readonly accent: string;
	readonly accentSubtle: string;
	readonly accentHover: string;
	readonly statusSuccess: string;
	readonly statusWarning: string;
	readonly statusError: string;
	readonly statusInfo: string;
}

/**
 * Default dark-first color palette with real hex values.
 */
export const DEFAULT_DARK_COLOR_TOKENS: ColorTokens = {
	surface: '#1A1D2B',
	surfaceElevated: '#1E2130',
	surfaceHover: '#2A2F45',
	surfaceActive: '#313750',
	onSurface: '#E4E6F0',
	onSurfaceSecondary: '#9DA2B9',
	onSurfaceTertiary: '#6B7194',
	onSurfaceDisabled: '#464C6A',
	border: '#2A2F45',
	borderSubtle: '#1E2130',
	borderStrong: '#3E4463',
	muted: '#6B7194',
	accent: '#6366F1',
	accentSubtle: 'rgba(99,102,241,0.12)',
	accentHover: '#818CF8',
	statusSuccess: '#34D399',
	statusWarning: '#FBBF24',
	statusError: '#F87171',
	statusInfo: '#60A5FA',
};

/**
 * Complete set of all design tokens.
 */
export interface DesignTokenSet {
	readonly spacing: Map<string, number>;
	readonly typography: TypographyTokens;
	readonly radius: Map<string, number>;
	readonly elevation: Map<string, ElevationToken>;
	readonly motion: MotionTokens;
	readonly opacity: Map<string, number>;
	readonly colors: ColorTokens;
	readonly density: DensityMode;
}

/**
 * Inconsistency detected during token validation.
 */
export interface TokenInconsistency {
	readonly tokenName: string;
	readonly expectedValue: number | string;
	readonly actualValue: number | string;
	readonly location: string;
	readonly severity: 'error' | 'warning';
}

/**
 * IDesignTokenService -- Centralized design tokens.
 *
 * Single source of truth for spacing, typography, radius, elevation,
 * motion, opacity, and color tokens. Density mode multiplier adjusts
 * spacing values across the entire system. Token validation catches
 * inconsistencies at runtime.
 */
export interface IDesignTokenService {
	readonly _serviceBrand: undefined;

	/** Get a token value by name (e.g. 'space16', 'radius4', 'duration200'). */
	getToken(category: string, name: string): number | string | null;

	/** Get the pixel value for a spacing token. */
	getSpacing(key: SpacingValue): number;

	/** Get the full typography token set. */
	getTypography(): TypographyTokens;

	/** Get a color value by property name (e.g. 'surface', 'onSurface', 'accent'). */
	getColor(property: keyof ColorTokens): string;

	/** Set the density mode, which adjusts spacing multiplier. */
	setDensityMode(mode: DensityMode): void;

	/** Export all tokens as a plain object for CSS variable generation or tooling. */
	exportTokens(): DesignTokenSet;

	/** Validate all tokens for consistency. Returns any detected inconsistencies. */
	validateConsistency(): readonly TokenInconsistency[];

	/** Event: fires when a token value changes. */
	readonly onTokenChanged: Event<{ category: string; name: string; value: number | string }>;

	/** Event: fires when density mode changes. */
	readonly onDensityModeChanged: Event<DensityMode>;

	/** Event: fires when a token inconsistency is detected. */
	readonly onInconsistencyDetected: Event<TokenInconsistency>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SERVICE #122 -- IComponentStandardsService
// UI component standardization: real pixel values, real CSS properties
// ═══════════════════════════════════════════════════════════════════════════════

export const IComponentStandardsService = createDecorator<IComponentStandardsService>('componentStandardsService');

/**
 * Standard component types that must conform to specs.
 */
export const enum StandardComponentType {
	Button = 'button',
	Panel = 'panel',
	Dialog = 'dialog',
	Input = 'input',
	Tab = 'tab',
	Sidebar = 'sidebar',
	AIPanel = 'ai-panel',
	ExecutionCard = 'execution-card',
	TimelineItem = 'timeline-item',
	Notification = 'notification',
}

/**
 * Component states with their visual properties.
 */
export interface ComponentStates {
	readonly default: ComponentStateValues;
	readonly hover: ComponentStateValues;
	readonly active: ComponentStateValues;
	readonly disabled: ComponentStateValues;
	readonly focus: ComponentStateValues;
}

/**
 * Visual property values for a component state.
 * All values are real CSS values -- pixels, hex colors, or CSS strings.
 */
export interface ComponentStateValues {
	readonly backgroundColor: string;
	readonly textColor: string;
	readonly borderColor: string;
	readonly opacity: number;
	readonly cursor: string;
	readonly boxShadow: string;
}

/**
 * Standard specification for a component type.
 * Every property is a real pixel value or CSS value. No aspirational descriptions.
 */
export interface ComponentStandard {
	readonly componentType: StandardComponentType;
	readonly minHeight: number;
	readonly padding: SpacingValue;
	readonly borderRadius: number;
	readonly fontSize: number;
	readonly states: ComponentStates;
	readonly spacing: SpacingValue;
}

/**
 * Button spec with real pixel values.
 */
export const BUTTON_STANDARD: ComponentStandard = {
	componentType: StandardComponentType.Button,
	minHeight: 28,
	padding: 'space8',
	borderRadius: 4,
	fontSize: 13,
	states: {
		default: { backgroundColor: '#2A2F45', textColor: '#E4E6F0', borderColor: '#2A2F45', opacity: 1.0, cursor: 'pointer', boxShadow: 'none' },
		hover: { backgroundColor: '#313750', textColor: '#E4E6F0', borderColor: '#3E4463', opacity: 1.0, cursor: 'pointer', boxShadow: 'none' },
		active: { backgroundColor: '#3E4463', textColor: '#E4E6F0', borderColor: '#3E4463', opacity: 1.0, cursor: 'pointer', boxShadow: 'none' },
		disabled: { backgroundColor: '#1E2130', textColor: '#464C6A', borderColor: '#1E2130', opacity: 0.48, cursor: 'not-allowed', boxShadow: 'none' },
		focus: { backgroundColor: '#2A2F45', textColor: '#E4E6F0', borderColor: '#6366F1', opacity: 1.0, cursor: 'pointer', boxShadow: '0 0 0 2px rgba(99,102,241,0.24)' },
	},
	spacing: 'space8',
};

/**
 * Panel spec with real pixel values.
 */
export const PANEL_STANDARD: ComponentStandard = {
	componentType: StandardComponentType.Panel,
	minHeight: 200,
	padding: 'space16',
	borderRadius: 6,
	fontSize: 13,
	states: {
		default: { backgroundColor: '#1A1D2B', textColor: '#E4E6F0', borderColor: '#2A2F45', opacity: 1.0, cursor: 'default', boxShadow: '0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.08)' },
		hover: { backgroundColor: '#1A1D2B', textColor: '#E4E6F0', borderColor: '#2A2F45', opacity: 1.0, cursor: 'default', boxShadow: '0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.08)' },
		active: { backgroundColor: '#1A1D2B', textColor: '#E4E6F0', borderColor: '#3E4463', opacity: 1.0, cursor: 'default', boxShadow: '0 4px 6px rgba(0,0,0,0.15), 0 2px 4px rgba(0,0,0,0.10)' },
		disabled: { backgroundColor: '#151720', textColor: '#464C6A', borderColor: '#1E2130', opacity: 0.72, cursor: 'default', boxShadow: 'none' },
		focus: { backgroundColor: '#1A1D2B', textColor: '#E4E6F0', borderColor: '#6366F1', opacity: 1.0, cursor: 'default', boxShadow: '0 0 0 2px rgba(99,102,241,0.24)' },
	},
	spacing: 'space16',
};

/**
 * Dialog spec with real pixel values.
 */
export const DIALOG_STANDARD: ComponentStandard = {
	componentType: StandardComponentType.Dialog,
	minHeight: 160,
	padding: 'space24',
	borderRadius: 8,
	fontSize: 14,
	states: {
		default: { backgroundColor: '#1E2130', textColor: '#E4E6F0', borderColor: '#2A2F45', opacity: 1.0, cursor: 'default', boxShadow: '0 10px 25px rgba(0,0,0,0.20), 0 6px 10px rgba(0,0,0,0.12)' },
		hover: { backgroundColor: '#1E2130', textColor: '#E4E6F0', borderColor: '#2A2F45', opacity: 1.0, cursor: 'default', boxShadow: '0 10px 25px rgba(0,0,0,0.20), 0 6px 10px rgba(0,0,0,0.12)' },
		active: { backgroundColor: '#1E2130', textColor: '#E4E6F0', borderColor: '#3E4463', opacity: 1.0, cursor: 'default', boxShadow: '0 10px 25px rgba(0,0,0,0.20), 0 6px 10px rgba(0,0,0,0.12)' },
		disabled: { backgroundColor: '#151720', textColor: '#464C6A', borderColor: '#1E2130', opacity: 0.72, cursor: 'default', boxShadow: 'none' },
		focus: { backgroundColor: '#1E2130', textColor: '#E4E6F0', borderColor: '#6366F1', opacity: 1.0, cursor: 'default', boxShadow: '0 10px 25px rgba(0,0,0,0.20), 0 6px 10px rgba(0,0,0,0.12)' },
	},
	spacing: 'space24',
};

/**
 * Input spec with real pixel values.
 */
export const INPUT_STANDARD: ComponentStandard = {
	componentType: StandardComponentType.Input,
	minHeight: 28,
	padding: 'space8',
	borderRadius: 4,
	fontSize: 13,
	states: {
		default: { backgroundColor: '#151720', textColor: '#E4E6F0', borderColor: '#2A2F45', opacity: 1.0, cursor: 'text', boxShadow: 'none' },
		hover: { backgroundColor: '#1A1D2B', textColor: '#E4E6F0', borderColor: '#3E4463', opacity: 1.0, cursor: 'text', boxShadow: 'none' },
		active: { backgroundColor: '#1A1D2B', textColor: '#E4E6F0', borderColor: '#3E4463', opacity: 1.0, cursor: 'text', boxShadow: 'none' },
		disabled: { backgroundColor: '#151720', textColor: '#464C6A', borderColor: '#1E2130', opacity: 0.48, cursor: 'not-allowed', boxShadow: 'none' },
		focus: { backgroundColor: '#1A1D2B', textColor: '#E4E6F0', borderColor: '#6366F1', opacity: 1.0, cursor: 'text', boxShadow: '0 0 0 2px rgba(99,102,241,0.24)' },
	},
	spacing: 'space8',
};

/**
 * Tab spec with real pixel values.
 */
export const TAB_STANDARD: ComponentStandard = {
	componentType: StandardComponentType.Tab,
	minHeight: 36,
	padding: 'space8',
	borderRadius: 4,
	fontSize: 13,
	states: {
		default: { backgroundColor: 'transparent', textColor: '#9DA2B9', borderColor: 'transparent', opacity: 1.0, cursor: 'pointer', boxShadow: 'none' },
		hover: { backgroundColor: '#2A2F45', textColor: '#E4E6F0', borderColor: 'transparent', opacity: 1.0, cursor: 'pointer', boxShadow: 'none' },
		active: { backgroundColor: '#1A1D2B', textColor: '#E4E6F0', borderColor: '#6366F1', opacity: 1.0, cursor: 'pointer', boxShadow: 'none' },
		disabled: { backgroundColor: 'transparent', textColor: '#464C6A', borderColor: 'transparent', opacity: 0.48, cursor: 'not-allowed', boxShadow: 'none' },
		focus: { backgroundColor: 'transparent', textColor: '#E4E6F0', borderColor: '#6366F1', opacity: 1.0, cursor: 'pointer', boxShadow: '0 0 0 2px rgba(99,102,241,0.24)' },
	},
	spacing: 'space12',
};

/**
 * Sidebar spec with real pixel values.
 */
export const SIDEBAR_STANDARD: ComponentStandard = {
	componentType: StandardComponentType.Sidebar,
	minHeight: 300,
	padding: 'space4',
	borderRadius: 0,
	fontSize: 13,
	states: {
		default: { backgroundColor: '#1A1D2B', textColor: '#E4E6F0', borderColor: '#2A2F45', opacity: 1.0, cursor: 'default', boxShadow: 'none' },
		hover: { backgroundColor: '#1A1D2B', textColor: '#E4E6F0', borderColor: '#2A2F45', opacity: 1.0, cursor: 'default', boxShadow: 'none' },
		active: { backgroundColor: '#1A1D2B', textColor: '#E4E6F0', borderColor: '#2A2F45', opacity: 1.0, cursor: 'default', boxShadow: 'none' },
		disabled: { backgroundColor: '#151720', textColor: '#464C6A', borderColor: '#1E2130', opacity: 0.72, cursor: 'default', boxShadow: 'none' },
		focus: { backgroundColor: '#1A1D2B', textColor: '#E4E6F0', borderColor: '#6366F1', opacity: 1.0, cursor: 'default', boxShadow: '0 0 0 2px rgba(99,102,241,0.24)' },
	},
	spacing: 'space4',
};

/**
 * AI Panel spec with real pixel values.
 */
export const AI_PANEL_STANDARD: ComponentStandard = {
	componentType: StandardComponentType.AIPanel,
	minHeight: 200,
	padding: 'space16',
	borderRadius: 6,
	fontSize: 13,
	states: {
		default: { backgroundColor: '#1A1D2B', textColor: '#E4E6F0', borderColor: '#2A2F45', opacity: 1.0, cursor: 'default', boxShadow: 'none' },
		hover: { backgroundColor: '#1A1D2B', textColor: '#E4E6F0', borderColor: '#2A2F45', opacity: 1.0, cursor: 'default', boxShadow: 'none' },
		active: { backgroundColor: '#1A1D2B', textColor: '#E4E6F0', borderColor: '#3E4463', opacity: 1.0, cursor: 'default', boxShadow: 'none' },
		disabled: { backgroundColor: '#151720', textColor: '#464C6A', borderColor: '#1E2130', opacity: 0.72, cursor: 'default', boxShadow: 'none' },
		focus: { backgroundColor: '#1A1D2B', textColor: '#E4E6F0', borderColor: '#6366F1', opacity: 1.0, cursor: 'default', boxShadow: '0 0 0 2px rgba(99,102,241,0.24)' },
	},
	spacing: 'space12',
};

/**
 * Execution card spec with real pixel values.
 */
export const EXECUTION_CARD_STANDARD: ComponentStandard = {
	componentType: StandardComponentType.ExecutionCard,
	minHeight: 48,
	padding: 'space12',
	borderRadius: 4,
	fontSize: 13,
	states: {
		default: { backgroundColor: '#1E2130', textColor: '#E4E6F0', borderColor: '#2A2F45', opacity: 1.0, cursor: 'default', boxShadow: 'none' },
		hover: { backgroundColor: '#222638', textColor: '#E4E6F0', borderColor: '#3E4463', opacity: 1.0, cursor: 'pointer', boxShadow: 'none' },
		active: { backgroundColor: '#2A2F45', textColor: '#E4E6F0', borderColor: '#3E4463', opacity: 1.0, cursor: 'pointer', boxShadow: 'none' },
		disabled: { backgroundColor: '#1E2130', textColor: '#464C6A', borderColor: '#2A2F45', opacity: 0.48, cursor: 'default', boxShadow: 'none' },
		focus: { backgroundColor: '#1E2130', textColor: '#E4E6F0', borderColor: '#6366F1', opacity: 1.0, cursor: 'default', boxShadow: '0 0 0 2px rgba(99,102,241,0.24)' },
	},
	spacing: 'space8',
};

/**
 * Timeline item spec with real pixel values.
 */
export const TIMELINE_ITEM_STANDARD: ComponentStandard = {
	componentType: StandardComponentType.TimelineItem,
	minHeight: 40,
	padding: 'space8',
	borderRadius: 4,
	fontSize: 12,
	states: {
		default: { backgroundColor: 'transparent', textColor: '#9DA2B9', borderColor: 'transparent', opacity: 1.0, cursor: 'default', boxShadow: 'none' },
		hover: { backgroundColor: '#2A2F45', textColor: '#E4E6F0', borderColor: 'transparent', opacity: 1.0, cursor: 'pointer', boxShadow: 'none' },
		active: { backgroundColor: '#313750', textColor: '#E4E6F0', borderColor: 'transparent', opacity: 1.0, cursor: 'pointer', boxShadow: 'none' },
		disabled: { backgroundColor: 'transparent', textColor: '#464C6A', borderColor: 'transparent', opacity: 0.48, cursor: 'default', boxShadow: 'none' },
		focus: { backgroundColor: 'transparent', textColor: '#E4E6F0', borderColor: '#6366F1', opacity: 1.0, cursor: 'default', boxShadow: '0 0 0 2px rgba(99,102,241,0.24)' },
	},
	spacing: 'space4',
};

/**
 * Notification spec with real pixel values.
 */
export const NOTIFICATION_STANDARD: ComponentStandard = {
	componentType: StandardComponentType.Notification,
	minHeight: 40,
	padding: 'space12',
	borderRadius: 4,
	fontSize: 13,
	states: {
		default: { backgroundColor: '#1E2130', textColor: '#E4E6F0', borderColor: '#2A2F45', opacity: 1.0, cursor: 'default', boxShadow: '0 4px 6px rgba(0,0,0,0.15), 0 2px 4px rgba(0,0,0,0.10)' },
		hover: { backgroundColor: '#222638', textColor: '#E4E6F0', borderColor: '#3E4463', opacity: 1.0, cursor: 'pointer', boxShadow: '0 4px 6px rgba(0,0,0,0.15), 0 2px 4px rgba(0,0,0,0.10)' },
		active: { backgroundColor: '#2A2F45', textColor: '#E4E6F0', borderColor: '#3E4463', opacity: 1.0, cursor: 'pointer', boxShadow: '0 4px 6px rgba(0,0,0,0.15), 0 2px 4px rgba(0,0,0,0.10)' },
		disabled: { backgroundColor: '#1E2130', textColor: '#464C6A', borderColor: '#2A2F45', opacity: 0.48, cursor: 'default', boxShadow: 'none' },
		focus: { backgroundColor: '#1E2130', textColor: '#E4E6F0', borderColor: '#6366F1', opacity: 1.0, cursor: 'default', boxShadow: '0 0 0 2px rgba(99,102,241,0.24)' },
	},
	spacing: 'space12',
};

/**
 * Component inconsistency detected during validation.
 */
export interface ComponentInconsistency {
	readonly componentType: StandardComponentType;
	readonly property: string;
	readonly expectedValue: number | string;
	readonly actualValue: number | string;
	readonly location: string;
	readonly severity: 'error' | 'warning';
}

/**
 * IComponentStandardsService -- UI component standardization.
 *
 * Real pixel values for every standard component. Validation checks
 * running components against the spec and flags inconsistencies.
 * No fake standards -- everything is a concrete CSS value.
 */
export interface IComponentStandardsService {
	readonly _serviceBrand: undefined;

	/** Get the standard specification for a component type. */
	getStandard(type: StandardComponentType): ComponentStandard;

	/** Validate a component instance against its standard. Returns inconsistencies. */
	validateComponent(type: StandardComponentType, actualProperties: Record<string, number | string>): readonly ComponentInconsistency[];

	/** Audit all loaded components for inconsistencies against their standards. */
	auditInconsistencies(): readonly ComponentInconsistency[];

	/** Get the allowed spacing grid values in pixels. */
	getSpacingGrid(): readonly number[];

	/** Get the button standard spec directly. */
	getButtonSpec(): ComponentStandard;

	/** Get the panel standard spec directly. */
	getPanelSpec(): ComponentStandard;

	/** Get the dialog standard spec directly. */
	getDialogSpec(): ComponentStandard;

	/** Get the input standard spec directly. */
	getInputSpec(): ComponentStandard;

	/** Get the tab standard spec directly. */
	getTabSpec(): ComponentStandard;

	/** Get the sidebar standard spec directly. */
	getSidebarSpec(): ComponentStandard;

	/** Get the AI panel standard spec directly. */
	getAIPanelSpec(): ComponentStandard;

	/** Get the execution card standard spec directly. */
	getExecutionCardSpec(): ComponentStandard;

	/** Get the timeline item standard spec directly. */
	getTimelineItemSpec(): ComponentStandard;

	/** Get the notification standard spec directly. */
	getNotificationSpec(): ComponentStandard;

	/** Event: fires when an inconsistency is found during audit. */
	readonly onInconsistencyFound: Event<ComponentInconsistency>;

	/** Event: fires when a component standard is updated. */
	readonly onStandardUpdated: Event<StandardComponentType>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SERVICE #123 -- IUIRealityValidationService
// Render path validation: what actually renders vs. what is declared
// ═══════════════════════════════════════════════════════════════════════════════

export const IUIRealityValidationService = createDecorator<IUIRealityValidationService>('uiRealityValidationService');

/**
 * Render participation report -- what percentage of declared UI
 * actually renders to the screen.
 */
export interface RenderParticipationReport {
	readonly overallScore: number;
	readonly serviceParticipation: Map<string, number>;
	readonly deadVisualSystems: string[];
	readonly nonRenderedMotion: string[];
	readonly unusedUIState: string[];
}

/**
 * Entry in the component usage map.
 */
export interface ComponentUsageEntry {
	readonly componentId: string;
	readonly renderCount: number;
	readonly lastRenderTimestamp: number;
	readonly isActive: boolean;
	readonly parentPanel: string;
}

/**
 * Dead visual system -- a service or subsystem that declares visual
 * output but never actually renders anything.
 */
export interface DeadVisualSystem {
	readonly serviceId: string;
	readonly declaredOutputs: string[];
	readonly actualRenderCount: number;
	readonly lastChecked: number;
}

/**
 * Non-rendered motion -- a motion/animation declaration that never
 * produces visible animation.
 */
export interface NonRenderedMotion {
	readonly motionId: string;
	readonly declaredContext: string;
	readonly triggerCount: number;
	readonly visibleFrameCount: number;
	readonly lastChecked: number;
}

/**
 * Unused UI state -- a state declaration that is never entered.
 */
export interface UnusedUIState {
	readonly componentId: string;
	readonly stateName: string;
	readonly declaredIn: string;
	readonly entryCount: number;
	readonly lastChecked: number;
}

/**
 * IUIRealityValidationService -- Render path validation.
 *
 * Measures what percentage of declared UI actually renders to pixels.
 * Detects dead visual systems, non-rendered motion, and unused UI states.
 * Honest: many Phase 13-15 services will score 0% render participation.
 */
export interface IUIRealityValidationService {
	readonly _serviceBrand: undefined;

	/** Compute the render participation score (0-100) for all services. */
	computeRenderParticipation(): RenderParticipationReport;

	/** Detect visual systems that declare output but never render. */
	detectDeadVisualSystems(): readonly DeadVisualSystem[];

	/** Get the component usage map -- which components render, how often. */
	getComponentUsageMap(): readonly ComponentUsageEntry[];

	/** Validate that all declared render paths produce actual pixels. */
	validateRenderPaths(): readonly DeadVisualSystem[];

	/** Event: fires when a dead visual system is detected. */
	readonly onDeadSystemDetected: Event<DeadVisualSystem>;

	/** Event: fires when a participation score is computed. */
	readonly onParticipationComputed: Event<RenderParticipationReport>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SERVICE #124 -- IUXReductionService
// UX consolidation and reduction: eliminate duplicates, fake adaptive
// systems, and overlapping cognitive systems
// ═══════════════════════════════════════════════════════════════════════════════

export const IUXReductionService = createDecorator<IUXReductionService>('uxReductionService');

/**
 * Group of duplicate UX systems that provide overlapping functionality.
 */
export interface DuplicateGroup {
	readonly groupId: string;
	readonly serviceIds: string[];
	readonly overlapDescription: string;
	readonly recommendedKeeper: string;
	readonly redundancyPercent: number;
}

/**
 * Fake adaptive system -- declares adaptive behavior but is actually
 * static or random, not responsive to real context.
 */
export interface FakeAdaptiveSystem {
	readonly serviceId: string;
	readonly declaredAdaptiveBehavior: string;
	readonly actualBehavior: 'static' | 'random' | 'hardcoded';
	readonly evidence: string;
}

/**
 * Merge proposal -- combine multiple services into one.
 */
export interface MergeProposal {
	readonly targetServiceId: string;
	readonly sourceServiceIds: string[];
	readonly rationale: string;
	readonly estimatedLineReduction: number;
}

/**
 * Deletion candidate -- a service that provides no user value.
 */
export interface DeletionCandidate {
	readonly serviceId: string;
	readonly reason: string;
	readonly renderParticipationScore: number;
	readonly userFacingImpact: 'none' | 'minimal' | 'moderate';
}

/**
 * UX reduction plan with concrete targets.
 */
export interface UXReductionPlan {
	readonly duplicates: DuplicateGroup[];
	readonly fakeAdaptive: FakeAdaptiveSystem[];
	readonly mergeMap: Map<string, string[]>;
	readonly deletionCandidates: DeletionCandidate[];
	readonly reductionPercent: number;
}

/**
 * IUXReductionService -- UX consolidation and reduction.
 *
 * Detects duplicate UX systems, identifies fake adaptive behavior,
 * proposes merges, and identifies deletion candidates.
 * Target: 40-60% reduction in UX services.
 */
export interface IUXReductionService {
	readonly _serviceBrand: undefined;

	/** Detect duplicate UX systems that provide overlapping functionality. */
	detectDuplicates(): readonly DuplicateGroup[];

	/** Identify services that claim adaptive behavior but are actually static or random. */
	identifyFakeAdaptive(): readonly FakeAdaptiveSystem[];

	/** Propose a merge map -- which services should be merged into which. */
	proposeMergeMap(): readonly MergeProposal[];

	/** Identify services that are deletion candidates. */
	identifyDeletionCandidates(): readonly DeletionCandidate[];

	/** Compute the total reduction potential as a percentage. */
	computeReductionPotential(): number;

	/** Event: fires when a duplicate UX system is found. */
	readonly onDuplicateFound: Event<DuplicateGroup>;

	/** Event: fires when a deletion candidate is found. */
	readonly onDeletionCandidateFound: Event<DeletionCandidate>;

	/** Event: fires when a reduction plan is proposed. */
	readonly onReductionProposed: Event<UXReductionPlan>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SERVICE #125 -- IInteractionPolishService
// Real interaction polish: hover, focus, keyboard, loading, empty,
// error states with REAL CSS values
// ═══════════════════════════════════════════════════════════════════════════════

export const IInteractionPolishService = createDecorator<IInteractionPolishService>('interactionPolishService');

/**
 * Hover state definition -- background shift, not glow.
 * All values are real CSS.
 */
export interface HoverStateSpec {
	readonly backgroundColorShift: string;
	readonly borderColorShift: string;
	readonly opacityChange: number;
	readonly transitionDuration: number;
	readonly transitionEasing: string;
	readonly cursor: string;
}

/**
 * Focus state definition -- 2px outline, not ring.
 * All values are real CSS.
 */
export interface FocusStateSpec {
	readonly outlineWidth: number;
	readonly outlineStyle: string;
	readonly outlineColor: string;
	readonly outlineOffset: number;
	readonly borderColor: string;
	readonly transitionDuration: number;
	readonly transitionEasing: string;
}

/**
 * Keyboard navigation mapping for a component.
 */
export interface KeyboardNavMapping {
	readonly componentType: string;
	readonly keyBindings: Map<string, string>;
	readonly tabOrder: number;
	readonly arrowKeyBehavior: 'horizontal' | 'vertical' | 'grid' | 'none';
	readonly escapeBehavior: 'close' | 'blur' | 'cancel' | 'none';
	readonly enterBehavior: 'activate' | 'submit' | 'toggle' | 'none';
}

/**
 * Loading pattern type.
 */
export const enum LoadingPattern {
	Skeleton = 'skeleton',
	Spinner = 'spinner',
	ProgressBar = 'progress-bar',
	Dots = 'dots',
	Pulse = 'pulse',
}

/**
 * Loading state definition with real CSS values.
 */
export interface LoadingStateSpec {
	readonly pattern: LoadingPattern;
	readonly animationDuration: number;
	readonly animationEasing: string;
	readonly skeletonBackgroundColor: string;
	readonly skeletonShimmerColor: string;
	readonly spinnerSize: number;
	readonly spinnerStrokeWidth: number;
	readonly spinnerColor: string;
	readonly progressBarHeight: number;
	readonly progressBarColor: string;
	readonly progressBarTrackColor: string;
	readonly prefersReducedMotionAlternative: LoadingPattern;
}

/**
 * Empty state template with real layout values.
 */
export interface EmptyStateTemplate {
	readonly iconSize: number;
	readonly iconColor: string;
	readonly titleFontSize: number;
	readonly titleFontWeight: number;
	readonly titleColor: string;
	readonly descriptionFontSize: number;
	readonly descriptionColor: string;
	readonly verticalPadding: number;
	readonly horizontalPadding: number;
	readonly actionButtonMinHeight: number;
	readonly actionButtonPadding: number;
}

/**
 * Error state template with real layout values.
 */
export interface ErrorStateTemplate {
	readonly iconSize: number;
	readonly iconColor: string;
	readonly titleFontSize: number;
	readonly titleFontWeight: number;
	readonly titleColor: string;
	readonly descriptionFontSize: number;
	readonly descriptionColor: string;
	readonly backgroundColor: string;
	readonly borderColor: string;
	readonly borderWidth: number;
	readonly borderRadius: number;
	readonly verticalPadding: number;
	readonly horizontalPadding: number;
	readonly retryButtonBackgroundColor: string;
	readonly retryButtonTextColor: string;
	readonly retryButtonBorderRadius: number;
}

/**
 * Transition timing specification with real CSS values.
 */
export interface TransitionSpec {
	readonly property: string;
	readonly duration: number;
	readonly easing: string;
	readonly delay: number;
}

/**
 * Panel transition specification.
 */
export interface PanelTransitionSpec {
	readonly enter: readonly TransitionSpec[];
	readonly exit: readonly TransitionSpec[];
	readonly resize: readonly TransitionSpec[];
}

/**
 * Interaction state specification that combines hover, focus, and transitions.
 */
export interface InteractionStateSpec {
	readonly hover: HoverStateSpec;
	readonly focus: FocusStateSpec;
	readonly active: HoverStateSpec;
	readonly disabled: ComponentStateValues;
}

/**
 * Default hover state spec with real CSS values.
 */
export const DEFAULT_HOVER_STATE: HoverStateSpec = {
	backgroundColorShift: 'rgba(255,255,255,0.04)',
	borderColorShift: '#3E4463',
	opacityChange: 1.0,
	transitionDuration: 100,
	transitionEasing: 'cubic-bezier(0.4, 0, 0.2, 1)',
	cursor: 'pointer',
};

/**
 * Default focus state spec with real CSS values.
 */
export const DEFAULT_FOCUS_STATE: FocusStateSpec = {
	outlineWidth: 2,
	outlineStyle: 'solid',
	outlineColor: '#6366F1',
	outlineOffset: 1,
	borderColor: '#6366F1',
	transitionDuration: 100,
	transitionEasing: 'cubic-bezier(0.4, 0, 0.2, 1)',
};

/**
 * Default loading state spec with real CSS values.
 */
export const DEFAULT_LOADING_STATE: LoadingStateSpec = {
	pattern: LoadingPattern.Skeleton,
	animationDuration: 1500,
	animationEasing: 'cubic-bezier(0.4, 0, 0.2, 1)',
	skeletonBackgroundColor: '#1E2130',
	skeletonShimmerColor: '#2A2F45',
	spinnerSize: 16,
	spinnerStrokeWidth: 2,
	spinnerColor: '#6366F1',
	progressBarHeight: 2,
	progressBarColor: '#6366F1',
	progressBarTrackColor: '#2A2F45',
	prefersReducedMotionAlternative: LoadingPattern.Pulse,
};

/**
 * Default empty state template with real layout values.
 */
export const DEFAULT_EMPTY_STATE: EmptyStateTemplate = {
	iconSize: 48,
	iconColor: '#6B7194',
	titleFontSize: 14,
	titleFontWeight: 600,
	titleColor: '#9DA2B9',
	descriptionFontSize: 13,
	descriptionColor: '#6B7194',
	verticalPadding: 24,
	horizontalPadding: 16,
	actionButtonMinHeight: 28,
	actionButtonPadding: 8,
};

/**
 * Default error state template with real layout values.
 */
export const DEFAULT_ERROR_STATE: ErrorStateTemplate = {
	iconSize: 20,
	iconColor: '#F87171',
	titleFontSize: 13,
	titleFontWeight: 600,
	titleColor: '#F87171',
	descriptionFontSize: 12,
	descriptionColor: '#9DA2B9',
	backgroundColor: 'rgba(248,113,113,0.08)',
	borderColor: 'rgba(248,113,113,0.16)',
	borderWidth: 1,
	borderRadius: 4,
	verticalPadding: 12,
	horizontalPadding: 12,
	retryButtonBackgroundColor: '#2A2F45',
	retryButtonTextColor: '#E4E6F0',
	retryButtonBorderRadius: 4,
};

/**
 * IInteractionPolishService -- Real interaction polish.
 *
 * Defines hover states (background shift, not glow), focus states
 * (2px outline, not ring), keyboard navigation, loading patterns,
 * empty/error state templates, and transition timing. Every value
 * is a real CSS property value, not a conceptual model.
 */
export interface IInteractionPolishService {
	readonly _serviceBrand: undefined;

	/** Get the hover state spec for a component type. */
	getHoverState(componentType: string): HoverStateSpec;

	/** Get the focus state spec for a component type. */
	getFocusState(componentType: string): FocusStateSpec;

	/** Get the loading pattern spec for a component type. */
	getLoadingPattern(componentType: string): LoadingStateSpec;

	/** Get the empty state template for a component type. */
	getEmptyState(componentType: string): EmptyStateTemplate;

	/** Get the error state template for a component type. */
	getErrorState(componentType: string): ErrorStateTemplate;

	/** Get the transition spec for a property change on a component type. */
	getTransitionSpec(componentType: string, property: string): TransitionSpec;

	/** Validate that keyboard navigation is properly defined for a component. */
	validateKeyboardNav(componentType: string): readonly string[];

	/** Event: fires when an interaction state is applied to a component. */
	readonly onStateApplied: Event<{ componentType: string; state: string }>;

	/** Event: fires when an accessibility violation is detected in interaction polish. */
	readonly onAccessibilityViolation: Event<{ componentType: string; violation: string }>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SERVICE #126 -- IAccessibilityComplianceService
// Accessibility validation: WCAG AA compliance with real scoring
// ═══════════════════════════════════════════════════════════════════════════════

export const IAccessibilityComplianceService = createDecorator<IAccessibilityComplianceService>('accessibilityComplianceService');

/**
 * Contrast ratio check result.
 */
export interface ContrastCheckResult {
	readonly foreground: string;
	readonly background: string;
	readonly ratio: number;
	readonly passesAA: boolean;
	readonly passesAAA: boolean;
	readonly elementId: string;
}

/**
 * Contrast failure details.
 */
export interface ContrastFailure {
	readonly foreground: string;
	readonly background: string;
	readonly actualRatio: number;
	readonly minimumRatio: number;
	readonly elementId: string;
	readonly location: string;
	readonly suggestedForeground: string;
}

/**
 * Accessibility violation with WCAG reference.
 */
export interface AccessibilityViolation {
	readonly violationId: string;
	readonly ruleId: string;
	readonly severity: 'critical' | 'serious' | 'moderate' | 'minor';
	readonly description: string;
	readonly elementId: string;
	readonly wcagCriterion: string;
	readonly remediation: string;
}

/**
 * Keyboard navigation gap.
 */
export interface KeyboardNavGap {
	readonly componentId: string;
	readonly missingKeyAction: string;
	readonly expectedBehavior: string;
	readonly severity: 'critical' | 'serious' | 'moderate';
}

/**
 * Missing screen reader label.
 */
export interface MissingScreenReaderLabel {
	readonly elementId: string;
	readonly elementType: string;
	readonly location: string;
	readonly severity: 'critical' | 'serious' | 'moderate';
}

/**
 * Semantic hierarchy violation.
 */
export interface SemanticHierarchyViolation {
	readonly elementId: string;
	readonly currentRole: string;
	readonly expectedRole: string;
	readonly nestingLevel: number;
	readonly description: string;
}

/**
 * Motion reduction support status.
 */
export interface MotionReductionSupport {
	readonly componentId: string;
	readonly respectsPrefersReducedMotion: boolean;
	readonly hasAlternative: boolean;
	readonly alternativeDescription: string;
}

/**
 * Complete accessibility report.
 */
export interface AccessibilityReport {
	readonly score: number;
	readonly violations: AccessibilityViolation[];
	readonly contrastFailures: ContrastFailure[];
	readonly keyboardNavGaps: string[];
	readonly missingLabels: string[];
}

/**
 * Minimum contrast ratios per WCAG standard.
 */
export const WCAG_CONTRAST_RATIOS = {
	AA_NORMAL_TEXT: 4.5,
	AA_LARGE_TEXT: 3.0,
	AAA_NORMAL_TEXT: 7.0,
	AAA_LARGE_TEXT: 4.5,
} as const;

/**
 * IAccessibilityComplianceService -- Accessibility validation.
 *
 * Validates contrast ratios (WCAG AA minimum 4.5:1), keyboard
 * accessibility, focus visibility, screen reader labels, semantic
 * hierarchy, and motion reduction support. Score 0-100 based on
 * WCAG compliance.
 */
export interface IAccessibilityComplianceService {
	readonly _serviceBrand: undefined;

	/** Check contrast ratio between foreground and background colors. */
	checkContrast(foreground: string, background: string): ContrastCheckResult;

	/** Audit keyboard navigation across all interactive elements. */
	auditKeyboardNav(): readonly KeyboardNavGap[];

	/** Validate that all interactive elements have visible focus indicators. */
	validateFocusVisibility(): readonly AccessibilityViolation[];

	/** Audit all elements for missing screen reader labels. */
	auditScreenReaderLabels(): readonly MissingScreenReaderLabel[];

	/** Compute overall accessibility score (0-100) based on WCAG compliance. */
	computeAccessibilityScore(): number;

	/** Get all current accessibility violations. */
	getViolations(): readonly AccessibilityViolation[];

	/** Event: fires when an accessibility violation is found. */
	readonly onViolationFound: Event<AccessibilityViolation>;

	/** Event: fires when the accessibility score is computed. */
	readonly onScoreComputed: Event<number>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SERVICE #127 -- IRenderingPerformanceService
// Performance-driven simplification: real performance numbers
// ═══════════════════════════════════════════════════════════════════════════════

export const IRenderingPerformanceService = createDecorator<IRenderingPerformanceService>('renderingPerformanceService');

/**
 * Render count measurement for a specific component or surface.
 */
export interface RenderMetric {
	readonly componentId: string;
	readonly renderCount: number;
	readonly repaintCount: number;
	readonly averageRenderDurationMs: number;
	readonly maxRenderDurationMs: number;
	readonly lastRenderTimestamp: number;
}

/**
 * Repaint frequency tracking result.
 */
export interface RepaintFrequencyMetric {
	readonly componentId: string;
	readonly repaintsPerSecond: number;
	readonly averageRepaintDurationMs: number;
	readonly totalRepaintTimeMs: number;
	readonly isExcessive: boolean;
}

/**
 * Panel cost estimation -- how much rendering resources a panel consumes.
 */
export interface PanelCostEstimate {
	readonly panelId: string;
	readonly domNodeCount: number;
	readonly layoutRecalculationCount: number;
	readonly styleRecalculationCount: number;
	readonly compositeLayerCount: number;
	readonly estimatedMemoryKB: number;
	readonly averageFrameTimeMs: number;
	readonly costRating: 'low' | 'medium' | 'high' | 'critical';
}

/**
 * Animation overhead measurement.
 */
export interface AnimationOverheadMetric {
	readonly animationId: string;
	readonly framesRendered: number;
	readonly droppedFrames: number;
	readonly averageFrameDurationMs: number;
	readonly maxFrameDurationMs: number;
	readonly causesJank: boolean;
	readonly jankSeverity: 'none' | 'minor' | 'moderate' | 'severe';
}

/**
 * Heavy surface identification.
 */
export interface HeavySurface {
	readonly surfaceId: string;
	readonly domNodeCount: number;
	readonly estimatedMemoryKB: number;
	readonly averageRenderTimeMs: number;
	readonly repaintFrequency: number;
	readonly recommendation: 'optimize' | 'simplify' | 'remove' | 'lazy-load';
	readonly estimatedSavingsMs: number;
}

/**
 * Performance issue detected during measurement.
 */
export interface PerformanceIssue {
	readonly issueId: string;
	readonly componentId: string;
	readonly issueType: 'excessive-repaint' | 'layout-thrash' | 'animation-jank' | 'memory-heavy' | 'dom-bloat';
	readonly measuredValue: number;
	readonly threshold: number;
	readonly severity: 'critical' | 'warning' | 'info';
	readonly description: string;
}

/**
 * Removal recommendation for performance improvement.
 */
export interface RemovalRecommendation {
	readonly componentId: string;
	readonly reason: string;
	readonly performanceImpactMs: number;
	readonly userFacingImpact: 'none' | 'minimal' | 'moderate';
	readonly alternative: string;
}

/**
 * IRenderingPerformanceService -- Performance-driven simplification.
 *
 * Measures render counts, repaint frequencies, panel costs, animation
 * overhead, and identifies memory-heavy surfaces. Produces real
 * performance numbers and concrete removal recommendations.
 */
export interface IRenderingPerformanceService {
	readonly _serviceBrand: undefined;

	/** Measure the render count for a specific component. */
	measureRenderCount(componentId: string): RenderMetric;

	/** Measure repaint frequency for a specific component. */
	measureRepaintFrequency(componentId: string, durationMs: number): RepaintFrequencyMetric;

	/** Estimate the rendering cost of a panel. */
	estimatePanelCost(panelId: string): PanelCostEstimate;

	/** Measure animation overhead for a running animation. */
	measureAnimationOverhead(animationId: string): AnimationOverheadMetric;

	/** Identify surfaces that consume excessive rendering resources. */
	identifyHeavySurfaces(): readonly HeavySurface[];

	/** Recommend components to remove for performance improvement. */
	recommendRemovals(): readonly RemovalRecommendation[];

	/** Event: fires when a heavy surface is identified. */
	readonly onHeavySurfaceFound: Event<HeavySurface>;

	/** Event: fires when a performance issue is detected. */
	readonly onPerformanceIssueDetected: Event<PerformanceIssue>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SERVICE #128 -- IProductSurfaceRebuildService
// Real product surface redesign: concrete layout values for every
// major product surface
// ═══════════════════════════════════════════════════════════════════════════════

export const IProductSurfaceRebuildService = createDecorator<IProductSurfaceRebuildService>('productSurfaceRebuildService');

/**
 * Sidebar surface specification with real layout values.
 */
export interface SidebarSpec {
	readonly width: number;
	readonly minWidth: number;
	readonly maxWidth: number;
	readonly sectionHeaderHeight: number;
	readonly sectionHeaderFontSize: number;
	readonly sectionHeaderFontWeight: number;
	readonly sectionHeaderPaddingLeft: number;
	readonly itemHeight: number;
	readonly itemFontSize: number;
	readonly itemPaddingLeft: number;
	readonly itemPaddingRight: number;
	readonly itemIconSize: number;
	readonly itemIconMarginRight: number;
	readonly itemHoverBackgroundColor: string;
	readonly itemActiveBackgroundColor: string;
	readonly itemSelectedBackgroundColor: string;
	readonly itemSelectedBorderLeft: string;
	readonly borderWidth: number;
	readonly borderColor: string;
	readonly backgroundColor: string;
	readonly sections: readonly string[];
	readonly iconSize: number;
}

/**
 * Activity bar specification with real layout values.
 */
export interface ActivityBarSpec {
	readonly width: number;
	readonly iconSize: number;
	readonly iconPaddingVertical: number;
	readonly iconPaddingHorizontal: number;
	readonly iconMarginBottom: number;
	readonly activeIndicatorWidth: number;
	readonly activeIndicatorColor: string;
	readonly activeBackgroundColor: string;
	readonly hoverBackgroundColor: string;
	readonly backgroundColor: string;
	readonly borderColor: string;
	readonly iconColorDefault: string;
	readonly iconColorHover: string;
	readonly iconColorActive: string;
	readonly iconColorDisabled: string;
	readonly badgeMinWidth: number;
	readonly badgeHeight: number;
	readonly badgeBorderRadius: number;
	readonly badgeFontSize: number;
	readonly badgeFontWeight: number;
	readonly badgeBackgroundColor: string;
	readonly badgeTextColor: string;
}

/**
 * Command surface specification with real layout values.
 */
export interface CommandSurfaceSpec {
	readonly inputHeight: number;
	readonly inputFontSize: number;
	readonly inputPaddingLeft: number;
	readonly inputPaddingRight: number;
	readonly inputBorderRadius: number;
	readonly inputBackgroundColor: string;
	readonly inputBorderColor: string;
	readonly inputFocusBorderColor: string;
	readonly resultItemHeight: number;
	readonly resultItemPaddingLeft: number;
	readonly resultItemFontSize: number;
	readonly resultItemIconSize: number;
	readonly resultItemIconMarginRight: number;
	readonly resultItemHoverBackgroundColor: string;
	readonly resultItemActiveBackgroundColor: string;
	readonly maxVisibleResults: number;
	readonly keyboardNavEnabled: boolean;
	readonly overlayBackgroundColor: string;
}

/**
 * AI panel specification with real layout values.
 */
export interface AIPanelSpec {
	readonly width: number;
	readonly minWidth: number;
	readonly maxWidth: number;
	readonly messagePaddingHorizontal: number;
	readonly messagePaddingVertical: number;
	readonly messageFontSize: number;
	readonly messageLineHeight: number;
	readonly messageMaxWidth: number;
	readonly userMessageBackgroundColor: string;
	readonly userMessageTextColor: string;
	readonly aiMessageBackgroundColor: string;
	readonly aiMessageTextColor: string;
	readonly inputAreaMinHeight: number;
	readonly inputAreaMaxHeight: number;
	readonly inputAreaPadding: number;
	readonly inputFontSize: number;
	readonly inputBorderRadius: number;
	readonly inputBorderColor: string;
	readonly inputFocusBorderColor: string;
	readonly statusIndicatorSize: number;
	readonly statusIndicatorMarginRight: number;
	readonly statusProcessingColor: string;
	readonly statusIdleColor: string;
	readonly statusErrorColor: string;
	readonly headerHeight: number;
	readonly headerFontSize: number;
	readonly headerFontWeight: number;
	readonly headerBorderColor: string;
}

/**
 * Timeline specification with real layout values.
 */
export interface TimelineSpec {
	readonly itemHeight: number;
	readonly itemPaddingLeft: number;
	readonly itemPaddingRight: number;
	readonly itemPaddingVertical: number;
	readonly itemFontSize: number;
	readonly itemSecondaryFontSize: number;
	readonly connectionLineWidth: number;
	readonly connectionLineColor: string;
	readonly stateIndicatorSize: number;
	readonly stateIndicatorMarginRight: number;
	readonly stateSuccessColor: string;
	readonly stateRunningColor: string;
	readonly stateFailedColor: string;
	readonly statePendingColor: string;
	readonly stateBlockedColor: string;
	readonly expandButtonSize: number;
	readonly expandButtonMarginRight: number;
	readonly headerHeight: number;
	readonly headerFontSize: number;
	readonly headerFontWeight: number;
	readonly groupHeaderHeight: number;
	readonly groupHeaderFontSize: number;
	readonly groupHeaderBackgroundColor: string;
	readonly maxVisibleItems: number;
}

/**
 * Status surface specification with real layout values.
 */
export interface StatusSurfaceSpec {
	readonly barHeight: number;
	readonly barBackgroundColor: string;
	readonly barBorderColor: string;
	readonly itemPaddingHorizontal: number;
	readonly itemFontSize: number;
	readonly itemIconSize: number;
	readonly itemIconMarginRight: number;
	readonly itemColor: string;
	readonly itemHoverBackgroundColor: string;
	readonly leftSectionMinWidth: number;
	readonly rightSectionMinWidth: number;
	readonly separatorColor: string;
	readonly separatorWidth: number;
	readonly separatorMarginHorizontal: number;
	readonly statusDotSize: number;
	readonly statusDotMarginRight: number;
	readonly remoteIndicatorColor: string;
	readonly branchIconSize: number;
	readonly errorWarningColor: string;
}

/**
 * Settings page specification with real layout values.
 */
export interface SettingsSpec {
	readonly searchInputHeight: number;
	readonly searchInputFontSize: number;
	readonly searchInputBorderRadius: number;
	readonly searchInputBorderColor: string;
	readonly searchInputFocusBorderColor: string;
	readonly categoryPaddingVertical: number;
	readonly categoryPaddingHorizontal: number;
	readonly categoryTitleFontSize: number;
	readonly categoryTitleFontWeight: number;
	readonly sectionMarginBottom: number;
	readonly settingItemHeight: number;
	readonly settingItemPaddingVertical: number;
	readonly settingItemPaddingHorizontal: number;
	readonly settingLabelFontSize: number;
	readonly settingDescriptionFontSize: number;
	readonly settingDescriptionColor: string;
	readonly controlHeight: number;
	readonly controlMinWidth: number;
	readonly controlBorderRadius: number;
	readonly controlBorderColor: string;
	readonly controlFocusBorderColor: string;
	readonly tabHeight: number;
	readonly tabFontSize: number;
	readonly tabActiveBorderColor: string;
	readonly sidebarWidth: number;
	readonly sidebarItemHeight: number;
	readonly sidebarItemFontSize: number;
	readonly sidebarItemPaddingLeft: number;
	readonly sidebarItemSelectedBackgroundColor: string;
}

/**
 * Onboarding specification with real layout values.
 */
export interface OnboardingSpec {
	readonly stepMinHeight: number;
	readonly stepPaddingHorizontal: number;
	readonly stepPaddingVertical: number;
	readonly titleFontSize: number;
	readonly titleFontWeight: number;
	readonly titleColor: string;
	readonly descriptionFontSize: number;
	readonly descriptionColor: string;
	readonly illustrationMaxWidth: number;
	readonly illustrationMaxHeight: number;
	readonly illustrationMarginBottom: number;
	readonly progressBarHeight: number;
	readonly progressBarBorderRadius: number;
	readonly progressBarTrackColor: string;
	readonly progressBarFillColor: string;
	readonly progressBarMarginBottom: number;
	readonly nextButtonMinWidth: number;
	readonly nextButtonHeight: number;
	readonly nextButtonFontSize: number;
	readonly nextButtonBorderRadius: number;
	readonly nextButtonBackgroundColor: string;
	readonly nextButtonTextColor: string;
	readonly skipButtonFontSize: number;
	readonly skipButtonColor: string;
	readonly stepIndicatorSize: number;
	readonly stepIndicatorMarginHorizontal: number;
	readonly stepIndicatorActiveColor: string;
	readonly stepIndicatorInactiveColor: string;
	readonly totalSteps: number;
	readonly canSkip: boolean;
}

/**
 * Complete surface specification for the product.
 */
export interface SurfaceSpec {
	readonly sidebar: SidebarSpec;
	readonly activityBar: ActivityBarSpec;
	readonly commandSurface: CommandSurfaceSpec;
	readonly aiPanel: AIPanelSpec;
	readonly timeline: TimelineSpec;
	readonly statusSurface: StatusSurfaceSpec;
	readonly settings: SettingsSpec;
	readonly onboarding: OnboardingSpec;
}

/**
 * Default sidebar spec with real pixel values.
 */
export const DEFAULT_SIDEBAR_SPEC: SidebarSpec = {
	width: 260,
	minWidth: 180,
	maxWidth: 400,
	sectionHeaderHeight: 24,
	sectionHeaderFontSize: 11,
	sectionHeaderFontWeight: 600,
	sectionHeaderPaddingLeft: 16,
	itemHeight: 28,
	itemFontSize: 13,
	itemPaddingLeft: 24,
	itemPaddingRight: 8,
	itemIconSize: 16,
	itemIconMarginRight: 6,
	itemHoverBackgroundColor: '#2A2F45',
	itemActiveBackgroundColor: '#313750',
	itemSelectedBackgroundColor: '#2D3350',
	itemSelectedBorderLeft: '2px solid #6366F1',
	borderWidth: 1,
	borderColor: '#2A2F45',
	backgroundColor: '#1A1D2B',
	sections: ['explorer', 'search', 'source-control', 'ai', 'execution', 'settings'],
	iconSize: 16,
};

/**
 * Default activity bar spec with real pixel values.
 */
export const DEFAULT_ACTIVITY_BAR_SPEC: ActivityBarSpec = {
	width: 48,
	iconSize: 24,
	iconPaddingVertical: 12,
	iconPaddingHorizontal: 12,
	iconMarginBottom: 0,
	activeIndicatorWidth: 2,
	activeIndicatorColor: '#6366F1',
	activeBackgroundColor: 'rgba(99,102,241,0.08)',
	hoverBackgroundColor: 'rgba(255,255,255,0.04)',
	backgroundColor: '#151720',
	borderColor: '#2A2F45',
	iconColorDefault: '#9DA2B9',
	iconColorHover: '#E4E6F0',
	iconColorActive: '#E4E6F0',
	iconColorDisabled: '#464C6A',
	badgeMinWidth: 16,
	badgeHeight: 16,
	badgeBorderRadius: 8,
	badgeFontSize: 10,
	badgeFontWeight: 600,
	badgeBackgroundColor: '#6366F1',
	badgeTextColor: '#FFFFFF',
};

/**
 * Default AI panel spec with real pixel values.
 */
export const DEFAULT_AI_PANEL_SPEC: AIPanelSpec = {
	width: 340,
	minWidth: 280,
	maxWidth: 480,
	messagePaddingHorizontal: 12,
	messagePaddingVertical: 8,
	messageFontSize: 13,
	messageLineHeight: 1.4,
	messageMaxWidth: 300,
	userMessageBackgroundColor: '#2A2F45',
	userMessageTextColor: '#E4E6F0',
	aiMessageBackgroundColor: '#1E2130',
	aiMessageTextColor: '#E4E6F0',
	inputAreaMinHeight: 36,
	inputAreaMaxHeight: 160,
	inputAreaPadding: 8,
	inputFontSize: 13,
	inputBorderRadius: 4,
	inputBorderColor: '#2A2F45',
	inputFocusBorderColor: '#6366F1',
	statusIndicatorSize: 8,
	statusIndicatorMarginRight: 6,
	statusProcessingColor: '#818CF8',
	statusIdleColor: '#6B7194',
	statusErrorColor: '#F87171',
	headerHeight: 40,
	headerFontSize: 13,
	headerFontWeight: 600,
	headerBorderColor: '#2A2F45',
};

/**
 * Default timeline spec with real pixel values.
 */
export const DEFAULT_TIMELINE_SPEC: TimelineSpec = {
	itemHeight: 40,
	itemPaddingLeft: 32,
	itemPaddingRight: 12,
	itemPaddingVertical: 8,
	itemFontSize: 13,
	itemSecondaryFontSize: 11,
	connectionLineWidth: 1,
	connectionLineColor: '#2A2F45',
	stateIndicatorSize: 8,
	stateIndicatorMarginRight: 8,
	stateSuccessColor: '#34D399',
	stateRunningColor: '#818CF8',
	stateFailedColor: '#F87171',
	statePendingColor: '#60A5FA',
	stateBlockedColor: '#FBBF24',
	expandButtonSize: 16,
	expandButtonMarginRight: 4,
	headerHeight: 36,
	headerFontSize: 13,
	headerFontWeight: 600,
	groupHeaderHeight: 28,
	groupHeaderFontSize: 11,
	groupHeaderBackgroundColor: '#1E2130',
	maxVisibleItems: 50,
};

/**
 * Default status surface spec with real pixel values.
 */
export const DEFAULT_STATUS_SURFACE_SPEC: StatusSurfaceSpec = {
	barHeight: 24,
	barBackgroundColor: '#151720',
	barBorderColor: '#2A2F45',
	itemPaddingHorizontal: 8,
	itemFontSize: 12,
	itemIconSize: 14,
	itemIconMarginRight: 4,
	itemColor: '#9DA2B9',
	itemHoverBackgroundColor: '#2A2F45',
	leftSectionMinWidth: 100,
	rightSectionMinWidth: 100,
	separatorColor: '#2A2F45',
	separatorWidth: 1,
	separatorMarginHorizontal: 6,
	statusDotSize: 6,
	statusDotMarginRight: 4,
	remoteIndicatorColor: '#6366F1',
	branchIconSize: 14,
	errorWarningColor: '#FBBF24',
};

/**
 * IProductSurfaceRebuildService -- Real product surface redesign.
 *
 * Defines concrete layout specifications for every major product surface:
 * sidebar, activity bar, command surface, AI panel, timeline,
 * status bar, settings, and onboarding. Every value is a real
 * pixel measurement, hex color, or CSS property -- not an
 * aspirational description.
 *
 * Design language: restrained, premium, calm, technical, minimal.
 */
export interface IProductSurfaceRebuildService {
	readonly _serviceBrand: undefined;

	/** Get the sidebar surface specification. */
	getSidebarSpec(): SidebarSpec;

	/** Get the activity bar specification. */
	getActivityBarSpec(): ActivityBarSpec;

	/** Get the command surface specification. */
	getCommandSurfaceSpec(): CommandSurfaceSpec;

	/** Get the AI panel specification. */
	getAIPanelSpec(): AIPanelSpec;

	/** Get the timeline specification. */
	getTimelineSpec(): TimelineSpec;

	/** Get the status surface specification. */
	getStatusSurfaceSpec(): StatusSurfaceSpec;

	/** Get the settings page specification. */
	getSettingsSpec(): SettingsSpec;

	/** Get the onboarding specification. */
	getOnboardingSpec(): OnboardingSpec;

	/** Event: fires when any surface specification is updated. */
	readonly onSurfaceSpecUpdated: Event<SurfaceSpec>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SERVICE #129 -- IProductRealityReportService
// Final product truth: honest assessment with no marketing language
// ═══════════════════════════════════════════════════════════════════════════════

export const IProductRealityReportService = createDecorator<IProductRealityReportService>('productRealityReportService');

/**
 * Surface grade assessment.
 */
export const enum SurfaceGrade {
	ProductionReady = 'production-ready',
	NeedsPolish = 'needs-polish',
	PartiallyFunctional = 'partially-functional',
	StubOnly = 'stub-only',
	NonExistent = 'non-existent',
}

/**
 * Surface reality assessment -- individual surface evaluation.
 */
export interface SurfaceRealityAssessment {
	readonly surfaceId: string;
	readonly grade: SurfaceGrade;
	readonly actuallyRenders: boolean;
	readonly renderParticipationScore: number;
	readonly hasRealInteraction: boolean;
	readonly hasAccessibility: boolean;
	readonly usesDesignTokens: boolean;
	readonly issues: readonly string[];
}

/**
 * Engineering gap -- what still needs real engineering work.
 */
export interface EngineeringGap {
	readonly gapId: string;
	readonly area: string;
	readonly description: string;
	readonly currentStatus: string;
	readonly requiredWork: string;
	readonly estimatedEffort: 'small' | 'medium' | 'large' | 'xlarge';
	readonly blockingLevel: 'blocker' | 'critical' | 'important' | 'nice-to-have';
}

/**
 * User experience assessment -- what a real user would encounter.
 */
export interface UserExperienceAssessment {
	readonly firstImpression: string;
	readonly functionalSurfaces: readonly string[];
	readonly brokenSurfaces: readonly string[];
	readonly missingSurfaces: readonly string[];
	readonly confusingSurfaces: readonly string[];
	readonly accessibilityBarriers: readonly string[];
	readonly performanceIssues: readonly string[];
	readonly overallFeeling: string;
}

/**
 * Complete product reality report -- no marketing language,
 * no exaggerated claims.
 */
export interface ProductRealityReport {
	readonly timestamp: number;
	readonly productionGradeSurfaces: string[];
	readonly fakeSurfaces: string[];
	readonly userExperienceAssessment: string;
	readonly engineeringGaps: string[];
	readonly renderParticipationScore: number;
	readonly accessibilityScore: number;
	readonly performanceScore: number;
	readonly overallProductReadiness: string;
	readonly honestAssessment: string;
}

/**
 * IProductRealityReportService -- Final product truth.
 *
 * Generates honest assessments of what feels production-grade,
 * what still feels fake, what actually renders, what users would
 * really experience, and what still needs real engineering.
 * No marketing language. No exaggerated claims.
 */
export interface IProductRealityReportService {
	readonly _serviceBrand: undefined;

	/** Generate a complete product reality report. */
	generateReport(): ProductRealityReport;

	/** Get the list of surfaces that are production-grade. */
	getProductionGradeSurfaces(): readonly SurfaceRealityAssessment[];

	/** Get the list of surfaces that are fake or stub-only. */
	getFakeSurfaces(): readonly SurfaceRealityAssessment[];

	/** Get an assessment of what a real user would experience. */
	getUserExperienceAssessment(): UserExperienceAssessment;

	/** Get the list of engineering gaps that still need real work. */
	getEngineeringGaps(): readonly EngineeringGap[];

	/** Event: fires when a product reality report is generated. */
	readonly onReportGenerated: Event<ProductRealityReport>;
}
