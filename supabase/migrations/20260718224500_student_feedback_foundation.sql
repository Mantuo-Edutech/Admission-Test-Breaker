create table public.student_feedback (
  id uuid primary key default gen_random_uuid(),
  reporter_user_id uuid not null references public.app_users(auth_user_id) on delete cascade,
  category text not null check (
    category in (
      'content_error',
      'technical_problem',
      'account_access',
      'privacy_security',
      'feature_request',
      'other'
    )
  ),
  priority text not null check (priority in ('P1', 'P2', 'P3', 'P4')),
  exam_id text check (exam_id in ('tmua', 'esat', 'tara', 'lnat', 'ucat')),
  route text not null,
  resource_id text,
  question_id text,
  message text not null,
  status text not null default 'new' check (
    status in ('new', 'triaged', 'in_progress', 'resolved', 'closed')
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  resolved_at timestamptz,
  check (char_length(route) between 1 and 320),
  check (char_length(message) between 10 and 2000),
  check (resource_id is null or char_length(resource_id) between 1 and 160),
  check (question_id is null or char_length(question_id) between 1 and 160),
  check (
    (status in ('resolved', 'closed') and resolved_at is not null)
    or (status not in ('resolved', 'closed') and resolved_at is null)
  )
);

create index student_feedback_reporter_created_idx
  on public.student_feedback(reporter_user_id, created_at desc);
create index student_feedback_operations_queue_idx
  on public.student_feedback(status, priority, created_at);

alter table public.student_feedback enable row level security;

create policy student_feedback_select_own
on public.student_feedback
for select
to authenticated
using (reporter_user_id = (select auth.uid()));

revoke all on table public.student_feedback from public, anon, authenticated;
grant select on table public.student_feedback to authenticated;
grant select on table public.student_feedback to service_role;

create table private.student_feedback_events (
  id bigint generated always as identity primary key,
  feedback_id uuid not null references public.student_feedback(id) on delete cascade,
  event_type text not null check (event_type in ('submitted', 'triaged', 'status_changed')),
  actor_user_id uuid,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index student_feedback_events_feedback_idx
  on private.student_feedback_events(feedback_id, created_at);

revoke all on table private.student_feedback_events from public, anon, authenticated;
grant select on table private.student_feedback_events to service_role;

create or replace function public.submit_student_feedback(
  p_category text,
  p_exam_id text,
  p_route text,
  p_resource_id text,
  p_question_id text,
  p_message text
)
returns table (
  feedback_id uuid,
  priority text,
  status text,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  normalized_message text := btrim(p_message);
  normalized_route text := btrim(p_route);
  normalized_resource_id text := nullif(lower(btrim(p_resource_id)), '');
  normalized_question_id text := nullif(lower(btrim(p_question_id)), '');
  assigned_priority text;
  existing_feedback public.student_feedback%rowtype;
  inserted_feedback public.student_feedback%rowtype;
begin
  if current_user_id is null then
    raise exception 'authentication_required' using errcode = '42501';
  end if;

  if p_category is null or p_category not in (
    'content_error',
    'technical_problem',
    'account_access',
    'privacy_security',
    'feature_request',
    'other'
  ) then
    raise exception 'invalid_feedback_category' using errcode = '22023';
  end if;

  if p_exam_id is not null and p_exam_id not in ('tmua', 'esat', 'tara', 'lnat', 'ucat') then
    raise exception 'invalid_exam_id' using errcode = '22023';
  end if;

  if normalized_route is null
    or char_length(normalized_route) > 320
    or normalized_route !~ '^/[A-Za-z0-9_./-]*$'
  then
    raise exception 'invalid_feedback_route' using errcode = '22023';
  end if;

  if normalized_resource_id is not null and (
    char_length(normalized_resource_id) > 160
    or normalized_resource_id !~ '^[a-z0-9]+(?:[._-][a-z0-9]+)*$'
  ) then
    raise exception 'invalid_feedback_resource_id' using errcode = '22023';
  end if;

  if normalized_question_id is not null and (
    char_length(normalized_question_id) > 160
    or normalized_question_id !~ '^[a-z0-9]+(?:[._-][a-z0-9]+)*$'
  ) then
    raise exception 'invalid_feedback_question_id' using errcode = '22023';
  end if;

  if normalized_message is null or char_length(normalized_message) not between 10 and 2000 then
    raise exception 'invalid_feedback_message_length' using errcode = '22023';
  end if;

  if normalized_message ~* '[[:alnum:]._%+-]+@[[:alnum:].-]+\.[[:alpha:]]{2,}'
    or normalized_message ~ '(^|[^0-9])1[3-9][0-9]{9}([^0-9]|$)'
  then
    raise exception 'feedback_message_contains_contact_details' using errcode = '22023';
  end if;

  assigned_priority := case
    when p_category = 'privacy_security' then 'P1'
    when p_category in ('account_access', 'content_error') then 'P2'
    when p_category = 'technical_problem'
      and normalized_route ~ '^/(practice|results|account|access|register|login|auth)(/|$)'
      then 'P2'
    when p_category in ('technical_problem', 'other') then 'P3'
    else 'P4'
  end;

  select feedback.*
  into existing_feedback
  from public.student_feedback as feedback
  where feedback.reporter_user_id = current_user_id
    and feedback.category = p_category
    and feedback.exam_id is not distinct from p_exam_id
    and feedback.route = normalized_route
    and feedback.resource_id is not distinct from normalized_resource_id
    and feedback.question_id is not distinct from normalized_question_id
    and feedback.message = normalized_message
    and feedback.status <> 'closed'
    and feedback.created_at >= now() - interval '24 hours'
  order by feedback.created_at desc
  limit 1;

  if found then
    return query
      select existing_feedback.id, existing_feedback.priority, existing_feedback.status, existing_feedback.created_at;
    return;
  end if;

  insert into public.student_feedback (
    reporter_user_id,
    category,
    priority,
    exam_id,
    route,
    resource_id,
    question_id,
    message
  ) values (
    current_user_id,
    p_category,
    assigned_priority,
    p_exam_id,
    normalized_route,
    normalized_resource_id,
    normalized_question_id,
    normalized_message
  )
  returning * into inserted_feedback;

  insert into private.student_feedback_events (
    feedback_id,
    event_type,
    actor_user_id,
    details
  ) values (
    inserted_feedback.id,
    'submitted',
    current_user_id,
    jsonb_build_object(
      'category', inserted_feedback.category,
      'priority', inserted_feedback.priority,
      'route', inserted_feedback.route
    )
  );

  return query
    select inserted_feedback.id, inserted_feedback.priority, inserted_feedback.status, inserted_feedback.created_at;
end;
$$;

create or replace function public.triage_student_feedback(
  p_feedback_id uuid,
  p_status text,
  p_internal_note text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  previous_status text;
begin
  if coalesce(
      current_setting('request.jwt.claim.role', true),
      nullif(current_setting('request.jwt.claims', true), '')::jsonb->>'role',
      ''
    ) <> 'service_role'
    and current_user <> 'service_role'
  then
    raise exception 'service_role_required' using errcode = '42501';
  end if;

  if p_status not in ('triaged', 'in_progress', 'resolved', 'closed') then
    raise exception 'invalid_feedback_status' using errcode = '22023';
  end if;

  if p_internal_note is not null and char_length(btrim(p_internal_note)) > 2000 then
    raise exception 'internal_note_too_long' using errcode = '22023';
  end if;

  select feedback.status
  into previous_status
  from public.student_feedback as feedback
  where feedback.id = p_feedback_id
  for update;

  if not found then
    raise exception 'feedback_not_found' using errcode = '22023';
  end if;

  update public.student_feedback as feedback
  set status = p_status,
      updated_at = now(),
      resolved_at = case when p_status in ('resolved', 'closed') then now() else null end
  where feedback.id = p_feedback_id;

  insert into private.student_feedback_events (
    feedback_id,
    event_type,
    details
  ) values (
    p_feedback_id,
    case when previous_status = 'new' and p_status = 'triaged' then 'triaged' else 'status_changed' end,
    jsonb_strip_nulls(jsonb_build_object(
      'from', previous_status,
      'to', p_status,
      'internalNote', nullif(btrim(p_internal_note), '')
    ))
  );
end;
$$;

revoke all on function public.submit_student_feedback(text, text, text, text, text, text)
  from public, anon;
grant execute on function public.submit_student_feedback(text, text, text, text, text, text)
  to authenticated;

revoke all on function public.triage_student_feedback(uuid, text, text)
  from public, anon, authenticated;
grant execute on function public.triage_student_feedback(uuid, text, text)
  to service_role;

create or replace function public.export_my_learning_data()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  current_learner_space_id text;
  current_platform_user_id text;
  current_email text;
  result jsonb;
begin
  if current_user_id is null then
    raise exception 'authentication_required' using errcode = '42501';
  end if;

  select
    learner_space.id,
    app_user.platform_user_id,
    auth_user.email
  into
    current_learner_space_id,
    current_platform_user_id,
    current_email
  from public.learner_spaces as learner_space
  join public.app_users as app_user
    on app_user.auth_user_id = learner_space.owner_user_id
  join auth.users as auth_user
    on auth_user.id = app_user.auth_user_id
  where learner_space.owner_user_id = current_user_id;

  if current_learner_space_id is null then
    raise exception 'learner_space_not_found' using errcode = '42501';
  end if;

  select jsonb_build_object(
    'schemaVersion', 2,
    'exportedAt', to_jsonb(now()),
    'account', jsonb_build_object(
      'email', current_email,
      'platformUserId', current_platform_user_id,
      'learnerSpaceId', current_learner_space_id
    ),
    'preparationProfile', (
      select profile.profile
      from public.preparation_profiles as profile
      where profile.learner_space_id = current_learner_space_id
    ),
    'practiceSessions', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'snapshot', session.snapshot,
          'createdAt', session.created_at,
          'updatedAt', session.updated_at,
          'events', coalesce((
            select jsonb_agg(
              jsonb_build_object(
                'id', event.id,
                'sequence', event.sequence,
                'schemaVersion', event.schema_version,
                'type', event.event_type,
                'actor', event.actor,
                'occurredAt', event.occurred_at,
                'receivedAt', event.received_at,
                'payload', event.payload
              ) order by event.sequence
            )
            from public.learning_events as event
            where event.session_id = session.id
              and event.learner_space_id = current_learner_space_id
          ), '[]'::jsonb)
        ) order by session.started_at
      )
      from public.practice_sessions as session
      where session.learner_space_id = current_learner_space_id
    ), '[]'::jsonb),
    'contentEntitlements', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'packageId', entitlement.package_id,
          'source', entitlement.source,
          'grantedAt', entitlement.granted_at,
          'expiresAt', entitlement.expires_at,
          'revokedAt', entitlement.revoked_at
        ) order by entitlement.granted_at
      )
      from public.user_entitlements as entitlement
      where entitlement.user_id = current_user_id
    ), '[]'::jsonb),
    'feedback', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', feedback.id,
          'category', feedback.category,
          'priority', feedback.priority,
          'examId', feedback.exam_id,
          'route', feedback.route,
          'resourceId', feedback.resource_id,
          'questionId', feedback.question_id,
          'message', feedback.message,
          'status', feedback.status,
          'createdAt', feedback.created_at,
          'updatedAt', feedback.updated_at,
          'resolvedAt', feedback.resolved_at
        ) order by feedback.created_at
      )
      from public.student_feedback as feedback
      where feedback.reporter_user_id = current_user_id
    ), '[]'::jsonb)
  ) into result;

  return result;
end;
$$;

revoke all on function public.export_my_learning_data() from public, anon;
grant execute on function public.export_my_learning_data() to authenticated;
