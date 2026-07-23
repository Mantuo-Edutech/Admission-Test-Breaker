# Production privacy review packet

**Product:** Admission Test Breaker / 满托 UK Test  
**Target:** 100-user closed Beta at `https://uktest.cc`  
**Prepared:** 2026-07-24  
**Status:** Awaiting independent legal review

This packet organises the facts and decisions required for the production privacy control. It is not
a privacy notice, a DPIA, a transfer assessment or legal advice. A qualified reviewer must verify the
facts, resolve every launch-blocking item and sign the separate production attestation before
`privacy-legal-review` can pass.

## 1. Product facts the reviewer can verify

- The service provides free online practice and optional accounts for UK university admission tests.
- The intended audience includes secondary-school students and is therefore likely to include people
  under 18. The product applies high-privacy defaults without requiring a date of birth merely to
  practise.
- Account data includes an email address and Supabase Auth identifiers. Learning data includes exam
  and curriculum choices, immutable practice-session snapshots, answers, changes, flags, active time,
  submissions, entitlements, feedback and student-created collaboration grants.
- A student can grant a named teacher or parent separate, time-limited permissions for progress,
  answers, annotations, plans and assignments. A collaboration grant is a product permission; it is
  not proof of parental responsibility or authority to exercise a child's legal rights.
- Free practice and factual results do not require a teacher, parent, consultant or Agent to receive
  access to the student's learning record. Paid AI interpretation and population Benchmark processing
  remain outside the production V1 approval unless separately reviewed and activated.
- Logged-in learning records are intended to reside in the student's RLS-isolated Learner Space.
  Guest data remains in the browser until an authenticated migration is requested. First-party funnel
  events use a session-scoped random journey identifier and are designed not to contain account,
  course, answer, IP, device or free-text fields.
- The application provides self-service JSON export, authenticated account deletion, correction and
  complaint intake, student-controlled collaboration revocation and a student-visible collaboration
  audit trail. These tools do not replace the controller's human rights-request process.

The technical claims above must be checked against the release being approved, not accepted from this
summary alone. The evidence map in section 4 identifies the controlling sources.

## 2. Hosting and recipient map requiring confirmation

| Component | Intended production role | Known location or boundary | Reviewer decision still required |
| --- | --- | --- | --- |
| Managed Supabase | Auth, PostgreSQL, RLS, Edge Functions and backups | Production project is provisioned in Singapore | Controller/processor roles, DPA, sub-processors, retention, deletion propagation and transfer mechanism |
| Alibaba Cloud ECS | Serves the public static Web application | Hong Kong; browser-public runtime values only | Hosting contract, logs, access control and incident responsibilities |
| GitHub | Public source, CI and immutable public-Web image | No production student database is intended to be stored in the repository or image | Organisation access, CI logs, dependency and incident boundary |
| Cloudflare Turnstile | Registration/login/reset abuse prevention | Planned; challenge telemetry only | DPA, data location, notice wording and necessity/proportionality |
| SMTP provider | Account confirmation and recovery delivery | Provider not yet approved | Provider, DPA, sender domain, logs, retention and transfer mechanism |
| WeChat contact | Optional human-service contact initiated by the student | Separate from Learner Space by product design | Controller/recipient role, notice, age-related handling and whether any later CRM linkage is permitted |
| Teacher/parent collaborator | Student-selected recipient of scoped learning data | Recipient chosen by student and limited by grant | Notice, identity assurance, misuse response and distinction from legal guardian authority |

Do not infer an adequate transfer mechanism merely from a data-centre region. Counsel must identify the
actual legal entities, processing chain, restricted transfers and required safeguards using current
contracts and current ICO guidance.

## 3. Required legal decisions

The production attestation uses these stable IDs. `passed` means the reviewer has examined supporting
facts and no launch-blocking issue remains. A description of future work is not a passing decision.

