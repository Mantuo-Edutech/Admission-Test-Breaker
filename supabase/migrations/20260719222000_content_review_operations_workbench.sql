-- Private content review operations queue.
-- The browser may prepare a review packet, but it cannot approve or publish a product.
-- Final decisions remain source-bound files under verification/reviews/decisions.

create table private.content_review_viewer_grants (
  auth_user_id uuid primary key references public.app_users (auth_user_id) on delete cascade,
  display_name text not null,
  status text not null default 'active',
  granted_at timestamptz not null default now(),
  revoked_at timestamptz,
  constraint content_review_viewer_name
    check (length(trim(display_name)) between 2 and 80),
  constraint content_review_viewer_status
    check (status in ('active', 'revoked')),
  constraint content_review_viewer_revoke_consistency check (
    (status = 'active' and revoked_at is null)
    or (status = 'revoked' and revoked_at is not null)
  )
);

create table private.content_review_queue_items (
  review_key text primary key,
  campaign_id text not null,
  owner_role text not null,
  independence_required boolean not null,
  evidence_requirement text not null,
  viewports text[] not null default array[]::text[],
  products jsonb not null,
  source_fingerprint text not null,
  source_artifact_count integer not null,
  catalog_revision text not null,
  synced_at timestamptz not null default now(),
  constraint content_review_queue_key
    check (review_key ~ '^[a-z0-9][a-z0-9._/-]{2,199}$'),
  constraint content_review_queue_campaign
    check (campaign_id in ('academic-content', 'student-calibration', 'device-accessibility')),
  constraint content_review_queue_owner_role
    check (length(trim(owner_role)) between 2 and 80),
  constraint content_review_queue_evidence
    check (length(trim(evidence_requirement)) between 20 and 3000),
  constraint content_review_queue_viewports
    check (cardinality(viewports) <= 20),
  constraint content_review_queue_products
    check (jsonb_typeof(products) = 'array' and jsonb_array_length(products) between 1 and 40),
  constraint content_review_queue_fingerprint
    check (source_fingerprint ~ '^sha256:[0-9a-f]{64}$'),
  constraint content_review_queue_source_count
    check (source_artifact_count between 1 and 100000),
  constraint content_review_queue_catalog_revision
    check (length(trim(catalog_revision)) between 3 and 80)
);

create index content_review_queue_campaign_idx
  on private.content_review_queue_items (campaign_id, review_key);

create table private.content_review_operations_events (
  id uuid primary key default extensions.gen_random_uuid(),
  subject_user_id uuid references public.app_users (auth_user_id) on delete set null,
  event_type text not null,
  occurred_at timestamptz not null default now(),
  details jsonb not null default '{}'::jsonb,
  constraint content_review_operations_event_type
    check (event_type in ('viewer_granted', 'viewer_revoked', 'queue_synced')),
  constraint content_review_operations_event_details
    check (jsonb_typeof(details) = 'object')
);

alter table private.content_review_viewer_grants enable row level security;
alter table private.content_review_queue_items enable row level security;
alter table private.content_review_operations_events enable row level security;

revoke all on table private.content_review_viewer_grants
  from public, anon, authenticated, service_role;
revoke all on table private.content_review_queue_items
  from public, anon, authenticated, service_role;
revoke all on table private.content_review_operations_events
  from public, anon, authenticated, service_role;

create or replace function private.is_active_content_review_viewer(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from private.content_review_viewer_grants as viewer_grant
    where viewer_grant.auth_user_id = p_user_id
      and viewer_grant.status = 'active'
      and viewer_grant.revoked_at is null
  );
$$;

create or replace function private.require_active_content_review_viewer()
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
    or not private.is_active_content_review_viewer(current_user_id)
  then
    raise exception 'content_review_viewer_required' using errcode = '42501';
  end if;
  return current_user_id;
end;
$$;

create or replace function private.content_review_products_valid(p_products jsonb)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select jsonb_typeof(p_products) = 'array'
    and jsonb_array_length(p_products) between 1 and 40
    and not exists (
      select 1
      from jsonb_array_elements(p_products) as item(product)
      where jsonb_typeof(product) <> 'object'
        or coalesce(product ->> 'productId', '') !~ '^[a-z0-9][a-z0-9._-]{1,119}$'
        or coalesce(product ->> 'examId', '') not in ('tmua', 'esat', 'tara', 'lnat', 'ucat')
        or length(coalesce(product ->> 'version', '')) not between 1 and 40
        or coalesce(product ->> 'route', '') !~ '^/[^/].*'
        or coalesce(product ->> 'route', '') ~ '[\\\r\n]'
    );
