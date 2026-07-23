import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import type { ManualReviewWorklist } from "../src/features/library/manual-review-worklist.js";

interface LocalSupabaseStatus {
  API_URL: string;
  PUBLISHABLE_KEY: string;
  SERVICE_ROLE_KEY: string;
}

interface AdminUser {
  id: string;
}

interface PasswordSession {
  access_token: string;
}

interface EntitlementRow {
  package_id: string;
}

interface PracticeSessionRow {
  id: string;
}

interface CollaborationInviteRow {
  invite_id: string;
  code: string;
}

interface SharedLearnerAccessRow {
  grant_id: string;
  subject_kind: string;
  scopes: string[];
}

interface SharedProgressRow {
  session_id: string;
  answered_count: number;
}

interface CollaborationArtifactRow {
  artifact_id: string;
  kind: string;
}

interface CollaborationAuditRow {
  event_type: string;
}

interface LearningDataExport {
  schemaVersion?: number;
  account?: { email?: string };
  assessmentBackgroundProfiles?: unknown[];
  practiceSessions?: unknown[];
  feedback?: unknown[];
  collaborationInvites?: unknown[];
  collaborationGrants?: unknown[];
  collaborationArtifacts?: unknown[];
  collaborationAudit?: unknown[];
}

interface AssessmentBackgroundProfileRow {
  exam_id: string;
  profile: { examId?: string };
}

interface FeedbackReceiptRow {
  feedback_id: string;
  priority: string;
  status: string;
}

interface FeedbackRow {
  id: string;
  status: string;
}

interface EntitledContentResourceRow {
  id: string;
  source_sha256: string;
  payload: {
    weeklyPlan?: Array<{ sessions?: unknown[] }>;
    explanations?: Array<{ questionId?: string; correctAnswer?: string }>;
  };
}

interface ProductFunnelSummaryRow {
  event_type: string;
  exam_id: string;
  context_code: string;
  event_count: number;
  unique_journeys: number;
}

interface InviteOperatorContextRow {
  active: boolean;
  display_name?: string | null;
  permissions: string[];
}

interface ContentReviewContextRow {
  active: boolean;
  display_name?: string | null;
  permissions: string[];
}

interface ContentReviewSummaryRow {
  catalog_revision?: string | null;
  pending_review_items: number;
  affected_public_products: number;
}

interface ContentReviewQueueRow {
  review_key: string;
  source_fingerprint: string;
  products: Array<{ route?: string }>;
}

interface ContentReviewExpectations {
  catalogRevision: string;
  pendingReviewItems: number;
  affectedPublicProducts: number;
}

interface InviteOperatorPackageRow {
  package_id: string;
  published_resource_count: number;
}

interface IssuedOperatorInviteRow {
  invite_id: string;
  code: string;
  expires_at: string;
}

interface OperatorInviteRow {
  invite_id: string;
  status: string;
  redemption_count: number;
}

interface InviteOperatorAuditRow {
  actor_kind: string;
  actor_user_id?: string | null;
  invite_id?: string | null;
  event_type: string;
  details: Record<string, unknown>;
}

function readLocalStatus(): LocalSupabaseStatus {
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

function syncCurrentContentReviewQueue(status: LocalSupabaseStatus): void {
  const output = execFileSync("pnpm", ["content-review:sync:apply"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "inherit"],
    env: {
      ...process.env,
      SUPABASE_URL: status.API_URL,
      SUPABASE_SERVICE_ROLE_KEY: status.SERVICE_ROLE_KEY,
      CONTENT_REVIEW_SYNC_CONFIRM: "sync-current-content-review-queue",
    },
  });
  console.log(output.trim());
}

async function readContentReviewExpectations(): Promise<ContentReviewExpectations> {
  const worklist = JSON.parse(
    await readFile("content/products/manual-review-worklist.json", "utf8"),
  ) as ManualReviewWorklist;
  const pendingReviewItems = worklist.campaigns.reduce(
    (count, campaign) => count + campaign.items.length,
    0,
  );
  if (pendingReviewItems !== worklist.summary.pendingReviewItems) {
    throw new Error("The generated content-review worklist has an inconsistent item count.");
  }
  return {
    catalogRevision: worklist.catalogRevision,
    pendingReviewItems,
    affectedPublicProducts: worklist.summary.affectedPublicProducts,
  };
}

async function jsonRequest<T>(
  url: string,
  init: RequestInit,
  label: string,
): Promise<T> {
  const response = await fetch(url, init);
  const body = await response.text();
  if (!response.ok) {
    throw new Error(`${label} failed with HTTP ${response.status}: ${body.slice(0, 240)}`);
  }
  return (body.length === 0 ? null : JSON.parse(body)) as T;
}

async function expectRequestFailure(
  url: string,
  init: RequestInit,
  expectedMessage: string,
): Promise<void> {
  const response = await fetch(url, init);
  const body = await response.text();
  if (response.ok || !body.includes(expectedMessage)) {
    throw new Error(
      `Expected ${expectedMessage} failure, received HTTP ${response.status}: ${body.slice(0, 240)}`,
    );
  }
}

