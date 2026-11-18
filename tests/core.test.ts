import { describe, it, expect } from 'vitest';
import { SqliteStore, redactSecrets } from '../src/core/storage/sqliteStore';
import { aggregateEvidenceFromStore } from '../src/core/evidence/evidenceAggregator';

describe('CORE-01/02 Vitest integration', () => {
  it('masks secret patterns and keeps unverified evidence as unknown', () => {
    expect(redactSecrets('Bearer secret_token_12345')).toBe('Bearer [REDACTED_BEARER]');
    const store = new SqliteStore(':memory:');
    try {
      store.recordAgentEvent({
        agentId: 'codex',
        runId: null,
        origin: 'cloud-workspace-mcp',
        trust: 'unverified',
        open: true,
        taskStatus: 'running',
        taskId: 't-1',
        observedAtMs: 50_000,
      });
      const snap = aggregateEvidenceFromStore(store, ['codex'], 51_000);
      expect(snap.agents.codex.state).toBe('unknown');
      expect(snap.chiefVisible).toBe(false);
    } finally {
      store.close();
    }
  });
});
