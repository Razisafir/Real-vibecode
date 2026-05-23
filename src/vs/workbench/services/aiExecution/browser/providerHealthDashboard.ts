/*---------------------------------------------------------------------------------------------
 *  AI Execution Kernel -- Provider Health Dashboard
 *  Real Vibecode -- AI-Native IDE
 *
 *  providerHealthDashboard.ts -- Visualization service for LLM provider health status.
 *
 *  Generates self-contained HTML/CSS/JS for rendering in a VS Code webview panel.
 *  Shows provider cards, overall health score, latency, error rates, and auto-refresh.
 *
 *  Service: IProviderHealthDashboardService
 *--------------------------------------------------------------------------------------------*/

import { Disposable } from '../../../../base/common/lifecycle.js';
import { Emitter, Event } from '../../../../base/common/event.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import {
	IProviderHealthService,
	ILLMProviderService,
	ICredentialStoreService,
	HealthSeverity,
	ProviderHealth,
	LLMProviderConfig,
	KNOWN_PROVIDER_CONFIGS,
} from '../common/llmProvider.js';

// -- Service Identifier --

export const IProviderHealthDashboardService = createDecorator<IProviderHealthDashboardService>('providerHealthDashboardService');

// -- Dashboard-Specific Types --

export interface ProviderCardData {
	readonly providerId: string;
	readonly displayName: string;
	readonly providerType: string;
	readonly isLocal: boolean;
	readonly health: ProviderHealth;
	readonly isConfigured: boolean;
	readonly icon: string;
}

export interface HealthDashboardData {
	readonly providers: ProviderCardData[];
	readonly overallHealthScore: number; // 0-1, percentage of healthy providers
	readonly healthyCount: number;
	readonly degradedCount: number;
	readonly downCount: number;
	readonly notConfiguredCount: number;
	readonly lastRefresh: number;
}

// -- Service Interface --

export interface IProviderHealthDashboardService {
	readonly _serviceBrand: undefined;

	/**
	 * Get the current health dashboard data.
	 */
	getDashboardData(): HealthDashboardData;

	/**
	 * Render the complete health dashboard as a self-contained HTML document.
	 */
	render(): string;

	/**
	 * Event fired when dashboard data changes (from health service events).
	 */
	readonly onDidChangeData: Event<HealthDashboardData>;
}

// -- Provider Icon Map --

const PROVIDER_ICONS: Record<string, string> = {
	'openai': '🧠',
	'anthropic': '🎭',
	'google-gemini': '💎',
	'openrouter': '🌐',
	'ollama': '🦙',
	'lm-studio': '🖥️',
	'generic-openai': '🔌',
	'proxima': '⭐',
};

function getProviderIcon(providerId: string): string {
	return PROVIDER_ICONS[providerId] ?? '📡';
}

// -- Status Display Helpers --

function statusEmoji(status: HealthSeverity, isConfigured: boolean): string {
	if (!isConfigured) { return '⚪'; }
	switch (status) {
		case HealthSeverity.Healthy: return '🟢';
		case HealthSeverity.Degraded: return '🟡';
		case HealthSeverity.Unhealthy: return '🔴';
		case HealthSeverity.Unknown: return '⚪';
	}
}

function statusLabel(status: HealthSeverity, isConfigured: boolean): string {
	if (!isConfigured) { return 'Not Configured'; }
	switch (status) {
		case HealthSeverity.Healthy: return 'Healthy';
		case HealthSeverity.Degraded: return 'Degraded';
		case HealthSeverity.Unhealthy: return 'Down';
		case HealthSeverity.Unknown: return 'Unknown';
	}
}

function statusColor(status: HealthSeverity, isConfigured: boolean): string {
	if (!isConfigured) { return '#78909C'; }
	switch (status) {
		case HealthSeverity.Healthy: return '#10b981';
		case HealthSeverity.Degraded: return '#f59e0b';
		case HealthSeverity.Unhealthy: return '#ef4444';
		case HealthSeverity.Unknown: return '#78909C';
	}
}

