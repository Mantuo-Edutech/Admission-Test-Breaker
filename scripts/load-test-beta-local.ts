import { createHmac, randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

interface LocalSupabaseStatus {
  API_URL: string;
  PUBLISHABLE_KEY: string;
  SERVICE_ROLE_KEY: string;
  JWT_SECRET: string;
}

interface AdminUser {
  id: string;
  email?: string;
}

interface IssuedInvite {
  invite_id: string;
  code: string;
}

function localStatus(): LocalSupabaseStatus {
  try {
    const output = execFileSync(
      "pnpm",
      ["exec", "supabase", "status", "--output", "json"],
      { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] },
    );
    return JSON.parse(output) as LocalSupabaseStatus;
  } catch {
    throw new Error("Local Supabase is not running. Run `pnpm supabase:start` first.");
  }
}

function integerEnvironment(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined) return fallback;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    throw new Error(`${name} must be a positive integer`);
  }
  return parsed;
}

function base64Url(value: string): string {
  return Buffer.from(value).toString("base64url");
}

function userToken(status: LocalSupabaseStatus, user: AdminUser): string {
  const now = Math.floor(Date.now() / 1000);
  const header = base64Url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payload = base64Url(JSON.stringify({
    aud: "authenticated",
    exp: now + 3600,
    iat: now,
    sub: user.id,
    email: user.email,
    role: "authenticated",
    aal: "aal1",
    session_id: randomUUID(),
  }));
  const signature = createHmac("sha256", status.JWT_SECRET)
    .update(`${header}.${payload}`)
    .digest("base64url");
  return `${header}.${payload}.${signature}`;
}

async function requestJson<T>(
  url: string,
  init: RequestInit,
  label: string,
): Promise<T> {
  const response = await fetch(url, {
    ...init,
    signal: AbortSignal.timeout(15_000),
  });
  const body = await response.text();
  if (!response.ok) {
    throw new Error(`${label}: HTTP ${response.status} ${body.slice(0, 180)}`);
  }
  return (body.length === 0 ? null : JSON.parse(body)) as T;
}

async function inBatches<T>(
  values: T[],
  concurrency: number,
  operation: (value: T) => Promise<void>,
): Promise<void> {
  for (let index = 0; index < values.length; index += concurrency) {
    await Promise.all(values.slice(index, index + concurrency).map(operation));
  }
}

function percentile(values: number[], fraction: number): number {
  const sorted = [...values].sort((left, right) => left - right);
  const index = Math.min(sorted.length - 1, Math.ceil(sorted.length * fraction) - 1);
  return sorted[index] ?? 0;
}

const status = localStatus();
if (!/^http:\/\/(127\.0\.0\.1|localhost):/u.test(status.API_URL)) {
  throw new Error("Closed-beta load check refuses to run against a non-local project.");
}

const userCount = integerEnvironment("BETA_LOAD_USERS", 100);
const concurrency = integerEnvironment("BETA_LOAD_CONCURRENCY", 10);
const maximumP95Ms = integerEnvironment("BETA_LOAD_MAX_P95_MS", 3_000);
const runId = `${Date.now()}_${randomUUID().replaceAll("-", "")}`;
const publicHeaders = {
  apikey: status.PUBLISHABLE_KEY,
  "Content-Type": "application/json",
};
const serviceHeaders = {
  apikey: status.SERVICE_ROLE_KEY,
  Authorization: `Bearer ${status.SERVICE_ROLE_KEY}`,
  "Content-Type": "application/json",
};
const users: AdminUser[] = [];
let invite: IssuedInvite | undefined;

