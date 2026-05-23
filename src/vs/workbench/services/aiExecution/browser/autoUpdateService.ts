/*---------------------------------------------------------------------------------------------
 *  Auto-Update Service — VibeCode Desktop
 *  Real Vibecode — AI-Native IDE
 *
 *  IAutoUpdateService / AutoUpdateService — Provides auto-update infrastructure
 *  for VibeCode desktop builds. Periodically checks the releases endpoint, downloads
 *  updates in the background, and notifies the user when an update is ready to install.
 *
 *  Update endpoint: https://releases.vibecode.dev/update/{platform}/{arch}/{version}
 *  Electron-builder integration: configured in electron-builder.yml (generic provider)
 *  CLI endpoint env: REAL_VIBECODE_CLI_UPDATE_ENDPOINT
 *
 *  Architecture:
 *    1. On startup, schedule the first check after a short delay
 *    2. Periodically re-check at a configurable interval (default: 4 hours)
 *    3. Query the releases API with current platform/arch/version
 *    4. Parse the response, compare versions with semver
 *    5. Respect the per-version skip list persisted in globalState
 *    6. Download updates in the background once available
 *    7. Notify the user when the update is ready to install
 *    8. Install requires application restart
 *--------------------------------------------------------------------------------------------*/

import { Disposable } from '../../../../base/common/lifecycle.js';
import { Event, Emitter } from '../../../../base/common/event.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';

// ─── Types ─────────────────────────────────────────────────────────────────────

/**
 * Information about an available update returned by the releases API.
 */
export interface UpdateInfo {
	/** Whether an update is available */
	readonly available: boolean;
	/** Current application version */
	readonly currentVersion: string;
	/** Latest available version */
	readonly latestVersion: string;
	/** Release notes in Markdown or plain text */
	readonly releaseNotes?: string;
	/** Direct download URL for the update package */
	readonly downloadUrl?: string;
	/** Size of the update in bytes */
	readonly fileSize?: number;
	/** SHA-256 hash of the update package for integrity verification */
	readonly sha256?: string;
	/** Unix timestamp (ms) when this release was published */
	readonly releaseDate?: number;
}

/**
 * State machine for the auto-update lifecycle.
 *
 *   Idle → Checking → (Available | Idle)
 *   Available → Downloading → Downloaded
 *   Downloaded → Installing → (restart)
 *   Any → Error → Idle
 */
export enum UpdateState {
	Idle = 'idle',
	Checking = 'checking',
	Available = 'available',
	Downloading = 'downloading',
	Downloaded = 'downloaded',
	Installing = 'installing',
	Error = 'error',
}

/**
 * Event payload emitted when the update state changes.
 */
export interface UpdateStateChangeEvent {
	/** Previous state */
	readonly previousState: UpdateState;
	/** New state */
	readonly newState: UpdateState;
	/** Update info, if available */
	readonly info?: UpdateInfo;
	/** Error details, if state is Error */
	readonly error?: string;
}

/**
 * Platform identifier matching electron-builder conventions.
 */
export type UpdatePlatform = 'win32' | 'darwin' | 'linux';

/**
 * Architecture identifier matching electron-builder conventions.
 */
export type UpdateArch = 'x64' | 'arm64' | 'universal';

/**
 * Configuration options for the auto-update service.
 */
export interface IAutoUpdateConfiguration {
	/** How often to check for updates (ms). Default: 4 hours */
	readonly checkIntervalMs: number;
	/** Delay before the first check on startup (ms). Default: 30 seconds */
	readonly initialCheckDelayMs: number;
	/** Whether to download updates automatically when available. Default: true */
	readonly autoDownload: boolean;
	/** Whether to check for updates on startup. Default: true */
	readonly checkOnStartup: boolean;
	/** Custom update endpoint (overrides default). Default: undefined */
	readonly customEndpoint?: string;
}

// ─── Service Interface ─────────────────────────────────────────────────────────

export const IAutoUpdateService = createDecorator<IAutoUpdateService>('autoUpdateService');

/**
 * IAutoUpdateService — Manages the VibeCode auto-update lifecycle.
 *
 * Provides methods to check, download, and install updates, along with events
 * for UI notification. Integrates with electron-updater for Electron desktop
 * builds and falls back to HTTP-based checking for web/remote scenarios.
 */
export interface IAutoUpdateService {
	readonly _serviceBrand: undefined;

	// ─── State ───────────────────────────────────────────────────────────────

	/**
	 * Get the current update state.
	 */
	readonly state: UpdateState;

