# Task-oriented exam navigation

Status: accepted  
Date: 2026-07-23

## Decision

Every exam space uses the same five primary modules:

1. **考试概览** — explains what the exam is and the first useful action.
2. **知识覆盖** — collects the minimum course background and shows deterministic coverage results.
3. **在线练习** — contains diagnostics, mocks and past-paper practice only.
4. **复习笔记** — separates foundation notes from advanced notes and worked review.
5. **名师指点** — explains the human service and provides a direct WeChat contact path.

Learning records and account controls are utilities, not primary preparation
modules. They remain reachable through the learner/account surfaces without
being mixed into the five-task product navigation.

## Page contract

Each primary page has one job, one dominant heading and one primary action.
The page body must not reproduce a card directory of all other modules. Moving
between modules belongs to the persistent exam navigation. A completion action
may advance to the next task, but generic “other available content” grids are
not allowed on task pages.

| Module | User question answered | Body content allowed |
| --- | --- | --- |
| 概览 | “Is this the exam and product I need?” | Exam meaning, product scope, first action |
| 知识覆盖 | “What have I covered and what is missing?” | Profile input, fixed mapping, topic-level recommendations |
| 在线练习 | “What can I practise now?” | Diagnostics, mocks, papers, active-session continuation |
| 复习笔记 | “What should I read before or after practice?” | Foundation notes, advanced notes, worked review |
| 名师指点 | “When and how can a teacher help me?” | Teacher value, contact instructions, QR code, privacy boundary |

## Implementation rule

The module labels, destinations and active-state rules live in one typed
navigation registry. Desktop and mobile navigation consume the same registry.
Routes may keep legacy redirects, but no page may maintain a separate copy of
the primary module list.

## Consequences

- Knowledge coverage and online practice are peers instead of being hidden
  inside an ambiguous “我的准备” page.
- Exam-specific resource pages show notes only; the global library remains an
  internal catalogue of all available products.
- Foundation and advanced notes can have different access policies without
  changing the navigation.
- Human guidance has a stable, measurable route instead of appearing as a
  repeated sales card on unrelated pages.
