# CSS Token Pipeline

## Overview

Phase 24 generates 55 CSS custom properties on `:root` and injects them into the DOM via a style element appended to `document.head`. This makes the design token system available to any CSS in the document.

## Token Generation

55 custom properties generated across six categories:

| Category | Prefix | Count | Example |
|---|---|---|---|
| Spacing | `--ai-spacing-*` | 12 | `--ai-spacing-xs: 4px` |
| Font | `--ai-font-*` | 8 | `--ai-font-size-sm: 12px` |
| Radius | `--ai-radius-*` | 5 | `--ai-radius-md: 6px` |
| Surface | `--ai-surface-*` | 12 | `--ai-surface-base: #1e1e2e` |
| Duration | `--ai-duration-*` | 10 | `--ai-duration-fast: 50ms` |
| Opacity | `--ai-opacity-*` | 8 | `--ai-opacity-disabled: 0.4` |

## Theme Bridge

18 VS Code CSS variable mappings connect `--ai-*` tokens to native VS Code theme variables:

```css
--ai-surface-base: var(--vscode-editor-background);
--ai-surface-sunken: var(--vscode-sideBar-background);
--ai-surface-raised: var(--vscode-panel-background);
/* ...15 more mappings */
```

These mappings ensure that when a VS Code theme changes, the `--ai-*` tokens inherit the new values -- but only if the style element is re-injected (see Limitation).

## DOM Injection

Tokens are injected by creating a `<style>` element and appending it to `document.head`:

```js
const styleEl = document.createElement('style');
styleEl.textContent = generatedCSS; // :root { --ai-spacing-xs: 4px; ... }
document.head.appendChild(styleEl);
```

Injection occurs at service instantiation time.

## Before / After

- **Before**: tokens existed only as values inside TypeScript service objects. Not available to CSS.
- **After**: tokens are CSS custom properties on `:root`, readable by any CSS rule in the document.

## Limitation

Injection happens at service instantiation, not at VS Code theme load time. If the user switches themes after the AI services have loaded, the `--ai-*` tokens will not automatically update. The theme bridge mappings (`var(--vscode-*)`) do handle this correctly for mapped tokens, but hardcoded fallback values in the generated CSS will not update.
