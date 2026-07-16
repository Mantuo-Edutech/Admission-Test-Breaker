import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { Bookmark, ChevronLeft, ChevronRight } from "lucide-react";
import type { AppServices } from "../../../app/dependencies.js";
import { getTmuaPracticePaper } from "../content/tmua-online-registry.js";
import { ExamHeader } from "../components/ExamHeader.js";
import { MobileQuestionMap, QuestionMap } from "../components/QuestionMap.js";
import { QuestionCard } from "../components/QuestionCard.js";
import { SubmissionDialog } from "../components/SubmissionDialog.js";
import { practiceSessionReducer } from "../domain/reducer.js";
import {
  questionIdForNumber,
  TMUA_PAPER_QUESTION_COUNT,
  type PracticeSession,
} from "../domain/session.js";
import { remainingTimeMs } from "../domain/timer.js";

interface PracticePageProps {
  services: AppServices;
}

type PracticeLoadState =
  | { kind: "loading" }
  | { kind: "missing" }
  | { kind: "ready"; session: PracticeSession };

export function PracticePage({ services }: PracticePageProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { paperId } = useParams();
  const requestedPaper = paperId === undefined ? null : getTmuaPracticePaper(paperId);
  const [loadState, setLoadState] = useState<PracticeLoadState>({ kind: "loading" });
  const [clockMs, setClockMs] = useState(() => services.now().getTime());
  const [submissionOpen, setSubmissionOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [persistenceWarning, setPersistenceWarning] = useState(
    Boolean((location.state as { recoveryWarning?: boolean } | null)?.recoveryWarning),
  );

  useEffect(() => {
    let active = true;
    void services.store.loadCurrent().then((result) => {
      if (!active) return;
      if (
        result.session === null ||
        requestedPaper === null ||
        result.session.paperId !== requestedPaper.id
      ) {
        setLoadState({ kind: "missing" });
      } else if (result.session.status !== "active") {
        navigate(`/results/${result.session.id}`, { replace: true });
      } else {
        setLoadState({ kind: "ready", session: result.session });
      }
    });
    return () => {
      active = false;
    };
  }, [navigate, requestedPaper, services.store]);

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
    void services.store.save(expired).then(() => {
      navigate(`/results/${expired.id}`, { replace: true });
    });
  }, [navigate, remainingMs, services, session]);

  const updateSession = useCallback(
    (transform: (current: PracticeSession) => PracticeSession) => {
      setLoadState((current) => {
        if (current.kind !== "ready") return current;
        const next = transform(current.session);
        if (next === current.session) return current;
        void services.store.save(next).then((result) => {
          if (!result.persisted) setPersistenceWarning(true);
        });
        return { kind: "ready", session: next };
      });
    },
    [services.store],
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
    setSubmissionOpen(true);
    updateSession((current) =>
      practiceSessionReducer(current, {
        type: "open-submission",
        eventId: services.ids.eventId(),
        at: services.now().toISOString(),
        totalQuestions: TMUA_PAPER_QUESTION_COUNT,
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
    setLoadState({ kind: "ready", session: finalized });
    const result = await services.store.save(finalized);
    if (!result.persisted) setPersistenceWarning(true);
    navigate(`/results/${finalized.id}`);
  }

  const currentQuestion = useMemo(
    () =>
      session === null
        ? null
        : requestedPaper?.questions[session.currentQuestion - 1] ?? null,
    [requestedPaper, session],
  );

  if (loadState.kind === "loading") {
    return (
      <main className="practice-state-page">
        <p className="eyebrow">PREPARING YOUR DESK</p>
        <h1>正在铺开试卷…</h1>
      </main>
    );
  }

  if (loadState.kind === "missing" || session === null || currentQuestion === null) {
    return (
      <main className="practice-state-page">
        <p className="eyebrow">SESSION NOT FOUND</p>
        <h1>这里没有可继续的练习</h1>
        <p>练习可能已被清除，或者只保存在另一台设备上。</p>
        <Link className="button button--primary" to="/exams/tmua/dashboard">返回我的准备路径</Link>
      </main>
    );
  }

  const answeredCount = Object.keys(session.answers).length;
  const currentQuestionId = currentQuestion.id;
  const isMarked = session.markedQuestionIds.includes(currentQuestionId);

  return (
    <div className="practice-page">
      <ExamHeader
        answeredCount={answeredCount}
        edition={requestedPaper?.edition ?? ""}
        paperNumber={requestedPaper?.paper ?? 1}
        totalQuestions={TMUA_PAPER_QUESTION_COUNT}
        remainingMs={remainingMs}
        mobileMap={
          <MobileQuestionMap session={session} onSelect={goToQuestion} />
        }
        onSubmit={openSubmission}
      />

      {persistenceWarning && (
        <div className="persistence-warning" role="status">
          本次练习仍可继续，但刷新或关闭页面后可能无法恢复。
        </div>
      )}

      <main className="exam-layout">
        <section className="exam-workspace">
          <QuestionCard
            question={currentQuestion}
            paperNumber={requestedPaper?.paper ?? 1}
            selectedAnswer={session.answers[currentQuestionId] ?? null}
            onAnswer={selectAnswer}
          />

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
                disabled={session.currentQuestion === TMUA_PAPER_QUESTION_COUNT}
                onClick={() => goToQuestion(session.currentQuestion + 1)}
              >
                下一题<ChevronRight aria-hidden="true" />
              </button>
            </div>
          </div>
        </section>

        <aside className="exam-sidebar">
          <div className="exam-sidebar__heading">
            <div>
              <p>QUESTION MAP</p>
              <h2>题目导航</h2>
            </div>
            <span>{answeredCount}/20</span>
          </div>
          <QuestionMap session={session} onSelect={goToQuestion} />
          <div className="question-map-legend">
            <span><i className="legend-current" />当前</span>
            <span><i className="legend-answered" />已作答</span>
            <span><i className="legend-marked" />已标记</span>
          </div>
          <p className="exam-sidebar__privacy">学习事件正在记录到这台设备的本地学习空间。</p>
        </aside>
      </main>

      <SubmissionDialog
        open={submissionOpen}
        answeredCount={answeredCount}
        markedCount={session.markedQuestionIds.length}
        totalQuestions={TMUA_PAPER_QUESTION_COUNT}
        submitting={submitting}
        onOpenChange={setSubmissionOpen}
        onConfirm={() => void confirmSubmission()}
      />
    </div>
  );
}
