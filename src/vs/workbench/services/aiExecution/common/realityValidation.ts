/*---------------------------------------------------------------------------------------------
 *  Reality Validation, Execution Truth & Production Convergence -- Phase 22
 *  Real Vibecode -- AI-Native IDE
 *
 *  This is NOT about building new fantasy architecture.
 *  This is about auditing, truth-seeking, and honest assessment
 *  of the entire 109-service system.
 *
 *  Phase 22 answers one question: What is REAL and what is PRETEND?
 *
 *  PRINCIPLES:
 *    1.  No service gets the benefit of the doubt -- prove you are real
 *    2.  Architectural honesty over architectural ambition
 *    3.  If it cannot be observed, it does not exist in production
 *    4.  Complexity that cannot be justified must be removed
 *    5.  Scalability claims must be backed by evidence, not theory
 *    6.  Production readiness is earned, not declared
 *    7.  Every abstraction must justify its existence
 *    8.  Dead code is a lie the system tells about itself
 *    9.  The convergence report is the final honest document
 *   10.  The system IS what it DOES, not what it CLAIMS to be
 *
 *  Services:
 *    #110  IRealityValidationService          -- Classify every service as real or fake
 *    #111  IExecutionTruthAuditService        -- Trace real execution, find dead code
 *    #112  IMaintainabilityAnalysisService    -- Complexity, coupling, god-service detection
 *    #113  IScalabilityRealityService         -- REAL scaling limits, no cloud fantasy
 *    #114  IOperationalTruthService           -- Actual deployability, missing requirements
 *    #115  IObservabilityCompletenessService  -- Find unobservable execution
 *    #116  IArchitecturalReductionService     -- Find removable, mergeable, excess services
 *    #117  IProductionReadinessTruthService   -- Actual readiness classification
 *    #118  IRuntimeRealityBenchmarkService    -- Benchmark actual runtime behavior
 *    #119  ISystemConvergenceReportService    -- FINAL convergence report
 *--------------------------------------------------------------------------------------------*/

import { Event } from '../../../../base/common/event.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';

// =====================================================================================
// ENUMS -- Reality Classification Primitives
// =====================================================================================

/**
 * Service reality classification -- how real is a service?
 * Every service in the 109-service system must be classified honestly.
 */
export const enum ServiceRealityClassification {
	/** Has real runtime code, executes in production, has observable effects */
	RealRuntime = 'real-runtime',
	/** Simulates behavior but does not have full production implementation */
	SimulatedRuntime = 'simulated-runtime',
	/** Exists only as an interface/type definition with no implementation */
	ArchitecturalPlaceholder = 'architectural-placeholder',
	/** An abstraction layer that adds indirection without adding value */
	FutureAbstraction = 'future-abstraction',
	/** Fully implemented, tested, and operating in production */
	ProductionReady = 'production-ready',
}

/**
 * Scalability classification -- what actually constrains the system.
 * No fantasy about "theoretically scalable." What IS the bottleneck?
 */
export const enum ScalabilityClassification {
	/** Bounded by browser single-thread limitations */
	BrowserLimited = 'browser-limited',
	/** Bounded by the VS Code extension host runtime */
	RuntimeBound = 'runtime-bound',
	/** Scalability exists in theory but not in practice */
	TheoreticallyScalable = 'theoretically-scalable',
	/** Claims to scale but actually does not */
	FalselyScalable = 'falsely-scalable',
}

/**
 * Production readiness classification -- honest assessment of deployability.
 * No "almost production ready." Where does it ACTUALLY stand?
 */
export const enum ProductionReadinessClassification {
	/** Exploratory code, no tests, no error handling */
	Prototype = 'prototype',
	/** Core logic works, edge cases unhandled, no recovery */
	AdvancedPrototype = 'advanced-prototype',
	/** Works for internal use, not safe for external users */
	InternalTool = 'internal-tool',
	/** Could be production with targeted fixes */
	ProductionCandidate = 'production-candidate',
	/** Battle-tested, error-handled, observable, recoverable */
	ProductionReady = 'production-ready',
}

/**
 * Readiness classification for the entire system.
 * Mirrors ProductionReadinessClassification but applied holistically.
 */
export const enum ReadinessClassification {
	/** The whole system is exploratory */
	Prototype = 'prototype',
	/** Most subsystems work but lack hardening */
	AdvancedPrototype = 'advanced-prototype',
	/** Suitable for internal dogfooding only */
	InternalTool = 'internal-tool',
	/** Close to production with specific gaps */
	ProductionCandidate = 'production-candidate',
	/** Production validated end-to-end */
	ProductionReady = 'production-ready',
}

/**
 * Execution segment type -- what kind of execution segment was traced.
 */
export const enum ExecutionSegmentType {
	/** Real code that runs and produces observable effects */
	RealExecution = 'real-execution',
	/** Code that runs but produces no observable output */
	SilentExecution = 'silent-execution',
	/** Code path that delegates to another service without adding value */
	PassthroughDelegation = 'passthrough-delegation',
	/** Code path that was supposed to run but was never triggered */
	DeadPath = 'dead-path',
	/** Simulation stub that returns fake data */
	SimulatedStub = 'simulated-stub',
}

/**
 * Coupling severity -- how problematic is the coupling between services.
 */
export const enum CouplingSeverity {
	/** Independent -- no direct coupling */
	Independent = 'independent',
	/** Loosely coupled -- communicates via events */
	LooselyCoupled = 'loosely-coupled',
	/** Moderately coupled -- direct method calls */
	ModeratelyCoupled = 'moderately-coupled',
	/** Tightly coupled -- shared mutable state */
	TightlyCoupled = 'tightly-coupled',
	/** Entangled -- cannot reason about one without the other */
	Entangled = 'entangled',
}

/**
 * Change risk level -- how risky is modifying a service.
 */
export const enum ChangeRiskLevel {
	/** Low risk -- isolated change, no downstream impact */
	Low = 'low',
	/** Medium risk -- limited downstream, testable */
	Medium = 'medium',
	/** High risk -- wide blast radius, needs careful testing */
	High = 'high',
	/** Critical -- change could break the entire system */
	Critical = 'critical',
}

/**
 * Benchmark status -- the outcome of a benchmark run.
 */
export const enum BenchmarkStatus {
	/** Benchmark completed successfully */
	Completed = 'completed',
	/** Benchmark timed out */
	TimedOut = 'timed-out',
	/** Benchmark failed due to error */
	Failed = 'failed',
	/** Benchmark skipped because feature is not real */
	SkippedNotReal = 'skipped-not-real',
	/** Benchmark skipped because feature is not observable */
	SkippedNotObservable = 'skipped-not-observable',
}

