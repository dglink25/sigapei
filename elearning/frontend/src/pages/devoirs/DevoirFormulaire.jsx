import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router'

import { useCoursListe } from '../../api/cours.js'
import { useCreationDevoir, useDevoir, useMajDevoir } from '../../api/devoirs.js'
import { messageErreur } from '../../api/client.js'
import { EditeurMarkdown } from '../../components/EditeurMarkdown.jsx'
import { ErreurApi } from '../../components/ErreurApi.jsx'
import { SqueletteTexte } from '../../components/Squelette.jsx'
import { useProfilStore } from '../../stores/profil.js'

/** Valeur d'un input datetime-local (heure locale) → ISO 8601 UTC pour l'API. */
function versIso(valeur) {
  return valeur ? new Date(valeur).toISOString() : null
}

/** ISO renvoyé par l'API → valeur affichable dans un input datetime-local. */
function versSaisie(valeur) {
  return valeur ? valeur.slice(0, 16) : ''
}

export function DevoirFormulaire() {
  const { uuid } = useParams()
  const edition = Boolean(uuid)
  const navigate = useNavigate()

  const matiereProfil = useProfilStore((etat) => etat.matiereId)
  const classeProfil = useProfilStore((etat) => etat.classeId)

  const [titre, setTitre] = useState('')
  const [enonce, setEnonce] = useState('')
  const [matiereId, setMatiereId] = useState('')
  const [classeId, setClasseId] = useState('')
  const [coursUuid, setCoursUuid] = useState('')
  const [dateLimite, setDateLimite] = useState('')
  const [noteMax, setNoteMax] = useState('20')
  const [politiqueRetard, setPolitiqueRetard] = useState('penalite')

  const devoir = useDevoir(uuid, { enabled: edition })
  const cours = useCoursListe({ page: 1 })
  const creation = useCreationDevoir()
  const maj = useMajDevoir()

  useEffect(() => {
    if (devoir.data) {
      setTitre(devoir.data.titre)
      setEnonce(devoir.data.enonce ?? '')
      setMatiereId(devoir.data.matiere_id ?? '')
      setClasseId(devoir.data.classe_id ?? '')
      setCoursUuid(devoir.data.cours ?? '')
      setDateLimite(versSaisie(devoir.data.date_limite))
      setNoteMax(String(devoir.data.note_max ?? '20'))
      setPolitiqueRetard(devoir.data.politique_retard)
    }
  }, [devoir.data])

  useEffect(() => {
    if (!edition) {
      setMatiereId(matiereProfil)
      setClasseId(classeProfil)
    }
  }, [edition, matiereProfil, classeProfil])

  function soumettre(evenement) {
    evenement.preventDefault()
    const donnees = {
      titre,
      enonce,
      matiere_id: matiereId,
      classe_id: classeId,
      cours: coursUuid || null,
      date_limite: versIso(dateLimite),
      note_max: noteMax,
      politique_retard: politiqueRetard,
    }

    if (edition) {
      maj.mutate(
        { uuid, donnees },
        { onSuccess: () => navigate(`/devoirs/${uuid}`) },
      )
    } else {
      creation.mutate(donnees, {
        onSuccess: (nouveauDevoir) => navigate(`/devoirs/${nouveauDevoir.uuid}`),
      })
    }
  }

  if (edition && devoir.isPending) {
    return (
      <>
        <h1>Chargement du devoir…</h1>
        <SqueletteTexte lignes={6} />
      </>
    )
  }
  if (edition && devoir.isError) {
    return <ErreurApi erreur={devoir.error} reessayer={() => devoir.refetch()} />
  }

  const mutation = edition ? maj : creation

  return (
    <>
      <h1>{edition ? 'Modifier le devoir' : 'Nouveau devoir'}</h1>
      <p className="texte-efface">
        L'énoncé accepte le Markdown : **gras**, listes, images et liens (un
        lien YouTube devient un lecteur intégré).
      </p>

      <form className="carte formulaire" onSubmit={soumettre}>
        <div className="champ">
          <label htmlFor="devoir-titre">Titre *</label>
          <input
            id="devoir-titre"
            type="text"
            value={titre}
            onChange={(e) => setTitre(e.target.value)}
            required
          />
        </div>

        <EditeurMarkdown
          libelle="Énoncé *"
          valeur={enonce}
          onChange={setEnonce}
          lignes={8}
        />

        <div className="grille-2-colonnes">
          <div className="champ">
            <label htmlFor="devoir-matiere">Matière - UUID (evaluations.matieres) *</label>
            <input
              id="devoir-matiere"
              type="text"
              value={matiereId}
              onChange={(e) => setMatiereId(e.target.value)}
              required
            />
          </div>
          <div className="champ">
            <label htmlFor="devoir-classe">Classe - UUID (scolarite.classes) *</label>
            <input
              id="devoir-classe"
              type="text"
              value={classeId}
              onChange={(e) => setClasseId(e.target.value)}
              required
            />
          </div>
        </div>

        <div className="grille-2-colonnes">
          <div className="champ">
            <label htmlFor="devoir-cours">Cours lié (facultatif)</label>
            <select
              id="devoir-cours"
              value={coursUuid}
              onChange={(e) => setCoursUuid(e.target.value)}
            >
              <option value="">- Aucun -</option>
              {(cours.data?.results ?? []).map((element) => (
                <option key={element.uuid} value={element.uuid}>
                  {element.titre}
                </option>
              ))}
            </select>
          </div>
          <div className="champ">
            <label htmlFor="devoir-date-limite">Date limite *</label>
            <input
              id="devoir-date-limite"
              type="datetime-local"
              value={dateLimite}
              onChange={(e) => setDateLimite(e.target.value)}
              required
            />
          </div>
        </div>

        <div className="grille-2-colonnes">
          <div className="champ">
            <label htmlFor="devoir-note-max">Note maximale</label>
            <input
              id="devoir-note-max"
              type="number"
              min="0"
              step="0.5"
              value={noteMax}
              onChange={(e) => setNoteMax(e.target.value)}
            />
          </div>
          <div className="champ">
            <label htmlFor="devoir-politique">Politique en cas de retard</label>
            <select
              id="devoir-politique"
              value={politiqueRetard}
              onChange={(e) => setPolitiqueRetard(e.target.value)}
            >
              <option value="penalite">
                Pénalité - dépôt tardif accepté, marqué « En retard »
              </option>
              <option value="blocage">
                Blocage - dépôt refusé après la date limite
              </option>
            </select>
          </div>
        </div>

        <div className="actions-ligne">
          <button
            type="submit"
            className="bouton bouton-primaire"
            disabled={mutation.isPending}
          >
            {mutation.isPending ? (
              <>
                <span className="roue" aria-hidden="true" /> Enregistrement…
              </>
            ) : edition ? (
              'Enregistrer les modifications'
            ) : (
              'Créer le devoir'
            )}
          </button>
          <button
            type="button"
            className="bouton bouton-secondaire"
            onClick={() => navigate(-1)}
          >
            Annuler
          </button>
        </div>

        {mutation.isError && (
          <p className="erreur-champ" role="alert">
            {messageErreur(mutation.error)}
          </p>
        )}
      </form>
    </>
  )
}
