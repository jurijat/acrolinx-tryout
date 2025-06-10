<script lang="ts">
	import type { Snippet } from 'svelte';
	import Header from './Header.svelte';

	interface Props {
		children: Snippet;
	}

	let { children }: Props = $props();
</script>

<div class="flex min-h-screen flex-col bg-gray-50">
	<Header />
	<main class="flex-1 p-6">
		<div class="mx-auto max-w-7xl">
			{@render children()}
		</div>
	</main>
</div>
