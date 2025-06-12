<script lang="ts">
	import type { CheckingCapabilities } from '$lib/types';
	import { checkService } from '$lib/services/check-service';
	import DocumentInput from './DocumentInput.svelte';
	import CheckConfiguration from './CheckConfiguration.svelte';

	interface Props {
		capabilities: CheckingCapabilities | null;
	}

	let { capabilities }: Props = $props();

	let content = $state('');
	let contentType = $state<'text' | 'file'>('text');
	let fileName = $state<string | undefined>(undefined);
	let selectedLanguage = $state('en');
	let selectedProfile = $state('');

	let checkStatus = $state('idle');

	$effect(() => {
		const unsubscribe = checkService.status.subscribe((status) => {
			checkStatus = status;
		});

		return unsubscribe;
	});

	let isValid = $derived(
		content.length > 0 &&
			selectedProfile !== '' &&
			checkStatus !== 'processing' &&
			checkStatus !== 'submitting'
	);

	async function handleCheck() {
		if (!isValid) return;

		try {
			await checkService.submitCheck(content, {
				contentType,
				profileId: selectedProfile,
				languageId: selectedLanguage,
				fileName
			}, undefined, 'acrolinx');
		} catch (error) {
			console.error('Check failed:', error);
		}
	}

	function handleContentChange(newContent: string, type: 'text' | 'file', newFileName?: string) {
		content = newContent;
		contentType = type;
		fileName = newFileName;
	}

	function handleConfigChange(config: { language: string; profile: string }) {
		selectedLanguage = config.language;
		selectedProfile = config.profile;
	}
</script>

<div class="rounded-lg bg-white p-6 shadow">
	<h2 class="mb-4 text-lg font-semibold">Document Input</h2>

	<DocumentInput onContentChange={handleContentChange} />

	{#if capabilities}
		<CheckConfiguration {capabilities} onConfigChange={handleConfigChange} />
	{/if}

	<button
		class="mt-4 w-full rounded-lg bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
		disabled={!isValid}
		onclick={handleCheck}
	>
		{#if checkStatus === 'submitting'}
			Submitting...
		{:else if checkStatus === 'processing'}
			Checking... (0%)
		{:else}
			Check Document
		{/if}
	</button>
</div>
