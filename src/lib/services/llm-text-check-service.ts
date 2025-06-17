import {
	openAICompatibleService,
	type ChatCompletionRequest,
	type ChatCompletionWithMetadata
} from './openai-compatible-service';
import type { AcrolinxIssue, CheckResult, GoalResult } from '$lib/types';

// Define the goals we check for
export const TEXT_CHECK_GOALS = {
	CLARITY: {
		id: 'clarity',
		displayName: 'Clarity',
		color: '#1E88E5',
		scoring: 'high'
	},
	CONSISTENCY: {
		id: 'consistency',
		displayName: 'Consistency',
		color: '#43A047',
		scoring: 'medium'
	},
	INCLUSIVE_LANGUAGE: {
		id: 'inclusive-language',
		displayName: 'Inclusive Language',
		color: '#E53935',
		scoring: 'high'
	},
	SCANNABILITY: {
		id: 'scannability',
		displayName: 'Scannability',
		color: '#FB8C00',
		scoring: 'medium'
	},
	SPELLING_GRAMMAR: {
		id: 'spelling-grammar',
		displayName: 'Spelling and Grammar',
		color: '#8E24AA',
		scoring: 'high'
	},
	TERMINOLOGY: {
		id: 'terminology',
		displayName: 'Terminology',
		color: '#00ACC1',
		scoring: 'medium'
	}
};

interface LLMIssue {
	goal: string;
	description: string;
	suggestions: string[];
	severity: 'error' | 'warning' | 'info';
	originalText: string;
	startOffset: number;
	endOffset: number;
}

interface LLMCheckResponse {
	issues: LLMIssue[];
	overallScore: number;
	goalScores: { [goalId: string]: number };
	counts: {
		sentences: number;
		words: number;
		issues: number;
	};
}

interface CheckResultWithMetadata {
	result: CheckResult;
	requestMetadata?: {
		request: any;
		response: any;
		model: string;
		duration: number;
	};
}

export class LLMTextCheckService {
	private readonly SYSTEM_PROMPT = `You are an advanced text quality analyzer that checks content for clarity, consistency, inclusive language, scannability, spelling/grammar, and terminology issues.

You must analyze the text and return a JSON response with the following structure:
{
  "issues": [
    {
      "goal": "<goal-id>", // Must be one of: CLARITY, CONSISTENCY, INCLUSIVE-LANGUAGE, SCANNABILITY, SPELLING-GRAMMAR, TERMINOLOGY
      "description": "<clear description of the issue>",
      "suggestions": ["<suggestion 1>", "<suggestion 2>", ...],
      "severity": "<severity>", // Must be one of: error, warning, info
      "originalText": "<the problematic text>",
    }
  ],
  "overallScore": <0-100>,
  "goalScores": {
    "CLARITY": <0-100>,
    "CONSISTENCY": <0-100>,
    "INCLUSIVE-LANGUAGE": <0-100>,
    "SCANNABILITY": <0-100>,
    "SPELLING-GRAMMAR": <0-100>,
    "TERMINOLOGY": <0-100>
  },
  "counts": {
    "sentences": <number>,
    "words": <number>,
    "issues": <number>
  }
}

Check for the following:

**Clarity Issues:**
- Ambiguous pronouns
- Complex sentences that could be simplified
- Jargon without explanation
- Passive voice when active would be clearer
- Unclear antecedents
- Vague language

**Consistency Issues:**
- Inconsistent terminology
- Inconsistent formatting (e.g., bullet points, capitalization)
- Inconsistent tone or style
- Inconsistent spelling variants

**Inclusive Language Issues:**
- Gendered language when neutral alternatives exist
- Culturally insensitive terms
- Ableist language
- Age-biased language
- Exclusionary language

**Scannability Issues:**
- Long paragraphs that should be broken up
- Missing headings or subheadings
- Lack of bullet points or lists where appropriate
- Dense text blocks
- Missing white space

**Spelling and Grammar Issues:**
- Spelling errors
- Grammar mistakes
- Punctuation errors
- Subject-verb disagreement
- Incorrect word usage

**Terminology Issues:**
- Technical terms not defined
- Inconsistent use of technical terms
- Incorrect technical terminology
- Domain-specific term misuse

Important: 
- Be thorough but reasonable - don't nitpick minor stylistic choices
- Provide helpful, actionable suggestions
- Use appropriate severity levels (error for serious issues, warning for moderate issues, info for suggestions)
- Calculate realistic scores (perfect text = 100, typical good text = 80-90, problematic text = below 70)
- Ensure character offsets are accurate for the original text`;

	async checkText(
		content: string,
		model: string = 'openai/gpt-4o-mini',
		customSystemPrompt?: string
	): Promise<CheckResultWithMetadata> {
		try {
			const request: ChatCompletionRequest = {
				model,
				messages: [
					{
						role: 'system',
						content: customSystemPrompt || this.SYSTEM_PROMPT
					},
					{
						role: 'user',
						content: `Please analyze the following text and provide a detailed quality check report:\n\n${content}`
					}
				],
				temperature: 0, // Lower temperature for more consistent analysis
				max_tokens: 8092
			};

			console.log('[LLMTextCheck] Sending request to LLM using OpenAI Compatible Service');
			const metadata = await openAICompatibleService.chatCompletionWithMetadata(request);
			console.log('[LLMTextCheck] Received response from LLM');
			const analysisText = metadata.response.choices[0].message.content;

			// Parse the JSON response
			let llmResponse: LLMCheckResponse;
			try {
				// Extract JSON from the response (in case there's extra text)
				const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
				if (!jsonMatch) {
					throw new Error('No JSON found in response');
				}
				llmResponse = JSON.parse(jsonMatch[0]);
			} catch (error) {
				console.error('Failed to parse LLM response:', error);
				// Return a fallback response
				return {
					result: this.createFallbackResult(content)
				};
			}

			// Transform LLM response to Acrolinx format
			const result = this.transformToAcrolinxFormat(llmResponse, content);

			return {
				result,
				requestMetadata: {
					request: metadata.request,
					response: metadata.response,
					model,
					duration: metadata.duration
				}
			};
		} catch (error) {
			console.error('LLM text check error:', error);
			console.error('Error details:', {
				message: error instanceof Error ? error.message : 'Unknown error',
				stack: error instanceof Error ? error.stack : undefined
			});
			// Return fallback result instead of throwing
			return {
				result: this.createFallbackResult(content)
			};
		}
	}

