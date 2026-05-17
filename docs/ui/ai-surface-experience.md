# AI Surface Experience

> **Phase 15 — Production Surface Rebuild**
> Service: `IAISurfaceExperienceService`

## Overview

The AI is woven into the IDE's fabric — it is not a floating chatbot, a side panel assistant, or a separate application living inside the editor. The `IAISurfaceExperienceService` governs how AI surfaces appear, behave, and visually defer to the user's work. The AI must feel embedded into the tooling, appearing contextually and receding when idle. It must never give the impression of "chatbot energy" — no oversized branding, no visual screaming, no sense that the interface belongs to the AI rather than the developer.

The fundamental rule is simple and absolute: **AI must visually defer to user work.** The editor is the sovereign surface. AI surfaces exist to serve the editing experience, not to commandeer it.

---

## Surface Modes

AI content surfaces in four distinct modes, each suited to a different interaction pattern. The mode is selected automatically based on context, or can be pinned by the user.

### Embedded

AI content appears inline within the editor surface itself — directly in the code, in the gutter, or in the minimap region. There is no separate panel; the AI is part of the editing fabric.

| Property | Value |
|---|---|
| **Location** | Inline within editor content |
| **Width** | Matches editor content width |
| **Background** | Editor surface + 2% luminance tint |
| **Border** | None — content flows naturally |
| **Animation** | Fade-in 200ms, no slide |
| **Close action** | Escape or click away |
| **Use cases** | Inline code suggestions, hover explanations, error annotations |

**Design rationale:** Embedded mode is the most deferential. The AI appears exactly where the user is looking, within the surface they already trust. No panel to manage, no focus to switch.

### Inline

AI content appears in a compact strip below the current line or above the next line, pushing editor content down temporarily. It is more substantial than Embedded but still lives within the editor flow.

| Property | Value |
|---|---|
| **Location** | Between editor lines |
| **Width** | Matches editor content width (max 80ch) |
| **Height** | Auto, 1–6 lines |
| **Background** | Editor surface + 3% luminance tint |
| **Border** | 1px at 6% opacity top and bottom |
| **Animation** | Expand from 0 height, 300ms ease-out |
| **Close action** | Escape, accept, or dismiss button |
| **Use cases** | Code completions, refactor previews, quick explanations |

**Design rationale:** Inline mode provides enough space for meaningful content without breaking the editing flow. It is the right mode for AI content that requires a few lines of explanation or a code block preview.

### Compact

AI content appears in a compact card anchored to a specific UI element — a status bar indicator, a gutter icon, or a sidebar section header. The card is small, focused, and dismissible.

| Property | Value |
|---|---|
| **Location** | Anchored to trigger element |
| **Width** | 240–360px |
| **Height** | Auto, 2–8 lines |
| **Background** | Overlay surface material |
| **Border** | 1px at 10% opacity, 4px radius |
| **Shadow** | Overlay elevation shadow |
| **Animation** | Scale from 0.95 + fade, 200ms |
| **Close action** | Click outside, Escape, dismiss button |
| **Use cases** | Quick info, parameter hints, diagnostics, mini-explanations |

**Design rationale:** Compact mode is for lightweight, reference-style AI content. It should feel like a rich tooltip, not a panel. The user reads it, absorbs the information, and it goes away.

### Panel

AI content appears in a dedicated panel — either in the SecondarySidebar or in a split within the BottomPanel. This is the most substantial AI surface, reserved for complex interactions.

| Property | Value |
|---|---|
| **Location** | SecondarySidebar (default) or BottomPanel |
| **Max Width** | **30% of viewport** (hard cap) |
| **Min Width** | 240px |
| **Background** | Raised surface material |
| **Border** | 1px at 8% opacity left edge (if in sidebar) |
| **Animation** | Slide + fade, 300ms Orchestrated |
| **Close action** | Panel toggle, Escape from panel |
| **Use cases** | Multi-turn conversations, agent orchestration, execution timeline |

