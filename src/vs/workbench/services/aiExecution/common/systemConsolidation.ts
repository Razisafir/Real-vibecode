/*---------------------------------------------------------------------------------------------
 *  Architectural Consolidation & Production Hardening — Phase 19
 *  Real Vibecode — AI-Native IDE
 *
 *  Reduces architectural entropy without reducing capability.
 *  Merges overlapping systems, reduces cognitive complexity, simplifies
 *  dependency graph, improves long-term maintainability, makes the system
 *  safe to extend.
 *
 *  PRINCIPLES:
 *    1.  No functionality is ever removed — only merged or abstracted
 *    2.  Dependency graph must be strictly simpler after consolidation
 *    3.  No new circular dependencies introduced
 *    4.  Every service must have a single, unambiguous responsibility
 *    5.  Cross-service chatter must decrease, not increase
 *    6.  Public API surface must shrink while preserving capability
 *    7.  Complexity score must improve (lower is better)
 *    8.  Migration must be zero-runtime-breakage
 *    9.  Rollback must always be possible
 *   10.  The final architecture is the canonical system blueprint
 *
 *  Tasks:
 *    1.  Service Consolidation Engine
 *    2.  Dependency Graph Simplifier
 *    3.  Service Boundary Clarification Engine
 *    4.  System Module Grouping Layer
 *    5.  Redundancy Elimination Engine
 *    6.  Simplified Orchestration Layer
 *    7.  Public API Simplification Layer
 *    8.  Complexity Metrics Engine
 *    9.  Safe Migration Strategy Engine
 *   10.  Final Clean Architecture Model
 *--------------------------------------------------------------------------------------------*/

import { Event } from '../../../../base/common/event.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { SystemLayer } from './systemCoherence.js';

// ═══════════════════════════════════════════════════════════════════════════════
// SHARED TYPES — Consolidation & Architecture Primitives
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Merge strategy — how two services should be combined.
 */
export const enum MergeStrategy {
	/** Absorb target into source — source keeps its interface */
	Absorb = 'absorb',
	/** Create a new unified service replacing both */
	Unify = 'unify',
	/** Keep separate but share a common base abstraction */
	Abstract = 'abstract',
	/** No merge needed — services are distinct */
	NoMerge = 'no-merge',
}

/**
 * Dependency chain severity — how problematic a chain is.
 */
export const enum ChainSeverity {
	/** Clean — under 3 hops */
	Clean = 'clean',
	/** Acceptable — 3-4 hops */
	Acceptable = 'acceptable',
	/** Deep — 5-6 hops */
	Deep = 'deep',
	/** God chain — more than 6 hops */
	GodChain = 'god-chain',
	/** Circular — contains a cycle */
	Circular = 'circular',
}

/**
 * Service domain — the logical grouping of a service.
 */
export const enum ServiceDomain {
	/** Execution — core AI execution engine */
	Execution = 'execution',
	/** UX — user experience and interface */
	UX = 'ux',
	/** Human Workflow — human interaction intelligence */
	HumanWorkflow = 'human-workflow',
	/** Stability — system stabilization and reliability */
	Stability = 'stability',
	/** Intelligence/Coherence — cross-layer intelligence */
	Intelligence = 'intelligence',
	/** Replay/Debug — execution replay and debugging */
	ReplayDebug = 'replay-debug',
	/** Stress/Test — system testing and validation */
	StressTest = 'stress-test',
	/** Consolidation — architectural simplification */
	Consolidation = 'consolidation',
}

/**
 * Redundancy type — what kind of redundancy detected.
 */
export const enum RedundancyType {
	/** Duplicate logic paths */
	DuplicateLogic = 'duplicate-logic',
	/** Overlapping event handling */
	OverlappingEvents = 'overlapping-events',
	/** Repeated state tracking */
	RepeatedState = 'repeated-state',
	/** Redundant validation layers */
	RedundantValidation = 'redundant-validation',
	/** Duplicate type definitions */
	DuplicateTypes = 'duplicate-types',
}

/**
 * API simplification action — how to simplify an API.
 */
