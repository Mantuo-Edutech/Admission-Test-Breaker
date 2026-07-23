import { assertAllowedOfficialUrl } from "./official-sources.js";
import { TMUA_EDITIONS, TMUA_PUBLISHED_PAPER_IDS } from "./past-papers.js";
import {
  validateQuestionTaxonomy,
  validateTaxonomy,
  type LoadedTaxonomy,
} from "./taxonomy.js";
import type {
  CorpusManifest,
  OfficialResourceRecord,
  PaperRecord,
  QuestionRecord,
  TmuaPublicSummary,
  ValidationIssue,
} from "./types.js";

export interface CorpusArtifacts {
  manifest: CorpusManifest;
  officialResources: OfficialResourceRecord[];
  papers: PaperRecord[];
  questions: QuestionRecord[];
  publicSummary: TmuaPublicSummary;
  taxonomy: LoadedTaxonomy;
}

function p0(code: string, message: string, path?: string): ValidationIssue {
  return { severity: "P0", code, message, ...(path ? { path } : {}) };
}

function duplicates(values: string[]): string[] {
  const seen = new Set<string>();
  const repeated = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) repeated.add(value);
    seen.add(value);
  }
  return [...repeated].sort();
}

function safePath(path: string): boolean {
  return (
    path.startsWith("Tmua/") &&
    !path.startsWith("/") &&
    !/^[A-Za-z]:/u.test(path) &&
    !path.includes("\\") &&
    !path.split("/").includes("..")
  );
}

function expectedPublicSummary(
  artifacts: CorpusArtifacts,
): TmuaPublicSummary {
  return {
    schemaVersion: 1,
    exam: "TMUA",
    auditedAt: artifacts.publicSummary.auditedAt,
    importedPdfPathCount: 96,
    canonicalSourceCount: 46,
    officialSupplementCount: 4,
    paperCount: 18,
    questionShellCount: 360,
    publishedQuestionCount: TMUA_PUBLISHED_PAPER_IDS.length * 20,
    editions: TMUA_EDITIONS.map((edition) => ({
      id: edition.id,
      label: edition.label,
      papers: artifacts.papers
        .filter((paper) => paper.edition === edition.id)
        .map((paper) => ({
          paper: paper.paper,
          contentStage: paper.contentStage,
          onlineQuestionCount: paper.onlineQuestionCount,
        })),
    })),
  };
}

