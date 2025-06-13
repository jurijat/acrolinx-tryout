import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { LLM_PROVIDER } from '$env/static/private';

export const GET: RequestHandler = async ({ request }) => {
	try {
		// Route to the correct models endpoint based on LLM_PROVIDER
		if (LLM_PROVIDER === 'sap-ai-core') {
			// For SAP AI Core, we need to forward the request with auth headers
			// First get the auth token from the SAP AI auth endpoint
			const authResponse = await fetch(new URL('/api/sap-ai/auth/token', request.url), {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' }
			});

			if (!authResponse.ok) {
				return json({ error: 'Failed to authenticate with SAP AI Core' }, { status: 500 });
			}

			const authData = await authResponse.json();
			
			// Now call the SAP AI models endpoint with the token
			const modelsResponse = await fetch(new URL('/api/sap-ai/models', request.url), {
				headers: {
					Authorization: `Bearer ${authData.access_token}`
				}
			});

			if (!modelsResponse.ok) {
				return json({ error: 'Failed to fetch SAP AI models' }, { status: 500 });
			}

			const sapModels = await modelsResponse.json();
			
			// Convert SAP AI models to OpenRouter format for compatibility
			const compatibleModels = sapModels.map((model: any) => ({
				id: model.id,
				name: model.name,
				description: model.description,
				pricing: {
					prompt: '0',
					completion: '0',
					image: '0'
				},
				context_length: model.maxTokens || 4096,
				architecture: {
					input_modalities: ['text'],
					output_modalities: ['text']
				},
				top_provider: {
					context_length: model.maxTokens || 4096,
					is_moderated: false
				},
				per_request_limits: {}
			}));

			return json({ data: compatibleModels });
		} else {
			// For OpenAI/OpenRouter providers, call the OpenRouter endpoint
			const openRouterResponse = await fetch(new URL('/api/models/openrouter', request.url));
			
			if (!openRouterResponse.ok) {
				return json({ error: 'Failed to fetch OpenRouter models' }, { status: 500 });
			}

			const data = await openRouterResponse.json();
			return json(data);
		}
	} catch (error) {
		console.error('Models API error:', error);
		return json({ error: 'Internal server error' }, { status: 500 });
	}
};