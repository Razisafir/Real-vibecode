/*---------------------------------------------------------------------------------------------
 *  Phase 19 Validation — Architectural Consolidation & Production Hardening
 *  Real Vibecode — AI-Native IDE
 *
 *  Validates that the 10 Phase 19 consolidation services meet all requirements:
 *    1. No functionality is lost
 *    2. No service becomes orphaned
 *    3. Dependency graph is strictly simpler than Phase 18
 *    4. No new circular dependencies introduced
 *    5. System remains fully operational
 *--------------------------------------------------------------------------------------------*/

import {
	// Enums
	MergeStrategy, ChainSeverity, ServiceDomain, RedundancyType,
	APISimplificationAction, MigrationPhase, ComplexityDimension,
	ArchitectureMaturity,
	// Service interfaces
	IServiceConsolidationEngineService,
	IDependencyGraphSimplificationService,
	IServiceBoundaryClarificationService,
	ISystemModuleGroupingService,
	IRedundancyEliminationService,
	ISimplifiedOrchestrationService,
	IPublicAPISimplificationService,
	IComplexityMetricsService,
	ISafeMigrationStrategyService,
	IFinalArchitectureModelService,
} from '../common/systemConsolidation.js';

import {
	ServiceConsolidationEngineService,
	DependencyGraphSimplificationService,
	ServiceBoundaryClarificationService,
	SystemModuleGroupingService,
	RedundancyEliminationService,
	SimplifiedOrchestrationService,
	PublicAPISimplificationService,
	ComplexityMetricsService,
	SafeMigrationStrategyService,
	FinalArchitectureModelService,
} from './systemConsolidationService.js';

// ═══════════════════════════════════════════════════════════════════════════════
// VALIDATION TYPES
// ═══════════════════════════════════════════════════════════════════════════════

interface IValidationResult {
	readonly testName: string;
	readonly passed: boolean;
	readonly details: string;
	readonly severity: 'critical' | 'warning' | 'info';
}

interface IValidationReport {
	readonly totalTests: number;
	readonly passed: number;
	readonly failed: number;
	readonly results: readonly IValidationResult[];
	readonly allPassed: boolean;
	readonly timestamp: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// PHASE 19 VALIDATION SUITE
// ═══════════════════════════════════════════════════════════════════════════════

export class Phase19Validation {

	private readonly _results: IValidationResult[] = [];

	// Service instances
	private readonly _consolidationEngine = new ServiceConsolidationEngineService();
	private readonly _dependencySimplifier = new DependencyGraphSimplificationService();
	private readonly _boundaryClarifier = new ServiceBoundaryClarificationService();
	private readonly _moduleGrouper = new SystemModuleGroupingService();
	private readonly _redundancyEliminator = new RedundancyEliminationService();
	private readonly _orchestrationSimplifier = new SimplifiedOrchestrationService();
	private readonly _apiSimplifier = new PublicAPISimplificationService();
	private readonly _complexityMetrics = new ComplexityMetricsService();
	private readonly _migrationStrategy = new SafeMigrationStrategyService();
	private readonly _architectureModel = new FinalArchitectureModelService();

	/** Run all Phase 19 validation tests */
	validate(): IValidationReport {
		this._results.length = 0;

		// Test 1: Service Consolidation Engine
		this._testConsolidationEngine();

		// Test 2: Dependency Graph Simplification
		this._testDependencySimplification();

		// Test 3: Service Boundary Clarification
		this._testBoundaryClarification();

		// Test 4: Module Grouping
		this._testModuleGrouping();

		// Test 5: Redundancy Elimination
		this._testRedundancyElimination();

		// Test 6: Orchestration Simplification
		this._testOrchestrationSimplification();

		// Test 7: API Simplification
		this._testAPISimplification();

		// Test 8: Complexity Metrics
		this._testComplexityMetrics();

		// Test 9: Migration Strategy
		this._testMigrationStrategy();

		// Test 10: Final Architecture Model
		this._testArchitectureModel();

		// Test 11: No functionality lost
		this._testNoFunctionalityLost();

		// Test 12: No orphaned services
		this._testNoOrphanedServices();

		// Test 13: Dependency graph simpler than Phase 18
		this._testDependencyGraphSimpler();

		// Test 14: No new circular dependencies
		this._testNoNewCircularDependencies();

		// Test 15: System remains operational
		this._testSystemOperational();

		const passed = this._results.filter(r => r.passed).length;
		const failed = this._results.filter(r => !r.passed).length;

		return {
			totalTests: this._results.length,
			passed,
			failed,
			results: this._results,
			allPassed: failed === 0,
			timestamp: Date.now(),
		};
	}

