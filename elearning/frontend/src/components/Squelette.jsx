export function SqueletteLigne({ largeur = '100%' }) {
  return (
    <div
      className="squelette squelette-ligne"
      style={{ width: largeur }}
      aria-hidden="true"
    />
  )
}

export function SqueletteTexte({ lignes = 3 }) {
  return (
    <div className="squelette-texte" aria-hidden="true">
      {Array.from({ length: lignes }, (_, index) => (
        <SqueletteLigne key={index} largeur={index === lignes - 1 ? '60%' : '100%'} />
      ))}
    </div>
  )
}

export function SqueletteCarte() {
  return (
    <div className="carte squelette-carte" aria-hidden="true">
      <SqueletteLigne largeur="55%" />
      <SqueletteTexte lignes={3} />
    </div>
  )
}

export function SqueletteGrille({ nombre = 6 }) {
  return (
    <div className="grille-cartes">
      {Array.from({ length: nombre }, (_, index) => (
        <SqueletteCarte key={index} />
      ))}
    </div>
  )
}

export function SqueletteTableau({ colonnes = 4, lignes = 5 }) {
  return (
    <div className="squelette-tableau" aria-hidden="true">
      {Array.from({ length: lignes }, (_, indexLigne) => (
        <div className="squelette-tableau-ligne" key={indexLigne}>
          {Array.from({ length: colonnes }, (_, indexColonne) => (
            <SqueletteLigne
              key={indexColonne}
              largeur={indexColonne === 0 ? '60%' : '85%'}
            />
          ))}
        </div>
      ))}
    </div>
  )
}
