/*---------------------------------------------------------------------------------------------
 *  Productization, Deployment & Operational Readiness — Phase 20
 *  Real Vibecode — AI-Native IDE
 *
 *  Transforms the system from a fully built AI operating system into a
 *  production-ready commercial platform. Focuses on deployment, runtime
 *  operations, packaging, updates, telemetry, recovery, monitoring,
 *  and production lifecycle management.
 *
 *  PRINCIPLES:
 *    1.  The system must be deployable in any environment
 *    2.  Security boundaries must be enforced at all times
 *    3.  Updates must be safe, reversible, and verifiable
 *    4.  Telemetry must respect privacy — no creepy tracking
 *    5.  The system must NEVER fully brick
 *    6.  Production configs are immutable at runtime
 *    7.  Packaging must be integrity-verified
 *    8.  Operational analytics are system-only, never user surveillance
 *    9.  Recovery must restore stability without data loss
 *   10.  Production readiness is measured, not assumed
 *
 *  Tasks:
 *    1.  Production Deployment Engine
 *    2.  Security & Permission Hardening
 *    3.  Update & Version Management System
 *    4.  Telemetry Discipline System
 *    5.  Runtime Monitoring Engine
 *    6.  Recovery & Failsafe System
 *    7.  Production Configuration System
 *    8.  Distribution & Packaging System
 *    9.  Operational Analytics Engine
 *   10.  Final Production Readiness Validator
 *--------------------------------------------------------------------------------------------*/

import { Event } from '../../../../base/common/event.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';

// ═══════════════════════════════════════════════════════════════════════════════
// SHARED TYPES — Production & Operations Primitives
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Deployment profile — the target deployment environment.
 */
export const enum DeploymentProfile {
	/** Development — full debugging, no restrictions */
	Development = 'development',
	/** Staging — production-like with extra logging */
	Staging = 'staging',
	/** Production — hardened, restricted, optimized */
	Production = 'production',
	/** Offline — no network, local-only operation */
	Offline = 'offline',
	/** Enterprise — locked down, compliance-focused */
	Enterprise = 'enterprise',
}

/**
 * Deployment status — current state of deployment.
 */
export const enum DeploymentStatus {
	/** Not deployed */
	None = 'none',
	/** Booting up */
	Booting = 'booting',
	/** Validating runtime */
	Validating = 'validating',
	/** Running normally */
	Running = 'running',
	/** Degraded but functional */
	Degraded = 'degraded',
	/** Recovery mode active */
	Recovery = 'recovery',
	/** Shutting down */
	ShuttingDown = 'shutting-down',
	/** Failed to deploy */
	Failed = 'failed',
}

/**
 * Permission level — runtime capability restriction.
 */
export const enum PermissionLevel {
	/** Full unrestricted access — development only */
	Unrestricted = 'unrestricted',
	/** Standard production permissions */
	Standard = 'standard',
	/** Restricted — limited capabilities */
	Restricted = 'restricted',
	/** Locked — minimal capabilities */
	Locked = 'locked',
	/** Quarantined — suspected compromise */
	Quarantined = 'quarantined',
}

/**
 * Security escalation type — how a security boundary is crossed.
 */
export const enum EscalationType {
	/** Horizontal — same layer, different domain */
	Horizontal = 'horizontal',
	/** Vertical — crossing layer boundaries */
	Vertical = 'vertical',
	/** Privilege — elevating permission level */
	Privilege = 'privilege',
	/** Resource — accessing restricted resources */
	Resource = 'resource',
}

/**
 * Update phase — the stage of an update lifecycle.
 */
export const enum UpdatePhase {
	/** Checking for updates */
	Checking = 'checking',
	/** Downloading update */
	Downloading = 'downloading',
	/** Verifying integrity */
	Verifying = 'verifying',
	/** Preparing installation */
	Preparing = 'preparing',
	/** Installing update */
	Installing = 'installing',
	/** Validating post-install */
	Validating = 'validating',
	/** Rolling back failed update */
	RollingBack = 'rolling-back',
	/** Update complete */
	Complete = 'complete',
}

/**
 * Telemetry category — what kind of telemetry data.
 */
