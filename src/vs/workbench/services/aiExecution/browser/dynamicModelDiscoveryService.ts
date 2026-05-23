/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Real Vibecode Project. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

/**
 * dynamicModelDiscoveryService.ts -- Dynamic Model Discovery Service
 *
 * Discovers available LLM models from ALL configured providers at runtime:
 *   - Local providers: Ollama (/api/tags), LM Studio (/v1/models), Proxima (/v1/models)
 *   - Cloud providers: OpenAI (/v1/models), Anthropic (/v1/models),
 *                      Google Gemini (models:list), OpenRouter (/v1/models)
 *
 * Features:
 *   - TTL-based cache (5 minutes) to avoid excessive API calls
 *   - Event emission when models are discovered or removed
 *   - getAvailableModels() returns cached snapshot
 *   - refreshModels() forces a full re-discovery
 *   - Uses ILLMProviderService and ICredentialStoreService for API access
 */

import { Disposable } from '../../../../base/common/lifecycle.js';
import { Emitter } from '../../../../base/common/event.js';
import { ILogService } from '../../../../platform/log/common/log.js';

import {
	IDynamicModelDiscoveryService, DiscoveredModel,
	ILLMProviderService, ICredentialStoreService,
	LLMProviderType,
	OLLAMA_TOOL_CAPABLE_FAMILIES, OLLAMA_VISION_CAPABLE_FAMILIES,
} from '../common/llmProvider.js';

// =====================================================================
// Dynamic Model Discovery Service
// =====================================================================

export class DynamicModelDiscoveryService extends Disposable implements IDynamicModelDiscoveryService {
	declare readonly _serviceBrand: undefined;

	/** Per-provider cached model lists */
	private readonly _providerModels = new Map<string, DiscoveredModel[]>();

	/** Flat index of all known models keyed by "providerId:modelId" for fast diffing */
	private readonly _modelIndex = new Map<string, DiscoveredModel>();

	/** Timestamp of the last successful full discovery */
	private _lastFullDiscoveryTime = 0;

	/** Whether a refresh is currently in progress */
	private _refreshInProgress = false;

	/** Cache TTL: 5 minutes */
	private static readonly CACHE_TTL_MS = 5 * 60 * 000; // 300 000 ms = 5 min

	/** Per-provider endpoint timeouts */
	private static readonly ENDPOINT_TIMEOUT_MS = 5000;

	// ---- Events ----

	private readonly _onDidDiscoverModels = this._register(new Emitter<DiscoveredModel[]>());
	readonly onDidDiscoverModels = this._onDidDiscoverModels.event;

	private readonly _onDidRemoveModels = this._register(new Emitter<DiscoveredModel[]>());
	readonly onDidRemoveModels = this._onDidRemoveModels.event;

	constructor(
		@ILLMProviderService private readonly llmProviderService: ILLMProviderService,
		@ICredentialStoreService private readonly credentialStore: ICredentialStoreService,
		@ILogService private readonly logService: ILogService,
	) {
		super();
		this.logService.info('[ModelDiscovery] Initialized with provider + credential access');
	}

	// =================================================================
	// Public API
	// =================================================================

	/**
	 * Return all currently cached models. If the cache is stale (older than
	 * TTL) a background refresh is kicked off, but the cached snapshot is
	 * returned immediately so callers never block.
	 */
	getAvailableModels(): DiscoveredModel[] {
		if (this._lastFullDiscoveryTime > 0 && Date.now() - this._lastFullDiscoveryTime > DynamicModelDiscoveryService.CACHE_TTL_MS) {
			// Stale — kick off a background refresh (fire-and-forget)
			this.refreshModels().catch(err => {
				this.logService.warn(`[ModelDiscovery] Background refresh failed: ${err?.message || err}`);
			});
		}
		return Array.from(this._modelIndex.values());
	}

	/**
	 * Force a full refresh from all providers (local + cloud).
	 * Fires onDidDiscoverModels / onDidRemoveModels with the diff.
	 */
	async refreshModels(): Promise<void> {
		// Coalesce concurrent refreshes
		if (this._refreshInProgress) {
			return;
		}
		this._refreshInProgress = true;
		try {
			const allModels = await this.discoverAllModels();
			this._mergeAndEmit(allModels);
			this._lastFullDiscoveryTime = Date.now();
			this.logService.info(`[ModelDiscovery] Full refresh complete — ${this._modelIndex.size} models across ${allModels.size} providers`);
		} finally {
			this._refreshInProgress = false;
		}
	}

