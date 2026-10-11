import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  PROTECTED_DELETE_MESSAGE,
  deleteCandidatePath,
  isProtectedPerson,
  isRemovableDummyEmail
} from './protectedPeople';

describe('protectedPeople', () => {
  it('blocks real candidates and admin logins', () => {
    assert.equal(isProtectedPerson('68d5d58a-066a-4f79-a56d-c7095c335abf', 'info@lodhi2026.com'), true);
    assert.equal(isProtectedPerson('ab7ca576-1089-4c3f-acf7-19ac54f773e3', 'kashifwasim4u@gmail.com'), true);
    assert.equal(isProtectedPerson('7b966ddf-a3e6-41c8-ab1d-31645ef11f0b', 'naqviasyed@gmail.com'), true);
    assert.equal(isProtectedPerson('712b3698-adfe-4411-b3ee-770812c6c31e', 'istafazaidi@yahoo.com'), true);
    assert.equal(isProtectedPerson(null, 'INFO@LODHI2026.COM'), true);
    assert.equal(isProtectedPerson('68d5d58a-066a-4f79-a56d-c7095c335abf', 'other@example.com'), true);
  });

  it('keeps dummy emails identifiable without treating them as the only deletable accounts', () => {
    assert.equal(isRemovableDummyEmail('naqviasyed+test@gmail.com'), true);
    assert.equal(isRemovableDummyEmail('  NaqviAsyed+1@Gmail.com  '), true);
    assert.equal(isRemovableDummyEmail('naqviasyed+2@gmail.com'), true);
    assert.equal(isRemovableDummyEmail('someone+test@gmail.com'), false);
    assert.equal(isRemovableDummyEmail('naqviasyed@gmail.com'), false);
    assert.equal(isRemovableDummyEmail('info@lodhi2026.com'), false);
  });

  it('routes every Manage delete through soft-delete, including production listings', () => {
    assert.equal(deleteCandidatePath('68d5d58a-066a-4f79-a56d-c7095c335abf', 'info@lodhi2026.com'), 'soft');
    assert.equal(deleteCandidatePath('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'aziz.akbari@example.com'), 'soft');
    assert.equal(deleteCandidatePath('2769dd0e-2bc5-4e74-9336-a8fcb1970011', 'naqviasyed+test@gmail.com'), 'soft');
    assert.equal(
      PROTECTED_DELETE_MESSAGE.includes('soft-delete'),
      true
    );
  });
});
