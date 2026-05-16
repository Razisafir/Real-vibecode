/*---------------------------------------------------------------------------------------------
 *  AI Context Engine — Phase 6 Symbol + Dependency Analysis
 *  Real Vibecode — AI-Native IDE
 *
 *  SymbolDependencyAnalyzer — Concrete implementation.
 *  TypeScript/JavaScript regex-based symbol and import extraction.
 *  NOT a compiler — lightweight pattern matching with confidence scoring.
 *--------------------------------------------------------------------------------------------*/

import { Disposable, IDisposable, toDisposable } from '../../../../base/common/lifecycle.js';
import { URI } from '../../../../base/common/uri.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { ITextFileService } from '../../textfile/common/textfiles.js';
import {
	ISymbolDependencyAnalyzer, IFileAnalysisResult, IAnalysisParams, ILanguageAnalyzer,
} from '../common/symbolDependencyAnalyzer.js';
import { ISymbolContext, SymbolKind, IDependencyEdge, ContextFreshness } from '../common/aiContextService.js';

// ─── Built-in TS/JS Analyzer ───────────────────────────────────────────────────

class TypeScriptJavaScriptAnalyzer implements ILanguageAnalyzer {
	readonly extensions = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'];
	readonly language = 'typescript';

	analyze(content: string, uri: URI): { symbols: ISymbolContext[]; dependencies: IDependencyEdge[] } {
		const symbols = this._extractSymbols(content, uri);
		const dependencies = this._extractDependencies(content, uri);
		return { symbols, dependencies };
	}

	private _extractSymbols(content: string, uri: URI): ISymbolContext[] {
		const symbols: ISymbolContext[] = [];
		const lines = content.split('\n');

		for (let i = 0; i < lines.length && symbols.length < 200; i++) {
			const line = lines[i];
			const lineNum = i + 1;

			// Export/function declarations
			let match: RegExpExecArray | null;

			// export function foo(
			const funcRe = /(?:export\s+)?(?:async\s+)?function\s+(\w+)/g;
			while ((match = funcRe.exec(line)) !== null) {
				symbols.push({
					name: match[1],
					kind: SymbolKind.Function,
					definedIn: uri,
					line: lineNum,
					referencedBy: [],
					isExported: line.includes('export'),
					freshness: ContextFreshness.Live,
				});
			}

			// export class Foo
			const classRe = /(?:export\s+)?class\s+(\w+)/g;
			while ((match = classRe.exec(line)) !== null) {
				symbols.push({
					name: match[1],
					kind: SymbolKind.Class,
					definedIn: uri,
					line: lineNum,
					referencedBy: [],
					isExported: line.includes('export'),
					freshness: ContextFreshness.Live,
				});
			}

			// export interface Foo
			const ifaceRe = /(?:export\s+)?interface\s+(\w+)/g;
			while ((match = ifaceRe.exec(line)) !== null) {
				symbols.push({
					name: match[1],
					kind: SymbolKind.Interface,
					definedIn: uri,
					line: lineNum,
					referencedBy: [],
					isExported: line.includes('export'),
					freshness: ContextFreshness.Live,
				});
			}

			// export type Foo
			const typeRe = /(?:export\s+)?type\s+(\w+)\s*[=<]/g;
			while ((match = typeRe.exec(line)) !== null) {
				symbols.push({
					name: match[1],
					kind: SymbolKind.Type,
					definedIn: uri,
					line: lineNum,
					referencedBy: [],
					isExported: line.includes('export'),
					freshness: ContextFreshness.Live,
				});
			}

			// export enum Foo
			const enumRe = /(?:export\s+)?enum\s+(\w+)/g;
			while ((match = enumRe.exec(line)) !== null) {
				symbols.push({
					name: match[1],
					kind: SymbolKind.Enum,
					definedIn: uri,
					line: lineNum,
					referencedBy: [],
					isExported: line.includes('export'),
					freshness: ContextFreshness.Live,
				});
			}

			// export const Foo
			const constRe = /(?:export\s+)?const\s+(\w+)\s*[=:]/g;
			while ((match = constRe.exec(line)) !== null) {
				// Skip if it looks like a React component (uppercase first letter + JSX)
				const isComponent = match[1][0] === match[1][0].toUpperCase() && match[1][0] !== match[1][0].toLowerCase();
				symbols.push({
					name: match[1],
					kind: isComponent ? SymbolKind.Class : SymbolKind.Constant,
					definedIn: uri,
					line: lineNum,
					referencedBy: [],
					isExported: line.includes('export'),
					freshness: ContextFreshness.Live,
				});
			}

			// Method definitions: foo() { or foo: function(
			const methodRe = /(?:(?:public|private|protected|static|async|readonly)\s+)*(\w+)\s*\(/g;
			// Only inside class bodies — skip for now (too many false positives at top level)
		}

		return symbols;
	}

	private _extractDependencies(content: string, uri: URI): IDependencyEdge[] {
		const deps: IDependencyEdge[] = [];

		// import { foo } from './bar'
		const importFromRe = /import\s+(?:\{[^}]*\}|\*\s+as\s+\w+|\w+)\s+from\s+['"]([^'"]+)['"]/g;
		let match: RegExpExecArray | null;
		while ((match = importFromRe.exec(content)) !== null) {
			const importPath = match[1];
			const targetUri = this._resolveImportPath(uri, importPath);
			if (targetUri) {
				deps.push({
					source: uri,
					target: targetUri,
					importText: match[0],
					confidence: 0.9,
					source: 'static-analysis',
					freshness: ContextFreshness.Live,
				});
			}
		}

		// require('./bar')
		const requireRe = /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
		while ((match = requireRe.exec(content)) !== null) {
			const importPath = match[1];
			const targetUri = this._resolveImportPath(uri, importPath);
			if (targetUri) {
				deps.push({
					source: uri,
					target: targetUri,
					importText: match[0],
					confidence: 0.8,
					source: 'static-analysis',
					freshness: ContextFreshness.Live,
				});
			}
		}

		// dynamic import: import('./bar')
		const dynamicImportRe = /import\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
		while ((match = dynamicImportRe.exec(content)) !== null) {
			const importPath = match[1];
			const targetUri = this._resolveImportPath(uri, importPath);
			if (targetUri) {
				deps.push({
					source: uri,
					target: targetUri,
					importText: match[0],
					confidence: 0.7,
					source: 'static-analysis',
					freshness: ContextFreshness.Live,
				});
			}
		}

		return deps;
	}

