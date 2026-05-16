# Execution Timeline Experience

> **Phase 15 — Production Surface Rebuild**
> Service: `IExecutionTimelineExperienceService`

## Overview

The Execution Timeline is the IDE's cinematic flow visualization — a structured, inspectable record of everything that happens during a development session. It captures user actions, AI executions, process state changes, orchestration events, and system events in a temporal stream that is both scannable and deep-diveable. The `IExecutionTimelineExperienceService` governs how this stream is rendered, grouped, and navigated.

The timeline is not a log viewer. It is a narrative. Each event is a beat in the story of the session, and the timeline's job is to present that story in a way that is professional and inspectable — not overwhelming, not underinformative, and never resembling a developer console's raw output stacked vertically with no visual hierarchy.

---

## Density Options

The timeline supports four density modes that control how much information is visible per event and how tightly events are packed vertically. Density is independent of the shell's global density — the timeline has its own density control because its information density requirements are unique.

| Density | Event Height | Visible Fields | Group Headers | Temporal Markers | Target |
|---|---|---|---|---|---|
| **Minimal** | 24px | Icon + title only | Collapsed | Hidden | Quick scan, "what happened" overview |
| **Standard** | 40px | Icon + title + subtitle | Expanded | Hour markers | Default — balanced scanability and detail |
| **Detailed** | 64px | Icon + title + subtitle + preview | Expanded | Hour + minute markers | Deep inspection, debugging sessions |
| **Compact** | 20px | Icon + truncated title | Collapsed | Hidden | Maximum event count, long sessions |

### Density Interaction with Editor Dominance

When the editor is at Dominant or Supreme weight (see `editor-dominance.md`), the timeline automatically shifts one density level toward Minimal. When the editor returns to Standard, the timeline restores the user's preferred density. This ensures the timeline does not visually compete with the editor during focus states.

### Density Auto-Switching

| Condition | Auto-Density | Rationale |
|---|---|---|
| Editor at Dominant+ | User preference −1 level | Timeline yields to editor focus |
| Timeline panel focused | User preference +1 level (max Detailed) | User is inspecting — give them detail |
| >500 events in view | Compact | Prevent excessive scrolling |
| <50 events in view | Standard or Detailed | Enough space for comfortable reading |
| During active AI execution | Standard | Show progress without overwhelming |

---

## Grouping Strategies

Events in the timeline are grouped to prevent an undifferentiated stream. The grouping strategy determines the primary axis of organization.

### BySession

Groups events by logical development sessions — a session starts when the user opens the workspace and ends when they close it or are idle for 30+ minutes.

```
┌─ Session: Today 9:15 AM ─────────────────────────┐
│  ○ Opened workspace                               │
│  ○ Modified auth.ts                               │
│  ● AI: Refactored token validation                │
│  ○ Ran test suite (12 passed, 1 failed)          │
│  ● AI: Fixed failing test                         │
├─ Session: Yesterday 4:30 PM ─────────────────────┤
│  ○ Opened workspace                               │
│  ● AI: Added rate limiting middleware             │
│  ○ Modified server.ts                             │
│  ○ Ran test suite (13 passed)                    │
└───────────────────────────────────────────────────┘
```

**Best for:** Daily review, understanding session flow, resuming work context.

### ByTime

Groups events by fixed time intervals — hours by default, configurable to 15-minute or 30-minute buckets.

```
┌─ 9:00 – 10:00 AM ───────────────────────────────┐
│  ○ Opened workspace                               │
│  ○ Modified auth.ts                               │
│  ● AI: Refactored token validation                │
├─ 10:00 – 11:00 AM ──────────────────────────────┤
│  ○ Ran test suite                                 │
│  ● AI: Fixed failing test                         │
│  ○ Modified user.model.ts                         │
├─ 11:00 – 12:00 PM ──────────────────────────────┤
│  ○ Debug session (3 breakpoints hit)              │
│  ○ Modified auth.ts (again)                       │
└───────────────────────────────────────────────────┘
```

**Best for:** Time-based reviews, understanding productivity patterns, billing/audit.

### ByCausality

Groups events by causal chains — events that triggered or were triggered by other events are visually linked.

