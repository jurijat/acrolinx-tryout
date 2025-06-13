import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	openAICompatibleService,
	type ChatCompletionRequest,
	type ChatCompletionResponse
} from '$lib/services/openai-compatible-service';
import { LLM_PROVIDER } from '$env/static/private';

export const POST: RequestHandler = async ({ request }) => {
	try {
		const body: ChatCompletionRequest = await request.json();

		// Validate request
		if (!body.model || !body.messages || body.messages.length === 0) {
			return json({ error: 'Invalid request: model and messages are required' }, { status: 400 });
		}

		try {
			// Always use OpenAI-compatible abstraction which handles all providers
			console.log(`Using OpenAI-compatible service with provider: ${LLM_PROVIDER}`);
			const response = await openAICompatibleService.chatCompletion(body);
			return json(response);
		} catch (error) {
			// Check if it's a configuration error
			if (error instanceof Error && error.message.includes('not configured')) {
				// Return mock response if LLM provider is not configured
				const mockResponse: ChatCompletionResponse = {
					id: `chat-${Date.now()}`,
					object: 'chat.completion',
					created: Math.floor(Date.now() / 1000),
					model: body.model,
					choices: [
						{
							message: {
								role: 'assistant',
								content: `I received your message: "${body.messages[body.messages.length - 1].content}". This is a mock response - please configure your LLM provider to enable actual AI responses.`
							},
							finish_reason: 'stop',
							index: 0
						}
					],
					usage: {
						prompt_tokens: 50,
						completion_tokens: 30,
						total_tokens: 80
					}
				};
				return json(mockResponse);
			}

			throw error;
		}
	} catch (error) {
		console.error('Chat completion error:', error);
		const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
		return json({ error: 'Internal server error', details: errorMessage }, { status: 500 });
	}
};
