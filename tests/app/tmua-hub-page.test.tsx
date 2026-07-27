import { render, screen, within } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { RouterProvider } from "react-router-dom";
import { describe, expect, it } from "vitest";
import type { AppServices } from "../../src/app/dependencies.js";
import { createAppRouter } from "../../src/app/routes.js";
import { createPreparationProfile, type PreparationProfile } from "../../src/features/preparation-profile/domain.js";
import type { PreparationProfileLoadResult, PreparationProfileStore } from "../../src/features/preparation-profile/storage/store.js";
import { createPracticeSession, type PracticeSession } from "../../src/features/practice/domain/session.js";
import type { PracticeSessionStore, SessionLoadResult, SessionSaveResult } from "../../src/features/practice/storage/store.js";
import type { GuestSpaceId } from "../../src/platform/shared/ids.js";
import { FIXED_GUEST_SPACE, FIXED_GUEST_SPACE_STORE } from "../support/fixed-guest-space-store.js";
import { EMPTY_PREPARATION_PROFILE_STORE } from "../support/empty-preparation-profile-store.js";

class JourneySessionStore implements PracticeSessionStore {
  saved: PracticeSession | null = null;
  constructor(private readonly loaded: SessionLoadResult = { session: null, issue: null }, private readonly saveResult: SessionSaveResult = { persisted: true }) {}
  async loadCurrent(): Promise<SessionLoadResult> { return this.saved === null ? this.loaded : { session: this.saved, issue: null }; }
  async save(session: PracticeSession): Promise<SessionSaveResult> { this.saved = session; return this.saveResult; }
  async clearCurrent(): Promise<void> { this.saved = null; }
}

class JourneyProfileStore implements PreparationProfileStore {
  saved: PreparationProfile | null;
  constructor(profile: PreparationProfile | null = null) { this.saved = profile; }
  async load(_guestSpaceId: GuestSpaceId): Promise<PreparationProfileLoadResult> { return { profile: this.saved, issue: null }; }
  async save(profile: PreparationProfile): Promise<{ persisted: boolean }> { this.saved = profile; return { persisted: true }; }
  async clear(_guestSpaceId: GuestSpaceId): Promise<void> { this.saved = null; }
}

function profile(): PreparationProfile {
  return createPreparationProfile({
    guestSpaceId: FIXED_GUEST_SPACE.id, exam: "TMUA", entryCycle: "2027", curriculumSystem: "caie",
    selections: [{ qualificationId: "caie-9709-2026-2027", unitIds: ["p1"] }], experience: "sampled",
    createdAt: "2026-07-13T09:00:00.000Z", updatedAt: "2026-07-13T09:00:00.000Z",
  });
}

function services(store: PracticeSessionStore = new JourneySessionStore(), profileStore: PreparationProfileStore = EMPTY_PREPARATION_PROFILE_STORE): AppServices {
  return {
    store, guestSpaceStore: FIXED_GUEST_SPACE_STORE, profileStore,
    now: () => new Date("2026-07-13T09:00:00.000Z"),
    ids: { sessionId: () => "ses_tmua-journey-test", eventId: () => "evt_tmua-journey-test" },
  };
}

function activeSession(): PracticeSession {
  return {
    ...createPracticeSession({ id: "ses_resume-test", learningSpaceId: FIXED_GUEST_SPACE.id, actor: { kind: "guest", actorId: FIXED_GUEST_SPACE.ownerActorId }, startedAt: "2026-07-13T08:30:00.000Z", eventId: "evt_resume-started" }),
    answers: { "tmua-2023-p1-q01": "F" },
  };
}

