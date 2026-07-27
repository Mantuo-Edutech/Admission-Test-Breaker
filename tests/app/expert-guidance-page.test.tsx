import { render, screen, within } from "@testing-library/react";
import { RouterProvider } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { createAppRouter } from "../../src/app/routes.js";

describe("expert guidance module", () => {
  it("answers the human-help question directly and shows Bingbing's QR code", async () => {
    render(<RouterProvider router={createAppRouter(["/exams/tmua/coaching"])} />);

    expect(await screen.findByRole("heading", {
      level: 1,
      name: /High-impact one-to-one coaching for your final 10 hours/u,
    })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Bingbing's WeChat QR code" })).toBeInTheDocument();
    expect(screen.getByText("Book your TMUA final-sprint plan")).toBeInTheDocument();
    expect(screen.getByText(/arrange one-to-one coaching/u)).toBeInTheDocument();
    const value = screen.getByRole("region", { name: "What expert guidance includes" });
    for (const heading of ["Find the real bottleneck", "Build a 10-hour plan", "Solve it one to one"]) {
      expect(within(value).getByRole("heading", { name: new RegExp(heading, "u") })).toBeInTheDocument();
    }
    expect(screen.getByText(/Adding WeChat never opens your course profile/u)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Save QR code/u })).toHaveAttribute(
      "href",
      "/brand/bingbing-wechat-qr.jpg",
    );
  });
});
