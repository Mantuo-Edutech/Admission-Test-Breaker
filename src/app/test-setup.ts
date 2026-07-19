import "@testing-library/jest-dom/vitest";
import { cleanup, configure } from "@testing-library/react";
import { afterEach } from "vitest";

// Lazy route modules can take longer than Testing Library's one-second default
// when the complete 90+ file suite is transforming in parallel. Keep component
// assertions deterministic without hiding genuine application hangs behind the
// much larger Vitest test timeout.
configure({ asyncUtilTimeout: 3_000 });

afterEach(cleanup);
