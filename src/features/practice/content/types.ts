export type InlineRun =
  | { kind: "text"; value: string }
  | { kind: "math"; tex: string };

export type QuestionBlock =
  | { kind: "paragraph"; runs: InlineRun[] }
  | { kind: "display-math"; tex: string }
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

export interface PracticeQuestion {
  id: string;
  number: number;
  sourcePage: number;
  prompt: QuestionBlock[];
  options: PracticeOption[];
  correctAnswer: string;
  knowledgeTags: string[];
  skillTags: string[];
  reviewStatus: "verified";
  sourceQuestionPath: string;
  sourceAnswerPath: string;
}

export interface PracticePaper {
  id: string;
  exam: "TMUA";
  edition: string;
  paper: 1 | 2;
  durationMinutes: 75;
  deliveryMode: "structured" | "source-pdf-answer-sheet";
  questions: PracticeQuestion[];
}

export interface ValidationIssue {
  code: string;
  questionId?: string;
  message: string;
}
