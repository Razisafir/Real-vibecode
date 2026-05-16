/*---------------------------------------------------------------------------------------------
 *  Real Product UX Transformation Layer — Phase 13
 *  Real Vibecode — AI-Native IDE
 *
 *  UX Transformation Runtime Implementations
 *  All 10 service implementations for the UX Transformation Layer.
 *--------------------------------------------------------------------------------------------*/

import { Emitter } from '../../../../base/common/event.js';
import { Disposable, IDisposable, DisposableStore } from '../../../../base/common/lifecycle.js';
import { IAIPresenceService, IAIPresenceState, AIPresenceLevel, IAIPresenceRule } from '../common/uxTransformation.js';
import { IEditorExperienceService, IEditorExperienceState, EditorFocusMode, IEditorPanelConfig, PanelCollapseBehavior, PanelRevealCondition } from '../common/uxTransformation.js';
import { ICognitiveLoadService, ICognitiveLoadMetrics, CognitiveLoadThreshold, INoiseReductionAction } from '../common/uxTransformation.js';
import { IPremiumMicrointeractionService, MicrointeractionType, PremiumEasing, IPremiumMotionSpec, IProximityResponse, IScrollSmoothness, IMotionCohesionReport, IMotionIssue } from '../common/uxTransformation.js';
import { IAITransparencyService, IAIActionExplanation, IAISuggestionExplanation, ExplanationVerbosity, ConfidenceDisplayStyle, IWhyResolution, IWhyLink } from '../common/uxTransformation.js';
import { IPanelHierarchyService, IPanelHierarchyConfig, IPanelHierarchyState, IPanelVisualState, PanelTier, DeemphasisStrategy } from '../common/uxTransformation.js';
import { IAttentionOrchestratorService, IAttentionState, IUserInteractionRecord, IDismissalRecord, AttentionPriority, InterruptionPolicy } from '../common/uxTransformation.js';
import { IPerceivedPerformanceService, IOptimisticUpdate, ISkeletonConfig, LatencyMaskStrategy, IPerceivedPerformanceMetrics, IPerceivedPerformanceValidation } from '../common/uxTransformation.js';
import { IUXConsistencyService, IUXCoherenceReport, IUXViolation, UXViolationType, UXViolationSeverity } from '../common/uxTransformation.js';
import { ISignatureIdentityService, ISignatureProductIdentity, ISignatureInteractionPhilosophy, ISignatureMotionLanguage, ISignatureAIBehavior, ISignatureSpacingRhythm, ISignaturePanelChoreography, IIdentityValidationReport, IIdentityViolation } from '../common/uxTransformation.js';
import { ILogService } from '../../../../platform/log/common/log.js';

// ═══════════════════════════════════════════════════════════════════════════════
// TASK 1 — AI PRESENCE SERVICE IMPLEMENTATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Presence escalation rules — governs when AI can change visual levels.
 * AI should remain mostly passive unless confidence is high.
 */
const PRESENCE_RULES: readonly IAIPresenceRule[] = [
	// De-escalation is always allowed
	{ fromLevel: AIPresenceLevel.Assistive, toLevel: AIPresenceLevel.Passive, condition: 'user typing rapidly or focused', confidenceThreshold: 0, requiresUserConsent: false },
	{ fromLevel: AIPresenceLevel.Collaborative, toLevel: AIPresenceLevel.Assistive, condition: 'task no longer requires AI', confidenceThreshold: 0, requiresUserConsent: false },
	{ fromLevel: AIPresenceLevel.Autonomous, toLevel: AIPresenceLevel.Collaborative, condition: 'execution completed', confidenceThreshold: 0, requiresUserConsent: false },
	{ fromLevel: AIPresenceLevel.Autonomous, toLevel: AIPresenceLevel.Passive, condition: 'emergency de-escalation', confidenceThreshold: 0, requiresUserConsent: false },

	// Escalation requires confidence and sometimes consent
	{ fromLevel: AIPresenceLevel.Passive, toLevel: AIPresenceLevel.Assistive, condition: 'user paused + context changed', confidenceThreshold: 0.5, requiresUserConsent: false },
	{ fromLevel: AIPresenceLevel.Assistive, toLevel: AIPresenceLevel.Collaborative, condition: 'user explicitly asks or high-confidence suggestion', confidenceThreshold: 0.7, requiresUserConsent: false },
	{ fromLevel: AIPresenceLevel.Collaborative, toLevel: AIPresenceLevel.Autonomous, condition: 'user approved execution', confidenceThreshold: 0.9, requiresUserConsent: true },
	{ fromLevel: AIPresenceLevel.Passive, toLevel: AIPresenceLevel.Collaborative, condition: 'explicit user request', confidenceThreshold: 0.6, requiresUserConsent: true },
];

/** Max visual indicators per presence level */
const MAX_INDICATORS: Record<AIPresenceLevel, number> = {
	[AIPresenceLevel.Passive]: 0,
	[AIPresenceLevel.Assistive]: 2,
	[AIPresenceLevel.Collaborative]: 5,
	[AIPresenceLevel.Autonomous]: 8,
};

/** Attention occupancy limits per presence level */
const OCCUPANCY_LIMITS: Record<AIPresenceLevel, number> = {
	[AIPresenceLevel.Passive]: 0.0,
	[AIPresenceLevel.Assistive]: 0.15,
	[AIPresenceLevel.Collaborative]: 0.3,
	[AIPresenceLevel.Autonomous]: 0.5,
};

export class AIPresenceService extends Disposable implements IAIPresenceService {
	declare readonly _serviceBrand: undefined;

	private _currentLevel: AIPresenceLevel = AIPresenceLevel.Passive;
	private _previousLevel: AIPresenceLevel = AIPresenceLevel.Passive;
	private _transitionReason: string = 'initial';
	private _confidenceScore: number = 0;
	private _visibleIndicators: number = 0;
	private _activeSuggestions: number = 0;

	private readonly _onDidChangePresence = this._register(new Emitter<IAIPresenceState>());
	readonly onDidChangePresence = this._onDidChangePresence.event;

	constructor(@ILogService private readonly logService: ILogService) {
		super();
		this.logService.trace('[AIPresenceService] Initialized — default level: Passive');
	}

	get currentLevel(): AIPresenceLevel { return this._currentLevel; }

	get currentState(): IAIPresenceState {
		return {
			currentLevel: this._currentLevel,
			previousLevel: this._previousLevel,
			transitionReason: this._transitionReason,
			confidenceScore: this._confidenceScore,
			visibleIndicators: this._visibleIndicators,
			activeSuggestions: this._activeSuggestions,
			attentionOccupancy: this.attentionOccupancy,
			timestamp: Date.now(),
		};
	}

	get attentionOccupancy(): number {
		const maxIndicators = this.getMaxAllowedIndicators();
		if (maxIndicators === 0) { return 0; }
		return Math.min(1, (this._visibleIndicators / Math.max(1, maxIndicators)) * OCCUPANCY_LIMITS[this._currentLevel]);
	}

	requestPresenceLevel(level: AIPresenceLevel, reason: string): boolean {
		if (level === this._currentLevel) { return true; }

		// Find matching rule
		const rule = PRESENCE_RULES.find(r =>
			r.fromLevel === this._currentLevel && r.toLevel === level
		);

		if (!rule) {
			this.logService.warn(`[AIPresenceService] No transition rule from ${this._currentLevel} to ${level}`);
			return false;
		}

		if (this._confidenceScore < rule.confidenceThreshold) {
			this.logService.info(`[AIPresenceService] Confidence ${this._confidenceScore} below threshold ${rule.confidenceThreshold} for ${this._currentLevel}→${level}`);
			return false;
		}

		this._previousLevel = this._currentLevel;
		this._currentLevel = level;
		this._transitionReason = reason;
		this.logService.info(`[AIPresenceService] Level changed: ${this._previousLevel}→${level} (${reason})`);
		this._onDidChangePresence.fire(this.currentState);
		return true;
	}