export const enum APISimplificationAction {
	/** Merge multiple methods into one */
	MergeMethods = 'merge-methods',
	/** Hide internal method from public API */
	HideInternal = 'hide-internal',
	/** Unify entry points */
	UnifyEntryPoint = 'unify-entry-point',
	/** Rename for clarity */
	RenameForClarity = 'rename-for-clarity',
	/** Group related methods into sub-interface */
	GroupIntoSubInterface = 'group-into-sub-interface',
	/** No change needed */
	KeepAsIs = 'keep-as-is',
}

/**
 * Migration phase — the stage of a migration.
 */
export const enum MigrationPhase {
	/** Analysis — analyzing what needs to change */
	Analysis = 'analysis',
	/** Preparation — setting up for migration */
	Preparation = 'preparation',
	/** Execution — performing the migration */
	Execution = 'execution',
	/** Validation — verifying migration success */
	Validation = 'validation',
	/** Completion — migration fully rolled out */
	Completion = 'completion',
	/** Rollback — reverting a failed migration */
	Rollback = 'rollback',
}

/**
 * Complexity dimension — what aspect of complexity to measure.
 */
export const enum ComplexityDimension {
	/** Dependency depth — how deep the dependency tree goes */
	DependencyDepth = 'dependency-depth',
	/** Service coupling — how tightly services are coupled */
	ServiceCoupling = 'service-coupling',
	/** Cognitive load — how hard the system is to understand */
	CognitiveLoad = 'cognitive-load',
	/** Cross-layer density — how much cross-layer interaction exists */
	CrossLayerDensity = 'cross-layer-density',
	/** Maintainability — how easy the system is to maintain */
	Maintainability = 'maintainability',
}

/**
 * Architecture maturity — the overall state of the architecture.
 */
export const enum ArchitectureMaturity {
	/** Prototype — exploratory, high entropy */
	Prototype = 'prototype',
	/** Growth — expanding rapidly, entropy increasing */
	Growth = 'growth',
	/** Stabilized — features complete, needs consolidation */
	Stabilized = 'stabilized',
	/** Hardened — consolidated, production-ready */
	Hardened = 'hardened',
	/** Optimized — minimal complexity, maximum capability */
	Optimized = 'optimized',
}

/**
 * Service overlap — detected overlap between two services.
 */
export interface IServiceOverlap {
	readonly serviceA: string;
	readonly serviceB: string;
	readonly overlapType: RedundancyType;
	readonly overlapScore: number; // 0.0-1.0 — how much overlap
	readonly sharedResponsibilities: readonly string[];
	readonly mergeStrategy: MergeStrategy;
	readonly mergeRisk: 'low' | 'medium' | 'high';
	readonly mergeBenefit: string;
}

/**
 * Consolidation proposal — a proposed merge of services.
 */
export interface IConsolidationProposal {
	readonly proposalId: string;
	readonly sourceService: string;
	readonly targetService: string;
	readonly mergeStrategy: MergeStrategy;
	readonly behavioralContract: string;
	readonly breakingChanges: readonly string[];
	readonly migrationSteps: readonly string[];
	readonly estimatedComplexityReduction: number; // 0.0-1.0
	readonly riskLevel: 'low' | 'medium' | 'high';
	readonly rollbackPossible: boolean;
}

/**
 * Consolidation engine report — full analysis of all 79+ services.
 */
export interface IConsolidationEngineReport {
	readonly totalServicesAnalyzed: number;
	readonly overlapsDetected: number;
	readonly mergeProposals: number;
	readonly estimatedComplexityReduction: number; // 0.0-1.0
	readonly noLossGuaranteed: boolean;
	readonly backwardCompatible: boolean;
	readonly proposals: readonly IConsolidationProposal[];
	readonly overlaps: readonly IServiceOverlap[];
	readonly timestamp: number;
}

/**
 * Dependency chain — a chain of service dependencies.
 */
export interface IDependencyChain {
	readonly chainId: string;
	readonly services: readonly string[];
	readonly hopCount: number;
	readonly severity: ChainSeverity;
	readonly containsCycle: boolean;
	readonly cycleServices: readonly string[];
}

/**
 * Dependency node — a service in the dependency graph.
 */
export interface IDependencyNode {
	readonly serviceId: string;
	readonly serviceName: string;
	readonly domain: ServiceDomain;
	readonly directDependencies: readonly string[];
	readonly dependentServices: readonly string[];
	readonly dependencyDepth: number;
	readonly couplingScore: number; // 0.0-1.0
}

