import { readFile, readdir } from "node:fs/promises";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import Ajv2020Module from "ajv/dist/2020.js";
import addFormatsModule from "ajv-formats";
import { verifyQuestionImportBundle } from "./extraction.js";
import type {
  QuestionImportBundle,
  QuestionRevisionDraft,
  ValidationIssue,
} from "./types.js";

const Ajv2020 = Ajv2020Module.default;
const addFormats = addFormatsModule.default;

async function readJson<T>(path: string): Promise<T> {
  return JSON.parse(await readFile(path, "utf8")) as T;
}

export interface ExtractionVerificationResult {
  bundles: number;
  questions: number;
  issues: ValidationIssue[];
}

export async function verifyExtractionDirectory(input: {
  stagingDirectory: string;
  schemaPath: string;
}): Promise<ExtractionVerificationResult> {
  const schema = await readJson<Record<string, unknown>>(input.schemaPath);
  const ajv = new Ajv2020({ allErrors: true });
  addFormats(ajv);
  const validateQuestion = ajv.compile(schema);
  const entries = await readdir(input.stagingDirectory, { withFileTypes: true });
  const directories = entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
  const issues: ValidationIssue[] = [];
  let questions = 0;

  for (const directory of directories) {
    const root = join(input.stagingDirectory, directory);
    let bundle: QuestionImportBundle;
    try {
      bundle = await readJson<QuestionImportBundle>(join(root, "bundle.json"));
    } catch (error) {
      issues.push({
        severity: "P0",
        code: "extraction-bundle-readable",
        message: error instanceof Error ? error.message : String(error),
        path: directory,
      });
      continue;
    }
    questions += bundle.questions.length;
    issues.push(...verifyQuestionImportBundle(bundle));

    const ids = bundle.questions.map((question) => question.id);
    if (new Set(ids).size !== ids.length) {
      issues.push({
        severity: "P0",
        code: "extraction-question-id-unique",
        message: `${bundle.id} contains duplicate question IDs`,
        path: directory,
      });
    }

    for (const question of bundle.questions) {
      const schemaValid: boolean = validateQuestion(question) as boolean;
      if (!schemaValid) {
        issues.push({
          severity: "P0",
          code: "extraction-question-schema",
          message: ajv.errorsText(validateQuestion.errors, { separator: "; " }),
          path: `${directory}/${question.id}`,
        });
      }
      try {
        const standalone = await readJson<QuestionRevisionDraft>(
          join(root, "questions", `${question.id}.json`),
        );
        if (JSON.stringify(standalone) !== JSON.stringify(question)) {
          issues.push({
            severity: "P0",
            code: "extraction-question-drift",
            message: `${question.id} differs between bundle and standalone file`,
            path: `${directory}/${question.id}`,
          });
        }
      } catch (error) {
        issues.push({
          severity: "P0",
          code: "extraction-question-readable",
          message: error instanceof Error ? error.message : String(error),
          path: `${directory}/${question.id}`,
        });
      }
    }
  }

  if (directories.length === 0) {
    issues.push({
      severity: "P0",
      code: "extraction-bundle-missing",
      message: "At least one staged extraction bundle is required",
    });
  }
  return { bundles: directories.length, questions, issues };
}

async function main() {
  const cwd = process.cwd();
  const result = await verifyExtractionDirectory({
    stagingDirectory: resolve(cwd, "content/tmua/staging"),
    schemaPath: resolve(cwd, "content/tmua/schemas/question-revision.schema.json"),
  });
  if (result.issues.length > 0) {
    process.stderr.write(
      `${result.issues
        .map((issue) => `${issue.severity} ${issue.code}: ${issue.message}`)
        .join("\n")}\n`,
    );
    process.exitCode = 1;
    return;
  }
  process.stdout.write(
    `Staged extraction bundles: ${result.bundles}\nStaged questions: ${result.questions}\nP0: 0\n`,
  );
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  void main();
}