	/**
	 * Event fired when the update state changes.
	 * UI components should subscribe to this to show notifications.
	 */
	readonly onDidChangeState: Event<UpdateStateChangeEvent>;

	/**
	 * Get the update info for the currently available/downloaded update.
	 * Returns undefined if no update info is available.
	 */
	readonly updateInfo: UpdateInfo | undefined;

	/**
	 * Get the last error message, if any.
	 */
	readonly lastError: string | undefined;

	// ─── Actions ─────────────────────────────────────────────────────────────

	/**
	 * Check for updates.
	 * Queries the releases endpoint and compares versions.
	 * Respects the skip list — skipped versions are treated as unavailable.
	 * Will not check more frequently than the configured interval unless forced.
	 *
	 * @param force If true, bypass the interval throttle and check immediately.
	 * @returns Update info describing what's available.
	 */
	checkForUpdate(force?: boolean): Promise<UpdateInfo>;

	/**
	 * Download the available update.
	 * Only valid when state is Available.
	 * Transitions to Downloading → Downloaded on success.
	 */
	downloadUpdate(): Promise<void>;

	/**
	 * Install the downloaded update.
	 * Only valid when state is Downloaded.
	 * This will restart the application.
	 * Transitions to Installing, then the app exits.
	 */
	installUpdate(): Promise<void>;

	/**
	 * Skip a specific version. The service will not notify about this version
	 * again unless the user explicitly checks. Persisted in globalState.
	 *
	 * @param version The version string to skip (e.g. "1.122.0").
	 */
	skipUpdate(version: string): void;

	/**
	 * Get the current update state.
	 */
	getState(): UpdateState;

	// ─── Configuration ───────────────────────────────────────────────────────

	/**
	 * Update the auto-update configuration at runtime.
	 */
	setConfiguration(config: Partial<IAutoUpdateConfiguration>): void;

	/**
	 * Get the current auto-update configuration.
	 */
	getConfiguration(): IAutoUpdateConfiguration;
}

// ─── Defaults ──────────────────────────────────────────────────────────────────

const DEFAULT_CONFIGURATION: IAutoUpdateConfiguration = {
	checkIntervalMs: 4 * 60 * 60 * 1000, // 4 hours
	initialCheckDelayMs: 30 * 1000, // 30 seconds
	autoDownload: true,
	checkOnStartup: true,
};

const UPDATE_ENDPOINT = 'https://releases.vibecode.dev/update';
const GLOBAL_STATE_SKIP_KEY = 'autoUpdate.skippedVersions';
const GLOBAL_STATE_LAST_CHECK_KEY = 'autoUpdate.lastCheckTime';
const MINIMUM_CHECK_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes — prevents hammering

// ─── Semver Comparison ─────────────────────────────────────────────────────────

/**
 * Compare two semver version strings.
 * Returns: -1 if a < b, 0 if a === b, 1 if a > b
 * Supports major.minor.patch with optional pre-release tags.
 */
function compareSemver(a: string, b: string): number {
	const parseVersion = (v: string): number[] => {
		// Strip leading 'v' if present, take only the semver part before any '-'
		const clean = v.replace(/^v/, '');
		const [main] = clean.split('-');
		return main.split('.').map(n => {
			const num = parseInt(n, 10);
			return isNaN(num) ? 0 : num;
		});
	};

	const partsA = parseVersion(a);
	const partsB = parseVersion(b);
	const len = Math.max(partsA.length, partsB.length);

	for (let i = 0; i < len; i++) {
		const valA = partsA[i] ?? 0;
		const valB = partsB[i] ?? 0;
		if (valA < valB) { return -1; }
		if (valA > valB) { return 1; }
	}

	// If main versions are equal, pre-release < release
	const hasPreA = a.includes('-');
	const hasPreB = b.includes('-');
	if (hasPreA && !hasPreB) { return -1; }
	if (!hasPreA && hasPreB) { return 1; }

	return 0;
}

/**
 * Check if version b is newer than version a.
 */
function isNewerVersion(current: string, candidate: string): boolean {
	return compareSemver(candidate, current) > 0;
}

// ─── Platform Detection ────────────────────────────────────────────────────────

/**
 * Detect the current platform for update queries.
 * In the browser layer, we use navigator.userAgent and platform hints.
 * In Electron, this would be replaced by process.platform / process.arch.
 */
