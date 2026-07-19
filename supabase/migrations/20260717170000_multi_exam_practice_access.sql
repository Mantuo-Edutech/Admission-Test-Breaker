alter table public.content_resources
  drop constraint if exists content_resources_exam;

alter table public.content_resources
  add constraint content_resources_exam
  check (exam in ('TMUA', 'ESAT', 'TARA', 'LNAT', 'UCAT'));

alter table public.content_resources
  drop constraint if exists content_resources_kind;

alter table public.content_resources
  add constraint content_resources_kind
  check (kind in ('past_paper', 'mock_paper', 'review_notes', 'answer_explanation', 'interpretation'));

comment on table public.content_resources is
  'Published questions may be public; worked explanations and interpretations are separate entitled resources.';
