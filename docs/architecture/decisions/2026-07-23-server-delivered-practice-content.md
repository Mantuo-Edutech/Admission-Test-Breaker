# Server-delivered practice content and authoring workflow

Status: accepted target architecture  
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

## Target records

| Record | Purpose | Student browser access |
| --- | --- | --- |
| `papers` | Stable paper identity and exam/module metadata | Catalogue projection only |
| `paper_versions` | Immutable publication revision and checksum | Current published revision only |
| `questions` / `choices` | Sanitised prompt and response shape | Active published paper |
| `answer_keys` | Correct answer and scoring metadata | Never direct; server scoring only |
| `explanations` | Versioned worked interpretation | Entitlement-checked endpoint |
| `media_assets` | Figure identity, dimensions and private storage path | Short-lived scoped delivery |
| `review_tasks` | Extraction and academic verification state | Operations roles only |
| `publications` | Publish, supersede and rollback ledger | Public status projection only |

All learner answers, time events and results remain in the Private Learner Domain
and keep their existing `learner_space_id` and RLS boundaries.

## API boundary

The target interface is transport-agnostic:

```text
GET  /v1/exams/:exam/papers
GET  /v1/papers/:paperId?revision=:revision
POST /v1/practice-sessions
PUT  /v1/practice-sessions/:sessionId/answers/:questionId
POST /v1/practice-sessions/:sessionId/submit
GET  /v1/practice-sessions/:sessionId/result
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

## Migration phases

1. Define and validate a client-safe paper payload that excludes answer keys.
2. Create content tables, private storage buckets and RLS/service policies.
3. Build publish/rollback commands and migrate one non-critical paper end to end.
4. Switch scoring and explanations to protected server endpoints.
5. Migrate the remaining catalogues, then reject practice content in public bundles.
6. Evaluate Axum only with measured latency, throughput or workflow requirements.

Until phase 5 is complete, the current client-bundled answer keys remain a known
production limitation and must not be described as protected.
