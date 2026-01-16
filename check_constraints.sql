-- Check constraints on analytics_tracking table
SELECT con.conname, pg_get_constraintdef(con.oid)
FROM pg_catalog.pg_constraint con
INNER JOIN pg_catalog.pg_class rel ON rel.oid = con.conrelid
INNER JOIN pg_catalog.pg_namespace nsp ON nsp.oid = connamespace
WHERE nsp.nspname = 'public'
AND rel.relname = 'analytics_tracking';

-- Also check if there is any other table "sparkle" vs "sparkles" just in case
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name LIKE 'spark%';
