import { createBrowserRouter, createMemoryRouter } from "react-router-dom";

function LandingPlaceholder() {
  return <h1>把焦虑，拆成每一道题。</h1>;
}

const routes = [{ path: "/", element: <LandingPlaceholder /> }];

export function createAppRouter(initialEntries?: string[]) {
  return initialEntries
    ? createMemoryRouter(routes, { initialEntries })
    : createBrowserRouter(routes);
}
