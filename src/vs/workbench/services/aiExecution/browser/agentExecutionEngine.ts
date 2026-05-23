/*---------------------------------------------------------------------------------------------
 *  Agent Execution Engine — Multi-Agent to LLM Wiring Layer
 *  Real Vibecode — AI-Native IDE
 *
 *  IAgentExecutionEngine — The bridge between the multi-agent orchestrator and the
 *  LLM provider service. This is where plans become real LLM calls.
 *
 *  The orchestrator (agentOrchestratorService) has an elaborate plan/step model
 *  but no execution wiring. The multi-agent execution service (multiAgentExecutionService)
 *  has task bookkeeping but no real LLM execution. The LLM provider service
 *  (llmProviderService) has full HTTP integration but no awareness of agents.
 *
 *  This engine connects them all:
 *    - Takes execution steps from the orchestrator
 *    - Builds LLM requests with role-appropriate system prompts
 *    - Sends them through the LLM provider (real HTTP calls)
 *    - Parses responses for tool calls and executes them
 *    - Supports parallel execution of independent steps
 *    - Handles agent handoffs with full context passing
 *    - Tracks execution progress and emits events
 *
 *  Hard Rules:
 *    1. Every LLM call goes through ILLMProviderService — no direct HTTP
 *    2. All tool execution results are validated before returning
 *    3. Context is never mutated — new contexts are created with appended history
 *    4. Parallel execution uses Promise.allSettled() to tolerate individual failures
 *    5. Handoffs carry complete conversation context forward
 *--------------------------------------------------------------------------------------------*/

import { Disposable } from '../../../../base/common/lifecycle.js';
import { Emitter, Event } from '../../../../base/common/event.js';
import { generateUuid } from '../../../../base/common/uuid.js';
import { CancellationToken, CancellationTokenSource } from '../../../../base/common/cancellation.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';

import {
        ILLMProviderService,
        ILLMStreamingService,
        LLMRequest,
        LLMMessage,
        LLMResponse,
        LLMToolCall,
        LLMToolDefinition,
        LLMTokenUsage,
        StreamChunk,
        FallbackChainConfig,
} from '../common/llmProvider.js';

import {
        AgentRole,
        IMultiAgentExecutionService,
} from '../common/multiAgentExecution.js';

// Orchestrator types are available for integration but the engine uses its own
// ExecutionStep type for a cleaner interface boundary

// ─── Service Identifier ──────────────────────────────────────────────────────

export const IAgentExecutionEngine = createDecorator<IAgentExecutionEngine>('agentExecutionEngine');

// ─── Public Types ────────────────────────────────────────────────────────────

/**
 * Mutable execution context carried between agent steps.
 * Each step produces a new context with appended history — the original is never mutated.
 */
export interface AgentContext {
        /** Conversation history accumulated across all steps so far */
        conversationHistory: LLMMessage[];
        /** Key-value store shared across all agents in a plan */
        sharedMemory: Map<string, string>;
        /** Files currently being worked on by the agent(s) */
        workingFiles: string[];
        /** Zero-based index of the current step within the plan */
        currentStep: number;
        /** Total number of steps in the plan */
        totalSteps: number;
}

/**
 * Result of executing a single agent step.
 * Contains both the LLM response data and execution metadata.
 */
export interface StepResult {
        /** ID of the executed step */
        readonly stepId: string;
        /** Whether the step completed without errors */
        readonly success: boolean;
        /** The text content from the LLM response */
        readonly content: string;
        /** Tool calls returned by the LLM (may be empty) */
        readonly toolCalls: LLMToolCall[];
        /** Token usage statistics from the LLM call */
        readonly usage: LLMTokenUsage;
        /** Optional: ID of the suggested next step (for dynamic routing) */
        readonly nextStep?: string;
        /** Error message if the step failed */
        readonly error?: string;
}

/**
 * An execution step adapted for the engine.
 * Bridges between the orchestrator's IPlanStep and a simplified step model
 * that the engine can send to the LLM.
 */
export interface ExecutionStep {
        /** Unique step ID */
        readonly id: string;
        /** Human-readable label */
        readonly label: string;
        /** Description of what this step should accomplish */
        readonly description: string;
        /** The agent role responsible for this step */
        readonly role: AgentRole;
        /** Optional: the specific model to use (overrides default) */
        readonly model?: string;
        /** Optional: tools available for this step */
        readonly tools?: LLMToolDefinition[];
        /** Optional: maximum tokens for the LLM response */
        readonly maxTokens?: number;
        /** Optional: temperature override */
        readonly temperature?: number;
        /** Optional: timeout in milliseconds */
        readonly timeoutMs?: number;
}

/**
 * Event fired when a step begins execution.
 */
export interface StepExecutionStartEvent {
        readonly stepId: string;
        readonly role: AgentRole;
        readonly timestamp: number;
}

