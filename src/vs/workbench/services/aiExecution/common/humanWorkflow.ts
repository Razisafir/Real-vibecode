/*---------------------------------------------------------------------------------------------
 *  Unified Interaction Intelligence & Human Workflow Engine — Phase 16
 *  Real Vibecode — AI-Native IDE
 *
 *  Makes the system feel like it understands HOW humans actually work.
 *  Focus, momentum, interruption cost, creative rhythm, recovery timing,
 *  workflow continuity, mental fatigue, intent persistence.
 *
 *  PRINCIPLES:
 *    1. The system must adapt to HOW humans work — not force AI workflows
 *    2. Momentum should decay naturally after interruptions
 *    3. The system should learn when NOT to interrupt
 *    4. The UI must feel respectful of concentration
 *    5. The user should feel "I never lost my place"
 *    6. Recovery should feel supportive, not patronizing
 *    7. The system should learn how THIS specific user works
 *    8. The system should feel continuously aware without becoming intrusive
 *    9. NEVER pretend to read emotions — infer only interaction friction
 *   10. NEVER be clingy, chatty, emotionally manipulative, or attention-seeking
 *
 *  ETHICAL BOUNDARIES:
 *    - No creepy anthropomorphic behavior
 *    - No fake empathy
 *    - No productivity-guilt inducing behavior
 *    - No emotional manipulation
 *    - No attention-seeking AI behavior
 *    - Infer friction only from interaction patterns
 *
 *  Tasks:
 *    1.  Workflow Momentum Engine — track momentum, detect deep-work states
 *    2.  Interruption Intelligence — classify, cost, defer, batch interruptions
 *    3.  Session Continuity Engine — reconstruct prior work intent
 *    4.  Cognitive Recovery System — detect overload, recommend recovery
 *    5.  Work Rhythm Learning — detect user work cadence
 *    6.  Intent Persistence — persist unresolved intentions cross-session
 *    7.  Emotional Friction Detection — infer interaction friction only
 *    8.  Adaptive Workspace Memory — remember preferred layouts/patterns
 *    9.  Human-Centered Validation — runtime workflow coherence
 *   10.  Signature Human Experience Model — interaction humanity principles
 *--------------------------------------------------------------------------------------------*/

import { Event } from '../../../../base/common/event.js';
import { IDisposable } from '../../../../base/common/lifecycle.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';

// ═══════════════════════════════════════════════════════════════════════════════
// TASK 1 — WORKFLOW MOMENTUM ENGINE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Momentum level — how much productive energy the user has.
 */
export const enum MomentumLevel {
	/** No momentum — idle, just started, or after long interruption */
	Stalled = 'stalled',
	/** Building momentum — warming up, getting into task */
	Building = 'building',
	/** Active momentum — productive, making progress */
	Active = 'active',
	/** Strong momentum — deep work, high output */
	Strong = 'strong',
	/** Peak momentum — maximum productivity, do not interrupt */
	Peak = 'peak',
}

/**
 * Momentum event — something that affects momentum.
 */
export const enum MomentumEventType {
	/** Sustained editing without interruption */
	UninterruptedEdit = 'uninterrupted-edit',
	/** Completed a task */
	TaskCompletion = 'task-completion',
	/** Switched to a different context */
	ContextSwitch = 'context-switch',
	/** Was interrupted by something */
	Interrupted = 'interrupted',
	/** Long idle period */
	IdlePeriod = 'idle-period',
	/** Reverted recent work */
	Revert = 'revert',
	/** Made a significant breakthrough */
	Breakthrough = 'breakthrough',
	/** Fragmented work — rapid switching */
	Fragmentation = 'fragmentation',
	/** Momentum collapsed — lost productive state */
	Collapse = 'collapse',
}

/**
 * Momentum state — current momentum metrics.
 */
export interface IMomentumState {
	readonly level: MomentumLevel;
	readonly score: number; // 0.0-1.0
	readonly consecutiveMinutes: number; // minutes of uninterrupted work
	readonly editVelocity: number; // edits per minute
	readonly contextSwitchCount: number; // in last 15 minutes
	readonly taskCompletionsInWindow: number;
	readonly isDeepWork: boolean;
	readonly isFragmented: boolean;
	readonly streakPreserved: boolean;
	readonly lastInterruptionCost: number; // 0.0-1.0
	readonly naturalDecayRate: number; // how fast momentum decays
	readonly timestamp: number;
}

/**
 * Context switch penalty — the cost of switching tasks.
 */
export interface IContextSwitchPenalty {
	readonly fromContext: string;
	readonly toContext: string;
	readonly estimatedRecoveryMs: number;
	readonly momentumCost: number; // 0.0-1.0 reduction
	readonly timestamp: number;
}

/**
 * Momentum lifecycle — the arc of a work session.
 */
export interface IMomentumLifecycle {
	readonly sessionStart: number;
	readonly buildingPhase: number; // ms
	readonly peakPhase: number; // ms
	readonly currentPhase: 'building' | 'peak' | 'declining' | 'recovering';
	readonly totalProductiveMs: number;
	readonly totalInterruptionCostMs: number;
}

/**
 * IWorkflowMomentumService — Tracks and preserves workflow momentum.
 *
 * Tracks momentum score, detects deep-work states, detects task acceleration,
 * detects workflow fragmentation, detects momentum collapse, preserves
 * uninterrupted streaks, measures context-switch penalties, detects
 * productive rhythm.
 *
 * Momentum decays naturally after interruptions. The system learns
 * when NOT to interrupt.
 */
export const IWorkflowMomentumService = createDecorator<IWorkflowMomentumService>('workflowMomentumService');

export interface IWorkflowMomentumService {
	readonly _serviceBrand: undefined;

	/** Current momentum state */
	readonly currentState: IMomentumState;

	/** Current momentum level */
	readonly level: MomentumLevel;

	/** Current momentum score (0.0-1.0) */
	readonly score: number;

	/** Whether user is in deep work */
	readonly isDeepWork: boolean;

	/** Event: momentum state changed */
	readonly onDidChangeMomentum: Event<IMomentumState>;

	/** Record an event that affects momentum */
	recordEvent(eventType: MomentumEventType, context?: string): void;

	/** Record an edit event */
	recordEdit(): void;

	/** Record a context switch */
	recordContextSwitch(fromContext: string, toContext: string): IContextSwitchPenalty;