async function main() {
  const status = readLocalStatus();
  const contentReviewExpectations = await readContentReviewExpectations();
  syncCurrentContentReviewQueue(status);
  const code = "MANTUO-TMUA-LOCAL-2026-ACCESS";
  const unique = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const email = `supabase-contract-${unique}@example.test`;
  const secondEmail = `supabase-contract-second-${unique}@example.test`;
  const operatorEmail = `supabase-contract-operator-${unique}@example.test`;
  const password = `Contract${unique}A1`;
  const userIds: string[] = [];

  const publicHeaders = {
    apikey: status.PUBLISHABLE_KEY,
    "Content-Type": "application/json",
  };
  const serviceHeaders = {
    apikey: status.SERVICE_ROLE_KEY,
    Authorization: `Bearer ${status.SERVICE_ROLE_KEY}`,
    "Content-Type": "application/json",
  };

  try {
    const funnelContext = `http-${unique}`;
    await jsonRequest<null>(
      `${status.API_URL}/rest/v1/rpc/record_product_funnel_event`,
      {
        method: "POST",
        headers: publicHeaders,
        body: JSON.stringify({
          p_event_id: `fun_http_${unique}`,
          p_journey_id: `journey_http_${unique}`,
          p_event_type: "exam_selected",
          p_exam_id: "tmua",
          p_context_code: funnelContext,
          p_occurred_at: new Date().toISOString(),
        }),
      },
      "Anonymous privacy-safe funnel append",
    );
    await expectRequestFailure(
      `${status.API_URL}/rest/v1/rpc/product_funnel_summary`,
      {
        method: "POST",
        headers: publicHeaders,
        body: JSON.stringify({ p_since: new Date(Date.now() - 60_000).toISOString() }),
      },
      "permission denied for function product_funnel_summary",
    );
    const funnelSummary = await jsonRequest<ProductFunnelSummaryRow[]>(
      `${status.API_URL}/rest/v1/rpc/product_funnel_summary`,
      {
        method: "POST",
        headers: serviceHeaders,
        body: JSON.stringify({ p_since: new Date(Date.now() - 60_000).toISOString() }),
      },
      "Service-only product funnel summary",
    );
    const funnelRow = funnelSummary.find((row) => row.context_code === funnelContext);
    if (
      funnelRow?.event_type !== "exam_selected"
      || funnelRow.exam_id !== "tmua"
      || Number(funnelRow.event_count) !== 1
      || Number(funnelRow.unique_journeys) !== 1
    ) {
      throw new Error("Product funnel did not return exactly one anonymous aggregate journey.");
    }

    await expectRequestFailure(
      `${status.API_URL}/rest/v1/rpc/issue_invite`,
      {
        method: "POST",
        headers: serviceHeaders,
        body: JSON.stringify({
          p_label: "Draft-only HTTP contract check",
          p_package_ids: ["esat-deep-review"],
          p_max_redemptions: 1,
        }),
      },
      "invite_package_unpublished",
    );

    const preview = await jsonRequest<{ valid: boolean; packages?: string[] }>(
      `${status.API_URL}/functions/v1/invite-preview`,
      {
        method: "POST",
        headers: { ...publicHeaders, Origin: "http://127.0.0.1:57145" },
        body: JSON.stringify({ code }),
      },
      "Invite preview",
    );
    if (preview.valid !== true || !preview.packages?.includes("tmua-full-access")) {
      throw new Error("Invite preview did not expose the expected local package.");
    }

    const user = await jsonRequest<AdminUser>(
      `${status.API_URL}/auth/v1/admin/users`,
      {
        method: "POST",
        headers: serviceHeaders,
        body: JSON.stringify({ email, password, email_confirm: true }),
      },
      "Confirmed test user creation",
    );
    userIds.push(user.id);

    const session = await jsonRequest<PasswordSession>(
      `${status.API_URL}/auth/v1/token?grant_type=password`,
      {
        method: "POST",
        headers: publicHeaders,
        body: JSON.stringify({ email, password }),
      },
      "Password login",
    );
    const authenticatedHeaders = {
      ...publicHeaders,
      Authorization: `Bearer ${session.access_token}`,
    };

    const studentOperatorContext = await jsonRequest<InviteOperatorContextRow[]>(
      `${status.API_URL}/rest/v1/rpc/get_my_invite_operator_context`,
      {
        method: "POST",
        headers: authenticatedHeaders,
        body: "{}",
      },
      "Ordinary student operator context",
    );
    if (studentOperatorContext[0]?.active !== false) {
      throw new Error("An ordinary student received an active invite-operator context.");
    }
    await expectRequestFailure(
      `${status.API_URL}/rest/v1/rpc/issue_operator_invite`,
      {
        method: "POST",
        headers: authenticatedHeaders,
        body: JSON.stringify({
          p_reference: "student-attempt",
          p_package_ids: ["tmua-full-access"],
          p_max_redemptions: 1,
          p_expires_at: new Date(Date.now() + 86_400_000).toISOString(),
          p_entitlement_duration: "30 days",
        }),
      },
      "invite_operator_required",
    );

    const studentReviewContext = await jsonRequest<ContentReviewContextRow[]>(
      `${status.API_URL}/rest/v1/rpc/get_my_content_review_viewer_context`,
      { method: "POST", headers: authenticatedHeaders, body: "{}" },
      "Ordinary student content-review context",
    );
    if (studentReviewContext[0]?.active !== false) {
      throw new Error("An ordinary student received an active content-review context.");
    }
    await expectRequestFailure(
      `${status.API_URL}/rest/v1/rpc/list_content_review_queue`,
      {
        method: "POST",
        headers: authenticatedHeaders,
        body: JSON.stringify({ p_campaign_id: null, p_limit: 200 }),
      },
      "content_review_viewer_required",
    );
    await jsonRequest<unknown>(
      `${status.API_URL}/rest/v1/rpc/configure_content_review_viewer`,
      {
        method: "POST",
        headers: serviceHeaders,
        body: JSON.stringify({
          p_viewer_user_id: user.id,
          p_display_name: "HTTP content reviewer",
          p_active: true,
          p_reason: "Local HTTP source-bound review queue contract",
        }),
      },
      "Content review capability grant",
    );
    const activeReviewContext = await jsonRequest<ContentReviewContextRow[]>(
      `${status.API_URL}/rest/v1/rpc/get_my_content_review_viewer_context`,
      { method: "POST", headers: authenticatedHeaders, body: "{}" },
      "Active content-review context",
    );
    if (
      activeReviewContext[0]?.active !== true
      || !activeReviewContext[0].permissions.includes("view_content_review_queue")
      || activeReviewContext[0].permissions.includes("approve_content_product")
    ) {
      throw new Error("The content reviewer did not receive the exact prepare-only capability.");
    }
    const reviewSummary = await jsonRequest<ContentReviewSummaryRow[]>(
      `${status.API_URL}/rest/v1/rpc/get_content_review_queue_summary`,
      { method: "POST", headers: authenticatedHeaders, body: "{}" },
      "Source-bound content-review summary",
    );
    if (
      Number(reviewSummary[0]?.pending_review_items) !== contentReviewExpectations.pendingReviewItems
      || Number(reviewSummary[0]?.affected_public_products) !== contentReviewExpectations.affectedPublicProducts
      || reviewSummary[0]?.catalog_revision !== contentReviewExpectations.catalogRevision
    ) {
      throw new Error("The content-review summary did not match the current generated worklist.");
    }
    const reviewQueue = await jsonRequest<ContentReviewQueueRow[]>(
      `${status.API_URL}/rest/v1/rpc/list_content_review_queue`,
      {
        method: "POST",
        headers: authenticatedHeaders,
        body: JSON.stringify({ p_campaign_id: null, p_limit: 200 }),
      },
      "Source-bound content-review queue",
    );
    if (
      reviewQueue.length !== contentReviewExpectations.pendingReviewItems
      || reviewQueue.some((item) => !/^sha256:[0-9a-f]{64}$/u.test(item.source_fingerprint))
      || reviewQueue.some((item) => item.products.some((product) => !product.route?.startsWith("/")))
    ) {
      throw new Error("The content-review queue lost its current fingerprint or internal-route boundary.");
    }
    await jsonRequest<unknown>(
      `${status.API_URL}/rest/v1/rpc/configure_content_review_viewer`,
      {
        method: "POST",
        headers: serviceHeaders,
        body: JSON.stringify({
          p_viewer_user_id: user.id,
          p_display_name: "HTTP content reviewer",
          p_active: false,
          p_reason: "Local HTTP source-bound review queue contract complete",
        }),
      },
      "Content review capability revocation",
    );
    await expectRequestFailure(
      `${status.API_URL}/rest/v1/rpc/list_content_review_queue`,
      {
        method: "POST",
        headers: authenticatedHeaders,
        body: JSON.stringify({ p_campaign_id: null, p_limit: 200 }),
      },
      "content_review_viewer_required",
    );

    const operatorUser = await jsonRequest<AdminUser>(
      `${status.API_URL}/auth/v1/admin/users`,
      {
        method: "POST",
        headers: serviceHeaders,
        body: JSON.stringify({ email: operatorEmail, password, email_confirm: true }),
      },
      "Invite operator user creation",
    );
    userIds.push(operatorUser.id);
    await jsonRequest<unknown>(
      `${status.API_URL}/rest/v1/rpc/configure_invite_operator`,
      {
        method: "POST",
        headers: serviceHeaders,
        body: JSON.stringify({
          p_operator_user_id: operatorUser.id,
          p_display_name: "冰冰",
          p_active: true,
          p_reason: "Local HTTP operator contract",
        }),
      },
      "Invite operator grant",
    );
    const operatorSession = await jsonRequest<PasswordSession>(
      `${status.API_URL}/auth/v1/token?grant_type=password`,
      {
        method: "POST",
        headers: publicHeaders,
        body: JSON.stringify({ email: operatorEmail, password }),
      },
      "Invite operator password login",
    );
    const operatorHeaders = {
      ...publicHeaders,
      Authorization: `Bearer ${operatorSession.access_token}`,
    };
    const operatorContext = await jsonRequest<InviteOperatorContextRow[]>(
      `${status.API_URL}/rest/v1/rpc/get_my_invite_operator_context`,
      { method: "POST", headers: operatorHeaders, body: "{}" },
      "Active invite operator context",
    );
    if (
      operatorContext[0]?.active !== true
      || operatorContext[0].display_name !== "冰冰"
      || !operatorContext[0].permissions.includes("issue_invite")
    ) {
      throw new Error("The approved operator did not receive the invite-only permission set.");
    }
    const operatorPackages = await jsonRequest<InviteOperatorPackageRow[]>(
      `${status.API_URL}/rest/v1/rpc/list_invite_operator_packages`,
      { method: "POST", headers: operatorHeaders, body: "{}" },
      "Published operator package list",
    );
    if (
      !operatorPackages.some((row) =>
        row.package_id === "tmua-full-access" && Number(row.published_resource_count) >= 1)
      || operatorPackages.some((row) => row.package_id === "esat-deep-review")
    ) {
      throw new Error("The operator package list crossed the publication gate.");
    }
    const issuedOperatorInvites = await jsonRequest<IssuedOperatorInviteRow[]>(
      `${status.API_URL}/rest/v1/rpc/issue_operator_invite`,
      {
        method: "POST",
        headers: operatorHeaders,
        body: JSON.stringify({
          p_reference: "lead-http",
          p_package_ids: ["tmua-full-access"],
          p_max_redemptions: 1,
          p_expires_at: new Date(Date.now() + 86_400_000).toISOString(),
          p_entitlement_duration: "30 days",
        }),
      },
      "Audited operator invite issue",
    );
    const issuedOperatorInvite = issuedOperatorInvites[0];
    if (
      issuedOperatorInvites.length !== 1
      || issuedOperatorInvite?.code.length !== 36
      || issuedOperatorInvite.invite_id.length === 0
    ) {
      throw new Error("The operator issuer did not return exactly one finite plaintext code.");
    }
    const ownOperatorInvites = await jsonRequest<OperatorInviteRow[]>(
      `${status.API_URL}/rest/v1/rpc/list_my_issued_invites`,
      { method: "POST", headers: operatorHeaders, body: "{}" },
      "Operator own-invite list",
    );
    if (
      ownOperatorInvites.length !== 1
      || ownOperatorInvites[0]?.invite_id !== issuedOperatorInvite.invite_id
      || Number(ownOperatorInvites[0].redemption_count) !== 0
    ) {
      throw new Error("The operator could not list exactly her own non-identifying invite record.");
    }
    await jsonRequest<unknown>(
      `${status.API_URL}/rest/v1/rpc/revoke_my_issued_invite`,
      {
        method: "POST",
        headers: operatorHeaders,
        body: JSON.stringify({
          p_invite_id: issuedOperatorInvite.invite_id,
          p_reason: "Local contract cleanup",
        }),
      },
      "Operator own-invite revocation",
    );
    const revokedOperatorPreview = await jsonRequest<{ valid: boolean }>(
      `${status.API_URL}/functions/v1/invite-preview`,
      {
        method: "POST",
        headers: { ...publicHeaders, Origin: "http://127.0.0.1:57145" },
        body: JSON.stringify({ code: issuedOperatorInvite.code }),
      },
      "Revoked operator invite preview",
    );
    if (revokedOperatorPreview.valid !== false) {
      throw new Error("A revoked operator invite remained valid for registration.");
    }
    const operatorAudit = await jsonRequest<InviteOperatorAuditRow[]>(
      `${status.API_URL}/rest/v1/rpc/list_invite_operator_audit`,
      {
        method: "POST",
        headers: serviceHeaders,
        body: JSON.stringify({
          p_since: new Date(Date.now() - 60_000).toISOString(),
          p_limit: 100,
        }),
      },
      "Service-only invite operator audit",
    );
    const inviteAuditEvents = operatorAudit.filter(
      (event) => event.invite_id === issuedOperatorInvite.invite_id,
    );
    if (
      inviteAuditEvents.length !== 2
      || !inviteAuditEvents.some((event) => event.event_type === "invite_issued")
      || !inviteAuditEvents.some((event) => event.event_type === "invite_revoked")
      || inviteAuditEvents.some((event) =>
        JSON.stringify(event.details).includes(issuedOperatorInvite.code))
    ) {
      throw new Error("The service audit did not preserve the invite lifecycle without plaintext code.");
    }
    await jsonRequest<unknown>(
      `${status.API_URL}/rest/v1/rpc/configure_invite_operator`,
      {
        method: "POST",
        headers: serviceHeaders,
        body: JSON.stringify({
          p_operator_user_id: operatorUser.id,
          p_display_name: "冰冰",
          p_active: false,
          p_reason: "Local HTTP operator contract complete",
        }),
      },
      "Invite operator grant revocation",
    );
    const revokedOperatorContext = await jsonRequest<InviteOperatorContextRow[]>(
      `${status.API_URL}/rest/v1/rpc/get_my_invite_operator_context`,
      { method: "POST", headers: operatorHeaders, body: "{}" },
      "Revoked invite operator context",
    );
    if (revokedOperatorContext[0]?.active !== false) {
      throw new Error("Revoking the operator grant did not remove operator access immediately.");
    }

    const lockedBeforeRedemption = await jsonRequest<EntitledContentResourceRow[]>(
      `${status.API_URL}/rest/v1/rpc/get_entitled_content_resource`,
      {
        method: "POST",
        headers: authenticatedHeaders,
        body: JSON.stringify({ p_resource_id: "tmua-six-week-review-plan-v1" }),
      },
      "Locked content lookup before redemption",
    );
    if (lockedBeforeRedemption.length !== 0) {
      throw new Error("A signed-in account accessed private content before entitlement.");
    }

    const redeemed = await jsonRequest<EntitlementRow[]>(
      `${status.API_URL}/rest/v1/rpc/redeem_invite`,
      {
        method: "POST",
        headers: authenticatedHeaders,
        body: JSON.stringify({ p_code: code }),
      },
      "Invite redemption",
    );
    if (!redeemed.some((row) => row.package_id === "tmua-full-access")) {
      throw new Error("Invite redemption did not return the expected entitlement.");
    }

    const entitlements = await jsonRequest<EntitlementRow[]>(
      `${status.API_URL}/rest/v1/user_entitlements?select=package_id`,
      { method: "GET", headers: authenticatedHeaders },
      "Entitlement lookup",
    );
    if (!entitlements.some((row) => row.package_id === "tmua-full-access")) {
      throw new Error("RLS-protected entitlement lookup did not return the redeemed package.");
    }

    const delivered = await jsonRequest<EntitledContentResourceRow[]>(
      `${status.API_URL}/rest/v1/rpc/get_entitled_content_resource`,
      {
        method: "POST",
        headers: authenticatedHeaders,
        body: JSON.stringify({ p_resource_id: "tmua-six-week-review-plan-v1" }),
      },
      "Entitled structured content delivery",
    );
    const deliveredPlan = delivered[0];
    const deliveredSessions = deliveredPlan?.payload.weeklyPlan
      ?.flatMap((week) => week.sessions ?? []).length;
    if (
      delivered.length !== 1 ||
      deliveredPlan?.id !== "tmua-six-week-review-plan-v1" ||
      deliveredPlan.source_sha256 !== "9c1430c1fa10ebe313483b367a65f0516381924528a76638107c2f48298fc438" ||
      deliveredPlan.payload.weeklyPlan?.length !== 6 ||
      deliveredSessions !== 30
    ) {
      throw new Error("Entitled content delivery did not return the verified six-week product.");
    }

    const deliveredReview = await jsonRequest<EntitledContentResourceRow[]>(
      `${status.API_URL}/rest/v1/rpc/get_entitled_content_resource`,
      {
        method: "POST",
        headers: authenticatedHeaders,
        body: JSON.stringify({ p_resource_id: "tmua-specimen-p1-worked-explanations-v1" }),
      },
      "Entitled 20-question worked review delivery",
    );
    const workedReview = deliveredReview[0];
    if (
      deliveredReview.length !== 1 ||
      workedReview?.id !== "tmua-specimen-p1-worked-explanations-v1" ||
      workedReview.source_sha256 !== "25b776e6951dcf79cc7657fc1865df4547fbef5a737fb81eb28ee7e0e4b4233e" ||
      workedReview.payload.explanations?.length !== 20 ||
      workedReview.payload.explanations.map((item) => item.correctAnswer).join("") !==
        "DDBEDDCFADEDCDAEDBDG"
    ) {
      throw new Error("Entitled content delivery did not return the verified 20-question worked review.");
    }

    const guestSpaceId = `gsp_http_${unique}`;
    const sessionId = `ses_http_${unique}`;
    const eventId = `evt_http_${unique}`;
    const actor = { kind: "guest", actorId: `guest_http_${unique}` };
    const sessionPayload = {
      schemaVersion: 3,
      id: sessionId,
      learningSpaceId: guestSpaceId,
      startedBy: actor,
      paperId: "tmua-2023-p1",
      paperRevisionId: "tmua-2023-p1-r1",
      contentDigest: "ad52e7968d9cc8459289f22d8239cd2e981d470e40ec2c14270a7d10e540caba",
      status: "active",
      startedAt: "2026-07-18T00:00:00.000Z",
      deadlineAt: "2026-07-18T01:15:00.000Z",
      currentQuestion: 1,
      answers: {},
      markedQuestionIds: [],
      timingByQuestionMs: {},
      activeQuestionEnteredAt: "2026-07-18T00:00:00.000Z",
      events: [{
        id: eventId,
        schemaVersion: 1,
        learningSpaceId: guestSpaceId,
        sessionId,
        sequence: 1,
        type: "session_started",
        actor,
        occurredAt: "2026-07-18T00:00:00.000Z",
        payload: {
          paperId: "tmua-2023-p1",
          deadlineAt: "2026-07-18T01:15:00.000Z",
        },
      }],
    };

    await jsonRequest<unknown>(
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
            curriculumSystem: "ap",
            selections: [{
              qualificationId: "ap-calculus-bc-2020-current",
              unitIds: ["u1", "u2", "u5", "u6", "u10"],
            }],
            experience: "sampled",
            createdAt: "2026-07-18T00:00:00.000Z",
            updatedAt: "2026-07-18T00:00:00.000Z",
          },
        }),
      },
      "Authenticated profile save",
    );

    await jsonRequest<unknown>(
      `${status.API_URL}/rest/v1/rpc/save_assessment_background_profile`,
      {
        method: "POST",
        headers: authenticatedHeaders,
        body: JSON.stringify({
          p_profile: {
            schemaVersion: 2,
            guestSpaceId,
            examId: "ucat",
            entryCycle: "2027",
            curriculumId: "a-level",
            learningStage: "year-12",
            subjectAreas: ["mathematics", "biology"],
            courseIds: ["al-mathematics", "al-biology"],
            experience: "sampled",
            weeklyTime: "2-4",
            createdAt: "2026-07-18T00:00:00.000Z",
            updatedAt: "2026-07-18T00:00:00.000Z",
          },
        }),
      },
      "Authenticated UCAT background profile save",
    );
    const assessmentProfiles = await jsonRequest<AssessmentBackgroundProfileRow[]>(
      `${status.API_URL}/rest/v1/assessment_background_profiles?select=exam_id,profile`,
      { method: "GET", headers: authenticatedHeaders },
      "RLS-protected assessment background profile lookup",
    );
    if (
      assessmentProfiles.length !== 1
      || assessmentProfiles[0]?.exam_id !== "ucat"
      || assessmentProfiles[0]?.profile.examId !== "ucat"
    ) {
      throw new Error("The authenticated learner could not read exactly their UCAT background profile.");
    }

    for (let replay = 0; replay < 2; replay += 1) {
      await jsonRequest<unknown>(
        `${status.API_URL}/rest/v1/rpc/save_practice_session`,
        {
          method: "POST",
          headers: authenticatedHeaders,
          body: JSON.stringify({ p_session: sessionPayload }),
        },
        `Authenticated session save ${replay + 1}`,
      );
    }

    const sessions = await jsonRequest<PracticeSessionRow[]>(
      `${status.API_URL}/rest/v1/practice_sessions?select=id&id=eq.${sessionId}`,
      { method: "GET", headers: authenticatedHeaders },
      "RLS-protected practice lookup",
    );
    if (sessions.length !== 1 || sessions[0]?.id !== sessionId) {
      throw new Error("Idempotent session replay did not preserve exactly one session.");
    }

    const feedbackPayload = {
      p_category: "content_error",
      p_exam_id: "tmua",
      p_route: "/practice/tmua-specimen-p1",
      p_resource_id: "tmua-specimen-p1",
      p_question_id: "tmua-specimen-p1-q01",
      p_message: "The displayed formula is missing a minus sign.",
    };
    const feedbackReceipt = await jsonRequest<FeedbackReceiptRow[]>(
      `${status.API_URL}/rest/v1/rpc/submit_student_feedback`,
      {
        method: "POST",
        headers: authenticatedHeaders,
        body: JSON.stringify(feedbackPayload),
      },
      "Authenticated feedback submission",
    );
    const submittedFeedback = feedbackReceipt[0];
    if (feedbackReceipt.length !== 1 || submittedFeedback?.priority !== "P2") {
      throw new Error("Content correction did not enter the P2 feedback queue.");
    }
    const duplicateReceipt = await jsonRequest<FeedbackReceiptRow[]>(
      `${status.API_URL}/rest/v1/rpc/submit_student_feedback`,
      {
        method: "POST",
        headers: authenticatedHeaders,
        body: JSON.stringify(feedbackPayload),
      },
      "Idempotent feedback submission",
    );
    if (duplicateReceipt[0]?.feedback_id !== submittedFeedback.feedback_id) {
      throw new Error("Duplicate feedback created a second receipt.");
    }
    await expectRequestFailure(
      `${status.API_URL}/rest/v1/rpc/submit_student_feedback`,
      {
        method: "POST",
        headers: authenticatedHeaders,
        body: JSON.stringify({
          ...feedbackPayload,
          p_category: "technical_problem",
          p_question_id: null,
          p_message: "Please call 13812345678 because the page is broken.",
        }),
      },
      "feedback_message_contains_contact_details",
    );

    const exported = await jsonRequest<LearningDataExport>(
      `${status.API_URL}/rest/v1/rpc/export_my_learning_data`,
      {
        method: "POST",
        headers: authenticatedHeaders,
        body: "{}",
      },
      "Authenticated learning-data export",
    );
    if (
      exported.schemaVersion !== 4
      || exported.account?.email !== email
      || exported.assessmentBackgroundProfiles?.length !== 1
      || exported.practiceSessions?.length !== 1
      || exported.feedback?.length !== 1
      || exported.collaborationInvites?.length !== 0
      || exported.collaborationGrants?.length !== 0
      || exported.collaborationArtifacts?.length !== 0
      || exported.collaborationAudit?.length !== 0
    ) {
      throw new Error("Learning-data export did not contain the authenticated learner's data.");
    }

    const secondUser = await jsonRequest<AdminUser>(
      `${status.API_URL}/auth/v1/admin/users`,
      {
        method: "POST",
        headers: serviceHeaders,
        body: JSON.stringify({ email: secondEmail, password, email_confirm: true }),
      },
      "Second confirmed test user creation",
    );
    userIds.push(secondUser.id);
    const secondSession = await jsonRequest<PasswordSession>(
      `${status.API_URL}/auth/v1/token?grant_type=password`,
      {
        method: "POST",
        headers: publicHeaders,
        body: JSON.stringify({ email: secondEmail, password }),
      },
      "Second user password login",
    );
    const collaborationInvite = await jsonRequest<CollaborationInviteRow[]>(
      `${status.API_URL}/rest/v1/rpc/issue_my_collaboration_invite`,
      {
        method: "POST",
        headers: authenticatedHeaders,
        body: JSON.stringify({
          p_subject_kind: "teacher",
          p_scopes: ["progress:read", "plans:write"],
          p_exam_ids: ["tmua"],
          p_grant_days: 7,
        }),
      },
      "Student-issued collaboration invite",
    );
    if (collaborationInvite.length !== 1 || !collaborationInvite[0]?.code.startsWith("MTSHARE-")) {
      throw new Error("Student-issued collaboration invite did not return a one-time code.");
    }
    const secondAuthenticatedHeaders = {
      ...publicHeaders,
      Authorization: `Bearer ${secondSession.access_token}`,
    };
    const redeemedCollaboration = await jsonRequest<SharedLearnerAccessRow[]>(
      `${status.API_URL}/rest/v1/rpc/redeem_collaboration_invite`,
      {
        method: "POST",
        headers: secondAuthenticatedHeaders,
        body: JSON.stringify({ p_code: collaborationInvite[0].code }),
      },
      "Teacher collaboration-code redemption",
    );
    const collaborationGrant = redeemedCollaboration[0];
    if (
      redeemedCollaboration.length !== 1
      || collaborationGrant?.subject_kind !== "teacher"
      || collaborationGrant.scopes.join(",") !== "progress:read,plans:write"
    ) {
      throw new Error("Redeemed collaboration grant did not preserve the student's exact scopes.");
    }
    const sharedProgress = await jsonRequest<SharedProgressRow[]>(
      `${status.API_URL}/rest/v1/rpc/get_shared_learning_progress`,
      {
        method: "POST",
        headers: secondAuthenticatedHeaders,
        body: JSON.stringify({ p_grant_id: collaborationGrant.grant_id, p_exam_id: "tmua" }),
      },
      "Authorised teacher aggregate-progress read",
    );
    if (sharedProgress.length !== 1 || sharedProgress[0]?.session_id !== sessionPayload.id) {
      throw new Error("Authorised teacher did not receive the student's scoped aggregate progress.");
    }
    await expectRequestFailure(
      `${status.API_URL}/rest/v1/rpc/list_shared_learning_responses`,
      {
        method: "POST",
        headers: secondAuthenticatedHeaders,
        body: JSON.stringify({ p_grant_id: collaborationGrant.grant_id, p_exam_id: "tmua" }),
      },
      "collaboration_grant_required",
    );
    const createdPlan = await jsonRequest<CollaborationArtifactRow[]>(
      `${status.API_URL}/rest/v1/rpc/create_collaboration_artifact`,
      {
        method: "POST",
        headers: secondAuthenticatedHeaders,
        body: JSON.stringify({
          p_grant_id: collaborationGrant.grant_id,
          p_kind: "plan",
          p_exam_id: "tmua",
          p_title: "HTTP collaboration plan",
          p_body: "Review the saved diagnostic evidence before the next practice.",
          p_due_at: null,
        }),
      },
      "Authorised teacher plan creation",
    );
    if (createdPlan.length !== 1 || createdPlan[0]?.kind !== "plan") {
      throw new Error("Authorised plan write did not create a collaboration artifact.");
    }
    const collaborationAudit = await jsonRequest<CollaborationAuditRow[]>(
      `${status.API_URL}/rest/v1/rpc/list_my_collaboration_audit`,
      {
        method: "POST",
        headers: authenticatedHeaders,
        body: JSON.stringify({ p_limit: 50 }),
      },
      "Student-visible collaboration audit",
    );
    for (const expectedEvent of ["invite_created", "grant_redeemed", "progress_viewed", "plan_created"]) {
      if (!collaborationAudit.some((event) => event.event_type === expectedEvent)) {
        throw new Error(`Student-visible collaboration audit missed ${expectedEvent}.`);
      }
    }
    const collaborationExport = await jsonRequest<LearningDataExport>(
      `${status.API_URL}/rest/v1/rpc/export_my_learning_data`,
      { method: "POST", headers: authenticatedHeaders, body: "{}" },
      "Collaboration-aware learning-data export",
    );
    if (
      collaborationExport.schemaVersion !== 4
      || collaborationExport.collaborationInvites?.length !== 1
      || collaborationExport.collaborationGrants?.length !== 1
      || collaborationExport.collaborationArtifacts?.length !== 1
      || (collaborationExport.collaborationAudit?.length ?? 0) < 4
    ) {
      throw new Error("Schema-v4 export did not include the student's collaboration records.");
    }
    await jsonRequest<null>(
      `${status.API_URL}/rest/v1/rpc/revoke_my_collaboration_grant`,
      {
        method: "POST",
        headers: authenticatedHeaders,
        body: JSON.stringify({ p_grant_id: collaborationGrant.grant_id }),
      },
      "Immediate student collaboration-grant revocation",
    );
    await expectRequestFailure(
      `${status.API_URL}/rest/v1/rpc/get_shared_learning_progress`,
      {
        method: "POST",
        headers: secondAuthenticatedHeaders,
        body: JSON.stringify({ p_grant_id: collaborationGrant.grant_id, p_exam_id: "tmua" }),
      },
      "collaboration_grant_required",
    );
    await expectRequestFailure(
      `${status.API_URL}/rest/v1/rpc/save_practice_session`,
      {
        method: "POST",
        headers: {
          ...publicHeaders,
          Authorization: `Bearer ${secondSession.access_token}`,
        },
        body: JSON.stringify({ p_session: sessionPayload }),
      },
      "guest_space_already_claimed",
    );

    const secondExport = await jsonRequest<LearningDataExport>(
      `${status.API_URL}/rest/v1/rpc/export_my_learning_data`,
      {
        method: "POST",
        headers: {
          ...publicHeaders,
          Authorization: `Bearer ${secondSession.access_token}`,
        },
        body: "{}",
      },
      "Second learner data export",
    );
    if (secondExport.practiceSessions?.length !== 0) {
      throw new Error("Second learner export crossed the tenant boundary.");
    }

    const secondAssessmentProfiles = await jsonRequest<AssessmentBackgroundProfileRow[]>(
      `${status.API_URL}/rest/v1/assessment_background_profiles?select=exam_id,profile`,
      {
        method: "GET",
        headers: {
          ...publicHeaders,
          Authorization: `Bearer ${secondSession.access_token}`,
        },
      },
      "Second learner assessment background profile lookup",
    );
    if (secondAssessmentProfiles.length !== 0) {
      throw new Error("Second learner crossed the assessment-profile tenant boundary.");
    }

    const secondFeedback = await jsonRequest<FeedbackRow[]>(
      `${status.API_URL}/rest/v1/student_feedback?select=id,status`,
      {
        method: "GET",
        headers: {
          ...publicHeaders,
          Authorization: `Bearer ${secondSession.access_token}`,
        },
      },
      "Second learner feedback lookup",
    );
    if (secondFeedback.length !== 0) {
      throw new Error("Second learner crossed the feedback tenant boundary.");
    }

    await jsonRequest<null>(
      `${status.API_URL}/rest/v1/rpc/triage_student_feedback`,
      {
        method: "POST",
        headers: serviceHeaders,
        body: JSON.stringify({
          p_feedback_id: submittedFeedback.feedback_id,
          p_status: "resolved",
          p_internal_note: "Verified and corrected in source mapping.",
        }),
      },
      "Audited feedback triage",
    );
    const resolvedFeedback = await jsonRequest<FeedbackRow[]>(
      `${status.API_URL}/rest/v1/student_feedback?select=id,status&id=eq.${submittedFeedback.feedback_id}`,
      { method: "GET", headers: authenticatedHeaders },
      "Resolved feedback lookup",
    );
    if (resolvedFeedback.length !== 1 || resolvedFeedback[0]?.status !== "resolved") {
      throw new Error("Resolved feedback status was not visible to its student owner.");
    }

    const secondContent = await jsonRequest<EntitledContentResourceRow[]>(
      `${status.API_URL}/rest/v1/rpc/get_entitled_content_resource`,
      {
        method: "POST",
        headers: {
          ...publicHeaders,
          Authorization: `Bearer ${secondSession.access_token}`,
        },
        body: JSON.stringify({ p_resource_id: "tmua-six-week-review-plan-v1" }),
      },
      "Second learner entitled-content lookup",
    );
    if (secondContent.length !== 0) {
      throw new Error("Second learner crossed the entitled-content boundary.");
    }
    const secondWorkedReview = await jsonRequest<EntitledContentResourceRow[]>(
      `${status.API_URL}/rest/v1/rpc/get_entitled_content_resource`,
      {
        method: "POST",
        headers: {
          ...publicHeaders,
          Authorization: `Bearer ${secondSession.access_token}`,
        },
        body: JSON.stringify({ p_resource_id: "tmua-specimen-p1-worked-explanations-v1" }),
      },
      "Second learner worked-review lookup",
    );
    if (secondWorkedReview.length !== 0) {
      throw new Error("Second learner crossed the worked-review entitlement boundary.");
    }

    await jsonRequest<unknown>(
      `${status.API_URL}/rest/v1/user_entitlements?user_id=eq.${user.id}&package_id=eq.tmua-full-access`,
      {
        method: "PATCH",
        headers: serviceHeaders,
        body: JSON.stringify({ revoked_at: new Date().toISOString() }),
      },
      "Entitlement revocation",
    );
    await jsonRequest<unknown>(
      `${status.API_URL}/rest/v1/user_entitlements?user_id=eq.${user.id}&package_id=eq.tmua-deep-review`,
      {
        method: "PATCH",
        headers: serviceHeaders,
        body: JSON.stringify({ revoked_at: new Date().toISOString() }),
      },
      "Deep-review entitlement revocation",
    );
    const afterRevocation = await jsonRequest<EntitledContentResourceRow[]>(
      `${status.API_URL}/rest/v1/rpc/get_entitled_content_resource`,
      {
        method: "POST",
        headers: authenticatedHeaders,
        body: JSON.stringify({ p_resource_id: "tmua-six-week-review-plan-v1" }),
      },
      "Revoked entitled-content lookup",
    );
    if (afterRevocation.length !== 0) {
      throw new Error("Revoked package still exposed private content.");
    }
    const workedReviewAfterRevocation = await jsonRequest<EntitledContentResourceRow[]>(
      `${status.API_URL}/rest/v1/rpc/get_entitled_content_resource`,
      {
        method: "POST",
        headers: authenticatedHeaders,
        body: JSON.stringify({ p_resource_id: "tmua-specimen-p1-worked-explanations-v1" }),
      },
      "Revoked worked-review lookup",
    );
    if (workedReviewAfterRevocation.length !== 0) {
      throw new Error("Revoked deep-review package still exposed worked explanations.");
    }

    await jsonRequest<null>(
      `${status.API_URL}/rest/v1/rpc/delete_my_account`,
      {
        method: "POST",
        headers: {
          ...publicHeaders,
          Authorization: `Bearer ${secondSession.access_token}`,
        },
        body: "{}",
      },
      "Authenticated account deletion",
    );

    process.stdout.write("Local Supabase HTTP access, source-bound content-review operations, student collaboration grants, invite-operator isolation, anonymous funnel, exam profiles, learner-data, data-rights, feedback and entitled-content flow: PASS\n");
  } finally {
    for (const userId of userIds.reverse()) {
      await fetch(`${status.API_URL}/auth/v1/admin/users/${userId}`, {
        method: "DELETE",
        headers: serviceHeaders,
      });
    }
  }
}

await main();
