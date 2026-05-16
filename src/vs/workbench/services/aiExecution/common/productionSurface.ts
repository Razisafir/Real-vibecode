/*---------------------------------------------------------------------------------------------
 *  Production Surface Rebuild — Phase 15
 *  Real Vibecode — AI-Native IDE
 *
 *  Commercial-Grade UI Execution — Transforms ALL visible product surfaces
 *  into a coherent production-grade UX system. The product must feel:
 *  premium, restrained, cinematic, intentional, calm, professional,
 *  trustworthy, world-class.
 *
 *  PRINCIPLES:
 *    1. The editor is sacred — it must feel like the unquestioned visual hero
 *    2. AI must feel integrated — not screaming for attention
 *    3. Surfaces should feel solid, calm, expensive — not flat or noisy
 *    4. Motion should guide attention — never distract, never compete with typing
 *    5. Everything must align to design tokens — no random spacing, no harsh separators
 *    6. Empty/loading/error states must feel premium — no toy-like placeholders
 *    7. Typography and iconography must feel confident and disciplined
 *    8. The product should feel like Linear, Notion, Raycast, Arc — NOT a dashboard
 *    9. When someone uses this product, they should instantly feel: "This is different."
 *   10. Visual restraint is the highest form of sophistication
 *
 *  Tasks:
 *    1.  Workbench Shell Rebuild — premium window framing, balanced density
 *    2.  Surface Material System — layered materials, translucency, depth
 *    3.  Editor Dominance Execution — editor always owns largest visual weight
 *    4.  AI Panel Redesign — AI integrated, not floating chatbot energy
 *    5.  Execution Timeline Rebuild — cinematic flow visualization
 *    6.  Cinematic Motion Execution — weighted, choreographed transitions
 *    7.  Experience State Surfaces — empty/loading/error state rebuild
 *    8.  Visual Polish — iconography + typography discipline
 *    9.  Production UX Validation — runtime coherence enforcement
 *   10.  Signature Product Feel — emotional identity of the product
 *--------------------------------------------------------------------------------------------*/

import { Event } from '../../../../base/common/event.js';
import { IDisposable } from '../../../../base/common/lifecycle.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';

// ═══════════════════════════════════════════════════════════════════════════════
// TASK 1 — WORKBENCH SHELL REBUILD
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Shell region — the major structural zones of the workbench.
 */
export const enum ShellRegion {
	/** Title bar area — window controls, breadcrumbs, navigation */
	TitleBar = 'title-bar',
	/** Activity bar — primary navigation strip */
	ActivityBar = 'activity-bar',
	/** Primary sidebar — file explorer, search */
	PrimarySidebar = 'primary-sidebar',
	/** Secondary sidebar — auxiliary panels */
	SecondarySidebar = 'secondary-sidebar',
	/** Editor container — the sacred workspace */
	EditorContainer = 'editor-container',
	/** Bottom panel — terminal, output, problems */
	BottomPanel = 'bottom-panel',
	/** Status bar — system status, language, encoding */
	StatusBar = 'status-bar',
	/** Command surface — palette, quick open */
	CommandSurface = 'command-surface',
}

/**
 * Shell spacing density — controls how tight or spacious the layout feels.
 */
export const enum ShellDensity {
	/** Compact — more content, less whitespace */
	Compact = 'compact',
	/** Balanced — default professional density */
	Balanced = 'balanced',
	/** Spacious — more breathing room, premium feel */
	Spacious = 'spacious',
	/** Adaptive — adjusts based on context and screen size */
	Adaptive = 'adaptive',
}

/**
 * Shell region configuration — defines how a structural zone behaves.
 */
export interface IShellRegionConfig {
	readonly region: ShellRegion;
	readonly minWidth: number;
	readonly maxWidth: number;
	readonly defaultWidth: number;
	readonly preferredWidth: number;
	readonly collapsible: boolean;
	readonly autoCollapseAfterInactivityMs: number;
	readonly priority: number; // 1 = highest priority for space allocation
	readonly density: ShellDensity;
	readonly visualSeparation: 'none' | 'subtle' | 'standard';
}

/**
 * Shell spacing rhythm — unified spacing system for the entire shell.
 */
export interface IShellSpacingRhythm {
	readonly unit: number; // base unit in px
	readonly micro: number; // 0.25x unit — tight internal gaps
	readonly small: number; // 0.5x unit — icon gaps, label margins
	readonly medium: number; // 1x unit — standard padding
	readonly large: number; // 1.5x unit — region padding
	readonly xl: number; // 2x unit — section spacing
	readonly xxl: number; // 3x unit — major region separation
	readonly shellPadding: number; // outer shell padding
	readonly editorPadding: number; // editor internal padding
}

/**
 * Shell visual silence — gaps and breathing room between regions.
 */
export interface IVisualSilence {
	readonly betweenActivityBarAndSidebar: number;
	readonly betweenSidebarAndEditor: number;
	readonly betweenEditorAndBottomPanel: number;
	readonly betweenEditorAndSecondarySidebar: number;
	readonly betweenBottomPanelAndStatusBar: number;
	readonly editorGutter: number;
}

/**
 * Shell layout state — current configuration of all shell regions.
 */
export interface IShellLayoutState {
	readonly regionConfigs: ReadonlyMap<ShellRegion, IShellRegionConfig>;
	readonly spacingRhythm: IShellSpacingRhythm;
	readonly visualSilence: IVisualSilence;
	readonly currentDensity: ShellDensity;
	readonly editorOccupancyPercent: number;
	readonly activeRegions: readonly ShellRegion[];
	readonly collapsedRegions: readonly ShellRegion[];
	readonly timestamp: number;
}

/**
 * IWorkbenchShellService — Premium window framing and layout orchestration.
 *
 * Rebuilds the entire shell structure with balanced density, unified spacing
 * rhythm, visual silence between regions, layered surfaces, subtle depth
 * hierarchy, adaptive shell spacing, and responsive layout intelligence.
 *
 * Rules: NO clutter, NO visual noise, NO harsh separators, NO random spacing.
 * Everything must align to design tokens.
 */
export const IWorkbenchShellService = createDecorator<IWorkbenchShellService>('workbenchShellService');

export interface IWorkbenchShellService {
	readonly _serviceBrand: undefined;

	/** Current shell layout state */
	readonly currentLayout: IShellLayoutState;

	/** Current shell density */
	readonly density: ShellDensity;

	/** Event: shell layout changed */
	readonly onDidChangeLayout: Event<IShellLayoutState>;

	/** Configure a shell region */
	configureRegion(config: IShellRegionConfig): void;

	/** Get a shell region's configuration */
	getRegionConfig(region: ShellRegion): IShellRegionConfig | null;

	/** Set the shell density */
	setDensity(density: ShellDensity): void;

	/** Collapse a shell region */
	collapseRegion(region: ShellRegion, reason: string): void;

	/** Expand a shell region */
	expandRegion(region: ShellRegion, reason: string): void;

	/** Get the spacing rhythm */
	readonly spacingRhythm: IShellSpacingRhythm;

