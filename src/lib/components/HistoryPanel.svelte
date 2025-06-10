<script lang="ts">
	import { onMount } from 'svelte';
	import { get } from 'svelte/store';
	import type { CheckRecord } from '$lib/types';
	import { databaseService } from '$lib/services/database-service';
	import { checkService } from '$lib/services/check-service';
	import { Calendar, FileText, Globe, BarChart, Trash2, Eye } from 'lucide-svelte';

	let records = $state<CheckRecord[]>([]);
	let loading = $state(true);
	let error = $state<string | null>(null);
	let selectedRecord = $state<CheckRecord | null>(null);
	let showDetails = $state(false);
	let statistics = $state<{
		totalChecks: number;
		averageScore: number;
		checksByProfile: Array<{ profile: string; count: number }>;
	}>({
		totalChecks: 0,
		averageScore: 0,
		checksByProfile: []
	});

	onMount(async () => {
		await loadHistory();
	});

	async function loadHistory() {
		loading = true;
		error = null;

		try {
			// Initialize database if needed
			if (!get(databaseService.isInitialized)) {
				await databaseService.initialize();
			}

			// Load history and statistics
			const [historyRecords, stats] = await Promise.all([
				databaseService.getCheckHistory(20),
				databaseService.getStatistics()
			]);

			records = historyRecords;
			statistics = stats;
		} catch (err) {
			console.error('Failed to load history:', err);
			error = err instanceof Error ? err.message : 'Failed to load check history';
		} finally {
			loading = false;
		}
	}

	async function deleteRecord(id: string) {
		if (!confirm('Are you sure you want to delete this check?')) return;

		try {
			await databaseService.deleteCheck(id);
			await loadHistory();
		} catch (err) {
			console.error('Failed to delete record:', err);
		}
	}

	async function viewDetails(record: CheckRecord) {
		selectedRecord = record;
		showDetails = true;
	}

	function formatDate(date: Date): string {
		return new Intl.DateTimeFormat('en-US', {
			month: 'short',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		}).format(date);
	}

	function getScoreColor(score: number): string {
		if (score >= 80) return 'text-green-600';
		if (score >= 60) return 'text-yellow-600';
		return 'text-red-600';
	}

	function getStatusBadge(status: string) {
		switch (status) {
			case 'completed':
				return 'bg-green-100 text-green-800';
			case 'failed':
				return 'bg-red-100 text-red-800';
			default:
				return 'bg-gray-100 text-gray-800';
		}
	}
</script>

