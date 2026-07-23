alter table public.practice_sessions
  add column paper_revision_id text,
  add column content_digest text;

update public.practice_sessions as session
set paper_revision_id = revision.paper_revision_id,
    content_digest = revision.content_digest,
    schema_version = 3,
    snapshot = jsonb_set(
      jsonb_set(
        jsonb_set(session.snapshot, '{schemaVersion}', '3'::jsonb, true),
        '{paperRevisionId}', to_jsonb(revision.paper_revision_id), true
      ),
      '{contentDigest}', to_jsonb(revision.content_digest), true
    )
from public.practice_content_revisions as revision
where revision.paper_id = session.paper_id
  and revision.paper_revision_id = session.snapshot->>'paperRevisionId'
  and revision.content_digest = session.snapshot->>'contentDigest';

update public.practice_sessions as session
set paper_revision_id = revision.paper_revision_id,
    content_digest = revision.content_digest,
    schema_version = 3,
    snapshot = jsonb_set(
      jsonb_set(
        jsonb_set(session.snapshot, '{schemaVersion}', '3'::jsonb, true),
        '{paperRevisionId}', to_jsonb(revision.paper_revision_id), true
      ),
      '{contentDigest}', to_jsonb(revision.content_digest), true
    )
from (
  select distinct on (paper_id)
    paper_id,
    paper_revision_id,
    content_digest
  from public.practice_content_revisions
  where publication_status = 'published'
  order by paper_id, revision desc
) as revision
where session.paper_revision_id is null
  and revision.paper_id = session.paper_id;

do $$
begin
  if exists (
    select 1
    from public.practice_sessions
    where paper_revision_id is null or content_digest is null
  ) then
    raise exception 'practice_session_revision_backfill_incomplete';
  end if;
end;
$$;

alter table public.practice_sessions
  alter column paper_revision_id set not null,
  alter column content_digest set not null,
  add constraint practice_sessions_revision_id_format
    check (paper_revision_id ~ '^[a-z0-9]+(?:-[a-z0-9]+)*-r[1-9][0-9]*$'),
  add constraint practice_sessions_content_digest_format
    check (content_digest ~ '^[a-f0-9]{64}$'),
  add constraint practice_sessions_published_content_fk
    foreign key (paper_revision_id, paper_id, content_digest)
    references public.practice_content_revisions (
      paper_revision_id,
      paper_id,
      content_digest
    );

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
  existing_paper_revision_id text;
  existing_content_digest text;
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
    or p_session->>'schemaVersion' <> '3'
    or p_session->>'id' !~ '^ses_[A-Za-z0-9_-]+$'
    or p_session->>'paperId' !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
    or (p_session->>'paperRevisionId') !~ '^[a-z0-9]+(?:-[a-z0-9]+)*-r[1-9][0-9]*$'
    or (p_session->>'paperRevisionId') !~ ('^' || (p_session->>'paperId') || '-r[1-9][0-9]*$')
    or (p_session->>'contentDigest') !~ '^[a-f0-9]{64}$'
    or p_session->>'status' not in ('active', 'submitted', 'expired')
    or jsonb_typeof(p_session->'answers') <> 'object'
    or jsonb_typeof(p_session->'markedQuestionIds') <> 'array'
    or jsonb_typeof(p_session->'timingByQuestionMs') <> 'object'
    or jsonb_typeof(p_session->'events') <> 'array'
    or jsonb_array_length(p_session->'events') = 0 then
    raise exception 'practice_session_invalid' using errcode = '22023';
  end if;

  if not exists (
    select 1
    from public.practice_content_revisions as revision
    where revision.paper_revision_id = p_session->>'paperRevisionId'
      and revision.paper_id = p_session->>'paperId'
      and revision.content_digest = p_session->>'contentDigest'
      and revision.publication_status = 'published'
  ) then
    raise exception 'practice_content_revision_invalid' using errcode = '22023';
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

  select
    session.learner_space_id,
    session.paper_revision_id,
    session.content_digest
  into
    existing_learner_space_id,
    existing_paper_revision_id,
    existing_content_digest
  from public.practice_sessions as session
  where session.id = current_session_id
  for update;
  if existing_learner_space_id is not null
    and existing_learner_space_id <> current_learner_space_id then
    raise exception 'practice_session_already_owned' using errcode = '42501';
  end if;
  if existing_paper_revision_id is not null
    and (
      existing_paper_revision_id <> p_session->>'paperRevisionId'
      or existing_content_digest <> p_session->>'contentDigest'
    ) then
    raise exception 'practice_session_content_conflict' using errcode = '40001';
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
    paper_revision_id,
    content_digest,
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
    p_session->>'paperRevisionId',
    p_session->>'contentDigest',
    3,
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

revoke all on function public.save_practice_session(jsonb) from public, anon;
grant execute on function public.save_practice_session(jsonb) to authenticated;
