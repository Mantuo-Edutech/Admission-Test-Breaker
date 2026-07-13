import { render, screen, within } from "@testing-library/react";
import { RouterProvider } from "react-router-dom";
import { describe, expect, it } from "vitest";
import type { AppServices } from "../../src/app/dependencies.js";
import { createAppRouter } from "../../src/app/routes.js";
import type { PracticeSession } from "../../src/features/practice/domain/session.js";
import type {
  PracticeSessionStore,
  SessionLoadResult,
  SessionSaveResult,
} from "../../src/features/practice/storage/store.js";
import { FIXED_GUEST_SPACE_STORE } from "../support/fixed-guest-space-store.js";

class EmptyStore implements PracticeSessionStore {
  async loadCurrent(): Promise<SessionLoadResult> {
    return { session: null, issue: null };
  }

  async save(_session: PracticeSession): Promise<SessionSaveResult> {
    return { persisted: true };
  }

  async clearCurrent(): Promise<void> {}
}

const services: AppServices = {
  store: new EmptyStore(),
  guestSpaceStore: FIXED_GUEST_SPACE_STORE,
  now: () => new Date("2026-07-13T09:00:00.000Z"),
  ids: {
    sessionId: () => "ses_accessibility",
    eventId: () => "evt_accessibility",
  },
};

function expectNamedControlsAndImages(container: HTMLElement): void {
  for (const control of container.querySelectorAll("a, button")) {
    expect(control).toHaveAccessibleName();
  }
  for (const image of container.querySelectorAll("img")) {
    expect(image).toHaveAttribute("alt");
    expect(image.getAttribute("alt")?.trim()).not.toBe("");
  }
}

describe("public exam front-door accessibility", () => {
  it("has one clear page title and keyboard-native exam entries", async () => {
    const router = createAppRouter(["/"], services);
    const { container } = render(<RouterProvider router={router} />);

    await screen.findByRole("heading", { name: "不再为升学考试而焦虑" });
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    const selector = screen.getByRole("region", { name: "你正在准备哪一项考试？" });
    const links = within(selector).getAllByRole("link");
    expect(links).toHaveLength(4);
    links.forEach((link) => {
      expect(link).toHaveAttribute("href");
      expect(link).not.toHaveAttribute("tabindex", "-1");
    });
    expectNamedControlsAndImages(container);
  });

  it("expresses unopened exams in text without a misleading training action", async () => {
    const router = createAppRouter(["/exams/esat"], services);
    const { container } = render(<RouterProvider router={router} />);

    await screen.findByRole("heading", { level: 1, name: "ESAT" });
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getByText("资料馆建设中")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /开始|训练/u })).not.toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expectNamedControlsAndImages(container);
  });

  it("keeps future TMUA steps inert and exposes the archive as a table", async () => {
    const router = createAppRouter(["/exams/tmua"], services);
    const { container } = render(<RouterProvider router={router} />);

    await screen.findByRole("heading", { level: 1, name: "TMUA 备考中心" });
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    const journey = screen.getByRole("list", { name: "TMUA 完整备考路径" });
    const steps = within(journey).getAllByRole("listitem");
    expect(within(steps[0]!).queryByRole("link")).not.toBeInTheDocument();
    expect(within(steps[1]!).queryByRole("button")).not.toBeInTheDocument();
    expect(within(steps[4]!).queryByRole("link")).not.toBeInTheDocument();
    expect(
      screen.getByRole("table", { name: "TMUA 历年真题资料馆" }),
    ).toBeInTheDocument();
    expectNamedControlsAndImages(container);
  });
});