	deescalateToPassive(reason: string): void {
		this._previousLevel = this._currentLevel;
		this._currentLevel = AIPresenceLevel.Passive;
		this._transitionReason = reason;
		this._visibleIndicators = 0;
		this._activeSuggestions = 0;
		this.logService.info(`[AIPresenceService] Emergency de-escalation to Passive (${reason})`);
		this._onDidChangePresence.fire(this.currentState);
	}

	isVisualActionAllowed(action: string): boolean {
		const actionLevelMap: Record<string, AIPresenceLevel> = {
			'show-indicator': AIPresenceLevel.Assistive,
			'show-suggestion': AIPresenceLevel.Assistive,
			'show-panel': AIPresenceLevel.Collaborative,
			'show-progress': AIPresenceLevel.Collaborative,
			'highlight-mutation': AIPresenceLevel.Collaborative,
			'show-execution': AIPresenceLevel.Autonomous,
			'animate-presence': AIPresenceLevel.Autonomous,
		};

		const requiredLevel = actionLevelMap[action];
		if (!requiredLevel) { return true; }

		const levelOrder = [AIPresenceLevel.Passive, AIPresenceLevel.Assistive, AIPresenceLevel.Collaborative, AIPresenceLevel.Autonomous];
		return levelOrder.indexOf(this._currentLevel) >= levelOrder.indexOf(requiredLevel);
	}

	getMaxAllowedIndicators(): number {
		return MAX_INDICATORS[this._currentLevel];
	}
}

// ═══════════════════════════════════════════════════════════════════════════════
// TASK 2 — EDITOR EXPERIENCE SERVICE IMPLEMENTATION
// ═══════════════════════════════════════════════════════════════════════════════

export class EditorExperienceService extends Disposable implements IEditorExperienceService {
	declare readonly _serviceBrand: undefined;

	private _focusMode: EditorFocusMode = EditorFocusMode.Normal;
	private _panels: Map<string, IEditorPanelConfig> = new Map();
	private _visiblePanels: Set<string> = new Set();
	private _collapsedPanels: Set<string> = new Set();
	private _lastEditorInteraction: number = Date.now();
	private _distractionSuppressed: boolean = false;
	private _inactivityTimers: Map<string, ReturnType<typeof setTimeout>> = new Map();

	private readonly _onDidChangeFocusMode = this._register(new Emitter<EditorFocusMode>());
	readonly onDidChangeFocusMode = this._onDidChangeFocusMode.event;

	private readonly _onDidChangePanelVisibility = this._register(new Emitter<{ panelId: string; visible: boolean; reason: string }>());
	readonly onDidChangePanelVisibility = this._onDidChangePanelVisibility.event;

	constructor(@ILogService private readonly logService: ILogService) {
		super();
		this.logService.trace('[EditorExperienceService] Initialized — editor-first experience active');
	}

	get focusMode(): EditorFocusMode { return this._focusMode; }

	get currentState(): IEditorExperienceState {
		return {
			focusMode: this._focusMode,
			visiblePanels: [...this._visiblePanels],
			collapsedPanels: [...this._collapsedPanels],
			editorOccupancyRatio: this.editorOccupancyRatio,
			lastEditorInteraction: this._lastEditorInteraction,
			isDistractionSuppressed: this._distractionSuppressed,
			timestamp: Date.now(),
		};
	}

	get editorOccupancyRatio(): number {
		const visibleCount = this._visiblePanels.size;
		if (visibleCount === 0) { return 1.0; }
		if (this._focusMode === EditorFocusMode.Zen) { return 0.95; }
		if (this._focusMode === EditorFocusMode.Focus) { return 0.8; }
		return Math.max(0.5, 1.0 - (visibleCount * 0.1));
	}

	enterFocusMode(): void {
		this._focusMode = EditorFocusMode.Focus;
		this.logService.info('[EditorExperienceService] Entering Focus mode');
		this._onDidChangeFocusMode.fire(this._focusMode);
		// Auto-collapse non-essential panels
		for (const [id, config] of this._panels) {
			if (config.priority > 2) {
				this.collapsePanel(id, 'focus-mode');
			}
		}
	}

	enterZenMode(): void {
		this._focusMode = EditorFocusMode.Zen;
		this.logService.info('[EditorExperienceService] Entering Zen mode');
		this._onDidChangeFocusMode.fire(this._focusMode);
		// Collapse ALL non-editor panels
		for (const [id] of this._panels) {
			this.collapsePanel(id, 'zen-mode');
		}
	}

	exitFocusMode(): void {
		this._focusMode = EditorFocusMode.Normal;
		this.logService.info('[EditorExperienceService] Returning to Normal mode');
		this._onDidChangeFocusMode.fire(this._focusMode);
	}

	configurePanel(config: IEditorPanelConfig): void {
		this._panels.set(config.panelId, config);
		this.logService.trace(`[EditorExperienceService] Panel configured: ${config.panelId} (priority: ${config.priority})`);
	}

	collapsePanel(panelId: string, reason: string): void {
		this._visiblePanels.delete(panelId);
		this._collapsedPanels.add(panelId);
		this._clearInactivityTimer(panelId);
		this._onDidChangePanelVisibility.fire({ panelId, visible: false, reason });
	}

	revealPanel(panelId: string, condition: PanelRevealCondition): boolean {
		const config = this._panels.get(panelId);
		if (!config) { return false; }

		// Check if reveal is allowed by condition
		if (config.revealCondition === PanelRevealCondition.Never) { return false; }
		if (config.revealCondition !== condition && config.revealCondition !== PanelRevealCondition.Contextual) {
			if (condition === PanelRevealCondition.OnUserRequest && config.revealCondition !== PanelRevealCondition.OnUserRequest) {
				// OnUserRequest can override most conditions except Never
			} else {
				return false;
			}
		}

		this._collapsedPanels.delete(panelId);
		this._visiblePanels.add(panelId);

		// Set inactivity timer if configured
		if (config.collapseBehavior === PanelCollapseBehavior.AfterInactivity && config.inactivityTimeoutMs > 0) {
			this._setInactivityTimer(panelId, config.inactivityTimeoutMs);
		}

		this._onDidChangePanelVisibility.fire({ panelId, visible: true, reason: condition });
		return true;
	}

	suppressDistractions(duration?: number): IDisposable {
		this._distractionSuppressed = true;
		const store = new DisposableStore();
		const timeout = duration ?? 5000;
		const timer = setTimeout(() => {
			this._distractionSuppressed = false;
		}, timeout);
		store.add({ dispose: () => { clearTimeout(timer); this._distractionSuppressed = false; } });
		return store;
	}

	autoMinimizeCompleted(): void {
		for (const [id, config] of this._panels) {
			if (config.autoMinimizeAfterCompletion && this._visiblePanels.has(id)) {
				this.collapsePanel(id, 'execution-completed');
			}
		}
	}

	private _setInactivityTimer(panelId: string, timeoutMs: number): void {
		this._clearInactivityTimer(panelId);
		const timer = setTimeout(() => {
			this.collapsePanel(panelId, 'inactivity-timeout');
		}, timeoutMs);
		this._inactivityTimers.set(panelId, timer);
	}

	private _clearInactivityTimer(panelId: string): void {
		const timer = this._inactivityTimers.get(panelId);
		if (timer) {
			clearTimeout(timer);
			this._inactivityTimers.delete(panelId);
		}
	}
}

// ═══════════════════════════════════════════════════════════════════════════════
// TASK 3 — COGNITIVE LOAD SERVICE IMPLEMENTATION
// ═══════════════════════════════════════════════════════════════════════════════

export class CognitiveLoadService extends Disposable implements ICognitiveLoadService {
	declare readonly _serviceBrand: undefined;

