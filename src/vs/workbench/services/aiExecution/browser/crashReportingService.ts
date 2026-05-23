/*---------------------------------------------------------------------------------------------
 *  Crash Reporting Service — VibeCode
 *  Real Vibecode — AI-Native IDE
 *
 *  ICrashReportingService — Dedicated crash reporting infrastructure for VibeCode.
 *  Captures unhandled exceptions, promise rejections, and manual error reports;
 *  scrubs PII, rate-limits submissions, and persists reports offline.
 *
 *  Design Principles:
 *    - Privacy-first: opt-in only, default is opt-out
 *    - PII scrubbing before any data leaves the machine
 *    - Rate-limited to prevent flooding the crash server
 *    - Offline-resilient: queues locally, submits when online
 *    - Breadcrumb trail for richer crash context
 *--------------------------------------------------------------------------------------------*/

import { Disposable } from '../../../../base/common/lifecycle.js';
import { Emitter, Event } from '../../../../base/common/event.js';
import { generateUuid } from '../../../../base/common/uuid.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { IStorageService, StorageScope, StorageTarget } from '../../../../platform/storage/common/storage.js';
import { IEnvironmentService } from '../../../../platform/environment/common/environment.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { isWeb } from '../../../../base/common/platform.js';

// ─── Types ────────────────────────────────────────────────────────────────────

/**
 * Severity level for crash reports.
 */
export enum CrashLevel {
	Fatal = 'fatal',
	Error = 'error',
	Warning = 'warning',
	Info = 'info',
}

/**
 * Contextual metadata attached to a crash report.
 * Captures the state of the AI execution pipeline at crash time.
 */
export interface CrashContext {
	readonly component?: string;
	readonly action?: string;
	readonly providerId?: string;
	readonly modelId?: string;
	readonly sessionId?: string;
	readonly [key: string]: unknown;
}

/**
 * A breadcrumb entry for reconstructing the user/AI action trail
 * leading up to a crash.
 */
export interface Breadcrumb {
	readonly timestamp: number;
	readonly category: string;
	readonly message: string;
	readonly data?: Record<string, unknown>;
}

/**
 * System information captured at crash time.
 */
export interface SystemInfo {
	readonly platform: string;
	readonly arch: string;
	readonly version: string;
	readonly electronVersion: string;
	readonly nodeVersion: string;
	readonly memoryUsage: number;
	readonly cpuUsage: number;
}

/**
 * A complete crash report ready for submission (after PII scrubbing).
 */
export interface CrashReport {
	readonly id: string;
	readonly timestamp: number;
	readonly type: 'exception' | 'message';
	readonly level: CrashLevel;
	readonly message: string;
	readonly stack?: string;
	readonly context: CrashContext;
	readonly breadcrumbs: Breadcrumb[];
	readonly systemInfo: SystemInfo;
	readonly userAgent: string;
}

// ─── Internal Types ───────────────────────────────────────────────────────────

/**
 * A crash report that is persisted locally but has not yet been
 * successfully submitted to the crash server.
 */
interface PendingCrashReport {
	readonly report: CrashReport;
	readonly retryCount: number;
	readonly lastAttempt?: number;
}

/**
 * Submission result from the crash server.
 */
