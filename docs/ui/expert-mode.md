# Expert Mode

## Overview

Expert Mode is the deliberate, intentional gateway to the deepest capabilities of the Real Vibecode IDE. Unlike features that are progressively revealed through experience and trust, Expert Mode capabilities represent a fundamentally different tier of system interaction — one that requires conscious opt-in and a demonstrated understanding of the IDE's architecture.

Expert Mode is not about showing "more features." It's about giving experienced users access to the system's internal machinery: execution graphs, replay timelines, autonomy tuning, state inspection, and orchestration depth controls. These capabilities are powerful but require context to use safely and productively.

The cardinal rule of Expert Mode is: **expert features must NEVER leak to beginner workflows**. A beginner user should never accidentally encounter an expert feature through normal navigation, keyboard shortcuts, or AI suggestions. Expert capabilities exist in a separate namespace that is only accessible through explicit, intentional activation.

---

## Eight Expert Capabilities

### 1. OrchestrationDepth

**What it exposes**: Deep controls over how the AI orchestrates multi-step execution plans. Includes: step parallelism configuration, dependency injection between steps, custom execution strategies, and orchestration priority tuning.

**Why it's expert**: Misconfiguring orchestration depth can cause execution plans to stall, deadlock, or produce unexpected results. Requires understanding of the execution graph model.

**Beginner equivalent**: AI auto-creates execution plans with default settings. No user configuration needed.

### 2. GraphVisibility

**What it exposes**: Full visualization of the execution graph — the internal data structure that tracks dependencies, states, and transitions between all AI operations. Includes: node inspection, edge weight analysis, graph search, and subgraph isolation.

**Why it's expert**: The execution graph is an internal representation that is not meaningful without understanding the IDE's execution model. Exposing it to beginners would create confusion without value.

**Beginner equivalent**: Simplified execution plan view showing steps as a linear list.

### 3. ReplayTooling

**What it exposes**: The complete replay engine toolkit — time-travel debugging of AI operations, execution history scrubbing, state snapshots, and replay branching (forking execution history at any point to explore alternative outcomes).

**Why it's expert**: Replay tooling requires understanding of state snapshots and temporal navigation. Using it incorrectly can create confusion about which state is "current."

**Beginner equivalent**: Simple undo/redo for AI operations.

### 4. SystemDiagnostics

**What it exposes**: Real-time system health monitoring — service status, DI container state, event bus traffic, memory pressure indicators, and performance profiling data for all adaptive workflow services.

**Why it's expert**: Diagnostic data is meaningful only to users who understand the IDE's service architecture. For beginners, it would appear as meaningless technical noise.

**Beginner equivalent**: Status bar showing "AI Active" / "AI Idle."

### 5. AutonomyTuning

**What it exposes**: Fine-grained sliders and configuration for the AI autonomy model. Includes: per-action trust thresholds, override penalty weights, de-escalation timing, and custom autonomy profiles (e.g., "Cautious" vs. "Aggressive" AI behavior).

**Why it's expert**: Misconfiguring autonomy tuning can make the AI either too passive (never acting) or too aggressive (acting without adequate oversight). Requires understanding of the trust model.

**Beginner equivalent**: Trust builds automatically through usage. No manual tuning.

### 6. PowerShortcuts

**What it exposes**: Advanced keyboard shortcuts for rapid navigation and manipulation: direct graph node jumping, execution step manipulation via keyboard, quick-toggle for any surface, and macro-style shortcut composition.

**Why it's expert**: Power shortcuts use chorded key combinations and assume memorization. Exposing them to beginners would clutter the command palette and create accidental triggers.

**Beginner equivalent**: Standard keyboard shortcuts (Ctrl+S, Ctrl+P, etc.)

### 7. StateInspection

**What it exposes**: Direct inspection of the IDE's internal state — the global store, service states, event queues, and the AI context engine's current understanding of the workspace. Includes: state diffing, state snapshots, and state export/import.

**Why it's expert**: Internal state is a developer-facing concept that is irrelevant to editing code. It's useful for debugging the IDE itself but not for using it.

