
function IllustrationMaternelle({ size = 120 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Fond */}
      <rect width="200" height="200" rx="28" fill="#F0FBF4"/>

      {/* Sol */}
      <rect x="20" y="155" width="160" height="6" rx="3" fill="#A5D6A7"/>

      {/* Toboggan */}
      <path d="M50 155 L90 90" stroke="#43A047" strokeWidth="5" strokeLinecap="round"/>
      <rect x="85" y="78" width="8" height="30" rx="4" fill="#66BB6A"/>
      <path d="M46 155 L56 155" stroke="#43A047" strokeWidth="5" strokeLinecap="round"/>
      <path d="M50 155 L50 170" stroke="#388E3C" strokeWidth="4" strokeLinecap="round"/>
      <path d="M56 155 L56 170" stroke="#388E3C" strokeWidth="4" strokeLinecap="round"/>

      {/* Enfant 1 - sur toboggan */}
      <circle cx="78" cy="108" r="10" fill="#FFCC80" stroke="#FB8C00" strokeWidth="2"/>
      {/* cheveux */}
      <path d="M68 105 Q73 96 83 98 Q85 104 82 103" fill="#5D4037"/>
      {/* corps */}
      <path d="M72 118 Q70 135 68 145" stroke="#1E88E5" strokeWidth="4" strokeLinecap="round"/>
      <path d="M84 118 Q86 135 88 145" stroke="#1E88E5" strokeWidth="4" strokeLinecap="round"/>
      <path d="M72 118 L84 118 L84 130 L72 130 Z" fill="#1E88E5"/>
      {/* jambes */}
      <path d="M74 130 L70 148" stroke="#37474F" strokeWidth="3.5" strokeLinecap="round"/>
      <path d="M82 130 L86 148" stroke="#37474F" strokeWidth="3.5" strokeLinecap="round"/>

      {/* Enfant 2 - debout */}
      <circle cx="130" cy="110" r="10" fill="#FFCC80" stroke="#FB8C00" strokeWidth="2"/>
      {/* natte */}
      <path d="M133 120 Q138 128 136 135" stroke="#5D4037" strokeWidth="3" strokeLinecap="round"/>
      {/* robe */}
      <path d="M124 120 L124 148 L136 148 L136 120 Z" fill="#EC407A"/>
      <path d="M120 125 L128 122" stroke="#E91E63" strokeWidth="3" strokeLinecap="round"/>
      <path d="M140 125 L132 122" stroke="#E91E63" strokeWidth="3" strokeLinecap="round"/>
      <path d="M124 148 L120 158" stroke="#37474F" strokeWidth="3.5" strokeLinecap="round"/>
      <path d="M136 148 L140 158" stroke="#37474F" strokeWidth="3.5" strokeLinecap="round"/>

      {/* Ballon */}
      <circle cx="148" cy="72" r="16" fill="#EF5350" stroke="#E53935" strokeWidth="2"/>
      <path d="M148 88 L148 95" stroke="#C62828" strokeWidth="2" strokeLinecap="round"/>
      <path d="M140 76 Q144 68 152 70" stroke="white" strokeWidth="2" strokeLinecap="round" opacity="0.5"/>

      {/* Nuage */}
      <ellipse cx="40" cy="50" rx="22" ry="12" fill="white" stroke="#B2DFDB" strokeWidth="2"/>
      <ellipse cx="55" cy="45" rx="16" ry="12" fill="white" stroke="#B2DFDB" strokeWidth="2"/>
      <ellipse cx="68" cy="52" rx="14" ry="10" fill="white" stroke="#B2DFDB" strokeWidth="2"/>

      {/* Soleil */}
      <circle cx="162" cy="40" r="16" fill="#FFD54F" stroke="#FFB300" strokeWidth="2"/>
      {[0,45,90,135,180,225,270,315].map((deg, i) => {
        const r = Math.PI * deg / 180
        return <line key={i}
          x1={162 + 20 * Math.cos(r)} y1={40 + 20 * Math.sin(r)}
          x2={162 + 26 * Math.cos(r)} y2={40 + 26 * Math.sin(r)}
          stroke="#FFB300" strokeWidth="2.5" strokeLinecap="round"/>
      })}
    </svg>
  )
}