**Design rationale:** Panel mode is the "full" AI experience, but it is deliberately constrained. The 30% max width rule ensures the editor always retains at least 70% of the viewport — even when the AI panel is fully open. This is a non-negotiable constraint.

---

## Reasoning Formats

When the AI needs to communicate its reasoning, analysis, or decision process, it uses one of five structured formats. These formats standardize how complex AI content is presented, ensuring consistency and scanability.

### InlineSummary

A one-line summary embedded directly in the relevant context. No expandable sections, no cards — just a single, clear sentence.

```
┌─ editor line 42 ──────────────────────────────────────┐
│  const result = await processData(input);              │
│  → AI: Returns a Promise<DataResult> with validated    │
│    fields based on input schema                        │
└───────────────────────────────────────────────────────┘
```

- **Max width:** 80 characters
- **Max lines:** 2
- **Format:** Plain text, no markdown
- **When to use:** Quick explanations, type hints, one-liner reasoning

### ExpandableCard

A compact card that shows a summary by default and expands to reveal detailed reasoning on click.

```
┌─ collapsed ──────────────────────────┐
│ ◆ AI suggests extracting this logic  │
│   into a separate helper function    │
│                              ▼ more ─│
└──────────────────────────────────────┘

┌─ expanded ───────────────────────────────────────────┐
│ ◆ AI suggests extracting this logic                  │
│   into a separate helper function                    │
│                                                      │
│   Reasoning:                                         │
│   • This block is 47 lines, exceeding the 30-line    │
│     guideline for maintainability                    │
│   • The logic is self-contained with no external     │
│     dependencies beyond the parameters               │
│   • Two other files import similar patterns that     │
│     could share this helper                          │
│                                                      │
│   [Apply] [Modify] [Dismiss]                         │
└──────────────────────────────────────────────────────┘
```

- **Collapsed height:** 2–3 lines
- **Expanded height:** Auto, max 12 lines
- **Animation:** Height expand 250ms ease-out
- **When to use:** Suggestions with rationale, refactor explanations, multi-step reasoning

### CompactOrchestration

A minimal visualization showing which AI agents or processes are involved in a task. No detailed output — just status and relationships.

```
┌─ orchestration ──────────────────────┐
│ ● Analyzer  → ● Planner  → ○ Coder   │
│   complete    complete     pending    │
│                                      │
│   2/3 steps done · ~8s remaining     │
└──────────────────────────────────────┘
```

- **Width:** Fits within panel sidebar or inline strip
- **Max nodes:** 6 (more are collapsed into "...")
- **When to use:** Multi-agent tasks, pipeline visualization, parallel execution

### ExecutionCard

A detailed card showing a single AI execution step — what was done, what changed, and what the outcome was.

```
┌─ execution ──────────────────────────────────────┐
│ Step 3: Modify auth middleware                    │
│ ─────────────────────────────────────            │
│ Changed: src/middleware/auth.ts                   │
│   +8 lines, -3 lines                             │
│                                                  │
│ Added rate limiting to the token validation       │
│ endpoint to prevent brute force attacks.          │
│                                                  │
│ ✓ Tests pass  ⚠ 1 warning                       │
│                                                  │
│ [View Diff] [Undo] [Continue]                    │
└──────────────────────────────────────────────────┘
```

- **Width:** Panel width or compact card width
- **Height:** Auto, 4–10 lines
- **When to use:** Step-by-step AI actions, file mutation results, execution log entries

### TooltipHover

The lightest reasoning format — a rich tooltip that appears on hover over an AI indicator. No click required, no persistent surface.

```
┌─ hover tooltip ────────────────────┐
│ AI generated this function based   │
│ on the interface defined in        │
│ types/user.ts. Confidence: 92%     │
└────────────────────────────────────┘
```

- **Max width:** 280px
- **Max lines:** 4
- **Show delay:** 300ms hover
- **Hide delay:** 100ms mouse-out
- **When to use:** Quick context on AI-generated content, confidence indicators, source attribution

