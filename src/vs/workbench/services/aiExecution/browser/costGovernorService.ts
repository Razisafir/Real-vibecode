/*---------------------------------------------------------------------------------------------
 *  AI Execution Kernel -- Phase 29: Cost Governor & API Safety
 *  Real Vibecode -- AI-Native IDE
 *
 *  CostGovernorService -- Concrete implementation of ICostGovernorService.
 *  Hard cost enforcement for LLM API usage with budget ceilings, emergency
 *  stops, burn-rate monitoring, runaway loop detection, projected
 *  completion cost estimation, daily/monthly budget tracking, model
 *  pricing estimation, and 30-day auto-pruning of cost records.
 *
 *  HARD RULES:
 *    - Execution MUST HALT when budget exceeded
 *    - User-configurable hard caps (token and dollar)
 *    - Live budget dashboard updates
 *    - Projected completion cost must be displayed before continuing
 *--------------------------------------------------------------------------------------------*/

import { Disposable } from '../../../../base/common/lifecycle.js';
import { Emitter, Event } from '../../../../base/common/event.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { IStorageService, StorageScope, StorageTarget } from '../../../../platform/storage/common/storage.js';
import {
	ICostGovernorService,
	BudgetConfig,
	BudgetStatus,
	BudgetSnapshot,
	CostRecord,
	RunawayDetection,
	TimeBudget,
	CostSummary,
	ModelPricing,
} from '../common/costGovernor.js';

// -- Storage keys --

const STORAGE_KEY_BUDGET = 'aiExecution.costGovernor.budget';
const STORAGE_KEY_CONFIG = 'aiExecution.costGovernor.config';
const STORAGE_KEY_COST_RECORDS = 'aiExecution.costRecords';
const STORAGE_KEY_TIME_BUDGET = 'aiExecution.costGovernor.timeBudget';

// -- Default budget configuration --

const DEFAULT_CONFIG: BudgetConfig = {
	maxTokens: 0,
	maxCostUSD: 0,
	warningThreshold: 0.8,
	cooldownMs: 500,
	maxRetries: 3,
	maxTokensPerMinute: 0,
	maxCostPerMinute: 0,
	emergencyStop: false,
};

// -- Default time-based budget --

const DEFAULT_TIME_BUDGET: TimeBudget = {
	dailyLimitUSD: 10,
	monthlyLimitUSD: 100,
	alertThreshold: 0.8,
};

// -- Internal types for per-minute tracking --

interface TimestampedTokens {
	timestamp: number;
	tokens: number;
}

interface TimestampedCost {
	timestamp: number;
	cost: number;
}

// -- Model pricing table (real pricing as of early 2025) --

const MODEL_PRICING: Map<string, ModelPricing> = new Map([
	// OpenAI models
	['gpt-4o', { inputPricePerMillion: 2.50, outputPricePerMillion: 10.00 }],
	['gpt-4o-mini', { inputPricePerMillion: 0.15, outputPricePerMillion: 0.60 }],
	['gpt-4-turbo', { inputPricePerMillion: 10.00, outputPricePerMillion: 30.00 }],
	['o1', { inputPricePerMillion: 15.00, outputPricePerMillion: 60.00 }],
	['o1-mini', { inputPricePerMillion: 3.00, outputPricePerMillion: 12.00 }],
	['o3-mini', { inputPricePerMillion: 1.10, outputPricePerMillion: 4.40 }],
	['gpt-3.5-turbo', { inputPricePerMillion: 0.50, outputPricePerMillion: 1.50 }],
	// Anthropic models
	['claude-sonnet-4-20250514', { inputPricePerMillion: 3.00, outputPricePerMillion: 15.00 }],
	['claude-3-5-sonnet-20241022', { inputPricePerMillion: 3.00, outputPricePerMillion: 15.00 }],
	['claude-3-haiku-20240307', { inputPricePerMillion: 0.25, outputPricePerMillion: 1.25 }],
	['claude-3-opus-20240229', { inputPricePerMillion: 15.00, outputPricePerMillion: 75.00 }],
	// Google Gemini models
	['gemini-2.0-flash', { inputPricePerMillion: 0.075, outputPricePerMillion: 0.30 }],
	['gemini-2.0-flash-lite', { inputPricePerMillion: 0.075, outputPricePerMillion: 0.30 }],
	['gemini-1.5-pro', { inputPricePerMillion: 1.25, outputPricePerMillion: 5.00 }],
	['gemini-1.5-flash', { inputPricePerMillion: 0.075, outputPricePerMillion: 0.30 }],
	// OpenRouter models (pricing varies, use primary provider pricing)
	['anthropic/claude-sonnet-4-20250514', { inputPricePerMillion: 3.00, outputPricePerMillion: 15.00 }],
	['openai/gpt-4o', { inputPricePerMillion: 2.50, outputPricePerMillion: 10.00 }],
	['google/gemini-2.0-flash', { inputPricePerMillion: 0.075, outputPricePerMillion: 0.30 }],
	['meta-llama/llama-3-70b-instruct', { inputPricePerMillion: 0.80, outputPricePerMillion: 2.40 }],
]);