interface CrashSubmissionResult {
	readonly accepted: boolean;
	readonly reportId?: string;
	readonly error?: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

/** Crash report submission endpoint */
const CRASH_ENDPOINT = 'https://crash.vibecode.dev/api/reports';

/** Product identifiers from product.json */
const PRODUCT_APP_NAME = 'real-vibecode-agents';
const PRODUCT_ID = 'real-vibecode';

/** Rate limiting */
const MAX_SUBMISSIONS_PER_MINUTE = 1;
const MAX_SUBMISSIONS_PER_HOUR = 10;
const RATE_WINDOW_MINUTE = 60_000;
const RATE_WINDOW_HOUR = 3_600_000;

/** Storage keys */
const STORAGE_KEY_CONSENT = 'crashReporting.consent';
const STORAGE_KEY_PENDING = 'crashReporting.pendingReports';

/** Breadcrumb limits */
const MAX_BREADCRUMBS = 50;

/** Pending report limits */
const MAX_PENDING_REPORTS = 100;

/** Stack trace frame limit */
const MAX_STACK_FRAMES = 20;

/** Maximum retry attempts for a pending report */
const MAX_RETRY_ATTEMPTS = 5;

/** Flush timeout in ms */
const FLUSH_TIMEOUT_MS = 10_000;

/** HTTP request timeout in ms */
const REQUEST_TIMEOUT_MS = 8_000;

/** Configuration key for crash reporting enabled */
const CONFIG_KEY_ENABLED = 'telemetry.crashReporting.enabled';

// ─── PII Scrubbing Patterns ───────────────────────────────────────────────────

const PII_PATTERNS: ReadonlyArray<{ pattern: RegExp; replacement: string }> = [
	// Email addresses
	{ pattern: /[\w.-]+@[\w.-]+\.\w+/g, replacement: '<email>' },
	// IPv4 addresses
	{ pattern: /\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/g, replacement: '<ip>' },
	// API keys: sk-..., key-..., api_key=..., apiKey=...
	{ pattern: /\b(?:sk|key|api[_-]?key|apikey|token|secret|password|Bearer)\s*[:=]\s*['"]?[^\s'",;}]+/gi, replacement: '<redacted-key>' },
	// JWT tokens (three base64url segments separated by dots)
	{ pattern: /eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, replacement: '<jwt>' },
	// Common token patterns: Bearer ..., token ...
	{ pattern: /\b(?:Bearer|token)\s+[A-Za-z0-9_.-]+/gi, replacement: '<redacted-token>' },
	// File paths (Unix)
	{ pattern: /(?:\/(?:home|Users|tmp|var|etc|opt|usr|dev|root))\/[^\s:)'"]+/g, replacement: '<path>' },
	// File paths (Windows)
	{ pattern: /[A-Za-z]:\\[^\s:)'"]+/g, replacement: '<path>' },
];

// ─── Service Interface ────────────────────────────────────────────────────────

export const ICrashReportingService = createDecorator<ICrashReportingService>('crashReportingService');

/**
 * ICrashReportingService — Privacy-first crash reporting for VibeCode.
 *
 * Captures errors, collects context, scrubs PII, and submits crash reports
 * to crash.vibecode.dev. Reports are stored locally when offline and
 * submitted when connectivity is restored.
 *
 * Privacy model:
 *   - Default is opt-OUT (no reports sent without consent)
 *   - All PII is scrubbed before any data leaves the machine
 *   - User can toggle consent at any time via setUserConsent()
 *   - Configuration setting: telemetry.crashReporting.enabled
 */
export interface ICrashReportingService {
	readonly _serviceBrand: undefined;

	/**
	 * Whether the user has consented to crash reporting.
	 */
	readonly hasConsent: boolean;

	/**
	 * Event fired when a crash report is captured (after PII scrubbing).
	 * Useful for telemetry integration or UI notification.
	 */
	readonly onDidCaptureReport: Event<CrashReport>;

	/**
	 * Event fired when a crash report is successfully submitted.
	 */
	readonly onDidSubmitReport: Event<CrashReport>;

	/**
	 * Capture a handled exception.
	 * @param error The error to capture
	 * @param context Optional contextual metadata
	 */
	captureException(error: Error, context?: CrashContext): void;

	/**
	 * Capture a diagnostic message at the given severity level.
	 * @param message The message to capture
	 * @param level Severity level
	 * @param context Optional contextual metadata
	 */
	captureMessage(message: string, level: CrashLevel, context?: CrashContext): void;

	/**
	 * Set the user's privacy consent for crash reporting.
	 * When consent is revoked, pending reports are NOT deleted
	 * but will not be submitted until consent is re-granted.
	 * @param consented Whether the user consents
	 */
	setUserConsent(consented: boolean): void;

	/**
	 * Add a breadcrumb for crash context.
	 * Breadcrumbs record the trail of user/AI actions leading up
	 * to a crash, providing crucial debugging context.
	 * @param category Breadcrumb category (e.g., 'navigation', 'ai-action')
	 * @param message Human-readable description
	 * @param data Optional structured data
	 */
	addBreadcrumb(category: string, message: string, data?: Record<string, unknown>): void;

	/**
	 * Flush all pending crash reports to the server.
	 * Resolves when all reports have been submitted or the timeout is reached.
	 * @returns Promise that resolves when flush is complete
	 */
	flush(): Promise<void>;

	/**
	 * Get the count of crash reports that have not yet been
	 * successfully submitted to the server.
	 */
	getPendingCount(): number;
}

// ─── Implementation ───────────────────────────────────────────────────────────

export class CrashReportingService extends Disposable implements ICrashReportingService {

	declare readonly _serviceBrand: undefined;

	// ─── State ─────────────────────────────────────────────────────────────────

	private _consent: boolean;
	get hasConsent(): boolean { return this._consent; }

	/** Breadcrumb ring buffer */
	private _breadcrumbs: Breadcrumb[] = [];

	/** Pending reports not yet submitted */
	private _pendingReports: PendingCrashReport[] = [];

	/** Rate-limit tracking: timestamps of recent submissions */
	private _submissionTimestamps: number[] = [];

	/** Whether a flush is currently in progress */
	private _flushInProgress: boolean = false;

	/** Whether global error handlers have been installed */
	private _handlersInstalled: boolean = false;

	/** Original unhandled rejection handler (to restore on dispose) */
	private _originalRejectionHandler: ((event: PromiseRejectionEvent) => void) | undefined;

	// ─── Events ───────────────────────────────────────────────────────────────

	private readonly _onDidCaptureReport = this._register(new Emitter<CrashReport>());
	readonly onDidCaptureReport: Event<CrashReport> = this._onDidCaptureReport.event;

	private readonly _onDidSubmitReport = this._register(new Emitter<CrashReport>());
	readonly onDidSubmitReport: Event<CrashReport> = this._onDidSubmitReport.event;

	// ─── Constructor ──────────────────────────────────────────────────────────

	constructor(
		@ILogService private readonly logService: ILogService,
		@IStorageService private readonly storageService: IStorageService,
		@IEnvironmentService private readonly environmentService: IEnvironmentService,
		@IConfigurationService private readonly configurationService: IConfigurationService,
	) {
		super();

		// Load consent from storage (default: false = opt-out)
		this._consent = this.storageService.getBoolean(STORAGE_KEY_CONSENT, StorageScope.APPLICATION, false);

		// Load pending reports from storage
		this._loadPendingReports();

		// Install global error handlers
		this._installGlobalHandlers();

		// Listen for online status to flush pending reports
		if (typeof window !== 'undefined') {
			this._register(Event.fromDOMEventEmitter(window, 'online')(() => {
				this.logService.trace('[CrashReportingService] Browser came online, flushing pending reports');
				this.flush();
			}));
		}

		// Listen for configuration changes
		this._register(this.configurationService.onDidChangeConfiguration(e => {
			if (e.affectsConfiguration(CONFIG_KEY_ENABLED)) {
				const configEnabled = this.configurationService.getValue<boolean>(CONFIG_KEY_ENABLED);
				if (configEnabled !== undefined) {
					this.setUserConsent(configEnabled);
				}
			}
		}));

		this.logService.trace('[CrashReportingService] Initialized', { consent: this._consent, pendingCount: this._pendingReports.length });
	}

	// ─── Public API ──────────────────────────────────────────────────────────

	captureException(error: Error, context?: CrashContext): void {
		try {
			const report = this._buildReport('exception', error.message, error.stack, context);
			this._enqueueReport(report);
			this.logService.error('[CrashReportingService] Exception captured:', error.message);
		} catch (captureError) {
			// Never let crash reporting itself cause a crash
			this.logService.error('[CrashReportingService] Failed to capture exception:', captureError);
		}
	}

	captureMessage(message: string, level: CrashLevel, context?: CrashContext): void {
		try {
			const report = this._buildReport('message', message, undefined, context);
			// Override level from the parameter (buildReport defaults to Error)
			const levelReport: CrashReport = { ...report, level };
			this._enqueueReport(levelReport);

			const logFn = level === CrashLevel.Fatal || level === CrashLevel.Error
				? this.logService.error.bind(this.logService)
				: level === CrashLevel.Warning
					? this.logService.warn.bind(this.logService)
					: this.logService.info.bind(this.logService);
			logFn(`[CrashReportingService] Message captured (${level}):`, message);
		} catch (captureError) {
			this.logService.error('[CrashReportingService] Failed to capture message:', captureError);
		}
	}

	setUserConsent(consented: boolean): void {
		this._consent = consented;
		this.storageService.store(STORAGE_KEY_CONSENT, consented, StorageScope.APPLICATION, StorageTarget.USER);
		this.logService.info(`[CrashReportingService] User consent ${consented ? 'granted' : 'revoked'}`);

		// If consent was just granted, try to flush pending reports
		if (consented) {
			this.flush();
		}
	}

	addBreadcrumb(category: string, message: string, data?: Record<string, unknown>): void {
		const breadcrumb: Breadcrumb = {
			timestamp: Date.now(),
			category,
			message: this._scrubPII(message),
			data: data ? this._scrubPIIFromObject(data) : undefined,
		};

		this._breadcrumbs.push(breadcrumb);

		// Ring buffer: keep only the most recent breadcrumbs
		if (this._breadcrumbs.length > MAX_BREADCRUMBS) {
			this._breadcrumbs = this._breadcrumbs.slice(-MAX_BREADCRUMBS);
		}
	}

	async flush(): Promise<void> {
		if (this._flushInProgress) {
			return;
		}

		if (!this._consent) {
			this.logService.trace('[CrashReportingService] Flush skipped — no user consent');
			return;
		}

		if (this._pendingReports.length === 0) {
			return;
		}

		this._flushInProgress = true;
		const flushStart = Date.now();

		try {
			const reportsToFlush = [...this._pendingReports];

			for (const pending of reportsToFlush) {
				// Check flush timeout
				if (Date.now() - flushStart > FLUSH_TIMEOUT_MS) {
					this.logService.warn('[CrashReportingService] Flush timeout reached, stopping');
					break;
				}

				// Rate limit check
				if (!this._checkRateLimit()) {
					this.logService.trace('[CrashReportingService] Rate limit reached, stopping flush');
					break;
				}

				const result = await this._submitReport(pending.report);

				if (result.accepted) {
					// Remove from pending queue
					this._pendingReports = this._pendingReports.filter(p => p.report.id !== pending.report.id);
					this._submissionTimestamps.push(Date.now());
					this._onDidSubmitReport.fire(pending.report);
					this.logService.trace(`[CrashReportingService] Report ${pending.report.id} submitted successfully`);
				} else {
					// Increment retry count
					const idx = this._pendingReports.findIndex(p => p.report.id === pending.report.id);
					if (idx !== -1) {
						const updated: PendingCrashReport = {
							...this._pendingReports[idx],
							retryCount: this._pendingReports[idx].retryCount + 1,
							lastAttempt: Date.now(),
						};
						this._pendingReports[idx] = updated;

						// Remove if max retries exceeded
						if (updated.retryCount >= MAX_RETRY_ATTEMPTS) {
							this._pendingReports.splice(idx, 1);
							this.logService.warn(`[CrashReportingService] Report ${pending.report.id} exceeded max retries, dropping`);
						}
					}
				}
			}

			// Persist the updated pending list
			this._savePendingReports();

			// Prune stale rate-limit timestamps
			this._pruneSubmissionTimestamps();
		} catch (flushError) {
			this.logService.error('[CrashReportingService] Flush error:', flushError);
		} finally {
			this._flushInProgress = false;
		}
	}

	getPendingCount(): number {
		return this._pendingReports.length;
	}

	// ─── Report Building ─────────────────────────────────────────────────────

	private _buildReport(type: 'exception' | 'message', message: string, stack?: string, context?: CrashContext): CrashReport {
		const scrubbedMessage = this._scrubPII(message);
		const scrubbedStack = stack ? this._scrubStack(stack) : undefined;
		const scrubbedContext = context ? this._scrubPIIFromObject(context) as CrashContext : {};

		return {
			id: generateUuid(),
			timestamp: Date.now(),
			type,
			level: CrashLevel.Error,
			message: scrubbedMessage,
			stack: scrubbedStack,
			context: scrubbedContext,
			breadcrumbs: [...this._breadcrumbs],
			systemInfo: this._collectSystemInfo(),
			userAgent: this._getUserAgent(),
		};
	}

	/**
	 * Truncate and scrub a stack trace to MAX_STACK_FRAMES frames.
	 */
	private _scrubStack(stack: string): string {
		const scrubbed = this._scrubPII(stack);
		const frames = scrubbed.split('\n');
		if (frames.length > MAX_STACK_FRAMES) {
			return frames.slice(0, MAX_STACK_FRAMES).join('\n') + `\n  ... ${frames.length - MAX_STACK_FRAMES} more frames`;
		}
		return scrubbed;
	}

	// ─── PII Scrubbing ───────────────────────────────────────────────────────

	/**
	 * Scrub PII from a string value using all registered patterns.
	 */
	private _scrubPII(value: string): string {
		let result = value;
		for (const { pattern, replacement } of PII_PATTERNS) {
			// Reset regex state for global patterns
			pattern.lastIndex = 0;
			result = result.replace(pattern, replacement);
		}
		return result;
	}

	/**
	 * Recursively scrub PII from an object's string values.
	 * Preserves structure; only mutates string primitives.
	 */
	private _scrubPIIFromObject(obj: Record<string, unknown>): Record<string, unknown> {
		const result: Record<string, unknown> = {};
		for (const [key, value] of Object.entries(obj)) {
			if (typeof value === 'string') {
				result[key] = this._scrubPII(value);
			} else if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
				result[key] = this._scrubPIIFromObject(value as Record<string, unknown>);
			} else if (Array.isArray(value)) {
				result[key] = value.map(item => {
					if (typeof item === 'string') {
						return this._scrubPII(item);
					} else if (item !== null && typeof item === 'object') {
						return this._scrubPIIFromObject(item as Record<string, unknown>);
					}
					return item;
				});
			} else {
				result[key] = value;
			}
		}
		return result;
	}

	// ─── System Info Collection ──────────────────────────────────────────────

	private _collectSystemInfo(): SystemInfo {
		let memoryUsage = 0;
		let cpuUsage = 0;

		try {
			if (typeof performance !== 'undefined' && (performance as any).memory) {
				memoryUsage = (performance as any).memory.usedJSHeapSize / (1024 * 1024); // MB
			}
			if (typeof process !== 'undefined' && process.cpuUsage) {
				cpuUsage = process.cpuUsage().user / 1_000_000; // seconds
			}
		} catch {
			// Silently ignore — not all environments expose these
		}

		let platform = 'unknown';
		let arch = 'unknown';
		let nodeVersion = 'unknown';
		let electronVersion = 'unknown';

		try {
			if (typeof navigator !== 'undefined') {
				platform = navigator.platform || 'unknown';
			}
			if (typeof process !== 'undefined') {
				platform = process.platform || platform;
				arch = process.arch || arch;
				nodeVersion = process.version || nodeVersion;
				electronVersion = (process.versions as any)?.electron || electronVersion;
			}
		} catch {
			// Silently ignore
		}

		return {
			platform,
			arch,
			version: this.environmentService.isBuilt ? (this.environmentService.appRoot ? '1.121.0' : 'dev') : 'dev',
			electronVersion,
			nodeVersion,
			memoryUsage: Math.round(memoryUsage * 100) / 100,
			cpuUsage: Math.round(cpuUsage * 100) / 100,
		};
	}

	private _getUserAgent(): string {
		const parts = [`${PRODUCT_ID}/1.121.0`];

		try {
			if (typeof navigator !== 'undefined') {
				parts.push(navigator.userAgent);
			}
			if (typeof process !== 'undefined') {
				parts.push(`Electron/${process.versions?.electron ?? 'unknown'}`);
				parts.push(`Node/${process.version ?? 'unknown'}`);
			}
		} catch {
			// Silently ignore
		}

		if (isWeb) {
			parts.push('web');
		}

		return parts.join(' ');
	}

	// ─── Report Queue ────────────────────────────────────────────────────────

	private _enqueueReport(report: CrashReport): void {
		// Fire capture event (always, even without consent — for local listeners)
		this._onDidCaptureReport.fire(report);

		const pending: PendingCrashReport = {
			report,
			retryCount: 0,
		};

		this._pendingReports.push(pending);

		// Enforce max pending reports (drop oldest)
		if (this._pendingReports.length > MAX_PENDING_REPORTS) {
			this._pendingReports = this._pendingReports.slice(-MAX_PENDING_REPORTS);
		}

		// Persist to storage
		this._savePendingReports();

		// Attempt immediate submission if consent given
		if (this._consent) {
			this.flush();
		}
	}

	// ─── Rate Limiting ───────────────────────────────────────────────────────

	private _checkRateLimit(): boolean {
		const now = Date.now();
		this._pruneSubmissionTimestamps();

		const submissionsInLastMinute = this._submissionTimestamps.filter(
			ts => now - ts < RATE_WINDOW_MINUTE
		).length;

		const submissionsInLastHour = this._submissionTimestamps.filter(
			ts => now - ts < RATE_WINDOW_HOUR
		).length;

		return submissionsInLastMinute < MAX_SUBMISSIONS_PER_MINUTE
			&& submissionsInLastHour < MAX_SUBMISSIONS_PER_HOUR;
	}

	private _pruneSubmissionTimestamps(): void {
		const cutoff = Date.now() - RATE_WINDOW_HOUR;
		this._submissionTimestamps = this._submissionTimestamps.filter(ts => ts > cutoff);
	}

	// ─── Network Submission ──────────────────────────────────────────────────

	private async _submitReport(report: CrashReport): Promise<CrashSubmissionResult> {
		try {
			// Check if we're online
			if (typeof navigator !== 'undefined' && !navigator.onLine) {
				return { accepted: false, error: 'offline' };
			}

			const payload = {
				appName: PRODUCT_APP_NAME,
				productId: PRODUCT_ID,
				report,
			};

			const controller = new AbortController();
			const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

			const response = await fetch(CRASH_ENDPOINT, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'X-Crash-Reporter': `${PRODUCT_ID}/1.0`,
				},
				body: JSON.stringify(payload),
				signal: controller.signal,
			});

			clearTimeout(timeoutId);

			if (response.ok) {
				const body = await response.json().catch(() => ({}));
				return { accepted: true, reportId: body.id };
			}

			// Server rejected the report
			const errorText = await response.text().catch(() => 'unknown');
			return {
				accepted: false,
				error: `HTTP ${response.status}: ${errorText.substring(0, 200)}`,
			};
		} catch (error) {
			if (error instanceof DOMException && error.name === 'AbortError') {
				return { accepted: false, error: 'timeout' };
			}
			return { accepted: false, error: error instanceof Error ? error.message : String(error) };
		}
	}

	// ─── Storage Persistence ─────────────────────────────────────────────────

	private _loadPendingReports(): void {
		try {
			const stored = this.storageService.get(STORAGE_KEY_PENDING, StorageScope.APPLICATION, '[]');
			const parsed = JSON.parse(stored) as PendingCrashReport[];
			if (Array.isArray(parsed)) {
				this._pendingReports = parsed.slice(0, MAX_PENDING_REPORTS);
			}
		} catch (error) {
			this.logService.warn('[CrashReportingService] Failed to load pending reports from storage:', error);
			this._pendingReports = [];
		}
	}

	private _savePendingReports(): void {
		try {
			const serialized = JSON.stringify(this._pendingReports);
			this.storageService.store(STORAGE_KEY_PENDING, serialized, StorageScope.APPLICATION, StorageTarget.MACHINE);
		} catch (error) {
			this.logService.warn('[CrashReportingService] Failed to save pending reports to storage:', error);
		}
	}

	// ─── Global Error Handlers ───────────────────────────────────────────────

	private _installGlobalHandlers(): void {
		if (this._handlersInstalled) {
			return;
		}
		this._handlersInstalled = true;

		// Capture unhandled exceptions
		if (typeof window !== 'undefined') {
			this._register(Event.fromDOMEventEmitter<ErrorEvent>(window, 'error')((event: ErrorEvent) => {
				const error = event.error instanceof Error ? event.error : new Error(event.message);
				this.captureException(error, {
					component: 'global',
					action: 'unhandled-exception',
					filename: event.filename,
					lineno: event.lineno,
					colno: event.colno,
				});
			}));

			// Capture unhandled promise rejections
			this._register(Event.fromDOMEventEmitter<PromiseRejectionEvent>(window, 'unhandledrejection')((event: PromiseRejectionEvent) => {
				const error = event.reason instanceof Error
					? event.reason
					: new Error(typeof event.reason === 'string' ? event.reason : 'Unhandled promise rejection');
				this.captureException(error, {
					component: 'global',
					action: 'unhandled-rejection',
				});
			}));
		}

		// Node.js process-level handlers (Electron main/renderer)
		if (typeof process !== 'undefined' && process.listeners) {
			const uncaughtExceptionHandler = (error: Error) => {
				this.captureException(error, {
					component: 'process',
					action: 'uncaught-exception',
				});
			};

			const unhandledRejectionHandler = (reason: unknown) => {
				const error = reason instanceof Error
					? reason
					: new Error(typeof reason === 'string' ? reason : 'Unhandled process rejection');
				this.captureException(error, {
					component: 'process',
					action: 'unhandled-rejection',
				});
			};

			process.on('uncaughtException', uncaughtExceptionHandler);
			process.on('unhandledRejection', unhandledRejectionHandler);

			this._register({
				dispose: () => {
					process.off('uncaughtException', uncaughtExceptionHandler);
					process.off('unhandledRejection', unhandledRejectionHandler);
				}
			});
		}

		this.logService.trace('[CrashReportingService] Global error handlers installed');
	}

	// ─── Lifecycle ───────────────────────────────────────────────────────────

	override dispose(): void {
		// Attempt to flush any remaining reports before disposal
		if (this._consent && this._pendingReports.length > 0) {
			// Synchronous best-effort: persist to storage for next session
			this._savePendingReports();
		}

		this._breadcrumbs = [];
		this._pendingReports = [];
		this._submissionTimestamps = [];

		super.dispose();
		this.logService.trace('[CrashReportingService] Disposed');
	}
}
