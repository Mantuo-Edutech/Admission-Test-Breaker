import rawEsatPapers from "../../../../content/esat/historic-online-papers.json" with { type: "json" };
import rawTaraPapers from "../../../../content/tara/historic-online-papers.json" with { type: "json" };
import type { PracticePaper } from "./types.js";
import { validatePracticePaper } from "./validate.js";

function parseBundle(value: unknown, exam: "ESAT" | "TARA"): readonly PracticePaper[] {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${exam} historic practice bundle must be an object`);
  }
  const root = value as Record<string, unknown>;
  if (root.schemaVersion !== 1 || root.exam !== exam || !Array.isArray(root.papers)) {
    throw new Error(`${exam} historic practice bundle header is invalid`);
  }
  return (root.papers as PracticePaper[]).map((paper) => {
    const issues = validatePracticePaper(paper, { questionCount: paper.questions.length });
    if (
      paper.exam !== exam ||
      paper.deliveryMode !== "structured" ||
      paper.responseMode !== "choice" ||
      paper.questions.some((question) => question.optionDisplay !== "labels-only") ||
      issues.length > 0
    ) {
      throw new Error(`Invalid historic online paper ${paper.id}: ${issues.map((issue) => issue.code).join(", ")}`);
    }
    return paper;
  });
}

export const ESAT_HISTORIC_ONLINE_PAPERS = parseBundle(rawEsatPapers, "ESAT");
export const TARA_HISTORIC_ONLINE_PAPERS = parseBundle(rawTaraPapers, "TARA");
export const HISTORIC_ONLINE_PAPERS = [
  ...ESAT_HISTORIC_ONLINE_PAPERS,
  ...TARA_HISTORIC_ONLINE_PAPERS,
] as const;

export function getHistoricOnlinePaper(paperId: string): PracticePaper | null {
  return HISTORIC_ONLINE_PAPERS.find((paper) => paper.id === paperId) ?? null;
}
