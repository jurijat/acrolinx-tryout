import { writable, get } from 'svelte/store';
import { APP_CONFIG } from '$lib/config/constants';

interface AuthState {
	isAuthenticated: boolean;
	user: { id: string; username: string } | null;
	token: string | null;
}

class AuthService {
	private state = writable<AuthState>({
		isAuthenticated: false,
		user: null,
		token: null
	});

	get isAuthenticated() {
		return get(this.state).isAuthenticated;
	}

	get user() {
		return get(this.state).user;
	}

	get token() {
		return get(this.state).token;
	}

	async initialize() {
		// Check for stored token
		const storedToken = localStorage.getItem(APP_CONFIG.TOKEN_STORAGE_KEY);
		if (storedToken) {
			try {
				// Verify token is still valid
				const response = await fetch('/api/auth/verify', {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						Authorization: `Bearer ${storedToken}`
					}
				});

				if (response.ok) {
					const data = await response.json();
					this.state.set({
						isAuthenticated: true,
						user: data.user,
						token: storedToken
					});
				} else {
					// Token invalid, clear it
					localStorage.removeItem(APP_CONFIG.TOKEN_STORAGE_KEY);
				}
			} catch (error) {
				console.error('Failed to verify token:', error);
			}
		}
	}

	async signIn(username: string, password: string): Promise<void> {
		const response = await fetch('/api/auth/signin', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ username, password })
		});

		if (!response.ok) {
			const error = await response.json();
			throw new Error(error.error?.message || 'Authentication failed');
		}

		const { data } = await response.json();

		this.state.set({
			isAuthenticated: true,
			user: data.user,
			token: data.token
		});

		// Store encrypted token
		localStorage.setItem(APP_CONFIG.TOKEN_STORAGE_KEY, data.token);
	}

	async signInWithToken(): Promise<void> {
		// Use the token from environment variable
		const response = await fetch('/api/auth/token', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' }
		});

		if (!response.ok) {
			const error = await response.json();
			throw new Error(error.error?.message || 'Token authentication failed');
		}

		const { data } = await response.json();

		this.state.set({
			isAuthenticated: true,
			user: data.user,
			token: data.token
		});

		// Store encrypted token
		localStorage.setItem(APP_CONFIG.TOKEN_STORAGE_KEY, data.token);
	}

	async signInWithCustomToken(token: string): Promise<void> {
		// Verify the custom token
		const response = await fetch('/api/auth/verify', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${token}`
			},
			body: JSON.stringify({ customToken: token })
		});

		if (!response.ok) {
			const error = await response.json();
			throw new Error(error.error?.message || 'Invalid token');
		}

		const { data } = await response.json();

		this.state.set({
			isAuthenticated: true,
			user: data.user,
			token: token
		});

		// Store the custom token
		localStorage.setItem(APP_CONFIG.TOKEN_STORAGE_KEY, token);
		localStorage.setItem('custom_api_token', token);
	}

	logout() {
		this.state.set({
			isAuthenticated: false,
			user: null,
			token: null
		});
		localStorage.removeItem(APP_CONFIG.TOKEN_STORAGE_KEY);
	}

	getAuthHeaders(): HeadersInit {
		const currentState = get(this.state);
		if (!currentState.token) {
			throw new Error('No authentication token available');
		}
		return {
			Authorization: `Bearer ${currentState.token}`
		};
	}

	// Subscribe method for reactive updates
	subscribe = this.state.subscribe;
}

export const authService = new AuthService();
