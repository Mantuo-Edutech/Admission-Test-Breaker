insert into public.access_packages (id, name, description)
values (
  'tmua-full-access',
  'TMUA 完整资料权限',
  '在权限有效期内访问所有已经发布并加入该资料包的 TMUA 模考与复习资料。'
)
on conflict (id) do update
set name = excluded.name,
    description = excluded.description,
    status = 'active';

insert into public.content_resources (
  id,
  exam,
  kind,
  title,
  access_tier,
  publication_status,
  revision,
  metadata,
  published_at
) values (
  'tmua-2023-paper-1',
  'TMUA',
  'past_paper',
  'TMUA 2023 Paper 1',
  'public',
  'published',
  1,
  '{"onlineQuestionCount":20,"durationMinutes":75}'::jsonb,
  '2026-07-13T00:00:00Z'::timestamptz
)
on conflict (id) do update
set title = excluded.title,
    access_tier = excluded.access_tier,
    publication_status = excluded.publication_status,
    revision = excluded.revision,
    metadata = excluded.metadata,
    published_at = excluded.published_at;

-- Local-only deterministic invite. Production invites must be issued with
-- public.issue_invite() so the plaintext code is shown exactly once.
insert into private.invite_codes (
  code_digest,
  label,
  max_redemptions,
  expires_at,
  entitlement_duration
) values (
  private.invite_code_digest('MANTUO-TMUA-LOCAL-2026-ACCESS'),
  '本地开发 TMUA 权限',
  100,
  now() + interval '30 days',
  interval '30 days'
)
on conflict (code_digest) do nothing;

insert into private.invite_packages (invite_id, package_id)
select invite.id, 'tmua-full-access'
from private.invite_codes as invite
where invite.code_digest = private.invite_code_digest('MANTUO-TMUA-LOCAL-2026-ACCESS')
on conflict do nothing;