/**
 * Simplified dependency graph — the improved graph structure.
 */
export interface ISimplifiedDependencyGraph {
	readonly totalServices: number;
	readonly totalEdges: number;
	readonly maxDepth: number;
	readonly averageDepth: number;
	readonly circularDependencies: number;
	readonly godChains: readonly IDependencyChain[];
	readonly flattenedChains: readonly IDependencyChain[];
	readonly nodes: readonly IDependencyNode[];
	readonly improvementOverBaseline: number; // 0.0-1.0
}

/**
 * Dependency simplification report.
 */
export interface IDependencySimplificationReport {
	readonly originalMaxDepth: number;
	readonly simplifiedMaxDepth: number;
	readonly originalEdgeCount: number;
	readonly simplifiedEdgeCount: number;
	readonly godChainsEliminated: number;
	readonly circularRisksReduced: number;
	readonly simplifiedGraph: ISimplifiedDependencyGraph;
	readonly recommendations: readonly string[];
	readonly timestamp: number;
}

/**
 * Service boundary — exact responsibility of a service.
 */
export interface IServiceBoundary {
	readonly serviceId: string;
	readonly serviceName: string;
	readonly primaryResponsibility: string;
	readonly secondaryResponsibilities: readonly string[];
	readonly overlapsWith: readonly string[];
	readonly ambiguousResponsibilities: readonly string[];
	readonly isSingleResponsibility: boolean;
	readonly recommendedClarification: string | null;
}

/**
 * Boundary clarification report.
 */
export interface IBoundaryClarificationReport {
	readonly totalServicesClarified: number;
	readonly ambiguousServices: number;
	readonly overlappingServices: number;
	readonly singleResponsibilityServices: number;
	readonly boundaries: readonly IServiceBoundary[];
	readonly clarifications: readonly IBoundaryClarification[];
	readonly timestamp: number;
}

/**
 * Boundary clarification — a specific clarification action.
 */
export interface IBoundaryClarification {
	readonly serviceId: string;
	readonly currentAmbiguity: string;
	readonly proposedClarification: string;
	readonly affectedServices: readonly string[];
	readonly riskLevel: 'low' | 'medium' | 'high';
}

/**
 * Module group — a cohesive domain grouping.
 */
export interface IModuleGroup {
	readonly domain: ServiceDomain;
	readonly domainName: string;
	readonly services: readonly string[];
	readonly serviceCount: number;
	readonly internalCoupling: number; // 0.0-1.0
	readonly externalCoupling: number; // 0.0-1.0
	readonly cohesionScore: number; // 0.0-1.0
	readonly primaryInterface: string;
	readonly description: string;
}

/**
 * Module grouping report.
 */
export interface IModuleGroupingReport {
	readonly totalDomains: number;
	readonly totalServices: number;
	readonly groups: readonly IModuleGroup[];
	readonly crossDomainDependencies: number;
	readonly averageCohesion: number; // 0.0-1.0
	readonly orphanedServices: readonly string[];
	readonly timestamp: number;
}

/**
 * Redundancy instance — a specific redundancy found.
 */
export interface IRedundancyInstance {
	readonly instanceId: string;
	readonly redundancyType: RedundancyType;
	readonly affectedServices: readonly string[];
	readonly description: string;
	readonly eliminationStrategy: string;
	readonly functionalityPreserved: boolean;
	readonly estimatedReduction: number; // 0.0-1.0
}

/**
 * Redundancy elimination report.
 */
export interface IRedundancyEliminationReport {
	readonly totalRedundancies: number;
	readonly eliminatedByMerge: number;
	readonly eliminatedByAbstraction: number;
	readonly functionalityPreserved: boolean;
	readonly instances: readonly IRedundancyInstance[];
	readonly estimatedComplexityReduction: number; // 0.0-1.0
	readonly timestamp: number;
}

/**
 * Orchestration step — a step in the simplified orchestration flow.
 */
export interface IOrchestrationStep {
	readonly stepId: string;
	readonly stepName: string;
	readonly participatingServices: readonly string[];
	readonly inputDomain: ServiceDomain;
	readonly outputDomain: ServiceDomain;
	readonly crossServiceCalls: number;
	readonly canBeInternalized: boolean;
}

