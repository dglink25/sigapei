/**
 * FlagInstitutionnel - Rendu textuel institutionnel du code pays (ISO 3166-1 alpha-2)
 * Remplace tout drapeau emoji ou sticker pour respecter la charte sobre et professionnelle.
 */
export default function FlagInstitutionnel({ country, countryName }) {
  const code = country || 'BJ'
  return (
    <span
      className="sg-phone-flag-iso"
      title={countryName || code}
      aria-label={countryName || code}
    >
      {code}
    </span>
  )
}
