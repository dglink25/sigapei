import { useEffect, useState } from 'react'
import { FileText, Plus, Save, Scale, SlidersHorizontal, Trash2 } from 'lucide-react'
import { useNotify } from '../../context/commun/NotifyContext'
import { evaluationsService } from '../../services/evaluations/evaluations.service'
import { COLONNES_BULLETIN, CYCLES, TYPES_EVALUATION, formatNombre, libelleCycle } from '../../config/evaluations/constantes'
import Drawer from '../administration/Drawer'
import { Badge, Champ, Chargement, EtatVide, aria, erreursChamps, useDonnees } from './communs'

const DEC = /^\d{1,3}(\.\d{1,2})?$/
const norm = (v) => String(v ?? '').trim().replace(',', '.')

const REGLES_DEFAUT = {
  grille_uuid: '',
  decimales: 2,
  note_non_saisie: 'exclure',
  absence_non_justifiee: 'zero',
  regle_rattrapage: 'meilleure',
  classement_actif: true,
  delai_escalade_contestation_jours: 7,
  ponderation_types: Object.fromEntries(TYPES_EVALUATION.map((t) => [t.code, { mode: t.code === 'interrogation' ? 'bloc' : 'individuel', poids: '1' }])),
  echelle_appreciation: [
    { min: '0', max: '9.99', mention: 'Insuffisant' },
    { min: '10', max: '11.99', mention: 'Passable' },
    { min: '12', max: '13.99', mention: 'Assez bien' },
    { min: '14', max: '15.99', mention: 'Bien' },
    { min: '16', max: '20', mention: 'Très bien' },
  ],
}

/** Règles de notation, barèmes et modèle de bulletin, par cycle (administrateur). */
export default function PanneauParametres() {
  const [cycle, setCycle] = useState('secondaire')

  return (
    <section className="ev" aria-labelledby="ev-titre-parametres">
      <div className="ev-entete">
        <div>
          <h2 className="ap-page-title" id="ev-titre-parametres">Règles de notation et bulletins</h2>
          <p className="ap-page-sub">Chaque cycle a son barème, sa manière de calculer les moyennes, ses mentions et la mise en page de ses bulletins.</p>
        </div>
      </div>
      <div className="ap-filters" role="tablist" aria-label="Cycle">
        {CYCLES.map((c) => (
          <button key={c.code} type="button" role="tab" aria-selected={cycle === c.code}
            className={`ap-tab${cycle === c.code ? ' is-active' : ''}`} onClick={() => setCycle(c.code)}>
            {c.libelle}
          </button>
        ))}
      </div>
      <ReglesCycle key={`r-${cycle}`} cycle={cycle} />
      <ModeleBulletin key={`m-${cycle}`} cycle={cycle} />
    </section>
  )
}

