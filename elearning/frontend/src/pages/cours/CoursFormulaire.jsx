import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router'

import { useCours, useCreationCours, useMajCours } from '../../api/cours.js'
import { messageErreur } from '../../api/client.js'
import { Chips } from '../../components/Chips.jsx'
import { EditeurMarkdown } from '../../components/EditeurMarkdown.jsx'
import { ErreurApi } from '../../components/ErreurApi.jsx'
import { Icone } from '../../components/Icone.jsx'
import { SqueletteTexte } from '../../components/Squelette.jsx'
import { useProfilStore } from '../../stores/profil.js'

/** En-tête de section numérotée (formulaires en étapes). */
function TitreSection({ numero, children, aide }) {
  return (
    <div className="element-tete" style={{ marginBottom: '0.75rem' }}>
      <span className="numero-etape">{numero}</span>
      <h2 style={{ margin: 0 }}>{children}</h2>
      {aide && <span className="texte-efface">{aide}</span>}
    </div>
  )
}

export function CoursFormulaire() {
  const { uuid } = useParams()
  const edition = Boolean(uuid)
  const navigate = useNavigate()

  const matiereProfil = useProfilStore((etat) => etat.matiereId)
  const classeProfil = useProfilStore((etat) => etat.classeId)
  const enseignantProfil = useProfilStore((etat) => etat.enseignantId)

  const [titre, setTitre] = useState('')
  const [description, setDescription] = useState('')
  const [matiereId, setMatiereId] = useState('')
  const [enseignantId, setEnseignantId] = useState('')
  const [coefficient, setCoefficient] = useState('1')
  const [volumeHoraire, setVolumeHoraire] = useState('')
  const [classes, setClasses] = useState([])
  const [nouvelleClasse, setNouvelleClasse] = useState('')
  const [statutVise, setStatutVise] = useState('brouillon')

  const cours = useCours(uuid, { enabled: edition })
  const creation = useCreationCours()
  const maj = useMajCours()

  useEffect(() => {
    if (cours.data) {
      setTitre(cours.data.titre)
      setDescription(cours.data.description ?? '')
      setMatiereId(cours.data.matiere_id ?? '')
      setEnseignantId(cours.data.enseignant_id ?? '')
      setCoefficient(String(cours.data.coefficient ?? 1))
      setVolumeHoraire(
        cours.data.volume_horaire ? String(cours.data.volume_horaire) : '',
      )
      setClasses(cours.data.classes_liees ?? [])
      setStatutVise(cours.data.statut === 'publie' ? 'publie' : 'brouillon')
    }
  }, [cours.data])

  useEffect(() => {
    if (!edition) {
      setMatiereId(matiereProfil)
      setEnseignantId(enseignantProfil)
    }
  }, [edition, matiereProfil, enseignantProfil])

  function ajouterClasse(valeur) {
    const propre = valeur.trim()
    if (!propre || classes.includes(propre)) return
    setClasses((etat) => [...etat, propre])
  }

  function retirerClasse(valeur) {
    setClasses((etat) => etat.filter((element) => element !== valeur))
  }

  function soumettre(evenement) {
    evenement.preventDefault()
    const donnees = {
      titre,
      description,
      statut: statutVise,
      matiere_id: matiereId,
      enseignant_id: enseignantId,
      coefficient: coefficient || null,
      volume_horaire: volumeHoraire || null,
      classes,
    }

    if (edition) {
      maj.mutate(
        { uuid, donnees },
        { onSuccess: () => navigate(`/cours/${uuid}`) },
      )
    } else {
      creation.mutate(donnees, {
        onSuccess: (nouveauCours) => navigate(`/cours/${nouveauCours.uuid}`),
      })
    }
  }

  if (edition && cours.isPending) {
    return (
      <>
        <h1>Chargement du cours…</h1>
        <SqueletteTexte lignes={6} />
      </>
    )
  }
  if (edition && cours.isError) {
    return <ErreurApi erreur={cours.error} reessayer={() => cours.refetch()} />
  }

  const mutation = edition ? maj : creation

  return (
    <>
      {/* Bandeau d'actions collant : Annuler | badge | Publier */}
      <div className="bandeau-sticky">
        <div className="titre-page">
          <div>
            <h1>{edition ? 'Modifier le cours' : 'Nouveau cours'}</h1>
            <span className="badge badge-brouillon">Brouillon auto</span>
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
              form="formulaire-cours"
              className="bouton bouton-primaire"
              onClick={() => setStatutVise('publie')}
              disabled={mutation.isPending}
            >
              <Icone nom="publish" />
              Publier
            </button>
          </div>
        </div>
      </div>

      <p className="texte-efface">
        La description accepte le Markdown : **gras**, listes, formules
        $$LaTeX$$, images et liens (un lien YouTube devient un lecteur intégré).
        Un cours en brouillon reste invisible des apprenants.
      </p>

      <form
        id="formulaire-cours"
        className="carte formulaire"
        onSubmit={soumettre}
      >
        <section>
          <TitreSection numero={1} aide="Identité du cours">
            Informations générales
          </TitreSection>

          <div className="champ">
            <label htmlFor="cours-titre">Titre *</label>
            <input
              id="cours-titre"
              type="text"
              value={titre}
              onChange={(e) => setTitre(e.target.value)}
              placeholder="Ex. Mathématiques - Chapitre 3 : les fractions"
              required
            />
          </div>

          <div className="grille-2-colonnes">
            <div className="champ">
              <label htmlFor="cours-matiere">
                Discipline - UUID (evaluations.matieres) *
              </label>
              <input
                id="cours-matiere"
                type="text"
                value={matiereId}
                onChange={(e) => setMatiereId(e.target.value)}
                placeholder={matiereProfil || 'UUID de la matière'}
                required
              />
            </div>
            <div className="champ">
              <label htmlFor="cours-enseignant">
                Enseignant auteur - UUID (rh.personnel)
              </label>
              <input
                id="cours-enseignant"
                type="text"
                value={enseignantId}
                onChange={(e) => setEnseignantId(e.target.value)}
                placeholder={enseignantProfil || 'UUID de l\u2019enseignant'}
              />
            </div>
          </div>

          <div className="grille-2-colonnes">
            <div className="champ">
              <label htmlFor="cours-coefficient">Coefficient</label>
              <input
                id="cours-coefficient"
                type="number"
                min="0"
                step="0.5"
                value={coefficient}
                onChange={(e) => setCoefficient(e.target.value)}
              />
              <p className="aide">Pondération du cours dans les évaluations.</p>
            </div>
            <div className="champ">
              <label htmlFor="cours-volume">Volume horaire (heures)</label>
              <input
                id="cours-volume"
                type="number"
                min="0"
                step="0.5"
                value={volumeHoraire}
                onChange={(e) => setVolumeHoraire(e.target.value)}
                placeholder="Ex. 4"
              />
            </div>
          </div>
        </section>

        <section className="section">
          <TitreSection numero={2} aide="Éditeur Markdown avec aperçu">
            Description & programme
          </TitreSection>

          <EditeurMarkdown
            libelle="Description"
            valeur={description}
            onChange={setDescription}
            lignes={6}
          />
        </section>

        <section className="section">
          <TitreSection
            numero={3}
            aide={`${classes.length} classe(s) ciblée(s)`}
          >
            Classes cibles
          </TitreSection>

          <div className="champ">
            <label htmlFor="cours-nouvelle-classe">
              Ajouter une classe - UUID (scolarite.classes)
            </label>
            <div className="selection-media-ligne">
              <input
                id="cours-nouvelle-classe"
                type="text"
                value={nouvelleClasse}
                onChange={(e) => setNouvelleClasse(e.target.value)}
                placeholder={classeProfil || 'UUID de la classe'}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    ajouterClasse(nouvelleClasse)
                    setNouvelleClasse('')
                  }
                }}
              />
              <button
                type="button"
                className="bouton bouton-secondaire bouton-compact"
                onClick={() => {
                  ajouterClasse(nouvelleClasse)
                  setNouvelleClasse('')
                }}
              >
                Ajouter
              </button>
            </div>
            <p className="aide">
              Les classes appartiennent au service scolarite : seuls des UUID
              sont référencés ici (règle 4 des frontières microservices).
            </p>
          </div>

          <Chips
            valeurs={classes}
            onRetirer={retirerClasse}
            ajouts={classeProfil ? [classeProfil] : []}
            onAjouter={ajouterClasse}
          />
        </section>

        <div className="actions-ligne section">
          <button
            type="submit"
            className="bouton bouton-vert"
            onClick={() => setStatutVise('publie')}
            disabled={mutation.isPending}
          >
            {mutation.isPending ? (
              <>
                <span className="roue" aria-hidden="true" /> Enregistrement…
              </>
            ) : edition ? (
              'Enregistrer et publier'
            ) : (
              'Créer et ajouter des leçons'
            )}
          </button>
          <button
            type="submit"
            className="bouton bouton-secondaire"
            onClick={() => setStatutVise('brouillon')}
            disabled={mutation.isPending}
          >
            Enregistrer brouillon
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
