/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

/**
 * streamingBridgeService.ts -- Webview Streaming Bridge
 * Real Vibecode -- AI-Native IDE
 *
 * Bridges LLM streaming from the extension host to webview panels via postMessage.
 *
 * PROBLEM:
 *   VS Code webviews run in an iframe with restricted network access.
 *   The existing LLMStreamingService uses fetch() + ReadableStream directly,
 *   which does not work reliably in webview contexts because:
 *     - Webviews cannot always reach external API endpoints directly
 *     - CORS restrictions are amplified in the webview sandbox
 *     - Some API providers block requests from non-standard origins
 *
 * SOLUTION:
 *   This service acts as a bridge: the webview sends a "startStream" message
 *   to the extension host, which performs the real HTTP streaming. The extension
 *   host relays each chunk back to the webview via postMessage. The webview
 *   side collects these chunks and exposes them as an AsyncIterable<StreamChunk>,
 *   matching the same interface consumers already use.
 *
 * postMessage Protocol:
 *   Webview -> Extension Host:
 *     { type: 'startStream', requestId: string, providerId: string, request: LLMRequest }
 *     { type: 'cancelStream', requestId: string }
 *
 *   Extension Host -> Webview:
 *     { type: 'streamChunk', requestId: string, chunk: StreamChunk }
 *
 * Service #145: IStreamingBridgeService
 */

import { Disposable } from '../../../../base/common/lifecycle.js';
import { Emitter } from '../../../../base/common/event.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { StreamChunk, StreamChunkType, LLMRequest } from '../common/llmProvider.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';

// -- Service Identifier --

export const IStreamingBridgeService = createDecorator<IStreamingBridgeService>('streamingBridgeService');

// -- Constants --

/** Maximum time to wait for a chunk before emitting a timeout error (30 seconds). */
const CHUNK_TIMEOUT_MS = 30_000;

/** Maximum time to wait for the first chunk after initiating a stream (60 seconds). */
const INITIAL_CHUNK_TIMEOUT_MS = 60_000;

// -- Types --

/**
 * Internal controller that manages the lifecycle of a single streaming request.
 * Holds the resolve/reject callbacks for the async iterator and tracks state.
 */
interface StreamController {
	/** Unique identifier for this stream request. */
	readonly requestId: string;
	/** Provider ID the stream is routed to. */
	readonly providerId: string;
	/** The original LLM request. */
	readonly request: LLMRequest;
	/** Queue of chunks waiting to be consumed by the async iterator. */
	readonly pendingChunks: StreamChunk[];
	/** Resolve callback for the promise that the iterator awaits. */
	resolveNext: ((value: IteratorResult<StreamChunk>) => void) | null;
	/** Reject callback for the promise that the iterator awaits. */
	rejectNext: ((error: Error) => void) | null;
	/** Whether the stream has completed (done chunk received, error, or cancelled). */
	completed: boolean;
	/** Timer handle for the per-chunk timeout. */
	timeoutHandle: ReturnType<typeof setTimeout> | null;
	/** Timestamp of the last received chunk. */
	lastChunkAt: number;
	/** Cumulative count of chunks received. */
	chunkCount: number;
	/** Whether this stream was explicitly cancelled. */
	cancelled: boolean;
}

/**
 * Message shape sent from the webview to the extension host to start a stream.
 */
export interface StartStreamMessage {
	readonly type: 'startStream';
	readonly requestId: string;
	readonly providerId: string;
	readonly request: LLMRequest;
}

/**
 * Message shape sent from the extension host to the webview with a streaming chunk.
 */
export interface StreamChunkMessage {
	readonly type: 'streamChunk';
	readonly requestId: string;
	readonly chunk: StreamChunk;
}

/**
 * Message shape sent from the webview to the extension host to cancel a stream.
 */
export interface CancelStreamMessage {
	readonly type: 'cancelStream';
	readonly requestId: string;
}

/**
 * Union type for all postMessage messages in the streaming bridge protocol.
 */
export type StreamingBridgeMessage =
	| StartStreamMessage
	| StreamChunkMessage
	| CancelStreamMessage;

