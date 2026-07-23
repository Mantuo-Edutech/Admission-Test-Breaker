begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(44);

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
    'a1111111-1111-4111-8111-111111111111',
    'authenticated',
    'authenticated',
    'bingbing-operator@example.test',
    'not-used',
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    now(),
    now()
  ),
  (
    'a2222222-2222-4222-8222-222222222222',
    'authenticated',
    'authenticated',
    'second-operator@example.test',
    'not-used',
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    now(),
    now()
  ),
  (
    'a3333333-3333-4333-8333-333333333333',
    'authenticated',
    'authenticated',
    'student@example.test',
    'not-used',
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    now(),
    now()
  );

select is(
  (
    select count(*) from public.app_users
    where auth_user_id in (
      'a1111111-1111-4111-8111-111111111111',
      'a2222222-2222-4222-8222-222222222222',
      'a3333333-3333-4333-8333-333333333333'
    )
  ),
  3::bigint,
  'auth trigger creates platform identities for both operators and the student'
);

select ok(
  not has_function_privilege(
    'authenticated',
    'public.configure_invite_operator(uuid,text,boolean,text)',
    'execute'
  ),
  'browser users cannot grant invite-operator roles'
);
select ok(
  not has_function_privilege(
    'authenticated',
    'public.issue_invite(text,text[],integer,timestamptz,interval)',
    'execute'
  ),
  'operators and students cannot call the service issuer directly'
);
select ok(
  not has_table_privilege('authenticated', 'private.invite_operator_grants', 'select'),
  'browser users cannot read the operator grant table'
);
select ok(
  not has_table_privilege('authenticated', 'private.invite_operator_events', 'select'),
  'browser users cannot read the private operator audit table'
);
select ok(
  not has_table_privilege('authenticated', 'private.invite_codes', 'select'),
  'browser users cannot read invite digests'
);
select ok(
  not has_function_privilege(
    'authenticated',
    'public.list_invite_operator_audit(timestamptz,integer)',
    'execute'
  ),
  'browser users cannot read the cross-operator audit feed'
);

set local role service_role;
select lives_ok(
  $$select * from public.configure_invite_operator(
    'a1111111-1111-4111-8111-111111111111',
    '冰冰',
    true,
    'Approved Beta invite operations'
  )$$,
  'service role can grant the Bingbing invite-operator role'
);
select lives_ok(
  $$select * from public.configure_invite_operator(
    'a2222222-2222-4222-8222-222222222222',
    'Second operator',
    true,
    'Cross-operator isolation test'
  )$$,
  'service role can grant a second isolated operator'
);
reset role;

select is(
  (select count(*) from private.invite_operator_grants where status = 'active'),
  2::bigint,
  'both operator grants are active'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', 'a3333333-3333-4333-8333-333333333333', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select is(
  (select active from public.get_my_invite_operator_context()),
  false,
  'an ordinary student receives an inactive operator context'
);
select throws_ok(
  $$select * from public.list_invite_operator_packages()$$,
  '42501',
  'invite_operator_required',
  'an ordinary student cannot list sellable invite packages'
);
select throws_ok(
  $$select * from public.issue_operator_invite(
    'lead-student',
    array['tmua-full-access'],
    1,
    now() + interval '1 day',
    interval '30 days'
  )$$,
  '42501',
  'invite_operator_required',
  'an ordinary student cannot issue an invite'
);
select throws_ok(
  $$select * from public.list_my_issued_invites()$$,
  '42501',
  'invite_operator_required',
  'an ordinary student cannot list operator invites'
);
select throws_ok(
  $$select * from public.list_my_invite_operator_activity(50)$$,
  '42501',
  'invite_operator_required',
  'an ordinary student cannot list operator audit events'
);

reset role;
create temporary table issued_operator_invite (
  invite_id uuid,
  code text,
  expires_at timestamptz
) on commit drop;
grant select, insert on issued_operator_invite to authenticated, service_role;

