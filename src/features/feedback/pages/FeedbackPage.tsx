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
  content_error: { zh: "题目或讲解有误", en: "Content error", help: "Question, option, answer, formula, image or explanation" },
  technical_problem: { zh: "页面或功能故障", en: "Technical problem", help: "Opening, saving, submitting, timing or display failure" },
  account_access: { zh: "登录与权限问题", en: "Account & access", help: "Registration, sign-in, invitation code or content access" },
  privacy_security: { zh: "隐私与安全问题", en: "Privacy & security", help: "Suspected unauthorised access, exposure or account risk" },
  feature_request: { zh: "功能建议", en: "Feature request", help: "A new learning experience or product improvement" },
  other: { zh: "其他问题", en: "Other", help: "A specific issue outside the categories above" },
};

const statusCopy: Readonly<Record<StudentFeedbackRecord["status"], string>> = {
  new: "Received",
  triaged: "Triaged",
  in_progress: "In progress",
  resolved: "Resolved",
  closed: "Closed",
};

const priorityCopy: Readonly<Record<StudentFeedbackReceipt["priority"], string>> = {
  P1: "Privacy and security priority",
  P2: "Core learning-flow priority",
  P3: "Standard issue queue",
  P4: "Product suggestion queue",
};

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en-GB", {
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
      setError("Use at least 10 characters to explain what happened and what you expected.");
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
      setError(reason instanceof Error ? reason.message : "Feedback could not be submitted. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const returnTo = context.route === "/feedback" ? "/library" : context.route;
  const loginState = { returnTo: `${location.pathname}${location.search}` };

  return (
    <main className="feedback-page">
      <header className="site-header page-shell">
        <Link className="site-navigation-header__brand" to="/" aria-label="UK Admission Test Prep home"><BrandMark /></Link>
        <Link className="tmua-hub-page__back" to={returnTo}><ArrowLeft aria-hidden="true" />Back</Link>
      </header>

      <section className="feedback-hero page-shell">
        <div>
          <p className="eyebrow">HELP US FIX IT</p>
          <h1>Tell us exactly what happened<small lang="zh-CN">把问题说具体，我们按严重程度处理</small></h1>
        </div>
        <div className="feedback-context" aria-label="Feedback context">
          <span>Added automatically</span>
          <strong>{context.examId?.toUpperCase() ?? "Website"}{context.questionId === undefined ? "" : ` · ${context.questionId}`}</strong>
          <small>{context.route}</small>
          <p>No device fingerprint, browsing history, email or phone number is attached.</p>
        </div>
      </section>

      {authState === "loading" && (
        <section className="feedback-state page-shell" aria-live="polite">
          <LoaderCircle className="account-spinner" aria-hidden="true" />
          <h2>Checking your learner space…<small lang="zh-CN">正在确认你的学习空间</small></h2>
        </section>
      )}

      {(authState === "unauthenticated" || authState === "unavailable") && (
        <section className="feedback-access page-shell">
          <div>
            <ShieldCheck aria-hidden="true" />
            <p className="eyebrow">PRIVATE BY DEFAULT</p>
            <h2>{authState === "unauthenticated" ? "Sign in to submit and track feedback" : "Feedback is temporarily unavailable"}</h2>
            <p>{authState === "unauthenticated"
              ? "Your account keeps feedback visible only to you. Answers and learning records are not attached automatically."
              : "You can still tell Bingbing the page and question number. Never send answers, passwords or private data."}</p>
            {authState === "unauthenticated" && (
              <Link className="button button--primary" to="/login" state={loginState}>Sign in and continue</Link>
            )}
          </div>
          <figure>
            <img src="/brand/bingbing-wechat-qr.jpg" alt="Bingbing's WeChat QR code" width="618" height="664" />
            <figcaption>If sign-in fails, contact Bingbing with: {context.examId?.toUpperCase() ?? "Website"} {context.questionId ?? context.route}</figcaption>
          </figure>
        </section>
      )}

      {authState === "authenticated" && (
        <>
          <section className="feedback-workspace page-shell">
            <form onSubmit={(event) => void submit(event)} noValidate>
              <div className="feedback-form__heading">
                <MessageSquareWarning aria-hidden="true" />
                <div><p>01 · CATEGORY</p><h2>What kind of issue is this?<small lang="zh-CN">这是什么问题？</small></h2></div>
              </div>
              <fieldset className="feedback-category-grid">
                <legend className="sr-only">Choose a feedback category</legend>
                {FEEDBACK_CATEGORIES.map((value) => (
                  <label key={value} className={category === value ? "is-selected" : ""}>
                    <input type="radio" name="feedback-category" value={value} checked={category === value} onChange={() => setCategory(value)} />
                    <strong>{categoryCopy[value].en}</strong>
                    <span lang="zh-CN">{categoryCopy[value].zh}</span>
                    <small>{categoryCopy[value].help}</small>
                  </label>
                ))}
              </fieldset>

              <div className="feedback-form__heading">
                <span>02</span>
                <div><p>DESCRIPTION</p><h2>What exactly happened?<small lang="zh-CN">具体发生了什么？</small></h2></div>
              </div>
              <label className="feedback-message" htmlFor="feedback-message">
                <span>Include: what you did → what appeared → what you expected</span>
                <textarea
                  id="feedback-message"
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  minLength={10}
                  maxLength={2000}
                  rows={7}
                  placeholder={context.questionId === undefined
                    ? "Example: After submitting the paper, the results page kept loading. I expected to see my score."
                    : "Example: Option B is missing a minus sign. My calculation from the question gives…"}
                  required
                />
                <small>{message.length} / 2000 · Do not include email, phone number, passwords or contact details.</small>
              </label>
              {error !== null && <p className="form-error" role="alert">{error}</p>}
              <button className="button button--primary" type="submit" disabled={submitting}>
                {submitting ? "Submitting…" : "Submit feedback"}
              </button>
            </form>

            <aside className="feedback-routing">
              <p className="eyebrow">ROUTING RULES</p>
              <h2>Rule-based priority, no AI tokens<small lang="zh-CN">由规则分级，不消耗 Token</small></h2>
              <ol>
                <li><strong>P1</strong><span>Privacy, security or suspected unauthorised access</span></li>
                <li><strong>P2</strong><span>Content errors, account access or core practice failure</span></li>
                <li><strong>P3</strong><span>General page or feature problem</span></li>
                <li><strong>P4</strong><span>Product suggestion or new request</span></li>
              </ol>
              <p><ShieldCheck aria-hidden="true" />Only what you type and the current page identifier are stored. Handling is auditable and other students cannot read it.</p>
            </aside>
          </section>

          {receipt !== null && (
            <section className="feedback-receipt page-shell" aria-live="polite">
              <CheckCircle2 aria-hidden="true" />
              <div>
                <p>Feedback received · {priorityCopy[receipt.priority]}</p>
                <h2>{feedbackReference(receipt.id)}</h2>
                <span>Keep this reference. Repeating the same report will not create duplicate tickets.</span>
              </div>
            </section>
          )}

          {history.length > 0 && (
            <section className="feedback-history page-shell" aria-labelledby="feedback-history-title">
              <header><div><p className="eyebrow">YOUR REPORTS</p><h2 id="feedback-history-title">Recent feedback<small lang="zh-CN">我的最近反馈</small></h2></div><span>Visible only to you</span></header>
              <ul>
                {history.map((record) => (
                  <li key={record.id}>
                    <Clock3 aria-hidden="true" />
                    <div>
                      <strong>{feedbackReference(record.id)} · {categoryCopy[record.category].en}</strong>
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
