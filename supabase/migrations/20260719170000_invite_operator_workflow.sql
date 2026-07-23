-- Least-privilege invite operations for the Bingbing workflow.
-- Operators remain ordinary authenticated users: they gain no learner-data access
-- and can only manage invite codes they created through audited RPCs.

create table private.invite_operator_grants (
  auth_user_id uuid primary key references public.app_users (auth_user_id) on delete cascade,
  display_name text not null,
  status text not null default 'active',
  granted_at timestamptz not null default now(),
  revoked_at timestamptz,
  constraint invite_operator_grants_display_name
    check (length(trim(display_name)) between 2 and 80),
  constraint invite_operator_grants_status
    check (status in ('active', 'revoked')),
  constraint invite_operator_grants_revoke_consistency check (
    (status = 'active' and revoked_at is null)
    or (status = 'revoked' and revoked_at is not null)
  )
);

create table private.invite_operator_events (
  id uuid primary key default extensions.gen_random_uuid(),
  actor_kind text not null,
  actor_user_id uuid,
  subject_operator_user_id uuid,
  invite_id uuid references private.invite_codes (id) on delete set null,
  event_type text not null,
  occurred_at timestamptz not null default now(),
  details jsonb not null default '{}'::jsonb,
  constraint invite_operator_events_actor_kind
    check (actor_kind in ('service_role', 'invite_operator')),
  constraint invite_operator_events_type check (
    event_type in ('operator_granted', 'operator_revoked', 'invite_issued', 'invite_revoked')
  ),
  constraint invite_operator_events_details_object
    check (jsonb_typeof(details) = 'object'),
  constraint invite_operator_events_actor_consistency check (
    (actor_kind = 'service_role' and actor_user_id is null)
    or (actor_kind = 'invite_operator' and actor_user_id is not null)
  )
);

create index invite_operator_events_actor_idx
  on private.invite_operator_events (actor_user_id, occurred_at desc);
create index invite_operator_events_subject_idx
  on private.invite_operator_events (subject_operator_user_id, occurred_at desc);
create index invite_codes_created_by_idx
  on private.invite_codes (created_by, created_at desc);

alter table private.invite_codes
  add column revoked_by uuid references public.app_users (auth_user_id),
  add column revoke_reason text;

alter table private.invite_operator_grants enable row level security;
alter table private.invite_operator_events enable row level security;

revoke all on table private.invite_operator_grants
  from public, anon, authenticated, service_role;
revoke all on table private.invite_operator_events
  from public, anon, authenticated, service_role;
revoke all on table private.invite_codes
  from public, anon, authenticated;

create or replace function private.is_active_invite_operator(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from private.invite_operator_grants as operator_grant
    where operator_grant.auth_user_id = p_user_id
      and operator_grant.status = 'active'
      and operator_grant.revoked_at is null
  );
$$;

create or replace function private.require_active_invite_operator()
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
    or not private.is_active_invite_operator(current_user_id)
  then
    raise exception 'invite_operator_required' using errcode = '42501';
  end if;
  return current_user_id;
end;
$$;

revoke all on function private.is_active_invite_operator(uuid)
  from public, anon, authenticated, service_role;
revoke all on function private.require_active_invite_operator()
  from public, anon, authenticated, service_role;