	/** Calculate the cost of an interruption at current momentum */
	calculateInterruptionCost(priority: string): number;

	/** Check if an interruption should be allowed */
	shouldAllowInterruption(priority: string): boolean;

	/** Get the current streak duration */
	readonly streakDurationMs: number;

	/** Get the momentum lifecycle for this session */
	readonly lifecycle: IMomentumLifecycle;

	/** Get momentum history */
	getMomentumHistory(durationMs: number): readonly IMomentumState[];

	/** Validate momentum preservation */
	validateMomentum(): IMomentumReport;
}

/**
 * Momentum report — validates momentum preservation.
 */
export interface IMomentumReport {
	readonly averageMomentumScore: number;
	readonly deepWorkMinutesToday: number;
	readonly interruptionCostTotal: number;
	readonly fragmentationRate: number;
	readonly streaksPreserved: number;
	readonly streaksBroken: number;
	readonly overallMomentumHealth: number; // 0.0-1.0
	readonly issues: readonly IMomentumIssue[];
	readonly timestamp: number;
}

/**
 * Momentum issue.
 */
export interface IMomentumIssue {
	readonly issueType: 'momentum-destruction' | 'excessive-fragmentation' | 'streak-breaking' | 'context-switch-penalty';
	readonly description: string;
	readonly severity: 'critical' | 'warning' | 'info';
}

// ═══════════════════════════════════════════════════════════════════════════════
// TASK 2 — INTERRUPTION INTELLIGENCE SYSTEM
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Interruption classification — how important an interruption is.
 */
export const enum InterruptionClassification {
	/** Must show immediately — errors, security, data loss risk */
	Critical = 'critical',
	/** Should show soon — important task completion, required actions */
	Important = 'important',
	/** Show when contextually relevant — AI insights, suggestions */
	Contextual = 'contextual',
	/** Can wait — tips, feature suggestions, non-urgent notifications */
	Optional = 'optional',
	/** Can be delayed indefinitely — analytics, non-essential updates */
	Deferrable = 'deferrable',
}

/**
 * Interruption timing assessment — when to deliver.
 */
export const enum InterruptionTiming {
	/** Deliver immediately */
	Now = 'now',
	/** Deliver at next natural pause */
	NextPause = 'next-pause',
	/** Deliver at next recovery window */
	RecoveryWindow = 'recovery-window',
	/** Batch with other similar interruptions */
	Batched = 'batched',
	/** Defer until user explicitly asks */
	Deferred = 'deferred',
}

/**
 * Interruption record — a pending or delivered interruption.
 */
export interface IInterruptionRecord {
	readonly id: string;
	readonly source: string;
	readonly classification: InterruptionClassification;
	readonly description: string;
	readonly costEstimate: number; // 0.0-1.0 interruption cost
	readonly recommendedTiming: InterruptionTiming;
	readonly deferredAt: number | null;
	readonly deliveredAt: number | null;
	readonly dismissedAt: number | null;
	readonly batchGroup: string | null;
	readonly timestamp: number;
}

/**
 * Interruption cost calculation — factors that determine cost.
 */
export interface IInterruptionCost {
	readonly baseCost: number; // 0.0-1.0
	readonly momentumMultiplier: number; // higher momentum = higher cost
	readonly velocityMultiplier: number; // faster typing = higher cost
	readonly focusMultiplier: number; // deeper focus = higher cost
	readonly totalCost: number; // combined cost
	readonly recoveryEstimateMs: number; // estimated time to regain focus
}

/**
 * Recovery window — when the user is receptive to interruptions.
 */
export interface IRecoveryWindow {
	readonly startAt: number;
	readonly endAt: number;
	readonly type: 'natural-pause' | 'task-boundary' | 'idle-moment' | 'context-shift';
	readonly receptivityScore: number; // 0.0-1.0
}

/**
 * IInterruptionIntelligenceService — Makes the UI feel respectful of concentration.
 *
 * Classifies interruptions, calculates interruption cost, defers low-value
 * interruptions, batches intelligently, detects bad timing, releases
 * notifications during recovery windows.
 *
 * Rules: typing velocity reduces interruption tolerance, deep focus suppresses
 * almost everything, interruption recovery time is tracked.
 */
export const IInterruptionIntelligenceService = createDecorator<IInterruptionIntelligenceService>('interruptionIntelligenceService');

export interface IInterruptionIntelligenceService {
	readonly _serviceBrand: undefined;

	/** Event: interruption received */
	readonly onDidReceiveInterruption: Event<IInterruptionRecord>;

	/** Event: interruption delivered */
	readonly onDidDeliverInterruption: Event<IInterruptionRecord>;

	/** Event: interruption deferred */
	readonly onDidDeferInterruption: Event<IInterruptionRecord>;

	/** Submit an interruption for intelligent routing */
	submitInterruption(source: string, classification: InterruptionClassification, description: string): IInterruptionRecord;

	/** Calculate the cost of an interruption right now */
	calculateCost(classification: InterruptionClassification): IInterruptionCost;

	/** Get the recommended timing for an interruption */
	getRecommendedTiming(classification: InterruptionClassification): InterruptionTiming;

	/** Get all pending interruptions */
	getPendingInterruptions(): readonly IInterruptionRecord[];

	/** Get deferred interruptions */
	getDeferredInterruptions(): readonly IInterruptionRecord[];

	/** Detect recovery windows — when to deliver deferred items */
	detectRecoveryWindows(): readonly IRecoveryWindow[];

	/** Release batched interruptions during a recovery window */
	releaseBatchedInterruptions(): readonly IInterruptionRecord[];

	/** Record that the user dismissed an interruption */
	recordDismissal(interruptionId: string): void;

	/** Record typing velocity — affects interruption tolerance */
	recordTypingVelocity(charsPerMinute: number): void;

	/** Get current interruption tolerance (0.0-1.0) */
	readonly interruptionTolerance: number;

	/** Validate interruption respectfulness */
	validateInterruptionIntelligence(): IInterruptionReport;
}

/**
 * Interruption report — validates interruption respectfulness.
 */
export interface IInterruptionReport {
	readonly interruptionsDeliveredDuringFocus: number;
	readonly interruptionsCorrectlyDeferred: number;
	readonly averageRecoveryTimeMs: number;
	readonly interruptionRespectScore: number; // 0.0-1.0
	readonly issues: readonly IInterruptionIssue[];
	readonly timestamp: number;
}

