import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { env } from '$env/dynamic/private';
import type { GrammarCheckRequest, GrammarCheckResponse, GrammarError } from '$lib/types/sap-ai';
import { TextChunker } from '$lib/utils/text-chunker';

const GRAMMAR_CHECK_PROMPT = `You are a professional grammar checker. Analyze the following text and identify any grammar, spelling, punctuation, or style issues.

For each issue found, provide:
1. The exact text that has the issue
2. The type of error (grammar, spelling, punctuation, or style)
3. The severity (error, warning, or suggestion)
4. A clear explanation of the issue
5. One or more suggestions for correction

Format your response as a JSON array of errors. Each error should have this structure:
{
  "text": "the exact problematic text",
  "type": "grammar|spelling|punctuation|style",
  "severity": "error|warning|suggestion",
  "message": "explanation of the issue",
  "suggestions": ["suggestion 1", "suggestion 2"]
}

Text to analyze:
`;

export const POST: RequestHandler = async ({ request }) => {
	try {
		// Verify authorization header
		const authHeader = request.headers.get('authorization');
		if (!authHeader || !authHeader.startsWith('Bearer ')) {
			return json({ error: 'Unauthorized' }, { status: 401 });
		}

		const body: GrammarCheckRequest & { model: string } = await request.json();

		// Validate request
		if (!body.text || !body.model) {
			return json({ error: 'Invalid request: text and model are required' }, { status: 400 });
		}

		// Create text chunker for large texts
		const chunker = new TextChunker({
			maxChunkSize: 2000,
			overlapSize: 200,
			preserveBoundaries: true
		});

		const chunks = chunker.chunk(body.text);
		const allErrors: GrammarError[] = [];

		// Process each chunk
		for (let i = 0; i < chunks.length; i++) {
			const chunk = chunks[i];

			// In a real implementation, this would call SAP AI Core API
			if (!env.SAP_AI_CORE_URL) {
				// Generate mock errors for demonstration
				const mockErrors = generateMockErrors(chunk.text, chunk.startOffset);
				allErrors.push(...mockErrors);
				continue;
			}

			// TODO: Implement actual SAP AI Core API call for each chunk
			// const prompt = GRAMMAR_CHECK_PROMPT + chunk.text;
			// const response = await callSapAiCore(prompt, body.model, authHeader);
			// const errors = parseGrammarCheckResponse(response, chunk);
			// allErrors.push(...errors);
		}

		// Merge overlapping results
		const mergedErrors = mergeOverlappingErrors(allErrors);

		const response: GrammarCheckResponse = {
			id: `grammar-check-${Date.now()}`,
			errors: mergedErrors,
			processedChunks: chunks.length,
			totalChunks: chunks.length
		};

		return json(response);
	} catch (error) {
		console.error('Grammar check error:', error);
		return json({ error: 'Internal server error' }, { status: 500 });
	}
};

function generateMockErrors(text: string, offset: number): GrammarError[] {
	const errors: GrammarError[] = [];

	// Simple mock error detection
	const patterns = [
		{
			regex: /\b(teh|tHe)\b/g,
			type: 'spelling' as const,
			severity: 'error' as const,
			message: 'Spelling error: "teh" should be "the"',
			suggestions: ['the']
		},
		{
			regex: /\s{2,}/g,
			type: 'punctuation' as const,
			severity: 'warning' as const,
			message: 'Multiple consecutive spaces',
			suggestions: [' ']
		},
		{
			regex: /[.!?]\s*[a-z]/g,
			type: 'grammar' as const,
			severity: 'error' as const,
			message: 'Sentence should start with a capital letter',
			suggestions: []
		}
	];

	let errorId = 0;
	for (const pattern of patterns) {
		let match;
		while ((match = pattern.regex.exec(text)) !== null) {
			const errorText = match[0];
			errors.push({
				id: `error-${offset}-${errorId++}`,
				type: pattern.type,
				severity: pattern.severity,
				offset: offset + match.index,
				length: errorText.length,
				message: pattern.message,
				suggestions: pattern.suggestions,
				context: {
					before: text.substring(Math.max(0, match.index - 20), match.index),
					error: errorText,
					after: text.substring(match.index + errorText.length, match.index + errorText.length + 20)
				}
			});
		}
	}

	return errors;
}

function mergeOverlappingErrors(errors: GrammarError[]): GrammarError[] {
	if (errors.length === 0) return [];

	// Sort by offset
	const sorted = [...errors].sort((a, b) => a.offset - b.offset);
	const merged: GrammarError[] = [sorted[0]];

	for (let i = 1; i < sorted.length; i++) {
		const current = sorted[i];
		const last = merged[merged.length - 1];

		// Check if errors overlap
		if (current.offset < last.offset + last.length) {
			// Skip overlapping error (keep the first one)
			continue;
		}

		merged.push(current);
	}

	return merged;
}