	/** Get visual silence configuration */
	readonly visualSilence: IVisualSilence;

	/** Auto-optimize layout for current context */
	autoOptimizeLayout(): void;

	/** Calculate editor occupancy percentage */
	readonly editorOccupancyPercent: number;

	/** Validate shell coherence */
	validateShellCoherence(): IShellCoherenceReport;
}

/**
 * Shell coherence report — validates layout integrity.
 */
export interface IShellCoherenceReport {
	readonly spacingViolations: number;
	readonly densityInconsistencies: number;
	readonly separationHarshnessCount: number;
	readonly editorDominancePercent: number;
	readonly overallCoherenceScore: number; // 0.0-1.0
	readonly issues: readonly IShellCoherenceIssue[];
	readonly timestamp: number;
}

/**
 * Shell coherence issue.
 */
export interface IShellCoherenceIssue {
	readonly region: ShellRegion;
	readonly issueType: 'spacing-violation' | 'density-mismatch' | 'harsh-separation' | 'random-spacing' | 'visual-noise';
	readonly description: string;
	readonly severity: 'critical' | 'warning' | 'info';
}

// ═══════════════════════════════════════════════════════════════════════════════
// TASK 2 — PREMIUM SURFACE MATERIAL SYSTEM
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Surface elevation level — layered depth hierarchy.
 */
export const enum SurfaceElevation {
	/** Base — primary background */
	Base = 'base',
	/** Raised — slightly above base, subtle shadow */
	Raised = 'raised',
	/** Overlay — floating above content */
	Overlay = 'overlay',
	/** Sticky — pinned surfaces that float */
	Sticky = 'sticky',
	/** Modal — highest elevation, covers all */
	Modal = 'modal',
}

/**
 * Surface material — defines visual properties of a surface.
 */
export interface ISurfaceMaterial {
	readonly materialId: string;
	readonly elevation: SurfaceElevation;
	readonly backgroundOpacity: number; // 0.0-1.0
	readonly blurAmount: number; // px — intelligent blur usage
	readonly borderColor: string; // token reference
	readonly borderOpacity: number; // 0.0-1.0
	readonly borderWidth: number; // px
	readonly shadowSpread: number; // px — subtle only
	readonly shadowOpacity: number; // 0.0-0.3 — no aggressive shadows
	readonly gradientFrom: string | null; // token reference, subtle only
	readonly gradientTo: string | null; // token reference
	readonly gradientAngle: number; // degrees
	readonly translucencyEnabled: boolean;
	readonly contrastLevel: number; // 0.0-1.0 — adaptive contrast
}

/**
 * Surface material assignment — which material applies to which surface.
 */
export interface ISurfaceMaterialAssignment {
	readonly surfaceId: string;
	readonly defaultMaterial: string; // materialId
	readonly focusMaterial: string; // materialId when surface has focus
	readonly inactiveMaterial: string; // materialId when surface is inactive
	readonly contextMaterials: ReadonlyMap<string, string>; // context -> materialId
}

/**
 * Surface material state — current visual properties of a surface.
 */
export interface ISurfaceMaterialState {
	readonly activeAssignments: ReadonlyMap<string, ISurfaceMaterial>;
	readonly currentElevations: ReadonlyMap<string, SurfaceElevation>;
	readonly translucencyActive: boolean;
	readonly blurEffectsActive: number; // count of active blur effects
	readonly gradientSurfaces: number; // count of surfaces with gradients
	readonly timestamp: number;
}

/**
 * ISurfaceMaterialService — Layered surface materials for premium feel.
 *
 * Softer borders, subtle gradients only, no aggressive shadows,
 * no glassmorphism spam, no hard edge overload.
 * Surfaces should feel: solid, calm, expensive.
 *
 * Contextual elevation adjusts based on what the user is focused on.
 * Intelligent blur usage — not everywhere, only where it serves depth perception.
 */
export const ISurfaceMaterialService = createDecorator<ISurfaceMaterialService>('surfaceMaterialService');

export interface ISurfaceMaterialService {
	readonly _serviceBrand: undefined;

	/** Current surface material state */
	readonly currentState: ISurfaceMaterialState;

	/** Event: surface material changed */
	readonly onDidChangeMaterial: Event<ISurfaceMaterialState>;

	/** Register a surface material definition */
	registerMaterial(material: ISurfaceMaterial): void;

	/** Assign a material to a surface */
	assignMaterial(assignment: ISurfaceMaterialAssignment): void;

	/** Get the current material for a surface */
	getSurfaceMaterial(surfaceId: string): ISurfaceMaterial | null;

	/** Get the material for a surface in a specific context */
	getSurfaceMaterialForContext(surfaceId: string, context: string): ISurfaceMaterial | null;

	/** Update surface elevation contextually */
	updateElevation(surfaceId: string, elevation: SurfaceElevation): void;

	/** Check if blur is appropriate for a surface */
	isBlurAppropriate(surfaceId: string): boolean;

	/** Get all materials at an elevation level */
	getMaterialsAtElevation(elevation: SurfaceElevation): readonly ISurfaceMaterial[];

	/** Validate material coherence */
	validateMaterialCoherence(): IMaterialCoherenceReport;
}

/**
 * Material coherence report — validates surface material consistency.
 */
export interface IMaterialCoherenceReport {
	readonly inconsistentBorders: number;
	readonly excessiveShadows: number;
	readonly gradientOveruse: number;
	readonly blurViolationCount: number;
	readonly overallCoherenceScore: number; // 0.0-1.0
	readonly issues: readonly IMaterialCoherenceIssue[];
	readonly timestamp: number;
}

/**
 * Material coherence issue.
 */
export interface IMaterialCoherenceIssue {
	readonly surfaceId: string;
	readonly issueType: 'inconsistent-border' | 'aggressive-shadow' | 'gradient-overuse' | 'blur-spam' | 'hard-edge' | 'opacity-mismatch';
	readonly description: string;
	readonly severity: 'critical' | 'warning' | 'info';
}

// ═══════════════════════════════════════════════════════════════════════════════
// TASK 3 — EDITOR DOMINANCE EXECUTION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Editor visual weight — how much the editor dominates the viewport.
 */
export const enum EditorVisualWeight {
	/** Standard — editor is primary but panels share space */
	Standard = 'standard',
	/** Dominant — editor takes 75%+ of viewport */
	Dominant = 'dominant',
	/** Supreme — editor takes 90%+ of viewport, minimal chrome */
	Supreme = 'supreme',
	/** Sacred — editor-only, zero visual competition */
	Sacred = 'sacred',
}

/**
 * Surrounding UI softness — how inactive panels fade.
 */
export const enum SurroundingSoftness {
	/** Normal — all panels at full visibility */
	Normal = 'normal',
	/** Soft — inactive panels at reduced opacity */
	Soft = 'soft',
	/** Quiet — inactive panels barely visible */
	Quiiet = 'quiet',
	/** Invisible — inactive panels completely hidden */
	Invisible = 'invisible',
}

/**
 * Editor dominance configuration.
 */
