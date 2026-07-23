#!/usr/bin/env bash

set -Eeuo pipefail
umask 077

log() {
  printf '[ecs-release] %s\n' "$*"
}

die() {
  printf '[ecs-release] ERROR: %s\n' "$*" >&2
  exit 1
}

require_command() {
  command -v "$1" >/dev/null 2>&1 || die "required command is missing: $1"
}

required_value() {
  local name="$1"
  [ -n "${!name:-}" ] || die "$name is required"
}

container_exists() {
  docker container inspect "$1" >/dev/null 2>&1
}

container_running() {
  [ "$(docker inspect --format '{{.State.Running}}' "$1" 2>/dev/null || true)" = "true" ]
}

wait_for_release() {
  local base_url="$1"
  local expected_release="$2"
  local attempts="${3:-45}"
  local version_file
  version_file="$(mktemp)"

  for ((attempt = 1; attempt <= attempts; attempt += 1)); do
    if curl --fail --silent --show-error --max-time 4 \
      "$base_url/healthz" | jq -e '.status == "ok"' >/dev/null 2>&1 \
      && curl --fail --silent --show-error --max-time 4 \
        "$base_url/version.json" -o "$version_file" \
      && jq -e --arg release "$expected_release" \
        '.release == $release' "$version_file" >/dev/null 2>&1; then
      rm -f "$version_file"
      return 0
    fi
    sleep 1
  done

  rm -f "$version_file"
  return 1
}

verify_http_contract() {
  local base_url="$1"
  local expected_release="$2"
  local expected_environment="$3"
  local runtime_file="$4"
  local response_dir headers_file runtime_response version_response homepage_response
  response_dir="$(mktemp -d)"
  headers_file="$response_dir/headers"
  runtime_response="$response_dir/runtime-config.js"
  version_response="$response_dir/version.json"
  homepage_response="$response_dir/index.html"

  curl --fail --silent --show-error --max-time 10 \
    "$base_url/version.json" -o "$version_response"
  jq -e --arg release "$expected_release" --arg environment "$expected_environment" \
    '.release == $release and .environment == $environment' \
    "$version_response" >/dev/null

  curl --fail --silent --show-error --max-time 10 \
    "$base_url/runtime-config.js" -o "$runtime_response"
  cmp --silent "$runtime_file" "$runtime_response" \
    || die "$base_url serves a runtime configuration different from the approved release"

  curl --fail --silent --show-error --max-time 10 \
    -D "$headers_file" "$base_url/" -o "$homepage_response"
  grep -Fq '<script src="/runtime-config.js"></script>' "$homepage_response" \
    || die "$base_url does not load runtime-config.js before the application"
  grep -Fq 'id="root"' "$homepage_response" \
    || die "$base_url does not contain the application root"
  for header in content-security-policy permissions-policy referrer-policy \
    x-content-type-options x-frame-options; do
    grep -Eiq "^${header}:" "$headers_file" \
      || die "$base_url is missing the $header response header"
  done

  rm -rf "$response_dir"
}

start_web_container() {
  local name="$1"
  local image_id="$2"
  local publish_spec="$3"
  local restart_policy="$4"
  local runtime_directory="$5"
  local asset_directory="$6"

  docker run --detach \
    --name "$name" \
    --restart "$restart_policy" \
    --read-only \
    --cap-drop ALL \
    --security-opt no-new-privileges:true \
    --tmpfs /tmp:rw,noexec,nosuid,size=16m \
    --publish "$publish_spec" \
    --mount "type=bind,src=${asset_directory},dst=/usr/share/nginx/html/assets,readonly" \
    --mount "type=bind,src=${runtime_directory},dst=/tmp/mantuo-runtime,readonly" \
    --entrypoint nginx \
    "$image_id" -g 'daemon off;' >/dev/null
}

APP_CONTAINER_NAME="${APP_CONTAINER_NAME:-admission-test-breaker-web}"
DEPLOY_ROOT="${DEPLOY_ROOT:-/opt/admission-test-breaker}"
HOST_PORT="${HOST_PORT:-8090}"
NGINX_SITE_CONFIG="${NGINX_SITE_CONFIG:-/etc/nginx/sites-enabled/admission-test-breaker-preview}"
PULL_IMAGE="${PULL_IMAGE:-1}"
MIN_FREE_KB="${MIN_FREE_KB:-2097152}"
ASSET_ARCHIVE="${ASSET_ARCHIVE:-$DEPLOY_ROOT/runtime-assets}"
RUNTIME_RELEASES="${RUNTIME_RELEASES:-$DEPLOY_ROOT/runtime-releases}"
STATE_DIRECTORY="${STATE_DIRECTORY:-$DEPLOY_ROOT/deployment-state}"

