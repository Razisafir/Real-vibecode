# Work Rhythm Learning Engine

## Phase 16 — Unified Interaction Intelligence & Human Workflow Engine

### Overview

The Work Rhythm Learning Engine (`IWorkRhythmService`) observes, models, and adapts to the unique work patterns of each individual developer. No two developers work the same way — one might write code in intense 90-minute bursts, another might prefer steady 30-minute cycles, and a third might be most productive in the early morning hours. The engine learns these patterns over time and adjusts the IDE's interaction pacing to match.

The core principle is: **the system learns how THIS specific user works.** Not an average user, not a persona, not a demographic — this specific developer, with their specific rhythms, preferences, and patterns. The IDE becomes a personalized instrument, calibrated to the individual like a well-fitted tool.

---

### Rhythm Types

The engine identifies seven distinct rhythm types, each representing a fundamentally different mode of developer activity:

| Rhythm Type | Signature Pattern | Detection Signals |
|-------------|-------------------|-------------------|
| **Coding** | Sustained high-velocity text entry in implementation files. Long sequences of insert-mode edits with few pauses. | High edit velocity, low navigation rate, files are implementation (.ts, .py, .rs) not config or test |
| **Reviewing** | Reading-heavy activity with occasional annotations. Frequent scrolling, low edit rate, focus on diff views and comments. | Low edit velocity, high scroll activity, diff view usage, comment creation, PR review panels open |
| **Planning** | Mixed activity — switching between notes, documentation, diagrams, and code. Creating TODOs, writing outlines, exploring APIs. | High context-switch count, note-taking activity, search queries, TODO creation, documentation browsing |
| **Debugging** | Cyclic activity — editing, running, observing, editing again. Breakpoints, console output, error inspection. | Breakpoint usage, run/debug actions, console monitoring, error-focused navigation, rapid edit-run cycles |
| **Navigating** | File and symbol exploration without significant editing. Jumping between definitions, searching for references, building mental models. | High symbol navigation, low edit velocity, "go to definition" usage, reference searches, file tree browsing |
| **Testing** | Writing and running tests. Checking assertions, reviewing coverage, fixing test failures. | Test file activity, test runner usage, assertion editing, coverage panel usage, test-result navigation |
| **Refactoring** | Structured multi-file editing. Rename operations, extraction, reorganization. Systematic changes across related files. | Rename/refactor command usage, multi-file edit patterns, structural changes (extracting functions, moving code), consistent edit patterns across files |

The engine doesn't require exclusive classification — a developer can be in a mixed state (e.g., Coding with bursts of Debugging). The primary rhythm type determines the dominant interaction style, while secondary types influence supplementary behaviors.

---

### Cadence Levels

Within each rhythm type, the engine tracks cadence — the pace at which the developer is operating:

| Cadence | Description | Indicators |
|---------|-------------|------------|
| **Slow** | Deliberate, methodical work. The developer is thinking carefully about each step. | Long pauses between edits (> 15s average), high scroll-to-edit ratio, frequent documentation lookups |
| **Moderate** | Steady, sustainable pace. The developer is making consistent progress without rushing. | Regular edit intervals (5–15s), balanced navigation and editing, moderate search activity |
| **Fast** | Accelerated work. The developer is in a productive groove, moving quickly through tasks. | Short edit intervals (< 5s), high edit velocity, minimal navigation breaks, focused file scope |
| **Intense** | Maximum output. The developer is deeply focused and producing at their peak rate. | Very high edit velocity, almost no pauses, single-file focus, minimal context switches |

Cadence affects interaction pacing: at Slow cadence, the IDE can offer more suggestions and context without disrupting flow; at Intense cadence, the IDE should become nearly invisible, deferring all non-essential interactions.

---

### Rhythm Patterns

Over time, the engine builds a model of the developer's typical rhythm patterns:

```typescript
interface RhythmPattern {
  /** The primary rhythm type for this pattern */
  rhythmType: RhythmType;

  /** The typical cadence when in this rhythm */
  typicalCadence: CadenceLevel;

  /** How long this rhythm typically lasts before transitioning */
  typicalDuration: number; // minutes

  /** The time of day this rhythm typically starts */
  typicalStartTime: number; // hour (0-23)

  /** How productive the developer typically is in this rhythm (0.0 - 1.0) */
  productivityScore: number;

  /** Common transitions from this rhythm to others */
  transitions: {
    toType: RhythmType;
    probability: number;
    typicalTrigger: string;
  }[];

  /** How many sessions before this pattern is considered reliable */
  observationCount: number;

  /** Confidence in this pattern (0.0 - 1.0) */
  confidence: number;
}
```

For example, the engine might learn that a specific developer:
- Starts Coding at 9:30 AM at Moderate cadence, lasting about 60 minutes
- Transitions to Debugging after Coding 40% of the time, typically triggered by a test failure
- Does their best Planning work between 2:00–3:00 PM with a productivity score of 0.85
- Rarely codes productively after 5:00 PM (productivity score drops to 0.25)

These patterns become more reliable with each session. New patterns require at least 5 observations before they influence IDE behavior; high-confidence patterns (20+ observations) have the strongest influence.

---

### Productive Windows

The engine identifies productive windows — time periods when the developer is historically most effective:

```typescript
interface ProductiveWindow {
  /** Start of the productive window (hour, 0-23) */
  startHour: number;

  /** End of the productive window (hour, 0-23) */
  endHour: number;

  /** Average productivity score during this window */
  averageProductivity: number;

  /** Days of the week this window applies to */
  dayOfWeek: number[]; // 0=Sunday, 6=Saturday

  /** The rhythm type most commonly active during this window */
  dominantRhythm: RhythmType;

  /** How many data points support this window */
  sampleSize: number;
}
```

Productive windows are used by the Interruption Intelligence System to apply stricter interruption suppression during the developer's most valuable working hours. They're also used by the Cognitive Recovery System to calibrate fatigue thresholds — if the developer is in a known productive window, a slight velocity decline might be normal; if they're outside their productive window, the same decline might signal fatigue.

---

### Friction Level Detection

Friction is the resistance a developer experiences in their workflow — moments where the IDE, the codebase, or the task itself creates obstacles. The engine detects friction through several signals:

- **High search-to-edit ratio**: The developer is searching extensively but editing little — suggesting they can't find what they need or don't understand the codebase structure.
- **Repeated navigation**: Visiting the same files or symbols multiple times — suggesting poor discoverability or missing mental model.
- **Long idle-then-burst patterns**: Long pauses followed by rapid edits — suggesting the developer is figuring things out before acting (the pause is friction, not rest).
- **Tool-switching**: Frequently switching between the IDE and external tools (browser, terminal, documentation) — suggesting the IDE doesn't provide enough context internally.

When friction is detected, the engine can:
- Proactively surface relevant documentation
- Suggest code navigation shortcuts
- Offer to generate scaffolding or boilerplate
- Simplify the current view to reduce visual noise

---

### Interaction Pacing Adaptation

The most powerful application of rhythm learning is interaction pacing — adjusting the timing, frequency, and style of IDE interactions to match the developer's natural rhythm:

**Coding at Fast cadence**: The IDE becomes invisible. Auto-completion is instant and aggressive. AI suggestions are short and inline (not panel-based). Notifications are fully suppressed. The only interactions are the ones the developer explicitly requests.

**Reviewing at Slow cadence**: The IDE is informative. Inline documentation is shown by default. AI can offer deeper analysis in side panels. Contextual information (recent changes, author info, related PRs) is surfaced proactively.

**Debugging at Moderate cadence**: The IDE is supportive. Watch expressions auto-populate. Stack traces are linked to source. The AI assistant monitors for common debugging patterns and offers targeted suggestions ("This null check might be the issue — similar bugs were fixed in commit abc123").

**Planning at Moderate cadence**: The IDE is generative. TODO templates, API documentation, and architectural diagrams are easily accessible. The AI assistant can help generate outlines, explore design options, and create implementation plans.

The key insight is that **interaction pacing is not about showing more or less — it's about showing the right things at the right speed for the current rhythm.** A developer in a fast coding rhythm doesn't want fewer interactions — they want interactions that match their speed (instant, inline, minimal). A developer in a slow reviewing rhythm wants different interactions (deep, contextual, explorable).

---

### Learning Curve

The engine's learning progresses through three phases:

1. **Observation** (sessions 1–5): The engine collects data but doesn't alter behavior. It observes rhythm types, cadence levels, and temporal patterns. All interactions use default pacing.

2. **Calibration** (sessions 5–20): The engine begins tentatively adjusting interaction pacing based on observed patterns. Changes are small and reversible. The developer may not notice the adaptation, but it's happening.

3. **Personalization** (sessions 20+): The engine has reliable patterns and confidently adapts the IDE experience. Productive windows are well-established, rhythm transitions are predictable, and interaction pacing feels natural — the IDE has become a personalized instrument.

The engine never stops learning. New patterns can emerge (a developer changes teams, adopts a new technology, or shifts their schedule), and existing patterns can decay (the engine weighs recent observations more heavily than old ones). The system is always adapting to the current version of the developer, not the version from six months ago.

---

### Anti-Patterns

- **One-Size-Fits-All Pacing**: Applying the same interaction timing and frequency to all developers regardless of their personal rhythm. This ignores the fundamental truth that every developer works differently.
- **Ignoring User Rhythm**: Treating every moment as equivalent — no awareness that morning coding is different from afternoon debugging, or that this developer does their best work in 45-minute bursts.
- **Not Adapting Interaction Speed**: Offering suggestions, notifications, and assistance at a fixed cadence regardless of the developer's current pace. Fast coders need fast interactions; slow thinkers need patient ones.
- **Premature Personalization**: Adjusting behavior based on too few observations. Two sessions of morning coding don't make a pattern — the system must be patient enough to gather sufficient data.
- **Static Patterns**: Assuming that a developer's rhythm never changes. People evolve — their schedule shifts, their skills grow, their projects change. The learning engine must be as adaptive as the developer it serves.

---

### Core Principle

> **The system learns how THIS specific user works — their rhythms, their peaks, their patterns — and becomes an instrument calibrated to the individual.**

Work rhythm learning transforms the IDE from a generic tool into a personalized workspace that understands not just what you're doing, but how you do it. It's the difference between a stock keyboard and one with custom keycaps, custom actuation force, and custom layout — the same fundamental tool, but shaped perfectly for its owner.
