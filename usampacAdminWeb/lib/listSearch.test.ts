import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { listSearchQuery, matchesListQuery } from './listSearch';

describe('listSearch', () => {
  it('trims the query', () => {
    assert.equal(listSearchQuery('  Fremont  '), 'Fremont');
    assert.equal(listSearchQuery(null), '');
  });

  it('matches candidate fields case-insensitively', () => {
    const row = { display_name: 'Qasim Lodhi', city_name: 'Union City', office_name: 'City Council' };
    assert.equal(matchesListQuery(row, ''), true);
    assert.equal(matchesListQuery(row, 'lodhi'), true);
    assert.equal(matchesListQuery(row, 'union'), true);
    assert.equal(matchesListQuery(row, 'senate'), false);
    assert.equal(matchesListQuery(null, 'lodhi'), false);
  });
});
