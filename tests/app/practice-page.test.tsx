import { render, screen, waitFor, within } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { RouterProvider } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { AppServices } from "../../src/app/dependencies.js";
import { createAppRouter } from "../../src/app/routes.js";
import {
  createEsatPreparationPlan,
  saveEsatPreparationPlan,
} from "../../src/features/catalog/esat-plan.js";
import { createPracticeSession } from "../../src/features/practice/domain/session.js";
import type { PracticeSession } from "../../src/features/practice/domain/session.js";
import { parseEssayResponse } from "../../src/features/practice/domain/essay-response.js";
import { parseStatementAnswers } from "../../src/features/practice/domain/statement-response.js";
import type {
  PracticeSessionStore,
  SessionLoadResult,
  SessionSaveResult,
} from "../../src/features/practice/storage/store.js";
import {
  FIXED_GUEST_SPACE,
  FIXED_GUEST_SPACE_STORE,
} from "../support/fixed-guest-space-store.js";
import { FIXED_PREPARATION_PROFILE_STORE } from "../support/fixed-preparation-profile-store.js";

class PracticeStore implements PracticeSessionStore {
  saves: PracticeSession[] = [];

  constructor(private session: PracticeSession | null) {}

  async loadCurrent(): Promise<SessionLoadResult> {
    return { session: this.session, issue: null };
  }

  async save(session: PracticeSession): Promise<SessionSaveResult> {
    this.session = session;
    this.saves.push(session);
    return { persisted: true };
  }

  async clearCurrent(): Promise<void> {
    this.session = null;
  }
}

class FlakyPracticeStore implements PracticeSessionStore {
  saves: PracticeSession[] = [];
  fail = false;

  constructor(private session: PracticeSession | null) {}

  async loadCurrent(): Promise<SessionLoadResult> {
    return { session: this.session, issue: null };
  }

  async save(session: PracticeSession): Promise<SessionSaveResult> {
    this.saves.push(session);
    if (this.fail) {
      return { persisted: false, durable: false, issue: "unavailable", scope: "memory" };
    }
    this.session = session;
    return { persisted: true, durable: true, scope: "account" };
  }

  async clearCurrent(): Promise<void> {
    this.session = null;
  }
}

class DeferredPracticeStore implements PracticeSessionStore {
  saves: PracticeSession[] = [];
  defer = false;
  private pending: Array<(result: SessionSaveResult) => void> = [];

  constructor(private session: PracticeSession | null) {}

  async loadCurrent(): Promise<SessionLoadResult> {
    return { session: this.session, issue: null };
  }

  save(session: PracticeSession): Promise<SessionSaveResult> {
    this.saves.push(session);
    if (!this.defer) {
      this.session = session;
      return Promise.resolve({ persisted: true, durable: true, scope: "account" });
    }
    return new Promise((resolve) => {
      this.pending.push((result) => {
        if (result.persisted) this.session = session;
        resolve(result);
      });
    });
  }

  resolveNext(result: SessionSaveResult): void {
    const resolve = this.pending.shift();
    if (resolve === undefined) throw new Error("No deferred practice save is pending");
    resolve(result);
  }

  async clearCurrent(): Promise<void> {
    this.session = null;
  }
}

function activeSession() {
  return createPracticeSession({
    id: "ses_practice-test",
    learningSpaceId: FIXED_GUEST_SPACE.id,
    actor: { kind: "guest", actorId: FIXED_GUEST_SPACE.ownerActorId },
    startedAt: "2026-07-13T09:00:00.000Z",
    eventId: "evt_practice-started",
  });
}

function activePdfSession() {
  return createPracticeSession({
    id: "ses_pdf-practice-test",
    learningSpaceId: FIXED_GUEST_SPACE.id,
    actor: { kind: "guest", actorId: FIXED_GUEST_SPACE.ownerActorId },
    paperId: "tmua-2022-p2",
    startedAt: "2026-07-13T09:00:00.000Z",
    eventId: "evt_pdf-practice-started",
  });
}

function activeEsatStarterSession(paperId = "esat-mathematics-1-starter-v1") {
  return createPracticeSession({
    id: "ses_esat-starter-test",
    learningSpaceId: FIXED_GUEST_SPACE.id,
    actor: { kind: "guest", actorId: FIXED_GUEST_SPACE.ownerActorId },
    paperId,
    durationMinutes: 20,
    startedAt: "2026-07-13T09:00:00.000Z",
    eventId: "evt_esat-starter-started",
  });
}

