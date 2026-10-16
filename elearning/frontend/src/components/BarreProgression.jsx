/**
 * Barre de progression (pourcentage borné 0 → 100).
 * `variante` : '' (vert), 'or' ou 'rouge'.
 */
export function BarreProgression({ valeur, variante = '', libelle }) {
  const pourcentage = Math.max(0, Math.min(100, Number(valeur) || 0))
  const classes = ['barre-progression']
  if (variante) classes.push(`barre-progression-${variante}`)

  return (
    <div
      className={classes.join(' ')}
      role="progressbar"
      aria-valuenow={pourcentage}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={libelle}
    >
      <div
        className="barre-progression-remplie"
        style={{ width: `${pourcentage}%` }}
      />
    </div>
  )
}
