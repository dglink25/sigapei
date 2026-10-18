import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'

import {
  useDevoir,
  useDevoirStatistiques,
  useDeposerSoumission,
  useNoterSoumission,
  useReporterSoumission,
  useSoumissionsDevoir,
} from '../../../services/elearning/devoirs.js'
import { messageErreur } from '../../../services/elearning/client.js'
import { BadgeRetard, BadgeStatut } from '../../../components/elearning/BadgeStatut.jsx'
import { CarteKpi } from '../../../components/elearning/CarteKpi.jsx'
import { HistogrammeNotes } from '../../../components/elearning/HistogrammeNotes.jsx'
import { Icone } from '../../../components/elearning/Icone.jsx'
import { ErreurApi } from '../../../components/elearning/ErreurApi.jsx'
import { Markdown } from '../../../components/elearning/Markdown.jsx'
import { Pagination } from '../../../components/elearning/Pagination.jsx'
import { SelectionMedia } from '../../../components/elearning/SelectionMedia.jsx'
import { SqueletteTableau, SqueletteTexte } from '../../../components/elearning/Squelette.jsx'
import {
  agitCommeApprenant,
  peutPublier,
  useProfilStore,
} from '../../../context/elearning/profil.js'
import {
  estDatePassee,
  formaterDateHeure,
  formaterNombre,
  uuidCourt,
} from '../../../lib/elearning/format.js'

/** Tranches de la distribution des notes (clés = action statistiques). */
const TRANCHES = [
  { cle: 'moins_de_10', libelle: '< 10', principale: true },
  { cle: 'de_10_a_12', libelle: '10–12' },
  { cle: 'de_12_a_14', libelle: '12–14' },
  { cle: 'de_14_a_16', libelle: '14–16' },
  { cle: 'de_16_a_20', libelle: '16–20' },
]

/** Dépôt d'une copie : apprenant concerné, déposant (apprenant ou parent)
 * et pièces jointes (médias déjà référencés dans /v1/medias/). */
function FormulaireDepot({ devoir }) {
  const apprenantProfil = useProfilStore((etat) => etat.apprenantId)
  const [apprenantId, setApprenantId] = useState('')
  const [soumisPar, setSoumisPar] = useState('')
  const [fichiers, setFichiers] = useState([null])
  const deposer = useDeposerSoumission()

  useEffect(() => {
    if (apprenantProfil) {
      setApprenantId(apprenantProfil)
      setSoumisPar((etat) => etat || apprenantProfil)
    }
  }, [apprenantProfil])

  function majFichier(index, valeur) {
    setFichiers((etat) => etat.map((element, position) => (
      position === index ? valeur : element
    )))
  }

  function ajouterFichier() {
    setFichiers((etat) => [...etat, null])
  }

  function retirerFichier(index) {
    setFichiers((etat) => etat.filter((_, position) => position !== index))
  }

  function soumettre(evenement) {
    evenement.preventDefault()
    deposer.mutate(
      {
        apprenant_id: apprenantId,
        soumis_par: soumisPar || apprenantId,
        fichiers: fichiers.filter(Boolean),
      },
      { onSuccess: () => setFichiers([null]) },
    )
  }

  return (
    <form className="carte formulaire" onSubmit={soumettre}>
      <h2>Déposer ma copie</h2>

      {estDatePassee(devoir.date_limite) && (
        <p
          className={`alerte ${
            devoir.politique_retard === 'blocage'
              ? 'alerte-erreur'
              : 'alerte-avertissement'
          }`}
        >
          {devoir.politique_retard === 'blocage'
            ? 'Date limite dépassée : tout nouveau dépôt sera refusé (politique « Blocage »).'
            : 'Date limite dépassée : le dépôt reste possible mais sera marqué « En retard ».'}
        </p>
      )}

      <div className="grille-2-colonnes">
        <div className="champ">
          <label htmlFor="depot-apprenant">
            Apprenant - UUID (scolarite.apprenants) *
          </label>
          <input
            id="depot-apprenant"
            type="text"
            value={apprenantId}
            onChange={(e) => setApprenantId(e.target.value)}
            required
          />
        </div>
        <div className="champ">
          <label htmlFor="depot-soumis-par">
            Déposé par - UUID (apprenant ou parent)
          </label>
          <input
            id="depot-soumis-par"
            type="text"
            value={soumisPar}
            onChange={(e) => setSoumisPar(e.target.value)}
            placeholder={apprenantId || 'UUID du déposant'}
          />
        </div>
      </div>

      {fichiers.map((fichier, index) => (
        <div key={index} className="selection-media-ligne-bloc">
          <SelectionMedia
            libelle={`Pièce jointe ${index + 1}`}
            valeur={fichier}
            onChange={(valeur) => majFichier(index, valeur)}
          />
          {fichiers.length > 1 && (
            <button
              type="button"
              className="bouton bouton-secondaire bouton-compact"
              onClick={() => retirerFichier(index)}
            >
              Retirer
            </button>
          )}
        </div>
      ))}

      <button
        type="button"
        className="bouton bouton-secondaire bouton-compact"
        onClick={ajouterFichier}
      >
        + Ajouter une pièce jointe
      </button>

      <div className="actions-ligne">
        <button
          type="submit"
          className="bouton bouton-primaire"
          disabled={deposer.isPending}
        >
          {deposer.isPending ? (
            <>
              <span className="roue" aria-hidden="true" /> Dépôt en cours…
            </>
          ) : (
            'Déposer la soumission'
          )}
        </button>
      </div>

      {deposer.isError && (
        <p className="erreur-champ" role="alert">
          {messageErreur(deposer.error)}
        </p>
      )}
    </form>
  )
}

