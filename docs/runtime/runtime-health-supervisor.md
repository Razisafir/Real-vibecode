# RuntimeHealthSupervisorService (#104)

The RuntimeHealthSupervisorService provides continuous health monitoring for all services in the AI Execution Kernel. With over 109 services running concurrently, manual health checking is infeasible; the supervisor automates the detection of degradation, instability, and failure conditions. It computes health scores, detects anomalies, forecasts instability, and drives the thermal state model that triggers escalating corrective actions.

## Service Health Monitoring Architecture

The health supervisor monitors all registered services through a combination of passive observation and active probing. The architecture is designed to scale to 109+ services without introducing significant overhead.

**Passive observation** is the primary monitoring mechanism. The supervisor subscribes to events emitted by the RuntimeKernelService (heartbeat signals, state transitions, error events) and the ExecutionSchedulerService (completion rates, failure rates, queue depths). These events flow into a per-service health profile that is updated in real time without any additional instrumentation cost.

**Active probing** is used as a secondary mechanism for services that do not emit sufficient events for passive observation. The supervisor sends periodic health check requests to such services at a configurable interval (default: every 2000ms). A health check request invokes the service's `healthCheck()` method, which returns a `HealthCheckResult` containing a status code, an optional message, and optional metrics (latency, queue depth, memory usage).

The supervisor maintains a health profile for each service. The profile is a sliding-window data structure that retains the last `healthWindowSize` (default: 100) observations. Each observation includes a timestamp, the event or probe result, and any associated metrics. The sliding window enables trend analysis while bounding memory usage.

To scale across 109+ services, the supervisor partitions services into monitoring groups of `monitoringGroupSize` (default: 20 services). Each group is processed in a round-robin fashion during the supervisor's maintenance phase. The maintenance phase runs every 10 ticks (500ms at default cadence), and each run processes one monitoring group. This ensures that all services are checked within `ceil(109/20) * 500ms = 3000ms`, well within the supervisor's `fullScanTargetMs` (default: 5000ms).

## Health Scoring Model

Each service receives a health score between 0.0 (completely failed) and 1.0 (perfectly healthy). The score is computed as a weighted combination of three factors:

**Responsiveness (weight: 0.4)**: Measures whether the service is responding to requests within expected time bounds. The responsiveness score is computed as the ratio of on-time responses to total responses within the sliding window. A response is considered "on time" if it completes within `expectedResponseMs` (default: service-specific, typically 100-500ms). Late responses and missed heartbeats reduce the responsiveness score. A service that has missed its last 3 heartbeats receives a responsiveness score of 0.0 regardless of historical data.

**Error rate (weight: 0.35)**: Measures the frequency of errors in the service's operations. The error rate score is computed as `1.0 - (errorCount / totalOperations)` within the sliding window. Only operation-level errors are counted; expected errors (such as validation failures on invalid input) are excluded. A service with an error rate above 50% receives an error rate score of 0.0.

**Latency (weight: 0.25)**: Measures the service's response time relative to its expected latency. The latency score is computed using a normalized latency metric: `1.0 - (p99Latency / expectedLatency * normalizationFactor)`, where `normalizationFactor` (default: 2.0) maps latencies that are twice the expected value to a score of 0.0. Latencies above `expectedLatency * normalizationFactor` are clamped to 0.0.

The composite health score is: `0.4 * responsiveness + 0.35 * errorRateScore + 0.25 * latencyScore`. This formula ensures that a service must be responsive, have a low error rate, and maintain acceptable latency to receive a high health score. A service that is responsive but slow, or fast but error-prone, will receive a moderate score that reflects its actual condition.

Health scores are updated after each maintenance phase for the processed monitoring group. Scores are not updated between maintenance phases, which prevents rapid oscillation due to transient events. The score history is retained for `scoreHistoryDepth` (default: 50) updates, enabling trend analysis.

## Degradation Detection Algorithm

The supervisor detects service degradation through a combination of threshold detection and trend analysis. Degradation is defined as a sustained decline in health score that has not yet reached failure levels but indicates an emerging problem.

**Threshold detection** uses configurable thresholds to classify health scores into degradation levels:

| Score Range | Classification | Action |
|-------------|---------------|--------|
| 0.8 - 1.0 | Healthy | No action |
| 0.6 - 0.8 | Slightly Degraded | Log warning, increase monitoring frequency |
| 0.4 - 0.6 | Degraded | Emit `ServiceDegraded` event, notify recovery orchestrator |
| 0.2 - 0.4 | Severely Degraded | Emit `ServiceSeverelyDegraded` event, initiate soft recovery |
| 0.0 - 0.2 | Failing | Emit `ServiceFailing` event, initiate aggressive recovery |

**Trend analysis** examines the trajectory of health scores over time. The supervisor computes a linear regression over the last `trendWindowSize` (default: 10) health score updates. The slope of the regression line indicates the trend direction:

