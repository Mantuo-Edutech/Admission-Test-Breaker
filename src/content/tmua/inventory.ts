import { groupCanonicalSources } from "./canonicalize.js";
import {
  discoverImportedPdfPaths,
  toPortableRawPath,
} from "./fs-utils.js";
import { inspectPdf } from "./pdf-tools.js";
import type { AuditStamp, CorpusManifest } from "./types.js";

export interface InventoryResult {
  manifest: CorpusManifest;
  duplicateMap: Record<string, string>;
}

const importedBaseline = {
  pdfCount: 96,
  uniqueContentCount: 46,
  auditedAt: "2026-07-12",
} as const;

function assertPortablePath(path: string): void {
  if (
    !path.startsWith("Tmua/") ||
    path.startsWith("/") ||
    /^[A-Za-z]:/u.test(path) ||
    path.includes("\\") ||
    path.split("/").includes("..")
  ) {
    throw new Error(`Unsafe portable TMUA path: ${path}`);
  }
}

export async function buildImportedInventory(input: {
  rawRoot: string;
  audit: AuditStamp;
  inspect?: typeof inspectPdf;
}): Promise<InventoryResult> {
  const paths = await discoverImportedPdfPaths(input.rawRoot);
  if (paths.length !== importedBaseline.pdfCount) {
    throw new Error(
      `Expected ${importedBaseline.pdfCount} imported TMUA PDFs, found ${paths.length}`,
    );
  }

  const inspect = input.inspect ?? inspectPdf;
  const facts = [];
  for (const absolutePath of paths) {
    const portablePath = toPortableRawPath(input.rawRoot, absolutePath);
    assertPortablePath(portablePath);
    facts.push(await inspect(absolutePath, portablePath));
  }

  const portablePaths = facts.map((fact) => fact.portablePath);
  if (new Set(portablePaths).size !== portablePaths.length) {
    throw new Error("Imported TMUA inventory contains a repeated portable path");
  }

  const sources = groupCanonicalSources(facts, input.audit);
  if (sources.length !== importedBaseline.uniqueContentCount) {
    throw new Error(
      `Expected ${importedBaseline.uniqueContentCount} canonical TMUA sources, found ${sources.length}`,
    );
  }

  const observedPathCount = sources.reduce(
    (sum, source) => sum + 1 + source.duplicatePaths.length,
    0,
  );
  if (observedPathCount !== importedBaseline.pdfCount) {
    throw new Error(
      `Canonical groups preserve ${observedPathCount} paths, expected ${importedBaseline.pdfCount}`,
    );
  }

  const duplicateEntries = sources
    .flatMap((source) =>
      [source.canonicalPath, ...source.duplicatePaths].map(
        (path) => [path, source.id] as const,
      ),
    )
    .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0));
  const duplicateMap = Object.fromEntries(duplicateEntries);
  if (Object.keys(duplicateMap).length !== importedBaseline.pdfCount) {
    throw new Error("Duplicate map did not preserve every imported TMUA path");
  }

  return {
    manifest: {
      schemaVersion: 1,
      generatedAt: input.audit.generatedAt,
      baseline: importedBaseline,
      sources,
    },
    duplicateMap,
  };
}
