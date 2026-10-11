import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { sendAdminInviteEmail } from './emailAdmin';

describe('emailAdmin', () => {
  it('is a no-op until an email provider is configured', async () => {
    assert.equal(await sendAdminInviteEmail('naqviasyed@gmail.com', 'https://example/magic', 'https://admin'), false);
  });
});
