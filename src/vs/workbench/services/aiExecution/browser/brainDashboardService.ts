/*---------------------------------------------------------------------------------------------
 *  Global Execution Brain — Phase 9 Dashboard UI Layer
 *  Real Vibecode — AI-Native IDE
 *
 *  BrainDashboardService — View models for the system-wide dashboard.
 *  Provides 5 dashboard panels: Timeline, Active Intents, Health, Conflicts, Flow Map.
 *--------------------------------------------------------------------------------------------*/

import { Emitter, Event } from '../../../../base/common/event.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { IAgentOrchestratorService, AgentLifecycleState } from '../common/agentOrchestratorService.js';
import { IAIProcessOrchestratorService, ProcessLifecycleState } from '../common/aiProcessOrchestratorService.js';
import { IExecutionGraphService } from '../common/executionGraphService.js';
import { IObservabilityService } from '../common/observabilityService.js';
import { IAIContextService } from '../common/aiContextService.js';
import { IAIUnifiedStateService } from '../common/aiUnifiedStateService.js';
import {
        IGlobalExecutionBrainService,
        IntentResolution,
        IntentSource,
        IntentActionType,
        ExecutionLoopPhase,
        BrainEventSeverity,
        IGlobalTimelineViewModel,
        ITimelineEntry,
        IActiveIntentsViewModel,
        ISystemHealthViewModel,
        IConflictQueueViewModel,
        IExecutionFlowMapViewModel,
        ISubsystemState,
        ISubsystemFlow,
        IBrainDashboardService,
        ConflictSeverity,
        BrainEventCategory,
} from '../common/globalExecutionBrain.js';

export class BrainDashboardService extends Disposable implements IBrainDashboardService {
        declare readonly _serviceBrand: undefined;

        private readonly _onDidChangeDashboard = this._register(new Emitter<string>());
        readonly onDidChangeDashboard: Event<string> = this._onDidChangeDashboard.event;

        constructor(
                @IGlobalExecutionBrainService private readonly brainService: IGlobalExecutionBrainService,
                @IAgentOrchestratorService private readonly agentOrchestrator: IAgentOrchestratorService,
                @IAIProcessOrchestratorService private readonly processOrchestrator: IAIProcessOrchestratorService,
                @IExecutionGraphService private readonly graphService: IExecutionGraphService,
                @IObservabilityService private readonly observabilityService: IObservabilityService,
                @IAIContextService private readonly contextService: IAIContextService,
                @IAIUnifiedStateService private readonly stateService: IAIUnifiedStateService,
        ) {
                super();

                // Subscribe to brain events and forward as dashboard updates
                this._register(this.brainService.onDidChangeLoopPhase(() => this._onDidChangeDashboard.fire('timeline')));
                this._register(this.brainService.onDidCreateIntent(() => this._onDidChangeDashboard.fire('intents')));
                this._register(this.brainService.onDidChangeIntentResolution(() => this._onDidChangeDashboard.fire('intents')));
                this._register(this.brainService.onDidDetectConflict(() => this._onDidChangeDashboard.fire('conflicts')));
                this._register(this.brainService.onDidResolveConflict(() => this._onDidChangeDashboard.fire('conflicts')));
                this._register(this.brainService.onDidTriggerHealthAlert(() => this._onDidChangeDashboard.fire('health')));
                this._register(this.brainService.onDidChangeHealthStatus(() => this._onDidChangeDashboard.fire('health')));
                this._register(this.brainService.onDidValidateCoherence(() => this._onDidChangeDashboard.fire('health')));
        }

        getTimelineViewModel(): IGlobalTimelineViewModel {
                const recentEvents = this.brainService.getRecentEvents(100);
                const entries: ITimelineEntry[] = recentEvents.map(e => ({
                        timestamp: e.timestamp,
                        type: this._categoryToTimelineType(e.category),
                        description: e.description,
                        relatedId: e.intentId ?? e.graphNodeId ?? e.agentId ?? e.processSessionId,
                        severity: e.severity,
                }));

                // Add loop phase changes
                const loopHistory = this.brainService.getLoopHistory(20);
                for (const tick of loopHistory) {
                        entries.push({
                                timestamp: tick.startedAt,
                                type: 'loop-phase',
                                description: `Loop: ${tick.startPhase} → ${tick.endPhase ?? '...'}`,
                                relatedId: tick.activeIntentId,
                                severity: BrainEventSeverity.Info,
                        });
                }

                // Sort by timestamp
                entries.sort((a, b) => a.timestamp - b.timestamp);

                return {
                        entries,
                        currentPhase: this.brainService.loopPhase,
                        loopActive: this.brainService.loopActive,
                        snapshotAt: Date.now(),
                };
        }