/**
 * Event fired when a step completes execution.
 */
export interface StepExecutionCompleteEvent {
        readonly stepId: string;
        readonly role: AgentRole;
        readonly success: boolean;
        readonly tokenUsage: LLMTokenUsage;
        readonly durationMs: number;
        readonly timestamp: number;
}

/**
 * Event fired when a handoff occurs between agents.
 */
export interface AgentHandoffEvent {
        readonly fromAgent: string;
        readonly toAgent: string;
        readonly summary: string;
        readonly timestamp: number;
}

/**
 * Tool executor function type. The engine delegates tool execution to
 * a caller-provided function so it stays decoupled from specific tool implementations.
 */
export type ToolExecutor = (toolCall: LLMToolCall, cancellationToken: CancellationToken) => Promise<string>;

// ─── Agent Role System Prompts ───────────────────────────────────────────────

/**
 * System prompts for each agent role. These guide the LLM's behavior
 * based on which agent role is executing the step.
 */
const AGENT_ROLE_SYSTEM_PROMPTS: Record<AgentRole, string> = {
        [AgentRole.Planner]: `You are a planning agent. Break down the user's request into specific, actionable steps that can be executed independently. For each step, describe:
- What needs to be done
- Which agent role should handle it (coder, verifier, repairer)
- What files or resources are involved
- What the expected output is
- Any dependencies on other steps

Be precise and structured. Use numbered lists. Avoid vague instructions. Each step should be small enough to be completed in a single LLM turn.`,

        [AgentRole.Coder]: `You are a coding agent. Write clean, efficient code to implement the given step. Follow these principles:
- Write production-quality code with proper error handling
- Follow existing code style and conventions in the project
- Include appropriate type annotations
- Add comments for non-obvious logic
- Prefer simple, readable solutions over clever ones
- If you need to modify existing code, preserve its existing behavior unless the step explicitly asks for a change
- When creating new files, include proper imports and exports
- Test your logic mentally before outputting code`,

        [AgentRole.Verifier]: `You are a verification agent. Review the code changes for correctness, security, and quality. Check for:
- Logic errors and edge cases
- Security vulnerabilities (injection, XSS, etc.)
- Type safety issues
- Missing error handling
- Performance concerns
- Code style and convention violations
- Incomplete implementations

Provide a clear verdict (PASS/FAIL) with specific issues listed. If issues are found, describe exactly what needs to be fixed and suggest a repair approach.`,

        [AgentRole.Repairer]: `You are a repair agent. Fix the issues identified by the verifier. Follow these guidelines:
- Address each issue specifically — don't rewrite unrelated code
- Preserve the original intent of the code
- Make minimal, targeted changes
- Verify your fix doesn't introduce new issues
- If a fix requires significant refactoring, explain why
- After fixing, briefly describe what was changed and why`,

        [AgentRole.MemoryManager]: `You are a memory management agent. Manage the shared context and knowledge for the agent team. Your responsibilities:
- Store important intermediate results in shared memory for other agents
- Retrieve and summarize relevant context from previous steps
- Identify when context is stale and needs refreshing
- Consolidate overlapping or redundant information
- Track which files have been modified and their current state
- Provide concise context summaries for handoffs between agents`,
};

// ─── Default Configuration ───────────────────────────────────────────────────

const DEFAULT_MODEL = 'gpt-4o';
const DEFAULT_MAX_TOKENS = 4096;
const DEFAULT_TEMPERATURE = 0.2;
const DEFAULT_TIMEOUT_MS = 120000;
const MAX_CONTEXT_MESSAGES = 50;

// ─── Service Interface ───────────────────────────────────────────────────────

/**
 * IAgentExecutionEngine — The execution engine that wires multi-agent
 * orchestration to real LLM provider calls.
 *
 * This is the "missing piece" between:
 *   - agentOrchestratorService (plan/step model, no LLM wiring)
 *   - multiAgentExecutionService (task bookkeeping, no LLM calls)
 *   - llmProviderService (real HTTP LLM integration, no agent awareness)
 *
 * The engine:
 *   1. Takes ExecutionSteps and builds LLM requests with role-appropriate prompts
 *   2. Sends requests through ILLMProviderService (real HTTP)
 *   3. Parses responses for content and tool calls
 *   4. Executes tool calls via a pluggable ToolExecutor
 *   5. Returns structured StepResults with token usage and next-step hints
 *   6. Supports parallel execution with Promise.allSettled()
 *   7. Handles agent handoffs with full context passing
 */
export interface IAgentExecutionEngine {
        readonly _serviceBrand: undefined;

        // ─── Core Execution ─────────────────────────────────────────────────────

