import { useCallback, useEffect, useMemo, useState } from 'react'
import { ClipboardList, Lock, PenLine, Plus, RefreshCw, Save, Undo2 } from 'lucide-react'
import { useNotify } from '../../context/commun/NotifyContext'
import { evaluationsService } from '../../services/evaluations/evaluations.service'
import { STATUTS_NOTE, TYPES_EVALUATION, formatDate, formatNombre, libelleType, nomComplet } from '../../config/evaluations/constantes'
import Drawer from '../administration/Drawer'
import ConfirmDialog from '../commun/ConfirmDialog'
import { Badge, Champ, Chargement, EtatVide, aria, erreursChamps, useDonnees } from './communs'
import { libelleClasse, libellePeriode, periodeParDefaut, useClassesAccessibles, usePeriodes } from './referentiels'

const NOTE = /^\d{1,3}([.,]\d{1,2})?$/
const norm = (v) => String(v ?? '').trim().replace(',', '.')
const aujourdhui = () => new Date().toISOString().slice(0, 10)

/**
 * Notes d'une classe pour une période (grille façon tableur).
 *  - enseignant : crée ses évaluations, saisit, enregistre, puis verrouille sa saisie ;
 *  - administrateur : consulte ; corrige une note avec un motif (tracé).
 * Le service contrôle les droits (affectation, période ouverte, version de la note) : l'interface ne fait qu'aider.
 */