```
┌─ Chain: Token Validation Refactor ───────────────┐
│  ○ Modified auth.ts                               │
│  └→ ● AI: Refactored token validation             │
│     └→ ○ Ran test suite                           │
│        └→ ✗ 1 test failed                         │
│           └→ ● AI: Fixed failing test              │
│              └→ ○ Ran test suite                   │
│                 └→ ✓ All tests passed              │
├─ Standalone Events ──────────────────────────────┤
│  ○ Modified user.model.ts                         │
│  ○ Debug session                                  │
└───────────────────────────────────────────────────┘
```

**Best for:** Understanding AI impact, debugging unexpected changes, tracing cause-and-effect.

### ByAgent

Groups events by the AI agent or process that generated them — useful for multi-agent orchestration.

```
┌─ Analyzer ───────────────────────────────────────┐
│  ● Analyzed auth.ts (2 suggestions)               │
│  ● Analyzed server.ts (1 suggestion)              │
├─ Planner ────────────────────────────────────────┤
│  ● Planned token validation refactor              │
│  ● Planned rate limiting addition                 │
├─ Coder ──────────────────────────────────────────┤
│  ● Refactored token validation                    │
│  ● Added rate limiting middleware                 │
│  ● Fixed failing test                             │
└───────────────────────────────────────────────────┘
```

**Best for:** Multi-agent sessions, understanding agent responsibilities, debugging agent coordination.

---

## Event Categories

Every timeline event belongs to one of five categories, each with a distinct icon, color accent, and visual treatment.

| Category | Icon | Accent Color | Visual Weight | Description |
|---|---|---|---|---|
| **UserAction** | ○ circle | Neutral (foreground) | Normal | Direct user actions: file open, edit, save, run, debug |
| **AIExecution** | ● filled circle | Accent (dimmed 40%) | Normal + subtle glow | AI-initiated actions: suggestions, refactors, fixes |
| **ProcessState** | ◐ half circle | Yellow (dimmed) | Normal | Process state changes: build start/end, test pass/fail, server start/stop |
| **Orchestration** | ◈ diamond | Blue (dimmed) | Slightly elevated | Agent coordination: task assignment, dependency resolution, pipeline transitions |
| **System** | ◻ square | Muted (low contrast) | Minimal | System events: extension load, setting change, workspace init |

### Category Visual Rules

1. **UserAction events are the baseline.** They use neutral colors and standard rendering. The timeline is primarily a record of what the user did; AI and system events are supplementary.
2. **AIExecution events use the accent color but never at full saturation.** A 40% reduction from the theme accent ensures AI events are distinguishable without being visually dominant.
3. **System events are minimal.** They use the lowest contrast treatment and are the first events hidden when density increases.
4. **Category colors are never used as backgrounds.** Category identity is communicated through icons and text color only. Background colors are reserved for grouping and selection.

---

## Execution Card Design

The execution card is the primary visual unit of the timeline. It represents a single event with variable detail depending on density.

### Detailed Card Anatomy

```
┌──────────────────────────────────────────────────────────┐
│ ● AIExecution  ·  9:23:47 AM  ·  1.2s                   │
│ ─────────────────────────────────────────                │
│ Refactored token validation in auth.ts                   │
│                                                          │
│ Changed: src/middleware/auth.ts                          │
│   +12 lines · -4 lines · 3 functions modified           │
│                                                          │
│ ┌─ preview ──────────────────────────────────┐           │
│ │  const validated = await validateToken(     │           │
│ │    token,                                   │           │
│ │    { maxAge: 3600, issuer: 'app' }          │           │
│ │  );                                         │           │
│ └─────────────────────────────────────────────┘           │
│                                                          │
│ [View Diff] [Undo Step] [Inspect Chain]                  │
└──────────────────────────────────────────────────────────┘
```

### Card Sections

| Section | Visible At | Content |
|---|---|---|
| **Header** | All densities | Category icon, timestamp, duration |
| **Title** | All densities (truncated at Compact/Minimal) | Event description |
| **Subtitle** | Standard, Detailed | File paths, affected scopes |
| **Preview** | Detailed only | Code preview, diff summary, output snippet |
| **Actions** | Standard, Detailed | Context-specific action buttons |
| **Metadata** | Detailed only | Agent name, confidence, trigger source |

