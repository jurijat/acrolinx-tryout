import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	openAICompatibleService,
	type ChatCompletionRequest,
	type ChatCompletionResponse
} from '$lib/services/openai-compatible-service';
import { sapAiDirectService } from '$lib/services/sap-ai-direct-service';
import { SAP_AI_API_METHOD, LLM_PROVIDER } from '$env/static/private';

export const POST: RequestHandler = async ({ request }) => {
	try {
		const body: ChatCompletionRequest = await request.json();

		// Validate request
		if (!body.model || !body.messages || body.messages.length === 0) {
			return json({ error: 'Invalid request: model and messages are required' }, { status: 400 });
		}

		let response: ChatCompletionResponse;

		// Check which method to use
		if (LLM_PROVIDER === 'sap-ai-core' && SAP_AI_API_METHOD === 'direct') {
			// Use direct SAP AI Core API
			console.log('Using direct SAP AI Core API');
			response = await sapAiDirectService.chatCompletion(body);
		} else {
			// Use OpenAI-compatible abstraction
			console.log(`Using OpenAI-compatible abstraction with provider: ${LLM_PROVIDER}`);
			response = await openAICompatibleService.chatCompletion(body);
		}

		return json(response);
	} catch (error) {
		console.error('Chat completion error:', error);
		const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
		return json({ error: 'Internal server error', details: errorMessage }, { status: 500 });
	}
};
