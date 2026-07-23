-- Student-controlled teacher/parent collaboration.
-- A collaboration code is created by the learner, contains no email address,
-- and becomes a bounded, revocable grant only after the recipient redeems it.

create table private.collaboration_invites (
  id text primary key default ('civ_' || replace(extensions.gen_random_uuid()::text, '-', '')),
  code_digest bytea not null unique,
  learner_space_id text not null references public.learner_spaces (id) on delete cascade,
  created_by_user_id uuid not null references public.app_users (auth_user_id) on delete cascade,
  subject_kind text not null,
  scopes text[] not null,
  exam_ids text[] not null,
  grant_duration interval not null,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  invite_expires_at timestamptz not null default (now() + interval '7 days'),
  redeemed_at timestamptz,
  redeemed_by_reference text,
  revoked_at timestamptz,
  constraint collaboration_invites_id_format check (id ~ '^civ_[0-9a-f]{32}$'),
  constraint collaboration_invites_subject_kind check (subject_kind in ('teacher', 'parent')),
  constraint collaboration_invites_status check (status in ('pending', 'redeemed', 'revoked')),
  constraint collaboration_invites_expiry check (invite_expires_at > created_at),
  constraint collaboration_invites_duration check (
    grant_duration >= interval '1 day' and grant_duration <= interval '180 days'
  ),
  constraint collaboration_invites_redeem_consistency check (
    (status = 'pending' and redeemed_at is null and redeemed_by_reference is null and revoked_at is null)
    or (status = 'redeemed' and redeemed_at is not null and redeemed_by_reference is not null and revoked_at is null)
    or (status = 'revoked' and redeemed_at is null and redeemed_by_reference is null and revoked_at is not null)
  )
);

create table private.learner_grants (
  id text primary key default ('grt_' || replace(extensions.gen_random_uuid()::text, '-', '')),
  source_invite_id text not null unique references private.collaboration_invites (id) on delete cascade,
  learner_space_id text not null references public.learner_spaces (id) on delete cascade,
  granted_by_user_id uuid not null references public.app_users (auth_user_id) on delete cascade,
  subject_user_id uuid not null references public.app_users (auth_user_id) on delete cascade,
  subject_kind text not null,
  scopes text[] not null,
  exam_ids text[] not null,
  starts_at timestamptz not null default now(),
  expires_at timestamptz not null,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  constraint learner_grants_id_format check (id ~ '^grt_[0-9a-f]{32}$'),
  constraint learner_grants_subject_kind check (subject_kind in ('teacher', 'parent')),
  constraint learner_grants_expiry check (expires_at > starts_at),
  constraint learner_grants_revoke_order check (revoked_at is null or revoked_at >= starts_at),
  constraint learner_grants_no_self_grant check (granted_by_user_id <> subject_user_id)
);

create index learner_grants_owner_idx
  on private.learner_grants (learner_space_id, created_at desc);
create index learner_grants_subject_idx
  on private.learner_grants (subject_user_id, expires_at desc)
  where revoked_at is null;

create table private.collaboration_artifacts (
  id text primary key default ('car_' || replace(extensions.gen_random_uuid()::text, '-', '')),
  grant_id text not null references private.learner_grants (id) on delete cascade,
  learner_space_id text not null references public.learner_spaces (id) on delete cascade,
  author_user_id uuid not null references public.app_users (auth_user_id) on delete cascade,
  author_reference text not null,
  kind text not null,
  exam_id text not null,
  title text not null,
  body text not null,
  due_at timestamptz,
  created_at timestamptz not null default now(),
  constraint collaboration_artifacts_id_format check (id ~ '^car_[0-9a-f]{32}$'),
  constraint collaboration_artifacts_kind check (kind in ('annotation', 'plan', 'assignment')),
  constraint collaboration_artifacts_exam check (exam_id in ('tmua', 'esat', 'tara', 'lnat', 'ucat')),
  constraint collaboration_artifacts_title check (char_length(trim(title)) between 2 and 80),
  constraint collaboration_artifacts_body check (char_length(trim(body)) between 1 and 2000),
  constraint collaboration_artifacts_due_order check (due_at is null or due_at > created_at)
);

