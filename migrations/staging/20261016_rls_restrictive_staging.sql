-- STAGING ONLY. Do not execute in the production Supabase project.
-- AgroPython uses the service role only on the server; browsers must use FastAPI.
begin;

do $$
declare
  table_name text;
  policy record;
begin
  foreach table_name in array array[
    'users', 'crop_activities', 'messages', 'conversation_state',
    'whatsapp_inbound_events'
  ] loop
    if to_regclass('public.' || table_name) is not null then
      execute format('alter table public.%I enable row level security', table_name);
      execute format('revoke all on table public.%I from anon, authenticated', table_name);
      for policy in
        select policyname from pg_policies
        where schemaname = 'public' and tablename = table_name
      loop
        execute format('drop policy if exists %I on public.%I', policy.policyname, table_name);
      end loop;
    end if;
  end loop;
end $$;

commit;

