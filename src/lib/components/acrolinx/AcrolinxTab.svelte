<script lang="ts">
	import { onMount } from 'svelte';
	import InputPanel from '../InputPanel.svelte';
	import ResultsPanel from '../ResultsPanel.svelte';
	import HistoryPanel from '../HistoryPanel.svelte';
	import { checkService } from '$lib/services/check-service';
	import { authService } from '$lib/services/auth-service';
	import { databaseService } from '$lib/services/database-service';
	import type { CheckingCapabilities } from '$lib/types';

	let capabilities = $state(null) as CheckingCapabilities | null;
	let loading = $state(true);
	let error = $state<string | null>(null);
	let isAuthenticated = $state(false);

	$effect(() => {
		const unsubscribe = checkService.checkingCapabilities.subscribe((caps) => {
			capabilities = caps;
		});

		return unsubscribe;
	});

	$effect(() => {
		const unsubscribe = authService.subscribe((state) => {
			isAuthenticated = state.isAuthenticated;
			if (state.isAuthenticated && error === 'Not authenticated. Please check your API token.') {
				error = null;
				loadCapabilities();
			}
		});

		return unsubscribe;
	});

	async function loadCapabilities() {
		loading = true;
		error = null;
		try {
			if (!capabilities) {
				await checkService.loadCapabilities();
			}
		} catch (err) {
			console.error('Failed to load capabilities:', err);
			error = 'Failed to load Acrolinx capabilities. Please check your configuration.';
		} finally {
			loading = false;
		}
	}

	onMount(async () => {
		try {
			// Wait for auth to be ready
			if (!authService.isAuthenticated) {
				error = 'Not authenticated. Please check your API token.';
				loading = false;
				return;
			}

			// Initialize database
			await databaseService.initialize();

			await loadCapabilities();
		} catch (err) {
			console.error('Failed to initialize:', err);
			error = 'Failed to load Acrolinx capabilities. Please check your configuration.';
			loading = false;
		}
	});
</script>

{#if loading}
	<div class="flex min-h-[60vh] items-center justify-center">
		<div class="text-center">
			<div
				class="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600"
			></div>
			<p class="text-gray-600">Loading Acrolinx...</p>
		</div>
	</div>
{:else if error}
	<div class="mb-6 rounded-lg border border-red-200 bg-red-50 p-4">
		<div class="flex">
			<div class="flex-shrink-0">
				<svg class="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
					<path
						fill-rule="evenodd"
						d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
						clip-rule="evenodd"
					/>
				</svg>
			</div>
			<div class="ml-3">
				<p class="text-sm text-red-800">{error}</p>
			</div>
		</div>
	</div>
{:else}
	<div class="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
		<InputPanel {capabilities} />
		<ResultsPanel />
	</div>

	<HistoryPanel />
{/if}
