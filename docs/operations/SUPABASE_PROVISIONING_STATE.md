# Supabase Provisioning State

Updated: 2026-07-23 (Asia/Shanghai)

This file contains non-secret deployment state only. Database passwords are stored in the local macOS Keychain and must never be committed, pasted into chat, or exposed through a `VITE_*` variable.

## Projects

| Environment | Project | Project ref | Region | Compute | Status |
| --- | --- | --- | --- | --- | --- |
| staging | Mantuo Admission Test Breaker Staging | `bhmsclraqqzhwovprdbl` | Singapore (`ap-southeast-1`) | Free / Nano | `ACTIVE_HEALTHY` |
| production | Mantuo Admission Test Breaker Production | `wmhqqxmzxiojrxybqjij` | Singapore (`ap-southeast-1`) | Free / Nano | `ACTIVE_HEALTHY` |

The requested Hong Kong region (`ap-east-1`) was rejected by the Supabase Management API because it is currently a private region. Singapore is the nearest public region available for the Hong Kong ECS deployment.

## Database state

Both projects contain all 19 reviewed migrations from:

- `20260715090000_private_account_foundation.sql`
- through `20260719222200_content_review_queue_qualified_replace.sql`

Remote migration history was read back after deployment and matches the local migration set in both environments. The migrations establish private account spaces, row-level isolation, practice history, content entitlements, invitation operations, student data rights, collaboration grants and operations review tables.

## Production origin

- Canonical web origin: `https://uktest.cc`
- `https://www.uktest.cc` redirects to the canonical origin.
- Production Auth `site_url` is `https://uktest.cc`.
- Redirect allowlist includes `/auth/confirm` and `/auth/reset` on the canonical origin.
- Email confirmation, a 10-character mixed-case-and-digit password and refresh-token rotation are enabled.
- Browser Supabase runtime remains disabled until CAPTCHA and SMTP are ready.

## Local secret references

The generated database passwords are stored in macOS Keychain entries:

- service `mantuo-atb-staging`, account `supabase-db`
- service `mantuo-atb-production`, account `supabase-db`

The Supabase management token remains in the existing `Supabase CLI` Keychain entry.

## Required before public account activation

1. Choose an optional staging subdomain.
2. Create separate Cloudflare Turnstile widgets restricted to the production and staging hostnames.
3. Configure custom SMTP and finish the production Auth CAPTCHA baseline.
4. Deploy `invite-preview` with an exact `ALLOWED_ORIGINS` value.
5. Add each environment's publishable key to the web runtime; never expose service-role keys.
6. Complete two-account isolation, registration, email confirmation, invitation, export and deletion acceptance tests.
7. Upgrade production to a paid plan before the real student Beta so daily backups are available; Free/Nano is suitable only for setup and preview.