// -- Interface --

/**
 * IStreamingBridgeService -- Bridges LLM streaming from extension host to webview.
 *
 * REAL responsibilities:
 *   - Initiate streaming requests from the webview by posting "startStream" messages
 *   - Receive streaming chunks from the extension host via window message events
 *   - Expose an AsyncIterable<StreamChunk> that yields chunks as they arrive
 *   - Handle per-chunk timeout (30s) with automatic error emission and cleanup
 *   - Support cancellation of in-progress streams
 *   - Track active streams and clean up listeners on completion/cancellation/dispose
 *
 * This service is designed to run inside a VS Code webview panel where direct
 * fetch() streaming is unreliable. All network I/O happens on the extension host
 * side; this service only handles the postMessage relay.
 */
export interface IStreamingBridgeService {
	readonly _serviceBrand: undefined;

	/**
	 * Initiate a streaming request and return an AsyncIterable that yields
	 * chunks as they arrive via postMessage from the extension host.
	 *
	 * The caller should use `for await (const chunk of stream)` to consume.
	 * The iterable completes when a chunk with `done: true` is received,
	 * or when a timeout/cancellation occurs (in which case an error chunk
	 * is yielded before terminating).
	 *
	 * @param providerId The LLM provider to route the request to.
	 * @param request The LLM request to stream.
	 * @returns An async iterable of StreamChunk objects.
	 */
	streamViaBridge(providerId: string, request: LLMRequest): AsyncIterable<StreamChunk>;

	/**
	 * Cancel an in-progress stream by requestId.
	 * Sends a "cancelStream" message to the extension host and
	 * terminates the local async iterator with a done chunk.
	 *
	 * @param requestId The ID of the stream to cancel.
	 */
	cancelStream(requestId: string): void;

	/**
	 * The set of currently active stream request IDs.
	 */
	readonly activeStreams: ReadonlySet<string>;

	/**
	 * Event fired when a stream completes (done, error, or cancelled).
	 */
	readonly onStreamCompleted: Event<{ requestId: string; chunkCount: number; durationMs: number; cancelled: boolean }>;

	/**
	 * Event fired when a stream times out waiting for a chunk.
	 */
	readonly onStreamTimeout: Event<{ requestId: string; waitedMs: number }>;
}

// -- Implementation --

export class StreamingBridgeService extends Disposable implements IStreamingBridgeService {
	declare readonly _serviceBrand: undefined;

	// -- Event emitters --

	private readonly _onStreamCompleted = this._register(new Emitter<{ requestId: string; chunkCount: number; durationMs: number; cancelled: boolean }>());
	readonly onStreamCompleted = this._onStreamCompleted.event;

	private readonly _onStreamTimeout = this._register(new Emitter<{ requestId: string; waitedMs: number }>());
	readonly onStreamTimeout = this._onStreamTimeout.event;

	// -- Active stream tracking --

	private readonly _activeControllers = new Map<string, StreamController>();
	private readonly _activeStreamIds = new Set<string>();
	private _messageListenerBound = false;
	private _messageListener: ((event: MessageEvent) => void) | null = null;

	constructor(
		@ILogService private readonly logService: ILogService,
	) {
		super();

		this._ensureMessageListener();
		this.logService.trace('[StreamingBridge] Service initialized');
	}

	get activeStreams(): ReadonlySet<string> { return this._activeStreamIds; }

	// -- Public API --

