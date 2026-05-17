# First-Run Experience

## Overview

The First-Run Experience (also called onboarding or FRX) is the user's very first interaction with the Real Vibecode IDE. It must accomplish something seemingly contradictory: introduce a deeply powerful, AI-native development environment while making the user feel calm, confident, and never overwhelmed. The onboarding system achieves this through staged capability exposure — revealing features one layer at a time, each layer building naturally on the previous one.

The cardinal rule of onboarding is: **NEVER dump all capabilities at once**. The user should never see more than 2–3 new concepts at any given stage. Each stage must feel complete in itself, not like an incomplete teaser for something better. The experience should feel like a guided journey, not a feature parade.

---

## Six Onboarding Stages

The onboarding flow is divided into six progressive stages, each introducing a cohesive set of capabilities. The stages are sequential — later stages are only available after completing (or skipping) earlier ones.

### Stage 1: Welcome

**Purpose**: Orient the user, set the tone, establish trust.

**What the user sees**: A clean, premium welcome screen with the IDE's identity, a brief tagline ("Code with intelligence. Ship with confidence."), and a single "Get Started" button. No panels, no sidebars, no toolbar — just the welcome message.

**Introduced concepts**:
- The IDE exists and is ready
- The experience will be guided (not overwhelming)
- The user is in control (they click "Get Started" when ready)

**Completion criteria**: User clicks "Get Started"

**Duration**: ~10 seconds

### Stage 2: EditorBasics

**Purpose**: Establish the editor as the center of the universe.

**What the user sees**: A full-screen editor with a sample file. The explorer is visible but minimal. A single coaching card introduces: "This is your editor. Everything starts here." Subsequent cards (one at a time) introduce: saving, basic navigation, and the command palette.

**Introduced concepts**:
- The editor is the primary surface (this never changes)
- File management (open, save, navigate)
- The command palette as a discovery tool

**Completion criteria**: User completes 3 basic actions (open a file, make an edit, save)

**Duration**: ~3–5 minutes

### Stage 3: AIIntroduction

**Purpose**: Introduce the AI collaborator as a trusted assistant.

**What the user sees**: A gentle introduction card: "Meet your AI assistant." The AI panel slides in from the right (animated, not sudden). The AI demonstrates a single capability — suggesting a code improvement to the sample file. The user is invited to accept or dismiss the suggestion, establishing the consent model.

**Introduced concepts**:
- The AI exists and can help
- The AI asks before acting (FullConsent model)
- Accepting and dismissing suggestions
- The AI panel as a conversation surface

**Completion criteria**: User interacts with at least one AI suggestion (accept or dismiss)

**Duration**: ~2–3 minutes

### Stage 4: WorkflowDiscovery

**Purpose**: Reveal the project workflow — how code goes from idea to execution.

**What the user sees**: A guided tour of the execution workflow. Starting from a code change, the system shows (one step at a time): how the AI creates an execution plan, how the plan is visualized in the plan panel, and how execution proceeds step by step. Each step is shown as a brief animation with a coaching card.

**Introduced concepts**:
- Execution plans (AI-generated task breakdowns)
- The plan panel (visual representation of plans)
- Step-by-step execution (how the AI carries out tasks)
- Approval points in the execution workflow

**Completion criteria**: User observes a complete execution plan (from creation to completion)

**Duration**: ~5–7 minutes

### Stage 5: AdvancedFeatures

**Purpose**: Introduce deeper capabilities for users who want more.

**What the user sees**: A "Discover More" panel that presents 3–4 advanced features as optional explorations. Each feature has a brief description and a "Try it" button. Features are presented one at a time, with the user choosing which to explore. No feature is required.

**Introduced concepts**:
- Context-adaptive layout (how the IDE reshapes based on activity)
- Terminal intelligence (AI-enhanced terminal)
- Integrated debugging (AI-assisted debugging)
- Keyboard shortcuts for power users

**Completion criteria**: User explores at least 1 advanced feature OR skips the stage

**Duration**: ~3–5 minutes (optional)

### Stage 6: ExpertCapabilities

**Purpose**: Acknowledge that even more depth exists, but it will be revealed naturally.

**What the user sees**: A simple message: "You've seen the essentials. As you use the IDE, more capabilities will appear based on what you need and how you work. No settings to configure — the IDE adapts to you." This is the only time Expert mode is mentioned during onboarding.

