/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

/**
 * memoryVisualizationService.ts -- Memory Visualization UI Service
 *
 * Generates HTML/CSS/JS content for rendering memory data in a VS Code webview panel.
 * Provides visual representations of memory entries, token budgets, compaction progress,
 * relevance scores, and interactive filtering — all using HTML/CSS (not Canvas) for
 * superior text rendering and accessibility.
 *
 * Service: IMemoryVisualizationService
 */

import { Disposable } from '../../../../base/common/lifecycle.js';
import { Emitter, Event } from '../../../../base/common/event.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { ILogService } from '../../../../platform/log/common/log.js';

// -- Service Identifier --

export const IMemoryVisualizationService = createDecorator<IMemoryVisualizationService>('memoryVisualizationService');

// -- Visualization-Specific Types --

/**
 * A memory entry for visualization purposes. This is a UI-oriented projection
 * of the data model from projectMemoryService and longHorizonMemoryService.
 */
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

/**
 * Token budget accounting for the budget gauge visualization.
 */
export interface TokenBudget {
	readonly used: number;
	readonly total: number;
	readonly percentage: number;
}

/**
 * Compaction progress status for the compaction progress indicator.
 */
export interface CompactionStatus {
	readonly phase: 'idle' | 'deleting-expired' | 'merging-duplicates' | 'archiving-low-priority' | 'summarizing-old';
	readonly entriesProcessed: number;
	readonly totalEntries: number;
	readonly tokensReclaimed: number;
}

// -- Service Interface --

/**
 * IMemoryVisualizationService -- Generates visual HTML content for memory data.
 *
 * Responsibilities:
 *   - Render a complete memory overview as a self-contained HTML document
 *   - Render individual sections (timeline, budget gauge) independently
 *   - Fire events when memory entries are selected in the UI
 *   - Provide VS Code-themed, responsive, filterable visualizations
 *
 * Limitations:
 *   - Generates HTML strings; does not manage webview lifecycle
 *   - Filtering is client-side within the generated HTML
 *   - No direct DOM access — content is intended for webview panels
 */
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
	 * Shows memory entries as horizontal, color-coded markers over time.
	 */
	renderTimeline(entries: MemoryEntry[]): string;

	/**
	 * Render just the token budget gauge as an HTML fragment.
	 * Shows a progress bar with used/total tokens and percentage.
	 */
	renderBudgetGauge(budget: TokenBudget): string;

	/**
	 * Event fired when a memory entry is selected in the rendered UI.
	 * The payload is the memory entry ID.
	 */
	readonly onDidSelectMemory: Event<string>;
}

// -- Memory Type Styling Configuration --

interface MemoryTypeStyle {
	readonly color: string;
	readonly icon: string;
	readonly label: string;
}

const MEMORY_TYPE_STYLES: Record<string, MemoryTypeStyle> = {
	context: { color: '#4A90D9', icon: '\u{1F4D6}', label: 'Context' },           // 📖 Blue
	decision: { color: '#9C27B0', icon: '\u{2696}', label: 'Decision' },           // ⚖ Purple
	'error-pattern': { color: '#F44336', icon: '\u{26A0}', label: 'Error Pattern' }, // ⚠ Red
	preference: { color: '#4CAF50', icon: '\u{2699}', label: 'Preference' },        // ⚙ Green
	knowledge: { color: '#FF9800', icon: '\u{1F4A1}', label: 'Knowledge' },         // 💡 Orange
	conversation: { color: '#009688', icon: '\u{1F4AC}', label: 'Conversation' },   // 💬 Teal
};

const DEFAULT_TYPE_STYLE: MemoryTypeStyle = { color: '#78909C', icon: '\u{1F4CB}', label: 'Other' }; // 📋 Grey

const PRIORITY_ORDER: Record<string, number> = {
	critical: 4,
	high: 3,
	medium: 2,
	low: 1,
};

// -- Helpers --

function getTypeStyle(type: string): MemoryTypeStyle {
	return MEMORY_TYPE_STYLES[type] ?? DEFAULT_TYPE_STYLE;
}

function escapeHtml(text: string): string {
	return text
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;');
}

function formatRelativeTime(timestamp: number): string {
	const now = Date.now();
	const diff = now - timestamp;
	const minutes = Math.floor(diff / 60_000);
	const hours = Math.floor(diff / 3_600_000);
	const days = Math.floor(diff / 86_400_000);

	if (minutes < 1) { return 'just now'; }
	if (minutes < 60) { return `${minutes}m ago`; }
	if (hours < 24) { return `${hours}h ago`; }
	if (days < 30) { return `${days}d ago`; }
	return new Date(timestamp).toLocaleDateString();
}

function formatNumber(n: number): string {
	if (n >= 1_000_000) { return (n / 1_000_000).toFixed(1) + 'M'; }
	if (n >= 1_000) { return (n / 1_000).toFixed(1) + 'K'; }
	return n.toString();
}