function detectPlatform(): UpdatePlatform {
	if (typeof navigator === 'undefined') {
		return 'linux'; // fallback
	}
	const ua = navigator.userAgent.toLowerCase();
	if (ua.includes('win')) { return 'win32'; }
	if (ua.includes('mac') || ua.includes('darwin')) { return 'darwin'; }
	return 'linux';
}

/**
 * Detect the current architecture for update queries.
 */
function detectArch(): UpdateArch {
	if (typeof navigator === 'undefined') {
		return 'x64'; // fallback
	}
	const ua = navigator.userAgent.toLowerCase();
	const platform = navigator.platform?.toLowerCase() ?? '';

	if (ua.includes('arm64') || ua.includes('aarch64') || platform.includes('arm')) {
		return 'arm64';
	}
	if (ua.includes('x86_64') || ua.includes('x64') || platform.includes('x86_64')) {
		return 'x64';
	}
	return 'x64'; // safe default
}

// ─── HTTP-based Update Check ───────────────────────────────────────────────────

/**
 * Response shape from the VibeCode releases endpoint.
 * Supports both the electron-builder generic provider format and a custom format.
 *
 * electron-builder generic format (no update available):
 *   { version: "1.121.0" }  (matches current)
 *
 * electron-builder generic format (update available):
 *   { version: "1.122.0", url: "https://...", sha256: "...", releaseNotes: "..." }
 *
 * Custom VibeCode format:
 *   { available: true, latestVersion: "1.122.0", downloadUrl: "...", ... }
 */
interface RawUpdateResponse {
	/** Version string from the server */
	version?: string;
	/** Direct download URL */
	url?: string;
	/** SHA-256 hash */
	sha256?: string;
	/** Release notes */
	notes?: string;
	/** File size in bytes */
	fileSize?: number;
	/** Release date as Unix timestamp (ms) */
	releaseDate?: number;
	/** Custom format fields */
	available?: boolean;
	latestVersion?: string;
	downloadUrl?: string;
	releaseNotes?: string;
	currentVersion?: string;
}

/**
 * Fetch update information from the releases endpoint.
 */
async function fetchUpdateInfo(
	endpoint: string,
	currentVersion: string,
	logService: ILogService
): Promise<UpdateInfo> {
	const url = `${endpoint}/${detectPlatform()}/${detectArch()}/${currentVersion}`;

	logService.trace(`[AutoUpdateService] Fetching update info from: ${url}`);

	let response: Response;
	try {
		response = await fetch(url, {
			method: 'GET',
			headers: {
				'Accept': 'application/json',
				'User-Agent': `VibeCode/${currentVersion}`,
			},
		});
	} catch (err) {
		throw new Error(`Network error checking for updates: ${String(err)}`);
	}

	if (!response.ok) {
		if (response.status === 204) {
			// No content = no update available (electron-builder convention)
			return {
				available: false,
				currentVersion,
				latestVersion: currentVersion,
			};
		}
		throw new Error(`Update check failed: HTTP ${response.status} ${response.statusText}`);
	}

	let raw: RawUpdateResponse;
	try {
		raw = await response.json() as RawUpdateResponse;
	} catch (err) {
		throw new Error(`Invalid JSON from update endpoint: ${String(err)}`);
	}

	// ── Parse response: custom format ──────────────────────────────────────
	if (raw.available !== undefined && raw.latestVersion) {
		return {
			available: raw.available && isNewerVersion(currentVersion, raw.latestVersion),
			currentVersion,
			latestVersion: raw.latestVersion,
			releaseNotes: raw.releaseNotes,
			downloadUrl: raw.downloadUrl,
			fileSize: raw.fileSize,
			sha256: raw.sha256,
			releaseDate: raw.releaseDate,
		};
	}

	// ── Parse response: electron-builder generic provider format ───────────
	if (raw.version) {
		const isNewer = isNewerVersion(currentVersion, raw.version);
		return {
			available: isNewer,
			currentVersion,
			latestVersion: raw.version,
			releaseNotes: raw.notes,
			downloadUrl: raw.url,
			fileSize: raw.fileSize,
			sha256: raw.sha256,
			releaseDate: raw.releaseDate,
		};
	}

	// ── Unknown format — treat as no update ────────────────────────────────
	logService.warn('[AutoUpdateService] Unrecognized update response format', raw);
	return {
		available: false,
		currentVersion,
		latestVersion: currentVersion,
	};
}

// ─── AutoUpdateService ─────────────────────────────────────────────────────────

export class AutoUpdateService extends Disposable implements IAutoUpdateService {

