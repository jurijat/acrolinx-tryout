<script lang="ts">
	import { onMount } from 'svelte';
	import { AlertCircle } from 'lucide-svelte';
	import LLMInputPanel from './LLMInputPanel.svelte';
	import ResultsPanel from '../ResultsPanel.svelte';
	import HistoryPanel from '../HistoryPanel.svelte';
	import { databaseService } from '$lib/services/database-service';
	import type { OpenRouterModel } from '$lib/types/openrouter';

	let models = $state<OpenRouterModel[]>([]);
	let loading = $state(true);
	let error = $state<string | null>(null);

	onMount(async () => {
		try {
			// Initialize database for history
			await databaseService.initialize();

			// Load available models
			await loadModels();
		} catch (err) {
			console.error('Failed to initialize:', err);
			error = 'Failed to initialize LLM text checking. Please check your configuration.';
			loading = false;
		}
	});

	async function loadModels() {
		try {
			loading = true;
			const response = await fetch('/api/models/openrouter');

			if (!response.ok) {
				throw new Error('Failed to load models');
			}

			const data = await response.json();
			models = data.data || [];

			if (models.length === 0) {
				error = 'No models available. Please check your OpenRouter configuration.';
			}
		} catch (err) {
			console.error('Failed to load models:', err);
			error = 'Failed to load available models. Please check your configuration.';
		} finally {
			loading = false;
		}
	}
</script>

{#if loading}
	<div class="flex min-h-[60vh] items-center justify-center">
		<div class="text-center">
			<div
				class="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600"
			></div>
			<p class="text-gray-600">Loading LLM models...</p>
		</div>
	</div>
{:else if error}
	<div class="mb-6 rounded-lg border border-red-200 bg-red-50 p-4">
		<div class="flex">
			<div class="flex-shrink-0">
				<AlertCircle class="h-5 w-5 text-red-400" />
			</div>
			<div class="ml-3">
				<p class="text-sm text-red-800">{error}</p>
			</div>
		</div>
	</div>
{:else}
	<div class="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
		<LLMInputPanel {models} />
		<ResultsPanel />
	</div>

	<HistoryPanel />
{/if}
