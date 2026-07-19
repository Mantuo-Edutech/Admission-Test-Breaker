import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

const migrationPath = "supabase/migrations/20260715090000_private_account_foundation.sql";
const learnerDataMigrationPath =
  "supabase/migrations/20260718143000_durable_learner_data.sql";
const dataRightsMigrationPath =
  "supabase/migrations/20260718172000_student_data_rights.sql";
const entitledContentMigrationPath =
  "supabase/migrations/20260718190000_entitled_content_delivery.sql";
const tmuaDeepReviewMigrationPath =
  "supabase/migrations/20260718213000_tmua_specimen_p1_deep_review.sql";
const feedbackMigrationPath =
  "supabase/migrations/20260718224500_student_feedback_foundation.sql";
const assessmentProfileMigrationPath =
  "supabase/migrations/20260718233000_assessment_background_profiles.sql";
const invitePublicationGateMigrationPath =
  "supabase/migrations/20260719090000_invite_publication_gate.sql";
const tmuaIbApProfileMigrationPath =
  "supabase/migrations/20260719113000_tmua_ib_ap_profiles.sql";
const productFunnelMigrationPath =
  "supabase/migrations/20260719150000_privacy_safe_product_funnel.sql";
const inviteOperatorMigrationPath =
  "supabase/migrations/20260719170000_invite_operator_workflow.sql";
const productFunnelViewerMigrationPath =
  "supabase/migrations/20260719193000_product_funnel_viewer_workflow.sql";
const collaborationMigrationPath =
  "supabase/migrations/20260719210000_student_controlled_collaboration.sql";
const collaborationExportMigrationPath =
  "supabase/migrations/20260719211000_collaboration_data_export.sql";
const contentReviewOperationsMigrationPath =
  "supabase/migrations/20260719222000_content_review_operations_workbench.sql";

