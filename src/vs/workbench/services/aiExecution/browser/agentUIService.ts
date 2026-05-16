/*---------------------------------------------------------------------------------------------
 *  Agent Orchestration System — Phase 7 Agent UI Service Implementation
 *  Real Vibecode — AI-Native IDE
 *
 *  AgentUIService — Concrete implementation of IAgentUIService.
 *  Provides read-only view models for all agent UI panels.
 *
 *  All mutations route through AgentOrchestratorService — the UI never
 *  directly modifies agent state.
 *--------------------------------------------------------------------------------------------*/

import { Disposable } from '../../../../base/common/lifecycle.js';
import { Emitter, Event } from '../../../../base/common/event.js';
import { IAgentUIService, IAgentActivityViewModel, IPlanVisualizationViewModel, IStepVisualizationNode, IStepDependencyEdge, IStepTimelineViewModel, IStepTimelineEntry, IApprovalQueueViewModel, IApprovalRequestViewModel, ISuspendedTasksViewModel, ISuspendedTaskEntry } from '../common/agentUI.js';
import { IAgentOrchestratorService, AgentLifecycleState, IAgent, IExecutionPlan, IPlanStep, IApprovalRequest, ApprovalResult, PlanStatus, StepStatus } from '../common/agentOrchestratorService.js';
import { IExecutionGraphService } from '../common/executionGraphService.js';
import { IObservabilityService } from '../common/observabilityService.js';
import { IAIContextService } from '../common/aiContextService.js';
import { ILogService } from '../../../../platform/log/common/log.js';

export class AgentUIService extends Disposable implements IAgentUIService {
        declare readonly _serviceBrand: undefined;

        // ─── Events ───────────────────────────────────────────────────────────────

        private readonly _onDidUpdateAgentActivity = this._register(new Emitter<void>());
        readonly onDidUpdateAgentActivity = this._onDidUpdateAgentActivity.event;

        private readonly _onDidUpdatePlanVisualization = this._register(new Emitter<string>());
        readonly onDidUpdatePlanVisualization = this._onDidUpdatePlanVisualization.event;

        private readonly _onDidUpdateStepTimeline = this._register(new Emitter<string>());
        readonly onDidUpdateStepTimeline = this._onDidUpdateStepTimeline.event;

        private readonly _onDidUpdateApprovalQueue = this._register(new Emitter<void>());
        readonly onDidUpdateApprovalQueue = this._onDidUpdateApprovalQueue.event;

        private readonly _onDidUpdateSuspendedTasks = this._register(new Emitter<void>());
        readonly onDidUpdateSuspendedTasks = this._onDidUpdateSuspendedTasks.event;

        // ─── Constructor ──────────────────────────────────────────────────────────

        constructor(
                @IAgentOrchestratorService private readonly orchestratorService: IAgentOrchestratorService,
                @IExecutionGraphService private readonly graphService: IExecutionGraphService,
                @IObservabilityService private readonly observabilityService: IObservabilityService,
                @IAIContextService private readonly contextService: IAIContextService,
                @ILogService private readonly logService: ILogService,
        ) {
                super();

                // Wire up events from orchestrator to UI refresh events
                this._register(this.orchestratorService.onDidChangeAgentLifecycle(() => {
                        this._onDidUpdateAgentActivity.fire();
                }));
                this._register(this.orchestratorService.onDidChangePlanStatus(e => {
                        this._onDidUpdatePlanVisualization.fire(e.planId);
                        this._onDidUpdateStepTimeline.fire(e.planId);
                        if (e.toStatus === PlanStatus.Suspended) {
                                this._onDidUpdateSuspendedTasks.fire();
                        }
                }));
                this._register(this.orchestratorService.onDidChangeStepStatus(() => {
                        this._onDidUpdateAgentActivity.fire();
                }));
                this._register(this.orchestratorService.onDidRequestApproval(() => {
                        this._onDidUpdateApprovalQueue.fire();
                }));
                this._register(this.orchestratorService.onDidResolveApproval(() => {
                        this._onDidUpdateApprovalQueue.fire();
                }));

                this.logService.info('[AgentUIService] Initialized');
        }

        // ─── Agent Activity Panel ────────────────────────────────────────────────

        getAgentActivityViewModels(): readonly IAgentActivityViewModel[] {
                return this.orchestratorService.getAllAgents().map(agent => this._buildAgentActivityViewModel(agent));
        }

