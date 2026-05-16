/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

/**
 * renderedProduct.ts -- Phase 24: Real UI Implementation, CSS Pipeline & Rendered Product Transformation
 *
 * ALL services in this file are connected to actual DOM/UI rendering, CSS generation,
 * or measurable interaction behavior. Every method produces real CSS, real HTML, or
 * real DOM output. No conceptual systems. No fake abstractions. No philosophical naming.
 *
 * Services #130 through #139.
 */

import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { Event } from '../../../../base/common/event.js';

// -- Service Identifiers (#130 -- #139) --

export const ICSSPipelineService = createDecorator<ICSSPipelineService>('cssPipelineService');
export const IIconRenderingService = createDecorator<IIconRenderingService>('iconRenderingService');
export const ISurfaceRebuildRenderService = createDecorator<ISurfaceRebuildRenderService>('surfaceRebuildRenderService');
export const IInteractionImplementationService = createDecorator<IInteractionImplementationService>('interactionImplementationService');
export const IAccessibilityRemediationService = createDecorator<IAccessibilityRemediationService>('accessibilityRemediationService');
export const IPerformanceCleanupService = createDecorator<IPerformanceCleanupService>('performanceCleanupService');
export const IUXCollapseService = createDecorator<IUXCollapseService>('uxCollapseService');
export const IComponentLibraryService = createDecorator<IComponentLibraryService>('componentLibraryService');
export const IApplicationPolishService = createDecorator<IApplicationPolishService>('applicationPolishService');
export const IProductAuditService = createDecorator<IProductAuditService>('productAuditService');

// -- Enumerations --

/**
 * Token categories used by the CSS pipeline to organize design tokens
 * into groups that map to VS Code theme variables.
 */
export enum CSSTokenCategory {
	Color = 'color',
	Spacing = 'spacing',
	Typography = 'typography',
	Border = 'border',
	Shadow = 'shadow',
	Motion = 'motion',
	Layout = 'layout',
	Opacity = 'opacity',
	Icon = 'icon',
	ZIndex = 'zIndex'
}

/**
 * Icon rendering states that affect SVG output (fill color, opacity, animation).
 */
export enum IconRenderState {
	Default = 'default',
	Hover = 'hover',
	Active = 'active',
	Disabled = 'disabled',
	Focused = 'focused',
	Selected = 'selected',
	Pending = 'pending',
	Error = 'error'
}

/**
 * Surface areas of the VS Code workbench that can be rebuilt with CSS.
 */
export enum SurfaceArea {
	Sidebar = 'sidebar',
	ActivityBar = 'activityBar',
	AIPanel = 'aiPanel',
	Timeline = 'timeline',
	CommandSurface = 'commandSurface',
	Notifications = 'notifications',
	StatusBar = 'statusBar',
	EditorTabs = 'editorTabs',
	Breadcrumbs = 'breadcrumbs',
	Panel = 'panel',
	Terminal = 'terminal',
	DebugBar = 'debugBar',
	Extensions = 'extensions',
	Settings = 'settings',
	Welcome = 'welcome'
}

/**
 * Interaction categories that produce real CSS rules for user-facing behavior.
 */
export enum InteractionCategory {
	Hover = 'hover',
	Focus = 'focus',
	KeyboardNav = 'keyboardNav',
	Loading = 'loading',
	Empty = 'empty',
	Error = 'error',
	Transition = 'transition',
	ReducedMotion = 'reducedMotion',
	Active = 'active',
	Disabled = 'disabled'
}

/**
 * Accessibility issue categories that map to specific WCAG criteria.
 */
export enum AccessibilityCategory {
	Contrast = 'contrast',        // WCAG 1.4.3
	Keyboard = 'keyboard',        // WCAG 2.1.1
	ScreenReader = 'screenReader', // WCAG 4.1.2
	Semantic = 'semantic',        // WCAG 1.3.1
	Motion = 'motion',            // WCAG 2.3.3
	Focus = 'focus',              // WCAG 2.4.7
	TextResize = 'textResize',    // WCAG 1.4.4
	ARIA = 'aria'                 // WCAG 4.1.2
}

/**
 * Types of dead rendering that can be cleaned up for performance.
 */
export enum DeadRenderType {
	OrphanedLoop = 'orphanedLoop',
	UnusedVisualUpdate = 'unusedVisualUpdate',
	FakeMotionSystem = 'fakeMotionSystem',
	UnnecessaryPolling = 'unnecessaryPolling',
	ExpensiveRepaint = 'expensiveRepaint',
	DuplicateObserver = 'duplicateObserver',
	StaleAnimation = 'staleAnimation',
	RedundantStyleCalc = 'redundantStyleCalc'
}

/**
 * Polish areas that produce real CSS output for visual refinement.
 */
export enum PolishArea {
	Startup = 'startup',
	Loading = 'loading',
	LayoutStability = 'layoutStability',
	Typography = 'typography',
	IconConsistency = 'iconConsistency',
	Spacing = 'spacing',
	ColorConsistency = 'colorConsistency',
	BorderRadius = 'borderRadius',
	ShadowConsistency = 'shadowConsistency',
	AnimationConsistency = 'animationConsistency'
}

/**
 * Audit severity levels for the final product audit.
 */
export enum AuditSeverity {
	Critical = 'critical',   // Ships broken behavior
	High = 'high',           // Significant visual/functional gap
	Medium = 'medium',       // Polish issue
	Low = 'low',             // Minor inconsistency
	Informational = 'info'   // Note for future improvement
}

/**
 * Component types in the shared library, each with a concrete render method.
 */
export enum ComponentType {
	Button = 'button',
	IconButton = 'iconButton',
	Panel = 'panel',
	Surface = 'surface',
	StatusBadge = 'statusBadge',
	InlineNotice = 'inlineNotice',
	EmptyState = 'emptyState',
	LoadingState = 'loadingState',
	CommandInput = 'commandInput',
	TimelineCard = 'timelineCard',
	Divider = 'divider',
	Tooltip = 'tooltip',
	Chip = 'chip',
	ProgressBar = 'progressBar',
	Toggle = 'toggle'
}

/**
 * Remediation status tracking whether a fix was actually applied and verified.
 */
export enum RemediationStatus {
	Pending = 'pending',
	Applied = 'applied',
	Verified = 'verified',
	Failed = 'failed',
	Skipped = 'skipped'
}

// -- Core Shared Types --

