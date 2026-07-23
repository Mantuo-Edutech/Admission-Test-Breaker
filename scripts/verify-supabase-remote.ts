import { createPracticeSession } from "../src/features/practice/domain/session.js";
import { parsePracticeResults } from "../src/features/practice/delivery/domain.js";
import {
  PUBLISHED_PRACTICE_REVISIONS,
} from "../src/features/practice/content/published-revisions.js";
import { verifyRemotePracticeCatalog } from "../src/platform/remote-practice-catalog-contract.js";

interface AdminUser { readonly id: string }
interface PasswordSession { readonly access_token: string }
interface PracticeSessionRow {
  readonly id: string;
  readonly paper_revision_id: string;
  readonly content_digest: string;
}
interface EntitlementRow { readonly package_id: string }
interface InviteRow { readonly invite_id: string; readonly code: string }
interface EntitledResourceRow { readonly id: string; readonly payload: unknown }

const apiUrl = process.env.SUPABASE_URL;
const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (apiUrl === undefined || !/^https:\/\/[a-z]{20}\.supabase\.co$/u.test(apiUrl)) {
  throw new Error("SUPABASE_URL must identify one hosted Supabase project");
}
if (publishableKey === undefined || serviceRoleKey === undefined) {
  throw new Error("SUPABASE_PUBLISHABLE_KEY and SUPABASE_SERVICE_ROLE_KEY are required");
}
if (process.env.REMOTE_SUPABASE_VERIFY_CONFIRM !== "CREATE_AND_DELETE_REMOTE_TEST_USERS") {
  throw new Error("Set REMOTE_SUPABASE_VERIFY_CONFIRM=CREATE_AND_DELETE_REMOTE_TEST_USERS");
}

const publicHeaders = { apikey: publishableKey, "Content-Type": "application/json" };
const serviceHeaders = {
  apikey: serviceRoleKey,
  Authorization: `Bearer ${serviceRoleKey}`,
  "Content-Type": "application/json",
};

async function request<T>(path: string, init: RequestInit, label: string): Promise<T> {
  const response = await fetch(`${apiUrl}${path}`, { ...init, signal: AbortSignal.timeout(30_000) });
  const body = await response.text();
  if (!response.ok) throw new Error(`${label} failed with HTTP ${response.status}: ${body.slice(0, 180)}`);
  return (body === "" ? null : JSON.parse(body)) as T;
}

async function expectFailure(path: string, init: RequestInit, expected: string): Promise<void> {
  const response = await fetch(`${apiUrl}${path}`, { ...init, signal: AbortSignal.timeout(30_000) });
  const body = await response.text();
  if (response.ok || !body.includes(expected)) {
    throw new Error(`Expected ${expected}; received HTTP ${response.status}: ${body.slice(0, 180)}`);
  }
}

async function createUser(email: string, password: string): Promise<AdminUser> {
  return request<AdminUser>("/auth/v1/admin/users", {
    method: "POST",
    headers: serviceHeaders,
    body: JSON.stringify({ email, password, email_confirm: true }),
  }, "Remote confirmed user creation");
}

async function login(email: string, password: string): Promise<PasswordSession> {
  return request<PasswordSession>("/auth/v1/token?grant_type=password", {
    method: "POST",
    headers: publicHeaders,
    body: JSON.stringify({ email, password }),
  }, "Remote password login");
}

const unique = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
const password = `MantuoRemote-${crypto.randomUUID()}-A1`;
const users: AdminUser[] = [];

