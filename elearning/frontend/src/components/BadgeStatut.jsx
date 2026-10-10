const ETIQUETTES = {
  brouillon: 'Brouillon',
  publie: 'Publié',
  archive: 'Archivé',
  en_cours: 'En cours',
  soumis: 'Soumis',
  valide: 'Validé',
  blocage: 'Blocage',
  penalite: 'Pénalité',
  immediate: 'Immédiate',
  apres_date_limite: 'Après date limite',
  differee: 'Différée',
  texte: 'Texte',
  document: 'Document',
  video: 'Vidéo',
  image: 'Image',
  qcm: 'QCM',
  vrai_faux: 'Vrai / Faux',
  ouverte: 'Question ouverte',
}

export function BadgeStatut({ valeur }) {
  if (!valeur) return null
  return (
    <span className={`badge badge-${valeur}`}>
      {ETIQUETTES[valeur] ?? valeur}
    </span>
  )
}

export function BadgeRetard() {
  return <span className="badge badge-retard">En retard</span>
}