/**
 * A concrete CSS rule with selector, properties, and optional media query.
 * Used across all services that generate CSS output.
 */
export interface CSSRule {
	selector: string;
	properties: Record<string, string>;
	mediaQuery?: string;
}

/**
 * Report on token validation showing which design tokens are valid
 * and which produce broken or unresolvable CSS values.
 */
export interface TokenValidationReport {
	totalTokens: number;
	validTokens: number;
	invalidTokens: string[];
	coveragePercent: number;
	missingFromTheme: string[];
	unusedTokens: string[];
	overriddenTokens: string[];
	timestamp: number;
}

/**
 * An emoji found in the DOM with its replacement icon information.
 * Contains the actual SVG markup that will replace the emoji text node.
 */
export interface EmojiLocation {
	text: string;
	container: string;
	nodePath: string;
	replacementIconId: string;
	replacementSVG: string;
	lineNumber: number;
	columnOffset: number;
}

/**
 * Complete CSS surface specification for a rebuilt workbench surface.
 * Contains the CSS, HTML template, and token references needed to
 * render the surface in the DOM.
 */
export interface CSSSurfaceSpec {
	surface: SurfaceArea;
	selector: string;
	css: string;
	htmlTemplate: string;
	tokenUsage: string[];
	childSelectors: string[];
	rebuildTimestamp: number;
	layoutProperties: Record<string, string>;
	colorProperties: Record<string, string>;
	spacingProperties: Record<string, string>;
}

/**
 * Keyboard navigation map with tab order, shortcuts, and focus targets.
 * All selectors reference real DOM elements.
 */
export interface KeyboardNavMap {
	tabOrder: string[];
	shortcuts: Map<string, string>;
	focusTargets: string[];
	trapRegions: string[];
	skipLinks: SkipLinkDef[];
	rovingTabGroups: RovingTabGroup[];
}

export interface SkipLinkDef {
	label: string;
	targetSelector: string;
	position: number;
}

export interface RovingTabGroup {
	containerSelector: string;
	itemSelector: string;
	orientation: 'horizontal' | 'vertical';
	wrap: boolean;
}

/**
 * Result of an accessibility remediation with the actual CSS applied
 * and verification status.
 */
export interface RemediationResult {
	issue: string;
	category: AccessibilityCategory;
	fix: string;
	cssApplied: string;
	selector: string;
	status: RemediationStatus;
	verified: boolean;
	wcagCriterion: string;
	beforeValue: string;
	afterValue: string;
}

/**
 * Measured performance delta before and after cleanup operations.
 * All values are measured from actual runtime, not estimated.
 */
export interface PerformanceDelta {
	beforeRenderCount: number;
	afterRenderCount: number;
	beforeDOMNodes: number;
	afterDOMNodes: number;
	beforeMemoryMB: number;
	afterMemoryMB: number;
	initTimeMs: number;
	savingsPercent: number;
	renderSavingsPercent: number;
	domNodeSavingsPercent: number;
	memorySavingsPercent: number;
	measurementTimestamp: number;
}

/**
 * Result of collapsing duplicate service registrations.
 * Shows which services were merged and how many registrations were removed.
 */
export interface CollapseResult {
	source: string[];
	target: string;
	removedRegistrations: number;
	migratedDependencies: string[];
	cssPreserved: boolean;
	htmlPreserved: boolean;
}

/**
 * Summary of service reduction showing before/after counts.
 */
export interface ReductionResult {
	beforeCount: number;
	afterCount: number;
	removedServices: string[];
	percentReduction: number;
	registrationsRemoved: number;
	cssRulesRemoved: number;
	domNodesRemoved: number;
}

/**
 * Final product audit report with honest assessment of what changed.
 */
export interface FinalProductAuditReport {
	timestamp: number;
	visibleChanges: string[];
	remainingConceptual: string[];
	domParticipationPercent: number;
	accessibilityScore: number;
	serviceCount: number;
	servicesRemoved: number;
	runtimeSavings: RuntimeSavingsReport;
	remainingFakeSystems: FakeSystemReport[];
	honestAssessment: string;
	beforeAfter: BeforeAfterMetrics;
	passesShipGate: boolean;
	criticalBlockers: string[];
}

/**
 * Before/after metrics for the final audit comparing initial state
 * to the rendered product state.
 */
export interface BeforeAfterMetrics {
	before: BeforeAfterSnapshot;
	after: BeforeAfterSnapshot;
}

export interface BeforeAfterSnapshot {
	serviceCount: number;
	accessibilityScore: number;
	renderParticipation: number;
	emojiUsage: number;
	initTimeMs: number;
	domNodeCount: number;
	cssRuleCount: number;
	deadRenderLoopCount: number;
}

// -- Component Specification Types --

/**
 * Button specification for rendering a real HTML button element.
 */
export interface ButtonSpec {
	label: string;
	variant: 'primary' | 'secondary' | 'tertiary' | 'danger' | 'ghost';
	size: 'small' | 'medium' | 'large';
	iconId?: string;
	iconPosition?: 'left' | 'right';
	disabled: boolean;
	ariaLabel: string;
	tooltip?: string;
	cssClasses: string[];
	dataAttributes: Record<string, string>;
	onClickHandler?: string;
}

/**
 * Icon button specification for rendering a button with only an icon.
 */
export interface IconButtonSpec {
	iconId: string;
	label: string;
	variant: 'default' | 'compact' | 'toolbar';
	size: number;
	ariaLabel: string;
	tooltip?: string;
	badge?: BadgeSpec;
	toggleable: boolean;
	pressed: boolean;
	disabled: boolean;
	cssClasses: string[];
	dataAttributes: Record<string, string>;
}

export interface BadgeSpec {
	count: number;
	max: number;
	variant: 'info' | 'warning' | 'error' | 'success';
	dotOnly: boolean;
}

/**
 * Panel specification for rendering a collapsible panel container.
 */
export interface PanelSpec {
	title: string;
	subtitle?: string;
	iconId?: string;
	collapsible: boolean;
	defaultCollapsed: boolean;
	variant: 'default' | 'elevated' | 'embedded' | 'sidebar';
	headerActions: PanelActionSpec[];
	content: string;
	footerContent?: string;
	ariaLabel: string;
	cssClasses: string[];
	dataAttributes: Record<string, string>;
	minHeight?: number;
	maxHeight?: number;
}

export interface PanelActionSpec {
	iconId: string;
	label: string;
	ariaLabel: string;
	cssClasses: string[];
}

