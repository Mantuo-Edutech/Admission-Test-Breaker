create table public.practice_content_revisions (
  paper_revision_id text primary key,
  paper_id text not null,
  revision integer not null,
  exam text not null,
  schema_version integer not null,
  content_digest text not null,
  question_count integer not null,
  duration_minutes integer not null,
  publication_status text not null default 'published',
  published_at timestamptz not null,
  withdrawn_at timestamptz,
  created_at timestamptz not null default now(),
  constraint practice_content_revisions_paper_id_format
    check (paper_id ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint practice_content_revisions_revision_id
    check (paper_revision_id = paper_id || '-r' || revision::text),
  constraint practice_content_revisions_revision_positive check (revision > 0),
  constraint practice_content_revisions_schema_version_positive check (schema_version > 0),
  constraint practice_content_revisions_exam
    check (exam in ('TMUA', 'ESAT', 'TARA', 'LNAT', 'UCAT')),
  constraint practice_content_revisions_digest
    check (content_digest ~ '^[a-f0-9]{64}$'),
  constraint practice_content_revisions_question_count check (question_count > 0),
  constraint practice_content_revisions_duration check (duration_minutes between 1 and 180),
  constraint practice_content_revisions_status
    check (publication_status in ('published', 'withdrawn')),
  constraint practice_content_revisions_withdrawal_consistency check (
    (publication_status = 'published' and withdrawn_at is null)
    or (publication_status = 'withdrawn' and withdrawn_at is not null)
  ),
  constraint practice_content_revisions_paper_revision unique (paper_id, revision),
  constraint practice_content_revisions_exact_ref
    unique (paper_revision_id, paper_id, content_digest)
);

create unique index practice_content_revisions_one_published_digest
  on public.practice_content_revisions (paper_id, content_digest);
create index practice_content_revisions_catalog
  on public.practice_content_revisions (exam, publication_status, paper_id, revision desc);

alter table public.practice_content_revisions enable row level security;

create policy practice_content_revisions_public_metadata
  on public.practice_content_revisions
  for select
  to anon, authenticated
  using (publication_status = 'published');

grant select on public.practice_content_revisions to anon, authenticated;
grant all on public.practice_content_revisions to service_role;
revoke insert, update, delete, truncate, references, trigger
  on public.practice_content_revisions from anon, authenticated;

comment on table public.practice_content_revisions is
  'Immutable publication metadata only. Question payloads, answer keys and explanations use separate delivery boundaries.';
