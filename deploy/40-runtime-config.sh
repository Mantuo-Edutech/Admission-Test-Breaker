#!/bin/sh
set -eu

: "${SUPABASE_URL:?SUPABASE_URL is required}"
: "${SUPABASE_PUBLISHABLE_KEY:?SUPABASE_PUBLISHABLE_KEY is required}"
: "${APP_RELEASE:?APP_RELEASE is required}"
: "${APP_ENVIRONMENT:?APP_ENVIRONMENT is required}"

case "$SUPABASE_URL" in
  https://*.supabase.co|http://127.0.0.1:*|http://host.docker.internal:*) ;;
  *) echo "SUPABASE_URL must be a Supabase HTTPS URL or an explicit local address" >&2; exit 1 ;;
esac

case "$APP_RELEASE" in
  *[!A-Za-z0-9._-]*) echo "APP_RELEASE contains unsupported characters" >&2; exit 1 ;;
esac

case "$APP_ENVIRONMENT" in
  staging|production|ci|local) ;;
  *) echo "APP_ENVIRONMENT must be staging, production, ci or local" >&2; exit 1 ;;
esac

case "$APP_ENVIRONMENT" in
  staging|production) : "${TURNSTILE_SITE_KEY:?TURNSTILE_SITE_KEY is required for staging and production}" ;;
esac

case "${TURNSTILE_SITE_KEY:-}" in
  *[!A-Za-z0-9._-]*) echo "TURNSTILE_SITE_KEY contains unsupported characters" >&2; exit 1 ;;
esac

mkdir -p /tmp/mantuo-runtime
envsubst '${SUPABASE_URL} ${SUPABASE_PUBLISHABLE_KEY} ${TURNSTILE_SITE_KEY} ${APP_RELEASE} ${APP_ENVIRONMENT}' \
  < /opt/mantuo/runtime-config.template.js \
  > /tmp/mantuo-runtime/runtime-config.js
envsubst '${APP_RELEASE} ${APP_ENVIRONMENT}' \
  < /opt/mantuo/version.template.json \
  > /tmp/mantuo-runtime/version.json
chmod 0400 /tmp/mantuo-runtime/runtime-config.js /tmp/mantuo-runtime/version.json