        getActiveIntentsViewModel(): IActiveIntentsViewModel {
                const activeIntents = this.brainService.getActiveIntents();

                const byResolution: Record<string, typeof activeIntents> = {};
                const bySource: Record<string, typeof activeIntents> = {};
                const byActionType: Record<string, typeof activeIntents> = {};

                for (const intent of activeIntents) {
                        const resKey = intent.resolution;
                        if (!byResolution[resKey]) { byResolution[resKey] = []; }
                        byResolution[resKey].push(intent);

                        const srcKey = intent.source;
                        if (!bySource[srcKey]) { bySource[srcKey] = []; }
                        bySource[srcKey].push(intent);

                        const actKey = intent.actionType;
                        if (!byActionType[actKey]) { byActionType[actKey] = []; }
                        byActionType[actKey].push(intent);
                }

                return {
                        byResolution,
                        bySource,
                        byActionType,
                        totalActive: activeIntents.length,
                        pendingApprovalCount: activeIntents.filter(i => i.requiresApproval && !i.approved).length,
                        snapshotAt: Date.now(),
                };
        }

        getSystemHealthViewModel(): ISystemHealthViewModel {
                // Build a simple history from recent events
                const currentMetrics = this.brainService.healthMetrics;

                return {
                        status: this.brainService.healthStatus,
                        metrics: currentMetrics,
                        activeAlerts: this.brainService.getActiveHealthAlerts(),
                        history: [currentMetrics], // Current implementation provides only the latest snapshot
                        snapshotAt: Date.now(),
                };
        }

        getConflictQueueViewModel(): IConflictQueueViewModel {
                const conflicts = this.brainService.getActiveConflicts();

                const bySeverity: Record<string, typeof conflicts> = {};
                const byType: Record<string, typeof conflicts> = {};

                for (const conflict of conflicts) {
                        const sevKey = conflict.severity;
                        if (!bySeverity[sevKey]) { bySeverity[sevKey] = []; }
                        bySeverity[sevKey].push(conflict);

                        const typeKey = conflict.type;
                        if (!byType[typeKey]) { byType[typeKey] = []; }
                        byType[typeKey].push(conflict);
                }

                return {
                        conflicts,
                        bySeverity,
                        byType,
                        totalActive: conflicts.length,
                        criticalCount: conflicts.filter(c => c.severity === ConflictSeverity.Critical).length,
                        snapshotAt: Date.now(),
                };
        }

        getExecutionFlowMapViewModel(): IExecutionFlowMapViewModel {
                const subsystemStates: ISubsystemState[] = [
                        this._getExecutionServiceState(),
                        this._getAgentOrchestratorState(),
                        this._getProcessOrchestratorState(),
                        this._getExecutionGraphState(),
                        this._getContextEngineState(),
                        this._getUnifiedStateState(),
                        this._getObservabilityState(),
                        this._getGlobalBrainState(),
                ];

                const activeFlows: ISubsystemFlow[] = [
                        { from: 'GlobalBrain', to: 'AgentOrchestrator', type: 'intent', rate: 0, active: true },
                        { from: 'GlobalBrain', to: 'ProcessOrchestrator', type: 'intent', rate: 0, active: true },
                        { from: 'AgentOrchestrator', to: 'ExecutionService', type: 'intent', rate: 0, active: true },
                        { from: 'ProcessOrchestrator', to: 'ExecutionGraph', type: 'observation', rate: 0, active: true },
                        { from: 'ExecutionService', to: 'ExecutionGraph', type: 'state-sync', rate: 0, active: true },
                        { from: 'ContextEngine', to: 'GlobalBrain', type: 'event', rate: 0, active: true },
                        { from: 'UnifiedState', to: 'GlobalBrain', type: 'event', rate: 0, active: true },
                        { from: 'ExecutionGraph', to: 'Observability', type: 'observation', rate: 0, active: true },
                ];

                // Calculate flow rates from event bus stats
                const stats = this.brainService.eventBusStats;
                if (stats.eventsPerSecond > 0) {
                        for (const flow of activeFlows) {
                                flow.rate = Math.round(stats.eventsPerSecond / activeFlows.length * 10) / 10;
                        }
                }

                return {
                        subsystemStates,
                        activeFlows,
                        currentLoopPhase: this.brainService.loopPhase,
                        snapshotAt: Date.now(),
                };
        }

