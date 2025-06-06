<script lang="ts">
	import '../app.css';
	import { onMount } from 'svelte';
	import { checkService } from '$lib/services/check-service';
	import { authService } from '$lib/services/auth-service';

	let { children } = $props();

	onMount(async () => {
		// Initialize services
		await authService.initialize();
		
		// Check for custom token first
		const customToken = localStorage.getItem('custom_api_token');
		if (customToken && !authService.isAuthenticated) {
			try {
				await authService.signInWithCustomToken(customToken);
			} catch (error) {
				console.error('Failed to authenticate with custom token:', error);
				// Clear invalid custom token
				localStorage.removeItem('custom_api_token');
			}
		}
		
		// If still not authenticated, try the API token from env
		if (!authService.isAuthenticated) {
			try {
				await authService.signInWithToken();
			} catch (error) {
				console.error('Failed to authenticate with API token:', error);
			}
		}

		// Initialize check service if authenticated
		if (authService.isAuthenticated) {
			await checkService.initialize();
		}
	});
</script>

{@render children()}
