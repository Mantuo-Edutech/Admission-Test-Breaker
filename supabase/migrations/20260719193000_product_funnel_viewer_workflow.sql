-- Privacy-safe Mantou conversion analytics. This capability can read only
-- aggregate journey counts; it grants no access to raw events or learner data.

create table private.product_funnel_viewer_grants (
  auth_user_id uuid primary key references public.app_users (auth_user_id) on delete cascade,
  display_name text not null,
  status text not null default 'active',
  granted_at timestamptz not null default now(),
  revoked_at timestamptz,
  constraint product_funnel_viewer_name
    check (length(trim(display_name)) between 2 and 80),
  constraint product_funnel_viewer_status
    check (status in ('active', 'revoked')),
  constraint product_funnel_viewer_revoke_consistency check (
    (status = 'active' and revoked_at is null)
    or (status = 'revoked' and revoked_at is not null)
  )
);

create table private.product_funnel_viewer_events (
  id uuid primary key default extensions.gen_random_uuid(),
  subject_user_id uuid not null references public.app_users (auth_user_id) on delete cascade,
  event_type text not null,
  occurred_at timestamptz not null default now(),
  details jsonb not null default '{}'::jsonb,
  constraint product_funnel_viewer_event_type
    check (event_type in ('viewer_granted', 'viewer_revoked')),
  constraint product_funnel_viewer_event_details
    check (jsonb_typeof(details) = 'object')
);

create index product_funnel_viewer_events_subject_idx
  on private.product_funnel_viewer_events (subject_user_id, occurred_at desc);

alter table private.product_funnel_viewer_grants enable row level security;
alter table private.product_funnel_viewer_events enable row level security;

revoke all on table private.product_funnel_viewer_grants
  from public, anon, authenticated, service_role;
revoke all on table private.product_funnel_viewer_events
  from public, anon, authenticated, service_role;

create or replace function private.is_active_product_funnel_viewer(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from private.product_funnel_viewer_grants as viewer_grant
    where viewer_grant.auth_user_id = p_user_id
      and viewer_grant.status = 'active'
      and viewer_grant.revoked_at is null
  );
$$;

create or replace function private.require_active_product_funnel_viewer()
returns uuid
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
begin
  if current_user_id is null
    or not private.is_active_product_funnel_viewer(current_user_id)
  then
    raise exception 'product_funnel_viewer_required' using errcode = '42501';
  end if;
  return current_user_id;
end;
$$;

revoke all on function private.is_active_product_funnel_viewer(uuid)
  from public, anon, authenticated, service_role;
revoke all on function private.require_active_product_funnel_viewer()
  from public, anon, authenticated, service_role;

create or replace function public.configure_product_funnel_viewer(
  p_viewer_user_id uuid,
  p_display_name text,
  p_active boolean,
  p_reason text
)
returns table (
  viewer_user_id uuid,
  display_name text,
  status text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  normalized_name text := trim(p_display_name);
  normalized_reason text := trim(p_reason);
begin
  if not exists (
    select 1 from public.app_users as app_user
    where app_user.auth_user_id = p_viewer_user_id
  ) then
    raise exception 'product_funnel_viewer_user_missing' using errcode = '22023';
  end if;
  if length(normalized_name) not between 2 and 80 then
    raise exception 'product_funnel_viewer_name_invalid' using errcode = '22023';
  end if;
  if length(normalized_reason) not between 3 and 240 then
    raise exception 'product_funnel_viewer_reason_invalid' using errcode = '22023';
  end if;

  if p_active then
    insert into private.product_funnel_viewer_grants (
      auth_user_id,
      display_name,
      status,
      granted_at,
      revoked_at
    ) values (
      p_viewer_user_id,
      normalized_name,
      'active',
      now(),
      null
    )
    on conflict (auth_user_id) do update
      set display_name = excluded.display_name,
          status = 'active',
          granted_at = now(),
          revoked_at = null;

    insert into private.product_funnel_viewer_events (
      subject_user_id,
      event_type,
      details
    ) values (
      p_viewer_user_id,
      'viewer_granted',
      jsonb_build_object('displayName', normalized_name, 'reason', normalized_reason)
    );
  else
    update private.product_funnel_viewer_grants as viewer_grant
    set status = 'revoked',
        revoked_at = now()
    where viewer_grant.auth_user_id = p_viewer_user_id
      and viewer_grant.status = 'active';
    if not found then
      raise exception 'product_funnel_viewer_not_active' using errcode = '22023';
    end if;

    insert into private.product_funnel_viewer_events (
      subject_user_id,
      event_type,
      details
    ) values (
      p_viewer_user_id,
      'viewer_revoked',
      jsonb_build_object('displayName', normalized_name, 'reason', normalized_reason)
    );
  end if;

  return query
    select
      viewer_grant.auth_user_id,
      viewer_grant.display_name,
      viewer_grant.status
    from private.product_funnel_viewer_grants as viewer_grant
    where viewer_grant.auth_user_id = p_viewer_user_id;
end;
$$;

revoke all on function public.configure_product_funnel_viewer(uuid, text, boolean, text)
  from public, anon, authenticated;
grant execute on function public.configure_product_funnel_viewer(uuid, text, boolean, text)
  to service_role;

create or replace function public.get_my_product_funnel_viewer_context()
returns table (
  active boolean,
  display_name text,
  permissions text[]
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    viewer_grant.auth_user_id is not null,
    viewer_grant.display_name,
    case
      when viewer_grant.auth_user_id is null then array[]::text[]
      else array['view_aggregate_product_funnel']::text[]
    end
  from (select (select auth.uid()) as current_user_id) as current_actor
  left join private.product_funnel_viewer_grants as viewer_grant
    on viewer_grant.auth_user_id = current_actor.current_user_id
   and viewer_grant.status = 'active'
   and viewer_grant.revoked_at is null;
$$;

create or replace function public.list_product_funnel_stage_summary(
  p_since timestamptz default now() - interval '30 days'
)
returns table (
  scope_exam_id text,
  event_type text,
  event_count bigint,
  unique_journeys bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform private.require_active_product_funnel_viewer();
  if p_since is null
    or p_since > now()
    or p_since < now() - interval '91 days'
  then
    raise exception 'product_funnel_summary_window_invalid' using errcode = '22023';
  end if;

  return query
    select
      coalesce(event.exam_id, 'all') as scope_exam_id,
      event.event_type,
      count(*)::bigint as event_count,
      count(distinct event.journey_id)::bigint as unique_journeys
    from private.product_funnel_events as event
    where event.received_at >= greatest(p_since, now() - interval '90 days')
    group by grouping sets (
      (event.exam_id, event.event_type),
      (event.event_type)
    )
    order by scope_exam_id, event.event_type;
end;
$$;

revoke all on function public.get_my_product_funnel_viewer_context()
  from public, anon;
revoke all on function public.list_product_funnel_stage_summary(timestamptz)
  from public, anon;
grant execute on function public.get_my_product_funnel_viewer_context()
  to authenticated;
grant execute on function public.list_product_funnel_stage_summary(timestamptz)
  to authenticated;
