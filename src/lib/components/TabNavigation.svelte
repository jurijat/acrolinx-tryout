<script lang="ts">
	interface Props {
		activeTab: 'acrolinx' | 'sap-ai';
		onTabChange: (tab: 'acrolinx' | 'sap-ai') => void;
	}

	let { activeTab, onTabChange }: Props = $props();

	const tabs = [
		{ id: 'acrolinx', label: 'Acrolinx', icon: '📝' },
		{ id: 'sap-ai', label: 'SAP AI Core', icon: '🤖' }
	] as const;
</script>

<div class="border-b border-gray-200">
	<nav class="-mb-px flex space-x-8" aria-label="Tabs">
		{#each tabs as tab}
			<button
				onclick={() => onTabChange(tab.id)}
				class="border-b-2 px-1 py-4 text-sm font-medium whitespace-nowrap transition-colors {activeTab ===
				tab.id
					? 'border-blue-500 text-blue-600'
					: 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'}"
			>
				<span class="flex items-center gap-2">
					<span>{tab.icon}</span>
					{tab.label}
				</span>
			</button>
		{/each}
	</nav>
</div>
