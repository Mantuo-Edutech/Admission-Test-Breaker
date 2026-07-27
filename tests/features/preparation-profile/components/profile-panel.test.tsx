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
      screen.getByRole("heading", { name: /Tell us what you study/u }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Browse TMUA first" })).not.toBeInTheDocument();
    expect(screen.getByText(/private by default/u)).toBeInTheDocument();
    expect(screen.queryByText(/AI 解读|Token|付费/u)).not.toBeInTheDocument();
  });

  it("saves an exact CAIE qualification and module selection", async () => {
    const user = userEvent.setup();
    const onSave = renderPanel();

    await user.click(screen.getByRole("radio", { name: /CAIE/u }));
    await user.click(
      screen.getByRole("checkbox", { name: /Mathematics \(9709\)/u }),
    );
    const moduleGroup = screen.getByLabelText(
      /Cambridge International AS & A Level Mathematics \(9709\) modules/u,
    );
    await user.click(within(moduleGroup).getByRole("checkbox", { name: /Pure Mathematics 1/u }));
    await user.click(screen.getByRole("radio", { name: /A few questions/u }));
    await user.click(screen.getByRole("button", { name: "Save and view coverage" }));

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
      await screen.findByRole("heading", { name: /Your course profile/u }),
    ).toBeInTheDocument();
    expect(screen.getByText("Ready to view")).toBeInTheDocument();
    expect(screen.getByText("Generated after a full paper")).toBeInTheDocument();
  });

  it("does not infer a profile when a selected qualification has no module", async () => {
    const user = userEvent.setup();
    const onSave = renderPanel();

    await user.click(screen.getByRole("radio", { name: /CAIE/u }));
    await user.click(
      screen.getByRole("checkbox", { name: /Mathematics \(9709\)/u }),
    );
    await user.click(screen.getByRole("radio", { name: /Not started/u }));
    await user.click(screen.getByRole("button", { name: "Save and view coverage" }));

    expect(screen.getByRole("alert")).toHaveTextContent("Choose at least one module");
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
      /^Pearson Edexcel International A Level Mathematics modules/u,
    );
    for (const label of ["P1", "P2", "P3", "P4", "M1", "M2", "S1", "S2", "D1"]) {
      expect(within(moduleGroup).getByRole("checkbox", { name: new RegExp(`^${label}`, "u") })).toBeInTheDocument();
    }
  });

  it("offers all four IB mathematics routes with bilingual topic selection", async () => {
    const user = userEvent.setup();
    renderPanel();

    await user.click(screen.getByRole("radio", { name: /IB Diploma Programme/u }));
    for (const route of [
      /Analysis & Approaches SL/u,
      /Analysis & Approaches HL/u,
      /Applications & Interpretation SL/u,
      /Applications & Interpretation HL/u,
    ]) {
      expect(screen.getByRole("checkbox", { name: route })).toBeInTheDocument();
    }
    await user.click(screen.getByRole("checkbox", { name: /Analysis & Approaches HL/u }));
    const modules = screen.getByLabelText(/Analysis & Approaches HL.*modules/u);
    expect(within(modules).getByRole("checkbox", { name: /Functions · 函数/u })).toBeInTheDocument();
    expect(within(modules).getByRole("checkbox", { name: /Calculus · 微积分/u })).toBeInTheDocument();
  });

  it("saves completed AP units instead of treating an AP course title as full coverage", async () => {
    const user = userEvent.setup();
    const onSave = renderPanel();

    await user.click(screen.getByRole("radio", { name: /AP \/ US Curriculum/u }));
    await user.click(screen.getByRole("checkbox", { name: /AP Precalculus/u }));
    const modules = screen.getByLabelText(/AP Precalculus.*modules/u);
    await user.click(within(modules).getByRole("checkbox", { name: /Unit 1.*多项式与有理函数/u }));
    await user.click(within(modules).getByRole("checkbox", { name: /Unit 2.*指数与对数函数/u }));
    await user.click(screen.getByRole("radio", { name: /A few questions/u }));
    await user.click(screen.getByRole("button", { name: "Save and view coverage" }));

    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({
      curriculumSystem: "ap",
      selections: [{
        qualificationId: "ap-precalculus-effective-fall-2026",
        unitIds: ["u1", "u2"],
      }],
    }));
  });
});
