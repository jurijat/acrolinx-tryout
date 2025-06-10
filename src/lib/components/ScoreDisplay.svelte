<script lang="ts">
	interface Props {
		score: number;
		previousScore?: number;
	}

	let { score, previousScore }: Props = $props();

	let scoreColor = $derived(() => {
		if (score >= 90) return 'green';
		if (score >= 70) return 'yellow';
		return 'red';
	});

	let colorClasses = $derived(() => {
		switch (scoreColor()) {
			case 'green':
				return 'text-green-600 bg-green-600';
			case 'yellow':
				return 'text-yellow-600 bg-yellow-600';
			default:
				return 'text-red-600 bg-red-600';
		}
	});
</script>

<div class="mb-6">
	<div class="mb-2 flex items-center justify-between">
		<span class="text-sm text-gray-600">Overall Score</span>
		<div class="flex items-center space-x-2">
			<span class="text-3xl font-bold {colorClasses().split(' ')[0]}">{score}</span>
			{#if previousScore !== undefined}
				{@const diff = score - previousScore}
				<span class="text-sm {diff >= 0 ? 'text-green-600' : 'text-red-600'}">
					{diff >= 0 ? '+' : ''}{diff}
				</span>
			{/if}
		</div>
	</div>
	<div class="h-3 w-full rounded-full bg-gray-200">
		<div
			class="{colorClasses().split(' ')[1]} h-3 rounded-full transition-all duration-500"
			style="width: {score}%"
		></div>
	</div>
	<div class="mt-2 text-sm text-gray-600">
		{#if score >= 90}
			Excellent! Your content meets high quality standards.
		{:else if score >= 70}
			Good! Some improvements could enhance readability.
		{:else}
			Needs improvement. Review the issues below.
		{/if}
	</div>
</div>