export interface IEditorDominanceConfig {
	readonly visualWeight: EditorVisualWeight;
	readonly surroundingSoftness: SurroundingSoftness;
	readonly editorMinWidthPercent: number; // 50-100
	readonly contextualFadeEnabled: boolean;
	readonly contextualFadeDelayMs: number;
	readonly distractionSuppressionEnabled: boolean;
	readonly focusAmplificationEnabled: boolean;
	readonly edgeQuietingEnabled: boolean;
	readonly ambientHierarchyEnabled: boolean;
}

/**
 * Editor dominance state — current visual dominance metrics.
 */
export interface IEditorDominanceState {
	readonly visualWeight: EditorVisualWeight;
	readonly surroundingSoftness: SurroundingSoftness;
	readonly editorViewportPercent: number; // 0-100
	readonly inactivePanelOpacity: number; // 0.0-1.0
	readonly suppressedDistractions: readonly string[];
	readonly ambientAdjustments: readonly IAmbientAdjustment[];
	readonly userSubconsciousMessage: string; // "This is my workspace."
	readonly timestamp: number;
}

/**
 * Ambient adjustment — subtle visual hierarchy shift.
 */
export interface IAmbientAdjustment {
	readonly surfaceId: string;
	readonly adjustmentType: 'opacity-shift' | 'scale-shift' | 'color-mute' | 'border-soften';
	readonly magnitude: number; // 0.0-1.0
	readonly reason: string;
}

/**
 * IEditorDominanceService — The editor is the unquestioned visual hero.
 *
 * Editor always owns largest visual weight. Surrounding UI yields visually.
 * Inactive panels soften automatically. Contextual fade system, distraction
 * suppression, focus amplification, edge quieting, ambient hierarchy.
 *
 * The user should subconsciously feel: "This is my workspace."
 * NOT: "This is the AI's workspace."
 */
export const IEditorDominanceService = createDecorator<IEditorDominanceService>('editorDominanceService');

export interface IEditorDominanceService {
	readonly _serviceBrand: undefined;

	/** Current editor dominance state */
	readonly currentState: IEditorDominanceState;

	/** Current visual weight */
	readonly visualWeight: EditorVisualWeight;

	/** Event: editor dominance changed */
	readonly onDidChangeDominance: Event<IEditorDominanceState>;

	/** Set editor visual weight */
	setVisualWeight(weight: EditorVisualWeight): void;

	/** Set surrounding softness */
	setSurroundingSoftness(softness: SurroundingSoftness): void;

	/** Get the editor dominance configuration */
	readonly config: IEditorDominanceConfig;

	/** Update the dominance configuration */
	updateConfig(config: Partial<IEditorDominanceConfig>): void;

	/** Soften an inactive panel */
	softenInactivePanel(panelId: string): void;

	/** Restore a panel to full visibility */
	restorePanel(panelId: string): void;

	/** Apply contextual fade to surrounding surfaces */
	applyContextualFade(): void;

	/** Suppress a distraction */
	suppressDistraction(source: string): IDisposable;

	/** Apply edge quieting to editor boundaries */
	applyEdgeQuieting(): void;

	/** Calculate current editor viewport percentage */
	readonly editorViewportPercent: number;

	/** Validate editor dominance */
	validateDominance(): IEditorDominanceReport;
}

/**
 * Editor dominance report — validates editor is the visual hero.
 */
export interface IEditorDominanceReport {
	readonly editorViewportPercent: number;
	readonly competingSurfaces: number;
	readonly insufficientDominance: boolean;
	readonly aiOverdominance: boolean;
	readonly overallDominanceScore: number; // 0.0-1.0
	readonly issues: readonly IEditorDominanceIssue[];
	readonly timestamp: number;
}

/**
 * Editor dominance issue.
 */
export interface IEditorDominanceIssue {
	readonly surfaceId: string;
	readonly issueType: 'competing-weight' | 'ai-overdominance' | 'insufficient-fade' | 'distraction-active';
	readonly description: string;
	readonly severity: 'critical' | 'warning' | 'info';
}

// ═══════════════════════════════════════════════════════════════════════════════
// TASK 4 — AI PANEL REDESIGN
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * AI surface integration mode — how AI appears in the workflow.
 */
export const enum AISurfaceMode {
	/** Embedded — AI is part of existing panels, no separate AI panel */
	Embedded = 'embedded',
	/** Inline — AI appears as inline annotations, ghost text, inline cards */
	Inline = 'inline',
	/** Compact — small collapsible region, minimal footprint */
	Compact = 'compact',
	/** Panel — traditional side panel, but restrained */
	Panel = 'panel',
}

/**
 * AI reasoning display format.
 */
export const enum AIReasoningFormat {
	/** Inline one-line summary */
	InlineSummary = 'inline-summary',
	/** Expandable reasoning card */
	ExpandableCard = 'expandable-card',
	/** Compact orchestration view */
	CompactOrchestration = 'compact-orchestration',
	/** Execution status card */
	ExecutionCard = 'execution-card',
	/** Tooltip on hover */
	TooltipHover = 'tooltip-hover',
}

/**
 * AI indicator style — how AI status is communicated.
 */
export const enum AIIndicatorStyle {
	/** No visible indicator */
	None = 'none',
	/** Subtle dot in the status bar */
	StatusBarDot = 'status-bar-dot',
	/** Inline badge with minimal text */
	InlineBadge = 'inline-badge',
	/** Collapsible chip near relevant content */
	CollapsibleChip = 'collapsible-chip',
	/** Compact status line */
	StatusLine = 'status-line',
}

/**
 * AI surface configuration — how AI surfaces behave.
 */
export interface IAISurfaceConfig {
	readonly defaultMode: AISurfaceMode;
	readonly reasoningFormat: AIReasoningFormat;
	readonly indicatorStyle: AIIndicatorStyle;
	readonly maxVisibleReasoningCards: number;
	readonly collapsibleByDefault: boolean;
	readonly maxPanelWidthPercent: number; // 0-50, AI panel never exceeds this
	readonly visualDeference: boolean; // AI must visually defer to user work
	readonly contextAppearance: boolean; // AI appears only when relevant
	readonly quietWhenIdle: boolean; // AI goes quiet when user is coding
}

/**
 * AI surface state — current AI visual behavior.
 */
export interface IAISurfaceState {
	readonly currentMode: AISurfaceMode;
	readonly visibleAISurfaces: readonly string[];
	readonly activeReasoningCards: number;
	readonly activeIndicators: number;
	readonly aiViewportOccupancy: number; // 0.0-1.0 how much screen AI occupies
	readonly isEmbedded: boolean;
	readonly isQuiet: boolean;
	readonly timestamp: number;
}

/**
 * IAISurfaceExperienceService — AI visually integrated into workflow.
 *
 * NOT floating chatbot energy. NOT giant assistant panel dominance.
 * Contextual appearance, collapsible intelligence regions, inline reasoning
 * summaries, execution cards, compact orchestration views, calm AI indicators.
 *
 * Rules: AI should feel embedded into tooling. AI must visually defer to user work.
 * No oversized branding energy. No visual screaming.
 */