/** Default pricing for unknown models */
const DEFAULT_MODEL_PRICING: ModelPricing = {
	inputPricePerMillion: 3.00,
	outputPricePerMillion: 15.00,
};

// -- 30-day pruning threshold --

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

// -- CostGovernorService --

export class CostGovernorService extends Disposable implements ICostGovernorService {

	declare readonly _serviceBrand: undefined;

	// -- Private state --

	private config: BudgetConfig = { ...DEFAULT_CONFIG };
	private timeBudget: TimeBudget = { ...DEFAULT_TIME_BUDGET };
	private totalTokensUsed: number = 0;
	private totalCostUsed: number = 0;
	private costHistory: CostRecord[] = [];
	private burnRateTokens: number = 0;
	private burnRateCost: number = 0;
	private lastMinuteTokens: TimestampedTokens[] = [];
	private lastMinuteCosts: TimestampedCost[] = [];
	private emergencyStopReason: string | null = null;
	private lastCallTimestamp: number = 0;
	private previousStatus: BudgetStatus = BudgetStatus.Healthy;

	// Track which budget alerts have already been fired to avoid duplicates
	private dailyAlertFired: boolean = false;
	private monthlyAlertFired: boolean = false;

	// -- Events --

	private readonly _onBudgetStatusChange = this._register(new Emitter<BudgetStatus>());
	readonly onBudgetStatusChange: Event<BudgetStatus> = this._onBudgetStatusChange.event;

	private readonly _onBudgetExceeded = this._register(new Emitter<{ type: 'tokens' | 'cost'; used: number; ceiling: number }>());
	readonly onBudgetExceeded: Event<{ type: 'tokens' | 'cost'; used: number; ceiling: number }> = this._onBudgetExceeded.event;

	private readonly _onEmergencyStop = this._register(new Emitter<{ reason: string }>());
	readonly onEmergencyStop: Event<{ reason: string }> = this._onEmergencyStop.event;

	private readonly _onBurnRateUpdate = this._register(new Emitter<{ tokenRate: number; costRate: number }>());
	readonly onBurnRateUpdate: Event<{ tokenRate: number; costRate: number }> = this._onBurnRateUpdate.event;

	private readonly _onBudgetAlert = this._register(new Emitter<{ type: 'daily' | 'monthly'; percentage: number; current: number; limit: number }>());
	readonly onBudgetAlert: Event<{ type: 'daily' | 'monthly'; percentage: number; current: number; limit: number }> = this._onBudgetAlert.event;

	private readonly _onCostRecorded = this._register(new Emitter<CostRecord>());
	readonly onCostRecorded: Event<CostRecord> = this._onCostRecorded.event;

	// -- Constructor --

	constructor(
		@ILogService private readonly logService: ILogService,
		@IStorageService private readonly storageService: IStorageService,
	) {
		super();
		this.loadFromStorage();
		this.pruneOldRecords();
		this.logService.trace('[CostGovernorService] Initialized');
	}

	// -- isCallAllowed --

