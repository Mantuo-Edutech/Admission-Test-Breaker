export interface MantouRuntimeConfiguration {
  supabaseUrl?: string;
  supabasePublishableKey?: string;
  turnstileSiteKey?: string;
  release?: string;
  environment?: string;
}

export interface BrowserBuildEnvironment {
  VITE_SUPABASE_URL?: string;
  VITE_SUPABASE_PUBLISHABLE_KEY?: string;
  VITE_TURNSTILE_SITE_KEY?: string;
}

export interface BrowserAuthProtectionConfiguration {
  provider: "turnstile";
  required: boolean;
  siteKey: string | null;
}

export interface ResolvedBrowserConfiguration {
  supabaseUrl?: string;
  supabasePublishableKey?: string;
  release: string;
  environment: string;
  source: "runtime" | "build" | "unconfigured";
  authProtection: BrowserAuthProtectionConfiguration;
}

declare global {
  interface Window {
    __MANTUO_RUNTIME_CONFIG__?: MantouRuntimeConfiguration;
  }
}

function cleaned(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : undefined;
}

function completePair(
  url: string | undefined,
  publishableKey: string | undefined,
): { url: string; publishableKey: string } | null {
  return url !== undefined && publishableKey !== undefined
    ? { url, publishableKey }
    : null;
}

export function resolveBrowserConfiguration(
  buildEnvironment: BrowserBuildEnvironment,
  runtimeConfiguration: MantouRuntimeConfiguration | undefined =
    typeof window === "undefined" ? undefined : window.__MANTUO_RUNTIME_CONFIG__,
): ResolvedBrowserConfiguration {
  const runtimePair = completePair(
    cleaned(runtimeConfiguration?.supabaseUrl),
    cleaned(runtimeConfiguration?.supabasePublishableKey),
  );
  const buildPair = completePair(
    cleaned(buildEnvironment.VITE_SUPABASE_URL),
    cleaned(buildEnvironment.VITE_SUPABASE_PUBLISHABLE_KEY),
  );
  const selected = runtimePair ?? buildPair;
  const environment = cleaned(runtimeConfiguration?.environment) ?? "local";
  const deployedEnvironment = environment === "staging" || environment === "production";
  const runtimeTurnstileSiteKey = cleaned(runtimeConfiguration?.turnstileSiteKey);
  const turnstileSiteKey = (
    deployedEnvironment
      ? runtimeTurnstileSiteKey
      : runtimeTurnstileSiteKey ?? cleaned(buildEnvironment.VITE_TURNSTILE_SITE_KEY)
  ) ?? null;

  return {
    ...(selected === null
      ? {}
      : {
          supabaseUrl: selected.url,
          supabasePublishableKey: selected.publishableKey,
        }),
    release: cleaned(runtimeConfiguration?.release) ?? "development",
    environment,
    source: runtimePair !== null
      ? "runtime"
      : buildPair !== null
        ? "build"
        : "unconfigured",
    authProtection: {
      provider: "turnstile",
      required: deployedEnvironment || turnstileSiteKey !== null,
      siteKey: turnstileSiteKey,
    },
  };
}
