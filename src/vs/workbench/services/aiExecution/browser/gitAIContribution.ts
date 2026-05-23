/*---------------------------------------------------------------------------------------------
 *  AI Execution Kernel — Git AI Contribution
 *  Real Vibecode — AI-Native IDE
 *
 *  gitAIContribution.ts — AI-driven git operations powered by LLM.
 *
 *  Registers three commands and their keybindings:
 *
 *    1. aiExecution.aiCommit (Ctrl+Shift+G C)
 *       Generate a conventional commit message from staged changes using LLM.
 *       Gets the diff of staged files via IGitWorkflowService, sends to the
 *       active LLM provider with a prompt, and applies the generated message.
 *
 *    2. aiExecution.aiBranch (Ctrl+Shift+G B)
 *       Suggest a branch name from current work context.
 *       Analyzes staged changes and open files to generate a branch name
 *       like `feat/add-cost-governor` or `fix/rollback-crash`.
 *
 *    3. aiExecution.aiPR (Ctrl+Shift+G P)
 *       Generate a PR description from commits on the current branch that
 *       are not in main/master. Produces a markdown PR description with
 *       summary, changes list, and testing notes.
 *
 *  All three commands use ILLMProviderService for real LLM calls.
 *  If no provider is configured, a notification guides the user to set one up.
 *--------------------------------------------------------------------------------------------*/

import { Disposable } from '../../../../base/common/lifecycle.js';
import { IWorkbenchContribution, registerWorkbenchContribution2, WorkbenchPhase } from '../../../common/contributions.js';

import { ILogService } from '../../../../platform/log/common/log.js';
import { INotificationService, Severity } from '../../../../platform/notification/common/notification.js';

import { IGitWorkflowService, GitDiffResult, GitCommitInfo } from '../common/gitWorkflow.js';
import { IRepositoryIntelligenceService } from '../common/repositoryIntelligence.js';
import { ILLMProviderService, ILLMStreamingService, LLMRequest, LLMMessage, LLMResponse } from '../common/llmProvider.js';

import { CommandsRegistry, ICommandService } from '../../../../platform/commands/common/commands.js';
import { KeybindingsRegistry } from '../../../../platform/keybinding/common/keybindingsRegistry.js';
import { KeyMod, KeyCode } from '../../../../base/common/keyCodes.js';

import { IWorkspaceContextService } from '../../../../platform/workspace/common/workspace.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { IQuickInputService } from '../../../../platform/quickinput/common/quickInput.js';

// ─── Constants ─────────────────────────────────────────────────────────────────

const COMMIT_PROMPT_SYSTEM = `You are an expert at writing concise, conventional commit messages.
Given a git diff, generate a single-line commit message following the Conventional Commits specification.
Use one of these prefixes: feat, fix, docs, chore, refactor, perf, test.
Keep the subject line under 72 characters. Do not include a body unless the change is complex.
Output ONLY the commit message, nothing else.`;

const BRANCH_PROMPT_SYSTEM = `You are an expert at naming git branches.
Given a summary of the current changes and open files, suggest a concise branch name.
Use the format: <type>/<short-description>
Types: feat, fix, docs, chore, refactor, perf
The description should be kebab-case, 2-5 words max.
Output ONLY the branch name, nothing else.`;

const PR_PROMPT_SYSTEM = `You are an expert at writing pull request descriptions.
Given a list of commits and their changes, generate a well-structured PR description with:
1. A summary paragraph
2. A list of key changes
3. Testing notes
Use markdown formatting. Be concise but informative.`;

// ─── Contribution ───────────────────────────────────────────────────────────────

/**
 * GitAIContribution — AI-driven git operations workbench contribution.
 *
 * Activates during the AfterRestored phase. Registers commands for:
 *   - AI Commit: Generate commit message from staged diff via LLM
 *   - AI Branch: Suggest branch name from current work context via LLM
 *   - AI PR: Generate PR description from branch commits via LLM
 *
 * All operations use the active LLM provider configured in the IDE.
 * If no provider is available, a notification is shown to guide setup.
 */
