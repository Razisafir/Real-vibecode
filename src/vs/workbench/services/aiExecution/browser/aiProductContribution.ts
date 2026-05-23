/*---------------------------------------------------------------------------------------------
 *  AI Product Contribution -- Real UI Wiring
 *  Registers VS Code view containers, views, CSS injection, and settings.
 *  This is the ONLY file that makes the AI Execution Kernel visible in the IDE.
 *
 *  What this file does (all REAL, no abstractions):
 *    1. Injects CSS design tokens into the workbench DOM on startup
 *    2. Registers an "AI Execution" view container in the activity bar
 *    3. Registers sidebar views (AI Workflow, Projects, Timeline)
 *    4. Creates a webview panel for the complete AI user flow
 *    5. Registers settings for theme, execution, and memory
 *    6. Wires existing services to the UI via postMessage
 *    7. Wires Phase 25 services (LLM, Memory, Autonomous Execution, Sandbox, UI)
 *
 *  Phase 32 changes:
 *    - Removed IInstantiationService injection (was injected but never used)
 *    - Removed CheckpointType import (was imported but never referenced)
 *    - Removed ExecutionEventType import (was imported but never referenced)
 *--------------------------------------------------------------------------------------------*/

import { Disposable } from '../../../../base/common/lifecycle.js';
import { Emitter } from '../../../../base/common/event.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { IWorkbenchContribution } from '../../../common/contributions.js';

import { ILogService } from '../../../../platform/log/common/log.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';

import { IConfigurationRegistry, Extensions as ConfigurationExtensions, ConfigurationScope } from '../../../../platform/configuration/common/configurationRegistry.js';
import { workbenchConfigurationNodeBase } from '../../../common/configuration.js';

// View registration imports
import { IViewContainersRegistry, IViewsRegistry, ViewContainerLocation, Extensions as ViewExtensions } from '../../../common/views.js';
import { SyncDescriptor } from '../../../../platform/instantiation/common/descriptors.js';
import { ViewPaneContainer } from '../../../browser/parts/views/viewPaneContainer.js';
import { registerIcon } from '../../../../platform/theme/common/iconRegistry.js';
import { Codicon } from '../../../../base/common/codicons.js';

// Webview imports
import { IWebviewViewService, WebviewView } from '../../../contrib/webviewView/browser/webviewViewService.js';
import { CancellationToken } from '../../../../base/common/cancellation.js';

// CSS injection imports
import { createStyleSheet } from '../../../../base/browser/domStylesheets.js';
import { registerThemingParticipant } from '../../../../platform/theme/common/themeService.js';

// AI service imports (existing backend)
import { IAIExecutionService } from '../common/aiExecutionService.js';
import { IAIUnifiedStateService } from '../common/aiUnifiedStateService.js';

// Phase 25 service imports
import { ILLMProviderService } from '../common/llmProvider.js';
import { IProviderHealthService } from '../common/llmProvider.js';
import { ICredentialStoreService } from '../common/llmProvider.js';
import { IProjectMemoryService, MemoryType, MemoryPriority } from '../common/projectMemory.js';
import { IAutonomousExecutionService, ExecutionStage, ApprovalMode } from '../common/autonomousExecution.js';
import { IRealUIIntegrationService, AITheme } from '../common/realUIIntegration.js';

// Phase 27 service imports
import { IRepositoryIntelligenceService } from '../common/repositoryIntelligence.js';
import { ICodeEditingService } from '../common/codeEditing.js';
import { IGitWorkflowService } from '../common/gitWorkflow.js';
import { IExecutionVerificationService } from '../common/executionVerification.js';
import { ILongHorizonMemoryService } from '../common/longHorizonMemory.js';
import { IContextWindowOptimizationService } from '../common/contextWindowOptimization.js';

// Phase 28 service imports
import { IAutonomousExecutionLoopService, LoopState } from '../common/autonomousExecutionLoop.js';
import { ITerminalExecutionBridgeService } from '../common/terminalExecutionBridge.js';
import { ExecutionEvent } from '../common/executionEvents.js';

// Webview HTML content
import { getAIWorkflowHTML } from './aiWorkflowContent.js';

// Visualization service imports
import { IKnowledgeGraphVisualizationService } from './knowledgeGraphVisualizationService.js';
import { IMemoryVisualizationService, MemoryEntry, TokenBudget, CompactionStatus } from './memoryVisualizationService.js';

// Command registration
import { CommandsRegistry, ICommandService } from '../../../../platform/commands/common/commands.js';

// Keybinding registration
import { KeybindingsRegistry, IKeybindingItem } from '../../../../platform/keybinding/common/keybindingsRegistry.js';
import { KeyMod, KeyCode } from '../../../../base/common/keyCodes.js';
import { OS } from '../../../../base/common/platform.js';
import { ContextKeyExpr } from '../../../../platform/contextkey/common/contextkey.js';

// QuickInput for API key configuration
import { IQuickInputService } from '../../../../platform/quickinput/common/quickInput.js';

// LLM Streaming service for Jarvis chat
import { ILLMStreamingService, LLMRequest, LLMMessage, KNOWN_PROVIDER_CONFIGS } from '../common/llmProvider.js';

// Execution graph for Knowledge Graph data source
import { IExecutionGraphService } from '../common/executionGraphService.js';

// =====================================================================================
// CONSTANTS
// =====================================================================================

const AI_VIEW_CONTAINER_ID = 'aiExecution';
const AI_WORKFLOW_VIEW_ID = 'aiExecution.workflow';
const AI_PROJECTS_VIEW_ID = 'aiExecution.projects';
const AI_TIMELINE_VIEW_ID = 'aiExecution.timeline';
const AI_KNOWLEDGE_GRAPH_VIEW_ID = 'aiExecution.knowledgeGraph';
const AI_MEMORY_VIEW_ID = 'aiExecution.memory';
const AI_JARVIS_VIEW_ID = 'aiExecution.jarvis';

const STORAGE_KEY_PROJECT = 'aiExecution.currentProject';
const STORAGE_KEY_STEP = 'aiExecution.currentStep';
const STORAGE_KEY_HISTORY = 'aiExecution.executionHistory';
const STORAGE_KEY_CONSTRAINTS = 'aiExecution.constraints';
const STORAGE_KEY_PLAN = 'aiExecution.executionPlan';

// =====================================================================================
// ICON REGISTRATION
// =====================================================================================

const aiExecutionIcon = registerIcon(
        'ai-execution-icon',
        Codicon.sparkle,
        'AI Execution view container icon'
);

const aiProjectIcon = registerIcon(
        'ai-project-icon',
        Codicon.folder,
        'AI Projects view icon'
);

const aiTimelineIcon = registerIcon(
        'ai-timeline-icon',
        Codicon.history,
        'AI Timeline view icon'
);

const aiKnowledgeGraphIcon = registerIcon(
        'ai-knowledge-graph-icon',
        Codicon.graph,
        'AI Knowledge Graph view icon'
);

const aiMemoryIcon = registerIcon(
        'ai-memory-icon',
        Codicon.database,
        'AI Memory view icon'
);

const aiJarvisIcon = registerIcon(
        'ai-jarvis-icon',
        Codicon.commentDiscussion,
        'AI Jarvis chat view icon'
);

// =====================================================================================
// VIEW CONTAINER REGISTRATION (Activity Bar + Sidebar)
// =====================================================================================

const aiViewContainer = Registry.as<IViewContainersRegistry>(ViewExtensions.ViewContainersRegistry).registerViewContainer({
        id: AI_VIEW_CONTAINER_ID,
        title: { value: 'AI Execution', original: 'AI Execution' },
        icon: aiExecutionIcon,
        ctorDescriptor: new SyncDescriptor(ViewPaneContainer, [AI_VIEW_CONTAINER_ID, { mergeViewWithContainerWhenSingleView: false }]),
        storageId: 'aiExecution.views.state',
        order: 10,
        openCommandActionDescriptor: {
                id: 'aiExecution.focus',
                title: { value: 'AI Execution', original: 'AI Execution' },
                keybindings: { primary: 0 /* no default keybinding */ },
                order: 10,
        },
}, ViewContainerLocation.Sidebar);

// =====================================================================================
// VIEW REGISTRATIONS
// =====================================================================================

Registry.as<IViewsRegistry>(ViewExtensions.ViewsRegistry).registerViews([
        {
                id: AI_WORKFLOW_VIEW_ID,
                name: { value: 'AI Workflow', original: 'AI Workflow' },
                containerIcon: aiExecutionIcon,
                canToggleVisibility: false,
                ctorDescriptor: new SyncDescriptor(
                        // We use the built-in WebviewViewPane and register a resolver below
                        // Dynamic import to avoid circular deps
                        class AIWorkflowViewPane {
                                constructor() { /* resolved by webviewViewService */ }
                        }
                ),
        },
        {
                id: AI_PROJECTS_VIEW_ID,
                name: { value: 'Projects', original: 'Projects' },
                containerIcon: aiProjectIcon,
                canToggleVisibility: true,
                ctorDescriptor: new SyncDescriptor(
                        class AIProjectsViewPane {
                                constructor() { /* resolved by webviewViewService */ }
                        }
                ),
        },
        {
                id: AI_TIMELINE_VIEW_ID,
                name: { value: 'Timeline', original: 'Timeline' },
                containerIcon: aiTimelineIcon,
                canToggleVisibility: true,
                ctorDescriptor: new SyncDescriptor(
                        class AITimelineViewPane {
                                constructor() { /* resolved by webviewViewService */ }
                        }
                ),
        },
        {
                id: AI_KNOWLEDGE_GRAPH_VIEW_ID,
                name: { value: 'Knowledge Graph', original: 'Knowledge Graph' },
                containerIcon: aiKnowledgeGraphIcon,
                canToggleVisibility: true,
                ctorDescriptor: new SyncDescriptor(
                        class AIKnowledgeGraphViewPane {
                                constructor() { /* resolved by webviewViewService */ }
                        }
                ),
        },
        {
                id: AI_MEMORY_VIEW_ID,
                name: { value: 'Memory', original: 'Memory' },
                containerIcon: aiMemoryIcon,
                canToggleVisibility: true,
                ctorDescriptor: new SyncDescriptor(
                        class AIMemoryViewPane {
                                constructor() { /* resolved by webviewViewService */ }
                        }
                ),
        },
        {
                id: AI_JARVIS_VIEW_ID,
                name: { value: 'Jarvis Chat', original: 'Jarvis Chat' },
                containerIcon: aiJarvisIcon,
                canToggleVisibility: true,
                ctorDescriptor: new SyncDescriptor(
                        class AIJarvisViewPane {
                                constructor() { /* resolved by webviewViewService */ }
                        }
                ),
        },
], aiViewContainer);

// =====================================================================================
// SETTINGS REGISTRATION
// =====================================================================================

