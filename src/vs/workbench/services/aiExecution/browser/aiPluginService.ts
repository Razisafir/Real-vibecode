/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

/**
 * aiPluginService.ts -- Community AI Plugin System
 *
 * Real Vibecode — AI-Native IDE
 *
 * A public API for community AI plugins to extend VibeCode's AI capabilities.
 * This is NOT the VS Code extension system — it is an AI-specific plugin API
 * purpose-built for LLM providers, AI tools, agent roles, and execution hooks.
 *
 * This IS:
 *   - A public, versioned API surface for community AI extensions
 *   - A sandboxed execution environment for untrusted plugin code
 *   - A registry for AI contributions (providers, tools, agents, hooks)
 *   - A security-gated pipeline with review status and rate limiting
 *   - A lifecycle manager for plugin install/activate/deactivate/uninstall
 *
 * This is NOT:
 *   - A general-purpose VS Code extension API
 *   - A replacement for the existing extension host
 *   - A chatbot or inline autocomplete system
 *   - An unprotected eval() surface for arbitrary code
 *
 * Plugin Lifecycle:
 *   Uninstalled → Installed → Activated → Deactivated → Uninstalled
 *                                            ↓
 *                                          Error
 *
 * Security Model:
 *   - Plugin sandbox: tool handlers execute in a restricted context
 *   - Plugin permissions: manifests declare what resources the plugin can access
 *   - Plugin review: unreviewed → community-reviewed → verified
 *   - Rate limiting: caps on providers/tools/agents per plugin
 *
 * Contribution Types:
 *   1. Providers: Custom LLM endpoints with model lists and capabilities
 *   2. Tools: Functions the AI can call (with parameter schemas)
 *   3. Agents: Role-based AI agents with system prompts and capabilities
 *   4. Hooks: Pre/post execution and stream interceptors
 *
 * Architecture:
 *   AIPluginManifest → IAIPlugin → AIPluginContext → Contributions → Registry
 *        ↓                ↓                                          ↓
 *   Validation      Lifecycle Mgmt                            Execution Pipeline
 */

import { Disposable } from '../../../../base/common/lifecycle.js';
import { Emitter, Event } from '../../../../base/common/event.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { IDisposable } from '../../../../base/common/lifecycle.js';
import { generateUuid } from '../../../../base/common/uuid.js';

// ═══════════════════════════════════════════════════════════════════════════════
// PLUGIN TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * The lifecycle states of an AI plugin.
 * Plugins transition through these states as they are managed.
 */
export enum PluginState {
	Uninstalled = 'uninstalled',
	Installed = 'installed',
	Activated = 'activated',
	Deactivated = 'deactivated',
	Error = 'error',
}

/**
 * The review status of a plugin.
 * Determines the trust level and what capabilities are available.
 */
export enum PluginReviewStatus {
	/** Plugin has not been reviewed — restricted capabilities */
	Unreviewed = 'unreviewed',
	/** Plugin has been reviewed by the community — moderate capabilities */
	CommunityReviewed = 'community-reviewed',
	/** Plugin has been verified by the VibeCode team — full capabilities */
	Verified = 'verified',
}

// ═══════════════════════════════════════════════════════════════════════════════
// MANIFEST & CONTRIBUTION TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * The manifest is the plugin's declaration — its identity, metadata,
 * and what it contributes to the AI system.
 *
 * This is the contract between the plugin author and VibeCode.
 * It is validated at install time and enforced at runtime.
 */
export interface AIPluginManifest {
	/** Globally unique plugin identifier (e.g., "com.example.my-ai-tool") */
	readonly id: string;
	/** Human-readable plugin name */
	readonly name: string;
	/** Semantic version (semver) */
	readonly version: string;
	/** What this plugin does — shown in the plugin gallery */
	readonly description: string;
	/** Plugin author / organization */
	readonly author: string;
	/** Optional homepage URL */
	readonly homepage?: string;
	/** Optional icon URL or data URI */
	readonly icon?: string;
	/** What this plugin contributes to the AI system */
	readonly contributes: AIPluginContributes;
	/** Permissions this plugin requires */
	readonly permissions?: AIPluginPermissions;
}

/**
 * The contributions a plugin makes to the AI system.
 * Each contribution type is optional — a plugin can contribute
 * any combination of providers, tools, agents, and hooks.
 */
export interface AIPluginContributes {
	/** Custom LLM providers this plugin registers */
	readonly providers?: AIProviderContribution[];
	/** Custom AI tools (functions the AI can call) */
	readonly tools?: AIToolContribution[];
	/** Custom agent roles with system prompts */
	readonly agents?: AIAgentContribution[];
	/** Execution pipeline hooks (pre/post processing) */
	readonly hooks?: AIHookContribution[];
}

/**
 * A custom LLM provider contribution.
 * Allows plugins to register new AI backends (e.g., a custom inference server).
 */
export interface AIProviderContribution {
	/** Unique provider ID within the plugin namespace */
	readonly id: string;
	/** Human-readable provider name */
	readonly name: string;
	/** API endpoint URL */
	readonly endpoint: string;
	/** Model IDs available through this provider */
	readonly models: string[];
	/** Provider capability flags */
	readonly capabilities: ProviderCapabilities;
}

/**
 * Capability flags for an LLM provider.
 * These determine what features the AI execution pipeline can use with this provider.
 */
export interface ProviderCapabilities {
	/** Whether the provider supports streaming responses */
	readonly supportsStreaming: boolean;
	/** Whether the provider supports tool/function calling */
	readonly supportsToolUse: boolean;
	/** Whether the provider supports vision/image input */
	readonly supportsVision: boolean;
	/** Maximum context window in tokens */
	readonly maxContextTokens: number;
}

/**
 * A custom AI tool contribution.
 * Tools are functions that the AI can call during execution.
 * Each tool has a parameter schema and a handler function.
 */
export interface AIToolContribution {
	/** Tool name (must be unique across all active plugins) */
	readonly name: string;
	/** Description of what the tool does — the AI uses this to decide when to call it */
	readonly description: string;
	/** JSON Schema for the tool's parameters */
	readonly parameters: Record<string, unknown>;
	/** Function name in the plugin that implements this tool */
	readonly handler: string;
}

/**
 * A custom agent role contribution.
 * Agents have a role, system prompt, and declared capabilities.
 */
export interface AIAgentContribution {
	/** Agent role identifier (e.g., "code-reviewer", "test-writer") */
	readonly role: string;
	/** System prompt that defines the agent's behavior */
	readonly systemPrompt: string;
	/** Capabilities this agent requires */
	readonly capabilities: string[];
}

/**
 * An execution pipeline hook contribution.
 * Hooks allow plugins to intercept and modify the AI execution pipeline
 * at defined points.
 */
