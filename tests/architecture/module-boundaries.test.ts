import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

interface ImportReference {
  file: string;
  specifier: string;
  resolvedTarget?: string;
}

interface ArchitectureViolation extends ImportReference {
  rule: string;
}

const sourceRoot = path.resolve("src");
const fixturePath = path.join(sourceRoot, "platform", "__architecture-fixture__.ts");
const profileFixturePath = path.join(
  sourceRoot,
  "features",
  "preparation-profile",
  "__domain-architecture-fixture__.ts",
);

async function sourceFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const fullPath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        return sourceFiles(fullPath);
      }
      return /\.tsx?$/.test(entry.name) ? [fullPath] : [];
    }),
  );
  return nested.flat();
}

function normalize(filePath: string): string {
  return filePath.split(path.sep).join("/");
}

function extractSpecifiers(source: string): string[] {
  const specifiers: string[] = [];
  const staticPattern =
    /\b(?:import|export)\s+(?:type\s+)?(?:[^;'"\n]*?\s+from\s+)?["']([^"']+)["']/g;
  const dynamicPattern = /\bimport\s*\(\s*["']([^"']+)["']\s*\)/g;

  for (const pattern of [staticPattern, dynamicPattern]) {
    for (const match of source.matchAll(pattern)) {
      const specifier = match[1];
      if (specifier !== undefined) {
        specifiers.push(specifier);
      }
    }
  }

  return [...new Set(specifiers)];
}

function resolveTarget(file: string, specifier: string): string | undefined {
  if (!specifier.startsWith(".")) {
    return undefined;
  }

  return normalize(
    path.resolve(path.dirname(file), specifier.replace(/\.js$/, ".ts")),
  );
}

async function collectImports(): Promise<ImportReference[]> {
  const files = await sourceFiles(sourceRoot);
  const imports = await Promise.all(
    files.map(async (file) => {
      const source = await readFile(file, "utf8");
      return extractSpecifiers(source).map((specifier) => ({
        file: normalize(file),
        specifier,
        resolvedTarget: resolveTarget(file, specifier),
      }));
    }),
  );
  return imports.flat();
}

function packageIs(specifier: string, packageName: string): boolean {
  return specifier === packageName || specifier.startsWith(`${packageName}/`);
}

function evaluate(reference: ImportReference): ArchitectureViolation[] {
  const violations: ArchitectureViolation[] = [];
  const relativeFile = normalize(path.relative(process.cwd(), reference.file));
  const target = reference.resolvedTarget ?? "";

  if (relativeFile.startsWith("src/platform/")) {
    const forbiddenPackages = [
      "react",
      "react-dom",
      "react-router",
      "react-router-dom",
      "pg",
      "postgres",
      "@prisma/client",
      "drizzle-orm",
      "@supabase/supabase-js",
      "openai",
      "@anthropic-ai/sdk",
      "@google/generative-ai",
    ];
    const importsForbiddenPackage = forbiddenPackages.some((packageName) =>
      packageIs(reference.specifier, packageName),
    );
    const importsFeature = target.includes("/src/features/");
    const importsAdapter = target.includes("/storage/");

    if (importsForbiddenPackage || importsFeature || importsAdapter) {
      violations.push({
        ...reference,
        rule: "platform domain must remain framework and adapter independent",
      });
    }
  }

  const isPublicContent =
    relativeFile.startsWith("src/content/") ||
    relativeFile.startsWith("src/features/practice/content/");
  if (
    isPublicContent &&
    /\/src\/platform\/(learner-space|consent|learning-events|ai-gateway)\//.test(
      target,
    )
  ) {
    violations.push({
      ...reference,
      rule: "public content must not import private learner modules",
    });
  }

  if (relativeFile.startsWith("src/features/practice/domain/")) {
    const importsReact =
      packageIs(reference.specifier, "react") ||
      packageIs(reference.specifier, "react-router") ||
      packageIs(reference.specifier, "react-router-dom");
    const importsOuterFeatureLayer =
      /\/src\/features\/practice\/(pages|components|storage)\//.test(target);

    if (importsReact || importsOuterFeatureLayer) {
      violations.push({
        ...reference,
        rule: "practice domain must not depend on UI or storage adapters",
      });
    }
  }

  const isPreparationProfileDomain =
    relativeFile === "src/features/preparation-profile/domain.ts" ||
    relativeFile === "src/features/preparation-profile/catalog.ts" ||
    relativeFile.endsWith(
      "src/features/preparation-profile/__domain-architecture-fixture__.ts",
    );
  if (isPreparationProfileDomain) {
    const importsFrameworkOrAdapter =
      packageIs(reference.specifier, "react") ||
      packageIs(reference.specifier, "react-dom") ||
      packageIs(reference.specifier, "react-router") ||
      packageIs(reference.specifier, "react-router-dom") ||
      /\/src\/features\/preparation-profile\/(components|storage)\//.test(target);

    if (importsFrameworkOrAdapter) {
      violations.push({
        ...reference,
        rule: "preparation profile domain must not depend on UI or storage adapters",
      });
    }
  }

  if (relativeFile === "src/features/account/domain.ts") {
    const importsFrameworkOrAdapter =
      packageIs(reference.specifier, "react") ||
      packageIs(reference.specifier, "react-router") ||
      packageIs(reference.specifier, "react-router-dom") ||
      packageIs(reference.specifier, "@supabase/supabase-js") ||
      /\/src\/features\/account\/(components|pages|storage)\//.test(target);

    if (importsFrameworkOrAdapter) {
      violations.push({
        ...reference,
        rule: "account access domain must remain UI and provider independent",
      });
    }
  }

  return violations;
}

async function architectureViolations(): Promise<ArchitectureViolation[]> {
  return (await collectImports()).flatMap(evaluate);
}

afterEach(async () => {
  await rm(fixturePath, { force: true });
  await rm(profileFixturePath, { force: true });
});

describe("module architecture boundaries", () => {
  it("reports a deliberately forbidden platform import", async () => {
    await mkdir(path.dirname(fixturePath), { recursive: true });
    await writeFile(fixturePath, 'import React from "react";\nexport { React };\n');

    expect(await architectureViolations()).toContainEqual(
      expect.objectContaining({
        specifier: "react",
        rule: "platform domain must remain framework and adapter independent",
      }),
    );
  });

  it("keeps the real source tree inside its declared module boundaries", async () => {
    expect(await architectureViolations()).toEqual([]);
  });

  it("reports a preparation-profile domain dependency on React", async () => {
    await writeFile(
      profileFixturePath,
      'import React from "react";\nexport { React };\n',
    );

    expect(await architectureViolations()).toContainEqual(
      expect.objectContaining({
        specifier: "react",
        rule: "preparation profile domain must not depend on UI or storage adapters",
      }),
    );
  });

  it("keeps authored Review Notes out of the shared schema chunk", async () => {
    const sharedSchema = await readFile(
      "src/features/notes/content/review-notes.ts",
      "utf8",
    );
    expect(sharedSchema).not.toContain("content/notes/");

    const examModules = [
      "esat-review-notes.ts",
      "tara-review-notes.ts",
      "lnat-review-notes.ts",
      "ucat-review-notes.ts",
    ];
    for (const file of examModules) {
      const source = await readFile(`src/features/notes/content/${file}`, "utf8");
      expect(source).toContain("content/notes/");
      expect(source).toContain("validateReviewNotesDocument");
    }
  });

  it("exposes standalone architecture and complete verification commands", async () => {
    const packageJson = JSON.parse(await readFile("package.json", "utf8")) as {
      scripts?: Record<string, string>;
    };

    expect(packageJson.scripts?.["verify:architecture"]).toBe(
      "vitest run tests/architecture/module-boundaries.test.ts",
    );
    expect(packageJson.scripts?.["verify:features"]).toBe(
      "vitest run tests/architecture/feature-manifests.test.ts",
    );
    expect(packageJson.scripts?.["verify:entitled-content"]).toBe(
      "vitest run tests/features/entitled-content tests/app/tmua-entitled-review-plan.test.tsx tests/app/results-page.test.tsx",
    );
    expect(packageJson.scripts?.["verify:private-content-bundle"]).toBe(
      "tsx scripts/check-private-content-bundle.ts",
    );
    expect(packageJson.scripts?.["verify:content-products"]).toBe(
      "vitest run tests/features/library tests/app/learning-library-page.test.tsx tests/app/content-product-route-audit.test.tsx",
    );
    expect(packageJson.scripts?.["verify:content-release-readiness"]).toBe(
      "tsx scripts/check-content-release-readiness.ts --verify && vitest run tests/features/library/content-release-readiness.test.ts",
    );
    expect(packageJson.scripts?.["verify:manual-review-worklist"]).toBe(
      "tsx scripts/check-manual-review-worklist.ts --verify && vitest run tests/features/library/manual-review-worklist.test.ts",
    );
    expect(packageJson.scripts?.["verify:production-platform"]).toBe(
      "vitest run tests/architecture/production-platform-contracts.test.ts tests/platform/runtime-config.test.ts tests/platform/supabase-auth-protection-config.test.ts tests/platform/deployment-runtime-validation.test.ts",
    );
    expect(packageJson.scripts?.["verify:web-performance"]).toBe(
      "tsx scripts/check-web-performance-budget.ts",
    );
    expect(packageJson.scripts?.["verify:feedback"]).toBe(
      "vitest run tests/features/feedback tests/app/student-feedback.test.tsx",
    );
    expect(packageJson.scripts?.["verify:product-funnel"]).toBe(
      "vitest run tests/features/product-funnel tests/app/landing-page.test.tsx tests/app/account-access-flow.test.tsx tests/app/practice-page.test.tsx",
    );
    expect(packageJson.scripts?.["verify:learning-record"]).toBe(
      "vitest run tests/features/practice/content/knowledge-tag-taxonomy.test.ts tests/features/practice/history tests/features/learner-data/auth-aware-practice-history.test.ts tests/features/learner-data/supabase-repository.test.ts tests/app/learning-record-page.test.tsx tests/app/site-navigation.test.tsx",
    );
    expect(packageJson.scripts?.["verify:invite-operations"]).toBe(
      "vitest run tests/features/invite-operations tests/app/invite-operations-page.test.tsx tests/app/account-lifecycle.test.tsx",
    );
    expect(packageJson.scripts?.["verify:essay-practice"]).toBe(
      "vitest run tests/features/practice/content/essay-writing-papers.test.ts tests/app/multi-exam-practice-library.test.tsx tests/app/practice-page.test.tsx tests/app/results-page.test.tsx tests/app/learning-library-page.test.tsx tests/app/essay-practice-layout-contract.test.ts",
    );
    expect(packageJson.scripts?.["verify:tmua-diagnostic"]).toBe(
      "vitest run tests/features/practice/content/tmua-diagnostic-v1.test.ts tests/app/tmua-hub-page.test.tsx tests/app/practice-page.test.tsx tests/app/results-page.test.tsx",
    );
    expect(packageJson.scripts?.["verify:review-notes"]).toBe(
      "vitest run tests/features/notes/review-notes.test.ts tests/app/esat-mathematics-notes-page.test.tsx tests/app/esat-science-notes-page.test.tsx tests/app/tara-review-notes-page.test.tsx tests/app/lnat-review-notes-page.test.tsx tests/app/ucat-review-notes-page.test.tsx tests/app/learning-library-page.test.tsx",
    );
    expect(packageJson.scripts?.["verify:review-notes-pdfs"]).toBe(
      "vitest run tests/features/notes/review-notes-pdf-assets.test.ts",
    );
    expect(packageJson.scripts?.["verify:manual-review-ledger"]).toBe(
      "vitest run tests/features/library/manual-review-decisions.test.ts tests/features/library/manual-review-ledger.test.ts tests/architecture/manual-review-release-gate.test.ts",
    );
    expect(packageJson.scripts?.["verify:content-review-operations"]).toBe(
      "vitest run tests/features/content-review-operations tests/app/content-review-operations-page.test.tsx tests/app/content-review-operations-layout-contract.test.ts tests/app/account-lifecycle.test.tsx",
    );
    expect(packageJson.scripts?.["verify:production-bootstrap"]).toBe(
      "vitest run tests/platform/production-bootstrap.test.ts tests/platform/production-bootstrap-plan.test.ts tests/architecture/production-bootstrap-contract.test.ts",
    );
    expect(packageJson.scripts?.["verify:funnel-analytics"]).toBe(
      "vitest run tests/features/product-funnel/analytics.test.ts tests/app/product-funnel-analytics-page.test.tsx tests/app/product-funnel-analytics-layout-contract.test.ts tests/app/account-lifecycle.test.tsx",
    );
    expect(packageJson.scripts?.["verify:collaboration"]).toBe(
      "vitest run tests/features/collaboration tests/features/data-rights/supabase-data-rights-service.test.ts tests/app/student-collaboration-pages.test.tsx tests/app/student-collaboration-layout-contract.test.ts tests/app/account-lifecycle.test.tsx",
    );
    expect(packageJson.scripts?.["verify:esat-full-mock"]).toBe(
      "vitest run tests/features/practice/content/esat-mathematics-1-full-mock.test.ts tests/features/practice/content/esat-mathematics-2-full-mock.test.ts tests/features/practice/content/esat-physics-full-mock.test.ts tests/features/practice/content/esat-chemistry-full-mock.test.ts tests/features/practice/content/esat-biology-full-mock.test.ts tests/app/multi-exam-practice-library.test.tsx tests/app/practice-page.test.tsx tests/app/results-page.test.tsx",
    );
    expect(packageJson.scripts?.verify).toBe(
      "pnpm verify:architecture && pnpm verify:features && pnpm verify:supabase-contracts && pnpm verify:invite-operations && pnpm verify:production-platform && pnpm verify:production-bootstrap && pnpm verify:content-products && pnpm verify:product-lineage && pnpm verify:content-release-readiness && pnpm verify:manual-review-worklist && pnpm verify:manual-review-ledger && pnpm verify:content-review-operations && pnpm verify:entitled-content && pnpm verify:feedback && pnpm verify:product-funnel && pnpm verify:funnel-analytics && pnpm verify:collaboration && pnpm verify:learning-record && pnpm beta:audit && pnpm verify:content-imports && pnpm verify:curriculum-sources && pnpm verify:esat-assets && pnpm verify:esat-full-mock && pnpm verify:esat-starter && pnpm verify:tara-starter && pnpm verify:tara-full-mock && pnpm verify:lnat-starter && pnpm verify:lnat-full-mock && pnpm verify:ucat-starter && pnpm verify:ucat-verbal-full-mock && pnpm verify:ucat-decision-full-mock && pnpm verify:ucat-quantitative-full-mock && pnpm verify:ucat-situational-full-mock && pnpm verify:essay-practice && pnpm verify:tmua-diagnostic && pnpm verify:review-notes && pnpm verify:review-notes-pdfs && pnpm verify:tmua-notes && pnpm verify:tmua-corpus && pnpm verify:tmua-extractions && pnpm verify:tmua-online-papers && pnpm test && pnpm typecheck && pnpm build && pnpm verify:web-performance && pnpm verify:private-content-bundle",
    );
  });
});
