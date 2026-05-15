/*---------------------------------------------------------------------------------------------
 *  AI Execution Kernel — Phase 1 Foundation Layer
 *  Real-vibecode VS Code Fork
 *
 *  IAIExecutionService — Core service contract for AI-driven workspace mutations.
 *  This is the PRIMARY injection point for AI agents to request controlled changes
 *  to the workspace through a permissioned, auditable pipeline.
 *--------------------------------------------------------------------------------------------*/

import { URI } from '../../../../base/common/uri.js';
import { Event } from '../../../../base/common/event.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';

export const IAIExecutionService = createDecorator<IAIExecutionService>('aiExecutionService');

// ─── Data Types ────────────────────────────────────────────────────────────────

/**
 * Represents a single edit operation targeting a specific file region.
 * Compatible with VS Code's IIdentifiedSingleEditOperation for seamless
 * integration with the editor model's applyEdits pipeline.
 */
export interface IAIFileEdit {
	/** URI of the file to edit */
	readonly resource: URI;
	/** Line number where the edit begins (1-based) */
	readonly rangeStartLineNumber: number;
	/** Column where the edit begins (1-based) */
	readonly rangeStartColumn: number;
	/** Line number where the edit ends (1-based) */
	readonly rangeEndLineNumber: number;
	/** Column where the edit ends (1-based) */
	readonly rangeEndColumn: number;
	/** New text to replace the range (empty string = deletion) */
	readonly newText: string;
}

/**
 * Represents a terminal command execution request from the AI kernel.
 * Phase 1: stub only — no terminal integration yet.
 */
export interface IAITerminalExecution {
	/** Command string to execute */
	readonly command: string;
	/** Optional working directory override */
	readonly cwd?: URI;
	/** Whether the command requires user confirmation before execution */
	readonly requiresConfirmation: boolean;
}

/**
 * A workspace-level change that may span multiple files.
 * Used by applyWorkspaceChange() to batch mutations atomically.
 */
export interface IAIWorkspaceChange {
	/** Unique identifier for this change set */
	readonly id: string;
	/** Human-readable description of what the change does */
	readonly description: string;
	/** File edits included in this change */
	readonly edits: IAIFileEdit[];
	/** Timestamp when the change was created */
	readonly createdAt: number;
}

/**
 * An action that can be registered with the AI execution kernel.
 * Actions are named, parameterized operations that AI agents can invoke.
 */
export interface IAIAction<TArgs = unknown, TResult = unknown> {
	/** Unique identifier for this action */
	readonly id: string;
	/** Human-readable label */
	readonly label: string;
	/** Execute the action with the given arguments */
	execute(args: TArgs): Promise<TResult>;
}

/**
 * An entry in the execution history log.
 * Every mutation requested through the AI kernel is recorded here.
 */
export interface IAIExecutionHistoryEntry {
	/** Unique ID for this history entry */
	readonly id: string;
	/** Type of operation performed */
	readonly type: 'fileEdit' | 'terminalExecution' | 'workspaceChange' | 'action';
	/** The resource affected, if applicable */
	readonly resource?: URI;
	/** Human-readable description of the operation */
	readonly description: string;
	/** Timestamp of the operation */
	readonly timestamp: number;
	/** Whether the operation succeeded */
	readonly success: boolean;
	/** Error message if the operation failed */
	readonly error?: string;
}

// ─── Service Interface ─────────────────────────────────────────────────────────

/**
 * IAIExecutionService — The AI Execution Kernel.
 *
 * This service is the SOLE authorized pathway for AI agents to mutate the
 * user's workspace. All file edits, terminal commands, and workspace changes
 * requested by AI must flow through this service to ensure:
 *
 *   1. Auditability — every mutation is recorded in execution history
 *   2. Permission enforcement — future phases will add approval gates
 *   3. Atomicity — workspace changes are batched and applied as units
 *   4. Reversibility — history enables undo chains
 *
 * Phase 1 implements the core skeleton with file-edit support and history.
 * Terminal execution, approval gates, and graph-based orchestration are
 * deferred to later phases.
 */
export interface IAIExecutionService {
	readonly _serviceBrand: undefined;

	// ─── File Mutation ──────────────────────────────────────────────────────

	/**
	 * Request a file edit through the AI kernel.
	 * The edit is validated, recorded in history, and applied to the editor model.
	 *
	 * @param edit The edit operation to apply
	 * @returns A promise that resolves when the edit has been applied
	 */
	requestFileEdit(edit: IAIFileEdit): Promise<void>;

	// ─── Terminal Execution (Phase 1 Stub) ─────────────────────────────────

	/**
	 * Request a terminal command execution.
	 * Phase 1: Records the request in history but does NOT execute.
	 * Terminal integration is deferred to Phase 2.
	 *
	 * @param execution The terminal execution request
	 * @returns A promise that resolves when the request is logged
	 */
	requestTerminalExecution(execution: IAITerminalExecution): Promise<void>;

	// ─── Workspace Mutation ────────────────────────────────────────────────

	/**
	 * Apply a workspace-level change that may span multiple files.
	 * All edits in the change are applied atomically — if any fails,
	 * the entire change is rolled back.
	 *
	 * @param change The workspace change to apply
	 * @returns A promise that resolves when all edits have been applied
	 */
	applyWorkspaceChange(change: IAIWorkspaceChange): Promise<void>;

	// ─── Action Registry ───────────────────────────────────────────────────

	/**
	 * Register a named action with the AI execution kernel.
	 * Registered actions can be invoked by AI agents by their ID.
	 *
	 * @param action The action to register
	 * @returns A disposable that unregisters the action when disposed
	 */
	registerAction<TArgs = unknown, TResult = unknown>(action: IAIAction<TArgs, TResult>): IDisposable;

	// ─── Execution History ─────────────────────────────────────────────────

	/**
	 * Get the full execution history.
	 * Returns all recorded operations in chronological order.
	 */
	getExecutionHistory(): IAIExecutionHistoryEntry[];

	/**
	 * Event that fires when a new entry is added to the execution history.
	 * Allows consumers to react to AI-driven mutations in real time.
	 */
	readonly onDidRecordExecution: Event<IAIExecutionHistoryEntry>;
}
