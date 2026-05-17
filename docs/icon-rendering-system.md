# Icon Rendering System

## Overview

Phase 24 implements SVG icon rendering from path data. 86 icons with real SVG path data can now be rendered as actual DOM elements.

## Icon Inventory

86 SVG icons with real path data. Each icon is defined as a TypeScript object containing:

- `name`: string identifier
- `viewBox`: typically `"0 0 16 16"`
- `pathData`: SVG `d` attribute value (not placeholder, not empty)
- `ariaLabel`: accessibility label

## Rendering Functions

### renderIcon(name: string): string

Returns an SVG markup string. Useful for `innerHTML` insertion:

```js
const svg = renderIcon('play');
element.innerHTML = svg;
// <svg viewBox="0 0 16 16" aria-label="play"><path d="M3 2l10 6-10 6z"/></svg>
```

### renderIconToElement(name: string): SVGElement

Creates a DOM element via `document.createElementNS`:

```js
const el = renderIconToElement('play');
container.appendChild(el);
```

Uses `http://www.w3.org/2000/svg` namespace. Returns an `SVGElement` ready for DOM insertion.

## Emoji Replacement

Emoji detection and replacement via `TreeWalker` DOM scan:

1. Walk all text nodes in a container
2. Detect emoji characters via regex
3. Replace emoji text node with rendered SVG icon element

Scans only text nodes. Does not traverse shadow roots or iframes.

## Accessibility

Every rendered icon receives `aria-label` with the icon's semantic name. Icons do not receive `role="img"` by default -- consumers should add this when icons convey meaning beyond decoration.

## Icon States

| State | Implementation |
|---|---|
| Default | Base path data, no filter |
| Hover | `opacity: 0.8` on wrapper |
| Active | `transform: scale(0.95)` on wrapper |
| Disabled | `opacity: 0.4` on wrapper |
| Focus | `outline: 2px solid var(--ai-focus-color)` on wrapper |

States are CSS-driven. The icon itself is static SVG; state changes apply to the wrapper element.

## Before / After

- **Before**: icons were TypeScript objects with SVG path data. No DOM output possible.
- **After**: icons render as actual SVG elements in the DOM via two rendering functions.

## Limitation

Icons are rendered on demand. There is no icon sprite sheet or pre-rendered icon font. Each icon instance creates a separate SVG element in the DOM. For views with many icons (e.g. file trees), this may have a higher DOM node count than a sprite-based approach.
