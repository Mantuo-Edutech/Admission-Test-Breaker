export type InlineRun =
  | { kind: "text"; value: string }
  | { kind: "math"; tex: string };

export type QuestionBlock =
  | { kind: "paragraph"; runs: InlineRun[] }
  | { kind: "display-math"; tex: string }
  | { kind: "figure"; src: string; alt: string; caption?: string };

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
  id: "tmua-2023-p1";
  exam: "TMUA";
  edition: "2023";
  paper: 1;
  durationMinutes: 75;
  questions: PracticeQuestion[];
}

export interface ValidationIssue {
  code: string;
  questionId?: string;
  message: string;
}