        /**
         * Execute a single agent step by sending it to the LLM.
         * Builds a request with the role's system prompt, sends it through
         * the LLM provider, and returns a structured result.
         *
         * @param step The execution step to run
         * @param context The current agent context (conversation history, shared memory, etc.)
         * @param token Optional cancellation token
         * @returns The step result with content, tool calls, and usage stats
         */
        executeStep(step: ExecutionStep, context: AgentContext, token?: CancellationToken): Promise<StepResult>;

        /**
         * Execute multiple independent steps in parallel.
         * Uses Promise.allSettled() so individual failures don't abort the batch.
         * Each step gets its own LLM call with the shared context.
         *
         * @param steps The independent steps to execute in parallel
         * @param context The shared agent context
         * @param token Optional cancellation token
         * @returns Array of step results (some may indicate failure)
         */
        executePlanParallel(steps: ExecutionStep[], context: AgentContext, token?: CancellationToken): Promise<StepResult[]>;

        /**
         * Execute steps sequentially, passing context forward between each step.
         * Each step's result is appended to the conversation history before the
         * next step executes. If a step fails, execution stops and the partial
         * results are returned.
         *
         * @param steps The steps to execute in order
         * @param context The initial agent context
         * @param token Optional cancellation token
         * @returns Array of step results for completed steps
         */
        executePlanSequential(steps: ExecutionStep[], context: AgentContext, token?: CancellationToken): Promise<StepResult[]>;

        // ─── Agent Handoff ──────────────────────────────────────────────────────

        /**
         * Handle a context handoff from one agent role to another.
         * Constructs a new context with:
         *   - The full conversation history carried forward
         *   - A handoff message summarizing what the source agent accomplished
         *   - The target agent's role appended to shared memory
         *
         * @param fromAgent The source agent role name
         * @param toAgent The target agent role name
         * @param context The current agent context
         * @returns A new AgentContext with the handoff applied
         */
        handleHandoff(fromAgent: string, toAgent: string, context: AgentContext): Promise<AgentContext>;

        // ─── Tool Execution ─────────────────────────────────────────────────────

        /**
         * Register a tool executor function. When the LLM returns tool calls,
         * this function is invoked to execute them.
         *
         * @param executor The function that handles tool execution
         */
        registerToolExecutor(executor: ToolExecutor): void;

        // ─── Events ─────────────────────────────────────────────────────────────

        /** Fired when a step begins execution */
        readonly onStepExecutionStart: Event<StepExecutionStartEvent>;
        /** Fired when a step completes (success or failure) */
        readonly onStepExecutionComplete: Event<StepExecutionCompleteEvent>;
        /** Fired when an agent handoff occurs */
        readonly onAgentHandoff: Event<AgentHandoffEvent>;

        // ─── Configuration ──────────────────────────────────────────────────────

        /**
         * Set the default model for LLM calls.
         */
        setDefaultModel(model: string): void;

        /**
         * Get the current default model.
         */
        readonly defaultModel: string;

        /**
         * Set the fallback chain configuration for LLM calls.
         */
        setFallbackChain(chain: FallbackChainConfig): void;

        // ─── Streaming Execution ──────────────────────────────────────────────

        /**
         * Stream a single agent step, yielding tokens as they arrive.
         * Uses ILLMStreamingService for real-time token delivery.
         *
         * @param step The execution step to stream
         * @param context The current agent context
         * @param token Optional cancellation token
         * @returns An async iterable of stream chunks
         */
        streamStep(step: ExecutionStep, context: AgentContext, token?: CancellationToken): AsyncIterable<StreamChunk>;
}

// ─── Implementation ──────────────────────────────────────────────────────────

export class AgentExecutionEngine extends Disposable implements IAgentExecutionEngine {
        declare readonly _serviceBrand: undefined;

        // ─── State ────────────────────────────────────────────────────────────────

        private _defaultModel: string = DEFAULT_MODEL;
        private _fallbackChain: FallbackChainConfig | undefined;
        private _toolExecutor: ToolExecutor | undefined;

        // ─── Events ───────────────────────────────────────────────────────────────

        private readonly _onStepExecutionStart = this._register(new Emitter<StepExecutionStartEvent>());
        readonly onStepExecutionStart = this._onStepExecutionStart.event;

        private readonly _onStepExecutionComplete = this._register(new Emitter<StepExecutionCompleteEvent>());
        readonly onStepExecutionComplete = this._onStepExecutionComplete.event;

        private readonly _onAgentHandoff = this._register(new Emitter<AgentHandoffEvent>());
        readonly onAgentHandoff = this._onAgentHandoff.event;

        // ─── Dependency Injection ─────────────────────────────────────────────────

        constructor(
                @ILLMProviderService private readonly llmProvider: ILLMProviderService,
                @ILLMStreamingService private readonly llmStreaming: ILLMStreamingService,
                @IMultiAgentExecutionService private readonly multiAgentService: IMultiAgentExecutionService,
                @ILogService private readonly logService: ILogService,
        ) {
                super();
                this.logService.info('[AgentExecutionEngine] Initialized');
        }