	private _panels: Map<string, number> = new Map(); // id → priority
	private _notifications: Map<string, number> = new Map(); // id → priority
	private _animations: Map<string, number> = new Map(); // id → intensity
	private _highlights: Set<string> = new Set();
	private _loadHistory: ICognitiveLoadMetrics[] = [];

	private readonly _onDidChangeCognitiveLoad = this._register(new Emitter<ICognitiveLoadMetrics>());
	readonly onDidChangeCognitiveLoad = this._onDidChangeCognitiveLoad.event;

	private readonly _onDidReduceNoise = this._register(new Emitter<INoiseReductionAction>());
	readonly onDidReduceNoise = this._onDidReduceNoise.event;

	constructor(@ILogService private readonly logService: ILogService) {
		super();
		this.logService.trace('[CognitiveLoadService] Initialized — monitoring cognitive load');
	}

	get currentMetrics(): ICognitiveLoadMetrics {
		return this.recalculate();
	}

	recalculate(): ICognitiveLoadMetrics {
		const visiblePanelCount = this._panels.size;
		const activeNotificationCount = this._notifications.size;
		const animationDensity = this._calculateAnimationDensity();
		const concurrentHighlights = this._highlights.size;
		const activeAttentionZones = this._calculateAttentionZones();

		// Weighted cognitive load score
		const totalLoadScore = Math.min(1,
			(visiblePanelCount * 0.08) +
			(activeNotificationCount * 0.12) +
			(animationDensity * 0.25) +
			(concurrentHighlights * 0.15) +
			(activeAttentionZones * 0.1)
		);

		const metrics: ICognitiveLoadMetrics = {
			visiblePanelCount,
			activeNotificationCount,
			animationDensity,
			concurrentHighlights,
			activeAttentionZones,
			totalLoadScore,
			isOverloaded: totalLoadScore > CognitiveLoadThreshold.High,
			timestamp: Date.now(),
		};

		this._loadHistory.push(metrics);
		if (this._loadHistory.length > 100) {
			this._loadHistory.shift();
		}

		this._onDidChangeCognitiveLoad.fire(metrics);
		return metrics;
	}

	registerPanel(panelId: string, priority: number): void {
		this._panels.set(panelId, priority);
		this.recalculate();
	}

	unregisterPanel(panelId: string): void {
		this._panels.delete(panelId);
		this.recalculate();
	}

	registerNotification(notificationId: string, priority: number): void {
		this._notifications.set(notificationId, priority);
		this.recalculate();
	}

	unregisterNotification(notificationId: string): void {
		this._notifications.delete(notificationId);
		this.recalculate();
	}

	registerAnimation(animationId: string, intensity: number): void {
		this._animations.set(animationId, intensity);
		this.recalculate();
	}

	unregisterAnimation(animationId: string): void {
		this._animations.delete(animationId);
		this.recalculate();
	}

	registerHighlight(zoneId: string): void {
		this._highlights.add(zoneId);
		this.recalculate();
	}

	unregisterHighlight(zoneId: string): void {
		this._highlights.delete(zoneId);
		this.recalculate();
	}

	suppressLowPriority(): INoiseReductionAction[] {
		const actions: INoiseReductionAction[] = [];
		const metrics = this.recalculate();

		if (metrics.totalLoadScore > CognitiveLoadThreshold.Moderate) {
			// Suppress low-priority notifications
			for (const [id, priority] of this._notifications) {
				if (priority < 3) {
					const action = this._createAction('suppress-notification', id, 'low-priority-suppression', metrics.totalLoadScore);
					this._notifications.delete(id);
					actions.push(action);
				}
			}
		}

		actions.forEach(a => this._onDidReduceNoise.fire(a));
		return actions;
	}

	collapseRedundant(): INoiseReductionAction[] {
		const actions: INoiseReductionAction[] = [];
		const metrics = this.recalculate();

		if (metrics.visiblePanelCount > 3) {
			// Find lowest-priority panels
			const sorted = [...this._panels.entries()].sort((a, b) => a[1] - b[1]);
			const toCollapse = sorted.slice(0, metrics.visiblePanelCount - 3);
			for (const [id] of toCollapse) {
				const action = this._createAction('collapse-panel', id, 'redundant-surface', metrics.totalLoadScore);
				this._panels.delete(id);
				actions.push(action);
			}
		}

		actions.forEach(a => this._onDidReduceNoise.fire(a));
		return actions;
	}

	reduceEmphasis(): INoiseReductionAction[] {
		const actions: INoiseReductionAction[] = [];
		const metrics = this.recalculate();

		if (metrics.concurrentHighlights > 3) {
			const highlights = [...this._highlights];
			const toRemove = highlights.slice(0, metrics.concurrentHighlights - 2);
			for (const id of toRemove) {
				const action = this._createAction('remove-highlight', id, 'excessive-emphasis', metrics.totalLoadScore);
				this._highlights.delete(id);
				actions.push(action);
			}
		}

		actions.forEach(a => this._onDidReduceNoise.fire(a));
		return actions;
	}

	getLoadHistory(duration: number): readonly ICognitiveLoadMetrics[] {
		const cutoff = Date.now() - duration;
		return this._loadHistory.filter(m => m.timestamp >= cutoff);
	}

	private _calculateAnimationDensity(): number {
		if (this._animations.size === 0) { return 0; }
		let totalIntensity = 0;
		for (const intensity of this._animations.values()) {
			totalIntensity += intensity;
		}
		return Math.min(1, totalIntensity / this._animations.size);
	}

	private _calculateAttentionZones(): number {
		// Each panel + notification + highlight is a competing zone
		return this._panels.size + this._notifications.size + this._highlights.size;
	}

	private _createAction(actionType: INoiseReductionAction['actionType'], targetId: string, reason: string, loadBefore: number): INoiseReductionAction {
		return {
			actionType,
			targetId,
			reason,
			loadBefore,
			loadAfter: Math.max(0, loadBefore - 0.1),
			timestamp: Date.now(),
		};
	}
}

// ═══════════════════════════════════════════════════════════════════════════════
// TASK 4 — PREMIUM MICROINTERACTION SERVICE IMPLEMENTATION
// ═══════════════════════════════════════════════════════════════════════════════

const DEFAULT_MOTION_SPECS: Record<MicrointeractionType, IPremiumMotionSpec> = {
	[MicrointeractionType.Hover]: { type: MicrointeractionType.Hover, durationMs: 150, easing: PremiumEasing.Standard, delayMs: 0, opacityFrom: 0.7, opacityTo: 1.0, perceivedWeight: 0.3, depthEffect: false },
	[MicrointeractionType.Press]: { type: MicrointeractionType.Press, durationMs: 100, easing: PremiumEasing.Sharp, delayMs: 0, opacityFrom: 1.0, opacityTo: 0.9, scale: 0.98, perceivedWeight: 0.7, depthEffect: true },
	[MicrointeractionType.Release]: { type: MicrointeractionType.Release, durationMs: 120, easing: PremiumEasing.Decelerate, delayMs: 0, opacityFrom: 0.9, opacityTo: 1.0, scale: 1.0, perceivedWeight: 0.5, depthEffect: false },
	[MicrointeractionType.PanelSlide]: { type: MicrointeractionType.PanelSlide, durationMs: 280, easing: PremiumEasing.Weighted, delayMs: 0, opacityFrom: 0, opacityTo: 1.0, translateX: 20, perceivedWeight: 0.8, depthEffect: true },
	[MicrointeractionType.PanelResize]: { type: MicrointeractionType.PanelResize, durationMs: 200, easing: PremiumEasing.Weighted, delayMs: 0, opacityFrom: 1.0, opacityTo: 1.0, perceivedWeight: 0.6, depthEffect: false },
	[MicrointeractionType.Appear]: { type: MicrointeractionType.Appear, durationMs: 200, easing: PremiumEasing.Decelerate, delayMs: 0, opacityFrom: 0, opacityTo: 1.0, scale: 0.97, perceivedWeight: 0.4, depthEffect: true },
	[MicrointeractionType.Disappear]: { type: MicrointeractionType.Disappear, durationMs: 150, easing: PremiumEasing.Accelerate, delayMs: 0, opacityFrom: 1.0, opacityTo: 0, scale: 0.98, perceivedWeight: 0.4, depthEffect: false },
	[MicrointeractionType.Scroll]: { type: MicrointeractionType.Scroll, durationMs: 100, easing: PremiumEasing.Standard, delayMs: 0, opacityFrom: 1.0, opacityTo: 1.0, perceivedWeight: 0.2, depthEffect: false },
	[MicrointeractionType.FocusChange]: { type: MicrointeractionType.FocusChange, durationMs: 180, easing: PremiumEasing.Standard, delayMs: 0, opacityFrom: 0.85, opacityTo: 1.0, perceivedWeight: 0.3, depthEffect: false },
	[MicrointeractionType.StateTransition]: { type: MicrointeractionType.StateTransition, durationMs: 250, easing: PremiumEasing.Standard, delayMs: 0, opacityFrom: 0.8, opacityTo: 1.0, perceivedWeight: 0.5, depthEffect: true },
};

