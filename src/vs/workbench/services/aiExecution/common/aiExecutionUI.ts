/*---------------------------------------------------------------------------------------------
 *  AI Execution Kernel — Phase 5 UI Execution Layer
 *  Real Vibecode — AI-Native IDE
 *
 *  IAIExecutionUIService — Contract for UI integration points.
 *  Provides execution timeline, AI action indicators, and mutation preview.
 *  These are the surface-level integrations that make the AI kernel
 *  visible and interactive in the workbench.
 *--------------------------------------------------------------------------------------------*/

import { Event } from '../../../../base/common/event.js';
import { IDisposable } from '../../../../base/common/lifecycle.js';
import { URI } from '../../../../base/common/uri.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { AIMutationSource } from './aiExecutionService.js';
import { ExecutionNodeType, IExecutionNode, IExecutionScope } from './executionGraphService.js';
import { AIRuntimePhase, IActiveExecutionState } from './aiUnifiedStateService.js';

export const IAIExecutionUIService = createDecorator<IAIExecutionUIService>('aiExecutionUIService');

// ─── Timeline View Models ─────────────────────────────────────────────────────

/**
 * A view model for an execution node as displayed in the timeline panel.
 * Flattens graph data into a UI-friendly format with scope grouping.
 */
export interface IExecutionTimelineEntry {
	/** The execution node ID */
	readonly nodeId: string;
	/** Display label */
	readonly label: string;
	/** Node type */
	readonly type: ExecutionNodeType;
	/** Mutation source */
	readonly source: AIMutationSource;
	/** Whether the node is pending */
	readonly pending: boolean;
	/** Whether the operation succeeded */
	readonly success: boolean;
	/** Whether this was rolled back */
	readonly rolledBack: boolean;
	/** Primary file URI (for display) */
	readonly fileUri: URI | undefined;
	/** Human-readable time */
	readonly timestamp: number;
	/** Scope ID for grouping */
	readonly scopeId: string | undefined;
	/** Number of edits */
	readonly editCount: number;
	/** Whether this came from a trusted source */
	readonly trusted: boolean;
	/** Description */
	readonly description?: string;
	/** Error message if failed */
	readonly error?: string;
}

/**
 * A grouped set of timeline entries, organized by scope.
 */
export interface IExecutionTimelineGroup {
	/** Scope ID (or 'ungrouped' for root nodes) */
	readonly scopeId: string;
	/** Scope label */
	readonly label: string;
	/** Entries in this group */
	readonly entries: IExecutionTimelineEntry[];
	/** Whether the scope is still active */
	readonly active: boolean;
	/** Source of the scope */
	readonly source: AIMutationSource;
}

/**
 * The full timeline model as consumed by the UI panel.
 */
export interface IExecutionTimelineModel {
	/** Groups of entries */
	readonly groups: IExecutionTimelineGroup[];
	/** Total entry count */
	readonly totalCount: number;
	/** Whether the model is currently loading */
	readonly loading: boolean;
}

// ─── AI Action Indicator State ────────────────────────────────────────────────

/**
 * State for the AI action indicator — shown in the status bar or
 * title area to indicate AI kernel activity.
 */
export interface IAIActionIndicatorState {
	/** Whether AI is currently active */
	readonly active: boolean;
	/** Current mutation source being displayed */
	readonly source: AIMutationSource | undefined;
	/** Human-readable label for the indicator */
	readonly label: string;
	/** Tooltip with details */
	readonly tooltip: string;
	/** Current runtime phase */
	readonly phase: AIRuntimePhase;
	/** Number of pending operations */
	readonly pendingCount: number;
	/** Whether to show a progress animation */
	readonly showProgress: boolean;
}

// ─── Mutation Preview ─────────────────────────────────────────────────────────

/**
 * A before/after diff for a graph node's mutation.
 * Used to show the user what an AI edit changed.
 */
export interface IMutationPreview {
	/** The graph node this preview is for */
	readonly nodeId: string;
	/** File URI */
	readonly fileUri: URI;
	/** Content before the mutation */
	readonly beforeContent: string | undefined;
	/** Content after the mutation */
	readonly afterContent: string | undefined;
	/** Line ranges affected */
	readonly affectedRanges: readonly IMutationRange[];
	/** Whether the preview is available */
	readonly available: boolean;
}

/**
 * A line range affected by a mutation.
 */
export interface IMutationRange {
	readonly startLineNumber: number;
	readonly endLineNumber: number;
}

// ─── Service Interface ─────────────────────────────────────────────────────────

/**
 * IAIExecutionUIService — UI integration layer for the AI Execution Kernel.
 *
 * Bridges the gap between backend services and the workbench UI.
 * Provides observable state for panels, indicators, and previews
 * without coupling UI components to service implementation details.
 *
 * Phase 5 implements:
 *   - Execution timeline model with scope grouping
 *   - AI action indicator state for status bar
 *   - Mutation preview generation
 *   - Real-time UI updates via event subscriptions
 */
export interface IAIExecutionUIService {
	readonly _serviceBrand: undefined;

	// ─── Timeline ────────────────────────────────────────────────────────────

	/**
	 * Get the current execution timeline model.
	 * Entries are grouped by scope, sorted by time.
	 */
	readonly timelineModel: IExecutionTimelineModel;

	/**
	 * Event that fires when the timeline model changes.
	 * UI panels should subscribe to this for real-time updates.
	 */
	readonly onDidChangeTimeline: Event<IExecutionTimelineModel>;

	/**
	 * Refresh the timeline model from the graph service.
	 * Called when the panel becomes visible or on demand.
	 */
	refreshTimeline(): void;

	/**
	 * Get the timeline entries for a specific file.
	 */
	getTimelineForFile(uri: URI): IExecutionTimelineEntry[];

	// ─── Action Indicator ────────────────────────────────────────────────────

	/**
	 * Get the current AI action indicator state.
	 */
	readonly indicatorState: IAIActionIndicatorState;

	/**
	 * Event that fires when the indicator state changes.
	 */
	readonly onDidChangeIndicator: Event<IAIActionIndicatorState>;

	// ─── Mutation Preview ────────────────────────────────────────────────────

	/**
	 * Generate a mutation preview for a specific graph node.
	 * Returns undefined if the preview cannot be generated.
	 */
	getMutationPreview(nodeId: string): IMutationPreview | undefined;

	/**
	 * Event that fires when a new mutation preview is available.
	 */
	readonly onDidGeneratePreview: Event<IMutationPreview>;

	// ─── Navigation ──────────────────────────────────────────────────────────

	/**
	 * Navigate to the file/line associated with a timeline entry.
	 * Opens the editor and highlights the affected range.
	 */
	navigateToEntry(entry: IExecutionTimelineEntry): Promise<void>;

	/**
	 * Navigate to the diff view for a mutation preview.
	 */
	navigateToDiff(preview: IMutationPreview): Promise<void>;
}
