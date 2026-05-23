/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Real Vibecode Project. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

/**
 * Authentication MCP Usage Service — Stub Implementation
 *
 * Tracks MCP-specific authentication usage (which MCP servers a user has authenticated with).
 */

import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { Event } from '../../../../platform/event/common/event.js';

export const IAuthenticationMcpUsageService = createDecorator<IAuthenticationMcpUsageService>('authenticationMcpUsageService');

export interface IMcpUsageRecord {
	readonly serverId: string;
	readonly lastUsed: number;
	readonly usageCount: number;
}

export interface IAuthenticationMcpUsageService {
	readonly _serviceBrand: undefined;
	readonly onDidChangeUsage: Event<void>;
	getUsageRecords(): IMcpUsageRecord[];
	recordUsage(serverId: string): void;
}

export class AuthenticationMcpUsageService implements IAuthenticationMcpUsageService {
	declare readonly _serviceBrand: undefined;

	private readonly _onDidChangeUsage = new Emitter<void>();
	readonly onDidChangeUsage = this._onDidChangeUsage.event;

	private readonly _records = new Map<string, IMcpUsageRecord>();

	getUsageRecords(): IMcpUsageRecord[] {
		return Array.from(this._records.values());
	}

	recordUsage(serverId: string): void {
		const existing = this._records.get(serverId);
		this._records.set(serverId, {
			serverId,
			lastUsed: Date.now(),
			usageCount: (existing?.usageCount ?? 0) + 1,
		});
		this._onDidChangeUsage.fire();
	}
}