function activeLnatStarterSession() {
  return createPracticeSession({
    id: "ses_lnat-starter-test",
    learningSpaceId: FIXED_GUEST_SPACE.id,
    actor: { kind: "guest", actorId: FIXED_GUEST_SPACE.ownerActorId },
    paperId: "lnat-section-a-starter-v1",
    durationMinutes: 30,
    startedAt: "2026-07-13T09:00:00.000Z",
    eventId: "evt_lnat-starter-started",
  });
}

function activeUcatStarterSession() {
  return createPracticeSession({
    id: "ses_ucat-starter-test",
    learningSpaceId: FIXED_GUEST_SPACE.id,
    actor: { kind: "guest", actorId: FIXED_GUEST_SPACE.ownerActorId },
    paperId: "ucat-verbal-reasoning-starter-v1",
    durationMinutes: 6,
    startedAt: "2026-07-13T09:00:00.000Z",
    eventId: "evt_ucat-starter-started",
  });
}

function activeUcatQrStarterSession() {
  return createPracticeSession({
    id: "ses_ucat-qr-starter-test",
    learningSpaceId: FIXED_GUEST_SPACE.id,
    actor: { kind: "guest", actorId: FIXED_GUEST_SPACE.ownerActorId },
    paperId: "ucat-quantitative-reasoning-starter-v1",
    durationMinutes: 8,
    startedAt: "2026-07-13T09:00:00.000Z",
    eventId: "evt_ucat-qr-starter-started",
  });
}

function activeEssaySession(paperId: "tara-writing-task-v1" | "lnat-section-b-writing-v1") {
  return createPracticeSession({
    id: `ses_${paperId}`,
    learningSpaceId: FIXED_GUEST_SPACE.id,
    actor: { kind: "guest", actorId: FIXED_GUEST_SPACE.ownerActorId },
    paperId,
    durationMinutes: 40,
    startedAt: "2026-07-13T09:00:00.000Z",
    eventId: `evt_${paperId}-started`,
  });
}

function activeSpecialistSession(
  paperId: "ucat-decision-making-starter-v1" | "ucat-situational-judgement-starter-v1",
  durationMinutes: number,
  currentQuestion = 1,
) {
  return {
    ...createPracticeSession({
      id: `ses_${paperId}`,
      learningSpaceId: FIXED_GUEST_SPACE.id,
      actor: { kind: "guest", actorId: FIXED_GUEST_SPACE.ownerActorId },
      paperId,
      durationMinutes,
      startedAt: "2026-07-13T09:01:00.000Z",
      eventId: `evt_${paperId}-started`,
    }),
    currentQuestion,
  };
}

function appServices(store: PracticeSessionStore): AppServices {
  let eventNumber = 0;
  return {
    store,
    guestSpaceStore: FIXED_GUEST_SPACE_STORE,
    profileStore: FIXED_PREPARATION_PROFILE_STORE,
    now: () => new Date("2026-07-13T09:05:00.000Z"),
    ids: {
      sessionId: () => "ses_unused",
      eventId: () => `evt_practice-${++eventNumber}`,
    },
  };
}

function saveCompleteEsatPlan() {
  saveEsatPreparationPlan(globalThis.localStorage, createEsatPreparationPlan({
    programmeIds: ["imperial-h401"],
    moduleIds: ["mathematics-1", "physics", "mathematics-2"],
    entryCycle: "2027",
    curriculumId: "a-level",
    courseIds: ["al-mathematics", "al-physics"],
    updatedAt: "2026-07-17T15:00:00.000Z",
  }));
}

afterEach(() => {
  vi.restoreAllMocks();
  globalThis.localStorage.clear();
});

