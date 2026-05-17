# Session Continuity Engine

## Phase 16 — Unified Interaction Intelligence & Human Workflow Engine

### Overview

The Session Continuity Engine (`ISessionContinuityService`) ensures that a developer never feels the disorienting loss of context that typically accompanies closing and reopening an IDE, switching between workspaces, or returning after a break. It captures, preserves, and restores the full mental map of a working session — not just which files were open, but what the developer was thinking, where they were heading, and what was left unfinished.

The core principle is embodied in a single aspiration: **the user feels "I never lost my place."** Whether returning after a lunch break, a weekend, or a week, the IDE should feel like opening a book to a bookmarked page — the context is exactly where you left it, the mental map is intact, and you can resume without the cognitive tax of rebuilding context from scratch.

---

### Resume Context

When a session resumes, the engine reconstructs a comprehensive context object:

```typescript
interface ResumeContext {
  /** The primary task the user was working on when the session ended */
  primaryTask: {
    description: string;
    activeFiles: Uri[];
    cursorPositions: Map<Uri, Position>;
    selectionRanges: Map<Uri, Range>;
    lastEditTimestamp: number;
  };

  /** Files that were open in the editor, in tab order */
  openFiles: Uri[];

  /** Active search queries and their results */
  activeSearches: {
    query: string;
    type: 'file' | 'symbol' | 'text' | 'command';
    results: Uri[];
    activeResultIndex: number;
  }[];

  /** Unsaved changes that existed at session end */
  unsavedChanges: {
    file: Uri;
    hasUnsavedEdits: boolean;
    changeSummary: string;  // e.g., "Modified 3 functions in auth.ts"
  }[];

  /** Recent edits within the last 30 minutes of the session */
  recentEdits: {
    file: Uri;
    editType: 'insert' | 'delete' | 'replace';
    region: Range;
    timestamp: number;
  }[];

  /** Hints to help the user rebuild their mental map */
  mentalMapHints: {
    lastThought: string;       // e.g., "Debugging null check in validateInput()"
    nextIntendedAction: string; // e.g., "Add error handling for edge case"
    openQuestions: string[];    // e.g., "Should this be async?"
  }[];

  /** Momentum state at the time of session end */
  momentumBeforeExit: {
    score: number;
    level: string;
    consecutiveMinutes: number;
  };
}
```

The `mentalMapHints` are the most nuanced part of the resume context. They are derived from edit patterns, search queries, cursor movements, and AI observations during the session. They serve as cognitive breadcrumbs — not a literal replay of everything the user did, but enough context to quickly reactivate the mental model of what was happening.

---

### Abandoned Work Detection

The engine identifies work that was in progress when a session ended but was never completed. Abandoned work is characterized by:

- **Uncommitted edits** in files that haven't been saved or committed
- **Incomplete refactors** — files where edits were started but not finished (detected by incomplete symbol references, TODO markers added during the session, or structural changes without corresponding updates)
- **Unresolved debugging** — breakpoints that were set but never cleared, or error markers that were being investigated
- **Partial implementations** — function stubs with TODO comments, empty test cases, or half-written code blocks

When abandoned work is detected, the engine records it with metadata:

```typescript
interface AbandonedWork {
  /** What was being worked on */
  description: string;
  /** Files involved */
  files: Uri[];
  /** When the work was last active */
  lastActiveTimestamp: number;
  /** How complete the work appears to be (0.0 - 1.0) */
  estimatedCompleteness: number;
  /** What remains to be done */
  remainingWork: string;
  /** Whether this is recurring abandoned work (user keeps starting and stopping) */
  isRecurring: boolean;
}
```

---

### Returning Context Detection

When a user returns to a session, the engine detects the type of return and adjusts the restoration strategy accordingly:

| Return Type | Duration | Strategy |
|-------------|----------|----------|
| **Micro-break return** | < 5 minutes | Full restoration — everything exactly as it was. Cursor position, scroll state, selection, and search results are preserved identically. |
| **Short-break return** | 5–60 minutes | Full restoration with summary — same as micro-break, plus a brief summary card: "You were working on X. Last edit was Y minutes ago." |
| **Extended-break return** | 1–24 hours | Contextual restoration — files are restored, but a "Where you left off" panel is shown with mental map hints and abandoned work items. |
| **Long-absence return** | > 24 hours | Guided restoration — the session summary is presented as the primary experience, allowing the user to choose which context to restore rather than opening everything at once. |
| **Workspace switch return** | Any | The previous workspace state is fully preserved and restored when the user switches back. No state is lost between workspace switches. |

---

### Mental Map Preservation