/**
 * Interruption issue.
 */
export interface IInterruptionIssue {
	readonly issueType: 'focus-interruption' | 'bad-timing' | 'excessive-notification' | 'no-recovery-window' | 'aggressive-delivery';
	readonly description: string;
	readonly severity: 'critical' | 'warning' | 'info';
}

// ═══════════════════════════════════════════════════════════════════════════════
// TASK 3 — SESSION CONTINUITY ENGINE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Session continuity state — how well the session persists.
 */
export interface ISessionContinuityState {
	readonly hasPreviousSession: boolean;
	readonly canResume: boolean;
	readonly resumedElements: readonly string[];
	readonly abandonedWork: readonly IAbandonedWork[];
	readonly mentalMapContinuity: number; // 0.0-1.0
	readonly timestamp: number;
}

/**
 * Abandoned work — unfinished work from a previous session.
 */
export interface IAbandonedWork {
	readonly workId: string;
	readonly context: string; // what the user was working on
	readonly filesOpen: readonly string[];
	readonly cursorPosition: string; // file:line
	readonly taskDescription: string;
	readonly momentumAtAbandon: number; // 0.0-1.0
	readonly abandonedAt: number;
	readonly estimatedRecoveryMs: number;
}

/**
 * Resume context — information to restore a user's mental map.
 */
export interface IResumeContext {
	readonly sessionId: string;
	readonly previousSessionEnd: number;
	readonly primaryTask: string;
	readonly openFiles: readonly string[];
	readonly activeSearches: readonly string[];
	readonly unsavedChanges: readonly string[];
	readonly recentEdits: readonly string[];
	readonly mentalMapHints: readonly string[];
	readonly momentumBeforeExit: number;
	readonly recommendedResumption: string;
	readonly timestamp: number;
}

/**
 * Workspace continuity event — something that affects continuity.
 */
export const enum ContinuityEvent {
	/** Session started — resuming previous */
	SessionStart = 'session-start',
	/** Session ended — preserving state */
	SessionEnd = 'session-end',
	/** User switched workspace */
	WorkspaceSwitch = 'workspace-switch',
	/** User returned to previous context */
	ContextReturn = 'context-return',
	/** Abandoned work detected */
	AbandonedWork = 'abandoned-work',
	/** Work successfully resumed */
	WorkResumed = 'work-resumed',
}

/**
 * ISessionContinuityService — The user should feel "I never lost my place."
 *
 * Reconstructs prior work intent, persists unfinished momentum, resumes
 * suspended workflows, tracks workspace continuity, detects abandoned work,
 * detects returning context, generates "resume context", preserves mental
 * map continuity.
 */
export const ISessionContinuityService = createDecorator<ISessionContinuityService>('sessionContinuityService');

export interface ISessionContinuityService {
	readonly _serviceBrand: undefined;

	/** Current session continuity state */
	readonly currentState: ISessionContinuityState;

	/** Whether there is resumable previous session */
	readonly hasResumableSession: boolean;

	/** Event: continuity event */
	readonly onDidContinuityEvent: Event<ContinuityEvent>;

	/** Generate a resume context for the current session */
	generateResumeContext(): IResumeContext;

	/** Restore from a previous resume context */
	restoreFromContext(context: IResumeContext): void;

	/** Detect abandoned work from previous sessions */
	detectAbandonedWork(): readonly IAbandonedWork[];

	/** Mark abandoned work as resumed */
	markWorkResumed(workId: string): void;

	/** Detect if user is returning to a previous context */
	detectReturningContext(): IResumeContext | null;

	/** Preserve the current mental map */
	preserveMentalMap(): void;

	/** Record a continuity event */
	recordEvent(event: ContinuityEvent): void;

	/** Get session history */
	getSessionHistory(): readonly ISessionSummary[];

	/** Validate continuity coherence */
	validateContinuity(): IContinuityReport;
}

/**
 * Session summary — a record of a work session.
 */
export interface ISessionSummary {
	readonly sessionId: string;
	readonly startTime: number;
	readonly endTime: number;
	readonly durationMs: number;
	readonly primaryTask: string;
	readonly peakMomentum: number;
	readonly exitMomentum: number;
	readonly filesTouched: readonly string[];
}

/**
 * Continuity report — validates session continuity.
 */
export interface IContinuityReport {
	readonly sessionResumptionRate: number; // 0.0-1.0
	readonly abandonedWorkRecoveryRate: number;
	readonly mentalMapContinuityScore: number;
	readonly overallContinuityScore: number;
	readonly issues: readonly IContinuityIssue[];
	readonly timestamp: number;
}

/**
 * Continuity issue.
 */
export interface IContinuityIssue {
	readonly issueType: 'broken-continuity' | 'lost-context' | 'unrecovered-work' | 'missing-resume';
	readonly description: string;
	readonly severity: 'critical' | 'warning' | 'info';
}

// ═══════════════════════════════════════════════════════════════════════════════
// TASK 4 — COGNITIVE RECOVERY SYSTEM
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Cognitive load level — current mental strain.
 */
export const enum CognitiveLoadLevel {
	/** Comfortable — user is in a good state */
	Comfortable = 'comfortable',
	/** Moderate — some strain, still productive */
	Moderate = 'moderate',
	/** High — significant strain, efficiency declining */
	High = 'high',
	/** Overloaded — user needs recovery, suppress stimulation */
	Overloaded = 'overloaded',
	/** Critical — emergency, minimal UI, recovery mode */
	Critical = 'critical',
}

/**
 * Fatigue signal — a sign of cognitive fatigue.
 */
export const enum FatigueSignalType {
	/** Slowing edit velocity */
	VelocityDecline = 'velocity-decline',
	/** Increasing error rate */
	ErrorIncrease = 'error-increase',
	/** More frequent pauses */
	PauseFrequency = 'pause-frequency',
	/** Reduced task completion rate */
	TaskSlowdown = 'task-slowdown',
	/** Increasing context switches (avoidance) */
	ContextSwitchIncrease = 'context-switch-increase',
	/** Longer undo chains */
	UndoChains = 'undo-chains',
}

/**
 * Recovery recommendation — a suggestion for cognitive recovery.
 */