	/**
	 * Initiate a streaming request through the postMessage bridge.
	 *
	 * Sends a "startStream" message to the extension host, then returns an
	 * AsyncIterable that yields StreamChunk objects as they arrive via
	 * window message events.
	 *
	 * Timeout behavior:
	 *   - First chunk: 60 second timeout (server may be slow to respond)
	 *   - Subsequent chunks: 30 second timeout (expect regular delivery)
	 *   - On timeout, an error chunk is yielded and the stream terminates.
	 *
	 * Cancellation:
	 *   - Call cancelStream(requestId) at any time to terminate the stream.
	 *   - A done chunk is yielded to cleanly terminate the iterator.
	 */
	streamViaBridge(providerId: string, request: LLMRequest): AsyncIterable<StreamChunk> {
		const requestId = request.requestId;

		// Guard against duplicate request IDs
		if (this._activeControllers.has(requestId)) {
			this.logService.warn(`[StreamingBridge] Duplicate stream request: ${requestId}. Replacing existing stream.`);
			this.cancelStream(requestId);
		}

		// Create the controller
		const controller: StreamController = {
			requestId,
			providerId,
			request,
			pendingChunks: [],
			resolveNext: null,
			rejectNext: null,
			completed: false,
			timeoutHandle: null,
			lastChunkAt: Date.now(),
			chunkCount: 0,
			cancelled: false,
		};

		this._activeControllers.set(requestId, controller);
		this._activeStreamIds.add(requestId);

		// Send startStream message to extension host
		const startMessage: StartStreamMessage = {
			type: 'startStream',
			requestId,
			providerId,
			request,
		};

		this._postMessage(startMessage);

		this.logService.info(`[StreamingBridge] Stream started: requestId=${requestId}, providerId=${providerId}, model=${request.model}`);

		// Start the initial chunk timeout
		this._startChunkTimeout(controller, INITIAL_CHUNK_TIMEOUT_MS);

		// Return the async iterable
		return this._createAsyncIterable(controller);
	}

	/**
	 * Cancel an in-progress stream.
	 *
	 * Sends a "cancelStream" message to the extension host and terminates
	 * the local async iterator by pushing a done chunk.
	 */
	cancelStream(requestId: string): void {
		const controller = this._activeControllers.get(requestId);
		if (!controller) {
			this.logService.warn(`[StreamingBridge] cancelStream: unknown requestId=${requestId}`);
			return;
		}

		if (controller.completed) {
			this.logService.trace(`[StreamingBridge] cancelStream: stream already completed, requestId=${requestId}`);
			return;
		}

		controller.cancelled = true;

		// Send cancelStream message to extension host
		const cancelMessage: CancelStreamMessage = {
			type: 'cancelStream',
			requestId,
		};

		this._postMessage(cancelMessage);

		// Push a done chunk to terminate the iterator cleanly
		this._enqueueChunk(controller, {
			type: StreamChunkType.Done,
			done: true,
		});

		this.logService.info(`[StreamingBridge] Stream cancelled: requestId=${requestId}`);
	}

	// -- Message handling --

	/**
	 * Ensure the window message listener is registered.
	 * We bind once and filter by message type to avoid duplicate listeners.
	 */
	private _ensureMessageListener(): void {
		if (this._messageListenerBound) {
			return;
		}
		this._messageListenerBound = true;

		this._messageListener = (event: MessageEvent) => {
			this._handleMessage(event);
		};

		window.addEventListener('message', this._messageListener);
	}

	/**
	 * Handle incoming postMessage events from the extension host.
	 * Filters for "streamChunk" messages and routes them to the appropriate controller.
	 */
	private _handleMessage(event: MessageEvent): void {
		const data = event.data;
		if (!data || typeof data !== 'object') {
			return;
		}

		// Only handle streamChunk messages
		if (data.type !== 'streamChunk') {
			return;
		}

		const message = data as StreamChunkMessage;
		const controller = this._activeControllers.get(message.requestId);
		if (!controller) {
			// Stale chunk for a completed/cancelled stream -- ignore
			this.logService.trace(`[StreamingBridge] Received chunk for unknown stream: requestId=${message.requestId}`);
			return;
		}

		if (controller.completed) {
			this.logService.trace(`[StreamingBridge] Received chunk for completed stream: requestId=${message.requestId}`);
			return;
		}

		// Reset the chunk timeout since we received data
		this._clearChunkTimeout(controller);
		controller.lastChunkAt = Date.now();
		controller.chunkCount++;

		// Enqueue the chunk
		this._enqueueChunk(controller, message.chunk);

		// If this is a terminal chunk (done or error), mark completed and start a shorter timeout
		if (message.chunk.done || message.chunk.type === StreamChunkType.Error) {
			controller.completed = true;
			this._completeStream(controller);
		} else {
			// Start timeout for next chunk
			this._startChunkTimeout(controller, CHUNK_TIMEOUT_MS);
		}
	}