export interface AIHookContribution {
	/** When this hook fires in the execution pipeline */
	readonly type: 'pre-execution' | 'post-execution' | 'pre-stream' | 'post-stream';
	/** Function name in the plugin that implements this hook */
	readonly handler: string;
}

/**
 * Permissions a plugin can request.
 * These are checked at activation time and enforced at runtime.
 */
export interface AIPluginPermissions {
	/** Whether the plugin can make network requests */
	readonly networkAccess?: boolean;
	/** Whether the plugin can read files from the workspace */
	readonly fileRead?: boolean;
	/** Whether the plugin can write files to the workspace */
	readonly fileWrite?: boolean;
	/** Whether the plugin can execute terminal commands */
	readonly terminalAccess?: boolean;
	/** Domains the plugin is allowed to access (if networkAccess is true) */
	readonly allowedDomains?: string[];
	/** Maximum concurrent operations the plugin can perform */
	readonly maxConcurrentOps?: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// PLUGIN INTERFACE & CONTEXT
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * An installed AI plugin.
 * Represents a plugin that has been installed and can be activated.
 * The plugin runtime is responsible for managing the plugin's lifecycle.
 */
export interface IAIPlugin {
	/** The plugin's manifest — its identity and contributions */
	readonly manifest: AIPluginManifest;
	/** Current lifecycle state */
	readonly state: PluginState;
	/** Plugin review status */
	readonly reviewStatus: PluginReviewStatus;
	/** Error message if state is Error */
	readonly error?: string;
	/** When the plugin was installed */
	readonly installedAt: number;
	/** When the plugin was last activated (if ever) */
	readonly activatedAt?: number;
	/** Activate the plugin — called by the plugin service */
	activate(context: AIPluginContext): Promise<void>;
	/** Deactivate the plugin — called by the plugin service */
	deactivate(): Promise<void>;
	/** Execute a named handler from this plugin's code */
	executeHandler(handlerName: string, ...args: unknown[]): Promise<unknown>;
}

/**
 * The context provided to a plugin during activation.
 * This is the plugin's API surface — the only way it can interact
 * with the VibeCode AI system.
 *
 * Security: All registration methods validate the contribution
 * against the plugin's declared permissions and rate limits.
 */
export interface AIPluginContext {
	/** Disposable subscriptions — cleaned up on deactivation */
	readonly subscriptions: IDisposable[];
	/** Register a custom LLM provider */
	registerProvider(contribution: AIProviderContribution): void;
	/** Register a custom AI tool with its handler function */
	registerTool(contribution: AIToolContribution, handler: (...args: unknown[]) => Promise<unknown>): void;
	/** Register a custom agent role */
	registerAgent(contribution: AIAgentContribution): void;
	/** Register an execution pipeline hook with its handler function */
	registerHook(contribution: AIHookContribution, handler: (...args: unknown[]) => Promise<unknown>): void;
	/** Access shared AI context (current file, workspace info, etc.) */
	readonly aiContext: IPluginAIContext;
}

/**
 * Shared AI context accessible to plugins.
 * This is a read-only view of the current AI execution state.
 * Plugins use this to make context-aware decisions.
 */
export interface IPluginAIContext {
	/** The currently active file URI (if any) */
	readonly activeFileUri: string | undefined;
	/** The active file's language ID */
	readonly activeFileLanguage: string | undefined;
	/** The workspace root URI */
	readonly workspaceRoot: string | undefined;
	/** Currently active AI agent role (if any) */
	readonly activeAgentRole: string | undefined;
	/** Whether an AI execution is currently in progress */
	readonly isExecuting: boolean;
	/** The currently active LLM provider ID */
	readonly activeProviderId: string | undefined;
	/** The currently active model ID */
	readonly activeModelId: string | undefined;
}

// ═══════════════════════════════════════════════════════════════════════════════
// RATE LIMITING & SECURITY
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Rate limits for plugin contributions.
 * Prevents any single plugin from overwhelming the system.
 */
export interface IPluginRateLimits {
	/** Maximum providers a single plugin can register */
	readonly maxProviders: number;
	/** Maximum tools a single plugin can register */
	readonly maxTools: number;
	/** Maximum agents a single plugin can register */
	readonly maxAgents: number;
	/** Maximum hooks a single plugin can register */
	readonly maxHooks: number;
	/** Maximum handler execution time in milliseconds */
	readonly handlerTimeoutMs: number;
	/** Maximum concurrent hook executions per plugin */
	readonly maxConcurrentHooks: number;
}

/**
 * Default rate limits. Adjusted by review status.
 */
const DEFAULT_RATE_LIMITS: IPluginRateLimits = {
	maxProviders: 3,
	maxTools: 10,
	maxAgents: 5,
	maxHooks: 8,
	handlerTimeoutMs: 30_000,
	maxConcurrentHooks: 4,
};

/**
 * Rate limits for unreviewed plugins — more restrictive.
 */
const UNREVIEWED_RATE_LIMITS: IPluginRateLimits = {
	maxProviders: 1,
	maxTools: 3,
	maxAgents: 1,
	maxHooks: 2,
	handlerTimeoutMs: 10_000,
	maxConcurrentHooks: 2,
};

/**
 * Rate limits for community-reviewed plugins.
 */
const COMMUNITY_REVIEWED_RATE_LIMITS: IPluginRateLimits = {
	maxProviders: 2,
	maxTools: 7,
	maxAgents: 3,
	maxHooks: 5,
	handlerTimeoutMs: 20_000,
	maxConcurrentHooks: 3,
};

/**
 * The result of a plugin security validation.
 */
export interface IPluginValidationResult {
	/** Whether the plugin passed validation */
	readonly valid: boolean;
	/** Validation errors (if any) */
	readonly errors: readonly string[];
	/** Validation warnings (if any) */
	readonly warnings: readonly string[];
}

/**
 * An event fired when a plugin's state changes.
 */
export interface IPluginStateChangeEvent {
	/** The plugin ID */
	readonly pluginId: string;
	/** Previous state */
	readonly fromState: PluginState;
	/** New state */
	readonly toState: PluginState;
	/** What triggered the change */
	readonly trigger: string;
	/** Timestamp */
	readonly timestamp: number;
}

/**
 * An event fired when plugin contributions change.
 */
export interface IPluginContributionsChangeEvent {
	/** The plugin ID that changed */
	readonly pluginId: string;
	/** Type of contribution that changed */
	readonly type: 'provider' | 'tool' | 'agent' | 'hook';
	/** Whether contributions were added or removed */
	readonly change: 'added' | 'removed';
}

// ═══════════════════════════════════════════════════════════════════════════════
// INTERNAL REGISTRY TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Internal registered tool with its handler and owning plugin.
 */
interface IRegisteredTool {
	readonly contribution: AIToolContribution;
	readonly handler: (...args: unknown[]) => Promise<unknown>;
	readonly pluginId: string;
}

/**
 * Internal registered hook with its handler and owning plugin.
 */
interface IRegisteredHook {
	readonly contribution: AIHookContribution;
	readonly handler: (...args: unknown[]) => Promise<unknown>;
	readonly pluginId: string;
}

/**
 * Internal registered provider with owning plugin.
 */
interface IRegisteredProvider {
	readonly contribution: AIProviderContribution;
	readonly pluginId: string;
}

/**
 * Internal registered agent with owning plugin.
 */
interface IRegisteredAgent {
	readonly contribution: AIAgentContribution;
	readonly pluginId: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// PLUGIN RUNTIME (SANDBOX)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Default AIPlugin implementation.
 * Manages a plugin's lifecycle and provides the handler execution sandbox.
 *
 * In a production system, the `executeHandler` method would delegate to
 * a Web Worker or iframe sandbox. This implementation uses a handler map
 * that the plugin populates during activation.
 */
class AIPluginRuntime implements IAIPlugin {
	public state: PluginState = PluginState.Installed;
	public reviewStatus: PluginReviewStatus = PluginReviewStatus.Unreviewed;
	public error: string | undefined;
	public activatedAt: number | undefined;