create index collaboration_artifacts_grant_idx
  on private.collaboration_artifacts (grant_id, created_at desc);

create table private.collaboration_audit_events (
  id uuid primary key default extensions.gen_random_uuid(),
  learner_space_id text not null references public.learner_spaces (id) on delete cascade,
  grant_id text references private.learner_grants (id) on delete set null,
  actor_reference text not null,
  event_type text not null,
  exam_id text,
  occurred_at timestamptz not null default now(),
  constraint collaboration_audit_actor check (actor_reference ~ '^usr_[0-9a-f]{32}$'),
  constraint collaboration_audit_event check (
    event_type in (
      'invite_created', 'invite_revoked', 'grant_redeemed', 'grant_revoked',
      'progress_viewed', 'responses_viewed', 'annotation_created',
      'plan_created', 'assignment_created'
    )
  ),
  constraint collaboration_audit_exam check (
    exam_id is null or exam_id in ('tmua', 'esat', 'tara', 'lnat', 'ucat')
  )
);

create index collaboration_audit_owner_idx
  on private.collaboration_audit_events (learner_space_id, occurred_at desc);

alter table private.collaboration_invites enable row level security;
alter table private.learner_grants enable row level security;
alter table private.collaboration_artifacts enable row level security;
alter table private.collaboration_audit_events enable row level security;

revoke all on table private.collaboration_invites from public, anon, authenticated, service_role;
revoke all on table private.learner_grants from public, anon, authenticated, service_role;
revoke all on table private.collaboration_artifacts from public, anon, authenticated, service_role;
revoke all on table private.collaboration_audit_events from public, anon, authenticated, service_role;

create or replace function private.collaboration_scopes_valid(p_scopes text[])
returns boolean
language sql
immutable
set search_path = ''
as $$
  select p_scopes is not null
    and cardinality(p_scopes) between 1 and 5
    and cardinality(p_scopes) = (
      select count(distinct scope_value)::integer from unnest(p_scopes) as item(scope_value)
    )
    and not exists (
      select 1 from unnest(p_scopes) as item(scope_value)
      where scope_value not in (
        'progress:read', 'responses:read', 'annotations:write',
        'plans:write', 'assignments:write'
      )
    );
$$;

create or replace function private.collaboration_exams_valid(p_exam_ids text[])
returns boolean
language sql
immutable
set search_path = ''
as $$
  select p_exam_ids is not null
    and cardinality(p_exam_ids) between 1 and 5
    and cardinality(p_exam_ids) = (
      select count(distinct exam_value)::integer from unnest(p_exam_ids) as item(exam_value)
    )
    and not exists (
      select 1 from unnest(p_exam_ids) as item(exam_value)
      where exam_value not in ('tmua', 'esat', 'tara', 'lnat', 'ucat')
    );
$$;

alter table private.collaboration_invites
  add constraint collaboration_invites_scopes check (private.collaboration_scopes_valid(scopes)),
  add constraint collaboration_invites_exams check (private.collaboration_exams_valid(exam_ids));
alter table private.learner_grants
  add constraint learner_grants_scopes check (private.collaboration_scopes_valid(scopes)),
  add constraint learner_grants_exams check (private.collaboration_exams_valid(exam_ids));

create or replace function private.collaboration_code_digest(p_code text)
returns bytea
language plpgsql
immutable
strict
set search_path = ''
as $$
declare
  normalized text;
begin
  normalized := upper(regexp_replace(trim(p_code), '[^A-Za-z0-9]', '', 'g'));
  if length(normalized) < 24 or length(normalized) > 64 then
    raise exception 'collaboration_code_invalid' using errcode = '22023';
  end if;
  return extensions.digest(convert_to(normalized, 'UTF8'), 'sha256');
end;
$$;

