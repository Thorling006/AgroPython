-- AgroPython runtime hardening. Safe to re-run.
-- Review and apply to a staging Supabase project before production.

create extension if not exists pgcrypto;

alter table if exists public.whatsapp_inbound_events
  add column if not exists status text not null default 'processing',
  add column if not exists attempt_count integer not null default 0,
  add column if not exists last_error text,
  add column if not exists processed_at timestamptz,
  add column if not exists updated_at timestamptz not null default now();

create unique index if not exists whatsapp_inbound_events_message_id_uidx
  on public.whatsapp_inbound_events (message_id);

alter table if exists public.crop_activities
  add column if not exists crop_name text,
  add column if not exists scheduled_at timestamptz,
  add column if not exists completed_at timestamptz,
  add column if not exists whatsapp_message_id text,
  add column if not exists whatsapp_claim_token uuid,
  add column if not exists whatsapp_claimed_at timestamptz,
  add column if not exists whatsapp_attempt_count integer not null default 0,
  add column if not exists whatsapp_last_error text,
  add column if not exists whatsapp_next_attempt_at timestamptz;

update public.crop_activities
set scheduled_at = scheduled_date::timestamp at time zone 'America/El_Salvador'
where scheduled_at is null and scheduled_date is not null;

create unique index if not exists conversation_state_phone_uidx
  on public.conversation_state (phone);

create or replace function public.claim_whatsapp_inbound(p_message_id text, p_phone text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  claimed boolean := false;
begin
  insert into public.whatsapp_inbound_events(message_id, phone, status, attempt_count, updated_at)
  values (p_message_id, p_phone, 'processing', 1, now())
  on conflict (message_id) do update
    set status = 'processing',
        attempt_count = whatsapp_inbound_events.attempt_count + 1,
        updated_at = now(),
        last_error = null
    where whatsapp_inbound_events.status = 'failed'
       or (whatsapp_inbound_events.status = 'processing' and whatsapp_inbound_events.updated_at < now() - interval '5 minutes')
  returning true into claimed;
  return coalesce(claimed, false);
end;
$$;

create or replace function public.claim_due_crop_activities(p_batch_size integer default 50)
returns setof public.crop_activities
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  with due as (
    select ca.id
    from public.crop_activities ca
    where ca.status in ('pendiente', 'reprogramado', 'pending', 'rescheduled')
      and coalesce(ca.whatsapp_reminder_sent, false) = false
      and coalesce(ca.scheduled_at, ca.scheduled_date::timestamp at time zone 'America/El_Salvador') <= now()
      and (ca.whatsapp_next_attempt_at is null or ca.whatsapp_next_attempt_at <= now())
      and (ca.whatsapp_claimed_at is null or ca.whatsapp_claimed_at < now() - interval '5 minutes')
    order by coalesce(ca.scheduled_at, ca.scheduled_date::timestamp at time zone 'America/El_Salvador')
    for update skip locked
    limit greatest(1, least(p_batch_size, 100))
  )
  update public.crop_activities ca
  set whatsapp_claim_token = gen_random_uuid(),
      whatsapp_claimed_at = now(),
      whatsapp_attempt_count = coalesce(ca.whatsapp_attempt_count, 0) + 1
  from due
  where ca.id = due.id
  returning ca.*;
end;
$$;

revoke all on function public.claim_whatsapp_inbound(text, text) from public, anon, authenticated;
revoke all on function public.claim_due_crop_activities(integer) from public, anon, authenticated;
grant execute on function public.claim_whatsapp_inbound(text, text) to service_role;
grant execute on function public.claim_due_crop_activities(integer) to service_role;

