/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Real Vibecode Project. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

/**
 * MCP Gallery Service — Stub Implementation
 */

import { IMcpGalleryService, IMcpGalleryServer } from './mcpManagement.js';
import { Emitter } from '../../../event/common/event.js';

export class McpGalleryService implements IMcpGalleryService {
	declare readonly _serviceBrand: undefined;

	private readonly _onDidUpdateGallery = new Emitter<void>();
	readonly onDidUpdateGallery = this._onDidUpdateGallery.event;

	async query(_query: string): Promise<IMcpGalleryServer[]> {
		// Stub: returns empty gallery results
		return [];
	}

	async getInstalled(): Promise<IMcpGalleryServer[]> {
		// Stub: no installed servers yet
		return [];
	}

	async install(_serverId: string): Promise<void> {
		// Stub: install not yet implemented
		throw new Error('MCP gallery install is not yet implemented');
	}

	async uninstall(_serverId: string): Promise<void> {
		// Stub: uninstall not yet implemented
		throw new Error('MCP gallery uninstall is not yet implemented');
	}
}
