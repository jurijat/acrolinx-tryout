<script lang="ts">
	import type { CheckingCapabilities, GuidanceProfile } from '$lib/types';

	interface Props {
		capabilities: CheckingCapabilities;
		onConfigChange: (config: { language: string; profile: string }) => void;
	}

	let { capabilities, onConfigChange }: Props = $props();

	let selectedLanguage = $state('en');
	let selectedProfile = $state(capabilities.defaultGuidanceProfileId || '');

	// Get unique languages from profiles
	let availableLanguages = $derived(
		(() => {
			const languages = new Map<string, string>();
			capabilities.guidanceProfiles.forEach((profile) => {
				languages.set(profile.language.id, profile.language.displayName);
			});
			return Array.from(languages.entries()).map(([id, displayName]) => ({ id, displayName }));
		})()
	);

	// Filter profiles by selected language
	let availableProfiles = $derived(
		capabilities.guidanceProfiles.filter((profile) => profile.language.id === selectedLanguage)
	);

	$effect(() => {
		// Update selected profile if current one is not available for the language
		if (!availableProfiles.some((p) => p.id === selectedProfile)) {
			selectedProfile = availableProfiles[0]?.id || '';
		}

		onConfigChange({
			language: selectedLanguage,
			profile: selectedProfile
		});
	});
</script>

<div class="mt-4 space-y-4">
	<div>
		<label for="language-select" class="mb-1 block text-sm font-medium text-gray-700">
			Language
		</label>
		<select
			id="language-select"
			class="w-full rounded-lg border border-gray-300 p-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
			bind:value={selectedLanguage}
		>
			{#each availableLanguages as language}
				<option value={language.id}>{language.displayName}</option>
			{/each}
		</select>
	</div>

	<div>
		<label for="profile-select" class="mb-1 block text-sm font-medium text-gray-700">
			Guidance Profile
		</label>
		<select
			id="profile-select"
			class="w-full rounded-lg border border-gray-300 p-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
			bind:value={selectedProfile}
		>
			<option value="">Select a profile...</option>
			{#each availableProfiles as profile}
				<option value={profile.id}>{profile.displayName}</option>
			{/each}
		</select>

		{#if selectedProfile}
			{@const profile = availableProfiles.find((p) => p.id === selectedProfile)}
			{#if profile}
				<div class="mt-2 text-sm text-gray-600">
					<p class="font-medium">Goals:</p>
					<div class="mt-1 flex flex-wrap gap-1">
						{#each profile.goals as goal}
							<span
								class="inline-flex items-center rounded px-2 py-0.5 text-xs font-medium"
								style="background-color: {goal.color}20; color: {goal.color}"
							>
								{goal.displayName}
							</span>
						{/each}
					</div>
				</div>
			{/if}
		{/if}
	</div>
</div>