	isCallAllowed(estimatedTokens: number): boolean {
		// (1) Emergency stop check
		if (this.config.emergencyStop || this.emergencyStopReason !== null) {
			return false;
		}

		// (2) Max tokens check
		if (this.config.maxTokens > 0 && (this.totalTokensUsed + estimatedTokens) > this.config.maxTokens) {
			return false;
		}

		// (3) Max cost check (per-execution)
		if (this.config.maxCostUSD > 0 && this.totalCostUsed > this.config.maxCostUSD) {
			return false;
		}

		// (4) Daily budget check
		const todayCost = this.computeTodayCost();
		if (this.timeBudget.dailyLimitUSD > 0 && todayCost >= this.timeBudget.dailyLimitUSD) {
			return false;
		}

		// (5) Monthly budget check
		const monthlyCost = this.computeMonthlyCost();
		if (this.timeBudget.monthlyLimitUSD > 0 && monthlyCost >= this.timeBudget.monthlyLimitUSD) {
			return false;
		}

		// (6) Cooldown check
		const now = Date.now();
		if (this.lastCallTimestamp > 0 && (now - this.lastCallTimestamp) < this.config.cooldownMs) {
			return false;
		}

		// (7) Max tokens per minute check
		this.pruneLastMinuteEntries(now);
		if (this.config.maxTokensPerMinute > 0) {
			const tokensLastMinute = this.lastMinuteTokens.reduce((sum, e) => sum + e.tokens, 0);
			if ((tokensLastMinute + estimatedTokens) > this.config.maxTokensPerMinute) {
				return false;
			}
		}

		// (8) Max cost per minute check
		if (this.config.maxCostPerMinute > 0) {
			const costLastMinute = this.lastMinuteCosts.reduce((sum, e) => sum + e.cost, 0);
			if (costLastMinute > this.config.maxCostPerMinute) {
				return false;
			}
		}

		return true;
	}

	// -- recordCost --

	recordCost(record: CostRecord): void {
		// Add to cost history
		this.costHistory.push(record);

		// Update totals
		const tokenDelta = record.inputTokens + record.outputTokens;
		this.totalTokensUsed += tokenDelta;
		this.totalCostUsed += record.costUSD;

		// Update last call timestamp for cooldown
		this.lastCallTimestamp = record.timestamp;

		// Update per-minute tracking
		const now = record.timestamp;
		this.lastMinuteTokens.push({ timestamp: now, tokens: tokenDelta });
		this.lastMinuteCosts.push({ timestamp: now, cost: record.costUSD });
		this.pruneLastMinuteEntries(now);

		// Update burn rate calculations (tokens/sec over last 60 seconds)
		this.updateBurnRates(now);

		// Check budget status change
		const currentStatus = this.computeBudgetStatus();
		if (currentStatus !== this.previousStatus) {
			this._onBudgetStatusChange.fire(currentStatus);

			// Fire budget exceeded if we crossed into Exceeded
			if (currentStatus === BudgetStatus.Exceeded) {
				if (this.config.maxTokens > 0 && this.totalTokensUsed >= this.config.maxTokens) {
					this._onBudgetExceeded.fire({ type: 'tokens', used: this.totalTokensUsed, ceiling: this.config.maxTokens });
				}
				if (this.config.maxCostUSD > 0 && this.totalCostUsed >= this.config.maxCostUSD) {
					this._onBudgetExceeded.fire({ type: 'cost', used: this.totalCostUsed, ceiling: this.config.maxCostUSD });
				}
			}
			this.previousStatus = currentStatus;
		}

		// Check daily/monthly budget alert thresholds
		this.checkTimeBudgetAlerts();

		// Fire burn rate update
		this._onBurnRateUpdate.fire({ tokenRate: this.burnRateTokens, costRate: this.burnRateCost });

		// Fire cost recorded event
		this._onCostRecorded.fire(record);

		// Persist snapshot to storage
		this.persistToStorage();

		this.logService.trace(`[CostGovernorService] Recorded cost: ${tokenDelta} tokens, $${record.costUSD.toFixed(4)}; total: ${this.totalTokensUsed} tokens, $${this.totalCostUsed.toFixed(4)}`);
	}

	// -- getBudgetSnapshot --

	getBudgetSnapshot(): BudgetSnapshot {
		const status = this.computeBudgetStatus();
		const now = Date.now();

		const tokenFraction = this.config.maxTokens > 0
			? this.totalTokensUsed / this.config.maxTokens
			: 1;

		const costFraction = this.config.maxCostUSD > 0
			? this.totalCostUsed / this.config.maxCostUSD
			: 1;

		// Project remaining based on burn rate
		let projectedRemainingTokens = 0;
		let projectedRemainingCost = 0;

		if (this.burnRateTokens > 0 && this.config.maxTokens > 0) {
			const remainingTokens = Math.max(0, this.config.maxTokens - this.totalTokensUsed);
			projectedRemainingTokens = remainingTokens;
			const secondsRemaining = remainingTokens / this.burnRateTokens;
			projectedRemainingCost = this.burnRateCost * secondsRemaining;
		} else if (this.burnRateCost > 0 && this.config.maxCostUSD > 0) {
			const remainingCost = Math.max(0, this.config.maxCostUSD - this.totalCostUsed);
			projectedRemainingCost = remainingCost;
			const secondsRemaining = remainingCost / this.burnRateCost;
			projectedRemainingTokens = this.burnRateTokens * secondsRemaining;
		}

		return {
			tokensUsed: this.totalTokensUsed,
			costUsed: this.totalCostUsed,
			tokenCeiling: this.config.maxTokens,
			costCeiling: this.config.maxCostUSD,
			status,
			tokenFraction,
			costFraction,
			tokenBurnRate: this.burnRateTokens,
			costBurnRate: this.burnRateCost,
			projectedRemainingCost,
			projectedRemainingTokens,
			timestamp: now,
		};
	}

