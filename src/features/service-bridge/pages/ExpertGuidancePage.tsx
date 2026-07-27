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
          <p className="eyebrow">EXPERT GUIDANCE · 名师指点</p>
          <h1>High-impact one-to-one coaching for your final 10 hours<small lang="zh-CN">高效一对一，10 小时以内解决最后的冲刺问题</small></h1>
          <p>Bring your curriculum, target programme and latest practice result. We identify whether the bottleneck is knowledge, method or timing, then focus every hour where it matters most.</p>
          <small lang="zh-CN">带上课程体系、目标专业和最近一次练习，老师会先判断真正卡点，再集中解决。</small>
        </div>
        <figure className="expert-guidance-qr">
          <img src="/brand/bingbing-wechat-qr.jpg" alt="Bingbing's WeChat QR code" width="618" height="664" />
          <figcaption>
            <strong>Book your {exam.name} final-sprint plan</strong>
            <span>Send “{exam.name} + curriculum + current progress” to arrange one-to-one coaching.</span>
            <small lang="zh-CN">添加冰冰，发送考试、课程体系与当前进度。</small>
          </figcaption>
          <a href="/brand/bingbing-wechat-qr.jpg" download="冰冰微信二维码.jpg">
            <Download aria-hidden="true" />Save QR code <small lang="zh-CN">保存二维码</small>
          </a>
        </figure>
      </section>

      <section className="expert-guidance-value page-shell" aria-label="What expert guidance includes">
        <article>
          <SearchCheck aria-hidden="true" />
          <span>01</span>
          <h2>Find the real bottleneck<small lang="zh-CN">找准最后卡点</small></h2>
          <p>Use your mistakes and working process to separate missing knowledge, weak method and timing problems.</p>
        </article>
        <article>
          <Target aria-hidden="true" />
          <span>02</span>
          <h2>Build a 10-hour plan<small lang="zh-CN">制定 10 小时方案</small></h2>
          <p>Give every hour a clear knowledge goal, practice task and outcome.</p>
        </article>
        <article>
          <ListChecks aria-hidden="true" />
          <span>03</span>
          <h2>Solve it one to one<small lang="zh-CN">一对一集中解决</small></h2>
          <p>Work directly on the knowledge, method and timing issues with the greatest score impact.</p>
        </article>
      </section>

      <p className="expert-guidance-privacy page-shell">
        <ShieldCheck aria-hidden="true" />
        Adding WeChat never opens your course profile, answers or learning data. Any data access requires separate permission from you.
        <small lang="zh-CN">添加微信不会自动开放课程信息、作答记录或学习数据。</small>
      </p>
    </main>
  );
}
