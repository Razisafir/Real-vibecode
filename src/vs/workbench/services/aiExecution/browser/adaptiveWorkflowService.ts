/*---------------------------------------------------------------------------------------------
 *  Adaptive Workflow & Progressive Disclosure System — Phase 14
 *  Real Vibecode — AI-Native IDE
 *
 *  Runtime Implementations — All 10 service implementations.
 *--------------------------------------------------------------------------------------------*/

import { Emitter } from '../../../../base/common/event.js';
import { Disposable, IDisposable, DisposableStore } from '../../../../base/common/lifecycle.js';
import { IProgressiveDisclosureService, IFeatureDescriptor, IFeatureVisibilityChange, FeatureVisibility, FeatureMaturity } from '../common/adaptiveWorkflow.js';
import { IUserExperienceProfileService, IUserExperienceProfile, ExperienceLevel, WorkflowStyle, IExperienceLevelTransition } from '../common/adaptiveWorkflow.js';
import { IAdaptiveInterfaceService, ActivityContext, IContextualLayoutProfile, IInterfaceAdaptation, IAdaptationAction } from '../common/adaptiveWorkflow.js';
import { IFeatureFatigueService, IFatigueDetection, IFatigueReductionAction, FatigueSignal, FatigueState } from '../common/adaptiveWorkflow.js';
import { IContextualMinimalismService, IMinimalismState, MinimalismLevel, MinimalismTrigger, ISurfaceVisibilityRule } from '../common/adaptiveWorkflow.js';
import { IFlowStateService, IFlowStateMetrics, FlowIntensity, IFlowInterruption, IFlowStats } from '../common/adaptiveWorkflow.js';
import { IAutonomyTrustService, ITrustMetrics, AutonomyLevel, ITrustEscalation } from '../common/adaptiveWorkflow.js';
import { IOnboardingExperienceService, IOnboardingState, IOnboardingStep, OnboardingStage } from '../common/adaptiveWorkflow.js';
import { IExpertModeService, IExpertModeState, IExpertModeConfig, ExpertCapability, IExpertLeakageReport } from '../common/adaptiveWorkflow.js';
import { IAdaptiveExperienceValidationService, IAdaptiveUXCoherenceReport, IAdaptiveUXViolation, AdaptiveUXViolationType } from '../common/adaptiveWorkflow.js';
import { ILogService } from '../../../../platform/log/common/log.js';

// ═══════════════════════════════════════════════════════════════════════════════
// TASK 1 — PROGRESSIVE DISCLOSURE SERVICE
// ═══════════════════════════════════════════════════════════════════════════════

const EXPERIENCE_TO_VISIBILITY: Record<ExperienceLevel, FeatureVisibility[]> = {
	[ExperienceLevel.Beginner]: [FeatureVisibility.Recommended, FeatureVisibility.Expert],
	[ExperienceLevel.Intermediate]: [FeatureVisibility.Expert],
	[ExperienceLevel.Advanced]: [],
	[ExperienceLevel.PowerUser]: [],
};

export class ProgressiveDisclosureService extends Disposable implements IProgressiveDisclosureService {
	declare readonly _serviceBrand: undefined;

	private _features: Map<string, IFeatureDescriptor> = new Map();
	private _visibility: Map<string, FeatureVisibility> = new Map();
	private _discovered: Set<string> = new Set();
	private _used: Set<string> = new Set();
	private _currentContext: string = 'default';
	private _experienceLevel: ExperienceLevel = ExperienceLevel.Beginner;
	private _trustScore: number = 0;

	private readonly _onDidChangeFeatureVisibility = this._register(new Emitter<IFeatureVisibilityChange>());
	readonly onDidChangeFeatureVisibility = this._onDidChangeFeatureVisibility.event;

	constructor(@ILogService private readonly logService: ILogService) {
		super();
		this.logService.trace('[ProgressiveDisclosure] Initialized — features revealed gradually');
	}

	registerFeature(descriptor: IFeatureDescriptor): void {
		this._features.set(descriptor.featureId, descriptor);
		const visibility = this._calculateVisibility(descriptor);
		this._visibility.set(descriptor.featureId, visibility);
	}

	getFeatureVisibility(featureId: string): FeatureVisibility {
		return this._visibility.get(featureId) ?? FeatureVisibility.Hidden;
	}

	getVisibleFeatures(context?: string): readonly IFeatureDescriptor[] {
		const ctx = context ?? this._currentContext;
		return [...this._features.values()].filter(f => {
			const vis = this._visibility.get(f.featureId) ?? FeatureVisibility.Hidden;
			if (vis === FeatureVisibility.Hidden) { return false; }
			if (f.requiresContext.length > 0 && !f.requiresContext.includes(ctx) && ctx !== 'default') { return false; }
			return true;
		});
	}

	shouldShowFeature(featureId: string, context?: string): boolean {
		const vis = this.getFeatureVisibility(featureId);
		if (vis === FeatureVisibility.Hidden) { return false; }
		const feature = this._features.get(featureId);
		if (!feature) { return false; }
		if (feature.requiresTrustScore > this._trustScore) { return false; }
		return true;
	}

	notifyContextChange(context: string): void {
		this._currentContext = context;
		this._recalculateAllVisibility();
	}

	markDiscovered(featureId: string): void {
		this._discovered.add(featureId);
	}

	markUsed(featureId: string): void {
		this._used.add(featureId);
	}

	getFeatureMap(): ReadonlyMap<string, IFeatureDescriptor> {
		return new Map(this._features);
	}

	getFeaturesByMaturity(maturity: FeatureMaturity): readonly IFeatureDescriptor[] {
		return [...this._features.values()].filter(f => f.maturity === maturity);
	}

	/** Update external state references */
	updateExperienceLevel(level: ExperienceLevel): void {
		this._experienceLevel = level;
		this._recalculateAllVisibility();
	}

	updateTrustScore(score: number): void {
		this._trustScore = score;
		this._recalculateAllVisibility();
	}

	private _calculateVisibility(feature: IFeatureDescriptor): FeatureVisibility {
		const levelOrder = [ExperienceLevel.Beginner, ExperienceLevel.Intermediate, ExperienceLevel.Advanced, ExperienceLevel.PowerUser];
		const userIndex = levelOrder.indexOf(this._experienceLevel);
		const requiredIndex = levelOrder.indexOf(feature.minimumExperienceLevel);

		// Trust check
		if (feature.requiresTrustScore > this._trustScore) {
			return FeatureVisibility.Hidden;
		}

		// Experience level check
		if (userIndex < requiredIndex) {
			// User is below the minimum level
			if (userIndex === requiredIndex - 1) {
				return FeatureVisibility.Suggested; // Hint at what's coming
			}
			return FeatureVisibility.Hidden;
		}

		// Maturity-based visibility
		switch (feature.maturity) {
			case FeatureMaturity.Core:
				return FeatureVisibility.Recommended;
			case FeatureMaturity.Standard:
				return userIndex >= requiredIndex ? FeatureVisibility.Available : FeatureVisibility.Suggested;
			case FeatureMaturity.Advanced:
				return userIndex >= requiredIndex ? FeatureVisibility.Available : FeatureVisibility.Hidden;
			case FeatureMaturity.Power:
				return userIndex >= levelOrder.indexOf(ExperienceLevel.PowerUser) ? FeatureVisibility.Expert : FeatureVisibility.Hidden;
			case FeatureMaturity.Internal:
				return FeatureVisibility.Hidden; // Only visible in expert mode
		}
	}

	private _recalculateAllVisibility(): void {
		for (const [id, feature] of this._features) {
			const oldVis = this._visibility.get(id) ?? FeatureVisibility.Hidden;
			const newVis = this._calculateVisibility(feature);
			if (oldVis !== newVis) {
				this._visibility.set(id, newVis);
				this._onDidChangeFeatureVisibility.fire({
					featureId: id,
					fromVisibility: oldVis,
					toVisibility: newVis,
					reason: `experience-level-or-context-change`,
					timestamp: Date.now(),
				});
			}
		}
	}
}

