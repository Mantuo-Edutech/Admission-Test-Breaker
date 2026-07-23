export interface ReviewNotesFormula {
  readonly tex: string;
  readonly text: string;
}

export interface ReviewNotesWorkedExample {
  readonly id: string;
  readonly titleZh: string;
  readonly titleEn: string;
  readonly problemZh: string;
  readonly problemEn: string;
  readonly steps: readonly {
    readonly labelZh: string;
    readonly bodyZh: string;
    readonly math?: ReviewNotesFormula;
  }[];
  readonly answerZh: string;
  readonly trapZh: string;
}

export interface ReviewNotesModule {
  readonly id: string;
  readonly number: string;
  readonly titleZh: string;
  readonly titleEn: string;
  readonly summaryZh: string;
  readonly learningOutcomes: readonly string[];
  readonly knowledgeUnits: readonly {
    readonly id: string;
    readonly code: string;
    readonly labelZh: string;
    readonly labelEn: string;
  }[];
  readonly methods: readonly {
    readonly nameZh: string;
    readonly nameEn: string;
    readonly signalZh: string;
    readonly methodZh: string;
    readonly checkZh: string;
  }[];
  readonly originalWorkedExamples: readonly ReviewNotesWorkedExample[];
  readonly activeRecall: readonly {
    readonly promptZh: string;
    readonly promptEn: string;
    readonly answerZh: string;
    readonly answerEn: string;
  }[];
}

export interface ReviewNotesDocument {
  readonly schemaVersion: 1;
  readonly id: string;
  readonly version: string;
  readonly publicationStatus: "teaching-preview";
  readonly examId: "tmua" | "esat" | "tara" | "lnat" | "ucat";
  readonly examCycle: string;
  readonly titleZh: string;
  readonly titleEn: string;
  readonly subtitleZh: string;
  readonly subtitleEn: string;
  readonly authorship: string;
  readonly rightsNotice: string;
  readonly scope: {
    readonly includedZh: string;
    readonly includedEn: string;
    readonly remainingZh: string;
  };
  readonly officialAnchors: readonly {
    readonly id: string;
    readonly title: string;
    readonly sourceUrl: string;
    readonly localPath: string;
    readonly sha256: string;
    readonly usedForZh: string;
  }[];
  readonly examFacts: readonly {
    readonly labelZh: string;
    readonly labelEn: string;
    readonly valueZh: string;
    readonly valueEn: string;
  }[];
  readonly curriculumBridges: readonly {
    readonly curriculum: string;
    readonly status: "strong-start" | "partial";
    readonly statusZh: string;
    readonly likelyCoveredZh: readonly string[];
    readonly confirmZh: readonly string[];
    readonly firstActionZh: string;
  }[];
  readonly modules: readonly ReviewNotesModule[];
  readonly reviewWorkflow: readonly {
    readonly stepZh: string;
    readonly stepEn: string;
    readonly actionZh: string;
  }[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function nonEmpty(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function unique(values: readonly string[], label: string): void {
  if (new Set(values).size !== values.length) throw new Error(`${label} must be unique`);
}

export function validateReviewNotesDocument(value: unknown): ReviewNotesDocument {
  if (!isRecord(value)) throw new Error("Review notes must be an object");
  const candidate = value as unknown as Partial<ReviewNotesDocument>;
  if (
    candidate.schemaVersion !== 1 ||
    !nonEmpty(candidate.id) ||
    !/^\d+\.\d+\.\d+$/u.test(candidate.version ?? "") ||
    candidate.publicationStatus !== "teaching-preview" ||
    !["tmua", "esat", "tara", "lnat", "ucat"].includes(candidate.examId ?? "") ||
    !nonEmpty(candidate.titleZh) ||
    !nonEmpty(candidate.titleEn) ||
    !Array.isArray(candidate.officialAnchors) ||
    !Array.isArray(candidate.curriculumBridges) ||
    !Array.isArray(candidate.modules) ||
    !Array.isArray(candidate.examFacts) ||
    !Array.isArray(candidate.reviewWorkflow)
  ) throw new Error("Review notes header is invalid");

  if (candidate.officialAnchors.length < 2) throw new Error("Review notes need at least two official anchors");
  unique(candidate.officialAnchors.map((anchor) => anchor.id), "Review notes source ids");
  for (const anchor of candidate.officialAnchors) {
    if (
      !anchor.sourceUrl.startsWith("https://") ||
      !anchor.localPath.startsWith("content/official/raw/") ||
      !/^[a-f0-9]{64}$/u.test(anchor.sha256) ||
      !nonEmpty(anchor.usedForZh)
    ) throw new Error(`Invalid review notes source: ${anchor.id}`);
  }

  if (candidate.examFacts.length < 4) throw new Error("Review notes need a factual exam map");
  if (candidate.curriculumBridges.length < 3) throw new Error("Review notes need three curriculum bridges");

  if (candidate.modules.length === 0) throw new Error("Review notes need at least one module");
  unique(candidate.modules.map((module) => module.id), "Review notes module ids");
  const unitIds: string[] = [];
  const exampleIds: string[] = [];
  for (const module of candidate.modules) {
    if (
      !nonEmpty(module.titleZh) ||
      !nonEmpty(module.titleEn) ||
      module.knowledgeUnits.length < 3 ||
      module.methods.length < 2 ||
      module.originalWorkedExamples.length < 1 ||
      module.activeRecall.length < 2
    ) throw new Error(`Review notes module is incomplete: ${module.id}`);
    unitIds.push(...module.knowledgeUnits.map(
      (unit: ReviewNotesModule["knowledgeUnits"][number]) => unit.id,
    ));
    exampleIds.push(...module.originalWorkedExamples.map(
      (example: ReviewNotesWorkedExample) => example.id,
    ));
    for (const example of module.originalWorkedExamples) {
      if (!example.titleZh.includes("原创例题") || example.steps.length < 2) {
        throw new Error(`Review notes example is not independently authored: ${example.id}`);
      }
      for (const step of example.steps) {
        if (step.math !== undefined && (!nonEmpty(step.math.tex) || !nonEmpty(step.math.text))) {
          throw new Error(`Review notes formula needs text fallback: ${example.id}`);
        }
      }
    }
  }
  unique(unitIds, "Review notes knowledge-unit ids");
  unique(exampleIds, "Review notes example ids");

  if (!nonEmpty(candidate.scope?.remainingZh) || !nonEmpty(candidate.rightsNotice)) {
    throw new Error("Review notes need an explicit publication boundary");
  }

  return candidate as ReviewNotesDocument;
}