export const IAISurfaceExperienceService = createDecorator<IAISurfaceExperienceService>('aiSurfaceExperienceService');

export interface IAISurfaceExperienceService {
	readonly _serviceBrand: undefined;

	/** Current AI surface state */
	readonly currentState: IAISurfaceState;

	/** Current AI surface mode */
	readonly currentMode: AISurfaceMode;

	/** Event: AI surface mode changed */
	readonly onDidChangeSurfaceMode: Event<AISurfaceMode>;

	/** Event: AI surface visibility changed */
	readonly onDidChangeAIVisibility: Event<IAISurfaceState>;

	/** Set the AI surface mode */
	setSurfaceMode(mode: AISurfaceMode): void;

	/** Get the AI surface configuration */
	readonly config: IAISurfaceConfig;

	/** Update the AI surface configuration */
	updateConfig(config: Partial<IAISurfaceConfig>): void;

	/** Show an AI reasoning card */
	showReasoningCard(cardId: string, format: AIReasoningFormat): void;

	/** Dismiss an AI reasoning card */
	dismissReasoningCard(cardId: string): void;

	/** Show an execution status card */
	showExecutionCard(cardId: string): void;

	/** Dismiss an execution card */
	dismissExecutionCard(cardId: string): void;

	/** Quiet all AI surfaces — user is coding */
	quietAISurfaces(reason: string): IDisposable;

	/** Get AI viewport occupancy */
	readonly aiViewportOccupancy: number;

	/** Validate AI is not visually dominant */
	validateAIDeference(): IAIDeferenceReport;
}

/**
 * AI deference report — validates AI is not visually overwhelming.
 */
export interface IAIDeferenceReport {
	readonly aiViewportOccupancy: number;
	readonly oversizedPanels: number;
	readonly visualScreaming: number;
	readonly deferenceScore: number; // 0.0-1.0 — higher = AI defers properly
	readonly issues: readonly IAIDeferenceIssue[];
	readonly timestamp: number;
}

/**
 * AI deference issue.
 */
export interface IAIDeferenceIssue {
	readonly surfaceId: string;
	readonly issueType: 'oversized-panel' | 'visual-screaming' | 'excessive-indicators' | 'chatbot-energy' | 'branding-overload';
	readonly description: string;
	readonly severity: 'critical' | 'warning' | 'info';
}

// ═══════════════════════════════════════════════════════════════════════════════
// TASK 5 — EXECUTION TIMELINE EXPERIENCE REBUILD
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Timeline card density — how compact the timeline feels.
 */
export const enum TimelineDensity {
	/** Minimal — only critical events, maximum whitespace */
	Minimal = 'minimal',
	/** Standard — balanced density with key details */
	Standard = 'standard',
	/** Detailed — more information per card */
	Detailed = 'detailed',
	/** Compact — maximum density, power user view */
	Compact = 'compact',
}

/**
 * Timeline event grouping — how events cluster.
 */
export const enum TimelineGrouping {
	/** By execution session */
	BySession = 'by-session',
	/** By temporal proximity */
	ByTime = 'by-time',
	/** By causal chain */
	ByCausality = 'by-causality',
	/** By agent/process */
	ByAgent = 'by-agent',
}

/**
 * Timeline event type categories.
 */
export const enum TimelineEventCategory {
	/** User-initiated actions */
	UserAction = 'user-action',
	/** AI execution events */
	AIExecution = 'ai-execution',
	/** Process state changes */
	ProcessState = 'process-state',
	/** Orchestration flow events */
	Orchestration = 'orchestration',
	/** System events */
	System = 'system',
}

/**
 * Execution card design — how a single event is displayed.
 */
export interface IExecutionCardDesign {
	readonly cardId: string;
	readonly category: TimelineEventCategory;
	readonly title: string;
	readonly summary: string;
	readonly detailExpanded: string;
	readonly statusIcon: string;
	readonly timestamp: number;
	readonly durationMs: number | null;
	readonly confidence: number | null;
	readonly causalParentId: string | null;
	readonly causalChildrenIds: readonly string[];
	readonly isExpandable: boolean;
	readonly isGrouped: boolean;
	readonly groupId: string | null;
}

/**
 * Timeline experience configuration.
 */
export interface ITimelineExperienceConfig {
	readonly density: TimelineDensity;
	readonly grouping: TimelineGrouping;
	readonly showTimestamps: boolean;
	readonly showDuration: boolean;
	readonly showConfidence: boolean;
	readonly maxVisibleCards: number;
	readonly temporalSpacingMs: number; // minimum spacing between events
	readonly motionEnabled: boolean;
	readonly cinematicTransitions: boolean;
}

/**
 * Timeline experience state.
 */
export interface ITimelineExperienceState {
	readonly density: TimelineDensity;
	readonly grouping: TimelineGrouping;
	readonly visibleCards: number;
	readonly groupedClusters: number;
	readonly currentScrollPosition: number;
	readonly isReplaying: boolean;
	readonly replayPosition: number | null;
	readonly timestamp: number;
}

/**
 * IExecutionTimelineExperienceService — Cinematic flow visualization.
 *
 * Execution cards, graph events, orchestration flows, process states,
 * replay navigation, execution history. Cinematic flow visualization,
 * readable hierarchy, compact density, expandable depth, grouped event
 * clusters, temporal spacing logic, motion-linked transitions.
 *
 * Should feel: professional and inspectable.
 * NOT: developer logs stacked vertically.
 */
export const IExecutionTimelineExperienceService = createDecorator<IExecutionTimelineExperienceService>('executionTimelineExperienceService');

export interface IExecutionTimelineExperienceService {
	readonly _serviceBrand: undefined;

	/** Current timeline experience state */
	readonly currentState: ITimelineExperienceState;

	/** Current timeline configuration */
	readonly config: ITimelineExperienceConfig;

	/** Event: timeline experience changed */
	readonly onDidChangeTimeline: Event<ITimelineExperienceState>;

	/** Set timeline density */
	setDensity(density: TimelineDensity): void;

	/** Set timeline grouping */
	setGrouping(grouping: TimelineGrouping): void;

	/** Get the execution card design for an event */
	getExecutionCardDesign(eventId: string): IExecutionCardDesign | null;

	/** Group events into clusters */
	groupEvents(eventIds: readonly string[]): readonly IEventCluster[];

	/** Navigate to a specific event in the timeline */
	navigateToEvent(eventId: string): void;

	/** Start replay mode */
	startReplay(fromEventId: string): void;

	/** Stop replay mode */
	stopReplay(): void;

	/** Apply cinematic transition between timeline states */
	applyCinematicTransition(fromState: string, toState: string): void;

	/** Get temporal spacing for an event */
	getTemporalSpacing(eventId: string): number;

	/** Validate timeline readability */
	validateTimelineReadability(): ITimelineReadabilityReport;
}

/**
 * Event cluster — a grouped set of related events.
 */
export interface IEventCluster {
	readonly clusterId: string;
	readonly eventId: string;
	readonly category: TimelineEventCategory;
	readonly eventCount: number;
	readonly summary: string;
	readonly startTime: number;
	readonly endTime: number;
}

