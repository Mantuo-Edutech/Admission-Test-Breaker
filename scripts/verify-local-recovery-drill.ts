import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

interface LocalSupabaseStatus {
  API_URL: string;
  SERVICE_ROLE_KEY: string;
}

interface AdminUser {
  id: string;
}

interface RecoveryFingerprint {
  authUsers: number;
  appUsers: number;
  learnerSpaces: number;
  markerAuthUsers: number;
  markerAppUsers: number;
  contentResources: number;
  protectedPayloads: number;
  protectedPayloadDigest: string;
  publicPolicies: number;
  studentFeedback: number;
  feedbackEvents: number;
  markerFeedback: number;
  feedbackDigest: string;
}

function command(commandName: string, args: string[]): string {
  return execFileSync(commandName, args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

function readStatus(): LocalSupabaseStatus {
  try {
    return JSON.parse(command("pnpm", [
      "exec",
      "supabase",
      "status",
      "--output",
      "json",
    ])) as LocalSupabaseStatus;
  } catch {
    throw new Error("Local Supabase is not running. Run `pnpm supabase:start` first.");
  }
}

function readProjectId(): string {
  const configuration = readFileSync("supabase/config.toml", "utf8");
  const projectId = /^project_id\s*=\s*"([a-z0-9-]+)"/mu.exec(configuration)?.[1];
  if (!projectId) throw new Error("supabase/config.toml has no safe project_id");
  return projectId;
}

function docker(container: string, args: string[]): string {
  return command("docker", ["exec", container, ...args]);
}

async function createMarkerUser(
  status: LocalSupabaseStatus,
  email: string,
): Promise<AdminUser> {
  const response = await fetch(`${status.API_URL}/auth/v1/admin/users`, {
    method: "POST",
    headers: {
      apikey: status.SERVICE_ROLE_KEY,
      Authorization: `Bearer ${status.SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email,
      password: `Recovery-${crypto.randomUUID()}-A1`,
      email_confirm: true,
    }),
  });
  if (!response.ok) {
    throw new Error(`Could not create recovery marker user: HTTP ${response.status}`);
  }
  return await response.json() as AdminUser;
}

async function deleteMarkerUser(
  status: LocalSupabaseStatus,
  userId: string,
): Promise<void> {
  const response = await fetch(`${status.API_URL}/auth/v1/admin/users/${userId}`, {
    method: "DELETE",
    headers: {
      apikey: status.SERVICE_ROLE_KEY,
      Authorization: `Bearer ${status.SERVICE_ROLE_KEY}`,
    },
  });
  if (!response.ok && response.status !== 404) {
    throw new Error(`Could not remove recovery marker user: HTTP ${response.status}`);
  }
}

function fingerprint(
  container: string,
  database: string,
  markerEmail: string,
): RecoveryFingerprint {
  const sql = `
    select json_build_object(
      'authUsers', (select count(*) from auth.users),
      'appUsers', (select count(*) from public.app_users),
      'learnerSpaces', (select count(*) from public.learner_spaces),
      'markerAuthUsers', (select count(*) from auth.users where email = '${markerEmail}'),
      'markerAppUsers', (
        select count(*)
        from public.app_users as app_user
        join auth.users as auth_user on auth_user.id = app_user.auth_user_id
        where auth_user.email = '${markerEmail}'
      ),
      'contentResources', (select count(*) from public.content_resources),
      'protectedPayloads', (select count(*) from public.content_resource_payloads),
      'protectedPayloadDigest', (
        select md5(string_agg(resource_id || ':' || source_sha256, ',' order by resource_id))
        from public.content_resource_payloads
      ),
      'publicPolicies', (select count(*) from pg_policies where schemaname = 'public'),
      'studentFeedback', (select count(*) from public.student_feedback),
      'feedbackEvents', (select count(*) from private.student_feedback_events),
      'markerFeedback', (
        select count(*)
        from public.student_feedback as feedback
        join auth.users as auth_user on auth_user.id = feedback.reporter_user_id
        where auth_user.email = '${markerEmail}'
      ),
      'feedbackDigest', coalesce((
        select md5(string_agg(id::text || ':' || priority || ':' || status, ',' order by id))
        from public.student_feedback
      ), '')
    )::text;
  `;
  return JSON.parse(docker(container, [
    "psql",
    "-U",
    "postgres",
    "-d",
    database,
    "-v",
    "ON_ERROR_STOP=1",
    "-Atc",
    sql,
  ])) as RecoveryFingerprint;
}

function createMarkerFeedback(container: string, userId: string): void {
  if (!/^[0-9a-f-]{36}$/u.test(userId)) {
    throw new Error("Recovery marker user returned an invalid UUID.");
  }
  const sql = `
    with inserted as (
      insert into public.student_feedback (
        reporter_user_id,
        category,
        priority,
        exam_id,
        route,
        resource_id,
        question_id,
        message
      ) values (
        '${userId}'::uuid,
        'content_error',
        'P2',
        'tmua',
        '/practice/tmua-specimen-p1',
        'tmua-specimen-p1',
        'tmua-specimen-p1-q01',
        'Recovery drill feedback marker.'
      )
      returning id
    )
    insert into private.student_feedback_events (feedback_id, event_type, actor_user_id)
    select id, 'submitted', '${userId}'::uuid from inserted;
  `;
  docker(container, [
    "psql",
    "-U",
    "postgres",
    "-d",
    "postgres",
    "-v",
    "ON_ERROR_STOP=1",
    "-Atc",
    sql,
  ]);
}

const status = readStatus();
if (!/^http:\/\/(127\.0\.0\.1|localhost):/u.test(status.API_URL)) {
  throw new Error("Recovery drill refuses to run against a non-local Supabase API.");
}

const projectId = readProjectId();
const container = `supabase_db_${projectId}`;
const drillDatabase = "admission_test_breaker_recovery_drill";
const dumpPath = "/tmp/admission-test-breaker-recovery.dump";
const markerEmail = `recovery-${Date.now()}-${crypto.randomUUID()}@example.test`;
const markerUser = await createMarkerUser(status, markerEmail);

try {
  createMarkerFeedback(container, markerUser.id);
  const source = fingerprint(container, "postgres", markerEmail);
  if (source.markerAuthUsers !== 1 || source.markerAppUsers !== 1 || source.markerFeedback !== 1) {
    throw new Error("The source database did not provision the recovery marker correctly.");
  }

  docker(container, ["dropdb", "--if-exists", "--force", "-U", "postgres", drillDatabase]);
  docker(container, [
    "pg_dump",
    "--username=postgres",
    "--format=custom",
    "--no-owner",
    "--no-privileges",
    "--exclude-table-data=vault.secrets",
    "--dbname=postgres",
    `--file=${dumpPath}`,
  ]);
  docker(container, [
    "createdb",
    "-U",
    "postgres",
    "--template=template0",
    drillDatabase,
  ]);
  docker(container, [
    "pg_restore",
    "--no-owner",
    "--no-privileges",
    "--exit-on-error",
    "--username=postgres",
    `--dbname=${drillDatabase}`,
    dumpPath,
  ]);

  const restored = fingerprint(container, drillDatabase, markerEmail);
  if (JSON.stringify(restored) !== JSON.stringify(source)) {
    throw new Error(
      `Recovery fingerprint mismatch. Source=${JSON.stringify(source)} restored=${JSON.stringify(restored)}`,
    );
  }

  console.log(
    `Local full-database recovery: PASS (${restored.authUsers} auth users, ${restored.contentResources} resources, ${restored.protectedPayloads} protected payloads, ${restored.studentFeedback} feedback reports, ${restored.feedbackEvents} feedback audit events, ${restored.publicPolicies} RLS policies)`,
  );
} finally {
  try {
    docker(container, ["dropdb", "--if-exists", "--force", "-U", "postgres", drillDatabase]);
    docker(container, ["rm", "-f", dumpPath]);
  } finally {
    await deleteMarkerUser(status, markerUser.id);
  }
}
