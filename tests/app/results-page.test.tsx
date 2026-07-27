import { readFile } from "node:fs/promises";
import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { RouterProvider } from "react-router-dom";
import { beforeAll, describe, expect, it } from "vitest";
import type { AppServices } from "../../src/app/dependencies.js";
import { createAppRouter } from "../../src/app/routes.js";
import {
  parseTmuaSpecimenP1WorkedExplanations,
  type EntitledContentResult,
  type TmuaSpecimenP1WorkedExplanations,
} from "../../src/features/entitled-content/domain.js";
import { practiceSessionReducer } from "../../src/features/practice/domain/reducer.js";
import { serializeEssayResponse } from "../../src/features/practice/domain/essay-response.js";
import { serializeStatementAnswers } from "../../src/features/practice/domain/statement-response.js";
import { createPracticeSession } from "../../src/features/practice/domain/session.js";
import type { PracticeSession } from "../../src/features/practice/domain/session.js";
import type {
  PracticeSessionStore,
  SessionLoadResult,
  SessionSaveResult,
} from "../../src/features/practice/storage/store.js";
import {
  FIXED_GUEST_SPACE,
  FIXED_GUEST_SPACE_STORE,
} from "../support/fixed-guest-space-store.js";
import { EMPTY_PREPARATION_PROFILE_STORE } from "../support/empty-preparation-profile-store.js";

class ResultStore implements PracticeSessionStore {
  cleared = false;

  constructor(private session: PracticeSession | null) {}

  async loadCurrent(): Promise<SessionLoadResult> {
    return { session: this.session, issue: null };
  }

  async save(session: PracticeSession): Promise<SessionSaveResult> {
    this.session = session;
    return { persisted: true };
  }

  async clearCurrent(): Promise<void> {
    this.session = null;
    this.cleared = true;
  }
}

let workedExplanations: TmuaSpecimenP1WorkedExplanations;

beforeAll(async () => {
  workedExplanations = parseTmuaSpecimenP1WorkedExplanations(JSON.parse(
    await readFile("content/notes/tmua/specimen-p1-worked-explanations-v1.json", "utf8"),
  ));
});

function submittedSession(paperId = "tmua-2023-p1") {
  const active = createPracticeSession({
    id: "ses_result-page",
    learningSpaceId: FIXED_GUEST_SPACE.id,
    actor: { kind: "guest", actorId: FIXED_GUEST_SPACE.ownerActorId },
    paperId,
    startedAt: "2026-07-13T09:00:00.000Z",
    eventId: "evt_result-started",
  });
  const answered = practiceSessionReducer(active, {
    type: "answer",
    eventId: "evt_result-answer",
    questionId: `${paperId}-q01`,
    answer: paperId === "tmua-specimen-p1" ? "D" : "F",
    at: "2026-07-13T09:01:00.000Z",
  });
  return practiceSessionReducer(answered, {
    type: "submit",
    eventId: "evt_result-submit",
    timeEventId: "evt_result-time",
    at: "2026-07-13T09:10:00.000Z",
    reason: "student",
  });
}

function submittedEssaySession() {
  const paperId = "lnat-section-b-writing-v1";
  const active = createPracticeSession({
    id: "ses_essay-result-page",
    learningSpaceId: FIXED_GUEST_SPACE.id,
    actor: { kind: "guest", actorId: FIXED_GUEST_SPACE.ownerActorId },
    paperId,
    durationMinutes: 40,
    startedAt: "2026-07-13T09:00:00.000Z",
    eventId: "evt_essay-result-started",
  });
  const drafted: PracticeSession = {
    ...active,
    answers: {
      [`${paperId}-q01`]: serializeEssayResponse({
        promptId: "civil-disobedience",
        text: "Civil disobedience can protect democracy when ordinary review fails. It must remain public, proportionate, and accountable.",
      }),
    },
  };
  return practiceSessionReducer(drafted, {
    type: "submit",
    eventId: "evt_essay-result-submit",
    timeEventId: "evt_essay-result-time",
    at: "2026-07-13T09:10:00.000Z",
    reason: "student",
  });
}

