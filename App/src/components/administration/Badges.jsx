/** État d'un service ou d'une assignation. */
export function EtatBadge({ actif, labels = ['Actif', 'Bloqué'] }) {
  return <span className={`ap-badge ap-badge--${actif ? 'success' : 'danger'}`}>{actif ? labels[0] : labels[1]}</span>
}

/** Statut d'un établissement (actif / suspendu / archivé). */
export function EtabBadge({ statut }) {
  const tone = statut === 'actif' ? 'success' : statut === 'suspendu' ? 'danger' : 'neutral'
  const label = statut === 'actif' ? 'Actif' : statut === 'suspendu' ? 'Suspendu' : statut === 'archive' ? 'Archivé' : statut ?? '-'
  return <span className={`ap-badge ap-badge--${tone}`}>{label}</span>
}
