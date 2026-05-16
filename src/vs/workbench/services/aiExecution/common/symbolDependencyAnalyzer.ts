/*---------------------------------------------------------------------------------------------
 *  AI Context Engine — Phase 6 Symbol + Dependency Analysis
 *  Real Vibecode — AI-Native IDE
 *
 *  ISymbolDependencyAnalyzer — Incremental symbol intelligence and dependency tracking.
 *  Lightweight parser for TypeScript/JavaScript that extracts symbols and imports
 *  WITHOUT building a full compiler. Leverages regex-based extraction with
 *  confidence scoring.
 *--------------------------------------------------------------------------------------------*/

import { IDisposable } from '../../../../base/common/lifecycle.js';
import { URI } from '../../../../base/common/uri.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { ISymbolContext, SymbolKind, IDependencyEdge, ContextFreshness } from './aiContextService.js';

export const ISymbolDependencyAnalyzer = createDecorator<ISymbolDependencyAnalyzer>('symbolDependencyAnalyzer');

// ─── Analysis Result ───────────────────────────────────────────────────────────

/**
 * Result of analyzing a single file for symbols and dependencies.
 */
export interface IFileAnalysisResult {
	/** File URI that was analyzed */
	readonly uri: URI;
	/** Symbols found in the file */
	readonly symbols: ISymbolContext[];
	/** Dependencies (imports) found in the file */
	readonly dependencies: IDependencyEdge[];
	/** Language detected */
	readonly language: 'typescript' | 'javascript' | 'unknown';
	/** Whether analysis was complete or partial */
	readonly complete: boolean;
	/** Time taken in ms */
	readonly durationMs: number;
}

/**
 * Parameters for file analysis.
 */
export interface IAnalysisParams {
	/** File URI to analyze */
	readonly uri: URI;
	/** File content (if available, avoids file read) */
	readonly content?: string;
	/** Whether to do a deep analysis (includes references) or quick scan */
	readonly deep: boolean;
}

// ─── Language Extensibility ────────────────────────────────────────────────────

/**
 * A language analyzer plugin.
 * New languages can be supported by implementing this interface.
 */
export interface ILanguageAnalyzer {
	/** File extensions this analyzer handles */
	readonly extensions: readonly string[];
	/** Language name */
	readonly language: string;
	/** Analyze a file's content for symbols and dependencies */
	analyze(content: string, uri: URI): { symbols: ISymbolContext[]; dependencies: IDependencyEdge[] };
}

// ─── Service Interface ─────────────────────────────────────────────────────────

/**
 * ISymbolDependencyAnalyzer — Incremental symbol and dependency analysis.
 *
 * NOT a full compiler. Uses lightweight regex-based extraction with
 * confidence scoring. Extensible via ILanguageAnalyzer plugins.
 *
 * Phase 6 implements:
 *   - TypeScript/JavaScript symbol extraction (functions, classes, interfaces, etc.)
 *   - Import/require dependency extraction with confidence scoring
 *   - Language extensibility via plugin analyzers
 *   - Incremental analysis (only re-analyze changed files)
 *   - Background processing queue
 */
export interface ISymbolDependencyAnalyzer {
	readonly _serviceBrand: undefined;

	/**
	 * Analyze a file for symbols and dependencies.
	 * Returns the analysis result.
	 *
	 * @param params Analysis parameters
	 * @returns Analysis result
	 */
	analyzeFile(params: IAnalysisParams): Promise<IFileAnalysisResult>;

	/**
	 * Register a language analyzer plugin.
	 * Extends symbol/dependency analysis to new languages.
	 */
	registerLanguageAnalyzer(analyzer: ILanguageAnalyzer): IDisposable;

	/**
	 * Get the list of supported file extensions.
	 */
	readonly supportedExtensions: readonly string[];

	/**
	 * Check if a file extension is supported.
	 */
	isSupported(extension: string): boolean;
}
