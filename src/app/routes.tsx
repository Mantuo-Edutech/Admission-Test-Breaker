import { lazy, Suspense, useLayoutEffect } from "react";
import type { ReactNode } from "react";
import {
  createBrowserRouter,
  createMemoryRouter,
  Navigate,
  useLocation,
} from "react-router-dom";
import type { AppServices } from "./dependencies.js";
import { createDefaultAppServices } from "./dependencies.js";
import { LandingPage } from "../features/practice/pages/LandingPage.js";
import { EXAM_CATALOG } from "../features/catalog/exams.js";
import { PreparationProfileGate } from "../features/preparation-profile/components/PreparationProfileGate.js";

const PracticePage = lazy(async () => ({
  default: (await import("../features/practice/pages/PracticePage.js")).PracticePage,
}));
const PracticeLaunchPage = lazy(async () => ({
  default: (await import("../features/practice/pages/PracticeLaunchPage.js"))
    .PracticeLaunchPage,
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
const TmuaDashboardPage = lazy(async () => ({
  default: (await import("../features/catalog/pages/TmuaDashboardPage.js"))
    .TmuaDashboardPage,
}));
const TmuaDiagnosticPage = lazy(async () => ({
  default: (await import("../features/catalog/pages/TmuaDiagnosticPage.js"))
    .TmuaDiagnosticPage,
}));
const TmuaPastPapersPage = lazy(async () => ({
  default: (await import("../features/catalog/pages/TmuaPastPapersPage.js"))
    .TmuaPastPapersPage,
}));
const TmuaResourcesPage = lazy(async () => ({
  default: (await import("../features/catalog/pages/TmuaResourcesPage.js"))
    .TmuaResourcesPage,
}));
const TmuaProfilePage = lazy(async () => ({
  default: (await import("../features/preparation-profile/pages/TmuaProfilePage.js"))
    .TmuaProfilePage,
}));
const TmuaCoveragePage = lazy(async () => ({
  default: (await import("../features/preparation-profile/pages/TmuaCoveragePage.js"))
    .TmuaCoveragePage,
}));
const InviteAccessPage = lazy(async () => ({
  default: (await import("../features/account/pages/InviteAccessPage.js"))
    .InviteAccessPage,
}));
const RegisterPage = lazy(async () => ({
  default: (await import("../features/account/pages/RegisterPage.js")).RegisterPage,
}));
const LoginPage = lazy(async () => ({
  default: (await import("../features/account/pages/LoginPage.js")).LoginPage,
}));
const EmailConfirmationPage = lazy(async () => ({
  default: (await import("../features/account/pages/EmailConfirmationPage.js"))
    .EmailConfirmationPage,
}));
const AccessCompletePage = lazy(async () => ({
  default: (await import("../features/account/pages/AccessCompletePage.js"))
    .AccessCompletePage,
}));

function RouteLoading() {
  return (
    <main className="practice-state-page">
      <p className="eyebrow">正在打开页面</p>
      <h1>正在准备内容…</h1>
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
    {
      path: "/exams/tmua/profile",
      element: (
        <RouteFrame>
          <Suspense fallback={<RouteLoading />}>
            <TmuaProfilePage services={services} />
          </Suspense>
        </RouteFrame>
      ),
    },
    {
      path: "/exams/tmua/coverage",
      element: (
        <RouteFrame>
          <Suspense fallback={<RouteLoading />}>
            <TmuaCoveragePage services={services} />
          </Suspense>
        </RouteFrame>
      ),
    },
    {
      path: "/exams/tmua/dashboard",
      element: (
        <RouteFrame>
          <Suspense fallback={<RouteLoading />}>
            <TmuaDashboardPage services={services} />
          </Suspense>
        </RouteFrame>
      ),
    },
    {
      path: "/exams/tmua/diagnostic",
      element: (
        <RouteFrame>
          <Suspense fallback={<RouteLoading />}>
            <TmuaDiagnosticPage services={services} />
          </Suspense>
        </RouteFrame>
      ),
    },
    {
      path: "/exams/tmua/past-papers",
      element: (
        <RouteFrame>
          <Suspense fallback={<RouteLoading />}>
            <TmuaPastPapersPage />
          </Suspense>
        </RouteFrame>
      ),
    },
    {
      path: "/exams/tmua/resources",
      element: (
        <RouteFrame>
          <Suspense fallback={<RouteLoading />}>
            <TmuaResourcesPage services={services} />
          </Suspense>
        </RouteFrame>
      ),
    },
    {
      path: "/access",
      element: <RouteFrame><Suspense fallback={<RouteLoading />}><InviteAccessPage services={services} /></Suspense></RouteFrame>,
    },
    {
      path: "/register",
      element: <RouteFrame><Suspense fallback={<RouteLoading />}><RegisterPage services={services} /></Suspense></RouteFrame>,
    },
    {
      path: "/login",
      element: <RouteFrame><Suspense fallback={<RouteLoading />}><LoginPage services={services} /></Suspense></RouteFrame>,
    },
    {
      path: "/auth/confirm",
      element: <RouteFrame><Suspense fallback={<RouteLoading />}><EmailConfirmationPage services={services} /></Suspense></RouteFrame>,
    },
    {
      path: "/access/complete",
      element: <RouteFrame><Suspense fallback={<RouteLoading />}><AccessCompletePage services={services} /></Suspense></RouteFrame>,
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
      element: <Navigate to="/practice/tmua-2023-p1" replace />,
    },
    {
      path: "/practice/:paperId/start",
      element: (
        <RouteFrame>
          <Suspense fallback={<RouteLoading />}>
            <PreparationProfileGate services={services}>
              <PracticeLaunchPage services={services} />
            </PreparationProfileGate>
          </Suspense>
        </RouteFrame>
      ),
    },
    {
      path: "/practice/:paperId",
      element: (
        <RouteFrame>
          <Suspense fallback={<RouteLoading />}>
            <PreparationProfileGate services={services}>
              <PracticePage services={services} />
            </PreparationProfileGate>
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
