/*---------------------------------------------------------------------------------------------
 *  AI Context Engine — Phase 6 Minimal Context UI Integration
 *  Real Vibecode — AI-Native IDE
 *
 *  IAIContextUIService — Read-only developer-facing UI for context engine.
 *  Provides observable state for:
 *    - Workspace Intelligence Panel
 *    - Hot Files View
 *    - Execution Hotspot View
 *    - Dependency Insight Preview
 *--------------------------------------------------------------------------------------------*/

import { Event } from '../../../../base/common/event.js';
import { URI } from '../../../../base/common/uri.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { IMutationHotspot, IExecutionCluster, IFileContext, IDependencyEdge } from './aiContextService.js';

export const IAIContextUIService = createDecorator<IAIContextUIService>('aiContextUIService');

// ─── UI View Models ────────────────────────────────────────────────────────────

/**
 * Hot file entry for the Hot Files View.
 */
export interface IHotFileEntry {
	readonly uri: URI;
	readonly filename: string;
	readonly hotspotScore: number;
	readonly editCount: number;
	readonly lastEditedAt: number | undefined;
	readonly isOpen: boolean;
	readonly mutationSource: string;
}

/**
 * Execution hotspot entry for the Execution Hotspot View.
 */
export interface IHotspotEntry {
	readonly fileUri: URI;
	readonly filename: string;
	readonly score: number;
	readonly mutationCount: number;
	readonly active: boolean;
	readonly primarySource: string;
}

/**
 * Dependency insight for a single file.
 */
export interface IDependencyInsight {
	readonly uri: URI;
	readonly filename: string;
	readonly upstreamCount: number;
	readonly downstreamCount: number;
	readonly isHub: boolean;
	readonly topDependents: readonly URI[];
	readonly topDependencies: readonly URI[];
}

/**
 * Workspace intelligence summary for the panel.
 */
export interface IWorkspaceIntelligenceSummary {
	readonly trackedFileCount: number;
	readonly trackedSymbolCount: number;
	readonly trackedDependencyCount: number;
	readonly activeHotspots: number;
	readonly recentClusters: number;
	readonly trendingFileCount: number;
	readonly topLanguage: string;
	readonly lastUpdated: number;
}

// ─── Service Interface ─────────────────────────────────────────────────────────

/**
 * IAIContextUIService — Read-only UI layer for the Context Engine.
 *
 * Provides observable state for UI panels. All data is derived from
 * IAIContextService — this service only transforms data into UI-friendly
 * view models. No business logic here.
 *
 * Phase 6 implements:
 *   - Workspace Intelligence Panel (summary stats)
 *   - Hot Files View (sorted by hotspot score)
 *   - Execution Hotspot View (active mutation hotspots)
 *   - Dependency Insight Preview (per-file dependency info)
 */
export interface IAIContextUIService {
	readonly _serviceBrand: undefined;

	/**
	 * Get the workspace intelligence summary.
	 */
	readonly intelligenceSummary: IWorkspaceIntelligenceSummary;

	/**
	 * Get hot files sorted by hotspot score.
	 */
	getHotFiles(limit?: number): IHotFileEntry[];

	/**
	 * Get active execution hotspots.
	 */
	getExecutionHotspots(limit?: number): IHotspotEntry[];

	/**
	 * Get dependency insight for a file.
	 */
	getDependencyInsight(uri: URI): IDependencyInsight | undefined;

	/**
	 * Event that fires when the intelligence summary changes.
	 */
	readonly onDidChangeIntelligence: Event<IWorkspaceIntelligenceSummary>;

	/**
	 * Refresh the UI data from the context engine.
	 */
	refresh(): void;
}
