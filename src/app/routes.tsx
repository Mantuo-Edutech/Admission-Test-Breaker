import { lazy, Suspense } from "react";
import { createBrowserRouter, createMemoryRouter } from "react-router-dom";
import type { AppServices } from "./dependencies.js";
import { createDefaultAppServices } from "./dependencies.js";
import { LandingPage } from "../features/practice/pages/LandingPage.js";

const PracticePage = lazy(async () => ({
  default: (await import("../features/practice/pages/PracticePage.js")).PracticePage,
}));
const ResultsPage = lazy(async () => ({
  default: (await import("../features/practice/pages/ResultsPage.js")).ResultsPage,
}));

function RouteLoading() {
  return (
    <main className="practice-state-page">
      <p className="eyebrow">PREPARING YOUR DESK</p>
      <h1>正在铺开学习记录…</h1>
    </main>
  );
}

export function createAppRouter(
  initialEntries?: string[],
  injectedServices?: AppServices,
) {
  const services = injectedServices ?? createDefaultAppServices();
  const routes = [
    { path: "/", element: <LandingPage services={services} /> },
    {
      path: "/practice/tmua-2023-paper-1",
      element: (
        <Suspense fallback={<RouteLoading />}>
          <PracticePage services={services} />
        </Suspense>
      ),
    },
    {
      path: "/results/:sessionId",
      element: (
        <Suspense fallback={<RouteLoading />}>
          <ResultsPage services={services} />
        </Suspense>
      ),
    },
  ];

  return initialEntries
    ? createMemoryRouter(routes, { initialEntries })
    : createBrowserRouter(routes);
}
