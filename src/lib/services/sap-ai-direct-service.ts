import { AICORE_SERVICE_KEY, AICORE_RESOURCE_GROUP } from '$env/static/private';
import { parseServiceKey } from '$lib/utils/service-key-parser';
import type { ChatCompletionRequest, ChatCompletionResponse } from './openai-compatible-service';

interface ServiceKey {
	serviceurls: {
		AI_API_URL: string;
	};
	url: string;
	clientid: string;
	clientsecret: string;
}

interface AICoreCompletionRequest {
	messages: Array<{
		role: 'system' | 'user' | 'assistant';
		content: string;
	}>;
	max_tokens?: number;
	temperature?: number;
	top_p?: number;
	n?: number;
	stream?: boolean;
	stop?: string[];
	presence_penalty?: number;
	frequency_penalty?: number;
}

export class SapAiDirectService {
	private serviceKey: ServiceKey;
	private cachedToken: string | null = null;
	private tokenExpiresAt: Date | null = null;

	constructor() {
		if (!AICORE_SERVICE_KEY) {
			throw new Error('SAP AI Core service key not configured');
		}
		this.serviceKey = parseServiceKey(AICORE_SERVICE_KEY);
	}

	private async getAccessToken(): Promise<string> {
		// Return cached token if still valid
		if (this.cachedToken && this.tokenExpiresAt && this.tokenExpiresAt > new Date()) {
			return this.cachedToken;
		}

		// OAuth2 client credentials flow
		const tokenUrl = `${this.serviceKey.url}/oauth/token`;
		const credentials = Buffer.from(
			`${this.serviceKey.clientid}:${this.serviceKey.clientsecret}`
		).toString('base64');

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
			throw new Error(`Failed to get SAP AI Core access token: ${error}`);
		}

		const data = await response.json();
		this.cachedToken = data.access_token;
		// Set expiration 5 minutes before actual expiration for safety
		this.tokenExpiresAt = new Date(Date.now() + (data.expires_in - 300) * 1000);

		return data.access_token;
	}

	async chatCompletion(request: ChatCompletionRequest): Promise<ChatCompletionResponse> {
		try {
			// Get access token
			const accessToken = await this.getAccessToken();

			const apiUrl = this.serviceKey.serviceurls.AI_API_URL;
			const chatUrl = `${apiUrl}/v2/inference/deployments/${request.model}/completion`;

			// Transform request to SAP AI Core format
			const aiCoreRequest: AICoreCompletionRequest = {
				messages: request.messages.map((msg) => ({
					role: msg.role as 'system' | 'user' | 'assistant',
					content: msg.content
				})),
				max_tokens: request.max_tokens || 8092,
				temperature: request.temperature || 0.7,
				top_p: request.top_p || 1,
				n: request.n || 1,
				stream: request.stream || false
			};

			console.log('[sap-ai-direct] Calling SAP AI Core chat endpoint:', chatUrl);
			console.log('[sap-ai-direct] Request payload:', JSON.stringify(aiCoreRequest, null, 2));

			const response = await fetch(chatUrl, {
				method: 'POST',
				headers: {
					Authorization: `Bearer ${accessToken}`,
					'AI-Resource-Group': AICORE_RESOURCE_GROUP || 'default',
					'Content-Type': 'application/json',
					Accept: 'application/json'
				},
				body: JSON.stringify(aiCoreRequest)
			});

			if (!response.ok) {
				const errorText = await response.text();
				console.error('[sap-ai-direct] SAP AI Core chat error:', {
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

				throw new Error(`${errorMessage}${details ? `: ${details}` : ''}`);
			}

			const aiCoreResponse = await response.json();
			console.log('[sap-ai-direct] SAP AI Core response:', JSON.stringify(aiCoreResponse, null, 2));

			// SAP AI Core already returns OpenAI-compatible format
			return aiCoreResponse as ChatCompletionResponse;
		} catch (error) {
			console.error('[sap-ai-direct] Chat completion error:', error);
			throw error;
		}
	}
}

// Export singleton instance
export const sapAiDirectService = new SapAiDirectService();