/* ─────────────────────────────────────────────
   PRIMAIRE  - livre, alphabet, crayon
───────────────────────────────────────────── */
function IllustrationPrimaire({ size = 120 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="200" height="200" rx="28" fill="#E8F5E9"/>

      {/* Tableau noir */}
      <rect x="30" y="30" width="140" height="90" rx="8" fill="#37474F"/>
      <rect x="34" y="34" width="132" height="82" rx="6" fill="#455A64"/>

      {/* Contenu tableau */}
      <text x="50" y="68" fontFamily="'Arial Rounded MT Bold', Arial, sans-serif" fontSize="22" fontWeight="bold" fill="#A5D6A7">A</text>
      <text x="88" y="68" fontFamily="'Arial Rounded MT Bold', Arial, sans-serif" fontSize="22" fontWeight="bold" fill="#FFD54F">B</text>
      <text x="126" y="68" fontFamily="'Arial Rounded MT Bold', Arial, sans-serif" fontSize="22" fontWeight="bold" fill="#EF9A9A">C</text>
      <line x1="46" y1="85" x2="94" y2="85" stroke="#78909C" strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="100" y1="85" x2="154" y2="85" stroke="#78909C" strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="46" y1="96" x2="120" y2="96" stroke="#78909C" strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="46" y1="107" x2="100" y2="107" stroke="#78909C" strokeWidth="1.5" strokeLinecap="round"/>

      {/* Effaceur */}
      <rect x="140" y="112" width="22" height="10" rx="3" fill="#90A4AE"/>
      <rect x="140" y="112" width="22" height="4" rx="2" fill="#B0BEC5"/>

      {/* Pied tableau */}
      <rect x="92" y="120" width="16" height="8" rx="2" fill="#546E7A"/>
      <rect x="85" y="128" width="30" height="4" rx="2" fill="#37474F"/>

      {/* Crayon gauche */}
      <g transform="rotate(-20 60 160)">
        <rect x="52" y="135" width="12" height="40" rx="3" fill="#FFD54F"/>
        <rect x="52" y="135" width="12" height="8" rx="3" fill="#BDBDBD"/>
        <polygon points="52,175 64,175 58,185" fill="#FF8A65"/>
        <circle cx="58" cy="185" r="1.5" fill="#37474F"/>
      </g>

      {/* Crayon droit */}
      <g transform="rotate(20 140 160)">
        <rect x="134" y="135" width="12" height="40" rx="3" fill="#EF5350"/>
        <rect x="134" y="135" width="12" height="8" rx="3" fill="#BDBDBD"/>
        <polygon points="134,175 146,175 140,185" fill="#FF8A65"/>
        <circle cx="140" cy="185" r="1.5" fill="#37474F"/>
      </g>

      {/* Livre au centre-bas */}
      <path d="M75 148 Q100 140 125 148 L125 178 Q100 170 75 178 Z" fill="#42A5F5"/>
      <path d="M125 148 Q140 143 155 148 L155 178 Q140 173 125 178 Z" fill="#EF5350"/>
      <line x1="125" y1="148" x2="125" y2="178" stroke="#1565C0" strokeWidth="2"/>
      <line x1="82" y1="157" x2="122" y2="154" stroke="white" strokeWidth="1.5" strokeLinecap="round" opacity="0.7"/>
      <line x1="82" y1="163" x2="122" y2="160" stroke="white" strokeWidth="1.5" strokeLinecap="round" opacity="0.7"/>
      <line x1="82" y1="169" x2="122" y2="166" stroke="white" strokeWidth="1.5" strokeLinecap="round" opacity="0.7"/>
    </svg>
  )
}

