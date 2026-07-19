import { access, readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { parse } from "yaml";
import { describe, expect, it } from "vitest";

interface FeatureClaim {
  id: string;
  status: "verified" | "partial" | "planned";
  statement: string;
  artifacts: string[];
  automatedChecks: string[];
}

interface ManualCheck {
  id: string;
  status: "passed" | "pending";
  reviewer?: string;
  reviewerRole?: string;
  checkedAt?: string;
  evidence?: string;
  viewports?: string[];
}

interface FeatureManifest {
  schemaVersion: number;
  feature: {
    id: string;
    title: string;
    status: "verified" | "partial" | "planned";
    verifiedAt?: string;
    userOutcome: string;
  };
  run: { packageScript: string };
  claims: FeatureClaim[];
  boundaries: string[];
  manualChecks: ManualCheck[];
}

const manifestDirectory = path.resolve("verification/features");

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requireString(value: unknown, field: string): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${field} must be a non-empty string`);
  }
  return value;
}

function requireStringArray(value: unknown, field: string): string[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error(`${field} must be a non-empty array`);
  }
  return value.map((item, index) => requireString(item, `${field}[${index}]`));
}

function parseManifest(raw: string, file: string): FeatureManifest {
  const value: unknown = parse(raw);
  if (!isRecord(value) || !isRecord(value.feature) || !isRecord(value.run)) {
    throw new Error(`${file} is missing manifest objects`);
  }
  if (!Array.isArray(value.claims) || !Array.isArray(value.manualChecks)) {
    throw new Error(`${file} is missing claim or manual check arrays`);
  }

  const allowedStatuses = new Set(["verified", "partial", "planned"]);
  const featureStatus = requireString(value.feature.status, "feature.status");
  if (!allowedStatuses.has(featureStatus)) {
    throw new Error(`${file} has unsupported feature status ${featureStatus}`);
  }

  const claims = value.claims.map((claim, index) => {
    if (!isRecord(claim)) throw new Error(`${file} claim ${index} must be an object`);
    const status = requireString(claim.status, `claims[${index}].status`);
    if (!allowedStatuses.has(status)) {
      throw new Error(`${file} claim ${index} has unsupported status ${status}`);
    }
    return {
      id: requireString(claim.id, `claims[${index}].id`),
      status: status as FeatureClaim["status"],
      statement: requireString(claim.statement, `claims[${index}].statement`),
      artifacts: requireStringArray(claim.artifacts, `claims[${index}].artifacts`),
      automatedChecks: requireStringArray(
        claim.automatedChecks,
        `claims[${index}].automatedChecks`,
      ),
    };
  });

  const manualChecks = value.manualChecks.map((check, index) => {
    if (!isRecord(check)) {
      throw new Error(`${file} manual check ${index} must be an object`);
    }
    const status = requireString(check.status, `manualChecks[${index}].status`);
    if (status !== "passed" && status !== "pending") {
      throw new Error(`${file} manual check ${index} has unsupported status ${status}`);
    }
    return {
      id: requireString(check.id, `manualChecks[${index}].id`),
      status,
      reviewer: typeof check.reviewer === "string" ? check.reviewer : undefined,
      reviewerRole:
        typeof check.reviewerRole === "string" ? check.reviewerRole : undefined,
      checkedAt: typeof check.checkedAt === "string" ? check.checkedAt : undefined,
      evidence: typeof check.evidence === "string" ? check.evidence : undefined,
      viewports: Array.isArray(check.viewports)
        ? check.viewports.map((viewport, viewportIndex) =>
            requireString(viewport, `manualChecks[${index}].viewports[${viewportIndex}]`),
          )
        : undefined,
    } satisfies ManualCheck;
  });

  return {
    schemaVersion: value.schemaVersion as number,
    feature: {
      id: requireString(value.feature.id, "feature.id"),
      title: requireString(value.feature.title, "feature.title"),
      status: featureStatus as FeatureManifest["feature"]["status"],
      verifiedAt:
        typeof value.feature.verifiedAt === "string" ? value.feature.verifiedAt : undefined,
      userOutcome: requireString(value.feature.userOutcome, "feature.userOutcome"),
    },
    run: { packageScript: requireString(value.run.packageScript, "run.packageScript") },
    claims,
    boundaries: requireStringArray(value.boundaries, "boundaries"),
    manualChecks,
  };
}

function isSafeRelativePath(filePath: string): boolean {
  return !path.isAbsolute(filePath) && !filePath.split(/[\\/]/u).includes("..");
}

describe("machine-readable feature verification manifests", () => {
  it("keeps verified claims traceable to files and runnable package gates", async () => {
    const packageJson = JSON.parse(await readFile("package.json", "utf8")) as {
      scripts?: Record<string, string>;
    };
    const scripts = packageJson.scripts ?? {};
    const files = (await readdir(manifestDirectory))
      .filter((file) => file.endsWith(".yaml"))
      .sort();

    expect(files.length).toBeGreaterThan(0);

    for (const file of files) {
      const manifest = parseManifest(
        await readFile(path.join(manifestDirectory, file), "utf8"),
        file,
      );

      expect(manifest.schemaVersion).toBe(1);
      expect(scripts[manifest.run.packageScript]).toBeDefined();
      expect(new Set(manifest.claims.map((claim) => claim.id)).size).toBe(
        manifest.claims.length,
      );

      if (manifest.feature.status === "verified") {
        expect(manifest.feature.verifiedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/u);
        expect(manifest.claims.every((claim) => claim.status === "verified")).toBe(true);
        expect(manifest.manualChecks.every((check) => check.status === "passed")).toBe(true);
      }

      for (const claim of manifest.claims) {
        for (const artifact of claim.artifacts) {
          expect(isSafeRelativePath(artifact), `${file}: unsafe artifact ${artifact}`).toBe(true);
          await expect(access(path.resolve(artifact))).resolves.toBeUndefined();
        }
        for (const check of claim.automatedChecks) {
          expect(scripts[check], `${file}: missing package script ${check}`).toBeDefined();
        }
      }

      for (const check of manifest.manualChecks.filter((item) => item.status === "passed")) {
        expect(check.reviewer?.trim().length).toBeGreaterThan(0);
        expect(check.reviewerRole?.trim().length).toBeGreaterThan(0);
        expect(check.checkedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/u);
        expect(check.evidence?.trim().length).toBeGreaterThan(0);
      }
    }
  });
});