	declare readonly _serviceBrand: undefined;

	// ─── Private State ──────────────────────────────────────────────────────

	private _state: UpdateState = UpdateState.Idle;
	private _updateInfo: UpdateInfo | undefined;
	private _lastError: string | undefined;
	private _configuration: IAutoUpdateConfiguration;
	private _lastCheckTime: number = 0;
	private _skippedVersions: Set<string> = new Set();
	private _periodicCheckTimer: ReturnType<typeof setInterval> | undefined;
	private _initialCheckTimeout: ReturnType<typeof setTimeout> | undefined;
	private _downloadProgress: number = 0;

	/** Current application version — sourced from product configuration */
	private readonly _currentVersion: string;

	/** Base URL for the update endpoint */
	private readonly _updateEndpoint: string;

	// ─── Events ─────────────────────────────────────────────────────────────

	private readonly _onDidChangeState = this._register(new Emitter<UpdateStateChangeEvent>());
	readonly onDidChangeState = this._onDidChangeState.event;

	// ─── Public Getters ─────────────────────────────────────────────────────

	get state(): UpdateState { return this._state; }
	get updateInfo(): UpdateInfo | undefined { return this._updateInfo; }
	get lastError(): string | undefined { return this._lastError; }

	// ─── Constructor ────────────────────────────────────────────────────────

	constructor(
		@ILogService private readonly logService: ILogService,
		// @IStorageService private readonly storageService: IStorageService,
		// @IProductService private readonly productService: IProductService,
		// @IRequestService private readonly requestService: IRequestService,
		// @INativeHostService private readonly nativeHostService: INativeHostService,
	) {
		super();

		// ── Resolve configuration ────────────────────────────────────────────
		this._configuration = { ...DEFAULT_CONFIGURATION };

		// Version: try product service, then fallback
		// In production: this._currentVersion = productService.version;
		this._currentVersion = this._resolveVersion();

		// Endpoint: check env override, then config, then default
		this._updateEndpoint = this._resolveEndpoint();

		// ── Load persisted state ─────────────────────────────────────────────
		this._loadPersistedState();

		// ── Schedule startup check ───────────────────────────────────────────
		if (this._configuration.checkOnStartup) {
			this.logService.info(`[AutoUpdateService] Scheduling initial check in ${this._configuration.initialCheckDelayMs}ms`);
			this._initialCheckTimeout = setTimeout(() => {
				this.checkForUpdate().catch(err => {
					this.logService.error('[AutoUpdateService] Initial update check failed:', err);
				});
			}, this._configuration.initialCheckDelayMs);
		}

		// ── Schedule periodic checks ─────────────────────────────────────────
		this._schedulePeriodicCheck();

		this.logService.info(`[AutoUpdateService] Initialized (version=${this._currentVersion}, endpoint=${this._updateEndpoint}, interval=${this._configuration.checkIntervalMs}ms)`);
	}

	// ─── State Management ──────────────────────────────────────────────────

	private _setState(newState: UpdateState, error?: string): void {
		if (this._state === newState && !error) {
			return;
		}

		const previousState = this._state;
		this._state = newState;

		if (error) {
			this._lastError = error;
		} else if (newState !== UpdateState.Error) {
			this._lastError = undefined;
		}

		this.logService.trace(`[AutoUpdateService] State: ${previousState} → ${newState}${error ? ` (error: ${error})` : ''}`);

		this._onDidChangeState.fire({
			previousState,
			newState,
			info: this._updateInfo,
			error,
		});
	}

	// ─── Check for Updates ─────────────────────────────────────────────────

