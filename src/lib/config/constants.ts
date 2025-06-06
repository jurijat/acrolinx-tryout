import { PUBLIC_ACROLINX_BASE_URL } from '$env/static/public';

export const APP_CONFIG = {
	MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
	SUPPORTED_FORMATS: ['txt', 'md', 'html', 'xml', 'json', 'docx', 'pdf'],
	CHECK_TIMEOUT: 300000, // 5 minutes
	HISTORY_LIMIT: 1000,
	POLL_INTERVAL: 2000,
	TOKEN_STORAGE_KEY: 'acrolinx_token',
	SETTINGS_STORAGE_KEY: 'acrolinx_settings'
};

export const ISSUE_COLORS: Record<string, string> = {
	CLARITY: '#ec407a',
	CONSISTENCY: '#ffd600',
	INCLUSIVE: '#283593',
	CORRECTNESS: '#00bfa5',
	WORDS_AND_PHRASES: '#00b8d4',
	TONE: '#ab47bc',
	SCANNABILITY: '#9ccc65',
	REUSE: '#ea80fc'
};

export const DEFAULT_SETTINGS = {
	apiUrl: PUBLIC_ACROLINX_BASE_URL,
	theme: 'system' as const,
	autoSave: true,
	maxHistoryItems: 100
};
