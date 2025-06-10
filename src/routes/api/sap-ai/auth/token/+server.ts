import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { env } from '$env/dynamic/private';

export const POST: RequestHandler = async () => {
	try {
		// Check if SAP AI Core credentials are configured
		if (!env.SAP_AI_CORE_AUTH_URL || !env.SAP_AI_CORE_CLIENT_ID || !env.SAP_AI_CORE_CLIENT_SECRET) {
			return json({ error: 'SAP AI Core credentials not configured' }, { status: 500 });
		}

		// OAuth2 client credentials flow
		const tokenUrl = `${env.SAP_AI_CORE_AUTH_URL}/oauth/token`;
		const credentials = Buffer.from(
			`${env.SAP_AI_CORE_CLIENT_ID}:${env.SAP_AI_CORE_CLIENT_SECRET}`
		).toString('base64');

		const response = await fetch(tokenUrl, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded',
				Authorization: `Basic ${credentials}`
			},
			body: 'grant_type=client_credentials'
		});

		if (!response.ok) {
			const error = await response.text();
			console.error('SAP AI Core auth error:', error);
			return json({ error: 'Authentication failed' }, { status: response.status });
		}

		const data = await response.json();

		return json({
			access_token: data.access_token,
			token_type: data.token_type,
			expires_in: data.expires_in
		});
	} catch (error) {
		console.error('SAP AI Core auth error:', error);
		return json({ error: 'Internal server error' }, { status: 500 });
	}
};