create or replace function public.configure_invite_operator(
  p_operator_user_id uuid,
  p_display_name text,
  p_active boolean,
  p_reason text
)
returns table (
  operator_user_id uuid,
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
    where app_user.auth_user_id = p_operator_user_id
  ) then
    raise exception 'invite_operator_user_missing' using errcode = '22023';
  end if;
  if length(normalized_name) not between 2 and 80 then
    raise exception 'invite_operator_name_invalid' using errcode = '22023';
  end if;
  if length(normalized_reason) not between 3 and 240 then
    raise exception 'invite_operator_reason_invalid' using errcode = '22023';
  end if;

  if p_active then
    insert into private.invite_operator_grants (
      auth_user_id,
      display_name,
      status,
      granted_at,
      revoked_at
    ) values (
      p_operator_user_id,
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

    insert into private.invite_operator_events (
      actor_kind,
      subject_operator_user_id,
      event_type,
      details
    ) values (
      'service_role',
      p_operator_user_id,
      'operator_granted',
      jsonb_build_object('displayName', normalized_name, 'reason', normalized_reason)
    );
  else
    update private.invite_operator_grants as operator_grant
    set status = 'revoked',
        revoked_at = now()
    where operator_grant.auth_user_id = p_operator_user_id
      and operator_grant.status = 'active';
    if not found then
      raise exception 'invite_operator_not_active' using errcode = '22023';
    end if;

    insert into private.invite_operator_events (
      actor_kind,
      subject_operator_user_id,
      event_type,
      details
    ) values (
      'service_role',
      p_operator_user_id,
      'operator_revoked',
      jsonb_build_object('displayName', normalized_name, 'reason', normalized_reason)
    );
  end if;

  return query
    select
      operator_grant.auth_user_id,
      operator_grant.display_name,
      operator_grant.status
    from private.invite_operator_grants as operator_grant
    where operator_grant.auth_user_id = p_operator_user_id;
end;
$$;

revoke all on function public.configure_invite_operator(uuid, text, boolean, text)
  from public, anon, authenticated;
grant execute on function public.configure_invite_operator(uuid, text, boolean, text)
  to service_role;

-- Replace the service-only issuer with the same publication gate plus an audit
-- event. When called by the operator wrapper, auth.uid() becomes created_by.
create or replace function public.issue_invite(
  p_label text,
  p_package_ids text[],
  p_max_redemptions integer default 1,
  p_expires_at timestamptz default null,
  p_entitlement_duration interval default null
)
returns table (invite_id uuid, code text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  generated_code text;
  created_invite_id uuid;
  request_user_id uuid := (select auth.uid());
  operator_actor_id uuid;
begin
  operator_actor_id := case
    when private.is_active_invite_operator(request_user_id) then request_user_id
    else null
  end;

  if length(trim(p_label)) = 0 then
    raise exception 'invite_label_required' using errcode = '22023';
  end if;
  if p_package_ids is null or cardinality(p_package_ids) = 0 then
    raise exception 'invite_package_required' using errcode = '22023';
  end if;
  if p_max_redemptions <= 0 then
    raise exception 'invite_redemptions_invalid' using errcode = '22023';
  end if;

  if exists (
    select 1
    from unnest(p_package_ids) as requested(package_id)
    left join public.access_packages as package on package.id = requested.package_id
    where package.id is null or package.status <> 'active'
  ) then
    raise exception 'invite_package_invalid' using errcode = '22023';
  end if;

  if exists (
    select 1
    from unnest(p_package_ids) as requested(package_id)
    where not exists (
      select 1
      from public.access_package_resources as package_resource
      join public.content_resources as resource
        on resource.id = package_resource.resource_id
      where package_resource.package_id = requested.package_id
        and resource.access_tier = 'entitled'
        and resource.publication_status = 'published'
        and resource.published_at is not null
    )
  ) then
    raise exception 'invite_package_unpublished' using errcode = '22023';
  end if;

  generated_code := upper(encode(extensions.gen_random_bytes(18), 'hex'));

  insert into private.invite_codes (
    code_digest,
    label,
    max_redemptions,
    expires_at,
    entitlement_duration,
    created_by
  ) values (
    private.invite_code_digest(generated_code),
    trim(p_label),
    p_max_redemptions,
    p_expires_at,
    p_entitlement_duration,
    operator_actor_id
  )
  returning id into created_invite_id;

  insert into private.invite_packages (invite_id, package_id)
  select created_invite_id, requested.package_id
  from unnest(p_package_ids) as requested(package_id);

  insert into private.invite_operator_events (
    actor_kind,
    actor_user_id,
    invite_id,
    event_type,
    details
  ) values (
    case when operator_actor_id is null then 'service_role' else 'invite_operator' end,
    operator_actor_id,
    created_invite_id,
    'invite_issued',
    jsonb_build_object(
      'reference', trim(p_label),
      'packageIds', to_jsonb(p_package_ids),
      'maxRedemptions', p_max_redemptions,
      'expiresAt', p_expires_at,
      'entitlementDuration', p_entitlement_duration
    )
  );

  return query select created_invite_id, generated_code;
end;
$$;

revoke all on function public.issue_invite(text, text[], integer, timestamptz, interval)
  from public, anon, authenticated;
grant execute on function public.issue_invite(text, text[], integer, timestamptz, interval)
  to service_role;

create or replace function public.get_my_invite_operator_context()
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
    operator_grant.auth_user_id is not null,
    operator_grant.display_name,
    case
      when operator_grant.auth_user_id is null then array[]::text[]
      else array['list_published_packages', 'issue_invite', 'list_own_invites', 'revoke_own_invite']::text[]
    end
  from (select (select auth.uid()) as current_user_id) as current_actor
  left join private.invite_operator_grants as operator_grant
    on operator_grant.auth_user_id = current_actor.current_user_id
   and operator_grant.status = 'active'
   and operator_grant.revoked_at is null;
$$;

create or replace function public.list_invite_operator_packages()
returns table (
  package_id text,
  name text,
  description text,
  published_resource_count bigint,
  published_resource_titles text[]
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform private.require_active_invite_operator();
  return query
    select
      package.id,
      package.name,
      package.description,
      count(resource.id),
      array_agg(resource.title order by resource.title)
    from public.access_packages as package
    join public.access_package_resources as package_resource
      on package_resource.package_id = package.id
    join public.content_resources as resource
      on resource.id = package_resource.resource_id
     and resource.access_tier = 'entitled'
     and resource.publication_status = 'published'
     and resource.published_at is not null
    where package.status = 'active'
    group by package.id, package.name, package.description
    order by package.id;
end;
$$;

create or replace function public.issue_operator_invite(
  p_reference text,
  p_package_ids text[],
  p_max_redemptions integer,
  p_expires_at timestamptz,
  p_entitlement_duration interval
)
returns table (
  invite_id uuid,
  code text,
  expires_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  operator_user_id uuid;
  normalized_reference text := trim(p_reference);
  issued record;
  numeric_reference text;
begin
  operator_user_id := private.require_active_invite_operator();
  numeric_reference := regexp_replace(normalized_reference, '[^0-9]', '', 'g');
  if length(normalized_reference) not between 2 and 80 then
    raise exception 'invite_reference_invalid' using errcode = '22023';
  end if;
  if normalized_reference ~* '(@|https?://)' or length(numeric_reference) >= 8 then
    raise exception 'invite_reference_personal_data' using errcode = '22023';
  end if;
  if p_max_redemptions not between 1 and 20 then
    raise exception 'invite_operator_redemptions_invalid' using errcode = '22023';
  end if;
  if p_expires_at is null
    or p_expires_at <= now() + interval '5 minutes'
    or p_expires_at > now() + interval '90 days'
  then
    raise exception 'invite_operator_expiry_invalid' using errcode = '22023';
  end if;
  if p_entitlement_duration is null
    or p_entitlement_duration < interval '1 day'
    or p_entitlement_duration > interval '365 days'
  then
    raise exception 'invite_operator_duration_invalid' using errcode = '22023';
  end if;

  select created.invite_id, created.code into issued
  from public.issue_invite(
    normalized_reference,
    p_package_ids,
    p_max_redemptions,
    p_expires_at,
    p_entitlement_duration
  ) as created;

  if issued.invite_id is null then
    raise exception 'invite_issue_failed' using errcode = 'P0001';
  end if;

  return query select issued.invite_id, issued.code, p_expires_at;
end;
$$;

create or replace function public.list_my_issued_invites()
returns table (
  invite_id uuid,
  reference text,
  status text,
  package_ids text[],
  max_redemptions integer,
  redemption_count bigint,
  created_at timestamptz,
  expires_at timestamptz,
  entitlement_duration interval,
  revoked_at timestamptz,
  revoke_reason text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  operator_user_id uuid;
begin
  operator_user_id := private.require_active_invite_operator();
  return query
    select
      invite.id,
      invite.label,
      invite.status,
      coalesce(array_agg(invite_package.package_id order by invite_package.package_id), array[]::text[]),
      invite.max_redemptions,
      (
        select count(*)
        from private.invite_redemptions as redemption
        where redemption.invite_id = invite.id
      ),
      invite.created_at,
      invite.expires_at,
      invite.entitlement_duration,
      invite.revoked_at,
      invite.revoke_reason
    from private.invite_codes as invite
    left join private.invite_packages as invite_package
      on invite_package.invite_id = invite.id
    where invite.created_by = operator_user_id
    group by invite.id
    order by invite.created_at desc;
end;
$$;

create or replace function public.revoke_my_issued_invite(
  p_invite_id uuid,
  p_reason text
)
returns table (
  invite_id uuid,
  status text,
  revoked_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  operator_user_id uuid;
  normalized_reason text := trim(p_reason);
  revoked_invite private.invite_codes%rowtype;
begin
  operator_user_id := private.require_active_invite_operator();
  if length(normalized_reason) not between 3 and 240 then
    raise exception 'invite_revoke_reason_invalid' using errcode = '22023';
  end if;
  if normalized_reason ~* '(@|https?://)' then
    raise exception 'invite_revoke_reason_personal_data' using errcode = '22023';
  end if;

  update private.invite_codes as invite
  set status = 'revoked',
      revoked_at = now(),
      revoked_by = operator_user_id,
      revoke_reason = normalized_reason
  where invite.id = p_invite_id
    and invite.created_by = operator_user_id
    and invite.status = 'active'
  returning invite.* into revoked_invite;

  if revoked_invite.id is null then
    raise exception 'invite_not_found' using errcode = '22023';
  end if;

  insert into private.invite_operator_events (
    actor_kind,
    actor_user_id,
    invite_id,
    event_type,
    details
  ) values (
    'invite_operator',
    operator_user_id,
    revoked_invite.id,
    'invite_revoked',
    jsonb_build_object('reason', normalized_reason)
  );

  return query select revoked_invite.id, revoked_invite.status, revoked_invite.revoked_at;
end;
$$;

create or replace function public.list_my_invite_operator_activity(p_limit integer default 50)
returns table (
  event_type text,
  invite_id uuid,
  occurred_at timestamptz,
  details jsonb
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  operator_user_id uuid;
begin
  operator_user_id := private.require_active_invite_operator();
  if p_limit not between 1 and 100 then
    raise exception 'invite_activity_limit_invalid' using errcode = '22023';
  end if;
  return query
    select
      event.event_type,
      event.invite_id,
      event.occurred_at,
      event.details
    from private.invite_operator_events as event
    where event.actor_user_id = operator_user_id
       or event.subject_operator_user_id = operator_user_id
    order by event.occurred_at desc
    limit p_limit;
end;
$$;

create or replace function public.list_invite_operator_audit(
  p_since timestamptz default (now() - interval '30 days'),
  p_limit integer default 100
)
returns table (
  event_id uuid,
  actor_kind text,
  actor_user_id uuid,
  subject_operator_user_id uuid,
  invite_id uuid,
  event_type text,
  occurred_at timestamptz,
  details jsonb
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if p_limit not between 1 and 500 then
    raise exception 'invite_audit_limit_invalid' using errcode = '22023';
  end if;
  if p_since is null or p_since > now() or p_since < now() - interval '365 days' then
    raise exception 'invite_audit_window_invalid' using errcode = '22023';
  end if;
  return query
    select
      event.id,
      event.actor_kind,
      event.actor_user_id,
      event.subject_operator_user_id,
      event.invite_id,
      event.event_type,
      event.occurred_at,
      event.details
    from private.invite_operator_events as event
    where event.occurred_at >= p_since
    order by event.occurred_at desc
    limit p_limit;
end;
$$;

revoke all on function public.get_my_invite_operator_context()
  from public, anon;
revoke all on function public.list_invite_operator_packages()
  from public, anon;
revoke all on function public.issue_operator_invite(text, text[], integer, timestamptz, interval)
  from public, anon;
revoke all on function public.list_my_issued_invites()
  from public, anon;
revoke all on function public.revoke_my_issued_invite(uuid, text)
  from public, anon;
revoke all on function public.list_my_invite_operator_activity(integer)
  from public, anon;
revoke all on function public.list_invite_operator_audit(timestamptz, integer)
  from public, anon, authenticated;

grant execute on function public.get_my_invite_operator_context()
  to authenticated;
grant execute on function public.list_invite_operator_packages()
  to authenticated;
grant execute on function public.issue_operator_invite(text, text[], integer, timestamptz, interval)
  to authenticated;
grant execute on function public.list_my_issued_invites()
  to authenticated;
grant execute on function public.revoke_my_issued_invite(uuid, text)
  to authenticated;
grant execute on function public.list_my_invite_operator_activity(integer)
  to authenticated;
grant execute on function public.list_invite_operator_audit(timestamptz, integer)
  to service_role;
