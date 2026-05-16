/*---------------------------------------------------------------------------------------------
 *  AI Context Engine — Phase 6 Minimal Context UI Integration
 *  Real Vibecode — AI-Native IDE
 *
 *  AIContextUIService — Concrete implementation of IAIContextUIService.
 *  Derives UI view models from IAIContextService. Read-only, no business logic.
 *--------------------------------------------------------------------------------------------*/

import { Disposable } from '../../../../base/common/lifecycle.js';
import { Emitter, Event } from '../../../../base/common/event.js';
import { URI } from '../../../../base/common/uri.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { IAIContextService, IMutationHotspot } from '../common/aiContextService.js';
import {
	IAIContextUIService, IHotFileEntry, IHotspotEntry, IDependencyInsight,
	IWorkspaceIntelligenceSummary,
} from '../common/aiContextUI.js';

// ─── AIContextUIService ─────────────────────────────────────────────────────────

export class AIContextUIService extends Disposable implements IAIContextUIService {

	declare readonly _serviceBrand: undefined;

	private _summary: IWorkspaceIntelligenceSummary = {
		trackedFileCount: 0,
		trackedSymbolCount: 0,
		trackedDependencyCount: 0,
		activeHotspots: 0,
		recentClusters: 0,
		trendingFileCount: 0,
		topLanguage: '',
		lastUpdated: 0,
	};

	private readonly _onDidChangeIntelligence = this._register(new Emitter<IWorkspaceIntelligenceSummary>());
	readonly onDidChangeIntelligence: Event<IWorkspaceIntelligenceSummary> = this._onDidChangeIntelligence.event;

	constructor(
		@ILogService private readonly logService: ILogService,
		@IAIContextService private readonly contextService: IAIContextService,
	) {
		super();

		// Subscribe to context updates to refresh UI
		this._register(this.contextService.onDidUpdateContext(() => {
			this._recomputeSummary();
		}));

		this.logService.trace('[AIContextUIService] Phase 6 context UI initialized');
	}

	get intelligenceSummary(): IWorkspaceIntelligenceSummary {
		return this._summary;
	}

	getHotFiles(limit: number = 20): IHotFileEntry[] {
		const files = this.contextService.getAllFileContexts();
		return files
			.filter(f => f.hotspotScore > 0 || f.editCount > 0)
			.sort((a, b) => b.hotspotScore - a.hotspotScore)
			.slice(0, limit)
			.map(f => ({
				uri: f.uri,
				filename: f.uri.path.split('/').pop() ?? f.uri.path,
				hotspotScore: f.hotspotScore,
				editCount: f.editCount,
				lastEditedAt: f.lastEditedAt,
				isOpen: f.isOpen,
				mutationSource: f.extension,
			}));
	}

	getExecutionHotspots(limit: number = 20): IHotspotEntry[] {
		const hotspots = this.contextService.mutationHotspots;
		return hotspots
			.slice(0, limit)
			.map(h => ({
				fileUri: h.fileUri,
				filename: h.fileUri.path.split('/').pop() ?? h.fileUri.path,
				score: h.score,
				mutationCount: h.mutationCount,
				active: h.active,
				primarySource: h.primarySource,
			}));
	}

	getDependencyInsight(uri: URI): IDependencyInsight | undefined {
		const fileCtx = this.contextService.getFileContext(uri);
		if (!fileCtx) { return undefined; }

		const upstreamDeps = this.contextService.getDependencyChain(uri, 'upstream');
		const downstreamDeps = this.contextService.getDependencyChain(uri, 'downstream');

		const depMap = this.contextService.dependencyMap;
		const isHub = depMap.hubFiles.some(f => f.toString() === uri.toString());

		const topDependents = Array.from(new Set(upstreamDeps.map(d => d.source)))
			.slice(0, 5);
		const topDependencies = Array.from(new Set(downstreamDeps.map(d => d.target)))
			.slice(0, 5);

		return {
			uri,
			filename: uri.path.split('/').pop() ?? uri.path,
			upstreamCount: upstreamDeps.length,
			downstreamCount: downstreamDeps.length,
			isHub,
			topDependents,
			topDependencies,
		};
	}

	refresh(): void {
		this._recomputeSummary();
	}

	private _recomputeSummary(): void {
		const temporal = this.contextService.temporalContext;
		const wsCtx = this.contextService.workspaceContext;

		// Find top language
		let topLang = '';
		let topCount = 0;
		for (const [ext, count] of wsCtx.languageDistribution) {
			if (count > topCount) {
				topCount = count;
				topLang = ext;
			}
		}

		this._summary = {
			trackedFileCount: this.contextService.trackedFileCount,
			trackedSymbolCount: this.contextService.trackedSymbolCount,
			trackedDependencyCount: this.contextService.trackedDependencyCount,
			activeHotspots: this.contextService.mutationHotspots.filter(h => h.active).length,
			recentClusters: temporal.recentClusters.length,
			trendingFileCount: temporal.trendingFiles.length,
			topLanguage: topLang,
			lastUpdated: Date.now(),
		};

		this._onDidChangeIntelligence.fire(this._summary);
	}

	override dispose(): void {
		super.dispose();
	}
}