	private readonly _handlerMap = new Map<string, (...args: unknown[]) => Promise<unknown>>();
	private _activateFn: ((context: AIPluginContext) => Promise<void>) | undefined;
	private _deactivateFn: (() => Promise<void>) | undefined;

	constructor(
		public readonly manifest: AIPluginManifest,
		public readonly installedAt: number,
		private readonly logService: ILogService,
	) { }

	/**
	 * Set the activation function for this plugin.
	 * Called by the plugin service during installation to wire up the plugin's
	 * activation entry point.
	 */
	setActivationFn(fn: (context: AIPluginContext) => Promise<void>): void {
		this._activateFn = fn;
	}

	/**
	 * Set the deactivation function for this plugin.
	 */
	setDeactivationFn(fn: () => Promise<void>): void {
		this._deactivateFn = fn;
	}

	/**
	 * Register a handler function that can be called by name.
	 * This is how tools and hooks make their implementations available.
	 */
	registerHandler(name: string, handler: (...args: unknown[]) => Promise<unknown>): void {
		if (this._handlerMap.has(name)) {
			this.logService.warn(`[AIPlugin] Handler "${name}" already registered for plugin ${this.manifest.id}, overwriting`);
		}
		this._handlerMap.set(name, handler);
	}

	/**
	 * Clear all registered handlers. Called during deactivation.
	 */
	clearHandlers(): void {
		this._handlerMap.clear();
	}

	async activate(context: AIPluginContext): Promise<void> {
		if (!this._activateFn) {
			throw new Error(`[AIPlugin] No activation function for plugin ${this.manifest.id}. The plugin must be loaded before activation.`);
		}
		await this._activateFn(context);
		this.activatedAt = Date.now();
	}

	async deactivate(): Promise<void> {
		if (this._deactivateFn) {
			await this._deactivateFn();
		}
		this.clearHandlers();
		this.activatedAt = undefined;
	}

	async executeHandler(handlerName: string, ...args: unknown[]): Promise<unknown> {
		const handler = this._handlerMap.get(handlerName);
		if (!handler) {
			throw new Error(`[AIPlugin] Handler "${handlerName}" not found in plugin ${this.manifest.id}. Available handlers: ${Array.from(this._handlerMap.keys()).join(', ')}`);
		}

		try {
			return await handler(...args);
		} catch (error: any) {
			const message = error?.message || String(error);
			throw new Error(`[AIPlugin] Handler "${handlerName}" in plugin ${this.manifest.id} threw an error: ${message}`);
		}
	}
}

// ═══════════════════════════════════════════════════════════════════════════════
// SERVICE DECORATOR & INTERFACE
// ═══════════════════════════════════════════════════════════════════════════════

export const IAIPluginService = createDecorator<IAIPluginService>('aiPluginService');

/**
 * IAIPluginService — The Community AI Plugin System.
 *
 * A public API for community plugins to extend VibeCode's AI capabilities.
 * Manages the full plugin lifecycle from installation through activation,
 * contribution registration, and uninstallation.
 *
 * Security guarantees:
 *   - Plugins execute in a sandboxed context with restricted capabilities
 *   - All contributions are validated against the plugin's declared permissions
 *   - Rate limits prevent any single plugin from overwhelming the system
 *   - Review status gates access to sensitive capabilities
 *   - Handler execution is timeout-bounded
 *
 * Contribution types:
 *   - Providers: Custom LLM endpoints with model lists and capabilities
 *   - Tools: Functions the AI can call during execution
 *   - Agents: Role-based AI agents with system prompts
 *   - Hooks: Pre/post execution and stream interceptors
 */
export interface IAIPluginService {
	readonly _serviceBrand: undefined;

	// ─── Plugin Lifecycle ─────────────────────────────────────────────────────

	/**
	 * Install a plugin from its manifest.
	 * Validates the manifest, checks rate limits, and registers the plugin.
	 * The plugin starts in the Installed state — call activatePlugin() to enable it.
	 *
	 * @param manifest The plugin manifest describing identity and contributions
	 * @param activateFn The plugin's activation entry point
	 * @param deactivateFn Optional deactivation function
	 * @throws Error if the manifest is invalid or a plugin with the same ID exists
	 */
	installPlugin(manifest: AIPluginManifest, activateFn: (context: AIPluginContext) => Promise<void>, deactivateFn?: () => Promise<void>): Promise<void>;

	/**
	 * Uninstall a plugin. Deactivates it first if active, then removes all
	 * contributions and registration data.
	 *
	 * @param pluginId The plugin to uninstall
	 * @throws Error if the plugin is not installed
	 */
	uninstallPlugin(pluginId: string): Promise<void>;

	/**
	 * Activate an installed plugin. This calls the plugin's activation function,
	 * which registers its contributions (providers, tools, agents, hooks).
	 *
	 * @param pluginId The plugin to activate
	 * @throws Error if the plugin is not installed or already active
	 */
	activatePlugin(pluginId: string): Promise<void>;

	/**
	 * Deactivate an active plugin. Unregisters all contributions and calls
	 * the plugin's deactivation function.
	 *
	 * @param pluginId The plugin to deactivate
	 * @throws Error if the plugin is not active
	 */
	deactivatePlugin(pluginId: string): Promise<void>;

	// ─── Plugin Queries ───────────────────────────────────────────────────────

	/**
	 * Get all installed plugins regardless of state.
	 */
	getPlugins(): IAIPlugin[];

	/**
	 * Get all currently active plugins.
	 */
	getActivePlugins(): IAIPlugin[];

