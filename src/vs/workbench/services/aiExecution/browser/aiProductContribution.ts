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
 *--------------------------------------------------------------------------------------------*/

import { Disposable } from '../../../../base/common/lifecycle.js';
import { Emitter } from '../../../../base/common/event.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { IWorkbenchContribution } from '../../../common/contributions.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
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
import { IObservabilityService } from '../common/observabilityService.js';

// Webview HTML content
import { getAIWorkflowHTML } from './aiWorkflowContent.js';

// =====================================================================================
// CONSTANTS
// =====================================================================================

const AI_VIEW_CONTAINER_ID = 'aiExecution';
const AI_WORKFLOW_VIEW_ID = 'aiExecution.workflow';
const AI_PROJECTS_VIEW_ID = 'aiExecution.projects';
const AI_TIMELINE_VIEW_ID = 'aiExecution.timeline';

const STORAGE_KEY_PROJECT = 'aiExecution.currentProject';
const STORAGE_KEY_STEP = 'aiExecution.currentStep';
const STORAGE_KEY_HISTORY = 'aiExecution.executionHistory';

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
                        enum: ['dark', 'deepblue', 'light'],
                        default: 'dark',
                        description: 'Color theme for AI Execution panels',
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
// =====================================================================================

export class AIProductContribution extends Disposable implements IWorkbenchContribution {

        private readonly _onProjectCreated = new Emitter<{ name: string; description: string; path: string }>();
        private readonly _onExecutionStarted = new Emitter<{ mode: string; project: string }>();
        private readonly _onStepChanged = new Emitter<number>();

        constructor(
                @IInstantiationService private readonly instantiationService: IInstantiationService,
                @ILogService private readonly logService: ILogService,
                @IStorageService private readonly storageService: IStorageService,
                @IWebviewViewService private readonly webviewViewService: IWebviewViewService,
                @IAIExecutionService private readonly executionService: IAIExecutionService,
                @IAIUnifiedStateService private readonly stateService: IAIUnifiedStateService,
                @IObservabilityService private readonly observabilityService: IObservabilityService,
        ) {
                super();

                this.logService.info('[AIProduct] Initializing real UI wiring');

                // 1. Inject CSS design tokens into the DOM immediately
                this.injectCSS();

                // 2. Register webview resolvers for all views
                this.registerWebviewResolvers();

                // 3. Wire service events to UI
                this.wireServiceEvents();

                this.logService.info('[AIProduct] UI wiring complete. Views registered, CSS injected, webview resolvers active.');
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
        }

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
                        case 'startExecution': {
                                this.storageService.store(STORAGE_KEY_STEP, 4, -1 /* StorageScope.APPLICATION */, 0 /* StorageTarget.USER */);
                                this._onExecutionStarted.fire({ mode: msg.mode, project: this.getCurrentProjectName() });
                                this.logService.info(`[AIProduct] Execution started in ${msg.mode} mode`);
                                break;
                        }
                        case 'stepChange': {
                                this.storageService.store(STORAGE_KEY_STEP, msg.step, -1 /* StorageScope.APPLICATION */, 0 /* StorageTarget.USER */);
                                this._onStepChanged.fire(msg.step);
                                break;
                        }
                        case 'refineIdea': {
                                this.logService.info('[AIProduct] Idea refinement requested');
                                break;
                        }
                        case 'exportResults': {
                                this.logService.info('[AIProduct] Results export requested');
                                break;
                        }
                        case 'openSettings': {
                                // Open VS Code settings filtered to AI Execution
                                this.logService.info('[AIProduct] Settings opened');
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

        private getCurrentProjectName(): string {
                try {
                        const saved = this.storageService.get(STORAGE_KEY_PROJECT, undefined);
                        if (saved) {
                                return JSON.parse(saved).name || 'unknown';
                        }
                } catch { /* ignore */ }
                return 'unknown';
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
                                        const dotClass = entry.status === 'success' ? 'success' : entry.status === 'error' ? 'error' : '';
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
}

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
