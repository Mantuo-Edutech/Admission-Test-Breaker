import { TMUA_2017_P1 } from "../../features/practice/content/tmua-2017-p1.js";
import { TMUA_2017_P2 } from "../../features/practice/content/tmua-2017-p2.js";
import { TMUA_2018_P1 } from "../../features/practice/content/tmua-2018-p1.js";
import { TMUA_2018_P2 } from "../../features/practice/content/tmua-2018-p2.js";
import { TMUA_2019_P1 } from "../../features/practice/content/tmua-2019-p1.js";
import { TMUA_2019_P2 } from "../../features/practice/content/tmua-2019-p2.js";
import { TMUA_2020_P1 } from "../../features/practice/content/tmua-2020-p1.js";
import { TMUA_2020_P2 } from "../../features/practice/content/tmua-2020-p2.js";
import { TMUA_2021_P1 } from "../../features/practice/content/tmua-2021-p1.js";
import { TMUA_2021_P2 } from "../../features/practice/content/tmua-2021-p2.js";
import { TMUA_2022_P1 } from "../../features/practice/content/tmua-2022-p1.js";
import { TMUA_2022_P2 } from "../../features/practice/content/tmua-2022-p2.js";
import { TMUA_2023_P1 } from "../../features/practice/content/tmua-2023-p1.js";
import { TMUA_2023_P2 } from "../../features/practice/content/tmua-2023-p2.js";
import { TMUA_PRACTICE_2016_P1 } from "../../features/practice/content/tmua-practice-2016-p1.js";
import { TMUA_PRACTICE_2016_P2 } from "../../features/practice/content/tmua-practice-2016-p2.js";
import { TMUA_SPECIMEN_P1 } from "../../features/practice/content/tmua-specimen-p1.js";
import { TMUA_SPECIMEN_P2 } from "../../features/practice/content/tmua-specimen-p2.js";
import type {
  AuditStamp,
  CorpusManifest,
  OfficialResourceRecord,
  PaperRecord,
  QuestionRecord,
  TmuaPublicSummary,
} from "./types.js";

export const TMUA_EDITIONS = [
  { id: "specimen", label: "Early specimen" },
  { id: "practice-2016", label: "2016 Practice" },
  { id: "2017", label: "2017" },
  { id: "2018", label: "2018" },
  { id: "2019", label: "2019" },
  { id: "2020", label: "2020" },
  { id: "2021", label: "2021" },
  { id: "2022", label: "2022" },
  { id: "2023", label: "2023" },
] as const;

export interface PastPaperIndexResult {
  papers: PaperRecord[];
  questions: QuestionRecord[];
  publicSummary: TmuaPublicSummary;
}

const verifiedOnlinePapers = [
  TMUA_SPECIMEN_P1, TMUA_SPECIMEN_P2,
  TMUA_PRACTICE_2016_P1, TMUA_PRACTICE_2016_P2,
  TMUA_2017_P1, TMUA_2017_P2,
  TMUA_2018_P1, TMUA_2018_P2,
  TMUA_2019_P1, TMUA_2019_P2,
  TMUA_2020_P1, TMUA_2020_P2,
  TMUA_2021_P1, TMUA_2021_P2,
  TMUA_2022_P1, TMUA_2022_P2,
  TMUA_2023_P1, TMUA_2023_P2,
] as const;

export const TMUA_PUBLISHED_PAPER_IDS = verifiedOnlinePapers.map(
  (paper) => paper.id,
);

const expectedPublishedIds = verifiedOnlinePapers.flatMap((paper) =>
  paper.questions.map((question) => question.id),
);

const verifiedOnlineQuestions = new Map(
  verifiedOnlinePapers.flatMap((paper) =>
    paper.questions.map((question) => [question.id, question] as const),
  ),
);

function assertPublishedIds(publishedQuestionIds: readonly string[]): void {
  if (
    publishedQuestionIds.length !== expectedPublishedIds.length ||
    new Set(publishedQuestionIds).size !== expectedPublishedIds.length ||
    expectedPublishedIds.some((id) => !publishedQuestionIds.includes(id)) ||
    expectedPublishedIds.some((id) => !verifiedOnlineQuestions.has(id))
  ) {
    throw new Error(
      `Publication requires exactly ${expectedPublishedIds.length} verified native question IDs`,
    );
  }
}

