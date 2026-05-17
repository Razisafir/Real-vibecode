# Human-Centered Validation Layer

## Overview

The `IHumanWorkflowValidationService` acts as a continuous quality gate that ensures every IDE behavior, feature, and interaction respects the principles of human-centered computing. It evaluates running systems against a rigorous set of violation types and coherence metrics, producing an overall `humanAwarenessScore` that reflects how well the IDE is treating its user.

This is not a theoretical framework — it is an active, runtime validation service that can block, flag, or warn about behaviors that violate human workflow integrity.

---

## 10 Violation Types

### 1. InterruptionOverload
The system presents too many interruptions within a defined time window. Interruptions include notifications, auto-suggestions, permission prompts, and forced-focus changes.

- **Threshold**: More than 3 interruptions per 10-minute window during focused work
- **Severity**: Critical — directly damages flow state
- **Detection**: Count of attention-demanding events weighted by user focus level

### 2. WorkflowFragmentation
The user's coherent workflow is broken into disconnected pieces by system behavior. The IDE inserts steps, redirects attention, or forces context switches that shatter the user's task continuity.

- **Threshold**: Workflow coherence score drops below 0.6 during an active sequence
- **Severity**: High — destroys task momentum
- **Detection**: Gap analysis between expected workflow actions and actual interaction path

### 3. ExcessiveCognitivePressure
The system demands too much simultaneous cognitive load — multiple panels requiring attention, complex multi-step configurations, or information overload in the active view.

- **Threshold**: More than 5 distinct information sources competing for attention simultaneously
- **Severity**: High — causes decision fatigue and errors
- **Detection**: Count of visible, information-dense surfaces weighted by their update frequency

### 4. MomentumDestruction
The system breaks the user's deep-work momentum by forcing a pause, demanding a decision, or creating an unavoidable delay. This is the most severe violation — momentum, once destroyed, takes 15-25 minutes to rebuild.

- **Threshold**: Any forced interruption during sustained interaction periods exceeding 10 minutes
- **Severity**: Critical — the costliest violation in terms of human productivity and wellbeing
- **Detection**: Focus duration tracking combined with forced-attention events

### 5. RecoveryStarvation
After an interruption (whether system-caused or external), the system fails to provide recovery support — context is lost, the workspace is rearranged, or the user must manually reconstruct their mental state.

- **Threshold**: Recovery support score below 0.5 after any interruption exceeding 5 minutes
- **Severity**: High — compounds interruption damage
- **Detection**: Post-interruption context restoration metrics

### 6. RhythmInstability
The system's interaction cadence is erratic — response times vary wildly, suggestions appear at unpredictable intervals, or the UI updates asynchronously in ways that break the user's established rhythm.

- **Threshold**: Interaction timing variance exceeds 40% of the mean during steady-state work
- **Severity**: Moderate — creates subconscious stress
- **Detection**: Statistical analysis of interaction timing patterns

### 7. AttentionAbuse
The system uses attention-grabbing mechanisms (animations, sounds, visual urgency) inappropriately — for low-priority information, self-promotion, or non-urgent notifications.

- **Threshold**: Any use of high-urgency visual treatment for non-critical information
- **Severity**: Critical — trains the user to ignore all notifications (alarm fatigue)
- **Detection**: Mismatch between visual urgency level and information criticality

### 8. PersistenceGaps
The system fails to maintain state that the user expects to persist — settings revert, workspace layouts reset, unsaved drafts disappear, or recent-file lists are cleared.

- **Threshold**: Any unexpected state loss that the user must manually reconstruct
- **Severity**: High — destroys trust
- **Detection**: Comparison of expected state continuity against actual state after transitions

### 9. UIAggression
The IDE takes aggressive actions without explicit user consent — auto-formatting code, auto-saving changes, auto-updating extensions, or auto-reorganizing the workspace. Even if well-intentioned, these actions violate user autonomy.

- **Threshold**: Any automated mutation of user content or workspace without explicit opt-in
- **Severity**: Critical — undermines trust and sense of control
- **Detection**: Count of unapproved automated changes per session

### 10. InteractionFatigue
The system requires too many clicks, scrolls, or navigation steps for common tasks. The cumulative interaction cost of a session is too high, leading to physical and mental fatigue.

- **Threshold**: Average interaction cost for common tasks exceeds 3x the theoretical minimum
- **Severity**: Moderate — cumulative damage over a workday
- **Detection**: Step-count analysis for recognized task patterns

---

## Coherence Scoring

