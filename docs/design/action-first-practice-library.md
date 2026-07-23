# Action-first practice library

Status: active  
Date: 2026-07-23

## User task

The online-practice page answers one question: **“Which practice can I start now?”**
It is not a content brochure, an ingestion report or an internal review dashboard.

The shortest supported path is:

```text
open online practice → recognise the paper/module → select a complete card → enter question 1
```

## Shared page contract

Every exam practice library uses the shared `PracticeLibraryHero` and
`PracticeEntrySection` components.

The first viewport contains:

1. one bilingual action heading;
2. one sentence explaining the immediate action;
3. at most three decision-relevant facts;
4. an optional active-session continuation;
5. the first row of complete, clickable practice entries.

Every entry is one link. A year, edition, module or paper label must never look
like a primary interaction unless it is itself actionable. When an edition has
Paper 1 and Paper 2, each paper is a separate entry and the edition becomes
compact metadata.

## Information hierarchy

| Priority | Student-facing content | Presentation |
| --- | --- | --- |
| 1 | What can I start? | Entire clickable card, title and arrow |
| 2 | Which paper/module is it? | Paper/module title plus edition or section label |
| 3 | What commitment does it require? | Question count and duration |
| 4 | How much is available? | At most three compact facts in the hero |
| Internal | Source extraction, conversion, review, validation and publication status | Never shown on a public practice page |

Long explanations of question structure, scoring and content belong inside the
practice experience or the exam overview. They must not be repeated between the
student and the first question.

## Density and responsive rules

- Desktop cards target a minimum height of 10.5rem rather than a full editorial panel.
- Phone cards target 9.5rem and remain one column.
- The title, metadata and action must remain readable without hover.
- Icons reinforce entry type (`paper`, `diagnostic`, `writing`) but never replace text.
- Every section list and every card has an accessible name.
- Public copy must not contain internal workflow terms such as 审核、校验、转换 or 归档.

## Verification

Page tests must assert:

- the exact count of direct practice links;
- no fake edition headings in the paper grid;
- all public cards lead directly to `/practice/:paperId`;
- no internal review or ingestion vocabulary;
- the shared page heading, facts list and section list have accessible names.

Responsive browser checks cover phone, tablet and desktop, including horizontal
overflow and first-row visibility.
