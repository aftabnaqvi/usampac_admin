import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { deletionEmail, formatDeletionDate, needsDeletionNotice, parseDeletionEvent } from './deletionNotify';

const request = {
  email: 'naqviasyed+test@gmail.com',
  requested_at: '2026-10-17T05:43:17.543Z',
  delete_after: '2026-11-16T05:43:17.543Z'
};

const candidate = {
  display_name: 'Syed Naqvi',
  email: 'naqviasyed+test@gmail.com',
  office_level: 'LOCAL',
  office_name: 'School Board',
  city_name: 'Adelanto',
  state_code: 'CA',
  cycle: 2026
};

describe('deletionNotify', () => {
  it('treats anything but "cancelled" as a new request', () => {
    assert.equal(parseDeletionEvent('cancelled'), 'cancelled');
    assert.equal(parseDeletionEvent(' Cancelled '), 'cancelled');
    assert.equal(parseDeletionEvent('requested'), 'requested');
    assert.equal(parseDeletionEvent(undefined), 'requested');
    assert.equal(parseDeletionEvent('delete'), 'requested');
  });

  it('shows the deletion date in Pacific time, matching what the app shows the candidate', () => {
    // 05:43 UTC on Nov 16 is still Nov 15 in California.
    assert.equal(formatDeletionDate('2026-11-16T05:43:17.543Z'), 'November 15, 2026');
    assert.equal(formatDeletionDate(null), 'in 30 days');
    assert.equal(formatDeletionDate('garbage'), 'in 30 days');
  });

  it('builds a request email with name, office, date, and a link to the Deletions page', () => {
    const mail = deletionEmail('requested', request, candidate, 'https://admin.example');
    assert.equal(mail.subject, 'USAMPAC: Syed Naqvi asked to delete their account');
    assert.match(mail.text, /deleted automatically on November 15, 2026/);
    assert.match(mail.text, /30-day waiting period/);
    assert.match(mail.text, /LOCAL \/ School Board · Adelanto, CA · Election Year 2026/);
    assert.match(mail.text, /Account email: naqviasyed\+test@gmail.com/);
    assert.match(mail.text, /https:\/\/admin\.example\/deletions/);
    assert.match(mail.html, /<a href="https:\/\/admin\.example\/deletions">/);
  });

  it('builds a restore email that says nothing will be deleted', () => {
    const mail = deletionEmail('cancelled', request, candidate, 'https://admin.example');
    assert.equal(mail.subject, 'USAMPAC: Syed Naqvi restored their account');
    assert.match(mail.text, /Nothing will be deleted/);
    assert.doesNotMatch(mail.text, /deleted automatically/);
  });

  it('falls back to the account email when there is no profile', () => {
    const mail = deletionEmail('requested', request, null, 'https://admin.example');
    assert.equal(mail.subject, 'USAMPAC: naqviasyed+test@gmail.com asked to delete their account');
    assert.doesNotMatch(mail.text, /Election Year/);
  });

  it('escapes candidate-controlled text in the HTML body', () => {
    const mail = deletionEmail('requested', request, { ...candidate, display_name: '<img src=x>' }, 'https://a');
    assert.doesNotMatch(mail.html, /<img/);
    assert.match(mail.html, /&lt;img src=x&gt;/);
  });

  it('cron fallback only re-sends pending requests that were never announced', () => {
    assert.equal(needsDeletionNotice({ status: 'pending', notified_at: null }), true);
    assert.equal(needsDeletionNotice({ status: 'pending', notified_at: undefined }), true);
    assert.equal(needsDeletionNotice({ status: 'pending', notified_at: '2026-10-17T06:00:00Z' }), false);
    assert.equal(needsDeletionNotice({ status: 'cancelled', notified_at: null }), false);
    assert.equal(needsDeletionNotice({ status: 'completed', notified_at: null }), false);
  });
});
