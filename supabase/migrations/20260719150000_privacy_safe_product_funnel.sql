create table private.product_funnel_events (
  event_id text primary key,
  journey_id text not null,
  event_type text not null,
  exam_id text not null,
  context_code text not null,
  occurred_at timestamptz not null,
  received_at timestamptz not null default now(),
  constraint product_funnel_event_id_format check (event_id ~ '^fun_[A-Za-z0-9_-]+$'),
  constraint product_funnel_journey_id_format check (journey_id ~ '^journey_[A-Za-z0-9_-]+$'),
  constraint product_funnel_event_type check (event_type in (
    'exam_selected',
    'profile_completed',
    'practice_started',
    'practice_completed',
    'bingbing_opened',
    'invite_redeemed'
  )),
  constraint product_funnel_exam_id check (exam_id in ('tmua', 'esat', 'tara', 'lnat', 'ucat')),
  constraint product_funnel_context_code check (context_code ~ '^[a-z0-9][a-z0-9-]{0,39}$')
);

alter table private.product_funnel_events enable row level security;

create index product_funnel_events_received_idx
  on private.product_funnel_events (received_at desc);
create index product_funnel_events_journey_rate_idx
  on private.product_funnel_events (journey_id, received_at desc);

revoke all on private.product_funnel_events from public, anon, authenticated, service_role;

create or replace function public.record_product_funnel_event(
  p_event_id text,
  p_journey_id text,
  p_event_type text,
  p_exam_id text,
  p_context_code text,
  p_occurred_at timestamptz
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_event_id !~ '^fun_[A-Za-z0-9_-]+$'
    or p_journey_id !~ '^journey_[A-Za-z0-9_-]+$'
    or p_event_type not in (
      'exam_selected', 'profile_completed', 'practice_started',
      'practice_completed', 'bingbing_opened', 'invite_redeemed'
    )
    or p_exam_id not in ('tmua', 'esat', 'tara', 'lnat', 'ucat')
    or p_context_code !~ '^[a-z0-9][a-z0-9-]{0,39}$'
    or p_occurred_at < now() - interval '24 hours'
    or p_occurred_at > now() + interval '5 minutes'
  then
    raise exception 'product_funnel_event_invalid' using errcode = '22023';
  end if;

  if (
    select count(*)
    from private.product_funnel_events as event
    where event.journey_id = p_journey_id
      and event.received_at > now() - interval '15 minutes'
  ) >= 30 then
    raise exception 'product_funnel_rate_limited' using errcode = '54000';
  end if;

  insert into private.product_funnel_events (
    event_id,
    journey_id,
    event_type,
    exam_id,
    context_code,
    occurred_at
  ) values (
    p_event_id,
    p_journey_id,
    p_event_type,
    p_exam_id,
    p_context_code,
    p_occurred_at
  ) on conflict (event_id) do nothing;
end;
$$;

create or replace function public.product_funnel_summary(
  p_since timestamptz default now() - interval '30 days'
)
returns table (
  event_type text,
  exam_id text,
  context_code text,
  event_count bigint,
  unique_journeys bigint
)
language sql
security definer
set search_path = ''
stable
as $$
  select
    event.event_type,
    event.exam_id,
    event.context_code,
    count(*)::bigint,
    count(distinct event.journey_id)::bigint
  from private.product_funnel_events as event
  where event.received_at >= greatest(p_since, now() - interval '90 days')
  group by event.event_type, event.exam_id, event.context_code
  order by event.exam_id, event.event_type, event.context_code
$$;

create or replace function public.purge_expired_product_funnel_events(
  p_before timestamptz default now() - interval '90 days'
)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  deleted_count bigint;
begin
  if p_before > now() - interval '30 days' then
    raise exception 'product_funnel_retention_too_short' using errcode = '22023';
  end if;
  delete from private.product_funnel_events where received_at < p_before;
  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$;

revoke all on function public.record_product_funnel_event(text, text, text, text, text, timestamptz)
  from public;
grant execute on function public.record_product_funnel_event(text, text, text, text, text, timestamptz)
  to anon, authenticated;

revoke all on function public.product_funnel_summary(timestamptz)
  from public, anon, authenticated;
grant execute on function public.product_funnel_summary(timestamptz)
  to service_role;

revoke all on function public.purge_expired_product_funnel_events(timestamptz)
  from public, anon, authenticated;
grant execute on function public.purge_expired_product_funnel_events(timestamptz)
  to service_role;