/**
 * Timeline readability report.
 */
export interface ITimelineReadabilityReport {
	readonly verticalLogScore: number; // 0.0-1.0 — lower = less log-like
	readonly hierarchyReadability: number; // 0.0-1.0
	readonly densityScore: number; // 0.0-1.0
	readonly groupingCoherence: number; // 0.0-1.0
	readonly overallScore: number; // 0.0-1.0
	readonly issues: readonly ITimelineIssue[];
	readonly timestamp: number;
}

/**
 * Timeline readability issue.
 */
export interface ITimelineIssue {
	readonly issueType: 'log-stacking' | 'unreadable-hierarchy' | 'excessive-density' | 'missing-grouping' | 'no-motion-link';
	readonly description: string;
	readonly severity: 'critical' | 'warning' | 'info';
}

// ═══════════════════════════════════════════════════════════════════════════════
// TASK 6 — CINEMATIC MOTION EXECUTION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Motion choreography type — how motion is orchestrated.
 */
export const enum MotionChoreography {
	/** Sequential — elements enter one after another */
	Sequential = 'sequential',
	/** Staggered — elements enter with slight delays */
	Staggered = 'staggered',
	/** Parallel — elements enter simultaneously */
	Parallel = 'parallel',
	/** Orchestrated — complex layered choreography */
	Orchestrated = 'orchestrated',
	/** Silent — no motion, static appearance */
	Silent = 'silent',
}

/**
 * Motion weight — perceived mass of an element during animation.
 */
export const enum MotionWeight {
	/** Light — small elements, indicators, badges */
	Light = 'light',
	/** Medium — panels, cards, sections */
	Medium = 'medium',
	/** Heavy — large surfaces, full panel transitions */
	Heavy = 'heavy',
	/** Structural — shell regions, major layout changes */
	Structural = 'structural',
}

/**
 * Motion context — when motion should occur.
 */
export const enum MotionContext {
	/** Panel opening */
	PanelOpen = 'panel-open',
	/** Panel closing */
	PanelClose = 'panel-close',
	/** Panel resize */
	PanelResize = 'panel-resize',
	/** Tab switching */
	TabSwitch = 'tab-switch',
	/** Content update */
	ContentUpdate = 'content-update',
	/** Focus change */
	FocusChange = 'focus-change',
	/** AI suggestion appear */
	AISuggestionAppear = 'ai-suggestion-appear',
	/** AI suggestion dismiss */
	AISuggestionDismiss = 'ai-suggestion-dismiss',
	/** Execution event */
	ExecutionEvent = 'execution-event',
	/** State transition */
	StateTransition = 'state-transition',
}

/**
 * Cinematic motion specification.
 */
export interface ICinematicMotionSpec {
	readonly context: MotionContext;
	readonly choreography: MotionChoreography;
	readonly weight: MotionWeight;
	readonly durationMs: number;
	readonly enterDelayMs: number;
	readonly exitDelayMs: number;
	readonly easing: string; // CSS easing
	readonly velocityContinuity: boolean; // maintains velocity from previous motion
	readonly motionSilenceDuringFocus: boolean; // suppress during typing
	readonly interruptionAware: boolean; // handles mid-animation interruption
}

/**
 * Motion state — current motion activity.
 */
export interface IMotionState {
	readonly activeAnimations: number;
	readonly motionDensity: number; // 0.0-1.0
	readonly isSilentMode: boolean; // motion suppressed during focus
	readonly lastMotionTime: number;
	readonly choreographyActive: MotionChoreography;
	readonly timestamp: number;
}

/**
 * ICinematicMotionService — Alive but disciplined motion.
 *
 * Weighted transitions, layered movement choreography, contextual panel
 * animation, velocity continuity, motion silence during focus, coordinated
 * enter/exit timing, interruption-aware transitions.
 *
 * Rules: motion should guide attention, never distract, never compete with
 * typing, avoid excessive movement.
 * Target feeling: "alive but disciplined."
 */
export const ICinematicMotionService = createDecorator<ICinematicMotionService>('cinematicMotionService');

export interface ICinematicMotionService {
	readonly _serviceBrand: undefined;

	/** Current motion state */
	readonly currentState: IMotionState;

	/** Event: motion state changed */
	readonly onDidChangeMotionState: Event<IMotionState>;

	/** Get the motion specification for a context */
	getMotionSpec(context: MotionContext): ICinematicMotionSpec;

	/** Register a custom motion specification */
	registerMotionSpec(spec: ICinematicMotionSpec): void;

	/** Enter motion silence — suppress all motion during focus */
	enterMotionSilence(reason: string): IDisposable;

	/** Get current motion density */
	readonly motionDensity: number;

	/** Coordinate an orchestrated enter sequence */
	orchestrateEnter(elementIds: readonly string[], choreography: MotionChoreography): void;

	/** Coordinate an orchestrated exit sequence */
	orchestrateExit(elementIds: readonly string[], choreography: MotionChoreography): void;

	/** Handle an interruption during animation */
	handleInterruption(elementId: string, newContext: MotionContext): void;

	/** Check if motion is appropriate for current context */
	isMotionAppropriate(context: MotionContext): boolean;

	/** Validate motion discipline */
	validateMotionDiscipline(): IMotionDisciplineReport;
}

/**
 * Motion discipline report.
 */
export interface IMotionDisciplineReport {
	readonly excessiveMotionEvents: number;
	readonly competingMotions: number;
	readonly motionDuringTyping: number;
	readonly uncoordinatedTransitions: number;
	readonly overallDisciplineScore: number; // 0.0-1.0
	readonly issues: readonly IMotionDisciplineIssue[];
	readonly timestamp: number;
}

/**
 * Motion discipline issue.
 */
export interface IMotionDisciplineIssue {
	readonly elementId: string;
	readonly issueType: 'excessive-motion' | 'competing-motion' | 'motion-during-typing' | 'uncoordinated' | 'gimmicky';
	readonly description: string;
	readonly severity: 'critical' | 'warning' | 'info';
}

// ═══════════════════════════════════════════════════════════════════════════════
// TASK 7 — EMPTY / LOADING / ERROR STATE REBUILD
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Experience state type — what kind of state surface is needed.
 */
export const enum ExperienceStateType {
	/** Empty — no content to display */
	Empty = 'empty',
	/** Loading — content is being fetched */
	Loading = 'loading',
	/** Skeleton — placeholder while content loads */
	Skeleton = 'skeleton',
	/** Reconnecting — connection lost, attempting reconnect */
	Reconnecting = 'reconnecting',
	/** Failure — operation failed */
	Failure = 'failure',
	/** Offline — no network connectivity */
	Offline = 'offline',
	/** Onboarding — first-use transition state */
	Onboarding = 'onboarding',
	/** Permission — access denied */
	Permission = 'permission',
}

/**
 * State surface tone — the emotional quality of the state message.
 */