/**
 * Reduction action -- what kind of architectural reduction is proposed.
 */
export const enum ReductionAction {
	/** Remove the service entirely */
	Remove = 'remove',
	/** Merge into another existing service */
	Merge = 'merge',
	/** Inline the logic into its consumer */
	Inline = 'inline',
	/** Simplify the interface */
	Simplify = 'simplify',
	/** Keep as-is */
	Keep = 'keep',
}

/**
 * Memory pressure scenario -- what scenario is being tested.
 */
export const enum MemoryPressureScenario {
	/** Normal operation */
	Normal = 'normal',
	/** Many concurrent executions */
	HighConcurrency = 'high-concurrency',
	/** Large context payloads */
	LargePayloads = 'large-payloads',
	/** Extended session without restart */
	ExtendedSession = 'extended-session',
	/** Memory leak simulation */
	LeakSimulation = 'leak-simulation',
}

// =====================================================================================
// SHARED TYPES -- Audit, Truth, and Validation Models
// =====================================================================================

/**
 * Reality score -- the honest truth score for the entire system.
 * Overall is 0-100. 100 means every service is production-ready and real.
 * Below 50 means the system is mostly aspirational architecture.
 */
export interface RealityScore {
	overall: number;
	breakdown: {
		realExecution: number;
		simulatedExecution: number;
		placeholderCount: number;
		futureAbstractionCount: number;
		productionReadyCount: number;
	};
	honestAssessment: string;
}

/**
 * Execution trace node -- a single node in the execution path.
 */
export interface ExecutionTraceNode {
	readonly serviceId: string;
	readonly methodInvoked: string;
	readonly segmentType: ExecutionSegmentType;
	readonly durationMs: number;
	readonly producedObservableEffect: boolean;
	readonly delegatedToService: string | null;
	readonly timestamp: number;
}

/**
 * Execution trace -- the full traced path of an operation.
 */
export interface ExecutionTrace {
	operationId: string;
	path: ExecutionTraceNode[];
	totalDepth: number;
	fakeSegments: number;
	realSegments: number;
	participationRatio: number;
}

/**
 * Dead code report -- code that exists but is never executed.
 */
export interface DeadCodeReport {
	readonly serviceId: string;
	readonly methodSignature: string;
	readonly estimatedLinesOfCode: number;
	readonly lastSeenExecuted: number | null;
	readonly reason: string;
	readonly removalRisk: ChangeRiskLevel;
	readonly evidenceType: 'static-analysis' | 'runtime-never-called' | 'coverage-gap';
}

/**
 * Unused orchestration report -- orchestration paths that are defined but never used.
 */
export interface UnusedOrchestrationReport {
	readonly orchestrationPathId: string;
	readonly sourceService: string;
	readonly targetService: string;
	readonly signalType: string;
	readonly invocationCount: number;
	readonly definedButNeverFired: boolean;
	readonly estimatedOverheadMs: number;
	readonly description: string;
}

/**
 * Fake loop report -- a runtime loop that appears to do work but produces nothing.
 */
export interface FakeLoopReport {
	readonly loopId: string;
	readonly serviceId: string;
	readonly loopDescription: string;
	readonly iterationsObserved: number;
	readonly observableOutputsProduced: number;
	readonly isGenuinelyProductive: boolean;
	readonly estimatedWastedCycles: number;
	readonly recommendation: string;
}

/**
 * Execution participation report -- how much of the system actually participates.
 */
export interface ExecutionParticipationReport {
	readonly totalServices: number;
	readonly servicesWithRealExecution: number;
	readonly servicesWithSimulatedExecution: number;
	readonly servicesWithNoExecution: number;
	readonly participationPercent: number;
	readonly fakeExecutionPercent: number;
	readonly realExecutionPercent: number;
	readonly timestamp: number;
}

/**
 * Complexity score -- per-service complexity metrics.
 */
export interface ComplexityScore {
	serviceId: string;
	cyclomaticComplexity: number;
	dependencyCount: number;
	dependentsCount: number;
	methodCount: number;
	interfaceMethodCount: number;
	godServiceProbability: number;
}

/**
 * Coupling report -- system-wide coupling analysis.
 */
export interface CouplingReport {
	readonly totalServicePairs: number;
	readonly independentPairs: number;
	readonly looselyCoupledPairs: number;
	readonly moderatelyCoupledPairs: number;
	readonly tightlyCoupledPairs: number;
	readonly entangledPairs: number;
	readonly averageCouplingScore: number;
	readonly worstOffenders: readonly CouplingOffender[];
	readonly timestamp: number;
}

/**
 * Coupling offender -- a pair of services with problematic coupling.
 */
export interface CouplingOffender {
	readonly serviceA: string;
	readonly serviceB: string;
	readonly severity: CouplingSeverity;
	readonly couplingScore: number;
	readonly sharedStateCount: number;
	readonly directCallCount: number;
	readonly description: string;
}

/**
 * Dependency hotspot -- a service that is depended upon by many others.
 */
export interface DependencyHotspot {
	readonly serviceId: string;
	readonly incomingDependencyCount: number;
	readonly outgoingDependencyCount: number;
	readonly riskIfChanged: ChangeRiskLevel;
	readonly blastRadius: number;
	readonly isGodService: boolean;
	readonly description: string;
}

/**
 * God service report -- a service that does too much.
 */
export interface GodServiceReport {
	readonly serviceId: string;
	readonly godServiceProbability: number;
	readonly responsibilitiesIdentified: number;
	readonly singleResponsibilityViolations: number;
	readonly methodCount: number;
	readonly dependencyCount: number;
	readonly dependentsCount: number;
	readonly recommendedSplitTargets: readonly string[];
	readonly justification: string;
}

/**
 * Change risk assessment -- the risk of modifying a service.
 */
export interface ChangeRiskAssessment {
	readonly serviceId: string;
	readonly overallRisk: ChangeRiskLevel;
	readonly blastRadiusScore: number;
	readonly downstreamServiceCount: number;
	readonly testCoveragePercent: number;
	readonly observableBehaviorCount: number;
	readonly breakingChangeProbability: number;
	readonly recommendedPrecautions: readonly string[];
	readonly timestamp: number;
}

/**
 * Onboarding estimate -- how hard is it for a new developer to understand the system.
 */
export interface OnboardingEstimate {
	readonly estimatedHoursToUnderstandSystem: number;
	readonly estimatedHoursToFirstContribution: number;
	readonly serviceWithSteepestLearningCurve: string;
	readonly conceptsRequiredToUnderstand: number;
	readonly criticalPathsToLearn: number;
	readonly documentationCoveragePercent: number;
	readonly cognitiveLoadScore: number;
	readonly honestAssessment: string;
}

/**
 * Sustainability score -- can the system be maintained long-term?
 */
