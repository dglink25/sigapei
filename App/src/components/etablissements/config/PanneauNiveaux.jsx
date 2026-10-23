/**
 * PanneauNiveaux - Référentiel des niveaux scolaires par cycle.
 * Partagé entre groupes (ex. CM2 existe une fois, utilisé par CM2 A et CM2 B).
 */
import { useEffect, useState } from 'react'
import { Plus, X, Layers } from 'lucide-react'
import { useNotify } from '../../../context/commun/NotifyContext'
import { niveauxService } from '../../../services/etablissements/configurationAcademique.service'

const CYCLES = [
  { id: '',             label: 'Tous' },
  { id: 'maternelle',   label: 'Maternelle' },
  { id: 'primaire',     label: 'Primaire' },
  { id: 'secondaire',   label: 'Secondaire' },
  { id: 'universitaire',label: 'Université' },
]

const NIVEAUX_SUGGESTION = {
  maternelle:    ['Petite section (PS)', 'Moyenne section (MS)', 'Grande section (GS)'],
  primaire:      ['Cours d\'initiation (CI)', 'Cours préparatoire (CP)', 'CE1', 'CE2', 'CM1', 'CM2'],
  secondaire:    ['Sixième', 'Cinquième', 'Quatrième', 'Troisième', 'Seconde', 'Première', 'Terminale'],
  universitaire: ['Licence 1 (L1)', 'Licence 2 (L2)', 'Licence 3 (L3)', 'Master 1 (M1)', 'Master 2 (M2)', 'Doctorat'],
}