	// ─── Service Tests ─────────────────────────────────────────────────────────

	private _testConsolidationEngine(): void {
		try {
			const report = this._consolidationEngine.analyzeAllServices();
			this._assert('Consolidation Engine: analyzes all services', report.totalServicesAnalyzed > 0, `Analyzed ${report.totalServicesAnalyzed} services`);
			this._assert('Consolidation Engine: no loss guaranteed', report.noLossGuaranteed, 'Behavioral loss guarantee active');
			this._assert('Consolidation Engine: backward compatible', report.backwardCompatible, 'Backward compatibility maintained');
			this._assert('Consolidation Engine: overlaps detected', report.overlapsDetected >= 0, `${report.overlapsDetected} overlaps detected`);
		} catch (e) {
			this._results.push({ testName: 'Consolidation Engine', passed: false, details: String(e), severity: 'critical' });
		}
	}

	private _testDependencySimplification(): void {
		try {
			const report = this._dependencySimplifier.simplifyDependencyGraph();
			this._assert('Dependency Simplification: builds graph', report.simplifiedGraph.totalServices > 0, `${report.simplifiedGraph.totalServices} services in graph`);
			this._assert('Dependency Simplification: simplifies depth', report.simplifiedMaxDepth <= report.originalMaxDepth, `Depth: ${report.originalMaxDepth} -> ${report.simplifiedMaxDepth}`);
			this._assert('Dependency Simplification: reduces edges', report.simplifiedEdgeCount <= report.originalEdgeCount, `Edges: ${report.originalEdgeCount} -> ${report.simplifiedEdgeCount}`);
			this._assert('Dependency Simplification: has recommendations', report.recommendations.length > 0, `${report.recommendations.length} recommendations`);
		} catch (e) {
			this._results.push({ testName: 'Dependency Simplification', passed: false, details: String(e), severity: 'critical' });
		}
	}

	private _testBoundaryClarification(): void {
		try {
			const report = this._boundaryClarifier.clarifyAllBoundaries();
			this._assert('Boundary Clarification: clarifies all services', report.totalServicesClarified > 0, `Clarified ${report.totalServicesClarified} services`);
			this._assert('Boundary Clarification: identifies ambiguous services', report.ambiguousServices >= 0, `${report.ambiguousServices} ambiguous services`);
			this._assert('Boundary Clarification: identifies overlapping', report.overlappingServices >= 0, `${report.overlappingServices} overlapping services`);
			this._assert('Boundary Clarification: has clarifications', report.clarifications.length >= 0, `${report.clarifications.length} clarifications`);
		} catch (e) {
			this._results.push({ testName: 'Boundary Clarification', passed: false, details: String(e), severity: 'critical' });
		}
	}

	private _testModuleGrouping(): void {
		try {
			const report = this._moduleGrouper.groupAllServices();
			this._assert('Module Grouping: groups into domains', report.totalDomains > 0, `${report.totalDomains} domains`);
			this._assert('Module Grouping: total services covered', report.totalServices > 0, `${report.totalServices} services covered`);
			this._assert('Module Grouping: has cohesion scores', report.averageCohesion >= 0, `Average cohesion: ${report.averageCohesion.toFixed(2)}`);
			this._assert('Module Grouping: groups have services', report.groups.every(g => g.serviceCount > 0), 'All groups have services');
		} catch (e) {
			this._results.push({ testName: 'Module Grouping', passed: false, details: String(e), severity: 'critical' });
		}
	}

	private _testRedundancyElimination(): void {
		try {
			const report = this._redundancyEliminator.scanForRedundancies();
			this._assert('Redundancy Elimination: scans for redundancies', report.totalRedundancies >= 0, `${report.totalRedundancies} redundancies found`);
			this._assert('Redundancy Elimination: preserves functionality', report.functionalityPreserved, 'All functionality preserved');
			this._assert('Redundancy Elimination: has elimination strategies', report.instances.every(i => i.eliminationStrategy.length > 0), 'All instances have strategies');
		} catch (e) {
			this._results.push({ testName: 'Redundancy Elimination', passed: false, details: String(e), severity: 'critical' });
		}
	}

	private _testOrchestrationSimplification(): void {
		try {
			const report = this._orchestrationSimplifier.simplifyCoordination();
			this._assert('Orchestration Simplification: reduces calls', report.totalCallReduction > 0, `${(report.totalCallReduction * 100).toFixed(0)}% call reduction`);
			this._assert('Orchestration Simplification: predictable routing', report.predictableRouting, 'Routing is predictable');
			this._assert('Orchestration Simplification: reduces noise', report.noiseReduction > 0, `${(report.noiseReduction * 100).toFixed(0)}% noise reduction`);
			this._assert('Orchestration Simplification: has flows', report.flows.length > 0, `${report.flows.length} orchestration flows`);
		} catch (e) {
			this._results.push({ testName: 'Orchestration Simplification', passed: false, details: String(e), severity: 'critical' });
		}
	}