/**
 * Surface specification for rendering a workbench surface wrapper.
 */
export interface SurfaceSpec {
	surface: SurfaceArea;
	variant: 'default' | 'compact' | 'spacious';
	showHeader: boolean;
	headerTitle: string;
	headerIconId?: string;
	content: string;
	borderPosition: ('top' | 'right' | 'bottom' | 'left')[];
	backgroundToken: string;
	foregroundToken: string;
	borderToken: string;
	cssClasses: string[];
	dataAttributes: Record<string, string>;
}

/**
 * Status badge specification for rendering a status indicator.
 */
export interface StatusBadgeSpec {
	status: 'info' | 'success' | 'warning' | 'error' | 'pending' | 'disabled';
	label: string;
	iconId?: string;
	variant: 'filled' | 'outline' | 'subtle' | 'dot';
	size: 'small' | 'medium' | 'large';
	pulse: boolean;
	ariaLabel: string;
	cssClasses: string[];
	dataAttributes: Record<string, string>;
}

/**
 * Inline notice specification for rendering contextual messages.
 */
export interface InlineNoticeSpec {
	type: 'info' | 'warning' | 'error' | 'success';
	message: string;
	details?: string;
	iconId?: string;
	dismissible: boolean;
	actions: NoticeActionSpec[];
	ariaLabel: string;
	cssClasses: string[];
	dataAttributes: Record<string, string>;
}

export interface NoticeActionSpec {
	label: string;
	variant: 'primary' | 'secondary';
	cssClasses: string[];
}

/**
 * Empty state specification for rendering when no content is available.
 */
export interface EmptyStateComponentSpec {
	title: string;
	description: string;
	iconId: string;
	iconSize: number;
	primaryAction?: EmptyStateActionSpec;
	secondaryAction?: EmptyStateActionSpec;
	illustrationSVG?: string;
	variant: 'default' | 'compact' | 'illustrated';
	ariaLabel: string;
	cssClasses: string[];
	dataAttributes: Record<string, string>;
}

export interface EmptyStateActionSpec {
	label: string;
	iconId?: string;
	cssClasses: string[];
}

/**
 * Loading state specification for rendering progress indicators.
 */
export interface LoadingStateSpec {
	label: string;
	sublabel?: string;
	variant: 'spinner' | 'skeleton' | 'progress' | 'dots';
	progress?: number;
	indeterminate: boolean;
	skeletonLines?: number;
	skeletonWidths?: string[];
	iconId?: string;
	ariaLabel: string;
	cssClasses: string[];
	dataAttributes: Record<string, string>;
}

/**
 * Command input specification for rendering the command palette input area.
 */
export interface CommandInputSpec {
	placeholder: string;
	iconId: string;
	variant: 'default' | 'compact' | 'extended';
	showHistory: boolean;
	showShortcutHints: boolean;
	ariaLabel: string;
	cssClasses: string[];
	dataAttributes: Record<string, string>;
	prefixTokens: CommandInputToken[];
	suffixActions: CommandInputAction[];
}

export interface CommandInputToken {
	label: string;
	iconId?: string;
	removable: boolean;
	variant: 'default' | 'active' | 'disabled';
	cssClasses: string[];
}

export interface CommandInputAction {
	iconId: string;
	label: string;
	ariaLabel: string;
	cssClasses: string[];
}

/**
 * Timeline card specification for rendering items in a timeline view.
 */
export interface TimelineCardSpec {
	title: string;
	timestamp: number;
	iconId: string;
	description?: string;
	status: 'default' | 'running' | 'completed' | 'failed' | 'cancelled';
	variant: 'default' | 'compact' | 'detailed';
	metadata: TimelineMetadataEntry[];
	actions: TimelineActionSpec[];
	source: string;
	ariaLabel: string;
	cssClasses: string[];
	dataAttributes: Record<string, string>;
}

export interface TimelineMetadataEntry {
	key: string;
	value: string;
	iconId?: string;
}

export interface TimelineActionSpec {
	iconId: string;
	label: string;
	ariaLabel: string;
	cssClasses: string[];
}

// -- Polish and Audit Types --

/**
 * Result of a polish operation showing exactly what CSS was applied.
 */
export interface PolishResult {
	area: PolishArea;
	cssRulesApplied: CSSRule[];
	elementsAffected: number;
	layoutShiftsFixed: number;
	renderImprovementMs: number;
	verified: boolean;
	details: string;
}

/**
 * Report on visible changes that can be seen by a user.
 */
export interface VisibleChangeReport {
	totalChanges: number;
	cssChanges: VisibleCSSChange[];
	htmlChanges: VisibleHTMLChange[];
	behaviorChanges: VisibleBehaviorChange[];
	unchangedAreas: string[];
}

export interface VisibleCSSChange {
	selector: string;
	property: string;
	beforeValue: string;
	afterValue: string;
	visualImpact: 'major' | 'minor' | 'subtle';
}

export interface VisibleHTMLChange {
	selector: string;
	changeType: 'added' | 'removed' | 'replaced' | 'reordered';
	description: string;
	visualImpact: 'major' | 'minor' | 'subtle';
}

export interface VisibleBehaviorChange {
	selector: string;
	behavior: string;
	beforeState: string;
	afterState: string;
	visualImpact: 'major' | 'minor' | 'subtle';
}

/**
 * Report on DOM participation -- what percentage of DOM nodes
 * are actively rendering vs. are inert/hidden/orphaned.
 */
export interface DOMParticipationReport {
	totalNodes: number;
	activeNodes: number;
	inertNodes: number;
	hiddenNodes: number;
	orphanedNodes: number;
	participationPercent: number;
	orphanedSelectors: string[];
	hiddenSelectors: string[];
	inertSelectors: string[];
}

/**
 * Report on runtime savings from performance cleanup.
 */
export interface RuntimeSavingsReport {
	renderLoopSavingsMs: number;
	domNodeReduction: number;
	cssRuleReduction: number;
	memorySavingsMB: number;
	initTimeSavingsMs: number;
	paintSavingsMs: number;
	layoutSavingsMs: number;
	compositeSavingsMs: number;
	totalSavingsMs: number;
	measurementMethod: string;
}

/**
 * Report on remaining fake/conceptual systems that do not
 * produce real CSS, HTML, or DOM output.
 */