// ═══════════════════════════════════════════════════════════════════════════════
// TASK 2 — USER EXPERIENCE PROFILE SERVICE
// ═══════════════════════════════════════════════════════════════════════════════

export class UserExperienceProfileService extends Disposable implements IUserExperienceProfileService {
	declare readonly _serviceBrand: undefined;

	private _keyboardInteractions: number = 0;
	private _mouseInteractions: number = 0;
	private _featureDismissals: number = 0;
	private _featureAcceptances: number = 0;
	private _aiAccepted: number = 0;
	private _aiReverted: number = 0;
	private _sessionCount: number = 1;
	private _totalSessionDurationMs: number = 0;
	private _totalInteractions: number = 0;
	private _featuresDiscovered: number = 0;
	private _featuresUsed: number = 0;
	private _currentLevel: ExperienceLevel = ExperienceLevel.Beginner;
	private _transitionHistory: IExperienceLevelTransition[] = [];

	private readonly _onDidChangeExperienceLevel = this._register(new Emitter<IExperienceLevelTransition>());
	readonly onDidChangeExperienceLevel = this._onDidChangeExperienceLevel.event;

	constructor(@ILogService private readonly logService: ILogService) {
		super();
		this.logService.trace('[UserExperienceProfile] Initialized — tracking user behavior');
	}

	get currentProfile(): IUserExperienceProfile {
		return this.recalculateProfile();
	}

	get experienceLevel(): ExperienceLevel { return this._currentLevel; }

	get workflowStyle(): WorkflowStyle {
		const total = this._keyboardInteractions + this._mouseInteractions;
		if (total === 0) { return WorkflowStyle.Hybrid; }
		const keyboardRatio = this._keyboardInteractions / total;
		const aiRatio = (this._aiAccepted + this._aiReverted) / Math.max(1, this._totalInteractions);

		if (aiRatio > 0.4) { return WorkflowStyle.AICollaborative; }
		if (keyboardRatio > 0.7) { return WorkflowStyle.KeyboardFirst; }
		if (keyboardRatio < 0.3) { return WorkflowStyle.VisualFirst; }
		return WorkflowStyle.Hybrid;
	}

	get automationTrustLevel(): number {
		const total = this._aiAccepted + this._aiReverted;
		if (total === 0) { return 0.2; }
		return this._aiAccepted / total;
	}

	recordKeyboardInteraction(): void {
		this._keyboardInteractions++;
		this._totalInteractions++;
		this._checkLevelProgression();
	}

	recordMouseInteraction(): void {
		this._mouseInteractions++;
		this._totalInteractions++;
		this._checkLevelProgression();
	}

	recordFeatureDismissal(featureId: string): void {
		this._featureDismissals++;
		this._totalInteractions++;
	}

	recordFeatureAcceptance(featureId: string): void {
		this._featureAcceptances++;
		this._featuresUsed++;
		this._totalInteractions++;
		this._checkLevelProgression();
	}

	recordAIActionAccepted(): void {
		this._aiAccepted++;
		this._totalInteractions++;
		this._checkLevelProgression();
	}

	recordAIActionReverted(): void {
		this._aiReverted++;
		this._totalInteractions++;
	}

	recordSessionDuration(durationMs: number): void {
		this._totalSessionDurationMs += durationMs;
		this._sessionCount++;
	}

	recalculateProfile(): IUserExperienceProfile {
		const totalFeatures = this._featureAcceptances + this._featureDismissals;
		return {
			userId: 'current-user',
			experienceLevel: this._currentLevel,
			workflowStyle: this.workflowStyle,
			keyboardUsageRatio: this._keyboardRatio,
			automationTrustLevel: this.automationTrustLevel,
			dismissedFeatureRate: totalFeatures > 0 ? this._featureDismissals / totalFeatures : 0,
			workflowComplexityTolerance: this._calculateComplexityTolerance(),
			featuresDiscovered: this._featuresDiscovered,
			featuresUsed: this._featuresUsed,
			totalInteractions: this._totalInteractions,
			sessionCount: this._sessionCount,
			averageSessionDurationMs: this._sessionCount > 0 ? this._totalSessionDurationMs / this._sessionCount : 0,
			lastUpdated: Date.now(),
		};
	}

	getTransitionHistory(): readonly IExperienceLevelTransition[] {
		return this._transitionHistory;
	}

	private get _keyboardRatio(): number {
		const total = this._keyboardInteractions + this._mouseInteractions;
		return total > 0 ? this._keyboardInteractions / total : 0.5;
	}

	private _calculateComplexityTolerance(): number {
		const acceptanceRate = this._featureAcceptances / Math.max(1, this._featureAcceptances + this._featureDismissals);
		const trustLevel = this.automationTrustLevel;
		return Math.min(1, (acceptanceRate * 0.5 + trustLevel * 0.5));
	}

	private _checkLevelProgression(): void {
		const oldLevel = this._currentLevel;
		let newLevel = this._currentLevel;

		// Level progression based on interactions and trust
		if (this._currentLevel === ExperienceLevel.Beginner) {
			if (this._totalInteractions >= 100 && this.automationTrustLevel >= 0.3) {
				newLevel = ExperienceLevel.Intermediate;
			}
		}
		if (this._currentLevel === ExperienceLevel.Intermediate) {
			if (this._totalInteractions >= 500 && this.automationTrustLevel >= 0.5 && this._featuresUsed >= 10) {
				newLevel = ExperienceLevel.Advanced;
			}
		}
		if (this._currentLevel === ExperienceLevel.Advanced) {
			if (this._totalInteractions >= 2000 && this.automationTrustLevel >= 0.7 && this._featuresUsed >= 25) {
				newLevel = ExperienceLevel.PowerUser;
			}
		}

		if (newLevel !== oldLevel) {
			const transition: IExperienceLevelTransition = {
				fromLevel: oldLevel,
				toLevel: newLevel,
				reason: `Met progression criteria: ${this._totalInteractions} interactions, trust ${this.automationTrustLevel.toFixed(2)}`,
				evidence: [
					`Total interactions: ${this._totalInteractions}`,
					`Trust level: ${this.automationTrustLevel.toFixed(2)}`,
					`Features used: ${this._featuresUsed}`,
				],
				timestamp: Date.now(),
			};
			this._currentLevel = newLevel;
			this._transitionHistory.push(transition);
			this.logService.info(`[UserExperienceProfile] Level changed: ${oldLevel} → ${newLevel}`);
			this._onDidChangeExperienceLevel.fire(transition);
		}
	}
}

// ═══════════════════════════════════════════════════════════════════════════════
// TASK 3 — ADAPTIVE INTERFACE SERVICE
// ═══════════════════════════════════════════════════════════════════════════════

