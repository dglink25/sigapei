/**
 * PanneauClasses - Classes concrètes (niveau × subdivision × série optionnelle).
 * Sigle généré automatiquement côté backend, modifiable.
 */
import { useEffect, useState } from 'react'
import { Plus, X, Layers, AlertTriangle } from 'lucide-react'
import { useNotify } from '../../../context/commun/NotifyContext'
import {
  classesService,
  niveauxService,
  subdivisionsService,
  seriesService,
} from '../../../services/etablissements/configurationAcademique.service'

export default function PanneauClasses({ anneeActive, onTerminee, cycleFiltre }) {
  const notify = useNotify()
  const [classes,  setClasses]  = useState([])
  const [niveaux,  setNiveaux]  = useState([])
  const [subs,     setSubs]     = useState([])
  const [series,   setSeries]   = useState([])
  const [filtreCycle, setFiltreCycle] = useState(cycleFiltre || '')
  const [charge,   setCharge]   = useState(false)
  const [modale,   setModale]   = useState(false)
  const [enCours,  setEnCours]  = useState(false)
  const [form, setForm] = useState({ annee_uuid: '', niveau_uuid: '', subdivision_uuid: '', serie_uuid: '', sigle: '', effectif_previsionnel: '' })
  const [erreurs,  setErreurs]  = useState({})

  const charger = async () => {
    if (!anneeActive) return
    setCharge(true)
    try {
      const params = { annee_uuid: anneeActive.uuid }
      if (filtreCycle) params.cycle = filtreCycle
      const [rCls, rNiv, rSub, rSer] = await Promise.all([
        classesService.lister(params),
        niveauxService.lister(filtreCycle || undefined),
        subdivisionsService.lister({ annee_uuid: anneeActive.uuid }),
        seriesService.lister(filtreCycle || undefined),
      ])
      const cls = rCls?.data ?? rCls ?? []
      setClasses(cls)
      setNiveaux(rNiv?.data ?? rNiv ?? [])
      setSubs(rSub?.data ?? rSub ?? [])
      setSeries(rSer?.data ?? rSer ?? [])
      if (cls.length > 0) onTerminee('classes')
    } catch (err) {
      notify.fromError(err)
    } finally {
      setCharge(false)
    }
  }

  useEffect(() => { charger() }, [anneeActive?.uuid, filtreCycle]) // eslint-disable-line

  const cycles = ['', 'maternelle', 'primaire', 'secondaire', 'universitaire']

  const ouvrirModale = () => {
    setForm({
      annee_uuid: anneeActive?.uuid ?? '',
      niveau_uuid: '', subdivision_uuid: '', serie_uuid: '',
      sigle: '', effectif_previsionnel: '',
    })
    setErreurs({})
    setModale(true)
  }

  const valider = () => {
    const e = {}
    if (!form.niveau_uuid) e.niveau_uuid = 'Sélectionnez un niveau.'
    if (!form.subdivision_uuid) e.subdivision_uuid = 'Sélectionnez une subdivision.'
    setErreurs(e)
    return Object.keys(e).length === 0
  }

  const soumettre = async (ev) => {
    ev.preventDefault()
    if (!valider()) return
    setEnCours(true)
    try {
      await classesService.creer({
        annee_uuid:       form.annee_uuid,
        niveau_uuid:      form.niveau_uuid,
        subdivision_uuid: form.subdivision_uuid,
        serie_uuid:       form.serie_uuid || undefined,
        sigle:            form.sigle.trim() || undefined,
        effectif_previsionnel: form.effectif_previsionnel ? Number(form.effectif_previsionnel) : undefined,
      })
      notify.success('Classe créée')
      setModale(false)
      await charger()
    } catch (err) {
      notify.fromError(err)
    } finally {
      setEnCours(false)
    }
  }

  if (!anneeActive) {
    return (
      <div className="ap-card ap-empty">
        <AlertTriangle size={32} aria-hidden="true" />
        <p>Sélectionnez d'abord une année académique.</p>
      </div>
    )
  }

  return (
    <div className="cfg-tab">
      <div className="ap-page-head">
        <div>
          <h2 className="ap-page-title">Classes</h2>
          <p className="ap-page-sub">Année : <strong>{anneeActive.libelle}</strong> - niveau × groupe (× série pour le secondaire).</p>
        </div>
        <button type="button" className="ap-btn ap-btn--sm" onClick={ouvrirModale}>
          <Plus size={14} /> Nouvelle classe
        </button>
      </div>

      {/* Filtres cycles - masqués si on est déjà dans un cycle */}
      {!cycleFiltre && (
        <div className="ap-filters">
          {cycles.map((c) => (
            <button key={c} type="button" className={`ap-tab${filtreCycle === c ? ' is-active' : ''}`} onClick={() => setFiltreCycle(c)}>
              {c ? CYCLE_LABEL[c] : 'Tous'}
            </button>
          ))}
        </div>
      )}

      {charge ? (
        <div className="ap-card">
          {[0,1,2].map((i) => <div key={i} className="ap-skel-row"><div className="ap-skel ap-skel--tile" /><div className="ap-skel ap-skel--line" /><div className="ap-skel ap-skel--short" /></div>)}
        </div>
      ) : classes.length === 0 ? (
        <div className="ap-card ap-empty">
          <Layers size={36} aria-hidden="true" />
          <p>Aucune classe configurée pour ces filtres.</p>
          <button type="button" className="ap-btn ap-btn--sm" onClick={ouvrirModale}><Plus size={14} /> Créer</button>
        </div>
      ) : (
        <div className="ap-card ap-card--flush">
          <table className="ap-table">
            <thead>
              <tr><th>Sigle</th><th>Niveau</th><th>Groupe / Dép.</th><th>Série</th><th>Effectif</th><th>Statut</th></tr>
            </thead>
            <tbody>
              {classes.map((c) => (
                <tr key={c.uuid}>
                  <td><span className="ap-code">{c.sigle || '-'}</span></td>
                  <td>{c.niveau?.nom ?? '-'}</td>
                  <td>{c.subdivision?.nom ?? '-'}</td>
                  <td>{c.serie ? <span className="ap-badge ap-badge--info">{c.serie.code || c.serie.nom}</span> : <span style={{ color: 'var(--sg-text-muted)' }}>-</span>}</td>
                  <td>{c.effectif_previsionnel ?? <span style={{ color: 'var(--sg-text-muted)' }}>-</span>}</td>
                  <td><span className={`ap-badge ${c.actif ? 'ap-badge--success' : 'ap-badge--neutral'}`}>{c.actif ? 'Active' : 'Inactive'}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modale && (
        <div className="cfg-modale-fond" role="dialog" aria-modal="true" aria-labelledby="m-cls">
          <div className="cfg-modale">
            <div className="cfg-modale-tete">
              <h3 id="m-cls">Nouvelle classe</h3>
              <button type="button" className="ap-drawer-close" onClick={() => setModale(false)} aria-label="Fermer"><X size={16} /></button>
            </div>
            <form onSubmit={soumettre}>
              <div className="cfg-modale-corps">
                <p className="ap-hint" style={{ marginBottom: 14 }}>
                  Le sigle est généré automatiquement (ex. CM2 A, Tle D). Vous pouvez le personnaliser.
                </p>
                <div className={`ap-field${erreurs.niveau_uuid ? ' has-error' : ''}`}>
                  <label className="ap-label" htmlFor="cls-niv">Niveau <em>*</em></label>
                  <select id="cls-niv" className="ap-input" value={form.niveau_uuid}
                    onChange={(e) => setForm((f) => ({ ...f, niveau_uuid: e.target.value }))}>
                    <option value="">-- Sélectionner --</option>
                    {niveaux.map((n) => <option key={n.uuid} value={n.uuid}>{n.nom} ({CYCLE_LABEL[n.cycle]})</option>)}
                  </select>
                  {erreurs.niveau_uuid && <p className="ap-error">{erreurs.niveau_uuid}</p>}
                </div>
                <div className={`ap-field${erreurs.subdivision_uuid ? ' has-error' : ''}`}>
                  <label className="ap-label" htmlFor="cls-sub">Groupe / Département <em>*</em></label>
                  <select id="cls-sub" className="ap-input" value={form.subdivision_uuid}
                    onChange={(e) => setForm((f) => ({ ...f, subdivision_uuid: e.target.value }))}>
                    <option value="">-- Sélectionner --</option>
                    {subs.filter((s) => s.actif).map((s) => <option key={s.uuid} value={s.uuid}>{s.nom}</option>)}
                  </select>
                  {erreurs.subdivision_uuid && <p className="ap-error">{erreurs.subdivision_uuid}</p>}
                </div>
                <div className="ap-field">
                  <label className="ap-label" htmlFor="cls-ser">Série / Filière (optionnel)</label>
                  <select id="cls-ser" className="ap-input" value={form.serie_uuid}
                    onChange={(e) => setForm((f) => ({ ...f, serie_uuid: e.target.value }))}>
                    <option value="">-- Aucune --</option>
                    {series.filter((s) => s.actif).map((s) => <option key={s.uuid} value={s.uuid}>{s.code} - {s.nom}</option>)}
                  </select>
                </div>
                <div className="ap-field">
                  <label className="ap-label" htmlFor="cls-sig">Sigle personnalisé</label>
                  <input id="cls-sig" className="ap-input ap-input--mono" value={form.sigle}
                    onChange={(e) => setForm((f) => ({ ...f, sigle: e.target.value }))}
                    placeholder="Laissez vide pour génération auto" />
                </div>
                <div className="ap-field">
                  <label className="ap-label" htmlFor="cls-eff">Effectif prévisionnel</label>
                  <input id="cls-eff" type="number" min={1} className="ap-input" style={{ maxWidth: 120 }}
                    value={form.effectif_previsionnel}
                    onChange={(e) => setForm((f) => ({ ...f, effectif_previsionnel: e.target.value }))} />
                </div>
              </div>
              <div className="cfg-modale-pied">
                <button type="button" className="ap-btn ap-btn--ghost" onClick={() => setModale(false)}>Annuler</button>
                <button type="submit" className="ap-btn" disabled={enCours}>{enCours ? 'Création…' : 'Créer la classe'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

const CYCLE_LABEL = { maternelle: 'Maternelle', primaire: 'Primaire', secondaire: 'Secondaire', universitaire: 'Université' }
