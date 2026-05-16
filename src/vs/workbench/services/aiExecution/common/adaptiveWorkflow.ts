/*---------------------------------------------------------------------------------------------
 *  Adaptive Workflow & Progressive Disclosure System — Phase 14
 *  Real Vibecode — AI-Native IDE
 *
 *  Makes the product feel SIMPLE despite extreme internal complexity.
 *  Reveals complexity progressively, adapts to user behavior, simplifies
 *  novice workflows, accelerates expert workflows, minimizes visible
 *  cognitive burden, turns the IDE into a guided intelligent environment.
 *
 *  PRINCIPLES:
 *    1. Beginners should not see advanced orchestration systems immediately
 *    2. Replay/debug systems should appear only when relevant
 *    3. Autonomous systems should require trust progression
 *    4. The interface should become quieter during deep work
 *    5. Never break momentum — suppress interruptions during flow state
 *    6. AI autonomy should evolve gradually — the system must EARN it
 *    7. Onboarding should feel premium, calm, intelligent
 *    8. Expert mode should be intentional — no leakage into beginner workflows
 *
 *  Tasks:
 *    1.  Progressive Disclosure Engine — reveal features gradually
 *    2.  User Experience Leveling — Beginner/Intermediate/Advanced/Power User
 *    3.  Adaptive Interface Orchestrator — contextual UI reshaping
 *    4.  Feature Fatigue Detection — ignored panels, unused capabilities
 *    5.  Contextual Minimalism Engine — auto-hide, silent mode, panel quieting
 *    6.  Flow State Preservation — detect and protect deep work
 *    7.  Trust & Autonomy Evolution — earn autonomy through trust progression
 *    8.  First-Run Experience — guided, adaptive, staged onboarding
 *    9.  Expert Mode System — unlock advanced depth intentionally
 *   10.  Experience Coherence Validation — runtime UX coherence reports
 *--------------------------------------------------------------------------------------------*/

import { Event } from '../../../../base/common/event.js';
import { IDisposable } from '../../../../base/common/lifecycle.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';

// ═══════════════════════════════════════════════════════════════════════════════
// TASK 1 — PROGRESSIVE DISCLOSURE ENGINE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Feature visibility states — controls what users see at each level.
 */
export const enum FeatureVisibility {
	/** Completely hidden — user cannot access this feature */
	Hidden = 'hidden',
	/** Subtly suggested — hint or discovery prompt */
	Suggested = 'suggested',
	/** Available if sought — accessible but not prominent */
	Available = 'available',
	/** Recommended — actively surfaced in relevant context */
	Recommended = 'recommended',
	/** Expert — always visible, full depth */
	Expert = 'expert',
}

/**
 * Feature maturity level — when a feature becomes visible.
 */
export const enum FeatureMaturity {
	/** Core features — visible from day one */
	Core = 'core',
	/** Standard features — revealed after basic proficiency */
	Standard = 'standard',
	/** Advanced features — revealed after experience progression */
	Advanced = 'advanced',
	/** Power features — expert-only */
	Power = 'power',
	/** Internal features — diagnostic/debug, only when needed */
	Internal = 'internal',
}

/**
 * Feature descriptor — defines a feature's disclosure properties.
 */
export interface IFeatureDescriptor {
	readonly featureId: string;
	readonly name: string;
	readonly category: string;
	readonly maturity: FeatureMaturity;
	readonly minimumExperienceLevel: ExperienceLevel;
	readonly requiresTrustScore: number; // 0.0-1.0
	readonly requiresContext: string[]; // contexts where feature becomes relevant
	readonly disclosureOrder: number; // lower = revealed sooner
}

/**
 * Feature visibility change event.
 */
export interface IFeatureVisibilityChange {
	readonly featureId: string;
	readonly fromVisibility: FeatureVisibility;
	readonly toVisibility: FeatureVisibility;
	readonly reason: string;
	readonly timestamp: number;
}

/**
 * IProgressiveDisclosureService — Reveals advanced features gradually.
 *
 * Hides irrelevant systems automatically. Contextual feature surfacing.
 * Feature maturity levels control visibility progression.
 *
 * Rules:
 *   - Beginners should not see advanced orchestration systems immediately
 *   - Replay/debug systems should appear only when relevant
 *   - Autonomous systems should require trust progression
 */
export const IProgressiveDisclosureService = createDecorator<IProgressiveDisclosureService>('progressiveDisclosureService');

