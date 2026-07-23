# Decision: the first invite-operations page is an own-record queue

**Date:** 2026-07-19
**Status:** accepted for the closed-Beta foundation

## Context

The Mantou conversion journey requires a real operator to turn a qualified conversation into a finite invite without receiving access to the student's learning data. The backend already distinguishes an `invite_operator` from a service administrator and scopes every browser-readable record to `created_by = auth.uid()`.

A shared operations queue would be a materially different capability. It would require team membership, explicit shared scopes, assignment, approval, handover, recovery and cross-operator audit rules. Treating it as a visual variation would silently expand authority.

## Decision

The first `/operations/invites` product is an own-record queue:

- it is discoverable from the account page only after a separate active-operator check;
- a signed-out visitor is sent to login and a normal signed-in student fails closed;
- the package selector is populated only by the published-resource RPC;
- the operator can issue a 1–20 redemption code with a 5-minute–90-day code lifetime and a 1–365-day entitlement duration;
- the plaintext code is kept only in the successful in-memory response and is presented as a one-time copy step;
- the operator can list, audit and revoke only records it created;
- the interface displays redemption counts, never redeemer identity, profile, answers or learning events;
- revoking a code is described accurately as stopping future redemption, not revoking existing student entitlements.

The founder/service-role audit remains a separate controlled-terminal operation and is not exposed in the operator browser.

## Consequences

This closes the local Bingbing issue/list/revoke workflow without creating a general admin console. A future shared queue must introduce a new approved authorization model and negative tests before UI work starts; it cannot reuse the current route by broadening a query.

Production readiness still requires a verified Bingbing account, MFA, service-role bootstrap from an approved environment, real-domain role/revocation drills and responsive/accessibility UAT.

## Verification

- `pnpm verify:invite-operations`
- `pnpm verify:supabase-contracts`
- `pnpm verify:supabase`
- `pnpm verify`