### Card Interaction

- **Click:** Expand/collapse (if collapsible), or navigate to relevant editor position
- **Hover:** Highlight related events in the timeline (same chain, same file, same agent)
- **Right-click:** Context menu with Undo, Inspect Chain, Copy Details, Filter by This
- **Drag:** Not supported — timeline order is temporal and immutable

---

## Event Clusters

When multiple related events occur in rapid succession (< 2s apart), they are automatically clustered into a single expandable node.

### Cluster Rendering

```
┌─ collapsed cluster ────────────────────────┐
│ ◈ 3 Orchestration events · 0.4s total      │
│ Analyzer → Planner → Coder pipeline started │
│                                    ▼ expand │
└────────────────────────────────────────────┘

┌─ expanded cluster ───────────────────────────────────────┐
│ ◈ 3 Orchestration events · 0.4s total                    │
│ ─────────────────────────────────────                    │
│ ◈ Analyzer started (0.0s)                                │
│ ◈ Planner queued (0.1s)                                  │
│ ◈ Coder assigned (0.3s)                                  │
│                                                          │
│                                                    ▲ collapse │
└──────────────────────────────────────────────────────────┘
```

### Cluster Rules

- **Minimum cluster size:** 3 events (2 events are shown individually)
- **Maximum cluster size:** 20 events (larger clusters show first 5 + "N more")
- **Cluster trigger:** Events of the same category within 2 seconds of each other
- **Category homogeneity:** Clusters only group events of the same category

---

## Temporal Spacing

The timeline uses variable vertical spacing between events to communicate temporal distance. Closer events in time are rendered closer together; events hours apart have more breathing room.

### Spacing Formula

```
gap = baseGap × (1 + log(timeDelta + 1))
```

Where `baseGap` is the current density's standard spacing (4px for Standard) and `timeDelta` is in seconds. This creates a logarithmic spacing curve that compresses recent, rapid events and expands older, sparse events.

### Practical Ranges

| Time Delta | Gap (Standard density) | Visual Effect |
|---|---|---|
| 0–2s | 4px | Events feel simultaneous |
| 2–30s | 6–8px | Rapid sequence |
| 30s–5min | 8–12px | Normal pacing |
| 5–30min | 12–16px | Distinct phases |
| 30min+ | 16–24px | New section feel |

---

## Cinematic Transitions

Timeline events animate into view using the Cinematic Motion System. The timeline's motion profile is intentionally understated — events should feel like they are appearing in a film, not popping in like notifications.

### Transition Specs

| Transition | Duration | Easing | Choreography |
|---|---|---|---|
| **New event appears** | 300ms | ease-out | Sequential (bottom-up) |
| **Cluster expands** | 250ms | ease-out | Orchestrated |
| **Cluster collapses** | 200ms | ease-in | Parallel |
| **Group header opens** | 300ms | ease-out | Sequential |
| **Navigate to event** | 400ms | ease-in-out | Silent (scroll only) |
| **Density change** | 350ms | ease-in-out | Orchestrated |

### Transition Rules

1. **New events never push existing events.** When a new event arrives, it fades in at the bottom (or top, depending on sort order) and the timeline scrolls smoothly if the user is viewing the latest events.
2. **Transitions during active AI execution are faster.** During live AI work, new events appear at 200ms instead of 300ms to keep the timeline feeling responsive.
3. **No transitions during scroll.** If the user is actively scrolling the timeline, new events appear instantly without animation to avoid motion sickness.
4. **Density transitions are gentle.** When density changes, events smoothly expand or contract — they do not jump between sizes.

---

## Replay Navigation

The timeline supports replay navigation — the ability to step through events chronologically as if watching a recording of the session.

### Replay Controls

| Control | Action |
|---|---|
| **Play/Pause** | Auto-advance through events at configurable speed |
| **Step Forward** | Advance to next event |
| **Step Backward** | Return to previous event |
| **Speed** | 0.5×, 1×, 2×, 4× — controls auto-advance rate |
| **Jump To** | Click any event to jump directly to that point |

### Replay Behavior

During replay, the editor loads the file state as it was at the selected event. This uses the system's snapshot/deterministic-replay infrastructure (see `architecture/deterministic-replay.md`). The timeline highlights the current replay position, and surrounding events dim slightly to maintain focus.