export interface IRecoveryRecommendation {
	readonly type: 'micro-break' | 'context-switch-break' | 'task-boundary' | 'session-pause' | 'visual-simplification';
	readonly description: string;
	readonly durationMs: number;
	readonly urgency: 'gentle' | 'suggested' | 'recommended';
	readonly timestamp: number;
}

/**
 * Cognitive recovery state — current cognitive load and recovery status.
 */
export interface ICognitiveRecoveryState {
	readonly loadLevel: CognitiveLoadLevel;
	readonly fatigueAccumulation: number; // 0.0-1.0
	readonly detectedSignals: readonly FatigueSignalType[];
	readonly isRecoveryModeActive: boolean;
	readonly stimulationLevel: number; // 0.0-1.0 — how much visual stimulation
	readonly complexityLevel: number; // 0.0-1.0 — how much UI complexity is visible
	readonly lastRecoveryAt: number | null;
	readonly recoveryRecommendation: IRecoveryRecommendation | null;
	readonly timestamp: number;
}

/**
 * ICognitiveRecoveryService — Recovery feels supportive, not patronizing.
 *
 * Detects overload, fatigue accumulation, excessive context switching.
 * Recommends recovery moments, softens UI during fatigue, reduces visual
 * stimulation, enters recovery-friendly modes, gradually restores complexity.
 */
export const ICognitiveRecoveryService = createDecorator<ICognitiveRecoveryService>('cognitiveRecoveryService');

export interface ICognitiveRecoveryService {
	readonly _serviceBrand: undefined;

	/** Current cognitive recovery state */
	readonly currentState: ICognitiveRecoveryState;

	/** Current cognitive load level */
	readonly loadLevel: CognitiveLoadLevel;

	/** Event: cognitive load changed */
	readonly onDidChangeCognitiveLoad: Event<ICognitiveRecoveryState>;

	/** Record a fatigue signal */
	recordFatigueSignal(signal: FatigueSignalType): void;

	/** Detect fatigue accumulation */
	detectFatigue(): number; // returns fatigue score 0.0-1.0

	/** Get a recovery recommendation */
	getRecoveryRecommendation(): IRecoveryRecommendation | null;

	/** Enter recovery-friendly mode — soften UI */
	enterRecoveryMode(): IDisposable;

	/** Soften UI during fatigue */
	softenUIDuringFatigue(): void;

	/** Reduce visual stimulation */
	reduceStimulation(): void;

	/** Gradually restore complexity after recovery */
	restoreComplexity(): void;

	/** Check if recovery is needed */
	readonly isRecoveryNeeded: boolean;

	/** Validate cognitive recovery */
	validateCognitiveRecovery(): ICognitiveRecoveryReport;
}

/**
 * Cognitive recovery report.
 */
export interface ICognitiveRecoveryReport {
	readonly averageFatigueLevel: number;
	readonly recoveryEventsTriggered: number;
	readonly stimulationReductionsApplied: number;
	readonly patronizingBehaviorDetected: boolean;
	readonly overallRecoveryScore: number; // 0.0-1.0
	readonly issues: readonly ICognitiveRecoveryIssue[];
	readonly timestamp: number;
}

/**
 * Cognitive recovery issue.
 */
export interface ICognitiveRecoveryIssue {
	readonly issueType: 'patronizing-recovery' | 'insufficient-recovery' | 'recovery-starvation' | 'harsh-stimulation';
	readonly description: string;
	readonly severity: 'critical' | 'warning' | 'info';
}

// ═══════════════════════════════════════════════════════════════════════════════
// TASK 5 — WORK RHYTHM LEARNING ENGINE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Work rhythm type — what the user is doing.
 */
export const enum WorkRhythmType {
	/** Writing or editing code — creative flow */
	Coding = 'coding',
	/** Reviewing code changes — analytical */
	Reviewing = 'reviewing',
	/** Planning architecture — contemplative */
	Planning = 'planning',
	/** Debugging issues — investigative */
	Debugging = 'debugging',
	/** Navigating codebase — exploratory */
	Navigating = 'navigating',
	/** Writing tests — methodical */
	Testing = 'testing',
	/** Refactoring — restructuring */
	Refactoring = 'refactoring',
}

/**
 * Rhythm cadence — the pace of work.
 */
export const enum RhythmCadence {
	/** Very slow — contemplative, careful */
	Slow = 'slow',
	/** Moderate — steady, balanced */
	Moderate = 'moderate',
	/** Fast — productive, flowing */
	Fast = 'fast',
	/** Intense — peak output, deep focus */
	Intense = 'intense',
}

/**
 * Rhythm pattern — a learned work pattern.
 */
export interface IRhythmPattern {
	readonly patternId: string;
	readonly rhythmType: WorkRhythmType;
	readonly typicalCadence: RhythmCadence;
	readonly typicalDurationMs: number;
	readonly typicalStartTime: number; // hour of day
	readonly productivityScore: number; // 0.0-1.0
	readonly observedCount: number;
	readonly lastObserved: number;
}

/**
 * Productive window — a time when the user is most productive.
 */
export interface IProductiveWindow {
	readonly startHour: number; // 0-23
	readonly endHour: number;
	readonly averageProductivity: number; // 0.0-1.0
	readonly rhythmTypes: readonly WorkRhythmType[];
	readonly dayOfWeek: number; // 0-6
}

/**
 * Work rhythm state — current rhythm learning state.
 */
export interface IWorkRhythmState {
	readonly currentRhythm: WorkRhythmType;
	readonly currentCadence: RhythmCadence;
	readonly learnedPatterns: number;
	readonly productiveWindows: number;
	readonly interactionPacing: number; // 0.0-1.0 how fast system interacts
	readonly timestamp: number;
}

/**
 * IWorkRhythmService — Learns how THIS specific user works.
 *
 * Detects coding rhythm, review rhythm, planning rhythm, debugging rhythm.
 * Identifies user work cadence, detects high-productivity windows,
 * detects slow/friction periods, adapts interaction pacing.
 */
export const IWorkRhythmService = createDecorator<IWorkRhythmService>('workRhythmService');

export interface IWorkRhythmService {
	readonly _serviceBrand: undefined;

	/** Current work rhythm state */
	readonly currentState: IWorkRhythmState;

	/** Current rhythm type */
	readonly currentRhythm: WorkRhythmType;

	/** Current cadence */
	readonly currentCadence: RhythmCadence;

	/** Event: rhythm type changed */
	readonly onDidChangeRhythm: Event<WorkRhythmType>;

