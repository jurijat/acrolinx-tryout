import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	PUBLIC_ACROLINX_BASE_URL,
	PUBLIC_ACROLINX_CLIENT_SIGNATURE,
	PUBLIC_ACROLINX_CLIENT_VERSION
} from '$env/static/public';
import { ACROLINX_API_TOKEN } from '$env/static/private';
import { handleApiError } from '$lib/utils/api-error-handler';

export const GET: RequestHandler = async ({ params, request }) => {
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

	const checkId = params.id;

	try {
		// For LLM checks (identified by the checkId prefix), they complete immediately
		if (checkId.startsWith('llm-check-')) {
			// LLM checks are synchronous and complete immediately
			// If the client is polling, it means something went wrong
			console.warn('[Check Poll] Unexpected polling for LLM check:', checkId);
			return json({
				status: 'failed',
				error: {
					message: 'LLM checks should not require polling',
					code: 'LLM_POLL_ERROR'
				}
			});
		}
		const response = await fetch(`${PUBLIC_ACROLINX_BASE_URL}/api/v1/checking/checks/${checkId}`, {
			headers: {
				'X-Acrolinx-Auth': ACROLINX_API_TOKEN,
				'X-Acrolinx-Client': `${PUBLIC_ACROLINX_CLIENT_SIGNATURE}; ${PUBLIC_ACROLINX_CLIENT_VERSION}`,
				'X-Acrolinx-Client-Locale': 'en'
			}
		});

		if (response.status === 202) {
			const result = await response.json();
			// Still processing
			return json({
				status: 'processing',
				progress: result.progress?.percent || 0,
				message: result.progress?.message,
				retryAfter: result.progress?.retryAfter || 5
			});
		}

		if (response.status === 200) {
			const result = await response.json();
			// Check complete
			return json({
				status: 'completed',
				data: transformCheckResult(result.data || result, result)
			});
		}

		// For error cases, read the body once and pass it to handleApiError
		const errorBody = await response.json().catch(() => null);
		return handleApiError(response, errorBody);
	} catch (error) {
		console.error('Failed to poll check status:', error);
		return json(
			{
				error: {
					message: 'Failed to get check status',
					code: 'CHECK_POLL_FAILED'
				}
			},
			{ status: 500 }
		);
	}
};

// Transform Acrolinx result to our format
function transformCheckResult(apiResult: any, rawResponse?: any) {
	return {
		id: apiResult.id,
		score: apiResult.quality?.score || 0,
		status: apiResult.quality?.status || 'unknown',
		goals: apiResult.goals || apiResult.quality?.scoresByGoal || [],
		issues: apiResult.issues || [],
		metrics: apiResult.quality?.metrics || [],
		counts: apiResult.counts || {},
		debug: {
			response: rawResponse
		}
	};
}