---

## Indicator Styles

AI presence in the interface is signaled through indicators — small visual markers that communicate "AI is active here" without dominating the visual field. Indicators follow a hierarchy of visual assertiveness.

| Style | Visual | Assertiveness | When Used |
|---|---|---|---|
| **None** | No visible indicator | Zero | AI is completely idle, no recent activity |
| **StatusBarDot** | Small 6px dot in status bar, themed accent at 60% | Minimal | AI processing in background, no direct output yet |
| **InlineBadge** | 16×16 icon inline with content, themed accent at 40% | Low | AI-generated content present, static |
| **CollapsibleChip** | Compact chip with label, expandable, accent at 30% | Medium | AI suggestion available, dismissible |
| **StatusLine** | Full-width subtle bar at bottom of editor, themed accent at 10% | Low but spatial | AI is actively working on this file |

### Indicator Rules

1. **Indicators never blink or pulse during normal editing.** Pulsing is reserved for active AI generation (the user explicitly triggered AI) and must use a slow (2s) sine wave, not a fast blink.
2. **Indicators use the theme's accent color but never at full saturation.** AI indicators at full saturation draw too much attention. Reduce saturation by 40% from the theme accent.
3. **Only one indicator style is visible per context at a time.** If an inline badge and a status bar dot would both be active, the inline badge takes precedence and the dot is suppressed.
4. **Indicators are always dismissible.** A right-click on any indicator offers "Dismiss" and "Don't show AI indicators for this file."

---

## Visual Deference Rules

The AI surface must always visually defer to the editor and the user's active work. These rules are non-negotiable constraints, not guidelines.

### Hard Constraints

| Rule | Rationale |
|---|---|
| **AI panel max width = 30% of viewport** | Editor must own ≥70% of visual space at all times |
| **AI panel never auto-opens** | User must initiate AI panel display; proactive opening is forbidden |
| **AI indicators never use full-saturation accent** | Full saturation creates visual competition with editor highlights |
| **AI surfaces never overlay the active cursor line** | The cursor's line is sacred — no tooltip, card, or indicator may obscure it |
| **AI animations are slower than user-triggered animations** | AI surfaces animate at 1.5× the duration of user-triggered surfaces to avoid feeling "fast" or "urgent" |
| **AI content never auto-scrolls the editor** | The viewport is the user's property; AI must not move it |
| **AI surfaces quiet when idle for 10s+** | After 10 seconds of no AI activity, all indicators reduce to None or StatusBarDot |

### Soft Constraints

| Rule | Rationale |
|---|---|
| **Prefer Embedded over Panel** | If content fits inline, don't open a panel |
| **Prefer CompactOrchestration over detailed logs** | Users rarely need full logs; show status, offer drill-down |
| **AI surfaces should match the current surface material** | Don't introduce a separate visual language for AI content |
| **Group AI outputs rather than stacking** | Multiple AI suggestions in one area should collapse into a single card |

---

## Contextual Appearance

AI surfaces adapt their presentation based on the current editing context. The same AI output may appear as an inline summary in one context and as a panel discussion in another.

### Context → Mode Mapping

| Context | Preferred Mode | Indicator | Reasoning Format |
|---|---|---|---|
| **Typing code** | Embedded | None | InlineSummary |
| **Paused at line** | Inline | InlineBadge | ExpandableCard |
| **Viewing suggestions** | Compact | CollapsibleChip | ExpandableCard |
| **Agent executing** | Panel | StatusLine | CompactOrchestration |
| **Reviewing changes** | Inline | InlineBadge | ExecutionCard |
| **Idle / browsing** | None | StatusBarDot | TooltipHover (on hover only) |
| **Error present** | Embedded | InlineBadge | InlineSummary |

### Quiet When Idle

When the AI has no active task and no recent output (10s+ since last AI action), all AI surfaces enter **quiet mode**:

