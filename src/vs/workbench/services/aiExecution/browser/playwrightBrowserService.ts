/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

/**
 * playwrightBrowserService.ts -- Playwright Browser Automation Service
 *
 * Provides browser automation with Playwright integration and fetch-mode fallback.
 * The AI assistant uses this service for web research, documentation lookup,
 * and any task requiring real browser interaction.
 *
 * Two operating modes:
 *   1. Playwright mode (preferred): Full browser automation with JS rendering,
 *      screenshots, click/interact, structured page extraction.
 *   2. Fetch mode (fallback): Basic HTTP fetch with HTML-to-text conversion
 *      when Playwright is not available.
 *
 * Security: Domain blocklist, request size limits, timeout enforcement, URL validation.
 * Playwright is imported lazily -- only attempted when actually needed, with graceful
 * fallback to fetch mode if the import fails.
 */

import { Disposable } from '../../../../base/common/lifecycle.js';
import { Emitter, Event } from '../../../../base/common/event.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';

// =====================================================================
// Service Identifier
// =====================================================================

export const IPlaywrightBrowserService = createDecorator<IPlaywrightBrowserService>('playwrightBrowserService');

// =====================================================================
// Public Types
// =====================================================================

/**
 * Represents a fetched/loaded web page with structured content.
 */
export interface BrowserPage {
        readonly url: string;
        readonly title: string;
        readonly textContent: string;
        readonly html?: string;
        readonly links: { href: string; text: string }[];
        readonly metadata: Record<string, string>;
        readonly screenshot?: Uint8Array; // Only available in Playwright mode
        readonly mode: 'playwright' | 'fetch';
}

/**
 * Result of a browse operation.
 */
export interface BrowseResult {
        readonly success: boolean;
        readonly page?: BrowserPage;
        readonly error?: string;
        readonly mode: 'playwright' | 'fetch';
        readonly latencyMs: number;
}

/**
 * Options for browse operations.
 */
export interface BrowseOptions {
        /** CSS selector to wait for before extracting content (Playwright only) */
        readonly waitForSelector?: string;
        /** Page load timeout in milliseconds (default: 30000) */
        readonly timeout?: number;
        /** Whether to capture a screenshot (default: false) */
        readonly takeScreenshot?: boolean;
        /** Whether to extract links from the page (default: true) */
        readonly extractLinks?: boolean;
        /** Whether to enable JavaScript (default: true; Playwright only — fetch always false) */
        readonly javascript?: boolean;
        /** Custom User-Agent string */
        readonly userAgent?: string;
        /** Whether to include raw HTML in the result (default: false) */
        readonly includeHtml?: boolean;
}

/**
 * Search engine configuration.
 */
export interface SearchEngineConfig {
        readonly name: string;
        readonly searchUrl: string;   // URL template with {query} placeholder
        readonly resultSelector?: string; // CSS selector for search result links (Playwright only)
}

// =====================================================================
// Security Constants
// =====================================================================

/** Maximum response size in bytes (5 MB) */
const MAX_RESPONSE_SIZE_BYTES = 5 * 1024 * 1024;

/** Default page load timeout in milliseconds */
const DEFAULT_TIMEOUT_MS = 30_000;

/** Default search timeout */
const DEFAULT_SEARCH_TIMEOUT_MS = 20_000;

/** Domain blocklist — known malicious / unwanted domains */
const DOMAIN_BLOCKLIST = new Set([
        // Malware / phishing sinks
        'malware-domain.com',
        'phishing-site.net',
        '恶意网站.cn',
        // Ad / tracker heavy domains that return garbage to automated agents
        'ad.doubleclick.net',
        'tracker.example.com',
        // Intentionally block localhost / internal to prevent SSRF
        'localhost',
        '127.0.0.1',
        '0.0.0.0',
        '::1',
]);

/** Blocklist of TLDs commonly associated with abuse */
const BLOCKED_TLDS = new Set([
        '.xyz',
        '.top',
        '.gq',
        '.ml',
        '.cf',
        '.tk',
]);