function formatLatency(ms: number): string {
	if (ms <= 0) { return '—'; }
	if (ms < 1000) { return `${Math.round(ms)}ms`; }
	return `${(ms / 1000).toFixed(1)}s`;
}

function formatErrorRate(successRate: number): string {
	if (successRate < 0) { return '—'; }
	const errorRate = (1 - successRate) * 100;
	return `${errorRate.toFixed(1)}%`;
}

function formatTimeAgo(timestamp: number): string {
	if (timestamp <= 0) { return 'Never'; }
	const now = Date.now();
	const diff = now - timestamp;
	const seconds = Math.floor(diff / 1000);
	const minutes = Math.floor(seconds / 60);
	const hours = Math.floor(minutes / 60);
	const days = Math.floor(hours / 24);

	if (seconds < 60) { return 'just now'; }
	if (minutes < 60) { return `${minutes}m ago`; }
	if (hours < 24) { return `${hours}h ago`; }
	return `${days}d ago`;
}

function escapeHtml(text: string): string {
	return text
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;');
}

function formatNumber(n: number): string {
	if (n >= 1_000_000) { return (n / 1_000_000).toFixed(1) + 'M'; }
	if (n >= 1_000) { return (n / 1_000).toFixed(1) + 'K'; }
	return n.toString();
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
		.dashboard-header__icon {
			font-size: 20px;
		}
		.dashboard-header__title {
			font-size: 16px;
			font-weight: 700;
			flex: 1;
		}
		.dashboard-header__refresh {
			font-size: 11px;
			color: var(--fg-muted);
			font-family: var(--font-mono);
		}

		/* ---- Overall Health Score ---- */
		.health-score {
			background: var(--card-bg);
			border: 1px solid var(--card-border);
			border-radius: 10px;
			padding: 18px 20px;
			margin-bottom: 20px;
			text-align: center;
		}
		.health-score__label {
			font-size: 11px;
			font-weight: 600;
			text-transform: uppercase;
			letter-spacing: 0.8px;
			color: var(--fg-muted);
			margin-bottom: 8px;
		}
		.health-score__value {
			font-size: 36px;
			font-weight: 800;
			font-family: var(--font-mono);
			line-height: 1.1;
			margin-bottom: 8px;
		}
		.health-score__bar {
			width: 100%;
			height: 8px;
			background: var(--input-bg);
			border-radius: 4px;
			overflow: hidden;
			margin-bottom: 12px;
		}
		.health-score__bar-fill {
			height: 100%;
			border-radius: 4px;
			transition: width 0.6s cubic-bezier(0.4, 0, 0.2, 1), background 0.3s ease;
		}
		.health-score__summary {
			display: flex;
			justify-content: center;
			gap: 16px;
			font-size: 12px;
		}
		.health-score__stat {
			display: flex;
			align-items: center;
			gap: 4px;
		}
		.health-score__stat-dot {
			width: 8px;
			height: 8px;
			border-radius: 50%;
			flex-shrink: 0;
		}

		/* ---- Provider Cards ---- */
		.provider-cards {
			display: flex;
			flex-direction: column;
			gap: 10px;
		}
		.provider-card {
			background: var(--card-bg);
			border: 1px solid var(--card-border);
			border-radius: 8px;
			padding: 14px 16px;
			transition: border-color 0.15s ease, background 0.15s ease;
			position: relative;
			overflow: hidden;
		}
		.provider-card:hover {
			border-color: var(--focus-border);
			background: var(--hover-bg);
		}
		.provider-card--not-configured {
			opacity: 0.55;
		}
		.provider-card__status-stripe {
			position: absolute;
			left: 0;
			top: 0;
			bottom: 0;
			width: 4px;
		}
		.provider-card__header {
			display: flex;
			align-items: center;
			gap: 10px;
			margin-bottom: 10px;
			padding-left: 8px;
		}
		.provider-card__icon {
			font-size: 20px;
			flex-shrink: 0;
		}
		.provider-card__name {
			font-weight: 600;
			font-size: 14px;
			flex: 1;
		}
		.provider-card__local-badge {
			font-size: 9px;
			padding: 2px 6px;
			border-radius: 3px;
			background: rgba(6, 182, 212, 0.15);
			color: #06B6D4;
			font-weight: 600;
			text-transform: uppercase;
			letter-spacing: 0.5px;
			flex-shrink: 0;
		}
		.provider-card__status {
			display: flex;
			align-items: center;
			gap: 5px;
			font-size: 12px;
			font-weight: 600;
			flex-shrink: 0;
		}
		.provider-card__status-emoji {
			font-size: 14px;
		}

		/* ---- Provider Metrics Grid ---- */
		.provider-metrics {
			display: grid;
			grid-template-columns: repeat(3, 1fr);
			gap: 8px;
			padding-left: 8px;
		}
		.provider-metric {
			background: var(--input-bg);
			border-radius: 6px;
			padding: 8px 10px;
			text-align: center;
		}
		.provider-metric__value {
			font-size: 14px;
			font-weight: 700;
			font-family: var(--font-mono);
			line-height: 1.2;
		}
		.provider-metric__label {
			font-size: 9px;
			text-transform: uppercase;
			letter-spacing: 0.5px;
			color: var(--fg-muted);
			margin-top: 2px;
		}

		/* ---- Provider Footer ---- */
		.provider-card__footer {
			display: flex;
			justify-content: space-between;
			align-items: center;
			margin-top: 10px;
			padding-left: 8px;
			font-size: 10px;
			color: var(--fg-muted);
			font-family: var(--font-mono);
		}
		.provider-card__requests {
			display: flex;
			gap: 8px;
		}
		.provider-card__requests-ok {
			color: var(--vibecode-success);
		}
		.provider-card__requests-fail {
			color: var(--vibecode-error);
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
		@keyframes spin {
			to { transform: rotate(360deg); }
		}

		/* ---- Scrollbar ---- */
		::-webkit-scrollbar { width: 8px; height: 8px; }
		::-webkit-scrollbar-track { background: transparent; }
		::-webkit-scrollbar-thumb { background: var(--vscode-scrollbarSlider-background, #79797966); border-radius: 4px; }
		::-webkit-scrollbar-thumb:hover { background: var(--vscode-scrollbarSlider-hoverBackground, #79797999); }

		/* ---- Responsive ---- */
		@media (max-width: 480px) {
			body { padding: 10px; }
			.provider-metrics { grid-template-columns: repeat(2, 1fr); }
			.health-score__summary { flex-wrap: wrap; gap: 8px; }
		}
	`;
}

// ============================================================================
// HTML Renderers
// ============================================================================

function renderHealthScoreHtml(data: HealthDashboardData): string {
	const scorePercent = Math.round(data.overallHealthScore * 100);
	const scoreColor = scorePercent >= 80 ? 'var(--vibecode-success)'
		: scorePercent >= 50 ? 'var(--vibecode-warning)'
			: 'var(--vibecode-error)';

	return `
		<div class="health-score">
			<div class="health-score__label">Overall Provider Health</div>
			<div class="health-score__value" style="color: ${scoreColor};">${scorePercent}%</div>
			<div class="health-score__bar">
				<div class="health-score__bar-fill" style="width: ${scorePercent}%; background: ${scoreColor};"></div>
			</div>
			<div class="health-score__summary">
				<div class="health-score__stat">
					<div class="health-score__stat-dot" style="background: var(--vibecode-success);"></div>
					${data.healthyCount} Healthy
				</div>
				<div class="health-score__stat">
					<div class="health-score__stat-dot" style="background: var(--vibecode-warning);"></div>
					${data.degradedCount} Degraded
				</div>
				<div class="health-score__stat">
					<div class="health-score__stat-dot" style="background: var(--vibecode-error);"></div>
					${data.downCount} Down
				</div>
				<div class="health-score__stat">
					<div class="health-score__stat-dot" style="background: #78909C;"></div>
					${data.notConfiguredCount} Not Configured
				</div>
			</div>
		</div>
	`;
}

function renderProviderCardHtml(card: ProviderCardData): string {
	const emoji = statusEmoji(card.health.status, card.isConfigured);
	const label = statusLabel(card.health.status, card.isConfigured);
	const color = statusColor(card.health.status, card.isConfigured);
	const stripeColor = color;
	const notConfiguredCls = !card.isConfigured ? ' provider-card--not-configured' : '';

	const successCount = card.health.totalRequests - card.health.totalFailures;
	const failCount = card.health.totalFailures;

	return `
		<div class="provider-card${notConfiguredCls}" data-provider-id="${escapeHtml(card.providerId)}">
			<div class="provider-card__status-stripe" style="background: ${stripeColor};"></div>
			<div class="provider-card__header">
				<span class="provider-card__icon">${card.icon}</span>
				<span class="provider-card__name">${escapeHtml(card.displayName)}</span>
				${card.isLocal ? '<span class="provider-card__local-badge">Local</span>' : ''}
				<span class="provider-card__status" style="color: ${color};">
					<span class="provider-card__status-emoji">${emoji}</span>
					${label}
				</span>
			</div>
			<div class="provider-metrics">
				<div class="provider-metric">
					<div class="provider-metric__value" style="color: ${card.health.averageLatencyMs > 5000 ? 'var(--vibecode-warning)' : 'var(--fg)'};">
						${formatLatency(card.health.averageLatencyMs)}
					</div>
					<div class="provider-metric__label">Avg Latency</div>
				</div>
				<div class="provider-metric">
					<div class="provider-metric__value" style="color: ${(1 - card.health.successRate) > 0.1 ? 'var(--vibecode-error)' : 'var(--vibecode-success)'};">
						${formatErrorRate(card.health.successRate)}
					</div>
					<div class="provider-metric__label">Error Rate</div>
				</div>
				<div class="provider-metric">
					<div class="provider-metric__value">${formatTimeAgo(Math.max(card.health.lastSuccessTime, card.health.lastFailureTime))}</div>
					<div class="provider-metric__label">Last Check</div>
				</div>
			</div>
			<div class="provider-card__footer">
				<div class="provider-card__requests">
					<span class="provider-card__requests-ok">✓ ${successCount}</span>
					<span class="provider-card__requests-fail">✗ ${failCount}</span>
				</div>
				<span>${card.health.consecutiveFailures > 0 ? `⚠ ${card.health.consecutiveFailures} consecutive failures` : ''}</span>
			</div>
		</div>
	`;
}

function renderProviderCardsHtml(data: HealthDashboardData): string {
	if (data.providers.length === 0) {
		return `
			<div class="empty-state">
				<div class="empty-state__icon">📡</div>
				<div class="empty-state__text">No providers registered</div>
				<div class="empty-state__subtext">Configure an LLM provider to see health status</div>
			</div>
		`;
	}

	// Sort: configured first, then by health severity
	const sorted = [...data.providers].sort((a, b) => {
		if (a.isConfigured !== b.isConfigured) { return a.isConfigured ? -1 : 1; }
		const order: Record<string, number> = {
			[HealthSeverity.Healthy]: 0,
			[HealthSeverity.Degraded]: 1,
			[HealthSeverity.Unknown]: 2,
			[HealthSeverity.Unhealthy]: 3,
		};
		return (order[a.health.status] ?? 3) - (order[b.health.status] ?? 3);
	});

	return `
		<div class="provider-cards">
			${sorted.map(card => renderProviderCardHtml(card)).join('')}
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
// ProviderHealthDashboardService Implementation
// ============================================================================

export class ProviderHealthDashboardService extends Disposable implements IProviderHealthDashboardService {
	declare readonly _serviceBrand: undefined;

	private readonly _onDidChangeData = this._register(new Emitter<HealthDashboardData>());
	readonly onDidChangeData: Event<HealthDashboardData> = this._onDidChangeData.event;

	constructor(
		@ILogService private readonly logService: ILogService,
		@IProviderHealthService private readonly healthService: IProviderHealthService,
		@ILLMProviderService private readonly llmProviderService: ILLMProviderService,
		@ICredentialStoreService private readonly credentialStoreService: ICredentialStoreService,
	) {
		super();

		// Subscribe to health changes to auto-refresh the dashboard
		this._register(this.healthService.onDidChangeHealth((providerId: string) => {
			this.logService.trace(`[ProviderHealthDashboard] Health changed for ${providerId}, firing update`);
			this._onDidChangeData.fire(this.getDashboardData());
		}));

		this.logService.trace('[ProviderHealthDashboard] Initialized');
	}

	getDashboardData(): HealthDashboardData {
		const providers: ProviderCardData[] = [];
		let healthyCount = 0;
		let degradedCount = 0;
		let downCount = 0;
		let notConfiguredCount = 0;

		for (const [id, config] of this.llmProviderService.providers) {
			const health = this.healthService.getHealth(id);
			const isConfigured = config.isLocal || this.credentialStoreService.hasKey(id);

			// Since hasKey is async but we need sync data for rendering,
			// we use the health data as a proxy: if there are any successful
			// requests or it's a local provider, consider it configured.
			const effectivelyConfigured = config.isLocal || health.totalRequests > 0;

			const card: ProviderCardData = {
				providerId: id,
				displayName: config.displayName,
				providerType: config.type,
				isLocal: config.isLocal,
				health,
				isConfigured: effectivelyConfigured,
				icon: getProviderIcon(id),
			};

			providers.push(card);

			if (!effectivelyConfigured) {
				notConfiguredCount++;
			} else {
				switch (health.status) {
					case HealthSeverity.Healthy: healthyCount++; break;
					case HealthSeverity.Degraded: degradedCount++; break;
					case HealthSeverity.Unhealthy: downCount++; break;
					case HealthSeverity.Unknown:
						// Unknown but configured counts as not-yet-tested
						notConfiguredCount++;
						break;
				}
			}
		}

		const configuredTotal = healthyCount + degradedCount + downCount;
		const overallHealthScore = configuredTotal > 0
			? healthyCount / configuredTotal
			: 0;

		return {
			providers,
			overallHealthScore,
			healthyCount,
			degradedCount,
			downCount,
			notConfiguredCount,
			lastRefresh: Date.now(),
		};
	}

	render(): string {
		const data = this.getDashboardData();

		const headerHtml = `
			<div class="dashboard-header">
				<span class="dashboard-header__icon">👁️</span>
				<span class="dashboard-header__title">Provider Health</span>
				<span class="dashboard-header__refresh">${new Date(data.lastRefresh).toLocaleTimeString()}</span>
			</div>
		`;

		const scoreHtml = renderHealthScoreHtml(data);
		const cardsHtml = renderProviderCardsHtml(data);
		const refreshHtml = renderAutoRefreshHtml();

		return `<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>Provider Health Dashboard</title>
	<style>${getStyles()}</style>
</head>
<body>
	${headerHtml}
	${scoreHtml}
	${cardsHtml}
	${refreshHtml}

	<script>
		// Auto-refresh every 30 seconds via postMessage
		const vscode = acquireVsCodeApi();
		setInterval(() => {
			vscode.postMessage({ type: 'refreshHealth' });
		}, 30000);

		// Handle provider card click
		document.querySelectorAll('.provider-card').forEach(card => {
			card.addEventListener('click', () => {
				const providerId = card.getAttribute('data-provider-id');
				if (providerId) {
					vscode.postMessage({ type: 'providerSelected', providerId });
				}
			});
		});
	</script>
</body>
</html>`;
	}

	override dispose(): void {
		this.logService.trace('[ProviderHealthDashboard] Disposed');
		super.dispose();
	}
}