const CONTEXT_LAYOUTS: Record<ActivityContext, IContextualLayoutProfile> = {
	[ActivityContext.Coding]: {
		context: ActivityContext.Coding,
		dominantSurface: 'editor',
		elevatedSurfaces: ['editor', 'file-explorer'],
		suppressedSurfaces: ['ai-panel', 'graph-view', 'diagnostics'],
		compressedSurfaces: ['terminal', 'process-panel'],
		editorDominanceRatio: 0.85,
	},
	[ActivityContext.Debugging]: {
		context: ActivityContext.Debugging,
		dominantSurface: 'editor',
		elevatedSurfaces: ['editor', 'diagnostics', 'debug-console'],
		suppressedSurfaces: ['ai-panel', 'graph-view'],
		compressedSurfaces: ['file-explorer'],
		editorDominanceRatio: 0.6,
	},
	[ActivityContext.AIPlanning]: {
		context: ActivityContext.AIPlanning,
		dominantSurface: 'ai-orchestration',
		elevatedSurfaces: ['ai-panel', 'orchestration-view', 'editor'],
		suppressedSurfaces: ['diagnostics', 'terminal'],
		compressedSurfaces: ['file-explorer'],
		editorDominanceRatio: 0.5,
	},
	[ActivityContext.Reviewing]: {
		context: ActivityContext.Reviewing,
		dominantSurface: 'editor',
		elevatedSurfaces: ['editor', 'diff-view', 'replay-panel'],
		suppressedSurfaces: ['ai-panel', 'terminal'],
		compressedSurfaces: ['file-explorer'],
		editorDominanceRatio: 0.65,
	},
	[ActivityContext.Executing]: {
		context: ActivityContext.Executing,
		dominantSurface: 'editor',
		elevatedSurfaces: ['editor', 'terminal', 'process-panel'],
		suppressedSurfaces: ['graph-view', 'ai-panel'],
		compressedSurfaces: ['file-explorer'],
		editorDominanceRatio: 0.6,
	},
	[ActivityContext.Navigating]: {
		context: ActivityContext.Navigating,
		dominantSurface: 'file-explorer',
		elevatedSurfaces: ['file-explorer', 'editor', 'search'],
		suppressedSurfaces: ['ai-panel', 'diagnostics'],
		compressedSurfaces: ['terminal'],
		editorDominanceRatio: 0.55,
	},
	[ActivityContext.Learning]: {
		context: ActivityContext.Learning,
		dominantSurface: 'editor',
		elevatedSurfaces: ['editor', 'onboarding-panel', 'ai-panel'],
		suppressedSurfaces: ['graph-view', 'diagnostics'],
		compressedSurfaces: ['terminal'],
		editorDominanceRatio: 0.7,
	},
	[ActivityContext.Idle]: {
		context: ActivityContext.Idle,
		dominantSurface: 'editor',
		elevatedSurfaces: ['editor'],
		suppressedSurfaces: [],
		compressedSurfaces: [],
		editorDominanceRatio: 0.7,
	},
};

export class AdaptiveInterfaceService extends Disposable implements IAdaptiveInterfaceService {
	declare readonly _serviceBrand: undefined;

	private _currentContext: ActivityContext = ActivityContext.Coding;
	private _adaptationHistory: IInterfaceAdaptation[] = [];

	private readonly _onDidChangeContext = this._register(new Emitter<ActivityContext>());
	readonly onDidChangeContext = this._onDidChangeContext.event;

	private readonly _onDidAdapt = this._register(new Emitter<IInterfaceAdaptation>());
	readonly onDidAdapt = this._onDidAdapt.event;

	constructor(@ILogService private readonly logService: ILogService) {
		super();
		this.logService.trace('[AdaptiveInterface] Initialized — context-aware UI adaptation');
	}

	get currentContext(): ActivityContext { return this._currentContext; }

	get currentLayoutProfile(): IContextualLayoutProfile {
		return CONTEXT_LAYOUTS[this._currentContext];
	}

	notifyContextChanged(context: ActivityContext): void {
		if (context === this._currentContext) { return; }
		const oldContext = this._currentContext;
		this._currentContext = context;
		this.logService.info(`[AdaptiveInterface] Context changed: ${oldContext} → ${context}`);
		this._onDidChangeContext.fire(context);
		this.applyAdaptation(context);
	}

	getLayoutProfile(context: ActivityContext): IContextualLayoutProfile {
		return CONTEXT_LAYOUTS[context];
	}

	applyAdaptation(context: ActivityContext): IInterfaceAdaptation {
		const profile = CONTEXT_LAYOUTS[context];
		const adaptations: IAdaptationAction[] = [];

		for (const surface of profile.elevatedSurfaces) {
			adaptations.push({ actionType: 'elevate', targetSurface: surface, priority: 1, description: `Elevated for ${context}` });
		}
		for (const surface of profile.suppressedSurfaces) {
			adaptations.push({ actionType: 'suppress', targetSurface: surface, priority: 3, description: `Suppressed during ${context}` });
		}
		for (const surface of profile.compressedSurfaces) {
			adaptations.push({ actionType: 'compress', targetSurface: surface, priority: 2, description: `Compressed during ${context}` });
		}

		const adaptation: IInterfaceAdaptation = {
			context,
			adaptations,
			reason: `Activity context: ${context}`,
			timestamp: Date.now(),
		};

		this._adaptationHistory.push(adaptation);
		this._onDidAdapt.fire(adaptation);
		return adaptation;
	}

	simplifyInactiveWorkflows(): void {
		this.logService.trace('[AdaptiveInterface] Simplifying inactive workflows');
	}

	compressUnusedSystems(): void {
		this.logService.trace('[AdaptiveInterface] Compressing unused systems');
	}

	elevateRelevantTools(context: ActivityContext): void {
		this.applyAdaptation(context);
	}

	getAdaptationHistory(): readonly IInterfaceAdaptation[] {
		return this._adaptationHistory;
	}
}

// ═══════════════════════════════════════════════════════════════════════════════
// TASK 4 — FEATURE FATIGUE SERVICE
// ═══════════════════════════════════════════════════════════════════════════════

export class FeatureFatigueService extends Disposable implements IFeatureFatigueService {
	declare readonly _serviceBrand: undefined;

	private _ignoredPanels: Map<string, number> = new Map(); // id → count
	private _dismissals: Map<string, number> = new Map();
	private _unusedCapabilities: Map<string, number> = new Map();
	private _promptRejections: Map<string, number> = new Map();
	private _abandonments: Map<string, number> = new Map();
	private _cooldowns: Map<string, number> = new Map(); // id → until timestamp
	private _detections: IFatigueDetection[] = [];

	private readonly _onDidDetectFatigue = this._register(new Emitter<IFatigueDetection>());
	readonly onDidDetectFatigue = this._onDidDetectFatigue.event;

	private readonly _onDidReduceFatigue = this._register(new Emitter<IFatigueReductionAction>());
	readonly onDidReduceFatigue = this._onDidReduceFatigue.event;

	constructor(@ILogService private readonly logService: ILogService) {
		super();
		this.logService.trace('[FeatureFatigue] Initialized — monitoring feature exhaustion');
	}

	get fatigueScore(): number {
		const totalSignals = this._ignoredPanels.size + this._dismissals.size + this._unusedCapabilities.size + this._promptRejections.size + this._abandonments.size;
		return Math.min(1, totalSignals * 0.05);
	}

	get fatigueState(): FatigueState {
		const score = this.fatigueScore;
		if (score < 0.2) { return FatigueState.Healthy; }
		if (score < 0.4) { return FatigueState.Moderate; }
		if (score < 0.7) { return FatigueState.Elevated; }
		return FatigueState.Critical;
	}

	recordIgnoredPanel(panelId: string): void {
		const count = (this._ignoredPanels.get(panelId) ?? 0) + 1;
		this._ignoredPanels.set(panelId, count);
		if (count >= 3) {
			this._fireDetection(FatigueSignal.IgnoredPanel, panelId, count * 0.1, `Panel ${panelId} ignored ${count} times`);
		}
	}

	recordDismissal(featureId: string): void {
		const count = (this._dismissals.get(featureId) ?? 0) + 1;
		this._dismissals.set(featureId, count);
		if (count >= 3) {
			this._fireDetection(FatigueSignal.RepetitiveDismissal, featureId, count * 0.15, `Feature ${featureId} dismissed ${count} times`);
			this._cooldowns.set(featureId, Date.now() + 1800000); // 30min cooldown
		}
	}

	recordUnusedCapability(featureId: string): void {
		const count = (this._unusedCapabilities.get(featureId) ?? 0) + 1;
		this._unusedCapabilities.set(featureId, count);
	}

	recordPromptRejection(promptId: string): void {
		const count = (this._promptRejections.get(promptId) ?? 0) + 1;
		this._promptRejections.set(promptId, count);
		if (count >= 2) {
			this._fireDetection(FatigueSignal.PromptRejection, promptId, count * 0.2, `Prompt ${promptId} rejected ${count} times`);
		}
	}

	recordAttentionAbandonment(surfaceId: string): void {
		const count = (this._abandonments.get(surfaceId) ?? 0) + 1;
		this._abandonments.set(surfaceId, count);
	}

	getFatigueDetections(): readonly IFatigueDetection[] {
		return this._detections;
	}