create or replace function private.current_collaboration_actor_reference()
returns text
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  actor_reference text;
begin
  select app_user.platform_user_id into actor_reference
  from public.app_users as app_user
  where app_user.auth_user_id = (select auth.uid())
    and app_user.deleted_at is null;
  if actor_reference is null then
    raise exception 'authentication_required' using errcode = '42501';
  end if;
  return actor_reference;
end;
$$;

create or replace function private.current_owned_learner_space()
returns text
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  owned_space text;
begin
  select learner_space.id into owned_space
  from public.learner_spaces as learner_space
  where learner_space.owner_user_id = (select auth.uid())
    and learner_space.status = 'active';
  if owned_space is null then
    raise exception 'learner_space_not_found' using errcode = '42501';
  end if;
  return owned_space;
end;
$$;

create or replace function private.record_collaboration_audit(
  p_learner_space_id text,
  p_grant_id text,
  p_event_type text,
  p_exam_id text default null
)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  insert into private.collaboration_audit_events (
    learner_space_id, grant_id, actor_reference, event_type, exam_id
  ) values (
    p_learner_space_id,
    p_grant_id,
    private.current_collaboration_actor_reference(),
    p_event_type,
    p_exam_id
  );
end;
$$;

revoke all on function private.collaboration_scopes_valid(text[]) from public, anon, authenticated;
revoke all on function private.collaboration_exams_valid(text[]) from public, anon, authenticated;
revoke all on function private.collaboration_code_digest(text) from public, anon, authenticated;
revoke all on function private.current_collaboration_actor_reference() from public, anon, authenticated;
revoke all on function private.current_owned_learner_space() from public, anon, authenticated;
revoke all on function private.record_collaboration_audit(text, text, text, text) from public, anon, authenticated;

