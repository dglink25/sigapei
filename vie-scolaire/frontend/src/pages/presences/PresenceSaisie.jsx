import { useState } from 'react'
import { Link, useNavigate } from 'react-router'

import { messageErreur } from '../../api/client.js'
import { useEnregistrerPresences } from '../../api/presences.js'
import { Icone } from '../../components/Icone.jsx'
import { useProfilStore } from '../../stores/profil.js'
import { dateAujourdhui } from '../../utils/format.js'

const STATUTS = [
  { valeur: 'present', libelle: 'Présent' },
  { valeur: 'absent', libelle: 'Absent' },
  { valeur: 'retard', libelle: 'Retard' },
]

let compteurLigne = 0
const nouvelleLigne = (uuid = '') => {
  compteurLigne += 1
  return { cle: compteurLigne, uuid, statut: 'present' }
}

export function PresenceSaisie() {
  const navigate = useNavigate()
  const coursProfil = useProfilStore((etat) => etat.coursId)

  const [coursUuid, setCoursUuid] = useState(coursProfil || '')
  const [date, setDate] = useState(dateAujourdhui())
  const [lignes, setLignes] = useState([nouvelleLigne()])
  const [erreurLocale, setErreurLocale] = useState(null)

  const enregistrement = useEnregistrerPresences()

  function majLigne(cle, champ, valeur) {
    setLignes((etat) =>
      etat.map((ligne) => (ligne.cle === cle ? { ...ligne, [champ]: valeur } : ligne)),
    )
  }

  function ajouterLigne() {
    setLignes((etat) => [...etat, nouvelleLigne()])
  }

  function retirerLigne(cle) {
    setLignes((etat) => (etat.length > 1 ? etat.filter((l) => l.cle !== cle) : etat))
  }

  function soumettre(evenement) {
    evenement.preventDefault()
    setErreurLocale(null)

    const apprenants = lignes
      .map((ligne) => ({ uuid: ligne.uuid.trim(), statut: ligne.statut }))
      .filter((ligne) => ligne.uuid !== '')

    if (apprenants.length === 0) {
      setErreurLocale('Renseignez au moins un apprenant.')
      return
    }

    const uuids = apprenants.map((a) => a.uuid)
    if (new Set(uuids).size !== uuids.length) {
      setErreurLocale('Un apprenant est présent en double.')
      return
    }

    enregistrement.mutate(
      { cours_uuid: coursUuid.trim(), date, apprenants },
      { onSuccess: () => navigate('/presences') },
    )
  }

  return (
    <>
      <nav className="fil-ariane" aria-label="Fil d'Ariane">
        <Link to="/presences">Présences</Link>
        <span className="separateur" aria-hidden="true">/</span>
        <span aria-current="page">Saisie</span>
      </nav>

      <div className="bandeau-sticky">
        <div className="titre-page">
          <div>
            <h1>Saisir les présences d&#39;un cours</h1>
            <span className="badge badge-brouillon">Appel de classe</span>
          </div>
          <div className="actions-ligne">
            <button
              type="button"
              className="bouton bouton-secondaire"
              onClick={() => navigate(-1)}
            >
              Annuler
            </button>
            <button
              type="submit"
              form="formulaire-presences"
              className="bouton bouton-vert"
              disabled={enregistrement.isPending}
            >
              {enregistrement.isPending ? (
                <>
                  <span className="roue" aria-hidden="true" /> Enregistrement…
                </>
              ) : (
                <>
                  <Icone nom="save" />
                  Enregistrer
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      <p className="texte-efface">
        Enregistre les présences/absences d&#39;un cours pour une classe, à une
        date donnée. Les apprenants sont référencés par leur uuid du schéma
        scolarité (règle n°1 : aucune jointure inter-schémas). Une absence
        déclenche la notification du parent et l&#39;agrégation des alertes.
      </p>

      <form
        id="formulaire-presences"
        className="carte formulaire"
        onSubmit={soumettre}
      >
        <div className="grille-2-colonnes">
          <div className="champ">
            <label htmlFor="saisie-cours">Cours — UUID (scolarite) *</label>
            <input
              id="saisie-cours"
              type="text"
              value={coursUuid}
              onChange={(e) => setCoursUuid(e.target.value)}
              placeholder={coursProfil || 'UUID de l’emploi du temps'}
              required
            />
          </div>
          <div className="champ">
            <label htmlFor="saisie-date">Date du cours *</label>
            <input
              id="saisie-date"
              type="date"
              value={date}
              max={dateAujourdhui()}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>
        </div>

        <section className="section">
          <div className="element-tete">
            <h2 style={{ margin: 0 }}>Apprenants</h2>
            <span className="texte-efface">{lignes.length} ligne(s)</span>
          </div>

          <div className="liste-elements">
            {lignes.map((ligne) => (
              <div className="element" key={ligne.cle}>
                <div className="element-tete">
                  <div className="champ" style={{ flex: 1 }}>
                    <label htmlFor={`uuid-${ligne.cle}`}>Apprenant — UUID</label>
                    <input
                      id={`uuid-${ligne.cle}`}
                      type="text"
                      value={ligne.uuid}
                      onChange={(e) => majLigne(ligne.cle, 'uuid', e.target.value)}
                      placeholder="UUID de l’apprenant (scolarite.apprenants)"
                    />
                  </div>
                  <div className="champ" style={{ minWidth: '160px' }}>
                    <label htmlFor={`statut-${ligne.cle}`}>Statut</label>
                    <select
                      id={`statut-${ligne.cle}`}
                      value={ligne.statut}
                      onChange={(e) => majLigne(ligne.cle, 'statut', e.target.value)}
                    >
                      {STATUTS.map((s) => (
                        <option key={s.valeur} value={s.valeur}>
                          {s.libelle}
                        </option>
                      ))}
                    </select>
                  </div>
                  <button
                    type="button"
                    className="bouton bouton-danger bouton-compact"
                    onClick={() => retirerLigne(ligne.cle)}
                    disabled={lignes.length === 1}
                    aria-label="Retirer cette ligne"
                  >
                    <Icone nom="delete" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="actions-ligne" style={{ marginTop: '0.75rem' }}>
            <button
              type="button"
              className="bouton bouton-secondaire bouton-compact"
              onClick={ajouterLigne}
            >
              <Icone nom="add" />
              Ajouter un apprenant
            </button>
          </div>
        </section>

        <p className="aide">
          La saisie exige un jeton CAPTCHA (règle n°4), renseigné depuis le
          profil de démonstration. Sans clé secrète configurée côté backend, le
          serveur répond 503.
        </p>

        {erreurLocale && (
          <p className="erreur-champ" role="alert">
            {erreurLocale}
          </p>
        )}
        {enregistrement.isError && (
          <p className="erreur-champ" role="alert">
            {messageErreur(enregistrement.error)}
          </p>
        )}
      </form>
    </>
  )
}
