import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { llmTextCheckService } from '$lib/services/llm-text-check-service';
import { handleApiError } from '$lib/utils/api-error-handler';
import { LLM_PROVIDER } from '$env/static/private';

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
		const { content, contentType, guidanceProfileId, languageId, fileName, model } =
			await request.json();

		// Validate input
		if (!content) {
			return json(
				{
					error: {
						message: 'No content provided',
						code: 'NO_CONTENT'
					}
				},
				{ status: 400 }
			);
		}

		// For LLM checking, we process synchronously and return the result immediately
		// This is different from Acrolinx which returns 202 and requires polling

		// Determine the model to use
		let llmModel = model;
		if (!llmModel) {
			// Default models based on provider
			if (LLM_PROVIDER === 'openrouter') {
				llmModel = 'openai/gpt-4o-mini'; // Cost-effective model for text checking
			} else if (LLM_PROVIDER === 'openai') {
				llmModel = 'gpt-4o-mini';
			} else if (LLM_PROVIDER === 'sap-ai-core') {
				llmModel = 'gpt-4'; // Use your deployed model ID
			}
		}

		console.log(`[LLM Check] Using model: ${llmModel} with provider: ${LLM_PROVIDER}`);

		// Extract text content if it's base64 encoded
		let textContent = content;
		if (contentType === 'file' && content.includes('base64,')) {
			// Extract base64 data
			const base64Data = content.split('base64,')[1];
			textContent = Buffer.from(base64Data, 'base64').toString('utf-8');
		}

		// Perform the check
		const checkResult = await llmTextCheckService.checkText(textContent, llmModel);

		// Add additional metadata
		const enrichedResult = {
			...checkResult,
			data: {
				...checkResult,
				checkType: 'llm',
				languageId,
				guidanceProfileId,
				fileName: fileName || 'document.txt',
				debug: {
					model: llmModel,
					provider: LLM_PROVIDER,
					contentLength: textContent.length
				}
			}
		};

		// Return the result directly (no polling needed)
		return json(enrichedResult);
	} catch (error) {
		console.error('Failed to perform LLM check:', error);

		// Check if it's an LLM service error
		if (error instanceof Error) {
			return json(
				{
					error: {
						message: error.message,
						code: 'LLM_CHECK_FAILED',
						details: error.toString()
					}
				},
				{ status: 500 }
			);
		}

		return json(
			{
				error: {
					message: 'Failed to perform text quality check',
					code: 'CHECK_FAILED'
				}
			},
			{ status: 500 }
		);
	}
};
