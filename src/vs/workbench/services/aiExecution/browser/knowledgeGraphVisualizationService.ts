/*---------------------------------------------------------------------------------------------
 *  AI Execution Kernel — Knowledge Graph Visualization Service
 *  Real Vibecode — AI-Native IDE
 *
 *  IKnowledgeGraphVisualizationService — Renders the execution DAG as an interactive
 *  force-directed graph inside a VS Code webview panel. Pure Canvas-based rendering
 *  with no external dependencies. Full pan/zoom/select/hover interactivity.
 *
 *  Consumes the same IExecutionNode / IExecutionEdge / IExecutionScope types used by
 *  the ExecutionGraphService and produces a self-contained HTML document suitable for
 *  injection into any webview.
 *--------------------------------------------------------------------------------------------*/

import { Disposable } from '../../../../base/common/lifecycle.js';
import { Emitter, Event } from '../../../../base/common/event.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import {
	IExecutionNode,
	IExecutionEdge,
	IExecutionScope,
	ExecutionNodeType,
	ExecutionEdgeType,
} from '../common/executionGraphService.js';

// ─── Service Identifier ────────────────────────────────────────────────────────

export const IKnowledgeGraphVisualizationService =
	createDecorator<IKnowledgeGraphVisualizationService>('knowledgeGraphVisualizationService');

// ─── Visualization Node Types ──────────────────────────────────────────────────

/**
 * High-level visual categories that map one-or-more ExecutionNodeType values
 * to a single rendering style.  This keeps the canvas renderer simple while
 * still honouring the rich type system from the execution graph engine.
 */
export const enum VisualizationNodeType {
	FileEdit = 'file-edit',
	TerminalCommand = 'terminal-command',
	Search = 'search',
	AiGeneration = 'ai-generation',
	Rollback = 'rollback',
	Scope = 'scope',
}

// ─── Style Types ───────────────────────────────────────────────────────────────

export interface GraphNodeStyle {
	readonly color: string;
	readonly radius: number;
	readonly label: string;
	readonly icon?: string;
}

export interface GraphLayout {
	readonly width: number;
	readonly height: number;
	readonly padding: number;
	readonly nodeSpacing: number;
}

// ─── Default Constants ─────────────────────────────────────────────────────────

/** Colour palette for each visualization node type */
const DEFAULT_NODE_STYLES: Readonly<Record<VisualizationNodeType, GraphNodeStyle>> = Object.freeze({
	[VisualizationNodeType.FileEdit]:        { color: '#4A90D9', radius: 20, label: 'File Edit',        icon: '\u270E' },  // ✎
	[VisualizationNodeType.TerminalCommand]: { color: '#4CAF50', radius: 20, label: 'Terminal Command', icon: '\u2318' },  // ⌘
	[VisualizationNodeType.Search]:          { color: '#FF9800', radius: 18, label: 'Search',           icon: '\u2315' },  // ⌕
	[VisualizationNodeType.AiGeneration]:    { color: '#9C27B0', radius: 22, label: 'AI Generation',    icon: '\u2728' },  // ✨
	[VisualizationNodeType.Rollback]:        { color: '#F44336', radius: 18, label: 'Rollback',         icon: '\u21A9' },  // ↩
	[VisualizationNodeType.Scope]:           { color: '#757575', radius: 26, label: 'Scope',            icon: '\u25A1' },  // □
});

const DEFAULT_LAYOUT: GraphLayout = Object.freeze({
	width: 1200,
	height: 800,
	padding: 60,
	nodeSpacing: 120,
});

// ─── Force-Directed Layout Tuning ──────────────────────────────────────────────

const FORCE_REPULSION = 5000;
const FORCE_SPRING_LENGTH = 150;
const FORCE_SPRING_STRENGTH = 0.05;
const FORCE_CENTER_GRAVITY = 0.01;
const FORCE_DAMPING = 0.85;
const FORCE_MAX_ITERATIONS = 300;
const FORCE_COOLING_FACTOR = 0.995;
const FORCE_MIN_TEMPERATURE = 0.001;

// ─── Serialization Helpers ─────────────────────────────────────────────────────

/**
 * Lightweight serializable representation of a graph node that is safe to
 * embed in JSON inside the generated HTML.  Only the fields needed for
 * rendering are included — no URI objects, no circular references.
 */
interface SerializedGraphNode {
	readonly id: string;
	readonly type: string;
	readonly visualizationType: VisualizationNodeType;
	readonly label: string;
	readonly description?: string;
	readonly fileUri?: string;
	readonly success: boolean;
	readonly pending: boolean;
	readonly rolledBack: boolean;
	readonly scopeId?: string;
	readonly createdAt: number;
}

interface SerializedGraphEdge {
	readonly id: string;
	readonly sourceId: string;
	readonly targetId: string;
	readonly type: string;
}

interface SerializedGraphScope {
	readonly id: string;
	readonly label: string;
	readonly ownerNodeId: string;
	readonly active: boolean;
}

// ─── Service Interface ─────────────────────────────────────────────────────────

export interface IKnowledgeGraphVisualizationService {
	readonly _serviceBrand: undefined;

