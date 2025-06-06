<script lang="ts">
	import { ChevronDown, ChevronRight, Copy, Check } from 'lucide-svelte';

	interface Props {
		request?: unknown;
		response?: unknown;
	}

	let { request, response }: Props = $props();

	let showRequest = $state(false);
	let showResponse = $state(false);
	let copiedRequest = $state(false);
	let copiedResponse = $state(false);

	function formatJson(data: unknown): string {
		return JSON.stringify(data, null, 2);
	}

	async function copyToClipboard(text: string, type: 'request' | 'response') {
		try {
			await navigator.clipboard.writeText(text);
			if (type === 'request') {
				copiedRequest = true;
				setTimeout(() => (copiedRequest = false), 2000);
			} else {
				copiedResponse = true;
				setTimeout(() => (copiedResponse = false), 2000);
			}
		} catch (err) {
			console.error('Failed to copy:', err);
		}
	}
</script>

<div class="space-y-4 rounded-lg bg-gray-50 p-4">
	<h3 class="text-sm font-semibold text-gray-700">API Debug Information</h3>

	{#if request}
		<div class="rounded-lg border border-gray-200 bg-white">
			<div class="flex items-center justify-between px-4 py-3">
				<button
					class="flex flex-1 items-center space-x-2 -mx-4 px-4 py-3 transition-colors hover:bg-gray-50"
					onclick={() => (showRequest = !showRequest)}
				>
					{#if showRequest}
						<ChevronDown class="h-4 w-4 text-gray-500" />
					{:else}
						<ChevronRight class="h-4 w-4 text-gray-500" />
					{/if}
					<span class="text-sm font-medium">Request Sent to Acrolinx</span>
				</button>
				<button
					class="rounded p-1 transition-colors hover:bg-gray-200 ml-2"
					onclick={() => copyToClipboard(formatJson(request), 'request')}
				>
					{#if copiedRequest}
						<Check class="h-4 w-4 text-green-600" />
					{:else}
						<Copy class="h-4 w-4 text-gray-600" />
					{/if}
				</button>
			</div>

			{#if showRequest}
				<div class="border-t p-4">
					<pre
						class="max-h-96 overflow-x-auto overflow-y-auto rounded bg-gray-50 p-3 text-xs">{formatJson(
							request
						)}</pre>
				</div>
			{/if}
		</div>
	{/if}

	{#if response}
		<div class="rounded-lg border border-gray-200 bg-white">
			<div class="flex items-center justify-between px-4 py-3">
				<button
					class="flex flex-1 items-center space-x-2 -mx-4 px-4 py-3 transition-colors hover:bg-gray-50"
					onclick={() => (showResponse = !showResponse)}
				>
					{#if showResponse}
						<ChevronDown class="h-4 w-4 text-gray-500" />
					{:else}
						<ChevronRight class="h-4 w-4 text-gray-500" />
					{/if}
					<span class="text-sm font-medium">Response from Acrolinx</span>
				</button>
				<button
					class="rounded p-1 transition-colors hover:bg-gray-200 ml-2"
					onclick={() => copyToClipboard(formatJson(response), 'response')}
				>
					{#if copiedResponse}
						<Check class="h-4 w-4 text-green-600" />
					{:else}
						<Copy class="h-4 w-4 text-gray-600" />
					{/if}
				</button>
			</div>

			{#if showResponse}
				<div class="border-t p-4">
					<pre
						class="max-h-96 overflow-x-auto overflow-y-auto rounded bg-gray-50 p-3 text-xs">{formatJson(
							response
						)}</pre>
				</div>
			{/if}
		</div>
	{/if}
</div>
