import { access, readFile } from "node:fs/promises";
import path from "node:path";

type Status = "verified" | "partial" | "incomplete" | "blocked";

interface Dimension {
  id: string;
  label: string;
  weight: number;
  score: number;
  status: Status;
  evidence: string[];
}

interface Gate {
  id: string;
  priority: "P0" | "P1";
  name: string;
  status: "verified" | "partial" | "incomplete";
  requirement: string;
  evidence: string[];
}

interface ReadinessAssessment {
  schemaVersion: number;
  assessmentRevision: string;
  decision: "ready" | "not-ready";
  readinessScore: number;
  dimensions: Dimension[];
  gates: Gate[];
}

const assessmentPath = path.resolve("content/platform/beta-100-readiness.json");

function safeRelativePath(filePath: string): boolean {
  return !path.isAbsolute(filePath) && !filePath.split(/[\\/]/u).includes("..");
}

async function loadAssessment(): Promise<ReadinessAssessment> {
  const value = JSON.parse(await readFile(assessmentPath, "utf8")) as ReadinessAssessment;
  if (value.schemaVersion !== 1 || !/^\d{4}-\d{2}-\d{2}\.\d+$/u.test(value.assessmentRevision)) {
    throw new Error("Beta readiness assessment header is invalid");
  }
  if (value.dimensions.length === 0 || value.gates.length === 0) {
    throw new Error("Beta readiness assessment must contain dimensions and gates");
  }
  const weight = value.dimensions.reduce((sum, dimension) => sum + dimension.weight, 0);
  if (weight !== 100) throw new Error(`Readiness weights must total 100, received ${weight}`);
  const score = Math.round(
    value.dimensions.reduce((sum, dimension) => sum + dimension.weight * dimension.score, 0) / 100,
  );
  if (score !== value.readinessScore) {
    throw new Error(`Readiness score drift: declared ${value.readinessScore}, calculated ${score}`);
  }
  const p0Incomplete = value.gates.some((gate) => gate.priority === "P0" && gate.status !== "verified");
  if ((p0Incomplete && value.decision !== "not-ready") || (!p0Incomplete && value.decision !== "ready")) {
    throw new Error("Beta decision does not match P0 gate state");
  }
  for (const item of [...value.dimensions, ...value.gates]) {
    if (item.evidence.length === 0) throw new Error(`${item.id} has no evidence`);
    for (const file of item.evidence) {
      if (!safeRelativePath(file)) throw new Error(`${item.id} has unsafe evidence path ${file}`);
      await access(path.resolve(file));
    }
  }
  return value;
}

const assessment = await loadAssessment();
const p0 = assessment.gates.filter((gate) => gate.priority === "P0");
const verifiedP0 = p0.filter((gate) => gate.status === "verified").length;

console.log(`Beta readiness: ${assessment.readinessScore}/100 (${assessment.decision})`);
console.log(`P0 gates: ${verifiedP0}/${p0.length} verified`);
for (const gate of p0.filter((item) => item.status !== "verified")) {
  console.log(`- ${gate.id} ${gate.name}: ${gate.status}`);
}

if (process.argv.includes("--require-ready") && assessment.decision !== "ready") {
  process.exitCode = 1;
}