// =====================================================================
// Built-in Search Engine Configurations
// =====================================================================

const SEARCH_ENGINES: SearchEngineConfig[] = [
        {
                name: 'DuckDuckGo',
                searchUrl: 'https://html.duckduckgo.com/html/?q={query}',
                resultSelector: '.result__a',
        },
        {
                name: 'Google',
                searchUrl: 'https://www.google.com/search?q={query}&hl=en',
                resultSelector: 'div.g a[href]',
        },
];

const DEFAULT_SEARCH_ENGINE = SEARCH_ENGINES[0]; // DuckDuckGo — works well without JS

// =====================================================================
// Service Interface
// =====================================================================

/**
 * IPlaywrightBrowserService -- Browser automation with Playwright + fetch fallback.
 *
 * REAL responsibilities:
 *   - Browse to URLs and extract structured page content
 *   - Search the web via search engines
 *   - Extract article-style content from pages
 *   - Automatically choose Playwright or fetch mode
 *   - Enforce security policies (blocklist, size limits, timeout, URL validation)
 *
 * HONEST: Playwright mode requires the `playwright` npm package installed
 * and a compatible browser binary. If unavailable, fetch mode is used
 * which cannot render JavaScript or take screenshots.
 */
export interface IPlaywrightBrowserService {
        readonly _serviceBrand: undefined;

        /** Navigate to a URL and return structured page content */
        browseTo(url: string, options?: BrowseOptions): Promise<BrowseResult>;

        /** Search the web using a search engine, return results for top hits */
        searchWeb(query: string): Promise<BrowseResult[]>;

        /** Extract main content from a page (article-style, removing nav/footer/etc.) */
        extractContent(url: string): Promise<BrowseResult>;

        /** Check whether Playwright is available in the current environment */
        isPlaywrightAvailable(): Promise<boolean>;

        /** Get the current operating mode */
        getCurrentMode(): 'playwright' | 'fetch';

        /** Event fired when the operating mode changes (e.g. Playwright becomes available) */
        readonly onDidChangeMode: Event<'playwright' | 'fetch'>;

        /** Event fired when a browse operation completes */
        readonly onDidBrowse: Event<BrowseResult>;

        /** Event fired when a security block occurs */
        readonly onDidBlockRequest: Event<{ url: string; reason: string }>;
}

// =====================================================================
// Lazy Playwright Type Declarations
// =====================================================================

/**
 * Minimal type declarations for Playwright APIs we use.
 * These allow us to reference Playwright types without importing the package
 * at module-load time. The actual import happens lazily.
 */
interface IPlaywrightBrowser {
        newPage(): Promise<IPlaywrightPage>;
        close(): Promise<void>;
}

interface IPlaywrightPage {
        goto(url: string, options?: { timeout?: number; waitUntil?: string }): Promise<IPlaywrightResponse | null>;
        waitForSelector(selector: string, options?: { timeout?: number }): Promise<IPlaywrightElementHandle | null>;
        content(): Promise<string>;
        title(): Promise<string>;
        url(): string;
        screenshot(options?: { type?: string; fullPage?: boolean }): Promise<Buffer>;
        evaluate<R>(fn: () => R): Promise<R>;
        close(): Promise<void>;
        setExtraHTTPHeaders(headers: Record<string, string>): Promise<void>;
        setUserAgent(userAgent: string): Promise<void>;
        setDefaultTimeout(timeout: number): void;
        click(selector: string): Promise<void>;
        type(selector: string, text: string): Promise<void>;
}

interface IPlaywrightElementHandle {
        getAttribute(name: string): Promise<string | null>;
        textContent(): Promise<string | null>;
}

interface IPlaywrightResponse {
        status(): number;
        url(): string;
}

interface IPlaywrightBrowserType {
        launch(options?: {
                headless?: boolean;
                args?: string[];
                timeout?: number;
        }): Promise<IPlaywrightBrowser>;
}