function budgetGaugeColor(percentage: number): string {
	if (percentage >= 90) { return '#F44336'; } // Red - critical
	if (percentage >= 75) { return '#FF9800'; } // Orange - warning
	if (percentage >= 50) { return '#FFC107'; } // Amber - caution
	return '#4CAF50'; // Green - healthy
}

function compactionPhaseLabel(phase: CompactionStatus['phase']): string {
	switch (phase) {
		case 'idle': return 'Idle';
		case 'deleting-expired': return 'Deleting Expired';
		case 'merging-duplicates': return 'Merging Duplicates';
		case 'archiving-low-priority': return 'Archiving Low Priority';
		case 'summarizing-old': return 'Summarizing Old';
	}
}

function compactionPhaseIndex(phase: CompactionStatus['phase']): number {
	switch (phase) {
		case 'idle': return 0;
		case 'deleting-expired': return 1;
		case 'merging-duplicates': return 2;
		case 'archiving-low-priority': return 3;
		case 'summarizing-old': return 4;
	}
}

// ============================================================================
// CSS Template
// ============================================================================

function getStyles(): string {
	return `
		*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

		:root {
			--bg: var(--vscode-editor-background, #1e1e1e);
			--fg: var(--vscode-editor-foreground, #cccccc);
			--fg-muted: var(--vscode-descriptionForeground, #8b8b8b);
			--border: var(--vscode-panel-border, #474747);
			--card-bg: var(--vscode-editorWidget-background, #252526);
			--card-border: var(--vscode-editorWidget-border, #454545);
			--hover-bg: var(--vscode-list-hoverBackground, #2a2d2e);
			--active-bg: var(--vscode-list-activeSelectionBackground, #094771);
			--active-fg: var(--vscode-list-activeSelectionForeground, #ffffff);
			--button-bg: var(--vscode-button-background, #0e639c);
			--button-fg: var(--vscode-button-foreground, #ffffff);
			--input-bg: var(--vscode-input-background, #3c3c3c);
			--input-fg: var(--vscode-input-foreground, #cccccc);
			--input-border: var(--vscode-input-border, #3c3c3c);
			--badge-bg: var(--vscode-badge-background, #4d4d4d);
			--badge-fg: var(--vscode-badge-foreground, #ffffff);
			--focus-border: var(--vscode-focusBorder, #007fd4);
			--scrollbar: var(--vscode-scrollbarSlider-background, #79797966);
			--scrollbar-hover: var(--vscode-scrollbarSlider-hoverBackground, #79797999);
			--font: var(--vscode-font-family, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif);
			--font-mono: var(--vscode-editor-font-family, 'Cascadia Code', 'Fira Code', Consolas, monospace);
			--font-size: var(--vscode-font-size, 13px);
		}

		body {
			font-family: var(--font);
			font-size: var(--font-size);
			color: var(--fg);
			background: var(--bg);
			line-height: 1.5;
			padding: 16px;
			overflow-x: hidden;
		}

		/* ---- Section Titles ---- */
		.section-title {
			font-size: 11px;
			font-weight: 600;
			text-transform: uppercase;
			letter-spacing: 0.8px;
			color: var(--fg-muted);
			margin-bottom: 10px;
			display: flex;
			align-items: center;
			gap: 6px;
		}
		.section-title::after {
			content: '';
			flex: 1;
			height: 1px;
			background: var(--border);
		}

		/* ---- Budget Gauge ---- */
		.budget-gauge {
			background: var(--card-bg);
			border: 1px solid var(--card-border);
			border-radius: 8px;
			padding: 16px 20px;
			margin-bottom: 20px;
		}
		.budget-gauge__header {
			display: flex;
			justify-content: space-between;
			align-items: baseline;
			margin-bottom: 10px;
		}
		.budget-gauge__label {
			font-weight: 600;
			font-size: 14px;
		}
		.budget-gauge__stats {
			font-size: 12px;
			color: var(--fg-muted);
			font-family: var(--font-mono);
		}
		.budget-gauge__bar {
			width: 100%;
			height: 24px;
			background: var(--input-bg);
			border-radius: 12px;
			overflow: hidden;
			position: relative;
		}
		.budget-gauge__fill {
			height: 100%;
			border-radius: 12px;
			transition: width 0.6s cubic-bezier(0.4, 0, 0.2, 1), background 0.3s ease;
			position: relative;
			display: flex;
			align-items: center;
			justify-content: flex-end;
			padding-right: 10px;
			min-width: 0;
		}
		.budget-gauge__fill-text {
			font-size: 11px;
			font-weight: 700;
			color: #fff;
			text-shadow: 0 1px 2px rgba(0,0,0,0.4);
			white-space: nowrap;
		}
		.budget-gauge__markers {
			display: flex;
			justify-content: space-between;
			margin-top: 6px;
			font-size: 10px;
			color: var(--fg-muted);
			font-family: var(--font-mono);
		}

		/* ---- Compaction Progress ---- */
		.compaction-progress {
			background: var(--card-bg);
			border: 1px solid var(--card-border);
			border-radius: 8px;
			padding: 16px 20px;
			margin-bottom: 20px;
		}
		.compaction-progress__header {
			display: flex;
			justify-content: space-between;
			align-items: center;
			margin-bottom: 12px;
		}
		.compaction-progress__phase {
			font-weight: 600;
			font-size: 13px;
		}
		.compaction-progress__stats {
			font-size: 12px;
			color: var(--fg-muted);
		}
		.compaction-progress__phases {
			display: flex;
			gap: 4px;
			margin-bottom: 10px;
		}
		.compaction-progress__phase-step {
			flex: 1;
			height: 6px;
			border-radius: 3px;
			background: var(--input-bg);
			transition: background 0.3s ease;
		}
		.compaction-progress__phase-step--completed {
			background: #4CAF50;
		}
		.compaction-progress__phase-step--active {
			background: #FFC107;
			animation: pulse 1.2s ease-in-out infinite;
		}
		@keyframes pulse {
			0%, 100% { opacity: 1; }
			50% { opacity: 0.5; }
		}
		.compaction-progress__phase-labels {
			display: flex;
			gap: 4px;
			margin-bottom: 10px;
		}
		.compaction-progress__phase-label {
			flex: 1;
			font-size: 9px;
			text-align: center;
			color: var(--fg-muted);
			overflow: hidden;
			text-overflow: ellipsis;
			white-space: nowrap;
		}
		.compaction-progress__phase-label--active {
			color: #FFC107;
			font-weight: 600;
		}
		.compaction-progress__phase-label--completed {
			color: #4CAF50;
		}
		.compaction-progress__bar {
			width: 100%;
			height: 4px;
			background: var(--input-bg);
			border-radius: 2px;
			overflow: hidden;
		}
		.compaction-progress__bar-fill {
			height: 100%;
			background: #4CAF50;
			border-radius: 2px;
			transition: width 0.3s ease;
		}

		/* ---- Timeline ---- */
		.timeline {
			background: var(--card-bg);
			border: 1px solid var(--card-border);
			border-radius: 8px;
			padding: 16px 20px;
			margin-bottom: 20px;
			overflow-x: auto;
		}
		.timeline__track {
			position: relative;
			height: 64px;
			min-width: 100%;
			margin-top: 8px;
		}
		.timeline__axis {
			position: absolute;
			bottom: 0;
			left: 0;
			right: 0;
			height: 1px;
			background: var(--border);
		}
		.timeline__entry {
			position: absolute;
			bottom: 4px;
			width: 10px;
			height: 10px;
			border-radius: 50%;
			cursor: pointer;
			transition: transform 0.15s ease, box-shadow 0.15s ease;
			z-index: 1;
		}
		.timeline__entry:hover {
			transform: scale(1.8);
			box-shadow: 0 0 8px currentColor;
			z-index: 2;
		}
		.timeline__entry--compacted {
			opacity: 0.45;
			border: 2px dashed currentColor;
			background: transparent !important;
		}
		.timeline__tooltip {
			position: absolute;
			bottom: calc(100% + 8px);
			left: 50%;
			transform: translateX(-50%);
			background: var(--bg);
			border: 1px solid var(--card-border);
			border-radius: 6px;
			padding: 8px 12px;
			font-size: 11px;
			white-space: nowrap;
			pointer-events: none;
			opacity: 0;
			transition: opacity 0.15s ease;
			z-index: 10;
			box-shadow: 0 4px 12px rgba(0,0,0,0.3);
			max-width: 300px;
			white-space: normal;
		}
		.timeline__entry:hover .timeline__tooltip {
			opacity: 1;
		}
		.timeline__tooltip-type {
			font-weight: 600;
			margin-bottom: 2px;
		}
		.timeline__tooltip-preview {
			color: var(--fg-muted);
			line-height: 1.4;
		}
		.timeline__tooltip-meta {
			margin-top: 4px;
			font-size: 10px;
			color: var(--fg-muted);
			font-family: var(--font-mono);
		}
		.timeline__legend {
			display: flex;
			flex-wrap: wrap;
			gap: 12px;
			margin-top: 14px;
			padding-top: 10px;
			border-top: 1px solid var(--border);
		}
		.timeline__legend-item {
			display: flex;
			align-items: center;
			gap: 5px;
			font-size: 11px;
			color: var(--fg-muted);
		}
		.timeline__legend-dot {
			width: 8px;
			height: 8px;
			border-radius: 50%;
			flex-shrink: 0;
		}
		.timeline__time-labels {
			display: flex;
			justify-content: space-between;
			font-size: 10px;
			color: var(--fg-muted);
			font-family: var(--font-mono);
			margin-top: 4px;
		}

		/* ---- Filter Bar ---- */
		.filter-bar {
			background: var(--card-bg);
			border: 1px solid var(--card-border);
			border-radius: 8px;
			padding: 12px 16px;
			margin-bottom: 16px;
			display: flex;
			flex-wrap: wrap;
			gap: 10px;
			align-items: center;
		}
		.filter-bar__search {
			flex: 1;
			min-width: 180px;
			padding: 6px 10px;
			background: var(--input-bg);
			border: 1px solid var(--input-border);
			border-radius: 4px;
			color: var(--input-fg);
			font-family: var(--font);
			font-size: 12px;
			outline: none;
		}
		.filter-bar__search:focus {
			border-color: var(--focus-border);
		}
		.filter-bar__search::placeholder {
			color: var(--fg-muted);
		}
		.filter-bar__select {
			padding: 6px 8px;
			background: var(--input-bg);
			border: 1px solid var(--input-border);
			border-radius: 4px;
			color: var(--input-fg);
			font-family: var(--font);
			font-size: 12px;
			outline: none;
			cursor: pointer;
		}
		.filter-bar__select:focus {
			border-color: var(--focus-border);
		}
		.filter-bar__count {
			font-size: 11px;
			color: var(--fg-muted);
			font-family: var(--font-mono);
			white-space: nowrap;
		}

		/* ---- Memory Cards ---- */
		.memory-cards {
			display: flex;
			flex-direction: column;
			gap: 8px;
		}
		.memory-card {
			background: var(--card-bg);
			border: 1px solid var(--card-border);
			border-radius: 8px;
			padding: 14px 16px;
			cursor: pointer;
			transition: border-color 0.15s ease, background 0.15s ease;
			position: relative;
			overflow: hidden;
		}
		.memory-card:hover {
			border-color: var(--focus-border);
			background: var(--hover-bg);
		}
		.memory-card--selected {
			border-color: var(--focus-border);
			background: var(--active-bg);
		}
		.memory-card--compacted {
			opacity: 0.55;
		}
		.memory-card__type-stripe {
			position: absolute;
			left: 0;
			top: 0;
			bottom: 0;
			width: 4px;
		}
		.memory-card__header {
			display: flex;
			align-items: center;
			gap: 8px;
			margin-bottom: 6px;
			padding-left: 8px;
		}
		.memory-card__type-icon {
			font-size: 16px;
			flex-shrink: 0;
		}
		.memory-card__type-label {
			font-size: 11px;
			font-weight: 600;
			text-transform: uppercase;
			letter-spacing: 0.5px;
		}
		.memory-card__priority {
			font-size: 10px;
			padding: 1px 6px;
			border-radius: 3px;
			font-weight: 600;
			text-transform: uppercase;
			letter-spacing: 0.3px;
			margin-left: auto;
			flex-shrink: 0;
		}
		.memory-card__priority--critical { background: #F4433633; color: #F44336; }
		.memory-card__priority--high { background: #FF980033; color: #FF9800; }
		.memory-card__priority--medium { background: #FFC10733; color: #FFC107; }
		.memory-card__priority--low { background: #4CAF5033; color: #4CAF50; }

		.memory-card__content {
			padding-left: 8px;
			margin-bottom: 8px;
			font-size: 12px;
			color: var(--fg);
			line-height: 1.5;
			max-height: 60px;
			overflow: hidden;
			position: relative;
			word-break: break-word;
		}
		.memory-card__content::after {
			content: '';
			position: absolute;
			bottom: 0;
			left: 0;
			right: 0;
			height: 20px;
			background: linear-gradient(transparent, var(--card-bg));
			pointer-events: none;
		}
		.memory-card--selected .memory-card__content::after {
			background: linear-gradient(transparent, var(--active-bg));
		}

		.memory-card__footer {
			display: flex;
			flex-wrap: wrap;
			align-items: center;
			gap: 8px;
			padding-left: 8px;
		}
		.memory-card__tag {
			font-size: 10px;
			padding: 1px 6px;
			border-radius: 3px;
			background: var(--badge-bg);
			color: var(--badge-fg);
			font-family: var(--font-mono);
		}
		.memory-card__meta {
			font-size: 10px;
			color: var(--fg-muted);
			font-family: var(--font-mono);
			margin-left: auto;
			display: flex;
			align-items: center;
			gap: 10px;
			flex-shrink: 0;
		}

		/* ---- Relevance Score ---- */
		.relevance-bar {
			display: flex;
			align-items: center;
			gap: 4px;
		}
		.relevance-bar__track {
			width: 48px;
			height: 4px;
			background: var(--input-bg);
			border-radius: 2px;
			overflow: hidden;
		}
		.relevance-bar__fill {
			height: 100%;
			border-radius: 2px;
			transition: width 0.3s ease;
		}
		.relevance-bar__value {
			font-size: 10px;
			color: var(--fg-muted);
			font-family: var(--font-mono);
			min-width: 28px;
		}

		/* ---- Empty State ---- */
		.empty-state {
			text-align: center;
			padding: 40px 20px;
			color: var(--fg-muted);
		}
		.empty-state__icon {
			font-size: 40px;
			margin-bottom: 12px;
			opacity: 0.5;
		}
		.empty-state__text {
			font-size: 14px;
			margin-bottom: 4px;
		}
		.empty-state__subtext {
			font-size: 12px;
			opacity: 0.7;
		}

		/* ---- Summary Stats ---- */
		.summary-stats {
			display: grid;
			grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
			gap: 10px;
			margin-bottom: 20px;
		}
		.summary-stat {
			background: var(--card-bg);
			border: 1px solid var(--card-border);
			border-radius: 8px;
			padding: 14px 16px;
			text-align: center;
		}
		.summary-stat__value {
			font-size: 22px;
			font-weight: 700;
			font-family: var(--font-mono);
			line-height: 1.2;
		}
		.summary-stat__label {
			font-size: 10px;
			text-transform: uppercase;
			letter-spacing: 0.6px;
			color: var(--fg-muted);
			margin-top: 4px;
		}

		/* ---- Scrollbar ---- */
		::-webkit-scrollbar { width: 8px; height: 8px; }
		::-webkit-scrollbar-track { background: transparent; }
		::-webkit-scrollbar-thumb { background: var(--scrollbar); border-radius: 4px; }
		::-webkit-scrollbar-thumb:hover { background: var(--scrollbar-hover); }

		/* ---- Responsive ---- */
		@media (max-width: 480px) {
			body { padding: 10px; }
			.filter-bar { flex-direction: column; }
			.filter-bar__search { min-width: 100%; }
			.summary-stats { grid-template-columns: repeat(2, 1fr); }
		}
	`;
}