/**
 * Simplified orchestration flow — the clean orchestration path.
 */
export interface ISimplifiedOrchestrationFlow {
	readonly flowId: string;
	readonly flowName: string;
	readonly steps: readonly IOrchestrationStep[];
	readonly totalCrossServiceCalls: number;
	readonly originalCrossServiceCalls: number;
	readonly callReduction: number; // 0.0-1.0
	readonly predictable: boolean;
}

/**
 * Orchestration simplification report.
 */
export interface IOrchestrationSimplificationReport {
	readonly flows: readonly ISimplifiedOrchestrationFlow[];
	readonly totalCallReduction: number; // 0.0-1.0
	readonly noiseReduction: number; // 0.0-1.0
	readonly predictableRouting: boolean;
	readonly recommendations: readonly string[];
	readonly timestamp: number;
}

/**
 * API surface method — a method in the public API.
 */
export interface IAPISurfaceMethod {
	readonly serviceId: string;
	readonly methodName: string;
	readonly isPublic: boolean;
	readonly isInternal: boolean;
	readonly simplificationAction: APISimplificationAction;
	readonly developerFacing: boolean;
	readonly usageFrequency: number; // 0.0-1.0 estimated
}

/**
 * API surface service — a service's public API surface.
 */
export interface IAPISurfaceService {
	readonly serviceId: string;
	readonly publicMethods: number;
	readonly internalMethods: number;
	readonly developerFacingMethods: number;
	readonly simplificationActions: readonly APISimplificationAction[];
	readonly estimatedReduction: number; // 0.0-1.0
}

/**
 * API simplification report.
 */
export interface IAPISimplificationReport {
	readonly totalPublicMethods: number;
	readonly totalInternalMethods: number;
	readonly developerFacingMethods: number;
	readonly estimatedSurfaceReduction: number; // 0.0-1.0
	readonly unifiedEntryPoints: number;
	readonly services: readonly IAPISurfaceService[];
	readonly recommendations: readonly string[];
	readonly timestamp: number;
}

/**
 * Complexity measurement — a measurement of one complexity dimension.
 */
export interface IComplexityMeasurement {
	readonly dimension: ComplexityDimension;
	readonly rawScore: number; // 0-100
	readonly normalizedScore: number; // 0.0-1.0
	readonly classification: 'low' | 'moderate' | 'high' | 'critical';
	readonly contributors: readonly string[];
}

/**
 * Global complexity score — the overall system complexity.
 */
export interface IGlobalComplexityScore {
	readonly overallScore: number; // 0-100 (lower is better)
	readonly dependencyDepth: number;
	readonly serviceCoupling: number;
	readonly cognitiveLoad: number;
	readonly crossLayerDensity: number;
	readonly maintainabilityIndex: number; // 0-100 (higher is better)
	readonly measurements: readonly IComplexityMeasurement[];
	readonly classification: ArchitectureMaturity;
	readonly timestamp: number;
}

/**
 * Complexity comparison — Phase 18 vs Phase 19.
 */
export interface IComplexityComparison {
	readonly phase18Score: IGlobalComplexityScore;
	readonly phase19Score: IGlobalComplexityScore;
	readonly improvement: number; // percentage improvement
	readonly dependencyDepthImproved: boolean;
	readonly couplingReduced: boolean;
	readonly cognitiveLoadReduced: boolean;
	readonly maintainabilityImproved: boolean;
	readonly timestamp: number;
}

/**
 * Migration step — a single step in the migration plan.
 */
export interface IMigrationStep {
	readonly stepId: string;
	readonly phase: MigrationPhase;
	readonly description: string;
	readonly affectedServices: readonly string[];
	readonly oldStructure: string;
	readonly newStructure: string;
	readonly rollbackCommand: string;
	readonly verification: string;
	readonly riskLevel: 'low' | 'medium' | 'high';
	readonly estimatedDuration: string;
}

/**
 * Migration plan — the full phased consolidation plan.
 */
export interface IMigrationPlan {
	readonly planId: string;
	readonly totalSteps: number;
	readonly phases: readonly MigrationPhase[];
	readonly steps: readonly IMigrationStep[];
	readonly zeroRuntimeBreakage: boolean;
	readonly rollbackPossible: boolean;
	readonly estimatedTotalDuration: string;
	readonly riskSummary: string;
}

