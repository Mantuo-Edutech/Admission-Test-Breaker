import { lazy, Suspense, useLayoutEffect } from "react";
import type { ReactNode } from "react";
import {
  createBrowserRouter,
  createMemoryRouter,
  useLocation,
} from "react-router-dom";
import type { AppServices } from "./dependencies.js";
import { createDefaultAppServices } from "./dependencies.js";
import { LandingPage } from "../features/practice/pages/LandingPage.js";
import { EXAM_CATALOG } from "../features/catalog/exams.js";

const PracticePage = lazy(async () => ({
  default: (await import("../features/practice/pages/PracticePage.js")).PracticePage,
}));
const ResultsPage = lazy(async () => ({
  default: (await import("../features/practice/pages/ResultsPage.js")).ResultsPage,
}));
const ExamStatusPage = lazy(async () => ({
  default: (await import("../features/catalog/pages/ExamStatusPage.js"))
    .ExamStatusPage,
}));
const TmuaHubPage = lazy(async () => ({
  default: (await import("../features/catalog/pages/TmuaHubPage.js"))
    .TmuaHubPage,
}));

function RouteLoading() {
  return (
    <main className="practice-state-page">
      <p className="eyebrow">PREPARING YOUR DESK</p>
      <h1>正在铺开学习记录…</h1>
    </main>
  );
}

function RouteFrame({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();

  useLayoutEffect(() => {
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, [pathname]);

  return children;
}

export function createAppRouter(
  initialEntries?: string[],
  injectedServices?: AppServices,
) {
  const services = injectedServices ?? createDefaultAppServices();
  const routes = [
    {
      path: "/",
      element: <RouteFrame><LandingPage /></RouteFrame>,
    },
    {
      path: "/exams/tmua",
      element: (
        <RouteFrame>
          <Suspense fallback={<RouteLoading />}>
            <TmuaHubPage services={services} />
          </Suspense>
        </RouteFrame>
      ),
    },
    ...EXAM_CATALOG.filter(
      (exam) => exam.availability === "building",
    ).map((exam) => ({
      path: exam.href,
      element: (
        <RouteFrame>
          <Suspense fallback={<RouteLoading />}>
            <ExamStatusPage exam={exam} />
          </Suspense>
        </RouteFrame>
      ),
    })),
    {
      path: "/practice/tmua-2023-paper-1",
      element: (
        <RouteFrame>
          <Suspense fallback={<RouteLoading />}>
            <PracticePage services={services} />
          </Suspense>
        </RouteFrame>
      ),
    },
    {
      path: "/results/:sessionId",
      element: (
        <RouteFrame>
          <Suspense fallback={<RouteLoading />}>
            <ResultsPage services={services} />
          </Suspense>
        </RouteFrame>
      ),
    },
  ];

  return initialEntries
    ? createMemoryRouter(routes, { initialEntries })
    : createBrowserRouter(routes);
}
