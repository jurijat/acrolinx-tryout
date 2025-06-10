import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { env } from '$env/dynamic/private';
import { OrchestrationClient } from '@sap-ai-sdk/orchestration';

export const POST: RequestHandler = async ({ request }) => {
	try {
		const body = await request.json();

		// Validate request
		if (!body.model || !body.messages || body.messages.length === 0) {
			return json({ error: 'Invalid request: model and messages are required' }, { status: 400 });
		}

		// Set the service key in the environment for the SDK
		if (!env.AICORE_SERVICE_KEY || !process.env.AICORE_SERVICE_KEY) {
			return json({ error: 'SAP AI Core service key not configured' }, { status: 500 });
		}

		// Create orchestration client with the selected model
		const orchestrationClient = new OrchestrationClient({
			llm: {
				model_name: body.model,
				model_params: {
					max_tokens: body.maxTokens || 2000,
					temperature: body.temperature || 0.7
				}
			}
		});

		// Send chat completion request
		const response = await orchestrationClient.chatCompletion({
			messages: body.messages
		});

		// Return the response
		return json({
			content: response.getContent(),
			finishReason: response.getFinishReason(),
			tokenUsage: response.getTokenUsage()
		});
	} catch (error: any) {
		console.error('Chat completion error:', error);

		// Check if it's a content filter error
		if (error.cause?.response?.status === 400) {
			return json(
				{
					error: 'Content filter triggered',
					details: error.cause?.response?.data
				},
				{ status: 400 }
			);
		}

		return json(
			{
				error: 'Internal server error',
				details: error.message
			},
			{ status: 500 }
		);
	}
};
