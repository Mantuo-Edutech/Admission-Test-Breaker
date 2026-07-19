-- An active package is not automatically a sellable product. Invite issuance
-- requires at least one currently published entitled resource so an operator
-- cannot promise a draft-only package to a student.
create or replace function public.issue_invite(
  p_label text,
  p_package_ids text[],
  p_max_redemptions integer default 1,
  p_expires_at timestamptz default null,
  p_entitlement_duration interval default null
)
returns table (invite_id uuid, code text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  generated_code text;
  created_invite_id uuid;
begin
  if length(trim(p_label)) = 0 then
    raise exception 'invite_label_required' using errcode = '22023';
  end if;
  if p_package_ids is null or cardinality(p_package_ids) = 0 then
    raise exception 'invite_package_required' using errcode = '22023';
  end if;
  if p_max_redemptions <= 0 then
    raise exception 'invite_redemptions_invalid' using errcode = '22023';
  end if;

  if exists (
    select 1
    from unnest(p_package_ids) as requested(package_id)
    left join public.access_packages as package on package.id = requested.package_id
    where package.id is null or package.status <> 'active'
  ) then
    raise exception 'invite_package_invalid' using errcode = '22023';
  end if;

  if exists (
    select 1
    from unnest(p_package_ids) as requested(package_id)
    where not exists (
      select 1
      from public.access_package_resources as package_resource
      join public.content_resources as resource
        on resource.id = package_resource.resource_id
      where package_resource.package_id = requested.package_id
        and resource.access_tier = 'entitled'
        and resource.publication_status = 'published'
        and resource.published_at is not null
    )
  ) then
    raise exception 'invite_package_unpublished' using errcode = '22023';
  end if;

  generated_code := upper(encode(extensions.gen_random_bytes(18), 'hex'));

  insert into private.invite_codes (
    code_digest,
    label,
    max_redemptions,
    expires_at,
    entitlement_duration
  ) values (
    private.invite_code_digest(generated_code),
    trim(p_label),
    p_max_redemptions,
    p_expires_at,
    p_entitlement_duration
  )
  returning id into created_invite_id;

  insert into private.invite_packages (invite_id, package_id)
  select created_invite_id, requested.package_id
  from unnest(p_package_ids) as requested(package_id);

  return query select created_invite_id, generated_code;
end;
$$;

revoke all on function public.issue_invite(text, text[], integer, timestamptz, interval)
  from public, anon, authenticated;
grant execute on function public.issue_invite(text, text[], integer, timestamptz, interval)
  to service_role;
