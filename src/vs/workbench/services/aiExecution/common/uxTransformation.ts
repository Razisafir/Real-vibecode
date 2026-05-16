/*---------------------------------------------------------------------------------------------
 *  Real Product UX Transformation Layer — Phase 13
 *  Real Vibecode — AI-Native IDE
 *
 *  UX Transformation — Transforms the UX from "many systems visible" to
 *  "one intelligent environment" where the user feels clarity, calmness,
 *  confidence, flow state, and trust in the AI.
 *
 *  PRINCIPLES:
 *    1. The editor is the hero surface — AI is the copilot, not the nightclub DJ
 *    2. AI should remain mostly passive unless confidence is high
 *    3. Avoid constant visual movement, persistent glowing indicators, attention hijacking
 *    4. Secondary panels should disappear when inactive
 *    5. User attention should never fragment
 *    6. Motion should be physical, weighted, never abrupt
 *    7. The interface should feel respectful, calm, expensive
 *    8. Premium software behavior — Linear, Apple Pro, Notion, Raycast quality
 *
 *  Tasks:
 *    1.  AI Presence Rebalancing — passive/assistive/collaborative/autonomous modes
 *    2.  Editor-First Experience — editor dominance, minimal chrome, focus modes
 *    3.  Cognitive Load Reduction Engine — track and reduce visible noise
 *    4.  Premium Microinteractions — weighted, physical, depth-aware transitions
 *    5.  AI Explanation UX — transparent reasoning, confidence display
 *    6.  Panel Hierarchy Rebuild — strict 4-tier visual priority
 *    7.  Attention Management System — respectful interruption orchestration
 *    8.  Performance Perception Engine — optimistic UI, skeleton states, latency masking
 *    9.  UX Consistency Validation — runtime coherence reports
 *   10.  Signature Product Identity — recognizable, disciplined interaction language
 *--------------------------------------------------------------------------------------------*/

import { Event } from '../../../../base/common/event.js';
import { IDisposable } from '../../../../base/common/lifecycle.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';

// ═══════════════════════════════════════════════════════════════════════════════
// TASK 1 — AI PRESENCE REBALANCING
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * AI Presence Levels — defines how visible/active the AI should be.
 *
 * The AI should remain mostly PASSIVE unless confidence is high.
 * The editor must remain the hero surface.
 * AI is the copilot — not the nightclub DJ.
 */
export const enum AIPresenceLevel {
	/** AI is invisible — no indicators, no suggestions, no visual presence.
	 *  Used when: user is typing rapidly, focused editing, zen mode */
	Passive = 'passive',
	/** AI provides subtle hints — inline suggestions, gentle status indicators.
	 *  Used when: user pauses, cursor idle, context changed */
	Assistive = 'assistive',
	/** AI shows suggestions and status — panels available but not dominant.
	 *  Used when: user explicitly asks, confidence is high, task requires AI */
	Collaborative = 'collaborative',
	/** AI takes visible action — execution panels, mutation indicators, progress.
	 *  Used when: user approved execution, autonomous task running */
	Autonomous = 'autonomous',
}

/**
 * Rules that govern when AI presence can escalate or must de-escalate.
 */
export interface IAIPresenceRule {
	readonly fromLevel: AIPresenceLevel;
	readonly toLevel: AIPresenceLevel;
	readonly condition: string;
	readonly confidenceThreshold: number;
	readonly requiresUserConsent: boolean;
}

/**
 * Current AI presence state — snapshot of the AI's visual behavior.
 */
export interface IAIPresenceState {
	readonly currentLevel: AIPresenceLevel;
	readonly previousLevel: AIPresenceLevel;
	readonly transitionReason: string;
	readonly confidenceScore: number;
	readonly visibleIndicators: number;
	readonly activeSuggestions: number;
	readonly attentionOccupancy: number; // 0.0-1.0 how much visual space AI occupies
	readonly timestamp: number;
}

/**
 * IAIPresenceService — Manages AI visual presence levels.
 *
 * Ensures AI never dominates the interface. Transitions between
 * passive/assistive/collaborative/autonomous modes based on context,
 * confidence, and user behavior.
 */
export const IAIPresenceService = createDecorator<IAIPresenceService>('aiPresenceService');

export interface IAIPresenceService {
	readonly _serviceBrand: undefined;

	/** Current AI presence level */
	readonly currentLevel: AIPresenceLevel;

	/** Current presence state */
	readonly currentState: IAIPresenceState;

	/** Event: presence level changed */
	readonly onDidChangePresence: Event<IAIPresenceState>;

	/** Request a presence level change — subject to rules */
	requestPresenceLevel(level: AIPresenceLevel, reason: string): boolean;

	/** Force de-escalation to passive — emergency calm */
	deescalateToPassive(reason: string): void;

	/** Check if a visual action is allowed at current presence level */
	isVisualActionAllowed(action: string): boolean;

	/** Get current attention occupancy (0.0-1.0) */
	readonly attentionOccupancy: number;

