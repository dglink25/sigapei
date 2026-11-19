/**
 * AppelIllustration
 * ─────────────────
 * 12 illustrations SVG flat-design, aucun emoji, aucun <text>.
 * Diversifiées automatiquement par index dans le cycle.
 *
 * Usage :
 *   <AppelIllustration titre={appel.titre} cycle={appel.cycle} index={i} size={110} />
 *
 * Sélection :
 *   1. Mots-clés du titre  (priorité absolue)
 *   2. Rotation par index  (garantit la diversité dans un même cycle)
 */

/* ═══════════════════════════════════════════════════════
   01 - CANDIDATURE / Dossier remis entre les mains
═══════════════════════════════════════════════════════ */
function S01Candidature({ size }) {
  return (
    <svg width={size} height={size} viewBox="0 0 160 160" fill="none">
      <rect width="160" height="160" rx="22" fill="#EBF5FB"/>
      {/* Bureau */}
      <rect x="20" y="108" width="120" height="7" rx="3.5" fill="#AED6F1"/>
      <rect x="30" y="115" width="6" height="28" rx="3" fill="#85C1E9"/>
      <rect x="124" y="115" width="6" height="28" rx="3" fill="#85C1E9"/>
      {/* Dossier / chemise */}
      <rect x="38" y="58" width="68" height="52" rx="6" fill="#2980B9"/>
      <rect x="38" y="58" width="68" height="14" rx="6" fill="#1A5276"/>
      <rect x="38" y="66" width="68" height="6" fill="#1A5276"/>
      <rect x="46" y="80" width="52" height="5" rx="2.5" fill="#AED6F1"/>
      <rect x="46" y="90" width="40" height="4" rx="2" fill="#D6EAF8"/>
      <rect x="46" y="99" width="46" height="4" rx="2" fill="#D6EAF8"/>
      {/* Étiquette onglet */}
      <rect x="48" y="52" width="28" height="10" rx="4" fill="#2980B9"/>
      {/* Personne gauche - remet le dossier */}
      <circle cx="26" cy="72" r="11" fill="#F0D9B5" stroke="#D4A96A" strokeWidth="1.5"/>
      <rect x="18" y="83" width="16" height="22" rx="5" fill="#2471A3"/>
      <path d="M18 87 L10 100" stroke="#F0D9B5" strokeWidth="3.5" strokeLinecap="round"/>
      <path d="M34 87 L38 70" stroke="#F0D9B5" strokeWidth="3.5" strokeLinecap="round"/>
      <path d="M20 105 L18 120" stroke="#2C3E50" strokeWidth="3.5" strokeLinecap="round"/>
      <path d="M32 105 L34 120" stroke="#2C3E50" strokeWidth="3.5" strokeLinecap="round"/>
      {/* Personne droite - reçoit */}
      <circle cx="134" cy="70" r="11" fill="#F0D9B5" stroke="#D4A96A" strokeWidth="1.5"/>
      <rect x="126" y="81" width="16" height="22" rx="5" fill="#117A65"/>
      <path d="M126 85 L118 96" stroke="#F0D9B5" strokeWidth="3.5" strokeLinecap="round"/>
      <path d="M142 85 L150 96" stroke="#F0D9B5" strokeWidth="3.5" strokeLinecap="round"/>
      <path d="M128 103 L126 118" stroke="#2C3E50" strokeWidth="3.5" strokeLinecap="round"/>
      <path d="M140 103 L142 118" stroke="#2C3E50" strokeWidth="3.5" strokeLinecap="round"/>
      {/* Flèche de remise */}
      <path d="M48 90 L40 86" stroke="#AED6F1" strokeWidth="2" strokeLinecap="round" strokeDasharray="4 2"/>
    </svg>
  )
}

