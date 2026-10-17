import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  adminAppUrl,
  formSubmitAccepted,
  formSubmitPayload,
  formSubmitUrl,
  hasResendConfig,
  isCronAuthorized,
  isPendingApprovalStatus,
  isWebhookAuthorized,
  pendingCandidateFromRow,
  shouldNotifyPendingRow,
  shouldNotifyWebhookBody
} from './pendingNotify';

describe('pendingNotify', () => {
  it('maps a profile row without inventing office fields', () => {
    assert.deepEqual(
      pendingCandidateFromRow({
        display_name: 'Jane Doe',
        email: 'jane@example.com',
        office_name: 'Governor',
        office_level: 'STATE',
        city_name: 'Sacramento',
        state_code: 'CA',
        cycle: 2026
      }),
      {
        display_name: 'Jane Doe',
        email: 'jane@example.com',
        office_name: 'Governor',
        office_level: 'STATE',
        office_type: null,
        city_name: 'Sacramento',
        state_code: 'CA',
        cycle: 2026
      }
    );
  });

  it('treats only pending as notifyable', () => {
    assert.equal(isPendingApprovalStatus('pending'), true);
    assert.equal(isPendingApprovalStatus('PENDING'), true);
    assert.equal(isPendingApprovalStatus('approved'), false);
    assert.equal(isPendingApprovalStatus(null), false);
  });

  it('skips soft-deleted and stale pending rows on the cron backup', () => {
    const now = new Date('2026-10-11T08:00:00.000Z');
    assert.equal(shouldNotifyPendingRow({ deleted_at: '2026-10-11T07:00:00.000Z' }, now), false);
    assert.equal(shouldNotifyPendingRow({ last_user_edit_at: null }, now), true);
    assert.equal(shouldNotifyPendingRow({ last_user_edit_at: '2026-10-10T10:00:00.000Z' }, now), true);
    assert.equal(shouldNotifyPendingRow({ last_user_edit_at: '2026-10-09T08:00:00.000Z' }, now), false);
  });

  it('authorizes webhook and cron without treating a candidate JWT as a secret', () => {
    const headers = (values: Record<string, string>) => ({
      get(name: string) {
        return values[name.toLowerCase()] ?? null;
      }
    });
    assert.equal(isWebhookAuthorized(headers({ authorization: 'Bearer hook' }), 'hook'), true);
    assert.equal(isWebhookAuthorized(headers({ 'x-webhook-secret': 'hook' }), 'hook'), true);
    assert.equal(isWebhookAuthorized(headers({ authorization: 'Bearer user-jwt' }), 'hook'), false);
    assert.equal(isWebhookAuthorized(headers({}), ''), false);
    assert.equal(isCronAuthorized(headers({ 'x-vercel-cron': '1' })), true);
    assert.equal(isCronAuthorized(headers({ authorization: 'Bearer cron' }), 'cron'), true);
    assert.equal(isCronAuthorized(headers({ authorization: 'Bearer nope' }), 'cron'), false);
  });

  it('notifies only the first time a row becomes pending', () => {
    assert.equal(shouldNotifyWebhookBody({ record: { approval_status: 'pending' } }), true);
    assert.equal(
      shouldNotifyWebhookBody({
        record: { approval_status: 'pending' },
        old_record: { approval_status: 'pending' }
      }),
      false
    );
    assert.equal(shouldNotifyWebhookBody({ record: { approval_status: 'approved' } }), false);
    assert.equal(adminAppUrl().startsWith('https://'), true);
  });

  it('falls back to FormSubmit exactly like the iOS app when Resend is not configured', () => {
    assert.equal(hasResendConfig({}), false);
    assert.equal(hasResendConfig({ RESEND_API_KEY: 'k' }), false);
    assert.equal(hasResendConfig({ RESEND_API_KEY: 'k', ADMIN_NOTIFY_FROM: 'USAMPAC <no-reply@usampac.org>' }), true);

    // Same relay URL and fields as PendingNotifyPolicy.formSubmitPayload in the app.
    assert.equal(formSubmitUrl(' NaqviAsyed@Gmail.com '), 'https://formsubmit.co/ajax/naqviasyed@gmail.com');
    assert.deepEqual(formSubmitPayload('USAMPAC: X asked to delete their account', 'body'), {
      _subject: 'USAMPAC: X asked to delete their account',
      _template: 'box',
      _captcha: 'false',
      name: 'USAMPAC',
      message: 'body'
    });

    assert.equal(formSubmitAccepted('{"success":"true","message":"The form was submitted successfully."}'), true);
    assert.equal(formSubmitAccepted('{"success": true}'), true);
    assert.equal(formSubmitAccepted('{"success":"false","message":"Activate"}'), false);
    assert.equal(formSubmitAccepted('<html>blocked</html>'), false);
  });
});
