# Online question typography and density

## Purpose

Most single-choice questions should fit in a normal laptop viewport without
making the student scroll between the prompt and the final option. Long
passages, large diagrams and accessibility zoom remain allowed to scroll.

## Shared tokens

- `--font-exam-serif`: aligns English prose with the KaTeX academic face while
  retaining Chinese Song typeface fallbacks.
- `--font-exam-number`: provides regular-weight lining and tabular numerals.
- `--practice-card-padding`: controls question-card whitespace.
- `--practice-option-min-height`: keeps options compact while exceeding the
  44px pointer target minimum.
- `--practice-option-marker-size`: controls the A/B/C/D marker independently of
  the row height.

## Component rules

1. Question density is changed only through shared tokens or the common
   `QuestionCard` / `AnswerChoice` components.
2. Paragraph margins inside an answer choice are zero; long content expands the
   row naturally.
3. Pure numeric answers use the exam number face. Mathematical expressions and
   units continue to use KaTeX.
4. Figures are capped relative to viewport height, but never cropped.
5. Phone options remain at least 49.6px high and retain keyboard focus styles.

## Regression checks

The layout contract verifies the tokens, compact row rule and scalar-number
rendering. Desktop, tablet and phone screenshots cover representative TMUA,
ESAT Mathematics and ESAT Physics questions before release.
