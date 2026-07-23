begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(12);

select ok(
  has_function_privilege('anon', 'public.record_product_funnel_event(text,text,text,text,text,timestamptz)', 'execute'),
  'anonymous browser journeys can append a constrained funnel event'
);
select ok(
  has_function_privilege('authenticated', 'public.record_product_funnel_event(text,text,text,text,text,timestamptz)', 'execute'),
  'authenticated journeys use the same unlinkable funnel contract'
);
select ok(
  not has_function_privilege('anon', 'public.product_funnel_summary(timestamptz)', 'execute'),
  'anonymous visitors cannot read aggregate conversion data'
);
select ok(
  not has_function_privilege('authenticated', 'public.product_funnel_summary(timestamptz)', 'execute'),
  'students cannot read aggregate conversion data'
);
select ok(
  not has_table_privilege('anon', 'private.product_funnel_events', 'select'),
  'anonymous visitors cannot read private funnel rows'
);
select ok(
  not has_table_privilege('service_role', 'private.product_funnel_events', 'insert'),
  'service operations cannot bypass the constrained append RPC'
);

set local role anon;
select lives_ok(
  $$
    select public.record_product_funnel_event(
      'fun_pgtap_01',
      'journey_pgtap_01',
      'exam_selected',
      'tmua',
      'home-exam-selector',
      now()
    )
  $$,
  'a valid first-party event can be recorded without an account'
);

reset role;
select is(
  (select count(*) from private.product_funnel_events where event_id = 'fun_pgtap_01'),
  1::bigint,
  'the constrained event is stored once'
);

set local role anon;
select lives_ok(
  $$
    select public.record_product_funnel_event(
      'fun_pgtap_01',
      'journey_pgtap_01',
      'exam_selected',
      'tmua',
      'home-exam-selector',
      now()
    )
  $$,
  'replaying the same event id is idempotent'
);
select throws_ok(
  $$
    select public.record_product_funnel_event(
      'fun_pgtap_02',
      'journey_pgtap_01',
      'profile_completed',
      'tmua',
      'student-email-example-com-extra-data-that-is-too-long',
      now()
    )
  $$,
  '22023',
  'product_funnel_event_invalid',
  'free-form or oversized context cannot enter the funnel'
);

reset role;
select is(
  (select count(*) from private.product_funnel_events where event_id = 'fun_pgtap_01'),
  1::bigint,
  'idempotent replay does not create a second row'
);

set local role service_role;
select is(
  (
    select unique_journeys
    from public.product_funnel_summary(now() - interval '1 day')
    where event_type = 'exam_selected'
      and exam_id = 'tmua'
      and context_code = 'home-exam-selector'
  ),
  1::bigint,
  'service operations receive an aggregate journey count, not learner data'
);

select * from finish();
rollback;
