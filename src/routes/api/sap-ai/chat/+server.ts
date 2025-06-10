import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { ChatCompletionRequest, ChatCompletionResponse } from '$lib/types/sap-ai';
import { SAP_AI_CORE_SERVICE_KEY } from '$env/static/private';

interface ServiceKey {
	serviceurls: {
		AI_API_URL: string;
	};
}

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

		// Check if service key is configured
		if (!SAP_AI_CORE_SERVICE_KEY) {
			// Return mock response if SAP AI Core is not configured
			const mockResponse: ChatCompletionResponse = {
				id: `chat-${Date.now()}`,
				model: body.model,
				choices: [
					{
						message: {
							role: 'assistant',
							content: `I received your message: "${body.messages[body.messages.length - 1].content}". This is a mock response - please configure SAP AI Core service key to enable actual AI responses.`
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

		// Parse service key to get API URL
		const serviceKey: ServiceKey = JSON.parse(SAP_AI_CORE_SERVICE_KEY);
		const apiUrl = serviceKey.serviceurls.AI_API_URL;

		// Prepare the request for SAP AI Core
		// The endpoint format is: /v2/inference/deployments/{deploymentId}/chat/completions
		const chatUrl = `${apiUrl}/v2/inference/deployments/${body.model}/chat/completions`;

		// Transform messages to SAP AI Core format
		const aiCoreRequest = {
			messages: body.messages.map((msg) => ({
				role: msg.role,
				content: msg.content
			})),
			max_tokens: body.maxTokens || 2000,
			temperature: body.temperature || 0.7,
			n: 1,
			stream: false
		};

		const response = await fetch(chatUrl, {
			method: 'POST',
			headers: {
				Authorization: authHeader,
				'AI-Resource-Group': SAP_AI_CORE_RESOURCE_GROUYSAP_AI_CORE_SERVICE_KEY || 'default',
				'Content-Type': 'application/json'
			},
			body: JSON.stringify(aiCoreRequest)
		});

		if (!response.ok) {
			const errorText = await response.text();
			console.error('SAP AI Core chat error:', response.status, errorText);

			// Return a helpful error message
			return json(
				{
					error: `SAP AI Core error: ${response.status} - ${errorText}`,
					details:
						'Please check that the deployment ID is correct and the model is properly deployed.'
				},
				{ status: response.status }
			);
		}

		const aiCoreResponse = await response.json();

		// Transform SAP AI Core response to our format
		const transformedResponse: ChatCompletionResponse = {
			id: aiCoreResponse.id || `chat-${Date.now()}`,
			model: body.model,
			choices: aiCoreResponse.choices.map((choice: any) => ({
				message: {
					role: 'assistant',
					content: choice.message.content
				},
				finish_reason: choice.finish_reason,
				index: choice.index
			})),
			usage: aiCoreResponse.usage || {
				prompt_tokens: 0,
				completion_tokens: 0,
				total_tokens: 0
			}
		};

		return json(transformedResponse);
	} catch (error) {
		console.error('Chat completion error:', error);
		return json({ error: 'Internal server error' }, { status: 500 });
	}
};