export function verifyCorpus(artifacts: CorpusArtifacts): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const { manifest, officialResources, papers, questions } = artifacts;

  if (manifest.sources.length !== 46) {
    issues.push(
      p0(
        "canonical_source_count",
        `Expected 46 canonical sources, found ${manifest.sources.length}`,
      ),
    );
  }
  const allPaths = manifest.sources.flatMap((source) => [
    source.canonicalPath,
    ...source.duplicatePaths,
  ]);
  if (allPaths.length !== 96 || new Set(allPaths).size !== 96) {
    issues.push(
      p0(
        "imported_path_count",
        `Expected 96 unique imported paths, found ${new Set(allPaths).size}`,
      ),
    );
  }
  for (const path of allPaths) {
    if (!safePath(path)) {
      issues.push(p0("unsafe_source_path", `Unsafe persisted path: ${path}`, path));
    }
  }

  for (const id of duplicates(manifest.sources.map((source) => source.id))) {
    issues.push(p0("duplicate_source_id", `Duplicate source ID: ${id}`, id));
  }
  for (const digest of duplicates(
    manifest.sources.map((source) => source.sha256),
  )) {
    issues.push(
      p0(
        "duplicate_canonical_digest",
        `Digest is assigned to multiple canonical sources: ${digest}`,
      ),
    );
  }

  if (officialResources.length !== 4) {
    issues.push(
      p0(
        "official_supplement_count",
        `Expected 4 official supplements, found ${officialResources.length}`,
      ),
    );
  }
  for (const resource of officialResources) {
    try {
      assertAllowedOfficialUrl(resource.officialUrl);
    } catch (error) {
      issues.push(
        p0(
          "unsafe_official_url",
          error instanceof Error ? error.message : String(error),
          resource.id,
        ),
      );
    }
    if (resource.localPath !== undefined && !safePath(resource.localPath)) {
      issues.push(
        p0(
          "unsafe_source_path",
          `Unsafe official resource path: ${resource.localPath}`,
          resource.id,
        ),
      );
    }
  }

  if (papers.length !== 18) {
    issues.push(p0("paper_count", `Expected 18 papers, found ${papers.length}`));
  }
  for (const id of duplicates(papers.map((paper) => paper.id))) {
    issues.push(p0("duplicate_paper_id", `Duplicate paper ID: ${id}`, id));
  }
  if (questions.length !== 360) {
    issues.push(
      p0(
        "question_count",
        `Expected 360 question shells, found ${questions.length}`,
      ),
    );
  }
  for (const id of duplicates(questions.map((question) => question.id))) {
    issues.push(p0("duplicate_question_id", `Duplicate question ID: ${id}`, id));
  }

  const sourceIds = new Set([
    ...manifest.sources.map((source) => source.id),
    ...officialResources.map((resource) => resource.id),
  ]);
  for (const paper of papers) {
    for (const sourceId of [
      paper.questionSourceId,
      paper.answerSourceId,
      paper.workedSolutionSourceId,
    ]) {
      if (!sourceIds.has(sourceId)) {
        issues.push(
          p0(
            "unresolved_paper_source",
            `${paper.id} references missing source ${sourceId}`,
            paper.id,
          ),
        );
      }
    }
    if (
      paper.contentStage === "published" &&
      !TMUA_PUBLISHED_PAPER_IDS.includes(paper.id)
    ) {
      issues.push(
        p0(
          "false_published_status",
          `${paper.id} is not an approved published online paper`,
          paper.id,
        ),
      );
    }
  }

  for (const paper of papers) {
    const paperQuestions = questions.filter(
      (question) =>
        question.edition === paper.edition && question.paper === paper.paper,
    );
    const numbers = paperQuestions
      .map((question) => question.questionNumber)
      .sort((left, right) => left - right);
    const expectedNumbers = Array.from(
      { length: 20 },
      (_, index) => index + 1,
    );
    if (JSON.stringify(numbers) !== JSON.stringify(expectedNumbers)) {
      issues.push(
        p0(
          "invalid_paper_question_range",
          `${paper.id} must contain question numbers 1 through 20 exactly once`,
          paper.id,
        ),
      );
    }
    const publishedCount = paperQuestions.filter(
      (question) => question.contentStage === "published",
    ).length;
    if (paper.onlineQuestionCount !== publishedCount) {
      issues.push(
        p0(
          "paper_online_count_mismatch",
          `${paper.id} reports ${paper.onlineQuestionCount} online questions but has ${publishedCount}`,
          paper.id,
        ),
      );
    }
  }

  for (const question of questions) {
    for (const sourceId of [
      question.questionSourceId,
      question.answerSourceId,
      question.workedSolutionSourceId,
    ]) {
      if (!sourceIds.has(sourceId)) {
        issues.push(
          p0(
            "unresolved_question_source",
            `${question.id} references missing source ${sourceId}`,
            question.id,
          ),
        );
      }
    }
    const allowedPublished = TMUA_PUBLISHED_PAPER_IDS.some((paperId) =>
      question.id.startsWith(`${paperId}-q`),
    );
    if (question.contentStage === "published" && !allowedPublished) {
      issues.push(
        p0(
          "false_published_status",
          `${question.id} is not approved published online content`,
          question.id,
        ),
      );
    }
    if (
      question.contentStage === "published" &&
      question.onlineContentId !== question.id
    ) {
      issues.push(
        p0(
          "published_content_link_mismatch",
          `${question.id} does not link to matching online content`,
          question.id,
        ),
      );
    }
  }

  const publishedPapers = papers.filter(
    (paper) => paper.contentStage === "published",
  );
  const publishedQuestions = questions.filter(
    (question) => question.contentStage === "published",
  );
  if (
    publishedPapers.length !== TMUA_PUBLISHED_PAPER_IDS.length ||
    !TMUA_PUBLISHED_PAPER_IDS.every((paperId) =>
      publishedPapers.some((paper) => paper.id === paperId),
    ) ||
    publishedQuestions.length !== TMUA_PUBLISHED_PAPER_IDS.length * 20
  ) {
    issues.push(
      p0(
        "published_content_count",
        `Only independently verified native papers and their ${TMUA_PUBLISHED_PAPER_IDS.length * 20} questions may be published`,
      ),
    );
  }

  issues.push(...validateTaxonomy(artifacts.taxonomy.all));
  issues.push(
    ...validateQuestionTaxonomy(questions, artifacts.taxonomy.all),
  );

  if (
    JSON.stringify(artifacts.publicSummary) !==
    JSON.stringify(expectedPublicSummary(artifacts))
  ) {
    issues.push(
      p0(
        "public_summary_mismatch",
        "Public summary does not match verified corpus records",
      ),
    );
  }

  return issues;
}

export function verifyRawInventory(
  committed: CorpusManifest,
  fresh: CorpusManifest,
): ValidationIssue[] {
  const compact = (manifest: CorpusManifest) =>
    manifest.sources.map((source) => ({
      id: source.id,
      canonicalPath: source.canonicalPath,
      duplicatePaths: source.duplicatePaths,
      sha256: source.sha256,
      fileSize: source.fileSize,
      pages: source.metadata.pages,
      documentType: source.documentType,
    }));
  return JSON.stringify(compact(committed)) === JSON.stringify(compact(fresh))
    ? []
    : [
        p0(
          "raw_inventory_mismatch",
          "Committed corpus manifest does not match the supplied raw PDFs",
        ),
      ];
}
