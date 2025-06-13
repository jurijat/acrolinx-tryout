<script lang="ts">
	import { onMount } from 'svelte';
	import { AlertCircle, FileJson, Eye } from 'lucide-svelte';
	import LLMInputPanel from './LLMInputPanel.svelte';
	import ResultsPanel from '../ResultsPanel.svelte';
	import HistoryPanel from '../HistoryPanel.svelte';
	import { databaseService } from '$lib/services/database-service';
	import type { OpenRouterModel } from '$lib/types/openrouter';

	interface RequestResponseEntry {
		id: string;
		timestamp: Date;
		request: any;
		response: any;
		model: string;
		duration: number;
	}

	let models = $state<OpenRouterModel[]>([]);
	let loading = $state(true);
	let error = $state<string | null>(null);
	let requestResponseHistory = $state<RequestResponseEntry[]>([]);
	let showRawDataModal = $state(false);
	let selectedEntry = $state<RequestResponseEntry | null>(null);
	let viewMode = $state<'request' | 'response'>('request');

	onMount(async () => {
		try {
			// Initialize database for history
			await databaseService.initialize();

			// Load available models
			await loadModels();
			
			// Subscribe to request/response events
			subscribeToRequestResponseEvents();
		} catch (err) {
			console.error('Failed to initialize:', err);
			error = 'Failed to initialize LLM text checking. Please check your configuration.';
			loading = false;
		}
	});

	async function loadModels() {
		try {
			loading = true;
			const response = await fetch('/api/models');

			if (!response.ok) {
				throw new Error('Failed to load models');
			}

			const data = await response.json();
			models = data.data || [];

			if (models.length === 0) {
				error = 'No models available. Please check your LLM provider configuration.';
			}
		} catch (err) {
			console.error('Failed to load models:', err);
			error = 'Failed to load available models. Please check your configuration.';
		} finally {
			loading = false;
		}
	}
	
	function subscribeToRequestResponseEvents() {
		// Listen for custom events from the check service
		window.addEventListener('llm-request-response', ((event: CustomEvent) => {
			const entry: RequestResponseEntry = {
				id: crypto.randomUUID(),
				timestamp: new Date(),
				...event.detail
			};
			requestResponseHistory = [...requestResponseHistory, entry];
		}) as EventListener);
	}
	
	function viewRequestResponse(entry: RequestResponseEntry, mode: 'request' | 'response') {
		selectedEntry = entry;
		viewMode = mode;
		showRawDataModal = true;
	}
	
	function downloadHistory() {
		const dataStr = JSON.stringify(requestResponseHistory, null, 2);
		const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
		
		const exportFileDefaultName = `llm-history-${new Date().toISOString()}.json`;
		
		const linkElement = document.createElement('a');
		linkElement.setAttribute('href', dataUri);
		linkElement.setAttribute('download', exportFileDefaultName);
		linkElement.click();
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
		<LLMInputPanel {models} onRequestResponse={(detail) => {
			const entry: RequestResponseEntry = {
				id: crypto.randomUUID(),
				timestamp: new Date(),
				...detail
			};
			requestResponseHistory = [...requestResponseHistory, entry];
		}} />
		<ResultsPanel />
	</div>

	<!-- Request/Response History Section -->
	{#if requestResponseHistory.length > 0}
		<div class="mb-6 rounded-lg border bg-white p-6 shadow-sm">
			<div class="flex items-center justify-between mb-4">
				<h3 class="text-lg font-semibold">Request/Response History</h3>
				<button
					onclick={downloadHistory}
					class="flex items-center px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
				>
					<FileJson class="w-4 h-4 mr-1" />
					Download History
				</button>
			</div>
			
			<div class="space-y-2">
				{#each requestResponseHistory.slice().reverse() as entry (entry.id)}
					<div class="flex items-center justify-between p-3 border rounded-md hover:bg-gray-50">
						<div class="flex-1">
							<div class="text-sm font-medium">{entry.model}</div>
							<div class="text-xs text-gray-500">
								{entry.timestamp.toLocaleString()} • {entry.duration}ms
							</div>
						</div>
						<div class="flex gap-2">
							<button
								onclick={() => viewRequestResponse(entry, 'request')}
								class="px-3 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded"
							>
								View Request
							</button>
							<button
								onclick={() => viewRequestResponse(entry, 'response')}
								class="px-3 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded"
							>
								View Response
							</button>
						</div>
					</div>
				{/each}
			</div>
		</div>
	{/if}

	<HistoryPanel />
{/if}

<!-- Raw Data Modal -->
{#if showRawDataModal && selectedEntry}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
		onclick={(e) => e.target === e.currentTarget && (showRawDataModal = false)}
	>
		<div class="w-full max-w-4xl mx-4 bg-white rounded-lg shadow-xl max-h-[80vh] flex flex-col">
			<div class="p-4 border-b flex items-center justify-between">
				<h3 class="text-lg font-semibold">
					{viewMode === 'request' ? 'Request' : 'Response'} Data
				</h3>
				<div class="flex gap-2">
					<button
						onclick={() => (viewMode = 'request')}
						class="px-3 py-1 text-sm rounded {viewMode === 'request' ? 'bg-blue-600 text-white' : 'bg-gray-100'}"
					>
						Request
					</button>
					<button
						onclick={() => (viewMode = 'response')}
						class="px-3 py-1 text-sm rounded {viewMode === 'response' ? 'bg-blue-600 text-white' : 'bg-gray-100'}"
					>
						Response
					</button>
				</div>
			</div>
			
			<div class="flex-1 overflow-auto p-4">
				<pre class="text-xs font-mono whitespace-pre-wrap bg-gray-50 p-4 rounded">{JSON.stringify(
					viewMode === 'request' ? selectedEntry.request : selectedEntry.response,
					null,
					2
				)}</pre>
			</div>
			
			<div class="p-4 border-t">
				<button
					onclick={() => (showRawDataModal = false)}
					class="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
				>
					Close
				</button>
			</div>
		</div>
	</div>
{/if}
