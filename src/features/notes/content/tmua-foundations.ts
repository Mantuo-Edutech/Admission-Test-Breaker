import rawNotes from "../../../../content/notes/tmua/foundations-v2.json" with { type: "json" };

export interface NotesFormula {
  readonly tex: string;
  readonly text: string;
}

export interface NotesRule {
  readonly term: string;
  readonly statementZh: string;
  readonly formula?: NotesFormula;
}

export interface NotesRecall {
  readonly promptZh: string;
  readonly promptEn: string;
  readonly answerZh: string;
  readonly answerEn: string;
}

export interface NotesWorkedExample {
  readonly id: string;
  readonly titleZh: string;
  readonly titleEn: string;
  readonly problemZh: string;
  readonly problemEn: string;
  readonly steps: readonly {
    readonly labelZh: string;
    readonly bodyZh: string;
    readonly math?: NotesFormula;
  }[];
  readonly answerZh: string;
  readonly trapZh: string;
}

export interface NotesSection {
  readonly titleZh: string;
  readonly titleEn: string;
  readonly paragraphsZh: readonly string[];
  readonly rules: readonly NotesRule[];
  readonly workedExamples?: readonly NotesWorkedExample[];
  readonly activeRecall: readonly NotesRecall[];
}

export interface NotesChapter {
  readonly id: string;
  readonly number: string;
  readonly titleZh: string;
  readonly titleEn: string;
  readonly summaryZh: string;
  readonly learningOutcomes: readonly string[];
  readonly sections: readonly NotesSection[];
}

export interface CurriculumBridge {
  readonly curriculum: string;
  readonly status: "strong-start" | "partial";
  readonly statusZh: string;
  readonly likelyCoveredZh: readonly string[];
  readonly confirmZh: readonly string[];
  readonly firstActionZh: string;
}

export interface NotesCheckpointQuestion {
  readonly id: string;
  readonly promptZh: string;
  readonly promptEn: string;
  readonly options: readonly string[];
  readonly correctOption: number;
  readonly explanationZh: string;
  readonly explanationEn: string;
}

export interface TmuaFoundationsNotes {
  readonly schemaVersion: 1;
  readonly id: "tmua-foundations-v2";
  readonly edition: string;
  readonly publicationStatus: "teaching-preview";
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
    readonly localPath: string;
    readonly sourceUrl: string;
    readonly usedForZh: string;
    readonly sha256: string;
  }[];
  readonly examMap: {
    readonly officialFacts: readonly {
      readonly labelZh: string;
      readonly labelEn: string;
      readonly valueZh: string;
      readonly valueEn: string;
    }[];
    readonly mantouStrategy: readonly {
      readonly nameZh: string;
      readonly nameEn: string;
      readonly guidanceZh: string;
      readonly guidanceEn: string;
    }[];
  };
  readonly curriculumBridges: readonly CurriculumBridge[];
  readonly chapters: readonly NotesChapter[];
  readonly checkpoint: {
    readonly titleZh: string;
    readonly titleEn: string;
    readonly instructionsZh: string;
    readonly questions: readonly NotesCheckpointQuestion[];
  };
  readonly reviewWorkflow: readonly {
    readonly stepZh: string;
    readonly stepEn: string;
    readonly actionZh: string;
  }[];
}

function assertUnique(values: readonly string[], label: string): void {
  if (new Set(values).size !== values.length) {
    throw new Error(`${label} must be unique`);
  }
}

export function validateTmuaFoundationsNotes(value: unknown): TmuaFoundationsNotes {
  if (typeof value !== "object" || value === null) {
    throw new Error("TMUA foundations notes must be an object");
  }
  const candidate = value as Partial<TmuaFoundationsNotes>;
  if (
    candidate.schemaVersion !== 1 ||
    candidate.id !== "tmua-foundations-v2" ||
    candidate.publicationStatus !== "teaching-preview" ||
    !Array.isArray(candidate.officialAnchors) ||
    !Array.isArray(candidate.curriculumBridges) ||
    !Array.isArray(candidate.chapters) ||
    candidate.checkpoint === undefined
  ) {
    throw new Error("TMUA foundations notes header is invalid");
  }

  if (candidate.officialAnchors.length < 4) {
    throw new Error("TMUA foundations notes need four official source anchors");
  }
  assertUnique(candidate.officialAnchors.map((source) => source.id), "Official source ids");
  for (const source of candidate.officialAnchors) {
    if (
      !source.sourceUrl.startsWith("https://") ||
      !source.localPath.startsWith("content/official/raw/") ||
      !/^[a-f0-9]{64}$/u.test(source.sha256)
    ) {
      throw new Error(`Invalid official source anchor: ${source.id}`);
    }
  }

  const requiredCurricula = ["A-Level", "IB Mathematics", "AP Precalculus"];
  for (const curriculum of requiredCurricula) {
    if (!candidate.curriculumBridges.some((bridge) => bridge.curriculum.includes(curriculum))) {
      throw new Error(`Missing curriculum bridge: ${curriculum}`);
    }
  }

  if (candidate.chapters.length < 7) {
    throw new Error("TMUA foundations notes need at least seven chapters");
  }
  assertUnique(candidate.chapters.map((chapter) => chapter.id), "Chapter ids");
  const examples = candidate.chapters.flatMap((chapter) =>
    chapter.sections.flatMap((section: NotesSection) => section.workedExamples ?? []),
  );
  if (examples.length < 9 || examples.some((example) => !example.titleZh.includes("原创例题"))) {
    throw new Error("TMUA foundations notes need nine clearly labelled original worked examples");
  }
  assertUnique(examples.map((example) => example.id), "Worked example ids");

  if (!Array.isArray(candidate.checkpoint.questions) || candidate.checkpoint.questions.length < 12) {
    throw new Error("TMUA foundations notes need at least twelve checkpoint questions");
  }
  assertUnique(candidate.checkpoint.questions.map((question) => question.id), "Checkpoint ids");
  for (const question of candidate.checkpoint.questions) {
    if (
      question.options.length < 4 ||
      !Number.isInteger(question.correctOption) ||
      question.correctOption < 0 ||
      question.correctOption >= question.options.length
    ) {
      throw new Error(`Invalid checkpoint answer: ${question.id}`);
    }
  }

  return candidate as TmuaFoundationsNotes;
}

export const TMUA_FOUNDATIONS_NOTES = validateTmuaFoundationsNotes(rawNotes);