for variable in APP_IMAGE APP_RELEASE APP_ENVIRONMENT PUBLIC_APP_ORIGIN \
  SUPABASE_URL EXPECTED_SUPABASE_PROJECT_REF SUPABASE_PUBLISHABLE_KEY \
  TURNSTILE_SITE_KEY; do
  required_value "$variable"
done
for command in cmp curl df docker flock grep install jq mktemp mv nginx sed sort; do
  require_command "$command"
done

[[ "$APP_RELEASE" =~ ^[0-9a-f]{40}$ ]] \
  || die "APP_RELEASE must be a full lowercase 40-character Git commit SHA"
[[ "$APP_IMAGE" == *":$APP_RELEASE" ]] \
  || die "APP_IMAGE must use APP_RELEASE as its immutable tag"
case "$APP_ENVIRONMENT" in
  staging|production) ;;
  *) die "APP_ENVIRONMENT must be staging or production" ;;
esac
[[ "$PUBLIC_APP_ORIGIN" =~ ^https://[A-Za-z0-9.-]+(:[0-9]+)?$ ]] \
  || die "PUBLIC_APP_ORIGIN must be one HTTPS origin without a path"
[[ "$EXPECTED_SUPABASE_PROJECT_REF" =~ ^[a-z0-9]{20}$ ]] \
  || die "EXPECTED_SUPABASE_PROJECT_REF must be a 20-character project ref"
[ "$SUPABASE_URL" = "https://${EXPECTED_SUPABASE_PROJECT_REF}.supabase.co" ] \
  || die "SUPABASE_URL does not match EXPECTED_SUPABASE_PROJECT_REF"
[[ "$SUPABASE_PUBLISHABLE_KEY" =~ ^sb_publishable_[A-Za-z0-9_-]{12,}$ ]] \
  || die "SUPABASE_PUBLISHABLE_KEY is malformed"
[[ "$TURNSTILE_SITE_KEY" =~ ^[A-Za-z0-9._-]{20,}$ ]] \
  || die "TURNSTILE_SITE_KEY is malformed"
if [[ ! "$HOST_PORT" =~ ^[0-9]+$ ]] || ((HOST_PORT <= 1024 || HOST_PORT >= 65536)); then
  die "HOST_PORT must be an unprivileged TCP port"
fi
((HOST_PORT != 80 && HOST_PORT != 443)) \
  || die "the shared ECS release controller never binds ports 80 or 443"
[[ "$MIN_FREE_KB" =~ ^[0-9]+$ ]] || die "MIN_FREE_KB must be an integer"
case "$PULL_IMAGE" in
  0|1) ;;
  *) die "PULL_IMAGE must be 0 or 1" ;;
esac

[ -r "$NGINX_SITE_CONFIG" ] || die "host Nginx site config is not readable: $NGINX_SITE_CONFIG"
grep -Eq "proxy_pass[[:space:]]+http://127\\.0\\.0\\.1:${HOST_PORT}([;/]|$)" "$NGINX_SITE_CONFIG" \
  || die "host Nginx does not proxy this site to 127.0.0.1:$HOST_PORT"
nginx -t >/dev/null 2>&1 || die "host Nginx configuration test failed"

install -d -m 0700 "$STATE_DIRECTORY" "$RUNTIME_RELEASES"
install -d -m 0755 "$ASSET_ARCHIVE"
exec 9>"$STATE_DIRECTORY/release.lock"
flock -n 9 || die "another release or rollback is already in progress"

available_kb="$(df -Pk "$DEPLOY_ROOT" | awk 'NR == 2 {print $4}')"
[[ "$available_kb" =~ ^[0-9]+$ ]] || die "could not determine available disk space"
((available_kb >= MIN_FREE_KB)) \
  || die "less than ${MIN_FREE_KB} KiB is free under $DEPLOY_ROOT"

mapfile -t published_containers < <(
  docker ps --filter "publish=$HOST_PORT" --format '{{.Names}}' | sort -u
)
[ "${#published_containers[@]}" -eq 1 ] \
  || die "expected exactly one running container publishing host port $HOST_PORT"
current_container="${published_containers[0]}"
container_running "$current_container" \
  || die "current web container is not running: $current_container"