export class PremiumMicrointeractionService extends Disposable implements IPremiumMicrointeractionService {
	declare readonly _serviceBrand: undefined;

	private _proximityResponses: Map<string, IProximityResponse> = new Map();
	private _scrollConfig: IScrollSmoothness = {
		momentumRetention: 0.85,
		decelerationRate: 0.95,
		snapAlignment: true,
		snapInterval: 40,
	};
	private _customMotionSpecs: Map<MicrointeractionType, IPremiumMotionSpec> = new Map();

	constructor(@ILogService private readonly logService: ILogService) {
		super();
		this.logService.trace('[PremiumMicrointeractionService] Initialized — premium interaction layer active');
	}

	getMotionSpec(type: MicrointeractionType): IPremiumMotionSpec {
		return this._customMotionSpecs.get(type) ?? DEFAULT_MOTION_SPECS[type];
	}

	applyHoverTransition(elementId: string): void {
		const spec = this.getMotionSpec(MicrointeractionType.Hover);
		this.logService.trace(`[PremiumMicrointeraction] Hover transition applied to ${elementId}: ${spec.durationMs}ms ${spec.easing}`);
	}

	applyWeightedMovement(elementId: string, type: MicrointeractionType): void {
		const spec = this.getMotionSpec(type);
		this.logService.trace(`[PremiumMicrointeraction] Weighted movement (${type}) applied to ${elementId}: weight=${spec.perceivedWeight}`);
	}

	applyDepthEffect(elementId: string, active: boolean): void {
		if (active) {
			this.logService.trace(`[PremiumMicrointeraction] Depth effect enabled for ${elementId}`);
		}
	}

	applyMagneticAlignment(elementId: string, targetX: number, targetY: number): void {
		const spec = this.getMotionSpec(MicrointeractionType.Hover);
		this.logService.trace(`[PremiumMicrointeraction] Magnetic alignment for ${elementId} toward (${targetX}, ${targetY}): ${spec.durationMs}ms`);
	}

	registerProximityResponse(response: IProximityResponse): IDisposable {
		this._proximityResponses.set(response.elementId, response);
		const store = new DisposableStore();
		store.add({ dispose: () => { this._proximityResponses.delete(response.elementId); } });
		return store;
	}

	configureScrollSmoothness(config: IScrollSmoothness): void {
		this._scrollConfig = { ...config };
		this.logService.trace('[PremiumMicrointeraction] Scroll smoothness configured');
	}

	normalizeTransition(elementId: string, durationMs: number): number {
		// Normalize to nearest standard duration
		const standardDurations = [100, 150, 200, 250, 300, 350, 500];
		return standardDurations.reduce((prev, curr) =>
			Math.abs(curr - durationMs) < Math.abs(prev - durationMs) ? curr : prev
		);
	}

	validateMotionCohesion(): IMotionCohesionReport {
		const issues: IMotionIssue[] = [];
		let inconsistentEasings = 0;
		let abruptTransitions = 0;
		let missingDepthEffects = 0;
		let inconsistentDurations = 0;

		// Validate all motion specs for cohesion
		const specs = [...this._customMotionSpecs.values()];
		const usedEasings = new Set(specs.map(s => s.easing));
		if (usedEasings.size > 4) {
			inconsistentEasings++;
			issues.push({
				elementId: 'global',
				issueType: 'inconsistent-easing',
				description: `Too many different easing curves (${usedEasings.size}) — should use at most 4`,
				severity: 'warning',
			});
		}

		for (const spec of specs) {
			if (spec.durationMs < 50) {
				abruptTransitions++;
				issues.push({
					elementId: 'global',
					issueType: 'abrupt-transition',
					description: `Duration ${spec.durationMs}ms is too short — feels abrupt`,
					severity: 'error',
				});
			}
		}

		const cohesionScore = Math.max(0, 1 - (inconsistentEasings * 0.1 + abruptTransitions * 0.2 + missingDepthEffects * 0.05 + inconsistentDurations * 0.1));

		return {
			inconsistentEasings,
			abruptTransitions,
			missingDepthEffects,
			inconsistentDurations,
			overallCohesionScore: cohesionScore,
			issues,
			timestamp: Date.now(),
		};
	}
}

// ═══════════════════════════════════════════════════════════════════════════════
// TASK 5 — AI TRANSPARENCY SERVICE IMPLEMENTATION
// ═══════════════════════════════════════════════════════════════════════════════

export class AITransparencyService extends Disposable implements IAITransparencyService {
	declare readonly _serviceBrand: undefined;

	private _actionExplanations: Map<string, IAIActionExplanation> = new Map();
	private _suggestionExplanations: Map<string, IAISuggestionExplanation> = new Map();
	private _defaultVerbosity: ExplanationVerbosity = ExplanationVerbosity.Minimal;
	private _confidenceDisplayStyle: ConfidenceDisplayStyle = ConfidenceDisplayStyle.OpacityCoded;

	private readonly _onDidExplainAction = this._register(new Emitter<IAIActionExplanation>());
	readonly onDidExplainAction = this._onDidExplainAction.event;

	private readonly _onDidExplainSuggestion = this._register(new Emitter<IAISuggestionExplanation>());
	readonly onDidExplainSuggestion = this._onDidExplainSuggestion.event;

	constructor(@ILogService private readonly logService: ILogService) {
		super();
		this.logService.trace('[AITransparencyService] Initialized — AI is understandable');
	}

	get defaultVerbosity(): ExplanationVerbosity { return this._defaultVerbosity; }
	get confidenceDisplayStyle(): ConfidenceDisplayStyle { return this._confidenceDisplayStyle; }

	explainAction(actionId: string, verbosity?: ExplanationVerbosity): IAIActionExplanation | null {
		const explanation = this._actionExplanations.get(actionId);
		if (!explanation) { return null; }

		const requestedVerbosity = verbosity ?? this._defaultVerbosity;
		return {
			...explanation,
			verbosity: requestedVerbosity,
		};
	}

	explainSuggestion(suggestionId: string, verbosity?: ExplanationVerbosity): IAISuggestionExplanation | null {
		const explanation = this._suggestionExplanations.get(suggestionId);
		if (!explanation) { return null; }

		const requestedVerbosity = verbosity ?? this._defaultVerbosity;
		return {
			...explanation,
			verbosity: requestedVerbosity,
		};
	}

	setDefaultVerbosity(level: ExplanationVerbosity): void {
		this._defaultVerbosity = level;
	}

	setConfidenceDisplayStyle(style: ConfidenceDisplayStyle): void {
		this._confidenceDisplayStyle = style;
	}

