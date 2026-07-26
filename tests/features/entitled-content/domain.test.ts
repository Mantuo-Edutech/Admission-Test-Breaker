import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import {
  parseTmuaSpecimenP1WorkedExplanations,
  parseTmuaSixWeekPlan,
  TMUA_SPECIMEN_P1_EXPLANATIONS_RESOURCE_ID,
  TMUA_SIX_WEEK_PLAN_RESOURCE_ID,
} from "../../../src/features/entitled-content/domain.js";

describe("TMUA invite-bound review plan schema", () => {
  it("parses the canonical six-week, thirty-session product", async () => {
    const payload = JSON.parse(
      await readFile("content/notes/tmua/six-week-review-plan-v1.json", "utf8"),
    ) as unknown;
    const plan = parseTmuaSixWeekPlan(payload);

    expect(plan.id).toBe(TMUA_SIX_WEEK_PLAN_RESOURCE_ID);
    expect(plan.schemaVersion).toBe(2);
    expect(plan.weeklyPlan).toHaveLength(6);
    expect(plan.weeklyPlan.flatMap((week) => week.sessions)).toHaveLength(30);
    expect(plan.weeklyPlan.flatMap((week) => week.sessions).every((session) => (
      session.titleEn.length > 0
      && session.actionsEn.length === session.actionsZh.length
      && session.evidenceEn.length > 0
    ))).toBe(true);
    expect(plan.errorCodebook.map((item) => item.code)).toEqual(["K", "R", "E", "D", "T"]);
    expect(plan.curriculumAdjustments).toHaveLength(4);
  });

  it("rejects products whose English teaching body is incomplete", async () => {
    const payload = JSON.parse(
      await readFile("content/notes/tmua/six-week-review-plan-v1.json", "utf8"),
    ) as { principles: Array<Record<string, unknown>> };
    delete payload.principles[0]!.bodyEn;

    expect(() => parseTmuaSixWeekPlan(payload)).toThrow(/principles\.bodyEn/u);
  });

  it("pins the database payload to the reviewed canonical source digest", async () => {
    const source = await readFile("content/notes/tmua/six-week-review-plan-v1.json", "utf8");
    const migration = await readFile(
      "supabase/migrations/20260726140000_tmua_six_week_plan_english_first.sql",
      "utf8",
    );
    const digest = createHash("sha256").update(source).digest("hex");

    expect(digest).toBe("4f727b10e93a96e5fef3821476a9c1bd2c115738a6d055f6bcdf1c068c415088");
    expect(migration).toContain(`'${digest}'`);
    expect(migration).toContain('"schemaVersion": 2');
    expect(migration).toContain(source.trim());
  });
});

describe("TMUA specimen Paper 1 worked explanation schema", () => {
  it("pins all 20 explanations to the visually audited paper and answer map", async () => {
    const payload = JSON.parse(
      await readFile("content/notes/tmua/specimen-p1-worked-explanations-v1.json", "utf8"),
    ) as unknown;
    const product = parseTmuaSpecimenP1WorkedExplanations(payload);

    expect(product.id).toBe(TMUA_SPECIMEN_P1_EXPLANATIONS_RESOURCE_ID);
    expect(product.schemaVersion).toBe(2);
    expect(product.explanations).toHaveLength(20);
    expect(product.explanations.map((item) => item.correctAnswer).join("")).toBe(
      "DDBEDDCFADEDCDAEDBDG",
    );
    expect(product.explanations.every((item) => item.steps.length >= 2)).toBe(true);
    expect(product.explanations.every((item) => (
      item.keyIdeaEn.length > 0
      && item.steps.every((step) => step.titleEn.length > 0 && step.bodyEn.length > 0)
      && item.conclusionEn.length > 0
      && item.trapEn.length > 0
      && item.nextDrillEn.length > 0
    ))).toBe(true);
    expect(product.sourceEvidence.fidelityStatus).toBe("visually-verified");
  });

  it("rejects a deep review with an incomplete English explanation", async () => {
    const payload = JSON.parse(
      await readFile("content/notes/tmua/specimen-p1-worked-explanations-v1.json", "utf8"),
    ) as { explanations: Array<Record<string, unknown>> };
    delete payload.explanations[0]!.keyIdeaEn;

    expect(() => parseTmuaSpecimenP1WorkedExplanations(payload)).toThrow(
      /explanations\.0\.keyIdeaEn/u,
    );
  });

  it("rejects a worked explanation whose answer drifts from the verified key", async () => {
    const payload = JSON.parse(
      await readFile("content/notes/tmua/specimen-p1-worked-explanations-v1.json", "utf8"),
    ) as { explanations: Array<Record<string, unknown>> };
    payload.explanations[2]!.correctAnswer = "C";

    expect(() => parseTmuaSpecimenP1WorkedExplanations(payload)).toThrow(
      /verified paper answer map/u,
    );
  });

  it("keeps the generated migration byte-pinned to the canonical content asset", async () => {
    const source = await readFile(
      "content/notes/tmua/specimen-p1-worked-explanations-v1.json",
      "utf8",
    );
    const migration = await readFile(
      "supabase/migrations/20260726143000_tmua_specimen_p1_deep_review_english_first.sql",
      "utf8",
    );
    const digest = createHash("sha256").update(source).digest("hex");

    expect(digest).toBe("83830bf443ee941dae0a2df99be5cbee5ae9280b81568623408d997e71146b76");
    expect(migration).toContain(`'${digest}'`);
    expect(migration).toContain('"schemaVersion": 2');
    expect(migration).toContain(source.trim());
  });
});
