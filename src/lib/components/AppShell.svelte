<script lang="ts">
	import type { Snippet } from 'svelte';
	import Header from './Header.svelte';

	interface Props {
		children: Snippet;
	}

	let { children }: Props = $props();
</script>

<div class="min-h-screen bg-gray-50 flex flex-col">
	<Header />
	<main class="flex-1 p-6">
		<div class="max-w-7xl mx-auto">
			{@render children()}
		</div>
	</main>
</div>