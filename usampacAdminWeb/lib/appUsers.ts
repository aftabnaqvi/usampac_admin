import { adminAccessFromRow } from '@/lib/adminAccess';

type DbClient = any;

const APP_USERS_VIEW = 'app_users_admin';
const APP_USERS_ID_COLUMNS = ['auth_sub', 'user_id', 'id'] as const;

export function apiSchema(db: DbClient): DbClient {
  return typeof db?.schema === 'function' ? db.schema('api') : db;
}

export async function resolveAppUsersIdColumn(db: DbClient): Promise<string> {
  const client = apiSchema(db);
  for (const col of APP_USERS_ID_COLUMNS) {
    const { error } = await client.from(APP_USERS_VIEW).select(col).limit(1);
    if (!error) return col;
  }
  return 'id';
}

export async function isAdminUser(db: DbClient, userId: string): Promise<boolean> {
  if (!userId) return false;
  try {
    const client = apiSchema(db);
    const idColumn = await resolveAppUsersIdColumn(client);
    const { data, error } = await client
      .from(APP_USERS_VIEW)
      .select('role')
      .eq(idColumn, userId)
      .limit(1)
      .maybeSingle();
    return adminAccessFromRow(data, error);
  } catch {
    return false;
  }
}

export async function listAdmins(db: DbClient) {
  const client = apiSchema(db);
  const idColumn = await resolveAppUsersIdColumn(client);
  const { data, error } = await client
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
