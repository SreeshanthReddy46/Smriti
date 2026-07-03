import { IntentClassification, IntentClassifier } from './types.js';
export declare class LlmClassifier implements IntentClassifier {
    private apiEndpoint;
    classify(query: string): Promise<IntentClassification>;
    private fallbackHeuristics;
}
