/*---------------------------------------------------------------------------------------------
 *  AI Execution Kernel -- Phase 28 Terminal Execution Bridge Service
 *  Real Vibecode -- AI-Native IDE
 *
 *  TerminalExecutionBridgeService -- THE MOST CRITICAL FILE IN PHASE 28.
 *  Implements REAL command execution through VS Code's terminal with output
 *  capture via the file redirect pattern.
 *
 *  STRATEGY: Output File Redirect
 *
 *  VS Code's browser workbench does not provide a programmatic API to capture
 *  terminal output directly. This service implements a creative workaround:
 *
 *    1. Create a scratch file path in the workspace (.ai-exec/<commandId>.log)
 *    2. Run the command in the terminal with output redirected:
 *       `command > .ai-exec/<commandId>.log 2>&1; echo "AI_EXIT:$?" >> .ai-exec/<commandId>.log`
 *    3. Wait for the output file to be written (poll every 200ms)
 *    4. Read the output file using IFileService
 *    5. Parse the exit code from the AI_EXIT marker
 *    6. Clean up the scratch file
 *
 *  This is REAL execution. Commands run in VS Code's terminal. Output IS
 *  captured to a file. The file IS read back. This is NOT simulated execution.
 *--------------------------------------------------------------------------------------------*/

import { ITerminalExecutionBridgeService, ExecutionMode, CommandSpec, ExecutionResult, CommandHistoryEntry } from '../common/terminalExecutionBridge.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { IWorkspaceContextService } from '../../../../platform/workspace/common/workspace.js';
import { URI } from '../../../../base/common/uri.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { Emitter } from '../../../../base/common/event.js';
import { ExecutionEvent, ExecutionEventType } from '../common/executionEvents.js';

const OUTPUT_DIR = '.ai-exec';
const EXIT_MARKER = 'AI_EXIT:';
const STORAGE_KEY_HISTORY = 'aiExecution.terminalHistory';
const MAX_HISTORY = 100;

export class TerminalExecutionBridgeService extends Disposable implements ITerminalExecutionBridgeService {
	declare readonly _serviceBrand: undefined;

	private readonly _onExecutionEvent = new Emitter<ExecutionEvent>();
	readonly onExecutionEvent = this._onExecutionEvent.event;

	private _history: CommandHistoryEntry[] = [];
	private _activeCommands: Map<string, { spec: CommandSpec; startedAt: number }> = new Map();
	private _commandCounter = 0;
	private _outputFileUri: URI | null = null;

	constructor(
		@ICommandService private readonly commandService: ICommandService,
		@IFileService private readonly fileService: IFileService,
		@ILogService private readonly logService: ILogService,
		@IStorageService private readonly storageService: IStorageService,
		@IWorkspaceContextService private readonly workspaceContextService: IWorkspaceContextService,
	) {
		super();
		this._loadHistory();
		this._ensureOutputDir();
	}

	// -- Core execution method -- ---------------------------------------------

	async executeCommand(spec: CommandSpec): Promise<ExecutionResult> {
		const commandId = `cmd-${++this._commandCounter}`;
		const startTime = Date.now();

		this._activeCommands.set(commandId, { spec, startedAt: startTime });
		this._emitEvent(ExecutionEventType.CommandStarted, { commandId, command: spec.command, cwd: spec.cwd });
		this.logService.info(`[TerminalBridge] Executing: ${spec.command} in ${spec.cwd}`);

		try {
			const result = await this._executeWithFileRedirect(spec, commandId);
			const duration = Date.now() - startTime;

			const execResult: ExecutionResult = {
				success: result.exitCode === 0,
				exitCode: result.exitCode,
				stdout: result.stdout,
				stderr: result.stderr,
				duration,
				timedOut: result.timedOut,
				command: spec.command,
				timestamp: startTime,
				mode: ExecutionMode.FileRedirect,
			};

			this._recordHistory(spec, execResult);
			this._activeCommands.delete(commandId);

			if (execResult.success) {
				this._emitEvent(ExecutionEventType.CommandCompleted, { commandId, exitCode: result.exitCode, duration });
			} else {
				this._emitEvent(ExecutionEventType.CommandFailed, { commandId, exitCode: result.exitCode, stdout: result.stdout.substring(0, 500), duration });
			}

			return execResult;
		} catch (err: any) {
			const duration = Date.now() - startTime;
			this._activeCommands.delete(commandId);

			const execResult: ExecutionResult = {
				success: false,
				exitCode: -1,
				stdout: '',
				stderr: String(err),
				duration,
				timedOut: false,
				command: spec.command,
				timestamp: startTime,
				mode: ExecutionMode.FileRedirect,
			};

			this._recordHistory(spec, execResult);
			this._emitEvent(ExecutionEventType.CommandFailed, { commandId, error: String(err), duration });
			return execResult;
		}
	}

