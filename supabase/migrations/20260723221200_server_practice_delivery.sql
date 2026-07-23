create or replace function public.get_practice_paper(
  p_paper_id text,
  p_paper_revision_id text default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  result jsonb;
begin
  if p_paper_id !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
    or (
      p_paper_revision_id is not null
      and p_paper_revision_id !~ '^[a-z0-9]+(?:-[a-z0-9]+)*-r[1-9][0-9]*$'
    ) then
    raise exception 'practice_paper_reference_invalid' using errcode = '22023';
  end if;

  select payload.payload
  into result
  from public.practice_content_revisions as revision
  join private.practice_paper_payloads as payload
    on payload.paper_revision_id = revision.paper_revision_id
  where revision.paper_id = p_paper_id
    and revision.publication_status = 'published'
    and (
      p_paper_revision_id is null
      or revision.paper_revision_id = p_paper_revision_id
    )
  order by revision.revision desc
  limit 1;

  if result is null then
    raise exception 'practice_paper_not_found' using errcode = 'P0002';
  end if;

  return result;
end;
$$;

revoke all on function public.get_practice_paper(text, text) from public;
grant execute on function public.get_practice_paper(text, text) to anon, authenticated;

comment on function public.get_practice_paper(text, text) is
  'Returns one immutable, published question payload without answer keys, source paths or protected analysis.';