export default function PanneauNiveaux({ onTerminee }) {
  const notify = useNotify()
  const [filtre,  setFiltre]  = useState('')
  const [items,   setItems]   = useState([])
  const [charge,  setCharge]  = useState(true)
  const [modale,  setModale]  = useState(false)
  const [enCours, setEnCours] = useState(false)
  const [form,    setForm]    = useState({ cycle: 'primaire', nom: '', abreviation: '', ordre: '' })
  const [erreurs, setErreurs] = useState({})

  const charger = async (cycle = filtre) => {
    setCharge(true)
    try {
      const r = await niveauxService.lister(cycle || undefined)
      const liste = r?.data ?? r ?? []
      setItems(liste)
      if (liste.length > 0) onTerminee('niveaux')
    } catch (err) {
      notify.fromError(err)
    } finally {
      setCharge(false)
    }
  }

  useEffect(() => { charger() }, []) // eslint-disable-line

  const changerFiltre = (val) => { setFiltre(val); charger(val) }

  const ouvrirModale = () => {
    setForm({ cycle: filtre || 'primaire', nom: '', abreviation: '', ordre: '' })
    setErreurs({})
    setModale(true)
  }

  const valider = () => {
    const e = {}
    if (!form.cycle) e.cycle = 'Sélectionnez un cycle.'
    if (!form.nom.trim()) e.nom = 'Le nom est requis.'
    setErreurs(e)
    return Object.keys(e).length === 0
  }

  const soumettre = async (ev) => {
    ev.preventDefault()
    if (!valider()) return
    setEnCours(true)
    try {
      await niveauxService.creer({
        cycle:       form.cycle,
        nom:         form.nom.trim(),
        abreviation: form.abreviation.trim() || undefined,
        ordre:       form.ordre !== '' ? Number(form.ordre) : undefined,
      })
      notify.success('Niveau créé', form.nom)
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
      await niveauxService.modifier(item.uuid, { actif: !item.actif })
      setItems((prev) => prev.map((i) => i.uuid === item.uuid ? { ...i, actif: !i.actif } : i))
    } catch (err) {
      notify.fromError(err)
    }
  }

  const suggestions = NIVEAUX_SUGGESTION[form.cycle] ?? []

  return (
    <div className="cfg-tab">
      <div className="ap-page-head">
        <div>
          <h2 className="ap-page-title">Classes & niveaux</h2>
          <p className="ap-page-sub">
            Référentiel des niveaux de votre établissement, partagé entre tous les groupes.
          </p>
        </div>
        <button type="button" className="ap-btn ap-btn--sm" onClick={ouvrirModale}>
          <Plus size={14} /> Nouveau niveau
        </button>
      </div>

      <div className="ap-filters">
        {CYCLES.map((c) => (
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
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="ap-skel-row">
              <div className="ap-skel ap-skel--tile" style={{ '--i': i }} />
              <div className="ap-skel ap-skel--line" style={{ '--i': i }} />
              <div className="ap-skel ap-skel--short" style={{ '--i': i }} />
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="ap-card ap-empty">
          <Layers size={36} aria-hidden="true" />
          <p>Aucun niveau pour ce filtre.</p>
          <button type="button" className="ap-btn ap-btn--sm" onClick={ouvrirModale}><Plus size={14} /> Créer</button>
        </div>
      ) : (
        <div className="ap-card ap-card--flush">
          <table className="ap-table">
            <thead>
              <tr><th>Ordre</th><th>Nom</th><th>Abréviation</th><th>Cycle</th><th>Statut</th><th></th></tr>
            </thead>
            <tbody>
              {items.map((it) => (
                <tr key={it.uuid}>
                  <td style={{ width: 60, color: 'var(--sg-text-muted)' }}>{it.ordre}</td>
                  <td><strong>{it.nom}</strong></td>
                  <td>{it.abreviation || <span style={{ color: 'var(--sg-text-muted)' }}>-</span>}</td>
                  <td><span className="ap-badge ap-badge--neutral">{CYCLE_LABEL[it.cycle] ?? it.cycle}</span></td>
                  <td><span className={`ap-badge ${it.actif ? 'ap-badge--success' : 'ap-badge--neutral'}`}>{it.actif ? 'Actif' : 'Inactif'}</span></td>
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
        <div className="cfg-modale-fond" role="dialog" aria-modal="true" aria-labelledby="m-niv">
          <div className="cfg-modale">
            <div className="cfg-modale-tete">
              <h3 id="m-niv">Nouveau niveau scolaire</h3>
              <button type="button" className="ap-drawer-close" onClick={() => setModale(false)} aria-label="Fermer"><X size={16} /></button>
            </div>
            <form onSubmit={soumettre}>
              <div className="cfg-modale-corps">
                <div className={`ap-field${erreurs.cycle ? ' has-error' : ''}`}>
                  <label className="ap-label" htmlFor="niv-cycle">Cycle <em>*</em></label>
                  <select id="niv-cycle" className="ap-input" value={form.cycle} onChange={(e) => setForm((f) => ({ ...f, cycle: e.target.value }))}>
                    {CYCLES.filter((c) => c.id).map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
                  </select>
                  {erreurs.cycle && <p className="ap-error">{erreurs.cycle}</p>}
                </div>

                {suggestions.length > 0 && (
                  <div style={{ marginBottom: 12 }}>
                    <p className="ap-hint" style={{ marginBottom: 6 }}>Suggestions :</p>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {suggestions.map((s) => (
                        <button
                          key={s}
                          type="button"
                          style={{ border: '1px solid var(--sg-border)', borderRadius: 999, padding: '3px 10px', fontSize: '0.78rem', cursor: 'pointer', background: 'var(--sg-surface)', fontFamily: 'inherit', color: 'var(--sg-text)' }}
                          onClick={() => {
                            // Ex. "Cours d'initiation (CI)" → nom = "Cours d'initiation", abr = "CI"
                            const match = s.match(/^(.+?)\s+\(([^)]+)\)$/)
                            if (match) setForm((f) => ({ ...f, nom: match[1], abreviation: match[2] }))
                            else setForm((f) => ({ ...f, nom: s }))
                          }}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className={`ap-field${erreurs.nom ? ' has-error' : ''}`}>
                  <label className="ap-label" htmlFor="niv-nom">Nom complet <em>*</em></label>
                  <input id="niv-nom" className="ap-input" value={form.nom} onChange={(e) => setForm((f) => ({ ...f, nom: e.target.value }))} placeholder="Ex. Cours d'initiation, Sixième, Licence 1…" />
                  {erreurs.nom && <p className="ap-error">{erreurs.nom}</p>}
                </div>
                <div className="ap-field">
                  <label className="ap-label" htmlFor="niv-abr">Abréviation</label>
                  <input id="niv-abr" className="ap-input" value={form.abreviation} onChange={(e) => setForm((f) => ({ ...f, abreviation: e.target.value }))} placeholder="Ex. CI, 6e, L1…" />
                  <p className="ap-hint">Utilisée dans les sigles de classes (CM2 A, Tle D…).</p>
                </div>
                <div className="ap-field">
                  <label className="ap-label" htmlFor="niv-ordre">Ordre d'affichage</label>
                  <input id="niv-ordre" type="number" min={0} className="ap-input" value={form.ordre} onChange={(e) => setForm((f) => ({ ...f, ordre: e.target.value }))} placeholder="0" style={{ maxWidth: 100 }} />
                </div>
              </div>
              <div className="cfg-modale-pied">
                <button type="button" className="ap-btn ap-btn--ghost" onClick={() => setModale(false)}>Annuler</button>
                <button type="submit" className="ap-btn" disabled={enCours}>{enCours ? 'Création…' : 'Créer le niveau'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

const CYCLE_LABEL = { maternelle: 'Maternelle', primaire: 'Primaire', secondaire: 'Secondaire', universitaire: 'Université' }
