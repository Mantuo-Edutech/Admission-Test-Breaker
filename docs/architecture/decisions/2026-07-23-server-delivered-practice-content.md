# Server-delivered practice content and authoring workflow

Status: implemented V1
Date: 2026-07-23

## Context

The current native question renderer is the correct delivery experience, but
published paper objects and objective answer keys are still compiled into the
browser application. This makes releases simple and fast, yet it also means a
visitor can inspect the JavaScript bundle and retrieve more content than the
current screen needs. It is not an adequate long-term boundary for a large,
frequently updated question bank or paid explanations.

The proposed alternative is a separate Rust Axum server, SQLite or PostgreSQL,
and an HTMX dashboard. That stack is viable, but adopting all of it now would
duplicate authentication, deployment, data access and UI conventions before the
content workflow has stabilised.

## Decision

Use the existing Supabase/PostgreSQL platform as the production system of record
and add a server-side Content API boundary. Keep source PDFs and large media in a
private object-storage bucket. Keep the current React application for the public
student experience and the private operations interface.

The browser receives only the minimum practice payload needed for the active
paper or question. Correct answers, worked explanations, source files, review
records and unpublished revisions remain server-side. Submissions are scored by
the server, and explanation access is checked independently from free question
access.

Browser caching may store a sanitised opened paper in IndexedDB using a revision
and ETag. It must not persist answer keys, deep explanations or source PDFs.

## Content workflow

```text
private source upload
→ extraction job (MinerU or another adapter)
→ normalised draft
→ deterministic schema/media/answer checks
→ human academic review
→ immutable publication revision
→ student Content API
→ rollback to a previous revision when required
```

Extraction is an input adapter, never the publication authority. “New question
review” and conversion state belong in the private operations interface and
server logs, not in the student-facing catalogue.

## Implemented records

| Record | Purpose | Student browser access |
| --- | --- | --- |
| `public.practice_content_revisions` | Immutable revision, checksum and publication metadata | Published metadata only |
| `private.practice_paper_payloads` | Sanitised prompt, choice and media references | One exact revision through `get_practice_paper` |
| `private.practice_paper_answer_keys` | Correct answers and scoring metadata | Never direct; `score_practice_submission` only |
| `public.content_resource_payloads` | Versioned Notes and worked explanations | `get_entitled_content_resource` after entitlement |
| `public.practice_sessions` | Learner-owned answer/timing snapshot with revision and digest | Owning learner only through RLS |

All learner answers, time events and results remain in the Private Learner Domain
and keep their existing `learner_space_id` and RLS boundaries.

## API boundary

The target interface is transport-agnostic:

```text
POST /rest/v1/rpc/get_practice_paper
POST /rest/v1/rpc/save_practice_session
POST /rest/v1/rpc/score_practice_submission
POST /rest/v1/rpc/get_entitled_content_resource
```

Private administration adds upload, ingest, review, publish and rollback
commands. A service implementation may initially use Supabase RPC/Edge Functions
or the existing application API. The domain interface must not depend on a
particular HTTP framework.

## Technology choices

### PostgreSQL / Supabase now

This reuses the existing identity, RLS, migrations, storage and production
verification work. PostgreSQL is authoritative for the multi-user platform.

### SQLite only at the ingestion edge

SQLite is acceptable for a local extractor queue, portable review bundle or
single-operator offline tool. It is not the production system of record because
the product needs concurrent writes, central access control, learner isolation
and operational audit.

### Axum later, behind the same contract

Axum is a sound implementation option when sustained content traffic, custom
streaming, background ingestion or operational isolation justifies a dedicated
service. It is not required to create the server boundary. Introducing it now
would add a Rust build, a second deployable and duplicated Supabase token/RLS
integration without solving a present performance problem.

### HTMX is optional for a truly separate operations tool

HTMX fits a small server-rendered internal dashboard. The current product already
has a React operations surface and shared identity/design components, so React is
the lower-complexity default. Use HTMX only if operations is later split into an
independent service with a small UI and separate ownership.

### Extraction tools stay in the monorepo first

Place importers under a clear content-ingestion package with an explicit input,
normalised output and publication schema. Splitting into another repository is
deferred until the schema is stable and independent release ownership produces a
real benefit. A premature split would make schema changes, fixtures and CI harder
to coordinate.

## Security boundary

No web system can prevent a user from copying or capturing content already
rendered on screen. The enforceable goal is to prevent raw-file and bulk-data
exposure, minimise each response, rate-limit enumeration, watermark where
appropriate and retain an access audit. UI hiding, obscure URLs and disabled
download buttons are not security controls.

## Completed V1 boundary

1. All 44 currently published papers use one safe delivery and scoring contract, including 18 TMUA past papers.
2. The browser build is scanned for protected Notes bodies, all complete answer sequences and all server question payloads.
3. Session schema v3 stores `paperRevisionId` and `contentDigest`; the database validates the exact published tuple and prevents an existing session moving revisions.
4. Publication is append-only. A changed paper creates `r2`, retains `r1` payload and answer package, and creates a new additive migration instead of modifying an applied migration.
5. Production modules are forbidden by an Agent-runnable architecture test from importing answer-bearing authoring registries.
6. Axum, a separate repository and full offline PWA remain deferred until measured demand justifies them.
