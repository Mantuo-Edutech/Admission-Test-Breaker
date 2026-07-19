import rawUcatReviewNotes from "../../../../content/notes/ucat/four-subtest-foundations-v1.json" with { type: "json" };
import { validateReviewNotesDocument } from "./review-notes.js";

export const UCAT_REVIEW_NOTES = validateReviewNotesDocument(rawUcatReviewNotes);
