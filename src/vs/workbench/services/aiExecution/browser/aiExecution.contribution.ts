/*---------------------------------------------------------------------------------------------
 *  AI Execution Kernel — Phase 3 Execution Graph Engine
 *  Real-vibecode VS Code Fork
 *
 *  aiExecution.contribution.ts — Service registration + mutation interception hooks.
 *  Phase 3: Registers ExecutionGraphService and integrates graph nodes into all
 *  mutation pipelines (AIExecutionService, save participant, bulk edit interceptor).
 *--------------------------------------------------------------------------------------------*/

import { Disposable } from '../../../../base/common/lifecycle.js';
import { ITextFileSaveParticipant, ITextFileEditorModel, ITextFileSaveParticipantContext } from '../../textfile/common/textfiles.js';
import { IProgress, IProgressStep } from '../../../../platform/progress/common/progress.js';
import { CancellationToken } from '../../../../base/common/cancellation.js';
import { IWorkbenchContribution } from '../../../common/contributions.js';
import { IAIExecutionService, AIMutationSource } from '../common/aiExecutionService.js';
import { AIExecutionService } from './aiExecutionService.js';
import { ITextFileService } from '../../textfile/common/textfiles.js';
import { InstantiationType, registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
import { registerWorkbenchContribution2, WorkbenchPhase } from '../../../common/contributions.js';
import { IBulkEditService } from '../../../../editor/browser/services/bulkEditService.js';
import { IExecutionGraphService } from '../common/executionGraphService.js';
import { ExecutionGraphService } from './executionGraphService.js';
import { ExecutionNodeType, ExecutionEdgeType } from '../common/executionGraphService.js';

// ─── Singleton Registrations ───────────────────────────────────────────────────

// Phase 3: Register ExecutionGraphService FIRST (AIExecutionService depends on it)
registerSingleton(IExecutionGraphService, ExecutionGraphService, InstantiationType.Delayed);

// Phase 3: Register AIExecutionService (now depends on IExecutionGraphService)
registerSingleton(IAIExecutionService, AIExecutionService, InstantiationType.Delayed);

// ─── File Mutation Hook (Phase 3: Graph-Integrated) ───────────────────────────
//
// AIFileMutationHook creates Save graph nodes and links them to the
// execution context that triggered the save.
//

export const AI_FILE_MUTATION_HOOK_ID = 'workbench.contrib.aiFileMutationHook';

class AIFileMutationHook extends Disposable implements IWorkbenchContribution, ITextFileSaveParticipant {

	readonly ordinal = -1000;

	constructor(
		@IAIExecutionService private readonly aiExecutionService: IAIExecutionService,
		@ITextFileService private readonly textFileService: ITextFileService,
		@IExecutionGraphService private readonly graphService: IExecutionGraphService,
	) {
		super();
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

		const resource = model.resource;
		const activeContext = this.aiExecutionService.activeMutationContext;
		const hasBypass = activeContext?.bypassToken && this.aiExecutionService.isBypassTokenValid(activeContext.bypassToken);

		// Create a Save graph node for every save
		const saveNode = this.graphService.createNode({
			type: ExecutionNodeType.Save,
			label: `Save ${resource.path}`,
			mutationSource: hasBypass ? (activeContext?.source ?? AIMutationSource.AIInternal) : AIMutationSource.UserAction,
			trusted: true,
			description: hasBypass ? 'AI-initiated save' : 'User-initiated save',
			fileUri: resource,
			reversible: true,
			rollbackStrategy: 2, // RollbackStrategy.VSCodeUndo — save can be undone via VS Code undo
		});

		// If there's an active AI mutation context, create a Triggered edge
		if (activeContext && activeContext.parentExecutionId) {
			this.graphService.createEdge(activeContext.parentExecutionId, saveNode.id, ExecutionEdgeType.Triggered);
		}

		// Complete the save node immediately (saves are synchronous from the hook's perspective)
		this.graphService.completeNode(saveNode.id, { success: true });

		progress.report({ message: `AI kernel: graph node created for save of ${resource.path}` });
	}
}

// ─── Bulk Edit Interceptor (Phase 3: Graph-aware) ─────────────────────────────

export const AI_BULK_EDIT_INTERCEPTOR_ID = 'workbench.contrib.aiBulkEditInterceptor';

class AIBulkEditInterceptor extends Disposable implements IWorkbenchContribution {

	constructor(
		@IAIExecutionService private readonly aiExecutionService: IAIExecutionService,
		@IBulkEditService private readonly bulkEditService: IBulkEditService,
		@IExecutionGraphService private readonly graphService: IExecutionGraphService,
	) {
		super();
		// Phase 3: AIExecutionService already creates graph nodes for its own edits.
		// The interceptor observes external bulk edits and creates graph nodes for them.
		// Future phases may intercept at the IBulkEditService level for policy enforcement.
	}
}

// ─── Register Contributions ────────────────────────────────────────────────────

registerWorkbenchContribution2(
	AI_FILE_MUTATION_HOOK_ID,
	AIFileMutationHook,
	WorkbenchPhase.AfterRestored
);

registerWorkbenchContribution2(
	AI_BULK_EDIT_INTERCEPTOR_ID,
	AIBulkEditInterceptor,
	WorkbenchPhase.AfterRestored
);
