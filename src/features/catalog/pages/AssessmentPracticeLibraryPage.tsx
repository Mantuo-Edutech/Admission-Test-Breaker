import { SiteHeader } from "../../navigation/components/SiteHeader.js";
import type { PracticeExamId } from "../../practice/catalog/assessment-registry.js";
import { publicHistoricPracticeForExam } from "../../practice/content/historic-practice-catalog.js";
import type { ExamId } from "../exams.js";
import {
  PracticeEntrySection,
  PracticeLibraryHero,
  type PracticeEntry,
} from "../components/PracticeLibrary.js";

type AssessmentPracticeExamId = Extract<PracticeExamId, "tara" | "lnat" | "ucat">;

interface PracticeLibraryConfig {
  readonly facts: readonly string[];
  readonly fullMocks: readonly PracticeEntry[];
  readonly historicalPapers: readonly PracticeEntry[];
}

const taraPastPaperEntries: readonly PracticeEntry[] = publicHistoricPracticeForExam("tara").map((entry) => ({
  id: entry.paperId,
  to: entry.route,
  kicker: `HISTORICAL PAPER · ${entry.year}`,
  title: `TSA ${entry.year}`,
  subtitle: "Critical Thinking and Problem Solving",
  subtitleZh: "批判思维与问题解决",
  meta: `${entry.questionCount} questions · ${entry.durationMinutes} minutes`,
  ariaLabel: `TSA ${entry.year}, Critical Thinking and Problem Solving, ${entry.questionCount} questions. Start.`,
}));

const PRACTICE_LIBRARY_CONFIG: Readonly<Record<AssessmentPracticeExamId, PracticeLibraryConfig>> = {
  tara: {
    facts: ["3 full mocks", "4 historical papers", "All online"],
    fullMocks: [
      {
        id: "tara-critical-thinking-full-mock-v1",
        to: "/practice/tara-critical-thinking-full-mock-v1",
        kicker: "FULL MOCK",
        title: "Critical Thinking",
        subtitle: "Argument analysis and evaluation",
        subtitleZh: "批判思维",
        meta: "22 questions · 40 minutes",
      },
      {
        id: "tara-problem-solving-full-mock-v1",
        to: "/practice/tara-problem-solving-full-mock-v1",
        kicker: "FULL MOCK",
        title: "Problem Solving",
        subtitle: "Logic, constraints and quantitative reasoning",
        subtitleZh: "问题解决",
        meta: "22 questions · 40 minutes",
      },
      {
        id: "tara-writing-task-v1",
        to: "/practice/tara-writing-task-v1",
        kicker: "FULL MOCK · WRITING TASK",
        title: "Argumentative Writing",
        subtitle: "Timed argumentative writing",
        subtitleZh: "限时论证写作",
        meta: "Choose 1 of 3 · 40 minutes",
        kind: "writing",
      },
    ],
    historicalPapers: taraPastPaperEntries,
  },
  lnat: {
    facts: ["Section A and Section B", "2 full mocks", "All online"],
    fullMocks: [
      {
        id: "lnat-section-a-full-mock-v1",
        to: "/practice/lnat-section-a-full-mock-v1",
        kicker: "SECTION A · FULL MOCK",
        title: "Multiple Choice",
        subtitle: "Reading and reasoning in English",
        subtitleZh: "英文材料阅读与推理",
        meta: "42 questions · 95 minutes",
      },
      {
        id: "lnat-section-b-writing-v1",
        to: "/practice/lnat-section-b-writing-v1",
        kicker: "SECTION B · FULL MOCK",
        title: "Essay",
        subtitle: "Timed argumentative writing",
        subtitleZh: "限时论证写作",
        meta: "Choose 1 of 3 · 40 minutes",
        kind: "writing",
      },
    ],
    historicalPapers: [],
  },
  ucat: {
    facts: ["4 test sections", "4 full mocks", "All online"],
    fullMocks: [
      {
        id: "ucat-verbal-reasoning-full-mock-v1",
        to: "/practice/ucat-verbal-reasoning-full-mock-v1",
        kicker: "FULL MOCK",
        title: "Verbal Reasoning",
        subtitle: "Reading and evidence-based inference",
        subtitleZh: "文字推理",
        meta: "44 questions · 22 minutes",
      },
      {
        id: "ucat-decision-making-full-mock-v1",
        to: "/practice/ucat-decision-making-full-mock-v1",
        kicker: "FULL MOCK",
        title: "Decision Making",
        subtitle: "Logic, probability and argument judgement",
        subtitleZh: "决策判断",
        meta: "35 questions · 37 minutes",
      },
      {
        id: "ucat-quantitative-reasoning-full-mock-v1",
        to: "/practice/ucat-quantitative-reasoning-full-mock-v1",
        kicker: "FULL MOCK",
        title: "Quantitative Reasoning",
        subtitle: "Applied numerical reasoning",
        subtitleZh: "数量推理",
        meta: "36 questions · 26 minutes",
      },
      {
        id: "ucat-situational-judgement-full-mock-v1",
        to: "/practice/ucat-situational-judgement-full-mock-v1",
        kicker: "FULL MOCK",
        title: "Situational Judgement",
        subtitle: "Professional judgement in clinical contexts",
        subtitleZh: "情境判断",
        meta: "69 questions · 26 minutes",
      },
    ],
    historicalPapers: [],
  },
};

export function AssessmentPracticeLibraryPage({ examId }: { readonly examId: AssessmentPracticeExamId }) {
  const config = PRACTICE_LIBRARY_CONFIG[examId];
  const exam = examId.toUpperCase();

  return (
    <main className="tmua-stage-page assessment-library-page">
      <SiteHeader examId={examId as ExamId} />
      <PracticeLibraryHero
        exam={exam}
        title="Choose a full paper"
        titleZh="选择完整试卷"
        summary="Open a paper and start from Question 1. Your answers and time are saved online."
        summaryZh="选择试卷后直接进入第 1 题。"
        facts={config.facts}
      />
      <PracticeEntrySection
        eyebrow="FULL MOCKS"
        title="Full Mocks"
        titleZh="完整模考"
        summary={`${config.fullMocks.length} complete ${config.fullMocks.length === 1 ? "paper" : "papers"}`}
        entries={config.fullMocks}
      />
      {config.historicalPapers.length === 0 ? null : (
        <PracticeEntrySection
          eyebrow="HISTORICAL PAPERS"
          title="Historical Papers"
          titleZh="历年试卷"
          summary={`${config.historicalPapers.length} complete papers`}
          entries={config.historicalPapers}
        />
      )}
    </main>
  );
}
