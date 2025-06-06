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
				languageId: selectedLanguage
			});
		} catch (error) {
			console.error('Check failed:', error);
		}
	}

	function handleContentChange(newContent: string, type: 'text' | 'file') {
		content = newContent;
		contentType = type;
	}

	function handleConfigChange(config: { language: string; profile: string }) {
		selectedLanguage = config.language;
		selectedProfile = config.profile;
	}
</script>

<div class="bg-white rounded-lg shadow p-6">
	<h2 class="text-lg font-semibold mb-4">Document Input</h2>
	
	<DocumentInput onContentChange={handleContentChange} />
	
	{#if capabilities}
		<CheckConfiguration 
			{capabilities}
			onConfigChange={handleConfigChange}
		/>
	{/if}
	
	<button 
		class="w-full mt-4 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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