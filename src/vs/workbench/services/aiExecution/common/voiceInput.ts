/*---------------------------------------------------------------------------------------------
 *  Voice Input Service — Speech-to-Text for AI Commands
 *  Real Vibecode — AI-Native IDE
 *--------------------------------------------------------------------------------------------*/

import { Event } from '../../../../base/common/event.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';

export const IVoiceInputService = createDecorator<IVoiceInputService>('voiceInputService');

export interface IVoiceRecognitionResult {
	readonly text: string;
	readonly confidence: number;
	readonly isFinal: boolean;
}

export interface IVoiceInputService {
	readonly _serviceBrand: undefined;
	readonly isAvailable: boolean;
	readonly isListening: boolean;
	startListening(): void;
	stopListening(): void;
	readonly onDidRecognize: Event<IVoiceRecognitionResult>;
	readonly onDidChangeListeningState: Event<boolean>;
	readonly onDidError: Event<string>;
}
