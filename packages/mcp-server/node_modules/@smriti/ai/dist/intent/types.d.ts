export type SmritiIntentType = 'CODE_SEARCH' | 'GIT_HISTORY' | 'CURRENT_TASK' | 'DECISION_LOOKUP' | 'PROJECT_SUMMARY' | 'UNKNOWN';
export interface IntentEntity {
    name: string;
    type: 'file' | 'symbol' | 'author' | 'feature' | 'unknown';
}
export interface IntentClassification {
    intent: SmritiIntentType;
    confidence: number;
    entities: IntentEntity[];
}
export interface IntentClassifier {
    classify(query: string): Promise<IntentClassification>;
}
