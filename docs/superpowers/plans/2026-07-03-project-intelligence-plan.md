# Project Intelligence Engine (Intent Engine) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Scaffold the `@smriti/ai` package and implement the hybrid Intent Engine (rule-based + LLM classification) to route user queries.

**Architecture:** Create an isolated package `packages/ai` in the monorepo. Build a `HybridClassifier` that runs synchronous, deterministic regex matches for common developer patterns first, and falls back to calling the LLM provider for conversational queries.

**Tech Stack:** Node.js v24 (built-in TS and tests), TypeScript v5.2, pnpm workspaces.

## Global Constraints
- **Offline-First**: Default classification rules must run completely offline without cost or network latency.
- **Type-Safety**: Match intents to a strict typescript enum `SmritiIntentType`.
- **Testing**: Run tests using native Node.js TS test execution (`node --experimental-strip-types --test`).

---

### Task 1: Scaffolding packages/ai

**Files:**
- Create: `packages/ai/package.json`
- Create: `packages/ai/tsconfig.json`
- Create: `packages/ai/src/index.ts`

**Interfaces:**
- Consumes: `@smriti/shared` package functions and models.
- Produces: Package bundle configurations and base export entry point.

- [ ] **Step 1: Create packages/ai package configuration**

Create `packages/ai/package.json` with ESM configuration and workspace dependencies:

```json
{
  "name": "@smriti/ai",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch",
    "clean": "rimraf dist",
    "test": "node --experimental-strip-types --test tests/intent-engine.test.ts"
  },
  "dependencies": {
    "@smriti/shared": "workspace:*"
  },
  "devDependencies": {
    "rimraf": "^5.0.5",
    "typescript": "^5.2.2"
  }
}
```

- [ ] **Step 2: Create packages/ai tsconfig**

Create `packages/ai/tsconfig.json` extending workspace settings:

```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "declaration": true
  },
  "include": ["src/**/*"]
}
```

- [ ] **Step 3: Create base export index**

Create `packages/ai/src/index.ts`:

```typescript
export * from './intent/types.ts';
export * from './intent/rule-classifier.ts';
export * from './intent/llm-classifier.ts';
export * from './intent/hybrid-classifier.ts';
```

- [ ] **Step 4: Register @smriti/ai workspace compile check**

Run: `pnpm install`
Expected: pnpm completes workspace linkage.

---

### Task 2: Implementing the Intent Engine Classifiers

**Files:**
- Create: `packages/ai/src/intent/types.ts`
- Create: `packages/ai/src/intent/rule-classifier.ts`
- Create: `packages/ai/src/intent/llm-classifier.ts`
- Create: `packages/ai/src/intent/hybrid-classifier.ts`

**Interfaces:**
- Consumes: Query inputs.
- Produces: `SmritiIntentType` enums and entity extractions.

- [ ] **Step 1: Write Intent Type declarations**

Create `packages/ai/src/intent/types.ts`:

```typescript
export type SmritiIntentType = 
  | 'CODE_SEARCH'
  | 'GIT_HISTORY'
  | 'CURRENT_TASK'
  | 'DECISION_LOOKUP'
  | 'PROJECT_SUMMARY'
  | 'UNKNOWN';

export interface IntentEntity {
  name: string;
  type: 'file' | 'symbol' | 'author' | 'feature' | 'unknown';
}

export interface IntentClassification {
  intent: SmritiIntentType;
  confidence: number; // 0.0 to 1.0
  entities: IntentEntity[];
}

export interface IntentClassifier {
  classify(query: string): Promise<IntentClassification>;
}
```

- [ ] **Step 2: Implement Rule-based Classifier**

Create `packages/ai/src/intent/rule-classifier.ts` with regex match lists:

```typescript
import { IntentClassification, IntentClassifier, SmritiIntentType, IntentEntity } from './types.ts';

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
```

- [ ] **Step 3: Implement LLM Classifier Fallback**

Create `packages/ai/src/intent/llm-classifier.ts` using external provider callbacks or high-quality offline simulation triggers:

```typescript
import { IntentClassification, IntentClassifier, SmritiIntentType } from './types.ts';

export class LlmClassifier implements IntentClassifier {
  private apiEndpoint = 'http://localhost:8000/api/chat';

  public async classify(query: string): Promise<IntentClassification> {
    try {
      // Connect to Daemon chat classifier api if online
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), 2000); // 2s timeout for intent check

      const response = await fetch(this.apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: `Classify the following developer query intent into one of these types: CODE_SEARCH, GIT_HISTORY, CURRENT_TASK, DECISION_LOOKUP, PROJECT_SUMMARY. Respond ONLY with a JSON object: {"intent": "TYPE", "confidence": 0.9, "entities": []}. Query: "${query}"` }),
        signal: controller.signal
      });
      clearTimeout(id);

      if (response.ok) {
        const body = await response.json() as any;
        const resText = body.answer;
        const jsonMatch = resText.match(/\{[\s\S]*?\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          return {
            intent: parsed.intent || 'UNKNOWN',
            confidence: parsed.confidence || 0.8,
            entities: parsed.entities || []
          };
        }
      }
    } catch {
      // Fall back to offline heuristics when daemon is unconfigured
    }

    // Local semantic inference when offline
    return this.fallbackHeuristics(query);
  }

  private fallbackHeuristics(query: string): IntentClassification {
    const lower = query.toLowerCase();
    if (lower.includes('how') || lower.includes('find') || lower.includes('file')) {
      return { intent: 'CODE_SEARCH', confidence: 0.6, entities: [] };
    }
    if (lower.includes('yesterday') || lower.includes('history') || lower.includes('changed')) {
      return { intent: 'GIT_HISTORY', confidence: 0.6, entities: [] };
    }
    return { intent: 'UNKNOWN', confidence: 0.0, entities: [] };
  }
}
```

- [ ] **Step 4: Implement Hybrid Coordinator Classifier**

Create `packages/ai/src/intent/hybrid-classifier.ts` mapping the fallback evaluation route:

```typescript
import { IntentClassification, IntentClassifier } from './types.ts';
import { RuleClassifier } from './rule-classifier.ts';
import { LlmClassifier } from './llm-classifier.ts';

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
```

---

### Task 3: Intent Engine Test Suite

**Files:**
- Create: `packages/ai/tests/intent-engine.test.ts`

**Interfaces:**
- Consumes: `HybridClassifier` endpoints.
- Produces: Test metrics for rules execution and hybrid fallbacks.

- [ ] **Step 1: Write native tests**

Create `packages/ai/tests/intent-engine.test.ts`:

```typescript
import { test, describe, before } from 'node:test';
import assert from 'node:assert';
import { HybridClassifier } from '../src/intent/hybrid-classifier.ts';

describe('Smriti AI Intent Engine verification', () => {
  let classifier: HybridClassifier;

  before(() => {
    classifier = new HybridClassifier();
  });

  test('Rules-based direct matches (High Confidence)', async () => {
    // Code search trigger
    const r1 = await classifier.classify('where is auth helper defined in index.ts');
    assert.strictEqual(r1.intent, 'CODE_SEARCH');
    assert.ok(r1.confidence >= 0.8);
    assert.strictEqual(r1.entities[0]?.name, 'index.ts');

    // Git history trigger
    const r2 = await classifier.classify('who changed database.py yesterday');
    assert.strictEqual(r2.intent, 'GIT_HISTORY');
    assert.ok(r2.confidence >= 0.8);
    assert.strictEqual(r2.entities[0]?.name, 'database.py');

    // Decision trigger
    const r3 = await classifier.classify('why was Redis selected as our backend database');
    assert.strictEqual(r3.intent, 'DECISION_LOOKUP');
    assert.ok(r3.confidence >= 0.8);
  });

  test('Conversational queries routing (Fallback mode)', async () => {
    // Falls back to offline heuristic classifier (returns CODE_SEARCH with confidence 0.6)
    const res = await classifier.classify('help me find where the event bus publishes things');
    assert.strictEqual(res.intent, 'CODE_SEARCH');
    assert.ok(res.confidence < 0.8);
  });
});
```

- [ ] **Step 2: Run building and testing checks**

Compile packages:
Run: `pnpm --filter @smriti/ai build`
Expected: Compile succeeds.

Run tests:
Run: `pnpm --filter @smriti/ai test`
Expected: All tests pass.

- [ ] **Step 3: Commit**

```bash
git add packages/ai
git commit -m "feat: implement packages/ai scaffolding and Hybrid Intent Engine"
```
