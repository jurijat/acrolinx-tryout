<script lang="ts">
	import { sapAiService } from '$lib/services/sap-ai-service';
	import ChatMessage from './ChatMessage.svelte';
	import type { ChatMessage as ChatMessageType } from '$lib/types/sap-ai';

	let messages = $state<ChatMessageType[]>([]);
	let inputValue = $state('');
	let isProcessing = $state(false);
	let error = $state<string | null>(null);
	let selectedModel = $state<{ name: string } | null>(null);
	let messagesContainer: HTMLDivElement;

	// Subscribe to service state
	$effect(() => {
		const unsubscribe = sapAiService.chatHistory.subscribe((history) => {
			messages = history;
			// Scroll to bottom when new messages arrive
			if (messagesContainer) {
				setTimeout(() => {
					messagesContainer.scrollTop = messagesContainer.scrollHeight;
				}, 100);
			}
		});
		return unsubscribe;
	});

	$effect(() => {
		const unsubscribe = sapAiService.isProcessing.subscribe((processing) => {
			isProcessing = processing;
		});
		return unsubscribe;
	});

	$effect(() => {
		const unsubscribe = sapAiService.error.subscribe((err) => {
			error = err;
		});
		return unsubscribe;
	});

	$effect(() => {
		const unsubscribe = sapAiService.selectedModel.subscribe((model) => {
			selectedModel = model;
		});
		return unsubscribe;
	});

	async function handleSubmit(event: Event) {
		event.preventDefault();

		if (!inputValue.trim() || isProcessing) {
			return;
		}

		const message = inputValue.trim();
		inputValue = '';

		try {
			await sapAiService.sendChatMessage(message);
		} catch (err) {
			console.error('Failed to send message:', err);
		}
	}

	function clearChat() {
		sapAiService.clearChatHistory();
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Enter' && !event.shiftKey) {
			event.preventDefault();
			handleSubmit(event);
		}
	}
</script>

<div class="flex h-full flex-col rounded-lg border border-gray-200 bg-white">
	<!-- Header -->
	<div class="border-b border-gray-200 px-4 py-3">
		<div class="flex items-center justify-between">
			<h3 class="text-sm font-medium text-gray-900">
				Chat with {selectedModel?.name || 'AI Model'}
			</h3>
			{#if messages.length > 0}
				<button onclick={clearChat} class="text-sm text-gray-500 hover:text-gray-700">
					Clear chat
				</button>
			{/if}
		</div>
	</div>

	<!-- Messages -->
	<div bind:this={messagesContainer} class="flex-1 space-y-4 overflow-y-auto p-4">
		{#if messages.length === 0}
			<div class="mt-8 text-center text-gray-500">
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
						d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
					/>
				</svg>
				<p class="mt-2 text-sm">No messages yet. Start a conversation!</p>
			</div>
		{:else}
			{#each messages as message}
				<ChatMessage {message} />
			{/each}
		{/if}

		{#if isProcessing}
			<div class="flex justify-start">
				<div class="rounded-lg bg-gray-100 px-4 py-2">
					<div class="flex space-x-1">
						<div class="h-2 w-2 animate-bounce rounded-full bg-gray-400"></div>
						<div
							class="h-2 w-2 animate-bounce rounded-full bg-gray-400"
							style="animation-delay: 0.1s"
						></div>
						<div
							class="h-2 w-2 animate-bounce rounded-full bg-gray-400"
							style="animation-delay: 0.2s"
						></div>
					</div>
				</div>
			</div>
		{/if}
	</div>

	<!-- Error display -->
	{#if error}
		<div class="border-t border-red-200 bg-red-50 px-4 py-2">
			<p class="text-sm text-red-600">{error}</p>
		</div>
	{/if}

	<!-- Input -->
	<form onsubmit={handleSubmit} class="border-t border-gray-200 p-4">
		<div class="flex gap-2">
			<textarea
				bind:value={inputValue}
				onkeydown={handleKeydown}
				disabled={isProcessing || !selectedModel}
				placeholder={selectedModel ? 'Type your message...' : 'Please select a model first'}
				rows="1"
				class="flex-1 resize-none rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 disabled:opacity-50 sm:text-sm"
			></textarea>
			<button
				type="submit"
				disabled={isProcessing || !inputValue.trim() || !selectedModel}
				class="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
			>
				{#if isProcessing}
					<svg class="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
						<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"
						></circle>
						<path
							class="opacity-75"
							fill="currentColor"
							d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
						></path>
					</svg>
				{:else}
					Send
				{/if}
			</button>
		</div>
	</form>
</div>
