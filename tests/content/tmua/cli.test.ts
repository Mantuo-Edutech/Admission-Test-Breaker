import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  runCorpusCli,
  writeCorpusArtifacts,
  type CorpusCliServices,
} from "../../../src/content/tmua/cli.js";
import { validCorpusArtifacts } from "./corpus-fixture.js";

const temporaryRoots: string[] = [];

async function temporaryRoot() {
  const root = await mkdtemp(join(tmpdir(), "tmua-cli-"));
  temporaryRoots.push(root);
  return root;
}

afterEach(async () => {
  await Promise.all(
    temporaryRoots.splice(0).map((root) =>
      rm(root, { recursive: true, force: true }),
    ),
  );
});

function services(input?: {
  issues?: Array<{ severity: "P0"; code: string; message: string }>;
}) {
  const calls: string[] = [];
  const result = async (name: string) => {
    calls.push(name);
    return {
      summary: `${name}: complete`,
      issues: input?.issues ?? [],
    };
  };
  const value: CorpusCliServices = {
    inventory: () => result("inventory"),
    syncOfficial: () => result("sync-official"),
    build: () => result("build"),
    verifyFiles: () => result("verify-files"),
    verifyTaxonomy: () => result("verify-taxonomy"),
    verifyCorpus: () => result("verify-corpus"),
  };
  return { calls, value };
}

const context = {
  cwd: "/workspace",
  env: {},
  now: () => new Date("2026-07-13T00:00:00.000Z"),
};

describe("TMUA corpus CLI dispatch", () => {
  it.each([
    ["inventory", "inventory"],
    ["sync-official", "sync-official"],
    ["build", "build"],
    ["verify-files", "verify-files"],
    ["verify-taxonomy", "verify-taxonomy"],
    ["verify-corpus", "verify-corpus"],
  ])("dispatches %s to only its own service", async (command, expectedCall) => {
    const fake = services();
    const result = await runCorpusCli([command], {
      ...context,
      services: fake.value,
    });

    expect(result).toEqual({
      exitCode: 0,
      stdout: `${expectedCall}: complete\n`,
      stderr: "",
    });
    expect(fake.calls).toEqual([expectedCall]);
  });

  it("accepts raw/output/audit options and rejects unknown flags", async () => {
    const fake = services();
    const valid = await runCorpusCli(
      [
        "build",
        "--raw-dir",
        "./raw",
        "--output-dir",
        "./generated",
        "--audit-at",
        "2026-07-13T01:02:03.000Z",
      ],
      { ...context, services: fake.value },
    );
    const invalid = await runCorpusCli(["build", "--unknown"], {
      ...context,
      services: fake.value,
    });

    expect(valid.exitCode).toBe(0);
    expect(invalid.exitCode).toBe(2);
    expect(invalid.stderr).toMatch(/unknown option.*--unknown/i);
    expect(fake.calls).toEqual(["build"]);
  });

  it("returns exit code 1 when a release service reports P0", async () => {
    const fake = services({
      issues: [
        { severity: "P0", code: "broken", message: "release blocked" },
      ],
    });
    const result = await runCorpusCli(["verify-corpus"], {
      ...context,
      services: fake.value,
    });

    expect(result.exitCode).toBe(1);
    expect(result.stdout).toBe("");
    expect(result.stderr).toContain("P0 broken: release blocked");
  });
});

describe("TMUA generated artifact writer", () => {
  it("atomically writes deterministic JSON and the human audit report", async () => {
    const root = await temporaryRoot();
    const outputDir = join(root, "content", "tmua");
    const reportPath = join(root, "docs", "content", "TMUA_CORPUS_REPORT.md");
    const artifacts = await validCorpusArtifacts();
    const duplicateMap = Object.fromEntries(
      artifacts.manifest.sources.flatMap((source) =>
        [source.canonicalPath, ...source.duplicatePaths].map((path) => [
          path,
          source.id,
        ]),
      ),
    );

    await writeCorpusArtifacts({
      artifacts,
      duplicateMap,
      outputDir,
      reportPath,
    });

    const expectedFiles = [
      "corpus-manifest.json",
      "official-resource-registry.json",
      "public-summary.json",
      "sources/duplicate-map.json",
      "past-papers/index.json",
      "questions/index.json",
    ];
    for (const relativePath of expectedFiles) {
      const text = await readFile(join(outputDir, relativePath), "utf8");
      expect(text.endsWith("\n"), relativePath).toBe(true);
      expect(() => JSON.parse(text), relativePath).not.toThrow();
    }
    const report = await readFile(reportPath, "utf8");
    expect(report).toContain("96 observed imported paths / 46 canonical sources");
    expect(report).toContain("4 official supplements");
    expect(report).toContain("18 papers / 360 question shells / 20 currently published");
    expect(report).toContain("PDF presence is not online-playable status");

    const files = await readdir(root, { recursive: true });
    expect(files.some((file) => file.endsWith(".tmp"))).toBe(false);
  });
});
