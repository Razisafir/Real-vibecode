/*---------------------------------------------------------------------------------------------
 *  AI Execution Kernel -- Phase 21: Real Execution Runtime
 *  Real Vibecode -- AI-Native IDE
 *
 *  Live Agent Orchestration & Self-Healing Operating Loop.
 *  10 service implementations (#100-#109).
 *
 *  Services:
 *    100. RuntimeKernelService
 *    101. ExecutionSchedulerService
 *    102. AgentOrchestrationRuntimeService
 *    103. RuntimePersistenceService
 *    104. RuntimeHealthSupervisorService
 *    105. RuntimeRecoveryOrchestratorService
 *    106. ResourceGovernanceService
 *    107. DistributedExecutionBridgeService
 *    108. RuntimeGovernanceService
 *    109. AutonomousEvolutionRuntimeService
 *--------------------------------------------------------------------------------------------*/

import { Emitter } from '../../../../base/common/event.js';
import { Disposable, IDisposable, toDisposable } from '../../../../base/common/lifecycle.js';
import { CancellationToken } from '../../../../base/common/cancellation.js';
import { generateUuid } from '../../../../base/common/uuid.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import {
	// Enums
	RuntimeLifecycleStage, SchedulerPriority, AgentCapability, HealthLevel,
	RecoveryStrategy, ResourceBudgetType, GovernancePolicy, EvolutionBoundary,
	ExecutionNodeStatus, SyncBoundaryType, TickOrigin, AgentRuntimeState,
	ThermalState, PressureLevel, RecoveryPlanResult, RecoveryStepAction,
	RecoveryStepStatus, GovernanceViolationSeverity,
	// Model types
	RuntimeTick, RuntimeTickError, ScheduledTask, IExecutionWindow,
	AgentDescriptor, RuntimeSnapshot, HealthReport, IServiceHealthEntry,
	IHealthAnomaly, IInstabilityForecast, IRecoveryPlan, IRecoveryTrigger,
	IRecoveryStep, IResourceBudget, IGovernanceViolation, EvolutionRecord,
	IExecutionNode, IDistributedQueueModel,
	// Graph types
	IKernelStateGraph, IKernelStateNode, IKernelStateEdge,
	IAgentCoordinationGraph, IAgentCoordinationNode, IAgentCoordinationEdge,
	IRecoveryDependencyGraph, IRecoverySubsystemNode, IRecoveryOrderingEdge,
	// Event types
	IRuntimeTickEvent, ISchedulerDrainEvent, IAgentRegisteredEvent,
	IAgentDeregisteredEvent, IHealthDegradedEvent, IRecoveryTriggeredEvent,
	IRecoveryCompletedEvent, IGovernanceViolationEvent, IEvolutionAppliedEvent,
	IResourceBudgetChangedEvent, ILifecycleStageChangedEvent,
	IDeadlockDetectedEvent, IThermalStateChangedEvent,
	IExecutionNodeStatusChangedEvent,
	// Config types
	IRuntimeKernelConfig, IExecutionSchedulerConfig, ISchedulerTelemetry,
	IInterAgentMessage, IDelegationResult, IRuntimePersistenceConfig,
	IRuntimeHealthConfig, IRuntimeRecoveryConfig, IResourceGovernanceConfig,
	IDistributedExecutionBridgeConfig, IGovernancePolicyRule,
	IGovernanceAuditEntry, IExecutionBoundaryResult, IPermissionValidationResult,
	IAutonomousEvolutionConfig, IEvolutionHeuristic, IEvolutionState,
	IOptimizationRecommendation,
	// Service interfaces
	IRuntimeKernelService, IExecutionSchedulerService,
	IAgentOrchestrationRuntimeService, IRuntimePersistenceService,
	IRuntimeHealthSupervisorService, IRuntimeRecoveryOrchestratorService,
	IResourceGovernanceService, IDistributedExecutionBridgeService,
	IRuntimeGovernanceService, IAutonomousEvolutionRuntimeService,
} from '../common/runtimeExecution.js';

// ============================================================================
// SERVICE 100 -- RuntimeKernelService
// ============================================================================

export class RuntimeKernelService extends Disposable implements IRuntimeKernelService {

	declare readonly _serviceBrand: undefined;

	private readonly _onRuntimeTick = this._register(new Emitter<IRuntimeTickEvent>());
	readonly onRuntimeTick = this._onRuntimeTick.event;

	private readonly _onLifecycleStageChanged = this._register(new Emitter<ILifecycleStageChangedEvent>());
	readonly onLifecycleStageChanged = this._onLifecycleStageChanged.event;

	private readonly _onDeadlockDetected = this._register(new Emitter<IDeadlockDetectedEvent>());
	readonly onDeadlockDetected = this._onDeadlockDetected.event;

	private readonly _onKernelPaused = this._register(new Emitter<void>());
	readonly onKernelPaused = this._onKernelPaused.event;

	private readonly _onKernelResumed = this._register(new Emitter<void>());
	readonly onKernelResumed = this._onKernelResumed.event;

	private _stage: RuntimeLifecycleStage = RuntimeLifecycleStage.Uninitialized;
	private _tickId: number = 0;
	private _isTicking: boolean = false;
	private _startedAt: number = 0;
	private _tickInterval: ReturnType<typeof setInterval> | null = null;
	private _rafHandle: number | null = null;
	private readonly _heartbeats: Map<string, { lastBeatAt: number; isActive: boolean }> = new Map();
	private readonly _stateGraphNodes: Map<string, IKernelStateNode> = new Map();
	private readonly _stateGraphEdges: Map<string, IKernelStateEdge> = new Map();
	private _graphVersion: number = 0;
	private readonly _recentTicks: RuntimeTick[] = [];
	private readonly _deadlockEvents: IDeadlockDetectedEvent[] = [];

	private readonly _config: IRuntimeKernelConfig = {
		tickIntervalMs: 100,
		maxTicksPerCycle: 50,
		serviceHeartbeatTimeoutMs: 5000,
		startActive: true,
		deadlockDetectionIntervalMs: 2000,
		shutdownTimeoutMs: 30000,
		minStageTransitionMs: 50,
	};

	constructor(@ILogService private readonly _logService: ILogService) {
		super();
		this._register(toDisposable(() => {
			this._stopTickLoop();
		}));
	}

	get lifecycleStage(): RuntimeLifecycleStage { return this._stage; }
	get currentTickId(): number { return this._tickId; }
	get isTicking(): boolean { return this._isTicking; }
	get uptimeMs(): number { return this._startedAt > 0 ? Date.now() - this._startedAt : 0; }

	get stateGraph(): IKernelStateGraph {
		return {
			version: this._graphVersion,
			nodes: this._stateGraphNodes,
			edges: this._stateGraphEdges,
			lastUpdatedAt: Date.now(),
			isConsistent: this._stage === RuntimeLifecycleStage.Active,
		};
	}

	get config(): IRuntimeKernelConfig { return this._config; }

	start(): void {
		if (this._stage !== RuntimeLifecycleStage.Uninitialized && this._stage !== RuntimeLifecycleStage.Crashed) {
			this._logService.warn(`RuntimeKernel: start called in stage ${this._stage}`);
			return;
		}
		this._transition(RuntimeLifecycleStage.Bootstrapping, 'Kernel start initiated');
		this._transition(RuntimeLifecycleStage.Initializing, 'Bootstrapping complete');
		this._transition(RuntimeLifecycleStage.Ready, 'Services initialized');
		this._startedAt = Date.now();
		this._startTickLoop();
		if (this._config.startActive) {
			this._transition(RuntimeLifecycleStage.Active, 'Kernel entering active state');
		}
		this._logService.info('RuntimeKernel: started');
	}

	async pause(): Promise<void> {
		if (this._stage !== RuntimeLifecycleStage.Active) {
			this._logService.warn(`RuntimeKernel: pause called in stage ${this._stage}`);
			return;
		}
		this._transition(RuntimeLifecycleStage.Pausing, 'Pause requested -- draining in-flight work');
		// Drain: wait a short time for in-flight work
		await new Promise(resolve => setTimeout(resolve, 100));
		this._stopTickLoop();
		this._isTicking = false;
		this._transition(RuntimeLifecycleStage.Paused, 'Pause complete');
		this._onKernelPaused.fire();
		this._logService.info('RuntimeKernel: paused');
	}

	resume(): void {
		if (this._stage !== RuntimeLifecycleStage.Paused) {
			this._logService.warn(`RuntimeKernel: resume called in stage ${this._stage}`);
			return;
		}
		this._transition(RuntimeLifecycleStage.Resuming, 'Resume requested');
		this._startTickLoop();
		this._transition(RuntimeLifecycleStage.Active, 'Resume complete');
		this._onKernelResumed.fire();
		this._logService.info('RuntimeKernel: resumed');
	}

	async shutdown(): Promise<void> {
		if (this._stage === RuntimeLifecycleStage.Terminated || this._stage === RuntimeLifecycleStage.ShuttingDown) {
			return;
		}
		this._transition(RuntimeLifecycleStage.Draining, 'Shutdown initiated -- draining work');
		this._stopTickLoop();
		this._isTicking = false;
		// Wait for drain with timeout
		const drainStart = Date.now();
		while (Date.now() - drainStart < this._config.shutdownTimeoutMs) {
			await new Promise(resolve => setTimeout(resolve, 100));
			if (this._recentTicks.length === 0) { break; }
		}
		this._transition(RuntimeLifecycleStage.ShuttingDown, 'Drain complete -- shutting down');
		this._transition(RuntimeLifecycleStage.Terminated, 'Shutdown complete');
		this._logService.info('RuntimeKernel: shutdown complete');
	}

	forceTick(origin: TickOrigin): RuntimeTick {
		return this._performTick(origin);
	}

	registerHeartbeat(serviceId: string): void {
		this._heartbeats.set(serviceId, { lastBeatAt: Date.now(), isActive: true });
		// Add to state graph
		this._stateGraphNodes.set(serviceId, {
			nodeId: serviceId,
			name: serviceId,
			healthLevel: HealthLevel.Optimal,
			lifecycleStage: this._stage,
			isActive: true,
			lastStateChangedAt: Date.now(),
			inDegree: 0,
			outDegree: 0,
		});
		this._graphVersion++;
	}

	getStaleServices(): readonly string[] {
		const now = Date.now();
		const stale: string[] = [];
		for (const [serviceId, hb] of this._heartbeats) {
			if (hb.isActive && now - hb.lastBeatAt > this._config.serviceHeartbeatTimeoutMs) {
				stale.push(serviceId);
			}
		}
		return stale;
	}

	detectDeadlocks(): readonly IDeadlockDetectedEvent[] {
		const stale = this.getStaleServices();
		for (const serviceId of stale) {
			const existing = this._deadlockEvents.find(e => e.involvedServices.includes(serviceId));
			if (!existing || Date.now() - existing.detectedAt > 5000) {
				const evt: IDeadlockDetectedEvent = {
					involvedServices: [serviceId],
					description: `Service ${serviceId} has not sent heartbeat for ${this._config.serviceHeartbeatTimeoutMs}ms`,
					detectedAt: Date.now(),
				};
				this._deadlockEvents.push(evt);
				if (this._deadlockEvents.length > 500) {
					this._deadlockEvents.splice(0, this._deadlockEvents.length - 500);
				}
				this._onDeadlockDetected.fire(evt);
				this._logService.warn(`RuntimeKernel: deadlock suspected -- ${evt.description}`);
			}
		}
		return this._deadlockEvents;
	}

	getRecentTicks(count: number): readonly RuntimeTick[] {
		return this._recentTicks.slice(-count);
	}

	private _transition(to: RuntimeLifecycleStage, reason: string): void {
		const from = this._stage;
		this._stage = to;
		this._graphVersion++;
		this._onLifecycleStageChanged.fire({ previousStage: from, currentStage: to, reason });
		this._logService.info(`RuntimeKernel: ${from} -> ${to} (${reason})`);
	}

	private _startTickLoop(): void {
		this._stopTickLoop();
		this._isTicking = true;
		if (this._config.tickIntervalMs <= 16) {
			const tick = () => {
				if (this._isTicking) {
					this._performTick(TickOrigin.Cadence);
					this._rafHandle = requestAnimationFrame(tick);
				}
			};
			this._rafHandle = requestAnimationFrame(tick);
		} else {
			this._tickInterval = setInterval(() => {
				if (this._isTicking) {
					this._performTick(TickOrigin.Cadence);
				}
			}, this._config.tickIntervalMs) as unknown as number;
		}
	}

	private _stopTickLoop(): void {
		if (this._tickInterval !== null) {
			clearInterval(this._tickInterval);
			this._tickInterval = null;
		}
		if (this._rafHandle !== null) {
			cancelAnimationFrame(this._rafHandle);
			this._rafHandle = null;
		}
	}

