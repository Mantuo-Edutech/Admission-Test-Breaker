import { access, readFile, readdir } from "node:fs/promises";
import path from "node:path";
import {
  assessProductionEvidence,
  parseProductionEvidenceCatalog,
  parseProductionEvidenceRecord,
  productionControlSourceFingerprint,
  sha256Text,
  type ProductionEvidenceAssessment,
  type ProductionEvidenceCatalog,
  type ProductionEvidenceRecord,
  type ProductionP0GateId,
} from "../../src/platform/production-evidence-ledger.js";

export const PRODUCTION_EVIDENCE_CATALOG_PATH =
  "verification/production/control-catalog.json";
export const PRODUCTION_EVIDENCE_DIRECTORY =
  "verification/production/evidence";

export async function loadProductionEvidenceCatalog(): Promise<ProductionEvidenceCatalog> {
  return parseProductionEvidenceCatalog(
    JSON.parse(await readFile(PRODUCTION_EVIDENCE_CATALOG_PATH, "utf8")),
  );
}

export async function loadProductionEvidenceRecords(
  directory = PRODUCTION_EVIDENCE_DIRECTORY,
): Promise<ProductionEvidenceRecord[]> {
  let names: string[];
  try {
    names = await readdir(directory);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
  const records: ProductionEvidenceRecord[] = [];
  for (const name of names.filter((item) => item.endsWith(".json")).sort()) {
    const recordPath = path.join(directory, name);
    const record = parseProductionEvidenceRecord(JSON.parse(await readFile(recordPath, "utf8")));
    for (const artifact of record.artifacts) {
      await access(artifact.path);
      const actual = sha256Text(await readFile(artifact.path));
      if (actual !== artifact.sha256) {
        throw new Error(`${recordPath} artifact digest drifted: ${artifact.path}`);
      }
    }
    records.push(record);
  }
  return records;
}

export async function productionSourceFingerprints(
  catalog: ProductionEvidenceCatalog,
): Promise<Record<string, string>> {
  return Object.fromEntries(await Promise.all(catalog.controls.map(async (control) => [
    control.id,
    await productionControlSourceFingerprint(catalog, control, (sourcePath) => readFile(sourcePath)),
  ])));
}

export async function auditProductionEvidence(input: {
  readonly expectedRelease?: string;
  readonly repositoryVerifiedGates?: readonly ProductionP0GateId[];
  readonly evidenceDirectory?: string;
  readonly now?: Date;
} = {}): Promise<ProductionEvidenceAssessment> {
  const catalog = await loadProductionEvidenceCatalog();
  const [records, fingerprints] = await Promise.all([
    loadProductionEvidenceRecords(input.evidenceDirectory),
    productionSourceFingerprints(catalog),
  ]);
  return assessProductionEvidence({
    catalog,
    records,
    sourceFingerprints: fingerprints,
    repositoryVerifiedGates: input.repositoryVerifiedGates ?? ["B100-P0-06"],
    ...(input.expectedRelease === undefined ? {} : { expectedRelease: input.expectedRelease }),
    ...(input.now === undefined ? {} : { now: input.now }),
  });
}
