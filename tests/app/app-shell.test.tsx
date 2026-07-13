import { render, screen } from "@testing-library/react";
import { RouterProvider } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { createAppRouter } from "../../src/app/routes.js";

describe("application shell", () => {
  it("opens on the Mantou multi-exam front door", async () => {
    render(<RouterProvider router={createAppRouter(["/"])} />);
    expect(
      await screen.findByRole("heading", { name: "不再为升学考试而焦虑" }),
    ).toBeInTheDocument();
  });
});
