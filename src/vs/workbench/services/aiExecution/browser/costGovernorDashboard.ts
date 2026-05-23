/*---------------------------------------------------------------------------------------------
 *  AI Execution Kernel -- Cost Governor Dashboard
 *  Real Vibecode -- AI-Native IDE
 *
 *  costGovernorDashboard.ts -- Visualization service for the Cost Governor dashboard.
 *
 *  Generates self-contained HTML/CSS/JS for rendering in a VS Code webview panel.
 *  Shows budget overview, spending by provider/model, burn rate, daily/monthly usage,
 *  emergency stop controls, and auto-refresh.
 *
 *  Service: ICostGovernorDashboardService
 *--------------------------------------------------------------------------------------------*/

import { Disposable } from '../../../../base/common/lifecycle.js';
import { Emitter, Event } from '../../../../base/common/event.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import {
	ICostGovernorService,
	BudgetSnapshot,
	BudgetStatus,
	CostSummary,
	TimeBudget,
} from '../common/costGovernor.js';

// -- Service Identifier --

export const ICostGovernorDashboardService = createDecorator<ICostGovernorDashboardService>('costGovernorDashboardService');

// -- Dashboard-Specific Types --

export interface CostDashboardData {
	readonly snapshot: BudgetSnapshot;
	readonly summary: CostSummary;
	readonly timeBudget: TimeBudget;
	readonly runawayDetected: boolean;
	readonly runawayReason: string | null;
}

// -- Service Interface --

export interface ICostGovernorDashboardService {
	readonly _serviceBrand: undefined;

	/**
	 * Get the current cost dashboard data.
	 */
	getDashboardData(): CostDashboardData;

	/**
	 * Render the complete cost dashboard as a self-contained HTML document.
	 */
	render(): string;

	/**
	 * Event fired when dashboard data should be refreshed.
	 */
	readonly onDidChangeData: Event<CostDashboardData>;
}

// -- Helpers --

function escapeHtml(text: string): string {
	return text
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;');
}

function formatUSD(cost: number): string {
	if (cost < 0.01) { return '$0.00'; }
	if (cost < 1) { return `$${cost.toFixed(3)}`; }
	return `$${cost.toFixed(2)}`;
}

function formatNumber(n: number): string {
	if (n >= 1_000_000) { return (n / 1_000_000).toFixed(1) + 'M'; }
	if (n >= 1_000) { return (n / 1_000).toFixed(1) + 'K'; }
	return n.toString();
}

function formatBurnRate(rate: number): string {
	if (rate <= 0) { return '—'; }
	if (rate < 1) { return `$${rate.toFixed(3)}/s`; }
	return `$${rate.toFixed(2)}/s`;
}

function statusColor(status: BudgetStatus): string {
	switch (status) {
		case BudgetStatus.Healthy: return '#10b981';
		case BudgetStatus.Warning: return '#f59e0b';
		case BudgetStatus.Exceeded: return '#ef4444';
		case BudgetStatus.Emergency: return '#dc2626';
	}
}

function statusLabel(status: BudgetStatus): string {
	switch (status) {
		case BudgetStatus.Healthy: return 'Healthy';
		case BudgetStatus.Warning: return 'Warning';
		case BudgetStatus.Exceeded: return 'Exceeded';
		case BudgetStatus.Emergency: return 'Emergency Stop';
	}
}

