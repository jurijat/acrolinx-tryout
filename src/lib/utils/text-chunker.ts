import type { TextChunk } from '$lib/types/sap-ai';

export interface ChunkingOptions {
	maxChunkSize: number; // Maximum size in characters
	overlapSize: number; // Overlap size in characters
	preserveBoundaries: boolean; // Try to chunk at sentence/paragraph boundaries
}

const DEFAULT_OPTIONS: ChunkingOptions = {
	maxChunkSize: 2000,
	overlapSize: 200,
	preserveBoundaries: true
};

export class TextChunker {
	private options: ChunkingOptions;

	constructor(options: Partial<ChunkingOptions> = {}) {
		this.options = { ...DEFAULT_OPTIONS, ...options };
	}

	/**
	 * Splits text into chunks with overlap
	 */
	chunk(text: string): TextChunk[] {
		if (text.length <= this.options.maxChunkSize) {
			return [
				{
					id: '0',
					text,
					startOffset: 0,
					endOffset: text.length
				}
			];
		}

		const chunks: TextChunk[] = [];
		let currentOffset = 0;
		let chunkId = 0;

		while (currentOffset < text.length) {
			let endOffset = currentOffset + this.options.maxChunkSize;

			// If we're not at the last chunk and preserveBoundaries is true
			if (endOffset < text.length && this.options.preserveBoundaries) {
				// Try to find a good boundary (sentence end, paragraph, etc.)
				const boundary = this.findBoundary(text, currentOffset, endOffset);
				if (boundary !== -1) {
					endOffset = boundary;
				}
			}

			// Ensure we don't exceed text length
			endOffset = Math.min(endOffset, text.length);

			const chunkText = text.substring(currentOffset, endOffset);

			chunks.push({
				id: chunkId.toString(),
				text: chunkText,
				startOffset: currentOffset,
				endOffset: endOffset,
				overlapWithPrevious: currentOffset > 0 ? this.options.overlapSize : 0
			});

			// Move to next chunk with overlap
			if (endOffset < text.length) {
				currentOffset = endOffset - this.options.overlapSize;
			} else {
				break;
			}

			chunkId++;
		}

		return chunks;
	}

	/**
	 * Finds a good boundary point for chunking (sentence end, paragraph, etc.)
	 */
	private findBoundary(text: string, start: number, preferredEnd: number): number {
		// Look for boundaries in order of preference
		const boundaries = [
			{ pattern: /\n\n/g, name: 'paragraph' },
			{ pattern: /[.!?]\s+/g, name: 'sentence' },
			{ pattern: /[,;]\s+/g, name: 'clause' },
			{ pattern: /\s+/g, name: 'word' }
		];

		// Search within a window before the preferred end
		const searchStart = Math.max(start, preferredEnd - 200);
		const searchText = text.substring(searchStart, preferredEnd);

		for (const { pattern } of boundaries) {
			const matches = Array.from(searchText.matchAll(pattern));
			if (matches.length > 0) {
				// Get the last match
				const lastMatch = matches[matches.length - 1];
				const boundaryPos = searchStart + lastMatch.index! + lastMatch[0].length;

				// Make sure we have a reasonable chunk size
				if (boundaryPos - start >= this.options.maxChunkSize * 0.5) {
					return boundaryPos;
				}
			}
		}

		return -1; // No good boundary found
	}

	/**
	 * Merges overlapping results from different chunks
	 */
	static mergeResults<T extends { offset: number; length: number }>(
		results: Map<string, T[]>
	): T[] {
		const merged: T[] = [];
		const allResults = Array.from(results.values()).flat();

		// Sort by offset
		allResults.sort((a, b) => a.offset - b.offset);

		for (const result of allResults) {
			// Check if this result overlaps with the last merged result
			const lastMerged = merged[merged.length - 1];
			if (lastMerged && result.offset < lastMerged.offset + lastMerged.length) {
				// Skip duplicate or overlapping result
				continue;
			}
			merged.push(result);
		}

		return merged;
	}

	/**
	 * Adjusts offsets from chunk-relative to text-relative
	 */
	static adjustOffsets<T extends { offset: number }>(results: T[], chunk: TextChunk): T[] {
		return results.map((result) => ({
			...result,
			offset: result.offset + chunk.startOffset
		}));
	}
}

// Export default instance with standard options
export const textChunker = new TextChunker();
