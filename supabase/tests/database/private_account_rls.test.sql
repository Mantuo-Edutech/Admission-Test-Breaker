begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(26);

insert into auth.users (
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
) values
  (
    '11111111-1111-4111-8111-111111111111',
    'authenticated',
    'authenticated',
    'alice@example.test',
    'not-used',
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    now(),
    now()
  ),
  (
    '22222222-2222-4222-8222-222222222222',
    'authenticated',
    'authenticated',
    'bob@example.test',
    'not-used',
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    now(),
    now()
  );

select is((select count(*) from public.app_users), 2::bigint, 'auth trigger creates two platform users');
select is((select count(*) from public.learner_spaces), 2::bigint, 'auth trigger creates one learner space per user');

insert into public.preparation_profiles (learner_space_id, profile)
select learner_space.id, jsonb_build_object('owner', app_user.platform_user_id)
from public.learner_spaces as learner_space
join public.app_users as app_user on app_user.auth_user_id = learner_space.owner_user_id;

create temporary table test_tenant_ids (
  alice_space_id text not null,
  bob_space_id text not null
) on commit drop;
insert into test_tenant_ids (alice_space_id, bob_space_id)
select
  max(id) filter (where owner_user_id = '11111111-1111-4111-8111-111111111111'),
  max(id) filter (where owner_user_id = '22222222-2222-4222-8222-222222222222')
from public.learner_spaces;
grant select on test_tenant_ids to authenticated;

insert into public.content_resources (
  id,
  exam,
  kind,
  title,
  access_tier,
  publication_status,
  published_at
) values (
  'tmua-launch-mock-test',
  'TMUA',
  'mock_paper',
  'TMUA Launch Mock Test',
  'entitled',
  'published',
  now()
);

insert into public.access_package_resources (package_id, resource_id)
values ('tmua-full-access', 'tmua-launch-mock-test');

insert into private.invite_codes (
  code_digest,
  label,
  max_redemptions,
  expires_at,
  entitlement_duration
) values (
  private.invite_code_digest('MANTUO-TMUA-ONE-USE-2026-ACCESS'),
  'One use database test',
  1,
  now() + interval '1 hour',
  interval '30 days'
);

insert into private.invite_packages (invite_id, package_id)
select invite.id, 'tmua-full-access'
from private.invite_codes as invite
where invite.code_digest = private.invite_code_digest('MANTUO-TMUA-ONE-USE-2026-ACCESS');

set local role anon;
select is((select count(*) from public.content_resources), 1::bigint, 'anonymous users see only public published content');
reset role;