/**
 * Migration report — the current state of migration.
 */
export interface IMigrationReport {
	readonly plan: IMigrationPlan;
	readonly currentPhase: MigrationPhase;
	readonly completedSteps: number;
	readonly totalSteps: number;
	readonly progress: number; // 0.0-1.0
	readonly runtimeBreakages: number;
	readonly rollbackUsed: number;
	readonly timestamp: number;
}

/**
 * Architecture node — a service in the final architecture.
 */
export interface IArchitectureNode {
	readonly serviceId: string;
	readonly serviceName: string;
	readonly domain: ServiceDomain;
	readonly responsibility: string;
	readonly dependencies: readonly string[];
	readonly publicAPI: readonly string[];
	readonly isGrouped: boolean;
	readonly groupName: string | null;
}

/**
 * Architecture edge — a dependency in the final architecture.
 */
export interface IArchitectureEdge {
	readonly from: string;
	readonly to: string;
	readonly edgeType: 'dependency' | 'signal' | 'event' | 'data-flow';
	readonly isCrossDomain: boolean;
	readonly isSimplified: boolean;
}

/**
 * Final architecture model — the canonical system blueprint.
 */
export interface IFinalArchitectureModel {
	readonly modelId: string;
	readonly totalServices: number;
	readonly totalDomains: number;
	readonly nodes: readonly IArchitectureNode[];
	readonly edges: readonly IArchitectureEdge[];
	readonly moduleGroups: readonly IModuleGroup[];
	readonly complexityScore: IGlobalComplexityScore;
	readonly maturityLevel: ArchitectureMaturity;
	readonly isProductionHardened: boolean;
	readonly isSafeToExtend: boolean;
	readonly timestamp: number;
}

/**
 * Architecture model report.
 */
export interface IArchitectureModelReport {
	readonly model: IFinalArchitectureModel;
	readonly serviceMergeMap: ReadonlyMap<string, string>;
	readonly dependencyImprovement: IDependencySimplificationReport;
	readonly complexityComparison: IComplexityComparison;
	readonly isCanonicalBlueprint: boolean;
	readonly recommendations: readonly string[];
	readonly timestamp: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// TASK 1 — SERVICE CONSOLIDATION ENGINE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * IServiceConsolidationEngineService — Analyzes all 79 services for consolidation.
 *
 * Identifies true overlap (not conceptual similarity), proposes safe merges,
 * ensures no behavioral loss, maintains backward compatibility.
 */
export const IServiceConsolidationEngineService = createDecorator<IServiceConsolidationEngineService>('serviceConsolidationEngineService');

export interface IServiceConsolidationEngineService {
	readonly _serviceBrand: undefined;

	/** Event: overlap detected */
	readonly onDidDetectOverlap: Event<IServiceOverlap>;

	/** Event: consolidation proposal created */
	readonly onDidCreateProposal: Event<IConsolidationProposal>;

	/** Analyze all services for consolidation opportunities */
	analyzeAllServices(): IConsolidationEngineReport;

	/** Analyze a specific service for overlaps */
	analyzeService(serviceId: string): IServiceOverlap[];

	/** Propose a consolidation merge */
	proposeConsolidation(sourceService: string, targetService: string, strategy: MergeStrategy): IConsolidationProposal;

	/** Get all detected overlaps */
	getAllOverlaps(): readonly IServiceOverlap[];

	/** Get all consolidation proposals */
	getAllProposals(): readonly IConsolidationProposal[];

	/** Verify no behavioral loss in a proposed merge */
	verifyNoBehavioralLoss(proposalId: string): boolean;

	/** Validate consolidation engine */
	validateConsolidationEngine(): IConsolidationEngineReport;
}

// ═══════════════════════════════════════════════════════════════════════════════
// TASK 2 — DEPENDENCY GRAPH SIMPLIFIER
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * IDependencyGraphSimplificationService — Simplifies the dependency graph.
 *
 * Detects deep dependency chains (>6 hops), flattens unnecessary layering,
 * reduces circular risk exposure, identifies "god chains".
 */
export const IDependencyGraphSimplificationService = createDecorator<IDependencyGraphSimplificationService>('dependencyGraphSimplificationService');

export interface IDependencyGraphSimplificationService {
	readonly _serviceBrand: undefined;