	async executeWithOutputCapture(command: string, cwd: string, timeout: number = 30000): Promise<ExecutionResult> {
		return this.executeCommand({ command, cwd, timeout });
	}

	async queueCommand(spec: CommandSpec): Promise<ExecutionResult> {
		// Sequential queue - wait for any running command to finish
		while (this._activeCommands.size > 0) {
			await new Promise(resolve => setTimeout(resolve, 200));
		}
		return this.executeCommand(spec);
	}

	getExecutionHistory(): CommandHistoryEntry[] { return [...this._history]; }
	clearHistory(): void { this._history = []; this._saveHistory(); }
	isCommandRunning(command: string): boolean { return [...this._activeCommands.values()].some(a => a.spec.command === command); }
	cancelRunningCommand(command: string): boolean {
		// Cannot truly cancel terminal commands programmatically in VS Code's
		// browser workbench. Log the attempt for audit trail.
		this.logService.warn(`[TerminalBridge] Cancel requested for: ${command}`);
		return false;
	}
	getActiveProcessCount(): number { return this._activeCommands.size; }

	// -- Private: File redirect execution -- -----------------------------------

	private async _executeWithFileRedirect(spec: CommandSpec, commandId: string): Promise<{ stdout: string; stderr: string; exitCode: number; timedOut: boolean }> {
		const workspace = this.workspaceContextService.getWorkspace();
		const rootUri = workspace.folders[0]?.uri;
		if (!rootUri) {
			throw new Error('No workspace folder available for command execution');
		}

		const outputUri = URI.joinPath(rootUri, OUTPUT_DIR, `${commandId}.log`);
		const escapedPath = outputUri.fsPath.replace(/"/g, '\\"');

		// Build the command with output redirect and exit code capture.
		// The AI_EXIT marker is appended after the command finishes, allowing
		// us to parse the exit code from the output file.
		const fullCommand = `${spec.command} > "${escapedPath}" 2>&1; echo "${EXIT_MARKER}$?" >> "${escapedPath}"`;

		// Ensure output directory exists
		try {
			await this.fileService.createFolder(URI.joinPath(rootUri, OUTPUT_DIR));
		} catch { /* may already exist */ }

		// Clear any previous output file
		try { await this.fileService.del(outputUri); } catch { /* doesn't exist yet */ }

		// Send command to VS Code terminal
		try {
			await this.commandService.executeCommand('workbench.action.terminal.sendText', undefined, fullCommand + '\n', true);
		} catch (err) {
			// Fallback: try creating a new terminal first
			try {
				await this.commandService.executeCommand('workbench.action.terminal.newWithProfile', undefined);
				await new Promise(resolve => setTimeout(resolve, 500));
				await this.commandService.executeCommand('workbench.action.terminal.sendText', undefined, fullCommand + '\n', true);
			} catch (err2) {
				this.logService.error('[TerminalBridge] Failed to send command to terminal:', err2);
				return { stdout: '', stderr: `Terminal execution failed: ${String(err2)}`, exitCode: -1, timedOut: false };
			}
		}

		// Wait for output file to appear and stabilize
		const timeout = spec.timeout || 30000;
		const output = await this._waitForOutputFile(outputUri, timeout, commandId);

		// Clean up output file
		try { await this.fileService.del(outputUri); } catch { /* ignore */ }

		// Parse exit code from output
		const escapedMarker = EXIT_MARKER.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
		const exitCodeMatch = output.match(new RegExp(`${escapedMarker}(\\d+)\\s*$`));
		const exitCode = exitCodeMatch ? parseInt(exitCodeMatch[1]) : 1;
		const cleanOutput = output.replace(new RegExp(`\\n?${escapedMarker}\\d+\\s*$`), '');

		// Emit output chunks as events for live UI updates
		this._emitEvent(ExecutionEventType.CommandOutput, { commandId, output: cleanOutput.substring(0, 2000) });

		return { stdout: cleanOutput, stderr: '', exitCode, timedOut: output.includes('__TIMEOUT__') };
	}

	private async _waitForOutputFile(uri: URI, timeout: number, commandId: string): Promise<string> {
		const startTime = Date.now();
		const pollInterval = 200;
		let lastSize = -1;
		let stableCount = 0;

		while (Date.now() - startTime < timeout) {
			try {
				const stat = await this.fileService.stat(uri);
				if (stat.size > 0) {
					// Check if file size is stable (command finished writing)
					if (stat.size === lastSize) {
						stableCount++;
						// Wait for 3 consecutive same-size reads (600ms stability)
						// before considering the write complete
						if (stableCount >= 3) {
							// Also verify the exit marker is present, which confirms
							// the command has finished and the exit code was written
							const content = await this.fileService.readFile(uri);
							const text = content.value.toString();
							if (text.includes(EXIT_MARKER)) {
								return text;
							}
						}
					} else {
						stableCount = 0;
						lastSize = stat.size;
					}

					// Emit live output events for partial reads
					if (stableCount === 0) {
						const content = await this.fileService.readFile(uri);
						this._emitEvent(ExecutionEventType.CommandOutput, { commandId, output: content.value.toString().substring(0, 500), partial: true });
					}
				}
			} catch { /* File doesn't exist yet */ }

			await new Promise(resolve => setTimeout(resolve, pollInterval));
		}

		// Timeout - try to read whatever output we have so far
		try {
			const content = await this.fileService.readFile(uri);
			return content.value.toString() + '\n__TIMEOUT__';
		} catch {
			return `__TIMEOUT__: Command timed out after ${timeout}ms`;
		}
	}

	// -- Private: History and events -- ----------------------------------------

	private _recordHistory(spec: CommandSpec, result: ExecutionResult): void {
		const entry: CommandHistoryEntry = {
			id: `hist-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
			spec,
			result,
			timestamp: Date.now(),
		};
		this._history.unshift(entry);
		if (this._history.length > MAX_HISTORY) {
			this._history = this._history.slice(0, MAX_HISTORY);
		}
		this._saveHistory();
	}

	private _loadHistory(): void {
		try {
			const stored = this.storageService.get(STORAGE_KEY_HISTORY, undefined);
			if (stored) {
				this._history = JSON.parse(stored);
			}
		} catch {
			this._history = [];
		}
	}

	private _saveHistory(): void {
		try {
			this.storageService.store(STORAGE_KEY_HISTORY, JSON.stringify(this._history.slice(0, MAX_HISTORY)), -1, 0);
		} catch { /* storage full */ }
	}

	private _emitEvent(type: ExecutionEventType, data: Record<string, any>): void {
		this._onExecutionEvent.fire({
			type,
			timestamp: Date.now(),
			data,
			source: 'TerminalExecutionBridge',
		});
	}

	private async _ensureOutputDir(): Promise<void> {
		const workspace = this.workspaceContextService.getWorkspace();
		const rootUri = workspace.folders[0]?.uri;
		if (rootUri) {
			try {
				await this.fileService.createFolder(URI.joinPath(rootUri, OUTPUT_DIR));
			} catch { /* may already exist */ }

			// Add .gitignore to exclude output files from version control
			const gitignoreUri = URI.joinPath(rootUri, OUTPUT_DIR, '.gitignore');
			try {
				await this.fileService.writeFile(gitignoreUri, new TextEncoder().encode('*\n!.gitignore\n'));
			} catch { /* may already exist */ }
		}
	}

	// -- Lifecycle -- ----------------------------------------------------------

	override dispose(): void {
		this._activeCommands.clear();
		this._onExecutionEvent.dispose();
		super.dispose();
	}
}