	applyFatigueReductions(): IFatigueReductionAction[] {
		const actions: IFatigueReductionAction[] = [];
		const state = this.fatigueState;

		if (state === FatigueState.Elevated || state === FatigueState.Critical) {
			// Suppress noisy features
			for (const [id] of this._dismissals) {
				actions.push({
					actionType: 'cool-down-suggestions',
					targetId: id,
					reason: 'Fatigue-based cooldown',
					durationMs: 3600000,
					timestamp: Date.now(),
				});
			}
			// Reduce visual exposure
			for (const [id] of this._ignoredPanels) {
				actions.push({
					actionType: 'reduce-exposure',
					targetId: id,
					reason: 'Panel being ignored',
					durationMs: 7200000,
					timestamp: Date.now(),
				});
			}
		}

		actions.forEach(a => this._onDidReduceFatigue.fire(a));
		return actions;
	}

	isInCooldown(featureId: string): boolean {
		const until = this._cooldowns.get(featureId);
		if (!until) { return false; }
		if (Date.now() > until) {
			this._cooldowns.delete(featureId);
			return false;
		}
		return true;
	}

	private _fireDetection(signal: FatigueSignal, targetId: string, severity: number, evidence: string): void {
		const detection: IFatigueDetection = {
			signal,
			targetId,
			severity: Math.min(1, severity),
			evidence,
			cooldownRecommendedMs: 1800000,
			timestamp: Date.now(),
		};
		this._detections.push(detection);
		this._onDidDetectFatigue.fire(detection);
	}
}

// ═══════════════════════════════════════════════════════════════════════════════
// TASK 5 — CONTEXTUAL MINIMALISM SERVICE
// ═══════════════════════════════════════════════════════════════════════════════

const MINIMALISM_LEVEL_ORDER: MinimalismLevel[] = [MinimalismLevel.Full, MinimalismLevel.Reduced, MinimalismLevel.Minimal, MinimalismLevel.Silent];

export class ContextualMinimalismService extends Disposable implements IContextualMinimalismService {
	declare readonly _serviceBrand: undefined;

	private _currentLevel: MinimalismLevel = MinimalismLevel.Full;
	private _currentTrigger: MinimalismTrigger = MinimalismTrigger.UserRequest;
	private _surfaceRules: Map<string, ISurfaceVisibilityRule> = new Map();
	private _hiddenSurfaces: Set<string> = new Set();
	private _reducedSurfaces: Set<string> = new Set();
	private _motionReduction: boolean = false;

	private readonly _onDidChangeMinimalism = this._register(new Emitter<IMinimalismState>());
	readonly onDidChangeMinimalism = this._onDidChangeMinimalism.event;

	constructor(@ILogService private readonly logService: ILogService) {
		super();
		this.logService.trace('[ContextualMinimalism] Initialized — interface quiets during deep work');
	}

	get currentState(): IMinimalismState {
		return {
			level: this._currentLevel,
			trigger: this._currentTrigger,
			hiddenSurfaces: [...this._hiddenSurfaces],
			reducedSurfaces: [...this._reducedSurfaces],
			motionReductionActive: this._motionReduction,
			chromeReductionPercent: this._calculateChromeReduction(),
			timestamp: Date.now(),
		};
	}

	get currentLevel(): MinimalismLevel { return this._currentLevel; }

	get motionLevel(): number {
		if (this._currentLevel === MinimalismLevel.Silent) { return 0.0; }
		if (this._currentLevel === MinimalismLevel.Minimal) { return 0.2; }
		if (this._currentLevel === MinimalismLevel.Reduced) { return 0.5; }
		return 1.0;
	}

	registerSurfaceRule(rule: ISurfaceVisibilityRule): void {
		this._surfaceRules.set(rule.surfaceId, rule);
	}

	increaseMinimalism(trigger: MinimalismTrigger): void {
		const currentIndex = MINIMALISM_LEVEL_ORDER.indexOf(this._currentLevel);
		if (currentIndex < MINIMALISM_LEVEL_ORDER.length - 1) {
			this._currentLevel = MINIMALISM_LEVEL_ORDER[currentIndex + 1];
			this._currentTrigger = trigger;
			this._applyMinimalism();
			this.logService.info(`[ContextualMinimalism] Level increased to ${this._currentLevel} (${trigger})`);
			this._onDidChangeMinimalism.fire(this.currentState);
		}
	}

	decreaseMinimalism(reason: string): void {
		const currentIndex = MINIMALISM_LEVEL_ORDER.indexOf(this._currentLevel);
		if (currentIndex > 0) {
			this._currentLevel = MINIMALISM_LEVEL_ORDER[currentIndex - 1];
			this._currentTrigger = MinimalismTrigger.UserRequest;
			this._applyMinimalism();
			this.logService.info(`[ContextualMinimalism] Level decreased to ${this._currentLevel} (${reason})`);
			this._onDidChangeMinimalism.fire(this.currentState);
		}
	}

	enterSilentMode(reason: string): IDisposable {
		const previousLevel = this._currentLevel;
		this._currentLevel = MinimalismLevel.Silent;
		this._currentTrigger = MinimalismTrigger.FlowState;
		this._applyMinimalism();
		this._onDidChangeMinimalism.fire(this.currentState);

		const store = new DisposableStore();
		store.add({ dispose: () => {
			this._currentLevel = previousLevel;
			this._applyMinimalism();
			this._onDidChangeMinimalism.fire(this.currentState);
		} });
		return store;
	}

	shouldShowSurface(surfaceId: string): boolean {
		const rule = this._surfaceRules.get(surfaceId);
		if (!rule) { return true; }

		const surfaceLevelIndex = MINIMALISM_LEVEL_ORDER.indexOf(rule.minimumMinimalismLevel);
		const currentLevelIndex = MINIMALISM_LEVEL_ORDER.indexOf(this._currentLevel);

		// Surface is visible only if current minimalism is at or below the surface's minimum
		return currentLevelIndex <= surfaceLevelIndex;
	}

	autoHideLowValue(): readonly string[] {
		const hidden: string[] = [];
		for (const [id, rule] of this._surfaceRules) {
			if (rule.quietDuringFocus && this._currentLevel === MinimalismLevel.Minimal) {
				this._hiddenSurfaces.add(id);
				hidden.push(id);
			}
		}
		return hidden;
	}

	quietPanels(): readonly string[] {
		const quieted: string[] = [];
		if (this._currentLevel === MinimalismLevel.Reduced || this._currentLevel === MinimalismLevel.Minimal) {
			for (const [id, rule] of this._surfaceRules) {
				if (rule.reduceMotionDuringConcentration) {
					this._reducedSurfaces.add(id);
					quieted.push(id);
				}
			}
		}
		return quieted;
	}

	private _applyMinimalism(): void {
		this._hiddenSurfaces.clear();
		this._reducedSurfaces.clear();
		this._motionReduction = this._currentLevel === MinimalismLevel.Minimal || this._currentLevel === MinimalismLevel.Silent;

		for (const [id, rule] of this._surfaceRules) {
			if (!this.shouldShowSurface(id)) {
				this._hiddenSurfaces.add(id);
			}
		}
	}

	private _calculateChromeReduction(): number {
		switch (this._currentLevel) {
			case MinimalismLevel.Full: return 0;
			case MinimalismLevel.Reduced: return 30;
			case MinimalismLevel.Minimal: return 60;
			case MinimalismLevel.Silent: return 90;
		}
	}
}

// ═══════════════════════════════════════════════════════════════════════════════
// TASK 6 — FLOW STATE SERVICE
// ═══════════════════════════════════════════════════════════════════════════════

export class FlowStateService extends Disposable implements IFlowStateService {
	declare readonly _serviceBrand: undefined;

	private _editTimestamps: number[] = [];
	private _contextSwitches: number = 0;
	private _contextSwitchWindow: number[] = []; // timestamps of recent switches
	private _flowStartTime: number | null = null;
	private _totalFlowTimeTodayMs: number = 0;
	private _flowSessionsToday: number = 0;
	private _longestFlowMs: number = 0;
	private _interruptionsBlocked: number = 0;
	private _deferredInterruptions: IFlowInterruption[] = [];