**Introduced concepts**:
- The system adapts progressively
- More features will surface naturally
- Expert mode exists but is earned, not given

**Completion criteria**: User acknowledges the message

**Duration**: ~30 seconds

---

## Onboarding Steps with Interaction Requirements

Each stage consists of discrete steps that the user must complete to advance. Steps are designed to be genuinely useful — they teach real capabilities, not just dismiss modals.

| Stage | Step | Interaction Required | Required? |
|---|---|---|---|
| Welcome | Click "Get Started" | Single click | Yes |
| EditorBasics | Open a file | File → Open or click in explorer | Yes |
| EditorBasics | Make an edit | Type in the editor | Yes |
| EditorBasics | Save the file | Ctrl+S / Cmd+S | Yes |
| EditorBasics | Open command palette | Ctrl+Shift+P / Cmd+Shift+P | No (skippable) |
| AIIntroduction | View AI suggestion | Read the suggestion card | Yes |
| AIIntroduction | Accept or dismiss | Click Accept or Dismiss | Yes |
| AIIntroduction | Ask AI a question | Type in AI chat | No (skippable) |
| WorkflowDiscovery | View execution plan | Observe plan creation | Yes |
| WorkflowDiscovery | Observe step execution | Watch a step execute | Yes |
| WorkflowDiscovery | Approve an execution step | Click Approve | No (skippable) |
| AdvancedFeatures | Explore one feature | Click "Try it" on any feature | No (entire stage skippable) |
| ExpertCapabilities | Acknowledge message | Click "Got it" | Yes |

---

## Staged Capability Exposure

During onboarding, the progressive disclosure system operates in a special "onboarding mode" that overrides the normal visibility calculations. This ensures that the user only sees what the current onboarding stage introduces.

### Exposure Rules

| Onboarding Stage | Visible Features | Hidden Features |
|---|---|---|
| Welcome | None (just the welcome screen) | Everything |
| EditorBasics | Editor, Explorer, Command Palette | AI Panel, Terminal, Debug, Graph, all Advanced features |
| AIIntroduction | Editor, Explorer, AI Panel | Terminal, Debug, Graph, Execution Plan, all Advanced features |
| WorkflowDiscovery | Editor, Explorer, AI Panel, Execution Plan | Debug, Graph, Terminal, all Advanced features |
| AdvancedFeatures | All Standard + selected Advanced features | Power features, Expert features, Internal features |
| ExpertCapabilities | Same as AdvancedFeatures | Power, Expert, Internal (will be revealed through normal progression) |

After onboarding completes, the system transitions to normal progressive disclosure operation. The user's experience level is set to Beginner, and feature visibility follows the standard calculation.

---

## Completion Criteria Per Step

Each onboarding step has specific completion criteria that must be met before advancing. These are tracked by the `OnboardingExperienceService`:

```typescript
interface OnboardingStep {
  id: string;
  stage: OnboardingStage;
  title: string;
  description: string;
  required: boolean;
  completionCriteria: {
    eventType: string;        // e.g., 'file.open', 'ai.suggestion.accept'
    minCount: number;         // minimum occurrences to complete
    timeLimit?: number;       // optional time limit in ms
  };
  coachingCard: CoachingCard;
  transitionAnimation: AnimationSpec;
}
```

### Completion Tracking

The service monitors user actions and matches them against completion criteria. When a step's criteria are met, a subtle "✓" animation confirms completion, and the next step's coaching card appears after a 1-second pause (preventing rapid-fire step completion that would feel overwhelming).

---

## Optional vs Required Steps

The onboarding system distinguishes between required and optional steps:

- **Required steps** must be completed to advance to the next stage. They teach essential capabilities that the user needs to use the IDE effectively. The "Skip" button is present but requires a confirmation ("Skip this essential step? You can find it later in the Help menu.").
- **Optional steps** can be skipped without confirmation. A "Skip for now" button is prominently available. Skipped steps are tracked and can be revisited from the Help menu at any time.

The ratio of required to optional steps is deliberately kept low (approximately 7 required to 6 optional) to avoid making onboarding feel like a mandatory tutorial. The user should always feel like they can start coding at any point.

---

## Progress Tracking

Onboarding progress is tracked and visualized with a subtle progress indicator in the status bar. The indicator shows:

