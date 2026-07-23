import { afterEach, describe, expect, it, vi } from "vitest";
import {
  installStaleReleaseRecovery,
  STALE_RELEASE_RECOVERY_SIGNATURE_KEY,
} from "../../src/app/stale-release-recovery.js";

function preloadError(message: string): VitePreloadErrorEvent {
  const event = new Event("vite:preloadError", { cancelable: true }) as VitePreloadErrorEvent;
  Object.defineProperty(event, "payload", { value: new Error(message) });
  return event;
}

afterEach(() => {
  globalThis.sessionStorage.clear();
  document.getElementById("stale-release-recovery")?.remove();
});

describe("stale release recovery", () => {
  it("reloads once when a deployment removed a lazy route chunk", () => {
    const reload = vi.fn();
    const uninstall = installStaleReleaseRecovery({
      eventTarget: window,
      storage: globalThis.sessionStorage,
      document,
      reload,
    });

    const event = preloadError("Unable to preload CSS for /assets/old-route.css");
    window.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);
    expect(reload).toHaveBeenCalledOnce();
    expect(globalThis.sessionStorage.getItem(STALE_RELEASE_RECOVERY_SIGNATURE_KEY))
      .toBe("Unable to preload CSS for /assets/old-route.css");
    uninstall();
  });

  it("stops a reload loop and offers an explicit recovery action", () => {
    const reload = vi.fn();
    const uninstall = installStaleReleaseRecovery({
      eventTarget: window,
      storage: globalThis.sessionStorage,
      document,
      reload,
    });
    const message = "Failed to fetch dynamically imported module /assets/old-route.js";
    globalThis.sessionStorage.setItem(STALE_RELEASE_RECOVERY_SIGNATURE_KEY, message);

    window.dispatchEvent(preloadError(message));

    expect(reload).not.toHaveBeenCalled();
    const notice = document.getElementById("stale-release-recovery");
    expect(notice).toHaveAttribute("role", "alert");
    expect(notice).toHaveTextContent("网站刚刚完成更新");
    notice!.querySelector("button")!.click();
    expect(globalThis.sessionStorage.getItem(STALE_RELEASE_RECOVERY_SIGNATURE_KEY)).toBeNull();
    expect(reload).toHaveBeenCalledOnce();
    uninstall();
  });
});
