import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { buildContentReleaseReadinessReport } from "../src/features/library/content-release-readiness.js";
import { buildManualReviewWorklist } from "../src/features/library/manual-review-worklist.js";
import { loadContentReleaseInputs } from "./lib/content-release-inputs.js";
import {
  enrichManualReviewWorklist,
  loadManualReviewLedger,
} from "./lib/manual-review-ledger.js";

const reportPath = path.resolve("content/products/release-readiness.json");

async function buildReport() {
  const inputs = await loadContentReleaseInputs();
  const baseReport = buildContentReleaseReadinessReport({
    catalogRevision: inputs.catalog.revision,
    assessedAt: inputs.assessedAt,
    products: inputs.catalog.products,
    manifests: inputs.manifests,
  });
  const baseWorklist = await enrichManualReviewWorklist(
    buildManualReviewWorklist({
      report: baseReport,
      catalogProducts: inputs.catalog.products,
    }),
    inputs.catalog,
    inputs.claimArtifactsByManifest,
  );
  const ledger = await loadManualReviewLedger(baseWorklist);
  const report = buildContentReleaseReadinessReport({
    catalogRevision: inputs.catalog.revision,
    assessedAt: inputs.assessedAt,
    products: inputs.catalog.products,
    manifests: inputs.manifests,
    decisionApprovals: ledger.approvals,
  });
  return { report, ledger };
}

const { report, ledger } = await buildReport();
const serialized = `${JSON.stringify(report, null, 2)}\n`;

if (process.argv.includes("--write")) {
  await writeFile(reportPath, serialized, "utf8");
  console.log(`Wrote ${path.relative(process.cwd(), reportPath)}`);
} else if (process.argv.includes("--verify")) {
  const current = await readFile(reportPath, "utf8");
  if (current !== serialized) throw new Error("Content release readiness report is stale");
  console.log(
    `Content release readiness: PASS (${report.summary.closedBetaReadyProducts}/${report.summary.publicProducts} public products closed-Beta ready; ${ledger.summary.approvedCurrentReviews} current review approvals)`,
  );
} else {
  console.log(`Content release readiness: ${report.summary.closedBetaReadyProducts}/${report.summary.publicProducts} public products closed-Beta ready`);
  console.log(`Review ledger: ${ledger.summary.approvedCurrentReviews} approved, ${ledger.summary.changesRequestedReviews} changes requested, ${ledger.summary.staleReviews} stale`);
  for (const product of report.products.filter((item) => item.visibility === "public" && !item.closedBetaReady)) {
    console.log(`- ${product.productId}: ${product.closedBetaBlockers.join(", ")}`);
  }
}