try {
  const firstEmail = `remote-contract-${unique}@example.test`;
  const secondEmail = `remote-contract-second-${unique}@example.test`;
  const firstUser = await createUser(firstEmail, password);
  const secondUser = await createUser(secondEmail, password);
  users.push(firstUser, secondUser);
  const firstAuth = { ...publicHeaders, Authorization: `Bearer ${(await login(firstEmail, password)).access_token}` };
  const secondAuth = { ...publicHeaders, Authorization: `Bearer ${(await login(secondEmail, password)).access_token}` };

  const deliveredCatalog = await verifyRemotePracticeCatalog(
    PUBLISHED_PRACTICE_REVISIONS.papers,
    (expected) => request<unknown>("/rest/v1/rpc/get_practice_paper", {
      method: "POST",
      headers: publicHeaders,
      body: JSON.stringify({
        p_paper_id: expected.paperId,
        p_paper_revision_id: expected.paperRevisionId,
      }),
    }, `Remote safe paper delivery ${expected.paperRevisionId}`),
  );
  const paper = deliveredCatalog.papers.get("tmua-2023-p1");
  if (paper === undefined) throw new Error("Remote delivery omitted the scoring reference paper");

  const guestSpaceId = `gsp_remote_${unique}`;
  const session = createPracticeSession({
    id: `ses_remote_${unique}`,
    learningSpaceId: guestSpaceId,
    actor: { kind: "guest", actorId: `guest_remote_${unique}` },
    paperId: paper.id,
    contentRef: paper.contentRef,
    durationMinutes: paper.durationMinutes,
    startedAt: new Date().toISOString(),
    eventId: `evt_remote_${unique}`,
  });
  await request<unknown>("/rest/v1/rpc/save_practice_session", {
    method: "POST",
    headers: firstAuth,
    body: JSON.stringify({ p_session: session }),
  }, "Remote exact-revision session save");

  const firstSessions = await request<PracticeSessionRow[]>(
    `/rest/v1/practice_sessions?select=id,paper_revision_id,content_digest&id=eq.${session.id}`,
    { method: "GET", headers: firstAuth },
    "First learner session lookup",
  );
  if (
    firstSessions.length !== 1 ||
    firstSessions[0]?.paper_revision_id !== session.paperRevisionId ||
    firstSessions[0]?.content_digest !== session.contentDigest
  ) {
    throw new Error("Remote session did not persist its immutable content reference");
  }
  const secondSessions = await request<PracticeSessionRow[]>(
    `/rest/v1/practice_sessions?select=id,paper_revision_id,content_digest&id=eq.${session.id}`,
    { method: "GET", headers: secondAuth },
    "Second learner session isolation lookup",
  );
  if (secondSessions.length !== 0) throw new Error("Practice session crossed the tenant boundary");
  await expectFailure("/rest/v1/rpc/save_practice_session", {
    method: "POST",
    headers: secondAuth,
    body: JSON.stringify({ p_session: session }),
  }, "guest_space_already_claimed");

  const submitted = {
    ...session,
    status: "submitted" as const,
    submittedAt: new Date().toISOString(),
    activeQuestionEnteredAt: null,
  };
  const rawResults = await request<unknown>("/rest/v1/rpc/score_practice_submission", {
    method: "POST",
    headers: firstAuth,
    body: JSON.stringify({ p_submission: submitted }),
  }, "Remote basic result scoring");
  const results = parsePracticeResults(rawResults, submitted);
  if (results.totalQuestions !== 20 || results.unansweredCount !== 20 || results.maxScore !== 20) {
    throw new Error("Remote basic scoring returned an inconsistent result");
  }

  const locked = await request<EntitledResourceRow[]>("/rest/v1/rpc/get_entitled_content_resource", {
    method: "POST",
    headers: firstAuth,
    body: JSON.stringify({ p_resource_id: "tmua-six-week-review-plan-v1" }),
  }, "Locked Notes lookup");
  if (locked.length !== 0) throw new Error("Notes were available before entitlement");

  const invite = (await request<InviteRow[]>("/rest/v1/rpc/issue_invite", {
    method: "POST",
    headers: serviceHeaders,
    body: JSON.stringify({
      p_label: `Remote contract ${unique}`,
      p_package_ids: ["tmua-full-access"],
      p_max_redemptions: 1,
      p_expires_at: new Date(Date.now() + 120_000).toISOString(),
      p_entitlement_duration: "30 minutes",
    }),
  }, "Short-lived remote invite issuance"))[0];
  if (invite?.code === undefined || invite.code.length < 24) throw new Error("Remote invite was not issued");

  const redeemed = await request<EntitlementRow[]>("/rest/v1/rpc/redeem_invite", {
    method: "POST",
    headers: firstAuth,
    body: JSON.stringify({ p_code: invite.code }),
  }, "Remote invite redemption");
  if (!redeemed.some((row) => row.package_id === "tmua-full-access")) {
    throw new Error("Remote invite did not grant the expected package");
  }
  const firstNotes = await request<EntitledResourceRow[]>("/rest/v1/rpc/get_entitled_content_resource", {
    method: "POST",
    headers: firstAuth,
    body: JSON.stringify({ p_resource_id: "tmua-six-week-review-plan-v1" }),
  }, "Entitled Notes delivery");
  if (firstNotes.length !== 1 || firstNotes[0]?.id !== "tmua-six-week-review-plan-v1") {
    throw new Error("Entitled Notes were not delivered after invite redemption");
  }
  const secondNotes = await request<EntitledResourceRow[]>("/rest/v1/rpc/get_entitled_content_resource", {
    method: "POST",
    headers: secondAuth,
    body: JSON.stringify({ p_resource_id: "tmua-six-week-review-plan-v1" }),
  }, "Second learner entitled-content isolation lookup");
  if (secondNotes.length !== 0) throw new Error("Entitled Notes crossed the tenant boundary");

  console.log(
    `Remote Supabase ${deliveredCatalog.paperCount} papers / ${deliveredCatalog.questionCount} questions, ` +
    "identity, immutable sessions, scoring, RLS, invite and entitled Notes: PASS",
  );
} finally {
  for (const user of users.reverse()) {
    await fetch(`${apiUrl}/auth/v1/admin/users/${user.id}`, {
      method: "DELETE",
      headers: serviceHeaders,
      signal: AbortSignal.timeout(30_000),
    });
  }
}
