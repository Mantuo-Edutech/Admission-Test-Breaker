export function AcademicIllustration() {
  return (
    <svg
      className="academic-illustration"
      viewBox="0 0 640 560"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="paperGlow" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fffdf8" />
          <stop offset="1" stopColor="#efe7dc" />
        </linearGradient>
        <pattern id="graphGrid" width="18" height="18" patternUnits="userSpaceOnUse">
          <path d="M18 0H0V18" fill="none" stroke="#63528c" strokeOpacity=".13" />
        </pattern>
      </defs>

      <path
        d="M112 470V218C112 104 204 32 320 32s208 72 208 186v252"
        fill="#eae4f2"
        stroke="#282332"
        strokeWidth="3"
      />
      <path
        d="M150 470V222c0-89 71-154 170-154s170 65 170 154v248"
        fill="#f7f1e7"
        stroke="#63528c"
        strokeWidth="2"
      />
      <circle cx="320" cy="207" r="98" fill="none" stroke="#63528c" strokeDasharray="4 8" strokeOpacity=".38" />
      <path d="M244 208h152M320 132v152" stroke="#63528c" strokeOpacity=".24" />
      <path d="M264 238 320 158l58 80Z" fill="none" stroke="#63528c" strokeWidth="2" />
      <circle cx="320" cy="158" r="5" fill="#a66a36" />
      <circle cx="264" cy="238" r="5" fill="#a66a36" />
      <circle cx="378" cy="238" r="5" fill="#a66a36" />

      <path d="M68 454h504v68H68z" fill="#76777a" stroke="#282332" strokeWidth="3" />
      <path d="M96 522h18v28H96zm430 0h18v28h-18z" fill="#282332" />

      <g transform="translate(126 347)">
        <path d="M0 78h154v24H0z" fill="#63528c" stroke="#282332" strokeWidth="2" />
        <path d="M18 52h150v26H18z" fill="#fffdf8" stroke="#282332" strokeWidth="2" />
        <path d="M4 26h138v26H4z" fill="#a66a36" stroke="#282332" strokeWidth="2" />
        <path d="M26 0h122v26H26z" fill="#eae4f2" stroke="#282332" strokeWidth="2" />
        <path d="M40 7h42M19 59h52M22 85h58" stroke="#282332" strokeOpacity=".55" />
      </g>

      <g transform="translate(335 303) rotate(-4)">
        <rect width="176" height="138" rx="4" fill="url(#paperGlow)" stroke="#282332" strokeWidth="3" />
        <rect x="14" y="14" width="148" height="110" fill="url(#graphGrid)" />
        <path d="M30 104h116M42 116V30" stroke="#282332" strokeWidth="2" />
        <path d="M42 96c26-8 36-50 58-46 18 3 22 35 48 27" fill="none" stroke="#63528c" strokeWidth="4" />
        <circle cx="100" cy="50" r="5" fill="#a66a36" />
      </g>

      <g transform="translate(455 248)">
        <path d="M34 0v132M6 132h58" stroke="#282332" strokeWidth="7" strokeLinecap="round" />
        <path d="M34 10 4 70h60Z" fill="#63528c" stroke="#282332" strokeWidth="3" />
        <path d="M4 70h60" stroke="#fffdf8" strokeWidth="3" />
        <ellipse cx="34" cy="132" rx="44" ry="10" fill="#282332" opacity=".16" />
      </g>

      <g fill="none" stroke="#282332" strokeWidth="2" opacity=".65">
        <path d="M92 172h36M110 154v36" />
        <circle cx="536" cy="174" r="15" />
        <path d="m526 174 7 7 14-17" />
        <path d="M87 294c34-18 48-17 72 2" strokeDasharray="5 7" />
      </g>
    </svg>
  );
}
