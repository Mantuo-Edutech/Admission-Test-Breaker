import { render, screen, within } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ProfilePanel } from "../../../../src/features/preparation-profile/components/ProfilePanel.js";

function renderPanel(onSave = vi.fn(async () => ({ persisted: true }))) {
  render(
    <ProfilePanel
      guestSpaceId="gsp_profile-component"
      profile={null}
      now={() => new Date("2026-07-14T02:00:00.000Z")}
      onSave={onSave}
    />,
  );
  return onSave;
}

describe("progressive preparation profile panel", () => {
  it("starts with required context and privacy without AI or paid promotion", () => {
    renderPanel();

    expect(
      screen.getByRole("heading", { name: "告诉我们你正在学什么" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "先浏览 TMUA 内容" })).not.toBeInTheDocument();
    expect(screen.getByText(/只保存在这台设备/)).toBeInTheDocument();
    expect(screen.queryByText(/\bAI\b|Token|付费/u)).not.toBeInTheDocument();
  });

  it("saves an exact CAIE qualification and module selection", async () => {
    const user = userEvent.setup();
    const onSave = renderPanel();

    await user.click(screen.getByRole("radio", { name: /CAIE/u }));
    await user.click(
      screen.getByRole("checkbox", { name: /Mathematics \(9709\)/u }),
    );
    const moduleGroup = screen.getByLabelText(
      /Cambridge International AS & A Level Mathematics \(9709\) 模块/u,
    );
    await user.click(within(moduleGroup).getByRole("checkbox", { name: /Pure Mathematics 1/u }));
    await user.click(screen.getByRole("radio", { name: /做过少量题/u }));
    await user.click(screen.getByRole("button", { name: "保存并查看知识覆盖" }));

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        guestSpaceId: "gsp_profile-component",
        entryCycle: "2027",
        curriculumSystem: "caie",
        selections: [
          {
            qualificationId: "caie-9709-2026-2027",
            unitIds: ["p1"],
          },
        ],
        experience: "sampled",
      }),
    );
    expect(
      await screen.findByRole("heading", { name: "你的课程信息" }),
    ).toBeInTheDocument();
    expect(screen.getByText("可以查看")).toBeInTheDocument();
    expect(screen.getByText("完成练习后生成")).toBeInTheDocument();
  });

  it("does not infer a profile when a selected qualification has no module", async () => {
    const user = userEvent.setup();
    const onSave = renderPanel();

    await user.click(screen.getByRole("radio", { name: /CAIE/u }));
    await user.click(
      screen.getByRole("checkbox", { name: /Mathematics \(9709\)/u }),
    );
    await user.click(screen.getByRole("radio", { name: /还没有开始/u }));
    await user.click(screen.getByRole("button", { name: "保存并查看知识覆盖" }));

    expect(screen.getByRole("alert")).toHaveTextContent("至少选择一个具体模块");
    expect(onSave).not.toHaveBeenCalled();
  });

  it("shows the official Pearson Mathematics module set", async () => {
    const user = userEvent.setup();
    renderPanel();

    await user.click(screen.getByRole("radio", { name: /Pearson Edexcel IAL/u }));
    await user.click(
      screen.getByRole("checkbox", { name: /^Pearson Edexcel International A Level Mathematics/u }),
    );
    const moduleGroup = screen.getByLabelText(
      /^Pearson Edexcel International A Level Mathematics 模块/u,
    );
    for (const label of ["P1", "P2", "P3", "P4", "M1", "M2", "S1", "S2", "D1"]) {
      expect(within(moduleGroup).getByRole("checkbox", { name: new RegExp(`^${label}`, "u") })).toBeInTheDocument();
    }
  });
});
