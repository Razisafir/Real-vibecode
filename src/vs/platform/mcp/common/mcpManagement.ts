/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Real Vibecode Project. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

/**
 * MCP Management Service — Stub Implementation
 *
 * Manages MCP server registrations, allowed servers policy, and the MCP gallery.
 * This stub provides the interfaces and DI registration so the workbench can compile.
 */

import { createDecorator } from '../../../instantiation/common/instantiation.js';
import { Event } from '../../../event/common/event.js';

// --- MCP Gallery Service ---

export const IMcpGalleryService = createDecorator<IMcpGalleryService>('mcpGalleryService');

export interface IMcpGalleryServer {
	readonly id: string;
	readonly name: string;
	readonly description: string;
	readonly publisher: string;
	readonly version: string;
	readonly installCount?: number;
	readonly rating?: number;
	readonly tags: readonly string[];
}

export interface IMcpGalleryService {
	readonly _serviceBrand: undefined;
	readonly onDidUpdateGallery: Event<void>;
	query(query: string): Promise<IMcpGalleryServer[]>;
	getInstalled(): Promise<IMcpGalleryServer[]>;
	install(serverId: string): Promise<void>;
	uninstall(serverId: string): Promise<void>;
}

// --- Allowed MCP Servers Service ---

export const IAllowedMcpServersService = createDecorator<IAllowedMcpServersService>('allowedMcpServersService');

export interface IMcpServerPermission {
	readonly serverId: string;
	readonly allowed: boolean;
	readonly scopes: readonly string[];
}

export interface IAllowedMcpServersService {
	readonly _serviceBrand: undefined;
	readonly onDidChangeAllowedServers: Event<void>;
	isAllowed(serverId: string): boolean;
	allow(serverId: string, scopes?: string[]): void;
	disallow(serverId: string): void;
	getAllowedServers(): IMcpServerPermission[];
}
