import AdminHeader from '@/app/components/AdminHeader';
import { supabaseAdminApi } from '@/lib/supabaseAdmin';
import { requireAdmin } from '@/lib/requireAdmin';
import {
  parseAnalyticsRange,
  pacificDayStartIso,
  addDaysYmd,
  pacificYmd
} from '@/lib/analyticsRange';
import { summarizeTelemetry, type TelemetryRow } from '@/lib/analyticsStats';
import { BarChart, LineChart, StackedLaunchChart } from './Charts';

async function fetchEvents(fromIso: string, toIso: string): Promise<{ rows: TelemetryRow[]; error: string | null }> {
  const api = supabaseAdminApi();
  const pageSize = 1000;
  const rows: TelemetryRow[] = [];
  let from = 0;
  while (from < 20000) {
    const { data, error } = await api
      .from('app_telemetry')
      .select('occurred_at,event_name,screen,install_id,audience,city,region,link_kind,target_kind,target_id')
      .gte('occurred_at', fromIso)
      .lt('occurred_at', toIso)
      .order('occurred_at', { ascending: true })
      .range(from, from + pageSize - 1);
    if (error) return { rows, error: error.message };
    const batch = (data ?? []) as TelemetryRow[];
    rows.push(...batch);
    if (batch.length < pageSize) break;
    from += pageSize;
  }
  return { rows, error: null };
}

async function listingNames(): Promise<Map<string, string>> {
  const names = new Map<string, string>();
  try {
    const api = supabaseAdminApi();
    const [{ data: candidates }, { data: elected }] = await Promise.all([
      api.from('candidate_profiles_admin').select('user_id,display_name').limit(5000),
      api.from('active_elected_public').select('id,candidate_name').limit(5000)
    ]);
    for (const row of candidates ?? []) {
      if (row.user_id && row.display_name) names.set(String(row.user_id), String(row.display_name));
    }
    for (const row of elected ?? []) {
      if (row.id && row.candidate_name) names.set(String(row.id), String(row.candidate_name));
    }
  } catch {
    // names stay empty; tables show truncated ids
  }
  return names;
}