describe("Supabase architecture contracts", () => {
  it("keeps every learner-owned and entitlement table behind RLS", async () => {
    const migration = await readFile(migrationPath, "utf8");
    for (const table of [
      "app_users",
      "learner_spaces",
      "preparation_profiles",
      "practice_sessions",
      "learning_events",
      "content_resources",
      "user_entitlements",
    ]) {
      expect(migration).toContain(`alter table public.${table} enable row level security;`);
    }
    expect(migration).toContain("using (auth_user_id = (select auth.uid()))");
    expect(migration).toContain("private.owns_learner_space(learner_space_id)");
    expect(migration).toContain("using (user_id = (select auth.uid()))");
  });

  it("keeps invite creation and preview validation off the browser roles", async () => {
    const migration = await readFile(migrationPath, "utf8");
    expect(migration).toContain(
      "revoke all on function public.issue_invite(text, text[], integer, timestamptz, interval) from public, anon, authenticated;",
    );
    expect(migration).toContain(
      "grant execute on function public.issue_invite(text, text[], integer, timestamptz, interval) to service_role;",
    );
    expect(migration).toContain(
      "grant execute on function public.redeem_invite(text) to authenticated;",
    );

    const edgeFunction = await readFile("supabase/functions/invite-preview/index.ts", "utf8");
    expect(edgeFunction).toContain('Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")');
    expect(edgeFunction).not.toMatch(/console\.(?:log|info|debug)\s*\(/);
  });

  it("issues invitations only for packages backed by published entitled products", async () => {
    const migration = await readFile(invitePublicationGateMigrationPath, "utf8");

    expect(migration).toContain("resource.access_tier = 'entitled'");
    expect(migration).toContain("resource.publication_status = 'published'");
    expect(migration).toContain("resource.published_at is not null");
    expect(migration).toContain("invite_package_unpublished");
    expect(migration).toContain(
      "from public, anon, authenticated;",
    );
    expect(migration).toContain(
      "to service_role;",
    );
  });

  it("gives Bingbing an audited invite-only operator role without learner-data access", async () => {
    const migration = await readFile(inviteOperatorMigrationPath, "utf8");

    expect(migration).toContain("create table private.invite_operator_grants");
    expect(migration).toContain("create table private.invite_operator_events");
    expect(migration).toContain("create or replace function private.require_active_invite_operator");
    expect(migration).toContain("create or replace function public.configure_invite_operator");
    expect(migration).toContain("create or replace function public.issue_operator_invite");
    expect(migration).toContain("create or replace function public.list_my_issued_invites");
    expect(migration).toContain("create or replace function public.revoke_my_issued_invite");
    expect(migration).toContain("create or replace function public.list_invite_operator_audit");
    expect(migration).toContain("invite_package_unpublished");
    expect(migration).toContain("invite_reference_personal_data");
    expect(migration).toContain("private.is_active_invite_operator(request_user_id)");
    expect(migration).toContain("where invite.created_by = operator_user_id");
    expect(migration).toContain("and invite.created_by = operator_user_id");
    expect(migration).toContain(
      "revoke all on function public.list_invite_operator_audit(timestamptz, integer)",
    );
    expect(migration).toContain("to service_role;");
    expect(migration).toContain("to authenticated;");
    expect(migration).not.toMatch(/grant\s+select\s+on\s+(?:table\s+)?public\.(?:practice_sessions|learning_events|preparation_profiles|assessment_background_profiles)\s+to\s+authenticated/iu);
  });

  it("keeps the private operator page on the own-record RPC surface", async () => {
    const service = await readFile(
      "src/features/invite-operations/supabase-invite-operations-service.ts",
      "utf8",
    );
    const page = await readFile(
      "src/features/invite-operations/pages/InviteOperationsPage.tsx",
      "utf8",
    );
    const routes = await readFile("src/app/routes.tsx", "utf8");
    const accountPage = await readFile("src/features/account/pages/AccountPage.tsx", "utf8");

    for (const rpc of [
      "get_my_invite_operator_context",
      "list_invite_operator_packages",
      "issue_operator_invite",
      "list_my_issued_invites",
      "revoke_my_issued_invite",
      "list_my_invite_operator_activity",
    ]) {
      expect(service).toContain(`\"${rpc}\"`);
    }
    expect(service).not.toContain("list_invite_operator_audit");
    expect(service).not.toMatch(/\.(?:from|rpc)\("(?:practice_sessions|learning_events|preparation_profiles|assessment_background_profiles|user_entitlements|export_my_learning_data)/u);
    expect(page).toContain("managedInviteDisplayStatus");
    expect(page).toContain("只显示这一次");
    expect(page).toContain("你只能查看和撤销自己创建的记录");
    expect(routes).toContain('path: "/operations/invites"');
    expect(accountPage).toContain("services.inviteOperations.getContext()");
    expect(accountPage).toContain('to="/operations/invites"');
  });

  it("requires verified email and a production-grade password baseline", async () => {
    const config = await readFile("supabase/config.toml", "utf8");
    expect(config).toContain("minimum_password_length = 10");
    expect(config).toContain('password_requirements = "lower_upper_letters_digits"');
    expect(config).toMatch(/\[auth\.email\][\s\S]*enable_confirmations = true/);
    expect(config).toContain("http://127.0.0.1:57145/auth/confirm");
    expect(config).toContain("http://127.0.0.1:57145/auth/reset");
  });

  it("keeps local seed codes explicitly scoped to local development", async () => {
    const seed = await readFile("supabase/seed.sql", "utf8");
    expect(seed).toContain("LOCAL-2026-ACCESS");
    expect(seed).toMatch(/local[- ]only/i);
  });

  it("keeps conversion evidence anonymous, constrained and aggregate-only", async () => {
    const migration = await readFile(productFunnelMigrationPath, "utf8");

    expect(migration).toContain("create table private.product_funnel_events");
    expect(migration).toContain("alter table private.product_funnel_events enable row level security;");
    expect(migration).toContain("create or replace function public.record_product_funnel_event");
    expect(migration).toContain("product_funnel_event_invalid");
    expect(migration).toContain("product_funnel_rate_limited");
    expect(migration).toContain("count(distinct event.journey_id)");
    expect(migration).toContain("to anon, authenticated;");
    expect(migration).toContain("to service_role;");
    expect(migration).not.toMatch(/\b(?:email|phone|answer|course_ids|user_id|ip_address|user_agent|payload)\b/iu);
  });

  it("gives approved Mantou viewers aggregate-only funnel access without raw events or learner data", async () => {
    const migration = await readFile(productFunnelViewerMigrationPath, "utf8");
    const service = await readFile(
      "src/features/product-funnel/supabase-analytics-service.ts",
      "utf8",
    );
    const page = await readFile(
      "src/features/product-funnel/pages/ProductFunnelAnalyticsPage.tsx",
      "utf8",
    );

    expect(migration).toContain("create table private.product_funnel_viewer_grants");
    expect(migration).toContain("create table private.product_funnel_viewer_events");
    expect(migration).toContain("create or replace function private.require_active_product_funnel_viewer");
    expect(migration).toContain("create or replace function public.configure_product_funnel_viewer");
    expect(migration).toContain("create or replace function public.list_product_funnel_stage_summary");
    expect(migration).toContain("count(distinct event.journey_id)");
    expect(migration).toContain("to service_role;");
    expect(migration).toContain("to authenticated;");
    expect(migration).not.toMatch(/grant\s+select\s+on\s+(?:table\s+)?private\.product_funnel_events/iu);
    expect(migration).not.toMatch(/grant\s+select\s+on\s+(?:table\s+)?public\.(?:practice_sessions|learning_events|preparation_profiles|assessment_background_profiles|user_entitlements)/iu);
    expect(service).toContain('"get_my_product_funnel_viewer_context"');
    expect(service).toContain('"list_product_funnel_stage_summary"');
    expect(service).not.toMatch(/\.from\("private\.product_funnel_events"/u);
    expect(page).toContain("不是学生人数，也不是严格同 cohort 转化率");
    expect(page).toContain("看不到邮箱、课程、答案、IP、设备或任何学生身份");
  });

  it("keeps teacher and parent collaboration student-issued, scope-separated, revocable and audited", async () => {
    const migration = await readFile(collaborationMigrationPath, "utf8");
    const dataExport = await readFile(collaborationExportMigrationPath, "utf8");
    const service = await readFile(
      "src/features/collaboration/supabase-collaboration-service.ts",
      "utf8",
    );

    for (const table of [
      "collaboration_invites",
      "learner_grants",
      "collaboration_artifacts",
      "collaboration_audit_events",
    ]) {
      expect(migration).toContain(`alter table private.${table} enable row level security;`);
      expect(migration).toContain(
        `revoke all on table private.${table} from public, anon, authenticated, service_role;`,
      );
    }
    for (const scope of [
      "progress:read",
      "responses:read",
      "annotations:write",
      "plans:write",
      "assignments:write",
    ]) {
      expect(migration).toContain(`'${scope}'`);
    }
    expect(migration).toContain("constraint learner_grants_no_self_grant");
    expect(migration).toContain("private.collaboration_code_digest(generated_code)");
    expect(migration).toContain("create or replace function public.revoke_my_collaboration_grant");
    expect(migration).toContain("create or replace function public.list_my_collaboration_audit");
    expect(migration).toContain("create or replace function public.get_shared_learning_progress");
    expect(migration).toContain("create or replace function public.list_shared_learning_responses");
    expect(migration).toContain("grant_redeemed");
    expect(migration).toContain("responses_viewed");
    expect(migration).toContain("revoked_at is null");
    expect(migration).toContain("expires_at > now()");
    expect(migration).toContain(
      "revoke all on function public.redeem_collaboration_invite(text) from public, anon;",
    );
    expect(dataExport).toContain("'schemaVersion', 4");
    expect(dataExport).toContain("'collaborationGrants'");
    expect(dataExport).toContain("'collaborationArtifacts'");
    expect(dataExport).toContain("'collaborationAudit'");
    expect(dataExport).not.toContain("code_digest");
    expect(service).toContain('"get_shared_learning_progress"');
    expect(service).toContain('"list_shared_learning_responses"');
    expect(service).not.toMatch(/\.from\("private\./u);
  });

  it("serves a source-bound content review queue without moving human approval into the browser", async () => {
    const migration = await readFile(contentReviewOperationsMigrationPath, "utf8");
    const service = await readFile(
      "src/features/content-review-operations/supabase-content-review-operations-service.ts",
      "utf8",
    );
    const page = await readFile(
      "src/features/content-review-operations/pages/ContentReviewOperationsPage.tsx",
      "utf8",
    );
    const syncScript = await readFile("scripts/sync-content-review-queue.ts", "utf8");

    for (const table of [
      "content_review_viewer_grants",
      "content_review_queue_items",
      "content_review_operations_events",
    ]) {
      expect(migration).toContain(`alter table private.${table} enable row level security;`);
      expect(migration).toContain(`revoke all on table private.${table}`);
    }
    expect(migration).toContain("create or replace function public.configure_content_review_viewer");
    expect(migration).toContain("create or replace function public.sync_content_review_queue");
    expect(migration).toContain("create or replace function public.list_content_review_queue");
    expect(migration).toContain("private.require_active_content_review_viewer()");
    expect(migration).toContain("to service_role;");
    expect(migration).toContain("to authenticated;");
    expect(migration).not.toMatch(/grant\s+select\s+on\s+(?:table\s+)?private\.content_review_/iu);
    expect(service).toContain('"get_my_content_review_viewer_context"');
    expect(service).toContain('"get_content_review_queue_summary"');
    expect(service).toContain('"list_content_review_queue"');
    expect(service).not.toMatch(/\.from\("private\./u);
    expect(page).toContain("本页只能准备审核材料，不能直接批准或发布产品");
    expect(page).toContain("下载模板不等于审核通过");
    expect(syncScript).toContain("SUPABASE_SERVICE_ROLE_KEY");
    expect(syncScript).toContain("CONTENT_REVIEW_SYNC_CONFIRM");
    expect(syncScript).not.toContain("VITE_SUPABASE_SERVICE_ROLE_KEY");
  });

  it("separates free practice evidence from server-authorised deep review", async () => {
    const migration = await readFile(
      "supabase/migrations/20260717170000_multi_exam_practice_access.sql",
      "utf8",
    );
    const seed = await readFile("supabase/seed.sql", "utf8");

    expect(migration).toContain("'answer_explanation'");
    expect(migration).toContain("'interpretation'");
    for (const examId of ["tmua", "esat", "tara", "lnat", "ucat"]) {
      expect(seed).toContain(`'${examId}-deep-review'`);
      expect(seed).toContain(`'${examId}-deep-review-v1'`);
    }
    expect(seed).toMatch(/deep-review-v1[^\n]+entitled[^\n]+draft/);
    expect(seed).toContain('"delivery":"server-only"');
  });

  it("writes profiles, sessions and events only through authenticated transactional RPCs", async () => {
    const migration = await readFile(learnerDataMigrationPath, "utf8");

    expect(migration).toContain("create table private.guest_space_claims");
    expect(migration).toContain("create or replace function public.save_preparation_profile");
    expect(migration).toContain("create or replace function public.save_practice_session");
    expect(migration).toContain("guest_space_already_claimed");
    expect(migration).toContain("learning_event_idempotency_conflict");
    expect(migration).toContain(
      "revoke insert, update on public.practice_sessions from authenticated;",
    );
    expect(migration).toContain(
      "revoke insert on public.learning_events from authenticated;",
    );
    expect(migration).toContain(
      "grant execute on function public.save_practice_session(jsonb) to authenticated;",
    );
  });

  it("keeps IB and AP TMUA profiles inside the authenticated Learner Space RPC", async () => {
    const migration = await readFile(tmuaIbApProfileMigrationPath, "utf8");

    expect(migration).toContain("create or replace function public.save_preparation_profile");
    expect(migration).toContain("('caie', 'pearson-ial', 'ib', 'ap')");
    expect(migration).toContain("perform private.register_guest_space_claim");
    expect(migration).not.toMatch(/grant execute[\s\S]*\b(?:anon|public)\b/iu);
  });

  it("proves idempotent replay and prevents a second account claiming one Guest Space", async () => {
    const databaseTest = await readFile(
      "supabase/tests/database/private_account_rls.test.sql",
      "utf8",
    );
    const httpVerification = await readFile("scripts/verify-supabase-local.ts", "utf8");

    expect(databaseTest).toContain("replaying the same session and events is idempotent");
    expect(databaseTest).toContain("Bob cannot claim the Guest Space already bound to Alice");
    expect(httpVerification).toContain("guest_space_already_claimed");
    expect(httpVerification).toContain("Idempotent session replay");
  });

  it("keeps self-service export and account deletion authenticated and tenant-scoped", async () => {
    const migration = await readFile(dataRightsMigrationPath, "utf8");

    expect(migration).toContain("create or replace function public.export_my_learning_data()");
    expect(migration).toContain("create or replace function public.delete_my_account()");
    expect(migration).toContain("where session.learner_space_id = current_learner_space_id");
    expect(migration).toContain("where auth_user.id = current_user_id");
    expect(migration).toContain(
      "revoke all on function public.export_my_learning_data() from public, anon;",
    );
    expect(migration).toContain(
      "grant execute on function public.delete_my_account() to authenticated;",
    );
  });

  it("delivers private learning products only through an entitlement-checked server function", async () => {
    const migration = await readFile(entitledContentMigrationPath, "utf8");

    expect(migration).toContain("alter table public.content_resource_payloads enable row level security;");
    expect(migration).toContain(
      "revoke all on public.content_resource_payloads from public, anon, authenticated;",
    );
    expect(migration).toContain("create or replace function public.get_entitled_content_resource");
    expect(migration).toContain("if not private.can_access_content(p_resource_id) then");
    expect(migration).toContain(
      "grant execute on function public.get_entitled_content_resource(text) to authenticated;",
    );
    expect(migration).toContain(
      "grant update (revoked_at) on public.user_entitlements to service_role;",
    );
    expect(migration).not.toContain(
      "grant update (revoked_at) on public.user_entitlements to authenticated;",
    );
    expect(migration).toContain("'tmua-six-week-review-plan-v1'");
    expect(migration).toContain("'tmua-full-access', 'tmua-six-week-review-plan-v1'");

    const workedReviewMigration = await readFile(tmuaDeepReviewMigrationPath, "utf8");
    expect(workedReviewMigration).toContain("'tmua-specimen-p1-worked-explanations-v1'");
    expect(workedReviewMigration).toContain("'tmua-deep-review', 'tmua-specimen-p1-worked-explanations-v1'");
    expect(workedReviewMigration).toContain("'tmua-full-access', 'tmua-specimen-p1-worked-explanations-v1'");
    expect(workedReviewMigration).toContain("'published'");
    expect(workedReviewMigration).toContain('"questionCount":20');
  });

  it("routes student feedback through a validated, tenant-isolated and audited workflow", async () => {
    const migration = await readFile(feedbackMigrationPath, "utf8");
    const databaseTest = await readFile(
      "supabase/tests/database/student_feedback_rls.test.sql",
      "utf8",
    );
    const httpVerification = await readFile("scripts/verify-supabase-local.ts", "utf8");

    expect(migration).toContain("alter table public.student_feedback enable row level security;");
    expect(migration).toContain("using (reporter_user_id = (select auth.uid()))");
    expect(migration).toContain("revoke all on table public.student_feedback from public, anon, authenticated;");
    expect(migration).toContain("create or replace function public.submit_student_feedback");
    expect(migration).toContain("feedback_message_contains_contact_details");
    expect(migration).toContain("create table private.student_feedback_events");
    expect(migration).toContain("grant select on table public.student_feedback to service_role;");
    expect(migration).toContain("grant select on table private.student_feedback_events to service_role;");
    expect(migration).not.toContain("grant select, update, delete on table public.student_feedback to service_role;");
    expect(migration).toContain("create or replace function public.triage_student_feedback");
    expect(migration).toContain("'feedback', coalesce((");
    expect(databaseTest).toContain("Bob cannot read Alice feedback");
    expect(databaseTest).toContain("duplicate submission does not create another ticket");
    expect(httpVerification).toContain("Second learner crossed the feedback tenant boundary");
    expect(httpVerification).toContain("Audited feedback triage");
  });

  it("stores non-TMUA background profiles per exam behind tenant RLS and validated RPCs", async () => {
    const migration = await readFile(assessmentProfileMigrationPath, "utf8");
    const databaseTest = await readFile(
      "supabase/tests/database/assessment_background_profiles_rls.test.sql",
      "utf8",
    );

    expect(migration).toContain("alter table public.assessment_background_profiles enable row level security;");
    expect(migration).toContain("alter table public.assessment_background_profiles force row level security;");
    expect(migration).toContain("learner_space.owner_user_id = (select auth.uid())");
    expect(migration).toContain("create or replace function public.save_assessment_background_profile");
    expect(migration).toContain("perform private.register_guest_space_claim");
    expect(migration).toContain("revoke all on table public.assessment_background_profiles from public, anon, authenticated;");
    expect(migration).toContain("'assessmentBackgroundProfiles', coalesce((");
    expect(databaseTest).toContain("Bob cannot read Alice profiles");
    expect(databaseTest).toContain("deleting TARA leaves Alice UCAT profile intact");
    const httpVerification = await readFile("scripts/verify-supabase-local.ts", "utf8");
    expect(httpVerification).toContain("Second learner crossed the assessment-profile tenant boundary");
    expect(httpVerification).toContain("Authenticated UCAT background profile save");
  });
});