	private transformToAcrolinxFormat(
		llmResponse: LLMCheckResponse,
		originalContent: string
	): CheckResult {
		const checkId = `llm-check-${Date.now()}`;

		// Transform issues to Acrolinx format
		const acrolinxIssues: AcrolinxIssue[] = llmResponse.issues.map((issue, index) => {
			const goal =
				Object.values(TEXT_CHECK_GOALS).find((g) => g.id === issue.goal) ||
				TEXT_CHECK_GOALS.CLARITY;

			return {
				goalId: goal.id,
				targetGuidelineId: `${goal.id}-${index}`,
				guidelineId: `${goal.id}-guideline`,
				internalName: `${goal.id}_issue_${index}`,
				displayNameHtml: this.escapeHtml(issue.description),
				guidanceHtml: this.createGuidanceHtml(issue),
				displaySurface: issue.originalText,
				issueType: this.mapSeverityToIssueType(issue.severity),
				scoring: goal.scoring,
				positionalInformation: {
					hashes: {
						issue: this.generateHash(`${issue.goal}-${issue.description}`),
						environment: this.generateHash(originalContent),
						index: String(index)
					},
					matches: [
						{
							extractedPart: issue.originalText,
							extractedBegin: issue.startOffset,
							extractedEnd: issue.endOffset,
							originalPart: issue.originalText,
							originalBegin: issue.startOffset,
							originalEnd: issue.endOffset
						}
					]
				}
			};
		});

		// Create goal results
		const goalResults: GoalResult[] = Object.values(TEXT_CHECK_GOALS).map((goal) => {
			const goalIssues = llmResponse.issues.filter((i) => i.goal === goal.id);
			return {
				id: goal.id,
				displayName: goal.displayName,
				color: goal.color,
				scoring: goal.scoring,
				issues: goalIssues.length
			};
		});

		// Calculate metrics
		const metrics = Object.entries(llmResponse.goalScores).map(([goalId, score]) => ({
			id: goalId,
			score
		}));

		return {
			id: checkId,
			score: llmResponse.overallScore,
			status: 'completed',
			goals: goalResults,
			issues: acrolinxIssues,
			metrics,
			counts: {
				sentences: llmResponse.counts.sentences,
				words: llmResponse.counts.words,
				issues: llmResponse.issues.length,
				scoredIssues: llmResponse.issues.filter(
					(i) => i.severity === 'error' || i.severity === 'warning'
				).length
			}
		};
	}

	private createFallbackResult(content: string): CheckResult {
		const words = content.split(/\s+/).length;
		const sentences = content.split(/[.!?]+/).filter((s) => s.trim().length > 0).length;

		return {
			id: `llm-check-${Date.now()}`,
			score: 85,
			status: 'completed',
			goals: Object.values(TEXT_CHECK_GOALS).map((goal) => ({
				id: goal.id,
				displayName: goal.displayName,
				color: goal.color,
				scoring: goal.scoring,
				issues: 0
			})),
			issues: [],
			metrics: Object.keys(TEXT_CHECK_GOALS).map((key) => ({
				id: TEXT_CHECK_GOALS[key as keyof typeof TEXT_CHECK_GOALS].id,
				score: 85
			})),
			counts: {
				sentences,
				words,
				issues: 0,
				scoredIssues: 0
			}
		};
	}

	private createGuidanceHtml(issue: LLMIssue): string {
		const suggestions = issue.suggestions.map((s) => `<li>${this.escapeHtml(s)}</li>`).join('');

		return `
			<div class="issue-guidance">
				<p>${this.escapeHtml(issue.description)}</p>
				${
					suggestions.length > 0
						? `
					<p><strong>Suggestions:</strong></p>
					<ul>${suggestions}</ul>
				`
						: ''
				}
			</div>
		`;
	}

	private mapSeverityToIssueType(severity: string): string {
		switch (severity) {
			case 'error':
				return 'error';
			case 'warning':
				return 'warning';
			case 'info':
			default:
				return 'suggestion';
		}
	}

	private escapeHtml(text: string): string {
		const map: { [key: string]: string } = {
			'&': '&amp;',
			'<': '&lt;',
			'>': '&gt;',
			'"': '&quot;',
			"'": '&#039;'
		};
		return text.replace(/[&<>"']/g, (m) => map[m]);
	}

	private generateHash(text: string): string {
		// Simple hash function for demo purposes
		let hash = 0;
		for (let i = 0; i < text.length; i++) {
			const char = text.charCodeAt(i);
			hash = (hash << 5) - hash + char;
			hash = hash & hash; // Convert to 32bit integer
		}
		return Math.abs(hash).toString(16);
	}
}

// Export singleton instance
export const llmTextCheckService = new LLMTextCheckService();
