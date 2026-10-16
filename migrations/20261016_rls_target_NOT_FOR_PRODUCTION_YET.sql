-- TARGET ONLY: do not apply until the legacy frontend stops reading Supabase directly.
-- The current browser client uses custom IDs rather than Supabase Auth, so enabling
-- auth.uid() policies now would interrupt the existing panel. This file documents
-- the required end state for a controlled auth migration.

-- alter table public.crop_activities enable row level security;
-- drop policy if exists "legacy_all_crop_activities" on public.crop_activities;
-- create policy "users_read_own_activities" on public.crop_activities
--   for select to authenticated using (user_id = auth.uid());
-- create policy "users_update_own_activities" on public.crop_activities
--   for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