	// -- getConfig / updateConfig --

	getConfig(): BudgetConfig {
		return { ...this.config };
	}

	updateConfig(config: Partial<BudgetConfig>): void {
		this.config = { ...this.config, ...config };
		this.persistConfigToStorage();
		this.logService.info('[CostGovernorService] Config updated');
	}

	// -- Emergency stop --

	activateEmergencyStop(reason: string): void {
		this.config.emergencyStop = true;
		this.emergencyStopReason = reason;
		this.previousStatus = BudgetStatus.Emergency;
		this._onEmergencyStop.fire({ reason });
		this._onBudgetStatusChange.fire(BudgetStatus.Emergency);
		this.persistToStorage();
		this.logService.warn(`[CostGovernorService] Emergency stop activated: ${reason}`);
	}

	deactivateEmergencyStop(): void {
		this.config.emergencyStop = false;
		this.emergencyStopReason = null;
		// Reset status to Healthy if within budget
		const status = this.computeBudgetStatus();
		this.previousStatus = status;
		this._onBudgetStatusChange.fire(status);
		this.persistToStorage();
		this.logService.info('[CostGovernorService] Emergency stop deactivated');
	}

	isEmergencyStopped(): boolean {
		return this.config.emergencyStop || this.emergencyStopReason !== null;
	}

	// -- detectRunawayLoop --

	detectRunawayLoop(): RunawayDetection {
		const now = Date.now();
		const fiveMinutesAgo = now - 5 * 60 * 1000;

		// Need at least a few data points to detect anything
		if (this.costHistory.length < 5) {
			return {
				isRunaway: false,
				reason: null,
				escalationRate: 0,
				suggestedAction: null,
			};
		}

		// Compute tokens/min for each of the last 5 minutes
		const minuteBuckets: number[] = [];
		for (let i = 0; i < 5; i++) {
			const bucketStart = now - (5 - i) * 60 * 1000;
			const bucketEnd = bucketStart + 60 * 1000;
			let tokensInBucket = 0;
			for (const record of this.costHistory) {
				if (record.timestamp >= bucketStart && record.timestamp < bucketEnd) {
					tokensInBucket += record.inputTokens + record.outputTokens;
				}
			}
			minuteBuckets.push(tokensInBucket);
		}

		// Check if rate is doubling or more each minute
		let isDoubling = true;
		let hasNonZero = false;
		for (let i = 1; i < minuteBuckets.length; i++) {
			if (minuteBuckets[i - 1] > 0) {
				hasNonZero = true;
				if (minuteBuckets[i] < minuteBuckets[i - 1] * 2) {
					isDoubling = false;
					break;
				}
			}
		}

		// Compute escalation rate as the ratio of last minute to first minute
		let escalationRate = 0;
		if (minuteBuckets[0] > 0 && minuteBuckets[4] > 0) {
			escalationRate = minuteBuckets[4] / minuteBuckets[0];
		}

		// Check for repeated failed calls (same provider, high error rate)
		// We infer "failed calls" from records with 0 output tokens and short duration
		const recentRecords = this.costHistory.filter(r => r.timestamp >= fiveMinutesAgo);
		const providerErrorCounts: Record<string, { total: number; failed: number }> = {};
		for (const record of recentRecords) {
			if (!providerErrorCounts[record.providerId]) {
				providerErrorCounts[record.providerId] = { total: 0, failed: 0 };
			}
			providerErrorCounts[record.providerId].total++;
			if (record.outputTokens === 0 && record.durationMs < 1000) {
				providerErrorCounts[record.providerId].failed++;
			}
		}

		let hasHighErrorProvider = false;
		let highErrorProviderId: string | null = null;
		for (const [providerId, counts] of Object.entries(providerErrorCounts)) {
			if (counts.total >= 3 && counts.failed / counts.total >= 0.5) {
				hasHighErrorProvider = true;
				highErrorProviderId = providerId;
				break;
			}
		}

		const isRunaway = (hasNonZero && isDoubling) || hasHighErrorProvider;

		let reason: string | null = null;
		let suggestedAction: string | null = null;

		if (hasNonZero && isDoubling) {
			reason = 'Token usage is doubling each minute, indicating an escalating loop';
			suggestedAction = 'Activate emergency stop and investigate the runaway execution pattern';
		} else if (hasHighErrorProvider) {
			reason = `Provider "${highErrorProviderId}" has a high failure rate (${providerErrorCounts[highErrorProviderId!].failed}/${providerErrorCounts[highErrorProviderId!].total} recent calls failed)`;
			suggestedAction = 'Stop calling the failing provider and review the error pattern';
		}

		return {
			isRunaway,
			reason,
			escalationRate,
			suggestedAction,
		};
	}

