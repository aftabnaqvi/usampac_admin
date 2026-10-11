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