/* ─────────────────────────────────────────────
   SECONDAIRE  - bâtiment lycée, livre, diplôme
───────────────────────────────────────────── */
function IllustrationSecondaire({ size = 120 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="200" height="200" rx="28" fill="#FFF8E1"/>

      {/* Corps bâtiment */}
      <rect x="30" y="90" width="140" height="85" rx="4" fill="#ECEFF1"/>
      <rect x="30" y="90" width="140" height="85" rx="4" stroke="#90A4AE" strokeWidth="2"/>

      {/* Façade centrale (couleur) */}
      <rect x="55" y="90" width="90" height="85" fill="#CFD8DC"/>

      {/* Toit triangulaire */}
      <path d="M20 92 L100 38 L180 92 Z" fill="#E53935"/>
      <path d="M20 92 L100 38 L180 92 Z" stroke="#B71C1C" strokeWidth="2" strokeLinejoin="round"/>

      {/* Drapeau */}
      <line x1="100" y1="20" x2="100" y2="40" stroke="#37474F" strokeWidth="2.5" strokeLinecap="round"/>
      <path d="M100 20 L118 26 L100 32 Z" fill="#43A047"/>

      {/* Fenêtres rangée 1 */}
      {[38, 68, 98, 128, 152].map((x, i) => (
        <g key={i}>
          <rect x={x} y="104" width="18" height="20" rx="2" fill="#B3E5FC" stroke="#78909C" strokeWidth="1.2"/>
          <line x1={x+9} y1="104" x2={x+9} y2="124" stroke="#78909C" strokeWidth="1"/>
          <line x1={x} y1="114" x2={x+18} y2="114" stroke="#78909C" strokeWidth="1"/>
        </g>
      ))}

      {/* Fenêtres rangée 2 */}
      {[38, 68, 128, 152].map((x, i) => (
        <g key={i}>
          <rect x={x} y="134" width="18" height="20" rx="2" fill="#B3E5FC" stroke="#78909C" strokeWidth="1.2"/>
          <line x1={x+9} y1="134" x2={x+9} y2="154" stroke="#78909C" strokeWidth="1"/>
          <line x1={x} y1="144" x2={x+18} y2="144" stroke="#78909C" strokeWidth="1"/>
        </g>
      ))}

      {/* Porte centrale */}
      <rect x="84" y="142" width="32" height="33" rx="2" fill="#5D4037"/>
      <rect x="84" y="142" width="32" height="33" rx="2" stroke="#4E342E" strokeWidth="1.5"/>
      <rect x="84" y="142" width="15" height="33" rx="2" fill="#6D4C41"/>
      <circle cx="96" cy="159" r="2.5" fill="#FFD54F"/>
      <circle cx="104" cy="159" r="2.5" fill="#FFD54F"/>

      {/* Marches */}
      <rect x="78" y="173" width="44" height="4" rx="1" fill="#B0BEC5"/>
      <rect x="72" y="177" width="56" height="4" rx="1" fill="#90A4AE"/>

      {/* Sol */}
      <rect x="20" y="181" width="160" height="5" rx="2.5" fill="#A5D6A7"/>

      {/* Livre flottant droite */}
      <g transform="rotate(-15 170 60)">
        <rect x="150" y="42" width="30" height="38" rx="3" fill="#42A5F5" stroke="#1565C0" strokeWidth="1.5"/>
        <line x1="156" y1="52" x2="174" y2="52" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
        <line x1="156" y1="58" x2="174" y2="58" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
        <line x1="156" y1="64" x2="168" y2="64" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
        <line x1="156" y1="70" x2="172" y2="70" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
      </g>
    </svg>
  )
}