	// -- getCostHistory --

	getCostHistory(): CostRecord[] {
		return [...this.costHistory];
	}

	// -- getCostByProvider --

	getCostByProvider(): Record<string, { tokens: number; cost: number; callCount: number }> {
		const result: Record<string, { tokens: number; cost: number; callCount: number }> = {};

		for (const record of this.costHistory) {
			if (!result[record.providerId]) {
				result[record.providerId] = { tokens: 0, cost: 0, callCount: 0 };
			}
			result[record.providerId].tokens += record.inputTokens + record.outputTokens;
			result[record.providerId].cost += record.costUSD;
			result[record.providerId].callCount++;
		}

		return result;
	}

	// -- getCostByModel (NEW) --

	getCostByModel(): Record<string, { tokens: number; cost: number; callCount: number }> {
		const result: Record<string, { tokens: number; cost: number; callCount: number }> = {};

		for (const record of this.costHistory) {
			if (!result[record.model]) {
				result[record.model] = { tokens: 0, cost: 0, callCount: 0 };
			}
			result[record.model].tokens += record.inputTokens + record.outputTokens;
			result[record.model].cost += record.costUSD;
			result[record.model].callCount++;
		}

		return result;
	}

	// -- getCostSummary (NEW) --

	getCostSummary(since?: number): CostSummary {
		const cutoff = since ?? (Date.now() - THIRTY_DAYS_MS);
		const filtered = this.costHistory.filter(r => r.timestamp >= cutoff);

		let totalCost = 0;
		let totalInputTokens = 0;
		let totalOutputTokens = 0;

		const byProvider = new Map<string, { cost: number; requests: number; tokens: number }>();
		const byModel = new Map<string, { cost: number; requests: number; tokens: number }>();

		for (const record of filtered) {
			totalCost += record.costUSD;
			totalInputTokens += record.inputTokens;
			totalOutputTokens += record.outputTokens;

			// By provider
			const prov = byProvider.get(record.providerId) ?? { cost: 0, requests: 0, tokens: 0 };
			prov.cost += record.costUSD;
			prov.requests++;
			prov.tokens += record.inputTokens + record.outputTokens;
			byProvider.set(record.providerId, prov);

			// By model
			const mod = byModel.get(record.model) ?? { cost: 0, requests: 0, tokens: 0 };
			mod.cost += record.costUSD;
			mod.requests++;
			mod.tokens += record.inputTokens + record.outputTokens;
			byModel.set(record.model, mod);
		}

		return {
			totalCost,
			todayCost: this.computeTodayCost(),
			monthlyCost: this.computeMonthlyCost(),
			totalInputTokens,
			totalOutputTokens,
			requestCount: filtered.length,
			byProvider,
			byModel,
		};
	}

	// -- getTimeBudget (NEW) --

	getTimeBudget(): TimeBudget {
		return { ...this.timeBudget };
	}

	// -- setTimeBudget (NEW) --

	setTimeBudget(budget: Partial<TimeBudget>): void {
		this.timeBudget = { ...this.timeBudget, ...budget };
		this.dailyAlertFired = false;
		this.monthlyAlertFired = false;
		this.persistTimeBudgetToStorage();
		this.logService.info(`[CostGovernorService] Time budget updated: daily=$${this.timeBudget.dailyLimitUSD}, monthly=$${this.timeBudget.monthlyLimitUSD}`);
	}

