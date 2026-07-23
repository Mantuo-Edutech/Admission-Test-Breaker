#!/usr/bin/env bash

set -euo pipefail

container_name="${1:?container name is required}"
asset_archive="${2:?asset archive directory is required}"
image_repository="${3:-admission-test-breaker}"
retention_days="${ASSET_RETENTION_DAYS:-14}"
seed_container=""

if [[ ! "$retention_days" =~ ^[0-9]+$ ]]; then
  echo "ASSET_RETENTION_DAYS must be a non-negative integer" >&2
  exit 2
fi

cleanup_seed_container() {
  if [ -n "$seed_container" ]; then
    docker rm -f "$seed_container" >/dev/null 2>&1 || true
  fi
}
trap cleanup_seed_container EXIT

install -d -m 0755 "$asset_archive"

# Keep the files used by browser tabs that were opened before this deployment.
if docker container inspect "$container_name" >/dev/null 2>&1; then
  docker cp "$container_name:/usr/share/nginx/html/assets/." "$asset_archive/"
fi

# Include every locally retained release image, including the image just built.
while IFS= read -r image_ref; do
  [ -n "$image_ref" ] || continue
  seed_container="$(docker create "$image_ref")"
  docker cp "$seed_container:/usr/share/nginx/html/assets/." "$asset_archive/"
  docker rm "$seed_container" >/dev/null
  seed_container=""
done < <(
  docker image ls --format '{{.Repository}}:{{.Tag}}' \
    | awk -v repository="$image_repository" 'index($0, repository ":") == 1' \
    | sort -u
)

find "$asset_archive" -type f -mtime "+$retention_days" -delete
chmod -R a+rX "$asset_archive"
