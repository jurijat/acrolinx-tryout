import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [tailwindcss(), sveltekit()],
	optimizeDeps: {
		exclude: ['@sap-ai-sdk/orchestration', '@sap-ai-sdk/core']
	},
	ssr: {
		external: ['@sap-ai-sdk/orchestration', '@sap-ai-sdk/core']
	}
});
