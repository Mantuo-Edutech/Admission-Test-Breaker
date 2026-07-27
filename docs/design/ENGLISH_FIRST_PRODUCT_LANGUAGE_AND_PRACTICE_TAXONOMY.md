# English-first product language and practice taxonomy

Status: active design contract  
Version: 2026-07-27

## Product-language hierarchy

The public product is designed for an international-school student who can use English independently and may have only limited Chinese.

1. English carries every primary heading, navigation label, button, field label, status, result and instruction.
2. Chinese is optional supporting copy. When present, it is visually smaller and never required to understand or complete a task.
3. A user must be able to finish every public journey using English alone.
4. Internal operations pages may remain Chinese-first while the operations interface is used only by the current Chinese-speaking team.
5. Auth, validation and system errors must include an actionable English message even when a Chinese explanation is also shown.

### Public action glossary

| Intent | Primary label | Optional Chinese support |
| --- | --- | --- |
| Open a paper | Start | 开始 |
| Submit a paper | Submit paper | 提交试卷 |
| Save a profile | Save and continue | 保存并继续 |
| Change selection | Change programme or modules | 修改专业或模块 |
| Open notes | Read notes | 查看笔记 |
| Sign in | Sign in | 登录 |

## Public practice types

Only two practice types are promoted in a public exam library:

- **Historical Paper**: a complete historical paper or a complete historical module paper.
- **Full Mock**: a complete mock aligned to a current exam module or section. A timed writing task is treated as its section's full mock.

Short diagnostics, starter sets and partial tasters are not public library products. Their authored data and direct routes may remain temporarily for backwards compatibility with existing learning records, but navigation, preparation plans and public practice libraries must not offer them to new users.

## Exam taxonomy

### ESAT

Current modules are Mathematics 1, Mathematics 2, Physics, Chemistry and Biology. Full mocks use exactly these five labels.

Historical NSAA module papers map to Mathematics 1, Physics, Chemistry or Biology. There is no direct Mathematics 2 historical mapping, so the interface states this plainly and offers the current Mathematics 2 full mock. Legacy ENGAA engineering-mixed material remains readable for existing records but is not shown as a current ESAT module or a new practice choice.

### TMUA

Historical practice is organised by edition and then Paper 1 / Paper 2. Both papers open directly into the online question interface. No diagnostic sits between the library and Question 1.

### TARA

Current full mocks are Critical Thinking, Problem Solving and Argumentative Writing. Historical TSA papers are labelled as Historical Papers and described as combined Critical Thinking and Problem Solving; they are not presented as a new TARA module.

### LNAT

Full mocks are Section A: Multiple Choice and Section B: Essay. No starter set is promoted.

### UCAT

Full mocks are Verbal Reasoning, Decision Making, Quantitative Reasoning and Situational Judgement. No starter set is promoted.

## Page responsibility

Each public page has one primary job:

- Overview: explain the exam and route the student to profile, coverage, practice, notes or guidance.
- Profile: collect the minimum course and application context.
- Coverage: explain what is covered, what is missing and what to do next.
- Practice: choose a complete historical paper or full mock, then start immediately.
- Notes: navigate directly to a subject or topic; English content is primary.
- Guidance: explain the one-to-one offer and provide one clear contact action.

Pages do not repeat unrelated product cards or narrate internal content-processing status.

## Verification contract

The automated public-experience contract must verify that:

- the shared brand, homepage and navigation expose English as the primary language;
- no public practice library offers diagnostic or starter entries;
- ESAT historical practice never exposes `engineering-mixed` and uses `Mathematics 1` rather than an ambiguous `Mathematics` label;
- assessment preparation recommendations point to full mocks rather than starters;
- the retired TMUA diagnostic URL redirects safely to the paper library;
- all five exam libraries expose only complete historical papers and/or full mocks.

