export default function CoreLogo({ size = 36 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="clogo-bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#60a5fa" />
          <stop offset="100%" stopColor="#2563eb" />
        </linearGradient>
      </defs>
      {/* Chip body */}
      <rect x="18" y="18" width="44" height="44" rx="10" fill="url(#clogo-bg)" />
      <rect x="25" y="25" width="30" height="30" rx="6" fill="white" fillOpacity="0.12" />
      {/* "C" centered via dominantBaseline */}
      <text
        x="40"
        y="40"
        textAnchor="middle"
        dominantBaseline="central"
        fill="white"
        fontSize="24"
        fontWeight="900"
        fontFamily="sans-serif"
      >C</text>
      {/* Circuit traces — top */}
      <line x1="33" y1="18" x2="33" y2="10" stroke="#93c5fd" strokeWidth="2" strokeLinecap="round" />
      <circle cx="33" cy="8" r="2.5" fill="#93c5fd" />
      <line x1="47" y1="18" x2="47" y2="10" stroke="#93c5fd" strokeWidth="2" strokeLinecap="round" />
      <circle cx="47" cy="8" r="2.5" fill="#93c5fd" />
      {/* Circuit traces — bottom */}
      <line x1="33" y1="62" x2="33" y2="70" stroke="#93c5fd" strokeWidth="2" strokeLinecap="round" />
      <circle cx="33" cy="72" r="2.5" fill="#93c5fd" />
      <line x1="47" y1="62" x2="47" y2="70" stroke="#93c5fd" strokeWidth="2" strokeLinecap="round" />
      <circle cx="47" cy="72" r="2.5" fill="#93c5fd" />
      {/* Circuit traces — left */}
      <line x1="18" y1="33" x2="10" y2="33" stroke="#93c5fd" strokeWidth="2" strokeLinecap="round" />
      <circle cx="8" cy="33" r="2.5" fill="#93c5fd" />
      <line x1="18" y1="47" x2="10" y2="47" stroke="#93c5fd" strokeWidth="2" strokeLinecap="round" />
      <circle cx="8" cy="47" r="2.5" fill="#93c5fd" />
      {/* Circuit traces — right */}
      <line x1="62" y1="33" x2="70" y2="33" stroke="#93c5fd" strokeWidth="2" strokeLinecap="round" />
      <circle cx="72" cy="33" r="2.5" fill="#93c5fd" />
      <line x1="62" y1="47" x2="70" y2="47" stroke="#93c5fd" strokeWidth="2" strokeLinecap="round" />
      <circle cx="72" cy="47" r="2.5" fill="#93c5fd" />
    </svg>
  );
}