export default async function AnalyticsPage({
  searchParams
}: {
  searchParams?: { from?: string; to?: string; preset?: string };
}) {
  await requireAdmin('/analytics');
  const { from, to } = parseAnalyticsRange(searchParams);
  const fromIso = pacificDayStartIso(from);
  const toExclusiveIso = pacificDayStartIso(addDaysYmd(to, 1));
  const today = pacificYmd();

  let fetchError: string | null = null;
  let stats = summarizeTelemetry([], from, to, new Map());
  try {
    const [{ rows, error }, names] = await Promise.all([fetchEvents(fromIso, toExclusiveIso), listingNames()]);
    fetchError = error;
    stats = summarizeTelemetry(rows, from, to, names);
  } catch (e: any) {
    fetchError = e?.message ?? 'Unable to load analytics.';
  }

  const rangeQuery = `from=${from}&to=${to}`;

  return (
    <>
      <AdminHeader />
      <main className="container">
        <header className="pageHeader">
          <div>
            <h2>Analytics</h2>
            <p className="muted" style={{ margin: '6px 0 0' }}>
              Anonymous app usage. No visitor names, emails, or exact location. Days are US Pacific.
            </p>
          </div>
        </header>

        <section className="card">
          <form className="row analyticsRange" action="/analytics" method="get">
            <label>
              From
              <input type="date" name="from" defaultValue={from} />
            </label>
            <label>
              To
              <input type="date" name="to" defaultValue={to} />
            </label>
            <button type="submit" className="btnPrimary btnFit">
              Apply
            </button>
            <a className="btnFit" href="/analytics?preset=today">
              Today
            </a>
            <a className="btnFit" href="/analytics?preset=7">
              Last 7 days
            </a>
            <a className="btnFit" href="/analytics?preset=30">
              Last 30 days
            </a>
          </form>
        </section>

        {fetchError && (
          <p className="flashErr">
            {fetchError.includes('does not exist') || fetchError.includes('column')
              ? 'Telemetry table is missing columns. Run usampac_admin/sql/app_telemetry.sql in the Supabase SQL editor.'
              : fetchError}
          </p>
        )}

        <section className="gridCards analyticsKpis">
          <div className="card">
            <h3 className="cardTitle">Unique launches</h3>
            <p className="kpi">{stats.uniqueLaunches}</p>
            <p className="muted">Distinct phones in this range</p>
          </div>
          <div className="card">
            <h3 className="cardTitle">Guest launches</h3>
            <p className="kpi">{stats.uniqueGuests}</p>
            <p className="muted">Opened as guest</p>
          </div>
          <div className="card">
            <h3 className="cardTitle">Candidate launches</h3>
            <p className="kpi kpiCandidate">{stats.uniqueCandidates}</p>
            <p className="muted">Opened as candidate</p>
          </div>
          <div className="card">
            <h3 className="cardTitle">Donate taps</h3>
            <p className="kpi">{stats.donateTaps}</p>
            <p className="muted">USAMPAC + candidate Donate</p>
          </div>
          <div className="card">
            <h3 className="cardTitle">Top city</h3>
            <p className="kpi kpiText">{stats.topCity}</p>
            <p className="muted">Most events with a city</p>
          </div>
          {from <= today && to >= today && (
            <div className="card">
              <h3 className="cardTitle">Today</h3>
              <p className="kpi">{stats.series.find((p) => p.day === today)?.value ?? 0}</p>
              <p className="muted">Unique launches today</p>
            </div>
          )}
        </section>

        <section className="chartGrid">
          <LineChart title="Unique launches by day" points={stats.series} />
          <StackedLaunchChart
            title="Guest vs candidate launches"
            points={stats.series}
            guestTotal={stats.uniqueGuests}
            candidateTotal={stats.uniqueCandidates}
          />
          <LineChart title="Donate taps by day" points={stats.series} color="#c41e3a" valueKey="donate" />
          <BarChart title="Pages opened" bars={stats.pages} />
          <BarChart title="Links tapped" bars={stats.links} color="#c41e3a" />
          <BarChart title="Activity by city" bars={stats.cities} />
        </section>

        <section className="card">
          <h3 className="cardTitle">Clicks by candidate / elected listing</h3>
          <div className="tableWrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Listing</th>
                  <th>Donate</th>
                  <th>Call</th>
                  <th>Text</th>
                  <th>Email</th>
                  <th>Website</th>
                  <th>Social</th>
                </tr>
              </thead>
              <tbody>
                {stats.listingRows.length === 0 && (
                  <tr>
                    <td colSpan={7} className="muted">
                      No profile link taps in this range.
                    </td>
                  </tr>
                )}
                {stats.listingRows.map((row) => (
                  <tr key={row.name}>
                    <td>{row.name}</td>
                    <td>{row.donate}</td>
                    <td>{row.call}</td>
                    <td>{row.text}</td>
                    <td>{row.email}</td>
                    <td>{row.website}</td>
                    <td>{row.social}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="card">
          <h3 className="cardTitle">Clicks by city</h3>
          <div className="tableWrap">
            <table className="table">
              <thead>
                <tr>
                  <th>City</th>
                  <th>Donate</th>
                  <th>Call</th>
                  <th>Text</th>
                  <th>Email</th>
                  <th>Other</th>
                </tr>
              </thead>
              <tbody>
                {stats.cityClickRows.length === 0 && (
                  <tr>
                    <td colSpan={6} className="muted">
                      No link taps with a city in this range.
                    </td>
                  </tr>
                )}
                {stats.cityClickRows.map((row) => (
                  <tr key={row.city}>
                    <td>{row.city}</td>
                    <td>{row.donate}</td>
                    <td>{row.call}</td>
                    <td>{row.text}</td>
                    <td>{row.email}</td>
                    <td>{row.other}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="card">
          <h3 className="cardTitle">Donate by listing and city</h3>
          <div className="tableWrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Listing · city</th>
                  <th>Donate taps</th>
                </tr>
              </thead>
              <tbody>
                {stats.listingCityDonate.length === 0 && (
                  <tr>
                    <td colSpan={2} className="muted">
                      No candidate Donate taps with a city yet.
                    </td>
                  </tr>
                )}
                {stats.listingCityDonate.map((row) => (
                  <tr key={row.label}>
                    <td>{row.label}</td>
                    <td>{row.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
        <p className="muted" style={{ fontSize: 12 }}>
          Range {from} to {to}. <a href={`/analytics?${rangeQuery}`}>Permalink</a>
        </p>
      </main>
    </>
  );
}
