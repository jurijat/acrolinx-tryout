import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { env } from '$env/dynamic/private';
import { OrchestrationClient } from '@sap-ai-sdk/orchestration';
import { TextChunker } from '$lib/utils/text-chunker';
import type { GrammarError } from '$lib/types/sap-ai';

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
		const body = await request.json();

		// Validate request
		if (!body.text || !body.model) {
			return json({ error: 'Invalid request: text and model are required' }, { status: 400 });
		}

		// Set the service key in the environment for the SDK
		if (env.AICORE_SERVICE_KEY) {
			process.env.AICORE_SERVICE_KEY = env.AICORE_SERVICE_KEY;
		} else {
			return json({ error: 'SAP AI Core service key not configured' }, { status: 500 });
		}

		// Create orchestration client
		const orchestrationClient = new OrchestrationClient({
			llm: {
				model_name: body.model,
				model_params: {
					max_tokens: 8092,
					temperature: 0.0 // Lower temperature for consistent grammar checking
				}
			}
		});

		// Create text chunker for large texts
		const chunker = new TextChunker({
			maxChunkSize: 2000,
			overlapSize: 200,
			preserveBoundaries: true
		});

		const chunks = chunker.chunk(body.text);
		const allErrors: GrammarError[] = [];

		// Process each chunk
		for (const chunk of chunks) {
			try {
				const response = await orchestrationClient.chatCompletion({
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
					]
				});

				const content = response.getContent();
				if (content) {
					try {
						const result = JSON.parse(content);
						if (result.errors && Array.isArray(result.errors)) {
							// Convert to our format and adjust offsets
							const chunkErrors: GrammarError[] = result.errors.map((error: any, index: number) => {
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
			} catch (chunkError) {
				console.error('Error processing chunk:', chunkError);
			}
		}

		// Merge overlapping results
		const mergedErrors = mergeOverlappingErrors(allErrors);

		return json({
			id: `grammar-check-${Date.now()}`,
			errors: mergedErrors,
			processedChunks: chunks.length,
			totalChunks: chunks.length
		});
	} catch (error: any) {
		console.error('Grammar check error:', error);
		return json(
			{
				error: 'Internal server error',
				details: error.message
			},
			{ status: 500 }
		);
	}
};

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