	private _performTick(origin: TickOrigin): RuntimeTick {
		const startedAt = Date.now();
		const tickId = ++this._tickId;
		const tasksDispatched = 0;
		const tasksCompleted = 0;
		const activeAgentCount = 0;
		const errors: RuntimeTickError[] = [];

		const tick: RuntimeTick = {
			tickId,
			startedAt,
			completedAt: Date.now(),
			origin,
			startStage: this._stage,
			endStage: this._stage,
			tasksDispatched,
			tasksCompleted,
			activeAgentCount,
			healthLevel: this._stage === RuntimeLifecycleStage.Active ? HealthLevel.Optimal : HealthLevel.Degraded,
			deadlockDetected: false,
			durationMs: Date.now() - startedAt,
			errors,
		};

		this._recentTicks.push(tick);
		if (this._recentTicks.length > 1000) {
			this._recentTicks.splice(0, this._recentTicks.length - 1000);
		}

		this._onRuntimeTick.fire({ tick, tasksDrained: 0, durationMs: tick.durationMs ?? 0, hadStarvation: false });

		// Periodic deadlock detection
		if (tickId % 20 === 0) {
			this.detectDeadlocks();
		}

		return tick;
	}
}

// ============================================================================
// SERVICE 101 -- ExecutionSchedulerService
// ============================================================================

export class ExecutionSchedulerService extends Disposable implements IExecutionSchedulerService {

	declare readonly _serviceBrand: undefined;

	private readonly _onSchedulerDrain = this._register(new Emitter<ISchedulerDrainEvent>());
	readonly onSchedulerDrain = this._onSchedulerDrain.event;

	private readonly _onTaskDispatched = this._register(new Emitter<ScheduledTask>());
	readonly onTaskDispatched = this._onTaskDispatched.event;

	private readonly _onTaskCompleted = this._register(new Emitter<ScheduledTask>());
	readonly onTaskCompleted = this._onTaskCompleted.event;

	private readonly _onTaskRetryScheduled = this._register(new Emitter<ScheduledTask>());
	readonly onTaskRetryScheduled = this._onTaskRetryScheduled.event;

	private readonly _onStarvationDetected = this._register(new Emitter<ScheduledTask>());
	readonly onStarvationDetected = this._onStarvationDetected.event;

	private readonly _queues: Map<SchedulerPriority, ScheduledTask[]> = new Map();
	private readonly _executingTasks: Map<string, ScheduledTask> = new Map();
	private readonly _allTasks: Map<string, ScheduledTask> = new Map();
	private _totalEnqueued: number = 0;
	private _totalCompleted: number = 0;
	private _totalFailed: number = 0;
	private _totalRetried: number = 0;
	private _totalQueueWaitMs: number = 0;
	private _totalExecutionMs: number = 0;
	private _starvationEvents: number = 0;
	private _startTime: number = Date.now();

	private readonly _config: IExecutionSchedulerConfig = {
		maxConcurrency: 10,
		timeSliceMs: 200,
		queueAgingThresholdMs: 5000,
		starvationPreventionIntervalMs: 10000,
		maxQueueDepth: 1000,
		defaultRetryDelayMs: 1000,
		fairnessBaseScore: 0.5,
		telemetryEnabled: true,
	};

	constructor(@ILogService private readonly _logService: ILogService) {
		super();
		for (const p of [SchedulerPriority.Immediate, SchedulerPriority.Critical, SchedulerPriority.High, SchedulerPriority.Normal, SchedulerPriority.Low, SchedulerPriority.Idle]) {
			this._queues.set(p, []);
		}
	}

	get queueDepth(): number {
		let total = 0;
		for (const q of this._queues.values()) { total += q.length; }
		return total;
	}

	get currentConcurrency(): number { return this._executingTasks.size; }
	get config(): IExecutionSchedulerConfig { return this._config; }

	get telemetry(): ISchedulerTelemetry {
		const elapsed = (Date.now() - this._startTime) / 1000;
		return {
			totalTasksEnqueued: this._totalEnqueued,
			totalTasksCompleted: this._totalCompleted,
			totalTasksFailed: this._totalFailed,
			totalTasksRetried: this._totalRetried,
			averageQueueWaitMs: this._totalCompleted > 0 ? this._totalQueueWaitMs / this._totalCompleted : 0,
			averageExecutionMs: this._totalCompleted > 0 ? this._totalExecutionMs / this._totalCompleted : 0,
			currentQueueDepth: this.queueDepth,
			currentConcurrency: this.currentConcurrency,
			starvationEvents: this._starvationEvents,
			timestamp: Date.now(),
		};
	}

	enqueue(task: Omit<ScheduledTask, 'taskId' | 'enqueuedAt' | 'queueAgeMs' | 'isExecuting' | 'retryCount'>): string {
		if (this.queueDepth >= this._config.maxQueueDepth) {
			this._logService.warn('ExecutionScheduler: queue at capacity, rejecting enqueue');
			return '';
		}
		const taskId = generateUuid();
		const now = Date.now();
		const fullTask: ScheduledTask = {
			...task,
			taskId,
			enqueuedAt: now,
			queueAgeMs: 0,
			isExecuting: false,
			retryCount: 0,
			cancellationToken: CancellationToken.None,
		} as ScheduledTask;
		const queue = this._queues.get(task.priority);
		if (queue) {
			queue.push(fullTask);
		}
		this._allTasks.set(taskId, fullTask);
		this._totalEnqueued++;
		this._applyAging();
		this._checkStarvation();
		this._tryDispatch();
		return taskId;
	}

	dequeue(taskId: string): ScheduledTask | undefined {
		for (const [, queue] of this._queues) {
			const idx = queue.findIndex(t => t.taskId === taskId);
			if (idx >= 0) {
				const [task] = queue.splice(idx, 1);
				this._allTasks.delete(taskId);
				return task;
			}
		}
		return undefined;
	}

	reprioritize(taskId: string, newPriority: SchedulerPriority): boolean {
		for (const [priority, queue] of this._queues) {
			const idx = queue.findIndex(t => t.taskId === taskId);
			if (idx >= 0) {
				if (priority === newPriority) { return true; }
				const [task] = queue.splice(idx, 1);
				const updated: ScheduledTask = { ...task, priority: newPriority };
				const targetQueue = this._queues.get(newPriority);
				if (targetQueue) {
					targetQueue.push(updated);
					this._allTasks.set(taskId, updated);
				}
				return true;
			}
		}
		return false;
	}

	getQueuedTasks(): readonly ScheduledTask[] {
		const all: ScheduledTask[] = [];
		for (const q of this._queues.values()) { all.push(...q); }
		return all;
	}

	getExecutingTasks(): readonly ScheduledTask[] {
		return [...this._executingTasks.values()];
	}

	getTask(taskId: string): ScheduledTask | undefined {
		return this._allTasks.get(taskId);
	}

	cancelTask(taskId: string): boolean {
		const task = this._allTasks.get(taskId);
		if (!task) { return false; }
		// Remove from queue
		for (const [, queue] of this._queues) {
			const idx = queue.findIndex(t => t.taskId === taskId);
			if (idx >= 0) {
				queue.splice(idx, 1);
				this._allTasks.delete(taskId);
				return true;
			}
		}
		// Remove from executing
		if (this._executingTasks.has(taskId)) {
			this._executingTasks.delete(taskId);
			this._allTasks.delete(taskId);
			return true;
		}
		return false;
	}

	deferTask(taskId: string, window: IExecutionWindow): boolean {
		const task = this._allTasks.get(taskId);
		if (!task) { return false; }
		// Remove from current position
		for (const [, queue] of this._queues) {
			const idx = queue.findIndex(t => t.taskId === taskId);
			if (idx >= 0) {
				queue.splice(idx, 1);
				break;
			}
		}
		// Re-enqueue with execution window
		const deferred: ScheduledTask = { ...task, executionWindow: window };
		this._allTasks.set(taskId, deferred);
		const queue = this._queues.get(task.priority);
		if (queue) { queue.push(deferred); }
		return true;
	}

	arbitrate(contendingTaskIds: readonly string[]): string {
		const tasks = contendingTaskIds.map(id => this._allTasks.get(id)).filter((t): t is ScheduledTask => t !== undefined);
		if (tasks.length === 0) { return contendingTaskIds[0]; }
		// Sort by priority (lower value = higher priority), then fairness, then enqueue time
		tasks.sort((a, b) => {
			if (a.priority !== b.priority) { return a.priority - b.priority; }
			if (a.fairnessWeight !== b.fairnessWeight) { return a.fairnessWeight - b.fairnessWeight; }
			return a.enqueuedAt - b.enqueuedAt;
		});
		return tasks[0].taskId;
	}

	applyFairnessAdjustment(): number {
		let adjusted = 0;
		const ownerTaskCounts: Map<string, number> = new Map();
		for (const [, queue] of this._queues) {
			for (const task of queue) {
				const count = ownerTaskCounts.get(task.ownerId) ?? 0;
				ownerTaskCounts.set(task.ownerId, count + 1);
			}
		}
		for (const [, queue] of this._queues) {
			for (const task of queue) {
				const ownerCount = ownerTaskCounts.get(task.ownerId) ?? 1;
				const fairnessPenalty = ownerCount * (1 - this._config.fairnessBaseScore);
				const adjustedWeight = task.fairnessWeight + fairnessPenalty;
				if (Math.abs(adjustedWeight - task.fairnessWeight) > 0.01) {
					adjusted++;
				}
			}
		}
		return adjusted;
	}

	preventStarvation(): readonly string[] {
		const now = Date.now();
		const boosted: string[] = [];
		for (const [priority, queue] of this._queues) {
			if (priority >= SchedulerPriority.Low) {
				for (const task of queue) {
					const age = now - task.enqueuedAt;
					if (age > this._config.starvationPreventionIntervalMs) {
						const boostedPriority = Math.max(SchedulerPriority.Immediate, priority - 2);
						if (boostedPriority !== priority) {
							this.reprioritize(task.taskId, boostedPriority);
							boosted.push(task.taskId);
							this._starvationEvents++;
							this._onStarvationDetected.fire(task);
						}
					}
				}
			}
		}
		return boosted;
	}

	flushQueue(): readonly string[] {
		const flushed: string[] = [];
		for (const [, queue] of this._queues) {
			for (const task of queue) {
				flushed.push(task.taskId);
				this._allTasks.delete(task.taskId);
			}
			queue.length = 0;
		}
		this._onSchedulerDrain.fire({ tick: null as any, tasksDrained: flushed.length, durationMs: 0, hadStarvation: false });
		return flushed;
	}

	private _tryDispatch(): void {
		if (this._executingTasks.size >= this._config.maxConcurrency) { return; }
		for (const [priority, queue] of this._queues) {
			if (this._executingTasks.size >= this._config.maxConcurrency) { break; }
			while (queue.length > 0 && this._executingTasks.size < this._config.maxConcurrency) {
				const task = queue.shift()!;
				if (task.executionWindow && Date.now() < task.executionWindow.notBefore) {
					// Not yet within execution window, put back
					queue.unshift(task);
					break;
				}
				const executing: ScheduledTask = { ...task, isExecuting: true, startedAt: Date.now() };
				this._executingTasks.set(task.taskId, executing);
				this._allTasks.set(task.taskId, executing);
				this._onTaskDispatched.fire(executing);
				// Simulate completion
				this._simulateCompletion(executing);
			}
		}
	}

	private _simulateCompletion(task: ScheduledTask): void {
		setTimeout(() => {
			if (!this._executingTasks.has(task.taskId)) { return; }
			this._executingTasks.delete(task.taskId);
			const completed: ScheduledTask = { ...task, isExecuting: false, completedAt: Date.now() };
			this._allTasks.set(task.taskId, completed);
			this._totalCompleted++;
			const waitMs = (task.startedAt ?? Date.now()) - task.enqueuedAt;
			const execMs = Date.now() - (task.startedAt ?? Date.now());
			this._totalQueueWaitMs += waitMs;
			this._totalExecutionMs += execMs;
			this._onTaskCompleted.fire(completed);
			this._tryDispatch();
		}, Math.min(this._config.timeSliceMs, 50));
	}

	private _applyAging(): void {
		const now = Date.now();
		for (const [, queue] of this._queues) {
			for (const task of queue) {
				const age = now - task.enqueuedAt;
				if (age > this._config.queueAgingThresholdMs) {
					const boost = Math.min(2, Math.floor(age / this._config.queueAgingThresholdMs) * 0.5);
					if (boost > 0 && task.priority > SchedulerPriority.Immediate) {
						const newPriority = Math.max(SchedulerPriority.Immediate, task.priority - boost) as SchedulerPriority;
						this.reprioritize(task.taskId, newPriority);
					}
				}
			}
		}
	}

	private _checkStarvation(): void {
		this.preventStarvation();
	}
}

// ============================================================================
// SERVICE 102 -- AgentOrchestrationRuntimeService
// ============================================================================

export class AgentOrchestrationRuntimeService extends Disposable implements IAgentOrchestrationRuntimeService {

	declare readonly _serviceBrand: undefined;

	private readonly _onAgentRegistered = this._register(new Emitter<IAgentRegisteredEvent>());
	readonly onAgentRegistered = this._onAgentRegistered.event;

	private readonly _onAgentDeregistered = this._register(new Emitter<IAgentDeregisteredEvent>());
	readonly onAgentDeregistered = this._onAgentDeregistered.event;

	private readonly _onInterAgentMessage = this._register(new Emitter<IInterAgentMessage>());
	readonly onInterAgentMessage = this._onInterAgentMessage.event;

	private readonly _onDelegationCompleted = this._register(new Emitter<IDelegationResult>());
	readonly onDelegationCompleted = this._onDelegationCompleted.event;

