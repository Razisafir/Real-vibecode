/*---------------------------------------------------------------------------------------------
 *  AI Workflow Webview Content
 *  Complete HTML/JS for the AI Execution workflow panel.
 *  9-step flow: Project > Idea > Refine > Constraints > Plan > Estimate > Mode > Execute > Memory
 *--------------------------------------------------------------------------------------------*/

/**
 * Returns the complete HTML document for the AI workflow webview.
 * Self-contained HTML with embedded CSS and JavaScript.
 * Communicates with VS Code via postMessage API.
 */
export function getAIWorkflowHTML(): string {
        return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>AI Execution Workflow</title>
<style>
/* ===== Design Tokens ===== */
:root {
  --ai-spacing-xs: 2px; --ai-spacing-sm: 4px; --ai-spacing-md: 8px;
  --ai-spacing-lg: 12px; --ai-spacing-xl: 16px; --ai-spacing-2xl: 24px;
  --ai-spacing-3xl: 32px; --ai-spacing-4xl: 48px;
  --ai-font-xs: 11px; --ai-font-sm: 12px; --ai-font-md: 13px;
  --ai-font-base: 14px; --ai-font-lg: 16px; --ai-font-xl: 20px; --ai-font-2xl: 28px;
  --ai-fw-regular: 400; --ai-fw-medium: 500; --ai-fw-semibold: 600; --ai-fw-bold: 700;
  --ai-lh-tight: 1.25; --ai-lh-normal: 1.5; --ai-lh-relaxed: 1.75;
  --ai-radius-xs: 2px; --ai-radius-sm: 4px; --ai-radius-md: 6px;
  --ai-radius-lg: 8px; --ai-radius-xl: 12px; --ai-radius-full: 9999px;
  --ai-duration-fast: 100ms; --ai-duration-normal: 200ms; --ai-duration-slow: 300ms;
  --ai-easing: cubic-bezier(0.4, 0, 0.2, 1);
  --ai-easing-decelerate: cubic-bezier(0, 0, 0.2, 1);
  --ai-glass-bg: rgba(30,30,46,0.8); --ai-glass-border: rgba(255,255,255,0.06);
  --ai-glass-blur: blur(8px);
}

/* ===== Theme Variants ===== */
[data-theme="deepblue"] {
  --ai-glass-bg: rgba(16,24,56,0.85); --ai-glass-border: rgba(100,140,255,0.1);
}
[data-theme="light"] {
  --ai-glass-bg: rgba(245,245,252,0.9); --ai-glass-border: rgba(0,0,0,0.08);
}
[data-theme="highcontrast"] {
  --ai-glass-bg: rgba(0,0,0,1); --ai-glass-border: rgba(255,255,255,0.4);
}

/* ===== Reset & Base ===== */
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
  font-size: var(--ai-font-base); line-height: var(--ai-lh-normal);
  color: var(--vscode-foreground, #e0e0e8);
  background: var(--vscode-editor-background, #1e1e2e);
  height: 100vh; overflow: hidden;
}
#app { display: flex; flex-direction: column; height: 100vh; }

/* ===== Scrollbar ===== */
::-webkit-scrollbar { width: 6px; height: 6px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: var(--ai-radius-full); }
::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.14); }