$$;

revoke all on function private.is_active_content_review_viewer(uuid)
  from public, anon, authenticated, service_role;
revoke all on function private.require_active_content_review_viewer()
  from public, anon, authenticated, service_role;
revoke all on function private.content_review_products_valid(jsonb)
  from public, anon, authenticated, service_role;

create or replace function public.configure_content_review_viewer(
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
      and app_user.deleted_at is null
  ) then
    raise exception 'content_review_viewer_user_missing' using errcode = '22023';
  end if;
  if length(normalized_name) not between 2 and 80 then
    raise exception 'content_review_viewer_name_invalid' using errcode = '22023';
  end if;
  if length(normalized_reason) not between 3 and 240 then
    raise exception 'content_review_viewer_reason_invalid' using errcode = '22023';
  end if;

  if p_active then
    insert into private.content_review_viewer_grants (
      auth_user_id, display_name, status, granted_at, revoked_at
    ) values (
      p_viewer_user_id, normalized_name, 'active', now(), null
    )
    on conflict (auth_user_id) do update
      set display_name = excluded.display_name,
          status = 'active',
          granted_at = now(),
          revoked_at = null;

    insert into private.content_review_operations_events (
      subject_user_id, event_type, details
    ) values (
      p_viewer_user_id,
      'viewer_granted',
      jsonb_build_object('displayName', normalized_name, 'reason', normalized_reason)
    );
  else
    update private.content_review_viewer_grants as viewer_grant
    set status = 'revoked', revoked_at = now()
    where viewer_grant.auth_user_id = p_viewer_user_id
      and viewer_grant.status = 'active';
    if not found then
      raise exception 'content_review_viewer_not_active' using errcode = '22023';
    end if;

    insert into private.content_review_operations_events (
      subject_user_id, event_type, details
    ) values (
      p_viewer_user_id,
      'viewer_revoked',
      jsonb_build_object('displayName', normalized_name, 'reason', normalized_reason)
    );
  end if;

  return query
    select viewer_grant.auth_user_id, viewer_grant.display_name, viewer_grant.status
    from private.content_review_viewer_grants as viewer_grant
    where viewer_grant.auth_user_id = p_viewer_user_id;
end;
$$;

revoke all on function public.configure_content_review_viewer(uuid, text, boolean, text)
  from public, anon, authenticated;
grant execute on function public.configure_content_review_viewer(uuid, text, boolean, text)
  to service_role;