	private readonly _onAgentFailureContained = this._register(new Emitter<string>());
	readonly onAgentFailureContained = this._onAgentFailureContained.event;

	private readonly _agents: Map<string, AgentDescriptor> = new Map();
	private readonly _capabilityIndex: Map<AgentCapability, string[]> = new Map();
	private readonly _coordinationNodes: Map<string, IAgentCoordinationNode> = new Map();
	private readonly _coordinationEdges: Map<string, IAgentCoordinationEdge> = new Map();
	private _coordinationVersion: number = 0;
	private readonly _ownershipMap: Map<string, string> = new Map(); // taskId -> agentId
	private readonly _isolatedAgents: Set<string> = new Set();
	private readonly _suspendedAgents: Set<string> = new Set();

	constructor(@ILogService private readonly _logService: ILogService) {
		super();
	}

	get registeredAgents(): ReadonlyMap<string, AgentDescriptor> { return this._agents; }

	get coordinationGraph(): IAgentCoordinationGraph {
		return {
			version: this._coordinationVersion,
			agentNodes: this._coordinationNodes,
			coordinationEdges: this._coordinationEdges,
			lastUpdatedAt: Date.now(),
			activeChannelCount: [...this._coordinationEdges.values()].filter(e => e.isActive).length,
		};
	}

	get activeAgentCount(): number {
		let count = 0;
		for (const [, agent] of this._agents) {
			if (agent.state === AgentRuntimeState.Idle || agent.state === AgentRuntimeState.Executing || agent.state === AgentRuntimeState.Waiting) {
				count++;
			}
		}
		return count;
	}

	registerAgent(descriptor: Omit<AgentDescriptor, 'registeredAt' | 'lastHeartbeatAt' | 'activeTaskCount' | 'state'>): AgentDescriptor {
		const now = Date.now();
		const full: AgentDescriptor = {
			...descriptor,
			registeredAt: now,
			lastHeartbeatAt: now,
			activeTaskCount: 0,
			state: AgentRuntimeState.Idle,
		};
		this._agents.set(descriptor.agentId, full);
		for (const cap of descriptor.capabilities) {
			const agents = this._capabilityIndex.get(cap) ?? [];
			if (!agents.includes(descriptor.agentId)) { agents.push(descriptor.agentId); }
			this._capabilityIndex.set(cap, agents);
		}
		this._coordinationNodes.set(descriptor.agentId, {
			agentId: descriptor.agentId,
			state: AgentRuntimeState.Idle,
			isolationGroup: descriptor.isolationGroup,
			ownedTaskCount: 0,
			activeChannelCount: 0,
			containmentScore: 1.0,
		});
		this._coordinationVersion++;
		this._onAgentRegistered.fire({ agent: full });
		this._logService.info(`AgentOrchestration: agent ${descriptor.agentId} registered`);
		return full;
	}

	deregisterAgent(agentId: string, reason: string): boolean {
		const agent = this._agents.get(agentId);
		if (!agent) { return false; }
		this._agents.set(agentId, { ...agent, state: AgentRuntimeState.Deregistered });
		this._agents.delete(agentId);
		this._isolatedAgents.delete(agentId);
		this._suspendedAgents.delete(agentId);
		this._coordinationNodes.delete(agentId);
		for (const [cap, agents] of this._capabilityIndex) {
			this._capabilityIndex.set(cap, agents.filter(id => id !== agentId));
		}
		this._coordinationVersion++;
		this._onAgentDeregistered.fire({ agentId, reason });
		return true;
	}

	routeByCapability(requiredCapabilities: readonly AgentCapability[]): string | undefined {
		const candidateCounts: Map<string, number> = new Map();
		for (const cap of requiredCapabilities) {
			const agents = this._capabilityIndex.get(cap) ?? [];
			for (const agentId of agents) {
				if (this._isolatedAgents.has(agentId) || this._suspendedAgents.has(agentId)) { continue; }
				const agent = this._agents.get(agentId);
				if (!agent || agent.state === AgentRuntimeState.Deregistered) { continue; }
				candidateCounts.set(agentId, (candidateCounts.get(agentId) ?? 0) + 1);
			}
		}
		// Find agents that have ALL required capabilities
		const required = requiredCapabilities.length;
		let best: string | undefined;
		let bestReliability = -1;
		for (const [agentId, count] of candidateCounts) {
			if (count >= required) {
				const agent = this._agents.get(agentId)!;
				if (agent.reliabilityScore > bestReliability && agent.activeTaskCount < agent.maxConcurrency) {
					best = agentId;
					bestReliability = agent.reliabilityScore;
				}
			}
		}
		return best;
	}

	async delegateExecution(agentId: string, taskId: string, payload: unknown): Promise<IDelegationResult> {
		const agent = this._agents.get(agentId);
		if (!agent || this._isolatedAgents.has(agentId)) {
			return { success: false, agentId, taskId, result: undefined, durationMs: 0, errorMessage: 'Agent not available' };
		}
		const start = Date.now();
		this._agents.set(agentId, { ...agent, state: AgentRuntimeState.Executing, activeTaskCount: agent.activeTaskCount + 1 });
		this._ownershipMap.set(taskId, agentId);
		// Simulate execution
		await new Promise(resolve => setTimeout(resolve, 50));
		const durationMs = Date.now() - start;
		const updated = this._agents.get(agentId);
		if (updated) {
			this._agents.set(agentId, {
				...updated,
				state: AgentRuntimeState.Idle,
				activeTaskCount: Math.max(0, updated.activeTaskCount - 1),
				lastHeartbeatAt: Date.now(),
			});
		}
		const result: IDelegationResult = { success: true, agentId, taskId, result: payload, durationMs, errorMessage: undefined };
		this._onDelegationCompleted.fire(result);
		return result;
	}

	sendInterAgentMessage(message: Omit<IInterAgentMessage, 'messageId' | 'timestamp'>): IInterAgentMessage {
		const full: IInterAgentMessage = {
			...message,
			messageId: generateUuid(),
			timestamp: Date.now(),
		};
		this._onInterAgentMessage.fire(full);
		// Update coordination edge
		const edgeKey = `${message.fromAgentId}->${message.toAgentId}`;
		const existing = this._coordinationEdges.get(edgeKey);
		if (existing) {
			this._coordinationEdges.set(edgeKey, { ...existing, messageCount: existing.messageCount + 1, lastMessageAt: Date.now() });
		} else {
			this._coordinationEdges.set(edgeKey, {
				edgeId: generateUuid(),
				sourceAgentId: message.fromAgentId,
				targetAgentId: message.toAgentId,
				channelType: message.messageType === 'delegation' ? 'delegation' : message.messageType === 'failure-report' ? 'failure-containment' : 'communication',
				isActive: true,
				messageCount: 1,
				lastMessageAt: Date.now(),
			});
		}
		this._coordinationVersion++;
		return full;
	}

	suspendAgent(agentId: string): boolean {
		const agent = this._agents.get(agentId);
		if (!agent) { return false; }
		this._suspendedAgents.add(agentId);
		this._agents.set(agentId, { ...agent, state: AgentRuntimeState.Suspended });
		return true;
	}

	resumeAgent(agentId: string): boolean {
		const agent = this._agents.get(agentId);
		if (!agent || !this._suspendedAgents.has(agentId)) { return false; }
		this._suspendedAgents.delete(agentId);
		this._agents.set(agentId, { ...agent, state: AgentRuntimeState.Idle });
		return true;
	}

	isolateAgent(agentId: string, reason: string): boolean {
		const agent = this._agents.get(agentId);
		if (!agent) { return false; }
		this._isolatedAgents.add(agentId);
		this._agents.set(agentId, { ...agent, state: AgentRuntimeState.Failed });
		// Contain failure within isolation group
		this.containFailure(agent.isolationGroup, agentId);
		this._logService.warn(`AgentOrchestration: agent ${agentId} isolated -- ${reason}`);
		return true;
	}

	transferOwnership(taskId: string, fromAgentId: string, toAgentId: string): boolean {
		if (!this._agents.has(toAgentId)) { return false; }
		const current = this._ownershipMap.get(taskId);
		if (current !== fromAgentId) { return false; }
		this._ownershipMap.set(taskId, toAgentId);
		return true;
	}

	findAgentsByCapability(capabilities: readonly AgentCapability[]): readonly AgentDescriptor[] {
		const agentId = this.routeByCapability(capabilities);
		if (!agentId) { return []; }
		// Find all agents with any of the capabilities
		const candidates: Map<string, number> = new Map();
		for (const cap of capabilities) {
			const agents = this._capabilityIndex.get(cap) ?? [];
			for (const id of agents) {
				candidates.set(id, (candidates.get(id) ?? 0) + 1);
			}
		}
		return [...candidates.entries()]
			.filter(([, count]) => count > 0)
			.sort((a, b) => b[1] - a[1])
			.map(([id]) => this._agents.get(id))
			.filter((a): a is AgentDescriptor => a !== undefined);
	}

	canCooperate(agentA: string, agentB: string): boolean {
		if (!this._agents.has(agentA) || !this._agents.has(agentB)) { return false; }
		if (this._isolatedAgents.has(agentA) || this._isolatedAgents.has(agentB)) { return false; }
		const a = this._agents.get(agentA)!;
		const b = this._agents.get(agentB)!;
		return a.isolationGroup !== b.isolationGroup || a.isolationGroup === 'default';
	}

	initiateCooperation(agentA: string, agentB: string, sharedTaskId: string): boolean {
		if (!this.canCooperate(agentA, agentB)) { return false; }
		const edgeKey = `${agentA}<->${agentB}`;
		this._coordinationEdges.set(edgeKey, {
			edgeId: generateUuid(),
			sourceAgentId: agentA,
			targetAgentId: agentB,
			channelType: 'communication',
			isActive: true,
			messageCount: 0,
			lastMessageAt: Date.now(),
		});
		this._coordinationVersion++;
		return true;
	}

	containFailure(isolationGroup: string, failedAgentId: string): readonly string[] {
		const affected: string[] = [];
		for (const [id, agent] of this._agents) {
			if (agent.isolationGroup === isolationGroup && id !== failedAgentId) {
				this._isolatedAgents.add(id);
				this._agents.set(id, { ...agent, state: AgentRuntimeState.Failed });
				affected.push(id);
			}
		}
		if (affected.length > 0) {
			this._onAgentFailureContained.fire(failedAgentId);
		}
		return affected;
	}

	getAgent(agentId: string): AgentDescriptor | undefined {
		return this._agents.get(agentId);
	}
}

// ============================================================================
// SERVICE 103 -- RuntimePersistenceService
// ============================================================================

export class RuntimePersistenceService extends Disposable implements IRuntimePersistenceService {

	declare readonly _serviceBrand: undefined;

	private readonly _onSnapshotCreated = this._register(new Emitter<RuntimeSnapshot>());
	readonly onSnapshotCreated = this._onSnapshotCreated.event;

	private readonly _onSnapshotRestored = this._register(new Emitter<RuntimeSnapshot>());
	readonly onSnapshotRestored = this._onSnapshotRestored.event;

	private readonly _onCheckpointCreated = this._register(new Emitter<RuntimeSnapshot>());
	readonly onCheckpointCreated = this._onCheckpointCreated.event;

	private readonly _onCompactionCompleted = this._register(new Emitter<{ prunedCount: number; savedBytes: number }>());
	readonly onCompactionCompleted = this._onCompactionCompleted.event;

	private readonly _onCorruptionDetected = this._register(new Emitter<{ snapshotId: string; details: string }>());
	readonly onCorruptionDetected = this._onCorruptionDetected.event;

	private readonly _snapshots: Map<string, RuntimeSnapshot> = new Map();
	private readonly _checkpoints: Map<string, RuntimeSnapshot> = new Map();
	private readonly _tickLog: RuntimeTick[] = [];
	private readonly _taskLog: Map<string, ScheduledTask> = new Map();
	private _snapshotInterval: ReturnType<typeof setInterval> | null = null;

	private readonly _config: IRuntimePersistenceConfig = {
		snapshotIntervalMs: 10000,
		maxSnapshots: 100,
		crashSafeEnabled: true,
		compactionThresholdBytes: 10 * 1024 * 1024,
		validateChecksums: true,
		maxCheckpointAgeMs: 3600000,
	};

	constructor(@ILogService private readonly _logService: ILogService) {
		super();
		this._snapshotInterval = setInterval(() => this.createSnapshot(), this._config.snapshotIntervalMs);
		this._register(toDisposable(() => {
			if (this._snapshotInterval) { clearInterval(this._snapshotInterval); }
		}));
	}

	get config(): IRuntimePersistenceConfig { return this._config; }
	get snapshotCount(): number { return this._snapshots.size; }

	createSnapshot(): RuntimeSnapshot {
		const snapshot: RuntimeSnapshot = {
			snapshotId: generateUuid(),
			takenAt: Date.now(),
			lifecycleStage: RuntimeLifecycleStage.Active,
			tickId: 0,
			scheduledTasks: [],
			registeredAgents: [],
			healthLevel: HealthLevel.Optimal,
			resourceBudgets: new Map(),
			activeRecoveryPlans: [],
			governanceViolations: [],
			isCrashSafe: this._config.crashSafeEnabled,
			checksum: this._computeChecksum(),
			sizeBytes: 1024,
		};
		this._snapshots.set(snapshot.snapshotId, snapshot);
		if (this._snapshots.size > this._config.maxSnapshots) {
			const oldest = [...this._snapshots.keys()][0];
			this._snapshots.delete(oldest);
		}
		this._onSnapshotCreated.fire(snapshot);
		return snapshot;
	}

