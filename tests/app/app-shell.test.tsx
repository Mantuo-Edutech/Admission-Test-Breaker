import { render, screen } from "@testing-library/react";
import { RouterProvider } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { createAppRouter } from "../../src/app/routes.js";

describe("application shell", () => {
  it("opens on the TMUA experience landing route", async () => {
    render(<RouterProvider router={createAppRouter(["/"])} />);
    expect(
      await screen.findByRole("heading", { name: "把焦虑，拆成每一道题。" }),
    ).toBeInTheDocument();
  });
});