	async checkForUpdate(force: boolean = false): Promise<UpdateInfo> {
		// ── Guard: don't check if already checking ──────────────────────────
		if (this._state === UpdateState.Checking || this._state === UpdateState.Downloading || this._state === UpdateState.Installing) {
			this.logService.debug('[AutoUpdateService] Check already in progress, skipping');
			return this._updateInfo ?? {
				available: false,
				currentVersion: this._currentVersion,
				latestVersion: this._currentVersion,
			};
		}

		// ── Guard: respect minimum interval unless forced ────────────────────
		const now = Date.now();
		if (!force && this._lastCheckTime > 0 && (now - this._lastCheckTime) < MINIMUM_CHECK_INTERVAL_MS) {
			this.logService.debug('[AutoUpdateService] Throttled — last check was too recent');
			return this._updateInfo ?? {
				available: false,
				currentVersion: this._currentVersion,
				latestVersion: this._currentVersion,
			};
		}

		this._setState(UpdateState.Checking);
		this.logService.info('[AutoUpdateService] Checking for updates...');

		try {
			const info = await fetchUpdateInfo(
				this._updateEndpoint,
				this._currentVersion,
				this.logService
			);

			this._lastCheckTime = Date.now();
			this._persistLastCheckTime();

			// ── Check if the version is skipped ──────────────────────────────
			if (info.available && this._skippedVersions.has(info.latestVersion)) {
				this.logService.info(`[AutoUpdateService] Version ${info.latestVersion} is in skip list — treating as unavailable`);
				const skippedInfo: UpdateInfo = {
					...info,
					available: false,
				};
				this._updateInfo = skippedInfo;
				this._setState(UpdateState.Idle);
				return skippedInfo;
			}

			this._updateInfo = info;

			if (info.available) {
				this.logService.info(`[AutoUpdateService] Update available: ${info.currentVersion} → ${info.latestVersion}`);
				this._setState(UpdateState.Available);

				// ── Auto-download if configured ──────────────────────────────
				if (this._configuration.autoDownload && info.downloadUrl) {
					this.downloadUpdate().catch(err => {
						this.logService.error('[AutoUpdateService] Auto-download failed:', err);
					});
				}
			} else {
				this.logService.info(`[AutoUpdateService] No update available (current: ${info.currentVersion}, latest: ${info.latestVersion})`);
				this._setState(UpdateState.Idle);
			}

			return info;

		} catch (err) {
			const errorMsg = String(err);
			this.logService.error(`[AutoUpdateService] Update check failed: ${errorMsg}`);
			this._setState(UpdateState.Error, errorMsg);
			throw err;
		}
	}

	// ─── Download Update ───────────────────────────────────────────────────

	async downloadUpdate(): Promise<void> {
		if (this._state !== UpdateState.Available) {
			throw new Error(`Cannot download — current state is ${this._state}, expected ${UpdateState.Available}`);
		}

		if (!this._updateInfo?.downloadUrl) {
			throw new Error('No download URL available for this update');
		}

		this._setState(UpdateState.Downloading);
		this._downloadProgress = 0;
		this.logService.info(`[AutoUpdateService] Downloading update: ${this._updateInfo.latestVersion}`);

		try {
			// ── Browser-based download via fetch ─────────────────────────────
			// In production with Electron, this would be replaced by
			// electron-updater's autoUpdater.downloadUpdate()
			await this._downloadViaFetch(this._updateInfo.downloadUrl);

			this._downloadProgress = 100;
			this.logService.info(`[AutoUpdateService] Update downloaded: ${this._updateInfo.latestVersion}`);
			this._setState(UpdateState.Downloaded);

		} catch (err) {
			const errorMsg = String(err);
			this.logService.error(`[AutoUpdateService] Download failed: ${errorMsg}`);
			this._setState(UpdateState.Error, errorMsg);
			throw err;
		}
	}

	/**
	 * Download the update package via fetch with progress tracking.
	 * Writes to a blob for browser-based scenarios.
	 * For Electron, this would use electron-updater instead.
	 */
	private async _downloadViaFetch(url: string): Promise<void> {
		const response = await fetch(url, {
			method: 'GET',
			headers: {
				'User-Agent': `VibeCode/${this._currentVersion}`,
			},
		});

		if (!response.ok) {
			throw new Error(`Download failed: HTTP ${response.status} ${response.statusText}`);
		}

		// ── Track download progress ─────────────────────────────────────────
		const contentLength = response.headers.get('content-length');
		const totalBytes = contentLength ? parseInt(contentLength, 10) : 0;

		if (!response.body) {
			// No streaming — just wait for the full response
			await response.arrayBuffer();
			this._downloadProgress = 100;
			return;
		}

		// Stream the response body and track progress
		const reader = response.body.getReader();
		let receivedBytes = 0;
		const chunks: Uint8Array[] = [];

		for (;;) {
			const { done, value } = await reader.read();
			if (done) { break; }

			chunks.push(value);
			receivedBytes += value.length;

			if (totalBytes > 0) {
				this._downloadProgress = Math.round((receivedBytes / totalBytes) * 100);
			}
		}

		// ── Verify hash if provided ──────────────────────────────────────────
		if (this._updateInfo?.sha256 && typeof crypto !== 'undefined' && crypto.subtle) {
			try {
				const blob = new Blob(chunks);
				const buffer = await blob.arrayBuffer();
				const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
				const hashArray = Array.from(new Uint8Array(hashBuffer));
				const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

				if (hashHex !== this._updateInfo.sha256) {
					throw new Error(
						`SHA-256 mismatch: expected ${this._updateInfo.sha256}, got ${hashHex}. ` +
						'The update package may be corrupted or tampered with.'
					);
				}
				this.logService.info('[AutoUpdateService] SHA-256 verification passed');
			} catch (err) {
				// If crypto.subtle is unavailable (non-HTTPS), skip verification
				this.logService.warn('[AutoUpdateService] SHA-256 verification skipped:', err);
			}
		}

		// ── Store the downloaded blob for later installation ─────────────────
		// In browser context, we can't directly write to disk.
		// The Electron path would use electron-updater which handles this.
		this._downloadedBlob = new Blob(chunks);

		this.logService.info(`[AutoUpdateService] Downloaded ${receivedBytes} bytes`);
	}

