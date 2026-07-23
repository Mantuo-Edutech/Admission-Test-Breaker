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
    introduction: "所有考生都需要 Mathematics 1；大多数课程还要求另外两个模块。先按申请专业确认组合，再检查知识覆盖并安排练习。",
    metrics: [
      { label: "可选模块", value: "5", detail: "Mathematics 1、Biology、Chemistry、Physics、Mathematics 2" },
      { label: "每个模块", value: "27 题", detail: "全部为选择题" },
      { label: "独立计时", value: "40 分钟", detail: "大多数考生完成三个模块" },
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
    introduction: "TARA 不要求特定学科知识，重点是批判思维、问题解决和清晰写作。三部分都必须完成，并分别计时。",
    metrics: [
      { label: "必考模块", value: "3", detail: "Critical Thinking、Problem Solving、Writing Task" },
      { label: "选择题", value: "22 + 22", detail: "两个模块分别计分" },
      { label: "每个模块", value: "40 分钟", detail: "写作从三个题目中选择一个，最多 750 词" },
    ],
    modules: [
      { name: "Critical Thinking", detail: "识别结论、假设与推理错误，评估证据和论证。" },
      { name: "Problem Solving", detail: "使用基础数量关系、图表与空间推理解决陌生问题。" },
      { name: "Writing Task", detail: "解释命题、提出反方论证，并给出有结构的个人判断。" },
    ],
    preparationSteps: [
      "先读 Specification 与 Question Guide，认识所有题型和写作任务。",
      "完成 Pearson 的两个 Practice Tests，建立三段 40 分钟的节奏。",
      "按题型练习 Critical Thinking 与 Problem Solving，并记录推理错误。",
      "使用官方列出的 BMAT Section 1、TSA 资料扩充训练，再单独练习限时写作。",
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
    introduction: "LNAT 不考法律知识。Section A 观察你如何理解和评估论证，Section B 观察你能否在有限时间内形成清晰、有取舍的书面观点。",
    metrics: [
      { label: "Section A", value: "42 题", detail: "12 篇论证材料，95 分钟" },
      { label: "Section B", value: "三选一", detail: "40 分钟完成一篇论证文章" },
      { label: "建议篇幅", value: "500–600 词", detail: "官方建议最多 750 词" },
    ],
    modules: [
      { name: "Section A · Multiple Choice", detail: "文章固定在左侧，题目与选项位于右侧；训练结论、假设、证据和推理结构。" },
      { name: "Section B · Essay", detail: "从三个题目中选择一个，用有限篇幅提出立场、处理反方观点并形成结论。" },
    ],
    preparationSteps: [
      "先完成一次 Section A，记录是读不完、定位慢，还是论证关系判断错误。",
      "按文章组练习，而不是把每道题割裂成独立知识点。",
      "建立 Section B 的审题、列提纲、写作和检查时间分配。",
      "保留每篇作文的版本、字数和修改轨迹，再决定是否需要老师或深度解读。",
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
    introduction: "UCAT 由四个独立计时的模块组成。官方建议先完成界面 Tour 和题型 Tutorials，再做 Question Banks，最后使用计时模考。",
    metrics: [
      { label: "独立模块", value: "4", detail: "Verbal、Decision、Quantitative、Situational Judgement" },
      { label: "标准考试", value: "约 2 小时", detail: "每个模块单独计时，开始后不能暂停" },
      { label: "认知总分", value: "900–2700", detail: "SJT 另报 Band 1–4" },
    ],
    modules: [
      { name: "Verbal Reasoning", detail: "44 题，22 分钟；根据文字材料判断与推理。" },
      { name: "Decision Making", detail: "35 题，37 分钟；逻辑、决策、统计信息与论证。" },
      { name: "Quantitative Reasoning", detail: "36 题，26 分钟；从图表和数据中解决数量问题。" },
      { name: "Situational Judgement", detail: "69 题，26 分钟；判断职业情境中的关键因素和适当行为。" },
    ],
    preparationSteps: [
      "先查看 UCAT Essentials、考试日期和个人报名条件。",
      "完成 Tour Tutorial，熟悉计算器、标记、导航和快捷键。",
      "逐项完成四个 Question Tutorials，再进入官方 Question Banks。",
      "临近考试时完成四套标准计时模考，并根据错题与节奏调整训练。",
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