/* ─────────────────────────────────────────────
   UNIVERSITAIRE  - chapeau diplôme, colonnes
───────────────────────────────────────────── */
function IllustrationUniversite({ size = 120 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="200" height="200" rx="28" fill="#EDE7F6"/>

      {/* Sol */}
      <rect x="15" y="175" width="170" height="5" rx="2.5" fill="#CE93D8"/>

      {/* Bâtiment université */}
      <rect x="30" y="105" width="140" height="70" rx="3" fill="#9575CD"/>
      <rect x="30" y="98" width="140" height="10" rx="3" fill="#7E57C2"/>
      {/* fronton */}
      <path d="M25 100 L100 60 L175 100 Z" fill="#7986CB"/>
      <path d="M25 100 L100 60 L175 100 Z" stroke="#5C6BC0" strokeWidth="2"/>

      {/* Drapeau */}
      <line x1="100" y1="40" x2="100" y2="62" stroke="#37474F" strokeWidth="2.5"/>
      <path d="M100 40 L120 47 L100 54 Z" fill="#E53935"/>

      {/* Colonnes */}
      {[42, 72, 102, 132, 158].map((x, i) => (
        <g key={i}>
          <rect x={x} y="100" width="10" height="72" rx="2" fill="#B39DDB"/>
          {/* cannelures */}
          <line x1={x+3} y1="102" x2={x+3} y2="170" stroke="#9575CD" strokeWidth="1" opacity="0.4"/>
          <line x1={x+7} y1="102" x2={x+7} y2="170" stroke="#9575CD" strokeWidth="1" opacity="0.4"/>
          {/* chapiteau */}
          <rect x={x-2} y="98" width="14" height="4" rx="1" fill="#9575CD"/>
          {/* base */}
          <rect x={x-2} y="168" width="14" height="4" rx="1" fill="#9575CD"/>
        </g>
      ))}

      {/* Porte centrale */}
      <rect x="82" y="138" width="36" height="37" rx="3" fill="#4A148C"/>
      <path d="M82 138 Q100 128 118 138" fill="#4A148C"/>
      <circle cx="100" cy="157" r="3" fill="#FFD54F"/>

      {/* Chapeau de diplômé - grand, en haut */}
      <ellipse cx="100" cy="38" rx="38" ry="10" fill="#311B92"/>
      <rect x="82" y="14" width="36" height="26" rx="3" fill="#3949AB"/>
      <rect x="78" y="10" width="44" height="8" rx="4" fill="#311B92"/>
      {/* cordon */}
      <path d="M134 36 Q148 46 144 62 L140 64" stroke="#FFD54F" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
      <circle cx="140" cy="66" r="4" fill="#FFD54F"/>
      <circle cx="144" cy="72" r="3" fill="#FFD54F"/>
    </svg>
  )
}

/* ─────────────────────────────────────────────
   GÉNÉRIQUE  - fallback
───────────────────────────────────────────── */
function IllustrationGenerique({ size = 120 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="200" height="200" rx="28" fill="#E3F2FD"/>
      {/* Livre simple */}
      <path d="M40 50 L40 160 Q40 165 45 165 L98 155 L100 155 L100 45 Z" fill="#42A5F5"/>
      <path d="M160 50 L160 160 Q160 165 155 165 L102 155 L100 155 L100 45 Z" fill="#EF5350"/>
      <line x1="100" y1="45" x2="100" y2="165" stroke="white" strokeWidth="2.5"/>
      {[70,85,100,115,130].map((y,i) => (
        <line key={i} x1="50" y1={y} x2="96" y2={y} stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeDasharray="4 2"/>
      ))}
      {[70,85,100,115,130].map((y,i) => (
        <line key={i} x1="104" y1={y} x2="150" y2={y} stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeDasharray="4 2"/>
      ))}
    </svg>
  )
}

/* ── Map cycles → composants ── */
const ILLUSTRATIONS = {
  maternelle:    IllustrationMaternelle,
  primaire:      IllustrationPrimaire,
  secondaire:    IllustrationSecondaire,
  universitaire: IllustrationUniversite,
}

/* ── Export principal ── */
export default function CycleIllustration({ cycle, size = 120, className = '' }) {
  const Illu = ILLUSTRATIONS[cycle?.toLowerCase()] ?? IllustrationGenerique
  return (
    <span
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.10))',
        borderRadius: 20,
      }}
    >
      <Illu size={size} />
    </span>
  )
}
