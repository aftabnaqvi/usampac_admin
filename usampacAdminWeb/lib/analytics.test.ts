import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { addDaysYmd, eachYmd, parseAnalyticsRange, pacificDayStartIso, MAX_RANGE_DAYS } from './analyticsRange';
import { summarizeTelemetry } from './analyticsStats';

describe('analyticsRange', () => {
  it('adds calendar days without using local timezone', () => {
    assert.equal(addDaysYmd('2026-10-31', 1), '2026-11-01');
    assert.equal(addDaysYmd('2026-03-08', -1), '2026-03-07');
  });

  it('lists inclusive days and caps long spans', () => {
    assert.deepEqual(eachYmd('2026-10-07', '2026-10-09'), ['2026-10-07', '2026-10-08', '2026-10-09']);
    assert.equal(eachYmd('2020-01-01', '2026-01-01').length, MAX_RANGE_DAYS);
  });

  it('parses presets and swaps inverted dates', () => {
    const today = parseAnalyticsRange({ preset: 'today' });
    assert.equal(today.from, today.to);
    const week = parseAnalyticsRange({ preset: '7' });
    assert.equal(eachYmd(week.from, week.to).length, 7);
    const swapped = parseAnalyticsRange({ from: '2026-01-20', to: '2026-01-10' });
    assert.equal(swapped.from, '2026-01-10');
    assert.equal(swapped.to, '2026-01-20');
  });

  it('converts Pacific midnight to an ISO instant', () => {
    const iso = pacificDayStartIso('2026-10-11');
    const utcHour = new Date(iso).getUTCHours();
    assert.ok(utcHour === 7 || utcHour === 8, `expected PDT/PST hour, got ${utcHour}`);
  });
});

