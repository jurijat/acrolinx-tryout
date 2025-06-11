import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { AICORE_SERVICE_KEY } from '$env/static/private';

interface ServiceKey {
	serviceurls: {
		AI_API_URL: string;
	};
	appname: string;
	clientid: string;
	clientsecret: string;
	identityzone: string;
	identityzoneid: string;
	url: string;
}

export const POST: RequestHandler = async () => {
	try {
		// Check if SAP AI Core service key is configured
		if (!AICORE_SERVICE_KEY) {
			return json({ error: 'SAP AI Core service key not configured' }, { status: 500 });
		}

		// Parse the service key
		let serviceKey: ServiceKey;
		try {
			serviceKey = JSON.parse(AICORE_SERVICE_KEY);
		} catch (e) {
			console.error('Failed to parse SAP AI Core service key:', e);
			return json({ error: 'Invalid SAP AI Core service key format' }, { status: 500 });
		}

		// OAuth2 client credentials flow
		const tokenUrl = `${serviceKey.url}/oauth/token`;
		const credentials = Buffer.from(`${serviceKey.clientid}:${serviceKey.clientsecret}`).toString(
			'base64'
		);

		// Create form data
		const formData = new URLSearchParams();
		formData.append('grant_type', 'client_credentials');

		// Some SAP services require additional parameters
		if (serviceKey.identityzone) {
			formData.append('response_type', 'token');
		}

		const response = await fetch(tokenUrl, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded',
				Authorization: `Basic ${credentials}`,
				Accept: 'application/json'
			},
			body: formData.toString()
		});

		if (!response.ok) {
			const error = await response.text();
			console.error('SAP AI Core auth error:', {
				status: response.status,
				statusText: response.statusText,
				error,
				tokenUrl,
				clientId: serviceKey.clientid
			});
			return json({ error: 'Authentication failed', details: error }, { status: response.status });
		}

		const data = await response.json();

		return json({
			access_token: data.access_token,
			token_type: data.token_type,
			expires_in: data.expires_in,
			api_url: serviceKey.serviceurls.AI_API_URL
		});
	} catch (error) {
		console.error('SAP AI Core auth error:', error);
		return json({ error: 'Internal server error' }, { status: 500 });
	}
};