/** Ligne du registre : élève, statut, dépôt, fichiers, notation et report. */
function LigneSoumission({ soumission, noteMax }) {
  const [note, setNote] = useState(soumission.note ?? '')
  const [commentaire, setCommentaire] = useState(soumission.commentaire ?? '')
  const noter = useNoterSoumission()
  const reporter = useReporterSoumission()

  function enregistrerNote(evenement) {
    evenement.preventDefault()
    if (note === '') return
    noter.mutate({ uuid: soumission.uuid, note, commentaire })
  }

  const initiales = (soumission.apprenant_id ?? '??')
    .slice(0, 2)
    .toUpperCase()

  return (
    <tr>
      <td>
        <span className="champ-inline">
          <span className="avatar" title={soumission.apprenant_id}>
            {initiales}
          </span>
          <span title={soumission.apprenant_id} className="police-mono">
            {uuidCourt(soumission.apprenant_id)}
          </span>
        </span>
      </td>
      <td>
        <div className="actions-ligne">
          {soumission.note === null ? (
            <span className="badge badge-soumis">À noter</span>
          ) : (
            <span className="badge badge-valide">Notée</span>
          )}
          {soumission.en_retard && <BadgeRetard />}
        </div>
      </td>
      <td>{formaterDateHeure(soumission.date_depot)}</td>
      <td>
        {(soumission.fichiers_detail ?? []).length === 0
          ? '-'
          : (soumission.fichiers_detail ?? []).map((fichier) => (
              <span key={fichier.uuid} style={{ display: 'block' }}>
                {fichier.media?.url_cloudinary ? (
                  <a
                    href={fichier.media.url_cloudinary}
                    target="_blank"
                    rel="noreferrer noopener"
                  >
                    {fichier.media.nom_fichier || 'Pièce jointe'}
                  </a>
                ) : (
                  (fichier.media?.nom_fichier || 'Pièce jointe')
                )}
              </span>
            ))}
      </td>
      <td>
        {soumission.note === null
          ? '-'
          : `${formaterNombre(soumission.note)} / ${formaterNombre(noteMax)}`}
        {soumission.note_reportee && (
          <span className="badge badge-valide">Reportée</span>
        )}
      </td>
      <td>
        <form className="actions-ligne" onSubmit={enregistrerNote}>
          <span className="champ-inline">
            <input
              type="number"
              step="0.25"
              min="0"
              max={noteMax}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Note"
              aria-label={`Note sur ${noteMax}`}
            />
          </span>
          <input
            type="text"
            value={commentaire}
            onChange={(e) => setCommentaire(e.target.value)}
            placeholder="Annotation"
            aria-label="Annotation enseignant"
          />
          <button
            type="submit"
            className="bouton bouton-vert bouton-compact"
            disabled={noter.isPending}
          >
            {noter.isPending ? '…' : 'Noter'}
          </button>
          <button
            type="button"
            className="bouton bouton-secondaire bouton-compact"
            onClick={() => reporter.mutate(soumission.uuid)}
            disabled={
              !soumission.note ||
              soumission.note_reportee ||
              reporter.isPending
            }
            title="Reporter la note vers evaluations.notes"
          >
            {reporter.isPending ? '…' : 'Reporter'}
          </button>
        </form>
        {(noter.isError || reporter.isError) && (
          <p className="erreur-champ" role="alert">
            {messageErreur(noter.isError ? noter.error : reporter.error)}
          </p>
        )}
      </td>
    </tr>
  )
}