	/**
	 * Generate a complete, self-contained HTML document that renders the
	 * given execution graph as an interactive force-directed canvas graph.
	 *
	 * @param nodes  Execution graph nodes
	 * @param edges  Execution graph edges
	 * @param scopes Execution graph scopes
	 * @returns Full HTML document string suitable for a webview
	 */
	renderGraph(
		nodes: IExecutionNode[],
		edges: IExecutionEdge[],
		scopes: IExecutionScope[],
	): string;

	/**
	 * Retrieve the most recently rendered HTML document.
	 * Returns an empty string if renderGraph has not been called yet.
	 */
	getGraphHTML(): string;

	/**
	 * Fired when the user clicks a node inside the webview.
	 * The event carries the node ID so the host can look up
	 * the full IExecutionNode via the graph service.
	 */
	readonly onDidSelectNode: Event<string>;
}

// ─── Implementation ────────────────────────────────────────────────────────────

export class KnowledgeGraphVisualizationService extends Disposable implements IKnowledgeGraphVisualizationService {

	declare readonly _serviceBrand: undefined;

	// ─── State ─────────────────────────────────────────────────────────────────

	private _currentHTML: string = '';

	// ─── Events ────────────────────────────────────────────────────────────────

	private readonly _onDidSelectNode = this._register(new Emitter<string>());
	readonly onDidSelectNode: Event<string> = this._onDidSelectNode.event;

	// ─── Constructor ───────────────────────────────────────────────────────────

	constructor(
		@ILogService private readonly logService: ILogService,
	) {
		super();
		this.logService.trace('[KnowledgeGraphVisualizationService] Initialized');
	}

	// ─── Public API ────────────────────────────────────────────────────────────

	renderGraph(
		nodes: IExecutionNode[],
		edges: IExecutionEdge[],
		scopes: IExecutionScope[],
	): string {
		try {
			const serializedNodes = this._serializeNodes(nodes);
			const serializedEdges = this._serializeEdges(edges);
			const serializedScopes = this._serializeScopes(scopes);
			const nodeStyles = this._serializeNodeStyles();

			const html = this._generateHTMLDocument(
				serializedNodes,
				serializedEdges,
				serializedScopes,
				nodeStyles,
			);

			this._currentHTML = html;
			this.logService.trace(
				`[KnowledgeGraphVisualizationService] Rendered graph: ${nodes.length} nodes, ${edges.length} edges, ${scopes.length} scopes`,
			);
			return html;
		} catch (err) {
			this.logService.error('[KnowledgeGraphVisualizationService] renderGraph failed:', err);
			return this._generateErrorHTML(err);
		}
	}

	getGraphHTML(): string {
		return this._currentHTML;
	}

	/**
	 * Called by the webview host when it receives a message from the
	 * rendered iframe.  The webview integration layer is responsible
	 * for wiring this up to `window.addEventListener('message', ...)`.
	 */
	handleWebviewMessage(message: { type: string; nodeId?: string }): void {
		if (message.type === 'nodeSelected' && message.nodeId) {
			this._onDidSelectNode.fire(message.nodeId);
		}
	}

	// ─── Serialization ─────────────────────────────────────────────────────────

	private _serializeNodes(nodes: IExecutionNode[]): SerializedGraphNode[] {
		return nodes.map(node => ({
			id: node.id,
			type: node.type,
			visualizationType: this._mapVisualizationType(node),
			label: node.label,
			description: node.description,
			fileUri: node.fileUri?.toString(),
			success: node.success,
			pending: node.pending,
			rolledBack: node.rolledBack,
			scopeId: node.scopeId,
			createdAt: node.createdAt,
		}));
	}

	private _serializeEdges(edges: IExecutionEdge[]): SerializedGraphEdge[] {
		return edges.map(edge => ({
			id: edge.id,
			sourceId: edge.sourceId,
			targetId: edge.targetId,
			type: edge.type,
		}));
	}

	private _serializeScopes(scopes: IExecutionScope[]): SerializedGraphScope[] {
		return scopes.map(scope => ({
			id: scope.id,
			label: scope.label,
			ownerNodeId: scope.ownerNodeId,
			active: scope.active,
		}));
	}

	private _serializeNodeStyles(): Record<string, GraphNodeStyle> {
		const result: Record<string, GraphNodeStyle> = {};
		for (const [key, style] of Object.entries(DEFAULT_NODE_STYLES)) {
			result[key] = style;
		}
		return result;
	}

	/**
	 * Map the granular ExecutionNodeType enum to one of the six visual
	 * categories.  This keeps the renderer simple while still reflecting
	 * the semantic intent of each node.
	 */
	private _mapVisualizationType(node: IExecutionNode): VisualizationNodeType {
		if (node.rolledBack) {
			return VisualizationNodeType.Rollback;
		}
		switch (node.type) {
			case ExecutionNodeType.FileEdit:
			case ExecutionNodeType.WorkspaceEdit:
			case ExecutionNodeType.Save:
			case ExecutionNodeType.Formatter:
			case ExecutionNodeType.Refactor:
			case ExecutionNodeType.CodeAction:
			case ExecutionNodeType.Snippet:
				return VisualizationNodeType.FileEdit;

			case ExecutionNodeType.TerminalExecution:
				return VisualizationNodeType.TerminalCommand;

			case ExecutionNodeType.AiAction:
				return VisualizationNodeType.AiGeneration;

			case ExecutionNodeType.SystemAction:
				return VisualizationNodeType.Search; // System actions are typically discovery/search-like

			default:
				return VisualizationNodeType.FileEdit;
		}
	}