export default function PanneauNotes({ role, filtres, setFiltres }) {
  const notify = useNotify()
  const estEnseignant = role === 'enseignant'
  const ref = useClassesAccessibles(role, notify.fromError)
  const classe = ref.classes.find((c) => c.uuid === filtres.classe) ?? null
  const { periodes, chargement: chargementPeriodes } = usePeriodes(classe?.cycle, notify.fromError)
  const periode = periodes.find((p) => p.uuid === filtres.periode) ?? null

  const matieresAdmin = useDonnees(() => evaluationsService.matieres({ actives: true }), [], { actif: !estEnseignant, initial: { elements: [] } })
  const matieres = useMemo(() => {
    if (!estEnseignant) return matieresAdmin.donnees?.elements ?? []
    const vues = new Map()
    ref.affectations.filter((a) => a.classe_uuid === filtres.classe).forEach((a) => vues.set(a.matiere.uuid, a.matiere))
    return [...vues.values()].sort((a, b) => a.nom.localeCompare(b.nom, 'fr'))
  }, [estEnseignant, matieresAdmin.donnees, ref.affectations, filtres.classe])

  // Sélections par défaut : première classe, période ouverte, matière unique.
  useEffect(() => {
    if (!filtres.classe && ref.classes.length === 1) setFiltres({ classe: ref.classes[0].uuid })
  }, [ref.classes]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (filtres.classe && !chargementPeriodes && !periodes.some((p) => p.uuid === filtres.periode)) {
      const p = periodeParDefaut(periodes)
      if (p) setFiltres({ periode: p.uuid })
    }
  }, [periodes, chargementPeriodes, filtres.classe]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (estEnseignant && filtres.classe && matieres.length && !matieres.some((m) => m.uuid === filtres.matiere)) setFiltres({ matiere: matieres[0].uuid })
  }, [matieres]) // eslint-disable-line react-hooks/exhaustive-deps

  const pret = !!(filtres.classe && periode && (!estEnseignant || filtres.matiere))
  const grille = useDonnees(
    () => evaluationsService.grilleNotes(filtres.classe, { periode_uuid: filtres.periode, matiere_uuid: filtres.matiere || undefined }),
    [filtres.classe, filtres.periode, filtres.matiere],
    { actif: pret, onErreur: notify.fromError },
  )
  const regles = useDonnees(async () => {
    try { return await evaluationsService.regles(periode.cycle) } catch { return null }
  }, [periode?.cycle], { actif: !!periode })
  const competences = regles.donnees?.grille?.type_notation === 'competences'
  const niveaux = regles.donnees?.grille?.niveaux_competence ?? []

  return (
    <section className="ev" aria-labelledby="ev-titre-notes">
      <div className="ev-entete">
        <div>
          <h2 className="ap-page-title" id="ev-titre-notes">{estEnseignant ? 'Saisie des notes' : 'Notes des classes'}</h2>
          <p className="ap-page-sub">
            {estEnseignant
              ? 'Créez vos évaluations, saisissez les notes puis verrouillez la saisie quand elle est complète.'
              : 'Consultation des notes. Une note se corrige avec un motif, conservé dans l\'historique.'}
          </p>
        </div>
      </div>

      <div className="ap-card ev-filtres">
        <Champ id="ev-n-classe" label="Classe" requis>
          <select {...aria('ev-n-classe')} className="ap-input" value={filtres.classe} disabled={ref.chargement}
            onChange={(e) => setFiltres({ classe: e.target.value, periode: '', matiere: '' })}>
            <option value="">{ref.chargement ? 'Chargement…' : 'Choisir une classe'}</option>
            {ref.classes.map((c) => <option key={c.uuid} value={c.uuid}>{libelleClasse(c)}</option>)}
          </select>
        </Champ>
        <Champ id="ev-n-periode" label="Période" requis>
          <select {...aria('ev-n-periode')} className="ap-input" value={periode ? filtres.periode : ''} disabled={!filtres.classe || chargementPeriodes}
            onChange={(e) => setFiltres({ periode: e.target.value })}>
            <option value="">Choisir une période</option>
            {periodes.map((p) => <option key={p.uuid} value={p.uuid}>{libellePeriode(p, !classe?.cycle)}{p.statut !== 'ouverte' ? ' (clôturée)' : ''}</option>)}
          </select>
        </Champ>
        <Champ id="ev-n-matiere" label="Matière" requis={estEnseignant}>
          <select {...aria('ev-n-matiere')} className="ap-input" value={filtres.matiere} disabled={!filtres.classe}
            onChange={(e) => setFiltres({ matiere: e.target.value })}>
            {!estEnseignant && <option value="">Toutes les matières</option>}
            {estEnseignant && matieres.length === 0 && <option value="">Aucune matière affectée</option>}
            {matieres.map((m) => <option key={m.uuid} value={m.uuid}>{m.nom}</option>)}
          </select>
        </Champ>
      </div>

      {ref.nomsIndisponibles && (
        <p className="ap-hint">Certains noms de classe ne sont pas encore transmis par le service Établissements : une référence courte est affichée à la place.</p>
      )}

      {!ref.chargement && ref.classes.length === 0 ? (
        <EtatVide icone={ClipboardList} titre={estEnseignant ? 'Aucune affectation' : 'Aucune classe'}
          texte={estEnseignant ? 'Aucune classe ne vous est affectée pour le moment. Rapprochez-vous de l\'administration.' : 'Les classes de l\'établissement n\'ont pas pu être chargées.'} />
      ) : !pret ? (
        <EtatVide icone={ClipboardList} titre="Choisissez une classe et une période" texte={periodes.length === 0 && filtres.classe && !chargementPeriodes ? 'Aucune période n\'est créée pour ce cycle : l\'administration doit d\'abord la créer.' : undefined} />
      ) : grille.chargement && !grille.donnees ? <Chargement label="Chargement des notes…" /> : grille.donnees ? (
        <GrilleNotes
          key={`${filtres.classe}-${filtres.periode}-${filtres.matiere}`}
          donnees={grille.donnees}
          estEnseignant={estEnseignant}
          competences={competences}
          niveaux={niveaux}
          classe={classe}
          periode={periode}
          matiere={matieres.find((m) => m.uuid === filtres.matiere) ?? null}
          rechargement={grille.chargement}
          recharger={grille.recharger}
        />
      ) : (
        <EtatVide icone={ClipboardList} titre="Notes indisponibles" texte="Les notes n'ont pas pu être chargées.">
          <button type="button" className="ap-btn ap-btn--sm" onClick={grille.recharger}><RefreshCw size={14} aria-hidden="true" /> Réessayer</button>
        </EtatVide>
      )}
    </section>
  )
}

