import rawTaraReviewNotes from "../../../../content/notes/tara/reasoning-writing-foundations-v1.json" with { type: "json" };
import { validateReviewNotesDocument } from "./review-notes.js";

export const TARA_REVIEW_NOTES = validateReviewNotesDocument(rawTaraReviewNotes);
