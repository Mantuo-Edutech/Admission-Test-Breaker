#!/usr/bin/env bash

set -Eeuo pipefail
umask 077

log() {
  printf '[ecs-rollback] %s\n' "$*"
}

die() {
  printf '[ecs-rollback] ERROR: %s\n' "$*" >&2
  exit 1
}

require_command() {
  command -v "$1" >/dev/null 2>&1 || die "required command is missing: $1"
}

wait_for_release() {
  local base_url="$1"
  local expected_release="$2"
  for ((attempt = 1; attempt <= 45; attempt += 1)); do
    if curl --fail --silent --show-error --max-time 4 \
      "$base_url/healthz" | jq -e '.status == "ok"' >/dev/null 2>&1 \
      && [ "$(curl --fail --silent --show-error --max-time 4 \
        "$base_url/version.json" | jq -er '.release')" = "$expected_release" ]; then
      return 0
    fi
    sleep 1
  done
  return 1
}

DEPLOY_ROOT="${DEPLOY_ROOT:-/opt/admission-test-breaker}"
HOST_PORT="${HOST_PORT:-8090}"
STATE_DIRECTORY="${STATE_DIRECTORY:-$DEPLOY_ROOT/deployment-state}"
NGINX_SITE_CONFIG="${NGINX_SITE_CONFIG:-/etc/nginx/sites-enabled/admission-test-breaker-preview}"
STATE_FILE="$STATE_DIRECTORY/current.json"

for command in curl docker flock grep jq mktemp mv nginx; do
  require_command "$command"
done
[ -r "$STATE_FILE" ] || die "release state is missing: $STATE_FILE"
[ -r "$NGINX_SITE_CONFIG" ] || die "host Nginx site config is not readable"
grep -Eq "proxy_pass[[:space:]]+http://127\\.0\\.0\\.1:${HOST_PORT}([;/]|$)" "$NGINX_SITE_CONFIG" \
  || die "host Nginx no longer proxies this site to 127.0.0.1:$HOST_PORT"
nginx -t >/dev/null 2>&1 || die "host Nginx configuration test failed"

exec 9>"$STATE_DIRECTORY/release.lock"
flock -n 9 || die "another release or rollback is already in progress"

current_release="$(jq -er '.currentRelease' "$STATE_FILE")"
current_container="$(jq -er '.currentContainer' "$STATE_FILE")"
previous_release="$(jq -er '.previousRelease' "$STATE_FILE")"
previous_container="$(jq -er '.previousContainer' "$STATE_FILE")"
public_origin="$(jq -er '.origin' "$STATE_FILE")"

docker container inspect "$current_container" >/dev/null 2>&1 \
  || die "current container is missing: $current_container"
docker container inspect "$previous_container" >/dev/null 2>&1 \
  || die "rollback container is missing: $previous_container"
[ "$(docker inspect --format '{{.State.Running}}' "$current_container")" = "true" ] \
  || die "current container is not running"
[ "$(docker inspect --format '{{.State.Running}}' "$previous_container")" = "false" ] \
  || die "rollback container must be stopped before cutover"
wait_for_release "http://127.0.0.1:${HOST_PORT}" "$current_release" \
  || die "current release is unhealthy; investigate before an automated rollback"

timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
rolled_back_container="${current_container}-rolled-back-${current_release:0:12}-${timestamp}"
rollback_started=0
rollback_complete=0

restore_current() {
  set +e
  log "rollback failed; restoring $current_release"
  docker stop --time 10 "$current_container" >/dev/null 2>&1 || true
  docker rename "$current_container" "$previous_container" >/dev/null 2>&1 || true
  docker rename "$rolled_back_container" "$current_container" >/dev/null 2>&1 || true
  docker start "$current_container" >/dev/null 2>&1 || true
  wait_for_release "http://127.0.0.1:${HOST_PORT}" "$current_release" || true
}

cleanup() {
  local status=$?
  if [ "$status" -ne 0 ] && [ "$rollback_started" -eq 1 ] && [ "$rollback_complete" -eq 0 ]; then
    restore_current
  fi
  exit "$status"
}
trap cleanup EXIT

rollback_started=1
docker stop --time 20 "$current_container" >/dev/null
docker rename "$current_container" "$rolled_back_container"
docker rename "$previous_container" "$current_container"
docker start "$current_container" >/dev/null

wait_for_release "http://127.0.0.1:${HOST_PORT}" "$previous_release" \
  || die "rollback release did not become healthy on the loopback port"
wait_for_release "$public_origin" "$previous_release" \
  || die "public origin did not serve the rollback release"

state_staging="$(mktemp "$STATE_DIRECTORY/.current.XXXXXX")"
jq \
  --arg changedAt "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
  --arg currentRelease "$previous_release" \
  --arg currentContainer "$current_container" \
  --arg previousRelease "$current_release" \
  --arg previousContainer "$rolled_back_container" \
  '.deployedAt = $changedAt
    | .currentRelease = $currentRelease
    | .currentContainer = $currentContainer
    | .previousRelease = $previousRelease
    | .previousContainer = $previousContainer
    | .previousOriginalName = $currentContainer' \
  "$STATE_FILE" > "$state_staging"
chmod 0600 "$state_staging"
mv "$state_staging" "$STATE_FILE"
rollback_complete=1

log "PASS: $previous_release is live at $public_origin"
log "forward release retained for reversal: $rolled_back_container"
