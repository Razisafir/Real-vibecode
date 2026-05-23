/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Real Vibecode Project. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

/**
 * MCP Resource Scanner Service — Stub Implementation
 *
 * Scans the workspace for MCP server resources (config files, tool definitions, etc.).
 * This stub provides the interface and registration so the workbench can compile.
 * Full implementation will be added in the MCP integration phase.
 */

import { createDecorator } from '../../../instantiation/common/instantiation.js';

export const IMcpResourceScannerService = createDecorator<IMcpResourceScannerService>('mcpResourceScannerService');

export interface IMcpResourceScannerEntry {
	readonly resourceUri: string;
	readonly type: 'server' | 'tool' | 'prompt' | 'resource';
	readonly name: string;
	readonly description?: string;
}

export interface IMcpResourceScannerService {
	readonly _serviceBrand: undefined;
	scanWorkspace(): Promise<IMcpResourceScannerEntry[]>;
	scanDirectory(dirPath: string): Promise<IMcpResourceScannerEntry[]>;
}

export class McpResourceScannerService implements IMcpResourceScannerService {
	declare readonly _serviceBrand: undefined;

	async scanWorkspace(): Promise<IMcpResourceScannerEntry[]> {
		// Stub: returns empty array. Full implementation will scan .mcp.json, mcp-config.json, etc.
		return [];
	}

	async scanDirectory(_dirPath: string): Promise<IMcpResourceScannerEntry[]> {
		// Stub: returns empty array
		return [];
	}
}
