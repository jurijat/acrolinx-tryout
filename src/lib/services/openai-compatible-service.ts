import {
	AICORE_SERVICE_KEY,
	AICORE_RESOURCE_GROUP,
	LLM_PROVIDER,
	OPENAI_API_KEY,
	OPENAI_BASE_URL
} from '$env/static/private';
import { parseServiceKey } from '$lib/utils/service-key-parser';

// OpenAI-compatible interfaces
export interface ChatMessage {
	role: 'system' | 'user' | 'assistant';
	content: string;
}

export interface ChatCompletionRequest {
	model: string;
	messages: ChatMessage[];
	temperature?: number;
	max_tokens?: number;
	top_p?: number;
	frequency_penalty?: number;
	presence_penalty?: number;
	stream?: boolean;
	stop?: string | string[];
	n?: number;
}

export interface ChatCompletionResponse {
	id: string;
	object: string;
	created: number;
	model: string;
	choices: Array<{
		index: number;
		message: ChatMessage;
		finish_reason: string;
	}>;
	usage: {
		prompt_tokens: number;
		completion_tokens: number;
		total_tokens: number;
	};
}

export interface ChatCompletionWithMetadata {
	response: ChatCompletionResponse;
	request: ChatCompletionRequest;
	duration: number;
}

// Provider-specific interfaces
interface ServiceKey {
	serviceurls: {
		AI_API_URL: string;
	};
	url: string;
	clientid: string;
	clientsecret: string;
}

interface LLMProvider {
	name: string;
	getAccessToken(): Promise<string>;
	getChatCompletionUrl(model: string): string;
	transformRequest(request: ChatCompletionRequest): any;
	transformResponse(response: any): ChatCompletionResponse;
	getHeaders(accessToken: string): Record<string, string>;
}

// SAP AI Core Provider
class SAPAICoreProvider implements LLMProvider {
	name = 'sap-ai-core';
	private serviceKey: ServiceKey;
	private cachedToken: string | null = null;
	private tokenExpiresAt: Date | null = null;

	constructor() {
		if (!AICORE_SERVICE_KEY) {
			throw new Error('SAP AI Core service key not configured');
		}
		this.serviceKey = parseServiceKey(AICORE_SERVICE_KEY);
	}

	async getAccessToken(): Promise<string> {
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

	getChatCompletionUrl(model: string): string {
		const apiUrl = this.serviceKey.serviceurls.AI_API_URL;
		return `${apiUrl}/v2/inference/deployments/${model}/chat/completions?api-version=2024-12-01-preview`;
	}

	transformRequest(request: ChatCompletionRequest): any {
		return {
			messages: request.messages,
			max_tokens: request.max_tokens || 8092,
			temperature: request.temperature || 0.7,
			top_p: request.top_p || 1,
			n: request.n || 1,
			stream: request.stream || false
		};
	}

	transformResponse(response: any): ChatCompletionResponse {
		return response; // SAP AI Core already returns OpenAI-compatible format
	}

	getHeaders(accessToken: string): Record<string, string> {
		return {
			Authorization: `Bearer ${accessToken}`,
			'AI-Resource-Group': AICORE_RESOURCE_GROUP || 'default',
			'Content-Type': 'application/json',
			Accept: 'application/json'
		};
	}
}

// OpenAI Provider
class OpenAIProvider implements LLMProvider {
	name = 'openai';
	private apiKey: string;
	private baseUrl: string;

	constructor() {
		if (!OPENAI_API_KEY) {
			throw new Error('OpenAI API key not configured');
		}
		this.apiKey = OPENAI_API_KEY;
		this.baseUrl = OPENAI_BASE_URL || 'https://openrouter.ai/api';
	}

	async getAccessToken(): Promise<string> {
		return this.apiKey; // OpenAI uses API key directly
	}

	getChatCompletionUrl(model: string): string {
		return `${this.baseUrl}/v1/chat/completions?api-version=2024-12-01-preview`;
	}

	transformRequest(request: ChatCompletionRequest): any {
		return request; // OpenAI uses the standard format
	}

	transformResponse(response: any): ChatCompletionResponse {
		return response; // OpenAI returns the standard format
	}

	getHeaders(accessToken: string): Record<string, string> {
		return {
			Authorization: `Bearer ${accessToken}`,
			'Content-Type': 'application/json'
		};
	}
}

// Factory function to create the appropriate provider
function createProvider(): LLMProvider {
	const provider = LLM_PROVIDER || 'sap-ai-core';

	switch (provider.toLowerCase()) {
		case 'sap-ai-core':
		case 'sap':
			return new SAPAICoreProvider();
		case 'openai':
		case 'openrouter': // OpenRouter uses the same implementation as OpenAI
			return new OpenAIProvider();
		default:
			throw new Error(`Unknown LLM provider: ${provider}`);
	}
}

// Main service class
export class OpenAICompatibleService {
	private provider: LLMProvider;

	constructor() {
		this.provider = createProvider();
	}

	async chatCompletion(request: ChatCompletionRequest): Promise<ChatCompletionResponse> {
		try {
			// Get access token
			const accessToken = await this.provider.getAccessToken();

			// Get URL
			const url = this.provider.getChatCompletionUrl(request.model);

			// Transform request
			const transformedRequest = this.provider.transformRequest(request);

			// Get headers
			const headers = this.provider.getHeaders(accessToken);

			console.log(`[${this.provider.name}] Calling chat completion:`, url);
			console.log(`[${this.provider.name}] Request:`, JSON.stringify(transformedRequest, null, 2));

			// Make request
			const response = await fetch(url, {
				method: 'POST',
				headers,
				body: JSON.stringify(transformedRequest)
			});

			if (!response.ok) {
				const errorText = await response.text();
				console.error(`[${this.provider.name}] Chat completion error:`, {
					status: response.status,
					statusText: response.statusText,
					error: errorText
				});

				let errorMessage = 'Chat completion request failed';
				let details = '';

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

			const responseData = await response.json();
			console.log(`[${this.provider.name}] Response:`, JSON.stringify(responseData, null, 2));

			// Transform response
			return this.provider.transformResponse(responseData);
		} catch (error) {
			console.error(`[${this.provider.name}] Chat completion error:`, error);
			throw error;
		}
	}

	async chatCompletionWithMetadata(
		request: ChatCompletionRequest
	): Promise<ChatCompletionWithMetadata> {
		const startTime = Date.now();
		const response = await this.chatCompletion(request);
		const duration = Date.now() - startTime;

		return {
			response,
			request,
			duration
		};
	}

	getProviderName(): string {
		return this.provider.name;
	}
}

// Export singleton instance
export const openAICompatibleService = new OpenAICompatibleService();
