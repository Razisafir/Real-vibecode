/*---------------------------------------------------------------------------------------------
 *  AI Execution Kernel -- Phase 29: Cost Governor & API Safety
 *  Real Vibecode -- AI-Native IDE
 *
 *  CostGovernorService -- Concrete implementation of ICostGovernorService.
 *  Hard cost enforcement for LLM API usage with budget ceilings, emergency
 *  stops, burn-rate monitoring, runaway loop detection, and projected
 *  completion cost estimation.
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
} from '../common/costGovernor.js';

// -- Storage keys --

const STORAGE_KEY_BUDGET = 'aiExecution.costGovernor.budget';
const STORAGE_KEY_CONFIG = 'aiExecution.costGovernor.config';

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

// -- Internal types for per-minute tracking --

interface TimestampedTokens {
	timestamp: number;
	tokens: number;
}

interface TimestampedCost {
	timestamp: number;
	cost: number;
}

// -- CostGovernorService --

export class CostGovernorService extends Disposable implements ICostGovernorService {

	declare readonly _serviceBrand: undefined;

	// -- Private state --

	private config: BudgetConfig = { ...DEFAULT_CONFIG };
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

	// -- Events --

	private readonly _onBudgetStatusChange = this._register(new Emitter<BudgetStatus>());
	readonly onBudgetStatusChange: Event<BudgetStatus> = this._onBudgetStatusChange.event;

	private readonly _onBudgetExceeded = this._register(new Emitter<{ type: 'tokens' | 'cost'; used: number; ceiling: number }>());
	readonly onBudgetExceeded: Event<{ type: 'tokens' | 'cost'; used: number; ceiling: number }> = this._onBudgetExceeded.event;

	private readonly _onEmergencyStop = this._register(new Emitter<{ reason: string }>());
	readonly onEmergencyStop: Event<{ reason: string }> = this._onEmergencyStop.event;

	private readonly _onBurnRateUpdate = this._register(new Emitter<{ tokenRate: number; costRate: number }>());
	readonly onBurnRateUpdate: Event<{ tokenRate: number; costRate: number }> = this._onBurnRateUpdate.event;

	// -- Constructor --

	constructor(
		@ILogService private readonly logService: ILogService,
		@IStorageService private readonly storageService: IStorageService,
	) {
		super();
		this.loadFromStorage();
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

		// (3) Max cost check
		if (this.config.maxCostUSD > 0 && this.totalCostUsed > this.config.maxCostUSD) {
			return false;
		}

		// (4) Cooldown check
		const now = Date.now();
		if (this.lastCallTimestamp > 0 && (now - this.lastCallTimestamp) < this.config.cooldownMs) {
			return false;
		}

		// (5) Max tokens per minute check
		this.pruneLastMinuteEntries(now);
		if (this.config.maxTokensPerMinute > 0) {
			const tokensLastMinute = this.lastMinuteTokens.reduce((sum, e) => sum + e.tokens, 0);
			if ((tokensLastMinute + estimatedTokens) > this.config.maxTokensPerMinute) {
				return false;
			}
		}

		// (6) Max cost per minute check
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

		// Fire burn rate update
		this._onBurnRateUpdate.fire({ tokenRate: this.burnRateTokens, costRate: this.burnRateCost });

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

		// Check cost ceiling
		if (this.config.maxCostUSD > 0) {
			const costFraction = this.totalCostUsed / this.config.maxCostUSD;
			if (costFraction >= 1) {
				return BudgetStatus.Exceeded;
			}
			if (costFraction >= this.config.warningThreshold) {
				return BudgetStatus.Warning;
			}
		}

		return BudgetStatus.Healthy;
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
	 * Persist the budget snapshot and config to IStorageService.
	 */
	private persistToStorage(): void {
		this.persistBudgetToStorage();
		this.persistConfigToStorage();
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

	/**
	 * Load budget state and config from IStorageService.
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
	}

	// -- Lifecycle --

	override dispose(): void {
		this.logService.trace('[CostGovernorService] Disposed');
		super.dispose();
	}
}