interface IPlaywrightModule {
        chromium: IPlaywrightBrowserType;
        firefox: IPlaywrightBrowserType;
        webkit: IPlaywrightBrowserType;
}

// =====================================================================
// Implementation
// =====================================================================

export class PlaywrightBrowserService extends Disposable implements IPlaywrightBrowserService {
        declare readonly _serviceBrand: undefined;

        // ─── State ─────────────────────────────────────────────────────────────

        private _playwrightModule: IPlaywrightModule | null = null;
        private _browser: IPlaywrightBrowser | null = null;
        private _playwrightAvailable: boolean | null = null; // null = not yet checked
        private _currentMode: 'playwright' | 'fetch' = 'fetch';

        // ─── Events ────────────────────────────────────────────────────────────

        private readonly _onDidChangeMode = this._register(new Emitter<'playwright' | 'fetch'>());
        readonly onDidChangeMode: Event<'playwright' | 'fetch'> = this._onDidChangeMode.event;

        private readonly _onDidBrowse = this._register(new Emitter<BrowseResult>());
        readonly onDidBrowse: Event<BrowseResult> = this._onDidBrowse.event;

        private readonly _onDidBlockRequest = this._register(new Emitter<{ url: string; reason: string }>());
        readonly onDidBlockRequest: Event<{ url: string; reason: string }> = this._onDidBlockRequest.event;

        // ─── Constructor ────────────────────────────────────────────────────────

        constructor(
                @ILogService private readonly logService: ILogService,
        ) {
                super();
                this.logService.info('[PlaywrightBrowser] Service initialized (mode: fetch — Playwright check deferred to first use)');
        }

        // ─── Public API ────────────────────────────────────────────────────────

        getCurrentMode(): 'playwright' | 'fetch' {
                return this._currentMode;
        }

        async isPlaywrightAvailable(): Promise<boolean> {
                if (this._playwrightAvailable !== null) {
                        return this._playwrightAvailable;
                }

                try {
                        this.logService.info('[PlaywrightBrowser] Checking Playwright availability...');

                        // Lazy import — only attempt when needed
                        const pw = await this.tryImportPlaywright();
                        if (pw) {
                                // Try actually launching to verify browser binaries are installed
                                const browser = await pw.chromium.launch({
                                        headless: true,
                                        timeout: 10_000,
                                        args: ['--no-sandbox', '--disable-setuid-sandbox'],
                                });
                                await browser.close();

                                this._playwrightModule = pw;
                                this._playwrightAvailable = true;
                                this._currentMode = 'playwright';
                                this._onDidChangeMode.fire('playwright');
                                this.logService.info('[PlaywrightBrowser] Playwright is available — using playwright mode');
                        } else {
                                this._playwrightAvailable = false;
                                this._currentMode = 'fetch';
                                this.logService.info('[PlaywrightBrowser] Playwright not available — using fetch mode');
                        }
                } catch (error: any) {
                        this._playwrightAvailable = false;
                        this._currentMode = 'fetch';
                        this.logService.info(`[PlaywrightBrowser] Playwright not available (${error?.message || 'unknown error'}) — using fetch mode`);
                }

                return this._playwrightAvailable;
        }

        async browseTo(url: string, options?: BrowseOptions): Promise<BrowseResult> {
                const startTime = Date.now();

                // Security: validate URL
                const validationError = this.validateUrl(url);
                if (validationError) {
                        this._onDidBlockRequest.fire({ url, reason: validationError });
                        return {
                                success: false,
                                error: `Security: ${validationError}`,
                                mode: 'fetch',
                                latencyMs: Date.now() - startTime,
                        };
                }

                // Ensure availability has been checked
                await this.isPlaywrightAvailable();

                if (this._currentMode === 'playwright' && this._playwrightModule) {
                        const result = await this.browseWithPlaywright(url, options, startTime);
                        this._onDidBrowse.fire(result);
                        return result;
                }

                const result = await this.browseWithFetch(url, options, startTime);
                this._onDidBrowse.fire(result);
                return result;
        }

