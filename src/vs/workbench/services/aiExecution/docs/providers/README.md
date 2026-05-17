# Multi-LLM Provider System

## Overview

Phase 25 introduces a real multi-LLM provider system that allows the AI Execution Kernel to connect to multiple LLM backends, switch between them at runtime, and handle failures gracefully with fallback chains.

## Supported Providers

| Provider | Type | Local | Status | Notes |
|----------|------|-------|--------|-------|
| OpenAI | Cloud | No | Full | Complete API integration with streaming |
| Anthropic | Cloud | No | Full | Complete API integration with streaming |
| Google Gemini | Cloud | No | Partial | Different API format, translation layer needed |
| OpenRouter | Cloud | No | Full | OpenAI-compatible API, multi-model access |
| Ollama | Local | Yes | Partial | Requires daemon running on localhost |
| LM Studio | Local | Yes | Partial | Requires server mode, OpenAI-compatible |
| Generic | Cloud/Local | Varies | Partial | User-provided endpoint, OpenAI-compatible |

## Services

### ILLMProviderService (#140)
Core provider management. Registers providers, sends requests with real HTTP calls, handles provider switching and fallback chains.

### IModelRegistryService (#141)
Model catalog and selection. Maintains a registry of available models with capabilities, pricing, and context window information.

### ICredentialStoreService (#142)
Encrypted API key management using VS Code's SecretStorage API. Keys are never logged or exposed in plain text.

### ILLMStreamingService (#143)
Real-time token streaming using ReadableStream API. Supports SSE parsing for OpenAI, Anthropic, and Ollama formats.

### IProviderHealthService (#144)
Provider reliability tracking with success/failure rates, latency percentiles, and circuit-break patterns.

## API Key Management

API keys are stored using VS Code's built-in SecretStorage, which uses the operating system's credential store (Keychain on macOS, Credential Manager on Windows, libsecret on Linux).

To configure an API key:
1. Open VS Code Settings
2. Search for "AI Execution"
3. Enter your API key in the provider-specific setting

Keys are validated by making a minimal test request to the provider.

## Fallback Chains

When a provider fails, the system can automatically try the next provider in a configured chain:

```typescript
const chain: FallbackChainConfig = {
  providers: ['openai', 'anthropic', 'openrouter'],
  behavior: FallbackBehavior.RetryThenFallback,
  maxRetriesPerProvider: 2,
  retryDelayMs: 1000,
  failOpenAfterMs: 60000,
};
```

## Honest Limitations

- **Token counting**: Uses heuristic (4 chars/token Latin, 1.5 CJK). Real tokenization requires tiktoken (not available in browser).
- **Streaming**: May degrade to buffered responses in some VS Code webview contexts.
- **Gemini**: Different API format; request translation layer required and may not handle all features.
- **Local models**: Require respective daemons running on localhost. Connection failures are expected when daemons are not running.
- **Rate limiting**: Detected from API responses (429 status), not proactively managed.