        getAgentActivityViewModel(agentId: string): IAgentActivityViewModel | undefined {
                const agent = this.orchestratorService.getAgent(agentId);
                return agent ? this._buildAgentActivityViewModel(agent) : undefined;
        }

        private _buildAgentActivityViewModel(agent: IAgent): IAgentActivityViewModel {
                const activePlan = agent.activePlanId ? this.orchestratorService.getPlan(agent.activePlanId) : undefined;
                const watchdog = this.orchestratorService.getWatchdogStatus(agent.id);
                const suspendedPlans = this.orchestratorService.getSuspendedPlans();
                const hasSuspendedPlan = suspendedPlans.some(p => p.agentId === agent.id);

                let watchdogSummary = 'Idle';
                if (watchdog?.active) {
                        const q = watchdog.quotaUsage;
                        watchdogSummary = `Steps: ${q.stepsUsed}/${q.stepsMax}, Files: ${q.filesModified}/${q.filesMax}`;
                }

                return Object.freeze({
                        agentId: agent.id,
                        name: agent.name,
                        description: agent.description,
                        lifecycleState: agent.lifecycleState,
                        activePlanGoal: activePlan?.goal,
                        completedPlanCount: agent.completedPlanIds.length,
                        capabilityCount: agent.capabilities.length,
                        hasSuspendedPlan,
                        watchdogSummary,
                        lastActivityAt: agent.lastTransitionAt,
                });
        }

        // ─── Plan Visualization ──────────────────────────────────────────────────

        getPlanVisualization(planId: string): IPlanVisualizationViewModel | undefined {
                const plan = this.orchestratorService.getPlan(planId);
                if (!plan) { return undefined; }

                const agent = this.orchestratorService.getAgent(plan.agentId);
                const stepNodes = this._buildStepVisualizationNodes(plan.steps);
                const dependencyEdges = this._buildStepDependencyEdges(plan.steps);

                const completedSteps = plan.steps.filter(s => s.status === StepStatus.Completed).length;
                const failedSteps = plan.steps.filter(s => s.status === StepStatus.Failed).length;
                const progress = plan.steps.length > 0 ? completedSteps / plan.steps.length : 0;
                const elapsedMs = plan.startedAt ? Date.now() - plan.startedAt : 0;

                return Object.freeze({
                        planId: plan.id,
                        goal: plan.goal,
                        status: plan.status,
                        agentName: agent?.name ?? 'Unknown',
                        stepNodes: Object.freeze(stepNodes),
                        dependencyEdges: Object.freeze(dependencyEdges),
                        progress,
                        totalSteps: plan.steps.length,
                        completedSteps,
                        failedSteps,
                        elapsedMs,
                        maxDurationMs: plan.maxDurationMs,
                });
        }

        private _buildStepVisualizationNodes(steps: IPlanStep[]): IStepVisualizationNode[] {
                // Simple top-down layout algorithm
                const nodes: IStepVisualizationNode[] = [];
                const levelMap = new Map<string, number>();

                const getLevel = (stepId: string, visited: Set<string> = new Set()): number => {
                        if (visited.has(stepId)) { return 0; }
                        visited.add(stepId);
                        const step = steps.find(s => s.id === stepId);
                        if (!step || step.dependencies.length === 0) { return 0; }
                        return 1 + Math.max(...step.dependencies.map(d => getLevel(d, visited)));
                };

                for (const step of steps) {
                        const level = getLevel(step.id);
                        levelMap.set(step.id, level);
                }

                // Group by level for Y positioning
                const levels = new Map<number, IPlanStep[]>();
                for (const step of steps) {
                        const level = levelMap.get(step.id) ?? 0;
                        if (!levels.has(level)) { levels.set(level, []); }
                        levels.get(level)!.push(step);
                }

                for (const [level, levelSteps] of levels) {
                        for (let i = 0; i < levelSteps.length; i++) {
                                const step = levelSteps[i];
                                nodes.push(Object.freeze({
                                        stepId: step.id,
                                        label: step.label,
                                        status: step.status,
                                        capability: step.requiredCapability,
                                        requiresApproval: step.requiresApproval,
                                        retryCount: step.retryCount,
                                        error: step.error,
                                        x: i * 200,
                                        y: level * 100,
                                }));
                        }
                }

                return nodes;
        }

