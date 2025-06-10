<script lang="ts">
	interface Props {
		onContentChange: (content: string, type: 'text' | 'file', fileName?: string) => void;
	}

	let { onContentChange }: Props = $props();

	let activeTab = $state<'text' | 'file'>('text');
	let textContent = $state('');
	let file = $state<File | null>(null);

	$effect(() => {
		if (activeTab === 'text') {
			onContentChange(textContent, 'text');
		}
	});

	function handleTextChange(event: Event) {
		const target = event.target as HTMLTextAreaElement;
		textContent = target.value;
		onContentChange(textContent, 'text');
	}

	async function handleFileChange(event: Event) {
		const target = event.target as HTMLInputElement;
		const selectedFile = target.files?.[0];

		if (selectedFile) {
			file = selectedFile;

			// Read file content
			const reader = new FileReader();
			reader.onload = (e) => {
				let content = e.target?.result as string;

				// For base64 encoded files, extract just the base64 part
				if (
					!selectedFile.type.startsWith('text/') &&
					!selectedFile.name.endsWith('.txt') &&
					!selectedFile.name.endsWith('.md')
				) {
					// Remove the data URL prefix (e.g., "data:application/pdf;base64,")
					const base64Index = content.indexOf('base64,');
					if (base64Index !== -1) {
						content = content.substring(base64Index + 7);
					}
				}

				onContentChange(content, 'file', selectedFile.name);
			};

			// Check if it's a text file or needs base64 encoding
			if (
				selectedFile.type.startsWith('text/') ||
				selectedFile.name.endsWith('.txt') ||
				selectedFile.name.endsWith('.md')
			) {
				reader.readAsText(selectedFile);
			} else {
				reader.readAsDataURL(selectedFile);
			}
		}
	}
</script>

<div>
	<!-- Tab Selection -->
	<div class="mb-4 flex space-x-4 border-b">
		<button
			class="px-1 pb-2 transition-colors {activeTab === 'text'
				? 'border-b-2 border-blue-600 text-blue-600'
				: 'text-gray-500 hover:text-gray-700'}"
			onclick={() => (activeTab = 'text')}
		>
			Text Input
		</button>
		<button
			class="px-1 pb-2 transition-colors {activeTab === 'file'
				? 'border-b-2 border-blue-600 text-blue-600'
				: 'text-gray-500 hover:text-gray-700'}"
			onclick={() => (activeTab = 'file')}
		>
			File Upload
		</button>
	</div>

	{#if activeTab === 'text'}
		<div class="mb-4">
			<textarea
				class="h-64 w-full resize-none rounded-lg border border-gray-300 p-3 focus:border-transparent focus:ring-2 focus:ring-blue-500"
				placeholder="Enter or paste your text here..."
				value={textContent}
				oninput={handleTextChange}
			></textarea>
			<div class="mt-2 text-sm text-gray-600">
				{textContent.length} characters | {textContent
					.split(/\s+/)
					.filter((word) => word.length > 0).length} words
			</div>
		</div>
	{:else}
		<div class="mb-4">
			<div class="rounded-lg border-2 border-dashed border-gray-300 p-8 text-center">
				<input
					type="file"
					id="file-upload"
					class="hidden"
					accept=".txt,.md,.html,.xml,.json,.docx,.pdf"
					onchange={handleFileChange}
				/>
				<label for="file-upload" class="cursor-pointer">
					{#if file}
						<div class="text-sm text-gray-900">
							<p class="font-medium">{file.name}</p>
							<p class="text-gray-500">
								{(file.size / 1024).toFixed(2)} KB
							</p>
						</div>
					{:else}
						<div>
							<svg
								class="mx-auto h-12 w-12 text-gray-400"
								stroke="currentColor"
								fill="none"
								viewBox="0 0 48 48"
							>
								<path
									d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
									stroke-width="2"
									stroke-linecap="round"
									stroke-linejoin="round"
								/>
							</svg>
							<p class="mt-2 text-sm text-gray-600">
								<span class="font-medium text-blue-600 hover:text-blue-700"> Click to upload </span>
								{' '}or drag and drop
							</p>
							<p class="text-xs text-gray-500">TXT, MD, HTML, XML, JSON, DOCX, PDF up to 10MB</p>
						</div>
					{/if}
				</label>
			</div>
		</div>
	{/if}
</div>