        async searchWeb(query: string): Promise<BrowseResult[]> {
                const results: BrowseResult[] = [];
                const searchUrl = DEFAULT_SEARCH_ENGINE.searchUrl.replace('{query}', encodeURIComponent(query));

                this.logService.info(`[PlaywrightBrowser] Searching: "${query}" via ${DEFAULT_SEARCH_ENGINE.name}`);

                // Browse to search page
                const searchResult = await this.browseTo(searchUrl, {
                        timeout: DEFAULT_SEARCH_TIMEOUT_MS,
                        extractLinks: true,
                        javascript: true,
                });

                if (!searchResult.success || !searchResult.page) {
                        return [searchResult];
                }

                // Extract search result URLs from the page
                const searchLinks = searchResult.page.links.filter(link => {
                        // Filter out navigation / internal links
                        if (!link.href.startsWith('http')) { return false; }
                        if (link.href.includes('duckduckgo.com')) { return false; }
                        if (link.href.includes('google.com')) { return false; }
                        if (link.href.includes('bing.com')) { return false; }
                        if (link.text.trim().length === 0) { return false; }
                        return true;
                }).slice(0, 5); // Top 5 results

                results.push(searchResult);

                // Fetch content from the top results
                for (const link of searchLinks) {
                        try {
                                const pageResult = await this.browseTo(link.href, {
                                        timeout: 15_000,
                                        extractLinks: false,
                                });
                                results.push(pageResult);

                                // Respect servers — delay between requests
                                await new Promise(resolve => setTimeout(resolve, 500));
                        } catch {
                                // Skip results that fail to load
                        }
                }

                return results;
        }

        async extractContent(url: string): Promise<BrowseResult> {
                return this.browseTo(url, {
                        timeout: DEFAULT_TIMEOUT_MS,
                        extractLinks: false,
                        takeScreenshot: false,
                        includeHtml: false,
                });
        }

        // ─── Lifecycle ─────────────────────────────────────────────────────────

        override dispose(): void {
                this.closeBrowser();
                super.dispose();
        }

        // =====================================================================
        // Playwright Mode Implementation
        // =====================================================================