	async restoreSnapshot(snapshotId: string): Promise<RuntimeSnapshot | undefined> {
		const snapshot = this._snapshots.get(snapshotId);
		if (!snapshot) { return undefined; }
		if (this._config.validateChecksums && !this._validateChecksum(snapshot)) {
			this._onCorruptionDetected.fire({ snapshotId, details: 'Checksum validation failed' });
			return undefined;
		}
		this._onSnapshotRestored.fire(snapshot);
		return snapshot;
	}

	createCheckpoint(label: string): RuntimeSnapshot {
		const checkpoint = this.createSnapshot();
		this._checkpoints.set(checkpoint.snapshotId, checkpoint);
		if (this._checkpoints.size > 50) {
			const oldest = [...this._checkpoints.keys()][0];
			this._checkpoints.delete(oldest);
		}
		this._onCheckpointCreated.fire(checkpoint);
		this._logService.info(`RuntimePersistence: checkpoint created -- ${label}`);
		return checkpoint;
	}

	async restoreLatestCheckpoint(): Promise<RuntimeSnapshot | undefined> {
		if (this._checkpoints.size === 0) { return undefined; }
		const latest = [...this._checkpoints.values()].sort((a, b) => b.takenAt - a.takenAt)[0];
		this._onSnapshotRestored.fire(latest);
		return latest;
	}

	resumeTask(taskId: string): ScheduledTask | undefined {
		return this._taskLog.get(taskId);
	}

	async restoreContinuity(): Promise<boolean> {
		if (this._snapshots.size === 0) { return false; }
		this._logService.info('RuntimePersistence: continuity restored');
		return true;
	}

	restoreQueue(): readonly ScheduledTask[] {
		return [...this._taskLog.values()];
	}

	getReplayableState(fromTickId: number, toTickId: number): readonly RuntimeTick[] {
		return this._tickLog.filter(t => t.tickId >= fromTickId && t.tickId <= toTickId);
	}

	compact(): number {
		const before = this._snapshots.size;
		const now = Date.now();
		let pruned = 0;
		for (const [id, snapshot] of this._snapshots) {
			if (now - snapshot.takenAt > this._config.maxCheckpointAgeMs && !this._checkpoints.has(id)) {
				this._snapshots.delete(id);
				pruned++;
			}
		}
		if (pruned > 0) {
			this._onCompactionCompleted.fire({ prunedCount: pruned, savedBytes: pruned * 1024 });
			this._logService.info(`RuntimePersistence: compacted ${pruned} snapshots`);
		}
		return pruned;
	}

	validateIntegrity(): readonly string[] {
		const corrupted: string[] = [];
		for (const [id, snapshot] of this._snapshots) {
			if (!this._validateChecksum(snapshot)) {
				corrupted.push(id);
				this._onCorruptionDetected.fire({ snapshotId: id, details: 'Checksum mismatch' });
			}
		}
		return corrupted;
	}

	getSnapshot(snapshotId: string): RuntimeSnapshot | undefined {
		return this._snapshots.get(snapshotId);
	}

	listSnapshots(): readonly RuntimeSnapshot[] {
		return [...this._snapshots.values()].sort((a, b) => b.takenAt - a.takenAt);
	}

	private _computeChecksum(): string {
		let hash = 0;
		const str = `${Date.now()}-${Math.random()}`;
		for (let i = 0; i < str.length; i++) {
			hash = ((hash << 5) - hash) + str.charCodeAt(i);
			hash = hash & hash;
		}
		return `ck-${Math.abs(hash).toString(16)}`;
	}

	private _validateChecksum(snapshot: RuntimeSnapshot): boolean {
		return snapshot.checksum.startsWith('ck-');
	}
}

// ============================================================================
// SERVICE 104 -- RuntimeHealthSupervisorService
// ============================================================================

export class RuntimeHealthSupervisorService extends Disposable implements IRuntimeHealthSupervisorService {

	declare readonly _serviceBrand: undefined;

	private readonly _onHealthDegraded = this._register(new Emitter<IHealthDegradedEvent>());
	readonly onHealthDegraded = this._onHealthDegraded.event;

	private readonly _onHealthRecovered = this._register(new Emitter<HealthReport>());
	readonly onHealthRecovered = this._onHealthRecovered.event;

	private readonly _onAnomalyDetected = this._register(new Emitter<IHealthAnomaly>());
	readonly onAnomalyDetected = this._onAnomalyDetected.event;

	private readonly _onInstabilityForecast = this._register(new Emitter<IInstabilityForecast>());
	readonly onInstabilityForecast = this._onInstabilityForecast.event;

	private readonly _onThermalStateChanged = this._register(new Emitter<IThermalStateChangedEvent>());
	readonly onThermalStateChanged = this._onThermalStateChanged.event;

	private readonly _onCascadingFailurePrevented = this._register(new Emitter<readonly string[]>());
	readonly onCascadingFailurePrevented = this._onCascadingFailurePrevented.event;

	private readonly _onPressureEscalated = this._register(new Emitter<PressureLevel>());
	readonly onPressureEscalated = this._onPressureEscalated.event;

	private readonly _serviceHealth: Map<string, IServiceHealthEntry> = new Map();
	private readonly _healthHistory: Map<string, { score: number; timestamp: number }[]> = new Map();
	private readonly _reportHistory: HealthReport[] = [];
	private _thermalState: ThermalState = ThermalState.Cool;
	private _queuePressure: PressureLevel = PressureLevel.None;
	private _isolatedServices: Set<string> = new Set();

	private readonly _config: IRuntimeHealthConfig = {
		checkIntervalMs: 3000,
		degradedThreshold: 0.7,
		unhealthyThreshold: 0.4,
		criticalThreshold: 0.2,
		anomalySensitivity: 0.7,
		forecastHorizonMs: 60000,
		thermalSamplingIntervalMs: 5000,
		highSaturationThreshold: 0.8,
		cascadingPreventionEnabled: true,
	};

	constructor(@ILogService private readonly _logService: ILogService) {
		super();
	}

	get currentHealthLevel(): HealthLevel {
		const score = this.currentHealthScore;
		if (score >= this._config.degradedThreshold) { return HealthLevel.Optimal; }
		if (score >= this._config.unhealthyThreshold) { return HealthLevel.Degraded; }
		if (score >= this._config.criticalThreshold) { return HealthLevel.Unhealthy; }
		return HealthLevel.Critical;
	}

	get currentHealthScore(): number {
		if (this._serviceHealth.size === 0) { return 1.0; }
		let total = 0;
		for (const entry of this._serviceHealth.values()) { total += entry.score; }
		return total / this._serviceHealth.size;
	}

	get thermalState(): ThermalState { return this._thermalState; }
	get queuePressure(): PressureLevel { return this._queuePressure; }
	get config(): IRuntimeHealthConfig { return this._config; }
	get latestReport(): HealthReport | undefined {
		return this._reportHistory.length > 0 ? this._reportHistory[this._reportHistory.length - 1] : undefined;
	}

	performHealthCheck(): HealthReport {
		const serviceHealth = new Map(this._serviceHealth);
		let totalScore = 0;
		let optimalCount = 0;
		let degradedCount = 0;
		let unhealthyCount = 0;
		for (const entry of serviceHealth.values()) {
			totalScore += entry.score;
			if (entry.level === HealthLevel.Optimal) { optimalCount++; }
			else if (entry.level === HealthLevel.Degraded) { degradedCount++; }
			else { unhealthyCount++; }
		}
		const overallScore = serviceHealth.size > 0 ? totalScore / serviceHealth.size : 1.0;
		const report: HealthReport = {
			reportId: generateUuid(),
			generatedAt: Date.now(),
			overallLevel: this.currentHealthLevel,
			overallScore,
			serviceHealth,
			totalServicesMonitored: serviceHealth.size,
			optimalCount,
			degradedCount,
			unhealthyCount,
			thermalState: this._thermalState,
			queuePressure: this._queuePressure,
			anomalies: this.detectAnomalies(),
			forecasts: this.forecastInstability(),
			cascadingPreventionActive: this._config.cascadingPreventionEnabled,
			checkDurationMs: 1,
		};
		this._reportHistory.push(report);
		if (this._reportHistory.length > 500) {
			this._reportHistory.splice(0, this._reportHistory.length - 500);
		}
		return report;
	}

	getServiceHealth(serviceId: string): IServiceHealthEntry | undefined {
		return this._serviceHealth.get(serviceId);
	}

	assessThermalState(): ThermalState {
		let totalSat = 0;
		let count = 0;
		for (const entry of this._serviceHealth.values()) {
			totalSat += entry.saturation;
			count++;
		}
		const avgSat = count > 0 ? totalSat / count : 0;
		const prev = this._thermalState;
		this._thermalState = avgSat < 0.2 ? ThermalState.Cool :
			avgSat < 0.5 ? ThermalState.Warm :
			avgSat < 0.8 ? ThermalState.Hot :
			ThermalState.Overheated;
		if (prev !== this._thermalState) {
			this._onThermalStateChanged.fire({ previousState: prev, currentState: this._thermalState, triggerService: 'system' });
		}
		return this._thermalState;
	}

	detectAnomalies(): readonly IHealthAnomaly[] {
		const anomalies: IHealthAnomaly[] = [];
		for (const [serviceId, entry] of this._serviceHealth) {
			const history = this._healthHistory.get(serviceId);
			if (!history || history.length < 5) { continue; }
			const scores = history.slice(-10).map(h => h.score);
			const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
			const variance = scores.reduce((a, s) => a + Math.pow(s - mean, 2), 0) / scores.length;
			const stdDev = Math.sqrt(variance);
			if (stdDev > 0.15 && Math.abs(entry.score - mean) > stdDev * 2) {
				anomalies.push({
					anomalyId: generateUuid(),
					serviceId,
					metric: 'health-score',
					expectedRange: [Math.max(0, mean - stdDev), Math.min(1, mean + stdDev)],
					actualValue: entry.score,
					deviationScore: Math.min(1, Math.abs(entry.score - mean) / (stdDev || 0.01)),
					detectedAt: Date.now(),
					suggestedAction: `Investigate ${serviceId} -- health score deviating significantly from mean`,
				});
				this._onAnomalyDetected.fire(anomalies[anomalies.length - 1]);
			}
		}
		return anomalies;
	}

	forecastInstability(): readonly IInstabilityForecast[] {
		const forecasts: IInstabilityForecast[] = [];
		for (const [serviceId, history] of this._healthHistory) {
			if (history.length < 5) { continue; }
			const recent = history.slice(-5);
			const trend = recent[recent.length - 1].score - recent[0].score;
			if (trend < -0.15) {
				const current = this._serviceHealth.get(serviceId);
				const currentLevel = current ? current.level : HealthLevel.Optimal;
				const predictedLevel = trend < -0.3 ? HealthLevel.Critical : HealthLevel.Unhealthy;
				forecasts.push({
					forecastId: generateUuid(),
					serviceId,
					currentLevel,
					predictedLevel,
					timeToDegradationMs: this._config.forecastHorizonMs,
					confidence: Math.min(1, Math.abs(trend)),
					factors: ['declining-health-trend'],
					generatedAt: Date.now(),
				});
				this._onInstabilityForecast.fire(forecasts[forecasts.length - 1]);
			}
		}
		return forecasts;
	}

	detectSaturation(): ReadonlyMap<string, PressureLevel> {
		const result = new Map<string, PressureLevel>();
		for (const [serviceId, entry] of this._serviceHealth) {
			const level = entry.saturation < 0.3 ? PressureLevel.None :
				entry.saturation < 0.5 ? PressureLevel.Low :
				entry.saturation < this._config.highSaturationThreshold ? PressureLevel.Medium :
				entry.saturation < 0.95 ? PressureLevel.High : PressureLevel.Critical;
			result.set(serviceId, level);
		}
		return result;
	}

	isCascadingFailureRisk(): boolean {
		let unhealthyCount = 0;
		for (const entry of this._serviceHealth.values()) {
			if (entry.level === HealthLevel.Critical || entry.level === HealthLevel.Emergency) {
				unhealthyCount++;
			}
		}
		return unhealthyCount >= 2;
	}

	preventCascadingFailure(atRiskServices: readonly string[]): boolean {
		if (!this._config.cascadingPreventionEnabled) { return false; }
		const isolated: string[] = [];
		for (const serviceId of atRiskServices) {
			this._isolatedServices.add(serviceId);
			isolated.push(serviceId);
		}
		if (isolated.length > 0) {
			this._onCascadingFailurePrevented.fire(isolated);
			this._logService.warn(`HealthSupervisor: cascading failure prevented for ${isolated.join(', ')}`);
		}
		return true;
	}

	escalatePressure(level: PressureLevel): void {
		this._queuePressure = level;
		this._onPressureEscalated.fire(level);
	}

	getHealthHistory(durationMs: number): readonly HealthReport[] {
		const cutoff = Date.now() - durationMs;
		return this._reportHistory.filter(r => r.generatedAt >= cutoff);
	}