export const enum TelemetryCategory {
	/** System health metrics */
	SystemHealth = 'system-health',
	/** Performance metrics */
	Performance = 'performance',
	/** Error and crash data */
	ErrorCrash = 'error-crash',
	/** Feature reliability */
	FeatureReliability = 'feature-reliability',
	/** Deployment metrics */
	Deployment = 'deployment',
}

/**
 * Telemetry consent level — how much telemetry is allowed.
 */
export const enum TelemetryConsentLevel {
	/** No telemetry at all */
	None = 'none',
	/** Only crash and error data */
	CrashOnly = 'crash-only',
	/** System health and performance */
	Standard = 'standard',
	/** Full system analytics (no user data) */
	Full = 'full',
}

/**
 * Monitoring dimension — what aspect of runtime to monitor.
 */
export const enum MonitoringDimension {
	/** Service health status */
	ServiceHealth = 'service-health',
	/** Memory usage and stability */
	MemoryStability = 'memory-stability',
	/** Signal bus integrity */
	SignalIntegrity = 'signal-integrity',
	/** Execution latency */
	ExecutionLatency = 'execution-latency',
	/** Cross-layer coherence */
	CrossLayerCoherence = 'cross-layer-coherence',
}

/**
 * Recovery mode — how the system recovers.
 */
export const enum RecoveryMode {
	/** No recovery needed */
	None = 'none',
	/** Automatic self-healing */
	AutoHeal = 'auto-heal',
	/** Partial subsystem restart */
	PartialRestart = 'partial-restart',
	/** Full restart of AI kernel */
	KernelRestart = 'kernel-restart',
	/** Safe mode with minimal services */
	SafeMode = 'safe-mode',
	/** Rollback to last known-good state */
	Rollback = 'rollback',
	/** Emergency recovery from backup */
	EmergencyRecovery = 'emergency-recovery',
}

/**
 * Configuration mutability — whether a config can change.
 */
export const enum ConfigurationMutability {
	/** Can be changed at any time */
	Mutable = 'mutable',
	/** Can only change before deployment lock */
	PreLock = 'pre-lock',
	/** Cannot change after initial set */
	Immutable = 'immutable',
	/** Cannot change, ever */
	Critical = 'critical',
}

/**
 * Packaging integrity status — verification result.
 */
export const enum PackagingIntegrity {
	/** Verified — all checks pass */
	Verified = 'verified',
	/** Warning — minor issues detected */
	Warning = 'warning',
	/** Failed — integrity compromised */
	Failed = 'failed',
	/** Unknown — not yet verified */
	Unknown = 'unknown',
}

/**
 * Production readiness dimension — what aspect of readiness to assess.
 */
export const enum ReadinessDimension {
	/** Deployment readiness */
	Deployment = 'deployment',
	/** Operational readiness */
	Operational = 'operational',
	/** Reliability confidence */
	Reliability = 'reliability',
	/** Maintainability confidence */
	Maintainability = 'maintainability',
	/** Enterprise readiness */
	Enterprise = 'enterprise',
	/** Security readiness */
	Security = 'security',
}

/**
 * Deployment profile configuration.
 */
export interface IDeploymentProfileConfig {
	readonly profile: DeploymentProfile;
	readonly permissionLevel: PermissionLevel;
	readonly telemetryConsent: TelemetryConsentLevel;
	readonly debugModeEnabled: boolean;
	readonly networkAccess: boolean;
	readonly autoUpdate: boolean;
	readonly recoveryMode: RecoveryMode;
	readonly maxConcurrentExecutions: number;
	readonly logLevel: 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'none';
}

/**
 * Deployment validation result.
 */
export interface IDeploymentValidation {
	readonly validationId: string;
	readonly profile: DeploymentProfile;
	readonly status: DeploymentStatus;
	readonly bootChecksPassed: number;
	readonly bootChecksTotal: number;
	readonly capabilityVerificationsPassed: number;
	readonly capabilityVerificationsTotal: number;
	readonly issues: readonly IDeploymentIssue[];
	readonly bootTimeMs: number;
	readonly timestamp: number;
}

/**
 * Deployment issue.
 */
export interface IDeploymentIssue {
	readonly issueType: 'boot-failure' | 'capability-missing' | 'profile-mismatch' | 'config-invalid' | 'permission-denied';
	readonly description: string;
	readonly severity: 'critical' | 'warning' | 'info';
	readonly resolution: string;
}

/**
 * Security boundary — a defined security boundary.
 */