function ReglesCycle({ cycle }) {
  const notify = useNotify()
  const [form, setForm] = useState(null)
  const [erreurs, setErreurs] = useState({})
  const [envoi, setEnvoi] = useState(false)
  const [nouveauBareme, setNouveauBareme] = useState(false)

  const grilles = useDonnees(() => evaluationsService.grilles(cycle), [cycle], { initial: [], onErreur: notify.fromError })
  const regles = useDonnees(async () => {
    try {
      return await evaluationsService.regles(cycle)
    } catch (err) {
      if (err?.code === 'PARAMETRES_NON_CONFIGURES') return null
      throw err
    }
  }, [cycle], { onErreur: notify.fromError })

  useEffect(() => {
    if (regles.chargement || regles.erreur) return
    const r = regles.donnees
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setForm(r ? {
      grille_uuid: r.grille?.uuid ?? '',
      decimales: r.decimales,
      note_non_saisie: r.note_non_saisie,
      absence_non_justifiee: r.absence_non_justifiee,
      regle_rattrapage: r.regle_rattrapage,
      classement_actif: !!r.classement_actif,
      delai_escalade_contestation_jours: r.delai_escalade_contestation_jours,
      ponderation_types: { ...REGLES_DEFAUT.ponderation_types, ...(r.ponderation_types ?? {}) },
      echelle_appreciation: (r.echelle_appreciation ?? []).map((t) => ({ min: String(t.min), max: String(t.max), mention: t.mention })),
      configure: true,
    } : { ...REGLES_DEFAUT, configure: false })
  }, [regles.donnees, regles.chargement, regles.erreur])

  const grille = (grilles.donnees ?? []).find((g) => g.uuid === form?.grille_uuid)
  const maj = (k, v) => setForm((f) => ({ ...f, [k]: v }))
  const majEchelle = (i, k, v) => setForm((f) => ({ ...f, echelle_appreciation: f.echelle_appreciation.map((t, j) => (j === i ? { ...t, [k]: v } : t)) }))
  const majPonderation = (type, k, v) => setForm((f) => ({ ...f, ponderation_types: { ...f.ponderation_types, [type]: { ...f.ponderation_types[type], [k]: v } } }))

  const enregistrer = async (ev) => {
    ev.preventDefault()
    const e = {}
    if (!form.grille_uuid) e.grille_uuid = 'Choisissez un barème.'
    if (form.echelle_appreciation.length === 0) e.echelle_appreciation = 'Ajoutez au moins une mention.'
    form.echelle_appreciation.forEach((t, i) => {
      if (!DEC.test(norm(t.min)) || !DEC.test(norm(t.max)) || Number(norm(t.min)) > Number(norm(t.max)) || !t.mention.trim()) {
        e.echelle_appreciation = `Ligne ${i + 1} : bornes numériques (minimum ≤ maximum) et mention obligatoires.`
      }
    })
    Object.entries(form.ponderation_types).forEach(([t, p]) => {
      if (!DEC.test(norm(p.poids)) || Number(norm(p.poids)) <= 0) e.ponderation_types = `Poids invalide pour « ${TYPES_EVALUATION.find((x) => x.code === t)?.libelle ?? t} ».`
    })
    setErreurs(e)
    if (Object.keys(e).length) return
    setEnvoi(true)
    try {
      const corps = {
        grille_uuid: form.grille_uuid,
        decimales: Number(form.decimales),
        note_non_saisie: form.note_non_saisie,
        absence_non_justifiee: form.absence_non_justifiee,
        regle_rattrapage: form.regle_rattrapage,
        classement_actif: form.classement_actif,
        delai_escalade_contestation_jours: Number(form.delai_escalade_contestation_jours),
        ponderation_types: Object.fromEntries(Object.entries(form.ponderation_types).map(([t, p]) => [t, { mode: p.mode, poids: norm(p.poids) }])),
        echelle_appreciation: form.echelle_appreciation.map((t) => ({ min: norm(t.min), max: norm(t.max), mention: t.mention.trim() })),
      }
      await evaluationsService.enregistrerRegles(cycle, corps)
      notify.success('Règles enregistrées', `Cycle ${libelleCycle(cycle)} : elles s'appliquent aux calculs de moyenne dès maintenant.`)
      regles.recharger()
    } catch (err) {
      setErreurs(erreursChamps(err))
      notify.fromError(err)
    } finally {
      setEnvoi(false)
    }
  }

  if (regles.chargement || grilles.chargement || !form) return <Chargement label="Chargement des règles…" />

  return (
    <>
    <form className="ap-card" style={{ padding: 18 }} onSubmit={enregistrer} noValidate aria-labelledby="ev-titre-regles">
      <div className="ev-entete" style={{ marginBottom: 12 }}>
        <div>
          <h3 id="ev-titre-regles" style={{ margin: 0, fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: 8 }}>
            <SlidersHorizontal size={18} aria-hidden="true" /> Calcul des moyennes - {libelleCycle(cycle)}
          </h3>
          {!form.configure && <p className="ap-hint" style={{ marginTop: 6 }}>Pas encore configuré : les valeurs proposées sont l'usage béninois, à vérifier puis enregistrer.</p>}
        </div>
        <button type="button" className="ap-btn ap-btn--ghost ap-btn--sm" onClick={() => setNouveauBareme(true)}>
          <Scale size={14} aria-hidden="true" /> Nouveau barème
        </button>
      </div>

      <div className="ev-deux">
        <Champ id={`ev-r-grille-${cycle}`} label="Barème" requis erreur={erreurs.grille_uuid}>
          <select {...aria(`ev-r-grille-${cycle}`, erreurs.grille_uuid)} className="ap-input" value={form.grille_uuid} onChange={(e) => maj('grille_uuid', e.target.value)} required>
            <option value="">Choisir un barème</option>
            {(grilles.donnees ?? []).map((g) => (
              <option key={g.uuid} value={g.uuid}>
                {g.nom}{g.type_notation === 'chiffree' ? ` (${formatNombre(g.note_min)} à ${formatNombre(g.note_max)})` : ' (compétences)'}{g.origine === 'etablissement' ? ' - établissement' : ''}
              </option>
            ))}
          </select>
        </Champ>
        <Champ id={`ev-r-dec-${cycle}`} label="Décimales des moyennes" requis>
          <select {...aria(`ev-r-dec-${cycle}`)} className="ap-input" value={form.decimales} onChange={(e) => maj('decimales', e.target.value)}>
            {[0, 1, 2, 3].map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </Champ>
        <Champ id={`ev-r-nns-${cycle}`} label="Note non saisie" requis>
          <select {...aria(`ev-r-nns-${cycle}`)} className="ap-input" value={form.note_non_saisie} onChange={(e) => maj('note_non_saisie', e.target.value)}>
            <option value="exclure">Ignorée dans la moyenne</option>
            <option value="zero">Comptée zéro</option>
          </select>
        </Champ>
        <Champ id={`ev-r-anj-${cycle}`} label="Absence non justifiée" requis>
          <select {...aria(`ev-r-anj-${cycle}`)} className="ap-input" value={form.absence_non_justifiee} onChange={(e) => maj('absence_non_justifiee', e.target.value)}>
            <option value="zero">Comptée zéro</option>
            <option value="exclure">Ignorée dans la moyenne</option>
          </select>
        </Champ>
        <Champ id={`ev-r-rat-${cycle}`} label="Évaluation de rattrapage" requis>
          <select {...aria(`ev-r-rat-${cycle}`)} className="ap-input" value={form.regle_rattrapage} onChange={(e) => maj('regle_rattrapage', e.target.value)}>
            <option value="meilleure">Meilleure des deux notes</option>
            <option value="remplacer">Remplace la note initiale</option>
            <option value="moyenne">Moyenne des deux notes</option>
          </select>
        </Champ>
        <Champ id={`ev-r-esc-${cycle}`} label="Escalade d'une contestation (jours)" requis aide="Sans réponse de l'enseignant dans ce délai, l'administrateur est alerté.">
          <input {...aria(`ev-r-esc-${cycle}`, null, true)} type="number" min={1} max={90} className="ap-input" value={form.delai_escalade_contestation_jours}
            placeholder="Exemple : 7" onChange={(e) => maj('delai_escalade_contestation_jours', e.target.value)} />
        </Champ>
      </div>
      <label className="ev-case" htmlFor={`ev-r-cls-${cycle}`} style={{ marginBottom: 16 }}>
        <input id={`ev-r-cls-${cycle}`} type="checkbox" checked={form.classement_actif} onChange={(e) => maj('classement_actif', e.target.checked)} />
        Afficher le rang des apprenants sur les bulletins
      </label>

      <fieldset style={{ border: 0, padding: 0, margin: '0 0 16px' }}>
        <legend className="ap-label" style={{ marginBottom: 8 }}>Poids de chaque type d'évaluation</legend>
        <p className="ap-hint" style={{ marginBottom: 10 }}>« Regroupées » : les notes du type forment une seule moyenne (les interrogations, par exemple). « Une à une » : chaque note compte séparément.</p>
        <div className="ev-table-wrap">
          <table className="ap-table">
            <thead><tr><th scope="col">Type</th><th scope="col">Prise en compte</th><th scope="col">Poids</th></tr></thead>
            <tbody>
              {TYPES_EVALUATION.map((t) => (
                <tr key={t.code}>
                  <td>{t.libelle}</td>
                  <td>
                    <select className="ap-input" aria-label={`Prise en compte : ${t.libelle}`} value={form.ponderation_types[t.code]?.mode ?? 'individuel'}
                      onChange={(e) => majPonderation(t.code, 'mode', e.target.value)}>
                      <option value="bloc">Regroupées</option>
                      <option value="individuel">Une à une</option>
                    </select>
                  </td>
                  <td>
                    <input className="ap-input ev-note" style={{ width: 90 }} aria-label={`Poids : ${t.libelle}`} inputMode="decimal" maxLength={5}
                      value={form.ponderation_types[t.code]?.poids ?? '1'} placeholder="Exemple : 1" onChange={(e) => majPonderation(t.code, 'poids', e.target.value)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {erreurs.ponderation_types && <p className="ap-error" role="alert">{erreurs.ponderation_types}</p>}
      </fieldset>

      <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
        <legend className="ap-label" style={{ marginBottom: 8 }}>Mentions <em aria-hidden="true" style={{ fontStyle: 'normal', color: '#c0392b' }}>*</em></legend>
        <p className="ap-hint" style={{ marginBottom: 10 }}>
          Tranches sans trou ni chevauchement{grille?.type_notation === 'chiffree' ? `, de ${formatNombre(grille.note_min)} à ${formatNombre(grille.note_max)}` : ''}.
        </p>
        {form.echelle_appreciation.map((t, i) => (
          <div key={i} className="ev-ligne-echelle">
            <input className="ap-input" aria-label={`Minimum de la mention ${i + 1}`} inputMode="decimal" value={t.min} maxLength={6} placeholder="Exemple : 10" onChange={(e) => majEchelle(i, 'min', e.target.value)} />
            <input className="ap-input" aria-label={`Maximum de la mention ${i + 1}`} inputMode="decimal" value={t.max} maxLength={6} placeholder="Exemple : 11.99" onChange={(e) => majEchelle(i, 'max', e.target.value)} />
            <input className="ap-input" aria-label={`Libellé de la mention ${i + 1}`} value={t.mention} maxLength={60} placeholder="Exemple : Passable" onChange={(e) => majEchelle(i, 'mention', e.target.value)} />
            <button type="button" className="ap-btn ap-btn--ghost ap-btn--icon" aria-label={`Retirer la mention ${i + 1}`}
              onClick={() => maj('echelle_appreciation', form.echelle_appreciation.filter((_, j) => j !== i))}>
              <Trash2 size={15} aria-hidden="true" />
            </button>
          </div>
        ))}
        {erreurs.echelle_appreciation && <p className="ap-error" role="alert">{erreurs.echelle_appreciation}</p>}
        {form.echelle_appreciation.length < 20 && (
          <button type="button" className="ap-btn ap-btn--ghost ap-btn--sm" onClick={() => maj('echelle_appreciation', [...form.echelle_appreciation, { min: '', max: '', mention: '' }])}>
            <Plus size={14} aria-hidden="true" /> Ajouter une mention
          </button>
        )}
      </fieldset>

      <div className="ev-actions" style={{ justifyContent: 'flex-end', marginTop: 18 }}>
        <button type="submit" className="ap-btn" disabled={envoi}><Save size={15} aria-hidden="true" /> {envoi ? 'Enregistrement…' : 'Enregistrer les règles'}</button>
      </div>
    </form>
    <NouveauBareme cycle={cycle} open={nouveauBareme} onClose={() => setNouveauBareme(false)}
      onCree={(g) => { grilles.recharger(); if (g?.uuid) maj('grille_uuid', g.uuid) }} />
    </>
  )
}

function NouveauBareme({ cycle, open, onClose, onCree }) {
  const notify = useNotify()
  const vide = { code: '', nom: '', programme: 'beninois', type_notation: 'chiffree', note_min: '0', note_max: '20', avec_coefficients: true, avec_classement: true, niveaux: 'A:Acquis\nEA:En cours d\'acquisition\nNA:Non acquis', description: '' }
  const [f, setF] = useState(vide)
  const [erreurs, setErreurs] = useState({})
  const [envoi, setEnvoi] = useState(false)
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { if (open) { setF(vide); setErreurs({}) } }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  const niveaux = () => f.niveaux.split('\n').map((l) => l.trim()).filter(Boolean).map((l) => {
    const [code, ...reste] = l.split(':')
    return { code: code.trim(), libelle: reste.join(':').trim() }
  })

  const creer = async (ev) => {
    ev.preventDefault()
    const e = {}
    if (!/^[a-z0-9_]{1,60}$/.test(f.code.trim())) e.code = 'Minuscules, chiffres et « _ » uniquement.'
    if (!f.nom.trim()) e.nom = 'Indiquez le nom du barème.'
    if (f.type_notation === 'chiffree' && !(Number(norm(f.note_max)) > Number(norm(f.note_min)))) e.note_max = 'La note maximale doit dépasser la note minimale.'
    if (f.type_notation === 'competences') {
      const n = niveaux()
      if (n.length < 2 || n.some((x) => !x.code || !x.libelle)) e.niveaux = 'Au moins deux niveaux, un par ligne, au format CODE:Libellé.'
    }
    setErreurs(e)
    if (Object.keys(e).length) return
    setEnvoi(true)
    try {
      const g = await evaluationsService.creerGrille({
        code: f.code.trim(), nom: f.nom.trim(), cycle, programme: f.programme, type_notation: f.type_notation,
        ...(f.type_notation === 'chiffree' ? { note_min: norm(f.note_min), note_max: norm(f.note_max) } : { niveaux_competence: niveaux() }),
        avec_coefficients: f.avec_coefficients, avec_classement: f.avec_classement,
        description: f.description.trim() || null,
      })
      notify.success('Barème créé', g?.nom ?? f.nom.trim())
      onCree(g)
      onClose()
    } catch (err) {
      setErreurs(erreursChamps(err))
      notify.fromError(err)
    } finally {
      setEnvoi(false)
    }
  }

  return (
    <Drawer open={open} title="Nouveau barème" subtitle={`Cycle ${libelleCycle(cycle)}`} onClose={() => !envoi && onClose()} busy={envoi}
      footer={(
        <>
          <button type="button" className="ap-btn ap-btn--ghost" onClick={onClose} disabled={envoi}>Annuler</button>
          <button type="submit" form={`ev-form-bareme-${cycle}`} className="ap-btn" disabled={envoi}>{envoi ? 'Création…' : 'Créer le barème'}</button>
        </>
      )}>
      <form id={`ev-form-bareme-${cycle}`} className="ev ev-form" onSubmit={creer} noValidate>
        <Champ id="ev-b-code" label="Code" requis erreur={erreurs.code}>
          <input {...aria('ev-b-code', erreurs.code)} className="ap-input ap-input--mono" value={f.code} maxLength={60} placeholder="Exemple : bareme_sur_10"
            onChange={(e) => setF((x) => ({ ...x, code: e.target.value.toLowerCase() }))} required />
        </Champ>
        <Champ id="ev-b-nom" label="Nom" requis erreur={erreurs.nom}>
          <input {...aria('ev-b-nom', erreurs.nom)} className="ap-input" value={f.nom} maxLength={150} placeholder="Exemple : Notation sur 10"
            onChange={(e) => setF((x) => ({ ...x, nom: e.target.value }))} required />
        </Champ>
        <div className="ev-deux">
          <Champ id="ev-b-prog" label="Programme" requis>
            <select {...aria('ev-b-prog')} className="ap-input" value={f.programme} onChange={(e) => setF((x) => ({ ...x, programme: e.target.value }))}>
              <option value="beninois">Béninois</option>
              <option value="francais">Français</option>
              <option value="autre">Autre</option>
            </select>
          </Champ>
          <Champ id="ev-b-type" label="Notation" requis>
            <select {...aria('ev-b-type')} className="ap-input" value={f.type_notation} onChange={(e) => setF((x) => ({ ...x, type_notation: e.target.value }))}>
              <option value="chiffree">Chiffrée</option>
              <option value="competences">Par compétences</option>
            </select>
          </Champ>
        </div>
        {f.type_notation === 'chiffree' ? (
          <div className="ev-deux">
            <Champ id="ev-b-min" label="Note minimale" requis erreur={erreurs.note_min}>
              <input {...aria('ev-b-min', erreurs.note_min)} className="ap-input" inputMode="decimal" value={f.note_min} maxLength={6} placeholder="Exemple : 0"
                onChange={(e) => setF((x) => ({ ...x, note_min: e.target.value }))} />
            </Champ>
            <Champ id="ev-b-max" label="Note maximale" requis erreur={erreurs.note_max}>
              <input {...aria('ev-b-max', erreurs.note_max)} className="ap-input" inputMode="decimal" value={f.note_max} maxLength={6} placeholder="Exemple : 20"
                onChange={(e) => setF((x) => ({ ...x, note_max: e.target.value }))} />
            </Champ>
          </div>
        ) : (
          <Champ id="ev-b-niv" label="Niveaux de compétence" requis erreur={erreurs.niveaux ?? erreurs.niveaux_competence} aide="Un niveau par ligne, au format CODE:Libellé.">
            <textarea {...aria('ev-b-niv', erreurs.niveaux, true)} className="ap-textarea" rows={4} value={f.niveaux} placeholder="Exemple : A:Acquis"
              onChange={(e) => setF((x) => ({ ...x, niveaux: e.target.value }))} />
          </Champ>
        )}
        <label className="ev-case" htmlFor="ev-b-coef" style={{ marginBottom: 8 }}>
          <input id="ev-b-coef" type="checkbox" checked={f.avec_coefficients} onChange={(e) => setF((x) => ({ ...x, avec_coefficients: e.target.checked }))} /> Avec coefficients
        </label>
        <label className="ev-case" htmlFor="ev-b-cls" style={{ marginBottom: 16 }}>
          <input id="ev-b-cls" type="checkbox" checked={f.avec_classement} onChange={(e) => setF((x) => ({ ...x, avec_classement: e.target.checked }))} /> Avec classement
        </label>
        <Champ id="ev-b-desc" label="Description">
          <textarea {...aria('ev-b-desc')} className="ap-textarea" rows={3} maxLength={2000} value={f.description} placeholder="Exemple : Barème des classes d'éveil"
            onChange={(e) => setF((x) => ({ ...x, description: e.target.value }))} />
        </Champ>
      </form>
    </Drawer>
  )
}

function ModeleBulletin({ cycle }) {
  const notify = useNotify()
  const modele = useDonnees(() => evaluationsService.modeleBulletin(cycle), [cycle], { onErreur: notify.fromError })
  const [f, setF] = useState(null)
  const [erreurs, setErreurs] = useState({})
  const [envoi, setEnvoi] = useState(false)

  useEffect(() => {
    if (modele.chargement || modele.erreur) return
    const m = modele.donnees
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setF({
      titre: m?.en_tete?.titre ?? 'Bulletin de notes',
      sous_titre: m?.en_tete?.sous_titre ?? '',
      colonnes: m?.colonnes_affichees ?? ['matiere', 'coefficient', 'moyenne', 'moyenne_classe', 'min_classe', 'max_classe'],
      mentions: m?.mentions_bas_de_page ?? '',
      existe: !!m,
    })
  }, [modele.donnees, modele.chargement, modele.erreur])

  const basculer = (code) => setF((x) => ({
    ...x,
    colonnes: x.colonnes.includes(code) ? x.colonnes.filter((c) => c !== code) : COLONNES_BULLETIN.map((c) => c.code).filter((c) => c === code || x.colonnes.includes(c)),
  }))

  const enregistrer = async (ev) => {
    ev.preventDefault()
    const e = {}
    if (!f.titre.trim()) e.titre = 'Indiquez le titre du bulletin.'
    if (!f.colonnes.includes('matiere')) e.colonnes = 'La colonne « Matière » est indispensable.'
    setErreurs(e)
    if (Object.keys(e).length) return
    setEnvoi(true)
    try {
      await evaluationsService.enregistrerModele({
        cycle,
        en_tete: { titre: f.titre.trim(), sous_titre: f.sous_titre.trim() || null },
        colonnes_affichees: f.colonnes,
        mentions_bas_de_page: f.mentions.trim() || null,
      })
      notify.success('Modèle enregistré', `Bulletins du cycle ${libelleCycle(cycle)}.`)
      modele.recharger()
    } catch (err) {
      setErreurs(erreursChamps(err))
      notify.fromError(err)
    } finally {
      setEnvoi(false)
    }
  }

  if (modele.chargement || !f) return <Chargement label="Chargement du modèle de bulletin…" />
  if (modele.erreur) return <EtatVide icone={FileText} titre="Modèle indisponible" texte="Le modèle de bulletin n'a pas pu être chargé. Réessayez plus tard." />

  return (
    <form className="ap-card" style={{ padding: 18 }} onSubmit={enregistrer} noValidate aria-labelledby="ev-titre-modele">
      <h3 id="ev-titre-modele" style={{ margin: '0 0 12px', fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: 8 }}>
        <FileText size={18} aria-hidden="true" /> Modèle de bulletin - {libelleCycle(cycle)} {!f.existe && <Badge ton="info">Mise en page par défaut</Badge>}
      </h3>
      <div className="ev-deux">
        <Champ id={`ev-mb-titre-${cycle}`} label="Titre" requis erreur={erreurs.titre ?? erreurs['en_tete.titre']}>
          <input {...aria(`ev-mb-titre-${cycle}`, erreurs.titre)} className="ap-input" value={f.titre} maxLength={150} placeholder="Exemple : Bulletin de notes"
            onChange={(e) => setF((x) => ({ ...x, titre: e.target.value }))} required />
        </Champ>
        <Champ id={`ev-mb-st-${cycle}`} label="Sous-titre">
          <input {...aria(`ev-mb-st-${cycle}`)} className="ap-input" value={f.sous_titre} maxLength={150} placeholder="Exemple : Collège Les Palmiers - Cotonou"
            onChange={(e) => setF((x) => ({ ...x, sous_titre: e.target.value }))} />
        </Champ>
      </div>
      <fieldset style={{ border: 0, padding: 0, margin: '0 0 16px' }}>
        <legend className="ap-label" style={{ marginBottom: 8 }}>Colonnes affichées <em aria-hidden="true" style={{ fontStyle: 'normal', color: '#c0392b' }}>*</em></legend>
        <div className="ev-cases">
          {COLONNES_BULLETIN.map((c) => (
            <label key={c.code} className="ev-case" htmlFor={`ev-col-${cycle}-${c.code}`}>
              <input id={`ev-col-${cycle}-${c.code}`} type="checkbox" checked={f.colonnes.includes(c.code)} onChange={() => basculer(c.code)} />
              {c.libelle}
            </label>
          ))}
        </div>
        {erreurs.colonnes && <p className="ap-error" role="alert">{erreurs.colonnes}</p>}
      </fieldset>
      <Champ id={`ev-mb-ment-${cycle}`} label="Mentions en bas de page">
        <textarea {...aria(`ev-mb-ment-${cycle}`)} className="ap-textarea" rows={3} maxLength={2000} value={f.mentions}
          placeholder="Exemple : Bulletin à conserver précieusement. Aucun duplicata ne sera délivré."
          onChange={(e) => setF((x) => ({ ...x, mentions: e.target.value }))} />
      </Champ>
      <div className="ev-actions" style={{ justifyContent: 'flex-end' }}>
        <button type="submit" className="ap-btn" disabled={envoi}><Save size={15} aria-hidden="true" /> {envoi ? 'Enregistrement…' : 'Enregistrer le modèle'}</button>
      </div>
    </form>
  )
}
