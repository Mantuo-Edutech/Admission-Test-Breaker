create or replace function public.score_practice_submission(p_submission jsonb)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  revision_record public.practice_content_revisions%rowtype;
  public_payload jsonb;
  answer_key jsonb;
  question_key jsonb;
  question_payload jsonb;
  selected_answer text;
  selected_statements jsonb;
  response_mode text;
  scoring_kind text;
  correct_statements integer;
  statement_count integer;
  answered_statements integer;
  selected_index integer;
  correct_index integer;
  question_status text;
  question_points numeric;
  question_max_points numeric;
  question_time_ms bigint;
  question_marked boolean;
  statement_correct_answers jsonb;
  question_results jsonb := '[]'::jsonb;
  topic_results jsonb;
  longest_question_ids jsonb;
  score numeric := 0;
  max_score numeric := 0;
  correct_count integer := 0;
  partial_count integer := 0;
  incorrect_count integer := 0;
  unanswered_count integer := 0;
  total_active_ms bigint := 0;
  total_questions integer := 0;
begin
  if jsonb_typeof(p_submission) <> 'object'
    or octet_length(p_submission::text) > 1048576
    or p_submission->>'schemaVersion' <> '3'
    or p_submission->>'status' not in ('submitted', 'expired')
    or p_submission->>'id' !~ '^ses_[A-Za-z0-9_-]+$'
    or p_submission->>'paperId' !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
    or p_submission->>'paperRevisionId' !~ '^[a-z0-9]+(?:-[a-z0-9]+)*-r[1-9][0-9]*$'
    or p_submission->>'contentDigest' !~ '^[a-f0-9]{64}$'
    or jsonb_typeof(p_submission->'answers') <> 'object'
    or jsonb_typeof(p_submission->'timingByQuestionMs') <> 'object'
    or jsonb_typeof(p_submission->'markedQuestionIds') <> 'array' then
    raise exception 'practice_submission_invalid' using errcode = '22023';
  end if;

  select revision.*
  into revision_record
  from public.practice_content_revisions as revision
  where revision.paper_revision_id = p_submission->>'paperRevisionId'
    and revision.paper_id = p_submission->>'paperId'
    and revision.content_digest = p_submission->>'contentDigest'
    and revision.publication_status = 'published';

  if revision_record.paper_revision_id is null then
    raise exception 'practice_content_revision_invalid' using errcode = '22023';
  end if;

  select payload.payload, key.answer_key
  into public_payload, answer_key
  from private.practice_paper_payloads as payload
  join private.practice_paper_answer_keys as key using (paper_revision_id)
  where payload.paper_revision_id = revision_record.paper_revision_id;

  if public_payload is null or answer_key is null then
    raise exception 'practice_scoring_material_unavailable' using errcode = 'P0002';
  end if;

  for question_key, question_payload in
    select key_item.value, payload_item.value
    from jsonb_array_elements(answer_key->'questions') with ordinality as key_item(value, ordinal)
    join jsonb_array_elements(public_payload->'questions') with ordinality as payload_item(value, ordinal)
      using (ordinal)
    order by key_item.ordinal
  loop
    if question_key->>'questionId' <> question_payload->>'id' then
      raise exception 'practice_scoring_material_misaligned';
    end if;

    total_questions := total_questions + 1;
    selected_answer := p_submission->'answers'->>(question_key->>'questionId');
    response_mode := coalesce(question_key->>'responseMode', 'single-choice');
    scoring_kind := question_key->'scoring'->>'kind';
    question_points := 0;
    question_max_points := case when scoring_kind = 'statement-set-two-point' then 2 else 1 end;

    if selected_answer is null then
      question_status := 'unanswered';
    elsif response_mode = 'statement-set' then
      begin
        selected_statements := selected_answer::jsonb;
      exception when others then
        selected_statements := '{}'::jsonb;
      end;
      if jsonb_typeof(selected_statements) <> 'object' then
        selected_statements := '{}'::jsonb;
      end if;

      select
        count(*)::integer,
        count(*) filter (
          where selected_statements ? (statement->>'id')
            and selected_statements->>(statement->>'id') in ('yes', 'no')
        )::integer,
        count(*) filter (
          where selected_statements->>(statement->>'id') = statement->>'correctAnswer'
        )::integer
      into statement_count, answered_statements, correct_statements
      from jsonb_array_elements(question_key->'statements') as item(statement);

      question_points := case
        when statement_count > 0
          and answered_statements = statement_count
          and correct_statements = statement_count then 2
        when statement_count > 0
          and answered_statements = statement_count
          and correct_statements = statement_count - 1 then 1
        else 0
      end;
      question_status := case
        when question_points = 2 then 'correct'
        when question_points = 1 then 'partial'
        else 'incorrect'
      end;
    elsif response_mode = 'most-least-choice' then
      question_points := case when selected_answer = question_key->>'correctAnswer' then 1 else 0 end;
      question_status := case when question_points = 1 then 'correct' else 'incorrect' end;
    elsif scoring_kind = 'adjacent-partial' then
      select item.ordinal::integer
      into selected_index
      from jsonb_array_elements_text(question_key->'scoring'->'order') with ordinality as item(value, ordinal)
      where item.value = selected_answer;
      select item.ordinal::integer
      into correct_index
      from jsonb_array_elements_text(question_key->'scoring'->'order') with ordinality as item(value, ordinal)
      where item.value = question_key->>'correctAnswer';
      question_points := case
        when selected_index is null or correct_index is null then 0
        when abs(selected_index - correct_index) = 0 then 1
        when abs(selected_index - correct_index) = 1 then 0.5
        else 0
      end;
      question_status := case
        when question_points = 1 then 'correct'
        when question_points = 0.5 then 'partial'
        else 'incorrect'
      end;
    else
      question_points := case when selected_answer = question_key->>'correctAnswer' then 1 else 0 end;
      question_status := case when question_points = 1 then 'correct' else 'incorrect' end;
    end if;

    if coalesce(p_submission->'timingByQuestionMs'->>(question_key->>'questionId'), '') ~ '^[0-9]{1,12}$' then
      question_time_ms := (p_submission->'timingByQuestionMs'->>(question_key->>'questionId'))::bigint;
    else
      question_time_ms := 0;
    end if;
    question_marked := p_submission->'markedQuestionIds' ? (question_key->>'questionId');
    select coalesce(jsonb_object_agg(statement->>'id', statement->>'correctAnswer'), '{}'::jsonb)
    into statement_correct_answers
    from jsonb_array_elements(coalesce(question_key->'statements', '[]'::jsonb)) as item(statement);

    score := score + question_points;
    max_score := max_score + question_max_points;
    total_active_ms := total_active_ms + question_time_ms;
    correct_count := correct_count + case when question_status = 'correct' then 1 else 0 end;
    partial_count := partial_count + case when question_status = 'partial' then 1 else 0 end;
    incorrect_count := incorrect_count + case when question_status = 'incorrect' then 1 else 0 end;
    unanswered_count := unanswered_count + case when question_status = 'unanswered' then 1 else 0 end;

    question_results := question_results || jsonb_build_array(jsonb_build_object(
      'questionId', question_key->>'questionId',
      'number', (question_payload->>'number')::integer,
      'selectedAnswer', selected_answer,
      'correctAnswer', question_key->>'correctAnswer',
      'statementCorrectAnswers', statement_correct_answers,
      'status', question_status,
      'points', question_points,
      'maxPoints', question_max_points,
      'timeMs', question_time_ms,
      'marked', question_marked,
      'knowledgeTags', coalesce(question_payload->'knowledgeTags', '[]'::jsonb),
      'skillTags', coalesce(question_payload->'skillTags', '[]'::jsonb)
    ));
  end loop;

  select coalesce(jsonb_agg(topic order by topic->>'knowledgeTag'), '[]'::jsonb)
  into topic_results
  from (
    select jsonb_build_object(
      'knowledgeTag', tag.value,
      'totalQuestions', count(*),
      'attemptedCount', count(*) filter (where result->>'status' <> 'unanswered'),
      'correctCount', count(*) filter (where result->>'status' = 'correct'),
      'activeMs', coalesce(sum((result->>'timeMs')::bigint), 0)
    ) as topic
    from jsonb_array_elements(question_results) as question(result)
    cross join jsonb_array_elements_text(question.result->'knowledgeTags') as tag(value)
    group by tag.value
  ) as topics;

  select coalesce(jsonb_agg(question_id order by time_ms desc, question_number asc), '[]'::jsonb)
  into longest_question_ids
  from (
    select
      result->>'questionId' as question_id,
      (result->>'timeMs')::bigint as time_ms,
      (result->>'number')::integer as question_number
    from jsonb_array_elements(question_results) as question(result)
    where (result->>'timeMs')::bigint > 0
    order by time_ms desc, question_number asc
    limit 3
  ) as longest;

  return jsonb_build_object(
    'sessionId', p_submission->>'id',
    'paperId', revision_record.paper_id,
    'paperRevisionId', revision_record.paper_revision_id,
    'contentDigest', revision_record.content_digest,
    'score', score,
    'maxScore', max_score,
    'totalQuestions', total_questions,
    'percentage', case when max_score = 0 then 0 else round((score / max_score) * 100, 1) end,
    'correctCount', correct_count,
    'partialCount', partial_count,
    'incorrectCount', incorrect_count,
    'unansweredCount', unanswered_count,
    'totalActiveMs', total_active_ms,
    'averagePerQuestionMs', case
      when total_questions = 0 then 0
      else round(total_active_ms::numeric / total_questions)::bigint
    end,
    'longestQuestionIds', longest_question_ids,
    'questions', question_results,
    'topics', topic_results
  );
end;
$$;

revoke all on function public.score_practice_submission(jsonb) from public;
grant execute on function public.score_practice_submission(jsonb) to anon, authenticated;

comment on function public.score_practice_submission(jsonb) is
  'Scores one finalized immutable practice session server-side. It returns per-attempt feedback, never a bulk answer-key payload.';