export interface ISecurityBoundary {
	readonly boundaryId: string;
	readonly boundaryName: string;
	readonly sourceLayer: string;
	readonly targetLayer: string;
	readonly allowedEscalations: readonly EscalationType[];
	readonly deniedEscalations: readonly EscalationType[];
	readonly permissionRequired: PermissionLevel;
	readonly description: string;
}

/**
 * Security audit result.
 */
export interface ISecurityAuditResult {
	readonly auditId: string;
	readonly boundariesEnforced: number;
	readonly unrestrictedPaths: number;
	readonly unsafeEscalations: number;
	readonly isSecure: boolean;
	readonly issues: readonly ISecurityIssue[];
	readonly timestamp: number;
}

/**
 * Security issue.
 */
export interface ISecurityIssue {
	readonly issueType: 'unrestricted-path' | 'unsafe-escalation' | 'permission-bypass' | 'isolation-failure' | 'privilege-escalation';
	readonly description: string;
	readonly severity: 'critical' | 'warning' | 'info';
	readonly remediation: string;
}

/**
 * Version info — semantic version tracking.
 */
export interface IVersionInfo {
	readonly major: number;
	readonly minor: number;
	readonly patch: number;
	readonly phase: number;
	readonly buildNumber: number;
	readonly commitHash: string;
	readonly timestamp: number;
}

/**
 * Update package — an update to be installed.
 */
export interface IUpdatePackage {
	readonly packageId: string;
	readonly fromVersion: IVersionInfo;
	readonly toVersion: IVersionInfo;
	readonly phase: UpdatePhase;
	readonly compatibilityVerified: boolean;
	readonly migrationRequired: boolean;
	readonly rollbackPossible: boolean;
	readonly sizeBytes: number;
	readonly checksum: string;
}

/**
 * Update result — outcome of an update.
 */
export interface IUpdateResult {
	readonly updateId: string;
	readonly packageId: string;
	readonly success: boolean;
	readonly phase: UpdatePhase;
	readonly previousVersion: IVersionInfo;
	readonly newVersion: IVersionInfo;
	readonly rollbackUsed: boolean;
	readonly issues: readonly string[];
	readonly durationMs: number;
	readonly timestamp: number;
}

/**
 * Telemetry governance rule.
 */
export interface ITelemetryRule {
	readonly ruleId: string;
	readonly category: TelemetryCategory;
	readonly consentRequired: TelemetryConsentLevel;
	readonly dataTypes: readonly string[];
	readonly retentionDays: number;
	readonly anonymizationRequired: boolean;
	readonly userIdentifiable: boolean;
	readonly description: string;
}

/**
 * Telemetry governance report.
 */
export interface ITelemetryGovernanceReport {
	readonly totalRules: number;
	readonly compliantRules: number;
	readonly privacyViolations: number;
	readonly noisyAnalytics: number;
	readonly creepyTracking: number;
	readonly workflowSpying: number;
	readonly isCompliant: boolean;
	readonly rules: readonly ITelemetryRule[];
	readonly issues: readonly ITelemetryIssue[];
	readonly timestamp: number;
}

/**
 * Telemetry issue.
 */
export interface ITelemetryIssue {
	readonly issueType: 'privacy-violation' | 'noisy-analytics' | 'creepy-tracking' | 'workflow-spying' | 'excessive-logging';
	readonly description: string;
	readonly severity: 'critical' | 'warning' | 'info';
	readonly remediation: string;
}

/**
 * Runtime health snapshot — point-in-time health.
 */
export interface IRuntimeHealthSnapshot {
	readonly snapshotId: string;
	readonly servicesHealthy: number;
	readonly servicesTotal: number;
	readonly memoryUsagePercent: number;
	readonly signalBusQueueDepth: number;
	readonly averageExecutionLatencyMs: number;
	readonly anomaliesDetected: number;
	readonly dimensions: ReadonlyMap<MonitoringDimension, number>; // 0-100 score
	readonly timestamp: number;
}

/**
 * Runtime monitoring report.
 */
export interface IRuntimeMonitoringReport {
	readonly currentHealth: IRuntimeHealthSnapshot;
	readonly healthHistory: readonly IRuntimeHealthSnapshot[];
	readonly anomalies: readonly IRuntimeAnomaly[];
	readonly isHealthy: boolean;
	readonly timestamp: number;
}