export interface SustainabilityScore {
	overall: number;
	breakdown: {
		maintainability: number;
		testability: number;
		observability: number;
		documentation: number;
		onboardability: number;
		dependencyHealth: number;
	};
	riskAreas: string[];
	honestAssessment: string;
}

/**
 * Scaling limit report -- the REAL scaling limits of the system.
 */
export interface ScalingLimitReport {
	browserBound: boolean;
	runtimeBound: boolean;
	falselyScalable: string[];
	realLimits: string[];
	operationalCeilings: Map<string, number>;
}

/**
 * Browser bottleneck -- a specific browser-imposed limitation.
 */
export interface BrowserBottleneck {
	readonly bottleneckId: string;
	readonly bottleneckType: 'main-thread' | 'memory-limit' | 'event-loop' | 'dom-throughput' | 'web-worker-limit' | 'storage-quota';
	readonly affectedServices: readonly string[];
	readonly currentUtilizationPercent: number;
	readonly ceilingValue: number;
	readonly measurementUnit: string;
	readonly description: string;
	readonly mitigationOptions: readonly string[];
}

/**
 * Operational ceiling -- the maximum realistic operational capacity.
 */
export interface OperationalCeiling {
	readonly dimension: string;
	readonly ceilingValue: number;
	readonly measurementUnit: string;
	readonly currentAverage: number;
	readonly currentPeak: number;
	readonly headroomPercent: number;
	readonly bindingConstraint: string;
	readonly description: string;
}

/**
 * Fake scalability report -- a claim of scalability that is not backed by evidence.
 */
export interface FakeScalabilityReport {
	readonly claimId: string;
	readonly serviceId: string;
	readonly scalabilityClaim: string;
	readonly actualBehavior: string;
	readonly evidenceType: 'measurement' | 'static-analysis' | 'code-review';
	readonly isClaimSupported: boolean;
	readonly honestReplacement: string;
	readonly description: string;
}

/**
 * Queue saturation report -- what happens when queues fill up.
 */
export interface QueueSaturationReport {
	readonly totalQueues: number;
	readonly queuesAtCapacity: number;
	readonly averageQueueDepth: number;
	readonly maxQueueDepth: number;
	readonly saturationThreshold: number;
	readonly backpressureMechanismExists: boolean;
	readonly dropPolicy: 'drop-oldest' | 'drop-newest' | 'block-producer' | 'none';
	readonly estimatedSaturationPoint: number;
	readonly behaviorAtSaturation: string;
	readonly timestamp: number;
}

/**
 * Memory pressure report -- what happens under memory pressure.
 */
export interface MemoryPressureReport {
	readonly scenario: MemoryPressureScenario;
	readonly baselineMemoryMb: number;
	readonly peakMemoryMb: number;
	readonly memoryGrowthRateMbPerMinute: number;
	readonly gcPressureScore: number;
	readonly leakDetected: boolean;
	readonly leakSuspectServices: readonly string[];
	readonly pressureBehavior: 'graceful-degradation' | 'performance-collapse' | 'silent-data-loss' | 'crash';
	readonly honestAssessment: string;
	readonly timestamp: number;
}

/**
 * Deployability report -- can this system actually be deployed?
 */
export interface DeployabilityReport {
	readonly overallClassification: ProductionReadinessClassification;
	readonly canDeployToday: boolean;
	readonly blockingIssues: number;
	readonly warningIssues: number;
	readonly estimatedDaysToDeployable: number;
	readonly criticalGaps: readonly string[];
	readonly honestAssessment: string;
	readonly timestamp: number;
}

/**
 * Missing requirement -- a production requirement that is not met.
 */
export interface MissingRequirement {
	readonly requirementId: string;
	readonly category: 'security' | 'observability' | 'recovery' | 'performance' | 'testing' | 'documentation' | 'configuration' | 'error-handling';
	readonly description: string;
	readonly severity: 'blocking' | 'critical' | 'important' | 'nice-to-have';
	readonly affectedServices: readonly string[];
	readonly estimatedEffort: string;
	readonly remediation: string;
}

/**
 * Observability validation report -- can we actually observe the system?
 */
export interface ObservabilityValidationReport {
	readonly totalServices: number;
	readonly observableServices: number;
	readonly partiallyObservableServices: number;
	readonly unobservableServices: number;
	readonly observabilityCoveragePercent: number;
	readonly criticalPathsObservable: boolean;
	readonly blindSpots: readonly string[];
	readonly timestamp: number;
}

/**
 * Recovery realism report -- is the recovery system realistic or fantasy?
 */
export interface RecoveryRealismReport {
	readonly recoveryMechanismsDefined: number;
	readonly recoveryMechanismsTested: number;
	readonly recoveryMechanismsThatActuallyWork: number;
	readonly estimatedRecoveryTimeMs: number;
	readonly dataLossRiskLevel: 'none' | 'minimal' | 'moderate' | 'significant' | 'total';
	readonly recoveryTestedUnderLoad: boolean;
	readonly recoveryTestedUnderMemoryPressure: boolean;
	readonly honestAssessment: string;
	readonly timestamp: number;
}

/**
 * Survivability report -- can the system survive real-world conditions?
 */
export interface SurvivabilityReport {
	readonly survivesNetworkLoss: boolean;
	readonly survivesMemoryPressure: boolean;
	readonly survivesHighConcurrency: boolean;
	readonly survivesCorruptedState: boolean;
	readonly survivesDependencyFailure: boolean;
	readonly survivesPartialShutdown: boolean;
	readonly overallSurvivabilityScore: number;
	readonly weakestSurvivalPoint: string;
	readonly honestAssessment: string;
	readonly timestamp: number;
}

/**
 * Operational blind spot -- something that cannot be observed or debugged in production.
 */
export interface OperationalBlindSpot {
	readonly blindSpotId: string;
	readonly area: string;
	readonly affectedServices: readonly string[];
	readonly impact: string;
	readonly detection: 'impossible' | 'difficult' | 'possible-but-not-configured';
	readonly recommendedFix: string;
	readonly severity: 'critical' | 'warning' | 'info';
}

/**
 * Unobservable path -- an execution path that produces no observable output.
 */
export interface UnobservablePath {
	readonly pathId: string;
	readonly serviceId: string;
	readonly methodSignature: string;
	readonly executionProducesNoTelemetry: boolean;
	readonly executionProducesNoLogs: boolean;
	readonly executionProducesNoStateChange: boolean;
	readonly isCompletelyInvisible: boolean;
	readonly description: string;
	readonly recommendedTelemetry: string;
}

/**
 * Missing telemetry report -- telemetry that should exist but does not.
 */
