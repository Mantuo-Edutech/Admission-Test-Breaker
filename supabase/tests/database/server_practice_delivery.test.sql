begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(25);

create or replace function pg_temp.tmua_submission(
  p_content_digest text default 'ad52e7968d9cc8459289f22d8239cd2e981d470e40ec2c14270a7d10e540caba'
)
returns jsonb
language sql
immutable
as $$
  select jsonb_build_object(
    'schemaVersion', 3,
    'id', 'ses_server_score_tmua',
    'paperId', 'tmua-2023-p1',
    'paperRevisionId', 'tmua-2023-p1-r1',
    'contentDigest', p_content_digest,
    'status', 'submitted',
    'answers', jsonb_build_object(
      'tmua-2023-p1-q01', 'F',
      'tmua-2023-p1-q02', 'B'
    ),
    'timingByQuestionMs', jsonb_build_object(
      'tmua-2023-p1-q01', 1000,
      'tmua-2023-p1-q02', 3000
    ),
    'markedQuestionIds', jsonb_build_array('tmua-2023-p1-q02')
  );
$$;

select is(
  (select count(*) from private.practice_paper_payloads),
  44::bigint,
  'all published paper revisions have a server-side question payload'
);
select is(
  (select count(*) from private.practice_paper_answer_keys),
  44::bigint,
  'all published paper revisions have a separate server-side answer key'
);
select is(
  (
    select count(*)
    from public.practice_content_revisions as revision
    join private.practice_paper_payloads as payload using (paper_revision_id)
    join private.practice_paper_answer_keys as answer_key using (paper_revision_id)
    where revision.publication_status = 'published'
  ),
  44::bigint,
  'revision metadata, question payload and answer key form a complete 44-paper set'
);

select ok(
  not has_table_privilege('anon', 'private.practice_paper_payloads', 'select'),
  'anonymous users cannot select the private payload table'
);
select ok(
  not has_table_privilege('authenticated', 'private.practice_paper_payloads', 'select'),
  'authenticated students cannot select the private payload table'
);
select ok(
  not has_table_privilege('anon', 'private.practice_paper_answer_keys', 'select'),
  'anonymous users cannot select answer keys'
);
select ok(
  not has_table_privilege('authenticated', 'private.practice_paper_answer_keys', 'select'),
  'authenticated students cannot select answer keys'
);
select ok(
  has_function_privilege('anon', 'public.get_practice_paper(text,text)', 'execute'),
  'anonymous users can load a free practice paper through the safe RPC'
);
select ok(
  has_function_privilege('anon', 'public.score_practice_submission(jsonb)', 'execute'),
  'anonymous users can obtain a basic result for a finalized free practice session'
);

set local role anon;

