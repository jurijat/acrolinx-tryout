import { writable, derived, get } from 'svelte/store';
import { browser } from '$app/environment';
import { OrchestrationClient } from '@sap-ai-sdk/orchestration';
import type {
	SapAiModel,
	ChatMessage,
	GrammarCheckRequest,
	GrammarCheckResponse,
	SapAiServiceState
} from '$lib/types/sap-ai';

class SapAiSdkService {
	private state = writable<SapAiServiceState>({
		isAuthenticated: false,
		selectedModel: null,
		availableModels: [],
		chatHistory: [],
		isProcessing: false,
		error: null
	});

	private orchestrationClient: OrchestrationClient | null = null;

	// Public readable stores
	public readonly isAuthenticated = derived(this.state, ($state) => $state.isAuthenticated);
	public readonly selectedModel = derived(this.state, ($state) => $state.selectedModel);
	public readonly availableModels = derived(this.state, ($state) => $state.availableModels);
	public readonly chatHistory = derived(this.state, ($state) => $state.chatHistory);
	public readonly isProcessing = derived(this.state, ($state) => $state.isProcessing);
	public readonly error = derived(this.state, ($state) => $state.error);

	constructor() {
		// Don't initialize on construction to avoid SSR issues
	}

	public async initialize() {
		if (!browser) {
			return; // Skip on server side
		}

		try {
			// Set up the SAP AI Core service key in the environment
			// The SDK will automatically use it
			if (typeof window !== 'undefined' && import.meta.env.VITE_SAP_AI_CORE_SERVICE_KEY) {
				// For local development, we can pass the service key through Vite
				(window as any).process = {
					env: { AICORE_SERVICE_KEY: import.meta.env.VITE_SAP_AI_CORE_SERVICE_KEY }
				};
			}

			// Load available models
			await this.loadModels();
			this.updateState({ isAuthenticated: true });
		} catch (error) {
			console.error('Failed to initialize SAP AI SDK service:', error);
			this.updateState({ error: 'Failed to initialize SAP AI Core connection' });
		}
	}

	private updateState(updates: Partial<SapAiServiceState>) {
		this.state.update((state) => ({ ...state, ...updates }));
	}

	public async loadModels() {
		if (!browser) {
			return; // Skip on server side
		}

		try {
			this.updateState({ isProcessing: true, error: null });

			// For now, we'll use predefined models since the SDK doesn't expose a direct model listing API
			// In production, you would get this from your deployment configuration
			const models: SapAiModel[] = [
				{
					id: 'gpt-4o',
					name: 'GPT-4o',
					description: 'Most capable OpenAI model',
					capabilities: ['chat', 'grammar-check', 'text-generation'],
					maxTokens: 128000,
					vendor: 'OpenAI',
					version: '2024-08-06'
				},
				{
					id: 'gpt-4o-mini',
					name: 'GPT-4o Mini',
					description: 'Cost-efficient small model',
					capabilities: ['chat', 'grammar-check', 'text-generation'],
					maxTokens: 128000,
					vendor: 'OpenAI',
					version: 'latest'
				},
				{
					id: 'anthropic--claude-3.5-sonnet',
					name: 'Claude 3.5 Sonnet',
					description: 'Advanced reasoning and analysis',
					capabilities: ['chat', 'grammar-check', 'text-generation'],
					maxTokens: 200000,
					vendor: 'Anthropic',
					version: 'latest'
				},
				{
					id: 'anthropic--claude-3-haiku',
					name: 'Claude 3 Haiku',
					description: 'Fast and efficient',
					capabilities: ['chat', 'grammar-check', 'text-generation'],
					maxTokens: 200000,
					vendor: 'Anthropic',
					version: 'latest'
				},
				{
					id: 'gemini-1.5-pro',
					name: 'Gemini 1.5 Pro',
					description: "Google's advanced model",
					capabilities: ['chat', 'grammar-check', 'text-generation'],
					maxTokens: 1000000,
					vendor: 'Google',
					version: 'latest'
				}
			];

			this.updateState({ availableModels: models, isProcessing: false });
		} catch (error) {
			console.error('Failed to load models:', error);
			this.updateState({
				isProcessing: false,
				error: 'Failed to load available models'
			});
			throw error;
		}
	}

	public selectModel(modelId: string) {
		const model = get(this.availableModels).find((m) => m.id === modelId);
		if (model) {
			this.updateState({ selectedModel: model });
			// Create a new orchestration client with the selected model
			try {
				this.orchestrationClient = new OrchestrationClient({
					llm: {
						model_name: modelId,
						model_params: {
							max_tokens: 2000,
							temperature: 0.7
						}
					}
				});
			} catch (error) {
				console.error('Failed to create orchestration client:', error);
				this.updateState({ error: 'Failed to initialize model client' });
			}
		}
	}

	public async sendChatMessage(content: string): Promise<void> {
		const model = get(this.selectedModel);
		if (!model) {
			this.updateState({ error: 'Please select a model first' });
			return;
		}

		if (!this.orchestrationClient) {
			this.updateState({ error: 'Model client not initialized' });
			return;
		}

		try {
			this.updateState({ isProcessing: true, error: null });

			// Add user message to history
			const userMessage: ChatMessage = {
				id: crypto.randomUUID(),
				role: 'user',
				content,
				timestamp: new Date()
			};

			const currentHistory = get(this.chatHistory);
			this.updateState({ chatHistory: [...currentHistory, userMessage] });

			// Prepare messages for the SDK
			const messages = [...currentHistory, userMessage].map((msg) => ({
				role: msg.role as 'user' | 'assistant' | 'system',
				content: msg.content
			}));

			// Send request to our server API
			const response = await fetch('/api/sap-ai-sdk/chat', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					model: model.id,
					messages,
					maxTokens: 2000,
					temperature: 0.7
				})
			});

			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.error || 'Chat request failed');
			}

			const data = await response.json();

			// Add assistant message to history
			const assistantMessage: ChatMessage = {
				id: crypto.randomUUID(),
				role: 'assistant',
				content: data.content || '',
				timestamp: new Date()
			};

			this.updateState({
				chatHistory: [...get(this.chatHistory), assistantMessage],
				isProcessing: false
			});
		} catch (error) {
			console.error('Chat error:', error);
			this.updateState({
				isProcessing: false,
				error: 'Failed to send message'
			});
			throw error;
		}
	}

	public async checkGrammar(request: GrammarCheckRequest): Promise<GrammarCheckResponse> {
		const model = get(this.selectedModel);
		if (!model) {
			throw new Error('Please select a model first');
		}

		try {
			this.updateState({ isProcessing: true, error: null });

			// Send request to our server API
			const response = await fetch('/api/sap-ai-sdk/grammar-check', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					text: request.text,
					model: model.id,
					format: request.format,
					language: request.language,
					options: request.options
				})
			});

			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.error || 'Grammar check failed');
			}

			const result = await response.json();
			this.updateState({ isProcessing: false });

			return result;
		} catch (error) {
			console.error('Grammar check error:', error);
			this.updateState({
				isProcessing: false,
				error: 'Failed to check grammar'
			});
			throw error;
		}
	}

	public clearChatHistory() {
		this.updateState({ chatHistory: [] });
	}

	public clearError() {
		this.updateState({ error: null });
	}
}

// Export singleton instance
export const sapAiSdkService = new SapAiSdkService();
