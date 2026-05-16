/*---------------------------------------------------------------------------------------------
 *  AI Context Engine — Phase 6 Context Persistence Layer
 *  Real Vibecode — AI-Native IDE
 *
 *  IContextPersistenceService — Incremental persistence for context engine data.
 *  Corruption-safe writes, bounded storage growth, lazy hydration on startup.
 *--------------------------------------------------------------------------------------------*/

import { Event } from '../../../../base/common/event.js';
import { IDisposable } from '../../../../base/common/lifecycle.js';
import { URI } from '../../../../base/common/uri.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { ContextDomain } from './aiContextService.js';

export const IContextPersistenceService = createDecorator<IContextPersistenceService>('contextPersistenceService');

// ─── Persistence Stats ─────────────────────────────────────────────────────────

export interface IContextPersistenceStats {
	readonly totalSizeBytes: number;
	readonly fileContextEntries: number;
	readonly symbolEntries: number;
	readonly dependencyEntries: number;
	readonly hotspotEntries: number;
	readonly clusterEntries: number;
	readonly lastFlushAt: number;
	readonly dirty: boolean;
}

// ─── Service Interface ─────────────────────────────────────────────────────────

/**
 * IContextPersistenceService — Incremental context persistence.
 *
 * Guarantees:
 *   - Incremental: only dirty domains are flushed
 *   - Corruption-safe: uses write-then-rename pattern
 *   - Bounded growth: compaction when files exceed threshold
 *   - Lazy hydration: loads only requested domains on startup
 *
 * Phase 6 implements:
 *   - JSONL persistence for file context, symbols, dependencies, hotspots, clusters
 *   - Per-domain dirty tracking
 *   - Periodic flush with configurable interval
 *   - Compaction when files exceed size threshold
 *   - Lazy hydration: only loads workspace + file context on startup
 */
export interface IContextPersistenceService {
	readonly _serviceBrand: undefined;

	/**
	 * Mark a domain as dirty (needs flush).
	 */
	markDirty(domain: ContextDomain): void;

	/**
	 * Flush dirty domains to disk.
	 */
	flush(): Promise<void>;

	/**
	 * Hydrate context data from disk.
	 * Only loads the specified domains (lazy hydration).
	 */
	hydrate(domains: ContextDomain[]): Promise<void>;

	/**
	 * Get persistence statistics.
	 */
	readonly stats: IContextPersistenceStats;

	/**
	 * Force a full compaction of all persisted data.
	 */
	compact(): Promise<void>;

	/**
	 * Event that fires when persistence flush completes.
	 */
	readonly onDidFlush: Event<IContextPersistenceStats>;
}