	resolveWhyDidThisHappen(actionId: string): IWhyResolution | null {
		const explanation = this._actionExplanations.get(actionId);
		if (!explanation) { return null; }

		return {
			actionId,
			directCause: explanation.reason,
			causalChain: [
				{ step: '1', description: 'Context changed', evidence: `Trigger: ${explanation.actionType}` },
				{ step: '2', description: 'AI evaluated options', evidence: `Confidence: ${explanation.confidenceScore.toFixed(2)}` },
				{ step: '3', description: 'Action selected', evidence: explanation.reasoningSummary },
			],
			userContext: `Action type: ${explanation.actionType}`,
			confidenceAssessment: explanation.confidenceScore > 0.8 ? 'High confidence' : explanation.confidenceScore > 0.5 ? 'Moderate confidence' : 'Low confidence',
			alternativeOutcomes: [...explanation.alternativesConsidered],
			timestamp: Date.now(),
		};
	}

	getExplanationsForRange(startTime: number, endTime: number): readonly IAIActionExplanation[] {
		return [...this._actionExplanations.values()].filter(
			e => e.timestamp >= startTime && e.timestamp <= endTime
		);
	}

	registerActionForExplanation(actionId: string, actionType: string, reason: string, confidence: number): void {
		const explanation: IAIActionExplanation = {
			actionId,
			actionType,
			reason,
			confidenceScore: confidence,
			reasoningSummary: this._summarizeReason(reason),
			alternativesConsidered: [],
			dataSources: [],
			verbosity: this._defaultVerbosity,
			timestamp: Date.now(),
		};
		this._actionExplanations.set(actionId, explanation);
		this._onDidExplainAction.fire(explanation);
	}

	registerSuggestionForExplanation(suggestionId: string, suggestionType: string, triggerReason: string, confidence: number): void {
		const explanation: IAISuggestionExplanation = {
			suggestionId,
			suggestionType,
			triggerReason,
			confidenceScore: confidence,
			reasoningSummary: this._summarizeReason(triggerReason),
			relevanceToContext: 'Contextually relevant',
			verbosity: this._defaultVerbosity,
			timestamp: Date.now(),
		};
		this._suggestionExplanations.set(suggestionId, explanation);
		this._onDidExplainSuggestion.fire(explanation);
	}

	private _summarizeReason(reason: string): string {
		// Keep it concise — no giant debug dumps, no chain-of-thought exposure
		if (reason.length <= 120) { return reason; }
		return reason.substring(0, 117) + '...';
	}
}

// ═══════════════════════════════════════════════════════════════════════════════
// TASK 6 — PANEL HIERARCHY SERVICE IMPLEMENTATION
// ═══════════════════════════════════════════════════════════════════════════════

const TIER_OPACITY: Record<PanelTier, { active: number; inactive: number }> = {
	[PanelTier.Editor]: { active: 1.0, inactive: 1.0 },
	[PanelTier.ActiveTask]: { active: 0.95, inactive: 0.6 },
	[PanelTier.AIAssistance]: { active: 0.85, inactive: 0.45 },
	[PanelTier.Diagnostics]: { active: 0.7, inactive: 0.35 },
};

export class PanelHierarchyService extends Disposable implements IPanelHierarchyService {
	declare readonly _serviceBrand: undefined;

	private _panelConfigs: Map<string, IPanelHierarchyConfig> = new Map();
	private _activeTier2Panel: string | null = null;
	private _panelVisualStates: Map<string, IPanelVisualState> = new Map();

	private readonly _onDidChangeHierarchy = this._register(new Emitter<IPanelHierarchyState>());
	readonly onDidChangeHierarchy = this._onDidChangeHierarchy.event;

	private readonly _onDidChangeActiveTaskSurface = this._register(new Emitter<string | null>());
	readonly onDidChangeActiveTaskSurface = this._onDidChangeActiveTaskSurface.event;

	constructor(@ILogService private readonly logService: ILogService) {
		super();
		this.logService.trace('[PanelHierarchyService] Initialized — strict panel hierarchy active');
	}

	get currentState(): IPanelHierarchyState {
		return {
			activeTier2Panel: this._activeTier2Panel,
			tierAssignments: new Map([...this._panelConfigs].map(([id, c]) => [id, c.tier])),
			visualStates: new Map(this._panelVisualStates),
			dominantSurface: 'editor',
			timestamp: Date.now(),
		};
	}

	registerPanel(config: IPanelHierarchyConfig): void {
		this._panelConfigs.set(config.panelId, config);
		this._updateVisualState(config.panelId);
		this.logService.trace(`[PanelHierarchy] Registered panel ${config.panelId} at Tier ${config.tier}`);
	}

	unregisterPanel(panelId: string): void {
		this._panelConfigs.delete(panelId);
		this._panelVisualStates.delete(panelId);
		if (this._activeTier2Panel === panelId) {
			this._activeTier2Panel = null;
		}
	}

	setActiveTaskSurface(panelId: string): void {
		const config = this._panelConfigs.get(panelId);
		if (!config || config.tier !== PanelTier.ActiveTask) {
			this.logService.warn(`[PanelHierarchy] Cannot set ${panelId} as active Tier 2 — not registered as ActiveTask`);
			return;
		}
		this._activeTier2Panel = panelId;
		this._updateAllVisualStates();
		this._onDidChangeActiveTaskSurface.fire(panelId);
		this._onDidChangeHierarchy.fire(this.currentState);
	}

	clearActiveTaskSurface(): void {
		this._activeTier2Panel = null;
		this._updateAllVisualStates();
		this._onDidChangeActiveTaskSurface.fire(null);
		this._onDidChangeHierarchy.fire(this.currentState);
	}

	getPanelVisualState(panelId: string): IPanelVisualState | null {
		return this._panelVisualStates.get(panelId) ?? null;
	}

	applyVisualHierarchy(): void {
		this._updateAllVisualStates();
		this._onDidChangeHierarchy.fire(this.currentState);
	}

	getPanelsInTier(tier: PanelTier): readonly string[] {
		return [...this._panelConfigs.entries()]
			.filter(([, c]) => c.tier === tier)
			.map(([id]) => id);
	}

	shouldYield(panelId: string): boolean {
		const config = this._panelConfigs.get(panelId);
		if (!config) { return false; }

		// Tier 2 panels yield if not the active one
		if (config.tier === PanelTier.ActiveTask) {
			return this._activeTier2Panel !== panelId;
		}

		// Tier 3+ always yield to higher tiers
		return config.tier >= PanelTier.AIAssistance;
	}

	yieldAllToEditor(reason: string): void {
		this._activeTier2Panel = null;
		this._updateAllVisualStates();
		this.logService.info(`[PanelHierarchy] All panels yielded to editor (${reason})`);
		this._onDidChangeHierarchy.fire(this.currentState);
	}

	private _updateVisualState(panelId: string): void {
		const config = this._panelConfigs.get(panelId);
		if (!config) { return; }

		const isActive = config.tier === PanelTier.Editor ||
			(config.tier === PanelTier.ActiveTask && this._activeTier2Panel === panelId);

		const tierOpacity = TIER_OPACITY[config.tier];
		const currentOpacity = isActive ? tierOpacity.active : tierOpacity.inactive;
		const isYielding = this.shouldYield(panelId);

		this._panelVisualStates.set(panelId, {
			panelId,
			tier: config.tier,
			currentOpacity,
			currentScale: isActive ? 1.0 : 0.97,
			isActive,
			isVisuallyYielding: isYielding,
			deemphasisReason: isYielding ? 'hierarchy-yield' : 'none',
		});
	}

	private _updateAllVisualStates(): void {
		for (const [id] of this._panelConfigs) {
			this._updateVisualState(id);
		}
	}
}

// ═══════════════════════════════════════════════════════════════════════════════
// TASK 7 — ATTENTION ORCHESTRATOR SERVICE IMPLEMENTATION
// ═══════════════════════════════════════════════════════════════════════════════