	/** Event: god chain detected */
	readonly onDidDetectGodChain: Event<IDependencyChain>;

	/** Event: chain flattened */
	readonly onDidFlattenChain: Event<IDependencyChain>;

	/** Build the current dependency graph */
	buildDependencyGraph(): ISimplifiedDependencyGraph;

	/** Detect deep chains (>6 hops) */
	detectDeepChains(): readonly IDependencyChain[];

	/** Detect circular dependencies */
	detectCircularDependencies(): readonly IDependencyChain[];

	/** Flatten a specific chain */
	flattenChain(chainId: string): IDependencyChain | null;

	/** Simplify the entire dependency graph */
	simplifyDependencyGraph(): IDependencySimplificationReport;

	/** Get current graph metrics */
	readonly currentMaxDepth: number;

	/** Get current edge count */
	readonly currentEdgeCount: number;

	/** Validate dependency simplification */
	validateDependencySimplification(): IDependencySimplificationReport;
}

// ═══════════════════════════════════════════════════════════════════════════════
// TASK 3 — SERVICE BOUNDARY CLARIFICATION ENGINE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * IServiceBoundaryClarificationService — Clarifies exact service responsibilities.
 *
 * Defines exact responsibility of each service, removes ambiguous overlap,
 * enforces single-responsibility clarity, prevents future duplication.
 */
export const IServiceBoundaryClarificationService = createDecorator<IServiceBoundaryClarificationService>('serviceBoundaryClarificationService');

export interface IServiceBoundaryClarificationService {
	readonly _serviceBrand: undefined;

	/** Event: boundary clarified */
	readonly onDidClarifyBoundary: Event<IServiceBoundary>;

	/** Clarify all service boundaries */
	clarifyAllBoundaries(): IBoundaryClarificationReport;

	/** Clarify a specific service boundary */
	clarifyServiceBoundary(serviceId: string): IServiceBoundary;

	/** Get ambiguous services */
	getAmbiguousServices(): readonly IServiceBoundary[];

	/** Get overlapping service pairs */
	getOverlappingPairs(): readonly [string, string][];

	/** Enforce single responsibility check */
	isSingleResponsibility(serviceId: string): boolean;

	/** Validate boundary clarification */
	validateBoundaryClarification(): IBoundaryClarificationReport;
}

// ═══════════════════════════════════════════════════════════════════════════════
// TASK 4 — SYSTEM MODULE GROUPING LAYER
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * ISystemModuleGroupingService — Groups services into logical domains.
 *
 * Groups: Execution Domain, UX Domain, Human Workflow Domain,
 * Stability Domain, Intelligence/Coherence Domain, Replay/Debug Domain.
 * Each group behaves as a cohesive subsystem.
 */
export const ISystemModuleGroupingService = createDecorator<ISystemModuleGroupingService>('systemModuleGroupingService');

export interface ISystemModuleGroupingService {
	readonly _serviceBrand: undefined;

	/** Event: group formed */
	readonly onDidFormGroup: Event<IModuleGroup>;

	/** Group all services into domains */
	groupAllServices(): IModuleGroupingReport;

	/** Get a specific domain group */
	getDomainGroup(domain: ServiceDomain): IModuleGroup;

	/** Get service's domain */
	getServiceDomain(serviceId: string): ServiceDomain;

	/** Calculate domain cohesion */
	calculateCohesion(domain: ServiceDomain): number;

	/** Get cross-domain dependencies */
	getCrossDomainDependencies(): number;

	/** Get orphaned services (no clear domain) */
	getOrphanedServices(): readonly string[];

	/** Validate module grouping */
	validateModuleGrouping(): IModuleGroupingReport;
}

// ═══════════════════════════════════════════════════════════════════════════════
// TASK 5 — REDUNDANCY ELIMINATION ENGINE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * IRedundancyEliminationService — Detects and eliminates redundancy.
 *
 * Detects: duplicate logic paths, overlapping event handling,
 * repeated state tracking, redundant validation layers.
 * IMPORTANT: DO NOT delete functionality. ONLY merge or abstract.
 */
export const IRedundancyEliminationService = createDecorator<IRedundancyEliminationService>('redundancyEliminationService');

export interface IRedundancyEliminationService {
	readonly _serviceBrand: undefined;