Registry.as<IConfigurationRegistry>(ConfigurationExtensions.Configuration).registerConfiguration({
        ...workbenchConfigurationNodeBase,
        id: 'aiExecution',
        title: { value: 'AI Execution', original: 'AI Execution' },
        properties: {
                'aiExecution.theme': {
                        type: 'string',
                        enum: ['dark', 'deepblue', 'light', 'highcontrast', 'vibecode-2026-dark', 'vibecode-2026-light'],
                        default: 'vibecode-2026-dark',
                        description: 'Color theme for AI Execution panels. VibeCode 2026 themes use the official brand palette.',
                        scope: ConfigurationScope.APPLICATION,
                },
                'aiExecution.executionMode': {
                        type: 'string',
                        enum: ['stepbystep', 'milestone', 'autonomous'],
                        default: 'autonomous',
                        description: 'Default execution mode for AI operations',
                        scope: ConfigurationScope.APPLICATION,
                },
                'aiExecution.autoSaveFrequency': {
                        type: 'number',
                        enum: [5, 10, 30, 60],
                        default: 10,
                        description: 'Auto-save frequency in seconds (0 to disable)',
                        scope: ConfigurationScope.APPLICATION,
                },
                'aiExecution.tokenEstimatorEnabled': {
                        type: 'boolean',
                        default: true,
                        description: 'Show token estimator during planning phase',
                        scope: ConfigurationScope.APPLICATION,
                },
                'aiExecution.memoryPersistence': {
                        type: 'boolean',
                        default: true,
                        description: 'Persist project state, plans, and execution history across sessions',
                        scope: ConfigurationScope.APPLICATION,
                },
                'aiExecution.showExecutionLogs': {
                        type: 'boolean',
                        default: true,
                        description: 'Show execution logs panel during AI operations',
                        scope: ConfigurationScope.APPLICATION,
                },
                'aiExecution.activeProvider': {
                        type: 'string',
                        enum: ['openai', 'anthropic', 'google-gemini', 'openrouter', 'ollama', 'lm-studio', 'generic-openai'],
                        default: 'openai',
                        description: 'Active LLM provider for AI execution',
                        scope: ConfigurationScope.APPLICATION,
                },
                'aiExecution.activeModel': {
                        type: 'string',
                        default: 'gpt-4o',
                        description: 'Active model ID for the selected provider',
                        scope: ConfigurationScope.APPLICATION,
                },
                'aiExecution.provider.openai.apiKey': {
                        type: 'string',
                        default: '',
                        description: 'OpenAI API key (stored securely via SecretStorage)',
                        scope: ConfigurationScope.APPLICATION,
                },
                'aiExecution.provider.anthropic.apiKey': {
                        type: 'string',
                        default: '',
                        description: 'Anthropic API key (stored securely via SecretStorage)',
                        scope: ConfigurationScope.APPLICATION,
                },
                'aiExecution.provider.gemini.apiKey': {
                        type: 'string',
                        default: '',
                        description: 'Google Gemini API key (stored securely via SecretStorage)',
                        scope: ConfigurationScope.APPLICATION,
                },
                'aiExecution.provider.openrouter.apiKey': {
                        type: 'string',
                        default: '',
                        description: 'OpenRouter API key (stored securely via SecretStorage)',
                        scope: ConfigurationScope.APPLICATION,
                },
                'aiExecution.provider.generic.endpoint': {
                        type: 'string',
                        default: '',
                        description: 'Custom endpoint URL for generic OpenAI-compatible provider',
                        scope: ConfigurationScope.APPLICATION,
                },
                'aiExecution.maxExecutionRetries': {
                        type: 'number',
                        default: 3,
                        minimum: 0,
                        maximum: 10,
                        description: 'Maximum retry attempts per execution step',
                        scope: ConfigurationScope.APPLICATION,
                },
                'aiExecution.memoryTokenBudget': {
                        type: 'number',
                        default: 50000,
                        description: 'Maximum token budget for project memory before compaction',
                        scope: ConfigurationScope.APPLICATION,
                },
                'aiExecution.autoCompaction': {
                        type: 'boolean',
                        default: true,
                        description: 'Automatically compact memory when token budget exceeded',
                        scope: ConfigurationScope.APPLICATION,
                },
                'aiExecution.repositoryScanDepth': {
                        type: 'number',
                        default: 3,
                        minimum: 1,
                        maximum: 10,
                        description: 'Maximum directory depth for repository scanning',
                        scope: ConfigurationScope.APPLICATION,
                },
                'aiExecution.gitSafety.forcePush': {
                        type: 'boolean',
                        default: false,
                        description: 'Allow force push operations (dangerous)',
                        scope: ConfigurationScope.APPLICATION,
                },
                'aiExecution.gitSafety.protectedBranches': {
                        type: 'string',
                        default: 'main,master,release/*',
                        description: 'Comma-separated glob patterns for protected branches',
                        scope: ConfigurationScope.APPLICATION,
                },
                'aiExecution.repairBudget': {
                        type: 'number',
                        default: 3,
                        minimum: 1,
                        maximum: 10,
                        description: 'Maximum automatic repair attempts before escalation',
                        scope: ConfigurationScope.APPLICATION,
                },
                'aiExecution.contextWindow.maxTokens': {
                        type: 'number',
                        default: 128000,
                        description: 'Maximum context window tokens for optimization',
                        scope: ConfigurationScope.APPLICATION,
                },
                'aiExecution.verification.blockOnBuildFailure': {
                        type: 'boolean',
                        default: true,
                        description: 'Block execution when build verification fails',
                        scope: ConfigurationScope.APPLICATION,
                },
                'aiExecution.verification.blockOnLintFailure': {
                        type: 'boolean',
                        default: false,
                        description: 'Block execution when lint verification fails',
                        scope: ConfigurationScope.APPLICATION,
                },
                'aiExecution.terminalOutputCapture': {
                        type: 'string',
                        enum: ['fileRedirect', 'terminalService', 'commandService'],
                        default: 'fileRedirect',
                        description: 'Method for capturing terminal command output',
                        scope: ConfigurationScope.APPLICATION,
                },
                'aiExecution.terminalCommandTimeout': {
                        type: 'number',
                        default: 30000,
                        minimum: 5000,
                        maximum: 300000,
                        description: 'Default timeout for terminal commands in milliseconds',
                        scope: ConfigurationScope.APPLICATION,
                },
                'aiExecution.autonomousLoop.maxRepairAttempts': {
                        type: 'number',
                        default: 3,
                        minimum: 1,
                        maximum: 10,
                        description: 'Maximum repair attempts per step before escalation',
                        scope: ConfigurationScope.APPLICATION,
                },
                'aiExecution.autonomousLoop.autoCheckpoint': {
                        type: 'boolean',
                        default: true,
                        description: 'Automatically create git checkpoints after each milestone',
                        scope: ConfigurationScope.APPLICATION,
                },
                'aiExecution.crashRecovery.autoRestore': {
                        type: 'boolean',
                        default: true,
                        description: 'Automatically offer to restore from crash recovery state on startup',
                        scope: ConfigurationScope.APPLICATION,
                },
        },
});

// =====================================================================================
// CSS DESIGN TOKEN INJECTION
// Injects real CSS custom properties into the workbench DOM.
// These tokens are consumed by all AI Execution UI surfaces.
// =====================================================================================

const AI_CSS_STYLE_ID = 'ai-design-system-tokens';

function injectDesignTokenCSS(): void {
        if (typeof document === 'undefined') { return; }

        // Remove existing style element if present
        const existing = document.getElementById(AI_CSS_STYLE_ID);
        if (existing) { existing.remove(); }

        const style = createStyleSheet();
        style.id = AI_CSS_STYLE_ID;

        // Build the CSS with all design tokens
        const css = `
:root {
  --ai-spacing-xs: 2px; --ai-spacing-sm: 4px; --ai-spacing-md: 8px;
  --ai-spacing-lg: 12px; --ai-spacing-xl: 16px; --ai-spacing-2xl: 24px;
  --ai-spacing-3xl: 32px; --ai-spacing-4xl: 48px;
  --ai-font-xs: 11px; --ai-font-sm: 12px; --ai-font-md: 13px;
  --ai-font-base: 14px; --ai-font-lg: 16px; --ai-font-xl: 20px;
  --ai-font-weight-regular: 400; --ai-font-weight-medium: 500; --ai-font-weight-semibold: 600;
  --ai-line-height-tight: 1.25; --ai-line-height-normal: 1.5; --ai-line-height-relaxed: 1.75;
  --ai-radius-xs: 2px; --ai-radius-sm: 4px; --ai-radius-md: 6px;
  --ai-radius-lg: 8px; --ai-radius-xl: 12px; --ai-radius-full: 9999px;
  --ai-duration-fast: 100ms; --ai-duration-normal: 200ms;
  --ai-duration-slow: 350ms; --ai-duration-deliberate: 500ms;
  --ai-easing-standard: cubic-bezier(0.4,0,0.2,1);
  --ai-easing-decelerate: cubic-bezier(0,0,0.2,1);
  --ai-easing-accelerate: cubic-bezier(0.4,0,1,1);
  --ai-opacity-hover: 0.04; --ai-opacity-selected: 0.08;
  --ai-opacity-pressed: 0.12; --ai-opacity-disabled: 0.38;
  --ai-opacity-border: 0.12; --ai-opacity-divider: 0.08;
  --ai-opacity-placeholder: 0.5; --ai-opacity-secondary: 0.6;
}

/* Theme-aware color overrides via registerThemingParticipant */
.ai-surface { background: var(--vscode-editor-background); color: var(--vscode-editor-foreground); }
.ai-surface-raised { background: var(--vscode-sideBar-background); }
.ai-border { border-color: var(--vscode-panel-border); }
.ai-accent { color: var(--vscode-button-background); }
.ai-accent-bg { background: var(--vscode-button-background); color: var(--vscode-button-foreground); }
.ai-border-focus { border-color: var(--vscode-focusBorder); }

/* Focus ring for all AI interactive elements */
[role="button"]:focus-visible,
.ai-interactive:focus-visible {
  outline: none;
  box-shadow: 0 0 0 2px var(--vscode-focusBorder);
  border-radius: var(--ai-radius-sm);
}

/* Reduced motion support */
@media (prefers-reduced-motion: reduce) {
  .ai-animated, .ai-transition {
    animation-duration: 0ms !important;
    transition-duration: 0ms !important;
  }
}

/* High contrast mode */
.hc-black .ai-surface { background: transparent; border: 1px solid var(--vscode-contrastBorder); }
.hc-black .ai-accent-bg { background: var(--vscode-button-background); border: 1px solid var(--vscode-contrastBorder); }
`;

        style.textContent = css;
}

// Register theme-aware CSS rules
registerThemingParticipant((theme, collector) => {
        const accent = theme.getColor('button.background');
        if (accent) {
                collector.addRule(`.ai-accent-text { color: ${accent}; }`);
                collector.addRule(`.ai-accent-bg-soft { background: ${accent.withAlpha(0.15)}; }`);
        }
        const success = theme.getColor('testing.iconPassed');
        if (success) {
                collector.addRule(`.ai-status-success { color: ${success}; }`);
        }
        const error = theme.getColor('testing.iconFailed');
        if (error) {
                collector.addRule(`.ai-status-error { color: ${error}; }`);
        }
        const warning = theme.getColor('editorWarning.foreground');
        if (warning) {
                collector.addRule(`.ai-status-warning { color: ${warning}; }`);
        }
        const info = theme.getColor('editorInfo.foreground');
        if (info) {
                collector.addRule(`.ai-status-info { color: ${info}; }`);
        }

        // Emit VibeCode brand tokens via the theming participant so they
        // re-sync automatically when VS Code's active theme changes.
        const themeType = theme.type;
        const isDark = themeType === 'dark' || themeType === 'hcDark' || themeType === 'vs-dark';
        const brandPrimary = isDark ? '#8B5CF6' : '#7C3AED';
        const brandSecondary = isDark ? '#06B6D4' : '#0891B2';
        const brandBgStart = isDark ? '#1E1B4B' : '#FFFFFF';
        const brandBgEnd = isDark ? '#09090B' : '#F4F4F5';
        const brandSurface = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)';
        const brandText = isDark ? '#FAFAFA' : '#09090B';
        const brandMuted = isDark ? '#A1A1AA' : '#71717A';
        const brandBorder = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.10)';

        collector.addRule(`:root {
                --vibecode-primary: ${brandPrimary};
                --vibecode-secondary: ${brandSecondary};
                --vibecode-bg-gradient-start: ${brandBgStart};
                --vibecode-bg-gradient-end: ${brandBgEnd};
                --vibecode-surface: ${brandSurface};
                --vibecode-text: ${brandText};
                --vibecode-muted: ${brandMuted};
                --vibecode-border: ${brandBorder};
                --vibecode-border-focus: ${brandPrimary};
        }`);

        // Toggle body class for gradient overrides
        if (typeof document !== 'undefined') {
                document.body.classList.toggle('vibecode-dark-first', isDark);
                document.body.classList.toggle('vibecode-light-first', !isDark);
        }
});

// =====================================================================================
// SVG ICON SYSTEM
// Real SVG path data for all icons used in AI Execution UI.
// No emoji. All icons are theme-aware (use currentColor).
// =====================================================================================