        // ─── Core Execution ──────────────────────────────────────────────────────

        async executeStep(step: ExecutionStep, context: AgentContext, token?: CancellationToken): Promise<StepResult> {
                const startTime = Date.now();
                const stepStartEvent: StepExecutionStartEvent = {
                        stepId: step.id,
                        role: step.role,
                        timestamp: startTime,
                };
                this._onStepExecutionStart.fire(stepStartEvent);

                this.logService.info(`[AgentExecutionEngine] Executing step "${step.label}" (${step.id}) with role=${step.role}`);

                try {
                        // Build the LLM request
                        const request = this._buildLLMRequest(step, context);

                        // Send to LLM provider
                        const response = await this._sendLLMRequest(request, token);

                        // Execute any tool calls returned by the LLM
                        let toolCallContent = '';
                        if (response.toolCalls.length > 0 && this._toolExecutor) {
                                toolCallContent = await this._executeToolCalls(response.toolCalls, token);
                        } else if (response.toolCalls.length > 0 && !this._toolExecutor) {
                                this.logService.warn(`[AgentExecutionEngine] LLM returned ${response.toolCalls.length} tool calls but no tool executor is registered`);
                        }

                        // Combine content
                        const content = response.content + (toolCallContent ? `\n\n--- Tool Results ---\n${toolCallContent}` : '');

                        // Parse next step hint from the response
                        const nextStep = this._extractNextStepHint(response.content);

                        const result: StepResult = {
                                stepId: step.id,
                                success: true,
                                content,
                                toolCalls: response.toolCalls,
                                usage: response.usage,
                                nextStep,
                        };

                        const durationMs = Date.now() - startTime;
                        this._onStepExecutionComplete.fire({
                                stepId: step.id,
                                role: step.role,
                                success: true,
                                tokenUsage: response.usage,
                                durationMs,
                                timestamp: Date.now(),
                        });

                        this.logService.info(
                                `[AgentExecutionEngine] Step "${step.label}" completed in ${durationMs}ms, ` +
                                `tokens: ${response.usage.totalTokens}, tool calls: ${response.toolCalls.length}`
                        );

                        return result;
                } catch (error: any) {
                        const durationMs = Date.now() - startTime;
                        const errorMsg = error?.message || String(error);

                        this._onStepExecutionComplete.fire({
                                stepId: step.id,
                                role: step.role,
                                success: false,
                                tokenUsage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
                                durationMs,
                                timestamp: Date.now(),
                        });

                        this.logService.error(`[AgentExecutionEngine] Step "${step.label}" failed after ${durationMs}ms: ${errorMsg}`);

                        return {
                                stepId: step.id,
                                success: false,
                                content: '',
                                toolCalls: [],
                                usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
                                error: errorMsg,
                        };
                }
        }

        async executePlanParallel(steps: ExecutionStep[], context: AgentContext, token?: CancellationToken): Promise<StepResult[]> {
                if (steps.length === 0) {
                        return [];
                }

                this.logService.info(`[AgentExecutionEngine] Executing ${steps.length} steps in parallel`);

                // Create per-step cancellation tokens linked to the parent
                const cts = token
                        ? CancellationTokenSource.create(token)
                        : new CancellationTokenSource();

                try {
                        const settled = await Promise.allSettled(
                                steps.map(step => this.executeStep(step, context, cts.token))
                        );

                        const results: StepResult[] = [];
                        for (let i = 0; i < settled.length; i++) {
                                const outcome = settled[i];
                                if (outcome.status === 'fulfilled') {
                                        results.push(outcome.value);
                                } else {
                                        // Promise.allSettled rejection — shouldn't happen since executeStep
                                        // catches errors internally, but handle defensively
                                        const step = steps[i];
                                        results.push({
                                                stepId: step.id,
                                                success: false,
                                                content: '',
                                                toolCalls: [],
                                                usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
                                                error: outcome.reason?.message || String(outcome.reason),
                                        });
                                }
                        }

                        const succeeded = results.filter(r => r.success).length;
                        const failed = results.filter(r => !r.success).length;
                        this.logService.info(
                                `[AgentExecutionEngine] Parallel execution complete: ${succeeded} succeeded, ${failed} failed`
                        );

                        return results;
                } finally {
                        cts.dispose();
                }
        }

