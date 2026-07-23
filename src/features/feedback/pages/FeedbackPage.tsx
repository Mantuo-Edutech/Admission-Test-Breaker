import { FormEvent, useEffect, useMemo, useState } from "react";
import { ArrowLeft, CheckCircle2, Clock3, LoaderCircle, MessageSquareWarning, ShieldCheck } from "lucide-react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import type { AppServices } from "../../../app/dependencies.js";
import { BrandMark } from "../../navigation/components/BrandMark.js";
import {
  FEEDBACK_CATEGORIES,
  feedbackReference,
  normalizeFeedbackContext,
  type FeedbackCategory,
  type StudentFeedbackReceipt,
  type StudentFeedbackRecord,
} from "../domain.js";

interface FeedbackPageProps {
  readonly services: AppServices;
}

type AuthState = "loading" | "authenticated" | "unauthenticated" | "unavailable";

const categoryCopy: Readonly<Record<FeedbackCategory, { zh: string; en: string; help: string }>> = {
  content_error: { zh: "题目或讲解有误", en: "Content error", help: "题干、选项、答案、公式、图片或解析问题" },
  technical_problem: { zh: "页面或功能故障", en: "Technical problem", help: "无法打开、保存、提交、计时或显示异常" },
  account_access: { zh: "登录与权限问题", en: "Account & access", help: "注册、登录、邀请码或资料权限异常" },
  privacy_security: { zh: "隐私与安全问题", en: "Privacy & security", help: "怀疑数据越权、泄露或账号安全风险" },
  feature_request: { zh: "功能建议", en: "Feature request", help: "提出新的学习体验或工具建议" },
  other: { zh: "其他问题", en: "Other", help: "不属于以上类别的具体问题" },
};

const statusCopy: Readonly<Record<StudentFeedbackRecord["status"], string>> = {
  new: "已收到",
  triaged: "已分诊",
  in_progress: "处理中",
  resolved: "已解决",
  closed: "已关闭",
};

const priorityCopy: Readonly<Record<StudentFeedbackReceipt["priority"], string>> = {
  P1: "隐私安全优先队列",
  P2: "核心学习流程优先队列",
  P3: "常规问题队列",
  P4: "产品建议队列",
};

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value));
}

