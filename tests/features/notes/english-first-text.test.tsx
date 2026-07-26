import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  EnglishFirstParagraph,
  EnglishFirstText,
} from "../../../src/features/notes/components/EnglishFirstText.js";

describe("English-first bilingual presentation contract", () => {
  it("places the English title before the Chinese support text with explicit languages", () => {
    const { container } = render(
      <h1><EnglishFirstText english="Foundation Review Notes" chinese="基础复习笔记" /></h1>,
    );

    const wrapper = container.querySelector(".english-first-text");
    expect(wrapper?.children).toHaveLength(2);
    expect(wrapper?.children[0]).toHaveClass("english-first-text__primary");
    expect(wrapper?.children[0]).toHaveAttribute("lang", "en");
    expect(wrapper?.children[0]).toHaveTextContent("Foundation Review Notes");
    expect(wrapper?.children[1]).toHaveClass("english-first-text__support");
    expect(wrapper?.children[1]).toHaveAttribute("lang", "zh-CN");
    expect(wrapper?.children[1]).toHaveTextContent("基础复习笔记");
  });

  it("keeps English as the first paragraph in teaching copy", () => {
    const { container } = render(
      <EnglishFirstParagraph
        english="Identify the claim before testing the evidence."
        chinese="先识别主张，再检验证据。"
      />,
    );

    const paragraphs = container.querySelectorAll(".english-first-paragraph > p");
    expect(paragraphs).toHaveLength(2);
    expect(paragraphs[0]).toHaveAttribute("lang", "en");
    expect(paragraphs[0]).toHaveClass("english-first-paragraph__primary");
    expect(paragraphs[1]).toHaveAttribute("lang", "zh-CN");
    expect(paragraphs[1]).toHaveClass("english-first-paragraph__support");
  });
});