describe("TMUA staged preparation journey", () => {
  it("keeps the overview English-first and routes to the course profile", async () => {
    const router = createAppRouter(["/exams/tmua"], services());
    render(<RouterProvider router={router} />);

    expect(await screen.findByRole("heading", { level: 1, name: /Know your starting point.*Practise with purpose/u })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Add course profile" })).toHaveAttribute("href", "/exams/tmua/profile");
    expect(screen.getByRole("heading", { name: "Prepare for TMUA in four steps" })).toBeInTheDocument();
    const summary = screen.getByRole("group", { name: "TMUA paper library" });
    expect(summary).toHaveTextContent("COMPLETE PAPERS18");
    expect(summary).toHaveTextContent("QUESTIONS360");
    expect(screen.getByText(/No name, phone number or WeChat is required/u)).toBeInTheDocument();
  });

  it("saves a preparation profile and advances to coverage", async () => {
    const user = userEvent.setup();
    const profileStore = new JourneyProfileStore();
    const router = createAppRouter(["/exams/tmua/profile"], services(new JourneySessionStore(), profileStore));
    render(<RouterProvider router={router} />);

    await screen.findByRole("heading", { name: /Tell us what you study/u });
    await user.click(await screen.findByRole("radio", { name: /CAIE/u }));
    await user.click(screen.getByRole("checkbox", { name: /Mathematics \(9709\)/u }));
    const modules = screen.getByLabelText(/Mathematics \(9709\) modules/u);
    await user.click(within(modules).getByRole("checkbox", { name: /Pure Mathematics 1/u }));
    await user.click(screen.getByRole("radio", { name: /A few questions/u }));
    await user.click(screen.getByRole("button", { name: "Save and view coverage" }));

    expect(profileStore.saved).toMatchObject({ curriculumSystem: "caie", selections: [{ qualificationId: "caie-9709-2026-2027", unitIds: ["p1"] }] });
    expect(router.state.location.pathname).toBe("/exams/tmua/coverage");
    expect(await screen.findByRole("heading", { name: /Course Coverage & Learning Plan/u })).toBeInTheDocument();
  });

  it("requires a course profile before personalised modules or direct practice", async () => {
    const dashboardRouter = createAppRouter(["/exams/tmua/dashboard"], services());
    const rendered = render(<RouterProvider router={dashboardRouter} />);
    expect(await screen.findByRole("heading", { name: /Complete your course profile first/u })).toBeInTheDocument();
    rendered.unmount();

    const paperRouter = createAppRouter(["/practice/tmua-2023-p1"], services(new JourneySessionStore({ session: activeSession(), issue: null })));
    render(<RouterProvider router={paperRouter} />);
    expect(await screen.findByRole("heading", { name: /Complete your course profile first/u })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /Question 1/u })).not.toBeInTheDocument();
  });

  it("shows deterministic coverage without calling it mastery", async () => {
    const router = createAppRouter(["/exams/tmua/coverage"], services(new JourneySessionStore(), new JourneyProfileStore(profile())));
    render(<RouterProvider router={router} />);

    expect(await screen.findByLabelText("7 of 10 topics covered")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /7 areas are covered/u })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Coverage is not mastery/u })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Algebra & Functions/u })).toBeInTheDocument();
    expect(screen.getAllByRole("heading", { name: "Covered: review only; no additional course is needed now." })).toHaveLength(7);
    expect(screen.getByText(/Generated from fixed curriculum mappings; no live AI call/u)).toBeInTheDocument();
  });

  it("redirects the retired diagnostic URL to the complete paper library", async () => {
    const router = createAppRouter(["/exams/tmua/diagnostic"], services(new JourneySessionStore(), new JourneyProfileStore(profile())));
    render(<RouterProvider router={router} />);

    expect(await screen.findByRole("heading", { name: /Choose a past paper/u })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe("/exams/tmua/past-papers");
    expect(screen.queryByText(/30-minute|短诊断|起点练习/iu)).not.toBeInTheDocument();
  });

  it("resumes an active session directly from the paper library", async () => {
    const user = userEvent.setup();
    const router = createAppRouter(["/exams/tmua/past-papers"], services(new JourneySessionStore({ session: activeSession(), issue: null }), new JourneyProfileStore(profile())));
    render(<RouterProvider router={router} />);

    await user.click(await screen.findByRole("link", { name: /Resume/u }));
    expect(router.state.location.pathname).toBe("/practice/tmua-2023-p1");
  });

  it("makes all 18 papers direct online actions", async () => {
    const router = createAppRouter(["/exams/tmua/past-papers"], services(new JourneySessionStore(), EMPTY_PREPARATION_PROFILE_STORE));
    render(<RouterProvider router={router} />);

    const shelf = await screen.findByRole("list", { name: "Historical Papers" });
    expect(within(shelf).getAllByRole("listitem")).toHaveLength(18);
    const practiceLinks = within(shelf).getAllByRole("link");
    expect(practiceLinks).toHaveLength(18);
    expect(practiceLinks.every((link) => !link.getAttribute("href")?.endsWith("/start"))).toBe(true);
    expect(within(shelf).getByRole("link", { name: "Early specimen, Paper 1, 20 questions. Start." })).toHaveAttribute("href", "/practice/tmua-specimen-p1");
    const facts = screen.getByRole("list", { name: "TMUA practice facts" });
    expect(facts).toHaveTextContent("18 complete papers");
    expect(facts).toHaveTextContent("360 questions");
    expect(facts).toHaveTextContent("All online");
  });
});