	// =================================================================
	// Local Provider Discovery
	// =================================================================

	async discoverOllamaModels(): Promise<DiscoveredModel[]> {
		const config = this.llmProviderService.getProvider('ollama');
		const endpoint = config?.apiEndpoint || 'http://localhost:11434/api';

		try {
			const response = await this.fetchWithTimeout(`${endpoint}/tags`, DynamicModelDiscoveryService.ENDPOINT_TIMEOUT_MS);

			if (!response.ok) {
				this.logService.warn(`[ModelDiscovery] Ollama /api/tags returned ${response.status}`);
				return [];
			}

			const json = await response.json();
			const models: DiscoveredModel[] = [];

			if (json.models && Array.isArray(json.models)) {
				for (const model of json.models) {
					const name: string = model.name || model.model || '';
					if (!name) { continue; }

					const family = this.extractOllamaFamily(name, model.details?.family);
					const supportsToolUse = this.isOllamaToolCapable(family, name);
					const supportsVision = this.isOllamaVisionCapable(family, name);
					const contextLength = model.parameters?.num_ctx || this.estimateOllamaContext(name);

					models.push({
						id: name,
						name,
						providerId: 'ollama',
						size: model.size,
						quantization: model.details?.quantization_level,
						family,
						parameterSize: model.details?.parameter_size,
						contextLength,
						capabilities: {
							supportsToolUse,
							supportsVision,
							supportsStreaming: true,
						},
					});
				}
			}

			this._providerModels.set('ollama', models);
			this.logService.info(`[ModelDiscovery] Discovered ${models.length} Ollama models`);
			return models;
		} catch (error: any) {
			this.logService.debug(`[ModelDiscovery] Ollama not reachable: ${error?.message || 'unknown'}`);
			return [];
		}
	}

	async discoverLMStudioModels(): Promise<DiscoveredModel[]> {
		const config = this.llmProviderService.getProvider('lm-studio');
		const endpoint = config?.apiEndpoint || 'http://localhost:1234/v1';

		try {
			const response = await this.fetchWithTimeout(`${endpoint}/models`, DynamicModelDiscoveryService.ENDPOINT_TIMEOUT_MS);

			if (!response.ok) {
				this.logService.warn(`[ModelDiscovery] LM Studio /v1/models returned ${response.status}`);
				return [];
			}

			const json = await response.json();
			const models: DiscoveredModel[] = [];

			if (json.data && Array.isArray(json.data)) {
				for (const model of json.data) {
					const id: string = model.id || '';
					if (!id) { continue; }

					models.push({
						id,
						name: id,
						providerId: 'lm-studio',
						contextLength: 8192,
						capabilities: {
							supportsToolUse: true,
							supportsVision: false,
							supportsStreaming: true,
						},
					});
				}
			}

			this._providerModels.set('lm-studio', models);
			this.logService.info(`[ModelDiscovery] Discovered ${models.length} LM Studio models`);
			return models;
		} catch (error: any) {
			this.logService.debug(`[ModelDiscovery] LM Studio not reachable: ${error?.message || 'unknown'}`);
			return [];
		}
	}

	async discoverProximaModels(): Promise<DiscoveredModel[]> {
		const config = this.llmProviderService.getProvider('proxima');
		const endpoint = config?.apiEndpoint || 'http://localhost:3210/v1';

		try {
			const response = await this.fetchWithTimeout(`${endpoint}/models`, DynamicModelDiscoveryService.ENDPOINT_TIMEOUT_MS);

			if (!response.ok) {
				this.logService.warn(`[ModelDiscovery] Proxima /v1/models returned ${response.status}`);
				return [];
			}

			const json = await response.json();
			const models: DiscoveredModel[] = [];

			if (json.data && Array.isArray(json.data)) {
				for (const model of json.data) {
					const id: string = model.id || '';
					if (!id) { continue; }

					models.push({
						id,
						name: id,
						providerId: 'proxima',
						contextLength: 128000,
						capabilities: {
							supportsToolUse: true,
							supportsVision: true,
							supportsStreaming: true,
						},
					});
				}
			}

			this._providerModels.set('proxima', models);
			this.logService.info(`[ModelDiscovery] Discovered ${models.length} Proxima models`);
			return models;
		} catch (error: any) {
			this.logService.debug(`[ModelDiscovery] Proxima not reachable: ${error?.message || 'unknown'}`);
			return [];
		}
	}

