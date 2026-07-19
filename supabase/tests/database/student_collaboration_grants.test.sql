begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select no_plan();

insert into auth.users (
  id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  (
    'c1111111-1111-4111-8111-111111111111', 'authenticated', 'authenticated',
    'collab-student@example.test', 'not-used', now(),
    '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now()
  ),
  (
    'c2222222-2222-4222-8222-222222222222', 'authenticated', 'authenticated',
    'collab-teacher@example.test', 'not-used', now(),
    '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now()
  ),
  (
    'c3333333-3333-4333-8333-333333333333', 'authenticated', 'authenticated',
    'collab-outsider@example.test', 'not-used', now(),
    '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now()
  );

create temporary table collaboration_test_ids (
  student_space text,
  student_ref text,
  teacher_ref text,
  outsider_ref text
) on commit drop;
insert into collaboration_test_ids
select
  (select id from public.learner_spaces where owner_user_id = 'c1111111-1111-4111-8111-111111111111'),
  (select platform_user_id from public.app_users where auth_user_id = 'c1111111-1111-4111-8111-111111111111'),
  (select platform_user_id from public.app_users where auth_user_id = 'c2222222-2222-4222-8222-222222222222'),
  (select platform_user_id from public.app_users where auth_user_id = 'c3333333-3333-4333-8333-333333333333');
grant select on collaboration_test_ids to authenticated;

insert into public.practice_sessions (
  id, learner_space_id, paper_id, schema_version, status, snapshot,
  started_at, deadline_at, submitted_at
) values (
  'ses_collaboration_tmua_01',
  (select student_space from collaboration_test_ids),
  'tmua-diagnostic-v1',
  2,
  'submitted',
  jsonb_build_object(
    'schemaVersion', 2,
    'id', 'ses_collaboration_tmua_01',
    'learningSpaceId', (select student_space from collaboration_test_ids),
    'startedBy', jsonb_build_object('kind', 'student', 'userId', (select student_ref from collaboration_test_ids)),
    'paperId', 'tmua-diagnostic-v1',
    'status', 'submitted',
    'startedAt', '2026-07-19T08:00:00.000Z',
    'deadlineAt', '2026-07-19T08:30:00.000Z',
    'submittedAt', '2026-07-19T08:20:00.000Z',
    'currentQuestion', 2,
    'answers', jsonb_build_object('tmua-diagnostic-v1-q01', 'A', 'tmua-diagnostic-v1-q02', 'B'),
    'markedQuestionIds', '[]'::jsonb,
    'timingByQuestionMs', jsonb_build_object('tmua-diagnostic-v1-q01', 45000, 'tmua-diagnostic-v1-q02', 75000),
    'activeQuestionEnteredAt', null,
    'events', '[]'::jsonb
  ),
  '2026-07-19T08:00:00.000Z',
  '2026-07-19T08:30:00.000Z',
  '2026-07-19T08:20:00.000Z'
);
insert into public.learning_events (
  id, learner_space_id, session_id, sequence, event_type, actor, occurred_at, payload
) values
  (
    'evt_collaboration_tmua_01', (select student_space from collaboration_test_ids),
    'ses_collaboration_tmua_01', 1, 'session_started',
    jsonb_build_object('kind', 'student', 'userId', (select student_ref from collaboration_test_ids)),
    '2026-07-19T08:00:00.000Z', '{}'::jsonb
  ),
  (
    'evt_collaboration_tmua_02', (select student_space from collaboration_test_ids),
    'ses_collaboration_tmua_01', 2, 'answer_changed',
    jsonb_build_object('kind', 'student', 'userId', (select student_ref from collaboration_test_ids)),
    '2026-07-19T08:10:00.000Z', '{}'::jsonb
  );

select is(
  (select count(*) from public.app_users where auth_user_id in (
    'c1111111-1111-4111-8111-111111111111',
    'c2222222-2222-4222-8222-222222222222',
    'c3333333-3333-4333-8333-333333333333'
  )),
  3::bigint,
  'auth triggers create isolated app users and learner spaces'
);
select ok(
  not has_function_privilege('anon', 'public.issue_my_collaboration_invite(text,text[],text[],integer)', 'execute'),
  'anonymous visitors cannot create learning-data grants'
);
select ok(
  not has_table_privilege('authenticated', 'private.collaboration_invites', 'select'),
  'browser users cannot read collaboration-code digests'
);
select ok(
  not has_table_privilege('authenticated', 'private.learner_grants', 'select'),
  'browser users cannot bypass grant RPCs'
);
select ok(
  not has_table_privilege('authenticated', 'private.collaboration_artifacts', 'select'),
  'browser users cannot directly read collaboration artifacts'
);
select ok(
  not has_table_privilege('authenticated', 'private.collaboration_audit_events', 'select'),
  'browser users cannot directly read collaboration audit rows'
);

create temporary table collaboration_codes (
  invite_id text,
  code text,
  invite_expires_at timestamptz
) on commit drop;
grant select, insert on collaboration_codes to authenticated;

set local role authenticated;
select set_config('request.jwt.claim.sub', 'c1111111-1111-4111-8111-111111111111', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select throws_ok(
  $$select * from public.issue_my_collaboration_invite('teacher', array[]::text[], array['tmua'], 30)$$,
  '22023', 'collaboration_scopes_invalid',
  'a student cannot create an empty authority grant'
);
select throws_ok(
  $$select * from public.issue_my_collaboration_invite('teacher', array['progress:read'], array['tmua'], 365)$$,
  '22023', 'collaboration_duration_invalid',
  'a student cannot create an unbounded grant'
);
insert into collaboration_codes
select * from public.issue_my_collaboration_invite(
  'teacher', array['progress:read', 'plans:write'], array['tmua'], 30
);
select ok(
  (select code like 'MTSHARE-%' from collaboration_codes limit 1),
  'the learner receives a one-time collaboration code'
);
select is(
  (select status from public.list_my_collaboration_invites() limit 1),
  'pending',
  'the learner can see a pending invite without seeing a stored plaintext code'
);
select throws_ok(
  $$select * from public.redeem_collaboration_invite((select code from collaboration_codes limit 1))$$,
  '42501', 'collaboration_self_grant_forbidden',
  'the learner cannot redeem their own collaboration code'
);

create temporary table redeemed_grants (
  grant_id text,
  learner_reference text,
  subject_kind text,
  scopes text[],
  exam_ids text[],
  expires_at timestamptz
) on commit drop;
grant select, insert on redeemed_grants to authenticated;

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', 'c2222222-2222-4222-8222-222222222222', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
insert into redeemed_grants
select * from public.redeem_collaboration_invite((select code from collaboration_codes limit 1));
select is(
  (select subject_kind from redeemed_grants limit 1),
  'teacher',
  'the intended recipient redeems the code as the selected subject kind'
);
select is(
  (select count(*) from public.list_my_shared_learner_spaces()),
  1::bigint,
  'the teacher sees exactly the learner space explicitly shared with them'
);
select is(
  (select answered_count from public.get_shared_learning_progress(
    (select grant_id from redeemed_grants limit 1), 'tmua'
  ) limit 1),
  2,
  'progress scope exposes a sanitized answered count'
);
select is(
  (select active_ms from public.get_shared_learning_progress(
    (select grant_id from redeemed_grants limit 1), 'tmua'
  ) limit 1),
  120000::bigint,
  'progress scope exposes aggregate active time without answers'
);
select throws_ok(
  $$select * from public.get_shared_learning_progress((select grant_id from redeemed_grants limit 1), 'esat')$$,
  '42501', 'collaboration_grant_required',
  'an exam-scoped grant cannot read another exam'
);
select throws_ok(
  $$select * from public.list_shared_learning_responses((select grant_id from redeemed_grants limit 1), 'tmua')$$,
  '42501', 'collaboration_grant_required',
  'progress permission does not imply response permission'
);
select lives_ok(
  $$select * from public.create_collaboration_artifact(
    (select grant_id from redeemed_grants limit 1), 'plan', 'tmua',
    '第一周计划', '先完成代数与函数复习，再做起点诊断。', now() + interval '7 days'
  )$$,
  'the separately selected plan scope permits a training plan'
);
select throws_ok(
  $$select * from public.create_collaboration_artifact(
    (select grant_id from redeemed_grants limit 1), 'annotation', 'tmua',
    '题目批注', '注意充分条件和必要条件。', null
  )$$,
  '42501', 'collaboration_grant_required',
  'plan scope does not imply annotation scope'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', 'c3333333-3333-4333-8333-333333333333', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
select is(
  (select count(*) from public.list_my_shared_learner_spaces()),
  0::bigint,
  'an unrelated account receives no shared learner spaces'
);
select throws_ok(
  $$select * from public.get_shared_learning_progress((select grant_id from redeemed_grants limit 1), 'tmua')$$,
  '42501', 'collaboration_grant_required',
  'an unrelated account cannot read aggregate learner progress'
);
select throws_ok(
  $$select * from public.list_collaboration_artifacts((select grant_id from redeemed_grants limit 1))$$,
  '42501', 'collaboration_grant_required',
  'an unrelated account cannot read a teacher plan'
);

create temporary table parent_collaboration_codes (
  invite_id text,
  code text,
  invite_expires_at timestamptz
) on commit drop;
grant select, insert on parent_collaboration_codes to authenticated;
create temporary table parent_redeemed_grants (
  grant_id text,
  learner_reference text,
  subject_kind text,
  scopes text[],
  exam_ids text[],
  expires_at timestamptz
) on commit drop;
grant select, insert on parent_redeemed_grants to authenticated;

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', 'c1111111-1111-4111-8111-111111111111', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
insert into parent_collaboration_codes
select * from public.issue_my_collaboration_invite(
  'parent',
  array['responses:read', 'annotations:write', 'assignments:write'],
  array['tmua'],
  14
);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', 'c3333333-3333-4333-8333-333333333333', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
insert into parent_redeemed_grants
select * from public.redeem_collaboration_invite((select code from parent_collaboration_codes limit 1));
select is(
  (select subject_kind from parent_redeemed_grants limit 1),
  'parent',
  'a second recipient can redeem an independently scoped parent grant'
);
select is(
  (
    select answers->>'tmua-diagnostic-v1-q01'
    from public.list_shared_learning_responses(
      (select grant_id from parent_redeemed_grants limit 1),
      'tmua'
    )
    limit 1
  ),
  'A',
  'response permission exposes exact answers only to the separately authorised account'
);
select throws_ok(
  $$select * from public.get_shared_learning_progress((select grant_id from parent_redeemed_grants limit 1), 'tmua')$$,
  '42501', 'collaboration_grant_required',
  'response permission does not imply aggregate progress permission'
);
select lives_ok(
  $$select * from public.create_collaboration_artifact(
    (select grant_id from parent_redeemed_grants limit 1), 'annotation', 'tmua',
    '解题批注', '这里需要分清充分条件与必要条件。', null
  )$$,
  'annotation permission permits a parent annotation without plan authority'
);
select lives_ok(
  $$select * from public.create_collaboration_artifact(
    (select grant_id from parent_redeemed_grants limit 1), 'assignment', 'tmua',
    '周末练习', '完成两组逻辑与证明题，标记不确定的题。', now() + interval '3 days'
  )$$,
  'assignment permission permits a separately authorised practice task'
);
select throws_ok(
  $$select * from public.create_collaboration_artifact(
    (select grant_id from parent_redeemed_grants limit 1), 'plan', 'tmua',
    '越权计划', '不应被写入。', null
  )$$,
  '42501', 'collaboration_grant_required',
  'annotation and assignment scopes do not imply plan authority'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', 'c1111111-1111-4111-8111-111111111111', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
select is(
  (select status from public.list_my_collaboration_grants() limit 1),
  'active',
  'the learner sees the redeemed grant as active'
);
select ok(
  (select 'plans:write' = any(scopes) from public.list_my_collaboration_grants() limit 1),
  'the learner can inspect the exact scopes they granted'
);
select is(
  (select count(*) from public.list_collaboration_artifacts((select grant_id from redeemed_grants limit 1))),
  1::bigint,
  'the learner can see work created under their grant'
);
select is(
  (public.export_my_learning_data()->>'schemaVersion')::integer,
  4,
  'the student export declares the collaboration-aware schema version'
);
select is(
  jsonb_array_length(public.export_my_learning_data()->'collaborationGrants'),
  2,
  'the student export includes every teacher and parent grant they created'
);
select is(
  jsonb_array_length(public.export_my_learning_data()->'collaborationArtifacts'),
  3,
  'the student export includes every plan, annotation and assignment created under their authority'
);
select ok(
  (select count(*) >= 4 from public.list_my_collaboration_audit(100)),
  'the learner sees invite, redemption, sensitive read and write audit events'
);
select lives_ok(
  $$select public.revoke_my_collaboration_grant((select grant_id from redeemed_grants limit 1))$$,
  'the learner can revoke the grant immediately'
);
select is(
  (
    select status
    from public.list_my_collaboration_grants()
    where grant_id = (select grant_id from redeemed_grants limit 1)
  ),
  'revoked',
  'the learner sees the grant as revoked'
);
select is(
  (select count(*) from public.list_collaboration_artifacts((select grant_id from redeemed_grants limit 1))),
  1::bigint,
  'the learner retains their audit-visible collaboration artifact after revocation'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', 'c2222222-2222-4222-8222-222222222222', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
select is(
  (select count(*) from public.list_my_shared_learner_spaces()),
  0::bigint,
  'revocation removes the shared learner space immediately'
);
select throws_ok(
  $$select * from public.get_shared_learning_progress((select grant_id from redeemed_grants limit 1), 'tmua')$$,
  '42501', 'collaboration_grant_required',
  'revocation immediately denies new progress reads'
);
select throws_ok(
  $$select * from public.list_collaboration_artifacts((select grant_id from redeemed_grants limit 1))$$,
  '42501', 'collaboration_grant_required',
  'revocation immediately denies artifact reads by the former collaborator'
);

reset role;
select is(
  (select count(*) from private.collaboration_invites where code_digest is not null),
  2::bigint,
  'the database stores only collaboration code digests for both invitations'
);
select is(
  (select count(*) from private.collaboration_audit_events where event_type = 'grant_revoked'),
  1::bigint,
  'grant revocation leaves a private immutable audit event'
);
select is(
  (select count(*) from private.collaboration_audit_events where event_type = 'responses_viewed'),
  1::bigint,
  'only the successful explicitly authorised response read creates an audit event'
);

select * from finish();
rollback;
