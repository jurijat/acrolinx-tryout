import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { env } from '$env/dynamic/private';
import type { ChatCompletionRequest, ChatCompletionResponse } from '$lib/types/sap-ai';

export const POST: RequestHandler = async ({ request }) => {
	try {
		// Verify authorization header
		const authHeader = request.headers.get('authorization');
		if (!authHeader || !authHeader.startsWith('Bearer ')) {
			return json({ error: 'Unauthorized' }, { status: 401 });
		}

		const body: ChatCompletionRequest = await request.json();

		// Validate request
		if (!body.model || !body.messages || body.messages.length === 0) {
			return json({ error: 'Invalid request: model and messages are required' }, { status: 400 });
		}

		// In a real implementation, this would call SAP AI Core API
		if (!env.SAP_AI_CORE_URL) {
			// Return mock response if SAP AI Core is not configured
			const mockResponse: ChatCompletionResponse = {
				id: `chat-${Date.now()}`,
				model: body.model,
				choices: [
					{
						message: {
							role: 'assistant',
							content:
								'This is a mock response. Please configure SAP AI Core credentials to enable actual AI responses.'
						},
						finish_reason: 'stop',
						index: 0
					}
				],
				usage: {
					prompt_tokens: 10,
					completion_tokens: 15,
					total_tokens: 25
				}
			};
			return json(mockResponse);
		}

		// TODO: Implement actual SAP AI Core API call
		// const response = await fetch(`${env.SAP_AI_CORE_URL}/v2/completion`, {
		//     method: 'POST',
		//     headers: {
		//         'Content-Type': 'application/json',
		//         'Authorization': authHeader,
		//         'AI-Resource-Group': env.SAP_AI_CORE_RESOURCE_GROUP
		//     },
		//     body: JSON.stringify({
		//         model: body.model,
		//         messages: body.messages,
		//         temperature: body.temperature || 0.7,
		//         max_tokens: body.maxTokens || 2000
		//     })
		// });

		// For now, return a mock response
		const mockResponse: ChatCompletionResponse = {
			id: `chat-${Date.now()}`,
			model: body.model,
			choices: [
				{
					message: {
						role: 'assistant',
						content: `I received your message: "${body.messages[body.messages.length - 1].content}". This is a mock response - please configure SAP AI Core to enable actual AI responses.`
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
	} catch (error) {
		console.error('Chat completion error:', error);
		return json({ error: 'Internal server error' }, { status: 500 });
	}
};