const AI_ICON_REGISTRY: Map<string, { path: string; label: string }> = new Map([
        ['spark', { path: 'M10 1l2 5 5 2-5 2-2 5-2-5-5-2 5-2 2-5z', label: 'AI spark' }],
        ['play', { path: 'M5 3l10 7-10 7V3z', label: 'Play' }],
        ['pause', { path: 'M5 3h3v14H5V3zm7 0h3v14h-3V3z', label: 'Pause' }],
        ['stop', { path: 'M4 4h12v12H4V4z', label: 'Stop' }],
        ['check', { path: 'M4 10l4 4 8-8', label: 'Check' }],
        ['x', { path: 'M5 5l10 10M15 5L5 15', label: 'Close' }],
        ['warning', { path: 'M10 2L1 18h18L10 2zm0 4v6m0 2v1', label: 'Warning' }],
        ['info', { path: 'M10 2a8 8 0 100 16 8 8 0 000-16zm0 3v1m0 3v6', label: 'Info' }],
        ['terminal', { path: 'M3 3h14v12H3V3zm3 4l2 2-2 2M10 11h4', label: 'Terminal' }],
        ['gear', { path: 'M10 2a8 8 0 100 16 8 8 0 000-16zm0 3a5 5 0 110 10 5 5 0 010-10z', label: 'Settings' }],
        ['folder', { path: 'M2 4h6l2 2h6v10H2V4z', label: 'Folder' }],
        ['file', { path: 'M4 2h8l4 4v12H4V2zm8 0v4h4', label: 'File' }],
        ['save', { path: 'M4 2h12v14l-3 2H4V2zm3 0v4h5V2M7 12v3', label: 'Save' }],
        ['refresh', { path: 'M3 10a7 7 0 0113-3m1 3a7 7 0 01-13 3', label: 'Refresh' }],
        ['add', { path: 'M10 4v12M4 10h12', label: 'Add' }],
        ['remove', { path: 'M4 10h12', label: 'Remove' }],
        ['deploy', { path: 'M10 2l8 8-8 8M2 10h16', label: 'Deploy' }],
        ['bell', { path: 'M6 8a4 4 0 018 0v3l2 2H4l2-2V8zm2 7a2 2 0 004 0', label: 'Bell' }],
        ['brain', { path: 'M10 2C6 2 3 5 3 9c0 2 1 4 3 5v3h3v-2h2v2h3v-3c2-1 3-3 3-5 0-4-3-7-7-7z', label: 'Brain' }],
        ['chat', { path: 'M3 3h14v10H7l-4 4V3z', label: 'Chat' }],
        ['history', { path: 'M3 10a7 7 0 1114 0 7 7 0 01-14 0zm3-1h4V6', label: 'History' }],
        ['project', { path: 'M2 5h6l2 2h8v9H2V5z', label: 'Project' }],
        ['plan', { path: 'M4 3h12v14H4V3zm3 3h6M7 9h6M7 12h4', label: 'Plan' }],
        ['memory', { path: 'M3 6h14v10H3V6zm2 2v6h10V8H5z', label: 'Memory' }],
        ['provider', { path: 'M2 10l4-4v2h3V5h2v3h3V6l4 4-4 4v-2h-3v3H9v-3H6v2l-4-4z', label: 'Provider' }],
        ['key', { path: 'M11 3a4 4 0 014 4 4 4 0 01-4 4c-1 0-2-.4-2.7-1L6 12.7V15H4v-2H2v-2h2.3l2.7-2.7C6.4 7 6 6 6 5a4 4 0 014-4zm1 2a1 1 0 100 2 1 1 0 000-2z', label: 'API Key' }],
        ['sandbox', { path: 'M3 3h14v14H3V3zm2 2v10h10V5H5zm2 3h6M7 11h4', label: 'Sandbox' }],
        ['token', { path: 'M5 3h10l-3 6 3 6H5l3-6-3-6z', label: 'Token' }],
        ['shield', { path: 'M10 2L3 5v5c0 5 3.5 9.7 7 11 3.5-1.3 7-6 7-11V5l-7-3z', label: 'Security' }],
]);

/**
 * Renders an SVG icon as a string with theme-aware colors and accessibility.
 */
export function renderIcon(iconId: string, size: number = 16): string {
        const icon = AI_ICON_REGISTRY.get(iconId);
        if (!icon) {
                return `<svg width="${size}" height="${size}" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" role="img" aria-label="Unknown"><circle cx="10" cy="10" r="7"/></svg>`;
        }
        return `<svg width="${size}" height="${size}" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" role="img" aria-label="${icon.label}"><path d="${icon.path}"/></svg>`;
}

/**
 * Renders an SVG icon as a DOM element using createElementNS.
 */
export function renderIconToDOM(iconId: string, size: number = 16): SVGElement | null {
        if (typeof document === 'undefined') { return null; }
        const icon = AI_ICON_REGISTRY.get(iconId);
        if (!icon) { return null; }
        const ns = 'http://www.w3.org/2000/svg';
        const svg = document.createElementNS(ns, 'svg');
        svg.setAttribute('width', String(size));
        svg.setAttribute('height', String(size));
        svg.setAttribute('viewBox', '0 0 20 20');
        svg.setAttribute('fill', 'none');
        svg.setAttribute('stroke', 'currentColor');
        svg.setAttribute('stroke-width', '1.5');
        svg.setAttribute('stroke-linecap', 'round');
        svg.setAttribute('stroke-linejoin', 'round');
        svg.setAttribute('role', 'img');
        svg.setAttribute('aria-label', icon.label);
        const path = document.createElementNS(ns, 'path');
        path.setAttribute('d', icon.path);
        svg.appendChild(path);
        return svg;
}

// =====================================================================================
// AI PRODUCT CONTRIBUTION (IWorkbenchContribution)
// The main class that wires everything together on workbench startup.
// Now includes Phase 25 service wiring for LLM, Memory, Execution, and UI.
// =====================================================================================

export class AIProductContribution extends Disposable implements IWorkbenchContribution {

        private readonly _onProjectCreated = new Emitter<{ name: string; description: string; path: string }>();
        private readonly _onExecutionStarted = new Emitter<{ mode: string; project: string }>();
        private readonly _onStepChanged = new Emitter<number>();

        /** Reference to the active workflow webview for posting messages from service events */
        private _activeWebview: { postMessage(msg: any): Thenable<boolean> } | null = null;

        /** Reference to the active Jarvis chat webview for posting LLM responses */
        private _jarvisWebview: { postMessage(msg: any): Thenable<boolean> } | null = null;

        /** Conversation history for Jarvis chat context */
        private _jarvisConversationHistory: LLMMessage[] = [];

        /** Cached plan data for execution */
        private _cachedPlan: any | null = null;

        constructor(
                @ILogService private readonly logService: ILogService,
                @IStorageService private readonly storageService: IStorageService,
                @IWebviewViewService private readonly webviewViewService: IWebviewViewService,
                @IAIExecutionService private readonly executionService: IAIExecutionService,
                @IAIUnifiedStateService private readonly stateService: IAIUnifiedStateService,
                // Phase 25 services
                @ILLMProviderService private readonly llmProviderService: ILLMProviderService,
                @IProviderHealthService private readonly providerHealthService: IProviderHealthService,
                @ICredentialStoreService private readonly credentialStoreService: ICredentialStoreService,
                @IProjectMemoryService private readonly projectMemoryService: IProjectMemoryService,
                @IAutonomousExecutionService private readonly autonomousExecutionService: IAutonomousExecutionService,
                @IRealUIIntegrationService private readonly realUIIntegrationService: IRealUIIntegrationService,
                // Phase 27 services
                @IRepositoryIntelligenceService private readonly repositoryIntelligenceService: IRepositoryIntelligenceService,
                @ICodeEditingService private readonly codeEditingService: ICodeEditingService,
                @IGitWorkflowService private readonly gitWorkflowService: IGitWorkflowService,
                @IExecutionVerificationService private readonly executionVerificationService: IExecutionVerificationService,
                @ILongHorizonMemoryService private readonly longHorizonMemoryService: ILongHorizonMemoryService,
                @IContextWindowOptimizationService private readonly contextWindowOptimizationService: IContextWindowOptimizationService,
                // Phase 28 services
                @IAutonomousExecutionLoopService private readonly executionLoopService: IAutonomousExecutionLoopService,
                @ITerminalExecutionBridgeService private readonly terminalBridgeService: ITerminalExecutionBridgeService,
                // Visualization services
                @IKnowledgeGraphVisualizationService private readonly knowledgeGraphVisualizationService: IKnowledgeGraphVisualizationService,
                @IMemoryVisualizationService private readonly memoryVisualizationService: IMemoryVisualizationService,
                // Execution graph for Knowledge Graph data
                @IExecutionGraphService private readonly executionGraphService: IExecutionGraphService,
                // QuickInput for API key configuration UI
                @IQuickInputService private readonly quickInputService: IQuickInputService,
        ) {
                super();

                this.logService.info('[AIProduct] Initializing real UI wiring with Phase 34 keybindings, Jarvis LLM wiring, and API key config');

                // 1. Inject CSS design tokens into the DOM immediately
                this.injectCSS();

                // 2. Register webview resolvers for all views
                this.registerWebviewResolvers();

                // 3. Wire service events to UI
                this.wireServiceEvents();

                // 4. Wire Phase 25 service events to the webview
                this.wirePhase25ServiceEvents();

                // 5. Check for crash recovery
                this.checkCrashRecovery();

                // 6. Wire Phase 27 service events to the webview
                this.wirePhase27ServiceEvents();

                // 7. Wire Phase 28 service events to the webview
                this.wirePhase28ServiceEvents();

                // 8. Register keybindings for AI actions
                this.registerKeybindings();

                this.logService.info('[AIProduct] UI wiring complete. Views registered, CSS injected, webview resolvers active, keybindings registered.');
        }

        private injectCSS(): void {
                injectDesignTokenCSS();
                this.logService.info('[AIProduct] Design token CSS injected into DOM');
        }

        private registerWebviewResolvers(): void {
                // Register the main AI workflow webview resolver
                this.webviewViewService.register(AI_WORKFLOW_VIEW_ID, {
                        resolve: async (webviewView: WebviewView, token: CancellationToken) => {
                                webviewView.webview.options = {
                                        enableScripts: true,
                                        localResourceRoots: [],
                                };

                                webviewView.webview.html = getAIWorkflowHTML();

                                // Store reference to active webview for posting messages from service events
                                this._activeWebview = webviewView.webview;

                                // Handle messages from the webview
                                webviewView.webview.onDidReceiveMessage((msg: { type: string; [key: string]: any }) => {
                                        this.handleWebviewMessage(msg);
                                });

                                // Restore persisted state
                                const savedProject = this.storageService.get(STORAGE_KEY_PROJECT, undefined);
                                const savedStep = this.storageService.getNumber(STORAGE_KEY_STEP, undefined);
                                if (savedProject) {
                                        try {
                                                const project = JSON.parse(savedProject);
                                                webviewView.webview.postMessage({
                                                        type: 'restoreState',
                                                        state: { project, step: savedStep || 0 },
                                                });
                                        } catch {
                                                // Corrupted state, ignore
                                        }
                                }

                                this.logService.info('[AIProduct] AI Workflow webview resolved and ready');
                        },
                });

                // Register the projects view resolver
                this.webviewViewService.register(AI_PROJECTS_VIEW_ID, {
                        resolve: async (webviewView: WebviewView, token: CancellationToken) => {
                                webviewView.webview.options = { enableScripts: true, localResourceRoots: [] };
                                webviewView.webview.html = this.getProjectsHTML();
                                webviewView.webview.onDidReceiveMessage((msg: { type: string; [key: string]: any }) => {
                                        if (msg.type === 'openProject') {
                                                this.logService.info(`[AIProduct] Opening project: ${msg.name}`);
                                        }
                                });
                        },
                });

                // Register the timeline view resolver
                this.webviewViewService.register(AI_TIMELINE_VIEW_ID, {
                        resolve: async (webviewView: WebviewView, token: CancellationToken) => {
                                webviewView.webview.options = { enableScripts: true, localResourceRoots: [] };
                                webviewView.webview.html = this.getTimelineHTML();
                        },
                });

                // ─── Knowledge Graph webview resolver ──────────────────────────────────
                this.webviewViewService.register(AI_KNOWLEDGE_GRAPH_VIEW_ID, {
                        resolve: async (webviewView: WebviewView, token: CancellationToken) => {
                                webviewView.webview.options = {
                                        enableScripts: true,
                                        localResourceRoots: [],
                                };

                                // Fetch live graph data from ExecutionGraphService and render
                                const nodes = this.executionService.getRecentNodes?.(1000) ?? [];
                                const edges: any[] = [];
                                const scopes: any[] = [];
                                webviewView.webview.html = this.knowledgeGraphVisualizationService.renderGraph(nodes, edges, scopes);

                                // Handle postMessage from the knowledge graph webview
                                webviewView.webview.onDidReceiveMessage((msg: { type: string; nodeId?: string; [key: string]: any }) => {
                                        if (msg.type === 'nodeSelected' && msg.nodeId) {
                                                this.knowledgeGraphVisualizationService.handleWebviewMessage(msg);
                                                this.logService.info(`[AIProduct] Knowledge graph node selected: ${msg.nodeId}`);
                                        } else if (msg.type === 'refreshGraph') {
                                                // Re-render with fresh data
                                                const freshNodes = this.executionService.getRecentNodes?.(1000) ?? [];
                                                webviewView.webview.html = this.knowledgeGraphVisualizationService.renderGraph(freshNodes, [], []);
                                        }
                                });

                                // Auto-refresh graph when execution state changes
                                if (this.executionService.onDidExecutionChange) {
                                        this._register(this.executionService.onDidExecutionChange(() => {
                                                const freshNodes = this.executionService.getRecentNodes?.(1000) ?? [];
                                                const freshHTML = this.knowledgeGraphVisualizationService.renderGraph(freshNodes, [], []);
                                                webviewView.webview.html = freshHTML;
                                        }));
                                }

                                this.logService.info('[AIProduct] Knowledge Graph webview resolved and ready');
                        },
                });

                // ─── Memory Visualization webview resolver ──────────────────────────────
                this.webviewViewService.register(AI_MEMORY_VIEW_ID, {
                        resolve: async (webviewView: WebviewView, token: CancellationToken) => {
                                webviewView.webview.options = {
                                        enableScripts: true,
                                        localResourceRoots: [],
                                };

                                webviewView.webview.html = this.getMemoryVisualizationHTML();

                                // Handle postMessage from the memory webview
                                webviewView.webview.onDidReceiveMessage((msg: { type: string; entryId?: string; [key: string]: any }) => {
                                        if (msg.type === 'memorySelected' && msg.entryId) {
                                                this.logService.info(`[AIProduct] Memory entry selected: ${msg.entryId}`);
                                        } else if (msg.type === 'refreshMemory') {
                                                webviewView.webview.html = this.getMemoryVisualizationHTML();
                                        }
                                });

                                this.logService.info('[AIProduct] Memory Visualization webview resolved and ready');
                        },
                });

                // ─── Jarvis Chat webview resolver ───────────────────────────────────────
                this.webviewViewService.register(AI_JARVIS_VIEW_ID, {
                        resolve: async (webviewView: WebviewView, token: CancellationToken) => {
                                webviewView.webview.options = {
                                        enableScripts: true,
                                        localResourceRoots: [],
                                };

                                webviewView.webview.html = this.getJarvisHTML();

                                // Store reference to Jarvis webview for LLM response posting
                                this._jarvisWebview = webviewView.webview;

                                // Handle Jarvis chat messages — wired to LLMProviderService
                                webviewView.webview.onDidReceiveMessage(async (msg: { type: string; text?: string; [key: string]: any }) => {
                                        if (msg.type === 'chatMessage' && msg.text) {
                                                await this.handleJarvisChatMessage(msg.text);
                                        } else if (msg.type === 'configureApiKeys') {
                                                CommandsRegistry.getCommand('aiExecution.configureApiKeys')?.handler();
                                        } else if (msg.type === 'clearHistory') {
                                                this._jarvisConversationHistory = [];
                                                webviewView.webview.postMessage({ type: 'historyCleared', timestamp: Date.now() });
                                        }
                                });

                                this.logService.info('[AIProduct] Jarvis Chat webview resolved and ready with LLM wiring');
                        },
                });
        }

