# Intent Persistence Engine

## Phase 16 — Unified Interaction Intelligence & Human Workflow Engine

### Overview

The Intent Persistence Engine (`IIntentPersistenceService`) maintains a living model of the developer's goals, tasks, and intentions across sessions, workspaces, and even extended absences. While the Session Continuity Engine preserves *where* you were, the Intent Persistence Engine preserves *what you were trying to do* — the purpose behind the activity, the goal driving the edits, the reason for the searches.

The core principle: **the system feels continuously aware without becoming intrusive.** It remembers what you were working toward, it notices when you've been pulled away from a goal, and it can gently resurface dormant intentions at the right moment — but it never nags, never interrupts flow, and never makes the developer feel surveilled. The awareness is quiet, helpful, and always respectful of the developer's autonomy.

---

### Intent States

Every tracked intent exists in one of six states, representing its lifecycle from formation to resolution:

| State | Description | Transitions |
|-------|-------------|-------------|
| **Formed** | The intent has been detected but not yet acted upon. The developer has expressed a goal (through search, AI query, or TODO creation) but hasn't started working toward it. | → Active (when work begins), → Dormant (if never acted upon), → Abandoned (if explicitly dismissed) |
| **Active** | The developer is currently working toward this intent. Edits, searches, and navigation are consistent with the goal. | → Suspended (if interrupted), → Completed (if goal achieved), → Dormant (if abandoned without completion) |
| **Suspended** | The intent was Active but was paused — the developer switched to a different task or was interrupted. The intent is still fresh and likely to be resumed. | → Active (if resumed), → Dormant (if not resumed within expected timeframe) |
| **Dormant** | The intent has been inactive for an extended period. It's not forgotten, but it's not currently relevant. The engine monitors for resurfacing opportunities. | → Active (if resurfaced and resumed), → Abandoned (if explicitly dismissed or superseded) |
| **Completed** | The intent has been fulfilled. The goal was achieved, and the engine records the completion for learning. | Terminal state |
| **Abandoned** | The intent was explicitly dismissed or has been superseded by a different goal. The engine records the abandonment for pattern learning. | Terminal state |

State transitions are driven by observable behavior, not explicit user declaration. The engine infers intent state from edit patterns, search queries, navigation history, and interaction context. The developer never has to manually manage intent states — the system tracks them transparently.

---

### User Intent Model

Each tracked intent is represented by a rich model that captures not just the goal itself but the full context surrounding it:

```typescript
interface UserIntent {
  /** Unique identifier for this intent */
  id: string;

  /** Natural language description of the intent */
  description: string;

  /** Current state of the intent */
  state: IntentState;

  /** Files directly related to this intent */
  relatedFiles: Uri[];

  /** Search queries that were part of forming or pursuing this intent */
  relatedSearches: string[];

  /** Progress toward completion (0.0 - 1.0), estimated from observable signals */
  progress: number;

  /** Whether this intent recurs across sessions (e.g., "maintain test coverage") */
  isRecurring: boolean;

  /** Parent intent — for sub-goals that are part of a larger intent */
  parentId?: string;

  /** Child intents — for decomposition of complex goals */
  childIds: string[];

  /** When the intent was first formed */
  formedAt: number;

  /** When the intent was last active */
  lastActiveAt: number;

  /** Timestamps for each state transition */
  stateHistory: {
    from: IntentState;
    to: IntentState;
    timestamp: number;
    trigger: string; // What caused the transition
  }[];

  /** Confidence in the intent model (0.0 - 1.0) */
  confidence: number;

  /** Source of the intent detection */
  detectionSource: 'explicit' | 'ai-inferred' | 'pattern-derived' | 'todo-extracted';
}
```

The `detectionSource` field is critical for trust. Explicitly stated intents (from TODOs, commit messages, or AI conversations) have high confidence. AI-inferred intents (detected from behavior patterns) have lower confidence initially but increase with supporting evidence. Pattern-derived intents (detected because this developer always does X after Y) combine historical and current signals.

---

### Intent Chains Across Sessions

Intents don't exist in isolation — they form chains that span sessions. A developer might start an intent in Monday's session, suspend it when interrupted, resume it briefly on Tuesday, and finally complete it on Wednesday. The engine tracks these chains:

```typescript
interface IntentChain {
  /** The root intent of the chain */
  rootIntentId: string;

  /** All intents in the chain, ordered by formation time */
  intents: UserIntent[];

  /** Sessions in which this chain was active */
  sessionHistory: {
    sessionId: string;
    timestamp: number;
    activeIntents: string[]; // Intent IDs active during this session
  }[];

  /** Total elapsed working time across all sessions */
  totalActiveTime: number;

  /** Whether the chain is still open (has non-terminal intents) */
  isOpen: boolean;
}
```

Intent chains enable several powerful capabilities:

- **Cross-session awareness**: When the developer returns on Wednesday, the system knows they were working on a multi-day refactoring effort and can restore the full context.
- **Progress tracking**: The chain shows how much of the overall goal has been completed across sessions, providing a sense of progress even when individual sessions feel incremental.
- **Dependency tracking**: Child intents that depend on parent completion are surfaced at the right time, not before.
- **Pattern learning**: The engine learns which types of intents typically span multiple sessions (large refactors, feature development) versus single sessions (bug fixes, quick tweaks).

---

### Dormant Goal Detection

Dormant goals are intents that have been Suspended for longer than expected. The engine tracks dormancy with specific metadata:

```typescript
interface DormantGoal {
  /** The underlying intent */
  intent: UserIntent;

  /** How long the intent has been dormant */
  dormantSince: number; // timestamp
  dormantDuration: number; // minutes

  /** How much effort would be required to resume */
  estimatedRecoveryEffort: 'trivial' | 'moderate' | 'significant' | 'high';

  /** Priority for resurfacing (higher = more likely to be mentioned) */
  resurfacingPriority: number; // 0.0 - 1.0

  /** Why the intent became dormant */
  dormancyReason: 'interrupted' | 'blocked' | 'deprioritized' | 'forgot' | 'context_lost';

  /** Whether the intent was progressing well before dormancy */
  hadGoodProgress: boolean;
}
```

The `estimatedRecoveryEffort` is calculated from:
- **Trivial**: The intent was nearly complete (> 80% progress) and the context is still fresh (< 2 hours dormant). Resuming takes seconds.
- **Moderate**: The intent was partially complete (30–80% progress) and context is somewhat recent (< 24 hours dormant). Resuming takes a few minutes of context rebuilding.
- **Significant**: The intent was early stage (< 30% progress) or has been dormant for days. Resuming requires substantial context rebuilding.
- **High**: The intent was complex, multi-file, and has been dormant for weeks. The developer may need to re-learn parts of the codebase they were working in.

---

### Recurring Goal Detection

Some intents recur across sessions — they represent ongoing responsibilities rather than one-time tasks:

- **"Maintain test coverage above 80%"** — a recurring quality goal
- **"Keep dependencies up to date"** — a recurring maintenance goal
- **"Review open PRs daily"** — a recurring process goal
- **"Refactor the auth module"** — a recurring improvement goal that keeps getting deprioritized

The engine detects recurring goals by matching intent descriptions, related files, and behavioral patterns across sessions. When an intent is identified as recurring:

- It receives a `isRecurring: true` flag
- Its completion doesn't remove it from the model — it's re-activated when conditions suggest it's relevant again
- Its dormancy thresholds are relaxed — recurring goals can be dormant for longer before being considered abandoned
- Its resurfacing is calibrated to the recurrence pattern (daily, weekly, per-release-cycle)

---

### Intent Resurfacing Logic

The most delicate part of the Intent Persistence Engine is resurfacing — bringing a dormant intent back to the developer's attention at the right moment. Resurfacing must be **timely but not intrusive** — the goal is to provide a gentle reminder, not a nagging notification.

**Resurfacing Conditions**:

1. **Context Match**: The developer is working in files or areas related to the dormant intent. For example, if the dormant intent was "refactor the auth module," and the developer opens `auth.ts`, the intent is resurfaced.

2. **Temporal Trigger**: The developer enters a time window when they typically work on this type of intent. For example, if the developer usually handles maintenance tasks on Friday afternoons, dormant maintenance intents are resurfaced on Friday at 2 PM.

3. **Completion Opportunity**: The developer has just completed a related task, and the dormant intent is the natural next step. For example, after completing "write tests for feature X," the dormant intent "add feature X to the API" might be resurfaced.

