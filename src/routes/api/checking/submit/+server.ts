import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	PUBLIC_ACROLINX_BASE_URL,
	PUBLIC_ACROLINX_CLIENT_SIGNATURE,
	PUBLIC_ACROLINX_CLIENT_VERSION
} from '$env/static/public';
import { ACROLINX_API_TOKEN } from '$env/static/private';
import { handleApiError } from '$lib/utils/api-error-handler';
import { llmTextCheckService } from '$lib/services/llm-text-check-service';
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
		const { content, contentType, guidanceProfileId, languageId, fileName, model, provider, systemPrompt } =
			await request.json();

		console.log('[Check Submit] Request params:', { provider, model });

		// Check if we should use LLM-based checking
		if (provider === 'llm') {
			// Use LLM-based checking
			console.log('[Check Submit] Using LLM-based text checking');

			// Determine the model to use
			let llmModel = model;
			if (!llmModel) {
				throw new Error('NO MODEL SPECIFIED');
			}

			// Extract text content if it's base64 encoded
			let textContent = content;
			if (contentType === 'file' && content.includes('base64,')) {
				const base64Data = content.split('base64,')[1];
				textContent = Buffer.from(base64Data, 'base64').toString('utf-8');
			}

			// Perform the check synchronously
			try {
				console.log('[Check Submit] About to call LLM service with model:', llmModel);
				console.log('[Check Submit] Text content length:', textContent.length);

				const checkResultWithMetadata = await llmTextCheckService.checkText(textContent, llmModel, systemPrompt);
				const checkResult = checkResultWithMetadata.result;
				console.log('[Check Submit] LLM check completed successfully');
				console.log('[Check Submit] LLM check result:', JSON.stringify(checkResult, null, 2));

				// Return result in Acrolinx-compatible format
				const fullResponse = {
					data: {
						id: checkResult.id,
						checkId: checkResult.id,
						status: 'completed',
						progress: 100,
						result: checkResult,
						report: {
							scorecard: {
								score: checkResult.score,
								status: checkResult.status
							},
							extractedText: textContent
						}
					},
					debug: {
						provider: 'llm',
						model: llmModel,
						contentLength: textContent.length
					},
					requestMetadata: checkResultWithMetadata.requestMetadata
				};
				console.log(
					'[Check Submit] Returning LLM response:',
					JSON.stringify(fullResponse, null, 2)
				);
				return json(fullResponse);
			} catch (llmError) {
				console.error('[Check Submit] LLM check failed:', llmError);
				// Return error response
				return json(
					{
						error: {
							message: llmError instanceof Error ? llmError.message : 'LLM check failed',
							code: 'LLM_CHECK_FAILED'
						},
						debug: {
							provider: 'llm',
							model: llmModel,
							error: llmError instanceof Error ? llmError.message : 'Unknown error'
						}
					},
					{ status: 500 }
				);
			}
		}

		// Otherwise use traditional Acrolinx API
		console.log('[Check Submit] Using Acrolinx API (provider:', provider || 'default', ')');

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