        // =================================================================================
        // KEYBINDING REGISTRATION
        // Registers keyboard shortcuts for all AI Execution actions.
        // Uses KeyMod.CtrlCmd for cross-platform Ctrl/Cmd support.
        // =================================================================================

        private registerKeybindings(): void {
                // ─── View Focus Keybindings ──────────────────────────────────────────
                // Ctrl/Cmd+Shift+J → Show Jarvis Chat
                KeybindingsRegistry.registerKeybinding({
                        keybinding: KeyMod.CtrlCmd | KeyMod.Shift | KeyCode.KeyJ,
                        command: 'aiExecution.showJarvis',
                        when: undefined,
                        weight: 0, // EditorCore.Weight.editorContrib - use 0 for default
                        extensionId: undefined,
                });

                // Ctrl/Cmd+Shift+K → Show Knowledge Graph
                KeybindingsRegistry.registerKeybinding({
                        keybinding: KeyMod.CtrlCmd | KeyMod.Shift | KeyCode.KeyK,
                        command: 'aiExecution.showKnowledgeGraph',
                        when: undefined,
                        weight: 0,
                        extensionId: undefined,
                });

                // Ctrl/Cmd+Shift+M → Show Memory
                KeybindingsRegistry.registerKeybinding({
                        keybinding: KeyMod.CtrlCmd | KeyMod.Shift | KeyCode.KeyM,
                        command: 'aiExecution.showMemory',
                        when: undefined,
                        weight: 0,
                        extensionId: undefined,
                });

                // Ctrl/Cmd+Shift+A → Show AI Workflow
                KeybindingsRegistry.registerKeybinding({
                        keybinding: KeyMod.CtrlCmd | KeyMod.Shift | KeyCode.KeyA,
                        command: 'aiExecution.showWorkflow',
                        when: undefined,
                        weight: 0,
                        extensionId: undefined,
                });

                // ─── AI Action Keybindings ──────────────────────────────────────────
                // Ctrl/Cmd+Shift+Space → Trigger AI inline completion
                KeybindingsRegistry.registerKeybinding({
                        keybinding: KeyMod.CtrlCmd | KeyMod.Shift | KeyCode.Space,
                        command: 'aiExecution.triggerInlineCompletion',
                        when: undefined,
                        weight: 0,
                        extensionId: undefined,
                });

                // Ctrl/Cmd+Shift+Enter → Execute current AI plan
                KeybindingsRegistry.registerKeybinding({
                        keybinding: KeyMod.CtrlCmd | KeyMod.Shift | KeyCode.Enter,
                        command: 'aiExecution.executePlan',
                        when: undefined,
                        weight: 0,
                        extensionId: undefined,
                });

                // Ctrl/Cmd+Shift+R → Rollback last AI change
                KeybindingsRegistry.registerKeybinding({
                        keybinding: KeyMod.CtrlCmd | KeyMod.Shift | KeyCode.KeyR,
                        command: 'aiExecution.rollbackChange',
                        when: undefined,
                        weight: 0,
                        extensionId: undefined,
                });

                // Ctrl/Cmd+Shift+E → Toggle autonomous execution
                KeybindingsRegistry.registerKeybinding({
                        keybinding: KeyMod.CtrlCmd | KeyMod.Shift | KeyCode.KeyE,
                        command: 'aiExecution.toggleAutonomous',
                        when: undefined,
                        weight: 0,
                        extensionId: undefined,
                });

                this.logService.info('[AIProduct] Keybindings registered: Ctrl+Shift+J/K/M/A for views, Ctrl+Shift+Space/Enter/R/E for AI actions');
        }

        // =================================================================================
        // JARVIS CHAT → LLM PROVIDER WIRING
        // Handles chat messages by calling ILLMProviderService for real AI responses.
        // Falls back to streaming via ILLMStreamingService when available.
        // =================================================================================

