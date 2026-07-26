import { readFile } from "node:fs/promises";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeAll, describe, expect, it } from "vitest";
import type { AppServices } from "../../src/app/dependencies.js";
import {
  ESAT_ADVANCED_NOTES_RESOURCE_ID,
  parseAdvancedReviewNotes,
  TARA_ADVANCED_NOTES_RESOURCE_ID,
  type AdvancedReviewNotes,
} from "../../src/features/entitled-content/advanced-review-notes.js";
import type { EntitledContentResult } from "../../src/features/entitled-content/domain.js";
import { AdvancedReviewNotesPage } from "../../src/features/entitled-content/pages/AdvancedReviewNotesPage.js";
import { FIXED_GUEST_SPACE_STORE } from "../support/fixed-guest-space-store.js";
import { FIXED_PREPARATION_PROFILE_STORE } from "../support/fixed-preparation-profile-store.js";

let esatNotes: AdvancedReviewNotes;
let taraNotes: AdvancedReviewNotes;

beforeAll(async () => {
  esatNotes = parseAdvancedReviewNotes(JSON.parse(
    await readFile("content/notes/esat/advanced-review-notes-v1.json", "utf8"),
  ));
  taraNotes = parseAdvancedReviewNotes(JSON.parse(
    await readFile("content/notes/tara/advanced-review-notes-v1.json", "utf8"),
  ));
});

function services(result: EntitledContentResult): AppServices {
  return {
    store: {
      async loadCurrent() { return { session: null, issue: null }; },
      async save() { return { persisted: true }; },
      async clearCurrent() {},
    },
    guestSpaceStore: FIXED_GUEST_SPACE_STORE,
    profileStore: FIXED_PREPARATION_PROFILE_STORE,
    now: () => new Date("2026-07-26T15:00:00.000Z"),
    ids: { sessionId: () => "ses_advanced", eventId: () => "evt_advanced" },
    entitledContent: { configured: true, async load() { return result; } },
  };
}

function available(notes: AdvancedReviewNotes): EntitledContentResult {
  return {
    status: "available",
    resource: {
      id: notes.id,
      title: notes.titleEn,
      revision: 1,
      metadata: {},
      sourceSha256: "a".repeat(64),
      payload: notes,
    },
  };
}

describe("private advanced review notes page", () => {
  it("shows a precise product promise and QR entry without exposing the private body", async () => {
    render(
      <MemoryRouter>
        <AdvancedReviewNotesPage
          services={services({ status: "locked" })}
          examId="esat"
          resourceId={ESAT_ADVANCED_NOTES_RESOURCE_ID}
        />
      </MemoryRouter>,
    );

    expect(await screen.findByRole("heading", { name: /ESAT Advanced Strategy Notes.*ESAT 深度策略笔记/u })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Get an invitation code.*添加冰冰，获取邀请码/u })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /Dimension before number/u })).not.toBeInTheDocument();
  });

  it("filters ESAT private content to the student's selected modules", async () => {
    render(
      <MemoryRouter>
        <AdvancedReviewNotesPage
          services={services(available(esatNotes))}
          examId="esat"
          resourceId={ESAT_ADVANCED_NOTES_RESOURCE_ID}
          visibleModuleIds={["mathematics-1", "physics"]}
        />
      </MemoryRouter>,
    );

    expect(await screen.findByRole("heading", { name: /Mathematics 1 — Quantities, Structure and Decisions/u })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Physics — Model Selection and Physical Checks/u })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /Chemistry — Ratios, Particles and Direction/u })).not.toBeInTheDocument();
    expect(document.querySelectorAll(".advanced-notes-module")).toHaveLength(2);
  });

  it("renders all four TARA pathways only after the backend grants access", async () => {
    render(
      <MemoryRouter>
        <AdvancedReviewNotesPage
          services={services(available(taraNotes))}
          examId="tara"
          resourceId={TARA_ADVANCED_NOTES_RESOURCE_ID}
        />
      </MemoryRouter>,
    );

    expect(await screen.findByRole("heading", { name: /Critical Thinking — Reconstruct the Argument/u })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Writing Task — Build a Defensible Position/u })).toBeInTheDocument();
    expect(document.querySelectorAll(".advanced-notes-module")).toHaveLength(4);
    expect(document.querySelectorAll(".advanced-notes-playbooks > article")).toHaveLength(8);
  });
});