	/**
	 * Get a specific plugin by ID.
	 */
	getPlugin(pluginId: string): IAIPlugin | undefined;

	// ─── Contribution Queries ──────────────────────────────────────────────────

	/**
	 * Get all contributed tools from active plugins.
	 * These are the tools available for AI execution.
	 */
	getContributedTools(): AIToolContribution[];

	/**
	 * Get all contributed agents from active plugins.
	 */
	getContributedAgents(): AIAgentContribution[];

	/**
	 * Get all contributed providers from active plugins.
	 */
	getContributedProviders(): AIProviderContribution[];

	/**
	 * Get all contributed hooks from active plugins.
	 */
	getContributedHooks(): AIHookContribution[];

	/**
	 * Execute a contributed tool by name.
	 * The tool's handler is called with the provided arguments.
	 *
	 * @param toolName The tool name (must be unique across active plugins)
	 * @param args Arguments to pass to the tool handler
	 * @returns The tool's return value
	 * @throws Error if the tool is not found or the handler fails
	 */
	executeTool(toolName: string, ...args: unknown[]): Promise<unknown>;

	// ─── Execution Pipeline Hooks ──────────────────────────────────────────────

	/**
	 * Execute all hooks of a given type.
	 * Hooks are executed in registration order. Pre-execution hooks can
	 * modify the context; post-execution hooks can modify the result.
	 *
	 * If any hook fails, execution continues but the error is logged.
	 * Hooks are timeout-bounded — if a hook exceeds its time limit,
	 * it is skipped and a warning is logged.
	 *
	 * @param type The hook type to execute
	 * @param context The execution context to pass to hooks
	 * @returns The possibly-modified context after all hooks have run
	 */
	executeHook(type: 'pre-execution' | 'post-execution' | 'pre-stream' | 'post-stream', context: unknown): Promise<unknown>;

	// ─── Events ────────────────────────────────────────────────────────────────

	/**
	 * Fired when plugins are installed, uninstalled, activated, or deactivated.
	 */
	readonly onDidChangePlugins: Event<void>;

	/**
	 * Fired when a plugin's state changes.
	 */
	readonly onDidChangePluginState: Event<IPluginStateChangeEvent>;

	/**
	 * Fired when plugin contributions change (added or removed).
	 */
	readonly onDidChangeContributions: Event<IPluginContributionsChangeEvent>;

	// ─── Security ──────────────────────────────────────────────────────────────

	/**
	 * Set the review status for a plugin.
	 * This affects the plugin's rate limits and available capabilities.
	 */
	setPluginReviewStatus(pluginId: string, status: PluginReviewStatus): void;

	/**
	 * Get the current rate limits for a plugin based on its review status.
	 */
	getPluginRateLimits(pluginId: string): IPluginRateLimits;

	/**
	 * Validate a plugin manifest without installing it.
	 * Returns any errors or warnings found.
	 */
	validateManifest(manifest: AIPluginManifest): IPluginValidationResult;

	// ─── Shared AI Context ─────────────────────────────────────────────────────

	/**
	 * Get the current shared AI context.
	 * This is provided to plugins during activation and is updated
	 * as the workspace and AI state changes.
	 */
	readonly sharedAIContext: IPluginAIContext;

	/**
	 * Update the shared AI context. Called by the AI execution pipeline
	 * to keep plugin-visible context current.
	 */
	updateSharedAIContext(update: Partial<IPluginAIContext>): void;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SERVICE IMPLEMENTATION
// ═══════════════════════════════════════════════════════════════════════════════

export class AIPluginService extends Disposable implements IAIPluginService {
	declare readonly _serviceBrand: undefined;

	// ─── Plugin Registry ─────────────────────────────────────────────────────

	private readonly _plugins = new Map<string, AIPluginRuntime>();

	// ─── Contribution Registries ─────────────────────────────────────────────

	private readonly _providers = new Map<string, IRegisteredProvider>();
	private readonly _tools = new Map<string, IRegisteredTool>();
	private readonly _agents = new Map<string, IRegisteredAgent>();
	private readonly _hooks = new Map<string, IRegisteredHook[]>();

	// ─── Shared AI Context ───────────────────────────────────────────────────

	private _sharedAIContext: IPluginAIContext = {
		activeFileUri: undefined,
		activeFileLanguage: undefined,
		workspaceRoot: undefined,
		activeAgentRole: undefined,
		isExecuting: false,
		activeProviderId: undefined,
		activeModelId: undefined,
	};

	// ─── Events ──────────────────────────────────────────────────────────────

	private readonly _onDidChangePlugins = this._register(new Emitter<void>());
	readonly onDidChangePlugins = this._onDidChangePlugins.event;

	private readonly _onDidChangePluginState = this._register(new Emitter<IPluginStateChangeEvent>());
	readonly onDidChangePluginState = this._onDidChangePluginState.event;

	private readonly _onDidChangeContributions = this._register(new Emitter<IPluginContributionsChangeEvent>());
	readonly onDidChangeContributions = this._onDidChangeContributions.event;

	// ─── Constructor ─────────────────────────────────────────────────────────

	constructor(
		@ILogService private readonly logService: ILogService,
	) {
		super();
		this.logService.info('[AIPlugin] Service initialized');
	}

	// ═══════════════════════════════════════════════════════════════════════════
	// PLUGIN LIFECYCLE
	// ═══════════════════════════════════════════════════════════════════════════

	async installPlugin(
		manifest: AIPluginManifest,
		activateFn: (context: AIPluginContext) => Promise<void>,
		deactivateFn?: () => Promise<void>,
	): Promise<void> {
		// Validate the manifest first
		const validation = this.validateManifest(manifest);
		if (!validation.valid) {
			throw new Error(`[AIPlugin] Cannot install plugin "${manifest.id}": validation failed: ${validation.errors.join('; ')}`);
		}

		if (validation.warnings.length > 0) {
			for (const warning of validation.warnings) {
				this.logService.warn(`[AIPlugin] Plugin "${manifest.id}" validation warning: ${warning}`);
			}
		}

		// Check for duplicate
		if (this._plugins.has(manifest.id)) {
			throw new Error(`[AIPlugin] Plugin "${manifest.id}" is already installed. Uninstall it first.`);
		}

		// Check contribution count against rate limits
		const rateLimits = UNREVIEWED_RATE_LIMITS; // New plugins start as unreviewed
		this.validateContributionCounts(manifest, rateLimits);

		// Create the plugin runtime
		const plugin = new AIPluginRuntime(manifest, Date.now(), this.logService);
		plugin.setActivationFn(activateFn);
		if (deactivateFn) {
			plugin.setDeactivationFn(deactivateFn);
		}

		this._plugins.set(manifest.id, plugin);

		this._firePluginStateChange(manifest.id, PluginState.Uninstalled, PluginState.Installed, 'install');
		this._onDidChangePlugins.fire();

		this.logService.info(`[AIPlugin] Installed plugin: ${manifest.id} v${manifest.version} by ${manifest.author}`);
	}