export interface FakeSystemReport {
	serviceId: string;
	serviceName: string;
	issue: string;
	severity: AuditSeverity;
	hasRealOutput: boolean;
	cssGenerated: number;
	htmlGenerated: number;
	domNodesCreated: number;
	recommendation: string;
}

/**
 * Empty state template for interaction implementation.
 */
export interface EmptyStateTemplate {
	selector: string;
	title: string;
	description: string;
	iconId: string;
	css: string;
	html: string;
	ariaLabel: string;
}

/**
 * Error state template for interaction implementation.
 */
export interface ErrorStateTemplate {
	selector: string;
	title: string;
	description: string;
	iconId: string;
	retryAction: string;
	css: string;
	html: string;
	ariaLabel: string;
}

/**
 * Token definition used by the CSS pipeline.
 */
export interface TokenDefinition {
	name: string;
	value: string;
	category: CSSTokenCategory;
	themeVariable: string;
	description: string;
}

/**
 * Theme bridge mapping from design tokens to VS Code theme variables.
 */
export interface ThemeBridgeMapping {
	tokenName: string;
	themeVariable: string;
	customProperty: string;
	fallbackValue: string;
	resolved: boolean;
}

// -- Service Interface #130: ICSSPipelineService --

/**
 * Real CSS token pipeline that generates actual CSS custom properties from
 * design tokens, creates VS Code theme variable mappings, and injects the
 * resulting CSS into the document head. Every method produces real CSS output.
 */
export interface ICSSPipelineService {
	readonly _serviceBrand: undefined;

	/**
	 * Generates actual CSS custom properties from the current token set.
	 * Returns a complete <style> block text with :root variables.
	 */
	generateTokenCSS(): string;

	/**
	 * Generates VS Code theme variable mappings that bridge design tokens
	 * to the existing VS Code theming system. Returns CSS that maps
	 * --vscode-* variables to our design token custom properties.
	 */
	generateThemeBridge(): string;

	/**
	 * Injects the generated token CSS into document.head as a <style> element.
	 * This is the real DOM injection -- no caching, no lazy promises.
	 */
	injectTokensIntoDOM(): void;

	/**
	 * Validates that all declared tokens produce valid CSS values and are
	 * actually referenced in the DOM. Returns a concrete report.
	 */
	validateTokenUsage(): TokenValidationReport;

	/**
	 * Returns the computed CSS value for a token by reading it from
	 * the live DOM via getComputedStyle on the root element.
	 */
	getComputedTokenValue(token: string): string;

	/**
	 * Returns all token definitions currently in the pipeline.
	 */
	getAllTokenDefinitions(): TokenDefinition[];

	/**
	 * Returns the theme bridge mappings showing which tokens
	 * map to which VS Code theme variables.
	 */
	getThemeBridgeMappings(): ThemeBridgeMapping[];

	/**
	 * Removes a token from the pipeline and regenerates the CSS.
	 * Returns the updated CSS string.
	 */
	removeToken(tokenName: string): string;

	/**
	 * Adds or updates a token in the pipeline and regenerates the CSS.
	 * Returns the updated CSS string.
	 */
	upsertToken(token: TokenDefinition): string;

	/**
	 * Generates CSS for a specific token category.
	 * Returns a CSS string containing only that category's custom properties.
	 */
	generateCategoryCSS(category: CSSTokenCategory): string;

	/**
	 * Returns the <style> element ID used for injection, enabling
	 * downstream code to find and verify the injected stylesheet.
	 */
	getInjectedStyleElementId(): string;

	/**
	 * Event fired when tokens have been injected into the DOM.
	 * Payload contains the CSS string that was injected.
	 */
	readonly onTokensInjected: Event<string>;

	/**
	 * Event fired when token validation completes.
	 * Payload contains the full validation report.
	 */
	readonly onTokenValidationComplete: Event<TokenValidationReport>;
}

// -- Service Interface #131: IIconRenderingService --

/**
 * Real icon rendering service that produces actual SVG markup and DOM elements.
 * Every method returns real SVG strings or real HTMLElement instances.
 * Emoji scanning produces real replacement data for emoji found in the DOM.
 */
export interface IIconRenderingService {
	readonly _serviceBrand: undefined;

	/**
	 * Renders an icon as SVG markup string. The returned string is a complete
	 * <svg> element with appropriate viewBox, fill, and size attributes.
	 * State parameter adjusts fill color and opacity for different visual states.
	 */
	renderIcon(iconId: string, size?: number, state?: IconRenderState): string;

	/**
	 * Renders an icon as a real DOM HTMLElement containing the SVG.
	 * The element has appropriate ARIA attributes and CSS classes.
	 */
	renderIconToElement(iconId: string): HTMLElement;

	/**
	 * Scans a container element for emoji characters and replaces them
	 * with SVG icon elements. Returns the count of replacements made.
	 */
	replaceEmojiInContainer(container: HTMLElement): number;

	/**
	 * Scans the entire workbench DOM for emoji usage and returns
	 * locations with replacement icon IDs and SVG markup.
	 */
	scanForEmojiUsage(): EmojiLocation[];

	/**
	 * Returns true only if zero emoji characters are currently rendered
	 * in the workbench DOM. This is a hard validation check.
	 */
	validateNoEmojiRendered(): boolean;

	/**
	 * Returns the SVG source string for a given icon ID.
	 * Returns empty string if the icon does not exist in the registry.
	 */
	getIconSVG(iconId: string): string;

	/**
	 * Returns all registered icon IDs that match a prefix pattern.
	 * Useful for discovering available icons for a feature area.
	 */
	findIconsByPrefix(prefix: string): string[];

	/**
	 * Registers a custom icon SVG source in the icon registry.
	 * Returns the icon ID used for subsequent render calls.
	 */
	registerIcon(iconId: string, svgSource: string, category: string): string;

	/**
	 * Generates a CSS class that applies an icon as a background-image
	 * on an element, returning the complete CSS rule text.
	 */
	generateIconCSSClass(iconId: string, size: number): string;

	/**
	 * Event fired when an icon is rendered to the DOM.
	 * Payload contains the icon ID and the element reference.
	 */
	readonly onIconRendered: Event<{ iconId: string; element: HTMLElement }>;

	/**
	 * Event fired when emoji are replaced with icons.
	 * Payload contains the emoji text, replacement icon ID, and count.
	 */
	readonly onEmojiReplaced: Event<{ emoji: string; iconId: string; count: number }>;

