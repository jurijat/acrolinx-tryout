import { writable, get, derived } from 'svelte/store';
import type { CheckConfig, CheckResult, CheckingCapabilities, CheckRecord } from '$lib/types';
import { authService } from './auth-service';
import { databaseService } from './database-service';
import { APP_CONFIG } from '$lib/config/constants';

type CheckStatus = 'idle' | 'submitting' | 'processing' | 'completed' | 'failed';

interface CheckState {
	status: CheckStatus;
	progress: number;
	currentCheckId: string | null;
	result: CheckResult | null;
	error: string | null;
	debugData?: {
		request?: unknown;
		response?: unknown;
	};
}

class CheckService {
	private state = writable<CheckState>({
		status: 'idle',
		progress: 0,
		currentCheckId: null,
		result: null,
		error: null
	});

	private capabilities = writable<CheckingCapabilities | null>(null);
	private pollTimeout: NodeJS.Timeout | null = null;

	// Derived stores for reactive access
	status = derived(this.state, ($state) => $state.status);
	progress = derived(this.state, ($state) => $state.progress);
	result = derived(this.state, ($state) => $state.result);
	error = derived(this.state, ($state) => $state.error);
	checkingCapabilities = derived(this.capabilities, ($caps) => $caps);

	async initialize() {
		await this.loadCapabilities();
	}

	async loadCapabilities() {
		try {
			const response = await fetch('/api/checking/capabilities', {
				headers: authService.getAuthHeaders()
			});

			if (!response.ok) {
				throw new Error('Failed to load capabilities');
			}

			const data = await response.json();
			this.capabilities.set(data.data);
		} catch (error) {
			console.error('Failed to load capabilities:', error);
			throw error;
		}
	}

	async submitCheck(content: string, config: CheckConfig, model?: string, provider?: 'acrolinx' | 'llm'): Promise<void> {
		// Cancel any ongoing poll
		if (this.pollTimeout) {
			clearTimeout(this.pollTimeout);
			this.pollTimeout = null;
		}

		this.state.update((state) => ({
			...state,
			status: 'submitting',
			error: null,
			progress: 0
		}));

		const startTime = Date.now();
		let recordId: string | undefined;

		try {
			// Get profile name from capabilities
			const capabilities = get(this.capabilities);
			const profile = capabilities?.guidanceProfiles.find((p) => p.id === config.profileId);

			// Try to save to history (but don't fail the check if it doesn't work)
			try {
				// Initialize database if needed
				if (!get(databaseService.isInitialized)) {
					await databaseService.initialize();
				}

				// Create initial history record
				recordId = crypto.randomUUID();
				await databaseService.saveCheckRecord({
					id: recordId,
					timestamp: new Date(),
					content,
					contentType: config.contentType,
					guidanceProfileId: config.profileId,
					guidanceProfileName: profile?.displayName || 'Unknown',
					language: config.languageId,
					status: 'pending'
				});
			} catch (dbError) {
				console.warn('Failed to save to history:', dbError);
				// Continue with the check even if history fails
			}

			const response = await fetch('/api/checking/submit', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					...authService.getAuthHeaders()
				},
				body: JSON.stringify({
					content,
					contentType: config.contentType,
					guidanceProfileId: config.profileId,
					languageId: config.languageId,
					fileName: config.fileName,
					model,
					provider
				})
			});

			if (!response.ok) {
				const error = await response.json();
				console.log('[CheckService] API Error Response:', error);
				throw new Error(error.error?.message || 'Check submission failed');
			}

			const result = await response.json();
			console.log('[CheckService] API Response:', JSON.stringify(result, null, 2));
			console.log('[CheckService] Checking conditions:');
			console.log('  - result.data?.status:', result.data?.status);
			console.log('  - result.data?.result exists:', !!result.data?.result);
			console.log('  - provider:', provider);
			console.log('  - Full result.data:', result.data);

