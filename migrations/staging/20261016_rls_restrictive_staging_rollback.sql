-- STAGING ONLY emergency rollback. Restores legacy browser access broadly.
-- Prefer restoring grants/policies from a schema-only backup when available.
begin;

do $$
declare table_name text;
begin
  foreach table_name in array array[
    'users', 'crop_activities', 'messages', 'conversation_state',
    'whatsapp_inbound_events'
  ] loop
    if to_regclass('public.' || table_name) is not null then
      execute format('alter table public.%I disable row level security', table_name);
      execute format('grant select, insert, update, delete on table public.%I to anon, authenticated', table_name);
    end if;
  end loop;
end $$;

commit;

