/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Real Vibecode Project. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

/**
 * Authentication MCP Service — Stub Implementation
 *
 * Manages authentication sessions for MCP servers.
 */

import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { Event } from '../../../../platform/event/common/event.js';

export const IAuthenticationMcpService = createDecorator<IAuthenticationMcpService>('authenticationMcpService');

export interface IMcpAuthenticationSession {
	readonly id: string;
	readonly serverId: string;
	readonly accessToken: string;
	readonly scopes: readonly string[];
	readonly createdAt: number;
	readonly expiresAt?: number;
}

export interface IAuthenticationMcpService {
	readonly _serviceBrand: undefined;
	readonly onDidChangeSessions: Event<string>;
	getSessions(serverId: string): Promise<IMcpAuthenticationSession[]>;
	createSession(serverId: string, scopes: string[]): Promise<IMcpAuthenticationSession>;
	removeSession(serverId: string, sessionId: string): Promise<void>;
}

export class AuthenticationMcpService implements IAuthenticationMcpService {
	declare readonly _serviceBrand: undefined;

	private readonly _onDidChangeSessions = new Emitter<string>();
	readonly onDidChangeSessions = this._onDidChangeSessions.event;

	private readonly _sessions = new Map<string, IMcpAuthenticationSession[]>();

	async getSessions(serverId: string): Promise<IMcpAuthenticationSession[]> {
		return this._sessions.get(serverId) ?? [];
	}

	async createSession(serverId: string, scopes: string[]): Promise<IMcpAuthenticationSession> {
		const session: IMcpAuthenticationSession = {
			id: `mcp-session-${Date.now()}`,
			serverId,
			accessToken: `mcp-token-${Date.now()}`,
			scopes,
			createdAt: Date.now(),
		};
		const existing = this._sessions.get(serverId) ?? [];
		this._sessions.set(serverId, [...existing, session]);
		this._onDidChangeSessions.fire(serverId);
		return session;
	}

	async removeSession(serverId: string, sessionId: string): Promise<void> {
		const sessions = this._sessions.get(serverId);
		if (sessions) {
			this._sessions.set(serverId, sessions.filter(s => s.id !== sessionId));
			this._onDidChangeSessions.fire(serverId);
		}
	}
}
