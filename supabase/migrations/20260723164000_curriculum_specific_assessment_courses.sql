alter table public.assessment_background_profiles
  drop constraint if exists assessment_background_profiles_schema_version_check;

alter table public.assessment_background_profiles
  add constraint assessment_background_profiles_schema_version_check
  check (schema_version in (1, 2));

create or replace function private.assessment_course_subject(p_course_id text)
returns text
language sql
immutable
strict
set search_path = ''
as $$
  select case
    when p_course_id in (
      'al-mathematics', 'ib-math-aa-sl', 'ib-math-ai-hl', 'ib-math-ai-sl',
      'ap-precalculus', 'ap-calculus-ab', 'ap-statistics', 'other-mathematics'
    ) then 'mathematics'
    when p_course_id in (
      'al-further-mathematics', 'ib-math-aa-hl', 'ap-calculus-bc',
      'other-advanced-mathematics'
    ) then 'further-mathematics'
    when p_course_id in (
      'al-english-language', 'ib-english-a-language-literature',
      'ap-english-language', 'other-english-language'
    ) then 'english-language'
    when p_course_id in (
      'al-english-literature', 'ib-english-a-literature',
      'ap-english-literature', 'other-english-literature'
    ) then 'english-literature'
    when p_course_id in (
      'al-physics', 'ib-physics', 'ap-physics-1', 'ap-physics-2',
      'ap-physics-c-mechanics', 'ap-physics-c-em', 'other-physics'
    ) then 'physics'
    when p_course_id in ('al-chemistry', 'ib-chemistry', 'ap-chemistry', 'other-chemistry') then 'chemistry'
    when p_course_id in ('al-biology', 'ib-biology', 'ap-biology', 'other-biology') then 'biology'
    when p_course_id in ('al-humanities', 'ib-humanities', 'ap-humanities', 'other-humanities') then 'humanities'
    when p_course_id in (
      'al-social-sciences', 'ib-social-sciences', 'ap-social-sciences',
      'other-social-sciences'
    ) then 'social-sciences'
    when p_course_id in ('al-other', 'ib-other', 'ap-other', 'other-subject') then 'other'
    else null
  end
$$;

revoke all on function private.assessment_course_subject(text) from public, anon, authenticated;

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
  requested_curriculum_id text;
  subject_count integer;
  unique_subject_count integer;
  course_count integer;
  unique_course_count integer;
  derived_subject_count integer;
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
  requested_curriculum_id := p_profile->>'curriculumId';
  source_guest_space_id := p_profile->>'guestSpaceId';

  if field_count <> 12
    or exists (
      select 1
      from jsonb_object_keys(p_profile) as field(key)
      where field.key not in (
        'schemaVersion', 'guestSpaceId', 'examId', 'entryCycle',
        'curriculumId', 'learningStage', 'subjectAreas', 'courseIds',
        'experience', 'weeklyTime', 'createdAt', 'updatedAt'
      )
    )
    or coalesce(p_profile->>'schemaVersion' <> '2', true)
    or coalesce(source_guest_space_id !~ '^gsp_[A-Za-z0-9_-]+$', true)
    or coalesce(requested_exam_id not in ('tara', 'lnat', 'ucat'), true)
    or coalesce(p_profile->>'entryCycle' not in ('2027', '2028'), true)
    or coalesce(requested_curriculum_id not in ('a-level', 'ib', 'ap', 'other'), true)
    or coalesce(p_profile->>'learningStage' not in (
      'year-11-or-below', 'year-12', 'year-13', 'gap-year', 'university'
    ), true)
    or coalesce(p_profile->>'experience' not in ('new', 'sampled', 'mocked', 'past-papers'), true)
    or coalesce(p_profile->>'weeklyTime' not in ('under-2', '2-4', '5-7', '8-plus'), true)
    or coalesce(jsonb_typeof(p_profile->'subjectAreas') <> 'array', true)
    or coalesce(jsonb_typeof(p_profile->'courseIds') <> 'array', true)
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

  select count(*), count(distinct course.value),
         count(distinct private.assessment_course_subject(course.value))
  into course_count, unique_course_count, derived_subject_count
  from jsonb_array_elements_text(p_profile->'courseIds') as course(value);

  if course_count < 1
    or course_count > 24
    or unique_course_count <> course_count
    or derived_subject_count <> subject_count
    or exists (
      select 1
      from jsonb_array_elements_text(p_profile->'courseIds') as course(value)
      where private.assessment_course_subject(course.value) is null
        or case requested_curriculum_id
          when 'a-level' then course.value not like 'al-%'
          when 'ib' then course.value not like 'ib-%'
          when 'ap' then course.value not like 'ap-%'
          when 'other' then course.value not like 'other-%'
          else true
        end
    )
    or exists (
      select 1
      from jsonb_array_elements_text(p_profile->'subjectAreas') as subject(value)
      where not exists (
        select 1
        from jsonb_array_elements_text(p_profile->'courseIds') as course(value)
        where private.assessment_course_subject(course.value) = subject.value
      )
    )
  then
    raise exception 'assessment_profile_courses_invalid' using errcode = '22023';
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
    2,
    p_profile
  )
  on conflict (learner_space_id, exam_id) do update
    set schema_version = excluded.schema_version,
        profile = excluded.profile,
        updated_at = now();

  return p_profile;
end;
$$;

revoke all on function public.save_assessment_background_profile(jsonb) from public, anon;
grant execute on function public.save_assessment_background_profile(jsonb) to authenticated;
