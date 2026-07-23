import {
  parseDeliveredPracticePaper,
  type DeliveredPracticePaper,
} from "../features/practice/delivery/domain.js";

export interface RemotePracticeRevisionExpectation {
  readonly paperId: string;
  readonly paperRevisionId: string;
  readonly exam: "TMUA" | "ESAT" | "TARA" | "LNAT" | "UCAT";
  readonly contentDigest: string;
  readonly questionCount: number;
  readonly durationMinutes: number;
}

export interface RemotePracticeCatalogVerification {
  readonly papers: ReadonlyMap<string, DeliveredPracticePaper>;
  readonly paperCount: number;
  readonly questionCount: number;
  readonly archivedTmuaPaperCount: 18;
}

export const ARCHIVED_TMUA_PAPER_IDS = [
  "tmua-specimen-p1",
  "tmua-specimen-p2",
  "tmua-practice-2016-p1",
  "tmua-practice-2016-p2",
  ...Array.from({ length: 7 }, (_, yearIndex) => 2017 + yearIndex)
    .flatMap((year) => [1, 2].map((paper) => `tmua-${year}-p${paper}`)),
] as const;

const REQUIRED_PUBLISHED_EXAMS = ["TMUA", "ESAT", "TARA", "LNAT", "UCAT"] as const;

export async function verifyRemotePracticeCatalog(
  expectations: readonly RemotePracticeRevisionExpectation[],
  loadPaper: (expectation: RemotePracticeRevisionExpectation) => Promise<unknown>,
): Promise<RemotePracticeCatalogVerification> {
  if (expectations.length === 0) throw new Error("Published practice catalog is empty");
  if (new Set(expectations.map((item) => item.paperId)).size !== expectations.length) {
    throw new Error("Published practice catalog contains duplicate paper IDs");
  }
  const publishedExams = new Set(expectations.map((item) => item.exam));
  for (const exam of REQUIRED_PUBLISHED_EXAMS) {
    if (!publishedExams.has(exam)) throw new Error(`Published practice catalog omitted ${exam}`);
  }
  const expectationIds = new Set(expectations.map((item) => item.paperId));
  const missingArchivedTmuaIds = ARCHIVED_TMUA_PAPER_IDS.filter((id) => !expectationIds.has(id));
  if (missingArchivedTmuaIds.length > 0) {
    throw new Error(`Published practice catalog omitted archived TMUA papers: ${missingArchivedTmuaIds.join(", ")}`);
  }

  const papers = new Map<string, DeliveredPracticePaper>();
  let questionCount = 0;
  for (const expected of expectations) {
    const delivered = parseDeliveredPracticePaper(await loadPaper(expected), expected.paperId);
    if (
      delivered.questions.length !== expected.questionCount
      || delivered.durationMinutes !== expected.durationMinutes
      || delivered.exam !== expected.exam
      || delivered.contentRef.paperRevisionId !== expected.paperRevisionId
      || delivered.contentRef.contentDigest !== expected.contentDigest
    ) {
      throw new Error(`Remote paper does not match its immutable manifest: ${expected.paperRevisionId}`);
    }
    papers.set(expected.paperId, delivered);
    questionCount += delivered.questions.length;
  }

  return {
    papers,
    paperCount: papers.size,
    questionCount,
    archivedTmuaPaperCount: 18,
  };
}