current_release="$(curl --fail --silent --show-error --max-time 5 \
  "http://127.0.0.1:${HOST_PORT}/version.json" | jq -er '.release')" \
  || die "current web release cannot be identified"
[[ "$current_release" =~ ^[0-9A-Za-z._-]+$ ]] \
  || die "current web release contains unsupported characters"

if container_exists "$APP_CONTAINER_NAME" && [ "$APP_CONTAINER_NAME" != "$current_container" ]; then
  die "target container name already exists: $APP_CONTAINER_NAME"
fi

if ! docker image inspect "$APP_IMAGE" >/dev/null 2>&1; then
  [ "$PULL_IMAGE" = "1" ] || die "release image is not present locally: $APP_IMAGE"
  log "pulling immutable image $APP_IMAGE"
  docker pull "$APP_IMAGE" >/dev/null
fi
image_id="$(docker image inspect --format '{{.Id}}' "$APP_IMAGE")"
[[ "$image_id" =~ ^sha256:[0-9a-f]{64}$ ]] || die "release image does not have a content-addressed image ID"
image_revision_label="$(docker image inspect \
  --format '{{index .Config.Labels "org.opencontainers.image.revision"}}' "$image_id")"
[ "$image_revision_label" = "$APP_RELEASE" ] \
  || die "release image revision label does not match APP_RELEASE"
image_revision_file="$(docker run --rm --entrypoint cat \
  "$image_id" /opt/mantuo/build-revision)"
[ "$image_revision_file" = "$APP_RELEASE" ] \
  || die "release image build-revision file does not match APP_RELEASE"

short_release="${APP_RELEASE:0:12}"
timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
generator_container="${APP_CONTAINER_NAME}-runtime-${short_release}-$$"
candidate_container="${APP_CONTAINER_NAME}-candidate-${short_release}-$$"
rollback_container="${APP_CONTAINER_NAME}-rollback-${current_release:0:12}-${timestamp}"
runtime_staging=""
runtime_directory="$RUNTIME_RELEASES/$APP_RELEASE"
previous_original_name="$current_container"
cutover_started=0
cutover_complete=0

rollback_failed_cutover() {
  set +e
  log "release failed after cutover began; restoring $current_release"
  docker rm -f "$APP_CONTAINER_NAME" >/dev/null 2>&1 || true
  if container_exists "$rollback_container"; then
    docker rename "$rollback_container" "$previous_original_name" >/dev/null 2>&1 || true
    docker start "$previous_original_name" >/dev/null 2>&1 || true
    wait_for_release "http://127.0.0.1:${HOST_PORT}" "$current_release" 30 || true
  fi
}

cleanup() {
  local status=$?
  set +e
  container_exists "$generator_container" && docker rm -f "$generator_container" >/dev/null 2>&1
  container_exists "$candidate_container" && docker rm -f "$candidate_container" >/dev/null 2>&1
  [ -n "$runtime_staging" ] && [ -d "$runtime_staging" ] && rm -rf "$runtime_staging"
  if [ "$status" -ne 0 ] && [ "$cutover_started" -eq 1 ] && [ "$cutover_complete" -eq 0 ]; then
    rollback_failed_cutover
  fi
  exit "$status"
}
trap cleanup EXIT

log "generating browser runtime files from the exact release image"
runtime_staging="$(mktemp -d "$RUNTIME_RELEASES/.${APP_RELEASE}.XXXXXX")"
docker create \
  --name "$generator_container" \
  --env "SUPABASE_URL=$SUPABASE_URL" \
  --env "SUPABASE_PUBLISHABLE_KEY=$SUPABASE_PUBLISHABLE_KEY" \
  --env "TURNSTILE_SITE_KEY=$TURNSTILE_SITE_KEY" \
  --env "APP_RELEASE=$APP_RELEASE" \
  --env "APP_ENVIRONMENT=$APP_ENVIRONMENT" \
  --entrypoint /docker-entrypoint.d/40-runtime-config.sh \
  "$image_id" >/dev/null
docker start --attach "$generator_container" >/dev/null
docker cp "$generator_container:/tmp/mantuo-runtime/." "$runtime_staging/"
docker rm "$generator_container" >/dev/null

jq -e --arg release "$APP_RELEASE" --arg environment "$APP_ENVIRONMENT" \
  '.release == $release and .environment == $environment' \
  "$runtime_staging/version.json" >/dev/null