// ============================================================================
// HTML Section Renderers
// ============================================================================

function renderBudgetGaugeHtml(budget: TokenBudget): string {
	const color = budgetGaugeColor(budget.percentage);
	const safeWidth = Math.min(100, Math.max(0, budget.percentage));
	return `
		<div class="budget-gauge">
			<div class="budget-gauge__header">
				<span class="budget-gauge__label">Token Budget</span>
				<span class="budget-gauge__stats">${formatNumber(budget.used)} / ${formatNumber(budget.total)} tokens</span>
			</div>
			<div class="budget-gauge__bar">
				<div class="budget-gauge__fill" style="width: ${safeWidth}%; background: ${color};">
					${safeWidth >= 15 ? `<span class="budget-gauge__fill-text">${budget.percentage.toFixed(1)}%</span>` : ''}
				</div>
			</div>
			<div class="budget-gauge__markers">
				<span>0</span>
				<span>${formatNumber(Math.round(budget.total * 0.25))}</span>
				<span>${formatNumber(Math.round(budget.total * 0.5))}</span>
				<span>${formatNumber(Math.round(budget.total * 0.75))}</span>
				<span>${formatNumber(budget.total)}</span>
			</div>
		</div>
	`;
}

function renderCompactionProgressHtml(status: CompactionStatus): string {
	const currentIdx = compactionPhaseIndex(status.phase);
	const progress = status.totalEntries > 0
		? Math.round((status.entriesProcessed / status.totalEntries) * 100)
		: 0;
	const phases: CompactionStatus['phase'][] = [
		'deleting-expired', 'merging-duplicates', 'archiving-low-priority', 'summarizing-old'
	];

	const phaseSteps = phases.map((p, i) => {
		const pIdx = i + 1;
		let cls = 'compaction-progress__phase-step';
		if (pIdx < currentIdx) { cls += ' compaction-progress__phase-step--completed'; }
		else if (pIdx === currentIdx) { cls += ' compaction-progress__phase-step--active'; }
		return `<div class="${cls}"></div>`;
	}).join('');

	const phaseLabels = phases.map((p, i) => {
		const pIdx = i + 1;
		let cls = 'compaction-progress__phase-label';
		if (pIdx < currentIdx) { cls += ' compaction-progress__phase-label--completed'; }
		else if (pIdx === currentIdx) { cls += ' compaction-progress__phase-label--active'; }
		return `<div class="${cls}">${compactionPhaseLabel(p)}</div>`;
	}).join('');

	return `
		<div class="compaction-progress">
			<div class="compaction-progress__header">
				<span class="compaction-progress__phase">\u{1F504} Compaction: ${escapeHtml(compactionPhaseLabel(status.phase))}</span>
				<span class="compaction-progress__stats">${status.entriesProcessed}/${status.totalEntries} entries \u00B7 ${formatNumber(status.tokensReclaimed)} tokens reclaimed</span>
			</div>
			<div class="compaction-progress__phases">${phaseSteps}</div>
			<div class="compaction-progress__phase-labels">${phaseLabels}</div>
			<div class="compaction-progress__bar">
				<div class="compaction-progress__bar-fill" style="width: ${progress}%;"></div>
			</div>
		</div>
	`;
}