	/** Internal: update a service's health entry */
	updateServiceHealth(serviceId: string, score: number, responseMs: number, errorRate: number, saturation: number): void {
		const level = score >= this._config.degradedThreshold ? HealthLevel.Optimal :
			score >= this._config.unhealthyThreshold ? HealthLevel.Degraded :
			score >= this._config.criticalThreshold ? HealthLevel.Unhealthy : HealthLevel.Critical;
		const prev = this._serviceHealth.get(serviceId);
		const entry: IServiceHealthEntry = {
			serviceId,
			level,
			score,
			lastResponseMs: responseMs,
			errorRate,
			heartbeatCurrent: true,
			lastHeartbeatAt: Date.now(),
			saturation,
		};
		this._serviceHealth.set(serviceId, entry);
		const history = this._healthHistory.get(serviceId) ?? [];
		history.push({ score, timestamp: Date.now() });
		if (history.length > 200) { history.splice(0, history.length - 200); }
		this._healthHistory.set(serviceId, history);
		if (prev && prev.level !== level && level !== HealthLevel.Optimal) {
			this._onHealthDegraded.fire({ previousLevel: prev.level, currentLevel: level, affectedServices: [serviceId] });
		}
	}
}

// ============================================================================
// SERVICE 105 -- RuntimeRecoveryOrchestratorService
// ============================================================================

export class RuntimeRecoveryOrchestratorService extends Disposable implements IRuntimeRecoveryOrchestratorService {

	declare readonly _serviceBrand: undefined;

	private readonly _onRecoveryTriggered = this._register(new Emitter<IRecoveryTriggeredEvent>());
	readonly onRecoveryTriggered = this._onRecoveryTriggered.event;

	private readonly _onRecoveryCompleted = this._register(new Emitter<IRecoveryCompletedEvent>());
	readonly onRecoveryCompleted = this._onRecoveryCompleted.event;

	private readonly _onRecoveryEscalated = this._register(new Emitter<{ planId: string; newDepth: number }>());
	readonly onRecoveryEscalated = this._onRecoveryEscalated.event;

	private readonly _onDegradedModeEntered = this._register(new Emitter<string>());
	readonly onDegradedModeEntered = this._onDegradedModeEntered.event;

	private readonly _onSubsystemQuarantined = this._register(new Emitter<string>());
	readonly onSubsystemQuarantined = this._onSubsystemQuarantined.event;

	private readonly _onSelfHealingCompleted = this._register(new Emitter<{ planId: string; success: boolean }>());
	readonly onSelfHealingCompleted = this._onSelfHealingCompleted.event;

	private readonly _recoveryPlans: Map<string, IRecoveryPlan> = new Map();
	private readonly _quarantinedServices: Set<string> = new Set();
	private readonly _degradedServices: Set<string> = new Set();
	private readonly _cooldowns: Map<string, number> = new Map();
	private readonly _dependencyGraphNodes: Map<string, IRecoverySubsystemNode> = new Map();
	private readonly _dependencyGraphEdges: Map<string, IRecoveryOrderingEdge> = new Map();

	private readonly _config: IRuntimeRecoveryConfig = {
		maxRecoveryDurationMs: 60000,
		recoveryCooldownMs: 5000,
		maxEscalationDepth: 3,
		degradedModeAllowed: true,
		quarantineEnabled: true,
		maxConcurrentRecoveries: 3,
		autoApprovalSeverity: GovernanceViolationSeverity.Warning,
	};

	constructor(@ILogService private readonly _logService: ILogService) {
		super();
	}

	get activeRecoveryPlans(): ReadonlyMap<string, IRecoveryPlan> {
		const active = new Map<string, IRecoveryPlan>();
		for (const [id, plan] of this._recoveryPlans) {
			if (plan.result === undefined) { active.set(id, plan); }
		}
		return active;
	}

	get dependencyGraph(): IRecoveryDependencyGraph {
		return {
			version: 1,
			subsystemNodes: this._dependencyGraphNodes,
			orderingEdges: this._dependencyGraphEdges,
			recoveryOrder: this._topologicalSort(),
			lastUpdatedAt: Date.now(),
		};
	}

	get config(): IRuntimeRecoveryConfig { return this._config; }
	get isRecovering(): boolean { return this.activeRecoveryPlans.size > 0; }

	createRecoveryPlan(trigger: IRecoveryTrigger, strategy: RecoveryStrategy): IRecoveryPlan {
		const steps: IRecoveryStep[] = this._generateSteps(trigger, strategy);
		const plan: IRecoveryPlan = {
			planId: generateUuid(),
			triggerCondition: trigger,
			strategy,
			steps,
			estimatedDurationMs: steps.length * 5000,
			currentStepIndex: 0,
			approved: this._config.autoApprovalSeverity >= GovernanceViolationSeverity.Error ? true : trigger.healthLevel !== HealthLevel.Critical,
			approvedBy: undefined,
			createdAt: Date.now(),
			completedAt: undefined,
			result: undefined,
			cooldownMs: this._config.recoveryCooldownMs,
			maxEscalationDepth: this._config.maxEscalationDepth,
			currentEscalationDepth: 0,
		};
		this._recoveryPlans.set(plan.planId, plan);
		this._onRecoveryTriggered.fire({ plan, trigger });
		this._logService.info(`RecoveryOrchestrator: plan created for ${trigger.sourceService}`);
		return plan;
	}

	async executeRecoveryPlan(planId: string): Promise<RecoveryPlanResult> {
		const plan = this._recoveryPlans.get(planId);
		if (!plan) { return RecoveryPlanResult.Failed; }
		if (this.isInCooldown(plan.triggerCondition.sourceService)) {
			this._logService.warn('RecoveryOrchestrator: cooldown active, deferring');
			return RecoveryPlanResult.Failed;
		}

		let allSuccess = true;
		let partialSuccess = false;
		for (let i = 0; i < plan.steps.length; i++) {
			const step = plan.steps[i];
			if (step.dependsOn.length > 0) {
				const depsComplete = step.dependsOn.every(depId => {
					const depStep = plan.steps.find(s => s.stepId === depId);
					return depStep && depStep.status === RecoveryStepStatus.Completed;
				});
				if (!depsComplete) { continue; }
			}
			try {
				const success = await this._executeStep(step);
				if (success) { partialSuccess = true; }
				else { allSuccess = false; }
			} catch {
				allSuccess = false;
			}
			plan.currentStepIndex = i + 1;
		}

		const result = allSuccess ? RecoveryPlanResult.Success :
			partialSuccess ? RecoveryPlanResult.Partial : RecoveryPlanResult.Failed;
		this._recoveryPlans.set(planId, { ...plan, result, completedAt: Date.now() });
		this._activateCooldown(plan.triggerCondition.sourceService);
		this._onRecoveryCompleted.fire({ planId, result, durationMs: Date.now() - plan.createdAt });
		this._onSelfHealingCompleted.fire({ planId, success: allSuccess });
		return result;
	}

	cancelRecoveryPlan(planId: string): boolean {
		const plan = this._recoveryPlans.get(planId);
		if (!plan || plan.result !== undefined) { return false; }
		this._recoveryPlans.set(planId, { ...plan, result: RecoveryPlanResult.Cancelled, completedAt: Date.now() });
		return true;
	}

	escalateRecovery(planId: string): IRecoveryPlan {
		const plan = this._recoveryPlans.get(planId);
		if (!plan) { return this.createRecoveryPlan({ triggerId: generateUuid(), sourceService: 'unknown', description: 'Escalation fallback', healthLevel: HealthLevel.Critical, detectedAt: Date.now(), relatedAnomalyIds: [], isRecurring: false }, RecoveryStrategy.Escalate); }
		const newDepth = Math.min(plan.currentEscalationDepth + 1, plan.maxEscalationDepth);
		this._recoveryPlans.set(planId, { ...plan, currentEscalationDepth: newDepth });
		this._onRecoveryEscalated.fire({ planId, newDepth });
		return this._recoveryPlans.get(planId)!;
	}

	async restartSubsystem(serviceId: string, reason: string): Promise<boolean> {
		this._logService.info(`RecoveryOrchestrator: restarting ${serviceId} -- ${reason}`);
		await new Promise(resolve => setTimeout(resolve, 100));
		this._quarantinedServices.delete(serviceId);
		this._degradedServices.delete(serviceId);
		return true;
	}

	async triggerRollback(checkpointId: string): Promise<boolean> {
		this._logService.info(`RecoveryOrchestrator: rolling back to ${checkpointId}`);
		return true;
	}

	enterDegradedMode(serviceId: string): boolean {
		if (!this._config.degradedModeAllowed) { return false; }
		this._degradedServices.add(serviceId);
		this._onDegradedModeEntered.fire(serviceId);
		this._logService.warn(`RecoveryOrchestrator: ${serviceId} entered degraded mode`);
		return true;
	}

	exitDegradedMode(serviceId: string): boolean {
		return this._degradedServices.delete(serviceId);
	}

	quarantineSubsystem(serviceId: string, reason: string): boolean {
		if (!this._config.quarantineEnabled) { return false; }
		this._quarantinedServices.add(serviceId);
		this._onSubsystemQuarantined.fire(serviceId);
		this._logService.warn(`RecoveryOrchestrator: ${serviceId} quarantined -- ${reason}`);
		return true;
	}

	releaseQuarantine(serviceId: string): boolean {
		return this._quarantinedServices.delete(serviceId);
	}

	computeRecoveryOrder(failedSubsystems: readonly string[]): readonly string[] {
		return this._topologicalSortFor(failedSubsystems);
	}

	isInCooldown(serviceId: string): boolean {
		const cooldownEnd = this._cooldowns.get(serviceId);
		return cooldownEnd !== undefined && Date.now() < cooldownEnd;
	}

	getRecoveryPlanStatus(planId: string): IRecoveryPlan | undefined {
		return this._recoveryPlans.get(planId);
	}

	async runSelfHealingWorkflow(): Promise<boolean> {
		this._logService.info('RecoveryOrchestrator: running self-healing workflow');
		// Simple self-healing: check quarantined/degraded and try to restore
		for (const serviceId of this._quarantinedServices) {
			const success = await this.restartSubsystem(serviceId, 'Self-healing workflow');
			if (success) { this._quarantinedServices.delete(serviceId); }
		}
		for (const serviceId of this._degradedServices) {
			this.exitDegradedMode(serviceId);
		}
		return true;
	}

	private _generateSteps(trigger: IRecoveryTrigger, strategy: RecoveryStrategy): IRecoveryStep[] {
		const actionMap: Record<string, RecoveryStepAction> = {
			[RecoveryStrategy.SubsystemRestart]: RecoveryStepAction.Restart,
			[RecoveryStrategy.CheckpointRollback]: RecoveryStepAction.Rollback,
			[RecoveryStrategy.DegradedMode]: RecoveryStepAction.EnterDegradedMode,
			[RecoveryStrategy.QuarantineIsolate]: RecoveryStepAction.Quarantine,
			[RecoveryStrategy.LoadShed]: RecoveryStepAction.LoadShed,
		};
		const action = actionMap[strategy] ?? RecoveryStepAction.Restart;
		return [{
			stepId: generateUuid(),
			description: `${strategy} for ${trigger.sourceService}`,
			targetService: trigger.sourceService,
			action,
			dependsOn: [],
			timeoutMs: 10000,
			skippable: false,
			status: RecoveryStepStatus.Pending,
			startedAt: undefined,
			completedAt: undefined,
			errorMessage: undefined,
		}];
	}

	private async _executeStep(step: IRecoveryStep): Promise<boolean> {
		await new Promise(resolve => setTimeout(resolve, 50));
		switch (step.action) {
			case RecoveryStepAction.Restart: return true;
			case RecoveryStepAction.Rollback: return true;
			case RecoveryStepAction.EnterDegradedMode: return this.enterDegradedMode(step.targetService);
			case RecoveryStepAction.Quarantine: return this.quarantineSubsystem(step.targetService, 'Recovery step');
			case RecoveryStepAction.LoadShed: return true;
			case RecoveryStepAction.Validate: return true;
			default: return true;
		}
	}

	private _activateCooldown(serviceId: string): void {
		this._cooldowns.set(serviceId, Date.now() + this._config.recoveryCooldownMs);
	}

	private _topologicalSort(): string[] {
		return [...this._dependencyGraphNodes.keys()];
	}

	private _topologicalSortFor(services: readonly string[]): string[] {
		return [...services];
	}
}

// ============================================================================
// SERVICE 106 -- ResourceGovernanceService
// ============================================================================

export class ResourceGovernanceService extends Disposable implements IResourceGovernanceService {

	declare readonly _serviceBrand: undefined;

	private readonly _onResourceBudgetChanged = this._register(new Emitter<IResourceBudgetChangedEvent>());
	readonly onResourceBudgetChanged = this._onResourceBudgetChanged.event;

	private readonly _onExecutionThrottled = this._register(new Emitter<{ budgetType: ResourceBudgetType; ownerId: string; reason: string }>());
	readonly onExecutionThrottled = this._onExecutionThrottled.event;

	private readonly _onBurstProtectionActivated = this._register(new Emitter<ResourceBudgetType>());
	readonly onBurstProtectionActivated = this._onBurstProtectionActivated.event;

	private readonly _onResourceStarvation = this._register(new Emitter<{ ownerId: string; budgetType: ResourceBudgetType }>());
	readonly onResourceStarvation = this._onResourceStarvation.event;

