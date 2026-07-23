import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

interface Assessment {
  decision: "ready" | "not-ready";
  readinessScore: number;
  dimensions: Array<{ weight: number; score: number }>;
  gates: Array<{ priority: "P0" | "P1"; status: "verified" | "partial" | "incomplete" }>;
}

describe("100-person beta release decision", () => {
  it("cannot claim readiness while any P0 gate is incomplete", async () => {
    const assessment = JSON.parse(
      await readFile("content/platform/beta-100-readiness.json", "utf8"),
    ) as Assessment;
    const calculated = Math.round(
      assessment.dimensions.reduce((sum, dimension) => sum + dimension.weight * dimension.score, 0) / 100,
    );
    const incompleteP0 = assessment.gates.filter(
      (gate) => gate.priority === "P0" && gate.status !== "verified",
    );

    expect(calculated).toBe(assessment.readinessScore);
    expect(incompleteP0.length).toBeGreaterThan(0);
    expect(assessment.decision).toBe("not-ready");
  });

  it("exposes a non-blocking audit and a strict release gate", async () => {
    const packageJson = JSON.parse(await readFile("package.json", "utf8")) as {
      scripts: Record<string, string>;
    };
    expect(packageJson.scripts["beta:audit"]).toBe("tsx scripts/check-beta-readiness.ts");
    expect(packageJson.scripts["beta:gate"]).toBe("tsx scripts/check-beta-readiness.ts --require-ready");
  });
});
