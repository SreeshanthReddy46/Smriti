import { IntentClassification, IntentClassifier } from './types.js';
export declare class RuleClassifier implements IntentClassifier {
    private rules;
    classify(query: string): Promise<IntentClassification>;
    private extractEntities;
}
