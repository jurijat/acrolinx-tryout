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

<div class="rounded-lg bg-white p-6 shadow">
	<h2 class="mb-4 text-lg font-semibold">Check Results</h2>

	{#if status === 'idle'}
		<div class="py-12 text-center text-gray-500">
			<svg
				class="mx-auto mb-4 h-12 w-12 text-gray-400"
				fill="none"
				viewBox="0 0 24 24"
				stroke="currentColor"
			>
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
				/>
			</svg>
			<p>Submit a document to see results</p>
		</div>
	{:else if status === 'submitting' || status === 'processing'}
		<div class="py-12 text-center">
			<div class="mb-4 inline-flex h-16 w-16 items-center justify-center">
				<div class="h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600"></div>
			</div>
			<p class="font-medium text-gray-700">
				{status === 'submitting' ? 'Submitting document...' : 'Checking document...'}
			</p>
			{#if status === 'processing' && progress > 0}
				<div class="mx-auto mt-4 max-w-xs">
					<div class="h-2 w-full rounded-full bg-gray-200">
						<div
							class="h-2 rounded-full bg-blue-600 transition-all duration-300"
							style="width: {progress}%"
						></div>
					</div>
					<p class="mt-2 text-sm text-gray-600">{progress}% complete</p>
				</div>
			{/if}
		</div>
	{:else if status === 'failed'}
		<div class="py-12 text-center">
			<div class="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
				<svg class="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M6 18L18 6M6 6l12 12"
					/>
				</svg>
			</div>
			<p class="font-medium text-red-600">Check Failed</p>
			{#if error}
				<p class="mt-2 text-sm text-gray-600">{error}</p>
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
						<div class="rounded-lg border border-gray-200 p-3">
							<div class="flex items-center justify-between">
								<div class="flex items-center space-x-2">
									<div
										class="h-3 w-3 rounded-full"
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
					<h3 class="mb-3 font-medium">Issue Details</h3>
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