        private async browseWithPlaywright(
                url: string,
                options: BrowseOptions | undefined,
                startTime: number,
        ): Promise<BrowseResult> {
                const timeout = options?.timeout ?? DEFAULT_TIMEOUT_MS;
                const takeScreenshot = options?.takeScreenshot ?? false;
                const extractLinks = options?.extractLinks ?? true;
                const javascript = options?.javascript ?? true;
                const waitForSelector = options?.waitForSelector;
                const includeHtml = options?.includeHtml ?? false;

                try {
                        const browser = await this.getOrCreateBrowser();
                        if (!browser) {
                                // Failed to get browser — fall back to fetch
                                this.logService.warn('[PlaywrightBrowser] Could not launch Playwright browser, falling back to fetch');
                                return this.browseWithFetch(url, options, startTime);
                        }

                        const page = await browser.newPage();

                        try {
                                // Configure page
                                page.setDefaultTimeout(timeout);

                                if (options?.userAgent) {
                                        await page.setUserAgent(options.userAgent);
                                }

                                // Navigate
                                const response = await page.goto(url, {
                                        timeout,
                                        waitUntil: javascript ? 'domcontentloaded' : 'commit',
                                });

                                if (response && response.status() >= 400) {
                                        await page.close();
                                        return {
                                                success: false,
                                                error: `HTTP ${response.status()}`,
                                                mode: 'playwright',
                                                latencyMs: Date.now() - startTime,
                                        };
                                }

                                // Wait for specific selector if requested
                                if (waitForSelector) {
                                        await page.waitForSelector(waitForSelector, { timeout }).catch(() => {
                                                this.logService.warn(`[PlaywrightBrowser] waitForSelector "${waitForSelector}" timed out`);
                                        });
                                } else if (javascript) {
                                        // Give SPAs a moment to render
                                        await new Promise(resolve => setTimeout(resolve, 1000));
                                }

                                // Extract structured data using page.evaluate
                                const extracted = await page.evaluate(() => {
                                        // Extract metadata
                                        const metadata: Record<string, string> = {};
                                        const metaTags = document.querySelectorAll('meta');
                                        for (let i = 0; i < metaTags.length; i++) {
                                                const tag = metaTags[i];
                                                const name = tag.getAttribute('name') || tag.getAttribute('property') || '';
                                                const content = tag.getAttribute('content') || '';
                                                if (name && content) {
                                                        metadata[name] = content;
                                                }
                                        }

                                        // Extract links
                                        const links: { href: string; text: string }[] = [];
                                        const anchorElements = document.querySelectorAll('a[href]');
                                        for (let i = 0; i < anchorElements.length; i++) {
                                                const a = anchorElements[i];
                                                const href = a.getAttribute('href') || '';
                                                const text = (a.textContent || '').trim().slice(0, 200);
                                                if (href) {
                                                        links.push({ href, text });
                                                }
                                        }

                                        // Extract main content — try article/main semantic elements first
                                        const articleEl = document.querySelector('article') ||
                                                document.querySelector('[role="main"]') ||
                                                document.querySelector('main') ||
                                                document.querySelector('.post-content') ||
                                                document.querySelector('.article-body') ||
                                                document.querySelector('#content');

                                        const textContent = articleEl
                                                ? (articleEl.textContent || '').replace(/\s+/g, ' ').trim()
                                                : (document.body.textContent || '').replace(/\s+/g, ' ').trim();

                                        return { metadata, links, textContent };
                                });

                                // Get title and URL (may have redirected)
                                const title = await page.title();
                                const finalUrl = page.url();

                                // Screenshot
                                let screenshot: Uint8Array | undefined;
                                if (takeScreenshot) {
                                        try {
                                                const buffer = await page.screenshot({ type: 'png', fullPage: false });
                                                screenshot = new Uint8Array(buffer);
                                        } catch (err: any) {
                                                this.logService.warn(`[PlaywrightBrowser] Screenshot failed: ${err?.message}`);
                                        }
                                }

                                // Raw HTML (only if requested — can be large)
                                let html: string | undefined;
                                if (includeHtml) {
                                        try {
                                                html = await page.content();
                                                // Enforce size limit
                                                if (html.length > MAX_RESPONSE_SIZE_BYTES) {
                                                        html = html.slice(0, MAX_RESPONSE_SIZE_BYTES) + '\n<!-- TRUNCATED: exceeded size limit -->';
                                                }
                                        } catch {
                                                html = undefined;
                                        }
                                }

                                const latencyMs = Date.now() - startTime;

                                const browserPage: BrowserPage = {
                                        url: finalUrl,
                                        title,
                                        textContent: extracted.textContent,
                                        html,
                                        links: extractLinks ? extracted.links : [],
                                        metadata: extracted.metadata,
                                        screenshot,
                                        mode: 'playwright',
                                };

                                this.logService.info(`[PlaywrightBrowser] browseTo "${url}" completed in ${latencyMs}ms (playwright mode)`);

                                return {
                                        success: true,
                                        page: browserPage,
                                        mode: 'playwright',
                                        latencyMs,
                                };
                        } finally {
                                await page.close();
                        }
                } catch (error: any) {
                        const latencyMs = Date.now() - startTime;
                        const errorMsg = error?.message || String(error);

                        this.logService.error(`[PlaywrightBrowser] browseTo "${url}" failed: ${errorMsg}`);

                        // If Playwright fails, attempt fetch fallback
                        this.logService.info('[PlaywrightBrowser] Attempting fetch fallback...');
                        return this.browseWithFetch(url, options, startTime);
                }
        }