select is(
  public.get_practice_paper('tmua-2023-p1')->>'id',
  'tmua-2023-p1',
  'the latest published revision is available for free practice'
);
select is(
  public.get_practice_paper('tmua-2023-p1', 'tmua-2023-p1-r1')->'contentRef'->>'paperRevisionId',
  'tmua-2023-p1-r1',
  'an exact immutable revision can be loaded for a pinned session'
);
select is(
  jsonb_array_length(public.get_practice_paper('tmua-2023-p1')->'questions'),
  20,
  'the delivered TMUA paper contains all twenty questions'
);
select ok(
  public.get_practice_paper('tmua-2023-p1')::text not like '%correctAnswer%',
  'the free paper response contains no answer key field'
);
select ok(
  public.get_practice_paper('tmua-2023-p1')::text not like '%sourceAnswerPath%'
    and public.get_practice_paper('tmua-2023-p1')::text not like '%sourceQuestionPath%'
    and public.get_practice_paper('tmua-2023-p1')::text not like '%reviewStatus%',
  'the free paper response contains no source paths or internal review state'
);
select throws_ok(
  $$ select public.get_practice_paper('../tmua') $$,
  '22023',
  'practice_paper_reference_invalid',
  'invalid paper references are rejected before lookup'
);
select throws_ok(
  $$ select public.get_practice_paper('not-a-real-paper') $$,
  'P0002',
  'practice_paper_not_found',
  'unknown papers do not fall back to a different payload'
);
select is(
  public.score_practice_submission(pg_temp.tmua_submission())->>'paperRevisionId',
  'tmua-2023-p1-r1',
  'server scoring stays pinned to the submitted immutable revision'
);
select is(
  public.score_practice_submission(pg_temp.tmua_submission())->>'score',
  '1',
  'server scoring awards the correct TMUA answer without exposing a bulk key'
);
select is(
  public.score_practice_submission(pg_temp.tmua_submission())->>'maxScore',
  '20',
  'server scoring includes the full-paper maximum score'
);
select is(
  public.score_practice_submission(pg_temp.tmua_submission())->>'percentage',
  '5.0',
  'server scoring returns a deterministic basic percentage'
);
select is(
  public.score_practice_submission(pg_temp.tmua_submission())->>'totalActiveMs',
  '4000',
  'server scoring preserves per-question activity timing'
);
select throws_ok(
  $$ select public.score_practice_submission(pg_temp.tmua_submission(repeat('0', 64))) $$,
  '22023',
  'practice_content_revision_invalid',
  'server scoring rejects a forged content digest'
);
select is(
  public.score_practice_submission(jsonb_build_object(
    'schemaVersion', 3,
    'id', 'ses_server_score_ordinal',
    'paperId', 'ucat-situational-judgement-starter-v1',
    'paperRevisionId', 'ucat-situational-judgement-starter-v1-r1',
    'contentDigest', '41fd4c7a2ee10d8c3b2e653848618886402798da85fab711da9c6c73456c0f5a',
    'status', 'submitted',
    'answers', jsonb_build_object(
      'ucat-situational-judgement-starter-v1-q01', 'B',
      'ucat-situational-judgement-starter-v1-q02', 'D'
    ),
    'timingByQuestionMs', '{}'::jsonb,
    'markedQuestionIds', '[]'::jsonb
  ))->>'score',
  '1.5',
  'server scoring preserves UCAT adjacent partial-credit rules'
);

reset role;
insert into public.practice_content_revisions (
  paper_revision_id, paper_id, revision, exam, schema_version, content_digest,
  question_count, duration_minutes, publication_status, published_at
) values (
  'tmua-2023-p1-r2', 'tmua-2023-p1', 2, 'TMUA', 1, repeat('1', 64),
  20, 75, 'published', now()
);
insert into private.practice_paper_payloads (paper_revision_id, payload, payload_digest)
select
  'tmua-2023-p1-r2',
  jsonb_set(
    jsonb_set(
      jsonb_set(payload, '{contentRef,paperRevisionId}', '"tmua-2023-p1-r2"'::jsonb),
      '{contentRef,revision}',
      '2'::jsonb
    ),
    '{contentRef,contentDigest}',
    to_jsonb(repeat('1', 64))
  ),
  repeat('2', 64)
from private.practice_paper_payloads
where paper_revision_id = 'tmua-2023-p1-r1';
insert into private.practice_paper_answer_keys (paper_revision_id, answer_key, answer_key_digest)
select
  'tmua-2023-p1-r2',
  jsonb_set(
    jsonb_set(answer_key, '{paperRevisionId}', '"tmua-2023-p1-r2"'::jsonb),
    '{contentDigest}',
    to_jsonb(repeat('1', 64))
  ),
  repeat('3', 64)
from private.practice_paper_answer_keys
where paper_revision_id = 'tmua-2023-p1-r1';
set local role anon;

select is(
  public.get_practice_paper('tmua-2023-p1')->'contentRef'->>'paperRevisionId',
  'tmua-2023-p1-r2',
  'an unpinned new session receives the latest published revision'
);
select is(
  public.get_practice_paper('tmua-2023-p1', 'tmua-2023-p1-r1')->'contentRef'->>'contentDigest',
  'ad52e7968d9cc8459289f22d8239cd2e981d470e40ec2c14270a7d10e540caba',
  'a historical session continues to receive the original immutable payload after r2 is published'
);

select * from finish();
rollback;
