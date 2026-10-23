export default function AuthIllustration() {
  return (
    <svg
      className="h-auto w-full max-w-lg select-none drop-shadow-sm"
      fill="none"
      viewBox="0 0 540 380"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Illustration of citizens of different ages and professions using a phone and tablets to find government schemes"
    >
      {/* Sun */}
      <circle cx="440" cy="110" fill="#FDE68A" r="32" />
      <circle cx="440" cy="110" r="38" stroke="#F59E0B" strokeDasharray="3 3" strokeWidth="1.5" />

      {/* Skyline */}
      <path d="M70 290V235H105V215H140V245H170V280H230V220H265V285H390V230H435V270H480V290H70Z" fill="#E2E8F0" opacity="0.45" />
      <path d="M185 240H210V280H185Z" fill="#CBD5E1" opacity="0.3" />
      <path d="M410 240H430V270H410Z" fill="#CBD5E1" opacity="0.3" />
      <path d="M110 225H125V245H110Z" fill="#CBD5E1" opacity="0.3" />

      {/* Fields */}
      <path d="M360 290 Q430 250 530 270 L530 310 L360 310 Z" fill="#D1FAE5" opacity="0.5" />
      <path d="M390 280 Q450 240 540 250 L540 310 L390 310 Z" fill="#BBF7D0" opacity="0.4" />

      {/* Floating badges */}
      <g transform="translate(110, 85)">
        <rect fill="#1E40AF" height="34" opacity="0.85" rx="6" width="42" />
        <circle cx="21" cy="14" r="5" stroke="#FFFFFF" strokeWidth="1.5" />
        <path d="M14 24C14 21 17 20 21 20C25 20 28 21 28 24" stroke="#FFFFFF" strokeWidth="1.5" />
      </g>
      <g transform="translate(230, 60)">
        <rect fill="#D97706" height="36" opacity="0.9" rx="6" width="44" />
        <path d="M22 10L14 16V26H30V16L22 10Z" fill="none" stroke="#FFFFFF" strokeWidth="1.5" />
        <rect fill="#FFFFFF" height="7" width="6" x="19" y="19" />
      </g>
      <g transform="translate(400, 130)">
        <rect fill="#D97706" height="30" opacity="0.9" rx="6" width="36" />
        <circle cx="18" cy="15" r="7" stroke="#FFFFFF" strokeWidth="1.5" />
        <text fill="#FFFFFF" fontSize="10" fontWeight="bold" x="14.5" y="19">
          ₹
        </text>
      </g>

      {/* Smartphone */}
      <rect fill="#FFFFFF" height="175" rx="14" stroke="#0F2C59" strokeWidth="3" width="94" x="230" y="115" />
      <rect fill="#E2E8F0" height="4" rx="2" width="34" x="260" y="122" />
      <rect fill="#F8FAFC" height="146" rx="8" width="78" x="238" y="132" />
      <rect fill="#DBEAFE" height="34" rx="4" width="62" x="246" y="142" />
      <circle cx="260" cy="159" fill="#3B82F6" r="6" />
      <line stroke="#1E40AF" strokeLinecap="round" strokeWidth="2" x1="272" x2="298" y1="154" y2="154" />
      <line stroke="#60A5FA" strokeLinecap="round" strokeWidth="2" x1="272" x2="290" y1="162" y2="162" />
      <rect fill="#FEF3C7" height="36" rx="4" width="28" x="246" y="184" />
      <rect fill="#E0E7FF" height="36" rx="4" width="28" x="280" y="184" />
      <rect fill="#10B981" height="12" opacity="0.2" rx="3" width="62" x="246" y="226" />
      <circle cx="253" cy="232" fill="#059669" r="3" />
      <line stroke="#059669" strokeLinecap="round" strokeWidth="2" x1="260" x2="295" y1="232" y2="232" />

      {/* Young man with tablet */}
      <g id="citizen-young-man">
        <path d="M190 280 C190 235 220 220 240 220 C260 220 270 235 270 280" fill="#EAB308" />
        <rect fill="#E29D7A" height="14" width="12" x="222" y="196" />
        <ellipse cx="228" cy="184" fill="#F8B195" rx="14" ry="16" />
        <path d="M214 178 C215 167 228 166 238 170 C242 174 242 182 242 182 C242 182 238 174 228 174 C218 174 214 178 214 178Z" fill="#1E293B" />
        <rect fill="#0F2C59" height="38" rx="4" transform="rotate(-15 180 235)" width="28" x="180" y="235" />
        <rect fill="#93C5FD" height="30" rx="2" transform="rotate(-15 180 235)" width="20" x="184" y="239" />
        <path d="M205 240 L195 255" stroke="#E29D7A" strokeLinecap="round" strokeWidth="5" />
      </g>

      {/* Elder */}
      <g id="citizen-elder">
        <path d="M150 310 C150 275 170 265 195 265 C220 265 240 275 240 310" fill="#F97316" />
        <rect fill="#D48B6A" height="12" width="12" x="188" y="248" />
        <circle cx="194" cy="238" fill="#E29D7A" r="14" />
        <path d="M182 232 C182 220 206 220 206 232 C208 238 206 248 194 252 C182 248 180 238 182 232Z" fill="#F1F5F9" />
        <circle cx="194" cy="236" fill="#E29D7A" r="11" />
        <circle cx="190" cy="234" fill="none" r="3" stroke="#334155" strokeWidth="1" />
        <circle cx="198" cy="234" fill="none" r="3" stroke="#334155" strokeWidth="1" />
        <line stroke="#334155" strokeWidth="1" x1="193" x2="195" y1="234" y2="234" />
      </g>

      {/* Woman with phone */}
      <g id="citizen-woman-left">
        <path d="M110 310 C110 280 130 270 155 270 C175 270 185 285 185 310" fill="#0284C7" />
        <circle cx="148" cy="245" fill="#F8B195" r="13" />
        <path d="M136 242 C138 228 160 228 162 242 C162 250 158 252 148 252 C138 252 136 250 136 242Z" fill="#0F172A" />
        <rect fill="#0F2C59" height="26" rx="2" width="14" x="115" y="275" />
        <rect fill="#67E8F9" height="20" rx="1" width="10" x="117" y="277" />
      </g>

      {/* Woman in saree with certificate */}
      <g id="citizen-woman-saree">
        <path d="M225 310 C225 275 250 260 275 260 C300 260 315 280 315 310" fill="#EA580C" />
        <path d="M235 260 Q265 290 285 310" fill="none" stroke="#FBBF24" strokeWidth="6" />
        <circle cx="270" cy="235" fill="#E29D7A" r="13" />
        <path d="M256 238 C256 220 284 220 284 238 C284 246 280 252 270 252 C260 252 256 246 256 238Z" fill="#D97706" />
        <rect fill="#FFFFFF" height="30" rx="2" stroke="#CBD5E1" width="22" x="290" y="270" />
        <line stroke="#94A3B8" strokeWidth="1.5" x1="294" x2="306" y1="276" y2="276" />
        <line stroke="#94A3B8" strokeWidth="1.5" x1="294" x2="308" y1="282" y2="282" />
        <line stroke="#94A3B8" strokeWidth="1.5" x1="294" x2="304" y1="288" y2="288" />
      </g>

      {/* Farmer */}
      <g id="citizen-farmer">
        <path d="M350 310 C350 275 375 265 405 265 C435 265 450 280 450 310" fill="#15803D" />
        <rect fill="#C67D5A" height="12" width="14" x="398" y="248" />
        <circle cx="405" cy="236" fill="#C67D5A" r="14" />
        <ellipse cx="405" cy="224" fill="#FDE047" rx="24" ry="7" stroke="#CA8A04" strokeWidth="1" />
        <path d="M393 224 C393 214 417 214 417 224 Z" fill="#EAB308" />
        <path d="M394 250 Q405 268 416 250" fill="none" stroke="#FFFFFF" strokeWidth="4" />
        <path d="M425 305 L445 250" stroke="#854D0E" strokeWidth="2.5" />
        <path d="M430 305 L455 255" stroke="#CA8A04" strokeWidth="2" />
        <ellipse cx="445" cy="250" fill="#EAB308" rx="4" ry="9" transform="rotate(20 445 250)" />
        <ellipse cx="453" cy="255" fill="#FACC15" rx="4" ry="9" transform="rotate(30 453 255)" />
        <ellipse cx="438" cy="260" fill="#EAB308" rx="4" ry="8" transform="rotate(10 438 260)" />
      </g>

      {/* Woman in green saree */}
      <g id="citizen-woman-green">
        <path d="M305 310 C305 275 325 265 350 265 C375 265 390 280 390 310" fill="#16A34A" />
        <circle cx="348" cy="240" fill="#D48B6A" r="13" />
        <path d="M336 238 C336 222 360 222 360 238 C360 250 354 254 348 254 C340 254 336 250 336 238Z" fill="#1E293B" />
        <circle cx="348" cy="236" fill="#DC2626" r="1.5" />
      </g>

      {/* Student with tablet */}
      <g id="citizen-student">
        <path d="M330 280 C330 240 350 230 375 230 C400 230 420 245 420 280" fill="#EC4899" />
        <circle cx="375" cy="208" fill="#F8B195" r="13" />
        <path d="M362 205 C362 190 388 190 388 205 C388 220 380 226 375 226 C370 226 362 220 362 205Z" fill="#0F172A" />
        <rect fill="#334155" height="32" rx="3" transform="rotate(15 382 235)" width="24" x="382" y="235" />
        <rect fill="#BAE6FD" height="24" rx="1.5" transform="rotate(15 382 235)" width="18" x="385" y="238" />
      </g>

      {/* Ground line */}
      <line stroke="#0F2C59" strokeLinecap="round" strokeWidth="2.5" x1="50" x2="490" y1="310" y2="310" />
    </svg>
  );
}