begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(14);

insert into auth.users (
  id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  (
    '55555555-5555-4555-8555-555555555555', 'authenticated', 'authenticated',
    'profile-alice@example.test', 'not-used', now(),
    '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now()
  ),
  (
    '66666666-6666-4666-8666-666666666666', 'authenticated', 'authenticated',
    'profile-bob@example.test', 'not-used', now(),
    '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now()
  );

select ok(
  not has_function_privilege('anon', 'public.save_assessment_background_profile(jsonb)', 'execute'),
  'anonymous visitors cannot write an account profile'
);
select ok(
  not has_table_privilege('authenticated', 'public.assessment_background_profiles', 'insert'),
  'students cannot bypass profile validation with direct inserts'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '55555555-5555-4555-8555-555555555555', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select lives_ok(
  $$
    select public.save_assessment_background_profile(
      jsonb_build_object(
        'schemaVersion', 1,
        'guestSpaceId', 'gsp_assessment_alice_01',
        'examId', 'ucat',
        'entryCycle', '2027',
        'curriculumId', 'a-level',
        'learningStage', 'year-12',
        'subjectAreas', jsonb_build_array('mathematics', 'biology'),
        'experience', 'sampled',
        'weeklyTime', '2-4',
        'createdAt', '2026-07-18T12:00:00.000Z',
        'updatedAt', '2026-07-18T12:00:00.000Z'
      )
    )
  $$,
  'Alice can save a validated UCAT background profile'
);
select lives_ok(
  $$
    select public.save_assessment_background_profile(
      jsonb_build_object(
        'schemaVersion', 1,
        'guestSpaceId', 'gsp_assessment_alice_01',
        'examId', 'tara',
        'entryCycle', '2027',
        'curriculumId', 'ib',
        'learningStage', 'year-12',
        'subjectAreas', jsonb_build_array('english-language'),
        'experience', 'new',
        'weeklyTime', 'under-2',
        'createdAt', '2026-07-18T12:00:00.000Z',
        'updatedAt', '2026-07-18T12:00:00.000Z'
      )
    )
  $$,
  'one learner can keep separate profiles for different exams'
);
select is(
  (select count(*) from public.assessment_background_profiles),
  2::bigint,
  'Alice can read exactly her two profiles'
);
select is(
  jsonb_array_length(public.export_my_learning_data()->'assessmentBackgroundProfiles'),
  2,
  'the student export includes all assessment background profiles'
);
select is(
  (public.export_my_learning_data()->>'schemaVersion')::integer,
  4,
  'the expanded export declares collaboration-aware schema version four'
);
select throws_ok(
  $$
    select public.save_assessment_background_profile(
      jsonb_build_object(
        'schemaVersion', 1, 'guestSpaceId', 'gsp_assessment_alice_01',
        'examId', 'ucat', 'entryCycle', '2027', 'curriculumId', 'ap',
        'learningStage', 'year-12', 'subjectAreas', jsonb_build_array('biology'),
        'experience', 'sampled', 'weeklyTime', '2-4',
        'createdAt', '2026-07-18T12:00:00.000Z',
        'updatedAt', '2026-07-18T12:00:00.000Z', 'unexpected', true
      )
    )
  $$,
  '22023',
  'assessment_profile_invalid',
  'unknown profile fields are rejected'
);
select throws_ok(
  $$
    select public.save_assessment_background_profile(
      jsonb_build_object(
        'schemaVersion', 1, 'guestSpaceId', 'gsp_assessment_alice_01',
        'examId', 'ucat', 'entryCycle', '2027', 'curriculumId', 'ap',
        'learningStage', 'year-12',
        'subjectAreas', jsonb_build_array('biology', 'biology'),
        'experience', 'sampled', 'weeklyTime', '2-4',
        'createdAt', '2026-07-18T12:00:00.000Z',
        'updatedAt', '2026-07-18T12:00:00.000Z'
      )
    )
  $$,
  '22023',
  'assessment_profile_subjects_invalid',
  'duplicate subjects are rejected'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '66666666-6666-4666-8666-666666666666', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
select is(
  (select count(*) from public.assessment_background_profiles),
  0::bigint,
  'Bob cannot read Alice profiles'
);
select lives_ok(
  $$
    select public.save_assessment_background_profile(
      jsonb_build_object(
        'schemaVersion', 1, 'guestSpaceId', 'gsp_assessment_bob_01',
        'examId', 'ucat', 'entryCycle', '2028', 'curriculumId', 'other',
        'learningStage', 'gap-year', 'subjectAreas', jsonb_build_array('other'),
        'experience', 'mocked', 'weeklyTime', '5-7',
        'createdAt', '2026-07-18T12:00:00.000Z',
        'updatedAt', '2026-07-18T12:00:00.000Z'
      )
    )
  $$,
  'Bob can save a profile into his own learner space'
);
select is(
  (select count(*) from public.assessment_background_profiles),
  1::bigint,
  'Bob reads only his own profile after saving'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '55555555-5555-4555-8555-555555555555', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
select lives_ok(
  $$ select public.delete_assessment_background_profile('tara') $$,
  'Alice can delete one of her own exam profiles'
);
select is(
  (select count(*) from public.assessment_background_profiles),
  1::bigint,
  'deleting TARA leaves Alice UCAT profile intact'
);

select * from finish();
rollback;
