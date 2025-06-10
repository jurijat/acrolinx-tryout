// SAP AI Core types

export interface SapAiModel {
	id: string;
	name: string;
	description?: string;
	capabilities: string[];
	maxTokens: number;
	vendor: string;
	version?: string;
}

export interface ChatMessage {
	id: string;
	role: 'user' | 'assistant' | 'system';
	content: string;
	timestamp: Date;
}

export interface ChatCompletionRequest {
	model: string;
	messages: Omit<ChatMessage, 'id' | 'timestamp'>[];
	temperature?: number;
	maxTokens?: number;
	stream?: boolean;
}

export interface ChatCompletionResponse {
	id: string;
	model: string;
	choices: {
		message: {
			role: 'assistant';
			content: string;
		};
		finish_reason: string;
		index: number;
	}[];
	usage?: {
		prompt_tokens: number;
		completion_tokens: number;
		total_tokens: number;
	};
}

export interface GrammarError {
	id: string;
	type: 'grammar' | 'spelling' | 'punctuation' | 'style';
	severity: 'error' | 'warning' | 'suggestion';
	offset: number;
	length: number;
	message: string;
	suggestions: string[];
	context: {
		before: string;
		error: string;
		after: string;
	};
}

export interface GrammarCheckRequest {
	text: string;
	format: 'plain' | 'markdown' | 'html';
	language?: string;
	options?: {
		checkGrammar?: boolean;
		checkSpelling?: boolean;
		checkPunctuation?: boolean;
		checkStyle?: boolean;
	};
}

export interface GrammarCheckResponse {
	id: string;
	errors: GrammarError[];
	processedChunks?: number;
	totalChunks?: number;
}

export interface TextChunk {
	id: string;
	text: string;
	startOffset: number;
	endOffset: number;
	overlapWithPrevious?: number;
}

export interface SapAiServiceState {
	isAuthenticated: boolean;
	selectedModel: SapAiModel | null;
	availableModels: SapAiModel[];
	chatHistory: ChatMessage[];
	isProcessing: boolean;
	error: string | null;
}
