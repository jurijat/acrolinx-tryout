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
	let availableLanguages = $derived((() => {
		const languages = new Map<string, string>();
		capabilities.guidanceProfiles.forEach(profile => {
			languages.set(profile.language.id, profile.language.displayName);
		});
		return Array.from(languages.entries()).map(([id, displayName]) => ({ id, displayName }));
	})());

	// Filter profiles by selected language
	let availableProfiles = $derived(
		capabilities.guidanceProfiles.filter(profile => profile.language.id === selectedLanguage)
	);

	$effect(() => {
		// Update selected profile if current one is not available for the language
		if (!availableProfiles.some(p => p.id === selectedProfile)) {
			selectedProfile = availableProfiles[0]?.id || '';
		}
		
		onConfigChange({
			language: selectedLanguage,
			profile: selectedProfile
		});
	});
</script>

<div class="space-y-4 mt-4">
	<div>
		<label for="language-select" class="block text-sm font-medium text-gray-700 mb-1">
			Language
		</label>
		<select 
			id="language-select"
			class="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
			bind:value={selectedLanguage}
		>
			{#each availableLanguages as language}
				<option value={language.id}>{language.displayName}</option>
			{/each}
		</select>
	</div>
	
	<div>
		<label for="profile-select" class="block text-sm font-medium text-gray-700 mb-1">
			Guidance Profile
		</label>
		<select 
			id="profile-select"
			class="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
			bind:value={selectedProfile}
		>
			<option value="">Select a profile...</option>
			{#each availableProfiles as profile}
				<option value={profile.id}>{profile.displayName}</option>
			{/each}
		</select>
		
		{#if selectedProfile}
			{@const profile = availableProfiles.find(p => p.id === selectedProfile)}
			{#if profile}
				<div class="mt-2 text-sm text-gray-600">
					<p class="font-medium">Goals:</p>
					<div class="flex flex-wrap gap-1 mt-1">
						{#each profile.goals as goal}
							<span 
								class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium"
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