<script lang="ts">
	import { onMount } from 'svelte';
	import ModelSelector from './ModelSelector.svelte';
	import ChatInterface from './ChatInterface.svelte';
	import { sapAiService } from '$lib/services/sap-ai-service';

	let loading = $state(true);
	let error = $state<string | null>(null);
	let activeView = $state<'chat' | 'grammar'>('chat');

	onMount(async () => {
		try {
			// Initialize the service on mount (client-side only)
			await sapAiService.initialize();
			loading = false;
		} catch (err) {
			console.error('Failed to initialize SAP AI:', err);
			error = 'Failed to connect to SAP AI Core. Please check your configuration.';
			loading = false;
		}
	});

	// Subscribe to service errors
	$effect(() => {
		const unsubscribe = sapAiService.error.subscribe((err) => {
			if (err && err !== error) {
				error = err;
			}
		});
		return unsubscribe;
	});
</script>

<div class="space-y-6">
	{#if loading}
		<div class="flex min-h-[60vh] items-center justify-center">
			<div class="text-center">
				<div
					class="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600"
				></div>
				<p class="text-gray-600">Loading SAP AI Core...</p>
			</div>
		</div>
	{:else}
		<!-- View selector -->
		<div class="border-b border-gray-200">
			<nav class="-mb-px flex space-x-8">
				<button
					onclick={() => (activeView = 'chat')}
					class="border-b-2 px-1 py-2 text-sm font-medium whitespace-nowrap {activeView === 'chat'
						? 'border-blue-500 text-blue-600'
						: 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'}"
				>
					Chat
				</button>
				<button
					onclick={() => (activeView = 'grammar')}
					class="border-b-2 px-1 py-2 text-sm font-medium whitespace-nowrap {activeView ===
					'grammar'
						? 'border-blue-500 text-blue-600'
						: 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'}"
				>
					Grammar Check
				</button>
			</nav>
		</div>

		<div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
			<!-- Model selector (always visible) -->
			<div class="lg:col-span-1">
				<ModelSelector />
			</div>

			<!-- Main content area -->
			<div class="lg:col-span-2">
				{#if activeView === 'chat'}
					<div class="h-[600px]">
						<ChatInterface />
					</div>
				{:else}
					<div class="rounded-lg border-2 border-dashed border-gray-300 p-12">
						<div class="text-center">
							<svg
								class="mx-auto h-12 w-12 text-gray-400"
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
								/>
							</svg>
							<h3 class="mt-2 text-sm font-medium text-gray-900">Grammar Check</h3>
							<p class="mt-1 text-sm text-gray-500">
								Advanced grammar checking with error highlighting coming soon.
							</p>
						</div>
					</div>
				{/if}
			</div>
		</div>

		{#if error}
			<div class="rounded-lg border border-red-200 bg-red-50 p-4">
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
						<button
							onclick={() => {
								error = null;
								sapAiService.clearError();
							}}
							class="mt-1 text-sm text-red-600 hover:text-red-500"
						>
							Dismiss
						</button>
					</div>
				</div>
			</div>
		{/if}
	{/if}
</div>
