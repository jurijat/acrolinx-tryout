<script lang="ts">
	import { X } from 'lucide-svelte';
	import { authService } from '$lib/services/auth-service';
	import { DEFAULT_SETTINGS } from '$lib/config/constants';

	interface Props {
		show: boolean;
		onClose: () => void;
	}

	let { show, onClose }: Props = $props();

	let apiUrl = $state(DEFAULT_SETTINGS.apiUrl);
	let apiToken = $state('');
	let showToken = $state(false);
	let theme = $state<'light' | 'dark' | 'system'>('system');
	let saving = $state(false);
	let message = $state('');

	async function handleSave() {
		saving = true;
		message = '';

		try {
			// If token is provided, try to authenticate with it
			if (apiToken) {
				await authService.signInWithCustomToken(apiToken);
				message = 'Settings saved successfully!';
				setTimeout(() => {
					onClose();
				}, 500);
			} else {
				message = 'Please provide an API token';
			}
		} catch (error) {
			message = error instanceof Error ? error.message : 'Failed to save settings';
		} finally {
			saving = false;
		}
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			onClose();
		}
	}
</script>

{#if show}
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div 
		class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
		onclick={(e) => e.target === e.currentTarget && onClose()}
		onkeydown={handleKeydown}
	>
		<div class="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[90vh] flex flex-col">
			<div class="flex items-center justify-between p-6 border-b flex-shrink-0">
				<h2 class="text-xl font-semibold">Settings</h2>
				<button 
					class="p-1 hover:bg-gray-100 rounded transition-colors"
					onclick={onClose}
					aria-label="Close"
				>
					<X class="w-5 h-5" />
				</button>
			</div>

			<div class="p-6 space-y-4 overflow-y-auto flex-1">
				<div>
					<label for="api-url" class="block text-sm font-medium text-gray-700 mb-1">
						API URL
					</label>
					<input 
						id="api-url"
						type="url"
						class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
						bind:value={apiUrl}
						disabled
					/>
					<p class="mt-1 text-xs text-gray-500">
						This is configured in environment variables
					</p>
				</div>

				<div>
					<label for="api-token" class="block text-sm font-medium text-gray-700 mb-1">
						API Token
					</label>
					<div class="relative">
						<input 
							id="api-token"
							type={showToken ? "text" : "password"}
							class="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
							bind:value={apiToken}
							placeholder="Enter API token"
						/>
						<button
							type="button"
							class="absolute inset-y-0 right-0 pr-3 flex items-center"
							onclick={() => showToken = !showToken}
						>
							<svg class="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								{#if showToken}
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
								{:else}
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
								{/if}
							</svg>
						</button>
					</div>
					<p class="mt-1 text-xs text-gray-500">
						Enter your Acrolinx API token here
					</p>
				</div>

				<div>
					<label for="theme" class="block text-sm font-medium text-gray-700 mb-1">
						Theme
					</label>
					<select 
						id="theme"
						class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
						bind:value={theme}
					>
						<option value="light">Light</option>
						<option value="dark">Dark</option>
						<option value="system">System</option>
					</select>
				</div>

				{#if message}
					<div class="p-3 rounded-md {message.includes('success') ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'} text-sm">
						{message}
					</div>
				{/if}
			</div>

			<div class="flex justify-end gap-3 p-6 border-t flex-shrink-0">
				<button 
					class="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
					onclick={onClose}
				>
					Cancel
				</button>
				<button 
					class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
					onclick={handleSave}
					disabled={saving}
				>
					{saving ? 'Saving...' : 'Save'}
				</button>
			</div>
		</div>
	</div>
{/if}