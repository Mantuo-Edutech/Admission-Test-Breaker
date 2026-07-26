import type { ReactNode } from "react";

interface EnglishFirstTextProps {
  readonly english: ReactNode;
  readonly chinese: ReactNode;
  readonly chineseAs?: "small" | "span" | "p";
  readonly className?: string;
}

/**
 * The canonical bilingual reading pattern for learning materials.
 * English carries the primary reading flow; Chinese clarifies it without
 * competing for the same typographic weight.
 */
export function EnglishFirstText({
  english,
  chinese,
  chineseAs: ChineseTag = "small",
  className,
}: EnglishFirstTextProps) {
  return (
    <span className={["english-first-text", className].filter(Boolean).join(" ")}>
      <span className="english-first-text__primary" lang="en">{english}</span>
      <ChineseTag className="english-first-text__support" lang="zh-CN">{chinese}</ChineseTag>
    </span>
  );
}

interface EnglishFirstParagraphProps {
  readonly english: ReactNode;
  readonly chinese: ReactNode;
  readonly className?: string;
}

export function EnglishFirstParagraph({ english, chinese, className }: EnglishFirstParagraphProps) {
  return (
    <div className={["english-first-paragraph", className].filter(Boolean).join(" ")}>
      <p className="english-first-paragraph__primary" lang="en">{english}</p>
      <p className="english-first-paragraph__support" lang="zh-CN">{chinese}</p>
    </div>
  );
}