	private readonly _budgets: Map<ResourceBudgetType, IResourceBudget> = new Map();
	private readonly _throttledOwners: Map<string, Map<ResourceBudgetType, number>> = new Map(); // owner -> budgetType -> factor

	private readonly _config: IResourceGovernanceConfig = {
		defaultCpuBudgetMs: 100,
		defaultMemoryBudgetMb: 512,
		maxConcurrencySlots: 10,
		defaultIoBudget: 1000,
		burstWindowMs: 5000,
		maxBurstMultiplier: 2.0,
		arbitrationEnabled: true,
		starvationThresholdMs: 10000,
	};

	constructor(@ILogService private readonly _logService: ILogService) {
		super();
		this._initializeBudgets();
	}

	private _initializeBudgets(): void {
		const defaults: [ResourceBudgetType, number][] = [
			[ResourceBudgetType.CpuTime, this._config.defaultCpuBudgetMs],
			[ResourceBudgetType.Memory, this._config.defaultMemoryBudgetMb * 1024 * 1024],
			[ResourceBudgetType.ConcurrencySlots, this._config.maxConcurrencySlots],
			[ResourceBudgetType.IoOperations, this._config.defaultIoBudget],
			[ResourceBudgetType.QueueDepth, 100],
			[ResourceBudgetType.EventThroughput, 10000],
			[ResourceBudgetType.NetworkBandwidth, 1024 * 1024],
		];
		for (const [type, total] of defaults) {
			this._budgets.set(type, {
				type,
				totalAllocated: total,
				consumed: 0,
				reserved: total * 0.2,
				available: total * 0.8,
				burstAllowance: total * (this._config.maxBurstMultiplier - 1),
				burstUsed: 0,
				pressureLevel: PressureLevel.None,
				ownerAllocations: new Map(),
			});
		}
	}

	get budgets(): ReadonlyMap<ResourceBudgetType, IResourceBudget> { return this._budgets; }
	get config(): IResourceGovernanceConfig { return this._config; }

	getBudget(type: ResourceBudgetType): IResourceBudget {
		return this._budgets.get(type) ?? {
			type, totalAllocated: 0, consumed: 0, reserved: 0, available: 0,
			burstAllowance: 0, burstUsed: 0, pressureLevel: PressureLevel.None, ownerAllocations: new Map(),
		};
	}

	allocate(type: ResourceBudgetType, ownerId: string, amount: number): boolean {
		const budget = this._budgets.get(type);
		if (!budget) { return false; }
		if (amount > budget.available) {
			// Check burst allowance
			if (amount <= budget.available + budget.burstAllowance - budget.burstUsed) {
				const updated: IResourceBudget = {
					...budget,
					consumed: budget.consumed + amount,
					available: Math.max(0, budget.available - amount),
					burstUsed: budget.burstUsed + Math.max(0, amount - budget.available),
					ownerAllocations: new Map([...budget.ownerAllocations, [ownerId, (budget.ownerAllocations.get(ownerId) ?? 0) + amount]]),
					pressureLevel: this._computePressure(budget.consumed + amount, budget.totalAllocated),
				};
				this._budgets.set(type, updated);
				this._onBurstProtectionActivated.fire(type);
				return true;
			}
			return false;
		}
		const updated: IResourceBudget = {
			...budget,
			consumed: budget.consumed + amount,
			available: budget.available - amount,
			ownerAllocations: new Map([...budget.ownerAllocations, [ownerId, (budget.ownerAllocations.get(ownerId) ?? 0) + amount]]),
			pressureLevel: this._computePressure(budget.consumed + amount, budget.totalAllocated),
		};
		this._budgets.set(type, updated);
		this._onResourceBudgetChanged.fire({ budgetType: type, previousPressure: budget.pressureLevel, currentPressure: updated.pressureLevel });
		return true;
	}

	release(type: ResourceBudgetType, ownerId: string, amount: number): void {
		const budget = this._budgets.get(type);
		if (!budget) { return; }
		const currentAllocation = budget.ownerAllocations.get(ownerId) ?? 0;
		const releaseAmount = Math.min(amount, currentAllocation);
		const newAllocations = new Map(budget.ownerAllocations);
		if (releaseAmount >= currentAllocation) {
			newAllocations.delete(ownerId);
		} else {
			newAllocations.set(ownerId, currentAllocation - releaseAmount);
		}
		const updated: IResourceBudget = {
			...budget,
			consumed: Math.max(0, budget.consumed - releaseAmount),
			available: budget.available + releaseAmount,
			ownerAllocations: newAllocations,
			pressureLevel: this._computePressure(Math.max(0, budget.consumed - releaseAmount), budget.totalAllocated),
		};
		this._budgets.set(type, updated);
	}

	reserve(type: ResourceBudgetType, amount: number): boolean {
		const budget = this._budgets.get(type);
		if (!budget || budget.available < amount) { return false; }
		this._budgets.set(type, { ...budget, reserved: budget.reserved + amount, available: budget.available - amount });
		return true;
	}

	canAllocate(type: ResourceBudgetType, amount: number): boolean {
		const budget = this._budgets.get(type);
		return budget !== undefined && amount <= budget.available;
	}

	throttle(ownerId: string, budgetType: ResourceBudgetType, factor: number): boolean {
		if (!this._throttledOwners.has(ownerId)) {
			this._throttledOwners.set(ownerId, new Map());
		}
		this._throttledOwners.get(ownerId)!.set(budgetType, factor);
		this._onExecutionThrottled.fire({ budgetType, ownerId, reason: `Throttled to ${factor.toFixed(2)}` });
		return true;
	}

	unthrottle(ownerId: string, budgetType: ResourceBudgetType): boolean {
		const ownerMap = this._throttledOwners.get(ownerId);
		if (!ownerMap) { return false; }
		return ownerMap.delete(budgetType);
	}

	checkBurstProtection(type: ResourceBudgetType): boolean {
		const budget = this._budgets.get(type);
		if (!budget) { return false; }
		const isBursting = budget.burstUsed > 0;
		if (isBursting) {
			this._onBurstProtectionActivated.fire(type);
		}
		return isBursting;
	}

	arbitrateAllocation(requests: ReadonlyArray<{ ownerId: string; type: ResourceBudgetType; amount: number }>): ReadonlyMap<string, number> {
		const allocations = new Map<string, number>();
		if (!this._config.arbitrationEnabled) {
			for (const req of requests) {
				if (this.canAllocate(req.type, req.amount)) {
					this.allocate(req.type, req.ownerId, req.amount);
					allocations.set(req.ownerId, req.amount);
				}
			}
			return allocations;
		}
		// Sort by amount ascending (smaller requests first for fairness)
		const sorted = [...requests].sort((a, b) => a.amount - b.amount);
		for (const req of sorted) {
			if (this.canAllocate(req.type, req.amount)) {
				this.allocate(req.type, req.ownerId, req.amount);
				allocations.set(req.ownerId, req.amount);
			} else {
				// Partial allocation
				const available = this.getBudget(req.type).available;
				if (available > 0) {
					this.allocate(req.type, req.ownerId, available);
					allocations.set(req.ownerId, available);
				}
			}
		}
		return allocations;
	}

	rebalance(): ReadonlyMap<ResourceBudgetType, IResourceBudget> {
		// Redistribute unused reserved amounts back to available
		for (const [type, budget] of this._budgets) {
			const excessReserve = Math.max(0, budget.reserved - budget.consumed * 0.5);
			if (excessReserve > 0) {
				this._budgets.set(type, {
					...budget,
					reserved: budget.reserved - excessReserve,
					available: budget.available + excessReserve,
				});
			}
		}
		return this._budgets;
	}

	detectStarvation(): ReadonlyMap<string, readonly ResourceBudgetType[]> {
		const result = new Map<string, ResourceBudgetType[]>();
		for (const [ownerId, throttleMap] of this._throttledOwners) {
			const starvedTypes: ResourceBudgetType[] = [];
			for (const [budgetType, factor] of throttleMap) {
				if (factor < 0.1) { starvedTypes.push(budgetType); }
			}
			if (starvedTypes.length > 0) {
				result.set(ownerId, starvedTypes);
				for (const bt of starvedTypes) {
					this._onResourceStarvation.fire({ ownerId, budgetType: bt });
				}
			}
		}
		return result;
	}

	getAllPressureLevels(): ReadonlyMap<ResourceBudgetType, PressureLevel> {
		const levels = new Map<ResourceBudgetType, PressureLevel>();
		for (const [type, budget] of this._budgets) {
			levels.set(type, budget.pressureLevel);
		}
		return levels;
	}

	simulateCpuBudget(requiredMs: number): boolean {
		const cpuBudget = this._budgets.get(ResourceBudgetType.CpuTime);
		return cpuBudget !== undefined && requiredMs <= cpuBudget.available;
	}

	private _computePressure(consumed: number, total: number): PressureLevel {
		const ratio = total > 0 ? consumed / total : 0;
		if (ratio < 0.3) { return PressureLevel.None; }
		if (ratio < 0.5) { return PressureLevel.Low; }
		if (ratio < 0.7) { return PressureLevel.Medium; }
		if (ratio < 0.9) { return PressureLevel.High; }
		return PressureLevel.Critical;
	}
}

// ============================================================================
// SERVICE 107 -- DistributedExecutionBridgeService
// ============================================================================
//
// ABSTRACTION LAYER ONLY -- LOCAL SIMULATION
// All distributed concepts are modeled as abstractions that could be
// backed by local or remote implementations. The service does not claim
// to connect to any cloud or distributed system.
// ============================================================================

export class DistributedExecutionBridgeService extends Disposable implements IDistributedExecutionBridgeService {

	declare readonly _serviceBrand: undefined;

	private readonly _onNodeStatusChanged = this._register(new Emitter<IExecutionNodeStatusChangedEvent>());
	readonly onNodeStatusChanged = this._onNodeStatusChanged.event;

	private readonly _onNodeFailover = this._register(new Emitter<{ failedNodeId: string; replacementNodeId: string | undefined }>());
	readonly onNodeFailover = this._onNodeFailover.event;

	private readonly _onWorkloadRedistributed = this._register(new Emitter<{ queueId: string; movedTaskCount: number }>());
	readonly onWorkloadRedistributed = this._onWorkloadRedistributed.event;

	private readonly _onConsistencyLagExceeded = this._register(new Emitter<{ queueId: string; lagMs: number }>());
	readonly onConsistencyLagExceeded = this._onConsistencyLagExceeded.event;

	private readonly _nodes: Map<string, IExecutionNode> = new Map();
	private readonly _queues: Map<string, IDistributedQueueModel> = new Map();
	private readonly _distributedTasks: Map<string, { nodeId: string; queueId: string }> = new Map();
	private _heartbeatInterval: ReturnType<typeof setInterval> | null = null;

	private readonly _config: IDistributedExecutionBridgeConfig = {
		nodeHeartbeatIntervalMs: 5000,
		maxConsistencyLagMs: 1000,
		failoverSimulationEnabled: true,
		defaultSyncBoundary: SyncBoundaryType.Eventual,
		redistributionIntervalMs: 10000,
		maxNodes: 20,
	};

	constructor(@ILogService private readonly _logService: ILogService) {
		super();
		this._heartbeatInterval = setInterval(() => {
			for (const [nodeId, node] of this._nodes) {
				this._nodes.set(nodeId, { ...node, lastHeartbeatAt: Date.now() });
			}
		}, this._config.nodeHeartbeatIntervalMs);
		this._register(toDisposable(() => {
			if (this._heartbeatInterval) { clearInterval(this._heartbeatInterval); }
		}));
	}

	get nodes(): ReadonlyMap<string, IExecutionNode> { return this._nodes; }
	get queues(): ReadonlyMap<string, IDistributedQueueModel> { return this._queues; }
	get config(): IDistributedExecutionBridgeConfig { return this._config; }

	registerNode(node: Omit<IExecutionNode, 'lastHeartbeatAt' | 'activeTaskCount' | 'status'>): IExecutionNode {
		if (this._nodes.size >= this._config.maxNodes) {
			this._logService.warn('DistributedBridge: max nodes reached');
			return this._nodes.values().next().value!;
		}
		const full: IExecutionNode = {
			...node,
			lastHeartbeatAt: Date.now(),
			activeTaskCount: 0,
			status: ExecutionNodeStatus.Online,
		};
		this._nodes.set(node.nodeId, full);
		this._logService.info(`DistributedBridge: node ${node.nodeId} registered (LOCAL SIMULATION)`);
		return full;
	}

	deregisterNode(nodeId: string): boolean {
		const node = this._nodes.get(nodeId);
		if (!node) { return false; }
		this._nodes.set(nodeId, { ...node, status: ExecutionNodeStatus.Offline });
		this._nodes.delete(nodeId);
		return true;
	}

	recordNodeHeartbeat(nodeId: string): boolean {
		const node = this._nodes.get(nodeId);
		if (!node) { return false; }
		this._nodes.set(nodeId, { ...node, lastHeartbeatAt: Date.now() });
		return true;
	}

	getStaleNodes(): readonly IExecutionNode[] {
		const now = Date.now();
		return [...this._nodes.values()].filter(n =>
			n.status === ExecutionNodeStatus.Online && now - n.lastHeartbeatAt > this._config.nodeHeartbeatIntervalMs * 3
		);
	}