        private async getOrCreateBrowser(): Promise<IPlaywrightBrowser | null> {
                if (this._browser) {
                        try {
                                // Quick health check — create a test page
                                const testPage = await this._browser.newPage();
                                await testPage.close();
                                return this._browser;
                        } catch {
                                // Browser is dead — recreate
                                this._browser = null;
                        }
                }

                if (!this._playwrightModule) {
                        return null;
                }

                try {
                        this._browser = await this._playwrightModule.chromium.launch({
                                headless: true,
                                timeout: 15_000,
                                args: [
                                        '--no-sandbox',
                                        '--disable-setuid-sandbox',
                                        '--disable-dev-shm-usage',
                                        '--disable-gpu',
                                        '--disable-extensions',
                                        '--disable-background-networking',
                                        '--disable-sync',
                                        '--no-first-run',
                                        '--no-default-browser-check',
                                ],
                        });

                        this.logService.info('[PlaywrightBrowser] Chromium browser launched (headless)');
                        return this._browser;
                } catch (error: any) {
                        this.logService.error(`[PlaywrightBrowser] Failed to launch browser: ${error?.message}`);
                        this._browser = null;
                        return null;
                }
        }

        private closeBrowser(): void {
                if (this._browser) {
                        this._browser.close().catch(() => { /* best effort */ });
                        this._browser = null;
                }
        }

        // =====================================================================
        // Fetch Mode Implementation
        // =====================================================================

        private async browseWithFetch(
                url: string,
                options: BrowseOptions | undefined,
                startTime: number,
        ): Promise<BrowseResult> {
                const timeout = options?.timeout ?? DEFAULT_TIMEOUT_MS;
                const extractLinks = options?.extractLinks ?? true;
                const includeHtml = options?.includeHtml ?? false;

                try {
                        const controller = new AbortController();
                        const timeoutId = setTimeout(() => controller.abort(), timeout);

                        const headers: Record<string, string> = {
                                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                                'Accept-Language': 'en-US,en;q=0.5',
                        };

                        if (options?.userAgent) {
                                headers['User-Agent'] = options.userAgent;
                        }

                        const response = await fetch(url, {
                                method: 'GET',
                                headers,
                                signal: controller.signal,
                                redirect: 'follow',
                        });

                        clearTimeout(timeoutId);

                        if (!response.ok) {
                                return {
                                        success: false,
                                        error: `HTTP ${response.status} ${response.statusText}`,
                                        mode: 'fetch',
                                        latencyMs: Date.now() - startTime,
                                };
                        }

                        // Enforce response size limit
                        const contentLength = response.headers.get('content-length');
                        if (contentLength && parseInt(contentLength, 10) > MAX_RESPONSE_SIZE_BYTES) {
                                return {
                                        success: false,
                                        error: `Response too large: ${contentLength} bytes (limit: ${MAX_RESPONSE_SIZE_BYTES})`,
                                        mode: 'fetch',
                                        latencyMs: Date.now() - startTime,
                                };
                        }

                        const html = await response.text();

                        // Enforce size limit on actual content
                        if (html.length > MAX_RESPONSE_SIZE_BYTES) {
                                return {
                                        success: false,
                                        error: `Response body too large: ${html.length} bytes (limit: ${MAX_RESPONSE_SIZE_BYTES})`,
                                        mode: 'fetch',
                                        latencyMs: Date.now() - startTime,
                                };
                        }

                        const finalUrl = response.url || url;
                        const title = this.extractTitle(html);
                        const textContent = this.htmlToText(html);
                        const metadata = this.extractMetadata(html);
                        const links = extractLinks ? this.extractLinks(html, finalUrl) : [];

                        const browserPage: BrowserPage = {
                                url: finalUrl,
                                title,
                                textContent,
                                html: includeHtml ? html : undefined,
                                links,
                                metadata,
                                mode: 'fetch',
                        };

                        const latencyMs = Date.now() - startTime;

                        this.logService.info(`[PlaywrightBrowser] browseTo "${url}" completed in ${latencyMs}ms (fetch mode, ${html.length} bytes)`);

                        return {
                                success: true,
                                page: browserPage,
                                mode: 'fetch',
                                latencyMs,
                        };
                } catch (error: any) {
                        const latencyMs = Date.now() - startTime;
                        const errorMsg = error?.name === 'AbortError'
                                ? `Request timed out after ${timeout}ms`
                                : (error?.message || String(error));

                        this.logService.error(`[PlaywrightBrowser] fetch "${url}" failed: ${errorMsg}`);

                        return {
                                success: false,
                                error: errorMsg,
                                mode: 'fetch',
                                latencyMs,
                        };
                }
        }

