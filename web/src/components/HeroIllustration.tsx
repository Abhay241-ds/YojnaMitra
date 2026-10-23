export default function HeroIllustration() {
  return (
    <svg
      className="h-auto w-full select-none drop-shadow-sm"
      viewBox="0 0 520 360"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Illustration of a woman, a young man and a senior citizen using a tablet, a phone and documents to find government schemes"
    >
      <defs>
        <linearGradient id="bgGlow" x1="0%" x2="100%" y1="0%" y2="100%">
          <stop offset="0%" stopColor="#FFF5EB" />
          <stop offset="100%" stopColor="#E8F1F9" />
        </linearGradient>
        <linearGradient id="sareeGrad" x1="0%" x2="100%" y1="0%" y2="100%">
          <stop offset="0%" stopColor="#E67E22" />
          <stop offset="100%" stopColor="#D35400" />
        </linearGradient>
      </defs>

      <ellipse cx="260" cy="180" fill="url(#bgGlow)" rx="230" ry="145" />
      <path d="M75 110 Q90 90 110 95 T130 115 Q145 130 120 155 T90 145 Z" fill="#F1C40F" opacity="0.35" />

      {/* Verified badge */}
      <g transform="translate(230, 60)">
        <circle cx="28" cy="28" fill="#FFFFFF" filter="drop-shadow(0 2px 5px rgba(0,0,0,0.08))" r="24" />
        <path
          d="M22 20 A 7 7 0 0 1 35 20 M19 26 A 11 11 0 0 1 38 25 M22 32 A 7 7 0 0 1 34 32 M28 17 V 37"
          fill="none"
          stroke="#E67E22"
          strokeLinecap="round"
          strokeWidth="2.2"
        />
        <text fill="#173B6C" fontSize="6" fontWeight="bold" textAnchor="middle" x="28" y="44">
          VERIFIED
        </text>
      </g>

      {/* Scheme document */}
      <g transform="translate(325, 65) rotate(8)">
        <rect fill="#FFFFFF" filter="drop-shadow(0 4px 6px rgba(0,0,0,0.05))" height="58" rx="4" stroke="#E2E8F0" strokeWidth="1.5" width="46" x="0" y="0" />
        <circle cx="15" cy="16" fill="#3B82F6" opacity="0.2" r="6" />
        <path d="M15 13 C16 13 17 14 17 15 C17 16 16 17 15 17 C14 17 13 16 13 15 C13 14 14 13 15 13 Z M12 21 C12 19 14 19 15 19 C16 19 18 19 18 21" fill="#3B82F6" />
        <rect fill="#94A3B8" height="2.5" rx="1" width="14" x="25" y="13" />
        <rect fill="#CBD5E1" height="2.5" rx="1" width="10" x="25" y="18" />
        <rect fill="#CBD5E1" height="2" rx="1" width="32" x="7" y="27" />
        <rect fill="#CBD5E1" height="2" rx="1" width="28" x="7" y="33" />
        <rect fill="#CBD5E1" height="2" rx="1" width="30" x="7" y="39" />
        <circle cx="34" cy="47" fill="#EF4444" opacity="0.85" r="4.5" />
      </g>

      {/* Rupee coin */}
      <g transform="translate(415, 95)">
        <circle cx="20" cy="20" fill="#FBBF24" filter="drop-shadow(0 4px 6px rgba(0,0,0,0.08))" r="18" stroke="#F59E0B" strokeWidth="2" />
        <text fill="#78350F" fontFamily="sans-serif" fontSize="20" fontWeight="bold" textAnchor="middle" x="20" y="27">
          ₹
        </text>
      </g>

      <path d="M185 105 Q 235 70 300 95" fill="none" stroke="#60A5FA" strokeDasharray="4 4" strokeWidth="2" />

      {/* Woman */}
      <g id="character-woman">
        <path d="M95 320 C95 240 120 220 155 220 C185 220 210 245 205 320 Z" fill="url(#sareeGrad)" />
        <path d="M140 220 Q160 270 175 320" fill="none" stroke="#FDE68A" strokeWidth="4" />
        <path d="M145 200 L160 200 L158 220 L147 220 Z" fill="#F3B68B" />
        <ellipse cx="153" cy="185" fill="#F3B68B" rx="19" ry="22" />
        <ellipse cx="152" cy="168" fill="#1E293B" rx="20" ry="12" />
        <circle cx="132" cy="180" fill="#1E293B" r="8" />
        <circle cx="158" cy="183" fill="#DC2626" r="1.5" />
        <rect fill="#0F172A" height="32" rx="4" transform="rotate(-15 165 235)" width="42" x="165" y="235" />
        <rect fill="#38BDF8" height="26" rx="2" transform="rotate(-15 168 238)" width="36" x="168" y="238" />
        <path d="M130 260 C140 280 170 270 185 260" fill="none" stroke="#F3B68B" strokeLinecap="round" strokeWidth="10" />
      </g>

      {/* Young man */}
      <g id="character-man">
        <path d="M210 320 L215 225 C215 205 240 195 265 195 C290 195 315 205 315 225 L320 320 Z" fill="#1E40AF" />
        <polygon fill="#DBEAFE" points="265,220 250,200 280,200" />
        <rect fill="#E8A87C" height="18" width="16" x="257" y="180" />
        <ellipse cx="265" cy="165" fill="#E8A87C" rx="18" ry="21" />
        <path d="M246 160 C246 142 284 142 284 160 C284 150 246 150 246 160 Z" fill="#0F172A" />
        <path d="M250 172 Q265 192 280 172 C281 188 249 188 250 172 Z" fill="#0F172A" />
        <rect fill="#111827" height="32" rx="3" width="18" x="256" y="230" />
        <rect fill="#60A5FA" height="26" rx="1.5" width="14" x="258" y="233" />
        <circle cx="253" cy="250" fill="#E8A87C" r="6" />
        <circle cx="277" cy="250" fill="#E8A87C" r="6" />
      </g>

      {/* Senior citizen */}
      <g id="character-senior">
        <path d="M335 320 C335 240 360 220 395 220 C430 220 455 240 455 320 Z" fill="#84A98C" />
        <rect fill="#E4AA82" height="20" width="16" x="387" y="195" />
        <ellipse cx="395" cy="178" fill="#E4AA82" rx="18" ry="21" />
        <path d="M377 172 C377 152 413 152 413 172" fill="#E2E8F0" />
        <path d="M385 186 Q395 192 405 186 C408 200 382 200 385 186 Z" fill="#F8FAFC" />
        <circle cx="388" cy="176" fill="none" r="5" stroke="#334155" strokeWidth="2" />
        <circle cx="402" cy="176" fill="none" r="5" stroke="#334155" strokeWidth="2" />
        <line stroke="#334155" strokeWidth="2" x1="393" x2="397" y1="176" y2="176" />
        <rect fill="#FFFBEB" height="44" rx="3" stroke="#D97706" strokeWidth="1.5" transform="rotate(-8 335 235)" width="34" x="335" y="235" />
        <line stroke="#F59E0B" strokeWidth="2" x1="340" x2="360" y1="248" y2="245" />
        <line stroke="#CBD5E1" strokeWidth="2" x1="340" x2="358" y1="255" y2="252" />
        <circle cx="368" cy="265" fill="#E4AA82" r="7" />
      </g>
    </svg>
  );
}