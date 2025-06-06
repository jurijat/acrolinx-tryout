<script lang="ts">
	import { authService } from '$lib/services/auth-service';
	import { Settings } from 'lucide-svelte';
	import SettingsModal from './SettingsModal.svelte';

	let showSettings = $state(false);
	
	// Subscribe to auth state
	let authState = $state<{ isAuthenticated: boolean; user: { id: string; username: string } | null }>({ 
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

<header class="bg-white shadow-sm border-b border-gray-200">
	<div class="px-6 py-4 flex items-center justify-between">
		<div class="flex items-center space-x-4">
			<div class="w-8 h-8 bg-blue-600 rounded"></div>
			<h1 class="text-xl font-semibold text-gray-900">Acrolinx Tester</h1>
		</div>
		<div class="flex items-center space-x-4">
			<button 
				class="p-2 hover:bg-gray-100 rounded-lg transition-colors"
				onclick={() => showSettings = true}
				aria-label="Settings"
			>
				<Settings class="w-5 h-5" />
			</button>
			{#if authState.isAuthenticated && authState.user}
				<div class="flex items-center space-x-2">
					<div class="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
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

<SettingsModal show={showSettings} onClose={() => showSettings = false} />