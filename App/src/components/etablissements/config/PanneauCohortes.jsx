/**
 * PanneauCohortes - Cohortes universitaires (filière × niveau × lettre).
 * Ex. IT2A = filière IT, niveau L2, cohorte A.
 */
import { useEffect, useState } from 'react'
import { Plus, X, Users, AlertTriangle } from 'lucide-react'
import { useNotify } from '../../../context/commun/NotifyContext'
import {
  cohortesService,
  niveauxService,
  seriesService,
} from '../../../services/etablissements/configurationAcademique.service'

const DIPLOMES = [
  { id: 'licence',   label: 'Licence' },
  { id: 'master',    label: 'Master' },
  { id: 'doctorat',  label: 'Doctorat' },
  { id: 'ingenieur', label: "Diplôme d'ingénieur" },
  { id: 'bts',       label: 'BTS' },
  { id: 'dut',       label: 'DUT' },
  { id: 'autre',     label: 'Autre' },
]

export default function PanneauCohortes({ anneeActive, onTerminee }) {
  const notify = useNotify()
  const [items,    setItems]    = useState([])
  const [niveaux,  setNiveaux]  = useState([])
  const [filieres, setFilieres] = useState([])
  const [charge,   setCharge]   = useState(false)
  const [modale,   setModale]   = useState(false)
  const [enCours,  setEnCours]  = useState(false)
  const [form, setForm] = useState({ annee_uuid: '', filiere_uuid: '', niveau_uuid: '', diplome: 'licence', lettre: '', sigle: '', semestres: '' })
  const [erreurs,  setErreurs]  = useState({})

  const charger = async () => {
    if (!anneeActive) return
    setCharge(true)
    try {
      const [rCoh, rNiv, rFil] = await Promise.all([
        cohortesService.lister(anneeActive.uuid),
        niveauxService.lister('universitaire'),
        seriesService.lister('universitaire'),
      ])
      const liste = rCoh?.data ?? rCoh ?? []
      setItems(liste)
      setNiveaux(rNiv?.data ?? rNiv ?? [])
      setFilieres(rFil?.data ?? rFil ?? [])
      if (liste.length > 0) onTerminee('cohortes')
    } catch (err) {
      notify.fromError(err)
    } finally {
      setCharge(false)
    }
  }

  useEffect(() => { charger() }, [anneeActive?.uuid]) // eslint-disable-line

  if (!anneeActive) {
    return (
      <div className="ap-card ap-empty">
        <AlertTriangle size={32} aria-hidden="true" />
        <p>Sélectionnez d'abord une année académique.</p>
      </div>
    )
  }

  const ouvrirModale = () => {
    setForm({ annee_uuid: anneeActive.uuid, filiere_uuid: '', niveau_uuid: '', diplome: 'licence', lettre: 'A', sigle: '', semestres: '' })
    setErreurs({})
    setModale(true)
  }

  const valider = () => {
    const e = {}
    if (!form.filiere_uuid) e.filiere_uuid = 'Sélectionnez une filière.'
    if (!form.niveau_uuid)  e.niveau_uuid  = 'Sélectionnez un niveau.'
    setErreurs(e)
    return Object.keys(e).length === 0
  }

  const soumettre = async (ev) => {
    ev.preventDefault()
    if (!valider()) return
    setEnCours(true)
    try {
      await cohortesService.creer({
        annee_uuid:   form.annee_uuid,
        filiere_uuid: form.filiere_uuid,
        niveau_uuid:  form.niveau_uuid,
        diplome:      form.diplome,
        lettre:       form.lettre.trim() || undefined,
        sigle:        form.sigle.trim() || undefined,
        semestres:    form.semestres.trim() || undefined,
      })
      notify.success('Cohorte créée')
      setModale(false)
      await charger()
    } catch (err) {
      notify.fromError(err)
    } finally {
      setEnCours(false)
    }
  }

  return (
    <div className="cfg-tab">
      <div className="ap-page-head">
        <div>
          <h2 className="ap-page-title">Cohortes universitaires</h2>
          <p className="ap-page-sub">
            Année : <strong>{anneeActive.libelle}</strong> - filière × niveau × lettre (ex. IT2A, GEI-L1-B).
          </p>
        </div>
        <button type="button" className="ap-btn ap-btn--sm" onClick={ouvrirModale}>
          <Plus size={14} /> Nouvelle cohorte
        </button>
      </div>

      {charge ? (
        <div className="ap-card">
          {[0, 1].map((i) => <div key={i} className="ap-skel-row"><div className="ap-skel ap-skel--tile" /><div className="ap-skel ap-skel--line" /></div>)}
        </div>
      ) : items.length === 0 ? (
        <div className="ap-card ap-empty">
          <Users size={36} aria-hidden="true" />
          <p>Aucune cohorte pour cette année. Créez-en une.</p>
          <button type="button" className="ap-btn ap-btn--sm" onClick={ouvrirModale}><Plus size={14} /> Créer</button>
        </div>
      ) : (
        <div className="ap-card ap-card--flush">
          <table className="ap-table">
            <thead>
              <tr><th>Sigle</th><th>Filière</th><th>Niveau</th><th>Diplôme</th><th>Lettre</th><th>Semestres</th></tr>
            </thead>
            <tbody>
              {items.map((c) => (
                <tr key={c.uuid}>
                  <td><span className="ap-code">{c.sigle || '-'}</span></td>
                  <td>{c.filiere?.nom ?? '-'}</td>
                  <td>{c.niveau?.nom ?? '-'}</td>
                  <td><span className="ap-badge ap-badge--neutral">{DIPLOMES.find((d) => d.id === c.diplome)?.label ?? c.diplome}</span></td>
                  <td>{c.lettre || '-'}</td>
                  <td>{c.semestres || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modale && (
        <div className="cfg-modale-fond" role="dialog" aria-modal="true" aria-labelledby="m-coh">
          <div className="cfg-modale">
            <div className="cfg-modale-tete">
              <h3 id="m-coh">Nouvelle cohorte</h3>
              <button type="button" className="ap-drawer-close" onClick={() => setModale(false)} aria-label="Fermer"><X size={16} /></button>
            </div>
            <form onSubmit={soumettre}>
              <div className="cfg-modale-corps">
                <div className={`ap-field${erreurs.filiere_uuid ? ' has-error' : ''}`}>
                  <label className="ap-label" htmlFor="coh-fil">Filière <em>*</em></label>
                  <select id="coh-fil" className="ap-input" value={form.filiere_uuid}
                    onChange={(e) => setForm((f) => ({ ...f, filiere_uuid: e.target.value }))}>
                    <option value="">-- Sélectionner --</option>
                    {filieres.map((f) => <option key={f.uuid} value={f.uuid}>{f.code} - {f.nom}</option>)}
                  </select>
                  {erreurs.filiere_uuid && <p className="ap-error">{erreurs.filiere_uuid}</p>}
                </div>
                <div className={`ap-field${erreurs.niveau_uuid ? ' has-error' : ''}`}>
                  <label className="ap-label" htmlFor="coh-niv">Niveau d'études <em>*</em></label>
                  <select id="coh-niv" className="ap-input" value={form.niveau_uuid}
                    onChange={(e) => setForm((f) => ({ ...f, niveau_uuid: e.target.value }))}>
                    <option value="">-- Sélectionner --</option>
                    {niveaux.map((n) => <option key={n.uuid} value={n.uuid}>{n.nom}</option>)}
                  </select>
                  {erreurs.niveau_uuid && <p className="ap-error">{erreurs.niveau_uuid}</p>}
                </div>
                <div className="ap-field">
                  <label className="ap-label" htmlFor="coh-dip">Diplôme préparé</label>
                  <select id="coh-dip" className="ap-input" value={form.diplome}
                    onChange={(e) => setForm((f) => ({ ...f, diplome: e.target.value }))}>
                    {DIPLOMES.map((d) => <option key={d.id} value={d.id}>{d.label}</option>)}
                  </select>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div className="ap-field">
                    <label className="ap-label" htmlFor="coh-let">Lettre de cohorte</label>
                    <input id="coh-let" className="ap-input ap-input--mono" value={form.lettre}
                      onChange={(e) => setForm((f) => ({ ...f, lettre: e.target.value.toUpperCase() }))}
                      placeholder="A, B, Promo2026…" maxLength={5} />
                  </div>
                  <div className="ap-field">
                    <label className="ap-label" htmlFor="coh-sem">Semestres</label>
                    <input id="coh-sem" className="ap-input" value={form.semestres}
                      onChange={(e) => setForm((f) => ({ ...f, semestres: e.target.value }))}
                      placeholder="1,2" />
                  </div>
                </div>
                <div className="ap-field">
                  <label className="ap-label" htmlFor="coh-sig">Sigle (optionnel)</label>
                  <input id="coh-sig" className="ap-input ap-input--mono" value={form.sigle}
                    onChange={(e) => setForm((f) => ({ ...f, sigle: e.target.value.toUpperCase() }))}
                    placeholder="Laissez vide pour génération auto (ex. IT2A)" />
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
