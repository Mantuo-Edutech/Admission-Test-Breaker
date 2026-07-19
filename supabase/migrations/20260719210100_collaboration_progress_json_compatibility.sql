-- Forward-compatible repair for local databases that applied the collaboration
-- migration before the PostgreSQL JSON object key-count implementation was fixed.

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

revoke all on function public.get_shared_learning_progress(text, text) from public, anon;
grant execute on function public.get_shared_learning_progress(text, text) to authenticated;
