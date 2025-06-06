<script lang="ts">
	import type { AcrolinxIssue } from '$lib/types';
	import IssueCard from './IssueCard.svelte';

	interface Props {
		issues: AcrolinxIssue[];
	}

	let { issues }: Props = $props();
	let expandedIssue = $state<string | null>(null);

	function toggleIssue(issueId: string) {
		expandedIssue = expandedIssue === issueId ? null : issueId;
	}
</script>

<div class="space-y-2 max-h-96 overflow-y-auto scrollbar-thin">
	{#each issues as issue, index}
		<IssueCard 
			{issue}
			isExpanded={expandedIssue === `${issue.goalId}-${index}`}
			onToggle={() => toggleIssue(`${issue.goalId}-${index}`)}
		/>
	{/each}
</div>