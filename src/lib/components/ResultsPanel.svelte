<script lang="ts">
	import { checkService } from '$lib/services/check-service';
	import ScoreDisplay from './ScoreDisplay.svelte';
	import IssuesList from './IssuesList.svelte';
	import ApiDebugPanel from './ApiDebugPanel.svelte';
	import { ISSUE_COLORS } from '$lib/config/constants';
	import type { CheckResult } from '$lib/types';

	let result = $state<CheckResult | null>(null);
	let status = $state<'idle' | 'submitting' | 'processing' | 'completed' | 'failed'>('idle');
	let error = $state<string | null>(null);
	let progress = $state(0);
	
	$effect(() => {
		const unsubscribeResult = checkService.result.subscribe((r) => {
			result = r;
		});
		
		const unsubscribeStatus = checkService.status.subscribe((s) => {
			status = s;
		});
		
		const unsubscribeError = checkService.error.subscribe((e) => {
			error = e;
		});
		
		const unsubscribeProgress = checkService.progress.subscribe((p) => {
			progress = p;
		});
		
		return () => {
			unsubscribeResult();
			unsubscribeStatus();
			unsubscribeError();
			unsubscribeProgress();
		};
	});

	// Group issues by goal
	let issuesByGoal = $derived(() => {
		if (!result?.issues) return new Map();
		
		const grouped = new Map<string, typeof result.issues>();
		result.issues.forEach((issue) => {
			const goalIssues = grouped.get(issue.goalId) || [];
			goalIssues.push(issue);
			grouped.set(issue.goalId, goalIssues);
		});
		
		return grouped;
	});
</script>

<div class="bg-white rounded-lg shadow p-6">
	<h2 class="text-lg font-semibold mb-4">Check Results</h2>
	
	{#if status === 'idle'}
		<div class="text-center py-12 text-gray-500">
			<svg class="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
			</svg>
			<p>Submit a document to see results</p>
		</div>
	{:else if status === 'submitting' || status === 'processing'}
		<div class="text-center py-12">
			<div class="inline-flex items-center justify-center w-16 h-16 mb-4">
				<div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
			</div>
			<p class="text-gray-700 font-medium">
				{status === 'submitting' ? 'Submitting document...' : 'Checking document...'}
			</p>
			{#if status === 'processing' && progress > 0}
				<div class="mt-4 max-w-xs mx-auto">
					<div class="w-full bg-gray-200 rounded-full h-2">
						<div 
							class="bg-blue-600 h-2 rounded-full transition-all duration-300"
							style="width: {progress}%"
						></div>
					</div>
					<p class="text-sm text-gray-600 mt-2">{progress}% complete</p>
				</div>
			{/if}
		</div>
	{:else if status === 'failed'}
		<div class="text-center py-12">
			<div class="mx-auto flex items-center justify-center w-12 h-12 rounded-full bg-red-100 mb-4">
				<svg class="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
				</svg>
			</div>
			<p class="text-red-600 font-medium">Check Failed</p>
			{#if error}
				<p class="text-sm text-gray-600 mt-2">{error}</p>
			{/if}
		</div>
	{:else if status === 'completed' && result}
		<div>
			<ScoreDisplay score={result.score} />
			
			<!-- Issue Categories -->
			<div class="mt-6 space-y-3">
				<h3 class="font-medium text-gray-900">Issues by Category</h3>
				{#each result.goals as goal}
					{@const goalIssues = issuesByGoal().get(goal.id) || []}
					{#if goalIssues.length > 0}
						<div class="border border-gray-200 rounded-lg p-3">
							<div class="flex items-center justify-between">
								<div class="flex items-center space-x-2">
									<div 
										class="w-3 h-3 rounded-full"
										style="background-color: {ISSUE_COLORS[goal.id] || '#666'}"
									></div>
									<span class="font-medium">{goal.id}</span>
								</div>
								<span class="text-sm text-gray-600">{goalIssues.length} issues</span>
							</div>
						</div>
					{/if}
				{/each}
			</div>
			
			<!-- Issue Details -->
			{#if result.issues.length > 0}
				<div class="mt-6">
					<h3 class="font-medium mb-3">Issue Details</h3>
					<IssuesList issues={result.issues} />
				</div>
			{/if}
			
			<!-- API Debug Information -->
			{#if result.debug?.request || result.debug?.response}
				<div class="mt-6">
					<ApiDebugPanel request={result.debug.request} response={result.debug.response} />
				</div>
			{/if}
		</div>
	{/if}
</div>