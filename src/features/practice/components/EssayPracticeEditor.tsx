import type { PracticeEssayTask } from "../content/types.js";
import {
  countEssayWords,
  parseEssayResponse,
  serializeEssayResponse,
} from "../domain/essay-response.js";

interface EssayPracticeEditorProps {
  task: PracticeEssayTask;
  value: string | undefined;
  onChange(value: string): void;
}

export function EssayPracticeEditor({ task, value, onChange }: EssayPracticeEditorProps) {
  const response = parseEssayResponse(value);
  const wordCount = countEssayWords(response.text);

  function update(promptId: string, text: string) {
    if (countEssayWords(text) > task.maxWords) return;
    onChange(serializeEssayResponse({ promptId, text }));
  }

  return (
    <article className="essay-practice-card" aria-labelledby="essay-practice-title">
      <header>
        <div>
          <p>CHOOSE ONE PROMPT · WRITE IN ENGLISH</p>
          <h1 id="essay-practice-title">Choose one prompt and build your argument<small lang="zh-CN">选择一道题，完成限时论证</small></h1>
        </div>
        <span>Choose 1 of 3</span>
      </header>

      <fieldset className="essay-prompt-list">
        <legend>Choose your writing prompt</legend>
        {task.prompts.map((prompt, index) => (
          <label key={prompt.id} className={response.promptId === prompt.id ? "is-selected" : ""}>
            <input
              type="radio"
              name="essay-prompt"
              value={prompt.id}
              checked={response.promptId === prompt.id}
              onChange={() => update(prompt.id, response.text)}
            />
            <span>{String(index + 1).padStart(2, "0")}</span>
            <div><strong>{prompt.title}</strong><p>{prompt.prompt}</p></div>
          </label>
        ))}
      </fieldset>

      <div className="essay-editor">
        <div>
          <label htmlFor="essay-response">Your response <small>你的论证</small></label>
          <span className={wordCount >= task.maxWords ? "is-limit" : ""}>{wordCount} / {task.maxWords} words</span>
        </div>
        <textarea
          id="essay-response"
          value={response.text}
          maxLength={20_000}
          disabled={response.promptId === ""}
          placeholder={response.promptId === "" ? "Choose a prompt first" : "Write a clear argument, consider a serious objection, and reach a justified conclusion."}
          onChange={(event) => update(response.promptId, event.target.value)}
        />
        <footer>
          <span>Your draft is saved automatically</span>
          {task.recommendedWords !== undefined && (
            <span>Recommended: {task.recommendedWords.min}–{task.recommendedWords.max} words</span>
          )}
        </footer>
      </div>
    </article>
  );
}
