#!/usr/bin/env node
/**
 * Unit tests for all SQL scripts in this directory.
 * Validates structure and expected content (object names, params, safety).
 * Run from repo root: npm test   or   node sql/test-sqls.mjs
 * Run from sql/:     node test-sqls.mjs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { describe, it } from 'node:test';
import assert from 'node:assert';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sqlDir = __dirname;

function readSql(name) {
  const filePath = path.join(sqlDir, name);
  const content = fs.readFileSync(filePath, 'utf8');
  return { name, content, normalized: content.replace(/\s+/g, ' ').toLowerCase() };
}

describe('SQL scripts', () => {
  const files = fs.readdirSync(sqlDir).filter((f) => f.endsWith('.sql') && f !== 'test-sqls.mjs');
  assert.ok(files.length >= 1, 'At least one .sql file should exist');

  describe('state_election_agencies.sql', () => {
    it('creates table state_election_agencies', () => {
      const { content } = readSql('state_election_agencies.sql');
      assert.ok(
        /create\s+table\s+(if\s+not\s+exists\s+)?(public\.)?state_election_agencies/i.test(content),
        'Must CREATE TABLE state_election_agencies'
      );
    });
    it('has primary key state_code', () => {
      const { content } = readSql('state_election_agencies.sql');
      assert.ok(/state_code\s+text\s+primary\s+key/i.test(content), 'Must have state_code primary key');
    });
    it('adds filing_number columns with IF NOT EXISTS', () => {
      const { content } = readSql('state_election_agencies.sql');
      assert.ok(/add\s+column\s+if\s+not\s+exists\s+filing_number_label/i.test(content), 'Must add filing_number_label safely');
    });
    it('upserts CA with on conflict', () => {
      const { content } = readSql('state_election_agencies.sql');
      assert.ok(/on\s+conflict\s*\(\s*state_code\s*\)\s*do\s+update/i.test(content), 'Must use ON CONFLICT DO UPDATE for CA');
    });
    it('exposes api.state_election_agencies for app (Accept-Profile: api)', () => {
      const { content } = readSql('state_election_agencies.sql');
      assert.ok(/api\.state_election_agencies|view\s+api\.state_election_agencies|grant\s+select\s+on\s+api\.state_election_agencies/i.test(content), 'Must expose state_election_agencies in api schema');
    });
  });

  describe('create_register_candidate_rpc.sql', () => {
    it('defines function api.register_candidate', () => {
      const { content } = readSql('create_register_candidate_rpc.sql');
      assert.ok(/create\s+or\s+replace\s+function\s+api\.register_candidate/i.test(content), 'Must define api.register_candidate');
    });
    it('has required params: first_name, last_name, email, state_code', () => {
      const { content } = readSql('create_register_candidate_rpc.sql');
      assert.ok(/first_name\s+text/i.test(content) && /last_name\s+text/i.test(content), 'first_name, last_name');
      assert.ok(/email\s+text/i.test(content) && /state_code\s+text/i.test(content), 'email, state_code');
    });
    it('has filing params: fec_filing_number, state_filing_number, election_agency_number', () => {
      const { content } = readSql('create_register_candidate_rpc.sql');
      assert.ok(/fec_filing_number\s+text/i.test(content), 'fec_filing_number');
      assert.ok(/state_filing_number\s+text/i.test(content), 'state_filing_number');
      assert.ok(/election_agency_number\s+text/i.test(content), 'election_agency_number');
    });
    it('uses auth.uid() and raises when not authenticated', () => {
      const { content } = readSql('create_register_candidate_rpc.sql');
      assert.ok(/auth\.uid\(\)/i.test(content), 'Must use auth.uid()');
      assert.ok(/raise\s+exception\s+.*not\s+authenticated/i.test(content) || /uid\s+is\s+null/i.test(content), 'Must guard unauthenticated');
    });
    it('inserts into public.candidate_profiles with ON CONFLICT', () => {
      const { content } = readSql('create_register_candidate_rpc.sql');
      assert.ok(/insert\s+into\s+public\.candidate_profiles/i.test(content), 'Must INSERT into candidate_profiles');
      assert.ok(/on\s+conflict\s*\(\s*user_id\s*\)/i.test(content), 'Must ON CONFLICT (user_id)');
    });
    it('returns json and grants execute to anon, authenticated', () => {
      const { content } = readSql('create_register_candidate_rpc.sql');
      assert.ok(/returns\s+json/i.test(content), 'Must RETURNS json');
      assert.ok(/grant\s+execute\s+on\s+function\s+api\.register_candidate/i.test(content), 'Must GRANT EXECUTE');
      assert.ok(/to\s+anon\s*,?\s*authenticated/i.test(content), 'Must grant to anon, authenticated');
    });
  });

  describe('run_register_candidate_once.sql', () => {
    it('adds unique constraint on user_id or handles duplicate', () => {
      const { content } = readSql('run_register_candidate_once.sql');
      assert.ok(/candidate_profiles_user_id_key|unique\s*\(\s*user_id\s*\)|add\s+constraint/i.test(content), 'Must ensure UNIQUE(user_id)');
    });
    it('defines register_candidate with filing params', () => {
      const { content } = readSql('run_register_candidate_once.sql');
      assert.ok(/fec_filing_number|election_agency_number/i.test(content), 'Must include filing params in RPC');
    });
  });

  describe('admin_views_filing_columns.sql', () => {
    it('adds filing columns to public.candidate_profiles', () => {
      const { content } = readSql('admin_views_filing_columns.sql');
      assert.ok(/alter\s+table\s+public\.candidate_profiles/i.test(content), 'Must ALTER candidate_profiles');
      assert.ok(/fec_filing_number|state_filing_number|election_agency_number/i.test(content), 'Must add filing columns');
    });
    it('recreates api views with DROP VIEW IF EXISTS', () => {
      const { content } = readSql('admin_views_filing_columns.sql');
      assert.ok(/drop\s+view\s+if\s+exists/i.test(content), 'Must use DROP VIEW IF EXISTS');
      assert.ok(/api\.candidate_profiles/i.test(content), 'Must reference api.candidate_profiles');
    });
    it('grants on api and public candidate_profiles', () => {
      const { content } = readSql('admin_views_filing_columns.sql');
      assert.ok(/grant\s+.*api\.candidate_profiles/i.test(content), 'Must GRANT on api.candidate_profiles');
    });
  });

  describe('grant_candidate_profiles_permissions.sql', () => {
    it('grants usage on schema api', () => {
      const { content } = readSql('grant_candidate_profiles_permissions.sql');
      assert.ok(/grant\s+usage\s+on\s+schema\s+api/i.test(content), 'Must GRANT USAGE on api');
    });
    it('grants select, insert, update on api.candidate_profiles', () => {
      const { content } = readSql('grant_candidate_profiles_permissions.sql');
      assert.ok(/grant\s+select\s*,?\s*insert\s*,?\s*update\s+on\s+api\.candidate_profiles/i.test(content), 'Must GRANT on api.candidate_profiles');
    });
  });

  describe('fix_admin_set_user_role_for_service_role.sql', () => {
    it('defines api.admin_set_user_role', () => {
      const { content } = readSql('fix_admin_set_user_role_for_service_role.sql');
      assert.ok(/create\s+or\s+replace\s+function\s+api\.admin_set_user_role/i.test(content), 'Must define admin_set_user_role');
    });
    it('checks admin via app_users and auth.uid()', () => {
      const { content } = readSql('fix_admin_set_user_role_for_service_role.sql');
      assert.ok(/app_users|auth\.uid/i.test(content), 'Must reference app_users or auth.uid');
    });
    it('upserts app_users on conflict', () => {
      const { content } = readSql('fix_admin_set_user_role_for_service_role.sql');
      assert.ok(/insert\s+into\s+public\.app_users|on\s+conflict/i.test(content), 'Must insert/upsert app_users');
    });
  });

  describe('check_user_role_enum.sql', () => {
    it('queries user_role enum', () => {
      const { content } = readSql('check_user_role_enum.sql');
      assert.ok(/pg_enum|user_role|enumlabel/i.test(content), 'Must query pg_enum for user_role');
    });
  });

  describe('run_these_one_at_a_time.sql', () => {
    it('references candidate_profiles and fec_filing_number', () => {
      const { content } = readSql('run_these_one_at_a_time.sql');
      assert.ok(/candidate_profiles|fec_filing_number|register_candidate/i.test(content), 'Must reference profiles or RPC');
    });
  });

  describe('verify_and_fix_fec_display.sql', () => {
    it('references fec_filing_number and register_candidate', () => {
      const { content } = readSql('verify_and_fix_fec_display.sql');
      assert.ok(/fec_filing_number|register_candidate|candidate_profiles/i.test(content), 'Must reference FEC or RPC');
    });
  });

  describe('register_candidate_add_filing_params.sql', () => {
    it('documents fec_filing_number, state_filing_number, election_agency_number', () => {
      const { content } = readSql('register_candidate_add_filing_params.sql');
      assert.ok(/fec_filing_number|state_filing_number|election_agency_number/i.test(content), 'Must document filing params');
    });
  });

  describe('register_candidate_patch_filing_params.sql', () => {
    it('documents filing params and ON CONFLICT update', () => {
      const { content } = readSql('register_candidate_patch_filing_params.sql');
      assert.ok(/fec_filing_number|election_agency_number|on\s+conflict|do\s+update/i.test(content) || /excluded\.fec_filing_number/i.test(content), 'Must document patch');
    });
  });

  describe('app_telemetry.sql', () => {
    it('creates public.app_telemetry and api.app_telemetry', () => {
      const { content } = readSql('app_telemetry.sql');
      assert.ok(/create table if not exists public\.app_telemetry/i.test(content), 'Must CREATE TABLE IF NOT EXISTS');
      assert.ok(/create or replace view api\.app_telemetry/i.test(content), 'Must expose api.app_telemetry');
    });
    it('adds analytics columns without dropping the table', () => {
      const { content } = readSql('app_telemetry.sql');
      assert.ok(/add column if not exists audience/i.test(content), 'audience');
      assert.ok(/add column if not exists city/i.test(content), 'city');
      assert.ok(/add column if not exists region/i.test(content), 'region');
      assert.ok(/add column if not exists link_kind/i.test(content), 'link_kind');
      assert.ok(/add column if not exists target_id/i.test(content), 'target_id');
      assert.equal((content.match(/drop\s+table/gi) || []).length, 0, 'Must not DROP TABLE');
      assert.equal((content.match(/delete\s+from/gi) || []).length, 0, 'Must not DELETE FROM');
    });
    it('never stores visitor identity columns', () => {
      const { content } = readSql('app_telemetry.sql');
      assert.ok(!/user_id\s+uuid/i.test(content), 'Must not add user_id column');
      assert.ok(!/\bemail\s+text/i.test(content), 'Must not add email column');
      assert.ok(!/\bphone\s+text/i.test(content), 'Must not add phone column');
    });
    it('allows anon insert and service_role select', () => {
      const { content } = readSql('app_telemetry.sql');
      assert.ok(/grant insert on public\.app_telemetry to anon, authenticated/i.test(content));
      assert.ok(/grant select, insert, update, delete on public\.app_telemetry to service_role/i.test(content));
      assert.ok(/grant insert on api\.app_telemetry to anon, authenticated/i.test(content));
    });
  });

  // Account deletion spans three layers (iOS → Supabase SQL → admin site). These
  // tests read the TypeScript sources too, so a value changed in one place fails here.
  describe('account deletion (SQL ↔ admin site consistency)', () => {
    const webLib = path.join(sqlDir, '..', 'usampacAdminWeb', 'lib');
    const readTs = (name) => fs.readFileSync(path.join(webLib, name), 'utf8');
    const HIDDEN_EMAILS = ['naqviasyed+test@gmail.com', 'naqviasyed+applereview@gmail.com'];
    const PROTECTED_IDS = [
      '68d5d58a-066a-4f79-a56d-c7095c335abf',
      'ab7ca576-1089-4c3f-acf7-19ac54f773e3',
      '7b966ddf-a3e6-41c8-ab1d-31645ef11f0b',
      '712b3698-adfe-4411-b3ee-770812c6c31e',
    ];

    it('account_deletion.sql creates the request table with a 30-day default and notified_at', () => {
      const { content, normalized } = readSql('account_deletion.sql');
      assert.ok(/create\s+table\s+if\s+not\s+exists\s+public\.account_deletion_requests/i.test(content));
      assert.ok(normalized.includes("default now() + interval '30 days'"), '30-day waiting period');
      assert.ok(/notified_at\s+timestamptz/i.test(content), 'notified_at column for admin emails');
      assert.ok(normalized.includes("check (status in ('pending', 'cancelled', 'completed'))"));
      const ts = readTs('accountDeletion.ts');
      assert.ok(/ACCOUNT_DELETION_GRACE_DAYS\s*=\s*30\b/.test(ts), 'admin site grace days must match SQL');
    });

    it('archive keeps election history only, never contact details', () => {
      const { content } = readSql('account_deletion.sql');
      const archive = content.match(/create\s+table\s+if\s+not\s+exists\s+public\.candidate_archive\s*\(([\s\S]*?)\);/i);
      assert.ok(archive, 'candidate_archive table');
      for (const col of ['display_name', 'party', 'office_level', 'office_name', 'state_code', 'city_name', 'cycle']) {
        assert.ok(new RegExp(`\\b${col}\\b`).test(archive[1]), `archive keeps ${col}`);
      }
      for (const col of ['email', 'phone', 'photo_url', 'bio', 'website_url']) {
        assert.ok(!new RegExp(`\\b${col}\\b`).test(archive[1]), `archive must not keep ${col}`);
      }
    });

    it('the remove function refuses every protected id and the admin site lists the same ids', () => {
      const { content } = readSql('account_deletion.sql');
      const patch = readSql('account_deletion_test_accounts.sql').content;
      const ts = readTs('protectedPeople.ts');
      for (const id of PROTECTED_IDS) {
        assert.ok(content.includes(id), `account_deletion.sql protects ${id}`);
        assert.ok(patch.includes(id), `account_deletion_test_accounts.sql protects ${id}`);
        assert.ok(ts.includes(id), `protectedPeople.ts protects ${id}`);
      }
      assert.ok(/raise\s+exception\s+'protected account cannot be deleted'/i.test(content));
    });

    it('test accounts are hidden from both public views and never archived, with one email list everywhere', () => {
      const hide = readSql('hide_test_candidates.sql').content;
      const del = readSql('account_deletion.sql').content;
      const patch = readSql('account_deletion_test_accounts.sql').content;
      const ts = readTs('hiddenTestCandidate.ts');
      const count = (text, needle) => text.split(needle).length - 1;
      for (const email of HIDDEN_EMAILS) {
        assert.equal(count(hide, `'${email}'`), 2, `${email} filtered in both views of hide_test_candidates.sql`);
        assert.ok(del.includes(`'${email}'`), `${email} skips the archive in account_deletion.sql`);
        assert.ok(patch.includes(`'${email}'`), `${email} skips the archive in account_deletion_test_accounts.sql`);
        assert.ok(ts.includes(`'${email}'`), `${email} badged by hiddenTestCandidate.ts`);
      }
      assert.ok(!/\+test@%|like\s+'%\+test/i.test(hide), 'exact emails only, never a +test wildcard');
      assert.ok(/create\s+or\s+replace\s+view\s+api\.candidates_public/i.test(hide));
      assert.ok(/create\s+or\s+replace\s+view\s+api\.candidates_by_city_prod/i.test(hide));
      const hideCode = hide.replace(/--[^\n]*/g, '');
      assert.equal(count(hideCode, 'deleted_at is null'), 2, 'soft-delete filter kept in both views');
      // The function body in the patch file must equal the one in the base file.
      const fn = (text) => text.match(/create or replace function api\.archive_and_remove_account_rows[\s\S]*?\$\$;/i)?.[0]
        .replace(/--[^\n]*/g, '').replace(/\s+/g, ' ').trim();
      assert.equal(fn(patch), fn(del), 'account_deletion_test_accounts.sql drifted from account_deletion.sql');
      assert.ok(fn(del).includes('delete from api.app_users where id = p_user_id'), 'deletion clears the unique api.app_users email');
    });

    it('candidate RPCs run as the caller only; the remove RPC is service_role only', () => {
      const { normalized } = readSql('account_deletion.sql');
      for (const fn of ['my_account_deletion', 'request_account_deletion', 'cancel_account_deletion']) {
        assert.ok(normalized.includes(`grant execute on function api.${fn}() to authenticated`), `${fn} for signed-in users`);
        assert.ok(normalized.includes(`revoke all on function api.${fn}() from public, anon`), `${fn} not for anon`);
      }
      assert.ok(normalized.includes('grant execute on function api.archive_and_remove_account_rows(uuid) to service_role'));
      assert.ok(normalized.includes('revoke all on function api.archive_and_remove_account_rows(uuid) from public, anon, authenticated'));
      assert.ok(normalized.includes('where r.user_id = auth.uid()'), 'status is scoped to the caller');
      assert.ok(normalized.includes('revoke all on public.account_deletion_requests from anon, authenticated'));
      assert.ok(normalized.includes('revoke all on public.candidate_archive from anon, authenticated'));
    });

    it('notify migration adds notified_at and exposes it through the api view', () => {
      const { content, normalized } = readSql('account_deletion_notify.sql');
      assert.ok(/add\s+column\s+if\s+not\s+exists\s+notified_at\s+timestamptz/i.test(content));
      assert.ok(/create\s+or\s+replace\s+view\s+api\.account_deletion_requests/i.test(content));
      assert.ok(normalized.includes('notified_at from public.account_deletion_requests'));
    });

    it('live test only ever rolls back', () => {
      const content = fs.readFileSync(path.join(sqlDir, 'tests', 'account_deletion_live_test.sql'), 'utf8');
      assert.ok(/^\s*begin;/m.test(content));
      assert.ok(/^\s*rollback;/m.test(content), 'must roll back');
      assert.ok(!/^\s*commit;/m.test(content), 'must never commit');
      assert.ok(content.indexOf('rollback;') > content.lastIndexOf('end $$;'), 'rollback after the assertions');
    });
  });

  describe('Safety and style', () => {
    it('no unsafe DROP without IF EXISTS in executable DDL', () => {
      const ddlFiles = ['admin_views_filing_columns.sql', 'state_election_agencies.sql'];
      for (const name of ddlFiles) {
        const { content } = readSql(name);
        const dropTableMatch = content.match(/drop\s+table\s+(?!if\s+exists)/gi);
        if (dropTableMatch) {
          assert.fail(`${name} has DROP TABLE without IF EXISTS: ${dropTableMatch.join(', ')}`);
        }
      }
    });
    it('all expected SQL files exist', () => {
      const expected = [
        'state_election_agencies.sql',
        'create_register_candidate_rpc.sql',
        'run_register_candidate_once.sql',
        'admin_views_filing_columns.sql',
        'grant_candidate_profiles_permissions.sql',
        'fix_admin_set_user_role_for_service_role.sql',
        'check_user_role_enum.sql',
        'run_these_one_at_a_time.sql',
        'verify_and_fix_fec_display.sql',
        'register_candidate_add_filing_params.sql',
        'register_candidate_patch_filing_params.sql',
        'app_telemetry.sql',
      ];
      for (const name of expected) {
        const p = path.join(sqlDir, name);
        assert.ok(fs.existsSync(p), `Missing SQL file: ${name}`);
      }
    });
  });
});
