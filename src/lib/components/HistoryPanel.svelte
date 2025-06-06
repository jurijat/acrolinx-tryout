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

<div class="bg-white rounded-lg shadow p-6">
	<div class="flex items-center justify-between mb-6">
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
		<div class="text-center py-8">
			<div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
			<p class="text-gray-600 mt-2">Loading history...</p>
		</div>
	{:else if error}
		<div class="bg-red-50 border border-red-200 rounded-lg p-4">
			<p class="text-sm text-red-800">{error}</p>
		</div>
	{:else}
		<!-- Statistics Summary -->
		<div class="grid grid-cols-3 gap-4 mb-6">
			<div class="bg-gray-50 rounded-lg p-4">
				<div class="flex items-center space-x-2 text-gray-600 mb-1">
					<BarChart class="w-4 h-4" />
					<span class="text-xs">Total Checks</span>
				</div>
				<p class="text-2xl font-semibold">{statistics.totalChecks}</p>
			</div>
			<div class="bg-gray-50 rounded-lg p-4">
				<div class="flex items-center space-x-2 text-gray-600 mb-1">
					<BarChart class="w-4 h-4" />
					<span class="text-xs">Average Score</span>
				</div>
				<p class="text-2xl font-semibold {getScoreColor(statistics.averageScore)}">
					{statistics.averageScore}
				</p>
			</div>
			<div class="bg-gray-50 rounded-lg p-4">
				<div class="flex items-center space-x-2 text-gray-600 mb-1">
					<Globe class="w-4 h-4" />
					<span class="text-xs">Top Profile</span>
				</div>
				<p class="text-sm font-medium truncate">
					{statistics.checksByProfile[0]?.profile || 'N/A'}
				</p>
			</div>
		</div>

		<!-- History List -->
		{#if records.length === 0}
			<p class="text-gray-500 text-center py-8">
				No checks yet. Submit a document to get started!
			</p>
		{:else}
			<div class="space-y-2">
				{#each records as record}
					<div class="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
						<div class="flex items-start justify-between">
							<div class="flex-1 min-w-0">
								<div class="flex items-center space-x-2 mb-1">
									<FileText class="w-4 h-4 text-gray-400" />
									<span class="text-sm font-medium truncate">
										{record.fileName || 'Text Input'}
									</span>
									<span class="text-xs px-2 py-0.5 rounded-full {getStatusBadge(record.status)}">
										{record.status}
									</span>
								</div>
								
								<div class="flex items-center space-x-4 text-xs text-gray-600">
									<span class="flex items-center space-x-1">
										<Calendar class="w-3 h-3" />
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
							
							<div class="flex items-center space-x-1 ml-4">
								<button 
									class="p-1 hover:bg-gray-200 rounded transition-colors"
									onclick={() => viewDetails(record)}
									title="View details"
								>
									<Eye class="w-4 h-4 text-gray-600" />
								</button>
								<button 
									class="p-1 hover:bg-gray-200 rounded transition-colors"
									onclick={() => deleteRecord(record.id)}
									title="Delete"
								>
									<Trash2 class="w-4 h-4 text-gray-600" />
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
		class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
		onclick={(e) => e.target === e.currentTarget && (showDetails = false)}
	>
		<div class="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden flex flex-col">
			<div class="p-6 border-b">
				<h3 class="text-lg font-semibold">Check Details</h3>
			</div>
			
			<div class="p-6 overflow-y-auto flex-1">
				<div class="space-y-4">
					<div>
						<h4 class="text-sm font-medium text-gray-700 mb-1">Document</h4>
						<p class="text-sm">{selectedRecord.fileName || 'Text Input'}</p>
					</div>
					
					<div class="grid grid-cols-2 gap-4">
						<div>
							<h4 class="text-sm font-medium text-gray-700 mb-1">Profile</h4>
							<p class="text-sm">{selectedRecord.guidanceProfileName}</p>
						</div>
						<div>
							<h4 class="text-sm font-medium text-gray-700 mb-1">Language</h4>
							<p class="text-sm">{selectedRecord.language}</p>
						</div>
					</div>
					
					{#if selectedRecord.score !== undefined}
						<div>
							<h4 class="text-sm font-medium text-gray-700 mb-1">Score</h4>
							<p class="text-2xl font-semibold {getScoreColor(selectedRecord.score)}">
								{selectedRecord.score}
							</p>
						</div>
					{/if}
					
					<div>
						<h4 class="text-sm font-medium text-gray-700 mb-1">Content Preview</h4>
						<div class="bg-gray-50 rounded p-3 max-h-40 overflow-y-auto">
							<pre class="text-xs whitespace-pre-wrap">{selectedRecord.content.substring(0, 500)}...</pre>
						</div>
					</div>
				</div>
			</div>
			
			<div class="p-6 border-t">
				<button 
					class="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 transition-colors"
					onclick={() => showDetails = false}
				>
					Close
				</button>
			</div>
		</div>
	</div>
{/if}