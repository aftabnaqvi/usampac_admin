import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { adminAccessFromRow, isAdminRole, NOT_ADMIN_LOGIN_MESSAGE } from './adminAccess';

describe('adminAccess', () => {
  it('allows only the ADMIN role', () => {
    assert.equal(isAdminRole('ADMIN'), true);
    assert.equal(isAdminRole('admin'), true);
    assert.equal(isAdminRole(' ADMIN '), true);
  });

  it('denies candidates, visitors, elected, and empty roles', () => {
    assert.equal(isAdminRole('CANDIDATE'), false);
    assert.equal(isAdminRole('USER'), false);
    assert.equal(isAdminRole('VISITOR'), false);
    assert.equal(isAdminRole('ELECTED'), false);
    assert.equal(isAdminRole(''), false);
    assert.equal(isAdminRole(null), false);
  });

  it('fails closed when the role row is missing or the query errors', () => {
    assert.equal(adminAccessFromRow(null), false);
    assert.equal(adminAccessFromRow({ role: 'CANDIDATE' }), false);
    assert.equal(adminAccessFromRow({ role: 'ADMIN' }, new Error('rls')), false);
    assert.equal(adminAccessFromRow({ role: 'ADMIN' }), true);
  });

  it('uses a clear login error for non-admins', () => {
    assert.equal(NOT_ADMIN_LOGIN_MESSAGE, 'This account is not an admin.');
  });
});
