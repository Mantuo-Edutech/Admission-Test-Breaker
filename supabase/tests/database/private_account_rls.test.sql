begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(51);

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

select is(
  (
    select count(*)
    from public.app_users
    where auth_user_id in (
      '11111111-1111-4111-8111-111111111111',
      '22222222-2222-4222-8222-222222222222'
    )
  ),
  2::bigint,
  'auth trigger creates two platform users'
);
select is(
  (
    select count(*)
    from public.learner_spaces
    where owner_user_id in (
      '11111111-1111-4111-8111-111111111111',
      '22222222-2222-4222-8222-222222222222'
    )
  ),
  2::bigint,
  'auth trigger creates one learner space per user'
);

insert into public.preparation_profiles (learner_space_id, profile)
select learner_space.id, jsonb_build_object('owner', app_user.platform_user_id)
from public.learner_spaces as learner_space
join public.app_users as app_user on app_user.auth_user_id = learner_space.owner_user_id
where app_user.auth_user_id in (
  '11111111-1111-4111-8111-111111111111',
  '22222222-2222-4222-8222-222222222222'
);

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

create or replace function pg_temp.guest_session(p_second_sequence integer default null)
returns jsonb
language sql
immutable
as $$
  select jsonb_build_object(
    'schemaVersion', 3,
    'id', 'ses_alice_test',
    'learningSpaceId', 'gsp_alice_browser',
    'startedBy', jsonb_build_object('kind', 'guest', 'actorId', 'guest_alice_browser'),
    'paperId', 'tmua-2023-p1',
    'paperRevisionId', 'tmua-2023-p1-r1',
    'contentDigest', 'ad52e7968d9cc8459289f22d8239cd2e981d470e40ec2c14270a7d10e540caba',
    'status', 'active',
    'startedAt', '2026-07-15T00:00:00.000Z',
    'deadlineAt', '2026-07-15T01:15:00.000Z',
    'currentQuestion', 1,
    'answers', '{}'::jsonb,
    'markedQuestionIds', '[]'::jsonb,
    'timingByQuestionMs', '{}'::jsonb,
    'activeQuestionEnteredAt', '2026-07-15T00:00:00.000Z',
    'events', jsonb_build_array(
      jsonb_build_object(
        'id', 'evt_alice_1',
        'schemaVersion', 1,
        'learningSpaceId', 'gsp_alice_browser',
        'sessionId', 'ses_alice_test',
        'sequence', 1,
        'type', 'session_started',
        'actor', jsonb_build_object('kind', 'guest', 'actorId', 'guest_alice_browser'),
        'occurredAt', '2026-07-15T00:00:00.000Z',
        'payload', jsonb_build_object(
          'paperId', 'tmua-2023-p1',
          'deadlineAt', '2026-07-15T01:15:00.000Z'
        )
      )
    ) || case when p_second_sequence is null then '[]'::jsonb else jsonb_build_array(
      jsonb_build_object(
        'id', 'evt_alice_2',
        'schemaVersion', 1,
        'learningSpaceId', 'gsp_alice_browser',
        'sessionId', 'ses_alice_test',
        'sequence', p_second_sequence,
        'type', 'question_viewed',
        'actor', jsonb_build_object('kind', 'guest', 'actorId', 'guest_alice_browser'),
        'occurredAt', '2026-07-15T00:01:00.000Z',
        'payload', jsonb_build_object('questionId', 'tmua-2023-p1-q01')
      )
    ) end
  );
$$;

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
select is(
  (select count(*) from public.practice_content_revisions),
  44::bigint,
  'anonymous users can read only immutable published practice revision metadata'
);
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
select ok(
  not has_table_privilege('authenticated', 'public.practice_content_revisions', 'insert'),
  'students cannot publish or mutate practice revisions'
);
select ok(
  not has_function_privilege('anon', 'public.export_my_learning_data()', 'execute'),
  'anonymous users cannot export account data'
);
select ok(
  not has_function_privilege('anon', 'public.delete_my_account()', 'execute'),
  'anonymous users cannot delete accounts'
);
select ok(
  not has_function_privilege('anon', 'public.get_entitled_content_resource(text)', 'execute'),
  'anonymous users cannot call entitled content delivery'
);
select ok(
  not has_table_privilege('authenticated', 'public.content_resource_payloads', 'select'),
  'students cannot bypass delivery by selecting private payload rows'
);

set local role service_role;
select lives_ok(
  $$select * from public.issue_invite('Published package test', array['tmua-full-access'], 1)$$,
  'service role can issue an invite for a package with published entitled content'
);
select throws_ok(
  $$select * from public.issue_invite('Draft-only package test', array['esat-deep-review'], 1)$$,
  '22023',
  'invite_package_unpublished',
  'service role cannot issue an invite for a draft-only package'
);
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', '11111111-1111-4111-8111-111111111111', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select is((select count(*) from public.app_users), 1::bigint, 'Alice sees only her platform user');
select is((select count(*) from public.learner_spaces), 1::bigint, 'Alice sees only her learner space');
select is((select count(*) from public.preparation_profiles), 1::bigint, 'Alice sees only her preparation profile');
select is((select count(*) from public.content_resources), 1::bigint, 'Alice cannot see entitled content before redemption');
select is(
  (select count(*) from public.get_entitled_content_resource('tmua-six-week-review-plan-v1')),
  0::bigint,
  'Alice cannot retrieve the private review plan before redemption'
);
select is(
  (select count(*) from public.get_entitled_content_resource('tmua-specimen-p1-worked-explanations-v1')),
  0::bigint,
  'Alice cannot retrieve the private worked review before redemption'
);

select ok(
  not has_table_privilege('authenticated', 'public.preparation_profiles', 'insert'),
  'students cannot bypass the profile RPC with a direct insert'
);