        async executePlanSequential(steps: ExecutionStep[], context: AgentContext, token?: CancellationToken): Promise<StepResult[]> {
                if (steps.length === 0) {
                        return [];
                }

                this.logService.info(`[AgentExecutionEngine] Executing ${steps.length} steps sequentially`);

                const results: StepResult[] = [];
                let currentContext = context;

                for (let i = 0; i < steps.length; i++) {
                        const step = steps[i];

                        // Check cancellation before each step
                        if (token?.isCancellationRequested) {
                                this.logService.info(`[AgentExecutionEngine] Sequential execution cancelled before step ${i}`);
                                break;
                        }

                        // Update context with current step position
                        currentContext = {
                                ...currentContext,
                                currentStep: i,
                                totalSteps: steps.length,
                        };

                        const result = await this.executeStep(step, currentContext, token);
                        results.push(result);

                        if (!result.success) {
                                this.logService.warn(
                                        `[AgentExecutionEngine] Step "${step.label}" failed, stopping sequential execution. ` +
                                        `Completed ${results.length}/${steps.length} steps.`
                                );
                                break;
                        }

                        // Pass context forward: append assistant response and user acknowledgment
                        currentContext = this._appendStepToContext(currentContext, step, result);
                }

                this.logService.info(
                        `[AgentExecutionEngine] Sequential execution complete: ${results.length}/${steps.length} steps executed, ` +
                        `${results.filter(r => r.success).length} succeeded`
                );

                return results;
        }

        // ─── Agent Handoff ───────────────────────────────────────────────────────

        async handleHandoff(fromAgent: string, toAgent: string, context: AgentContext): Promise<AgentContext> {
                this.logService.info(`[AgentExecutionEngine] Handling handoff: ${fromAgent} → ${toAgent}`);

                // Build the handoff summary from the last assistant message
                const lastAssistantMsg = [...context.conversationHistory]
                        .reverse()
                        .find(m => m.role === 'assistant');
                const summary = lastAssistantMsg?.content ?? 'No prior context available.';

                // Create handoff via multi-agent service for bookkeeping
                const task = this.multiAgentService.assignTask(
                        this._roleFromString(toAgent),
                        `Handoff from ${fromAgent}`,
                        summary,
                );
                this.multiAgentService.createHandoff(
                        this._roleFromString(fromAgent),
                        this._roleFromString(toAgent),
                        task.id,
                        summary,
                        summary,
                );

                // Build the new context with handoff messages appended
                const handoffUserMessage: LLMMessage = {
                        role: 'user',
                        content: `[Handoff from ${fromAgent}]\n\nThe previous agent (${fromAgent}) has completed its work. Here is a summary:\n\n${summary}\n\nPlease continue from where ${fromAgent} left off.`,
                };

                const newContext: AgentContext = {
                        conversationHistory: [
                                ...context.conversationHistory,
                                handoffUserMessage,
                        ],
                        sharedMemory: new Map(context.sharedMemory),
                        workingFiles: [...context.workingFiles],
                        currentStep: context.currentStep,
                        totalSteps: context.totalSteps,
                };

                // Record the handoff in shared memory
                newContext.sharedMemory.set(
                        `handoff:${fromAgent}->${toAgent}`,
                        JSON.stringify({
                                from: fromAgent,
                                to: toAgent,
                                summary,
                                timestamp: Date.now(),
                        })
                );

                this._onAgentHandoff.fire({
                        fromAgent,
                        toAgent,
                        summary,
                        timestamp: Date.now(),
                });

                return newContext;
        }

        // ─── Tool Execution ──────────────────────────────────────────────────────

        registerToolExecutor(executor: ToolExecutor): void {
                this._toolExecutor = executor;
                this.logService.info('[AgentExecutionEngine] Tool executor registered');
        }

        // ─── Configuration ───────────────────────────────────────────────────────

        setDefaultModel(model: string): void {
                this._defaultModel = model;
                this.logService.info(`[AgentExecutionEngine] Default model set to: ${model}`);
        }

        get defaultModel(): string {
                return this._defaultModel;
        }

        setFallbackChain(chain: FallbackChainConfig): void {
                this._fallbackChain = chain;
                this.logService.info(`[AgentExecutionEngine] Fallback chain configured with ${chain.providers.length} providers`);
        }

        // ─── Streaming Execution ──────────────────────────────────────────────

