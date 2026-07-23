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

insert into public.access_packages (id, name, description)
values
  ('tmua-deep-review', 'TMUA 深度解析', '逐题思路、错误类型和后续训练建议。题目、答案和基础结果不需要该权限。'),
  ('esat-deep-review', 'ESAT 深度解析', '按 ESAT 模块提供逐题思路、错误类型和后续训练建议。'),
  ('tara-deep-review', 'TARA 深度解析', 'Critical Thinking 与 Problem Solving 逐题推理，以及 Writing Task 结构反馈。'),
  ('lnat-deep-review', 'LNAT 深度解析', 'Section A 论证分析与 Section B 写作结构、论证和语言反馈。'),
  ('ucat-deep-review', 'UCAT 深度解析', '按子测验提供题型策略、错误原因和节奏建议。')
on conflict (id) do update
set name = excluded.name,
    description = excluded.description,
    status = 'active';

insert into public.content_resources (
  id, exam, kind, title, access_tier, publication_status, revision, metadata
) values
  ('tmua-deep-review-v1', 'TMUA', 'answer_explanation', 'TMUA 深度解析', 'entitled', 'draft', 1, '{"delivery":"server-only"}'::jsonb),
  ('esat-deep-review-v1', 'ESAT', 'answer_explanation', 'ESAT 深度解析', 'entitled', 'draft', 1, '{"delivery":"server-only"}'::jsonb),
  ('tara-deep-review-v1', 'TARA', 'interpretation', 'TARA 推理与写作深度反馈', 'entitled', 'draft', 1, '{"delivery":"server-only"}'::jsonb),
  ('lnat-deep-review-v1', 'LNAT', 'interpretation', 'LNAT 阅读与写作深度反馈', 'entitled', 'draft', 1, '{"delivery":"server-only"}'::jsonb),
  ('ucat-deep-review-v1', 'UCAT', 'answer_explanation', 'UCAT 深度解析', 'entitled', 'draft', 1, '{"delivery":"server-only"}'::jsonb)
on conflict (id) do update
set title = excluded.title,
    access_tier = excluded.access_tier,
    publication_status = excluded.publication_status,
    revision = excluded.revision,
    metadata = excluded.metadata,
    published_at = null;

insert into public.access_package_resources (package_id, resource_id)
values
  ('tmua-deep-review', 'tmua-deep-review-v1'),
  ('esat-deep-review', 'esat-deep-review-v1'),
  ('tara-deep-review', 'tara-deep-review-v1'),
  ('lnat-deep-review', 'lnat-deep-review-v1'),
  ('ucat-deep-review', 'ucat-deep-review-v1')
on conflict do nothing;

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

insert into private.invite_packages (invite_id, package_id)
select invite.id, 'tmua-deep-review'
from private.invite_codes as invite
where invite.code_digest = private.invite_code_digest('MANTUO-TMUA-LOCAL-2026-ACCESS')
on conflict do nothing;
