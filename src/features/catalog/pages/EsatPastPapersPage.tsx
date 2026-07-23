import { CheckCircle2, FileCheck2 } from "lucide-react";
import { useMemo } from "react";
import { Link } from "react-router-dom";
import { SiteHeader } from "../../navigation/components/SiteHeader.js";
import { getAssessmentDefinition } from "../../practice/catalog/assessment-registry.js";
import { ESAT_MODULE_LABELS, type EsatModuleId } from "../esat-admissions.js";
import { loadEsatPreparationPlan } from "../esat-plan.js";

const starterByModule: Readonly<Record<EsatModuleId, { readonly paperId: string; readonly focusCount: number }>> = {
  "mathematics-1": { paperId: "esat-mathematics-1-starter-v1", focusCount: 7 },
  "mathematics-2": { paperId: "esat-mathematics-2-starter-v1", focusCount: 8 },
  physics: { paperId: "esat-physics-starter-v1", focusCount: 7 },
  chemistry: { paperId: "esat-chemistry-starter-v1", focusCount: 13 },
  biology: { paperId: "esat-biology-starter-v1", focusCount: 11 },
};

const fullMockByModule: Readonly<Partial<Record<EsatModuleId, {
  readonly paperId: string;
  readonly label: string;
  readonly labelZh: string;
  readonly range: string;
}>>> = {
  "mathematics-1": {
    paperId: "esat-mathematics-1-full-mock-v1",
    label: "Mathematics 1",
    labelZh: "数学 1",
    range: "M1–M7",
  },
  "mathematics-2": {
    paperId: "esat-mathematics-2-full-mock-v1",
    label: "Mathematics 2",
    labelZh: "数学 2",
    range: "MM1–MM8",
  },
  physics: {
    paperId: "esat-physics-full-mock-v1",
    label: "Physics",
    labelZh: "物理",
    range: "P1–P7",
  },
  chemistry: {
    paperId: "esat-chemistry-full-mock-v1",
    label: "Chemistry",
    labelZh: "化学",
    range: "C1–C17",
  },
  biology: {
    paperId: "esat-biology-full-mock-v1",
    label: "Biology",
    labelZh: "生物",
    range: "B1–B11",
  },
};

