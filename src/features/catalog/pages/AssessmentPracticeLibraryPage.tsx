import { Calculator, CheckCircle2, Clock3, FileCheck2 } from "lucide-react";
import { Link } from "react-router-dom";
import { SiteHeader } from "../../navigation/components/SiteHeader.js";
import { getAssessmentDefinition, type PracticeExamId } from "../../practice/catalog/assessment-registry.js";
import type { ExamId } from "../exams.js";

interface AssessmentPracticeLibraryPageProps {
  readonly examId: Extract<PracticeExamId, "tara" | "lnat" | "ucat">;
}

const responseCopy = {
  "single-choice": "单项选择",
  "passage-choice": "文章组选择题",
  essay: "限时写作",
  "mixed-choice": "单选与多陈述题",
  "data-choice": "数据材料选择题",
  "partial-credit-choice": "支持部分得分的情境题",
} as const;

export function AssessmentPracticeLibraryPage({ examId }: AssessmentPracticeLibraryPageProps) {
  const assessment = getAssessmentDefinition(examId);

  return (
    <main className="tmua-stage-page assessment-library-page">
      <SiteHeader examId={examId as ExamId} />
      <section className="tmua-stage-hero page-shell">
        <p className="eyebrow">{assessment.name} · ONLINE PRACTICE</p>
        <h1>先看清每个模块怎么考<span>Understand every section before practising</span></h1>
        <p>{examId === "tara"
          ? "两套 22 题完整推理模考与三选一限时写作都可以直接在线完成。"
          : examId === "lnat"
            ? "Section A 的 12 篇、42 题、95 分钟完整模考与 Section B 三选一限时写作都可以直接在线完成。"
            : "Verbal Reasoning、Decision Making、Quantitative Reasoning 与 Situational Judgement 均有独立完整模考，并按各自题型和计分规则运行。"}</p>
      </section>

      {examId === "tara" && (
        <section className="esat-starter-practice page-shell" aria-labelledby="tara-starter-title">
          <div>
            <p>FREE PRACTICE · MANTUO ORIGINAL</p>
            <h2 id="tara-starter-title">先做短诊断，再完成两个完整模块<small>TARA Reasoning Starter & Full-Length Mocks</small></h2>
            <p>10 题短诊断先检查起点；Critical Thinking 与 Problem Solving 再各用 22 题、40 分钟完整训练官方能力类型。全部在本站计时、保存和提交。</p>
          </div>
          <dl>
            <div><dt>原创推理题</dt><dd>54 道</dd></div>
            <div><dt>完整模块</dt><dd>2 套</dd></div>
            <div><dt>模块计时</dt><dd>各 40 分钟</dd></div>
          </dl>
          <div className="esat-starter-practice__modules" aria-label="TARA 在线推理练习">
            <Link to="/practice/tara-reasoning-starter-v1">
              <span>01</span>
              <strong>Reasoning Starter</strong>
              <small>批判思维 + 问题解决 · 10 题</small>
            </Link>
            <Link to="/practice/tara-critical-thinking-full-mock-v1">
              <span>02</span>
              <strong>Critical Thinking</strong>
              <small>完整模考 · 22 题 / 40 分钟</small>
            </Link>
            <Link to="/practice/tara-problem-solving-full-mock-v1">
              <span>03</span>
              <strong>Problem Solving</strong>
              <small>完整模考 · 22 题 / 40 分钟</small>
            </Link>
          </div>
          <p className="esat-starter-practice__boundary">完成后立即查看本卷得分、用时和能力类型表现，再决定从 Critical Thinking 还是 Problem Solving 开始强化。</p>
        </section>
      )}

      {examId === "lnat" && (
        <section className="esat-starter-practice page-shell" aria-labelledby="lnat-starter-title">
          <div>
            <p>FREE PRACTICE · MANTUO ORIGINAL</p>
            <h2 id="lnat-starter-title">先做短诊断，再完成 42 题全卷<small>LNAT Section A Starter & Complete-Structure Mock</small></h2>
            <p>12 题短诊断先熟悉文章推理；完整模考再用 12 篇原创英文论证文本、42 道四选一题和 95 分钟训练正式结构。电脑端左文右题，手机和平板自动转为顺序阅读。</p>
          </div>
          <dl>
            <div><dt>Section A 原创题</dt><dd>54 道</dd></div>
            <div><dt>完整模考</dt><dd>12 篇 · 42 题</dd></div>
            <div><dt>正式结构计时</dt><dd>95 分钟</dd></div>
          </dl>
          <div className="esat-starter-practice__modules" aria-label="LNAT Section A Starter & Complete-Structure Mock">
            <Link to="/practice/lnat-section-a-starter-v1">
              <span>01</span>
              <strong>Section A Starter</strong>
              <small>文章阅读与论证推理 · 3 篇 / 12 题</small>
            </Link>
            <Link to="/practice/lnat-section-a-full-mock-v1">
              <span>02</span>
              <strong>Section A Full Mock</strong>
              <small>完整结构模考 · 12 篇 / 42 题 / 95 分钟</small>
            </Link>
          </div>
          <p className="esat-starter-practice__boundary">完成后查看 42 分制本卷得分、每篇用时和题型表现，再针对结论、推论、证据与语境词义进行复习。</p>
        </section>
      )}

      {examId === "ucat" && (
        <section className="esat-starter-practice page-shell" aria-labelledby="ucat-starter-title">
          <div>
            <p>FREE PRACTICE · MANTUO ORIGINAL</p>
            <h2 id="ucat-starter-title">先体验四个模块，再完成四套全卷<small>Four UCAT Starters & Four Full Mocks</small></h2>
            <p>四套短诊断先帮助你看清题型；四套完整模考再分别按 44、35、36 和 69 题的当前结构训练阅读、决策、数据处理与职业情境判断。</p>
          </div>
          <dl>
            <div><dt>原创题目</dt><dd>224 道</dd></div>
            <div><dt>完整模考</dt><dd>VR · DM · QR · SJT</dd></div>
            <div><dt>完整计时</dt><dd>22 · 37 · 26 · 26 分钟</dd></div>
          </dl>
          <div className="esat-starter-practice__modules" aria-label="UCAT Starters & Full Mocks">
            <Link to="/practice/ucat-verbal-reasoning-starter-v1">
              <span>01</span>
              <strong>Verbal Reasoning Starter</strong>
              <small>文字推理 · 3 篇 / 12 题</small>
            </Link>
            <Link to="/practice/ucat-verbal-reasoning-full-mock-v1">
              <span>02</span>
              <strong>Verbal Reasoning Full Mock</strong>
              <small>完整模考 · 11 篇 / 44 题 / 22 分钟</small>
            </Link>
            <Link to="/practice/ucat-decision-making-starter-v1">
              <span>03</span>
              <strong>Decision Making Starter</strong>
              <small>决策判断 · 8 题 / 最高 10 分</small>
            </Link>
            <Link to="/practice/ucat-decision-making-full-mock-v1">
              <span>04</span>
              <strong>Decision Making Full Mock</strong>
              <small>完整模考 · 35 题 / 37 分钟</small>
            </Link>
            <Link to="/practice/ucat-quantitative-reasoning-starter-v1">
              <span>05</span>
              <strong>Quantitative Reasoning Starter</strong>
              <small>数量推理 · 4 组数据 / 10 题</small>
            </Link>
            <Link to="/practice/ucat-quantitative-reasoning-full-mock-v1">
              <span>06</span>
              <strong>Quantitative Reasoning Full Mock</strong>
              <small>完整模考 · 9 组数据 / 36 题 / 26 分钟</small>
            </Link>
            <Link to="/practice/ucat-situational-judgement-starter-v1">
              <span>07</span>
              <strong>Situational Judgement Starter</strong>
              <small>情境判断 · 3 个情境 / 10 题</small>
            </Link>
            <Link to="/practice/ucat-situational-judgement-full-mock-v1">
              <span>08</span>
              <strong>Situational Judgement Full Mock</strong>
              <small>完整模考 · 21 个情境 / 69 题 / 26 分钟</small>
            </Link>
          </div>
          <p className="esat-starter-practice__boundary">四个模块分别计时和评分，完成后可以比较正确率、做题节奏与题型表现，明确下一轮训练重点。</p>
        </section>
      )}

      <section className="assessment-section-grid page-shell" aria-label={`${assessment.name} 在线练习模块`}>
        {assessment.sections.map((section, index) => (
          <article key={section.id}>
            <header>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <div><p>{section.label}</p><h2>{section.labelZh}</h2></div>
            </header>
            <dl>
              <div><dt><FileCheck2 aria-hidden="true" />完整练习</dt><dd>{section.questionCount} 题</dd></div>
              <div><dt><Clock3 aria-hidden="true" />模块计时</dt><dd>{section.durationMinutes} 分钟</dd></div>
              <div><dt><Calculator aria-hidden="true" />题型工具</dt><dd>{responseCopy[section.responseMode]}{section.calculator === "basic" ? " · 基础计算器" : ""}</dd></div>
            </dl>
            <div className="assessment-section-grid__status">
              <CheckCircle2 aria-hidden="true" />{examId === "tara" && section.id !== "writing-task"
                ? "满托原创 · 22 题完整模考"
                : examId === "tara" && section.id === "writing-task"
                  ? "满托原创 · 限时写作"
                : examId === "lnat" && section.id === "section-a"
                  ? "满托原创 · 42 题完整模考"
                  : examId === "lnat" && section.id === "section-b"
                    ? "满托原创 · Section B 写作"
                    : examId === "ucat" && section.id === "verbal-reasoning"
                    ? "满托原创 · 44 题完整模考"
                    : examId === "ucat" && section.id === "quantitative-reasoning"
                      ? "满托原创 · 36 题完整模考"
                      : examId === "ucat" && section.id === "decision-making"
                        ? "满托原创 · 35 题完整模考"
                        : examId === "ucat" && section.id === "situational-judgement"
                          ? "满托原创 · 69 题完整模考"
                    : "完整模块练习"}
            </div>
            <p className="assessment-section-grid__boundary">
              {examId === "tara"
                ? section.id === "writing-task"
                  ? "3 道满托原创题三选一，40 分钟、上限 750 词；编辑器提供计时、字数统计、私密自动保存和完整提交记录，教师反馈可在学生授权后添加。"
                  : section.id === "critical-thinking"
                    ? "22 道满托原创题、40 分钟、五选一，覆盖识别主结论、推出结论、假设、证据、推理错误、匹配论证与应用原则七类能力；提交后显示本卷得分与分类表现。"
                    : "22 道满托原创题、40 分钟、五选一，覆盖 Relevant Selection、Finding Procedures 与 Identifying Similarity；提交后显示本卷得分与分类表现。"
                : examId === "lnat"
                  ? section.id === "section-b"
                    ? "3 道满托原创题三选一，40 分钟、建议 500–600 词、上限 750 词；编辑器提供计时、字数统计、私密自动保存和完整提交记录。"
                    : "12 篇满托原创英文论证文章、42 道四选一题、95 分钟；覆盖结论、结构、推论、限定、证据、原则、类比与语境词义，提交后显示本卷得分与分类表现。"
                  : examId === "ucat"
                    ? section.id === "verbal-reasoning"
                      ? "11 篇满托原创英文材料、44 道题、22 分钟；每篇 4 题，混合 True / False / Can't Tell 与最佳支持结论，提交后显示本卷得分和每篇用时。"
                      : section.id === "quantitative-reasoning"
                        ? "9 组满托原创数据材料、36 道四选一题、26 分钟；数据表和基础计算器均在本站运行，提交后显示本卷得分和每组用时。"
                      : section.id === "decision-making"
                        ? "35 道满托原创题、37 分钟，含 29 道四选一与 6 组五陈述题；五项全对得 2 分、错一项得 1 分，提交后显示本卷 41 分制得分。"
                        : "21 个满托原创情境、69 道题、26 分钟；含 30 道适当性、30 道重要性与 9 道最合适/最不合适题。等级题按相邻答案部分得分，提交后显示本卷得分与情境表现。"
                    : "完成后显示本卷得分、用时与模块表现。"}
            </p>
            {examId === "tara" && section.id === "critical-thinking" && (
              <div className="assessment-section-grid__actions">
                <Link className="button button--primary" to="/practice/tara-critical-thinking-full-mock-v1">开始 Critical Thinking 完整模考</Link>
              </div>
            )}
            {examId === "tara" && section.id === "problem-solving" && (
              <div className="assessment-section-grid__actions">
                <Link className="button button--primary" to="/practice/tara-problem-solving-full-mock-v1">开始 Problem Solving 完整模考</Link>
              </div>
            )}
            {examId === "tara" && section.id === "writing-task" && (
              <div className="assessment-section-grid__actions">
                <Link className="button button--primary" to="/practice/tara-writing-task-v1">开始限时写作</Link>
              </div>
            )}
            {examId === "lnat" && section.id === "section-a" && (
              <div className="assessment-section-grid__actions">
                <Link className="button button--primary" to="/practice/lnat-section-a-full-mock-v1">开始 Section A 完整模考</Link>
                <Link className="button button--secondary" to="/practice/lnat-section-a-starter-v1">先做 12 题短诊断</Link>
              </div>
            )}
            {examId === "lnat" && section.id === "section-b" && (
              <div className="assessment-section-grid__actions">
                <Link className="button button--primary" to="/practice/lnat-section-b-writing-v1">开始 Section B 写作</Link>
              </div>
            )}
            {examId === "ucat" && section.id === "verbal-reasoning" && (
              <div className="assessment-section-grid__actions">
                <Link className="button button--primary" to="/practice/ucat-verbal-reasoning-full-mock-v1">开始文字推理完整模考</Link>
                <Link className="button button--secondary" to="/practice/ucat-verbal-reasoning-starter-v1">先做 12 题短诊断</Link>
              </div>
            )}
            {examId === "ucat" && section.id === "quantitative-reasoning" && (
              <div className="assessment-section-grid__actions">
                <Link className="button button--primary" to="/practice/ucat-quantitative-reasoning-full-mock-v1">开始数量推理完整模考</Link>
                <Link className="button button--secondary" to="/practice/ucat-quantitative-reasoning-starter-v1">先做 10 题短诊断</Link>
              </div>
            )}
            {examId === "ucat" && section.id === "decision-making" && (
              <div className="assessment-section-grid__actions">
                <Link className="button button--primary" to="/practice/ucat-decision-making-full-mock-v1">开始决策判断完整模考</Link>
                <Link className="button button--secondary" to="/practice/ucat-decision-making-starter-v1">先做 8 题短诊断</Link>
              </div>
            )}
            {examId === "ucat" && section.id === "situational-judgement" && (
              <div className="assessment-section-grid__actions">
                <Link className="button button--primary" to="/practice/ucat-situational-judgement-full-mock-v1">开始情境判断完整模考</Link>
                <Link className="button button--secondary" to="/practice/ucat-situational-judgement-starter-v1">先做 SJT 10 题短诊断</Link>
              </div>
            )}
          </article>
        ))}
      </section>

    </main>
  );
}