**Beginner equivalent**: No equivalent. This capability has no beginner-facing surface.

### 8. ExecutionTimeline

**What it exposes**: A comprehensive timeline view of all AI operations — when they were initiated, how long they took, what they modified, and their approval chain. Includes: timeline filtering, operation grouping, and correlation analysis (finding related operations across time).

**Why it's expert**: The timeline is a meta-view of the IDE's operation history. It's valuable for understanding AI behavior patterns but overwhelming without context.

**Beginner equivalent**: Activity log in the AI panel showing recent actions.

---

## Expert Mode Activation

Expert mode is not available by default. It requires:

1. **Experience level**: Advanced or Power User (500+ interactions, trust ≥ 0.5)
2. **Explicit activation**: The user must activate Expert Mode through one of:
   - Command palette: "Enable Expert Mode"
   - Settings: Toggle "expertMode.enabled"
   - Keyboard shortcut: `Ctrl+Shift+Alt+E` / `Cmd+Shift+Alt+E`

3. **Confirmation dialog**: The first time Expert Mode is activated, the user sees a brief explanation of what it provides and must confirm: "Enable Expert Mode? This provides access to advanced system capabilities. You can disable it at any time."

### Activation State

```typescript
interface ExpertModeState {
  enabled: boolean;
  activatedAt: number;              // timestamp of first activation
  enabledCapabilities: Set<string>; // which of the 8 capabilities are active
  activationExperienceLevel: ExperienceLevel;
  lastUsed: Map<string, number>;    // capability → last use timestamp
}
```

---

## Capability Toggles

Expert mode capabilities are individually toggleable. A Power User might want GraphVisibility and AutonomyTuning but not SystemDiagnostics or StateInspection. Each capability can be enabled or disabled independently through the Expert Mode settings panel.

```
┌─────────────────────────────────────────────────────────┐
│  Expert Mode Settings                                   │
│                                                         │
│  ☑ Orchestration Depth    — Deep execution controls     │
│  ☑ Graph Visibility       — Execution graph viewing     │
│  ☐ Replay Tooling         — Time-travel debugging       │
│  ☐ System Diagnostics     — Service health monitoring   │
│  ☑ Autonomy Tuning        — AI trust/autonomy controls  │
│  ☐ Power Shortcuts        — Advanced keyboard shortcuts  │
│  ☐ State Inspection       — Internal state viewer       │
│  ☐ Execution Timeline     — AI operation history         │
│                                                         │
│  [Save] [Disable Expert Mode]                           │
└─────────────────────────────────────────────────────────┘
```

When a capability is disabled, all of its surfaces, commands, and keyboard shortcuts are completely removed from the UI. There is no "greyed out" state — disabled capabilities simply don't exist in the interface.

---

## Leakage Validation

Leakage validation is the process of ensuring that expert features never appear in beginner workflows. This is enforced through multiple mechanisms:

### Compile-Time Validation

The progressive disclosure system's maturity matrix (see `progressive-disclosure.md`) ensures that features with `Internal` maturity are always capped at `Expert` visibility, regardless of context, trust score, or usage patterns. There is no code path that can promote an Internal feature to a non-expert visibility state.

### Runtime Validation

The `Phase14ValidationService` includes a dedicated "Expert Leakage" test group that verifies:

1. **No expert commands in beginner command palette**: All expert-mode commands are filtered from the command palette when Expert Mode is disabled.
2. **No expert panels in beginner layout**: No layout profile for Beginner/Intermediate users includes expert surfaces.
3. **No expert features in AI suggestions**: The AI never suggests expert features to users below Advanced experience level.
4. **No expert shortcuts in beginner keybindings**: Expert keyboard shortcuts are not registered when Expert Mode is disabled.

### Continuous Validation

