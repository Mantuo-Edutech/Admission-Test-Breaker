# Stale SPA release recovery

## Decision

The public site must support browser tabs that remain open while a new release is deployed.

Two independent safeguards are required:

1. The client listens for Vite's `vite:preloadError` event before React routing starts. It reloads once when a lazy route from an old release can no longer be fetched, then presents a manual refresh notice instead of entering a reload loop.
2. Production deployments merge hashed assets from the running container and retained release images into a read-only asset archive. The archive is mounted at `/usr/share/nginx/html/assets` and files are retained for 14 days.

The current `index.html` and runtime configuration are never archived. They remain non-cacheable and always come from the active release.

## Why

React Router updates the URL before a lazy route module has necessarily finished loading. Replacing a container removes the old hashed JavaScript and CSS files. A tab opened before deployment can therefore show a changed URL without rendering the destination page.

Keeping old immutable assets prevents most failures. Client recovery covers missing assets, interrupted requests and releases older than the retention window.

## Verification

- Unit tests dispatch a cancelable `vite:preloadError` and verify one automatic reload plus loop protection.
- Architecture tests require recovery to be installed before `createRoot` and require the deployment asset archive contract.
- Deployment smoke tests must open the practice library and enter a paper without a manual page refresh.