export function FeedbackPage({ services }: FeedbackPageProps) {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const context = useMemo(() => normalizeFeedbackContext({
    exam: searchParams.get("exam"),
    route: searchParams.get("from"),
    resource: searchParams.get("resource"),
    question: searchParams.get("question"),
  }), [searchParams]);
  const [authState, setAuthState] = useState<AuthState>("loading");
  const [category, setCategory] = useState<FeedbackCategory>(
    context.questionId === undefined ? "technical_problem" : "content_error",
  );
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [receipt, setReceipt] = useState<StudentFeedbackReceipt | null>(null);
  const [history, setHistory] = useState<readonly StudentFeedbackRecord[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    if (services.accountAccess?.configured !== true || services.feedback?.configured !== true) {
      setAuthState("unavailable");
      return () => { active = false; };
    }
    void services.accountAccess.getAccessState().then((state) => {
      if (!active) return;
      setAuthState(state.session === null ? "unauthenticated" : "authenticated");
      if (state.session !== null) {
        void services.feedback?.listMine().then((records) => {
          if (active) setHistory(records);
        }).catch(() => undefined);
      }
    }).catch(() => {
      if (active) setAuthState("unavailable");
    });
    return () => { active = false; };
  }, [services.accountAccess, services.feedback]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (services.feedback?.configured !== true || submitting) return;
    setError(null);
    if (message.trim().length < 10) {
      setError("请至少用 10 个字描述：发生了什么、你原本希望看到什么。");
      return;
    }
    setSubmitting(true);
    try {
      const nextReceipt = await services.feedback.submit({
        ...context,
        category,
        message: message.trim(),
      });
      setReceipt(nextReceipt);
      setMessage("");
      setHistory(await services.feedback.listMine());
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "反馈暂时没有提交成功，请稍后再试");
    } finally {
      setSubmitting(false);
    }
  }

  const returnTo = context.route === "/feedback" ? "/library" : context.route;
  const loginState = { returnTo: `${location.pathname}${location.search}` };

  return (
    <main className="feedback-page">
      <header className="site-header page-shell">
        <Link className="site-navigation-header__brand" to="/" aria-label="满托考试练习场首页"><BrandMark /></Link>
        <Link className="tmua-hub-page__back" to={returnTo}><ArrowLeft aria-hidden="true" />返回原页面</Link>
      </header>

      <section className="feedback-hero page-shell">
        <div>
          <p className="eyebrow">HELP US FIX IT · 纠错与技术反馈</p>
          <h1>把问题说具体，<br />我们按严重程度处理</h1>
        </div>
        <div className="feedback-context" aria-label="本次反馈上下文">
          <span>系统自动附带</span>
          <strong>{context.examId?.toUpperCase() ?? "网站"}{context.questionId === undefined ? "" : ` · ${context.questionId}`}</strong>
          <small>{context.route}</small>
          <p>不采集设备指纹、浏览历史、邮箱或手机号。</p>
        </div>
      </section>

      {authState === "loading" && (
        <section className="feedback-state page-shell" aria-live="polite">
          <LoaderCircle className="account-spinner" aria-hidden="true" />
          <h2>正在确认你的学习空间…</h2>
        </section>
      )}

      {(authState === "unauthenticated" || authState === "unavailable") && (
        <section className="feedback-access page-shell">
          <div>
            <ShieldCheck aria-hidden="true" />
            <p className="eyebrow">PRIVATE BY DEFAULT</p>
            <h2>{authState === "unauthenticated" ? "登录后提交并追踪处理状态" : "站内反馈暂时无法连接"}</h2>
            <p>{authState === "unauthenticated"
              ? "账号让反馈只对你本人可见；题目作答和学习记录不会被自动附加。"
              : "你仍可把页面与题号告诉冰冰。请不要发送作答记录、密码或其他隐私数据。"}</p>
            {authState === "unauthenticated" && (
              <Link className="button button--primary" to="/login" state={loginState}>登录并继续</Link>
            )}
          </div>
          <figure>
            <img src="/brand/bingbing-wechat-qr.jpg" alt="冰冰老师微信二维码" width="618" height="664" />
            <figcaption>无法登录时，联系冰冰并发送：{context.examId?.toUpperCase() ?? "网站"} {context.questionId ?? context.route}</figcaption>
          </figure>
        </section>
      )}

      {authState === "authenticated" && (
        <>
          <section className="feedback-workspace page-shell">
            <form onSubmit={(event) => void submit(event)} noValidate>
              <div className="feedback-form__heading">
                <MessageSquareWarning aria-hidden="true" />
                <div><p>01 · CATEGORY</p><h2>这是什么问题？</h2></div>
              </div>
              <fieldset className="feedback-category-grid">
                <legend className="sr-only">选择反馈类别</legend>
                {FEEDBACK_CATEGORIES.map((value) => (
                  <label key={value} className={category === value ? "is-selected" : ""}>
                    <input type="radio" name="feedback-category" value={value} checked={category === value} onChange={() => setCategory(value)} />
                    <strong>{categoryCopy[value].zh}</strong>
                    <span>{categoryCopy[value].en}</span>
                    <small>{categoryCopy[value].help}</small>
                  </label>
                ))}
              </fieldset>

              <div className="feedback-form__heading">
                <span>02</span>
                <div><p>DESCRIPTION</p><h2>具体发生了什么？</h2></div>
              </div>
              <label className="feedback-message" htmlFor="feedback-message">
                <span>建议写清：你做了什么 → 实际看到什么 → 原本希望看到什么</span>
                <textarea
                  id="feedback-message"
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  minLength={10}
                  maxLength={2000}
                  rows={7}
                  placeholder={context.questionId === undefined
                    ? "例如：我在提交试卷后返回结果页，页面一直显示加载中；我希望能看到本次得分。"
                    : "例如：这道题的 B 选项公式少了负号；根据题干计算应为……"}
                  required
                />
                <small>{message.length} / 2000 · 请勿填写邮箱、手机号、密码或其他联系方式</small>
              </label>
              {error !== null && <p className="form-error" role="alert">{error}</p>}
              <button className="button button--primary" type="submit" disabled={submitting}>
                {submitting ? "正在提交…" : "提交站内反馈"}
              </button>
            </form>

            <aside className="feedback-routing">
              <p className="eyebrow">ROUTING RULES · 分级规则</p>
              <h2>由规则分级，不消耗 Token</h2>
              <ol>
                <li><strong>P1</strong><span>隐私、安全与疑似越权</span></li>
                <li><strong>P2</strong><span>题目错误、登录权限与核心作答故障</span></li>
                <li><strong>P3</strong><span>一般页面或功能问题</span></li>
                <li><strong>P4</strong><span>产品建议与新需求</span></li>
              </ol>
              <p><ShieldCheck aria-hidden="true" />系统只保存你主动填写的内容和当前页面标识；处理记录可审计，其他学生无法读取。</p>
            </aside>
          </section>

          {receipt !== null && (
            <section className="feedback-receipt page-shell" aria-live="polite">
              <CheckCircle2 aria-hidden="true" />
              <div>
                <p>反馈已经进入 {priorityCopy[receipt.priority]}</p>
                <h2>{feedbackReference(receipt.id)}</h2>
                <span>请保存这个回执号。重复提交同一问题不会创建多个工单。</span>
              </div>
            </section>
          )}

          {history.length > 0 && (
            <section className="feedback-history page-shell" aria-labelledby="feedback-history-title">
              <header><div><p className="eyebrow">YOUR REPORTS</p><h2 id="feedback-history-title">我的最近反馈</h2></div><span>仅你本人可见</span></header>
              <ul>
                {history.map((record) => (
                  <li key={record.id}>
                    <Clock3 aria-hidden="true" />
                    <div>
                      <strong>{feedbackReference(record.id)} · {categoryCopy[record.category].zh}</strong>
                      <span>{record.questionId ?? record.route} · {formatDate(record.createdAt)}</span>
                    </div>
                    <small>{statusCopy[record.status]}</small>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </main>
  );
}