	/** Calculate maximum allowed visual indicators for current level */
	getMaxAllowedIndicators(): number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// TASK 2 — EDITOR-FIRST EXPERIENCE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Editor focus mode — determines how much chrome is visible.
 */
export const enum EditorFocusMode {
	/** Normal — all panels visible, standard chrome */
	Normal = 'normal',
	/** Focus — secondary panels collapsed, editor dominant */
	Focus = 'focus',
	/** Zen — minimal chrome, only editor and essential indicators */
	Zen = 'zen',
}

/**
 * Panel auto-collapse behavior.
 */
export const enum PanelCollapseBehavior {
	/** Panel stays visible */
	None = 'none',
	/** Panel collapses after inactivity timeout */
	AfterInactivity = 'after-inactivity',
	/** Panel collapses after task completion */
	AfterCompletion = 'after-completion',
	/** Panel collapses when editor receives focus */
	OnEditorFocus = 'on-editor-focus',
	/** Panel collapses when another panel opens */
	OnPanelSwitch = 'on-panel-switch',
}

/**
 * Panel reveal condition — when a panel should appear.
 */
export const enum PanelRevealCondition {
	/** Never auto-reveal */
	Never = 'never',
	/** Reveal when relevant to current task */
	Contextual = 'contextual',
	/** Reveal when AI has important information */
	OnAIInsight = 'on-ai-insight',
	/** Reveal when user explicitly requests */
	OnUserRequest = 'on-user-request',
	/** Reveal when execution requires attention */
	OnExecutionEvent = 'on-execution-event',
}

/**
 * Editor panel configuration.
 */
export interface IEditorPanelConfig {
	readonly panelId: string;
	readonly collapseBehavior: PanelCollapseBehavior;
	readonly revealCondition: PanelRevealCondition;
	readonly inactivityTimeoutMs: number;
	readonly autoMinimizeAfterCompletion: boolean;
	readonly priority: number; // 1 = highest
}

/**
 * Current editor experience state.
 */
export interface IEditorExperienceState {
	readonly focusMode: EditorFocusMode;
	readonly visiblePanels: readonly string[];
	readonly collapsedPanels: readonly string[];
	readonly editorOccupancyRatio: number; // 0.0-1.0 how much screen is editor
	readonly lastEditorInteraction: number;
	readonly isDistractionSuppressed: boolean;
	readonly timestamp: number;
}

/**
 * IEditorExperienceService — Ensures editor dominance at all times.
 *
 * Manages adaptive panel collapsing, focus modes, and contextual reveal.
 * The editor is always the hero surface. Everything else supports it.
 */
export const IEditorExperienceService = createDecorator<IEditorExperienceService>('editorExperienceService');

export interface IEditorExperienceService {
	readonly _serviceBrand: undefined;

	/** Current editor experience state */
	readonly currentState: IEditorExperienceState;

	/** Current focus mode */
	readonly focusMode: EditorFocusMode;

	/** Event: focus mode changed */
	readonly onDidChangeFocusMode: Event<EditorFocusMode>;

	/** Event: panel collapsed or revealed */
	readonly onDidChangePanelVisibility: Event<{ panelId: string; visible: boolean; reason: string }>;

	/** Enter focus mode */
	enterFocusMode(): void;

	/** Enter zen mode */
	enterZenMode(): void;

	/** Exit to normal mode */
	exitFocusMode(): void;

	/** Configure a panel's behavior */
	configurePanel(config: IEditorPanelConfig): void;

	/** Collapse a panel */
	collapsePanel(panelId: string, reason: string): void;

	/** Reveal a panel if conditions are met */
	revealPanel(panelId: string, condition: PanelRevealCondition): boolean;

	/** Suppress all distractions temporarily */
	suppressDistractions(duration?: number): IDisposable;

	/** Get editor occupancy ratio */
	readonly editorOccupancyRatio: number;

	/** Auto-minimize completed execution panels */
	autoMinimizeCompleted(): void;
}

// ═══════════════════════════════════════════════════════════════════════════════
// TASK 3 — COGNITIVE LOAD REDUCTION ENGINE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Cognitive load metrics — what the system tracks.
 */
export interface ICognitiveLoadMetrics {
	/** Number of visible panels */
	visiblePanelCount: number;
	/** Number of active notifications */
	activeNotificationCount: number;
	/** Animation density (0.0-1.0) — how much motion is on screen */
	animationDensity: number;
	/** Number of concurrent highlights/emphasis */
	concurrentHighlights: number;
	/** Active attention zones — areas competing for attention */
	activeAttentionZones: number;
	/** Total cognitive load score (0.0-1.0) */
	totalLoadScore: number;
	/** Whether the load exceeds the comfort threshold */
	isOverloaded: boolean;
	/** Timestamp of measurement */
	timestamp: number;
}

/**
 * Cognitive load threshold — when to trigger reduction.
 */
export const enum CognitiveLoadThreshold {
	/** Comfortable — no action needed */
	Comfortable = 0.4,
	/** Moderate — start reducing low-priority elements */
	Moderate = 0.6,
	/** High — actively suppress non-essential UI */
	High = 0.75,
	/** Critical — emergency reduction, minimal UI */
	Critical = 0.9,
}

/**
 * Noise reduction action.
 */
export interface INoiseReductionAction {
	readonly actionType: 'collapse-panel' | 'suppress-notification' | 'reduce-animation' | 'remove-highlight' | 'quiet-surface';
	readonly targetId: string;
	readonly reason: string;
	readonly loadBefore: number;
	readonly loadAfter: number;
	readonly timestamp: number;
}

/**
 * ICognitiveLoadService — Tracks and reduces cognitive load dynamically.
 *
 * Monitors visible panels, notifications, animations, highlights, and
 * attention zones. Reduces noise dynamically to keep user attention focused.
 */
export const ICognitiveLoadService = createDecorator<ICognitiveLoadService>('cognitiveLoadService');

export interface ICognitiveLoadService {
	readonly _serviceBrand: undefined;