	// -- wouldExceedBudget (NEW) --

	wouldExceedBudget(estimatedCost: number): boolean {
		// Check daily budget
		if (this.timeBudget.dailyLimitUSD > 0) {
			const todayCost = this.computeTodayCost();
			if (todayCost + estimatedCost > this.timeBudget.dailyLimitUSD) {
				return true;
			}
		}

		// Check monthly budget
		if (this.timeBudget.monthlyLimitUSD > 0) {
			const monthlyCost = this.computeMonthlyCost();
			if (monthlyCost + estimatedCost > this.timeBudget.monthlyLimitUSD) {
				return true;
			}
		}

		return false;
	}

	// -- estimateCost (NEW) --

	estimateCost(modelId: string, inputTokens: number, outputTokens: number): number {
		const pricing = MODEL_PRICING.get(modelId) ?? DEFAULT_MODEL_PRICING;
		const inputCost = (inputTokens / 1_000_000) * pricing.inputPricePerMillion;
		const outputCost = (outputTokens / 1_000_000) * pricing.outputPricePerMillion;
		return inputCost + outputCost;
	}

	// -- resetBudget --

	resetBudget(): void {
		this.totalTokensUsed = 0;
		this.totalCostUsed = 0;
		this.costHistory = [];
		this.burnRateTokens = 0;
		this.burnRateCost = 0;
		this.lastMinuteTokens = [];
		this.lastMinuteCosts = [];
		this.lastCallTimestamp = 0;
		this.previousStatus = BudgetStatus.Healthy;
		this.dailyAlertFired = false;
		this.monthlyAlertFired = false;
		this.persistToStorage();
		this.logService.info('[CostGovernorService] Budget reset');
	}

	// -- projectCompletionCost --

	projectCompletionCost(totalMilestones: number, completedMilestones: number): { projectedTokens: number; projectedCost: number } {
		const completedSafe = Math.max(completedMilestones, 1);
		const avgTokensPerMilestone = this.totalTokensUsed / completedSafe;
		const avgCostPerMilestone = this.totalCostUsed / completedSafe;
		const remainingMilestones = Math.max(totalMilestones - completedMilestones, 0);

		return {
			projectedTokens: avgTokensPerMilestone * remainingMilestones,
			projectedCost: avgCostPerMilestone * remainingMilestones,
		};
	}

	// -- Private helpers --

	/**
	 * Compute the current budget status based on config and usage.
	 */
	private computeBudgetStatus(): BudgetStatus {
		if (this.config.emergencyStop || this.emergencyStopReason !== null) {
			return BudgetStatus.Emergency;
		}

		// Check token ceiling
		if (this.config.maxTokens > 0) {
			const tokenFraction = this.totalTokensUsed / this.config.maxTokens;
			if (tokenFraction >= 1) {
				return BudgetStatus.Exceeded;
			}
			if (tokenFraction >= this.config.warningThreshold) {
				return BudgetStatus.Warning;
			}
		}

		// Check cost ceiling (per-execution)
		if (this.config.maxCostUSD > 0) {
			const costFraction = this.totalCostUsed / this.config.maxCostUSD;
			if (costFraction >= 1) {
				return BudgetStatus.Exceeded;
			}
			if (costFraction >= this.config.warningThreshold) {
				return BudgetStatus.Warning;
			}
		}

		// Check daily budget
		if (this.timeBudget.dailyLimitUSD > 0) {
			const todayCost = this.computeTodayCost();
			const dailyFraction = todayCost / this.timeBudget.dailyLimitUSD;
			if (dailyFraction >= 1) {
				return BudgetStatus.Exceeded;
			}
			if (dailyFraction >= this.timeBudget.alertThreshold) {
				return BudgetStatus.Warning;
			}
		}

		// Check monthly budget
		if (this.timeBudget.monthlyLimitUSD > 0) {
			const monthlyCost = this.computeMonthlyCost();
			const monthlyFraction = monthlyCost / this.timeBudget.monthlyLimitUSD;
			if (monthlyFraction >= 1) {
				return BudgetStatus.Exceeded;
			}
			if (monthlyFraction >= this.timeBudget.alertThreshold) {
				return BudgetStatus.Warning;
			}
		}

		return BudgetStatus.Healthy;
	}