export const enum StateSurfaceTone {
	/** Calm — neutral, professional */
	Calm = 'calm',
	/** Reassuring — "we're handling this" */
	Reassuring = 'reassuring',
	/** Guiding — "here's what you can do" */
	Guiding = 'guiding',
	/** Minimal — just the essential message */
	Minimal = 'minimal',
}

/**
 * State surface design — how an empty/loading/error state looks.
 */
export interface IStateSurfaceDesign {
	readonly stateType: ExperienceStateType;
	readonly tone: StateSurfaceTone;
	readonly title: string;
	readonly message: string;
	readonly guidance: string | null; // suggested action
	readonly illustrationType: 'subtle-icon' | 'abstract' | 'none';
	readonly animationType: 'gentle-pulse' | 'subtle-shimmer' | 'none';
	readonly typography: 'display' | 'title' | 'body';
	readonly maxMessageLength: number;
	readonly showProgress: boolean;
	readonly estimatedWaitMs: number | null;
}

/**
 * State surface registry — all registered state designs.
 */
export interface IStateSurfaceRegistry {
	readonly designs: ReadonlyMap<ExperienceStateType, IStateSurfaceDesign>;
	readonly currentActiveStates: ReadonlyMap<string, ExperienceStateType>;
	readonly timestamp: number;
}

/**
 * IExperienceStateSurfaceService — Premium state surfaces.
 *
 * Empty states, skeletons, loading flows, reconnect states, failure states,
 * offline states, onboarding transitions. Premium typography, calm messaging,
 * minimal noise, intelligent guidance, graceful degradation.
 *
 * Absolutely NO: giant warning boxes, aggressive red overload, toy-like placeholders.
 */
export const IExperienceStateSurfaceService = createDecorator<IExperienceStateSurfaceService>('experienceStateSurfaceService');

export interface IExperienceStateSurfaceService {
	readonly _serviceBrand: undefined;

	/** Current state surface registry */
	readonly currentRegistry: IStateSurfaceRegistry;

	/** Event: active state changed */
	readonly onDidChangeActiveState: Event<{ surfaceId: string; stateType: ExperienceStateType }>;

	/** Register a state surface design */
	registerStateDesign(design: IStateSurfaceDesign): void;

	/** Get the design for a state type */
	getStateDesign(stateType: ExperienceStateType): IStateSurfaceDesign | null;

	/** Activate a state for a surface */
	activateState(surfaceId: string, stateType: ExperienceStateType): void;

	/** Deactivate a state for a surface */
	deactivateState(surfaceId: string): void;

	/** Get the active state for a surface */
	getActiveState(surfaceId: string): ExperienceStateType | null;

	/** Get appropriate tone for a state */
	getToneForState(stateType: ExperienceStateType): StateSurfaceTone;

	/** Validate state surface quality */
	validateStateSurfaces(): IStateSurfaceQualityReport;
}

/**
 * State surface quality report.
 */
export interface IStateSurfaceQualityReport {
	readonly aggressiveWarningCount: number;
	readonly toyLikePlaceholderCount: number;
	readonly harshInterruptionCount: number;
	readonly overallQualityScore: number; // 0.0-1.0
	readonly issues: readonly IStateSurfaceIssue[];
	readonly timestamp: number;
}

/**
 * State surface quality issue.
 */
export interface IStateSurfaceIssue {
	readonly surfaceId: string;
	readonly issueType: 'giant-warning' | 'aggressive-red' | 'toy-placeholder' | 'harsh-interruption' | 'no-guidance' | 'excessive-noise';
	readonly description: string;
	readonly severity: 'critical' | 'warning' | 'info';
}

// ═══════════════════════════════════════════════════════════════════════════════
// TASK 8 — ICONOGRAPHY + TYPOGRAPHY POLISH
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Icon stroke weight — unified stroke system.
 */
export const enum IconStrokeWeight {
	/** Thin — 1px stroke */
	Thin = 'thin',
	/** Regular — 1.5px stroke, default */
	Regular = 'regular',
	/** Medium — 2px stroke */
	Medium = 'medium',
	/** Bold — 2.5px stroke, emphasis */
	Bold = 'bold',
}

/**
 * Icon sizing tier — disciplined icon sizes.
 */
export const enum IconSizeTier {
	/** Micro — 12px, inline indicators */
	Micro = 12,
	/** Small — 14px, list items, tree nodes */
	Small = 14,
	/** Standard — 16px, default, toolbars */
	Standard = 16,
	/** Medium — 20px, section headers, prominent actions */
	Medium = 20,
	/** Large — 24px, panels, feature highlights */
	Large = 24,
	/** XL — 32px, empty states, illustrations */
	XL = 32,
}

/**
 * Typography scale — the type rhythm.
 */
export const enum TypographyScale {
	/** Caption — 11px, metadata, timestamps */
	Caption = 'caption',
	/** Small — 12px, secondary text, labels */
	Small = 'small',
	/** Body — 13px, default reading text */
	Body = 'body',
	/** Large — 14px, emphasis text, descriptions */
	Large = 'large',
	/** Title — 16px, section headers */
	Title = 'title',
	/** Headline — 20px, panel titles */
	Headline = 'headline',
	/** Display — 24px, major headings */
	Display = 'display',
	/** Hero — 32px, splash screens, empty states */
	Hero = 'hero',
}

/**
 * Typography weight — font weight discipline.
 */
export const enum TypographyWeight {
	/** Regular — 400 */
	Regular = 'regular',
	/** Medium — 500 */
	Medium = 'medium',
	/** SemiBold — 600 */
	SemiBold = 'semi-bold',
	/** Bold — 700 */
	Bold = 'bold',
}

/**
 * Typography rhythm specification.
 */
export interface ITypographyRhythm {
	readonly scale: TypographyScale;
	readonly weight: TypographyWeight;
	readonly lineHeight: number; // multiplier
	readonly letterSpacing: number; // em
	readonly marginBottom: number; // px
	readonly marginTop: number; // px
	readonly maxWidth: number; // px — for readability
	readonly truncationStrategy: 'ellipsis' | 'fade' | 'wrap' | 'smart';
}

/**
 * Visual polish configuration — icon + typography discipline.
 */
export interface IVisualPolishConfig {
	readonly iconStrokeWeight: IconStrokeWeight;
	readonly iconOpticalAlignment: boolean; // adjust icon position for optical balance
	readonly iconConsistentPadding: boolean; // consistent internal padding
	readonly typographyScale: TypographyScale;
	readonly typographyWeight: TypographyWeight;
	readonly baselineGridEnabled: boolean; // align to 4px grid
	readonly whitespaceBalancing: boolean; // automatic whitespace adjustment
	readonly intelligentTruncation: boolean; // smart text truncation
}

/**
 * Visual polish state — current typography and icon state.
 */
export interface IVisualPolishState {
	readonly iconStrokeWeight: IconStrokeWeight;
	readonly activeIconSizes: ReadonlyMap<string, IconSizeTier>;
	readonly typographyScale: TypographyScale;
	readonly typographyWeight: TypographyWeight;
	readonly baselineAlignmentViolations: number;
	readonly truncationEvents: number;
	readonly timestamp: number;
}

