create table private.practice_paper_payloads (
  paper_revision_id text primary key
    references public.practice_content_revisions (paper_revision_id) on delete restrict,
  payload jsonb not null,
  payload_digest text not null,
  created_at timestamptz not null default now(),
  constraint practice_paper_payloads_object check (jsonb_typeof(payload) = 'object'),
  constraint practice_paper_payloads_digest check (payload_digest ~ '^[a-f0-9]{64}$'),
  constraint practice_paper_payloads_ref_consistency check (
    payload->'contentRef'->>'paperRevisionId' = paper_revision_id
  )
);

create table private.practice_paper_answer_keys (
  paper_revision_id text primary key
    references public.practice_content_revisions (paper_revision_id) on delete restrict,
  answer_key jsonb not null,
  answer_key_digest text not null,
  created_at timestamptz not null default now(),
  constraint practice_paper_answer_keys_object check (jsonb_typeof(answer_key) = 'object'),
  constraint practice_paper_answer_keys_digest check (answer_key_digest ~ '^[a-f0-9]{64}$'),
  constraint practice_paper_answer_keys_ref_consistency check (
    answer_key->>'paperRevisionId' = paper_revision_id
  )
);

alter table private.practice_paper_payloads enable row level security;
alter table private.practice_paper_answer_keys enable row level security;

revoke all on table private.practice_paper_payloads
  from public, anon, authenticated;
revoke all on table private.practice_paper_answer_keys
  from public, anon, authenticated;
grant select, insert, update, delete on table private.practice_paper_payloads
  to service_role;
grant select, insert, update, delete on table private.practice_paper_answer_keys
  to service_role;

comment on table private.practice_paper_payloads is
  'Server-only public question payloads. Delivery is exclusively through a safe RPC.';
comment on table private.practice_paper_answer_keys is
  'Server-only answer keys and scoring metadata. Never exposed through the data API.';