grep -Fq "supabaseUrl: \"$SUPABASE_URL\"" "$runtime_staging/runtime-config.js" \
  || die "generated runtime has the wrong Supabase origin"
grep -Fq "release: \"$APP_RELEASE\"" "$runtime_staging/runtime-config.js" \
  || die "generated runtime has the wrong release"
chmod 0444 "$runtime_staging/runtime-config.js" "$runtime_staging/version.json"

if [ -d "$runtime_directory" ]; then
  if ! cmp --silent "$runtime_staging/runtime-config.js" "$runtime_directory/runtime-config.js" \
    || ! cmp --silent "$runtime_staging/version.json" "$runtime_directory/version.json"; then
    die "release runtime directory already exists with different contents"
  fi
  rm -rf "$runtime_staging"
  runtime_staging=""
else
  mv "$runtime_staging" "$runtime_directory"
  runtime_staging=""
fi

image_repository="${APP_IMAGE%:*}"
"$(dirname "$0")/prepare-static-asset-archive.sh" \
  "$current_container" "$ASSET_ARCHIVE" "$image_repository"

log "starting an isolated candidate on a random loopback port"
start_web_container "$candidate_container" "$image_id" \
  '127.0.0.1::8080' no "$runtime_directory" "$ASSET_ARCHIVE"
candidate_binding="$(docker port "$candidate_container" 8080/tcp | sed -n '1p')"
candidate_port="${candidate_binding##*:}"
[[ "$candidate_port" =~ ^[0-9]+$ ]] || die "Docker did not allocate a candidate loopback port"
candidate_origin="http://127.0.0.1:$candidate_port"
wait_for_release "$candidate_origin" "$APP_RELEASE" \
  || die "candidate did not become healthy"
verify_http_contract "$candidate_origin" "$APP_RELEASE" \
  "$APP_ENVIRONMENT" "$runtime_directory/runtime-config.js"
log "candidate verification passed"
docker rm -f "$candidate_container" >/dev/null

docker stop --time 20 "$current_container" >/dev/null
if ! docker rename "$current_container" "$rollback_container"; then
  docker start "$current_container" >/dev/null 2>&1 || true
  die "could not retain the current container for rollback"
fi
cutover_started=1
start_web_container "$APP_CONTAINER_NAME" "$image_id" \
  "127.0.0.1:${HOST_PORT}:8080" unless-stopped "$runtime_directory" "$ASSET_ARCHIVE"

wait_for_release "http://127.0.0.1:${HOST_PORT}" "$APP_RELEASE" \
  || die "new release did not become healthy on the production loopback port"
verify_http_contract "http://127.0.0.1:${HOST_PORT}" "$APP_RELEASE" \
  "$APP_ENVIRONMENT" "$runtime_directory/runtime-config.js"
wait_for_release "$PUBLIC_APP_ORIGIN" "$APP_RELEASE" \
  || die "public origin did not serve the new release"
verify_http_contract "$PUBLIC_APP_ORIGIN" "$APP_RELEASE" \
  "$APP_ENVIRONMENT" "$runtime_directory/runtime-config.js"

state_staging="$(mktemp "$STATE_DIRECTORY/.current.XXXXXX")"
jq -n \
  --arg deployedAt "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
  --arg environment "$APP_ENVIRONMENT" \
  --arg origin "$PUBLIC_APP_ORIGIN" \
  --arg image "$APP_IMAGE" \
  --arg imageId "$image_id" \
  --arg currentRelease "$APP_RELEASE" \
  --arg currentContainer "$APP_CONTAINER_NAME" \
  --arg currentRuntimeDirectory "$runtime_directory" \
  --arg previousRelease "$current_release" \
  --arg previousContainer "$rollback_container" \
  --arg previousOriginalName "$previous_original_name" \
  '{schemaVersion: 1, deployedAt: $deployedAt, environment: $environment,
    origin: $origin, image: $image, imageId: $imageId,
    currentRelease: $currentRelease, currentContainer: $currentContainer,
    currentRuntimeDirectory: $currentRuntimeDirectory,
    previousRelease: $previousRelease, previousContainer: $previousContainer,
    previousOriginalName: $previousOriginalName}' > "$state_staging"
chmod 0600 "$state_staging"
mv "$state_staging" "$STATE_DIRECTORY/current.json"
cutover_complete=1

log "PASS: $APP_RELEASE is live at $PUBLIC_APP_ORIGIN"
log "immediate rollback container retained: $rollback_container"