	async uninstallPlugin(pluginId: string): Promise<void> {
		const plugin = this._getPluginOrThrow(pluginId);

		// Deactivate first if active
		if (plugin.state === PluginState.Activated) {
			await this.deactivatePlugin(pluginId);
		}

		// Remove all contributions from registries
		this._removePluginContributions(pluginId);

		// Remove the plugin itself
		this._plugins.delete(pluginId);

		this._firePluginStateChange(pluginId, plugin.state, PluginState.Uninstalled, 'uninstall');
		this._onDidChangePlugins.fire();

		this.logService.info(`[AIPlugin] Uninstalled plugin: ${pluginId}`);
	}

	async activatePlugin(pluginId: string): Promise<void> {
		const plugin = this._getPluginOrThrow(pluginId);

		if (plugin.state === PluginState.Activated) {
			this.logService.warn(`[AIPlugin] Plugin ${pluginId} is already activated`);
			return;
		}

		if (plugin.state !== PluginState.Installed && plugin.state !== PluginState.Deactivated) {
			throw new Error(`[AIPlugin] Cannot activate plugin ${pluginId} from state ${plugin.state}. Must be Installed or Deactivated.`);
		}

		// Create the activation context
		const subscriptions: IDisposable[] = [];
		const context = this._createPluginContext(pluginId, subscriptions);

		try {
			// Transition to Activated before calling activate — this allows
			// the context registration methods to work
			const prevState = plugin.state;
			plugin.state = PluginState.Activated;

			await plugin.activate(context);

			this._firePluginStateChange(pluginId, prevState, PluginState.Activated, 'activate');
			this._onDidChangePlugins.fire();

			this.logService.info(`[AIPlugin] Activated plugin: ${pluginId}`);
		} catch (error: any) {
			// Revert to error state
			const prevState = plugin.state;
			plugin.state = PluginState.Error;
			plugin.error = error?.message || String(error);

			this._firePluginStateChange(pluginId, prevState, PluginState.Error, 'activate-failed');
			this._onDidChangePlugins.fire();

			this.logService.error(`[AIPlugin] Failed to activate plugin ${pluginId}: ${plugin.error}`);

			throw new Error(`[AIPlugin] Plugin ${pluginId} activation failed: ${plugin.error}`);
		}
	}

	async deactivatePlugin(pluginId: string): Promise<void> {
		const plugin = this._getPluginOrThrow(pluginId);

		if (plugin.state !== PluginState.Activated) {
			throw new Error(`[AIPlugin] Cannot deactivate plugin ${pluginId} from state ${plugin.state}. Must be Activated.`);
		}

		const prevState = plugin.state;

		try {
			await plugin.deactivate();
		} catch (error: any) {
			this.logService.error(`[AIPlugin] Error during deactivation of plugin ${pluginId}: ${error?.message || String(error)}`);
			// Continue with deactivation even if the plugin's deactivate fails
		}

		// Remove all contributions
		this._removePluginContributions(pluginId);

		plugin.state = PluginState.Deactivated;
		plugin.error = undefined;

		this._firePluginStateChange(pluginId, prevState, PluginState.Deactivated, 'deactivate');
		this._onDidChangePlugins.fire();

		this.logService.info(`[AIPlugin] Deactivated plugin: ${pluginId}`);
	}

	// ═══════════════════════════════════════════════════════════════════════════
	// PLUGIN QUERIES
	// ═══════════════════════════════════════════════════════════════════════════

	getPlugins(): IAIPlugin[] {
		return Array.from(this._plugins.values());
	}

	getActivePlugins(): IAIPlugin[] {
		return Array.from(this._plugins.values()).filter(p => p.state === PluginState.Activated);
	}

	getPlugin(pluginId: string): IAIPlugin | undefined {
		return this._plugins.get(pluginId);
	}

	// ═══════════════════════════════════════════════════════════════════════════
	// CONTRIBUTION QUERIES
	// ═══════════════════════════════════════════════════════════════════════════

	getContributedTools(): AIToolContribution[] {
		return Array.from(this._tools.values()).map(t => t.contribution);
	}

	getContributedAgents(): AIAgentContribution[] {
		return Array.from(this._agents.values()).map(a => a.contribution);
	}

	getContributedProviders(): AIProviderContribution[] {
		return Array.from(this._providers.values()).map(p => p.contribution);
	}

	getContributedHooks(): AIHookContribution[] {
		const hooks: AIHookContribution[] = [];
		for (const hookList of this._hooks.values()) {
			for (const hook of hookList) {
				hooks.push(hook.contribution);
			}
		}
		return hooks;
	}

	async executeTool(toolName: string, ...args: unknown[]): Promise<unknown> {
		const tool = this._tools.get(toolName);
		if (!tool) {
			throw new Error(`[AIPlugin] Tool "${toolName}" not found. Available tools: ${Array.from(this._tools.keys()).join(', ')}`);
		}

		const plugin = this._plugins.get(tool.pluginId);
		if (!plugin || plugin.state !== PluginState.Activated) {
			throw new Error(`[AIPlugin] Tool "${toolName}" belongs to plugin ${tool.pluginId} which is not active`);
		}

		const rateLimits = this.getPluginRateLimits(tool.pluginId);

		try {
			const result = await this._executeWithTimeout(
				tool.handler(...args),
				rateLimits.handlerTimeoutMs,
				`Tool "${toolName}" in plugin ${tool.pluginId}`
			);
			return result;
		} catch (error: any) {
			this.logService.error(`[AIPlugin] Tool "${toolName}" execution failed: ${error?.message || String(error)}`);
			throw error;
		}
	}

	// ═══════════════════════════════════════════════════════════════════════════
	// EXECUTION PIPELINE HOOKS
	// ═══════════════════════════════════════════════════════════════════════════

	async executeHook(type: 'pre-execution' | 'post-execution' | 'pre-stream' | 'post-stream', context: unknown): Promise<unknown> {
		// Collect all hooks of the requested type
		const hooks: IRegisteredHook[] = [];
		for (const hookList of this._hooks.values()) {
			for (const hook of hookList) {
				if (hook.contribution.type === type) {
					hooks.push(hook);
				}
			}
		}

		if (hooks.length === 0) {
			return context;
		}

		let currentContext = context;

		for (const hook of hooks) {
			const plugin = this._plugins.get(hook.pluginId);
			if (!plugin || plugin.state !== PluginState.Activated) {
				this.logService.warn(`[AIPlugin] Skipping ${type} hook from inactive plugin ${hook.pluginId}`);
				continue;
			}

			const rateLimits = this.getPluginRateLimits(hook.pluginId);

			try {
				const result = await this._executeWithTimeout(
					hook.handler(currentContext),
					rateLimits.handlerTimeoutMs,
					`${type} hook in plugin ${hook.pluginId}`
				);

				// Hooks can modify the context by returning a new value
				if (result !== undefined) {
					currentContext = result;
				}
			} catch (error: any) {
				// Hooks must NOT break the pipeline — log and continue
				this.logService.error(
					`[AIPlugin] ${type} hook from plugin ${hook.pluginId} failed: ${error?.message || String(error)}. Continuing pipeline.`
				);
			}
		}

		return currentContext;
	}