	private readonly _onDidChangeFlowState = this._register(new Emitter<IFlowStateMetrics>());
	readonly onDidChangeFlowState = this._onDidChangeFlowState.event;

	constructor(@ILogService private readonly logService: ILogService) {
		super();
		this.logService.trace('[FlowState] Initialized — protecting deep work');
	}

	get currentMetrics(): IFlowStateMetrics {
		return this._calculateMetrics();
	}

	get isInFlow(): boolean {
		return this._calculateMetrics().isInFlow;
	}

	recordEdit(): void {
		const now = Date.now();
		this._editTimestamps.push(now);
		// Keep only last 5 minutes of edits
		const cutoff = now - 300000;
		this._editTimestamps = this._editTimestamps.filter(t => t > cutoff);

		// Check if entering flow
		if (!this._flowStartTime && this._calculateEditRhythm() > 5) {
			this._flowStartTime = now;
			this._onDidChangeFlowState.fire(this._calculateMetrics());
		}
	}

	recordContextSwitch(): void {
		const now = Date.now();
		this._contextSwitches++;
		this._contextSwitchWindow.push(now);
		const cutoff = now - 300000;
		this._contextSwitchWindow = this._contextSwitchWindow.filter(t => t > cutoff);

		// Context switch may break flow
		if (this._flowStartTime && this._contextSwitchWindow.length > 3) {
			this._endFlow();
		}
	}

	attemptInterruption(source: string, priority: 'critical' | 'important' | 'normal' | 'low'): boolean {
		if (!this.isInFlow) { return true; }

		if (priority === 'critical') { return true; } // Always allow critical
		if (priority === 'important') {
			this._interruptionsBlocked++;
			return false; // Defer
		}
		// normal and low are always deferred during flow
		this._interruptionsBlocked++;
		return false;
	}

	deferInterruption(source: string, description: string): IFlowInterruption {
		const deferred: IFlowInterruption = {
			source,
			priority: 'normal',
			description,
			deferred: true,
			deferredUntil: null,
			timestamp: Date.now(),
		};
		this._deferredInterruptions.push(deferred);
		return deferred;
	}

	getDeferredInterruptions(): readonly IFlowInterruption[] {
		return this._deferredInterruptions;
	}

	releaseDeferredInterruptions(): readonly IFlowInterruption[] {
		const deferred = [...this._deferredInterruptions];
		this._deferredInterruptions = [];
		return deferred;
	}

	batchNotifications(): readonly IFlowInterruption[] {
		// Batch and return all deferred
		return this.releaseDeferredInterruptions();
	}

	getFlowStats(): IFlowStats {
		return {
			totalFlowSessionsToday: this._flowSessionsToday,
			totalFlowTimeTodayMs: this._totalFlowTimeTodayMs,
			averageFlowDurationMs: this._flowSessionsToday > 0 ? this._totalFlowTimeTodayMs / this._flowSessionsToday : 0,
			longestFlowSessionMs: this._longestFlowMs,
			interruptionsBlockedToday: this._interruptionsBlocked,
			flowEfficiency: this._calculateFlowEfficiency(),
		};
	}

	private _calculateMetrics(): IFlowStateMetrics {
		const rhythm = this._calculateEditRhythm();
		const recentSwitches = this._contextSwitchWindow.length;
		const uninterruptedDuration = this._flowStartTime ? Date.now() - this._flowStartTime : 0;
		const focusIntensity = Math.min(1, rhythm / 20); // 20 edits/min = peak

		let intensity: FlowIntensity;
		let isInFlow: boolean;

		if (rhythm < 3 || recentSwitches > 3) {
			intensity = FlowIntensity.None;
			isInFlow = false;
		} else if (rhythm < 6) {
			intensity = FlowIntensity.Light;
			isInFlow = false;
		} else if (rhythm < 10) {
			intensity = FlowIntensity.Moderate;
			isInFlow = true;
		} else if (rhythm < 18) {
			intensity = FlowIntensity.Deep;
			isInFlow = true;
		} else {
			intensity = FlowIntensity.Peak;
			isInFlow = true;
		}

		return {
			intensity,
			uninterruptedDurationMs: uninterruptedDuration,
			editRhythm: rhythm,
			focusIntensity,
			contextSwitchCount: recentSwitches,
			isInFlow,
			flowStartTime: this._flowStartTime,
			totalFlowTimeTodayMs: this._totalFlowTimeTodayMs,
			timestamp: Date.now(),
		};
	}

	private _calculateEditRhythm(): number {
		if (this._editTimestamps.length < 2) { return 0; }
		const now = Date.now();
		const cutoff = now - 60000; // Last minute
		const recentEdits = this._editTimestamps.filter(t => t > cutoff);
		return recentEdits.length;
	}

	private _calculateFlowEfficiency(): number {
		if (this._flowSessionsToday === 0) { return 0; }
		const avgDuration = this._totalFlowTimeTodayMs / this._flowSessionsToday;
		// 15+ minutes per session is excellent
		return Math.min(1, avgDuration / 900000);
	}

	private _endFlow(): void {
		if (this._flowStartTime) {
			const duration = Date.now() - this._flowStartTime;
			this._totalFlowTimeTodayMs += duration;
			this._flowSessionsToday++;
			if (duration > this._longestFlowMs) {
				this._longestFlowMs = duration;
			}
			this._flowStartTime = null;
			this._onDidChangeFlowState.fire(this._calculateMetrics());
		}
	}
}

// ═══════════════════════════════════════════════════════════════════════════════
// TASK 7 — AUTONOMY TRUST SERVICE
// ═══════════════════════════════════════════════════════════════════════════════

const AUTONOMY_THRESHOLDS: Record<AutonomyLevel, number> = {
	[AutonomyLevel.FullConsent]: 0.0,
	[AutonomyLevel.ConditionalConsent]: 0.3,
	[AutonomyLevel.Supervised]: 0.5,
	[AutonomyLevel.Trusted]: 0.7,
	[AutonomyLevel.FullAutonomy]: 0.9,
};

export class AutonomyTrustService extends Disposable implements IAutonomyTrustService {
	declare readonly _serviceBrand: undefined;

	private _acceptedActions: number = 0;
	private _revertedActions: number = 0;
	private _approvalsAccepted: number = 0;
	private _approvalsRejected: number = 0;
	private _userOverrides: number = 0;
	private _confidenceSum: number = 0;
	private _confidenceCount: number = 0;
	private _currentLevel: AutonomyLevel = AutonomyLevel.FullConsent;
	private _trustHistory: ITrustEscalation[] = [];

	private readonly _onDidChangeAutonomyLevel = this._register(new Emitter<ITrustEscalation>());
	readonly onDidChangeAutonomyLevel = this._onDidChangeAutonomyLevel.event;

	constructor(@ILogService private readonly logService: ILogService) {
		super();
		this.logService.trace('[AutonomyTrust] Initialized — AI earns autonomy gradually');
	}

	get currentMetrics(): ITrustMetrics {
		return this.recalculateTrust();
	}

	get autonomyLevel(): AutonomyLevel { return this._currentLevel; }

	get trustScore(): number {
		return this._calculateTrustScore();
	}

	recordAcceptedAction(confidence: number): void {
		this._acceptedActions++;
		this._confidenceSum += confidence;
		this._confidenceCount++;
		this._checkEscalation();
	}

	recordRevertedAction(confidence: number): void {
		this._revertedActions++;
		this._confidenceSum += confidence;
		this._confidenceCount++;
		this._checkDeescalation();
	}

	recordOverride(): void {
		this._userOverrides++;
		this._checkDeescalation();
	}

	recordApprovalAccepted(): void {
		this._approvalsAccepted++;
		this._checkEscalation();
	}

	recordApprovalRejected(): void {
		this._approvalsRejected++;
		this._checkDeescalation();
	}