/**
 * IVisualPolishService — Confident and premium typography & iconography.
 *
 * Unified icon stroke system, icon sizing discipline, optical alignment
 * correction, typography rhythm refinement, vertical spacing refinement,
 * baseline consistency, intelligent truncation, whitespace balancing.
 *
 * Typography should feel: confident and premium.
 */
export const IVisualPolishService = createDecorator<IVisualPolishService>('visualPolishService');

export interface IVisualPolishService {
	readonly _serviceBrand: undefined;

	/** Current visual polish state */
	readonly currentState: IVisualPolishState;

	/** Current polish configuration */
	readonly config: IVisualPolishConfig;

	/** Event: polish configuration changed */
	readonly onDidChangePolish: Event<IVisualPolishState>;

	/** Get the icon size for a context */
	getIconSize(context: string): IconSizeTier;

	/** Get the typography rhythm for a scale */
	getTypographyRhythm(scale: TypographyScale): ITypographyRhythm;

	/** Check if icon is optically aligned */
	isOpticallyAligned(iconId: string): boolean;

	/** Correct optical alignment for an icon */
	correctOpticalAlignment(iconId: string): void;

	/** Apply intelligent truncation to text */
	applyIntelligentTruncation(elementId: string, availableWidth: number): string;

	/** Validate typography discipline */
	validateTypography(): ITypographyDisciplineReport;

	/** Validate iconography consistency */
	validateIconography(): IIconographyDisciplineReport;
}

/**
 * Typography discipline report.
 */
export interface ITypographyDisciplineReport {
	readonly inconsistentWeights: number;
	readonly inconsistentScales: number;
	readonly baselineViolations: number;
	readonly truncationIssues: number;
	readonly overallDisciplineScore: number; // 0.0-1.0
	readonly issues: readonly ITypographyIssue[];
	readonly timestamp: number;
}

/**
 * Typography issue.
 */
export interface ITypographyIssue {
	readonly elementId: string;
	readonly issueType: 'inconsistent-weight' | 'scale-mismatch' | 'baseline-violation' | 'poor-truncation' | 'excessive-width';
	readonly description: string;
	readonly severity: 'critical' | 'warning' | 'info';
}

/**
 * Iconography discipline report.
 */
export interface IIconographyDisciplineReport {
	readonly inconsistentStrokes: number;
	readonly sizingViolations: number;
	readonly alignmentIssues: number;
	readonly overallDisciplineScore: number; // 0.0-1.0
	readonly issues: readonly IIconographyIssue[];
	readonly timestamp: number;
}

/**
 * Iconography issue.
 */
export interface IIconographyIssue {
	readonly iconId: string;
	readonly issueType: 'stroke-mismatch' | 'size-violation' | 'alignment-error' | 'padding-inconsistency';
	readonly description: string;
	readonly severity: 'critical' | 'warning' | 'info';
}

// ═══════════════════════════════════════════════════════════════════════════════
// TASK 9 — PRODUCTION UX VALIDATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Production UX violation types — things that make the product feel unpolished.
 */
export const enum ProductionUXViolationType {
	/** Too many elements in one area */
	ClutterDensity = 'clutter-density',
	/** Visual elements are not balanced */
	VisualImbalance = 'visual-imbalance',
	/** AI takes up too much visual space */
	AIOverDominance = 'ai-over-dominance',
	/** Too much animation happening */
	ExcessiveMotion = 'excessive-motion',
	/** Spacing is not consistent */
	InconsistentSpacing = 'inconsistent-spacing',
	/** Contrast is too harsh in some area */
	HarshContrast = 'harsh-contrast',
	/** Multiple accent colors competing */
	CompetingAccents = 'competing-accents',
	/** UI feels fragmented, not cohesive */
	VisualFragmentation = 'visual-fragmentation',
	/** Can't understand the hierarchy */
	UnreadableHierarchy = 'unreadable-hierarchy',
	/** Too many panels visible at once */
	PanelOverload = 'panel-overload',
}

/**
 * Production UX violation — a detected quality issue.
 */
export interface IProductionUXViolation {
	readonly type: ProductionUXViolationType;
	readonly severity: 'critical' | 'warning' | 'info';
	readonly description: string;
	readonly affectedSurfaces: readonly string[];
	readonly suggestion: string;
	readonly measuredValue: number; // the actual metric value
	readonly threshold: number; // the acceptable threshold
	readonly detectedAt: number;
}

/**
 * Production UX coherence report — overall quality assessment.
 */
export interface IProductionUXCoherenceReport {
	readonly violations: readonly IProductionUXViolation[];
	readonly criticalCount: number;
	readonly warningCount: number;
	readonly infoCount: number;
	readonly clutterScore: number; // 0.0-1.0 — lower is better
	readonly balanceScore: number; // 0.0-1.0
	readonly hierarchyScore: number; // 0.0-1.0
	readonly restraintScore: number; // 0.0-1.0 — higher is more restrained
	readonly overallCoherenceScore: number; // 0.0-1.0
	readonly feelsLikePrototype: boolean;
	readonly feelsLikeCommercialProduct: boolean;
	readonly timestamp: number;
}

/**
 * IProductionUXValidationService — Runtime production quality enforcement.
 *
 * Validates clutter density, visual imbalance, AI over-dominance,
 * excessive motion, inconsistent spacing, harsh contrast zones,
 * competing accents, visual fragmentation, unreadable hierarchy,
 * and panel overload.
 *
 * Generates Production UX coherence reports. Critical violations
 * must warn in dev mode.
 */
export const IProductionUXValidationService = createDecorator<IProductionUXValidationService>('productionUXValidationService');

export interface IProductionUXValidationService {
	readonly _serviceBrand: undefined;

	/** Event: production UX violation detected */
	readonly onDidDetectViolation: Event<IProductionUXViolation>;

	/** Event: coherence report generated */
	readonly onDidGenerateReport: Event<IProductionUXCoherenceReport>;

	/** Run a full production UX validation */
	validateFull(): IProductionUXCoherenceReport;

	/** Validate clutter density */
	validateClutterDensity(): IProductionUXViolation[];

	/** Validate visual balance */
	validateVisualBalance(): IProductionUXViolation[];

	/** Validate AI dominance */
	validateAIDominance(): IProductionUXViolation[];

	/** Validate motion discipline */
	validateMotionDiscipline(): IProductionUXViolation[];

	/** Validate spacing consistency */
	validateSpacingConsistency(): IProductionUXViolation[];

	/** Validate hierarchy readability */
	validateHierarchyReadability(): IProductionUXViolation[];

	/** Get the latest coherence report */
	readonly latestReport: IProductionUXCoherenceReport | null;

	/** Check if product feels like a prototype */
	readonly feelsLikePrototype: boolean;

	/** Check if product feels like a commercial product */
	readonly feelsLikeCommercialProduct: boolean;

	/** Get violation count by severity */
	getViolationCount(severity: 'critical' | 'warning' | 'info'): number;

	/** Warn about critical violations in dev mode */
	warnCriticalViolations(): void;
}

