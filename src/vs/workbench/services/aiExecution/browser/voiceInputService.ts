/*---------------------------------------------------------------------------------------------
 *  Voice Input Service — Web Speech API Implementation
 *  Real Vibecode — AI-Native IDE
 *--------------------------------------------------------------------------------------------*/

import { Disposable } from '../../../../base/common/lifecycle.js';
import { Emitter } from '../../../../base/common/event.js';
import { IVoiceInputService, IVoiceRecognitionResult } from '../common/voiceInput.js';
import { ILogService } from '../../../../platform/log/common/log.js';

// Web Speech API types (not in standard TypeScript lib)
interface IWebKitSpeechRecognition extends EventTarget {
	continuous: boolean;
	interimResults: boolean;
	lang: string;
	start(): void;
	stop(): void;
	abort(): void;
	onresult: ((event: any) => void) | null;
	onerror: ((event: any) => void) | null;
	onend: (() => void) | null;
	onstart: (() => void) | null;
}

declare const SpeechRecognition: {
	new (): IWebKitSpeechRecognition;
};

declare const webkitSpeechRecognition: {
	new (): IWebKitSpeechRecognition;
};

export class VoiceInputService extends Disposable implements IVoiceInputService {
	declare readonly _serviceBrand: undefined;

	private _isListening: boolean = false;
	private recognition: IWebKitSpeechRecognition | null = null;

	private readonly _onDidRecognize = this._register(new Emitter<IVoiceRecognitionResult>());
	readonly onDidRecognize = this._onDidRecognize.event;

	private readonly _onDidChangeListeningState = this._register(new Emitter<boolean>());
	readonly onDidChangeListeningState = this._onDidChangeListeningState.event;

	private readonly _onDidError = this._register(new Emitter<string>());
	readonly onDidError = this._onDidError.event;

	get isAvailable(): boolean {
		return typeof SpeechRecognition !== 'undefined' || typeof webkitSpeechRecognition !== 'undefined';
	}

	get isListening(): boolean {
		return this._isListening;
	}

	constructor(
		@ILogService private readonly logService: ILogService,
	) {
		super();
		this.initializeRecognition();
	}

	private initializeRecognition(): void {
		if (!this.isAvailable) {
			this.logService.info('[VoiceInput] Speech Recognition API not available');
			return;
		}

		try {
			const SpeechRecognitionCtor = typeof SpeechRecognition !== 'undefined'
				? SpeechRecognition
				: webkitSpeechRecognition;

			this.recognition = new SpeechRecognitionCtor();
			this.recognition.continuous = false;
			this.recognition.interimResults = true;
			this.recognition.lang = 'en-US';

			this.recognition.onresult = (event: any) => {
				const result = event.results[event.results.length - 1];
				const text = result[0].transcript;
				const confidence = result[0].confidence;
				const isFinal = result.isFinal;

				this._onDidRecognize.fire({ text, confidence, isFinal });
			};

			this.recognition.onerror = (event: any) => {
				const errorMessages: Record<string, string> = {
					'no-speech': 'No speech detected',
					'audio-capture': 'No microphone found',
					'not-allowed': 'Microphone access denied',
					'network': 'Network error during speech recognition',
					'aborted': 'Speech recognition was aborted',
					'service-not-allowed': 'Speech recognition service not allowed',
				};
				const msg = errorMessages[event.error] || `Speech recognition error: ${event.error}`;
				this.logService.warn(`[VoiceInput] Error: ${msg}`);
				this._onDidError.fire(msg);
				this.setListening(false);
			};

			this.recognition.onend = () => {
				this.setListening(false);
			};

			this.recognition.onstart = () => {
				this.setListening(true);
			};

			this.logService.info('[VoiceInput] Speech Recognition initialized');
		} catch (e) {
			this.logService.error('[VoiceInput] Failed to initialize:', e);
		}
	}

	startListening(): void {
		if (!this.recognition) {
			this._onDidError.fire('Speech recognition not available');
			return;
		}
		if (this._isListening) {
			return;
		}
		try {
			this.recognition.start();
		} catch (e) {
			this.logService.warn('[VoiceInput] Could not start listening:', e);
		}
	}

	stopListening(): void {
		if (!this.recognition || !this._isListening) {
			return;
		}
		try {
			this.recognition.stop();
		} catch (e) {
			this.logService.warn('[VoiceInput] Could not stop listening:', e);
		}
	}

	private setListening(value: boolean): void {
		if (this._isListening === value) return;
		this._isListening = value;
		this._onDidChangeListeningState.fire(value);
	}

	override dispose(): void {
		if (this.recognition && this._isListening) {
			try { this.recognition.abort(); } catch { /* ignore */ }
		}
		super.dispose();
	}
}
