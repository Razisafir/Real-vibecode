/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Real Vibecode Project. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

/**
 * dynamicModelDiscoveryService.ts -- Runtime Model Discovery for Local Providers
 *
 * Dynamically discovers available models from Ollama (/api/tags),
 * LM Studio (/v1/models), and Proxima (/v1/models) endpoints.
 *
 * Instead of relying on hardcoded model lists, this service queries the actual
 * running local providers at runtime and updates the model registry with
 * discovered models and their capabilities.
 */

import { Disposable } from '../../../../base/common/lifecycle.js';
import { Emitter } from '../../../../base/common/event.js';
import { ILogService } from '../../../../platform/log/common/log.js';

import {
	IDynamicModelDiscoveryService, DiscoveredModel,
	OLLAMA_TOOL_CAPABLE_FAMILIES, OLLAMA_VISION_CAPABLE_FAMILIES,
} from '../common/llmProvider.js';

// =====================================================================
// Dynamic Model Discovery Service
// =====================================================================

export class DynamicModelDiscoveryService extends Disposable implements IDynamicModelDiscoveryService {
	declare readonly _serviceBrand: undefined;

	private readonly _discoveredModels = new Map<string, DiscoveredModel[]>();
	private _lastDiscoveryTime = 0;
	private static readonly DISCOVERY_CACHE_MS = 30_000; // Cache for 30 seconds

	constructor(@ILogService private readonly logService: ILogService) {
		super();
		this.logService.info('[ModelDiscovery] Initialized');
	}

	async discoverOllamaModels(): Promise<DiscoveredModel[]> {
		const cacheKey = 'ollama';
		const cached = this._discoveredModels.get(cacheKey);
		if (cached && Date.now() - this._lastDiscoveryTime < DynamicModelDiscoveryService.DISCOVERY_CACHE_MS) {
			return cached;
		}

		try {
			const controller = new AbortController();
			const timeout = setTimeout(() => controller.abort(), 5000);

			const response = await fetch('http://localhost:11434/api/tags', {
				method: 'GET',
				signal: controller.signal,
			});
			clearTimeout(timeout);

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
						name: name,
						providerId: 'ollama',
						size: model.size,
						quantization: model.details?.quantization_level,
						family: family,
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

			this._discoveredModels.set(cacheKey, models);
			this._lastDiscoveryTime = Date.now();
			this.logService.info(`[ModelDiscovery] Discovered ${models.length} Ollama models`);
			return models;
		} catch (error: any) {
			this.logService.debug(`[ModelDiscovery] Ollama not reachable: ${error?.message || 'unknown'}`);
			return [];
		}
	}

	async discoverLMStudioModels(): Promise<DiscoveredModel[]> {
		const cacheKey = 'lm-studio';
		const cached = this._discoveredModels.get(cacheKey);
		if (cached && Date.now() - this._lastDiscoveryTime < DynamicModelDiscoveryService.DISCOVERY_CACHE_MS) {
			return cached;
		}

		try {
			const controller = new AbortController();
			const timeout = setTimeout(() => controller.abort(), 5000);

			const response = await fetch('http://localhost:1234/v1/models', {
				method: 'GET',
				signal: controller.signal,
			});
			clearTimeout(timeout);

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
						contextLength: 8192, // LM Studio doesn't report context length; use default
						capabilities: {
							supportsToolUse: true, // LM Studio supports tool use for compatible models
							supportsVision: false, // Conservative default; can be updated per-model
							supportsStreaming: true,
						},
					});
				}
			}

			this._discoveredModels.set(cacheKey, models);
			this._lastDiscoveryTime = Date.now();
			this.logService.info(`[ModelDiscovery] Discovered ${models.length} LM Studio models`);
			return models;
		} catch (error: any) {
			this.logService.debug(`[ModelDiscovery] LM Studio not reachable: ${error?.message || 'unknown'}`);
			return [];
		}
	}

	async discoverProximaModels(): Promise<DiscoveredModel[]> {
		const cacheKey = 'proxima';
		const cached = this._discoveredModels.get(cacheKey);
		if (cached && Date.now() - this._lastDiscoveryTime < DynamicModelDiscoveryService.DISCOVERY_CACHE_MS) {
			return cached;
		}

		try {
			const controller = new AbortController();
			const timeout = setTimeout(() => controller.abort(), 5000);

			const response = await fetch('http://localhost:3210/v1/models', {
				method: 'GET',
				signal: controller.signal,
			});
			clearTimeout(timeout);

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
						contextLength: 128000, // Proxima default context
						capabilities: {
							supportsToolUse: true,
							supportsVision: true,
							supportsStreaming: true,
						},
					});
				}
			}

			this._discoveredModels.set(cacheKey, models);
			this._lastDiscoveryTime = Date.now();
			this.logService.info(`[ModelDiscovery] Discovered ${models.length} Proxima models`);
			return models;
		} catch (error: any) {
			this.logService.debug(`[ModelDiscovery] Proxima not reachable: ${error?.message || 'unknown'}`);
			return [];
		}
	}

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

	async isEndpointReachable(endpoint: string): Promise<boolean> {
		try {
			const controller = new AbortController();
			const timeout = setTimeout(() => controller.abort(), 3000);
			const baseUrl = endpoint.replace('/api', '/').replace('/v1', '/');
			const response = await fetch(baseUrl, {
				method: 'GET',
				signal: controller.signal,
			});
			clearTimeout(timeout);
			return response.ok;
		} catch {
			return false;
		}
	}

	// ---- Ollama-specific helpers ----

	private extractOllamaFamily(modelName: string, reportedFamily?: string): string {
		if (reportedFamily) { return reportedFamily.toLowerCase(); }

		// Extract family from model name
		// e.g. "llama3.1:70b" -> "llama3.1", "mistral-nemo" -> "mistral-nemo"
		const base = modelName.split(':')[0].toLowerCase();

		// Check against known families
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

		// Newer models with 128K+ context
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

		// Models with 32K context
		if (lower.includes('mistral') || lower.includes('mixtral') || lower.includes('qwen2')) {
			return 32768;
		}

		// Models with 16K context
		if (lower.includes('codellama')) {
			return 16384;
		}

		// Default: 8K
		return 8192;
	}
}
