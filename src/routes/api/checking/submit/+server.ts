import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	PUBLIC_ACROLINX_BASE_URL,
	PUBLIC_ACROLINX_CLIENT_SIGNATURE,
	PUBLIC_ACROLINX_CLIENT_VERSION
} from '$env/static/public';
import { ACROLINX_API_TOKEN } from '$env/static/private';
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
		const { content, contentType, guidanceProfileId, languageId, fileName } = await request.json();

		// Determine file extension based on content
		let reference = 'document.txt';
		let format = 'TEXT';

		// For file uploads, use the actual filename if provided
		if (contentType === 'file' && fileName) {
			reference = fileName;
			// Determine format based on file extension
			if (fileName.endsWith('.json')) {
				format = 'JSON';
			} else if (fileName.endsWith('.xml')) {
				format = 'XML';
			} else if (fileName.endsWith('.html') || fileName.endsWith('.htm')) {
				format = 'HTML';
			} else if (fileName.endsWith('.md')) {
				format = 'MARKDOWN';
			} else if (fileName.endsWith('.docx')) {
				format = 'DOCX';
			} else if (fileName.endsWith('.pdf')) {
				format = 'PDF';
			}
		} else if (contentType === 'text') {
			// Try to detect JSON content
			if (content.trim().startsWith('{')) {
				try {
					JSON.parse(content);
					reference = 'document.json';
					format = 'JSON';
				} catch (e) {
					// Not valid JSON, keep as text
				}
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
				'X-Acrolinx-Auth': ACROLINX_API_TOKEN,
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