// ═══════════════════════════════════════════════════════════════════════════════
// TASK 10 — SIGNATURE PRODUCT FEEL
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Product philosophy dimensions — the emotional identity.
 */
export interface IProductPhilosophy {
	/** How interactions should feel */
	readonly interaction: IInteractionPhilosophy;
	/** How transitions should feel */
	readonly transition: ITransitionPhilosophy;
	/** How attention is managed */
	readonly attention: IAttentionPhilosophy;
	/** How the workspace feels */
	readonly workspace: IWorkspacePhilosophy;
	/** How AI behaves visually */
	readonly aiBehavior: IAIBehaviorPhilosophy;
	/** How visual pacing works */
	readonly visualPacing: IVisualPacingPhilosophy;
}

/**
 * Interaction philosophy — how the product responds to interaction.
 */
export interface IInteractionPhilosophy {
	readonly principle: string;
	readonly tone: 'confident' | 'calm' | 'precise' | 'responsive';
	readonly responseSpeed: 'instant' | 'immediate' | 'prompt' | 'measured';
	readonly feedbackStyle: 'subtle' | 'acknowledging' | 'minimal' | 'restrained';
	readonly errorHandling: 'graceful' | 'guiding' | 'calm' | 'protective';
}

/**
 * Transition philosophy — how change is communicated visually.
 */
export interface ITransitionPhilosophy {
	readonly principle: string;
	readonly motionStyle: 'weighted' | 'choreographed' | 'disciplined' | 'intentional';
	readonly transitionSpeed: 'measured' | 'weighted' | 'contextual' | 'silent-when-focused';
	readonly enterStyle: 'gentle' | 'staggered' | 'grounded' | 'subtle';
	readonly exitStyle: 'clean' | 'deferred' | 'quiet' | 'graceful';
}

/**
 * Attention philosophy — how the product manages user attention.
 */
export interface IAttentionPhilosophy {
	readonly principle: string;
	readonly prioritization: 'editor-first' | 'user-centric' | 'respectful' | 'minimal-competition';
	readonly interruptionPolicy: 'protective' | 'contextual' | 'deferred' | 'silent-in-flow';
	readonly aiPresence: 'deferred' | 'contextual' | 'earned' | 'restrained';
}

/**
 * Workspace philosophy — how the workspace feels.
 */
export interface IWorkspacePhilosophy {
	readonly principle: string;
	readonly spatialFeel: 'spacious' | 'organized' | 'sacred' | 'professional';
	readonly ownership: 'user-owns' | 'editor-dominant' | 'ai-yields' | 'personal';
	readonly chromeApproach: 'minimal' | 'quiet' | 'adaptive' | 'invisible-when-possible';
}

/**
 * AI behavior philosophy — how AI visually behaves.
 */
export interface IAIBehaviorPhilosophy {
	readonly principle: string;
	readonly defaultPresence: 'invisible' | 'passive' | 'contextual' | 'earned';
	readonly escalationPolicy: 'gradual' | 'consent-based' | 'trust-evolved' | 'never-uninvited';
	readonly visualTone: 'integrated' | 'embedded' | 'deferential' | 'calm';
}

/**
 * Visual pacing philosophy — how visual information is paced.
 */
export interface IVisualPacingPhilosophy {
	readonly principle: string;
	readonly informationDensity: 'restrained' | 'progressive' | 'contextual' | 'minimal';
	readonly revealStyle: 'gradual' | 'on-demand' | 'contextual' | 'earned';
	readonly restraint: 'maximum' | 'high' | 'disciplined' | 'intentional';
}

/**
 * Signature feel metrics — how well the product matches the philosophy.
 */
export interface ISignatureFeelMetrics {
	readonly intelligentScore: number; // 0.0-1.0
	readonly calmScore: number;
	readonly premiumScore: number;
	readonly focusedScore: number;
	readonly trustworthyScore: number;
	readonly restrainedScore: number;
	readonly capableScore: number;
	readonly respectfulScore: number;
	readonly overallFeelScore: number;
	readonly timestamp: number;
}

/**
 * ISignatureProductFeelService — The emotional identity of the product.
 *
 * The product should feel: intelligent, calm, premium, focused, trustworthy,
 * restrained, deeply capable, respectful.
 *
 * Defines interaction philosophy, transition philosophy, attention philosophy,
 * workspace philosophy, AI behavior philosophy, visual pacing philosophy.
 *
 * Goal: When someone uses this product, they should instantly feel:
 * "This is different."
 */
export const ISignatureProductFeelService = createDecorator<ISignatureProductFeelService>('signatureProductFeelService');

export interface ISignatureProductFeelService {
	readonly _serviceBrand: undefined;

	/** The product philosophy */
	readonly philosophy: IProductPhilosophy;

	/** Current signature feel metrics */
	readonly currentMetrics: ISignatureFeelMetrics;

	/** Event: feel metrics updated */
	readonly onDidChangeFeelMetrics: Event<ISignatureFeelMetrics>;

	/** Evaluate if the product feels intelligent */
	readonly feelsIntelligent: boolean;

	/** Evaluate if the product feels calm */
	readonly feelsCalm: boolean;

	/** Evaluate if the product feels premium */
	readonly feelsPremium: boolean;

	/** Evaluate if the product feels focused */
	readonly feelsFocused: boolean;

	/** Evaluate if the product feels trustworthy */
	readonly feelsTrustworthy: boolean;

	/** Evaluate if the product feels restrained */
	readonly feelsRestrained: boolean;

	/** Evaluate if the product feels deeply capable */
	readonly feelsCapable: boolean;

	/** Evaluate if the product feels respectful */
	readonly feelsRespectful: boolean;

	/** Run full feel assessment */
	assessFeel(): ISignatureFeelMetrics;

	/** Get the interaction philosophy */
	readonly interactionPhilosophy: IInteractionPhilosophy;

	/** Get the transition philosophy */
	readonly transitionPhilosophy: ITransitionPhilosophy;

	/** Get the attention philosophy */
	readonly attentionPhilosophy: IAttentionPhilosophy;

	/** Get the workspace philosophy */
	readonly workspacePhilosophy: IWorkspacePhilosophy;

	/** Get the AI behavior philosophy */
	readonly aiBehaviorPhilosophy: IAIBehaviorPhilosophy;

	/** Get the visual pacing philosophy */
	readonly visualPacingPhilosophy: IVisualPacingPhilosophy;

	/** Validate product feel matches philosophy */
	validateFeelAlignment(): IFeelAlignmentReport;
}

/**
 * Feel alignment report — validates product feel matches philosophy.
 */
export interface IFeelAlignmentReport {
	readonly philosophyAlignmentScore: number; // 0.0-1.0
	readonly interactionAlignment: number;
	readonly transitionAlignment: number;
	readonly attentionAlignment: number;
	readonly workspaceAlignment: number;
	readonly aiBehaviorAlignment: number;
	readonly visualPacingAlignment: number;
	readonly overallAlignmentScore: number;
	readonly misalignedDimensions: readonly string[];
	readonly timestamp: number;
}
