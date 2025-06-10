import { writable, derived, get } from 'svelte/store';
import { browser } from '$app/environment';
import type {
	SapAiModel,
	ChatMessage,
	ChatCompletionRequest,
	ChatCompletionResponse,
	GrammarCheckRequest,
	GrammarCheckResponse,
	SapAiServiceState
} from '$lib/types/sap-ai';

class SapAiService {
	private state = writable<SapAiServiceState>({
		isAuthenticated: false,
		selectedModel: null,
		availableModels: [],
		chatHistory: [],
		isProcessing: false,
		error: null
	});

	private accessToken: string | null = null;
	private tokenExpiresAt: Date | null = null;
	private apiUrl: string | null = null;

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
		try {
			await this.authenticate();
			await this.loadModels();
		} catch (error) {
			console.error('Failed to initialize SAP AI service:', error);
			this.updateState({ error: 'Failed to initialize SAP AI Core connection' });
		}
	}

	private updateState(updates: Partial<SapAiServiceState>) {
		this.state.update((state) => ({ ...state, ...updates }));
	}

	private async authenticate() {
		if (!browser) {
			return; // Skip authentication on server side
		}

		try {
			const response = await fetch('/api/sap-ai/auth/token', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' }
			});

			if (!response.ok) {
				throw new Error('Authentication failed');
			}

			const data = await response.json();
			this.accessToken = data.access_token;
			this.tokenExpiresAt = new Date(Date.now() + data.expires_in * 1000);
			this.apiUrl = data.api_url; // Store the API URL from auth response
			this.updateState({ isAuthenticated: true });
		} catch (error) {
			console.error('SAP AI authentication error:', error);
			this.updateState({ isAuthenticated: false, error: 'Authentication failed' });
			throw error;
		}
	}

	private async ensureAuthenticated() {
		if (!this.accessToken || !this.tokenExpiresAt || this.tokenExpiresAt <= new Date()) {
			await this.authenticate();
		}
	}

	public async loadModels() {
		if (!browser) {
			return; // Skip on server side
		}

		try {
			await this.ensureAuthenticated();
			this.updateState({ isProcessing: true, error: null });

			const response = await fetch('/api/sap-ai/models', {
				headers: {
					Authorization: `Bearer ${this.accessToken}`
				}
			});

			if (!response.ok) {
				throw new Error('Failed to load models');
			}

			const models: SapAiModel[] = await response.json();
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
		}
	}

	public async sendChatMessage(content: string): Promise<void> {
		const model = get(this.selectedModel);
		if (!model) {
			this.updateState({ error: 'Please select a model first' });
			return;
		}

		try {
			await this.ensureAuthenticated();
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

			// Prepare request
			const request: ChatCompletionRequest = {
				model: model.id,
				messages: currentHistory
					.map((msg) => ({
						role: msg.role,
						content: msg.content
					}))
					.concat([{ role: 'user', content }])
			};

			// Send request
			const response = await fetch('/api/sap-ai/chat', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${this.accessToken}`
				},
				body: JSON.stringify(request)
			});

			if (!response.ok) {
				throw new Error('Chat request failed');
			}

			const data: ChatCompletionResponse = await response.json();

			// Add assistant message to history
			const assistantMessage: ChatMessage = {
				id: crypto.randomUUID(),
				role: 'assistant',
				content: data.choices[0].message.content,
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
			await this.ensureAuthenticated();
			this.updateState({ isProcessing: true, error: null });

			const response = await fetch('/api/sap-ai/grammar-check', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${this.accessToken}`
				},
				body: JSON.stringify({
					...request,
					model: model.id
				})
			});

			if (!response.ok) {
				throw new Error('Grammar check failed');
			}

			const result: GrammarCheckResponse = await response.json();
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
export const sapAiService = new SapAiService();
