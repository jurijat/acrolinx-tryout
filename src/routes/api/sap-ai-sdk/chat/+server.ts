import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { langchainOrchestrationService } from '$lib/services/langchain-orchestration-service';
import type { ChatCompletionRequest } from '$lib/services/openai-compatible-service';

export const POST: RequestHandler = async ({ request }) => {
	try {
		const body: ChatCompletionRequest = await request.json();

		// Validate request
		if (!body.model || !body.messages || body.messages.length === 0) {
			return json({ error: 'Invalid request: model and messages are required' }, { status: 400 });
		}

		// Use Langchain Orchestration service
		console.log(`Using Langchain Orchestration service for model: ${body.model}`);
		const response = await langchainOrchestrationService.chatCompletion(body);

		// Extract just the content for compatibility with the frontend
		const content = response.choices[0]?.message?.content || '';
		return json({ content });
	} catch (error) {
		console.error('Chat completion error:', error);
		const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
		return json({ error: 'Internal server error', details: errorMessage }, { status: 500 });
	}
};
