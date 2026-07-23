import { render, screen, waitFor } from "@testing-library/react";
import { RouterProvider } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { createAppRouter } from "../../src/app/routes.js";
import { publicContentProducts } from "../../src/features/library/content-product-registry.js";

const publicProductRoutes = [...new Set(
  publicContentProducts().map((product) => product.route!),
)];

describe("public content product route audit", () => {
  it("covers every distinct public product route", () => {
    expect(publicContentProducts()).toHaveLength(40);
    expect(publicProductRoutes).toHaveLength(35);
  });

  it.each(publicProductRoutes)("loads %s inside the application", async (route) => {
    globalThis.localStorage.clear();
    globalThis.sessionStorage.clear();

    const { container } = render(
      <RouterProvider router={createAppRouter([route])} />,
    );

    await waitFor(() => {
      expect(screen.queryByText("正在准备内容…")).not.toBeInTheDocument();
    }, { timeout: 5_000 });

    expect(container.querySelector("main")).not.toBeNull();
    expect(container.querySelector("#react-router-error-page")).toBeNull();
  });
});