	// =================================================================
	// Cloud Provider Discovery
	// =================================================================

	/**
	 * Discover models from cloud providers that have API keys configured.
	 * Queries each provider's model list endpoint using stored credentials.
	 */
	async discoverCloudModels(): Promise<Map<string, DiscoveredModel[]>> {
		const results = new Map<string, DiscoveredModel[]>();

		const [openaiModels, anthropicModels, geminiModels, openrouterModels] = await Promise.all([
			this.discoverOpenAIModels(),
			this.discoverAnthropicModels(),
			this.discoverGeminiModels(),
			this.discoverOpenRouterModels(),
		]);

		if (openaiModels.length > 0) { results.set('openai', openaiModels); }
		if (anthropicModels.length > 0) { results.set('anthropic', anthropicModels); }
		if (geminiModels.length > 0) { results.set('google-gemini', geminiModels); }
		if (openrouterModels.length > 0) { results.set('openrouter', openrouterModels); }

		return results;
	}

	/**
	 * OpenAI: GET /v1/models — returns all models accessible with the current API key.
	 */
	private async discoverOpenAIModels(): Promise<DiscoveredModel[]> {
		const hasKey = await this.credentialStore.hasKey('openai');
		if (!hasKey) { return []; }

		try {
			const apiKey = await this.credentialStore.getKey('openai');
			if (!apiKey) { return []; }

			const response = await this.fetchWithTimeout(
				'https://api.openai.com/v1/models',
				DynamicModelDiscoveryService.ENDPOINT_TIMEOUT_MS,
				{ 'Authorization': `Bearer ${apiKey}` },
			);

			if (!response.ok) {
				this.logService.warn(`[ModelDiscovery] OpenAI /v1/models returned ${response.status}`);
				return [];
			}

			const json = await response.json();
			const models: DiscoveredModel[] = [];

			if (json.data && Array.isArray(json.data)) {
				for (const model of json.data) {
					const id: string = model.id || '';
					if (!id) { continue; }

					// Skip embedding / TTS / DALL-E models — only include chat-capable ones
					if (this.isNonChatModel(id)) { continue; }

					const contextLength = this.estimateOpenAIContext(id);
					const family = this.categorizeOpenAIFamily(id);

					models.push({
						id,
						name: id,
						providerId: 'openai',
						family,
						contextLength,
						capabilities: {
							supportsToolUse: this.isOpenAIToolCapable(id),
							supportsVision: this.isOpenAIVisionCapable(id),
							supportsStreaming: true,
						},
					});
				}
			}

			this._providerModels.set('openai', models);
			this.logService.info(`[ModelDiscovery] Discovered ${models.length} OpenAI models`);
			return models;
		} catch (error: any) {
			this.logService.debug(`[ModelDiscovery] OpenAI discovery failed: ${error?.message || 'unknown'}`);
			return [];
		}
	}

