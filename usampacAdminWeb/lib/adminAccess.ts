/** Only the ADMIN role may use the admin site. Candidates, visitors, and elected are denied. */
export function isAdminRole(role: unknown): boolean {
  return String(role ?? '')
    .trim()
    .toUpperCase() === 'ADMIN';
}

/** Fail closed: missing row, query error, or any non-ADMIN role is not an admin. */
export function adminAccessFromRow(row: { role?: unknown } | null | undefined, error?: unknown): boolean {
  if (error) return false;
  if (!row) return false;
  return isAdminRole(row.role);
}

export const NOT_ADMIN_LOGIN_MESSAGE = 'This account is not an admin.';