	/** Current cognitive load metrics */
	readonly currentMetrics: ICognitiveLoadMetrics;

	/** Event: cognitive load changed */
	readonly onDidChangeCognitiveLoad: Event<ICognitiveLoadMetrics>;

	/** Event: noise reduction action taken */
	readonly onDidReduceNoise: Event<INoiseReductionAction>;

	/** Force a load recalculation */
	recalculate(): ICognitiveLoadMetrics;

	/** Register a visible panel for tracking */
	registerPanel(panelId: string, priority: number): void;

	/** Unregister a panel */
	unregisterPanel(panelId: string): void;

	/** Register an active notification */
	registerNotification(notificationId: string, priority: number): void;

	/** Unregister a notification */
	unregisterNotification(notificationId: string): void;

	/** Register an animation */
	registerAnimation(animationId: string, intensity: number): void;

	/** Unregister an animation */
	unregisterAnimation(animationId: string): void;

	/** Register a highlight zone */
	registerHighlight(zoneId: string): void;

	/** Unregister a highlight */
	unregisterHighlight(zoneId: string): void;

	/** Suppress low-priority UI during execution */
	suppressLowPriority(): INoiseReductionAction[];

	/** Collapse redundant surfaces */
	collapseRedundant(): INoiseReductionAction[];

	/** Reduce simultaneous emphasis */
	reduceEmphasis(): INoiseReductionAction[];

