# Supabase Provisioning State

Updated: 2026-07-23 (Asia/Shanghai)

This file contains non-secret deployment state only. Deployment uses short-lived Supabase Management API/JIT database access and does not retain database passwords. Management tokens and service-role keys must never be committed, pasted into chat, or exposed through a `VITE_*` variable.

## Projects

| Environment | Project | Project ref | Region | Compute | Status |
| --- | --- | --- | --- | --- | --- |
| staging | Mantuo Admission Test Breaker Staging | `bhmsclraqqzhwovprdbl` | Singapore (`ap-southeast-1`) | Free / Nano | `ACTIVE_HEALTHY` |
| production | Mantuo Admission Test Breaker Production | `wmhqqxmzxiojrxybqjij` | Singapore (`ap-southeast-1`) | Free / Nano | `ACTIVE_HEALTHY` |

The requested Hong Kong region (`ap-east-1`) was rejected by the Supabase Management API because it is currently a private region. Singapore is the nearest public region available for the Hong Kong ECS deployment.

## Database state

Both projects contain all 27 reviewed migrations from:

- `20260715090000_private_account_foundation.sql`
- through `20260723221300_server_practice_scoring.sql`

Remote migration history was read back after deployment and matches the local migration set in both environments. Each project contains 44 immutable practice revisions, 44 sanitised server payloads and 44 private answer keys. The Management API publisher fails closed on an unknown remote migration and records schema plus history atomically.

Both projects passed a live two-account contract on 2026-07-23: confirmed-user login, exact `paper_revision_id` and digest persistence, server scoring, cross-tenant session denial, short-lived invite redemption, entitled Notes delivery and non-entitled account denial. Temporary Auth users were deleted after each run.

## Production origin

- Canonical web origin: `https://uktest.cc`
- `https://www.uktest.cc` redirects to the canonical origin.
- Production Auth `site_url` is `https://uktest.cc`.
- Redirect allowlist includes `/auth/confirm` and `/auth/reset` on the canonical origin.
- Email confirmation, a 10-character mixed-case-and-digit password and refresh-token rotation are enabled.
- Browser Supabase runtime remains disabled until CAPTCHA and SMTP are ready.

## Local secret references

The Supabase management token remains in the existing `Supabase CLI` Keychain entry. No database password is kept by this project. Publishable keys are runtime configuration; service-role keys are retrieved only for an explicitly confirmed remote contract test and are never written to disk.

## Required before public account activation

1. Choose an optional staging subdomain.
2. Create separate Cloudflare Turnstile widgets restricted to the production and staging hostnames.
3. Configure custom SMTP and finish the production Auth CAPTCHA baseline.
4. Deploy `invite-preview` with an exact `ALLOWED_ORIGINS` value.
5. Add each environment's publishable key to the web runtime; never expose service-role keys.
6. Complete the browser-level registration, email confirmation, export and deletion acceptance tests; the database-level two-account, invitation and entitlement checks already pass.
7. Upgrade production to a paid plan before the real student Beta so daily backups are available. Both projects report WAL-G enabled but no physical snapshot yet; this is not accepted as recovery evidence.