	private _resolveImportPath(fromUri: URI, importPath: string): URI | undefined {
		// Only resolve relative imports (./ and ../)
		if (!importPath.startsWith('.')) {
			// Absolute/package imports — we can't resolve these without package.json
			// Mark with a placeholder URI scheme
			if (importPath.startsWith('@') || importPath.includes('/')) {
				// Scoped package or path within package
				return URI.parse(`package:${importPath}`);
			}
			return URI.parse(`package:${importPath}`);
		}

		// Resolve relative path
		const dir = fromUri.path.substring(0, fromUri.path.lastIndexOf('/'));
		const resolved = this._normalizePath(dir + '/' + importPath);

		// Add extension if missing
		let finalPath = resolved;
		if (!finalPath.endsWith('.ts') && !finalPath.endsWith('.tsx') &&
			!finalPath.endsWith('.js') && !finalPath.endsWith('.jsx')) {
			finalPath = finalPath + '.ts'; // Default to .ts
		}

		return fromUri.with({ path: finalPath });
	}

	private _normalizePath(path: string): string {
		const parts = path.split('/');
		const normalized: string[] = [];
		for (const part of parts) {
			if (part === '..') {
				normalized.pop();
			} else if (part !== '.' && part !== '') {
				normalized.push(part);
			}
		}
		return '/' + normalized.join('/');
	}
}

// ─── SymbolDependencyAnalyzer ──────────────────────────────────────────────────

export class SymbolDependencyAnalyzer extends Disposable implements ISymbolDependencyAnalyzer {

	declare readonly _serviceBrand: undefined;

	private readonly _languageAnalyzers: ILanguageAnalyzer[] = [];
	private readonly _extensionToAnalyzer = new Map<string, ILanguageAnalyzer>();

	constructor(
		@ILogService private readonly logService: ILogService,
		@ITextFileService private readonly textFileService: ITextFileService,
	) {
		super();

		// Register built-in TS/JS analyzer
		this._registerBuiltInAnalyzers();

		this.logService.trace('[SymbolDependencyAnalyzer] Phase 6 symbol analyzer initialized');
	}

	get supportedExtensions(): readonly string[] {
		const exts: string[] = [];
		for (const analyzer of this._languageAnalyzers) {
			exts.push(...analyzer.extensions);
		}
		return exts;
	}

	isSupported(extension: string): boolean {
		return this._extensionToAnalyzer.has(extension.startsWith('.') ? extension : `.${extension}`);
	}

	async analyzeFile(params: IAnalysisParams): Promise<IFileAnalysisResult> {
		const startTime = Date.now();

		const ext = params.uri.path.includes('.') ? '.' + params.uri.path.split('.').pop()! : '';
		const analyzer = this._extensionToAnalyzer.get(ext);

		if (!analyzer) {
			return {
				uri: params.uri,
				symbols: [],
				dependencies: [],
				language: 'unknown',
				complete: false,
				durationMs: Date.now() - startTime,
			};
		}

		// Get file content
		let content = params.content;
		if (!content) {
			try {
				const model = await this.textFileService.files.resolve(params.uri);
				content = model.textEditorModel?.getValue() ?? '';
			} catch {
				content = '';
			}
		}

		const result = analyzer.analyze(content, params.uri);

		return {
			uri: params.uri,
			symbols: result.symbols,
			dependencies: result.dependencies,
			language: analyzer.language as 'typescript' | 'javascript' | 'unknown',
			complete: true,
			durationMs: Date.now() - startTime,
		};
	}

	registerLanguageAnalyzer(analyzer: ILanguageAnalyzer): IDisposable {
		this._languageAnalyzers.push(analyzer);
		for (const ext of analyzer.extensions) {
			this._extensionToAnalyzer.set(ext, analyzer);
		}
		return toDisposable(() => {
			const idx = this._languageAnalyzers.indexOf(analyzer);
			if (idx >= 0) {
				this._languageAnalyzers.splice(idx, 1);
			}
			for (const ext of analyzer.extensions) {
				if (this._extensionToAnalyzer.get(ext) === analyzer) {
					this._extensionToAnalyzer.delete(ext);
				}
			}
		});
	}

	private _registerBuiltInAnalyzers(): void {
		const tsJsAnalyzer = new TypeScriptJavaScriptAnalyzer();
		this._languageAnalyzers.push(tsJsAnalyzer);
		for (const ext of tsJsAnalyzer.extensions) {
			this._extensionToAnalyzer.set(ext, tsJsAnalyzer);
		}
	}
}
