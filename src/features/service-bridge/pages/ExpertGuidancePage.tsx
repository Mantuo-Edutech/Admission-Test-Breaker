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
          <h1>高效一对一，10 小时以内解决最后的冲刺问题</h1>
          <p>
            带上你的课程体系、目标专业和最近一次练习。老师先判断是知识、方法还是时间分配问题，
            再把有限时间集中用在最需要突破的部分。
          </p>
        </div>
        <figure className="expert-guidance-qr">
          <img src="/brand/bingbing-wechat-qr.jpg" alt="冰冰老师微信二维码" width="618" height="664" />
          <figcaption>
            <strong>添加冰冰，预约 {exam.name} 10 小时冲刺</strong>
            <span>发送「{exam.name} + 课程体系 + 当前进度」，获取一对一安排</span>
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
          <h2>找准最后卡点</h2>
          <p>从错题和做题过程判断，是概念没学过、方法没形成，还是考试节奏失控。</p>
        </article>
        <article>
          <Target aria-hidden="true" />
          <span>02</span>
          <h2>制定 10 小时方案</h2>
          <p>明确每一小时补什么、练什么、解决什么，不再靠重复刷题碰运气。</p>
        </article>
        <article>
          <ListChecks aria-hidden="true" />
          <span>03</span>
          <h2>一对一集中解决</h2>
          <p>针对最影响结果的知识、方法和时间分配问题，完成最后阶段的集中突破。</p>
        </article>
      </section>

      <p className="expert-guidance-privacy page-shell">
        <ShieldCheck aria-hidden="true" />
        添加微信不会自动开放你的课程信息、作答记录或学习数据；任何数据查看都需要你另外授权。
      </p>
    </main>
  );
}