function renderTimelineHtml(entries: MemoryEntry[]): string {
	if (entries.length === 0) {
		return `
			<div class="timeline">
				<div class="section-title">Memory Timeline</div>
				<div class="empty-state">
					<div class="empty-state__icon">\u{1F4C5}</div>
					<div class="empty-state__text">No memory entries yet</div>
					<div class="empty-state__subtext">Entries will appear here as they are created</div>
				</div>
			</div>
		`;
	}

	const sorted = [...entries].sort((a, b) => a.createdAt - b.createdAt);
	const minTime = sorted[0].createdAt;
	const maxTime = sorted[sorted.length - 1].createdAt;
	const timeSpan = maxTime - minTime || 1;

	const entryMarkers = sorted.map(entry => {
		const style = getTypeStyle(entry.type);
		const leftPct = ((entry.createdAt - minTime) / timeSpan) * 100;
		const preview = escapeHtml(entry.content.length > 80 ? entry.content.substring(0, 80) + '\u2026' : entry.content);
		const compactedCls = entry.isCompacted ? ' timeline__entry--compacted' : '';

		return `
			<div class="timeline__entry${compactedCls}"
				 style="left: ${leftPct}%; background: ${style.color}; color: ${style.color};"
				 data-entry-id="${escapeHtml(entry.id)}"
				 onclick="selectMemory('${escapeHtml(entry.id)}')">
				<div class="timeline__tooltip">
					<div class="timeline__tooltip-type" style="color: ${style.color};">${style.icon} ${escapeHtml(style.label)}</div>
					<div class="timeline__tooltip-preview">${preview}</div>
					<div class="timeline__tooltip-meta">${formatNumber(entry.tokenCount)} tokens \u00B7 ${formatRelativeTime(entry.createdAt)}${entry.isCompacted ? ' \u00B7 compacted' : ''}</div>
				</div>
			</div>
		`;
	}).join('');

	// Build legend from unique types present
	const uniqueTypes = [...new Set(entries.map(e => e.type))];
	const legendItems = uniqueTypes.map(t => {
		const s = getTypeStyle(t);
		return `<div class="timeline__legend-item"><div class="timeline__legend-dot" style="background: ${s.color};"></div>${s.icon} ${escapeHtml(s.label)}</div>`;
	}).join('');

	return `
		<div class="timeline">
			<div class="section-title">Memory Timeline</div>
			<div class="timeline__track">
				${entryMarkers}
				<div class="timeline__axis"></div>
			</div>
			<div class="timeline__time-labels">
				<span>${formatRelativeTime(minTime)}</span>
				<span>${new Date(minTime + timeSpan * 0.5).toLocaleTimeString()}</span>
				<span>now</span>
			</div>
			<div class="timeline__legend">${legendItems}</div>
		</div>
	`;
}