export interface MissingTelemetryReport {
	readonly serviceId: string;
	readonly expectedTelemetryPoints: number;
	readonly actualTelemetryPoints: number;
	readonly missingCriticalTelemetry: readonly string[];
	readonly missingPerformanceTelemetry: readonly string[];
	readonly missingErrorTelemetry: readonly string[];
	readonly gapDescription: string;
}

/**
 * Hidden mutation -- a state change that is not observable.
 */
export interface HiddenMutation {
	readonly mutationId: string;
	readonly serviceId: string;
	readonly mutatedStateKey: string;
	readonly mutationTrigger: string;
	readonly isObservable: boolean;
	readonly hasTelemetry: boolean;
	readonly hasLogging: boolean;
	readonly riskLevel: 'critical' | 'warning' | 'info';
	readonly description: string;
}

/**
 * Traceability report -- can execution be traced from start to finish?
 */
export interface TraceabilityReport {
	readonly totalExecutionPaths: number;
	readonly fullyTraceablePaths: number;
	readonly partiallyTraceablePaths: number;
	readonly untraceablePaths: number;
	readonly traceabilityCoveragePercent: number;
	readonly brokenTraceLinks: readonly TraceLinkBreak[];
	readonly timestamp: number;
}

/**
 * Trace link break -- a point where traceability is lost.
 */
export interface TraceLinkBreak {
	readonly breakId: string;
	readonly fromService: string;
	readonly toService: string;
	readonly breakType: 'no-correlation-id' | 'no-propagation' | 'async-gap' | 'event-loss' | 'unknown-destination';
	readonly description: string;
	readonly impact: string;
}

/**
 * Inspectability report -- can critical paths be inspected at runtime?
 */
export interface InspectabilityReport {
	readonly totalCriticalPaths: number;
	readonly inspectablePaths: number;
	readonly partiallyInspectablePaths: number;
	readonly uninspectablePaths: number;
	readonly inspectabilityCoveragePercent: number;
	readonly criticalUninspectablePaths: readonly string[];
	readonly timestamp: number;
}

/**
 * Removable service -- a service that can be safely removed.
 */
export interface RemovableService {
	readonly serviceId: string;
	readonly reason: string;
	readonly removalImpact: 'none' | 'minimal' | 'moderate' | 'significant';
	readonly dependentsThatWouldBreak: readonly string[];
	readonly estimatedComplexityReduction: number;
	readonly removalRisk: ChangeRiskLevel;
	readonly recommendedAction: ReductionAction;
}

/**
 * Merge opportunity -- two services that should be merged.
 */
export interface MergeOpportunity {
	readonly opportunityId: string;
	readonly serviceA: string;
	readonly serviceB: string;
	readonly overlapScore: number;
	readonly sharedResponsibilities: readonly string[];
	readonly mergeBenefit: string;
	readonly mergeRisk: ChangeRiskLevel;
	readonly estimatedComplexityReduction: number;
	readonly recommendedAction: ReductionAction.Merge;
}

/**
 * Abstraction excess -- an abstraction layer that adds complexity without value.
 */
export interface AbstractionExcess {
	readonly excessId: string;
	readonly serviceId: string;
	readonly abstractionType: 'indirection-layer' | 'wrapper-without-value' | 'interface-with-one-impl' | 'premature-generalization' | 'future-proofing-fantasy';
	readonly currentBenefit: string;
	readonly currentCost: string;
	readonly benefitExceedsCost: boolean;
	readonly recommendation: string;
}

/**
 * Fake separation -- two services that are separated in name but coupled in practice.
 */
export interface FakeSeparation {
	readonly separationId: string;
	readonly serviceA: string;
	readonly serviceB: string;
	readonly nominalSeparation: string;
	readonly actualCoupling: CouplingSeverity;
	readonly sharedStateCount: number;
	readonly synchronousCallCount: number;
	readonly cannotOperateIndependently: boolean;
	readonly recommendation: string;
}

/**
 * Simplified architecture -- a proposed simpler version of the system.
 */
export interface SimplifiedArchitecture {
	readonly currentServiceCount: number;
	readonly proposedServiceCount: number;
	readonly servicesToRemove: readonly string[];
	readonly servicesToMerge: readonly MergeOpportunity[];
	readonly servicesToInline: readonly string[];
	readonly estimatedComplexityReduction: number;
	readonly capabilityPreserved: boolean;
	readonly honestAssessment: string;
	readonly timestamp: number;
}

/**
 * Reduction potential -- how much the architecture can be simplified.
 */
export interface ReductionPotential {
	readonly totalServices: number;
	readonly removableServices: number;
	readonly mergeableServicePairs: number;
	readonly excessAbstractions: number;
	readonly fakeSeparations: number;
	readonly maximumReductionPercent: number;
	readonly safeReductionPercent: number;
	readonly aggressiveReductionPercent: number;
	readonly honestAssessment: string;
}

/**
 * Readiness justification -- evidence-based justification for readiness classification.
 */
export interface ReadinessJustification {
	readonly classification: ReadinessClassification;
	readonly supportingEvidence: readonly string[];
	readonly contradictingEvidence: readonly string[];
	readonly confidenceLevel: number;
	readonly honestAssessment: string;
	readonly timestamp: number;
}

/**
 * Blocking gap -- a gap that blocks production readiness.
 */
export interface BlockingGap {
	readonly gapId: string;
	readonly category: 'missing-feature' | 'missing-test' | 'missing-error-handling' | 'missing-observability' | 'missing-recovery' | 'missing-documentation' | 'missing-security' | 'missing-performance';
	readonly description: string;
	readonly affectedServices: readonly string[];
	readonly severity: 'blocking' | 'critical' | 'important';
	readonly estimatedEffortToFix: string;
	readonly evidence: string;
}

/**
 * Benchmark result -- the outcome of a single benchmark.
 */
export interface BenchmarkResult {
	readonly benchmarkId: string;
	readonly benchmarkName: string;
	readonly status: BenchmarkStatus;
	readonly durationMs: number;
	readonly iterationsCompleted: number;
	readonly averageLatencyMs: number;
	readonly p50LatencyMs: number;
	readonly p95LatencyMs: number;
	readonly p99LatencyMs: number;
	readonly throughputOpsPerSecond: number;
	readonly memoryUsedMb: number;
	readonly cpuUsagePercent: number;
	readonly isOverheadAcceptable: boolean;
	readonly overheadThresholdMs: number;
	readonly honestAssessment: string;
	readonly timestamp: number;
}

/**
 * Runtime tax report -- the cumulative overhead of the runtime infrastructure.
 */
