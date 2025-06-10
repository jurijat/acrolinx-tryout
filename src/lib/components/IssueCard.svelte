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
			case 'error':
				return 'border-red-500';
			case 'warning':
				return 'border-yellow-500';
			default:
				return 'border-blue-500';
		}
	});
</script>

<div class="border-l-4 {severityColor()} rounded-r-lg bg-white shadow-sm">
	<button
		class="flex w-full items-start space-x-2 px-4 py-3 text-left transition-colors hover:bg-gray-50"
		onclick={onToggle}
	>
		<div class="mt-0.5 flex-shrink-0">
			{#if isExpanded}
				<ChevronDown class="h-4 w-4 text-gray-500" />
			{:else}
				<ChevronRight class="h-4 w-4 text-gray-500" />
			{/if}
		</div>

		<div class="min-w-0 flex-1">
			<div class="mb-1 flex items-center space-x-2">
				<div
					class="h-2 w-2 rounded-full"
					style="background-color: {ISSUE_COLORS[issue.goalId] || '#666'}"
				></div>
				<p class="truncate text-sm font-medium text-gray-900">
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
			<div class="mb-2 text-sm text-gray-700">
				{@html issue.guidanceHtml}
			</div>

			{#if issue.positionalInformation?.matches}
				<div class="mt-2 text-xs text-gray-500">
					Position: {issue.positionalInformation.matches[0]?.originalBegin || 'N/A'}
				</div>
			{/if}
		</div>
	{/if}
</div>
