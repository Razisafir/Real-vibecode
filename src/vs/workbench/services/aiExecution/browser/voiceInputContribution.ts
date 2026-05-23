/*---------------------------------------------------------------------------------------------
 *  Voice Input Contribution — Command + Keybinding + Status Bar
 *  Real Vibecode — AI-Native IDE
 *--------------------------------------------------------------------------------------------*/

import { Disposable } from '../../../../base/common/lifecycle.js';
import { IWorkbenchContribution } from '../../../common/contributions.js';
import { IVoiceInputService } from '../common/voiceInput.js';
import { IEditorService } from '../../editor/common/editorService.js';
import { IStatusbarService, StatusbarAlignment } from '../../../services/statusbar/common/statusbar.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { CommandsRegistry } from '../../../../platform/commands/common/commands.js';
import { KeybindingsRegistry } from '../../../../platform/keybinding/common/keybindingsRegistry.js';
import { KeyMod, KeyCode } from '../../../../base/common/keyCodes.js';
import { registerWorkbenchContribution2, WorkbenchPhase } from '../../../common/contributions.js';

class VoiceInputContribution extends Disposable implements IWorkbenchContribution {
	declare readonly _serviceBrand: undefined;

	private statusbarEntry: IDisposable | null = null;

	constructor(
		@IVoiceInputService private readonly voiceInput: IVoiceInputService,
		@IEditorService private readonly editorService: IEditorService,
		@IStatusbarService private readonly statusbarService: IStatusbarService,
		@ILogService private readonly logService: ILogService,
	) {
		super();

		if (!voiceInput.isAvailable) {
			this.logService.info('[VoiceInput] Not available, contribution inactive');
			return;
		}

		this._register(voiceInput.onDidChangeListeningState((listening) => {
			if (listening) {
				this.showStatusBar();
			} else {
				this.hideStatusBar();
			}
		}));

		this._register(voiceInput.onDidRecognize((result) => {
			if (result.isFinal && result.text) {
				this.insertTextAtCursor(result.text);
			}
		}));

		this._register(voiceInput.onDidError((error) => {
			this.logService.warn(`[VoiceInput] Error: ${error}`);
		}));
	}

	private showStatusBar(): void {
		this.statusbarEntry?.dispose();
		this.statusbarEntry = this.statusbarService.addEntry({
			name: 'Voice Input',
			text: '$(mic) Listening...',
			ariaLabel: 'Voice input is active',
			command: 'aiExecution.voiceInput',
		}, StatusbarAlignment.LEFT, 99);
	}

	private hideStatusBar(): void {
		this.statusbarEntry?.dispose();
		this.statusbarEntry = null;
	}

	private insertTextAtCursor(text: string): void {
		const activeEditor = this.editorService.activeTextEditorControl;
		if (!activeEditor) return;

		const model = (activeEditor as any).getModel?.();
		const position = (activeEditor as any).getPosition?.();
		if (!model || !position) return;

		(activeEditor as any).executeEdits?.('voice-input', [{
			range: { startLineNumber: position.lineNumber, startColumn: position.column, endLineNumber: position.lineNumber, endColumn: position.column },
			text: text,
		}]);
	}

	override dispose(): void {
		this.statusbarEntry?.dispose();
		super.dispose();
	}
}

// Register the contribution
registerWorkbenchContribution2(
	'workbench.contrib.voiceInput',
	VoiceInputContribution,
	WorkbenchPhase.AfterRestored,
);

// Register command
CommandsRegistry.registerCommand('aiExecution.voiceInput', (accessor) => {
	const voiceInput = accessor.get(IVoiceInputService);
	if (voiceInput.isListening) {
		voiceInput.stopListening();
	} else {
		voiceInput.startListening();
	}
});

// Register keybinding
KeybindingsRegistry.registerKeybinding({
	keybinding: KeyMod.CtrlCmd | KeyMod.Shift | KeyCode.KeyV,
	command: 'aiExecution.voiceInput',
	when: undefined,
	weight: 0,
	extensionId: undefined,
});