function renderSummaryStatsHtml(entries: MemoryEntry[], budget: TokenBudget): string {
	const totalTokens = entries.reduce((sum, e) => sum + e.tokenCount, 0);
	const typeCounts = new Map<string, number>();
	for (const e of entries) {
		typeCounts.set(e.type, (typeCounts.get(e.type) ?? 0) + 1);
	}
	const compactedCount = entries.filter(e => e.isCompacted).length;
	const avgRelevance = entries.length > 0
		? entries.filter(e => e.relevanceScore !== undefined).reduce((s, e) => s + (e.relevanceScore ?? 0), 0) / Math.max(1, entries.filter(e => e.relevanceScore !== undefined).length)
		: 0;

	return `
		<div class="summary-stats">
			<div class="summary-stat">
				<div class="summary-stat__value">${entries.length}</div>
				<div class="summary-stat__label">Total Entries</div>
			</div>
			<div class="summary-stat">
				<div class="summary-stat__value">${formatNumber(totalTokens)}</div>
				<div class="summary-stat__label">Total Tokens</div>
			</div>
			<div class="summary-stat">
				<div class="summary-stat__value">${typeCounts.size}</div>
				<div class="summary-stat__label">Memory Types</div>
			</div>
			<div class="summary-stat">
				<div class="summary-stat__value">${compactedCount}</div>
				<div class="summary-stat__label">Compacted</div>
			</div>
			<div class="summary-stat">
				<div class="summary-stat__value">${avgRelevance > 0 ? avgRelevance.toFixed(1) : '\u2014'}</div>
				<div class="summary-stat__label">Avg Relevance</div>
			</div>
		</div>
	`;
}