```typescript
function validateNoExpertLeakage(user: UserProfile): ValidationResult {
  const errors: string[] = [];

  // Check command palette
  const visibleCommands = getVisibleCommands(user);
  const expertCommands = visibleCommands.filter(c => c.maturity === FeatureMaturity.Internal);
  if (expertCommands.length > 0 && user.experienceLevel < ExperienceLevel.Advanced) {
    errors.push(`Expert commands visible to ${user.experienceLevel} user: ${expertCommands.map(c => c.id)}`);
  }

  // Check layout
  const layout = getCurrentLayout(user);
  const expertSurfaces = layout.surfaces.filter(s => s.maturity === FeatureMaturity.Internal);
  if (expertSurfaces.length > 0 && !user.expertModeEnabled) {
    errors.push(`Expert surfaces visible without Expert Mode: ${expertSurfaces.map(s => s.id)}`);
  }

  // Check AI suggestions
  const suggestions = getActiveSuggestions(user);
  const expertSuggestions = suggestions.filter(s => s.featureMaturity === FeatureMaturity.Internal);
  if (expertSuggestions.length > 0 && user.experienceLevel < ExperienceLevel.Advanced) {
    errors.push(`AI suggesting expert features to ${user.experienceLevel} user`);
  }

  return { passed: errors.length === 0, errors };
}
```

---

## Before / After: Beginner View vs Expert View

### Beginner View

```
┌───────────────────────────────────────────────────────────┐
│  [File] [Edit] [View] [Run]                               │
│ ┌────────┐ ┌──────────────────────────────────────────┐   │
│ │ Explorer│ │                                          │   │
│ │        │ │           Editor (dominant)               │   │
│ │        │ │                                          │   │
│ │        │ │                                          │   │
│ └────────┘ └──────────────────────────────────────────┘   │
│ ┌────────────────────────────────────────────────────────┐ │
│ │ 💡 AI: "I can explain this function"   [Ask] [Skip]  │ │
│ └────────────────────────────────────────────────────────┘ │
│  Status: AI Active                                        │
└───────────────────────────────────────────────────────────┘
```

### Expert View (with GraphVisibility + AutonomyTuning enabled)

```
┌───────────────────────────────────────────────────────────┐
│  [File] [Edit] [View] [Run] [Expert▼]                     │
│ ┌────────┐ ┌────────────────────┐ ┌──────────────────┐   │
│ │ Explorer│ │                    │ │ Execution Graph  │   │
│ │        │ │   Editor           │ │  ●──→●──→●      │   │
│ │        │ │                    │ │  │   └──→●      │   │
│ │        │ │                    │ │  ●──→●          │   │
│ └────────┘ └────────────────────┘ └──────────────────┘   │
│ ┌────────────────────────────────────────────────────────┐ │
│ │ Autonomy: Trusted (0.76)  [Tune] │ AI Panel │ Timeline│ │
│ └────────────────────────────────────────────────────────┘ │
│  Status: AI Trusted | Graph: 5 nodes | Trust: 0.76       │
└───────────────────────────────────────────────────────────┘
```

---

## Expert Mode Configuration

Expert mode settings are stored in the user's global state and persist across sessions:

```typescript
interface ExpertModeConfiguration {
  enabled: boolean;
  capabilities: {
    orchestrationDepth: boolean;
    graphVisibility: boolean;
    replayTooling: boolean;
    systemDiagnostics: boolean;
    autonomyTuning: boolean;
    powerShortcuts: boolean;
    stateInspection: boolean;
    executionTimeline: boolean;
  };
  preferences: {
    defaultGraphDepth: number;          // default graph expansion depth
    timelineRetention: number;          // days of timeline data to keep
    autonomyProfile: 'cautious' | 'balanced' | 'aggressive';
    diagnosticsRefreshRate: number;     // milliseconds between diagnostic updates
  };
}
```

---

## Implementation Reference

- **Service**: `ExpertModeService` (singleton #38)
- **Registration**: `registerSingleton(IExpertModeService, ExpertModeService, InstantiationType.Eager)`
- **Interface**: `IExpertModeService` in `vs/workbench/services/adaptiveWorkflow/common/adaptiveWorkflow.ts`
- **Key Methods**: `isEnabled()`, `enableExpertMode()`, `disableExpertMode()`, `isCapabilityEnabled()`, `toggleCapability()`, `validateNoLeakage()`, `getConfiguration()`