4. **Momentum Window**: The developer is at Stalled or Building momentum and could benefit from a productive direction. Dormant intents with high resurfacing priority are offered as suggestions: "You were working on [X] last week — would you like to continue?"

**Resurfacing Delivery**:

Resurfacing is always delivered through the Interruption Intelligence System, which applies cost calculation and timing strategies. A resurfaced intent is classified as Contextual (not Important or Critical), so it respects momentum and flow state. The delivery format is a subtle, dismissible card:

```
┌─────────────────────────────────────────────┐
│ 🔄 You were working on this last Tuesday:   │
│ "Refactor auth middleware for rate limiting" │
│ Progress: 60% · 3 files modified            │
│                                             │
│ [Resume] [Not Now] [Dismiss]                │
└─────────────────────────────────────────────┘
```

The "Resume" action restores the full intent context (files, searches, mental map hints) through the Session Continuity Engine. "Not Now" suppresses resurfacing for 48 hours. "Dismiss" marks the intent as Abandoned.

---

### Cross-Session Task Awareness

The engine maintains awareness of tasks across sessions, providing a persistent "task stack" that survives IDE restarts:

```typescript
interface CrossSessionTaskStack {
  /** Active tasks (currently being worked on or recently suspended) */
  active: UserIntent[];

  /** Dormant tasks (inactive but not abandoned) */
  dormant: DormantGoal[];

  /** Recently completed tasks (for context and learning) */
  recentlyCompleted: {
    intent: UserIntent;
    completedAt: number;
    sessionsUsed: number;
  }[];

  /** Tasks that were abandoned (for pattern learning) */
  recentlyAbandoned: {
    intent: UserIntent;
    abandonedAt: number;
    reason: string;
  }[];
}
```

This task stack is available to other subsystems:
- The **AI Assistant** can reference active and dormant intents when offering suggestions
- The **Session Continuity Engine** uses the task stack to prioritize context restoration
- The **Workflow Momentum Engine** considers active intent count when computing momentum (too many active intents may indicate fragmentation)
- The **Cognitive Recovery System** uses the task stack to identify cognitive overload from too many parallel goals

---

### Privacy and Trust

Intent tracking is inherently sensitive — the system is observing what the developer is trying to do. The engine operates under strict privacy principles:

1. **Local-first**: All intent data is stored locally. No intent information is transmitted to any server unless the developer explicitly opts in.
2. **Transparent**: The developer can always see what intents are being tracked, their state, and how they were detected. There are no hidden observations.
3. **Controllable**: The developer can delete any tracked intent, disable intent tracking entirely, or set a retention limit (e.g., "don't track intents older than 30 days").
4. **Non-judgmental**: The engine never evaluates intent quality. There are no "bad" intents or "wasteful" goals. The system observes and assists; it does not judge.

---

### Anti-Patterns

- **Lost Intents Between Sessions**: The most basic failure — the developer was working on something, closed the IDE, and the next day there's no record of what they were trying to do. The intent model must persist across all boundaries.
- **Intrusive Resurfacing**: Surfacing dormant intents at inappropriate times — during deep focus, at Peak momentum, or when the developer has clearly moved on to a different priority. Resurfacing must respect the Interruption Intelligence System's cost calculations.
- **Broken Intent Chains**: Losing the parent-child relationship between intents. When a sub-goal is completed, the parent goal should be updated; when a parent is abandoned, children should be re-evaluated. Broken chains lead to orphaned intents that confuse rather than help.
- **Over-Tracking**: Tracking every minor action as a separate intent. Not every file open is an intent; not every search is a goal. The engine must distinguish between exploration (browsing) and intention (pursuing a goal). Over-tracking creates noise that devalues the signal.
- **Resurfacing Fatigue**: Resurfacing the same dormant intent repeatedly. If the developer dismisses an intent twice, it should not be resurfaced again without a significant context change. Repeated resurfacing feels like nagging and undermines trust in the system.

---

### Core Principle

> **The system feels continuously aware without becoming intrusive — remembering your goals, noticing when you've been pulled away, and gently reconnecting you to what matters at the right moment.**

Intent Persistence transforms the IDE from a stateless editor into a workspace with memory — one that understands not just what you're doing right now, but what you're trying to accomplish over time, and helps you stay on course without ever making you feel watched or pressured.
