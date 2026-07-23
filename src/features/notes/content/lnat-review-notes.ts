import rawLnatReviewNotes from "../../../../content/notes/lnat/reading-writing-foundations-v1.json" with { type: "json" };
import { validateReviewNotesDocument } from "./review-notes.js";

export const LNAT_REVIEW_NOTES = validateReviewNotesDocument(rawLnatReviewNotes);
