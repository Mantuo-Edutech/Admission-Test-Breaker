import rawCatalog from "../../../../content/practice/historic-practice-catalog.json" with { type: "json" };

export type HistoricPracticeModuleId =
  | "mathematics-1"
  | "physics"
  | "chemistry"
  | "biology"
  | "engineering-mixed";

export interface HistoricPracticeCatalogEntry {
  readonly exam: "esat" | "tara";
  readonly paperId: string;
  readonly family: "NSAA" | "ENGAA" | "TSA";
  readonly year: number;
  readonly moduleId?: HistoricPracticeModuleId;
  readonly title: string;
  readonly titleZh: string;
  readonly questionCount: number;
  readonly durationMinutes: number;
  readonly route: string;
}

function parseCatalog(value: unknown): readonly HistoricPracticeCatalogEntry[] {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Historic practice catalog must be an object");
  }
  const root = value as Record<string, unknown>;
  if (root.schemaVersion !== 1 || !Array.isArray(root.entries)) {
    throw new Error("Historic practice catalog header is invalid");
  }
  const entries = root.entries as HistoricPracticeCatalogEntry[];
  for (const entry of entries) {
    if (
      (entry.exam !== "esat" && entry.exam !== "tara") ||
      !/^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(entry.paperId) ||
      !["NSAA", "ENGAA", "TSA"].includes(entry.family) ||
      !Number.isInteger(entry.year) || entry.year < 2000 || entry.year > 2100 ||
      entry.title.trim() === "" || entry.titleZh.trim() === "" ||
      !Number.isInteger(entry.questionCount) || entry.questionCount < 1 ||
      !Number.isInteger(entry.durationMinutes) || entry.durationMinutes < 1 ||
      entry.route !== `/practice/${entry.paperId}`
    ) {
      throw new Error(`Historic practice catalog entry is invalid: ${entry.paperId}`);
    }
  }
  if (new Set(entries.map((entry) => entry.paperId)).size !== entries.length) {
    throw new Error("Historic practice catalog paper IDs must be unique");
  }
  return entries;
}

export const HISTORIC_PRACTICE_CATALOG = parseCatalog(rawCatalog);
export const HISTORIC_PRACTICE_PAPER_IDS = new Set(
  HISTORIC_PRACTICE_CATALOG.map((entry) => entry.paperId),
);

export function historicPracticeForExam(exam: "esat" | "tara"): readonly HistoricPracticeCatalogEntry[] {
  return HISTORIC_PRACTICE_CATALOG.filter((entry) => entry.exam === exam);
}

/**
 * Public libraries only expose historical material that maps cleanly to the
 * current assessment structure. Deprecated mixed archives remain readable so
 * that an existing learning record never breaks, but are not offered as a new
 * practice choice.
 */
export function publicHistoricPracticeForExam(exam: "esat" | "tara"): readonly HistoricPracticeCatalogEntry[] {
  return historicPracticeForExam(exam).filter((entry) => entry.moduleId !== "engineering-mixed");
}