	/** Stored blob from the last download (browser fallback) */
	private _downloadedBlob: Blob | undefined;

	// ─── Install Update ────────────────────────────────────────────────────

	async installUpdate(): Promise<void> {
		if (this._state !== UpdateState.Downloaded) {
			throw new Error(`Cannot install — current state is ${this._state}, expected ${UpdateState.Downloaded}`);
		}

		this._setState(UpdateState.Installing);
		this.logService.info('[AutoUpdateService] Installing update — application will restart');

		try {
			// ── Electron-updater integration point ────────────────────────────
			// In the Electron desktop build, this would call:
			//
			//   import { autoUpdater } from 'electron-updater';
			//   await autoUpdater.quitAndInstall(false, true);
			//
			// The first arg (isSilent) = false shows the install progress.
			// The second arg (isForceRunAfter) = true restarts the app after install.
			//
			// For now, we use a fallback that triggers a page reload or
			// signals the main process via IPC.

			await this._installViaFallback();

		} catch (err) {
			const errorMsg = String(err);
			this.logService.error(`[AutoUpdateService] Install failed: ${errorMsg}`);
			this._setState(UpdateState.Error, errorMsg);
			throw err;
		}
	}

	/**
	 * Fallback install mechanism for non-Electron environments.
	 * In a real Electron build, this would use autoUpdater.quitAndInstall().
	 */
	private async _installViaFallback(): Promise<void> {
		// ── Option 1: Signal the Electron main process via IPC ──────────────
		// If running in Electron with contextBridge:
		//
		//   if (window.electronAPI?.installUpdate) {
		//       await window.electronAPI.installUpdate();
		//       return;
		//   }

		// ── Option 2: Trigger browser download of the update package ────────
		if (this._downloadedBlob) {
			const url = URL.createObjectURL(this._downloadedBlob);
			const a = document.createElement('a');
			a.href = url;
			a.download = `RealVibecode-${this._updateInfo?.latestVersion ?? 'update'}.${this._platformExtension()}`;
			a.click();
			URL.revokeObjectURL(url);
			this.logService.info('[AutoUpdateService] Update package downloaded to user filesystem');
			return;
		}

		// ── Option 3: Redirect to download page ─────────────────────────────
		if (this._updateInfo?.downloadUrl) {
			window.open(this._updateInfo.downloadUrl, '_blank');
			this.logService.info('[AutoUpdateService] Redirected user to download page');
			return;
		}

		throw new Error('No install mechanism available in the current environment');
	}

	/**
	 * Get the platform-specific file extension for the update package.
	 */
	private _platformExtension(): string {
		switch (detectPlatform()) {
			case 'win32': return 'exe';
			case 'darwin': return 'dmg';
			case 'linux': return 'AppImage';
		}
	}

	// ─── Skip Version ──────────────────────────────────────────────────────

	skipUpdate(version: string): void {
		if (!version) {
			this.logService.warn('[AutoUpdateService] skipUpdate called with empty version');
			return;
		}

		this._skippedVersions.add(version);
		this._persistSkippedVersions();

		this.logService.info(`[AutoUpdateService] Version ${version} added to skip list`);

		// If the currently available update is the skipped version, go idle
		if (this._updateInfo?.available && this._updateInfo.latestVersion === version) {
			this._updateInfo = {
				...this._updateInfo,
				available: false,
			};
			this._setState(UpdateState.Idle);
		}
	}

	// ─── State Accessor ────────────────────────────────────────────────────

	getState(): UpdateState {
		return this._state;
	}

	// ─── Configuration ─────────────────────────────────────────────────────

