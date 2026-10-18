import { Icone } from './Icone.jsx'

/**
 * Carte d'indicateur clé : icône, valeur chiffrée et libellé.
 * `variante` : '' (vert), 'or', 'rouge' ou 'creme'.
 */
export function CarteKpi({ icone, valeur, libelle, variante = '' }) {
  const classeCarte = variante ? `kpi kpi-${variante}` : 'kpi'

  return (
    <div className={classeCarte}>
      <span className="kpi-icone">
        <Icone nom={icone} />
      </span>
      <span className="kpi-valeur">{valeur}</span>
      <span className="kpi-libelle">{libelle}</span>
    </div>
  )
}
