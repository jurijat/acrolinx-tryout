import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { OPENAI_API_KEY, OPENAI_BASE_URL, LLM_PROVIDER } from '$env/static/private';
import type { OpenRouterModel } from '$lib/types/openrouter';

export const GET: RequestHandler = async () => {
	try {
		// Check if we're configured to use OpenRouter
		if (LLM_PROVIDER !== 'openrouter' && LLM_PROVIDER !== 'openai') {
			return json({ data: [] });
		}

		if (!OPENAI_API_KEY) {
			return json({ error: 'OpenRouter API key not configured' }, { status: 500 });
		}

		const baseUrl = OPENAI_BASE_URL || 'https://openrouter.ai/api';
		const modelsUrl = `${baseUrl}/v1/models`;

		const response = await fetch(modelsUrl, {
			headers: {
				Accept: 'application/json'
			}
		});

		if (!response.ok) {
			const error = await response.text();
			console.error('Failed to fetch OpenRouter models:', error);
			return json({ error: 'Failed to fetch models' }, { status: response.status });
		}

		const data = await response.json();

		// Filter and sort models for text checking
		// Prioritize GPT models and other good text analysis models
		const textCheckingModels = data.data
			.filter((model: OpenRouterModel) => {
				// Filter for text-capable models
				return (
					model.architecture?.input_modalities?.includes('text') &&
					model.architecture?.output_modalities?.includes('text')
				);
			})
			.filter((model: OpenRouterModel) => {
				// Filter for models good at text analysis
				const modelId = model.id.toLowerCase();
				return (
					modelId.includes('gpt') ||
					modelId.includes('claude') ||
					modelId.includes('gemini') ||
					modelId.includes('mistral') ||
					modelId.includes('llama')
				);
			})
			.sort((a: OpenRouterModel, b: OpenRouterModel) => {
				// Sort by a combination of factors
				const getPriority = (model: OpenRouterModel) => {
					const id = model.id.toLowerCase();
					if (id.includes('gpt-4o')) return 10;
					if (id.includes('gpt-4')) return 9;
					if (id.includes('claude-3')) return 8;
					if (id.includes('gpt-3.5')) return 7;
					if (id.includes('gemini')) return 6;
					if (id.includes('mistral')) return 5;
					return 0;
				};

				return getPriority(b) - getPriority(a);
			});

		return json({ data: textCheckingModels });
	} catch (error) {
		console.error('OpenRouter models error:', error);
		return json({ error: 'Internal server error' }, { status: 500 });
	}
};
