/*---------------------------------------------------------------------------------------------
 *  AI Execution Kernel — Knowledge Graph Visualization Service Interface
 *  Real Vibecode — AI-Native IDE
 *
 *  IKnowledgeGraphVisualizationService — Service identifier and interface
 *  for the visualization layer that renders execution DAG data as HTML.
 *--------------------------------------------------------------------------------------------*/

import { Event } from '../../../../base/common/event.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import {
	IExecutionNode,
	IExecutionEdge,
	IExecutionScope,
} from './executionGraphService.js';

export const IKnowledgeGraphVisualizationService =
	createDecorator<IKnowledgeGraphVisualizationService>('knowledgeGraphVisualizationService');

export interface IKnowledgeGraphVisualizationService {
	readonly _serviceBrand: undefined;

	/**
	 * Generate a complete, self-contained HTML document that renders the
	 * given execution graph as an interactive force-directed canvas graph.
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
	 */
	readonly onDidSelectNode: Event<string>;
}
