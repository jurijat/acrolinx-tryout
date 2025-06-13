import { StringOutputParser } from '@langchain/core/output_parsers';
import { OrchestrationClient } from '@sap-ai-sdk/langchain';
import type { LangChainOrchestrationModuleConfig } from '@sap-ai-sdk/langchain';
import { AICORE_SERVICE_KEY, AICORE_RESOURCE_GROUP } from '$env/static/private';
import type {
	ChatMessage,
	ChatCompletionRequest,
	ChatCompletionResponse
} from '$lib/services/openai-compatible-service';

// Ensure the SDK can access the service key and resource group
import { ensureServiceKeyInEnv } from '$lib/utils/service-key-parser';
ensureServiceKeyInEnv(AICORE_SERVICE_KEY);
if (AICORE_RESOURCE_GROUP) {
	process.env.AICORE_RESOURCE_GROUP = AICORE_RESOURCE_GROUP;
}

export class LangchainOrchestrationService {
	private resourceGroup: string;

	constructor() {
		this.resourceGroup = AICORE_RESOURCE_GROUP || 'default';

		if (!AICORE_SERVICE_KEY) {
			throw new Error('AICORE_SERVICE_KEY environment variable is not set');
		}
	}

	async chatCompletion(request: ChatCompletionRequest): Promise<ChatCompletionResponse> {
		try {
			console.log(
				'[langchain-orchestration] Creating orchestration client for model:',
				request.model
			);

			// Check if the model is a deployment ID (hex string) or a model name
			const isDeploymentId = /^[a-f0-9]+$/i.test(request.model);

			// Create orchestration configuration
			const orchestrationConfig: LangChainOrchestrationModuleConfig = {
				llm: {
					model_name: request.model, // Always provide model_name as required
					...(isDeploymentId ? { deploymentId: request.model } : {}),
					model_params: {
						max_tokens: request.max_tokens || 8092,
						temperature: request.temperature || 0.7,
						top_p: request.top_p || 1,
						frequency_penalty: request.frequency_penalty || 0,
						presence_penalty: request.presence_penalty || 0,
						n: request.n || 1
					}
				}
			};

			console.log(
				'[langchain-orchestration] Config:',
				JSON.stringify(orchestrationConfig, null, 2)
			);

			// Create orchestration client
			// The SDK should pick up the resource group from environment
			const client = new OrchestrationClient(orchestrationConfig);

			// Convert messages to the format expected by langchain
			const messages = request.messages.map((msg) => ({
				role: msg.role,
				content: msg.content
			}));

			console.log('[langchain-orchestration] Sending chat completion request');

			// Execute the request
			const response = await client.invoke(messages);

			console.log('[langchain-orchestration] Response received successfully');

			// Parse the response content
			const parser = new StringOutputParser();
			const content = await parser.invoke(response);

			// Transform to OpenAI format
			const openAIResponse: ChatCompletionResponse = {
				id: `chatcmpl-${Date.now()}`,
				object: 'chat.completion',
				created: Math.floor(Date.now() / 1000),
				model: request.model,
				choices: [
					{
						index: 0,
						message: {
							role: 'assistant',
							content: content
						},
						finish_reason: 'stop'
					}
				],
				usage: {
					prompt_tokens: 0,
					completion_tokens: 0,
					total_tokens: 0
				}
			};

			return openAIResponse;
		} catch (error) {
			console.error('[langchain-orchestration] Chat completion error:', error);
			throw error;
		}
	}

	/**
	 * Direct invoke method for simple text prompts
	 */
	async invoke(prompt: string, model: string = 'gpt-4o'): Promise<string> {
		const orchestrationConfig: LangChainOrchestrationModuleConfig = {
			llm: {
				model_name: model
			}
		};

		const client = new OrchestrationClient(orchestrationConfig);

		const response = await client.pipe(new StringOutputParser()).invoke(prompt);

		return response;
	}

	/**
	 * Template-based completion
	 */
	async invokeWithTemplate(
		template: string,
		inputParams: Record<string, any>,
		model: string = 'gpt-4o'
	): Promise<string> {
		const orchestrationConfig: LangChainOrchestrationModuleConfig = {
			llm: {
				model_name: model
			},
			templating: {
				template: [
					{
						role: 'user',
						content: template
					}
				]
			}
		};

		const client = new OrchestrationClient(orchestrationConfig);

		const response = await client.pipe(new StringOutputParser()).invoke('', { inputParams });

		return response;
	}
}

// Export singleton instance
export const langchainOrchestrationService = new LangchainOrchestrationService();