/**
 * Runtime anomaly.
 */
export interface IRuntimeAnomaly {
	readonly anomalyId: string;
	readonly dimension: MonitoringDimension;
	readonly description: string;
	readonly severity: 'critical' | 'warning' | 'info';
	readonly detectedAt: number;
	readonly autoRemediated: boolean;
}

/**
 * Recovery action — a recovery step.
 */
export interface IRecoveryAction {
	readonly actionId: string;
	readonly mode: RecoveryMode;
	readonly description: string;
	readonly affectedServices: readonly string[];
	readonly dataPreserved: boolean;
	readonly estimatedRecoveryTimeMs: number;
	readonly riskLevel: 'low' | 'medium' | 'high';
}

/**
 * Recovery result — outcome of a recovery.
 */
export interface IRecoveryResult {
	readonly recoveryId: string;
	readonly mode: RecoveryMode;
	readonly systemRestored: boolean;
	readonly dataPreserved: boolean;
	readonly servicesRecovered: number;
	readonly servicesTotal: number;
	readonly recoveryTimeMs: number;
	readonly issues: readonly string[];
	readonly timestamp: number;
}

/**
 * Recovery failsafe report.
 */
export interface IRecoveryFailsafeReport {
	readonly recoveryModesAvailable: number;
	readonly lastRecoveryMode: RecoveryMode | null;
	readonly systemNeverBricked: boolean;
	readonly recoveryTestsPassed: number;
	readonly issues: readonly IRecoveryIssue[];
	readonly timestamp: number;
}

/**
 * Recovery issue.
 */
export interface IRecoveryIssue {
	readonly issueType: 'unrecoverable-state' | 'data-loss' | 'partial-recovery' | 'infinite-recovery-loop';
	readonly description: string;
	readonly severity: 'critical' | 'warning' | 'info';
}

/**
 * Configuration entry — a single configuration value.
 */
export interface IConfigurationEntry {
	readonly key: string;
	readonly value: unknown;
	readonly mutability: ConfigurationMutability;
	readonly scope: 'global' | 'profile' | 'enterprise' | 'override';
	readonly description: string;
	readonly lastModified: number;
}

/**
 * Configuration snapshot — full config state.
 */
export interface IConfigurationSnapshot {
	readonly snapshotId: string;
	readonly profile: DeploymentProfile;
	readonly entries: readonly IConfigurationEntry[];
	readonly isImmutable: boolean;
	readonly isLocked: boolean;
	readonly timestamp: number;
}

/**
 * Configuration validation report.
 */
export interface IConfigurationValidationReport {
	readonly totalEntries: number;
	readonly immutableEntries: number;
	readonly mutableEntries: number;
	readonly violations: readonly IConfigurationViolation[];
	readonly isProductionSafe: boolean;
	readonly timestamp: number;
}

/**
 * Configuration violation.
 */
export interface IConfigurationViolation {
	readonly key: string;
	readonly violationType: 'immutable-modified' | 'critical-changed' | 'scope-escalation' | 'profile-mismatch';
	readonly description: string;
	readonly severity: 'critical' | 'warning' | 'info';
}

/**
 * Packaging verification result.
 */
export interface IPackagingVerification {
	readonly verificationId: string;
	readonly integrity: PackagingIntegrity;
	readonly buildIntegrityVerified: boolean;
	readonly runtimeDepsValidated: boolean;
	readonly offlineBundleVerified: boolean;
	readonly releaseArtifactConsistent: boolean;
	readonly issues: readonly IPackagingIssue[];
	readonly timestamp: number;
}

/**
 * Packaging issue.
 */
export interface IPackagingIssue {
	readonly issueType: 'build-failure' | 'dep-missing' | 'integrity-mismatch' | 'offline-incomplete' | 'artifact-inconsistent';
	readonly description: string;
	readonly severity: 'critical' | 'warning' | 'info';
}

/**
 * Operational metrics — system analytics (NOT user analytics).
 */
export interface IOperationalMetrics {
	readonly deploymentStabilityScore: number; // 0-100
	readonly crashRecoveryRate: number; // 0.0-1.0
	readonly updateSuccessRate: number; // 0.0-1.0
	readonly featureReliabilityScore: number; // 0-100
	readonly degradationTrend: 'improving' | 'stable' | 'degrading';
	readonly uptimePercent: number; // 0-100
	readonly timestamp: number;
}

