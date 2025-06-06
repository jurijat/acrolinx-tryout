import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	PUBLIC_ACROLINX_API_TOKEN,
	PUBLIC_ACROLINX_BASE_URL,
	PUBLIC_ACROLINX_CLIENT_SIGNATURE,
	PUBLIC_ACROLINX_CLIENT_VERSION
} from '$env/static/public';
import { handleApiError } from '$lib/utils/api-error-handler';

export const POST: RequestHandler = async ({ request }) => {
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
		const { content, contentType, guidanceProfileId, languageId } = await request.json();

		// Determine file extension based on content
		let reference = 'document.txt';
		let format = 'TEXT';

		// Try to detect JSON content
		if (contentType === 'text' && content.trim().startsWith('{')) {
			try {
				JSON.parse(content);
				reference = 'document.json';
				format = 'JSON';
			} catch (e) {
				// Not valid JSON, keep as text
			}
		}

		// Prepare check request
		const checkRequest = {
			content: contentType === 'file' ? content : content, // File should be base64 encoded
			contentEncoding: contentType === 'file' ? 'base64' : 'none',
			document: {
				reference: reference
			},
			guidanceProfileId,
			languageId,
			reportTypes: ['scorecard', 'extractedText'],
			contentFormat: format,
			checkType: 'interactive'
		};

		const response = await fetch(`${PUBLIC_ACROLINX_BASE_URL}/api/v1/checking/checks`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'X-Acrolinx-Auth': PUBLIC_ACROLINX_API_TOKEN,
				'X-Acrolinx-Client': `${PUBLIC_ACROLINX_CLIENT_SIGNATURE}; ${PUBLIC_ACROLINX_CLIENT_VERSION}`,
				'X-Acrolinx-Client-Locale': 'en'
			},
			body: JSON.stringify(checkRequest)
		});

		if (response.status === 202) {
			const result = await response.json();
			return json({
				checkId: result.data.id,
				status: 'processing',
				links: result.links,
				debug: {
					request: checkRequest
				}
			});
		}

		if (!response.ok) {
			const errorBody = await response.json().catch(() => null);
			return handleApiError(response, errorBody);
		}

		// Immediate result (unlikely for checks)
		const result = await response.json();
		return json(result);
	} catch (error) {
		console.error('Failed to submit check:', error);
		return json(
			{
				error: {
					message: 'Failed to submit document for checking',
					code: 'CHECK_SUBMIT_FAILED'
				}
			},
			{ status: 500 }
		);
	}
};