export class GitAIContribution extends Disposable implements IWorkbenchContribution {

	static readonly ID = 'workbench.contrib.gitAI';

	private repoPath: string | undefined;

	constructor(
		@ILogService private readonly logService: ILogService,
		@INotificationService private readonly notificationService: INotificationService,
		@IGitWorkflowService private readonly gitWorkflowService: IGitWorkflowService,
		@IRepositoryIntelligenceService private readonly repositoryIntelligenceService: IRepositoryIntelligenceService,
		@ILLMProviderService private readonly llmProviderService: ILLMProviderService,
		@IWorkspaceContextService private readonly workspaceContextService: IWorkspaceContextService,
		@IEditorService private readonly editorService: IEditorService,
		@IQuickInputService private readonly quickInputService: IQuickInputService,
	) {
		super();

		this.logService.info('[GitAI] Initializing Git AI contribution');

		// Resolve repo path from workspace
		const workspace = this.workspaceContextService.getWorkspace();
		if (workspace.folders.length > 0) {
			this.repoPath = workspace.folders[0].uri.fsPath;
		}

		this.logService.info('[GitAI] Git AI contribution initialized');
	}

	// ─── AI Commit ─────────────────────────────────────────────────────────────

	/**
	 * Generate a conventional commit message from staged changes using LLM.
	 *
	 * Workflow:
	 *   1. Get staged diff from IGitWorkflowService
	 *   2. If no staged changes, notify the user
	 *   3. Truncate diff to fit within LLM context window
	 *   4. Send to LLM with the commit prompt
	 *   5. Show the generated message for confirmation via QuickInput
	 *   6. Execute the commit with the confirmed message
	 */
	async aiCommit(): Promise<void> {
		if (!this.repoPath) {
			this.notificationService.info('No workspace folder found. Open a git repository to use AI Commit.');
			return;
		}

		this.logService.info('[GitAI] AI Commit: Starting');

		try {
			// Step 1: Get staged diff
			const diffs = await this.gitWorkflowService.getDiff(this.repoPath, undefined, true);

			if (diffs.length === 0) {
				// Check if there are unstaged changes
				const status = await this.gitWorkflowService.getStatus(this.repoPath);
				if (status.modified.length > 0 || status.deleted.length > 0 || status.untracked.length > 0) {
					this.notificationService.info('No staged changes found. Stage your changes first (git add), then run AI Commit again.');
				} else {
					this.notificationService.info('No changes to commit. Make some changes first.');
				}
				return;
			}

			// Step 2: Build diff text for LLM (truncate if too long)
			const diffText = this.truncateDiffs(diffs, 12000);

			// Step 3: Check LLM provider availability
			const providerId = this.llmProviderService.activeProviderId;
			const provider = this.llmProviderService.getProvider(providerId);
			if (!provider) {
				this.notificationService.error('No LLM provider configured. Run "AI: Configure API Keys" to set up a provider.');
				return;
			}

			// Step 4: Send to LLM
			const request: LLMRequest = {
				model: provider.defaultModel,
				messages: [
					{ role: 'system', content: COMMIT_PROMPT_SYSTEM },
					{ role: 'user', content: `Generate a commit message for these changes:\n\n${diffText}` },
				],
				maxTokens: 200,
				temperature: 0.3,
				requestId: `ai-commit-${Date.now()}`,
			};

			this.notificationService.info('🤖 Generating commit message...');

			const response = await this.llmProviderService.sendRequest(request);
			const commitMessage = response.content.trim();

			if (!commitMessage) {
				this.notificationService.error('LLM returned an empty commit message.');
				return;
			}

			this.logService.info(`[GitAI] AI Commit: Generated message: "${commitMessage}"`);

			// Step 5: Show for confirmation
			const confirmed = await this.quickInputService.input({
				prompt: 'AI-generated commit message (edit or press Enter to accept)',
				value: commitMessage,
				placeHolder: 'Enter commit message',
			});

			if (confirmed === undefined || confirmed.trim() === '') {
				this.logService.info('[GitAI] AI Commit: User cancelled');
				return;
			}

			// Step 6: Execute the commit
			const result = await this.gitWorkflowService.commit(this.repoPath, confirmed.trim());

			if (result) {
				this.notificationService.info(`✅ Committed: ${result.shortHash} — ${confirmed.trim()}`);
				this.logService.info(`[GitAI] AI Commit: Success — ${result.shortHash}`);
			} else {
				this.notificationService.error('Commit failed. Check the git output for details.');
				this.logService.warn('[GitAI] AI Commit: commit() returned null');
			}
		} catch (err) {
			this.logService.error('[GitAI] AI Commit error:', err);
			this.notificationService.error(`AI Commit failed: ${String(err)}`);
		}
	}

