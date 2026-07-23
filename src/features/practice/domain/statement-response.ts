import type { PracticeStatement } from "../content/types.js";

export type StatementAnswer = "yes" | "no";
export type StatementAnswers = Readonly<Record<string, StatementAnswer>>;

export function parseStatementAnswers(value: string | undefined): StatementAnswers {
  if (value === undefined || value === "") return {};
  try {
    const candidate = JSON.parse(value) as unknown;
    if (candidate === null || typeof candidate !== "object" || Array.isArray(candidate)) return {};
    const parsed: Record<string, StatementAnswer> = {};
    for (const [id, answer] of Object.entries(candidate)) {
      if (/^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(id) && (answer === "yes" || answer === "no")) {
        parsed[id] = answer;
      }
    }
    return parsed;
  } catch {
    return {};
  }
}

export function serializeStatementAnswers(answers: StatementAnswers): string {
  return JSON.stringify(Object.fromEntries(Object.entries(answers).sort(([left], [right]) => left.localeCompare(right))));
}

export function statementSetIsComplete(
  statements: readonly Pick<PracticeStatement, "id">[],
  value: string | undefined,
): boolean {
  const answers = parseStatementAnswers(value);
  return statements.length > 0 && statements.every((statement) => answers[statement.id] !== undefined);
}

export function statementSetCorrectCount(statements: readonly PracticeStatement[], value: string | undefined): number {
  const answers = parseStatementAnswers(value);
  return statements.filter((statement) => answers[statement.id] === statement.correctAnswer).length;
}