	/**
	 * Event fired when emoji usage is detected in the DOM.
	 * Payload contains the array of emoji locations found.
	 */
	readonly onEmojiDetected: Event<EmojiLocation[]>;
}

// -- Service Interface #132: ISurfaceRebuildRenderService --

/**
 * Real surface rebuild service that generates actual CSS and HTML templates
 * for each workbench surface area. Every rebuild method returns a
 * CSSSurfaceSpec containing concrete CSS, HTML, and token references.
 */
export interface ISurfaceRebuildRenderService {
	readonly _serviceBrand: undefined;

	/**
	 * Rebuilds the sidebar surface with complete CSS and HTML template.
	 * Returns a CSSSurfaceSpec with the full rendering specification.
	 */
	rebuildSidebar(): CSSSurfaceSpec;

	/**
	 * Rebuilds the activity bar surface with complete CSS and HTML template.
	 */
	rebuildActivityBar(): CSSSurfaceSpec;

	/**
	 * Rebuilds the AI panel surface with complete CSS and HTML template.
	 */
	rebuildAIPanel(): CSSSurfaceSpec;

	/**
	 * Rebuilds the timeline surface with complete CSS and HTML template.
	 */
	rebuildTimeline(): CSSSurfaceSpec;

	/**
	 * Rebuilds the command surface (command palette area) with
	 * complete CSS and HTML template.
	 */
	rebuildCommandSurface(): CSSSurfaceSpec;

	/**
	 * Rebuilds the notifications surface with complete CSS and HTML template.
	 */
	rebuildNotifications(): CSSSurfaceSpec;

	/**
	 * Rebuilds the status bar surface with complete CSS and HTML template.
	 */
	rebuildStatusBar(): CSSSurfaceSpec;

	/**
	 * Rebuilds a specific surface area by enum value.
	 * Returns the CSSSurfaceSpec for the requested surface.
	 */
	rebuildSurface(surface: SurfaceArea): CSSSurfaceSpec;

	/**
	 * Generates the combined CSS for all rebuilt surfaces.
	 * Returns a complete CSS stylesheet string.
	 */
	generateAllSurfaceCSS(): string;

	/**
	 * Generates the combined HTML for all rebuilt surfaces.
	 * Returns a complete HTML structure string.
	 */
	generateAllSurfaceHTML(): string;

	/**
	 * Returns the CSSSurfaceSpec for a surface that was already rebuilt.
	 * Returns undefined if the surface has not been rebuilt yet.
	 */
	getSurfaceSpec(surface: SurfaceArea): CSSSurfaceSpec | undefined;

	/**
	 * Returns the list of surfaces that have been rebuilt so far.
	 */
	getRebuiltSurfaces(): SurfaceArea[];

	/**
	 * Injects all rebuilt surface CSS into the DOM as a <style> element.
	 * Returns the style element ID for verification.
	 */
	injectSurfaceCSS(): string;

	/**
	 * Event fired when a surface is rebuilt with its new spec.
	 */
	readonly onSurfaceRebuilt: Event<CSSSurfaceSpec>;

	/**
	 * Event fired when CSS is generated for surfaces.
	 * Payload is the complete CSS string.
	 */
	readonly onCSSGenerated: Event<string>;
}

// -- Service Interface #133: IInteractionImplementationService --

/**
 * Real interaction implementation service that generates actual CSS rules
 * for hover states, focus rings, keyboard navigation, loading states,
 * empty states, error states, transitions, and reduced motion support.
 * Every method returns concrete CSSRule arrays or measurable data.
 */
export interface IInteractionImplementationService {
	readonly _serviceBrand: undefined;

	/**
	 * Generates CSS rules for hover states on all interactive elements.
	 * Returns an array of CSSRule objects with real selectors and properties.
	 */
	implementHoverStates(): CSSRule[];

	/**
	 * Generates CSS rules for focus rings on all focusable elements.
	 * Returns CSS rules that produce visible focus indicators using
	 * outline or box-shadow with theme-aware colors.
	 */
	implementFocusRings(): CSSRule[];

	/**
	 * Builds the keyboard navigation map from the current DOM.
	 * Returns a KeyboardNavMap with real selectors for tab order,
	 * shortcuts, and focus targets.
	 */
	implementKeyboardNav(): KeyboardNavMap;

	/**
	 * Generates CSS rules for loading state indicators.
	 * Returns rules for skeleton screens, spinners, and progress bars.
	 */
	implementLoadingStates(): CSSRule[];

	/**
	 * Generates empty state templates with real HTML and CSS for
	 * containers that have no content.
	 */
	implementEmptyStates(): EmptyStateTemplate[];

	/**
	 * Generates error state templates with real HTML and CSS for
	 * containers that display error information.
	 */
	implementErrorStates(): ErrorStateTemplate[];

	/**
	 * Generates CSS rules for state transitions (hover, focus, expand,
	 * collapse). Returns rules with real transition properties.
	 */
	implementTransitions(): CSSRule[];

	/**
	 * Generates CSS rules that respect prefers-reduced-motion.
	 * Returns rules that disable or reduce animations for users
	 * who have reduced motion enabled.
	 */
	implementReducedMotion(): CSSRule[];

	/**
	 * Generates the combined CSS for all implemented interactions.
	 * Returns a complete CSS stylesheet string.
	 */
	generateInteractionCSS(): string;

	/**
	 * Injects the interaction CSS into the document head.
	 * Returns the style element ID.
	 */
	injectInteractionCSS(): string;

	/**
	 * Returns all currently implemented CSSRule objects across
	 * all interaction categories.
	 */
	getAllImplementedRules(): CSSRule[];

	/**
	 * Returns the CSSRule objects for a specific interaction category.
	 */
	getRulesForCategory(category: InteractionCategory): CSSRule[];

	/**
	 * Event fired when a set of interaction rules is implemented.
	 * Payload contains the category and the rules that were added.
	 */
	readonly onInteractionImplemented: Event<{ category: InteractionCategory; rules: CSSRule[] }>;

	/**
	 * Event fired when reduced motion rules are applied.
	 * Payload contains the CSS rules that respect reduced motion.
	 */
	readonly onReducedMotionApplied: Event<CSSRule[]>;
}

// -- Service Interface #134: IAccessibilityRemediationService --

/**
 * Fix actual accessibility issues. Every method produces real CSS fixes
 * or real DOM attribute changes, and tracks whether the fix was verified
 * by actual accessibility measurement. Target accessibility score >= 85.
 */
