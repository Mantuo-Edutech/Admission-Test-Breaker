create extension if not exists pgcrypto with schema extensions;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table public.app_users (
  auth_user_id uuid primary key references auth.users (id) on delete cascade,
  platform_user_id text not null unique
    default ('usr_' || replace(extensions.gen_random_uuid()::text, '-', '')),
  created_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint app_users_platform_id_format
    check (platform_user_id ~ '^usr_[0-9a-f]{32}$')
);

create table public.learner_spaces (
  id text primary key
    default ('lsp_' || replace(extensions.gen_random_uuid()::text, '-', '')),
  owner_user_id uuid not null unique
    references public.app_users (auth_user_id) on delete cascade,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  archived_at timestamptz,
  constraint learner_spaces_id_format check (id ~ '^lsp_[0-9a-f]{32}$'),
  constraint learner_spaces_status check (status in ('active', 'archived')),
  constraint learner_spaces_archive_consistency check (
    (status = 'active' and archived_at is null)
    or (status = 'archived' and archived_at is not null)
  )
);

create table public.preparation_profiles (
  learner_space_id text primary key
    references public.learner_spaces (id) on delete cascade,
  schema_version integer not null default 1,
  profile jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint preparation_profiles_schema_version check (schema_version > 0),
  constraint preparation_profiles_payload_object
    check (jsonb_typeof(profile) = 'object')
);

create table public.practice_sessions (
  id text primary key,
  learner_space_id text not null
    references public.learner_spaces (id) on delete cascade,
  paper_id text not null,
  schema_version integer not null,
  status text not null,
  snapshot jsonb not null,
  started_at timestamptz not null,
  deadline_at timestamptz not null,
  submitted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint practice_sessions_tenant_key unique (id, learner_space_id),
  constraint practice_sessions_id_format check (id ~ '^ses_[A-Za-z0-9_-]+$'),
  constraint practice_sessions_schema_version check (schema_version > 0),
  constraint practice_sessions_status
    check (status in ('active', 'submitted', 'expired')),
  constraint practice_sessions_snapshot_object
    check (jsonb_typeof(snapshot) = 'object'),
  constraint practice_sessions_deadline_order check (deadline_at > started_at),
  constraint practice_sessions_submission_consistency check (
    (status = 'active' and submitted_at is null)
    or (status in ('submitted', 'expired') and submitted_at is not null)
  )
);

create table public.learning_events (
  id text primary key,
  learner_space_id text not null,
  session_id text not null,
  sequence integer not null,
  schema_version integer not null default 1,
  event_type text not null,
  actor jsonb not null,
  occurred_at timestamptz not null,
  received_at timestamptz not null default now(),
  payload jsonb not null,
  constraint learning_events_session_tenant_fk
    foreign key (session_id, learner_space_id)
    references public.practice_sessions (id, learner_space_id)
    on delete cascade,
  constraint learning_events_session_sequence unique (session_id, sequence),
  constraint learning_events_id_format check (id ~ '^evt_[A-Za-z0-9_-]+$'),
  constraint learning_events_positive_sequence check (sequence > 0),
  constraint learning_events_schema_version check (schema_version > 0),
  constraint learning_events_type_nonempty check (length(trim(event_type)) > 0),
  constraint learning_events_actor_object check (jsonb_typeof(actor) = 'object'),
  constraint learning_events_payload_object check (jsonb_typeof(payload) = 'object')
);

create index practice_sessions_learner_space_idx
  on public.practice_sessions (learner_space_id, updated_at desc);
create index learning_events_learner_session_idx
  on public.learning_events (learner_space_id, session_id, sequence);

create table public.content_resources (
  id text primary key,
  exam text not null,
  kind text not null,
  title text not null,
  access_tier text not null default 'public',
  publication_status text not null default 'draft',
  revision integer not null default 1,
  metadata jsonb not null default '{}'::jsonb,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint content_resources_id_format check (id ~ '^[a-z0-9][a-z0-9-]+$'),
  constraint content_resources_exam check (exam in ('TMUA', 'ESAT', 'TARA', 'UCAT')),
  constraint content_resources_kind
    check (kind in ('past_paper', 'mock_paper', 'review_notes')),
  constraint content_resources_access_tier
    check (access_tier in ('public', 'entitled')),
  constraint content_resources_publication_status
    check (publication_status in ('draft', 'review', 'published', 'retired')),
  constraint content_resources_revision check (revision > 0),
  constraint content_resources_metadata_object check (jsonb_typeof(metadata) = 'object'),
  constraint content_resources_publication_consistency check (
    (publication_status = 'published' and published_at is not null)
    or (publication_status <> 'published' and published_at is null)
  )
);