describe('summarizeTelemetry', () => {
  const lodhi = '68d5d58a-066a-4f79-a56d-c7095c335abf';
  const names = new Map([[lodhi, 'Qasim Lodhi']]);

  it('counts unique launches, donate by city, and listing clicks', () => {
    const rows = [
      {
        occurred_at: '2026-10-11T16:00:00.000Z',
        event_name: 'app_open',
        screen: 'home',
        install_id: '11111111-1111-1111-1111-111111111111',
        audience: 'guest',
        city: 'Fremont',
        region: 'CA',
        link_kind: null,
        target_kind: null,
        target_id: null
      },
      {
        occurred_at: '2026-10-11T17:00:00.000Z',
        event_name: 'app_open',
        screen: 'home',
        install_id: '11111111-1111-1111-1111-111111111111',
        audience: 'guest',
        city: 'Fremont',
        region: 'CA',
        link_kind: null,
        target_kind: null,
        target_id: null
      },
      {
        occurred_at: '2026-10-11T18:00:00.000Z',
        event_name: 'link_opened',
        screen: 'profile',
        install_id: '11111111-1111-1111-1111-111111111111',
        audience: 'guest',
        city: 'Fremont',
        region: 'CA',
        link_kind: 'donate',
        target_kind: 'candidate',
        target_id: lodhi
      },
      {
        occurred_at: '2026-10-11T18:05:00.000Z',
        event_name: 'link_opened',
        screen: 'profile',
        install_id: '22222222-2222-2222-2222-222222222222',
        audience: 'candidate',
        city: 'Union City',
        region: 'CA',
        link_kind: 'call',
        target_kind: 'candidate',
        target_id: lodhi
      }
    ];
    const stats = summarizeTelemetry(rows, '2026-10-11', '2026-10-11', names);
    assert.equal(stats.uniqueLaunches, 1);
    assert.equal(stats.uniqueGuests, 1);
    assert.equal(stats.uniqueCandidates, 0);
    assert.equal(stats.donateTaps, 1);
    assert.equal(stats.topCity, 'Fremont, CA');
    assert.equal(stats.listingRows[0].name, 'Qasim Lodhi');
    assert.equal(stats.listingRows[0].donate, 1);
    assert.equal(stats.listingRows[0].call, 1);
    assert.equal(stats.cityClickRows.find((r) => r.city.startsWith('Fremont'))?.donate, 1);
    assert.equal(stats.listingCityDonate[0].label, 'Qasim Lodhi · Fremont, CA');
    assert.ok(!JSON.stringify(stats).includes('@'));
  });

  it('fills empty days in the selected range', () => {
    const stats = summarizeTelemetry([], '2026-10-01', '2026-10-03', new Map());
    assert.equal(stats.series.length, 3);
    assert.equal(stats.series.every((p) => p.value === 0), true);
    assert.equal(stats.uniqueLaunches, 0);
    assert.equal(stats.uniqueGuests, 0);
    assert.equal(stats.uniqueCandidates, 0);
  });

  it('counts guest and candidate launches separately', () => {
    const guestId = '11111111-1111-1111-1111-111111111111';
    const candidateId = '22222222-2222-2222-2222-222222222222';
    const bothId = '33333333-3333-3333-3333-333333333333';
    const stats = summarizeTelemetry(
      [
        {
          occurred_at: '2026-10-11T16:00:00.000Z',
          event_name: 'app_open',
          screen: 'home',
          install_id: guestId,
          audience: 'guest',
          city: 'Fremont',
          region: 'CA',
          link_kind: null,
          target_kind: null,
          target_id: null
        },
        {
          occurred_at: '2026-10-11T16:10:00.000Z',
          event_name: 'app_open',
          screen: 'home',
          install_id: candidateId,
          audience: 'candidate',
          city: 'Oakland',
          region: 'CA',
          link_kind: null,
          target_kind: null,
          target_id: null
        },
        {
          occurred_at: '2026-10-11T16:20:00.000Z',
          event_name: 'app_open',
          screen: 'home',
          install_id: bothId,
          audience: 'guest',
          city: 'San Jose',
          region: 'CA',
          link_kind: null,
          target_kind: null,
          target_id: null
        },
        {
          occurred_at: '2026-10-11T17:00:00.000Z',
          event_name: 'app_open',
          screen: 'home',
          install_id: bothId,
          audience: 'candidate',
          city: 'San Jose',
          region: 'CA',
          link_kind: null,
          target_kind: null,
          target_id: null
        }
      ],
      '2026-10-11',
      '2026-10-11',
      new Map()
    );
    assert.equal(stats.uniqueLaunches, 3);
    assert.equal(stats.uniqueGuests, 2);
    assert.equal(stats.uniqueCandidates, 2);
    assert.equal(stats.series[0].guest, 2);
    assert.equal(stats.series[0].candidate, 2);
  });

  it('counts USAMPAC donate and ignores rows outside the range', () => {
    const rows = [
      {
        occurred_at: '2026-10-11T16:00:00.000Z',
        event_name: 'donate_opened',
        screen: 'home',
        install_id: '11111111-1111-1111-1111-111111111111',
        audience: 'guest',
        city: 'Fremont',
        region: 'CA',
        link_kind: 'usampac_donate',
        target_kind: null,
        target_id: null
      },
      {
        occurred_at: '2026-10-01T16:00:00.000Z',
        event_name: 'app_open',
        screen: 'home',
        install_id: '33333333-3333-3333-3333-333333333333',
        audience: 'guest',
        city: 'San Jose',
        region: 'CA',
        link_kind: null,
        target_kind: null,
        target_id: null
      }
    ];
    const stats = summarizeTelemetry(rows, '2026-10-11', '2026-10-11', new Map());
    assert.equal(stats.donateTaps, 1);
    assert.equal(stats.uniqueLaunches, 0);
    assert.equal(stats.links[0].label, 'USAMPAC Donate');
    assert.equal(stats.cities.some((c) => c.label.startsWith('San Jose')), false);
  });

  it('uses a short id when the listing name is unknown', () => {
    const id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
    const stats = summarizeTelemetry(
      [
        {
          occurred_at: '2026-10-11T16:00:00.000Z',
          event_name: 'link_opened',
          screen: 'profile',
          install_id: '11111111-1111-1111-1111-111111111111',
          audience: 'guest',
          city: 'Fremont',
          region: 'CA',
          link_kind: 'website',
          target_kind: 'elected',
          target_id: id
        }
      ],
      '2026-10-11',
      '2026-10-11',
      new Map()
    );
    assert.equal(stats.listingRows[0].name, id.slice(0, 8));
    assert.equal(stats.listingRows[0].website, 1);
  });
});

describe('parseAnalyticsRange caps', () => {
  it('clamps a custom range longer than 90 days', () => {
    const range = parseAnalyticsRange({ from: '2026-01-01', to: '2026-06-01' });
    assert.equal(eachYmd(range.from, range.to).length, MAX_RANGE_DAYS);
  });

  it('uses 30-day preset', () => {
    const range = parseAnalyticsRange({ preset: '30' });
    assert.equal(eachYmd(range.from, range.to).length, 30);
  });
});

