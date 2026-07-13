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
        <strong>Admission Test Breaker</strong>
        {!compact && <small>由满托发起的开放练习场</small>}
      </span>
    </div>
  );
}