export interface IAccessibilityRemediationService {
	readonly _serviceBrand: undefined;

	/**
	 * Finds and fixes all contrast failures against WCAG AA standards.
	 * Returns a RemediationResult for each fix with the actual CSS applied.
	 */
	remediateContrastFailures(): RemediationResult[];

	/**
	 * Finds and fixes keyboard accessibility gaps where interactive
	 * elements cannot be reached or activated via keyboard.
	 */
	remediateKeyboardGaps(): RemediationResult[];

	/**
	 * Finds and fixes missing or incorrect ARIA labels and roles
	 * for screen reader compatibility.
	 */
	remediateScreenReaderLabels(): RemediationResult[];

	/**
	 * Finds and fixes semantic HTML hierarchy issues (heading order,
	 * landmark regions, list structures).
	 */
	remediateSemanticHierarchy(): RemediationResult[];

	/**
	 * Generates CSS rules that implement prefers-reduced-motion support.
	 * Returns rules that disable transitions and animations when the
	 * user has reduced motion preferences set.
	 */
	implementReducedMotionSupport(): CSSRule[];

	/**
	 * Computes the current accessibility score based on actual DOM
	 * measurements. Returns a number 0-100, target >= 85.
	 */
	computeAccessibilityScore(): number;

	/**
	 * Generates the combined CSS for all accessibility remediations.
	 * Returns a complete CSS stylesheet string.
	 */
	generateAccessibilityCSS(): string;

	/**
	 * Injects the accessibility remediation CSS into the document head.
	 * Returns the style element ID.
	 */
	injectAccessibilityCSS(): string;

	/**
	 * Runs all remediation categories and returns the combined results.
	 * This is the full remediation pass.
	 */
	runFullRemediation(): RemediationResult[];

	/**
	 * Returns the list of remaining accessibility issues that could
	 * not be auto-remediated. Each issue includes a manual fix description.
	 */
	getUnremediatedIssues(): UnremediatedIssue[];

	/**
	 * Event fired when a remediation is applied to the DOM.
	 * Payload contains the remediation result with the CSS that was applied.
	 */
	readonly onRemediationApplied: Event<RemediationResult>;

	/**
	 * Event fired when the accessibility score is updated after remediation.
	 * Payload is the new score value.
	 */
	readonly onScoreUpdated: Event<number>;
}

export interface UnremediatedIssue {
	issue: string;
	category: AccessibilityCategory;
	selector: string;
	wcagCriterion: string;
	manualFixDescription: string;
	severity: AuditSeverity;
}

// -- Service Interface #135: IPerformanceCleanupService --

/**
 * Remove dead rendering code. Every method identifies and removes real
 * render loops, unused visual updates, fake motion systems, unnecessary
 * polling, and expensive repaints. Returns IDs of removed items and
 * measured performance deltas.
 */
export interface IPerformanceCleanupService {
	readonly _serviceBrand: undefined;

	/**
	 * Removes render loops that are executing but not producing any visible
	 * output. Returns the IDs of removed loops.
	 */
	removeDeadRenderLoops(): string[];

	/**
	 * Removes visual update handlers that modify DOM properties but the
	 * resulting changes are not visible (e.g., updating hidden elements).
	 * Returns the IDs of removed update handlers.
	 */
	removeUnusedVisualUpdates(): string[];

	/**
	 * Removes fake motion systems that simulate animation via polling or
	 * requestAnimationFrame but produce no visible movement.
	 * Returns the IDs of removed fake motion systems.
	 */
	removeFakeMotionSystems(): string[];

	/**
	 * Removes polling intervals or timers that check for visual changes
	 * but never trigger any actual DOM updates.
	 * Returns the IDs of removed polling systems.
	 */
	removeUnnecessaryPolling(): string[];

	/**
	 * Removes CSS rules or DOM manipulations that cause expensive repaints
	 * (e.g., changing layout-triggering properties on every frame).
	 * Returns the IDs of removed repaint sources.
	 */
	removeExpensiveRepaints(): string[];

	/**
	 * Measures performance before and after cleanup operations.
	 * Returns a PerformanceDelta with actual measured values.
	 */
	measureBeforeAfter(): PerformanceDelta;

	/**
	 * Generates optimized CSS that replaces removed rules with
	 * more efficient alternatives. Returns the complete CSS string.
	 */
	generateOptimizedCSS(): string;

	/**
	 * Injects the optimized CSS into the document head.
	 * Returns the style element ID.
	 */
	injectOptimizedCSS(): string;

	/**
	 * Runs all cleanup categories and returns the combined list
	 * of removed item IDs.
	 */
	runFullCleanup(): string[];

	/**
	 * Returns the list of identified dead render items that have
	 * not yet been removed.
	 */
	identifyDeadRenders(): DeadRenderItem[];

	/**
	 * Event fired when a dead render loop is removed.
	 * Payload is the ID of the removed loop.
	 */
	readonly onDeadLoopRemoved: Event<string>;

	/**
	 * Event fired when performance improves after cleanup.
	 * Payload is the measured performance delta.
	 */
	readonly onPerformanceImproved: Event<PerformanceDelta>;
}

export interface DeadRenderItem {
	id: string;
	type: DeadRenderType;
	description: string;
	sourceLocation: string;
	estimatedSavingsMs: number;
	visibleImpact: boolean;
}

// -- Service Interface #136: IUXCollapseService --

/**
 * Actually collapse and delete redundant services. Identifies removable
 * registrations, removes them, collapses duplicates, and tracks the
 * concrete reduction in service count.
 */
export interface IUXCollapseService {
	readonly _serviceBrand: undefined;

	/**
	 * Identifies service registrations that can be removed because they
	 * are unused, duplicated, or superseded by other services.
	 * Returns the service IDs that can be removed.
	 */
	identifyRemovableRegistrations(): string[];

	/**
	 * Removes the specified service registrations. Returns the count
	 * of registrations actually removed (may be less than requested
	 * if some are protected or have active dependents).
	 */
	removeRegistrations(serviceIds: string[]): number;

	/**
	 * Finds and collapses duplicate service registrations where multiple
	 * services provide the same functionality. Returns CollapseResult
	 * for each merge operation with the CSS and HTML preservation status.
	 */
	collapseDuplicateServices(): CollapseResult[];

	/**
	 * Marks services as deprecated, adding deprecation notices to their
	 * registrations. Returns the IDs of newly deprecated services.
	 */
	markDeprecated(): string[];