	/** Event: redundancy detected */
	readonly onDidDetectRedundancy: Event<IRedundancyInstance>;

	/** Event: redundancy eliminated */
	readonly onDidEliminateRedundancy: Event<IRedundancyInstance>;

	/** Scan for all redundancies */
	scanForRedundancies(): IRedundancyEliminationReport;

	/** Eliminate a specific redundancy */
	eliminateRedundancy(instanceId: string): boolean;

	/** Check if functionality is preserved after elimination */
	verifyFunctionalityPreserved(instanceId: string): boolean;

	/** Get all detected redundancies */
	getAllRedundancies(): readonly IRedundancyInstance[];

	/** Get redundancy score */
	readonly redundancyScore: number; // 0.0-1.0

	/** Validate redundancy elimination */
	validateRedundancyElimination(): IRedundancyEliminationReport;
}

// ═══════════════════════════════════════════════════════════════════════════════
// TASK 6 — SIMPLIFIED ORCHESTRATION LAYER
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * ISimplifiedOrchestrationService — Replaces scattered coordination with clean flow.
 *
 * Replaces scattered coordination logic with one clean orchestration flow,
 * predictable execution routing, minimal cross-service chatter.
 * This reduces system "noise".
 */
export const ISimplifiedOrchestrationService = createDecorator<ISimplifiedOrchestrationService>('simplifiedOrchestrationService');

export interface ISimplifiedOrchestrationService {
	readonly _serviceBrand: undefined;

	/** Event: flow simplified */
	readonly onDidSimplifyFlow: Event<ISimplifiedOrchestrationFlow>;

	/** Define the clean orchestration flow */
	defineOrchestrationFlow(): ISimplifiedOrchestrationFlow;

	/** Get all orchestration flows */
	getAllFlows(): readonly ISimplifiedOrchestrationFlow[];

	/** Simplify cross-service coordination */
	simplifyCoordination(): IOrchestrationSimplificationReport;

	/** Get current cross-service call count */
	readonly currentCrossServiceCallCount: number;

	/** Get noise reduction score */
	readonly noiseReductionScore: number; // 0.0-1.0

	/** Validate orchestration simplification */
	validateOrchestrationSimplification(): IOrchestrationSimplificationReport;
}

// ═══════════════════════════════════════════════════════════════════════════════
// TASK 7 — PUBLIC API SIMPLIFICATION LAYER
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * IPublicAPISimplificationService — Reduces exposed API surface complexity.
 *
 * Creates a clean developer-facing API, hides internal orchestration
 * complexity, unifies entry points.
 */
export const IPublicAPISimplificationService = createDecorator<IPublicAPISimplificationService>('publicAPISimplificationService');

export interface IPublicAPISimplificationService {
	readonly _serviceBrand: undefined;

	/** Event: API simplified */
	readonly onDidSimplifyAPI: Event<IAPISurfaceService>;

	/** Analyze the full API surface */
	analyzeAPISurface(): IAPISimplificationReport;

	/** Simplify a specific service's API */
	simplifyServiceAPI(serviceId: string): IAPISurfaceService;

	/** Get developer-facing API */
	getDeveloperFacingAPI(): readonly IAPISurfaceMethod[];

	/** Get unified entry points */
	getUnifiedEntryPoints(): readonly IAPISurfaceMethod[];

	/** Get estimated API surface reduction */
	readonly estimatedSurfaceReduction: number; // 0.0-1.0

	/** Validate API simplification */
	validateAPISimplification(): IAPISimplificationReport;
}

// ═══════════════════════════════════════════════════════════════════════════════
// TASK 8 — COMPLEXITY METRICS ENGINE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * IComplexityMetricsService — Measures system complexity across dimensions.
 *
 * Measures: dependency depth, service coupling score, cognitive load score,
 * cross-layer interaction density, maintainability index.
 * Outputs: GLOBAL COMPLEXITY SCORE (0-100).
 */
export const IComplexityMetricsService = createDecorator<IComplexityMetricsService>('complexityMetricsService');

export interface IComplexityMetricsService {
	readonly _serviceBrand: undefined;

	/** Event: complexity score changed */
	readonly onDidChangeComplexity: Event<IGlobalComplexityScore>;

