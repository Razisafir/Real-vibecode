/*---------------------------------------------------------------------------------------------
 *  AI Execution Kernel — Memory Visualization Service Interface
 *  Real Vibecode — AI-Native IDE
 *
 *  IMemoryVisualizationService — Service identifier and interface
 *  for the visualization layer that renders memory data as HTML.
 *--------------------------------------------------------------------------------------------*/

import { Event } from '../../../../base/common/event.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';

export const IMemoryVisualizationService = createDecorator<IMemoryVisualizationService>('memoryVisualizationService');

export interface MemoryEntry {
	readonly id: string;
	readonly type: string;
	readonly content: string;
	readonly priority: 'critical' | 'high' | 'medium' | 'low';
	readonly tags: string[];
	readonly tokenCount: number;
	readonly createdAt: number;
	readonly updatedAt: number;
	readonly relevanceScore?: number;
	readonly isCompacted?: boolean;
}

export interface TokenBudget {
	readonly used: number;
	readonly total: number;
	readonly percentage: number;
}

export interface CompactionStatus {
	readonly phase: 'idle' | 'deleting-expired' | 'merging-duplicates' | 'archiving-low-priority' | 'summarizing-old';
	readonly entriesProcessed: number;
	readonly totalEntries: number;
	readonly tokensReclaimed: number;
}

export interface IMemoryVisualizationService {
	readonly _serviceBrand: undefined;

	/**
	 * Generate a complete, self-contained HTML document rendering the full
	 * memory visualization: budget gauge, timeline, filterable entry cards,
	 * compaction progress (if active), and relevance score bars.
	 */
	renderMemoryOverview(entries: MemoryEntry[], budget: TokenBudget, compactionStatus?: CompactionStatus): string;

	/**
	 * Render just the timeline section as an HTML fragment.
	 */
	renderTimeline(entries: MemoryEntry[]): string;

	/**
	 * Render just the token budget gauge as an HTML fragment.
	 */
	renderBudgetGauge(budget: TokenBudget): string;

	/**
	 * Event fired when a memory entry is selected in the rendered UI.
	 */
	readonly onDidSelectMemory: Event<string>;
}