			// Check if this is an LLM result (returns immediately)
			if (result.data?.status === 'completed' && result.data?.result) {
				// LLM check completed immediately
				console.log('[CheckService] Detected LLM result - processing immediately');
				const checkResult = result.data.result;
				const duration = Date.now() - startTime;

				this.state.update((state) => ({
					...state,
					status: 'completed',
					result: checkResult,
					progress: 100,
					debugData: result.debug
				}));

				// Update history record
				if (recordId) {
					try {
						await databaseService.saveCheckRecord({
							id: recordId,
							status: 'completed',
							checkId: checkResult.id,
							score: checkResult.score,
							issues: checkResult.issues || [],
							duration
						});
					} catch (dbError) {
						console.warn('Failed to update history:', dbError);
					}
				}
			} else {
				// Traditional Acrolinx check - needs polling
				const checkId = result.checkId || result.data?.id;

				if (!checkId) {
					throw new Error('No check ID received from server');
				}

				// Store request data from the response
				const requestData = result.debug?.request;

				this.state.update((state) => ({
					...state,
					currentCheckId: checkId,
					status: 'processing',
					debugData: {
						request: requestData || {
							content: content.substring(0, 1000) + '...',
							guidanceProfileId: config.profileId,
							languageId: config.languageId
						}
					}
				}));

				// Start polling for results
				await this.pollForResults(checkId, recordId, startTime);
			}
		} catch (error) {
			this.state.update((state) => ({
				...state,
				status: 'failed',
				error: error instanceof Error ? error.message : 'Check failed'
			}));

			// Update history record as failed
			if (recordId) {
				try {
					await databaseService.saveCheckRecord({
						id: recordId,
						status: 'failed',
						duration: Date.now() - startTime
					});
				} catch (dbError) {
					console.warn('Failed to update history:', dbError);
				}
			}

			throw error;
		}
	}

	private async pollForResults(
		checkId: string,
		recordId?: string,
		checkStartTime?: number
	): Promise<void> {
		const pollStartTime = Date.now();

		const poll = async () => {
			try {
				const response = await fetch(`/api/checking/poll/${checkId}`, {
					headers: authService.getAuthHeaders()
				});

				if (!response.ok) {
					throw new Error('Failed to poll check status');
				}

				const result = await response.json();

				if (result.status === 'processing') {
					this.state.update((state) => ({
						...state,
						progress: result.progress || state.progress
					}));

					// Check timeout
					if (Date.now() - pollStartTime > APP_CONFIG.CHECK_TIMEOUT) {
						throw new Error('Check timed out');
					}

					// Continue polling
					this.pollTimeout = setTimeout(() => poll(), result.retryAfter * 1000);
				} else if (result.status === 'completed') {
					// Merge debug data from response with existing request data
					const currentState = get(this.state);
					const mergedResult = {
						...result.data,
						debug: {
							request: currentState.debugData?.request,
							response: result.data?.debug?.response
						}
					};

					this.state.update((state) => ({
						...state,
						status: 'completed',
						progress: 100,
						result: mergedResult
					}));

					// Save completed check to history
					if (recordId && result.data) {
						try {
							await databaseService.saveCheckRecord({
								id: recordId,
								status: 'completed',
								score: result.data.score,
								checkId: checkId,
								duration: checkStartTime ? Date.now() - checkStartTime : undefined,
								issues: result.data.issues,
								goals: result.data.goals,
								metrics: result.data.metrics
							});
						} catch (dbError) {
							console.warn('Failed to save completed check to history:', dbError);
						}
					}
				}
			} catch (error) {
				this.state.update((state) => ({
					...state,
					status: 'failed',
					error: error instanceof Error ? error.message : 'Polling failed'
				}));
			}
		};

		await poll();
	}

	reset() {
		this.state.set({
			status: 'idle',
			progress: 0,
			currentCheckId: null,
			result: null,
			error: null
		});
	}

	async cancelCheck() {
		const currentState = get(this.state);
		if (currentState.currentCheckId && currentState.status === 'processing') {
			// In a real implementation, you'd call an API to cancel the check
			this.reset();
		}
	}
}

export const checkService = new CheckService();
