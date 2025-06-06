<script lang="ts">
	import type { AcrolinxIssue } from '$lib/types';
	import { ChevronDown, ChevronRight } from 'lucide-svelte';
	import { ISSUE_COLORS } from '$lib/config/constants';

	interface Props {
		issue: AcrolinxIssue;
		isExpanded: boolean;
		onToggle: () => void;
	}

	let { issue, isExpanded, onToggle }: Props = $props();

	// Remove HTML tags for display
	function stripHtml(html: string): string {
		const tmp = document.createElement('div');
		tmp.innerHTML = html;
		return tmp.textContent || tmp.innerText || '';
	}

	let severity = $derived(() => {
		// Determine severity based on issue type or other criteria
		if (issue.issueType === 'error') return 'error';
		if (issue.issueType === 'warning') return 'warning';
		return 'info';
	});

	let severityColor = $derived(() => {
		switch (severity()) {
			case 'error': return 'border-red-500';
			case 'warning': return 'border-yellow-500';
			default: return 'border-blue-500';
		}
	});
</script>

<div class="border-l-4 {severityColor()} bg-white rounded-r-lg shadow-sm">
	<button 
		class="w-full px-4 py-3 flex items-start space-x-2 hover:bg-gray-50 transition-colors text-left"
		onclick={onToggle}
	>
		<div class="flex-shrink-0 mt-0.5">
			{#if isExpanded}
				<ChevronDown class="w-4 h-4 text-gray-500" />
			{:else}
				<ChevronRight class="w-4 h-4 text-gray-500" />
			{/if}
		</div>
		
		<div class="flex-1 min-w-0">
			<div class="flex items-center space-x-2 mb-1">
				<div 
					class="w-2 h-2 rounded-full"
					style="background-color: {ISSUE_COLORS[issue.goalId] || '#666'}"
				></div>
				<p class="text-sm font-medium text-gray-900 truncate">
					{stripHtml(issue.displayNameHtml)}
				</p>
			</div>
			
			<p class="text-sm text-gray-600">
				"{issue.displaySurface}"
			</p>
		</div>
	</button>
	
	{#if isExpanded}
		<div class="px-4 pb-3 pl-10">
			<div class="text-sm text-gray-700 mb-2">
				{@html issue.guidanceHtml}
			</div>
			
			{#if issue.positionalInformation?.matches}
				<div class="text-xs text-gray-500 mt-2">
					Position: {issue.positionalInformation.matches[0]?.originalBegin || 'N/A'}
				</div>
			{/if}
		</div>
	{/if}
</div>