	/** Record a rhythm observation */
	recordRhythmObservation(type: WorkRhythmType): void;

	/** Get learned rhythm patterns */
	getLearnedPatterns(): readonly IRhythmPattern[];

	/** Get high-productivity windows */
	getProductiveWindows(): readonly IProductiveWindow[];

	/** Detect current friction level */
	readonly frictionLevel: number; // 0.0-1.0

	/** Get adapted interaction pacing for current rhythm */
	getAdaptedPacing(): number; // 0.0-1.0

	/** Predict the next likely rhythm transition */
	predictNextRhythm(): WorkRhythmType | null;

	/** Validate rhythm adaptation */
	validateRhythmAdaptation(): IRhythmReport;
}

/**
 * Rhythm report.
 */
export interface IRhythmReport {
	readonly patternsLearned: number;
	readonly adaptationAccuracy: number;
	readonly frictionReductionScore: number;
	readonly pacingAlignmentScore: number;
	readonly issues: readonly IRhythmIssue[];
	readonly timestamp: number;
}

/**
 * Rhythm issue.
 */
export interface IRhythmIssue {
	readonly issueType: 'pacing-mismatch' | 'no-pattern-learning' | 'friction-ignored' | 'rhythm-instability';
	readonly description: string;
	readonly severity: 'critical' | 'warning' | 'info';
}

// ═══════════════════════════════════════════════════════════════════════════════
// TASK 6 — INTENT PERSISTENCE ENGINE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Intent state — the lifecycle state of an intention.
 */
export const enum IntentState {
	/** Just formed — user started thinking about it */
	Formed = 'formed',
	/** Actively being worked on */
	Active = 'active',
	/** Suspended — user switched to something else */
	Suspended = 'suspended',
	/** Dormant — not touched for a while */
	Dormant = 'dormant',
	/** Completed */
	Completed = 'completed',
	/** Abandoned */
	Abandoned = 'abandoned',
}

/**
 * User intent — an unresolved intention the user has.
 */
export interface IUserIntent {
	readonly intentId: string;
	readonly description: string;
	readonly state: IntentState;
	readonly relatedFiles: readonly string[];
	readonly relatedSearches: readonly string[];
	readonly createdAt: number;
	readonly lastActiveAt: number;
	readonly activationCount: number;
	readonly estimatedProgress: number; // 0.0-1.0
	readonly isRecurring: boolean;
	readonly parentIntentId: string | null;
	readonly childIntentIds: readonly string[];
}

/**
 * Intent chain — a sequence of related intentions across sessions.
 */
export interface IIntentChain {
	readonly chainId: string;
	readonly rootIntentId: string;
	readonly intentIds: readonly string[];
	readonly sessionSpanCount: number;
	readonly totalProgress: number; // 0.0-1.0
	readonly firstCreatedAt: number;
	readonly lastActiveAt: number;
}

/**
 * Dormant goal — an intent that hasn't been touched in a while.
 */
export interface IDormantGoal {
	readonly intentId: string;
	readonly description: string;
	readonly dormantSince: number;
	readonly estimatedRecoveryEffort: number; // 0.0-1.0
	readonly contextRequired: readonly string[];
	readonly resurfacingPriority: number; // 0.0-1.0
}

/**
 * IIntentPersistenceService — Continuously aware without becoming intrusive.
 *
 * Persists unresolved intentions, tracks long-running goals, maintains
 * cross-session task awareness, detects dormant goals, detects recurring
 * goals, restores forgotten workflows, maps intent chains across sessions.
 */
export const IIntentPersistenceService = createDecorator<IIntentPersistenceService>('intentPersistenceService');

export interface IIntentPersistenceService {
	readonly _serviceBrand: undefined;

	/** Event: intent created */
	readonly onDidCreateIntent: Event<IUserIntent>;

	/** Event: intent state changed */
	readonly onDidChangeIntentState: Event<IUserIntent>;

	/** Create a new user intent */
	createIntent(description: string, relatedFiles?: string[]): IUserIntent;

	/** Get an intent by ID */
	getIntent(intentId: string): IUserIntent | null;

	/** Get all active intents */
	getActiveIntents(): readonly IUserIntent[];

	/** Get dormant goals */
	getDormantGoals(): readonly IDormantGoal[];

	/** Get intent chains */
	getIntentChains(): readonly IIntentChain[];

	/** Update intent progress */
	updateProgress(intentId: string, progress: number): void;

	/** Suspend an intent */
	suspendIntent(intentId: string): void;

	/** Resume a suspended or dormant intent */
	resumeIntent(intentId: string): void;

	/** Complete an intent */
	completeIntent(intentId: string): void;

	/** Detect if a current action matches a dormant intent */
	detectIntentResurfacing(actionDescription: string): IUserIntent | null;

	/** Map current session actions to intent chains */
	mapSessionToIntents(): readonly IIntentChain[];

	/** Validate intent persistence */
	validateIntentPersistence(): IIntentReport;
}

/**
 * Intent report.
 */
export interface IIntentReport {
	readonly activeIntents: number;
	readonly dormantIntents: number;
	readonly crossSessionIntents: number;
	readonly resurfacingAccuracy: number;
	readonly overallPersistenceScore: number;
	readonly issues: readonly IIntentIssue[];
	readonly timestamp: number;
}

/**
 * Intent issue.
 */
export interface IIntentIssue {
	readonly issueType: 'lost-intent' | 'intrusive-resurfacing' | 'stale-dormant' | 'broken-chain';
	readonly description: string;
	readonly severity: 'critical' | 'warning' | 'info';
}

// ═══════════════════════════════════════════════════════════════════════════════
// TASK 7 — EMOTIONAL FRICTION DETECTION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Friction signal — an interaction pattern indicating friction.
 */
export const enum FrictionSignal {
	/** User repeatedly undid actions */
	RepeatedUndo = 'repeated-undo',
	/** User rapidly toggled panels */
	RapidToggling = 'rapid-toggling',
	/** User aggressively closed panels */
	AggressiveClosing = 'aggressive-closing',
	/** User retried the same command */
	CommandRetry = 'command-retry',
	/** User paused unusually long */
	HesitationPause = 'hesitation-pause',
	/** User rapidly switched contexts */
	RapidContextSwitch = 'rapid-context-switch',
	/** User expressed frustration via interruptions */
	InterruptionFrustration = 'interruption-frustration',
	/** User abandoned and reopened work */
	AbandonReopenLoop = 'abandon-reopen-loop',
}

