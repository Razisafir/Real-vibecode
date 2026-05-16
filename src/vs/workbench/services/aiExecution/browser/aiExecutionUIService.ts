/*---------------------------------------------------------------------------------------------
 *  AI Execution Kernel — Phase 5 UI Execution Layer
 *  Real Vibecode — AI-Native IDE
 *
 *  AIExecutionUIService — Concrete implementation of IAIExecutionUIService.
 *  Bridges AIExecutionService, ExecutionGraphService, and AIUnifiedStateService
 *  to provide observable UI state for panels, indicators, and previews.
 *--------------------------------------------------------------------------------------------*/

import { Disposable } from '../../../../base/common/lifecycle.js';
import { Emitter, Event } from '../../../../base/common/event.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { IEditorService } from '../../editor/common/editorService.js';
import { ITextFileService } from '../../textfile/common/textfiles.js';
import { URI } from '../../../../base/common/uri.js';
import { IExecutionGraphService, ExecutionNodeType, ExecutionEdgeType, IExecutionNode, IExecutionScope } from '../common/executionGraphService.js';
import { AIMutationSource, IAIExecutionRecord } from '../common/aiExecutionService.js';
import { IAIUnifiedStateService, AIRuntimePhase } from '../common/aiUnifiedStateService.js';
import {
	IAIExecutionUIService, IExecutionTimelineEntry, IExecutionTimelineGroup,
	IExecutionTimelineModel, IAIActionIndicatorState, IMutationPreview, IMutationRange,
} from '../common/aiExecutionUI.js';

// ─── AIExecutionUIService ──────────────────────────────────────────────────────

export class AIExecutionUIService extends Disposable implements IAIExecutionUIService {

	declare readonly _serviceBrand: undefined;

	// ─── Internal State ────────────────────────────────────────────────────────

	private _timelineModel: IExecutionTimelineModel = { groups: [], totalCount: 0, loading: false };
	get timelineModel(): IExecutionTimelineModel { return this._timelineModel; }

	private _indicatorState: IAIActionIndicatorState = {
		active: false,
		source: undefined,
		label: 'AI Kernel: Idle',
		tooltip: 'No AI operations in progress',
		phase: AIRuntimePhase.Uninitialized,
		pendingCount: 0,
		showProgress: false,
	};
	get indicatorState(): IAIActionIndicatorState { return this._indicatorState; }

	// ─── Events ────────────────────────────────────────────────────────────────

	private readonly _onDidChangeTimeline = this._register(new Emitter<IExecutionTimelineModel>());
	readonly onDidChangeTimeline: Event<IExecutionTimelineModel> = this._onDidChangeTimeline.event;

	private readonly _onDidChangeIndicator = this._register(new Emitter<IAIActionIndicatorState>());
	readonly onDidChangeIndicator: Event<IAIActionIndicatorState> = this._onDidChangeIndicator.event;

	private readonly _onDidGeneratePreview = this._register(new Emitter<IMutationPreview>());
	readonly onDidGeneratePreview: Event<IMutationPreview> = this._onDidGeneratePreview.event;

	// ─── Constructor ────────────────────────────────────────────────────────────

	constructor(
		@ILogService private readonly logService: ILogService,
		@IExecutionGraphService private readonly graphService: IExecutionGraphService,
		@IAIUnifiedStateService private readonly stateService: IAIUnifiedStateService,
		@IEditorService private readonly editorService: IEditorService,
		@ITextFileService private readonly textFileService: ITextFileService,
	) {
		super();

		// Subscribe to graph events for real-time timeline updates
		this._register(this.graphService.onDidCreateNode(() => this._rebuildTimeline()));
		this._register(this.graphService.onDidCompleteNode(() => this._rebuildTimeline()));
		this._register(this.graphService.onDidCreateEdge(() => this._rebuildTimeline()));

		// Subscribe to unified state changes for indicator updates
		this._register(this.stateService.onDidChangeState(() => this._updateIndicator()));

		this.logService.trace('[AIExecutionUIService] Phase 5 UI service initialized');
	}

