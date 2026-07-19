export interface EssayResponse {
  readonly promptId: string;
  readonly text: string;
}

const emptyEssayResponse: EssayResponse = { promptId: "", text: "" };

export function parseEssayResponse(value: string | undefined): EssayResponse {
  if (value === undefined || value === "") return emptyEssayResponse;
  try {
    const parsed = JSON.parse(value) as unknown;
    if (
      parsed !== null &&
      typeof parsed === "object" &&
      !Array.isArray(parsed) &&
      typeof (parsed as { promptId?: unknown }).promptId === "string" &&
      typeof (parsed as { text?: unknown }).text === "string"
    ) {
      return {
        promptId: (parsed as { promptId: string }).promptId,
        text: (parsed as { text: string }).text,
      };
    }
  } catch {
    return emptyEssayResponse;
  }
  return emptyEssayResponse;
}

export function serializeEssayResponse(response: EssayResponse): string {
  return JSON.stringify({ promptId: response.promptId, text: response.text });
}

export function countEssayWords(text: string): number {
  return text.match(/[\p{Script=Han}]|[\p{L}\p{N}]+(?:['’\-][\p{L}\p{N}]+)*/gu)?.length ?? 0;
}

export function essayResponseIsComplete(value: string | undefined): boolean {
  const response = parseEssayResponse(value);
  return response.promptId !== "" && countEssayWords(response.text) > 0;
}