        // =====================================================================
        // HTML Parsing Utilities (for fetch mode — no DOM dependency)
        // =====================================================================

        /**
         * Extract the <title> content from HTML.
         */
        private extractTitle(html: string): string {
                const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
                if (!match) { return ''; }
                return this.decodeHtmlEntities(match[1].trim());
        }

        /**
         * Convert HTML to plain text by stripping tags and normalizing whitespace.
         * Tries to preserve some structure by inserting newlines for block elements.
         */
        private htmlToText(html: string): string {
                let text = html;

                // Remove script and style blocks entirely
                text = text.replace(/<script[\s\S]*?<\/script>/gi, '');
                text = text.replace(/<style[\s\S]*?<\/style>/gi, '');
                text = text.replace(/<noscript[\s\S]*?<\/noscript>/gi, '');

                // Remove SVG
                text = text.replace(/<svg[\s\S]*?<\/svg>/gi, '');

                // Insert newlines for block-level elements
                text = text.replace(/<\/?(p|div|br|h[1-6]|li|tr|hr|blockquote|section|article|header|footer|nav|aside|main|figure|figcaption|details|summary)[^>]*>/gi, '\n');

                // Remove remaining tags
                text = text.replace(/<[^>]+>/g, '');

                // Decode common HTML entities
                text = this.decodeHtmlEntities(text);

                // Normalize whitespace
                text = text.replace(/[ \t]+/g, ' ');
                text = text.replace(/\n\s*\n\s*\n/g, '\n\n'); // collapse excessive blank lines
                text = text.trim();

                // Truncate if absurdly long (some pages have megabytes of text)
                const MAX_TEXT_LENGTH = 100_000;
                if (text.length > MAX_TEXT_LENGTH) {
                        text = text.slice(0, MAX_TEXT_LENGTH) + '\n\n[... content truncated ...]';
                }

                return text;
        }