	/**
	 * Enqueue a chunk into the controller's pending queue and resolve
	 * the iterator's waiting promise if one exists.
	 */
	private _enqueueChunk(controller: StreamController, chunk: StreamChunk): void {
		if (controller.resolveNext) {
			// Iterator is already waiting -- resolve immediately
			const resolve = controller.resolveNext;
			controller.resolveNext = null;
			controller.rejectNext = null;

			if (chunk.done || chunk.type === StreamChunkType.Error) {
				// Terminal chunk: yield it then signal completion
				resolve({ value: chunk, done: false });
				// The iterator will see done:true on the next call
			} else {
				resolve({ value: chunk, done: false });
			}
		} else {
			// Iterator not waiting yet -- buffer the chunk
			controller.pendingChunks.push(chunk);
		}
	}

	/**
	 * Signal the async iterator that the stream is complete.
	 * If the iterator is currently waiting, resolve with done:true.
	 */
	private _completeStream(controller: StreamController): void {
		this._clearChunkTimeout(controller);

		// If there's a pending wait, resolve it with done signal
		if (controller.resolveNext) {
			const resolve = controller.resolveNext;
			controller.resolveNext = null;
			controller.rejectNext = null;
			resolve({ value: undefined, done: true });
		}

		// Clean up tracking
		const durationMs = Date.now() - controller.lastChunkAt + (controller.chunkCount > 0 ? 0 : 0);
		this._activeControllers.delete(controller.requestId);
		this._activeStreamIds.delete(controller.requestId);

		this._onStreamCompleted.fire({
			requestId: controller.requestId,
			chunkCount: controller.chunkCount,
			durationMs,
			cancelled: controller.cancelled,
		});

		this.logService.info(
			`[StreamingBridge] Stream completed: requestId=${controller.requestId}, ` +
			`chunks=${controller.chunkCount}, cancelled=${controller.cancelled}`
		);
	}

	// -- Async Iterable --

	/**
	 * Create an AsyncIterable that yields chunks from the controller.
	 *
	 * The iterator pulls from the pending buffer first, then waits for
	 * new chunks to arrive via postMessage. It terminates when:
	 *   - A chunk with done=true is received
	 *   - An error chunk is received
	 *   - A timeout occurs (error chunk emitted, then done)
	 *   - The stream is cancelled (done chunk emitted, then done)
	 */
	private async *_createAsyncIterable(controller: StreamController): AsyncGenerator<StreamChunk> {
		try {
			while (true) {
				// Drain pending chunks first
				if (controller.pendingChunks.length > 0) {
					const chunk = controller.pendingChunks.shift()!;

					yield chunk;

					// Check if this was a terminal chunk
					if (chunk.done || chunk.type === StreamChunkType.Error) {
						controller.completed = true;
						this._completeStream(controller);
						return;
					}
					continue;
				}

				// Stream already completed (e.g., by timeout or cancellation)
				if (controller.completed) {
					return;
				}

				// Wait for the next chunk
				const result = await new Promise<IteratorResult<StreamChunk>>((resolve, reject) => {
					controller.resolveNext = resolve;
					controller.rejectNext = reject;
				});

				if (result.done) {
					return;
				}

				yield result.value;

				// Check if this was a terminal chunk
				if (result.value.done || result.value.type === StreamChunkType.Error) {
					controller.completed = true;
					this._completeStream(controller);
					return;
				}
			}
		} catch (error: any) {
			this.logService.error(`[StreamingBridge] Iterator error for requestId=${controller.requestId}: ${error?.message || error}`);
			// Emit an error chunk and terminate
			yield {
				type: StreamChunkType.Error,
				error: `Stream iterator error: ${error?.message || String(error)}`,
				done: true,
			};
			controller.completed = true;
			this._completeStream(controller);
		} finally {
			// Safety net: ensure controller is cleaned up even if the consumer
			// breaks out of the for-await loop without consuming all chunks
			if (!controller.completed) {
				controller.completed = true;
				this._clearChunkTimeout(controller);
				this._activeControllers.delete(controller.requestId);
				this._activeStreamIds.delete(controller.requestId);

				this._onStreamCompleted.fire({
					requestId: controller.requestId,
					chunkCount: controller.chunkCount,
					durationMs: 0,
					cancelled: true,
				});

				this.logService.trace(`[StreamingBridge] Iterator cleanup for requestId=${controller.requestId}`);
			}
		}
	}