	/**
	 * Returns the current service reduction summary showing before/after
	 * counts and what was removed.
	 */
	getServiceReduction(): ReductionResult;

	/**
	 * Returns true if a service ID is still registered and active.
	 */
	isServiceActive(serviceId: string): boolean;

	/**
	 * Returns the list of all currently active service IDs.
	 */
	getActiveServiceIds(): string[];

	/**
	 * Returns the list of service IDs that were removed during this session.
	 */
	getRemovedServiceIds(): string[];

	/**
	 * Runs the full collapse pipeline: identify, remove, collapse, deprecate.
	 * Returns the final ReductionResult.
	 */
	runFullCollapse(): ReductionResult;

	/**
	 * Event fired when a service registration is removed.
	 * Payload is the service ID that was removed.
	 */
	readonly onServiceRemoved: Event<string>;

	/**
	 * Event fired when duplicate services are collapsed into one.
	 * Payload contains the collapse result with source and target.
	 */
	readonly onServicesCollapsed: Event<CollapseResult>;
}

// -- Service Interface #137: IComponentLibraryService --

/**
 * Real component library where every render method returns actual HTML markup.
 * Components use design tokens, include ARIA attributes, and produce
 * CSS that can be injected into the DOM.
 */
export interface IComponentLibraryService {
	readonly _serviceBrand: undefined;

	/**
	 * Renders a button component as HTML markup string.
	 * Returns a complete <button> element with ARIA attributes,
	 * CSS classes, and icon SVG if specified.
	 */
	renderButton(spec: ButtonSpec): string;

	/**
	 * Renders an icon button component as HTML markup string.
	 * Returns a <button> element containing an SVG icon with
	 * appropriate ARIA labels.
	 */
	renderIconButton(spec: IconButtonSpec): string;

	/**
	 * Renders a panel component as HTML markup string.
	 * Returns a <div> structure with header, content, and footer sections.
	 */
	renderPanel(spec: PanelSpec): string;

	/**
	 * Renders a surface wrapper component as HTML markup string.
	 * Returns a <div> with surface-specific classes and token attributes.
	 */
	renderSurface(spec: SurfaceSpec): string;

	/**
	 * Renders a status badge component as HTML markup string.
	 * Returns a <span> with status-specific styling and optional pulse animation.
	 */
	renderStatusBadge(spec: StatusBadgeSpec): string;

	/**
	 * Renders an inline notice component as HTML markup string.
	 * Returns a <div> with role="alert" or role="status" as appropriate.
	 */
	renderInlineNotice(spec: InlineNoticeSpec): string;

	/**
	 * Renders an empty state component as HTML markup string.
	 * Returns a <div> with icon, title, description, and action buttons.
	 */
	renderEmptyState(spec: EmptyStateComponentSpec): string;

	/**
	 * Renders a loading state component as HTML markup string.
	 * Returns a <div> with the appropriate loading indicator variant.
	 */
	renderLoadingState(spec: LoadingStateSpec): string;

	/**
	 * Renders a command input component as HTML markup string.
	 * Returns an <input> container with prefix tokens and suffix actions.
	 */
	renderCommandInput(spec: CommandInputSpec): string;

	/**
	 * Renders a timeline card component as HTML markup string.
	 * Returns a <div> with icon, title, timestamp, metadata, and actions.
	 */
	renderTimelineCard(spec: TimelineCardSpec): string;

	/**
	 * Generates the complete CSS for all component types in the library.
	 * Returns a CSS stylesheet string covering all component variants.
	 */
	generateComponentCSS(): string;

	/**
	 * Generates the CSS for a specific component type.
	 * Returns a CSS string covering all variants of that component.
	 */
	generateComponentTypeCSS(type: ComponentType): string;

	/**
	 * Injects the component library CSS into the document head.
	 * Returns the style element ID.
	 */
	injectComponentCSS(): string;

	/**
	 * Returns the list of component types that have been rendered
	 * during this session.
	 */
	getRenderedComponentTypes(): ComponentType[];

	/**
	 * Event fired when a component is rendered.
	 * Payload contains the component type and the HTML markup produced.
	 */
	readonly onComponentRendered: Event<{ type: ComponentType; html: string }>;

	/**
	 * Event fired when component CSS is generated.
	 * Payload is the complete CSS string.
	 */
	readonly onComponentCSSGenerated: Event<string>;
}

// -- Service Interface #138: IApplicationPolishService --

/**
 * Real application polish that generates actual CSS rules for startup,
 * loading, layout stability, typography, icon consistency, and spacing.
 * Every method returns concrete CSSRule arrays or PolishResult with
 * measured improvements.
 */
export interface IApplicationPolishService {
	readonly _serviceBrand: undefined;

	/**
	 * Applies polish to the startup experience. Returns a PolishResult
	 * with the CSS rules applied and the number of elements affected.
	 */
	polishStartup(): PolishResult;

	/**
	 * Applies polish to loading states and transitions. Returns a PolishResult
	 * with rules for smooth loading indicators and skeleton screens.
	 */
	polishLoading(): PolishResult;

	/**
	 * Generates CSS rules to prevent layout shifts during rendering.
	 * Returns rules that set explicit dimensions, contain layouts,
	 * and reserve space for async content.
	 */
	polishLayoutStability(): CSSRule[];

	/**
	 * Generates CSS rules for consistent typography across the workbench.
	 * Returns rules that standardize font sizes, weights, line heights,
	 * and letter spacing using design tokens.
	 */
	polishTypography(): CSSRule[];

	/**
	 * Applies polish to icon consistency by ensuring all icons use
	 * the same rendering approach (SVG, not emoji) and sizing system.
	 * Returns a PolishResult with the verification status.
	 */
	polishIconConsistency(): PolishResult;

	/**
	 * Generates CSS rules for consistent spacing using the design
	 * token spacing scale. Returns rules that replace ad-hoc pixel
	 * values with token-based spacing.
	 */
	polishSpacing(): CSSRule[];

	/**
	 * Generates the combined CSS for all polish operations.
	 * Returns a complete CSS stylesheet string.
	 */
	generatePolishCSS(): string;

	/**
	 * Injects the polish CSS into the document head.
	 * Returns the style element ID.
	 */
	injectPolishCSS(): string;

	/**
	 * Runs all polish categories and returns the combined results.
	 */
	runFullPolish(): PolishResult[];

	/**
	 * Returns all CSS rules that have been applied by polish operations.
	 */
	getAllPolishRules(): CSSRule[];

