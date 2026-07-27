interface BrandMarkProps {
  compact?: boolean;
}

export function BrandMark({ compact = false }: BrandMarkProps) {
  return (
    <div className={`brand-mark${compact ? " brand-mark--compact" : ""}`}>
      <img
        className="brand-mark__image"
        src="/brand/mantou-logo.png"
        alt="Mantou Education"
        width="44"
        height="44"
      />
      <span className="brand-mark__copy">
        <strong lang="en">UK Admission Test Prep</strong>
        {!compact && <small lang="zh-CN">满托考试练习场</small>}
      </span>
    </div>
  );
}
