import { IntentClassification, IntentClassifier, SmritiIntentType, IntentEntity } from './types.js';

export class RuleClassifier implements IntentClassifier {
  private rules: { regex: RegExp; intent: SmritiIntentType; score: number }[] = [
    { regex: /(where is|find file|locate|code for)\b/i, intent: 'CODE_SEARCH', score: 0.9 },
    { regex: /\b(class|function|interface|method|const|hook)\b/i, intent: 'CODE_SEARCH', score: 0.7 },
    { regex: /\b(show|find|list|grep|search)\b.*\.(ts|tsx|js|py|css|html|yaml|json)$/i, intent: 'CODE_SEARCH', score: 0.95 },
    
    { regex: /(what happened|who modified|who changed|commit logs|git history)\b/i, intent: 'GIT_HISTORY', score: 0.9 },
    { regex: /\b(recent changes|yesterday|commits by)\b/i, intent: 'GIT_HISTORY', score: 0.8 },
    
    { regex: /(what is my task|todo|roadmap|active sprint|current task|what should i do)\b/i, intent: 'CURRENT_TASK', score: 0.9 },
    { regex: /\b(backlog|bugs list|open bugs|sprint plan)\b/i, intent: 'CURRENT_TASK', score: 0.8 },
    
    { regex: /(why was|why did we|why use|why chose|decision log|adr)\b/i, intent: 'DECISION_LOOKUP', score: 0.9 },
    { regex: /\b(postgres|redis|sqlite|mongodb|react|angular)\b.*\b(chose|choose|decision|architect)\b/i, intent: 'DECISION_LOOKUP', score: 0.85 },
    
    { regex: /(summarize project|project overview|tell me about the project|explain workspace)\b/i, intent: 'PROJECT_SUMMARY', score: 0.9 },
    { regex: /\b(high-level|repo summary|getting started)\b/i, intent: 'PROJECT_SUMMARY', score: 0.75 }
  ];

  public async classify(query: string): Promise<IntentClassification> {
    const trimmed = query.trim();
    let bestIntent: SmritiIntentType = 'UNKNOWN';
    let maxScore = 0;

    for (const rule of this.rules) {
      if (rule.regex.test(trimmed)) {
        if (rule.score > maxScore) {
          maxScore = rule.score;
          bestIntent = rule.intent;
        }
      }
    }

    const entities = this.extractEntities(trimmed);

    return {
      intent: bestIntent,
      confidence: maxScore,
      entities
    };
  }

  private extractEntities(query: string): IntentEntity[] {
    const entities: IntentEntity[] = [];
    
    // File extension extractor
    const fileMatch = query.match(/\b([a-zA-Z0-9_\-\/]+\.(ts|tsx|js|py|css|html|yaml|json))\b/i);
    if (fileMatch) {
      entities.push({ name: fileMatch[1], type: 'file' });
    }

    // Git commit hash extractor
    const hashMatch = query.match(/\b([0-9a-f]{7,40})\b/i);
    if (hashMatch && !query.includes('.')) {
      entities.push({ name: hashMatch[1], type: 'symbol' }); // could be commit hash
    }

    return entities;
  }
}