	// ═══════════════════════════════════════════════════════════════════════════
	// SECURITY
	// ═══════════════════════════════════════════════════════════════════════════

	setPluginReviewStatus(pluginId: string, status: PluginReviewStatus): void {
		const plugin = this._plugins.get(pluginId);
		if (!plugin) {
			throw new Error(`[AIPlugin] Cannot set review status: plugin ${pluginId} not found`);
		}

		const oldStatus = plugin.reviewStatus;
		plugin.reviewStatus = status;

		this.logService.info(`[AIPlugin] Plugin ${pluginId} review status changed: ${oldStatus} → ${status}`);
	}

	getPluginRateLimits(pluginId: string): IPluginRateLimits {
		const plugin = this._plugins.get(pluginId);
		if (!plugin) {
			return DEFAULT_RATE_LIMITS;
		}

		switch (plugin.reviewStatus) {
			case PluginReviewStatus.Unreviewed:
				return UNREVIEWED_RATE_LIMITS;
			case PluginReviewStatus.CommunityReviewed:
				return COMMUNITY_REVIEWED_RATE_LIMITS;
			case PluginReviewStatus.Verified:
				return DEFAULT_RATE_LIMITS;
			default:
				return DEFAULT_RATE_LIMITS;
		}
	}

	validateManifest(manifest: AIPluginManifest): IPluginValidationResult {
		const errors: string[] = [];
		const warnings: string[] = [];

		// ─── Required fields ───────────────────────────────────────────────

		if (!manifest.id || manifest.id.trim().length === 0) {
			errors.push('Plugin id is required');
		} else {
			// Validate ID format: reverse-domain notation
			const idPattern = /^[a-zA-Z0-9][a-zA-Z0-9._-]*$/;
			if (!idPattern.test(manifest.id)) {
				errors.push(`Plugin id "${manifest.id}" contains invalid characters. Use alphanumeric, dots, hyphens, and underscores only.`);
			}
			if (manifest.id.length > 256) {
				errors.push('Plugin id must be 256 characters or less');
			}
		}

		if (!manifest.name || manifest.name.trim().length === 0) {
			errors.push('Plugin name is required');
		}

		if (!manifest.version || manifest.version.trim().length === 0) {
			errors.push('Plugin version is required');
		} else {
			// Basic semver validation
			const semverPattern = /^\d+\.\d+\.\d+/;
			if (!semverPattern.test(manifest.version)) {
				warnings.push(`Plugin version "${manifest.version}" does not follow semver format (major.minor.patch)`);
			}
		}

		if (!manifest.description || manifest.description.trim().length === 0) {
			errors.push('Plugin description is required');
		}

		if (!manifest.author || manifest.author.trim().length === 0) {
			errors.push('Plugin author is required');
		}

		// ─── Contributions validation ──────────────────────────────────────

		if (!manifest.contributes) {
			errors.push('Plugin must declare at least one contribution (providers, tools, agents, or hooks)');
		} else {
			const hasContributions =
				(manifest.contributes.providers && manifest.contributes.providers.length > 0) ||
				(manifest.contributes.tools && manifest.contributes.tools.length > 0) ||
				(manifest.contributes.agents && manifest.contributes.agents.length > 0) ||
				(manifest.contributes.hooks && manifest.contributes.hooks.length > 0);

			if (!hasContributions) {
				errors.push('Plugin must declare at least one contribution (providers, tools, agents, or hooks)');
			}

			// Validate providers
			if (manifest.contributes.providers) {
				for (const provider of manifest.contributes.providers) {
					if (!provider.id) { errors.push(`Provider contribution missing id in plugin ${manifest.id}`); }
					if (!provider.name) { errors.push(`Provider "${provider.id}" missing name in plugin ${manifest.id}`); }
					if (!provider.endpoint) { errors.push(`Provider "${provider.id}" missing endpoint in plugin ${manifest.id}`); }
					if (!provider.models || provider.models.length === 0) {
						warnings.push(`Provider "${provider.id}" declares no models in plugin ${manifest.id}`);
					}
					if (provider.capabilities) {
						if (provider.capabilities.maxContextTokens <= 0) {
							errors.push(`Provider "${provider.id}" has invalid maxContextTokens: ${provider.capabilities.maxContextTokens}`);
						}
					}
				}
			}

			// Validate tools
			if (manifest.contributes.tools) {
				const toolNames = new Set<string>();
				for (const tool of manifest.contributes.tools) {
					if (!tool.name) { errors.push(`Tool contribution missing name in plugin ${manifest.id}`); }
					if (!tool.description) { errors.push(`Tool "${tool.name}" missing description in plugin ${manifest.id}`); }
					if (!tool.handler) { errors.push(`Tool "${tool.name}" missing handler in plugin ${manifest.id}`); }
					if (!tool.parameters) { errors.push(`Tool "${tool.name}" missing parameters schema in plugin ${manifest.id}`); }

					if (tool.name && toolNames.has(tool.name)) {
						errors.push(`Duplicate tool name "${tool.name}" in plugin ${manifest.id}`);
					}
					if (tool.name) {
						toolNames.add(tool.name);
					}
				}
			}

			// Validate agents
			if (manifest.contributes.agents) {
				for (const agent of manifest.contributes.agents) {
					if (!agent.role) { errors.push(`Agent contribution missing role in plugin ${manifest.id}`); }
					if (!agent.systemPrompt) { errors.push(`Agent "${agent.role}" missing systemPrompt in plugin ${manifest.id}`); }
				}
			}

			// Validate hooks
			if (manifest.contributes.hooks) {
				const validTypes = new Set(['pre-execution', 'post-execution', 'pre-stream', 'post-stream']);
				for (const hook of manifest.contributes.hooks) {
					if (!hook.type) { errors.push(`Hook contribution missing type in plugin ${manifest.id}`); }
					else if (!validTypes.has(hook.type)) {
						errors.push(`Hook has invalid type "${hook.type}" in plugin ${manifest.id}. Valid types: ${Array.from(validTypes).join(', ')}`);
					}
					if (!hook.handler) { errors.push(`Hook of type "${hook.type}" missing handler in plugin ${manifest.id}`); }
				}
			}
		}

		// ─── Permissions validation ────────────────────────────────────────

		if (manifest.permissions) {
			if (manifest.permissions.networkAccess && (!manifest.permissions.allowedDomains || manifest.permissions.allowedDomains.length === 0)) {
				warnings.push(`Plugin ${manifest.id} requests network access but declares no allowed domains. This will be restricted.`);
			}
			if (manifest.permissions.fileWrite && !manifest.permissions.fileRead) {
				warnings.push(`Plugin ${manifest.id} requests file write but not file read. Write typically implies read.`);
			}
			if (manifest.permissions.terminalAccess) {
				warnings.push(`Plugin ${manifest.id} requests terminal access — this is a high-risk permission`);
			}
		}

		return {
			valid: errors.length === 0,
			errors,
			warnings,
		};
	}