export interface RuntimeTaxReport {
	readonly schedulerOverheadMs: number;
	readonly orchestrationOverheadMs: number;
	readonly recoveryOverheadMs: number;
	readonly persistenceOverheadMs: number;
	readonly totalRuntimeTaxMs: number;
	readonly totalRuntimeTaxPercent: number;
	readonly isTaxAcceptable: boolean;
	readonly acceptableThresholdPercent: number;
	readonly heaviestContributor: string;
	readonly breakdown: ReadonlyMap<string, number>;
	readonly honestAssessment: string;
	readonly timestamp: number;
}

/**
 * Credible system -- a subsystem that is honestly production-ready.
 */
export interface CredibleSystem {
	readonly systemId: string;
	readonly systemName: string;
	readonly includedServices: readonly string[];
	readonly credibilityScore: number;
	readonly evidenceBasis: readonly string[];
	readonly hasBeenTestedUnderLoad: boolean;
	readonly hasBeenTestedUnderFailure: boolean;
	readonly hasObservableBehavior: boolean;
	readonly honestAssessment: string;
}

/**
 * Exaggerated claim -- a claim about the system that is not supported by evidence.
 */
export interface ExaggeratedClaim {
	readonly claimId: string;
	 readonly claim: string;
	readonly reality: string;
	readonly evidenceGap: string;
	readonly severity: 'embarrassment' | 'misleading' | 'dangerous';
	readonly honestReplacement: string;
}

/**
 * Production survivor -- a subsystem that would survive real production scrutiny.
 */
export interface ProductionSurvivor {
	readonly survivorId: string;
	 readonly name: string;
	readonly includedServices: readonly string[];
	readonly survivalProbability: number;
	readonly survivesLoad: boolean;
	readonly survivesFailure: boolean;
	readonly survivesMemoryPressure: boolean;
	readonly survivesNetworkIssues: boolean;
	readonly survivesMisconfiguration: boolean;
	readonly honestAssessment: string;
}

/**
 * Simplification target -- a service or subsystem that must be simplified.
 */
export interface SimplificationTarget {
	readonly targetId: string;
	readonly serviceId: string;
	readonly currentComplexityScore: number;
	readonly proposedComplexityScore: number;
	readonly simplificationActions: readonly string[];
	readonly estimatedEffort: string;
	readonly riskLevel: ChangeRiskLevel;
	readonly justification: string;
}

/**
 * Removal candidate -- a service that should be removed.
 */
export interface RemovalCandidate {
	readonly candidateId: string;
	readonly serviceId: string;
	readonly reason: string;
	readonly dependentsAffected: readonly string[];
	readonly migrationPath: string;
	readonly estimatedComplexityReduction: number;
	readonly riskLevel: ChangeRiskLevel;
}

/**
 * Rebuild candidate -- a service that needs to be rebuilt from scratch.
 */
export interface RebuildCandidate {
	readonly candidateId: string;
	readonly serviceId: string;
	readonly reason: string;
	readonly currentProblems: readonly string[];
	readonly rebuildApproach: string;
	readonly estimatedEffort: string;
	readonly riskLevel: ChangeRiskLevel;
	readonly justification: string;
}

/**
 * System convergence report -- the FINAL honest document.
 * This is the most important type in Phase 22.
 * It contains the complete honest assessment of the entire system.
 */
export interface SystemConvergenceReport {
	timestamp: number;
	realityScore: RealityScore;
	runtimeCredibilityScore: number;
	productionCredibilityScore: number;
	maintainabilityScore: number;
	complexityInflationScore: number;
	architecturalHonestyScore: number;
	observabilityCoverage: number;
	realExecutionParticipationPercent: number;
	abstractionJustificationPercent: number;
	operationalSurvivabilityScore: number;
	whatSystemReallyIs: string;
	whatSystemIsNot: string[];
	whatIsCredible: CredibleSystem[];
	whatIsExaggerated: ExaggeratedClaim[];
	whatSurvivesProduction: ProductionSurvivor[];
	whatMustBeSimplified: SimplificationTarget[];
	whatShouldBeRemoved: RemovalCandidate[];
	whatShouldBeRebuilt: RebuildCandidate[];
	harshTruths: string[];
	honestRecommendations: string[];
}

// =====================================================================================
// SERVICE #110 -- IRealityValidationService
// =====================================================================================

/**
 * IRealityValidationService -- The foundation of Phase 22.
 *
 * Identifies fake abstractions, classifies every service in the
 * 109-service system according to its actual reality, and computes
 * the system's overall truth score.
 *
 * This service does not build anything. It AUDITS.
 * It answers: "Of our 109 services, how many are REAL?"
 */
export const IRealityValidationService = createDecorator<IRealityValidationService>('realityValidationService');

export interface IRealityValidationService {
	readonly _serviceBrand: undefined;

	/** Event: classification of all services completed */
	readonly onClassificationComplete: Event<Map<string, ServiceRealityClassification>>;

	/** Event: a fake abstraction was detected */
	readonly onFakeAbstractionDetected: Event<string>;

	/** Event: the overall truth score changed */
	readonly onTruthScoreChanged: Event<RealityScore>;

	/** Classify a single service by its reality */
	classifyService(serviceId: string): ServiceRealityClassification;

	/** Classify all 109 services and return the full classification map */
	classifyAll(): Map<string, ServiceRealityClassification>;

	/** Compute the overall system truth score (0-100) */
	computeTruthScore(): RealityScore;

	/** Identify all services that are fake abstractions (no real implementation) */
	identifyFakeAbstractions(): string[];

	/** Identify all services whose behavior cannot be verified */
	identifyUnverifiableSystems(): string[];

	/** Get the count of services per classification category */
	getClassificationCounts(): Map<ServiceRealityClassification, number>;

	/** Validate a specific service's reality claim against its actual code */
	validateRealityClaim(serviceId: string, claimedClassification: ServiceRealityClassification): boolean;

	/** Get the honest breakdown of what the system actually is */
	getHonestSystemBreakdown(): RealityScore;

	/** Force a re-classification of all services */
	forceReclassification(): Map<string, ServiceRealityClassification>;
}

// =====================================================================================
// SERVICE #111 -- IExecutionTruthAuditService
// =====================================================================================

/**
 * IExecutionTruthAuditService -- Traces actual execution paths.
 *
 * Follows real execution from user action to system response,
 * identifies dead code paths, finds orchestration that never fires,
 * detects fake runtime loops, and finds systems that produce
 * no observable effects.
 *
 * The core question: "When the system runs, what ACTUALLY runs?"
 */
export const IExecutionTruthAuditService = createDecorator<IExecutionTruthAuditService>('executionTruthAuditService');

export interface IExecutionTruthAuditService {
	readonly _serviceBrand: undefined;

	/** Event: dead code was found */
	readonly onDeadCodeFound: Event<DeadCodeReport>;