<div class="rounded-lg bg-white p-6 shadow">
	<div class="mb-6 flex items-center justify-between">
		<h2 class="text-lg font-semibold">Check History</h2>
		<button
			class="text-sm text-gray-600 hover:text-gray-900"
			onclick={loadHistory}
			disabled={loading}
		>
			Refresh
		</button>
	</div>

	{#if loading}
		<div class="py-8 text-center">
			<div class="mx-auto h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600"></div>
			<p class="mt-2 text-gray-600">Loading history...</p>
		</div>
	{:else if error}
		<div class="rounded-lg border border-red-200 bg-red-50 p-4">
			<p class="text-sm text-red-800">{error}</p>
		</div>
	{:else}
		<!-- Statistics Summary -->
		<div class="mb-6 grid grid-cols-3 gap-4">
			<div class="rounded-lg bg-gray-50 p-4">
				<div class="mb-1 flex items-center space-x-2 text-gray-600">
					<BarChart class="h-4 w-4" />
					<span class="text-xs">Total Checks</span>
				</div>
				<p class="text-2xl font-semibold">{statistics.totalChecks}</p>
			</div>
			<div class="rounded-lg bg-gray-50 p-4">
				<div class="mb-1 flex items-center space-x-2 text-gray-600">
					<BarChart class="h-4 w-4" />
					<span class="text-xs">Average Score</span>
				</div>
				<p class="text-2xl font-semibold {getScoreColor(statistics.averageScore)}">
					{statistics.averageScore}
				</p>
			</div>
			<div class="rounded-lg bg-gray-50 p-4">
				<div class="mb-1 flex items-center space-x-2 text-gray-600">
					<Globe class="h-4 w-4" />
					<span class="text-xs">Top Profile</span>
				</div>
				<p class="truncate text-sm font-medium">
					{statistics.checksByProfile[0]?.profile || 'N/A'}
				</p>
			</div>
		</div>

		<!-- History List -->
		{#if records.length === 0}
			<p class="py-8 text-center text-gray-500">No checks yet. Submit a document to get started!</p>
		{:else}
			<div class="space-y-2">
				{#each records as record}
					<div class="rounded-lg border p-4 transition-colors hover:bg-gray-50">
						<div class="flex items-start justify-between">
							<div class="min-w-0 flex-1">
								<div class="mb-1 flex items-center space-x-2">
									<FileText class="h-4 w-4 text-gray-400" />
									<span class="truncate text-sm font-medium">
										{record.fileName || 'Text Input'}
									</span>
									<span class="rounded-full px-2 py-0.5 text-xs {getStatusBadge(record.status)}">
										{record.status}
									</span>
								</div>

								<div class="flex items-center space-x-4 text-xs text-gray-600">
									<span class="flex items-center space-x-1">
										<Calendar class="h-3 w-3" />
										<span>{formatDate(record.timestamp)}</span>
									</span>
									<span>{record.guidanceProfileName}</span>
									{#if record.score !== undefined}
										<span class="font-medium {getScoreColor(record.score)}">
											Score: {record.score}
										</span>
									{/if}
									{#if record.issues}
										<span>{record.issues.length} issues</span>
									{/if}
								</div>
							</div>

							<div class="ml-4 flex items-center space-x-1">
								<button
									class="rounded p-1 transition-colors hover:bg-gray-200"
									onclick={() => viewDetails(record)}
									title="View details"
								>
									<Eye class="h-4 w-4 text-gray-600" />
								</button>
								<button
									class="rounded p-1 transition-colors hover:bg-gray-200"
									onclick={() => deleteRecord(record.id)}
									title="Delete"
								>
									<Trash2 class="h-4 w-4 text-gray-600" />
								</button>
							</div>
						</div>
					</div>
				{/each}
			</div>
		{/if}
	{/if}
</div>

<!-- Details Modal -->
{#if showDetails && selectedRecord}
	<div
		class="bg-opacity-50 fixed inset-0 z-50 flex items-center justify-center bg-black"
		onclick={(e) => e.target === e.currentTarget && (showDetails = false)}
	>
		<div
			class="mx-4 flex max-h-[80vh] w-full max-w-2xl flex-col overflow-hidden rounded-lg bg-white shadow-xl"
		>
			<div class="border-b p-6">
				<h3 class="text-lg font-semibold">Check Details</h3>
			</div>

			<div class="flex-1 overflow-y-auto p-6">
				<div class="space-y-4">
					<div>
						<h4 class="mb-1 text-sm font-medium text-gray-700">Document</h4>
						<p class="text-sm">{selectedRecord.fileName || 'Text Input'}</p>
					</div>

					<div class="grid grid-cols-2 gap-4">
						<div>
							<h4 class="mb-1 text-sm font-medium text-gray-700">Profile</h4>
							<p class="text-sm">{selectedRecord.guidanceProfileName}</p>
						</div>
						<div>
							<h4 class="mb-1 text-sm font-medium text-gray-700">Language</h4>
							<p class="text-sm">{selectedRecord.language}</p>
						</div>
					</div>

					{#if selectedRecord.score !== undefined}
						<div>
							<h4 class="mb-1 text-sm font-medium text-gray-700">Score</h4>
							<p class="text-2xl font-semibold {getScoreColor(selectedRecord.score)}">
								{selectedRecord.score}
							</p>
						</div>
					{/if}

					<div>
						<h4 class="mb-1 text-sm font-medium text-gray-700">Content Preview</h4>
						<div class="max-h-40 overflow-y-auto rounded bg-gray-50 p-3">
							<pre class="text-xs whitespace-pre-wrap">{selectedRecord.content.substring(
									0,
									500
								)}...</pre>
						</div>
					</div>
				</div>
			</div>

			<div class="border-t p-6">
				<button
					class="rounded bg-gray-200 px-4 py-2 text-gray-800 transition-colors hover:bg-gray-300"
					onclick={() => (showDetails = false)}
				>
					Close
				</button>
			</div>
		</div>
	</div>
{/if}