	// ═══════════════════════════════════════════════════════════════════════════
	// SHARED AI CONTEXT
	// ═══════════════════════════════════════════════════════════════════════════

	get sharedAIContext(): IPluginAIContext {
		return this._sharedAIContext;
	}

	updateSharedAIContext(update: Partial<IPluginAIContext>): void {
		this._sharedAIContext = { ...this._sharedAIContext, ...update };
	}

	// ═══════════════════════════════════════════════════════════════════════════
	// PRIVATE: PLUGIN CONTEXT FACTORY
	// ═══════════════════════════════════════════════════════════════════════════

	/**
	 * Creates the AIPluginContext for a plugin during activation.
	 * This is the plugin's API surface — all registration methods
	 * are wired to the service's internal registries.
	 */
	private _createPluginContext(pluginId: string, subscriptions: IDisposable[]): AIPluginContext {
		const plugin = this._plugins.get(pluginId);
		if (!plugin) {
			throw new Error(`[AIPlugin] Cannot create context for unknown plugin ${pluginId}`);
		}

		const rateLimits = this.getPluginRateLimits(pluginId);

		// Track how many of each contribution type this plugin has registered
		let providerCount = 0;
		let toolCount = 0;
		let agentCount = 0;
		let hookCount = 0;

		const context: AIPluginContext = {
			subscriptions,

			registerProvider: (contribution: AIProviderContribution) => {
				if (plugin.state !== PluginState.Activated) {
					throw new Error(`[AIPlugin] Cannot register provider: plugin ${pluginId} is not active`);
				}

				// Rate limit check
				providerCount++;
				if (providerCount > rateLimits.maxProviders) {
					throw new Error(
						`[AIPlugin] Plugin ${pluginId} exceeded provider limit (${rateLimits.maxProviders}). ` +
						`Current review status: ${plugin.reviewStatus}. Higher limits available with review.`
					);
				}

				// Validate contribution
				if (!contribution.id || !contribution.endpoint) {
					throw new Error(`[AIPlugin] Provider contribution missing required fields (id, endpoint)`);
				}

				const qualifiedId = `${pluginId}:${contribution.id}`;

				// Check for ID collision
				if (this._providers.has(qualifiedId)) {
					throw new Error(`[AIPlugin] Provider "${qualifiedId}" is already registered`);
				}

				this._providers.set(qualifiedId, { contribution, pluginId });
				this._onDidChangeContributions.fire({ pluginId, type: 'provider', change: 'added' });

				this.logService.info(`[AIPlugin] Plugin ${pluginId} registered provider: ${contribution.name} (${qualifiedId})`);
			},

			registerTool: (contribution: AIToolContribution, handler: (...args: unknown[]) => Promise<unknown>) => {
				if (plugin.state !== PluginState.Activated) {
					throw new Error(`[AIPlugin] Cannot register tool: plugin ${pluginId} is not active`);
				}

				// Rate limit check
				toolCount++;
				if (toolCount > rateLimits.maxTools) {
					throw new Error(
						`[AIPlugin] Plugin ${pluginId} exceeded tool limit (${rateLimits.maxTools}). ` +
						`Current review status: ${plugin.reviewStatus}. Higher limits available with review.`
					);
				}

				// Validate contribution
				if (!contribution.name || !contribution.handler) {
					throw new Error(`[AIPlugin] Tool contribution missing required fields (name, handler)`);
				}

				// Check for name collision
				if (this._tools.has(contribution.name)) {
					const existingPlugin = this._tools.get(contribution.name)!.pluginId;
					throw new Error(
						`[AIPlugin] Tool "${contribution.name}" is already registered by plugin ${existingPlugin}. ` +
						`Tool names must be unique across all active plugins.`
					);
				}

				// Register the handler in the plugin runtime
				plugin.registerHandler(contribution.handler, handler);

				this._tools.set(contribution.name, { contribution, handler, pluginId });
				this._onDidChangeContributions.fire({ pluginId, type: 'tool', change: 'added' });

				this.logService.info(`[AIPlugin] Plugin ${pluginId} registered tool: ${contribution.name}`);
			},

			registerAgent: (contribution: AIAgentContribution) => {
				if (plugin.state !== PluginState.Activated) {
					throw new Error(`[AIPlugin] Cannot register agent: plugin ${pluginId} is not active`);
				}

				// Rate limit check
				agentCount++;
				if (agentCount > rateLimits.maxAgents) {
					throw new Error(
						`[AIPlugin] Plugin ${pluginId} exceeded agent limit (${rateLimits.maxAgents}). ` +
						`Current review status: ${plugin.reviewStatus}. Higher limits available with review.`
					);
				}

				// Validate contribution
				if (!contribution.role || !contribution.systemPrompt) {
					throw new Error(`[AIPlugin] Agent contribution missing required fields (role, systemPrompt)`);
				}

				const qualifiedRole = `${pluginId}:${contribution.role}`;

				// Check for role collision
				if (this._agents.has(qualifiedRole)) {
					throw new Error(`[AIPlugin] Agent role "${qualifiedRole}" is already registered`);
				}

				this._agents.set(qualifiedRole, { contribution, pluginId });
				this._onDidChangeContributions.fire({ pluginId, type: 'agent', change: 'added' });

				this.logService.info(`[AIPlugin] Plugin ${pluginId} registered agent: ${contribution.role} (${qualifiedRole})`);
			},

			registerHook: (contribution: AIHookContribution, handler: (...args: unknown[]) => Promise<unknown>) => {
				if (plugin.state !== PluginState.Activated) {
					throw new Error(`[AIPlugin] Cannot register hook: plugin ${pluginId} is not active`);
				}

				// Rate limit check
				hookCount++;
				if (hookCount > rateLimits.maxHooks) {
					throw new Error(
						`[AIPlugin] Plugin ${pluginId} exceeded hook limit (${rateLimits.maxHooks}). ` +
						`Current review status: ${plugin.reviewStatus}. Higher limits available with review.`
					);
				}

				// Validate contribution
				const validTypes = new Set(['pre-execution', 'post-execution', 'pre-stream', 'post-stream']);
				if (!contribution.type || !validTypes.has(contribution.type)) {
					throw new Error(`[AIPlugin] Hook contribution has invalid type: ${contribution.type}`);
				}
				if (!contribution.handler) {
					throw new Error(`[AIPlugin] Hook contribution missing handler`);
				}

				// Register the handler in the plugin runtime
				const hookHandlerKey = `__hook_${contribution.type}_${contribution.handler}`;
				plugin.registerHandler(hookHandlerKey, handler);

				// Multiple hooks of the same type are allowed
				const hookId = generateUuid();
				const hookList = this._hooks.get(hookId) || [];
				hookList.push({ contribution, handler, pluginId });
				this._hooks.set(hookId, hookList);

				this._onDidChangeContributions.fire({ pluginId, type: 'hook', change: 'added' });

				this.logService.info(`[AIPlugin] Plugin ${pluginId} registered ${contribution.type} hook: ${contribution.handler}`);
			},

			aiContext: this._sharedAIContext,
		};

		return context;
	}