try {
  const issued = await requestJson<IssuedInvite[]>(
    `${status.API_URL}/rest/v1/rpc/issue_invite`,
    {
      method: "POST",
      headers: serviceHeaders,
      body: JSON.stringify({
        p_label: `Local 100-person capacity ${runId}`,
        p_package_ids: ["tmua-full-access"],
        p_max_redemptions: userCount,
      }),
    },
    "Issue capacity invite",
  );
  invite = issued[0];
  if (!invite) throw new Error("Capacity invite was not created");

  const indexes = Array.from({ length: userCount }, (_, index) => index);
  await inBatches(indexes, concurrency, async (index) => {
    const email = `beta-load-${runId}-${index}@example.test`;
    const user = await requestJson<AdminUser>(
      `${status.API_URL}/auth/v1/admin/users`,
      {
        method: "POST",
        headers: serviceHeaders,
        body: JSON.stringify({
          email,
          password: `BetaLoad-${runId}-${index}-A1`,
          email_confirm: true,
        }),
      },
      `Create user ${index}`,
    );
    users.push(user);
  });

  const durations: number[] = [];
  await inBatches(users, concurrency, async (user) => {
    const startedAt = performance.now();
    const token = userToken(status, user);
    const authenticatedHeaders = {
      ...publicHeaders,
      Authorization: `Bearer ${token}`,
    };
    const suffix = user.id.replaceAll("-", "");
    const guestSpaceId = `gsp_load_${runId}_${suffix}`;
    const sessionId = `ses_load_${runId}_${suffix}`;
    const actor = { kind: "guest", actorId: `guest_load_${suffix}` };
    const baseEvent = {
      id: `evt_load_start_${suffix}`,
      schemaVersion: 1,
      learningSpaceId: guestSpaceId,
      sessionId,
      sequence: 1,
      type: "session_started",
      actor,
      occurredAt: "2026-07-18T00:00:00.000Z",
      payload: {
        paperId: "tmua-specimen-p1",
        deadlineAt: "2026-07-18T01:15:00.000Z",
      },
    };
    const activeSession = {
      schemaVersion: 2,
      id: sessionId,
      learningSpaceId: guestSpaceId,
      startedBy: actor,
      paperId: "tmua-specimen-p1",
      status: "active",
      startedAt: "2026-07-18T00:00:00.000Z",
      deadlineAt: "2026-07-18T01:15:00.000Z",
      currentQuestion: 1,
      answers: {},
      markedQuestionIds: [],
      timingByQuestionMs: {},
      activeQuestionEnteredAt: "2026-07-18T00:00:00.000Z",
      events: [baseEvent],
    };

    await requestJson<unknown>(
      `${status.API_URL}/rest/v1/rpc/redeem_invite`,
      {
        method: "POST",
        headers: authenticatedHeaders,
        body: JSON.stringify({ p_code: invite?.code }),
      },
      "Redeem invite",
    );
    await requestJson<unknown>(
      `${status.API_URL}/rest/v1/rpc/save_preparation_profile`,
      {
        method: "POST",
        headers: authenticatedHeaders,
        body: JSON.stringify({
          p_profile: {
            schemaVersion: 1,
            guestSpaceId,
            exam: "TMUA",
            entryCycle: "2027",
            curriculumSystem: "caie",
            selections: [{
              qualificationId: "caie-9709-2026-2027",
              unitIds: ["p1", "s1"],
            }],
            experience: "sampled",
            createdAt: "2026-07-18T00:00:00.000Z",
            updatedAt: "2026-07-18T00:00:00.000Z",
          },
        }),
      },
      "Save profile",
    );
    await requestJson<unknown>(
      `${status.API_URL}/rest/v1/rpc/save_practice_session`,
      {
        method: "POST",
        headers: authenticatedHeaders,
        body: JSON.stringify({ p_session: activeSession }),
      },
      "Start practice",
    );
    await requestJson<unknown>(
      `${status.API_URL}/rest/v1/rpc/save_practice_session`,
      {
        method: "POST",
        headers: authenticatedHeaders,
        body: JSON.stringify({
          p_session: {
            ...activeSession,
            status: "submitted",
            submittedAt: "2026-07-18T00:30:00.000Z",
            answers: { "tmua-specimen-p1-q01": "D" },
            timingByQuestionMs: { "tmua-specimen-p1-q01": 120_000 },
            events: [
              baseEvent,
              {
                id: `evt_load_submit_${suffix}`,
                schemaVersion: 1,
                learningSpaceId: guestSpaceId,
                sessionId,
                sequence: 2,
                type: "session_submitted",
                actor,
                occurredAt: "2026-07-18T00:30:00.000Z",
                payload: { reason: "student" },
              },
            ],
          },
        }),
      },
      "Submit practice",
    );
    await requestJson<unknown>(
      `${status.API_URL}/rest/v1/rpc/submit_student_feedback`,
      {
        method: "POST",
        headers: authenticatedHeaders,
        body: JSON.stringify({
          p_category: "content_error",
          p_exam_id: "tmua",
          p_route: "/practice/tmua-specimen-p1",
          p_resource_id: "tmua-specimen-p1",
          p_question_id: "tmua-specimen-p1-q01",
          p_message: `Capacity feedback marker ${suffix}.`,
        }),
      },
      "Submit feedback",
    );
    durations.push(performance.now() - startedAt);
  });

  const p50 = percentile(durations, 0.5);
  const p95 = percentile(durations, 0.95);
  const maximum = Math.max(...durations);
  if (durations.length !== userCount || p95 > maximumP95Ms) {
    throw new Error(
      `Capacity threshold failed: completed=${durations.length}/${userCount}, p95=${p95.toFixed(0)}ms, limit=${maximumP95Ms}ms`,
    );
  }

  console.log(
    `Closed-beta local capacity: PASS (${userCount} users, concurrency ${concurrency}, profile + invite + start + submit + feedback, p50 ${p50.toFixed(0)}ms, p95 ${p95.toFixed(0)}ms, max ${maximum.toFixed(0)}ms)`,
  );
} finally {
  await inBatches(users, concurrency, async (user) => {
    const response = await fetch(`${status.API_URL}/auth/v1/admin/users/${user.id}`, {
      method: "DELETE",
      headers: serviceHeaders,
    });
    if (!response.ok && response.status !== 404) {
      throw new Error(`Could not remove load user ${user.id}: HTTP ${response.status}`);
    }
  });

  if (invite?.invite_id && /^[0-9a-f-]{36}$/u.test(invite.invite_id)) {
    const projectId = /^project_id\s*=\s*"([a-z0-9-]+)"/mu.exec(
      readFileSync("supabase/config.toml", "utf8"),
    )?.[1];
    if (projectId) {
      execFileSync("docker", [
        "exec",
        `supabase_db_${projectId}`,
        "psql",
        "-U",
        "postgres",
        "-d",
        "postgres",
        "-v",
        "ON_ERROR_STOP=1",
        "-c",
        `delete from private.invite_codes where id = '${invite.invite_id}'::uuid`,
      ], { stdio: "ignore" });
    }
  }
}
