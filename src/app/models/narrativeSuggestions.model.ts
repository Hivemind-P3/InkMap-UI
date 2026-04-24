export interface NarrativeSuggestionsRequest {
    projectId: number;
    additionalInstructions?: string;
}

export interface NarrativeSuggestionsResponse {
    suggestions: string;
}