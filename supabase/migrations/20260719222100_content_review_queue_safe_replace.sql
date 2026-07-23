-- Forward-only compatibility for databases that already applied the first
-- content review workbench migration under Supabase safe-update protection.

create or replace function public.sync_content_review_queue(
  p_catalog_revision text,
  p_items jsonb
)
returns table (catalog_revision text, synced_items integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  normalized_revision text := trim(p_catalog_revision);
  item jsonb;
  item_count integer;
  item_viewports text[];
begin
  if length(normalized_revision) not between 3 and 80 then
    raise exception 'content_review_catalog_revision_invalid' using errcode = '22023';
  end if;
  if jsonb_typeof(p_items) is distinct from 'array' then
    raise exception 'content_review_queue_invalid' using errcode = '22023';
  end if;
  if jsonb_array_length(p_items) > 500 then
    raise exception 'content_review_queue_invalid' using errcode = '22023';
  end if;
  item_count := jsonb_array_length(p_items);

  delete from private.content_review_queue_items as queue
  where queue.catalog_revision is not null;
  for item in select value from jsonb_array_elements(p_items)
  loop
    if jsonb_typeof(item) <> 'object'
      or coalesce(item ->> 'reviewKey', '') !~ '^[a-z0-9][a-z0-9._/-]{2,199}$'
      or coalesce(item ->> 'campaignId', '') not in (
        'academic-content', 'student-calibration', 'device-accessibility'
      )
      or length(trim(coalesce(item ->> 'ownerRole', ''))) not between 2 and 80
      or jsonb_typeof(item -> 'independenceRequired') is distinct from 'boolean'
      or length(trim(coalesce(item ->> 'evidenceRequirement', ''))) not between 20 and 3000
      or jsonb_typeof(item -> 'viewports') is distinct from 'array'
      or (
        jsonb_typeof(item -> 'viewports') = 'array'
        and jsonb_array_length(item -> 'viewports') > 20
      )
      or (
        jsonb_typeof(item -> 'viewports') = 'array'
        and exists (
          select 1 from jsonb_array_elements(item -> 'viewports') as viewport(value)
          where jsonb_typeof(value) <> 'string'
            or length(trim(value #>> '{}')) not between 1 and 100
        )
      )
      or coalesce(not private.content_review_products_valid(item -> 'products'), true)
      or coalesce(item ->> 'sourceFingerprint', '') !~ '^sha256:[0-9a-f]{64}$'
      or coalesce(item ->> 'sourceArtifactCount', '') !~ '^[0-9]+$'
      or (
        coalesce(item ->> 'sourceArtifactCount', '') ~ '^[0-9]+$'
        and (item ->> 'sourceArtifactCount')::numeric not between 1 and 100000
      )
    then
      raise exception 'content_review_queue_item_invalid' using errcode = '22023';
    end if;

    select coalesce(array_agg(value #>> '{}' order by ordinal), array[]::text[])
      into item_viewports
    from jsonb_array_elements(item -> 'viewports') with ordinality as viewport(value, ordinal);

    insert into private.content_review_queue_items (
      review_key,
      campaign_id,
      owner_role,
      independence_required,
      evidence_requirement,
      viewports,
      products,
      source_fingerprint,
      source_artifact_count,
      catalog_revision,
      synced_at
    ) values (
      item ->> 'reviewKey',
      item ->> 'campaignId',
      item ->> 'ownerRole',
      (item ->> 'independenceRequired')::boolean,
      item ->> 'evidenceRequirement',
      item_viewports,
      item -> 'products',
      item ->> 'sourceFingerprint',
      (item ->> 'sourceArtifactCount')::integer,
      normalized_revision,
      now()
    );
  end loop;

  insert into private.content_review_operations_events (event_type, details)
  values (
    'queue_synced',
    jsonb_build_object('catalogRevision', normalized_revision, 'itemCount', item_count)
  );

  return query select normalized_revision, item_count;
end;
$$;

revoke all on function public.sync_content_review_queue(text, jsonb)
  from public, anon, authenticated;
grant execute on function public.sync_content_review_queue(text, jsonb)
  to service_role;