	/**
	 * Anthropic: The Anthropic API does not expose a public /v1/models endpoint
	 * that lists available models, so we use the known model list from the
	 * provider config and validate each model by making a lightweight request.
	 * As a pragmatic fallback, we return the static known models for Anthropic
	 * since they have a small, well-defined catalog.
	 */
	private async discoverAnthropicModels(): Promise<DiscoveredModel[]> {
		const hasKey = await this.credentialStore.hasKey('anthropic');
		if (!hasKey) { return []; }

		try {
			const apiKey = await this.credentialStore.getKey('anthropic');
			if (!apiKey) { return []; }

			// Anthropic does not have a /v1/models endpoint, so we attempt to
			// fetch from a community-compatible endpoint or fall back to the
			// static known models.
			let models: DiscoveredModel[] = [];

			try {
				const response = await this.fetchWithTimeout(
					'https://api.anthropic.com/v1/models',
					DynamicModelDiscoveryService.ENDPOINT_TIMEOUT_MS,
					{
						'x-api-key': apiKey,
						'anthropic-version': '2023-06-01',
					},
				);

				if (response.ok) {
					const json = await response.json();
					if (json.data && Array.isArray(json.data)) {
						for (const model of json.data) {
							const id: string = model.id || '';
							if (!id) { continue; }
							models.push({
								id,
								name: id,
								providerId: 'anthropic',
								family: this.categorizeAnthropicFamily(id),
								contextLength: this.estimateAnthropicContext(id),
								capabilities: {
									supportsToolUse: true, // All modern Claude models support tool use
									supportsVision: true,  // All modern Claude models support vision
									supportsStreaming: true,
								},
							});
						}
					}
				}
			} catch {
				// Anthropic /v1/models not available — fall through to static list
			}

			// If the API didn't return models, use the provider's supportedModels config
			if (models.length === 0) {
				const config = this.llmProviderService.getProvider('anthropic');
				const supportedModels = config?.supportedModels || [];
				for (const modelId of supportedModels) {
					models.push({
						id: modelId,
						name: modelId,
						providerId: 'anthropic',
						family: this.categorizeAnthropicFamily(modelId),
						contextLength: this.estimateAnthropicContext(modelId),
						capabilities: {
							supportsToolUse: true,
							supportsVision: true,
							supportsStreaming: true,
						},
					});
				}
			}

			this._providerModels.set('anthropic', models);
			this.logService.info(`[ModelDiscovery] Discovered ${models.length} Anthropic models`);
			return models;
		} catch (error: any) {
			this.logService.debug(`[ModelDiscovery] Anthropic discovery failed: ${error?.message || 'unknown'}`);
			return [];
		}
	}

