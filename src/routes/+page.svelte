<script lang="ts">
	import AppShell from '$lib/components/AppShell.svelte';
	import TabNavigation from '$lib/components/TabNavigation.svelte';
	import AcrolinxTab from '$lib/components/acrolinx/AcrolinxTab.svelte';
	import SapAiTab from '$lib/components/sap-ai/SapAiTab.svelte';

	let activeTab = $state<'acrolinx' | 'sap-ai'>('sap-ai');

	function handleTabChange(tab: 'acrolinx' | 'sap-ai') {
		activeTab = tab;
	}
</script>

<AppShell>
	<div class="mb-6">
		<TabNavigation {activeTab} onTabChange={handleTabChange} />
	</div>

	<div class="tab-content">
		{#if activeTab === 'acrolinx'}
			<AcrolinxTab />
		{:else if activeTab === 'sap-ai'}
			<SapAiTab />
		{/if}
	</div>
</AppShell>