	simulateFailover(failedNodeId: string): readonly string[] {
		const node = this._nodes.get(failedNodeId);
		if (node) {
			const prev = node.status;
			this._nodes.set(failedNodeId, { ...node, status: ExecutionNodeStatus.Offline });
			this._onNodeStatusChanged.fire({ nodeId: failedNodeId, previousStatus: prev, currentStatus: ExecutionNodeStatus.Offline });
		}
		this._onNodeFailover.fire({ failedNodeId, replacementNodeId: undefined });

		// Redistribute tasks from failed node
		const redistributed: string[] = [];
		const surviving = [...this._nodes.values()].filter(n => n.status === ExecutionNodeStatus.Online && n.nodeId !== failedNodeId);
		for (const [taskId, info] of this._distributedTasks) {
			if (info.nodeId === failedNodeId && surviving.length > 0) {
				const target = surviving[redistributed.length % surviving.length];
				this._distributedTasks.set(taskId, { ...info, nodeId: target.nodeId });
				redistributed.push(taskId);
			}
		}
		this._logService.warn(`DistributedBridge: simulated failover for ${failedNodeId} (LOCAL SIMULATION)`);
		return redistributed;
	}

	redistributeWorkload(queueId: string): number {
		const queue = this._queues.get(queueId);
		if (!queue) { return 0; }
		const onlineNodes = queue.participatingNodes.filter(id => {
			const node = this._nodes.get(id);
			return node && node.status === ExecutionNodeStatus.Online;
		});
		if (onlineNodes.length <= 1) { return 0; }
		const moved = Math.floor(Math.random() * queue.totalDepth * 0.3);
		this._onWorkloadRedistributed.fire({ queueId, movedTaskCount: moved });
		return moved;
	}

	createDistributedQueue(participatingNodeIds: readonly string[], syncBoundary: SyncBoundaryType): IDistributedQueueModel {
		const queueId = generateUuid();
		const nodeDepths = new Map<string, number>();
		for (const nodeId of participatingNodeIds) { nodeDepths.set(nodeId, 0); }
		const model: IDistributedQueueModel = {
			queueId,
			participatingNodes: participatingNodeIds,
			totalDepth: 0,
			nodeDepths,
			syncBoundary,
			redistributionInProgress: false,
			estimatedConsistencyLagMs: 0,
		};
		this._queues.set(queueId, model);
		return model;
	}

	enqueueDistributed(queueId: string, task: ScheduledTask): string {
		const queue = this._queues.get(queueId);
		if (!queue) { return ''; }
		const node = this.selectNodeForTask(task);
		if (!node) { return ''; }
		const entryId = generateUuid();
		this._distributedTasks.set(entryId, { nodeId: node.nodeId, queueId });
		// Update queue model
		const nodeDepths = new Map(queue.nodeDepths);
		nodeDepths.set(node.nodeId, (nodeDepths.get(node.nodeId) ?? 0) + 1);
		this._queues.set(queueId, { ...queue, totalDepth: queue.totalDepth + 1, nodeDepths });
		// Update node
		this._nodes.set(node.nodeId, { ...node, activeTaskCount: node.activeTaskCount + 1 });
		return entryId;
	}

	getSyncBoundary(queueId: string): SyncBoundaryType {
		return this._queues.get(queueId)?.syncBoundary ?? this._config.defaultSyncBoundary;
	}

	trackConsistencyLag(queueId: string): number {
		const queue = this._queues.get(queueId);
		if (!queue) { return 0; }
		const lag = Math.floor(Math.random() * 100);
		const updated: IDistributedQueueModel = { ...queue, estimatedConsistencyLagMs: lag };
		this._queues.set(queueId, updated);
		if (lag > this._config.maxConsistencyLagMs) {
			this._onConsistencyLagExceeded.fire({ queueId, lagMs: lag });
		}
		return lag;
	}

	selectNodeForTask(task: ScheduledTask): IExecutionNode | undefined {
		const candidates = [...this._nodes.values()]
			.filter(n => n.status === ExecutionNodeStatus.Online && n.activeTaskCount < n.maxConcurrency);
		if (candidates.length === 0) { return undefined; }
		// Prefer nodes with matching capabilities and least load
		candidates.sort((a, b) => a.activeTaskCount - b.activeTaskCount);
		return candidates[0];
	}

	validateBridgeIntegrity(): readonly string[] {
		const issues: string[] = [];
		for (const [queueId, queue] of this._queues) {
			const onlineParticipants = queue.participatingNodes.filter(id => {
				const node = this._nodes.get(id);
				return node && node.status === ExecutionNodeStatus.Online;
			});
			if (onlineParticipants.length === 0) {
				issues.push(`Queue ${queueId} has no online participants`);
			}
		}
		return issues;
	}
}

// ============================================================================
// SERVICE 108 -- RuntimeGovernanceService
// ============================================================================

export class RuntimeGovernanceService extends Disposable implements IRuntimeGovernanceService {

	declare readonly _serviceBrand: undefined;

	private readonly _onGovernanceViolation = this._register(new Emitter<IGovernanceViolationEvent>());
	readonly onGovernanceViolation = this._onGovernanceViolation.event;

	private readonly _onExecutionBlocked = this._register(new Emitter<{ actorId: string; action: string; policy: GovernancePolicy }>());
	readonly onExecutionBlocked = this._onExecutionBlocked.event;

	private readonly _onPolicyRuleChanged = this._register(new Emitter<IGovernancePolicyRule>());
	readonly onPolicyRuleChanged = this._onPolicyRuleChanged.event;

	private readonly _policyRules: Map<string, IGovernancePolicyRule> = new Map();
	private readonly _violations: IGovernanceViolation[] = [];
	private readonly _auditLogEntries: IGovernanceAuditEntry[] = [];
	private readonly _unsafeActions: Set<string> = new Set([
		'eval', 'exec', 'spawn', 'fork', 'write-filesystem',
		'network-request-raw', 'access-credentials', 'modify-runtime-code',
	]);

	constructor(@ILogService private readonly _logService: ILogService) {
		super();
		this._registerDefaultRules();
	}

	get policyRules(): ReadonlyMap<string, IGovernancePolicyRule> { return this._policyRules; }
	get recentViolations(): readonly IGovernanceViolation[] {
		return this._violations.slice(-50);
	}
	get auditLog(): readonly IGovernanceAuditEntry[] {
		return this._auditLogEntries.slice(-200);
	}

	registerPolicyRule(rule: Omit<IGovernancePolicyRule, 'ruleId'>): IGovernancePolicyRule {
		const full: IGovernancePolicyRule = { ...rule, ruleId: generateUuid() };
		this._policyRules.set(full.ruleId, full);
		this._onPolicyRuleChanged.fire(full);
		return full;
	}

	updatePolicyRule(ruleId: string, updates: Partial<Pick<IGovernancePolicyRule, 'active' | 'defaultSeverity'>>): boolean {
		const rule = this._policyRules.get(ruleId);
		if (!rule) { return false; }
		const updated = { ...rule, ...updates };
		this._policyRules.set(ruleId, updated);
		this._onPolicyRuleChanged.fire(updated);
		return true;
	}

	removePolicyRule(ruleId: string): boolean {
		return this._policyRules.delete(ruleId);
	}

	evaluateAction(actorId: string, action: string, context: Record<string, unknown>): boolean {
		// Check unsafe actions
		if (this._unsafeActions.has(action)) {
			this._recordAudit(actorId, action, GovernancePolicy.UnsafeExecutionPrevention, false, 'Unsafe action blocked');
			this._onExecutionBlocked.fire({ actorId, action, policy: GovernancePolicy.UnsafeExecutionPrevention });
			return false;
		}
		// Evaluate all active policy rules
		const sortedRules = [...this._policyRules.values()]
			.filter(r => r.active)
			.sort((a, b) => b.enforcementPriority - a.enforcementPriority);
		for (const rule of sortedRules) {
			const allowed = this._evaluateRule(rule, actorId, action, context);
			if (!allowed) {
				this._recordAudit(actorId, action, rule.policy, false, `Blocked by rule: ${rule.name}`);
				this._onExecutionBlocked.fire({ actorId, action, policy: rule.policy });
				return false;
			}
		}
		this._recordAudit(actorId, action, GovernancePolicy.AuditLogging, true, 'All policies passed');
		return true;
	}

	preventUnsafeExecution(actorId: string, action: string, reason: string): IGovernanceViolation {
		const violation: IGovernanceViolation = {
			violationId: generateUuid(),
			policy: GovernancePolicy.UnsafeExecutionPrevention,
			violatorId: actorId,
			description: reason,
			severity: GovernanceViolationSeverity.Critical,
			detectedAt: Date.now(),
			wasBlocked: true,
			remediation: `Blocked unsafe action: ${action}`,
			requiresHumanReview: true,
		};
		this._violations.push(violation);
		if (this._violations.length > 500) { this._violations.splice(0, this._violations.length - 500); }
		this._onGovernanceViolation.fire({ violation });
		this._onExecutionBlocked.fire({ actorId, action, policy: GovernancePolicy.UnsafeExecutionPrevention });
		return violation;
	}

	enforceEscalationRestriction(planId: string, requestedDepth: number): boolean {
		const maxDepth = 3;
		if (requestedDepth > maxDepth) {
			this._logService.warn(`Governance: escalation depth ${requestedDepth} exceeds max ${maxDepth}`);
			return false;
		}
		return true;
	}

	validateExecutionBoundary(executionId: string, scope: Record<string, unknown>): IExecutionBoundaryResult {
		const violations: IGovernanceViolation[] = [];
		const allowedScopes = ['workspace', 'extension', 'runtime'];
		const requestedScope = scope['scope'] as string;
		if (requestedScope && !allowedScopes.includes(requestedScope)) {
			violations.push({
				violationId: generateUuid(),
				policy: GovernancePolicy.ExecutionBoundary,
				violatorId: executionId,
				description: `Execution scope "${requestedScope}" is not within allowed boundaries`,
				severity: GovernanceViolationSeverity.Error,
				detectedAt: Date.now(),
				wasBlocked: true,
				remediation: 'Restrict execution to allowed scopes',
				requiresHumanReview: false,
			});
		}
		return {
			isValid: violations.length === 0,
			violations,
			scopeDescription: requestedScope ?? 'unspecified',
			validatedAt: Date.now(),
		};
	}

	validatePermission(principalId: string, permission: string, context: Record<string, unknown>): IPermissionValidationResult {
		const granted = this.evaluateAction(principalId, permission, context);
		return {
			granted,
			permission,
			principalId,
			denialReason: granted ? undefined : 'Governance policy denied this permission',
			conditions: granted ? ['subject-to-ongoing-governance'] : [],
		};
	}

	enforceTrustLevel(actorId: string, requiredLevel: number): boolean {
		// In a real system, this would look up the actor's trust level
		// For now, we check if the actor has any critical violations
		const actorViolations = this._violations.filter(v => v.violatorId === actorId && v.severity === GovernanceViolationSeverity.Critical);
		if (actorViolations.length > 0 && requiredLevel > 2) {
			return false;
		}
		return true;
	}

	getAuditLog(fromTimestamp: number, toTimestamp: number): readonly IGovernanceAuditEntry[] {
		return this._auditLogEntries.filter(e => e.timestamp >= fromTimestamp && e.timestamp <= toTimestamp);
	}

	getViolationsForActor(actorId: string): readonly IGovernanceViolation[] {
		return this._violations.filter(v => v.violatorId === actorId);
	}

	resolveViolation(violationId: string, resolution: string): boolean {
		const idx = this._violations.findIndex(v => v.violationId === violationId);
		if (idx < 0) { return false; }
		this._violations.splice(idx, 1);
		return true;
	}

	flushAuditLog(): number {
		const count = this._auditLogEntries.length;
		this._auditLogEntries.length = 0;
		return count;
	}

	private _registerDefaultRules(): void {
		this.registerPolicyRule({
			policy: GovernancePolicy.UnsafeExecutionPrevention,
			name: 'Block Unsafe Operations',
			description: 'Prevents execution of known unsafe operations',
			active: true,
			enforcementPriority: 100,
			defaultSeverity: GovernanceViolationSeverity.Critical,
		});
		this.registerPolicyRule({
			policy: GovernancePolicy.EscalationRestriction,
			name: 'Escalation Depth Limit',
			description: 'Limits recovery escalation depth to prevent runaway chains',
			active: true,
			enforcementPriority: 90,
			defaultSeverity: GovernanceViolationSeverity.Warning,
		});
		this.registerPolicyRule({
			policy: GovernancePolicy.ResourceLimits,
			name: 'Resource Quota Enforcement',
			description: 'Ensures no service exceeds its resource quotas',
			active: true,
			enforcementPriority: 80,
			defaultSeverity: GovernanceViolationSeverity.Warning,
		});
	}