	/**
	 * Google Gemini: GET /v1beta/models — returns all models accessible with the API key.
	 */
	private async discoverGeminiModels(): Promise<DiscoveredModel[]> {
		const hasKey = await this.credentialStore.hasKey('google-gemini');
		if (!hasKey) { return []; }

		try {
			const apiKey = await this.credentialStore.getKey('google-gemini');
			if (!apiKey) { return []; }

			const response = await this.fetchWithTimeout(
				`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`,
				DynamicModelDiscoveryService.ENDPOINT_TIMEOUT_MS,
			);

			if (!response.ok) {
				this.logService.warn(`[ModelDiscovery] Gemini /v1beta/models returned ${response.status}`);
				return [];
			}

			const json = await response.json();
			const models: DiscoveredModel[] = [];

			if (json.models && Array.isArray(json.models)) {
				for (const model of json.models) {
					const name: string = model.name || ''; // e.g. "models/gemini-2.0-flash"
					if (!name) { continue; }

					// Strip "models/" prefix if present
					const id = name.replace(/^models\//, '');
					// Only include generative models (skip embedding, etc.)
					if (!model.supportedGenerationMethods?.includes('generateContent')) { continue; }

					const displayName: string = model.displayName || id;
					const contextLength = model.inputTokenLimit || this.estimateGeminiContext(id);

					models.push({
						id,
						name: displayName,
						providerId: 'google-gemini',
						family: this.categorizeGeminiFamily(id),
						contextLength,
						capabilities: {
							supportsToolUse: this.isGeminiToolCapable(id),
							supportsVision: this.isGeminiVisionCapable(id),
							supportsStreaming: true,
						},
					});
				}
			}

			this._providerModels.set('google-gemini', models);
			this.logService.info(`[ModelDiscovery] Discovered ${models.length} Gemini models`);
			return models;
		} catch (error: any) {
			this.logService.debug(`[ModelDiscovery] Gemini discovery failed: ${error?.message || 'unknown'}`);
			return [];
		}
	}

	/**
	 * OpenRouter: GET /v1/models — returns all models accessible through OpenRouter.
	 * This is the richest discovery source as OpenRouter aggregates hundreds of models.
	 */
	private async discoverOpenRouterModels(): Promise<DiscoveredModel[]> {
		const hasKey = await this.credentialStore.hasKey('openrouter');
		if (!hasKey) { return []; }

		try {
			const apiKey = await this.credentialStore.getKey('openrouter');
			if (!apiKey) { return []; }

			const response = await this.fetchWithTimeout(
				'https://openrouter.ai/api/v1/models',
				DynamicModelDiscoveryService.ENDPOINT_TIMEOUT_MS,
				{ 'Authorization': `Bearer ${apiKey}` },
			);

			if (!response.ok) {
				this.logService.warn(`[ModelDiscovery] OpenRouter /v1/models returned ${response.status}`);
				return [];
			}

			const json = await response.json();
			const models: DiscoveredModel[] = [];

			if (json.data && Array.isArray(json.data)) {
				for (const model of json.data) {
					const id: string = model.id || '';
					if (!id) { continue; }

					const contextLength = model.context_length || 8192;
					const displayName: string = model.name || id;

					models.push({
						id,
						name: displayName,
						providerId: 'openrouter',
						family: this.categorizeOpenRouterFamily(id),
						contextLength,
						capabilities: {
							supportsToolUse: model.supported_parameters?.includes('tools') ?? false,
							supportsVision: model.architecture?.modality?.includes('image') ?? false,
							supportsStreaming: true,
						},
					});
				}
			}

			this._providerModels.set('openrouter', models);
			this.logService.info(`[ModelDiscovery] Discovered ${models.length} OpenRouter models`);
			return models;
		} catch (error: any) {
			this.logService.debug(`[ModelDiscovery] OpenRouter discovery failed: ${error?.message || 'unknown'}`);
			return [];
		}
	}

	// =================================================================
	// Aggregated Discovery
	// =================================================================

	async discoverAllLocalModels(): Promise<Map<string, DiscoveredModel[]>> {
		const results = new Map<string, DiscoveredModel[]>();

		const [ollamaModels, lmStudioModels, proximaModels] = await Promise.all([
			this.discoverOllamaModels(),
			this.discoverLMStudioModels(),
			this.discoverProximaModels(),
		]);

		if (ollamaModels.length > 0) { results.set('ollama', ollamaModels); }
		if (lmStudioModels.length > 0) { results.set('lm-studio', lmStudioModels); }
		if (proximaModels.length > 0) { results.set('proxima', proximaModels); }

		this.logService.info(`[ModelDiscovery] Discovered models from ${results.size} local providers`);
		return results;
	}

	async discoverAllModels(): Promise<Map<string, DiscoveredModel[]>> {
		const results = new Map<string, DiscoveredModel[]>();

		// Run local + cloud discovery in parallel
		const [localResults, cloudResults] = await Promise.all([
			this.discoverAllLocalModels(),
			this.discoverCloudModels(),
		]);

		// Merge local results
		for (const [providerId, models] of localResults) {
			results.set(providerId, models);
		}

		// Merge cloud results
		for (const [providerId, models] of cloudResults) {
			results.set(providerId, models);
		}

		this.logService.info(`[ModelDiscovery] Full discovery: ${results.size} providers`);
		return results;
	}

	async isEndpointReachable(endpoint: string): Promise<boolean> {
		try {
			const baseUrl = endpoint.replace(/\/api$/, '/').replace(/\/v1$/, '/');
			const response = await this.fetchWithTimeout(baseUrl, 3000);
			return response.ok;
		} catch {
			return false;
		}
	}

	// =================================================================
	// Diff + Event Emission
	// =================================================================

	/**
	 * Merge freshly-discovered models into the index, compute the diff
	 * (newly added, newly removed) and fire the corresponding events.
	 */
	private _mergeAndEmit(allModels: Map<string, DiscoveredModel[]>): void {
		const newIndex = new Map<string, DiscoveredModel>();

		for (const [, models] of allModels) {
			for (const model of models) {
				const key = `${model.providerId}:${model.id}`;
				newIndex.set(key, model);
			}
		}

		// Compute newly discovered models (in new but not in old)
		const discovered: DiscoveredModel[] = [];
		for (const [key, model] of newIndex) {
			if (!this._modelIndex.has(key)) {
				discovered.push(model);
			}
		}

		// Compute removed models (in old but not in new)
		const removed: DiscoveredModel[] = [];
		for (const [key, model] of this._modelIndex) {
			if (!newIndex.has(key)) {
				removed.push(model);
			}
		}

		// Swap the index
		this._modelIndex.clear();
		for (const [key, model] of newIndex) {
			this._modelIndex.set(key, model);
		}

		// Fire events
		if (discovered.length > 0) {
			this._onDidDiscoverModels.fire(discovered);
			this.logService.info(`[ModelDiscovery] ${discovered.length} new models discovered`);
		}
		if (removed.length > 0) {
			this._onDidRemoveModels.fire(removed);
			this.logService.info(`[ModelDiscovery] ${removed.length} models removed`);
		}
	}

	// =================================================================
	// HTTP Helper
	// =================================================================

	private async fetchWithTimeout(
		url: string,
		timeoutMs: number,
		headers?: Record<string, string>,
	): Promise<Response> {
		const controller = new AbortController();
		const timeout = setTimeout(() => controller.abort(), timeoutMs);

		try {
			const response = await fetch(url, {
				method: 'GET',
				headers: headers || {},
				signal: controller.signal,
			});
			return response;
		} finally {
			clearTimeout(timeout);
		}
	}

	// =================================================================
	// Ollama-specific helpers
	// =================================================================

	private extractOllamaFamily(modelName: string, reportedFamily?: string): string {
		if (reportedFamily) { return reportedFamily.toLowerCase(); }

		const base = modelName.split(':')[0].toLowerCase();

		for (const family of OLLAMA_TOOL_CAPABLE_FAMILIES) {
			if (base === family || base.startsWith(family)) {
				return family;
			}
		}
		for (const family of OLLAMA_VISION_CAPABLE_FAMILIES) {
			if (base === family || base.startsWith(family)) {
				return family;
			}
		}

		return base;
	}

	private isOllamaToolCapable(family: string, name: string): boolean {
		for (const capableFamily of OLLAMA_TOOL_CAPABLE_FAMILIES) {
			if (family === capableFamily || name.toLowerCase().startsWith(capableFamily)) {
				return true;
			}
		}
		return false;
	}

	private isOllamaVisionCapable(family: string, name: string): boolean {
		for (const capableFamily of OLLAMA_VISION_CAPABLE_FAMILIES) {
			if (family === capableFamily || name.toLowerCase().startsWith(capableFamily)) {
				return true;
			}
		}
		return false;
	}

	private estimateOllamaContext(modelName: string): number {
		const lower = modelName.toLowerCase();

		if (lower.includes('llama3.1') || lower.includes('llama3.2') || lower.includes('llama3.3') || lower.includes('llama4')) {
			return 131072;
		}
		if (lower.includes('qwen2.5') || lower.includes('qwen3')) {
			return 131072;
		}
		if (lower.includes('mistral-nemo') || lower.includes('mistral-large')) {
			return 131072;
		}
		if (lower.includes('phi3.5') || lower.includes('phi4')) {
			return 131072;
		}
		if (lower.includes('command-r')) {
			return 131072;
		}
		if (lower.includes('deepseek-coder-v2') || lower.includes('deepseek-r1')) {
			return 131072;
		}
		if (lower.includes('mistral') || lower.includes('mixtral') || lower.includes('qwen2')) {
			return 32768;
		}
		if (lower.includes('codellama')) {
			return 16384;
		}

		return 8192;
	}

	// =================================================================
	// OpenAI-specific helpers
	// =================================================================

	/** Filter out non-chat models (embeddings, TTS, DALL-E, whisper, etc.) */
	private isNonChatModel(id: string): boolean {
		const lower = id.toLowerCase();
		return (
			lower.includes('embed') ||
			lower.includes('tts') ||
			lower.includes('dall-e') ||
			lower.includes('dalle') ||
			lower.includes('whisper') ||
			lower.includes('moderation') ||
			lower.includes('audio') ||
			lower.includes('realtime') ||
			lower.includes('search') ||
			lower.startsWith('text-') // legacy text-davinci etc.
		);
	}

	private estimateOpenAIContext(id: string): number {
		const lower = id.toLowerCase();
		if (lower.startsWith('o1') || lower.startsWith('o3')) { return 200000; }
		if (lower.includes('gpt-4o')) { return 128000; }
		if (lower.includes('gpt-4-turbo')) { return 128000; }
		if (lower.includes('gpt-4-32k')) { return 32768; }
		if (lower.includes('gpt-4')) { return 8192; }
		if (lower.includes('gpt-3.5-turbo-16k')) { return 16384; }
		if (lower.includes('gpt-3.5')) { return 4096; }
		return 128000; // Default for newer models
	}

	private categorizeOpenAIFamily(id: string): string {
		const lower = id.toLowerCase();
		if (lower.startsWith('o1') || lower.startsWith('o3')) { return 'o-series'; }
		if (lower.includes('gpt-4o')) { return 'gpt-4o'; }
		if (lower.includes('gpt-4-turbo')) { return 'gpt-4-turbo'; }
		if (lower.includes('gpt-4')) { return 'gpt-4'; }
		if (lower.includes('gpt-3.5')) { return 'gpt-3.5'; }
		return 'openai';
	}

	private isOpenAIToolCapable(id: string): boolean {
		const lower = id.toLowerCase();
		// All modern GPT-4+ models support tool use; GPT-3.5-turbo also does
		return lower.includes('gpt-4') || lower.includes('gpt-3.5-turbo') || lower.startsWith('o1') || lower.startsWith('o3');
	}

	private isOpenAIVisionCapable(id: string): boolean {
		const lower = id.toLowerCase();
		return lower.includes('gpt-4o') || lower.includes('gpt-4-turbo') || lower.startsWith('o1') || lower.startsWith('o3');
	}

	// =================================================================
	// Anthropic-specific helpers
	// =================================================================

	private categorizeAnthropicFamily(id: string): string {
		const lower = id.toLowerCase();
		if (lower.includes('opus')) { return 'claude-opus'; }
		if (lower.includes('sonnet')) { return 'claude-sonnet'; }
		if (lower.includes('haiku')) { return 'claude-haiku'; }
		return 'claude';
	}

	private estimateAnthropicContext(id: string): number {
		const lower = id.toLowerCase();
		if (lower.includes('sonnet-4') || lower.includes('3-5-sonnet') || lower.includes('3.5-sonnet')) { return 200000; }
		if (lower.includes('opus')) { return 200000; }
		if (lower.includes('haiku')) { return 200000; }
		return 200000; // All modern Claude models support 200K
	}

	// =================================================================
	// Gemini-specific helpers
	// =================================================================

	private categorizeGeminiFamily(id: string): string {
		const lower = id.toLowerCase();
		if (lower.includes('gemini-2')) { return 'gemini-2'; }
		if (lower.includes('gemini-1.5-pro')) { return 'gemini-1.5-pro'; }
		if (lower.includes('gemini-1.5-flash')) { return 'gemini-1.5-flash'; }
		if (lower.includes('gemini-1.0')) { return 'gemini-1.0'; }
		return 'gemini';
	}

	private estimateGeminiContext(id: string): number {
		const lower = id.toLowerCase();
		if (lower.includes('1.5-pro')) { return 2097152; }
		if (lower.includes('1.5-flash')) { return 1048576; }
		if (lower.includes('2.0-flash-lite')) { return 1048576; }
		if (lower.includes('2.0') || lower.includes('2.5')) { return 1048576; }
		return 32768;
	}

	private isGeminiToolCapable(id: string): boolean {
		const lower = id.toLowerCase();
		// All Gemini 1.5+ models support function calling
		return lower.includes('gemini-1.5') || lower.includes('gemini-2') || lower.includes('gemini-2.5');
	}

	private isGeminiVisionCapable(id: string): boolean {
		const lower = id.toLowerCase();
		// All Gemini 1.5+ models support vision
		return lower.includes('gemini-1.5') || lower.includes('gemini-2') || lower.includes('gemini-2.5');
	}

	// =================================================================
	// OpenRouter-specific helpers
	// =================================================================

	private categorizeOpenRouterFamily(id: string): string {
		const lower = id.toLowerCase();
		if (lower.includes('claude')) { return 'claude'; }
		if (lower.includes('gpt')) { return 'gpt'; }
		if (lower.includes('gemini')) { return 'gemini'; }
		if (lower.includes('llama')) { return 'llama'; }
		if (lower.includes('mistral') || lower.includes('mixtral')) { return 'mistral'; }
		if (lower.includes('deepseek')) { return 'deepseek'; }
		if (lower.includes('qwen')) { return 'qwen'; }
		if (lower.includes('phi')) { return 'phi'; }
		return 'other';
	}
}
