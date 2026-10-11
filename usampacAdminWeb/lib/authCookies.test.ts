import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  ACCESS_COOKIE,
  AUTH_COOKIE_OPTIONS,
  decodeJwtPayload,
  expireAuthCookies,
  REFRESH_COOKIE,
  userFromAccessToken,
  writeAuthCookies
} from './authCookies';

function jwtFor(payload: object): string {
  const json = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `header.${json}.sig`;
}

describe('authCookies', () => {
  it('reads a live access token and ignores an expired one', () => {
    const live = jwtFor({
      sub: '7b966ddf-a3e6-41c8-ab1d-31645ef11f0b',
      email: 'naqviasyed@gmail.com',
      exp: Math.floor(Date.now() / 1000) + 3600
    });
    assert.deepEqual(userFromAccessToken(live), {
      id: '7b966ddf-a3e6-41c8-ab1d-31645ef11f0b',
      email: 'naqviasyed@gmail.com'
    });
    const expired = jwtFor({
      sub: '7b966ddf-a3e6-41c8-ab1d-31645ef11f0b',
      exp: Math.floor(Date.now() / 1000) - 10
    });
    assert.equal(userFromAccessToken(expired), null);
    assert.equal(userFromAccessToken(''), null);
    assert.equal(decodeJwtPayload('not-a-jwt'), null);
  });

  it('writes and expires the usampac auth cookies only', () => {
    const set: Array<{ name: string; value: string; maxAge: number }> = [];
    writeAuthCookies(
      {
        set(name, value, options) {
          set.push({ name, value, maxAge: options.maxAge });
        }
      },
      { access_token: 'at', refresh_token: 'rt' }
    );
    expireAuthCookies({
      set(name, value, options) {
        set.push({ name, value, maxAge: options.maxAge });
      }
    });
    assert.equal(ACCESS_COOKIE, 'usampac-at');
    assert.equal(REFRESH_COOKIE, 'usampac-rt');
    assert.equal(AUTH_COOKIE_OPTIONS.httpOnly, true);
    assert.deepEqual(
      set.map((row) => row.name),
      [ACCESS_COOKIE, REFRESH_COOKIE, ACCESS_COOKIE, REFRESH_COOKIE]
    );
    assert.equal(set[0].value, 'at');
    assert.equal(set[2].value, '');
    assert.equal(set[2].maxAge, 0);
  });
});
