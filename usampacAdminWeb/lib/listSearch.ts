export function listSearchQuery(raw?: string | null) {
  return (raw ?? '').trim();
}

export function matchesListQuery(row: Record<string, any> | null | undefined, query: string) {
  if (!query) return true;
  if (!row) return false;
  const needle = query.toLowerCase();
  const haystack = [
    row.display_name,
    row.candidate_name,
    row.email,
    row.phone,
    row.office_name,
    row.office_level,
    row.office_type,
    row.level,
    row.city_name,
    row.state_code,
    row.jurisdiction_name,
    row.party,
    row.cycle,
    row.reviewer_notes
  ]
    .map((value) => String(value ?? '').toLowerCase())
    .join(' ');
  return haystack.includes(needle);
}