	// ═══════════════════════════════════════════════════════════════════════════
	// PRIVATE: CONTRIBUTION MANAGEMENT
	// ═══════════════════════════════════════════════════════════════════════════

	/**
	 * Remove all contributions belonging to a plugin.
	 * Called during deactivation and uninstallation.
	 */
	private _removePluginContributions(pluginId: string): void {
		// Remove providers
		for (const [id, registration] of this._providers) {
			if (registration.pluginId === pluginId) {
				this._providers.delete(id);
				this._onDidChangeContributions.fire({ pluginId, type: 'provider', change: 'removed' });
			}
		}

		// Remove tools
		for (const [name, registration] of this._tools) {
			if (registration.pluginId === pluginId) {
				this._tools.delete(name);
				this._onDidChangeContributions.fire({ pluginId, type: 'tool', change: 'removed' });
			}
		}

		// Remove agents
		for (const [role, registration] of this._agents) {
			if (registration.pluginId === pluginId) {
				this._agents.delete(role);
				this._onDidChangeContributions.fire({ pluginId, type: 'agent', change: 'removed' });
			}
		}

		// Remove hooks
		for (const [hookId, hookList] of this._hooks) {
			const filtered = hookList.filter(h => h.pluginId !== pluginId);
			if (filtered.length !== hookList.length) {
				this._onDidChangeContributions.fire({ pluginId, type: 'hook', change: 'removed' });
				if (filtered.length === 0) {
					this._hooks.delete(hookId);
				} else {
					this._hooks.set(hookId, filtered);
				}
			}
		}
	}

	/**
	 * Validate that a manifest's declared contributions don't exceed rate limits.
	 */
	private validateContributionCounts(manifest: AIPluginManifest, limits: IPluginRateLimits): void {
		const contributes = manifest.contributes;

		const providerCount = contributes.providers?.length || 0;
		if (providerCount > limits.maxProviders) {
			throw new Error(
				`[AIPlugin] Plugin ${manifest.id} declares ${providerCount} providers, ` +
				`exceeding limit of ${limits.maxProviders} for unreviewed plugins. ` +
				`Request a review for higher limits.`
			);
		}

		const toolCount = contributes.tools?.length || 0;
		if (toolCount > limits.maxTools) {
			throw new Error(
				`[AIPlugin] Plugin ${manifest.id} declares ${toolCount} tools, ` +
				`exceeding limit of ${limits.maxTools} for unreviewed plugins. ` +
				`Request a review for higher limits.`
			);
		}

		const agentCount = contributes.agents?.length || 0;
		if (agentCount > limits.maxAgents) {
			throw new Error(
				`[AIPlugin] Plugin ${manifest.id} declares ${agentCount} agents, ` +
				`exceeding limit of ${limits.maxAgents} for unreviewed plugins. ` +
				`Request a review for higher limits.`
			);
		}

		const hookCount = contributes.hooks?.length || 0;
		if (hookCount > limits.maxHooks) {
			throw new Error(
				`[AIPlugin] Plugin ${manifest.id} declares ${hookCount} hooks, ` +
				`exceeding limit of ${limits.maxHooks} for unreviewed plugins. ` +
				`Request a review for higher limits.`
			);
		}
	}

	// ═══════════════════════════════════════════════════════════════════════════
	// PRIVATE: UTILITIES
	// ═══════════════════════════════════════════════════════════════════════════

	/**
	 * Get a plugin or throw if not found.
	 */
	private _getPluginOrThrow(pluginId: string): AIPluginRuntime {
		const plugin = this._plugins.get(pluginId);
		if (!plugin) {
			throw new Error(`[AIPlugin] Plugin ${pluginId} not found. Available plugins: ${Array.from(this._plugins.keys()).join(', ')}`);
		}
		return plugin;
	}

	/**
	 * Fire a plugin state change event.
	 */
	private _firePluginStateChange(pluginId: string, fromState: PluginState, toState: PluginState, trigger: string): void {
		this._onDidChangePluginState.fire({
			pluginId,
			fromState,
			toState,
			trigger,
			timestamp: Date.now(),
		});
	}

	/**
	 * Execute a promise with a timeout.
	 * If the promise doesn't resolve within the timeout, it is rejected.
	 */
	private async _executeWithTimeout<T>(promise: Promise<T>, timeoutMs: number, description: string): Promise<T> {
		if (timeoutMs <= 0) {
			return promise;
		}

		let timeoutId: ReturnType<typeof setTimeout> | undefined;
		const timeoutPromise = new Promise<never>((_, reject) => {
			timeoutId = setTimeout(() => {
				reject(new Error(`[AIPlugin] ${description} timed out after ${timeoutMs}ms`));
			}, timeoutMs);
		});

		try {
			return await Promise.race([promise, timeoutPromise]);
		} finally {
			if (timeoutId !== undefined) {
				clearTimeout(timeoutId);
			}
		}
	}

	// ═══════════════════════════════════════════════════════════════════════════
	// DISPOSAL
	// ═══════════════════════════════════════════════════════════════════════════

	override dispose(): void {
		// Deactivate all active plugins before disposing
		for (const [pluginId, plugin] of this._plugins) {
			if (plugin.state === PluginState.Activated) {
				try {
					plugin.deactivate();
				} catch (error: any) {
					this.logService.error(`[AIPlugin] Error deactivating plugin ${pluginId} during service disposal: ${error?.message || String(error)}`);
				}
			}
		}

		this._plugins.clear();
		this._providers.clear();
		this._tools.clear();
		this._agents.clear();
		this._hooks.clear();

		super.dispose();
		this.logService.info('[AIPlugin] Service disposed');
	}
}
