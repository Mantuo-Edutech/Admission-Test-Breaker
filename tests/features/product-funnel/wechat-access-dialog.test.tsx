import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { WechatAccessDialog } from "../../../src/features/service-bridge/components/WechatAccessDialog.js";

describe("Bingbing access funnel boundary", () => {
  it("reports one deliberate open and reports again only after a close-reopen cycle", () => {
    const onOpened = vi.fn();
    const onOpenChange = vi.fn();
    const { rerender } = render(
      <WechatAccessDialog
        open
        target="review-notes"
        examName="TMUA"
        onOpenChange={onOpenChange}
        onOpened={onOpened}
      />,
    );

    expect(screen.getByRole("dialog", { name: "添加冰冰，获取完整版复习笔记" })).toBeInTheDocument();
    expect(onOpened).toHaveBeenCalledTimes(1);

    rerender(
      <WechatAccessDialog
        open
        target="review-notes"
        examName="TMUA"
        onOpenChange={onOpenChange}
        onOpened={onOpened}
      />,
    );
    expect(onOpened).toHaveBeenCalledTimes(1);

    rerender(
      <WechatAccessDialog
        open={false}
        target="review-notes"
        examName="TMUA"
        onOpenChange={onOpenChange}
        onOpened={onOpened}
      />,
    );
    rerender(
      <WechatAccessDialog
        open
        target="review-notes"
        examName="TMUA"
        onOpenChange={onOpenChange}
        onOpened={onOpened}
      />,
    );

    expect(onOpened).toHaveBeenCalledTimes(2);
  });
});
