/**
 * Histogramme CSS pur de la distribution des notes par tranches.
 * `tranches` : [{ libelle, nombre, principale? }] - `principale` met
 * la colonne en or (ex. tranche sous la moyenne).
 */
export function HistogrammeNotes({ tranches }) {
  const maximum = Math.max(...tranches.map((tranche) => tranche.nombre), 1)

  return (
    <div
      className="histogramme"
      role="img"
      aria-label="Répartition des notes par tranche"
    >
      {tranches.map((tranche) => (
        <div key={tranche.libelle} className="histo-colonne">
          <span className="histo-valeur">{tranche.nombre}</span>
          <div className="histo-zone">
            <div
              className={
                tranche.principale
                  ? 'histo-barre histo-barre-or'
                  : 'histo-barre'
              }
              style={{
                height: `${Math.round((tranche.nombre / maximum) * 100)}%`,
              }}
            />
          </div>
          <span className="histo-etiquette">{tranche.libelle}</span>
        </div>
      ))}
    </div>
  )
}