/**
 * Operational analytics report.
 */
export interface IOperationalAnalyticsReport {
	readonly metrics: IOperationalMetrics;
	readonly historicalMetrics: readonly IOperationalMetrics[];
	readonly trends: readonly IOperationalTrend[];
	readonly isHealthy: boolean;
	readonly timestamp: number;
}

/**
 * Operational trend.
 */
export interface IOperationalTrend {
	readonly metric: string;
	readonly direction: 'improving' | 'stable' | 'degrading';
	readonly velocity: number;
	readonly description: string;
}

/**
 * Production readiness score — global assessment.
 */
export interface IProductionReadinessScore {
	readonly overallScore: number; // 0-100
	readonly deploymentReadiness: number; // 0-100
	readonly operationalReadiness: number; // 0-100
	readonly reliabilityConfidence: number; // 0-100
	readonly maintainabilityConfidence: number; // 0-100
	readonly enterpriseReadiness: number; // 0-100
	readonly securityReadiness: number; // 0-100
	readonly classification: 'production-grade' | 'near-production' | 'pre-production' | 'prototype' | 'unstable';
	readonly isShippable: boolean;
	readonly timestamp: number;
}

/**
 * Production readiness report.
 */
export interface IProductionReadinessReport {
	readonly score: IProductionReadinessScore;
	readonly dimensionScores: ReadonlyMap<ReadinessDimension, number>;
	readonly blockers: readonly IReadinessBlocker[];
	readonly recommendations: readonly string[];
	readonly isReady: boolean;
	readonly timestamp: number;
}

/**
 * Readiness blocker.
 */
export interface IReadinessBlocker {
	readonly dimension: ReadinessDimension;
	readonly description: string;
	readonly severity: 'critical' | 'warning' | 'info';
	readonly remediation: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// TASK 1 — PRODUCTION DEPLOYMENT ENGINE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * IProductionDeploymentService — Manages deployment lifecycle.
 *
 * Handles environment detection, deployment mode switching,
 * production boot validation, runtime capability verification,
 * and deployment profile management.
 */
export const IProductionDeploymentService = createDecorator<IProductionDeploymentService>('productionDeploymentService');

export interface IProductionDeploymentService {
	readonly _serviceBrand: undefined;

	/** Event: deployment status changed */
	readonly onDidChangeDeploymentStatus: Event<DeploymentStatus>;

	/** Event: deployment profile changed */
	readonly onDidChangeProfile: Event<DeploymentProfile>;

	/** Detect the current environment */
	detectEnvironment(): DeploymentProfile;

	/** Get current deployment status */
	readonly currentStatus: DeploymentStatus;

	/** Get current deployment profile */
	readonly currentProfile: DeploymentProfile;

	/** Switch deployment profile */
	switchProfile(profile: DeploymentProfile): IDeploymentValidation;

	/** Validate current deployment */
	validateDeployment(): IDeploymentValidation;

	/** Get deployment profile configuration */
	getProfileConfig(profile: DeploymentProfile): IDeploymentProfileConfig;

	/** Boot the system for a profile */
	bootForProfile(profile: DeploymentProfile): IDeploymentValidation;

	/** Validate production deployment */
	validateProductionDeployment(): IDeploymentValidation;
}

// ═══════════════════════════════════════════════════════════════════════════════
// TASK 2 — SECURITY & PERMISSION HARDENING
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * ISecurityBoundaryService — Enforces security boundaries at runtime.
 *
 * Enforces permission boundaries, validates process isolation,
 * prevents unsafe execution, restricts runtime capabilities,
 * and protects against escalation attacks.
 */
export const ISecurityBoundaryService = createDecorator<ISecurityBoundaryService>('securityBoundaryService');

export interface ISecurityBoundaryService {
	readonly _serviceBrand: undefined;

	/** Event: security violation detected */
	readonly onDidDetectViolation: Event<ISecurityIssue>;

	/** Define a security boundary */
	defineBoundary(boundary: ISecurityBoundary): void;

	/** Check if an escalation is allowed */
	isEscalationAllowed(source: string, target: string, type: EscalationType): boolean;

	/** Get current permission level */
	readonly currentPermissionLevel: PermissionLevel;

