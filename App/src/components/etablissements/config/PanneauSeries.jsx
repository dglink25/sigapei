/**
 * PanneauSeries - Séries (secondaire) et filières (université).
 */
import { useEffect, useState } from 'react'
import { Plus, X, GitBranch } from 'lucide-react'
import { useNotify } from '../../../context/commun/NotifyContext'
import { seriesService } from '../../../services/etablissements/configurationAcademique.service'

const CYCLES_SERIES = [
  { id: 'secondaire',    label: 'Secondaire',  ex: 'A, C, D, F3, G2, TI…' },
  { id: 'universitaire', label: 'Université',  ex: 'Informatique et télécommunications (IT), EE…' },
]

export default function PanneauSeries({ onTerminee }) {
  const notify = useNotify()
  const [filtre,  setFiltre]  = useState('secondaire')
  const [items,   setItems]   = useState([])
  const [charge,  setCharge]  = useState(true)
  const [modale,  setModale]  = useState(false)
  const [enCours, setEnCours] = useState(false)
  const [form,    setForm]    = useState({ cycle: 'secondaire', nom: '', code: '', description: '' })
  const [erreurs, setErreurs] = useState({})

  const charger = async (cycle = filtre) => {
    setCharge(true)
    try {
      const r = await seriesService.lister(cycle)
      const liste = r?.data ?? r ?? []
      setItems(liste)
      if (liste.length > 0) onTerminee('series')
    } catch (err) {
      notify.fromError(err)
    } finally {
      setCharge(false)
    }
  }

  useEffect(() => { charger() }, []) // eslint-disable-line

  const changerFiltre = (val) => { setFiltre(val); charger(val) }

  const ouvrirModale = () => {
    setForm({ cycle: filtre, nom: '', code: '', description: '' })
    setErreurs({})
    setModale(true)
  }

  const valider = () => {
    const e = {}
    if (!form.nom.trim()) e.nom = 'Le nom est requis.'
    if (!form.code.trim()) e.code = 'Le code est requis (ex. D, IT).'
    setErreurs(e)
    return Object.keys(e).length === 0
  }

  const soumettre = async (ev) => {
    ev.preventDefault()
    if (!valider()) return
    setEnCours(true)
    try {
      await seriesService.creer({
        cycle:       form.cycle,
        nom:         form.nom.trim(),
        code:        form.code.trim(),
        description: form.description.trim() || undefined,
      })
      notify.success(form.cycle === 'secondaire' ? 'Série créée' : 'Filière créée', form.nom)
      setModale(false)
      await charger()
    } catch (err) {
      notify.fromError(err)
    } finally {
      setEnCours(false)
    }
  }

  const basculer = async (item) => {
    try {
      await seriesService.modifier(item.uuid, { actif: !item.actif })
      setItems((prev) => prev.map((i) => i.uuid === item.uuid ? { ...i, actif: !i.actif } : i))
    } catch (err) {
      notify.fromError(err)
    }
  }

  const titreCycle = filtre === 'secondaire' ? 'Séries' : 'Filières'

  return (
    <div className="cfg-tab">
      <div className="ap-page-head">
        <div>
          <h2 className="ap-page-title">Séries & filières</h2>
          <p className="ap-page-sub">
            Séries pour le secondaire (A, C, D, F3…), filières pour l'université (IT, GEI…).
          </p>
        </div>
        <button type="button" className="ap-btn ap-btn--sm" onClick={ouvrirModale}>
          <Plus size={14} /> Nouvelle {filtre === 'secondaire' ? 'série' : 'filière'}
        </button>
      </div>

      <div className="ap-filters">
        {CYCLES_SERIES.map((c) => (
          <button
            key={c.id}
            type="button"
            className={`ap-tab${filtre === c.id ? ' is-active' : ''}`}
            onClick={() => changerFiltre(c.id)}
          >
            {c.label}
          </button>
        ))}
      </div>

      {charge ? (
        <div className="ap-card">
          {[0, 1].map((i) => <div key={i} className="ap-skel-row"><div className="ap-skel ap-skel--tile" /><div className="ap-skel ap-skel--line" /></div>)}
        </div>
      ) : items.length === 0 ? (
        <div className="ap-card ap-empty">
          <GitBranch size={36} aria-hidden="true" />
          <p>Aucune {titreCycle.toLowerCase()} configurée.</p>
          <button type="button" className="ap-btn ap-btn--sm" onClick={ouvrirModale}><Plus size={14} /> Créer</button>
        </div>
      ) : (
        <div className="ap-card ap-card--flush">
          <table className="ap-table">
            <thead>
              <tr><th>Code</th><th>Nom</th><th>Description</th><th>Statut</th><th></th></tr>
            </thead>
            <tbody>
              {items.map((it) => (
                <tr key={it.uuid}>
                  <td><span className="ap-code">{it.code}</span></td>
                  <td><strong>{it.nom}</strong></td>
                  <td><small>{it.description || '-'}</small></td>
                  <td><span className={`ap-badge ${it.actif ? 'ap-badge--success' : 'ap-badge--neutral'}`}>{it.actif ? 'Active' : 'Inactive'}</span></td>
                  <td>
                    <button type="button" className="ap-btn ap-btn--ghost ap-btn--sm" onClick={() => basculer(it)}>
                      {it.actif ? 'Désactiver' : 'Activer'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modale && (
        <div className="cfg-modale-fond" role="dialog" aria-modal="true" aria-labelledby="m-serie">
          <div className="cfg-modale">
            <div className="cfg-modale-tete">
              <h3 id="m-serie">Nouvelle {form.cycle === 'secondaire' ? 'série' : 'filière'}</h3>
              <button type="button" className="ap-drawer-close" onClick={() => setModale(false)} aria-label="Fermer"><X size={16} /></button>
            </div>
            <form onSubmit={soumettre}>
              <div className="cfg-modale-corps">
                <p className="ap-hint" style={{ marginBottom: 14 }}>
                  {CYCLES_SERIES.find((c) => c.id === form.cycle)?.ex}
                </p>
                <div className={`ap-field${erreurs.code ? ' has-error' : ''}`}>
                  <label className="ap-label" htmlFor="ser-code">Code <em>*</em></label>
                  <input id="ser-code" className="ap-input ap-input--mono" value={form.code}
                    onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
                    placeholder={form.cycle === 'secondaire' ? 'D, G2, F3…' : 'IT, EE, GC…'} />
                  {erreurs.code && <p className="ap-error">{erreurs.code}</p>}
                </div>
                <div className={`ap-field${erreurs.nom ? ' has-error' : ''}`}>
                  <label className="ap-label" htmlFor="ser-nom">Nom complet <em>*</em></label>
                  <input id="ser-nom" className="ap-input" value={form.nom}
                    onChange={(e) => setForm((f) => ({ ...f, nom: e.target.value }))}
                    placeholder={form.cycle === 'secondaire' ? 'Sciences expérimentales' : 'Informatique et télécommunications'} />
                  {erreurs.nom && <p className="ap-error">{erreurs.nom}</p>}
                </div>
                <div className="ap-field">
                  <label className="ap-label" htmlFor="ser-desc">Description</label>
                  <textarea id="ser-desc" className="ap-textarea" rows={2} value={form.description}
                    onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
                </div>
              </div>
              <div className="cfg-modale-pied">
                <button type="button" className="ap-btn ap-btn--ghost" onClick={() => setModale(false)}>Annuler</button>
                <button type="submit" className="ap-btn" disabled={enCours}>{enCours ? 'Création…' : 'Créer'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
