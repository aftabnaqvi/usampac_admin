import { eachYmd, occurredPacificYmd } from './analyticsRange';

export type TelemetryRow = {
  occurred_at: string;
  event_name: string | null;
  screen: string | null;
  install_id: string | null;
  audience: string | null;
  city: string | null;
  region: string | null;
  link_kind: string | null;
  target_kind: string | null;
  target_id: string | null;
};

export type NamedCount = { label: string; value: number };
export type DayPoint = { day: string; value: number; guest: number; candidate: number; donate: number };

const LINK_LABELS: Record<string, string> = {
  usampac_donate: 'USAMPAC Donate',
  donate: 'Donate',
  website: 'Website',
  twitter: 'Twitter/X',
  facebook: 'Facebook',
  linkedin: 'LinkedIn',
  youtube: 'YouTube',
  instagram: 'Instagram',
  call: 'Call',
  text: 'Text',
  email: 'Email',
  copy_phone: 'Copy phone',
  copy_email: 'Copy email',
  notification: 'Notification link'
};

const SCREEN_LABELS: Record<string, string> = {
  home: 'Home',
  candidates: 'Candidates',
  elected: 'Elected',
  poll: 'Poll',
  quiz: 'Quiz',
  notifications: 'Notifications',
  settings: 'Settings',
  registration: 'Registration',
  login: 'Log in',
  profile: 'Profile'
};

function cityLabel(city?: string | null, region?: string | null): string {
  const c = (city ?? '').trim();
  const r = (region ?? '').trim();
  if (!c && !r) return 'Unknown';
  return r ? `${c || 'Unknown'}, ${r}` : c;
}

function isDonateKind(kind: string | null): boolean {
  return kind === 'donate' || kind === 'usampac_donate';
}

function ranked(map: Map<string, number>, limit = 12): NamedCount[] {
  return [...map.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, limit);
}

export function summarizeTelemetry(
  rows: TelemetryRow[],
  from: string,
  to: string,
  names: Map<string, string>
) {
  const days = eachYmd(from, to);
  const uniqueByDay = new Map<string, Set<string>>();
  const guestByDay = new Map<string, Set<string>>();
  const candidateByDay = new Map<string, Set<string>>();
  const donateByDay = new Map<string, number>();
  const screens = new Map<string, number>();
  const links = new Map<string, number>();
  const cities = new Map<string, number>();
  const listing = new Map<string, Record<string, number>>();
  const cityClicks = new Map<string, Record<string, number>>();
  const listingCityDonate = new Map<string, number>();
  const uniqueLaunches = new Set<string>();
  const uniqueGuests = new Set<string>();
  const uniqueCandidates = new Set<string>();
  let donateTaps = 0;

  for (const day of days) {
    uniqueByDay.set(day, new Set());
    guestByDay.set(day, new Set());
    candidateByDay.set(day, new Set());
    donateByDay.set(day, 0);
  }

  for (const row of rows) {
    const day = occurredPacificYmd(row.occurred_at);
    if (day < from || day > to) continue;
    const screen = (row.screen || '').trim() || 'unknown';
    screens.set(screen, (screens.get(screen) ?? 0) + 1);

    if (row.event_name === 'app_open' && row.install_id) {
      uniqueLaunches.add(row.install_id);
      uniqueByDay.get(day)?.add(row.install_id);
      const audience = row.audience === 'candidate' ? 'candidate' : 'guest';
      if (audience === 'candidate') {
        uniqueCandidates.add(row.install_id);
        candidateByDay.get(day)?.add(row.install_id);
      } else {
        uniqueGuests.add(row.install_id);
        guestByDay.get(day)?.add(row.install_id);
      }
    }

    const city = cityLabel(row.city, row.region);
    if (row.city) cities.set(city, (cities.get(city) ?? 0) + 1);

    const kind = row.link_kind;
    if (kind) {
      const label = LINK_LABELS[kind] ?? kind;
      links.set(label, (links.get(label) ?? 0) + 1);
      if (isDonateKind(kind)) {
        donateTaps += 1;
        donateByDay.set(day, (donateByDay.get(day) ?? 0) + 1);
      }
      if (row.target_id) {
        const person = names.get(row.target_id) ?? row.target_id.slice(0, 8);
        const rec = listing.get(person) ?? {};
        rec[label] = (rec[label] ?? 0) + 1;
        listing.set(person, rec);
        if (isDonateKind(kind) && row.city) {
          const key = `${person} · ${city}`;
          listingCityDonate.set(key, (listingCityDonate.get(key) ?? 0) + 1);
        }
      }
      const rec = cityClicks.get(city) ?? {};
      rec[label] = (rec[label] ?? 0) + 1;
      cityClicks.set(city, rec);
    }
  }

  const series: DayPoint[] = days.map((day) => ({
    day,
    value: uniqueByDay.get(day)?.size ?? 0,
    guest: guestByDay.get(day)?.size ?? 0,
    candidate: candidateByDay.get(day)?.size ?? 0,
    donate: donateByDay.get(day) ?? 0
  }));

  const listingRows = [...listing.entries()]
    .map(([name, counts]) => ({
      name,
      donate: counts['Donate'] ?? 0,
      website: counts['Website'] ?? 0,
      call: counts['Call'] ?? 0,
      text: counts['Text'] ?? 0,
      email: counts['Email'] ?? 0,
      social:
        (counts['Twitter/X'] ?? 0) +
        (counts['Facebook'] ?? 0) +
        (counts['LinkedIn'] ?? 0) +
        (counts['YouTube'] ?? 0) +
        (counts['Instagram'] ?? 0),
      total: Object.values(counts).reduce((s, n) => s + n, 0)
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 40);

  const cityClickRows = [...cityClicks.entries()]
    .map(([city, counts]) => ({
      city,
      donate: (counts['Donate'] ?? 0) + (counts['USAMPAC Donate'] ?? 0),
      call: counts['Call'] ?? 0,
      text: counts['Text'] ?? 0,
      email: counts['Email'] ?? 0,
      other: Object.entries(counts)
        .filter(([k]) => !['Donate', 'USAMPAC Donate', 'Call', 'Text', 'Email'].includes(k))
        .reduce((s, [, n]) => s + n, 0)
    }))
    .sort((a, b) => b.donate + b.call + b.text + b.email + b.other - (a.donate + a.call + a.text + a.email + a.other))
    .slice(0, 40);

  const topCity = ranked(cities, 1)[0]?.label ?? '—';

  return {
    uniqueLaunches: uniqueLaunches.size,
    uniqueGuests: uniqueGuests.size,
    uniqueCandidates: uniqueCandidates.size,
    donateTaps,
    topCity,
    series,
    pages: ranked(new Map([...screens].map(([k, v]) => [SCREEN_LABELS[k] ?? k, v]))),
    links: ranked(links),
    cities: ranked(cities),
    listingRows,
    cityClickRows,
    listingCityDonate: ranked(listingCityDonate, 40)
  };
}