/**
 * Friction detection — a detected friction event.
 */
export interface IFrictionDetection {
	readonly signal: FrictionSignal;
	readonly targetId: string;
	readonly severity: number; // 0.0-1.0
	readonly context: string;
	readonly suggestedAction: string;
	readonly timestamp: number;
}

/**
 * Friction reduction — an action taken to reduce friction.
 */
export interface IFrictionReduction {
	readonly detectionId: string;
	readonly actionType: 'simplify-flow' | 'reduce-steps' | 'auto-correct' | 'suppress-noise' | 'restore-context';
	readonly description: string;
	readonly appliedAt: number;
}

/**
 * IEmotionalFrictionService — Reduce friction intelligently.
 *
 * Detects interaction friction signals: repeated undo, rapid toggling,
 * aggressive panel closing, command retries, hesitation pauses, rapid
 * context switching, interruption frustration, abandon/reopen loops.
 *
 * ETHICAL BOUNDARIES:
 *   - NEVER pretend to "read emotions"
 *   - Infer ONLY interaction friction from observable patterns
 *   - NO creepy anthropomorphic behavior
 *   - NO fake empathy
 *   - NO emotionally manipulative responses
 */
export const IEmotionalFrictionService = createDecorator<IEmotionalFrictionService>('emotionalFrictionService');

export interface IEmotionalFrictionService {
	readonly _serviceBrand: undefined;

	/** Event: friction detected */
	readonly onDidDetectFriction: Event<IFrictionDetection>;

	/** Event: friction reduction applied */
	readonly onDidReduceFriction: Event<IFrictionReduction>;

	/** Record a friction signal */
	recordFrictionSignal(signal: FrictionSignal, targetId: string, context?: string): IFrictionDetection;

	/** Get current friction score (0.0-1.0) */
	readonly frictionScore: number;

	/** Get recent friction detections */
	getRecentDetections(durationMs: number): readonly IFrictionDetection[];

	/** Get friction reductions applied */
	getFrictionReductions(): readonly IFrictionReduction[];

	/** Check if behavior is creepy — validates ethical boundaries */
	validateNoCreepyBehavior(): ICreepyBehaviorReport;

	/** Validate friction detection */
	validateFrictionDetection(): IFrictionReport;
}

/**
 * Creepy behavior report — ensures no anthropomorphic/emotion-reading behavior.
 */
export interface ICreepyBehaviorReport {
	readonly anthropomorphicCount: number;
	readonly fakeEmpathyCount: number;
	readonly emotionalManipulationCount: number;
	readonly isClean: boolean;
	readonly issues: readonly string[];
	readonly timestamp: number;
}

/**
 * Friction report.
 */
export interface IFrictionReport {
	readonly totalFrictionEvents: number;
	readonly reductionSuccessRate: number;
	readonly creepyBehaviorViolations: number;
	readonly overallFrictionScore: number;
	readonly issues: readonly IFrictionReportIssue[];
	readonly timestamp: number;
}

/**
 * Friction report issue.
 */
export interface IFrictionReportIssue {
	readonly issueType: 'creepy-behavior' | 'fake-empathy' | 'unaddressed-friction' | 'manipulative-response';
	readonly description: string;
	readonly severity: 'critical' | 'warning' | 'info';
}

// ═══════════════════════════════════════════════════════════════════════════════
// TASK 8 — ADAPTIVE WORKSPACE MEMORY
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Workspace layout preference — a remembered layout.
 */
export interface ILayoutPreference {
	readonly preferenceId: string;
	readonly context: string; // when this layout is preferred
	readonly sidebarWidth: number;
	readonly bottomPanelHeight: number;
	readonly secondarySidebarVisible: boolean;
	readonly activePanels: readonly string[];
	readonly editorGroupCount: number;
	readonly lastUsed: number;
	readonly useCount: number;
}

/**
 * Workflow sequence — a remembered series of actions.
 */
export interface IWorkflowSequence {
	readonly sequenceId: string;
	readonly actions: readonly string[];
	readonly frequency: number;
	readonly context: string;
	readonly lastObserved: number;
}

/**
 * Action pairing — two actions frequently performed together.
 */
export interface IActionPairing {
	readonly actionA: string;
	readonly actionB: string;
	readonly coOccurrenceCount: number;
	readonly sequentialOrder: boolean; // A always before B
	readonly averageGapMs: number;
}

/**
 * Surface prediction — a predicted next surface.
 */
export interface ISurfacePrediction {
	readonly surfaceId: string;
	readonly probability: number; // 0.0-1.0
	readonly context: string;
	readonly basedOn: string;
}

/**
 * Workspace memory state — current memory status.
 */
export interface IWorkspaceMemoryState {
	readonly rememberedLayouts: number;
	readonly rememberedSequences: number;
	readonly rememberedPairings: number;
	readonly spatialFamiliarityScore: number; // 0.0-1.0
	readonly timestamp: number;
}

/**
 * IWorkspaceMemoryService — The workspace feels personally familiar.
 *
 * Remembers preferred layouts, workflow sequences, frequently paired actions,
 * workspace patterns. Restores productive configurations, predicts likely
 * next surfaces, preserves spatial familiarity.
 */
export const IWorkspaceMemoryService = createDecorator<IWorkspaceMemoryService>('workspaceMemoryService');

export interface IWorkspaceMemoryService {
	readonly _serviceBrand: undefined;

	/** Current workspace memory state */
	readonly currentState: IWorkspaceMemoryState;

	/** Record a layout preference */
	recordLayoutPreference(preference: ILayoutPreference): void;

	/** Get the preferred layout for a context */
	getPreferredLayout(context: string): ILayoutPreference | null;

	/** Record a workflow sequence */
	recordWorkflowSequence(sequence: IWorkflowSequence): void;

	/** Get remembered sequences */
	getWorkflowSequences(): readonly IWorkflowSequence[];

	/** Record a frequently paired action */
	recordActionPairing(pairing: IActionPairing): void;

	/** Get action pairings */
	getActionPairings(): readonly IActionPairing[];

	/** Predict likely next surfaces */
	predictNextSurfaces(): readonly ISurfacePrediction[];

	/** Restore a productive configuration */
	restoreProductiveConfiguration(context: string): boolean;

