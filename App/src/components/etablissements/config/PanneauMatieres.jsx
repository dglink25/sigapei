/**
 * PanneauMatieres - Matières avec coefficient, par cycle/niveau/série.
 * Propagation automatique aux classes homologues.
 * coefficient NULL = non défini (maternelle/primaire). Différent de 0.
 */
import { useEffect, useState } from 'react'
import { Plus, X, BookOpen, AlertTriangle, Share2 } from 'lucide-react'
import { useNotify } from '../../../context/commun/NotifyContext'
import {
  matieresService,
  niveauxService,
  seriesService,
} from '../../../services/etablissements/configurationAcademique.service'

const CYCLES = [
  { id: '',             label: 'Tous' },
  { id: 'maternelle',   label: 'Maternelle' },
  { id: 'primaire',     label: 'Primaire' },
  { id: 'secondaire',   label: 'Secondaire' },
  { id: 'universitaire',label: 'Université' },
]

export default function PanneauMatieres({ anneeActive, onTerminee, cycleFiltre }) {
  const notify = useNotify()
  const [filtreCycle, setFiltreCycle] = useState(cycleFiltre || '')
  const [items,      setItems]      = useState([])
  const [niveaux,    setNiveaux]    = useState([])
  const [series,     setSeries]     = useState([])
  const [charge,     setCharge]     = useState(false)
  const [modale,     setModale]     = useState(false)
  const [enCours,    setEnCours]    = useState(false)
  const [propagation,setPropagation]= useState(null)  // { uuid, classes: [], count }
  const [form, setForm] = useState({
    annee_uuid: '', cycle: 'primaire', niveau_uuid: '', serie_uuid: '',
    matiere_uuid_externe: '', nom_matiere: '', code_matiere: '',
    coefficient: '', est_obligatoire: true,
  })
  const [erreurs, setErreurs] = useState({})

  const charger = async () => {
    if (!anneeActive) return
    setCharge(true)
    try {
      const params = { annee_uuid: anneeActive.uuid }
      if (filtreCycle) params.cycle = filtreCycle
      const [rMat, rNiv, rSer] = await Promise.all([
        matieresService.lister(params),
        niveauxService.lister(filtreCycle || undefined),
        seriesService.lister(filtreCycle || undefined),
      ])
      const liste = rMat?.data ?? rMat ?? []
      setItems(liste)
      setNiveaux(rNiv?.data ?? rNiv ?? [])
      setSeries(rSer?.data ?? rSer ?? [])
      if (liste.length > 0) onTerminee('matieres')
    } catch (err) {
      notify.fromError(err)
    } finally {
      setCharge(false)
    }
  }

  useEffect(() => { charger() }, [anneeActive?.uuid, filtreCycle]) // eslint-disable-line

  if (!anneeActive) {
    return (
      <div className="ap-card ap-empty">
        <AlertTriangle size={32} aria-hidden="true" />
        <p>Sélectionnez d'abord une année académique.</p>
      </div>
    )
  }

  const ouvrirModale = () => {
    setForm({
      annee_uuid: anneeActive.uuid,
      cycle: filtreCycle || 'primaire',
      niveau_uuid: '', serie_uuid: '',
      matiere_uuid_externe: '', nom_matiere: '', code_matiere: '',
      coefficient: '', est_obligatoire: true,
    })
    setErreurs({})
    setModale(true)
  }

  const valider = () => {
    const e = {}
    if (!form.cycle) e.cycle = 'Cycle requis.'
    if (!form.niveau_uuid) e.niveau_uuid = 'Niveau requis.'
    if (!form.nom_matiere.trim()) e.nom_matiere = 'Nom de matière requis.'
    if (!form.matiere_uuid_externe.trim()) e.matiere_uuid_externe = 'UUID externe requis.'
    const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (form.matiere_uuid_externe && !uuidRe.test(form.matiere_uuid_externe.trim())) {
      e.matiere_uuid_externe = 'Format UUID invalide.'
    }
    setErreurs(e)
    return Object.keys(e).length === 0
  }

  const soumettre = async (ev) => {
    ev.preventDefault()
    if (!valider()) return
    setEnCours(true)
    try {
      const r = await matieresService.creer({
        annee_uuid:           form.annee_uuid,
        cycle:                form.cycle,
        niveau_uuid:          form.niveau_uuid,
        serie_uuid:           form.serie_uuid || undefined,
        matiere_uuid_externe: form.matiere_uuid_externe.trim(),
        nom_matiere:          form.nom_matiere.trim(),
        code_matiere:         form.code_matiere.trim() || undefined,
        coefficient:          form.coefficient !== '' ? Number(form.coefficient) : null,
        est_obligatoire:      form.est_obligatoire,
      })
      notify.success('Matière configurée', form.nom_matiere)
      setModale(false)

      // Proposer la propagation si des classes homologues existent
      const created = r?.data ?? r
      if (created?.uuid) {
        try {
          const prev = await matieresService.previewPropagation(created.uuid)
          const data = prev?.data ?? prev
          if ((data?.count ?? 0) > 0) {
            setPropagation({ uuid: created.uuid, classes: data.classes, count: data.count })
          }
        } catch { /* silencieux */ }
      }
      await charger()
    } catch (err) {
      notify.fromError(err)
    } finally {
      setEnCours(false)
    }
  }

  const confirmerPropagation = async () => {
    if (!propagation) return
    try {
      const r = await matieresService.propager(propagation.uuid)
      const data = r?.data ?? r
      notify.success('Propagation effectuée', `${data?.crees ?? propagation.count} configuration(s) créée(s).`)
      setPropagation(null)
      await charger()
    } catch (err) {
      notify.fromError(err)
    }
  }

  return (
    <div className="cfg-tab">
      <div className="ap-page-head">
        <div>
          <h2 className="ap-page-title">Matières & coefficients</h2>
          <p className="ap-page-sub">
            Année : <strong>{anneeActive.libelle}</strong> - coefficient NULL = non défini (≠ 0).
          </p>
        </div>
        <button type="button" className="ap-btn ap-btn--sm" onClick={ouvrirModale}>
          <Plus size={14} /> Configurer une matière
        </button>
      </div>

      {!cycleFiltre && (
        <div className="ap-filters">
          {CYCLES.map((c) => (
            <button key={c.id} type="button" className={`ap-tab${filtreCycle === c.id ? ' is-active' : ''}`} onClick={() => setFiltreCycle(c.id)}>
              {c.label}
            </button>
          ))}
        </div>
      )}

      {charge ? (
        <div className="ap-card">
          {[0,1,2].map((i) => <div key={i} className="ap-skel-row"><div className="ap-skel ap-skel--tile" /><div className="ap-skel ap-skel--line" /><div className="ap-skel ap-skel--short" /></div>)}
        </div>
      ) : items.length === 0 ? (
        <div className="ap-card ap-empty">
          <BookOpen size={36} aria-hidden="true" />
          <p>Aucune matière configurée pour ces filtres.</p>
          <button type="button" className="ap-btn ap-btn--sm" onClick={ouvrirModale}><Plus size={14} /> Configurer</button>
        </div>
      ) : (
        <div className="ap-card ap-card--flush">
          <table className="ap-table">
            <thead>
              <tr><th>Matière</th><th>Code</th><th>Niveau</th><th>Série</th><th>Coeff.</th><th>Statut</th></tr>
            </thead>
            <tbody>
              {items.map((m) => (
                <tr key={m.uuid}>
                  <td><strong>{m.nom_matiere}</strong></td>
                  <td>{m.code_matiere ? <span className="ap-code">{m.code_matiere}</span> : <span style={{ color: 'var(--sg-text-muted)' }}>-</span>}</td>
                  <td>{m.niveau?.nom ?? '-'}</td>
                  <td>{m.serie ? <span className="ap-badge ap-badge--info">{m.serie.code || m.serie.nom}</span> : <span style={{ color: 'var(--sg-text-muted)' }}>-</span>}</td>
                  <td>
                    {m.coefficient !== null && m.coefficient !== undefined
                      ? <strong>{m.coefficient}</strong>
                      : <span style={{ color: 'var(--sg-text-muted)', fontStyle: 'italic' }}>Non défini</span>}
                  </td>
                  <td>
                    <span className={`ap-badge ${m.est_obligatoire ? 'ap-badge--success' : 'ap-badge--neutral'}`}>
                      {m.est_obligatoire ? 'Obligatoire' : 'Optionnel'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Modale création ── */}
      {modale && (
        <div className="cfg-modale-fond" role="dialog" aria-modal="true" aria-labelledby="m-mat">
          <div className="cfg-modale">
            <div className="cfg-modale-tete">
              <h3 id="m-mat">Configurer une matière</h3>
              <button type="button" className="ap-drawer-close" onClick={() => setModale(false)} aria-label="Fermer"><X size={16} /></button>
            </div>
            <form onSubmit={soumettre}>
              <div className="cfg-modale-corps">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div className={`ap-field${erreurs.cycle ? ' has-error' : ''}`}>
                    <label className="ap-label" htmlFor="mat-cyc">Cycle <em>*</em></label>
                    <select id="mat-cyc" className="ap-input" value={form.cycle}
                      onChange={(e) => setForm((f) => ({ ...f, cycle: e.target.value, niveau_uuid: '', serie_uuid: '' }))}>
                      {CYCLES.filter((c) => c.id).map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
                    </select>
                  </div>
                  <div className={`ap-field${erreurs.niveau_uuid ? ' has-error' : ''}`}>
                    <label className="ap-label" htmlFor="mat-niv">Niveau <em>*</em></label>
                    <select id="mat-niv" className="ap-input" value={form.niveau_uuid}
                      onChange={(e) => setForm((f) => ({ ...f, niveau_uuid: e.target.value }))}>
                      <option value="">-- Sélectionner --</option>
                      {niveaux.filter((n) => !form.cycle || n.cycle === form.cycle).map((n) =>
                        <option key={n.uuid} value={n.uuid}>{n.nom}</option>)}
                    </select>
                    {erreurs.niveau_uuid && <p className="ap-error">{erreurs.niveau_uuid}</p>}
                  </div>
                </div>
                <div className="ap-field">
                  <label className="ap-label" htmlFor="mat-ser">Série / Filière (optionnel)</label>
                  <select id="mat-ser" className="ap-input" value={form.serie_uuid}
                    onChange={(e) => setForm((f) => ({ ...f, serie_uuid: e.target.value }))}>
                    <option value="">-- Commune à toutes les séries --</option>
                    {series.filter((s) => !form.cycle || s.cycle === form.cycle).map((s) =>
                      <option key={s.uuid} value={s.uuid}>{s.code} - {s.nom}</option>)}
                  </select>
                </div>
                <div className={`ap-field${erreurs.nom_matiere ? ' has-error' : ''}`}>
                  <label className="ap-label" htmlFor="mat-nom">Nom de la matière <em>*</em></label>
                  <input id="mat-nom" className="ap-input" value={form.nom_matiere}
                    onChange={(e) => setForm((f) => ({ ...f, nom_matiere: e.target.value }))}
                    placeholder="Ex. Éducation scientifique et technologie" />
                  {erreurs.nom_matiere && <p className="ap-error">{erreurs.nom_matiere}</p>}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div className="ap-field">
                    <label className="ap-label" htmlFor="mat-code">Code / Abréviation</label>
                    <input id="mat-code" className="ap-input ap-input--mono" value={form.code_matiere}
                      onChange={(e) => setForm((f) => ({ ...f, code_matiere: e.target.value.toUpperCase() }))}
                      placeholder="EST, MATH…" />
                  </div>
                  <div className="ap-field">
                    <label className="ap-label" htmlFor="mat-coef">
                      Coefficient
                      {(form.cycle === 'maternelle' || form.cycle === 'primaire') && (
                        <span style={{ marginLeft: 6, fontWeight: 400, color: 'var(--sg-text-muted)', fontSize: '0.78rem' }}>(optionnel)</span>
                      )}
                    </label>
                    <input id="mat-coef" type="number" min={0} step={0.5} className="ap-input"
                      value={form.coefficient}
                      onChange={(e) => setForm((f) => ({ ...f, coefficient: e.target.value }))}
                      placeholder="Vide = non défini" />
                    <p className="ap-hint">Vide = NULL (non défini). 0 est une valeur différente.</p>
                  </div>
                </div>
                <div className={`ap-field${erreurs.matiere_uuid_externe ? ' has-error' : ''}`}>
                  <label className="ap-label" htmlFor="mat-uuid">UUID matière (evaluations.matieres) <em>*</em></label>
                  <input id="mat-uuid" className="ap-input ap-input--mono" value={form.matiere_uuid_externe}
                    onChange={(e) => setForm((f) => ({ ...f, matiere_uuid_externe: e.target.value }))}
                    placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" />
                  <p className="ap-hint">Identifiant externe issu du microservice Évaluations.</p>
                  {erreurs.matiere_uuid_externe && <p className="ap-error">{erreurs.matiere_uuid_externe}</p>}
                </div>
                <div className="ap-switchline">
                  <div>
                    <strong>Matière obligatoire</strong>
                    <small>Peut être optionnel pour certaines filières</small>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={form.est_obligatoire}
                    className={`ap-switch${form.est_obligatoire ? ' is-on' : ''}`}
                    onClick={() => setForm((f) => ({ ...f, est_obligatoire: !f.est_obligatoire }))}
                  >
                    <span className="ap-switch-thumb" />
                  </button>
                </div>
              </div>
              <div className="cfg-modale-pied">
                <button type="button" className="ap-btn ap-btn--ghost" onClick={() => setModale(false)}>Annuler</button>
                <button type="submit" className="ap-btn" disabled={enCours}>{enCours ? 'Enregistrement…' : 'Enregistrer'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modale propagation ── */}
      {propagation && (
        <div className="cfg-modale-fond" role="dialog" aria-modal="true" aria-labelledby="m-prop">
          <div className="cfg-modale">
            <div className="cfg-modale-tete">
              <h3 id="m-prop" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Share2 size={16} /> Propagation aux classes homologues
              </h3>
              <button type="button" className="ap-drawer-close" onClick={() => setPropagation(null)} aria-label="Fermer"><X size={16} /></button>
            </div>
            <div className="cfg-modale-corps">
              <p className="cfg-confirm-texte">
                {propagation.count} classe(s) homologue(s) trouvée(s) avec le même niveau. Souhaitez-vous y appliquer automatiquement cette matière ?
              </p>
              <div className="cfg-confirm-resume">
                <strong>Classes concernées</strong>
                {propagation.classes.map((c) => (
                  <div key={c.uuid} style={{ marginTop: 4, fontSize: '0.85rem' }}>
                    <span className="ap-code">{c.sigle}</span> - {c.niveau} / {c.subdivision}
                  </div>
                ))}
              </div>
            </div>
            <div className="cfg-modale-pied">
              <button type="button" className="ap-btn ap-btn--ghost" onClick={() => setPropagation(null)}>Non, ignorer</button>
              <button type="button" className="ap-btn" onClick={confirmerPropagation}>
                <Share2 size={14} /> Propager
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