/* ═══════════════════════════════════════════════════════
   02 - INSCRIPTION / Formulaire + stylo
═══════════════════════════════════════════════════════ */
function S02Inscription({ size }) {
  return (
    <svg width={size} height={size} viewBox="0 0 160 160" fill="none">
      <rect width="160" height="160" rx="22" fill="#F4ECF7"/>
      {/* Feuille */}
      <rect x="30" y="22" width="82" height="110" rx="7" fill="white" stroke="#C39BD3" strokeWidth="2"/>
      <rect x="30" y="22" width="82" height="20" rx="7" fill="#9B59B6"/>
      <rect x="30" y="32" width="82" height="10" fill="#9B59B6"/>
      {/* Lignes champ */}
      {[52, 66, 80, 94, 108].map((y, i) => (
        <g key={i}>
          <rect x="40" y={y} width="20" height="3.5" rx="1.75" fill="#C39BD3" opacity="0.7"/>
          <rect x="40" y={y + 6} width="62" height="8" rx="3" fill="#F4ECF7" stroke="#C39BD3" strokeWidth="1.2"/>
        </g>
      ))}
      {/* Stylo plume */}
      <g transform="rotate(-35 128 60)">
        <rect x="120" y="30" width="10" height="46" rx="5" fill="#8E44AD"/>
        <rect x="120" y="30" width="10" height="8" rx="5" fill="#D7BDE2"/>
        <polygon points="120,76 130,76 125,90" fill="#F39C12"/>
        <line x1="125" y1="78" x2="125" y2="88" stroke="#E67E22" strokeWidth="1.5" strokeLinecap="round"/>
      </g>
      {/* Coche validée */}
      <circle cx="130" cy="118" r="16" fill="#27AE60"/>
      <path d="M122 118 L128 125 L139 108" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

/* ═══════════════════════════════════════════════════════
   03 - CONCOURS / Podium + trophée
═══════════════════════════════════════════════════════ */
function S03Concours({ size }) {
  return (
    <svg width={size} height={size} viewBox="0 0 160 160" fill="none">
      <rect width="160" height="160" rx="22" fill="#FEF9E7"/>
      {/* Podium */}
      <rect x="62" y="72" width="36" height="66" rx="4" fill="#F39C12"/>
      <rect x="20" y="94" width="42" height="44" rx="4" fill="#F0B27A"/>
      <rect x="98" y="104" width="42" height="34" rx="4" fill="#FAD7A0"/>
      {/* Chiffres podium */}
      <rect x="74" y="82" width="12" height="4" rx="2" fill="#FEF9E7" opacity="0.7"/>
      <rect x="29" y="102" width="24" height="4" rx="2" fill="#FEF9E7" opacity="0.7"/>
      <rect x="107" y="112" width="24" height="4" rx="2" fill="#FEF9E7" opacity="0.7"/>
      {/* Barre 1 */}
      <rect x="34" y="80" width="4" height="14" rx="2" fill="#D4AC0D"/>
      <rect x="34" y="78" width="4" height="4" rx="2" fill="#D4AC0D"/>
      {/* Trophée centre */}
      <path d="M68 44 Q68 68 80 70 Q92 68 92 44 Z" fill="#F39C12" stroke="#D4AC0D" strokeWidth="2"/>
      <rect x="77" y="68" width="6" height="12" rx="2" fill="#D4AC0D"/>
      <rect x="72" y="78" width="16" height="5" rx="2.5" fill="#F39C12" stroke="#D4AC0D" strokeWidth="1.5"/>
      {/* Poignées trophée */}
      <path d="M68 50 Q58 50 58 58 Q58 66 68 64" stroke="#D4AC0D" strokeWidth="3" fill="none" strokeLinecap="round"/>
      <path d="M92 50 Q102 50 102 58 Q102 66 92 64" stroke="#D4AC0D" strokeWidth="3" fill="none" strokeLinecap="round"/>
      {/* Étoile au sommet */}
      <path d="M80 32 L82 38 L88 38 L83 42 L85 48 L80 44 L75 48 L77 42 L72 38 L78 38 Z" fill="#F4D03F" stroke="#D4AC0D" strokeWidth="1"/>
      {/* Personnes */}
      <circle cx="41" cy="80" r="9" fill="#F0D9B5" stroke="#D4A96A" strokeWidth="1.5"/>
      <rect x="34" y="89" width="14" height="8" rx="4" fill="#2980B9"/>
      <circle cx="80" cy="58" r="9" fill="#F0D9B5" stroke="#D4A96A" strokeWidth="1.5"/>
      <rect x="73" y="67" width="14" height="8" rx="4" fill="#E74C3C"/>
      <circle cx="119" cy="90" r="9" fill="#F0D9B5" stroke="#D4A96A" strokeWidth="1.5"/>
      <rect x="112" y="99" width="14" height="8" rx="4" fill="#27AE60"/>
    </svg>
  )
}

/* ═══════════════════════════════════════════════════════
   04 - BOURSE / Main tenant billets + pièces
═══════════════════════════════════════════════════════ */
function S04Bourse({ size }) {
  return (
    <svg width={size} height={size} viewBox="0 0 160 160" fill="none">
      <rect width="160" height="160" rx="22" fill="#FEF5E7"/>
      {/* Billet */}
      <rect x="22" y="58" width="90" height="52" rx="8" fill="#27AE60" stroke="#1E8449" strokeWidth="2"/>
      <rect x="28" y="64" width="78" height="40" rx="5" fill="#2ECC71"/>
      <rect x="34" y="70" width="22" height="28" rx="11" fill="#1E8449"/>
      <rect x="34" y="70" width="22" height="28" rx="11" fill="none" stroke="#27AE60" strokeWidth="1.5"/>
      <rect x="66" y="76" width="34" height="4" rx="2" fill="#1E8449"/>
      <rect x="66" y="84" width="26" height="3" rx="1.5" fill="#1E8449" opacity="0.7"/>
      <rect x="66" y="91" width="30" height="3" rx="1.5" fill="#1E8449" opacity="0.7"/>
      {/* Pièces empilées */}
      <ellipse cx="124" cy="102" rx="18" ry="7" fill="#F4D03F" stroke="#D4AC0D" strokeWidth="2"/>
      <rect x="106" y="88" width="36" height="14" fill="#F4D03F"/>
      <ellipse cx="124" cy="88" rx="18" ry="7" fill="#FAE5A0" stroke="#D4AC0D" strokeWidth="2"/>
      <rect x="106" y="78" width="36" height="10" fill="#F4D03F"/>
      <ellipse cx="124" cy="78" rx="18" ry="7" fill="#FAE5A0" stroke="#D4AC0D" strokeWidth="2"/>
      <rect x="110" y="69" width="8" height="11" rx="1" fill="#D4AC0D" opacity="0.6"/>
      <rect x="122" y="69" width="8" height="11" rx="1" fill="#D4AC0D" opacity="0.6"/>
      {/* Main tendue */}
      <path d="M28 110 Q28 124 44 124 L80 118" stroke="#F0D9B5" strokeWidth="8" strokeLinecap="round" fill="none"/>
      <circle cx="80" cy="118" r="6" fill="#F0D9B5" stroke="#D4A96A" strokeWidth="1.5"/>
      {/* Flèche montante */}
      <path d="M118 56 L118 44 M112 50 L118 44 L124 50" stroke="#27AE60" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

/* ═══════════════════════════════════════════════════════
   05 - EXAMEN / Feuille QCM + horloge
═══════════════════════════════════════════════════════ */
function S05Examen({ size }) {
  return (
    <svg width={size} height={size} viewBox="0 0 160 160" fill="none">
      <rect width="160" height="160" rx="22" fill="#FDEDEC"/>
      {/* Feuille */}
      <rect x="22" y="28" width="88" height="118" rx="6" fill="white" stroke="#F1948A" strokeWidth="2"/>
      <rect x="22" y="28" width="88" height="18" rx="6" fill="#E74C3C"/>
      <rect x="22" y="36" width="88" height="10" fill="#E74C3C"/>
      {/* Lignes questions */}
      {[56, 76, 96, 116].map((y, i) => (
        <g key={i}>
          {/* Numéro sous forme de rect arrondi */}
          <rect x="30" y={y} width="6" height="6" rx="3" fill="#E74C3C"/>
          <rect x="40" y={y} width="58" height="4" rx="2" fill="#FDECEA"/>
          {/* Cases à cocher */}
          <rect x="30" y={y + 10} width="8" height="8" rx="2"
            fill={i % 3 === 0 ? "#E74C3C" : "white"}
            stroke="#F1948A" strokeWidth="1.5"/>
          {i % 3 === 0 && (
            <path d={`M${32} ${y+13} L${35} ${y+16} L${38} ${y+11}`}
              stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          )}
          <rect x="44" y={y + 10} width="8" height="8" rx="2"
            fill={i === 1 ? "#E74C3C" : "white"}
            stroke="#F1948A" strokeWidth="1.5"/>
          {i === 1 && (
            <path d="M46 117 L49 120 L52 115" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          )}
          <rect x="58" y={y + 10} width="8" height="8" rx="2" fill="white" stroke="#F1948A" strokeWidth="1.5"/>
          <rect x="40" y={y + 10} width="30" height="3" rx="1.5" fill="#FDECEA" opacity="0"/>
        </g>
      ))}
      {/* Horloge */}
      <circle cx="130" cy="50" r="22" fill="white" stroke="#E74C3C" strokeWidth="3"/>
      <circle cx="130" cy="50" r="16" fill="#FDEDEC"/>
      {/* Graduation heures */}
      {[0,30,60,90,120,150,180,210,240,270,300,330].map((deg, i) => {
        const r = Math.PI * deg / 180
        const r1 = i % 3 === 0 ? 11 : 13
        return <line key={i}
          x1={130 + r1 * Math.cos(r)} y1={50 + r1 * Math.sin(r)}
          x2={130 + 15 * Math.cos(r)} y2={50 + 15 * Math.sin(r)}
          stroke="#E74C3C" strokeWidth={i % 3 === 0 ? 2 : 1} strokeLinecap="round"/>
      })}
      <line x1="130" y1="50" x2="130" y2="38" stroke="#C0392B" strokeWidth="2.5" strokeLinecap="round"/>
      <line x1="130" y1="50" x2="140" y2="54" stroke="#E74C3C" strokeWidth="2" strokeLinecap="round"/>
      <circle cx="130" cy="50" r="2.5" fill="#C0392B"/>
      {/* Bouton haut horloge */}
      <rect x="127" y="27" width="6" height="4" rx="2" fill="#E74C3C"/>
    </svg>
  )
}

/* ═══════════════════════════════════════════════════════
   06 - CERTIFICAT / Parchemin + sceau + ruban
═══════════════════════════════════════════════════════ */
function S06Certificat({ size }) {
  return (
    <svg width={size} height={size} viewBox="0 0 160 160" fill="none">
      <rect width="160" height="160" rx="22" fill="#EAF2FF"/>
      {/* Parchemin */}
      <rect x="20" y="24" width="96" height="120" rx="6" fill="#FEF9E7" stroke="#D4AC0D" strokeWidth="2"/>
      {/* Bordure décorative */}
      <rect x="26" y="30" width="84" height="108" rx="4" fill="none" stroke="#FAD7A0" strokeWidth="1.5"/>
      {/* Lignes texte */}
      <rect x="34" y="44" width="68" height="5" rx="2.5" fill="#D4AC0D" opacity="0.6"/>
      {[58, 68, 78, 88, 98].map((y, i) => (
        <rect key={i} x="34" y={y} width={i % 2 === 0 ? 64 : 50} height="4" rx="2" fill="#AED6F1"/>
      ))}
      {/* Ruban */}
      <path d="M56 108 L44 128 L64 120 L80 130 L96 120 L116 128 L104 108 Z" fill="#E74C3C"/>
      <path d="M64 108 L64 120 L80 114 L96 120 L96 108 Z" fill="#C0392B"/>
      {/* Médaille */}
      <circle cx="80" cy="104" r="18" fill="#F4D03F" stroke="#D4AC0D" strokeWidth="2.5"/>
      <circle cx="80" cy="104" r="12" fill="#FAE5A0" stroke="#D4AC0D" strokeWidth="1.5"/>
      {/* Étoile SVG pure (polygone) */}
      <polygon
        points="80,96 82,101 87,101 83,104 85,110 80,107 75,110 77,104 73,101 78,101"
        fill="#D4AC0D"
      />
      {/* Plume / stylo droite */}
      <g transform="rotate(30 128 50)">
        <path d="M120 28 Q136 22 138 50 L128 48 Z" fill="#85C1E9" stroke="#2980B9" strokeWidth="1.5"/>
        <line x1="128" y1="48" x2="122" y2="72" stroke="#2980B9" strokeWidth="2" strokeLinecap="round"/>
        <path d="M120 70 L126 74 L122 78" fill="#2C3E50"/>
      </g>
    </svg>
  )
}

/* ═══════════════════════════════════════════════════════
   07 - RECRUTEMENT / CV + loupe
═══════════════════════════════════════════════════════ */
function S07Recrutement({ size }) {
  return (
    <svg width={size} height={size} viewBox="0 0 160 160" fill="none">
      <rect width="160" height="160" rx="22" fill="#E8F8F5"/>
      {/* CV / feuille */}
      <rect x="20" y="30" width="78" height="102" rx="6" fill="white" stroke="#A9DFBF" strokeWidth="2"/>
      <rect x="20" y="30" width="78" height="16" rx="6" fill="#1ABC9C"/>
      <rect x="20" y="38" width="78" height="8" fill="#1ABC9C"/>
      {/* Photo avatar */}
      <circle cx="44" cy="62" r="13" fill="#D5DBDB" stroke="#A9DFBF" strokeWidth="1.5"/>
      <circle cx="44" cy="58" r="6" fill="#95A5A6"/>
      <path d="M31 75 Q31 69 44 69 Q57 69 57 75" fill="#95A5A6"/>
      {/* Infos */}
      <rect x="62" y="56" width="28" height="4" rx="2" fill="#1ABC9C"/>
      <rect x="62" y="64" width="22" height="3" rx="1.5" fill="#A9DFBF"/>
      <rect x="62" y="71" width="26" height="3" rx="1.5" fill="#A9DFBF"/>
      {/* Sections */}
      {[84, 96, 108].map((y, i) => (
        <g key={i}>
          <rect x="28" y={y} width="12" height="3.5" rx="1.75" fill="#1ABC9C" opacity="0.7"/>
          <rect x="44" y={y} width={36 - i * 4} height="3.5" rx="1.75" fill="#D5DBDB"/>
        </g>
      ))}
      {/* Loupe */}
      <circle cx="118" cy="88" r="30" fill="white" stroke="#148F77" strokeWidth="3"/>
      <circle cx="118" cy="88" r="22" fill="#E8F8F5"/>
      {/* Contenu dans loupe - silhouette */}
      <circle cx="118" cy="82" r="8" fill="#D5DBDB" stroke="#A9DFBF" strokeWidth="1.5"/>
      <circle cx="118" cy="78" r="4" fill="#95A5A6"/>
      <path d="M108 94 Q108 88 118 88 Q128 88 128 94" fill="#95A5A6"/>
      {/* Manche loupe */}
      <line x1="140" y1="110" x2="150" y2="122" stroke="#148F77" strokeWidth="6" strokeLinecap="round"/>
    </svg>
  )
}

/* ═══════════════════════════════════════════════════════
   08 - FORMATION / Tableau + professeur
═══════════════════════════════════════════════════════ */
function S08Formation({ size }) {
  return (
    <svg width={size} height={size} viewBox="0 0 160 160" fill="none">
      <rect width="160" height="160" rx="22" fill="#FFF3E0"/>
      {/* Tableau */}
      <rect x="10" y="26" width="96" height="68" rx="6" fill="#2C3E50"/>
      <rect x="14" y="30" width="88" height="60" rx="4" fill="#34495E"/>
      {/* Contenu tableau */}
      <rect x="22" y="40" width="40" height="4" rx="2" fill="#1ABC9C"/>
      <rect x="22" y="50" width="30" height="3.5" rx="1.75" fill="#85C1E9"/>
      <rect x="22" y="58" width="36" height="3.5" rx="1.75" fill="#85C1E9"/>
      <rect x="22" y="66" width="24" height="3.5" rx="1.75" fill="#85C1E9"/>
      {/* Graphique barres */}
      <rect x="68" y="58" width="8" height="22" rx="2" fill="#E74C3C"/>
      <rect x="80" y="48" width="8" height="32" rx="2" fill="#F39C12"/>
      <rect x="92" y="52" width="8" height="28" rx="2" fill="#27AE60"/>
      {/* Pied tableau */}
      <rect x="50" y="94" width="16" height="6" rx="2" fill="#95A5A6"/>
      <rect x="40" y="100" width="36" height="4" rx="2" fill="#2C3E50"/>
      {/* Professeur */}
      <circle cx="130" cy="62" r="13" fill="#F0D9B5" stroke="#D4A96A" strokeWidth="1.5"/>
      <path d="M122 54 Q130 48 138 51" fill="#5D4037"/>
      <rect x="122" y="75" width="16" height="26" rx="5" fill="#E67E22"/>
      <path d="M122 79 L106 70" stroke="#F0D9B5" strokeWidth="3.5" strokeLinecap="round"/>
      <path d="M138 79 L144 92" stroke="#F0D9B5" strokeWidth="3.5" strokeLinecap="round"/>
      <path d="M124 101 L122 122" stroke="#2C3E50" strokeWidth="3.5" strokeLinecap="round"/>
      <path d="M136 101 L138 122" stroke="#2C3E50" strokeWidth="3.5" strokeLinecap="round"/>
      {/* Pointeur */}
      <line x1="106" y1="70" x2="90" y2="62" stroke="#6D4C41" strokeWidth="2.5" strokeLinecap="round"/>
      <circle cx="90" cy="61" r="2.5" fill="#E74C3C"/>
      {/* Sol */}
      <rect x="10" y="128" width="140" height="5" rx="2.5" fill="#FAD7A0" opacity="0.6"/>
    </svg>
  )
}

/* ═══════════════════════════════════════════════════════
   09 - ADMISSION / Porte ouverte + personnage
═══════════════════════════════════════════════════════ */
function S09Admission({ size }) {
  return (
    <svg width={size} height={size} viewBox="0 0 160 160" fill="none">
      <rect width="160" height="160" rx="22" fill="#EBF5FB"/>
      {/* Sol */}
      <rect x="10" y="140" width="140" height="6" rx="3" fill="#AED6F1"/>
      {/* Mur */}
      <rect x="10" y="30" width="120" height="110" rx="4" fill="#D6EAF8"/>
      {/* Porte cadre */}
      <rect x="40" y="50" width="60" height="90" rx="4" fill="#154360"/>
      {/* Porte ouverte - battant */}
      <path d="M42 52 Q42 136 100 138 L100 52 Z" fill="#1A5276"/>
      <path d="M42 52 Q42 136 100 138" fill="#154360"/>
      {/* Perspective intérieure */}
      <rect x="44" y="54" width="54" height="84" rx="3" fill="#2471A3" opacity="0.4"/>
      {/* Poignée */}
      <circle cx="93" cy="97" r="4" fill="#D4AC0D" stroke="#B7950B" strokeWidth="1.5"/>
      {/* Lumière au sol */}
      <path d="M42 138 L80 138 L100 138 L78 108 Z" fill="#F4D03F" opacity="0.25"/>
      {/* Personnage qui entre */}
      <circle cx="118" cy="86" r="12" fill="#F0D9B5" stroke="#D4A96A" strokeWidth="1.5"/>
      <path d="M110 78 Q118 72 126 75" fill="#4E342E"/>
      <rect x="110" y="98" width="16" height="26" rx="5" fill="#2980B9"/>
      <path d="M110 102 L102 116" stroke="#F0D9B5" strokeWidth="3.5" strokeLinecap="round"/>
      <path d="M126 102 L132 112" stroke="#F0D9B5" strokeWidth="3.5" strokeLinecap="round"/>
      <path d="M112 124 L110 140" stroke="#2C3E50" strokeWidth="3.5" strokeLinecap="round"/>
      <path d="M124 124 L126 140" stroke="#2C3E50" strokeWidth="3.5" strokeLinecap="round"/>
      {/* Flèche vers porte */}
      <path d="M108 100 L96 100 M100 95 L96 100 L100 105" stroke="#AED6F1" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

/* ═══════════════════════════════════════════════════════
   10 - ORIENTATION / Boussole + chemin
═══════════════════════════════════════════════════════ */
function S10Orientation({ size }) {
  return (
    <svg width={size} height={size} viewBox="0 0 160 160" fill="none">
      <rect width="160" height="160" rx="22" fill="#F0FFF4"/>
      {/* Route */}
      <path d="M20 148 Q80 100 140 148" stroke="#A9DFBF" strokeWidth="10" strokeLinecap="round" fill="none"/>
      <path d="M20 148 Q80 100 140 148" stroke="white" strokeWidth="3" strokeLinecap="round" strokeDasharray="8 6" fill="none"/>
      {/* Boussole */}
      <circle cx="80" cy="68" r="40" fill="white" stroke="#27AE60" strokeWidth="3"/>
      <circle cx="80" cy="68" r="34" fill="#F0FFF4"/>
      {/* Cadran */}
      <circle cx="80" cy="68" r="26" fill="none" stroke="#A9DFBF" strokeWidth="1" strokeDasharray="2 3"/>
      {/* Graduation cardinaux */}
      <line x1="80" y1="36" x2="80" y2="42" stroke="#2C3E50" strokeWidth="2.5" strokeLinecap="round"/>
      <line x1="80" y1="94" x2="80" y2="100" stroke="#2C3E50" strokeWidth="2.5" strokeLinecap="round"/>
      <line x1="48" y1="68" x2="54" y2="68" stroke="#2C3E50" strokeWidth="2.5" strokeLinecap="round"/>
      <line x1="106" y1="68" x2="112" y2="68" stroke="#2C3E50" strokeWidth="2.5" strokeLinecap="round"/>
      {/* Aiguille Nord (rouge) */}
      <path d="M80 68 L76 50 L80 54 L84 50 Z" fill="#E74C3C"/>
      {/* Aiguille Sud (gris) */}
      <path d="M80 68 L76 86 L80 82 L84 86 Z" fill="#95A5A6"/>
      <circle cx="80" cy="68" r="4" fill="#2C3E50"/>
      {/* Panneau indicateur */}
      <rect x="110" y="30" width="34" height="18" rx="4" fill="#27AE60"/>
      <line x1="118" y1="48" x2="118" y2="62" stroke="#27AE60" strokeWidth="3" strokeLinecap="round"/>
      <rect x="110" y="30" width="34" height="4" rx="2" fill="#1E8449" opacity="0.5"/>
      <path d="M105 38 L110 38" stroke="#27AE60" strokeWidth="2" strokeLinecap="round"/>
      <polygon points="105,38 110,34 110,42" fill="#27AE60"/>
    </svg>
  )
}

/* ═══════════════════════════════════════════════════════
   11 - ENTRETIEN / Deux personnes face à face, bureau
═══════════════════════════════════════════════════════ */
function S11Entretien({ size }) {
  return (
    <svg width={size} height={size} viewBox="0 0 160 160" fill="none">
      <rect width="160" height="160" rx="22" fill="#F9EBEA"/>
      {/* Table */}
      <rect x="22" y="96" width="116" height="8" rx="4" fill="#E59866"/>
      <rect x="30" y="104" width="6" height="30" rx="3" fill="#CA6F1E"/>
      <rect x="124" y="104" width="6" height="30" rx="3" fill="#CA6F1E"/>
      {/* Documents sur table */}
      <rect x="62" y="88" width="36" height="10" rx="3" fill="white" stroke="#E59866" strokeWidth="1.5"/>
      <rect x="66" y="91" width="28" height="2.5" rx="1.25" fill="#A9CCE3"/>
      <rect x="66" y="95" width="20" height="2.5" rx="1.25" fill="#A9CCE3"/>
      {/* Recruteur gauche */}
      <circle cx="36" cy="68" r="13" fill="#F0D9B5" stroke="#D4A96A" strokeWidth="1.5"/>
      <path d="M28 60 Q36 54 44 57" fill="#4E342E"/>
      <rect x="28" y="81" width="16" height="18" rx="5" fill="#1A5276"/>
      <path d="M28 85 L20 96" stroke="#F0D9B5" strokeWidth="3.5" strokeLinecap="round"/>
      <path d="M44 85 L52 90" stroke="#F0D9B5" strokeWidth="3.5" strokeLinecap="round"/>
      <path d="M30 99 L28 112" stroke="#2C3E50" strokeWidth="3.5" strokeLinecap="round"/>
      <path d="M42 99 L44 112" stroke="#2C3E50" strokeWidth="3.5" strokeLinecap="round"/>
      {/* Bulle conversation gauche */}
      <rect x="50" y="44" width="40" height="22" rx="8" fill="white" stroke="#AED6F1" strokeWidth="1.5"/>
      <polygon points="54,66 50,74 60,66" fill="white" stroke="#AED6F1" strokeWidth="1.5"/>
      <rect x="56" y="50" width="28" height="3" rx="1.5" fill="#AED6F1"/>
      <rect x="56" y="57" width="20" height="3" rx="1.5" fill="#AED6F1"/>
      {/* Candidat droit */}
      <circle cx="124" cy="68" r="13" fill="#F0D9B5" stroke="#D4A96A" strokeWidth="1.5"/>
      <path d="M116 60 Q124 54 132 57" fill="#5D4037"/>
      <rect x="116" y="81" width="16" height="18" rx="5" fill="#C0392B"/>
      <path d="M116 85 L108 94" stroke="#F0D9B5" strokeWidth="3.5" strokeLinecap="round"/>
      <path d="M132 85 L140 92" stroke="#F0D9B5" strokeWidth="3.5" strokeLinecap="round"/>
      <path d="M118 99 L116 112" stroke="#2C3E50" strokeWidth="3.5" strokeLinecap="round"/>
      <path d="M130 99 L132 112" stroke="#2C3E50" strokeWidth="3.5" strokeLinecap="round"/>
      {/* Bulle candidat */}
      <rect x="70" y="20" width="36" height="20" rx="8" fill="white" stroke="#F1948A" strokeWidth="1.5"/>
      <polygon points="102,40 106,48 96,40" fill="white" stroke="#F1948A" strokeWidth="1.5"/>
      <rect x="76" y="26" width="24" height="3" rx="1.5" fill="#F1948A"/>
      <rect x="76" y="32" width="16" height="3" rx="1.5" fill="#F1948A"/>
    </svg>
  )
}

/* ═══════════════════════════════════════════════════════
   12 - DIPLÔME / Rouleau remis + chapeau
═══════════════════════════════════════════════════════ */
function S12Diplome({ size }) {
  return (
    <svg width={size} height={size} viewBox="0 0 160 160" fill="none">
      <rect width="160" height="160" rx="22" fill="#EDE7F6"/>
      {/* Chapeau diplôme */}
      <ellipse cx="80" cy="42" rx="46" ry="11" fill="#311B92"/>
      <rect x="66" y="18" width="28" height="28" rx="4" fill="#3949AB"/>
      <rect x="60" y="14" width="40" height="8" rx="4" fill="#311B92"/>
      {/* Cordon */}
      <path d="M118 38 Q132 48 128 64 L124 68" stroke="#F4D03F" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
      <circle cx="123" cy="70" r="5" fill="#F4D03F" stroke="#D4AC0D" strokeWidth="1.5"/>
      <circle cx="128" cy="78" r="4" fill="#F4D03F" stroke="#D4AC0D" strokeWidth="1.5"/>
      {/* Rouleau parchemin */}
      <ellipse cx="80" cy="78" rx="8" ry="4" fill="#D4AC0D"/>
      <rect x="34" y="78" width="92" height="58" rx="4" fill="#FEF9E7" stroke="#D4AC0D" strokeWidth="2"/>
      <ellipse cx="80" cy="78" rx="46" ry="8" fill="#FAD7A0" stroke="#D4AC0D" strokeWidth="2"/>
      <ellipse cx="80" cy="136" rx="46" ry="8" fill="#FAD7A0" stroke="#D4AC0D" strokeWidth="2"/>
      {/* Texte simulé */}
      <rect x="50" y="92" width="60" height="4" rx="2" fill="#D4AC0D" opacity="0.5"/>
      <rect x="56" y="102" width="48" height="3.5" rx="1.75" fill="#AED6F1" opacity="0.8"/>
      <rect x="60" y="110" width="40" height="3.5" rx="1.75" fill="#AED6F1" opacity="0.8"/>
      {/* Sceau */}
      <circle cx="80" cy="122" r="10" fill="#E74C3C" stroke="#C0392B" strokeWidth="1.5"/>
      <circle cx="80" cy="122" r="6" fill="#C0392B"/>
      <polygon points="80,117 81.5,121 86,121 82.5,124 83.5,128 80,126 76.5,128 77.5,124 74,121 78.5,121" fill="#FAD7A0"/>
    </svg>
  )
}

/* ═══════════════════════════════════════════════════════
   POOL & SÉLECTION
═══════════════════════════════════════════════════════ */

/**
 * Pool complet dans un ordre fixe.
 * La rotation par `index` garantit qu'au sein d'un même cycle
 * chaque card successive aura une illustration différente.
 */
const POOL = [
  S01Candidature,
  S02Inscription,
  S03Concours,
  S04Bourse,
  S05Examen,
  S06Certificat,
  S07Recrutement,
  S08Formation,
  S09Admission,
  S10Orientation,
  S11Entretien,
  S12Diplome,
]

/** Mots-clés → index dans POOL (priorité sur le titre) */
const MOTS = [
  { mots: ['candidature', 'dossier', 'remise'],                      idx: 0  },
  { mots: ['inscription', 'enrôlement', 'enrolement'],               idx: 1  },
  { mots: ['concours', 'compétition', 'competition', 'podium'],      idx: 2  },
  { mots: ['bourse', 'financement', 'aide financière', 'allocation'], idx: 3  },
  { mots: ['examen', 'test', 'évaluation', 'evaluation', 'épreuve'], idx: 4  },
  { mots: ['certificat', 'attestation'],                             idx: 5  },
  { mots: ['recrutement', 'emploi', 'poste', 'personnel'],           idx: 6  },
  { mots: ['formation', 'cours', 'apprentissage', 'stage'],          idx: 7  },
  { mots: ['admission', 'entrée', 'entree'],                         idx: 8  },
  { mots: ['orientation', 'parcours', 'filière', 'filiere'],         idx: 9  },
  { mots: ['entretien', 'interview', 'sélection'],                   idx: 10 },
  { mots: ['diplôme', 'diplome', 'remise', 'graduation'],            idx: 11 },
]

function choisir(titre, index) {
  const t = (titre ?? '').toLowerCase()
  for (const { mots, idx } of MOTS) {
    if (mots.some((m) => t.includes(m))) {
      /* Si plusieurs appels ont le même mot-clé, on décale par index
         pour éviter les doublons dans une même liste */
      return POOL[(idx + index) % POOL.length]
    }
  }
  /* Aucun mot-clé : rotation pure par index */
  return POOL[index % POOL.length]
}

/* ═══════════════════════════════════════════════════════
   EXPORT
═══════════════════════════════════════════════════════ */
export default function AppelIllustration({
  titre     = '',
  cycle     = '',   // gardé pour compatibilité future
  index     = 0,
  size      = 110,
  className = '',
}) {
  const Illu = choisir(titre, index)
  return (
    <span
      className={className}
      style={{
        display        : 'inline-flex',
        alignItems     : 'center',
        justifyContent : 'center',
        filter         : 'drop-shadow(0 2px 8px rgba(0,0,0,0.08))',
        borderRadius   : 18,
      }}
    >
      <Illu size={size} />
    </span>
  )
}