	/**
	 * Returns the PolishResult for a specific polish area, or undefined
	 * if that area has not been polished yet.
	 */
	getPolishResult(area: PolishArea): PolishResult | undefined;

	/**
	 * Event fired when a polish operation is applied.
	 * Payload contains the PolishResult with the CSS rules and measurements.
	 */
	readonly onPolishApplied: Event<PolishResult>;
}

// -- Service Interface #139: IProductAuditService --

/**
 * Final honest audit that measures real visible changes, identifies remaining
 * conceptual systems, measures DOM participation, computes accessibility
 * scores, tracks service reduction, and reports remaining fake systems.
 * The generateFinalReport method produces an honest assessment.
 */
export interface IProductAuditService {
	readonly _serviceBrand: undefined;

	/**
	 * Audits all visible changes by comparing before/after CSS and HTML.
	 * Returns a VisibleChangeReport with every change categorized by
	 * visual impact level.
	 */
	auditVisibleChanges(): VisibleChangeReport;

	/**
	 * Identifies remaining conceptual systems that do not produce
	 * real CSS, HTML, or DOM output. Returns their service IDs.
	 */
	auditRemainingConceptual(): string[];

	/**
	 * Measures what percentage of DOM nodes are actively participating
	 * in rendering vs. being inert, hidden, or orphaned.
	 */
	auditDOMParticipation(): DOMParticipationReport;

	/**
	 * Computes the current accessibility score from actual DOM measurements.
	 * Returns a number 0-100.
	 */
	auditAccessibilityScore(): number;

	/**
	 * Returns the count of services that have been removed during
	 * the reduction process.
	 */
	auditServiceReduction(): number;

	/**
	 * Measures the runtime savings from performance cleanup operations.
	 * Returns a report with savings in render time, memory, and DOM operations.
	 */
	auditRuntimeSavings(): RuntimeSavingsReport;

	/**
	 * Identifies remaining fake systems that claim to produce output
	 * but actually generate zero CSS, zero HTML, and zero DOM nodes.
	 */
	auditRemainingFakeSystems(): FakeSystemReport[];

	/**
	 * Generates the final comprehensive audit report with honest assessment.
	 * The honestAssessment field contains a plain-language summary of
	 * what actually changed vs. what is still conceptual.
	 */
	generateFinalReport(): FinalProductAuditReport;

	/**
	 * Returns true if the product passes the ship gate, meaning:
	 * accessibility score >= 85, DOM participation >= 90%,
	 * no critical fake systems remaining, and measurable performance savings.
	 */
	passesShipGate(): boolean;

	/**
	 * Returns the list of critical blockers that prevent shipping.
	 * Each blocker is a description of a real issue that must be fixed.
	 */
	getCriticalBlockers(): string[];

	/**
	 * Injects an audit summary as a data attribute on the workbench root
	 * element, making audit results queryable from the DOM.
	 */
	injectAuditDataAttributes(): void;

	/**
	 * Event fired when an audit completes.
	 * Payload is the final product audit report.
	 */
	readonly onAuditComplete: Event<FinalProductAuditReport>;
}

// -- Token CSS Generation Constants --

/**
 * Prefix for all CSS custom properties generated by the pipeline.
 * All tokens will be formatted as --ai-{category}-{name}.
 */
export const TOKEN_CSS_PREFIX = '--ai';

/**
 * The ID of the <style> element injected into document.head
 * by the CSS pipeline service.
 */
export const INJECTED_TOKEN_STYLE_ID = 'ai-execution-design-tokens';

/**
 * The ID of the <style> element injected for theme bridge mappings.
 */
export const INJECTED_THEME_BRIDGE_STYLE_ID = 'ai-execution-theme-bridge';

/**
 * The ID of the <style> element injected for surface CSS.
 */
export const INJECTED_SURFACE_STYLE_ID = 'ai-execution-surfaces';

/**
 * The ID of the <style> element injected for interaction CSS.
 */
export const INJECTED_INTERACTION_STYLE_ID = 'ai-execution-interactions';

/**
 * The ID of the <style> element injected for accessibility CSS.
 */
export const INJECTED_ACCESSIBILITY_STYLE_ID = 'ai-execution-accessibility';

/**
 * The ID of the <style> element injected for optimized CSS.
 */
export const INJECTED_OPTIMIZED_STYLE_ID = 'ai-execution-optimized';

/**
 * The ID of the <style> element injected for component library CSS.
 */
export const INJECTED_COMPONENT_STYLE_ID = 'ai-execution-components';

/**
 * The ID of the <style> element injected for polish CSS.
 */
export const INJECTED_POLISH_STYLE_ID = 'ai-execution-polish';

/**
 * Minimum accessibility score required to pass the ship gate.
 */
export const MIN_ACCESSIBILITY_SCORE = 85;

/**
 * Minimum DOM participation percentage required to pass the ship gate.
 */
export const MIN_DOM_PARTICIPATION_PERCENT = 90;

/**
 * CSS selector for the workbench root element, used as the
 * scope for all generated CSS rules.
 */
export const WORKBENCH_ROOT_SELECTOR = '.monaco-workbench';

/**
 * CSS class prefix for all AI execution components.
 */
export const COMPONENT_CSS_PREFIX = 'ai-exec';

/**
 * CSS class for the reduced motion preference media query.
 */
export const REDUCED_MOTION_MEDIA_QUERY = '@media (prefers-reduced-motion: reduce)';

/**
 * CSS class applied to elements during loading states.
 */
export const LOADING_STATE_CLASS = 'ai-exec-loading';

/**
 * CSS class applied to empty state containers.
 */
export const EMPTY_STATE_CLASS = 'ai-exec-empty';

/**
 * CSS class applied to error state containers.
 */
export const ERROR_STATE_CLASS = 'ai-exec-error';

/**
 * Data attribute name for audit results on the workbench root.
 */
export const AUDIT_DATA_ATTR = 'data-ai-audit-score';

/**
 * Data attribute for accessibility score.
 */
export const A11Y_SCORE_DATA_ATTR = 'data-ai-a11y-score';

/**
 * Data attribute for DOM participation percentage.
 */
export const DOM_PARTICIPATION_DATA_ATTR = 'data-ai-dom-participation';

/**
 * Data attribute for the count of remaining fake systems.
 */
export const FAKE_SYSTEMS_DATA_ATTR = 'data-ai-fake-systems';