function requireSource(sourceIds: Set<string>, sourceId: string): void {
  if (!sourceIds.has(sourceId)) {
    throw new Error(`Unresolved source relation: ${sourceId}`);
  }
}

export function buildPastPaperIndex(input: {
  manifest: CorpusManifest;
  officialResources: OfficialResourceRecord[];
  audit: AuditStamp;
  publishedQuestionIds?: readonly string[];
}): PastPaperIndexResult {
  const publishedQuestionIds =
    input.publishedQuestionIds ?? [...verifiedOnlineQuestions.keys()];
  assertPublishedIds(publishedQuestionIds);

  const sourceIds = new Set([
    ...input.manifest.sources.map((source) => source.id),
    ...input.officialResources.map((resource) => resource.id),
  ]);
  const papers: PaperRecord[] = [];
  const questions: QuestionRecord[] = [];

  for (const edition of TMUA_EDITIONS) {
    for (const paperNumber of [1, 2] as const) {
      const questionSourceId = `tmua-official-${edition.id}-paper-${paperNumber}`;
      const answerSourceId = `tmua-official-${edition.id}-answer-key`;
      const workedSolutionSourceId = `tmua-official-${edition.id}-paper-${paperNumber}-worked-solutions`;
      for (const sourceId of [
        questionSourceId,
        answerSourceId,
        workedSolutionSourceId,
      ]) {
        requireSource(sourceIds, sourceId);
      }

      const paperId = `tmua-${edition.id}-p${paperNumber}`;
      const isPublished = TMUA_PUBLISHED_PAPER_IDS.includes(paperId);
      papers.push({
        id: paperId,
        edition: edition.id,
        paper: paperNumber,
        durationMinutes: 75,
        expectedQuestionCount: 20,
        questionSourceId,
        answerSourceId,
        workedSolutionSourceId,
        completeness: "complete",
        contentStage: isPublished ? "published" : "indexed",
        onlineQuestionCount: isPublished ? 20 : 0,
        audit: input.audit,
      });

      for (let questionNumber = 1; questionNumber <= 20; questionNumber += 1) {
        const id = `tmua-${edition.id}-p${paperNumber}-q${String(
          questionNumber,
        ).padStart(2, "0")}`;
        const verifiedContent = isPublished
          ? verifiedOnlineQuestions.get(id)
          : undefined;
        if (isPublished && verifiedContent === undefined) {
          throw new Error(`Published shell has no verified online content: ${id}`);
        }
        questions.push({
          id,
          exam: "TMUA",
          edition: edition.id,
          paper: paperNumber,
          questionNumber,
          sourceType: "past_paper",
          questionSourceId,
          answerSourceId,
          workedSolutionSourceId,
          prompt: null,
          options: [],
          correctAnswer: null,
          ...(isPublished ? { onlineContentId: id } : {}),
          knowledgeTags: verifiedContent?.knowledgeTags ?? [],
          skillTags: verifiedContent?.skillTags ?? [],
          errorTypes: [],
          syllabusLevel: "CORE",
          contentStage: isPublished ? "published" : "indexed",
          reviewStatus: isPublished ? "verified" : "needs_review",
          audit: input.audit,
        });
      }
    }
  }

  if (new Set(papers.map((paper) => paper.id)).size !== papers.length) {
    throw new Error("TMUA paper index contains duplicate IDs");
  }
  if (new Set(questions.map((question) => question.id)).size !== questions.length) {
    throw new Error("TMUA question index contains duplicate IDs");
  }

  const publicSummary: TmuaPublicSummary = {
    schemaVersion: 1,
    exam: "TMUA",
    auditedAt: input.audit.generatedAt,
    importedPdfPathCount: input.manifest.baseline.pdfCount,
    canonicalSourceCount: input.manifest.sources.length,
    officialSupplementCount: input.officialResources.length,
    paperCount: papers.length,
    questionShellCount: questions.length,
    publishedQuestionCount: questions.filter(
      (question) => question.contentStage === "published",
    ).length,
    editions: TMUA_EDITIONS.map((edition) => ({
      id: edition.id,
      label: edition.label,
      papers: papers
        .filter((paper) => paper.edition === edition.id)
        .map((paper) => ({
          paper: paper.paper,
          contentStage: paper.contentStage,
          onlineQuestionCount: paper.onlineQuestionCount,
        })),
    })),
  };

  return { papers, questions, publicSummary };
}
