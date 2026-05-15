/*---------------------------------------------------------------------------------------------
 *  AI Execution Kernel — Phase 1 Foundation Layer
 *  Real-vibecode VS Code Fork
 *
 *  aiExecution.contribution.ts — Service registration + file mutation hook.
 *
 *  This file serves TWO purposes:
 *    1. Registers IAIExecutionService as a singleton in the VS Code DI container
 *    2. Registers an ITextFileSaveParticipant that intercepts file saves
 *       and notifies the AI execution kernel of file mutations.
 *
 *  It is imported as a side-effect from workbench.common.main.ts.
 *--------------------------------------------------------------------------------------------*/

import { Disposable } from '../../../../base/common/lifecycle.js';
import { ITextFileSaveParticipant, ITextFileEditorModel, ITextFileSaveParticipantContext } from '../../textfile/common/textfiles.js';
import { IProgress, IProgressStep } from '../../../../platform/progress/common/progress.js';
import { CancellationToken } from '../../../../base/common/cancellation.js';
import { IWorkbenchContribution } from '../../../common/contributions.js';
import { IAIExecutionService } from '../common/aiExecutionService.js';
import { AIExecutionService } from './aiExecutionService.js';
import { ITextFileService } from '../../textfile/common/textfiles.js';
import { InstantiationType, registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
import { registerWorkbenchContribution2, WorkbenchPhase } from '../../../common/contributions.js';

// ─── Singleton Registration ────────────────────────────────────────────────────
//
// This is the EXACT DI binding. When any consumer declares:
//   constructor(@IAIExecutionService aiExecutionService: IAIExecutionService)
// the DI container will lazily instantiate AIExecutionService and inject it.
//
registerSingleton(IAIExecutionService, AIExecutionService, InstantiationType.Delayed);

// ─── File Mutation Hook (Phase 1) ──────────────────────────────────────────────
//
// AIFileMutationHook is a workbench contribution that registers itself as a
// save participant on the ITextFileEditorModelManager. When ANY file save occurs,
// the hook is notified BEFORE the content is written to disk.
//
// This is the interception point for the AI kernel's file mutation awareness.
// Phase 1: Observes and logs saves. Future phases will add approval gates,
// diff preview, and mutation policy enforcement.
//

export const AI_FILE_MUTATION_HOOK_ID = 'workbench.contrib.aiFileMutationHook';

class AIFileMutationHook extends Disposable implements IWorkbenchContribution, ITextFileSaveParticipant {

	readonly ordinal = -1000; // Run very early, before formatters and code actions

	constructor(
		@IAIExecutionService private readonly aiExecutionService: IAIExecutionService,
		@ITextFileService private readonly textFileService: ITextFileService,
	) {
		super();

		// Register this hook as a save participant
		this._register(this.textFileService.files.addSaveParticipant(this));
	}

	async participate(
		model: ITextFileEditorModel,
		context: ITextFileSaveParticipantContext,
		progress: IProgress<IProgressStep>,
		token: CancellationToken
	): Promise<void> {
		if (token.isCancellationRequested) {
			return;
		}

		// Phase 1: Observe and log the save event.
		// The AI kernel is now AWARE that a file save is happening.
		// Future phases will:
		//   - Check if the save was initiated by the AI kernel itself
		//   - Apply mutation policies (e.g., block saves to certain paths)
		//   - Present approval UI for AI-initiated mutations
		//   - Record diffs for the execution history

		const resource = model.resource;
		const reason = context.reason;

		progress.report({ message: `AI kernel: observing save of ${resource.path}` });

		// No mutation blocking in Phase 1 — we pass through silently.
		// The save proceeds normally after all participants complete.
	}
}

// Register the file mutation hook as a workbench contribution.
// It will be instantiated during the AfterRestored lifecycle phase,
// which means it's active after the workspace has been fully restored.
registerWorkbenchContribution2(
	AI_FILE_MUTATION_HOOK_ID,
	AIFileMutationHook,
	WorkbenchPhase.AfterRestored
);