The mental map is the developer's internal model of what they're working on, where things are, and what needs to happen next. The engine preserves this map through several mechanisms:

1. **Spatial Memory**: Cursor positions, scroll offsets, and split editor layouts are preserved exactly. The user should see the same code they saw when they left.

2. **Task Context**: The active task description, related files, and progress are maintained. This is the "what was I doing?" memory.

3. **Navigation History**: The back/forward stack, recently visited symbols, and jump history are preserved. This is the "where have I been?" memory.

4. **Search Context**: Active searches, their results, and which results were being examined are preserved. This is the "what was I looking for?" memory.

5. **Decision Context**: Recent decisions made during the session — which approach was chosen, which alternatives were rejected, and why — are captured from AI interactions and edit patterns. This is the "why did I choose this?" memory.

---

### Continuity Events

The engine emits a stream of events that other subsystems can subscribe to:

| Event | When Emitted | Payload |
|-------|-------------|---------|
| **SessionStart** | When a new session begins | session ID, timestamp, resume context (if any) |
| **SessionEnd** | When a session ends (graceful close, crash, timeout) | session summary, abandoned work items, momentum state |
| **WorkspaceSwitch** | When the user switches to a different workspace | departing workspace state, incoming workspace state |
| **ContextReturn** | When the user returns to a previously active context | resume context, return type, time away |
| **AbandonedWork** | When abandoned work is detected at session end | abandoned work items with descriptions and metadata |
| **WorkResumed** | When the user resumes previously abandoned work | the abandoned work item, time since abandonment, how it was resumed |

These events allow the entire IDE ecosystem to participate in continuity — the AI assistant can reference previous session context, the task system can track abandoned work, and the notification system can suppress interruptions during context restoration.

---

### Session Summaries

At the end of every session, the engine generates a summary that serves as the bridge to the next session:

```typescript
interface SessionSummary {
  /** Duration of the session */
  duration: number;

  /** Primary tasks worked on */
  tasks: {
    description: string;
    startedAt: number;
    endedAt?: number;
    completed: boolean;
    filesModified: Uri[];
  }[];

  /** Files edited, ordered by edit frequency */
  filesByActivity: Uri[];

  /** Peak momentum reached during the session */
  peakMomentum: number;

  /** Total momentum-minutes (area under the momentum curve) */
  productiveMinutes: number;

  /** Abandoned work items */
  abandonedWork: AbandonedWork[];

  /** Mental map hints for next session */
  carryForwardHints: string[];

  /** Key decisions made during the session */
  decisions: {
    question: string;
    choice: string;
    rationale?: string;
  }[];
}
```

The session summary is stored persistently and is available across IDE restarts, machine reboots, and even workspace switches. It forms the backbone of cross-session awareness — the IDE always knows what happened last time, even if "last time" was three days ago.

---

### Continuity Philosophy

The Session Continuity Engine is built on two philosophical pillars:

**Mental Map Continuity**: The developer's mental model of their work is the most valuable and most fragile asset in a coding session. Every context switch, every restart, every workspace change threatens to shatter that mental map. The engine's job is to maintain continuity of that map — not by recording everything (that would be overwhelming), but by capturing the essential structure: what, where, why, and what's next.

**Always Resumable**: No session should ever feel like a dead end. Whether the user closed the IDE gracefully, crashed, or just walked away for the weekend, the state should always be recoverable. The return experience should feel less like "starting over" and more like "picking up where I left off."

---

### Anti-Patterns

- **Lost Context on Restart**: The most basic failure — closing and reopening the IDE loses all open files, cursor positions, and search state. This forces the user to manually reconstruct their mental map every time, a pure waste of cognitive energy.
- **Forgotten Workspace State**: Switching between workspaces and finding that the previous workspace's state has been discarded. Each workspace switch should be seamless — the departing state is frozen, the arriving state is thawed.
- **No Resume Capability**: The IDE opens to a blank slate after restart, offering no indication of what the user was working on. The first 5 minutes of every session are spent rebuilding context — time that could be saved with proper continuity.
- **Over-Restoration**: Dumping every file, search, and panel state back onto the screen without curation. Restoration should be intelligent — showing the most relevant context prominently and making the rest available but not intrusive.
- **No Abandoned Work Awareness**: The user starts a refactor, gets pulled into a meeting, and the next day has no reminder that the refactor was left incomplete. Abandoned work detection ensures nothing falls through the cracks.

---

### Core Principle

> **The user feels "I never lost my place."**

Session continuity transforms the IDE from a stateless tool into a persistent workspace that remembers, anticipates, and restores — so the developer's cognitive energy goes into writing code, not into remembering where they left off.
