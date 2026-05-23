/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Real Vibecode Project. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

/**
 * Allowed MCP Servers Service — Stub Implementation
 */

import { IAllowedMcpServersService, IMcpServerPermission } from './mcpManagement.js';
import { Emitter } from '../../../event/common/event.js';

export class AllowedMcpServersService implements IAllowedMcpServersService {
	declare readonly _serviceBrand: undefined;

	private readonly _onDidChangeAllowedServers = new Emitter<void>();
	readonly onDidChangeAllowedServers = this._onDidChangeAllowedServers.event;

	private readonly _allowedServers = new Map<string, IMcpServerPermission>();

	isAllowed(serverId: string): boolean {
		return this._allowedServers.has(serverId) && this._allowedServers.get(serverId)!.allowed;
	}

	allow(serverId: string, scopes: string[] = []): void {
		this._allowedServers.set(serverId, { serverId, allowed: true, scopes });
		this._onDidChangeAllowedServers.fire();
	}

	disallow(serverId: string): void {
		this._allowedServers.delete(serverId);
		this._onDidChangeAllowedServers.fire();
	}

	getAllowedServers(): IMcpServerPermission[] {
		return Array.from(this._allowedServers.values());
	}
}