- **Declining slope** (less than -0.02 per update): The service is degrading. The supervisor emits a `DegradationTrendDetected` event even if the current score is still above the degradation threshold. This early warning enables proactive intervention.
- **Stable slope** (between -0.02 and +0.02 per update): The service is stable. No additional action.
- **Improving slope** (greater than +0.02 per update): The service is recovering. The supervisor reduces monitoring frequency back to normal.

The trend analysis is resistant to noise: a single anomalous score will not trigger a trend detection because the regression is computed over multiple updates. However, a consistent decline over 5+ updates will be detected even if each individual decline is small.

## Instability Forecasting

The supervisor includes a predictive model that forecasts service instability before it manifests in health scores. The model uses historical trend data to extrapolate future health trajectories.

The forecasting algorithm maintains an exponential moving average (EMA) of the health score slope. The EMA is computed as: `ema = alpha * currentSlope + (1 - alpha) * previousEma`, where `alpha` (default: 0.3) controls the smoothing factor. The EMA provides a smoothed trend estimate that is less sensitive to recent noise than the raw slope.

The forecasted time-to-degradation is estimated as: `(currentHealthScore - degradationThreshold) / max(ema, 0.001)`, where `degradationThreshold` is 0.6 (the start of the Degraded classification). This formula estimates how many health score updates remain before the service enters the Degraded zone, assuming the current trend continues.

When the forecasted time-to-degradation is less than `instabilityForecastHorizon` (default: 20 updates, or approximately 10 seconds at the default monitoring frequency), the supervisor emits an `InstabilityForecast` event. This event includes the current health score, the forecasted degradation time, and the trend slope. The RuntimeRecoveryOrchestratorService can use this forecast to initiate preventive actions.

The forecasting model is recalibrated every `forecastRecalibrationInterval` (default: 100 updates) by comparing past forecasts against actual outcomes. If the forecast error (difference between predicted and actual degradation time) exceeds `maxForecastError` (default: 50%), the model's alpha parameter is adjusted: a positive error (degradation arrived later than predicted) increases alpha to make the model more responsive, while a negative error decreases alpha to add smoothing.

## Anomaly Detection

The supervisor uses z-score based anomaly detection to identify services that are behaving abnormally relative to their own historical baseline. Unlike threshold detection (which compares against absolute values), anomaly detection compares against the service's own recent behavior, making it sensitive to subtle changes that would not trigger absolute thresholds.

For each service, the supervisor maintains a baseline of the following metrics over the last `baselineWindowSize` (default: 200 observations):

- Response time (mean and standard deviation)
- Error rate (mean and standard deviation)
- Queue depth (mean and standard deviation)

For each new observation, the z-score is computed as: `z = (value - mean) / standardDeviation`. A z-score with an absolute value greater than `anomalyZThreshold` (default: 2.5) is flagged as an anomaly. This corresponds to a value that is 2.5 standard deviations from the service's mean, which occurs less than 1.3% of the time under normal conditions.

When an anomaly is detected, the supervisor:

1. Emits a `ServiceAnomaly` event with the service ID, the anomalous metric, the z-score, and the current and baseline values.
2. Increments the service's anomaly counter.
3. If the anomaly counter exceeds `anomalyCountThreshold` (default: 3) within `anomalyWindowMs` (default: 60000ms), the supervisor classifies the service as Unstable and emits a `ServiceUnstable` event.

The anomaly detection is reset when a service's metrics return to within 1.0 standard deviation of the baseline for `anomalyResetMs` (default: 30000ms). This prevents temporary spikes from permanently marking a service as unstable.

Z-score computation handles the edge case where the standard deviation is zero (a metric that has been perfectly constant) by treating any deviation from the constant value as an infinite z-score, which is always flagged as an anomaly.

## Saturation Detection

Saturation detection identifies services that are operating at or beyond their capacity limits. A saturated service is one that cannot accept additional work without degrading its performance or the performance of other services.

The supervisor monitors the following saturation indicators for each service:

- **Queue depth ratio**: The ratio of current queue depth to the service's maximum queue depth. A ratio above 0.8 is considered near-saturation.
- **Concurrency utilization**: The ratio of active tasks to the service's maxConcurrentTasks. A ratio above 0.9 is considered saturated.
- **CPU utilization**: The percentage of the service's CPU budget that is currently consumed. Above 85% is considered saturated.
- **Memory utilization**: The percentage of the service's memory budget that is currently consumed. Above 90% is considered saturated.

A service is classified as Saturated if any two or more saturation indicators exceed their thresholds simultaneously. A service is classified as NearSaturated if exactly one indicator exceeds its threshold. These classifications are stored in the service's health profile and emitted as `ServiceSaturated` or `ServiceNearSaturated` events.

Saturation data feeds into the ResourceGovernanceService, which may adjust resource quotas or trigger load shedding to relieve saturated services. It also feeds into the ExecutionSchedulerService, which may route new work away from saturated services through the capability routing algorithm.

## Cascading Failure Prevention

The supervisor implements cascading failure prevention using isolation boundaries and circuit breaker patterns. A cascading failure occurs when the failure of one service causes dependent services to fail in turn, creating a chain reaction that can bring down the entire system.

**Isolation boundaries** are enforced at the service level. When a service fails, the supervisor immediately isolates it by:

1. Marking the service as Isolated in the health profile.
2. Directing the ExecutionSchedulerService to stop routing work to the isolated service.
3. Notifying dependent services that their dependency is unavailable (through `DependencyUnavailable` events).
4. Activating fallback behaviors for the isolated service's dependents.

**Circuit breakers** are implemented for each inter-service communication channel. The circuit breaker monitors the failure rate of calls from a caller service to a target service. When the failure rate exceeds `circuitBreakerThreshold` (default: 50% over the last 20 calls), the circuit breaker "opens" -- it immediately rejects all subsequent calls to the target service and returns a `CircuitOpenError` to the caller. This prevents the caller from wasting time waiting for a failing dependency.

After `circuitBreakerResetMs` (default: 30000ms), the circuit breaker transitions to a "half-open" state, where it allows a single probe call through. If the probe succeeds, the circuit breaker closes and normal traffic resumes. If the probe fails, the circuit breaker remains open and the reset timer restarts.

The supervisor tracks circuit breaker state across all inter-service channels and emits `CircuitBreakerOpened` and `CircuitBreakerClosed` events. A high number of open circuit breakers indicates a systemic problem that may require intervention from the RuntimeRecoveryOrchestratorService.

## Thermal State Model

The thermal state model provides a holistic view of system health by aggregating individual service health scores into a system-wide thermal state. The thermal state is inspired by CPU thermal throttling: as the system gets "hotter" (more services are degraded or failing), it automatically reduces load to prevent further damage.

The thermal state has four levels:

**Cool**: All critical services have health scores above 0.8, and fewer than 10% of non-critical services are below 0.6. The system is operating normally. No throttling is applied.

**Warm**: One or more critical services have health scores between 0.6 and 0.8, or more than 10% of non-critical services are below 0.6. The system is under mild stress. The supervisor triggers the following responses:
- Increase monitoring frequency for degraded services.
- Emit `ThermalStateWarm` event.
- Suggest load reduction to the ResourceGovernanceService (advisory, not mandatory).

**Hot**: One or more critical services have health scores between 0.4 and 0.6, or more than 25% of non-critical services are below 0.6. The system is under significant stress. The supervisor triggers mandatory responses:
- Reduce concurrency limits by 25% across all services.
- Shed Background and Deferred work from the ExecutionSchedulerService.
- Emit `ThermalStateHot` event.
- Notify the RuntimeRecoveryOrchestratorService.

**Overheated**: One or more critical services have health scores below 0.4, or more than 50% of non-critical services are below 0.6. The system is in crisis. The supervisor triggers emergency responses:
- Reduce concurrency limits by 50% across all services.
- Shed Low, Background, and Deferred work.
- Pause all non-critical services.
- Emit `ThermalStateOverheated` event.
- Invoke the RuntimeRecoveryOrchestratorService with Emergency escalation.

Thermal state transitions are rate-limited to prevent oscillation. A transition from Cool to Warm requires the Warm conditions to persist for at least `thermalTransitionCooldownMs` (default: 5000ms). Transitions in the cooling direction (Hot to Warm, Warm to Cool) require the lower-stress conditions to persist for at least `thermalCooldownMultiplier` times the transition cooldown (default: 2x, so 10000ms). This hysteresis ensures that the system does not rapidly toggle between states.

## Pressure Escalation Protocol

The pressure escalation protocol defines how pressure signals (from health scores, saturation detection, and thermal state) propagate through the system to trigger corrective actions.

The protocol operates on a three-tier escalation model:

**Tier 1 -- Advisory Pressure**: When a service's health score drops into the Slightly Degraded range (0.6-0.8), the supervisor emits an advisory pressure signal. This signal is informational only and does not trigger any mandatory action. Services that receive advisory pressure may choose to reduce their own load, increase their monitoring granularity, or prepare fallback behaviors. The ResourceGovernanceService uses advisory pressure to adjust its fairness weights, giving degraded services a lower share of contested resources.

**Tier 2 -- Active Pressure**: When a service's health score drops into the Degraded range (0.4-0.6), or when the thermal state reaches Hot, the supervisor emits an active pressure signal. Active pressure triggers mandatory responses: the ExecutionSchedulerService reduces the concurrency of the affected service, the ResourceGovernanceService reduces its resource quotas, and the agent orchestration layer routes new work away from the degraded service. These actions are coordinated through the pressure signal's metadata, which specifies the recommended magnitude of each response.

**Tier 3 -- Emergency Pressure**: When a service's health score drops below 0.2, or when the thermal state reaches Overheated, the supervisor emits an emergency pressure signal. Emergency pressure triggers aggressive responses: the RuntimeRecoveryOrchestratorService is invoked with the appropriate escalation level, all non-essential work is shed, and the system enters a protective mode where only critical operations are permitted. Emergency pressure overrides all other scheduling and resource allocation decisions.

Pressure signals are propagated through the runtime event bus and are received by all subscribed services within a single tick. This ensures that corrective actions are coordinated and that no service makes independent decisions that conflict with the pressure response.
