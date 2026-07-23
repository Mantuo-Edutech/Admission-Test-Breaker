import { describe, expect, it } from "vitest";
import { AuthAwarePracticeSessionStore } from "../../../src/features/learner-data/auth-aware-practice-store.js";
import { AuthAwarePreparationProfileStore } from "../../../src/features/learner-data/auth-aware-profile-store.js";
import type {
  AuthenticatedLearnerContext,
  LearnerDataRepository,
} from "../../../src/features/learner-data/repository.js";
import { createPracticeSession, type PracticeSession } from "../../../src/features/practice/domain/session.js";
import type { PracticeSessionStore } from "../../../src/features/practice/storage/store.js";
import { createPreparationProfile, type PreparationProfile } from "../../../src/features/preparation-profile/domain.js";
import type { PreparationProfileStore } from "../../../src/features/preparation-profile/storage/store.js";

const context: AuthenticatedLearnerContext = {
  authUserId: "auth-alice",
  platformUserId: "usr_alice",
  learnerSpaceId: "lsp_alice",
};

function guestSession(): PracticeSession {
  return createPracticeSession({
    id: "ses_claim-one",
    learningSpaceId: "gsp_device-one",
    actor: { kind: "guest", actorId: "guest_device-one" },
    paperId: "tmua-2023-p1",
    startedAt: "2026-07-18T00:00:00.000Z",
    eventId: "evt_claim-start",
  });
}

function studentSession(source = guestSession()): PracticeSession {
  const actor = { kind: "student" as const, userId: "usr_alice" as const };
  return {
    ...source,
    learningSpaceId: "lsp_alice",
    startedBy: actor,
    events: source.events.map((event) => ({
      ...event,
      learningSpaceId: "lsp_alice",
      actor,
    })),
  };
}

function profile(guestSpaceId = "gsp_device-one"): PreparationProfile {
  return createPreparationProfile({
    guestSpaceId,
    exam: "TMUA",
    entryCycle: "2027",
    curriculumSystem: "caie",
    selections: [
      { qualificationId: "caie-9709-2026-2027", unitIds: ["p1", "s1"] },
    ],
    experience: "sampled",
    createdAt: "2026-07-18T00:00:00.000Z",
    updatedAt: "2026-07-18T00:00:00.000Z",
  });
}

class FakePracticeStore implements PracticeSessionStore {
  saves: PracticeSession[] = [];
  clears = 0;

  constructor(public session: PracticeSession | null) {}

  async loadCurrent() {
    return { session: this.session, issue: null } as const;
  }

  async save(session: PracticeSession) {
    this.session = session;
    this.saves.push(session);
    return { persisted: true };
  }

  async clearCurrent() {
    this.session = null;
    this.clears += 1;
  }
}

class FakeProfileStore implements PreparationProfileStore {
  saves: PreparationProfile[] = [];
  clears: string[] = [];

  constructor(public value: PreparationProfile | null) {}

  async load() {
    return { profile: this.value, issue: null } as const;
  }

  async save(value: PreparationProfile) {
    this.value = value;
    this.saves.push(value);
    return { persisted: true };
  }

  async clear(guestSpaceId: `gsp_${string}`) {
    this.value = null;
    this.clears.push(guestSpaceId);
  }
}

class FakeRepository implements LearnerDataRepository {
  savedSessions: PracticeSession[] = [];
  savedProfiles: PreparationProfile[] = [];
  deletedProfiles = 0;
  failSave = false;

  constructor(
    public authenticated: boolean,
    public cloudSession: PracticeSession | null = null,
    public cloudProfile: PreparationProfile | null = null,
  ) {}

  async currentContext() {
    return this.authenticated ? context : null;
  }

  async loadPreparationProfile() {
    return this.cloudProfile;
  }

  async savePreparationProfile(value: PreparationProfile) {
    if (this.failSave) throw new Error("remote unavailable");
    this.savedProfiles.push(value);
    this.cloudProfile = value;
    return value;
  }

  async deletePreparationProfile() {
    this.deletedProfiles += 1;
    this.cloudProfile = null;
  }

  async loadCurrentPracticeSession() {
    return this.cloudSession;
  }

  async listPracticeSessions() {
    return this.cloudSession === null ? [] : [this.cloudSession];
  }

  async savePracticeSession(value: PracticeSession) {
    if (this.failSave) throw new Error("remote unavailable");
    this.savedSessions.push(value);
    this.cloudSession = studentSession(value);
    return this.cloudSession;
  }
}

describe("auth-aware learner data stores", () => {
  it("keeps anonymous practice in the local Guest Space", async () => {
    const local = new FakePracticeStore(null);
    const repository = new FakeRepository(false);
    const store = new AuthAwarePracticeSessionStore(local, repository);

    await expect(store.save(guestSession())).resolves.toEqual({ persisted: true });
    expect(local.saves).toHaveLength(1);
    expect(repository.savedSessions).toHaveLength(0);
  });

  it("claims a newer local Guest session once and removes the shared local copy", async () => {
    const local = new FakePracticeStore(guestSession());
    const repository = new FakeRepository(true);
    const store = new AuthAwarePracticeSessionStore(local, repository);

    const loaded = await store.loadCurrent();

    expect(repository.savedSessions).toEqual([guestSession()]);
    expect(loaded.session?.learningSpaceId).toBe("lsp_alice");
    expect(loaded.session?.startedBy).toEqual({ kind: "student", userId: "usr_alice" });
    expect(local.clears).toBe(1);
  });

  it("never writes signed-in practice into the unscoped local store when cloud sync fails", async () => {
    const local = new FakePracticeStore(null);
    const repository = new FakeRepository(true);
    repository.failSave = true;
    const store = new AuthAwarePracticeSessionStore(local, repository);

    await expect(store.save(guestSession())).resolves.toEqual({
      persisted: false,
      durable: false,
      issue: "unavailable",
      scope: "memory",
    });
    expect(local.saves).toHaveLength(0);
    await expect(store.loadCurrent()).resolves.toEqual({
      session: guestSession(),
      issue: "unavailable",
      scope: "memory",
    });
  });

  it("loads an authenticated cloud profile and rebinds only its device-facing Guest ID", async () => {
    const local = new FakeProfileStore(null);
    const repository = new FakeRepository(true, null, profile("gsp_previous-device"));
    const store = new AuthAwarePreparationProfileStore(local, repository);

    const loaded = await store.load("gsp_current-device");

    expect(loaded.profile?.guestSpaceId).toBe("gsp_current-device");
    expect(loaded.profile?.selections).toEqual(profile().selections);
    expect(repository.savedProfiles).toHaveLength(0);
    expect(local.clears).toEqual(["gsp_current-device"]);
  });

  it("does not silently fall back to shared local persistence for an authenticated profile", async () => {
    const local = new FakeProfileStore(null);
    const repository = new FakeRepository(true);
    repository.failSave = true;
    const store = new AuthAwarePreparationProfileStore(local, repository);

    await expect(store.save(profile())).resolves.toEqual({
      persisted: false,
      durable: false,
      issue: "unavailable",
    });
    expect(local.saves).toHaveLength(0);
  });
});
