create table private.guest_space_claims (
  guest_space_id text primary key,
  learner_space_id text not null
    references public.learner_spaces (id) on delete cascade,
  claimed_by uuid not null
    references public.app_users (auth_user_id) on delete cascade,
  claimed_at timestamptz not null default now(),
  constraint guest_space_claims_id_format
    check (guest_space_id ~ '^gsp_[A-Za-z0-9_-]+$')
);

create index guest_space_claims_learner_idx
  on private.guest_space_claims (learner_space_id, claimed_at);

create or replace function private.register_guest_space_claim(
  p_guest_space_id text,
  p_learner_space_id text,
  p_user_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  existing_claim private.guest_space_claims%rowtype;
begin
  if p_guest_space_id !~ '^gsp_[A-Za-z0-9_-]+$' then
    raise exception 'guest_space_invalid' using errcode = '22023';
  end if;

  select claim.* into existing_claim
  from private.guest_space_claims as claim
  where claim.guest_space_id = p_guest_space_id
  for update;

  if existing_claim.guest_space_id is not null then
    if existing_claim.claimed_by <> p_user_id
      or existing_claim.learner_space_id <> p_learner_space_id then
      raise exception 'guest_space_already_claimed' using errcode = '42501';
    end if;
    return;
  end if;

  insert into private.guest_space_claims (
    guest_space_id,
    learner_space_id,
    claimed_by
  ) values (
    p_guest_space_id,
    p_learner_space_id,
    p_user_id
  );
end;
$$;

create or replace function public.save_preparation_profile(p_profile jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  current_learner_space_id text;
  source_guest_space_id text;
begin
  if current_user_id is null then
    raise exception 'authentication_required' using errcode = '42501';
  end if;

  select learner_space.id into current_learner_space_id
  from public.learner_spaces as learner_space
  where learner_space.owner_user_id = current_user_id
    and learner_space.status = 'active';

  if current_learner_space_id is null then
    raise exception 'learner_space_not_found' using errcode = '42501';
  end if;

  if jsonb_typeof(p_profile) <> 'object'
    or octet_length(p_profile::text) > 131072
    or p_profile->>'schemaVersion' <> '1'
    or p_profile->>'exam' <> 'TMUA'
    or jsonb_typeof(p_profile->'selections') <> 'array'
    or p_profile->>'curriculumSystem' not in ('caie', 'pearson-ial')
    or p_profile->>'experience' not in ('new', 'sampled', 'mocked', 'past-papers')
    or p_profile->>'entryCycle' !~ '^20[0-9]{2}$' then
    raise exception 'preparation_profile_invalid' using errcode = '22023';
  end if;

  source_guest_space_id := p_profile->>'guestSpaceId';
  perform private.register_guest_space_claim(
    source_guest_space_id,
    current_learner_space_id,
    current_user_id
  );

  insert into public.preparation_profiles (
    learner_space_id,
    schema_version,
    profile
  ) values (
    current_learner_space_id,
    1,
    p_profile
  )
  on conflict (learner_space_id) do update
    set schema_version = excluded.schema_version,
        profile = excluded.profile,
        updated_at = now();

  return p_profile;
end;
$$;

create or replace function public.save_practice_session(p_session jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  current_learner_space_id text;
  current_platform_user_id text;
  source_learning_space_id text;
  source_actor jsonb;
  canonical_actor jsonb;
  canonical_events jsonb;
  canonical_session jsonb;
  current_session_id text;
  existing_learner_space_id text;
  existing_event_count integer;
  incoming_event_count integer;
begin
  if current_user_id is null then
    raise exception 'authentication_required' using errcode = '42501';
  end if;

  select learner_space.id, app_user.platform_user_id
  into current_learner_space_id, current_platform_user_id
  from public.learner_spaces as learner_space
  join public.app_users as app_user
    on app_user.auth_user_id = learner_space.owner_user_id
  where learner_space.owner_user_id = current_user_id
    and learner_space.status = 'active';

  if current_learner_space_id is null or current_platform_user_id is null then
    raise exception 'learner_space_not_found' using errcode = '42501';
  end if;

  if jsonb_typeof(p_session) <> 'object'
    or octet_length(p_session::text) > 2097152
    or p_session->>'schemaVersion' <> '2'
    or p_session->>'id' !~ '^ses_[A-Za-z0-9_-]+$'
    or p_session->>'paperId' !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
    or p_session->>'status' not in ('active', 'submitted', 'expired')
    or jsonb_typeof(p_session->'answers') <> 'object'
    or jsonb_typeof(p_session->'markedQuestionIds') <> 'array'
    or jsonb_typeof(p_session->'timingByQuestionMs') <> 'object'
    or jsonb_typeof(p_session->'events') <> 'array'
    or jsonb_array_length(p_session->'events') = 0 then
    raise exception 'practice_session_invalid' using errcode = '22023';
  end if;

  begin
    perform (p_session->>'startedAt')::timestamptz;
    perform (p_session->>'deadlineAt')::timestamptz;
    if (p_session->>'deadlineAt')::timestamptz <= (p_session->>'startedAt')::timestamptz then
      raise exception 'practice_session_deadline_invalid' using errcode = '22023';
    end if;
  exception when invalid_text_representation or datetime_field_overflow then
    raise exception 'practice_session_timestamp_invalid' using errcode = '22023';
  end;

  if (p_session->>'status' = 'active' and p_session ? 'submittedAt')
    or (p_session->>'status' <> 'active' and not (p_session ? 'submittedAt')) then
    raise exception 'practice_session_status_invalid' using errcode = '22023';
  end if;

  current_session_id := p_session->>'id';
  source_learning_space_id := p_session->>'learningSpaceId';
  source_actor := p_session->'startedBy';
  canonical_actor := jsonb_build_object(
    'kind', 'student',
    'userId', current_platform_user_id
  );

  if source_learning_space_id ~ '^gsp_[A-Za-z0-9_-]+$' then
    if source_actor->>'kind' <> 'guest'
      or coalesce(source_actor->>'actorId', '') = '' then
      raise exception 'guest_session_actor_invalid' using errcode = '22023';
    end if;
    perform private.register_guest_space_claim(
      source_learning_space_id,
      current_learner_space_id,
      current_user_id
    );
  elsif source_learning_space_id = current_learner_space_id then
    if source_actor <> canonical_actor then
      raise exception 'practice_session_actor_invalid' using errcode = '42501';
    end if;
  else
    raise exception 'practice_session_tenant_invalid' using errcode = '42501';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_session->'events') with ordinality as item(event, ordinal)
    where jsonb_typeof(item.event) <> 'object'
      or item.event->>'schemaVersion' <> '1'
      or item.event->>'id' !~ '^evt_[A-Za-z0-9_-]+$'
      or item.event->>'learningSpaceId' <> source_learning_space_id
      or item.event->>'sessionId' <> current_session_id
      or (item.event->>'sequence')::integer <> item.ordinal
      or item.event->>'type' not in (
        'session_started', 'session_paused', 'session_resumed',
        'question_viewed', 'answer_selected', 'answer_changed',
        'question_marked', 'question_unmarked', 'submission_opened',
        'session_submitted', 'session_expired', 'question_time_recorded'
      )
      or jsonb_typeof(item.event->'payload') <> 'object'
      or item.event->'actor' <> source_actor
  ) then
    raise exception 'learning_events_invalid' using errcode = '22023';
  end if;

  select count(*), count(distinct item.event->>'id')
  into incoming_event_count, existing_event_count
  from jsonb_array_elements(p_session->'events') as item(event);
  if incoming_event_count <> existing_event_count then
    raise exception 'learning_event_id_duplicate' using errcode = '22023';
  end if;

  canonical_events := (
    select jsonb_agg(
      item.event
        || jsonb_build_object('learningSpaceId', current_learner_space_id)
        || jsonb_build_object('actor', canonical_actor)
      order by item.ordinal
    )
    from jsonb_array_elements(p_session->'events') with ordinality as item(event, ordinal)
  );
  canonical_session := p_session
    || jsonb_build_object('learningSpaceId', current_learner_space_id)
    || jsonb_build_object('startedBy', canonical_actor)
    || jsonb_build_object('events', canonical_events);

  select session.learner_space_id into existing_learner_space_id
  from public.practice_sessions as session
  where session.id = current_session_id
  for update;
  if existing_learner_space_id is not null
    and existing_learner_space_id <> current_learner_space_id then
    raise exception 'practice_session_already_owned' using errcode = '42501';
  end if;

  select count(*) into existing_event_count
  from public.learning_events as event
  where event.session_id = current_session_id;
  if existing_event_count > incoming_event_count then
    raise exception 'practice_session_stale' using errcode = '40001';
  end if;

  if exists (
    select 1
    from public.learning_events as stored
    join jsonb_array_elements(canonical_events) with ordinality as incoming(event, ordinal)
      on incoming.ordinal = stored.sequence
    where stored.session_id = current_session_id
      and (
        stored.id <> incoming.event->>'id'
        or stored.event_type <> incoming.event->>'type'
        or stored.actor <> incoming.event->'actor'
        or stored.occurred_at <> (incoming.event->>'occurredAt')::timestamptz
        or stored.payload <> incoming.event->'payload'
      )
  ) then
    raise exception 'learning_event_idempotency_conflict' using errcode = '40001';
  end if;

  insert into public.practice_sessions (
    id,
    learner_space_id,
    paper_id,
    schema_version,
    status,
    snapshot,
    started_at,
    deadline_at,
    submitted_at
  ) values (
    current_session_id,
    current_learner_space_id,
    p_session->>'paperId',
    2,
    p_session->>'status',
    canonical_session,
    (p_session->>'startedAt')::timestamptz,
    (p_session->>'deadlineAt')::timestamptz,
    case when p_session ? 'submittedAt'
      then (p_session->>'submittedAt')::timestamptz
      else null
    end
  )
  on conflict (id) do update
    set status = excluded.status,
        snapshot = excluded.snapshot,
        submitted_at = excluded.submitted_at,
        updated_at = now();

  insert into public.learning_events (
    id,
    learner_space_id,
    session_id,
    sequence,
    schema_version,
    event_type,
    actor,
    occurred_at,
    payload
  )
  select
    item.event->>'id',
    current_learner_space_id,
    current_session_id,
    item.ordinal::integer,
    1,
    item.event->>'type',
    item.event->'actor',
    (item.event->>'occurredAt')::timestamptz,
    item.event->'payload'
  from jsonb_array_elements(canonical_events) with ordinality as item(event, ordinal)
  where item.ordinal > existing_event_count
  order by item.ordinal;

  return canonical_session;
end;
$$;

create or replace function public.delete_preparation_profile()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
begin
  if current_user_id is null then
    raise exception 'authentication_required' using errcode = '42501';
  end if;

  delete from public.preparation_profiles as profile
  using public.learner_spaces as learner_space
  where profile.learner_space_id = learner_space.id
    and learner_space.owner_user_id = current_user_id;
end;
$$;

revoke all on function public.save_preparation_profile(jsonb) from public, anon;
grant execute on function public.save_preparation_profile(jsonb) to authenticated;
revoke all on function public.save_practice_session(jsonb) from public, anon;
grant execute on function public.save_practice_session(jsonb) to authenticated;
revoke all on function public.delete_preparation_profile() from public, anon;
grant execute on function public.delete_preparation_profile() to authenticated;

revoke insert, update, delete on public.preparation_profiles from authenticated;
revoke insert, update on public.practice_sessions from authenticated;
revoke insert on public.learning_events from authenticated;

revoke all on table private.guest_space_claims from public, anon, authenticated;
revoke all on function private.register_guest_space_claim(text, text, uuid)
  from public, anon, authenticated;
