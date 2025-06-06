import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { PUBLIC_ACROLINX_API_TOKEN } from '$env/static/public';

export const POST: RequestHandler = async ({ request }) => {
	const authHeader = request.headers.get('Authorization');

	if (!authHeader || !authHeader.startsWith('Bearer ')) {
		return json(
			{
				error: {
					message: 'No token provided',
					code: 'NO_TOKEN'
				}
			},
			{ status: 401 }
		);
	}

	const token = authHeader.substring(7);

	try {
		// Check for custom token in body
		const body = await request.json().catch(() => ({}));
		const customToken = body.customToken;

		// Verify the token (either from header or custom)
		const tokenToVerify = customToken || token;

		// In a real app, you'd decrypt and verify the token
		// For now, just check if it's either our API token or a valid JWT-like token
		if (
			tokenToVerify === PUBLIC_ACROLINX_API_TOKEN ||
			(tokenToVerify && tokenToVerify.split('.').length === 3)
		) {
			return json({
				data: {
					user: {
						id: 'api-user',
						username: 'API User'
					}
				}
			});
		}
	} catch (error) {
		// Continue to error response
	}

	return json(
		{
			error: {
				message: 'Invalid token',
				code: 'INVALID_TOKEN'
			}
		},
		{ status: 401 }
	);
};
