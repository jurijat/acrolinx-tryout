import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { SapAiModel } from '$lib/types/sap-ai';
import { AICORE_RESOURCE_GROUP, AICORE_SERVICE_KEY } from '$env/static/private';

interface ServiceKey {
	serviceurls: {
		AI_API_URL: string;
	};
}

export const GET: RequestHandler = async ({ request }) => {
	try {
		// Verify authorization header
		const authHeader = request.headers.get('authorization');
		if (!authHeader || !authHeader.startsWith('Bearer ')) {
			return json({ error: 'Unauthorized' }, { status: 401 });
		}

		// Check if service key is configured
		if (!AICORE_SERVICE_KEY) {
			// Return mock models if SAP AI Core is not configured
			return json([]);
		}

		// Parse service key to get API URL
		const serviceKey: ServiceKey = JSON.parse(AICORE_SERVICE_KEY);
		const apiUrl = serviceKey.serviceurls.AI_API_URL;

		// Call SAP AI Core to get deployments
		const deploymentsUrl = `${apiUrl}/v2/lm/deployments`;
		const response = await fetch(deploymentsUrl, {
			headers: {
				Authorization: authHeader,
				'AI-Resource-Group': AICORE_RESOURCE_GROUP || 'default',
				'Content-Type': 'application/json'
			}
		});

		if (!response.ok) {
			console.error('Failed to fetch deployments:', response.status, await response.text());
			// Fall back to mock models
			return json([
				{
					id: 'gpt-4o',
					name: 'GPT-4o (Mock)',
					description: 'Configure SAP AI Core to see real models',
					capabilities: ['chat', 'grammar-check'],
					maxTokens: 8192,
					vendor: 'OpenAI',
					version: '4.0'
				}
			]);
		}

		const deploymentsData = await response.json();

		// Transform SAP AI Core deployments to our model format
		const models: SapAiModel[] =
			deploymentsData.resources?.map((deployment: any) => ({
				id: deployment.id,
				name: deployment.configurationName || deployment.scenarioId,
				description: `${deployment.scenarioId} deployment`,
				capabilities: ['chat', 'text-generation'],
				maxTokens: 4096, // Default, as SAP AI Core doesn't provide this
				vendor:
					deployment.details?.resources?.backend_details?.model?.name?.split('/')[0] || 'Unknown',
				version: deployment.details?.resources?.backend_details?.model?.version || 'latest'
			})) || [];

		// If no deployments found, return a helpful message
		if (models.length === 0) {
			return json([
				{
					id: 'no-deployments',
					name: 'No Deployments Found',
					description: 'Please deploy a model in SAP AI Core first',
					capabilities: [],
					maxTokens: 0,
					vendor: 'None',
					version: 'N/A'
				}
			]);
		}

		return json(models);
	} catch (error) {
		console.error('Failed to fetch models:', error);
		return json({ error: 'Internal server error' }, { status: 500 });
	}
};