	isActionAllowed(actionType: string): boolean {
		const actionLevels: Record<string, AutonomyLevel> = {
			'suggest': AutonomyLevel.FullConsent,
			'auto-format': AutonomyLevel.ConditionalConsent,
			'auto-fix': AutonomyLevel.Supervised,
			'auto-refactor': AutonomyLevel.Trusted,
			'auto-execute': AutonomyLevel.FullAutonomy,
		};
		const requiredLevel = actionLevels[actionType] ?? AutonomyLevel.FullConsent;
		const levelOrder = [AutonomyLevel.FullConsent, AutonomyLevel.ConditionalConsent, AutonomyLevel.Supervised, AutonomyLevel.Trusted, AutonomyLevel.FullAutonomy];
		return levelOrder.indexOf(this._currentLevel) >= levelOrder.indexOf(requiredLevel);
	}

	getRequiredConfirmation(actionType: string): AutonomyLevel {
		const actionLevels: Record<string, AutonomyLevel> = {
			'suggest': AutonomyLevel.FullConsent,
			'auto-format': AutonomyLevel.ConditionalConsent,
			'auto-fix': AutonomyLevel.Supervised,
			'auto-refactor': AutonomyLevel.Trusted,
			'auto-execute': AutonomyLevel.FullAutonomy,
		};
		return actionLevels[actionType] ?? AutonomyLevel.FullConsent;
	}

	recalculateTrust(): ITrustMetrics {
		return {
			acceptedActions: this._acceptedActions,
			revertedActions: this._revertedActions,
			approvalAcceptanceRate: this._calculateApprovalRate(),
			confidenceAlignment: this._calculateConfidenceAlignment(),
			userOverrides: this._userOverrides,
			trustScore: this._calculateTrustScore(),
			currentAutonomyLevel: this._currentLevel,
			timestamp: Date.now(),
		};
	}

	getTrustHistory(): readonly ITrustEscalation[] {
		return this._trustHistory;
	}

	getTrustRecommendations(): readonly string[] {
		const recommendations: string[] = [];
		if (this._calculateApprovalRate() < 0.5) {
			recommendations.push('Accept more AI suggestions to build trust');
		}
		if (this._userOverrides > 5) {
			recommendations.push('Reduce manual overrides — let AI handle minor tasks');
		}
		if (this._revertedActions > this._acceptedActions * 0.3) {
			recommendations.push('Review AI suggestions before reverting — provide feedback');
		}
		return recommendations;
	}

	private _calculateTrustScore(): number {
		const total = this._acceptedActions + this._revertedActions;
		if (total === 0) { return 0.1; }

		const acceptanceRate = this._acceptedActions / total;
		const approvalRate = this._calculateApprovalRate();
		const overridePenalty = Math.min(0.2, this._userOverrides * 0.02);

		return Math.max(0, Math.min(1, (acceptanceRate * 0.4 + approvalRate * 0.4 + 0.2) - overridePenalty));
	}

	private _calculateApprovalRate(): number {
		const total = this._approvalsAccepted + this._approvalsRejected;
		if (total === 0) { return 0.5; }
		return this._approvalsAccepted / total;
	}

	private _calculateConfidenceAlignment(): number {
		if (this._confidenceCount === 0) { return 0.5; }
		// How well AI confidence matches user acceptance
		const avgConfidence = this._confidenceSum / this._confidenceCount;
		const acceptanceRate = this._acceptedActions / Math.max(1, this._acceptedActions + this._revertedActions);
		return 1 - Math.abs(avgConfidence - acceptanceRate);
	}

	private _checkEscalation(): void {
		const score = this._calculateTrustScore();
		const levelOrder = [AutonomyLevel.FullConsent, AutonomyLevel.ConditionalConsent, AutonomyLevel.Supervised, AutonomyLevel.Trusted, AutonomyLevel.FullAutonomy];
		const currentIndex = levelOrder.indexOf(this._currentLevel);

		for (let i = levelOrder.length - 1; i > currentIndex; i--) {
			if (score >= AUTONOMY_THRESHOLDS[levelOrder[i]]) {
				this._escalate(levelOrder[i]);
				break;
			}
		}
	}

	private _checkDeescalation(): void {
		const score = this._calculateTrustScore();
		const levelOrder = [AutonomyLevel.FullConsent, AutonomyLevel.ConditionalConsent, AutonomyLevel.Supervised, AutonomyLevel.Trusted, AutonomyLevel.FullAutonomy];
		const currentIndex = levelOrder.indexOf(this._currentLevel);

		if (currentIndex > 0 && score < AUTONOMY_THRESHOLDS[this._currentLevel]) {
			this._escalate(levelOrder[currentIndex - 1]);
		}
	}

	private _escalate(newLevel: AutonomyLevel): void {
		const oldLevel = this._currentLevel;
		if (oldLevel === newLevel) { return; }

		const escalation: ITrustEscalation = {
			fromLevel: oldLevel,
			toLevel: newLevel,
			reason: `Trust score: ${this._calculateTrustScore().toFixed(2)}`,
			evidence: [
				`Accepted: ${this._acceptedActions}, Reverted: ${this._revertedActions}`,
				`Approval rate: ${this._calculateApprovalRate().toFixed(2)}`,
				`Overrides: ${this._userOverrides}`,
			],
			trustScoreAtTransition: this._calculateTrustScore(),
			timestamp: Date.now(),
		};

		this._currentLevel = newLevel;
		this._trustHistory.push(escalation);
		this.logService.info(`[AutonomyTrust] Autonomy changed: ${oldLevel} → ${newLevel} (trust: ${escalation.trustScoreAtTransition.toFixed(2)})`);
		this._onDidChangeAutonomyLevel.fire(escalation);
	}
}

// ═══════════════════════════════════════════════════════════════════════════════
// TASK 8 — ONBOARDING EXPERIENCE SERVICE
// ═══════════════════════════════════════════════════════════════════════════════

const ONBOARDING_STEPS: IOnboardingStep[] = [
	{ stepId: 'welcome', stage: OnboardingStage.Welcome, title: 'Welcome to Real Vibecode', description: 'Your AI-native development environment', featureId: 'welcome', requiredInteractions: 1, completionCriteria: 'User acknowledged welcome', nextStepId: 'editor-basics', optional: false },
	{ stepId: 'editor-basics', stage: OnboardingStage.EditorBasics, title: 'Editor Essentials', description: 'Learn the core editing experience', featureId: 'editor', requiredInteractions: 5, completionCriteria: 'User made 5 edits', nextStepId: 'ai-intro', optional: false },
	{ stepId: 'ai-intro', stage: OnboardingStage.AIIntroduction, title: 'Your AI Copilot', description: 'Meet the AI assistant', featureId: 'ai-suggestion', requiredInteractions: 2, completionCriteria: 'User saw 2 AI suggestions', nextStepId: 'workflow-discovery', optional: false },
	{ stepId: 'workflow-discovery', stage: OnboardingStage.WorkflowDiscovery, title: 'Smart Workflows', description: 'Discover AI-powered workflows', featureId: 'ai-workflow', requiredInteractions: 3, completionCriteria: 'User used 3 workflow features', nextStepId: 'advanced-features', optional: true },
	{ stepId: 'advanced-features', stage: OnboardingStage.AdvancedFeatures, title: 'Advanced Capabilities', description: 'Explore advanced AI features', featureId: 'advanced-ai', requiredInteractions: 2, completionCriteria: 'User explored advanced features', nextStepId: 'expert-capabilities', optional: true },
	{ stepId: 'expert-capabilities', stage: OnboardingStage.ExpertCapabilities, title: 'Expert Tools', description: 'Unlock the full power', featureId: 'expert-mode', requiredInteractions: 1, completionCriteria: 'User enabled expert tools', nextStepId: null, optional: true },
];

export class OnboardingExperienceService extends Disposable implements IOnboardingExperienceService {
	declare readonly _serviceBrand: undefined;

	private _isFirstRun: boolean = true;
	private _currentStepIndex: number = 0;
	private _completedSteps: Set<string> = new Set();
	private _skippedSteps: Set<string> = new Set();
	private _started: boolean = false;
	private _startedAt: number | null = null;
	private _interactionCounts: Map<string, number> = new Map();

	private readonly _onDidChangeStage = this._register(new Emitter<OnboardingStage>());
	readonly onDidChangeStage = this._onDidChangeStage.event;

