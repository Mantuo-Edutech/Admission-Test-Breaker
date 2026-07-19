begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(37);

insert into auth.users (
  id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  (
    'c1111111-1111-4111-8111-111111111111',
    'authenticated', 'authenticated', 'content-reviewer@example.test', 'not-used', now(),
    '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now()
  ),
  (
    'c2222222-2222-4222-8222-222222222222',
    'authenticated', 'authenticated', 'ordinary-student@example.test', 'not-used', now(),
    '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now()
  );

select is(
  (select count(*) from public.app_users where auth_user_id in (
    'c1111111-1111-4111-8111-111111111111',
    'c2222222-2222-4222-8222-222222222222'
  )),
  2::bigint,
  'auth trigger creates the reviewer and ordinary student identities'
);
select ok(
  not has_function_privilege('authenticated', 'public.configure_content_review_viewer(uuid,text,boolean,text)', 'execute'),
  'browser users cannot grant content review roles'
);
select ok(
  not has_function_privilege('authenticated', 'public.sync_content_review_queue(text,jsonb)', 'execute'),
  'browser users cannot replace the source-bound review queue'
);
select ok(
  not has_table_privilege('authenticated', 'private.content_review_viewer_grants', 'select'),
  'browser users cannot read reviewer grants'
);
select ok(
  not has_table_privilege('authenticated', 'private.content_review_queue_items', 'select'),
  'browser users cannot read the queue table directly'
);
select ok(
  not has_table_privilege('authenticated', 'private.content_review_operations_events', 'select'),
  'browser users cannot read private review operations events'
);
select ok(
  not has_function_privilege('anon', 'public.get_my_content_review_viewer_context()', 'execute'),
  'anonymous visitors cannot request a reviewer context'
);
select ok(
  not has_function_privilege('anon', 'public.get_content_review_queue_summary()', 'execute'),
  'anonymous visitors cannot read review counts'
);

create temporary table content_review_test_baseline (
  queue_sync_events bigint
) on commit drop;
insert into content_review_test_baseline
select count(*) from private.content_review_operations_events where event_type = 'queue_synced';
grant select on content_review_test_baseline to authenticated, service_role;

set local role service_role;
select lives_ok(
  $$select * from public.sync_content_review_queue(
    '2026-07-19.33',
    jsonb_build_array(
      jsonb_build_object(
        'reviewKey', 'tmua-online/independent-math',
        'campaignId', 'academic-content',
        'ownerRole', 'content-review-lead',
        'independenceRequired', true,
        'evidenceRequirement', 'An independent mathematics teacher must check every current prompt and answer.',
        'viewports', jsonb_build_array('content'),
        'products', jsonb_build_array(jsonb_build_object(
          'productId', 'tmua-past-papers', 'examId', 'tmua', 'version', '1.0.0',
          'route', '/exams/tmua/past-papers'
        )),
        'sourceFingerprint', 'sha256:' || repeat('a', 64),
        'sourceArtifactCount', 18
      ),
      jsonb_build_object(
        'reviewKey', 'esat-notes/device-review',
        'campaignId', 'device-accessibility',
        'ownerRole', 'interface-qa-lead',
        'independenceRequired', false,
        'evidenceRequirement', 'Check desktop, iPad and phone rendering, keyboard, touch and readability.',
        'viewports', jsonb_build_array('desktop', 'ipad', 'phone'),
        'products', jsonb_build_array(jsonb_build_object(
          'productId', 'esat-math-notes', 'examId', 'esat', 'version', '1.0.0',
          'route', '/exams/esat/notes/mathematics'
        )),
        'sourceFingerprint', 'sha256:' || repeat('b', 64),
        'sourceArtifactCount', 5
      )
    )
  )$$,
  'service role can synchronize a fully validated current review queue'
);
reset role;

select is(
  (select count(*) from private.content_review_queue_items),
  2::bigint,
  'the synchronized queue contains both review groups'
);
select is(
  (select count(*) from private.content_review_operations_events where event_type = 'queue_synced'),
  (select queue_sync_events + 1 from content_review_test_baseline),
  'queue synchronization leaves a private audit event'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', 'c2222222-2222-4222-8222-222222222222', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
select is(
  (select active from public.get_my_content_review_viewer_context()),
  false,
  'an ordinary student receives an inactive review context'
);
select throws_ok(
  $$select * from public.get_content_review_queue_summary()$$,
  '42501', 'content_review_viewer_required',
  'an ordinary student cannot read internal review counts'
);
select throws_ok(
  $$select * from public.list_content_review_queue(null, 200)$$,
  '42501', 'content_review_viewer_required',
  'an ordinary student cannot read the review queue'
);
reset role;

set local role service_role;
select lives_ok(
  $$select * from public.configure_content_review_viewer(
    'c1111111-1111-4111-8111-111111111111',
    '满托教研负责人', true, 'Approved internal content review coordination'
  )$$,
  'service role can grant the independent content review capability'
);
reset role;

select is(
  (select count(*) from private.content_review_viewer_grants where status = 'active'),
  1::bigint,
  'the content review viewer grant is active'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', 'c1111111-1111-4111-8111-111111111111', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
select is(
  (select active from public.get_my_content_review_viewer_context()),
  true,
  'the approved reviewer receives an active context'
);
select is(
  (select display_name from public.get_my_content_review_viewer_context()),
  '满托教研负责人',
  'the context returns the approved display name'
);
select ok(
  (select 'view_content_review_queue' = any(context.permissions)
   from public.get_my_content_review_viewer_context() as context),
  'the context declares queue-view permission'
);
select ok(
  (select 'prepare_review_packet' = any(context.permissions)
   from public.get_my_content_review_viewer_context() as context),
  'the context declares packet-preparation permission but no approval permission'
);
select is(
  (select pending_review_items from public.get_content_review_queue_summary()),
  2::bigint,
  'the summary counts review groups rather than expanded product rows'
);
select is(
  (select affected_public_products from public.get_content_review_queue_summary()),
  2::bigint,
  'the summary counts distinct public products'
);
select is(
  (select academic_content_items from public.get_content_review_queue_summary()),
  1::bigint,
  'the summary counts academic review groups'
);
select is(
  (select student_calibration_items from public.get_content_review_queue_summary()),
  0::bigint,
  'the summary honestly reports no student-calibration fixture'
);
select is(
  (select device_accessibility_items from public.get_content_review_queue_summary()),
  1::bigint,
  'the summary counts device and accessibility review groups'
);
select is(
  (select count(*) from public.list_content_review_queue(null, 200)),
  2::bigint,
  'the reviewer can list the complete sanitized queue'
);
select is(
  (select count(*) from public.list_content_review_queue('academic-content', 200)),
  1::bigint,
  'the reviewer can filter by a controlled campaign'
);
select ok(
  (select bool_and((product.value ->> 'route') ~ '^/' and (product.value ->> 'route') !~ '^//')
   from public.list_content_review_queue(null, 200) as queue
   cross join lateral jsonb_array_elements(queue.products) as product(value)),
  'the server returns only internal product routes'
);
select ok(
  (select bool_and(queue.source_fingerprint ~ '^sha256:[0-9a-f]{64}$')
   from public.list_content_review_queue(null, 200) as queue),
  'every browser-visible task remains pinned to a current source fingerprint'
);
select throws_ok(
  $$select * from public.list_content_review_queue('uncontrolled-campaign', 200)$$,
  '22023', 'content_review_campaign_invalid',
  'the reviewer cannot invent an uncontrolled campaign filter'
);
select throws_ok(
  $$select * from public.list_content_review_queue(null, 500)$$,
  '22023', 'content_review_limit_invalid',
  'the reviewer cannot bypass the bounded queue response'
);
reset role;

set local role service_role;
select throws_ok(
  $$select * from public.sync_content_review_queue(
    '2026-07-19.34',
    jsonb_build_array(jsonb_build_object(
      'reviewKey', 'invalid/fingerprint',
      'campaignId', 'academic-content',
      'ownerRole', 'content-review-lead',
      'independenceRequired', true,
      'evidenceRequirement', 'This otherwise valid item deliberately has an invalid fingerprint.',
      'viewports', jsonb_build_array('content'),
      'products', jsonb_build_array(jsonb_build_object(
        'productId', 'tmua-past-papers', 'examId', 'tmua', 'version', '1.0.0',
        'route', '/exams/tmua/past-papers'
      )),
      'sourceFingerprint', 'not-a-fingerprint',
      'sourceArtifactCount', 1
    ))
  )$$,
  '22023', 'content_review_queue_item_invalid',
  'malformed source evidence fails the whole synchronization transaction'
);
reset role;
select is(
  (select count(*) from private.content_review_queue_items),
  2::bigint,
  'a failed synchronization preserves the prior complete queue'
);

set local role service_role;
select lives_ok(
  $$select * from public.configure_content_review_viewer(
    'c1111111-1111-4111-8111-111111111111',
    '满托教研负责人', false, 'End content review capability contract test'
  )$$,
  'service role can revoke the content review capability'
);
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', 'c1111111-1111-4111-8111-111111111111', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
select is(
  (select active from public.get_my_content_review_viewer_context()),
  false,
  'revocation immediately removes the reviewer context'
);
select throws_ok(
  $$select * from public.list_content_review_queue(null, 200)$$,
  '42501', 'content_review_viewer_required',
  'revocation immediately removes queue access'
);
reset role;

select is(
  (select count(*) from private.content_review_operations_events
   where subject_user_id = 'c1111111-1111-4111-8111-111111111111'
     and event_type in ('viewer_granted', 'viewer_revoked')),
  2::bigint,
  'grant and revocation both leave private audit events'
);

select * from finish();
rollback;
