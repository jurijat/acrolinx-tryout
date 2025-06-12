<script lang="ts">
	import { FileText, Search, ChevronDown, CheckCircle } from 'lucide-svelte';
	import DocumentInput from '../DocumentInput.svelte';
	import { checkService } from '$lib/services/check-service';
	import type { OpenRouterModel } from '$lib/types/openrouter';
	import type { CheckConfig } from '$lib/types';

	interface Props {
		models: OpenRouterModel[];
	}

	let { models }: Props = $props();

	let content = $state('');
	let fileName = $state<string | undefined>();
	let selectedModel = $state(models[0]?.id || '');
	let modelSearch = $state('');
	let showModelDropdown = $state(false);
	let dropdownRef = $state<HTMLDivElement>();

	// Fixed configuration
	const GUIDANCE_PROFILE = {
		id: 'technical',
		displayName: 'Technical'
	};

	const LANGUAGE = {
		id: 'en',
		displayName: 'English'
	};

	// Filter models based on search
	let filteredModels = $derived(
		modelSearch
			? models.filter(
					(model) =>
						model.id.toLowerCase().includes(modelSearch.toLowerCase()) ||
						model.name.toLowerCase().includes(modelSearch.toLowerCase())
				)
			: models
	);

	let selectedModelData = $derived(models.find((m) => m.id === selectedModel));

	function handleContentChange(newContent: string, newFileName?: string) {
		content = newContent;
		fileName = newFileName;
	}

	async function submitCheck() {
		if (!content || !selectedModel) return;

		const config: CheckConfig = {
			contentType: fileName ? 'file' : 'text',
			profileId: GUIDANCE_PROFILE.id,
			languageId: LANGUAGE.id,
			fileName
		};

		// Use check service which will handle LLM checking
		await checkService.submitCheck(content, config, selectedModel, 'llm');
	}

	function formatModelPrice(model: OpenRouterModel) {
		const prompt = parseFloat(model.pricing.prompt) * 1000000;
		const completion = parseFloat(model.pricing.completion) * 1000000;
		return `$${prompt.toFixed(2)}/$${completion.toFixed(2)}/M`;
	}

	function selectModel(modelId: string) {
		selectedModel = modelId;
		showModelDropdown = false;
		modelSearch = '';
	}

	// Close dropdown when clicking outside
	$effect(() => {
		if (showModelDropdown) {
			const handleClickOutside = (event: MouseEvent) => {
				if (dropdownRef && !dropdownRef.contains(event.target as Node)) {
					showModelDropdown = false;
				}
			};

			document.addEventListener('mousedown', handleClickOutside);
			return () => document.removeEventListener('mousedown', handleClickOutside);
		}
	});
</script>

<div class="rounded-lg border bg-white p-6 shadow-sm">
	<h2 class="mb-4 text-lg font-semibold">Check Configuration</h2>

	<div class="space-y-4">
		<!-- Model Selection with Search -->
		<div bind:this={dropdownRef} class="relative">
			<label for="model-select" class="mb-1 block text-sm font-medium text-gray-700">
				AI Model
			</label>
			<button
				id="model-select"
				type="button"
				class="flex w-full items-center justify-between rounded-md border border-gray-300 bg-white px-3 py-2 text-left shadow-sm hover:bg-gray-50 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
				onclick={() => (showModelDropdown = !showModelDropdown)}
			>
				<span class="block truncate">
					{selectedModelData ? selectedModelData.name : 'Select a model'}
				</span>
				<ChevronDown class="h-4 w-4 text-gray-400" />
			</button>

			{#if showModelDropdown}
				<div class="absolute z-10 mt-1 w-full rounded-md border bg-white shadow-lg">
					<!-- Search input -->
					<div class="border-b p-2">
						<div class="relative">
							<Search class="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
							<input
								type="text"
								bind:value={modelSearch}
								placeholder="Search models..."
								class="w-full rounded-md border border-gray-300 py-1.5 pr-3 pl-9 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
								onclick={(e) => e.stopPropagation()}
							/>
						</div>
					</div>

					<!-- Model list -->
					<div class="max-h-60 overflow-auto">
						{#if filteredModels.length === 0}
							<div class="px-4 py-3 text-sm text-gray-500">No models found</div>
						{:else}
							{#each filteredModels as model}
								<button
									type="button"
									class="flex w-full items-start space-x-3 px-4 py-3 text-left hover:bg-gray-50"
									onclick={() => selectModel(model.id)}
								>
									<div class="flex-1">
										<div class="flex items-center justify-between">
											<span class="text-sm font-medium">{model.name}</span>
											{#if selectedModel === model.id}
												<CheckCircle class="h-4 w-4 text-blue-600" />
											{/if}
										</div>
										<div class="mt-1 flex items-center space-x-3 text-xs text-gray-500">
											<span>{formatModelPrice(model)}</span>
											<span>•</span>
											<span>{Math.floor(model.context_length / 1000)}k context</span>
										</div>
									</div>
								</button>
							{/each}
						{/if}
					</div>
				</div>
			{/if}
		</div>

		<!-- Fixed Configuration Display -->
		<div class="grid grid-cols-2 gap-4">
			<div>
				<label class="mb-1 block text-sm font-medium text-gray-700"> Guidance Profile </label>
				<div class="flex items-center rounded-md border border-gray-200 bg-gray-50 px-3 py-2">
					<span class="text-sm text-gray-700">{GUIDANCE_PROFILE.displayName}</span>
				</div>
			</div>
			<div>
				<label class="mb-1 block text-sm font-medium text-gray-700"> Language </label>
				<div class="flex items-center rounded-md border border-gray-200 bg-gray-50 px-3 py-2">
					<span class="text-sm text-gray-700">{LANGUAGE.displayName}</span>
				</div>
			</div>
		</div>

		{#if selectedModelData}
			<div class="rounded-md bg-blue-50 p-3">
				<p class="text-xs text-blue-800">
					<strong>Selected Model:</strong>
					{selectedModelData.name}
					<br />
					<strong>Pricing:</strong>
					{formatModelPrice(selectedModelData)} tokens
					<br />
					<strong>Context:</strong>
					{Math.floor(selectedModelData.context_length / 1000)}k tokens
				</p>
			</div>
		{/if}
	</div>

	<div class="mt-6 border-t pt-6">
		<h3 class="mb-3 text-sm font-medium text-gray-700">Document</h3>
		<DocumentInput onContentChange={handleContentChange} />

		<button
			onclick={submitCheck}
			disabled={!content || !selectedModel}
			class="mt-4 flex w-full items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300"
		>
			<FileText class="mr-2 h-4 w-4" />
			Check Document
		</button>
	</div>
</div>