The service produces a multi-dimensional coherence score that captures how well the IDE respects human workflow:

```typescript
interface CoherenceScore {
  momentumPreservation: number;    // 0.0 to 1.0 — how well focus momentum is maintained
  interruptionRespect: number;     // 0.0 to 1.0 — how appropriately interruptions are handled
  continuity: number;              // 0.0 to 1.0 — how seamless workflow transitions are
  recovery: number;                // 0.0 to 1.0 — how well the system supports post-interruption recovery
  rhythmAdaptation: number;        // 0.0 to 1.0 — how well the system matches the user's pace
}
```

### Quality Thresholds

| Metric | Excellent | Acceptable | Poor | Critical |
|---|---|---|---|---|
| momentumPreservation | ≥ 0.9 | ≥ 0.7 | ≥ 0.5 | < 0.5 |
| interruptionRespect | ≥ 0.85 | ≥ 0.7 | ≥ 0.5 | < 0.5 |
| continuity | ≥ 0.9 | ≥ 0.75 | ≥ 0.55 | < 0.55 |
| recovery | ≥ 0.85 | ≥ 0.7 | ≥ 0.5 | < 0.5 |
| rhythmAdaptation | ≥ 0.8 | ≥ 0.65 | ≥ 0.45 | < 0.45 |

Any metric falling into the "Critical" range triggers an immediate flag in development mode and is logged as a violation.

---

## Overall Human Awareness Score

```typescript
interface HumanAwarenessReport {
  overallHumanAwarenessScore: number;   // Weighted average of coherence metrics
  activeViolations: ViolationType[];    // Currently active violations
  feelsManipulative: boolean;           // Whether the system is using manipulative patterns
  coherenceBreakdown: CoherenceScore;   // Individual metric scores
  recommendations: string[];            // Concrete actions to improve scores
}
```

The `overallHumanAwarenessScore` is computed as a weighted average:

- **momentumPreservation**: 30% weight (the most important metric)
- **interruptionRespect**: 25% weight
- **continuity**: 20% weight
- **recovery**: 15% weight
- **rhythmAdaptation**: 10% weight

A score below **0.7** is considered unacceptable and triggers an investigation in development mode.

---

## Feels Manipulative Check

The `feelsManipulative` flag is a binary check that evaluates whether the IDE is engaging in any of these manipulative patterns:

- **Dark patterns**: Using UI design to trick users into actions they didn't intend
- **Attention hijacking**: Using urgency cues for non-urgent information to force engagement
- **Guilt induction**: Implying the user should be more productive, work longer, or use more features
- **False urgency**: Creating time pressure where none exists (countdown timers, urgency animations)
- **Nagging**: Repeatedly prompting for the same action after the user has dismissed it
- **Feature pushing**: Promoting features the user has clearly shown no interest in

If `feelsManipulative` is `true`, it is treated as a **critical violation** regardless of other scores.

---

## Critical Violation Warnings in Dev Mode

During development, the service integrates with the IDE's developer tools to provide real-time violation warnings:

1. **Console Warnings**: Every violation is logged to the developer console with full context
2. **Visual Indicators**: Active violations appear as status bar indicators during development
3. **Build Gate**: Critical violations can optionally fail the build in CI environments
4. **Regression Alerts**: If a previously passing metric drops, a regression alert is generated
5. **Session Reports**: At the end of each development session, a summary of all violations is generated

### Development Mode Configuration

```typescript
interface DevModeValidationConfig {
  enabled: boolean;                 // Master switch for dev-mode validation
  failOnCritical: boolean;          // Whether critical violations fail the build
  consoleLogging: boolean;          // Whether violations are logged to console
  visualIndicators: boolean;        // Whether violations appear in the status bar
  regressionTracking: boolean;      // Whether metric regressions are tracked
}
```

---

## Anti-Patterns (Strictly Prohibited)

1. **Ignoring momentum destruction** — There is no acceptable reason to break a user's deep-work momentum for a non-critical reason. The validation service must flag this every time.
2. **Allowing interruption overload** — Even if each individual interruption seems justified, the cumulative effect must be monitored and bounded.
3. **No recovery support** — After any significant interruption, the system must actively help the user recover context. This is not optional.
4. **Manipulative score inflation** — The coherence metrics must never be gamed by adjusting thresholds to make scores look better. The thresholds represent genuine human-centered quality standards.
5. **Violation suppression** — Violations must never be silenced, hidden, or downgraded to avoid addressing them. Every violation deserves attention and resolution.