- All indicators reduce to `None` or `StatusBarDot`
- Open AI panels collapse to a single summary line ("AI idle")
- Inline badges fade to 20% opacity
- Collapsible chips auto-dismiss

The AI becomes visually absent until the user needs it again. This is the correct default — an idle AI should be invisible.

---

## Anti-Patterns

### Giant Assistant Panel

An AI panel that occupies 40–50% of the viewport, displaying a full conversation history, large code blocks, and prominent branding. This immediately shifts the visual center of gravity away from the editor. The user feels like they are chatting with an AI, not writing code. The 30% max width rule exists specifically to prevent this.

### Chatbot Energy

AI surfaces that look like a messaging app — speech bubbles, avatars, typing indicators, "AI is thinking..." spinners. The IDE is a professional tool, not a chat application. AI surfaces should use the same visual language as the rest of the IDE: cards, panels, indicators, and annotations — not chat bubbles and message threads.

### Oversized Branding

A large "AI" logo, animated sparkles, or a branded header bar in the AI panel. The AI's identity should be communicated through subtle indicators, not through marketing-style branding. A 16×16 icon in the panel header is sufficient. Anything larger is visual ego that detracts from the user's work.

### Visual Screaming

Any AI surface that uses bright colors, animations, or large visual elements that draw the eye away from the editor. Examples include: a pulsing border around the AI panel during generation, a large animated progress bar, a notification toast that slides in from the side for every AI action. AI surfaces must be calm, subtle, and easy to ignore.

---

## Service Interface

```typescript
interface IAISurfaceExperienceService {
  readonly _serviceBrand: undefined;

  // Current surface mode for AI content
  readonly currentSurfaceMode: AISurfaceMode;

  // Current indicator style
  readonly currentIndicatorStyle: AIIndicatorStyle;

  // AI panel width (as fraction of viewport)
  readonly panelWidthFraction: number;  // 0.0–0.30

  // Whether AI is currently active (generating, processing)
  readonly isAIActive: boolean;

  // Whether AI is in quiet mode (idle)
  readonly isQuietMode: boolean;

  // Open AI content in a specific mode
  showAIContent(content: AIContent, mode: AISurfaceMode): IDisposable;

  // Dismiss all AI surfaces
  dismissAll(): void;

  // Observe AI activity changes
  onDidChangeAIActivity: Event<AIActivityState>;

  // Observe surface mode changes
  onDidChangeSurfaceMode: Event<AISurfaceMode>;

  // Resolve the best surface mode for a given context
  resolveModeForContext(context: EditingContext): AISurfaceMode;
}

type AISurfaceMode = 'embedded' | 'inline' | 'compact' | 'panel';
type AIIndicatorStyle = 'none' | 'statusbar-dot' | 'inline-badge' | 'collapsible-chip' | 'status-line';

interface AIContent {
  reasoning: AIReasoningFormat;
  title: string;
  body: string;
  actions: AIAction[];
  confidence?: number;
  source?: string;
}

type AIReasoningFormat = 'inline-summary' | 'expandable-card' | 'compact-orchestration' | 'execution-card' | 'tooltip-hover';

interface AIActivityState {
  active: boolean;
  lastAction: number;       // timestamp
  currentTask: string | null;
  quietMode: boolean;
}
```

---

## Design Principles Summary

1. **AI is embedded, not appended.** AI surfaces belong within the editing experience, not alongside it as a separate application.
2. **AI defers to the user.** The visual hierarchy always places the editor above the AI. The 30% max width rule is sacred.
3. **AI is quiet when idle.** An AI that is not actively helping should be visually absent. Indicators dim, panels collapse, and the user's workspace is undisturbed.
4. **AI surfaces match the IDE's visual language.** No chat bubbles, no speech indicators, no separate design system. AI content uses the same cards, panels, and indicators as the rest of the IDE.
5. **Context determines presentation.** The same AI output surfaces differently depending on what the user is doing. Contextual appearance ensures the AI is always in the right form factor for the moment.
