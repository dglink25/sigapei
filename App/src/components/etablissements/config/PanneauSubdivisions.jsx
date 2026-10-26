/**
 * PanneauSubdivisions - Groupes (primaire/maternelle), sections (secondaire),
 * départements (université) pour une année et un cycle donnés.
 */
import { useEffect, useState } from 'react'
import { Plus, X, AlertTriangle, RefreshCw } from 'lucide-react'
import { useNotify } from '../../../context/commun/NotifyContext'
import {
  cyclesService,
  subdivisionsService,
} from '../../../services/etablissements/configurationAcademique.service'

const TYPES = [
  { id: 'groupe',      label: 'Groupe',      ex: 'Groupe A, Groupe B…' },
  { id: 'section',     label: 'Section',     ex: 'Section Sciences, Section Lettres…' },
  { id: 'departement', label: 'Département', ex: 'GEI, Génie Civil…' },
]

const TYPE_DEFAUT = { maternelle: 'groupe', primaire: 'groupe', secondaire: 'groupe', universitaire: 'departement' }

export default function PanneauSubdivisions({ anneeActive, onTerminee, cycleFiltre, cycleObj, labelTitre, labelType }) {
  const notify = useNotify()
  const [cycles,     setCycles]     = useState([])
  const [cycleId,    setCycleId]    = useState('')
  const [items,      setItems]      = useState([])
  const [charge,     setCharge]     = useState(false)
  const [modale,     setModale]     = useState(false)
  const [enCours,    setEnCours]    = useState(false)
  const [form, setForm] = useState({ nom: '', code: '', type: 'groupe', description: '' })
  const [erreurs,    setErreurs]    = useState({})

  // Charger les cycles actifs de l'année - si cycleFiltre est fourni, filtrer directement
  useEffect(() => {
    if (!anneeActive) return
    cyclesService.lister(anneeActive.uuid).then((r) => {
      let liste = (r?.data ?? r ?? []).filter((c) => c.actif)
      if (cycleFiltre) liste = liste.filter((c) => c.cycle === cycleFiltre)
      setCycles(liste)
      if (liste.length > 0) setCycleId(liste[0].uuid)
    }).catch(notify.fromError)
  }, [anneeActive?.uuid]) // eslint-disable-line

  // Charger les subdivisions quand le cycle change
  useEffect(() => {
    if (!cycleId) return
    setCharge(true)
    subdivisionsService.lister({ cycle_uuid: cycleId, annee_uuid: anneeActive?.uuid })
      .then((r) => {
        const liste = r?.data ?? r ?? []
        setItems(liste)
        if (liste.length > 0) onTerminee('subdivisions')
      })
      .catch(notify.fromError)
      .finally(() => setCharge(false))
  }, [cycleId]) // eslint-disable-line

  const cycleSelectionne = cycles.find((c) => c.uuid === cycleId)

  // Type par défaut selon le contexte
  const ouvrirModale = () => {
    const typeDefaut = labelType ?? TYPE_DEFAUT[cycleSelectionne?.cycle] ?? 'groupe'
    setForm({ nom: '', code: '', type: typeDefaut, description: '' })
    setErreurs({})
    setModale(true)
  }

  const valider = () => {
    const e = {}
    if (!form.nom.trim()) e.nom = 'Le nom est requis.'
    setErreurs(e)
    return Object.keys(e).length === 0
  }

  const soumettre = async (ev) => {
    ev.preventDefault()
    if (!valider()) return
    setEnCours(true)
    try {
      await subdivisionsService.creer({
        annee_uuid:        anneeActive.uuid,
        cycle_config_uuid: cycleId,
        type:              form.type,
        nom:               form.nom.trim(),
        code:              form.code.trim() || undefined,
        description:       form.description.trim() || undefined,
      })
      notify.success('Subdivision créée', form.nom)
      setModale(false)
      // Recharger
      const r = await subdivisionsService.lister({ cycle_uuid: cycleId, annee_uuid: anneeActive?.uuid })
      const liste = r?.data ?? r ?? []
      setItems(liste)
      onTerminee('subdivisions')
    } catch (err) {
      notify.fromError(err)
    } finally {
      setEnCours(false)
    }
  }

  const basculerActif = async (item) => {
    try {
      await subdivisionsService.modifier(item.uuid, { actif: !item.actif })
      setItems((prev) => prev.map((i) => i.uuid === item.uuid ? { ...i, actif: !i.actif } : i))
    } catch (err) {
      notify.fromError(err)
    }
  }

  if (!anneeActive) return <AlerteAnnee />

  return (
    <div className="cfg-tab">
      <div className="ap-page-head">
        <div>
          <h2 className="ap-page-title">{labelTitre ?? 'Groupes & départements'}</h2>
          <p className="ap-page-sub">Année : <strong>{anneeActive.libelle}</strong></p>
        </div>
        <div className="ap-page-actions">
          {cycleId && (
            <button type="button" className="ap-btn ap-btn--sm" onClick={ouvrirModale}>
              <Plus size={14} /> Ajouter
            </button>
          )}
        </div>
      </div>

      {/* Sélecteur de cycle */}
      {cycles.length > 0 && (
        <div className="ap-filters">
          {cycles.map((c) => (
            <button
              key={c.uuid}
              type="button"
              className={`ap-tab${cycleId === c.uuid ? ' is-active' : ''}`}
              onClick={() => setCycleId(c.uuid)}
            >
              {CYCLE_LABEL[c.cycle] ?? c.cycle}
            </button>
          ))}
        </div>
      )}

      {cycles.length === 0 && (
        <div className="ap-card ap-empty">
          <AlertTriangle size={32} aria-hidden="true" />
          <p>Aucun cycle actif pour cette année. Activez d'abord des cycles.</p>
        </div>
      )}

      {cycles.length > 0 && (
        charge ? (
          <div className="ap-card">
            {[0, 1].map((i) => <div key={i} className="ap-skel-row"><div className="ap-skel ap-skel--tile" /><div className="ap-skel ap-skel--line" /></div>)}
          </div>
        ) : items.length === 0 ? (
          <div className="ap-card ap-empty">
            <Plus size={32} aria-hidden="true" />
            <p>Aucune subdivision pour ce cycle. Créez un groupe ou un département.</p>
            <button type="button" className="ap-btn ap-btn--sm" onClick={ouvrirModale}><Plus size={14} /> Créer</button>
          </div>
        ) : (
          <div className="ap-card ap-card--flush">
            <table className="ap-table">
              <thead>
                <tr><th>Nom</th><th>Code</th><th>Type</th><th>Statut</th><th></th></tr>
              </thead>
              <tbody>
                {items.map((it) => (
                  <tr key={it.uuid}>
                    <td><strong>{it.nom}</strong>{it.description && <small>{it.description}</small>}</td>
                    <td>{it.code || <span style={{ color: 'var(--sg-text-muted)' }}>-</span>}</td>
                    <td><span className="ap-badge ap-badge--neutral">{TYPE_LABEL[it.type] ?? it.type}</span></td>
                    <td>
                      <span className={`ap-badge ${it.actif ? 'ap-badge--success' : 'ap-badge--neutral'}`}>
                        {it.actif ? 'Actif' : 'Inactif'}
                      </span>
                    </td>
                    <td>
                      <button type="button" className="ap-btn ap-btn--ghost ap-btn--sm" onClick={() => basculerActif(it)}>
                        {it.actif ? 'Désactiver' : 'Activer'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {modale && (
        <div className="cfg-modale-fond" role="dialog" aria-modal="true" aria-labelledby="m-sub">
          <div className="cfg-modale">
            <div className="cfg-modale-tete">
              <h3 id="m-sub">Nouvelle subdivision</h3>
              <button type="button" className="ap-drawer-close" onClick={() => setModale(false)} aria-label="Fermer"><X size={16} /></button>
            </div>
            <form onSubmit={soumettre}>
              <div className="cfg-modale-corps">
                <div className="ap-field">
                  <label className="ap-label">Type</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {TYPES.map((t) => (
                      <label key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: '0.88rem', fontWeight: form.type === t.id ? 700 : 400 }}>
                        <input type="radio" name="type" value={t.id} checked={form.type === t.id} onChange={() => setForm((f) => ({ ...f, type: t.id }))} />
                        {t.label}
                      </label>
                    ))}
                  </div>
                  <p className="ap-hint">{TYPES.find((t) => t.id === form.type)?.ex}</p>
                </div>
                <div className={`ap-field${erreurs.nom ? ' has-error' : ''}`}>
                  <label className="ap-label" htmlFor="sub-nom">Nom <em>*</em></label>
                  <input id="sub-nom" className="ap-input" value={form.nom} onChange={(e) => setForm((f) => ({ ...f, nom: e.target.value }))} placeholder="Ex. Groupe A, GEI…" />
                  {erreurs.nom && <p className="ap-error">{erreurs.nom}</p>}
                </div>
                <div className="ap-field">
                  <label className="ap-label" htmlFor="sub-code">Code / Sigle</label>
                  <input id="sub-code" className="ap-input" value={form.code} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))} placeholder="Ex. A, GEI…" />
                  <p className="ap-hint">Court identifiant utilisé dans les sigles de classes.</p>
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

const CYCLE_LABEL  = { maternelle: 'Maternelle', primaire: 'Primaire', secondaire: 'Secondaire', universitaire: 'Université' }
const TYPE_LABEL   = { groupe: 'Groupe', section: 'Section', departement: 'Département' }

function AlerteAnnee() {
  return (
    <div className="ap-card ap-empty">
      <AlertTriangle size={32} aria-hidden="true" />
      <p>Sélectionnez d'abord une année académique.</p>
    </div>
  )
}