function renderFilterBarHtml(entries: MemoryEntry[]): string {
	const uniqueTypes = [...new Set(entries.map(e => e.type))].sort();
	const uniquePriorities = [...new Set(entries.map(e => e.priority))].sort((a, b) => (PRIORITY_ORDER[b] ?? 0) - (PRIORITY_ORDER[a] ?? 0));
	const uniqueTags = [...new Set(entries.flatMap(e => e.tags))].sort();

	const typeOptions = uniqueTypes.map(t => {
		const s = getTypeStyle(t);
		return `<option value="${escapeHtml(t)}">${s.icon} ${escapeHtml(s.label)}</option>`;
	}).join('');

	const priorityOptions = uniquePriorities.map(p =>
		`<option value="${escapeHtml(p)}">${escapeHtml(p.charAt(0).toUpperCase() + p.slice(1))}</option>`
	).join('');

	const tagOptions = uniqueTags.map(t =>
		`<option value="${escapeHtml(t)}">${escapeHtml(t)}</option>`
	).join('');

	return `
		<div class="filter-bar">
			<input class="filter-bar__search" type="text" placeholder="Search memories..." oninput="applyFilters()" id="filterSearch" />
			<select class="filter-bar__select" id="filterType" onchange="applyFilters()">
				<option value="">All Types</option>
				${typeOptions}
			</select>
			<select class="filter-bar__select" id="filterPriority" onchange="applyFilters()">
				<option value="">All Priorities</option>
				${priorityOptions}
			</select>
			<select class="filter-bar__select" id="filterTag" onchange="applyFilters()">
				<option value="">All Tags</option>
				${tagOptions}
			</select>
			<select class="filter-bar__select" id="filterAge" onchange="applyFilters()">
				<option value="">Any Age</option>
				<option value="1h">Last Hour</option>
				<option value="24h">Last 24 Hours</option>
				<option value="7d">Last 7 Days</option>
				<option value="30d">Last 30 Days</option>
			</select>
			<span class="filter-bar__count" id="filterCount">${entries.length} entries</span>
		</div>
	`;
}