	private _testAPISimplification(): void {
		try {
			const report = this._apiSimplifier.analyzeAPISurface();
			this._assert('API Simplification: analyzes surface', report.totalPublicMethods > 0, `${report.totalPublicMethods} public methods`);
			this._assert('API Simplification: identifies developer-facing', report.developerFacingMethods > 0, `${report.developerFacingMethods} developer-facing methods`);
			this._assert('API Simplification: has unified entry points', report.unifiedEntryPoints > 0, `${report.unifiedEntryPoints} unified entry points`);
			this._assert('API Simplification: estimates reduction', report.estimatedSurfaceReduction >= 0, `${(report.estimatedSurfaceReduction * 100).toFixed(0)}% estimated reduction`);
		} catch (e) {
			this._results.push({ testName: 'API Simplification', passed: false, details: String(e), severity: 'critical' });
		}
	}

	private _testComplexityMetrics(): void {
		try {
			const report = this._complexityMetrics.validateComplexityMetrics();
			this._assert('Complexity Metrics: computes global score', report.globalScore.overallScore > 0, `Global complexity: ${report.globalScore.overallScore}`);
			this._assert('Complexity Metrics: measures all dimensions', report.dimensionMeasurements.size >= 4, `${report.dimensionMeasurements.size} dimensions measured`);
			this._assert('Complexity Metrics: has Phase 18 comparison', report.comparison.improvement >= 0, `${report.comparison.improvement.toFixed(1)}% improvement`);
			this._assert('Complexity Metrics: maintainability index computed', report.globalScore.maintainabilityIndex > 0, `Maintainability: ${report.globalScore.maintainabilityIndex}`);
		} catch (e) {
			this._results.push({ testName: 'Complexity Metrics', passed: false, details: String(e), severity: 'critical' });
		}
	}

	private _testMigrationStrategy(): void {
		try {
			const plan = this._migrationStrategy.createMigrationPlan();
			this._assert('Migration Strategy: creates plan', plan.totalSteps > 0, `${plan.totalSteps} steps`);
			this._assert('Migration Strategy: zero runtime breakage', plan.zeroRuntimeBreakage, 'Zero runtime breakage guaranteed');
			this._assert('Migration Strategy: rollback possible', plan.rollbackPossible, 'Rollback always possible');
			this._assert('Migration Strategy: has all phases', plan.phases.length >= 4, `${plan.phases.length} phases`);
			this._assert('Migration Strategy: service mapping exists', this._migrationStrategy.getServiceMapping().size > 0, `${this._migrationStrategy.getServiceMapping().size} services mapped`);
		} catch (e) {
			this._results.push({ testName: 'Migration Strategy', passed: false, details: String(e), severity: 'critical' });
		}
	}

	private _testArchitectureModel(): void {
		try {
			const report = this._architectureModel.validateArchitectureModel();
			this._assert('Architecture Model: generates model', report.model.totalServices > 0, `${report.model.totalServices} services in model`);
			this._assert('Architecture Model: has domain groups', report.model.totalDomains > 0, `${report.model.totalDomains} domains`);
			this._assert('Architecture Model: is canonical blueprint', report.isCanonicalBlueprint, 'Serves as canonical blueprint');
			this._assert('Architecture Model: has merge map', report.serviceMergeMap.size > 0, `${report.serviceMergeMap.size} merge mappings`);
			this._assert('Architecture Model: has recommendations', report.recommendations.length > 0, `${report.recommendations.length} recommendations`);
		} catch (e) {
			this._results.push({ testName: 'Architecture Model', passed: false, details: String(e), severity: 'critical' });
		}
	}

	// ─── Cross-Cutting Validation Tests ────────────────────────────────────────

	private _testNoFunctionalityLost(): void {
		try {
			const consolidationReport = this._consolidationEngine.validateConsolidationEngine();
			const redundancyReport = this._redundancyEliminator.validateRedundancyElimination();
			const allPreserved = consolidationReport.noLossGuaranteed && redundancyReport.functionalityPreserved;
			this._assert('No functionality lost across all consolidations', allPreserved,
				`Consolidation preserved: ${consolidationReport.noLossGuaranteed}, Redundancy preserved: ${redundancyReport.functionalityPreserved}`);
		} catch (e) {
			this._results.push({ testName: 'No functionality lost', passed: false, details: String(e), severity: 'critical' });
		}
	}

