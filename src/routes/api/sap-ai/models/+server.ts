import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { env } from '$env/dynamic/private';
import type { SapAiModel } from '$lib/types/sap-ai';

// Mock models for now - replace with actual SAP AI Core API call
const AVAILABLE_MODELS: SapAiModel[] = [
	{
		id: 'gpt-4',
		name: 'GPT-4',
		description: 'Most capable model for complex tasks',
		capabilities: ['chat', 'grammar-check', 'text-generation'],
		maxTokens: 8192,
		vendor: 'OpenAI',
		version: '4.0'
	},
	{
		id: 'gpt-3.5-turbo',
		name: 'GPT-3.5 Turbo',
		description: 'Fast and efficient for most tasks',
		capabilities: ['chat', 'grammar-check', 'text-generation'],
		maxTokens: 4096,
		vendor: 'OpenAI',
		version: '3.5'
	},
	{
		id: 'claude-3-opus',
		name: 'Claude 3 Opus',
		description: 'Advanced reasoning and analysis',
		capabilities: ['chat', 'grammar-check', 'text-generation', 'code-generation'],
		maxTokens: 200000,
		vendor: 'Anthropic',
		version: '3.0'
	},
	{
		id: 'claude-3-sonnet',
		name: 'Claude 3 Sonnet',
		description: 'Balanced performance and speed',
		capabilities: ['chat', 'grammar-check', 'text-generation'],
		maxTokens: 200000,
		vendor: 'Anthropic',
		version: '3.0'
	}
];

export const GET: RequestHandler = async ({ request }) => {
	try {
		// Verify authorization header
		const authHeader = request.headers.get('authorization');
		if (!authHeader || !authHeader.startsWith('Bearer ')) {
			return json({ error: 'Unauthorized' }, { status: 401 });
		}

		// In a real implementation, this would call SAP AI Core API
		// to get the list of available models for the resource group
		if (!env.SAP_AI_CORE_URL) {
			// Return mock models if SAP AI Core is not configured
			return json(AVAILABLE_MODELS);
		}

		// TODO: Implement actual SAP AI Core API call
		// const response = await fetch(`${env.SAP_AI_CORE_URL}/v2/lm/models`, {
		//     headers: {
		//         'Authorization': authHeader,
		//         'AI-Resource-Group': env.SAP_AI_CORE_RESOURCE_GROUP
		//     }
		// });

		// For now, return mock models
		return json(AVAILABLE_MODELS);
	} catch (error) {
		console.error('Failed to fetch models:', error);
		return json({ error: 'Internal server error' }, { status: 500 });
	}
};
