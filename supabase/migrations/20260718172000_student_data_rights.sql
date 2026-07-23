create or replace function public.export_my_learning_data()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  current_learner_space_id text;
  current_platform_user_id text;
  current_email text;
  result jsonb;
begin
  if current_user_id is null then
    raise exception 'authentication_required' using errcode = '42501';
  end if;

  select
    learner_space.id,
    app_user.platform_user_id,
    auth_user.email
  into
    current_learner_space_id,
    current_platform_user_id,
    current_email
  from public.learner_spaces as learner_space
  join public.app_users as app_user
    on app_user.auth_user_id = learner_space.owner_user_id
  join auth.users as auth_user
    on auth_user.id = app_user.auth_user_id
  where learner_space.owner_user_id = current_user_id;

  if current_learner_space_id is null then
    raise exception 'learner_space_not_found' using errcode = '42501';
  end if;

  select jsonb_build_object(
    'schemaVersion', 1,
    'exportedAt', to_jsonb(now()),
    'account', jsonb_build_object(
      'email', current_email,
      'platformUserId', current_platform_user_id,
      'learnerSpaceId', current_learner_space_id
    ),
    'preparationProfile', (
      select profile.profile
      from public.preparation_profiles as profile
      where profile.learner_space_id = current_learner_space_id
    ),
    'practiceSessions', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'snapshot', session.snapshot,
          'createdAt', session.created_at,
          'updatedAt', session.updated_at,
          'events', coalesce((
            select jsonb_agg(
              jsonb_build_object(
                'id', event.id,
                'sequence', event.sequence,
                'schemaVersion', event.schema_version,
                'type', event.event_type,
                'actor', event.actor,
                'occurredAt', event.occurred_at,
                'receivedAt', event.received_at,
                'payload', event.payload
              ) order by event.sequence
            )
            from public.learning_events as event
            where event.session_id = session.id
              and event.learner_space_id = current_learner_space_id
          ), '[]'::jsonb)
        ) order by session.started_at
      )
      from public.practice_sessions as session
      where session.learner_space_id = current_learner_space_id
    ), '[]'::jsonb),
    'contentEntitlements', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'packageId', entitlement.package_id,
          'source', entitlement.source,
          'grantedAt', entitlement.granted_at,
          'expiresAt', entitlement.expires_at,
          'revokedAt', entitlement.revoked_at
        ) order by entitlement.granted_at
      )
      from public.user_entitlements as entitlement
      where entitlement.user_id = current_user_id
    ), '[]'::jsonb)
  ) into result;

  return result;
end;
$$;

create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
begin
  if current_user_id is null then
    raise exception 'authentication_required' using errcode = '42501';
  end if;

  delete from auth.users as auth_user
  where auth_user.id = current_user_id;

  if not found then
    raise exception 'account_not_found' using errcode = '42501';
  end if;
end;
$$;

revoke all on function public.export_my_learning_data() from public, anon;
grant execute on function public.export_my_learning_data() to authenticated;
revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
