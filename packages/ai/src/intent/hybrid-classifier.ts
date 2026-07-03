import { IntentClassification, IntentClassifier } from './types.js';
import { RuleClassifier } from './rule-classifier.js';
import { LlmClassifier } from './llm-classifier.js';

export class HybridClassifier implements IntentClassifier {
  private ruleClassifier: RuleClassifier;
  private llmClassifier: LlmClassifier;
  private confidenceThreshold = 0.8;

  constructor() {
    this.ruleClassifier = new RuleClassifier();
    this.llmClassifier = new LlmClassifier();
  }

  public async classify(query: string): Promise<IntentClassification> {
    // 1. Run rule classifier
    const ruleResult = await this.ruleClassifier.classify(query);
    if (ruleResult.confidence >= this.confidenceThreshold) {
      return ruleResult;
    }

    // 2. Fallback to LLM semantic check
    const llmResult = await this.llmClassifier.classify(query);
    if (llmResult.intent !== 'UNKNOWN') {
      return llmResult;
    }

    // Return the rule classifier outcome if LLM also failed
    return ruleResult;
  }
}
