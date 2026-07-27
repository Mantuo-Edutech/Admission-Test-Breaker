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

    expect(screen.getByRole("heading", { name: /Question 1/u })).toBeInTheDocument();
    expect(screen.getByText(/Given that/)).toBeInTheDocument();
    expect(screen.getAllByRole("radio")).toHaveLength(7);
    await user.click(screen.getByRole("radio", { name: /Option F/ }));
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

  it("renders image-based archive questions with compact label-only answers", () => {
    const question = structuredClone(TMUA_2023_P1.questions[0]!);
    question.optionDisplay = "labels-only";
    question.options = question.options.map((option) => ({ ...option, content: [] }));

    render(
      <QuestionCard
        question={question}
        selectedAnswer={null}
        onAnswer={() => undefined}
      />,
    );

    expect(screen.getAllByRole("radio")).toHaveLength(7);
    expect(document.querySelector(".answer-list--labels-only")).not.toBeNull();
    expect(document.querySelectorAll(".answer-choice__content")).toHaveLength(0);
  });
});