	// ─── HTML Generation ───────────────────────────────────────────────────────

	private _generateHTMLDocument(
		nodes: SerializedGraphNode[],
		edges: SerializedGraphEdge[],
		scopes: SerializedGraphScope[],
		nodeStyles: Record<string, GraphNodeStyle>,
	): string {
		const nodesJSON = JSON.stringify(nodes);
		const edgesJSON = JSON.stringify(edges);
		const scopesJSON = JSON.stringify(scopes);
		const stylesJSON = JSON.stringify(nodeStyles);

		return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Knowledge Graph</title>
<style>
	${this._generateCSS()}
</style>
</head>
<body>
<div id="container">
	<canvas id="graphCanvas"></canvas>
	<div id="tooltip" class="tooltip hidden"></div>
	<div id="legend"></div>
	<div id="controls">
		<button id="zoomIn" title="Zoom In">+</button>
		<button id="zoomOut" title="Zoom Out">&minus;</button>
		<button id="resetView" title="Reset View">&#8634;</button>
	</div>
	<div id="statusBar">
		<span id="nodeCount"></span>
		<span id="edgeCount"></span>
		<span id="zoomLevel"></span>
	</div>
</div>
<script>
	${this._generateJavaScript(nodesJSON, edgesJSON, scopesJSON, stylesJSON)}
</script>
</body>
</html>`;
	}

	// ─── CSS ────────────────────────────────────────────────────────────────────

	private _generateCSS(): string {
		return `
*, *::before, *::after {
	box-sizing: border-box;
	margin: 0;
	padding: 0;
}

html, body {
	width: 100%;
	height: 100%;
	overflow: hidden;
	font-family: var(--vscode-font-family, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif);
	background: var(--vscode-editor-background, #1e1e1e);
	color: var(--vscode-editor-foreground, #cccccc);
}

#container {
	position: relative;
	width: 100%;
	height: 100%;
}

#graphCanvas {
	display: block;
	width: 100%;
	height: 100%;
	cursor: grab;
}

#graphCanvas.grabbing {
	cursor: grabbing;
}

#graphCanvas.pointer {
	cursor: pointer;
}