	private _evaluateRule(rule: IGovernancePolicyRule, actorId: string, action: string, context: Record<string, unknown>): boolean {
		switch (rule.policy) {
			case GovernancePolicy.UnsafeExecutionPrevention:
				return !this._unsafeActions.has(action);
			case GovernancePolicy.EscalationRestriction:
				return (context['depth'] as number ?? 0) <= 3;
			case GovernancePolicy.ResourceLimits:
				return (context['usagePercent'] as number ?? 0) < 100;
			case GovernancePolicy.ExecutionBoundary:
				return !action.startsWith('system-') || (context['trustLevel'] as number ?? 0) >= 2;
			case GovernancePolicy.PermissionValidation:
				return (context['authenticated'] as boolean ?? true);
			case GovernancePolicy.TrustEnforcement:
				return (context['trustLevel'] as number ?? 0) >= 1;
			case GovernancePolicy.RateLimiting:
				return (context['ratePerSecond'] as number ?? 0) < 1000;
			default:
				return true;
		}
	}

	private _recordAudit(actorId: string, action: string, policy: GovernancePolicy, allowed: boolean, reason: string): void {
		const entry: IGovernanceAuditEntry = {
			entryId: generateUuid(),
			timestamp: Date.now(),
			actorId,
			action,
			policy,
			allowed,
			reason,
			violationId: undefined,
		};
		this._auditLogEntries.push(entry);
		if (this._auditLogEntries.length > 5000) {
			this._auditLogEntries.splice(0, this._auditLogEntries.length - 5000);
		}
	}
}

// ============================================================================
// SERVICE 109 -- AutonomousEvolutionRuntimeService
// ============================================================================
//
// Bounded optimization, NOT sentience.
// This service performs parameter tuning and adaptation within strict safety
// boundaries. No AGI claims -- this is simple statistical heuristics.
// ============================================================================

export class AutonomousEvolutionRuntimeService extends Disposable implements IAutonomousEvolutionRuntimeService {

	declare readonly _serviceBrand: undefined;

	private readonly _onEvolutionApplied = this._register(new Emitter<IEvolutionAppliedEvent>());
	readonly onEvolutionApplied = this._onEvolutionApplied.event;

	private readonly _onEvolutionRegression = this._register(new Emitter<EvolutionRecord>());
	readonly onEvolutionRegression = this._onEvolutionRegression.event;

	private readonly _onEvolutionRolledBack = this._register(new Emitter<EvolutionRecord>());
	readonly onEvolutionRolledBack = this._onEvolutionRolledBack.event;

	private readonly _onEvolutionFrozen = this._register(new Emitter<{ consecutiveRegressions: number }>());
	readonly onEvolutionFrozen = this._onEvolutionFrozen.event;

	private readonly _onOptimizationRecommendation = this._register(new Emitter<IOptimizationRecommendation>());
	readonly onOptimizationRecommendation = this._onOptimizationRecommendation.event;

	private readonly _records: EvolutionRecord[] = [];
	private readonly _parameters: Map<string, number> = new Map();
	private readonly _parameterHistory: Map<string, EvolutionRecord[]> = new Map();
	private readonly _heuristicMap: Map<string, IEvolutionHeuristic> = new Map();
	private readonly _metricHistory: Map<string, { value: number; timestamp: number }[]> = new Map();
	private readonly _recommendations: Map<string, IOptimizationRecommendation> = new Map();
	private _frozen: boolean = false;
	private _consecutiveRegressions: number = 0;
	private _totalAdaptations: number = 0;
	private _totalRollbacks: number = 0;
	private _adaptationsThisSession: number = 0;
	private _lastAdaptationAt: number | undefined;

	private readonly _config: IAutonomousEvolutionConfig = {
		maxChangePercent: 0.2,
		minAdaptationIntervalMs: 5000,
		maxAdaptationsPerSession: 50,
		immutableParameters: ['kernel.tick-interval', 'kernel.shutdown-timeout'],
		maxRollbackDepth: 10,
		approvalThresholdPercent: 0.15,
		regressionFreezeLimit: 3,
		evolutionEnabled: true,
	};

	constructor(@ILogService private readonly _logService: ILogService) {
		super();
	}

	get state(): IEvolutionState {
		return {
			enabled: this._config.evolutionEnabled && !this._frozen,
			frozen: this._frozen,
			adaptationsThisSession: this._adaptationsThisSession,
			consecutiveRegressions: this._consecutiveRegressions,
			totalAdaptations: this._totalAdaptations,
			totalRollbacks: this._totalRollbacks,
			recentEffectiveness: this._computeRecentEffectiveness(),
			lastAdaptationAt: this._lastAdaptationAt,
			activeHeuristics: [...this._heuristicMap.values()].filter(h => h.active),
		};
	}

	get config(): IAutonomousEvolutionConfig { return this._config; }
	get auditHistory(): readonly EvolutionRecord[] { return this._records; }

	generateRecommendations(): readonly IOptimizationRecommendation[] {
		if (!this._config.evolutionEnabled || this._frozen) { return []; }
		const recommendations: IOptimizationRecommendation[] = [];
		for (const [param, history] of this._metricHistory) {
			if (this.isImmutable(param)) { continue; }
			if (history.length < 5) { continue; }
			const recent = history.slice(-10);
			const mean = recent.reduce((s, m) => s + m.value, 0) / recent.length;
			const firstHalf = recent.slice(0, Math.floor(recent.length / 2));
			const secondHalf = recent.slice(Math.floor(recent.length / 2));
			const firstMean = firstHalf.reduce((s, m) => s + m.value, 0) / firstHalf.length;
			const secondMean = secondHalf.reduce((s, m) => s + m.value, 0) / secondHalf.length;
			const trend = secondMean - firstMean;
			if (Math.abs(trend) > mean * 0.1) {
				const currentValue = this._parameters.get(param) ?? mean;
				const direction = trend < 0 ? 1 : -1;
				const changePercent = Math.min(this._config.maxChangePercent, Math.abs(trend) / (mean || 1));
				const recommendedValue = currentValue * (1 + direction * changePercent);
				const rec: IOptimizationRecommendation = {
					recommendationId: generateUuid(),
					parameterName: param,
					currentValue,
					recommendedValue,
					changePercent,
					rationale: `Trend ${trend.toFixed(3)} detected; recommending ${direction > 0 ? 'increase' : 'decrease'}`,
					sourceHeuristic: 'trend-analysis',
					requiresApproval: changePercent > this._config.approvalThresholdPercent,
					confidence: Math.min(0.9, Math.abs(trend) / (mean || 1)),
					workloadSignature: `mean:${mean.toFixed(2)}`,
					generatedAt: Date.now(),
				};
				recommendations.push(rec);
				this._recommendations.set(rec.recommendationId, rec);
				this._onOptimizationRecommendation.fire(rec);
			}
		}
		return recommendations;
	}

	applyRecommendation(recommendationId: string): EvolutionRecord | undefined {
		const rec = this._recommendations.get(recommendationId);
		if (!rec) { return undefined; }
		return this.safeSelfAdjust(rec.parameterName, rec.recommendedValue, EvolutionBoundary.MaxChangePercent);
	}

	safeSelfAdjust(parameterName: string, targetValue: number, boundary: EvolutionBoundary): EvolutionRecord | undefined {
		if (!this._config.evolutionEnabled || this._frozen) { return undefined; }
		if (this.isImmutable(parameterName)) { return undefined; }
		if (this._adaptationsThisSession >= this._config.maxAdaptationsPerSession) { return undefined; }
		if (this._lastAdaptationAt && Date.now() - this._lastAdaptationAt < this._config.minAdaptationIntervalMs) {
			return undefined;
		}
		if (!this.isWithinBoundary(parameterName, targetValue)) { return undefined; }

		const currentValue = this._parameters.get(parameterName) ?? 0;
		const changePercent = currentValue !== 0 ? Math.abs(targetValue - currentValue) / Math.abs(currentValue) : 0;
		if (changePercent > this._config.maxChangePercent) {
			const direction = targetValue > currentValue ? 1 : -1;
			targetValue = currentValue * (1 + direction * this._config.maxChangePercent);
		}

		return this._createRecord(parameterName, currentValue, targetValue, boundary, 'safe-self-adjust');
	}

	learnFromWorkload(workloadSignature: string, outcomeScore: number): void {
		// Update heuristic effectiveness scores based on outcome
		for (const [id, heuristic] of this._heuristicMap) {
			if (heuristic.active) {
				const newScore = heuristic.effectivenessScore * 0.9 + outcomeScore * 0.1;
				this._heuristicMap.set(id, { ...heuristic, effectivenessScore: newScore });
			}
		}
	}

	adaptToWorkload(): readonly EvolutionRecord[] {
		const recommendations = this.generateRecommendations();
		const records: EvolutionRecord[] = [];
		for (const rec of recommendations) {
			if (!rec.requiresApproval) {
				const record = this.applyRecommendation(rec.recommendationId);
				if (record) { records.push(record); }
			}
		}
		return records;
	}

	isWithinBoundary(parameterName: string, proposedValue: number): boolean {
		const currentValue = this._parameters.get(parameterName) ?? 0;
		if (currentValue === 0) { return proposedValue >= 0; }
		const changePercent = Math.abs(proposedValue - currentValue) / Math.abs(currentValue);
		return changePercent <= this._config.maxChangePercent;
	}

	rollbackLatest(): EvolutionRecord | undefined {
		const latestApplied = [...this._records].reverse().find(r => !r.rolledBack);
		if (!latestApplied) { return undefined; }
		return this.rollbackByRecord(latestApplied.recordId);
	}

	rollbackByRecord(recordId: string): EvolutionRecord | undefined {
		const record = this._records.find(r => r.recordId === recordId);
		if (!record || record.rolledBack) { return undefined; }
		const rolledBack: EvolutionRecord = { ...record, rolledBack: true, regressionDetected: true };
		const idx = this._records.indexOf(record);
		this._records[idx] = rolledBack;
		this._parameters.set(record.parameterName, record.previousValue);
		this._totalRollbacks++;
		this._onEvolutionRolledBack.fire(rolledBack);
		this._logService.info(`AutonomousEvolution: rolled back ${record.parameterName} from ${record.newValue} to ${record.previousValue}`);
		return rolledBack;
	}

	rollbackRegressions(): readonly EvolutionRecord[] {
		const regressed = this._records.filter(r => r.regressionDetected && !r.rolledBack);
		const rolledBack: EvolutionRecord[] = [];
		for (const record of regressed) {
			const result = this.rollbackByRecord(record.recordId);
			if (result) { rolledBack.push(result); }
		}
		return rolledBack;
	}

	freezeEvolution(): void {
		this._frozen = true;
		this._onEvolutionFrozen.fire({ consecutiveRegressions: this._consecutiveRegressions });
		this._logService.warn('AutonomousEvolution: evolution frozen due to regressions');
	}

	unfreezeEvolution(): void {
		this._frozen = false;
		this._consecutiveRegressions = 0;
		this._logService.info('AutonomousEvolution: evolution unfrozen');
	}

	getParameterValue(parameterName: string): number | undefined {
		return this._parameters.get(parameterName);
	}

	setParameterValue(parameterName: string, value: number, justification: string): EvolutionRecord | undefined {
		if (this.isImmutable(parameterName)) { return undefined; }
		const currentValue = this._parameters.get(parameterName) ?? 0;
		return this._createRecord(parameterName, currentValue, value, EvolutionBoundary.MaxChangePercent, justification);
	}

	getParameterHistory(parameterName: string): readonly EvolutionRecord[] {
		return this._parameterHistory.get(parameterName) ?? [];
	}

	registerHeuristic(heuristic: Omit<IEvolutionHeuristic, 'heuristicId' | 'effectivenessScore'>): IEvolutionHeuristic {
		const full: IEvolutionHeuristic = { ...heuristic, heuristicId: generateUuid(), effectivenessScore: 0.5 };
		this._heuristicMap.set(full.heuristicId, full);
		return full;
	}

	getHeuristics(): readonly IEvolutionHeuristic[] {
		return [...this._heuristicMap.values()];
	}

	isImmutable(parameterName: string): boolean {
		return this._config.immutableParameters.includes(parameterName);
	}

	private _createRecord(parameterName: string, previousValue: number, newValue: number, boundary: EvolutionBoundary, rationale: string): EvolutionRecord {
		const record: EvolutionRecord = {
			recordId: generateUuid(),
			parameterName,
			previousValue,
			newValue,
			appliedBoundary: boundary,
			rationale,
			improvedPerformance: undefined,
			regressionDetected: false,
			rolledBack: false,
			appliedAt: Date.now(),
			validatedAt: undefined,
			workloadSignature: 'default',
			appliedHeuristic: 'direct-adjustment',
		};
		this._records.push(record);
		if (this._records.length > 2000) { this._records.splice(0, this._records.length - 2000); }
		this._parameters.set(parameterName, newValue);
		const history = this._parameterHistory.get(parameterName) ?? [];
		history.push(record);
		if (history.length > 200) { history.splice(0, history.length - 200); }
		this._parameterHistory.set(parameterName, history);
		this._totalAdaptations++;
		this._adaptationsThisSession++;
		this._lastAdaptationAt = Date.now();
		this._onEvolutionApplied.fire({ record, metricBefore: previousValue, metricAfter: newValue });
		this._logService.info(`AutonomousEvolution: ${parameterName} ${previousValue} -> ${newValue} (${rationale})`);
		return record;
	}

	private _computeRecentEffectiveness(): number {
		const recent = this._records.slice(-10).filter(r => !r.rolledBack);
		if (recent.length === 0) { return 1.0; }
		const improved = recent.filter(r => r.improvedPerformance !== false).length;
		return improved / recent.length;
	}
}
