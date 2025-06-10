<script lang="ts">
	import { sapAiService } from '$lib/services/sap-ai-service';
	import type { SapAiModel } from '$lib/types/sap-ai';

	let availableModels = $state<SapAiModel[]>([]);
	let selectedModelId = $state<string>('');
	let isLoading = $state(false);

	// Subscribe to service state
	$effect(() => {
		const unsubscribe = sapAiService.availableModels.subscribe((models) => {
			availableModels = models;
		});
		return unsubscribe;
	});

	$effect(() => {
		const unsubscribe = sapAiService.selectedModel.subscribe((model) => {
			selectedModelId = model?.id || '';
		});
		return unsubscribe;
	});

	$effect(() => {
		const unsubscribe = sapAiService.isProcessing.subscribe((processing) => {
			isLoading = processing;
		});
		return unsubscribe;
	});

	function handleModelChange(event: Event) {
		const target = event.target as HTMLSelectElement;
		sapAiService.selectModel(target.value);
	}

	async function refreshModels() {
		try {
			await sapAiService.loadModels();
		} catch (error) {
			console.error('Failed to refresh models:', error);
		}
	}
</script>

<div class="rounded-lg border border-gray-200 bg-white p-4">
	<div class="mb-4 flex items-center justify-between">
		<h3 class="text-sm font-medium text-gray-900">Model Selection</h3>
		<button
			onclick={refreshModels}
			disabled={isLoading}
			class="text-sm text-blue-600 hover:text-blue-500 disabled:opacity-50"
		>
			{#if isLoading}
				<span class="inline-flex items-center">
					<svg class="mr-2 -ml-1 h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
						<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"
						></circle>
						<path
							class="opacity-75"
							fill="currentColor"
							d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
						></path>
					</svg>
					Loading...
				</span>
			{:else}
				Refresh
			{/if}
		</button>
	</div>

	<div class="space-y-3">
		<div>
			<label for="model-select" class="block text-sm font-medium text-gray-700">
				Choose a model
			</label>
			<select
				id="model-select"
				value={selectedModelId}
				onchange={handleModelChange}
				disabled={isLoading || availableModels.length === 0}
				class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 disabled:opacity-50 sm:text-sm"
			>
				<option value="">Select a model...</option>
				{#each availableModels as model}
					<option value={model.id}>
						{model.name} ({model.vendor})
					</option>
				{/each}
			</select>
		</div>

		{#if selectedModelId}
			{@const selectedModel = availableModels.find((m) => m.id === selectedModelId)}
			{#if selectedModel}
				<div class="rounded-md bg-gray-50 p-3">
					<h4 class="text-xs font-medium text-gray-900">{selectedModel.name}</h4>
					{#if selectedModel.description}
						<p class="mt-1 text-xs text-gray-600">{selectedModel.description}</p>
					{/if}
					<div class="mt-2 space-y-1">
						<p class="text-xs text-gray-500">
							Max tokens: {selectedModel.maxTokens.toLocaleString()}
						</p>
						<p class="text-xs text-gray-500">
							Capabilities: {selectedModel.capabilities.join(', ')}
						</p>
					</div>
				</div>
			{/if}
		{/if}
	</div>
</div>
