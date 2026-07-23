import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { ContentReleaseReadinessReport } from "../src/features/library/content-release-readiness.js";
import { buildManualReviewWorklist } from "../src/features/library/manual-review-worklist.js";
import { loadContentReleaseInputs } from "./lib/content-release-inputs.js";
import { enrichManualReviewWorklist } from "./lib/manual-review-ledger.js";

const reportPath = path.resolve("content/products/release-readiness.json");
const worklistPath = path.resolve("content/products/manual-review-worklist.json");

const inputs = await loadContentReleaseInputs();
const report = JSON.parse(await readFile(reportPath, "utf8")) as ContentReleaseReadinessReport;
if (inputs.catalog.revision !== report.catalogRevision) {
  throw new Error("Release readiness must be rebuilt before the manual review worklist");
}

const worklist = await enrichManualReviewWorklist(
  buildManualReviewWorklist({
    report,
    catalogProducts: inputs.catalog.products,
  }),
  inputs.catalog,
  inputs.claimArtifactsByManifest,
);
const serialized = `${JSON.stringify(worklist, null, 2)}\n`;

if (process.argv.includes("--write")) {
  await writeFile(worklistPath, serialized, "utf8");
  console.log(`Wrote ${path.relative(process.cwd(), worklistPath)}`);
} else if (process.argv.includes("--verify")) {
  const current = await readFile(worklistPath, "utf8");
  if (current !== serialized) throw new Error("Manual review worklist is stale");
  console.log(
    `Manual review worklist: PASS (${worklist.summary.pendingReviewItems} review groups across ${worklist.summary.affectedPublicProducts} public products)`,
  );
} else {
  console.log(JSON.stringify(worklist.summary, null, 2));
}
