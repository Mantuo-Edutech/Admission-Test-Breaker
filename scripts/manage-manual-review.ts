import { createHash } from "node:crypto";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { buildContentReleaseReadinessReport } from "../src/features/library/content-release-readiness.js";
import {
  parseManualReviewDecision,
  requireAuditableReviewItem,
} from "../src/features/library/manual-review-decisions.js";
import { buildManualReviewWorklist } from "../src/features/library/manual-review-worklist.js";
import { loadContentReleaseInputs } from "./lib/content-release-inputs.js";
import {
  enrichManualReviewWorklist,
  loadManualReviewLedger,
} from "./lib/manual-review-ledger.js";

const args = process.argv.slice(2);

function argument(name: string): string | undefined {
  const index = args.indexOf(name);
  return index === -1 ? undefined : args[index + 1];
}

function slug(reviewKey: string): string {
  return reviewKey.replaceAll("/", "--").replace(/[^a-z0-9._-]+/gu, "-");
}

function decisionPrefix(reviewKey: string): string {
  const value = slug(reviewKey);
  if (value.length <= 60) return value;
  const suffix = createHash("sha256").update(reviewKey).digest("hex").slice(0, 10);
  return `${value.slice(0, 49)}-${suffix}`;
}

async function sha256(filePath: string): Promise<string> {
  return `sha256:${createHash("sha256").update(await readFile(filePath)).digest("hex")}`;
}

function localDate(value: Date): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

async function currentWorklist() {
  const inputs = await loadContentReleaseInputs();
  const report = buildContentReleaseReadinessReport({
    catalogRevision: inputs.catalog.revision,
    assessedAt: inputs.assessedAt,
    products: inputs.catalog.products,
    manifests: inputs.manifests,
  });
  const worklist = await enrichManualReviewWorklist(
    buildManualReviewWorklist({ report, catalogProducts: inputs.catalog.products }),
    inputs.catalog,
    inputs.claimArtifactsByManifest,
  );
  return worklist;
}

function markdownPacket(item: ReturnType<typeof allItems>[number], evidencePath: string): string {
  return `# Manual review evidence\n\n` +
    `- Review key: \`${item.reviewKey}\`\n` +
    `- Campaign: \`${item.campaignId}\`\n` +
    `- Required owner role: \`${item.ownerRole}\`\n` +
    `- Source fingerprint: \`${item.sourceFingerprint}\`\n` +
    `- Source artifacts: ${item.sourceArtifactCount}\n` +
    `- Evidence file: \`${evidencePath}\`\n\n` +
    `## Requirement\n\n${item.evidenceRequirement}\n\n` +
    `## Product and route scope\n\n${item.products.map((product) =>
      `- ${product.productId} · ${product.version} · \`${product.route}\``).join("\n")}\n\n` +
    `## Viewports or review modes\n\n${item.viewports.map((viewport) => `- ${viewport}`).join("\n")}\n\n` +
    `## Reviewers\n\nRecord privacy-safe reviewer references, roles and independence from the original author.\n\n` +
    `## Checks performed\n\n- [ ] Complete the stated scope.\n- [ ] Record defects and resolutions.\n- [ ] Confirm remaining limitations.\n- [ ] Confirm no personal student data is included.\n\n` +
    `## Findings and resolved issues\n\nReplace this text with concrete findings.\n\n` +
    `## Limitations\n\nReplace this text with remaining limitations, or state that none were found within scope.\n\n` +
    `## Recommendation\n\nChoose **approve** or **request changes**, with reasons.\n`;
}

function allItems(worklist: Awaited<ReturnType<typeof currentWorklist>>) {
  return worklist.campaigns.flatMap((campaign) => campaign.items);
}

