-- Extend the authenticated student export without duplicating the existing
-- account/profile/session/feedback export implementation.

alter function public.export_my_learning_data() set schema private;
alter function private.export_my_learning_data() rename to export_my_learning_data_before_collaboration;
revoke all on function private.export_my_learning_data_before_collaboration()
  from public, anon, authenticated, service_role;

create or replace function public.export_my_learning_data()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  current_learner_space_id text;
  base_export jsonb;
begin
  if current_user_id is null then
    raise exception 'authentication_required' using errcode = '42501';
  end if;

  select learner_space.id into current_learner_space_id
  from public.learner_spaces as learner_space
  where learner_space.owner_user_id = current_user_id
    and learner_space.status = 'active';
  if current_learner_space_id is null then
    raise exception 'learner_space_not_found' using errcode = '42501';
  end if;

  base_export := private.export_my_learning_data_before_collaboration();
  return (base_export - 'schemaVersion') || jsonb_build_object(
    'schemaVersion', 4,
    'collaborationInvites', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', invite.id,
          'subjectKind', invite.subject_kind,
          'scopes', invite.scopes,
          'examIds', invite.exam_ids,
          'status', case
            when invite.status = 'pending' and invite.invite_expires_at <= now() then 'expired'
            else invite.status
          end,
          'createdAt', invite.created_at,
          'inviteExpiresAt', invite.invite_expires_at,
          'redeemedAt', invite.redeemed_at,
          'revokedAt', invite.revoked_at
        ) order by invite.created_at
      )
      from private.collaboration_invites as invite
      where invite.learner_space_id = current_learner_space_id
        and invite.created_by_user_id = current_user_id
    ), '[]'::jsonb),
    'collaborationGrants', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', learner_grant.id,
          'subjectKind', learner_grant.subject_kind,
          'subjectReference', subject_user.platform_user_id,
          'scopes', learner_grant.scopes,
          'examIds', learner_grant.exam_ids,
          'startsAt', learner_grant.starts_at,
          'expiresAt', learner_grant.expires_at,
          'revokedAt', learner_grant.revoked_at
        ) order by learner_grant.created_at
      )
      from private.learner_grants as learner_grant
      join public.app_users as subject_user
        on subject_user.auth_user_id = learner_grant.subject_user_id
      where learner_grant.learner_space_id = current_learner_space_id
        and learner_grant.granted_by_user_id = current_user_id
    ), '[]'::jsonb),
    'collaborationArtifacts', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', artifact.id,
          'grantId', artifact.grant_id,
          'kind', artifact.kind,
          'examId', artifact.exam_id,
          'title', artifact.title,
          'body', artifact.body,
          'dueAt', artifact.due_at,
          'authorReference', artifact.author_reference,
          'createdAt', artifact.created_at
        ) order by artifact.created_at
      )
      from private.collaboration_artifacts as artifact
      where artifact.learner_space_id = current_learner_space_id
    ), '[]'::jsonb),
    'collaborationAudit', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'eventType', event.event_type,
          'grantId', event.grant_id,
          'actorReference', event.actor_reference,
          'examId', event.exam_id,
          'occurredAt', event.occurred_at
        ) order by event.occurred_at
      )
      from private.collaboration_audit_events as event
      where event.learner_space_id = current_learner_space_id
    ), '[]'::jsonb)
  );
end;
$$;

revoke all on function public.export_my_learning_data() from public, anon;
grant execute on function public.export_my_learning_data() to authenticated;