	/** Get load history */
	getLoadHistory(duration: number): readonly ICognitiveLoadMetrics[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// TASK 4 — PREMIUM MICROINTERACTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Microinteraction category.
 */
export const enum MicrointeractionType {
	/** Hover over an element */
	Hover = 'hover',
	/** Press/click an element */
	Press = 'press',
	/** Release an element */
	Release = 'release',
	/** Panel slide in/out */
	PanelSlide = 'panel-slide',
	/** Panel resize */
	PanelResize = 'panel-resize',
	/** Element appear */
	Appear = 'appear',
	/** Element disappear */
	Disappear = 'disappear',
	/** Scroll movement */
	Scroll = 'scroll',
	/** Focus change */
	FocusChange = 'focus-change',
	/** State transition */
	StateTransition = 'state-transition',
}

/**
 * Easing function type — for premium physical feel.
 */
export const enum PremiumEasing {
	/** Standard ease — most UI transitions */
	Standard = 'cubic-bezier(0.4, 0, 0.2, 1)',
	/** Deceleration — elements entering view */
	Decelerate = 'cubic-bezier(0, 0, 0.2, 1)',
	/** Acceleration — elements leaving view */
	Accelerate = 'cubic-bezier(0.4, 0, 1, 1)',
	/** Sharp — quick feedback (press, toggle) */
	Sharp = 'cubic-bezier(0.4, 0, 0.6, 1)',
	/** Weighted — panel movement with perceived mass */
	Weighted = 'cubic-bezier(0.25, 0.1, 0.25, 1)',
	/** Magnetic — subtle pull toward alignment */
	Magnetic = 'cubic-bezier(0.175, 0.885, 0.32, 1.075)',
}

/**
 * Premium motion specification.
 */
export interface IPremiumMotionSpec {
	readonly type: MicrointeractionType;
	readonly durationMs: number;
	readonly easing: PremiumEasing;
	readonly delayMs: number;
	readonly opacityFrom: number;
	readonly opacityTo: number;
	readonly translateX?: number;
	readonly translateY?: number;
	readonly scale?: number;
	readonly perceivedWeight: number; // 0.0-1.0 how "heavy" the element feels
	readonly depthEffect: boolean; // whether to apply depth/z-shadow during motion
}

/**
 * Cursor proximity response — elements near cursor react subtly.
 */
export interface IProximityResponse {
	readonly elementId: string;
	readonly responseRadius: number; // px from cursor
	readonly opacityBoost: number; // 0.0-0.3 subtle
	readonly scaleBoost: number; // 1.0-1.02 subtle
	readonly shadowBoost: number; // subtle elevation increase
}

/**
 * Scroll smoothness configuration.
 */
export interface IScrollSmoothness {
	readonly momentumRetention: number; // 0.0-1.0
	readonly decelerationRate: number;
	readonly snapAlignment: boolean;
	readonly snapInterval: number; // px
}

/**
 * IPremiumMicrointeractionService — Premium-feeling interaction layer.
 *
 * Hover transitions feel physical. Panel movement feels weighted.
 * No abrupt jumps. Scrolling feels smooth. Intelligent easing selection.
 * Subtle opacity transitions, depth perception, magnetic alignment feel.
 *
 * Think: Linear, Apple Pro apps, Notion, Raycast, Arc Browser.
 * NO gimmicks. NO flashy neon behavior.
 */
export const IPremiumMicrointeractionService = createDecorator<IPremiumMicrointeractionService>('premiumMicrointeractionService');

export interface IPremiumMicrointeractionService {
	readonly _serviceBrand: undefined;

	/** Get motion specification for a microinteraction type */
	getMotionSpec(type: MicrointeractionType): IPremiumMotionSpec;

	/** Apply hover transition to an element */
	applyHoverTransition(elementId: string): void;

	/** Apply weighted panel movement */
	applyWeightedMovement(elementId: string, type: MicrointeractionType): void;

	/** Apply depth effect during motion */
	applyDepthEffect(elementId: string, active: boolean): void;

	/** Apply magnetic alignment pull */
	applyMagneticAlignment(elementId: string, targetX: number, targetY: number): void;

	/** Register cursor proximity response */
	registerProximityResponse(response: IProximityResponse): IDisposable;

	/** Configure scroll smoothness */
	configureScrollSmoothness(config: IScrollSmoothness): void;

	/** Normalize transition timing for consistency */
	normalizeTransition(elementId: string, durationMs: number): number;

	/** Validate that motion is cohesive */
	validateMotionCohesion(): IMotionCohesionReport;
}

/**
 * Motion cohesion report — validates consistency.
 */
export interface IMotionCohesionReport {
	readonly inconsistentEasings: number;
	readonly abruptTransitions: number;
	readonly missingDepthEffects: number;
	readonly inconsistentDurations: number;
	readonly overallCohesionScore: number; // 0.0-1.0
	readonly issues: readonly IMotionIssue[];
	readonly timestamp: number;
}

/**
 * A motion cohesion issue.
 */
export interface IMotionIssue {
	readonly elementId: string;
	readonly issueType: 'inconsistent-easing' | 'abrupt-transition' | 'missing-depth' | 'duration-mismatch';
	readonly description: string;
	readonly severity: 'warning' | 'error';
}

// ═══════════════════════════════════════════════════════════════════════════════
// TASK 5 — AI TRANSPARENCY UX
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * AI explanation verbosity level.
 */
export const enum ExplanationVerbosity {
	/** One-line summary — default */
	Minimal = 'minimal',
	/** Short paragraph — on hover or expand */
	Standard = 'standard',
	/** Detailed explanation — explicit request */
	Detailed = 'detailed',
}

/**
 * Reasoning display format.
 */
export const enum ReasoningFormat {
	/** Inline text next to action */
	Inline = 'inline',
	/** Tooltip on hover */
	Tooltip = 'tooltip',
	/** Expandable section below action */
	Expandable = 'expandable',
	/** Dedicated panel */
	Panel = 'panel',
}

/**
 * AI action explanation — why the AI did something.
 */
export interface IAIActionExplanation {
	readonly actionId: string;
	readonly actionType: string;
	readonly reason: string;
	readonly confidenceScore: number; // 0.0-1.0
	readonly reasoningSummary: string;
	readonly alternativesConsidered: readonly string[];
	readonly dataSources: readonly string[];
	readonly verbosity: ExplanationVerbosity;
	readonly timestamp: number;
}

/**
 * AI suggestion explanation — why a suggestion appeared.
 */
export interface IAISuggestionExplanation {
	readonly suggestionId: string;
	readonly suggestionType: string;
	readonly triggerReason: string;
	readonly confidenceScore: number;
	readonly reasoningSummary: string;
	readonly relevanceToContext: string;
	readonly verbosity: ExplanationVerbosity;
	readonly timestamp: number;
}

/**
 * Confidence display style.
 */
export const enum ConfidenceDisplayStyle {
	/** No visible indicator */
	Hidden = 'hidden',
	/** Subtle dot indicator */
	Dot = 'dot',
	/** Small badge with percentage */
	Badge = 'badge',
	/** Color-coded opacity */
	OpacityCoded = 'opacity-coded',
}

/**
 * IAITransparencyService — Makes AI understandable, not mysterious.
 *
 * Explains WHY actions occurred, WHY suggestions appeared.
 * Shows confidence scores naturally. Displays reasoning summaries elegantly.
 *
 * Rules: no giant debug dumps, no chain-of-thought exposure.
 * Concise reasoning only. User should feel "the AI is understandable."
 */
export const IAITransparencyService = createDecorator<IAITransparencyService>('aiTransparencyService');

export interface IAITransparencyService {
	readonly _serviceBrand: undefined;

	/** Event: new action explanation available */
	readonly onDidExplainAction: Event<IAIActionExplanation>;

	/** Event: new suggestion explanation available */
	readonly onDidExplainSuggestion: Event<IAISuggestionExplanation>;

	/** Request explanation for an AI action */
	explainAction(actionId: string, verbosity?: ExplanationVerbosity): IAIActionExplanation | null;

	/** Request explanation for an AI suggestion */
	explainSuggestion(suggestionId: string, verbosity?: ExplanationVerbosity): IAISuggestionExplanation | null;

	/** Get the default verbosity level */
	readonly defaultVerbosity: ExplanationVerbosity;

	/** Set the default verbosity level */
	setDefaultVerbosity(level: ExplanationVerbosity): void;

	/** Get confidence display style */
	readonly confidenceDisplayStyle: ConfidenceDisplayStyle;

	/** Set confidence display style */
	setConfidenceDisplayStyle(style: ConfidenceDisplayStyle): void;

	/** Generate "why did this happen?" resolution for an action */
	resolveWhyDidThisHappen(actionId: string): IWhyResolution | null;

	/** Get all explanations for a time range */
	getExplanationsForRange(startTime: number, endTime: number): readonly IAIActionExplanation[];

	/** Register an AI action for explanation tracking */
	registerActionForExplanation(actionId: string, actionType: string, reason: string, confidence: number): void;

	/** Register an AI suggestion for explanation tracking */
	registerSuggestionForExplanation(suggestionId: string, suggestionType: string, triggerReason: string, confidence: number): void;
}

/**
 * "Why did this happen?" resolution — causal trace for an action.
 */
export interface IWhyResolution {
	readonly actionId: string;
	readonly directCause: string;
	readonly causalChain: readonly IWhyLink[];
	readonly userContext: string;
	readonly confidenceAssessment: string;
	readonly alternativeOutcomes: readonly string[];
	readonly timestamp: number;
}

/**
 * A link in the "why" causal chain.
 */
export interface IWhyLink {
	readonly step: string;
	readonly description: string;
	readonly evidence: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// TASK 6 — PANEL HIERARCHY REBUILD
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Panel hierarchy tiers — strict visual priority.
 * Only one Tier 2 surface should dominate at once.
 * All other surfaces must visually yield.
 */
export const enum PanelTier {
	/** Tier 1: Editor — always dominant, maximum space */
	Editor = 1,
	/** Tier 2: Active task surfaces — one at a time */
	ActiveTask = 2,
	/** Tier 3: AI assistance — contextual, yielding */
	AIAssistance = 3,
	/** Tier 4: Logs / diagnostics / graph — always subdued */
	Diagnostics = 4,
}

/**
 * Visual de-emphasis strategy.
 */
export const enum DeemphasisStrategy {
	/** No de-emphasis — full visibility */
	None = 'none',
	/** Reduced opacity */
	OpacityReduction = 'opacity-reduction',
	/** Smaller scale */
	FocusWeightScaling = 'focus-weight-scaling',
	/** Muted colors */
	ColorDesaturation = 'color-desaturation',
	/** Dimmed text */
	InactiveQuieting = 'inactive-quieting',
	/** Combined approach */
	Combined = 'combined',
}

/**
 * Panel hierarchy configuration.
 */
export interface IPanelHierarchyConfig {
	readonly panelId: string;
	readonly tier: PanelTier;
	readonly baseOpacity: number;
	readonly inactiveOpacity: number;
	readonly emphasisScale: number;
	readonly deemphasisStrategy: DeemphasisStrategy;
	readonly allowedConcurrentInTier: number;
	readonly autoYieldTimeoutMs: number;
}

/**
 * Panel hierarchy state.
 */
export interface IPanelHierarchyState {
	readonly activeTier2Panel: string | null;
	readonly tierAssignments: ReadonlyMap<string, PanelTier>;
	readonly visualStates: ReadonlyMap<string, IPanelVisualState>;
	readonly dominantSurface: string;
	readonly timestamp: number;
}

/**
 * Visual state of a panel in the hierarchy.
 */
export interface IPanelVisualState {
	readonly panelId: string;
	readonly tier: PanelTier;
	readonly currentOpacity: number;
	readonly currentScale: number;
	readonly isActive: boolean;
	readonly isVisuallyYielding: boolean;
	readonly deemphasisReason: string;
}

/**
 * IPanelHierarchyService — Strict panel hierarchy enforcement.
 *
 * Tier 1: Editor (always dominant)
 * Tier 2: Active task surfaces (one at a time)
 * Tier 3: AI assistance (contextual, yielding)
 * Tier 4: Logs/diagnostics/graph (always subdued)
 *
 * Automatic visual de-emphasis, opacity hierarchy, focus-weight scaling.
 */
export const IPanelHierarchyService = createDecorator<IPanelHierarchyService>('panelHierarchyService');

export interface IPanelHierarchyService {
	readonly _serviceBrand: undefined;

	/** Current panel hierarchy state */
	readonly currentState: IPanelHierarchyState;

	/** Event: hierarchy changed */
	readonly onDidChangeHierarchy: Event<IPanelHierarchyState>;

	/** Event: Tier 2 surface changed */
	readonly onDidChangeActiveTaskSurface: Event<string | null>;

	/** Register a panel in the hierarchy */
	registerPanel(config: IPanelHierarchyConfig): void;

	/** Unregister a panel */
	unregisterPanel(panelId: string): void;

	/** Set the active Tier 2 surface — all other Tier 2 surfaces yield */
	setActiveTaskSurface(panelId: string): void;

	/** Clear the active Tier 2 surface */
	clearActiveTaskSurface(): void;

	/** Get the visual state of a panel */
	getPanelVisualState(panelId: string): IPanelVisualState | null;

	/** Apply visual de-emphasis to all yielding panels */
	applyVisualHierarchy(): void;

	/** Get panels in a tier */
	getPanelsInTier(tier: PanelTier): readonly string[];

	/** Check if a panel should visually yield */
	shouldYield(panelId: string): boolean;

	/** Force all non-editor panels to yield */
	yieldAllToEditor(reason: string): void;
}

// ═══════════════════════════════════════════════════════════════════════════════
// TASK 7 — ATTENTION MANAGEMENT SYSTEM
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * User interaction record — what the user interacted with.
 */
export interface IUserInteractionRecord {
	readonly surfaceId: string;
	readonly interactionType: 'click' | 'hover' | 'focus' | 'dismiss' | 'ignore';
	readonly timestamp: number;
	readonly duration: number; // how long the interaction lasted
}

/**
 * Dismissal record — when a user dismissed something.
 */
export interface IDismissalRecord {
	readonly surfaceId: string;
	readonly dismissedAt: number;
	readonly dismissCount: number;
	readonly lastDismissedAt: number;
}

/**
 * Attention priority level.
 */
export const enum AttentionPriority {
	/** Critical — must show immediately (errors, required actions) */
	Critical = 'critical',
	/** Important — show when contextually relevant */
	Important = 'important',
	/** Normal — show if not suppressed */
	Normal = 'normal',
	/** Low — only show if user seeks it */
	Low = 'low',
	/** Suppressed — do not show */
	Suppressed = 'suppressed',
}

/**
 * Interruption policy.
 */
export const enum InterruptionPolicy {
	/** Never interrupt */
	Never = 'never',
	/** Only interrupt for critical events */
	CriticalOnly = 'critical-only',
	/** Interrupt for important events during idle */
	IdleOnly = 'idle-only',
	/** Allow contextual interruptions */
	Contextual = 'contextual',
}

/**
 * Attention orchestration state.
 */
export interface IAttentionState {
	readonly activeSurface: string | null;
	readonly recentlyIgnoredSurfaces: readonly string[];
	readonly repeatedlyDismissedSurfaces: readonly string[];
	readonly suppressedHints: readonly string[];
	readonly currentInterruptionPolicy: InterruptionPolicy;
	readonly userEngagementScore: number; // 0.0-1.0 how engaged the user is
	readonly timestamp: number;
}

/**
 * IAttentionOrchestratorService — Makes the UI feel respectful.
 *
 * Tracks what user is actively interacting with, recently ignored,
 * and repeatedly dismissed. Uses this to reduce interruptions,
 * suppress repetitive prompts, avoid re-showing ignored AI hints,
 * and prioritize relevance.
 */
export const IAttentionOrchestratorService = createDecorator<IAttentionOrchestratorService>('attentionOrchestratorService');

export interface IAttentionOrchestratorService {
	readonly _serviceBrand: undefined;

	/** Current attention state */
	readonly currentState: IAttentionState;

	/** Event: active surface changed */
	readonly onDidChangeActiveSurface: Event<string | null>;

	/** Event: surface suppressed */
	readonly onDidSuppressSurface: Event<string>;

	/** Record a user interaction */
	recordInteraction(record: IUserInteractionRecord): void;

	/** Record a dismissal */
	recordDismissal(surfaceId: string): void;

	/** Check if a surface should be shown (not ignored/dismissed) */
	shouldShowSurface(surfaceId: string): boolean;

	/** Get the attention priority for a surface */
	getAttentionPriority(surfaceId: string): AttentionPriority;

	/** Check if an interruption is allowed */
	isInterruptionAllowed(priority: AttentionPriority): boolean;

	/** Get the interruption policy */
	readonly interruptionPolicy: InterruptionPolicy;

	/** Set the interruption policy */
	setInterruptionPolicy(policy: InterruptionPolicy): void;

	/** Suppress a hint from re-appearing */
	suppressHint(hintId: string, duration?: number): void;

	/** Get surfaces the user has repeatedly dismissed */
	getRepeatedlyDismissed(): readonly IDismissalRecord[];

	/** Get the current user engagement score */
	readonly userEngagementScore: number;

	/** Reset dismissal records for a surface */
	resetDismissals(surfaceId: string): void;
}

// ═══════════════════════════════════════════════════════════════════════════════
// TASK 8 — PERFORMANCE PERCEPTION ENGINE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Optimistic update state.
 */
export interface IOptimisticUpdate {
	readonly updateId: string;
	readonly targetElement: string;
	readonly expectedState: string;
	readonly appliedAt: number;
	readonly confirmedAt: number | null;
	readonly reverted: boolean;
}

/**
 * Skeleton state configuration.
 */
export interface ISkeletonConfig {
	readonly elementId: string;
	readonly skeletonType: 'text' | 'card' | 'list' | 'image' | 'chart';
	readonly animationType: 'shimmer' | 'pulse' | 'none';
	readonly minDisplayTimeMs: number;
	readonly maxDisplayTimeMs: number;
	readonly transitionToContentMs: number;
}

/**
 * Latency masking strategy.
 */
export const enum LatencyMaskStrategy {
	/** Show skeleton immediately */
	Skeleton = 'skeleton',
	/** Show previous content with subtle refresh indicator */
	StaleWithIndicator = 'stale-with-indicator',
	/** Show progress bar */
	ProgressBar = 'progress-bar',
	/** Show spinner in-place */
	Spinner = 'spinner',
	/** Animated transition that disguises loading */
	TransitionBuffer = 'transition-buffer',
}

/**
 * Perceived performance metrics.
 */
export interface IPerceivedPerformanceMetrics {
	readonly averageResponseFeelMs: number; // how fast things FEEL
	readonly actualAverageResponseMs: number; // how fast things ARE
	readonly perceptionGainMs: number; // improvement from masking
	readonly skeletonUsageCount: number;
	readonly optimisticUpdateCount: number;
	readonly layoutShiftCount: number; // should be 0
	readonly blockingFeelCount: number; // should be 0
	readonly timestamp: number;
}

/**
 * IPerceivedPerformanceService — Makes the interface feel responsive.
 *
 * Users judge performance emotionally, not technically.
 * Optimistic UI updates, skeleton states, predictive rendering,
 * animation masking, latency smoothing, transition buffering.
 *
 * Rules: no flashing layout shifts, no instant panel snapping, no blocking feel.
 */
export const IPerceivedPerformanceService = createDecorator<IPerceivedPerformanceService>('perceivedPerformanceService');

export interface IPerceivedPerformanceService {
	readonly _serviceBrand: undefined;

	/** Current perceived performance metrics */
	readonly currentMetrics: IPerceivedPerformanceMetrics;

	/** Apply an optimistic update */
	applyOptimisticUpdate(update: IOptimisticUpdate): void;

	/** Confirm an optimistic update */
	confirmOptimisticUpdate(updateId: string): void;

	/** Revert an optimistic update */
	revertOptimisticUpdate(updateId: string): void;

	/** Show a skeleton state */
	showSkeleton(config: ISkeletonConfig): IDisposable;

	/** Choose the best latency mask strategy for a given wait time */
	chooseMaskStrategy(estimatedWaitMs: number): LatencyMaskStrategy;

	/** Smooth a transition to prevent layout shift */
	smoothTransition(elementId: string, fromHeight: number, toHeight: number): void;

	/** Buffer a transition to prevent instant snapping */
	bufferTransition(elementId: string, durationMs: number): void;

	/** Predict what will render next and pre-prepare */
	predictiveRender(elementId: string, predictedContent: string): void;

	/** Record actual vs perceived timing */
	recordTiming(operationId: string, actualMs: number, perceivedMs: number): void;

	/** Get perceived performance metrics */
	getMetrics(): IPerceivedPerformanceMetrics;

	/** Validate: no layout shifts, no blocking feel */
	validate(): IPerceivedPerformanceValidation;
}

/**
 * Perceived performance validation result.
 */
export interface IPerceivedPerformanceValidation {
	readonly layoutShiftViolations: number;
	readonly instantSnapViolations: number;
	readonly blockingFeelViolations: number;
	readonly averagePerceptionGainMs: number;
	readonly passed: boolean;
	readonly issues: readonly string[];
	readonly timestamp: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// TASK 9 — UX CONSISTENCY VALIDATION ENGINE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * UX consistency violation types.
 */
export const enum UXViolationType {
	/** Too many things competing for attention */
	AttentionOverload = 'attention-overload',
	/** Too much motion at once */
	ExcessiveMotion = 'excessive-motion',
	/** Multiple accent colors competing */
	CompetingAccents = 'competing-accents',
	/** Too many surfaces active simultaneously */
	TooManyActiveSurfaces = 'too-many-active-surfaces',
	/** Notifications appearing too frequently */
	NotificationSpam = 'notification-spam',
	/** Interaction timing not consistent across elements */
	InconsistentTiming = 'inconsistent-timing',
	/** Panel hierarchy violated — equal priority surfaces competing */
	HierarchyViolation = 'hierarchy-violation',
	/** AI presence too dominant */
	AIDominanceViolation = 'ai-dominance-violation',
	/** Cognitive load exceeds comfort threshold */
	CognitiveOverload = 'cognitive-overload',
}

/**
 * UX violation severity.
 */
export const enum UXViolationSeverity {
	Critical = 'critical',
	Warning = 'warning',
	Info = 'info',
}

/**
 * A detected UX consistency violation.
 */
export interface IUXViolation {
	readonly type: UXViolationType;
	readonly severity: UXViolationSeverity;
	readonly description: string;
	readonly affectedElements: readonly string[];
	readonly suggestion: string;
	readonly detectedAt: number;
}

/**
 * UX coherence report.
 */
export interface IUXCoherenceReport {
	readonly violations: readonly IUXViolation[];
	readonly criticalCount: number;
	readonly warningCount: number;
	readonly infoCount: number;
	readonly coherenceScore: number; // 0.0-1.0
	readonly attentionLoadScore: number; // 0.0-1.0
	readonly motionCohesionScore: number; // 0.0-1.0
	readonly hierarchyComplianceScore: number; // 0.0-1.0
	readonly aiPresenceScore: number; // 0.0-1.0 (1.0 = perfectly balanced)
	readonly passed: boolean;
	readonly checkedAt: number;
	readonly durationMs: number;
}

/**
 * IUXConsistencyService — Runtime UX coherence validation.
 *
 * Validates at runtime for:
 *   - Attention overload
 *   - Excessive simultaneous motion
 *   - Competing accent colors
 *   - Too many active surfaces
 *   - Notification spam
 *   - Inconsistent interaction timing
 *
 * Generates UX coherence reports.
 */
export const IUXConsistencyService = createDecorator<IUXConsistencyService>('uxConsistencyService');

export interface IUXConsistencyService {
	readonly _serviceBrand: undefined;

	/** Run a full UX consistency check */
	runConsistencyCheck(): IUXCoherenceReport;

	/** Check a specific aspect */
	checkAttention(): IUXCoherenceReport;
	checkMotion(): IUXCoherenceReport;
	checkHierarchy(): IUXCoherenceReport;
	checkAIPresence(): IUXCoherenceReport;

	/** Event: UX violation detected */
	readonly onDidDetectUXViolation: Event<IUXViolation>;

	/** Get current UX coherence score */
	readonly coherenceScore: number;

	/** Whether automatic validation is enabled */
	readonly autoValidationEnabled: boolean;

	/** Enable/disable automatic validation */
	setAutoValidation(enabled: boolean): void;

	/** Get recent violations */
	getRecentViolations(count: number): readonly IUXViolation[];

	/** Get the latest coherence report */
	readonly latestReport: IUXCoherenceReport | null;

	/** Export coherence report as structured data */
	exportReport(): IUXCoherenceReport;
}

// ═══════════════════════════════════════════════════════════════════════════════
// TASK 10 — SIGNATURE PRODUCT IDENTITY
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Signature interaction philosophy — the core belief about how users interact.
 */
export interface ISignatureInteractionPhilosophy {
	/** Core belief statement */
	readonly coreBelief: string;
	/** Interaction principles */
	readonly principles: readonly string[];
	/** Forbidden patterns */
	readonly forbiddenPatterns: readonly string[];
	/** Emotional target */
	readonly emotionalTarget: string;
}

/**
 * Signature motion language — how the product moves.
 */
export interface ISignatureMotionLanguage {
	/** Motion personality */
	readonly personality: 'calm' | 'confident' | 'precise' | 'effortless';
	/** Default transition style */
	readonly defaultTransition: PremiumEasing;
	/** Panel choreography style */
	readonly panelChoreography: 'slide' | 'fade' | 'morph';
	/** Element weight feel */
	readonly weightPerception: 'light' | 'balanced' | 'substantial';
	/** Signature entrance animation */
	readonly entranceStyle: 'emerge' | 'slide-up' | 'fade-in' | 'scale-up';
	/** Signature exit animation */
	readonly exitStyle: 'dissolve' | 'slide-away' | 'fade-out' | 'scale-down';
	/** Rest state — how elements look when not moving */
	readonly restState: 'still' | 'subtle-breathe' | 'alive';
}

/**
 * Signature AI behavior — how the AI acts visually.
 */
export interface ISignatureAIBehavior {
	/** AI visual personality */
	readonly personality: 'quiet' | 'present' | 'collaborative';
	/** When AI appears */
	readonly appearanceTrigger: 'always' | 'on-demand' | 'contextual';
	/** How AI communicates */
	readonly communicationStyle: 'minimal' | 'informative' | 'transparent';
	/** How AI indicates confidence */
	readonly confidenceDisplay: 'subtle' | 'visible' | 'explicit';
	/** How AI handles errors */
	readonly errorStyle: 'silent-fallback' | 'gentle-notice' | 'clear-explanation';
}

/**
 * Signature spacing rhythm — the visual breathing room.
 */
export interface ISignatureSpacingRhythm {
	/** Element density preference */
	readonly density: 'compact' | 'comfortable' | 'spacious';
	/** Breathing room multiplier */
	readonly breathMultiplier: number; // 1.0 = standard
	/** Section gap rhythm */
	readonly sectionGapUnit: number; // base px for section gaps
	/** Content width constraint */
	readonly maxContentWidth: number; // px
	/** Panel margin rhythm */
	readonly panelMarginUnit: number; // base px for panel margins
}

/**
 * Signature panel choreography — how panels enter, exit, and coexist.
 */
export interface ISignaturePanelChoreography {
	/** Panel entrance direction */
	readonly entranceDirection: 'right' | 'bottom' | 'left' | 'fade';
	/** Panel exit direction */
	readonly exitDirection: 'right' | 'bottom' | 'left' | 'fade';
	/** Whether panels push or overlay */
	readonly mode: 'push' | 'overlay' | 'replace';
	/** Panel layering when multiple are open */
	readonly layering: 'stacked' | 'tabbed' | 'split';
	/** Animation timing for panel transitions */
	readonly transitionTiming: number; // ms
	/** Whether panels respect the editor space */
	readonly respectsEditorSpace: boolean;
}

/**
 * Complete signature product identity.
 */
export interface ISignatureProductIdentity {
	readonly interactionPhilosophy: ISignatureInteractionPhilosophy;
	readonly motionLanguage: ISignatureMotionLanguage;
	readonly aiBehavior: ISignatureAIBehavior;
	readonly spacingRhythm: ISignatureSpacingRhythm;
	readonly panelChoreography: ISignaturePanelChoreography;
}

/**
 * ISignatureIdentityService — Defines the product's signature identity.
 *
 * The goal: someone should recognize Real Vibecode instantly from a short clip.
 * NOT because it is loud. Because it is disciplined.
 *
 * Defines:
 *   - Signature interaction philosophy
 *   - Signature motion language
 *   - Signature AI behavior
 *   - Signature spacing rhythm
 *   - Signature panel choreography
 */
export const ISignatureIdentityService = createDecorator<ISignatureIdentityService>('signatureIdentityService');

export interface ISignatureIdentityService {
	readonly _serviceBrand: undefined;

	/** Get the complete signature identity */
	readonly identity: ISignatureProductIdentity;

	/** Get the interaction philosophy */
	readonly interactionPhilosophy: ISignatureInteractionPhilosophy;

	/** Get the motion language */
	readonly motionLanguage: ISignatureMotionLanguage;

	/** Get the AI behavior signature */
	readonly aiBehavior: ISignatureAIBehavior;

	/** Get the spacing rhythm */
	readonly spacingRhythm: ISignatureSpacingRhythm;

	/** Get the panel choreography */
	readonly panelChoreography: ISignaturePanelChoreography;

	/** Validate that the current UI matches the signature identity */
	validateIdentity(): IIdentityValidationReport;

	/** Get a specific aspect of the identity for CSS/code generation */
	getMotionCSS(): string;
	getSpacingCSS(): string;
	getAIInteractionRules(): readonly string[];
}

/**
 * Identity validation report.
 */
export interface IIdentityValidationReport {
	readonly matchesPhilosophy: boolean;
	readonly matchesMotion: boolean;
	readonly matchesAIBehavior: boolean;
	readonly matchesSpacing: boolean;
	readonly matchesChoreography: boolean;
	readonly overallMatch: number; // 0.0-1.0
	readonly violations: readonly IIdentityViolation[];
	readonly timestamp: number;
}

/**
 * An identity violation.
 */
export interface IIdentityViolation {
	readonly aspect: string;
	readonly expected: string;
	readonly actual: string;
	readonly severity: 'warning' | 'error';
}