function renderRelevanceBarHtml(score: number | undefined): string {
	if (score === undefined) { return ''; }
	const clamped = Math.min(1, Math.max(0, score));
	const pct = (clamped * 100).toFixed(0);
	let color = '#4CAF50';
	if (clamped < 0.3) { color = '#F44336'; }
	else if (clamped < 0.6) { color = '#FF9800'; }
	else if (clamped < 0.8) { color = '#FFC107'; }

	return `
		<div class="relevance-bar">
			<div class="relevance-bar__track">
				<div class="relevance-bar__fill" style="width: ${pct}%; background: ${color};"></div>
			</div>
			<span class="relevance-bar__value">${(clamped * 100).toFixed(0)}%</span>
		</div>
	`;
}

function renderMemoryCardsHtml(entries: MemoryEntry[]): string {
	if (entries.length === 0) {
		return `
			<div class="empty-state">
				<div class="empty-state__icon">\u{1F9E0}</div>
				<div class="empty-state__text">No memories found</div>
				<div class="empty-state__subtext">Try adjusting your filters or add new memory entries</div>
			</div>
		`;
	}

	// Sort: critical first, then by recency
	const sorted = [...entries].sort((a, b) => {
		const pa = PRIORITY_ORDER[a.priority] ?? 0;
		const pb = PRIORITY_ORDER[b.priority] ?? 0;
		if (pb !== pa) { return pb - pa; }
		return b.updatedAt - a.updatedAt;
	});

	const cards = sorted.map(entry => {
		const style = getTypeStyle(entry.type);
		const preview = escapeHtml(entry.content.length > 200 ? entry.content.substring(0, 200) + '\u2026' : entry.content);
		const tagHtml = entry.tags.map(t => `<span class="memory-card__tag">${escapeHtml(t)}</span>`).join('');
		const relevanceHtml = renderRelevanceBarHtml(entry.relevanceScore);
		const compactedCls = entry.isCompacted ? ' memory-card--compacted' : '';

		return `
			<div class="memory-card${compactedCls}" data-entry-id="${escapeHtml(entry.id)}" data-type="${escapeHtml(entry.type)}" data-priority="${escapeHtml(entry.priority)}" data-tags="${escapeHtml(entry.tags.join(','))}" data-created="${entry.createdAt}" onclick="selectMemory('${escapeHtml(entry.id)}')">
				<div class="memory-card__type-stripe" style="background: ${style.color};"></div>
				<div class="memory-card__header">
					<span class="memory-card__type-icon">${style.icon}</span>
					<span class="memory-card__type-label" style="color: ${style.color};">${escapeHtml(style.label)}</span>
					<span class="memory-card__priority memory-card__priority--${escapeHtml(entry.priority)}">${escapeHtml(entry.priority)}</span>
				</div>
				<div class="memory-card__content">${preview}</div>
				<div class="memory-card__footer">
					${tagHtml}
					<div class="memory-card__meta">
						${relevanceHtml}
						<span>${formatNumber(entry.tokenCount)} tok</span>
						<span>${formatRelativeTime(entry.createdAt)}</span>
						${entry.isCompacted ? '<span style="color: #FF9800;">\u{1F4E6} compacted</span>' : ''}
					</div>
				</div>
			</div>
		`;
	}).join('');

	return `<div class="memory-cards" id="memoryCards">${cards}</div>`;
}

