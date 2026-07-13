import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { TMUA_2023_P1 } from "../../../../src/features/practice/content/tmua-2023-p1.js";
import { QuestionCard } from "../../../../src/features/practice/components/QuestionCard.js";

describe("practice question card", () => {
  it("renders reviewed math and selects one semantic radio answer", async () => {
    const user = userEvent.setup();
    const onAnswer = vi.fn();
    render(
      <QuestionCard
        question={TMUA_2023_P1.questions[0]!}
        selectedAnswer={null}
        onAnswer={onAnswer}
      />,
    );

    expect(screen.getByRole("heading", { name: "第 1 题" })).toBeInTheDocument();
    expect(screen.getByText(/Given that/)).toBeInTheDocument();
    expect(screen.getAllByRole("radio")).toHaveLength(7);
    await user.click(screen.getByRole("radio", { name: /选项 F/ }));
    expect(onAnswer).toHaveBeenCalledWith("F");
    expect(screen.queryByText(/正确答案/)).not.toBeInTheDocument();
  });

  it("renders reviewed figures with their complete alternative text", () => {
    render(
      <QuestionCard
        question={TMUA_2023_P1.questions[4]!}
        selectedAnswer={null}
        onAnswer={() => undefined}
      />,
    );

    expect(screen.getByRole("img")).toHaveAttribute(
      "alt",
      expect.stringContaining("diagonal reflectional symmetry"),
    );
  });
});