export interface IProgressiveDisclosureService {
	readonly _serviceBrand: undefined;

	/** Register a feature for progressive disclosure */
	registerFeature(descriptor: IFeatureDescriptor): void;

	/** Get current visibility of a feature */
	getFeatureVisibility(featureId: string): FeatureVisibility;

	/** Get all visible features for current context */
	getVisibleFeatures(context?: string): readonly IFeatureDescriptor[];

	/** Check if a feature should be shown */
	shouldShowFeature(featureId: string, context?: string): boolean;

	/** Trigger a context change — may reveal/hide features */
	notifyContextChange(context: string): void;

	/** Mark a feature as discovered by user */
	markDiscovered(featureId: string): void;

	/** Mark a feature as used by user */
	markUsed(featureId: string): void;

	/** Event: feature visibility changed */
	readonly onDidChangeFeatureVisibility: Event<IFeatureVisibilityChange>;

	/** Get the full feature map */
	getFeatureMap(): ReadonlyMap<string, IFeatureDescriptor>;

	/** Get features at a specific maturity level */
	getFeaturesByMaturity(maturity: FeatureMaturity): readonly IFeatureDescriptor[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// TASK 2 — USER EXPERIENCE LEVELING SYSTEM
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Experience level — determines what the user sees.
 */
export const enum ExperienceLevel {
	/** New user — minimal interface, guided workflows */
	Beginner = 'beginner',
	/** Comfortable user — standard interface, some advanced features */
	Intermediate = 'intermediate',
	/** Experienced user — full interface, advanced features accessible */
	Advanced = 'advanced',
	/** Power user — everything unlocked, expert mode available */
	PowerUser = 'power-user',
}

/**
 * User workflow style — how the user prefers to work.
 */
export const enum WorkflowStyle {
	/** Keyboard-driven, fast, minimal mouse */
	KeyboardFirst = 'keyboard-first',
	/** Mouse and visual interactions */
	VisualFirst = 'visual-first',
	/** Mixed approach */
	Hybrid = 'hybrid',
	/** AI-collaborative — delegates to AI frequently */
	AICollaborative = 'ai-collaborative',
}

/**
 * User experience profile — comprehensive understanding of the user.
 */
export interface IUserExperienceProfile {
	readonly userId: string;
	readonly experienceLevel: ExperienceLevel;
	readonly workflowStyle: WorkflowStyle;
	readonly keyboardUsageRatio: number; // 0.0-1.0
	readonly automationTrustLevel: number; // 0.0-1.0
	readonly dismissedFeatureRate: number; // 0.0-1.0
	readonly workflowComplexityTolerance: number; // 0.0-1.0
	readonly featuresDiscovered: number;
	readonly featuresUsed: number;
	readonly totalInteractions: number;
	readonly sessionCount: number;
	readonly averageSessionDurationMs: number;
	readonly lastUpdated: number;
}

/**
 * Experience level transition — when and why a level changed.
 */
export interface IExperienceLevelTransition {
	readonly fromLevel: ExperienceLevel;
	readonly toLevel: ExperienceLevel;
	readonly reason: string;
	readonly evidence: string[];
	readonly timestamp: number;
}

/**
 * IUserExperienceProfileService — Tracks user behavior and generates experience profiles.
 *
 * Monitors interaction patterns, workflow complexity tolerance, dismissed feature rate,
 * preferred workflow style, keyboard vs mouse usage, and automation trust level.
 * UI behavior adapts dynamically to the profile.
 */
export const IUserExperienceProfileService = createDecorator<IUserExperienceProfileService>('userExperienceProfileService');

export interface IUserExperienceProfileService {
	readonly _serviceBrand: undefined;

	/** Current experience profile */
	readonly currentProfile: IUserExperienceProfile;

	/** Current experience level */
	readonly experienceLevel: ExperienceLevel;

	/** Event: experience level changed */
	readonly onDidChangeExperienceLevel: Event<IExperienceLevelTransition>;

	/** Record a keyboard interaction */
	recordKeyboardInteraction(): void;

	/** Record a mouse interaction */
	recordMouseInteraction(): void;

	/** Record a feature dismissal */
	recordFeatureDismissal(featureId: string): void;

	/** Record a feature acceptance */
	recordFeatureAcceptance(featureId: string): void;

	/** Record an AI action acceptance */
	recordAIActionAccepted(): void;

	/** Record an AI action reverted */
	recordAIActionReverted(): void;

	/** Record session duration */
	recordSessionDuration(durationMs: number): void;

	/** Get the workflow style */
	readonly workflowStyle: WorkflowStyle;

	/** Get automation trust level */
	readonly automationTrustLevel: number;

	/** Force recalculation of the profile */
	recalculateProfile(): IUserExperienceProfile;

	/** Get experience level transition history */
	getTransitionHistory(): readonly IExperienceLevelTransition[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// TASK 3 — ADAPTIVE INTERFACE ORCHESTRATOR
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Activity context — what the user is currently doing.
 */
export const enum ActivityContext {
	/** Writing or editing code */
	Coding = 'coding',
	/** Debugging or inspecting errors */
	Debugging = 'debugging',
	/** AI is planning or suggesting */
	AIPlanning = 'ai-planning',
	/** Reviewing code changes */
	Reviewing = 'reviewing',
	/** Running or managing processes */
	Executing = 'executing',
	/** Navigating or exploring codebase */
	Navigating = 'navigating',
	/** Learning or onboarding */
	Learning = 'learning',
	/** Idle or between tasks */
	Idle = 'idle',
}

/**
 * Interface adaptation — a change to the UI based on context.
 */
export interface IInterfaceAdaptation {
	readonly context: ActivityContext;
	readonly adaptations: readonly IAdaptationAction[];
	readonly reason: string;
	readonly timestamp: number;
}

/**
 * Adaptation action — a specific UI change.
 */
export interface IAdaptationAction {
	readonly actionType: 'elevate' | 'suppress' | 'compress' | 'expand' | 'rearrange';
	readonly targetSurface: string;
	readonly priority: number;
	readonly description: string;
}

/**
 * Contextual layout profile — how the UI should look for a context.
 */
export interface IContextualLayoutProfile {
	readonly context: ActivityContext;
	readonly dominantSurface: string;
	readonly elevatedSurfaces: readonly string[];
	readonly suppressedSurfaces: readonly string[];
	readonly compressedSurfaces: readonly string[];
	readonly editorDominanceRatio: number; // 0.0-1.0
}

/**
 * IAdaptiveInterfaceService — Reshapes the interface intelligently.
 *
 * Coding → editor dominance
 * Debugging → diagnostics elevation
 * AI planning → orchestration focus
 * Reviewing → diff/replay emphasis
 *
 * The interface should reshape intelligently without disorienting users.
 */
export const IAdaptiveInterfaceService = createDecorator<IAdaptiveInterfaceService>('adaptiveInterfaceService');

export interface IAdaptiveInterfaceService {
	readonly _serviceBrand: undefined;

	/** Current activity context */
	readonly currentContext: ActivityContext;

	/** Current layout profile */
	readonly currentLayoutProfile: IContextualLayoutProfile;

	/** Event: activity context changed */
	readonly onDidChangeContext: Event<ActivityContext>;

	/** Event: interface adapted */
	readonly onDidAdapt: Event<IInterfaceAdaptation>;

	/** Notify that the user's activity context changed */
	notifyContextChanged(context: ActivityContext): void;

	/** Get the recommended layout for a context */
	getLayoutProfile(context: ActivityContext): IContextualLayoutProfile;

	/** Apply adaptive changes */
	applyAdaptation(context: ActivityContext): IInterfaceAdaptation;

	/** Simplify inactive workflows */
	simplifyInactiveWorkflows(): void;

	/** Compress unused systems */
	compressUnusedSystems(): void;

	/** Elevate relevant tools dynamically */
	elevateRelevantTools(context: ActivityContext): void;

	/** Get adaptation history */
	getAdaptationHistory(): readonly IInterfaceAdaptation[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// TASK 4 — FEATURE FATIGUE DETECTION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Fatigue signal types.
 */
export const enum FatigueSignal {
	/** Panel was shown but user never interacted */
	IgnoredPanel = 'ignored-panel',
	/** User dismissed a suggestion repeatedly */
	RepetitiveDismissal = 'repetitive-dismissal',
	/** Feature available but never used */
	UnusedCapability = 'unused-capability',
	/** User rejected AI prompt */
	PromptRejection = 'prompt-rejection',
	/** User stopped paying attention to area */
	AttentionAbandonment = 'attention-abandonment',
	/** User closed multiple panels quickly */
	RapidClosures = 'rapid-closures',
}

/**
 * Fatigue detection result.
 */
export interface IFatigueDetection {
	readonly signal: FatigueSignal;
	readonly targetId: string;
	readonly severity: number; // 0.0-1.0
	readonly evidence: string;
	readonly cooldownRecommendedMs: number;
	readonly timestamp: number;
}

/**
 * Fatigue reduction action.
 */
export interface IFatigueReductionAction {
	readonly actionType: 'reduce-exposure' | 'suppress-noise' | 'cool-down-suggestions' | 'simplify-visuals';
	readonly targetId: string;
	readonly reason: string;
	readonly durationMs: number;
	readonly timestamp: number;
}

/**
 * IFeatureFatigueService — Prevents feature exhaustion.
 *
 * Detects ignored panels, repetitive dismissals, unused capabilities,
 * excessive prompt rejections, and attention abandonment.
 * Reduces feature exposure, suppresses noisy systems, cools down
 * repeated suggestions, and simplifies the visual environment.
 */
export const IFeatureFatigueService = createDecorator<IFeatureFatigueService>('featureFatigueService');

export interface IFeatureFatigueService {
	readonly _serviceBrand: undefined;

	/** Event: fatigue detected */
	readonly onDidDetectFatigue: Event<IFatigueDetection>;

	/** Event: fatigue reduction applied */
	readonly onDidReduceFatigue: Event<IFatigueReductionAction>;

	/** Record a panel being ignored */
	recordIgnoredPanel(panelId: string): void;

	/** Record a dismissal */
	recordDismissal(featureId: string): void;

	/** Record a feature never used */
	recordUnusedCapability(featureId: string): void;

	/** Record a prompt rejection */
	recordPromptRejection(promptId: string): void;

	/** Record attention abandonment */
	recordAttentionAbandonment(surfaceId: string): void;

	/** Get current fatigue score (0.0-1.0) */
	readonly fatigueScore: number;

	/** Get fatigue detections */
	getFatigueDetections(): readonly IFatigueDetection[];

	/** Apply fatigue reductions */
	applyFatigueReductions(): IFatigueReductionAction[];

	/** Check if a feature is in cooldown */
	isInCooldown(featureId: string): boolean;

	/** Get the overall fatigue state */
	readonly fatigueState: FatigueState;
}

/**
 * Fatigue state — current level of user fatigue.
 */
export const enum FatigueState {
	/** No fatigue — user is engaged */
	Healthy = 'healthy',
	/** Mild fatigue — some signals detected */
	Moderate = 'moderate',
	/** Significant fatigue — active reduction needed */
	Elevated = 'elevated',
	/** Critical fatigue — emergency simplification */
	Critical = 'critical',
}

// ═══════════════════════════════════════════════════════════════════════════════
// TASK 5 — CONTEXTUAL MINIMALISM ENGINE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Minimalism level — how much UI chrome is visible.
 */
export const enum MinimalismLevel {
	/** Full interface — all surfaces visible */
	Full = 'full',
	/** Reduced — non-essential surfaces hidden */
	Reduced = 'reduced',
	/** Minimal — only essential surfaces */
	Minimal = 'minimal',
	/** Silent — near-zero chrome, editor only */
	Silent = 'silent',
}

/**
 * Minimalism trigger — what causes minimalism to increase.
 */
export const enum MinimalismTrigger {
	/** User entered focus mode */
	FocusMode = 'focus-mode',
	/** User is in flow state */
	FlowState = 'flow-state',
	/** Inactivity-based auto-reduction */
	Inactivity = 'inactivity',
	/** Cognitive load threshold exceeded */
	CognitiveOverload = 'cognitive-overload',
	/** Feature fatigue detected */
	Fatigue = 'fatigue',
	/** User explicitly requested */
	UserRequest = 'user-request',
}

/**
 * Surface visibility rule — when to show/hide a surface.
 */
export interface ISurfaceVisibilityRule {
	readonly surfaceId: string;
	readonly minimumMinimalismLevel: MinimalismLevel; // only show at this level or below
	readonly autoHideAfterInactivityMs: number;
	readonly quietDuringFocus: boolean;
	readonly reduceMotionDuringConcentration: boolean;
}

/**
 * Minimalism state snapshot.
 */
export interface IMinimalismState {
	readonly level: MinimalismLevel;
	readonly trigger: MinimalismTrigger;
	readonly hiddenSurfaces: readonly string[];
	readonly reducedSurfaces: readonly string[];
	readonly motionReductionActive: boolean;
	readonly chromeReductionPercent: number; // 0-100
	readonly timestamp: number;
}

/**
 * IContextualMinimalismService — Makes the interface quieter during deep work.
 *
 * Auto-hide low-value surfaces, adaptive chrome reduction, silent mode
 * during focus, progressive panel quieting, motion reduction during
 * concentration. The interface should become quieter during deep work.
 */
export const IContextualMinimalismService = createDecorator<IContextualMinimalismService>('contextualMinimalismService');

export interface IContextualMinimalismService {
	readonly _serviceBrand: undefined;

	/** Current minimalism state */
	readonly currentState: IMinimalismState;

	/** Current minimalism level */
	readonly currentLevel: MinimalismLevel;

	/** Event: minimalism level changed */
	readonly onDidChangeMinimalism: Event<IMinimalismState>;

	/** Register a surface visibility rule */
	registerSurfaceRule(rule: ISurfaceVisibilityRule): void;

	/** Increase minimalism level */
	increaseMinimalism(trigger: MinimalismTrigger): void;

	/** Decrease minimalism level */
	decreaseMinimalism(reason: string): void;

	/** Enter silent mode */
	enterSilentMode(reason: string): IDisposable;

	/** Check if a surface should be visible */
	shouldShowSurface(surfaceId: string): boolean;

	/** Get recommended motion level (0.0-1.0) */
	readonly motionLevel: number;

	/** Auto-hide low-value surfaces */
	autoHideLowValue(): readonly string[];

	/** Progressive panel quieting */
	quietPanels(): readonly string[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// TASK 6 — FLOW STATE PRESERVATION SYSTEM
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Flow state intensity levels.
 */
export const enum FlowIntensity {
	/** Not in flow — normal interaction */
	None = 'none',
	/** Light focus — slightly engaged */
	Light = 'light',
	/** Moderate flow — engaged, productive */
	Moderate = 'moderate',
	/** Deep flow — fully immersed */
	Deep = 'deep',
	/** Peak flow — maximal immersion */
	Peak = 'peak',
}

/**
 * Flow state metrics.
 */
export interface IFlowStateMetrics {
	readonly intensity: FlowIntensity;
	readonly uninterruptedDurationMs: number;
	readonly editRhythm: number; // edits per minute
	readonly focusIntensity: number; // 0.0-1.0
	readonly contextSwitchCount: number; // in last 5 minutes
	readonly isInFlow: boolean;
	readonly flowStartTime: number | null;
	readonly totalFlowTimeTodayMs: number;
	readonly timestamp: number;
}

/**
 * Flow interruption — something that could break flow.
 */
export interface IFlowInterruption {
	readonly source: string;
	readonly priority: 'critical' | 'important' | 'normal' | 'low';
	readonly description: string;
	readonly deferred: boolean;
	readonly deferredUntil: number | null;
	readonly timestamp: number;
}

/**
 * IFlowStateService — Never break momentum.
 *
 * Detects uninterrupted coding periods, rapid editing rhythm, focus intensity,
 * and context-switch frequency. Suppresses interruptions during flow state,
 * defers non-critical AI suggestions, batches notifications intelligently,
 * and avoids panel animations during focus.
 */
export const IFlowStateService = createDecorator<IFlowStateService>('flowStateService');

export interface IFlowStateService {
	readonly _serviceBrand: undefined;

	/** Current flow state metrics */
	readonly currentMetrics: IFlowStateMetrics;

	/** Whether user is currently in flow state */
	readonly isInFlow: boolean;

	/** Event: flow state changed */
	readonly onDidChangeFlowState: Event<IFlowStateMetrics>;

	/** Record an edit event */
	recordEdit(): void;

	/** Record a context switch */
	recordContextSwitch(): void;

	/** Attempt to interrupt flow — returns whether it was allowed */
	attemptInterruption(source: string, priority: 'critical' | 'important' | 'normal' | 'low'): boolean;

	/** Defer a non-critical interruption */
	deferInterruption(source: string, description: string): IFlowInterruption;

	/** Get deferred interruptions */
	getDeferredInterruptions(): readonly IFlowInterruption[];

	/** Release deferred interruptions (when flow ends) */
	releaseDeferredInterruptions(): readonly IFlowInterruption[];

	/** Batch notifications intelligently */
	batchNotifications(): readonly IFlowInterruption[];

	/** Get flow statistics */
	getFlowStats(): IFlowStats;
}

/**
 * Flow statistics — aggregate flow data.
 */
export interface IFlowStats {
	readonly totalFlowSessionsToday: number;
	readonly totalFlowTimeTodayMs: number;
	readonly averageFlowDurationMs: number;
	readonly longestFlowSessionMs: number;
	readonly interruptionsBlockedToday: number;
	readonly flowEfficiency: number; // 0.0-1.0
}

// ═══════════════════════════════════════════════════════════════════════════════
// TASK 7 — TRUST & AUTONOMY EVOLUTION SYSTEM
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Autonomy level — how much the AI can do without asking.
 */
export const enum AutonomyLevel {
	/** Ask for everything — no autonomous action */
	FullConsent = 'full-consent',
	/** Ask for significant actions, auto-minor */
	ConditionalConsent = 'conditional-consent',
	/** Auto-execute with notification */
	Supervised = 'supervised',
	/** Auto-execute, report periodically */
	Trusted = 'trusted',
	/** Full autonomy within defined boundaries */
	FullAutonomy = 'full-autonomy',
}

/**
 * Trust metrics — what the system tracks.
 */
export interface ITrustMetrics {
	readonly acceptedActions: number;
	readonly revertedActions: number;
	readonly approvalAcceptanceRate: number; // 0.0-1.0
	readonly confidenceAlignment: number; // 0.0-1.0 — how well AI confidence matches user acceptance
	readonly userOverrides: number;
	readonly trustScore: number; // 0.0-1.0
	readonly currentAutonomyLevel: AutonomyLevel;
	readonly timestamp: number;
}

/**
 * Trust escalation event.
 */
export interface ITrustEscalation {
	readonly fromLevel: AutonomyLevel;
	readonly toLevel: AutonomyLevel;
	readonly reason: string;
	readonly evidence: string[];
	readonly trustScoreAtTransition: number;
	readonly timestamp: number;
}

/**
 * IAutonomyTrustService — The system EARNs autonomy.
 *
 * Tracks accepted AI actions, reverted edits, approval acceptance rate,
 * confidence alignment, and user overrides. AI autonomy evolves gradually.
 * Low trust → ask frequently. High trust → reduce confirmations.
 */
export const IAutonomyTrustService = createDecorator<IAutonomyTrustService>('autonomyTrustService');

export interface IAutonomyTrustService {
	readonly _serviceBrand: undefined;

	/** Current trust metrics */
	readonly currentMetrics: ITrustMetrics;

	/** Current autonomy level */
	readonly autonomyLevel: AutonomyLevel;

	/** Current trust score (0.0-1.0) */
	readonly trustScore: number;

	/** Event: autonomy level changed */
	readonly onDidChangeAutonomyLevel: Event<ITrustEscalation>;

	/** Record an accepted AI action */
	recordAcceptedAction(confidence: number): void;

	/** Record a reverted AI action */
	recordRevertedAction(confidence: number): void;

	/** Record a user override */
	recordOverride(): void;

	/** Record an approval acceptance */
	recordApprovalAccepted(): void;

	/** Record an approval rejected */
	recordApprovalRejected(): void;

	/** Check if an action is allowed at current autonomy level */
	isActionAllowed(actionType: string): boolean;

	/** Get the required confirmation level for an action */
	getRequiredConfirmation(actionType: string): AutonomyLevel;

	/** Force recalculation of trust score */
	recalculateTrust(): ITrustMetrics;

	/** Get trust history */
	getTrustHistory(): readonly ITrustEscalation[];

	/** Get recommendations for trust improvement */
	getTrustRecommendations(): readonly string[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// TASK 8 — FIRST-RUN EXPERIENCE SYSTEM
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Onboarding stage — progressive introduction.
 */
export const enum OnboardingStage {
	/** Before first interaction */
	Welcome = 'welcome',
	/** Basic editor setup */
	EditorBasics = 'editor-basics',
	/** AI introduction */
	AIIntroduction = 'ai-introduction',
	/** Workflow patterns */
	WorkflowDiscovery = 'workflow-discovery',
	/** Advanced features introduction */
	AdvancedFeatures = 'advanced-features',
	/** Expert capabilities */
	ExpertCapabilities = 'expert-capabilities',
	/** Onboarding complete */
	Complete = 'complete',
}

/**
 * Onboarding step — a single step in the guided experience.
 */
export interface IOnboardingStep {
	readonly stepId: string;
	readonly stage: OnboardingStage;
	readonly title: string;
	readonly description: string;
	readonly featureId: string;
	readonly requiredInteractions: number;
	readonly completionCriteria: string;
	readonly nextStepId: string | null;
	readonly optional: boolean;
}

/**
 * Onboarding state — current progress.
 */
export interface IOnboardingState {
	readonly currentStage: OnboardingStage;
	readonly currentStep: IOnboardingStep | null;
	readonly completedSteps: readonly string[];
	readonly skippedSteps: readonly string[];
	readonly progressPercent: number; // 0-100
	readonly isComplete: boolean;
	readonly startedAt: number | null;
	readonly estimatedRemainingSteps: number;
	readonly timestamp: number;
}

/**
 * IOnboardingExperienceService — Premium, calm, intelligent onboarding.
 *
 * Guided first-run flow, adaptive setup experience, intelligent feature
 * introduction, staged capability exposure, contextual education.
 * NEVER dump all capabilities immediately. NEVER overwhelm new users.
 */
export const IOnboardingExperienceService = createDecorator<IOnboardingExperienceService>('onboardingExperienceService');

export interface IOnboardingExperienceService {
	readonly _serviceBrand: undefined;

	/** Current onboarding state */
	readonly currentState: IOnboardingState;

	/** Whether this is the first run */
	readonly isFirstRun: boolean;

	/** Event: onboarding stage changed */
	readonly onDidChangeStage: Event<OnboardingStage>;

	/** Event: onboarding step completed */
	readonly onDidCompleteStep: Event<IOnboardingStep>;

	/** Start the onboarding experience */
	startOnboarding(): void;

	/** Complete the current step */
	completeCurrentStep(): void;

	/** Skip the current step */
	skipCurrentStep(): void;

	/** Get the next step */
	getNextStep(): IOnboardingStep | null;

	/** Record an interaction that counts toward onboarding */
	recordOnboardingInteraction(featureId: string): void;

	/** Get onboarding progress */
	readonly progressPercent: number;

	/** Reset onboarding (for testing or re-onboarding) */
	resetOnboarding(): void;

	/** Get all onboarding steps */
	getAllSteps(): readonly IOnboardingStep[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// TASK 9 — EXPERT MODE SYSTEM
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Expert capability — what expert mode unlocks.
 */
export const enum ExpertCapability {
	/** Full orchestration graph visibility */
	OrchestrationDepth = 'orchestration-depth',
	/** Advanced execution graph */
	GraphVisibility = 'graph-visibility',
	/** Replay and debug tooling */
	ReplayTooling = 'replay-tooling',
	/** System diagnostics */
	SystemDiagnostics = 'system-diagnostics',
	/** Autonomy tuning controls */
	AutonomyTuning = 'autonomy-tuning',
	/** Power keyboard shortcuts */
	PowerShortcuts = 'power-shortcuts',
	/** Internal state inspection */
	StateInspection = 'state-inspection',
	/** Execution timeline control */
	ExecutionTimeline = 'execution-timeline',
}

/**
 * Expert mode configuration.
 */
export interface IExpertModeConfig {
	readonly enabledCapabilities: ReadonlySet<ExpertCapability>;
	readonly autonomyOverride: AutonomyLevel | null;
	readonly showInternalState: boolean;
	readonly showAdvancedDiagnostics: boolean;
	readonly enablePowerShortcuts: boolean;
	readonly exposeExecutionGraph: boolean;
}

/**
 * Expert mode state.
 */
export interface IExpertModeState {
	readonly isEnabled: boolean;
	readonly config: IExpertModeConfig;
	readonly activatedAt: number | null;
	readonly requiredExperienceLevel: ExperienceLevel;
	readonly leakedToBeginner: boolean; // should always be false
}

/**
 * IExpertModeService — Intentional access to advanced depth.
 *
 * Unlocks orchestration depth, advanced graph visibility, replay tooling,
 * system diagnostics, autonomy tuning, and power shortcuts.
 * Expert mode should be intentional. Advanced surfaces should NOT leak
 * into beginner workflows.
 */
export const IExpertModeService = createDecorator<IExpertModeService>('expertModeService');

export interface IExpertModeService {
	readonly _serviceBrand: undefined;

	/** Whether expert mode is currently enabled */
	readonly isEnabled: boolean;

	/** Current expert mode state */
	readonly currentState: IExpertModeState;

	/** Event: expert mode toggled */
	readonly onDidChangeExpertMode: Event<boolean>;

	/** Enable expert mode (requires Advanced experience level) */
	enableExpertMode(): boolean;

	/** Disable expert mode */
	disableExpertMode(): void;

	/** Check if a capability is available */
	isCapabilityAvailable(capability: ExpertCapability): boolean;

	/** Check if a capability is enabled */
	isCapabilityEnabled(capability: ExpertCapability): boolean;

	/** Enable a specific capability */
	enableCapability(capability: ExpertCapability): void;

	/** Disable a specific capability */
	disableCapability(capability: ExpertCapability): void;

	/** Get all available capabilities */
	getAvailableCapabilities(): readonly ExpertCapability[];

	/** Validate no expert features leak into beginner workflows */
	validateNoLeakage(): IExpertLeakageReport;
}

/**
 * Expert leakage report — validates no expert features leak.
 */
export interface IExpertLeakageReport {
	readonly leakedCapabilities: readonly ExpertCapability[];
	readonly leakedSurfaces: readonly string[];
	readonly isClean: boolean;
	readonly timestamp: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// TASK 10 — EXPERIENCE COHERENCE VALIDATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Adaptive UX violation types.
 */
export const enum AdaptiveUXViolationType {
	/** Beginner seeing expert features */
	BeginnerOverwhelm = 'beginner-overwhelm',
	/** AI overexposed for current trust level */
	AIOverexposure = 'ai-overexposure',
	/** Onboarding moved too fast */
	OnboardingPacing = 'onboarding-pacing',
	/** Expert features leaked to novice */
	ExpertLeakage = 'expert-leakage',
	/** Adaptive transition was disorienting */
	DisorientingTransition = 'disorienting-transition',
	/** Flow state was interrupted */
	FlowInterruption = 'flow-interruption',
	/** Feature fatigue not addressed */
	FatigueUnaddressed = 'fatigue-unaddressed',
	/** Progressive disclosure violated */
	DisclosureViolation = 'disclosure-violation',
	/** Minimalism inconsistency */
	MinimalismViolation = 'minimalism-violation',
	/** Autonomy escalated too fast */
	AutonomyEscalationViolation = 'autonomy-escalation-violation',
}

/**
 * Adaptive UX violation.
 */
export interface IAdaptiveUXViolation {
	readonly type: AdaptiveUXViolationType;
	readonly severity: 'critical' | 'warning' | 'info';
	readonly description: string;
	readonly affectedElements: readonly string[];
	readonly suggestion: string;
	readonly detectedAt: number;
}

/**
 * Adaptive UX coherence report.
 */
export interface IAdaptiveUXCoherenceReport {
	readonly violations: readonly IAdaptiveUXViolation[];
	readonly criticalCount: number;
	readonly warningCount: number;
	readonly infoCount: number;
	readonly disclosureScore: number; // 0.0-1.0
	readonly workflowSimplicityScore: number; // 0.0-1.0
	readonly fatigueScore: number; // 0.0-1.0
	readonly flowPreservationScore: number; // 0.0-1.0
	readonly autonomySafetyScore: number; // 0.0-1.0
	readonly minimalismScore: number; // 0.0-1.0
	readonly overallCoherence: number; // 0.0-1.0
	readonly passed: boolean;
	readonly checkedAt: number;
	readonly durationMs: number;
}

/**
 * IAdaptiveExperienceValidationService — Runtime adaptive UX coherence validation.
 *
 * Validates: progressive disclosure correctness, workflow simplicity,
 * no feature overload, adaptive transitions coherence, onboarding pacing,
 * autonomy escalation correctness, flow-state preservation, minimalism consistency.
 */
export const IAdaptiveExperienceValidationService = createDecorator<IAdaptiveExperienceValidationService>('adaptiveExperienceValidationService');

export interface IAdaptiveExperienceValidationService {
	readonly _serviceBrand: undefined;

	/** Run full adaptive UX coherence check */
	runValidation(): IAdaptiveUXCoherenceReport;

	/** Validate progressive disclosure */
	validateDisclosure(): IAdaptiveUXCoherenceReport;

	/** Validate flow state preservation */
	validateFlowState(): IAdaptiveUXCoherenceReport;

	/** Validate autonomy escalation safety */
	validateAutonomy(): IAdaptiveUXCoherenceReport;

	/** Event: violation detected */
	readonly onDidDetectViolation: Event<IAdaptiveUXViolation>;

	/** Current coherence score */
	readonly coherenceScore: number;

	/** Latest report */
	readonly latestReport: IAdaptiveUXCoherenceReport | null;

	/** Export full report */
	exportReport(): IAdaptiveUXCoherenceReport;
}