create table public.access_packages (
  id text primary key,
  name text not null,
  description text not null,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  constraint access_packages_id_format check (id ~ '^[a-z0-9][a-z0-9-]+$'),
  constraint access_packages_status check (status in ('active', 'retired'))
);

create table public.access_package_resources (
  package_id text not null references public.access_packages (id) on delete cascade,
  resource_id text not null references public.content_resources (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (package_id, resource_id)
);

create table public.user_entitlements (
  id uuid primary key default extensions.gen_random_uuid(),
  user_id uuid not null references public.app_users (auth_user_id) on delete cascade,
  package_id text not null references public.access_packages (id),
  source text not null,
  source_invite_id uuid,
  granted_at timestamptz not null default now(),
  expires_at timestamptz,
  revoked_at timestamptz,
  constraint user_entitlements_user_package unique (user_id, package_id),
  constraint user_entitlements_source check (source in ('invite', 'admin', 'purchase')),
  constraint user_entitlements_expiry_order
    check (expires_at is null or expires_at > granted_at),
  constraint user_entitlements_revoke_order
    check (revoked_at is null or revoked_at >= granted_at)
);

create index user_entitlements_active_idx
  on public.user_entitlements (user_id, package_id, expires_at)
  where revoked_at is null;

create table private.invite_codes (
  id uuid primary key default extensions.gen_random_uuid(),
  code_digest bytea not null unique,
  label text not null,
  status text not null default 'active',
  max_redemptions integer not null default 1,
  starts_at timestamptz not null default now(),
  expires_at timestamptz,
  entitlement_duration interval,
  created_by uuid references public.app_users (auth_user_id),
  created_at timestamptz not null default now(),
  revoked_at timestamptz,
  constraint invite_codes_status check (status in ('active', 'revoked')),
  constraint invite_codes_max_redemptions check (max_redemptions > 0),
  constraint invite_codes_expiry_order check (expires_at is null or expires_at > starts_at),
  constraint invite_codes_duration_positive
    check (entitlement_duration is null or entitlement_duration > interval '0 seconds'),
  constraint invite_codes_revoke_consistency check (
    (status = 'active' and revoked_at is null)
    or (status = 'revoked' and revoked_at is not null)
  )
);

create table private.invite_packages (
  invite_id uuid not null references private.invite_codes (id) on delete cascade,
  package_id text not null references public.access_packages (id),
  primary key (invite_id, package_id)
);

create table private.invite_redemptions (
  invite_id uuid not null references private.invite_codes (id),
  user_id uuid not null references public.app_users (auth_user_id) on delete cascade,
  redeemed_at timestamptz not null default now(),
  primary key (invite_id, user_id)
);

create index invite_redemptions_invite_idx
  on private.invite_redemptions (invite_id, redeemed_at);

alter table public.user_entitlements
  add constraint user_entitlements_source_invite_fk
  foreign key (source_invite_id) references private.invite_codes (id);

create or replace function private.invite_code_digest(p_code text)
returns bytea
language plpgsql
immutable
strict
set search_path = ''
as $$
declare
  normalized text;
begin
  normalized := upper(regexp_replace(trim(p_code), '[^A-Za-z0-9]', '', 'g'));
  if length(normalized) < 20 or length(normalized) > 96 then
    raise exception 'invite_code_invalid' using errcode = '22023';
  end if;
  return extensions.digest(convert_to(normalized, 'UTF8'), 'sha256');
end;
$$;

create or replace function private.owns_learner_space(p_learner_space_id text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.learner_spaces as learner_space
    where learner_space.id = p_learner_space_id
      and learner_space.owner_user_id = (select auth.uid())
      and learner_space.status = 'active'
  );
$$;

create or replace function private.can_access_content(p_resource_id text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.content_resources as resource
    where resource.id = p_resource_id
      and resource.publication_status = 'published'
      and (
        resource.access_tier = 'public'
        or exists (
          select 1
          from public.access_package_resources as package_resource
          join public.user_entitlements as entitlement
            on entitlement.package_id = package_resource.package_id
          where package_resource.resource_id = resource.id
            and entitlement.user_id = (select auth.uid())
            and entitlement.revoked_at is null
            and (entitlement.expires_at is null or entitlement.expires_at > now())
        )
      )
  );
$$;

create or replace function private.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.app_users (auth_user_id)
  values (new.id)
  on conflict (auth_user_id) do nothing;

  insert into public.learner_spaces (owner_user_id)
  values (new.id)
  on conflict (owner_user_id) do nothing;

  return new;
end;
$$;

create or replace function private.enforce_learning_event_append()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  expected_sequence integer;
  authenticated_platform_user_id text;
begin
  perform 1
  from public.practice_sessions as session
  where session.id = new.session_id
    and session.learner_space_id = new.learner_space_id
  for update;

  if not found then
    raise exception 'learning_event_session_not_found' using errcode = '23503';
  end if;

  select coalesce(max(event.sequence), 0) + 1
  into expected_sequence
  from public.learning_events as event
  where event.session_id = new.session_id;

  if new.sequence <> expected_sequence then
    raise exception 'learning_event_sequence_invalid' using errcode = '23514';
  end if;

  if (select auth.uid()) is not null then
    select app_user.platform_user_id
    into authenticated_platform_user_id
    from public.app_users as app_user
    where app_user.auth_user_id = (select auth.uid());

    if new.actor->>'kind' <> 'student'
      or new.actor->>'userId' is distinct from authenticated_platform_user_id then
      raise exception 'learning_event_actor_invalid' using errcode = '42501';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure private.handle_new_auth_user();

drop trigger if exists enforce_learning_event_append on public.learning_events;
create trigger enforce_learning_event_append
  before insert on public.learning_events
  for each row execute procedure private.enforce_learning_event_append();

create or replace function public.validate_invite_for_registration(p_code text)
returns table (
  valid boolean,
  label text,
  package_ids text[]
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  invite private.invite_codes%rowtype;
  redemption_count bigint;
begin
  begin
    select candidate.* into invite
    from private.invite_codes as candidate
    where candidate.code_digest = private.invite_code_digest(p_code)
      and candidate.status = 'active'
      and candidate.starts_at <= now()
      and (candidate.expires_at is null or candidate.expires_at > now());
  exception when sqlstate '22023' then
    return query select false, null::text, array[]::text[];
    return;
  end;

  if invite.id is null then
    return query select false, null::text, array[]::text[];
    return;
  end if;

  select count(*) into redemption_count
  from private.invite_redemptions as redemption
  where redemption.invite_id = invite.id;

  if redemption_count >= invite.max_redemptions then
    return query select false, null::text, array[]::text[];
    return;
  end if;

  return query
    select
      true,
      invite.label,
      coalesce(array_agg(invite_package.package_id order by invite_package.package_id), array[]::text[])
    from private.invite_packages as invite_package
    where invite_package.invite_id = invite.id;
end;
$$;

create or replace function public.redeem_invite(p_code text)
returns table (package_id text, expires_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  invite private.invite_codes%rowtype;
  redemption_count bigint;
  entitlement_expiry timestamptz;
begin
  if current_user_id is null then
    raise exception 'authentication_required' using errcode = '42501';
  end if;

  begin
    select candidate.* into invite
    from private.invite_codes as candidate
    where candidate.code_digest = private.invite_code_digest(p_code)
      and candidate.status = 'active'
      and candidate.starts_at <= now()
      and (candidate.expires_at is null or candidate.expires_at > now())
    for update;
  exception when sqlstate '22023' then
    raise exception 'invite_code_invalid' using errcode = '22023';
  end;

  if invite.id is null then
    raise exception 'invite_code_invalid' using errcode = '22023';
  end if;

  if exists (
    select 1
    from private.invite_redemptions as redemption
    where redemption.invite_id = invite.id
      and redemption.user_id = current_user_id
  ) then
    return query
      select entitlement.package_id, entitlement.expires_at
      from public.user_entitlements as entitlement
      join private.invite_packages as invite_package
        on invite_package.package_id = entitlement.package_id
       and invite_package.invite_id = invite.id
      where entitlement.user_id = current_user_id
        and entitlement.revoked_at is null;
    return;
  end if;

  select count(*) into redemption_count
  from private.invite_redemptions as redemption
  where redemption.invite_id = invite.id;

  if redemption_count >= invite.max_redemptions then
    raise exception 'invite_code_exhausted' using errcode = '22023';
  end if;

  entitlement_expiry := case
    when invite.entitlement_duration is null then null
    else now() + invite.entitlement_duration
  end;

  insert into private.invite_redemptions (invite_id, user_id)
  values (invite.id, current_user_id);

  insert into public.user_entitlements (
    user_id,
    package_id,
    source,
    source_invite_id,
    expires_at
  )
  select
    current_user_id,
    invite_package.package_id,
    'invite',
    invite.id,
    entitlement_expiry
  from private.invite_packages as invite_package
  where invite_package.invite_id = invite.id
  on conflict on constraint user_entitlements_user_package do update
    set revoked_at = null,
        expires_at = case
          when public.user_entitlements.expires_at is null then null
          when excluded.expires_at is null then null
          else greatest(public.user_entitlements.expires_at, excluded.expires_at)
        end;

  return query
    select entitlement.package_id, entitlement.expires_at
    from public.user_entitlements as entitlement
    join private.invite_packages as invite_package
      on invite_package.package_id = entitlement.package_id
     and invite_package.invite_id = invite.id
    where entitlement.user_id = current_user_id
      and entitlement.revoked_at is null;
end;
$$;

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
begin
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
    select 1 from unnest(p_package_ids) as requested(package_id)
    left join public.access_packages as package on package.id = requested.package_id
    where package.id is null or package.status <> 'active'
  ) then
    raise exception 'invite_package_invalid' using errcode = '22023';
  end if;

  generated_code := upper(encode(extensions.gen_random_bytes(18), 'hex'));

  insert into private.invite_codes (
    code_digest,
    label,
    max_redemptions,
    expires_at,
    entitlement_duration
  ) values (
    private.invite_code_digest(generated_code),
    trim(p_label),
    p_max_redemptions,
    p_expires_at,
    p_entitlement_duration
  )
  returning id into created_invite_id;

  insert into private.invite_packages (invite_id, package_id)
  select created_invite_id, requested.package_id
  from unnest(p_package_ids) as requested(package_id);

  return query select created_invite_id, generated_code;
end;
$$;

revoke all on function public.validate_invite_for_registration(text) from public, anon, authenticated;
grant execute on function public.validate_invite_for_registration(text) to service_role;
revoke all on function public.issue_invite(text, text[], integer, timestamptz, interval) from public, anon, authenticated;
grant execute on function public.issue_invite(text, text[], integer, timestamptz, interval) to service_role;
revoke all on function public.redeem_invite(text) from public, anon;
grant execute on function public.redeem_invite(text) to authenticated;

revoke all on all functions in schema private from public, anon, authenticated;
grant usage on schema private to anon, authenticated;
grant execute on function private.owns_learner_space(text) to authenticated;
grant execute on function private.can_access_content(text) to anon, authenticated;

alter table public.app_users enable row level security;
alter table public.learner_spaces enable row level security;
alter table public.preparation_profiles enable row level security;
alter table public.practice_sessions enable row level security;
alter table public.learning_events enable row level security;
alter table public.content_resources enable row level security;
alter table public.access_packages enable row level security;
alter table public.access_package_resources enable row level security;
alter table public.user_entitlements enable row level security;

create policy app_users_read_self
  on public.app_users for select to authenticated
  using (auth_user_id = (select auth.uid()));

create policy learner_spaces_read_owner
  on public.learner_spaces for select to authenticated
  using (owner_user_id = (select auth.uid()));

create policy preparation_profiles_read_owner
  on public.preparation_profiles for select to authenticated
  using (private.owns_learner_space(learner_space_id));
create policy preparation_profiles_insert_owner
  on public.preparation_profiles for insert to authenticated
  with check (private.owns_learner_space(learner_space_id));
create policy preparation_profiles_update_owner
  on public.preparation_profiles for update to authenticated
  using (private.owns_learner_space(learner_space_id))
  with check (private.owns_learner_space(learner_space_id));
create policy preparation_profiles_delete_owner
  on public.preparation_profiles for delete to authenticated
  using (private.owns_learner_space(learner_space_id));

create policy practice_sessions_read_owner
  on public.practice_sessions for select to authenticated
  using (private.owns_learner_space(learner_space_id));
create policy practice_sessions_insert_owner
  on public.practice_sessions for insert to authenticated
  with check (private.owns_learner_space(learner_space_id));
create policy practice_sessions_update_owner
  on public.practice_sessions for update to authenticated
  using (private.owns_learner_space(learner_space_id))
  with check (private.owns_learner_space(learner_space_id));

create policy learning_events_read_owner
  on public.learning_events for select to authenticated
  using (private.owns_learner_space(learner_space_id));
create policy learning_events_append_owner
  on public.learning_events for insert to authenticated
  with check (private.owns_learner_space(learner_space_id));

create policy content_resources_available
  on public.content_resources for select to anon, authenticated
  using (private.can_access_content(id));

create policy access_packages_active
  on public.access_packages for select to anon, authenticated
  using (status = 'active');

create policy access_package_resources_visible
  on public.access_package_resources for select to anon, authenticated
  using (private.can_access_content(resource_id));

create policy user_entitlements_read_self
  on public.user_entitlements for select to authenticated
  using (user_id = (select auth.uid()));

grant select on public.app_users, public.learner_spaces to authenticated;
grant select, insert, update, delete on public.preparation_profiles to authenticated;
grant select, insert, update on public.practice_sessions to authenticated;
grant select, insert on public.learning_events to authenticated;
grant select on public.content_resources, public.access_packages, public.access_package_resources to anon, authenticated;
grant select on public.user_entitlements to authenticated;

revoke insert, update, delete on public.app_users, public.learner_spaces, public.user_entitlements from anon, authenticated;
revoke update, delete on public.learning_events from anon, authenticated;