select ok(
  not has_function_privilege('anon', 'public.redeem_invite(text)', 'execute'),
  'anonymous users cannot redeem invite codes'
);
select ok(
  not has_function_privilege('authenticated', 'public.issue_invite(text,text[],integer,timestamptz,interval)', 'execute'),
  'students cannot issue invite codes'
);
select ok(
  not has_table_privilege('authenticated', 'private.invite_codes', 'select'),
  'students cannot read invite digests'
);
select ok(
  not has_table_privilege('authenticated', 'public.learning_events', 'update'),
  'learning events are append-only for students'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '11111111-1111-4111-8111-111111111111', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select is((select count(*) from public.app_users), 1::bigint, 'Alice sees only her platform user');
select is((select count(*) from public.learner_spaces), 1::bigint, 'Alice sees only her learner space');
select is((select count(*) from public.preparation_profiles), 1::bigint, 'Alice sees only her preparation profile');
select is((select count(*) from public.content_resources), 1::bigint, 'Alice cannot see entitled content before redemption');

select throws_ok(
  $$
    insert into public.preparation_profiles (learner_space_id, profile)
    select bob_space_id, '{"crossTenant":true}'::jsonb
    from test_tenant_ids
  $$,
  '42501',
  'new row violates row-level security policy for table "preparation_profiles"',
  'Alice cannot insert a profile for a known Bob learner-space ID'
);

select lives_ok(
  $$select * from public.redeem_invite('MANTUO-TMUA-ONE-USE-2026-ACCESS')$$,
  'Alice can redeem a valid invite'
);
select is((select count(*) from public.user_entitlements), 1::bigint, 'Alice sees her granted entitlement');
select is((select count(*) from public.content_resources), 2::bigint, 'Alice sees entitled content after redemption');
select is(
  (select count(*) from public.redeem_invite('MANTUO-TMUA-ONE-USE-2026-ACCESS')),
  1::bigint,
  'repeating Alice redemption is idempotent'
);

select lives_ok(
  $$
    insert into public.practice_sessions (
      id,
      learner_space_id,
      paper_id,
      schema_version,
      status,
      snapshot,
      started_at,
      deadline_at
    )
    select
      'ses_alice_test',
      id,
      'tmua-2023-p1',
      2,
      'active',
      '{}'::jsonb,
      '2026-07-15T00:00:00Z'::timestamptz,
      '2026-07-15T01:15:00Z'::timestamptz
    from public.learner_spaces
  $$,
  'Alice can create a session only in her learner space'
);

select lives_ok(
  $$
    insert into public.learning_events (
      id,
      learner_space_id,
      session_id,
      sequence,
      event_type,
      actor,
      occurred_at,
      payload
    )
    select
      'evt_alice_1',
      session.learner_space_id,
      session.id,
      1,
      'session_started',
      jsonb_build_object('kind', 'student', 'userId', app_user.platform_user_id),
      '2026-07-15T00:00:00Z'::timestamptz,
      '{"paperId":"tmua-2023-p1"}'::jsonb
    from public.practice_sessions as session
    join public.app_users as app_user on app_user.auth_user_id = '11111111-1111-4111-8111-111111111111'
    where session.id = 'ses_alice_test'
  $$,
  'Alice can append a correctly attributed first event'
);

select throws_ok(
  $$
    insert into public.learning_events (
      id, learner_space_id, session_id, sequence, event_type, actor, occurred_at, payload
    )
    select
      'evt_alice_3', learner_space_id, id, 3, 'question_viewed',
      jsonb_build_object(
        'kind', 'student',
        'userId', (select platform_user_id from public.app_users)
      ),
      '2026-07-15T00:01:00Z'::timestamptz,
      '{"questionId":"tmua-2023-p1-q01"}'::jsonb
    from public.practice_sessions where id = 'ses_alice_test'
  $$,
  '23514',
  'learning_event_sequence_invalid',
  'event sequence gaps are rejected'
);

select throws_ok(
  $$
    insert into public.learning_events (
      id, learner_space_id, session_id, sequence, event_type, actor, occurred_at, payload
    )
    select
      'evt_alice_spoof', learner_space_id, id, 2, 'question_viewed',
      '{"kind":"student","userId":"usr_spoofed"}'::jsonb,
      '2026-07-15T00:01:00Z'::timestamptz,
      '{"questionId":"tmua-2023-p1-q01"}'::jsonb
    from public.practice_sessions where id = 'ses_alice_test'
  $$,
  '42501',
  'learning_event_actor_invalid',
  'event actor spoofing is rejected'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '22222222-2222-4222-8222-222222222222', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select is((select count(*) from public.learner_spaces), 1::bigint, 'Bob sees only his learner space');
select is((select count(*) from public.preparation_profiles), 1::bigint, 'Bob sees only his preparation profile');
select is((select count(*) from public.practice_sessions), 0::bigint, 'Bob cannot see Alice practice sessions');
select is((select count(*) from public.learning_events), 0::bigint, 'Bob cannot see Alice learning events');
select is((select count(*) from public.content_resources), 1::bigint, 'Bob still sees only public content');

select throws_ok(
  $$select * from public.redeem_invite('MANTUO-TMUA-ONE-USE-2026-ACCESS')$$,
  '22023',
  'invite_code_exhausted',
  'a one-use invite cannot be redeemed by Bob after Alice'
);

reset role;

select * from finish();
rollback;
