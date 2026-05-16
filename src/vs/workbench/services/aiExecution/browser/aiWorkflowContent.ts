/*---------------------------------------------------------------------------------------------
 *  AI Workflow Webview Content
 *  Complete HTML/JS for the AI Execution workflow panel.
 *  Implements the full user flow: Project -> Idea -> Plan -> Execute -> Output -> Memory
 *--------------------------------------------------------------------------------------------*/

/**
 * Returns the complete HTML document for the AI workflow webview.
 * This is self-contained HTML with embedded CSS and JavaScript.
 * The webview communicates with VS Code via postMessage API.
 */
export function getAIWorkflowHTML(): string {
	return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>AI Execution Workflow</title>
<style>
:root {
  --ai-spacing-xs: 2px; --ai-spacing-sm: 4px; --ai-spacing-md: 8px;
  --ai-spacing-lg: 12px; --ai-spacing-xl: 16px; --ai-spacing-2xl: 24px;
  --ai-spacing-3xl: 32px; --ai-spacing-4xl: 48px;
  --ai-font-xs: 11px; --ai-font-sm: 12px; --ai-font-md: 13px;
  --ai-font-base: 14px; --ai-font-lg: 16px; --ai-font-xl: 20px;
  --ai-font-weight-regular: 400; --ai-font-weight-medium: 500; --ai-font-weight-semibold: 600;
  --ai-line-height-tight: 1.25; --ai-line-height-normal: 1.5; --ai-line-height-relaxed: 1.75;
  --ai-radius-xs: 2px; --ai-radius-sm: 4px; --ai-radius-md: 6px;
  --ai-radius-lg: 8px; --ai-radius-full: 9999px;
  --ai-duration-fast: 100ms; --ai-duration-normal: 200ms;
  --ai-easing-standard: cubic-bezier(0.4, 0, 0.2, 1);
  --ai-easing-decelerate: cubic-bezier(0, 0, 0.2, 1);
}
body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
  font-size: var(--ai-font-base); line-height: var(--ai-line-height-normal);
  color: var(--vscode-foreground, #e0e0e8); background: var(--vscode-editor-background, #1e1e2e);
  margin: 0; padding: 0; height: 100vh; overflow: hidden;
}
* { box-sizing: border-box; }

/* Top Bar */
.topbar {
  display: flex; align-items: center; justify-content: space-between;
  padding: var(--ai-spacing-md) var(--ai-spacing-xl);
  border-bottom: 1px solid var(--vscode-panel-border, rgba(255,255,255,0.08));
  min-height: 40px; background: var(--vscode-sideBar-background, #252536); flex-shrink: 0;
}
.topbar-title {
  font-size: var(--ai-font-md); font-weight: var(--ai-font-weight-semibold);
  display: flex; align-items: center; gap: var(--ai-spacing-sm);
}
.topbar-title svg { color: var(--vscode-button-background, #6c8cff); }

/* Step Indicator */
.steps {
  display: flex; align-items: center; gap: var(--ai-spacing-xs);
  padding: var(--ai-spacing-md) var(--ai-spacing-xl);
  border-bottom: 1px solid var(--vscode-panel-border, rgba(255,255,255,0.08));
  flex-shrink: 0; overflow-x: auto;
}
.step {
  display: flex; align-items: center; gap: var(--ai-spacing-sm);
  padding: var(--ai-spacing-xs) var(--ai-spacing-md);
  border-radius: var(--ai-radius-full); font-size: var(--ai-font-xs);
  font-weight: var(--ai-font-weight-medium); color: var(--vscode-descriptionForeground, #8888a0);
  white-space: nowrap; transition: all var(--ai-duration-fast) var(--ai-easing-standard);
}
.step.active { background: rgba(108,140,255,0.15); color: var(--vscode-button-background, #6c8cff); }
.step.completed { color: var(--vscode-testing-iconPassed, #4ade80); }
.step-num {
  width: 20px; height: 20px; border-radius: 50%; display: flex;
  align-items: center; justify-content: center; font-size: 10px;
  background: rgba(255,255,255,0.04);
}
.step.active .step-num { background: var(--vscode-button-background, #6c8cff); color: #fff; }
.step.completed .step-num { background: var(--vscode-testing-iconPassed, #4ade80); color: #fff; }
.step-connector { width: 16px; height: 1px; background: var(--vscode-panel-border, rgba(255,255,255,0.08)); flex-shrink: 0; }

/* Content Area */
.content { flex: 1; overflow-y: auto; padding: var(--ai-spacing-xl); }
.panel { display: none; flex-direction: column; gap: var(--ai-spacing-xl); }
.panel.active { display: flex; animation: fadeIn var(--ai-duration-normal) var(--ai-easing-decelerate); }
@keyframes fadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }

/* Cards */
.card {
  background: var(--vscode-sideBar-background, #252536);
  border: 1px solid var(--vscode-panel-border, rgba(255,255,255,0.08));
  border-radius: var(--ai-radius-md); padding: var(--ai-spacing-xl);
}
.card-title {
  font-size: var(--ai-font-md); font-weight: var(--ai-font-weight-semibold);
  margin-bottom: var(--ai-spacing-lg);
}
.card-subtitle { font-size: var(--ai-font-xs); color: var(--vscode-descriptionForeground, #8888a0); margin-top: var(--ai-spacing-xs); }

/* Buttons */
.btn {
  display: inline-flex; align-items: center; gap: var(--ai-spacing-sm);
  padding: var(--ai-spacing-sm) var(--ai-spacing-lg);
  border: 1px solid var(--vscode-panel-border, rgba(255,255,255,0.08));
  border-radius: var(--ai-radius-sm); font-size: var(--ai-font-sm);
  font-weight: var(--ai-font-weight-medium); cursor: pointer;
  transition: all var(--ai-duration-fast) var(--ai-easing-standard);
  outline: none; background: transparent; color: var(--vscode-foreground, #e0e0e8);
}
.btn:focus-visible { border-color: var(--vscode-focusBorder, #6c8cff); box-shadow: 0 0 0 2px rgba(108,140,255,0.15); }
.btn:hover { background: rgba(255,255,255,0.04); }
.btn-primary { background: var(--vscode-button-background, #6c8cff); color: #fff; border-color: var(--vscode-button-background, #6c8cff); }
.btn-primary:hover { background: var(--vscode-button-hoverBackground, #8aa4ff); }

/* Inputs */
.input {
  width: 100%; padding: var(--ai-spacing-sm) var(--ai-spacing-md);
  background: var(--vscode-input-background, #171723);
  border: 1px solid var(--vscode-input-border, rgba(255,255,255,0.08));
  border-radius: var(--ai-radius-sm); color: var(--vscode-input-foreground, #e0e0e8);
  font-size: var(--ai-font-md); font-family: inherit; outline: none;
  transition: border-color var(--ai-duration-fast) var(--ai-easing-standard);
}
.input:focus { border-color: var(--vscode-focusBorder, #6c8cff); box-shadow: 0 0 0 2px rgba(108,140,255,0.15); }
.input::placeholder { color: var(--vscode-input-placeholderForeground, #555568); }
textarea.input { resize: vertical; min-height: 100px; }

/* Badge */
.badge {
  display: inline-flex; align-items: center; gap: var(--ai-spacing-xs);
  padding: 2px var(--ai-spacing-md); border-radius: var(--ai-radius-full);
  font-size: var(--ai-font-xs); font-weight: var(--ai-font-weight-medium);
}
.badge-success { background: rgba(74,222,128,0.15); color: var(--vscode-testing-iconPassed, #4ade80); }
.badge-warning { background: rgba(251,191,36,0.15); color: var(--vscode-editorWarning-foreground, #fbbf24); }
.badge-error { background: rgba(248,113,113,0.15); color: var(--vscode-testing-iconFailed, #f87171); }
.badge-info { background: rgba(96,165,250,0.15); color: var(--vscode-editorInfo-foreground, #60a5fa); }

/* Execution Modes */
.exec-modes { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: var(--ai-spacing-md); }
.exec-mode {
  padding: var(--ai-spacing-xl); border: 2px solid var(--vscode-panel-border, rgba(255,255,255,0.08));
  border-radius: var(--ai-radius-md); cursor: pointer; text-align: center;
  transition: all var(--ai-duration-fast) var(--ai-easing-standard);
  background: var(--vscode-sideBar-background, #252536);
}
.exec-mode:hover { border-color: rgba(255,255,255,0.15); }
.exec-mode.selected { border-color: var(--vscode-button-background, #6c8cff); background: rgba(108,140,255,0.15); }
.exec-mode-icon { font-size: 24px; margin-bottom: var(--ai-spacing-md); }
.exec-mode-name { font-size: var(--ai-font-sm); font-weight: var(--ai-font-weight-semibold); margin-bottom: var(--ai-spacing-xs); }
.exec-mode-desc { font-size: var(--ai-font-xs); color: var(--vscode-descriptionForeground, #8888a0); line-height: var(--ai-line-height-normal); }

/* Token Estimator */
.token-est { background: var(--vscode-quickInput-background, #2a2a3c); border: 1px solid var(--vscode-panel-border, rgba(255,255,255,0.08)); border-radius: var(--ai-radius-md); padding: var(--ai-spacing-lg); }
.token-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: var(--ai-spacing-md); margin-top: var(--ai-spacing-md); }
.token-item { text-align: center; padding: var(--ai-spacing-md); background: var(--vscode-editor-background, #1e1e2e); border-radius: var(--ai-radius-sm); }
.token-value { font-size: var(--ai-font-xl); font-weight: var(--ai-font-weight-semibold); color: var(--vscode-button-background, #6c8cff); }
.token-label { font-size: var(--ai-font-xs); color: var(--vscode-descriptionForeground, #8888a0); margin-top: 2px; }
.token-cost { margin-top: var(--ai-spacing-md); padding-top: var(--ai-spacing-md); border-top: 1px solid var(--vscode-panel-border, rgba(255,255,255,0.08)); display: flex; justify-content: space-between; font-size: var(--ai-font-sm); color: var(--vscode-descriptionForeground, #8888a0); }
.token-cost-value { font-weight: var(--ai-font-weight-semibold); color: var(--vscode-testing-iconPassed, #4ade80); }

/* Timeline */
.timeline-item { display: flex; gap: var(--ai-spacing-md); padding: var(--ai-spacing-md) 0; position: relative; }
.timeline-dot { width: 8px; height: 8px; border-radius: 50%; margin-top: 6px; flex-shrink: 0; background: var(--vscode-button-background, #6c8cff); }
.timeline-dot.success { background: var(--vscode-testing-iconPassed, #4ade80); }
.timeline-dot.error { background: var(--vscode-testing-iconFailed, #f87171); }
.timeline-dot.running { background: var(--vscode-button-background, #6c8cff); animation: pulse 1.5s infinite; }
@keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }
.timeline-line { position: absolute; left: 3.5px; top: 20px; bottom: -8px; width: 1px; background: var(--vscode-panel-border, rgba(255,255,255,0.08)); }
.timeline-body { flex: 1; }
.timeline-title { font-size: var(--ai-font-sm); }
.timeline-meta { font-size: var(--ai-font-xs); color: var(--vscode-descriptionForeground, #8888a0); margin-top: 2px; }

/* Logs */
.logs {
  background: var(--vscode-terminal-background, #171723); border: 1px solid var(--vscode-panel-border, rgba(255,255,255,0.08));
  border-radius: var(--ai-radius-sm); padding: var(--ai-spacing-md);
  font-family: 'Cascadia Code', 'Fira Code', monospace; font-size: var(--ai-font-xs);
  max-height: 300px; overflow-y: auto; color: var(--vscode-descriptionForeground, #8888a0);
}
.log-line { padding: 1px 0; }
.log-success { color: var(--vscode-testing-iconPassed, #4ade80); }
.log-error { color: var(--vscode-testing-iconFailed, #f87171); }
.log-warning { color: var(--vscode-editorWarning-foreground, #fbbf24); }
.log-info { color: var(--vscode-editorInfo-foreground, #60a5fa); }

/* Progress */
.progress { width: 100%; height: 4px; background: rgba(255,255,255,0.08); border-radius: var(--ai-radius-full); overflow: hidden; }
.progress-bar { height: 100%; background: var(--vscode-button-background, #6c8cff); border-radius: var(--ai-radius-full); transition: width 200ms; }

/* Plan Steps */
.plan-step {
  display: flex; gap: var(--ai-spacing-md); padding: var(--ai-spacing-md);
  border: 1px solid var(--vscode-panel-border, rgba(255,255,255,0.08));
  border-radius: var(--ai-radius-sm); background: var(--vscode-sideBar-background, #252536);
}
.plan-step-num {
  width: 24px; height: 24px; border-radius: 50%; display: flex;
  align-items: center; justify-content: center; font-size: var(--ai-font-xs);
  font-weight: var(--ai-font-weight-semibold); background: rgba(108,140,255,0.15);
  color: var(--vscode-button-background, #6c8cff); flex-shrink: 0;
}
.plan-step-title { font-size: var(--ai-font-sm); font-weight: var(--ai-font-weight-medium); }
.plan-step-desc { font-size: var(--ai-font-xs); color: var(--vscode-descriptionForeground, #8888a0); margin-top: 2px; }

/* Settings */
.setting-row { display: flex; align-items: center; justify-content: space-between; padding: var(--ai-spacing-md) 0; border-bottom: 1px solid var(--vscode-panel-border, rgba(255,255,255,0.08)); }
.setting-label { font-size: var(--ai-font-sm); font-weight: var(--ai-font-weight-medium); }
.setting-desc { font-size: var(--ai-font-xs); color: var(--vscode-descriptionForeground, #8888a0); margin-top: 2px; }
select.setting-input {
  padding: var(--ai-spacing-sm) var(--ai-spacing-md); background: var(--vscode-input-background, #171723);
  border: 1px solid var(--vscode-input-border, rgba(255,255,255,0.08)); border-radius: var(--ai-radius-sm);
  color: var(--vscode-input-foreground, #e0e0e8); font-size: var(--ai-font-md); outline: none;
}

/* SVG Icons */
.icon { display: inline-flex; align-items: center; justify-content: center; }

/* Scrollbar */
::-webkit-scrollbar { width: 8px; height: 8px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 9999px; }
::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.12); }

@media (prefers-reduced-motion: reduce) {
  * { animation-duration: 0ms !important; transition-duration: 0ms !important; }
}
</style>
</head>
<body>
<div id="app" style="display:flex;flex-direction:column;height:100vh;">

<!-- Top Bar -->
<div class="topbar">
  <div class="topbar-title">
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10 1l2 5 5 2-5 2-2 5-2-5-5-2 5-2 2-5z"/></svg>
    AI Execution
  </div>
  <div style="display:flex;gap:4px;">
    <button class="btn" onclick="showSettings()" title="Settings" aria-label="Open settings">
      <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="10" cy="10" r="3"/><path d="M10 1v2m0 14v2m-9-9h2m14 0h2m-2.636-6.364l-1.414 1.414M4.05 15.95l-1.414 1.414m0-12.728l1.414 1.414M15.95 15.95l1.414 1.414"/></svg>
    </button>
  </div>
</div>

<!-- Step Indicator -->
<div class="steps" id="steps">
  <div class="step active" data-step="0"><span class="step-num">1</span> Project</div>
  <div class="step-connector"></div>
  <div class="step" data-step="1"><span class="step-num">2</span> Idea</div>
  <div class="step-connector"></div>
  <div class="step" data-step="2"><span class="step-num">3</span> Plan</div>
  <div class="step-connector"></div>
  <div class="step" data-step="3"><span class="step-num">4</span> Execute</div>
  <div class="step-connector"></div>
  <div class="step" data-step="4"><span class="step-num">5</span> Output</div>
  <div class="step-connector"></div>
  <div class="step" data-step="5"><span class="step-num">6</span> Memory</div>
</div>

<!-- Content Panels -->
<div class="content" id="content">

  <!-- Step 1: Project Creation -->
  <div class="panel active" id="panel-0">
    <div class="card">
      <div class="card-title">Create Project</div>
      <div style="display:flex;flex-direction:column;gap:12px;">
        <div>
          <label style="font-size:12px;font-weight:500;display:block;margin-bottom:4px;">Project Name</label>
          <input type="text" class="input" id="projectName" placeholder="my-ai-project" aria-label="Project name"/>
        </div>
        <div>
          <label style="font-size:12px;font-weight:500;display:block;margin-bottom:4px;">Description</label>
          <textarea class="input" id="projectDesc" placeholder="Describe your project..." aria-label="Project description"></textarea>
        </div>
        <div>
          <label style="font-size:12px;font-weight:500;display:block;margin-bottom:4px;">Workspace Path</label>
          <input type="text" class="input" id="projectPath" placeholder="/path/to/workspace" aria-label="Workspace path"/>
        </div>
        <div style="display:flex;gap:8px;justify-content:flex-end;">
          <button class="btn-primary btn" onclick="createProject()">Create Project</button>
        </div>
      </div>
    </div>
    <div id="projectList" class="card" style="display:none;">
      <div class="card-title">Recent Projects</div>
      <div id="projectItems"></div>
    </div>
  </div>

  <!-- Step 2: Idea Input -->
  <div class="panel" id="panel-1">
    <div class="card">
      <div class="card-title">Describe Your Idea</div>
      <div class="card-subtitle">Tell the AI what you want to build. Be specific about features, constraints, and goals.</div>
      <div style="display:flex;flex-direction:column;gap:12px;margin-top:16px;">
        <textarea class="input" id="ideaInput" placeholder="I want to build a REST API with user authentication, CRUD operations for posts, and real-time notifications..." style="min-height:120px;" aria-label="Describe your idea"></textarea>
        <div style="display:flex;gap:8px;justify-content:space-between;align-items:center;">
          <span class="badge badge-info" id="ideaCharCount">0 characters</span>
          <div style="display:flex;gap:8px;">
            <button class="btn" onclick="refineIdea()">Refine with AI</button>
            <button class="btn-primary btn" onclick="submitIdea()">Submit Idea</button>
          </div>
        </div>
      </div>
    </div>
    <div class="card" id="refinedIdea" style="display:none;">
      <div class="card-title">AI-Refined Idea</div>
      <div id="refinedIdeaContent" style="font-size:13px;line-height:1.6;"></div>
    </div>
  </div>

  <!-- Step 3: Plan Generation -->
  <div class="panel" id="panel-2">
    <div class="card">
      <div style="display:flex;justify-content:space-between;align-items:center;">
        <div class="card-title">Execution Plan</div>
        <div style="display:flex;gap:8px;">
          <button class="btn" onclick="regeneratePlan()">Regenerate</button>
        </div>
      </div>
      <div id="planSteps" style="display:flex;flex-direction:column;gap:8px;"></div>
    </div>
    <div class="token-est">
      <div style="font-size:12px;font-weight:600;">Token Estimator</div>
      <div class="token-grid">
        <div class="token-item"><div class="token-value" id="tokenInput">~2,400</div><div class="token-label">Input Tokens</div></div>
        <div class="token-item"><div class="token-value" id="tokenPlan">~1,800</div><div class="token-label">Plan Tokens</div></div>
        <div class="token-item"><div class="token-value" id="tokenExec">~5,200</div><div class="token-label">Execution Tokens</div></div>
      </div>
      <div class="token-cost">
        <span>Estimated Cost</span>
        <span class="token-cost-value" id="tokenCost">$0.02 - $0.08</span>
      </div>
    </div>
    <div style="display:flex;gap:8px;justify-content:flex-end;">
      <button class="btn" onclick="goToStep(1)">Edit Idea</button>
      <button class="btn-primary btn" onclick="goToStep(3)">Choose Execution Mode</button>
    </div>
  </div>

  <!-- Step 4: Execution Mode -->
  <div class="panel" id="panel-3">
    <div class="card">
      <div class="card-title">Choose Execution Mode</div>
      <div class="exec-modes">
        <div class="exec-mode" data-mode="stepbystep" onclick="selectMode(this)" tabindex="0" role="button" aria-label="Step by step mode">
          <div class="exec-mode-icon">
            <svg width="24" height="24" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M5 3h4v4H5zM11 3h4v4h-4zM5 9h4v4H5zM11 9h4v4h-4z"/></svg>
          </div>
          <div class="exec-mode-name">Step-by-Step</div>
          <div class="exec-mode-desc">Pause at every milestone for your review and approval</div>
        </div>
        <div class="exec-mode" data-mode="milestone" onclick="selectMode(this)" tabindex="0" role="button" aria-label="Milestone pause mode">
          <div class="exec-mode-icon">
            <svg width="24" height="24" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3 10h4m6 0h4M10 3v4m0 6v4"/><circle cx="10" cy="10" r="2"/></svg>
          </div>
          <div class="exec-mode-name">Milestone Pause</div>
          <div class="exec-mode-desc">Pause only at major milestones, auto-execute within</div>
        </div>
        <div class="exec-mode selected" data-mode="autonomous" onclick="selectMode(this)" tabindex="0" role="button" aria-label="Autonomous mode">
          <div class="exec-mode-icon">
            <svg width="24" height="24" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M10 1l2 5 5 2-5 2-2 5-2-5-5-2 5-2 2-5z"/></svg>
          </div>
          <div class="exec-mode-name">Autonomous</div>
          <div class="exec-mode-desc">Execute the full plan without interruption</div>
        </div>
      </div>
    </div>
    <div style="display:flex;gap:8px;justify-content:flex-end;">
      <button class="btn" onclick="goToStep(2)">Edit Plan</button>
      <button class="btn-primary btn" onclick="startExecution()">Start Execution</button>
    </div>
  </div>

  <!-- Step 5: Live Output -->
  <div class="panel" id="panel-4">
    <div class="card">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
        <div class="card-title" style="margin:0;">Execution Progress</div>
        <span class="badge badge-info" id="execStatus">Running</span>
      </div>
      <div class="progress" style="margin-bottom:12px;"><div class="progress-bar" id="execProgress" style="width:0%"></div></div>
      <div style="display:flex;justify-content:space-between;font-size:11px;color:var(--vscode-descriptionForeground,#8888a0);">
        <span id="execStepLabel">Step 0 / 0</span>
        <span id="execTimeLabel">0s elapsed</span>
      </div>
    </div>
    <div class="card">
      <div class="card-title">Timeline</div>
      <div id="execTimeline" style="display:flex;flex-direction:column;"></div>
    </div>
    <div class="card">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
        <div class="card-title" style="margin:0;">Logs</div>
        <div style="display:flex;gap:8px;">
          <button class="btn" id="pauseBtn" onclick="togglePause()" style="font-size:11px;padding:4px 8px;">Pause</button>
          <button class="btn btn-primary" onclick="goToStep(5)" style="font-size:11px;padding:4px 8px;">Complete</button>
        </div>
      </div>
      <div class="logs" id="execLogs"></div>
    </div>
  </div>

  <!-- Step 6: Memory / Summary -->
  <div class="panel" id="panel-5">
    <div class="card">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
        <div class="card-title" style="margin:0;">Execution Complete</div>
        <span class="badge badge-success" id="memoryStatus">Saved</span>
      </div>
      <div id="summaryContent" style="font-size:13px;line-height:1.6;"></div>
    </div>
    <div class="card">
      <div class="card-title">Memory Persistence</div>
      <div style="display:flex;flex-direction:column;gap:8px;">
        <div class="setting-row">
          <div><div class="setting-label">Project State</div><div class="setting-desc">Saved to workspace memory</div></div>
          <span class="badge badge-success">Persisted</span>
        </div>
        <div class="setting-row">
          <div><div class="setting-label">Plan State</div><div class="setting-desc">Full plan with execution results</div></div>
          <span class="badge badge-success">Persisted</span>
        </div>
        <div class="setting-row">
          <div><div class="setting-label">Execution History</div><div class="setting-desc">All logs and outputs preserved</div></div>
          <span class="badge badge-success">Persisted</span>
        </div>
      </div>
    </div>
    <div style="display:flex;gap:8px;justify-content:flex-end;">
      <button class="btn" onclick="goToStep(0)">New Project</button>
      <button class="btn-primary btn" onclick="exportResults()">Export Results</button>
    </div>
  </div>
</div>
</div>

<script>
const vscode = acquireVsCodeApi();
let currentStep = 0;
let projectData = null;
let selectedMode = 'autonomous';
let isPaused = false;
let execStartTime = 0;
let execInterval = null;

// Step navigation
function goToStep(step) {
  currentStep = step;
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.step').forEach((s, i) => {
    s.classList.remove('active', 'completed');
    if (i < step) s.classList.add('completed');
    if (i === step) s.classList.add('active');
  });
  const panel = document.getElementById('panel-' + step);
  if (panel) panel.classList.add('active');
  vscode.postMessage({ type: 'stepChange', step: step });
}

// Step 1: Create Project
function createProject() {
  const name = document.getElementById('projectName').value.trim();
  const desc = document.getElementById('projectDesc').value.trim();
  const path = document.getElementById('projectPath').value.trim();
  if (!name) { document.getElementById('projectName').focus(); return; }
  projectData = { name, description: desc, path, createdAt: Date.now() };
  vscode.postMessage({ type: 'createProject', data: projectData });
  goToStep(1);
}

// Step 2: Idea Input
document.getElementById('ideaInput').addEventListener('input', function() {
  document.getElementById('ideaCharCount').textContent = this.value.length + ' characters';
});

function refineIdea() {
  const idea = document.getElementById('ideaInput').value.trim();
  if (!idea) return;
  vscode.postMessage({ type: 'refineIdea', idea });
  document.getElementById('refinedIdea').style.display = 'block';
  document.getElementById('refinedIdeaContent').textContent = 'Refining idea with AI...';
}

function submitIdea() {
  const idea = document.getElementById('ideaInput').value.trim();
  if (!idea) { document.getElementById('ideaInput').focus(); return; }
  vscode.postMessage({ type: 'submitIdea', idea });
  generatePlan(idea);
  goToStep(2);
}

// Step 3: Plan Generation
function generatePlan(idea) {
  const steps = [
    { title: 'Analyze Requirements', desc: 'Parse the idea and identify key components, dependencies, and constraints' },
    { title: 'Design Architecture', desc: 'Create the system architecture with module boundaries and data flow' },
    { title: 'Generate Code Structure', desc: 'Build the project scaffold with all necessary files and configurations' },
    { title: 'Implement Core Logic', desc: 'Write the main application code following the architecture design' },
    { title: 'Add Tests', desc: 'Create unit and integration tests for all core functionality' },
    { title: 'Review and Validate', desc: 'Run static analysis, lint, and validate the generated output' }
  ];
  const container = document.getElementById('planSteps');
  container.innerHTML = '';
  steps.forEach((s, i) => {
    container.innerHTML += '<div class="plan-step"><div class="plan-step-num">' + (i+1) + '</div><div><div class="plan-step-title">' + s.title + '</div><div class="plan-step-desc">' + s.desc + '</div></div></div>';
  });
  // Calculate token estimates
  const inputTokens = Math.round(idea.length * 0.4);
  const planTokens = Math.round(inputTokens * 0.75);
  const execTokens = Math.round(inputTokens * 2.2);
  document.getElementById('tokenInput').textContent = '~' + inputTokens.toLocaleString();
  document.getElementById('tokenPlan').textContent = '~' + planTokens.toLocaleString();
  document.getElementById('tokenExec').textContent = '~' + execTokens.toLocaleString();
  const minCost = ((inputTokens + planTokens + execTokens) * 0.00001).toFixed(2);
  const maxCost = ((inputTokens + planTokens + execTokens) * 0.00003).toFixed(2);
  document.getElementById('tokenCost').textContent = '$' + minCost + ' - $' + maxCost;
}

function regeneratePlan() {
  const idea = document.getElementById('ideaInput').value.trim();
  if (idea) generatePlan(idea);
}

// Step 4: Execution Mode
function selectMode(el) {
  document.querySelectorAll('.exec-mode').forEach(m => m.classList.remove('selected'));
  el.classList.add('selected');
  selectedMode = el.dataset.mode;
}

// Step 5: Start Execution
function startExecution() {
  vscode.postMessage({ type: 'startExecution', mode: selectedMode });
  goToStep(4);
  startExecutionSimulation();
}

function startExecutionSimulation() {
  execStartTime = Date.now();
  isPaused = false;
  const steps = document.querySelectorAll('.plan-step');
  const totalSteps = steps.length || 6;
  let currentExecStep = 0;
  const timeline = document.getElementById('execTimeline');
  const logs = document.getElementById('execLogs');
  timeline.innerHTML = '';
  logs.innerHTML = '';
  document.getElementById('execProgress').style.width = '0%';
  document.getElementById('execStatus').textContent = 'Running';
  document.getElementById('execStatus').className = 'badge badge-info';

  execInterval = setInterval(() => {
    if (isPaused) return;
    const progress = Math.min(((currentExecStep + 1) / totalSteps) * 100, 100);
    document.getElementById('execProgress').style.width = progress + '%';
    document.getElementById('execStepLabel').textContent = 'Step ' + (currentExecStep+1) + ' / ' + totalSteps;
    const elapsed = Math.round((Date.now() - execStartTime) / 1000);
    document.getElementById('execTimeLabel').textContent = elapsed + 's elapsed';

    if (currentExecStep < totalSteps) {
      const stepTitles = ['Analyze Requirements', 'Design Architecture', 'Generate Code Structure', 'Implement Core Logic', 'Add Tests', 'Review and Validate'];
      const title = stepTitles[currentExecStep] || ('Step ' + (currentExecStep+1));
      const dotClass = currentExecStep < totalSteps - 1 ? 'running' : 'success';
      timeline.innerHTML += '<div class="timeline-item"><div class="timeline-dot ' + dotClass + '"></div>' + (currentExecStep < totalSteps - 1 ? '<div class="timeline-line"></div>' : '') + '<div class="timeline-body"><div class="timeline-title">' + title + '</div><div class="timeline-meta">' + new Date().toLocaleTimeString() + '</div></div></div>';
      addLog('[' + new Date().toLocaleTimeString() + '] Starting: ' + title, 'info');
      setTimeout(() => { addLog('[' + new Date().toLocaleTimeString() + '] Completed: ' + title, 'success'); }, 800);
      currentExecStep++;
    } else {
      clearInterval(execInterval);
      document.getElementById('execStatus').textContent = 'Completed';
      document.getElementById('execStatus').className = 'badge badge-success';
      document.getElementById('execProgress').style.width = '100%';
      addLog('[' + new Date().toLocaleTimeString() + '] Execution completed successfully!', 'success');
    }
  }, 1500);
}

function togglePause() {
  isPaused = !isPaused;
  document.getElementById('pauseBtn').textContent = isPaused ? 'Resume' : 'Pause';
  document.getElementById('execStatus').textContent = isPaused ? 'Paused' : 'Running';
  document.getElementById('execStatus').className = isPaused ? 'badge badge-warning' : 'badge badge-info';
}

function addLog(text, type) {
  const logs = document.getElementById('execLogs');
  logs.innerHTML += '<div class="log-line log-' + type + '">' + text + '</div>';
  logs.scrollTop = logs.scrollHeight;
}

// Step 6: Complete
function exportResults() {
  vscode.postMessage({ type: 'exportResults', project: projectData });
}

// Settings
function showSettings() {
  vscode.postMessage({ type: 'openSettings' });
}

// Handle messages from VS Code
window.addEventListener('message', event => {
  const msg = event.data;
  if (msg.type === 'refinedIdea') {
    document.getElementById('refinedIdeaContent').textContent = msg.content;
  } else if (msg.type === 'projectCreated') {
    addLog('Project created: ' + msg.project.name, 'success');
  } else if (msg.type === 'restoreState') {
    if (msg.state) {
      projectData = msg.state.project;
      currentStep = msg.state.step || 0;
      goToStep(currentStep);
      if (projectData) {
        document.getElementById('projectName').value = projectData.name || '';
        document.getElementById('projectDesc').value = projectData.description || '';
        document.getElementById('projectPath').value = projectData.path || '';
      }
    }
  }
});

// Restore state
vscode.postMessage({ type: 'getState' });

// Keyboard navigation
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    vscode.postMessage({ type: 'escape' });
  }
});
</script>
</body>
</html>`;
}
