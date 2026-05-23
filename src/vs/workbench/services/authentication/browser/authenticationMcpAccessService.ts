/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Real Vibecode Project. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

/**
 * Authentication MCP Access Service — Stub Implementation
 *
 * Manages access control for MCP server authentication sessions.
 */

import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { Event } from '../../../../platform/event/common/event.js';

export const IAuthenticationMcpAccessService = createDecorator<IAuthenticationMcpAccessService>('authenticationMcpAccessService');

export interface IMcpAccessEntry {
	readonly serverId: string;
	readonly accountId: string;
	readonly scopes: readonly string[];
	readonly grantedAt: number;
}

export interface IAuthenticationMcpAccessService {
	readonly _serviceBrand: undefined;
	readonly onDidChangeAccess: Event<void>;
	hasAccess(serverId: string, accountId: string): boolean;
	grantAccess(serverId: string, accountId: string, scopes: string[]): void;
	revokeAccess(serverId: string, accountId: string): void;
	getAccessEntries(): IMcpAccessEntry[];
}

export class AuthenticationMcpAccessService implements IAuthenticationMcpAccessService {
	declare readonly _serviceBrand: undefined;

	private readonly _onDidChangeAccess = new Emitter<void>();
	readonly onDidChangeAccess = this._onDidChangeAccess.event;

	private readonly _accessEntries = new Map<string, IMcpAccessEntry>();

	hasAccess(serverId: string, accountId: string): boolean {
		return this._accessEntries.has(`${serverId}:${accountId}`);
	}

	grantAccess(serverId: string, accountId: string, scopes: string[]): void {
		this._accessEntries.set(`${serverId}:${accountId}`, {
			serverId,
			accountId,
			scopes,
			grantedAt: Date.now(),
		});
		this._onDidChangeAccess.fire();
	}

	revokeAccess(serverId: string, accountId: string): void {
		this._accessEntries.delete(`${serverId}:${accountId}`);
		this._onDidChangeAccess.fire();
	}

	getAccessEntries(): IMcpAccessEntry[] {
		return Array.from(this._accessEntries.values());
	}
}
