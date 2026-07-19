begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(25);

insert into auth.users (
  id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  (
    'f1111111-1111-4111-8111-111111111111',
    'authenticated', 'authenticated', 'funnel-viewer@example.test', 'not-used', now(),
    '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now()
  ),
  (
    'f2222222-2222-4222-8222-222222222222',
    'authenticated', 'authenticated', 'ordinary-student@example.test', 'not-used', now(),
    '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now()
  );

select is(
  (select count(*) from public.app_users where auth_user_id::text like 'f%'),
  2::bigint,
  'auth trigger creates both platform users'
);
select ok(
  not has_function_privilege('authenticated', 'public.configure_product_funnel_viewer(uuid,text,boolean,text)', 'execute'),
  'browser users cannot grant aggregate viewer roles'
);
select ok(
  not has_table_privilege('authenticated', 'private.product_funnel_viewer_grants', 'select'),
  'browser users cannot read viewer grants'
);
select ok(
  not has_table_privilege('authenticated', 'private.product_funnel_viewer_events', 'select'),
  'browser users cannot read viewer audit rows'
);
select ok(
  not has_table_privilege('authenticated', 'private.product_funnel_events', 'select'),
  'aggregate viewers still cannot read raw journey events'
);
select ok(
  not has_function_privilege('anon', 'public.list_product_funnel_stage_summary(timestamptz)', 'execute'),
  'anonymous visitors cannot read the operations summary'
);

create temporary table product_funnel_test_baseline (
  tmua_selected_events bigint,
  tmua_selected_journeys bigint,
  all_bingbing_journeys bigint
) on commit drop;
insert into product_funnel_test_baseline
select
  (select count(*) from private.product_funnel_events
   where exam_id = 'tmua' and event_type = 'exam_selected'
     and received_at >= now() - interval '30 days'),
  (select count(distinct journey_id) from private.product_funnel_events
   where exam_id = 'tmua' and event_type = 'exam_selected'
     and received_at >= now() - interval '30 days'),
  (select count(distinct journey_id) from private.product_funnel_events
   where event_type = 'bingbing_opened'
     and received_at >= now() - interval '30 days');
grant select on product_funnel_test_baseline to authenticated;

set local role anon;
select lives_ok(
  $$select public.record_product_funnel_event(
    'fun_viewer_test_01', 'journey_viewer_test_01', 'exam_selected', 'tmua',
    'home-exam-selector', now()
  )$$,
  'a constrained anonymous journey can enter the aggregate source'
);
select lives_ok(
  $$select public.record_product_funnel_event(
    'fun_viewer_test_02', 'journey_viewer_test_01', 'exam_selected', 'tmua',
    'home-exam-selector', now()
  )$$,
  'a repeated action in the same journey remains a distinct event'
);
select lives_ok(
  $$select public.record_product_funnel_event(
    'fun_viewer_test_03', 'journey_viewer_test_01', 'bingbing_opened', 'tmua',
    'result-deep-review', now()
  )$$,
  'the controlled Bingbing action can enter the same anonymous journey'
);
reset role;

set local role service_role;
select lives_ok(
  $$select * from public.configure_product_funnel_viewer(
    'f1111111-1111-4111-8111-111111111111', '满托创始人', true,
    'Founder approved aggregate product analytics'
  )$$,
  'service role can grant the separate aggregate viewer capability'
);
reset role;

select is(
  (select count(*) from private.product_funnel_viewer_grants where status = 'active'),
  1::bigint,
  'the viewer grant is active'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', 'f2222222-2222-4222-8222-222222222222', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
select is(
  (select active from public.get_my_product_funnel_viewer_context()),
  false,
  'an ordinary student receives an inactive viewer context'
);
select throws_ok(
  $$select * from public.list_product_funnel_stage_summary(now() - interval '30 days')$$,
  '42501', 'product_funnel_viewer_required',
  'an ordinary student cannot read aggregate conversion data'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', 'f1111111-1111-4111-8111-111111111111', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
select is(
  (select active from public.get_my_product_funnel_viewer_context()),
  true,
  'the approved account receives an active viewer context'
);
select ok(
  (select 'view_aggregate_product_funnel' = any(context.permissions)
   from public.get_my_product_funnel_viewer_context() as context),
  'the context declares only the aggregate funnel permission'
);
select is(
  (select event_count from public.list_product_funnel_stage_summary(now() - interval '30 days')
   where scope_exam_id = 'tmua' and event_type = 'exam_selected'),
  (select tmua_selected_events + 2 from product_funnel_test_baseline),
  'the viewer receives the aggregate event count'
);
select is(
  (select unique_journeys from public.list_product_funnel_stage_summary(now() - interval '30 days')
   where scope_exam_id = 'tmua' and event_type = 'exam_selected'),
  (select tmua_selected_journeys + 1 from product_funnel_test_baseline),
  'the viewer receives a de-duplicated journey count'
);
select is(
  (select unique_journeys from public.list_product_funnel_stage_summary(now() - interval '30 days')
   where scope_exam_id = 'all' and event_type = 'bingbing_opened'),
  (select all_bingbing_journeys + 1 from product_funnel_test_baseline),
  'the viewer receives an all-exam aggregate without raw rows'
);
select throws_ok(
  $$select * from public.list_product_funnel_stage_summary(now() - interval '100 days')$$,
  '22023', 'product_funnel_summary_window_invalid',
  'the viewer cannot query beyond the retention window'
);
select is(
  (select count(*) from public.app_users),
  1::bigint,
  'the viewer remains an ordinary user under app-user RLS'
);

reset role;
select is(
  (select array_agg(column_name order by ordinal_position)::text[]
   from information_schema.columns
   where table_schema = 'private' and table_name = 'product_funnel_events'),
  array['event_id','journey_id','event_type','exam_id','context_code','occurred_at','received_at']::text[],
  'raw event storage contains no identity, contact, course, answer, IP or device column'
);

set local role service_role;
select lives_ok(
  $$select * from public.configure_product_funnel_viewer(
    'f1111111-1111-4111-8111-111111111111', '满托创始人', false,
    'End aggregate viewer contract test'
  )$$,
  'service role can revoke the aggregate viewer capability'
);
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', 'f1111111-1111-4111-8111-111111111111', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
select is(
  (select active from public.get_my_product_funnel_viewer_context()),
  false,
  'revocation immediately removes the viewer context'
);
select throws_ok(
  $$select * from public.list_product_funnel_stage_summary(now() - interval '30 days')$$,
  '42501', 'product_funnel_viewer_required',
  'revocation immediately removes aggregate access'
);

reset role;
select is(
  (select count(*) from private.product_funnel_viewer_events
   where subject_user_id = 'f1111111-1111-4111-8111-111111111111'),
  2::bigint,
  'grant and revocation both leave private audit events'
);

select * from finish();
rollback;