---

## Anti-Patterns

### Developer Logs Stacked Vertically

Raw log output dumped into a scrollable panel — timestamps, log levels, and messages with no visual hierarchy. This is the most common anti-pattern for execution timelines. It forces the user to parse undifferentiated text to find what they need. Every event looks the same. Context is lost. The timeline becomes a chore, not a tool.

### Unreadable Hierarchy

Events grouped into nested, indented trees that require horizontal scrolling and mental stack tracking. Three levels of indentation with connector lines creates a visual maze. The timeline's grouping strategies (BySession, ByTime, ByCausality, ByAgent) are flat or at most two levels deep — never deeply nested.

### No Grouping

A flat, chronological list of hundreds of events with no visual breaks, no grouping headers, and no clustering. The user scrolls endlessly looking for a specific event. Temporal markers are absent, so there is no sense of when events occurred relative to each other. Grouping is mandatory — a timeline without grouping is just a log.

### Uniform Visual Treatment

Every event — user action, AI execution, system event — rendered with the same icon, color, and size. The user cannot scan the timeline to find AI actions or system events without reading every title. Category differentiation through icons, accent colors, and visual weight is essential for scanability.

---

## Service Interface

```typescript
interface IExecutionTimelineExperienceService {
  readonly _serviceBrand: undefined;

  // Current density mode
  readonly density: TimelineDensity;
  setDensity(mode: TimelineDensity): void;

  // Current grouping strategy
  readonly groupingStrategy: TimelineGroupingStrategy;
  setGroupingStrategy(strategy: TimelineGroupingStrategy): void;

  // Event stream
  readonly events: ReadonlyArray<TimelineEvent>;
  onDidAddEvent: Event<TimelineEvent>;

  // Replay controls
  readonly replayState: ReplayState;
  startReplay(options?: ReplayOptions): void;
  pauseReplay(): void;
  stepForward(): void;
  stepBackward(): void;
  jumpToEvent(eventId: string): void;

  // Filtering
  setFilter(filter: TimelineFilter): void;
  readonly currentFilter: TimelineFilter;

  // Observe density changes
  onDidChangeDensity: Event<TimelineDensity>;

  // Observe grouping changes
  onDidChangeGrouping: Event<TimelineGroupingStrategy>;
}

type TimelineDensity = 'minimal' | 'standard' | 'detailed' | 'compact';
type TimelineGroupingStrategy = 'by-session' | 'by-time' | 'by-causality' | 'by-agent';

interface TimelineEvent {
  id: string;
  category: TimelineEventCategory;
  timestamp: number;
  duration: number;         // milliseconds, 0 for instantaneous
  title: string;
  subtitle?: string;
  preview?: string;
  metadata?: Record<string, unknown>;
  chainId?: string;         // Links to causal chain
  relatedEvents?: string[]; // IDs of related events
  fileUri?: string;
  lineRange?: [number, number];
}

type TimelineEventCategory = 'user-action' | 'ai-execution' | 'process-state' | 'orchestration' | 'system';

interface ReplayState {
  isPlaying: boolean;
  currentPosition: number;  // index in events array
  speed: 0.5 | 1 | 2 | 4;
}

interface TimelineFilter {
  categories: TimelineEventCategory[];
  timeRange?: { start: number; end: number };
  fileUri?: string;
  agentName?: string;
  searchQuery?: string;
}
```

---

## Design Principles Summary

1. **The timeline tells a story.** Events are beats in a narrative, not rows in a database. The grouping, spacing, and visual treatment should help the user understand what happened and why.
2. **Professional and inspectable.** The timeline should feel like a professional audit tool — precise, detailed, and trustworthy — not like a noisy log viewer.
3. **Density is a tool, not a limitation.** The user should be able to zoom between overview and detail effortlessly, with smooth transitions that preserve spatial context.
4. **Causality is first-class.** Events are not isolated — they cause and are caused by other events. The ByCausality grouping and chain links make these relationships visible.
5. **Cinematic, not clinical.** Transitions, spacing, and visual rhythm make the timeline feel like a curated experience, not a raw data dump. The timeline is the IDE's "director's commentary" on the session.
