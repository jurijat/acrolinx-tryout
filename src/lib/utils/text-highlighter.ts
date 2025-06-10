import type { GrammarError } from '$lib/types/sap-ai';

export interface HighlightOptions {
	errorClass?: string;
	warningClass?: string;
	suggestionClass?: string;
	activeClass?: string;
}

const DEFAULT_OPTIONS: HighlightOptions = {
	errorClass: 'bg-red-200 border-b-2 border-red-500',
	warningClass: 'bg-yellow-200 border-b-2 border-yellow-500',
	suggestionClass: 'bg-blue-200 border-b-2 border-blue-500',
	activeClass: 'ring-2 ring-offset-2 ring-blue-500'
};

export class TextHighlighter {
	private options: HighlightOptions;

	constructor(options: Partial<HighlightOptions> = {}) {
		this.options = { ...DEFAULT_OPTIONS, ...options };
	}

	/**
	 * Highlights errors in plain text by wrapping them in spans
	 */
	highlightPlainText(text: string, errors: GrammarError[], activeErrorId?: string): string {
		if (errors.length === 0) {
			return this.escapeHtml(text);
		}

		// Sort errors by offset to process them in order
		const sortedErrors = [...errors].sort((a, b) => a.offset - b.offset);

		let result = '';
		let lastOffset = 0;

		for (const error of sortedErrors) {
			// Add text before the error
			if (error.offset > lastOffset) {
				result += this.escapeHtml(text.substring(lastOffset, error.offset));
			}

			// Add the error with highlighting
			const errorText = text.substring(error.offset, error.offset + error.length);
			const classes = this.getErrorClasses(error.severity, error.id === activeErrorId);

			result += `<span class="${classes}" data-error-id="${error.id}" data-error-type="${error.type}">${this.escapeHtml(errorText)}</span>`;

			lastOffset = error.offset + error.length;
		}

		// Add remaining text
		if (lastOffset < text.length) {
			result += this.escapeHtml(text.substring(lastOffset));
		}

		return result;
	}

	/**
	 * Highlights errors in markdown text
	 * This is more complex as we need to preserve markdown syntax
	 */
	highlightMarkdown(text: string, errors: GrammarError[], activeErrorId?: string): string {
		// For now, we'll treat markdown as plain text
		// In a real implementation, we'd parse the markdown to AST,
		// apply highlights, and render back
		return this.highlightPlainText(text, errors, activeErrorId);
	}

	/**
	 * Highlights errors in HTML text
	 * This parses the HTML and adds error spans while preserving structure
	 */
	highlightHtml(html: string, errors: GrammarError[], activeErrorId?: string): string {
		// Create a temporary container
		const container = document.createElement('div');
		container.innerHTML = html;

		// Process text nodes
		this.processHtmlNodes(container, errors, activeErrorId);

		return container.innerHTML;
	}

	/**
	 * Recursively processes HTML nodes to add error highlights
	 */
	private processHtmlNodes(node: Node, errors: GrammarError[], activeErrorId?: string) {
		if (node.nodeType === Node.TEXT_NODE) {
			const text = node.textContent || '';
			const offset = this.getTextOffset(node);

			// Find errors that overlap with this text node
			const relevantErrors = errors.filter(
				(error) => error.offset < offset + text.length && error.offset + error.length > offset
			);

			if (relevantErrors.length > 0) {
				// Replace text node with highlighted version
				const highlightedHtml = this.highlightTextNode(text, offset, relevantErrors, activeErrorId);
				const span = document.createElement('span');
				span.innerHTML = highlightedHtml;
				node.parentNode?.replaceChild(span, node);
			}
		} else if (node.nodeType === Node.ELEMENT_NODE) {
			// Process child nodes
			const children = Array.from(node.childNodes);
			for (const child of children) {
				this.processHtmlNodes(child, errors, activeErrorId);
			}
		}
	}

	/**
	 * Highlights errors within a single text node
	 */
	private highlightTextNode(
		text: string,
		nodeOffset: number,
		errors: GrammarError[],
		activeErrorId?: string
	): string {
		let result = '';
		let lastOffset = 0;

		for (const error of errors) {
			// Calculate relative positions within this text node
			const errorStart = Math.max(0, error.offset - nodeOffset);
			const errorEnd = Math.min(text.length, error.offset + error.length - nodeOffset);

			if (errorStart >= text.length || errorEnd <= 0) {
				continue;
			}

			// Add text before the error
			if (errorStart > lastOffset) {
				result += this.escapeHtml(text.substring(lastOffset, errorStart));
			}

			// Add the error with highlighting
			const errorText = text.substring(errorStart, errorEnd);
			const classes = this.getErrorClasses(error.severity, error.id === activeErrorId);

			result += `<span class="${classes}" data-error-id="${error.id}" data-error-type="${error.type}">${this.escapeHtml(errorText)}</span>`;

			lastOffset = errorEnd;
		}

		// Add remaining text
		if (lastOffset < text.length) {
			result += this.escapeHtml(text.substring(lastOffset));
		}

		return result;
	}

	/**
	 * Gets the text offset of a node within its container
	 */
	private getTextOffset(node: Node): number {
		let offset = 0;
		let current: Node | null = node.parentNode?.firstChild || null;

		while (current && current !== node) {
			if (current.nodeType === Node.TEXT_NODE) {
				offset += current.textContent?.length || 0;
			} else if (current.nodeType === Node.ELEMENT_NODE) {
				offset += (current as Element).textContent?.length || 0;
			}
			current = current.nextSibling;
		}

		return offset;
	}

	/**
	 * Gets CSS classes for an error based on severity
	 */
	private getErrorClasses(severity: GrammarError['severity'], isActive: boolean): string {
		const classes: string[] = ['cursor-pointer', 'transition-all'];

		switch (severity) {
			case 'error':
				classes.push(this.options.errorClass!);
				break;
			case 'warning':
				classes.push(this.options.warningClass!);
				break;
			case 'suggestion':
				classes.push(this.options.suggestionClass!);
				break;
		}

		if (isActive) {
			classes.push(this.options.activeClass!);
		}

		return classes.join(' ');
	}

	/**
	 * Escapes HTML special characters
	 */
	private escapeHtml(text: string): string {
		const map: Record<string, string> = {
			'&': '&amp;',
			'<': '&lt;',
			'>': '&gt;',
			'"': '&quot;',
			"'": '&#39;'
		};
		return text.replace(/[&<>"']/g, (char) => map[char]);
	}

	/**
	 * Creates a map of line numbers to character offsets for displaying errors
	 */
	static createLineMap(text: string): Map<number, number> {
		const lineMap = new Map<number, number>();
		lineMap.set(1, 0);

		let lineNumber = 1;
		for (let i = 0; i < text.length; i++) {
			if (text[i] === '\n') {
				lineNumber++;
				lineMap.set(lineNumber, i + 1);
			}
		}

		return lineMap;
	}

	/**
	 * Converts a character offset to line and column numbers
	 */
	static offsetToLineColumn(
		offset: number,
		lineMap: Map<number, number>
	): { line: number; column: number } {
		let line = 1;
		let lineStart = 0;

		for (const [lineNum, lineOffset] of lineMap) {
			if (lineOffset > offset) {
				break;
			}
			line = lineNum;
			lineStart = lineOffset;
		}

		return {
			line,
			column: offset - lineStart + 1
		};
	}
}

// Export default instance
export const textHighlighter = new TextHighlighter();
