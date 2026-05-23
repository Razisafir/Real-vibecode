/*---------------------------------------------------------------------------------------------
 *  AI Execution Kernel -- Phase 29: Cost Governor & API Safety
 *  Real Vibecode -- AI-Native IDE
 *
 *  ICostGovernorService -- Hard cost enforcement for LLM API usage.
 *
 *  REAL responsibilities:
 *    - Hard token ceilings: execution halts when token budget exceeded
 *    - Hard dollar ceilings: execution halts when cost budget exceeded
 *    - Emergency execution stop: immediately halt all LLM calls
 *    - Provider cooldowns: prevent rapid-fire API calls to same provider
 *    - Retry budgeting: limit retry attempts with exponential backoff
 *    - Runaway loop detection: detect escalating token usage patterns
 *    - Execution burn-rate monitoring: track tokens/second and cost/second
 *    - Projected completion cost: estimate remaining cost to finish plan
 *
 *  HARD RULES:
 *    - Execution MUST HALT when budget exceeded
 *    - User-configurable hard caps (token and dollar)
 *    - Live budget dashboard updates
 *    - Projected completion cost must be displayed before continuing
 *
 *  HONEST limitations:
 *    - Token counting is estimated (not exact) since we do not have
 *      access to the tokenizer used by each LLM provider
 *    - Cost projections are estimates based on current burn rate
 *    - Emergency stop cannot revoke API calls already in flight
 *--------------------------------------------------------------------------------------------*/

import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { Event } from '../../../../base/common/event.js';

// -- Enumerations --

/**
 * Budget status.
 */
export enum BudgetStatus {
	/** Within budget */
	Healthy = 'healthy',
	/** Approaching limit (>80%) */
	Warning = 'warning',
	/** Budget exceeded */
	Exceeded = 'exceeded',
	/** Emergency stop activated */
	Emergency = 'emergency',
}

// -- Data Types --

/**
 * Budget configuration with hard caps.
 */
export interface BudgetConfig {
	/** Hard token ceiling (0 = unlimited) */
	maxTokens: number;
	/** Hard dollar ceiling (0 = unlimited) */
	maxCostUSD: number;
	/** Warning threshold (0-1, default 0.8) */
	warningThreshold: number;
	/** Minimum cooldown between API calls in ms (default: 500) */
	cooldownMs: number;
	/** Maximum retries per request (default: 3) */
	maxRetries: number;
	/** Maximum tokens per minute (rate limiting, 0 = unlimited) */
	maxTokensPerMinute: number;
	/** Maximum cost per minute in USD (0 = unlimited) */
	maxCostPerMinute: number;
	/** Whether emergency stop is active */
	emergencyStop: boolean;
}

/**
 * Current budget usage snapshot.
 */
export interface BudgetSnapshot {
	/** Total tokens used in this execution */
	tokensUsed: number;
	/** Total cost in USD */
	costUsed: number;
	/** Token ceiling (0 = unlimited) */
	tokenCeiling: number;
	/** Cost ceiling in USD (0 = unlimited) */
	costCeiling: number;
	/** Current status */
	status: BudgetStatus;
	/** Token usage as fraction of ceiling (0-1, 1 if unlimited) */
	tokenFraction: number;
	/** Cost usage as fraction of ceiling (0-1, 1 if unlimited) */
	costFraction: number;
	/** Current burn rate: tokens per second */
	tokenBurnRate: number;
	/** Current burn rate: USD per second */
	costBurnRate: number;
	/** Projected remaining cost to complete the current plan */
	projectedRemainingCost: number;
	/** Projected remaining tokens to complete the current plan */
	projectedRemainingTokens: number;
	/** Timestamp of this snapshot */
	timestamp: number;
}

/**
 * Record of a single API call's cost.
 */
export interface CostRecord {
	/** Request ID */
	readonly requestId: string;
	/** Provider ID */
	readonly providerId: string;
	/** Model name */
	readonly model: string;
	/** Input tokens (estimated) */
	readonly inputTokens: number;
	/** Output tokens (estimated) */
	readonly outputTokens: number;
	/** Cost in USD */
	readonly costUSD: number;
	/** Timestamp */
	readonly timestamp: number;
	/** Duration of the API call in ms */
	readonly durationMs: number;
}

/**
 * Runaway loop detection result.
 */
export interface RunawayDetection {
	/** Whether a runaway pattern is detected */
	readonly isRunaway: boolean;
	/** Reason for the detection */
	readonly reason: string | null;
	/** Current escalation rate (tokens per minute trend) */
	readonly escalationRate: number;
	/** Suggested action */
	readonly suggestedAction: string | null;
}

// -- Service Interface --

export interface ICostGovernorService {
	readonly _serviceBrand: undefined;

	/** Fired when budget status changes */
	readonly onBudgetStatusChange: Event<BudgetStatus>;
	/** Fired when budget is exceeded */
	readonly onBudgetExceeded: Event<{ type: 'tokens' | 'cost'; used: number; ceiling: number }>;
	/** Fired when emergency stop is activated */
	readonly onEmergencyStop: Event<{ reason: string }>;
	/** Fired when burn rate updates */
	readonly onBurnRateUpdate: Event<{ tokenRate: number; costRate: number }>;

	/**
	 * Check if an API call is allowed under current budget constraints.
	 * Returns true if the call can proceed, false if budget is exceeded.
	 * Also checks cooldowns and rate limits.
	 */
	isCallAllowed(estimatedTokens: number): boolean;

	/**
	 * Record an API call's cost after completion.
	 * Updates token and cost counters, burn rate, and budget status.
	 */
	recordCost(record: CostRecord): void;

	/**
	 * Get the current budget snapshot.
	 */
	getBudgetSnapshot(): BudgetSnapshot;

	/**
	 * Get the budget configuration.
	 */
	getConfig(): BudgetConfig;

	/**
	 * Update the budget configuration.
	 */
	updateConfig(config: Partial<BudgetConfig>): void;

	/**
	 * Activate emergency stop.
	 * All subsequent isCallAllowed() checks return false until reset.
	 */
	activateEmergencyStop(reason: string): void;

	/**
	 * Deactivate emergency stop.
	 * Allows execution to resume within budget constraints.
	 */
	deactivateEmergencyStop(): void;

	/**
	 * Check if emergency stop is active.
	 */
	isEmergencyStopped(): boolean;

	/**
	 * Detect runaway loops by analyzing token usage patterns.
	 * Looks for: escalating burn rate, repeating failed calls,
	 * costs increasing without progress.
	 */
	detectRunawayLoop(): RunawayDetection;

	/**
	 * Get the cost history for the current execution.
	 */
	getCostHistory(): CostRecord[];

	/**
	 * Get provider-specific cost breakdown.
	 */
	getCostByProvider(): Record<string, { tokens: number; cost: number; callCount: number }>;

	/**
	 * Reset the budget for a new execution.
	 * Clears token and cost counters but preserves configuration.
	 */
	resetBudget(): void;

	/**
	 * Project the cost to complete the current plan.
	 * Based on: tokens used so far, milestones completed,
	 * average cost per milestone.
	 */
	projectCompletionCost(totalMilestones: number, completedMilestones: number): { projectedTokens: number; projectedCost: number };
}

export const ICostGovernorService = createDecorator<ICostGovernorService>('costGovernorService');
