import { test, describe, before } from 'node:test';
import assert from 'node:assert';
import { HybridClassifier } from '../dist/intent/hybrid-classifier.js';

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
