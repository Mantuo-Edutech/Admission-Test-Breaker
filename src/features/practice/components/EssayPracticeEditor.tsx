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
          <h1 id="essay-practice-title">选择一道题，完成限时论证</h1>
        </div>
        <span>三选一</span>
      </header>

      <fieldset className="essay-prompt-list">
        <legend>先选择写作题目</legend>
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
          <label htmlFor="essay-response">你的论证 · Your response</label>
          <span className={wordCount >= task.maxWords ? "is-limit" : ""}>{wordCount} / {task.maxWords} words</span>
        </div>
        <textarea
          id="essay-response"
          value={response.text}
          maxLength={20_000}
          disabled={response.promptId === ""}
          placeholder={response.promptId === "" ? "请先选择一道题目" : "Write a clear argument, consider a serious objection, and reach a justified conclusion."}
          onChange={(event) => update(response.promptId, event.target.value)}
        />
        <footer>
          <span>草稿会自动保存到当前学习空间</span>
          {task.recommendedWords !== undefined && (
            <span>建议 {task.recommendedWords.min}–{task.recommendedWords.max} 词</span>
          )}
        </footer>
      </div>
    </article>
  );
}
