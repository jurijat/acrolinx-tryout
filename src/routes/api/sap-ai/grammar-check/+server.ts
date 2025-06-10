import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { GrammarCheckRequest, GrammarCheckResponse, GrammarError } from '$lib/types/sap-ai';
import { TextChunker } from '$lib/utils/text-chunker';
import { SAP_AI_CORE_RESOURCE_GROUP, SAP_AI_CORE_SERVICE_KEY } from '$env/static/private';

interface ServiceKey {
	serviceurls: {
		AI_API_URL: string;
	};
}

const GRAMMAR_CHECK_PROMPT = `You are a professional grammar checker. Analyze the following text and identify any grammar, spelling, punctuation, or style issues.

For each issue found, provide a JSON response with this exact structure:
{
  "errors": [
    {
      "text": "the exact problematic text",
      "type": "grammar|spelling|punctuation|style",
      "severity": "error|warning|suggestion",
      "message": "explanation of the issue",
      "suggestions": ["suggestion 1", "suggestion 2"],
      "position": <character position in the text>
    }
  ]
}

IMPORTANT: 
- The "position" field must be the exact character index where the error starts in the original text
- Only return the JSON object, no other text
- If no errors are found, return {"errors": []}

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

		// Check if service key is configured
		if (!SAP_AI_CORE_SERVICE_KEY) {
			// Generate mock errors for demonstration
			for (const chunk of chunks) {
				const mockErrors = generateMockErrors(chunk.text, chunk.startOffset);
				allErrors.push(...mockErrors);
			}
		} else {
			// Parse service key to get API URL
			const serviceKey: ServiceKey = JSON.parse(SAP_AI_CORE_SERVICE_KEY);
			const apiUrl = serviceKey.serviceurls.AI_API_URL;

			// Process each chunk with SAP AI Core
			for (const chunk of chunks) {
				const chatUrl = `${apiUrl}/v2/inference/deployments/${body.model}/chat/completions`;

				const aiCoreRequest = {
					messages: [
						{
							role: 'system',
							content:
								'You are a professional grammar checker. Always respond with valid JSON only.'
						},
						{
							role: 'user',
							content: GRAMMAR_CHECK_PROMPT + chunk.text
						}
					],
					max_tokens: 2000,
					temperature: 0.3, // Lower temperature for more consistent grammar checking
					n: 1,
					stream: false
				};

				const response = await fetch(chatUrl, {
					method: 'POST',
					headers: {
						Authorization: authHeader,
						'AI-Resource-Group': SAP_AI_CORE_RESOURCE_GROUP || 'default',
						'Content-Type': 'application/json'
					},
					body: JSON.stringify(aiCoreRequest)
				});

				if (!response.ok) {
					console.error('SAP AI Core grammar check error:', response.status, await response.text());
					continue;
				}

				const aiResponse = await response.json();
				const content = aiResponse.choices[0]?.message?.content;

				if (content) {
					try {
						// Parse the JSON response
						const result = JSON.parse(content);
						if (result.errors && Array.isArray(result.errors)) {
							// Convert to our format and adjust offsets
							const chunkErrors: GrammarError[] = result.errors.map((error: any, index: number) => {
								// Find the actual position of the error text in the chunk
								const errorPosition = error.position || chunk.text.indexOf(error.text);

								return {
									id: `error-${chunk.id}-${index}`,
									type: error.type || 'grammar',
									severity: error.severity || 'error',
									offset: chunk.startOffset + (errorPosition >= 0 ? errorPosition : 0),
									length: error.text.length,
									message: error.message,
									suggestions: error.suggestions || [],
									context: {
										before: chunk.text.substring(Math.max(0, errorPosition - 20), errorPosition),
										error: error.text,
										after: chunk.text.substring(
											errorPosition + error.text.length,
											errorPosition + error.text.length + 20
										)
									}
								};
							});
							allErrors.push(...chunkErrors);
						}
					} catch (parseError) {
						console.error('Failed to parse AI response:', parseError, content);
					}
				}
			}
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
