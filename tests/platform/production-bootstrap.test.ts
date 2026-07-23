import { describe, expect, it } from "vitest";
import {
  assessProductionBootstrap,
  isValidProductionVariable,
  type ProductionBootstrapRequirements,
  type ProductionBootstrapSnapshot,
} from "../../src/platform/production-bootstrap.js";

const requirements: ProductionBootstrapRequirements = {
  schemaVersion: 1,
  policyVersion: "1.0.0",
  repository: "Mantuo-Edutech/Admission-Test-Breaker",
  requiredWorkflowFiles: [".github/workflows/verify.yml", ".github/workflows/deploy-supabase.yml"],
  environments: [
    {
      name: "staging",
      requiredSecrets: ["SUPABASE_ACCESS_TOKEN", "SUPABASE_PROJECT_REF"],
      requiredVariables: ["PUBLIC_APP_ORIGIN"],
      minimumRequiredReviewers: 0,
    },
    {
      name: "production",
      requiredSecrets: ["SUPABASE_ACCESS_TOKEN", "SUPABASE_PROJECT_REF"],
      requiredVariables: ["PUBLIC_APP_ORIGIN"],
      minimumRequiredReviewers: 1,
    },
  ],
  manualProductionGates: [{ id: "smtp", label: "可信 SMTP" }],
};

function completeSnapshot(): ProductionBootstrapSnapshot {
  return {
    repository: requirements.repository,
    githubAuthenticated: true,
    githubScopes: ["repo", "workflow"],
    workflowFiles: {
      ".github/workflows/verify.yml": true,
      ".github/workflows/deploy-supabase.yml": true,
    },
    environments: [
      {
        name: "staging",
        exists: true,
        secretNames: ["SUPABASE_ACCESS_TOKEN", "SUPABASE_PROJECT_REF"],
        variables: { PUBLIC_APP_ORIGIN: "https://staging.practice.mantuo.cn/" },
        requiredReviewerCount: 0,
      },
      {
        name: "production",
        exists: true,
        secretNames: ["SUPABASE_ACCESS_TOKEN", "SUPABASE_PROJECT_REF"],
        variables: { PUBLIC_APP_ORIGIN: "https://practice.mantuo.cn/" },
        requiredReviewerCount: 1,
      },
    ],
    git: {
      branch: "main",
      headSha: "a".repeat(40),
      clean: true,
      pushedHeadMatches: true,
      successfulVerifyRun: true,
    },
    dockerAvailable: true,
  };
}

describe("production bootstrap assessment", () => {
  it("validates every supported public SMTP control-plane variable", () => {
    expect(isValidProductionVariable("SMTP_HOST", "smtp.resend.com")).toBe(true);
    expect(isValidProductionVariable("SMTP_PORT", "587")).toBe(true);
    expect(isValidProductionVariable("SMTP_ADMIN_EMAIL", "no-reply@auth.uktest.cc")).toBe(true);
    expect(isValidProductionVariable("SMTP_SENDER_NAME", "满托 UK Test")).toBe(true);
    expect(isValidProductionVariable("SMTP_HOST", "smtp.example.com")).toBe(false);
    expect(isValidProductionVariable("SMTP_HOST", "smtp.invalid")).toBe(false);
    expect(isValidProductionVariable("SMTP_HOST", "127.0.0.1")).toBe(false);
    expect(isValidProductionVariable("SMTP_PORT", "25")).toBe(false);
    expect(isValidProductionVariable("SMTP_PORT", "587.0")).toBe(false);
    expect(isValidProductionVariable("UNKNOWN", "value")).toBe(false);
  });

  it("separates machine-ready GitHub setup from manual production evidence", () => {
    const report = assessProductionBootstrap(requirements, completeSnapshot());

    expect(report.githubSetupReady).toBe(true);
    expect(report.releaseCandidateReady).toBe(true);
    expect(report.readyForBeta).toBe(false);
    expect(report.summary).toMatchObject({ failed: 0, manual: 1 });
  });

  it("reports every missing environment secret without ever needing its value", () => {
    const snapshot = completeSnapshot();
    const report = assessProductionBootstrap(requirements, {
      ...snapshot,
      environments: snapshot.environments.map((environment) =>
        environment.name === "production"
          ? { ...environment, exists: false, secretNames: [], variables: {}, requiredReviewerCount: 0 }
          : environment),
    });

    expect(report.githubSetupReady).toBe(false);
    expect(report.checks).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: "environment-production", status: "failed" }),
      expect.objectContaining({ id: "production-secret-SUPABASE_ACCESS_TOKEN", status: "failed" }),
      expect.objectContaining({ id: "production-secret-SUPABASE_PROJECT_REF", status: "failed" }),
    ]));
  });

  it("rejects placeholder/non-HTTPS public origins and missing approval protection", () => {
    const snapshot = completeSnapshot();
    const report = assessProductionBootstrap(requirements, {
      ...snapshot,
      environments: snapshot.environments.map((environment) =>
        environment.name === "production"
          ? {
              ...environment,
              variables: { PUBLIC_APP_ORIGIN: "http://127.0.0.1:57145" },
              requiredReviewerCount: 0,
            }
          : environment),
    });

    expect(report.checks.find((item) =>
      item.id === "production-variable-PUBLIC_APP_ORIGIN")?.status).toBe("failed");
    expect(report.checks.find((item) => item.id === "production-reviewers")?.status).toBe("failed");
  });

  it("does not call a dirty or unpushed worktree a release candidate", () => {
    const snapshot = completeSnapshot();
    const report = assessProductionBootstrap(requirements, {
      ...snapshot,
      git: {
        ...snapshot.git,
        branch: "codex/feature",
        clean: false,
        pushedHeadMatches: false,
        successfulVerifyRun: false,
      },
    });

    expect(report.githubSetupReady).toBe(true);
    expect(report.releaseCandidateReady).toBe(false);
    expect(report.checks.find((item) => item.id === "git-clean")?.status).toBe("failed");
    expect(report.checks.find((item) => item.id === "git-pushed-head")?.status).toBe("failed");
    expect(report.checks.find((item) => item.id === "git-verified-head")?.status).toBe("failed");
  });
});
