import { json } from '@sveltejs/kit';

export interface ApiError {
	message: string;
	code: string;
	details?: any;
	retryAfter?: number;
}

export async function handleApiError(response: Response, errorBody?: any) {
	const contentType = response.headers.get('content-type');

	let error = errorBody;

	if (!error && contentType?.includes('application/json')) {
		try {
			error = await response.json();
		} catch (e) {
			// Body already consumed or invalid JSON
			error = null;
		}
	}

	if (error) {
		// Handle specific Acrolinx error types
		switch (error.error?.type) {
			case 'auth':
				return json(
					{
						error: {
							message: 'Authentication failed. Please sign in again.',
							code: 'AUTH_FAILED'
						}
					},
					{ status: 401 }
				);

			case 'clientSignatureRejected':
				return json(
					{
						error: {
							message: 'Invalid API signature. Please check configuration.',
							code: 'INVALID_SIGNATURE'
						}
					},
					{ status: 403 }
				);

			case 'guidanceProfileDoesntExist':
				return json(
					{
						error: {
							message: 'Selected style guide not available.',
							code: 'INVALID_PROFILE'
						}
					},
					{ status: 400 }
				);

			case 'queueLimitExceeded':
				const retryAfter = response.headers.get('Retry-After');
				return json(
					{
						error: {
							message: `Server busy. Please try again in ${retryAfter} seconds.`,
							code: 'RATE_LIMITED',
							retryAfter: parseInt(retryAfter || '60')
						}
					},
					{ status: 429 }
				);

			case 'contentTooLarge':
				return json(
					{
						error: {
							message: 'The document is too large. Please try with a smaller document.',
							code: 'CONTENT_TOO_LARGE'
						}
					},
					{ status: 413 }
				);

			case 'customFieldsIncorrect':
				return json(
					{
						error: {
							message: 'Custom field values are incorrect.',
							code: 'INVALID_CUSTOM_FIELDS',
							details: error.error?.validationDetails
						}
					},
					{ status: 400 }
				);

			default:
				return json(
					{
						error: {
							message: error.error?.detail || 'An error occurred',
							code: error.error?.type || 'UNKNOWN_ERROR'
						}
					},
					{ status: response.status }
				);
		}
	}

	// Non-JSON error response
	return json(
		{
			error: {
				message: 'Server error. Please try again later.',
				code: 'SERVER_ERROR'
			}
		},
		{ status: response.status }
	);
}