function statusEmoji(status: BudgetStatus): string {
	switch (status) {
		case BudgetStatus.Healthy: return '🟢';
		case BudgetStatus.Warning: return '🟡';
		case BudgetStatus.Exceeded: return '🔴';
		case BudgetStatus.Emergency: return '🚨';
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
			--focus-border: var(--vscode-focusBorder, #007fd4);
			--input-bg: var(--vscode-input-background, #3c3c3c);
			--button-bg: var(--vscode-button-background, #0e639c);
			--button-fg: var(--vscode-button-foreground, #ffffff);
			--button-secondary-bg: var(--vscode-button-secondaryBackground, #3a3d41);
			--button-secondary-fg: var(--vscode-button-secondaryForeground, #ffffff);
			--font: var(--vscode-font-family, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif);
			--font-mono: var(--vscode-editor-font-family, 'Cascadia Code', 'Fira Code', Consolas, monospace);
			--font-size: var(--vscode-font-size, 13px);

			/* VibeCode brand colors */
			--vibecode-primary: #8B5CF6;
			--vibecode-secondary: #06B6D4;
			--vibecode-success: #10b981;
			--vibecode-warning: #f59e0b;
			--vibecode-error: #ef4444;
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

		/* ---- Header ---- */
		.dashboard-header {
			display: flex;
			align-items: center;
			gap: 10px;
			margin-bottom: 16px;
			padding-bottom: 12px;
			border-bottom: 1px solid var(--border);
		}
		.dashboard-header__icon { font-size: 20px; }
		.dashboard-header__title { font-size: 16px; font-weight: 700; flex: 1; }
		.dashboard-header__refresh { font-size: 11px; color: var(--fg-muted); font-family: var(--font-mono); }

		/* ---- Budget Status Card ---- */
		.budget-status {
			background: var(--card-bg);
			border: 1px solid var(--card-border);
			border-radius: 10px;
			padding: 18px 20px;
			margin-bottom: 16px;
			text-align: center;
		}
		.budget-status__header {
			display: flex;
			align-items: center;
			justify-content: center;
			gap: 8px;
			margin-bottom: 12px;
		}
		.budget-status__emoji { font-size: 18px; }
		.budget-status__label {
			font-size: 16px;
			font-weight: 700;
		}
		.budget-status__cost {
			font-size: 28px;
			font-weight: 800;
			font-family: var(--font-mono);
			line-height: 1.1;
			margin-bottom: 4px;
		}
		.budget-status__cost-label {
			font-size: 10px;
			color: var(--fg-muted);
			text-transform: uppercase;
			letter-spacing: 0.6px;
			margin-bottom: 12px;
		}

		/* ---- Budget Bars ---- */
		.budget-bars {
			display: flex;
			flex-direction: column;
			gap: 10px;
			margin-bottom: 16px;
		}
		.budget-bar {
			background: var(--card-bg);
			border: 1px solid var(--card-border);
			border-radius: 8px;
			padding: 12px 16px;
		}
		.budget-bar__header {
			display: flex;
			justify-content: space-between;
			align-items: baseline;
			margin-bottom: 6px;
		}
		.budget-bar__label {
			font-size: 12px;
			font-weight: 600;
		}
		.budget-bar__values {
			font-size: 11px;
			font-family: var(--font-mono);
			color: var(--fg-muted);
		}
		.budget-bar__track {
			width: 100%;
			height: 8px;
			background: var(--input-bg);
			border-radius: 4px;
			overflow: hidden;
		}
		.budget-bar__fill {
			height: 100%;
			border-radius: 4px;
			transition: width 0.6s cubic-bezier(0.4, 0, 0.2, 1), background 0.3s ease;
		}

		/* ---- Summary Stats ---- */
		.summary-stats {
			display: grid;
			grid-template-columns: repeat(2, 1fr);
			gap: 8px;
			margin-bottom: 16px;
		}
		.summary-stat {
			background: var(--card-bg);
			border: 1px solid var(--card-border);
			border-radius: 8px;
			padding: 12px 14px;
			text-align: center;
		}
		.summary-stat__value {
			font-size: 18px;
			font-weight: 700;
			font-family: var(--font-mono);
			line-height: 1.2;
		}
		.summary-stat__label {
			font-size: 9px;
			text-transform: uppercase;
			letter-spacing: 0.5px;
			color: var(--fg-muted);
			margin-top: 2px;
		}

		/* ---- Section Title ---- */
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

		/* ---- Breakdown Cards ---- */
		.breakdown-list {
			display: flex;
			flex-direction: column;
			gap: 6px;
			margin-bottom: 16px;
		}
		.breakdown-item {
			background: var(--card-bg);
			border: 1px solid var(--card-border);
			border-radius: 6px;
			padding: 10px 14px;
			display: flex;
			align-items: center;
			gap: 10px;
		}
		.breakdown-item__name {
			font-size: 12px;
			font-weight: 600;
			flex: 1;
			overflow: hidden;
			text-overflow: ellipsis;
			white-space: nowrap;
		}
		.breakdown-item__stats {
			font-size: 11px;
			color: var(--fg-muted);
			font-family: var(--font-mono);
			text-align: right;
		}
		.breakdown-item__cost {
			font-size: 12px;
			font-weight: 700;
			font-family: var(--font-mono);
		}
		.breakdown-item__bar {
			width: 60px;
			height: 4px;
			background: var(--input-bg);
			border-radius: 2px;
			overflow: hidden;
		}
		.breakdown-item__bar-fill {
			height: 100%;
			border-radius: 2px;
			background: var(--vibecode-primary);
		}

		/* ---- Emergency Stop Button ---- */
		.emergency-controls {
			display: flex;
			gap: 8px;
			margin-bottom: 16px;
		}
		.btn {
			padding: 8px 14px;
			border: 1px solid var(--card-border);
			border-radius: 6px;
			font-family: var(--font);
			font-size: 12px;
			font-weight: 600;
			cursor: pointer;
			transition: background 0.15s ease, border-color 0.15s ease;
		}
		.btn:hover { border-color: var(--focus-border); }
		.btn--danger {
			background: rgba(239, 68, 68, 0.15);
			color: #ef4444;
			border-color: rgba(239, 68, 68, 0.3);
		}
		.btn--danger:hover { background: rgba(239, 68, 68, 0.25); }
		.btn--secondary {
			background: var(--card-bg);
			color: var(--fg);
		}
		.btn--secondary:hover { background: var(--hover-bg); }
		.btn--warning {
			background: rgba(245, 158, 11, 0.15);
			color: #f59e0b;
			border-color: rgba(245, 158, 11, 0.3);
		}
		.btn--warning:hover { background: rgba(245, 158, 11, 0.25); }

		/* ---- Runaway Alert ---- */
		.runaway-alert {
			background: rgba(239, 68, 68, 0.1);
			border: 1px solid rgba(239, 68, 68, 0.3);
			border-radius: 8px;
			padding: 12px 16px;
			margin-bottom: 16px;
			display: flex;
			align-items: center;
			gap: 10px;
		}
		.runaway-alert__icon { font-size: 18px; }
		.runaway-alert__text {
			font-size: 12px;
			flex: 1;
		}
		.runaway-alert__reason {
			font-weight: 600;
			color: #ef4444;
		}

		/* ---- Auto-refresh indicator ---- */
		.auto-refresh {
			text-align: center;
			padding: 12px;
			font-size: 10px;
			color: var(--fg-muted);
			font-family: var(--font-mono);
		}
		.auto-refresh__spinner {
			display: inline-block;
			width: 10px;
			height: 10px;
			border: 2px solid var(--fg-muted);
			border-top-color: transparent;
			border-radius: 50%;
			animation: spin 1s linear infinite;
			margin-right: 4px;
			vertical-align: middle;
		}
		@keyframes spin { to { transform: rotate(360deg); } }

		/* ---- Scrollbar ---- */
		::-webkit-scrollbar { width: 8px; height: 8px; }
		::-webkit-scrollbar-track { background: transparent; }
		::-webkit-scrollbar-thumb { background: var(--vscode-scrollbarSlider-background, #79797966); border-radius: 4px; }
		::-webkit-scrollbar-thumb:hover { background: var(--vscode-scrollbarSlider-hoverBackground, #79797999); }

		/* ---- Responsive ---- */
		@media (max-width: 480px) {
			body { padding: 10px; }
			.summary-stats { grid-template-columns: repeat(2, 1fr); }
			.emergency-controls { flex-direction: column; }
		}
	`;
}

// ============================================================================
// HTML Renderers
// ============================================================================

function renderBudgetStatusHtml(data: CostDashboardData): string {
	const { snapshot, timeBudget, summary } = data;
	const color = statusColor(snapshot.status);
	const emoji = statusEmoji(snapshot.status);

	return `
		<div class="budget-status">
			<div class="budget-status__header">
				<span class="budget-status__emoji">${emoji}</span>
				<span class="budget-status__label" style="color: ${color};">${statusLabel(snapshot.status)}</span>
			</div>
			<div class="budget-status__cost" style="color: ${color};">${formatUSD(summary.totalCost)}</div>
			<div class="budget-status__cost-label">Total Spending</div>
		</div>
	`;
}

function renderBudgetBarsHtml(data: CostDashboardData): string {
	const { snapshot, timeBudget, summary } = data;
	const bars: string[] = [];

	// Daily budget bar
	if (timeBudget.dailyLimitUSD > 0) {
		const pct = Math.min(100, (summary.todayCost / timeBudget.dailyLimitUSD) * 100);
		const color = pct >= 100 ? '#ef4444' : pct >= 80 ? '#f59e0b' : '#10b981';
		bars.push(`
			<div class="budget-bar">
				<div class="budget-bar__header">
					<span class="budget-bar__label">📅 Daily Budget</span>
					<span class="budget-bar__values">${formatUSD(summary.todayCost)} / ${formatUSD(timeBudget.dailyLimitUSD)}</span>
				</div>
				<div class="budget-bar__track">
					<div class="budget-bar__fill" style="width: ${pct}%; background: ${color};"></div>
				</div>
			</div>
		`);
	}

	// Monthly budget bar
	if (timeBudget.monthlyLimitUSD > 0) {
		const pct = Math.min(100, (summary.monthlyCost / timeBudget.monthlyLimitUSD) * 100);
		const color = pct >= 100 ? '#ef4444' : pct >= 80 ? '#f59e0b' : '#10b981';
		bars.push(`
			<div class="budget-bar">
				<div class="budget-bar__header">
					<span class="budget-bar__label">📆 Monthly Budget</span>
					<span class="budget-bar__values">${formatUSD(summary.monthlyCost)} / ${formatUSD(timeBudget.monthlyLimitUSD)}</span>
				</div>
				<div class="budget-bar__track">
					<div class="budget-bar__fill" style="width: ${pct}%; background: ${color};"></div>
				</div>
			</div>
		`);
	}

	// Per-execution cost bar
	if (snapshot.costCeiling > 0) {
		const pct = Math.min(100, snapshot.costFraction * 100);
		const color = pct >= 100 ? '#ef4444' : pct >= 80 ? '#f59e0b' : '#10b981';
		bars.push(`
			<div class="budget-bar">
				<div class="budget-bar__header">
					<span class="budget-bar__label">⚡ Execution Budget</span>
					<span class="budget-bar__values">${formatUSD(snapshot.costUsed)} / ${formatUSD(snapshot.costCeiling)}</span>
				</div>
				<div class="budget-bar__track">
					<div class="budget-bar__fill" style="width: ${pct}%; background: ${color};"></div>
				</div>
			</div>
		`);
	}

	if (bars.length === 0) {
		return '';
	}

	return `<div class="budget-bars">${bars.join('')}</div>`;
}

function renderSummaryStatsHtml(data: CostDashboardData): string {
	const { snapshot, summary } = data;

	return `
		<div class="summary-stats">
			<div class="summary-stat">
				<div class="summary-stat__value">${summary.requestCount}</div>
				<div class="summary-stat__label">API Calls</div>
			</div>
			<div class="summary-stat">
				<div class="summary-stat__value">${formatNumber(summary.totalInputTokens + summary.totalOutputTokens)}</div>
				<div class="summary-stat__label">Total Tokens</div>
			</div>
			<div class="summary-stat">
				<div class="summary-stat__value" style="color: var(--vibecode-secondary);">${formatBurnRate(snapshot.costBurnRate)}</div>
				<div class="summary-stat__label">Burn Rate</div>
			</div>
			<div class="summary-stat">
				<div class="summary-stat__value">${formatNumber(snapshot.tokenBurnRate)}/s</div>
				<div class="summary-stat__label">Token Rate</div>
			</div>
		</div>
	`;
}

function renderBreakdownHtml(
	title: string,
	icon: string,
	items: ReadonlyMap<string, { cost: number; requests: number; tokens: number }>,
	totalCost: number,
): string {
	if (items.size === 0) {
		return `
			<div class="section-title">${icon} ${title}</div>
			<div style="font-size: 12px; color: var(--fg-muted); padding: 8px 0; margin-bottom: 16px;">No data yet</div>
		`;
	}

	// Sort by cost descending
	const sorted = [...items.entries()].sort((a, b) => b[1].cost - a[1].cost);
	const maxCost = sorted.length > 0 ? sorted[0][1].cost : 1;

	const itemHtml = sorted.map(([name, data]) => {
		const barWidth = maxCost > 0 ? (data.cost / maxCost) * 100 : 0;
		return `
			<div class="breakdown-item">
				<span class="breakdown-item__name">${escapeHtml(name)}</span>
				<span class="breakdown-item__stats">${data.requests} calls · ${formatNumber(data.tokens)} tok</span>
				<div class="breakdown-item__bar">
					<div class="breakdown-item__bar-fill" style="width: ${barWidth}%;"></div>
				</div>
				<span class="breakdown-item__cost">${formatUSD(data.cost)}</span>
			</div>
		`;
	}).join('');

	return `
		<div class="section-title">${icon} ${title}</div>
		<div class="breakdown-list">${itemHtml}</div>
	`;
}

function renderEmergencyControlsHtml(data: CostDashboardData): string {
	const isEmergency = data.snapshot.status === BudgetStatus.Emergency;

	return `
		<div class="emergency-controls">
			${isEmergency
			? `<button class="btn btn--warning" onclick="postAction('deactivateEmergency')">🟢 Deactivate Emergency Stop</button>`
			: `<button class="btn btn--danger" onclick="postAction('emergencyStop')">🚨 Emergency Stop</button>`
		}
			<button class="btn btn--secondary" onclick="postAction('resetBudget')">↺ Reset Budget</button>
		</div>
	`;
}

function renderRunawayAlertHtml(data: CostDashboardData): string {
	if (!data.runawayDetected || !data.runawayReason) {
		return '';
	}

	return `
		<div class="runaway-alert">
			<span class="runaway-alert__icon">⚠️</span>
			<div class="runaway-alert__text">
				<span class="runaway-alert__reason">Runaway Loop Detected</span><br/>
				${escapeHtml(data.runawayReason)}
			</div>
		</div>
	`;
}

function renderAutoRefreshHtml(): string {
	return `
		<div class="auto-refresh">
			<span class="auto-refresh__spinner"></span>
			Auto-refreshing every 30s
		</div>
	`;
}

// ============================================================================
// CostGovernorDashboardService Implementation
// ============================================================================

export class CostGovernorDashboardService extends Disposable implements ICostGovernorDashboardService {
	declare readonly _serviceBrand: undefined;

	private readonly _onDidChangeData = this._register(new Emitter<CostDashboardData>());
	readonly onDidChangeData: Event<CostDashboardData> = this._onDidChangeData.event;

	constructor(
		@ILogService private readonly logService: ILogService,
		@ICostGovernorService private readonly costGovernorService: ICostGovernorService,
	) {
		super();

		// Subscribe to cost governor events to auto-refresh the dashboard
		this._register(this.costGovernorService.onBudgetStatusChange(() => {
			this._onDidChangeData.fire(this.getDashboardData());
		}));
		this._register(this.costGovernorService.onBurnRateUpdate(() => {
			this._onDidChangeData.fire(this.getDashboardData());
		}));
		this._register(this.costGovernorService.onCostRecorded(() => {
			this._onDidChangeData.fire(this.getDashboardData());
		}));
		this._register(this.costGovernorService.onBudgetAlert(() => {
			this._onDidChangeData.fire(this.getDashboardData());
		}));

		this.logService.trace('[CostGovernorDashboard] Initialized');
	}

	getDashboardData(): CostDashboardData {
		const snapshot = this.costGovernorService.getBudgetSnapshot();
		const summary = this.costGovernorService.getCostSummary();
		const timeBudget = this.costGovernorService.getTimeBudget();
		const runaway = this.costGovernorService.detectRunawayLoop();

		return {
			snapshot,
			summary,
			timeBudget,
			runawayDetected: runaway.isRunaway,
			runawayReason: runaway.reason,
		};
	}

	render(): string {
		const data = this.getDashboardData();

		const headerHtml = `
			<div class="dashboard-header">
				<span class="dashboard-header__icon">💰</span>
				<span class="dashboard-header__title">Cost Governor</span>
				<span class="dashboard-header__refresh">${new Date().toLocaleTimeString()}</span>
			</div>
		`;

		const runawayHtml = renderRunawayAlertHtml(data);
		const statusHtml = renderBudgetStatusHtml(data);
		const barsHtml = renderBudgetBarsHtml(data);
		const statsHtml = renderSummaryStatsHtml(data);
		const controlsHtml = renderEmergencyControlsHtml(data);

		// Provider breakdown
		const providerHtml = renderBreakdownHtml(
			'By Provider',
			'📡',
			data.summary.byProvider,
			data.summary.totalCost,
		);

		// Model breakdown
		const modelHtml = renderBreakdownHtml(
			'By Model',
			'🧠',
			data.summary.byModel,
			data.summary.totalCost,
		);

		const refreshHtml = renderAutoRefreshHtml();

		return `<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>Cost Governor Dashboard</title>
	<style>${getStyles()}</style>
</head>
<body>
	${headerHtml}
	${runawayHtml}
	${statusHtml}
	${barsHtml}
	${statsHtml}
	${controlsHtml}
	${providerHtml}
	${modelHtml}
	${refreshHtml}

	<script>
		const vscode = acquireVsCodeApi();

		// Auto-refresh every 30 seconds
		setInterval(() => {
			vscode.postMessage({ type: 'refreshCost' });
		}, 30000);

		function postAction(action) {
			vscode.postMessage({ type: action });
		}
	</script>
</body>
</html>`;
	}

	override dispose(): void {
		this.logService.trace('[CostGovernorDashboard] Disposed');
		super.dispose();
	}
}
