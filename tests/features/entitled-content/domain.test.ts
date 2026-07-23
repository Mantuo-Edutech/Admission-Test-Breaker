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
    expect(plan.weeklyPlan).toHaveLength(6);
    expect(plan.weeklyPlan.flatMap((week) => week.sessions)).toHaveLength(30);
    expect(plan.errorCodebook.map((item) => item.code)).toEqual(["K", "R", "E", "D", "T"]);
    expect(plan.curriculumAdjustments).toHaveLength(4);
  });

  it("rejects incomplete products instead of rendering partial private content", () => {
    expect(() => parseTmuaSixWeekPlan({
      schemaVersion: 1,
      id: TMUA_SIX_WEEK_PLAN_RESOURCE_ID,
      publicationStatus: "published",
    })).toThrow();
  });

  it("pins the database payload to the reviewed canonical source digest", async () => {
    const source = await readFile("content/notes/tmua/six-week-review-plan-v1.json", "utf8");
    const migration = await readFile(
      "supabase/migrations/20260718190000_entitled_content_delivery.sql",
      "utf8",
    );
    const digest = createHash("sha256").update(source).digest("hex");

    expect(digest).toBe("9c1430c1fa10ebe313483b367a65f0516381924528a76638107c2f48298fc438");
    expect(migration).toContain(`'${digest}'`);
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
    expect(product.explanations).toHaveLength(20);
    expect(product.explanations.map((item) => item.correctAnswer).join("")).toBe(
      "DDBEDDCFADEDCDAEDBDG",
    );
    expect(product.explanations.every((item) => item.steps.length >= 2)).toBe(true);
    expect(product.sourceEvidence.fidelityStatus).toBe("visually-verified");
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
      "supabase/migrations/20260718213000_tmua_specimen_p1_deep_review.sql",
      "utf8",
    );
    const digest = createHash("sha256").update(source).digest("hex");

    expect(digest).toBe("25b776e6951dcf79cc7657fc1865df4547fbef5a737fb81eb28ee7e0e4b4233e");
    expect(migration).toContain(`'${digest}'`);
    expect(migration).toContain(source.trim());
  });
});