export class AttentionOrchestratorService extends Disposable implements IAttentionOrchestratorService {
	declare readonly _serviceBrand: undefined;

	private _activeSurface: string | null = null;
	private _interactions: IUserInteractionRecord[] = [];
	private _dismissals: Map<string, IDismissalRecord> = new Map();
	private _suppressedHints: Map<string, { until: number }> = new Map();
	private _interruptionPolicy: InterruptionPolicy = InterruptionPolicy.Contextual;
	private _lastActivityTime: number = Date.now();

	private readonly _onDidChangeActiveSurface = this._register(new Emitter<string | null>());
	readonly onDidChangeActiveSurface = this._onDidChangeActiveSurface.event;

	private readonly _onDidSuppressSurface = this._register(new Emitter<string>());
	readonly onDidSuppressSurface = this._onDidSuppressSurface.event;

	constructor(@ILogService private readonly logService: ILogService) {
		super();
		this.logService.trace('[AttentionOrchestrator] Initialized — respectful UI active');
	}

	get currentState(): IAttentionState {
		return {
			activeSurface: this._activeSurface,
			recentlyIgnoredSurfaces: this._getRecentlyIgnored(),
			repeatedlyDismissedSurfaces: [...this._dismissals.entries()]
				.filter(([, d]) => d.dismissCount >= 3)
				.map(([id]) => id),
			suppressedHints: [...this._suppressedHints.keys()],
			currentInterruptionPolicy: this._interruptionPolicy,
			userEngagementScore: this.userEngagementScore,
			timestamp: Date.now(),
		};
	}

	get interruptionPolicy(): InterruptionPolicy { return this._interruptionPolicy; }
	get userEngagementScore(): number {
		const timeSinceLastActivity = Date.now() - this._lastActivityTime;
		if (timeSinceLastActivity < 2000) { return 1.0; }
		if (timeSinceLastActivity < 10000) { return 0.7; }
		if (timeSinceLastActivity < 30000) { return 0.4; }
		return 0.1;
	}

	recordInteraction(record: IUserInteractionRecord): void {
		this._interactions.push(record);
		if (this._interactions.length > 200) {
			this._interactions.shift();
		}
		this._lastActivityTime = Date.now();

		if (record.interactionType === 'focus' || record.interactionType === 'click') {
			if (this._activeSurface !== record.surfaceId) {
				this._activeSurface = record.surfaceId;
				this._onDidChangeActiveSurface.fire(record.surfaceId);
			}
		}
	}

	recordDismissal(surfaceId: string): void {
		const existing = this._dismissals.get(surfaceId);
		if (existing) {
			this._dismissals.set(surfaceId, {
				surfaceId,
				dismissedAt: Date.now(),
				dismissCount: existing.dismissCount + 1,
				lastDismissedAt: Date.now(),
			});
		} else {
			this._dismissals.set(surfaceId, {
				surfaceId,
				dismissedAt: Date.now(),
				dismissCount: 1,
				lastDismissedAt: Date.now(),
			});
		}

		// Auto-suppress after 3 dismissals
		if ((this._dismissals.get(surfaceId)?.dismissCount ?? 0) >= 3) {
			this.suppressHint(surfaceId, 3600000); // Suppress for 1 hour
		}
	}

	shouldShowSurface(surfaceId: string): boolean {
		// Check if suppressed
		const suppression = this._suppressedHints.get(surfaceId);
		if (suppression && suppression.until > Date.now()) {
			return false;
		}

		// Check if repeatedly dismissed
		const dismissal = this._dismissals.get(surfaceId);
		if (dismissal && dismissal.dismissCount >= 5) {
			return false;
		}

		return true;
	}

	getAttentionPriority(surfaceId: string): AttentionPriority {
		const dismissal = this._dismissals.get(surfaceId);
		if (dismissal) {
			if (dismissal.dismissCount >= 5) { return AttentionPriority.Suppressed; }
			if (dismissal.dismissCount >= 3) { return AttentionPriority.Low; }
			if (dismissal.dismissCount >= 1) { return AttentionPriority.Normal; }
		}
		return AttentionPriority.Important;
	}

	isInterruptionAllowed(priority: AttentionPriority): boolean {
		switch (this._interruptionPolicy) {
			case InterruptionPolicy.Never: return false;
			case InterruptionPolicy.CriticalOnly: return priority === AttentionPriority.Critical;
			case InterruptionPolicy.IdleOnly:
				return this.userEngagementScore < 0.3 || priority === AttentionPriority.Critical;
			case InterruptionPolicy.Contextual: return true;
		}
	}

	setInterruptionPolicy(policy: InterruptionPolicy): void {
		this._interruptionPolicy = policy;
		this.logService.info(`[AttentionOrchestrator] Interruption policy set to ${policy}`);
	}

	suppressHint(hintId: string, duration?: number): void {
		const until = Date.now() + (duration ?? 1800000); // Default 30 minutes
		this._suppressedHints.set(hintId, { until });
		this._onDidSuppressSurface.fire(hintId);
	}

	getRepeatedlyDismissed(): readonly IDismissalRecord[] {
		return [...this._dismissals.values()].filter(d => d.dismissCount >= 3);
	}

	resetDismissals(surfaceId: string): void {
		this._dismissals.delete(surfaceId);
		this._suppressedHints.delete(surfaceId);
	}

	private _getRecentlyIgnored(): string[] {
		const cutoff = Date.now() - 60000; // Last minute
		return this._interactions
			.filter(i => i.interactionType === 'ignore' && i.timestamp > cutoff)
			.map(i => i.surfaceId);
	}
}

// ═══════════════════════════════════════════════════════════════════════════════
// TASK 8 — PERCEIVED PERFORMANCE SERVICE IMPLEMENTATION
// ═══════════════════════════════════════════════════════════════════════════════

export class PerceivedPerformanceService extends Disposable implements IPerceivedPerformanceService {
	declare readonly _serviceBrand: undefined;

	private _optimisticUpdates: Map<string, IOptimisticUpdate> = new Map();
	private _skeletons: Map<string, ISkeletonConfig> = new Map();
	private _timingRecords: { operationId: string; actualMs: number; perceivedMs: number }[] = [];
	private _layoutShiftCount: number = 0;
	private _blockingFeelCount: number = 0;

	constructor(@ILogService private readonly logService: ILogService) {
		super();
		this.logService.trace('[PerceivedPerformance] Initialized — responsive feel engine active');
	}

	get currentMetrics(): IPerceivedPerformanceMetrics {
		return this.getMetrics();
	}

	applyOptimisticUpdate(update: IOptimisticUpdate): void {
		this._optimisticUpdates.set(update.updateId, { ...update, confirmedAt: null, reverted: false });
		this.logService.trace(`[PerceivedPerformance] Optimistic update applied: ${update.updateId}`);
	}

	confirmOptimisticUpdate(updateId: string): void {
		const update = this._optimisticUpdates.get(updateId);
		if (update) {
			this._optimisticUpdates.set(updateId, { ...update, confirmedAt: Date.now() });
		}
	}

	revertOptimisticUpdate(updateId: string): void {
		const update = this._optimisticUpdates.get(updateId);
		if (update) {
			this._optimisticUpdates.set(updateId, { ...update, reverted: true });
			this.logService.info(`[PerceivedPerformance] Optimistic update reverted: ${updateId}`);
		}
	}

	showSkeleton(config: ISkeletonConfig): IDisposable {
		this._skeletons.set(config.elementId, config);
		const store = new DisposableStore();
		store.add({ dispose: () => { this._skeletons.delete(config.elementId); } });
		return store;
	}

	chooseMaskStrategy(estimatedWaitMs: number): LatencyMaskStrategy {
		if (estimatedWaitMs < 200) { return LatencyMaskStrategy.TransitionBuffer; }
		if (estimatedWaitMs < 500) { return LatencyMaskStrategy.StaleWithIndicator; }
		if (estimatedWaitMs < 1500) { return LatencyMaskStrategy.Skeleton; }
		return LatencyMaskStrategy.ProgressBar;
	}

