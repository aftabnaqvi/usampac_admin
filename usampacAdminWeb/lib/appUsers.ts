type DbClient = any;

const APP_USERS_VIEW = 'app_users_admin';
const APP_USERS_ID_COLUMNS = ['auth_sub', 'user_id', 'id'] as const;

export async function resolveAppUsersIdColumn(db: DbClient): Promise<string> {
  for (const col of APP_USERS_ID_COLUMNS) {
    const { error } = await db.from(APP_USERS_VIEW).select(col).limit(1);
    if (!error) return col;
  }
  return 'id';
}

export async function isAdminUser(db: DbClient, userId: string): Promise<boolean> {
  const idColumn = await resolveAppUsersIdColumn(db);
  const { data, error } = await db
    .from(APP_USERS_VIEW)
    .select('role')
    .eq(idColumn, userId)
    .limit(1)
    .maybeSingle();
  if (error || !data) return false;
  return data.role === 'ADMIN';
}

export async function listAdmins(db: DbClient) {
  const idColumn = await resolveAppUsersIdColumn(db);
  const { data, error } = await db
    .from(APP_USERS_VIEW)
    .select(`${idColumn},role,email`)
    .eq('role', 'ADMIN')
    .limit(5000);
  return { data: data ?? [], error, idColumn };
}

export async function upsertAdmin(db: DbClient, userId: string) {
  return db.rpc('admin_set_user_role', { p_user_id: userId, p_role: 'ADMIN' });
}

export async function removeAdmin(db: DbClient, userId: string) {
  return db.rpc('admin_set_user_role', { p_user_id: userId, p_role: 'USER' });
}
