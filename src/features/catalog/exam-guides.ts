import type { ExamId } from "./exams.js";

export interface ExamGuideMetric {
  readonly label: string;
  readonly value: string;
  readonly detail: string;
}

export interface ExamGuideModule {
  readonly name: string;
  readonly detail: string;
}

export interface ExamGuideLink {
  readonly label: string;
  readonly description: string;
  readonly href: string;
}

export interface ExamGuide {
  readonly examId: Exclude<ExamId, "tmua">;
  readonly eyebrow: string;
  readonly title: string;
  readonly titleEnglish: string;
  readonly introduction: string;
  readonly metrics: readonly ExamGuideMetric[];
  readonly modules: readonly ExamGuideModule[];
  readonly preparationSteps: readonly string[];
  readonly officialLinks: readonly ExamGuideLink[];
}

export const EXAM_GUIDES: Readonly<Record<Exclude<ExamId, "tmua">, ExamGuide>> = {
  esat: {
    examId: "esat",
    eyebrow: "ESAT · 2027 ENTRY",
    title: "先确定模块，再开始准备",
    titleEnglish: "Choose Your Modules First",
    introduction: "Every candidate takes Mathematics 1; most courses require two additional modules. Confirm your combination before mapping coverage and practice.",
    metrics: [
      { label: "AVAILABLE MODULES", value: "5", detail: "Mathematics 1, Biology, Chemistry, Physics, Mathematics 2" },
      { label: "EACH MODULE", value: "27 questions", detail: "All multiple choice" },
      { label: "SEPARATE TIMING", value: "40 minutes", detail: "Most candidates complete three modules" },
    ],
    modules: [
      { name: "Mathematics 1", detail: "所有考生必考；也是其他科学模块默认需要的数学基础。" },
      { name: "Biology", detail: "生命科学知识与陌生情境中的应用。" },
      { name: "Chemistry", detail: "化学概念、定量关系与科学推理。" },
      { name: "Physics", detail: "物理原理、数据解释与问题解决。" },
      { name: "Mathematics 2", detail: "进一步数学内容与更高强度的数学应用。" },
    ],
    preparationSteps: [
      "按大学和专业逐项确认必考模块，避免选择错误组合。",
      "阅读 Content Specification 和对应模块 Guide，标出课程没有覆盖的主题。",
      "先完成 Pearson Specimen，熟悉电脑考试界面和单模块节奏。",
      "再使用 ENGAA、NSAA 历年题按模块训练，并单独记录速度与错误类型。",
    ],
    officialLinks: [
      { label: "ESAT 考试结构", description: "五个模块、选科规则、计时与评分。", href: "https://esat-tmua.ac.uk/about-the-tests/esat-test/" },
      { label: "ESAT Content Specification", description: "2026 年 10 月与 2027 年 1 月考试范围。", href: "https://uat-wp.s3.eu-west-2.amazonaws.com/wp-content/uploads/2024/05/03165424/ESAT_Content_Specification.pdf" },
      { label: "模块 Guide 与历年资料", description: "五个模块 Guide，以及 ENGAA、NSAA 官方归档。", href: "https://esat-tmua.ac.uk/esat-preparation-materials/" },
      { label: "Pearson Specimen 与 Sample", description: "与正式考试相近的交互界面和模块样题。", href: "https://www.pearsonvue.com/us/en/uatuk.html" },
    ],
  },
  tara: {
    examId: "tara",
    eyebrow: "TARA · 2027 ENTRY",
    title: "三部分能力，一次看清",
    titleEnglish: "Reason, Solve, Write",
    introduction: "TARA tests Critical Thinking, Problem Solving and clear written argument. All three sections are required and timed separately.",
    metrics: [
      { label: "REQUIRED SECTIONS", value: "3", detail: "Critical Thinking, Problem Solving, Writing Task" },
      { label: "MULTIPLE CHOICE", value: "22 + 22", detail: "The two sections are scored separately" },
      { label: "EACH SECTION", value: "40 minutes", detail: "Choose one of three writing prompts; maximum 750 words" },
    ],
    modules: [
      { name: "Critical Thinking", detail: "Identify conclusions, assumptions and flaws; evaluate evidence and arguments." },
      { name: "Problem Solving", detail: "Use basic quantitative relationships, diagrams and spatial reasoning in unfamiliar problems." },
      { name: "Writing Task", detail: "Interpret a proposition, address a counterargument and reach a structured judgement." },
    ],
    preparationSteps: [
      "Read the specification and question guide to understand every task type.",
      "Complete the full mocks and establish a three-section, 40-minute rhythm.",
      "Review Critical Thinking and Problem Solving errors by task type.",
      "Use historical TSA material for additional reasoning practice, then train timed writing separately.",
    ],
    officialLinks: [
      { label: "TARA 考试结构", description: "三个必考模块、计时、题量与评分。", href: "https://esat-tmua.ac.uk/about-the-tests/tara/" },
      { label: "TARA Content Specification", description: "2026 年 10 月与 2027 年 1 月适用。", href: "https://uat-wp.s3.eu-west-2.amazonaws.com/wp-content/uploads/2026/06/08142350/TARA_Content_Specification.pdf" },
      { label: "TARA Question Guide", description: "官方题型、例题与解题说明。", href: "https://uat-wp.s3.eu-west-2.amazonaws.com/wp-content/uploads/2026/06/08142344/TARA_Question_Guide.pdf" },
      { label: "TARA 历年准备资料", description: "官方整理的 BMAT Section 1 与 TSA 归档。", href: "https://esat-tmua.ac.uk/tara-preparation-materials/" },
      { label: "Pearson Specimen 与 Sample", description: "Critical Thinking、Problem Solving 与 Writing 的正式界面体验。", href: "https://www.pearsonvue.com/us/en/uatuk.html" },
    ],
  },
  lnat: {
    examId: "lnat",
    eyebrow: "LNAT · 2027 ENTRY",
    title: "阅读论证，再清晰表达",
    titleEnglish: "Read Critically. Argue Clearly.",
    introduction: "LNAT does not test legal knowledge. Section A tests how you understand and evaluate arguments; Section B tests clear written judgement under time pressure.",
    metrics: [
      { label: "SECTION A", value: "42 questions", detail: "12 argumentative passages, 95 minutes" },
      { label: "SECTION B", value: "Choose 1 of 3", detail: "Write one argument in 40 minutes" },
      { label: "SUGGESTED LENGTH", value: "500–600 words", detail: "Recommended maximum: 750 words" },
    ],
    modules: [
      { name: "Section A · Multiple Choice", detail: "Read passages and answer questions on conclusions, assumptions, evidence and argument structure." },
      { name: "Section B · Essay", detail: "Choose one of three prompts, defend a position, address objections and reach a conclusion." },
    ],
    preparationSteps: [
      "Complete one full Section A and identify whether the constraint is reading, retrieval, reasoning or pacing.",
      "Practise by passage set rather than treating every question as an isolated topic.",
      "Build a stable Section B routine for prompt choice, planning, writing and checking.",
      "Keep each essay version, word count and revision trail before seeking deeper feedback.",
    ],
    officialLinks: [
      { label: "LNAT 考试结构", description: "Section A、Section B、计时和作答方式。", href: "https://lnat.ac.uk/what-is-lnat/test-format/" },
      { label: "LNAT 官方练习", description: "在线模拟、两套纸质练习与评分资料。", href: "https://lnat.ac.uk/how-to-prepare/practice-test/" },
      { label: "LNAT 准备建议", description: "官方对阅读和写作准备的说明。", href: "https://lnat.ac.uk/how-to-prepare/" },
    ],
  },
  ucat: {
    examId: "ucat",
    eyebrow: "UCAT · 2026 TEST CYCLE",
    title: "先熟悉题型，再进入模考",
    titleEnglish: "Learn the Test Before You Time It",
    introduction: "UCAT contains four separately timed sections. Learn each interface and task type before moving into complete timed mocks.",
    metrics: [
      { label: "TIMED SECTIONS", value: "4", detail: "Verbal, Decision, Quantitative, Situational Judgement" },
      { label: "STANDARD TEST", value: "About 2 hours", detail: "Each section is timed separately" },
      { label: "COGNITIVE SCORE", value: "900–2700", detail: "SJT is reported separately as Band 1–4" },
    ],
    modules: [
      { name: "Verbal Reasoning", detail: "44 questions, 22 minutes; reason from written passages." },
      { name: "Decision Making", detail: "35 questions, 37 minutes; logic, decisions, data and arguments." },
      { name: "Quantitative Reasoning", detail: "36 questions, 26 minutes; solve quantitative problems from tables and data." },
      { name: "Situational Judgement", detail: "69 questions, 26 minutes; judge important factors and appropriate professional action." },
    ],
    preparationSteps: [
      "Confirm your test cycle, dates and registration requirements.",
      "Learn the calculator, flagging, navigation and keyboard controls.",
      "Work through all four sections before starting complete timed mocks.",
      "Use full mock results to adjust error review and pacing before test day.",
    ],
    officialLinks: [
      { label: "UCAT Essentials 2026", description: "报名、准备、考试日和成绩的完整入口。", href: "https://www.ucat.ac.uk/about-ucat/ucat-essentials/" },
      { label: "考试结构与评分", description: "四个模块的题量、计时与分数解释。", href: "https://www.ucat.ac.uk/about-ucat/test-format-and-scoring/" },
      { label: "官方准备路径", description: "Tour、Tutorials、Question Banks 与 Practice Tests 的推荐顺序。", href: "https://www.ucat.ac.uk/prepare/preparation-resources/" },
      { label: "官方题库与模考", description: "题库、四套标准计时模考、加时与不计时版本。", href: "https://www.ucat.ac.uk/prepare/practice-tests/" },
    ],
  },
};

export function getExamGuide(examId: ExamId): ExamGuide | null {
  if (examId === "tmua") return null;
  return EXAM_GUIDES[examId];
}
