import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  APP_USERS_ID_COLUMNS,
  APP_USERS_VIEW,
  isAdminUser,
  listAdmins,
  removeAdmin,
  resolveAppUsersIdColumn,
  SET_USER_ROLE_RPC,
  upsertAdmin
} from './appUsers';

function fakeAppUsersDb(options: {
  availableColumn?: (typeof APP_USERS_ID_COLUMNS)[number];
  role?: string | null;
}) {
  const calls: Array<{ rpc?: string; args?: unknown }> = [];
  const db = {
    schema(name: string) {
      assert.equal(name, 'api');
      return db;
    },
    from() {
      return {
        select(columns: string) {
          const probe = APP_USERS_ID_COLUMNS.find((column) => column === columns);
          return {
            limit() {
              if (probe) {
                const ok = !options.availableColumn || probe === options.availableColumn;
                return Promise.resolve({
                  data: null,
                  error: ok ? null : { message: `column "${columns}" does not exist` }
                });
              }
              return {
                eq() {
                  return {
                    limit() {
                      return {
                        maybeSingle: async () => ({
                          data: options.role ? { role: options.role } : null,
                          error: null
                        })
                      };
                    }
                  };
                }
              };
            },
            eq() {
              return {
                limit() {
                  return Promise.resolve({
                    data: options.role === 'ADMIN' ? [{ role: 'ADMIN', email: 'naqviasyed@gmail.com' }] : [],
                    error: null
                  });
                }
              };
            }
          };
        }
      };
    },
    rpc(name: string, args: unknown) {
      calls.push({ rpc: name, args });
      return Promise.resolve({ data: null, error: null });
    }
  };
  return { db, calls };
}

describe('appUsers', () => {
  it('looks up app_users_admin by auth_sub then user_id then id', async () => {
    assert.deepEqual([...APP_USERS_ID_COLUMNS], ['auth_sub', 'user_id', 'id']);
    assert.equal(APP_USERS_VIEW, 'app_users_admin');
    const { db } = fakeAppUsersDb({ availableColumn: 'id' });
    assert.equal(await resolveAppUsersIdColumn(db), 'id');
  });

  it('fails closed for a blank user id or non-admin role', async () => {
    const { db } = fakeAppUsersDb({ availableColumn: 'auth_sub', role: 'CANDIDATE' });
    assert.equal(await isAdminUser(db, ''), false);
    assert.equal(await isAdminUser(db, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'), false);
  });

  it('sets and clears ADMIN through admin_set_user_role', async () => {
    const { db, calls } = fakeAppUsersDb({});
    await upsertAdmin(db, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
    await removeAdmin(db, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
    assert.equal(SET_USER_ROLE_RPC, 'admin_set_user_role');
    assert.deepEqual(calls, [
      { rpc: 'admin_set_user_role', args: { p_user_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', p_role: 'ADMIN' } },
      { rpc: 'admin_set_user_role', args: { p_user_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', p_role: 'USER' } }
    ]);
  });

  it('lists only ADMIN rows from the admin view', async () => {
    const { db } = fakeAppUsersDb({ availableColumn: 'auth_sub', role: 'ADMIN' });
    const result = await listAdmins(db);
    assert.equal(result.idColumn, 'auth_sub');
    assert.equal(result.error, null);
    assert.equal(result.data.length, 1);
  });
});