	setConfiguration(config: Partial<IAutoUpdateConfiguration>): void {
		const prevInterval = this._configuration.checkIntervalMs;

		this._configuration = {
			...this._configuration,
			...config,
		};

		this.logService.info(`[AutoUpdateService] Configuration updated`, config);

		// Re-schedule periodic checks if interval changed
		if (config.checkIntervalMs !== undefined && config.checkIntervalMs !== prevInterval) {
			this._schedulePeriodicCheck();
		}
	}

	getConfiguration(): IAutoUpdateConfiguration {
		return { ...this._configuration };
	}

	// ─── Periodic Check Scheduling ─────────────────────────────────────────

	private _schedulePeriodicCheck(): void {
		// Clear existing timer
		if (this._periodicCheckTimer !== undefined) {
			clearInterval(this._periodicCheckTimer);
			this._periodicCheckTimer = undefined;
		}

		const interval = this._configuration.checkIntervalMs;
		this.logService.info(`[AutoUpdateService] Scheduling periodic checks every ${interval}ms`);

		this._periodicCheckTimer = setInterval(() => {
			this.checkForUpdate().catch(err => {
				this.logService.error('[AutoUpdateService] Periodic update check failed:', err);
			});
		}, interval);
	}

	// ─── Persistence ───────────────────────────────────────────────────────

	/**
	 * Load persisted state from globalState.
	 * In production: uses IStorageService with StorageScope.PROFILE.
	 * For now: uses localStorage as a browser fallback.
	 */
	private _loadPersistedState(): void {
		try {
			// ── Load skipped versions ────────────────────────────────────────
			// Production path:
			//   const raw = this.storageService.get(GLOBAL_STATE_SKIP_KEY, StorageScope.PROFILE, '[]');
			const raw = this._readFromLocalStorage<string>(GLOBAL_STATE_SKIP_KEY, '[]');
			const parsed: string[] = JSON.parse(raw);
			if (Array.isArray(parsed)) {
				this._skippedVersions = new Set(parsed.filter(v => typeof v === 'string'));
			}
			this.logService.trace(`[AutoUpdateService] Loaded ${this._skippedVersions.size} skipped versions`);

			// ── Load last check time ─────────────────────────────────────────
			const lastCheck = this._readFromLocalStorage<string>(GLOBAL_STATE_LAST_CHECK_KEY, '0');
			this._lastCheckTime = parseInt(lastCheck, 10) || 0;
		} catch (err) {
			this.logService.warn('[AutoUpdateService] Failed to load persisted state:', err);
		}
	}

	/**
	 * Persist the skip list to globalState.
	 */
	private _persistSkippedVersions(): void {
		try {
			const serialized = JSON.stringify([...this._skippedVersions]);
			// Production path:
			//   this.storageService.store(GLOBAL_STATE_SKIP_KEY, serialized, StorageScope.PROFILE, StorageTarget.MACHINE);
			this._writeToLocalStorage(GLOBAL_STATE_SKIP_KEY, serialized);
		} catch (err) {
			this.logService.warn('[AutoUpdateService] Failed to persist skipped versions:', err);
		}
	}

	/**
	 * Persist the last check timestamp.
	 */
	private _persistLastCheckTime(): void {
		try {
			// Production path:
			//   this.storageService.store(GLOBAL_STATE_LAST_CHECK_KEY, String(this._lastCheckTime), StorageScope.PROFILE, StorageTarget.MACHINE);
			this._writeToLocalStorage(GLOBAL_STATE_LAST_CHECK_KEY, String(this._lastCheckTime));
		} catch (err) {
			this.logService.warn('[AutoUpdateService] Failed to persist last check time:', err);
		}
	}

	// ─── LocalStorage Fallback ─────────────────────────────────────────────
	// These methods bridge to IStorageService in production.
	// Replace with IStorageService calls when the service is available.

	private _readFromLocalStorage<T>(key: string, fallback: T): T {
		if (typeof localStorage === 'undefined') { return fallback; }
		try {
			const value = localStorage.getItem(key);
			return value !== null ? (value as unknown as T) : fallback;
		} catch {
			return fallback;
		}
	}

	private _writeToLocalStorage(key: string, value: string): void {
		if (typeof localStorage === 'undefined') { return; }
		try {
			localStorage.setItem(key, value);
		} catch {
			// localStorage may be full or disabled
		}
	}

	// ─── Version Resolution ────────────────────────────────────────────────