async function prepare(reviewKey: string, outputDirectory: string) {
  const worklist = await currentWorklist();
  const item = allItems(worklist).find((candidate) => candidate.reviewKey === reviewKey);
  if (item === undefined) throw new Error(`Unknown or already completed review item: ${reviewKey}`);
  requireAuditableReviewItem(item);
  const date = localDate(new Date());
  const name = slug(reviewKey);
  const evidencePath = `verification/reviews/evidence/${name}--${date}.md`;
  const decisionId = `${decisionPrefix(reviewKey)}-${date}-01`;
  const decision = {
    schemaVersion: 1,
    decisionId,
    reviewKey,
    sourceFingerprint: item.sourceFingerprint,
    outcome: "changes-requested",
    reviewedAt: date,
    recordedAt: new Date().toISOString(),
    reviewLead: { reference: "replace-with-role-reference", role: item.ownerRole },
    reviewers: [{
      reference: "replace-with-reviewer-reference",
      role: "replace-with-qualified-role",
      independent: item.independenceRequired,
    }],
    evidence: {
      summary: "Replace with a concrete summary of checks, findings and the final decision.",
      artifacts: [{ path: evidencePath, sha256: "replace-after-the-report-is-final" }],
    },
    attested: false,
  };
  await mkdir(path.resolve(outputDirectory), { recursive: true });
  const decisionDraft = path.resolve(outputDirectory, `${name}--decision-draft.json`);
  const evidenceDraft = path.resolve(outputDirectory, `${name}--evidence-draft.md`);
  await writeFile(decisionDraft, `${JSON.stringify(decision, null, 2)}\n`, "utf8");
  await writeFile(evidenceDraft, markdownPacket(item, evidencePath), "utf8");
  console.log(`Prepared ${path.relative(process.cwd(), decisionDraft)}`);
  console.log(`Prepared ${path.relative(process.cwd(), evidenceDraft)}`);
  console.log(`Finalize the report at ${evidencePath}, then attest and record the decision.`);
}

async function record(inputFile: string) {
  const worklist = await currentWorklist();
  const raw = JSON.parse(await readFile(path.resolve(inputFile), "utf8")) as Record<string, unknown>;
  const reviewKey = typeof raw.reviewKey === "string" ? raw.reviewKey : "";
  const item = allItems(worklist).find((candidate) => candidate.reviewKey === reviewKey);
  if (item === undefined) throw new Error(`Unknown or retired review item: ${reviewKey}`);
  const evidence = raw.evidence;
  if (evidence === null || typeof evidence !== "object" || Array.isArray(evidence)) {
    throw new Error("Decision draft has no evidence object");
  }
  const artifactValues = (evidence as Record<string, unknown>).artifacts;
  if (!Array.isArray(artifactValues)) throw new Error("Decision draft has no evidence artifacts");
  const artifacts = await Promise.all(artifactValues.map(async (artifact) => {
    if (artifact === null || typeof artifact !== "object" || Array.isArray(artifact)) {
      throw new Error("Decision draft has an invalid evidence artifact");
    }
    const artifactPath = (artifact as Record<string, unknown>).path;
    if (typeof artifactPath !== "string") throw new Error("Evidence artifact path is missing");
    await access(path.resolve(artifactPath));
    return { path: artifactPath, sha256: await sha256(path.resolve(artifactPath)) };
  }));
  const normalized = {
    ...raw,
    recordedAt: new Date().toISOString(),
    evidence: { ...(evidence as Record<string, unknown>), artifacts },
  };
  const today = localDate(new Date());
  const decision = parseManualReviewDecision(normalized, item, inputFile, today);
  const decisionDirectory = path.resolve("verification/reviews/decisions");
  const destination = path.join(decisionDirectory, `${decision.decisionId}.json`);
  try {
    await access(destination);
    throw new Error(`Decision ${decision.decisionId} already exists; use a new decisionId`);
  } catch (error) {
    if (error instanceof Error && error.message.includes("already exists")) throw error;
  }
  await writeFile(destination, `${JSON.stringify(normalized, null, 2)}\n`, "utf8");
  await loadManualReviewLedger(worklist, decisionDirectory, today);
  console.log(`Recorded ${path.relative(process.cwd(), destination)}`);
  console.log("Rebuild release readiness and the remaining worklist before publication.");
}

const reviewKey = argument("--review-key");
const output = argument("--output");
const input = argument("--input");
if (args.includes("--prepare")) {
  if (reviewKey === undefined || output === undefined) {
    throw new Error("--prepare requires --review-key and --output");
  }
  await prepare(reviewKey, output);
} else if (args.includes("--record")) {
  if (input === undefined) throw new Error("--record requires --input");
  await record(input);
} else {
  const worklist = await currentWorklist();
  for (const campaign of worklist.campaigns) {
    console.log(`${campaign.label} (${campaign.items.length})`);
    for (const item of campaign.items) console.log(`- ${item.reviewKey}`);
  }
}
