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

<div class="scrollbar-thin max-h-96 space-y-2 overflow-y-auto">
	{#each issues as issue, index}
		<IssueCard
			{issue}
			isExpanded={expandedIssue === `${issue.goalId}-${index}`}
			onToggle={() => toggleIssue(`${issue.goalId}-${index}`)}
		/>
	{/each}
</div>