	/** Set permission level (only downward allowed in production) */
	setPermissionLevel(level: PermissionLevel): boolean;

	/** Run security audit */
	runSecurityAudit(): ISecurityAuditResult;

	/** Get all defined boundaries */
	getBoundaries(): readonly ISecurityBoundary[];

	/** Validate no unrestricted paths exist */
	validateNoUnrestrictedPaths(): boolean;

	/** Validate no unsafe cross-layer escalation */
	validateNoUnsafeEscalation(): boolean;

	/** Validate security hardening */
	validateSecurityHardening(): ISecurityAuditResult;
}

// ═══════════════════════════════════════════════════════════════════════════════
// TASK 3 — UPDATE & VERSION MANAGEMENT SYSTEM
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * IUpdateLifecycleService — Manages update lifecycle.
 *
 * Tracks semantic versions, validates migrations, checks compatibility,
 * supports phased rollout, and enables rollback.
 */
export const IUpdateLifecycleService = createDecorator<IUpdateLifecycleService>('updateLifecycleService');

export interface IUpdateLifecycleService {
	readonly _serviceBrand: undefined;

	/** Event: update phase changed */
	readonly onDidChangeUpdatePhase: Event<UpdatePhase>;

	/** Event: update completed */
	readonly onDidCompleteUpdate: Event<IUpdateResult>;

	/** Get current version */
	readonly currentVersion: IVersionInfo;

	/** Check for available updates */
	checkForUpdates(): IUpdatePackage | null;

	/** Install an update */
	installUpdate(pkg: IUpdatePackage): IUpdateResult;

	/** Rollback to previous version */
	rollback(): IUpdateResult | null;

	/** Validate migration from one version to another */
	validateMigration(from: IVersionInfo, to: IVersionInfo): boolean;

	/** Get update history */
	getUpdateHistory(): readonly IUpdateResult[];

	/** Check compatibility */
	isCompatible(from: IVersionInfo, to: IVersionInfo): boolean;

	/** Validate update lifecycle */
	validateUpdateLifecycle(): IUpdateLifecycleReport;
}

/**
 * Update lifecycle report.
 */
export interface IUpdateLifecycleReport {
	readonly currentVersion: IVersionInfo;
	readonly updatesApplied: number;
	readonly rollbacksPerformed: number;
	readonly rollbackSuccessRate: number; // 0.0-1.0
	readonly migrationValidationsPassed: boolean;
	readonly issues: readonly IUpdateIssue[];
	readonly timestamp: number;
}

/**
 * Update issue.
 */
export interface IUpdateIssue {
	readonly issueType: 'irreversible-update' | 'migration-failure' | 'compatibility-mismatch' | 'rollback-failure';
	readonly description: string;
	readonly severity: 'critical' | 'warning' | 'info';
}

// ═══════════════════════════════════════════════════════════════════════════════
// TASK 4 — TELEMETRY DISCIPLINE SYSTEM
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * ITelemetryGovernanceService — Governs telemetry ethics.
 *
 * Defines telemetry ethics, prevents noisy analytics, limits data
 * collection, enforces privacy-safe metrics, and maintains production
 * observability discipline. NO creepy tracking. NO workflow spying.
 */
export const ITelemetryGovernanceService = createDecorator<ITelemetryGovernanceService>('telemetryGovernanceService');

export interface ITelemetryGovernanceService {
	readonly _serviceBrand: undefined;

	/** Event: telemetry violation detected */
	readonly onDidDetectViolation: Event<ITelemetryIssue>;

	/** Get current consent level */
	readonly currentConsentLevel: TelemetryConsentLevel;

	/** Set consent level (only downward in production) */
	setConsentLevel(level: TelemetryConsentLevel): void;

	/** Check if a telemetry collection is allowed */
	isCollectionAllowed(category: TelemetryCategory): boolean;

	/** Register a telemetry governance rule */
	registerRule(rule: ITelemetryRule): void;

	/** Get all governance rules */
	getRules(): readonly ITelemetryRule[];

	/** Validate telemetry compliance */
	validateTelemetryCompliance(): ITelemetryGovernanceReport;

	/** Check for privacy violations */
	checkPrivacyViolations(): readonly ITelemetryIssue[];

	/** Check for noisy analytics */
	checkNoisyAnalytics(): readonly ITelemetryIssue[];

