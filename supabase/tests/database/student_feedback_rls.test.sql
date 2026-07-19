begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(16);

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
    '33333333-3333-4333-8333-333333333333',
    'authenticated',
    'authenticated',
    'feedback-alice@example.test',
    'not-used',
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    now(),
    now()
  ),
  (
    '44444444-4444-4444-8444-444444444444',
    'authenticated',
    'authenticated',
    'feedback-bob@example.test',
    'not-used',
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    now(),
    now()
  );

create temporary table feedback_test_ids (id uuid not null) on commit drop;
grant select on feedback_test_ids to service_role;

select ok(
  not has_function_privilege(
    'anon',
    'public.submit_student_feedback(text,text,text,text,text,text)',
    'execute'
  ),
  'anonymous visitors cannot submit feedback'
);
select ok(
  not has_table_privilege('authenticated', 'public.student_feedback', 'insert'),
  'students cannot bypass feedback validation with direct inserts'
);
select ok(
  not has_table_privilege('service_role', 'public.student_feedback', 'update'),
  'service operations cannot bypass audited status transitions with direct updates'
);
select ok(
  not has_table_privilege('service_role', 'private.student_feedback_events', 'insert'),
  'service operations cannot fabricate audit events directly'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '33333333-3333-4333-8333-333333333333', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select lives_ok(
  $$
    select * from public.submit_student_feedback(
      'content_error',
      'tmua',
      '/practice/tmua-specimen-p1',
      'tmua-specimen-p1',
      'tmua-specimen-p1-q01',
      'The displayed formula is missing a minus sign.'
    )
  $$,
  'Alice can submit a source-specific content correction'
);
select is(
  (select priority from public.student_feedback limit 1),
  'P2',
  'content corrections enter the P2 core-learning queue'
);
select is(
  (select count(*) from public.student_feedback),
  1::bigint,
  'Alice sees exactly her own submitted feedback'
);
select is(
  (
    select feedback_id
    from public.submit_student_feedback(
      'content_error',
      'tmua',
      '/practice/tmua-specimen-p1',
      'tmua-specimen-p1',
      'tmua-specimen-p1-q01',
      'The displayed formula is missing a minus sign.'
    )
  ),
  (select id from public.student_feedback limit 1),
  'an identical report within 24 hours returns the original receipt'
);
select is(
  (select count(*) from public.student_feedback),
  1::bigint,
  'duplicate submission does not create another ticket'
);
select throws_ok(
  $$
    select * from public.submit_student_feedback(
      'technical_problem',
      'tmua',
      '/practice/tmua-specimen-p1',
      'tmua-specimen-p1',
      null,
      'Please call me on 13812345678 about this broken page.'
    )
  $$,
  '22023',
  'feedback_message_contains_contact_details',
  'feedback rejects phone numbers instead of collecting contact details'
);
select is(
  jsonb_array_length(public.export_my_learning_data()->'feedback'),
  1,
  'student data export includes the submitted feedback'
);

reset role;
insert into feedback_test_ids (id)
select id from public.student_feedback
where reporter_user_id = '33333333-3333-4333-8333-333333333333';

set local role authenticated;
select set_config('request.jwt.claim.sub', '44444444-4444-4444-8444-444444444444', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
select is(
  (select count(*) from public.student_feedback),
  0::bigint,
  'Bob cannot read Alice feedback'
);
select ok(
  not has_table_privilege('authenticated', 'public.student_feedback', 'update'),
  'students cannot change workflow status directly'
);

reset role;
set local role service_role;
select set_config('request.jwt.claim.role', 'service_role', true);
select lives_ok(
  $$
    select public.triage_student_feedback(
      (select id from feedback_test_ids),
      'resolved',
      'Verified against the source and corrected.'
    )
  $$,
  'service operations can resolve the ticket through the audited RPC'
);

reset role;
select is(
  (select status from public.student_feedback where id = (select id from feedback_test_ids)),
  'resolved',
  'triage updates the visible student-facing status'
);
select is(
  (select count(*) from private.student_feedback_events where feedback_id = (select id from feedback_test_ids)),
  2::bigint,
  'submission and resolution both leave private audit events'
);

select * from finish();
rollback;
