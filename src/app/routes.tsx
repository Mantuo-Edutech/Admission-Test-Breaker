import { lazy, Suspense, useLayoutEffect } from "react";
import type { ReactNode } from "react";
import {
  createBrowserRouter,
  createMemoryRouter,
  Navigate,
  useLocation,
  useParams,
} from "react-router-dom";
import type { AppServices } from "./dependencies.js";
import { createDefaultAppServices } from "./dependencies.js";
import { LandingPage } from "../features/practice/pages/LandingPage.js";
import { EXAM_CATALOG } from "../features/catalog/exams.js";
import { PreparationProfileGate } from "../features/preparation-profile/components/PreparationProfileGate.js";
import { applySiteMetadata } from "./site-metadata.js";

const PracticeRoutePage = lazy(async () => ({
  default: (await import("../features/practice/pages/PracticeRoutePage.js")).PracticeRoutePage,
}));
const ResultsPage = lazy(async () => ({
  default: (await import("../features/practice/pages/ResultsPage.js")).ResultsPage,
}));
const LearningRecordPage = lazy(async () => ({
  default: (await import("../features/practice/pages/LearningRecordPage.js")).LearningRecordPage,
}));
const ExamGuidePage = lazy(async () => ({
  default: (await import("../features/catalog/pages/ExamGuidePage.js"))
    .ExamGuidePage,
}));
const EsatGuidePage = lazy(async () => ({
  default: (await import("../features/catalog/pages/EsatGuidePage.js"))
    .EsatGuidePage,
}));
const EsatProfilePage = lazy(async () => ({
  default: (await import("../features/catalog/pages/EsatProfilePage.js")).EsatProfilePage,
}));
const EsatCoveragePage = lazy(async () => ({
  default: (await import("../features/catalog/pages/EsatCoveragePage.js")).EsatCoveragePage,
}));
const EsatPastPapersPage = lazy(async () => ({
  default: (await import("../features/catalog/pages/EsatPastPapersPage.js")).EsatPastPapersPage,
}));
const LearningLibraryPage = lazy(async () => ({
  default: (await import("../features/library/pages/LearningLibraryPage.js")).LearningLibraryPage,
}));
const ExamNotesPage = lazy(async () => ({
  default: (await import("../features/library/pages/ExamNotesPage.js")).ExamNotesPage,
}));
const ExpertGuidancePage = lazy(async () => ({
  default: (await import("../features/service-bridge/pages/ExpertGuidancePage.js")).ExpertGuidancePage,
}));
const AssessmentPracticeLibraryPage = lazy(async () => ({
  default: (await import("../features/catalog/pages/AssessmentPracticeLibraryPage.js")).AssessmentPracticeLibraryPage,
}));
const TmuaHubPage = lazy(async () => ({
  default: (await import("../features/catalog/pages/TmuaHubPage.js"))
    .TmuaHubPage,
}));
const TmuaDiagnosticPage = lazy(async () => ({
  default: (await import("../features/catalog/pages/TmuaDiagnosticPage.js"))
    .TmuaDiagnosticPage,
}));
const TmuaPastPapersPage = lazy(async () => ({
  default: (await import("../features/catalog/pages/TmuaPastPapersPage.js"))
    .TmuaPastPapersPage,
}));
const TmuaFoundationsNotesPage = lazy(async () => ({
  default: (await import("../features/notes/pages/TmuaFoundationsNotesPage.js"))
    .TmuaFoundationsNotesPage,
}));
const EsatMathematicsNotesPage = lazy(async () => ({
  default: (await import("../features/notes/pages/EsatMathematicsNotesPage.js"))
    .EsatMathematicsNotesPage,
}));
const EsatScienceNotesPage = lazy(async () => ({
  default: (await import("../features/notes/pages/EsatScienceNotesPage.js"))
    .EsatScienceNotesPage,
}));
const TaraReviewNotesPage = lazy(async () => ({
  default: (await import("../features/notes/pages/TaraReviewNotesPage.js"))
    .TaraReviewNotesPage,
}));
const LnatReviewNotesPage = lazy(async () => ({
  default: (await import("../features/notes/pages/LnatReviewNotesPage.js"))
    .LnatReviewNotesPage,
}));
const UcatReviewNotesPage = lazy(async () => ({
  default: (await import("../features/notes/pages/UcatReviewNotesPage.js"))
    .UcatReviewNotesPage,
}));
const TmuaSixWeekPlanPage = lazy(async () => ({
  default: (await import("../features/entitled-content/pages/TmuaSixWeekPlanPage.js"))
    .TmuaSixWeekPlanPage,
}));
const TmuaProfilePage = lazy(async () => ({
  default: (await import("../features/preparation-profile/pages/TmuaProfilePage.js"))
    .TmuaProfilePage,
}));
const TmuaCoveragePage = lazy(async () => ({
  default: (await import("../features/preparation-profile/pages/TmuaCoveragePage.js"))
    .TmuaCoveragePage,
}));
const AssessmentProfilePage = lazy(async () => ({
  default: (await import("../features/preparation-profile/pages/AssessmentProfilePage.js"))
    .AssessmentProfilePage,
}));
const AssessmentPreparationPage = lazy(async () => ({
  default: (await import("../features/preparation-profile/pages/AssessmentPreparationPage.js"))
    .AssessmentPreparationPage,
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
const AccountPage = lazy(async () => ({
  default: (await import("../features/account/pages/AccountPage.js")).AccountPage,
}));
const ForgotPasswordPage = lazy(async () => ({
  default: (await import("../features/account/pages/ForgotPasswordPage.js")).ForgotPasswordPage,
}));
const PasswordResetPage = lazy(async () => ({
  default: (await import("../features/account/pages/PasswordResetPage.js")).PasswordResetPage,
}));
const PrivacyPage = lazy(async () => ({
  default: (await import("../features/data-rights/pages/PrivacyPage.js")).PrivacyPage,
}));
const FeedbackPage = lazy(async () => ({
  default: (await import("../features/feedback/pages/FeedbackPage.js")).FeedbackPage,
}));
const InviteOperationsPage = lazy(async () => ({
  default: (await import("../features/invite-operations/pages/InviteOperationsPage.js"))
    .InviteOperationsPage,
}));
const ProductFunnelAnalyticsPage = lazy(async () => ({
  default: (await import("../features/product-funnel/pages/ProductFunnelAnalyticsPage.js"))
    .ProductFunnelAnalyticsPage,
}));
const ContentReviewOperationsPage = lazy(async () => ({
  default: (await import("../features/content-review-operations/pages/ContentReviewOperationsPage.js"))
    .ContentReviewOperationsPage,
}));
const SharingPage = lazy(async () => ({
  default: (await import("../features/collaboration/pages/SharingPage.js")).SharingPage,
}));
const CollaborationRedeemPage = lazy(async () => ({
  default: (await import("../features/collaboration/pages/CollaborationRedeemPage.js")).CollaborationRedeemPage,
}));
const CollaborationHomePage = lazy(async () => ({
  default: (await import("../features/collaboration/pages/CollaborationHomePage.js")).CollaborationHomePage,
}));
const CollaborationWorkspacePage = lazy(async () => ({
  default: (await import("../features/collaboration/pages/CollaborationWorkspacePage.js")).CollaborationWorkspacePage,
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
    applySiteMetadata(pathname);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, [pathname]);

  return children;
}

function LegacyPracticeStartRedirect() {
  const { paperId } = useParams();
  return (
    <Navigate
      to={paperId === undefined ? "/exams/tmua/past-papers" : `/practice/${paperId}`}
      replace
    />
  );
}

export function createAppRouter(
  initialEntries?: string[],
  injectedServices?: AppServices,
) {
  const services = injectedServices ?? createDefaultAppServices();
  const routes = [
    {
      path: "/",
      element: <RouteFrame><LandingPage services={services} /></RouteFrame>,
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
      element: <Navigate to="/exams/tmua/coverage" replace />,
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
            <TmuaPastPapersPage services={services} />
          </Suspense>
        </RouteFrame>
      ),
    },
    {
      path: "/exams/tmua/record",
      element: <RouteFrame><Suspense fallback={<RouteLoading />}><LearningRecordPage examId="tmua" services={services} /></Suspense></RouteFrame>,
    },
    {
      path: "/exams/tmua/resources",
      element: (
        <RouteFrame>
          <Suspense fallback={<RouteLoading />}>
            <ExamNotesPage examId="tmua" services={services} />
          </Suspense>
        </RouteFrame>
      ),
    },
    {
      path: "/exams/tmua/notes/foundations",
      element: (
        <RouteFrame>
          <Suspense fallback={<RouteLoading />}>
            <TmuaFoundationsNotesPage services={services} />
          </Suspense>
        </RouteFrame>
      ),
    },
    {
      path: "/exams/tmua/notes/six-week-plan",
      element: (
        <RouteFrame>
          <Suspense fallback={<RouteLoading />}>
            <PreparationProfileGate services={services}>
              <TmuaSixWeekPlanPage services={services} />
            </PreparationProfileGate>
          </Suspense>
        </RouteFrame>
      ),
    },
    {
      path: "/exams/esat",
      element: (
        <RouteFrame>
          <Suspense fallback={<RouteLoading />}>
            <EsatGuidePage services={services} />
          </Suspense>
        </RouteFrame>
      ),
    },
    {
      path: "/exams/esat/profile",
      element: <RouteFrame><Suspense fallback={<RouteLoading />}><EsatProfilePage services={services} /></Suspense></RouteFrame>,
    },
    {
      path: "/exams/esat/coverage",
      element: <RouteFrame><Suspense fallback={<RouteLoading />}><EsatCoveragePage /></Suspense></RouteFrame>,
    },
    {
      path: "/exams/esat/dashboard",
      element: <Navigate to="/exams/esat/coverage" replace />,
    },
    {
      path: "/exams/esat/past-papers",
      element: <RouteFrame><Suspense fallback={<RouteLoading />}><EsatPastPapersPage /></Suspense></RouteFrame>,
    },
    {
      path: "/exams/esat/record",
      element: <RouteFrame><Suspense fallback={<RouteLoading />}><LearningRecordPage examId="esat" services={services} /></Suspense></RouteFrame>,
    },
    {
      path: "/exams/esat/resources",
      element: <RouteFrame><Suspense fallback={<RouteLoading />}><ExamNotesPage examId="esat" services={services} /></Suspense></RouteFrame>,
    },
    {
      path: "/exams/esat/notes/mathematics",
      element: <RouteFrame><Suspense fallback={<RouteLoading />}><EsatMathematicsNotesPage /></Suspense></RouteFrame>,
    },
    {
      path: "/exams/esat/notes/sciences",
      element: <RouteFrame><Suspense fallback={<RouteLoading />}><EsatScienceNotesPage /></Suspense></RouteFrame>,
    },
    {
      path: "/exams/tara/profile",
      element: <RouteFrame><Suspense fallback={<RouteLoading />}><AssessmentProfilePage examId="tara" services={services} /></Suspense></RouteFrame>,
    },
    {
      path: "/exams/tara/preparation",
      element: <RouteFrame><Suspense fallback={<RouteLoading />}><AssessmentPreparationPage examId="tara" services={services} /></Suspense></RouteFrame>,
    },
    {
      path: "/exams/lnat/profile",
      element: <RouteFrame><Suspense fallback={<RouteLoading />}><AssessmentProfilePage examId="lnat" services={services} /></Suspense></RouteFrame>,
    },
    {
      path: "/exams/lnat/preparation",
      element: <RouteFrame><Suspense fallback={<RouteLoading />}><AssessmentPreparationPage examId="lnat" services={services} /></Suspense></RouteFrame>,
    },
    {
      path: "/exams/ucat/profile",
      element: <RouteFrame><Suspense fallback={<RouteLoading />}><AssessmentProfilePage examId="ucat" services={services} /></Suspense></RouteFrame>,
    },
    {
      path: "/exams/ucat/preparation",
      element: <RouteFrame><Suspense fallback={<RouteLoading />}><AssessmentPreparationPage examId="ucat" services={services} /></Suspense></RouteFrame>,
    },
    {
      path: "/exams/tara/record",
      element: <RouteFrame><Suspense fallback={<RouteLoading />}><LearningRecordPage examId="tara" services={services} /></Suspense></RouteFrame>,
    },
    {
      path: "/exams/lnat/record",
      element: <RouteFrame><Suspense fallback={<RouteLoading />}><LearningRecordPage examId="lnat" services={services} /></Suspense></RouteFrame>,
    },
    {
      path: "/exams/ucat/record",
      element: <RouteFrame><Suspense fallback={<RouteLoading />}><LearningRecordPage examId="ucat" services={services} /></Suspense></RouteFrame>,
    },
    {
      path: "/exams/tara/resources",
      element: <RouteFrame><Suspense fallback={<RouteLoading />}><ExamNotesPage examId="tara" services={services} /></Suspense></RouteFrame>,
    },
    {
      path: "/exams/tara/notes/foundations",
      element: <RouteFrame><Suspense fallback={<RouteLoading />}><TaraReviewNotesPage services={services} /></Suspense></RouteFrame>,
    },
    {
      path: "/exams/lnat/resources",
      element: <RouteFrame><Suspense fallback={<RouteLoading />}><ExamNotesPage examId="lnat" services={services} /></Suspense></RouteFrame>,
    },
    {
      path: "/exams/lnat/notes/foundations",
      element: <RouteFrame><Suspense fallback={<RouteLoading />}><LnatReviewNotesPage services={services} /></Suspense></RouteFrame>,
    },
    {
      path: "/exams/ucat/resources",
      element: <RouteFrame><Suspense fallback={<RouteLoading />}><ExamNotesPage examId="ucat" services={services} /></Suspense></RouteFrame>,
    },
    {
      path: "/exams/ucat/notes/foundations",
      element: <RouteFrame><Suspense fallback={<RouteLoading />}><UcatReviewNotesPage services={services} /></Suspense></RouteFrame>,
    },
    {
      path: "/library",
      element: <RouteFrame><Suspense fallback={<RouteLoading />}><LearningLibraryPage services={services} /></Suspense></RouteFrame>,
    },
    {
      path: "/exams/tara/past-papers",
      element: <RouteFrame><Suspense fallback={<RouteLoading />}><AssessmentPracticeLibraryPage examId="tara" /></Suspense></RouteFrame>,
    },
    {
      path: "/exams/lnat/past-papers",
      element: <RouteFrame><Suspense fallback={<RouteLoading />}><AssessmentPracticeLibraryPage examId="lnat" /></Suspense></RouteFrame>,
    },
    {
      path: "/exams/ucat/past-papers",
      element: <RouteFrame><Suspense fallback={<RouteLoading />}><AssessmentPracticeLibraryPage examId="ucat" /></Suspense></RouteFrame>,
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
      path: "/account",
      element: <RouteFrame><Suspense fallback={<RouteLoading />}><AccountPage services={services} /></Suspense></RouteFrame>,
    },
    {
      path: "/operations/invites",
      element: <RouteFrame><Suspense fallback={<RouteLoading />}><InviteOperationsPage services={services} /></Suspense></RouteFrame>,
    },
    {
      path: "/operations/funnel",
      element: <RouteFrame><Suspense fallback={<RouteLoading />}><ProductFunnelAnalyticsPage services={services} /></Suspense></RouteFrame>,
    },
    {
      path: "/operations/content-review",
      element: <RouteFrame><Suspense fallback={<RouteLoading />}><ContentReviewOperationsPage services={services} /></Suspense></RouteFrame>,
    },
    {
      path: "/account/sharing",
      element: <RouteFrame><Suspense fallback={<RouteLoading />}><SharingPage services={services} /></Suspense></RouteFrame>,
    },
    {
      path: "/collaboration/redeem",
      element: <RouteFrame><Suspense fallback={<RouteLoading />}><CollaborationRedeemPage services={services} /></Suspense></RouteFrame>,
    },
    {
      path: "/collaboration",
      element: <RouteFrame><Suspense fallback={<RouteLoading />}><CollaborationHomePage services={services} /></Suspense></RouteFrame>,
    },
    {
      path: "/collaboration/:grantId",
      element: <RouteFrame><Suspense fallback={<RouteLoading />}><CollaborationWorkspacePage services={services} /></Suspense></RouteFrame>,
    },
    {
      path: "/privacy",
      element: <RouteFrame><Suspense fallback={<RouteLoading />}><PrivacyPage /></Suspense></RouteFrame>,
    },
    {
      path: "/feedback",
      element: <RouteFrame><Suspense fallback={<RouteLoading />}><FeedbackPage services={services} /></Suspense></RouteFrame>,
    },
    {
      path: "/forgot-password",
      element: <RouteFrame><Suspense fallback={<RouteLoading />}><ForgotPasswordPage services={services} /></Suspense></RouteFrame>,
    },
    {
      path: "/auth/reset",
      element: <RouteFrame><Suspense fallback={<RouteLoading />}><PasswordResetPage services={services} /></Suspense></RouteFrame>,
    },
    {
      path: "/auth/confirm",
      element: <RouteFrame><Suspense fallback={<RouteLoading />}><EmailConfirmationPage services={services} /></Suspense></RouteFrame>,
    },
    {
      path: "/access/complete",
      element: <RouteFrame><Suspense fallback={<RouteLoading />}><AccessCompletePage services={services} /></Suspense></RouteFrame>,
    },
    ...EXAM_CATALOG.map((exam) => ({
      path: `${exam.href}/coaching`,
      element: (
        <RouteFrame>
          <Suspense fallback={<RouteLoading />}>
            <ExpertGuidancePage examId={exam.id} />
          </Suspense>
        </RouteFrame>
      ),
    })),
    ...EXAM_CATALOG.filter(
      (exam) => exam.availability === "guide" && exam.id !== "esat",
    ).map((exam) => ({
      path: exam.href,
      element: (
        <RouteFrame>
          <Suspense fallback={<RouteLoading />}>
            <ExamGuidePage exam={exam} />
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
      element: <LegacyPracticeStartRedirect />,
    },
    {
      path: "/practice/:paperId",
      element: (
        <RouteFrame>
          <Suspense fallback={<RouteLoading />}>
            <PracticeRoutePage services={services} />
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
