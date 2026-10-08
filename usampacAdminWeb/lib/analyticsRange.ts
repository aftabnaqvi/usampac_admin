const TZ = 'America/Los_Angeles';
export const MAX_RANGE_DAYS = 90;

export function pacificYmd(date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(date);
}

export function addDaysYmd(ymd: string, days: number): string {
  const [y, m, d] = ymd.split('-').map(Number);
  const utc = new Date(Date.UTC(y, m - 1, d + days));
  const mm = String(utc.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(utc.getUTCDate()).padStart(2, '0');
  return `${utc.getUTCFullYear()}-${mm}-${dd}`;
}

function tzOffsetMs(instant: Date): number {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone: TZ,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
  const parts = Object.fromEntries(dtf.formatToParts(instant).map((p) => [p.type, p.value]));
  const asUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second)
  );
  return asUtc - instant.getTime();
}

export function pacificDayStartIso(ymd: string): string {
  const [y, m, d] = ymd.split('-').map(Number);
  const guess = new Date(Date.UTC(y, m - 1, d, 8, 0, 0));
  const offset = tzOffsetMs(guess);
  return new Date(Date.UTC(y, m - 1, d, 0, 0, 0) - offset).toISOString();
}

export function eachYmd(from: string, to: string): string[] {
  const days: string[] = [];
  let cur = from;
  while (cur <= to) {
    days.push(cur);
    cur = addDaysYmd(cur, 1);
    if (days.length > MAX_RANGE_DAYS + 1) break;
  }
  return days;
}

export function parseAnalyticsRange(searchParams?: {
  from?: string;
  to?: string;
  preset?: string;
}): { from: string; to: string } {
  const today = pacificYmd();
  const ymd = (raw?: string) => (raw && /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : null);

  let from: string;
  let to: string;
  if (searchParams?.preset === 'today') {
    from = today;
    to = today;
  } else if (searchParams?.preset === '30') {
    from = addDaysYmd(today, -29);
    to = today;
  } else if (searchParams?.preset === '7' || (!searchParams?.from && !searchParams?.to)) {
    from = addDaysYmd(today, -6);
    to = today;
  } else {
    from = ymd(searchParams?.from) ?? addDaysYmd(today, -6);
    to = ymd(searchParams?.to) ?? today;
  }

  if (to > today) to = today;
  if (from > to) [from, to] = [to, from];
  if (eachYmd(from, to).length > MAX_RANGE_DAYS) {
    from = addDaysYmd(to, -(MAX_RANGE_DAYS - 1));
  }
  return { from, to };
}

export function occurredPacificYmd(iso: string): string {
  return pacificYmd(new Date(iso));
}