create or replace function public.issue_my_collaboration_invite(
  p_subject_kind text,
  p_scopes text[],
  p_exam_ids text[],
  p_grant_days integer
)
returns table (invite_id text, code text, invite_expires_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  owned_space text;
  generated_code text;
  created_invite_id text;
  created_expiry timestamptz;
begin
  if current_user_id is null then
    raise exception 'authentication_required' using errcode = '42501';
  end if;
  if p_subject_kind not in ('teacher', 'parent') then
    raise exception 'collaboration_subject_invalid' using errcode = '22023';
  end if;
  if not private.collaboration_scopes_valid(p_scopes) then
    raise exception 'collaboration_scopes_invalid' using errcode = '22023';
  end if;
  if not private.collaboration_exams_valid(p_exam_ids) then
    raise exception 'collaboration_exams_invalid' using errcode = '22023';
  end if;
  if p_grant_days is null or p_grant_days < 1 or p_grant_days > 180 then
    raise exception 'collaboration_duration_invalid' using errcode = '22023';
  end if;

  owned_space := private.current_owned_learner_space();
  generated_code := 'MTSHARE-' || upper(encode(extensions.gen_random_bytes(12), 'hex'));

  insert into private.collaboration_invites (
    code_digest, learner_space_id, created_by_user_id, subject_kind,
    scopes, exam_ids, grant_duration
  ) values (
    private.collaboration_code_digest(generated_code),
    owned_space,
    current_user_id,
    p_subject_kind,
    p_scopes,
    p_exam_ids,
    make_interval(days => p_grant_days)
  )
  returning id, collaboration_invites.invite_expires_at
  into created_invite_id, created_expiry;

  perform private.record_collaboration_audit(owned_space, null, 'invite_created', null);
  return query select created_invite_id, generated_code, created_expiry;
end;
$$;

create or replace function public.list_my_collaboration_invites()
returns table (
  invite_id text,
  subject_kind text,
  scopes text[],
  exam_ids text[],
  status text,
  created_at timestamptz,
  invite_expires_at timestamptz,
  redeemed_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    invite.id,
    invite.subject_kind,
    invite.scopes,
    invite.exam_ids,
    case
      when invite.status = 'pending' and invite.invite_expires_at <= now() then 'expired'
      else invite.status
    end,
    invite.created_at,
    invite.invite_expires_at,
    invite.redeemed_at
  from private.collaboration_invites as invite
  where invite.created_by_user_id = (select auth.uid())
    and invite.learner_space_id = private.current_owned_learner_space()
  order by invite.created_at desc
  limit 100;
$$;

create or replace function public.cancel_my_collaboration_invite(p_invite_id text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  owned_space text := private.current_owned_learner_space();
begin
  update private.collaboration_invites as invite
  set status = 'revoked', revoked_at = now()
  where invite.id = p_invite_id
    and invite.learner_space_id = owned_space
    and invite.created_by_user_id = (select auth.uid())
    and invite.status = 'pending';
  if not found then
    raise exception 'collaboration_invite_not_found' using errcode = '22023';
  end if;
  perform private.record_collaboration_audit(owned_space, null, 'invite_revoked', null);
end;
$$;

create or replace function public.list_my_collaboration_grants()
returns table (
  grant_id text,
  subject_kind text,
  subject_reference text,
  scopes text[],
  exam_ids text[],
  starts_at timestamptz,
  expires_at timestamptz,
  revoked_at timestamptz,
  status text
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    learner_grant.id,
    learner_grant.subject_kind,
    subject_user.platform_user_id,
    learner_grant.scopes,
    learner_grant.exam_ids,
    learner_grant.starts_at,
    learner_grant.expires_at,
    learner_grant.revoked_at,
    case
      when learner_grant.revoked_at is not null then 'revoked'
      when learner_grant.expires_at <= now() then 'expired'
      else 'active'
    end
  from private.learner_grants as learner_grant
  join public.app_users as subject_user
    on subject_user.auth_user_id = learner_grant.subject_user_id
  where learner_grant.granted_by_user_id = (select auth.uid())
    and learner_grant.learner_space_id = private.current_owned_learner_space()
  order by learner_grant.created_at desc
  limit 100;
$$;

create or replace function public.revoke_my_collaboration_grant(p_grant_id text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  owned_space text := private.current_owned_learner_space();
begin
  update private.learner_grants as learner_grant
  set revoked_at = now()
  where learner_grant.id = p_grant_id
    and learner_grant.learner_space_id = owned_space
    and learner_grant.granted_by_user_id = (select auth.uid())
    and learner_grant.revoked_at is null;
  if not found then
    raise exception 'collaboration_grant_not_found' using errcode = '22023';
  end if;
  perform private.record_collaboration_audit(owned_space, p_grant_id, 'grant_revoked', null);
end;
$$;

create or replace function public.list_my_collaboration_audit(p_limit integer default 50)
returns table (
  event_type text,
  grant_id text,
  actor_reference text,
  exam_id text,
  occurred_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  owned_space text := private.current_owned_learner_space();
begin
  if p_limit is null or p_limit < 1 or p_limit > 100 then
    raise exception 'collaboration_audit_limit_invalid' using errcode = '22023';
  end if;
  return query
    select event.event_type, event.grant_id, event.actor_reference, event.exam_id, event.occurred_at
    from private.collaboration_audit_events as event
    where event.learner_space_id = owned_space
    order by event.occurred_at desc
    limit p_limit;
end;
$$;

create or replace function public.redeem_collaboration_invite(p_code text)
returns table (
  grant_id text,
  learner_reference text,
  subject_kind text,
  scopes text[],
  exam_ids text[],
  expires_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  invite private.collaboration_invites%rowtype;
  created_grant_id text;
  owner_reference text;
  grant_expiry timestamptz;
begin
  if current_user_id is null then
    raise exception 'authentication_required' using errcode = '42501';
  end if;

  begin
    select candidate.* into invite
    from private.collaboration_invites as candidate
    where candidate.code_digest = private.collaboration_code_digest(p_code)
    for update;
  exception when sqlstate '22023' then
    raise exception 'collaboration_code_invalid' using errcode = '22023';
  end;

  if invite.id is null then
    raise exception 'collaboration_code_invalid' using errcode = '22023';
  end if;

  if invite.status = 'redeemed' then
    return query
      select
        existing_grant.id,
        owner_user.platform_user_id,
        existing_grant.subject_kind,
        existing_grant.scopes,
        existing_grant.exam_ids,
        existing_grant.expires_at
      from private.learner_grants as existing_grant
      join public.learner_spaces as learner_space on learner_space.id = existing_grant.learner_space_id
      join public.app_users as owner_user on owner_user.auth_user_id = learner_space.owner_user_id
      where existing_grant.source_invite_id = invite.id
        and existing_grant.subject_user_id = current_user_id;
    if found then return; end if;
    raise exception 'collaboration_code_redeemed' using errcode = '22023';
  end if;

  if invite.status <> 'pending' or invite.invite_expires_at <= now() then
    raise exception 'collaboration_code_invalid' using errcode = '22023';
  end if;
  if invite.created_by_user_id = current_user_id then
    raise exception 'collaboration_self_grant_forbidden' using errcode = '42501';
  end if;

  grant_expiry := now() + invite.grant_duration;
  insert into private.learner_grants (
    source_invite_id, learner_space_id, granted_by_user_id, subject_user_id,
    subject_kind, scopes, exam_ids, expires_at
  ) values (
    invite.id, invite.learner_space_id, invite.created_by_user_id, current_user_id,
    invite.subject_kind, invite.scopes, invite.exam_ids, grant_expiry
  ) returning id into created_grant_id;

  update private.collaboration_invites
  set status = 'redeemed',
      redeemed_at = now(),
      redeemed_by_reference = private.current_collaboration_actor_reference()
  where id = invite.id;

  perform private.record_collaboration_audit(invite.learner_space_id, created_grant_id, 'grant_redeemed', null);

  select app_user.platform_user_id into owner_reference
  from public.learner_spaces as learner_space
  join public.app_users as app_user on app_user.auth_user_id = learner_space.owner_user_id
  where learner_space.id = invite.learner_space_id;

  return query select
    created_grant_id, owner_reference, invite.subject_kind,
    invite.scopes, invite.exam_ids, grant_expiry;
end;
$$;

create or replace function public.list_my_shared_learner_spaces()
returns table (
  grant_id text,
  learner_reference text,
  subject_kind text,
  scopes text[],
  exam_ids text[],
  expires_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    learner_grant.id,
    owner_user.platform_user_id,
    learner_grant.subject_kind,
    learner_grant.scopes,
    learner_grant.exam_ids,
    learner_grant.expires_at
  from private.learner_grants as learner_grant
  join public.learner_spaces as learner_space on learner_space.id = learner_grant.learner_space_id
  join public.app_users as owner_user on owner_user.auth_user_id = learner_space.owner_user_id
  where learner_grant.subject_user_id = (select auth.uid())
    and learner_grant.revoked_at is null
    and learner_grant.starts_at <= now()
    and learner_grant.expires_at > now()
  order by learner_grant.created_at desc;
$$;

create or replace function private.require_active_collaboration_grant(
  p_grant_id text,
  p_scope text,
  p_exam_id text
)
returns text
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  granted_space text;
begin
  if p_exam_id not in ('tmua', 'esat', 'tara', 'lnat', 'ucat') then
    raise exception 'collaboration_exam_invalid' using errcode = '22023';
  end if;
  select learner_grant.learner_space_id into granted_space
  from private.learner_grants as learner_grant
  where learner_grant.id = p_grant_id
    and learner_grant.subject_user_id = (select auth.uid())
    and learner_grant.revoked_at is null
    and learner_grant.starts_at <= now()
    and learner_grant.expires_at > now()
    and p_scope = any(learner_grant.scopes)
    and p_exam_id = any(learner_grant.exam_ids);
  if granted_space is null then
    raise exception 'collaboration_grant_required' using errcode = '42501';
  end if;
  return granted_space;
end;
$$;

revoke all on function private.require_active_collaboration_grant(text, text, text)
  from public, anon, authenticated;

create or replace function public.get_shared_learning_progress(
  p_grant_id text,
  p_exam_id text
)
returns table (
  session_id text,
  paper_id text,
  status text,
  started_at timestamptz,
  submitted_at timestamptz,
  answered_count integer,
  active_ms bigint,
  answer_changes bigint,
  last_activity_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  granted_space text;
begin
  granted_space := private.require_active_collaboration_grant(p_grant_id, 'progress:read', p_exam_id);
  perform private.record_collaboration_audit(granted_space, p_grant_id, 'progress_viewed', p_exam_id);
  return query
    select
      session.id,
      session.paper_id,
      session.status,
      session.started_at,
      session.submitted_at,
      case when jsonb_typeof(session.snapshot->'answers') = 'object'
        then (select count(*)::integer from jsonb_object_keys(session.snapshot->'answers')) else 0 end,
      coalesce((
        select sum(greatest(0, timing.value::bigint))
        from jsonb_each_text(coalesce(session.snapshot->'timingByQuestionMs', '{}'::jsonb)) as timing(key, value)
      ), 0)::bigint,
      (select count(*) from public.learning_events as event
        where event.learner_space_id = granted_space
          and event.session_id = session.id
          and event.event_type = 'answer_changed'),
      coalesce((select max(event.occurred_at) from public.learning_events as event
        where event.learner_space_id = granted_space and event.session_id = session.id), session.updated_at)
    from public.practice_sessions as session
    where session.learner_space_id = granted_space
      and split_part(session.paper_id, '-', 1) = p_exam_id
    order by session.updated_at desc
    limit 100;
end;
$$;

create or replace function public.list_shared_learning_responses(
  p_grant_id text,
  p_exam_id text
)
returns table (
  session_id text,
  paper_id text,
  status text,
  started_at timestamptz,
  submitted_at timestamptz,
  answers jsonb,
  timing_by_question_ms jsonb
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  granted_space text;
begin
  granted_space := private.require_active_collaboration_grant(p_grant_id, 'responses:read', p_exam_id);
  perform private.record_collaboration_audit(granted_space, p_grant_id, 'responses_viewed', p_exam_id);
  return query
    select
      session.id,
      session.paper_id,
      session.status,
      session.started_at,
      session.submitted_at,
      coalesce(session.snapshot->'answers', '{}'::jsonb),
      coalesce(session.snapshot->'timingByQuestionMs', '{}'::jsonb)
    from public.practice_sessions as session
    where session.learner_space_id = granted_space
      and split_part(session.paper_id, '-', 1) = p_exam_id
    order by session.updated_at desc
    limit 100;
end;
$$;

create or replace function public.list_collaboration_artifacts(p_grant_id text)
returns table (
  artifact_id text,
  grant_id text,
  kind text,
  exam_id text,
  title text,
  body text,
  due_at timestamptz,
  author_reference text,
  created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  grant_record private.learner_grants%rowtype;
begin
  select learner_grant.* into grant_record
  from private.learner_grants as learner_grant
  where learner_grant.id = p_grant_id;
  if grant_record.id is null then
    raise exception 'collaboration_grant_not_found' using errcode = '22023';
  end if;
  if grant_record.granted_by_user_id <> (select auth.uid()) and not (
    grant_record.subject_user_id = (select auth.uid())
    and grant_record.revoked_at is null
    and grant_record.starts_at <= now()
    and grant_record.expires_at > now()
  ) then
    raise exception 'collaboration_grant_required' using errcode = '42501';
  end if;
  return query
    select artifact.id, artifact.grant_id, artifact.kind, artifact.exam_id,
      artifact.title, artifact.body, artifact.due_at, artifact.author_reference, artifact.created_at
    from private.collaboration_artifacts as artifact
    where artifact.grant_id = p_grant_id
    order by artifact.created_at desc
    limit 100;
end;
$$;

create or replace function public.create_collaboration_artifact(
  p_grant_id text,
  p_kind text,
  p_exam_id text,
  p_title text,
  p_body text,
  p_due_at timestamptz default null
)
returns table (
  artifact_id text,
  grant_id text,
  kind text,
  exam_id text,
  title text,
  body text,
  due_at timestamptz,
  author_reference text,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  required_scope text;
  audit_event text;
  granted_space text;
  created_artifact private.collaboration_artifacts%rowtype;
begin
  required_scope := case p_kind
    when 'annotation' then 'annotations:write'
    when 'plan' then 'plans:write'
    when 'assignment' then 'assignments:write'
    else null
  end;
  audit_event := case p_kind
    when 'annotation' then 'annotation_created'
    when 'plan' then 'plan_created'
    when 'assignment' then 'assignment_created'
    else null
  end;
  if required_scope is null then
    raise exception 'collaboration_artifact_kind_invalid' using errcode = '22023';
  end if;
  if char_length(trim(coalesce(p_title, ''))) not between 2 and 80
    or char_length(trim(coalesce(p_body, ''))) not between 1 and 2000 then
    raise exception 'collaboration_artifact_content_invalid' using errcode = '22023';
  end if;
  if p_due_at is not null and p_due_at <= now() then
    raise exception 'collaboration_artifact_due_invalid' using errcode = '22023';
  end if;

  granted_space := private.require_active_collaboration_grant(p_grant_id, required_scope, p_exam_id);
  insert into private.collaboration_artifacts (
    grant_id, learner_space_id, author_user_id, author_reference,
    kind, exam_id, title, body, due_at
  ) values (
    p_grant_id, granted_space, (select auth.uid()), private.current_collaboration_actor_reference(),
    p_kind, p_exam_id, trim(p_title), trim(p_body), p_due_at
  ) returning * into created_artifact;

  perform private.record_collaboration_audit(granted_space, p_grant_id, audit_event, p_exam_id);
  return query select
    created_artifact.id, created_artifact.grant_id, created_artifact.kind,
    created_artifact.exam_id, created_artifact.title, created_artifact.body,
    created_artifact.due_at, created_artifact.author_reference, created_artifact.created_at;
end;
$$;

revoke all on function public.issue_my_collaboration_invite(text, text[], text[], integer) from public, anon;
revoke all on function public.list_my_collaboration_invites() from public, anon;
revoke all on function public.cancel_my_collaboration_invite(text) from public, anon;
revoke all on function public.list_my_collaboration_grants() from public, anon;
revoke all on function public.revoke_my_collaboration_grant(text) from public, anon;
revoke all on function public.list_my_collaboration_audit(integer) from public, anon;
revoke all on function public.redeem_collaboration_invite(text) from public, anon;
revoke all on function public.list_my_shared_learner_spaces() from public, anon;
revoke all on function public.get_shared_learning_progress(text, text) from public, anon;
revoke all on function public.list_shared_learning_responses(text, text) from public, anon;
revoke all on function public.list_collaboration_artifacts(text) from public, anon;
revoke all on function public.create_collaboration_artifact(text, text, text, text, text, timestamptz) from public, anon;

grant execute on function public.issue_my_collaboration_invite(text, text[], text[], integer) to authenticated;
grant execute on function public.list_my_collaboration_invites() to authenticated;
grant execute on function public.cancel_my_collaboration_invite(text) to authenticated;
grant execute on function public.list_my_collaboration_grants() to authenticated;
grant execute on function public.revoke_my_collaboration_grant(text) to authenticated;
grant execute on function public.list_my_collaboration_audit(integer) to authenticated;
grant execute on function public.redeem_collaboration_invite(text) to authenticated;
grant execute on function public.list_my_shared_learner_spaces() to authenticated;
grant execute on function public.get_shared_learning_progress(text, text) to authenticated;
grant execute on function public.list_shared_learning_responses(text, text) to authenticated;
grant execute on function public.list_collaboration_artifacts(text) to authenticated;
grant execute on function public.create_collaboration_artifact(text, text, text, text, text, timestamptz) to authenticated;
