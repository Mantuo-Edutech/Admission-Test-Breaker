import {
  Download,
  ListChecks,
  SearchCheck,
  ShieldCheck,
  Target,
} from "lucide-react";
import type { ExamId } from "../../catalog/exams.js";
import { EXAM_CATALOG } from "../../catalog/exams.js";
import { SiteHeader } from "../../navigation/components/SiteHeader.js";

export function ExpertGuidancePage({ examId }: { readonly examId: ExamId }) {
  const exam = EXAM_CATALOG.find((entry) => entry.id === examId)!;
  return (
    <main className="expert-guidance-page">
      <SiteHeader examId={examId} />

      <section className="expert-guidance-hero page-shell">
        <div>
          <p className="eyebrow">名师指点 · EXPERT GUIDANCE</p>
          <h1>卡住的题，不必一个人耗下去</h1>
          <p>
            把你的课程体系、目标专业和最近一次练习带来。满托老师会先帮你判断：
            是知识缺口、方法问题，还是时间分配出了问题。
          </p>
        </div>
        <figure className="expert-guidance-qr">
          <img src="/brand/bingbing-wechat-qr.jpg" alt="冰冰老师微信二维码" width="618" height="664" />
          <figcaption>
            <strong>添加冰冰，预约 {exam.name} 备考判断</strong>
            <span>发送「{exam.name} + 课程体系 + 当前进度」</span>
          </figcaption>
          <a href="/brand/bingbing-wechat-qr.jpg" download="冰冰微信二维码.jpg">
            <Download aria-hidden="true" />保存二维码
          </a>
        </figure>
      </section>

      <section className="expert-guidance-value page-shell" aria-label="名师指点内容">
        <article>
          <SearchCheck aria-hidden="true" />
          <span>01</span>
          <h2>看清真正卡点</h2>
          <p>从错题和做题过程判断，是概念没学过、方法没形成，还是考试节奏失控。</p>
        </article>
        <article>
          <Target aria-hidden="true" />
          <span>02</span>
          <h2>给出下一步训练</h2>
          <p>明确下一轮先补什么、练什么、练多久，不再靠重复刷题碰运气。</p>
        </article>
        <article>
          <ListChecks aria-hidden="true" />
          <span>03</span>
          <h2>需要时再安排课程</h2>
          <p>先把问题讲清楚，再判断是否需要系统课程或针对性的老师讲解。</p>
        </article>
      </section>

      <p className="expert-guidance-privacy page-shell">
        <ShieldCheck aria-hidden="true" />
        添加微信不会自动开放你的课程信息、作答记录或学习数据；任何数据查看都需要你另外授权。
      </p>
    </main>
  );
}