create or replace function public.sync_content_review_queue(
  p_catalog_revision text,
  p_items jsonb
)
returns table (catalog_revision text, synced_items integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  normalized_revision text := trim(p_catalog_revision);
  item jsonb;
  item_count integer;
  item_viewports text[];
begin
  if length(normalized_revision) not between 3 and 80 then
    raise exception 'content_review_catalog_revision_invalid' using errcode = '22023';
  end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) > 500 then
    raise exception 'content_review_queue_invalid' using errcode = '22023';
  end if;
  item_count := jsonb_array_length(p_items);

  delete from private.content_review_queue_items as queue
  where queue.catalog_revision is not null;
  for item in select value from jsonb_array_elements(p_items)
  loop
    if jsonb_typeof(item) <> 'object'
      or coalesce(item ->> 'reviewKey', '') !~ '^[a-z0-9][a-z0-9._/-]{2,199}$'
      or coalesce(item ->> 'campaignId', '') not in (
        'academic-content', 'student-calibration', 'device-accessibility'
      )
      or length(trim(coalesce(item ->> 'ownerRole', ''))) not between 2 and 80
      or jsonb_typeof(item -> 'independenceRequired') is distinct from 'boolean'
      or length(trim(coalesce(item ->> 'evidenceRequirement', ''))) not between 20 and 3000
      or jsonb_typeof(item -> 'viewports') is distinct from 'array'
      or jsonb_array_length(item -> 'viewports') > 20
      or exists (
        select 1 from jsonb_array_elements(item -> 'viewports') as viewport(value)
        where jsonb_typeof(value) <> 'string' or length(trim(value #>> '{}')) not between 1 and 100
      )
      or coalesce(not private.content_review_products_valid(item -> 'products'), true)
      or coalesce(item ->> 'sourceFingerprint', '') !~ '^sha256:[0-9a-f]{64}$'
      or coalesce(item ->> 'sourceArtifactCount', '') !~ '^[0-9]+$'
      or (item ->> 'sourceArtifactCount')::integer not between 1 and 100000
    then
      raise exception 'content_review_queue_item_invalid' using errcode = '22023';
    end if;

    select coalesce(array_agg(value #>> '{}' order by ordinal), array[]::text[])
      into item_viewports
    from jsonb_array_elements(item -> 'viewports') with ordinality as viewport(value, ordinal);

    insert into private.content_review_queue_items (
      review_key,
      campaign_id,
      owner_role,
      independence_required,
      evidence_requirement,
      viewports,
      products,
      source_fingerprint,
      source_artifact_count,
      catalog_revision,
      synced_at
    ) values (
      item ->> 'reviewKey',
      item ->> 'campaignId',
      item ->> 'ownerRole',
      (item ->> 'independenceRequired')::boolean,
      item ->> 'evidenceRequirement',
      item_viewports,
      item -> 'products',
      item ->> 'sourceFingerprint',
      (item ->> 'sourceArtifactCount')::integer,
      normalized_revision,
      now()
    );
  end loop;

  insert into private.content_review_operations_events (event_type, details)
  values (
    'queue_synced',
    jsonb_build_object('catalogRevision', normalized_revision, 'itemCount', item_count)
  );

  return query select normalized_revision, item_count;
end;
$$;

revoke all on function public.sync_content_review_queue(text, jsonb)
  from public, anon, authenticated;
grant execute on function public.sync_content_review_queue(text, jsonb)
  to service_role;

create or replace function public.get_my_content_review_viewer_context()
returns table (active boolean, display_name text, permissions text[])
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
      else array['view_content_review_queue', 'prepare_review_packet']::text[]
    end
  from (select (select auth.uid()) as current_user_id) as current_actor
  left join private.content_review_viewer_grants as viewer_grant
    on viewer_grant.auth_user_id = current_actor.current_user_id
   and viewer_grant.status = 'active'
   and viewer_grant.revoked_at is null;
$$;

create or replace function public.get_content_review_queue_summary()
returns table (
  catalog_revision text,
  pending_review_items bigint,
  affected_public_products bigint,
  academic_content_items bigint,
  student_calibration_items bigint,
  device_accessibility_items bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform private.require_active_content_review_viewer();
  return query
    select
      max(queue.catalog_revision),
      count(distinct queue.review_key)::bigint,
      coalesce(count(distinct product.product ->> 'productId'), 0)::bigint,
      count(distinct queue.review_key) filter (
        where queue.campaign_id = 'academic-content'
      )::bigint,
      count(distinct queue.review_key) filter (
        where queue.campaign_id = 'student-calibration'
      )::bigint,
      count(distinct queue.review_key) filter (
        where queue.campaign_id = 'device-accessibility'
      )::bigint
    from private.content_review_queue_items as queue
    left join lateral jsonb_array_elements(queue.products) as product(product) on true;
end;
$$;

create or replace function public.list_content_review_queue(
  p_campaign_id text default null,
  p_limit integer default 200
)
returns table (
  review_key text,
  campaign_id text,
  owner_role text,
  independence_required boolean,
  evidence_requirement text,
  viewports text[],
  products jsonb,
  source_fingerprint text,
  source_artifact_count integer,
  catalog_revision text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform private.require_active_content_review_viewer();
  if p_campaign_id is not null and p_campaign_id not in (
    'academic-content', 'student-calibration', 'device-accessibility'
  ) then
    raise exception 'content_review_campaign_invalid' using errcode = '22023';
  end if;
  if p_limit is null or p_limit < 1 or p_limit > 200 then
    raise exception 'content_review_limit_invalid' using errcode = '22023';
  end if;
  return query
    select
      queue.review_key,
      queue.campaign_id,
      queue.owner_role,
      queue.independence_required,
      queue.evidence_requirement,
      queue.viewports,
      queue.products,
      queue.source_fingerprint,
      queue.source_artifact_count,
      queue.catalog_revision
    from private.content_review_queue_items as queue
    where p_campaign_id is null or queue.campaign_id = p_campaign_id
    order by queue.campaign_id, queue.review_key
    limit p_limit;
end;
$$;

revoke all on function public.get_my_content_review_viewer_context()
  from public, anon;
revoke all on function public.get_content_review_queue_summary()
  from public, anon;
revoke all on function public.list_content_review_queue(text, integer)
  from public, anon;
grant execute on function public.get_my_content_review_viewer_context()
  to authenticated;
grant execute on function public.get_content_review_queue_summary()
  to authenticated;
grant execute on function public.list_content_review_queue(text, integer)
  to authenticated;
