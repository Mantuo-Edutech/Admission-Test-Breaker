# TMUA 2023 Paper 1 Experience Verification

**Verification date:** 2026-07-13
**Implementation commit under review:** `f1beb42`
**Release classification:** local-preview ready; not production-data ready

## 1. Environment and reproducibility

| Check | Evidence | Result |
| --- | --- | --- |
| Node.js | `node --version` → `v22.18.0` | Pass |
| pnpm | `pnpm --version` → `10.14.0` | Pass |
| Frozen install | `pnpm install --frozen-lockfile` | Pass; lockfile unchanged |
| Production dependency audit | `pnpm audit --prod` | Pass; no known vulnerabilities |
| Architecture gate | `pnpm verify:architecture` | Pass |
| Automated suite | `pnpm test` | Pass; 17 files, 102 tests |
| Strict types | `pnpm typecheck` | Pass |
| Production build | `pnpm build` | Pass |
| Diff hygiene | `git diff --check` | Pass |

The production build code-splits the landing, practice, results, and shared mathematical renderer. The entry JavaScript is approximately 307 kB before gzip and 99 kB after gzip; no chunk-size warning remains.

## 2. Content evidence

- Runnable content contains exactly 20 questions for TMUA 2023 Paper 1.
- Reviewed answer sequence is `FACCFEFBEBBFFAFEEEDF`.
- Every question has `reviewStatus: "verified"`, safe repository-relative provenance, a matching correct option, and contiguous number/ID checks.
- Three reviewed figure assets exist for questions 5, 17, and 20 and contain no scripts or external links.
- Per-question source evidence remains in `docs/content/TMUA_2023_P1_CONTENT_VERIFICATION.md`.

This experience audit relies on that completed per-question visual verification. A second independent human content reviewer is still recommended before a public production release; local-preview status does not replace editorial sign-off.

## 3. Raw corpus immutability

Commands checked the linked raw layer without modifying it:

| Evidence | Result |
| --- | --- |
| PDF files below `Tmua/` | 96 |
| Unique PDF SHA-256 values | 46 |
| Git-tracked files below `Tmua/` | 0 |
| Ignore rule | `.gitignore:6:/Tmua` |

No raw PDF is staged or committed.

## 4. Journey verification

The following real browser journey was completed against the Vite local server:

```text
landing
→ start learner-owned local session
→ render reviewed question and KaTeX mathematics
→ select an answer
→ navigate and record time
→ open deliberate submission dialog
→ confirm submission
→ calculate evidence-only result
→ review score, timing, event count, Benchmark notice, and answer rows
```

Automated interaction tests also cover resume visibility, corrupt-record isolation, browser-storage failure fallback, answer changes, marks, deadline expiry, idempotent finalization, active-result denial, restart clearing, and answer hiding before submission.

## 5. Responsive and touch verification

Chrome DevTools device metrics were applied to the landing, practice, and result routes. At each width an automated browser expression checked `documentElement.scrollWidth <= innerWidth` and scanned every visible button for a width or height below 44 CSS pixels.

| Viewport | Horizontal overflow | Visible button below 44px | Visual layout |
| --- | --- | --- | --- |
| Phone `390 × 844` | None | None | Single-column paper, mobile map, sticky bottom navigation |
| iPad portrait `820 × 1180` | None | None | Single-column paper with compact header navigation |
| iPad landscape `1180 × 820` | None | None | Paper plus persistent question rail |
| Desktop `1440 × 1000` | None | None | Wide paper, progress header, persistent question map |

The phone, desktop practice, phone results, and desktop results first viewports were also inspected from browser screenshots. Mathematical content remains readable and horizontally scrollable only within its own math container when needed.

## 6. Accessibility and motion

- Native radio controls provide single-answer semantics; labels provide at least 44-pixel targets.
- Buttons, links, landmarks, headings, fieldsets, dialogs, descriptions, current-step state, and status notices use semantic roles.
- Radix Dialog supplies focus trapping and restoration for question navigation and submission confirmation.
- Question state is represented by accessible text in addition to color.
- Correct/incorrect/unanswered results use text and icons in addition to color.
- Focus-visible styles are defined globally.
- `prefers-reduced-motion` removes nonessential animation and transition duration.
- Component tests query the interface through accessible roles and names; a full external assistive-technology audit remains a production P1 gate.

## 7. Privacy and honesty boundary

The local document carries `LearnerSpaceId`, `PracticeSessionId`, `ActorRef`, versioned ordered learning events, and typed purposeful payloads. Corrupt or cross-tenant event documents are rejected. The interface states that data is saved only on the current device.

The result page intentionally does not provide a percentile, predicted TMUA score, readiness claim, training-hour promise, or executed AI interpretation. It displays “Benchmark 样本积累中” and labels AI deep interpretation as planned.

## 8. Known exclusions before production

- authenticated account and cross-device persistence;
- PostgreSQL plus Row-Level Security;
- real multi-tenant isolation and security review;
- student-facing granular Grant creation, revocation, and audit UI;
- real cohort Benchmark snapshots;
- configured AI provider execution, billing, and BYOK;
- Feishu, MCP, Hermes/OpenClaw, or other Agent integrations;
- second independent human content review;
- production monitoring, backup recovery, legal/consent implementation, and public deployment.

The current experience is safe for local product review using non-production data. It must not be presented as a production privacy environment or used to collect real student records until the Phase 2 gates are complete.