        private _buildStepDependencyEdges(steps: IPlanStep[]): IStepDependencyEdge[] {
                const edges: IStepDependencyEdge[] = [];
                for (const step of steps) {
                        for (const depId of step.dependencies) {
                                edges.push(Object.freeze({
                                        fromStepId: depId,
                                        toStepId: step.id,
                                }));
                        }
                }
                return edges;
        }

        // ─── Execution Step Timeline ─────────────────────────────────────────────

        getStepTimeline(planId: string): IStepTimelineViewModel | undefined {
                const plan = this.orchestratorService.getPlan(planId);
                if (!plan) { return undefined; }

                const entries: IStepTimelineEntry[] = [];
                const planStart = plan.startedAt ?? plan.createdAt;
                const observations = this.orchestratorService.getPlanTimeline(planId);

                for (const step of plan.steps) {
                        const stepObs = observations.filter(o => o.stepId === step.id);
                        entries.push(Object.freeze({
                                stepId: step.id,
                                label: step.label,
                                status: step.status,
                                startOffsetMs: step.startedAt ? step.startedAt - planStart : 0,
                                durationMs: step.startedAt && step.completedAt ? step.completedAt - step.startedAt : undefined,
                                error: step.error,
                                observationCount: stepObs.length,
                                modifiedFileCount: step.result?.modifiedFiles.length ?? 0,
                        }));
                }

                const totalDurationMs = plan.completedAt && plan.startedAt
                        ? plan.completedAt - plan.startedAt
                        : plan.startedAt ? Date.now() - plan.startedAt : 0;

                return Object.freeze({
                        planId: plan.id,
                        goal: plan.goal,
                        entries: Object.freeze(entries),
                        totalDurationMs,
                });
        }

        // ─── Approval Queue ──────────────────────────────────────────────────────

        getApprovalQueue(): IApprovalQueueViewModel {
                const pending = this.orchestratorService.getPendingApprovals();
                const viewModels: IApprovalRequestViewModel[] = pending.map(req => this._buildApprovalRequestViewModel(req));

                return Object.freeze({
                        pendingRequests: Object.freeze(viewModels),
                        pendingCount: pending.length,
                        hasManualReview: pending.some(r => r.level === 'manual-review'),
                });
        }

        approveRequest(requestId: string): void {
                this.orchestratorService.resolveApproval(requestId, ApprovalResult.Approved, 'user');
        }

        denyRequest(requestId: string, reason?: string): void {
                this.orchestratorService.resolveApproval(requestId, ApprovalResult.Denied, 'user', reason);
        }

        private _buildApprovalRequestViewModel(req: IApprovalRequest): IApprovalRequestViewModel {
                const agent = this.orchestratorService.getAgent(req.agentId);
                return Object.freeze({
                        requestId: req.id,
                        agentName: agent?.name ?? 'Unknown',
                        stepDescription: req.description,
                        capability: req.capability,
                        riskLevel: req.riskLevel,
                        approvalLevel: req.level,
                        affectedFiles: Object.freeze(req.affectedFiles.map(u => u.toString())),
                        reversible: req.reversible,
                        waitingMs: Date.now() - req.requestedAt,
                });
        }

        // ─── Suspended Tasks ─────────────────────────────────────────────────────

        getSuspendedTasks(): ISuspendedTasksViewModel {
                const suspendedPlans = this.orchestratorService.getSuspendedPlans();
                const entries: ISuspendedTaskEntry[] = suspendedPlans.map(plan => {
                        const agent = this.orchestratorService.getAgent(plan.agentId);
                        return Object.freeze({
                                planId: plan.id,
                                goal: plan.goal,
                                agentName: agent?.name ?? 'Unknown',
                                suspendedAt: plan.completedAt ?? Date.now(),
                                completedStepsWhenSuspended: plan.steps.filter(s => s.status === StepStatus.Completed).length,
                                totalSteps: plan.steps.length,
                                allStepsResumable: plan.steps.every(s =>
                                        s.status === StepStatus.Pending || s.status === StepStatus.Ready ||
                                        (s.checkpoint?.resumable ?? false)
                                ),
                        });
                });

                return Object.freeze({
                        entries: Object.freeze(entries),
                        count: entries.length,
                });
        }

        async resumeSuspendedPlan(planId: string): Promise<void> {
                await this.orchestratorService.resumePlan(planId);
        }
}