        // ─── Private Helpers ──────────────────────────────────────────────────────

        private _categoryToTimelineType(category: BrainEventCategory): ITimelineEntry['type'] {
                switch (category) {
                        case BrainEventCategory.Intent: return 'intent';
                        case BrainEventCategory.Decision: return 'decision';
                        case BrainEventCategory.Health: return 'health';
                        case BrainEventCategory.Sync: return 'sync';
                        case BrainEventCategory.Coherence: return 'coherence';
                        case BrainEventCategory.Execution:
                        case BrainEventCategory.Process:
                        case BrainEventCategory.Agent:
                        case BrainEventCategory.Graph:
                        case BrainEventCategory.Context:
                                return 'intent';
                }
        }

        private _getExecutionServiceState(): ISubsystemState {
                return {
                        name: 'ExecutionService',
                        active: this.stateService.activeState.isExecuting,
                        health: this.stateService.activeState.isExecuting ? 'healthy' : 'healthy',
                        pendingOperations: this.stateService.activeState.isExecuting ? 1 : 0,
                        lastActivityAt: this.stateService.activeState.lastTransitionAt,
                };
        }

        private _getAgentOrchestratorState(): ISubsystemState {
                const agents = this.agentOrchestrator.getAllAgents();
                const activeAgents = agents.filter(a => a.lifecycleState !== AgentLifecycleState.Idle && a.lifecycleState !== AgentLifecycleState.Completed && a.lifecycleState !== AgentLifecycleState.Failed && a.lifecycleState !== AgentLifecycleState.Cancelled);
                const hasFailed = agents.some(a => a.lifecycleState === AgentLifecycleState.Failed);
                return {
                        name: 'AgentOrchestrator',
                        active: activeAgents.length > 0,
                        health: hasFailed ? 'error' : (activeAgents.length > 3 ? 'stressed' : 'healthy'),
                        pendingOperations: this.agentOrchestrator.getPendingApprovals().length,
                        lastActivityAt: agents.length > 0 ? Math.max(...agents.map(a => a.lastTransitionAt)) : 0,
                };
        }

        private _getProcessOrchestratorState(): ISubsystemState {
                const activeSessions = this.processOrchestrator.getActiveSessions();
                const hasCrashed = this.processOrchestrator.getAllSessions().some(s => s.lifecycleState === ProcessLifecycleState.Crashed);
                return {
                        name: 'ProcessOrchestrator',
                        active: activeSessions.length > 0,
                        health: hasCrashed ? 'error' : (activeSessions.length > 5 ? 'stressed' : 'healthy'),
                        pendingOperations: this.processOrchestrator.getPendingProcessApprovals().length,
                        lastActivityAt: Date.now(),
                };
        }

        private _getExecutionGraphState(): ISubsystemState {
                return {
                        name: 'ExecutionGraph',
                        active: this.graphService.nodeCount > 0,
                        health: 'healthy',
                        pendingOperations: 0,
                        lastActivityAt: Date.now(),
                };
        }

        private _getContextEngineState(): ISubsystemState {
                const wsCtx = this.contextService.workspaceContext;
                return {
                        name: 'ContextEngine',
                        active: this.contextService.trackedFileCount > 0,
                        health: wsCtx.freshness === 'outdated' ? 'stressed' : 'healthy',
                        pendingOperations: 0,
                        lastActivityAt: wsCtx.scannedAt,
                };
        }

        private _getUnifiedStateState(): ISubsystemState {
                return {
                        name: 'UnifiedState',
                        active: true,
                        health: 'healthy',
                        pendingOperations: 0,
                        lastActivityAt: this.stateService.activeState.lastTransitionAt,
                };
        }

        private _getObservabilityState(): ISubsystemState {
                return {
                        name: 'Observability',
                        active: this.observabilityService.devModeEnabled,
                        health: 'healthy',
                        pendingOperations: 0,
                        lastActivityAt: Date.now(),
                };
        }

        private _getGlobalBrainState(): ISubsystemState {
                return {
                        name: 'GlobalBrain',
                        active: this.brainService.loopActive,
                        health: this.brainService.healthStatus === 'healthy' ? 'healthy' : (this.brainService.healthStatus === 'stressed' ? 'stressed' : 'overloaded'),
                        pendingOperations: this.brainService.getActiveIntents().length,
                        lastActivityAt: Date.now(),
                };
        }
}