	/** Event: a fake runtime loop was detected */
	readonly onFakeLoopDetected: Event<FakeLoopReport>;

	/** Event: execution participation was measured */
	readonly onParticipationMeasured: Event<ExecutionParticipationReport>;

	/** Trace the execution path of a specific operation */
	traceExecutionPath(operationId: string): ExecutionTrace;

	/** Identify all dead code in the system */
	identifyDeadCode(): DeadCodeReport[];

	/** Identify orchestration paths that are defined but never used */
	identifyUnusedOrchestration(): UnusedOrchestrationReport[];

	/** Identify runtime loops that appear to do work but produce nothing */
	identifyFakeRuntimeLoops(): FakeLoopReport[];

	/** Identify systems that produce no observable effects */
	identifyNonObservableSystems(): string[];

	/** Measure what percentage of services actually participate in real execution */
	verifyRealExecutionParticipation(): ExecutionParticipationReport;

	/** Get the execution depth distribution across all services */
	getExecutionDepthDistribution(): Map<string, number>;

	/** Trace all execution paths from a root service */
	traceAllFromRoot(serviceId: string): ExecutionTrace[];

	/** Validate execution truth audit completeness */
	validateExecutionTruthAudit(): ExecutionParticipationReport;
}

// =====================================================================================
// SERVICE #112 -- IMaintainabilityAnalysisService
// =====================================================================================

/**
 * IMaintainabilityAnalysisService -- Complexity, coupling, and god-service detection.
 *
 * Measures cyclomatic complexity per service, analyzes coupling
 * between services, detects dependency hotspots, identifies god
 * services, and computes change risk.
 *
 * The core question: "Can this system be maintained by real humans?"
 */
export const IMaintainabilityAnalysisService = createDecorator<IMaintainabilityAnalysisService>('maintainabilityAnalysisService');

export interface IMaintainabilityAnalysisService {
	readonly _serviceBrand: undefined;

	/** Event: a god service was detected */
	readonly onGodServiceDetected: Event<GodServiceReport>;

	/** Event: a dependency hotspot was found */
	readonly onHotspotFound: Event<DependencyHotspot>;

	/** Event: sustainability score was computed */
	readonly onSustainabilityScored: Event<SustainabilityScore>;

	/** Compute complexity score for a specific service */
	computeComplexityScore(serviceId: string): ComplexityScore;

	/** Compute coupling analysis for the entire system */
	computeCouplingAnalysis(): CouplingReport;

	/** Detect services that are dependency hotspots */
	detectDependencyHotspots(): DependencyHotspot[];

	/** Detect god services (services doing too much) */
	detectGodServices(): GodServiceReport[];

	/** Compute change risk assessment for a specific service */
	computeChangeRisk(serviceId: string): ChangeRiskAssessment;

	/** Estimate onboarding difficulty for new developers */
	estimateOnboardingDifficulty(): OnboardingEstimate;

	/** Compute the overall sustainability score (0-100) */
	computeSustainabilityScore(): SustainabilityScore;

	/** Get the top N most complex services */
	getMostComplexServices(count: number): ComplexityScore[];

	/** Get services with the highest god-service probability */
	getHighestGodServiceProbability(count: number): GodServiceReport[];

	/** Validate maintainability analysis completeness */
	validateMaintainabilityAnalysis(): SustainabilityScore;
}

// =====================================================================================
// SERVICE #113 -- IScalabilityRealityService
// =====================================================================================

/**
 * IScalabilityRealityService -- REAL scaling limits, no cloud fantasy.
 *
 * Determines the REAL scaling limits of the system within a browser.
 * No claims about horizontal scaling, microservices, or cloud deployments.
 * The system runs in VS Code. What are the ACTUAL limits?
 *
 * The core question: "What is the MAXIMUM this system can handle, honestly?"
 */
export const IScalabilityRealityService = createDecorator<IScalabilityRealityService>('scalabilityRealityService');

export interface IScalabilityRealityService {
	readonly _serviceBrand: undefined;

	/** Event: a browser bottleneck was found */
	readonly onBottleneckFound: Event<BrowserBottleneck>;

	/** Event: a false scalability claim was detected */
	readonly onFakeScalabilityDetected: Event<FakeScalabilityReport>;

	/** Event: an operational ceiling was exceeded */
	readonly onCeilingExceeded: Event<OperationalCeiling>;

	/** Determine the real scaling limits of the system */
	determineRealScalingLimits(): ScalingLimitReport;

	/** Identify browser-imposed bottlenecks */
	identifyBrowserBottlenecks(): BrowserBottleneck[];

	/** Estimate operational ceilings for all dimensions */
	estimateOperationalCeilings(): OperationalCeiling[];

	/** Classify all false scalability claims in the system */
	classifyFakeScalability(): FakeScalabilityReport[];

	/** Validate queue saturation boundaries */
	validateQueueSaturationBoundaries(): QueueSaturationReport;

	/** Validate memory pressure assumptions */
	validateMemoryPressureAssumptions(): MemoryPressureReport[];

	/** Get the scalability classification for the entire system */
	getSystemScalabilityClassification(): ScalabilityClassification;

	/** Run a specific memory pressure scenario */
	runMemoryPressureScenario(scenario: MemoryPressureScenario): MemoryPressureReport;

	/** Validate scalability reality assessment */
	validateScalabilityReality(): ScalingLimitReport;
}

// =====================================================================================
// SERVICE #114 -- IOperationalTruthService
// =====================================================================================

/**
 * IOperationalTruthService -- Actual deployability and missing requirements.
 *
 * Determines if the system can ACTUALLY be deployed, identifies
 * missing production requirements, validates operational observability,
 * and checks recovery realism.
 *
 * The core question: "If we deployed this TODAY, what would break?"
 */
export const IOperationalTruthService = createDecorator<IOperationalTruthService>('operationalTruthService');

export interface IOperationalTruthService {
	readonly _serviceBrand: undefined;

	/** Event: a missing production requirement was found */
	readonly onMissingRequirementFound: Event<MissingRequirement>;

	/** Event: an operational blind spot was detected */
	readonly onBlindSpotDetected: Event<OperationalBlindSpot>;

	/** Event: deployability was assessed */
	readonly onDeployabilityAssessed: Event<DeployabilityReport>;

	/** Determine actual deployability of the system */
	determineDeployability(): DeployabilityReport;

	/** Identify all missing production requirements */
	identifyMissingProductionRequirements(): MissingRequirement[];

	/** Validate operational observability completeness */
	validateOperationalObservability(): ObservabilityValidationReport;

	/** Validate recovery realism -- do recovery mechanisms actually work? */
	validateRecoveryRealism(): RecoveryRealismReport;

