import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	PUBLIC_ACROLINX_BASE_URL,
	PUBLIC_ACROLINX_CLIENT_SIGNATURE,
	PUBLIC_ACROLINX_CLIENT_VERSION
} from '$env/static/public';
import { ACROLINX_API_TOKEN } from '$env/static/private';
import { handleApiError } from '$lib/utils/api-error-handler';

export const POST: RequestHandler = async () => {
	try {
		// Verify the token works by calling the index endpoint
		const response = await fetch(`${PUBLIC_ACROLINX_BASE_URL}/api/v1`, {
			headers: {
				'X-Acrolinx-Auth': ACROLINX_API_TOKEN,
				'X-Acrolinx-Client': `${PUBLIC_ACROLINX_CLIENT_SIGNATURE}; ${PUBLIC_ACROLINX_CLIENT_VERSION}`,
				'X-Acrolinx-Client-Locale': 'en'
			}
		});

		if (!response.ok) {
			return handleApiError(response);
		}

		// Token is valid, return it encrypted for client storage
		// In a real app, you'd encrypt this token
		return json({
			data: {
				token: ACROLINX_API_TOKEN,
				user: {
					id: 'api-user',
					username: 'API User'
				}
			}
		});
	} catch (error) {
		console.error('Token verification failed:', error);
		return json(
			{
				error: {
					message: 'Failed to verify API token',
					code: 'TOKEN_VERIFICATION_FAILED'
				}
			},
			{ status: 500 }
		);
	}
};
