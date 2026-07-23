export type InlineRun =
  | { kind: "text"; value: string }
  | { kind: "math"; tex: string };

export type QuestionBlock =
  | { kind: "paragraph"; runs: InlineRun[] }
  | { kind: "display-math"; tex: string }
  | { kind: "table"; caption: string; headers: string[]; rows: string[][] }
  | { kind: "figure"; src: string; alt: string; caption?: string }
  | {
      kind: "source-pdf";
      src: string;
      page: number;
      title: string;
    };

export interface PracticeOption {
  label: string;
  content: QuestionBlock[];
}

export interface PracticePassage {
  id: string;
  title: string;
  content: QuestionBlock[];
}

export interface PracticeEssayPrompt {
  id: string;
  title: string;
  prompt: string;
}

export interface PracticeEssayTask {
  prompts: PracticeEssayPrompt[];
  maxWords: number;
  recommendedWords?: { min: number; max: number };
}

export interface PracticeStatement {
  id: string;
  content: QuestionBlock[];
  correctAnswer: "yes" | "no";
}

export type PracticeQuestionScoring =
  | { kind: "statement-set-two-point" }
  | { kind: "adjacent-partial"; order: string[] }
  | { kind: "most-least-exact" };

export interface PracticeQuestion {
  id: string;
  number: number;
  sourcePage: number;
  passageId?: string;
  responseMode?: "single-choice" | "statement-set" | "ordinal-choice" | "most-least-choice";
  prompt: QuestionBlock[];
  options: PracticeOption[];
  statements?: PracticeStatement[];
  scoring?: PracticeQuestionScoring;
  correctAnswer: string;
  knowledgeTags: string[];
  skillTags: string[];
  reviewStatus: "verified";
  sourceQuestionPath: string;
  sourceAnswerPath: string;
  explanationResourceId?: string;
}

export interface PracticePaperAccess {
  readonly attempt: "public";
  readonly basicResult: "public";
  readonly answerKey: "public";
  readonly workedExplanation: "entitled";
  readonly personalisedInterpretation: "entitled";
  readonly deepReviewPackageId: string;
}

export interface PracticePaper {
  id: string;
  exam: "TMUA" | "ESAT" | "TARA" | "LNAT" | "UCAT";
  edition: string;
  paper?: 1 | 2;
  sectionId?: string;
  sectionLabel?: string;
  sectionLabelZh?: string;
  durationMinutes: number;
  deliveryMode: "structured" | "source-pdf-answer-sheet";
  calculator?: "none" | "basic";
  responseMode?: "choice" | "essay";
  essayTask?: PracticeEssayTask;
  passages?: PracticePassage[];
  questions: PracticeQuestion[];
  access?: PracticePaperAccess;
}

export interface ValidationIssue {
  code: string;
  questionId?: string;
  message: string;
}
