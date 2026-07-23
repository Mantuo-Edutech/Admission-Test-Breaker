import rawPaper from "../../../../content/tara/original-practice/writing-task-v1.json" with { type: "json" };
import { loadOriginalEssayPaper } from "./original-essay-paper.js";

export const TARA_WRITING_TASK = loadOriginalEssayPaper(rawPaper, {
  id: "tara-writing-task-v1",
  exam: "TARA",
  sectionId: "writing-task",
  sourcePath: "content/tara/original-practice/writing-task-v1.json",
});