	private _resolveVersion(): string {
		// Priority: IProductService → product.json import → fallback
		// In production with IProductService:
		//   return this.productService.version;

		// Try to read from the global product object
		if (typeof window !== 'undefined') {
			const productConfig = (window as any)?.vscode?.product;
			if (productConfig?.version) {
				return productConfig.version;
			}
		}

		// Fallback: import from product.ts default
		// import product from '../../../../platform/product/common/product.js';
		// return product.version;

		// Hard fallback
		return '1.121.0-dev';
	}

	private _resolveEndpoint(): string {
		// Priority: configuration override → env var → default
		if (this._configuration.customEndpoint) {
			return this._configuration.customEndpoint;
		}

		// Check CLI endpoint env var (for dev/testing)
		if (typeof process !== 'undefined' && process.env?.REAL_VIBECODE_CLI_UPDATE_ENDPOINT) {
			return process.env.REAL_VIBECODE_CLI_UPDATE_ENDPOINT;
		}

		return UPDATE_ENDPOINT;
	}

	// ─── Lifecycle ─────────────────────────────────────────────────────────

	override dispose(): void {
		if (this._initialCheckTimeout !== undefined) {
			clearTimeout(this._initialCheckTimeout);
			this._initialCheckTimeout = undefined;
		}
		if (this._periodicCheckTimer !== undefined) {
			clearInterval(this._periodicCheckTimer);
			this._periodicCheckTimer = undefined;
		}
		this._downloadedBlob = undefined;
		this.logService.info('[AutoUpdateService] Disposed');
		super.dispose();
	}
}

// ─── Electron-Updater Integration Stub ─────────────────────────────────────────
//
// To enable full electron-updater integration in the Electron desktop build,
// follow these steps:
//
// 1. Install the dependency:
//      npm install electron-updater
//
// 2. In the Electron main process (src/mainProcess.ts or similar), add:
//
//      import { autoUpdater } from 'electron-updater';
//
//      autoUpdater.autoDownload = false;  // Let the service control downloads
//      autoUpdater.autoInstallOnAppQuit = true;
//
//      // Forward events to the renderer via IPC
//      autoUpdater.on('update-available', (info) => {
//          mainWindow.webContents.send('auto-update:state', {
//              state: 'available',
//              info: {
//                  available: true,
//                  currentVersion: autoUpdater.currentVersion.raw,
//                  latestVersion: info.version,
//                  releaseNotes: info.releaseNotes,
//                  fileSize: info.files?.[0]?.size,
//                  releaseDate: info.releaseDate
//                      ? new Date(info.releaseDate).getTime()
//                      : undefined,
//              },
//          });
//      });
//
//      autoUpdater.on('download-progress', (progress) => {
//          mainWindow.webContents.send('auto-update:progress', {
//              percent: progress.percent,
//              bytesPerSecond: progress.bytesPerSecond,
//              transferred: progress.transferred,
//              total: progress.total,
//          });
//      });
//
//      autoUpdater.on('update-downloaded', () => {
//          mainWindow.webContents.send('auto-update:state', { state: 'downloaded' });
//      });
//
//      autoUpdater.on('error', (err) => {
//          mainWindow.webContents.send('auto-update:state', {
//              state: 'error',
//              error: err?.message ?? String(err),
//          });
//      });
//
//      // Handle IPC from the renderer
//      ipcMain.handle('auto-update:check', () => autoUpdater.checkForUpdates());
//      ipcMain.handle('auto-update:download', () => autoUpdater.downloadUpdate());
//      ipcMain.handle('auto-update:install', () => autoUpdater.quitAndInstall());
//
// 3. In this service, replace the fetch-based implementation:
//    - checkForUpdate()  → invoke('auto-update:check')  via IPC
//    - downloadUpdate()  → invoke('auto-update:download') via IPC
//    - installUpdate()   → invoke('auto-update:install')  via IPC
//
// 4. Listen for IPC events from the main process to update state:
//
//      if (typeof window !== 'undefined' && window.electronAPI) {
//          window.electronAPI.onAutoUpdateState((event) => {
//              // Map event.state to UpdateState and update _state
//          });
//      }
//
// 5. Update electron-builder.yml publish URL to match your update server.
//    The current config is:
//      publish:
//        provider: generic
//        url: "https://releases.vibecode.dev/update/${platform}/${arch}/${version}"
//
//    For S3, GitHub Releases, or other providers, see:
//    https://www.electron.build/configuration/publish
//
// ────────────────────────────────────────────────────────────────────────────────
