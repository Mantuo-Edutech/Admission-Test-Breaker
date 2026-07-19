import rawEsatMathematicsNotes from "../../../../content/notes/esat/mathematics-foundations-v1.json" with { type: "json" };
import rawEsatScienceNotes from "../../../../content/notes/esat/sciences-foundations-v1.json" with { type: "json" };
import { validateReviewNotesDocument } from "./review-notes.js";

export const ESAT_MATHEMATICS_REVIEW_NOTES = validateReviewNotesDocument(rawEsatMathematicsNotes);
export const ESAT_SCIENCE_REVIEW_NOTES = validateReviewNotesDocument(rawEsatScienceNotes);