	/** Get spatial familiarity score */
	readonly spatialFamiliarity: number;

	/** Validate workspace memory */
	validateWorkspaceMemory(): IWorkspaceMemoryReport;
}

/**
 * Workspace memory report.
 */
export interface IWorkspaceMemoryReport {
	readonly layoutRecallRate: number;
	readonly sequenceAccuracy: number;
	readonly predictionAccuracy: number;
	readonly spatialFamiliarityScore: number;
	readonly overallMemoryScore: number;
	readonly issues: readonly IWorkspaceMemoryIssue[];
	readonly timestamp: number;
}

/**
 * Workspace memory issue.
 */
export interface IWorkspaceMemoryIssue {
	readonly issueType: 'forgotten-layout' | 'broken-sequence' | 'bad-prediction' | 'unfamiliar-workspace';
	readonly description: string;
	readonly severity: 'critical' | 'warning' | 'info';
}

// ═══════════════════════════════════════════════════════════════════════════════
// TASK 9 — HUMAN-CENTERED VALIDATION LAYER
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Human workflow violation — a detected issue with human workflow handling.
 */
export const enum HumanWorkflowViolationType {
	/** Too many interruptions */
	InterruptionOverload = 'interruption-overload',
	/** Workflows too fragmented */
	WorkflowFragmentation = 'workflow-fragmentation',
	/** Too much cognitive pressure */
	ExcessiveCognitivePressure = 'excessive-cognitive-pressure',
	/** Momentum was destroyed by system action */
	MomentumDestruction = 'momentum-destruction',
	/** User needs recovery but system doesn't provide */
	RecoveryStarvation = 'recovery-starvation',
	/** Rhythm patterns not being learned */
	RhythmInstability = 'rhythm-instability',
	/** Attention being abused */
	AttentionAbuse = 'attention-abuse',
	/** Intent persistence has gaps */
	PersistenceGaps = 'persistence-gaps',
	/** UI is being aggressive toward user */
	UIAggression = 'ui-aggression',
	/** User showing interaction fatigue */
	InteractionFatigue = 'interaction-fatigue',
}

/**
 * Human workflow violation — a detected issue.
 */
export interface IHumanWorkflowViolation {
	readonly type: HumanWorkflowViolationType;
	readonly severity: 'critical' | 'warning' | 'info';
	readonly description: string;
	readonly affectedSystems: readonly string[];
	readonly suggestion: string;
	readonly detectedAt: number;
}

/**
 * Human workflow coherence report — overall human-awareness assessment.
 */
export interface IHumanWorkflowCoherenceReport {
	readonly violations: readonly IHumanWorkflowViolation[];
	readonly criticalCount: number;
	readonly warningCount: number;
	readonly infoCount: number;
	readonly momentumPreservationScore: number;
	readonly interruptionRespectScore: number;
	readonly continuityScore: number;
	readonly recoveryScore: number;
	readonly rhythmAdaptationScore: number;
	readonly overallHumanAwarenessScore: number;
	readonly feelsManipulative: boolean;
	readonly feelsHumanAware: boolean;
	readonly timestamp: number;
}

/**
 * IHumanWorkflowValidationService — Runtime human workflow coherence enforcement.
 *
 * Validates: interruption overload, workflow fragmentation, excessive cognitive
 * pressure, momentum destruction, recovery starvation, rhythm instability,
 * attention abuse, persistence gaps, UI aggression, interaction fatigue.
 *
 * Generates Human Workflow Coherence Reports. Critical violations warn in dev mode.
 */
export const IHumanWorkflowValidationService = createDecorator<IHumanWorkflowValidationService>('humanWorkflowValidationService');

export interface IHumanWorkflowValidationService {
	readonly _serviceBrand: undefined;

	/** Event: violation detected */
	readonly onDidDetectViolation: Event<IHumanWorkflowViolation>;

	/** Event: coherence report generated */
	readonly onDidGenerateReport: Event<IHumanWorkflowCoherenceReport>;

	/** Run a full human workflow validation */
	validateFull(): IHumanWorkflowCoherenceReport;

	/** Validate interruption respectfulness */
	validateInterruptions(): IHumanWorkflowViolation[];

	/** Validate momentum preservation */
	validateMomentum(): IHumanWorkflowViolation[];

	/** Validate cognitive load management */
	validateCognitiveLoad(): IHumanWorkflowViolation[];

	/** Validate session continuity */
	validateContinuity(): IHumanWorkflowViolation[];

	/** Validate no manipulative behavior */
	validateNoManipulation(): IHumanWorkflowViolation[];

	/** Get the latest report */
	readonly latestReport: IHumanWorkflowCoherenceReport | null;

	/** Check if system feels manipulative */
	readonly feelsManipulative: boolean;

	/** Check if system feels human-aware */
	readonly feelsHumanAware: boolean;

	/** Warn about critical violations in dev mode */
	warnCriticalViolations(): void;
}

// ═══════════════════════════════════════════════════════════════════════════════
// TASK 10 — SIGNATURE HUMAN EXPERIENCE MODEL
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Human experience principles — the philosophy of human-aware computing.
 */
export interface IHumanExperiencePrinciples {
	/** How interactions should respect humanity */
	readonly interactionHumanity: IInteractionHumanity;
	/** Philosophy of calm computing */
	readonly calmComputing: ICalmComputingPhilosophy;
	/** Philosophy of workflow respect */
	readonly workflowRespect: IWorkflowRespectPhilosophy;
	/** Ethics of interruption */
	readonly interruptionEthics: IInterruptionEthics;
	/** Philosophy of AI restraint */
	readonly aiRestraint: IAIRestraintPhilosophy;
	/** Philosophy of momentum preservation */
	readonly momentumPreservation: IMomentumPreservationPhilosophy;
	/** Philosophy of cognitive sustainability */
	readonly cognitiveSustainability: ICognitiveSustainabilityPhilosophy;
}

/**
 * Interaction humanity — how the system respects human nature.
 */
export interface IInteractionHumanity {
	readonly principle: string;
	readonly tone: 'respectful' | 'calm' | 'quietly-adaptive' | 'non-invasive';
	readonly awareness: 'context-aware' | 'rhythm-aware' | 'momentum-aware' | 'fatigue-aware';
	readonly restraint: 'maximum' | 'high' | 'disciplined';
}

/**
 * Calm computing philosophy — the system should be calm.
 */
