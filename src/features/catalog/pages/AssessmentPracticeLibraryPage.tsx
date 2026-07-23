import { SiteHeader } from "../../navigation/components/SiteHeader.js";
import type { PracticeExamId } from "../../practice/catalog/assessment-registry.js";
import type { ExamId } from "../exams.js";
import {
  PracticeEntrySection,
  PracticeLibraryHero,
  type PracticeEntry,
} from "../components/PracticeLibrary.js";

type AssessmentPracticeExamId = Extract<PracticeExamId, "tara" | "lnat" | "ucat">;

interface PracticeLibraryConfig {
  readonly facts: readonly string[];
  readonly fullPractice: readonly PracticeEntry[];
  readonly startingPractice: readonly PracticeEntry[];
}

const PRACTICE_LIBRARY_CONFIG: Readonly<Record<AssessmentPracticeExamId, PracticeLibraryConfig>> = {
  tara: {
    facts: ["2 套推理模考", "1 套限时写作", "1 套起点练习"],
    fullPractice: [
      {
        id: "tara-critical-thinking-full-mock-v1",
        to: "/practice/tara-critical-thinking-full-mock-v1",
        kicker: "FULL MOCK",
        title: "Critical Thinking",
        subtitle: "批判思维",
        meta: "22 题 · 40 分钟",
      },
      {
        id: "tara-problem-solving-full-mock-v1",
        to: "/practice/tara-problem-solving-full-mock-v1",
        kicker: "FULL MOCK",
        title: "Problem Solving",
        subtitle: "问题解决",
        meta: "22 题 · 40 分钟",
      },
      {
        id: "tara-writing-task-v1",
        to: "/practice/tara-writing-task-v1",
        kicker: "WRITING TASK",
        title: "Argumentative Writing",
        subtitle: "限时论证写作",
        meta: "三选一 · 40 分钟",
        kind: "writing",
      },
    ],
    startingPractice: [{
      id: "tara-reasoning-starter-v1",
      to: "/practice/tara-reasoning-starter-v1",
      kicker: "STARTER",
      title: "Reasoning Starter",
      subtitle: "批判思维 + 问题解决",
      meta: "10 题",
      kind: "diagnostic",
    }],
  },
  lnat: {
    facts: ["Section A + B", "42 题完整模考", "1 套起点练习"],
    fullPractice: [
      {
        id: "lnat-section-a-full-mock-v1",
        to: "/practice/lnat-section-a-full-mock-v1",
        kicker: "SECTION A · FULL MOCK",
        title: "Multiple Choice",
        subtitle: "12 篇英文材料",
        meta: "42 题 · 95 分钟",
      },
      {
        id: "lnat-section-b-writing-v1",
        to: "/practice/lnat-section-b-writing-v1",
        kicker: "SECTION B · WRITING",
        title: "Essay",
        subtitle: "限时论证写作",
        meta: "三选一 · 40 分钟",
        kind: "writing",
      },
    ],
    startingPractice: [{
      id: "lnat-section-a-starter-v1",
      to: "/practice/lnat-section-a-starter-v1",
      kicker: "SECTION A · STARTER",
      title: "Reading & Reasoning",
      subtitle: "文章阅读与论证推理",
      meta: "3 篇 · 12 题",
      kind: "diagnostic",
    }],
  },
  ucat: {
    facts: ["4 个考试模块", "4 套完整模考", "4 套起点练习"],
    fullPractice: [
      {
        id: "ucat-verbal-reasoning-full-mock-v1",
        to: "/practice/ucat-verbal-reasoning-full-mock-v1",
        kicker: "FULL MOCK",
        title: "Verbal Reasoning",
        subtitle: "文字推理",
        meta: "44 题 · 22 分钟",
      },
      {
        id: "ucat-decision-making-full-mock-v1",
        to: "/practice/ucat-decision-making-full-mock-v1",
        kicker: "FULL MOCK",
        title: "Decision Making",
        subtitle: "决策判断",
        meta: "35 题 · 37 分钟",
      },
      {
        id: "ucat-quantitative-reasoning-full-mock-v1",
        to: "/practice/ucat-quantitative-reasoning-full-mock-v1",
        kicker: "FULL MOCK",
        title: "Quantitative Reasoning",
        subtitle: "数量推理",
        meta: "36 题 · 26 分钟",
      },
      {
        id: "ucat-situational-judgement-full-mock-v1",
        to: "/practice/ucat-situational-judgement-full-mock-v1",
        kicker: "FULL MOCK",
        title: "Situational Judgement",
        subtitle: "情境判断",
        meta: "69 题 · 26 分钟",
      },
    ],
    startingPractice: [
      {
        id: "ucat-verbal-reasoning-starter-v1",
        to: "/practice/ucat-verbal-reasoning-starter-v1",
        kicker: "STARTER",
        title: "Verbal Reasoning",
        subtitle: "文字推理",
        meta: "3 篇 · 12 题",
        kind: "diagnostic",
      },
      {
        id: "ucat-decision-making-starter-v1",
        to: "/practice/ucat-decision-making-starter-v1",
        kicker: "STARTER",
        title: "Decision Making",
        subtitle: "决策判断",
        meta: "8 题",
        kind: "diagnostic",
      },
      {
        id: "ucat-quantitative-reasoning-starter-v1",
        to: "/practice/ucat-quantitative-reasoning-starter-v1",
        kicker: "STARTER",
        title: "Quantitative Reasoning",
        subtitle: "数量推理",
        meta: "4 组数据 · 10 题",
        kind: "diagnostic",
      },
      {
        id: "ucat-situational-judgement-starter-v1",
        to: "/practice/ucat-situational-judgement-starter-v1",
        kicker: "STARTER",
        title: "Situational Judgement",
        subtitle: "情境判断",
        meta: "3 个情境 · 10 题",
        kind: "diagnostic",
      },
    ],
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
        title="选择一套练习"
        titleEn="Choose your practice"
        summary="点击任意卡片，直接进入练习。"
        facts={config.facts}
      />
      <PracticeEntrySection
        eyebrow="FULL PRACTICE"
        title="完整练习"
        titleEn="Full-length practice"
        summary={`${config.fullPractice.length} 套`}
        entries={config.fullPractice}
      />
      <PracticeEntrySection
        eyebrow="START HERE"
        title="起点练习"
        titleEn="Short practice"
        summary={`${config.startingPractice.length} 套`}
        entries={config.startingPractice}
      />
    </main>
  );
}