| ID | Decision required before Beta | Minimum attached evidence |
| --- | --- | --- |
| PRIV-01 | Identify the legal data controller, registered address, privacy contact and any required UK representative or DPO/contact point. | Entity record and approved public contact wording |
| PRIV-02 | Define the permitted audience and age-assurance approach. Decide whether applying child-protective defaults to everyone is proportionate and whether any feature needs age or parental-authority verification. | Age-assurance/best-interests decision with rationale |
| PRIV-03 | Select and document a lawful basis for each distinct purpose: account, core practice, entitlement, collaboration, feedback, strictly necessary security/funnel events, service contact and any optional analytics. | Purpose-by-purpose Article 6 record; consent mechanics where used |
| PRIV-04 | Complete and sign a child-focused DPIA covering profiling/inferences, admission anxiety, collaboration, deletion, security, cross-device migration and future AI/Benchmark boundaries. | Approved DPIA with risks, mitigations, owners and residual-risk acceptance |
| PRIV-05 | Approve layered Chinese/English privacy information that is concise and understandable for relevant ages, and specify when it is shown. | Approved notice copy and age-appropriate comprehension evidence |
| PRIV-06 | Approve a category-specific retention schedule for Auth, learning events, guest storage, feedback, funnel rows, collaboration audit, email/security logs, backups and rights/incident records. | Retention schedule with deletion job/owner and backup propagation period |
| PRIV-07 | Confirm every processor/sub-processor, contract/DPA, processing location, security commitment, breach notice and deletion/return term. | Processor register and current contract/DPA references |
| PRIV-08 | Identify every restricted international transfer and approve the applicable mechanism and any transfer risk assessment or supplementary measure. | Transfer map plus approved safeguard/assessment |
| PRIV-09 | Approve intake, identity verification, search, exemption, secure response and escalation procedures for access, correction, deletion, restriction, objection and portability. | Rights-request runbook, request register and response templates |
| PRIV-10 | Approve how requests by a parent, teacher or other representative are authorised without treating a product collaboration grant as legal authority. | Child/representative request decision tree |
| PRIV-11 | Approve breach detection, internal escalation, processor notification, risk assessment, incident log and any ICO/data-subject notification path. | Named incident owner, backup contact and exercised 72-hour runbook |
| PRIV-12 | Confirm that AI interpretation, population Benchmark, advertising, CRM linkage and non-essential device technologies remain disabled until separately purpose-limited, reviewed and transparently activated. | Feature inventory and change-control owner |

## 4. Technical evidence map

| Claim | Controlling sources and production evidence |
| --- | --- |
| Data inventory and current legal gaps | `docs/legal/STUDENT_PRIVACY_AND_DATA_RIGHTS_FOUNDATION.md` |
| Student-facing disclosure | `src/features/data-rights/pages/PrivacyPage.tsx` and the rendered `/privacy` route |
| Export and account deletion | `supabase/migrations/20260718172000_student_data_rights.sql` plus later export migrations and pgTAP |
| Private learner data and RLS | `supabase/migrations/20260718143000_durable_learner_data.sql`, remote contract verifier and two-account production UAT |
| Student-controlled collaboration | `supabase/migrations/20260719210000_student_controlled_collaboration.sql`, sharing UI, revoke/isolation UAT and audit export |
| Anonymous funnel minimisation/retention | funnel migration, pgTAP, retention execution evidence and aggregate-viewer UAT |
| Immutable practice lineage | paper revision ledger, server delivery contract and persisted session `paperRevisionId`/digest evidence |
| Infrastructure locations and backup deletion boundary | approved provider contracts, production configuration and managed recovery evidence |

Passing repository tests proves technical controls behave as encoded. It does not choose the controller,
lawful bases, age approach, transfer safeguards or acceptable residual legal risk.

## 5. Review procedure

1. Counsel obtains the legal-entity, provider-contract, data-location, retention and contact facts from
   the accountable owner; unresolved facts are recorded as blockers.
2. Counsel reviews the current production release and completes decisions PRIV-01 through PRIV-12.
3. Product and engineering remediate every launch-blocking finding. Counsel re-checks changed sources.
4. The reviewer copies
   `verification/production/templates/privacy-legal-review-attestation.md` into the privacy-safe
   production evidence artifact directory and records decisions without personal data or secrets.
5. The actual reviewer records `privacy-legal-review` through the evidence command. The evidence
   ledger binds the attestation to this packet, its controlling sources and the approved environment.

## 6. Authoritative starting points

These sources were checked on 2026-07-24. Counsel must verify current guidance at review time.

- ICO, Children's Code scope and standards: https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/childrens-information/childrens-code-guidance-and-resources/age-appropriate-design-a-code-of-practice-for-online-services/
- ICO, child-focused DPIAs: https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/childrens-information/childrens-code-guidance-and-resources/age-appropriate-design-a-code-of-practice-for-online-services/2-data-protection-impact-assessments/
- ICO, lawful bases for children's data: https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/childrens-information/children-and-the-uk-gdpr/how-do-the-lawful-bases-apply-to-children-s-personal-information/
- ICO, data minimisation: https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/childrens-information/childrens-code-guidance-and-resources/age-appropriate-design-a-code-of-practice-for-online-services/8-data-minimisation/
- ICO, international transfers: https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/international-transfers/
- ICO, subject access: https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/subject-access-requests/a-guide-to-subject-access/
- ICO, personal data breaches: https://ico.org.uk/for-organisations/report-a-breach/personal-data-breach/personal-data-breaches-a-guide/

