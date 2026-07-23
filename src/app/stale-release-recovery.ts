const RECOVERY_SIGNATURE_KEY = "admission-test-breaker:stale-release-signature:v1";
const RECOVERY_NOTICE_ID = "stale-release-recovery";

interface RecoveryDependencies {
  readonly eventTarget: Pick<Window, "addEventListener" | "removeEventListener">;
  readonly storage: Pick<Storage, "getItem" | "setItem" | "removeItem">;
  readonly document: Document;
  readonly reload: () => void;
}

function errorSignature(event: VitePreloadErrorEvent): string {
  const message = event.payload instanceof Error
    ? event.payload.message
    : String(event.payload ?? "unknown-preload-error");
  return message.slice(0, 1_000);
}

function showManualRecovery(
  documentRef: Document,
  storage: RecoveryDependencies["storage"],
  reload: () => void,
): void {
  if (documentRef.getElementById(RECOVERY_NOTICE_ID) !== null) return;

  const notice = documentRef.createElement("section");
  notice.id = RECOVERY_NOTICE_ID;
  notice.className = "stale-release-recovery";
  notice.setAttribute("role", "alert");
  notice.setAttribute("aria-labelledby", `${RECOVERY_NOTICE_ID}-title`);

  const copy = documentRef.createElement("div");
  const title = documentRef.createElement("h1");
  title.id = `${RECOVERY_NOTICE_ID}-title`;
  title.textContent = "网站刚刚完成更新";
  const description = documentRef.createElement("p");
  description.textContent = "当前标签页仍在使用旧版本。刷新后即可继续进入试卷，已保存的作答不会丢失。";
  copy.append(title, description);

  const button = documentRef.createElement("button");
  button.type = "button";
  button.textContent = "刷新并继续";
  button.addEventListener("click", () => {
    storage.removeItem(RECOVERY_SIGNATURE_KEY);
    reload();
  });

  notice.append(copy, button);
  documentRef.body.append(notice);
}

export function installStaleReleaseRecovery(
  dependencies: RecoveryDependencies = {
    eventTarget: window,
    storage: window.sessionStorage,
    document,
    reload: () => window.location.reload(),
  },
): () => void {
  const onPreloadError = (rawEvent: Event) => {
    const event = rawEvent as VitePreloadErrorEvent;
    event.preventDefault();
    const signature = errorSignature(event);
    const previousSignature = dependencies.storage.getItem(RECOVERY_SIGNATURE_KEY);

    if (previousSignature !== signature) {
      dependencies.storage.setItem(RECOVERY_SIGNATURE_KEY, signature);
      dependencies.reload();
      return;
    }

    showManualRecovery(dependencies.document, dependencies.storage, dependencies.reload);
  };

  dependencies.eventTarget.addEventListener("vite:preloadError", onPreloadError);
  return () => dependencies.eventTarget.removeEventListener("vite:preloadError", onPreloadError);
}

export const STALE_RELEASE_RECOVERY_SIGNATURE_KEY = RECOVERY_SIGNATURE_KEY;