function GrilleNotes({ donnees, estEnseignant, competences, niveaux, classe, periode, matiere, rechargement, recharger }) {
  const notify = useNotify()
  const { apprenants, evaluations } = donnees
  const ouverte = donnees.periode?.statut === 'ouverte'
  const [modifs, setModifs] = useState({}) // { [evaluation]: { [apprenant]: { statut, valeur, niveau_competence } } }
  const [envoi, setEnvoi] = useState(false)
  const [creation, setCreation] = useState(false)
  const [aVerrouiller, setAVerrouiller] = useState(null)
  const [correction, setCorrection] = useState(null)

  const notesPar = useMemo(() => {
    const m = {}
    evaluations.forEach((ev) => { m[ev.uuid] = Object.fromEntries(ev.notes.map((n) => [n.apprenant_uuid, n])) })
    return m
  }, [evaluations])

  const nbModifs = Object.values(modifs).reduce((s, x) => s + Object.keys(x).length, 0)

  // Changements non enregistrés : avertissement avant de quitter la page.
  useEffect(() => {
    if (!nbModifs) return undefined
    const avertir = (e) => { e.preventDefault(); e.returnValue = '' }
    window.addEventListener('beforeunload', avertir)
    return () => window.removeEventListener('beforeunload', avertir)
  }, [nbModifs])

  const valeurCellule = (ev, a) => modifs[ev.uuid]?.[a.uuid] ?? (() => {
    const n = notesPar[ev.uuid]?.[a.uuid]
    return { statut: n?.statut ?? 'saisie', valeur: n?.valeur != null ? String(Number(n.valeur)) : '', niveau_competence: n?.niveau_competence ?? '' }
  })()

  const erreurCellule = (ev, v) => {
    if (v.statut !== 'saisie') return null
    if (competences) return null
    if (v.valeur === '') return null
    if (!NOTE.test(v.valeur) || Number(norm(v.valeur)) > Number(ev.note_sur)) return `Note de 0 à ${formatNombre(ev.note_sur)}, deux décimales au plus.`
    return null
  }

  const modifier = (ev, a, champ, valeur) => setModifs((m) => {
    const actuel = { ...valeurCellule(ev, a), [champ]: valeur }
    if (champ === 'statut' && valeur !== 'saisie') { actuel.valeur = ''; actuel.niveau_competence = '' }
    const n = notesPar[ev.uuid]?.[a.uuid]
    const origine = { statut: n?.statut ?? 'saisie', valeur: n?.valeur != null ? String(Number(n.valeur)) : '', niveau_competence: n?.niveau_competence ?? '' }
    const identique = actuel.statut === origine.statut && norm(actuel.valeur) === norm(origine.valeur) && actuel.niveau_competence === origine.niveau_competence
    const col = { ...(m[ev.uuid] ?? {}) }
    if (identique) delete col[a.uuid]
    else col[a.uuid] = actuel
    const suivant = { ...m, [ev.uuid]: col }
    if (!Object.keys(col).length) delete suivant[ev.uuid]
    return suivant
  })

  const enregistrer = async () => {
    const invalides = []
    const lots = []
    Object.entries(modifs).forEach(([evUuid, col]) => {
      const ev = evaluations.find((x) => x.uuid === evUuid)
      const notes = []
      Object.entries(col).forEach(([aUuid, v]) => {
        if (erreurCellule(ev, v)) { invalides.push(aUuid); return }
        const vide = v.statut === 'saisie' && (competences ? !v.niveau_competence : v.valeur === '')
        if (vide) return // une case vidée n'efface pas une note : la correction passe par l'administration
        const existante = notesPar[evUuid]?.[aUuid]
        notes.push({
          apprenant_uuid: aUuid,
          statut: v.statut,
          valeur: v.statut === 'saisie' && !competences ? norm(v.valeur) : null,
          niveau_competence: v.statut === 'saisie' && competences ? v.niveau_competence : null,
          ...(existante ? { version: existante.version } : {}),
        })
      })
      if (notes.length) lots.push({ ev, notes })
    })
    if (invalides.length) {
      notify.warning('Notes à vérifier', 'Certaines notes sont hors barème : corrigez les cases en rouge avant d\'enregistrer.')
      return
    }
    if (!lots.length) {
      notify.info('Rien à enregistrer', 'Une case vidée ne supprime pas une note déjà enregistrée.')
      setModifs({})
      return
    }
    setEnvoi(true)
    let enregistrees = 0
    try {
      for (const { ev, notes } of lots) {
        for (let i = 0; i < notes.length; i += 200) {
          await evaluationsService.saisirNotes(ev.uuid, notes.slice(i, i + 200))
          enregistrees += Math.min(200, notes.length - i)
        }
      }
      notify.success('Notes enregistrées', `${enregistrees} note${enregistrees > 1 ? 's' : ''} enregistrée${enregistrees > 1 ? 's' : ''}.`)
      setModifs({})
    } catch (err) {
      notify.fromError(err)
      if (err?.status === 409) setModifs({}) // note modifiée entre-temps : on repart des valeurs à jour
    } finally {
      setEnvoi(false)
      recharger()
    }
  }

  const verrouiller = async () => {
    setEnvoi(true)
    try {
      await evaluationsService.verrouiller(aVerrouiller.uuid)
      notify.success('Saisie verrouillée', aVerrouiller.libelle)
      setAVerrouiller(null)
      recharger()
    } catch (err) {
      notify.fromError(err)
    } finally {
      setEnvoi(false)
    }
  }

  /** Entrée : case suivante de la même colonne (saisie rapide au clavier). */
  const surTouche = (e, colonne, ligne) => {
    if (e.key !== 'Enter') return
    e.preventDefault()
    document.querySelector(`[data-ev-cell="${colonne}-${ligne + 1}"]`)?.focus()
  }

  const peutSaisir = (ev) => estEnseignant && ouverte && !ev.saisie_verrouillee

  return (
    <>
      <div className="ev-entete">
        <p className="ap-page-sub" style={{ margin: 0 }}>
          {libelleClasse(classe)} - {libellePeriode(periode)} - {apprenants.length} apprenant{apprenants.length > 1 ? 's' : ''}
          {!ouverte && <> - <Badge ton="neutral">Période clôturée</Badge></>}
        </p>
        <div className="ev-actions">
          <button type="button" className="ap-btn ap-btn--ghost ap-btn--sm" onClick={recharger} disabled={rechargement || envoi || nbModifs > 0}
            title={nbModifs ? 'Enregistrez ou annulez vos changements avant d\'actualiser.' : undefined}>
            <RefreshCw size={15} className={rechargement ? 'ap-spin' : ''} aria-hidden="true" /> Actualiser
          </button>
          {estEnseignant && ouverte && matiere && (
            <button type="button" className="ap-btn ap-btn--sm" onClick={() => setCreation(true)}><Plus size={15} aria-hidden="true" /> Nouvelle évaluation</button>
          )}
        </div>
      </div>

      {evaluations.length === 0 ? (
        <EtatVide icone={ClipboardList} titre="Aucune évaluation" texte={estEnseignant ? 'Créez une évaluation (interrogation, devoir, composition) pour saisir des notes.' : 'Aucune évaluation n\'a encore été créée pour cette sélection.'} />
      ) : apprenants.length === 0 ? (
        <EtatVide icone={ClipboardList} titre="Aucun apprenant" texte="Aucun apprenant actif n'est inscrit dans cette classe." />
      ) : (
        <div className="ap-card ap-card--flush">
          <div className="ev-table-wrap ev-grille">
            <table className="ap-table">
              <caption className="ap-sr">Notes par apprenant et par évaluation</caption>
              <thead>
                <tr>
                  <th scope="col" className="ev-col-fixe">Apprenant</th>
                  {evaluations.map((ev) => (
                    <th key={ev.uuid} scope="col">
                      <span className="ev-th-eval">
                        <b>{ev.libelle}</b>
                        <span>{libelleType(ev.type)} - {formatDate(ev.date_evaluation)}</span>
                        <span>{competences ? 'Compétences' : `Sur ${formatNombre(ev.note_sur)}`} - coef. {formatNombre(ev.coefficient)}{!matiere ? ` - ${ev.matiere.nom}` : ''}</span>
                        {ev.saisie_verrouillee
                          ? <span><Lock size={12} aria-hidden="true" /> Verrouillée</span>
                          : peutSaisir(ev) && (
                            <button type="button" className="ap-btn ap-btn--ghost ap-btn--sm" style={{ justifySelf: 'start' }} disabled={!!modifs[ev.uuid]}
                              title={modifs[ev.uuid] ? 'Enregistrez d\'abord les notes de cette évaluation.' : undefined}
                              onClick={() => setAVerrouiller(ev)}>
                              <Lock size={13} aria-hidden="true" /> Verrouiller
                            </button>
                          )}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {apprenants.map((a, ligne) => (
                  <tr key={a.uuid}>
                    <th scope="row" className="ev-col-fixe">
                      {nomComplet(a)}
                      {a.matricule && <small>{a.matricule}</small>}
                    </th>
                    {evaluations.map((ev, colonne) => {
                      const v = valeurCellule(ev, a)
                      const note = notesPar[ev.uuid]?.[a.uuid]
                      const erreur = erreurCellule(ev, v)
                      if (!peutSaisir(ev)) {
                        const texte = !note ? '-' : note.statut !== 'saisie' ? STATUTS_NOTE.find((s) => s.code === note.statut)?.court : (competences ? note.niveau_competence : formatNombre(note.valeur))
                        return (
                          <td key={ev.uuid} className="ev-centre">
                            {!estEnseignant && note ? (
                              <button type="button" className="ev-pastille" title="Corriger cette note" onClick={() => setCorrection({ note, ev, apprenant: a })}>
                                {texte} <PenLine size={12} aria-hidden="true" />
                              </button>
                            ) : texte}
                          </td>
                        )
                      }
                      return (
                        <td key={ev.uuid}>
                          <div className={`ev-cellule${modifs[ev.uuid]?.[a.uuid] ? ' is-modifiee' : ''}${erreur ? ' is-erreur' : ''}`}>
                            <select className="ap-input" aria-label={`Statut : ${nomComplet(a)}, ${ev.libelle}`} value={v.statut}
                              onChange={(e) => modifier(ev, a, 'statut', e.target.value)}>
                              {STATUTS_NOTE.map((s) => <option key={s.code} value={s.code}>{s.court || 'Note'}</option>)}
                            </select>
                            {v.statut === 'saisie' && (competences ? (
                              <select className="ap-input" data-ev-cell={`${colonne}-${ligne}`} aria-label={`Niveau : ${nomComplet(a)}, ${ev.libelle}`}
                                value={v.niveau_competence} onChange={(e) => modifier(ev, a, 'niveau_competence', e.target.value)} onKeyDown={(e) => surTouche(e, colonne, ligne)}>
                                <option value="">-</option>
                                {niveaux.map((n) => <option key={n.code} value={n.code}>{n.code}</option>)}
                              </select>
                            ) : (
                              <input className="ap-input ev-note" data-ev-cell={`${colonne}-${ligne}`} inputMode="decimal" maxLength={6}
                                aria-label={`Note sur ${formatNombre(ev.note_sur)} : ${nomComplet(a)}, ${ev.libelle}`} aria-invalid={erreur ? true : undefined}
                                title={erreur ?? undefined} value={v.valeur} placeholder="-"
                                onChange={(e) => modifier(ev, a, 'valeur', e.target.value)} onKeyDown={(e) => surTouche(e, colonne, ligne)} />
                            ))}
                          </div>
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {estEnseignant && nbModifs > 0 && (
            <div className="ev-barre-sauvegarde" role="region" aria-label="Changements non enregistrés">
              <span>{nbModifs} changement{nbModifs > 1 ? 's' : ''} non enregistré{nbModifs > 1 ? 's' : ''}</span>
              <div className="ev-actions">
                <button type="button" className="ap-btn ap-btn--ghost ap-btn--sm" onClick={() => setModifs({})} disabled={envoi}><Undo2 size={14} aria-hidden="true" /> Annuler</button>
                <button type="button" className="ap-btn ap-btn--sm" onClick={enregistrer} disabled={envoi}><Save size={14} aria-hidden="true" /> {envoi ? 'Enregistrement…' : 'Enregistrer'}</button>
              </div>
            </div>
          )}
        </div>
      )}

      {estEnseignant && (
        <NouvelleEvaluation open={creation} onClose={() => setCreation(false)} classe={classe} periode={periode} matiere={matiere}
          competences={competences} evaluations={evaluations} onCree={recharger} />
      )}

      <ConfirmDialog
        open={!!aVerrouiller}
        tone="warning"
        title="Verrouiller la saisie ?"
        message={aVerrouiller ? `« ${aVerrouiller.libelle} » : vous ne pourrez plus modifier ces notes. Une erreur se corrigera ensuite par l'administration, avec un motif.` : ''}
        confirmLabel="Verrouiller"
        loading={envoi}
        onConfirm={verrouiller}
        onCancel={() => !envoi && setAVerrouiller(null)}
      />

      {!estEnseignant && <CorrectionNote cible={correction} competences={competences} niveaux={niveaux} onClose={() => setCorrection(null)} onCorrigee={recharger} />}
    </>
  )
}

function NouvelleEvaluation({ open, onClose, classe, periode, matiere, competences, evaluations, onCree }) {
  const notify = useNotify()
  const vide = () => ({ type: competences ? 'evaluation_competence' : 'interrogation', libelle: '', date_evaluation: aujourdhui(), coefficient: '1', note_sur: '20', rattrapage_de_uuid: '' })
  const [f, setF] = useState(vide)
  const [erreurs, setErreurs] = useState({})
  const [envoi, setEnvoi] = useState(false)
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { if (open) { setF(vide()); setErreurs({}) } }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  const maj = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }))
  const rattrapables = evaluations.filter((ev) => ev.matiere.uuid === matiere?.uuid)

  const creer = useCallback(async (ev) => {
    ev.preventDefault()
    const e = {}
    if (!f.libelle.trim()) e.libelle = 'Indiquez le libellé (exemple : Devoir n°1).'
    if (!f.date_evaluation) e.date_evaluation = 'Indiquez la date.'
    else if (periode && (f.date_evaluation < periode.date_debut || f.date_evaluation > periode.date_fin)) e.date_evaluation = `La date doit être comprise dans la période (${formatDate(periode.date_debut)} au ${formatDate(periode.date_fin)}).`
    if (!/^\d{1,2}([.,]\d{1,2})?$/.test(f.coefficient.trim()) || Number(norm(f.coefficient)) <= 0) e.coefficient = 'Coefficient positif (exemple : 1 ou 1.5).'
    if (!competences && (!/^\d{1,3}([.,]\d{1,2})?$/.test(f.note_sur.trim()) || Number(norm(f.note_sur)) <= 0)) e.note_sur = 'Barème positif (exemple : 20).'
    setErreurs(e)
    if (Object.keys(e).length) return
    setEnvoi(true)
    try {
      await evaluationsService.creerEvaluation({
        periode_uuid: periode.uuid, classe_uuid: classe.uuid, matiere_uuid: matiere.uuid,
        type: f.type, libelle: f.libelle.trim(), date_evaluation: f.date_evaluation,
        coefficient: norm(f.coefficient), ...(competences ? {} : { note_sur: norm(f.note_sur) }),
        ...(f.rattrapage_de_uuid ? { rattrapage_de_uuid: f.rattrapage_de_uuid } : {}),
      })
      notify.success('Évaluation créée', `${f.libelle.trim()} : vous pouvez saisir les notes.`)
      onClose()
      onCree()
    } catch (err) {
      setErreurs(erreursChamps(err))
      notify.fromError(err)
    } finally {
      setEnvoi(false)
    }
  }, [f, periode, classe, matiere, competences, notify, onClose, onCree])

  return (
    <Drawer open={open} title="Nouvelle évaluation" subtitle={matiere ? `${matiere.nom} - ${libelleClasse(classe)} - ${libellePeriode(periode)}` : undefined}
      onClose={() => !envoi && onClose()} busy={envoi}
      footer={(
        <>
          <button type="button" className="ap-btn ap-btn--ghost" onClick={onClose} disabled={envoi}>Annuler</button>
          <button type="submit" form="ev-form-evaluation" className="ap-btn" disabled={envoi}>{envoi ? 'Création…' : 'Créer'}</button>
        </>
      )}>
      <form id="ev-form-evaluation" className="ev ev-form" onSubmit={creer} noValidate>
        <Champ id="ev-e-type" label="Type" requis erreur={erreurs.type}>
          <select {...aria('ev-e-type', erreurs.type)} className="ap-input" value={f.type} onChange={maj('type')} required>
            {TYPES_EVALUATION.map((t) => <option key={t.code} value={t.code}>{t.libelle}</option>)}
          </select>
        </Champ>
        <Champ id="ev-e-libelle" label="Libellé" requis erreur={erreurs.libelle}>
          <input {...aria('ev-e-libelle', erreurs.libelle)} className="ap-input" value={f.libelle} maxLength={150} placeholder="Exemple : Devoir n°1" onChange={maj('libelle')} required />
        </Champ>
        <div className="ev-deux">
          <Champ id="ev-e-date" label="Date" requis erreur={erreurs.date_evaluation}>
            <input {...aria('ev-e-date', erreurs.date_evaluation)} type="date" className="ap-input" value={f.date_evaluation}
              min={periode?.date_debut} max={periode?.date_fin} onChange={maj('date_evaluation')} required />
          </Champ>
          <Champ id="ev-e-coef" label="Coefficient" requis erreur={erreurs.coefficient}>
            <input {...aria('ev-e-coef', erreurs.coefficient)} className="ap-input" inputMode="decimal" maxLength={5} value={f.coefficient} placeholder="Exemple : 1" onChange={maj('coefficient')} required />
          </Champ>
          {!competences && (
            <Champ id="ev-e-sur" label="Noté sur" requis erreur={erreurs.note_sur}>
              <input {...aria('ev-e-sur', erreurs.note_sur)} className="ap-input" inputMode="decimal" maxLength={6} value={f.note_sur} placeholder="Exemple : 20" onChange={maj('note_sur')} required />
            </Champ>
          )}
        </div>
        {rattrapables.length > 0 && (
          <Champ id="ev-e-ratt" label="Rattrapage de" erreur={erreurs.rattrapage_de_uuid} aide="À renseigner seulement si cette évaluation en rattrape une autre.">
            <select {...aria('ev-e-ratt', erreurs.rattrapage_de_uuid, true)} className="ap-input" value={f.rattrapage_de_uuid} onChange={maj('rattrapage_de_uuid')}>
              <option value="">Aucune (évaluation normale)</option>
              {rattrapables.map((ev) => <option key={ev.uuid} value={ev.uuid}>{ev.libelle} du {formatDate(ev.date_evaluation)}</option>)}
            </select>
          </Champ>
        )}
      </form>
    </Drawer>
  )
}

function CorrectionNote({ cible, competences, niveaux, onClose, onCorrigee }) {
  const notify = useNotify()
  const [f, setF] = useState(null)
  const [erreurs, setErreurs] = useState({})
  const [envoi, setEnvoi] = useState(false)

  useEffect(() => {
    if (!cible) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setF({ statut: cible.note.statut, valeur: cible.note.valeur != null ? String(Number(cible.note.valeur)) : '', niveau_competence: cible.note.niveau_competence ?? '', motif: '' })
     
    setErreurs({})
  }, [cible])

  const corriger = async (ev) => {
    ev.preventDefault()
    const e = {}
    if (f.statut === 'saisie') {
      if (competences && !f.niveau_competence) e.niveau_competence = 'Choisissez le niveau.'
      if (!competences && (!NOTE.test(f.valeur) || Number(norm(f.valeur)) > Number(cible.ev.note_sur))) e.valeur = `Note de 0 à ${formatNombre(cible.ev.note_sur)}.`
    }
    if (f.motif.trim().length < 10) e.motif = 'Motif de 10 caractères au moins : il est conservé dans l\'historique.'
    setErreurs(e)
    if (Object.keys(e).length) return
    setEnvoi(true)
    try {
      await evaluationsService.corrigerNote(cible.note.uuid, {
        statut: f.statut,
        valeur: f.statut === 'saisie' && !competences ? norm(f.valeur) : null,
        niveau_competence: f.statut === 'saisie' && competences ? f.niveau_competence : null,
        motif: f.motif.trim(),
        version: cible.note.version,
      })
      notify.success('Note corrigée', `${nomComplet(cible.apprenant)} - ${cible.ev.libelle}.`)
      onClose()
      onCorrigee()
    } catch (err) {
      setErreurs(erreursChamps(err))
      notify.fromError(err)
    } finally {
      setEnvoi(false)
    }
  }

  return (
    <Drawer open={!!cible} title="Corriger une note" subtitle={cible ? `${nomComplet(cible.apprenant)} - ${cible.ev.libelle}` : undefined}
      onClose={() => !envoi && onClose()} busy={envoi}
      footer={(
        <>
          <button type="button" className="ap-btn ap-btn--ghost" onClick={onClose} disabled={envoi}>Annuler</button>
          <button type="submit" form="ev-form-correction" className="ap-btn ap-btn--warn" disabled={envoi}>{envoi ? 'Correction…' : 'Corriger'}</button>
        </>
      )}>
      {f && cible && (
        <form id="ev-form-correction" className="ev ev-form" onSubmit={corriger} noValidate>
          <Champ id="ev-c-statut" label="Statut" requis>
            <select {...aria('ev-c-statut')} className="ap-input" value={f.statut} onChange={(e) => setF((x) => ({ ...x, statut: e.target.value }))}>
              {STATUTS_NOTE.map((s) => <option key={s.code} value={s.code}>{s.libelle}</option>)}
            </select>
          </Champ>
          {f.statut === 'saisie' && (competences ? (
            <Champ id="ev-c-niv" label="Niveau de compétence" requis erreur={erreurs.niveau_competence}>
              <select {...aria('ev-c-niv', erreurs.niveau_competence)} className="ap-input" value={f.niveau_competence} onChange={(e) => setF((x) => ({ ...x, niveau_competence: e.target.value }))}>
                <option value="">Choisir</option>
                {niveaux.map((n) => <option key={n.code} value={n.code}>{n.code} - {n.libelle}</option>)}
              </select>
            </Champ>
          ) : (
            <Champ id="ev-c-val" label={`Note sur ${formatNombre(cible.ev.note_sur)}`} requis erreur={erreurs.valeur}>
              <input {...aria('ev-c-val', erreurs.valeur)} className="ap-input" inputMode="decimal" maxLength={6} value={f.valeur} placeholder="Exemple : 12.5"
                onChange={(e) => setF((x) => ({ ...x, valeur: e.target.value }))} />
            </Champ>
          ))}
          <Champ id="ev-c-motif" label="Motif de la correction" requis erreur={erreurs.motif}>
            <textarea {...aria('ev-c-motif', erreurs.motif)} className="ap-textarea" rows={4} maxLength={1000} value={f.motif}
              placeholder="Exemple : erreur de report constatée sur la copie après vérification avec l'enseignant."
              onChange={(e) => setF((x) => ({ ...x, motif: e.target.value }))} />
          </Champ>
        </form>
      )}
    </Drawer>
  )
}