/**
 * Espace enseignant : registre des copies (colonne principale) et panneau
 * latéral (barème, distribution des notes, clôture & transmission).
 * Les onglets et la recherche s'appliquent à la page affichée.
 */
function SectionEnseignant({ devoir, stats }) {
  const [page, setPage] = useState(1)
  const [onglet, setOnglet] = useState('toutes')
  const [recherche, setRecherche] = useState('')
  const soumissions = useSoumissionsDevoir(devoir.uuid, { page })
  const reporter = useReporterSoumission()

  const lignes = soumissions.data?.results ?? []
  const compteurs = lignes.reduce(
    (total, soumission) => {
      if (soumission.note === null) total.a_note += 1
      else total.notees += 1
      if (soumission.en_retard) total.retard += 1
      return total
    },
    { a_note: 0, notees: 0, retard: 0 },
  )

  const onglets = [
    { valeur: 'toutes', libelle: 'Toutes', compteur: lignes.length },
    {
      valeur: 'a_note',
      libelle: 'À noter',
      compteur: compteurs.a_note,
      compteurVariante: 'or',
    },
    { valeur: 'notees', libelle: 'Notées', compteur: compteurs.notees },
    {
      valeur: 'retard',
      libelle: 'En retard',
      compteur: compteurs.retard,
      compteurVariante: 'rouge',
    },
  ]

  const visibles = lignes.filter((soumission) => {
    const ongletOk =
      onglet === 'toutes' ||
      (onglet === 'a_note' && soumission.note === null) ||
      (onglet === 'notees' && soumission.note !== null) ||
      (onglet === 'retard' && soumission.en_retard)
    const rechercheOk =
      !recherche ||
      (soumission.apprenant_id ?? '')
        .toLowerCase()
        .includes(recherche.trim().toLowerCase())
    return ongletOk && rechercheOk
  })

  const aReporter = lignes.filter(
    (soumission) => soumission.note !== null && !soumission.note_reportee,
  )

  function reporterToutes() {
    aReporter.forEach((soumission) => reporter.mutate(soumission.uuid))
  }

  const distribution = stats?.distribution ?? {}
  const tranches = TRANCHES.map((tranche) => ({
    libelle: tranche.libelle,
    nombre: distribution[tranche.cle] ?? 0,
    principale: tranche.principale,
  }))

  return (
    <div className="colonnes-detail">
      {/* Registre des copies */}
      <section className="carte">
        <div className="titre-page">
          <h2>Registre des copies</h2>
          <div className="recherche-champ" style={{ maxWidth: 260 }}>
            <Icone nom="search" />
            <input
              type="search"
              value={recherche}
              onChange={(evenement) => setRecherche(evenement.target.value)}
              placeholder="Rechercher un apprenant (UUID)…"
              aria-label="Rechercher un apprenant"
            />
          </div>
        </div>

        <div className="onglets">
          {onglets.map((element) => (
            <button
              key={element.valeur}
              type="button"
              className={
                element.valeur === onglet ? 'onglet onglet-actif' : 'onglet'
              }
              onClick={() => setOnglet(element.valeur)}
            >
              {element.libelle}
              <span
                className={
                  element.compteurVariante
                    ? `compteur compteur-${element.compteurVariante}`
                    : 'compteur'
                }
              >
                {element.compteur}
              </span>
            </button>
          ))}
        </div>

        {soumissions.isPending ? (
          <SqueletteTableau colonnes={6} />
        ) : soumissions.isError ? (
          <ErreurApi
            erreur={soumissions.error}
            reessayer={() => soumissions.refetch()}
          />
        ) : visibles.length === 0 ? (
          <p className="texte-efface">Aucune copie dans cette vue.</p>
        ) : (
          <div className="tableau-defilant">
            <table className="tableau">
              <thead>
                <tr>
                  <th>Élève</th>
                  <th>Statut</th>
                  <th>Dépôt</th>
                  <th>Fichiers</th>
                  <th>Note</th>
                  <th>Notation / report</th>
                </tr>
              </thead>
              <tbody>
                {visibles.map((soumission) => (
                  <LigneSoumission
                    key={soumission.uuid}
                    soumission={soumission}
                    noteMax={devoir.note_max}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}

        <Pagination
          page={page}
          total={soumissions.data?.count ?? 0}
          onPageChange={setPage}
        />
      </section>

      {/* Panneau latéral */}
      <aside>
        <section className="carte">
          <h2>Barème & notes</h2>
          <div className="stat-mini">
            <div className="carte">
              <span className="stat-valeur">
                / {formaterNombre(devoir.note_max)}
              </span>
              <span className="stat-libelle">Barème</span>
            </div>
            <div className="carte">
              <span className="stat-valeur">
                {stats ? formaterNombre(stats.note_minimale) : '-'}
              </span>
              <span className="stat-libelle">Note minimale</span>
            </div>
            <div className="carte">
              <span className="stat-valeur">
                {stats ? formaterNombre(stats.note_mediane) : '-'}
              </span>
              <span className="stat-libelle">Médiane</span>
            </div>
          </div>

          <h3 className="section">Distribution des notes</h3>
          {stats ? (
            <HistogrammeNotes tranches={tranches} />
          ) : (
            <p className="texte-efface">
              Statistiques indisponibles tant qu'aucune copie n'est notée.
            </p>
          )}
        </section>

        <section className="carte carte-creme section">
          <h2>Clôture & Transmission</h2>
          <p className="texte-efface">
            {devoir.politique_retard === 'blocage'
              ? 'Politique « Blocage » : aucun dépôt après la date limite.'
              : 'Politique « Pénalité » : dépôts tardifs acceptés, marqués « En retard ».'}{' '}
            Clôture le {formaterDateHeure(devoir.date_limite)}.
          </p>
          <p className="texte-efface">
            {stats
              ? `${stats.copies_notees} copie(s) notée(s) - ${stats.notes_reportees} note(s) déjà transmise(s) à evaluations.notes.`
              : 'Transmission copie par copie depuis le registre.'}
          </p>
          <button
            type="button"
            className="bouton bouton-primaire"
            onClick={reporterToutes}
            disabled={aReporter.length === 0 || reporter.isPending}
            title="Reporte les notes notées non transmises de la page affichée"
          >
            <Icone nom="send" />
            Reporter les notes ({aReporter.length})
          </button>
          <p className="aide">
            Le service evaluations doit être configuré (EVALUATIONS_API_URL),
            sinon le report renvoie une erreur 503.
          </p>
        </section>
      </aside>
    </div>
  )
}

/** Dépôts de l'apprenant courant sur ce devoir, avec sa note éventuelle. */
function MesSoumissions({ uuidDevoir, apprenantId }) {
  const soumissions = useSoumissionsDevoir(uuidDevoir, {
    apprenant_id: apprenantId,
  })

  return (
    <section className="section">
      <h2>Mes dépôts</h2>
      {soumissions.isPending ? (
        <SqueletteTexte lignes={3} />
      ) : soumissions.isError ? (
        <ErreurApi
          erreur={soumissions.error}
          reessayer={() => soumissions.refetch()}
        />
      ) : (soumissions.data?.results ?? []).length === 0 ? (
        <p className="texte-efface">
          Aucun dépôt enregistré pour cet apprenant.
        </p>
      ) : (
        <div className="liste-elements">
          {(soumissions.data?.results ?? []).map((soumission) => (
            <article key={soumission.uuid} className="element">
              <div className="element-tete">
                <h3>Dépôt du {formaterDateHeure(soumission.date_depot)}</h3>
                {soumission.en_retard && <BadgeRetard />}
                {soumission.note_reportee && (
                  <span className="badge badge-valide">Note reportée</span>
                )}
              </div>
              <p>
                {soumission.note === null
                  ? 'En attente de correction.'
                  : `Note : ${formaterNombre(soumission.note)}`}
              </p>
              {soumission.commentaire && <p>{soumission.commentaire}</p>}
              {(soumission.fichiers_detail ?? []).length > 0 && (
                <div className="carte-pied">
                  {(soumission.fichiers_detail ?? []).map((fichier) => (
                    <span key={fichier.uuid}>
                      {fichier.media?.url_cloudinary ? (
                        <a
                          href={fichier.media.url_cloudinary}
                          target="_blank"
                          rel="noreferrer noopener"
                        >
                          {fichier.media.nom_fichier || 'Pièce jointe'}
                        </a>
                      ) : (
                        <>
                          {fichier.media?.nom_fichier || 'Pièce jointe'}
                          {' '}(S3/MinIO : URL signée requise)
                        </>
                      )}
                    </span>
                  ))}
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  )
}

export function DevoirDetail() {
  const { uuid } = useParams()
  const role = useProfilStore((etat) => etat.role)
  const apprenantId = useProfilStore((etat) => etat.apprenantId)
  const devoir = useDevoir(uuid)
  const stats = useDevoirStatistiques(uuid)

  if (devoir.isPending) {
    return (
      <>
        <h1>Chargement du devoir…</h1>
        <SqueletteTexte lignes={8} />
      </>
    )
  }
  if (devoir.isError) {
    return <ErreurApi erreur={devoir.error} reessayer={() => devoir.refetch()} />
  }

  const donnees = devoir.data
  const enRetard = estDatePassee(donnees.date_limite)
  const statistiques = stats.data ?? null

  return (
    <>
      <nav className="fil-ariane" aria-label="Fil d'Ariane">
        <Link to="/elearning/">Tableau de Bord</Link>
        <span className="separateur" aria-hidden="true">/</span>
        <Link to="/elearning/devoirs">Devoirs & Évaluations</Link>
        <span className="separateur" aria-hidden="true">/</span>
        <span aria-current="page">{donnees.titre}</span>
      </nav>

      <div className="titre-page">
        <div>
          <h1>{donnees.titre}</h1>
          <div className="actions-ligne">
            <span className="badge badge-soumis">Devoir</span>
            <span className="badge badge-texte">
              Matière {uuidCourt(donnees.matiere_id)}
            </span>
            <span className="badge badge-texte">
              Classe {uuidCourt(donnees.classe_id)}
            </span>
            <BadgeStatut valeur={donnees.politique_retard} />
            {enRetard && <BadgeRetard />}
          </div>
        </div>
        {peutPublier(role) && (
          <Link
            to={`/devoirs/${uuid}/modifier`}
            className="bouton bouton-secondaire"
          >
            <Icone nom="edit" />
            Modifier
          </Link>
        )}
      </div>

      <p className="texte-efface">
        Barème /{formaterNombre(donnees.note_max)} - clôture le{' '}
        {formaterDateHeure(donnees.date_limite)} -{' '}
        {donnees.politique_retard === 'blocage'
          ? 'aucun dépôt accepté après cette date.'
          : 'les dépôts tardifs sont acceptés et marqués « En retard ».'}
      </p>

      {peutPublier(role) && statistiques && (
        <div className="kpi-grille">
          <CarteKpi
            icone="inbox"
            valeur={statistiques.total_soumissions}
            libelle="Copies reçues"
          />
          <CarteKpi
            icone="task_alt"
            valeur={statistiques.copies_notees}
            libelle="Copies notées"
          />
          <CarteKpi
            icone="grading"
            variante="or"
            valeur={statistiques.a_corriger}
            libelle="À corriger"
          />
          <CarteKpi
            icone="schedule"
            variante="rouge"
            valeur={statistiques.soumissions_en_retard}
            libelle="Dépôts en retard"
          />
          <CarteKpi
            icone="insights"
            valeur={
              statistiques.moyenne === null
                ? '-'
                : formaterNombre(statistiques.moyenne)
            }
            libelle={`Moyenne (min ${formaterNombre(
              statistiques.note_minimale,
            )} · méd ${formaterNombre(
              statistiques.note_mediane,
            )} · max ${formaterNombre(statistiques.note_maximale)})`}
          />
        </div>
      )}

      <section className="section">
        <h2>Énoncé</h2>
        <Markdown contenu={donnees.enonce} />
      </section>

      {agitCommeApprenant(role) && (
        <section className="section">
          <FormulaireDepot devoir={donnees} />
          {apprenantId && (
            <MesSoumissions uuidDevoir={uuid} apprenantId={apprenantId} />
          )}
        </section>
      )}

      {peutPublier(role) && (
        <SectionEnseignant devoir={donnees} stats={statistiques} />
      )}
    </>
  )
}