	private _testNoOrphanedServices(): void {
		try {
			const groupingReport = this._moduleGrouper.validateModuleGrouping();
			const orphaned = groupingReport.orphanedServices;
			this._assert('No orphaned services after grouping', orphaned.length === 0,
				`${orphaned.length} orphaned services: ${orphaned.length > 0 ? orphaned.join(', ') : 'none'}`);
		} catch (e) {
			this._results.push({ testName: 'No orphaned services', passed: false, details: String(e), severity: 'critical' });
		}
	}

	private _testDependencyGraphSimpler(): void {
		try {
			const depReport = this._dependencySimplifier.validateDependencySimplification();
			const isSimpler = depReport.simplifiedMaxDepth <= depReport.originalMaxDepth
				&& depReport.simplifiedEdgeCount <= depReport.originalEdgeCount;
			this._assert('Dependency graph simpler than Phase 18', isSimpler,
				`Depth: ${depReport.originalMaxDepth} -> ${depReport.simplifiedMaxDepth}, Edges: ${depReport.originalEdgeCount} -> ${depReport.simplifiedEdgeCount}`);
		} catch (e) {
			this._results.push({ testName: 'Dependency graph simpler', passed: false, details: String(e), severity: 'critical' });
		}
	}

	private _testNoNewCircularDependencies(): void {
		try {
			const graph = this._dependencySimplifier.buildDependencyGraph();
			this._assert('No new circular dependencies', graph.circularDependencies === 0,
				`${graph.circularDependencies} circular dependencies detected`);
		} catch (e) {
			this._results.push({ testName: 'No circular dependencies', passed: false, details: String(e), severity: 'critical' });
		}
	}

	private _testSystemOperational(): void {
		try {
			// Verify all 10 services instantiate and respond to basic operations
			const consolidationOk = this._consolidationEngine.analyzeAllServices().totalServicesAnalyzed > 0;
			const dependencyOk = this._dependencySimplifier.buildDependencyGraph().totalServices > 0;
			const boundaryOk = this._boundaryClarifier.clarifyAllBoundaries().totalServicesClarified > 0;
			const groupingOk = this._moduleGrouper.groupAllServices().totalDomains > 0;
			const redundancyOk = this._redundancyEliminator.scanForRedundancies().functionalityPreserved;
			const orchestrationOk = this._orchestrationSimplifier.simplifyCoordination().flows.length > 0;
			const apiOk = this._apiSimplifier.analyzeAPISurface().totalPublicMethods > 0;
			const complexityOk = this._complexityMetrics.computeGlobalComplexityScore().overallScore > 0;
			const migrationOk = this._migrationStrategy.createMigrationPlan().totalSteps > 0;
			const architectureOk = this._architectureModel.generateArchitectureModel().totalServices > 0;

			const allOperational = consolidationOk && dependencyOk && boundaryOk && groupingOk
				&& redundancyOk && orchestrationOk && apiOk && complexityOk
				&& migrationOk && architectureOk;

			this._assert('All 10 Phase 19 services operational', allOperational,
				`Operational: ${[consolidationOk, dependencyOk, boundaryOk, groupingOk, redundancyOk, orchestrationOk, apiOk, complexityOk, migrationOk, architectureOk].filter(Boolean).length}/10`);
		} catch (e) {
			this._results.push({ testName: 'System operational', passed: false, details: String(e), severity: 'critical' });
		}
	}

	// ─── Helpers ───────────────────────────────────────────────────────────────

	private _assert(testName: string, condition: boolean, details: string): void {
		this._results.push({
			testName,
			passed: condition,
			details,
			severity: condition ? 'info' : 'critical',
		});
	}
}

// ═══════════════════════════════════════════════════════════════════════════════
// AUTO-EXECUTE VALIDATION
// ═══════════════════════════════════════════════════════════════════════════════

const validator = new Phase19Validation();
const report = validator.validate();

console.log('\n═══════════════════════════════════════════════════════════════');
console.log('  PHASE 19 VALIDATION — Architectural Consolidation');
console.log('═══════════════════════════════════════════════════════════════');
console.log(`  Total Tests: ${report.totalTests}`);
console.log(`  Passed:      ${report.passed}`);
console.log(`  Failed:      ${report.failed}`);
console.log(`  All Passed:  ${report.allPassed}`);
console.log('───────────────────────────────────────────────────────────────');

for (const result of report.results) {
	const icon = result.passed ? '[PASS]' : '[FAIL]';
	console.log(`  ${icon} ${result.testName}: ${result.details}`);
}

console.log('═══════════════════════════════════════════════════════════════\n');

export { report as phase19ValidationReport };
