<script lang="ts">
	import { authService } from '$lib/services/auth-service';
	import { Settings } from 'lucide-svelte';
	import SettingsModal from './SettingsModal.svelte';

	let showSettings = $state(false);

	// Subscribe to auth state
	let authState = $state<{
		isAuthenticated: boolean;
		user: { id: string; username: string } | null;
	}>({
		isAuthenticated: false,
		user: null
	});

	$effect(() => {
		const unsubscribe = authService.subscribe((state) => {
			authState = state;
		});

		return unsubscribe;
	});
</script>

<header class="border-b border-gray-200 bg-white shadow-sm">
	<div class="flex items-center justify-between px-6 py-4">
		<div class="flex items-center space-x-4">
			<div class="h-8 w-8 rounded bg-blue-600"></div>
			<h1 class="text-xl font-semibold text-gray-900">Acrolinx Tester</h1>
		</div>
		<div class="flex items-center space-x-4">
			<button
				class="rounded-lg p-2 transition-colors hover:bg-gray-100"
				onclick={() => (showSettings = true)}
				aria-label="Settings"
			>
				<Settings class="h-5 w-5" />
			</button>
			{#if authState.isAuthenticated && authState.user}
				<div class="flex items-center space-x-2">
					<div class="flex h-8 w-8 items-center justify-center rounded-full bg-gray-300">
						<span class="text-sm font-medium text-gray-700">
							{authState.user.username.charAt(0).toUpperCase()}
						</span>
					</div>
					<span class="text-sm text-gray-700">{authState.user.username}</span>
				</div>
			{/if}
		</div>
	</div>
</header>

<SettingsModal show={showSettings} onClose={() => (showSettings = false)} />