function submittedDecisionMakingSession() {
  const paperId = "ucat-decision-making-starter-v1";
  const active = createPracticeSession({
    id: "ses_dm-result-page",
    learningSpaceId: FIXED_GUEST_SPACE.id,
    actor: { kind: "guest", actorId: FIXED_GUEST_SPACE.ownerActorId },
    paperId,
    durationMinutes: 10,
    startedAt: "2026-07-13T09:00:00.000Z",
    eventId: "evt_dm-result-started",
  });
  const drafted: PracticeSession = {
    ...active,
    answers: {
      [`${paperId}-q04`]: serializeStatementAnswers({
        "archive-sealed": "yes",
        "cedar-not-transparent": "yes",
        "archive-transparent": "no",
        "sealed-cedar": "yes",
        "archive-not-metal": "yes",
      }),
    },
  };
  return practiceSessionReducer(drafted, {
    type: "submit",
    eventId: "evt_dm-result-submit",
    timeEventId: "evt_dm-result-time",
    at: "2026-07-13T09:10:00.000Z",
    reason: "student",
  });
}

function services(store: PracticeSessionStore, entitledResult?: EntitledContentResult): AppServices {
  return {
    store,
    guestSpaceStore: FIXED_GUEST_SPACE_STORE,
    profileStore: EMPTY_PREPARATION_PROFILE_STORE,
    now: () => new Date("2026-07-13T09:10:00.000Z"),
    ids: {
      sessionId: () => "ses_unused",
      eventId: () => "evt_unused",
    },
    ...(entitledResult === undefined
      ? {}
      : {
          entitledContent: {
            configured: true,
            async load() { return entitledResult; },
          },
        }),
  };
}

