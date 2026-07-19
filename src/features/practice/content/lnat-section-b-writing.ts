import rawPaper from "../../../../content/lnat/original-practice/section-b-writing-v1.json" with { type: "json" };
import { loadOriginalEssayPaper } from "./original-essay-paper.js";

export const LNAT_SECTION_B_WRITING = loadOriginalEssayPaper(rawPaper, {
  id: "lnat-section-b-writing-v1",
  exam: "LNAT",
  sectionId: "section-b",
  sourcePath: "content/lnat/original-practice/section-b-writing-v1.json",
});
