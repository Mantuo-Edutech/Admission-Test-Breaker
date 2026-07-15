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
    expect(packageJson.scripts?.verify).toBe(
      "pnpm verify:architecture && pnpm verify:features && pnpm verify:supabase-contracts && pnpm verify:content-imports && pnpm verify:tmua-corpus && pnpm verify:tmua-extractions && pnpm test && pnpm typecheck && pnpm build",
    );
  });
});