	/** Validate runtime survivability under real conditions */
	validateRuntimeSurvivability(): SurvivabilityReport;

	/** Identify operational blind spots */
	identifyOperationalBlindSpots(): OperationalBlindSpot[];

	/** Get the production readiness classification for the system */
	getSystemReadinessClassification(): ProductionReadinessClassification;

	/** Validate operational truth assessment */
	validateOperationalTruth(): DeployabilityReport;
}

// =====================================================================================
// SERVICE #115 -- IObservabilityCompletenessService
// =====================================================================================

/**
 * IObservabilityCompletenessService -- Find unobservable execution.
 *
 * If you cannot observe it, it does not exist in production.
 * This service finds execution paths that produce no telemetry,
 * state mutations that are invisible, and traceability gaps.
 *
 * The core question: "If something goes wrong, can we SEE it?"
 */
export const IObservabilityCompletenessService = createDecorator<IObservabilityCompletenessService>('observabilityCompletenessService');

export interface IObservabilityCompletenessService {
	readonly _serviceBrand: undefined;

	/** Event: an unobservable execution path was found */
	readonly onUnobservablePathFound: Event<UnobservablePath>;

	/** Event: a hidden state mutation was detected */
	readonly onHiddenMutationDetected: Event<HiddenMutation>;

	/** Event: observability coverage was measured */
	readonly onCoverageMeasured: Event<number>;

	/** Detect all execution paths that produce no observable output */
	detectUnobservableExecution(): UnobservablePath[];

	/** Identify all missing telemetry across the system */
	identifyMissingTelemetry(): MissingTelemetryReport[];

	/** Identify all hidden state mutations */
	identifyHiddenStateMutations(): HiddenMutation[];

	/** Validate traceability across the entire system */
	validateTraceability(): TraceabilityReport;

	/** Ensure critical execution paths are inspectable at runtime */
	ensureCriticalPathInspectability(): InspectabilityReport;

	/** Compute observability coverage (0-100 percent) */
	computeObservabilityCoverage(): number;

	/** Get the breakdown of observability by service */
	getObservabilityByService(): Map<string, number>;

	/** Get the list of services with zero observability */
	getCompletelyUnobservableServices(): string[];

	/** Validate observability completeness assessment */
	validateObservabilityCompleteness(): number;
}

// =====================================================================================
// SERVICE #116 -- IArchitecturalReductionService
// =====================================================================================

/**
 * IArchitecturalReductionService -- Find removable, mergeable, excess services.
 *
 * Not every service deserves to exist. This service identifies
 * services that can be removed, merged, or inlined. It finds
 * abstraction layers that add complexity without value, and
 * fake separations where "separate" services are actually entangled.
 *
 * The core question: "What would happen if we REMOVED half the services?"
 */
export const IArchitecturalReductionService = createDecorator<IArchitecturalReductionService>('architecturalReductionService');

export interface IArchitecturalReductionService {
	readonly _serviceBrand: undefined;

	/** Event: a removable service was found */
	readonly onRemovableServiceFound: Event<RemovableService>;

	/** Event: a merge opportunity was found */
	readonly onMergeOpportunityFound: Event<MergeOpportunity>;

	/** Event: a reduction proposal was made */
	readonly onReductionProposed: Event<SimplifiedArchitecture>;

	/** Identify services that can be safely removed */
	identifyRemovableServices(): RemovableService[];

	/** Identify services that should be merged */
	identifyMergeOpportunities(): MergeOpportunity[];

	/** Identify abstraction layers that add complexity without value */
	identifyAbstractionExcess(): AbstractionExcess[];

	/** Identify fake separations (nominally separate, practically coupled) */
	identifyFakeSeparation(): FakeSeparation[];

	/** Propose a simplified architecture with fewer services */
	proposeSimplifiedArchitecture(): SimplifiedArchitecture;

	/** Compute the reduction potential of the system */
	computeReductionPotential(): ReductionPotential;

	/** Get the ratio of services that justify their existence */
	getServiceJustificationRatio(): number;

	/** Estimate complexity reduction from a specific merge */
	estimateMergeImpact(opportunityId: string): number;

	/** Validate architectural reduction assessment */
	validateArchitecturalReduction(): ReductionPotential;
}

// =====================================================================================
// SERVICE #117 -- IProductionReadinessTruthService
// =====================================================================================

/**
 * IProductionReadinessTruthService -- Actual readiness classification.
 *
 * No "almost production ready." This service provides an honest,
 * evidence-based classification of the system's readiness.
 * Every claim must be backed by evidence. Every gap must be documented.
 *
 * The core question: "Is this system READY, and if not, EXACTLY why not?"
 */
export const IProductionReadinessTruthService = createDecorator<IProductionReadinessTruthService>('productionReadinessTruthService');

export interface IProductionReadinessTruthService {
	readonly _serviceBrand: undefined;

	/** Event: readiness was classified */
	readonly onReadinessClassified: Event<ReadinessClassification>;

	/** Event: a blocking gap was found */
	readonly onBlockingGapFound: Event<BlockingGap>;

	/** Event: production credibility score was computed */
	readonly onCredibilityScored: Event<number>;

	/** Classify the system's production readiness */
	classifyReadiness(): ReadinessClassification;

	/** Produce evidence-based justification for the readiness classification */
	produceJustification(): ReadinessJustification;

	/** Identify all blocking gaps that prevent production readiness */
	identifyBlockingGaps(): BlockingGap[];

	/** Compute the production credibility score (0-100) */
	computeProductionCredibilityScore(): number;

	/** Get the readiness breakdown by subsystem */
	getReadinessBySubsystem(): Map<string, ReadinessClassification>;

	/** Get the most critical blocking gaps */
	getMostCriticalGaps(count: number): BlockingGap[];

	/** Validate production readiness truth assessment */
	validateProductionReadinessTruth(): ReadinessJustification;
}

// =====================================================================================
// SERVICE #118 -- IRuntimeRealityBenchmarkService
// =====================================================================================

/**
 * IRuntimeRealityBenchmarkService -- Benchmark actual runtime behavior.
 *
 * Measures the ACTUAL overhead of the runtime infrastructure.
 * How much does the scheduler cost? How much does orchestration cost?
 * What is the real "runtime tax" on every operation?
 *
 * The core question: "How much does our infrastructure COST us?"
 */
export const IRuntimeRealityBenchmarkService = createDecorator<IRuntimeRealityBenchmarkService>('runtimeRealityBenchmarkService');

export interface IRuntimeRealityBenchmarkService {
	readonly _serviceBrand: undefined;

	/** Event: a benchmark completed */
	readonly onBenchmarkComplete: Event<BenchmarkResult>;

	/** Event: runtime tax was measured */
	readonly onRuntimeTaxMeasured: Event<RuntimeTaxReport>;