        /**
         * Decode common HTML entities to their character equivalents.
         */
        private decodeHtmlEntities(text: string): string {
                return text
                        .replace(/&amp;/g, '&')
                        .replace(/&lt;/g, '<')
                        .replace(/&gt;/g, '>')
                        .replace(/&quot;/g, '"')
                        .replace(/&#39;/g, "'")
                        .replace(/&apos;/g, "'")
                        .replace(/&nbsp;/g, ' ')
                        .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code, 10)))
                        .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
        }

        /**
         * Extract <meta> tags as a key-value map.
         */
        private extractMetadata(html: string): Record<string, string> {
                const metadata: Record<string, string> = {};

                // Match <meta name="..." content="..."> and <meta property="..." content="...">
                const metaRegex = /<meta\s+[^>]*?(?:name|property)=["']([^"']+)["'][^>]*?content=["']([^"']*?)["'][^>]*?\/?>/gi;
                let match: RegExpExecArray | null;
                while ((match = metaRegex.exec(html)) !== null) {
                        metadata[match[1]] = this.decodeHtmlEntities(match[2]);
                }

                // Also match <meta content="..." name="..."> (reversed attribute order)
                const metaReversedRegex = /<meta\s+[^>]*?content=["']([^"']*?)["'][^>]*?(?:name|property)=["']([^"']+)["'][^>]*?\/?>/gi;
                while ((match = metaReversedRegex.exec(html)) !== null) {
                        metadata[match[2]] = this.decodeHtmlEntities(match[1]);
                }

                // Charset
                const charsetMatch = html.match(/<meta[^>]*?charset=["']?([^"'\s>]+)/i);
                if (charsetMatch) {
                        metadata['charset'] = charsetMatch[1];
                }

                return metadata;
        }

        /**
         * Extract links from HTML, resolving relative URLs against the base URL.
         */
        private extractLinks(html: string, baseUrl: string): { href: string; text: string }[] {
                const links: { href: string; text: string }[] = [];
                const linkRegex = /<a\s+[^>]*?href=["']([^"']*?)["'][^>]*?>([\s\S]*?)<\/a>/gi;
                let match: RegExpExecArray | null;

                while ((match = linkRegex.exec(html)) !== null) {
                        const rawHref = match[1];
                        const rawText = match[2].replace(/<[^>]+>/g, '').trim().slice(0, 200);

                        if (!rawHref || rawHref.startsWith('#') || rawHref.startsWith('javascript:')) {
                                continue;
                        }

                        const href = this.resolveUrl(rawHref, baseUrl);
                        links.push({ href, text: this.decodeHtmlEntities(rawText) });
                }

                return links;
        }

        /**
         * Resolve a potentially relative URL against a base URL.
         */
        private resolveUrl(rawHref: string, baseUrl: string): string {
                try {
                        return new URL(rawHref, baseUrl).href;
                } catch {
                        return rawHref; // Return as-is if URL is unparseable
                }
        }

        // =====================================================================
        // Security
        // =====================================================================

        /**
         * Validate a URL for security. Returns an error string if blocked, or null if OK.
         */
        private validateUrl(url: string): string | null {
                // Must be a valid URL
                let parsed: URL;
                try {
                        parsed = new URL(url);
                } catch {
                        return `Invalid URL: ${url}`;
                }

                // Only http and https are allowed
                if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
                        return `Disallowed protocol: ${parsed.protocol} (only http: and https: are permitted)`;
                }

                const hostname = parsed.hostname.toLowerCase();

                // Check domain blocklist
                if (DOMAIN_BLOCKLIST.has(hostname)) {
                        return `Blocked domain: ${hostname}`;
                }

                // Check for blocked TLDs
                for (const tld of BLOCKED_TLDS) {
                        if (hostname.endsWith(tld)) {
                                return `Blocked TLD: ${tld} (hostname: ${hostname})`;
                        }
                }

                // Block internal / private IPs to prevent SSRF
                if (this.isPrivateIP(hostname)) {
                        return `Private/internal IP address not allowed: ${hostname}`;
                }

                return null;
        }

        /**
         * Check if a hostname is a private/internal IP address.
         */
        private isPrivateIP(hostname: string): boolean {
                // IPv4 private ranges
                if (/^10\./.test(hostname)) { return true; }
                if (/^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(hostname)) { return true; }
                if (/^192\.168\./.test(hostname)) { return true; }
                if (/^169\.254\./.test(hostname)) { return true; } // link-local
                if (/^0\./.test(hostname)) { return true; }

                // IPv6 loopback / private
                if (hostname === '::1' || hostname.startsWith('fc') || hostname.startsWith('fd')) { return true; }

                // localhost variants
                if (hostname === 'localhost' || hostname.endsWith('.localhost')) { return true; }
                if (hostname === '127.0.0.1' || /^127\./.test(hostname)) { return true; }

                return false;
        }

        // =====================================================================
        // Lazy Playwright Import
        // =====================================================================

        /**
         * Attempt to dynamically import Playwright.
         * Returns null if the module is not available.
         */
        private async tryImportPlaywright(): Promise<IPlaywrightModule | null> {
                try {
                        // Dynamic import — will fail if playwright is not installed
                        const pw = await import('playwright');
                        return pw as IPlaywrightModule;
                } catch {
                        // Playwright not available — this is expected in many environments
                        return null;
                }
        }
}
