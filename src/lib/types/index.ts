// Acrolinx API Types
export interface CheckRecord {
	id: string;
	timestamp: Date;
	content: string;
	contentType: 'file' | 'text';
	fileName?: string;
	guidanceProfileId: string;
	guidanceProfileName: string;
	language: string;
	score?: number;
	issues: Issue[];
	status: 'pending' | 'completed' | 'failed';
	checkId?: string;
	duration?: number;
}

export interface Issue {
	id: string;
	goalId: string;
	goalName: string;
	description: string;
	suggestions: string[];
	severity: 'error' | 'warning' | 'info';
	location: {
		start: number;
		end: number;
	};
}

export interface UserSettings {
	apiUrl: string;
	defaultGuidanceProfileId?: string;
	theme: 'light' | 'dark' | 'system';
	autoSave: boolean;
	maxHistoryItems: number;
}

export interface GuidanceProfile {
	id: string;
	displayName: string;
	language: {
		id: string;
		displayName: string;
	};
	acrolinxLive: boolean;
	goals: Goal[];
	termSets: TermSet[];
}

export interface Goal {
	id: string;
	displayName: string;
	color: string;
	scoring: string;
}

export interface TermSet {
	displayName: string;
}

export interface CheckConfig {
	contentType: 'file' | 'text';
	profileId: string;
	languageId: string;
	fileName?: string;
}

export interface CheckingCapabilities {
	guidanceProfiles: GuidanceProfile[];
	contentFormats: ContentFormat[];
	contentEncodings: string[];
	checkTypes: string[];
	reportTypes: string[];
	defaultGuidanceProfileId: string;
}

export interface ContentFormat {
	id: string;
	displayName: string;
}

export interface CheckResult {
	id: string;
	score: number;
	status: string;
	goals: GoalResult[];
	issues: AcrolinxIssue[];
	metrics?: Metric[];
	counts?: {
		sentences: number;
		words: number;
		issues: number;
		scoredIssues: number;
	};
	debug?: {
		request?: unknown;
		response?: unknown;
	};
}

export interface GoalResult {
	id: string;
	displayName: string;
	color: string;
	scoring: string;
	issues: number;
}

export interface GoalScore {
	id: string;
	score: number;
}

export interface Metric {
	id: string;
	score: number;
}

export interface AcrolinxIssue {
	goalId: string;
	targetGuidelineId: string;
	guidelineId: string;
	internalName: string;
	displayNameHtml: string;
	guidanceHtml: string;
	displaySurface: string;
	issueType: string;
	scoring: string;
	positionalInformation?: {
		hashes: {
			issue: string;
			environment: string;
			index: string;
		};
		matches: Array<{
			extractedPart: string;
			extractedBegin: number;
			extractedEnd: number;
			originalPart: string;
			originalBegin: number;
			originalEnd: number;
		}>;
	};
}

export interface Suggestion {
	surface: string;
	isAddition?: boolean;
	isDeletion?: boolean;
}

export interface SubIssue {
	internalName: string;
	displayNameHtml: string;
	guidanceHtml: string;
}

export interface Keyword {
	keyword: string;
	sortKey: string;
	density: number;
	count: number;
	prominence: number;
}