	/**
	 * Compute total cost for today (since midnight local time).
	 */
	private computeTodayCost(): number {
		const now = new Date();
		const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
		let todayCost = 0;
		for (const record of this.costHistory) {
			if (record.timestamp >= startOfDay) {
				todayCost += record.costUSD;
			}
		}
		return todayCost;
	}

	/**
	 * Compute total cost for this month (since 1st of the month).
	 */
	private computeMonthlyCost(): number {
		const now = new Date();
		const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
		let monthlyCost = 0;
		for (const record of this.costHistory) {
			if (record.timestamp >= startOfMonth) {
				monthlyCost += record.costUSD;
			}
		}
		return monthlyCost;
	}

	/**
	 * Check and fire daily/monthly budget alert thresholds.
	 */
	private checkTimeBudgetAlerts(): void {
		// Daily alert
		if (this.timeBudget.dailyLimitUSD > 0 && !this.dailyAlertFired) {
			const todayCost = this.computeTodayCost();
			const percentage = todayCost / this.timeBudget.dailyLimitUSD;
			if (percentage >= this.timeBudget.alertThreshold) {
				this.dailyAlertFired = true;
				this._onBudgetAlert.fire({
					type: 'daily',
					percentage,
					current: todayCost,
					limit: this.timeBudget.dailyLimitUSD,
				});
				this.logService.warn(`[CostGovernorService] Daily budget alert: ${((percentage) * 100).toFixed(1)}% ($${todayCost.toFixed(2)}/$${this.timeBudget.dailyLimitUSD})`);
			}
		}

		// Monthly alert
		if (this.timeBudget.monthlyLimitUSD > 0 && !this.monthlyAlertFired) {
			const monthlyCost = this.computeMonthlyCost();
			const percentage = monthlyCost / this.timeBudget.monthlyLimitUSD;
			if (percentage >= this.timeBudget.alertThreshold) {
				this.monthlyAlertFired = true;
				this._onBudgetAlert.fire({
					type: 'monthly',
					percentage,
					current: monthlyCost,
					limit: this.timeBudget.monthlyLimitUSD,
				});
				this.logService.warn(`[CostGovernorService] Monthly budget alert: ${((percentage) * 100).toFixed(1)}% ($${monthlyCost.toFixed(2)}/$${this.timeBudget.monthlyLimitUSD})`);
			}
		}
	}

	/**
	 * Prune cost records older than 30 days.
	 */
	private pruneOldRecords(): void {
		const cutoff = Date.now() - THIRTY_DAYS_MS;
		const before = this.costHistory.length;
		this.costHistory = this.costHistory.filter(r => r.timestamp >= cutoff);
		const pruned = before - this.costHistory.length;
		if (pruned > 0) {
			this.logService.info(`[CostGovernorService] Pruned ${pruned} cost records older than 30 days`);
			this.persistCostRecordsToStorage();
		}
	}

	/**
	 * Prune entries from lastMinuteTokens and lastMinuteCosts that are
	 * older than 60 seconds from the given timestamp.
	 */
	private pruneLastMinuteEntries(now: number): void {
		const cutoff = now - 60_000;
		this.lastMinuteTokens = this.lastMinuteTokens.filter(e => e.timestamp >= cutoff);
		this.lastMinuteCosts = this.lastMinuteCosts.filter(e => e.timestamp >= cutoff);
	}

	/**
	 * Update burn rate calculations based on the last 60 seconds of data.
	 * Computes tokens/sec and cost/sec.
	 */
	private updateBurnRates(now: number): void {
		const cutoff = now - 60_000;
		const recentTokens = this.lastMinuteTokens.filter(e => e.timestamp >= cutoff);
		const recentCosts = this.lastMinuteCosts.filter(e => e.timestamp >= cutoff);

		if (recentTokens.length > 0) {
			const totalTokens = recentTokens.reduce((sum, e) => sum + e.tokens, 0);
			const oldestTs = recentTokens[0].timestamp;
			const elapsedSec = Math.max((now - oldestTs) / 1000, 1);
			this.burnRateTokens = totalTokens / elapsedSec;
		} else {
			this.burnRateTokens = 0;
		}

		if (recentCosts.length > 0) {
			const totalCost = recentCosts.reduce((sum, e) => sum + e.cost, 0);
			const oldestTs = recentCosts[0].timestamp;
			const elapsedSec = Math.max((now - oldestTs) / 1000, 1);
			this.burnRateCost = totalCost / elapsedSec;
		} else {
			this.burnRateCost = 0;
		}
	}

