import { readFile } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";
import type { ManualReviewWorklist } from "../src/features/library/manual-review-worklist.js";
import { requireAuditableReviewItem } from "../src/features/library/manual-review-decisions.js";

const worklist = JSON.parse(
  await readFile("content/products/manual-review-worklist.json", "utf8"),
) as ManualReviewWorklist;
const items = worklist.campaigns.flatMap((campaign) => campaign.items);
for (const item of items) requireAuditableReviewItem(item);

const payload = items.map((item) => ({
  reviewKey: item.reviewKey,
  campaignId: item.campaignId,
  ownerRole: item.ownerRole,
  independenceRequired: item.independenceRequired,
  evidenceRequirement: item.evidenceRequirement,
  viewports: item.viewports,
  products: item.products,
  sourceFingerprint: item.sourceFingerprint,
  sourceArtifactCount: item.sourceArtifactCount,
}));

console.log(
  `Content review queue: ${payload.length} current review groups across ${worklist.summary.affectedPublicProducts} public products.`,
);

if (!process.argv.includes("--apply")) {
  console.log("Dry run only. Use --apply with server-only credentials and the exact confirmation value.");
  process.exit(0);
}

if (process.env.CONTENT_REVIEW_SYNC_CONFIRM !== "sync-current-content-review-queue") {
  throw new Error(
    "Set CONTENT_REVIEW_SYNC_CONFIRM=sync-current-content-review-queue before applying the queue.",
  );
}
const url = process.env.SUPABASE_URL?.trim();
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
if (url === undefined || serviceRoleKey === undefined || url === "" || serviceRoleKey === "") {
  throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required for --apply.");
}

const client = createClient(url, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const { data, error } = await client.rpc("sync_content_review_queue", {
  p_catalog_revision: worklist.catalogRevision,
  p_items: payload,
});
if (error !== null) {
  throw new Error(`Content review queue sync failed: ${error.message}`);
}
const result = Array.isArray(data) ? data[0] : data;
if (
  result === null
  || typeof result !== "object"
  || Number((result as Record<string, unknown>).synced_items) !== payload.length
) {
  throw new Error("Content review queue sync returned an unexpected item count.");
}
console.log(`Synced ${payload.length} content review groups for ${worklist.catalogRevision}.`);