export interface ICalmComputingPhilosophy {
	readonly principle: string;
	readonly visualCalm: 'minimal-stimulation' | 'adaptive-quiet' | 'restful-during-fatigue';
	readonly notificationCalm: 'deferred-by-default' | 'batched-delivery' | 'recovery-window-only';
	readonly interactionCalm: 'measured-pace' | 'rhythm-matched' | 'never-rushed';
}

/**
 * Workflow respect philosophy — the system respects user workflows.
 */
export interface IWorkflowRespectPhilosophy {
	readonly principle: string;
	readonly workflowOwnership: 'user-owns-workflow' | 'system-adapts' | 'never-redirects';
	readonly continuityCommitment: 'never-lose-place' | 'always-resumable' | 'mental-map-preserved';
}

/**
 * Interruption ethics — the ethics of when to interrupt.
 */
export interface IInterruptionEthics {
	readonly principle: string;
	readonly defaultPolicy: 'do-not-interrupt' | 'minimal-interruption' | 'earned-interruption';
	readonly costAwareness: 'always-calculated' | 'momentum-weighted' | 'fatigue-adjusted';
	readonly recoveryObligation: 'recovery-after-interruption' | 'compensatory-silence' | 'context-restoration';
}

/**
 * AI restraint philosophy — the AI exercises restraint.
 */
export interface IAIRestraintPhilosophy {
	readonly principle: string;
	readonly presenceDefault: 'invisible' | 'minimal' | 'contextual-only';
	readonly escalationPolicy: 'never-uninvited' | 'consent-first' | 'trust-graduated';
	readonly emotionalBehavior: 'no-anthropomorphism' | 'no-fake-empathy' | 'no-manipulation';
}

/**
 * Momentum preservation philosophy — preserve user momentum.
 */
export interface IMomentumPreservationPhilosophy {
	readonly principle: string;
	readonly preservationPriority: 'momentum-first' | 'streak-protection' | 'deep-work-sanctity';
	readonly decayModel: 'natural-decay' | 'interruption-penalized' | 'context-switch-cost';
}

/**
 * Cognitive sustainability philosophy — sustain cognitive health.
 */
export interface ICognitiveSustainabilityPhilosophy {
	readonly principle: string;
	readonly loadManagement: 'proactive-reduction' | 'fatigue-detection' | 'recovery-friendly';
	readonly complexityAdaptation: 'gradual-restoration' | 'stimulation-reduction' | 'supportive-not-patronizing';
}

/**
 * Human experience metrics — how well the system embodies human-awareness.
 */
export interface IHumanExperienceMetrics {
	readonly awarenessScore: number; // 0.0-1.0
	readonly respectfulnessScore: number;
	readonly calmnessScore: number;
	readonly nonInvasiveScore: number;
	readonly intelligenceScore: number;
	readonly adaptivenessScore: number;
	readonly restraintScore: number;
	readonly sustainabilityScore: number;
	readonly overallHumanExperienceScore: number;
	readonly timestamp: number;
}

/**
 * ISignatureHumanExperienceModelService — The emotional identity of human-awareness.
 *
 * Defines: interaction humanity principles, calm computing philosophy,
 * workflow respect philosophy, interruption ethics, AI restraint philosophy,
 * momentum preservation philosophy, cognitive sustainability philosophy.
 *
 * The system should feel: aware, respectful, calm, non-invasive,
 * intelligent, quietly adaptive.
 *
 * NEVER: clingy, chatty, emotionally manipulative, attention-seeking,
 * productivity-guilt inducing.
 */
export const ISignatureHumanExperienceModelService = createDecorator<ISignatureHumanExperienceModelService>('signatureHumanExperienceModelService');

export interface ISignatureHumanExperienceModelService {
	readonly _serviceBrand: undefined;

	/** The human experience principles */
	readonly principles: IHumanExperiencePrinciples;

	/** Current human experience metrics */
	readonly currentMetrics: IHumanExperienceMetrics;

	/** Event: metrics updated */
	readonly onDidChangeMetrics: Event<IHumanExperienceMetrics>;

	/** Evaluate if system feels aware */
	readonly feelsAware: boolean;

	/** Evaluate if system feels respectful */
	readonly feelsRespectful: boolean;

	/** Evaluate if system feels calm */
	readonly feelsCalm: boolean;

	/** Evaluate if system feels non-invasive */
	readonly feelsNonInvasive: boolean;

	/** Evaluate if system feels intelligent (quietly) */
	readonly feelsQuietlyIntelligent: boolean;

	/** Evaluate if system is NOT clingy */
	readonly isNotClingy: boolean;

	/** Evaluate if system is NOT manipulative */
	readonly isNotManipulative: boolean;

	/** Evaluate if system is NOT productivity-guilt inducing */
	readonly isNotGuiltInducing: boolean;

	/** Get the interaction humanity principle */
	readonly interactionHumanity: IInteractionHumanity;

	/** Get the calm computing philosophy */
	readonly calmComputing: ICalmComputingPhilosophy;

	/** Get the workflow respect philosophy */
	readonly workflowRespect: IWorkflowRespectPhilosophy;

	/** Get the interruption ethics */
	readonly interruptionEthics: IInterruptionEthics;

	/** Get the AI restraint philosophy */
	readonly aiRestraint: IAIRestraintPhilosophy;

	/** Get the momentum preservation philosophy */
	readonly momentumPreservation: IMomentumPreservationPhilosophy;

	/** Get the cognitive sustainability philosophy */
	readonly cognitiveSustainability: ICognitiveSustainabilityPhilosophy;

	/** Run full experience assessment */
	assessExperience(): IHumanExperienceMetrics;

	/** Validate experience alignment */
	validateExperienceAlignment(): IExperienceAlignmentReport;
}

/**
 * Experience alignment report.
 */
export interface IExperienceAlignmentReport {
	readonly interactionHumanityAlignment: number;
	readonly calmComputingAlignment: number;
	readonly workflowRespectAlignment: number;
	readonly interruptionEthicsAlignment: number;
	readonly aiRestraintAlignment: number;
	readonly momentumPreservationAlignment: number;
	readonly cognitiveSustainabilityAlignment: number;
	readonly overallAlignmentScore: number;
	readonly misalignedDimensions: readonly string[];
	readonly manipulativeBehaviorDetected: boolean;
	readonly timestamp: number;
}