	/** Validate telemetry governance */
	validateTelemetryGovernance(): ITelemetryGovernanceReport;
}

// ═══════════════════════════════════════════════════════════════════════════════
// TASK 5 — RUNTIME MONITORING ENGINE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * IRuntimeMonitoringService — Monitors runtime health.
 *
 * Monitors service health, tracks runtime anomalies, detects memory
 * instability, monitors signal integrity, and observes execution latency.
 * Produces a unified operational dashboard model.
 */
export const IRuntimeMonitoringService = createDecorator<IRuntimeMonitoringService>('runtimeMonitoringService');

export interface IRuntimeMonitoringService {
	readonly _serviceBrand: undefined;

	/** Event: anomaly detected */
	readonly onDidDetectAnomaly: Event<IRuntimeAnomaly>;

	/** Event: health snapshot updated */
	readonly onDidChangeHealth: Event<IRuntimeHealthSnapshot>;

	/** Get current health snapshot */
	readonly currentHealth: IRuntimeHealthSnapshot;

	/** Take a health snapshot */
	takeHealthSnapshot(): IRuntimeHealthSnapshot;

	/** Monitor a specific dimension */
	monitorDimension(dimension: MonitoringDimension): number; // 0-100 score

	/** Get monitoring report */
	getMonitoringReport(): IRuntimeMonitoringReport;

	/** Get anomaly history */
	getAnomalies(): readonly IRuntimeAnomaly[];

	/** Check if system is healthy */
	readonly isHealthy: boolean;

	/** Validate runtime monitoring */
	validateRuntimeMonitoring(): IRuntimeMonitoringReport;
}

// ═══════════════════════════════════════════════════════════════════════════════
// TASK 6 — RECOVERY & FAILSAFE SYSTEM
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * IRecoveryFailsafeService — Ensures the system never fully bricks.
 *
 * Provides emergency recovery mode, partial subsystem restart,
 * runtime repair flows, degraded safe mode, and rollback to
 * known-good state.
 */
export const IRecoveryFailsafeService = createDecorator<IRecoveryFailsafeService>('recoveryFailsafeService');

export interface IRecoveryFailsafeService {
	readonly _serviceBrand: undefined;

	/** Event: recovery initiated */
	readonly onDidInitiateRecovery: Event<RecoveryMode>;

	/** Event: recovery completed */
	readonly onDidCompleteRecovery: Event<IRecoveryResult>;

	/** Get available recovery modes */
	getAvailableRecoveryModes(): readonly RecoveryMode[];

	/** Initiate a specific recovery */
	initiateRecovery(mode: RecoveryMode): IRecoveryResult;

	/** Get current recovery mode */
	readonly currentRecoveryMode: RecoveryMode;

	/** Create a known-good state checkpoint */
	createCheckpoint(): string; // returns checkpoint ID

	/** Rollback to a checkpoint */
	rollbackToCheckpoint(checkpointId: string): IRecoveryResult;

	/** Test recovery system */
	testRecovery(): IRecoveryFailsafeReport;

	/** Validate recovery failsafe */
	validateRecoveryFailsafe(): IRecoveryFailsafeReport;

	/** Check if system can recover */
	readonly canRecover: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════════
// TASK 7 — PRODUCTION CONFIGURATION SYSTEM
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * IProductionConfigurationService — Centralized runtime configuration.
 *
 * Provides centralized runtime configuration, environment overrides,
 * feature flag management, enterprise configuration profiles,
 * and immutable production configs.
 */
export const IProductionConfigurationService = createDecorator<IProductionConfigurationService>('productionConfigurationService');

export interface IProductionConfigurationService {
	readonly _serviceBrand: undefined;

	/** Event: configuration changed */
	readonly onDidChangeConfiguration: Event<IConfigurationEntry>;

	/** Event: configuration violation detected */
	readonly onDidDetectViolation: Event<IConfigurationViolation>;

	/** Get a configuration value */
	getValue(key: string): unknown;

	/** Set a configuration value (respects mutability rules) */
	setValue(key: string, value: unknown): boolean;

	/** Get all configuration entries */
	getAllEntries(): readonly IConfigurationEntry[];

	/** Get configuration snapshot */
	getSnapshot(): IConfigurationSnapshot;

	/** Lock configuration for production */
	lockConfiguration(): void;