function getJavaScript(): string {
	return `
		function selectMemory(entryId) {
			// Visual selection feedback
			document.querySelectorAll('.memory-card').forEach(card => {
				card.classList.remove('memory-card--selected');
			});
			const selected = document.querySelector('.memory-card[data-entry-id="' + entryId + '"]');
			if (selected) {
				selected.classList.add('memory-card--selected');
			}

			// Notify the host via postMessage (webview pattern)
			if (typeof acquireVsCodeApi === 'function') {
				// Running inside a VS Code webview
				const vscode = acquireVsCodeApi();
				vscode.postMessage({ type: 'selectMemory', entryId: entryId });
			}
		}

		function applyFilters() {
			const searchTerm = (document.getElementById('filterSearch')?.value ?? '').toLowerCase();
			const typeFilter = document.getElementById('filterType')?.value ?? '';
			const priorityFilter = document.getElementById('filterPriority')?.value ?? '';
			const tagFilter = document.getElementById('filterTag')?.value ?? '';
			const ageFilter = document.getElementById('filterAge')?.value ?? '';

			const now = Date.now();
			let ageMs = Infinity;
			if (ageFilter === '1h') { ageMs = 3600000; }
			else if (ageFilter === '24h') { ageMs = 86400000; }
			else if (ageFilter === '7d') { ageMs = 604800000; }
			else if (ageFilter === '30d') { ageMs = 2592000000; }

			const cards = document.querySelectorAll('.memory-card');
			let visibleCount = 0;

			cards.forEach(card => {
				const content = card.textContent?.toLowerCase() ?? '';
				const type = card.getAttribute('data-type') ?? '';
				const priority = card.getAttribute('data-priority') ?? '';
				const tags = (card.getAttribute('data-tags') ?? '').split(',');
				const created = parseInt(card.getAttribute('data-created') ?? '0', 10);

				let visible = true;

				// Search term matches content, tags, or type
				if (searchTerm && !content.includes(searchTerm) && !tags.some(t => t.toLowerCase().includes(searchTerm)) && !type.includes(searchTerm)) {
					visible = false;
				}

				// Type filter
				if (typeFilter && type !== typeFilter) {
					visible = false;
				}

				// Priority filter
				if (priorityFilter && priority !== priorityFilter) {
					visible = false;
				}

				// Tag filter
				if (tagFilter && !tags.includes(tagFilter)) {
					visible = false;
				}

				// Age filter
				if (ageMs !== Infinity && (now - created) > ageMs) {
					visible = false;
				}

				card.style.display = visible ? '' : 'none';
				if (visible) { visibleCount++; }
			});

			const countEl = document.getElementById('filterCount');
			if (countEl) {
				countEl.textContent = visibleCount + ' entries';
			}
		}
	`;
}

// ============================================================================
// MemoryVisualizationService
// ============================================================================

export class MemoryVisualizationService extends Disposable implements IMemoryVisualizationService {

	declare readonly _serviceBrand: undefined;

	private readonly _onDidSelectMemory = this._register(new Emitter<string>());
	readonly onDidSelectMemory: Event<string> = this._onDidSelectMemory.event;

	constructor(
		@ILogService private readonly logService: ILogService,
	) {
		super();
		this.logService.trace('[MemoryVisualizationService] Initialized');
	}

	// -- renderMemoryOverview --

	renderMemoryOverview(entries: MemoryEntry[], budget: TokenBudget, compactionStatus?: CompactionStatus): string {
		const startTime = Date.now();

		const statsHtml = renderSummaryStatsHtml(entries, budget);
		const gaugeHtml = renderBudgetGaugeHtml(budget);
		const compactionHtml = compactionStatus && compactionStatus.phase !== 'idle'
			? renderCompactionProgressHtml(compactionStatus)
			: '';
		const timelineHtml = renderTimelineHtml(entries);
		const filterBarHtml = renderFilterBarHtml(entries);
		const cardsHtml = renderMemoryCardsHtml(entries);
		const styles = getStyles();
		const script = getJavaScript();

		const html = `<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8" />
	<meta name="viewport" content="width=device-width, initial-scale=1.0" />
	<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline';" />
	<title>Memory Visualization</title>
	<style>${styles}</style>
</head>
<body>
	${statsHtml}
	${gaugeHtml}
	${compactionHtml}
	${timelineHtml}
	<div class="section-title">Memory Entries</div>
	${filterBarHtml}
	${cardsHtml}
	<script>${script}</script>
</body>
</html>`;

		const elapsed = Date.now() - startTime;
		this.logService.trace(`[MemoryVisualizationService] renderMemoryOverview: ${entries.length} entries, ${elapsed}ms`);

		return html;
	}

	// -- renderTimeline --

	renderTimeline(entries: MemoryEntry[]): string {
		const styles = getStyles();
		const timelineHtml = renderTimelineHtml(entries);
		const script = getJavaScript();

		return `<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8" />
	<meta name="viewport" content="width=device-width, initial-scale=1.0" />
	<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline';" />
	<title>Memory Timeline</title>
	<style>${styles}</style>
</head>
<body>
	${timelineHtml}
	<script>${script}</script>
</body>
</html>`;
	}

	// -- renderBudgetGauge --

	renderBudgetGauge(budget: TokenBudget): string {
		const styles = getStyles();
		const gaugeHtml = renderBudgetGaugeHtml(budget);

		return `<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8" />
	<meta name="viewport" content="width=device-width, initial-scale=1.0" />
	<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline';" />
	<title>Token Budget</title>
	<style>${styles}</style>
</head>
<body>
	${gaugeHtml}
</body>
</html>`;
	}

	// -- Handle selection from webview --

	/**
	 * Call this method when a webview message is received with type 'selectMemory'.
	 * This bridges the gap between the generated HTML and the VS Code event system.
	 */
	handleSelectMemory(entryId: string): void {
		this._onDidSelectMemory.fire(entryId);
		this.logService.trace(`[MemoryVisualizationService] Memory entry selected: ${entryId}`);
	}

	override dispose(): void {
		this.logService.trace('[MemoryVisualizationService] Disposed');
		super.dispose();
	}
}
