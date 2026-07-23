import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Bookmark, ChevronLeft, ChevronRight } from "lucide-react";
import type { AppServices } from "../../../app/dependencies.js";
import { practicePaperPresentation } from "../content/practice-paper-presentation.js";
import {
  sessionContentMatchesPaper,
} from "../content/published-revisions.js";
import type { DeliveredPracticePaper } from "../delivery/domain.js";
import { ExamHeader } from "../components/ExamHeader.js";
import { EssayPracticeEditor } from "../components/EssayPracticeEditor.js";
import { MobileQuestionMap, QuestionMap } from "../components/QuestionMap.js";
import { QuestionCard } from "../components/QuestionCard.js";
import { StatementSetQuestionCard } from "../components/StatementSetQuestionCard.js";
import { MostLeastQuestionCard } from "../components/MostLeastQuestionCard.js";
import { SubmissionDialog } from "../components/SubmissionDialog.js";
import { BasicCalculator } from "../components/BasicCalculator.js";
import { practiceSessionReducer } from "../domain/reducer.js";
import { practiceQuestionIsComplete } from "../domain/question-response.js";
import {
  createPracticeSession,
  questionIdForNumber,
  type PracticeSession,
} from "../domain/session.js";
import { remainingTimeMs } from "../domain/timer.js";
import type { SessionSaveResult } from "../storage/store.js";
import { buildFeedbackHref, normalizeFeedbackContext } from "../../feedback/domain.js";

interface PracticePageProps {
  services: AppServices;
  paper: DeliveredPracticePaper | null;
}

type PracticeLoadState =
  | { kind: "loading" }
  | { kind: "missing" }
  | { kind: "ready"; session: PracticeSession };