	/** Check if configuration is locked */
	readonly isLocked: boolean;

	/** Get feature flag state */
	getFeatureFlag(flag: string): boolean;

	/** Set feature flag */
	setFeatureFlag(flag: string, enabled: boolean): boolean;

	/** Validate configuration */
	validateConfiguration(): IConfigurationValidationReport;
}

// ═══════════════════════════════════════════════════════════════════════════════
// TASK 8 — DISTRIBUTION & PACKAGING SYSTEM
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * IDistributionPackagingService — Validates distribution packaging.
 *
 * Validates packaging, verifies build integrity, validates runtime
 * dependencies, verifies offline bundles, and ensures release
 * artifact consistency.
 */
export const IDistributionPackagingService = createDecorator<IDistributionPackagingService>('distributionPackagingService');

export interface IDistributionPackagingService {
	readonly _serviceBrand: undefined;

	/** Event: packaging verification completed */
	readonly onDidCompleteVerification: Event<IPackagingVerification>;

	/** Verify packaging integrity */
	verifyPackaging(): IPackagingVerification;

	/** Verify build integrity */
	verifyBuildIntegrity(): boolean;

	/** Validate runtime dependencies */
	validateRuntimeDependencies(): boolean;

	/** Verify offline bundle completeness */
	verifyOfflineBundle(): boolean;

	/** Check release artifact consistency */
	checkReleaseArtifactConsistency(): boolean;

	/** Get last verification result */
	readonly lastVerification: IPackagingVerification | null;

	/** Validate distribution packaging */
	validateDistributionPackaging(): IPackagingVerification;
}

// ═══════════════════════════════════════════════════════════════════════════════
// TASK 9 — OPERATIONAL ANALYTICS ENGINE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * IOperationalAnalyticsService — System-level operational analytics.
 *
 * Tracks deployment stability, crash recovery rate, update success rate,
 * feature reliability, and runtime degradation trends.
 * This is SYSTEM analytics ONLY. NOT user surveillance.
 */
export const IOperationalAnalyticsService = createDecorator<IOperationalAnalyticsService>('operationalAnalyticsService');

export interface IOperationalAnalyticsService {
	readonly _serviceBrand: undefined;

	/** Event: metrics updated */
	readonly onDidChangeMetrics: Event<IOperationalMetrics>;

	/** Get current operational metrics */
	readonly currentMetrics: IOperationalMetrics;

	/** Collect system metrics */
	collectMetrics(): IOperationalMetrics;

	/** Get analytics report */
	getAnalyticsReport(): IOperationalAnalyticsReport;

	/** Get trends */
	getTrends(): readonly IOperationalTrend[];

	/** Get deployment stability score */
	readonly deploymentStabilityScore: number; // 0-100

	/** Get crash recovery rate */
	readonly crashRecoveryRate: number; // 0.0-1.0

	/** Validate operational analytics */
	validateOperationalAnalytics(): IOperationalAnalyticsReport;
}

// ═══════════════════════════════════════════════════════════════════════════════
// TASK 10 — FINAL PRODUCTION READINESS VALIDATOR
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * IProductionReadinessValidatorService — Computes production readiness.
 *
 * Computes deployment readiness, operational readiness, reliability
 * confidence, maintainability confidence, enterprise readiness.
 * Final output: GLOBAL PRODUCTION READINESS SCORE (0-100).
 */
export const IProductionReadinessValidatorService = createDecorator<IProductionReadinessValidatorService>('productionReadinessValidatorService');

export interface IProductionReadinessValidatorService {
	readonly _serviceBrand: undefined;

	/** Event: readiness score changed */
	readonly onDidChangeReadiness: Event<IProductionReadinessScore>;

	/** Compute readiness score for a dimension */
	computeDimensionScore(dimension: ReadinessDimension): number; // 0-100

	/** Compute global production readiness score */
	computeProductionReadinessScore(): IProductionReadinessScore;

	/** Get current readiness score */
	readonly currentReadinessScore: IProductionReadinessScore | null;

	/** Get readiness report */
	getReadinessReport(): IProductionReadinessReport;

	/** Get readiness blockers */
	getBlockers(): readonly IReadinessBlocker[];

	/** Check if system is shippable */
	readonly isShippable: boolean;

	/** Validate production readiness */
	validateProductionReadiness(): IProductionReadinessReport;
}