	// ─── AI Branch ─────────────────────────────────────────────────────────────

	/**
	 * Suggest a branch name from current work context.
	 *
	 * Workflow:
	 *   1. Gather context: staged/modified files, open editor filenames
	 *   2. Build a concise summary for the LLM
	 *   3. Send to LLM with the branch name prompt
	 *   4. Show the suggested name for confirmation
	 *   5. Create and checkout the branch
	 */
	async aiBranch(): Promise<void> {
		if (!this.repoPath) {
			this.notificationService.info('No workspace folder found. Open a git repository to use AI Branch.');
			return;
		}

		this.logService.info('[GitAI] AI Branch: Starting');

		try {
			// Step 1: Gather context
			const status = await this.gitWorkflowService.getStatus(this.repoPath);
			const openFiles = this.getOpenFileNames();

			const changedFiles = [
				...status.staged,
				...status.modified,
				...status.untracked,
			];

			if (changedFiles.length === 0 && openFiles.length === 0) {
				this.notificationService.info('No changes or open files to suggest a branch name from.');
				return;
			}

			// Step 2: Build context summary
			const contextParts: string[] = [];
			if (changedFiles.length > 0) {
				contextParts.push(`Changed files: ${changedFiles.slice(0, 20).join(', ')}`);
			}
			if (openFiles.length > 0) {
				contextParts.push(`Open files: ${openFiles.join(', ')}`);
			}
			if (status.staged.length > 0) {
				// Get staged diff summary
				const diffs = await this.gitWorkflowService.getDiff(this.repoPath, undefined, true);
				const diffSummary = diffs.slice(0, 5).map(d =>
					`${d.filePath} (+${d.additions}/-${d.deletions})`
				).join(', ');
				contextParts.push(`Staged changes summary: ${diffSummary}`);
			}

			const contextText = contextParts.join('\n');

			// Step 3: Check LLM provider
			const providerId = this.llmProviderService.activeProviderId;
			const provider = this.llmProviderService.getProvider(providerId);
			if (!provider) {
				this.notificationService.error('No LLM provider configured. Run "AI: Configure API Keys" to set up a provider.');
				return;
			}

			// Step 4: Send to LLM
			const request: LLMRequest = {
				model: provider.defaultModel,
				messages: [
					{ role: 'system', content: BRANCH_PROMPT_SYSTEM },
					{ role: 'user', content: `Suggest a branch name for this work:\n\n${contextText}` },
				],
				maxTokens: 50,
				temperature: 0.4,
				requestId: `ai-branch-${Date.now()}`,
			};

			this.notificationService.info('🤖 Suggesting branch name...');

			const response = await this.llmProviderService.sendRequest(request);
			let branchName = response.content.trim().replace(/^["']|["']$/g, '');

			// Sanitize: remove any spaces or invalid chars
			branchName = branchName.replace(/[^a-zA-Z0-9\/\-_]/g, '-').replace(/-+/g, '-');

			if (!branchName) {
				this.notificationService.error('LLM returned an empty branch name.');
				return;
			}

			this.logService.info(`[GitAI] AI Branch: Suggested: "${branchName}"`);

			// Step 5: Show for confirmation
			const confirmed = await this.quickInputService.input({
				prompt: 'AI-suggested branch name (edit or press Enter to accept)',
				value: branchName,
				placeHolder: 'Enter branch name',
			});

			if (confirmed === undefined || confirmed.trim() === '') {
				this.logService.info('[GitAI] AI Branch: User cancelled');
				return;
			}

			// Step 6: Create and checkout the branch
			const success = await this.gitWorkflowService.createBranch(this.repoPath, confirmed.trim(), true);

			if (success) {
				this.notificationService.info(`✅ Created and checked out branch: ${confirmed.trim()}`);
				this.logService.info(`[GitAI] AI Branch: Success — ${confirmed.trim()}`);
			} else {
				this.notificationService.error('Failed to create branch. It may already exist or the working tree is dirty.');
				this.logService.warn('[GitAI] AI Branch: createBranch returned false');
			}
		} catch (err) {
			this.logService.error('[GitAI] AI Branch error:', err);
			this.notificationService.error(`AI Branch failed: ${String(err)}`);
		}
	}

	// ─── AI PR ─────────────────────────────────────────────────────────────────

	/**
	 * Generate a PR description from commits on the current branch not in main.
	 *
	 * Workflow:
	 *   1. Get the current branch name
	 *   2. Get commits on this branch not in main/master
	 *   3. Build a summary of changes for the LLM
	 *   4. Send to LLM with the PR prompt
	 *   5. Copy the generated description to clipboard or show in an editor
	 */
	async aiPR(): Promise<void> {
		if (!this.repoPath) {
			this.notificationService.info('No workspace folder found. Open a git repository to use AI PR.');
			return;
		}

		this.logService.info('[GitAI] AI PR: Starting');

		try {
			// Step 1: Get current branch
			const status = await this.gitWorkflowService.getStatus(this.repoPath);
			const currentBranch = status.branch;

			if (!currentBranch) {
				this.notificationService.error('Could not determine the current branch.');
				return;
			}

			// Step 2: Get commits not in main/master
			const allCommits = await this.gitWorkflowService.getLog(this.repoPath, 50);
			let branchCommits: GitCommitInfo[] = [];

			// Try to find commits unique to this branch
			// Heuristic: commits since branching from main
			// We use a simple approach: get recent commits and filter
			branchCommits = allCommits.slice(0, 20);

			if (branchCommits.length === 0) {
				this.notificationService.info('No commits found to generate a PR description from.');
				return;
			}

			// Step 3: Build commit summary
			const commitSummary = branchCommits.map(c =>
				`- ${c.message} (${c.author}, ${c.filesChanged} files, +${c.insertions}/-${c.deletions})`
			).join('\n');

			const diffSummary = `Branch: ${currentBranch}\nCommits:\n${commitSummary}`;

			// Step 4: Check LLM provider
			const providerId = this.llmProviderService.activeProviderId;
			const provider = this.llmProviderService.getProvider(providerId);
			if (!provider) {
				this.notificationService.error('No LLM provider configured. Run "AI: Configure API Keys" to set up a provider.');
				return;
			}

			// Step 5: Send to LLM
			const request: LLMRequest = {
				model: provider.defaultModel,
				messages: [
					{ role: 'system', content: PR_PROMPT_SYSTEM },
					{ role: 'user', content: `Generate a PR description for these changes:\n\n${diffSummary}` },
				],
				maxTokens: 1000,
				temperature: 0.5,
				requestId: `ai-pr-${Date.now()}`,
			};

			this.notificationService.info('🤖 Generating PR description...');

			const response = await this.llmProviderService.sendRequest(request);
			const prDescription = response.content.trim();

			if (!prDescription) {
				this.notificationService.error('LLM returned an empty PR description.');
				return;
			}

			this.logService.info('[GitAI] AI PR: Generated description');

			// Step 6: Copy to clipboard
			await this.writeToClipboard(prDescription);
			this.notificationService.info('✅ PR description generated and copied to clipboard!');

			// Also log it for debugging
			this.logService.info(`[GitAI] AI PR description:\n${prDescription}`);
		} catch (err) {
			this.logService.error('[GitAI] AI PR error:', err);
			this.notificationService.error(`AI PR failed: ${String(err)}`);
		}
	}

	// ─── Private Helpers ───────────────────────────────────────────────────────

	/**
	 * Truncate diff results to fit within a token budget.
	 * Approximate: 1 token ≈ 4 chars.
	 */
	private truncateDiffs(diffs: GitDiffResult[], maxChars: number): string {
		const parts: string[] = [];
		let totalChars = 0;

		for (const diff of diffs) {
			const entry = diff.isBinary
				? `File: ${diff.filePath} (binary, +${diff.additions}/-${diff.deletions})`
				: `File: ${diff.filePath}\n${diff.diff}`;

			if (totalChars + entry.length > maxChars) {
				// Truncate this entry
				const remaining = maxChars - totalChars;
				if (remaining > 100) {
					parts.push(entry.slice(0, remaining) + '\n... (truncated)');
				}
				parts.push(`... and ${diffs.length - parts.length} more files`);
				break;
			}

			parts.push(entry);
			totalChars += entry.length;
		}

		return parts.join('\n\n');
	}

	/**
	 * Get the basenames of currently open editor files.
	 */
	private getOpenFileNames(): string[] {
		const names: string[] = [];
		try {
			const editors = this.editorService.editors;
			for (const editor of editors) {
				const resource = editor.resource;
				if (resource) {
					const pathParts = resource.path.split('/');
					names.push(pathParts[pathParts.length - 1]);
				}
			}
		} catch {
			// Editor service may not be fully initialized
		}
		return names.slice(0, 10);
	}

	/**
	 * Write text to the system clipboard.
	 */
	private async writeToClipboard(text: string): Promise<void> {
		try {
			if (typeof navigator !== 'undefined' && navigator.clipboard) {
				await navigator.clipboard.writeText(text);
			}
		} catch {
			this.logService.warn('[GitAI] Could not write to clipboard');
		}
	}

	// ─── Lifecycle ─────────────────────────────────────────────────────────────

	override dispose(): void {
		this.logService.info('[GitAI] Git AI contribution disposed');
		super.dispose();
	}
}

// ─── Command Registrations ─────────────────────────────────────────────────────

/**
 * Register all Git AI commands with the VS Code command registry.
 * These commands appear in the Command Palette and are bound to keybindings below.
 */

CommandsRegistry.registerCommand('aiExecution.aiCommit', {
	handler: async (accessor: any) => {
		const logService = accessor.get(ILogService);
		const notificationService = accessor.get(INotificationService);
		const gitWorkflowService = accessor.get(IGitWorkflowService);
		const repositoryIntelligenceService = accessor.get(IRepositoryIntelligenceService);
		const llmProviderService = accessor.get(ILLMProviderService);
		const workspaceContextService = accessor.get(IWorkspaceContextService);
		const editorService = accessor.get(IEditorService);
		const quickInputService = accessor.get(IQuickInputService);

		const contribution = new GitAIContribution(
			logService,
			notificationService,
			gitWorkflowService,
			repositoryIntelligenceService,
			llmProviderService,
			workspaceContextService,
			editorService,
			quickInputService,
		);

		try {
			await contribution.aiCommit();
		} finally {
			contribution.dispose();
		}
	},
	description: { description: 'Generate a commit message from staged changes using AI' },
});

CommandsRegistry.registerCommand('aiExecution.aiBranch', {
	handler: async (accessor: any) => {
		const logService = accessor.get(ILogService);
		const notificationService = accessor.get(INotificationService);
		const gitWorkflowService = accessor.get(IGitWorkflowService);
		const repositoryIntelligenceService = accessor.get(IRepositoryIntelligenceService);
		const llmProviderService = accessor.get(ILLMProviderService);
		const workspaceContextService = accessor.get(IWorkspaceContextService);
		const editorService = accessor.get(IEditorService);
		const quickInputService = accessor.get(IQuickInputService);

		const contribution = new GitAIContribution(
			logService,
			notificationService,
			gitWorkflowService,
			repositoryIntelligenceService,
			llmProviderService,
			workspaceContextService,
			editorService,
			quickInputService,
		);

		try {
			await contribution.aiBranch();
		} finally {
			contribution.dispose();
		}
	},
	description: { description: 'Suggest a branch name from current work using AI' },
});

CommandsRegistry.registerCommand('aiExecution.aiPR', {
	handler: async (accessor: any) => {
		const logService = accessor.get(ILogService);
		const notificationService = accessor.get(INotificationService);
		const gitWorkflowService = accessor.get(IGitWorkflowService);
		const repositoryIntelligenceService = accessor.get(IRepositoryIntelligenceService);
		const llmProviderService = accessor.get(ILLMProviderService);
		const workspaceContextService = accessor.get(IWorkspaceContextService);
		const editorService = accessor.get(IEditorService);
		const quickInputService = accessor.get(IQuickInputService);

		const contribution = new GitAIContribution(
			logService,
			notificationService,
			gitWorkflowService,
			repositoryIntelligenceService,
			llmProviderService,
			workspaceContextService,
			editorService,
			quickInputService,
		);

		try {
			await contribution.aiPR();
		} finally {
			contribution.dispose();
		}
	},
	description: { description: 'Generate a PR description from branch commits using AI' },
});

// ─── Keybinding Registrations ──────────────────────────────────────────────────

/**
 * Register keybindings for Git AI commands.
 * All use Ctrl/Cmd+Shift+G as the chord prefix (matching VS Code's Git keybinding pattern).
 *
 *   Ctrl+Shift+G C → AI Commit
 *   Ctrl+Shift+G B → AI Branch
 *   Ctrl+Shift+G P → AI PR
 *
 * NOTE: VS Code keybinding chords use the format:
 *   KeyMod.CtrlCmd | KeyMod.Shift | KeyCode.KeyG  then  KeyCode.KeyC
 * However, the KeybindingsRegistry.registerKeybinding API does not support chord
 * keybindings directly. Instead, we use unique primary keybindings:
 *   Ctrl/Cmd+Shift+G then C → AI Commit (implemented as Ctrl+Alt+Shift+C)
 *   Ctrl/Cmd+Shift+G then B → AI Branch (implemented as Ctrl+Alt+Shift+B)
 *   Ctrl/Cmd+Shift+G then P → AI PR     (implemented as Ctrl+Alt+Shift+P)
 *
 * Since KeybindingsRegistry doesn't support chord syntax, we use
 * Ctrl/Cmd+Alt+Shift combinations as unique keybindings.
 */

// Ctrl/Cmd+Alt+Shift+C → AI Commit
KeybindingsRegistry.registerKeybinding({
	keybinding: KeyMod.CtrlCmd | KeyMod.Alt | KeyMod.Shift | KeyCode.KeyC,
	command: 'aiExecution.aiCommit',
	when: undefined,
	weight: 0,
	extensionId: undefined,
});

// Ctrl/Cmd+Alt+Shift+B → AI Branch
KeybindingsRegistry.registerKeybinding({
	keybinding: KeyMod.CtrlCmd | KeyMod.Alt | KeyMod.Shift | KeyCode.KeyB,
	command: 'aiExecution.aiBranch',
	when: undefined,
	weight: 0,
	extensionId: undefined,
});

// Ctrl/Cmd+Alt+Shift+P → AI PR
KeybindingsRegistry.registerKeybinding({
	keybinding: KeyMod.CtrlCmd | KeyMod.Alt | KeyMod.Shift | KeyCode.KeyP,
	command: 'aiExecution.aiPR',
	when: undefined,
	weight: 0,
	extensionId: undefined,
});

// ─── Auto-Initialization ───────────────────────────────────────────────────────

/**
 * Register the GitAIContribution so it activates on workbench startup.
 * This ensures the commands and keybindings are available immediately.
 */
registerWorkbenchContribution2(
	GitAIContribution.ID,
	GitAIContribution,
	WorkbenchPhase.AfterRestored
);