describe("responsive native practice page", () => {
  it("records a privacy-safe start only when a new practice session is created", async () => {
    const track = vi.fn(async () => undefined);
    const services = appServices(new PracticeStore(null));
    services.funnel = { track };
    const router = createAppRouter(
      ["/practice/tmua-2023-paper-1"],
      services,
    );
    render(<RouterProvider router={router} />);

    await screen.findByRole("heading", { name: /Question 1/u }, { timeout: 5_000 });
    await waitFor(() => expect(track).toHaveBeenCalledWith({
      eventType: "practice_started",
      examId: "tmua",
      contextCode: "tmua-2023-p1",
    }));
  });

  it("runs the ESAT Mathematics 1 starter in the same native practice kernel", async () => {
    saveCompleteEsatPlan();
    const user = userEvent.setup();
    const store = new PracticeStore(activeEsatStarterSession());
    const router = createAppRouter(
      ["/practice/esat-mathematics-1-starter-v1"],
      appServices(store),
    );
    render(<RouterProvider router={router} />);

    expect(await screen.findByText(/A car travels 150 km/u)).toBeInTheDocument();
    expect(screen.getByText("0 / 10 answered")).toBeInTheDocument();
    expect(screen.queryByTitle(/原卷/u)).not.toBeInTheDocument();
    await user.click(screen.getByRole("radio", { name: "Option B" }));
    await waitFor(() => {
      expect(store.saves.at(-1)?.answers).toEqual({ "esat-mathematics-1-starter-v1-q01": "B" });
    });
  });

  it("runs a science starter through the same native practice kernel", async () => {
    saveCompleteEsatPlan();
    const user = userEvent.setup();
    const store = new PracticeStore(activeEsatStarterSession("esat-physics-starter-v1"));
    const router = createAppRouter(
      ["/practice/esat-physics-starter-v1"],
      appServices(store),
    );
    render(<RouterProvider router={router} />);

    expect(await screen.findByText(/6 Ω resistor and a 3 Ω resistor/u)).toBeInTheDocument();
    expect(screen.getByText("0 / 10 answered")).toBeInTheDocument();
    await user.click(screen.getByRole("radio", { name: "Option B" }));
    await waitFor(() => {
      expect(store.saves.at(-1)?.answers).toEqual({ "esat-physics-starter-v1-q01": "B" });
    });
  });

  it("runs the TARA reasoning starter and persists an argument answer", async () => {
    const user = userEvent.setup();
    const store = new PracticeStore(activeEsatStarterSession("tara-reasoning-starter-v1"));
    const router = createAppRouter(
      ["/practice/tara-reasoning-starter-v1"],
      appServices(store),
    );
    render(<RouterProvider router={router} />);

    expect(await screen.findByText(/A town park currently closes at 7 pm/u)).toBeInTheDocument();
    await user.click(screen.getByRole("radio", { name: "Option D" }));
    await waitFor(() => {
      expect(store.saves.at(-1)?.answers).toEqual({ "tara-reasoning-starter-v1-q01": "D" });
    });
  });

  it("renders an LNAT passage beside its questions and persists the answer", async () => {
    const user = userEvent.setup();
    const store = new PracticeStore(activeLnatStarterSession());
    const router = createAppRouter(
      ["/practice/lnat-section-a-starter-v1"],
      appServices(store),
    );
    render(<RouterProvider router={router} />);

    expect(await screen.findByRole("heading", { name: "The Right to a Reason" })).toBeInTheDocument();
    expect(screen.getByText(/Public agencies increasingly use automated systems/u)).toBeInTheDocument();
    expect(screen.getByText(/Which option best states the main conclusion/u)).toBeInTheDocument();
    expect(screen.getByText("0 / 12 answered")).toBeInTheDocument();
    await user.click(screen.getByRole("radio", { name: "Option C" }));
    await waitFor(() => {
      expect(store.saves.at(-1)?.answers).toEqual({ "lnat-section-a-starter-v1-q01": "C" });
    });
  });

  it("runs the UCAT Verbal Reasoning starter in the passage practice interface", async () => {
    const user = userEvent.setup();
    const store = new PracticeStore(activeUcatStarterSession());
    const router = createAppRouter(
      ["/practice/ucat-verbal-reasoning-starter-v1"],
      appServices(store),
    );
    render(<RouterProvider router={router} />);

    expect(await screen.findByRole("heading", { name: "Fog collectors" })).toBeInTheDocument();
    expect(screen.getByText(/On the exposed ridge, the fine mesh captured more water/u)).toBeInTheDocument();
    expect(screen.getByText("0 / 12 answered")).toBeInTheDocument();
    await user.click(screen.getByRole("radio", { name: "Option A" }));
    await waitFor(() => {
      expect(store.saves.at(-1)?.answers).toEqual({ "ucat-verbal-reasoning-starter-v1-q01": "A" });
    });
  });

  it("runs UCAT Quantitative Reasoning with a native data table and working calculator", async () => {
    const user = userEvent.setup();
    const store = new PracticeStore(activeUcatQrStarterSession());
    const router = createAppRouter(
      ["/practice/ucat-quantitative-reasoning-starter-v1"],
      appServices(store),
    );
    render(<RouterProvider router={router} />);

    expect(await screen.findByRole("heading", { name: "Clinic activity" })).toBeInTheDocument();
    expect(screen.getByRole("table", { name: "Booked appointments and consultation time" })).toBeInTheDocument();
    expect(screen.getByText("Data set")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Basic calculator/u }));
    const calculator = screen.getByRole("region", { name: "Basic calculator" });
    await user.click(within(calculator).getByRole("button", { name: "7" }));
    await user.click(within(calculator).getByRole("button", { name: "Add" }));
    await user.click(within(calculator).getByRole("button", { name: "5" }));
    await user.click(within(calculator).getByRole("button", { name: "Equals" }));
    expect(within(calculator).getByText("12")).toBeInTheDocument();
    await user.click(screen.getByRole("radio", { name: "Option B" }));
    await waitFor(() => {
      expect(store.saves.at(-1)?.answers).toEqual({ "ucat-quantitative-reasoning-starter-v1-q01": "B" });
    });
  });

  it("runs TARA writing with prompt choice, word count, private autosave and direct submission", async () => {
    const user = userEvent.setup();
    const store = new PracticeStore(activeEssaySession("tara-writing-task-v1"));
    const router = createAppRouter(
      ["/practice/tara-writing-task-v1"],
      appServices(store),
    );
    render(<RouterProvider router={router} />);

    expect(await screen.findByRole("heading", { name: /Choose one prompt and build your argument/u })).toBeInTheDocument();
    const editor = screen.getByLabelText(/Your response/u);
    expect(editor).toBeDisabled();
    expect(editor).toHaveAttribute("maxlength", "20000");
    await user.click(screen.getByRole("radio", { name: /Automated public decisions/u }));
    expect(editor).toBeEnabled();
    await user.type(editor, "A fair rule needs reasons, evidence, and review.");
    expect(screen.getByText("8 / 750 words")).toBeInTheDocument();

    await waitFor(() => {
      const draft = store.saves
        .map((save) => save.answers["tara-writing-task-v1-q01"])
        .find((answer) => parseEssayResponse(answer).text.endsWith("review."));
      expect(parseEssayResponse(draft)).toEqual({
        promptId: "automated-decisions",
        text: "A fair rule needs reasons, evidence, and review.",
      });
    }, { timeout: 2_500 });

    await user.click(screen.getByRole("button", { name: "Submit writing" }));
    expect(screen.getByRole("dialog")).toHaveTextContent("Submit this response?");
    expect(screen.getByRole("dialog")).toHaveTextContent("Complete");
    await user.click(screen.getByRole("button", { name: "Submit" }));
    await waitFor(() => expect(router.state.location.pathname).toBe("/results/ses_tara-writing-task-v1"));
    expect(store.saves.at(-1)?.status).toBe("submitted");
  });

  it("shows the LNAT Section B recommended range in the same writing editor", async () => {
    const store = new PracticeStore(activeEssaySession("lnat-section-b-writing-v1"));
    const router = createAppRouter(
      ["/practice/lnat-section-b-writing-v1"],
      appServices(store),
    );
    render(<RouterProvider router={router} />);

    expect(await screen.findByText("Recommended: 500–600 words")).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /Public accountability/u })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Submit writing" })).toBeInTheDocument();
  });

  it("keeps a Decision Making statement set incomplete until all five Yes/No responses exist", async () => {
    const user = userEvent.setup();
    const store = new PracticeStore(activeSpecialistSession("ucat-decision-making-starter-v1", 10, 4));
    const router = createAppRouter(
      ["/practice/ucat-decision-making-starter-v1"],
      appServices(store),
    );
    render(<RouterProvider router={router} />);

    expect(await screen.findByText("Multiple statements")).toBeInTheDocument();
    expect(screen.getByText("0 / 8 answered")).toBeInTheDocument();
    const yes = screen.getAllByRole("radio", { name: "Yes" });
    const no = screen.getAllByRole("radio", { name: "No" });
    await user.click(yes[0]!);
    expect(screen.getByText("0 / 8 answered")).toBeInTheDocument();
    await user.click(yes[1]!);
    await user.click(no[2]!);
    await user.click(no[3]!);
    await user.click(yes[4]!);
    expect(screen.getByText("1 / 8 answered")).toBeInTheDocument();
    await waitFor(() => {
      expect(parseStatementAnswers(store.saves.at(-1)?.answers["ucat-decision-making-starter-v1-q04"]))
        .toEqual({
          "archive-not-metal": "yes",
          "archive-sealed": "yes",
          "archive-transparent": "no",
          "cedar-not-transparent": "yes",
          "sealed-cedar": "no",
        });
    });
  });

  it("runs SJT in a scenario view with an explicit ordinal response scale", async () => {
    const user = userEvent.setup();
    const store = new PracticeStore(activeSpecialistSession("ucat-situational-judgement-starter-v1", 5));
    const router = createAppRouter(
      ["/practice/ucat-situational-judgement-starter-v1"],
      appServices(store),
    );
    render(<RouterProvider router={router} />);

    expect(await screen.findByRole("heading", { name: "An uncertain observation" })).toBeInTheDocument();
    expect(screen.getByText("SCENARIO")).toBeInTheDocument();
    expect(screen.getByText("Situational judgement")).toBeInTheDocument();
    await user.click(screen.getByRole("radio", { name: "Option B" }));
    await waitFor(() => {
      expect(store.saves.at(-1)?.answers).toEqual({ "ucat-situational-judgement-starter-v1-q01": "B" });
    });
  });

  it("renders a historic paper natively and records online answers", async () => {
    const user = userEvent.setup();
    const store = new PracticeStore(activePdfSession());
    const router = createAppRouter(
      ["/practice/tmua-2022-p2"],
      appServices(store),
    );
    render(<RouterProvider router={router} />);

    expect(await screen.findByText(
      /Determine the number of stationary points/u,
      {},
      { timeout: 5_000 },
    )).toBeInTheDocument();
    expect(screen.queryByTitle(/原卷/u)).not.toBeInTheDocument();
    await user.click(screen.getByRole("radio", { name: "Option B" }));
    await waitFor(() => {
      expect(store.saves.at(-1)?.answers).toEqual({ "tmua-2022-p2-q01": "B" });
    });
  });

  it("pauses timing while the page is hidden and resumes when visible", async () => {
    const store = new PracticeStore(activeSession());
    const visibility = vi.spyOn(document, "visibilityState", "get");
    const router = createAppRouter(
      ["/practice/tmua-2023-paper-1"],
      appServices(store),
    );
    render(<RouterProvider router={router} />);
    await screen.findByRole("heading", { name: /Question 1/u }, { timeout: 5_000 });

    visibility.mockReturnValue("hidden");
    document.dispatchEvent(new Event("visibilitychange"));
    await waitFor(() => {
      expect(store.saves.at(-1)?.activeQuestionEnteredAt).toBeNull();
      expect(store.saves.at(-1)?.events.at(-1)?.type).toBe("session_paused");
    });

    visibility.mockReturnValue("visible");
    document.dispatchEvent(new Event("visibilitychange"));
    await waitFor(() => {
      expect(store.saves.at(-1)?.activeQuestionEnteredAt).not.toBeNull();
      expect(store.saves.at(-1)?.events.at(-1)?.type).toBe("session_resumed");
    });
  });

  it("answers, marks, and navigates without revealing the answer", async () => {
    const user = userEvent.setup();
    const store = new PracticeStore(activeSession());
    const router = createAppRouter(
      ["/practice/tmua-2023-paper-1"],
      appServices(store),
    );
    render(<RouterProvider router={router} />);

    expect(
      await screen.findByRole("heading", { name: /Question 1/u }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Report this question/u })).toHaveAttribute(
      "href",
      "/feedback?exam=tmua&from=%2Fpractice%2Ftmua-2023-p1&resource=tmua-2023-p1&question=tmua-2023-p1-q01",
    );
    await user.click(screen.getByRole("radio", { name: /Option F/ }));
    expect(screen.getByText("1 / 20 answered")).toBeInTheDocument();
    expect(screen.queryByText(/正确答案/)).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Mark question" }));
    expect(screen.getByRole("button", { name: "Unmark" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Next" }));
    expect(
      await screen.findByRole("heading", { name: /Question 2/u }),
    ).toBeInTheDocument();
    await waitFor(() => expect(store.saves.length).toBeGreaterThan(0));
  });

  it("shows deliberate submission counts and finalizes into the result route", async () => {
    const user = userEvent.setup();
    const store = new PracticeStore(activeSession());
    const services = appServices(store);
    const track = vi.fn(async () => undefined);
    services.funnel = { track };
    const router = createAppRouter(
      ["/practice/tmua-2023-paper-1"],
      services,
    );
    render(<RouterProvider router={router} />);

    await screen.findByRole("heading", { name: /Question 1/u });
    await user.click(screen.getByRole("radio", { name: /Option F/ }));
    await user.click(screen.getByRole("button", { name: "Submit paper" }));

    expect(screen.getByRole("dialog")).toHaveTextContent("19 unanswered");
    await user.click(screen.getByRole("button", { name: "Submit" }));

    await waitFor(() =>
      expect(router.state.location.pathname).toBe(
        "/results/ses_practice-test",
      ),
    );
    expect(store.saves.at(-1)?.status).toBe("submitted");
    expect(track).toHaveBeenCalledWith({
      eventType: "practice_completed",
      examId: "tmua",
      contextCode: "tmua-2023-p1",
    });
  });

  it("keeps unsaved answers on the page and lets the student retry persistence", async () => {
    const user = userEvent.setup();
    const store = new FlakyPracticeStore(activeSession());
    const router = createAppRouter(
      ["/practice/tmua-2023-paper-1"],
      appServices(store),
    );
    render(<RouterProvider router={router} />);

    await screen.findByRole("heading", { name: /Question 1/u });
    store.fail = true;
    await user.click(screen.getByRole("radio", { name: /Option F/u }));

    expect(await screen.findByText(/Not saved yet.*You may continue/u)).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /Option F/u })).toBeChecked();
    expect(router.state.location.pathname).toBe("/practice/tmua-2023-p1");

    store.fail = false;
    await user.click(screen.getByRole("button", { name: "Save again" }));
    await waitFor(() => {
      expect(screen.queryByRole("button", { name: "Save again" })).not.toBeInTheDocument();
    });
    expect(store.saves.at(-1)?.answers).toEqual({ "tmua-2023-p1-q01": "F" });
  });

  it("serializes rapid saves and lets only the latest attempt set the visible state", async () => {
    const user = userEvent.setup();
    const store = new DeferredPracticeStore(activeSession());
    const router = createAppRouter(
      ["/practice/tmua-2023-paper-1"],
      appServices(store),
    );
    render(<RouterProvider router={router} />);

    await screen.findByRole("heading", { name: /Question 1/u });
    store.defer = true;
    await user.click(screen.getByRole("radio", { name: /Option F/u }));
    await waitFor(() => expect(store.saves).toHaveLength(1));
    await user.click(screen.getByRole("button", { name: "Mark question" }));

    expect(store.saves).toHaveLength(1);
    store.resolveNext({ persisted: true, durable: true, scope: "account" });
    await waitFor(() => expect(store.saves).toHaveLength(2));
    store.resolveNext({ persisted: false, durable: false, issue: "unavailable", scope: "memory" });

    expect(await screen.findByText(/Not saved yet.*You may continue/u)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Unmark" })).toBeInTheDocument();
  });

  it("does not enter the result page until the submitted session is durably saved", async () => {
    const user = userEvent.setup();
    const store = new FlakyPracticeStore(activeSession());
    const router = createAppRouter(
      ["/practice/tmua-2023-paper-1"],
      appServices(store),
    );
    render(<RouterProvider router={router} />);

    await screen.findByRole("heading", { name: /Question 1/u });
    store.fail = true;
    await user.click(screen.getByRole("button", { name: "Submit paper" }));
    await user.click(screen.getByRole("button", { name: "Submit" }));

    expect(await screen.findByText(/提交尚未保存。答案仍保留在当前页面/u)).toBeInTheDocument();
    expect(router.state.location.pathname).toBe("/practice/tmua-2023-p1");

    store.fail = false;
    await user.click(screen.getByRole("button", { name: "Save and submit again" }));
    await waitFor(() => {
      expect(router.state.location.pathname).toBe("/results/ses_practice-test");
    });
    expect(store.saves.at(-1)?.status).toBe("submitted");
  });

  it("creates a new session and opens question 1 when no local session exists", async () => {
    const store = new PracticeStore(null);
    const router = createAppRouter(
      ["/practice/tmua-2023-paper-1"],
      appServices(store),
    );
    render(<RouterProvider router={router} />);

    expect(await screen.findByRole("heading", { name: /Question 1/u })).toBeInTheDocument();
    expect(store.saves[0]).toMatchObject({
      id: "ses_unused",
      paperId: "tmua-2023-p1",
      status: "active",
    });
  });

  it("redirects old start links straight into question 1 without a launch page", async () => {
    const store = new PracticeStore(null);
    const router = createAppRouter(
      ["/practice/tmua-2023-p1/start"],
      appServices(store),
    );
    render(<RouterProvider router={router} />);

    expect(await screen.findByRole("heading", { name: /Question 1/u })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe("/practice/tmua-2023-p1");
    expect(screen.queryByText("逐题在线排版")).not.toBeInTheDocument();
  });
});