	/** Event: overhead exceeded acceptable threshold */
	readonly onOverheadExceeded: Event<BenchmarkResult>;

	/** Benchmark the scheduler overhead */
	benchmarkSchedulerOverhead(): BenchmarkResult;

	/** Benchmark the orchestration overhead */
	benchmarkOrchestrationOverhead(): BenchmarkResult;

	/** Benchmark the recovery system overhead */
	benchmarkRecoveryOverhead(): BenchmarkResult;

	/** Benchmark the persistence layer cost */
	benchmarkPersistenceCost(): BenchmarkResult;

	/** Determine the real runtime tax (cumulative overhead) */
	determineRealRuntimeTax(): RuntimeTaxReport;

	/** Benchmark a full runtime cycle from start to finish */
	benchmarkFullRuntimeCycle(): BenchmarkResult;

	/** Run all benchmarks and return the complete results */
	runAllBenchmarks(): BenchmarkResult[];

	/** Get the current runtime tax estimate */
	getCurrentRuntimeTax(): RuntimeTaxReport;

	/** Validate runtime reality benchmarks */
	validateRuntimeRealityBenchmarks(): RuntimeTaxReport;
}

// =====================================================================================
// SERVICE #119 -- ISystemConvergenceReportService
// =====================================================================================

/**
 * ISystemConvergenceReportService -- The FINAL convergence report.
 *
 * This is the most important service in Phase 22. It produces the
 * final, honest, complete assessment of the entire system.
 * It answers: What IS this system? What is it NOT? What is CREDIBLE?
 * What is EXAGGERATED? What SURVIVES production? What must CHANGE?
 *
 * The core question: "After all the architecture, what do we ACTUALLY have?"
 */
export const ISystemConvergenceReportService = createDecorator<ISystemConvergenceReportService>('systemConvergenceReportService');

export interface ISystemConvergenceReportService {
	readonly _serviceBrand: undefined;

	/** Event: the convergence report was produced */
	readonly onConvergenceReportProduced: Event<SystemConvergenceReport>;

	/** Event: a harsh truth was revealed during convergence analysis */
	readonly onHarshTruthRevealed: Event<string>;

	/** Produce the complete system convergence report */
	produceConvergenceReport(): SystemConvergenceReport;

	/** Answer: What IS this system, honestly? */
	whatSystemReallyIs(): string;

	/** Answer: What is this system NOT, despite claims? */
	whatSystemIsNot(): string[];

	/** Answer: What subsystems are CREDIBLE and production-ready? */
	whatIsCredible(): CredibleSystem[];

	/** Answer: What claims about the system are EXAGGERATED? */
	whatIsExaggerated(): ExaggeratedClaim[];

	/** Answer: What would SURVIVE real production scrutiny? */
	whatSurvivesProductionScrutiny(): ProductionSurvivor[];

	/** Answer: What MUST be simplified before production? */
	whatMustBeSimplified(): SimplificationTarget[];

	/** Answer: What services SHOULD be removed entirely? */
	whatShouldBeRemoved(): RemovalCandidate[];

	/** Answer: What services SHOULD be rebuilt from scratch? */
	whatShouldBeRebuilt(): RebuildCandidate[];

	/** Get the harshest truths about the system */
	getHarshTruths(): string[];

	/** Get honest recommendations for the path forward */
	getHonestRecommendations(): string[];

	/** Validate system convergence report completeness */
	validateSystemConvergenceReport(): SystemConvergenceReport;
}

// =====================================================================================
// CROSS-SERVICE INTEGRATION TYPES
// =====================================================================================

/**
 * Reality audit scope -- the scope of a reality audit operation.
 */
export interface RealityAuditScope {
	readonly scopeId: string;
	readonly serviceIds: readonly string[];
	readonly includeExecutionTraces: boolean;
	readonly includeComplexityAnalysis: boolean;
	readonly includeScalabilityChecks: boolean;
	readonly includeObservabilityChecks: boolean;
	readonly includeBenchmarking: boolean;
	readonly estimatedDurationMs: number;
}

/**
 * Reality audit result -- the result of a full reality audit.
 */
export interface RealityAuditResult {
	readonly scope: RealityAuditScope;
	readonly classificationMap: Map<string, ServiceRealityClassification>;
	readonly truthScore: RealityScore;
	readonly deadCodeCount: number;
	readonly fakeAbstractionCount: number;
	readonly godServiceCount: number;
	readonly blockingGapCount: number;
	readonly observabilityCoveragePercent: number;
	readonly scalabilityClassification: ScalabilityClassification;
	readonly readinessClassification: ReadinessClassification;
	readonly productionCredibilityScore: number;
	readonly runtimeTaxMs: number;
	readonly harshTruths: readonly string[];
	readonly timestamp: number;
}

/**
 * Phase 22 validation state -- the current state of all Phase 22 validations.
 */
export interface Phase22ValidationState {
	readonly realityValidated: boolean;
	readonly executionTraced: boolean;
	readonly maintainabilityAnalyzed: boolean;
	readonly scalabilityAssessed: boolean;
	readonly operationalTruthAssessed: boolean;
	readonly observabilityAudited: boolean;
	readonly reductionAnalyzed: boolean;
	readonly readinessClassified: boolean;
	readonly runtimeBenchmarked: boolean;
	readonly convergenceReported: boolean;
	readonly allValidationsComplete: boolean;
	readonly overallTruthScore: number;
	readonly overallReadiness: ReadinessClassification;
	readonly timestamp: number;
}

/**
 * Convergence delta -- the change between two convergence reports.
 */
export interface ConvergenceDelta {
	readonly fromReportTimestamp: number;
	readonly toReportTimestamp: number;
	readonly truthScoreDelta: number;
	readonly credibilityScoreDelta: number;
	readonly observabilityDelta: number;
	readonly readinessClassificationChanged: boolean;
	readonly newHarshTruths: readonly string[];
	readonly resolvedHarshTruths: readonly string[];
	readonly newBlockingGaps: number;
	readonly resolvedBlockingGaps: number;
	readonly servicesRemoved: number;
	readonly servicesAdded: number;
	readonly complexityDelta: number;
	readonly honestAssessment: string;
}

/**
 * Honest system identity -- the one-paragraph honest description of what the system is.
 */
export interface HonestSystemIdentity {
	readonly systemName: string;
	readonly oneParagraphTruth: string;
	readonly isWhatItClaimsToBe: boolean;
	readonly gapBetweenClaimAndReality: string;
	readonly crediblePercentage: number;
	readonly exaggeratedPercentage: number;
	readonly placeholderPercentage: number;
	readonly productionReadyPercentage: number;
	readonly timestamp: number;
}
