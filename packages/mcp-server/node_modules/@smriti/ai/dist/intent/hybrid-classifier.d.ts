import { IntentClassification, IntentClassifier } from './types.js';
export declare class HybridClassifier implements IntentClassifier {
    private ruleClassifier;
    private llmClassifier;
    private confidenceThreshold;
    constructor();
    classify(query: string): Promise<IntentClassification>;
}
