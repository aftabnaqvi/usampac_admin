import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { safeNextPath } from './safeNextPath';

describe('safeNextPath', () => {
  it('defaults missing paths to dashboard', () => {
    assert.equal(safeNextPath(null), '/dashboard');
    assert.equal(safeNextPath(''), '/dashboard');
    assert.equal(safeNextPath('https://evil.example'), '/dashboard');
    assert.equal(safeNextPath('//evil.example'), '/dashboard');
  });

  it('allows admin pages including analytics', () => {
    assert.equal(safeNextPath('/analytics'), '/analytics');
    assert.equal(safeNextPath('/analytics?from=2026-10-01'), '/analytics');
    assert.equal(safeNextPath('/notifications'), '/notifications');
    assert.equal(safeNextPath('/polls'), '/polls');
    assert.equal(safeNextPath('/quiz'), '/quiz');
    assert.equal(safeNextPath('/dashboard'), '/dashboard');
  });

  it('rejects unknown in-app paths', () => {
    assert.equal(safeNextPath('/login'), '/dashboard');
    assert.equal(safeNextPath('/api/pending-notify'), '/dashboard');
  });
});
