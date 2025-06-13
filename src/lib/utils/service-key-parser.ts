/**
 * Parse SAP AI Core service key from environment variable
 * Handles common JSON parsing issues like unescaped $ characters
 */
export function parseServiceKey(serviceKeyString: string | undefined): any {
	if (!serviceKeyString) {
		throw new Error('Service key is not defined');
	}

	try {
		// First attempt: direct parsing
		return JSON.parse(serviceKeyString);
	} catch (error) {
		// If parsing fails, try to fix common issues
		console.warn('Service key parsing failed, attempting to fix common issues...');

		// Common issue: unescaped $ in clientsecret
		// Look for patterns like "clientsecret": "...$...."
		let fixed = serviceKeyString;

		// Fix unescaped $ characters in clientsecret value
		// This regex looks for $ that are not already escaped
		fixed = fixed.replace(
			/"clientsecret"\s*:\s*"([^"]*?)(\$)([^"]*?)"/g,
			(match, before, dollar, after) => {
				// Check if the $ is already escaped
				if (before.endsWith('\\')) {
					return match; // Already escaped
				}
				return `"clientsecret": "${before}\\${dollar}${after}"`;
			}
		);

		try {
			const parsed = JSON.parse(fixed);
			console.log('Service key successfully parsed after fixing');
			return parsed;
		} catch (secondError) {
			console.error('Service key parsing failed even after attempted fixes');
			throw new Error(
				`Failed to parse service key: ${
					error instanceof Error ? error.message : 'Unknown error'
				}`
			);
		}
	}
}

/**
 * Ensure service key is available in process.env for SDK usage
 */
export function ensureServiceKeyInEnv(serviceKeyString: string | undefined): void {
	if (!serviceKeyString) return;

	// Parse the service key to ensure it's valid
	const parsed = parseServiceKey(serviceKeyString);

	// Set it back as a properly formatted JSON string
	process.env.AICORE_SERVICE_KEY = JSON.stringify(parsed);
}