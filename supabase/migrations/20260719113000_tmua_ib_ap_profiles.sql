create or replace function public.save_preparation_profile(p_profile jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  current_learner_space_id text;
  source_guest_space_id text;
begin
  if current_user_id is null then
    raise exception 'authentication_required' using errcode = '42501';
  end if;

  select learner_space.id into current_learner_space_id
  from public.learner_spaces as learner_space
  where learner_space.owner_user_id = current_user_id
    and learner_space.status = 'active';

  if current_learner_space_id is null then
    raise exception 'learner_space_not_found' using errcode = '42501';
  end if;

  if jsonb_typeof(p_profile) <> 'object'
    or octet_length(p_profile::text) > 131072
    or p_profile->>'schemaVersion' <> '1'
    or p_profile->>'exam' <> 'TMUA'
    or jsonb_typeof(p_profile->'selections') <> 'array'
    or p_profile->>'curriculumSystem' not in ('caie', 'pearson-ial', 'ib', 'ap')
    or p_profile->>'experience' not in ('new', 'sampled', 'mocked', 'past-papers')
    or p_profile->>'entryCycle' !~ '^20[0-9]{2}$' then
    raise exception 'preparation_profile_invalid' using errcode = '22023';
  end if;

  source_guest_space_id := p_profile->>'guestSpaceId';
  perform private.register_guest_space_claim(
    source_guest_space_id,
    current_learner_space_id,
    current_user_id
  );

  insert into public.preparation_profiles (
    learner_space_id,
    schema_version,
    profile
  ) values (
    current_learner_space_id,
    1,
    p_profile
  )
  on conflict (learner_space_id) do update
    set schema_version = excluded.schema_version,
        profile = excluded.profile,
        updated_at = now();

  return p_profile;
end;
$$;