export function PracticePage({ services, paper }: PracticePageProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const requestedPaper = paper;
  const presentation = requestedPaper === null ? null : practicePaperPresentation(requestedPaper);
  const [loadState, setLoadState] = useState<PracticeLoadState>({ kind: "loading" });
  const [clockMs, setClockMs] = useState(() => services.now().getTime());
  const [submissionOpen, setSubmissionOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [persistenceWarning, setPersistenceWarning] = useState(
    Boolean((location.state as { recoveryWarning?: boolean } | null)?.recoveryWarning),
  );
  const [persistenceIssue, setPersistenceIssue] = useState<"unavailable" | "conflict">("unavailable");
  const [saving, setSaving] = useState(false);
  const latestSaveAttempt = useRef(0);
  const saveQueue = useRef<Promise<void>>(Promise.resolve());
  const [persistenceScope, setPersistenceScope] = useState<
    "device" | "account" | "memory"
  >("device");

  const applyPersistenceResult = useCallback((result: SessionSaveResult) => {
    if (result.persisted) {
      setPersistenceWarning(false);
      setPersistenceScope(result.scope ?? (result.durable ? "account" : "device"));
      return;
    }
    setPersistenceWarning(true);
    setPersistenceIssue(result.issue ?? "unavailable");
    setPersistenceScope("memory");
  }, []);

  const persistSession = useCallback((value: PracticeSession): Promise<SessionSaveResult> => {
    const attempt = latestSaveAttempt.current + 1;
    latestSaveAttempt.current = attempt;
    setSaving(true);
    const queued = saveQueue.current.then(async () => {
      try {
        return await services.store.save(value);
      } catch {
        return {
          persisted: false,
          durable: false,
          issue: "unavailable",
          scope: "memory",
        } satisfies SessionSaveResult;
      }
    });
    saveQueue.current = queued.then(() => undefined);
    return queued.then((result) => {
      if (latestSaveAttempt.current === attempt) {
        setSaving(false);
        applyPersistenceResult(result);
      }
      return result;
    });
  }, [applyPersistenceResult, services.store]);

  useEffect(() => {
    let active = true;
    void (async () => {
      const result = await services.store.loadCurrent();
      if (!active) return;
      setPersistenceScope(result.scope ?? (result.issue === "unavailable" ? "memory" : "device"));
      if (result.issue === "unavailable") setPersistenceWarning(true);
      if (requestedPaper === null) {
        setLoadState({ kind: "missing" });
        return;
      }
      if (
        result.session?.paperId === requestedPaper.id &&
        sessionContentMatchesPaper(result.session, requestedPaper) &&
        result.session.status === "active"
      ) {
        setLoadState({ kind: "ready", session: result.session });
        return;
      }

      const guestSpace = await services.guestSpaceStore.loadOrCreate();
      if (!active) return;
      const session = createPracticeSession({
        id: services.ids.sessionId(),
        learningSpaceId: guestSpace.id,
        actor: { kind: "guest", actorId: guestSpace.ownerActorId },
        paperId: requestedPaper.id,
        contentRef: requestedPaper.contentRef,
        durationMinutes: requestedPaper.durationMinutes,
        startedAt: services.now().toISOString(),
        eventId: services.ids.eventId(),
      });
      const saved = await persistSession(session);
      if (!active) return;
      applyPersistenceResult(saved);
      setLoadState({ kind: "ready", session });
      void services.funnel?.track({
        eventType: "practice_started",
        examId: presentation!.examId,
        contextCode: requestedPaper.id,
      });
    })();
    return () => {
      active = false;
    };
  }, [persistSession, requestedPaper, services]);

  useEffect(() => {
    const timer = globalThis.setInterval(
      () => setClockMs(services.now().getTime()),
      1_000,
    );
    return () => globalThis.clearInterval(timer);
  }, [services]);

  const session = loadState.kind === "ready" ? loadState.session : null;
  const remainingMs = session === null
    ? 0
    : remainingTimeMs(session.deadlineAt, clockMs);

  useEffect(() => {
    if (session === null || session.status !== "active" || remainingMs > 0) {
      return;
    }
    const at = services.now().toISOString();
    const expired = practiceSessionReducer(session, {
      type: "expire",
      eventId: services.ids.eventId(),
      timeEventId: services.ids.eventId(),
      at,
    });
    setLoadState({ kind: "ready", session: expired });
    void persistSession(expired).then((result) => {
      if (result.persisted && presentation !== null) {
        void services.funnel?.track({
          eventType: "practice_completed",
          examId: presentation.examId,
          contextCode: expired.paperId,
        });
      }
      navigate(`/results/${expired.id}`, {
        replace: true,
        state: result.persisted ? undefined : { recoveryWarning: true },
      });
    });
  }, [navigate, persistSession, remainingMs, services, session]);

  const updateSession = useCallback(
    (transform: (current: PracticeSession) => PracticeSession) => {
      setLoadState((current) => {
        if (current.kind !== "ready") return current;
        const next = transform(current.session);
        if (next === current.session) return current;
        void persistSession(next);
        return { kind: "ready", session: next };
      });
    },
    [persistSession],
  );

  useEffect(() => {
    function pause(reason: "visibility_hidden" | "pagehide") {
      updateSession((current) =>
        practiceSessionReducer(current, {
          type: "pause",
          eventId: services.ids.eventId(),
          timeEventId: services.ids.eventId(),
          at: services.now().toISOString(),
          reason,
        }),
      );
    }

    function resume() {
      updateSession((current) =>
        practiceSessionReducer(current, {
          type: "resume",
          eventId: services.ids.eventId(),
          at: services.now().toISOString(),
          reason: "visibility_visible",
        }),
      );
    }

    function onVisibilityChange() {
      if (document.visibilityState === "hidden") {
        pause("visibility_hidden");
      } else {
        resume();
      }
    }

    function onPageHide() {
      pause("pagehide");
    }

    document.addEventListener("visibilitychange", onVisibilityChange);
    globalThis.addEventListener("pagehide", onPageHide);
    onVisibilityChange();
    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      globalThis.removeEventListener("pagehide", onPageHide);
    };
  }, [services.ids, services.now, session?.id, updateSession]);

  function selectAnswer(answer: string) {
    if (session === null) return;
    updateSession((current) =>
      practiceSessionReducer(current, {
        type: "answer",
        eventId: services.ids.eventId(),
        questionId: questionIdForNumber(current.currentQuestion, current.paperId),
        answer,
        at: services.now().toISOString(),
      }),
    );
  }

  function updateEssayDraft(answer: string) {
    if (session === null || currentQuestion === null) return;
    setLoadState((current) => current.kind !== "ready"
      ? current
      : {
          kind: "ready",
          session: {
            ...current.session,
            answers: { ...current.session.answers, [currentQuestion.id]: answer },
          },
        });
  }

  function toggleMark() {
    updateSession((current) =>
      practiceSessionReducer(current, {
        type: "toggle-mark",
        eventId: services.ids.eventId(),
        questionId: questionIdForNumber(current.currentQuestion, current.paperId),
        at: services.now().toISOString(),
      }),
    );
  }

  function goToQuestion(questionNumber: number) {
    updateSession((current) =>
      practiceSessionReducer(current, {
        type: "view",
        eventId: services.ids.eventId(),
        timeEventId: services.ids.eventId(),
        questionNumber,
        at: services.now().toISOString(),
      }),
    );
  }

  function openSubmission() {
    setSubmitError(null);
    setSubmissionOpen(true);
    updateSession((current) =>
      practiceSessionReducer(current, {
        type: "open-submission",
        eventId: services.ids.eventId(),
        at: services.now().toISOString(),
        totalQuestions: requestedPaper?.questions.length ?? 0,
        answeredCount,
      }),
    );
  }

  async function confirmSubmission() {
    if (session === null || submitting) return;
    setSubmitting(true);
    const finalized = practiceSessionReducer(session, {
      type: "submit",
      eventId: services.ids.eventId(),
      timeEventId: services.ids.eventId(),
      at: services.now().toISOString(),
      reason: "student",
    });
    const result = await persistSession(finalized);
    if (!result.persisted) {
      setSubmitError(result.issue === "conflict"
        ? "云端已有更新的练习记录。请刷新页面确认最新内容后再提交。"
        : "提交尚未保存。答案仍保留在当前页面，请检查网络后重新保存并提交。");
      setSubmitting(false);
      return;
    }
    setLoadState({ kind: "ready", session: finalized });
    if (presentation !== null) {
      void services.funnel?.track({
        eventType: "practice_completed",
        examId: presentation.examId,
        contextCode: finalized.paperId,
      });
    }
    navigate(`/results/${finalized.id}`);
  }

  const currentQuestion = useMemo(
    () =>
      session === null
        ? null
        : requestedPaper?.questions[session.currentQuestion - 1] ?? null,
    [requestedPaper, session],
  );
  const currentPassage = useMemo(
    () => currentQuestion?.passageId === undefined
      ? undefined
      : requestedPaper?.passages?.find((passage) => passage.id === currentQuestion.passageId),
    [currentQuestion, requestedPaper],
  );

  useEffect(() => {
    if (
      requestedPaper?.responseMode !== "essay" ||
      session === null ||
      session.status !== "active" ||
      submitting
    ) return;
    const timer = globalThis.setTimeout(() => {
      void persistSession(session);
    }, 900);
    return () => globalThis.clearTimeout(timer);
  }, [persistSession, requestedPaper?.responseMode, session, submitting]);

  useEffect(() => {
    if (!persistenceWarning || session === null) return;
    const retryWhenOnline = () => {
      void persistSession(session);
    };
    globalThis.addEventListener("online", retryWhenOnline);
    return () => globalThis.removeEventListener("online", retryWhenOnline);
  }, [persistenceWarning, persistSession, session]);

  if (loadState.kind === "loading") {
    return (
      <main className="practice-state-page">
        <p className="eyebrow">PREPARING YOUR DESK</p>
        <h1>正在铺开试卷…</h1>
      </main>
    );
  }

  if (loadState.kind === "missing" || requestedPaper === null || session === null || currentQuestion === null) {
    return (
      <main className="practice-state-page">
        <p className="eyebrow">PAPER NOT FOUND</p>
        <h1>没有找到这套试卷</h1>
        <p>请从历年真题目录重新选择一套试卷。</p>
        <Link className="button button--primary" to={presentation?.backHref ?? "/"}>返回练习目录</Link>
      </main>
    );
  }

  const answeredQuestionIds = new Set(requestedPaper.questions
    .filter((question) => practiceQuestionIsComplete(requestedPaper, question, session.answers[question.id]))
    .map((question) => question.id));
  const answeredCount = answeredQuestionIds.size;
  const currentQuestionId = currentQuestion.id;
  const isMarked = session.markedQuestionIds.includes(currentQuestionId);
  const totalQuestions = requestedPaper.questions.length;
  const sectionLabel = presentation?.subtitle ?? "Practice";

  return (
    <div className="practice-page">
      <ExamHeader
        examName={requestedPaper.exam}
        answeredCount={answeredCount}
        edition={requestedPaper?.edition ?? ""}
        sectionLabel={sectionLabel}
        totalQuestions={totalQuestions}
        remainingMs={remainingMs}
        responseMode={requestedPaper.responseMode}
        mobileMap={
          <MobileQuestionMap session={session} totalQuestions={totalQuestions} answeredQuestionIds={answeredQuestionIds} onSelect={goToQuestion} />
        }
        onSubmit={openSubmission}
      />

      {persistenceWarning && (
        <div className="persistence-warning" role="alert">
          <span>
            {persistenceIssue === "conflict"
              ? "云端已有更新的练习记录，请刷新页面确认最新内容。"
              : "尚未保存：本次练习仍可继续，但刷新或关闭页面后可能无法恢复。"}
          </span>
          {persistenceIssue !== "conflict" && (
            <button
              type="button"
              disabled={saving}
              onClick={() => void persistSession(session)}
            >
              {saving ? "正在保存…" : "重新保存"}
            </button>
          )}
        </div>
      )}

      <main className={`exam-layout${requestedPaper.responseMode === "essay" ? " exam-layout--essay" : ""}`}>
        <section className="exam-workspace">
          {requestedPaper.calculator === "basic" && <BasicCalculator />}
          {requestedPaper.responseMode === "essay" && requestedPaper.essayTask !== undefined ? (
            <EssayPracticeEditor
              task={requestedPaper.essayTask}
              value={session.answers[currentQuestionId]}
              onChange={updateEssayDraft}
            />
          ) : (
            <>
              {currentQuestion.responseMode === "most-least-choice" ? (
                <MostLeastQuestionCard
                  question={currentQuestion}
                  passage={currentPassage}
                  examName={requestedPaper.exam}
                  sectionLabel={sectionLabel}
                  selectedAnswer={session.answers[currentQuestionId] ?? null}
                  feedbackHref={buildFeedbackHref(normalizeFeedbackContext({
                    exam: requestedPaper.exam.toLowerCase(),
                    route: `/practice/${requestedPaper.id}`,
                    resource: requestedPaper.id,
                    question: currentQuestion.id,
                  }))}
                  onAnswer={selectAnswer}
                />
              ) : currentQuestion.responseMode === "statement-set" ? (
                <StatementSetQuestionCard
                  question={currentQuestion}
                  passage={currentPassage}
                  examName={requestedPaper.exam}
                  sectionLabel={sectionLabel}
                  selectedAnswer={session.answers[currentQuestionId] ?? null}
                  feedbackHref={buildFeedbackHref(normalizeFeedbackContext({
                    exam: requestedPaper.exam.toLowerCase(),
                    route: `/practice/${requestedPaper.id}`,
                    resource: requestedPaper.id,
                    question: currentQuestion.id,
                  }))}
                  onAnswer={selectAnswer}
                />
              ) : (
                <QuestionCard
                  question={currentQuestion}
                  passage={currentPassage}
                  examName={requestedPaper.exam}
                  sectionLabel={sectionLabel}
                  selectedAnswer={session.answers[currentQuestionId] ?? null}
                  feedbackHref={buildFeedbackHref(normalizeFeedbackContext({
                    exam: requestedPaper.exam.toLowerCase(),
                    route: `/practice/${requestedPaper.id}`,
                    resource: requestedPaper.id,
                    question: currentQuestion.id,
                  }))}
                  onAnswer={selectAnswer}
                />
              )}

              <div className="question-actions">
                <button
                  className={`mark-button${isMarked ? " is-marked" : ""}`}
                  type="button"
                  onClick={toggleMark}
                >
                  <Bookmark aria-hidden="true" />
                  {isMarked ? "取消标记" : "标记本题"}
                </button>
                <div className="question-actions__nav">
                  <button
                    className="button button--secondary"
                    type="button"
                    disabled={session.currentQuestion === 1}
                    onClick={() => goToQuestion(session.currentQuestion - 1)}
                  >
                    <ChevronLeft aria-hidden="true" />上一题
                  </button>
                  <button
                    className="button button--primary"
                    type="button"
                    disabled={session.currentQuestion === totalQuestions}
                    onClick={() => goToQuestion(session.currentQuestion + 1)}
                  >
                    下一题<ChevronRight aria-hidden="true" />
                  </button>
                </div>
              </div>
            </>
          )}
        </section>

        {requestedPaper.responseMode !== "essay" && <aside className="exam-sidebar">
          <div className="exam-sidebar__heading">
            <div>
              <p>QUESTION MAP</p>
              <h2>题目导航</h2>
            </div>
            <span>{answeredCount}/{totalQuestions}</span>
          </div>
          <QuestionMap session={session} totalQuestions={totalQuestions} answeredQuestionIds={answeredQuestionIds} onSelect={goToQuestion} />
          <div className="question-map-legend">
            <span><i className="legend-current" />当前</span>
            <span><i className="legend-answered" />已作答</span>
            <span><i className="legend-marked" />已标记</span>
          </div>
          <p className="exam-sidebar__privacy">
            {saving
              ? "正在保存本次学习记录…"
              : persistenceScope === "account"
              ? "学习事件正在保存到你的私密账号学习空间。"
              : persistenceScope === "memory"
                ? "学习事件暂时只保留在当前页面；请检查网络或浏览器存储。"
                : "未登录：学习事件只保存在这台设备。"}
          </p>
        </aside>}
      </main>

      <SubmissionDialog
        open={submissionOpen}
        answeredCount={answeredCount}
        markedCount={session.markedQuestionIds.length}
        totalQuestions={totalQuestions}
        submitting={submitting}
        submitError={submitError}
        responseMode={requestedPaper.responseMode}
        onOpenChange={setSubmissionOpen}
        onConfirm={() => void confirmSubmission()}
      />
    </div>
  );
}