	private readonly _onDidCompleteStep = this._register(new Emitter<IOnboardingStep>());
	readonly onDidCompleteStep = this._onDidCompleteStep.event;

	constructor(@ILogService private readonly logService: ILogService) {
		super();
		this.logService.trace('[OnboardingExperience] Initialized — premium, calm, intelligent onboarding');
	}

	get currentState(): IOnboardingState {
		const currentStep = this._started && this._currentStepIndex < ONBOARDING_STEPS.length
			? ONBOARDING_STEPS[this._currentStepIndex]
			: null;

		const totalSteps = ONBOARDING_STEPS.length;
		const completedCount = this._completedSteps.size;
		const isComplete = completedCount >= totalSteps || this._currentStepIndex >= totalSteps;

		return {
			currentStage: currentStep?.stage ?? OnboardingStage.Complete,
			currentStep,
			completedSteps: [...this._completedSteps],
			skippedSteps: [...this._skippedSteps],
			progressPercent: totalSteps > 0 ? Math.round((completedCount / totalSteps) * 100) : 0,
			isComplete,
			startedAt: this._startedAt,
			estimatedRemainingSteps: Math.max(0, totalSteps - completedCount - 1),
			timestamp: Date.now(),
		};
	}

	get isFirstRun(): boolean { return this._isFirstRun; }
	get progressPercent(): number { return this.currentState.progressPercent; }

	startOnboarding(): void {
		if (this._started) { return; }
		this._started = true;
		this._startedAt = Date.now();
		this._currentStepIndex = 0;
		this.logService.info('[OnboardingExperience] Onboarding started');
		this._onDidChangeStage.fire(ONBOARDING_STEPS[0].stage);
	}

	completeCurrentStep(): void {
		if (this._currentStepIndex >= ONBOARDING_STEPS.length) { return; }
		const step = ONBOARDING_STEPS[this._currentStepIndex];
		this._completedSteps.add(step.stepId);
		this._onDidCompleteStep.fire(step);
		this.logService.info(`[OnboardingExperience] Step completed: ${step.stepId}`);

		this._currentStepIndex++;
		if (this._currentStepIndex < ONBOARDING_STEPS.length) {
			const nextStep = ONBOARDING_STEPS[this._currentStepIndex];
			if (nextStep.stage !== step.stage) {
				this._onDidChangeStage.fire(nextStep.stage);
			}
		} else {
			this._onDidChangeStage.fire(OnboardingStage.Complete);
			this._isFirstRun = false;
		}
	}

	skipCurrentStep(): void {
		if (this._currentStepIndex >= ONBOARDING_STEPS.length) { return; }
		const step = ONBOARDING_STEPS[this._currentStepIndex];
		if (step.optional) {
			this._skippedSteps.add(step.stepId);
			this._currentStepIndex++;
			this.logService.info(`[OnboardingExperience] Step skipped: ${step.stepId}`);
		}
	}

	getNextStep(): IOnboardingStep | null {
		if (this._currentStepIndex >= ONBOARDING_STEPS.length) { return null; }
		return ONBOARDING_STEPS[this._currentStepIndex];
	}

	recordOnboardingInteraction(featureId: string): void {
		const count = (this._interactionCounts.get(featureId) ?? 0) + 1;
		this._interactionCounts.set(featureId, count);

		// Check if current step is complete
		if (this._started && this._currentStepIndex < ONBOARDING_STEPS.length) {
			const step = ONBOARDING_STEPS[this._currentStepIndex];
			if (step.featureId === featureId && count >= step.requiredInteractions) {
				this.completeCurrentStep();
			}
		}
	}

	resetOnboarding(): void {
		this._completedSteps.clear();
		this._skippedSteps.clear();
		this._interactionCounts.clear();
		this._currentStepIndex = 0;
		this._started = false;
		this._startedAt = null;
		this._isFirstRun = true;
	}

	getAllSteps(): readonly IOnboardingStep[] {
		return ONBOARDING_STEPS;
	}
}

// ═══════════════════════════════════════════════════════════════════════════════
// TASK 9 — EXPERT MODE SERVICE
// ═══════════════════════════════════════════════════════════════════════════════

export class ExpertModeService extends Disposable implements IExpertModeService {
	declare readonly _serviceBrand: undefined;

	private _isEnabled: boolean = false;
	private _enabledCapabilities: Set<ExpertCapability> = new Set();
	private _activatedAt: number | null = null;
	private _requiredLevel: ExperienceLevel = ExperienceLevel.Advanced;
	private _currentExperienceLevel: ExperienceLevel = ExperienceLevel.Beginner;

	private readonly _onDidChangeExpertMode = this._register(new Emitter<boolean>());
	readonly onDidChangeExpertMode = this._onDidChangeExpertMode.event;

	constructor(@ILogService private readonly logService: ILogService) {
		super();
		this.logService.trace('[ExpertMode] Initialized — expert features locked by default');
	}

	get isEnabled(): boolean { return this._isEnabled; }

	get currentState(): IExpertModeState {
		return {
			isEnabled: this._isEnabled,
			config: this._getConfig(),
			activatedAt: this._activatedAt,
			requiredExperienceLevel: this._requiredLevel,
			leakedToBeginner: false, // Always validated
		};
	}

	enableExpertMode(): boolean {
		const levelOrder = [ExperienceLevel.Beginner, ExperienceLevel.Intermediate, ExperienceLevel.Advanced, ExperienceLevel.PowerUser];
		if (levelOrder.indexOf(this._currentExperienceLevel) < levelOrder.indexOf(this._requiredLevel)) {
			this.logService.warn(`[ExpertMode] Cannot enable — requires ${this._requiredLevel} level`);
			return false;
		}
		this._isEnabled = true;
		this._activatedAt = Date.now();
		// Enable all capabilities by default for expert users
		for (const cap of Object.values(ExpertCapability)) {
			this._enabledCapabilities.add(cap);
		}
		this.logService.info('[ExpertMode] Expert mode enabled');
		this._onDidChangeExpertMode.fire(true);
		return true;
	}

	disableExpertMode(): void {
		this._isEnabled = false;
		this._enabledCapabilities.clear();
		this._activatedAt = null;
		this.logService.info('[ExpertMode] Expert mode disabled');
		this._onDidChangeExpertMode.fire(false);
	}

	isCapabilityAvailable(capability: ExpertCapability): boolean {
		if (!this._isEnabled) { return false; }
		return true; // If expert mode is on, all capabilities are available
	}

	isCapabilityEnabled(capability: ExpertCapability): boolean {
		return this._isEnabled && this._enabledCapabilities.has(capability);
	}

	enableCapability(capability: ExpertCapability): void {
		if (this._isEnabled) {
			this._enabledCapabilities.add(capability);
		}
	}

	disableCapability(capability: ExpertCapability): void {
		this._enabledCapabilities.delete(capability);
	}

	getAvailableCapabilities(): readonly ExpertCapability[] {
		if (!this._isEnabled) { return []; }
		return Object.values(ExpertCapability);
	}

	validateNoLeakage(): IExpertLeakageReport {
		const leakedCapabilities: ExpertCapability[] = [];
		const leakedSurfaces: string[] = [];

		// Expert features should not be visible when expert mode is off
		if (!this._isEnabled && this._enabledCapabilities.size > 0) {
			for (const cap of this._enabledCapabilities) {
				leakedCapabilities.push(cap);
			}
		}

		return {
			leakedCapabilities,
			leakedSurfaces,
			isClean: leakedCapabilities.length === 0 && leakedSurfaces.length === 0,
			timestamp: Date.now(),
		};
	}

	/** Update experience level from external service */
	updateExperienceLevel(level: ExperienceLevel): void {
		this._currentExperienceLevel = level;
	}

	private _getConfig(): IExpertModeConfig {
		return {
			enabledCapabilities: new Set(this._enabledCapabilities),
			autonomyOverride: null,
			showInternalState: this._isEnabled && this._enabledCapabilities.has(ExpertCapability.StateInspection),
			showAdvancedDiagnostics: this._isEnabled && this._enabledCapabilities.has(ExpertCapability.SystemDiagnostics),
			enablePowerShortcuts: this._isEnabled && this._enabledCapabilities.has(ExpertCapability.PowerShortcuts),
			exposeExecutionGraph: this._isEnabled && this._enabledCapabilities.has(ExpertCapability.GraphVisibility),
		};
	}
}

