import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

type SpecimenReview = {
  explanations: Array<{
    methodZh: string;
    keyIdeaZh: string;
    steps: Array<{ bodyZh: string }>;
  }>;
};

type SixWeekPlan = {
  principles: Array<{ bodyZh: string }>;
  weeklyPlan: Array<{
    sessions: Array<{ actionsZh: string[] }>;
  }>;
  benchmarkBoundary: { bodyZh: string };
};

type PublicPracticeArtifact = {
  packages: Array<{
    paperRevisionId: string;
    payload: {
      questions: Array<{
        prompt: Array<{ kind: string; runs?: Array<{ kind: string; value?: string }> }>;
      }>;
    };
  }>;
};

type PrivateAnswerArtifact = {
  packages: Array<{
    paperRevisionId: string;
    answerKey: { questions: Array<{ correctAnswer: string }> };
  }>;
};

const textExtensions = new Set([".css", ".html", ".js", ".json", ".map", ".txt"]);

async function listTextFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const entryPath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        return listTextFiles(entryPath);
      }

      return textExtensions.has(path.extname(entry.name)) ? [entryPath] : [];
    }),
  );

  return files.flat();
}

async function parseJson<T>(filePath: string): Promise<T> {
  return JSON.parse(await readFile(filePath, "utf8")) as T;
}

const specimen = await parseJson<SpecimenReview>(
  "content/notes/tmua/specimen-p1-worked-explanations-v1.json",
);
const sixWeekPlan = await parseJson<SixWeekPlan>(
  "content/notes/tmua/six-week-review-plan-v1.json",
);
const publicPractice = await parseJson<PublicPracticeArtifact>(
  "content/practice/server-delivery/public-paper-payloads.json",
);
const privateAnswers = await parseJson<PrivateAnswerArtifact>(
  "content/practice/server-delivery/private-answer-keys.json",
);

const sentinels = [
  specimen.explanations[2]?.keyIdeaZh,
  specimen.explanations[10]?.keyIdeaZh,
  specimen.explanations[19]?.steps[0]?.bodyZh,
  sixWeekPlan.principles[0]?.bodyZh,
  sixWeekPlan.weeklyPlan[0]?.sessions[0]?.actionsZh[0],
  sixWeekPlan.benchmarkBoundary.bodyZh,
];

if (sentinels.some((sentinel) => typeof sentinel !== "string" || sentinel.length < 12)) {
  throw new Error("Private content sentinel selection is incomplete or too weak.");
}

const files = await listTextFiles("dist");
const bundleText = (
  await Promise.all(files.map((filePath) => readFile(filePath, "utf8")))
).join("\n");
const leaks = sentinels.filter((sentinel) => bundleText.includes(sentinel as string));

const answerSequenceLeaks = privateAnswers.packages
  .map((item) => ({
    paperRevisionId: item.paperRevisionId,
    signature: JSON.stringify(item.answerKey.questions.map((question) => question.correctAnswer)),
  }))
  .filter((item) => item.signature.length >= 32 && bundleText.includes(item.signature));

const embeddedPaperLeaks = publicPractice.packages.flatMap((item) => {
  const candidate = item.payload.questions
    .flatMap((question) => question.prompt)
    .flatMap((block) => block.runs ?? [])
    .map((run) => run.value ?? "")
    .filter((value) => value.length >= 90)
    .sort((left, right) => right.length - left.length)[0];
  return candidate !== undefined && bundleText.includes(candidate)
    ? [{ paperRevisionId: item.paperRevisionId, sentinel: candidate }]
    : [];
});

if (leaks.length > 0 || answerSequenceLeaks.length > 0 || embeddedPaperLeaks.length > 0) {
  throw new Error(
    `Protected or server-delivered practice content was found in the public bundle:\n${[
      ...leaks.map((leak) => `- protected content: ${leak}`),
      ...answerSequenceLeaks.map((leak) => `- complete answer sequence: ${leak.paperRevisionId}`),
      ...embeddedPaperLeaks.map((leak) => `- embedded paper payload: ${leak.paperRevisionId}`),
    ].join("\n")}`,
  );
}

console.log(
  `Private bundle boundary: PASS (${sentinels.length} protected-body sentinels, ${privateAnswers.packages.length} answer sequences and ${publicPractice.packages.length} server paper payloads absent from ${files.length} files)`,
);