- **Current stage name**: "Editor Basics" / "AI Introduction" / etc.
- **Step progress**: "Step 2 of 4" within the current stage
- **Overall progress**: A minimal dot indicator (● ● ○ ○ ○ ○) showing completed stages

### Progress Persistence

Onboarding progress is persisted across sessions. If the user closes the IDE during Stage 3, they resume at Stage 3 on the next launch. There is no "Start Over" option during onboarding — the user can only move forward or skip.

### Progress Completion

When all required stages are complete, the progress indicator transitions to: "Onboarding complete ✓" and then fades away after 5 seconds. The user is never prompted to revisit onboarding, though they can access a "Replay Onboarding" option from the Help menu.

---

## NEVER Dump All Capabilities at Once

This principle is so important that it deserves explicit documentation. The following patterns are **strictly forbidden** during onboarding:

### Forbidden Patterns

1. **Feature list pages**: Never show a page that lists all available features. Each feature should be introduced in context, not as an item in a catalog.
2. **Settings tours**: Never walk the user through the settings panel during onboarding. Settings are for later, when the user knows what they want to customize.
3. **Keyboard shortcut sheets**: Never present a comprehensive keyboard shortcut reference during onboarding. Shortcuts should be introduced contextually as the user encounters features.
4. **Multi-panel showcases**: Never show all panels simultaneously to demonstrate "what's available." Each panel should be revealed when its context arises naturally.
5. **AI capability demos**: Never demonstrate all AI capabilities in sequence. The AI should demonstrate one capability at a time, in context, with the user's active participation.

### Required Patterns

1. **One concept at a time**: Each coaching card introduces exactly one concept. No card contains more than 3 sentences.
2. **Learn by doing**: Every required step requires the user to *perform an action*, not just read. Passive reading doesn't build muscle memory.
3. **Immediate value**: Every introduced capability should provide immediate, visible value. No "you'll need this later" introductions.
4. **Graceful exit**: The user can start coding at any point. Onboarding never blocks the editor. Coaching cards are dismissible and appear in a sidebar, not as modal dialogs.

---

## Before / After Comparison

### Before: Overwhelming First Run

```
┌───────────────────────────────────────────────────────────┐
│  Welcome to the IDE! Here's everything you can do:        │
│                                                           │
│  □ AI Code Completion  □ AI Auto-Fix  □ AI Refactoring    │
│  □ Execution Plans    □ Graph View   □ Replay Engine      │
│  □ Terminal Intel     □ Debug Assist □ Context Engine     │
│  □ Process Orchestr.  □ Agent System □ Decision Engine    │
│  □ Auto-Execute       □ Trust System  □ Flow Protection   │
│                                                           │
│  42 keyboard shortcuts to learn! See the cheat sheet →    │
│                                                           │
│  [Start Using IDE (I'm overwhelmed already)]              │
│                                                           │
│  😰 User: "I just wanted to write some code..."           │
└───────────────────────────────────────────────────────────┘
```

### After: Guided, Staged Introduction

```
  STAGE 1: Welcome                     STAGE 3: AI Introduction
  ─────────────────                    ────────────────────────
  ┌───────────────────────────┐        ┌────────────────────────┐
  │                           │        │  ┌──────────────────┐  │
  │                           │        │  │ 💡 AI Suggestion │  │
  │    Welcome to             │        │  │ "Add null check  │  │
  │    your new IDE.          │        │  │  for plan.steps" │  │
  │                           │        │  │ [Accept] [No]    │  │
  │    Code with intelligence.│        │  └──────────────────┘  │
  │    Ship with confidence.  │        │                        │
  │                           │        │  Editor (with sample   │
  │                           │        │  code visible)         │
  │    [Get Started →]        │        │                        │
  │                           │        │                        │
  └───────────────────────────┘        └────────────────────────┘
  😊 "Clean. Simple. I'm ready."       😊 "One thing at a time.
                                            I understand this."
```

---

## Implementation Reference

- **Service**: `OnboardingExperienceService` (singleton #37)
- **Registration**: `registerSingleton(IOnboardingExperienceService, OnboardingExperienceService, InstantiationType.Eager)`
- **Interface**: `IOnboardingExperienceService` in `vs/workbench/services/adaptiveWorkflow/common/adaptiveWorkflow.ts`
- **Key Methods**: `getCurrentStage()`, `completeStep()`, `skipStep()`, `getProgress()`, `isOnboardingComplete()`, `replayOnboarding()`