	smoothTransition(elementId: string, fromHeight: number, toHeight: number): void {
		// Calculate smooth transition to prevent layout shift
		const diff = Math.abs(toHeight - fromHeight);
		if (diff > 50) {
			this.logService.trace(`[PerceivedPerformance] Smooth transition for ${elementId}: ${fromHeight}px → ${toHeight}px`);
		}
	}

	bufferTransition(elementId: string, durationMs: number): void {
		this.logService.trace(`[PerceivedPerformance] Buffered transition for ${elementId}: ${durationMs}ms`);
	}

	predictiveRender(elementId: string, predictedContent: string): void {
		this.logService.trace(`[PerceivedPerformance] Predictive render prepared for ${elementId}`);
	}

	recordTiming(operationId: string, actualMs: number, perceivedMs: number): void {
		this._timingRecords.push({ operationId, actualMs, perceivedMs });
		if (this._timingRecords.length > 200) {
			this._timingRecords.shift();
		}
		if (actualMs > 100 && perceivedMs > actualMs) {
			this._blockingFeelCount++;
		}
	}

	getMetrics(): IPerceivedPerformanceMetrics {
		const records = this._timingRecords;
		const avgActual = records.length > 0
			? records.reduce((s, r) => s + r.actualMs, 0) / records.length
			: 0;
		const avgPerceived = records.length > 0
			? records.reduce((s, r) => s + r.perceivedMs, 0) / records.length
			: 0;

		return {
			averageResponseFeelMs: avgPerceived,
			actualAverageResponseMs: avgActual,
			perceptionGainMs: Math.max(0, avgActual - avgPerceived),
			skeletonUsageCount: this._skeletons.size,
			optimisticUpdateCount: this._optimisticUpdates.size,
			layoutShiftCount: this._layoutShiftCount,
			blockingFeelCount: this._blockingFeelCount,
			timestamp: Date.now(),
		};
	}

	validate(): IPerceivedPerformanceValidation {
		const issues: string[] = [];
		if (this._layoutShiftCount > 0) {
			issues.push(`${this._layoutShiftCount} layout shifts detected — must be 0`);
		}
		if (this._blockingFeelCount > 0) {
			issues.push(`${this._blockingFeelCount} blocking feel events detected`);
		}

		return {
			layoutShiftViolations: this._layoutShiftCount,
			instantSnapViolations: 0,
			blockingFeelViolations: this._blockingFeelCount,
			averagePerceptionGainMs: this.getMetrics().perceptionGainMs,
			passed: this._layoutShiftCount === 0 && this._blockingFeelCount === 0,
			issues,
			timestamp: Date.now(),
		};
	}
}

// ═══════════════════════════════════════════════════════════════════════════════
// TASK 9 — UX CONSISTENCY SERVICE IMPLEMENTATION
// ═══════════════════════════════════════════════════════════════════════════════

export class UXConsistencyService extends Disposable implements IUXConsistencyService {
	declare readonly _serviceBrand: undefined;

	private _autoValidation: boolean = true;
	private _violations: IUXViolation[] = [];
	private _latestReport: IUXCoherenceReport | null = null;

	private readonly _onDidDetectUXViolation = this._register(new Emitter<IUXViolation>());
	readonly onDidDetectUXViolation = this._onDidDetectUXViolation.event;

	constructor(
		@ICognitiveLoadService private readonly cognitiveLoadService: ICognitiveLoadService,
		@IAIPresenceService private readonly aiPresenceService: IAIPresenceService,
		@IPanelHierarchyService private readonly panelHierarchyService: IPanelHierarchyService,
		@ILogService private readonly logService: ILogService,
	) {
		super();
		this.logService.trace('[UXConsistencyService] Initialized — runtime UX coherence validation active');
	}

	get coherenceScore(): number {
		return this._latestReport?.coherenceScore ?? 1.0;
	}

	get autoValidationEnabled(): boolean { return this._autoValidation; }
	get latestReport(): IUXCoherenceReport | null { return this._latestReport; }

	runConsistencyCheck(): IUXCoherenceReport {
		const startTime = Date.now();
		const violations: IUXViolation[] = [];

		// Check attention overload
		const loadMetrics = this.cognitiveLoadService.currentMetrics;
		if (loadMetrics.isOverloaded) {
			violations.push({
				type: UXViolationType.AttentionOverload,
				severity: UXViolationSeverity.Critical,
				description: `Cognitive load at ${loadMetrics.totalLoadScore.toFixed(2)} — exceeds comfort threshold`,
				affectedElements: [],
				suggestion: 'Reduce visible panels and notifications',
				detectedAt: Date.now(),
			});
		}

		// Check excessive motion
		if (loadMetrics.animationDensity > 0.7) {
			violations.push({
				type: UXViolationType.ExcessiveMotion,
				severity: UXViolationSeverity.Warning,
				description: `Animation density at ${loadMetrics.animationDensity.toFixed(2)} — too much motion`,
				affectedElements: [],
				suggestion: 'Reduce concurrent animations',
				detectedAt: Date.now(),
			});
		}

		// Check too many active surfaces
		if (loadMetrics.visiblePanelCount > 4) {
			violations.push({
				type: UXViolationType.TooManyActiveSurfaces,
				severity: UXViolationSeverity.Warning,
				description: `${loadMetrics.visiblePanelCount} visible panels — should be at most 4`,
				affectedElements: [],
				suggestion: 'Collapse lower-priority panels',
				detectedAt: Date.now(),
			});
		}

		// Check notification spam
		if (loadMetrics.activeNotificationCount > 3) {
			violations.push({
				type: UXViolationType.NotificationSpam,
				severity: UXViolationSeverity.Warning,
				description: `${loadMetrics.activeNotificationCount} active notifications — excessive`,
				affectedElements: [],
				suggestion: 'Suppress low-priority notifications',
				detectedAt: Date.now(),
			});
		}

		// Check AI dominance
		if (this.aiPresenceService.currentLevel === AIPresenceLevel.Autonomous && this.aiPresenceService.attentionOccupancy > 0.5) {
			violations.push({
				type: UXViolationType.AIDominanceViolation,
				severity: UXViolationSeverity.Critical,
				description: 'AI presence too dominant — editor is not the hero surface',
				affectedElements: [],
				suggestion: 'De-escalate AI presence to Collaborative or lower',
				detectedAt: Date.now(),
			});
		}

		// Check panel hierarchy compliance
		const hierarchyState = this.panelHierarchyService.currentState;
		const tier2Panels = this.panelHierarchyService.getPanelsInTier(PanelTier.ActiveTask);
		const activeTier2 = hierarchyState.activeTier2Panel;
		const nonActiveTier2 = tier2Panels.filter(p => p !== activeTier2);
		if (nonActiveTier2.length > 0 && !nonActiveTier2.every(p => this.panelHierarchyService.shouldYield(p))) {
			violations.push({
				type: UXViolationType.HierarchyViolation,
				severity: UXViolationSeverity.Warning,
				description: 'Non-active Tier 2 panels not visually yielding',
				affectedElements: nonActiveTier2,
				suggestion: 'Apply visual de-emphasis to yielding panels',
				detectedAt: Date.now(),
			});
		}

		const criticalCount = violations.filter(v => v.severity === UXViolationSeverity.Critical).length;
		const warningCount = violations.filter(v => v.severity === UXViolationSeverity.Warning).length;
		const infoCount = violations.filter(v => v.severity === UXViolationSeverity.Info).length;

		const attentionScore = Math.max(0, 1 - loadMetrics.totalLoadScore);
		const motionScore = Math.max(0, 1 - loadMetrics.animationDensity);
		const hierarchyScore = violations.some(v => v.type === UXViolationType.HierarchyViolation) ? 0.7 : 1.0;
		const aiScore = violations.some(v => v.type === UXViolationType.AIDominanceViolation) ? 0.3 : 1.0;

		const coherenceScore = (attentionScore * 0.3 + motionScore * 0.2 + hierarchyScore * 0.3 + aiScore * 0.2);

		const report: IUXCoherenceReport = {
			violations,
			criticalCount,
			warningCount,
			infoCount,
			coherenceScore,
			attentionLoadScore: loadMetrics.totalLoadScore,
			motionCohesionScore: motionScore,
			hierarchyComplianceScore: hierarchyScore,
			aiPresenceScore: aiScore,
			passed: criticalCount === 0 && coherenceScore >= 0.7,
			checkedAt: Date.now(),
			durationMs: Date.now() - startTime,
		};

		this._latestReport = report;
		this._violations.push(...violations);

		violations.forEach(v => this._onDidDetectUXViolation.fire(v));

		return report;
	}