	/**
	 * Persist the budget snapshot, config, time budget, and cost records to IStorageService.
	 */
	private persistToStorage(): void {
		this.persistBudgetToStorage();
		this.persistConfigToStorage();
		this.persistCostRecordsToStorage();
		this.persistTimeBudgetToStorage();
	}

	private persistBudgetToStorage(): void {
		const snapshot = {
			totalTokensUsed: this.totalTokensUsed,
			totalCostUsed: this.totalCostUsed,
			burnRateTokens: this.burnRateTokens,
			burnRateCost: this.burnRateCost,
			emergencyStopReason: this.emergencyStopReason,
			lastCallTimestamp: this.lastCallTimestamp,
			previousStatus: this.previousStatus,
		};
		try {
			this.storageService.store(STORAGE_KEY_BUDGET, JSON.stringify(snapshot), StorageScope.WORKSPACE, StorageTarget.MACHINE);
		} catch (e) {
			this.logService.warn('[CostGovernorService] Failed to persist budget to storage', e);
		}
	}

	private persistConfigToStorage(): void {
		try {
			this.storageService.store(STORAGE_KEY_CONFIG, JSON.stringify(this.config), StorageScope.WORKSPACE, StorageTarget.MACHINE);
		} catch (e) {
			this.logService.warn('[CostGovernorService] Failed to persist config to storage', e);
		}
	}

	private persistCostRecordsToStorage(): void {
		try {
			this.storageService.store(STORAGE_KEY_COST_RECORDS, JSON.stringify(this.costHistory), StorageScope.WORKSPACE, StorageTarget.MACHINE);
		} catch (e) {
			this.logService.warn('[CostGovernorService] Failed to persist cost records to storage', e);
		}
	}

	private persistTimeBudgetToStorage(): void {
		try {
			this.storageService.store(STORAGE_KEY_TIME_BUDGET, JSON.stringify(this.timeBudget), StorageScope.WORKSPACE, StorageTarget.MACHINE);
		} catch (e) {
			this.logService.warn('[CostGovernorService] Failed to persist time budget to storage', e);
		}
	}

	/**
	 * Load budget state, config, cost records, and time budget from IStorageService.
	 */
	private loadFromStorage(): void {
		try {
			const budgetRaw = this.storageService.get(STORAGE_KEY_BUDGET, StorageScope.WORKSPACE);
			if (budgetRaw) {
				const snapshot = JSON.parse(budgetRaw);
				this.totalTokensUsed = snapshot.totalTokensUsed ?? 0;
				this.totalCostUsed = snapshot.totalCostUsed ?? 0;
				this.burnRateTokens = snapshot.burnRateTokens ?? 0;
				this.burnRateCost = snapshot.burnRateCost ?? 0;
				this.emergencyStopReason = snapshot.emergencyStopReason ?? null;
				this.lastCallTimestamp = snapshot.lastCallTimestamp ?? 0;
				this.previousStatus = snapshot.previousStatus ?? BudgetStatus.Healthy;
			}
		} catch (e) {
			this.logService.warn('[CostGovernorService] Failed to load budget from storage', e);
		}

		try {
			const configRaw = this.storageService.get(STORAGE_KEY_CONFIG, StorageScope.WORKSPACE);
			if (configRaw) {
				this.config = { ...DEFAULT_CONFIG, ...JSON.parse(configRaw) };
			}
		} catch (e) {
			this.logService.warn('[CostGovernorService] Failed to load config from storage', e);
		}

		try {
			const recordsRaw = this.storageService.get(STORAGE_KEY_COST_RECORDS, StorageScope.WORKSPACE);
			if (recordsRaw) {
				this.costHistory = JSON.parse(recordsRaw);
			}
		} catch (e) {
			this.logService.warn('[CostGovernorService] Failed to load cost records from storage', e);
		}

		try {
			const timeBudgetRaw = this.storageService.get(STORAGE_KEY_TIME_BUDGET, StorageScope.WORKSPACE);
			if (timeBudgetRaw) {
				this.timeBudget = { ...DEFAULT_TIME_BUDGET, ...JSON.parse(timeBudgetRaw) };
			}
		} catch (e) {
			this.logService.warn('[CostGovernorService] Failed to load time budget from storage', e);
		}
	}

	// -- Lifecycle --

	override dispose(): void {
		this.logService.trace('[CostGovernorService] Disposed');
		super.dispose();
	}
}