        async *streamStep(step: ExecutionStep, context: AgentContext, token?: CancellationToken): AsyncIterable<StreamChunk> {
                const request = this._buildLLMRequest(step, context);

                this._onStepExecutionStart.fire({
                        stepId: step.id,
                        role: step.role,
                        timestamp: Date.now(),
                });

                this.logService.info(`[AgentExecutionEngine] Streaming step "${step.label}" (${step.id}) with role=${step.role}`);

                try {
                        const stream = this.llmStreaming.streamRequest(request);
                        let lastUsage: LLMTokenUsage | undefined;

                        for await (const chunk of stream) {
                                if (token?.isCancellationRequested) {
                                        this.logService.info(`[AgentExecutionEngine] Streaming step "${step.label}" cancelled`);
                                        break;
                                }

                                if (chunk.usage) {
                                        lastUsage = chunk.usage;
                                }

                                yield chunk;
                        }

                        this._onStepExecutionComplete.fire({
                                stepId: step.id,
                                role: step.role,
                                success: true,
                                tokenUsage: lastUsage ?? { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
                                durationMs: 0, // Not tracked in streaming mode
                                timestamp: Date.now(),
                        });
                } catch (error: any) {
                        const errorMsg = error?.message || String(error);
                        this.logService.error(`[AgentExecutionEngine] Streaming step "${step.label}" failed: ${errorMsg}`);

                        this._onStepExecutionComplete.fire({
                                stepId: step.id,
                                role: step.role,
                                success: false,
                                tokenUsage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
                                durationMs: 0,
                                timestamp: Date.now(),
                        });
                }
        }

        // ─── Private: LLM Request Building ───────────────────────────────────────

        /**
         * Build a complete LLM request for a step, including:
         *   - Role-appropriate system prompt
         *   - Conversation history from context
         *   - Step description as the user message
         *   - Available tools from the step definition
         *   - Shared memory injection
         *   - Working files context
         */
        private _buildLLMRequest(step: ExecutionStep, context: AgentContext): LLMRequest {
                const systemPrompt = this._buildSystemPrompt(step, context);
                const messages = this._buildMessages(step, context, systemPrompt);

                return {
                        requestId: `agent-step-${step.id}-${generateUuid()}`,
                        model: step.model || this._defaultModel,
                        messages,
                        maxTokens: step.maxTokens ?? DEFAULT_MAX_TOKENS,
                        temperature: step.temperature ?? DEFAULT_TEMPERATURE,
                        tools: step.tools,
                        timeoutMs: step.timeoutMs ?? DEFAULT_TIMEOUT_MS,
                        metadata: {
                                stepId: step.id,
                                agentRole: step.role,
                                planStep: context.currentStep,
                                totalSteps: context.totalSteps,
                        },
                };
        }

        /**
         * Build the system prompt for a step, combining the role prompt with
         * any additional context from shared memory and working files.
         */
        private _buildSystemPrompt(step: ExecutionStep, context: AgentContext): string {
                const rolePrompt = AGENT_ROLE_SYSTEM_PROMPTS[step.role] || AGENT_ROLE_SYSTEM_PROMPTS[AgentRole.Coder];

                const parts: string[] = [rolePrompt];

                // Add progress context
                parts.push(`\n\nCurrent progress: Step ${context.currentStep + 1} of ${context.totalSteps}.`);

                // Add working files context
                if (context.workingFiles.length > 0) {
                        parts.push(`\n\nFiles currently being worked on:\n${context.workingFiles.map(f => `- ${f}`).join('\n')}`);
                }

                // Add relevant shared memory entries
                const memoryEntries = this._getRelevantMemoryEntries(step, context);
                if (memoryEntries.length > 0) {
                        parts.push('\n\nRelevant context from previous steps:');
                        for (const entry of memoryEntries) {
                                parts.push(`\n[${entry.key}]: ${entry.value}`);
                        }
                }

                return parts.join('');
        }

        /**
         * Build the message array for the LLM request.
         * Includes the system prompt, truncated conversation history,
         * and the current step description as a user message.
         */
        private _buildMessages(step: ExecutionStep, context: AgentContext, systemPrompt: string): LLMMessage[] {
                const messages: LLMMessage[] = [
                        { role: 'system', content: systemPrompt },
                ];

                // Add conversation history (truncated to prevent context overflow)
                const history = context.conversationHistory;
                const truncatedHistory = history.length > MAX_CONTEXT_MESSAGES
                        ? history.slice(-MAX_CONTEXT_MESSAGES)
                        : history;

                for (const msg of truncatedHistory) {
                        // Skip system messages from history (we already have our system prompt)
                        if (msg.role === 'system') { continue; }
                        messages.push(msg);
                }

                // Add the current step description as a user message
                const stepMessage = this._buildStepUserMessage(step);
                messages.push({ role: 'user', content: stepMessage });

                return messages;
        }

        /**
         * Build the user message for a step, including its description
         * and any additional instructions based on the role.
         */
        private _buildStepUserMessage(step: ExecutionStep): string {
                const parts: string[] = [];

                parts.push(`## Task: ${step.label}`);
                parts.push(`\n${step.description}`);

                // Role-specific instructions
                switch (step.role) {
                        case AgentRole.Planner:
                                parts.push('\n\nProvide a structured plan with numbered steps. For each step, specify the agent role, the action, and any dependencies.');
                                break;
                        case AgentRole.Coder:
                                parts.push('\n\nProvide the code implementation. Use code blocks with the appropriate language tag. Include any necessary imports.');
                                break;
                        case AgentRole.Verifier:
                                parts.push('\n\nProvide your review with a clear verdict (PASS/FAIL) at the beginning. List any issues with line references if possible.');
                                break;
                        case AgentRole.Repairer:
                                parts.push('\n\nProvide the fix as a code diff or replacement. Explain what was changed and why the fix addresses the issue.');
                                break;
                        case AgentRole.MemoryManager:
                                parts.push('\n\nProvide the context to store or retrieve. Use structured key-value format for shared memory entries.');
                                break;
                }

                return parts.join('');
        }

        // ─── Private: LLM Request Dispatch ───────────────────────────────────────

        /**
         * Send an LLM request, using the fallback chain if configured,
         * or the default provider otherwise.
         */
        private async _sendLLMRequest(request: LLMRequest, token?: CancellationToken): Promise<LLMResponse> {
                // Set up cancellation
                if (token?.isCancellationRequested) {
                        throw new Error('[AgentExecutionEngine] Request cancelled before sending');
                }

                let cts: CancellationTokenSource | undefined;
                if (token) {
                        cts = CancellationTokenSource.create(token);
                }

                try {
                        let response: LLMResponse;

                        if (this._fallbackChain) {
                                // Use fallback chain for resilient execution
                                response = await this.llmProvider.sendRequestWithFallback(request, this._fallbackChain);
                        } else {
                                // Use the active provider
                                response = await this.llmProvider.sendRequest(request);
                        }

                        // Check if the response indicates an error
                        if (!response.content && response.toolCalls.length === 0) {
                                this.logService.warn(`[AgentExecutionEngine] LLM returned empty content and no tool calls for step. Finish reason: ${response.finishReason}`);
                        }

                        return response;
                } catch (error: any) {
                        // Distinguish between provider errors and timeout errors
                        const errorMsg = error?.message || String(error);
                        if (errorMsg.includes('timed out') || errorMsg.includes('AbortError')) {
                                throw new Error(`[AgentExecutionEngine] LLM request timed out for step: ${errorMsg}`);
                        }
                        if (errorMsg.includes('budget') || errorMsg.includes('Budget')) {
                                throw new Error(`[AgentExecutionEngine] LLM budget exceeded: ${errorMsg}`);
                        }
                        throw new Error(`[AgentExecutionEngine] LLM provider error: ${errorMsg}`);
                } finally {
                        cts?.dispose();
                }
        }

        // ─── Private: Tool Call Execution ────────────────────────────────────────

        /**
         * Execute all tool calls returned by the LLM sequentially.
         * Each tool call result is formatted and appended to the response.
         * Tool execution errors are caught and reported, not thrown.
         */
        private async _executeToolCalls(toolCalls: LLMToolCall[], token?: CancellationToken): Promise<string> {
                if (!this._toolExecutor) {
                        this.logService.warn('[AgentExecutionEngine] No tool executor registered, skipping tool calls');
                        return '';
                }

                const results: string[] = [];

                for (const toolCall of toolCalls) {
                        if (token?.isCancellationRequested) {
                                results.push(`[Tool ${toolCall.name}] Cancelled`);
                                break;
                        }

                        try {
                                this.logService.info(`[AgentExecutionEngine] Executing tool: ${toolCall.name} (id=${toolCall.id})`);
                                const result = await this._toolExecutor(toolCall, token ?? CancellationToken.None);
                                results.push(`[Tool: ${toolCall.name}]\n${result}`);
                        } catch (error: any) {
                                const errorMsg = error?.message || String(error);
                                this.logService.error(`[AgentExecutionEngine] Tool execution failed: ${toolCall.name} — ${errorMsg}`);
                                results.push(`[Tool: ${toolCall.name}] ERROR: ${errorMsg}`);
                        }
                }

                return results.join('\n\n');
        }

        // ─── Private: Context Management ─────────────────────────────────────────

        /**
         * Append a step's result to the conversation context, creating a new
         * context object. The original context is never mutated.
         *
         * This adds:
         *   - An assistant message with the step's LLM response
         *   - A user message acknowledging the result and providing the next step
         *   - Any shared memory updates from the step result
         */
        private _appendStepToContext(context: AgentContext, step: ExecutionStep, result: StepResult): AgentContext {
                const assistantMessage: LLMMessage = {
                        role: 'assistant',
                        content: result.content,
                        ...(result.toolCalls.length > 0 ? { toolCalls: result.toolCalls } : {}),
                };

                const userAckMessage: LLMMessage = {
                        role: 'user',
                        content: `Step "${step.label}" completed successfully. ${result.nextStep ? `Suggested next step: ${result.nextStep}.` : ''} Proceed to the next step.`,
                };

                // Update shared memory with any findings from the result content
                const newSharedMemory = new Map(context.sharedMemory);
                this._extractMemoryUpdates(result.content, newSharedMemory);

                // Update working files
                const newWorkingFiles = this._extractWorkingFiles(result.content, context.workingFiles);

                return {
                        conversationHistory: [
                                ...context.conversationHistory,
                                assistantMessage,
                                userAckMessage,
                        ],
                        sharedMemory: newSharedMemory,
                        workingFiles: newWorkingFiles,
                        currentStep: context.currentStep + 1,
                        totalSteps: context.totalSteps,
                };
        }

        // ─── Private: Shared Memory Helpers ──────────────────────────────────────

        /**
         * Get shared memory entries relevant to the current step.
         * Filters by keys that match the step's role or are general-purpose.
         */
        private _getRelevantMemoryEntries(step: ExecutionStep, context: AgentContext): Array<{ key: string; value: string }> {
                const entries: Array<{ key: string; value: string }> = [];
                const rolePrefix = step.role.toString();

                for (const [key, value] of context.sharedMemory) {
                        // Include entries that are:
                        //   - Scoped to this role
                        //   - General-purpose (no role prefix)
                        //   - Handoff entries
                        if (key.startsWith(rolePrefix) || key.startsWith('general') || key.startsWith('handoff:')) {
                                entries.push({ key, value });
                        }
                }

                // Keep entries manageable
                if (entries.length > 20) {
                        return entries.slice(-20);
                }

                return entries;
        }

        /**
         * Extract memory updates from LLM response content.
         * Looks for structured key-value patterns in the response.
         */
        private _extractMemoryUpdates(content: string, memory: Map<string, string>): void {
                // Match patterns like [memory:key]: value or ## memory:key\nvalue
                const memoryPattern = /\[memory:([^\]]+)\]:\s*(.+?)(?=\n\[memory:|$)/gs;
                let match: RegExpExecArray | null;
                const regex = new RegExp(memoryPattern.source, memoryPattern.flags);

                while ((match = regex.exec(content)) !== null) {
                        const key = match[1].trim();
                        const value = match[2].trim();
                        if (key && value) {
                                memory.set(key, value);
                        }
                }

                // Also match markdown-style: ### memory:key\nvalue
                const mdPattern = /###\s*memory:([^\n]+)\n([^#]+?)(?=###|$)/gs;
                const mdRegex = new RegExp(mdPattern.source, mdPattern.flags);
                while ((match = mdRegex.exec(content)) !== null) {
                        const key = match[1].trim();
                        const value = match[2].trim();
                        if (key && value) {
                                memory.set(key, value);
                        }
                }
        }

        // ─── Private: File Extraction Helpers ────────────────────────────────────

        /**
         * Extract file paths mentioned in LLM response content and add them
         * to the working files list.
         */
        private _extractWorkingFiles(content: string, existingFiles: string[]): string[] {
                const filePattern = /(?:^|\s|["'`])([a-zA-Z0-9_./\\-]+\.[a-zA-Z0-9]{1,10})(?:["'`]|$|\s)/g;
                const files = new Set(existingFiles);

                let match: RegExpExecArray | null;
                const regex = new RegExp(filePattern.source, filePattern.flags);
                while ((match = regex.exec(content)) !== null) {
                        const candidate = match[1];
                        const ext = candidate.split('.').pop();
                        if (ext && ext.length >= 2 && ext.length <= 10 && /^[a-zA-Z0-9]+$/.test(ext)) {
                                files.add(candidate);
                        }
                }

                return [...files];
        }

        // ─── Private: Response Parsing Helpers ───────────────────────────────────

        /**
         * Extract a next-step hint from the LLM response.
         * Looks for patterns like "NEXT_STEP: step-id" or
         * "Suggested next step: step-id" in the response.
         */
        private _extractNextStepHint(content: string): string | undefined {
                // Pattern 1: NEXT_STEP: step-id
                const explicitPattern = /NEXT_STEP:\s*([a-zA-Z0-9_-]+)/;
                const explicitMatch = explicitPattern.exec(content);
                if (explicitMatch) {
                        return explicitMatch[1];
                }

                // Pattern 2: Suggested next step: step-id
                const suggestedPattern = /suggested\s+next\s+step:\s*([a-zA-Z0-9_-]+)/i;
                const suggestedMatch = suggestedPattern.exec(content);
                if (suggestedMatch) {
                        return suggestedMatch[1];
                }

                return undefined;
        }

        // ─── Private: Utility ────────────────────────────────────────────────────

        /**
         * Convert a string role name to an AgentRole enum value.
         * Falls back to AgentRole.Coder if the string doesn't match.
         */
        private _roleFromString(roleName: string): AgentRole {
                const lower = roleName.toLowerCase();
                for (const [key, value] of Object.entries(AgentRole)) {
                        if (value === lower || key.toLowerCase() === lower) {
                                return value as AgentRole;
                        }
                }
                return AgentRole.Coder;
        }

        // ─── Lifecycle ────────────────────────────────────────────────────────────

        override dispose(): void {
                this.logService.info('[AgentExecutionEngine] Disposed');
                super.dispose();
        }
}
