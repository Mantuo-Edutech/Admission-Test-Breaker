create table public.assessment_background_profiles (
  learner_space_id text not null
    references public.learner_spaces (id) on delete cascade,
  exam_id text not null check (exam_id in ('tara', 'lnat', 'ucat')),
  schema_version smallint not null check (schema_version = 1),
  profile jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (learner_space_id, exam_id),
  check (jsonb_typeof(profile) = 'object'),
  check (octet_length(profile::text) <= 32768)
);

alter table public.assessment_background_profiles enable row level security;
alter table public.assessment_background_profiles force row level security;

create policy assessment_background_profiles_select_owner
on public.assessment_background_profiles
for select
to authenticated
using (
  exists (
    select 1
    from public.learner_spaces as learner_space
    where learner_space.id = assessment_background_profiles.learner_space_id
      and learner_space.owner_user_id = (select auth.uid())
      and learner_space.status = 'active'
  )
);

revoke all on table public.assessment_background_profiles from public, anon, authenticated;
grant select on table public.assessment_background_profiles to authenticated;
grant select on table public.assessment_background_profiles to service_role;

create or replace function public.save_assessment_background_profile(p_profile jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  current_learner_space_id text;
  source_guest_space_id text;
  requested_exam_id text;
  subject_count integer;
  unique_subject_count integer;
  field_count integer;
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
    or octet_length(p_profile::text) > 32768
  then
    raise exception 'assessment_profile_invalid' using errcode = '22023';
  end if;

  select count(*) into field_count from jsonb_object_keys(p_profile);
  requested_exam_id := p_profile->>'examId';
  source_guest_space_id := p_profile->>'guestSpaceId';

  if field_count <> 11
    or exists (
      select 1
      from jsonb_object_keys(p_profile) as field(key)
      where field.key not in (
        'schemaVersion', 'guestSpaceId', 'examId', 'entryCycle',
        'curriculumId', 'learningStage', 'subjectAreas', 'experience',
        'weeklyTime', 'createdAt', 'updatedAt'
      )
    )
    or coalesce(p_profile->>'schemaVersion' <> '1', true)
    or coalesce(source_guest_space_id !~ '^gsp_[A-Za-z0-9_-]+$', true)
    or coalesce(requested_exam_id not in ('tara', 'lnat', 'ucat'), true)
    or coalesce(p_profile->>'entryCycle' not in ('2027', '2028'), true)
    or coalesce(p_profile->>'curriculumId' not in ('a-level', 'ib', 'ap', 'other'), true)
    or coalesce(p_profile->>'learningStage' not in (
      'year-11-or-below', 'year-12', 'year-13', 'gap-year', 'university'
    ), true)
    or coalesce(p_profile->>'experience' not in ('new', 'sampled', 'mocked', 'past-papers'), true)
    or coalesce(p_profile->>'weeklyTime' not in ('under-2', '2-4', '5-7', '8-plus'), true)
    or coalesce(jsonb_typeof(p_profile->'subjectAreas') <> 'array', true)
    or coalesce(p_profile->>'createdAt', '') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\.[0-9]{3}Z$'
    or coalesce(p_profile->>'updatedAt', '') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\.[0-9]{3}Z$'
  then
    raise exception 'assessment_profile_invalid' using errcode = '22023';
  end if;

  select count(*), count(distinct subject.value)
  into subject_count, unique_subject_count
  from jsonb_array_elements_text(p_profile->'subjectAreas') as subject(value);

  if subject_count < 1
    or subject_count > 10
    or unique_subject_count <> subject_count
    or exists (
      select 1
      from jsonb_array_elements_text(p_profile->'subjectAreas') as subject(value)
      where subject.value not in (
        'mathematics', 'further-mathematics', 'english-language',
        'english-literature', 'physics', 'chemistry', 'biology',
        'humanities', 'social-sciences', 'other'
      )
    )
  then
    raise exception 'assessment_profile_subjects_invalid' using errcode = '22023';
  end if;

  begin
    perform (p_profile->>'createdAt')::timestamptz;
    perform (p_profile->>'updatedAt')::timestamptz;
    if (p_profile->>'updatedAt')::timestamptz < (p_profile->>'createdAt')::timestamptz then
      raise exception 'assessment_profile_timestamp_order_invalid' using errcode = '22023';
    end if;
  exception
    when invalid_text_representation or datetime_field_overflow then
      raise exception 'assessment_profile_timestamp_invalid' using errcode = '22023';
  end;

  perform private.register_guest_space_claim(
    source_guest_space_id,
    current_learner_space_id,
    current_user_id
  );

  insert into public.assessment_background_profiles (
    learner_space_id,
    exam_id,
    schema_version,
    profile
  ) values (
    current_learner_space_id,
    requested_exam_id,
    1,
    p_profile
  )
  on conflict (learner_space_id, exam_id) do update
    set schema_version = excluded.schema_version,
        profile = excluded.profile,
        updated_at = now();

  return p_profile;
end;
$$;

create or replace function public.delete_assessment_background_profile(p_exam_id text)
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

  if p_exam_id not in ('tara', 'lnat', 'ucat') then
    raise exception 'assessment_profile_exam_invalid' using errcode = '22023';
  end if;

  delete from public.assessment_background_profiles as profile
  using public.learner_spaces as learner_space
  where profile.learner_space_id = learner_space.id
    and profile.exam_id = p_exam_id
    and learner_space.owner_user_id = current_user_id;
end;
$$;

revoke all on function public.save_assessment_background_profile(jsonb) from public, anon;
grant execute on function public.save_assessment_background_profile(jsonb) to authenticated;
revoke all on function public.delete_assessment_background_profile(text) from public, anon;
grant execute on function public.delete_assessment_background_profile(text) to authenticated;

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

  select learner_space.id, app_user.platform_user_id, auth_user.email
  into current_learner_space_id, current_platform_user_id, current_email
  from public.learner_spaces as learner_space
  join public.app_users as app_user on app_user.auth_user_id = learner_space.owner_user_id
  join auth.users as auth_user on auth_user.id = app_user.auth_user_id
  where learner_space.owner_user_id = current_user_id;

  if current_learner_space_id is null then
    raise exception 'learner_space_not_found' using errcode = '42501';
  end if;

  select jsonb_build_object(
    'schemaVersion', 3,
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
    'assessmentBackgroundProfiles', coalesce((
      select jsonb_agg(profile.profile order by profile.exam_id)
      from public.assessment_background_profiles as profile
      where profile.learner_space_id = current_learner_space_id
    ), '[]'::jsonb),
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