	// ─── Timeline ──────────────────────────────────────────────────────────────

	refreshTimeline(): void {
		this._rebuildTimeline();
	}

	getTimelineForFile(uri: URI): IExecutionTimelineEntry[] {
		const nodes = this.graphService.getNodesByFile(uri);
		return nodes.map(n => this._nodeToEntry(n));
	}

	private _rebuildTimeline(): void {
		const recentNodes = this.graphService.getRecentNodes(200);
		const entries = recentNodes.map(n => this._nodeToEntry(n));

		// Group by scope
		const scopeGroups = new Map<string, IExecutionTimelineEntry[]>();
		const ungrouped: IExecutionTimelineEntry[] = [];

		for (const entry of entries) {
			if (entry.scopeId) {
				let group = scopeGroups.get(entry.scopeId);
				if (!group) {
					group = [];
					scopeGroups.set(entry.scopeId, group);
				}
				group.push(entry);
			} else {
				ungrouped.push(entry);
			}
		}

		// Build group models
		const groups: IExecutionTimelineGroup[] = [];

		for (const [scopeId, scopeEntries] of scopeGroups) {
			const scope = this._getScope(scopeId);
			groups.push({
				scopeId,
				label: scope?.label ?? `Scope ${scopeId.slice(0, 8)}`,
				entries: scopeEntries.sort((a, b) => b.timestamp - a.timestamp),
				active: scope?.active ?? false,
				source: scope?.mutationSource ?? scopeEntries[0]?.source ?? AIMutationSource.Unknown,
			});
		}

		// Add ungrouped entries
		if (ungrouped.length > 0) {
			groups.push({
				scopeId: 'ungrouped',
				label: 'Individual Operations',
				entries: ungrouped.sort((a, b) => b.timestamp - a.timestamp),
				active: false,
				source: AIMutationSource.Unknown,
			});
		}

		// Sort groups: active first, then by most recent entry
		groups.sort((a, b) => {
			if (a.active && !b.active) { return -1; }
			if (!a.active && b.active) { return 1; }
			const aTime = a.entries[0]?.timestamp ?? 0;
			const bTime = b.entries[0]?.timestamp ?? 0;
			return bTime - aTime;
		});

		this._timelineModel = {
			groups,
			totalCount: entries.length,
			loading: false,
		};

		this._onDidChangeTimeline.fire(this._timelineModel);
	}

	private _nodeToEntry(node: IExecutionNode): IExecutionTimelineEntry {
		return {
			nodeId: node.id,
			label: node.label,
			type: node.type,
			source: node.mutationSource,
			pending: node.pending,
			success: node.success,
			rolledBack: node.rolledBack,
			fileUri: node.fileUri,
			timestamp: node.createdAt,
			scopeId: node.scopeId,
			editCount: node.editCount,
			trusted: node.trusted,
			description: node.description,
			error: node.error,
		};
	}

	private _getScope(scopeId: string): IExecutionScope | undefined {
		// Access scope through graph service internal — scope query not in interface
		// Use getNodesByScope to infer scope existence
		const nodes = this.graphService.getNodesByScope(scopeId);
		if (nodes.length === 0) { return undefined; }
		// Return a minimal scope object from the first node's scope info
		return {
			id: scopeId,
			label: `Scope ${scopeId.slice(0, 8)}`,
			ownerNodeId: nodes[0].id,
			createdAt: nodes[0].createdAt,
			active: nodes.some(n => n.pending),
			mutationSource: nodes[0].mutationSource,
		};
	}

	// ─── Action Indicator ──────────────────────────────────────────────────────

