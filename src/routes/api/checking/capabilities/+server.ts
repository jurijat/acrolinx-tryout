import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	PUBLIC_ACROLINX_BASE_URL,
	PUBLIC_ACROLINX_CLIENT_SIGNATURE,
	PUBLIC_ACROLINX_CLIENT_VERSION
} from '$env/static/public';
import { ACROLINX_API_TOKEN } from '$env/static/private';
import { handleApiError } from '$lib/utils/api-error-handler';

export const GET: RequestHandler = async ({ request }) => {
	const authHeader = request.headers.get('Authorization');

	if (!authHeader || !authHeader.startsWith('Bearer ')) {
		return json(
			{
				error: {
					message: 'No authentication token provided',
					code: 'NO_TOKEN'
				}
			},
			{ status: 401 }
		);
	}

	try {
		const response = await fetch(`${PUBLIC_ACROLINX_BASE_URL}/api/v1/checking/capabilities`, {
			headers: {
				'X-Acrolinx-Auth': ACROLINX_API_TOKEN,
				'X-Acrolinx-Client': `${PUBLIC_ACROLINX_CLIENT_SIGNATURE}; ${PUBLIC_ACROLINX_CLIENT_VERSION}`,
				'X-Acrolinx-Client-Locale': 'en'
			}
		});

		if (!response.ok) {
			console.error('Failed to fetch capabilities:', {
				status: response.status,
				statusText: response.statusText
			});
			const errorBody = await response.json().catch(() => null);
			return handleApiError(response, errorBody);
		}

		const capabilities = await response.json();

		return json(capabilities);
	} catch (error) {
		console.error('Failed to fetch capabilities:', error);
		return json(
			{
				error: {
					message: 'Failed to fetch checking capabilities',
					code: 'CAPABILITIES_FETCH_FAILED'
				}
			},
			{ status: 500 }
		);
	}
};