select lives_ok(
  $$select * from public.redeem_invite('MANTUO-TMUA-ONE-USE-2026-ACCESS')$$,
  'Alice can redeem a valid invite'
);
select is((select count(*) from public.user_entitlements), 1::bigint, 'Alice sees her granted entitlement');
select is((select count(*) from public.content_resources), 4::bigint, 'Alice sees all package-bound content after redemption');
select is(
  (
    select jsonb_array_length(payload->'weeklyPlan')
    from public.get_entitled_content_resource('tmua-six-week-review-plan-v1')
  ),
  6,
  'Alice receives the complete six-week structured plan after redemption'
);
select is(
  (
    select jsonb_array_length(payload->'explanations')
    from public.get_entitled_content_resource('tmua-specimen-p1-worked-explanations-v1')
  ),
  20,
  'Alice receives all 20 worked explanations after redemption'
);
select is(
  (select count(*) from public.redeem_invite('MANTUO-TMUA-ONE-USE-2026-ACCESS')),
  1::bigint,
  'repeating Alice redemption is idempotent'
);

select lives_ok(
  $$select public.save_practice_session(pg_temp.guest_session())$$,
  'Alice can atomically claim a Guest session into her learner space'
);
select is(
  (
    select paper_revision_id || ':' || content_digest
    from public.practice_sessions
    where id = 'ses_alice_test'
  ),
  'tmua-2023-p1-r1:ad52e7968d9cc8459289f22d8239cd2e981d470e40ec2c14270a7d10e540caba',
  'the durable session pins the exact published revision and digest'
);

select throws_ok(
  $$
    select public.save_practice_session(
      jsonb_set(
        pg_temp.guest_session(),
        '{contentDigest}',
        to_jsonb(repeat('0', 64))
      )
    )
  $$,
  '22023',
  'practice_content_revision_invalid',
  'the server rejects a forged content digest'
);

reset role;
set local role service_role;
insert into public.practice_content_revisions (
  paper_revision_id, paper_id, revision, exam, schema_version,
  content_digest, question_count, duration_minutes, published_at
) values (
  'tmua-2023-p1-r2', 'tmua-2023-p1', 2, 'TMUA', 1,
  repeat('b', 64), 20, 75, now()
);
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '11111111-1111-4111-8111-111111111111', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select throws_ok(
  $$
    select public.save_practice_session(
      jsonb_set(
        jsonb_set(
          pg_temp.guest_session(),
          '{paperRevisionId}',
          '"tmua-2023-p1-r2"'::jsonb
        ),
        '{contentDigest}',
        to_jsonb(repeat('b', 64))
      )
    )
  $$,
  '40001',
  'practice_session_content_conflict',
  'a later valid publication cannot silently move an existing session'
);

select lives_ok(
  $$select public.save_practice_session(pg_temp.guest_session(2))$$,
  'repeating a save appends only the new consecutive event'
);

select lives_ok(
  $$select public.save_practice_session(pg_temp.guest_session(2))$$,
  'replaying the same session and events is idempotent'
);
select is(
  public.export_my_learning_data()->'account'->>'email',
  'alice@example.test',
  'Alice export identifies only the authenticated account'
);
select is(
  jsonb_array_length(public.export_my_learning_data()->'practiceSessions'),
  1,
  'Alice export contains her one idempotently saved practice session'
);

select throws_ok(
  $$select public.save_practice_session(pg_temp.guest_session(3))$$,
  '22023',
  'learning_events_invalid',
  'the transactional save rejects event sequence gaps'
);

select throws_ok(
  $$
    select public.save_practice_session(
      jsonb_set(
        snapshot,
        '{startedBy}',
        '{"kind":"student","userId":"usr_spoofed"}'::jsonb
      )
    )
    from public.practice_sessions where id = 'ses_alice_test'
  $$,
  '42501',
  'practice_session_actor_invalid',
  'the transactional save rejects actor spoofing'
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
select is(
  (select count(*) from public.get_entitled_content_resource('tmua-six-week-review-plan-v1')),
  0::bigint,
  'Bob cannot retrieve Alice entitled review plan'
);

select throws_ok(
  $$select public.save_practice_session(pg_temp.guest_session(2))$$,
  '42501',
  'guest_space_already_claimed',
  'Bob cannot claim the Guest Space already bound to Alice'
);

select throws_ok(
  $$select * from public.redeem_invite('MANTUO-TMUA-ONE-USE-2026-ACCESS')$$,
  '22023',
  'invite_code_exhausted',
  'a one-use invite cannot be redeemed by Bob after Alice'
);

select is(
  jsonb_array_length(public.export_my_learning_data()->'practiceSessions'),
  0,
  'Bob export cannot include Alice practice sessions'
);
select lives_ok(
  $$select public.delete_my_account()$$,
  'Bob can delete his own authenticated account'
);

reset role;

select is(
  (select count(*) from public.app_users where auth_user_id = '22222222-2222-4222-8222-222222222222'),
  0::bigint,
  'account deletion cascades through Bob platform identity'
);

update public.user_entitlements
set revoked_at = now()
where user_id = '11111111-1111-4111-8111-111111111111'
  and package_id = 'tmua-full-access';

set local role authenticated;
select set_config('request.jwt.claim.sub', '11111111-1111-4111-8111-111111111111', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
select is(
  (select count(*) from public.get_entitled_content_resource('tmua-six-week-review-plan-v1')),
  0::bigint,
  'revoking the package immediately removes private content access'
);
select is(
  (select count(*) from public.get_entitled_content_resource('tmua-specimen-p1-worked-explanations-v1')),
  0::bigint,
  'revoking the package immediately removes worked-review access'
);
reset role;

select * from finish();
rollback;