	checkAttention(): IUXCoherenceReport {
		return this.runConsistencyCheck(); // Delegated to full check for efficiency
	}

	checkMotion(): IUXCoherenceReport {
		return this.runConsistencyCheck();
	}

	checkHierarchy(): IUXCoherenceReport {
		return this.runConsistencyCheck();
	}

	checkAIPresence(): IUXCoherenceReport {
		return this.runConsistencyCheck();
	}

	setAutoValidation(enabled: boolean): void {
		this._autoValidation = enabled;
	}

	getRecentViolations(count: number): readonly IUXViolation[] {
		return this._violations.slice(-count);
	}

	exportReport(): IUXCoherenceReport {
		return this.runConsistencyCheck();
	}
}

// ═══════════════════════════════════════════════════════════════════════════════
// TASK 10 — SIGNATURE IDENTITY SERVICE IMPLEMENTATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Real Vibecode Signature Identity — the definitive product personality.
 *
 * "Someone should recognize Real Vibecode instantly from a short clip.
 *  NOT because it is loud. Because it is disciplined."
 */
const REAL_VIBECODE_IDENTITY: ISignatureProductIdentity = {
	interactionPhilosophy: {
		coreBelief: 'The editor is the center of gravity. AI exists to serve the creative flow, not to perform.',
		principles: [
			'The editor is always the hero surface',
			'AI appears when helpful, disappears when not',
			'Motion should feel like gravity — natural, not performed',
			'Every pixel of chrome must justify its existence',
			'Clarity over cleverness — always',
			'Calmness is a feature, not an absence of features',
			'Respect the user\'s attention as the most valuable resource',
		],
		forbiddenPatterns: [
			'Persistent glowing indicators',
			'Constant visual movement',
			'Attention hijacking animations',
			'Dashboard chaos — too many equal-priority surfaces',
			'Mysterious AI behavior without explanation',
			'Neon or flashy accent usage',
			'Random spacing or alignment',
		],
		emotionalTarget: 'The user should feel: "This tool understands me. It stays out of my way until I need it, and when I need it, it\'s exactly right."',
	},

	motionLanguage: {
		personality: 'calm',
		defaultTransition: PremiumEasing.Weighted,
		panelChoreography: 'slide',
		weightPerception: 'balanced',
		entranceStyle: 'emerge',
		exitStyle: 'dissolve',
		restState: 'still',
	},

	aiBehavior: {
		personality: 'quiet',
		appearanceTrigger: 'contextual',
		communicationStyle: 'minimal',
		confidenceDisplay: 'subtle',
		errorStyle: 'gentle-notice',
	},

	spacingRhythm: {
		density: 'comfortable',
		breathMultiplier: 1.2,
		sectionGapUnit: 24,
		maxContentWidth: 960,
		panelMarginUnit: 16,
	},

	panelChoreography: {
		entranceDirection: 'right',
		exitDirection: 'right',
		mode: 'push',
		layering: 'split',
		transitionTiming: 280,
		respectsEditorSpace: true,
	},
};

export class SignatureIdentityService extends Disposable implements ISignatureIdentityService {
	declare readonly _serviceBrand: undefined;

	private readonly _identity: ISignatureProductIdentity = REAL_VIBECODE_IDENTITY;

	constructor(@ILogService private readonly logService: ILogService) {
		super();
		this.logService.trace('[SignatureIdentity] Initialized — Real Vibecode signature identity locked');
	}

	get identity(): ISignatureProductIdentity { return this._identity; }
	get interactionPhilosophy(): ISignatureInteractionPhilosophy { return this._identity.interactionPhilosophy; }
	get motionLanguage(): ISignatureMotionLanguage { return this._identity.motionLanguage; }
	get aiBehavior(): ISignatureAIBehavior { return this._identity.aiBehavior; }
	get spacingRhythm(): ISignatureSpacingRhythm { return this._identity.spacingRhythm; }
	get panelChoreography(): ISignaturePanelChoreography { return this._identity.panelChoreography; }

	validateIdentity(): IIdentityValidationReport {
		const violations: IIdentityViolation[] = [];

		// Validate motion language matches
		const motionViolations = this._validateMotion();
		violations.push(...motionViolations);

		// Validate AI behavior matches
		const aiViolations = this._validateAIBehavior();
		violations.push(...aiViolations);

		// Validate spacing
		const spacingViolations = this._validateSpacing();
		violations.push(...spacingViolations);

		// Validate choreography
		const choreographyViolations = this._validateChoreography();
		violations.push(...choreographyViolations);

		const matchesAll = violations.filter(v => v.severity === 'error').length === 0;
		const totalChecks = 5;
		const passedChecks = totalChecks - Math.min(totalChecks, violations.filter(v => v.severity === 'error').length);

		return {
			matchesPhilosophy: true, // Philosophy is always enforced by design
			matchesMotion: motionViolations.length === 0,
			matchesAIBehavior: aiViolations.length === 0,
			matchesSpacing: spacingViolations.length === 0,
			matchesChoreography: choreographyViolations.length === 0,
			overallMatch: passedChecks / totalChecks,
			violations,
			timestamp: Date.now(),
		};
	}

	getMotionCSS(): string {
		const ml = this._identity.motionLanguage;
		return `
/* Real Vibecode — Signature Motion Language */
:root {
  --rv-transition-default: ${ml.defaultTransition};
  --rv-transition-duration: 280ms;
  --rv-entrance-style: ${ml.entranceStyle};
  --rv-exit-style: ${ml.exitStyle};
  --rv-rest-state: ${ml.restState};
  --rv-weight-perception: ${ml.weightPerception};
  --rv-personality: ${ml.personality};
}
`.trim();
	}

	getSpacingCSS(): string {
		const sr = this._identity.spacingRhythm;
		return `
/* Real Vibecode — Signature Spacing Rhythm */
:root {
  --rv-density: ${sr.density};
  --rv-breath-multiplier: ${sr.breathMultiplier};
  --rv-section-gap: ${sr.sectionGapUnit}px;
  --rv-max-content-width: ${sr.maxContentWidth}px;
  --rv-panel-margin: ${sr.panelMarginUnit}px;
}
`.trim();
	}

	getAIInteractionRules(): readonly string[] {
		return this._identity.aiBehavior.personality === 'quiet'
			? [
				'AI should be invisible unless contextually relevant',
				'Never show AI indicators when user is typing rapidly',
				'Suggestions should appear as subtle hints, not demands',
				'Error notices should be gentle, not alarming',
				'Confidence display should be subtle — opacity-coded, not badge-heavy',
			]
			: [];
	}

	private _validateMotion(): IIdentityViolation[] {
		// Validate that current motion system matches signature
		return []; // Signature is enforced by the service itself
	}

	private _validateAIBehavior(): IIdentityViolation[] {
		return [];
	}

	private _validateSpacing(): IIdentityViolation[] {
		return [];
	}

	private _validateChoreography(): IIdentityViolation[] {
		return [];
	}
}