.tooltip {
	position: absolute;
	pointer-events: none;
	background: var(--vscode-editorWidget-background, #252526);
	border: 1px solid var(--vscode-editorWidget-border, #454545);
	border-radius: 4px;
	padding: 8px 12px;
	font-size: 12px;
	line-height: 1.5;
	max-width: 320px;
	box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
	z-index: 100;
	white-space: pre-wrap;
	word-break: break-word;
}

.tooltip.hidden {
	display: none;
}

.tooltip .tip-label {
	font-weight: 600;
	margin-bottom: 4px;
	color: var(--vscode-editor-foreground, #cccccc);
}

.tooltip .tip-type {
	display: inline-block;
	padding: 1px 6px;
	border-radius: 3px;
	font-size: 11px;
	margin-bottom: 4px;
}

.tooltip .tip-detail {
	color: var(--vscode-descriptionForeground, #999999);
	font-size: 11px;
}

#legend {
	position: absolute;
	top: 12px;
	left: 12px;
	background: var(--vscode-editorWidget-background, #252526);
	border: 1px solid var(--vscode-editorWidget-border, #454545);
	border-radius: 6px;
	padding: 10px 14px;
	font-size: 12px;
	z-index: 50;
	box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}

#legend h4 {
	margin-bottom: 8px;
	font-size: 11px;
	text-transform: uppercase;
	letter-spacing: 0.5px;
	color: var(--vscode-descriptionForeground, #999999);
}

.legend-item {
	display: flex;
	align-items: center;
	gap: 8px;
	margin-bottom: 4px;
}

.legend-swatch {
	width: 12px;
	height: 12px;
	border-radius: 50%;
	flex-shrink: 0;
}

#controls {
	position: absolute;
	top: 12px;
	right: 12px;
	display: flex;
	flex-direction: column;
	gap: 4px;
	z-index: 50;
}

#controls button {
	width: 32px;
	height: 32px;
	border: 1px solid var(--vscode-editorWidget-border, #454545);
	border-radius: 4px;
	background: var(--vscode-editorWidget-background, #252526);
	color: var(--vscode-editor-foreground, #cccccc);
	font-size: 16px;
	cursor: pointer;
	display: flex;
	align-items: center;
	justify-content: center;
	line-height: 1;
}

#controls button:hover {
	background: var(--vscode-list-hoverBackground, #2a2d2e);
}

#statusBar {
	position: absolute;
	bottom: 0;
	left: 0;
	right: 0;
	height: 24px;
	background: var(--vscode-statusBar-background, #007acc);
	color: var(--vscode-statusBar-foreground, #ffffff);
	display: flex;
	align-items: center;
	padding: 0 12px;
	gap: 16px;
	font-size: 11px;
	z-index: 50;
}

#statusBar span {
	white-space: nowrap;
}
`;
	}

	// ─── JavaScript ─────────────────────────────────────────────────────────────

	private _generateJavaScript(
		nodesJSON: string,
		edgesJSON: string,
		scopesJSON: string,
		stylesJSON: string,
	): string {
		return `
(function() {
	'use strict';

	// ─── Data ──────────────────────────────────────────────────────────────
	var nodes = ${nodesJSON};
	var edges = ${edgesJSON};
	var scopes = ${scopesJSON};
	var nodeStyles = ${stylesJSON};

	// ─── Canvas Setup ──────────────────────────────────────────────────────
	var canvas = document.getElementById('graphCanvas');
	var ctx = canvas.getContext('2d');
	var tooltip = document.getElementById('tooltip');
	var dpr = window.devicePixelRatio || 1;

	function resizeCanvas() {
		var rect = canvas.parentElement.getBoundingClientRect();
		canvas.width = rect.width * dpr;
		canvas.height = rect.height * dpr;
		canvas.style.width = rect.width + 'px';
		canvas.style.height = rect.height + 'px';
		ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
	}
	resizeCanvas();
	window.addEventListener('resize', function() { resizeCanvas(); draw(); });

	// ─── View State ────────────────────────────────────────────────────────
	var viewState = {
		panX: 0,
		panY: 0,
		zoom: 1,
		hoveredNode: null,
		selectedNode: null,
		dragging: false,
		dragStartX: 0,
		dragStartY: 0,
		panStartX: 0,
		panStartY: 0,
	};

	// ─── Layout State ──────────────────────────────────────────────────────
	var layoutNodes = []; // { id, x, y, vx, vy, ... }
	var nodeMap = {};     // id -> layoutNode

	// ─── Scope Boundaries ──────────────────────────────────────────────────
	var scopeRects = []; // { id, label, x, y, w, h, active }

	// ─── Build Legend ──────────────────────────────────────────────────────
	(function buildLegend() {
		var legendEl = document.getElementById('legend');
		var html = '<h4>Node Types</h4>';
		var keys = Object.keys(nodeStyles);
		for (var i = 0; i < keys.length; i++) {
			var style = nodeStyles[keys[i]];
			html += '<div class="legend-item">'
				+ '<span class="legend-swatch" style="background:' + style.color + '"></span>'
				+ '<span>' + escapeHtml(style.label) + '</span>'
				+ '</div>';
		}
		legendEl.innerHTML = html;
	})();

	// ─── Status Bar ────────────────────────────────────────────────────────
	function updateStatusBar() {
		document.getElementById('nodeCount').textContent = 'Nodes: ' + nodes.length;
		document.getElementById('edgeCount').textContent = 'Edges: ' + edges.length;
		document.getElementById('zoomLevel').textContent = 'Zoom: ' + Math.round(viewState.zoom * 100) + '%';
	}
	updateStatusBar();

	// ─── Initialize Layout ─────────────────────────────────────────────────
	function initLayout() {
		layoutNodes = [];
		nodeMap = {};
		var w = canvas.width / dpr;
		var h = canvas.height / dpr;
		var centerX = w / 2;
		var centerY = h / 2;

		// Place nodes in a circle initially for a good starting configuration
		var count = nodes.length;
		for (var i = 0; i < count; i++) {
			var n = nodes[i];
			var angle = (2 * Math.PI * i) / count;
			var spread = Math.min(w, h) * 0.3;
			var ln = {
				id: n.id,
				data: n,
				x: centerX + spread * Math.cos(angle) + (Math.random() - 0.5) * 20,
				y: centerY + spread * Math.sin(angle) + (Math.random() - 0.5) * 20,
				vx: 0,
				vy: 0,
			};
			layoutNodes.push(ln);
			nodeMap[ln.id] = ln;
		}
	}

	// ─── Force-Directed Layout ─────────────────────────────────────────────
	function computeLayout() {
		if (layoutNodes.length === 0) return;

		var temperature = 1.0;
		var w = canvas.width / dpr;
		var h = canvas.height / dpr;
		var centerX = w / 2;
		var centerY = h / 2;

		for (var iter = 0; iter < ${FORCE_MAX_ITERATIONS}; iter++) {
			// Repulsion between all pairs
			for (var i = 0; i < layoutNodes.length; i++) {
				for (var j = i + 1; j < layoutNodes.length; j++) {
					var a = layoutNodes[i];
					var b = layoutNodes[j];
					var dx = b.x - a.x;
					var dy = b.y - a.y;
					var distSq = dx * dx + dy * dy;
					if (distSq < 1) { distSq = 1; }
					var dist = Math.sqrt(distSq);
					var force = ${FORCE_REPULSION} / distSq;
					var fx = (dx / dist) * force;
					var fy = (dy / dist) * force;
					a.vx -= fx;
					a.vy -= fy;
					b.vx += fx;
					b.vy += fy;
				}
			}

			// Spring attraction along edges
			for (var e = 0; e < edges.length; e++) {
				var edge = edges[e];
				var src = nodeMap[edge.sourceId];
				var tgt = nodeMap[edge.targetId];
				if (!src || !tgt) continue;

				var dx = tgt.x - src.x;
				var dy = tgt.y - src.y;
				var dist = Math.sqrt(dx * dx + dy * dy);
				if (dist < 1) { dist = 1; }
				var displacement = dist - ${FORCE_SPRING_LENGTH};
				var force = ${FORCE_SPRING_STRENGTH} * displacement;
				var fx = (dx / dist) * force;
				var fy = (dy / dist) * force;
				src.vx += fx;
				src.vy += fy;
				tgt.vx -= fx;
				tgt.vy -= fy;
			}

			// Center gravity
			for (var k = 0; k < layoutNodes.length; k++) {
				var ln = layoutNodes[k];
				ln.vx += (centerX - ln.x) * ${FORCE_CENTER_GRAVITY};
				ln.vy += (centerY - ln.y) * ${FORCE_CENTER_GRAVITY};
			}

			// Apply velocities with damping & cooling
			temperature *= ${FORCE_COOLING_FACTOR};
			for (var k = 0; k < layoutNodes.length; k++) {
				var ln = layoutNodes[k];
				ln.vx *= ${FORCE_DAMPING};
				ln.vy *= ${FORCE_DAMPING};
				// Clamp velocity by temperature
				var maxV = 50 * temperature;
				ln.vx = Math.max(-maxV, Math.min(maxV, ln.vx));
				ln.vy = Math.max(-maxV, Math.min(maxV, ln.vy));
				ln.x += ln.vx * temperature;
				ln.y += ln.vy * temperature;
			}

			if (temperature < ${FORCE_MIN_TEMPERATURE}) break;
		}
	}

	// ─── Compute Scope Rectangles ──────────────────────────────────────────
	function computeScopeRects() {
		scopeRects = [];
		var padding = 40;
		for (var s = 0; s < scopes.length; s++) {
			var scope = scopes[s];
			var minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
			var found = false;
			for (var i = 0; i < layoutNodes.length; i++) {
				var ln = layoutNodes[i];
				if (ln.data.scopeId === scope.id) {
					found = true;
					var style = nodeStyles[ln.data.visualizationType] || nodeStyles['file-edit'];
					var r = style ? style.radius : 20;
					if (ln.x - r < minX) minX = ln.x - r;
					if (ln.y - r < minY) minY = ln.y - r;
					if (ln.x + r > maxX) maxX = ln.x + r;
					if (ln.y + r > maxY) maxY = ln.y + r;
				}
			}
			if (found) {
				scopeRects.push({
					id: scope.id,
					label: scope.label,
					x: minX - padding,
					y: minY - padding,
					w: maxX - minX + padding * 2,
					h: maxY - minY + padding * 2,
					active: scope.active,
				});
			}
		}
	}

	// ─── Drawing ───────────────────────────────────────────────────────────
	function draw() {
		var w = canvas.width / dpr;
		var h = canvas.height / dpr;
		ctx.clearRect(0, 0, w, h);

		ctx.save();
		ctx.translate(viewState.panX, viewState.panY);
		ctx.scale(viewState.zoom, viewState.zoom);

		drawScopes();
		drawEdges();
		drawNodes();

		ctx.restore();
	}

	function drawScopes() {
		for (var i = 0; i < scopeRects.length; i++) {
			var sr = scopeRects[i];
			ctx.save();
			ctx.strokeStyle = sr.active
				? 'var(--vscode-focusBorder, #007fd4)'
				: 'rgba(117, 117, 117, 0.4)';
			ctx.lineWidth = sr.active ? 2 : 1;
			ctx.setLineDash(sr.active ? [] : [6, 4]);
			ctx.fillStyle = sr.active
				? 'rgba(0, 127, 212, 0.04)'
				: 'rgba(117, 117, 117, 0.03)';
			roundRect(ctx, sr.x, sr.y, sr.w, sr.h, 8);
			ctx.fill();
			ctx.stroke();
			ctx.setLineDash([]);

			// Scope label
			ctx.fillStyle = 'var(--vscode-descriptionForeground, #999999)';
			ctx.font = '11px ' + getFontFamily();
			ctx.textAlign = 'left';
			ctx.textBaseline = 'top';
			ctx.fillText(escapeHtml(sr.label), sr.x + 8, sr.y + 6);

			ctx.restore();
		}
	}

	function drawEdges() {
		for (var i = 0; i < edges.length; i++) {
			var edge = edges[i];
			var src = nodeMap[edge.sourceId];
			var tgt = nodeMap[edge.targetId];
			if (!src || !tgt) continue;

			var srcStyle = nodeStyles[src.data.visualizationType] || nodeStyles['file-edit'];
			var tgtStyle = nodeStyles[tgt.data.visualizationType] || nodeStyles['file-edit'];

			var dx = tgt.x - src.x;
			var dy = tgt.y - src.y;
			var dist = Math.sqrt(dx * dx + dy * dy);
			if (dist < 1) continue;

			var nx = dx / dist;
			var ny = dy / dist;

			// Offset start/end by node radius so arrow starts at circle edge
			var srcR = srcStyle ? srcStyle.radius : 20;
			var tgtR = tgtStyle ? tgtStyle.radius : 20;

			var x1 = src.x + nx * srcR;
			var y1 = src.y + ny * srcR;
			var x2 = tgt.x - nx * (tgtR + 6); // 6px for arrowhead
			var y2 = tgt.y - ny * (tgtR + 6);

			// Edge colour based on type
			var edgeColor = getEdgeColor(edge.type);

			ctx.save();
			ctx.strokeStyle = edgeColor;
			ctx.lineWidth = edge.type === 'rollback-of' ? 2 : 1.5;
			ctx.globalAlpha = 0.7;

			if (edge.type === 'rollback-of') {
				ctx.setLineDash([5, 3]);
			} else if (edge.type === 'derived-from') {
				ctx.setLineDash([3, 3]);
			}

			ctx.beginPath();
			ctx.moveTo(x1, y1);
			ctx.lineTo(x2, y2);
			ctx.stroke();
			ctx.setLineDash([]);

			// Arrowhead
			var arrowSize = 8;
			var ax = x2 + nx * arrowSize;
			var ay = y2 + ny * arrowSize;
			var perpX = -ny;
			var perpY = nx;

			ctx.fillStyle = edgeColor;
			ctx.globalAlpha = 0.9;
			ctx.beginPath();
			ctx.moveTo(x2, y2);
			ctx.lineTo(ax - perpX * arrowSize * 0.4, ay - perpY * arrowSize * 0.4);
			ctx.lineTo(ax + perpX * arrowSize * 0.4, ay + perpY * arrowSize * 0.4);
			ctx.closePath();
			ctx.fill();

			ctx.restore();
		}
	}

	function drawNodes() {
		for (var i = 0; i < layoutNodes.length; i++) {
			var ln = layoutNodes[i];
			var style = nodeStyles[ln.data.visualizationType] || nodeStyles['file-edit'];
			var r = style ? style.radius : 20;
			var color = style ? style.color : '#4A90D9';
			var isHovered = viewState.hoveredNode && viewState.hoveredNode.id === ln.id;
			var isSelected = viewState.selectedNode && viewState.selectedNode.id === ln.id;

			ctx.save();

			// Outer glow for hovered / selected
			if (isSelected || isHovered) {
				ctx.shadowColor = color;
				ctx.shadowBlur = isSelected ? 16 : 10;
			}

			// Fill
			var alpha = ln.data.pending ? 0.5 : 1.0;
			ctx.globalAlpha = alpha;

			// Rolled-back nodes get a striped pattern (diagonal line through circle)
			if (ln.data.rolledBack) {
				ctx.beginPath();
				ctx.arc(ln.x, ln.y, r, 0, 2 * Math.PI);
				ctx.fillStyle = color;
				ctx.fill();

				// Diagonal strike-through
				ctx.strokeStyle = '#F44336';
				ctx.lineWidth = 2.5;
				ctx.beginPath();
				ctx.moveTo(ln.x - r * 0.7, ln.y - r * 0.7);
				ctx.lineTo(ln.x + r * 0.7, ln.y + r * 0.7);
				ctx.stroke();
			} else {
				// Normal circle
				ctx.beginPath();
				ctx.arc(ln.x, ln.y, r, 0, 2 * Math.PI);
				ctx.fillStyle = color;
				ctx.fill();
			}

			// Border
			ctx.shadowBlur = 0;
			ctx.strokeStyle = isSelected ? '#ffffff' : 'rgba(255,255,255,0.15)';
			ctx.lineWidth = isSelected ? 2.5 : 1;
			ctx.beginPath();
			ctx.arc(ln.x, ln.y, r, 0, 2 * Math.PI);
			ctx.stroke();

			// Icon
			if (style && style.icon) {
				ctx.fillStyle = '#ffffff';
				ctx.globalAlpha = alpha * 0.9;
				ctx.font = (r * 0.7) + 'px ' + getFontFamily();
				ctx.textAlign = 'center';
				ctx.textBaseline = 'middle';
				ctx.fillText(style.icon, ln.x, ln.y);
			}

			// Label below node
			ctx.globalAlpha = alpha;
			ctx.fillStyle = 'var(--vscode-editor-foreground, #cccccc)';
			ctx.font = '11px ' + getFontFamily();
			ctx.textAlign = 'center';
			ctx.textBaseline = 'top';
			var labelText = ln.data.label;
			if (labelText.length > 24) {
				labelText = labelText.substring(0, 22) + '\\u2026';
			}
			ctx.fillText(escapeHtml(labelText), ln.x, ln.y + r + 5);

			// Success/failure indicator
			if (!ln.data.pending && !ln.data.rolledBack) {
				var indicatorR = 5;
				var ix = ln.x + r * 0.75;
				var iy = ln.y - r * 0.75;
				ctx.beginPath();
				ctx.arc(ix, iy, indicatorR, 0, 2 * Math.PI);
				ctx.fillStyle = ln.data.success ? '#4CAF50' : '#F44336';
				ctx.globalAlpha = 0.9;
				ctx.fill();
				ctx.strokeStyle = 'var(--vscode-editor-background, #1e1e1e)';
				ctx.lineWidth = 1.5;
				ctx.stroke();
			}

			ctx.restore();
		}
	}

	// ─── Helpers ───────────────────────────────────────────────────────────

	function getFontFamily() {
		return getComputedStyle(document.body).fontFamily || 'sans-serif';
	}

	function escapeHtml(text) {
		if (!text) return '';
		var div = document.createElement('div');
		div.textContent = text;
		return div.innerHTML;
	}

	function getEdgeColor(type) {
		switch (type) {
			case 'caused-by':   return '#569CD6';
			case 'triggered':   return '#DCDCAA';
			case 'parent':      return '#808080';
			case 'rollback-of': return '#F44336';
			case 'derived-from': return '#CE9178';
			default:            return '#808080';
		}
	}

	function roundRect(ctx, x, y, w, h, r) {
		ctx.beginPath();
		ctx.moveTo(x + r, y);
		ctx.lineTo(x + w - r, y);
		ctx.quadraticCurveTo(x + w, y, x + w, y + r);
		ctx.lineTo(x + w, y + h - r);
		ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
		ctx.lineTo(x + r, y + h);
		ctx.quadraticCurveTo(x, y + h, x, y + h - r);
		ctx.lineTo(x, y + r);
		ctx.quadraticCurveTo(x, y, x + r, y);
		ctx.closePath();
	}

	function screenToWorld(sx, sy) {
		return {
			x: (sx - viewState.panX) / viewState.zoom,
			y: (sy - viewState.panY) / viewState.zoom,
		};
	}

	function findNodeAt(wx, wy) {
		// Search in reverse so topmost (last drawn) wins
		for (var i = layoutNodes.length - 1; i >= 0; i--) {
			var ln = layoutNodes[i];
			var style = nodeStyles[ln.data.visualizationType] || nodeStyles['file-edit'];
			var r = style ? style.radius : 20;
			var dx = wx - ln.x;
			var dy = wy - ln.y;
			if (dx * dx + dy * dy <= r * r) {
				return ln;
			}
		}
		return null;
	}

	function formatTimestamp(ts) {
		if (!ts) return 'N/A';
		var d = new Date(ts);
		return d.toLocaleTimeString() + ' ' + d.toLocaleDateString();
	}

	// ─── Mouse Interaction ─────────────────────────────────────────────────

	canvas.addEventListener('mousedown', function(e) {
		var rect = canvas.getBoundingClientRect();
		var sx = e.clientX - rect.left;
		var sy = e.clientY - rect.top;
		var world = screenToWorld(sx, sy);
		var hit = findNodeAt(world.x, world.y);

		if (hit) {
			// Select node
			viewState.selectedNode = hit;
			draw();
			// Notify host
			if (window.vscode) {
				window.vscode.postMessage({ type: 'nodeSelected', nodeId: hit.id });
			} else {
				// Fallback for standalone preview
				console.log('Node selected:', hit.id);
			}
		} else {
			// Start panning
			viewState.dragging = true;
			viewState.dragStartX = e.clientX;
			viewState.dragStartY = e.clientY;
			viewState.panStartX = viewState.panX;
			viewState.panStartY = viewState.panY;
			canvas.classList.add('grabbing');
		}
	});

	canvas.addEventListener('mousemove', function(e) {
		var rect = canvas.getBoundingClientRect();
		var sx = e.clientX - rect.left;
		var sy = e.clientY - rect.top;

		if (viewState.dragging) {
			viewState.panX = viewState.panStartX + (e.clientX - viewState.dragStartX);
			viewState.panY = viewState.panStartY + (e.clientY - viewState.dragStartY);
			draw();
			return;
		}

		var world = screenToWorld(sx, sy);
		var hit = findNodeAt(world.x, world.y);

		if (hit !== viewState.hoveredNode) {
			viewState.hoveredNode = hit;
			canvas.classList.toggle('pointer', !!hit);
			draw();
		}

		// Tooltip
		if (hit) {
			var style = nodeStyles[hit.data.visualizationType] || nodeStyles['file-edit'];
			var html = '<div class=\"tip-label\">' + escapeHtml(hit.data.label) + '</div>';
			html += '<span class=\"tip-type\" style=\"background:' + (style ? style.color : '#888') + '; color:#fff\">'
				+ escapeHtml(style ? style.label : hit.data.visualizationType) + '</span><br>';
			if (hit.data.description) {
				html += '<div class=\"tip-detail\">' + escapeHtml(hit.data.description) + '</div>';
			}
			if (hit.data.fileUri) {
				html += '<div class=\"tip-detail\">File: ' + escapeHtml(hit.data.fileUri) + '</div>';
			}
			html += '<div class=\"tip-detail\">Status: '
				+ (hit.data.pending ? 'Pending' : (hit.data.success ? 'Success' : 'Failed'))
				+ (hit.data.rolledBack ? ' (Rolled Back)' : '') + '</div>';
			html += '<div class=\"tip-detail\">Created: ' + formatTimestamp(hit.data.createdAt) + '</div>';
			tooltip.innerHTML = html;
			tooltip.classList.remove('hidden');

			// Position tooltip
			var tx = e.clientX + 14;
			var ty = e.clientY + 14;
			var tw = tooltip.offsetWidth;
			var th = tooltip.offsetHeight;
			var vw = window.innerWidth;
			var vh = window.innerHeight;
			if (tx + tw > vw - 8) tx = e.clientX - tw - 8;
			if (ty + th > vh - 8) ty = e.clientY - th - 8;
			tooltip.style.left = tx + 'px';
			tooltip.style.top = ty + 'px';
		} else {
			tooltip.classList.add('hidden');
		}
	});

	canvas.addEventListener('mouseup', function() {
		viewState.dragging = false;
		canvas.classList.remove('grabbing');
	});

	canvas.addEventListener('mouseleave', function() {
		viewState.dragging = false;
		viewState.hoveredNode = null;
		tooltip.classList.add('hidden');
		canvas.classList.remove('grabbing');
		canvas.classList.remove('pointer');
		draw();
	});

	// Zoom with mouse wheel
	canvas.addEventListener('wheel', function(e) {
		e.preventDefault();
		var rect = canvas.getBoundingClientRect();
		var mx = e.clientX - rect.left;
		var my = e.clientY - rect.top;

		var zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
		var newZoom = viewState.zoom * zoomFactor;
		newZoom = Math.max(0.1, Math.min(5, newZoom));

		// Zoom towards mouse position
		var ratio = newZoom / viewState.zoom;
		viewState.panX = mx - (mx - viewState.panX) * ratio;
		viewState.panY = my - (my - viewState.panY) * ratio;
		viewState.zoom = newZoom;

		updateStatusBar();
		draw();
	}, { passive: false });

	// ─── Control Buttons ───────────────────────────────────────────────────

	document.getElementById('zoomIn').addEventListener('click', function() {
		var w = canvas.width / dpr;
		var h = canvas.height / dpr;
		var cx = w / 2;
		var cy = h / 2;
		var newZoom = Math.min(5, viewState.zoom * 1.25);
		var ratio = newZoom / viewState.zoom;
		viewState.panX = cx - (cx - viewState.panX) * ratio;
		viewState.panY = cy - (cy - viewState.panY) * ratio;
		viewState.zoom = newZoom;
		updateStatusBar();
		draw();
	});

	document.getElementById('zoomOut').addEventListener('click', function() {
		var w = canvas.width / dpr;
		var h = canvas.height / dpr;
		var cx = w / 2;
		var cy = h / 2;
		var newZoom = Math.max(0.1, viewState.zoom / 1.25);
		var ratio = newZoom / viewState.zoom;
		viewState.panX = cx - (cx - viewState.panX) * ratio;
		viewState.panY = cy - (cy - viewState.panY) * ratio;
		viewState.zoom = newZoom;
		updateStatusBar();
		draw();
	});

	document.getElementById('resetView').addEventListener('click', function() {
		viewState.panX = 0;
		viewState.panY = 0;
		viewState.zoom = 1;
		viewState.selectedNode = null;
		updateStatusBar();
		draw();
	});

	// ─── Keyboard ──────────────────────────────────────────────────────────
	document.addEventListener('keydown', function(e) {
		if (e.key === 'Escape') {
			viewState.selectedNode = null;
			draw();
		}
	});

	// ─── Run ───────────────────────────────────────────────────────────────
	if (nodes.length > 0) {
		initLayout();
		computeLayout();
		computeScopeRects();
		// Center the graph in the viewport
		centerGraph();
		draw();
	} else {
		drawEmptyState();
	}

	function centerGraph() {
		if (layoutNodes.length === 0) return;
		var w = canvas.width / dpr;
		var h = canvas.height / dpr;
		var minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
		for (var i = 0; i < layoutNodes.length; i++) {
			var ln = layoutNodes[i];
			var style = nodeStyles[ln.data.visualizationType] || nodeStyles['file-edit'];
			var r = style ? style.radius : 20;
			if (ln.x - r < minX) minX = ln.x - r;
			if (ln.y - r < minY) minY = ln.y - r;
			if (ln.x + r > maxX) maxX = ln.x + r;
			if (ln.y + r > maxY) maxY = ln.y + r;
		}
		var gw = maxX - minX;
		var gh = maxY - minY;
		var gcx = minX + gw / 2;
		var gcy = minY + gh / 2;

		// Fit to viewport with padding
		var padding = 80;
		var scaleX = (w - padding * 2) / gw;
		var scaleY = (h - padding * 2 - 24) / gh; // 24px for status bar
		var scale = Math.min(scaleX, scaleY, 2); // don't zoom in too much

		viewState.zoom = scale;
		viewState.panX = w / 2 - gcx * scale;
		viewState.panY = (h - 24) / 2 - gcy * scale;
		updateStatusBar();
	}

	function drawEmptyState() {
		var w = canvas.width / dpr;
		var h = canvas.height / dpr;
		ctx.fillStyle = 'var(--vscode-descriptionForeground, #999999)';
		ctx.font = '14px ' + getFontFamily();
		ctx.textAlign = 'center';
		ctx.textBaseline = 'middle';
		ctx.fillText('No execution graph data to display', w / 2, h / 2);
	}

})();
`;
	}

	// ─── Error HTML ────────────────────────────────────────────────────────────

	private _generateErrorHTML(err: unknown): string {
		const message = err instanceof Error ? err.message : String(err);
		return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8" /><title>Knowledge Graph — Error</title>
<style>
	body { font-family: var(--vscode-font-family, sans-serif); background: var(--vscode-editor-background, #1e1e1e); color: var(--vscode-errorForeground, #f48771); padding: 24px; }
	pre { background: var(--vscode-textCodeBlock-background, #1a1a1a); padding: 12px; border-radius: 4px; overflow-x: auto; }
</style></head>
<body>
<h2>Knowledge Graph Visualization Error</h2>
<pre>${escapeHtmlContent(message)}</pre>
</body></html>`;
	}

	// ─── Lifecycle ─────────────────────────────────────────────────────────────

	override dispose(): void {
		this._currentHTML = '';
		super.dispose();
		this.logService.trace('[KnowledgeGraphVisualizationService] Disposed');
	}
}

// ─── Utility ───────────────────────────────────────────────────────────────────

function escapeHtmlContent(text: string): string {
	return text
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;');
}