set local role authenticated;
select set_config('request.jwt.claim.sub', 'a1111111-1111-4111-8111-111111111111', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select is(
  (select active from public.get_my_invite_operator_context()),
  true,
  'Bingbing receives an active operator context'
);
select is(
  (select display_name from public.get_my_invite_operator_context()),
  '冰冰',
  'operator context returns the approved display name'
);
select ok(
  (
    select 'issue_invite' = any(operator_context.permissions)
    from public.get_my_invite_operator_context() as operator_context
  ),
  'operator context declares the issue-invite permission'
);
select is(
  (
    select count(*)
    from public.list_invite_operator_packages()
    where package_id = 'tmua-full-access'
      and published_resource_count >= 1
  ),
  1::bigint,
  'Bingbing can see the TMUA package backed by published entitled content'
);
select is(
  (
    select count(*)
    from public.list_invite_operator_packages()
    where package_id = 'esat-deep-review'
  ),
  0::bigint,
  'draft-only packages never appear in the operator package picker'
);
select lives_ok(
  $$insert into issued_operator_invite
    select * from public.issue_operator_invite(
      'lead-alpha',
      array['tmua-full-access'],
      1,
      now() + interval '1 day',
      interval '30 days'
    )$$,
  'Bingbing can issue one finite invite for a published package'
);
select is(
  (select length(code) from issued_operator_invite),
  36,
  'the plaintext invite is returned once as a 36-character random code'
);
select throws_ok(
  $$select * from public.issue_operator_invite(
    'draft-check',
    array['esat-deep-review'],
    1,
    now() + interval '1 day',
    interval '30 days'
  )$$,
  '22023',
  'invite_package_unpublished',
  'Bingbing cannot issue a draft-only package'
);
select throws_ok(
  $$select * from public.issue_operator_invite(
    'too-many',
    array['tmua-full-access'],
    21,
    now() + interval '1 day',
    interval '30 days'
  )$$,
  '22023',
  'invite_operator_redemptions_invalid',
  'operator invites cannot exceed the redemption cap'
);
select throws_ok(
  $$select * from public.issue_operator_invite(
    'student@example.test',
    array['tmua-full-access'],
    1,
    now() + interval '1 day',
    interval '30 days'
  )$$,
  '22023',
  'invite_reference_personal_data',
  'operator references reject obvious contact information'
);
select is(
  (select count(*) from public.list_my_issued_invites()),
  1::bigint,
  'Bingbing sees exactly the invite she issued'
);
select is(
  (select redemption_count from public.list_my_issued_invites()),
  0::bigint,
  'the operator list exposes only a redemption count, not student identities'
);
select is(
  (
    select count(*)
    from public.list_my_invite_operator_activity(50)
    where event_type = 'invite_issued'
  ),
  1::bigint,
  'Bingbing can see her own issue audit event'
);
select is(
  (select count(*) from public.app_users),
  1::bigint,
  'an invite operator still sees only her own app user through RLS'
);
select is(
  (select count(*) from public.user_entitlements),
  0::bigint,
  'an invite operator cannot browse student entitlement rows'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', 'a2222222-2222-4222-8222-222222222222', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select is(
  (select count(*) from public.list_my_issued_invites()),
  0::bigint,
  'a second operator cannot list Bingbing invites'
);
select throws_ok(
  $$select * from public.revoke_my_issued_invite(
    (select invite_id from issued_operator_invite),
    'Cross-operator denial test'
  )$$,
  '22023',
  'invite_not_found',
  'a second operator cannot revoke Bingbing invites or learn their state'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', 'a1111111-1111-4111-8111-111111111111', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select lives_ok(
  $$select * from public.revoke_my_issued_invite(
    (select invite_id from issued_operator_invite),
    'Student no longer needs this code'
  )$$,
  'Bingbing can revoke her own unredeemed invite'
);
select is(
  (select status from public.list_my_issued_invites()),
  'revoked',
  'the revoked code is clearly marked in Bingbing own list'
);
select is(
  (
    select count(*)
    from public.list_my_invite_operator_activity(50)
    where event_type in ('invite_issued', 'invite_revoked')
  ),
  2::bigint,
  'Bingbing sees both issue and revoke events without student identities'
);

reset role;
set local role service_role;
select is(
  (
    select count(*)
    from public.list_invite_operator_audit(now() - interval '1 hour', 100)
    where (
      event_type = 'operator_granted'
      and subject_operator_user_id in (
        'a1111111-1111-4111-8111-111111111111'::uuid,
        'a2222222-2222-4222-8222-222222222222'::uuid
      )
    ) or (
      event_type in ('invite_issued', 'invite_revoked')
      and invite_id = (select invite_id from issued_operator_invite)
    )
  ),
  4::bigint,
  'service operations can review grant, issue and revoke events through a bounded audit RPC'
);
select is(
  (
    select valid
    from public.validate_invite_for_registration(
      (select code from issued_operator_invite)
    )
  ),
  false,
  'a revoked operator code cannot be used for registration'
);
reset role;

select is(
  (
    select count(*)
    from private.invite_operator_events
    where event_type = 'operator_granted'
      and subject_operator_user_id in (
        'a1111111-1111-4111-8111-111111111111'::uuid,
        'a2222222-2222-4222-8222-222222222222'::uuid
      )
  ),
  2::bigint,
  'both operator grants leave immutable audit events'
);
select is(
  (
    select count(*)
    from private.invite_operator_events
    where event_type in ('invite_issued', 'invite_revoked')
      and invite_id = (select invite_id from issued_operator_invite)
  ),
  2::bigint,
  'invite issue and revoke both leave immutable audit events'
);
select is(
  (
    select count(*)
    from private.invite_operator_events as event
    cross join issued_operator_invite as issued
    where event.details::text like '%' || issued.code || '%'
  ),
  0::bigint,
  'plaintext invite codes never enter the audit log'
);

set local role service_role;
select lives_ok(
  $$select * from public.configure_invite_operator(
    'a1111111-1111-4111-8111-111111111111',
    '冰冰',
    false,
    'End of operator contract test'
  )$$,
  'service role can revoke an operator grant'
);
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', 'a1111111-1111-4111-8111-111111111111', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
select is(
  (select active from public.get_my_invite_operator_context()),
  false,
  'revoking the operator grant immediately removes the operator context'
);
select throws_ok(
  $$select * from public.list_my_issued_invites()$$,
  '42501',
  'invite_operator_required',
  'a revoked operator can no longer access prior invite operations'
);
select throws_ok(
  $$select * from public.issue_operator_invite(
    'after-revoke',
    array['tmua-full-access'],
    1,
    now() + interval '1 day',
    interval '30 days'
  )$$,
  '42501',
  'invite_operator_required',
  'a revoked operator cannot issue another invite'
);
reset role;

select * from finish();
rollback;
