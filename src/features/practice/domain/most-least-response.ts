export interface MostLeastAnswer {
  readonly most?: string;
  readonly least?: string;
}

const optionLabel = /^[A-Z]$/u;

export function parseMostLeastAnswer(value: string | undefined): MostLeastAnswer {
  if (value === undefined || value === "") return {};
  const params = new URLSearchParams(value);
  const most = params.get("most") ?? undefined;
  const least = params.get("least") ?? undefined;
  return {
    ...(most !== undefined && optionLabel.test(most) ? { most } : {}),
    ...(least !== undefined && optionLabel.test(least) ? { least } : {}),
  };
}

export function serializeMostLeastAnswer(answer: MostLeastAnswer): string {
  const params = new URLSearchParams();
  if (answer.most !== undefined) params.set("most", answer.most);
  if (answer.least !== undefined) params.set("least", answer.least);
  return params.toString();
}

export function mostLeastAnswerIsComplete(value: string | undefined): boolean {
  const answer = parseMostLeastAnswer(value);
  return answer.most !== undefined && answer.least !== undefined && answer.most !== answer.least;
}
