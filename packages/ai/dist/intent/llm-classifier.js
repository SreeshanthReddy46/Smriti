export class LlmClassifier {
    apiEndpoint = 'http://localhost:8000/api/chat';
    async classify(query) {
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
                const body = await response.json();
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
        }
        catch {
            // Fall back to offline heuristics when daemon is unconfigured
        }
        // Local semantic inference when offline
        return this.fallbackHeuristics(query);
    }
    fallbackHeuristics(query) {
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
