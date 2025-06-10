<script lang="ts">
	import type { ChatMessage } from '$lib/types/sap-ai';

	interface Props {
		message: ChatMessage;
	}

	let { message }: Props = $props();
	let copied = $state(false);

	function copyToClipboard() {
		navigator.clipboard.writeText(message.content);
		copied = true;
		setTimeout(() => {
			copied = false;
		}, 2000);
	}

	function formatTime(date: Date): string {
		return new Date(date).toLocaleTimeString('en-US', {
			hour: '2-digit',
			minute: '2-digit'
		});
	}
</script>

<div class="flex {message.role === 'user' ? 'justify-end' : 'justify-start'}">
	<div
		class="max-w-[70%] rounded-lg px-4 py-2 {message.role === 'user'
			? 'bg-blue-600 text-white'
			: 'bg-gray-100 text-gray-900'}"
	>
		<div class="flex items-start justify-between gap-2">
			<div class="flex-1">
				<p class="text-xs opacity-75 {message.role === 'user' ? 'text-blue-100' : 'text-gray-500'}">
					{message.role === 'user' ? 'You' : 'Assistant'} • {formatTime(message.timestamp)}
				</p>
				<div class="prose prose-sm mt-1 max-w-none {message.role === 'user' ? 'prose-invert' : ''}">
					{@html message.content}
				</div>
			</div>
			{#if message.role === 'assistant'}
				<button
					onclick={copyToClipboard}
					class="ml-2 text-gray-400 transition-colors hover:text-gray-600"
					title={copied ? 'Copied!' : 'Copy message'}
				>
					{#if copied}
						<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M5 13l4 4L19 7"
							/>
						</svg>
					{:else}
						<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
							/>
						</svg>
					{/if}
				</button>
			{/if}
		</div>
	</div>
</div>