        private async handleJarvisChatMessage(text: string): Promise<void> {
                this.logService.info(`[AIProduct] Jarvis chat message received: ${text.substring(0, 100)}`);

                // Add user message to conversation history
                this._jarvisConversationHistory.push({ role: 'user', content: text });

                // Keep conversation history to a reasonable window (last 20 messages)
                if (this._jarvisConversationHistory.length > 20) {
                        this._jarvisConversationHistory = this._jarvisConversationHistory.slice(-20);
                }

                try {
                        // Check if API key is configured for the active provider
                        const activeProviderId = this.llmProviderService.activeProviderId;
                        const hasKey = await this.credentialStoreService.hasKey(activeProviderId);

                        if (!hasKey) {
                                // No API key configured — prompt user
                                this._jarvisWebview?.postMessage({
                                        type: 'chatResponse',
                                        text: `No API key configured for provider "${activeProviderId}". Click the gear button or run "AI: Configure API Keys" from the command palette to set up your key.`,
                                        timestamp: Date.now(),
                                        model: activeProviderId,
                                        isError: true,
                                });
                                return;
                        }

                        // Build the LLM request with system prompt and conversation history
                        const systemMessage: LLMMessage = {
                                role: 'system',
                                content: 'You are Jarvis, an AI coding assistant integrated into the VibeCode editor. You help users with coding tasks, explain code, suggest improvements, and assist with the AI Execution workflow. Be concise, helpful, and accurate. When suggesting code, use markdown code blocks with the appropriate language tag.',
                        };

                        const provider = this.llmProviderService.getProvider(activeProviderId);
                        const model = provider?.defaultModel || 'gpt-4o';

                        const request: LLMRequest = {
                                model,
                                messages: [systemMessage, ...this._jarvisConversationHistory],
                                maxTokens: 2048,
                                temperature: 0.7,
                                requestId: `jarvis-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
                        };

                        // Send typing indicator while waiting
                        this._jarvisWebview?.postMessage({ type: 'typingStart' });

                        // Try to use streaming for real-time token delivery
                        let responseText = '';
                        let usedStreaming = false;

                        try {
                                // Attempt streaming via ILLMStreamingService if available
                                const streamingService = (this as any)._llmStreamingService as ILLMStreamingService | undefined;
                                if (streamingService && provider?.supportsStreaming) {
                                        usedStreaming = true;
                                        let accumulatedText = '';

                                        for await (const chunk of streamingService.streamRequest(request)) {
                                                if (chunk.type === 'token' && chunk.content) {
                                                        accumulatedText += chunk.content;
                                                        // Stream each token to the webview for real-time display
                                                        this._jarvisWebview?.postMessage({
                                                                type: 'chatStreamToken',
                                                                token: chunk.content,
                                                                timestamp: Date.now(),
                                                        });
                                                }
                                                if (chunk.type === 'done') {
                                                        responseText = accumulatedText;
                                                }
                                                if (chunk.type === 'error' && chunk.error) {
                                                        throw new Error(chunk.error);
                                                }
                                        }
                                }
                        } catch (streamError) {
                                // Streaming failed or unavailable, fall back to regular completion
                                this.logService.info(`[AIProduct] Streaming unavailable, falling back to regular completion: ${streamError}`);
                                usedStreaming = false;
                        }

                        if (!usedStreaming) {
                                // Regular (non-streaming) completion
                                const response = await this.llmProviderService.sendRequest(request);
                                responseText = response.content;
                        }

                        // Add assistant response to conversation history
                        this._jarvisConversationHistory.push({ role: 'assistant', content: responseText });

                        // Send final response to webview
                        this._jarvisWebview?.postMessage({
                                type: 'chatResponse',
                                text: responseText,
                                timestamp: Date.now(),
                                model: `${provider?.displayName || activeProviderId}/${model}`,
                                usedStreaming,
                        });

                        // Record success in health tracking
                        this.providerHealthService.recordSuccess(activeProviderId, Date.now() - parseInt(request.requestId.split('-')[1] || '0'));

                        this.logService.info(`[AIProduct] Jarvis LLM response received (${responseText.length} chars, streaming: ${usedStreaming})`);

                } catch (error: any) {
                        // Handle errors gracefully
                        const errorMessage = error?.message || String(error);
                        this.logService.error(`[AIProduct] Jarvis LLM error: ${errorMessage}`);

                        // Check for common error types
                        let userMessage: string;
                        if (errorMessage.includes('401') || errorMessage.includes('auth') || errorMessage.includes('API key')) {
                                userMessage = `Authentication failed. Your API key for "${this.llmProviderService.activeProviderId}" may be invalid or expired. Run "AI: Configure API Keys" to update it.`;
                        } else if (errorMessage.includes('429') || errorMessage.includes('rate')) {
                                userMessage = 'Rate limit exceeded. Please wait a moment and try again.';
                        } else if (errorMessage.includes('timeout') || errorMessage.includes('ETIMEDOUT')) {
                                userMessage = 'Request timed out. The provider may be experiencing high load. Try again in a moment.';
                        } else if (errorMessage.includes('network') || errorMessage.includes('ECONNREFUSED') || errorMessage.includes('fetch')) {
                                userMessage = 'Network error. Could not reach the AI provider. Check your internet connection and try again.';
                        } else {
                                userMessage = `Error: ${errorMessage}. Try again or switch providers via "AI: Configure API Keys".`;
                        }

                        this._jarvisWebview?.postMessage({
                                type: 'chatResponse',
                                text: userMessage,
                                timestamp: Date.now(),
                                model: this.llmProviderService.activeProviderId,
                                isError: true,
                        });

                        // Record failure in health tracking
                        this.providerHealthService.recordFailure(this.llmProviderService.activeProviderId, errorMessage);
                }
        }

        // =================================================================================
        // WEBVIEW MESSAGE HANDLING
        // All message types from the webview are handled here.
        // Phase 25 messages are wired to real services.
        // =================================================================================

        private handleWebviewMessage(msg: { type: string; [key: string]: any }): void {
                switch (msg.type) {
                        case 'createProject': {
                                const data = msg.data;
                                this.storageService.store(STORAGE_KEY_PROJECT, JSON.stringify(data), -1 /* StorageScope.APPLICATION */, 0 /* StorageTarget.USER */);
                                this.storageService.store(STORAGE_KEY_STEP, 1, -1 /* StorageScope.APPLICATION */, 0 /* StorageTarget.USER */);
                                this._onProjectCreated.fire(data);
                                this.logService.info(`[AIProduct] Project created: ${data.name}`);
                                break;
                        }
                        case 'submitIdea': {
                                this.storageService.store(STORAGE_KEY_STEP, 2, -1 /* StorageScope.APPLICATION */, 0 /* StorageTarget.USER */);
                                this.logService.info(`[AIProduct] Idea submitted: ${msg.idea?.substring(0, 50)}...`);
                                break;
                        }
                        case 'refineIdea': {
                                this.handleRefineIdea(msg.idea);
                                break;
                        }
                        case 'setConstraints': {
                                this.handleSetConstraints(msg.constraints);
                                break;
                        }
                        case 'generatePlan': {
                                this.handleGeneratePlan(msg.idea, msg.constraints);
                                break;
                        }
                        case 'startExecution': {
                                this.handleStartExecution(msg);
                                break;
                        }
                        case 'pauseExecution': {
                                this.autonomousExecutionService.pauseExecution();
                                this.logService.info('[AIProduct] Execution paused via webview');
                                break;
                        }
                        case 'resumeExecution': {
                                this.autonomousExecutionService.resumeExecution();
                                this.logService.info('[AIProduct] Execution resumed via webview');
                                break;
                        }
                        case 'stopExecution': {
                                this.autonomousExecutionService.stopExecution();
                                this.logService.info('[AIProduct] Execution stopped via webview');
                                break;
                        }
                        case 'approveMilestone': {
                                this.autonomousExecutionService.approveMilestone(msg.milestoneId);
                                this.logService.info(`[AIProduct] Milestone approved: ${msg.milestoneId}`);
                                break;
                        }
                        case 'rejectMilestone': {
                                this.autonomousExecutionService.rejectMilestone(msg.milestoneId, msg.reason || 'Rejected by user');
                                this.logService.info(`[AIProduct] Milestone rejected: ${msg.milestoneId}`);
                                break;
                        }
                        case 'retryMilestone': {
                                // Retry = reject then resume
                                this.autonomousExecutionService.rejectMilestone(msg.milestoneId, 'Retrying milestone');
                                this.autonomousExecutionService.resumeExecution();
                                this.logService.info(`[AIProduct] Milestone retried: ${msg.milestoneId}`);
                                break;
                        }
                        case 'restoreCheckpoint': {
                                this.handleRestoreCheckpoint(msg.checkpointId);
                                break;
                        }
                        case 'exportResults': {
                                this.handleExportResults();
                                break;
                        }
                        case 'changeProvider': {
                                this.llmProviderService.setActiveProvider(msg.providerId);
                                this.logService.info(`[AIProduct] Provider changed to: ${msg.providerId}`);
                                break;
                        }
                        case 'changeTheme': {
                                this.realUIIntegrationService.setTheme(msg.theme as AITheme);
                                this.logService.info(`[AIProduct] Theme changed to: ${msg.theme}`);
                                break;
                        }
                        case 'saveApiKey': {
                                this.credentialStoreService.storeKey(msg.providerId, msg.key);
                                this.logService.info(`[AIProduct] API key saved for provider: ${msg.providerId}`);
                                break;
                        }
                        case 'stepChange': {
                                this.storageService.store(STORAGE_KEY_STEP, msg.step, -1 /* StorageScope.APPLICATION */, 0 /* StorageTarget.USER */);
                                this._onStepChanged.fire(msg.step);
                                break;
                        }
                        case 'openSettings': {
                                this.logService.info('[AIProduct] Settings opened');
                                break;
                        }
                        case 'scanRepository': {
                                this.handleScanRepository(msg.rootPath);
                                break;
                        }
                        case 'readFile': {
                                this.handleReadFile(msg.filePath);
                                break;
                        }
                        case 'writeFile': {
                                this.handleWriteFile(msg.filePath, msg.content);
                                break;
                        }
                        case 'applyEdit': {
                                this.handleApplyEdit(msg.operation);
                                break;
                        }
                        case 'gitStatus': {
                                this.handleGitStatus(msg.repoPath);
                                break;
                        }
                        case 'gitCommit': {
                                this.handleGitCommit(msg.repoPath, msg.message, msg.files);
                                break;
                        }
                        case 'gitCheckpoint': {
                                this.handleGitCheckpoint(msg.repoPath, msg.label);
                                break;
                        }
                        case 'verifyBuild': {
                                this.handleVerifyBuild(msg.projectPath);
                                break;
                        }
                        case 'verifyLint': {
                                this.handleVerifyLint(msg.projectPath);
                                break;
                        }
                        case 'compressMemory': {
                                this.handleCompressMemory(msg.memories);
                                break;
                        }
                        case 'optimizeContext': {
                                this.handleOptimizeContext(msg.files, msg.maxTokens, msg.currentTask);
                                break;
                        }
                        case 'startAutonomousLoop': {
                                const plan = msg.plan;
                                if (plan) {
                                        this.executionLoopService.start(plan).catch(err => {
                                                this.logService.error('[AIProduct] Autonomous loop start failed:', err);
                                        });
                                }
                                break;
                        }
                        case 'pauseLoop': {
                                this.executionLoopService.pause();
                                break;
                        }
                        case 'resumeLoop': {
                                this.executionLoopService.resume();
                                break;
                        }
                        case 'stopLoop': {
                                this.executionLoopService.stop();
                                break;
                        }
                        case 'retryStep': {
                                this.executionLoopService.retryCurrentStep().catch(err => {
                                        this.logService.error('[AIProduct] Retry failed:', err);
                                });
                                break;
                        }
                        case 'rollbackCheckpoint': {
                                this.executionLoopService.rollbackToLastCheckpoint().then(success => {
                                        this.postToWebview({ type: 'rollbackResult', success });
                                });
                                break;
                        }
                        case 'getLoopState': {
                                const state = this.executionLoopService.getState();
                                const progress = this.executionLoopService.getProgress();
                                const currentMilestone = this.executionLoopService.getCurrentMilestone();
                                const currentStep = this.executionLoopService.getCurrentStep();
                                const repairStats = this.executionLoopService.getRepairStats();
                                this.postToWebview({ type: 'loopState', state, progress, currentMilestone, currentStep, repairStats });
                                break;
                        }
                        case 'executeCommand': {
                                const { command, cwd, timeout } = msg;
                                this.terminalBridgeService.executeWithOutputCapture(command, cwd, timeout).then(result => {
                                        this.postToWebview({ type: 'commandResult', result });
                                }).catch(err => {
                                        this.postToWebview({ type: 'commandResult', result: { success: false, exitCode: -1, stdout: '', stderr: String(err), duration: 0, timedOut: false, command, timestamp: Date.now(), mode: 'commandService' } });
                                });
                                break;
                        }
                        case 'checkCrashRecovery': {
                                const hasRecovery = this.executionLoopService.hasCrashRecoveryState();
                                if (hasRecovery) {
                                        this.postToWebview({ type: 'crashRecoveryAvailable', hasRecovery: true });
                                }
                                break;
                        }
                        case 'restoreFromCrash': {
                                this.executionLoopService.restoreCrashRecoveryState().then(success => {
                                        this.postToWebview({ type: 'crashRecoveryResult', success });
                                });
                                break;
                        }
                        case 'getState': {
                                // State was already sent in the resolver
                                break;
                        }
                        default: {
                                this.logService.warn(`[AIProduct] Unknown webview message type: ${msg.type}`);
                        }
                }
        }

        // =================================================================================
        // PHASE 25 MESSAGE HANDLERS
        // Each handler wires a webview action to one or more Phase 25 services.
        // =================================================================================

        private async handleRefineIdea(idea: string): Promise<void> {
                this.logService.info('[AIProduct] Refining idea via LLM provider');
                try {
                        const response = await this.llmProviderService.sendRequest([
                                { role: 'system', content: 'You are an expert product strategist. Refine and expand the following idea into a clear, structured product vision with key features, target users, and success metrics.' },
                                { role: 'user', content: idea },
                        ]);
                        this.postToWebview({ type: 'refinedIdea', content: response.content });
                        this.logService.info('[AIProduct] Idea refinement complete');
                } catch (err) {
                        this.logService.error('[AIProduct] Idea refinement failed:', err);
                        this.postToWebview({ type: 'refinedIdea', content: '', error: String(err) });
                }
        }

        private async handleSetConstraints(constraints: string[]): Promise<void> {
                this.logService.info(`[AIProduct] Storing ${constraints.length} constraints in project memory`);
                try {
                        await this.projectMemoryService.store(MemoryType.UserPreference, {
                                category: 'constraints',
                                data: constraints,
                                priority: MemoryPriority.High,
                        });
                        this.storageService.store(STORAGE_KEY_CONSTRAINTS, JSON.stringify(constraints), -1, 0);
                        this.logService.info('[AIProduct] Constraints stored successfully');
                } catch (err) {
                        this.logService.error('[AIProduct] Failed to store constraints:', err);
                }
        }

        private async handleGeneratePlan(idea: string, constraints: string[]): Promise<void> {
                this.logService.info('[AIProduct] Generating execution plan via LLM');
                try {
                        const constraintText = constraints.length > 0
                                ? `\n\nConstraints:\n${constraints.map((c: string, i: number) => `${i + 1}. ${c}`).join('\n')}`
                                : '';
                        const response = await this.llmProviderService.sendRequest([
                                { role: 'system', content: 'You are a project planner. Create a detailed execution plan with milestones. Output as JSON with a "milestones" array, each having "id", "name", "description", "tasks" (array of strings), and "estimatedTokens" fields.' },
                                { role: 'user', content: `Idea: ${idea}${constraintText}` },
                        ]);

                        // Parse the plan from the LLM response
                        let plan: any;
                        try {
                                // Try to extract JSON from the response (may be wrapped in markdown code block)
                                const jsonMatch = response.content.match(/```json\s*([\s\S]*?)\s*```/);
                                const jsonStr = jsonMatch ? jsonMatch[1] : response.content;
                                plan = JSON.parse(jsonStr);
                        } catch {
                                // If parsing fails, create a basic plan from the text response
                                plan = {
                                        milestones: [{
                                                id: 'm1',
                                                name: 'Project Setup',
                                                description: response.content.substring(0, 200),
                                                tasks: ['Initialize project structure', 'Configure environment', 'Set up dependencies'],
                                                estimatedTokens: 2000,
                                        }],
                                };
                        }

                        // Store the plan in project memory
                        await this.projectMemoryService.store(MemoryType.Planning, {
                                category: 'executionPlan',
                                data: plan,
                                priority: MemoryPriority.Critical,
                        });
                        this._cachedPlan = plan;
                        this.storageService.store(STORAGE_KEY_PLAN, JSON.stringify(plan), -1, 0);

                        this.postToWebview({ type: 'executionPlan', plan });
                        this.logService.info(`[AIProduct] Execution plan generated with ${plan.milestones?.length ?? 0} milestones`);
                } catch (err) {
                        this.logService.error('[AIProduct] Plan generation failed:', err);
                        this.postToWebview({ type: 'executionPlan', plan: null, error: String(err) });
                }
        }

        private async handleStartExecution(msg: { mode?: string; [key: string]: any }): Promise<void> {
                this.logService.info('[AIProduct] Starting autonomous execution');
                try {
                        // Load cached plan or try from storage
                        let plan = this._cachedPlan;
                        if (!plan) {
                                const saved = this.storageService.get(STORAGE_KEY_PLAN, undefined);
                                if (saved) {
                                        plan = JSON.parse(saved);
                                }
                        }
                        if (!plan) {
                                this.logService.warn('[AIProduct] No execution plan found, cannot start');
                                this.postToWebview({ type: 'executionError', error: 'No execution plan found. Generate a plan first.' });
                                return;
                        }

                        // Create the ExecutionPlan object expected by the autonomous execution service
                        const executionPlan = {
                                id: `plan-${Date.now()}`,
                                idea: this.getCurrentProjectName(),
                                constraints: this.loadConstraints(),
                                milestones: (plan.milestones || []).map((m: any, idx: number) => ({
                                        id: m.id || `milestone-${idx}`,
                                        name: m.name,
                                        description: m.description || '',
                                        tasks: m.tasks || [],
                                        status: 'pending' as const,
                                        approvalMode: msg.mode === 'stepbystep' ? ApprovalMode.Manual : ApprovalMode.Automatic,
                                })),
                        };

                        await this.autonomousExecutionService.startExecution(executionPlan);
                        this.storageService.store(STORAGE_KEY_STEP, 4, -1, 0);
                        this._onExecutionStarted.fire({ mode: msg.mode || 'autonomous', project: this.getCurrentProjectName() });
                        this.logService.info(`[AIProduct] Execution started with ${executionPlan.milestones.length} milestones`);
                } catch (err) {
                        this.logService.error('[AIProduct] Failed to start execution:', err);
                        this.postToWebview({ type: 'executionError', error: String(err) });
                }
        }

        private async handleRestoreCheckpoint(checkpointId: string): Promise<void> {
                this.logService.info(`[AIProduct] Restoring checkpoint: ${checkpointId}`);
                try {
                        await this.projectMemoryService.restoreCheckpoint(checkpointId);
                        this.postToWebview({ type: 'checkpointRestored', checkpointId });
                        this.logService.info(`[AIProduct] Checkpoint restored: ${checkpointId}`);
                } catch (err) {
                        this.logService.error('[AIProduct] Failed to restore checkpoint:', err);
                        this.postToWebview({ type: 'checkpointRestoreFailed', checkpointId, error: String(err) });
                }
        }

        private async handleExportResults(): Promise<void> {
                this.logService.info('[AIProduct] Exporting project results');
                try {
                        const projectName = this.getCurrentProjectName();
                        const allMemory = await this.projectMemoryService.getAllForProject(projectName);
                        const exportData = {
                                project: projectName,
                                exportedAt: new Date().toISOString(),
                                memory: allMemory,
                                plan: this._cachedPlan,
                                history: this.storageService.get(STORAGE_KEY_HISTORY, undefined),
                        };
                        // Post the export data back to the webview for download handling
                        this.postToWebview({ type: 'exportData', data: exportData });
                        this.logService.info('[AIProduct] Export data sent to webview');
                } catch (err) {
                        this.logService.error('[AIProduct] Export failed:', err);
                        this.postToWebview({ type: 'exportError', error: String(err) });
                }
        }

        // =================================================================================
        // PHASE 27 MESSAGE HANDLERS
        // Each handler wires a webview action to one or more Phase 27 services.
        // =================================================================================

        private async handleScanRepository(rootPath: string): Promise<void> {
                this.logService.info('[AIProduct] Scanning repository:', rootPath);
                try {
                        const result = await this.repositoryIntelligenceService.scanRepository(rootPath);
                        const topDeps = result.dependencyGraph
                                .sort((a, b) => b.importedBy.length - a.importedBy.length)
                                .slice(0, 10)
                                .map(d => ({ path: d.path, importedBy: d.importedBy.length }));
                        this.postToWebview({
                                type: 'repoScanResult',
                                data: {
                                        projectType: result.projectType,
                                        languages: result.languages,
                                        frameworks: result.frameworks.map(f => f.name),
                                        topDependencies: topDeps,
                                        fileCount: result.fileCount,
                                },
                        });
                } catch (err) {
                        this.logService.error('[AIProduct] Repository scan failed:', err);
                        this.postToWebview({ type: 'repoScanResult', data: { projectType: 'Unknown', languages: [], frameworks: [], topDependencies: [], fileCount: 0 }, error: String(err) });
                }
        }

        private async handleReadFile(filePath: string): Promise<void> {
                try {
                        const result = await this.codeEditingService.readFile(filePath);
                        this.postToWebview({ type: 'fileContent', filePath, content: result.content, encoding: result.encoding, lineEnding: result.lineEnding });
                } catch (err) {
                        this.logService.error('[AIProduct] Read file failed:', err);
                        this.postToWebview({ type: 'fileContent', filePath, content: '', error: String(err) });
                }
        }

        private async handleWriteFile(filePath: string, content: string): Promise<void> {
                try {
                        const result = await this.codeEditingService.writeFile(filePath, content);
                        this.postToWebview({ type: 'writeResult', success: result.success, filePath: result.filePath, error: result.error });
                } catch (err) {
                        this.logService.error('[AIProduct] Write file failed:', err);
                        this.postToWebview({ type: 'writeResult', success: false, filePath, error: String(err) });
                }
        }

        private async handleApplyEdit(operation: any): Promise<void> {
                try {
                        const result = await this.codeEditingService.applyEdit(operation);
                        this.postToWebview({ type: 'editResult', success: result.success, filePath: result.filePath, error: result.error, backupPath: result.backupPath });
                } catch (err) {
                        this.logService.error('[AIProduct] Apply edit failed:', err);
                        this.postToWebview({ type: 'editResult', success: false, filePath: operation?.filePath, error: String(err) });
                }
        }

        private async handleGitStatus(repoPath: string): Promise<void> {
                try {
                        const status = await this.gitWorkflowService.getStatus(repoPath);
                        this.postToWebview({ type: 'gitStatus', data: { branch: status.branch, staged: status.staged.length, modified: status.modified.length, untracked: status.untracked.length, deleted: status.deleted.length, isClean: status.isClean } });
                        const commits = await this.gitWorkflowService.getLog(repoPath, 5);
                        this.postToWebview({ type: 'gitCommits', commits: commits.map(c => ({ hash: c.hash, shortHash: c.shortHash, message: c.message, date: c.date })) });
                } catch (err) {
                        this.logService.error('[AIProduct] Git status failed:', err);
                }
        }

        private async handleGitCommit(repoPath: string, message: string, files?: string[]): Promise<void> {
                try {
                        const result = await this.gitWorkflowService.commit(repoPath, message, files);
                        this.logService.info('[AIProduct] Git commit result:', result?.shortHash);
                        this.handleGitStatus(repoPath);
                } catch (err) {
                        this.logService.error('[AIProduct] Git commit failed:', err);
                }
        }

        private async handleGitCheckpoint(repoPath: string, label: string): Promise<void> {
                try {
                        const result = await this.gitWorkflowService.createCheckpointCommit(repoPath, label);
                        this.logService.info('[AIProduct] Checkpoint created:', result?.shortHash);
                        this.handleGitStatus(repoPath);
                } catch (err) {
                        this.logService.error('[AIProduct] Checkpoint creation failed:', err);
                }
        }

        private async handleVerifyBuild(projectPath: string): Promise<void> {
                try {
                        const result = await this.executionVerificationService.verifyBuild(projectPath);
                        this.postToWebview({ type: 'buildVerification', status: result.status, errors: result.errors, warnings: result.warnings, duration: result.duration });
                        this.logService.info('[AIProduct] Build verification:', result.status);
                } catch (err) {
                        this.logService.error('[AIProduct] Build verification failed:', err);
                }
        }

        private async handleVerifyLint(projectPath: string): Promise<void> {
                try {
                        const result = await this.executionVerificationService.verifyLint(projectPath);
                        this.postToWebview({ type: 'lintVerification', status: result.status, errors: result.errors, warnings: result.warnings, duration: result.duration });
                } catch (err) {
                        this.logService.error('[AIProduct] Lint verification failed:', err);
                }
        }

        private async handleCompressMemory(memories: any[]): Promise<void> {
                try {
                        const compressed = await this.longHorizonMemoryService.compressMemories(memories);
                        const totalOriginal = compressed.reduce((s, m) => s + m.originalTokenCount, 0);
                        const totalCompressed = compressed.reduce((s, m) => s + m.tokenCount, 0);
                        const tokensSaved = totalOriginal - totalCompressed;
                        const ratio = totalCompressed > 0 ? totalOriginal / totalCompressed : 1;
                        this.postToWebview({
                                type: 'memoryCompression',
                                data: {
                                        ratio,
                                        entriesCompressed: compressed.length,
                                        tokensSaved,
                                        utilizationPercent: (totalCompressed / 50000) * 100,
                                },
                        });
                } catch (err) {
                        this.logService.error('[AIProduct] Memory compression failed:', err);
                }
        }

        private async handleOptimizeContext(files: { path: string; content: string }[], maxTokens: number, currentTask: string): Promise<void> {
                try {
                        const window = this.contextWindowOptimizationService.buildContextWindow(files, maxTokens, currentTask);
                        this.postToWebview({
                                type: 'contextUsage',
                                data: {
                                        used: window.totalTokens,
                                        max: window.maxTokens,
                                        available: window.maxTokens - window.totalTokens,
                                        utilizationPercent: window.utilizationPercent,
                                },
                        });
                } catch (err) {
                        this.logService.error('[AIProduct] Context optimization failed:', err);
                }
        }

        // =================================================================================
        // PHASE 25 SERVICE EVENT WIRING
        // Listens to service events and forwards updates to the active webview.
        // =================================================================================

        private wirePhase25ServiceEvents(): void {
                // Execution stage changes
                this._register(this.autonomousExecutionService.onDidChangeStage((stage: ExecutionStage) => {
                        this.logService.info(`[AIProduct] Execution stage changed: ${stage}`);
                        this.postToWebview({
                                type: 'executionUpdate',
                                stage,
                                timestamp: Date.now(),
                        });
                }));

                // Milestone completion
                this._register(this.autonomousExecutionService.onDidCompleteMilestone((milestone: any) => {
                        this.logService.info(`[AIProduct] Milestone completed: ${milestone.id}`);
                        this.postToWebview({
                                type: 'milestoneCompleted',
                                milestoneId: milestone.id,
                                milestoneName: milestone.name,
                                timestamp: Date.now(),
                        });
                }));

                // Approval needed
                this._register(this.autonomousExecutionService.onDidNeedApproval((milestone: any) => {
                        this.logService.info(`[AIProduct] Approval needed for milestone: ${milestone.id}`);
                        this.postToWebview({
                                type: 'approvalNeeded',
                                milestoneId: milestone.id,
                                milestoneName: milestone.name,
                        });
                }));

                // Execution complete
                this._register(this.autonomousExecutionService.onDidComplete((summary: any) => {
                        this.logService.info('[AIProduct] Execution completed');
                        this.postToWebview({
                                type: 'executionComplete',
                                summary,
                        });
                }));

                // Provider health changes
                this._register(this.providerHealthService.onDidChangeHealth((health: any) => {
                        this.logService.info(`[AIProduct] Provider health changed: ${health.providerId}`);
                        this.postToWebview({
                                type: 'providerHealthUpdate',
                                providerId: health.providerId,
                                status: health.status,
                                latency: health.latency,
                        });
                }));
        }

        // =================================================================================
        // PHASE 27 SERVICE EVENT WIRING
        // Wires autonomous repair and context optimization events to the webview.
        // =================================================================================

        private wirePhase27ServiceEvents(): void {
                // Wire autonomous repair events
                this._register(this.autonomousExecutionService.onExecutionEvent((event: any) => {
                        if (event.type === 'repair') {
                                this.postToWebview({
                                        type: 'repairAttempt',
                                        data: {
                                                attemptsUsed: event.attemptsUsed || 0,
                                                maxAttempts: event.maxAttempts || 3,
                                                attempts: event.attempts || [],
                                        },
                                });
                        }
                        // Post autonomous decisions to the decision log
                        if (event.type === 'decision') {
                                this.postToWebview({
                                        type: 'decisionLog',
                                        data: {
                                                timestamp: Date.now(),
                                                type: event.decisionType || 'execution',
                                                text: event.description || '',
                                        },
                                });
                        }
                }));

                // Wire context usage updates during execution
                this._register(this.autonomousExecutionService.onExecutionEvent((event: any) => {
                        if (event.type === 'tokenUpdate') {
                                this.postToWebview({
                                        type: 'contextUsage',
                                        data: {
                                                used: event.tokensUsed || 0,
                                                max: event.maxTokens || 128000,
                                                available: (event.maxTokens || 128000) - (event.tokensUsed || 0),
                                                utilizationPercent: event.utilizationPercent || 0,
                                        },
                                });
                        }
                }));

                this.logService.info('[AIProduct] Phase 27 service events wired');
        }

        // =================================================================================
        // PHASE 28 SERVICE EVENT WIRING
        // Wires the autonomous execution loop and terminal bridge events to the webview.
        // =================================================================================

        private wirePhase28ServiceEvents(): void {
                // Wire loop state changes to webview
                this._register(this.executionLoopService.onStateChange((state: LoopState) => {
                        this.postToWebview({ type: 'loopStateChange', state });
                }));

                // Wire milestone updates
                this._register(this.executionLoopService.onMilestoneUpdate((milestone: any) => {
                        this.postToWebview({ type: 'milestoneUpdate', milestone });
                }));

                // Wire step updates
                this._register(this.executionLoopService.onStepUpdate((step: any) => {
                        this.postToWebview({ type: 'stepUpdate', step });
                }));

                // Wire repair attempts
                this._register(this.executionLoopService.onRepairAttempt((repair: any) => {
                        this.postToWebview({ type: 'repairAttempt', repair });
                }));

                // Wire terminal bridge events
                this._register(this.terminalBridgeService.onExecutionEvent((event: ExecutionEvent) => {
                        this.postToWebview({ type: 'executionEvent', event });
                }));

                // Check for crash recovery on startup
                if (this.executionLoopService.hasCrashRecoveryState()) {
                        this.postToWebview({ type: 'crashRecoveryAvailable', hasRecovery: true });
                }

                this.logService.info('[AIProduct] Phase 28 service events wired');
        }

        // =================================================================================
        // CRASH RECOVERY
        // On startup, check if there is a crashed session to recover.
        // =================================================================================

        private async checkCrashRecovery(): Promise<void> {
                try {
                        const didRecover = await this.projectMemoryService.didCrashRecover();
                        if (didRecover) {
                                this.logService.info('[AIProduct] Crash recovery detected, notifying webview');
                                // Find the most recent checkpoint and last step
                                const checkpoints = await this.projectMemoryService.getCheckpoints();
                                const lastCheckpoint = checkpoints.length > 0 ? checkpoints[checkpoints.length - 1] : null;
                                const lastStep = this.storageService.getNumber(STORAGE_KEY_STEP, undefined) ?? 0;
                                this.postToWebview({
                                        type: 'crashRecovery',
                                        checkpoint: lastCheckpoint,
                                        lastStep,
                                });
                        }
                } catch (err) {
                        this.logService.error('[AIProduct] Crash recovery check failed:', err);
                }
        }

        // =================================================================================
        // EXISTING SERVICE EVENT WIRING
        // =================================================================================

        private wireServiceEvents(): void {
                // Wire execution service events to update the UI
                this._register(this.executionService.onDidChangeExecutionGraph(() => {
                        this.logService.info('[AIProduct] Execution graph changed, UI should update');
                }));

                // Wire state service events
                this._register(this.stateService.onDidChangeState(() => {
                        this.logService.info('[AIProduct] State changed, UI should update');
                }));
        }

        // =================================================================================
        // HELPERS
        // =================================================================================

        /** Post a message to the active webview, if one is available. */
        private postToWebview(msg: object): void {
                if (this._activeWebview) {
                        this._activeWebview.postMessage(msg);
                } else {
                        this.logService.warn('[AIProduct] Cannot post to webview: no active webview reference');
                }
        }

        private getCurrentProjectName(): string {
                try {
                        const saved = this.storageService.get(STORAGE_KEY_PROJECT, undefined);
                        if (saved) {
                                return JSON.parse(saved).name || 'unknown';
                        }
                } catch { /* ignore */ }
                return 'unknown';
        }

        private loadConstraints(): string[] {
                try {
                        const saved = this.storageService.get(STORAGE_KEY_CONSTRAINTS, undefined);
                        if (saved) {
                                return JSON.parse(saved);
                        }
                } catch { /* ignore */ }
                return [];
        }

        /**
         * Returns HTML for the Projects sidebar view.
         */
        private getProjectsHTML(): string {
                const saved = this.storageService.get(STORAGE_KEY_PROJECT, undefined);
                let projectList = '';
                if (saved) {
                        try {
                                const project = JSON.parse(saved);
                                const icon = renderIcon('project', 16);
                                projectList = `
<div style="padding:8px;display:flex;align-items:center;gap:8px;border-bottom:1px solid var(--vscode-panel-border);">
  ${icon}
  <div style="flex:1;">
    <div style="font-size:13px;font-weight:500;">${project.name}</div>
    <div style="font-size:11px;color:var(--vscode-descriptionForeground);">${project.description || 'No description'}</div>
  </div>
  <span style="font-size:10px;color:var(--vscode-testing-iconPassed);">Active</span>
</div>`;
                        } catch { /* ignore */ }
                }

                if (!projectList) {
                        const emptyIcon = renderIcon('folder', 32);
                        projectList = `
<div style="display:flex;flex-direction:column;align-items:center;padding:48px 16px;text-align:center;">
  <div style="color:var(--vscode-disabledForeground);margin-bottom:12px;">${emptyIcon}</div>
  <div style="font-size:14px;font-weight:500;">No projects yet</div>
  <div style="font-size:12px;color:var(--vscode-descriptionForeground);margin-top:4px;">Create a project in the AI Workflow panel</div>
</div>`;
                }

                return `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><style>
body { font-family: var(--vscode-font-family); margin: 0; padding: 0; background: var(--vscode-sideBar-background); color: var(--vscode-foreground); }
</style></head><body>${projectList}</body></html>`;
        }

        /**
         * Returns HTML for the Timeline sidebar view.
         */
        private getTimelineHTML(): string {
                const historyJson = this.storageService.get(STORAGE_KEY_HISTORY, undefined);
                let timeline = '';
                if (historyJson) {
                        try {
                                const entries = JSON.parse(historyJson);
                                for (const entry of entries.slice(-10)) {
                                        timeline += `
<div style="display:flex;gap:8px;padding:6px 0;">
  <div style="width:8px;height:8px;border-radius:50%;margin-top:5px;flex-shrink:0;background:var(--vscode-button-background);"></div>
  <div style="flex:1;">
    <div style="font-size:12px;">${entry.title}</div>
    <div style="font-size:10px;color:var(--vscode-descriptionForeground);">${entry.time}</div>
  </div>
</div>`;
                                }
                        } catch { /* ignore */ }
                }

                if (!timeline) {
                        const emptyIcon = renderIcon('history', 32);
                        timeline = `
<div style="display:flex;flex-direction:column;align-items:center;padding:48px 16px;text-align:center;">
  <div style="color:var(--vscode-disabledForeground);margin-bottom:12px;">${emptyIcon}</div>
  <div style="font-size:14px;font-weight:500;">No execution history</div>
  <div style="font-size:12px;color:var(--vscode-descriptionForeground);margin-top:4px;">Execute a plan to see timeline entries</div>
</div>`;
                }

                return `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><style>
body { font-family: var(--vscode-font-family); margin: 0; padding: 8px; background: var(--vscode-sideBar-background); color: var(--vscode-foreground); }
</style></head><body>${timeline}</body></html>`;
        }

        // =================================================================================
        // MEMORY VISUALIZATION HTML
        // Calls the MemoryVisualizationService to produce a complete self-contained
        // HTML document with budget gauge, timeline, and filterable entry cards.
        // =================================================================================

        private getMemoryVisualizationHTML(): string {
                // Build sample data from the real project memory service
                const memoryData = this.realUIIntegrationService.getMemoryDashboardData();
                const entries: MemoryEntry[] = memoryData.entryTypes.map((et: { type: string; count: number }, i: number) => ({
                        id: `mem-${i}`,
                        type: et.type,
                        content: `${et.count} ${et.type} entries in project memory`,
                        priority: (i === 0 ? 'high' : i < 3 ? 'medium' : 'low') as MemoryEntry['priority'],
                        tags: [et.type, 'project'],
                        tokenCount: et.count * 150,
                        createdAt: Date.now() - (i * 3600000),
                        updatedAt: Date.now(),
                        relevanceScore: Math.max(0, 1 - i * 0.15),
                }));

                const budget: TokenBudget = {
                        used: memoryData.totalTokens,
                        total: 50000,
                        percentage: memoryData.totalTokens > 0 ? (memoryData.totalTokens / 50000) * 100 : 0,
                };

                return this.memoryVisualizationService.renderMemoryOverview(entries, budget);
        }

        // =================================================================================
        // JARVIS CHAT HTML
        // Self-contained HTML for the Jarvis AI chat interface.
        // Communicates with the host via postMessage for bidirectional chat.
        // =================================================================================

        private getJarvisHTML(): string {
                return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Jarvis Chat</title>
<style>
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
:root {
  --bg: var(--vscode-editor-background, #1e1e2e);
  --fg: var(--vscode-editor-foreground, #cccccc);
  --surface: var(--vscode-editorWidget-background, #252526);
  --border: var(--vscode-panel-border, #474747);
  --accent: var(--vscode-button-background, #6c8cff);
  --accent-fg: var(--vscode-button-foreground, #ffffff);
  --input-bg: var(--vscode-input-background, #3c3c3c);
  --input-fg: var(--vscode-input-foreground, #cccccc);
  --input-border: var(--vscode-input-border, #3c3c3c);
  --focus-border: var(--vscode-focusBorder, #6c8cff);
  --muted: var(--vscode-descriptionForeground, #8b8b8b);
  --font: var(--vscode-font-family, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif);
  --font-mono: var(--vscode-editor-font-family, 'Cascadia Code', 'Fira Code', Consolas, monospace);
}
body {
  font-family: var(--font); font-size: 13px; color: var(--fg);
  background: var(--bg); height: 100vh; display: flex; flex-direction: column;
}
.header {
  padding: 10px 14px; border-bottom: 1px solid var(--border);
  display: flex; align-items: center; gap: 8px; flex-shrink: 0;
}
.header-icon { color: var(--accent); font-size: 18px; }
.header-title { font-weight: 600; font-size: 14px; }
.header-subtitle { font-size: 11px; color: var(--muted); margin-left: auto; }
.messages {
  flex: 1; overflow-y: auto; padding: 12px 14px;
  display: flex; flex-direction: column; gap: 10px;
}
.msg { display: flex; gap: 10px; max-width: 95%; }
.msg.user { align-self: flex-end; flex-direction: row-reverse; }
.msg-avatar {
  width: 28px; height: 28px; border-radius: 50%; display: flex;
  align-items: center; justify-content: center; flex-shrink: 0;
  font-size: 12px; font-weight: 700;
}
.msg.assistant .msg-avatar { background: rgba(108,140,255,0.2); color: var(--accent); }
.msg.user .msg-avatar { background: rgba(74,222,128,0.2); color: #4ade80; }
.msg-bubble {
  padding: 8px 12px; border-radius: 10px; font-size: 13px;
  line-height: 1.5; word-break: break-word;
}
.msg.assistant .msg-bubble { background: var(--surface); border: 1px solid var(--border); }
.msg.user .msg-bubble { background: rgba(108,140,255,0.15); border: 1px solid rgba(108,140,255,0.2); }
.msg-time { font-size: 10px; color: var(--muted); margin-top: 4px; }
.typing-indicator {
  display: flex; gap: 4px; padding: 8px 12px; background: var(--surface);
  border: 1px solid var(--border); border-radius: 10px; width: fit-content;
}
.typing-dot {
  width: 6px; height: 6px; border-radius: 50%; background: var(--muted);
  animation: typingBounce 1.4s ease-in-out infinite;
}
.typing-dot:nth-child(2) { animation-delay: 0.2s; }
.typing-dot:nth-child(3) { animation-delay: 0.4s; }
@keyframes typingBounce {
  0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
  30% { transform: translateY(-4px); opacity: 1; }
}
.input-area {
  padding: 10px 14px; border-top: 1px solid var(--border);
  display: flex; gap: 8px; flex-shrink: 0;
}
.chat-input {
  flex: 1; padding: 8px 12px; background: var(--input-bg);
  border: 1px solid var(--input-border); border-radius: 6px;
  color: var(--input-fg); font-family: var(--font); font-size: 13px;
  outline: none; resize: none; min-height: 36px; max-height: 120px;
}
.chat-input:focus { border-color: var(--focus-border); }
.chat-input::placeholder { color: var(--muted); }
.send-btn {
  padding: 8px 14px; background: var(--accent); color: var(--accent-fg);
  border: none; border-radius: 6px; cursor: pointer; font-size: 13px;
  font-weight: 600; transition: opacity 0.15s;
}
.send-btn:hover { opacity: 0.9; }
.send-btn:disabled { opacity: 0.4; cursor: default; }
::-webkit-scrollbar { width: 6px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 3px; }
::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.14); }
</style>
</head>
<body>
<div class="header">
  <span class="header-icon">\u2728</span>
  <span class="header-title">Jarvis</span>
  <span class="header-subtitle">VibeCode AI Assistant</span>
  <button class="gear-btn" id="gearBtn" onclick="configureKeys()" title="Configure API Keys" style="margin-left:auto;background:none;border:none;color:var(--muted);cursor:pointer;padding:4px 8px;font-size:16px;line-height:1;">\u2699</button>
  <button class="clear-btn" id="clearBtn" onclick="clearHistory()" title="Clear Chat History" style="background:none;border:none;color:var(--muted);cursor:pointer;padding:4px 8px;font-size:14px;line-height:1;">\u2715</button>
</div>
<div class="messages" id="messages">
  <div class="msg assistant">
    <div class="msg-avatar">J</div>
    <div>
      <div class="msg-bubble">Hello! I'm Jarvis, your VibeCode AI assistant. I can help with code generation, debugging, project management, and more. What would you like to work on?</div>
      <div class="msg-time">Just now</div>
    </div>
  </div>
</div>
<div class="input-area">
  <textarea class="chat-input" id="chatInput" placeholder="Ask Jarvis anything..." rows="1"
    onkeydown="if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();sendMessage();}"></textarea>
  <button class="send-btn" id="sendBtn" onclick="sendMessage()">Send</button>
</div>
<script>
(function() {
  'use strict';
  var vscode = acquireVsCodeApi ? acquireVsCodeApi() : null;
  var messagesEl = document.getElementById('messages');
  var inputEl = document.getElementById('chatInput');
  var sendBtn = document.getElementById('sendBtn');

  function addMessage(text, role, model) {
    var typingEl = document.querySelector('.typing-indicator');
    if (typingEl) typingEl.remove();
    var msgDiv = document.createElement('div');
    msgDiv.className = 'msg ' + role;
    var avatar = role === 'user' ? 'U' : 'J';
    var time = new Date().toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'});
    var modelTag = (role === 'assistant' && model) ? ' <span style="font-size:9px;color:var(--muted);opacity:0.7;">(' + escapeHtml(model) + ')</span>' : '';
    msgDiv.innerHTML = '<div class="msg-avatar">' + avatar + '</div><div>' +
      '<div class="msg-bubble">' + escapeHtml(text) + '</div>' +
      '<div class="msg-time">' + time + modelTag + '</div></div>';
    messagesEl.appendChild(msgDiv);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function showTyping() {
    var typing = document.createElement('div');
    typing.className = 'typing-indicator';
    typing.innerHTML = '<div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div>';
    messagesEl.appendChild(typing);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function escapeHtml(text) {
    var div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  window.sendMessage = function() {
    var text = inputEl.value.trim();
    if (!text) return;
    addMessage(text, 'user');
    inputEl.value = '';
    inputEl.style.height = 'auto';
    showTyping();
    if (vscode) {
      vscode.postMessage({ type: 'chatMessage', text: text });
    }
  };

  window.configureKeys = function() {
    if (vscode) {
      vscode.postMessage({ type: 'configureApiKeys' });
    }
  };

  window.clearHistory = function() {
    var messagesEl = document.getElementById('messages');
    messagesEl.innerHTML = '';
    if (vscode) {
      vscode.postMessage({ type: 'clearHistory' });
    }
  };

  window.addEventListener('message', function(event) {
    var msg = event.data;
    if (msg && msg.type === 'chatResponse' && msg.text) {
      addMessage(msg.text, 'assistant', msg.model);
    } else if (msg && msg.type === 'typingStart') {
      showTyping();
    } else if (msg && msg.type === 'chatStreamToken' && msg.token) {
      // Handle streaming tokens — append to last assistant message or create new one
      var lastMsg = messagesEl.querySelector('.msg.assistant:last-child .msg-bubble');
      if (!lastMsg || !lastMsg.getAttribute('data-streaming')) {
        // Remove typing indicator
        var typingEl = document.querySelector('.typing-indicator');
        if (typingEl) typingEl.remove();
        // Create new streaming message
        addMessage('', 'assistant');
        lastMsg = messagesEl.querySelector('.msg.assistant:last-child .msg-bubble');
        if (lastMsg) lastMsg.setAttribute('data-streaming', 'true');
      }
      if (lastMsg) {
        lastMsg.textContent += msg.token;
        messagesEl.scrollTop = messagesEl.scrollHeight;
      }
    } else if (msg && msg.type === 'historyCleared') {
      var messagesEl2 = document.getElementById('messages');
      messagesEl2.innerHTML = '<div class="msg assistant"><div class="msg-avatar">J</div><div><div class="msg-bubble">Chat history cleared. How can I help you?</div><div class="msg-time">Just now</div></div></div>';
    }
  });

  inputEl.addEventListener('input', function() {
    this.style.height = 'auto';
    this.style.height = Math.min(this.scrollHeight, 120) + 'px';
  });

  inputEl.focus();
})();
</script>
</body>
</html>`;
        }
}

// =====================================================================================
// COMMAND PALETTE REGISTRATIONS
// Expose all AI sidebar panels as discoverable commands.
// =====================================================================================

CommandsRegistry.registerCommand('aiExecution.showKnowledgeGraph', {
        handler: (accessor: any) => {
                const commandService = accessor.get(ICommandService);
                commandService.executeCommand(`${AI_KNOWLEDGE_GRAPH_VIEW_ID}.focus`);
        },
        description: { description: 'Open the Knowledge Graph visualization panel' },
});

CommandsRegistry.registerCommand('aiExecution.showMemory', {
        handler: (accessor: any) => {
                const commandService = accessor.get(ICommandService);
                commandService.executeCommand(`${AI_MEMORY_VIEW_ID}.focus`);
        },
        description: { description: 'Open the Memory visualization panel' },
});

CommandsRegistry.registerCommand('aiExecution.showJarvis', {
        handler: (accessor: any) => {
                const commandService = accessor.get(ICommandService);
                commandService.executeCommand(`${AI_JARVIS_VIEW_ID}.focus`);
        },
        description: { description: 'Open the Jarvis AI chat panel' },
});

CommandsRegistry.registerCommand('aiExecution.showWorkflow', {
        handler: (accessor: any) => {
                const commandService = accessor.get(ICommandService);
                commandService.executeCommand(`${AI_WORKFLOW_VIEW_ID}.focus`);
        },
        description: { description: 'Open the AI Workflow panel' },
});

// ─── AI Action Commands (wired to keybindings) ──────────────────────────────────

CommandsRegistry.registerCommand('aiExecution.triggerInlineCompletion', {
        handler: (accessor: any) => {
                const commandService = accessor.get(ICommandService);
                // Delegate to VS Code's inline completion trigger
                commandService.executeCommand('editor.action.inlineSuggest.trigger');
        },
        description: { description: 'Trigger AI inline completion at cursor position' },
});

CommandsRegistry.registerCommand('aiExecution.executePlan', {
        handler: async (accessor: any) => {
                const commandService = accessor.get(ICommandService);
                const logService = accessor.get(ILogService);
                logService.info('[AIProduct] Execute AI plan triggered via keybinding');
                // Execute the current cached plan
                commandService.executeCommand('aiExecution.startExecution');
        },
        description: { description: 'Execute the current AI plan' },
});

CommandsRegistry.registerCommand('aiExecution.rollbackChange', {
        handler: async (accessor: any) => {
                const logService = accessor.get(ILogService);
                logService.info('[AIProduct] Rollback last AI change triggered via keybinding');
                // Use git undo as the rollback mechanism
                const commandService = accessor.get(ICommandService);
                commandService.executeCommand('git.undo');
        },
        description: { description: 'Rollback the last AI-generated change' },
});

CommandsRegistry.registerCommand('aiExecution.toggleAutonomous', {
        handler: async (accessor: any) => {
                const logService = accessor.get(ILogService);
                const autonomousExecutionService = accessor.get(IAutonomousExecutionService);
                const state = autonomousExecutionService.getExecutionState();
                if (state.stage === ExecutionStage.Executing || state.stage === ExecutionStage.Paused) {
                        if (state.stage === ExecutionStage.Executing) {
                                autonomousExecutionService.pauseExecution();
                                logService.info('[AIProduct] Autonomous execution paused via keybinding');
                        } else {
                                autonomousExecutionService.resumeExecution();
                                logService.info('[AIProduct] Autonomous execution resumed via keybinding');
                        }
                } else {
                        logService.info('[AIProduct] Toggle autonomous: no active execution to toggle');
                }
        },
        description: { description: 'Toggle autonomous execution (pause/resume)' },
});

// ─── API Key Configuration Command ──────────────────────────────────────────────

CommandsRegistry.registerCommand('aiExecution.configureApiKeys', {
        handler: async (accessor: any) => {
                const quickInputService = accessor.get(IQuickInputService) as IQuickInputService;
                const credentialStoreService = accessor.get(ICredentialStoreService) as ICredentialStoreService;
                const llmProviderService = accessor.get(ILLMProviderService) as ILLMProviderService;
                const logService = accessor.get(ILogService) as ILogService;

                logService.info('[AIProduct] API key configuration started');

                // Step 1: Select a provider
                const providerItems = KNOWN_PROVIDER_CONFIGS.map(config => ({
                        label: config.displayName,
                        description: config.apiEndpoint,
                        detail: config.isLocal ? 'Local provider — no API key needed' : `Default model: ${config.defaultModel}`,
                        id: config.id,
                        isLocal: config.isLocal,
                }));

                const selectedProvider = await quickInputService.pick(providerItems, {
                        placeHolder: 'Select an LLM provider to configure',
                        title: 'AI: Configure API Keys — Select Provider',
                });

                if (!selectedProvider) {
                        return; // User cancelled
                }

                const providerId = selectedProvider.id;

                // Skip API key input for local providers
                if (selectedProvider.isLocal) {
                        // For local providers, just set them as active
                        llmProviderService.setActiveProvider(providerId);
                        logService.info(`[AIProduct] Local provider "${providerId}" set as active`);

                        // Validate the connection
                        const status = await llmProviderService.validateProvider(providerId);
                        const statusMessage = status === 'connected'
                                ? `Connected to ${selectedProvider.label} successfully!`
                                : `Could not reach ${selectedProvider.label}. Make sure it's running at ${selectedProvider.description}.`;

                        quickInputService.pick([{ label: statusMessage }], {
                                placeHolder: 'Connection test result',
                                title: 'AI: Provider Connection Status',
                        });
                        return;
                }

                // Step 2: Enter API key
                const existingKey = await credentialStoreService.hasKey(providerId);
                const placeholder = existingKey
                        ? 'Enter new API key (leave empty to keep current)'
                        : 'Enter your API key';

                const apiKey = await quickInputService.input({
                        prompt: `Enter API key for ${selectedProvider.label}`,
                        placeHolder,
                        password: true, // Mask the input
                        ignoreFocusLost: true,
                });

                if (apiKey === undefined) {
                        return; // User cancelled
                }

                if (apiKey && apiKey.trim()) {
                        // Step 3: Save the key
                        await credentialStoreService.storeKey(providerId, apiKey.trim());
                        logService.info(`[AIProduct] API key stored for provider "${providerId}"`);

                        // Set as active provider
                        llmProviderService.setActiveProvider(providerId);

                        // Validate the key
                        const validation = await credentialStoreService.validateKey(providerId);
                        const statusMessage = validation.validationStatus === 'connected'
                                ? `API key validated! ${selectedProvider.label} is ready to use.`
                                : validation.validationStatus === 'auth-required'
                                        ? `Key saved but validation failed. The key may be invalid.`
                                        : `Key saved. Validation status: ${validation.validationStatus}`;

                        quickInputService.pick([{ label: statusMessage }], {
                                placeHolder: 'Validation result',
                                title: 'AI: API Key Validation',
                        });
                } else if (apiKey === '' && existingKey) {
                        // User cleared the key — delete it
                        await credentialStoreService.deleteKey(providerId);
                        logService.info(`[AIProduct] API key deleted for provider "${providerId}"`);
                }
        },
        description: { description: 'Configure API keys for LLM providers' },
});

// =====================================================================================
// AUTO-INITIALIZATION
// Register the contribution so it activates on workbench startup.
// =====================================================================================

import { registerWorkbenchContribution2, WorkbenchPhase } from '../../../common/contributions.js';

registerWorkbenchContribution2(
        AIProductContribution.ID,
        AIProductContribution,
        WorkbenchPhase.AfterRestored
);

// Also add a static ID for the contribution
(AIProductContribution as any).ID = 'aiExecution.productContribution';