	// -- Timeout management --

	/**
	 * Start a timeout timer for the next chunk. If no chunk arrives within
	 * the specified duration, emit an error chunk and terminate the stream.
	 */
	private _startChunkTimeout(controller: StreamController, timeoutMs: number): void {
		this._clearChunkTimeout(controller);

		controller.timeoutHandle = setTimeout(() => {
			if (controller.completed) {
				return;
			}

			const waitedMs = Date.now() - controller.lastChunkAt;

			this.logService.warn(
				`[StreamingBridge] Chunk timeout: requestId=${controller.requestId}, ` +
				`waited=${waitedMs}ms, timeout=${timeoutMs}ms`
			);

			this._onStreamTimeout.fire({
				requestId: controller.requestId,
				waitedMs,
			});

			// Emit a timeout error chunk
			this._enqueueChunk(controller, {
				type: StreamChunkType.Error,
				error: `Stream timeout: no chunk received within ${timeoutMs / 1000}s`,
				done: true,
			});

			controller.completed = true;
			this._completeStream(controller);
		}, timeoutMs);
	}

	/**
	 * Clear the current chunk timeout timer.
	 */
	private _clearChunkTimeout(controller: StreamController): void {
		if (controller.timeoutHandle !== null) {
			clearTimeout(controller.timeoutHandle);
			controller.timeoutHandle = null;
		}
	}

	// -- Messaging --

	/**
	 * Post a message to the extension host via the VS Code API.
	 *
	 * Uses the global acquireVsCodeApi() function that is available in
	 * webview panels. If the API is not available (e.g., running in
	 * the main workbench), falls back to window.postMessage for testing.
	 */
	private _postMessage(message: StreamingBridgeMessage): void {
		try {
			// In a real webview, we use the VS Code API object
			const vscodeApi = (globalThis as any).acquireVsCodeApi?.();
			if (vscodeApi) {
				vscodeApi.postMessage(message);
				return;
			}
		} catch {
			// acquireVsCodeApi can only be called once; the API object
			// should be stored by the webview panel and passed in.
			// Fall through to the alternative method.
		}

		// Alternative: use the stored VS Code API reference if the webview
		// panel has set it on the global scope
		const storedApi = (globalThis as any).__vsCodeApi;
		if (storedApi && typeof storedApi.postMessage === 'function') {
			storedApi.postMessage(message);
			return;
		}

		// Fallback for testing or when running outside a webview:
		// dispatch a custom event so test harnesses can intercept
		this.logService.trace(`[StreamingBridge] No VS Code API found, posting message as custom event`);
		window.dispatchEvent(new CustomEvent('streaming-bridge-outbound', { detail: message }));
	}

	// -- Lifecycle --

	/**
	 * Cancel all active streams and remove the message listener.
	 */
	override dispose(): void {
		// Cancel all active streams
		for (const requestId of Array.from(this._activeControllers.keys())) {
			this.cancelStream(requestId);
		}

		// Clear all timeout handles
		for (const controller of this._activeControllers.values()) {
			this._clearChunkTimeout(controller);
		}

		// Remove the window message listener
		if (this._messageListener) {
			window.removeEventListener('message', this._messageListener);
			this._messageListener = null;
			this._messageListenerBound = false;
		}

		this._activeControllers.clear();
		this._activeStreamIds.clear();

		this.logService.trace('[StreamingBridge] Service disposed');
		super.dispose();
	}
}
