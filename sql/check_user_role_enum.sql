-- Run this in Supabase SQL Editor to see allowed user_role values.
-- Use the non-ADMIN value(s) when fixing admin_set_user_role (e.g. for "remove admin").
SELECT enumlabel AS role_value
FROM pg_enum e
JOIN pg_type t ON e.enumtypid = t.oid
WHERE t.typname = 'user_role'
ORDER BY e.enumsortorder;
