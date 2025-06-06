import { writable, derived, get } from 'svelte/store';
import * as duckdb from '@duckdb/duckdb-wasm';
import type { CheckRecord } from '$lib/types';

interface DatabaseState {
	isInitialized: boolean;
	isLoading: boolean;
	error: string | null;
}

class DatabaseService {
	private db: duckdb.AsyncDuckDB | null = null;
	private connection: duckdb.AsyncDuckDBConnection | null = null;
	private state = writable<DatabaseState>({
		isInitialized: false,
		isLoading: false,
		error: null
	});

	// Expose state
	isInitialized = derived(this.state, ($state) => $state.isInitialized);
	isLoading = derived(this.state, ($state) => $state.isLoading);
	error = derived(this.state, ($state) => $state.error);

	async initialize() {
		if (get(this.state).isInitialized) return;

		this.state.update((state) => ({ ...state, isLoading: true, error: null }));

		try {
			// Initialize DuckDB WASM
			const JSDELIVR_BUNDLES = duckdb.getJsDelivrBundles();

			const bundle = await duckdb.selectBundle(JSDELIVR_BUNDLES);

			const worker_url = URL.createObjectURL(
				new Blob([`importScripts("${bundle.mainWorker}");`], { type: 'text/javascript' })
			);

			const worker = new Worker(worker_url);
			const logger = new duckdb.ConsoleLogger();

			this.db = new duckdb.AsyncDuckDB(logger, worker);
			await this.db.instantiate(bundle.mainModule, bundle.pthreadWorker);

			this.connection = await this.db.connect();

			// Create tables
			await this.createTables();

			this.state.update((state) => ({
				...state,
				isInitialized: true,
				isLoading: false
			}));
		} catch (error) {
			console.error('Failed to initialize database:', error);
			this.state.update((state) => ({
				...state,
				error: error instanceof Error ? error.message : 'Database initialization failed',
				isLoading: false
			}));
			throw error;
		}
	}

	private async createTables() {
		if (!this.connection) throw new Error('Database not connected');

		// Create check_history table
		await this.connection.query(`
      CREATE TABLE IF NOT EXISTS check_history (
        id VARCHAR PRIMARY KEY,
        timestamp TIMESTAMP,
        content TEXT,
        content_type VARCHAR,
        file_name VARCHAR,
        guidance_profile_id VARCHAR,
        guidance_profile_name VARCHAR,
        language VARCHAR,
        score INTEGER,
        status VARCHAR,
        check_id VARCHAR,
        duration INTEGER,
        issue_count INTEGER,
        goals_json TEXT,
        issues_json TEXT,
        metrics_json TEXT
      )
    `);

		// Create index for faster queries
		await this.connection.query(`
      CREATE INDEX IF NOT EXISTS idx_check_history_timestamp 
      ON check_history(timestamp DESC)
    `);
	}

	async saveCheckRecord(
		record: Partial<CheckRecord> & {
			goals?: unknown[];
			issues?: unknown[];
			metrics?: unknown[];
		}
	): Promise<void> {
		if (!this.connection) throw new Error('Database not connected');

		const id = record.id || crypto.randomUUID();
		const timestamp = record.timestamp || new Date();

		// Use prepared statement with bind
		const stmt = await this.connection.prepare(`
      INSERT INTO check_history (
        id, timestamp, content, content_type, file_name,
        guidance_profile_id, guidance_profile_name, language,
        score, status, check_id, duration, issue_count,
        goals_json, issues_json, metrics_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
		
		await stmt.query(
			id,
			timestamp.toISOString(),
			record.content || '',
			record.contentType || 'text',
			record.fileName || null,
			record.guidanceProfileId || '',
			record.guidanceProfileName || '',
			record.language || 'en',
			record.score || null,
			record.status || 'pending',
			record.checkId || null,
			record.duration || null,
			record.issues?.length || 0,
			JSON.stringify(record.goals || []),
			JSON.stringify(record.issues || []),
			JSON.stringify(record.metrics || [])
		);
		
		await stmt.close();
	}

	async getCheckHistory(limit: number = 50, offset: number = 0): Promise<CheckRecord[]> {
		if (!this.connection) throw new Error('Database not connected');

		const stmt = await this.connection.prepare(`
      SELECT * FROM check_history 
      ORDER BY timestamp DESC 
      LIMIT ? OFFSET ?
    `);
		
		const result = await stmt.query(limit, offset);
		await stmt.close();

		const records: CheckRecord[] = [];
		const rows = result.toArray();

		for (const row of rows) {
			records.push({
				id: row.id as string,
				timestamp: new Date(row.timestamp as string),
				content: row.content as string,
				contentType: row.content_type as 'file' | 'text',
				fileName: row.file_name as string | undefined,
				guidanceProfileId: row.guidance_profile_id as string,
				guidanceProfileName: row.guidance_profile_name as string,
				language: row.language as string,
				score: row.score as number | undefined,
				status: row.status as 'pending' | 'completed' | 'failed',
				checkId: row.check_id as string | undefined,
				duration: row.duration as number | undefined,
				issues: JSON.parse((row.issues_json as string) || '[]')
			});
		}

		return records;
	}

	async getCheckById(id: string): Promise<CheckRecord | null> {
		if (!this.connection) throw new Error('Database not connected');

		const stmt = await this.connection.prepare(`
      SELECT * FROM check_history WHERE id = ?
    `);
		
		const result = await stmt.query(id);
		await stmt.close();
		
		const rows = result.toArray();
		if (rows.length === 0) return null;

		const row = rows[0];
		return {
			id: row.id as string,
			timestamp: new Date(row.timestamp as string),
			content: row.content as string,
			contentType: row.content_type as 'file' | 'text',
			fileName: row.file_name as string | undefined,
			guidanceProfileId: row.guidance_profile_id as string,
			guidanceProfileName: row.guidance_profile_name as string,
			language: row.language as string,
			score: row.score as number | undefined,
			status: row.status as 'pending' | 'completed' | 'failed',
			checkId: row.check_id as string | undefined,
			duration: row.duration as number | undefined,
			issues: JSON.parse((row.issues_json as string) || '[]')
		};
	}

	async deleteCheck(id: string): Promise<void> {
		if (!this.connection) throw new Error('Database not connected');

		const stmt = await this.connection.prepare(`
      DELETE FROM check_history WHERE id = ?
    `);
		
		await stmt.query(id);
		await stmt.close();
	}

	async getStatistics(): Promise<{
		totalChecks: number;
		averageScore: number;
		checksByProfile: Array<{ profile: string; count: number }>;
	}> {
		if (!this.connection) throw new Error('Database not connected');

		const totalResult = await this.connection.query(`
      SELECT COUNT(*) as total FROM check_history
    `);

		const avgResult = await this.connection.query(`
      SELECT AVG(score) as avg_score 
      FROM check_history 
      WHERE score IS NOT NULL
    `);

		const profileResult = await this.connection.query(`
      SELECT guidance_profile_name as profile, COUNT(*) as count 
      FROM check_history 
      GROUP BY guidance_profile_name 
      ORDER BY count DESC
    `);

		const totalRows = totalResult.toArray();
		const avgRows = avgResult.toArray();
		const profileRows = profileResult.toArray();

		return {
			totalChecks: (totalRows[0]?.total as number) || 0,
			averageScore: Math.round((avgRows[0]?.avg_score as number) || 0),
			checksByProfile: profileRows.map((row) => ({
				profile: row.profile as string,
				count: row.count as number
			}))
		};
	}

	// Subscribe method for reactive updates
	subscribe = this.state.subscribe;
}

export const databaseService = new DatabaseService();