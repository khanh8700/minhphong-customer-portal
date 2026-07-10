GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO service_role, anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL PRIVILEGES ON TABLES TO service_role, anon, authenticated;
GRANT USAGE ON SCHEMA public TO service_role, anon, authenticated;
