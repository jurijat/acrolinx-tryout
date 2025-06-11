import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { ChatCompletionRequest, ChatCompletionResponse } from '$lib/types/sap-ai';
import { AICORE_SERVICE_KEY, SAP_AI_CORE_RESOURCE_GROUP } from '$env/static/private';

interface ServiceKey {
	serviceurls: {
		AI_API_URL: string;
	};
	url: string;
	clientid: string;
	clientsecret: string;
}

// SAP AI Core chat completion request format
interface AICoreMessage {
	role: 'system' | 'user' | 'assistant';
	content: string;
}

interface AICoreCompletionRequest {
	messages: AICoreMessage[];
	max_tokens?: number;
	temperature?: number;
	top_p?: number;
	n?: number;
	stream?: boolean;
	stop?: string[];
	presence_penalty?: number;
	frequency_penalty?: number;
}

interface AICoreCompletionResponse {
	id: string;
	object: string;
	created: number;
	model: string;
	choices: Array<{
		index: number;
		message: {
			role: string;
			content: string;
		};
		finish_reason: string;
	}>;
	usage: {
		prompt_tokens: number;
		completion_tokens: number;
		total_tokens: number;
	};
}

async function getAccessToken(serviceKey: ServiceKey): Promise<string> {
	// OAuth2 client credentials flow
	const tokenUrl = `${serviceKey.url}/oauth/token`;
	const credentials = Buffer.from(`${serviceKey.clientid}:${serviceKey.clientsecret}`).toString(
		'base64'
	);

	const formData = new URLSearchParams();
	formData.append('grant_type', 'client_credentials');

	const response = await fetch(tokenUrl, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/x-www-form-urlencoded',
			Authorization: `Basic ${credentials}`,
			Accept: 'application/json'
		},
		body: formData.toString()
	});

	if (!response.ok) {
		const error = await response.text();
		throw new Error(`Failed to get access token: ${error}`);
	}

	const data = await response.json();
	return data.access_token;
}

export const POST: RequestHandler = async ({ request }) => {
	try {
		const body: ChatCompletionRequest = await request.json();

		// Validate request
		if (!body.model || !body.messages || body.messages.length === 0) {
			return json({ error: 'Invalid request: model and messages are required' }, { status: 400 });
		}

		// Check if service key is configured
		if (!AICORE_SERVICE_KEY) {
			return json({ error: 'SAP AI Core service key not configured' }, { status: 500 });
		}

		// Parse service key
		const serviceKey: ServiceKey = JSON.parse(AICORE_SERVICE_KEY);
		
		// Get access token
		const accessToken = await getAccessToken(serviceKey);
		
		const apiUrl = serviceKey.serviceurls.AI_API_URL;

		// Prepare the request for SAP AI Core
		// The endpoint format is: /v2/inference/deployments/{deploymentId}/chat/completions
		const chatUrl = `${apiUrl}/v2/inference/deployments/${body.model}/chat/completions`;

		// Transform messages to SAP AI Core format
		const aiCoreRequest: AICoreCompletionRequest = {
			messages: body.messages.map((msg) => ({
				role: msg.role as 'system' | 'user' | 'assistant',
				content: msg.content
			})),
			max_tokens: body.maxTokens || 2000,
			temperature: body.temperature || 0.7,
			top_p: body.topP || 1,
			n: 1,
			stream: false
		};

		console.log('Calling SAP AI Core chat endpoint:', chatUrl);
		console.log('Request payload:', JSON.stringify(aiCoreRequest, null, 2));

		const response = await fetch(chatUrl, {
			method: 'POST',
			headers: {
				'Authorization': `Bearer ${accessToken}`,
				'AI-Resource-Group': SAP_AI_CORE_RESOURCE_GROUP || 'default',
				'Content-Type': 'application/json',
				'Accept': 'application/json'
			},
			body: JSON.stringify(aiCoreRequest)
		});

		if (!response.ok) {
			const errorText = await response.text();
			console.error('SAP AI Core chat error:', {
				status: response.status,
				statusText: response.statusText,
				error: errorText,
				url: chatUrl
			});

			let errorMessage = 'SAP AI Core request failed';
			let details = '';

			// Parse error details if possible
			try {
				const errorData = JSON.parse(errorText);
				if (errorData.error) {
					errorMessage = errorData.error.message || errorData.error;
					details = errorData.error.details || '';
				}
			} catch {
				errorMessage = `HTTP ${response.status}: ${errorText}`;
			}

			return json(
				{
					error: errorMessage,
					details: details || 'Please check that the deployment ID is correct and the model is properly deployed.',
					deploymentId: body.model,
					status: response.status
				},
				{ status: response.status }
			);
		}

		const aiCoreResponse: AICoreCompletionResponse = await response.json();

		console.log('SAP AI Core response:', JSON.stringify(aiCoreResponse, null, 2));

		// Transform SAP AI Core response to our format
		const transformedResponse: ChatCompletionResponse = {
			id: aiCoreResponse.id || `chat-${Date.now()}`,
			model: body.model,
			choices: aiCoreResponse.choices.map((choice) => ({
				message: {
					role: 'assistant' as const,
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
		const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
		return json({ error: 'Internal server error', details: errorMessage }, { status: 500 });
	}
};