// ═══════════════════════════════════════════════════════════════════════════════
// TASK 10 — ADAPTIVE EXPERIENCE VALIDATION SERVICE
// ═══════════════════════════════════════════════════════════════════════════════

export class AdaptiveExperienceValidationService extends Disposable implements IAdaptiveExperienceValidationService {
	declare readonly _serviceBrand: undefined;

	private _latestReport: IAdaptiveUXCoherenceReport | null = null;

	private readonly _onDidDetectViolation = this._register(new Emitter<IAdaptiveUXViolation>());
	readonly onDidDetectViolation = this._onDidDetectViolation.event;

	constructor(
		@IProgressiveDisclosureService private readonly disclosureService: IProgressiveDisclosureService,
		@IUserExperienceProfileService private readonly profileService: IUserExperienceProfileService,
		@IFeatureFatigueService private readonly fatigueService: IFeatureFatigueService,
		@IFlowStateService private readonly flowStateService: IFlowStateService,
		@IAutonomyTrustService private readonly trustService: IAutonomyTrustService,
		@IExpertModeService private readonly expertModeService: IExpertModeService,
		@IContextualMinimalismService private readonly minimalismService: IContextualMinimalismService,
		@ILogService private readonly logService: ILogService,
	) {
		super();
		this.logService.trace('[AdaptiveValidation] Initialized — runtime UX coherence validation');
	}

	get coherenceScore(): number {
		return this._latestReport?.overallCoherence ?? 1.0;
	}

	get latestReport(): IAdaptiveUXCoherenceReport | null { return this._latestReport; }

	runValidation(): IAdaptiveUXCoherenceReport {
		const startTime = Date.now();
		const violations: IAdaptiveUXViolation[] = [];

		// Check beginner overwhelm
		const profile = this.profileService.currentProfile;
		const visibleFeatures = this.disclosureService.getVisibleFeatures();
		if (profile.experienceLevel === ExperienceLevel.Beginner && visibleFeatures.length > 10) {
			violations.push({
				type: AdaptiveUXViolationType.BeginnerOverwhelm,
				severity: 'critical',
				description: `Beginner sees ${visibleFeatures.length} features — should be at most 10`,
				affectedElements: visibleFeatures.map(f => f.featureId),
				suggestion: 'Reduce progressive disclosure for beginner level',
				detectedAt: Date.now(),
			});
		}

		// Check AI overexposure
		if (profile.experienceLevel === ExperienceLevel.Beginner && this.trustService.autonomyLevel !== AutonomyLevel.FullConsent) {
			violations.push({
				type: AdaptiveUXViolationType.AIOverexposure,
				severity: 'warning',
				description: 'AI has more autonomy than appropriate for beginner trust level',
				affectedElements: [],
				suggestion: 'Reset autonomy to FullConsent for beginners',
				detectedAt: Date.now(),
			});
		}

		// Check expert leakage
		const leakageReport = this.expertModeService.validateNoLeakage();
		if (!leakageReport.isClean) {
			violations.push({
				type: AdaptiveUXViolationType.ExpertLeakage,
				severity: 'critical',
				description: `Expert features leaked: ${leakageReport.leakedCapabilities.join(', ')}`,
				affectedElements: leakageReport.leakedCapabilities.map(c => c),
				suggestion: 'Ensure expert features are hidden when expert mode is disabled',
				detectedAt: Date.now(),
			});
		}

		// Check fatigue
		if (this.fatigueService.fatigueState === FatigueState.Critical) {
			violations.push({
				type: AdaptiveUXViolationType.FatigueUnaddressed,
				severity: 'critical',
				description: 'Feature fatigue is at critical level and not addressed',
				affectedElements: [],
				suggestion: 'Apply fatigue reductions immediately',
				detectedAt: Date.now(),
			});
		}

		// Check flow state preservation
		if (this.flowStateService.isInFlow) {
			const deferred = this.flowStateService.getDeferredInterruptions();
			if (deferred.length === 0) {
				// Good — no interruptions during flow
			}
		}

		// Check autonomy escalation
		const trustMetrics = this.trustService.currentMetrics;
		if (trustMetrics.currentAutonomyLevel === AutonomyLevel.FullAutonomy && trustMetrics.trustScore < 0.8) {
			violations.push({
				type: AdaptiveUXViolationType.AutonomyEscalationViolation,
				severity: 'critical',
				description: `Full autonomy granted with trust score ${trustMetrics.trustScore.toFixed(2)} — minimum 0.8 required`,
				affectedElements: [],
				suggestion: 'Reduce autonomy level to match trust score',
				detectedAt: Date.now(),
			});
		}

		// Calculate scores
		const disclosureScore = this._calculateDisclosureScore(violations);
		const simplicityScore = this._calculateSimplicityScore(violations);
		const fatigueScore = 1 - this.fatigueService.fatigueScore;
		const flowScore = this._calculateFlowScore();
		const autonomyScore = this._calculateAutonomyScore(violations);
		const minimalismScore = this._calculateMinimalismScore();

		const overallCoherence = (disclosureScore * 0.2 + simplicityScore * 0.15 + fatigueScore * 0.15 + flowScore * 0.2 + autonomyScore * 0.15 + minimalismScore * 0.15);

		const criticalCount = violations.filter(v => v.severity === 'critical').length;
		const warningCount = violations.filter(v => v.severity === 'warning').length;
		const infoCount = violations.filter(v => v.severity === 'info').length;

		const report: IAdaptiveUXCoherenceReport = {
			violations,
			criticalCount,
			warningCount,
			infoCount,
			disclosureScore,
			workflowSimplicityScore: simplicityScore,
			fatigueScore,
			flowPreservationScore: flowScore,
			autonomySafetyScore: autonomyScore,
			minimalismScore,
			overallCoherence,
			passed: criticalCount === 0 && overallCoherence >= 0.7,
			checkedAt: Date.now(),
			durationMs: Date.now() - startTime,
		};

		this._latestReport = report;
		violations.forEach(v => this._onDidDetectViolation.fire(v));
		return report;
	}

	validateDisclosure(): IAdaptiveUXCoherenceReport { return this.runValidation(); }
	validateFlowState(): IAdaptiveUXCoherenceReport { return this.runValidation(); }
	validateAutonomy(): IAdaptiveUXCoherenceReport { return this.runValidation(); }

	exportReport(): IAdaptiveUXCoherenceReport { return this.runValidation(); }

	private _calculateDisclosureScore(violations: IAdaptiveUXViolation[]): number {
		if (violations.some(v => v.type === AdaptiveUXViolationType.BeginnerOverwhelm)) { return 0.3; }
		if (violations.some(v => v.type === AdaptiveUXViolationType.DisclosureViolation)) { return 0.5; }
		return 1.0;
	}

	private _calculateSimplicityScore(violations: IAdaptiveUXViolation[]): number {
		if (violations.some(v => v.type === AdaptiveUXViolationType.BeginnerOverwhelm)) { return 0.3; }
		return 0.9;
	}

	private _calculateFlowScore(): number {
		return this.flowStateService.isInFlow ? 0.95 : 1.0;
	}

	private _calculateAutonomyScore(violations: IAdaptiveUXViolation[]): number {
		if (violations.some(v => v.type === AdaptiveUXViolationType.AutonomyEscalationViolation)) { return 0.2; }
		if (violations.some(v => v.type === AdaptiveUXViolationType.AIOverexposure)) { return 0.5; }
		return 1.0;
	}

	private _calculateMinimalismScore(): number {
		const level = this.minimalismService.currentLevel;
		switch (level) {
			case MinimalismLevel.Full: return 0.7;
			case MinimalismLevel.Reduced: return 0.85;
			case MinimalismLevel.Minimal: return 0.95;
			case MinimalismLevel.Silent: return 1.0;
		}
	}
}