	private _updateIndicator(): void {
		const state = this.stateService.activeState;

		// Count pending nodes
		const recent = this.graphService.getRecentNodes(100);
		const pendingCount = recent.filter(n => n.pending).length;

		let label: string;
		let tooltip: string;
		let showProgress = false;

		if (state.phase === AIRuntimePhase.Uninitialized) {
			label = 'AI Kernel: Initializing';
			tooltip = 'AI execution kernel is starting up';
		} else if (state.phase === AIRuntimePhase.Hydrating) {
			label = 'AI Kernel: Loading State';
			tooltip = 'Restoring persisted execution state';
			showProgress = true;
		} else if (state.phase === AIRuntimePhase.Executing) {
			const sourceLabel = this._sourceLabel(state.activeSource);
			label = `AI Kernel: ${sourceLabel}`;
			tooltip = state.activeContext?.description ?? `AI operation in progress (${sourceLabel})`;
			showProgress = true;
		} else if (state.phase === AIRuntimePhase.Ready) {
			label = 'AI Kernel: Ready';
			tooltip = 'AI execution kernel is ready';
		} else if (state.phase === AIRuntimePhase.ShuttingDown) {
			label = 'AI Kernel: Shutting Down';
			tooltip = 'AI execution kernel is shutting down';
		} else {
			label = 'AI Kernel: Offline';
			tooltip = 'AI execution kernel is not available';
		}

		if (pendingCount > 0) {
			tooltip += `\n${pendingCount} pending operation(s)`;
		}

		this._indicatorState = {
			active: state.phase === AIRuntimePhase.Executing,
			source: state.activeSource,
			label,
			tooltip,
			phase: state.phase,
			pendingCount,
			showProgress,
		};

		this._onDidChangeIndicator.fire(this._indicatorState);
	}

	private _sourceLabel(source: AIMutationSource | undefined): string {
		if (!source) { return 'Unknown'; }
		switch (source) {
			case AIMutationSource.AIAgent: return 'AI Agent';
			case AIMutationSource.AIInternal: return 'AI Internal';
			case AIMutationSource.UserTyping: return 'User Typing';
			case AIMutationSource.UserAction: return 'User Action';
			case AIMutationSource.WorkspaceEdit: return 'Workspace Edit';
			case AIMutationSource.SaveParticipant: return 'Save Participant';
			case AIMutationSource.Extension: return 'Extension';
			case AIMutationSource.UndoRedo: return 'Undo/Redo';
			case AIMutationSource.Unknown: return 'Unknown';
		}
	}

	// ─── Mutation Preview ──────────────────────────────────────────────────────

	getMutationPreview(nodeId: string): IMutationPreview | undefined {
		const node = this.graphService.getNode(nodeId);
		if (!node || !node.fileUri) {
			return undefined;
		}

		// For now, we return a structural preview without before/after content
		// (content snapshots require integration with the text model cache)
		// The affected ranges are inferred from the node's edit count
		return {
			nodeId: node.id,
			fileUri: node.fileUri,
			beforeContent: undefined, // Will be populated from snapshot system in future
			afterContent: undefined,
			affectedRanges: [],
			available: node.success && !node.pending && node.editCount > 0,
		};
	}

	// ─── Navigation ────────────────────────────────────────────────────────────

	async navigateToEntry(entry: IExecutionTimelineEntry): Promise<void> {
		if (!entry.fileUri) {
			this.logService.warn('[AIExecutionUIService] Cannot navigate: no file URI');
			return;
		}

		try {
			await this.editorService.openEditor({
				resource: entry.fileUri,
				options: {
					preserveFocus: false,
					revealIfVisible: true,
				},
			});
		} catch (err) {
			this.logService.error('[AIExecutionUIService] Navigation failed:', err);
		}
	}

	async navigateToDiff(preview: IMutationPreview): Promise<void> {
		// Future: open diff editor with before/after content
		// For now, navigate to the file
		await this.editorService.openEditor({
			resource: preview.fileUri,
			options: { preserveFocus: false },
		});
	}

	// ─── Lifecycle ─────────────────────────────────────────────────────────────

	override dispose(): void {
		super.dispose();
		this.logService.trace('[AIExecutionUIService] Disposed');
	}
}