/* ===== Top Bar ===== */
.topbar {
  display: flex; align-items: center; justify-content: space-between;
  padding: var(--ai-spacing-md) var(--ai-spacing-xl);
  border-bottom: 1px solid var(--vscode-panel-border, rgba(255,255,255,0.08));
  min-height: 44px; background: var(--vscode-sideBar-background, #252536); flex-shrink: 0;
}
.topbar-left { display: flex; align-items: center; gap: var(--ai-spacing-md); }
.topbar-title {
  font-size: var(--ai-font-md); font-weight: var(--ai-fw-semibold);
  display: flex; align-items: center; gap: var(--ai-spacing-sm);
}
.topbar-title svg { color: var(--vscode-button-background, #6c8cff); }
.topbar-right { display: flex; align-items: center; gap: var(--ai-spacing-sm); }
.provider-select {
  padding: var(--ai-spacing-xs) var(--ai-spacing-md);
  background: var(--vscode-input-background, #171723);
  border: 1px solid var(--vscode-input-border, rgba(255,255,255,0.08));
  border-radius: var(--ai-radius-sm); color: var(--vscode-input-foreground, #e0e0e8);
  font-size: var(--ai-font-sm); outline: none; cursor: pointer;
}
.provider-select:focus { border-color: var(--vscode-focusBorder, #6c8cff); }

/* ===== Step Indicator ===== */
.steps {
  display: flex; align-items: center; gap: 2px;
  padding: var(--ai-spacing-sm) var(--ai-spacing-xl);
  border-bottom: 1px solid var(--vscode-panel-border, rgba(255,255,255,0.08));
  flex-shrink: 0; overflow-x: auto;
}
.step {
  display: flex; align-items: center; gap: var(--ai-spacing-xs);
  padding: var(--ai-spacing-xs) var(--ai-spacing-md);
  border-radius: var(--ai-radius-full); font-size: var(--ai-font-xs);
  font-weight: var(--ai-fw-medium); color: var(--vscode-descriptionForeground, #8888a0);
  white-space: nowrap; transition: all var(--ai-duration-fast) var(--ai-easing);
  cursor: pointer; user-select: none;
}
.step:hover { background: rgba(255,255,255,0.04); }
.step.active { background: rgba(108,140,255,0.15); color: var(--vscode-button-background, #6c8cff); }
.step.completed { color: var(--vscode-testing-iconPassed, #4ade80); }
.step-num {
  width: 18px; height: 18px; border-radius: 50%; display: flex;
  align-items: center; justify-content: center; font-size: 10px;
  background: rgba(255,255,255,0.04); flex-shrink: 0;
}
.step.active .step-num { background: var(--vscode-button-background, #6c8cff); color: #fff; }
.step.completed .step-num { background: var(--vscode-testing-iconPassed, #4ade80); color: #fff; }
.step-connector { width: 12px; height: 1px; background: var(--vscode-panel-border, rgba(255,255,255,0.1)); flex-shrink: 0; }

/* ===== Content ===== */
.content { flex: 1; overflow-y: auto; padding: var(--ai-spacing-xl); }
.panel { display: none; flex-direction: column; gap: var(--ai-spacing-xl); max-width: 900px; margin: 0 auto; width: 100%; }
.panel.active { display: flex; animation: fadeIn var(--ai-duration-normal) var(--ai-easing-decelerate); }
@keyframes fadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }

/* ===== Cards ===== */
.card {
  background: var(--ai-glass-bg); backdrop-filter: var(--ai-glass-blur);
  border: 1px solid var(--ai-glass-border);
  border-radius: var(--ai-radius-lg); padding: var(--ai-spacing-xl);
}
.card-title {
  font-size: var(--ai-font-lg); font-weight: var(--ai-fw-semibold);
  margin-bottom: var(--ai-spacing-lg); display: flex; align-items: center; gap: var(--ai-spacing-sm);
}
.card-subtitle { font-size: var(--ai-font-xs); color: var(--vscode-descriptionForeground, #8888a0); margin-top: var(--ai-spacing-xs); }

/* ===== Buttons ===== */
.btn {
  display: inline-flex; align-items: center; justify-content: center; gap: var(--ai-spacing-sm);
  padding: var(--ai-spacing-sm) var(--ai-spacing-lg);
  border: 1px solid var(--vscode-panel-border, rgba(255,255,255,0.1));
  border-radius: var(--ai-radius-sm); font-size: var(--ai-font-sm);
  font-weight: var(--ai-fw-medium); cursor: pointer;
  transition: all var(--ai-duration-fast) var(--ai-easing);
  outline: none; background: transparent; color: var(--vscode-foreground, #e0e0e8);
  font-family: inherit;
}
.btn:focus-visible { border-color: var(--vscode-focusBorder, #6c8cff); box-shadow: 0 0 0 2px rgba(108,140,255,0.2); }
.btn:hover { background: rgba(255,255,255,0.06); }
.btn:active { transform: scale(0.98); }
.btn-primary { background: var(--vscode-button-background, #6c8cff); color: #fff; border-color: var(--vscode-button-background, #6c8cff); }
.btn-primary:hover { background: var(--vscode-button-hoverBackground, #8aa4ff); }
.btn-danger { background: rgba(248,113,113,0.15); color: #f87171; border-color: rgba(248,113,113,0.3); }
.btn-danger:hover { background: rgba(248,113,113,0.25); }
.btn-success { background: rgba(74,222,128,0.15); color: #4ade80; border-color: rgba(74,222,128,0.3); }
.btn-success:hover { background: rgba(74,222,128,0.25); }
.btn-warning { background: rgba(251,191,36,0.15); color: #fbbf24; border-color: rgba(251,191,36,0.3); }
.btn-warning:hover { background: rgba(251,191,36,0.25); }
.btn-sm { padding: 2px var(--ai-spacing-md); font-size: var(--ai-font-xs); }

/* ===== Inputs ===== */
.input {
  width: 100%; padding: var(--ai-spacing-sm) var(--ai-spacing-md);
  background: var(--vscode-input-background, #171723);
  border: 1px solid var(--vscode-input-border, rgba(255,255,255,0.08));
  border-radius: var(--ai-radius-sm); color: var(--vscode-input-foreground, #e0e0e8);
  font-size: var(--ai-font-md); font-family: inherit; outline: none;
  transition: border-color var(--ai-duration-fast) var(--ai-easing);
}
.input:focus { border-color: var(--vscode-focusBorder, #6c8cff); box-shadow: 0 0 0 2px rgba(108,140,255,0.15); }
.input::placeholder { color: var(--vscode-input-placeholderForeground, #555568); }
textarea.input { resize: vertical; min-height: 100px; }
label.label { font-size: var(--ai-font-sm); font-weight: var(--ai-fw-medium); display: block; margin-bottom: var(--ai-spacing-xs); }
.form-group { display: flex; flex-direction: column; gap: var(--ai-spacing-xs); }
select.input { cursor: pointer; appearance: auto; }

/* ===== Badge ===== */
.badge {
  display: inline-flex; align-items: center; gap: var(--ai-spacing-xs);
  padding: 2px var(--ai-spacing-md); border-radius: var(--ai-radius-full);
  font-size: var(--ai-font-xs); font-weight: var(--ai-fw-medium);
}
.badge-success { background: rgba(74,222,128,0.15); color: #4ade80; }
.badge-warning { background: rgba(251,191,36,0.15); color: #fbbf24; }
.badge-error { background: rgba(248,113,113,0.15); color: #f87171; }
.badge-info { background: rgba(96,165,250,0.15); color: #60a5fa; }
.badge-neutral { background: rgba(255,255,255,0.06); color: var(--vscode-descriptionForeground, #8888a0); }

/* ===== Progress ===== */
.progress { width: 100%; height: 6px; background: rgba(255,255,255,0.08); border-radius: var(--ai-radius-full); overflow: hidden; }
.progress-bar { height: 100%; background: var(--vscode-button-background, #6c8cff); border-radius: var(--ai-radius-full); transition: width 200ms; }
.progress-label { display: flex; justify-content: space-between; font-size: var(--ai-font-xs); color: var(--vscode-descriptionForeground, #8888a0); margin-top: var(--ai-spacing-xs); }

/* ===== Chat / Conversation ===== */
.chat { display: flex; flex-direction: column; gap: var(--ai-spacing-md); max-height: 400px; overflow-y: auto; padding: var(--ai-spacing-md); }
.chat-msg { display: flex; gap: var(--ai-spacing-md); padding: var(--ai-spacing-md); border-radius: var(--ai-radius-md); }
.chat-msg-user { background: rgba(108,140,255,0.08); }
.chat-msg-assistant { background: rgba(74,222,128,0.06); border: 1px solid rgba(74,222,128,0.1); }
.chat-avatar {
  width: 28px; height: 28px; border-radius: 50%; display: flex;
  align-items: center; justify-content: center; flex-shrink: 0; font-size: var(--ai-font-xs); font-weight: var(--ai-fw-bold);
}
.chat-msg-user .chat-avatar { background: rgba(108,140,255,0.2); color: #6c8cff; }
.chat-msg-assistant .chat-avatar { background: rgba(74,222,128,0.2); color: #4ade80; }
.chat-bubble { flex: 1; font-size: var(--ai-font-sm); line-height: var(--ai-lh-relaxed); }
.chat-bubble-meta { font-size: var(--ai-font-xs); color: var(--vscode-descriptionForeground, #8888a0); margin-top: var(--ai-spacing-xs); }

/* ===== Token Estimation ===== */
.token-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: var(--ai-spacing-md); }
.token-card {
  text-align: center; padding: var(--ai-spacing-lg);
  background: var(--vscode-editor-background, #1e1e2e);
  border: 1px solid var(--ai-glass-border); border-radius: var(--ai-radius-md);
}
.token-card-label { font-size: var(--ai-font-xs); color: var(--vscode-descriptionForeground, #8888a0); margin-bottom: var(--ai-spacing-sm); font-weight: var(--ai-fw-medium); text-transform: uppercase; letter-spacing: 0.5px; }
.token-card-value { font-size: var(--ai-font-xl); font-weight: var(--ai-fw-bold); color: var(--vscode-button-background, #6c8cff); }
.token-card-detail { font-size: var(--ai-font-xs); color: var(--vscode-descriptionForeground, #8888a0); margin-top: var(--ai-spacing-sm); }
.token-card-detail span { color: var(--vscode-foreground, #e0e0e8); font-weight: var(--ai-fw-semibold); }
.token-warning { display: flex; align-items: center; gap: var(--ai-spacing-sm); padding: var(--ai-spacing-md); background: rgba(251,191,36,0.08); border: 1px solid rgba(251,191,36,0.15); border-radius: var(--ai-radius-sm); margin-top: var(--ai-spacing-md); font-size: var(--ai-font-sm); color: #fbbf24; }

/* ===== Execution Mode Cards ===== */
.exec-modes { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: var(--ai-spacing-md); }
.exec-mode {
  padding: var(--ai-spacing-xl); border: 2px solid var(--ai-glass-border);
  border-radius: var(--ai-radius-lg); cursor: pointer; text-align: center;
  transition: all var(--ai-duration-fast) var(--ai-easing);
  background: var(--ai-glass-bg); backdrop-filter: var(--ai-glass-blur);
}
.exec-mode:hover { border-color: rgba(255,255,255,0.15); background: rgba(255,255,255,0.03); }
.exec-mode.selected { border-color: var(--vscode-button-background, #6c8cff); background: rgba(108,140,255,0.1); }
.exec-mode:focus-visible { outline: 2px solid var(--vscode-focusBorder, #6c8cff); outline-offset: 2px; }
.exec-mode-icon { margin-bottom: var(--ai-spacing-md); color: var(--vscode-descriptionForeground, #8888a0); }
.exec-mode.selected .exec-mode-icon { color: var(--vscode-button-background, #6c8cff); }
.exec-mode-name { font-size: var(--ai-font-sm); font-weight: var(--ai-fw-semibold); margin-bottom: var(--ai-spacing-xs); }
.exec-mode-desc { font-size: var(--ai-font-xs); color: var(--vscode-descriptionForeground, #8888a0); line-height: var(--ai-lh-normal); }

/* ===== Dashboard: Status Bar ===== */
.dash-statusbar { display: flex; align-items: center; gap: var(--ai-spacing-md); flex-wrap: wrap; }
.dash-statusbar .badge { font-size: var(--ai-font-xs); }

/* ===== Dashboard: Milestone Progress ===== */
.milestone-list { display: flex; flex-direction: column; gap: var(--ai-spacing-sm); }
.milestone-item {
  display: flex; align-items: center; gap: var(--ai-spacing-md);
  padding: var(--ai-spacing-sm) var(--ai-spacing-md);
  border-radius: var(--ai-radius-sm); cursor: pointer;
  transition: background var(--ai-duration-fast) var(--ai-easing);
}
.milestone-item:hover { background: rgba(255,255,255,0.04); }
.milestone-icon { width: 20px; height: 20px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.milestone-name { font-size: var(--ai-font-sm); font-weight: var(--ai-fw-medium); flex: 1; }
.milestone-steps { font-size: var(--ai-font-xs); color: var(--vscode-descriptionForeground, #8888a0); }
.milestone-icon svg { width: 16px; height: 16px; }

/* ===== Dashboard: Approval ===== */
.approval-card {
  background: rgba(108,140,255,0.06); border: 1px solid rgba(108,140,255,0.15);
  border-radius: var(--ai-radius-lg); padding: var(--ai-spacing-xl);
}
.approval-title { font-size: var(--ai-font-base); font-weight: var(--ai-fw-semibold); margin-bottom: var(--ai-spacing-md); }
.approval-details { display: flex; flex-direction: column; gap: var(--ai-spacing-sm); margin-bottom: var(--ai-spacing-lg); font-size: var(--ai-font-sm); }
.approval-files { display: flex; flex-wrap: wrap; gap: var(--ai-spacing-xs); }
.file-badge { padding: 2px var(--ai-spacing-sm); border-radius: var(--ai-radius-xs); font-size: var(--ai-font-xs); font-family: 'Cascadia Code','Fira Code',monospace; background: rgba(255,255,255,0.06); }
.file-badge-created { color: #4ade80; }
.file-badge-modified { color: #60a5fa; }
.file-badge-deleted { color: #f87171; }
.approval-actions { display: flex; gap: var(--ai-spacing-sm); flex-wrap: wrap; }

/* ===== Dashboard: Logs ===== */
.logs {
  background: var(--vscode-terminal-background, #171723); border: 1px solid var(--ai-glass-border);
  border-radius: var(--ai-radius-sm); padding: var(--ai-spacing-md);
  font-family: 'Cascadia Code','Fira Code',monospace; font-size: var(--ai-font-xs);
  max-height: 250px; overflow-y: auto; color: var(--vscode-descriptionForeground, #8888a0);
}
.log-line { padding: 1px 0; line-height: var(--ai-lh-relaxed); }
.log-success { color: #4ade80; }
.log-error { color: #f87171; }
.log-warning { color: #fbbf24; }
.log-info { color: #60a5fa; }

/* ===== Dashboard: Modified Files ===== */
.modified-file-list { display: flex; flex-direction: column; gap: 2px; }
.modified-file {
  display: flex; align-items: center; gap: var(--ai-spacing-sm);
  padding: var(--ai-spacing-xs) var(--ai-spacing-sm); font-size: var(--ai-font-xs);
  font-family: 'Cascadia Code','Fira Code',monospace;
  border-radius: var(--ai-radius-xs);
}
.modified-file:hover { background: rgba(255,255,255,0.04); }
.modified-file svg { width: 14px; height: 14px; flex-shrink: 0; }

/* ===== Dashboard: Recovery Banner ===== */
.recovery-banner {
  background: rgba(251,191,36,0.1); border: 1px solid rgba(251,191,36,0.2);
  border-radius: var(--ai-radius-md); padding: var(--ai-spacing-lg);
  display: flex; align-items: flex-start; gap: var(--ai-spacing-md);
}
.recovery-icon { color: #fbbf24; flex-shrink: 0; margin-top: 2px; }
.recovery-body { flex: 1; }
.recovery-title { font-size: var(--ai-font-sm); font-weight: var(--ai-fw-semibold); margin-bottom: var(--ai-spacing-xs); }
.recovery-desc { font-size: var(--ai-font-xs); color: var(--vscode-descriptionForeground, #8888a0); }
.recovery-actions { display: flex; gap: var(--ai-spacing-sm); margin-top: var(--ai-spacing-md); }

/* ===== Plan Milestone Tree ===== */
.plan-tree { display: flex; flex-direction: column; gap: var(--ai-spacing-sm); }
.plan-milestone {
  border: 1px solid var(--ai-glass-border); border-radius: var(--ai-radius-md);
  overflow: hidden; transition: border-color var(--ai-duration-fast) var(--ai-easing);
}
.plan-milestone:hover { border-color: rgba(255,255,255,0.12); }
.plan-milestone-header {
  display: flex; align-items: center; gap: var(--ai-spacing-md);
  padding: var(--ai-spacing-md) var(--ai-spacing-lg); cursor: pointer;
  background: rgba(255,255,255,0.02);
}
.plan-milestone-header:hover { background: rgba(255,255,255,0.04); }
.plan-milestone-chevron { transition: transform var(--ai-duration-fast) var(--ai-easing); color: var(--vscode-descriptionForeground, #8888a0); }
.plan-milestone.expanded .plan-milestone-chevron { transform: rotate(90deg); }
.plan-milestone-name { font-size: var(--ai-font-sm); font-weight: var(--ai-fw-semibold); flex: 1; }
.plan-milestone-meta { font-size: var(--ai-font-xs); color: var(--vscode-descriptionForeground, #8888a0); display: flex; gap: var(--ai-spacing-md); }
.plan-milestone-body { padding: 0 var(--ai-spacing-lg) var(--ai-spacing-md); display: none; }
.plan-milestone.expanded .plan-milestone-body { display: block; }
.plan-step-row { display: flex; align-items: center; gap: var(--ai-spacing-sm); padding: var(--ai-spacing-xs) 0; font-size: var(--ai-font-xs); color: var(--vscode-descriptionForeground, #8888a0); }
.plan-step-num { width: 18px; height: 18px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 10px; background: rgba(108,140,255,0.1); color: var(--vscode-button-background, #6c8cff); flex-shrink: 0; }

/* ===== Memory / Summary ===== */
.summary-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: var(--ai-spacing-md); }
.summary-item { text-align: center; padding: var(--ai-spacing-md); background: var(--vscode-editor-background, #1e1e2e); border-radius: var(--ai-radius-sm); }
.summary-value { font-size: var(--ai-font-xl); font-weight: var(--ai-fw-bold); color: var(--vscode-button-background, #6c8cff); }
.summary-label { font-size: var(--ai-font-xs); color: var(--vscode-descriptionForeground, #8888a0); margin-top: 2px; }
.memory-row { display: flex; align-items: center; justify-content: space-between; padding: var(--ai-spacing-md) 0; border-bottom: 1px solid var(--ai-glass-border); }
.memory-label { font-size: var(--ai-font-sm); font-weight: var(--ai-fw-medium); }
.memory-desc { font-size: var(--ai-font-xs); color: var(--vscode-descriptionForeground, #8888a0); margin-top: 2px; }
.memory-entries { display: flex; flex-direction: column; gap: var(--ai-spacing-xs); margin-top: var(--ai-spacing-md); }
.memory-entry {
  display: flex; align-items: center; gap: var(--ai-spacing-sm);
  padding: var(--ai-spacing-sm) var(--ai-spacing-md); font-size: var(--ai-font-xs);
  background: rgba(255,255,255,0.02); border-radius: var(--ai-radius-sm);
}
.memory-entry-type { padding: 1px var(--ai-spacing-sm); border-radius: var(--ai-radius-xs); font-size: 10px; font-weight: var(--ai-fw-semibold); text-transform: uppercase; }
.type-state { background: rgba(108,140,255,0.15); color: #6c8cff; }
.type-plan { background: rgba(74,222,128,0.15); color: #4ade80; }
.type-history { background: rgba(251,191,36,0.15); color: #fbbf24; }

/* ===== Constraint Form ===== */
.constraint-grid { display: grid; grid-template-columns: 1fr 1fr; gap: var(--ai-spacing-lg); }
.constraint-grid .form-group.full-width { grid-column: 1 / -1; }
.radio-group { display: flex; flex-direction: column; gap: var(--ai-spacing-sm); }
.radio-label { display: flex; align-items: center; gap: var(--ai-spacing-sm); font-size: var(--ai-font-sm); cursor: pointer; }
.radio-label input[type="radio"] { accent-color: var(--vscode-button-background, #6c8cff); }

/* ===== Settings Modal ===== */
.modal-overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,0.5); backdrop-filter: blur(4px);
  display: none; align-items: center; justify-content: center; z-index: 1000;
}
.modal-overlay.open { display: flex; }
.modal {
  background: var(--vscode-sideBar-background, #252536); border: 1px solid var(--ai-glass-border);
  border-radius: var(--ai-radius-xl); padding: var(--ai-spacing-2xl);
  width: 90%; max-width: 560px; max-height: 80vh; overflow-y: auto;
  box-shadow: 0 24px 48px rgba(0,0,0,0.4);
}
.modal-title { font-size: var(--ai-font-lg); font-weight: var(--ai-fw-semibold); margin-bottom: var(--ai-spacing-xl); }
.modal-actions { display: flex; gap: var(--ai-spacing-sm); justify-content: flex-end; margin-top: var(--ai-spacing-xl); }
.setting-row { display: flex; align-items: center; justify-content: space-between; padding: var(--ai-spacing-md) 0; border-bottom: 1px solid var(--ai-glass-border); }
.setting-label { font-size: var(--ai-font-sm); font-weight: var(--ai-fw-medium); }
.setting-desc { font-size: var(--ai-font-xs); color: var(--vscode-descriptionForeground, #8888a0); margin-top: 2px; }
.toggle { position: relative; width: 36px; height: 20px; cursor: pointer; }
.toggle input { opacity: 0; width: 0; height: 0; }
.toggle-track { position: absolute; inset: 0; background: rgba(255,255,255,0.1); border-radius: 10px; transition: background var(--ai-duration-fast) var(--ai-easing); }
.toggle input:checked + .toggle-track { background: var(--vscode-button-background, #6c8cff); }
.toggle-knob { position: absolute; top: 2px; left: 2px; width: 16px; height: 16px; background: #fff; border-radius: 50%; transition: transform var(--ai-duration-fast) var(--ai-easing); }
.toggle input:checked ~ .toggle-knob { transform: translateX(16px); }
.provider-health { display: flex; align-items: center; gap: var(--ai-spacing-xs); }
.health-dot { width: 8px; height: 8px; border-radius: 50%; }
.health-dot.ok { background: #4ade80; }
.health-dot.warn { background: #fbbf24; }
.health-dot.err { background: #f87171; }

/* ===== Skeleton Loading ===== */
.skeleton { background: linear-gradient(90deg, rgba(255,255,255,0.04) 25%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.04) 75%); background-size: 200% 100%; animation: shimmer 1.5s infinite; border-radius: var(--ai-radius-sm); }
@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
.skeleton-line { height: 14px; margin-bottom: var(--ai-spacing-sm); }
.skeleton-line:last-child { width: 60%; }

/* ===== Dashboard Live Stats ===== */
.live-stats { display: grid; grid-template-columns: 1fr 1fr; gap: var(--ai-spacing-md); }
.live-stat { padding: var(--ai-spacing-md); background: rgba(255,255,255,0.02); border-radius: var(--ai-radius-sm); }
.live-stat-label { font-size: var(--ai-font-xs); color: var(--vscode-descriptionForeground, #8888a0); margin-bottom: 2px; }
.live-stat-value { font-size: var(--ai-font-lg); font-weight: var(--ai-fw-bold); font-variant-numeric: tabular-nums; }

/* ===== Animations ===== */
@keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }
.pulse { animation: pulse 1.5s infinite; }

/* ===== Responsive ===== */
@media (max-width: 640px) {
  .constraint-grid { grid-template-columns: 1fr; }
  .exec-modes { grid-template-columns: 1fr; }
  .token-grid { grid-template-columns: 1fr; }
  .live-stats { grid-template-columns: 1fr; }
  .summary-grid { grid-template-columns: 1fr 1fr; }
  .compression-stats { grid-template-columns: 1fr; }
  .context-meter-stats { flex-direction: column; gap: var(--ai-spacing-sm); }
}

/* ===== Reduced Motion ===== */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation-duration: 0ms !important; transition-duration: 0ms !important; }
}

/* ===== Repository Map ===== */
.repo-map { display: flex; flex-direction: column; gap: var(--ai-spacing-md); }
.repo-map-header { display: flex; align-items: center; gap: var(--ai-spacing-md); flex-wrap: wrap; }
.repo-map-type { font-size: var(--ai-font-sm); font-weight: var(--ai-fw-semibold); }
.repo-map-langs { display: flex; gap: var(--ai-spacing-xs); flex-wrap: wrap; }
.repo-map-frameworks { display: flex; gap: var(--ai-spacing-xs); flex-wrap: wrap; }
.repo-dep-list { display: flex; flex-direction: column; gap: 2px; }
.repo-dep-item { display: flex; align-items: center; gap: var(--ai-spacing-sm); padding: 2px 0; font-size: var(--ai-font-xs); }
.repo-dep-item .dep-rank { width: 20px; text-align: right; color: var(--vscode-descriptionForeground, #8888a0); flex-shrink: 0; }
.repo-dep-item .dep-path { font-family: 'Cascadia Code','Fira Code',monospace; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.repo-dep-item .dep-count { color: var(--vscode-descriptionForeground, #8888a0); flex-shrink: 0; }

/* ===== Repair Panel ===== */
.repair-panel { display: flex; flex-direction: column; gap: var(--ai-spacing-sm); }
.repair-attempt { display: flex; align-items: center; gap: var(--ai-spacing-sm); padding: var(--ai-spacing-sm) var(--ai-spacing-md); background: rgba(255,255,255,0.02); border-radius: var(--ai-radius-sm); font-size: var(--ai-font-xs); }
.repair-attempt .attempt-num { width: 20px; text-align: center; color: var(--vscode-descriptionForeground, #8888a0); }
.repair-attempt .attempt-type { font-family: 'Cascadia Code','Fira Code',monospace; flex: 1; }
.repair-attempt .attempt-result { padding: 1px var(--ai-spacing-sm); border-radius: var(--ai-radius-xs); font-weight: var(--ai-fw-semibold); }
.repair-attempt .attempt-result.success { background: rgba(74,222,128,0.15); color: #4ade80; }
.repair-attempt .attempt-result.partial { background: rgba(251,191,36,0.15); color: #fbbf24; }
.repair-attempt .attempt-result.failed { background: rgba(248,113,113,0.15); color: #f87171; }
.repair-budget { display: flex; align-items: center; gap: var(--ai-spacing-md); font-size: var(--ai-font-xs); color: var(--vscode-descriptionForeground, #8888a0); }

/* ===== Git Panel ===== */
.git-panel { display: flex; flex-direction: column; gap: var(--ai-spacing-sm); }
.git-branch { display: flex; align-items: center; gap: var(--ai-spacing-sm); font-size: var(--ai-font-sm); font-weight: var(--ai-fw-medium); }
.git-branch svg { color: var(--vscode-button-background, #6c8cff); }
.git-stats { display: flex; gap: var(--ai-spacing-md); flex-wrap: wrap; }
.git-stat { display: flex; align-items: center; gap: var(--ai-spacing-xs); font-size: var(--ai-font-xs); }
.git-commits { display: flex; flex-direction: column; gap: 2px; }
.git-commit { display: flex; align-items: center; gap: var(--ai-spacing-sm); padding: 2px 0; font-size: var(--ai-font-xs); }
.git-commit-hash { font-family: 'Cascadia Code','Fira Code',monospace; color: var(--vscode-button-background, #6c8cff); flex-shrink: 0; }
.git-commit-msg { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

/* ===== Context Meter ===== */
.context-meter { display: flex; flex-direction: column; gap: var(--ai-spacing-sm); }
.context-meter-stats { display: flex; gap: var(--ai-spacing-lg); font-size: var(--ai-font-xs); }
.context-meter-stat { display: flex; flex-direction: column; }
.context-meter-stat .stat-value { font-size: var(--ai-font-lg); font-weight: var(--ai-fw-bold); font-variant-numeric: tabular-nums; }
.context-meter-stat .stat-label { color: var(--vscode-descriptionForeground, #8888a0); }

/* ===== Compression Viz ===== */
.compression-viz { display: flex; flex-direction: column; gap: var(--ai-spacing-md); }
.compression-stats { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: var(--ai-spacing-md); }
.compression-stat { text-align: center; padding: var(--ai-spacing-md); background: var(--vscode-editor-background, #1e1e2e); border-radius: var(--ai-radius-sm); }
.compression-stat .stat-value { font-size: var(--ai-font-xl); font-weight: var(--ai-fw-bold); color: var(--vscode-button-background, #6c8cff); }
.compression-stat .stat-label { font-size: var(--ai-font-xs); color: var(--vscode-descriptionForeground, #8888a0); margin-top: 2px; }

/* ===== Decision Logs ===== */
.decision-logs { display: flex; flex-direction: column; gap: var(--ai-spacing-xs); max-height: 200px; overflow-y: auto; }
.decision-entry { display: flex; gap: var(--ai-spacing-md); padding: var(--ai-spacing-sm); font-size: var(--ai-font-xs); border-bottom: 1px solid var(--ai-glass-border); }
.decision-time { color: var(--vscode-descriptionForeground, #8888a0); flex-shrink: 0; font-family: 'Cascadia Code','Fira Code',monospace; font-size: 10px; }
.decision-type { padding: 1px var(--ai-spacing-sm); border-radius: var(--ai-radius-xs); font-weight: var(--ai-fw-semibold); font-size: 10px; text-transform: uppercase; flex-shrink: 0; }
.decision-type.execution { background: rgba(108,140,255,0.15); color: #6c8cff; }
.decision-type.repair { background: rgba(251,191,36,0.15); color: #fbbf24; }
.decision-type.verification { background: rgba(74,222,128,0.15); color: #4ade80; }
.decision-text { flex: 1; line-height: var(--ai-lh-relaxed); }
</style>
</head>
<body>
<div id="app">

<!-- ===== Top Bar ===== -->
<div class="topbar">
  <div class="topbar-left">
    <div class="topbar-title">
      <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10 1l2 5 5 2-5 2-2 5-2-5-5-2 5-2 2-5z"/></svg>
      AI Execution
    </div>
  </div>
  <div class="topbar-right">
    <select class="provider-select" id="providerSelect" aria-label="Select AI provider" onchange="changeProvider(this.value)">
      <option value="auto">Auto</option>
      <option value="openai">OpenAI</option>
      <option value="anthropic">Anthropic</option>
      <option value="google">Google</option>
    </select>
    <button class="btn btn-sm" onclick="openSettings()" title="Settings" aria-label="Open settings">
      <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="10" cy="10" r="3"/><path d="M10 1v2m0 14v2m-9-9h2m14 0h2m-2.636-6.364l-1.414 1.414M4.05 15.95l-1.414 1.414m0-12.728l1.414 1.414M15.95 15.95l1.414 1.414"/></svg>
    </button>
  </div>
</div>

<!-- ===== Step Indicator ===== -->
<div class="steps" id="stepsBar">
  <div class="step active" data-step="0" onclick="goToStep(0)"><span class="step-num">1</span>Project</div>
  <div class="step-connector"></div>
  <div class="step" data-step="1" onclick="goToStep(1)"><span class="step-num">2</span>Idea</div>
  <div class="step-connector"></div>
  <div class="step" data-step="2" onclick="goToStep(2)"><span class="step-num">3</span>Refine</div>
  <div class="step-connector"></div>
  <div class="step" data-step="3" onclick="goToStep(3)"><span class="step-num">4</span>Constraints</div>
  <div class="step-connector"></div>
  <div class="step" data-step="4" onclick="goToStep(4)"><span class="step-num">5</span>Plan</div>
  <div class="step-connector"></div>
  <div class="step" data-step="5" onclick="goToStep(5)"><span class="step-num">6</span>Estimate</div>
  <div class="step-connector"></div>
  <div class="step" data-step="6" onclick="goToStep(6)"><span class="step-num">7</span>Mode</div>
  <div class="step-connector"></div>
  <div class="step" data-step="7" onclick="goToStep(7)"><span class="step-num">8</span>Execute</div>
  <div class="step-connector"></div>
  <div class="step" data-step="8" onclick="goToStep(8)"><span class="step-num">9</span>Memory</div>
</div>

<!-- ===== Content Panels ===== -->
<div class="content" id="content">

  <!-- Panel 0: Project Creation -->
  <div class="panel active" id="panel-0">
    <div class="card">
      <div class="card-title">
        <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M2 4h16v12H2z"/><path d="M6 4V2h8v2"/></svg>
        Create Project
      </div>
      <div style="display:flex;flex-direction:column;gap:var(--ai-spacing-lg);">
        <div class="form-group">
          <label class="label" for="projectName">Project Name *</label>
          <input type="text" class="input" id="projectName" placeholder="my-ai-project" aria-required="true"/>
        </div>
        <div class="form-group">
          <label class="label" for="projectDesc">Description</label>
          <textarea class="input" id="projectDesc" placeholder="Describe your project goals and requirements..." style="min-height:80px;"></textarea>
        </div>
        <div class="form-group">
          <label class="label" for="projectPath">Workspace Path</label>
          <input type="text" class="input" id="projectPath" placeholder="/path/to/workspace" />
        </div>
        <div style="display:flex;gap:var(--ai-spacing-sm);justify-content:flex-end;">
          <button class="btn-primary btn" onclick="createProject()">Create Project</button>
        </div>
      </div>
    </div>
    <div class="card" id="recentProjectsCard" style="display:none;">
      <div class="card-title">Recent Projects</div>
      <div id="recentProjectsList"></div>
    </div>
  </div>

  <!-- Panel 1: Idea Input -->
  <div class="panel" id="panel-1">
    <div class="card">
      <div class="card-title">
        <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M10 2a7 7 0 017 7c0 3-2 5-4 7l-3 2-3-2c-2-2-4-4-4-7a7 7 0 017-7z"/></svg>
        Describe Your Idea
      </div>
      <div class="card-subtitle">Tell the AI what you want to build. Be specific about features, constraints, and goals.</div>
      <div style="display:flex;flex-direction:column;gap:var(--ai-spacing-lg);margin-top:var(--ai-spacing-lg);">
        <div class="form-group">
          <textarea class="input" id="ideaInput" placeholder="I want to build a REST API with user authentication, CRUD operations for posts, and real-time notifications..." style="min-height:140px;" aria-label="Describe your idea"></textarea>
        </div>
        <div style="display:flex;gap:var(--ai-spacing-sm);justify-content:space-between;align-items:center;">
          <span class="badge badge-info" id="ideaCharCount">0 characters</span>
          <div style="display:flex;gap:var(--ai-spacing-sm);">
            <button class="btn-primary btn" onclick="submitIdea()">Submit Idea</button>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Panel 2: AI Refinement Conversation -->
  <div class="panel" id="panel-2">
    <div class="card">
      <div class="card-title">
        <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4 4h12v10H4z"/><path d="M7 14l3 4 3-4"/></svg>
        AI Refinement
      </div>
      <div class="card-subtitle">Review how the AI understands and refines your idea.</div>
      <div class="chat" id="refineChat">
        <div class="chat-msg chat-msg-user" id="refineUserMsg" style="display:none;">
          <div class="chat-avatar">U</div>
          <div class="chat-bubble"><div id="refineUserContent"></div><div class="chat-bubble-meta">Your idea</div></div>
        </div>
        <div class="chat-msg chat-msg-assistant" id="refineAssistantMsg" style="display:none;">
          <div class="chat-avatar">AI</div>
          <div class="chat-bubble"><div id="refineAssistantContent">Refining your idea...</div><div class="chat-bubble-meta">AI refinement</div></div>
        </div>
        <div id="refineSkeleton" style="display:none;">
          <div class="skeleton skeleton-line" style="width:80%"></div>
          <div class="skeleton skeleton-line" style="width:65%"></div>
          <div class="skeleton skeleton-line" style="width:70%"></div>
        </div>
      </div>
      <div style="display:flex;gap:var(--ai-spacing-sm);justify-content:flex-end;margin-top:var(--ai-spacing-lg);">
        <button class="btn" onclick="regenerateRefinement()">
          <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M1 4v5h5"/><path d="M3.5 13A7 7 0 1017 10"/></svg>
          Regenerate
        </button>
        <button class="btn-primary btn" onclick="acceptRefinement()">Accept &amp; Continue</button>
      </div>
    </div>
  </div>

  <!-- Panel 3: Constraint Collection -->
  <div class="panel" id="panel-3">
    <div class="card">
      <div class="card-title">
        <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="2" width="16" height="16" rx="2"/><path d="M6 6h8M6 10h8M6 14h4"/></svg>
        Constraints &amp; Preferences
      </div>
      <div class="constraint-grid">
        <div class="form-group">
          <label class="label" for="constraintBudget">Budget</label>
          <select class="input" id="constraintBudget">
            <option value="free">Free</option>
            <option value="5">$5</option>
            <option value="10">$10</option>
            <option value="25" selected>$25</option>
            <option value="50">$50</option>
            <option value="100">$100</option>
            <option value="unlimited">Unlimited</option>
          </select>
        </div>
        <div class="form-group">
          <label class="label" for="constraintModel">Preferred Model</label>
          <select class="input" id="constraintModel">
            <option value="auto">Auto</option>
            <option value="gpt-4o">GPT-4o</option>
            <option value="claude-sonnet-4">Claude Sonnet 4</option>
            <option value="gemini-2.0-flash">Gemini 2.0 Flash</option>
            <option value="gpt-4o-mini">GPT-4o Mini</option>
            <option value="claude-haiku-3.5">Claude Haiku 3.5</option>
          </select>
        </div>
        <div class="form-group full-width">
          <label class="label">Autonomous Level</label>
          <div class="radio-group">
            <label class="radio-label"><input type="radio" name="autonomousLevel" value="full" /> Full Autonomous</label>
            <label class="radio-label"><input type="radio" name="autonomousLevel" value="milestone" checked /> Milestone Approval</label>
            <label class="radio-label"><input type="radio" name="autonomousLevel" value="step" /> Step-by-Step</label>
          </div>
        </div>
        <div class="form-group">
          <label class="label" for="constraintLanguages">Coding Languages</label>
          <input type="text" class="input" id="constraintLanguages" placeholder="TypeScript, Python, Rust" />
        </div>
        <div class="form-group">
          <label class="label" for="constraintDeploy">Deployment Target</label>
          <select class="input" id="constraintDeploy">
            <option value="local" selected>Local</option>
            <option value="docker">Docker</option>
            <option value="cloud">Cloud</option>
            <option value="static">Static</option>
            <option value="none">None</option>
          </select>
        </div>
        <div class="form-group">
          <label class="label" for="constraintTime">Timeframe</label>
          <select class="input" id="constraintTime">
            <option value="<1hr">Less than 1 hour</option>
            <option value="1-4hrs" selected>1-4 hours</option>
            <option value="4-8hrs">4-8 hours</option>
            <option value="1-2days">1-2 days</option>
            <option value="custom">Custom</option>
          </select>
        </div>
      </div>
      <div style="display:flex;gap:var(--ai-spacing-sm);justify-content:flex-end;margin-top:var(--ai-spacing-xl);">
        <button class="btn-primary btn" onclick="submitConstraints()">Continue</button>
      </div>
    </div>
  </div>

  <!-- Panel 4: Execution Plan -->
  <div class="panel" id="panel-4">
    <div class="card">
      <div style="display:flex;justify-content:space-between;align-items:center;">
        <div class="card-title" style="margin-bottom:0;">
          <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3 3h4v4H3zM11 3h4v4h-4zM3 11h4v4H3zM11 11h4v4h-4z"/></svg>
          Execution Plan
        </div>
        <div style="display:flex;gap:var(--ai-spacing-sm);">
          <button class="btn btn-sm" onclick="editPlan()" id="editPlanBtn">Edit Plan</button>
          <button class="btn btn-sm" onclick="regeneratePlan()">
            <svg width="12" height="12" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M1 4v5h5"/><path d="M3.5 13A7 7 0 1017 10"/></svg>
            Regenerate
          </button>
        </div>
      </div>
      <div id="planEditor" style="display:none;margin-top:var(--ai-spacing-lg);">
        <textarea class="input" id="planEditorText" style="min-height:200px;font-family:'Cascadia Code','Fira Code',monospace;font-size:var(--ai-font-xs);" placeholder="Edit the plan JSON..."></textarea>
        <div style="display:flex;gap:var(--ai-spacing-sm);justify-content:flex-end;margin-top:var(--ai-spacing-sm);">
          <button class="btn btn-sm" onclick="cancelEditPlan()">Cancel</button>
          <button class="btn-primary btn btn-sm" onclick="saveEditedPlan()">Save</button>
        </div>
      </div>
      <div id="planTree" class="plan-tree" style="margin-top:var(--ai-spacing-lg);"></div>
    </div>
    <div style="display:flex;gap:var(--ai-spacing-sm);justify-content:flex-end;">
      <button class="btn-primary btn" onclick="goToStep(5)">Continue</button>
    </div>
  </div>

  <!-- Panel 5: Token Estimation -->
  <div class="panel" id="panel-5">
    <div class="card">
      <div class="card-title">
        <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="10" cy="10" r="8"/><path d="M10 6v4l3 3"/></svg>
        Token Estimation
      </div>
      <div style="display:flex;gap:var(--ai-spacing-md);margin-bottom:var(--ai-spacing-lg);">
        <span class="badge badge-info" id="estProvider">Provider: Auto</span>
        <span class="badge badge-neutral" id="estModel">Model: Auto</span>
      </div>
      <div class="token-grid">
        <div class="token-card">
          <div class="token-card-label">Optimistic</div>
          <div class="token-card-value" id="tokenOptTotal">--</div>
          <div class="token-card-detail">In: <span id="tokenOptIn">--</span></div>
          <div class="token-card-detail">Out: <span id="tokenOptOut">--</span></div>
          <div class="token-card-detail">Cost: <span id="tokenOptCost">--</span></div>
          <div class="token-card-detail">Duration: <span id="tokenOptDur">--</span></div>
        </div>
        <div class="token-card" style="border-color:rgba(108,140,255,0.2);">
          <div class="token-card-label" style="color:#6c8cff;">Expected</div>
          <div class="token-card-value" id="tokenExpTotal">--</div>
          <div class="token-card-detail">In: <span id="tokenExpIn">--</span></div>
          <div class="token-card-detail">Out: <span id="tokenExpOut">--</span></div>
          <div class="token-card-detail">Cost: <span id="tokenExpCost">--</span></div>
          <div class="token-card-detail">Duration: <span id="tokenExpDur">--</span></div>
        </div>
        <div class="token-card">
          <div class="token-card-label" style="color:#f87171;">Worst-case</div>
          <div class="token-card-value" id="tokenWcTotal">--</div>
          <div class="token-card-detail">In: <span id="tokenWcIn">--</span></div>
          <div class="token-card-detail">Out: <span id="tokenWcOut">--</span></div>
          <div class="token-card-detail">Cost: <span id="tokenWcCost">--</span></div>
          <div class="token-card-detail">Duration: <span id="tokenWcDur">--</span></div>
        </div>
      </div>
      <div class="token-warning" id="contextLimitWarning" style="display:none;">
        <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M10 2l8 16H2z"/><path d="M10 7v4M10 14h0"/></svg>
        <span id="contextLimitText">Approaching context limit for selected model.</span>
      </div>
    </div>
    <div style="display:flex;gap:var(--ai-spacing-sm);justify-content:flex-end;">
      <button class="btn-primary btn" onclick="goToStep(6)">Continue</button>
    </div>
  </div>

  <!-- Panel 6: Execution Mode Selection -->
  <div class="panel" id="panel-6">
    <div class="card">
      <div class="card-title">
        <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3 10h14M10 3v14"/></svg>
        Execution Mode
      </div>
      <div class="exec-modes">
        <div class="exec-mode" data-mode="step" onclick="selectExecMode(this)" tabindex="0" role="button" aria-label="Approve every step mode">
          <div class="exec-mode-icon">
            <svg width="28" height="28" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.2"><rect x="2" y="2" width="6" height="6" rx="1"/><rect x="12" y="2" width="6" height="6" rx="1"/><rect x="2" y="12" width="6" height="6" rx="1"/><rect x="12" y="12" width="6" height="6" rx="1"/></svg>
          </div>
          <div class="exec-mode-name">Approve Every Step</div>
          <div class="exec-mode-desc">Review and approve each individual step before execution continues</div>
        </div>
        <div class="exec-mode selected" data-mode="milestone" onclick="selectExecMode(this)" tabindex="0" role="button" aria-label="Approve milestones mode">
          <div class="exec-mode-icon">
            <svg width="28" height="28" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.2"><path d="M3 10h4m6 0h4"/><circle cx="10" cy="10" r="2"/><circle cx="2" cy="10" r="1.5"/><circle cx="18" cy="10" r="1.5"/></svg>
          </div>
          <div class="exec-mode-name">Approve Milestones</div>
          <div class="exec-mode-desc">Pause only at major milestones; auto-execute steps within each milestone</div>
        </div>
        <div class="exec-mode" data-mode="autonomous" onclick="selectExecMode(this)" tabindex="0" role="button" aria-label="Fully autonomous mode">
          <div class="exec-mode-icon">
            <svg width="28" height="28" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.2"><path d="M10 1l2.5 6.5L19 10l-6.5 2.5L10 19l-2.5-6.5L1 10l6.5-2.5z"/></svg>
          </div>
          <div class="exec-mode-name">Fully Autonomous</div>
          <div class="exec-mode-desc">Execute the entire plan without interruption; best for trusted workflows</div>
        </div>
      </div>
    </div>
    <div style="display:flex;gap:var(--ai-spacing-sm);justify-content:flex-end;">
      <button class="btn-primary btn" onclick="startExecution()">Start Execution</button>
    </div>
  </div>

  <!-- Panel 7: Live Execution Dashboard -->
  <div class="panel" id="panel-7">
    <!-- Status Bar -->
    <div class="card" style="padding:var(--ai-spacing-md) var(--ai-spacing-xl);">
      <div class="dash-statusbar">
        <span class="badge badge-info" id="dashStage">Planning</span>
        <span class="badge badge-neutral" id="dashProvider">Provider: --</span>
        <span class="badge badge-neutral" id="dashModel">Model: --</span>
        <div style="flex:1;"></div>
        <button class="btn btn-sm" id="pauseBtn" onclick="togglePause()">
          <svg width="12" height="12" viewBox="0 0 20 20" fill="currentColor"><rect x="4" y="3" width="4" height="14"/><rect x="12" y="3" width="4" height="14"/></svg>
          Pause
        </button>
        <button class="btn btn-sm" onclick="resumeExecution()">
          <svg width="12" height="12" viewBox="0 0 20 20" fill="currentColor"><polygon points="4,2 18,10 4,18"/></svg>
          Resume
        </button>
        <button class="btn btn-danger btn-sm" onclick="stopExecution()">Stop</button>
      </div>
    </div>

    <!-- Progress -->
    <div class="card">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:var(--ai-spacing-sm);">
        <span style="font-size:var(--ai-font-sm);font-weight:var(--ai-fw-semibold);" id="dashMilestoneName">No active milestone</span>
        <span style="font-size:var(--ai-font-xs);color:var(--vscode-descriptionForeground,#8888a0);" id="dashStepName">--</span>
      </div>
      <div class="progress"><div class="progress-bar" id="dashProgressBar" style="width:0%"></div></div>
      <div class="progress-label">
        <span id="dashProgressPct">0%</span>
        <span id="dashElapsed">0s elapsed</span>
      </div>
    </div>

    <!-- Live Stats -->
    <div class="card">
      <div style="font-size:var(--ai-font-sm);font-weight:var(--ai-fw-semibold);margin-bottom:var(--ai-spacing-md);">Tokens &amp; Cost</div>
      <div class="live-stats">
        <div class="live-stat">
          <div class="live-stat-label">Tokens Used</div>
          <div class="live-stat-value" id="dashTokensUsed">0</div>
        </div>
        <div class="live-stat">
          <div class="live-stat-label">Tokens Estimated</div>
          <div class="live-stat-value" id="dashTokensEst">0</div>
        </div>
        <div class="live-stat">
          <div class="live-stat-label">Cost Incurred</div>
          <div class="live-stat-value" id="dashCostIncurred">$0.00</div>
        </div>
        <div class="live-stat">
          <div class="live-stat-label">Cost Estimated</div>
          <div class="live-stat-value" id="dashCostEstimated">$0.00</div>
        </div>
      </div>
    </div>

    <!-- Milestone Progress -->
    <div class="card">
      <div style="font-size:var(--ai-font-sm);font-weight:var(--ai-fw-semibold);margin-bottom:var(--ai-spacing-md);">Milestones</div>
      <div class="milestone-list" id="dashMilestones">
        <div style="color:var(--vscode-descriptionForeground,#8888a0);font-size:var(--ai-font-xs);">No milestones yet. Start execution to see progress.</div>
      </div>
    </div>

    <!-- Approval Section -->
    <div class="card" id="approvalSection" style="display:none;">
      <div class="approval-card">
        <div class="approval-title" id="approvalTitle">Approval Needed</div>
        <div class="approval-details">
          <div>Milestone: <strong id="approvalMilestone">--</strong></div>
          <div>Reasoning: <span id="approvalReasoning">--</span></div>
          <div>Tokens spent: <span id="approvalTokens">0</span></div>
          <div>Changed files:</div>
          <div class="approval-files" id="approvalFiles"></div>
        </div>
        <div class="approval-actions">
          <button class="btn btn-success btn-sm" onclick="approveMilestone()">Approve</button>
          <button class="btn btn-danger btn-sm" onclick="rejectMilestone()">Reject</button>
          <button class="btn btn-warning btn-sm" onclick="retryMilestone()">Retry</button>
          <button class="btn btn-sm" onclick="editInstruction()">Edit Instruction</button>
        </div>
      </div>
    </div>

    <!-- Recovery Banner -->
    <div id="recoveryBanner" style="display:none;">
      <div class="recovery-banner">
        <div class="recovery-icon">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M10 2l8 16H2z"/><path d="M10 7v4M10 14h0"/></svg>
        </div>
        <div class="recovery-body">
          <div class="recovery-title">Crash recovery detected</div>
          <div class="recovery-desc" id="recoveryDesc">Last checkpoint: --</div>
          <div class="recovery-actions">
            <button class="btn btn-success btn-sm" onclick="restoreCheckpoint()">Restore</button>
            <button class="btn btn-danger btn-sm" onclick="discardCheckpoint()">Discard</button>
            <button class="btn btn-sm" onclick="inspectCheckpoint()">Inspect</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Logs -->
    <div class="card">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:var(--ai-spacing-sm);">
        <span style="font-size:var(--ai-font-sm);font-weight:var(--ai-fw-semibold);">Logs</span>
        <button class="btn btn-sm" onclick="clearLogs()">Clear</button>
      </div>
      <div class="logs" id="dashLogs"></div>
    </div>

    <!-- Modified Files -->
    <div class="card">
      <div style="font-size:var(--ai-font-sm);font-weight:var(--ai-fw-semibold);margin-bottom:var(--ai-spacing-md);">Modified Files</div>
      <div class="modified-file-list" id="dashModifiedFiles">
        <div style="color:var(--vscode-descriptionForeground,#8888a0);font-size:var(--ai-font-xs);">No files modified yet.</div>
      </div>
    </div>

    <!-- Repository Map -->
    <div class="card" id="repoMapCard">
      <div class="card-title">
        <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M2 4h6l2 2h8v10H2z"/></svg>
        Repository Map
      </div>
      <div class="repo-map" id="repoMapContent">
        <div class="repo-map-header">
          <span class="badge badge-info" id="repoType">Scanning...</span>
          <div class="repo-map-langs" id="repoLangs"></div>
        </div>
        <div class="repo-map-frameworks" id="repoFrameworks"></div>
        <div class="repo-dep-list" id="repoDepList">
          <div class="skeleton skeleton-line" style="width:80%"></div>
          <div class="skeleton skeleton-line" style="width:60%"></div>
        </div>
      </div>
    </div>

    <!-- Context Usage Meter -->
    <div class="card" id="contextMeterCard">
      <div class="card-title">
        <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M5 3h10l-3 6 3 6H5l3-6-3-6z"/></svg>
        Context Usage
      </div>
      <div class="context-meter" id="contextMeterContent">
        <div class="progress" style="height:8px;"><div class="progress-bar" id="contextProgressBar" style="width:0%"></div></div>
        <div class="context-meter-stats">
          <div class="context-meter-stat"><span class="stat-value" id="ctxUsed">0</span><span class="stat-label">Used</span></div>
          <div class="context-meter-stat"><span class="stat-value" id="ctxMax">128K</span><span class="stat-label">Max</span></div>
          <div class="context-meter-stat"><span class="stat-value" id="ctxAvail">128K</span><span class="stat-label">Available</span></div>
        </div>
      </div>
    </div>

    <!-- Repair Attempts Panel -->
    <div class="card" id="repairPanelCard">
      <div class="card-title">
        <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M1 4v5h5"/><path d="M3.5 13A7 7 0 1017 10"/></svg>
        Repair Attempts
      </div>
      <div class="repair-panel" id="repairPanelContent">
        <div class="repair-budget">Budget: <span id="repairBudgetText">0 / 3 used</span></div>
        <div id="repairAttemptsList">
          <div style="font-size:var(--ai-font-xs);color:var(--vscode-descriptionForeground,#8888a0);">No repair attempts yet</div>
        </div>
      </div>
    </div>

    <!-- Git Activity Panel -->
    <div class="card" id="gitPanelCard">
      <div class="card-title">
        <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="7" cy="3" r="2"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="10" r="2"/><path d="M7 5v10M7 10h10"/></svg>
        Git Activity
      </div>
      <div class="git-panel" id="gitPanelContent">
        <div class="git-branch">
          <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="7" cy="3" r="2"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="10" r="2"/><path d="M7 5v10M7 10h10"/></svg>
          <span id="gitBranch">--</span>
        </div>
        <div class="git-stats" id="gitStats">
          <div class="git-stat"><span class="badge badge-success" id="gitStaged">0 staged</span></div>
          <div class="git-stat"><span class="badge badge-warning" id="gitModified">0 modified</span></div>
          <div class="git-stat"><span class="badge badge-neutral" id="gitUntracked">0 untracked</span></div>
        </div>
        <div class="git-commits" id="gitCommitsList">
          <div style="font-size:var(--ai-font-xs);color:var(--vscode-descriptionForeground,#8888a0);">No commits yet</div>
        </div>
      </div>
    </div>

    <!-- Decision Logs -->
    <div class="card" id="decisionLogsCard">
      <div class="card-title">
        <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4 3h12v14H4z"/><path d="M7 7h6M7 10h6M7 13h4"/></svg>
        Autonomous Decisions
      </div>
      <div class="decision-logs" id="decisionLogsContent">
        <div style="font-size:var(--ai-font-xs);color:var(--vscode-descriptionForeground,#8888a0);">No autonomous decisions yet</div>
      </div>
    </div>

    <!-- Phase 29: Budget Governor Card -->
    <div class="card" id="budgetGovernorCard">
      <div class="card-title">
        <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M10 1v2m0 14v2m-9-9h2m14 0h2"/><circle cx="10" cy="10" r="7"/></svg>
        Budget Governor
      </div>
      <div class="live-stats">
        <div class="live-stat">
          <div class="live-stat-label">Token Budget</div>
          <div class="live-stat-value" id="budgetTokenUsed">0</div>
          <div class="progress" style="height:3px;margin-top:4px;"><div class="progress-bar" id="budgetTokenBar" style="width:0%"></div></div>
        </div>
        <div class="live-stat">
          <div class="live-stat-label">Cost Budget</div>
          <div class="live-stat-value" id="budgetCostUsed">$0.00</div>
          <div class="progress" style="height:3px;margin-top:4px;"><div class="progress-bar" id="budgetCostBar" style="width:0%"></div></div>
        </div>
        <div class="live-stat">
          <div class="live-stat-label">Burn Rate</div>
          <div class="live-stat-value" id="budgetBurnRate">0 tok/s</div>
        </div>
        <div class="live-stat">
          <div class="live-stat-label">Status</div>
          <div class="live-stat-value" id="budgetStatus"><span class="badge badge-success">Healthy</span></div>
        </div>
      </div>
      <div style="display:flex;gap:var(--ai-spacing-sm);margin-top:var(--ai-spacing-md);">
        <button class="btn btn-danger btn-sm" onclick="emergencyStopBudget()">Emergency Stop</button>
        <button class="btn btn-sm" onclick="openBudgetSettings()">Budget Settings</button>
      </div>
    </div>

    <!-- Phase 29: Execution Locks Card -->
    <div class="card" id="executionLocksCard">
      <div class="card-title">
        <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="9" width="14" height="10" rx="2"/><path d="M6 9V6a4 4 0 018 0v3"/></svg>
        Active Locks
      </div>
      <div id="activeLocksList">
        <div style="font-size:var(--ai-font-xs);color:var(--vscode-descriptionForeground,#8888a0);">No active locks</div>
      </div>
      <div style="display:flex;gap:var(--ai-spacing-md);margin-top:var(--ai-spacing-sm);font-size:var(--ai-font-xs);color:var(--vscode-descriptionForeground,#8888a0);">
        <span>File locks: <strong id="lockFileCount">0</strong></span>
        <span>Project locks: <strong id="lockProjectCount">0</strong></span>
        <span>Deadlocks resolved: <strong id="lockDeadlockCount">0</strong></span>
      </div>
    </div>

    <!-- Phase 29: Execution Sanity Card -->
    <div class="card" id="executionSanityCard">
      <div class="card-title">
        <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M10 2l8 16H2z"/><path d="M10 7v4M10 14h0"/></svg>
        Execution Sanity
      </div>
      <div id="sanityResultsList">
        <div style="font-size:var(--ai-font-xs);color:var(--vscode-descriptionForeground,#8888a0);">No sanity checks run yet</div>
      </div>
      <div style="display:flex;gap:var(--ai-spacing-md);margin-top:var(--ai-spacing-sm);font-size:var(--ai-font-xs);color:var(--vscode-descriptionForeground,#8888a0);">
        <span>Hallucinations caught: <strong id="sanityHallucinationCount">0</strong></span>
        <span>Prevention rate: <strong id="sanityPreventionRate">--</strong></span>
      </div>
    </div>

    <!-- Phase 29: Terminal Sessions Card -->
    <div class="card" id="terminalSessionsCard">
      <div class="card-title">
        <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="3" width="16" height="14" rx="2"/><path d="M6 8l3 2-3 2"/></svg>
        Terminal Sessions
      </div>
      <div id="activeSessionsList">
        <div style="font-size:var(--ai-font-xs);color:var(--vscode-descriptionForeground,#8888a0);">No active sessions</div>
      </div>
      <div style="display:flex;gap:var(--ai-spacing-md);margin-top:var(--ai-spacing-sm);font-size:var(--ai-font-xs);color:var(--vscode-descriptionForeground,#8888a0);">
        <span>Active: <strong id="sessionActiveCount">0</strong></span>
        <span>Stuck: <strong id="sessionStuckCount">0</strong></span>
        <span>Health: <strong id="sessionHealthRate">--</strong></span>
      </div>
    </div>

    <!-- Phase 29: Command Safety Card -->
    <div class="card" id="commandSafetyCard">
      <div class="card-title">
        <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M10 1l2 5 5 2-5 2-2 5-2-5-5-2 5-2 2-5z"/></svg>
        Command Safety
      </div>
      <div style="display:flex;gap:var(--ai-spacing-md);font-size:var(--ai-font-xs);">
        <span class="badge badge-success">Blocked: <strong id="cmdBlockedCount">0</strong></span>
        <span class="badge badge-info">Allowed: <strong id="cmdAllowedCount">0</strong></span>
      </div>
      <div id="commandSafetyLog" style="margin-top:var(--ai-spacing-sm);font-size:var(--ai-font-xs);color:var(--vscode-descriptionForeground,#8888a0);">
        No commands analyzed yet
      </div>
    </div>

    <!-- Phase 29: Transaction Status Card -->
    <div class="card" id="transactionStatusCard">
      <div class="card-title">
        <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="5" width="16" height="10" rx="2"/><path d="M6 10h8"/></svg>
        Transaction Status
      </div>
      <div id="activeTransactionsList">
        <div style="font-size:var(--ai-font-xs);color:var(--vscode-descriptionForeground,#8888a0);">No active transactions</div>
      </div>
      <div style="display:flex;gap:var(--ai-spacing-md);margin-top:var(--ai-spacing-sm);font-size:var(--ai-font-xs);color:var(--vscode-descriptionForeground,#8888a0);">
        <span>Committed: <strong id="txnCommittedCount">0</strong></span>
        <span>Rolled back: <strong id="txnRolledBackCount">0</strong></span>
        <span>Active: <strong id="txnActiveCount">0</strong></span>
      </div>
    </div>
  </div>

  <!-- Panel 8: Memory & Summary -->
  <div class="panel" id="panel-8">
    <div class="card">
      <div class="card-title">
        <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4 3h12v14H4z"/><path d="M7 7h6M7 10h6M7 13h3"/></svg>
        Execution Summary
      </div>
      <div class="summary-grid" id="summaryGrid">
        <div class="summary-item"><div class="summary-value" id="sumMilestones">0</div><div class="summary-label">Milestones</div></div>
        <div class="summary-item"><div class="summary-value" id="sumSteps">0</div><div class="summary-label">Steps</div></div>
        <div class="summary-item"><div class="summary-value" id="sumTokens">0</div><div class="summary-label">Tokens</div></div>
        <div class="summary-item"><div class="summary-value" id="sumCost">$0.00</div><div class="summary-label">Cost</div></div>
        <div class="summary-item"><div class="summary-value" id="sumDuration">0s</div><div class="summary-label">Duration</div></div>
      </div>
    </div>
    <div class="card">
      <div class="card-title">Memory Persistence</div>
      <div class="memory-row">
        <div><div class="memory-label">Project State</div><div class="memory-desc">Saved to workspace memory</div></div>
        <span class="badge badge-success">Persisted</span>
      </div>
      <div class="memory-row">
        <div><div class="memory-label">Plan State</div><div class="memory-desc">Full plan with execution results</div></div>
        <span class="badge badge-success">Persisted</span>
      </div>
      <div class="memory-row" style="border-bottom:none;">
        <div><div class="memory-label">Execution History</div><div class="memory-desc">All logs and outputs preserved</div></div>
        <span class="badge badge-success">Persisted</span>
      </div>
    </div>
    <div class="card">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:var(--ai-spacing-md);">
        <div class="card-title" style="margin-bottom:0;">Memory Entries</div>
        <select class="input" style="width:auto;padding:2px var(--ai-spacing-sm);font-size:var(--ai-font-xs);" id="memoryFilter" onchange="filterMemory()">
          <option value="all">All</option>
          <option value="state">State</option>
          <option value="plan">Plan</option>
          <option value="history">History</option>
        </select>
      </div>
      <div class="memory-entries" id="memoryEntries">
        <div style="color:var(--vscode-descriptionForeground,#8888a0);font-size:var(--ai-font-xs);">No memory entries yet.</div>
      </div>
    </div>
    <div class="card">
      <div class="card-title">Checkpoint History</div>
      <div id="checkpointHistory" style="color:var(--vscode-descriptionForeground,#8888a0);font-size:var(--ai-font-xs);">No checkpoints recorded.</div>
    </div>

    <!-- Memory Compression -->
    <div class="card" id="compressionCard">
      <div class="card-title">
        <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3 6h14v10H3z"/><path d="M5 8v6h10V8z"/></svg>
        Memory Compression
      </div>
      <div class="compression-viz" id="compressionContent">
        <div class="compression-stats">
          <div class="compression-stat"><div class="stat-value" id="compRatio">--</div><div class="stat-label">Compression Ratio</div></div>
          <div class="compression-stat"><div class="stat-value" id="compEntries">0</div><div class="stat-label">Entries Compressed</div></div>
          <div class="compression-stat"><div class="stat-value" id="compTokensSaved">0</div><div class="stat-label">Tokens Saved</div></div>
        </div>
        <div class="progress" style="height:6px;"><div class="progress-bar" id="compProgressBar" style="width:0%;background:var(--vscode-testing-iconPassed,#4ade80);"></div></div>
        <div class="progress-label"><span>Memory utilization</span><span id="compPercent">0%</span></div>
      </div>
    </div>

    <div style="display:flex;gap:var(--ai-spacing-sm);justify-content:flex-end;">
      <button class="btn" onclick="goToStep(0)">New Project</button>
      <button class="btn-primary btn" onclick="exportResults()">Export</button>
    </div>
  </div>

</div>
</div>

<!-- ===== Settings Modal ===== -->
<div class="modal-overlay" id="settingsModal">
  <div class="modal" role="dialog" aria-label="Settings">
    <div class="modal-title">Settings</div>
    <div class="setting-row">
      <div><div class="setting-label">Theme</div><div class="setting-desc">Choose the UI theme</div></div>
      <select class="input" style="width:auto;" id="settingsTheme" onchange="previewTheme(this.value)">
        <option value="dark">Dark</option>
        <option value="deepblue">Deep Blue</option>
        <option value="light">Light</option>
        <option value="highcontrast">High Contrast</option>
      </select>
    </div>
    <div class="setting-row">
      <div><div class="setting-label">Provider</div><div class="setting-desc">AI provider for generation</div></div>
      <div class="provider-health">
        <select class="input" style="width:auto;" id="settingsProvider">
          <option value="openai">OpenAI</option>
          <option value="anthropic">Anthropic</option>
          <option value="google">Google</option>
        </select>
        <span class="health-dot ok" id="providerHealthDot"></span>
      </div>
    </div>
    <div class="setting-row">
      <div><div class="setting-label">OpenAI API Key</div></div>
      <input type="password" class="input" style="width:200px;" id="settingsKeyOpenai" placeholder="sk-..." />
    </div>
    <div class="setting-row">
      <div><div class="setting-label">Anthropic API Key</div></div>
      <input type="password" class="input" style="width:200px;" id="settingsKeyAnthropic" placeholder="sk-ant-..." />
    </div>
    <div class="setting-row">
      <div><div class="setting-label">Google API Key</div></div>
      <input type="password" class="input" style="width:200px;" id="settingsKeyGoogle" placeholder="AI..." />
    </div>
    <div class="setting-row">
      <div><div class="setting-label">Auto-save</div><div class="setting-desc">Automatically save project state</div></div>
      <label class="toggle"><input type="checkbox" id="settingsAutosave" checked /><span class="toggle-track"></span><span class="toggle-knob"></span></label>
    </div>
    <div class="setting-row">
      <div><div class="setting-label">Memory Token Budget</div><div class="setting-desc">Max tokens for context memory</div></div>
      <input type="number" class="input" style="width:100px;" id="settingsMemBudget" value="8000" min="1000" max="200000" />
    </div>
    <div class="setting-row">
      <div><div class="setting-label">Execution Retries</div><div class="setting-desc">Retry count on step failure</div></div>
      <input type="number" class="input" style="width:80px;" id="settingsRetries" value="3" min="0" max="10" />
    </div>
    <div class="modal-actions">
      <button class="btn" onclick="closeSettings()">Cancel</button>
      <button class="btn-primary btn" onclick="saveSettings()">Save</button>
    </div>
  </div>
</div>

<script>
/* ===== State ===== */
const vscode = acquireVsCodeApi();
const state = {
  currentStep: 0,
  projectData: null,
  idea: '',
  refinedIdea: '',
  constraints: {},
  executionPlan: null,
  tokenEstimate: null,
  executionMode: 'milestone',
  execution: {
    stage: 'idle', milestone: '', step: '', tokensUsed: 0, tokensEstimated: 0,
    costIncurred: 0, costEstimated: 0, progress: 0, logs: [], modifiedFiles: [],
    milestones: [], approvalNeeded: null, isPaused: false
  },
  recentProjects: [],
  memoryEntries: [],
  checkpoints: [],
  settings: { theme: 'dark', provider: 'auto', autosave: true, memBudget: 8000, retries: 3 },
  elapsedStart: 0,
  elapsedInterval: null,
  approvalMilestoneId: null
};

/* ===== SVG Icon Templates ===== */
const icons = {
  check: '<svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="#4ade80" stroke-width="2"><path d="M4 10l4 4 8-8"/></svg>',
  pulse: '<svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="#6c8cff" stroke-width="2" class="pulse"><circle cx="10" cy="10" r="4"/></svg>',
  dot: '<svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="#8888a0" stroke-width="2"><circle cx="10" cy="10" r="3"/></svg>',
  x: '<svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="#f87171" stroke-width="2"><path d="M6 6l8 8M14 6l-8 8"/></svg>',
  fileCreated: '<svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="#4ade80" stroke-width="1.5"><path d="M4 2h8l4 4v12H4z"/><path d="M12 2v4h4"/></svg>',
  fileModified: '<svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="#60a5fa" stroke-width="1.5"><path d="M4 2h8l4 4v12H4z"/><path d="M12 2v4h4M8 10h4M8 13h4"/></svg>',
  fileDeleted: '<svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="#f87171" stroke-width="1.5"><path d="M4 2h8l4 4v12H4z"/><path d="M12 2v4h4M7 10l6 6M13 10l-6 6"/></svg>'
};

/* ===== Step Navigation ===== */
function goToStep(step) {
  state.currentStep = step;
  document.querySelectorAll('.panel').forEach(function(p) { p.classList.remove('active'); });
  document.querySelectorAll('.step').forEach(function(s, i) {
    s.classList.remove('active', 'completed');
    if (i < step) s.classList.add('completed');
    if (i === step) s.classList.add('active');
  });
  var panel = document.getElementById('panel-' + step);
  if (panel) panel.classList.add('active');
  vscode.postMessage({ type: 'stepChange', step: step });
}

/* ===== Panel 0: Project Creation ===== */
function createProject() {
  var name = document.getElementById('projectName').value.trim();
  var desc = document.getElementById('projectDesc').value.trim();
  var path = document.getElementById('projectPath').value.trim();
  if (!name) { document.getElementById('projectName').focus(); return; }
  state.projectData = { name: name, description: desc, path: path, createdAt: Date.now() };
  vscode.postMessage({ type: 'createProject', data: state.projectData });
  goToStep(1);
}

function renderRecentProjects() {
  var card = document.getElementById('recentProjectsCard');
  var list = document.getElementById('recentProjectsList');
  if (!state.recentProjects.length) { card.style.display = 'none'; return; }
  card.style.display = 'block';
  list.innerHTML = '';
  state.recentProjects.forEach(function(p) {
    var div = document.createElement('div');
    div.style.cssText = 'padding:8px 0;border-bottom:1px solid var(--ai-glass-border);cursor:pointer;';
    div.innerHTML = '<div style="font-size:13px;font-weight:500;">' + escHtml(p.name) + '</div><div style="font-size:11px;color:var(--vscode-descriptionForeground,#8888a0);">' + escHtml(p.path || 'No path') + '</div>';
    div.onclick = function() {
      document.getElementById('projectName').value = p.name || '';
      document.getElementById('projectDesc').value = p.description || '';
      document.getElementById('projectPath').value = p.path || '';
    };
    list.appendChild(div);
  });
}

/* ===== Panel 1: Idea Input ===== */
document.getElementById('ideaInput').addEventListener('input', function() {
  document.getElementById('ideaCharCount').textContent = this.value.length + ' characters';
});

function submitIdea() {
  var idea = document.getElementById('ideaInput').value.trim();
  if (!idea) { document.getElementById('ideaInput').focus(); return; }
  state.idea = idea;
  vscode.postMessage({ type: 'submitIdea', idea: idea });
  goToStep(2);
  requestRefinement(idea);
}

/* ===== Panel 2: Refinement ===== */
function requestRefinement(idea) {
  document.getElementById('refineUserMsg').style.display = 'flex';
  document.getElementById('refineUserContent').textContent = idea;
  document.getElementById('refineAssistantMsg').style.display = 'flex';
  document.getElementById('refineAssistantContent').textContent = 'Refining your idea...';
  document.getElementById('refineSkeleton').style.display = 'block';
  vscode.postMessage({ type: 'refineIdea', idea: idea });
}

function regenerateRefinement() {
  if (!state.idea) return;
  requestRefinement(state.idea);
}

function acceptRefinement() {
  goToStep(3);
}

/* ===== Panel 3: Constraints ===== */
function submitConstraints() {
  state.constraints = {
    budget: document.getElementById('constraintBudget').value,
    model: document.getElementById('constraintModel').value,
    autonomousLevel: document.querySelector('input[name="autonomousLevel"]:checked').value,
    languages: document.getElementById('constraintLanguages').value,
    deploy: document.getElementById('constraintDeploy').value,
    timeframe: document.getElementById('constraintTime').value
  };
  vscode.postMessage({ type: 'setConstraints', constraints: state.constraints });
  vscode.postMessage({ type: 'generatePlan', idea: state.idea, constraints: state.constraints });
  goToStep(4);
  showPlanSkeleton();
}

/* ===== Panel 4: Execution Plan ===== */
function showPlanSkeleton() {
  var tree = document.getElementById('planTree');
  tree.innerHTML = '<div class="skeleton skeleton-line"></div><div class="skeleton skeleton-line" style="width:75%"></div><div class="skeleton skeleton-line" style="width:85%"></div><div class="skeleton skeleton-line" style="width:60%"></div>';
}

function renderPlan(plan) {
  state.executionPlan = plan;
  var tree = document.getElementById('planTree');
  tree.innerHTML = '';
  if (!plan || !plan.milestones) {
    tree.innerHTML = '<div style="color:var(--vscode-descriptionForeground,#8888a0);font-size:var(--ai-font-sm);">No plan generated yet.</div>';
    return;
  }
  plan.milestones.forEach(function(ms, i) {
    var div = document.createElement('div');
    div.className = 'plan-milestone';
    div.innerHTML = '<div class="plan-milestone-header" onclick="toggleMilestone(this)">' +
      '<span class="plan-milestone-chevron"><svg width="12" height="12" viewBox="0 0 20 20" fill="currentColor"><path d="M6 4l8 6-8 6z"/></svg></span>' +
      '<span class="plan-milestone-name">' + escHtml(ms.name) + '</span>' +
      '<span class="plan-milestone-meta"><span>' + (ms.steps ? ms.steps.length : 0) + ' steps</span><span>~' + (ms.estimatedTokens || '--') + ' tokens</span></span>' +
      '</div>' +
      '<div class="plan-milestone-body">' + renderPlanSteps(ms.steps || [], i) + '</div>';
    tree.appendChild(div);
  });
}

function renderPlanSteps(steps, milestoneIdx) {
  return steps.map(function(s, i) {
    return '<div class="plan-step-row"><span class="plan-step-num">' + (i + 1) + '</span><span>' + escHtml(s.name || s) + '</span></div>';
  }).join('');
}

function toggleMilestone(header) {
  var ms = header.parentElement;
  ms.classList.toggle('expanded');
}

function editPlan() {
  var editor = document.getElementById('planEditor');
  var btn = document.getElementById('editPlanBtn');
  if (editor.style.display === 'none') {
    editor.style.display = 'block';
    document.getElementById('planEditorText').value = state.executionPlan ? JSON.stringify(state.executionPlan, null, 2) : '';
    btn.textContent = 'Cancel Edit';
  } else {
    editor.style.display = 'none';
    btn.textContent = 'Edit Plan';
  }
}

function cancelEditPlan() {
  document.getElementById('planEditor').style.display = 'none';
  document.getElementById('editPlanBtn').textContent = 'Edit Plan';
}

function saveEditedPlan() {
  try {
    var parsed = JSON.parse(document.getElementById('planEditorText').value);
    renderPlan(parsed);
    document.getElementById('planEditor').style.display = 'none';
    document.getElementById('editPlanBtn').textContent = 'Edit Plan';
  } catch (e) {
    /* keep editor open on parse error */
  }
}

function regeneratePlan() {
  vscode.postMessage({ type: 'generatePlan', idea: state.idea, constraints: state.constraints });
  showPlanSkeleton();
}

/* ===== Panel 5: Token Estimation ===== */
function renderTokenEstimate(est) {
  state.tokenEstimate = est;
  var scenarios = ['Opt', 'Exp', 'Wc'];
  var labels = { Opt: 'Optimistic', Exp: 'Expected', Wc: 'Worst-case' };
  scenarios.forEach(function(key) {
    var d = est[labels[key]] || est[key] || {};
    document.getElementById('token' + key + 'Total').textContent = fmtNum(d.totalTokens || d.total || 0);
    document.getElementById('token' + key + 'In').textContent = fmtNum(d.inputTokens || d.input || 0);
    document.getElementById('token' + key + 'Out').textContent = fmtNum(d.outputTokens || d.output || 0);
    document.getElementById('token' + key + 'Cost').textContent = '$' + (d.cost || 0).toFixed(4);
    document.getElementById('token' + key + 'Dur').textContent = d.duration || '--';
  });
  document.getElementById('estProvider').textContent = 'Provider: ' + (est.provider || 'Auto');
  document.getElementById('estModel').textContent = 'Model: ' + (est.model || 'Auto');
  var warn = document.getElementById('contextLimitWarning');
  if (est.nearLimit) { warn.style.display = 'flex'; document.getElementById('contextLimitText').textContent = est.limitMessage || 'Approaching context limit for selected model.'; }
  else { warn.style.display = 'none'; }
}

/* ===== Panel 6: Execution Mode ===== */
function selectExecMode(el) {
  document.querySelectorAll('.exec-mode').forEach(function(m) { m.classList.remove('selected'); });
  el.classList.add('selected');
  state.executionMode = el.dataset.mode;
}

/* ===== Panel 7: Execution Dashboard ===== */
function startExecution() {
  vscode.postMessage({ type: 'startExecution', mode: state.executionMode, plan: state.executionPlan });
  goToStep(7);
  state.execution.stage = 'Planning';
  state.execution.isPaused = false;
  state.elapsedStart = Date.now();
  startElapsedTimer();
}

function togglePause() {
  if (state.execution.isPaused) { resumeExecution(); }
  else { pauseExecution(); }
}

function pauseExecution() {
  state.execution.isPaused = true;
  vscode.postMessage({ type: 'pauseExecution' });
  updateStageDisplay('Paused');
  document.getElementById('pauseBtn').innerHTML = '<svg width="12" height="12" viewBox="0 0 20 20" fill="currentColor"><polygon points="4,2 18,10 4,18"/></svg> Resume';
}

function resumeExecution() {
  state.execution.isPaused = false;
  vscode.postMessage({ type: 'resumeExecution' });
  updateStageDisplay(state.execution.stage || 'Executing');
  document.getElementById('pauseBtn').innerHTML = '<svg width="12" height="12" viewBox="0 0 20 20" fill="currentColor"><rect x="4" y="3" width="4" height="14"/><rect x="12" y="3" width="4" height="14"/></svg> Pause';
}

function stopExecution() {
  vscode.postMessage({ type: 'stopExecution' });
  clearInterval(state.elapsedInterval);
  updateStageDisplay('Stopped');
}

function startElapsedTimer() {
  clearInterval(state.elapsedInterval);
  state.elapsedInterval = setInterval(function() {
    if (state.execution.isPaused) return;
    var elapsed = Math.round((Date.now() - state.elapsedStart) / 1000);
    document.getElementById('dashElapsed').textContent = fmtDuration(elapsed);
  }, 1000);
}

function updateStageDisplay(stage) {
  var badge = document.getElementById('dashStage');
  badge.textContent = stage;
  badge.className = 'badge';
  var stageMap = { Planning: 'badge-info', Executing: 'badge-info', Verifying: 'badge-info', Fixing: 'badge-warning', Committing: 'badge-info', Paused: 'badge-warning', Completed: 'badge-success', Failed: 'badge-error', Stopped: 'badge-neutral' };
  badge.classList.add(stageMap[stage] || 'badge-info');
}

function handleExecutionUpdate(msg) {
  var e = state.execution;
  if (msg.stage) { e.stage = msg.stage; updateStageDisplay(msg.stage); }
  if (msg.milestone) { e.milestone = msg.milestone; document.getElementById('dashMilestoneName').textContent = msg.milestone; }
  if (msg.step) { e.step = msg.step; document.getElementById('dashStepName').textContent = msg.step; }
  if (typeof msg.tokensUsed === 'number') { e.tokensUsed = msg.tokensUsed; document.getElementById('dashTokensUsed').textContent = fmtNum(msg.tokensUsed); }
  if (typeof msg.tokensEstimated === 'number') { e.tokensEstimated = msg.tokensEstimated; document.getElementById('dashTokensEst').textContent = fmtNum(msg.tokensEstimated); }
  if (typeof msg.costIncurred === 'number') { e.costIncurred = msg.costIncurred; document.getElementById('dashCostIncurred').textContent = '$' + msg.costIncurred.toFixed(4); }
  if (typeof msg.costEstimated === 'number') { e.costEstimated = msg.costEstimated; document.getElementById('dashCostEstimated').textContent = '$' + msg.costEstimated.toFixed(4); }
  if (typeof msg.progress === 'number') { e.progress = msg.progress; document.getElementById('dashProgressBar').style.width = msg.progress + '%'; document.getElementById('dashProgressPct').textContent = Math.round(msg.progress) + '%'; }
  if (msg.logs) { e.logs = msg.logs; renderLogs(msg.logs); }
  if (msg.modifiedFiles) { e.modifiedFiles = msg.modifiedFiles; renderModifiedFiles(msg.modifiedFiles); }
  if (msg.milestones) { e.milestones = msg.milestones; renderDashboardMilestones(msg.milestones); }
}

function handleApprovalNeeded(msg) {
  state.approvalMilestoneId = msg.milestoneId;
  document.getElementById('approvalSection').style.display = 'block';
  document.getElementById('approvalTitle').textContent = 'Approval Needed: ' + (msg.milestoneName || 'Milestone');
  document.getElementById('approvalMilestone').textContent = msg.milestoneName || '--';
  document.getElementById('approvalReasoning').textContent = msg.reasoning || '--';
  document.getElementById('approvalTokens').textContent = fmtNum(msg.tokensSpent || 0);
  var filesDiv = document.getElementById('approvalFiles');
  filesDiv.innerHTML = '';
  (msg.changedFiles || []).forEach(function(f) {
    var cls = f.status === 'created' ? 'file-badge-created' : f.status === 'deleted' ? 'file-badge-deleted' : 'file-badge-modified';
    filesDiv.innerHTML += '<span class="file-badge ' + cls + '">' + escHtml(f.path || f) + '</span>';
  });
}

function approveMilestone() {
  vscode.postMessage({ type: 'approveMilestone', milestoneId: state.approvalMilestoneId });
  document.getElementById('approvalSection').style.display = 'none';
}

function rejectMilestone() {
  vscode.postMessage({ type: 'rejectMilestone', milestoneId: state.approvalMilestoneId, reason: 'User rejected' });
  document.getElementById('approvalSection').style.display = 'none';
}

function retryMilestone() {
  vscode.postMessage({ type: 'retryMilestone', milestoneId: state.approvalMilestoneId });
  document.getElementById('approvalSection').style.display = 'none';
}

function editInstruction() {
  var instruction = prompt('Enter modified instruction for this milestone:');
  if (instruction) {
    vscode.postMessage({ type: 'rejectMilestone', milestoneId: state.approvalMilestoneId, reason: instruction });
    document.getElementById('approvalSection').style.display = 'none';
  }
}

function renderLogs(logs) {
  var container = document.getElementById('dashLogs');
  container.innerHTML = '';
  logs.forEach(function(l) {
    var type = l.type || 'info';
    var div = document.createElement('div');
    div.className = 'log-line log-' + type;
    div.textContent = (l.timestamp ? '[' + l.timestamp + '] ' : '') + (l.message || l);
    container.appendChild(div);
  });
  container.scrollTop = container.scrollHeight;
}

function clearLogs() {
  state.execution.logs = [];
  document.getElementById('dashLogs').innerHTML = '';
}

function renderModifiedFiles(files) {
  var container = document.getElementById('dashModifiedFiles');
  container.innerHTML = '';
  if (!files || !files.length) {
    container.innerHTML = '<div style="color:var(--vscode-descriptionForeground,#8888a0);font-size:var(--ai-font-xs);">No files modified yet.</div>';
    return;
  }
  files.forEach(function(f) {
    var icon = f.status === 'created' ? icons.fileCreated : f.status === 'deleted' ? icons.fileDeleted : icons.fileModified;
    var div = document.createElement('div');
    div.className = 'modified-file';
    div.innerHTML = icon + '<span>' + escHtml(f.path || f) + '</span>';
    container.appendChild(div);
  });
}

function renderDashboardMilestones(milestones) {
  var container = document.getElementById('dashMilestones');
  container.innerHTML = '';
  milestones.forEach(function(ms) {
    var icon = ms.status === 'completed' ? icons.check : ms.status === 'running' ? icons.pulse : ms.status === 'failed' ? icons.x : icons.dot;
    var div = document.createElement('div');
    div.className = 'milestone-item';
    div.innerHTML = '<span class="milestone-icon">' + icon + '</span><span class="milestone-name">' + escHtml(ms.name) + '</span><span class="milestone-steps">' + (ms.completedSteps || 0) + '/' + (ms.totalSteps || 0) + '</span>';
    container.appendChild(div);
  });
}

function handleCrashRecovery(msg) {
  document.getElementById('recoveryBanner').style.display = 'block';
  document.getElementById('recoveryDesc').textContent = 'Last checkpoint: ' + (msg.checkpoint || '--') + ' | Last step: ' + (msg.lastStep || '--');
  state.lastCheckpointId = msg.checkpoint;
}

function restoreCheckpoint() {
  vscode.postMessage({ type: 'restoreCheckpoint', checkpointId: state.lastCheckpointId });
  document.getElementById('recoveryBanner').style.display = 'none';
}

function discardCheckpoint() {
  document.getElementById('recoveryBanner').style.display = 'none';
}

function inspectCheckpoint() {
  vscode.postMessage({ type: 'restoreCheckpoint', checkpointId: state.lastCheckpointId, inspect: true });
}

function handleExecutionComplete(msg) {
  clearInterval(state.elapsedInterval);
  var summary = msg.summary || {};
  updateStageDisplay('Completed');
  document.getElementById('sumMilestones').textContent = summary.totalMilestones || 0;
  document.getElementById('sumSteps').textContent = summary.totalSteps || 0;
  document.getElementById('sumTokens').textContent = fmtNum(summary.totalTokens || 0);
  document.getElementById('sumCost').textContent = '$' + (summary.totalCost || 0).toFixed(4);
  document.getElementById('sumDuration').textContent = fmtDuration(summary.durationSeconds || 0);
  renderMemoryEntries(summary.memoryEntries || []);
  renderCheckpoints(summary.checkpoints || []);
  goToStep(8);
}

function handleExecutionFailed(msg) {
  updateStageDisplay('Failed');
  addDashboardLog('Execution failed: ' + (msg.error || 'Unknown error'), 'error');
}

function addDashboardLog(message, type) {
  state.execution.logs.push({ message: message, type: type || 'info', timestamp: new Date().toLocaleTimeString() });
  renderLogs(state.execution.logs);
}

/* ===== Panel 8: Memory & Summary ===== */
function renderMemoryEntries(entries) {
  state.memoryEntries = entries;
  filterMemory();
}

function filterMemory() {
  var filter = document.getElementById('memoryFilter').value;
  var container = document.getElementById('memoryEntries');
  var filtered = filter === 'all' ? state.memoryEntries : state.memoryEntries.filter(function(e) { return e.type === filter; });
  container.innerHTML = '';
  if (!filtered.length) {
    container.innerHTML = '<div style="color:var(--vscode-descriptionForeground,#8888a0);font-size:var(--ai-font-xs);">No memory entries.</div>';
    return;
  }
  filtered.forEach(function(e) {
    var typeCls = e.type === 'state' ? 'type-state' : e.type === 'plan' ? 'type-plan' : 'type-history';
    var div = document.createElement('div');
    div.className = 'memory-entry';
    div.innerHTML = '<span class="memory-entry-type ' + typeCls + '">' + escHtml(e.type) + '</span><span style="flex:1;">' + escHtml(e.label || e.key || '') + '</span>';
    container.appendChild(div);
  });
}

function renderCheckpoints(checkpoints) {
  state.checkpoints = checkpoints || [];
  var container = document.getElementById('checkpointHistory');
  if (!state.checkpoints.length) { container.innerHTML = 'No checkpoints recorded.'; return; }
  container.innerHTML = '';
  state.checkpoints.forEach(function(cp) {
    var div = document.createElement('div');
    div.style.cssText = 'padding:var(--ai-spacing-xs) 0;font-size:var(--ai-font-xs);color:var(--vscode-descriptionForeground,#8888a0);border-bottom:1px solid var(--ai-glass-border);';
    div.textContent = (cp.name || cp.id || 'Checkpoint') + ' - ' + (cp.timestamp || '');
    container.appendChild(div);
  });
}

function exportResults() {
  vscode.postMessage({ type: 'exportResults', project: state.projectData });
}

/* ===== Settings ===== */
function openSettings() {
  document.getElementById('settingsModal').classList.add('open');
  document.getElementById('settingsTheme').value = state.settings.theme;
  document.getElementById('settingsProvider').value = state.settings.provider;
  document.getElementById('settingsAutosave').checked = state.settings.autosave;
  document.getElementById('settingsMemBudget').value = state.settings.memBudget;
  document.getElementById('settingsRetries').value = state.settings.retries;
}

function closeSettings() {
  document.getElementById('settingsModal').classList.remove('open');
}

function saveSettings() {
  state.settings.theme = document.getElementById('settingsTheme').value;
  state.settings.provider = document.getElementById('settingsProvider').value;
  state.settings.autosave = document.getElementById('settingsAutosave').checked;
  state.settings.memBudget = parseInt(document.getElementById('settingsMemBudget').value) || 8000;
  state.settings.retries = parseInt(document.getElementById('settingsRetries').value) || 3;
  applyTheme(state.settings.theme);
  vscode.postMessage({ type: 'changeTheme', theme: state.settings.theme });
  if (state.settings.provider) { vscode.postMessage({ type: 'changeProvider', providerId: state.settings.provider }); }
  var providers = ['openai', 'anthropic', 'google'];
  providers.forEach(function(p) {
    var key = document.getElementById('settingsKey' + p.charAt(0).toUpperCase() + p.slice(1)).value.trim();
    if (key) { vscode.postMessage({ type: 'saveApiKey', providerId: p, key: key }); }
  });
  closeSettings();
}

// Phase 29: Budget Governor functions
function emergencyStopBudget() {
  vscode.postMessage({ type: 'emergencyStop', reason: 'User triggered emergency stop from UI' });
}

function openBudgetSettings() {
  vscode.postMessage({ type: 'openBudgetSettings' });
}

function previewTheme(theme) {
  applyTheme(theme);
}

function applyTheme(theme) {
  if (theme === 'dark') { document.documentElement.removeAttribute('data-theme'); }
  else { document.documentElement.setAttribute('data-theme', theme); }
}

function changeProvider(val) {
  state.settings.provider = val;
  vscode.postMessage({ type: 'changeProvider', providerId: val });
}

/* ===== Utilities ===== */
function escHtml(s) {
  var div = document.createElement('div');
  div.appendChild(document.createTextNode(s));
  return div.innerHTML;
}

function fmtNum(n) {
  if (typeof n !== 'number') return '--';
  return n.toLocaleString();
}

function fmtDuration(secs) {
  if (secs < 60) return secs + 's';
  if (secs < 3600) return Math.floor(secs / 60) + 'm ' + (secs % 60) + 's';
  var h = Math.floor(secs / 3600);
  var m = Math.floor((secs % 3600) / 60);
  return h + 'h ' + m + 'm';
}

function formatTokens(n) {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
  return String(n);
}

/* ===== Message Handler ===== */
window.addEventListener('message', function(event) {
  var msg = event.data;
  switch (msg.type) {
    case 'refinedIdea':
      document.getElementById('refineSkeleton').style.display = 'none';
      document.getElementById('refineAssistantMsg').style.display = 'flex';
      document.getElementById('refineAssistantContent').textContent = msg.content || msg.refinement || '';
      state.refinedIdea = msg.content || msg.refinement || '';
      break;
    case 'executionPlan':
      renderPlan(msg.plan || msg);
      break;
    case 'tokenEstimate':
      renderTokenEstimate(msg);
      break;
    case 'executionUpdate':
      handleExecutionUpdate(msg);
      break;
    case 'approvalNeeded':
      handleApprovalNeeded(msg);
      break;
    case 'executionComplete':
      handleExecutionComplete(msg);
      break;
    case 'executionFailed':
      handleExecutionFailed(msg);
      break;
    case 'crashRecovery':
      handleCrashRecovery(msg);
      break;
    case 'projectCreated':
      if (msg.project) {
        state.recentProjects.unshift(msg.project);
        if (state.recentProjects.length > 5) state.recentProjects.pop();
        renderRecentProjects();
      }
      break;
    case 'providerHealth':
      var dot = document.getElementById('providerHealthDot');
      if (dot) { dot.className = 'health-dot ' + (msg.status === 'ok' ? 'ok' : msg.status === 'warn' ? 'warn' : 'err'); }
      break;
    case 'repoScanResult': {
      var d = msg.data;
      var typeEl = document.getElementById('repoType');
      if (typeEl) typeEl.textContent = d.projectType || 'Unknown';
      var langsEl = document.getElementById('repoLangs');
      if (langsEl && d.languages) langsEl.innerHTML = d.languages.map(function(l) { return '<span class="badge badge-info">' + l + '</span>'; }).join('');
      var fwEl = document.getElementById('repoFrameworks');
      if (fwEl && d.frameworks) fwEl.innerHTML = d.frameworks.map(function(f) { return '<span class="badge badge-neutral">' + f + '</span>'; }).join('');
      var depEl = document.getElementById('repoDepList');
      if (depEl && d.topDependencies) depEl.innerHTML = d.topDependencies.map(function(dep, i) { return '<div class="repo-dep-item"><span class="dep-rank">' + (i+1) + '</span><span class="dep-path">' + dep.path + '</span><span class="dep-count">' + dep.importedBy + ' imports</span></div>'; }).join('');
      break;
    }
    case 'contextUsage': {
      var d = msg.data;
      var bar = document.getElementById('contextProgressBar');
      if (bar) bar.style.width = Math.min(100, d.utilizationPercent || 0) + '%';
      var usedEl = document.getElementById('ctxUsed');
      if (usedEl) usedEl.textContent = formatTokens(d.used || 0);
      var maxEl = document.getElementById('ctxMax');
      if (maxEl) maxEl.textContent = formatTokens(d.max || 128000);
      var availEl = document.getElementById('ctxAvail');
      if (availEl) availEl.textContent = formatTokens(d.available || 0);
      break;
    }
    case 'repairAttempt': {
      var d = msg.data;
      var list = document.getElementById('repairAttemptsList');
      var budget = document.getElementById('repairBudgetText');
      if (budget) budget.textContent = (d.attemptsUsed || 0) + ' / ' + (d.maxAttempts || 3) + ' used';
      if (list && d.attempts) list.innerHTML = d.attempts.map(function(a, i) { return '<div class="repair-attempt"><span class="attempt-num">#' + (i+1) + '</span><span class="attempt-type">' + (a.failureType || 'unknown') + '</span><span class="attempt-result ' + (a.result || 'failed') + '">' + (a.result || 'failed') + '</span></div>'; }).join('');
      break;
    }
    case 'gitStatus': {
      var d = msg.data;
      var branchEl = document.getElementById('gitBranch');
      if (branchEl) branchEl.textContent = d.branch || '--';
      var stagedEl = document.getElementById('gitStaged');
      if (stagedEl) stagedEl.textContent = (d.staged || 0) + ' staged';
      var modEl = document.getElementById('gitModified');
      if (modEl) modEl.textContent = (d.modified || 0) + ' modified';
      var unEl = document.getElementById('gitUntracked');
      if (unEl) unEl.textContent = (d.untracked || 0) + ' untracked';
      break;
    }
    case 'gitCommits': {
      var list = document.getElementById('gitCommitsList');
      if (list && msg.commits) list.innerHTML = msg.commits.map(function(c) { return '<div class="git-commit"><span class="git-commit-hash">' + (c.shortHash || c.hash?.substring(0,7)) + '</span><span class="git-commit-msg">' + (c.message || '') + '</span></div>'; }).join('');
      break;
    }
    case 'decisionLog': {
      var list = document.getElementById('decisionLogsContent');
      if (!list) break;
      var d = msg.data;
      var existing = list.querySelector('.no-decisions');
      if (existing) existing.remove();
      var entry = document.createElement('div');
      entry.className = 'decision-entry';
      entry.innerHTML = '<span class="decision-time">' + new Date(d.timestamp || Date.now()).toLocaleTimeString() + '</span><span class="decision-type ' + (d.type || 'execution') + '">' + (d.type || 'execution') + '</span><span class="decision-text">' + (d.text || '') + '</span>';
      list.prepend(entry);
      break;
    }
    case 'memoryCompression': {
      var d = msg.data;
      var ratioEl = document.getElementById('compRatio');
      if (ratioEl) ratioEl.textContent = (d.ratio || 0).toFixed(1) + 'x';
      var entriesEl = document.getElementById('compEntries');
      if (entriesEl) entriesEl.textContent = String(d.entriesCompressed || 0);
      var savedEl = document.getElementById('compTokensSaved');
      if (savedEl) savedEl.textContent = formatTokens(d.tokensSaved || 0);
      var bar = document.getElementById('compProgressBar');
      if (bar) bar.style.width = Math.min(100, d.utilizationPercent || 0) + '%';
      var pct = document.getElementById('compPercent');
      if (pct) pct.textContent = (d.utilizationPercent || 0).toFixed(0) + '%';
      break;
    }
    case 'restoreState':
      if (msg.state) {
        state.projectData = msg.state.project;
        state.idea = msg.state.idea || '';
        state.constraints = msg.state.constraints || {};
        if (msg.state.step !== undefined) { goToStep(msg.state.step); }
        if (state.projectData) {
          document.getElementById('projectName').value = state.projectData.name || '';
          document.getElementById('projectDesc').value = state.projectData.description || '';
          document.getElementById('projectPath').value = state.projectData.path || '';
        }
        if (state.idea) { document.getElementById('ideaInput').value = state.idea; }
        if (msg.state.recentProjects) { state.recentProjects = msg.state.recentProjects; renderRecentProjects(); }
        if (msg.state.settings) { Object.assign(state.settings, msg.state.settings); applyTheme(state.settings.theme); }
      }
      break;
    // Phase 29: Budget Governor update
    case 'budgetUpdate': {
      var d = msg.data;
      var tokEl = document.getElementById('budgetTokenUsed');
      if (tokEl) tokEl.textContent = formatTokens(d.tokensUsed || 0);
      var costEl = document.getElementById('budgetCostUsed');
      if (costEl) costEl.textContent = '$' + (d.costUsed || 0).toFixed(4);
      var tokBar = document.getElementById('budgetTokenBar');
      if (tokBar) tokBar.style.width = Math.min(100, (d.tokenFraction || 0) * 100) + '%';
      var costBar = document.getElementById('budgetCostBar');
      if (costBar) costBar.style.width = Math.min(100, (d.costFraction || 0) * 100) + '%';
      var burnEl = document.getElementById('budgetBurnRate');
      if (burnEl) burnEl.textContent = (d.tokenBurnRate || 0).toFixed(0) + ' tok/s';
      var statEl = document.getElementById('budgetStatus');
      if (statEl) {
        var cls = d.status === 'healthy' ? 'badge-success' : d.status === 'warning' ? 'badge-warning' : d.status === 'exceeded' ? 'badge-error' : 'badge-error';
        statEl.innerHTML = '<span class="badge ' + cls + '">' + (d.status || 'Healthy') + '</span>';
      }
      break;
    }
    // Phase 29: Execution locks update
    case 'lockUpdate': {
      var d = msg.data;
      var list = document.getElementById('activeLocksList');
      if (list && d.locks) {
        if (d.locks.length === 0) {
          list.innerHTML = '<div style="font-size:var(--ai-font-xs);color:var(--vscode-descriptionForeground,#8888a0);">No active locks</div>';
        } else {
          list.innerHTML = d.locks.map(function(l) { return '<div style="font-size:var(--ai-font-xs);display:flex;gap:var(--ai-spacing-sm);align-items:center;"><span class="badge badge-warning">' + l.scope + '</span><span style="font-family:monospace;">' + l.resource + '</span><span style="color:var(--vscode-descriptionForeground,#8888a0);">by ' + l.owner + '</span></div>'; }).join('');
        }
      }
      var fc = document.getElementById('lockFileCount');
      if (fc) fc.textContent = String((d.fileLockCount || 0));
      var pc = document.getElementById('lockProjectCount');
      if (pc) pc.textContent = String((d.projectLockCount || 0));
      var dc = document.getElementById('lockDeadlockCount');
      if (dc) dc.textContent = String((d.deadlocksResolved || 0));
      break;
    }
    // Phase 29: Execution sanity update
    case 'sanityUpdate': {
      var d = msg.data;
      var list = document.getElementById('sanityResultsList');
      if (list && d.results) {
        if (d.results.length === 0) {
          list.innerHTML = '<div style="font-size:var(--ai-font-xs);color:var(--vscode-descriptionForeground,#8888a0);">All checks passed</div>';
        } else {
          list.innerHTML = d.results.map(function(r) { var cls = r.severity === 'pass' ? 'badge-success' : r.severity === 'warning' ? 'badge-warning' : 'badge-error'; return '<div style="font-size:var(--ai-font-xs);display:flex;gap:var(--ai-spacing-sm);align-items:center;margin-bottom:2px;"><span class="badge ' + cls + '">' + r.severity + '</span><span>' + r.checkName + ': ' + r.message + '</span></div>'; }).join('');
        }
      }
      var hc = document.getElementById('sanityHallucinationCount');
      if (hc) hc.textContent = String(d.hallucinationCount || 0);
      var pr = document.getElementById('sanityPreventionRate');
      if (pr) pr.textContent = d.preventionRate !== undefined ? (d.preventionRate * 100).toFixed(0) + '%' : '--';
      break;
    }
    // Phase 29: Terminal sessions update
    case 'sessionUpdate': {
      var d = msg.data;
      var list = document.getElementById('activeSessionsList');
      if (list && d.sessions) {
        if (d.sessions.length === 0) {
          list.innerHTML = '<div style="font-size:var(--ai-font-xs);color:var(--vscode-descriptionForeground,#8888a0);">No active sessions</div>';
        } else {
          list.innerHTML = d.sessions.map(function(s) { var cls = s.state === 'running' ? 'badge-info' : s.state === 'stuck' ? 'badge-error' : s.state === 'completed' ? 'badge-success' : 'badge-neutral'; return '<div style="font-size:var(--ai-font-xs);display:flex;gap:var(--ai-spacing-sm);align-items:center;margin-bottom:2px;"><span class="badge ' + cls + '">' + s.state + '</span><span style="font-family:monospace;">' + s.command.substring(0, 40) + '</span><span style="color:var(--vscode-descriptionForeground,#8888a0);">' + (s.durationMs ? (s.durationMs / 1000).toFixed(1) + 's' : '') + '</span></div>'; }).join('');
        }
      }
      var ac = document.getElementById('sessionActiveCount');
      if (ac) ac.textContent = String(d.activeCount || 0);
      var sc = document.getElementById('sessionStuckCount');
      if (sc) sc.textContent = String(d.stuckCount || 0);
      var hr = document.getElementById('sessionHealthRate');
      if (hr) hr.textContent = d.healthRate !== undefined ? (d.healthRate * 100).toFixed(0) + '%' : '--';
      break;
    }
    // Phase 29: Command safety update
    case 'commandSafetyUpdate': {
      var d = msg.data;
      var bc = document.getElementById('cmdBlockedCount');
      if (bc) bc.textContent = String(d.blockedCount || 0);
      var alc = document.getElementById('cmdAllowedCount');
      if (alc) alc.textContent = String(d.allowedCount || 0);
      var log = document.getElementById('commandSafetyLog');
      if (log && d.lastCheck) {
        var rcls = d.lastCheck.risk === 'safe' ? 'badge-success' : d.lastCheck.risk === 'lowRisk' ? 'badge-info' : d.lastCheck.risk === 'mediumRisk' ? 'badge-warning' : 'badge-error';
        log.innerHTML = '<div style="display:flex;gap:var(--ai-spacing-sm);align-items:center;"><span class="badge ' + rcls + '">' + d.lastCheck.risk + '</span><span style="font-family:monospace;">' + d.lastCheck.command.substring(0, 50) + '</span></div>';
      }
      break;
    }
    // Phase 29: Transaction status update
    case 'transactionUpdate': {
      var d = msg.data;
      var list = document.getElementById('activeTransactionsList');
      if (list && d.transactions) {
        if (d.transactions.length === 0) {
          list.innerHTML = '<div style="font-size:var(--ai-font-xs);color:var(--vscode-descriptionForeground,#8888a0);">No active transactions</div>';
        } else {
          list.innerHTML = d.transactions.map(function(t) { var cls = t.state === 'committed' ? 'badge-success' : t.state === 'rolledBack' ? 'badge-error' : t.state === 'committing' ? 'badge-warning' : 'badge-info'; return '<div style="font-size:var(--ai-font-xs);display:flex;gap:var(--ai-spacing-sm);align-items:center;margin-bottom:2px;"><span class="badge ' + cls + '">' + t.state + '</span><span>' + t.description + '</span><span style="color:var(--vscode-descriptionForeground,#8888a0);">' + t.editCount + ' edits</span></div>'; }).join('');
        }
      }
      var cc = document.getElementById('txnCommittedCount');
      if (cc) cc.textContent = String(d.committedCount || 0);
      var rc = document.getElementById('txnRolledBackCount');
      if (rc) rc.textContent = String(d.rolledBackCount || 0);
      var tc = document.getElementById('txnActiveCount');
      if (tc) tc.textContent = String(d.activeCount || 0);
      break;
    }
  }
});

/* ===== Keyboard Shortcuts ===== */
document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') {
    var modal = document.getElementById('settingsModal');
    if (modal.classList.contains('open')) { closeSettings(); e.preventDefault(); }
    else { vscode.postMessage({ type: 'escape' }); }
  }
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
    var step = state.currentStep;
    if (step === 0) createProject();
    else if (step === 1) submitIdea();
    else if (step === 2) acceptRefinement();
    else if (step === 3) submitConstraints();
    e.preventDefault();
  }
});

/* ===== Exec mode keyboard ===== */
document.querySelectorAll('.exec-mode').forEach(function(el) {
  el.addEventListener('keydown', function(e) {
    if (e.key === 'Enter' || e.key === ' ') { selectExecMode(el); e.preventDefault(); }
  });
});

/* ===== Initial State ===== */
vscode.postMessage({ type: 'getState' });
</script>
</body>
</html>`;
}
