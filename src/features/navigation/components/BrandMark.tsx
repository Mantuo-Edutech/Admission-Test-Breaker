interface BrandMarkProps {
  compact?: boolean;
}

export function BrandMark({ compact = false }: BrandMarkProps) {
  return (
    <div className={`brand-mark${compact ? " brand-mark--compact" : ""}`}>
      <img
        className="brand-mark__image"
        src="/brand/mantou-logo.png"
        alt="满托"
        width="44"
        height="44"
      />
      <span className="brand-mark__copy">
        <strong>满托考试练习场</strong>
        {!compact && <small>Admission Test Breaker</small>}
      </span>
    </div>
  );
}