describe("evidence-only results page", () => {
  it("shows deterministic score, timing, and answer-level evidence", async () => {
    const session = submittedSession();
    const router = createAppRouter(
      [`/results/${session.id}`],
      services(new ResultStore(session)),
    );
    render(<RouterProvider router={router} />);

    expect(
      await screen.findByRole("heading", { name: /Practice complete/u }),
    ).toBeInTheDocument();
    expect(screen.getByText("1 / 20")).toBeInTheDocument();
    expect(screen.getByText("5%")).toBeInTheDocument();
    expect(screen.getByText("Correct")).toBeInTheDocument();
    expect(screen.getByText("Unanswered")).toBeInTheDocument();
    expect(screen.getByText("Active time")).toBeInTheDocument();
    expect(screen.getByText(/Trends become more reliable with more papers/u)).toBeInTheDocument();
    expect(screen.getByLabelText("Your answer F")).toBeInTheDocument();
    expect(screen.getAllByLabelText("Correct answer F")).not.toHaveLength(0);
    expect(screen.getAllByRole("link", { name: /Report this question/u })[0]).toHaveAttribute(
      "href",
      "/feedback?exam=tmua&from=%2Fresults%2Fses_result-page&resource=tmua-2023-p1&question=tmua-2023-p1-q01",
    );
    expect(screen.queryByText(/深度解析按需解锁/u)).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "输入邀请码" })).not.toBeInTheDocument();
    expect(screen.queryByText(/预测分数/)).not.toBeInTheDocument();
    expect(screen.queryByText(/AI 深度解读/)).not.toBeInTheDocument();
  });

  it("clears the local session before starting again", async () => {
    const user = userEvent.setup();
    const session = submittedSession();
    const store = new ResultStore(session);
    const router = createAppRouter(
      [`/results/${session.id}`],
      services(store),
    );
    render(<RouterProvider router={router} />);

    await user.click(
      await screen.findByRole("button", { name: "Practise this paper again" }),
    );
    expect(store.cleared).toBe(true);
    expect(router.state.location.pathname).toBe("/practice/tmua-2023-p1");
  });

  it("returns a submitted essay without inventing an automated score", async () => {
    const session = submittedEssaySession();
    const router = createAppRouter(
      [`/results/${session.id}`],
      services(new ResultStore(session)),
    );
    render(<RouterProvider router={router} />);

    expect(await screen.findByRole("heading", { name: /Writing saved and submitted/u })).toBeInTheDocument();
    expect(screen.getByText("Law and protest")).toBeInTheDocument();
    expect(screen.getByText(/Civil disobedience can protect democracy/u)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /No automatic writing score/u })).toBeInTheDocument();
    expect(screen.getByText(/Your response stays in your private learner space/u)).toBeInTheDocument();
    expect(screen.queryByText(/本次得分/u)).not.toBeInTheDocument();
    expect(screen.queryByText(/正确答案/u)).not.toBeInTheDocument();
  });

  it("shows Decision Making two-point statement scoring as a partial factual result", async () => {
    const session = submittedDecisionMakingSession();
    const router = createAppRouter(
      [`/results/${session.id}`],
      services(new ResultStore(session)),
    );
    render(<RouterProvider router={router} />);

    expect(await screen.findByRole("heading", { name: /Practice complete/u })).toBeInTheDocument();
    expect(screen.getByLabelText("Score 1 / 10")).toBeInTheDocument();
    expect(screen.getByText("0 incorrect · 1 partial")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Question 4 · Partial credit/u })).toBeInTheDocument();
    expect(screen.getByText("1 / 2")).toBeInTheDocument();
    expect(screen.queryByText(/300–900/u)).not.toBeInTheDocument();
  });

  it("resolves a concrete deep-review product from the shared catalog", async () => {
    const user = userEvent.setup();
    const session = submittedSession("tmua-specimen-p1");
    const router = createAppRouter(
      [`/results/${session.id}`],
      services(new ResultStore(session), { status: "locked" }),
    );
    render(<RouterProvider router={router} />);

    expect(
      await screen.findByText("TMUA Early Specimen Paper 1 Worked Review is available", undefined, { timeout: 3_000 }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Your answer D")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /I have a code.*已有邀请码/u })).toHaveAttribute(
      "href",
      "/access?returnTo=%2Fresults%2Fses_result-page",
    );
    await user.click(screen.getByRole("button", { name: /Get an invitation code.*联系冰冰获取邀请码/u }));
    expect(screen.getByRole("dialog", { name: /Add Bingbing to access worked explanations/u })).toBeInTheDocument();
    expect(screen.getByAltText("Bingbing's WeChat QR code")).toBeInTheDocument();
    expect(screen.queryByLabelText(/Question 1 worked explanation/u)).not.toBeInTheDocument();
  });

  it("keeps the real product acquisition path visible when entitlement status cannot load", async () => {
    const session = submittedSession("tmua-specimen-p1");
    const router = createAppRouter(
      [`/results/${session.id}`],
      services(new ResultStore(session)),
    );
    render(<RouterProvider router={router} />);

    expect(
      await screen.findByText("TMUA Early Specimen Paper 1 Worked Review is available"),
    ).toBeInTheDocument();
    expect(screen.getByText(/worked-explanation access service is not connected/u)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Get an invitation code.*联系冰冰获取邀请码/u })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /I have a code.*已有邀请码/u })).toHaveAttribute(
      "href",
      "/access?returnTo=%2Fresults%2Fses_result-page",
    );
    expect(screen.queryByLabelText(/Question 1 worked explanation/u)).not.toBeInTheDocument();
  });

  it("renders all 20 server-delivered explanations after entitlement", async () => {
    const session = submittedSession("tmua-specimen-p1");
    const router = createAppRouter(
      [`/results/${session.id}`],
      services(new ResultStore(session), {
        status: "available",
        resource: {
          id: workedExplanations.id,
          title: workedExplanations.titleZh,
          revision: 2,
          metadata: {},
          sourceSha256: "83830bf443ee941dae0a2df99be5cbee5ae9280b81568623408d997e71146b76",
          payload: workedExplanations,
        },
      }),
    );
    render(<RouterProvider router={router} />);

    expect(await screen.findByText("20 worked explanations unlocked")).toBeInTheDocument();
    expect(screen.getByLabelText(/Question 1 worked explanation/u)).toHaveTextContent("Use the linear equation to express x in terms of y");
    expect(screen.getByLabelText(/Question 20 worked explanation/u)).toHaveTextContent("Coefficient extraction");
    expect(screen.getByLabelText(/Question 20 worked explanation/u)).toHaveTextContent("Only the coefficient of x² is required");
    expect(screen.getAllByLabelText(/worked explanation/u)).toHaveLength(20);
    expect(screen.queryByRole("link", { name: "输入邀请码" })).not.toBeInTheDocument();
  });

  it("does not expose an active or mismatched result session", async () => {
    const active = createPracticeSession({
      id: "ses_still-active",
      learningSpaceId: FIXED_GUEST_SPACE.id,
      actor: { kind: "guest", actorId: FIXED_GUEST_SPACE.ownerActorId },
      startedAt: "2026-07-13T09:00:00.000Z",
      eventId: "evt_still-active",
    });
    const router = createAppRouter(
      ["/results/ses_someone-else"],
      services(new ResultStore(active)),
    );
    render(<RouterProvider router={router} />);

    expect(
      await screen.findByRole("heading", { name: /Result unavailable/u }),
    ).toBeInTheDocument();
  });
});
