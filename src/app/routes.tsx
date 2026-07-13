import { createBrowserRouter, createMemoryRouter } from "react-router-dom";
import type { AppServices } from "./dependencies.js";
import { createDefaultAppServices } from "./dependencies.js";
import { LandingPage } from "../features/practice/pages/LandingPage.js";

function PracticePlaceholder() {
  return <main><h1>TMUA 2023 · Paper 1</h1></main>;
}

function ResultsPlaceholder() {
  return <main><h1>练习结果</h1></main>;
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
      element: <PracticePlaceholder />,
    },
    { path: "/results/:sessionId", element: <ResultsPlaceholder /> },
  ];

  return initialEntries
    ? createMemoryRouter(routes, { initialEntries })
    : createBrowserRouter(routes);
}