	/** Measure a specific complexity dimension */
	measureDimension(dimension: ComplexityDimension): IComplexityMeasurement;

	/** Compute global complexity score */
	computeGlobalComplexityScore(): IGlobalComplexityScore;

	/** Compare Phase 18 vs Phase 19 complexity */
	compareWithBaseline(): IComplexityComparison;

	/** Get current complexity score */
	readonly currentComplexityScore: IGlobalComplexityScore | null;

	/** Get maintainability index */
	readonly maintainabilityIndex: number; // 0-100

	/** Validate complexity metrics */
	validateComplexityMetrics(): IComplexityMetricsReport;
}

/**
 * Complexity metrics report.
 */
export interface IComplexityMetricsReport {
	readonly globalScore: IGlobalComplexityScore;
	readonly dimensionMeasurements: ReadonlyMap<ComplexityDimension, IComplexityMeasurement>;
	readonly comparison: IComplexityComparison;
	readonly issues: readonly IComplexityMetricsIssue[];
	readonly timestamp: number;
}

/**
 * Complexity metrics issue.
 */
export interface IComplexityMetricsIssue {
	readonly issueType: 'excessive-depth' | 'high-coupling' | 'cognitive-overload' | 'dense-cross-layer' | 'low-maintainability';
	readonly dimension: ComplexityDimension;
	readonly description: string;
	readonly severity: 'critical' | 'warning' | 'info';
}

// ═══════════════════════════════════════════════════════════════════════════════
// TASK 9 — SAFE MIGRATION STRATEGY ENGINE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * ISafeMigrationStrategyService — Plans and executes safe consolidation migration.
 *
 * Proposes phased consolidation plan, ensures zero runtime breakage,
 * maps old to new service structure, provides rollback strategy.
 */
export const ISafeMigrationStrategyService = createDecorator<ISafeMigrationStrategyService>('safeMigrationStrategyService');

export interface ISafeMigrationStrategyService {
	readonly _serviceBrand: undefined;

	/** Event: migration step completed */
	readonly onDidCompleteStep: Event<IMigrationStep>;

	/** Event: migration phase changed */
	readonly onDidChangePhase: Event<MigrationPhase>;

	/** Create a migration plan */
	createMigrationPlan(): IMigrationPlan;

	/** Execute the next migration step */
	executeNextStep(): IMigrationStep | null;

	/** Rollback the last step */
	rollbackLastStep(): IMigrationStep | null;

	/** Get current migration report */
	getMigrationReport(): IMigrationReport;

	/** Verify zero runtime breakage */
	verifyZeroBreakage(): boolean;

	/** Get old to new service mapping */
	getServiceMapping(): ReadonlyMap<string, string>;

	/** Validate migration strategy */
	validateMigrationStrategy(): IMigrationReport;
}

// ═══════════════════════════════════════════════════════════════════════════════
// TASK 10 — FINAL CLEAN ARCHITECTURE MODEL
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * IFinalArchitectureModelService — Produces the canonical system blueprint.
 *
 * Produces: simplified system map, final service grouping,
 * clean dependency structure, recommended production architecture.
 * This becomes the canonical system blueprint.
 */
export const IFinalArchitectureModelService = createDecorator<IFinalArchitectureModelService>('finalArchitectureModelService');

export interface IFinalArchitectureModelService {
	readonly _serviceBrand: undefined;

	/** Event: architecture model updated */
	readonly onDidUpdateModel: Event<IFinalArchitectureModel>;

	/** Generate the final architecture model */
	generateArchitectureModel(): IFinalArchitectureModel;

	/** Get the service merge map */
	getServiceMergeMap(): ReadonlyMap<string, string>;

	/** Get the dependency improvement report */
	getDependencyImprovement(): IDependencySimplificationReport;

	/** Get the complexity comparison */
	getComplexityComparison(): IComplexityComparison;

	/** Get migration strategy */
	getMigrationStrategy(): IMigrationPlan;

	/** Check if architecture is production hardened */
	readonly isProductionHardened: boolean;

	/** Check if architecture is safe to extend */
	readonly isSafeToExtend: boolean;

	/** Validate final architecture model */
	validateArchitectureModel(): IArchitectureModelReport;
}