export function EsatPastPapersPage() {
  const plan = useMemo(() => loadEsatPreparationPlan(globalThis.localStorage), []);
  const assessment = getAssessmentDefinition("esat");
  const sections = plan === null
    ? assessment.sections
    : plan.moduleIds.map((moduleId) => assessment.sections.find((section) => section.id === moduleId)!).filter(Boolean);
  const fullMocks = sections.flatMap((section) => {
    const mock = fullMockByModule[section.id as EsatModuleId];
    return mock === undefined ? [] : [mock];
  });

  return (
    <main className="tmua-stage-page esat-stage-page assessment-library-page">
      <SiteHeader examId="esat" />
      <section className="tmua-stage-hero page-shell">
        <p className="eyebrow">ESAT · MODULE PRACTICE & FULL MOCK</p>
        <h1>只练你申请专业真正需要的模块<span>Practise only the modules required by your degree choices</span></h1>
        <p>
          {plan === null
            ? "先选择申请专业，系统会确定模块，再开放对应的在线短诊断。"
            : `已根据专业保留：${plan.moduleIds.map((id) => ESAT_MODULE_LABELS[id]).join(" · ")}`}
        </p>
      </section>

      {plan === null ? (
        <div className="tmua-stage-actions page-shell">
          <Link className="button button--primary" to="/exams/esat">选择学校和专业</Link>
        </div>
      ) : (
        <>
          {fullMocks.length > 0 ? (
            <section className="esat-full-mock-callout page-shell" aria-labelledby="esat-full-mock-title">
              <div>
                <p>完整模拟卷 · YOUR REQUIRED MODULES</p>
                <h2 id="esat-full-mock-title">用完整模考校准每个模块的做题节奏<small>Calibrate each required module with a full mock</small></h2>
                <p>每套 27 道满托原创题，计时 40 分钟，不使用计算器。提交后查看本卷得分、每题答案、知识标签和时间分配。</p>
              </div>
              <dl>
                <div><dt>完整模考</dt><dd>{fullMocks.length} 套</dd></div>
                <div><dt>每套题量</dt><dd>27 道</dd></div>
                <div><dt>每套计时</dt><dd>40 分钟</dd></div>
              </dl>
              <div className="esat-full-mock-callout__papers" aria-label="你的 ESAT 完整模考">
                {fullMocks.map((mock, index) => (
                  <Link key={mock.paperId} to={`/practice/${mock.paperId}`}>
                    <span>{String(index + 1).padStart(2, "0")}</span>
                    <strong>{mock.label}</strong>
                    <small>{mock.labelZh} · 27 题 · 40 分钟 · {mock.range}</small>
                    <em>开始完整模考 →</em>
                  </Link>
                ))}
              </div>
              <p className="esat-full-mock-callout__boundary">建议先完整计时作答，再根据知识标签和每题用时安排下一轮复习。</p>
            </section>
          ) : null}

          <section className="esat-starter-practice page-shell" aria-labelledby="esat-starter-title">
            <div>
              <p>免费模块诊断 · FIVE MODULES</p>
              <h2 id="esat-starter-title">再用短诊断逐模块检查缺口<small>Use short diagnostics to inspect each selected module</small></h2>
              <p>每个模块 10 道满托原创题、建议 20 分钟。系统保存作答、改答和活跃用时；提交后立即给出正确答案、分数与知识标签。</p>
            </div>
            <dl>
              <div><dt>你的模块</dt><dd>{sections.length} 个</dd></div>
              <div><dt>可练题目</dt><dd>{sections.length * 10} 道</dd></div>
              <div><dt>单模块建议</dt><dd>20 分钟</dd></div>
            </dl>
            <div className="esat-starter-practice__modules" aria-label="你的 ESAT 在线短诊断">
              {sections.map((section, index) => {
                const starter = starterByModule[section.id as EsatModuleId];
                return (
                  <Link key={section.id} to={`/practice/${starter.paperId}`}>
                    <span>{String(index + 1).padStart(2, "0")}</span>
                    <strong>{section.label}</strong>
                    <small>{section.labelZh} · 10 题 · {starter.focusCount} 个重点范围</small>
                  </Link>
                );
              })}
            </div>
            <p className="esat-starter-practice__boundary">短诊断用于快速发现知识缺口；完整模考用于检查 40 分钟内的正确率与做题节奏。</p>
          </section>

          <section className="assessment-section-grid page-shell" aria-label="与你申请相关的 ESAT 模块练习">
            {sections.map((section, index) => (
              <article key={section.id}>
                <header>
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <div><p>{section.label}</p><h2>{section.labelZh}</h2></div>
                </header>
                <dl>
                  <div><dt><FileCheck2 aria-hidden="true" />知识范围</dt><dd>{starterByModule[section.id as EsatModuleId].focusCount} 个重点</dd></div>
                </dl>
                <div className="assessment-section-grid__status">
                  <CheckCircle2 aria-hidden="true" />
                  {fullMockByModule[section.id as EsatModuleId] === undefined
                    ? "10 道模块诊断题"
                    : "10 道模块诊断题 + 27 道完整模考"}
                </div>
                <p className="assessment-section-grid__boundary">
                  免费完成题目、计时与基础结果；Review Notes 和逐题深度解析通过邀请码解锁。
                </p>
                <div className="assessment-section-grid__actions">
                  <Link className="button button--primary" to={`/practice/${starterByModule[section.id as EsatModuleId].paperId}`}>开始这个模块</Link>
                  <Link className="tmua-notes-inline-link" to="/exams/esat/coverage">查看具体知识缺口 →</Link>
                </div>
              </article>
            ))}
          </section>
        </>
      )}

    </main>
  );
}
